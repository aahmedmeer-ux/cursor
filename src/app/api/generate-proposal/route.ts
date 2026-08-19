import { NextResponse } from "next/server";
import { z } from "zod";
import { generateResearchProposal } from "@/lib/generate-proposal";
import type { MatrixRow, SurveyPaper, UploadedGuide } from "@/lib/types";

export const runtime = "nodejs";

const GuideSchema = z.object({
  fileName: z.string(),
  kind: z.enum(["template", "guidelines", "notes"]),
  mimeType: z.string(),
  text: z.string().default(""),
  structureNotes: z.array(z.string()).optional(),
  byteLength: z.number().optional().default(0),
  // Accept but ignore large binary payloads from older clients
  originalBase64: z.string().optional(),
  templateId: z.string().optional(),
  slideCount: z.number().optional(),
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
    const json = await req.json();
    const body = BodySchema.parse(json);
    if (!body.paper?.title || !Array.isArray(body.paper.sections)) {
      return NextResponse.json({ error: "Survey paper is required first." }, { status: 400 });
    }
    if (!body.templateGuide && !body.guidelinesGuide) {
      return NextResponse.json(
        { error: "Upload a proposal template and/or proposal guidelines first." },
        { status: 400 }
      );
    }

    const strip = (g: z.infer<typeof GuideSchema> | null | undefined): UploadedGuide | null => {
      if (!g) return null;
      return {
        fileName: g.fileName,
        kind: g.kind,
        mimeType: g.mimeType,
        text: g.text || "",
        structureNotes: g.structureNotes,
        byteLength: g.byteLength || 0,
        warnings: g.warnings,
      };
    };

    const proposal = generateResearchProposal({
      paper: body.paper,
      rows: body.rows as MatrixRow[],
      templateGuide: strip(body.templateGuide),
      guidelinesGuide: strip(body.guidelinesGuide),
      authorName: body.authorName,
      topic: body.topic,
    });

    if (!proposal?.title || !proposal.sections?.length) {
      return NextResponse.json({ error: "Proposal generator returned an empty document." }, { status: 500 });
    }

    return NextResponse.json({ proposal });
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? `Invalid proposal request: ${err.issues.slice(0, 3).map((i) => i.message).join("; ")}`
        : err instanceof Error
          ? err.message
          : "Proposal generation failed";
    console.error("generate-proposal error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
