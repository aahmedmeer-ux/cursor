import type { DiscoveredPaper } from "./types";
import { normalizeTitle } from "./citations";

type Enrichment = {
  authors: string[];
  year: number | null;
  venue: string;
  doi: string | null;
  url: string | null;
  citedBy?: number;
};

function titleSimilarity(a: string, b: string): number {
  const na = new Set(normalizeTitle(a).split(" ").filter((w) => w.length > 2));
  const nb = new Set(normalizeTitle(b).split(" ").filter((w) => w.length > 2));
  if (!na.size || !nb.size) return 0;
  let inter = 0;
  for (const w of na) if (nb.has(w)) inter++;
  return inter / Math.max(na.size, nb.size);
}

function needsEnrichment(p: DiscoveredPaper): boolean {
  const badAuthors =
    !p.authors.length ||
    p.authors.every((a) => /^(unknown|anonymous|anon|n\/a)$/i.test(a.trim())) ||
    p.authors.every((a) => /\bet\s+al\.?\b/i.test(a) && a.trim().split(/\s+/).length <= 4);
  const badVenue = !p.venue || /^unknown/i.test(p.venue);
  // Prefer online bibliographic completion whenever DOI/venue/authors are weak
  return badAuthors || badVenue || !p.doi || !p.year;
}

async function lookupCrossref(title: string): Promise<Enrichment | null> {
  try {
    const url = new URL("https://api.crossref.org/works");
    url.searchParams.set("query.bibliographic", title.slice(0, 200));
    url.searchParams.set("rows", "5");
    url.searchParams.set("select", "title,author,published-print,published-online,container-title,DOI,URL,issued");

    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "SurveyForge/1.0 (mailto:surveyforge@example.com)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      message?: {
        items?: {
          title?: string[];
          author?: { given?: string; family?: string }[];
          DOI?: string;
          URL?: string;
          "container-title"?: string[];
          issued?: { "date-parts"?: number[][] };
        }[];
      };
    };

    let best: Enrichment | null = null;
    let bestScore = 0.72;
    for (const item of data.message?.items ?? []) {
      const itemTitle = item.title?.[0] || "";
      const score = titleSimilarity(title, itemTitle);
      if (score < bestScore) continue;
      // Guard against loose matches on short/generic titles
      if (normalizeTitle(title).length > 20 && score < 0.8 && normalizeTitle(itemTitle) !== normalizeTitle(title)) {
        continue;
      }
      const authors = (item.author ?? [])
        .map((a) => [a.given, a.family].filter(Boolean).join(" ").trim())
        .filter(Boolean);
      if (!authors.length) continue;
      const year = item.issued?.["date-parts"]?.[0]?.[0] ?? null;
      best = {
        authors,
        year,
        venue: item["container-title"]?.[0] || "",
        doi: item.DOI ? `https://doi.org/${item.DOI}` : null,
        url: item.URL || (item.DOI ? `https://doi.org/${item.DOI}` : null),
      };
      bestScore = score;
    }
    return best;
  } catch {
    return null;
  }
}

async function lookupSemanticScholar(title: string): Promise<Enrichment | null> {
  try {
    const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
    url.searchParams.set("query", title.slice(0, 200));
    url.searchParams.set("limit", "5");
    url.searchParams.set("fields", "title,authors,year,venue,externalIds,url,citationCount");
    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: {
        title?: string;
        authors?: { name?: string }[];
        year?: number;
        venue?: string;
        externalIds?: { DOI?: string };
        url?: string;
        citationCount?: number;
      }[];
    };
    let best: Enrichment | null = null;
    let bestScore = 0.7;
    for (const item of data.data ?? []) {
      const score = titleSimilarity(title, item.title || "");
      if (score < bestScore) continue;
      const authors = (item.authors ?? []).map((a) => a.name || "").filter(Boolean);
      if (!authors.length) continue;
      best = {
        authors,
        year: item.year ?? null,
        venue: item.venue || "",
        doi: item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : null,
        url: item.url || null,
        citedBy: item.citationCount,
      };
      bestScore = score;
    }
    return best;
  } catch {
    return null;
  }
}

