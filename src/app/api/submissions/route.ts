import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";
import { isAllowedUpload } from "@/services/extraction";
import { enqueueProcessing } from "@/services/pipeline";

export async function GET() {
  const user = await getCurrentUser();
  const where = {
    ...(user.role === "STUDENT" ? { userId: user.id } : {}),
    // Hide internal seed corpus from history lists
    NOT: { fileName: "seed-climate.txt" },
  };

  const submissions = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileName: true,
      status: true,
      overallSimilarityScore: true,
      createdAt: true,
      addToIndex: true,
      wordCount: true,
      user: { select: { email: true, name: true } },
    },
  });

  return NextResponse.json({ submissions });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const form = await request.formData();
    const file = form.get("file");
    const title = String(form.get("title") ?? "").trim();
    const addToIndex = String(form.get("addToIndex") ?? "true") !== "false";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!isAllowedUpload(file.name, file.type)) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are supported" },
        { status: 400 },
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File exceeds 20MB limit" },
        { status: 400 },
      );
    }

    const stored = await saveUpload(file, file.name);

    const submission = await prisma.submission.create({
      data: {
        userId: user.id,
        title: title || file.name,
        fileName: file.name,
        fileUrl: stored.fileUrl,
        mimeType: file.type || "application/octet-stream",
        status: "PENDING",
        addToIndex,
      },
    });

    enqueueProcessing(submission.id);

    return NextResponse.json({ id: submission.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
