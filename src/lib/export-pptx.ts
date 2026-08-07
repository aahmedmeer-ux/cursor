import PptxGenJS from "pptxgenjs";
import type { ResearchPresentation } from "./types";

export async function presentationToPptxBuffer(
  presentation: ResearchPresentation
): Promise<Buffer> {
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

    if (slide.notes) {
      s.addNotes(slide.notes);
    }
  });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return Buffer.from(out);
}
