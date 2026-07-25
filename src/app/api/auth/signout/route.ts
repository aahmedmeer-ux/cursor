import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  }

  response.cookies.set(DEMO_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
