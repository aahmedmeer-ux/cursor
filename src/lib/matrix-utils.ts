import type { MatrixRow } from "./types";

export function inferTopic(rows: MatrixRow[]): string {
  const themeCounts = new Map<string, number>();
  for (const row of rows) {
    const themes = [
      ...row.themes.split(/[;,|/]/),
      ...row.keywords.split(/[;,|/]/),
    ]
      .map((t) => t.trim())
      .filter(Boolean);
    for (const theme of themes) {
      const key = theme.toLowerCase();
      themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
    }
  }

  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t.replace(/\b\w/g, (c) => c.toUpperCase()));

  if (topThemes.length === 0) {
    return "A Systematic Survey of Recent Research";
  }
  if (topThemes.length === 1) return `A Survey of ${topThemes[0]}`;
  if (topThemes.length === 2) return `A Survey of ${topThemes[0]} and ${topThemes[1]}`;
  return `A Survey of ${topThemes[0]}, ${topThemes[1]}, and ${topThemes[2]}`;
}

export function extractSearchQueries(rows: MatrixRow[], topic: string): string[] {
  const queries = new Set<string>();
  if (topic) queries.add(topic.replace(/^A Survey of\s+/i, ""));

  for (const row of rows) {
    for (const part of [...row.themes.split(/[;,|/]/), ...row.keywords.split(/[;,|/]/)]) {
      const t = part.trim();
      if (t.length > 3) queries.add(t);
    }
    if (row.title.split(/\s+/).length <= 12) queries.add(row.title);
  }

  return [...queries].slice(0, 8);
}
