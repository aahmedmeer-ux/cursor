import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { MatrixRow } from "./types";

const COLUMN_ALIASES: Record<keyof Omit<MatrixRow, "id" | "raw" | "year">, string[]> = {
  title: [
    "title",
    "paper",
    "paper title",
    "name of the paper",
    "name of paper",
    "article",
    "article title",
    "name",
    "study",
    "study title",
    "publication title",
    "reference",
    "citation",
    "full reference",
    "source title",
    "document title",
  ],
  authors: [
    "authors",
    "author",
    "author(s)",
    "author / year",
    "author year",
    "authors year",
    "writer",
    "writers",
    "investigator",
    "first author",
  ],
  venue: [
    "venue",
    "journal",
    "conference",
    "publication",
    "source",
    "publisher",
    "outlet",
    "journal / conference",
    "published in",
  ],
  method: [
    "method",
    "methods",
    "methodology",
    "methodology / approach",
    "approach",
    "technique",
    "techniques",
    "techniques used",
    "techniques used / compared",
    "techniques compared",
    "techniques discussed",
    "research method",
    "research design",
    "design",
    "methods / design",
    "study design",
    "analytical approach",
    "software used",
    "software",
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
    "results / findings",
    "key contribution",
    "main results",
    "outcomes / findings",
    "effectiveness and scenarios",
    "effectiveness",
    "scenarios",
    "pros and cons of techniques",
    "pros and cons",
  ],
  gaps: [
    "gaps",
    "gap",
    "limitations",
    "limitation",
    "limitations / gaps",
    "future work",
    "open issues",
    "research gaps",
    "future research",
    "weaknesses",
    "critique",
    "limitations gaps",
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
    "themes / categories",
    "theme / category",
    "research theme",
    "classification",
    "strand",
    "techniques discussed",
  ],
  keywords: ["keywords", "keyword", "tags", "key words", "key terms"],
  doi: ["doi", "doi/url", "digital object identifier"],
  url: ["url", "link", "paper url", "pdf", "web link", "website"],
  notes: [
    "notes",
    "note",
    "remarks",
    "comment",
    "comments",
    "annotation",
    "introduction",
    "research aim",
    "research aim / focus",
    "aim",
    "purpose",
    "objective",
    "objectives",
    "research question",
    "dataset",
    "dataset / sample",
    "sample",
    "population",
    "context",
    "previous work discussed",
    "previous work",
    "other papers referenced / built upon",
    "other papers referenced",
    "related work",
  ],
};

const YEAR_ALIASES = [
  "year",
  "date",
  "published",
  "pub year",
  "publication year",
  "year published",
  "year of publishing",
  "publishing year",
  "author / year",
  "author year",
];

/** Header-like labels used to detect the true header row (not long prose cells). */
const HEADER_HINTS = [
  "title",
  "name of the paper",
  "paper title",
  "authors",
  "author",
  "year",
  "year of publishing",
  "method",
  "methodology",
  "techniques used",
  "techniques discussed",
  "software used",
  "findings",
  "research gaps",
  "future work",
  "introduction",
  "effectiveness",
  "themes",
  "keywords",
  "limitations",
  "previous work",
  "pros and cons",
];

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\|+–—-]+/g, " ")
    .replace(/\s+/g, " ");
}

function isShortHeaderLabel(h: string): boolean {
  // Real spreadsheet headers are short; prose cells from mistaken header rows are long.
  return h.length > 0 && h.length <= 60;
}

