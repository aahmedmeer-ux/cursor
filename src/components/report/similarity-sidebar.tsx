"use client";

import { ExternalLink, Globe, BookOpen, GraduationCap } from "lucide-react";
import type { SourceType } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatPercent, similarityTone } from "@/lib/utils";
import { cn } from "@/lib/utils";

export type SidebarMatch = {
  id: string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceType: SourceType;
  similarityScore: number;
  matchedText: string;
  colorHex: string;
  isExactMatch: boolean;
};

const typeMeta: Record<
  SourceType,
  { label: string; icon: typeof Globe }
> = {
  WEB: { label: "Internet", icon: Globe },
  INTERNAL_REPO: { label: "Student repository", icon: GraduationCap },
  JOURNAL: { label: "Publications", icon: BookOpen },
};

export function SimilaritySidebar({
  overallScore,
  matches,
  breakdown,
  activeMatchId,
  onSelectMatch,
}: {
  overallScore: number;
  matches: SidebarMatch[];
  breakdown: Record<SourceType, number>;
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
}) {
  const tone = similarityTone(overallScore);
  const toneClass =
    tone === "low"
      ? "text-emerald-700"
      : tone === "mid"
        ? "text-amber-700"
        : "text-rose-700";
  const barClass =
    tone === "low"
      ? "bg-emerald-500"
      : tone === "mid"
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <aside className="flex h-full flex-col gap-5 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          Similarity index
        </p>
        <div className="mt-2 flex items-end gap-3">
          <span
            className={cn(
              "font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight animate-[score-in_0.6s_ease-out]",
              toneClass,
            )}
          >
            {formatPercent(overallScore)}
          </span>
          <span className="mb-1 text-sm text-[var(--muted)]">Match</span>
        </div>
        <Progress
          value={overallScore}
          className="mt-4"
          indicatorClassName={barClass}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Source breakdown</p>
        {(Object.keys(typeMeta) as SourceType[]).map((type) => {
          const Icon = typeMeta[type].icon;
          const value = breakdown[type] ?? 0;
          return (
            <div
              key={type}
              className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-[var(--muted)]">
                <Icon className="h-3.5 w-3.5" />
                {typeMeta[type].label}
              </span>
              <span className="font-medium">{formatPercent(value)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">Matched sources</p>
        {matches.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No significant matches detected.
          </p>
        ) : (
          <ul className="space-y-2">
            {matches.map((match, index) => (
              <li key={match.id}>
                <button
                  type="button"
                  onClick={() => onSelectMatch(match.id)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5",
                    activeMatchId === match.id
                      ? "border-transparent shadow-md"
                      : "border-[var(--border)] bg-[var(--surface)]",
                  )}
                  style={{
                    backgroundColor:
                      activeMatchId === match.id
                        ? `${match.colorHex}18`
                        : undefined,
                    borderColor:
                      activeMatchId === match.id ? match.colorHex : undefined,
                    animationDelay: `${index * 40}ms`,
                  }}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: match.colorHex }}
                    />
                    <Badge variant="default">
                      {formatPercent(match.similarityScore)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    {match.sourceTitle}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                    {match.matchedText}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                    <span>{typeMeta[match.sourceType].label}</span>
                    {match.isExactMatch && <span>· Exact</span>}
                    {match.sourceUrl && (
                      <span className="inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Link
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
