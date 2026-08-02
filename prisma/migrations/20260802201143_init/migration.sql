-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'INSTRUCTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('WEB', 'INTERNAL_REPO', 'JOURNAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extractedText" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "overallSimilarityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "addToIndex" BOOLEAN NOT NULL DEFAULT true,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "startChar" INTEGER NOT NULL DEFAULT 0,
    "endChar" INTEGER NOT NULL DEFAULT 0,
    "embeddingId" TEXT,
    "embedding" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceTitle" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "matchedText" TEXT NOT NULL,
    "sourceText" TEXT,
    "startChar" INTEGER NOT NULL,
    "endChar" INTEGER NOT NULL,
    "pageNumber" INTEGER NOT NULL DEFAULT 1,
    "colorHex" TEXT NOT NULL,
    "isExactMatch" BOOLEAN NOT NULL DEFAULT false,
    "isQuote" BOOLEAN NOT NULL DEFAULT false,
    "isBibliography" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFingerprint" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "gramText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFingerprint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "Submission_createdAt_idx" ON "Submission"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentChunk_submissionId_idx" ON "DocumentChunk"("submissionId");

-- CreateIndex
CREATE INDEX "DocumentChunk_embeddingId_idx" ON "DocumentChunk"("embeddingId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_submissionId_chunkIndex_key" ON "DocumentChunk"("submissionId", "chunkIndex");

-- CreateIndex
CREATE INDEX "MatchResult_submissionId_idx" ON "MatchResult"("submissionId");

-- CreateIndex
CREATE INDEX "MatchResult_sourceType_idx" ON "MatchResult"("sourceType");

-- CreateIndex
CREATE INDEX "MatchResult_similarityScore_idx" ON "MatchResult"("similarityScore");

-- CreateIndex
CREATE INDEX "DocumentFingerprint_hash_idx" ON "DocumentFingerprint"("hash");

-- CreateIndex
CREATE INDEX "DocumentFingerprint_submissionId_idx" ON "DocumentFingerprint"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFingerprint_submissionId_hash_position_key" ON "DocumentFingerprint"("submissionId", "hash", "position");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFingerprint" ADD CONSTRAINT "DocumentFingerprint_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
