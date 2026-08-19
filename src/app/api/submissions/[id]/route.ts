import { NextResponse } from "next/server";
import { getCurrentUser, canReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/storage";
import { enqueueProcessing } from "@/services/pipeline";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      matches: { orderBy: { similarityScore: "desc" } },
      aiSegments: { orderBy: { score: "desc" } },
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (submission.userId !== user.id && !canReview(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(submission);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const submission = await prisma.submission.findUnique({ where: { id } });

  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.userId !== user.id && !canReview(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteStoredFile(submission.fileUrl);
  await prisma.submission.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
  };

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (submission.userId !== user.id && !canReview(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (body.action === "reprocess") {
    await prisma.submission.update({
      where: { id },
      data: { status: "PENDING", errorMessage: null },
    });
    enqueueProcessing(id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "purge-content") {
    // Keep the report metadata, wipe retained text + index artifacts
    await prisma.documentFingerprint.deleteMany({ where: { submissionId: id } });
    await prisma.documentChunk.deleteMany({ where: { submissionId: id } });
    await prisma.aiSegment.deleteMany({ where: { submissionId: id } });
    await prisma.matchResult.deleteMany({ where: { submissionId: id } });
    await deleteStoredFile(submission.fileUrl);
    await prisma.submission.update({
      where: { id },
      data: {
        extractedText: null,
        fileUrl: "deleted://local",
        addToIndex: false,
        overallSimilarityScore: 0,
        aiScore: 0,
        aiLabel: "HUMAN",
        aiSummary: "Content purged by user.",
        status: "COMPLETED",
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
