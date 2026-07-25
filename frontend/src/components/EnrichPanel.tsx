"use client";

import { useEffect, useRef } from "react";
import type { EnrichResponse, JobPosting } from "@/lib/types";

interface EnrichPanelProps {
  job: JobPosting;
  enrichment: EnrichResponse | null;
  loading: boolean;
  error: string | null;
}

function contactLabel(kind: string): string {
  switch (kind) {
    case "email":
      return "Email";
    case "linkedin_person":
      return "LinkedIn person";
    case "linkedin_company":
      return "LinkedIn company";
    case "mention":
      return "Name mention";
    default:
      return kind;
  }
}

export function EnrichPanel({ job, enrichment, loading, error }: EnrichPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [job.id]);

  return (
    <section
      ref={panelRef}
      id="enrich-panel"
      className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 animate-fade-up"
    >
      <div className="border border-line bg-white/80 p-6 backdrop-blur sm:p-8">
        <p className="font-display text-xs font-semibold tracking-[0.18em] text-tide uppercase">
          Step 2 · Poster / company clues
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
          {job.company_name}
        </h2>
        <p className="mt-1 text-sm text-muted">
          For role: <span className="text-ink">{job.title}</span>
        </p>

        {loading && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted">Looking up company domain and scanning job text…</p>
            <div className="skeleton h-8 w-1/3" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-20 w-full" />
          </div>
        )}

        {error && !loading && (
          <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!loading && !error && !enrichment && (
          <p className="mt-6 text-sm text-muted">
            Enrichment has not returned yet. Click Find poster again if this stays empty.
          </p>
        )}

        {enrichment && !loading && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                Company website
              </h3>
              {enrichment.website_url ? (
                <a
                  href={enrichment.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-tide underline-offset-2 hover:underline"
                >
                  {enrichment.website_domain}
                </a>
              ) : (
                <p className="mt-2 text-sm text-muted">No domain found.</p>
              )}

              <h3 className="mt-6 font-display text-sm font-semibold text-ink">
                Contacts found in job text
              </h3>
              {enrichment.contacts.length === 0 ? (
                <p className="mt-2 text-sm text-muted">
                  No email, LinkedIn, or hiring-manager name detected in the
                  public job description.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {enrichment.contacts.map((contact) => (
                    <li
                      key={`${contact.kind}-${contact.value}`}
                      className="border border-line px-3 py-2 text-sm"
                    >
                      <div className="text-xs tracking-wide text-muted uppercase">
                        {contactLabel(contact.kind)}
                      </div>
                      {contact.kind.startsWith("linkedin") ||
                      contact.kind === "email" ? (
                        <a
                          href={
                            contact.kind === "email"
                              ? `mailto:${contact.value}`
                              : contact.value
                          }
                          target={contact.kind === "email" ? undefined : "_blank"}
                          rel="noopener noreferrer"
                          className="text-ink underline-offset-2 hover:underline"
                        >
                          {contact.value}
                        </a>
                      ) : (
                        <div className="text-ink">{contact.value}</div>
                      )}
                      {contact.context && (
                        <div className="mt-1 text-xs text-muted">
                          {contact.context}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold text-ink">
                What this free route can / can’t do
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {enrichment.notes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sand" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>

              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex border border-ink/15 px-4 py-2.5 font-display text-sm font-semibold text-ink transition hover:border-tide hover:text-tide"
              >
                Open original job post
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
