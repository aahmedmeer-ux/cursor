"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload, ClipboardPaste } from "lucide-react";
import type { MatrixRow } from "@/lib/types";

type Props = {
  parsing: boolean;
  fileName: string;
  rowCount: number;
  onParsed: (rows: MatrixRow[], fileName: string, topic?: string) => void;
  onError: (message: string) => void;
  onParsingChange: (parsing: boolean) => void;
};

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
  return { rows: data.rows as MatrixRow[], fileName: data.fileName || fileName, topic: data.topic as string | undefined };
}

export default function MatrixUploader({
  parsing,
  fileName,
  rowCount,
  onParsed,
  onError,
  onParsingChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const runParseFile = useCallback(
    async (file: File) => {
      onParsingChange(true);
      onError("");
      try {
        const result = await parseViaApi(file);
        if (!result.rows?.length) {
          throw new Error("No paper rows found. Check that a Title / Paper Title column exists.");
        }
        onParsed(result.rows, result.fileName, result.topic);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to parse matrix");
      } finally {
        onParsingChange(false);
        if (inputRef.current) inputRef.current.value = "";
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
      onParsed(result.rows, result.fileName, result.topic);
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
          {parsing ? "Parsing spreadsheet…" : "Drop your synthesis table here"}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Accepts real .xlsx / .xls / .csv. Any header row with Title, Authors, Method, Findings,
          Gaps, Themes (or similar labels).
        </p>

        {/* Native file input — always visible so OS picker works even if custom buttons fail */}
        <label className="mt-4 flex cursor-pointer flex-col items-center gap-2">
          <span className="btn btn-primary pointer-events-none">
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
          onClick={() => void loadSample("research")}
        >
          Sample matrix
        </button>
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
          onClick={() => void loadSample("csv")}
        >
          Demo CSV
        </button>
        <button
          type="button"
          className="btn btn-ghost w-full text-xs"
          disabled={parsing}
          onClick={() => void loadSample("xlsx")}
        >
          Demo XLSX
        </button>
      </div>

      {pasteOpen && (
        <div className="mt-3 space-y-2 rounded-xl border border-[var(--line)] bg-white p-3">
          <p className="text-xs text-[var(--muted)]">
            In Excel: select your table → Copy → paste here (tabs/CSV both work).
          </p>
          <textarea
            className="field min-h-[140px] font-mono text-xs"
            placeholder={"Paper Title\tAuthors\tYear\tMethod\tFindings\tGaps\tThemes\n..."}
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

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        Tip: if upload is blocked in an embedded preview, use <strong>Paste table</strong> or open
        this app in a normal browser tab. If your file is Excel saved as “.csv” and fails, export
        again via <strong>Save As → CSV UTF-8</strong> or a fresh <strong>.xlsx</strong>.
      </p>
    </section>
  );
}
