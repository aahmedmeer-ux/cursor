import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SurveyEquation, SurveyFigure, SurveyPaper, SurveyTable } from "./types";
import { svgToPngDataUrl } from "./export-media";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 12.7; // ~0.5 in IEEE-ish
const GUTTER = 6;
const COL_W = (PAGE_W - MARGIN * 2 - GUTTER) / 2;
const BOTTOM = PAGE_H - MARGIN;
const TOP = MARGIN;

type ColState = {
  doc: jsPDF;
  col: 0 | 1;
  y0: number; // left
  y1: number; // right
  twoCol: boolean;
};

function colX(state: ColState): number {
  if (!state.twoCol) return MARGIN;
  return state.col === 0 ? MARGIN : MARGIN + COL_W + GUTTER;
}

function colWidth(state: ColState): number {
  return state.twoCol ? COL_W : PAGE_W - MARGIN * 2;
}

function getY(state: ColState): number {
  return state.col === 0 ? state.y0 : state.y1;
}

function setY(state: ColState, y: number) {
  if (state.col === 0) state.y0 = y;
  else state.y1 = y;
}

function newPage(state: ColState) {
  state.doc.addPage();
  state.col = 0;
  state.y0 = TOP;
  state.y1 = TOP;
}

function ensure(state: ColState, needed: number) {
  let y = getY(state);
  if (y + needed <= BOTTOM) return;
  if (state.twoCol && state.col === 0) {
    state.col = 1;
    if (state.y1 + needed <= BOTTOM) return;
  }
  newPage(state);
}

function writeLines(
  state: ColState,
  text: string,
  opts: { bold?: boolean; italic?: boolean; size?: number; lineH?: number; align?: "left" | "center" } = {}
) {
  const doc = state.doc;
  const size = opts.size ?? 9;
  const lineH = opts.lineH ?? size * 0.42;
  doc.setFont("helvetica", opts.bold ? "bold" : opts.italic ? "italic" : "normal");
  doc.setFontSize(size);
  const maxW = colWidth(state);
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    ensure(state, lineH + 0.5);
    const y = getY(state);
    const x = colX(state);
    if (opts.align === "center") {
      doc.text(line, x + maxW / 2, y, { align: "center" });
    } else {
      doc.text(line, x, y);
    }
    setY(state, y + lineH);
  }
}

function writeGap(state: ColState, mm = 2) {
  setY(state, getY(state) + mm);
}

function beginTwoColumn(state: ColState) {
  // Balance: start both columns at current max Y after front matter
  const y = Math.max(state.y0, state.y1);
  state.twoCol = true;
  state.col = 0;
  state.y0 = y;
  state.y1 = y;
}

function flushToFullWidth(state: ColState) {
  if (!state.twoCol) return;
  // Move past the taller column, then full width
  const y = Math.max(state.y0, state.y1) + 3;
  state.twoCol = false;
  state.col = 0;
  state.y0 = y;
  state.y1 = y;
  if (state.y0 > BOTTOM - 20) newPage(state);
}

function sectionLabel(index: number, ieee: boolean): string {
  if (!ieee) return `${index + 1}.`;
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];
  return romans[index] ?? `${index + 1}.`;
}

function figureKindToSection(kind: SurveyFigure["kind"]): string {
  switch (kind) {
    case "problem":
      return "background";
    case "taxonomy":
      return "taxonomy";
    case "comparison":
      return "comparison";
    case "challenges":
      return "challenges";
    case "venn":
      return "trends-gaps";
    default:
      return "";
  }
}

function tableKindToSection(kind: SurveyTable["kind"]): string {
  switch (kind) {
    case "related-surveys":
      return "related-surveys";
    case "comparison":
      return "comparison";
    case "challenges":
      return "challenges";
    case "taxonomy":
      return "taxonomy";
    default:
      return "";
  }
}

async function drawFigure(state: ColState, fig: SurveyFigure, index: number) {
  flushToFullWidth(state);
  ensure(state, 60);
  writeLines(state, `Fig. ${index}. ${fig.title}`, { bold: true, size: 9 });
  writeGap(state, 1.5);

  try {
    const { dataUrl, width, height } = await svgToPngDataUrl(fig.svg, 2);
    const maxW = PAGE_W - MARGIN * 2;
    const aspect = height / Math.max(width, 1);
    let imgW = maxW;
    let imgH = imgW * aspect;
    // Cap height so multi-figure papers stay usable
    if (imgH > 95) {
      imgH = 95;
      imgW = imgH / aspect;
    }
    ensure(state, imgH + 10);
    const x = MARGIN + (maxW - imgW) / 2;
    const y = getY(state);
    state.doc.addImage(dataUrl, "PNG", x, y, imgW, imgH, undefined, "FAST");
    setY(state, y + imgH + 2);
    writeLines(state, fig.caption, { italic: true, size: 8, lineH: 3.4 });
    writeGap(state, 3);
  } catch {
    writeLines(state, `[Figure unavailable in this export: ${fig.title}]`, { italic: true, size: 8 });
    writeGap(state, 2);
  }

  beginTwoColumn(state);
}

