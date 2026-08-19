import type { EnrichResponse, JobsSearchResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

async function parseError(response: Response): Promise<string> {
  let message = `Request failed with status ${response.status}`;
  try {
    const data = (await response.json()) as { detail?: string };
    if (data.detail) message = data.detail;
  } catch {
    // keep default
  }
  return message;
}

export async function searchJobs(keyword: string): Promise<JobsSearchResponse> {
  const response = await fetch(`${API_BASE}/api/jobs/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword, limit: 40 }),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<JobsSearchResponse>;
}

export async function enrichJob(payload: {
  company_name: string;
  job_title?: string | null;
  job_url?: string | null;
  description?: string | null;
}): Promise<EnrichResponse> {
  const response = await fetch(`${API_BASE}/api/jobs/enrich`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<EnrichResponse>;
}
