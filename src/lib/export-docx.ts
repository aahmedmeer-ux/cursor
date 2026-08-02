import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
  AlignmentType,
} from "docx";
import type { SurveyPaper } from "./types";
import { dataUrlToUint8Array, svgToPngDataUrl } from "./export-media";

function p(text: string, opts?: { bold?: boolean; italics?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        italics: opts?.italics,
        size: opts?.size ?? 22, // half-points
        font: "Calibri",
      }),
    ],
  });
}

function heading(text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Calibri", size: level === HeadingLevel.HEADING_1 ? 28 : 24 })],
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const border = { style: BorderStyle.SINGLE, size: 8, color: "0C1F2E" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          borders,
          width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 18, font: "Calibri", color: "FFFFFF" })],
            }),
          ],
          shading: { fill: "0C1F2E" },
        })
    ),
  });
  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              borders,
              width: { size: Math.floor(9000 / headers.length), type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, size: 18, font: "Calibri" })],
                }),
              ],
            })
        ),
      })
  );
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows],
  });
}

export async function paperToDocxBlob(paper: SurveyPaper): Promise<Blob> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: paper.title, bold: true, size: 32, font: "Calibri" })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: paper.authorsPlaceholder, size: 20, font: "Calibri", color: "5A6B75" })],
    })
  );

  children.push(heading("Abstract", HeadingLevel.HEADING_1));
  children.push(p(paper.abstract));
  children.push(p(`Keywords: ${paper.keywords.join("; ")}`, { italics: true, size: 20 }));

  if (paper.contributions?.length) {
    children.push(heading("Contributions", HeadingLevel.HEADING_1));
    paper.contributions.forEach((c, i) => children.push(p(`${i + 1}. ${c}`)));
  }

  let major = 0;
  for (const section of paper.sections) {
    if (section.level === 1) {
      major++;
      children.push(heading(`${major}. ${section.heading}`, HeadingLevel.HEADING_1));
    } else {
      children.push(heading(section.heading, HeadingLevel.HEADING_2));
    }
    // Split paragraphs on blank lines
    for (const para of section.content.split(/\n{2,}/)) {
      const t = para.trim();
      if (t) children.push(p(t));
    }
  }

  for (const table of paper.tables ?? []) {
    children.push(heading(table.title, HeadingLevel.HEADING_1));
    children.push(p(table.caption, { italics: true, size: 20 }));
    children.push(makeTable(table.headers, table.rows));
    children.push(p(""));
  }

  let figIndex = 0;
  for (const fig of paper.figures ?? []) {
    figIndex++;
    children.push(heading(`Figure ${figIndex}. ${fig.title}`, HeadingLevel.HEADING_1));
    try {
      const dataUrl = await svgToPngDataUrl(fig.svg, 2);
      const bytes = dataUrlToUint8Array(dataUrl);
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: 540, height: 280 },
              type: "png",
            }),
          ],
        })
      );
    } catch {
      children.push(p(`[SVG figure: ${fig.title}]`, { italics: true }));
    }
    children.push(p(fig.caption, { italics: true, size: 20 }));
  }

  if (paper.references.length) {
    children.push(heading("References", HeadingLevel.HEADING_1));
    for (const ref of paper.references) {
      children.push(p(ref.text, { size: 18 }));
    }
  }

  children.push(
    p(
      `SurveyForge draft · ${paper.metadata.generatedAt} · Validate citations before submission.`,
      { italics: true, size: 16 }
    )
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  return Packer.toBlob(doc);
}
