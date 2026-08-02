import type { SimilarityMatch } from "@/types";
import { colorForIndex } from "@/lib/utils";
import { tokenizeWords } from "@/services/text/normalize";

type ExternalSource = {
  title: string;
  url: string;
  text: string;
  sourceType: "WEB" | "JOURNAL";
  venue?: string;
};

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

const USER_AGENT =
  "OriginalityPlagiarismBot/1.0 (research; mailto:originality@example.com)";

function extractTitleCandidates(text: string): string[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && l.length <= 220)
    .filter((l) => !/^(abstract|introduction|references|keywords)\b/i.test(l));

  const candidates = lines.slice(0, 8);
  // Also first sentence if it looks title-like
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 220) {
    candidates.unshift(firstSentence);
  }
  return [...new Set(candidates)].slice(0, 6);
}

function extractQueryPhrases(text: string, limit = 6): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      const n = tokenizeWords(s).length;
      return n >= 10 && n <= 45;
    });

  const ranked = sentences
    .map((s) => ({
      s,
      score:
        Math.min(tokenizeWords(s).length, 28) +
        (/[A-Z]{2,}/.test(s) ? 4 : 0) +
        (/\b(UAV|IEEE|neural|survey|algorithm|network)\b/i.test(s) ? 6 : 0),
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
    return { start: 0, end: Math.min(120, haystack.length), matchedText: haystack.slice(0, 120) };
  }

  // Prefer longest common phrase / direct substring
  const lowerHay = haystack.toLowerCase();
  const lowerNeedle = cleanNeedle.toLowerCase();
  const direct = lowerHay.indexOf(lowerNeedle.slice(0, Math.min(120, lowerNeedle.length)));
  if (direct >= 0) {
    const end = Math.min(haystack.length, direct + cleanNeedle.length);
    return {
      start: direct,
      end,
      matchedText: haystack.slice(direct, end),
    };
  }

  const needleTokens = tokenizeWords(cleanNeedle);
  for (let n = Math.min(12, needleTokens.length); n >= 6; n--) {
    for (let i = 0; i <= needleTokens.length - n; i++) {
      const gram = needleTokens.slice(i, i + n).join(" ");
      const pos = lowerHay.indexOf(gram);
      if (pos >= 0) {
        const end = Math.min(haystack.length, pos + gram.length + 40);
        return {
          start: pos,
          end,
          matchedText: haystack.slice(pos, end),
        };
      }
    }
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

async function searchOpenAlex(query: string): Promise<ExternalSource[]> {
  const url =
    "https://api.openalex.org/works?" +
    new URLSearchParams({
      search: query.slice(0, 200),
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
    results?: Array<{
      display_name?: string;
      ids?: { doi?: string };
      type?: string;
      primary_location?: {
        landing_page_url?: string | null;
        pdf_url?: string | null;
        source?: { display_name?: string | null };
      } | null;
      abstract_inverted_index?: Record<string, number[]> | null;
    }>;
  };

  return (data.results ?? []).map((w) => {
    const abstract = reconstructOpenAlexAbstract(w.abstract_inverted_index);
    const doi = w.ids?.doi;
    const landing =
      w.primary_location?.landing_page_url ||
      doi ||
      "https://openalex.org";
    const venue = w.primary_location?.source?.display_name ?? undefined;
    return {
      title: w.display_name ?? "Academic source",
      url: landing,
      text: abstract || w.display_name || "",
      sourceType: "JOURNAL" as const,
      venue,
    };
  });
}

async function searchCrossref(query: string): Promise<ExternalSource[]> {
  const url =
    "https://api.crossref.org/works?" +
    new URLSearchParams({
      "query.bibliographic": query.slice(0, 200),
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

/**
 * Optionally pull plaintext from an open PDF URL for stronger evidence.
 * Failures are ignored (paywalls / bot blocks are common).
 */
async function maybeFetchPdfSnippet(pdfUrl: string): Promise<string> {
  try {
    if (!pdfUrl) return "";
    const res = await fetch(pdfUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return "";
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("pdf") && !ctype.includes("octet-stream")) return "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000 || buf.length > 8_000_000) return "";
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText({ first: 1, last: 2 });
      return (result.text || "").slice(0, 4000);
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  } catch {
    return "";
  }
}

function sourceToMatch(
  documentText: string,
  source: ExternalSource,
  colorIdx: number,
  titleBoost = 0,
): SimilarityMatch | null {
  if (!source.text && !source.title) return null;

  const titleScore = Math.max(
    ...extractTitleCandidates(documentText)
      .slice(0, 4)
      .map((t) => titleSimilarity(t, source.title)),
    titleSimilarity(documentText.slice(0, 300), source.title),
  );

  const bodyOverlap = overlapScore(
    documentText.slice(0, 8000),
    `${source.title}\n${source.text}`,
  );

  // Strong title hit on a published work = clear internet/publication match
  let similarityScore = Math.round(
    Math.max(bodyOverlap * 100, titleScore * 100 * 0.95) + titleBoost,
  );

  if (titleScore >= 0.72) {
    similarityScore = Math.max(similarityScore, Math.round(78 + titleScore * 20));
  }
  if (titleScore >= 0.88 && bodyOverlap >= 0.25) {
    similarityScore = Math.max(similarityScore, 92);
  }
  if (titleScore >= 0.92) {
    similarityScore = Math.max(similarityScore, 96);
  }

  if (similarityScore < 28 && titleScore < 0.55) return null;

  const spanSeed =
    source.text.length > 40
      ? source.text
      : source.title;
  const span = findBestSpan(documentText, spanSeed);

  const labelVenue = source.venue ? ` — ${source.venue}` : "";
  return {
    sourceUrl: source.url || null,
    sourceTitle: `${source.title}${labelVenue}`,
    sourceType: source.sourceType,
    similarityScore: Math.min(99, similarityScore),
    matchedText: span.matchedText,
    sourceText: source.text.slice(0, 500) || source.title,
    startChar: span.start,
    endChar: span.end,
    pageNumber: 1,
    colorHex: colorForIndex(colorIdx),
    isExactMatch: titleScore >= 0.8 || bodyOverlap >= 0.55,
    isQuote: false,
    isBibliography: false,
  };
}

/**
 * Real external matching:
 * 1) OpenAlex academic graph (IEEE, journals, OA abstracts)
 * 2) Crossref DOI registry
 * 3) Optional Serper Google search when SERPER_API_KEY is set
 */
export async function findWebMatches(
  documentText: string,
): Promise<SimilarityMatch[]> {
  const titles = extractTitleCandidates(documentText);
  const phrases = extractQueryPhrases(documentText, 5);
  const queries = [...titles.slice(0, 2), ...phrases.slice(0, 3)].filter(Boolean);

  const sources: ExternalSource[] = [];
  const seen = new Set<string>();

  // Parallel provider fan-out for the top queries
  for (const query of queries.slice(0, 4)) {
    const [oa, cr, web] = await Promise.all([
      searchOpenAlex(query).catch(() => []),
      searchCrossref(query).catch(() => []),
      serperSearch(query).catch(() => []),
    ]);

    for (const src of [...oa, ...cr, ...web]) {
      const key = `${src.title.toLowerCase()}|${src.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push(src);
    }
  }

  // Enrich top OpenAlex-like hits with open PDF text when available via URL heuristics
  const enriched: ExternalSource[] = [];
  for (const src of sources.slice(0, 8)) {
    let text = src.text;
    if (src.url.includes("pdf") || src.url.includes("ieeexplore")) {
      const extra = await maybeFetchPdfSnippet(src.url);
      if (extra.length > text.length) text = extra;
    }
    enriched.push({ ...src, text });
  }

  const matches: SimilarityMatch[] = [];
  let colorIdx = 0;
  for (const src of enriched.length ? enriched : sources) {
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
