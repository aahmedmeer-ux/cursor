import type { MatrixRow } from "./types";

export function inferTopic(rows: MatrixRow[]): string {
  const stop = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "for",
    "in",
    "on",
    "to",
    "with",
    "using",
    "based",
    "from",
    "into",
    "survey",
    "review",
    "study",
    "analysis",
    "comprehensive",
    "critical",
    "systematic",
    "literature",
    "recent",
    "toward",
    "towards",
    "role",
    "step",
  ]);

  const titleCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  const bump = (map: Map<string, number>, raw: string, weight = 1) => {
    const key = raw.trim().toLowerCase();
    if (key.length < 3 || key.length > 40) return;
    if (stop.has(key)) return;
    map.set(key, (map.get(key) ?? 0) + weight);
  };

  for (const row of rows) {
    for (const part of [...row.themes.split(/[;,|/]/), ...row.keywords.split(/[;,|/]/)]) {
      // Theme cells often list technique names; keep only short topical labels
      if (part.trim().split(/\s+/).length <= 4) bump(themeCounts, part);
    }
    for (const token of row.title.toLowerCase().split(/[^a-z0-9]+/)) {
      if (!stop.has(token) && token.length > 2) bump(titleCounts, token, 2);
    }
    // Catch common multi-word topics from titles
    const title = row.title.toLowerCase();
    for (const phrase of ["uav swarm", "drone swarm", "aerial swarm", "swarm robotics", "formation control"]) {
      if (title.includes(phrase)) bump(titleCounts, phrase, 5);
    }
  }

  const pickTop = (map: Map<string, number>, n: number) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([t]) => t.replace(/\b\w/g, (c) => c.toUpperCase()));

  // Prefer title-derived domain terms when they clearly dominate
  const titleTop = pickTop(titleCounts, 3);
  const themeTop = pickTop(themeCounts, 3);
  let topThemes =
    titleTop.length && (titleCounts.get(titleTop[0].toLowerCase()) ?? 0) >= Math.max(rows.length * 0.35, 3)
      ? titleTop
      : themeTop.length
        ? themeTop
        : titleTop;

  // Deduplicate near-identical tokens (swarm / swarms / uav swarm)
  const deduped: string[] = [];
  for (const theme of topThemes) {
    const stem = theme.toLowerCase().replace(/s$/, "");
    if (deduped.some((d) => d.toLowerCase().replace(/s$/, "") === stem || d.toLowerCase().includes(stem))) {
      continue;
    }
    deduped.push(theme);
  }
  topThemes = deduped.slice(0, 3);

  if (topThemes.length === 0) {
    return "A Systematic Survey of Recent Research";
  }
  // Prefer compact domain titles when swarm/UAV dominate
  const joined = topThemes.map((t) => t.toLowerCase()).join(" ");
  if (joined.includes("uav") && joined.includes("swarm")) {
    return "A Survey of UAV Swarm Systems";
  }
  if (joined.includes("drone") && joined.includes("swarm")) {
    return "A Survey of Drone Swarm Systems";
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
