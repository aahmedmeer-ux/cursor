import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverLiterature } from "@/lib/discover";
import { generateSurveyPaper } from "@/lib/generate-survey";
import { extractSearchQueries, inferTopic } from "@/lib/parse-matrix";
import type { JournalTemplateId, MatrixRow } from "@/lib/types";

const MatrixRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.string(),
  year: z.number().nullable(),
  venue: z.string(),
  method: z.string(),
  findings: z.string(),
  gaps: z.string(),
  themes: z.string(),
  keywords: z.string(),
  doi: z.string(),
  url: z.string(),
  notes: z.string(),
  raw: z.record(z.string(), z.string()),
});

const BodySchema = z.object({
  rows: z.array(MatrixRowSchema).min(1),
  topic: z.string().optional(),
  template: z.enum(["ieee", "acm", "springer", "elsevier", "nature"]),
  humanize: z.boolean().default(true),
  includeFigures: z.boolean().default(true),
  discoverOnline: z.boolean().default(true),
  maxDiscover: z.number().min(3).max(40).default(12),
  authorName: z.string().optional(),
  openaiApiKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);
    const rows = body.rows as MatrixRow[];
    const topic = body.topic?.trim() || inferTopic(rows);
    const queries = extractSearchQueries(rows, topic);

    let papers;
    const warnings: string[] = [];

    if (body.discoverOnline) {
      const discovered = await discoverLiterature({
        rows,
        queries,
        maxResults: body.maxDiscover,
      });
      papers = discovered.papers;
      warnings.push(...discovered.warnings);
    } else {
      const { matrixToDiscovered } = await import("@/lib/discover");
      papers = matrixToDiscovered(rows);
    }

    const paper = await generateSurveyPaper({
      rows,
      papers,
      options: {
        topic,
        template: body.template as JournalTemplateId,
        humanize: body.humanize,
        includeFigures: body.includeFigures,
        discoverOnline: body.discoverOnline,
        maxDiscover: body.maxDiscover,
        authorName: body.authorName,
        openaiApiKey: body.openaiApiKey || process.env.OPENAI_API_KEY,
      },
    });

    return NextResponse.json({
      paper,
      papers,
      queries,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
