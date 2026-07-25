import { hasDropcontactKey, hasHunterKey } from "@/lib/env";
import { getMockEmail } from "@/lib/mock-people";

type EnrichInput = {
  firstName: string;
  lastName: string;
  companyDomain: string;
  fullName?: string;
};

type EnrichResult = {
  email: string;
  source: "hunter" | "dropcontact" | "mock";
  confidence?: number;
};

async function enrichWithHunter(input: EnrichInput): Promise<EnrichResult> {
  const params = new URLSearchParams({
    domain: input.companyDomain,
    first_name: input.firstName,
    last_name: input.lastName,
    api_key: process.env.HUNTER_API_KEY!,
  });

  const response = await fetch(
    `https://api.hunter.io/v2/email-finder?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Hunter enrichment failed (${response.status})`);
  }

  const data = (await response.json()) as {
    data?: { email?: string; score?: number };
  };

  if (!data.data?.email) {
    throw new Error("Hunter did not return an email");
  }

  return {
    email: data.data.email,
    source: "hunter",
    confidence: data.data.score,
  };
}

async function enrichWithDropcontact(input: EnrichInput): Promise<EnrichResult> {
  const response = await fetch("https://api.dropcontact.io/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Token": process.env.DROPCONTACT_API_KEY!,
    },
    body: JSON.stringify({
      data: [
        {
          first_name: input.firstName,
          last_name: input.lastName,
          website: input.companyDomain,
          company: input.companyDomain,
        },
      ],
      siren: false,
      language: "en",
    }),
  });

  if (!response.ok) {
    throw new Error(`Dropcontact enrichment failed (${response.status})`);
  }

  const data = (await response.json()) as {
    data?: Array<{ email?: Array<{ email?: string }> }>;
  };

  const email = data.data?.[0]?.email?.[0]?.email;
  if (!email) {
    throw new Error("Dropcontact did not return an email");
  }

  return { email, source: "dropcontact" };
}

export async function enrichEmail(input: EnrichInput): Promise<EnrichResult> {
  if (hasHunterKey()) {
    try {
      return await enrichWithHunter(input);
    } catch (error) {
      console.error("Hunter enrichment error, falling back:", error);
    }
  }

  if (hasDropcontactKey()) {
    try {
      return await enrichWithDropcontact(input);
    } catch (error) {
      console.error("Dropcontact enrichment error, falling back:", error);
    }
  }

  return {
    email: getMockEmail(input),
    source: "mock",
    confidence: 85,
  };
}
