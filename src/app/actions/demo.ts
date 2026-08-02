"use server";

import { readFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";
import { processSubmission } from "@/services/pipeline";

type DemoKind = "mixed" | "ai";

/** One-click demo: submit a bundled essay and open its report. */
export async function runDemoSubmission(kind: DemoKind = "ai") {
  const user = await getCurrentUser();
  const fileName =
    kind === "ai" ? "sample-ai-essay.txt" : "sample-essay.txt";
  const title =
    kind === "ai"
      ? "Demo — AI-polished education essay"
      : "Demo — Academic integrity essay";

  const fixturePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "fixtures",
    fileName,
  );
  const buffer = await readFile(fixturePath);
  const stored = await saveUpload(buffer, fileName);

  const submission = await prisma.submission.create({
    data: {
      userId: user.id,
      title,
      fileName,
      fileUrl: stored.fileUrl,
      mimeType: "text/plain",
      status: "PENDING",
      addToIndex: true,
    },
  });

  // Process synchronously so the report is ready when the page loads
  await processSubmission(submission.id);
  redirect(`/submissions/${submission.id}`);
}
