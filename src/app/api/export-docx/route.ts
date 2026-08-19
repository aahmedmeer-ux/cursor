import { NextResponse } from "next/server";
import { paperToDocxBlob } from "@/lib/export-docx";
import type { SurveyPaper } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paper = body?.paper as SurveyPaper | undefined;
    if (!paper?.title || !Array.isArray(paper.sections)) {
      return NextResponse.json({ error: "Missing survey paper payload." }, { status: 400 });
    }
    const blob = await paperToDocxBlob(paper);
    const buf = Buffer.from(await blob.arrayBuffer());
    const filename = `${String(paper.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "survey"}.docx`;
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
    const message = err instanceof Error ? err.message : "Word export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
