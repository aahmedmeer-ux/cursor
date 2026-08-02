import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SurveyEquation, SurveyFigure, SurveyPaper, SurveyTable } from "./types";
import { svgToPngDataUrl } from "./export-raster-node";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const GUTTER = 7;
const COL_W = (PAGE_W - MARGIN * 2 - GUTTER) / 2;
const BOTTOM = PAGE_H - MARGIN;
const TOP = MARGIN;
const FULL_W = PAGE_W - MARGIN * 2;
const LEFT_X = MARGIN;
const RIGHT_X = MARGIN + COL_W + GUTTER;
const BODY = 9;
const LINE = 3.9;

type ColState = {
  doc: jsPDF;
  y: number;
  col: "left" | "right";
  pageTop: number;
};

type InlineBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "eq"; eq: SurveyEquation };

type FloatBlock =
  | { type: "figure"; fig: SurveyFigure; num: number }
  | { type: "table"; table: SurveyTable; num: number };

type StreamItem = { kind: "inline"; block: InlineBlock } | { kind: "float"; float: FloatBlock };

function setTimes(doc: jsPDF, style: "normal" | "bold" | "italic" | "bolditalic", size: number) {
  doc.setFont("times", style);
  doc.setFontSize(size);
}

function equationAscii(eq: SurveyEquation): string {
  return (
    eq.plaintext.replace(/[ᵢⱼ⁽⁾ᵏ⁺⁻₁₂√‖∫Σ∑θγλ]/g, "").replace(/\s+/g, " ").trim() ||
    eq.display.replace(/\s+/g, " ").trim()
  );
}

function measureEq(doc: jsPDF, eq: SurveyEquation, width: number): number {
  // Times text only — no SVG panel (avoids gray equation backgrounds in PDF)
  setTimes(doc, "italic", 9);
  const asciiH = (doc.splitTextToSize(equationAscii(eq), width) as string[]).length * 3.8;
  setTimes(doc, "italic", 8);
  const descH = (doc.splitTextToSize(eq.description, width) as string[]).length * 3.3;
  return 2 + 4.2 + asciiH + descH + 2;
}

async function writeEquation(doc: jsPDF, eq: SurveyEquation, x: number, y: number, width: number): Promise<number> {
  y += 2;
  setTimes(doc, "bold", 9);
  doc.text(`(${eq.number}) ${eq.label}`, x + width / 2, y, { align: "center" });
  y += 4.2;

  setTimes(doc, "italic", 9);
  for (const line of doc.splitTextToSize(equationAscii(eq), width) as string[]) {
    doc.text(line, x + width / 2, y, { align: "center" });
    y += 3.8;
  }

  setTimes(doc, "italic", 8);
  for (const line of doc.splitTextToSize(eq.description, width) as string[]) {
    doc.text(line, x, y);
    y += 3.3;
  }
  return y + 2;
}

type Atom =
  | {
      kind: "line";
      text: string;
      height: number;
      fontSize: number;
      style: "normal" | "bold" | "italic" | "bolditalic";
    }
  | { kind: "eq"; eq: SurveyEquation; height: number };

async function blockToAtoms(doc: jsPDF, block: InlineBlock): Promise<Atom[]> {
  if (block.type === "h1") {
    setTimes(doc, "bold", 10);
    const lines = doc.splitTextToSize(block.text, COL_W) as string[];
    return lines.map((text, i) => ({
      kind: "line" as const,
      text,
      height: (i === 0 ? 2.2 : 0) + 4.4 + (i === lines.length - 1 ? 1 : 0),
      fontSize: 10,
      style: "bold" as const,
    }));
  }
  if (block.type === "h2") {
    setTimes(doc, "bolditalic", 9);
    const lines = doc.splitTextToSize(block.text, COL_W) as string[];
    return lines.map((text, i) => ({
      kind: "line" as const,
      text,
      height: (i === 0 ? 1.6 : 0) + 3.9 + (i === lines.length - 1 ? 0.7 : 0),
      fontSize: 9,
      style: "bolditalic" as const,
    }));
  }
  if (block.type === "p") {
    setTimes(doc, "normal", BODY);
    const lines = doc.splitTextToSize(block.text, COL_W) as string[];
    return lines.map((text, i) => ({
      kind: "line" as const,
      text,
      height: LINE + (i === lines.length - 1 ? 1.2 : 0),
      fontSize: BODY,
      style: "normal" as const,
    }));
  }
  return [{ kind: "eq", eq: block.eq, height: measureEq(doc, block.eq, COL_W) }];
}

