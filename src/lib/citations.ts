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

/**
 * Compact IEEE-style multi-cite.
 * Uses ASCII hyphen for ranges ([1]-[3]) so PDF Helvetica never substitutes `_`.
 */
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

  const parts: string[] = [];
  let start = nums[0];
  let prev = nums[0];
  for (let i = 1; i <= nums.length; i++) {
    const n = nums[i];
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    // Prefer comma lists for two items; hyphen range for 3+ contiguous
    if (start === prev) parts.push(`[${start}]`);
    else if (prev === start + 1) parts.push(`[${start}], [${prev}]`);
    else parts.push(`[${start}]-[${prev}]`);
    start = n;
    prev = n;
  }
  return parts.join(", ");
}

/** Repair broken citation separators introduced by fonts/humanize (e.g. [13]_[14]). */
export function sanitizeCitationMarkers(text: string): string {
  return text
    .replace(/\]\s*[_\uFF3F/\\|]+\s*\[/g, "]-[")
    .replace(/\]\s*[–—−]+\s*\[/g, "]-[")
    .replace(/\[(\d+)\]\s*-\s*\[(\d+)\]/g, "[$1]-[$2]")
    .replace(/\[(\d+)\]\s*,\s*,\s*\[/g, "[$1], [")
    .replace(/\bAnonymous,\s*/gi, "")
    .replace(/\bAnonymous\b/gi, "");
}

export function matchPaper(papers: DiscoveredPaper[], rowTitle: string): DiscoveredPaper | undefined {
  const norm = normalizeTitle(rowTitle);
  if (!norm) return undefined;
  return (
    papers.find((p) => normalizeTitle(p.title) === norm) ||
    papers.find((p) => {
      const pt = normalizeTitle(p.title);
      return pt.includes(norm) || norm.includes(pt);
    })
  );
}

function isBadAuthor(name: string): boolean {
  const n = name.trim().toLowerCase();
  return (
    !n ||
    n === "unknown" ||
    n === "anonymous" ||
    n === "anon" ||
    n === "n/a" ||
    n === "na" ||
    n === "author name" ||
    n === "et al" ||
    n === "et al."
  );
}

function ieeeAuthors(authors: string[]): string {
  const cleaned = authors
    .map((a) => a.trim().replace(/\s+\d{4}\s*$/, "").replace(/\s+/g, " "))
    .filter((a) => !isBadAuthor(a));
  if (!cleaned.length) return "";

  // "Smith et al." / "Smith et al" kept readable (do not initial-mangle)
  if (cleaned.length === 1 && /\bet\s+al\.?\b/i.test(cleaned[0])) {
    const base = cleaned[0].replace(/\bet\s+al\.?\b/i, "et al.").replace(/\.\./g, ".");
    return base;
  }

  const formatted = cleaned.slice(0, 6).map((name) => {
    if (/\bet\s+al\.?\b/i.test(name)) {
      return name.replace(/\bet\s+al\.?\b/i, "et al.").replace(/\s+\d{4}\s*$/, "");
    }
    // Already "A. B. Last" style
    if (/^[A-Z]\.(?:\s*[A-Z]\.)*\s+\S+/.test(name)) return name;
    const parts = name.replace(/,/g, " ").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const last = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((p) => (p[0] ? `${p[0].toUpperCase()}.` : ""))
      .filter(Boolean)
      .join(" ");
    return `${initials} ${last}`.trim();
  });
  if (cleaned.length > 6) return `${formatted.join(", ")}, et al.`;
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted[formatted.length - 1]}`;
}

export function buildIeeeReferences(papers: DiscoveredPaper[]): ReferenceEntry[] {
  return papers.map((p, i) => {
    const authors = ieeeAuthors(p.authors);
    const year = p.year ?? "n.d.";
    const venue =
      p.venue && !/^unknown/i.test(p.venue) ? ` ${p.venue},` : "";
    const doi = p.doi ? ` doi: ${p.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}` : "";
    const authorBit = authors ? `${authors}, ` : "";
    const firstAuthor = authors.split(/[\s,]/)[0] || "Ref";
    const key = `${firstAuthor}${year}_${i + 1}`.replace(/[^A-Za-z0-9_]/g, "");
    return {
      id: p.id,
      key,
      year: p.year,
      doi: p.doi,
      text: sanitizeCitationMarkers(`[${i + 1}] ${authorBit}“${p.title},”${venue} ${year}.${doi}`),
    };
  });
}

export function sanitizePaperTextDeep<T extends { abstract?: string; sections?: { content: string }[]; references?: { text: string }[] }>(
  paper: T
): T {
  return {
    ...paper,
    abstract: paper.abstract ? sanitizeCitationMarkers(paper.abstract) : paper.abstract,
    sections: paper.sections?.map((s) => ({
      ...s,
      content: sanitizeCitationMarkers(s.content),
    })),
    references: paper.references?.map((r) => ({
      ...r,
      text: sanitizeCitationMarkers(r.text.replace(/\bAnonymous\b/gi, "").replace(/^(\[\d+\])\s*,/, "$1")),
    })),
  };
}
