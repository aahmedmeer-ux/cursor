"use client";

import type { Lead } from "@/lib/types";
import { downloadLeadsCsv } from "@/lib/csv";

interface ResultsTableProps {
  keyword: string;
  source: string;
  leads: Lead[];
}

export function ResultsTable({ keyword, source, leads }: ResultsTableProps) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 animate-fade-up">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">
            {leads.length} verified lead{leads.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-sm text-muted">
            Keyword: <span className="text-ink">{keyword}</span>
            {" · "}
            Source: <span className="text-ink">{source}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadLeadsCsv(leads, keyword)}
          className="border border-ink/15 bg-white px-5 py-2.5 font-display text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
        >
          Export to CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-line bg-white/80 backdrop-blur">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-mist/70">
            <tr className="font-display text-xs tracking-wide text-muted uppercase">
              <th className="px-4 py-3 font-semibold">Company Name</th>
              <th className="px-4 py-3 font-semibold">Website Domain</th>
              <th className="px-4 py-3 font-semibold">Decision Maker</th>
              <th className="px-4 py-3 font-semibold">Verified Email</th>
              <th className="px-4 py-3 font-semibold">LinkedIn</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, index) => (
              <tr
                key={`${lead.company_name}-${lead.verified_email}-${index}`}
                className="border-b border-line/80 last:border-b-0 animate-fade-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <td className="px-4 py-3.5 font-medium text-ink">
                  {lead.company_name}
                </td>
                <td className="px-4 py-3.5">
                  <a
                    href={`https://${lead.website_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tide underline-offset-2 hover:underline"
                  >
                    {lead.website_domain}
                  </a>
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-ink">{lead.decision_maker_name}</div>
                  <div className="text-xs text-muted">
                    {lead.decision_maker_title}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {lead.verified_email ? (
                    <a
                      href={`mailto:${lead.verified_email}`}
                      className="text-ink underline-offset-2 hover:underline"
                    >
                      {lead.verified_email}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  {lead.linkedin_url ? (
                    <a
                      href={lead.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-tide underline-offset-2 hover:underline"
                    >
                      Profile
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
