import type { MatrixRow } from "./types";

export function themeKeysForRow(row: MatrixRow): string[] {
  // Only split on clear list separators — never on "/" (e.g. Synchronous/Centralized)
  const parts = row.themes
    .split(/[;|]/)
    .map((t) => t.trim())
    .filter((t) => t && t.length <= 48 && !/^n\/?a\b/i.test(t));

  // Long technique dumps → use title-derived buckets instead
  const looksLikeDump =
    !parts.length ||
    parts.some(
      (p) =>
        p.length > 48 ||
        p.includes(":") ||
        /\//.test(p) ||
        (p.includes(",") && p.split(/\s+/).length > 6)
    );

  if (looksLikeDump) {
    const title = row.title.toLowerCase();
    if (/\b(survey|review|taxonomy)\b/.test(title)) return ["Surveys and reviews"];
    if (title.includes("formation")) return ["Formation control"];
    if (title.includes("tracking")) return ["Target tracking"];
    if (title.includes("security") || title.includes("blockchain") || title.includes("secure")) {
      return ["Security and resilience"];
    }
    if (title.includes("simulation") || title.includes("sitl")) return ["Simulation and evaluation"];
    if (title.includes("path planning") || title.includes("navigation")) {
      return ["Path planning and navigation"];
    }
    if (title.includes("definition") || title.includes("defining")) return ["Definitions and policy"];
    if (title.includes("modernization") || title.includes("mission")) {
      return ["Mission planning and modernization"];
    }
    if (title.includes("swarm") || title.includes("uav") || title.includes("drone")) {
      return ["Swarm coordination"];
    }
    return ["General"];
  }

  return parts.slice(0, 1);
}

export function groupByTheme(rows: MatrixRow[]): Map<string, MatrixRow[]> {
  const raw = new Map<string, MatrixRow[]>();
  for (const row of rows) {
    for (const key of themeKeysForRow(row)) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const list = raw.get(label) ?? [];
      list.push(row);
      raw.set(label, list);
    }
  }

  const ranked = [...raw.entries()].sort((a, b) => b[1].length - a[1].length);
  const keep = ranked.slice(0, 8);
  const map = new Map<string, MatrixRow[]>(keep);
  if (ranked.length > 8) {
    const extras = ranked.slice(8).flatMap(([, list]) => list);
    const existing = new Set(keep.flatMap(([, list]) => list.map((r) => r.id)));
    const uniqueExtras = extras.filter((r) => !existing.has(r.id));
    if (uniqueExtras.length) map.set("Additional related studies", uniqueExtras);
  }
  return map;
}