function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalized = headers.map(normalizeHeader);

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const normalizedAliases = aliases.map(normalizeHeader);
    const idx = normalized.findIndex((h) => normalizedAliases.includes(h));
    if (idx >= 0) mapping[field] = headers[idx];
  }

  const normalizedYearAliases = YEAR_ALIASES.map(normalizeHeader);
  const yearIdx = normalized.findIndex(
    (h) =>
      normalizedYearAliases.includes(h) ||
      (isShortHeaderLabel(h) && (h.includes("year") || h.includes("publish")))
  );
  if (yearIdx >= 0) mapping.year = headers[yearIdx];

  // Fuzzy matches only against short header-like labels to avoid matching prose cells
  const fuzzy = (field: string, preds: ((h: string) => boolean)[]) => {
    if (mapping[field]) return;
    const idx = normalized.findIndex((h) => isShortHeaderLabel(h) && preds.some((p) => p(h)));
    if (idx >= 0) mapping[field] = headers[idx];
  };

  fuzzy("title", [
    (h) => h.includes("title"),
    (h) => h.includes("name of the paper"),
    (h) => h === "paper" || (h.includes("paper") && !h.includes("author") && !h.includes("referenced")),
  ]);
  fuzzy("authors", [(h) => h.includes("author")]);
  fuzzy("method", [
    (h) => h.includes("method"),
    (h) => h.includes("approach"),
    (h) => h.includes("design"),
    (h) => h.includes("technique"),
    (h) => h.includes("software"),
  ]);
  fuzzy("findings", [
    (h) => h.includes("finding"),
    (h) => h.includes("result"),
    (h) => h.includes("contribution"),
    (h) => h.includes("outcome"),
    (h) => h.includes("effectiveness"),
    (h) => h.includes("pros and cons"),
  ]);
  fuzzy("gaps", [
    (h) => h.includes("gap"),
    (h) => h.includes("limitation"),
    (h) => h.includes("future"),
    (h) => h.includes("weakness"),
  ]);
  fuzzy("themes", [
    (h) => h.includes("theme"),
    (h) => h.includes("topic"),
    (h) => h.includes("categor"),
    (h) => h.includes("strand"),
    (h) => h === "techniques discussed",
  ]);
  fuzzy("venue", [(h) => h.includes("journal"), (h) => h.includes("venue"), (h) => h.includes("conference")]);
  fuzzy("keywords", [(h) => h.includes("keyword"), (h) => h.includes("tag")]);
  fuzzy("notes", [
    (h) => h.includes("introduction"),
    (h) => h.includes("aim"),
    (h) => h.includes("purpose"),
    (h) => h.includes("objective"),
    (h) => h.includes("previous work"),
    (h) => h.includes("sample"),
    (h) => h.includes("dataset"),
    (h) => h.includes("note"),
  ]);

  if (!mapping.authors) {
    const idx = normalized.findIndex(
      (h) => isShortHeaderLabel(h) && h.includes("author") && h.includes("year")
    );
    if (idx >= 0) mapping.authors = headers[idx];
  }
  if (!mapping.year) {
    const idx = normalized.findIndex(
      (h) => isShortHeaderLabel(h) && h.includes("author") && h.includes("year")
    );
    if (idx >= 0) mapping.year = headers[idx];
  }

  if (!mapping.title && headers.length > 0) {
    // Never fall back to bare years like "2025" (integer object-key ordering trap)
    const idx = normalized.findIndex(
      (h) =>
        h.length > 0 &&
        !/^(id|no|no\.|#|s n|s\/n|sr|\d{4})$/.test(h) &&
        !YEAR_ALIASES.includes(h)
    );
    mapping.title = headers[idx >= 0 ? idx : 0];
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
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === "object") {
    // exceljs rich text
    const maybe = value as { text?: string; richText?: { text?: string }[]; result?: string | number };
    if (typeof maybe.text === "string") return maybe.text.trim();
    if (Array.isArray(maybe.richText)) return maybe.richText.map((t) => t.text || "").join("").trim();
    if (maybe.result !== undefined) return stringifyCell(maybe.result);
    return String(value).trim();
  }
  return String(value).replace(/\r\n/g, "\n").trim();
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
  const authors = get("authors");

  if (!title) return null;
  if (/^untitled$/i.test(title)) return null;
  // Skip obvious header repeats
  if (normalizeHeader(title) === "title" || normalizeHeader(title) === "paper title") return null;

  const raw: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) raw[k] = stringifyCell(v);

  return {
    id: `m${index + 1}`,
    title,
    authors,
    year: parseYear(get("year") || authors),
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

function headerRowScore(row: string[]): number {
  let score = 0;
  let longCells = 0;
  for (const cell of row) {
    if (!cell) continue;
    if (cell.length > 80) {
      longCells += 1;
      continue;
    }
    if (HEADER_HINTS.some((hint) => cell === hint || cell.includes(hint))) {
      score += 5;
    } else if (
      [
        "title",
        "authors",
        "author",
        "year",
        "method",
        "methodology",
        "findings",
        "gaps",
        "themes",
        "keywords",
        "venue",
        "journal",
        "limitations",
        "aim",
        "sample",
        "introduction",
        "software",
        "techniques",
      ].includes(cell) ||
      cell.includes("title") ||
      cell.includes("paper") ||
      cell.includes("author") ||
      cell.includes("method") ||
      cell.includes("technique") ||
      cell.includes("finding") ||
      cell.includes("theme") ||
      cell.includes("gap") ||
      cell.includes("limitation") ||
      cell.includes("year")
    ) {
      score += 3;
    } else if (cell.length > 0 && cell.length <= 40) {
      score += 0.4;
    }
  }
  // Strongly prefer compact header rows over prose-filled data rows
  score += Math.min(row.filter((c) => c && c.length <= 60).length, 10) * 0.5;
  score -= longCells * 4;
  return score;
}

function recordsFromAoA(aoa: unknown[][]): { headers: string[]; records: Record<string, unknown>[] } {
  if (!aoa.length) return { headers: [], records: [] };

  let headerIdx = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  const scan = Math.min(aoa.length, 20);
  for (let i = 0; i < scan; i++) {
    const row = (aoa[i] ?? []).map((c) => normalizeHeader(stringifyCell(c)));
    if (!row.some(Boolean)) continue;
    const score = headerRowScore(row) + (i === 0 ? 1.5 : 0); // slight bias to first row
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  const headerRow = (aoa[headerIdx] ?? []).map((c, i) => {
    const label = stringifyCell(c);
    return label || `Column ${i + 1}`;
  });

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
    // Prefix keys so integer-looking years never become JS integer object keys
    headers.forEach((h, i) => {
      record[`__c${i}__${h}`] = line[i] ?? "";
    });
    records.push(record);
  }
  return { headers, records };
}

function prefixedHeaders(headers: string[]): string[] {
  return headers.map((h, i) => `__c${i}__${h}`);
}

export function parseRecordsMatrix(
  records: Record<string, unknown>[],
  headerOrder?: string[]
): MatrixRow[] {
  if (!records.length) {
    throw new Error(
      "No data rows found. Put headers in the first sheet (Title, Authors, Year, Method, Findings, Themes, …)."
    );
  }

  // Prefer explicit header order (avoids Object.keys reordering integer-like keys such as "2025")
  const headers =
    headerOrder && headerOrder.length
      ? headerOrder
      : Object.keys(records[0] ?? {}).map((k) => k.replace(/^__c\d+__/, ""));

  if (!headers.length) {
    throw new Error(
      "Spreadsheet has no header row. Include columns like Title, Authors, Year, Method, Findings, Themes."
    );
  }

  const keyedHeaders = headerOrder ? prefixedHeaders(headerOrder) : Object.keys(records[0] ?? {});
  const displayHeaders = keyedHeaders.map((k) => k.replace(/^__c\d+__/, ""));
  const mappingDisplay = mapHeaders(displayHeaders);
  const mapping: Record<string, string> = {};
  for (const [field, displayName] of Object.entries(mappingDisplay)) {
    const idx = displayHeaders.indexOf(displayName);
    mapping[field] = idx >= 0 ? keyedHeaders[idx] : displayName;
  }

  const rows = records
    .map((record, i) => rowFromRecord(record, mapping, i))
    .filter((r): r is MatrixRow => Boolean(r));

  if (!rows.length) {
    throw new Error(
      `Found columns (${displayHeaders.join(", ")}) but no usable paper titles. Ensure a Title/Paper column is filled.`
    );
  }

  // Rebuild raw with human header names for UI
  return rows.map((row) => {
    const raw: Record<string, string> = {};
    for (const [k, v] of Object.entries(row.raw)) {
      raw[k.replace(/^__c\d+__/, "")] = v;
    }
    return { ...row, raw };
  });
}

export function parseCsvMatrix(text: string): MatrixRow[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  // Detect binary masquerading as text early
  if (cleaned.startsWith("PK") || cleaned.includes("\u0000")) {
    throw new Error(
      "This file looks like an Excel workbook (.xlsx) saved with a .csv name, or it is corrupted. In Excel/Google Sheets use File → Save As / Download as → CSV UTF-8, then upload that CSV."
    );
  }

  const parsed = Papa.parse<unknown[]>(cleaned, {
    header: false,
    skipEmptyLines: "greedy",
  });

  if (parsed.errors?.length && !parsed.data?.length) {
    throw new Error(parsed.errors[0]?.message || "CSV parse failed");
  }

  const aoa = (parsed.data ?? []) as unknown as unknown[][];
  const { headers, records } = recordsFromAoA(aoa);
  return parseRecordsMatrix(records, headers);
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function looksLikeOle(bytes: Uint8Array): boolean {
  // Old .xls compound document
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}

function assertHealthyZip(bytes: Uint8Array) {
  // Fast reject for obviously truncated uploads (central directory / EOCD missing near end)
  const tail = bytes.subarray(Math.max(0, bytes.length - 65536));
  let hasEocd = false;
  for (let i = 0; i < tail.length - 3; i++) {
    if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x05 && tail[i + 3] === 0x06) {
      hasEocd = true;
      break;
    }
  }
  // Also accept ZIP64 EOCD locator PK\x06\x06 / PK\x06\x07
  if (!hasEocd) {
    for (let i = 0; i < tail.length - 3; i++) {
      if (
        tail[i] === 0x50 &&
        tail[i + 1] === 0x4b &&
        ((tail[i + 2] === 0x06 && tail[i + 3] === 0x06) ||
          (tail[i + 2] === 0x06 && tail[i + 3] === 0x07))
      ) {
        hasEocd = true;
        break;
      }
    }
  }
  if (!hasEocd && bytes.length > 2048) {
    // Only hard-fail when the archive is large enough that a missing EOCD is suspicious.
    // Tiny valid writers sometimes place structures differently; parsers below will decide.
    const hasCentral = (() => {
      for (let i = 0; i < tail.length - 3; i++) {
        if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x01 && tail[i + 3] === 0x02) {
          return true;
        }
      }
      return false;
    })();
    if (!hasCentral) {
      throw new Error(
        "This Excel file appears truncated or corrupted (incomplete .xlsx zip). Please re-export: Excel → Save As → Excel Workbook (.xlsx) or CSV UTF-8, then upload again."
      );
    }
  }
}

