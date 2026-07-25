import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { searchPeople } from "@/lib/people-search";
import { listDemoContacts } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  jobTitle: z.string().optional(),
  companyDomain: z.string().optional(),
  industry: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    jobTitle: searchParams.get("jobTitle") ?? undefined,
    companyDomain: searchParams.get("companyDomain") ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const filters = parsed.data;
  if (!filters.jobTitle && !filters.companyDomain && !filters.industry) {
    return NextResponse.json(
      { error: "Provide at least one filter" },
      { status: 400 }
    );
  }

  const { results, source } = await searchPeople(filters);

  // Mark already-unlocked contacts for this user
  let unlockedKeys = new Set<string>();
  if (user.isDemo || !isSupabaseConfigured()) {
    const contacts = await listDemoContacts(user.id);
    unlockedKeys = new Set(
      contacts.map((c) => `${c.person_name}|${c.company ?? ""}`.toLowerCase())
    );
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("unlocked_contacts")
      .select("person_name, company")
      .eq("user_id", user.id);
    unlockedKeys = new Set(
      (data ?? []).map(
        (c) => `${c.person_name}|${c.company ?? ""}`.toLowerCase()
      )
    );
  }

  const enriched = results.map((person) => {
    const key = `${person.fullName}|${person.company}`.toLowerCase();
    const unlocked = unlockedKeys.has(key);
    return { ...person, unlocked };
  });

  return NextResponse.json({ results: enriched, source, count: enriched.length });
}
