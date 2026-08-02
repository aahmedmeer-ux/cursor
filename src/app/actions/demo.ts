"use server";

import { readFile } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/storage";
import { processSubmission } from "@/services/pipeline";

/** One-click demo: submit the bundled sample essay and open its report. */
export async function runDemoSubmission() {
  const user = await getCurrentUser();
  const fixturePath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "fixtures",
    "sample-essay.txt",
  );
  const buffer = await readFile(fixturePath);
  const stored = await saveUpload(buffer, "sample-essay.txt");

  const submission = await prisma.submission.create({
    data: {
      userId: user.id,
      title: "Demo — Academic integrity essay",
      fileName: "sample-essay.txt",
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
