"use client";

import { useCallback, useRef, useState } from "react";
import {
  FileSpreadsheet,
  Loader2,
  Upload,
  ClipboardPaste,
  Link2,
  Sheet,
} from "lucide-react";
import type { MatrixRow } from "@/lib/types";

export type SheetEmbedInfo = {
  embedUrl: string;
  editUrl: string;
  spreadsheetId: string;
};

type Props = {
  parsing: boolean;
  fileName: string;
  rowCount: number;
  sheetEmbed: SheetEmbedInfo | null;
  onParsed: (
    rows: MatrixRow[],
    fileName: string,
    topic?: string,
    sheet?: SheetEmbedInfo | null
  ) => void;
  onError: (message: string) => void;
  onParsingChange: (parsing: boolean) => void;
};

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1bx_FjWUKj_sHvxA3qdLFBN7DRfyWqWbNccn6LHIZj7Q/edit?usp=sharing";

async function parseViaApi(file: File): Promise<{ rows: MatrixRow[]; fileName: string; topic?: string }> {
  const form = new FormData();
  form.append("file", file, file.name || "matrix.xlsx");
  const res = await fetch("/api/parse-matrix", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to parse matrix");
  return { rows: data.rows, fileName: data.fileName || file.name, topic: data.topic };
}

async function parseViaApiText(text: string, fileName: string) {
  const res = await fetch("/api/parse-matrix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv: text, fileName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to parse pasted table");
  return {
    rows: data.rows as MatrixRow[],
    fileName: data.fileName || fileName,
    topic: data.topic as string | undefined,
  };
}

export default function MatrixUploader({
  parsing,
  fileName,
  rowCount,
  sheetEmbed,
  onParsed,
  onError,
  onParsingChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [showEmbed, setShowEmbed] = useState(false);

  const runParseFile = useCallback(
    async (file: File) => {
      onParsingChange(true);
      onError("");
      try {
        const result = await parseViaApi(file);
        if (!result.rows?.length) {
          throw new Error("No paper rows found. Check that a Title / Paper Title column exists.");
        }
        onParsed(result.rows, result.fileName, result.topic, null);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to parse matrix");
      } finally {
        onParsingChange(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onError, onParsed, onParsingChange]
  );

  const importGoogleSheet = useCallback(
    async (url: string) => {
      onParsingChange(true);
      onError("");
      try {
        const res = await fetch("/api/import-sheet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to import Google Sheet");
        if (!data.rows?.length) {
          throw new Error("Sheet imported but no paper rows were found.");
        }
        onParsed(data.rows, data.fileName, data.topic, {
          embedUrl: data.sheet.embedUrl,
          editUrl: data.sheet.editUrl,
          spreadsheetId: data.sheet.spreadsheetId,
        });
        setShowEmbed(true);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to import Google Sheet");
      } finally {
        onParsingChange(false);
      }
    },
    [onError, onParsed, onParsingChange]
  );

  const loadSample = useCallback(
    async (kind: "csv" | "xlsx" | "research") => {
      const path =
        kind === "xlsx"
          ? "/samples/synthesis-matrix-sample.xlsx"
          : kind === "research"
            ? "/samples/research-synthesis-matrix.csv"
            : "/samples/synthesis-matrix-sample.csv";
      const name =
        kind === "xlsx"
          ? "synthesis-matrix-sample.xlsx"
          : kind === "research"
            ? "research-synthesis-matrix.csv"
            : "synthesis-matrix-sample.csv";
      onParsingChange(true);
      onError("");
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Could not load sample (${res.status})`);
        const blob = await res.blob();
        const type =
          kind === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv";
        await runParseFile(new File([blob], name, { type }));
      } catch (err) {
        onParsingChange(false);
        onError(err instanceof Error ? err.message : "Failed to load sample");
      }
    },
    [onError, onParsingChange, runParseFile]
  );

  async function submitPaste() {
    if (!pasteText.trim()) {
      onError("Paste a table first (CSV or tab-separated from Excel).");
      return;
    }
    onParsingChange(true);
    onError("");
    try {
      const result = await parseViaApiText(pasteText, "pasted-matrix.csv");
      onParsed(result.rows, result.fileName, result.topic, null);
      setPasteOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to parse pasted table");
    } finally {
      onParsingChange(false);
    }
  }

  return (
    <section className="panel rise rise-delay-1 rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <FileSpreadsheet className="h-4 w-4 text-[var(--sea)]" />
        Synthesis matrix
      </div>

      {/* Google Sheets import — primary path for shared research tables */}
      <div className="mb-3 space-y-2 rounded-xl border border-[var(--line)] bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
          <Sheet className="h-4 w-4 text-[var(--sea)]" />
          Google Sheet link
        </div>
        <input
          className="field text-xs"
          type="url"
          placeholder="https://docs.google.com/spreadsheets/d/…/edit"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          disabled={parsing}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={parsing || !sheetUrl.trim()}
            onClick={() => void importGoogleSheet(sheetUrl)}
          >
            <Link2 className="h-4 w-4" />
            Import sheet
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={parsing}
            onClick={() => {
              setSheetUrl(DEFAULT_SHEET_URL);
              void importGoogleSheet(DEFAULT_SHEET_URL);
            }}
          >
            Load my UAV sheet
          </button>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--muted)]">
          Sheet must be shared as <strong>Anyone with the link → Viewer</strong>. Embed preview
          appears after a successful import.
        </p>
      </div>

      <div
        className={`dropzone rounded-xl px-4 py-6 text-center ${dragActive ? "active" : ""} ${parsing ? "opacity-70" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current += 1;
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dragDepth.current = 0;
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void runParseFile(file);
          else onError("No file detected in drop.");
        }}
      >
        {parsing ? (
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[var(--sea)]" />
        ) : (
          <Upload className="mx-auto mb-3 h-8 w-8 text-[var(--sea)]" />
        )}
        <p className="text-sm font-medium">
          {parsing ? "Importing / parsing…" : "Or drop CSV / XLSX here"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Supports headers like Name of the Paper, Techniques Used, Research Gaps, Year of
          Publishing…
        </p>

        <label className="mt-4 flex cursor-pointer flex-col items-center gap-2">
          <span className="btn btn-secondary pointer-events-none">
            {parsing ? "Parsing…" : "Choose CSV / XLSX file"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full max-w-xs text-xs text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--mist)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--ink)]"
            disabled={parsing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void runParseFile(file);
            }}
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-secondary w-full"
          disabled={parsing}
          onClick={() => setPasteOpen((v) => !v)}
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste table
        </button>
        <button
          type="button"
          className="btn btn-ghost w-full text-xs"
          disabled={parsing}
          onClick={() => void loadSample("research")}
        >
          Sample matrix
        </button>
      </div>

      {pasteOpen && (
        <div className="mt-3 space-y-2 rounded-xl border border-[var(--line)] bg-white p-3">
          <p className="text-xs text-[var(--muted)]">
            In Excel/Sheets: select your table → Copy → paste here.
          </p>
          <textarea
            className="field min-h-[140px] font-mono text-xs"
            placeholder={"Name of the Paper\tIntroduction\tTechniques Used / Compared\t..."}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={parsing}
            onClick={() => void submitPaste()}
          >
            Parse pasted table
          </button>
        </div>
      )}

      {fileName && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Loaded <span className="font-semibold text-[var(--ink)]">{fileName}</span> · {rowCount}{" "}
          papers
        </p>
      )}

      {sheetEmbed && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() => setShowEmbed((v) => !v)}
            >
              {showEmbed ? "Hide embed" : "Show sheet embed"}
            </button>
            <a
              className="text-xs font-medium text-[var(--sea)] underline"
              href={sheetEmbed.editUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Sheets
            </a>
          </div>
          {showEmbed && (
            <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
              <iframe
                title="Google Sheet embed"
                src={sheetEmbed.embedUrl}
                className="h-72 w-full"
                loading="lazy"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
