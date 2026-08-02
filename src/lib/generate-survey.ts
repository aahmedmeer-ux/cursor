import type {
  DiscoveredPaper,
  GenerateOptions,
  MatrixRow,
  ReferenceEntry,
  SurveyPaper,
  SurveySection,
} from "./types";
import { generateFiguresAndTables } from "./figures";
import { humanizePaperSections, humanizeText } from "./humanize";
import { defaultContributions, OPENAI_SURVEY_SYSTEM_PROMPT } from "./survey-rubric";
import { groupByTheme } from "./taxonomy";

function citeKey(paper: DiscoveredPaper, index: number): string {
  const author = (paper.authors[0] || "Anon").split(/\s+/).pop() || "Anon";
  const year = paper.year ?? "n.d.";
  return `${author}${year}_${index + 1}`.replace(/[^A-Za-z0-9_]/g, "");
}

function buildReferences(papers: DiscoveredPaper[]): ReferenceEntry[] {
  return papers.map((p, i) => {
    const key = citeKey(p, i);
    const authors =
      p.authors.length === 0
        ? "Anonymous"
        : p.authors.length <= 3
          ? p.authors.join(", ")
          : `${p.authors.slice(0, 3).join(", ")}, et al.`;
    const year = p.year ?? "n.d.";
    const venue = p.venue ? ` ${p.venue}.` : "";
    const doi = p.doi ? ` DOI: ${p.doi.replace(/^https?:\/\/doi\.org\//, "")}.` : "";
    return {
      id: p.id,
      key,
      year: p.year,
      doi: p.doi,
      text: `[${i + 1}] ${authors}, “${p.title},”${venue} ${year}.${doi}`,
    };
  });
}

function refIndex(papers: DiscoveredPaper[], id: string): number {
  return papers.findIndex((p) => p.id === id) + 1;
}

function pickRelated(papers: DiscoveredPaper[], row: MatrixRow, limit = 2): DiscoveredPaper[] {
  const tokens = `${row.themes} ${row.keywords} ${row.title}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
  return papers
    .filter((p) => p.source !== "matrix" || p.title !== row.title)
    .map((p) => {
      const hay = `${p.title} ${p.abstract} ${p.themes.join(" ")}`.toLowerCase();
      const score = tokens.reduce((acc, t) => (hay.includes(t) ? acc + 1 : acc), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

function sentenceJoin(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`))
    .join(" ");
}

function yearSpan(rows: MatrixRow[]): string {
  const years = rows.map((r) => r.year).filter((y): y is number => Boolean(y));
  if (!years.length) return "";
  return ` spanning ${Math.min(...years)}–${Math.max(...years)}`;
}

function draftAbstract(
  topic: string,
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  themes: string[],
  contributions: string[]
): string {
  return sentenceJoin([
    `This survey synthesizes ${rows.length} primary studies from a curated synthesis matrix${yearSpan(rows)}, complemented by ${Math.max(papers.length - rows.length, 0)} related works retrieved from open scholarly indexes`,
    `Rather than enumerating papers in isolation, we contribute a taxonomy-driven synthesis of ${topic.replace(/^A Survey of\s+/i, "")} organized around ${themes.slice(0, 4).join(", ") || "emergent research dimensions"}`,
    `The review couples a problem-formulation diagram, comparative tables, a challenge map, and a trends–gaps Venn analysis to make the state of the art actionable`,
    `Key contributions include: ${contributions.slice(0, 3).join("; ")}`,
    `The resulting manuscript is intended as a high-impact survey draft and should be validated by domain experts before journal submission`,
  ]);
}

