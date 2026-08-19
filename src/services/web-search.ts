import type { SimilarityMatch } from "@/types";
import { colorForIndex } from "@/lib/utils";
import { tokenizeWords } from "@/services/text/normalize";

type ExternalSource = {
  title: string;
  url: string;
  text: string;
  sourceType: "WEB" | "JOURNAL";
  venue?: string;
  doi?: string;
  exactDoiMatch?: boolean;
};

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

const USER_AGENT =
  "OriginalityPlagiarismBot/1.0 (research; mailto:originality@example.com)";

const DOI_RE = /\b10\.\d{4,9}\/[^\s"'<>)+]+/gi;

function cleanDoi(raw: string): string {
  return raw
    .replace(/^\W+/, "")
    .replace(/[.,;:)\]]+$/g, "")
    .replace(/\.$/, "");
}

/** Pull DOIs embedded in PDFs (common in IEEE / journal articles). */
export function extractDois(text: string): string[] {
  const found = [...text.matchAll(DOI_RE)].map((m) => cleanDoi(m[0]));
  return [...new Set(found)].slice(0, 5);
}

/**
 * Build title candidates from early document text, stitching wrapped PDF lines.
 */
function extractTitleCandidates(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates: string[] = [];
  const skip =
    /^(https?:|www\.|doi\.org|abstract|introduction|keywords|article info|received:|©|creative commons|orcid)/i;

  // Stitch 1–3 consecutive lines that look like a wrapped title block
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    if (skip.test(lines[i])) continue;
    if (lines[i].length < 20) continue;
    if (/@/.test(lines[i])) continue; // email lines

    const parts = [lines[i]];
    for (let j = 1; j <= 2 && i + j < lines.length; j++) {
      const next = lines[i + j];
      if (!next || skip.test(next) || /@/.test(next)) break;
      if (next.length > 180) break;
      // Continue title if next line starts lowercase or is a short continuation
      if (/^[a-z]/.test(next) || next.length < 80 || parts.join(" ").length < 90) {
        parts.push(next);
      } else {
        break;
      }
    }
    const joined = parts.join(" ").replace(/\s+/g, " ").trim();
    if (joined.length >= 24 && joined.length <= 260) {
      candidates.push(joined);
    }
  }

  // Abstract-adjacent heuristic: text just before "Abstract"
  const absIdx = text.search(/\bAbstract\b/i);
  if (absIdx > 40) {
    const before = text
      .slice(Math.max(0, absIdx - 400), absIdx)
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l && !skip.test(l) && !/@/.test(l));
    if (before.length) {
      const stitched = before.slice(-3).join(" ").replace(/\s+/g, " ").trim();
      if (stitched.length >= 24 && stitched.length <= 260) {
        candidates.unshift(stitched);
      }
    }
  }

  return [...new Set(candidates)].slice(0, 8);
}

function extractAbstractSnippet(text: string): string {
  const m = text.match(
    /\bAbstract\b[:\s—-]*([\s\S]{80,1800}?)(?:\bKeywords?\b|\bI\.\s+Introduction\b|\b1\.\s+Introduction\b|\bIntroduction\b)/i,
  );
  return m?.[1]?.replace(/\s+/g, " ").trim() ?? text.slice(0, 1500);
}

