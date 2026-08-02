import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, canReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPercent, similarityTone } from "@/lib/utils";

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  const where = {
    ...(user.role === "STUDENT" ? { userId: user.id } : {}),
    NOT: { fileName: "seed-climate.txt" as const },
  };

  const submissions = await prisma.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          History
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Submissions
        </h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              {canReview(user.role) && (
                <th className="px-4 py-3 font-medium">Author</th>
              )}
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Similarity</th>
              <th className="px-4 py-3 font-medium">AI</th>
              <th className="px-4 py-3 font-medium">Indexed</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {submissions.length === 0 ? (
              <tr>
                <td
                  colSpan={canReview(user.role) ? 7 : 6}
                  className="px-4 py-10 text-center text-[var(--muted)]"
                >
                  No submissions yet.{" "}
                  <Link href="/submit" className="text-[var(--brand-strong)] underline">
                    Upload one
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              submissions.map((s) => {
                const tone = similarityTone(s.overallSimilarityScore);
                return (
                  <tr
                    key={s.id}
                    className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]/70"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/submissions/${s.id}`}
                        className="font-medium hover:text-[var(--brand-strong)]"
                      >
                        {s.title}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">{s.fileName}</p>
                    </td>
                    {canReview(user.role) && (
                      <td className="px-4 py-3 text-[var(--muted)]">
                        {s.user.name ?? s.user.email}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge>{s.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "COMPLETED" ? (
                        <Badge
                          variant={
                            tone === "low"
                              ? "success"
                              : tone === "mid"
                                ? "warn"
                                : "danger"
                          }
                        >
                          {formatPercent(s.overallSimilarityScore)}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === "COMPLETED" ? (
                        <Badge
                          variant={
                            s.aiLabel === "AI"
                              ? "danger"
                              : s.aiLabel === "MIXED"
                                ? "warn"
                                : "success"
                          }
                        >
                          {formatPercent(s.aiScore)} · {s.aiLabel}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {s.addToIndex ? "Yes" : "Check only"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {s.createdAt.toLocaleString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
