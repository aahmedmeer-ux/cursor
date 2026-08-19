"use client";

import { useMemo, useState } from "react";
import type { AiLabel, SourceType } from "@/generated/prisma/client";
import { DocumentViewer } from "@/components/report/document-viewer";
import {
  ReportFilters,
  type FilterState,
} from "@/components/report/report-filters";
import { cn, formatPercent } from "@/lib/utils";
import {
  BookOpen,
  Bot,
  ExternalLink,
  FileSearch,
  Globe,
  GraduationCap,
} from "lucide-react";

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

export type ReportAiSegment = {
  id: string;
  startChar: number;
  endChar: number;
  score: number;
  reason: string | null;
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

const AI_COLORS = ["#7C3AED", "#A855F7", "#6366F1", "#8B5CF6", "#6D28D9"];

/**
 * Classic Turnitin-style interactive originality report with AI writing view.
 */
export function TurnitinReport({
  title,
  text,
  overallScore,
  matches,
  wordCount,
  pageCount,
  aiScore,
  aiLabel,
  aiSummary,
  aiSegments,
}: {
  title: string;
  text: string;
  overallScore: number;
  matches: ReportMatch[];
  wordCount: number;
  pageCount: number;
  aiScore: number;
  aiLabel: AiLabel;
  aiSummary: string | null;
  aiSegments: ReportAiSegment[];
}) {
  const [mode, setMode] = useState<"similarity" | "ai">("similarity");
  const [filters, setFilters] = useState<FilterState>({
    exactOnly: false,
    excludeQuotes: false,
    excludeBibliography: false,
  });
  const [activeMatchId, setActiveMatchId] = useState<string | null>(
    matches[0]?.id ?? null,
  );
  const [activeAiId, setActiveAiId] = useState<string | null>(
    aiSegments[0]?.id ?? null,
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

  const numberedAi = useMemo(
    () =>
      [...aiSegments]
        .sort((a, b) => b.score - a.score)
        .map((seg, index) => ({
          ...seg,
          number: index + 1,
          colorHex: AI_COLORS[index % AI_COLORS.length],
          snippet: text.slice(seg.startChar, seg.endChar),
        })),
    [aiSegments, text],
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

  const aiColor =
    aiScore < 30 ? "#15803d" : aiScore < 60 ? "#ca8a04" : "#7C3AED";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c2410c]">
              Originality Report
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {wordCount} words · {pageCount} page{pageCount === 1 ? "" : "s"} ·{" "}
              {numbered.length} source{numbered.length === 1 ? "" : "s"} ·{" "}
              {numberedAi.length} AI span{numberedAi.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-3">
              <SimilarityGauge
                score={overallScore}
                color={scoreColor}
                label="Match"
              />
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Similarity
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
            <div className="flex items-center gap-3">
              <SimilarityGauge score={aiScore} color={aiColor} label="AI" />
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  AI writing
                </p>
                <p className="text-sm font-medium" style={{ color: aiColor }}>
                  {aiLabel === "AI"
                    ? "Likely AI-generated"
                    : aiLabel === "MIXED"
                      ? "Mixed / assisted"
                      : "Likely human"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 rounded-lg bg-[var(--surface-2)] p-1">
          <ModeTab
            active={mode === "similarity"}
            onClick={() => setMode("similarity")}
            icon={FileSearch}
            label="Similarity"
          />
          <ModeTab
            active={mode === "ai"}
            onClick={() => setMode("ai")}
            icon={Bot}
            label="AI writing detection"
          />
        </div>
      </div>

      {mode === "similarity" ? (
        <ReportFilters value={filters} onChange={setFilters} />
      ) : (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          {aiSummary ??
            "AI writing detection estimates how much of this submission resembles machine-generated prose."}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:h-[calc(100vh-300px)]">
        <div className="relative min-h-[420px]">
          <div className="absolute left-3 top-3 z-10 rounded bg-[#0f172a]/90 px-2 py-1 text-[11px] font-medium text-white">
            {mode === "similarity" ? "Similarity highlights" : "AI writing highlights"}
          </div>
          <DocumentViewer
            text={text}
            highlights={
              mode === "similarity"
                ? numbered.map((m) => ({
                    id: m.id,
                    startChar: m.startChar,
                    endChar: m.endChar,
                    colorHex: m.colorHex,
                    sourceTitle: `${m.number}. ${m.sourceTitle}`,
                  }))
                : numberedAi.map((m) => ({
                    id: m.id,
                    startChar: m.startChar,
                    endChar: m.endChar,
                    colorHex: m.colorHex,
                    sourceTitle: `AI span ${m.number} (${Math.round(m.score)}%)`,
                  }))
            }
            activeMatchId={mode === "similarity" ? activeMatchId : activeAiId}
            onSelectMatch={
              mode === "similarity" ? setActiveMatchId : setActiveAiId
            }
          />
        </div>

        <aside className="flex h-full flex-col overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          {mode === "similarity" ? (
            <>
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
                          backgroundColor: active
                            ? `${match.colorHex}22`
                            : undefined,
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
                          <span
                            className="text-sm font-bold"
                            style={{ color: scoreColor }}
                          >
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
            </>
          ) : (
            <>
              <div className="border-b border-[var(--border)] bg-violet-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-800">
                  AI writing overview
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-white px-2 py-2 shadow-sm">
                    <p className="font-semibold" style={{ color: aiColor }}>
                      {formatPercent(aiScore)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      AI likelihood
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2 shadow-sm">
                    <p className="font-semibold text-[var(--foreground)]">
                      {aiLabel}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      Classification
                    </p>
                  </div>
                  <div className="rounded-lg bg-white px-2 py-2 shadow-sm">
                    <p className="font-semibold text-[var(--foreground)]">
                      {numberedAi.length}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                      Flagged spans
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-2 p-3">
                <p className="px-1 text-sm font-semibold">Flagged passages</p>
                {numberedAi.length === 0 ? (
                  <p className="px-1 text-sm text-[var(--muted)]">
                    No strong AI-writing spans were flagged.
                  </p>
                ) : (
                  numberedAi.map((seg) => {
                    const active = activeAiId === seg.id;
                    return (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setActiveAiId(seg.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-3 text-left transition",
                          active
                            ? "border-transparent shadow-md"
                            : "border-[var(--border)] hover:bg-[var(--surface-2)]",
                        )}
                        style={{
                          backgroundColor: active
                            ? `${seg.colorHex}22`
                            : undefined,
                          borderLeftWidth: 4,
                          borderLeftColor: seg.colorHex,
                        }}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span
                            className="inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: seg.colorHex }}
                          >
                            {seg.number}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{ color: aiColor }}
                          >
                            {formatPercent(seg.score)}
                          </span>
                        </div>
                        <p className="line-clamp-3 text-sm leading-snug">
                          {seg.snippet}
                        </p>
                        {seg.reason && (
                          <p className="mt-2 text-[11px] text-[var(--muted)]">
                            Why flagged: {seg.reason}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileSearch;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-white text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--foreground)]",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SimilarityGauge({
  score,
  color,
  label,
}: {
  score: number;
  color: string;
  label: string;
}) {
  const deg = Math.min(100, Math.max(0, score)) * 3.6;
  return (
    <div
      className="relative grid h-24 w-24 place-items-center rounded-full"
      style={{
        background: `conic-gradient(${color} ${deg}deg, #e5e7eb ${deg}deg)`,
      }}
      aria-label={`${label} ${score}%`}
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
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
