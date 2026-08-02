import { NextResponse } from "next/server";
import { paperToPdfBlob } from "@/lib/export-pdf";
import type { SurveyPaper } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paper = body?.paper as SurveyPaper | undefined;
    if (!paper?.title || !Array.isArray(paper.sections)) {
      return NextResponse.json({ error: "Missing survey paper payload." }, { status: 400 });
    }
    const blob = await paperToPdfBlob(paper);
    const buf = Buffer.from(await blob.arrayBuffer());
    const filename = `${String(paper.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "survey"}.pdf`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
