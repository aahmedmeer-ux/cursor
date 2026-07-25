import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addDemoCredits } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    balance: user.credits,
    email: user.email,
    isDemo: user.isDemo,
  });
}

/** Demo / placeholder top-up (no real payments). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount ?? 10);
  if (![10, 50, 100].includes(amount)) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  if (user.isDemo || !isSupabaseConfigured()) {
    const balance = await addDemoCredits(user.id, amount);
    return NextResponse.json({ balance, added: amount });
  }

  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (readError || !current) {
    return NextResponse.json({ error: "Credits not found" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_credits")
    .update({ balance: current.balance + amount, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .select("balance")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ balance: data.balance, added: amount });
}
