-- CreateEnum
CREATE TYPE "AiLabel" AS ENUM ('HUMAN', 'MIXED', 'AI');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "aiLabel" "AiLabel" NOT NULL DEFAULT 'HUMAN',
ADD COLUMN     "aiScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "aiSummary" TEXT;

-- CreateTable
CREATE TABLE "AiSegment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "startChar" INTEGER NOT NULL,
    "endChar" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSegment_submissionId_idx" ON "AiSegment"("submissionId");

-- AddForeignKey
ALTER TABLE "AiSegment" ADD CONSTRAINT "AiSegment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
