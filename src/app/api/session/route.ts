import { NextResponse } from "next/server";
import { setCurrentUserId, ensureDemoUsers } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const { student, instructor } = await ensureDemoUsers();
  const allowed = new Set([student.id, instructor.id]);
  if (!allowed.has(body.userId)) {
    return NextResponse.json({ error: "Unknown user" }, { status: 404 });
  }

  await setCurrentUserId(body.userId);
  return NextResponse.json({ ok: true });
}
