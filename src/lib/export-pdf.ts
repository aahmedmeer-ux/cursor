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

function measureBlock(doc: jsPDF, block: InlineBlock, width: number): number {
  if (block.type === "h1") {
    setTimes(doc, "bold", 10);
    const lines = doc.splitTextToSize(block.text, width) as string[];
    return 2.5 + lines.length * 4.4 + 1.2;
  }
  if (block.type === "h2") {
    setTimes(doc, "bolditalic", 9);
    const lines = doc.splitTextToSize(block.text, width) as string[];
    return 1.8 + lines.length * 3.9 + 0.8;
  }
  if (block.type === "p") {
    setTimes(doc, "normal", 9);
    const lines = doc.splitTextToSize(block.text, width) as string[];
    return lines.length * 3.9 + 1.4;
  }
  // equation card estimate
  return 2.5 + 3.8 + 1 + 26 + 1.5 + estimateTextHeight(doc, block.eq.description, width, 8, 3.3) + 2;
}

function estimateTextHeight(doc: jsPDF, text: string, width: number, size: number, lineH: number): number {
  setTimes(doc, "italic", size);
  const lines = doc.splitTextToSize(text, width) as string[];
  return lines.length * lineH;
}

function writeBlockAt(
  doc: jsPDF,
  block: InlineBlock,
  x: number,
  yStart: number,
  width: number
): number {
  let y = yStart;
  if (block.type === "h1") {
    y += 2.5;
    setTimes(doc, "bold", 10);
    const lines = doc.splitTextToSize(block.text, width) as string[];
    for (const line of lines) {
      doc.text(line, x, y);
      y += 4.4;
    }
    y += 1.2;
    return y;
  }
  if (block.type === "h2") {
    y += 1.8;
    setTimes(doc, "bolditalic", 9);
    const lines = doc.splitTextToSize(block.text, width) as string[];
    for (const line of lines) {
      doc.text(line, x, y);
      y += 3.9;
    }
    y += 0.8;
    return y;
  }
  if (block.type === "p") {
    setTimes(doc, "normal", 9);
    const lines = doc.splitTextToSize(block.text, width) as string[];
    for (const line of lines) {
      doc.text(line, x, y);
      y += 3.9;
    }
    y += 1.4;
    return y;
  }
  return y; // eq drawn async separately
}

async function writeEquationAt(
  doc: jsPDF,
  eq: SurveyEquation,
  x: number,
  yStart: number,
  width: number
): Promise<number> {
  let y = yStart + 2.2;
  // Same Times family as subsection headings — no chrome / tinted band
  setTimes(doc, "bold", 9);
  const label = `(${eq.number}) ${eq.label}`;
  doc.text(label, x + width / 2, y, { align: "center" });
  y += 4.2;

  const ascii =
    eq.plaintext.replace(/[ᵢⱼ⁽⁾ᵏ⁺⁻₁₂√‖∫Σ∑θγλ]/g, "").replace(/\s+/g, " ").trim() ||
    eq.display;

  let drewImage = false;
  if (eq.svg) {
    try {
      const { dataUrl, width: iw, height: ih } = await svgToPngDataUrl(eq.svg, 2);
      const aspect = ih / Math.max(iw, 1);
      let imgW = width - 2;
      let imgH = imgW * aspect;
      if (imgH > 32) {
        imgH = 32;
        imgW = Math.min(width - 2, imgH / aspect);
      }
      const ix = x + (width - imgW) / 2;
      doc.addImage(dataUrl, "PNG", ix, y, imgW, imgH, undefined, "FAST");
      y += imgH + 1.2;
      drewImage = true;
    } catch {
      drewImage = false;
    }
  }
  if (!drewImage) {
    setTimes(doc, "italic", 9);
    const lines = doc.splitTextToSize(ascii, width) as string[];
    for (const line of lines) {
      doc.text(line, x + width / 2, y, { align: "center" });
      y += 3.8;
    }
  }

  setTimes(doc, "italic", 8);
  const descLines = doc.splitTextToSize(eq.description, width) as string[];
  for (const line of descLines) {
    doc.text(line, x, y);
    y += 3.3;
  }
  return y + 2;
}

