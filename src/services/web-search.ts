import type { SimilarityMatch } from "@/types";
import { colorForIndex } from "@/lib/utils";
import { tokenizeWords } from "@/services/text/normalize";

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

/**
 * External web matching via Serper.dev (Google results).
 * Falls back to a simulated corpus when SERPER_API_KEY is unset.
 */
const SIMULATED_CORPUS: Array<{
  title: string;
  url: string;
  text: string;
}> = [
  {
    title: "Wikipedia — Academic integrity",
    url: "https://en.wikipedia.org/wiki/Academic_integrity",
    text: "Academic integrity is the moral code or ethical policy of academia. This includes values such as avoidance of cheating or plagiarism, maintenance of academic standards, honesty and rigor in research and academic publishing.",
  },
  {
    title: "Purdue OWL — Plagiarism overview",
    url: "https://owl.purdue.edu/owl/avoiding_plagiarism/index.html",
    text: "Plagiarism is using someone else's ideas or words without giving them proper credit. Plagiarism can take many forms, including copying text, paraphrasing without citation, and reusing prior work.",
  },
  {
    title: "Nature — Machine learning survey",
    url: "https://www.nature.com/articles/machine-learning-overview",
    text: "Machine learning algorithms build a model based on sample data, known as training data, in order to make predictions or decisions without being explicitly programmed to do so.",
  },
  {
    title: "Stanford Encyclopedia — Consciousness",
    url: "https://plato.stanford.edu/entries/consciousness/",
    text: "Explaining the nature of consciousness is one of the most important and perplexing areas of philosophy, but the concept is notoriously ambiguous.",
  },
  {
    title: "OpenStax — Climate systems",
    url: "https://openstax.org/books/climate",
    text: "The greenhouse effect is a natural process that warms the Earth's surface. When the Sun's energy reaches the Earth's atmosphere, some of it is reflected back to space and the rest is absorbed and re-radiated by greenhouse gases.",
  },
];

function extractQueryPhrases(text: string, limit = 5): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => tokenizeWords(s).length >= 8);

  // Prefer mid-length informative sentences
  const ranked = sentences
    .map((s) => ({ s, score: Math.min(tokenizeWords(s).length, 30) }))
    .sort((a, b) => b.score - a.score);

  const phrases: string[] = [];
  for (const row of ranked) {
    if (phrases.length >= limit) break;
    phrases.push(row.s.slice(0, 180));
  }
  return phrases;
}

function overlapScore(a: string, b: string): number {
  const ta = new Set(tokenizeWords(a));
  const tb = new Set(tokenizeWords(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

async function serperSearch(query: string): Promise<SerperOrganic[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!res.ok) {
    console.warn("Serper search failed", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as { organic?: SerperOrganic[] };
  return data.organic ?? [];
}

function findSpan(haystack: string, needle: string): { start: number; end: number } {
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase().slice(0, 80));
  if (idx >= 0) {
    return { start: idx, end: Math.min(haystack.length, idx + needle.length) };
  }
  // Fallback: first substantial sentence
  const sentence = haystack.split(/(?<=[.!?])\s+/).find((s) => s.length > 40) ?? haystack.slice(0, 120);
  const start = haystack.indexOf(sentence);
  return { start: Math.max(0, start), end: Math.max(0, start) + sentence.length };
}

export async function findWebMatches(
  documentText: string,
): Promise<SimilarityMatch[]> {
  const phrases = extractQueryPhrases(documentText);
  const matches: SimilarityMatch[] = [];
  let colorIdx = 0;

  if (process.env.SERPER_API_KEY) {
    for (const phrase of phrases.slice(0, 4)) {
      const organic = await serperSearch(phrase);
      for (const item of organic.slice(0, 2)) {
        const snippet = item.snippet ?? "";
        const score = Math.round(overlapScore(phrase, snippet) * 100);
        if (score < 25) continue;
        const span = findSpan(documentText, phrase);
        matches.push({
          sourceUrl: item.link ?? null,
          sourceTitle: item.title ?? "Web source",
          sourceType: "WEB",
          similarityScore: Math.min(98, score + 10),
          matchedText: documentText.slice(span.start, span.end),
          sourceText: snippet,
          startChar: span.start,
          endChar: span.end,
          pageNumber: 1,
          colorHex: colorForIndex(colorIdx++),
          isExactMatch: score > 70,
          isQuote: false,
          isBibliography: false,
        });
      }
    }
    return dedupeMatches(matches);
  }

  // Simulated web corpus (dev only): require an exact 7-gram hit so ordinary
  // student papers are not falsely inflated by soft topical overlap.
  for (const source of SIMULATED_CORPUS) {
    const sourceTokens = tokenizeWords(source.text);
    let bestGram = "";
    let bestPos = -1;
    for (let i = 0; i < sourceTokens.length - 6; i++) {
      const gram = sourceTokens.slice(i, i + 7).join(" ");
      const pos = documentText.toLowerCase().indexOf(gram);
      if (pos >= 0) {
        bestGram = documentText.slice(pos, pos + gram.length + 20);
        bestPos = pos;
        break;
      }
    }

    if (bestPos < 0) continue;

    const matchedText = documentText.slice(
      bestPos,
      bestPos + Math.max(bestGram.length, 80),
    );
    const score = Math.round(overlapScore(matchedText, source.text) * 100);

    matches.push({
      sourceUrl: source.url,
      sourceTitle: source.title,
      sourceType: "WEB",
      similarityScore: Math.min(95, Math.max(score, 55)),
      matchedText,
      sourceText: source.text,
      startChar: bestPos,
      endChar: bestPos + matchedText.length,
      pageNumber: 1,
      colorHex: colorForIndex(colorIdx++),
      isExactMatch: true,
      isQuote: false,
      isBibliography: false,
    });
  }

  return dedupeMatches(matches);
}

function dedupeMatches(matches: SimilarityMatch[]): SimilarityMatch[] {
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = `${m.sourceTitle}:${m.startChar}:${m.endChar}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
