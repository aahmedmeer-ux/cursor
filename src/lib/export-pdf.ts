import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SurveyEquation, SurveyFigure, SurveyPaper, SurveyTable } from "./types";
import { renderEquationSvg } from "./equations";
import { svgToPngDataUrl } from "./export-raster-node";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const GUTTER = 9;
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

const SUB_MAP: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  i: "ᵢ",
  j: "ⱼ",
  k: "ₖ",
  n: "ₙ",
  s: "ₛ",
  t: "ₜ",
  x: "ₓ",
  a: "ₐ",
};

/** Journal-ready equation text: prefer Unicode display, never raw d_ij underscores. */
function equationDisplayText(eq: SurveyEquation): string {
  let s = (eq.display || "").trim();
  if (!s || (/_/.test(s) && !/[ᵢⱼₖₛ]/.test(s))) {
    s = (eq.plaintext || eq.latex || "").trim();
  }
  s = s
    .replace(/_\{([^}]+)\}/g, (_, g: string) =>
      [...g].map((ch) => SUB_MAP[ch] || SUB_MAP[ch.toLowerCase()] || ch).join("")
    )
    .replace(/_([a-zA-Z0-9])/g, (_, ch: string) => SUB_MAP[ch] || SUB_MAP[ch.toLowerCase()] || ch)
    .replace(/\^\{([^}]+)\}/g, "^($1)")
    .replace(/\^([0-9+−-]+)/g, "^($1)")
    .replace(/\\\|/g, "‖")
    .replace(/\\leq/g, "≤")
    .replace(/\\int/g, "∫")
    .replace(/\s+/g, " ")
    .trim();
  return s || eq.plaintext || eq.label;
}

/**
 * Soft-break ONLY pathological long tokens (DOIs/URLs/unbroken strings).
 * Do not inject spaces into normal hyphenated prose — that creates rivers/gaps.
 */
