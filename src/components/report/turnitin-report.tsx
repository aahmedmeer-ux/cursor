"use client";

import { useMemo, useState } from "react";
import type { SourceType } from "@/generated/prisma/client";
import { DocumentViewer } from "@/components/report/document-viewer";
import {
  ReportFilters,
  type FilterState,
} from "@/components/report/report-filters";
import { cn, formatPercent } from "@/lib/utils";
import { BookOpen, ExternalLink, Globe, GraduationCap } from "lucide-react";

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

const typeLabel: Record<SourceType, string> = {
  WEB: "Internet source",
  INTERNAL_REPO: "Student paper",
  JOURNAL: "Publication",
};

const typeIcon = {
  WEB: Globe,
  INTERNAL_REPO: GraduationCap,
  JOURNAL: BookOpen,
};

/**
 * Classic Turnitin-style interactive originality report:
 * left = highlighted paper, right = similarity index + numbered sources.
 */
export function TurnitinReport({
  title,
  text,
  overallScore,
  matches,
  wordCount,
  pageCount,
}: {
  title: string;
  text: string;
  overallScore: number;
  matches: ReportMatch[];
  wordCount: number;
  pageCount: number;
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

  const numbered = useMemo(
    () =>
      filtered.map((m, index) => ({
        ...m,
        number: index + 1,
      })),
    [filtered],
  );

  const breakdown = useMemo(() => {
    const totals: Record<SourceType, number> = {
      WEB: 0,
      INTERNAL_REPO: 0,
      JOURNAL: 0,
    };
    for (const m of numbered) {
      totals[m.sourceType] = Math.max(totals[m.sourceType], m.similarityScore);
    }
    const sum = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    (Object.keys(totals) as SourceType[]).forEach((key) => {
      totals[key] = Math.round((totals[key] / sum) * overallScore);
    });
    return totals;
  }, [numbered, overallScore]);

  const scoreColor =
    overallScore < 15
      ? "#15803d"
      : overallScore < 40
        ? "#ca8a04"
        : "#dc2626";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c2410c]">
            Originality Report
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {wordCount} words · {pageCount} page{pageCount === 1 ? "" : "s"} ·{" "}
            {numbered.length} source{numbered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SimilarityGauge score={overallScore} color={scoreColor} />
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Similarity Index
            </p>
            <p className="text-sm font-medium" style={{ color: scoreColor }}>
              {overallScore < 15
                ? "Low overlap"
                : overallScore < 40
                  ? "Moderate overlap"
                  : "High overlap"}
            </p>
          </div>
        </div>
      </div>

      <ReportFilters value={filters} onChange={setFilters} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:h-[calc(100vh-260px)]">
        <div className="relative min-h-[420px]">
          <div className="absolute left-3 top-3 z-10 rounded bg-[#0f172a]/90 px-2 py-1 text-[11px] font-medium text-white">
            Submitted paper
          </div>
          <DocumentViewer
            text={text}
            highlights={numbered.map((m) => ({
              id: m.id,
              startChar: m.startChar,
              endChar: m.endChar,
              colorHex: m.colorHex,
              sourceTitle: `${m.number}. ${m.sourceTitle}`,
            }))}
            activeMatchId={activeMatchId}
            onSelectMatch={setActiveMatchId}
          />
        </div>

        <aside className="flex h-full flex-col overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] bg-[#fff7ed] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c2410c]">
              Match overview
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              {(Object.keys(breakdown) as SourceType[]).map((type) => (
                <div
                  key={type}
                  className="rounded-lg bg-white px-2 py-2 shadow-sm"
                >
                  <p className="font-semibold text-[var(--foreground)]">
                    {formatPercent(breakdown[type])}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                    {type === "WEB"
                      ? "Internet"
                      : type === "INTERNAL_REPO"
                        ? "Papers"
                        : "Pubs"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-2 p-3">
            <p className="px-1 text-sm font-semibold">Sources found</p>
            {numbered.length === 0 ? (
              <p className="px-1 text-sm text-[var(--muted)]">
                No significant matches for the current filters.
              </p>
            ) : (
              numbered.map((match) => {
                const Icon = typeIcon[match.sourceType];
                const active = activeMatchId === match.id;
                return (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => setActiveMatchId(match.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-3 text-left transition",
                      active
                        ? "border-transparent shadow-md"
                        : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                    )}
                    style={{
                      backgroundColor: active ? `${match.colorHex}22` : undefined,
                      borderLeftWidth: 4,
                      borderLeftColor: match.colorHex,
                    }}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className="inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: match.colorHex }}
                      >
                        {match.number}
                      </span>
                      <span className="text-sm font-bold" style={{ color: scoreColor }}>
                        {formatPercent(match.similarityScore)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug">
                      {match.sourceTitle}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                      {match.matchedText}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{typeLabel[match.sourceType]}</span>
                      {match.isExactMatch && <span>· Exact match</span>}
                      {match.sourceUrl && (
                        <span className="inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Source
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SimilarityGauge({ score, color }: { score: number; color: string }) {
  const deg = Math.min(100, Math.max(0, score)) * 3.6;
  return (
    <div
      className="relative grid h-24 w-24 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${deg}deg, #e5e7eb ${deg}deg)`,
      }}
      aria-label={`Similarity ${score}%`}
    >
      <div className="grid h-[78px] w-[78px] place-items-center rounded-full bg-white">
        <div className="text-center">
          <p
            className="font-[family-name:var(--font-display)] text-2xl leading-none font-bold"
            style={{ color }}
          >
            {Math.round(score)}%
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
            Match
          </p>
        </div>
      </div>
    </div>
  );
}
