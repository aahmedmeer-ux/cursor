import type { DiscoveredPaper, ReferenceEntry } from "./types";

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findPaperIndex(papers: DiscoveredPaper[], idOrTitle: string): number {
  const byId = papers.findIndex((p) => p.id === idOrTitle);
  if (byId >= 0) return byId;
  const norm = normalizeTitle(idOrTitle);
  return papers.findIndex((p) => normalizeTitle(p.title) === norm);
}

export function cite(papers: DiscoveredPaper[], idOrTitle: string): string {
  const idx = findPaperIndex(papers, idOrTitle);
  return idx >= 0 ? `[${idx + 1}]` : "";
}

/** Compact IEEE-style multi-cite: [1], [3], [5] or [1]–[3] when contiguous. */
export function citeMany(papers: DiscoveredPaper[], idsOrTitles: string[]): string {
  const nums = [
    ...new Set(
      idsOrTitles
        .map((t) => findPaperIndex(papers, t))
        .filter((i) => i >= 0)
        .map((i) => i + 1)
    ),
  ].sort((a, b) => a - b);

  if (!nums.length) return "";
  if (nums.length === 1) return `[${nums[0]}]`;

  // Collapse contiguous runs: [1], [2], [3], [7] -> [1]–[3], [7]
  const parts: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i <= nums.length; i++) {
    const n = nums[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    parts.push(start === prev ? `[${start}]` : `[${start}]–[${prev}]`);
    start = n;
    prev = n;
  }
  return parts.join(", ");
}

export function matchPaper(papers: DiscoveredPaper[], rowTitle: string): DiscoveredPaper | undefined {
  const norm = normalizeTitle(rowTitle);
  return (
    papers.find((p) => normalizeTitle(p.title) === norm) ||
    papers.find((p) => normalizeTitle(p.title).includes(norm) || norm.includes(normalizeTitle(p.title)))
  );
}

function ieeeAuthors(authors: string[]): string {
  if (!authors.length || (authors.length === 1 && authors[0] === "Unknown")) return "Anonymous";
  const formatted = authors.slice(0, 6).map((name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ""))
      .join(" ");
    return `${initials} ${last}`.trim();
  });
  if (authors.length > 6) return `${formatted.join(", ")}, et al.`;
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
}

export function buildIeeeReferences(papers: DiscoveredPaper[]): ReferenceEntry[] {
  return papers.map((p, i) => {
    const authors = ieeeAuthors(p.authors);
    const year = p.year ?? "n.d.";
    const venue = p.venue && p.venue !== "Unknown venue" ? ` ${p.venue},` : "";
    const doi = p.doi ? ` doi: ${p.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : "";
    const key = `${(p.authors[0] || "Anon").split(/\s+/).pop()}${year}_${i + 1}`.replace(
      /[^A-Za-z0-9_]/g,
      ""
    );
    return {
      id: p.id,
      key,
      year: p.year,
      doi: p.doi,
      text: `[${i + 1}] ${authors}, “${p.title},”${venue} ${year}.${doi}`,
    };
  });
}