function drawTable(state: ColState, table: SurveyTable, index: number) {
  flushToFullWidth(state);
  writeLines(state, `TABLE ${toRoman(index)}. ${table.title}`, { bold: true, size: 9, align: "center" });
  writeGap(state, 1);
  writeLines(state, table.caption, { italic: true, size: 8, lineH: 3.4 });
  writeGap(state, 1.5);

  autoTable(state.doc, {
    startY: getY(state),
    head: [table.headers],
    body: table.rows,
    styles: { fontSize: 7, cellPadding: 1.1, overflow: "linebreak", font: "helvetica" },
    headStyles: { fillColor: [12, 31, 46], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [243, 247, 248] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: PAGE_W - MARGIN * 2,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = ((state.doc as any).lastAutoTable?.finalY as number) || getY(state);
  state.y0 = finalY + 4;
  state.y1 = finalY + 4;
  beginTwoColumn(state);
}

async function drawEquation(state: ColState, eq: SurveyEquation) {
  writeGap(state, 1.5);
  flushToFullWidth(state);
  try {
    const svg =
      eq.svg ||
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 90" width="860" height="90"><rect width="100%" height="100%" fill="#fff"/><text x="430" y="55" text-anchor="middle" font-size="18" font-style="italic" font-family="Times New Roman, Times, serif">(${eq.number})  ${eq.display || eq.plaintext}</text></svg>`;
    const { dataUrl, width, height } = await svgToPngDataUrl(svg, 2);
    const maxW = PAGE_W - MARGIN * 2;
    const aspect = height / Math.max(width, 1);
    const imgW = maxW;
    const imgH = Math.min(imgW * aspect, 36);
    ensure(state, imgH + 12);
    const x = MARGIN + (PAGE_W - MARGIN * 2 - imgW) / 2;
    const y = getY(state);
    state.doc.addImage(dataUrl, "PNG", x, y, imgW, imgH, undefined, "FAST");
    setY(state, y + imgH + 2);
    writeLines(state, eq.description, { size: 8, lineH: 3.4, italic: true });
  } catch {
    writeLines(state, `(${eq.number})  ${eq.display || eq.plaintext}`, {
      italic: true,
      size: 9,
      align: "center",
      lineH: 3.8,
    });
    writeLines(state, `${eq.label}: ${eq.description}`, { size: 8, lineH: 3.4 });
  }
  writeGap(state, 1.5);
  beginTwoColumn(state);
}

function toRoman(n: number): string {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return romans[n - 1] ?? String(n);
}

export async function paperToPdfBlob(paper: SurveyPaper): Promise<Blob> {
  const ieee = paper.template === "ieee" || !paper.template;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const state: ColState = { doc, col: 0, y0: TOP + 4, y1: TOP + 4, twoCol: false };

  // Title (full width)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const titleLines = doc.splitTextToSize(paper.title, PAGE_W - MARGIN * 2) as string[];
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, state.y0, { align: "center" });
    state.y0 += 6;
  }
  state.y0 += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(paper.authorsPlaceholder, PAGE_W / 2, state.y0, { align: "center" });
  state.y0 += 7;
  state.y1 = state.y0;

  // Abstract
  writeLines(state, "Abstract—", { bold: true, size: 9 });
  // put abstract on same flow
  writeLines(state, paper.abstract, { size: 9, lineH: 3.8 });
  writeGap(state, 2);
  writeLines(state, `Index Terms—${paper.keywords.join(", ")}.`, { italic: true, size: 8.5, lineH: 3.6 });
  writeGap(state, 3);

  if (paper.contributions?.length) {
    writeLines(state, "Contributions:", { bold: true, size: 9 });
    paper.contributions.forEach((c, i) => writeLines(state, `${i + 1}) ${c}`, { size: 8.5, lineH: 3.6 }));
    writeGap(state, 2);
  }

  beginTwoColumn(state);

  const figures = paper.figures ?? [];
  const tables = paper.tables ?? [];
  const equations = paper.equations ?? [];
  const usedFigs = new Set<string>();
  const usedTables = new Set<string>();
  let figNum = 0;
  let tblNum = 0;
  let major = 0;

  for (const section of paper.sections) {
    if (section.level === 1) {
      const label = sectionLabel(major, ieee);
      major++;
      writeGap(state, 2);
      writeLines(state, `${label}. ${section.heading.toUpperCase()}`, { bold: true, size: 10, lineH: 4.2 });
      writeGap(state, 1);
    } else {
      writeGap(state, 1.5);
      writeLines(state, `${section.heading}`, { bold: true, italic: true, size: 9, lineH: 3.8 });
      writeGap(state, 0.8);
    }

    for (const para of section.content.split(/\n{2,}/)) {
      const t = para.trim();
      if (!t) continue;
      // Equation blocks start with "Equation (n)" — skip plain text duplicates; render once as image
      if (/^Equation\s*\(\d+\)/i.test(t)) {
        const eq = equations.find((e) => t.includes(`(${e.number})`));
        if (eq) await drawEquation(state, eq);
        else writeLines(state, t, { size: 9, lineH: 3.8 });
      } else {
        writeLines(state, t, { size: 9, lineH: 3.8 });
      }
      writeGap(state, 1.2);
    }

    // Attach figures/tables for this section
    for (const fig of figures) {
      if (usedFigs.has(fig.id)) continue;
      if (figureKindToSection(fig.kind) !== section.id) continue;
      usedFigs.add(fig.id);
      figNum++;
      await drawFigure(state, fig, figNum);
    }
    for (const table of tables) {
      if (usedTables.has(table.id)) continue;
      if (tableKindToSection(table.kind) !== section.id) continue;
      usedTables.add(table.id);
      tblNum++;
      drawTable(state, table, tblNum);
    }
  }

  // Leftover figures/tables
  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    figNum++;
    await drawFigure(state, fig, figNum);
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    tblNum++;
    drawTable(state, table, tblNum);
  }

  // References — often start new column/page in IEEE
  writeGap(state, 2);
  writeLines(state, "REFERENCES", { bold: true, size: 10 });
  writeGap(state, 1);
  for (const ref of paper.references) {
    writeLines(state, ref.text, { size: 8, lineH: 3.3 });
    writeGap(state, 0.8);
  }

  return doc.output("blob");
}
