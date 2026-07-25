import type { Lead } from "./types";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function leadsToCsv(leads: Lead[]): string {
  const headers = [
    "Company Name",
    "Website Domain",
    "Decision Maker Name",
    "Title",
    "Verified Email",
    "LinkedIn Profile",
  ];

  const rows = leads.map((lead) =>
    [
      lead.company_name,
      lead.website_domain,
      lead.decision_maker_name,
      lead.decision_maker_title,
      lead.verified_email ?? "",
      lead.linkedin_url ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadLeadsCsv(leads: Lead[], keyword: string): void {
  const csv = leadsToCsv(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeKeyword = keyword.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  link.href = url;
  link.download = `leads-${safeKeyword || "export"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
