import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDemoUser } from "@/lib/demo-store";
import { DEMO_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

const bodySchema = z.object({
  email: z.string().email().optional(),
});

export async function POST(request: Request) {
  if (isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Demo auth is disabled when Supabase is configured." },
      { status: 400 }
    );
  }

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email ?? "demo@leadunlock.app";
  const user = await getOrCreateDemoUser(email);

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      credits: user.balance,
    },
  });

  response.cookies.set(DEMO_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
