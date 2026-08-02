import type {
  DiscoveredPaper,
  MatrixRow,
  SurveyFigure,
  SurveyTable,
  TaxonomyStyle,
} from "./types";
import { themeKeysForRow } from "./taxonomy";

/** No nested quotes — nested quotes break SVG XML and PDF rasterization. */
const FONT = "Helvetica, Arial, sans-serif";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapLabel(text: string, max = 18): string[] {
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

/** High-contrast bold SVG text — readable at journal preview scale */
function svgText(
  x: number,
  y: number,
  content: string,
  opts: {
    size?: number;
    weight?: number;
    fill?: string;
    anchor?: "start" | "middle" | "end";
    stroke?: string;
    strokeWidth?: number;
  } = {}
): string {
  const size = opts.size ?? 14;
  const weight = opts.weight ?? 700;
  const fill = opts.fill ?? "#0c1f2e";
  const anchor = opts.anchor ?? "start";
  const stroke = opts.stroke;
  const strokeWidth = opts.strokeWidth ?? 0;
  const strokeAttrs =
    stroke && strokeWidth
      ? ` stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke fill"`
      : "";
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="${FONT}"${strokeAttrs}>${escapeXml(content)}</text>`;
}

function multilines(
  x: number,
  y: number,
  lines: string[],
  opts: {
    size?: number;
    weight?: number;
    fill?: string;
    anchor?: "start" | "middle" | "end";
    lineHeight?: number;
  } = {}
): string {
  const lh = opts.lineHeight ?? (opts.size ?? 14) + 4;
  return lines
    .map((ln, i) =>
      svgText(x, y + i * lh, ln, {
        size: opts.size,
        weight: opts.weight,
        fill: opts.fill,
        anchor: opts.anchor,
      })
    )
    .join("");
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

function taxonomyBranches(style: TaxonomyStyle): { label: string; x: number }[] {
  if (style === "scientific") {
    return [
      { label: "Phenomena / Domain", x: 160 },
      { label: "Mechanisms / Models", x: 400 },
      { label: "Methods / Algorithms", x: 640 },
      { label: "Evidence / Metrics", x: 860 },
    ];
  }
  if (style === "professional") {
    return [
      { label: "Strategic Drivers", x: 180 },
      { label: "Capability Layers", x: 490 },
      { label: "Value Outcomes", x: 800 },
    ];
  }
  if (style === "simple") return [];
  return [
    { label: "Problem & Scope", x: 180 },
    { label: "Methods & Control", x: 490 },
    { label: "Evaluation & Gaps", x: 800 },
  ];
}

function taxonomyTitle(style: TaxonomyStyle): string {
  switch (style) {
    case "scientific":
      return "SCIENTIFIC TAXONOMY OF THE LITERATURE";
    case "professional":
      return "PROFESSIONAL CAPABILITY FRAMEWORK";
    case "simple":
      return "SIMPLE THEME MAP";
    default:
      return "TAXONOMY OF THE SURVEYED LITERATURE";
  }
}

/** Fig: Visual taxonomy tree (style-selectable) */
export function buildTaxonomyFigure(
  rows: MatrixRow[],
  topic: string,
  style: TaxonomyStyle = "semi-scientific"
): SurveyFigure {
  const buckets = [...taxonomyBuckets(rows).entries()].slice(0, style === "simple" ? 5 : 6);
  const width = 980;
  const height = style === "simple" ? 360 : 520;
  const cx = width / 2;
  const rootLabel = topic.replace(/^A Survey of\s+/i, "").slice(0, 40);
  const branches = taxonomyBranches(style);

  if (style === "simple") {
    const leafW = 160;
    const gap = (width - 48 - buckets.length * leafW) / Math.max(buckets.length - 1, 1);
    const cards = buckets
      .map(([label, list], i) => {
        const x = 24 + i * (leafW + Math.max(gap, 8));
        const lines = wrapLabel(label, 14);
        return `
        <rect x="${x}" y="140" width="${leafW}" height="120" rx="14" fill="#ffffff" stroke="#0c1f2e" stroke-width="2.5"/>
        ${multilines(x + leafW / 2, 175, lines, {
          size: 15,
          weight: 800,
          fill: "#0c1f2e",
          anchor: "middle",
          lineHeight: 20,
        })}
        ${svgText(x + leafW / 2, 235, `${list.length} studies`, {
          size: 13,
          weight: 700,
          fill: "#1a6b7a",
          anchor: "middle",
        })}`;
      })
      .join("");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Simple taxonomy">
      <rect width="100%" height="100%" fill="#f3f7f8"/>
      ${svgText(28, 36, taxonomyTitle(style), { size: 18, weight: 800, fill: "#0c1f2e" })}
      <rect x="${cx - 180}" y="58" width="360" height="50" rx="12" fill="#1a6b7a"/>
      ${svgText(cx, 90, rootLabel, { size: 16, weight: 800, fill: "#ffffff", anchor: "middle" })}
      ${cards}
    </svg>`;

    return {
      id: "fig-taxonomy",
      title: "Field Taxonomy (Simple)",
      caption: "Simple theme map of dominant clusters extracted from the synthesis matrix.",
      kind: "taxonomy",
      svg,
    };
  }

  const midY = 195;
  const leafY = 340;
  const branchSvg = branches
    .map((b) => {
      const bw = style === "scientific" ? 168 : 200;
      return `
      <line x1="${cx}" y1="108" x2="${b.x}" y2="${midY}" stroke="${style === "professional" ? "#0c1f2e" : "#1a6b7a"}" stroke-width="3"/>
      <rect x="${b.x - bw / 2}" y="${midY - 26}" width="${bw}" height="52" rx="${style === "professional" ? 4 : 10}" fill="#0c1f2e"/>
      ${svgText(b.x, midY + 7, b.label, { size: style === "scientific" ? 13 : 15, weight: 800, fill: "#ffffff", anchor: "middle" })}`;
    })
    .join("");

  const leafW = style === "scientific" ? 120 : 138;
  const gap = (width - 48 - buckets.length * leafW) / Math.max(buckets.length - 1, 1);
  const leaves = buckets.map(([label, list], i) => {
    const x = 24 + i * (leafW + Math.max(gap, 8));
    const parent = branches[i % branches.length];
    const lines = wrapLabel(label, style === "scientific" ? 11 : 12);
    const boxH = 52 + lines.length * 18;
    return `
      <line x1="${parent.x}" y1="${midY + 26}" x2="${x + leafW / 2}" y2="${leafY}" stroke="#2a8fa1" stroke-width="2.4"/>
      <rect x="${x}" y="${leafY}" width="${leafW}" height="${boxH}" rx="${style === "professional" ? 4 : 10}" fill="#ffffff" stroke="#0c1f2e" stroke-width="2.5"/>
      ${multilines(x + leafW / 2, leafY + 28, lines, {
        size: 14,
        weight: 800,
        fill: "#0c1f2e",
        anchor: "middle",
        lineHeight: 18,
      })}
      ${svgText(x + leafW / 2, leafY + boxH - 12, `n = ${list.length}`, {
        size: 13,
        weight: 700,
        fill: "#1a6b7a",
        anchor: "middle",
      })}`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Field taxonomy">
    <defs>
      <linearGradient id="taxBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7fafb"/><stop offset="100%" stop-color="#d5e4ea"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#taxBg)"/>
    ${svgText(28, 34, taxonomyTitle(style), { size: 18, weight: 800, fill: "#0c1f2e" })}
    <rect x="${cx - 190}" y="52" width="380" height="56" rx="${style === "professional" ? 4 : 12}" fill="#1a6b7a" stroke="#0c1f2e" stroke-width="1.5"/>
    ${svgText(cx, 87, rootLabel, { size: 17, weight: 800, fill: "#ffffff", anchor: "middle" })}
    ${branchSvg}
    ${leaves.join("")}
  </svg>`;

  return {
    id: "fig-taxonomy",
    title: style === "professional" ? "Capability Framework" : "Field Taxonomy",
    caption:
      style === "scientific"
        ? "Scientific multi-axis taxonomy spanning phenomena, mechanisms, methods, and evidence metrics."
        : style === "professional"
          ? "Professional capability framework mapping strategic drivers to layers and outcomes."
          : "Multi-level taxonomy organizing the synthesis matrix into problem/scope, methods/control, and evaluation/gap dimensions.",
    kind: "taxonomy",
    svg,
  };
}

/** Fig: Problem illustration diagram */
export function buildProblemFigure(topic: string, rows: MatrixRow[]): SurveyFigure {
  const field = topic.replace(/^A Survey of\s+/i, "") || "Target system";
  const width = 980;
  const height = 460;

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
        const y = 118 + i * 78;
        const lines = wrapLabel(item, 16);
        return `<rect x="${x}" y="${y}" width="188" height="64" rx="10" fill="${fill}" stroke="#0c1f2e" stroke-width="2"/>
          ${multilines(x + 94, y + 28, lines, {
            size: 13,
            weight: 700,
            fill: "#0c1f2e",
            anchor: "middle",
            lineHeight: 17,
          })}`;
      })
      .join("");
    return `${svgText(x + 94, 98, title, {
      size: 16,
      weight: 800,
      fill: "#0c1f2e",
      anchor: "middle",
    })}${cards}`;
  };

  const frictionLines = pain.flatMap((p) => wrapLabel(p, 14)).slice(0, 6);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Problem illustration">
    <rect width="100%" height="100%" fill="#f3f7f8"/>
    ${svgText(28, 34, `PROBLEM FORMULATION — ${field.slice(0, 36).toUpperCase()}`, {
      size: 17,
      weight: 800,
      fill: "#0c1f2e",
    })}
    ${col("INPUTS", inputs, 36, "#e8f1f4")}
    <polygon points="244,250 286,228 286,272" fill="#0c1f2e"/>
    ${col("SYSTEM CORE", process, 304, "#d5e4ea")}
    <polygon points="512,250 554,228 554,272" fill="#0c1f2e"/>
    ${col("OUTCOMES", outputs, 572, "#e8f1f4")}
    <rect x="790" y="118" width="160" height="250" rx="12" fill="#0c1f2e"/>
    ${svgText(870, 150, "FRICTION", { size: 15, weight: 800, fill: "#f0d48a", anchor: "middle" })}
    ${multilines(870, 186, frictionLines.length ? frictionLines : ["Limited shared", "benchmarks"], {
      size: 12,
      weight: 700,
      fill: "#ffffff",
      anchor: "middle",
      lineHeight: 18,
    })}
    ${svgText(28, 440, "Arrows show the research problem pipeline; right panel highlights recurring matrix gaps.", {
      size: 12,
      weight: 600,
      fill: "#3d5160",
    })}
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

  const width = 1000;
  const rowH = 40;
  const height = 78 + (sample.length + 1) * rowH;
  const cols = [24, 310, 380, 560, 780];

  const headerSvg = headers
    .map((h, i) =>
      svgText(cols[i], 64, h, { size: 13, weight: 800, fill: "#ffffff" })
    )
    .join("");

  const body = tableRows
    .map((cells, i) => {
      const y = 78 + i * rowH;
      const bg = i % 2 === 0 ? "#e8f1f4" : "#ffffff";
      return `<g>
        <rect x="12" y="${y}" width="${width - 24}" height="${rowH - 4}" fill="${bg}" stroke="#c9d7de"/>
        ${cells
          .map((c, j) =>
            svgText(cols[j], y + 26, c.slice(0, j === 0 ? 40 : 26), {
              size: 12,
              weight: j === 0 ? 700 : 600,
              fill: "#0c1f2e",
            })
          )
          .join("")}
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Comparative study matrix">
    <rect width="100%" height="100%" fill="#f3f7f8"/>
    ${svgText(24, 32, "COMPARATIVE STUDY MATRIX", { size: 18, weight: 800, fill: "#0c1f2e" })}
    <rect x="12" y="42" width="${width - 24}" height="32" fill="#0c1f2e"/>
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
    const gapText =
      list.map((r) => shortGap(r)).find((g) => g !== "Not reported") ||
      "Sparse reporting of limitations";
    const severity = list.length >= 4 ? "High" : list.length >= 2 ? "Medium" : "Emerging";
    challenges.push({
      dimension: dim,
      challenge: gapText,
      evidence: `${list.length} matrix studies`,
      severity,
    });
  }

  while (challenges.length < 4) {
    challenges.push({
      dimension: "Cross-cutting",
      challenge: "Limited shared benchmarks and reproducibility artifacts",
      evidence: "Synthesis observation",
      severity: "High",
    });
  }

  const width = 980;
  const height = 130 + challenges.length * 62;
  const cards = challenges
    .map((c, i) => {
      const y = 70 + i * 62;
      const sevColor = c.severity === "High" ? "#8b2e2e" : c.severity === "Medium" ? "#8a6a20" : "#1f5c3d";
      return `<g>
        <rect x="20" y="${y}" width="940" height="54" rx="10" fill="#ffffff" stroke="#0c1f2e" stroke-width="1.8"/>
        <rect x="20" y="${y}" width="10" height="54" fill="${sevColor}"/>
        ${svgText(48, y + 22, c.dimension, { size: 15, weight: 800, fill: "#0c1f2e" })}
        ${svgText(48, y + 42, c.challenge.slice(0, 100), { size: 13, weight: 600, fill: "#2a3a44" })}
        ${svgText(900, y + 32, c.severity.toUpperCase(), {
          size: 13,
          weight: 800,
          fill: sevColor,
          anchor: "middle",
        })}
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Challenge map">
    <rect width="100%" height="100%" fill="#f3f7f8"/>
    ${svgText(24, 36, "CHALLENGES ALIGNED WITH THE TAXONOMY", { size: 18, weight: 800, fill: "#0c1f2e" })}
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

  const width = 960;
  const height = 460;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Trends and gaps Venn">
    <rect width="100%" height="100%" fill="#f3f7f8"/>
    ${svgText(28, 34, "TRENDS ∩ COVERAGE VS PERSISTENT GAPS", { size: 18, weight: 800, fill: "#0c1f2e" })}
    <circle cx="360" cy="230" r="135" fill="#2a8fa1" fill-opacity="0.32" stroke="#0c1f2e" stroke-width="3"/>
    <circle cx="540" cy="230" r="135" fill="#c4a35a" fill-opacity="0.34" stroke="#0c1f2e" stroke-width="3"/>
    ${svgText(290, 145, "ACTIVE TRENDS", { size: 15, weight: 800, fill: "#0c1f2e", anchor: "middle" })}
    ${svgText(610, 145, "OPEN GAPS", { size: 15, weight: 800, fill: "#0c1f2e", anchor: "middle" })}
    ${svgText(450, 145, "OVERLAP", { size: 14, weight: 800, fill: "#0c1f2e", anchor: "middle" })}
    ${trends
      .slice(0, 3)
      .map((t, i) =>
        svgText(290, 200 + i * 26, t.slice(0, 24), {
          size: 13,
          weight: 700,
          fill: "#0c1f2e",
          anchor: "middle",
        })
      )
      .join("")}
    ${topGaps
      .slice(0, 3)
      .map((t, i) =>
        svgText(610, 200 + i * 26, t, {
          size: 13,
          weight: 700,
          fill: "#0c1f2e",
          anchor: "middle",
        })
      )
      .join("")}
    ${overlapLabels
      .slice(0, 2)
      .map((t, i) =>
        svgText(450, 210 + i * 26, t, {
          size: 13,
          weight: 800,
          fill: "#0c1f2e",
          anchor: "middle",
        })
      )
      .join("")}
    ${svgText(
      28,
      430,
      "Left: frequently pursued methods/themes. Right: recurring gap tokens. Center: contested intersections.",
      { size: 12, weight: 600, fill: "#3d5160" }
    )}
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
  topic: string,
  taxonomyStyle: TaxonomyStyle = "semi-scientific"
): { figures: SurveyFigure[]; tables: SurveyTable[] } {
  const comparison = buildComparisonArtifacts(rows);
  const challenges = buildChallengeArtifacts(rows);
  const related = buildRelatedSurveysTable(rows);

  const figures: SurveyFigure[] = [
    buildProblemFigure(topic, rows),
    buildTaxonomyFigure(rows, topic, taxonomyStyle),
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
