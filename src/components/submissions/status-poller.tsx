"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function StatusPoller({
  submissionId,
  status,
}: {
  submissionId: string;
  status: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (status === "COMPLETED" || status === "FAILED") return;

    const id = window.setInterval(async () => {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { status?: string };
      if (data.status === "COMPLETED" || data.status === "FAILED") {
        router.refresh();
      }
    }, 1500);

    return () => window.clearInterval(id);
  }, [submissionId, status, router]);

  if (status === "COMPLETED" || status === "FAILED") return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--brand)]" />
      <div>
        <p className="font-medium">
          {status === "PENDING" ? "Queued for analysis…" : "Analyzing document…"}
        </p>
        <p className="text-xs text-[var(--muted)]">
          Extracting text, fingerprinting, embedding, and matching sources.
        </p>
      </div>
    </div>
  );
}
