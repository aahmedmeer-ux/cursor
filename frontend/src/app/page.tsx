"use client";

import { useState } from "react";
import { SearchHero } from "@/components/SearchHero";
import { LoadingState } from "@/components/LoadingState";
import { JobsTable } from "@/components/JobsTable";
import { EnrichPanel } from "@/components/EnrichPanel";
import { enrichJob, searchJobs } from "@/lib/api";
import type { EnrichResponse, JobPosting, JobsSearchResponse } from "@/lib/types";

export default function HomePage() {
  const [keyword, setKeyword] = useState("python developer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobsSearchResponse | null>(null);

  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [enrichment, setEnrichment] = useState<EnrichResponse | null>(null);
  const [enrichingJobId, setEnrichingJobId] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  async function handleSearch() {
    const trimmed = keyword.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedJob(null);
    setEnrichment(null);
    setEnrichError(null);

    try {
      const data = await searchJobs(trimmed);
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong searching jobs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectJob(job: JobPosting) {
    setSelectedJob(job);
    setEnrichment(null);
    setEnrichError(null);
    setEnrichingJobId(job.id);

    try {
      const data = await enrichJob({
        company_name: job.company_name,
        job_title: job.title,
        job_url: job.url,
        description: job.description,
      });
      setEnrichment(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not enrich this company.";
      setEnrichError(message);
    } finally {
      setEnrichingJobId(null);
    }
  }

  return (
    <main className="relative min-h-screen">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          LeadHunt
        </span>
        <span className="text-xs tracking-wide text-muted uppercase">
          Jobs → Poster clues → Export
        </span>
      </header>

      <SearchHero
        keyword={keyword}
        loading={loading}
        onKeywordChange={setKeyword}
        onSubmit={handleSearch}
      />

      {loading && <LoadingState />}

      {error && !loading && (
        <div
          className="relative z-10 mx-auto mb-10 w-full max-w-4xl px-6 animate-fade-up"
          role="alert"
        >
          <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        </div>
      )}

      {result && !loading && (
        <JobsTable
          keyword={result.keyword}
          sourcesOk={result.sources_ok}
          jobs={result.jobs}
          selectedJobId={selectedJob?.id ?? null}
          enrichingJobId={enrichingJobId}
          onSelectJob={handleSelectJob}
        />
      )}

      {selectedJob && (
        <EnrichPanel
          job={selectedJob}
          enrichment={enrichment}
          loading={enrichingJobId === selectedJob.id}
          error={enrichError}
        />
      )}

      {!loading && !result && !error && (
        <p className="relative z-10 mx-auto max-w-4xl px-6 pb-16 text-sm text-muted animate-fade-up">
          Tip: start with a skill or role keyword. Free boards cover remote /
          public listings — not private Upwork or Indeed logins.
        </p>
      )}
    </main>
  );
}
