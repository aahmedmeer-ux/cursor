import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { MatrixRow } from "./types";

const COLUMN_ALIASES: Record<keyof Omit<MatrixRow, "id" | "raw" | "year">, string[]> = {
  title: [
    "title",
    "paper",
    "paper title",
    "article",
    "article title",
    "name",
    "study",
    "study title",
    "publication title",
    "reference",
  ],
  authors: ["authors", "author", "author(s)", "writer", "writers", "investigator"],
  venue: ["venue", "journal", "conference", "publication", "source", "publisher", "outlet"],
  method: [
    "method",
    "methods",
    "methodology",
    "approach",
    "technique",
    "research method",
    "design",
  ],
  findings: [
    "findings",
    "results",
    "contribution",
    "contributions",
    "outcome",
    "outcomes",
    "key findings",
    "main findings",
    "key results",
  ],
  gaps: [
    "gaps",
    "gap",
    "limitations",
    "limitation",
    "future work",
    "open issues",
    "research gaps",
    "future research",
  ],
  themes: [
    "themes",
    "theme",
    "category",
    "categories",
    "topic",
    "topics",
    "dimension",
    "focus",
    "area",
  ],
  keywords: ["keywords", "keyword", "tags", "key words", "key terms"],
  doi: ["doi", "doi/url", "digital object identifier"],
  url: ["url", "link", "paper url", "pdf", "web link", "website"],
  notes: ["notes", "note", "remarks", "comment", "comments", "annotation"],
};

const YEAR_ALIASES = [
  "year",
  "date",
  "published",
  "pub year",
  "publication year",
  "year published",
];

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/\s+/g, " ");
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

  // Fuzzy contains match if exact alias missed
  if (!mapping.title) {
    const idx = normalized.findIndex((h) => h.includes("title") || h.includes("paper"));
    if (idx >= 0) mapping.title = headers[idx];
  }
  if (!mapping.authors) {
    const idx = normalized.findIndex((h) => h.includes("author"));
    if (idx >= 0) mapping.authors = headers[idx];
  }
  if (!mapping.method) {
    const idx = normalized.findIndex((h) => h.includes("method") || h.includes("approach"));
    if (idx >= 0) mapping.method = headers[idx];
  }
  if (!mapping.findings) {
    const idx = normalized.findIndex(
      (h) => h.includes("finding") || h.includes("result") || h.includes("contribution")
    );
    if (idx >= 0) mapping.findings = headers[idx];
  }
  if (!mapping.gaps) {
    const idx = normalized.findIndex(
      (h) => h.includes("gap") || h.includes("limitation") || h.includes("future")
    );
    if (idx >= 0) mapping.gaps = headers[idx];
  }
  if (!mapping.themes) {
    const idx = normalized.findIndex(
      (h) => h.includes("theme") || h.includes("topic") || h.includes("categor")
    );
    if (idx >= 0) mapping.themes = headers[idx];
  }

  if (!mapping.title && headers.length > 0) {
    mapping.title = headers[0];
  }

  return mapping;
}

function parseYear(value: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const match = String(value).match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function stringifyCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return String(value.getFullYear());
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial year-like ints stay ints; avoid scientific notation noise
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return String(value).trim();
}

function rowFromRecord(
  record: Record<string, unknown>,
  mapping: Record<string, string>,
  index: number
): MatrixRow | null {
  const get = (field: string) => {
    const key = mapping[field];
    if (!key) return "";
    return stringifyCell(record[key]);
  };

  const title = get("title");
  if (!title || /^untitled$/i.test(title)) return null;

  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) raw[k] = stringifyCell(v);

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
    raw,
  };
}

