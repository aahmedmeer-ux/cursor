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

type ColState = {
  doc: jsPDF;
  y: number;
};

type InlineBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "eq"; eq: SurveyEquation };

type FloatBlock =
  | { type: "figure"; fig: SurveyFigure; num: number }
  | { type: "table"; table: SurveyTable; num: number };

function setTimes(doc: jsPDF, style: "normal" | "bold" | "italic" | "bolditalic", size: number) {
  doc.setFont("times", style);
  doc.setFontSize(size);
}

function estimateBlock(doc: jsPDF, block: InlineBlock, width: number): number {
  if (block.type === "h1") {
    setTimes(doc, "bold", 10);
    return 2.2 + (doc.splitTextToSize(block.text, width) as string[]).length * 4.4 + 1;
  }
  if (block.type === "h2") {
    setTimes(doc, "bolditalic", 9);
    return 1.6 + (doc.splitTextToSize(block.text, width) as string[]).length * 3.9 + 0.7;
  }
  if (block.type === "p") {
    setTimes(doc, "normal", 9);
    return (doc.splitTextToSize(block.text, width) as string[]).length * 3.9 + 1.2;
  }
  setTimes(doc, "italic", 8);
  const descH = (doc.splitTextToSize(block.eq.description, width) as string[]).length * 3.3;
  return 2 + 4 + 18 + descH + 2;
}

async function writeBlock(
  doc: jsPDF,
  block: InlineBlock,
  x: number,
  yStart: number,
  width: number
): Promise<number> {
  let y = yStart;
  if (block.type === "h1") {
    y += 2.2;
    setTimes(doc, "bold", 10);
    for (const line of doc.splitTextToSize(block.text, width) as string[]) {
      doc.text(line, x, y);
      y += 4.4;
    }
    return y + 1;
  }
  if (block.type === "h2") {
    y += 1.6;
    setTimes(doc, "bolditalic", 9);
    for (const line of doc.splitTextToSize(block.text, width) as string[]) {
      doc.text(line, x, y);
      y += 3.9;
    }
    return y + 0.7;
  }
  if (block.type === "p") {
    setTimes(doc, "normal", 9);
    for (const line of doc.splitTextToSize(block.text, width) as string[]) {
      doc.text(line, x, y);
      y += 3.9;
    }
    return y + 1.2;
  }

  // Equation — Times label + formula image/plaintext + description
  y += 2;
  setTimes(doc, "bold", 9);
  doc.text(`(${block.eq.number}) ${block.eq.label}`, x + width / 2, y, { align: "center" });
  y += 4.2;

  const ascii =
    block.eq.plaintext.replace(/[ᵢⱼ⁽⁾ᵏ⁺⁻₁₂√‖∫Σ∑θγλ]/g, "").replace(/\s+/g, " ").trim() ||
    block.eq.display;

  let drew = false;
  if (block.eq.svg) {
    try {
      const { dataUrl, width: iw, height: ih } = await svgToPngDataUrl(block.eq.svg, 2);
      const aspect = ih / Math.max(iw, 1);
      let imgW = width - 2;
      let imgH = imgW * aspect;
      if (imgH > 28) {
        imgH = 28;
        imgW = Math.min(width - 2, imgH / aspect);
      }
      doc.addImage(dataUrl, "PNG", x + (width - imgW) / 2, y, imgW, imgH, undefined, "FAST");
      y += imgH + 1.2;
      drew = true;
    } catch {
      drew = false;
    }
  }
  if (!drew) {
    setTimes(doc, "italic", 9);
    for (const line of doc.splitTextToSize(ascii, width) as string[]) {
      doc.text(line, x + width / 2, y, { align: "center" });
      y += 3.8;
    }
  }

  setTimes(doc, "italic", 8);
  for (const line of doc.splitTextToSize(block.eq.description, width) as string[]) {
    doc.text(line, x, y);
    y += 3.3;
  }
  return y + 2;
}

/**
 * Continuous two-column writer: left→bottom, then right→bottom, then new page.
 * Uses live write positions so we don't leave mid-page voids from bad estimates.
 * Short trailing content before a float is written full-width to avoid empty right columns.
 */
