"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { FileUp, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "text/plain": [".txt"],
};

export function FileUpload({
  indexingAllowed = false,
}: {
  indexingAllowed?: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  // Privacy-first: check-only by default. Never opt users into a shared corpus.
  const [addToIndex, setAddToIndex] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onDrop = useCallback((accepted: File[]) => {
    const next = accepted[0];
    if (!next) return;
    setFile(next);
    setTitle((prev) => prev || next.name.replace(/\.[^.]+$/, ""));
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    multiple: false,
    maxSize: 20 * 1024 * 1024,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a PDF, DOCX, or TXT file to continue.");
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("title", title || file.name);
    body.append(
      "addToIndex",
      String(indexingAllowed ? addToIndex : false),
    );

    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/submissions", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Upload failed");
        return;
      }
      router.push(`/submissions/${data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Privacy mode: check only</p>
          <p className="text-emerald-900/80">
            Your file is analyzed for this report, then deleted from disk. It is
            never published and is not added to any shared plagiarism database
            that other users can match against.
          </p>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-14 text-center transition-all duration-300",
          isDragActive && "border-[var(--brand)] bg-[var(--brand-soft)] scale-[1.01]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_20%,var(--brand-soft),transparent_45%),radial-gradient(circle_at_80%_0%,#d8efe8,transparent_40%)]" />
        <input {...getInputProps()} />
        <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)] animate-[float_3.5s_ease-in-out_infinite]">
            <FileUp className="h-6 w-6" />
          </div>
          <p className="font-[family-name:var(--font-display)] text-xl">
            {isDragActive ? "Drop to upload" : "Drag & drop your document"}
          </p>
          <p className="text-sm text-[var(--muted)]">
            PDF, DOCX, or TXT up to 20MB · private analysis only
          </p>
          <Button type="button" variant="secondary" size="sm">
            Browse files
          </Button>
        </div>
      </div>

      {file && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-[var(--muted)]">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="rounded-md p-2 text-[var(--muted)] hover:bg-[var(--surface-2)]"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <label className="block space-y-2">
        <span className="text-sm font-medium">Submission title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. History essay — draft 2"
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-[var(--ring)] focus:ring-2"
        />
      </label>

      {indexingAllowed ? (
        <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div>
            <p className="text-sm font-medium">Add to internal document index</p>
            <p className="text-xs text-[var(--muted)]">
              Only enable if you want this paper kept for future comparisons in
              your private institution corpus.
            </p>
          </div>
          <Switch checked={addToIndex} onCheckedChange={setAddToIndex} />
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
          Repository indexing is disabled on this deployment. Uploads stay
          check-only and cannot be copied into a shared index.
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing privately…
          </>
        ) : (
          "Run private originality check"
        )}
      </Button>
    </form>
  );
}
