import { NextResponse } from "next/server";
import {
  inferTopic,
  parseCsvMatrix,
  parseMatrixBuffer,
  parseMatrixFile,
} from "@/lib/parse-matrix";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file uploaded. Use form field “file”." }, { status: 400 });
      }
      if (!file.size) {
        return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
      }
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (max 25MB)." }, { status: 400 });
      }

      const rows = await parseMatrixFile(file);
      return NextResponse.json({
        rows,
        fileName: file.name,
        topic: inferTopic(rows),
        count: rows.length,
      });
    }

    const body = await req.json();
    if (typeof body?.csv === "string") {
      const rows = parseCsvMatrix(body.csv);
      return NextResponse.json({
        rows,
        fileName: body.fileName || "matrix.csv",
        topic: inferTopic(rows),
        count: rows.length,
      });
    }
    if (typeof body?.base64 === "string") {
      const binary = Buffer.from(body.base64, "base64");
      const rows = await parseMatrixBuffer(
        new Uint8Array(binary),
        body.fileName || "matrix.xlsx"
      );
      return NextResponse.json({
        rows,
        fileName: body.fileName || "matrix.xlsx",
        topic: inferTopic(rows),
        count: rows.length,
      });
    }

    return NextResponse.json(
      { error: "Send multipart file upload, or JSON { csv } / { base64 }." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse matrix";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