/** Height of a block kept with the following paragraph/equation (avoid orphan headings). */
function packHeight(doc: jsPDF, blocks: InlineBlock[], i: number, width: number): number {
  const b = blocks[i];
  let h = measureBlock(doc, b, width);
  if ((b.type === "h1" || b.type === "h2") && i + 1 < blocks.length) {
    h += measureBlock(doc, blocks[i + 1], width);
  }
  // Keep equation with its preceding paragraph when possible
  if (b.type === "p" && i + 1 < blocks.length && blocks[i + 1].type === "eq") {
    h += measureBlock(doc, blocks[i + 1], width);
  }
  return h;
}

/**
 * Pack inline blocks with classic IEEE fill: left column top→bottom, then right.
 * Headings stay with the following block so section titles never orphan across columns.
 */
async function flushInlineRegion(doc: jsPDF, state: ColState, blocks: InlineBlock[]) {
  let idx = 0;
  while (idx < blocks.length) {
    if (state.y > BOTTOM - 28) {
      doc.addPage();
      state.y = TOP;
    }

    const pageTop = state.y;
    const avail = BOTTOM - pageTop;
    if (avail < 18) {
      doc.addPage();
      state.y = TOP;
      continue;
    }

    const leftBlocks: InlineBlock[] = [];
    const rightBlocks: InlineBlock[] = [];
    let leftH = 0;
    let rightH = 0;

    const tryPlace = (target: "left" | "right"): boolean => {
      if (idx >= blocks.length) return false;
      const b = blocks[idx];
      const hAlone = measureBlock(doc, b, COL_W);
      const hPack = packHeight(doc, blocks, idx, COL_W);
      const used = target === "left" ? leftH : rightH;
      const room = avail - used;
      const isHeading = b.type === "h1" || b.type === "h2";

      // Never orphan a section heading at the bottom of a column
      if (isHeading) {
        if (hPack > room + 0.8) return false;
      } else if (hAlone > room + 0.8) {
        return false;
      }

      if (target === "left") {
        leftBlocks.push(b);
        leftH += hAlone;
      } else {
        rightBlocks.push(b);
        rightH += hAlone;
      }
      idx++;

      // Pull the following block with a heading into the same column
      if (isHeading && idx < blocks.length) {
        const n = blocks[idx];
        const nh = measureBlock(doc, n, COL_W);
        if ((target === "left" ? leftH : rightH) + nh <= avail + 0.8) {
          if (target === "left") {
            leftBlocks.push(n);
            leftH += nh;
          } else {
            rightBlocks.push(n);
            rightH += nh;
          }
          idx++;
        }
      }
      return true;
    };

    // Strict newspaper fill: finish left, then right — never put later blocks back into left
    let filling: "left" | "right" = "left";
    while (idx < blocks.length) {
      if (filling === "left") {
        if (tryPlace("left")) continue;
        filling = "right";
        continue;
      }
      if (tryPlace("right")) continue;
      if (!leftBlocks.length && !rightBlocks.length) {
        leftBlocks.push(blocks[idx]);
        leftH += measureBlock(doc, blocks[idx], COL_W);
        idx++;
      }
      break;
    }

    // Final stretch of region: balance columns if right is empty but left is long
    if (idx >= blocks.length && rightBlocks.length === 0 && leftBlocks.length >= 5) {
      const totalH = leftH;
      if (totalH > avail * 0.62) {
        const move: InlineBlock[] = [];
        let moveH = 0;
        while (leftBlocks.length > 3) {
          const b = leftBlocks[leftBlocks.length - 1];
          // Don't move a heading without its following block
          if (b.type === "h1" || b.type === "h2") break;
          const h = measureBlock(doc, b, COL_W);
          if (moveH + h > totalH / 2) break;
          // Keep paragraph with preceding heading
          if (leftBlocks.length >= 2) {
            const prev = leftBlocks[leftBlocks.length - 2];
            if (prev.type === "h1" || prev.type === "h2") {
              const ph = measureBlock(doc, prev, COL_W);
              if (moveH + h + ph > totalH / 2) break;
              move.unshift(leftBlocks.pop()!);
              move.unshift(leftBlocks.pop()!);
              moveH += h + ph;
              leftH -= h + ph;
              continue;
            }
          }
          move.unshift(leftBlocks.pop()!);
          moveH += h;
          leftH -= h;
        }
        rightBlocks.push(...move);
        rightH = moveH;
      }
    }

    let yL = pageTop;
    for (const b of leftBlocks) {
      if (b.type === "eq") yL = await writeEquationAt(doc, b.eq, MARGIN, yL, COL_W);
      else yL = writeBlockAt(doc, b, MARGIN, yL, COL_W);
    }

    let yR = pageTop;
    const rightX = MARGIN + COL_W + GUTTER;
    for (const b of rightBlocks) {
      if (b.type === "eq") yR = await writeEquationAt(doc, b.eq, rightX, yR, COL_W);
      else yR = writeBlockAt(doc, b, rightX, yR, COL_W);
    }

    state.y = Math.max(yL, yR) + 3;

    if (idx < blocks.length) {
      doc.addPage();
      state.y = TOP;
    }
  }
}