function extractQueryPhrases(text: string, limit = 6): string[] {
  const abstract = extractAbstractSnippet(text);
  const pool = `${abstract}\n${text.slice(0, 5000)}`;
  const sentences = pool
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const n = tokenizeWords(s).length;
      return n >= 10 && n <= 40;
    });

  const ranked = sentences
    .map((s) => ({
      s,
      score: Math.min(tokenizeWords(s).length, 28),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit).map((r) => r.s.slice(0, 200));
}

function overlapScore(a: string, b: string): number {
  const ta = new Set(tokenizeWords(a));
  const tb = new Set(tokenizeWords(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

function titleSimilarity(a: string, b: string): number {
  const ta = tokenizeWords(a.replace(/[^a-z0-9\s]/gi, " "));
  const tb = tokenizeWords(b.replace(/[^a-z0-9\s]/gi, " "));
  if (!ta.length || !tb.length) return 0;
  const setA = new Set(ta);
  const setB = new Set(tb);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return (2 * inter) / (setA.size + setB.size);
}

function findBestSpan(
  haystack: string,
  needle: string,
): { start: number; end: number; matchedText: string } {
  const cleanNeedle = needle.trim();
  if (!cleanNeedle) {
    return {
      start: 0,
      end: Math.min(120, haystack.length),
      matchedText: haystack.slice(0, 120),
    };
  }

  const lowerHay = haystack.toLowerCase();
  const lowerNeedle = cleanNeedle.toLowerCase();
  const direct = lowerHay.indexOf(
    lowerNeedle.slice(0, Math.min(160, lowerNeedle.length)),
  );
  if (direct >= 0) {
    const end = Math.min(haystack.length, direct + Math.min(cleanNeedle.length, 500));
    return {
      start: direct,
      end,
      matchedText: haystack.slice(direct, end),
    };
  }

  const needleTokens = tokenizeWords(cleanNeedle);
  for (let n = Math.min(14, needleTokens.length); n >= 6; n--) {
    for (let i = 0; i <= needleTokens.length - n; i++) {
      const gram = needleTokens.slice(i, i + n).join(" ");
      const pos = lowerHay.indexOf(gram);
      if (pos >= 0) {
        const end = Math.min(haystack.length, pos + gram.length + 80);
        return {
          start: pos,
          end,
          matchedText: haystack.slice(pos, end),
        };
      }
    }
  }

  const absPos = haystack.search(/\bAbstract\b/i);
  if (absPos >= 0) {
    const chunk = haystack.slice(absPos, absPos + 400);
    return { start: absPos, end: absPos + chunk.length, matchedText: chunk };
  }

  const sentence =
    haystack.split(/(?<=[.!?])\s+/).find((s) => s.length > 40) ??
    haystack.slice(0, 160);
  const start = Math.max(0, haystack.indexOf(sentence));
  return {
    start,
    end: start + sentence.length,
    matchedText: sentence,
  };
}

function reconstructOpenAlexAbstract(
  inverted: Record<string, number[]> | null | undefined,
): string {
  if (!inverted) return "";
  const positions: Array<[number, string]> = [];
  for (const [word, idxs] of Object.entries(inverted)) {
    for (const i of idxs) positions.push([i, word]);
  }
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map(([, w]) => w).join(" ");
}

function mapOpenAlexWork(w: {
  display_name?: string;
  ids?: { doi?: string };
  primary_location?: {
    landing_page_url?: string | null;
    source?: { display_name?: string | null };
  } | null;
  abstract_inverted_index?: Record<string, number[]> | null;
}, exactDoiMatch = false): ExternalSource {
  const abstract = reconstructOpenAlexAbstract(w.abstract_inverted_index);
  const doi = w.ids?.doi?.replace(/^https?:\/\/doi\.org\//i, "");
  const landing =
    w.primary_location?.landing_page_url ||
    (doi ? `https://doi.org/${doi}` : "https://openalex.org");
  return {
    title: w.display_name ?? "Academic source",
    url: landing,
    text: abstract || w.display_name || "",
    sourceType: "JOURNAL",
    venue: w.primary_location?.source?.display_name ?? undefined,
    doi,
    exactDoiMatch,
  };
}

async function lookupOpenAlexByDoi(doi: string): Promise<ExternalSource | null> {
  const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}?mailto=originality@example.com`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Parameters<typeof mapOpenAlexWork>[0];
  if (!data?.display_name) return null;
  return mapOpenAlexWork(data, true);
}

async function lookupCrossrefByDoi(doi: string): Promise<ExternalSource | null> {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}?mailto=originality@example.com`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    message?: {
      title?: string[];
      DOI?: string;
      URL?: string;
      abstract?: string;
      "container-title"?: string[];
    };
  };
  const item = data.message;
  if (!item) return null;
  const abstract = (item.abstract ?? "").replace(/<[^>]+>/g, " ").trim();
  return {
    title: item.title?.[0] ?? "Crossref work",
    url: item.URL ?? `https://doi.org/${doi}`,
    text: abstract || item.title?.[0] || "",
    sourceType: "JOURNAL",
    venue: item["container-title"]?.[0],
    doi,
    exactDoiMatch: true,
  };
}

async function searchOpenAlex(query: string): Promise<ExternalSource[]> {
  const url =
    "https://api.openalex.org/works?" +
    new URLSearchParams({
      search: query.slice(0, 220),
      "per-page": "5",
      mailto: "originality@example.com",
    });

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    console.warn("OpenAlex search failed", res.status);
    return [];
  }

  const data = (await res.json()) as {
    results?: Array<Parameters<typeof mapOpenAlexWork>[0]>;
  };
  return (data.results ?? []).map((w) => mapOpenAlexWork(w, false));
}

async function searchCrossref(query: string): Promise<ExternalSource[]> {
  const url =
    "https://api.crossref.org/works?" +
    new URLSearchParams({
      "query.bibliographic": query.slice(0, 220),
      rows: "5",
      mailto: "originality@example.com",
    });

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    console.warn("Crossref search failed", res.status);
    return [];
  }

  const data = (await res.json()) as {
    message?: {
      items?: Array<{
        title?: string[];
        DOI?: string;
        URL?: string;
        abstract?: string;
        "container-title"?: string[];
      }>;
    };
  };

  return (data.message?.items ?? []).map((item) => {
    const abstract = (item.abstract ?? "").replace(/<[^>]+>/g, " ").trim();
    return {
      title: item.title?.[0] ?? "Crossref work",
      url: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : ""),
      text: abstract || item.title?.[0] || "",
      sourceType: "JOURNAL" as const,
      venue: item["container-title"]?.[0],
      doi: item.DOI,
    };
  });
}

async function serperSearch(query: string): Promise<ExternalSource[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: `"${query.slice(0, 140)}"`, num: 5 }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    console.warn("Serper search failed", res.status);
    return [];
  }

  const data = (await res.json()) as { organic?: SerperOrganic[] };
  return (data.organic ?? []).map((item) => ({
    title: item.title ?? "Web source",
    url: item.link ?? "",
    text: item.snippet ?? "",
    sourceType: "WEB" as const,
  }));
}

