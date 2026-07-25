import { hasApolloKey, hasPdlKey } from "@/lib/env";
import { maskEmail, guessEmail } from "@/lib/mask-email";
import { searchMockPeople } from "@/lib/mock-people";
import type { PersonResult, SearchFilters } from "@/types";

type SearchResponse = {
  results: PersonResult[];
  source: "pdl" | "apollo" | "mock";
};

function slugId(parts: string[]) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function searchWithPdl(filters: SearchFilters): Promise<PersonResult[]> {
  const must: Record<string, unknown>[] = [];
  if (filters.jobTitle) {
    must.push({
      match: { job_title: filters.jobTitle },
    });
  }
  if (filters.companyDomain) {
    must.push({
      match: { job_company_website: filters.companyDomain },
    });
  }
  if (filters.industry) {
    must.push({
      match: { industry: filters.industry },
    });
  }

  const response = await fetch("https://api.peopledatalabs.com/v5/person/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.PDL_API_KEY!,
    },
    body: JSON.stringify({
      query: { bool: { must } },
      size: 20,
      dataset: "all",
    }),
  });

  if (!response.ok) {
    throw new Error(`PDL search failed (${response.status})`);
  }

  const data = (await response.json()) as {
    data?: Array<{
      id?: string;
      full_name?: string;
      first_name?: string;
      last_name?: string;
      job_title?: string;
      job_company_name?: string;
      job_company_website?: string;
      industry?: string;
      linkedin_url?: string;
      work_email?: string;
    }>;
  };

  return (data.data ?? []).map((person, index) => {
    const firstName = person.first_name ?? "Unknown";
    const lastName = person.last_name ?? "";
    const domain =
      person.job_company_website?.replace(/^https?:\/\//, "").replace(/\/$/, "") ??
      "example.com";
    const email =
      person.work_email ?? guessEmail(firstName, lastName || "contact", domain);

    return {
      id: person.id ?? slugId(["pdl", firstName, lastName, domain, String(index)]),
      fullName: person.full_name ?? `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      jobTitle: person.job_title ?? "Professional",
      company: person.job_company_name ?? domain,
      companyDomain: domain,
      industry: person.industry ?? "Unknown",
      linkedinUrl: person.linkedin_url ?? null,
      maskedEmail: maskEmail(email),
    };
  });
}

async function searchWithApollo(filters: SearchFilters): Promise<PersonResult[]> {
  const response = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": process.env.APOLLO_API_KEY!,
    },
    body: JSON.stringify({
      page: 1,
      per_page: 20,
      person_titles: filters.jobTitle ? [filters.jobTitle] : undefined,
      q_organization_domains_list: filters.companyDomain
        ? [filters.companyDomain]
        : undefined,
      organization_industry_tag_ids: undefined,
      q_keywords: filters.industry || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Apollo search failed (${response.status})`);
  }

  const data = (await response.json()) as {
    people?: Array<{
      id?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      title?: string;
      organization?: { name?: string; primary_domain?: string; industry?: string };
      linkedin_url?: string;
      email?: string;
    }>;
  };

  return (data.people ?? []).map((person, index) => {
    const firstName = person.first_name ?? "Unknown";
    const lastName = person.last_name ?? "";
    const domain = person.organization?.primary_domain ?? "example.com";
    const email =
      person.email ?? guessEmail(firstName, lastName || "contact", domain);

    return {
      id: person.id ?? slugId(["apollo", firstName, lastName, domain, String(index)]),
      fullName: person.name ?? `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      jobTitle: person.title ?? "Professional",
      company: person.organization?.name ?? domain,
      companyDomain: domain,
      industry: person.organization?.industry ?? filters.industry ?? "Unknown",
      linkedinUrl: person.linkedin_url ?? null,
      maskedEmail: maskEmail(email),
    };
  });
}

export async function searchPeople(filters: SearchFilters): Promise<SearchResponse> {
  if (hasPdlKey()) {
    try {
      const results = await searchWithPdl(filters);
      return { results, source: "pdl" };
    } catch (error) {
      console.error("PDL search error, falling back:", error);
    }
  }

  if (hasApolloKey()) {
    try {
      const results = await searchWithApollo(filters);
      return { results, source: "apollo" };
    } catch (error) {
      console.error("Apollo search error, falling back:", error);
    }
  }

  return { results: searchMockPeople(filters), source: "mock" };
}
