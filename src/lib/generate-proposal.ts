import type {
  MatrixRow,
  ResearchProposal,
  SurveyPaper,
  UploadedGuide,
} from "./types";
import { inferSectionHeadings, isReadablePlainText } from "./parse-guide";

const DEFAULT_PROPOSAL_SECTIONS = [
  "Abstract",
  "Introduction and Motivation",
  "Problem Statement",
  "Related Work and Research Gap",
  "Research Objectives and Questions",
  "Proposed Methodology",
  "Expected Contributions and Outcomes",
  "Work Plan and Timeline",
  "Resources and Feasibility",
  "References",
];

function field(topic: string): string {
  return topic.replace(/^A Survey of\s+/i, "").trim() || topic;
}

function topGaps(rows: MatrixRow[], limit = 5): string[] {
  const gaps = rows
    .map((r) => r.gaps.trim())
    .filter((g) => g.length > 12);
  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const g of gaps) {
    const key = g.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(g);
    if (uniq.length >= limit) break;
  }
  return uniq;
}

function topThemes(paper: SurveyPaper, rows: MatrixRow[]): string[] {
  if (paper.keywords?.length) return paper.keywords.slice(0, 6);
  const fromRows = rows
    .flatMap((r) => r.themes.split(/[,;|/]/).map((t) => t.trim()))
    .filter((t) => t.length > 2);
  return [...new Set(fromRows)].slice(0, 6);
}

function guideExcerpt(guides: UploadedGuide[], max = 900): string {
  const lines = guides
    .flatMap((g) => g.text.split("\n"))
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && isReadablePlainText(l.slice(0, 160)));
  const blob = lines.join(" ").replace(/\s+/g, " ").trim();
  return blob.slice(0, max);
}