function sourceToMatch(
  documentText: string,
  source: ExternalSource,
  colorIdx: number,
): SimilarityMatch | null {
  if (!source.text && !source.title) return null;

  const titles = extractTitleCandidates(documentText);
  const titleScore = Math.max(
    0,
    ...titles.slice(0, 6).map((t) => titleSimilarity(t, source.title)),
    titleSimilarity(documentText.slice(0, 500), source.title),
  );

  const docAbstract = extractAbstractSnippet(documentText);
  const bodyOverlap = Math.max(
    overlapScore(docAbstract, source.text || source.title),
    overlapScore(documentText.slice(0, 10000), `${source.title}\n${source.text}`),
  );

  let similarityScore = Math.round(
    Math.max(bodyOverlap * 100, titleScore * 100 * 0.95),
  );

  // Exact DOI found in the uploaded PDF = definitive internet/publication hit
  if (source.exactDoiMatch) {
    similarityScore = Math.max(
      similarityScore,
      bodyOverlap >= 0.35 ? 97 : bodyOverlap >= 0.2 ? 92 : 88,
    );
  }

  if (titleScore >= 0.72) {
    similarityScore = Math.max(similarityScore, Math.round(78 + titleScore * 20));
  }
  if (titleScore >= 0.88 && bodyOverlap >= 0.25) {
    similarityScore = Math.max(similarityScore, 94);
  }
  if (titleScore >= 0.92 || (titleScore >= 0.8 && bodyOverlap >= 0.45)) {
    similarityScore = Math.max(similarityScore, 97);
  }

  if (!source.exactDoiMatch && similarityScore < 28 && titleScore < 0.55) {
    return null;
  }

  const spanSeed = source.text.length > 40 ? source.text : source.title;
  const span = findBestSpan(documentText, spanSeed);
  const labelVenue = source.venue ? ` — ${source.venue}` : "";

  return {
    sourceUrl: source.url || (source.doi ? `https://doi.org/${source.doi}` : null),
    sourceTitle: `${source.title}${labelVenue}`,
    sourceType: source.sourceType,
    similarityScore: Math.min(99, similarityScore),
    matchedText: span.matchedText,
    sourceText: source.text.slice(0, 700) || source.title,
    startChar: span.start,
    endChar: span.end,
    pageNumber: 1,
    colorHex: colorForIndex(colorIdx),
    isExactMatch:
      Boolean(source.exactDoiMatch) || titleScore >= 0.8 || bodyOverlap >= 0.55,
    isQuote: false,
    isBibliography: false,
  };
}

/**
 * Real external matching prioritized for published papers:
 * 1) DOI lookup (OpenAlex + Crossref) when DOI is in the PDF
 * 2) Title / phrase search on OpenAlex + Crossref
 * 3) Optional Serper Google results
 */
export async function findWebMatches(
  documentText: string,
): Promise<SimilarityMatch[]> {
  const dois = extractDois(documentText);
  const titles = extractTitleCandidates(documentText);
  const phrases = extractQueryPhrases(documentText, 4);

  const sources: ExternalSource[] = [];
  const seen = new Set<string>();

  const push = (src: ExternalSource | null | undefined) => {
    if (!src) return;
    const key = (src.doi || src.url || src.title).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sources.push(src);
  };

  // 1) Exact DOI resolution first — this is what makes IEEE/journal PDFs reliable
  for (const doi of dois.slice(0, 3)) {
    const [oa, cr] = await Promise.all([
      lookupOpenAlexByDoi(doi).catch(() => null),
      lookupCrossrefByDoi(doi).catch(() => null),
    ]);
    // Prefer the richer abstract text
    if (oa && cr) {
      push(oa.text.length >= cr.text.length ? oa : { ...cr, exactDoiMatch: true });
      // keep the other if different title host
      if (oa.title !== cr.title) push(oa.text.length >= cr.text.length ? cr : oa);
    } else {
      push(oa);
      push(cr);
    }
  }

  // 2) Title + sentence search
  const queries = [...titles.slice(0, 3), ...phrases.slice(0, 3)].filter(Boolean);
  for (const query of queries.slice(0, 4)) {
    const [oa, cr, web] = await Promise.all([
      searchOpenAlex(query).catch(() => []),
      searchCrossref(query).catch(() => []),
      serperSearch(query).catch(() => []),
    ]);
    for (const src of [...oa, ...cr, ...web]) push(src);
  }

  const matches: SimilarityMatch[] = [];
  let colorIdx = 0;
  for (const src of sources) {
    const match = sourceToMatch(documentText, src, colorIdx);
    if (!match) continue;
    matches.push(match);
    colorIdx++;
  }

  return dedupeMatches(matches).slice(0, 25);
}

function dedupeMatches(matches: SimilarityMatch[]): SimilarityMatch[] {
  const seen = new Set<string>();
  return matches
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .filter((m) => {
      const key = `${m.sourceType}:${m.sourceTitle.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
