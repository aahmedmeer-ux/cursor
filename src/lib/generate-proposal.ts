import type {
  MatrixRow,
  ResearchProposal,
  SurveyPaper,
  UploadedGuide,
} from "./types";
import { joinParagraphs, sanitizeAcademicProse } from "./academic-prose";
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
  const gaps = rows.map((r) => r.gaps.trim()).filter((g) => g.length > 12);
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

function guideExcerpt(guides: UploadedGuide[], max = 700): string {
  const lines = guides
    .flatMap((g) => g.text.split("\n"))
    .map((l) => l.trim())
    .filter((l) => l.length > 20 && isReadablePlainText(l.slice(0, 160)));
  return sanitizeAcademicProse(lines.join(" ").replace(/\s+/g, " ")).slice(0, max);
}

function discussPaper(row: MatrixRow): string {
  const who = row.authors?.trim() || "The authors";
  const year = row.year ?? "n.d.";
  const method = row.method?.trim();
  const findings = row.findings?.trim();
  const gaps = row.gaps?.trim();
  const venue = row.venue?.trim();

  const sentences: string[] = [];
  sentences.push(
    `${who} (${year}) present “${row.title}”${venue ? ` in ${venue}` : ""}.`
  );
  if (method) {
    sentences.push(
      `Their study is organized around ${method.charAt(0).toLowerCase()}${method.slice(1).replace(/\.$/, "")}, which situates the contribution within the broader methodological landscape of the field.`
    );
  }
  if (findings) {
    sentences.push(
      `The reported results indicate that ${findings.charAt(0).toLowerCase()}${findings.slice(1).replace(/\.$/, "")}.`
    );
  } else {
    sentences.push(
      `While detailed numerical outcomes are only sparsely recorded in the synthesis matrix, the work nonetheless clarifies how this line of inquiry frames the problem and what kinds of evidence it privileges.`
    );
  }
  if (gaps) {
    sentences.push(
      `Importantly, the authors leave open that ${gaps.charAt(0).toLowerCase()}${gaps.slice(1).replace(/\.$/, "")}, a limitation that directly informs the design choices in the present proposal.`
    );
  }
  return sanitizeAcademicProse(sentences.join(" "));
}

