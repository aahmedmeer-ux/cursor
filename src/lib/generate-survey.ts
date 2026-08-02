import type {
  DiscoveredPaper,
  GenerateOptions,
  MatrixRow,
  ReferenceEntry,
  SurveyPaper,
  SurveySection,
} from "./types";
import { generateFigures } from "./figures";
import { humanizePaperSections, humanizeText } from "./humanize";

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

function themeKeysForRow(row: MatrixRow): string[] {
  // Only split on clear list separators — never on "/" (e.g. Synchronous/Centralized)
  const parts = row.themes
    .split(/[;|]/)
    .map((t) => t.trim())
    .filter((t) => t && t.length <= 48 && !/^n\/?a\b/i.test(t));

  // Long technique dumps → use title-derived buckets instead
  const looksLikeDump =
    !parts.length ||
    parts.some(
      (p) =>
        p.length > 48 ||
        p.includes(":") ||
        /\//.test(p) ||
        (p.includes(",") && p.split(/\s+/).length > 6)
    );

  if (looksLikeDump) {
    const title = row.title.toLowerCase();
    if (/\b(survey|review|taxonomy)\b/.test(title)) return ["Surveys and reviews"];
    if (title.includes("formation")) return ["Formation control"];
    if (title.includes("tracking")) return ["Target tracking"];
    if (title.includes("security") || title.includes("blockchain") || title.includes("secure")) {
      return ["Security and resilience"];
    }
    if (title.includes("simulation") || title.includes("sitl")) return ["Simulation and evaluation"];
    if (title.includes("path planning") || title.includes("navigation")) return ["Path planning and navigation"];
    if (title.includes("definition") || title.includes("defining")) return ["Definitions and policy"];
    if (title.includes("modernization") || title.includes("mission")) return ["Mission planning and modernization"];
    if (title.includes("swarm") || title.includes("uav") || title.includes("drone")) {
      return ["Swarm coordination"];
    }
    return ["General"];
  }

  return parts.slice(0, 1);
}

function groupByTheme(rows: MatrixRow[]): Map<string, MatrixRow[]> {
  const raw = new Map<string, MatrixRow[]>();
  for (const row of rows) {
    for (const key of themeKeysForRow(row)) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      const list = raw.get(label) ?? [];
      list.push(row);
      raw.set(label, list);
    }
  }

  // Keep the most populated themes so the survey stays readable
  const ranked = [...raw.entries()].sort((a, b) => b[1].length - a[1].length);
  const keep = ranked.slice(0, 8);
  const map = new Map<string, MatrixRow[]>(keep);
  if (ranked.length > 8) {
    const extras = ranked.slice(8).flatMap(([, list]) => list);
    const existing = new Set(keep.flatMap(([, list]) => list.map((r) => r.id)));
    const uniqueExtras = extras.filter((r) => !existing.has(r.id));
    if (uniqueExtras.length) map.set("Additional related studies", uniqueExtras);
  }
  return map;
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

function draftAbstract(
  topic: string,
  rows: MatrixRow[],
  papers: DiscoveredPaper[],
  themes: string[]
): string {
  const years = rows.map((r) => r.year).filter((y): y is number => Boolean(y));
  const minY = years.length ? Math.min(...years) : null;
  const maxY = years.length ? Math.max(...years) : null;
  const span = minY && maxY ? ` spanning ${minY}–${maxY}` : "";
  return sentenceJoin([
    `This survey synthesizes ${rows.length} primary studies from a curated synthesis matrix${span}, complemented by ${Math.max(papers.length - rows.length, 0)} related works retrieved from open scholarly indexes`,
    `The review organizes the literature around ${themes.slice(0, 4).join(", ") || "emerging research themes"} and compares methodological choices, reported findings, and unresolved gaps`,
    `We highlight recurring evaluation practices, cross-study contradictions, and opportunities for reproducible follow-up research`,
    `The resulting narrative is intended as a drafting aid for journal-ready survey manuscripts and should be validated by domain experts before submission`,
  ]);
}

