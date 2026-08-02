import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SurveyEquation, SurveyFigure, SurveyPaper, SurveyTable } from "./types";
import { svgToPngDataUrl } from "./export-media";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const GUTTER = 7;
const COL_W = (PAGE_W - MARGIN * 2 - GUTTER) / 2;
const BOTTOM = PAGE_H - MARGIN;
const TOP = MARGIN;

type ColState = {
  doc: jsPDF;
  col: 0 | 1;
  y0: number;
  y1: number;
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

function syncY(state: ColState, y: number) {
  state.y0 = y;
  state.y1 = y;
}

function newPage(state: ColState) {
  state.doc.addPage();
  state.col = 0;
  syncY(state, TOP);
}

/** Move to next column or page when current column is full. */
function ensure(state: ColState, needed: number) {
  if (getY(state) + needed <= BOTTOM) return;
  if (state.twoCol && state.col === 0) {
    state.col = 1;
    if (getY(state) + needed <= BOTTOM) return;
  }
  newPage(state);
}

function setTimes(doc: jsPDF, style: "normal" | "bold" | "italic" | "bolditalic", size: number) {
  doc.setFont("times", style);
  doc.setFontSize(size);
}

function writeLines(
  state: ColState,
  text: string,
  opts: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    lineH?: number;
    align?: "left" | "center" | "justify";
  } = {}
) {
  const doc = state.doc;
  const size = opts.size ?? 9;
  const lineH = opts.lineH ?? size * 0.42;
  const style =
    opts.bold && opts.italic ? "bolditalic" : opts.bold ? "bold" : opts.italic ? "italic" : "normal";
  setTimes(doc, style, size);
  const maxW = colWidth(state);
  const lines = doc.splitTextToSize(text, maxW) as string[];
  for (const line of lines) {
    ensure(state, lineH + 0.4);
    const y = getY(state);
    const x = colX(state);
    if (opts.align === "center") doc.text(line, x + maxW / 2, y, { align: "center" });
    else if (opts.align === "justify" && lines.length > 1) {
      doc.text(line, x, y, { maxWidth: maxW, align: "justify" });
    } else doc.text(line, x, y);
    setY(state, y + lineH);
  }
}

function writeGap(state: ColState, mm = 2) {
  setY(state, getY(state) + mm);
}

/** Finish two-column region by balancing to the taller column, then full width. */
function endTwoColumn(state: ColState) {
  if (!state.twoCol) return;
  const y = Math.max(state.y0, state.y1) + 4;
  state.twoCol = false;
  state.col = 0;
  syncY(state, y);
  if (state.y0 > BOTTOM - 28) newPage(state);
}