function draftIntroduction(
  topic: string,
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  themes: string[],
  contributions: { label: string; detail: string }[]
): string {
  const first = papers[0];
  const second = papers[1];
  const c1 = first ? `[${refIndex(papers, first.id)}]` : "";
  const c2 = second ? `[${refIndex(papers, second.id)}]` : "";
  const field = topic.replace(/^A Survey of\s+/i, "");

  const contribList = contributions
    .map((c, i) => `(${i + 1}) ${c.label}: ${c.detail}`)
    .join(" ");

  return [
    `Research on ${field} has expanded rapidly, producing a fragmented landscape of methods, evaluation protocols, and claims that are difficult to compare without an organizing schema.`,
    `Prior studies${c1}${c2 ? ` and ${c2}` : ""} illustrate both substantial progress and persistent inconsistency in problem framing.`,
    `Scope. This survey covers ${rows.length} seed studies from a researcher-curated synthesis matrix${yearSpan(rows)}, enriched with automated discovery of related literature (${papers.length} works after deduplication).`,
    `We deliberately emphasize synthesis over paper-by-paper listing: each section situates evidence inside a shared taxonomy.`,
    `Contributions. ${contribList}`,
    `Organization. Section II formulates the problem. Section III positions this survey relative to prior reviews. Section IV details the methodology. Section V presents the taxonomy. Section VI synthesizes literature by taxonomy branch. Section VII provides comparative tables. Sections VIII–IX analyze challenges, trends/gaps, and future directions. Section X concludes.`,
  ].join(" ");
}

function draftBackground(topic: string, rows: MatrixRow[]): string {
  const field = topic.replace(/^A Survey of\s+/i, "");
  const sampleGaps = rows
    .map((r) => r.gaps.split(/[.;]/)[0].trim())
    .filter(Boolean)
    .slice(0, 3);

  return [
    `We treat ${field} as a socio-technical research problem that couples sensing/decision components, coordination mechanisms, and evaluation under resource and safety constraints.`,
    `Figure (Problem Illustration) depicts the canonical pipeline: inputs (environment, objectives, constraints) flow through a system core (planning, learning, communication) toward outcomes (performance, robustness, scalability), while recurring frictions surface as research gaps.`,
    sampleGaps.length
      ? `Matrix annotations repeatedly surface issues such as ${sampleGaps.join("; ").toLowerCase()}.`
      : `Gap annotations in the matrix are sparse; the problem diagram therefore emphasizes structural bottlenecks commonly discussed in the broader literature.`,
    `This formulation anchors later taxonomy branches and ensures that challenges discussed downstream remain coupled to the same problem elements.`,
  ].join(" ");
}

function draftRelatedSurveys(rows: MatrixRow[], papers: DiscoveredPaper[]): string {
  const surveys = rows.filter((r) => /survey|review|taxonomy/i.test(r.title));
  if (!surveys.length) {
    return [
      `We did not find a dense cluster of prior survey papers inside the seed matrix; positioning is therefore relative to highly cited discovered works and the novelty of our taxonomy-driven comparison artifacts.`,
      `Compared with narrative reviews that catalog methods chronologically, this survey adds (i) an explicit multi-level taxonomy, (ii) concept-centric comparison tables, and (iii) a challenges map aligned with taxonomy dimensions.`,
    ].join(" ");
  }

  const lines = surveys.slice(0, 4).map((s) => {
    const p = papers.find((x) => x.title === s.title);
    const cite = p ? `[${refIndex(papers, p.id)}]` : "";
    return `${s.authors || "Prior authors"} (${s.year ?? "n.d."})${cite} focus on ${(s.method || s.notes || "broad coverage").split(/[.;]/)[0].toLowerCase()}`;
  });

  return [
    `Several related surveys and systematic reviews appear in the matrix: ${lines.join("; ")}.`,
    `Table (Related Surveys) summarizes their primary focus and clarifies our complementary contribution.`,
    `In short, prior reviews often emphasize a single slice (algorithms, applications, or definitions), whereas we integrate problem formulation, taxonomy, comparative tables, and a trends–gaps Venn analysis in one coherent framework.`,
  ].join(" ");
}

