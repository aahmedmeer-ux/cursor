import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { enrichEmail } from "@/lib/enrich-email";
import { unlockDemoContact, listDemoContacts } from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const contactSchema = z.object({
  fullName: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  companyDomain: z.string().min(1),
  linkedinUrl: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
});

const bodySchema = z.union([
  contactSchema,
  z.object({ contacts: z.array(contactSchema).min(1).max(25) }),
]);

async function unlockOne(
  user: Awaited<ReturnType<typeof getCurrentUser>> & object,
  payload: z.infer<typeof contactSchema>
) {
  if (!user) throw new Error("Unauthorized");

  if (user.isDemo || !isSupabaseConfigured()) {
    const existing = (await listDemoContacts(user.id)).find(
      (c) =>
        c.person_name === payload.fullName &&
        (c.company ?? "") === (payload.company ?? "")
    );
    if (existing) {
      return {
        email: existing.email,
        phone: existing.phone,
        contact: existing,
        alreadyUnlocked: true,
        charged: false,
      };
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
      return {
        email: existing.email,
        phone: existing.phone,
        contact: existing,
        alreadyUnlocked: true,
        charged: false,
      };
    }
  }

  const enriched = await enrichEmail({
    firstName: payload.firstName,
    lastName: payload.lastName,
    companyDomain: payload.companyDomain
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, ""),
    fullName: payload.fullName,
  });

  if (user.isDemo || !isSupabaseConfigured()) {
    const { contact, balance } = await unlockDemoContact(user.id, {
      person_name: payload.fullName,
      job_title: payload.jobTitle ?? null,
      company: payload.company ?? null,
      email: enriched.email,
      phone: enriched.phone,
      linkedin_url: payload.linkedinUrl ?? null,
      location: payload.location ?? null,
    });
    return {
      email: enriched.email,
      phone: enriched.phone,
      contact,
      balance,
      source: enriched.source,
      alreadyUnlocked: false,
      charged: true,
    };
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
      p_phone: enriched.phone,
      p_location: payload.location ?? null,
    }
  );

  if (error) throw new Error(error.message);

  const { data: credits } = await supabase
    .from("user_credits")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  return {
    email: enriched.email,
    phone: enriched.phone,
    contact,
    balance: credits?.balance,
    source: enriched.source,
    alreadyUnlocked: false,
    charged: true,
  };
}

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

  const contacts =
    "contacts" in parsed.data ? parsed.data.contacts : [parsed.data];

  if (user.credits < 1) {
    return NextResponse.json(
      { error: "Insufficient credits. Purchase more on the Billing page." },
      { status: 402 }
    );
  }

  try {
    if (contacts.length === 1) {
      const result = await unlockOne(user, contacts[0]);
      return NextResponse.json(result);
    }

    const unlocked = [];
    let balance = user.credits;
    for (const contact of contacts) {
      if (balance < 1) break;
      const result = await unlockOne(
        { ...user, credits: balance },
        contact
      );
      unlocked.push(result);
      if (typeof result.balance === "number") balance = result.balance;
      else if (result.charged) balance -= 1;
    }

    return NextResponse.json({
      results: unlocked,
      balance,
      unlockedCount: unlocked.filter((r) => r.charged).length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to unlock contact";
    const status = message.includes("Insufficient") ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
