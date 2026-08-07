import { NextResponse } from "next/server";
import { presentationToPptxBuffer } from "@/lib/export-pptx";
import type { ResearchPresentation } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const presentation = body?.presentation as ResearchPresentation | undefined;
    if (!presentation?.title || !Array.isArray(presentation.slides)) {
      return NextResponse.json({ error: "Missing presentation payload." }, { status: 400 });
    }
    const buf = await presentationToPptxBuffer(presentation);
    const filename = `${String(presentation.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "research-presentation"}.pptx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PPTX export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