async function drawFigure(doc: jsPDF, state: ColState, fig: SurveyFigure, index: number) {
  if (state.y > BOTTOM - 55) {
    doc.addPage();
    state.y = TOP;
  }
  setTimes(doc, "bold", 9);
  const title = `Fig. ${index}. ${fig.title}.`;
  doc.text(title, PAGE_W / 2, state.y, { align: "center" });
  state.y += 5;

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
    if (state.y + imgH + 12 > BOTTOM) {
      doc.addPage();
      state.y = TOP;
    }
    const x = MARGIN + (maxW - imgW) / 2;
    doc.addImage(dataUrl, "PNG", x, state.y, imgW, imgH, undefined, "FAST");
    state.y += imgH + 3;
    setTimes(doc, "italic", 8);
    const caps = doc.splitTextToSize(fig.caption, maxW) as string[];
    for (const line of caps) {
      doc.text(line, PAGE_W / 2, state.y, { align: "center" });
      state.y += 3.5;
    }
    state.y += 4;
  } catch {
    setTimes(doc, "italic", 8);
    doc.text(`[Figure: ${fig.title}]`, PAGE_W / 2, state.y, { align: "center" });
    state.y += 8;
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
  const titleLines = doc.splitTextToSize(table.title, PAGE_W - MARGIN * 2) as string[];
  for (const line of titleLines) {
    doc.text(line, PAGE_W / 2, state.y, { align: "center" });
    state.y += 3.6;
  }
  setTimes(doc, "italic", 8);
  const caps = doc.splitTextToSize(table.caption, PAGE_W - MARGIN * 2) as string[];
  for (const line of caps) {
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
    tableWidth: PAGE_W - MARGIN * 2,
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
    // Place after related-surveys so page-1 two-column body can fill before the float
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

  // ---- Front matter (full width, Times) ----
  setTimes(doc, "bold", 16);
  const titleLines = doc.splitTextToSize(paper.title, PAGE_W - MARGIN * 2) as string[];
  for (const line of titleLines) {
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
  const absRest = doc.splitTextToSize(paper.abstract, PAGE_W - MARGIN * 2 - absLabelW) as string[];
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
  const kw = doc.splitTextToSize(`Index Terms—${paper.keywords.join(", ")}.`, PAGE_W - MARGIN * 2) as string[];
  for (const line of kw) {
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
      const lines = doc.splitTextToSize(`${i + 1}) ${paper.contributions[i]}`, PAGE_W - MARGIN * 2) as string[];
      for (const line of lines) {
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

  // Build sequence of inline stretches separated by floats
  let inline: InlineBlock[] = [];

  const flushInline = async () => {
    if (!inline.length) return;
    await flushInlineRegion(doc, state, inline);
    inline = [];
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

    const sectionFloats: FloatBlock[] = [];
    for (const fig of figures) {
      if (usedFigs.has(fig.id)) continue;
      if (figureKindToSection(fig.kind) !== section.id) continue;
      usedFigs.add(fig.id);
      figNum++;
      sectionFloats.push({ type: "figure", fig, num: figNum });
    }
    for (const table of tables) {
      if (usedTables.has(table.id)) continue;
      if (tableKindToSection(table.kind) !== section.id) continue;
      usedTables.add(table.id);
      tblNum++;
      sectionFloats.push({ type: "table", table, num: tblNum });
    }

    if (sectionFloats.length) {
      await flushInline();
      for (const f of sectionFloats) {
        if (f.type === "figure") await drawFigure(doc, state, f.fig, f.num);
        else drawTable(doc, state, f.table, f.num);
      }
    }
  }

  await flushInline();

  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    figNum++;
    await drawFigure(doc, state, fig, figNum);
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    tblNum++;
    drawTable(doc, state, table, tblNum);
  }

  // References in two-column
  const refBlocks: InlineBlock[] = [{ type: "h1", text: "REFERENCES" }];
  for (const ref of paper.references) {
    refBlocks.push({ type: "p", text: ref.text });
  }
  await flushInlineRegion(doc, state, refBlocks);

  return doc.output("blob");
}
