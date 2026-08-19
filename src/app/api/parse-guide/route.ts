import { NextResponse } from "next/server";
import { parseGuideFile } from "@/lib/parse-guide";
import type { UploadedGuide } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") || "guidelines");
    const kind = (
      ["template", "guidelines", "notes"].includes(kindRaw) ? kindRaw : "guidelines"
    ) as UploadedGuide["kind"];

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    if (!buf.byteLength) {
      return NextResponse.json({ error: "Empty file." }, { status: 400 });
    }
    if (buf.byteLength > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20MB)." }, { status: 400 });
    }

    const guide = await parseGuideFile(file.name || "guide.txt", file.type || "", buf, kind);
    return NextResponse.json({ guide });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse guide";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
