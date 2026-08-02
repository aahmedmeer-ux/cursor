"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type HighlightSpan = {
  id: string;
  startChar: number;
  endChar: number;
  colorHex: string;
  sourceTitle: string;
};

export function DocumentViewer({
  text,
  highlights,
  activeMatchId,
  onSelectMatch,
}: {
  text: string;
  highlights: HighlightSpan[];
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
}) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchId]);

  const segments = useMemo(
    () => buildHighlightedSegments(text, highlights),
    [text, highlights],
  );

  if (!text) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
        No extracted text available yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <article className="mx-auto max-w-3xl px-6 py-8 leading-8 text-[15px] md:px-10">
        {segments.map((seg, idx) => {
          if (!seg.matchId) {
            return <span key={idx}>{seg.text}</span>;
          }
          const active = seg.matchId === activeMatchId;
          return (
            <button
              key={idx}
              type="button"
              ref={active ? activeRef : undefined}
              onClick={() => onSelectMatch(seg.matchId!)}
              title={seg.sourceTitle}
              className={cn(
                "rounded-[3px] px-0.5 transition-shadow duration-300",
                active && "ring-2 ring-offset-2",
              )}
              style={
                {
                  backgroundColor: `${seg.colorHex}33`,
                  boxShadow: active
                    ? `inset 0 -2px 0 ${seg.colorHex}`
                    : undefined,
                  ["--tw-ring-color" as string]: seg.colorHex,
                } as CSSProperties
              }
            >
              {seg.text}
            </button>
          );
        })}
      </article>
    </div>
  );
}

type Segment = {
  text: string;
  matchId?: string;
  colorHex?: string;
  sourceTitle?: string;
};

function buildHighlightedSegments(
  text: string,
  highlights: HighlightSpan[],
): Segment[] {
  if (!highlights.length) return [{ text }];

  const sorted = [...highlights]
    .filter((h) => h.endChar > h.startChar)
    .sort((a, b) => a.startChar - b.startChar);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const h of sorted) {
    const start = Math.max(cursor, Math.min(text.length, h.startChar));
    const end = Math.max(start, Math.min(text.length, h.endChar));
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }
    if (end > start) {
      segments.push({
        text: text.slice(start, end),
        matchId: h.id,
        colorHex: h.colorHex,
        sourceTitle: h.sourceTitle,
      });
    }
    cursor = Math.max(cursor, end);
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}