function draftIntroduction(
  topic: string,
  rows: MatrixRow[],
  papers: DiscoveredPaper[]
): string {
  const first = papers[0];
  const second = papers[1];
  const c1 = first ? `[${refIndex(papers, first.id)}]` : "";
  const c2 = second ? `[${refIndex(papers, second.id)}]` : "";
  return [
    `${topic.replace(/^A Survey of\s+/i, "Research on ")} has expanded quickly, producing a fragmented body of methods, datasets, and claims that are difficult to compare without a structured synthesis.`,
    `Prior studies${c1}${c2 ? ` and ${c2}` : ""} illustrate both the promise of the area and the inconsistency of evaluation protocols.`,
    `Using a synthesis matrix of ${rows.length} seed papers and automated discovery of related literature (${papers.length} works in total), this survey consolidates themes, methods, and open problems into a coherent map of the field.`,
    `The remainder of the paper is organized as follows. Section II presents the review method. Section III develops a thematic taxonomy. Section IV compares methodological strands. Section V discusses findings and gaps. Section VI concludes with implications for future work.`,
  ].join(" ");
}

function draftMethodSection(rows: MatrixRow[], discoveredCount: number): string {
  return [
    `We followed a matrix-driven survey protocol. Seed studies were ingested from a researcher-provided synthesis matrix containing bibliographic fields, methods, findings, gaps, and theme labels.`,
    `Column headers were normalized through alias matching (for example, “Key Findings” → findings; “Limitations” → gaps), after which empty titles were discarded.`,
    `Online enrichment queried OpenAlex (with Semantic Scholar as fallback) using theme and keyword phrases extracted from the matrix, retrieving highly cited related works to reduce coverage bias in the seed set (${discoveredCount} external candidates considered before deduplication).`,
    `Inclusion emphasized topical overlap with matrix themes rather than venue prestige alone. Deduplication used DOI when available and normalized titles otherwise.`,
    `The narrative was then drafted section-wise from matrix cells and abstract snippets, with optional stylistic humanization to reduce repetitive transitional phrasing. Generated prose is a structured synthesis draft, not a substitute for expert scholarly judgment.`,
  ].join(" ");
}