function draftMethodologyNarrative(rows: MatrixRow[], fieldName: string, themes: string[]): string {
  const focus = rows.slice(0, 8);
  const paras: string[] = [];

  paras.push(
    `The proposed methodology begins from a close reading of the primary studies already curated in the synthesis matrix for ${fieldName}. Rather than reducing those studies to short labels, we treat each as a substantive research contribution whose design choices, evidence, and residual limitations must be understood before any new protocol is fixed.`
  );

  if (focus.length) {
    paras.push(
      `We first revisit the most informative matrix papers in narrative form so that the protocol inherits their concrete lessons.`
    );
    for (const row of focus) {
      paras.push(discussPaper(row));
    }
  }

  paras.push(
    `Synthesizing across these accounts, the working themes of ${themes.slice(0, 4).join(", ") || "the surveyed domain"} suggest a staged inquiry. The first stage formalizes constructs and success criteria using the comparative dimensions that emerged in the survey. The second stage carries out data collection, secondary analysis, or controlled evaluation as appropriate to the research questions. The third stage validates outcomes against the challenge map developed in the survey and revises the gap narrative with new evidence.`
  );

  paras.push(
    `Throughout, every claim will be tied either to a matrix study discussed above or to newly collected results. Inclusion criteria, analysis scripts, and reporting conventions will be documented so that the study remains reproducible and so that later readers can see exactly how the proposal moves from prior literature to a concrete research design.`
  );

  return joinParagraphs(paras);
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

  if (/abstract/.test(h)) {
    return joinParagraphs([
      `This research proposal develops a focused investigation on ${ctx.field}, grounded in a rewritten synthesis of ${ctx.paper.metadata.matrixPaperCount} matrix studies and related literature.`,
      `Building on the survey “${ctx.paper.title}”, we concentrate on unresolved issues around ${ctx.gaps.slice(0, 2).join("; ") || ctx.themes.slice(0, 2).join(" and ") || "methodological rigor and evaluation depth"}.`,
      `The proposal states clear objectives, a literature informed methods plan, and expected contributions aligned with the uploaded guidelines.`,
    ]);
  }

  if (/introduction|motivation|background/.test(h)) {
    return joinParagraphs([
      `${ctx.field} has grown into a dense research space, yet the community still needs a coherent agenda that turns taxonomy level findings into executable research designs.`,
      `Our survey establishes the problem landscape, comparative methods, and open challenges. This proposal converts those findings into a concrete research programme rather than restating the survey as a catalogue.`,
      ctx.guideHint
        ? `The uploaded template and guideline materials emphasize expectations such as the following: ${ctx.guideHint.slice(0, 260)}.`
        : `We follow a conventional academic proposal structure while remaining faithful to the survey evidence base.`,
      `The motivation is therefore to close the highest leverage gaps surfaced in the synthesis, not merely to incrementally extend prior catalogues.`,
    ]);
  }

  if (/problem|gap|related work|literature/.test(h)) {
    const gapNarrative = ctx.gaps.length
      ? ctx.gaps
          .map((g) => sanitizeAcademicProse(g))
          .map((g, i) => {
            if (i === 0) return `One persistent difficulty is that ${g.charAt(0).toLowerCase()}${g.slice(1).replace(/\.$/, "")}.`;
            if (i === 1) return `A second difficulty is that ${g.charAt(0).toLowerCase()}${g.slice(1).replace(/\.$/, "")}.`;
            return `A further difficulty is that ${g.charAt(0).toLowerCase()}${g.slice(1).replace(/\.$/, "")}.`;
          })
          .join(" ")
      : `Prior studies often diverge in evaluation protocols, leave taxonomy categories weakly linked to measurable outcomes, and offer limited longitudinal evidence.`;

    const paperBits = ctx.rows.slice(0, 4).map((r) => discussPaper(r));

    return joinParagraphs([
      `Prior work covered in the survey shows progress along ${ctx.themes.slice(0, 4).join(", ") || "core themes"}, but the evidence remains fragmented when read study by study.`,
      ...paperBits,
      gapNarrative,
      `We therefore define the research problem as designing, validating, and reporting a study programme that systematically addresses these gaps, rather than reprinting the survey narrative.`,
    ]);
  }

  if (/objective|aim|question|hypothesis/.test(h)) {
    return joinParagraphs([
      `The primary aim is to advance a rigorous, evidence grounded contribution in ${ctx.field} that responds directly to the gaps identified in the rewritten survey.`,
      `The first research question asks which methodological choices most strongly explain divergent findings across the surveyed corpus. The second asks how a taxonomy guided experimental or analytical design can close the most urgent evaluation gaps. The third asks what transferable guidelines emerge for subsequent work.`,
      `In practical terms, the objectives are to formalize constructs from the survey taxonomy, to design a study protocol with measurable success criteria, and to produce publishable artifacts including analysis, protocol notes, and implications that match venue expectations.`,
    ]);
  }

  if (/method|approach|design/.test(h)) {
    return draftMethodologyNarrative(ctx.rows, ctx.field, ctx.themes);
  }

  if (/contribution|outcome|expected|deliverable|significance|innovation/.test(h)) {
    const contribs = ctx.paper.contributions?.slice(0, 3) || [];
    return joinParagraphs([
      `Expected contributions extend the survey rather than copy it. In particular, we build on ${contribs.join("; ") || "a clarified problem framing, comparative evidence, and a forward research agenda"} by converting those insights into an executable study with new evidence.`,
      `Deliverables include a detailed protocol, empirical or analytical results that answer the research questions, and a discussion that revises the survey gap map in light of those results.`,
      `The significance of the work lies in turning a literature synthesis into an actionable research trajectory with clear evaluation criteria and guidance that other researchers can reuse.`,
    ]);
  }

  if (/timeline|work plan|schedule|plan/.test(h)) {
    return joinParagraphs([
      `In the opening months we finalize constructs, success metrics, and a reproducibility checklist drawn from the survey gap analysis.`,
      `The middle phase executes the core study design through data gathering, experiments, or structured secondary analysis, depending on which path best answers the research questions.`,
      `Later months are reserved for analysis against the taxonomy dimensions, manuscript drafting, revision of proposal claims, and packaging of artifacts, limitations, and a revised research agenda for presentation and submission.`,
    ]);
  }

  if (/resource|budget|feasibility|risk|ethic/.test(h)) {
    return joinParagraphs([
      `Feasibility rests on the completed synthesis matrix and survey draft, which already supply themes, candidate methods, and citation scaffolding.`,
      `Required resources are mainly analysis tooling, access to literature indexes, and researcher time for protocol execution and writing.`,
      `Risks such as scope creep, sparse data, or shifting venue requirements are mitigated by anchoring every milestone to a survey identified gap and by keeping deliverables modular.`,
    ]);
  }

  if (/reference/.test(h)) {
    return sanitizeAcademicProse(
      `References are carried forward from the rewritten survey paper and will be expanded with proposal specific citations during execution.`
    );
  }

  return joinParagraphs([
    `This section develops “${heading}” in light of the survey on ${ctx.field}.`,
    `We rewrite the proposal content from scratch using the latest survey synthesis, matrix evidence from ${ctx.rows.length} studies, and uploaded template or guideline cues.`,
    ctx.guideHint ? `Guideline materials highlight: ${ctx.guideHint.slice(0, 220)}.` : "",
    `The focus remains proposal oriented: objectives, methods, and expected outcomes rather than a reprint of survey sections.`,
  ]);
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
  const inferred = inferSectionHeadings(guides, DEFAULT_PROPOSAL_SECTIONS).filter(
    (h) => isReadablePlainText(h) && !/Identity\s*Adobe/i.test(h)
  );
  const outline = inferred.length >= 5 ? inferred : DEFAULT_PROPOSAL_SECTIONS;
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

  const sections = outline
    .filter((h) => !/^title$/i.test(h.trim()))
    .map((heading, i) => ({
      id: `prop-s${i + 1}`,
      heading: sanitizeAcademicProse(heading),
      level: 1 as const,
      content: draftSection(heading, ctx),
    }));

  const abstractSection = sections.find((s) => /abstract/i.test(s.heading));
  const abstract = abstractSection?.content || draftSection("Abstract", ctx);

  return {
    title: sanitizeAcademicProse(`Research Proposal: Advancing ${f}`),
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