function startTwoColumn(state: ColState) {
  const y = Math.max(state.y0, state.y1);
  state.twoCol = true;
  state.col = 0;
  syncY(state, y);
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

function toRoman(n: number): string {
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return romans[n - 1] ?? String(n);
}

/** Strip leftover equation dumps from prose (structured eqs are rendered separately). */
function proseWithoutEquations(content: string, equations: SurveyEquation[]): string {
  const eqDesc = new Set(equations.map((e) => e.description.trim().toLowerCase()));
  const eqFormula = new Set(
    equations.flatMap((e) => [e.display.trim(), e.plaintext.trim()].map((s) => s.toLowerCase()))
  );

  const parts = content.split(/\n{2,}/);
  const kept: string[] = [];
  let skippingEq = false;
  let skipBudget = 0;

  for (const raw of parts) {
    const t = raw.trim();
    if (!t) continue;

    if (/^Equation\s*\(\d+\)/i.test(t)) {
      skippingEq = true;
      skipBudget = 2;
      continue;
    }

    const lower = t.toLowerCase();
    if (eqDesc.has(lower) || eqFormula.has(lower)) continue;

    // Garbled / unicode formula leftovers
    if (
      (/[=∫Σ∑√‖]/.test(t) && t.length < 180) ||
      (/d[ᵢi].*p[ᵢi]/.test(t) && t.length < 120) ||
      (/v[ᵢi].*pbest/i.test(t) && t.length < 160)
    ) {
      continue;
    }

    if (skippingEq && skipBudget > 0) {
      skipBudget--;
      if (
        /[=∫Σ∑√‖]/.test(t) ||
        t.length < 160 ||
        /^(Euclidean|Canonical|Fraction|Core|Negative|Supervised|Optimal|Abstract|Many surveyed)/i.test(t)
      ) {
        continue;
      }
      skippingEq = false;
    }

    kept.push(t);
  }
  return kept.join("\n\n");
}

async function drawFullWidthFigure(state: ColState, fig: SurveyFigure, index: number) {
  endTwoColumn(state);
  ensure(state, 50);
  writeLines(state, `Fig. ${index}. ${fig.title}.`, { bold: true, size: 9, align: "center" });
  writeGap(state, 2);

  try {
    const { dataUrl, width, height } = await svgToPngDataUrl(fig.svg, 2);
    const maxW = PAGE_W - MARGIN * 2;
    const aspect = height / Math.max(width, 1);
    let imgW = maxW;
    let imgH = imgW * aspect;
    if (imgH > 100) {
      imgH = 100;
      imgW = imgH / aspect;
    }
    ensure(state, imgH + 12);
    const x = MARGIN + (maxW - imgW) / 2;
    const y = getY(state);
    state.doc.addImage(dataUrl, "PNG", x, y, imgW, imgH, undefined, "FAST");
    syncY(state, y + imgH + 3);
    writeLines(state, fig.caption, { italic: true, size: 8, lineH: 3.5, align: "center" });
    writeGap(state, 4);
  } catch {
    writeLines(state, `[Figure: ${fig.title}]`, { italic: true, size: 8, align: "center" });
    writeGap(state, 3);
  }
  startTwoColumn(state);
}

function drawFullWidthTable(state: ColState, table: SurveyTable, index: number) {
  endTwoColumn(state);
  writeLines(state, `TABLE ${toRoman(index)}`, { bold: true, size: 9, align: "center" });
  writeLines(state, table.title, { bold: true, size: 8.5, align: "center" });
  writeGap(state, 1);
  writeLines(state, table.caption, { italic: true, size: 8, lineH: 3.4, align: "center" });
  writeGap(state, 2);

  autoTable(state.doc, {
    startY: getY(state),
    head: [table.headers],
    body: table.rows,
    styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak", font: "times", valign: "top" },
    headStyles: { fillColor: [20, 40, 55], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: PAGE_W - MARGIN * 2,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = ((state.doc as any).lastAutoTable?.finalY as number) || getY(state);
  syncY(state, finalY + 5);
  startTwoColumn(state);
}

/**
 * In-column equation — Times typography matching section headings (no colored panel).
 * Renders once from structured data; never dumps Unicode formula as body text.
 */
async function drawInColumnEquation(state: ColState, eq: SurveyEquation) {
  const ascii =
    eq.plaintext
      .replace(/[ᵢⱼ⁽⁾ᵏ⁺⁻₁₂√‖∫Σ∑θγλ]/g, "")
      .replace(/\s+/g, " ")
      .trim() || eq.display;

  writeGap(state, 2.5);
  // Same type family/weight rhythm as subsection headings
  writeLines(state, `(${eq.number}) ${eq.label}`, { bold: true, size: 9, align: "center", lineH: 3.8 });
  writeGap(state, 1);

  try {
    const svg = eq.svg;
    if (svg) {
      const { dataUrl, width, height } = await svgToPngDataUrl(svg, 2);
      const maxW = colWidth(state) - 2;
      const aspect = height / Math.max(width, 1);
      let imgW = maxW;
      let imgH = imgW * aspect;
      if (imgH > 26) {
        imgH = 26;
        imgW = Math.min(maxW, imgH / aspect);
      }
      ensure(state, imgH + 8);
      const x = colX(state) + (colWidth(state) - imgW) / 2;
      const y = getY(state);
      state.doc.addImage(dataUrl, "PNG", x, y, imgW, imgH, undefined, "FAST");
      setY(state, y + imgH + 1.5);
    } else {
      writeLines(state, ascii, { italic: true, size: 9, align: "center", lineH: 3.8 });
    }
  } catch {
    writeLines(state, ascii, { italic: true, size: 9, align: "center", lineH: 3.8 });
  }

  writeLines(state, eq.description, { italic: true, size: 8, lineH: 3.3 });
  writeGap(state, 2);
}

export async function paperToPdfBlob(paper: SurveyPaper): Promise<Blob> {
  const ieee = paper.template === "ieee" || !paper.template;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const state: ColState = { doc, col: 0, y0: TOP + 2, y1: TOP + 2, twoCol: false };

  // ---- Front matter (full width, Times) ----
  setTimes(doc, "bold", 16);
  const titleLines = doc.splitTextToSize(paper.title, PAGE_W - MARGIN * 2) as string[];
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, state.y0, { align: "center" });
    state.y0 += 7;
  }
  state.y0 += 2;
  setTimes(doc, "normal", 11);
  doc.text(paper.authorsPlaceholder, PAGE_W / 2, state.y0, { align: "center" });
  state.y0 += 8;
  syncY(state, state.y0);

  setTimes(doc, "bold", 9);
  const absLabel = "Abstract—";
  const absLabelW = doc.getTextWidth(absLabel);
  doc.text(absLabel, MARGIN, state.y0);
  setTimes(doc, "normal", 9);
  const absRest = doc.splitTextToSize(paper.abstract, PAGE_W - MARGIN * 2 - absLabelW) as string[];
  if (absRest.length) {
    doc.text(absRest[0], MARGIN + absLabelW, state.y0);
    state.y0 += 4;
    for (let i = 1; i < absRest.length; i++) {
      doc.text(absRest[i], MARGIN, state.y0);
      state.y0 += 4;
    }
  }
  state.y0 += 3;
  setTimes(doc, "italic", 8.5);
  const kw = doc.splitTextToSize(`Index Terms—${paper.keywords.join(", ")}.`, PAGE_W - MARGIN * 2) as string[];
  for (const line of kw) {
    doc.text(line, MARGIN, state.y0);
    state.y0 += 3.6;
  }
  state.y0 += 3;
  syncY(state, state.y0);

  if (paper.contributions?.length) {
    writeLines(state, "Contributions:", { bold: true, size: 9 });
    paper.contributions.forEach((c, i) => writeLines(state, `${i + 1}) ${c}`, { size: 8.5, lineH: 3.6 }));
    writeGap(state, 3);
  }

  startTwoColumn(state);

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
      writeGap(state, 2.5);
      writeLines(state, `${label}. ${section.heading.toUpperCase()}`, { bold: true, size: 10, lineH: 4.4 });
      writeGap(state, 1.2);
    } else {
      writeGap(state, 1.8);
      writeLines(state, section.heading, { bold: true, italic: true, size: 9, lineH: 3.9 });
      writeGap(state, 0.8);
    }

    const prose = proseWithoutEquations(section.content, equations);
    for (const para of prose.split(/\n{2,}/)) {
      const t = para.trim();
      if (!t) continue;
      writeLines(state, t, { size: 9, lineH: 3.9 });
      writeGap(state, 1.4);
    }

    const sectionEqs = equations.filter((e) => e.sectionId === section.id);
    for (const eq of sectionEqs) {
      await drawInColumnEquation(state, eq);
    }

    for (const fig of figures) {
      if (usedFigs.has(fig.id)) continue;
      if (figureKindToSection(fig.kind) !== section.id) continue;
      usedFigs.add(fig.id);
      figNum++;
      await drawFullWidthFigure(state, fig, figNum);
    }

    for (const table of tables) {
      if (usedTables.has(table.id)) continue;
      if (tableKindToSection(table.kind) !== section.id) continue;
      usedTables.add(table.id);
      tblNum++;
      drawFullWidthTable(state, table, tblNum);
    }
  }

  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    figNum++;
    await drawFullWidthFigure(state, fig, figNum);
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    tblNum++;
    drawFullWidthTable(state, table, tblNum);
  }

  writeGap(state, 3);
  writeLines(state, "REFERENCES", { bold: true, size: 10 });
  writeGap(state, 1.5);
  for (const ref of paper.references) {
    writeLines(state, ref.text, { size: 8, lineH: 3.4 });
    writeGap(state, 1);
  }

  return doc.output("blob");
}
