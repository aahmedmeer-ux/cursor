import { FileUpload } from "@/components/upload/file-upload";
import { DemoButton } from "@/components/upload/demo-button";
import { Card, CardContent } from "@/components/ui/card";

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
          Turnitin-style originality report.
        </p>
      </div>

      <Card className="border-[#fdba74] bg-[#fff7ed]">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-[#9a3412]">
              Want to see a finished report instantly?
            </p>
            <p className="text-sm text-[#9a3412]/80">
              Run the bundled sample essay through the full similarity engine.
            </p>
          </div>
          <DemoButton
            variant="default"
            size="default"
            label="Generate AI + similarity demo"
            kind="ai"
          />
        </CardContent>
      </Card>

      <FileUpload />
    </div>
  );
}