function draftMethodSection(rows: MatrixRow[], discoveredCount: number): string {
  return [
    `Protocol. We follow a matrix-driven survey protocol designed for transparency and reproducibility of the synthesis process.`,
    `Seed corpus. Researcher-provided synthesis-matrix rows supply bibliographic fields plus method, findings, gaps, and theme-oriented annotations (${rows.length} included titles after cleaning).`,
    `Enrichment. OpenAlex (Semantic Scholar fallback) is queried with theme/keyword phrases extracted from the matrix; up to ${discoveredCount} external candidates are considered before DOI/title deduplication.`,
    `Inclusion. Works are retained when they overlap matrix themes; venue prestige alone is not used as a filter.`,
    `Synthesis. We adopt a concept-centric strategy: evidence is aggregated under taxonomy dimensions, supported by comparison tables and visual artifacts (taxonomy, problem diagram, challenge map, Venn trends–gaps).`,
    `Limitations of the draft. Generated prose and figures are drafting aids; authors must verify claims against primary sources before submission.`,
  ].join(" ");
}

function draftTaxonomySection(themes: string[]): string {
  return [
    `An impactful survey requires an organizing schema rather than a chronological catalog.`,
    `We therefore construct a multi-level taxonomy with three backbone branches—Problem & Scope, Methods & Control, and Evaluation & Gaps—specialized into leaf clusters observed in the matrix: ${themes.join(", ") || "General"}.`,
    `Figure (Field Taxonomy) visualizes the hierarchy and study counts per leaf.`,
    `This schema is used consistently in the synthesis, comparison, challenges, and future-work sections so readers can navigate the field as a structured map rather than a flat bibliography.`,
  ].join(" ");
}

function draftThemeSections(rows: MatrixRow[], papers: DiscoveredPaper[]): SurveySection[] {
  const grouped = groupByTheme(rows);
  const sections: SurveySection[] = [];
  let i = 0;
  for (const [theme, themeRows] of grouped) {
    i++;
    const paragraphs: string[] = [];
    paragraphs.push(
      `Within the “${theme}” branch (${themeRows.length} matrix studies), we synthesize shared problem framings, dominant techniques, and unresolved tensions rather than restating each abstract.`
    );

    for (const row of themeRows.slice(0, 3)) {
      const matrixPaper = papers.find((p) => p.title === row.title);
      const cite = matrixPaper ? `[${refIndex(papers, matrixPaper.id)}]` : "";
      const related = pickRelated(papers, row, 2);
      const relatedCites = related.map((p) => `[${refIndex(papers, p.id)}]`).join(", ");
      const method = row.method ? ` Methodologically, they rely on ${row.method.replace(/\.$/, "")}.` : "";
      const finding = row.findings
        ? ` Reported outcomes indicate that ${row.findings.charAt(0).toLowerCase()}${row.findings.slice(1).replace(/\.$/, "")}.`
        : "";
      const gap = row.gaps
        ? ` A key limitation remains that ${row.gaps.charAt(0).toLowerCase()}${row.gaps.slice(1).replace(/\.$/, "")}.`
        : "";
      const bridge = relatedCites
        ? ` Related literature ${relatedCites} provides additional comparative context.`
        : "";

      paragraphs.push(
        `${row.authors || "The authors"} (${row.year ?? "n.d."})${cite} examine “${row.title}”.${method}${finding}${gap}${bridge}`
          .replace(/\s+\./g, ".")
          .replace(/\.\./g, ".")
      );
    }

    if (themeRows.length > 3) {
      paragraphs.push(
        `Additional matrix entries under ${theme} are folded into the comparative table rather than restated exhaustively, preserving a synthesis-first narrative.`
      );
    }

    sections.push({
      id: `theme-${i}`,
      heading: theme,
      level: 2,
      content: paragraphs.join("\n\n"),
      citations: themeRows.map((r) => r.id),
    });
  }
  return sections;
}

