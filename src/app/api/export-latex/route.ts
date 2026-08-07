import { NextResponse } from "next/server";
import { paperToLatexZip } from "@/lib/export-latex";
import type { SurveyPaper } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paper = body?.paper as SurveyPaper | undefined;
    if (!paper?.title || !Array.isArray(paper.sections)) {
      return NextResponse.json({ error: "Missing survey paper payload." }, { status: 400 });
    }
    const buf = await paperToLatexZip(paper);
    const filename = `${String(paper.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "survey"}-latex.zip`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "LaTeX export failed";
    console.error("export-latex:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
