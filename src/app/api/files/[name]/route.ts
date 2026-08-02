import { NextResponse } from "next/server";
import path from "path";
import { canReview, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};

/**
 * Owner-only file access. Uploads are ephemeral and typically deleted after
 * extraction, so this usually 404s — which is intentional for privacy.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const safe = path.basename(name);

  if (!safe || safe === "deleted://local") {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const submission = await prisma.submission.findFirst({
    where: { fileUrl: `/api/files/${safe}` },
    select: { userId: true },
  });

  if (!submission) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (submission.userId !== user.id && !canReview(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buffer = await readStoredFile(safe);
    const ext = path.extname(safe).toLowerCase();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safe}"`,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
