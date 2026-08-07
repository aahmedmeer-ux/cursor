import type {
  PresentationSlide,
  ResearchPresentation,
  ResearchProposal,
  SurveyPaper,
  UploadedGuide,
} from "./types";
import { sanitizeAcademicProse } from "./academic-prose";
import { inferSectionHeadings, isCleanHeading, isReadablePlainText } from "./parse-guide";

function field(topic: string): string {
  return topic.replace(/^A Survey of\s+/i, "").trim() || topic;
}

function bulletsFromText(text: string, max = 4): string[] {
  const parts = text
    .split(/(?<=[.!;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 28 && isReadablePlainText(s.slice(0, 160)));
  const out: string[] = [];
  for (const p of parts) {
    out.push(p.length > 160 ? `${p.slice(0, 157)}…` : p);
    if (out.length >= max) break;
  }
  return out.length ? out : [text.slice(0, 140)].filter((t) => isReadablePlainText(t));
}

function slideTitleFromHeading(h: string): string {
  const t = h.replace(/^slide\s*\d+:\s*/i, "").trim().slice(0, 80);
  return isCleanHeading(t) || isReadablePlainText(t) ? t : "Research slide";
}

function kindFor(title: string, index: number): ResearchPresentation["slides"][number]["kind"] {
  const t = title.toLowerCase();
  if (index === 0 || /title|cover/.test(t)) return "title";
  if (/agenda|outline|overview/.test(t)) return "agenda";
  if (/motivation|why|introduction|background/.test(t)) return "motivation";
  if (/gap|problem|challenge/.test(t)) return "gap";
  if (/objective|aim|question/.test(t)) return "objectives";
  if (/method|approach|design/.test(t)) return "method";
  if (/taxonom|framework|structure/.test(t)) return "taxonomy";
  if (/result|finding|evidence/.test(t)) return "results";
  if (/contribution|outcome|significance/.test(t)) return "contribution";
  if (/timeline|plan|next/.test(t)) return "timeline";
  if (/thank|q\s*&\s*a|conclusion|closing/.test(t)) return "closing";
  return index < 2 ? "motivation" : "results";
}

const DEFAULT_SLIDES = [
  "Title",
  "Agenda",
  "Motivation",
  "Research Gap",
  "Objectives",
  "Taxonomy Snapshot",
  "Proposed Method",
  "Expected Contributions",
  "Timeline",
  "Thank You & Questions",
];

function templateSlideHeadings(guide?: UploadedGuide | null): string[] {
  if (!guide?.structureNotes?.length) return [];
  return guide.structureNotes
    .map((n) => n.replace(/^slide\s*\d+:\s*/i, "").trim())
    .filter((n) => isReadablePlainText(n) || /^Slide \d+$/i.test(n));
}

export function generateResearchPresentation(input: {
  paper: SurveyPaper;
  proposal?: ResearchProposal | null;
  templateGuide?: UploadedGuide | null;
  authorName?: string;
  topic?: string;
}): ResearchPresentation {
  const topic = (input.topic || input.paper.metadata.topic || input.paper.title).trim();
  const f = field(topic);
  // Prefer exact slide labels from the uploaded PPTX so the deck mirrors the template
  const fromTemplate = templateSlideHeadings(input.templateGuide);
  const headings =
    fromTemplate.length > 0
      ? fromTemplate
      : inferSectionHeadings(input.templateGuide ? [input.templateGuide] : [], DEFAULT_SLIDES);

  const proposalSections = (input.proposal?.sections || []).filter((s) =>
    isReadablePlainText(s.heading)
  );
  const surveyIntro =
    input.paper.sections.find((s) => /introduction/i.test(s.heading))?.content ||
    input.paper.abstract;
  const gapSection =
    input.paper.sections.find((s) => /gap|challenge|open|future/i.test(s.heading))?.content ||
    proposalSections.find((s) => /gap|problem/i.test(s.heading))?.content ||
    input.paper.abstract;
  const methodSection =
    proposalSections.find((s) => /method|approach/i.test(s.heading))?.content ||
    input.paper.sections.find((s) => /method/i.test(s.heading))?.content ||
    "";

  const slides: PresentationSlide[] = headings.map((raw, i) => {
    const title = slideTitleFromHeading(raw);
    const kind = kindFor(title, i);
    let bullets: string[] = [];

    switch (kind) {
      case "title":
        bullets = [
          input.authorName || input.paper.authorsPlaceholder || "Author Name",
          `Based on survey: ${input.paper.title}`,
          input.proposal ? `Proposal: ${input.proposal.title}` : "Research presentation",
        ];
        break;
      case "agenda":
        bullets = headings
          .slice(1, Math.min(7, headings.length))
          .map((h) => slideTitleFromHeading(h))
          .filter((h) => !/agenda|title/i.test(h) && isReadablePlainText(h));
        break;
      case "motivation":
        bullets = bulletsFromText(surveyIntro, 4);
        break;
      case "gap":
        bullets = bulletsFromText(gapSection, 4);
        break;
      case "objectives":
        bullets = bulletsFromText(
          proposalSections.find((s) => /objective|aim|question/i.test(s.heading))?.content ||
            input.paper.contributions.join(". "),
          4
        );
        break;
      case "taxonomy":
        bullets = [
          `Taxonomy style: ${input.paper.taxonomyStyle}`,
          ...(input.paper.keywords || []).slice(0, 3).map((k) => `Theme: ${k}`),
          `${input.paper.figures?.length || 0} figures · ${input.paper.tables?.length || 0} tables in survey package`,
        ];
        break;
      case "method":
        bullets = bulletsFromText(methodSection || surveyIntro, 4);
        break;
      case "results":
        bullets = [
          `Corpus: ${input.paper.metadata.matrixPaperCount} matrix + ${input.paper.metadata.discoveredPaperCount} discovered works`,
          ...bulletsFromText(input.paper.abstract, 3),
        ];
        break;
      case "contribution":
        bullets =
          input.paper.contributions?.slice(0, 4) ||
          bulletsFromText(
            proposalSections.find((s) => /contribution|outcome/i.test(s.heading))?.content ||
              input.paper.abstract,
            4
          );
        break;
      case "timeline":
        bullets = bulletsFromText(
          proposalSections.find((s) => /timeline|work plan|plan/i.test(s.heading))?.content ||
            "Month 1–2 protocol; Month 3–5 execution; Month 6–7 analysis; Month 8 packaging.",
          4
        );
        break;
      case "closing":
        bullets = ["Thank you", "Questions and discussion welcome", `Topic: ${f}`];
        break;
      default:
        bullets = bulletsFromText(input.paper.abstract, 3);
    }

    const safeBullets = bullets
      .map((b) => sanitizeAcademicProse(b))
      .filter((b) => isReadablePlainText(b.slice(0, 160)));
    return {
      id: `slide-${i + 1}`,
      title: sanitizeAcademicProse(kind === "title" ? `Research Presentation: ${f}` : title),
      bullets: safeBullets.length ? safeBullets : [`Key points on ${f}`],
      notes: "Filled into your uploaded presentation template (theme and layout preserved).",
      kind,
    };
  });

  if (!slides.some((s) => s.kind === "closing") && !fromTemplate.length) {
    slides.push({
      id: `slide-${slides.length + 1}`,
      title: "Thank You & Questions",
      bullets: ["Thank you", "Questions and discussion welcome", `Topic: ${f}`],
      kind: "closing",
    });
  }

  return {
    title: `Research Presentation: ${f}`,
    subtitle: input.proposal?.title || input.paper.title,
    authorsPlaceholder: input.authorName || input.paper.authorsPlaceholder || "Author Name",
    slides,
    metadata: {
      generatedAt: new Date().toISOString(),
      topic,
      surveyTitle: input.paper.title,
      proposalTitle: input.proposal?.title,
      templateFileName: input.templateGuide?.fileName,
      rewrittenFromScratch: true,
    },
  };
}