function recordsFromAoA(aoa: unknown[][]): Record<string, unknown>[] {
  if (!aoa.length) return [];

  // Find the most likely header row in the first 15 rows
  let headerIdx = 0;
  let bestScore = -1;
  const scan = Math.min(aoa.length, 15);
  for (let i = 0; i < scan; i++) {
    const row = (aoa[i] ?? []).map((c) => normalizeHeader(stringifyCell(c)));
    if (!row.some(Boolean)) continue;
    let score = 0;
    for (const cell of row) {
      if (!cell) continue;
      if (
        [
          "title",
          "authors",
          "author",
          "year",
          "method",
          "findings",
          "gaps",
          "themes",
          "keywords",
          "venue",
          "journal",
        ].includes(cell) ||
        cell.includes("title") ||
        cell.includes("author") ||
        cell.includes("method")
      ) {
        score += 3;
      } else {
        score += 0.25;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  const headerRow = (aoa[headerIdx] ?? []).map((c, i) => {
    const label = stringifyCell(c);
    return label || `Column ${i + 1}`;
  });

  // Ensure unique headers
  const seen = new Map<string, number>();
  const headers = headerRow.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });

  const records: Record<string, unknown>[] = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const line = aoa[r] ?? [];
    if (!line.some((c) => stringifyCell(c))) continue;
    const record: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      record[h] = line[i] ?? "";
    });
    records.push(record);
  }
  return records;
}

export function parseRecordsMatrix(records: Record<string, unknown>[]): MatrixRow[] {
  if (!records.length) {
    throw new Error(
      "No data rows found. Put headers in the first sheet (Title, Authors, Year, Method, Findings, Themes, …)."
    );
  }
  const headers = Object.keys(records[0] ?? {});
  if (!headers.length) {
    throw new Error(
      "Spreadsheet has no header row. Include columns like Title, Authors, Year, Method, Findings, Themes."
    );
  }
  const mapping = mapHeaders(headers);
  const rows = records
    .map((record, i) => rowFromRecord(record, mapping, i))
    .filter((r): r is MatrixRow => Boolean(r));

  if (!rows.length) {
    throw new Error(
      `Found columns (${headers.join(", ")}) but no usable paper titles. Ensure a Title/Paper column is filled.`
    );
  }
  return rows;
}

export function parseCsvMatrix(text: string): MatrixRow[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const parsed = Papa.parse<unknown[]>(cleaned, {
    header: false,
    skipEmptyLines: "greedy",
  });

  if (parsed.errors?.length && !parsed.data?.length) {
    throw new Error(parsed.errors[0]?.message || "CSV parse failed");
  }

  const aoa = (parsed.data ?? []) as unknown as unknown[][];
  return parseRecordsMatrix(recordsFromAoA(aoa));
}

function sheetToAoA(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  }) as unknown[][];
}

export function parseWorkbookMatrix(data: ArrayBuffer | Uint8Array): MatrixRow[] {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!bytes.byteLength) {
    throw new Error("The uploaded spreadsheet is empty.");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true,
      dense: false,
    });
  } catch (err) {
    throw new Error(
      `Could not read Excel file (${err instanceof Error ? err.message : "invalid workbook"}). Try re-saving as .xlsx.`
    );
  }

  if (!workbook.SheetNames?.length) {
    throw new Error("Workbook has no sheets.");
  }

  const errors: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    try {
      const aoa = sheetToAoA(sheet);
      if (!aoa.length) {
        errors.push(`Sheet “${sheetName}” is empty`);
        continue;
      }
      return parseRecordsMatrix(recordsFromAoA(aoa));
    } catch (err) {
      errors.push(
        `Sheet “${sheetName}”: ${err instanceof Error ? err.message : "parse failed"}`
      );
    }
  }

  throw new Error(
    errors.length
      ? `Could not parse spreadsheet. ${errors.join(" | ")}`
      : "Could not parse spreadsheet."
  );
}

function isSpreadsheetFile(file: { name?: string; type?: string }): boolean {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsm") ||
    name.endsWith(".ods") ||
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function isCsvFile(file: { name?: string; type?: string }): boolean {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return name.endsWith(".csv") || name.endsWith(".tsv") || type.includes("csv") || type.includes("tab-separated");
}

export async function parseMatrixFile(file: File): Promise<MatrixRow[]> {
  if (isSpreadsheetFile(file)) {
    const buffer = await file.arrayBuffer();
    return parseWorkbookMatrix(buffer);
  }
  if (isCsvFile(file)) {
    const text = await file.text();
    return parseCsvMatrix(text);
  }

  // Unknown extension: sniff ZIP/XLSX signature (PK) vs text
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // PK
  if (isZip || bytes.length > 8) {
    try {
      return parseWorkbookMatrix(bytes);
    } catch {
      // fall through to CSV
    }
  }
  const text = new TextDecoder("utf-8").decode(bytes);
  return parseCsvMatrix(text);
}

export { inferTopic, extractSearchQueries } from "./matrix-utils";
