import type { ExtractedDocument, TextChunk } from "@/types";

export type ChunkOptions = {
  /** Target words per chunk (sliding window). */
  windowWords?: number;
  /** Overlap words between consecutive windows. */
  overlapWords?: number;
  /** Prefer paragraph boundaries when available. */
  preferParagraphs?: boolean;
};

const DEFAULTS: Required<ChunkOptions> = {
  windowWords: 250,
  overlapWords: 50,
  preferParagraphs: true,
};

function pageForOffset(doc: ExtractedDocument, offset: number): number {
  let cursor = 0;
  for (const page of doc.pages) {
    const next = cursor + page.text.length + 2; // account for join "\n\n"
    if (offset < next) return page.pageNumber;
    cursor = next;
  }
  return doc.pages[doc.pages.length - 1]?.pageNumber ?? 1;
}

function chunkByParagraphs(fullText: string, doc: ExtractedDocument): TextChunk[] {
  const chunks: TextChunk[] = [];
  const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  let searchFrom = 0;

  paragraphs.forEach((para) => {
    const trimmed = para.trim();
    const startChar = fullText.indexOf(trimmed, searchFrom);
    if (startChar < 0) return;
    const endChar = startChar + trimmed.length;
    searchFrom = endChar;
    chunks.push({
      chunkIndex: chunks.length,
      text: trimmed,
      pageNumber: pageForOffset(doc, startChar),
      startChar,
      endChar,
    });
  });

  return chunks;
}

function chunkBySlidingWindow(
  fullText: string,
  doc: ExtractedDocument,
  windowWords: number,
  overlapWords: number,
): TextChunk[] {
  const tokens = fullText.split(/(\s+)/);
  const wordIndexes: number[] = [];
  let charPos = 0;

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      charPos += token.length;
      continue;
    }
    wordIndexes.push(charPos);
    charPos += token.length;
  }

  if (wordIndexes.length === 0) return [];

  const step = Math.max(1, windowWords - overlapWords);
  const chunks: TextChunk[] = [];

  for (let startWord = 0; startWord < wordIndexes.length; startWord += step) {
    const endWord = Math.min(wordIndexes.length, startWord + windowWords);
    const startChar = wordIndexes[startWord];
    const endChar =
      endWord < wordIndexes.length
        ? wordIndexes[endWord]
        : fullText.length;
    const text = fullText.slice(startChar, endChar).trim();
    if (!text) continue;

    chunks.push({
      chunkIndex: chunks.length,
      text,
      pageNumber: pageForOffset(doc, startChar),
      startChar,
      endChar: startChar + text.length,
    });

    if (endWord >= wordIndexes.length) break;
  }

  return chunks;
}

/**
 * Chunk document into paragraphs when reasonable, otherwise 250-word sliding windows.
 */
export function chunkDocument(
  doc: ExtractedDocument,
  options?: ChunkOptions,
): TextChunk[] {
  const opts = { ...DEFAULTS, ...options };
  const fullText = doc.text;

  if (!fullText.trim()) return [];

  if (opts.preferParagraphs) {
    const paras = chunkByParagraphs(fullText, doc);
    const avgWords =
      paras.reduce((n, c) => n + c.text.split(/\s+/).length, 0) /
      Math.max(paras.length, 1);

    // If paragraphs are tiny or huge, fall back to sliding windows
    if (paras.length >= 2 && avgWords >= 40 && avgWords <= 400) {
      return paras;
    }
  }

  return chunkBySlidingWindow(
    fullText,
    doc,
    opts.windowWords,
    opts.overlapWords,
  );
}
