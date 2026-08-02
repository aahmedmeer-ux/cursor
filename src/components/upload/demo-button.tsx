"use client";

import { useTransition } from "react";
import { Loader2, Bot, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDemoSubmission } from "@/app/actions/demo";

export function DemoButton({
  variant = "default",
  size = "lg",
  label = "Open Turnitin-style demo report",
  kind = "ai",
}: {
  variant?: "default" | "secondary" | "outline";
  size?: "default" | "sm" | "lg";
  label?: string;
  kind?: "mixed" | "ai";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() => startTransition(() => runDemoSubmission(kind))}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating report…
        </>
      ) : (
        <>
          {kind === "ai" ? <Bot className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {label}
        </>
      )}
    </Button>
  );
}