async function flushInlineRegion(doc: jsPDF, state: ColState, blocks: InlineBlock[]) {
  if (!blocks.length) return;

  // If everything fits comfortably in one full-width column on this page, don't two-col it
  const pageTop0 = state.y > BOTTOM - 28 ? (doc.addPage(), (state.y = TOP), TOP) : state.y;
  const avail0 = BOTTOM - pageTop0;
  let totalEst = 0;
  for (const b of blocks) totalEst += estimateBlock(doc, b, FULL_W);
  if (totalEst <= avail0 - 2) {
    let y = pageTop0;
    for (const b of blocks) y = await writeBlock(doc, b, MARGIN, y, FULL_W);
    state.y = y + 3;
    return;
  }

  let idx = 0;
  while (idx < blocks.length) {
    if (state.y > BOTTOM - 24) {
      doc.addPage();
      state.y = TOP;
    }
    const pageTop = state.y;
    let yL = pageTop;
    let yR = pageTop;
    let col: 0 | 1 = 0;
    const rightX = MARGIN + COL_W + GUTTER;

    while (idx < blocks.length) {
      const b = blocks[idx];
      const alone = estimateBlock(doc, b, COL_W);
      // Keep heading + following block, and paragraph + following equation together
      let pack = alone;
      const next = idx + 1 < blocks.length ? blocks[idx + 1] : null;
      if ((b.type === "h1" || b.type === "h2") && next) pack += estimateBlock(doc, next, COL_W);
      if (b.type === "p" && next?.type === "eq") pack += estimateBlock(doc, next, COL_W);

      const yCur = col === 0 ? yL : yR;
      // Use pack size for fit decisions so we don't strand an equation at the top of the next column
      if (yCur + pack > BOTTOM + 0.5) {
        if (col === 0) {
          col = 1;
          continue;
        }
        break; // new page
      }

      if (col === 0) yL = await writeBlock(doc, b, MARGIN, yL, COL_W);
      else yR = await writeBlock(doc, b, rightX, yR, COL_W);
      idx++;

      // Immediately pull the packed follower into the same column
      if (next && idx < blocks.length && blocks[idx] === next) {
        const follow =
          ((b.type === "h1" || b.type === "h2") && next) ||
          (b.type === "p" && next.type === "eq");
        if (follow) {
          const yNow = col === 0 ? yL : yR;
          const nh = estimateBlock(doc, next, COL_W);
          if (yNow + nh <= BOTTOM + 0.5) {
            if (col === 0) yL = await writeBlock(doc, next, MARGIN, yL, COL_W);
            else yR = await writeBlock(doc, next, rightX, yR, COL_W);
            idx++;
          }
        }
      }
    }

    state.y = Math.max(yL, yR) + 2;

    if (idx < blocks.length) {
      doc.addPage();
      state.y = TOP;
    }
  }

  // Remainder: if leftover blocks are short, full-width; else continue two-col
  if (idx < blocks.length) {
    const rest = blocks.slice(idx);
    let est = 0;
    for (const b of rest) est += estimateBlock(doc, b, FULL_W);
    if (state.y > BOTTOM - 24) {
      doc.addPage();
      state.y = TOP;
    }
    if (est <= BOTTOM - state.y - 2 || rest.length <= 3) {
      let y = state.y;
      for (const b of rest) {
        if (y > BOTTOM - 20) {
          doc.addPage();
          y = TOP;
        }
        y = await writeBlock(doc, b, MARGIN, y, FULL_W);
      }
      state.y = y + 3;
    } else {
      await flushInlineRegion(doc, state, rest);
    }
  }
}

async function drawFigure(doc: jsPDF, state: ColState, fig: SurveyFigure, index: number) {
  // Prefer starting floats near top of a page when little room remains
  if (state.y > BOTTOM - 70) {
    doc.addPage();
    state.y = TOP;
  }

  setTimes(doc, "bold", 9);
  doc.text(`Fig. ${index}. ${fig.title}.`, PAGE_W / 2, state.y, { align: "center" });
  state.y += 5;

  try {
    const { dataUrl, width, height } = await svgToPngDataUrl(fig.svg, 2);
    const maxW = FULL_W;
    const aspect = height / Math.max(width, 1);
    let imgW = maxW;
    let imgH = imgW * aspect;
    if (imgH > 105) {
      imgH = 105;
      imgW = imgH / aspect;
    }
    if (state.y + imgH + 14 > BOTTOM) {
      doc.addPage();
      state.y = TOP + 2;
      setTimes(doc, "bold", 9);
      doc.text(`Fig. ${index}. ${fig.title}.`, PAGE_W / 2, state.y, { align: "center" });
      state.y += 5;
    }
    const x = MARGIN + (maxW - imgW) / 2;
    doc.addImage(dataUrl, "PNG", x, state.y, imgW, imgH, undefined, "FAST");
    state.y += imgH + 3;
    setTimes(doc, "italic", 8);
    for (const line of doc.splitTextToSize(fig.caption, maxW) as string[]) {
      doc.text(line, PAGE_W / 2, state.y, { align: "center" });
      state.y += 3.5;
    }
    state.y += 4;
  } catch (err) {
    // Last-resort: still show caption, no giant blank box
    setTimes(doc, "italic", 8);
    const msg = `[Figure unavailable: ${fig.title}]`;
    doc.text(msg, PAGE_W / 2, state.y, { align: "center" });
    state.y += 6;
    for (const line of doc.splitTextToSize(fig.caption, FULL_W) as string[]) {
      doc.text(line, PAGE_W / 2, state.y, { align: "center" });
      state.y += 3.5;
    }
    state.y += 4;
    console.error("PDF figure raster failed:", fig.id, err);
  }
}

