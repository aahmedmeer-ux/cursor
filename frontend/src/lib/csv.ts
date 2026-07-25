import type { JobPosting } from "./types";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function jobsToCsv(jobs: JobPosting[]): string {
  const headers = [
    "Title",
    "Company",
    "Source",
    "Location",
    "Job Type",
    "Salary",
    "URL",
    "Published",
    "Tags",
    "Snippet",
  ];

  const rows = jobs.map((job) =>
    [
      job.title,
      job.company_name,
      job.source,
      job.location ?? "",
      job.job_type ?? "",
      job.salary ?? "",
      job.url,
      job.published_at ?? "",
      job.tags.join("; "),
      job.description_snippet ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadJobsCsv(jobs: JobPosting[], keyword: string): void {
  const csv = jobsToCsv(jobs);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeKeyword = keyword
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  link.href = url;
  link.download = `jobs-${safeKeyword || "export"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
