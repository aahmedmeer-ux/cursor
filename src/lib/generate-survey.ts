import type {
  DiscoveredPaper,
  GenerateOptions,
  MatrixRow,
  SurveyPaper,
  SurveySection,
} from "./types";
import { buildIeeeReferences, cite, citeMany, matchPaper, sanitizePaperTextDeep } from "./citations";
import { generateEquations } from "./equations";
import { generateFiguresAndTables } from "./figures";
import { humanizePaperSections, humanizeText } from "./humanize";
import { defaultContributions, OPENAI_SURVEY_SYSTEM_PROMPT } from "./survey-rubric";
import { groupByTheme } from "./taxonomy";

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

function pickRelated(papers: DiscoveredPaper[], row: MatrixRow, limit = 2): DiscoveredPaper[] {
  const tokens = `${row.themes} ${row.keywords} ${row.title}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3);
  const self = matchPaper(papers, row.title);
  return papers
    .filter((p) => !self || p.id !== self.id)
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

function draftAbstract(
  topic: string,
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  themes: string[],
  contributions: string[]
): string {
  const seedCites = citeMany(
    papers,
    rows.slice(0, 4).map((r) => r.title)
  );
  return sentenceJoin([
    `This survey synthesizes ${rows.length} primary studies from a curated synthesis matrix${yearSpan(rows)}${seedCites ? ` ${seedCites}` : ""}, complemented by ${Math.max(papers.length - rows.length, 0)} related works retrieved from open scholarly indexes`,
    `Rather than enumerating papers in isolation, we contribute a taxonomy-driven synthesis of ${topic.replace(/^A Survey of\s+/i, "")} organized around ${themes.slice(0, 4).join(", ") || "emergent research dimensions"}`,
    `The review couples a problem-formulation diagram, comparative tables, analytical equations, a challenge map, and a trends–gaps Venn analysis`,
    `Key contributions include: ${contributions.slice(0, 3).join("; ")}`,
  ]);
}

function draftIntroduction(
  topic: string,
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  themes: string[],
  contributions: { label: string; detail: string }[]
): string {
  const field = topic.replace(/^A Survey of\s+/i, "");
  const top = papers.slice(0, 5);
  const topCite = citeMany(
    papers,
    top.map((p) => p.id)
  );
  const matrixCite = citeMany(
    papers,
    rows.slice(0, 6).map((r) => r.title)
  );

  const contribList = contributions
    .map((c, i) => `(${i + 1}) ${c.label}: ${c.detail}`)
    .join(" ");

  return [
    `Research on ${field} has expanded rapidly, producing a fragmented landscape of methods, evaluation protocols, and claims that are difficult to compare without an organizing schema.`,
    `Seminal and recent contributions ${topCite || matrixCite} illustrate both substantial progress and persistent inconsistency in problem framing.`,
    `Scope. This survey covers ${rows.length} seed studies from a researcher-curated synthesis matrix${yearSpan(rows)}${matrixCite ? ` ${matrixCite}` : ""}, enriched with automated discovery of related literature (${papers.length} works after deduplication).`,
    `Dominant themes include ${themes.slice(0, 5).join(", ") || "cross-cutting methodological clusters"}.`,
    `We deliberately emphasize synthesis over paper-by-paper listing: each section situates evidence inside a shared taxonomy and cites primary sources with IEEE numbered references.`,
    `Contributions. ${contribList}`,
    `Organization. Section II formulates the problem and analytical foundations. Section III positions this survey relative to prior reviews. Section IV details the methodology. Section V presents the taxonomy. Section VI synthesizes literature by taxonomy branch. Section VII provides comparative tables. Sections VIII–IX analyze challenges, trends/gaps, and future directions. Section X concludes.`,
  ].join(" ");
}

function draftBackground(topic: string, rows: MatrixRow[], papers: DiscoveredPaper[]): string {
  const field = topic.replace(/^A Survey of\s+/i, "");
  const sampleGaps = rows
    .map((r) => r.gaps.split(/[.;]/)[0].trim())
    .filter(Boolean)
    .slice(0, 3);
  const citeSample = citeMany(
    papers,
    rows.slice(0, 4).map((r) => r.title)
  );

  return [
    `We treat ${field} as a socio-technical research problem that couples sensing/decision components, coordination mechanisms, and evaluation under resource and safety constraints.`,
    `Figure 1 (Problem Illustration) depicts the canonical pipeline: inputs (environment, objectives, constraints) flow through a system core (planning, learning, communication) toward outcomes (performance, robustness, scalability), while recurring frictions surface as research gaps.`,
    `Representative matrix studies ${citeSample} motivate this shared problem model.`,
    sampleGaps.length
      ? `Matrix annotations repeatedly surface issues such as ${sampleGaps.join("; ").toLowerCase()}.`
      : `Gap annotations in the matrix are sparse; the problem diagram therefore emphasizes structural bottlenecks commonly discussed in the broader literature.`,
    `Analytical foundations. The following equations formalize quantities that recur across the surveyed techniques; they provide a common notation for later comparison.`,
  ].join(" ");
}

function draftRelatedSurveys(rows: MatrixRow[], papers: DiscoveredPaper[]): string {
  const surveys = rows.filter((r) => /survey|review|taxonomy/i.test(r.title));
  if (!surveys.length) {
    const sample = papers.slice(0, 3);
    const paras = sample.map((p) => {
      const c = cite(papers, p.id);
      return `${p.authors.slice(0, 2).join(" and ") || "Prior work"} (${p.year ?? "n.d."})${c} provides a related reference point through “${p.title}”, which we use for positioning rather than as a full prior survey.`;
    });
    return [
      `We did not find a dense cluster of prior survey papers inside the seed matrix; positioning is therefore developed against a few highly relevant discovered works, discussed individually below.`,
      ...paras,
      `Compared with narrative reviews that catalog methods chronologically, this survey adds (i) an explicit multi-level taxonomy, (ii) concept-centric comparison tables with numbered citations, and (iii) a challenges map aligned with taxonomy dimensions.`,
    ].join("\n\n");
  }

  // Discuss each prior survey in its own paragraph (no semicolon dump)
  const paras = surveys.slice(0, 6).map((s) => {
    const c = cite(papers, s.title);
    const focus = (s.method || s.notes || "broad coverage").split(/[.;]/)[0].toLowerCase();
    const gap = s.gaps
      ? ` Their remaining limitation is that ${s.gaps.charAt(0).toLowerCase()}${s.gaps.slice(1).replace(/\.$/, "")}.`
      : "";
    return `${s.authors || "Prior authors"} (${s.year ?? "n.d."})${c} survey “${s.title}”, with primary focus on ${focus}.${gap} We treat this as a complementary slice rather than a substitute for a taxonomy-driven synthesis.`;
  });

  return [
    `Related surveys and systematic reviews in the matrix are reviewed individually so that each contribution—and its blind spot—is explicit.`,
    ...paras,
    `Table I (Related Surveys) summarizes their primary focus and clarifies our complementary contribution: we integrate problem formulation, taxonomy, comparative tables, equations, and a trends–gaps Venn analysis in one coherent framework.`,
  ].join("\n\n");
}

function draftMethodSection(rows: MatrixRow[], discoveredCount: number, papers: DiscoveredPaper[]): string {
  const seedCite = citeMany(
    papers,
    rows.slice(0, 3).map((r) => r.title)
  );
  return [
    `Protocol. We follow a matrix-driven survey protocol designed for transparency and reproducibility of the synthesis process.`,
    `Seed corpus. Researcher-provided synthesis-matrix rows supply bibliographic fields plus method, findings, gaps, and theme-oriented annotations (${rows.length} included titles after cleaning)${seedCite ? `, e.g. ${seedCite}` : ""}.`,
    `Enrichment. OpenAlex (Semantic Scholar fallback) is queried with theme/keyword phrases extracted from the matrix; up to ${discoveredCount} external candidates are considered before DOI/title deduplication.`,
    `Inclusion. Works are retained when they overlap matrix themes; venue prestige alone is not used as a filter.`,
    `Citation policy. Every matrix study discussed in the synthesis is assigned a numbered IEEE reference; in-text markers of the form [n] map one-to-one onto the reference list.`,
    `Synthesis. We adopt a concept-centric strategy: evidence is aggregated under taxonomy dimensions, supported by comparison tables, equations, and visual artifacts (taxonomy, problem diagram, challenge map, Venn trends–gaps).`,
  ].join(" ");
}

function draftTaxonomySection(themes: string[], papers: DiscoveredPaper[], rows: MatrixRow[]): string {
  const themeCite = citeMany(
    papers,
    rows.slice(0, 5).map((r) => r.title)
  );
  return [
    `An impactful survey requires an organizing schema rather than a chronological catalog.`,
    `We therefore construct a multi-level taxonomy with three backbone branches—Problem & Scope, Methods & Control, and Evaluation & Gaps—specialized into leaf clusters observed in the matrix: ${themes.join(", ") || "General"}.`,
    `Figure 2 (Field Taxonomy) visualizes the hierarchy and study counts per leaf, grounded in evidence from ${themeCite || "the seed corpus"}.`,
    `This schema is used consistently in the synthesis, comparison, challenges, and future-work sections so readers can navigate the field as a structured map rather than a flat bibliography.`,
  ].join(" ");
}

function draftThemeSections(
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  detailBudget: number
): SurveySection[] {
  const grouped = groupByTheme(rows);
  const sections: SurveySection[] = [];
  let i = 0;
  // How many papers to discuss in depth per theme (scales with target pages)
  const perTheme = Math.max(2, Math.min(8, detailBudget));

  for (const [theme, themeRows] of grouped) {
    i++;
    const paragraphs: string[] = [];
    paragraphs.push(
      `Within the “${theme}” branch (${themeRows.length} matrix studies), we discuss papers individually or in small pairs so that methods, findings, and limitations remain traceable.`
    );

    const detailed = themeRows.slice(0, perTheme);
    // Pair papers in groups of 1–2 instead of citing everyone up front
    for (let g = 0; g < detailed.length; g++) {
      const row = detailed[g];
      const matrixPaper = matchPaper(papers, row.title);
      const c = matrixPaper ? cite(papers, matrixPaper.id) : cite(papers, row.title);
      const method = row.method ? ` Methodologically, they rely on ${row.method.replace(/\.$/, "")}.` : "";
      const finding = row.findings
        ? ` Reported outcomes indicate that ${row.findings.charAt(0).toLowerCase()}${row.findings.slice(1).replace(/\.$/, "")}.`
        : "";
      const gap = row.gaps
        ? ` A key limitation remains that ${row.gaps.charAt(0).toLowerCase()}${row.gaps.slice(1).replace(/\.$/, "")}.`
        : "";

      const who = row.authors || matrixPaper?.authors.slice(0, 2).join(" and ") || "The authors";
      let para = `${who} (${row.year ?? matrixPaper?.year ?? "n.d."})${c} examine “${row.title}”.${method}${finding}${gap}`
        .replace(/\s+\./g, ".")
        .replace(/\.\./g, ".");

      // Optionally pair with the next paper in the same paragraph only when both are short
      if (g + 1 < detailed.length && (row.findings?.length || 0) < 90 && (detailed[g + 1].findings?.length || 0) < 90) {
        const row2 = detailed[g + 1];
        const mp2 = matchPaper(papers, row2.title);
        const c2 = mp2 ? cite(papers, mp2.id) : cite(papers, row2.title);
        const who2 = row2.authors || mp2?.authors.slice(0, 2).join(" and ") || "The authors";
        const method2 = row2.method ? ` using ${row2.method.replace(/\.$/, "")}` : "";
        para += ` In a closely related line, ${who2} (${row2.year ?? mp2?.year ?? "n.d."})${c2} study “${row2.title}”${method2}. Taken together, the two works illustrate complementary angles under ${theme}.`;
        g++;
      } else {
        // Single related work as a follow-up sentence (not a dump)
        const related = pickRelated(papers, row, 1)[0];
        if (related) {
          const rc = cite(papers, related.id);
          para += ` A useful contrasting reference is ${related.authors.slice(0, 2).join(" and ") || "prior work"} (${related.year ?? "n.d."})${rc}, which sharpens the comparison without expanding into a full secondary review.`;
        }
      }

      paragraphs.push(para);
    }

    if (themeRows.length > perTheme) {
      // Remaining papers in small groups of 2 with brief explanation (not one mega-cite)
      const rest = themeRows.slice(perTheme);
      for (let g = 0; g < rest.length; g += 2) {
        const chunk = rest.slice(g, g + 2);
        const bits = chunk.map((r) => {
          const c = cite(papers, r.title);
          const focus = (r.method || r.findings || "related evidence").split(/[.;]/)[0];
          return `${r.authors || "The authors"} (${r.year ?? "n.d."})${c} (${focus})`;
        });
        paragraphs.push(
          `A smaller follow-on group under ${theme} includes ${bits.join(" and ")}. We fold their quantitative details into the comparative table while retaining the qualitative takeaway here.`
        );
      }
    }

    sections.push({
      id: `theme-${i}`,
      heading: theme,
      level: 2,
      content: paragraphs.join("\n\n"),
      citations: themeRows
        .map((r) => matchPaper(papers, r.title)?.id)
        .filter((id): id is string => Boolean(id)),
    });
  }
  return sections;
}

function draftComparison(rows: MatrixRow[], papers: DiscoveredPaper[]): string {
  const methods = new Set(rows.map((r) => r.method.split(/[.;]/)[0].trim()).filter(Boolean));
  const citeSample = citeMany(
    papers,
    rows.slice(0, 8).map((r) => r.title)
  );
  return [
    `Comparative analysis is concept-centric: we juxtapose studies on method focus, reported findings, and limitations rather than ranking venues.`,
    `Across the matrix we observe ${methods.size || "several"} distinct methodological labels ${citeSample}, with uneven specificity in evaluation protocols.`,
    `Table II / Figure 3 (Comparative Study Matrix) summarizes representative rows with IEEE citation numbers; readers should use it to locate trade-offs (for example, fidelity versus scalability, or security overhead versus coordination latency).`,
    `Two patterns recur. First, highly detailed method descriptions often coexist with thin external validation. Second, gap statements are more actionable when tied to measurable failure modes than when left as generic “future work”.`,
  ].join(" ");
}

function draftChallenges(rows: MatrixRow[], themes: string[], papers: DiscoveredPaper[]): string {
  const withGaps = rows.filter((r) => r.gaps?.trim());
  const paras: string[] = [
    `Open challenges are aligned with the taxonomy dimensions (${themes.slice(0, 5).join(", ") || "general themes"}) so that future work can be traced back to the same organizing schema.`,
    `Figure 4 / Table III (Challenge Map) consolidates severity-tagged challenges and explains why each gap matters for follow-on research.`,
  ];

  // Explain challenges in small groups / individuals — not one dump of all gaps
  for (const row of withGaps.slice(0, 6)) {
    const c = cite(papers, row.title);
    const who = row.authors || "The authors";
    const gap = row.gaps.replace(/\.$/, "");
    const method = row.method ? ` (method: ${row.method.split(/[.;]/)[0]})` : "";
    paras.push(
      `${who} (${row.year ?? "n.d."})${c}${method} surface a concrete limitation: ${gap.charAt(0).toLowerCase()}${gap.slice(1)}. This matters because unresolved ${row.themes.split(/[,;]/)[0]?.trim() || "theme"} issues prevent fair comparison and weaken deployment claims.`
    );
  }

  if (!withGaps.length) {
    paras.push(
      `Because gap annotations are sparse, we elevate cross-cutting issues such as benchmark scarcity, reproducibility artifacts, and weak external validation.`
    );
  }

  paras.push(
    `We distinguish engineering challenges (implementation, communication, energy) from scientific challenges (theory of coordination under uncertainty, assurance, and generalization).`
  );
  return paras.join("\n\n");
}

function draftTrendsGaps(papers: DiscoveredPaper[], rows: MatrixRow[]): string {
  const c = citeMany(
    papers,
    rows.slice(0, 5).map((r) => r.title)
  );
  return [
    `To expose concentration versus neglect, we render a Venn-style map of active methodological trends against persistent gap tokens extracted from the matrix ${c}.`,
    `Figure 5 (Trends and Gaps Venn Map) highlights three regions: (i) actively pursued techniques, (ii) repeatedly reported gaps, and (iii) overlap opportunities where popular methods still fail to close known limitations.`,
    `High-impact surveys use such visuals to prevent “more of the same” follow-on papers and to steer effort toward under-served intersections.`,
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

function draftConclusion(topic: string, rows: MatrixRow[], contributions: string[], papers: DiscoveredPaper[]): string {
  const c = citeMany(
    papers,
    rows.slice(0, 5).map((r) => r.title)
  );
  return [
    `This survey delivered a taxonomy-driven reading of ${rows.length} seed studies on ${topic.replace(/^A Survey of\s+/i, "").toLowerCase()} ${c}, supported by problem illustration, equations, comparative tables, a challenge map, and a trends–gaps Venn analysis.`,
    `The main takeaways are: ${contributions.slice(0, 3).join("; ")}.`,
  ].join(" ");
}

/** Enrich comparison table with IEEE citation numbers. */
function addCitationColumn(
  tables: ReturnType<typeof generateFiguresAndTables>["tables"],
  rows: MatrixRow[],
  papers: DiscoveredPaper[]
) {
  return tables.map((table) => {
    if (table.kind !== "comparison") return table;
    const headers = ["Ref.", ...table.headers];
    const enriched = table.rows.map((row, i) => {
      const title = rows[i]?.title || row[0];
      const c = cite(papers, title).replace(/[\[\]]/g, "") || "—";
      return [c, ...row];
    });
    return { ...table, headers, rows: enriched };
  });
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
      instruction:
        "Preserve every IEEE citation marker like [1], [2], [1]–[3] exactly. Do not invent citations.",
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.55,
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
      abstract: preserveCitations(paper.abstract, parsed.abstract || paper.abstract),
      sections: paper.sections.map((section, i) => ({
        ...section,
        content: preserveCitations(
          section.content,
          parsed.sections?.[i]?.content || section.content
        ),
        heading: parsed.sections?.[i]?.heading || section.heading,
      })),
    };
  } catch {
    return paper;
  }
}

/** If the rewrite dropped citation markers, fall back to the original text. */
function preserveCitations(original: string, rewritten: string): string {
  const origCites = original.match(/\[\d+\](?:-\[\d+\])?/g) || [];
  if (!origCites.length) return rewritten;
  const rewrittenCites = rewritten.match(/\[\d+\](?:-\[\d+\])?/g) || [];
  if (rewrittenCites.length >= Math.ceil(origCites.length * 0.6)) return rewritten;
  return original;
}

export async function generateSurveyPaper(input: {
  rows: MatrixRow[];
  papers: DiscoveredPaper[];
  options: GenerateOptions;
}): Promise<SurveyPaper> {
  const { rows, papers, options } = input;
  const topic = options.topic || "A Systematic Survey of Recent Research";
  const themes = [...groupByTheme(rows).keys()];
  const refs = buildIeeeReferences(papers);
  const contributionObjs = defaultContributions(topic, rows.length, themes.length || 1);
  const contributionTexts = contributionObjs.map((c) => `${c.label}: ${c.detail}`);
  const equations = generateEquations(topic, rows);

  const taxonomyStyle = options.taxonomyStyle || "semi-scientific";
  const targetPages = Math.max(4, Math.min(30, options.targetPages ?? 10));
  // Map page target → how many papers to discuss in depth per theme
  const detailBudget = targetPages <= 6 ? 2 : targetPages <= 10 ? 4 : targetPages <= 16 ? 6 : 8;

  const generated = options.includeFigures
    ? generateFiguresAndTables(rows, papers, topic, taxonomyStyle)
    : { figures: [], tables: [] };
  const figures = generated.figures;
  const tables = addCitationColumn(generated.tables, rows, papers);

  let sections: SurveySection[] = [
    {
      id: "intro",
      heading: "Introduction",
      level: 1,
      content: draftIntroduction(topic, rows, papers, themes, contributionObjs),
      citations: papers.slice(0, 6).map((p) => p.id),
    },
    {
      id: "background",
      heading: "Background and Problem Formulation",
      level: 1,
      content: draftBackground(topic, rows, papers),
      citations: rows.slice(0, 4).map((r) => matchPaper(papers, r.title)?.id).filter(Boolean) as string[],
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
      content: draftMethodSection(rows, Math.max(papers.length - rows.length, 0), papers),
      citations: [],
    },
    {
      id: "taxonomy",
      heading: "Taxonomy of the Field",
      level: 1,
      content: draftTaxonomySection(themes, papers, rows),
      citations: [],
    },
    {
      id: "synthesis",
      heading: "Literature Synthesis by Taxonomy",
      level: 1,
      content:
        "The following subsections synthesize evidence under each taxonomy leaf. We emphasize agreements, contradictions, and boundary conditions, and we cite each discussed primary study with IEEE numbered references.",
      citations: [],
    },
    ...draftThemeSections(rows, papers, detailBudget),
    {
      id: "comparison",
      heading: "Comparative Analysis",
      level: 1,
      content: draftComparison(rows, papers),
      citations: rows.slice(0, 8).map((r) => matchPaper(papers, r.title)?.id).filter(Boolean) as string[],
    },
    {
      id: "challenges",
      heading: "Challenges and Open Problems",
      level: 1,
      content: draftChallenges(rows, themes, papers),
      citations: [],
    },
    {
      id: "trends-gaps",
      heading: "Trends, Overlaps, and Research Gaps",
      level: 1,
      content: draftTrendsGaps(papers, rows),
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
      content: draftConclusion(topic, rows, contributionTexts, papers),
      citations: [],
    },
  ];

  // For longer targets, expand background / future with an extra analytical paragraph
  if (targetPages >= 12) {
    sections = sections.map((s) => {
      if (s.id === "background") {
        return {
          ...s,
          content:
            s.content +
            "\n\nWe keep notation consistent across later comparison tables and equations so that claimed gains can be audited against the same symbols used in the problem formulation.",
        };
      }
      if (s.id === "future" && targetPages >= 16) {
        return {
          ...s,
          content:
            s.content +
            "\n\nFor longer-form surveys, we additionally recommend staged evaluation roadmaps (simulation → controlled field trial → multi-site replication) tied explicitly to each taxonomy leaf.",
        };
      }
      return s;
    });
  }

  // Equations stay in structured `paper.equations` only — exporters render them once
  // (injecting formula text into section prose caused PDF duplicates / garbled Unicode).

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
    equations,
    template: options.template,
    taxonomyStyle,
    metadata: {
      generatedAt: new Date().toISOString(),
      matrixPaperCount: rows.length,
      discoveredPaperCount: Math.max(papers.length - rows.length, 0),
      humanized: false,
      topic,
      rubric: "high-impact-v1",
      taxonomyStyle,
      targetPages,
    },
  };

  paper = await maybeEnhanceWithOpenAI(paper, options.openaiApiKey);

  if (options.humanize) {
    paper = {
      ...paper,
      abstract: humanizeText(paper.abstract),
      sections: humanizePaperSections(paper.sections).map((section, i) => ({
        ...section,
        content: preserveCitations(paper.sections[i].content, section.content),
      })),
      metadata: { ...paper.metadata, humanized: true },
    };
  }

  return sanitizePaperTextDeep(paper);
}
