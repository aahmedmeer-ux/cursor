import { NextResponse } from "next/server";
import { proposalToDocxBlob } from "@/lib/export-proposal-docx";
import type { ResearchProposal } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const proposal = body?.proposal as ResearchProposal | undefined;
    if (!proposal?.title || !Array.isArray(proposal.sections)) {
      return NextResponse.json({ error: "Missing proposal payload." }, { status: 400 });
    }
    const blob = await proposalToDocxBlob(proposal);
    const buf = Buffer.from(await blob.arrayBuffer());
    const filename = `${String(proposal.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "research-proposal"}.docx`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proposal Word export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
