import { NextResponse } from "next/server";
import { fetchGoogleSheetCsv, parseGoogleSheetUrl } from "@/lib/google-sheets";
import { inferTopic, parseCsvMatrix } from "@/lib/parse-matrix";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = String(body?.url || "").trim();
    if (!url) {
      return NextResponse.json({ error: "Paste a Google Sheets link." }, { status: 400 });
    }

    const ref = parseGoogleSheetUrl(url);
    if (!ref) {
      return NextResponse.json(
        {
          error:
            "Not a Google Sheets URL. Paste a link like https://docs.google.com/spreadsheets/d/…/edit",
        },
        { status: 400 }
      );
    }

    const csv = await fetchGoogleSheetCsv(ref);
    const rows = parseCsvMatrix(csv);

    return NextResponse.json({
      rows,
      count: rows.length,
      topic: inferTopic(rows),
      fileName: `google-sheet-${ref.spreadsheetId}.csv`,
      sheet: {
        spreadsheetId: ref.spreadsheetId,
        gid: ref.gid || null,
        embedUrl: ref.embedUrl,
        editUrl: ref.editUrl,
        exportCsvUrl: ref.exportCsvUrl,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to import Google Sheet";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