function draftSection(
  heading: string,
  ctx: {
    topic: string;
    field: string;
    paper: SurveyPaper;
    rows: MatrixRow[];
    gaps: string[];
    themes: string[];
    guideHint: string;
  }
): string {
  const h = heading.toLowerCase();
  const citeHint =
    ctx.paper.references.slice(0, 4).map((r) => r.key || r.id).filter(Boolean).join(", ") ||
    "the surveyed corpus";

  if (/abstract/.test(h)) {
    return [
      `This research proposal develops a focused investigation on ${ctx.field}, grounded in a freshly rewritten synthesis of ${ctx.paper.metadata.matrixPaperCount} matrix studies and related literature.`,
      `Building on the survey “${ctx.paper.title}”, we identify unresolved gaps around ${ctx.gaps.slice(0, 2).join("; ") || ctx.themes.slice(0, 2).join(" and ") || "methodological rigor and evaluation depth"}.`,
      `We propose objectives, a methods plan, and expected contributions aligned with the uploaded proposal guidelines.`,
    ].join(" ");
  }

  if (/introduction|motivation|background/.test(h)) {
    return [
      `${ctx.field} has matured into a dense research space, yet practice still lacks a coherent agenda that connects taxonomy-level findings to executable research designs.`,
      `Our survey draft establishes the problem landscape, comparative methods, and open challenges; this proposal translates those findings into a concrete research programme.`,
      ctx.guideHint
        ? `Template and guideline cues emphasize: ${ctx.guideHint.slice(0, 280)}.`
        : `We follow a standard academic proposal structure while remaining faithful to the survey evidence base.`,
      `The motivation is not incremental cataloguing, but closing the highest-leverage gaps surfaced in the synthesis (${citeHint}).`,
    ].join(" ");
  }

  if (/problem|gap|related work|literature/.test(h)) {
    const gapList = ctx.gaps.length
      ? ctx.gaps.map((g, i) => `(${i + 1}) ${g}`).join(" ")
      : `(1) Limited cross-study comparison protocols; (2) weak linkage between taxonomy categories and evaluation metrics; (3) insufficient longitudinal evidence.`;
    return [
      `Prior work covered in the survey shows progress along ${ctx.themes.slice(0, 4).join(", ") || "core themes"}, but evidence remains fragmented.`,
      `Critical gaps motivating this proposal include: ${gapList}`,
      `We therefore redefine the research problem as designing, validating, and reporting a study programme that systematically addresses these gaps rather than restating the survey narrative.`,
    ].join(" ");
  }

  if (/objective|aim|question|hypothesis/.test(h)) {
    return [
      `Primary aim: advance a rigorous, evidence-grounded contribution in ${ctx.field} that directly responds to the gaps identified in the rewritten survey.`,
      `Research questions: (RQ1) Which methodological choices most strongly explain divergent findings across the surveyed corpus? (RQ2) How can a taxonomy-guided experimental or analytical design close the top evaluation gaps? (RQ3) What transferable guidelines emerge for future work?`,
      `Objectives: (O1) formalize constructs from the survey taxonomy; (O2) design a study protocol with measurable success criteria; (O3) produce publishable artifacts (analysis, datasets/protocol notes, and implications) aligned with venue expectations.`,
    ].join(" ");
  }

  if (/method|approach|design/.test(h)) {
    return [
      `We adopt a mixed synthesis-to-experiment pathway: start from the survey taxonomy and comparison tables, then operationalize the highest-priority gap into a concrete study design.`,
      `Phase A — construct definition and protocol design using the survey’s comparative dimensions. Phase B — data collection / secondary analysis / controlled evaluation as appropriate to ${ctx.field}. Phase C — validation against the challenge map and trends–gaps analysis from the survey.`,
      `Quality controls include explicit inclusion criteria, reproducibility notes, and mapping every claim back to matrix evidence or newly collected results.`,
      ctx.rows[0]?.method
        ? `Seed methodological cues from the matrix include approaches such as ${[...new Set(ctx.rows.map((r) => r.method).filter(Boolean))].slice(0, 4).join(", ")}.`
        : `Method selection will be justified against alternatives documented in the survey comparison tables.`,
    ].join(" ");
  }

  if (/contribution|outcome|expected|deliverable|significance|innovation/.test(h)) {
    const contribs = ctx.paper.contributions?.slice(0, 3) || [];
    return [
      `Expected contributions extend—not copy—the survey contributions: ${contribs.join("; ") || "a clarified problem framing, comparative evidence, and a forward research agenda"}.`,
      `Deliverables include a detailed protocol, empirical or analytical results addressing RQ1–RQ3, and a discussion that revises the survey’s gap map with new evidence.`,
      `Significance: the work converts a literature synthesis into an actionable research trajectory with clear evaluation criteria and transferable guidance for the community.`,
    ].join(" ");
  }

  if (/timeline|work plan|schedule|plan/.test(h)) {
    return [
      `Month 1–2: finalize constructs, success metrics, and ethics/reproducibility checklist from the survey gap analysis.`,
      `Month 3–5: execute the core study design (data gathering, experiments, or structured secondary analysis).`,
      `Month 6–7: analyze results against taxonomy dimensions; draft manuscripts and revise proposal claims.`,
      `Month 8: package artifacts, limitations, and a revised research agenda for presentation and submission.`,
    ].join(" ");
  }

  if (/resource|budget|feasibility|risk|ethic/.test(h)) {
    return [
      `Feasibility rests on the already-completed synthesis matrix and survey draft, which supply themes, candidate methods, and citation scaffolding.`,
      `Required resources are primarily compute/analysis tooling, access to literature indexes, and researcher time for protocol execution and writing.`,
      `Risks (scope creep, sparse data, shifting venue requirements) are mitigated by anchoring every milestone to a survey-identified gap and keeping deliverables modular.`,
    ].join(" ");
  }

  if (/reference/.test(h)) {
    return `References are carried forward from the rewritten survey paper and will be expanded with proposal-specific citations during execution. Key anchors include ${citeHint}.`;
  }

  return [
    `This section addresses “${heading}” in light of the survey on ${ctx.field}.`,
    `We rewrite the proposal content from scratch using the latest survey synthesis, matrix evidence (${ctx.rows.length} studies), and uploaded template/guideline cues.`,
    ctx.guideHint ? `Guideline signal: ${ctx.guideHint.slice(0, 220)}.` : "",
    `Content remains proposal-oriented: objectives, methods, and expected outcomes—not a reprint of survey sections.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function generateResearchProposal(input: {
  paper: SurveyPaper;
  rows: MatrixRow[];
  templateGuide?: UploadedGuide | null;
  guidelinesGuide?: UploadedGuide | null;
  authorName?: string;
  topic?: string;
}): ResearchProposal {
  const guides = [input.templateGuide, input.guidelinesGuide].filter(Boolean) as UploadedGuide[];
  const topic = (input.topic || input.paper.metadata.topic || input.paper.title).trim();
  const f = field(topic);
  const gaps = topGaps(input.rows);
  const themes = topThemes(input.paper, input.rows);
  const headings = inferSectionHeadings(guides, DEFAULT_PROPOSAL_SECTIONS).filter(
    (h) => isReadablePlainText(h) && !/Identity\s*Adobe/i.test(h)
  );
  // Sparse/garbled PDF extracts often yield only 1–3 real headings — use full outline then
  const safeHeadings =
    headings.length >= 5
      ? headings
      : DEFAULT_PROPOSAL_SECTIONS;
  const guideHint = guideExcerpt(guides);
  const ctx = {
    topic,
    field: f,
    paper: input.paper,
    rows: input.rows,
    gaps,
    themes,
    guideHint,
  };

  const sections = safeHeadings
    .filter((h) => !/^title$/i.test(h.trim()))
    .map((heading, i) => {
      const content = draftSection(heading, ctx);
      return {
        id: `prop-s${i + 1}`,
        heading,
        level: 1 as const,
        content,
      };
    });

  const abstractSection = sections.find((s) => /abstract/i.test(s.heading));
  const abstract =
    abstractSection?.content ||
    draftSection("Abstract", ctx);

  return {
    title: `Research Proposal: Advancing ${f}`,
    authorsPlaceholder: input.authorName || input.paper.authorsPlaceholder || "Author Name",
    abstract,
    sections: sections.filter((s) => !/abstract/i.test(s.heading)),
    references: input.paper.references.slice(0, 40),
    metadata: {
      generatedAt: new Date().toISOString(),
      topic,
      surveyTitle: input.paper.title,
      templateFileName: input.templateGuide?.fileName,
      guidelinesFileName: input.guidelinesGuide?.fileName,
      rewrittenFromScratch: true,
    },
  };
}
