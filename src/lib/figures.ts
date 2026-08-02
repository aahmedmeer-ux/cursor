import type { DiscoveredPaper, MatrixRow, SurveyFigure, SurveyTable } from "./types";
import { themeKeysForRow } from "./taxonomy";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLabel(text: string, max = 22): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > max) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export function taxonomyBuckets(rows: MatrixRow[]): Map<string, MatrixRow[]> {
  const map = new Map<string, MatrixRow[]>();
  for (const row of rows) {
    for (const key of themeKeysForRow(row)) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const list = map.get(label) ?? [];
      list.push(row);
      map.set(label, list);
    }
  }
  return new Map([...map.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8));
}

function shortMethod(row: MatrixRow): string {
  return (row.method || "Unspecified").split(/[.;]/)[0].slice(0, 42);
}

function shortGap(row: MatrixRow): string {
  return (row.gaps || "Not reported").split(/[.;]/)[0].slice(0, 70);
}

function shortFinding(row: MatrixRow): string {
  return (row.findings || "—").split(/[.;]/)[0].slice(0, 70);
}

/** Fig: Visual taxonomy tree */
export function buildTaxonomyFigure(rows: MatrixRow[], topic: string): SurveyFigure {
  const buckets = [...taxonomyBuckets(rows).entries()].slice(0, 6);
  const width = 900;
  const height = 460;
  const cx = width / 2;

  const rootLabel = escapeXml(topic.replace(/^A Survey of\s+/i, "").slice(0, 42));
  const midY = 180;
  const leafY = 320;

  // Mid-level: Research focus / Methods / Evaluation (generic high-impact branches)
  const branches = [
    { label: "Problem & Scope", x: 160 },
    { label: "Methods & Control", x: 450 },
    { label: "Evaluation & Gaps", x: 740 },
  ];

  const branchSvg = branches
    .map(
      (b) => `
      <line x1="${cx}" y1="95" x2="${b.x}" y2="${midY}" stroke="#1a6b7a" stroke-width="2.2"/>
      <rect x="${b.x - 78}" y="${midY - 18}" width="156" height="40" rx="8" fill="#0c1f2e"/>
      <text x="${b.x}" y="${midY + 6}" text-anchor="middle" fill="#f7fafb" font-size="12" font-family="Georgia,serif">${escapeXml(b.label)}</text>`
    )
    .join("");

  const leaves = buckets.map(([label, list], i) => {
    const x = 70 + i * 140;
    const parent = branches[i % branches.length];
    const lines = wrapLabel(label, 14);
    const text = lines
      .map(
        (ln, idx) =>
          `<text x="${x + 55}" y="${leafY + 22 + idx * 13}" text-anchor="middle" font-size="11" fill="#0c1f2e" font-family="Georgia,serif">${escapeXml(ln)}</text>`
      )
      .join("");
    return `
      <line x1="${parent.x}" y1="${midY + 22}" x2="${x + 55}" y2="${leafY}" stroke="#2a8fa1" stroke-width="1.6" opacity="0.7"/>
      <rect x="${x}" y="${leafY}" width="110" height="${34 + lines.length * 13}" rx="7" fill="#e8f1f4" stroke="#1a6b7a"/>
      ${text}
      <text x="${x + 55}" y="${leafY + 40 + lines.length * 13}" text-anchor="middle" font-size="10" fill="#5a6b75">n=${list.length}</text>`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="taxBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7fafb"/><stop offset="100%" stop-color="#dce9ee"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#taxBg)"/>
    <text x="24" y="28" font-size="15" fill="#0c1f2e" font-family="Georgia,serif">Taxonomy of the surveyed literature</text>
    <rect x="${cx - 150}" y="48" width="300" height="48" rx="10" fill="#1a6b7a"/>
    <text x="${cx}" y="78" text-anchor="middle" fill="#fff" font-size="14" font-family="Georgia,serif">${rootLabel}</text>
    ${branchSvg}
    ${leaves.join("")}
  </svg>`;

  return {
    id: "fig-taxonomy",
    title: "Field Taxonomy",
    caption:
      "Multi-level taxonomy organizing the synthesis matrix into problem/scope, methods/control, and evaluation/gap dimensions with leaf research clusters.",
    kind: "taxonomy",
    svg,
  };
}

/** Fig: Problem illustration diagram */
export function buildProblemFigure(topic: string, rows: MatrixRow[]): SurveyFigure {
  const field = topic.replace(/^A Survey of\s+/i, "") || "Target system";
  const width = 900;
  const height = 420;

  const inputs = ["Environment / sensing", "Mission objectives", "Constraints (energy, latency, safety)"];
  const process = ["Coordination / planning", "Learning / optimization", "Communication fabric"];
  const outputs = ["Task performance", "Robustness / security", "Scalability evidence"];
  const pain = rows
    .map((r) => shortGap(r))
    .filter((g) => g && g !== "Not reported")
    .slice(0, 3);

  const col = (title: string, items: string[], x: number, fill: string) => {
    const cards = items
      .map((item, i) => {
        const y = 110 + i * 70;
        const lines = wrapLabel(item, 18);
        const text = lines
          .map(
            (ln, idx) =>
              `<text x="${x + 85}" y="${y + 28 + idx * 14}" text-anchor="middle" font-size="12" fill="#0c1f2e">${escapeXml(ln)}</text>`
          )
          .join("");
        return `<rect x="${x}" y="${y}" width="170" height="56" rx="8" fill="${fill}" stroke="#1a6b7a"/>${text}`;
      })
      .join("");
    return `<text x="${x + 85}" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#0c1f2e">${escapeXml(title)}</text>${cards}`;
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <text x="24" y="28" font-size="15" fill="#0c1f2e" font-family="Georgia,serif">Problem formulation for ${escapeXml(field.slice(0, 40))}</text>
    ${col("Inputs", inputs, 40, "#e8f1f4")}
    <polygon points="230,220 270,200 270,240" fill="#c4a35a"/>
    ${col("System core", process, 290, "#dce9ee")}
    <polygon points="480,220 520,200 520,240" fill="#c4a35a"/>
    ${col("Outcomes", outputs, 540, "#e8f1f4")}
    <rect x="740" y="110" width="140" height="220" rx="10" fill="#0c1f2e"/>
    <text x="810" y="140" text-anchor="middle" fill="#c4a35a" font-size="12">Friction</text>
    ${pain
      .map(
        (p, i) =>
          `<text x="810" y="${175 + i * 48}" text-anchor="middle" fill="#f7fafb" font-size="10">${escapeXml(wrapLabel(p, 16).join(" "))}</text>`
      )
      .join("")}
    <text x="24" y="400" font-size="11" fill="#5a6b75">Arrows show the research problem pipeline; right panel highlights recurring matrix gaps.</text>
  </svg>`;

  return {
    id: "fig-problem",
    title: "Problem Illustration",
    caption:
      "Conceptual problem diagram linking inputs, system core, outcomes, and recurring friction points extracted from synthesis-matrix gap annotations.",
    kind: "problem",
    svg,
  };
}

/** Fig + table: Comparison */
export function buildComparisonArtifacts(rows: MatrixRow[]): { figure: SurveyFigure; table: SurveyTable } {
  const sample = rows.slice(0, 8);
  const headers = ["Study", "Year", "Method focus", "Key finding", "Reported gap"];
  const tableRows = sample.map((r) => [
    r.title.slice(0, 48) + (r.title.length > 48 ? "…" : ""),
    r.year ? String(r.year) : "n.d.",
    shortMethod(r),
    shortFinding(r),
    shortGap(r),
  ]);

  const width = 960;
  const rowH = 34;
  const height = 70 + (sample.length + 1) * rowH;
  const cols = [20, 300, 360, 520, 740];

  const headerSvg = headers
    .map(
      (h, i) =>
        `<text x="${cols[i]}" y="58" font-size="11" font-weight="700" fill="#f7fafb">${escapeXml(h)}</text>`
    )
    .join("");

  const body = tableRows
    .map((cells, i) => {
      const y = 70 + i * rowH;
      const bg = i % 2 === 0 ? "#e8f1f4" : "#f7fafb";
      return `<g>
        <rect x="10" y="${y}" width="${width - 20}" height="${rowH - 3}" fill="${bg}"/>
        ${cells
          .map(
            (c, j) =>
              `<text x="${cols[j]}" y="${y + 21}" font-size="10" fill="#0c1f2e">${escapeXml(c.slice(0, j === 0 ? 42 : 28))}</text>`
          )
          .join("")}
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <text x="20" y="28" font-size="15" fill="#0c1f2e" font-family="Georgia,serif">Comparative study matrix</text>
    <rect x="10" y="38" width="${width - 20}" height="28" fill="#0c1f2e"/>
    ${headerSvg}
    ${body}
  </svg>`;

  const html = `<table class="survey-table">
    <thead><tr>${headers.map((h) => `<th>${escapeXml(h)}</th>`).join("")}</tr></thead>
    <tbody>
      ${tableRows
        .map((r) => `<tr>${r.map((c) => `<td>${escapeXml(c)}</td>`).join("")}</tr>`)
        .join("")}
    </tbody>
  </table>`;

  const table: SurveyTable = {
    id: "tbl-comparison",
    title: "Comparative Analysis of Primary Studies",
    caption:
      "Concept-centric comparison of representative matrix studies across method focus, reported findings, and limitations.",
    kind: "comparison",
    headers,
    rows: tableRows,
  };

  return {
    figure: {
      id: "fig-comparison",
      title: "Comparative Study Matrix",
      caption: table.caption,
      kind: "comparison",
      svg,
      html,
    },
    table,
  };
}

/** Fig + table: Challenges */
export function buildChallengeArtifacts(rows: MatrixRow[]): { figure: SurveyFigure; table: SurveyTable } {
  const buckets = taxonomyBuckets(rows);
  const challenges: { dimension: string; challenge: string; evidence: string; severity: string }[] = [];

  for (const [dim, list] of buckets) {
    const gapText = list.map((r) => shortGap(r)).find((g) => g !== "Not reported") || "Sparse reporting of limitations";
    const severity = list.length >= 4 ? "High" : list.length >= 2 ? "Medium" : "Emerging";
    challenges.push({
      dimension: dim,
      challenge: gapText,
      evidence: `${list.length} matrix studies`,
      severity,
    });
  }

  // Ensure at least 4 challenge rows
  while (challenges.length < 4) {
    challenges.push({
      dimension: "Cross-cutting",
      challenge: "Limited shared benchmarks and reproducibility artifacts",
      evidence: "Synthesis observation",
      severity: "High",
    });
  }

  const width = 900;
  const height = 120 + challenges.length * 56;
  const cards = challenges
    .map((c, i) => {
      const y = 60 + i * 56;
      const sevColor = c.severity === "High" ? "#9b3b3b" : c.severity === "Medium" ? "#c4a35a" : "#2f6f4e";
      return `<g>
        <rect x="20" y="${y}" width="860" height="48" rx="8" fill="#fff" stroke="#c9d7de"/>
        <rect x="20" y="${y}" width="8" height="48" fill="${sevColor}"/>
        <text x="44" y="${y + 20}" font-size="12" font-weight="700" fill="#0c1f2e">${escapeXml(c.dimension)}</text>
        <text x="44" y="${y + 38}" font-size="11" fill="#5a6b75">${escapeXml(c.challenge.slice(0, 95))}</text>
        <text x="780" y="${y + 30}" text-anchor="middle" font-size="11" fill="${sevColor}">${escapeXml(c.severity)}</text>
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <text x="20" y="32" font-size="15" fill="#0c1f2e" font-family="Georgia,serif">Challenges aligned with the taxonomy</text>
    ${cards}
  </svg>`;

  const headers = ["Taxonomy dimension", "Challenge", "Evidence", "Severity"];
  const tableRows = challenges.map((c) => [c.dimension, c.challenge, c.evidence, c.severity]);
  const html = `<table class="survey-table">
    <thead><tr>${headers.map((h) => `<th>${escapeXml(h)}</th>`).join("")}</tr></thead>
    <tbody>${tableRows.map((r) => `<tr>${r.map((c) => `<td>${escapeXml(c)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;

  const table: SurveyTable = {
    id: "tbl-challenges",
    title: "Open Challenges by Taxonomy Dimension",
    caption:
      "Challenges synthesized from matrix gap fields and grouped under the survey taxonomy, with qualitative severity.",
    kind: "challenges",
    headers,
    rows: tableRows,
  };

  return {
    figure: {
      id: "fig-challenges",
      title: "Challenge Map",
      caption: table.caption,
      kind: "challenges",
      svg,
      html,
    },
    table,
  };
}

/** Fig: Venn diagram of trends vs gaps */
export function buildVennFigure(rows: MatrixRow[]): SurveyFigure {
  const methods = new Set(
    rows
      .map((r) => shortMethod(r).toLowerCase())
      .filter((m) => m && m !== "unspecified" && m !== "not applicable" && m !== "not specified")
  );
  const gapTokens = rows
    .flatMap((r) => r.gaps.toLowerCase().split(/[^a-z0-9]+/))
    .filter((t) => t.length > 5);
  const gapFreq = new Map<string, number>();
  for (const t of gapTokens) gapFreq.set(t, (gapFreq.get(t) ?? 0) + 1);

  const stop = new Set([
    "which",
    "their",
    "there",
    "these",
    "those",
    "about",
    "based",
    "using",
    "study",
    "paper",
    "research",
    "however",
    "limited",
    "existing",
  ]);
  const topGaps = [...gapFreq.entries()]
    .filter(([t]) => !stop.has(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t);

  const trends = [...methods].slice(0, 4).map((m) => m.split(/\s+/).slice(0, 3).join(" "));
  const overlap = ["scalability", "coordination", "evaluation"].filter(
    (t) => topGaps.includes(t) || trends.some((x) => x.includes(t))
  );
  const overlapLabels = overlap.length ? overlap : ["benchmarks", "robustness"];

  const width = 880;
  const height = 420;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <text x="24" y="28" font-size="15" fill="#0c1f2e" font-family="Georgia,serif">Trends ∩ Coverage vs Persistent Gaps</text>
    <circle cx="340" cy="210" r="120" fill="#2a8fa1" fill-opacity="0.28" stroke="#1a6b7a" stroke-width="2"/>
    <circle cx="500" cy="210" r="120" fill="#c4a35a" fill-opacity="0.28" stroke="#a8843d" stroke-width="2"/>
    <text x="280" y="150" text-anchor="middle" font-size="13" font-weight="700" fill="#0c1f2e">Active trends</text>
    <text x="560" y="150" text-anchor="middle" font-size="13" font-weight="700" fill="#0c1f2e">Open gaps</text>
    <text x="420" y="150" text-anchor="middle" font-size="12" font-weight="700" fill="#0c1f2e">Overlap</text>
    ${trends
      .slice(0, 3)
      .map(
        (t, i) =>
          `<text x="280" y="${190 + i * 22}" text-anchor="middle" font-size="11" fill="#0c1f2e">${escapeXml(t.slice(0, 22))}</text>`
      )
      .join("")}
    ${topGaps
      .slice(0, 3)
      .map(
        (t, i) =>
          `<text x="560" y="${190 + i * 22}" text-anchor="middle" font-size="11" fill="#0c1f2e">${escapeXml(t)}</text>`
      )
      .join("")}
    ${overlapLabels
      .slice(0, 2)
      .map(
        (t, i) =>
          `<text x="420" y="${200 + i * 22}" text-anchor="middle" font-size="11" fill="#0c1f2e">${escapeXml(t)}</text>`
      )
      .join("")}
    <text x="24" y="395" font-size="11" fill="#5a6b75">Left: frequently pursued methods/themes. Right: recurring gap tokens. Center: contested or under-resolved intersections.</text>
  </svg>`;

  return {
    id: "fig-venn",
    title: "Trends and Gaps Venn Map",
    caption:
      "Venn-style map contrasting active methodological trends with persistent research gaps and their overlap opportunities.",
    kind: "venn",
    svg,
  };
}

export function buildRelatedSurveysTable(rows: MatrixRow[]): SurveyTable | null {
  const surveys = rows.filter((r) => /survey|review|taxonomy/i.test(r.title)).slice(0, 6);
  if (!surveys.length) return null;
  return {
    id: "tbl-related-surveys",
    title: "Positioning Against Related Surveys",
    caption:
      "Selected prior surveys/reviews in the matrix and the complementary focus of the present synthesis.",
    kind: "related-surveys",
    headers: ["Prior survey / review", "Year", "Primary focus (from matrix)", "This survey adds"],
    rows: surveys.map((r) => [
      r.title.slice(0, 60) + (r.title.length > 60 ? "…" : ""),
      r.year ? String(r.year) : "n.d.",
      shortMethod(r),
      "Taxonomy-aligned comparison, challenge map, and trends–gaps Venn",
    ]),
  };
}

export function generateFiguresAndTables(
  rows: MatrixRow[],
  _papers: DiscoveredPaper[],
  topic: string
): { figures: SurveyFigure[]; tables: SurveyTable[] } {
  const comparison = buildComparisonArtifacts(rows);
  const challenges = buildChallengeArtifacts(rows);
  const related = buildRelatedSurveysTable(rows);

  const figures: SurveyFigure[] = [
    buildProblemFigure(topic, rows),
    buildTaxonomyFigure(rows, topic),
    comparison.figure,
    challenges.figure,
    buildVennFigure(rows),
  ];

  const tables: SurveyTable[] = [comparison.table, challenges.table];
  if (related) tables.unshift(related);

  return { figures, tables };
}

/** Back-compat wrapper */
export function generateFigures(
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  topic: string
): SurveyFigure[] {
  return generateFiguresAndTables(rows, papers, topic).figures;
}
