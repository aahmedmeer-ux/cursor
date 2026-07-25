import { hasApolloKey, hasPdlKey } from "@/lib/env";
import { maskEmail } from "@/lib/mask-email";
import { guessEmail } from "@/lib/mask-email";
import { searchMockPeople } from "@/lib/mock-people";
import type { PersonResult, SearchFilters, SeniorityLevel } from "@/types";

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

function maskPhone(phone: string) {
  return phone.replace(/\d(?=\d{4})/g, "*");
}

function normalizePerson(partial: {
  id?: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  companyDomain: string;
  industry: string;
  location?: string;
  seniority?: SeniorityLevel;
  department?: string;
  companySize?: string;
  skills?: string[];
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  email?: string;
  phone?: string;
  emailConfidence?: number;
  index: number;
}): PersonResult {
  const domain = partial.companyDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const email =
    partial.email ??
    guessEmail(partial.firstName, partial.lastName || "contact", domain);
  const phone = partial.phone ?? "+1 (555) 010-0000";

  return {
    id:
      partial.id ??
      slugId([
        "ext",
        partial.firstName,
        partial.lastName,
        domain,
        String(partial.index),
      ]),
    fullName: partial.fullName,
    firstName: partial.firstName,
    lastName: partial.lastName,
    jobTitle: partial.jobTitle,
    company: partial.company,
    companyDomain: domain,
    industry: partial.industry,
    location: partial.location ?? "Unknown",
    seniority: partial.seniority ?? "Senior",
    department: partial.department ?? "General",
    companySize: partial.companySize ?? "Unknown",
    skills: partial.skills ?? [],
    linkedinUrl: partial.linkedinUrl ?? null,
    twitterUrl: partial.twitterUrl ?? null,
    maskedEmail: maskEmail(email),
    maskedPhone: maskPhone(phone),
    emailConfidence: partial.emailConfidence ?? 75,
  };
}

async function searchWithPdl(filters: SearchFilters): Promise<PersonResult[]> {
  const must: Record<string, unknown>[] = [];
  if (filters.name) must.push({ match: { full_name: filters.name } });
  if (filters.jobTitle) must.push({ match: { job_title: filters.jobTitle } });
  if (filters.companyDomain) {
    must.push({ match: { job_company_website: filters.companyDomain } });
  }
  if (filters.company) must.push({ match: { job_company_name: filters.company } });
  if (filters.industry) must.push({ match: { industry: filters.industry } });
  if (filters.location) must.push({ match: { location_name: filters.location } });

  const response = await fetch("https://api.peopledatalabs.com/v5/person/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.PDL_API_KEY!,
    },
    body: JSON.stringify({
      query: { bool: { must } },
      size: 25,
      dataset: "all",
    }),
  });

  if (!response.ok) throw new Error(`PDL search failed (${response.status})`);

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
      location_name?: string;
      job_title_levels?: string[];
      job_title_role?: string;
      linkedin_url?: string;
      work_email?: string;
      mobile_phone?: string;
      skills?: string[];
    }>;
  };

  return (data.data ?? []).map((person, index) => {
    const firstName = person.first_name ?? "Unknown";
    const lastName = person.last_name ?? "";
    const domain =
      person.job_company_website?.replace(/^https?:\/\//, "").replace(/\/$/, "") ??
      "example.com";
    return normalizePerson({
      id: person.id,
      fullName: person.full_name ?? `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      jobTitle: person.job_title ?? "Professional",
      company: person.job_company_name ?? domain,
      companyDomain: domain,
      industry: person.industry ?? "Unknown",
      location: person.location_name,
      department: person.job_title_role ?? undefined,
      skills: person.skills?.slice(0, 5),
      linkedinUrl: person.linkedin_url,
      email: person.work_email,
      phone: person.mobile_phone,
      emailConfidence: person.work_email ? 95 : 70,
      index,
    });
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
      per_page: 25,
      q_keywords: filters.keywords || filters.name || undefined,
      person_titles: filters.jobTitle ? [filters.jobTitle] : undefined,
      person_locations: filters.location ? [filters.location] : undefined,
      organization_locations: undefined,
      q_organization_domains_list: filters.companyDomain
        ? [filters.companyDomain]
        : undefined,
      organization_num_employees_ranges: filters.companySize
        ? [filters.companySize]
        : undefined,
    }),
  });

  if (!response.ok) throw new Error(`Apollo search failed (${response.status})`);

  const data = (await response.json()) as {
    people?: Array<{
      id?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      title?: string;
      city?: string;
      state?: string;
      country?: string;
      organization?: {
        name?: string;
        primary_domain?: string;
        industry?: string;
        estimated_num_employees?: number;
      };
      linkedin_url?: string;
      email?: string;
      phone_numbers?: Array<{ raw_number?: string }>;
    }>;
  };

  return (data.people ?? []).map((person, index) => {
    const firstName = person.first_name ?? "Unknown";
    const lastName = person.last_name ?? "";
    const domain = person.organization?.primary_domain ?? "example.com";
    const location = [person.city, person.state, person.country]
      .filter(Boolean)
      .join(", ");
    return normalizePerson({
      id: person.id,
      fullName: person.name ?? `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      jobTitle: person.title ?? "Professional",
      company: person.organization?.name ?? domain,
      companyDomain: domain,
      industry: person.organization?.industry ?? filters.industry ?? "Unknown",
      location: location || undefined,
      email: person.email,
      phone: person.phone_numbers?.[0]?.raw_number,
      linkedinUrl: person.linkedin_url,
      emailConfidence: person.email ? 90 : 70,
      index,
    });
  });
}

export async function searchPeople(filters: SearchFilters): Promise<SearchResponse> {
  const hasAnyFilter = Object.values(filters).some((v) => Boolean(v?.toString().trim()));
  if (!hasAnyFilter) {
    return { results: searchMockPeople({}), source: "mock" };
  }

  if (hasPdlKey()) {
    try {
      return { results: await searchWithPdl(filters), source: "pdl" };
    } catch (error) {
      console.error("PDL search error, falling back:", error);
    }
  }

  if (hasApolloKey()) {
    try {
      return { results: await searchWithApollo(filters), source: "apollo" };
    } catch (error) {
      console.error("Apollo search error, falling back:", error);
    }
  }

  return { results: searchMockPeople(filters), source: "mock" };
}
