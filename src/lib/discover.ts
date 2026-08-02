import type { DiscoveredPaper, MatrixRow } from "./types";

type OpenAlexWork = {
  id: string;
  display_name?: string;
  publication_year?: number;
  cited_by_count?: number;
  doi?: string;
  primary_location?: { source?: { display_name?: string }; landing_page_url?: string };
  authorships?: { author?: { display_name?: string } }[];
  abstract_inverted_index?: Record<string, number[]>;
  concepts?: { display_name?: string; score?: number }[];
};

function reconstructAbstract(index?: Record<string, number[]>): string {
  if (!index) return "";
  const pairs: [number, string][] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) pairs.push([pos, word]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs.map(([, w]) => w).join(" ");
}

function matrixToDiscovered(rows: MatrixRow[]): DiscoveredPaper[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    authors: row.authors
      ? row.authors.split(/;|,|\sand\s/).map((a) => a.trim()).filter(Boolean)
      : ["Unknown"],
    year: row.year,
    venue: row.venue || "Unknown venue",
    abstract: [row.findings, row.method, row.notes].filter(Boolean).join(" "),
    doi: row.doi || null,
    url: row.url || null,
    citedBy: 0,
    source: "matrix" as const,
    relevanceScore: 1,
    themes: row.themes
      .split(/[;,|/]/)
      .map((t) => t.trim())
      .filter(Boolean),
  }));
}

async function searchOpenAlex(query: string, perPage = 5): Promise<DiscoveredPaper[]> {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("sort", "cited_by_count:desc");
  url.searchParams.set("mailto", "surveyforge@example.com");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`OpenAlex error ${res.status}`);
  }

  const data = (await res.json()) as { results?: OpenAlexWork[] };
  return (data.results ?? []).map((work, i) => {
    const themes = (work.concepts ?? [])
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 4)
      .map((c) => c.display_name ?? "")
      .filter(Boolean);

    return {
      id: `oa-${work.id?.split("/").pop() ?? i}`,
      title: work.display_name ?? "Untitled",
      authors: (work.authorships ?? [])
        .map((a) => a.author?.display_name ?? "")
        .filter(Boolean)
        .slice(0, 8),
      year: work.publication_year ?? null,
      venue: work.primary_location?.source?.display_name ?? "Unknown venue",
      abstract: reconstructAbstract(work.abstract_inverted_index).slice(0, 1200),
      doi: work.doi ?? null,
      url: work.primary_location?.landing_page_url ?? work.doi ?? null,
      citedBy: work.cited_by_count ?? 0,
      source: "openalex" as const,
      relevanceScore: 0.75 + Math.min((work.cited_by_count ?? 0) / 5000, 0.2),
      themes,
    };
  });
}

async function searchSemanticScholar(query: string, limit = 5): Promise<DiscoveredPaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "title,authors,year,venue,abstract,externalIds,url,citationCount"
  );

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    data?: {
      paperId: string;
      title?: string;
      authors?: { name?: string }[];
      year?: number;
      venue?: string;
      abstract?: string;
      externalIds?: { DOI?: string };
      url?: string;
      citationCount?: number;
    }[];
  };

  return (data.data ?? []).map((p) => ({
    id: `ss-${p.paperId}`,
    title: p.title ?? "Untitled",
    authors: (p.authors ?? []).map((a) => a.name ?? "").filter(Boolean),
    year: p.year ?? null,
    venue: p.venue ?? "Unknown venue",
    abstract: (p.abstract ?? "").slice(0, 1200),
    doi: p.externalIds?.DOI ?? null,
    url: p.url ?? null,
    citedBy: p.citationCount ?? 0,
    source: "semanticscholar" as const,
    relevanceScore: 0.7,
    themes: [],
  }));
}

function dedupePapers(papers: DiscoveredPaper[]): DiscoveredPaper[] {
  const seen = new Set<string>();
  const out: DiscoveredPaper[] = [];
  for (const p of papers) {
    const key = (p.doi || p.title).toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export async function discoverLiterature(options: {
  rows: MatrixRow[];
  queries: string[];
  maxResults: number;
}): Promise<{ papers: DiscoveredPaper[]; warnings: string[] }> {
  const warnings: string[] = [];
  const fromMatrix = matrixToDiscovered(options.rows);
  const online: DiscoveredPaper[] = [];

  const queries = options.queries.slice(0, 5);
  const perQuery = Math.max(2, Math.ceil(options.maxResults / Math.max(queries.length, 1)));

  for (const query of queries) {
    try {
      const oa = await searchOpenAlex(query, perQuery);
      online.push(...oa);
    } catch (err) {
      warnings.push(`OpenAlex unavailable for “${query}”: ${err instanceof Error ? err.message : "error"}`);
      try {
        const ss = await searchSemanticScholar(query, perQuery);
        online.push(...ss);
      } catch {
        warnings.push(`Semantic Scholar fallback failed for “${query}”.`);
      }
    }
  }

  const papers = dedupePapers([...fromMatrix, ...online])
    .sort((a, b) => b.relevanceScore - a.relevanceScore || b.citedBy - a.citedBy)
    .slice(0, options.maxResults + fromMatrix.length);

  return { papers, warnings };
}

export { matrixToDiscovered };
