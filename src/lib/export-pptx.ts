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

function listSlidePaths(zip: JSZip): string[] {
  return Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });
}

/**
 * Fill only placeholder text frames (title / body / subtitle / obj).
 * Leaves logo text, footers, and decorative shapes untouched so the template
 * remains a true visual duplicate (images, backgrounds, masters intact).
 */
function fillPlaceholderText(xml: string, slide: PresentationSlide): string {
  const title = (slide.title || "").trim();
  const bullets = slide.bullets.map((b) => b.trim()).filter(Boolean);

  // Split into shapes so we can detect p:ph type per shape
  const shapeRegex =
    /<p:sp\b[\s\S]*?<\/p:sp>|<p:pic\b[\s\S]*?<\/p:pic>|<p:cxnSp\b[\s\S]*?<\/p:cxnSp>|<p:grpSp\b[\s\S]*?<\/p:grpSp>/g;
  const parts: { start: number; end: number; xml: string; kind: "shape" | "other" }[] = [];
  let last = 0;
  for (const m of xml.matchAll(shapeRegex)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ start: last, end: start, xml: xml.slice(last, start), kind: "other" });
    parts.push({ start, end: start + m[0].length, xml: m[0], kind: "shape" });
    last = start + m[0].length;
  }
  if (last < xml.length) parts.push({ start: last, end: xml.length, xml: xml.slice(last), kind: "other" });

  // If we couldn't parse shapes, fall back to light title/body replacement on first runs only
  if (!parts.some((p) => p.kind === "shape")) {
    return fillAllTextRunsLightly(xml, title, bullets);
  }

  let titleFilled = false;
  let bodyFilled = false;
  let bulletIdx = 0;

  const out = parts
    .map((part) => {
      if (part.kind !== "shape") return part.xml;
      // Never touch pictures — preserves template images
      if (/^<p:pic\b/i.test(part.xml)) return part.xml;

      const ph = part.xml.match(/<p:ph\b([^>]*)\/?>/i)?.[1] || "";
      const phType = (ph.match(/\btype="([^"]+)"/i)?.[1] || "").toLowerCase();
      const isTitle = /^(title|ctrtitle|centertitle)$/i.test(phType);
      const isBody =
        !phType ||
        /^(body|obj|subTitle|subtitle|chart|clipart|dgm|media|tbl|pic)$/i.test(phType);
      const hasText = /<a:t[\s>]/.test(part.xml);

      if (!hasText) return part.xml;

      if (isTitle && !titleFilled) {
        titleFilled = true;
        return replaceShapeTextRuns(part.xml, [title]);
      }

      if (isBody && !isTitle && !bodyFilled) {
        // Fill body placeholder with remaining bullets (one run per paragraph when possible)
        const lines = bullets.length ? bullets : [title];
        bodyFilled = true;
        bulletIdx = lines.length;
        return replaceShapeTextRuns(part.xml, lines);
      }

      // Non-placeholder decorative text: leave unchanged
      if (!phType && !/<p:ph\b/i.test(part.xml)) {
        return part.xml;
      }

      return part.xml;
    })
    .join("");

  // If no explicit placeholders were found, do a careful first-run title + next-runs body fill
  if (!titleFilled && !bodyFilled) {
    return fillAllTextRunsLightly(xml, title, bullets);
  }

  // Suppress unused var lint
  void bulletIdx;
  return out;
}

