export interface Lead {
  company_name: string;
  website_domain: string;
  decision_maker_name: string;
  decision_maker_title: string;
  verified_email: string | null;
  linkedin_url: string | null;
}

export interface SearchResponse {
  keyword: string;
  source: string;
  count: number;
  leads: Lead[];
}

export interface ApiError {
  detail: string;
}
