import JSZip from "jszip";
import PptxGenJS from "pptxgenjs";
import type { PresentationSlide, ResearchPresentation } from "./types";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slidePayload(slide: PresentationSlide): string[] {
  const lines = [slide.title, ...slide.bullets].map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines : [slide.title || "Slide"];
}

/**
 * Replace text runs in a slide XML while preserving theme, layout, images, and styling.
 * Distributes title + bullets across existing <a:t> nodes (or the first N shapes).
 */
function fillSlideXml(xml: string, slide: PresentationSlide): string {
  const lines = slidePayload(slide);
  const matches = [...xml.matchAll(/<a:t([^>]*)>([^<]*)<\/a:t>/g)];
  if (!matches.length) return xml;

  let out = xml;
  // Work from the end so index offsets stay valid if we rebuild via sequential replace of unique markers
  // Safer: rebuild by walking matches in order with a cursor
  let cursor = 0;
  let rebuilt = "";
  let lineIdx = 0;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index ?? 0;
    const full = m[0];
    const attrs = m[1] || "";
    rebuilt += out.slice(cursor, start);

    let nextText = "";
    if (i === 0) {
      nextText = lines[0] || "";
      lineIdx = 1;
    } else if (lineIdx < lines.length) {
      nextText = lines[lineIdx++];
    } else if (i === matches.length - 1 && lineIdx < lines.length) {
      // last leftover joined — shouldn't happen often
      nextText = lines.slice(lineIdx).join(" ");
      lineIdx = lines.length;
    } else {
      // Clear leftover placeholder junk in unused runs
      nextText = "";
    }

    rebuilt += `<a:t${attrs}>${escapeXml(nextText)}</a:t>`;
    cursor = start + full.length;
  }
  rebuilt += out.slice(cursor);

  // If we still have unused bullet lines and only one text run, append into that run
  if (matches.length === 1 && lines.length > 1) {
    const combined = escapeXml(lines.join("\n"));
    rebuilt = rebuilt.replace(/<a:t([^>]*)>([^<]*)<\/a:t>/, `<a:t$1>${combined}</a:t>`);
  }

  return rebuilt;
}

function listSlidePaths(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });
}

async function cloneTemplatePptx(
  templateBase64: string,
  presentation: ResearchPresentation
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(Buffer.from(templateBase64, "base64"));
  let slidePaths = listSlidePaths(zip);
  if (!slidePaths.length) {
    throw new Error("Uploaded PPTX template has no slides to duplicate.");
  }

  // If we need more slides than the template, duplicate the last content slide file
  const presentationXmlPath = "ppt/presentation.xml";
  const contentTypesPath = "[Content_Types].xml";
  let presentationXml = (await zip.file(presentationXmlPath)?.async("string")) || "";
  let contentTypes = (await zip.file(contentTypesPath)?.async("string")) || "";

  while (slidePaths.length < presentation.slides.length) {
    const srcPath = slidePaths[slidePaths.length - 1];
    const srcXml = await zip.file(srcPath)!.async("string");
    const nextNum = slidePaths.length + 1;
    const destPath = `ppt/slides/slide${nextNum}.xml`;
    zip.file(destPath, srcXml);
    slidePaths = listSlidePaths(zip);

    // Content_Types override
    if (contentTypes && !contentTypes.includes(`slide${nextNum}.xml`)) {
      contentTypes = contentTypes.replace(
        "</Types>",
        `<Override PartName="/ppt/slides/slide${nextNum}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`
      );
    }

    // presentation.xml relationship — also need ppt/_rels/presentation.xml.rels
    const relsPath = "ppt/_rels/presentation.xml.rels";
    const rels = (await zip.file(relsPath)?.async("string")) || "";
    if (rels && !rels.includes(`slide${nextNum}.xml`)) {
      const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
      const nextId = (ids.length ? Math.max(...ids) : 1) + 1;
      const relLine = `<Relationship Id="rId${nextId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${nextNum}.xml"/>`;
      const updatedRels = rels.replace("</Relationships>", `${relLine}</Relationships>`);
      zip.file(relsPath, updatedRels);

      if (presentationXml.includes("<p:sldIdLst>") && !presentationXml.includes(`slide${nextNum}`)) {
        // sldId uses rId references
        const sldIds = [...presentationXml.matchAll(/id="(\d+)"/g)].map((m) => Number(m[1]));
        const nextSldId = (sldIds.length ? Math.max(...sldIds) : 255) + 1;
        presentationXml = presentationXml.replace(
          "</p:sldIdLst>",
          `<p:sldId id="${nextSldId}" r:id="rId${nextId}"/></p:sldIdLst>`
        );
      }
    }
  }

  // If template has extra slides beyond our content, leave them but clear text / or trim
  // Prefer trimming extras so the deck matches our research content length
  if (slidePaths.length > presentation.slides.length && presentationXml) {
    const keep = presentation.slides.length;
    // Remove trailing slide files from package references only (keep files harmless)
    const relsPath = "ppt/_rels/presentation.xml.rels";
    let rels = (await zip.file(relsPath)?.async("string")) || "";
    for (let n = keep + 1; n <= slidePaths.length; n++) {
      rels = rels.replace(
        new RegExp(
          `<Relationship[^>]*Target="slides/slide${n}\\.xml"[^>]*/>`,
          "i"
        ),
        ""
      );
      presentationXml = presentationXml.replace(
        new RegExp(`<p:sldId[^>]*r:id="rId\\d+"[^>]*/>`, "i"),
        (match) => {
          // We'll rebuild sldIdLst more carefully below if needed
          return match;
        }
      );
    }
    // Rebuild sldIdLst from remaining slide relationships
    const slideRels = [
      ...rels.matchAll(
        /<Relationship([^>]*Type="[^"]*relationships\/slide"[^>]*)\/>/g
      ),
    ]
      .map((m) => {
        const attrs = m[1];
        const id = attrs.match(/Id="(rId\d+)"/i)?.[1];
        const target = attrs.match(/Target="([^"]+)"/i)?.[1] || "";
        const num = Number(target.match(/slide(\d+)/i)?.[1] || 0);
        return { id, num };
      })
      .filter((x) => x.id && x.num > 0 && x.num <= keep)
      .sort((a, b) => a.num - b.num);

    if (slideRels.length) {
      const lst = slideRels
        .map((s, i) => `<p:sldId id="${256 + i}" r:id="${s.id}"/>`)
        .join("");
      presentationXml = presentationXml.replace(
        /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
        `<p:sldIdLst>${lst}</p:sldIdLst>`
      );
      zip.file(relsPath, rels);
    }
  }

  if (presentationXml) zip.file(presentationXmlPath, presentationXml);
  if (contentTypes) zip.file(contentTypesPath, contentTypes);

  // Fill text into the slides we keep
  const finalPaths = listSlidePaths(zip).slice(0, presentation.slides.length);
  for (let i = 0; i < finalPaths.length; i++) {
    const path = finalPaths[i];
    const xml = await zip.file(path)!.async("string");
    const filled = fillSlideXml(xml, presentation.slides[i]);
    zip.file(path, filled);
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(out);
}

