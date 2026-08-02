import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canReview, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RepositoryPage() {
  const user = await getCurrentUser();
  const indexed = await prisma.submission.findMany({
    where: {
      addToIndex: true,
      status: "COMPLETED",
      NOT: { fileName: "seed-climate.txt" },
      ...(user.role === "STUDENT" ? { userId: user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { chunks: true, fingerprints: true } },
    },
  });

  return (
    <div className="space-y-6 animate-rise">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
          Comparison databases
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Internal repository
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          Documents marked “Add to internal document index” contribute
          fingerprints and embeddings for future exact and semantic matching.
          {canReview(user.role)
            ? " Instructors see the full indexed corpus."
            : " Students see only their own indexed work."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {indexed.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="py-10 text-center text-sm text-[var(--muted)]">
              No indexed documents yet. Submit work with indexing enabled.
            </CardContent>
          </Card>
        ) : (
          indexed.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  <Badge variant="brand">Indexed</Badge>
                </div>
                <CardDescription>
                  {canReview(user.role)
                    ? doc.user.name ?? doc.user.email
                    : doc.fileName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-[var(--muted)]">
                <p>{doc.wordCount} words · {doc.pageCount} pages</p>
                <p>
                  {doc._count.chunks} chunks · {doc._count.fingerprints} fingerprints
                </p>
                <p>{doc.createdAt.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
