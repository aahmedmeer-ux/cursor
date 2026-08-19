"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrivacyActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function removeCompletely() {
    if (
      !confirm(
        "Delete this submission and all stored report text? This cannot be undone.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        alert("Failed to delete submission");
        return;
      }
      router.push("/submissions");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={removeCompletely}
      className="border-rose-200 text-rose-700 hover:bg-rose-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Delete my submission
    </Button>
  );
}
