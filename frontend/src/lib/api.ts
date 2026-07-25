import type { SearchResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export async function searchLeads(keyword: string): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/api/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keyword }),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) message = data.detail;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return response.json() as Promise<SearchResponse>;
}
