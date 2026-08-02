import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { MatrixRow } from "./types";

const COLUMN_ALIASES: Record<keyof Omit<MatrixRow, "id" | "raw" | "year">, string[]> = {
  title: ["title", "paper", "paper title", "article", "name", "study"],
  authors: ["authors", "author", "author(s)", "writer"],
  venue: ["venue", "journal", "conference", "publication", "source"],
  method: ["method", "methods", "methodology", "approach", "technique"],
  findings: ["findings", "results", "contribution", "contributions", "outcome", "key findings"],
  gaps: ["gaps", "gap", "limitations", "limitation", "future work", "open issues"],
  themes: ["themes", "theme", "category", "topic", "topics", "dimension"],
  keywords: ["keywords", "keyword", "tags", "key words"],
  doi: ["doi", "doi/url"],
  url: ["url", "link", "paper url", "pdf"],
  notes: ["notes", "note", "remarks", "comment", "comments"],
};

const YEAR_ALIASES = ["year", "date", "published", "pub year", "publication year"];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalized = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx >= 0) mapping[field] = headers[idx];
  }

  const yearIdx = normalized.findIndex((h) => YEAR_ALIASES.includes(h));
  if (yearIdx >= 0) mapping.year = headers[yearIdx];

  // Fallback: first unnamed text column as title if missing
  if (!mapping.title && headers.length > 0) {
    mapping.title = headers[0];
  }

  return mapping;
}

function parseYear(value: string): number | null {
  if (!value) return null;
  const match = String(value).match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function rowFromRecord(
  record: Record<string, string>,
  mapping: Record<string, string>,
  index: number
): MatrixRow | null {
  const get = (field: string) => {
    const key = mapping[field];
    if (!key) return "";
    return String(record[key] ?? "").trim();
  };

  const title = get("title");
  if (!title) return null;

  return {
    id: `m${index + 1}`,
    title,
    authors: get("authors"),
    year: parseYear(get("year")),
    venue: get("venue"),
    method: get("method"),
    findings: get("findings"),
    gaps: get("gaps"),
    themes: get("themes"),
    keywords: get("keywords"),
    doi: get("doi"),
    url: get("url"),
    notes: get("notes"),
    raw: record,
  };
}

export function parseCsvMatrix(text: string): MatrixRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (!parsed.meta.fields?.length) {
    throw new Error("CSV has no header row. Include columns like Title, Authors, Year, Method, Findings, Themes.");
  }

  const mapping = mapHeaders(parsed.meta.fields);
  return parsed.data
    .map((record, i) => rowFromRecord(record, mapping, i))
    .filter((r): r is MatrixRow => Boolean(r));
}

export function parseWorkbookMatrix(buffer: ArrayBuffer): MatrixRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  return parseCsvMatrix(csv);
}

export async function parseMatrixFile(file: File): Promise<MatrixRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".tsv") || file.type.includes("csv")) {
    const text = await file.text();
    return parseCsvMatrix(text);
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
    const buffer = await file.arrayBuffer();
    return parseWorkbookMatrix(buffer);
  }
  // Try CSV first, then workbook
  try {
    const text = await file.text();
    return parseCsvMatrix(text);
  } catch {
    const buffer = await file.arrayBuffer();
    return parseWorkbookMatrix(buffer);
  }
}

export function inferTopic(rows: MatrixRow[]): string {
  const themeCounts = new Map<string, number>();
  for (const row of rows) {
    const themes = [
      ...row.themes.split(/[;,|/]/),
      ...row.keywords.split(/[;,|/]/),
    ]
      .map((t) => t.trim())
      .filter(Boolean);
    for (const theme of themes) {
      const key = theme.toLowerCase();
      themeCounts.set(key, (themeCounts.get(key) ?? 0) + 1);
    }
  }

  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t.replace(/\b\w/g, (c) => c.toUpperCase()));

  if (topThemes.length === 0) {
    return "A Systematic Survey of Recent Research";
  }
  if (topThemes.length === 1) return `A Survey of ${topThemes[0]}`;
  if (topThemes.length === 2) return `A Survey of ${topThemes[0]} and ${topThemes[1]}`;
  return `A Survey of ${topThemes[0]}, ${topThemes[1]}, and ${topThemes[2]}`;
}

export function extractSearchQueries(rows: MatrixRow[], topic: string): string[] {
  const queries = new Set<string>();
  if (topic) queries.add(topic.replace(/^A Survey of\s+/i, ""));

  for (const row of rows) {
    for (const part of [...row.themes.split(/[;,|/]/), ...row.keywords.split(/[;,|/]/)]) {
      const t = part.trim();
      if (t.length > 3) queries.add(t);
    }
    if (row.title.split(/\s+/).length <= 12) queries.add(row.title);
  }

  return [...queries].slice(0, 8);
}