function draftComparison(rows: MatrixRow[]): string {
  const methods = new Set(rows.map((r) => r.method.split(/[.;]/)[0].trim()).filter(Boolean));
  return [
    `Comparative analysis is concept-centric: we juxtapose studies on method focus, reported findings, and limitations rather than ranking venues.`,
    `Across the matrix we observe ${methods.size || "several"} distinct methodological labels, with uneven specificity in evaluation protocols.`,
    `Figure/Table (Comparative Study Matrix) summarizes representative rows; readers should use it to locate trade-offs (for example, fidelity versus scalability, or security overhead versus coordination latency).`,
    `Two patterns recur. First, highly detailed method descriptions often coexist with thin external validation. Second, gap statements are more actionable when tied to measurable failure modes (communication delay, perception noise, adversarial disruption) than when left as generic “future work”.`,
  ].join(" ");
}

function draftChallenges(rows: MatrixRow[], themes: string[]): string {
  const gaps = rows.map((r) => r.gaps).filter(Boolean).slice(0, 6);
  return [
    `Open challenges are aligned with the taxonomy dimensions (${themes.slice(0, 5).join(", ") || "general themes"}) so that future work can be traced back to the same organizing schema.`,
    `Figure/Table (Challenge Map) consolidates severity-tagged challenges derived from matrix gap fields.`,
    gaps.length
      ? `Evidence snippets include: ${gaps.map((g) => g.replace(/\.$/, "")).slice(0, 4).join("; ")}.`
      : `Because gap annotations are sparse, we elevate cross-cutting issues such as benchmark scarcity and reproducibility.`,
    `We distinguish engineering challenges (implementation, communication, energy) from scientific challenges (theory of coordination under uncertainty, assurance, and generalization), which helps avoid conflating deployment pain with open research questions.`,
  ].join(" ");
}

function draftTrendsGaps(): string {
  return [
    `To expose concentration versus neglect, we render a Venn-style map of active methodological trends against persistent gap tokens extracted from the matrix.`,
    `Figure (Trends and Gaps Venn Map) highlights three regions: (i) actively pursued techniques, (ii) repeatedly reported gaps, and (iii) overlap opportunities where popular methods still fail to close known limitations.`,
    `High-impact surveys use such visuals to prevent “more of the same” follow-on papers and to steer effort toward under-served intersections (for example, secure coordination under realistic communication constraints).`,
  ].join(" ");
}

function draftFuture(themes: string[]): string {
  return [
    `Future directions are stated as research programs mapped to taxonomy branches rather than as vague wishes.`,
    `For each major dimension (${themes.slice(0, 4).join(", ") || "core themes"}), we recommend: shared evaluation protocols; negative-result reporting; and open artifacts (code, configs, traces).`,
    `Cross-cutting priorities include hybrid centralized–distributed architectures, assurance under distribution shift, and human-centered operational metrics beyond raw task success.`,
    `These directions intentionally mirror the challenge map so that progress can be audited against the same dimensions used throughout the survey.`,
  ].join(" ");
}

function draftConclusion(topic: string, rows: MatrixRow[], contributions: string[]): string {
  return [
    `This survey delivered a taxonomy-driven reading of ${rows.length} seed studies on ${topic.replace(/^A Survey of\s+/i, "").toLowerCase()}, supported by problem illustration, comparative tables, a challenge map, and a trends–gaps Venn analysis.`,
    `The main takeaways are: ${contributions.slice(0, 3).join("; ")}.`,
    `Authors should verify citations against primary sources, refine venue-specific formatting, and replace placeholder metadata before submission to IEEE/ACM-style venues.`,
  ].join(" ");
}

