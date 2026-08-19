"use client";

import { useMemo, useState } from "react";
import type { SourceType } from "@/generated/prisma/client";
import { DocumentViewer } from "@/components/report/document-viewer";
import {
  ReportFilters,
  type FilterState,
} from "@/components/report/report-filters";
import { SimilaritySidebar } from "@/components/report/similarity-sidebar";

export type ReportMatch = {
  id: string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceType: SourceType;
  similarityScore: number;
  matchedText: string;
  startChar: number;
  endChar: number;
  colorHex: string;
  isExactMatch: boolean;
  isQuote: boolean;
  isBibliography: boolean;
};

export function ReportView({
  title,
  text,
  overallScore,
  matches,
}: {
  title: string;
  text: string;
  overallScore: number;
  matches: ReportMatch[];
}) {
  const [filters, setFilters] = useState<FilterState>({
    exactOnly: false,
    excludeQuotes: false,
    excludeBibliography: false,
  });
  const [activeMatchId, setActiveMatchId] = useState<string | null>(
    matches[0]?.id ?? null,
  );

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filters.exactOnly && !m.isExactMatch) return false;
      if (filters.excludeQuotes && m.isQuote) return false;
      if (filters.excludeBibliography && m.isBibliography) return false;
      return true;
    });
  }, [matches, filters]);

  const breakdown = useMemo(() => {
    const totals: Record<SourceType, number> = {
      WEB: 0,
      INTERNAL_REPO: 0,
      JOURNAL: 0,
    };
    for (const m of filtered) {
      totals[m.sourceType] = Math.max(totals[m.sourceType], m.similarityScore);
    }
    // Normalize contribution relative to overall for display
    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    (Object.keys(totals) as SourceType[]).forEach((key) => {
      totals[key] = Math.round((totals[key] / sum) * overallScore);
    });
    return totals;
  }, [filtered, overallScore]);

  const filteredScore = useMemo(() => {
    if (filtered.length === matches.length) return overallScore;
    if (filtered.length === 0) return 0;
    const top = filtered[0]?.similarityScore ?? 0;
    return Math.round(top * 0.7 + (filtered.length / matches.length) * overallScore * 0.3);
  }, [filtered, matches.length, overallScore]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Interactive similarity report
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
            {title}
          </h1>
        </div>
      </div>

      <ReportFilters value={filters} onChange={setFilters} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:h-[calc(100vh-220px)]">
        <DocumentViewer
          text={text}
          highlights={filtered.map((m) => ({
            id: m.id,
            startChar: m.startChar,
            endChar: m.endChar,
            colorHex: m.colorHex,
            sourceTitle: m.sourceTitle,
          }))}
          activeMatchId={activeMatchId}
          onSelectMatch={setActiveMatchId}
        />
        <SimilaritySidebar
          overallScore={filteredScore}
          matches={filtered}
          breakdown={breakdown}
          activeMatchId={activeMatchId}
          onSelectMatch={setActiveMatchId}
        />
      </div>
    </div>
  );
}
