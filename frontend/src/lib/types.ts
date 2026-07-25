export interface JobPosting {
  id: string;
  title: string;
  company_name: string;
  source: string;
  url: string;
  location: string | null;
  job_type: string | null;
  salary: string | null;
  tags: string[];
  published_at: string | null;
  description_snippet: string | null;
  description: string | null;
}

export interface JobsSearchResponse {
  keyword: string;
  count: number;
  sources_queried: string[];
  sources_ok: string[];
  jobs: JobPosting[];
}

export interface ContactHint {
  kind: "email" | "linkedin_person" | "linkedin_company" | "mention" | string;
  value: string;
  context: string | null;
}

export interface EnrichResponse {
  company_name: string;
  website_domain: string | null;
  website_url: string | null;
  logo_url: string | null;
  contacts: ContactHint[];
  notes: string[];
}
