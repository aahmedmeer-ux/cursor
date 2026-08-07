"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, CheckCircle2 } from "lucide-react";
import type { UploadedGuide } from "@/lib/types";

type Props = {
  label: string;
  hint: string;
  accept: string;
  kind: UploadedGuide["kind"];
  guide: UploadedGuide | null;
  disabled?: boolean;
  onUploaded: (guide: UploadedGuide | null) => void;
  onError: (message: string) => void;
};

export default function GuideUploader({
  label,
  hint,
  accept,
  kind,
  guide,
  disabled,
  onUploaded,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    onError("");
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("kind", kind);
      const res = await fetch("/api/parse-guide", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUploaded(data.guide as UploadedGuide);
    } catch (err) {
      onUploaded(null);
      onError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[var(--ink)]">{label}</div>
          <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">{hint}</p>
        </div>
        {guide ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--ok)]" /> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="btn btn-secondary mt-2 w-full"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading file…
          </>
        ) : (
          <>
            <FileUp className="h-4 w-4" />
            {guide ? "Replace file" : "Upload file"}
          </>
        )}
      </button>
      {guide ? (
        <p className="mt-2 truncate text-[11px] text-[var(--muted)]">
          {guide.fileName} · {Math.round(guide.byteLength / 1024)}KB ·{" "}
          {guide.structureNotes?.length || 0} structure cues
        </p>
      ) : null}
    </div>
  );
}
