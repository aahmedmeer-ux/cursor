import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(score: number, digits = 0): string {
  const clamped = Math.max(0, Math.min(100, score));
  return `${clamped.toFixed(digits)}%`;
}

export function similarityTone(score: number): "low" | "mid" | "high" {
  if (score < 15) return "low";
  if (score < 40) return "mid";
  return "high";
}

/** Stable palette for match source coloring (Turnitin-style). */
export const MATCH_COLORS = [
  "#E85D4C",
  "#F0A202",
  "#2A9D8F",
  "#3A86FF",
  "#9B5DE5",
  "#F15BB5",
  "#00BBF9",
  "#00F5D4",
  "#FEE440",
  "#FF6B6B",
] as const;

export function colorForIndex(index: number): string {
  return MATCH_COLORS[index % MATCH_COLORS.length];
}