function drawTable(doc: jsPDF, state: ColState, table: SurveyTable, index: number) {
  if (state.y > BOTTOM - 40) {
    doc.addPage();
    state.y = TOP;
  }
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

export async function paperToPdfBlob(paper: SurveyPaper): Promise<Blob> {
  const ieee = paper.template === "ieee" || !paper.template;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const state: ColState = { doc, y: TOP + 2 };

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

  const figures = paper.figures ?? [];
  const tables = paper.tables ?? [];
  const equations = paper.equations ?? [];
  const usedFigs = new Set<string>();
  const usedTables = new Set<string>();
  let figNum = 0;
  let tblNum = 0;
  let major = 0;

  let inline: InlineBlock[] = [];
  let pendingFloats: FloatBlock[] = [];

  const flush = async (forceFloats: boolean) => {
    if (inline.length) {
      await flushInlineRegion(doc, state, inline);
      inline = [];
    }
    if (forceFloats && pendingFloats.length) {
      for (const f of pendingFloats) {
        if (f.type === "figure") await drawFigure(doc, state, f.fig, f.num);
        else drawTable(doc, state, f.table, f.num);
      }
      pendingFloats = [];
    }
  };

  // Estimate whether current buffered inline text roughly fills the remaining page (2 cols)
  const inlineFillsPage = () => {
    const avail = Math.max(BOTTOM - state.y, 40);
    let est = 0;
    for (const b of inline) est += estimateBlock(doc, b, COL_W);
    return est >= avail * 1.6; // ~both columns
  };

  for (const section of paper.sections) {
    if (section.level === 1) {
      const label = sectionLabel(major, ieee);
      major++;
      inline.push({ type: "h1", text: `${label}. ${section.heading.toUpperCase()}` });
    } else {
      inline.push({ type: "h2", text: section.heading });
    }

    const prose = proseWithoutEquations(section.content, equations);
    for (const para of prose.split(/\n{2,}/)) {
      const t = para.trim();
      if (t) inline.push({ type: "p", text: t });
    }
    for (const eq of equations.filter((e) => e.sectionId === section.id)) {
      inline.push({ type: "eq", eq });
    }

    for (const fig of figures) {
      if (usedFigs.has(fig.id)) continue;
      if (figureKindToSection(fig.kind) !== section.id) continue;
      usedFigs.add(fig.id);
      figNum++;
      pendingFloats.push({ type: "figure", fig, num: figNum });
    }
    for (const table of tables) {
      if (usedTables.has(table.id)) continue;
      if (tableKindToSection(table.kind) !== section.id) continue;
      usedTables.add(table.id);
      tblNum++;
      pendingFloats.push({ type: "table", table, num: tblNum });
    }

    // Only interrupt for floats once we have enough text to fill the page,
    // or when the next sections won't add more body before another float cluster.
    if (pendingFloats.length && inlineFillsPage()) {
      await flush(true);
    }
  }

  await flush(true);

  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    figNum++;
    await drawFigure(doc, state, fig, figNum);
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    tblNum++;
    drawTable(doc, state, table, tblNum);
  }

  const refBlocks: InlineBlock[] = [{ type: "h1", text: "REFERENCES" }];
  for (const ref of paper.references) refBlocks.push({ type: "p", text: ref.text });
  await flushInlineRegion(doc, state, refBlocks);

  return doc.output("blob");
}
