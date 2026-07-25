import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { searchPeople } from "@/lib/people-search";
import { listDemoContacts } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  name: z.string().optional(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
  companyDomain: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  seniority: z.string().optional(),
  department: z.string().optional(),
  companySize: z.string().optional(),
  keywords: z.string().optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    name: searchParams.get("name") ?? undefined,
    jobTitle: searchParams.get("jobTitle") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    companyDomain: searchParams.get("companyDomain") ?? undefined,
    industry: searchParams.get("industry") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    seniority: searchParams.get("seniority") ?? undefined,
    department: searchParams.get("department") ?? undefined,
    companySize: searchParams.get("companySize") ?? undefined,
    keywords: searchParams.get("keywords") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters" }, { status: 400 });
  }

  const filters = parsed.data;
  const { results, source } = await searchPeople(filters);

  let unlockedMap = new Map<string, { email: string; phone: string | null }>();
  if (user.isDemo || !isSupabaseConfigured()) {
    const contacts = await listDemoContacts(user.id);
    unlockedMap = new Map(
      contacts.map((c) => [
        `${c.person_name}|${c.company ?? ""}`.toLowerCase(),
        { email: c.email, phone: c.phone },
      ])
    );
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("unlocked_contacts")
      .select("person_name, company, email, phone")
      .eq("user_id", user.id);
    unlockedMap = new Map(
      (data ?? []).map((c) => [
        `${c.person_name}|${c.company ?? ""}`.toLowerCase(),
        { email: c.email, phone: c.phone ?? null },
      ])
    );
  }

  const enriched = results.map((person) => {
    const key = `${person.fullName}|${person.company}`.toLowerCase();
    const unlocked = unlockedMap.get(key);
    if (!unlocked) return { ...person, unlocked: false };
    return {
      ...person,
      unlocked: true,
      email: unlocked.email,
      phone: unlocked.phone ?? undefined,
    };
  });

  return NextResponse.json({
    results: enriched,
    source,
    count: enriched.length,
  });
}
