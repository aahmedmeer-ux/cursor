import { NextResponse } from "next/server";
import { z } from "zod";
import { generateResearchPresentation } from "@/lib/generate-presentation";
import type { ResearchProposal, SurveyPaper, UploadedGuide } from "@/lib/types";

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
  proposal: z.custom<ResearchProposal>().nullable().optional(),
  templateGuide: GuideSchema.nullable().optional(),
  authorName: z.string().optional(),
  topic: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    if (!body.paper?.title || !Array.isArray(body.paper.sections)) {
      return NextResponse.json({ error: "Survey paper is required first." }, { status: 400 });
    }
    if (!body.templateGuide) {
      return NextResponse.json(
        { error: "Upload a presentation template (.pptx preferred) first." },
        { status: 400 }
      );
    }

    const presentation = generateResearchPresentation({
      paper: body.paper,
      proposal: body.proposal || null,
      templateGuide: body.templateGuide as UploadedGuide,
      authorName: body.authorName,
      topic: body.topic,
    });

    return NextResponse.json({ presentation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Presentation generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
