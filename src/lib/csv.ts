import type { UnlockedContact } from "@/types";

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function contactsToCsv(contacts: UnlockedContact[]) {
  const headers = [
    "Name",
    "Job Title",
    "Company",
    "Email",
    "Phone",
    "LinkedIn",
    "Location",
    "Unlocked At",
  ];

  const rows = contacts.map((c) =>
    [
      c.person_name,
      c.job_title ?? "",
      c.company ?? "",
      c.email,
      c.phone ?? "",
      c.linkedin_url ?? "",
      c.location ?? "",
      c.unlocked_at,
    ]
      .map((v) => escapeCsv(String(v)))
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
