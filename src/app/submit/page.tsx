import { FileUpload } from "@/components/upload/file-upload";

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-rise">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          Document ingestion
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          New submission
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Upload a PDF, DOCX, or TXT file. We extract text, chunk it, fingerprint
          exact matches, embed for semantic search, then build your interactive
          report.
        </p>
      </div>
      <FileUpload />
    </div>
  );
}
