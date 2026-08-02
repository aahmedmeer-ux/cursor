import { prisma } from "@/lib/prisma";
import { resolveStoredPath } from "@/lib/storage";
import { chunkDocument } from "@/services/chunking";
import { embedTexts } from "@/services/embeddings";
import { extractDocument } from "@/services/extraction";
import { winnowFingerprints } from "@/services/fingerprinting";
import { ensureSeedCorpus, runHybridSimilarity } from "@/services/similarity";

/**
 * End-to-end originality pipeline for a submission:
 * extract → chunk → fingerprint → embed → hybrid match → persist results
 */
export async function processSubmission(submissionId: string): Promise<void> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "PROCESSING", errorMessage: null },
  });

  try {
    await ensureSeedCorpus(submission.userId);

    const absolutePath = resolveStoredPath(submission.fileUrl);
    const extracted = await extractDocument(
      absolutePath,
      submission.fileName,
      submission.mimeType,
    );

    if (!extracted.text.trim()) {
      throw new Error("No extractable text found in document");
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        extractedText: extracted.text,
        wordCount: extracted.wordCount,
        pageCount: extracted.pageCount,
      },
    });

    // Reset prior derived data (re-process safe)
    await prisma.matchResult.deleteMany({ where: { submissionId } });
    await prisma.documentChunk.deleteMany({ where: { submissionId } });
    await prisma.documentFingerprint.deleteMany({ where: { submissionId } });

    const chunks = chunkDocument(extracted);
    const embeddings = await embedTexts(chunks.map((c) => c.text));

    if (chunks.length > 0) {
      await prisma.documentChunk.createMany({
        data: chunks.map((chunk, i) => ({
          submissionId,
          chunkIndex: chunk.chunkIndex,
          text: chunk.text,
          pageNumber: chunk.pageNumber,
          startChar: chunk.startChar,
          endChar: chunk.endChar,
          embeddingId: `${submissionId}:${chunk.chunkIndex}`,
          embedding: embeddings[i] ?? [],
        })),
      });
    }

    const fingerprints = winnowFingerprints(extracted.text);
    if (fingerprints.length > 0) {
      await prisma.documentFingerprint.createMany({
        data: fingerprints.map((fp) => ({
          submissionId,
          hash: fp.hash,
          position: fp.position,
          gramText: fp.gramText,
        })),
        skipDuplicates: true,
      });
    }

    const { matches, overallScore } = await runHybridSimilarity({
      submissionId,
      fullText: extracted.text,
      chunks,
      embeddings,
      fingerprints,
    });

    if (matches.length > 0) {
      await prisma.matchResult.createMany({
        data: matches.map((m) => ({
          submissionId,
          sourceUrl: m.sourceUrl,
          sourceTitle: m.sourceTitle,
          sourceType: m.sourceType,
          similarityScore: m.similarityScore,
          matchedText: m.matchedText,
          sourceText: m.sourceText,
          startChar: m.startChar,
          endChar: m.endChar,
          pageNumber: m.pageNumber,
          colorHex: m.colorHex,
          isExactMatch: m.isExactMatch,
          isQuote: m.isQuote,
          isBibliography: m.isBibliography,
        })),
      });
    }

    // If check-only, remove fingerprints/chunks from the searchable index
    if (!submission.addToIndex) {
      await prisma.documentFingerprint.deleteMany({ where: { submissionId } });
      await prisma.documentChunk.deleteMany({ where: { submissionId } });
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: "COMPLETED",
        overallSimilarityScore: overallScore,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw error;
  }
}

/** Fire-and-forget processing for API routes (errors persist on the submission). */
export function enqueueProcessing(submissionId: string): void {
  void processSubmission(submissionId).catch((err) => {
    console.error(`Processing failed for ${submissionId}`, err);
  });
}