async function lookupOpenAlex(title: string): Promise<Enrichment | null> {
  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", title.slice(0, 200));
    url.searchParams.set("per_page", "5");
    url.searchParams.set("mailto", "surveyforge@example.com");

    const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: {
        display_name?: string;
        publication_year?: number;
        doi?: string;
        cited_by_count?: number;
        primary_location?: { source?: { display_name?: string }; landing_page_url?: string };
        authorships?: { author?: { display_name?: string } }[];
      }[];
    };

    let best: Enrichment | null = null;
    let bestScore = 0.72;
    for (const work of data.results ?? []) {
      const workTitle = work.display_name || "";
      const score = titleSimilarity(title, workTitle);
      if (score < bestScore) continue;
      if (normalizeTitle(title).length > 20 && score < 0.8 && normalizeTitle(workTitle) !== normalizeTitle(title)) {
        continue;
      }
      const authors = (work.authorships ?? [])
        .map((a) => a.author?.display_name ?? "")
        .filter(Boolean);
      if (!authors.length) continue;
      best = {
        authors,
        year: work.publication_year ?? null,
        venue: work.primary_location?.source?.display_name || "",
        doi: work.doi ?? null,
        url: work.primary_location?.landing_page_url ?? work.doi ?? null,
        citedBy: work.cited_by_count,
      };
      bestScore = score;
    }
    return best;
  } catch {
    return null;
  }
}

function mergePaper(p: DiscoveredPaper, e: Enrichment): DiscoveredPaper {
  const weakAuthors =
    !p.authors.length ||
    p.authors.every((a) => /^(unknown|anonymous|anon|n\/a)$/i.test(a.trim())) ||
    p.authors.every((a) => /\bet\s+al\.?\b/i.test(a));
  return {
    ...p,
    // Prefer complete online author lists when matrix only has "X et al."
    authors: e.authors.length && weakAuthors ? e.authors : p.authors.length ? p.authors : e.authors,
    year: p.year || e.year,
    venue: !p.venue || /^unknown/i.test(p.venue) ? e.venue || p.venue : p.venue,
    doi: p.doi || e.doi,
    url: p.url || e.url,
    citedBy: Math.max(p.citedBy || 0, e.citedBy || 0),
    relevanceScore: Math.max(p.relevanceScore, 0.9),
  };
}

/**
 * Look up bibliographic metadata online (Crossref + OpenAlex) so references
 * are journal-ready instead of Anonymous / Unknown venue.
 */
export async function enrichPaperMetadata(
  papers: DiscoveredPaper[],
  options?: { concurrency?: number }
): Promise<{ papers: DiscoveredPaper[]; enrichedCount: number; warnings: string[] }> {
  const warnings: string[] = [];
  const concurrency = options?.concurrency ?? 3;
  let enrichedCount = 0;
  const out = [...papers];

  const targets = out
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => needsEnrichment(p));

  for (let i = 0; i < targets.length; i += concurrency) {
    const batch = targets.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async ({ p, i: idx }) => {
        const cross = await lookupCrossref(p.title);
        const oa = cross?.authors?.length ? null : await lookupOpenAlex(p.title);
        const ss =
          cross?.authors?.length || oa?.authors?.length
            ? null
            : await lookupSemanticScholar(p.title);
        const hit = cross || oa || ss;
        if (hit?.authors?.length) {
          out[idx] = mergePaper(p, hit);
          enrichedCount++;
        } else if (needsEnrichment(p)) {
          warnings.push(`Could not enrich bibliographic details for “${p.title.slice(0, 80)}”.`);
        }
      })
    );
  }

  return { papers: out, enrichedCount, warnings };
}