function softBreakLongTokens(text: string, every = 40): string {
  const cleaned = text
    .replace(/\b10\.\s+(\d)/g, "10.$1")
    .replace(/\/\s+(?=[A-Za-z0-9])/g, "/")
    .replace(/\bdoi:\s*10\.\s+/gi, "doi: 10.")
    .replace(/\s{2,}/g, " ");

  return cleaned
    .split(/(\s+)/)
    .map((tok) => {
      if (/^\s+$/.test(tok)) return tok;
      const isDoi =
        /^https?:\/\//i.test(tok) ||
        /^10\.\d{4,}/.test(tok) ||
        /^doi:/i.test(tok) ||
        /doi\.org/i.test(tok);
      if (isDoi) {
        if (tok.length <= 56) return tok;
        return tok.replace(/\//g, "/ ");
      }
      if (tok.length <= every) return tok;
      // Pathological unbroken token only
      return tok.replace(new RegExp(`(.{${every}})`, "g"), "$1 ");
    })
    .join("");
}

function measureEq(doc: jsPDF, eq: SurveyEquation, width: number): number {
  setTimes(doc, "italic", 8);
  const descH = (doc.splitTextToSize(eq.description, width) as string[]).length * 3.2;
  // Keep estimate close to real paint height to avoid column holes
  const formulaH = (eq.display || eq.plaintext || "").length > 54 ? 18 : 14;
  return 2 + 4.6 + formulaH + 1.2 + descH + 2;
}

async function writeEquation(doc: jsPDF, eq: SurveyEquation, x: number, y: number, width: number): Promise<number> {
  y += 1.2;
  setTimes(doc, "bold", 9);
  doc.text(`(${eq.number}) ${eq.label}`, x + width / 2, y, { align: "center" });
  y += 4.2;

  let drewSvg = false;
  try {
    const svg = renderEquationSvg(eq);
    const { dataUrl, width: iw, height: ih } = await svgToPngDataUrl(svg, 2.8);
    const aspect = ih / Math.max(iw, 1);
    let imgW = Math.min(width - 0.5, 84);
    let imgH = imgW * aspect;
    const maxH = (eq.display || eq.plaintext || "").length > 54 ? 22 : 18;
    if (imgH > maxH) {
      imgH = maxH;
      imgW = Math.min(width - 0.5, imgH / Math.max(aspect, 0.01));
    }
    if (imgH < 13) {
      imgH = 13;
      imgW = Math.min(width - 0.5, imgH / Math.max(aspect, 0.01));
    }
    if (imgW >= 28) {
      doc.addImage(dataUrl, "PNG", x + (width - imgW) / 2, y - 0.5, imgW, imgH, undefined, "FAST");
      y += imgH + 2;
      drewSvg = true;
    }
  } catch {
    drewSvg = false;
  }
  if (!drewSvg) {
    const fallback = equationDisplayText(eq)
      .replace(/ᵢ/g, "i")
      .replace(/ⱼ/g, "j")
      .replace(/ₖ/g, "k")
      .replace(/ₛ/g, "s")
      .replace(/ₙ/g, "n")
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (ch) => {
        const idx = "₀₁₂₃₄₅₆₇₈₉".indexOf(ch);
        return idx >= 0 ? String(idx) : ch;
      })
      .replace(/[⁽⁾ᵏ⁺⁻ᴺ]/g, "")
      .replace(/‖/g, "||")
      .replace(/∫/g, "int ")
      .replace(/≤/g, "<=")
      .replace(/·/g, "*")
      .replace(/_/g, "");
    setTimes(doc, "italic", 10);
    for (const line of doc.splitTextToSize(fallback, width) as string[]) {
      doc.text(line, x + width / 2, y, { align: "center", maxWidth: width });
      y += 4.4;
    }
  }

  y += 1;
  setTimes(doc, "italic", 8);
  for (const line of doc.splitTextToSize(eq.description, width) as string[]) {
    doc.text(line, x, y, { maxWidth: width });
    y += 3.2;
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

function isHeadingAtom(a: Atom | undefined): boolean {
  return !!a && a.kind === "line" && (a.style === "bold" || a.style === "bolditalic");
}

async function blockToAtoms(doc: jsPDF, block: InlineBlock): Promise<Atom[]> {
  if (block.type === "h1") {
    setTimes(doc, "bold", 10);
    const lines = doc.splitTextToSize(block.text, COL_W - 0.8) as string[];
    return lines.map((text, i) => ({
      kind: "line" as const,
      text,
      height: (i === 0 ? 2.4 : 0) + 4.2 + (i === lines.length - 1 ? 0.8 : 0),
      fontSize: 10,
      style: "bold" as const,
    }));
  }
  if (block.type === "h2") {
    setTimes(doc, "bolditalic", 9);
    const lines = doc.splitTextToSize(block.text, COL_W - 0.8) as string[];
    return lines.map((text, i) => ({
      kind: "line" as const,
      text,
      height: (i === 0 ? 1.8 : 0) + 3.8 + (i === lines.length - 1 ? 0.6 : 0),
      fontSize: 9,
      style: "bolditalic" as const,
    }));
  }
  if (block.type === "p") {
    setTimes(doc, "normal", BODY);
    // Force bullet items onto their own visual lines (avoid mid-sentence • clumps)
    const normalized = block.text
      .replace(/\u200b/g, "")
      .replace(/\s*•\s*/g, "\n• ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const atoms: Atom[] = [];
    for (const chunk of normalized.split("\n")) {
      const piece = chunk.trim();
      if (!piece) continue;
      const safe = softBreakLongTokens(piece);
      const lines = doc.splitTextToSize(safe, COL_W - 1.5) as string[];
      lines.forEach((text, i) => {
        atoms.push({
          kind: "line",
          text: text.replace(/\u200b/g, ""),
          height: LINE + (i === lines.length - 1 ? 0.9 : 0),
          fontSize: BODY,
          style: "normal",
        });
      });
    }
    return atoms;
  }
  return [{ kind: "eq", eq: block.eq, height: measureEq(doc, block.eq, COL_W) }];
}

async function paintAtoms(doc: jsPDF, atoms: Atom[], x: number, y0: number, width: number): Promise<number> {
  let y = y0;
  const maxW = Math.max(width - 1.5, 20);
  for (const a of atoms) {
    if (a.kind === "eq") {
      y = await writeEquation(doc, a.eq, x, y, width);
      continue;
    }
    const pad = a.style === "bold" ? 2.4 : a.style === "bolditalic" ? 1.8 : 0;
    const usePad = pad > 0 && a.height > (a.fontSize >= 10 ? 4.2 : 3.8) + 0.05;
    setTimes(doc, a.style, a.fontSize);
    const textY = y + (usePad ? pad : 0);
    const plain = a.text.replace(/\u200b/g, "").replace(/\b10\.\s+(\d)/g, "10.$1");
    // Always bound by maxWidth so glyphs never paint past the column edge
    const fitted = doc.splitTextToSize(softBreakLongTokens(plain), maxW) as string[];
    let yy = textY;
    for (const line of fitted) {
      const clipped = line.replace(/\u200b/g, "");
      // Do NOT pass maxWidth here — lines are pre-wrapped; maxWidth would re-wrap and overlap
      if (doc.getTextWidth(clipped) > maxW + 0.6) {
        const again = doc.splitTextToSize(clipped, maxW) as string[];
        for (const part of again) {
          doc.text(part, x, yy);
          yy += a.style === "normal" ? LINE : a.fontSize >= 10 ? 4.2 : 3.8;
        }
      } else {
        doc.text(clipped, x, yy);
        yy += a.style === "normal" ? LINE : a.fontSize >= 10 ? 4.2 : 3.8;
      }
    }
    y = yy + (a.style === "normal" ? 0.35 : 0.2);
  }
  return y;
}

/**
 * Fill one column to the bottom without holes:
 * - If an equation/heading won't fit, defer it and keep packing following text.
 * - Prevent orphan headings (heading with < 2 lines of room after it).
 */
async function fillColumnLive(
  doc: jsPDF,
  atoms: Atom[],
  x: number,
  yStart: number,
  width: number,
  yLimit: number
): Promise<number> {
  let y = yStart;
  const deferred: Atom[] = [];

  const fits = (a: Atom, at: number) => {
    if (a.kind === "eq") return at + a.height <= yLimit + 0.8;
    if (isHeadingAtom(a)) return at + a.height + LINE * 2.2 <= yLimit + 0.5;
    return at + Math.min(a.height, LINE) <= yLimit + 0.35;
  };

  while (atoms.length) {
    const a = atoms[0];
    if (!fits(a, y)) {
      // Defer blockers (eq / orphan heading) and try to keep packing text
      if (a.kind === "eq" || isHeadingAtom(a)) {
        deferred.push(atoms.shift()!);
        // Keep deferring consecutive headings/eqs, then resume with body text
        while (atoms.length && (atoms[0].kind === "eq" || isHeadingAtom(atoms[0]))) {
          deferred.push(atoms.shift()!);
        }
        if (!atoms.length || !fits(atoms[0], y)) break;
        continue;
      }
      break;
    }
    atoms.shift();
    y = await paintAtoms(doc, [a], x, y, width);
    // Hard stop if we painted past the limit (shouldn't, but clip cascade)
    if (y > yLimit + 1.5) break;
  }

  if (deferred.length) atoms.unshift(...deferred);
  return Math.min(y, yLimit + 0.5);
}

/**
 * Newspaper two-column flow with live fill (avoids estimate under-fill blanks):
 * - Non-final pages: fill left to bottom, then right to bottom.
 * - Final page: live-fill both columns too (balance by consumption, not pre-split).
 */
async function writeAtomsTwoCol(doc: jsPDF, state: ColState, atomsIn: Atom[]) {
  if (!atomsIn.length) return;
  const atoms = atomsIn.slice();
  const sum = (arr: Atom[]) => arr.reduce((s, a) => s + a.height, 0);

  while (atoms.length) {
    if (state.y > BOTTOM - 20) {
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
    if (totalLeft <= colH * 0.92) {
      state.y = await paintAtoms(doc, atoms.splice(0, atoms.length), MARGIN, pageTop, FULL_W);
      state.col = "left";
      break;
    }

    // Default: always live-fill both columns to the page bottom.
    // This removes the old "balanced split" path that left large blank bands.
    const yL = await fillColumnLive(doc, atoms, LEFT_X, pageTop, COL_W, BOTTOM);
    const yR = await fillColumnLive(doc, atoms, RIGHT_X, pageTop, COL_W, BOTTOM);
    state.y = Math.max(yL, yR);
    state.col = "right";

    if (atoms.length) {
      doc.addPage();
      state.y = TOP;
      state.pageTop = TOP;
      state.col = "left";
      continue;
    }
    break;
  }
}

async function drawFigure(doc: jsPDF, state: ColState, fig: SurveyFigure, index: number) {
  state.col = "left";
  state.pageTop = state.y;

  // Reserve space for title + caption; shrink image to fit leftover band when possible
  const chrome = 18; // title + caption approx
  let remain = BOTTOM - state.y;
  // Prefer packing under leftover space; only break when the band is truly too short
  const minBand = fig.kind === "venn" || fig.kind === "taxonomy" ? 95 : 42;
  if (remain < minBand) {
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
    // Venn / taxonomy maps need more height so labels stay readable inside shapes
    const kindCap = fig.kind === "venn" || fig.kind === "taxonomy" || fig.kind === "challenges" ? 125 : 88;
    const maxImgH = Math.min(kindCap, Math.max(36, BOTTOM - state.y - chrome));
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
      const cap = fig.kind === "venn" || fig.kind === "taxonomy" || fig.kind === "challenges" ? 145 : 100;
      if (imgH > cap) {
        imgH = cap;
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
    body: table.rows.map((row) => row.map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim())),
    styles: {
      fontSize: 6.5,
      cellPadding: 1.1,
      overflow: "linebreak",
      font: "times",
      valign: "top",
      minCellHeight: 5,
    },
    headStyles: { fillColor: [20, 40, 55], textColor: 255, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: FULL_W,
    showHead: "everyPage",
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
  if (floats.length && BOTTOM - state.y < 40) {
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
    const paras = prose
      .split(/\n{2,}/)
      .map((t) => t.trim())
      .filter(Boolean);
    const sectionEqs = equations.filter((e) => e.sectionId === section.id);
    // Place equations after the first paragraph so they don't strand under sparse tails
    let eqsPlaced = false;
    for (let i = 0; i < paras.length; i++) {
      stream.push({ kind: "inline", block: { type: "p", text: paras[i] } });
      if (!eqsPlaced && sectionEqs.length && i === 0) {
        for (const eq of sectionEqs) {
          stream.push({ kind: "inline", block: { type: "eq", eq } });
        }
        eqsPlaced = true;
      }
    }
    if (!eqsPlaced) {
      for (const eq of sectionEqs) {
        stream.push({ kind: "inline", block: { type: "eq", eq } });
      }
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
