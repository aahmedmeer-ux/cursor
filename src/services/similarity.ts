import { isRepositoryIndexingAllowed } from "@/lib/privacy";
import { prisma } from "@/lib/prisma";
import { colorForIndex } from "@/lib/utils";
import { cosineSimilarity } from "@/services/embeddings";
import { jaccardSimilarity, winnowFingerprints } from "@/services/fingerprinting";
import { looksLikeBibliography, looksLikeQuote } from "@/services/text/normalize";
import { findWebMatches } from "@/services/web-search";
import type { SimilarityMatch, TextChunk } from "@/types";

/** When privacy mode is on, only the synthetic seed corpus is comparable. */
function indexedSubmissionFilter() {
  const base = { addToIndex: true as const, status: "COMPLETED" as const };
  if (!isRepositoryIndexingAllowed()) {
    return { ...base, fileName: "seed-climate.txt" };
  }
  return base;
}

type IndexedChunk = {
  submissionId: string;
  title: string;
  chunkIndex: number;
  text: string;
  pageNumber: number;
  embedding: number[] | null;
};

/**
 * Hybrid similarity engine:
 * 1) Exact n-gram / winnowing fingerprint overlap against indexed submissions
 * 2) Semantic cosine similarity of chunk embeddings
 * 3) External web search fallback (Serper or simulated)
 */
export async function runHybridSimilarity(params: {
  submissionId: string;
  fullText: string;
  chunks: TextChunk[];
  embeddings: number[][];
  fingerprints: { hash: string; position: number; gramText: string }[];
}): Promise<{ matches: SimilarityMatch[]; overallScore: number }> {
  const { submissionId, fullText, chunks, embeddings, fingerprints } = params;

  const exactMatches = await findExactMatches(submissionId, fullText, fingerprints);
  const semanticMatches = await findSemanticMatches(
    submissionId,
    chunks,
    embeddings,
  );
  const webMatches = await findWebMatches(fullText);

  const merged = mergeMatches([
    ...exactMatches,
    ...semanticMatches,
    ...webMatches,
  ]);

  // Annotate quote / bibliography heuristics
  for (const match of merged) {
    match.isQuote = match.isQuote || looksLikeQuote(match.matchedText);
    match.isBibliography =
      match.isBibliography || looksLikeBibliography(match.matchedText);
  }

  const overallScore = computeOverallScore(fullText, merged);
  return { matches: merged, overallScore };
}

async function findExactMatches(
  submissionId: string,
  fullText: string,
  fingerprints: { hash: string; position: number; gramText: string }[],
): Promise<SimilarityMatch[]> {
  if (fingerprints.length === 0) return [];

  const hashes = fingerprints.map((f) => f.hash);
  const hits = await prisma.documentFingerprint.findMany({
    where: {
      hash: { in: hashes },
      submissionId: { not: submissionId },
      submission: indexedSubmissionFilter(),
    },
    include: {
      submission: { select: { id: true, title: true, fileName: true } },
    },
    take: 500,
  });

  if (hits.length === 0) return [];

  // Group by source submission
  const bySource = new Map<string, typeof hits>();
  for (const hit of hits) {
    const list = bySource.get(hit.submissionId) ?? [];
    list.push(hit);
    bySource.set(hit.submissionId, list);
  }

  const queryHashes = fingerprints.map((f) => f.hash);
  const matches: SimilarityMatch[] = [];
  let colorIdx = 0;

  for (const [sourceId, sourceHits] of bySource) {
    const sourceHashes = sourceHits.map((h) => h.hash);
    const score = Math.round(jaccardSimilarity(queryHashes, sourceHashes) * 100);
    if (score < 8) continue;

    const sample = sourceHits[0];
    const gram = sample.gramText;
    const start = fullText.toLowerCase().indexOf(gram.toLowerCase());
    const startChar = start >= 0 ? start : 0;
    const matchedText =
      start >= 0
        ? fullText.slice(startChar, startChar + Math.max(gram.length, 100))
        : gram;

    matches.push({
      sourceUrl: `/submissions/${sourceId}`,
      sourceTitle: `Student repository — ${sample.submission.title}`,
      sourceType: "INTERNAL_REPO",
      similarityScore: Math.min(99, score + 15),
      matchedText,
      sourceText: gram,
      startChar,
      endChar: startChar + matchedText.length,
      pageNumber: 1,
      colorHex: colorForIndex(colorIdx++),
      isExactMatch: true,
      isQuote: false,
      isBibliography: false,
    });
  }

  return matches;
}

