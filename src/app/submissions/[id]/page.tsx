import Link from "next/link";
import { notFound } from "next/navigation";
import { TurnitinReport } from "@/components/report/turnitin-report";
import { StatusPoller } from "@/components/submissions/status-poller";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canReview, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPercent } from "@/lib/utils";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      matches: { orderBy: { similarityScore: "desc" } },
      aiSegments: { orderBy: { score: "desc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!submission) notFound();
  if (submission.userId !== user.id && !canReview(user.role)) notFound();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/submissions" className="hover:text-[var(--foreground)]">
          Submissions
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{submission.title}</span>
        <Badge className="ml-2">{submission.status}</Badge>
        {submission.status === "COMPLETED" && (
          <>
            <Badge variant="brand">
              {formatPercent(submission.overallSimilarityScore)} similarity
            </Badge>
            <Badge
              variant={
                submission.aiLabel === "AI"
                  ? "danger"
                  : submission.aiLabel === "MIXED"
                    ? "warn"
                    : "success"
              }
            >
              {formatPercent(submission.aiScore)} AI
            </Badge>
          </>
        )}
      </div>

      <StatusPoller submissionId={submission.id} status={submission.status} />

      {submission.status === "FAILED" && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-medium">Processing failed</p>
          <p>{submission.errorMessage ?? "Unknown error"}</p>
          <form
            className="mt-3"
            action={async () => {
              "use server";
              const { processSubmission } = await import("@/services/pipeline");
              await prisma.submission.update({
                where: { id: submission.id },
                data: { status: "PENDING", errorMessage: null },
              });
              await processSubmission(submission.id);
            }}
          >
            <Button type="submit" size="sm" variant="danger">
              Retry analysis
            </Button>
          </form>
        </div>
      )}

      {submission.status === "COMPLETED" ? (
        <TurnitinReport
          title={submission.title}
          text={submission.extractedText ?? ""}
          overallScore={submission.overallSimilarityScore}
          wordCount={submission.wordCount}
          pageCount={submission.pageCount}
          aiScore={submission.aiScore}
          aiLabel={submission.aiLabel}
          aiSummary={submission.aiSummary}
          aiSegments={submission.aiSegments.map((seg) => ({
            id: seg.id,
            startChar: seg.startChar,
            endChar: seg.endChar,
            score: seg.score,
            reason: seg.reason,
          }))}
          matches={submission.matches.map((m) => ({
            id: m.id,
            sourceTitle: m.sourceTitle,
            sourceUrl: m.sourceUrl,
            sourceType: m.sourceType,
            similarityScore: m.similarityScore,
            matchedText: m.matchedText,
            startChar: m.startChar,
            endChar: m.endChar,
            colorHex: m.colorHex,
            isExactMatch: m.isExactMatch,
            isQuote: m.isQuote,
            isBibliography: m.isBibliography,
          }))}
        />
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            Preparing your originality report
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Extracting text, fingerprinting, embedding, matching sources, and
            running AI writing detection…
          </p>
        </div>
      )}
    </div>
  );
}