async function parseWithExcelJS(bytes: Uint8Array): Promise<MatrixRow[]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs accepts Buffer in Node
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  if (!workbook.worksheets.length) {
    throw new Error("Workbook has no sheets.");
  }

  const errors: string[] = [];
  for (const sheet of workbook.worksheets) {
    const aoa: unknown[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      aoa.push(values.map((v) => stringifyCell(v)));
    });
    if (!aoa.length) {
      errors.push(`Sheet “${sheet.name}” is empty`);
      continue;
    }
    try {
      const parsed = recordsFromAoA(aoa);
      return parseRecordsMatrix(parsed.records, parsed.headers);
    } catch (err) {
      errors.push(`Sheet “${sheet.name}”: ${err instanceof Error ? err.message : "parse failed"}`);
    }
  }
  throw new Error(errors.join(" | ") || "Could not parse spreadsheet with ExcelJS.");
}

function parseWithSheetJS(bytes: Uint8Array): MatrixRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: "array",
      cellDates: true,
      dense: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid workbook";
    if (/alloc|inflate|corrupt|password|zip/i.test(msg)) {
      throw new Error(
        `Could not read Excel file (${msg}). The workbook may be truncated or password-protected. Re-save as .xlsx or CSV UTF-8 and try again.`
      );
    }
    throw new Error(`Could not read Excel file (${msg}). Try re-saving as .xlsx.`);
  }

  if (!workbook.SheetNames?.length) {
    throw new Error("Workbook has no sheets.");
  }

  const errors: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    try {
      const aoa = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: false,
        defval: "",
        blankrows: false,
      }) as unknown[][];
      if (!aoa.length) {
        errors.push(`Sheet “${sheetName}” is empty`);
        continue;
      }
      const parsed = recordsFromAoA(aoa);
      return parseRecordsMatrix(parsed.records, parsed.headers);
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