function replaceShapeTextRuns(shapeXml: string, lines: string[]): string {
  const runs = [...shapeXml.matchAll(/<a:t([^>]*)>([^<]*)<\/a:t>/g)];
  if (!runs.length) return shapeXml;

  // Prefer replacing whole paragraphs if the shape has multiple <a:p>
  const paras = [...shapeXml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)];
  if (paras.length >= 1 && lines.length >= 1) {
    let rebuilt = shapeXml;
    // Replace from the end to keep indices stable
    const targets = paras.slice(0, Math.max(paras.length, lines.length));
    for (let i = targets.length - 1; i >= 0; i--) {
      const p = targets[i];
      const start = p.index ?? 0;
      const end = start + p[0].length;
      const text = lines[i] ?? "";
      // Keep paragraph properties; replace only text runs inside
      let para = p[0];
      const innerRuns = [...para.matchAll(/<a:t([^>]*)>([^<]*)<\/a:t>/g)];
      if (!innerRuns.length) {
        // Inject a simple run if paragraph has no text
        if (text) {
          para = para.replace(
            /<\/a:p>/,
            `<a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escapeXml(text)}</a:t></a:r></a:p>`
          );
        }
      } else {
        let cursor = 0;
        let next = "";
        for (let r = 0; r < innerRuns.length; r++) {
          const m = innerRuns[r];
          const rs = m.index ?? 0;
          next += para.slice(cursor, rs);
          const attrs = m[1] || "";
          const value = r === 0 ? text : "";
          next += `<a:t${attrs}>${escapeXml(value)}</a:t>`;
          cursor = rs + m[0].length;
        }
        next += para.slice(cursor);
        para = next;
      }
      rebuilt = rebuilt.slice(0, start) + para + rebuilt.slice(end);
    }

    // If we have more lines than paragraphs, append extra paragraphs before </p:txBody>
    if (lines.length > paras.length) {
      const extra = lines
        .slice(paras.length)
        .map(
          (line) =>
            `<a:p><a:pPr marL="0" indent="0"><a:buFont typeface="Arial"/><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escapeXml(line)}</a:t></a:r></a:p>`
        )
        .join("");
      rebuilt = rebuilt.replace(/<\/p:txBody>/, `${extra}</p:txBody>`);
    }
    return rebuilt;
  }

  // Fallback: first run gets joined lines
  let cursor = 0;
  let next = "";
  for (let i = 0; i < runs.length; i++) {
    const m = runs[i];
    const start = m.index ?? 0;
    next += shapeXml.slice(cursor, start);
    const attrs = m[1] || "";
    const value = i === 0 ? lines.join("\n") : "";
    next += `<a:t${attrs}>${escapeXml(value)}</a:t>`;
    cursor = start + m[0].length;
  }
  next += shapeXml.slice(cursor);
  return next;
}

function fillAllTextRunsLightly(xml: string, title: string, bullets: string[]): string {
  const runs = [...xml.matchAll(/<a:t([^>]*)>([^<]*)<\/a:t>/g)];
  if (!runs.length) return xml;
  const lines = [title, ...bullets];
  let cursor = 0;
  let rebuilt = "";
  for (let i = 0; i < runs.length; i++) {
    const m = runs[i];
    const start = m.index ?? 0;
    rebuilt += xml.slice(cursor, start);
    const attrs = m[1] || "";
    // Only overwrite the first N text runs; leave the rest (footers/logos) alone
    if (i < lines.length) {
      rebuilt += `<a:t${attrs}>${escapeXml(lines[i])}</a:t>`;
    } else {
      rebuilt += m[0];
    }
    cursor = start + m[0].length;
  }
  rebuilt += xml.slice(cursor);
  return rebuilt;
}

/**
 * True template duplicate:
 * - Keep every slide, theme, master, image, and background from the uploaded PPTX
 * - Only rewrite placeholder text with research content
 * - Never strip media or slide relationships
 */
async function cloneTemplatePptx(
  templateBase64: string,
  presentation: ResearchPresentation
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(Buffer.from(templateBase64, "base64"));
  const slidePaths = listSlidePaths(zip);
  if (!slidePaths.length) {
    throw new Error("Uploaded PPTX template has no slides to duplicate.");
  }

  // Exact template length: map our content onto the template's own slides.
  // Extra research slides wrap; missing ones reuse the last content.
  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const content =
      presentation.slides[i] ||
      presentation.slides[presentation.slides.length - 1] || {
        id: `slide-${i + 1}`,
        title: presentation.title,
        bullets: [presentation.subtitle, presentation.authorsPlaceholder],
        kind: "results" as const,
      };
    const xml = await zip.file(path)!.async("string");
    zip.file(path, fillPlaceholderText(xml, content));
  }

  // Touch nothing else: theme, media, slideMasters, slideLayouts, notes, backgrounds stay intact
  const out = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
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
      throw err instanceof Error
        ? err
        : new Error("Failed to duplicate the uploaded presentation template.");
    }
  }
  return fallbackGeneratedPptx(presentation);
}
