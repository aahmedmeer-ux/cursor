import { NextResponse } from "next/server";
import { z } from "zod";
import { generateResearchProposal } from "@/lib/generate-proposal";
import type { MatrixRow, SurveyPaper, UploadedGuide } from "@/lib/types";

export const runtime = "nodejs";

const GuideSchema = z.object({
  fileName: z.string(),
  kind: z.enum(["template", "guidelines", "notes"]),
  mimeType: z.string(),
  text: z.string(),
  structureNotes: z.array(z.string()).optional(),
  byteLength: z.number(),
  originalBase64: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

const BodySchema = z.object({
  paper: z.custom<SurveyPaper>(),
  rows: z.array(z.custom<MatrixRow>()).min(1),
  templateGuide: GuideSchema.nullable().optional(),
  guidelinesGuide: GuideSchema.nullable().optional(),
  authorName: z.string().optional(),
  topic: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    if (!body.paper?.title || !Array.isArray(body.paper.sections)) {
      return NextResponse.json({ error: "Survey paper is required first." }, { status: 400 });
    }
    if (!body.templateGuide && !body.guidelinesGuide) {
      return NextResponse.json(
        { error: "Upload a proposal template and/or proposal guidelines first." },
        { status: 400 }
      );
    }

    const proposal = generateResearchProposal({
      paper: body.paper,
      rows: body.rows as MatrixRow[],
      templateGuide: (body.templateGuide as UploadedGuide | null) || null,
      guidelinesGuide: (body.guidelinesGuide as UploadedGuide | null) || null,
      authorName: body.authorName,
      topic: body.topic,
    });

    return NextResponse.json({ proposal });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Proposal generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