async function findSemanticMatches(
  submissionId: string,
  chunks: TextChunk[],
  embeddings: number[][],
): Promise<SimilarityMatch[]> {
  const indexed = await prisma.documentChunk.findMany({
    where: {
      submissionId: { not: submissionId },
      embeddingId: { not: null },
      submission: indexedSubmissionFilter(),
    },
    include: {
      submission: { select: { id: true, title: true } },
    },
    take: 400,
  });

  const corpus: IndexedChunk[] = indexed.map((row) => ({
    submissionId: row.submissionId,
    title: row.submission.title,
    chunkIndex: row.chunkIndex,
    text: row.text,
    pageNumber: row.pageNumber,
    embedding: Array.isArray(row.embedding)
      ? (row.embedding as number[])
      : null,
  }));

  const matches: SimilarityMatch[] = [];
  let colorIdx = 20;

  for (let i = 0; i < chunks.length; i++) {
    const emb = embeddings[i];
    if (!emb) continue;

    let best: { chunk: IndexedChunk; score: number } | null = null;
    for (const other of corpus) {
      if (!other.embedding) continue;
      const score = cosineSimilarity(emb, other.embedding);
      if (!best || score > best.score) {
        best = { chunk: other, score };
      }
    }

    if (!best || best.score < 0.78) continue;

    matches.push({
      sourceUrl: `/submissions/${best.chunk.submissionId}`,
      sourceTitle: `Student repository — ${best.chunk.title}`,
      sourceType: "INTERNAL_REPO",
      similarityScore: Math.round(best.score * 100),
      matchedText: chunks[i].text.slice(0, 280),
      sourceText: best.chunk.text.slice(0, 280),
      startChar: chunks[i].startChar,
      endChar: chunks[i].endChar,
      pageNumber: chunks[i].pageNumber,
      colorHex: colorForIndex(colorIdx++),
      isExactMatch: false,
      isQuote: false,
      isBibliography: false,
    });
  }

  return matches;
}

function mergeMatches(matches: SimilarityMatch[]): SimilarityMatch[] {
  // Sort by score desc, drop heavy overlaps of the same span
  const sorted = [...matches].sort(
    (a, b) => b.similarityScore - a.similarityScore,
  );
  const kept: SimilarityMatch[] = [];

  for (const candidate of sorted) {
    const overlaps = kept.some((k) => {
      const overlap =
        Math.min(k.endChar, candidate.endChar) -
        Math.max(k.startChar, candidate.startChar);
      const span = Math.max(
        1,
        Math.min(
          k.endChar - k.startChar,
          candidate.endChar - candidate.startChar,
        ),
      );
      return overlap / span > 0.6 && k.sourceTitle === candidate.sourceTitle;
    });
    if (!overlaps) {
      // Re-assign stable colors by keep order
      candidate.colorHex = colorForIndex(kept.length);
      kept.push(candidate);
    }
  }

  return kept.slice(0, 40);
}

/** Coverage-weighted overall similarity (matched unique chars / total chars). */
export function computeOverallScore(
  fullText: string,
  matches: SimilarityMatch[],
): number {
  if (!fullText || matches.length === 0) return 0;
  const covered = new Array<boolean>(fullText.length).fill(false);

  for (const match of matches) {
    const weight = match.similarityScore / 100;
    if (weight < 0.25) continue;
    const start = Math.max(0, match.startChar);
    const end = Math.min(fullText.length, match.endChar);
    for (let i = start; i < end; i++) covered[i] = true;
  }

  const coveredCount = covered.reduce((n, v) => n + (v ? 1 : 0), 0);
  const ratio = coveredCount / fullText.length;
  // Blend coverage with top match strength
  const top = matches[0]?.similarityScore ?? 0;
  return Math.round(Math.min(100, ratio * 85 + top * 0.15));
}

/** Seed a small publication corpus so first-run demos show journal matches. */
export async function ensureSeedCorpus(ownerUserId: string): Promise<void> {
  const existing = await prisma.submission.findFirst({
    where: { title: "Seed — Climate systems primer" },
  });
  if (existing) return;

  const text =
    "The greenhouse effect is a natural process that warms the Earth's surface. When the Sun's energy reaches the Earth's atmosphere, some of it is reflected back to space and the rest is absorbed and re-radiated by greenhouse gases. Machine learning algorithms build a model based on sample data, known as training data, in order to make predictions or decisions without being explicitly programmed to do so. Academic integrity is the moral code or ethical policy of academia.";

  const submission = await prisma.submission.create({
    data: {
      userId: ownerUserId,
      title: "Seed — Climate systems primer",
      fileName: "seed-climate.txt",
      fileUrl: "/api/files/seed-climate.txt",
      mimeType: "text/plain",
      extractedText: text,
      status: "COMPLETED",
      overallSimilarityScore: 0,
      addToIndex: true,
      wordCount: text.split(/\s+/).length,
      pageCount: 1,
    },
  });

  const fps = winnowFingerprints(text);
  if (fps.length) {
    await prisma.documentFingerprint.createMany({
      data: fps.map((fp) => ({
        submissionId: submission.id,
        hash: fp.hash,
        position: fp.position,
        gramText: fp.gramText,
      })),
      skipDuplicates: true,
    });
  }

  const { embedText } = await import("@/services/embeddings");
  const embedding = await embedText(text);
  await prisma.documentChunk.create({
    data: {
      submissionId: submission.id,
      chunkIndex: 0,
      text,
      pageNumber: 1,
      startChar: 0,
      endChar: text.length,
      embeddingId: `${submission.id}:0`,
      embedding,
    },
  });
}
