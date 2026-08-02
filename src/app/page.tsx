import Link from "next/link";
import { ArrowRight, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoButton } from "@/components/upload/demo-button";
import { getCurrentUser, canReview } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPercent, similarityTone } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const where = {
    ...(user.role === "STUDENT" ? { userId: user.id } : {}),
    NOT: { fileName: "seed-climate.txt" as const },
  };

  const [total, completed, recent] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="animate-rise relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 md:px-10">
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(circle_at_0%_0%,var(--brand-soft),transparent_42%),radial-gradient(circle_at_100%_20%,#e7eef8,transparent_40%)]" />
        <div className="relative max-w-2xl">
          <Badge variant="brand" className="mb-4">
            Hybrid similarity engine
          </Badge>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
            Originality
          </h1>
          <p className="mt-3 text-lg text-[var(--muted)]">
            Upload coursework, run exact + semantic matching against your
            repository and the web, then review a Turnitin-style interactive
            report.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <DemoButton />
            <Button asChild size="lg" variant="secondary">
              <Link href="/submit">
                Upload your own file <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/submissions">View submissions</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Submissions"
          value={String(total)}
          hint={canReview(user.role) ? "Across all students" : "Your uploads"}
        />
        <StatCard
          label="Completed reports"
          value={String(completed)}
          hint="Ready to review"
        />
        <StatCard
          label="Engine mode"
          value={process.env.EMBEDDING_PROVIDER === "openai" ? "OpenAI" : "Local"}
          hint="Embeddings provider"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-rise" style={{ animationDelay: "80ms" }}>
          <CardHeader>
            <CardTitle>Recent submissions</CardTitle>
            <CardDescription>
              Latest originality checks in your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No submissions yet. Upload a PDF, DOCX, or TXT to get started.
              </p>
            ) : (
              recent.map((item) => {
                const tone = similarityTone(item.overallSimilarityScore);
                return (
                  <Link
                    key={item.id}
                    href={`/submissions/${item.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-3 transition hover:bg-[var(--surface-2)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {item.status}
                        {canReview(user.role)
                          ? ` · ${item.user.name ?? item.user.email}`
                          : ""}
                      </p>
                    </div>
                    {item.status === "COMPLETED" ? (
                      <Badge
                        variant={
                          tone === "low"
                            ? "success"
                            : tone === "mid"
                              ? "warn"
                              : "danger"
                        }
                      >
                        {formatPercent(item.overallSimilarityScore)}
                      </Badge>
                    ) : (
                      <Badge>{item.status}</Badge>
                    )}
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="animate-rise" style={{ animationDelay: "140ms" }}>
          <CardHeader>
            <CardTitle>How matching works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--muted)]">
            <Feature
              icon={FileSearch}
              title="Exact fingerprints"
              text="Winnowing n-grams catch copied sentences against the student repository."
            />
            <Feature
              icon={Sparkles}
              title="Semantic vectors"
              text="Chunk embeddings surface paraphrased overlap even when wording changes."
            />
            <Feature
              icon={ShieldCheck}
              title="Web fallback"
              text="Serper-powered search (or a simulated corpus) flags public internet matches."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          {value}
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof FileSearch;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-medium text-[var(--foreground)]">{title}</p>
        <p>{text}</p>
      </div>
    </div>
  );
}
