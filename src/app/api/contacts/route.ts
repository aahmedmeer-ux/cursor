import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listDemoContacts } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.isDemo || !isSupabaseConfigured()) {
    const contacts = await listDemoContacts(user.id);
    return NextResponse.json({ contacts });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unlocked_contacts")
    .select("*")
    .eq("user_id", user.id)
    .order("unlocked_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ contacts: data ?? [] });
}
