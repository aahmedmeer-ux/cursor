import { NextResponse } from "next/server";
import { getCurrentUser, canReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
