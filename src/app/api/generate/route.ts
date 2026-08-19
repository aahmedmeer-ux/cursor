import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverLiterature } from "@/lib/discover";
import { enrichPaperMetadata } from "@/lib/enrich-refs";
import { documentQcLoop } from "@/lib/document-qc";
import { applyTemplatePass, expertReviewLoop } from "@/lib/expert-review";
import { generateSurveyPaper } from "@/lib/generate-survey";
import { extractSearchQueries, inferTopic } from "@/lib/matrix-utils";
import type { JournalTemplateId, MatrixRow, TaxonomyStyle } from "@/lib/types";

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
  taxonomyStyle: z
    .enum(["scientific", "semi-scientific", "simple", "professional"])
    .default("semi-scientific"),
  enrichCitations: z.boolean().default(true),
  expertReview: z.boolean().default(true),
  documentQc: z.boolean().default(true),
  targetPages: z.number().min(4).max(30).default(10),
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

    // Always enrich bibliographic metadata for journal-ready references
    if (body.enrichCitations !== false) {
      const enriched = await enrichPaperMetadata(papers);
      papers = enriched.papers;
      warnings.push(...enriched.warnings);
      if (enriched.enrichedCount) {
        warnings.push(`Enriched bibliographic details for ${enriched.enrichedCount} reference(s) via Crossref/OpenAlex.`);
      }
    }

    let paper = await generateSurveyPaper({
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
        taxonomyStyle: body.taxonomyStyle as TaxonomyStyle,
        targetPages: body.targetPages,
      },
    });

    // Template application happens BEFORE the expert professor review loop
    paper = applyTemplatePass(paper, body.template as JournalTemplateId);
    warnings.push(`Applied ${body.template.toUpperCase()} journal template before expert review.`);

    let review = null;
    if (body.expertReview !== false) {
      const reviewed = await expertReviewLoop(paper, {
        maxPasses: 3,
        openaiApiKey: body.openaiApiKey || process.env.OPENAI_API_KEY,
        templateId: body.template as JournalTemplateId,
      });
      paper = reviewed.paper;
      review = {
        passes: reviewed.passes,
        perfect: reviewed.perfect,
        issues: reviewed.issues,
      };
      if (!reviewed.perfect) {
        warnings.push(
          `Professor review completed ${reviewed.passes} pass(es); ${reviewed.issues.filter((i) => !i.fixed && i.severity === "error").length} issue(s) may still need human attention.`
        );
      } else {
        warnings.push(`Professor review passed after ${reviewed.passes} pass(es).`);
      }
    }

    // Final gate: build & audit PDF + Word before marking Ready
    let documentQc = null;
    if (body.documentQc !== false) {
      const qc = await documentQcLoop(paper, { maxPasses: 3 });
      paper = qc.paper;
      documentQc = {
        passes: qc.passes,
        perfect: qc.perfect,
        pdfBytes: qc.pdfBytes,
        docxBytes: qc.docxBytes,
        issues: qc.issues,
      };
      if (!qc.perfect) {
        warnings.push(
          `Document QC found ${qc.issues.filter((i) => i.severity === "error" && !i.fixed).length} export issue(s) after ${qc.passes} pass(es).`
        );
      } else {
        warnings.push(
          `Document QC passed (PDF ${Math.round(qc.pdfBytes / 1024)}KB, Word ${Math.round(qc.docxBytes / 1024)}KB).`
        );
      }
    }

    return NextResponse.json({
      paper,
      papers,
      queries,
      warnings,
      review,
      documentQc,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
