import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  SectionType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { SurveyEquation, SurveyPaper } from "./types";
import { dataUrlToUint8Array, svgToPngDataUrl } from "./export-media";

function p(
  text: string,
  opts?: { bold?: boolean; italics?: boolean; size?: number; center?: boolean; after?: number }
): Paragraph {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: opts?.after ?? 120, line: 240 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        italics: opts?.italics,
        size: opts?.size ?? 18, // 9pt IEEE-ish
        font: "Times New Roman",
      }),
    ],
  });
}

function heading(text: string, level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2) {
  return new Paragraph({
    heading: level,
    spacing: { before: 200, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: "Times New Roman",
        size: level === HeadingLevel.HEADING_1 ? 20 : 18,
      }),
    ],
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const colW = Math.floor(9360 / Math.max(headers.length, 1));
  const headerRow = new TableRow({
    children: headers.map(
      (h) =>
        new TableCell({
          borders,
          width: { size: colW, type: WidthType.DXA },
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 14, font: "Times New Roman" })],
            }),
          ],
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
              width: { size: colW, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell, size: 14, font: "Times New Roman" })],
                }),
              ],
            })
        ),
      })
  );
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows],
  });
}

async function equationBlocks(eq: SurveyEquation): Promise<(Paragraph)[]> {
  const out: Paragraph[] = [p(`(${eq.number}) ${eq.label}`, { bold: true, center: true, size: 17 })];
  try {
    const svg =
      eq.svg ||
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 90" width="860" height="90"><rect width="100%" height="100%" fill="#fff" stroke="#000"/><text x="430" y="55" text-anchor="middle" font-size="20" font-style="italic" font-family="Times New Roman, Times, serif">${(eq.display || eq.plaintext).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`;
    const { dataUrl, width, height } = await svgToPngDataUrl(svg, 2);
    const bytes = dataUrlToUint8Array(dataUrl);
    const displayW = 468;
    const displayH = Math.min(Math.round(displayW * (height / Math.max(width, 1))), 90);
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [
          new ImageRun({
            data: bytes,
            transformation: { width: displayW, height: displayH },
            type: "png",
          }),
        ],
      })
    );
  } catch {
    out.push(p(eq.display || eq.plaintext, { italics: true, center: true, size: 18 }));
  }
  out.push(p(eq.description, { italics: true, size: 15 }));
  return out;
}

function sectionNumber(index: number, ieee: boolean): string {
  if (!ieee) return `${index + 1}.`;
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return `${romans[index] ?? index + 1}.`;
}

export async function paperToDocxBlob(paper: SurveyPaper): Promise<Blob> {
  const ieee = paper.template === "ieee" || !paper.template;
  const front: Paragraph[] = [];

  front.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: paper.title, bold: true, size: 28, font: "Times New Roman" })],
    })
  );
  front.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: paper.authorsPlaceholder, size: 20, font: "Times New Roman" })],
    })
  );
  front.push(p(`Abstract—${paper.abstract}`, { size: 18 }));
  front.push(p(`Index Terms—${paper.keywords.join(", ")}.`, { italics: true, size: 16 }));

  if (paper.contributions?.length) {
    front.push(p("Contributions:", { bold: true }));
    paper.contributions.forEach((c, i) => front.push(p(`${i + 1}) ${c}`, { size: 17 })));
  }

  const body: (Paragraph | Table)[] = [];
  let major = 0;
  const equations = paper.equations ?? [];
  const eqDescs = new Set(equations.map((e) => e.description.trim().toLowerCase()));
  const eqForms = new Set(
    equations.flatMap((e) => [e.display, e.plaintext].map((s) => s.trim().toLowerCase()))
  );

  for (const section of paper.sections) {
    if (section.level === 1) {
      const num = sectionNumber(major, ieee);
      major++;
      body.push(heading(`${num} ${section.heading.toUpperCase()}`, HeadingLevel.HEADING_1));
    } else {
      body.push(heading(section.heading, HeadingLevel.HEADING_2));
    }

    for (const para of section.content.split(/\n{2,}/)) {
      const t = para.trim();
      if (!t) continue;
      if (/^Equation\s*\(\d+\)/i.test(t)) continue;
      const lower = t.toLowerCase();
      if (eqDescs.has(lower) || eqForms.has(lower)) continue;
      if (/[=∫Σ∑√‖]/.test(t) && t.length < 180) continue;
      body.push(p(t));
    }

    for (const eq of equations.filter((e) => e.sectionId === section.id)) {
      body.push(...(await equationBlocks(eq)));
    }
  }

  let tbl = 0;
  for (const table of paper.tables ?? []) {
    tbl++;
    body.push(p(`TABLE ${tbl}. ${table.title}`, { bold: true, center: true }));
    body.push(p(table.caption, { italics: true, size: 15, center: true }));
    body.push(makeTable(table.headers, table.rows));
    body.push(p(""));
  }

  let figIndex = 0;
  for (const fig of paper.figures ?? []) {
    figIndex++;
    body.push(p(`Fig. ${figIndex}. ${fig.title}`, { bold: true, center: true }));
    try {
      const { dataUrl, width, height } = await svgToPngDataUrl(fig.svg, 2);
      const bytes = dataUrlToUint8Array(dataUrl);
      const displayW = ieee ? 300 : 540; // column-friendly width for IEEE
      const displayH = Math.round(displayW * (height / Math.max(width, 1)));
      body.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [
            new ImageRun({
              data: bytes,
              transformation: { width: displayW, height: Math.min(displayH, 280) },
              type: "png",
            }),
          ],
        })
      );
    } catch {
      body.push(p(`[Figure: ${fig.title}]`, { italics: true, center: true }));
    }
    body.push(p(fig.caption, { italics: true, size: 15, center: true }));
  }

  body.push(heading("REFERENCES", HeadingLevel.HEADING_1));
  for (const ref of paper.references) {
    body.push(p(ref.text, { size: 16 }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: front,
      },
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
          column: {
            count: ieee ? 2 : 1,
            space: 720,
            equalWidth: true,
          },
        },
        children: body,
      },
    ],
  });

  return Packer.toBlob(doc);
}
