"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  EMPTY_FILTERS,
  SearchFilters,
  type SearchFilterValues,
} from "@/components/search/search-filters";
import { ResultsTable } from "@/components/search/results-table";
import type { PersonResult } from "@/types";

type SearchClientProps = {
  initialDomain?: string;
};

export function SearchClient({ initialDomain = "" }: SearchClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<SearchFilterValues>({
    ...EMPTY_FILTERS,
    jobTitle: initialDomain ? "" : "CEO",
    companyDomain: initialDomain,
  });
  const [results, setResults] = useState<PersonResult[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [bulkUnlocking, setBulkUnlocking] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searched, setSearched] = useState(false);

  async function runSearch(nextFilters = filters) {
    setLoading(true);
    setSelectedIds(new Set());
    try {
      const params = new URLSearchParams();
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Search failed");
        return;
      }
      setResults(data.results ?? []);
      setSource(data.source ?? null);
      setSearched(true);
      toast.success(`${data.count ?? 0} matching professionals`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDomain]);

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
          location: person.location,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Unlock failed");
        return;
      }

      setResults((prev) =>
        prev.map((p) =>
          p.id === person.id
            ? {
                ...p,
                unlocked: true,
                email: data.email,
                phone: data.phone,
              }
            : p
        )
      );
      toast.success(
        data.alreadyUnlocked
          ? "Already unlocked"
          : `Unlocked ${data.email} · ${data.balance ?? "?"} credits left`
      );
      router.refresh();
    } finally {
      setUnlockingId(null);
    }
  }

  async function handleBulkUnlock() {
    const selected = results.filter(
      (r) => selectedIds.has(r.id) && !r.unlocked
    );
    if (selected.length === 0) {
      toast.message("Select locked contacts to unlock");
      return;
    }

    setBulkUnlocking(true);
    try {
      const res = await fetch("/api/unlock-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: selected.map((person) => ({
            fullName: person.fullName,
            firstName: person.firstName,
            lastName: person.lastName,
            jobTitle: person.jobTitle,
            company: person.company,
            companyDomain: person.companyDomain,
            linkedinUrl: person.linkedinUrl,
            location: person.location,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Bulk unlock failed");
        return;
      }

      const unlockedMap = new Map<string, { email: string; phone?: string }>();
      for (const item of data.results ?? []) {
        const name = item.contact?.person_name as string | undefined;
        const company = (item.contact?.company as string | null) ?? "";
        if (name) {
          unlockedMap.set(`${name}|${company}`.toLowerCase(), {
            email: item.email,
            phone: item.phone,
          });
        }
      }

      setResults((prev) =>
        prev.map((p) => {
          const hit = unlockedMap.get(
            `${p.fullName}|${p.company}`.toLowerCase()
          );
          if (!hit) return p;
          return {
            ...p,
            unlocked: true,
            email: hit.email,
            phone: hit.phone,
          };
        })
      );
      setSelectedIds(new Set());
      toast.success(
        `Unlocked ${data.unlockedCount ?? selected.length} contacts · ${data.balance} credits left`
      );
      router.refresh();
    } finally {
      setBulkUnlocking(false);
    }
  }

  return (
    <div className="-m-4 flex min-h-[calc(100svh-3.5rem)] md:-m-6">
      <div className="hidden w-[300px] shrink-0 lg:block">
        <SearchFilters
          values={filters}
          onChange={setFilters}
          onSubmit={() => runSearch()}
          onReset={() => {
            setFilters(EMPTY_FILTERS);
            setResults([]);
            setSearched(false);
            setSource(null);
          }}
          loading={loading}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              People Search
            </h1>
            <p className="text-sm text-muted-foreground">
              Prospect decision-makers. Emails & phones stay masked until you
              spend credits.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {source && (
              <Badge variant="outline">
                Source:{" "}
                {source === "mock" ? "Demo database" : source.toUpperCase()}
              </Badge>
            )}
            {searched && (
              <Badge variant="secondary">{results.length} results</Badge>
            )}
          </div>
        </div>

        <div className="lg:hidden rounded-xl border overflow-hidden">
          <SearchFilters
            values={filters}
            onChange={setFilters}
            onSubmit={() => runSearch()}
            onReset={() => setFilters(EMPTY_FILTERS)}
            loading={loading}
          />
        </div>

        <ResultsTable
          results={results}
          selectedIds={selectedIds}
          unlockingId={unlockingId}
          bulkUnlocking={bulkUnlocking}
          onToggle={(id, checked) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(id);
              else next.delete(id);
              return next;
            });
          }}
          onToggleAll={(checked) => {
            setSelectedIds(
              checked ? new Set(results.map((r) => r.id)) : new Set()
            );
          }}
          onUnlock={handleUnlock}
          onBulkUnlock={handleBulkUnlock}
        />
      </div>
    </div>
  );
}