function friendlyWorkbookError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/truncated|corrupt|incomplete|end of data|alloc|inflate|zip/i.test(msg)) {
    return new Error(
      "This Excel file appears truncated or corrupted (incomplete .xlsx). Please re-export from Excel/Google Sheets as a fresh .xlsx or CSV UTF-8, then upload again. Tip: File → Save As → CSV UTF-8 is the most reliable option."
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

export async function parseWorkbookMatrix(data: ArrayBuffer | Uint8Array): Promise<MatrixRow[]> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (!bytes.byteLength) {
    throw new Error("The uploaded spreadsheet is empty.");
  }

  try {
    if (looksLikeZip(bytes)) {
      assertHealthyZip(bytes);
      try {
        return await parseWithExcelJS(bytes);
      } catch {
        return parseWithSheetJS(bytes);
      }
    }
    return parseWithSheetJS(bytes);
  } catch (err) {
    throw friendlyWorkbookError(err);
  }
}

function isSpreadsheetName(name: string): boolean {
  const n = name.toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".xlsm") || n.endsWith(".ods");
}

function isCsvName(name: string): boolean {
  const n = name.toLowerCase();
  return n.endsWith(".csv") || n.endsWith(".tsv") || n.endsWith(".txt");
}

export async function parseMatrixBuffer(
  bytes: Uint8Array,
  fileName = "matrix.xlsx"
): Promise<MatrixRow[]> {
  const name = fileName.toLowerCase();

  // Magic-byte first — many exports are .xlsx renamed/downloaded as .csv
  if (looksLikeZip(bytes) || looksLikeOle(bytes) || isSpreadsheetName(name)) {
    return parseWorkbookMatrix(bytes);
  }

  if (isCsvName(name) || !name.includes(".")) {
    const text = new TextDecoder("utf-8").decode(bytes);
    // If UTF-8 decode looks like binary garbage from zip, redirect
    if (looksLikeZip(bytes) || text.startsWith("PK")) {
      return parseWorkbookMatrix(bytes);
    }
    return parseCsvMatrix(text);
  }

  // Unknown: try workbook then CSV
  try {
    return await parseWorkbookMatrix(bytes);
  } catch {
    return parseCsvMatrix(new TextDecoder("utf-8").decode(bytes));
  }
}

export async function parseMatrixFile(file: File): Promise<MatrixRow[]> {
  const buffer = await file.arrayBuffer();
  return parseMatrixBuffer(new Uint8Array(buffer), file.name || "matrix.xlsx");
}

export { inferTopic, extractSearchQueries } from "./matrix-utils";
