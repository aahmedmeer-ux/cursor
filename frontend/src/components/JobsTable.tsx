"use client";

import type { JobPosting } from "@/lib/types";
import { downloadJobsCsv } from "@/lib/csv";

interface JobsTableProps {
  keyword: string;
  sourcesOk: string[];
  jobs: JobPosting[];
  selectedJobId: string | null;
  enrichingJobId: string | null;
  onSelectJob: (job: JobPosting) => void;
}

export function JobsTable({
  keyword,
  sourcesOk,
  jobs,
  selectedJobId,
  enrichingJobId,
  onSelectJob,
}: JobsTableProps) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8 animate-fade-up">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-2xl font-semibold text-ink">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} found
          </p>
          <p className="mt-1 text-sm text-muted">
            Keyword: <span className="text-ink">{keyword}</span>
            {" · "}
            Sources: <span className="text-ink">{sourcesOk.join(", ") || "—"}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => downloadJobsCsv(jobs, keyword)}
          disabled={jobs.length === 0}
          className="border border-ink/15 bg-white px-5 py-2.5 font-display text-sm font-semibold text-ink transition hover:border-tide hover:text-tide disabled:opacity-50"
        >
          Export jobs CSV
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="border border-line bg-white/80 px-5 py-8 text-sm text-muted">
          No matching jobs on the free boards for this keyword. Try a broader
          phrase like “python”, “designer”, or “customer support”.
        </div>
      ) : (
        <div className="overflow-x-auto border border-line bg-white/80 backdrop-blur">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-mist/70">
              <tr className="font-display text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Job Title</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Salary</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, index) => {
                const selected = selectedJobId === job.id;
                const enriching = enrichingJobId === job.id;
                return (
                  <tr
                    key={job.id}
                    className={`border-b border-line/80 last:border-b-0 animate-fade-up ${
                      selected ? "bg-mist/60" : ""
                    }`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <td className="px-4 py-3.5">
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-ink underline-offset-2 hover:text-tide hover:underline"
                      >
                        {job.title}
                      </a>
                      {job.description_snippet && (
                        <p className="mt-1 max-w-md text-xs text-muted line-clamp-2">
                          {job.description_snippet}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-ink">{job.company_name}</td>
                    <td className="px-4 py-3.5 text-muted">{job.source}</td>
                    <td className="px-4 py-3.5 text-muted">
                      {job.location || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-muted">
                      {job.salary || "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => onSelectJob(job)}
                        disabled={enriching}
                        className="bg-tide px-3 py-2 font-display text-xs font-semibold tracking-wide text-white transition hover:bg-tideDark disabled:opacity-60"
                      >
                        {enriching
                          ? "Looking…"
                          : selected
                            ? "Selected"
                            : "Find poster"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
