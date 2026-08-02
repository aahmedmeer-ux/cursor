import { FileUpload } from "@/components/upload/file-upload";
import { DemoButton } from "@/components/upload/demo-button";
import { Card, CardContent } from "@/components/ui/card";
import { isRepositoryIndexingAllowed } from "@/lib/privacy";

export default function SubmitPage() {
  const indexingAllowed = isRepositoryIndexingAllowed();

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-rise">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          Private document check
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          New submission
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Upload a PDF, DOCX, or TXT for a private originality + AI-writing
          report. Your file is deleted after analysis and is not kept in a
          shared internet corpus.
        </p>
      </div>

      <Card className="border-[#fdba74] bg-[#fff7ed]">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-[#9a3412]">
              Prefer a safe sample instead of your real paper?
            </p>
            <p className="text-sm text-[#9a3412]/80">
              Run the bundled demo essay (also check-only, never indexed).
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

      <FileUpload indexingAllowed={indexingAllowed} />
    </div>
  );
}