function draftThemeSections(
  rows: MatrixRow[],
  papers: DiscoveredPaper[]
): SurveySection[] {
  const grouped = groupByTheme(rows);
  const sections: SurveySection[] = [];
  let i = 0;
  for (const [theme, themeRows] of grouped) {
    i++;
    const paragraphs: string[] = [];
    paragraphs.push(
      `Work under the “${theme}” theme accounts for ${themeRows.length} matrix entries and forms one of the central organizing axes of this survey.`
    );

    for (const row of themeRows.slice(0, 4)) {
      const matrixPaper = papers.find((p) => p.title === row.title);
      const cite = matrixPaper ? `[${refIndex(papers, matrixPaper.id)}]` : "";
      const related = pickRelated(papers, row, 2);
      const relatedCites = related
        .map((p) => `[${refIndex(papers, p.id)}]`)
        .join(", ");

      const method = row.method
        ? ` adopting ${row.method.replace(/\.$/, "")}`
        : "";
      const finding = row.findings
        ? ` They report that ${row.findings.charAt(0).toLowerCase()}${row.findings.slice(1).replace(/\.$/, "")}`
        : "";
      const gap = row.gaps
        ? ` A lingering limitation is that ${row.gaps.charAt(0).toLowerCase()}${row.gaps.slice(1).replace(/\.$/, "")}`
        : "";
      const bridge = relatedCites
        ? ` Related evidence ${relatedCites} situates these claims within a broader comparative context.`
        : "";

      paragraphs.push(
        `${row.authors || "The authors"} (${row.year ?? "n.d."})${cite} examine “${row.title}”${method}.${finding}.${gap}.${bridge}`
          .replace(/\.\./g, ".")
          .replace(/\s+\./g, ".")
      );
    }

    if (themeRows.length > 4) {
      paragraphs.push(
        `Additional matrix studies on ${theme} echo similar methodological trade-offs and are summarized in the comparative figure rather than restated exhaustively here.`
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

function draftDiscussion(rows: MatrixRow[], papers: DiscoveredPaper[]): string {
  const gaps = rows.map((r) => r.gaps).filter(Boolean).slice(0, 5);
  const methods = new Set(rows.map((r) => r.method.split(/[.;]/)[0].trim()).filter(Boolean));
  return [
    `Across ${papers.length} works, methodological diversity is substantial (${methods.size || "several"} distinct approach labels in the matrix), yet evaluation criteria remain unevenly specified.`,
    gaps.length
      ? `Recurring gaps include: ${gaps.map((g) => g.replace(/\.$/, "")).join("; ")}.`
      : `Gap annotations were sparse in the matrix; future curation should capture limitation statements more consistently.`,
    `Three cross-cutting observations emerge. First, many studies optimize narrow benchmarks without stress-testing transfer. Second, reporting of negative results is uncommon, which can inflate perceived maturity. Third, reproducibility artifacts (code, seeds, splits) are inconsistently linked from bibliographic records.`,
    `These patterns suggest that the next wave of contributions should prioritize shared tasks, transparent ablations, and longitudinal validation rather than isolated accuracy gains.`,
  ].join(" ");
}

function draftConclusion(topic: string, rows: MatrixRow[]): string {
  return [
    `This survey assembled a structured reading of ${rows.length} seed studies on ${topic.replace(/^A Survey of\s+/i, "").toLowerCase()}, enriched with open-index discovery and figure-supported comparisons.`,
    `The synthesis clarifies thematic clusters, contrasts methods, and surfaces actionable research gaps for subsequent empirical work.`,
    `Authors should revise claims against primary sources, tighten citations to venue style, and replace placeholder author metadata before journal submission.`,
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
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You are an expert academic survey writer. Rewrite the provided survey draft to improve clarity, scholarly tone, and structural variety while preserving all citation markers like [1], [2]. Do not invent citations. Return strict JSON with keys abstract (string) and sections (array of {heading, content}).",
          },
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

  const sections: SurveySection[] = [
    {
      id: "intro",
      heading: "Introduction",
      level: 1,
      content: draftIntroduction(topic, rows, papers),
      citations: papers.slice(0, 3).map((p) => p.id),
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
      heading: "Thematic Taxonomy",
      level: 1,
      content: [
        `We organize the literature into ${themes.length} thematic clusters derived from matrix labels and concept tags attached to discovered works: ${themes.join(", ") || "General"}.`,
        `Figure 1 visualizes this taxonomy; subsequent subsections synthesize representative studies within each cluster.`,
      ].join(" "),
      citations: [],
    },
    ...draftThemeSections(rows, papers),
    {
      id: "methods-compare",
      heading: "Methodological Comparison",
      level: 1,
      content: [
        `Method choices in the matrix range across experimental, analytical, and hybrid designs. Figure 2 summarizes their distribution.`,
        `Comparative inspection (Figure 4) shows that studies with explicit limitation statements tend to propose narrower claims, while highly cited discovered works often provide broader framing without always matching the matrix’s application constraints.`,
        draftDiscussion(rows, papers),
      ].join("\n\n"),
      citations: papers.slice(0, 5).map((p) => p.id),
    },
    {
      id: "gaps",
      heading: "Open Challenges and Research Gaps",
      level: 1,
      content: [
        `Gap analysis aggregates limitation fields from the synthesis matrix and contrasts them with abstracts of discovered literature.`,
        `Figure 5 enumerates the most recurrent unresolved issues. Addressing them will require shared benchmarks, richer reporting standards, and cross-institutional replication.`,
      ].join(" "),
      citations: [],
    },
    {
      id: "conclusion",
      heading: "Conclusion",
      level: 1,
      content: draftConclusion(topic, rows),
      citations: [],
    },
  ];

  let paper: SurveyPaper = {
    title: topic,
    abstract: draftAbstract(topic, rows, papers, themes),
    keywords: themes.slice(0, 6),
    authorsPlaceholder: options.authorName || "Author Name",
    sections,
    references: refs,
    figures: options.includeFigures ? generateFigures(rows, papers, topic) : [],
    template: options.template,
    metadata: {
      generatedAt: new Date().toISOString(),
      matrixPaperCount: rows.length,
      discoveredPaperCount: Math.max(papers.length - rows.length, 0),
      humanized: false,
      topic,
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
