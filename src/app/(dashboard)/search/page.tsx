"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  SearchFilters,
  type SearchFilterValues,
} from "@/components/search/search-filters";
import { ResultsTable } from "@/components/search/results-table";
import type { PersonResult } from "@/types";

export default function SearchPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilterValues>({
    jobTitle: "CEO",
    companyDomain: "",
    industry: "",
  });
  const [results, setResults] = useState<PersonResult[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [unlockedEmails, setUnlockedEmails] = useState<Record<string, string>>(
    {}
  );

  async function runSearch() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.jobTitle) params.set("jobTitle", filters.jobTitle);
      if (filters.companyDomain)
        params.set("companyDomain", filters.companyDomain);
      if (filters.industry) params.set("industry", filters.industry);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Search failed");
        return;
      }
      setResults(data.results ?? []);
      setSource(data.source ?? null);
      toast.success(`Found ${data.count ?? 0} people`);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock(person: PersonResult) {
    setUnlockingId(person.id);
    try {
      const res = await fetch("/api/unlock-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: person.fullName,
          firstName: person.firstName,
          lastName: person.lastName,
          jobTitle: person.jobTitle,
          company: person.company,
          companyDomain: person.companyDomain,
          linkedinUrl: person.linkedinUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unlock failed");
        return;
      }

      setUnlockedEmails((prev) => ({ ...prev, [person.id]: data.email }));
      setResults((prev) =>
        prev.map((p) =>
          p.id === person.id
            ? { ...p, unlocked: true, email: data.email }
            : p
        )
      );
      toast.success(
        data.alreadyUnlocked
          ? "Contact already unlocked"
          : `Unlocked ${data.email} · ${data.balance} credits left`
      );
      router.refresh();
    } finally {
      setUnlockingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            People Search
          </h1>
          <p className="text-sm text-muted-foreground">
            Filter by title, company domain, or industry. Emails stay masked
            until you unlock them.
          </p>
        </div>
        {source && (
          <Badge variant="outline">
            Data source: {source === "mock" ? "Mock fallback" : source.toUpperCase()}
          </Badge>
        )}
      </div>

      <SearchFilters
        values={filters}
        onChange={setFilters}
        onSubmit={runSearch}
        loading={loading}
      />

      <ResultsTable
        results={results}
        unlockingId={unlockingId}
        unlockedEmails={unlockedEmails}
        onUnlock={handleUnlock}
      />
    </div>
  );
}