async function maybeEnhanceWithOpenAI(
  paper: SurveyPaper,
  apiKey?: string
): Promise<SurveyPaper> {
  if (!apiKey) return paper;

  try {
    const prompt = {
      title: paper.title,
      abstract: paper.abstract,
      contributions: paper.contributions,
      sections: paper.sections.map((s) => ({ heading: s.heading, content: s.content })),
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.65,
        messages: [
          { role: "system", content: OPENAI_SURVEY_SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(prompt) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return paper;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return paper;
    const parsed = JSON.parse(content) as {
      abstract?: string;
      sections?: { heading: string; content: string }[];
    };

    return {
      ...paper,
      abstract: parsed.abstract || paper.abstract,
      sections: paper.sections.map((section, i) => ({
        ...section,
        content: parsed.sections?.[i]?.content || section.content,
        heading: parsed.sections?.[i]?.heading || section.heading,
      })),
    };
  } catch {
    return paper;
  }
}

export async function generateSurveyPaper(input: {
  rows: MatrixRow[];
  papers: DiscoveredPaper[];
  options: GenerateOptions;
}): Promise<SurveyPaper> {
  const { rows, papers, options } = input;
  const topic = options.topic || "A Systematic Survey of Recent Research";
  const themes = [...groupByTheme(rows).keys()];
  const refs = buildReferences(papers);
  const contributionObjs = defaultContributions(topic, rows.length, themes.length || 1);
  const contributionTexts = contributionObjs.map((c) => `${c.label}: ${c.detail}`);

  const { figures, tables } = options.includeFigures
    ? generateFiguresAndTables(rows, papers, topic)
    : { figures: [], tables: [] };

  const sections: SurveySection[] = [
    {
      id: "intro",
      heading: "Introduction",
      level: 1,
      content: draftIntroduction(topic, rows, papers, themes, contributionObjs),
      citations: papers.slice(0, 3).map((p) => p.id),
    },
    {
      id: "background",
      heading: "Background and Problem Formulation",
      level: 1,
      content: draftBackground(topic, rows),
      citations: [],
    },
    {
      id: "related-surveys",
      heading: "Related Surveys and Positioning",
      level: 1,
      content: draftRelatedSurveys(rows, papers),
      citations: [],
    },
    {
      id: "method",
      heading: "Review Methodology",
      level: 1,
      content: draftMethodSection(rows, Math.max(papers.length - rows.length, 0)),
      citations: [],
    },
    {
      id: "taxonomy",
      heading: "Taxonomy of the Field",
      level: 1,
      content: draftTaxonomySection(themes),
      citations: [],
    },
    {
      id: "synthesis",
      heading: "Literature Synthesis by Taxonomy",
      level: 1,
      content:
        "The following subsections synthesize evidence under each taxonomy leaf. We emphasize agreements, contradictions, and boundary conditions rather than enumerating every abstract.",
      citations: [],
    },
    ...draftThemeSections(rows, papers),
    {
      id: "comparison",
      heading: "Comparative Analysis",
      level: 1,
      content: draftComparison(rows),
      citations: papers.slice(0, 5).map((p) => p.id),
    },
    {
      id: "challenges",
      heading: "Challenges and Open Problems",
      level: 1,
      content: draftChallenges(rows, themes),
      citations: [],
    },
    {
      id: "trends-gaps",
      heading: "Trends, Overlaps, and Research Gaps",
      level: 1,
      content: draftTrendsGaps(),
      citations: [],
    },
    {
      id: "future",
      heading: "Future Research Directions",
      level: 1,
      content: draftFuture(themes),
      citations: [],
    },
    {
      id: "conclusion",
      heading: "Conclusion",
      level: 1,
      content: draftConclusion(topic, rows, contributionTexts),
      citations: [],
    },
  ];

  let paper: SurveyPaper = {
    title: topic,
    abstract: draftAbstract(topic, rows, papers, themes, contributionTexts),
    keywords: themes.slice(0, 6),
    authorsPlaceholder: options.authorName || "Author Name",
    contributions: contributionTexts,
    sections,
    references: refs,
    figures,
    tables,
    template: options.template,
    metadata: {
      generatedAt: new Date().toISOString(),
      matrixPaperCount: rows.length,
      discoveredPaperCount: Math.max(papers.length - rows.length, 0),
      humanized: false,
      topic,
      rubric: "high-impact-v1",
    },
  };

  paper = await maybeEnhanceWithOpenAI(paper, options.openaiApiKey);

  if (options.humanize) {
    paper = {
      ...paper,
      abstract: humanizeText(paper.abstract),
      sections: humanizePaperSections(paper.sections),
      metadata: { ...paper.metadata, humanized: true },
    };
  }

  return paper;
}
