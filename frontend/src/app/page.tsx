"use client";

import { useState } from "react";
import { SearchHero } from "@/components/SearchHero";
import { LoadingState } from "@/components/LoadingState";
import { ResultsTable } from "@/components/ResultsTable";
import { searchLeads } from "@/lib/api";
import type { SearchResponse } from "@/lib/types";

export default function HomePage() {
  const [keyword, setKeyword] = useState("Amazon Seller Central");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);

  async function handleSearch() {
    const trimmed = keyword.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await searchLeads(trimmed);
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong hunting leads.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          LeadHunt
        </span>
        <span className="text-xs tracking-wide text-muted uppercase">
          Intent → Enrich → Export
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
        <ResultsTable
          keyword={result.keyword}
          source={result.source}
          leads={result.leads}
        />
      )}

      {!loading && !result && !error && (
        <p className="relative z-10 mx-auto max-w-4xl px-6 pb-16 text-sm text-muted animate-fade-up">
          Results will appear here after enrichment completes.
        </p>
      )}
    </main>
  );
}