async function paintAtoms(doc: jsPDF, atoms: Atom[], x: number, y0: number, width: number): Promise<number> {
  let y = y0;
  for (const a of atoms) {
    if (a.kind === "eq") {
      y = await writeEquation(doc, a.eq, x, y, width);
      continue;
    }
    const pad = a.style === "bold" ? 2.2 : a.style === "bolditalic" ? 1.6 : 0;
    // Only apply pad when this atom's height includes it (first heading line)
    const usePad = pad > 0 && a.height > (a.fontSize >= 10 ? 4.4 : 3.9) + 0.05;
    setTimes(doc, a.style, a.fontSize);
    doc.text(a.text, x, y + (usePad ? pad : 0));
    y += a.height;
  }
  return y;
}

function bestSplit(heights: number[], colH: number, atoms?: Atom[]): number {
  if (heights.length <= 1) return heights.length;
  const total = heights.reduce((a, b) => a + b, 0);
  let best = Math.max(1, Math.floor(heights.length / 2));
  let bestScore = Infinity;
  let acc = 0;
  for (let s = 1; s < heights.length; s++) {
    acc += heights[s - 1];
    const l = acc;
    const r = total - acc;
    const overflow = Math.max(0, l - colH) + Math.max(0, r - colH);
    // Avoid leaving a heading alone at the bottom of the left column
    let orphan = 0;
    if (atoms) {
      const leftLast = atoms[s - 1];
      const rightFirst = atoms[s];
      if (
        leftLast?.kind === "line" &&
        (leftLast.style === "bold" || leftLast.style === "bolditalic") &&
        rightFirst?.kind === "line" &&
        rightFirst.style === "normal"
      ) {
        orphan = 40;
      }
    }
    // Equal bottoms first; penalize left running much longer than right
    const score = Math.abs(l - r) + overflow * 8000 + orphan + (l > r ? (l - r) * 0.35 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

/**
 * Newspaper two-column flow:
 * - Non-final pages: fill left to bottom, then right to bottom (no hollow bottoms).
 * - Final page: height-balance the leftover so both columns end together.
 */
async function writeAtomsTwoCol(doc: jsPDF, state: ColState, atomsIn: Atom[]) {
  if (!atomsIn.length) return;
  const atoms = atomsIn.slice();
  const sum = (arr: Atom[]) => arr.reduce((s, a) => s + a.height, 0);

  while (atoms.length) {
    if (state.y > BOTTOM - 24) {
      doc.addPage();
      state.y = TOP;
      state.pageTop = TOP;
      state.col = "left";
    }
    const pageTop = state.y;
    state.pageTop = pageTop;
    const colH = BOTTOM - pageTop;
    const totalLeft = sum(atoms);

    // Short remainder → full width (avoids empty right column)
    if (totalLeft <= colH + 2) {
      state.y = await paintAtoms(doc, atoms.splice(0, atoms.length), MARGIN, pageTop, FULL_W);
      state.col = "left";
      break;
    }

    // Enough for one more full page (both columns)? Use newspaper fill.
    const hasFullPage = totalLeft >= colH * 2 - 4;

    if (hasFullPage) {
      const left: Atom[] = [];
      while (atoms.length && sum(left) + atoms[0].height <= colH + 0.8) {
        left.push(atoms.shift()!);
      }
      // Avoid orphan heading at end of left
      if (
        left.length > 1 &&
        atoms.length &&
        left[left.length - 1].kind === "line" &&
        (left[left.length - 1] as Extract<Atom, { kind: "line" }>).style !== "normal"
      ) {
        atoms.unshift(left.pop()!);
      }

      const right: Atom[] = [];
      while (atoms.length && sum(right) + atoms[0].height <= colH + 0.8) {
        right.push(atoms.shift()!);
      }

      const yL = await paintAtoms(doc, left, LEFT_X, pageTop, COL_W);
      const yR = await paintAtoms(doc, right, RIGHT_X, pageTop, COL_W);
      state.y = Math.max(yL, yR);
      state.col = "right";

      if (atoms.length) {
        doc.addPage();
        state.y = TOP;
        state.pageTop = TOP;
        state.col = "left";
      }
      continue;
    }

    // Final partial page → balance leftover across both columns
    const page = atoms.splice(0, atoms.length);
    let split = bestSplit(
      page.map((a) => a.height),
      colH,
      page
    );
    while (split > 1 && sum(page.slice(0, split)) > colH + 2) split--;
    while (split < page.length && sum(page.slice(split)) > colH + 2) split++;

    const yL = await paintAtoms(doc, page.slice(0, split), LEFT_X, pageTop, COL_W);
    const yR = await paintAtoms(doc, page.slice(split), RIGHT_X, pageTop, COL_W);
    state.y = Math.max(yL, yR);
    state.col = "right";
    break;
  }
}

async function drawFigure(doc: jsPDF, state: ColState, fig: SurveyFigure, index: number) {
  state.col = "left";
  state.pageTop = state.y;

  // Reserve space for title + caption; shrink image to fit leftover band when possible
  const chrome = 18; // title + caption approx
  let remain = BOTTOM - state.y;
  if (remain < 50) {
    doc.addPage();
    state.y = TOP;
    state.pageTop = TOP;
    remain = BOTTOM - state.y;
  }

  setTimes(doc, "bold", 9);
  doc.text(`Fig. ${index}. ${fig.title}.`, PAGE_W / 2, state.y, { align: "center" });
  state.y += 5;

  try {
    const { dataUrl, width, height } = await svgToPngDataUrl(fig.svg, 2);
    const maxW = FULL_W;
    const aspect = height / Math.max(width, 1);
    const maxImgH = Math.min(100, Math.max(36, BOTTOM - state.y - chrome));
    let imgW = maxW;
    let imgH = imgW * aspect;
    if (imgH > maxImgH) {
      imgH = maxImgH;
      imgW = Math.min(maxW, imgH / aspect);
    }
    // If even a compact figure won't fit, move to next page at full size
    if (state.y + imgH + 12 > BOTTOM + 0.5) {
      doc.addPage();
      state.y = TOP + 2;
      state.pageTop = TOP;
      setTimes(doc, "bold", 9);
      doc.text(`Fig. ${index}. ${fig.title}.`, PAGE_W / 2, state.y, { align: "center" });
      state.y += 5;
      imgW = maxW;
      imgH = imgW * aspect;
      if (imgH > 100) {
        imgH = 100;
        imgW = imgH / aspect;
      }
    }
    const x = MARGIN + (maxW - imgW) / 2;
    doc.addImage(dataUrl, "PNG", x, state.y, imgW, imgH, undefined, "FAST");
    state.y += imgH + 3;
    setTimes(doc, "italic", 8);
    for (const line of doc.splitTextToSize(fig.caption, maxW) as string[]) {
      if (state.y > BOTTOM - 4) {
        doc.addPage();
        state.y = TOP;
      }
      doc.text(line, PAGE_W / 2, state.y, { align: "center" });
      state.y += 3.5;
    }
    state.y += 4;
  } catch (err) {
    setTimes(doc, "italic", 8);
    doc.text(`[Figure unavailable: ${fig.title}]`, PAGE_W / 2, state.y, { align: "center" });
    state.y += 6;
    for (const line of doc.splitTextToSize(fig.caption, FULL_W) as string[]) {
      doc.text(line, PAGE_W / 2, state.y, { align: "center" });
      state.y += 3.5;
    }
    state.y += 4;
    console.error("PDF figure raster failed:", fig.id, err);
  }
  state.pageTop = state.y;
  state.col = "left";
}

function drawTable(doc: jsPDF, state: ColState, table: SurveyTable, index: number) {
  if (state.y > BOTTOM - 45) {
    doc.addPage();
    state.y = TOP;
  }
  state.col = "left";
  state.pageTop = state.y;

  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const roman = romans[index - 1] ?? String(index);
  setTimes(doc, "bold", 9);
  doc.text(`TABLE ${roman}`, PAGE_W / 2, state.y, { align: "center" });
  state.y += 4;
  setTimes(doc, "bold", 8.5);
  for (const line of doc.splitTextToSize(table.title, FULL_W) as string[]) {
    doc.text(line, PAGE_W / 2, state.y, { align: "center" });
    state.y += 3.6;
  }
  setTimes(doc, "italic", 8);
  for (const line of doc.splitTextToSize(table.caption, FULL_W) as string[]) {
    doc.text(line, PAGE_W / 2, state.y, { align: "center" });
    state.y += 3.4;
  }
  state.y += 2;

  autoTable(doc, {
    startY: state.y,
    head: [table.headers],
    body: table.rows,
    styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak", font: "times", valign: "top" },
    headStyles: { fillColor: [20, 40, 55], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: FULL_W,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state.y = (((doc as any).lastAutoTable?.finalY as number) || state.y) + 5;
  state.pageTop = state.y;
  state.col = "left";
}

function sectionLabel(index: number, ieee: boolean): string {
  if (!ieee) return `${index + 1}.`;
  const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];
  return romans[index] ?? `${index + 1}.`;
}

function figureKindToSection(kind: SurveyFigure["kind"]): string {
  switch (kind) {
    case "problem":
      return "related-surveys";
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

/**
 * Layout strategy that eliminates hollow column bottoms:
 * 1) Write ALL body text first in height-balanced two-column pages
 * 2) Pack figures/tables densely afterward (multiple per page when they fit)
 *
 * Interleaving floats mid-text was leaving half-empty pages whenever a section
 * boundary didn't supply enough copy to fill both columns.
 */
async function layoutStream(doc: jsPDF, state: ColState, stream: StreamItem[]) {
  const textAtoms: Atom[] = [];
  const floats: FloatBlock[] = [];

  for (const item of stream) {
    if (item.kind === "inline") {
      textAtoms.push(...(await blockToAtoms(doc, item.block)));
    } else {
      floats.push(item.float);
    }
  }

  await writeAtomsTwoCol(doc, state, textAtoms);

  // Prefer packing floats under leftover space on the last text page.
  // Only break to a new page when there truly isn't room for a compact float.
  if (floats.length && BOTTOM - state.y < 55) {
    doc.addPage();
    state.y = TOP;
    state.pageTop = TOP;
    state.col = "left";
  }

  for (const f of floats) {
    if (f.type === "figure") await drawFigure(doc, state, f.fig, f.num);
    else drawTable(doc, state, f.table, f.num);
  }
}

export async function paperToPdfBlob(paper: SurveyPaper): Promise<Blob> {
  const ieee = paper.template === "ieee" || !paper.template;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const state: ColState = { doc, y: TOP + 2, col: "left", pageTop: TOP + 2 };

  setTimes(doc, "bold", 16);
  for (const line of doc.splitTextToSize(paper.title, FULL_W) as string[]) {
    doc.text(line, PAGE_W / 2, state.y, { align: "center" });
    state.y += 7;
  }
  state.y += 2;
  setTimes(doc, "normal", 11);
  doc.text(paper.authorsPlaceholder, PAGE_W / 2, state.y, { align: "center" });
  state.y += 8;

  setTimes(doc, "bold", 9);
  const absLabel = "Abstract—";
  const absLabelW = doc.getTextWidth(absLabel);
  doc.text(absLabel, MARGIN, state.y);
  setTimes(doc, "normal", 9);
  const absRest = doc.splitTextToSize(paper.abstract, FULL_W - absLabelW) as string[];
  if (absRest.length) {
    doc.text(absRest[0], MARGIN + absLabelW, state.y);
    state.y += 4;
    for (let i = 1; i < absRest.length; i++) {
      doc.text(absRest[i], MARGIN, state.y);
      state.y += 4;
    }
  }
  state.y += 3;
  setTimes(doc, "italic", 8.5);
  for (const line of doc.splitTextToSize(`Index Terms—${paper.keywords.join(", ")}.`, FULL_W) as string[]) {
    doc.text(line, MARGIN, state.y);
    state.y += 3.6;
  }
  state.y += 3;

  if (paper.contributions?.length) {
    setTimes(doc, "bold", 9);
    doc.text("Contributions:", MARGIN, state.y);
    state.y += 4;
    setTimes(doc, "normal", 8.5);
    for (let i = 0; i < paper.contributions.length; i++) {
      for (const line of doc.splitTextToSize(`${i + 1}) ${paper.contributions[i]}`, FULL_W) as string[]) {
        doc.text(line, MARGIN, state.y);
        state.y += 3.6;
      }
    }
    state.y += 3;
  }

  state.pageTop = state.y;
  state.col = "left";

  const figures = paper.figures ?? [];
  const tables = paper.tables ?? [];
  const equations = paper.equations ?? [];
  const usedFigs = new Set<string>();
  const usedTables = new Set<string>();
  let figNum = 0;
  let tblNum = 0;
  let major = 0;

  const stream: StreamItem[] = [];

  for (const section of paper.sections) {
    if (section.level === 1) {
      const label = sectionLabel(major, ieee);
      major++;
      stream.push({ kind: "inline", block: { type: "h1", text: `${label}. ${section.heading.toUpperCase()}` } });
    } else {
      stream.push({ kind: "inline", block: { type: "h2", text: section.heading } });
    }

    const prose = proseWithoutEquations(section.content, equations);
    for (const para of prose.split(/\n{2,}/)) {
      const t = para.trim();
      if (t) stream.push({ kind: "inline", block: { type: "p", text: t } });
    }
    for (const eq of equations.filter((e) => e.sectionId === section.id)) {
      stream.push({ kind: "inline", block: { type: "eq", eq } });
    }

    for (const fig of figures) {
      if (usedFigs.has(fig.id)) continue;
      if (figureKindToSection(fig.kind) !== section.id) continue;
      usedFigs.add(fig.id);
      figNum++;
      stream.push({ kind: "float", float: { type: "figure", fig, num: figNum } });
    }
    for (const table of tables) {
      if (usedTables.has(table.id)) continue;
      if (tableKindToSection(table.kind) !== section.id) continue;
      usedTables.add(table.id);
      tblNum++;
      stream.push({ kind: "float", float: { type: "table", table, num: tblNum } });
    }
  }

  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    figNum++;
    stream.push({ kind: "float", float: { type: "figure", fig, num: figNum } });
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    tblNum++;
    stream.push({ kind: "float", float: { type: "table", table, num: tblNum } });
  }

  await layoutStream(doc, state, stream);

  // References
  const refAtoms: Atom[] = [];
  for (const a of await blockToAtoms(doc, { type: "h1", text: "REFERENCES" })) refAtoms.push(a);
  for (const ref of paper.references) {
    for (const a of await blockToAtoms(doc, { type: "p", text: ref.text })) refAtoms.push(a);
  }
  await writeAtomsTwoCol(doc, state, refAtoms);

  return doc.output("blob");
}