async function fallbackGeneratedPptx(presentation: ResearchPresentation): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.author = presentation.authorsPlaceholder;
  pptx.title = presentation.title;
  pptx.subject = presentation.subtitle;

  const bg = "0F2A3D";
  const accent = "2A6F7F";
  const ink = "1A1A1A";
  const muted = "4A5560";

  presentation.slides.forEach((slide, index) => {
    const s = pptx.addSlide();
    if (slide.kind === "title" || index === 0) {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
        fill: { color: bg },
      });
      s.addText(slide.title, {
        x: 0.6,
        y: 2.0,
        w: 8.8,
        h: 1.2,
        fontSize: 32,
        fontFace: "Georgia",
        color: "FFFFFF",
        bold: true,
      });
      s.addText(slide.bullets.join("\n"), {
        x: 0.6,
        y: 3.4,
        w: 8.8,
        h: 2.0,
        fontSize: 16,
        fontFace: "Calibri",
        color: "D9E8EC",
      });
    } else if (slide.kind === "closing") {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: "100%",
        fill: { color: accent },
      });
      s.addText(slide.title, {
        x: 0.6,
        y: 2.4,
        w: 8.8,
        h: 1,
        fontSize: 36,
        fontFace: "Georgia",
        color: "FFFFFF",
        bold: true,
        align: "center",
      });
      s.addText(slide.bullets.join(" · "), {
        x: 0.6,
        y: 3.6,
        w: 8.8,
        h: 1,
        fontSize: 16,
        fontFace: "Calibri",
        color: "FFFFFF",
        align: "center",
      });
    } else {
      s.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: "100%",
        h: 0.18,
        fill: { color: accent },
      });
      s.addText(slide.title, {
        x: 0.5,
        y: 0.45,
        w: 9,
        h: 0.7,
        fontSize: 26,
        fontFace: "Georgia",
        color: ink,
        bold: true,
      });
      s.addText(
        slide.bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true } })),
        {
          x: 0.6,
          y: 1.4,
          w: 8.8,
          h: 3.8,
          fontSize: 17,
          fontFace: "Calibri",
          color: muted,
          valign: "top",
        }
      );
    }
    if (slide.notes) s.addNotes(slide.notes);
  });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return Buffer.from(out);
}

export async function presentationToPptxBuffer(
  presentation: ResearchPresentation,
  templateBase64?: string | null
): Promise<Buffer> {
  if (templateBase64) {
    try {
      return await cloneTemplatePptx(templateBase64, presentation);
    } catch (err) {
      console.error("PPTX template clone failed, falling back:", err);
    }
  }
  return fallbackGeneratedPptx(presentation);
}
