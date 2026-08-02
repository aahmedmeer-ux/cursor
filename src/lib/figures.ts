import type { DiscoveredPaper, MatrixRow, SurveyFigure } from "./types";

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

function themeCounts(rows: MatrixRow[], papers: DiscoveredPaper[]): Map<string, number> {
  const counts = new Map<string, number>();
  const bump = (t: string) => {
    const key = t.trim();
    if (!key) return;
    const norm = key.charAt(0).toUpperCase() + key.slice(1);
    counts.set(norm, (counts.get(norm) ?? 0) + 1);
  };
  for (const row of rows) {
    row.themes.split(/[;,|/]/).forEach(bump);
    row.keywords.split(/[;,|/]/).forEach(bump);
  }
  for (const p of papers) p.themes.forEach(bump);
  return counts;
}

function methodCounts(rows: MatrixRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const method = row.method.trim() || "Unspecified";
    const short = method.split(/[.;]/)[0].slice(0, 40);
    counts.set(short, (counts.get(short) ?? 0) + 1);
  }
  return counts;
}

export function buildTaxonomyFigure(rows: MatrixRow[], papers: DiscoveredPaper[], topic: string): SurveyFigure {
  const themes = [...themeCounts(rows, papers).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const width = 820;
  const height = 420;
  const cx = width / 2;
  const cy = 70;
  const nodes = themes.map(([label, count], i) => {
    const x = 80 + i * 120;
    const y = 250;
    return { label, count, x, y };
  });

  const lines = nodes
    .map(
      (n) =>
        `<line x1="${cx}" y1="${cy + 30}" x2="${n.x + 50}" y2="${n.y}" stroke="#1a6b7a" stroke-width="2" opacity="0.55"/>`
    )
    .join("");

  const boxes = nodes
    .map((n) => {
      const labelLines = wrapLabel(n.label, 16);
      const text = labelLines
        .map(
          (ln, idx) =>
            `<text x="${n.x + 50}" y="${n.y + 28 + idx * 14}" text-anchor="middle" font-size="11" fill="#0c1f2e" font-family="Georgia, serif">${escapeXml(ln)}</text>`
        )
        .join("");
      return `<g>
        <rect x="${n.x}" y="${n.y}" width="100" height="${36 + labelLines.length * 14}" rx="6" fill="#e8f1f4" stroke="#1a6b7a"/>
        ${text}
        <text x="${n.x + 50}" y="${n.y + 36 + labelLines.length * 14}" text-anchor="middle" font-size="10" fill="#5a6b75">n=${n.count}</text>
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f7fafb"/>
        <stop offset="100%" stop-color="#dce9ee"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="${cx - 140}" y="${cy - 24}" width="280" height="54" rx="8" fill="#0c1f2e"/>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="#f7fafb" font-size="14" font-family="Georgia, serif">${escapeXml(topic.slice(0, 48))}</text>
    ${lines}
    ${boxes}
    <text x="20" y="${height - 16}" font-size="11" fill="#5a6b75" font-family="system-ui,sans-serif">Figure: Thematic taxonomy derived from the synthesis matrix and discovered literature.</text>
  </svg>`;

  const mermaid =
    `flowchart TD\n  ROOT["${topic.replace(/"/g, "'")}"]\n` +
    themes.map(([t], i) => `  ROOT --> T${i}["${t.replace(/"/g, "'")}"]`).join("\n");

  return {
    id: "fig-taxonomy",
    title: "Thematic Taxonomy",
    caption:
      "Hierarchical organization of dominant themes extracted from the synthesis matrix and complementary literature discovery.",
    kind: "taxonomy",
    svg,
    mermaid,
  };
}

export function buildMethodsFigure(rows: MatrixRow[]): SurveyFigure {
  const methods = [...methodCounts(rows).entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(...methods.map(([, c]) => c), 1);
  const width = 820;
  const barH = 28;
  const height = 80 + methods.length * (barH + 16);

  const bars = methods
    .map(([label, count], i) => {
      const y = 50 + i * (barH + 16);
      const w = Math.max(20, (count / max) * 520);
      return `<g>
        <text x="20" y="${y + 18}" font-size="12" fill="#0c1f2e" font-family="Georgia, serif">${escapeXml(label.slice(0, 34))}</text>
        <rect x="260" y="${y}" width="${w}" height="${barH}" rx="4" fill="#1a6b7a"/>
        <text x="${270 + w}" y="${y + 18}" font-size="12" fill="#0c1f2e">${count}</text>
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <text x="20" y="28" font-size="16" fill="#0c1f2e" font-family="Georgia, serif">Method distribution across reviewed studies</text>
    ${bars}
  </svg>`;

  return {
    id: "fig-methods",
    title: "Method Distribution",
    caption: "Frequency of methodological approaches reported in the synthesis matrix.",
    kind: "methods",
    svg,
  };
}

export function buildTimelineFigure(papers: DiscoveredPaper[]): SurveyFigure {
  const byYear = new Map<number, number>();
  for (const p of papers) {
    if (!p.year) continue;
    byYear.set(p.year, (byYear.get(p.year) ?? 0) + 1);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const width = 820;
  const height = 280;
  const max = Math.max(...[...byYear.values()], 1);

  if (years.length === 0) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#f7fafb"/>
      <text x="40" y="140" font-size="14" fill="#5a6b75">Insufficient year metadata for timeline.</text>
    </svg>`;
    return {
      id: "fig-timeline",
      title: "Publication Timeline",
      caption: "Publication activity over time among included studies.",
      kind: "timeline",
      svg,
    };
  }

  const plotW = 700;
  const plotH = 160;
  const x0 = 60;
  const y0 = 210;
  const step = years.length > 1 ? plotW / (years.length - 1) : 0;

  const points = years
    .map((y, i) => {
      const x = x0 + i * step;
      const h = ((byYear.get(y) ?? 0) / max) * plotH;
      return `${x},${y0 - h}`;
    })
    .join(" ");

  const dots = years
    .map((y, i) => {
      const x = x0 + i * step;
      const h = ((byYear.get(y) ?? 0) / max) * plotH;
      return `<circle cx="${x}" cy="${y0 - h}" r="4" fill="#c4a35a"/><text x="${x}" y="${y0 + 20}" text-anchor="middle" font-size="10" fill="#5a6b75">${y}</text>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <text x="20" y="28" font-size="16" fill="#0c1f2e" font-family="Georgia, serif">Publication timeline</text>
    <polyline fill="none" stroke="#1a6b7a" stroke-width="2.5" points="${points}"/>
    ${dots}
  </svg>`;

  return {
    id: "fig-timeline",
    title: "Publication Timeline",
    caption: "Temporal distribution of matrix entries and discovered works included in this survey.",
    kind: "timeline",
    svg,
  };
}

export function buildComparisonFigure(rows: MatrixRow[]): SurveyFigure {
  const sample = rows.slice(0, 6);
  const width = 860;
  const rowH = 36;
  const height = 90 + sample.length * rowH;
  const cols = [
    { key: "title", label: "Study", x: 20, w: 260 },
    { key: "method", label: "Method", x: 290, w: 220 },
    { key: "findings", label: "Key finding", x: 520, w: 320 },
  ] as const;

  const header = cols
    .map(
      (c) =>
        `<text x="${c.x}" y="58" font-size="12" font-weight="700" fill="#f7fafb" font-family="system-ui,sans-serif">${c.label}</text>`
    )
    .join("");

  const body = sample
    .map((r, i) => {
      const y = 78 + i * rowH;
      const bg = i % 2 === 0 ? "#e8f1f4" : "#f7fafb";
      return `<g>
        <rect x="10" y="${y}" width="${width - 20}" height="${rowH - 4}" fill="${bg}"/>
        <text x="20" y="${y + 22}" font-size="11" fill="#0c1f2e">${escapeXml(r.title.slice(0, 42))}${r.title.length > 42 ? "…" : ""}</text>
        <text x="290" y="${y + 22}" font-size="11" fill="#0c1f2e">${escapeXml((r.method || "—").slice(0, 34))}</text>
        <text x="520" y="${y + 22}" font-size="11" fill="#0c1f2e">${escapeXml((r.findings || "—").slice(0, 48))}</text>
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <rect x="10" y="36" width="${width - 20}" height="28" fill="#0c1f2e"/>
    ${header}
    ${body}
  </svg>`;

  return {
    id: "fig-comparison",
    title: "Comparative Study Matrix",
    caption: "Side-by-side comparison of representative studies from the synthesis matrix.",
    kind: "comparison",
    svg,
  };
}

export function buildGapFigure(rows: MatrixRow[]): SurveyFigure {
  const gaps = rows
    .map((r) => r.gaps.trim())
    .filter(Boolean)
    .slice(0, 5);

  const width = 820;
  const height = 100 + gaps.length * 48;

  const items = (gaps.length ? gaps : ["Limited longitudinal evaluation", "Weak cross-domain generalization", "Sparse reproducibility artifacts"])
    .map((g, i) => {
      const y = 56 + i * 48;
      return `<g>
        <circle cx="36" cy="${y}" r="14" fill="#c4a35a"/>
        <text x="36" y="${y + 4}" text-anchor="middle" font-size="12" fill="#0c1f2e" font-weight="700">${i + 1}</text>
        <text x="64" y="${y + 5}" font-size="13" fill="#0c1f2e" font-family="Georgia, serif">${escapeXml(g.slice(0, 90))}</text>
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${Math.max(height, 220)}" width="${width}" height="${Math.max(height, 220)}">
    <rect width="100%" height="100%" fill="#f7fafb"/>
    <text x="20" y="28" font-size="16" fill="#0c1f2e" font-family="Georgia, serif">Open research gaps</text>
    ${items}
  </svg>`;

  return {
    id: "fig-gaps",
    title: "Research Gaps",
    caption: "Recurring limitations and open problems synthesized from matrix gap annotations.",
    kind: "gaps",
    svg,
  };
}

export function generateFigures(
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  topic: string
): SurveyFigure[] {
  return [
    buildTaxonomyFigure(rows, papers, topic),
    buildMethodsFigure(rows),
    buildTimelineFigure(papers),
    buildComparisonFigure(rows),
    buildGapFigure(rows),
  ];
}
