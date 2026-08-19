import type { SourceType, SubmissionStatus } from "@/generated/prisma/client";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

export type ExtractedDocument = {
  text: string;
  pages: ExtractedPage[];
  pageCount: number;
  wordCount: number;
};

export type TextChunk = {
  chunkIndex: number;
  text: string;
  pageNumber: number;
  startChar: number;
  endChar: number;
};

export type Fingerprint = {
  hash: string;
  position: number;
  gramText: string;
};

export type SimilarityMatch = {
  sourceUrl: string | null;
  sourceTitle: string;
  sourceType: SourceType;
  similarityScore: number;
  matchedText: string;
  sourceText?: string;
  startChar: number;
  endChar: number;
  pageNumber: number;
  colorHex: string;
  isExactMatch: boolean;
  isQuote: boolean;
  isBibliography: boolean;
};

export type ReportFilters = {
  exactOnly: boolean;
  excludeQuotes: boolean;
  excludeBibliography: boolean;
  sourceTypes: SourceType[];
};

export type SubmissionListItem = {
  id: string;
  title: string;
  fileName: string;
  status: SubmissionStatus;
  overallSimilarityScore: number;
  createdAt: string;
  addToIndex: boolean;
  wordCount: number;
};
