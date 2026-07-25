import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { enrichEmail } from "@/lib/enrich-email";
import { unlockDemoContact, listDemoContacts } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  fullName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  companyDomain: z.string().min(1),
  linkedinUrl: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid contact payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  if (user.credits < 1) {
    return NextResponse.json(
      { error: "Insufficient credits. Purchase more on the Billing page." },
      { status: 402 }
    );
  }

  // Return existing unlock without charging again
  if (user.isDemo || !isSupabaseConfigured()) {
    const existing = (await listDemoContacts(user.id)).find(
      (c) =>
        c.person_name === payload.fullName &&
        (c.company ?? "") === (payload.company ?? "")
    );
    if (existing) {
      return NextResponse.json({
        email: existing.email,
        contact: existing,
        balance: user.credits,
        alreadyUnlocked: true,
      });
    }
  } else {
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("unlocked_contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("person_name", payload.fullName)
      .eq("company", payload.company ?? "")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        email: existing.email,
        contact: existing,
        balance: user.credits,
        alreadyUnlocked: true,
      });
    }
  }

  const enriched = await enrichEmail({
    firstName: payload.firstName,
    lastName: payload.lastName,
    companyDomain: payload.companyDomain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    fullName: payload.fullName,
  });

  if (user.isDemo || !isSupabaseConfigured()) {
    try {
      const { contact, balance } = await unlockDemoContact(user.id, {
        person_name: payload.fullName,
        job_title: payload.jobTitle ?? null,
        company: payload.company ?? null,
        email: enriched.email,
        linkedin_url: payload.linkedinUrl ?? null,
      });

      return NextResponse.json({
        email: enriched.email,
        contact,
        balance,
        source: enriched.source,
        alreadyUnlocked: false,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to unlock contact";
      const status = message.includes("Insufficient") ? 402 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  }

  const supabase = await createClient();
  const { data: contact, error } = await supabase.rpc(
    "unlock_contact_transaction",
    {
      p_person_name: payload.fullName,
      p_job_title: payload.jobTitle ?? null,
      p_company: payload.company ?? null,
      p_email: enriched.email,
      p_linkedin_url: payload.linkedinUrl ?? null,
    }
  );

  if (error) {
    const status = error.message.includes("Insufficient") ? 402 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  const { data: credits } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    email: enriched.email,
    contact,
    balance: credits?.balance ?? user.credits - 1,
    source: enriched.source,
    alreadyUnlocked: false,
  });
}
