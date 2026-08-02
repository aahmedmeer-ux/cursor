import type { SurveyPaper } from "./types";
import { sanitizeCitationMarkers, sanitizePaperTextDeep } from "./citations";
import { renderEquationSvg } from "./equations";

export type ReviewIssue = {
  id: string;
  severity: "error" | "warn";
  message: string;
  fixed?: boolean;
};

export type ReviewResult = {
  paper: SurveyPaper;
  issues: ReviewIssue[];
  passes: number;
  perfect: boolean;
};

function collectText(paper: SurveyPaper): string {
  return [
    paper.abstract,
    ...paper.sections.map((s) => s.content),
    ...paper.references.map((r) => r.text),
  ].join("\n");
}

function auditTypography(paper: SurveyPaper): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  for (const eq of paper.equations ?? []) {
    const svg = eq.svg || "";
    if (/#(f3f7f8|e8f0f2|foam)|fill=\"var\(--foam\)/i.test(svg)) {
      issues.push({
        id: `eq-typo-bg-${eq.id}`,
        severity: "error",
        message: `Equation ${eq.number} still uses a tinted panel background; should match heading typography (white/transparent).`,
      });
    }
    if (svg && !/Times New Roman|Times,\s*serif/i.test(svg)) {
      issues.push({
        id: `eq-typo-font-${eq.id}`,
        severity: "warn",
        message: `Equation ${eq.number} SVG is not using Times New Roman.`,
      });
    }
    if (!eq.display && !eq.plaintext) {
      issues.push({
        id: `eq-empty-${eq.id}`,
        severity: "error",
        message: `Equation ${eq.number} missing display form.`,
      });
    }
    if (/[\^_]{2,}|\\frac|\\sum/.test(eq.display || "")) {
      issues.push({
        id: `eq-raw-${eq.id}`,
        severity: "warn",
        message: `Equation ${eq.number} still looks like raw LaTeX.`,
      });
    }
  }

  // Prose must not still dump formula+description under Equation headings
  for (const section of paper.sections) {
    const blocks = section.content.split(/\n{2,}/);
    for (let i = 0; i < blocks.length; i++) {
      if (/^Equation\s*\(\d+\)/i.test(blocks[i].trim())) {
        const next = blocks[i + 1]?.trim() || "";
        if (next && /[=∫Σ]/.test(next) && next.length < 120) {
          issues.push({
            id: `eq-dup-${section.id}-${i}`,
            severity: "error",
            message: `Duplicate equation prose in section “${section.heading}” (will garble PDF).`,
          });
        }
      }
    }
  }

  return issues;
}

function audit(paper: SurveyPaper): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const text = collectText(paper);

  if (/\]_\[/.test(text) || /\]\s*_\s*\[/.test(text)) {
    issues.push({ id: "underscore-cite", severity: "error", message: "Broken citation separator underscore found." });
  }
  if (/Anonymous/i.test(text)) {
    issues.push({ id: "anonymous", severity: "error", message: "Anonymous author still present in prose/references." });
  }
  if (/\bUnknown\s*\(/i.test(text) || /\bUnknown\s+examine/i.test(text)) {
    issues.push({ id: "unknown-author", severity: "warn", message: "Unknown author placeholders remain in synthesis." });
  }
  if (/Prior authors\s*\(/i.test(text)) {
    issues.push({ id: "prior-authors", severity: "warn", message: "Generic “Prior authors” phrasing should be replaced when names exist." });
  }
  if (/\)\[\d+\]/.test(text)) {
    issues.push({
      id: "cite-space",
      severity: "warn",
      message: "Missing space before in-text citation (e.g. \")[3]\").",
    });
  }

  const citeNums = [...text.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const maxCite = citeNums.length ? Math.max(...citeNums) : 0;
  if (maxCite > paper.references.length) {
    issues.push({
      id: "cite-oob",
      severity: "error",
      message: `In-text citation [${maxCite}] exceeds reference list length (${paper.references.length}).`,
    });
  }

  if ((paper.figures?.length ?? 0) === 0) {
    issues.push({ id: "no-figures", severity: "warn", message: "No figures attached to the draft." });
  }
  if ((paper.tables?.length ?? 0) === 0) {
    issues.push({ id: "no-tables", severity: "warn", message: "No comparison/challenge tables attached." });
  }

  if (/Figure\s*\d+/i.test(text) && !(paper.figures?.length ?? 0)) {
    issues.push({ id: "fig-mention", severity: "error", message: "Text mentions figures but none are attached." });
  }

  if (!paper.abstract || paper.abstract.length < 80) {
    issues.push({ id: "short-abstract", severity: "error", message: "Abstract is missing or too short." });
  }

  if (!paper.taxonomyStyle) {
    issues.push({ id: "no-taxonomy-style", severity: "warn", message: "Taxonomy style was not set on the draft." });
  }

  issues.push(...auditTypography(paper));
  return issues;
}

function autofix(paper: SurveyPaper, issues: ReviewIssue[]): SurveyPaper {
  let next = sanitizePaperTextDeep(paper);

  // Rebuild equation SVGs with consistent typography
  next = {
    ...next,
    equations: (next.equations ?? []).map((eq) => ({
      ...eq,
      svg: renderEquationSvg(eq),
    })),
  };

  next = {
    ...next,
    sections: next.sections.map((section) => {
      let content = section.content;
      content = content.replace(/\bUnknown\s*\((\d{4}|n\.d\.)\)/gi, (_m, y) => `The authors (${y})`);
      content = content.replace(/\bPrior authors\s*\((\d{4}|n\.d\.)\)/gi, "Prior work ($1)");
      content = content.replace(/\)\[(\d+)\]/g, ") [$1]");
      content = sanitizeCitationMarkers(content);

      const blocks = content.split(/\n{2,}/);
      const cleaned: string[] = [];
      let skipFollow = false;
      for (const b of blocks) {
        const t = b.trim();
        if (!t) continue;
        if (/^Equation\s*\(\d+\)/i.test(t)) {
          // Drop equation dumps from prose entirely — exporters use structured eqs
          skipFollow = true;
          continue;
        }
        if (skipFollow) {
          if (/[=∫Σ∑√‖]/.test(t) || t.length < 160) continue;
          skipFollow = false;
        }
        // Drop exact formula/description leftovers
        const eqHit = (next.equations ?? []).some(
          (e) =>
            t === e.display ||
            t === e.plaintext ||
            t === e.description ||
            (/[=∫Σ∑√‖]/.test(t) && t.length < 180)
        );
        if (eqHit) continue;
        cleaned.push(t);
      }
      return { ...section, content: cleaned.join("\n\n") };
    }),
    references: next.references.map((r) => ({
      ...r,
      text: sanitizeCitationMarkers(r.text)
        .replace(/\bAnonymous,\s*/gi, "")
        .replace(/\bAnonymous\b/gi, "")
        .replace(/^(\[\d+\])\s+,/, "$1 "),
    })),
  };

  for (const issue of issues) {
    if (
      issue.id === "underscore-cite" ||
      issue.id === "anonymous" ||
      issue.id.startsWith("eq-dup") ||
      issue.id.startsWith("eq-typo") ||
      issue.id === "unknown-author" ||
      issue.id === "prior-authors" ||
      issue.id === "cite-space"
    ) {
      issue.fixed = true;
    }
  }

  return next;
}

async function llmPolish(paper: SurveyPaper, apiKey?: string): Promise<SurveyPaper> {
  if (!apiKey) return paper;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an expert IEEE/ACM survey-paper reviewer and copy editor.
Fix only concrete defects: broken citation markers, Unknown/Anonymous authors, duplicate equation prose, awkward spacing before citations like ")[3]".
Preserve all citation numbers exactly. Do not invent papers or DOIs.
Remove any leftover "Equation (n)" blocks and raw formula lines from section prose (equations are attached separately).
Return JSON: { "abstract": string, "sections": [{ "heading": string, "content": string }] }.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              abstract: paper.abstract,
              sections: paper.sections.map((s) => ({ heading: s.heading, content: s.content })),
              references: paper.references.map((r) => r.text),
            }),
          },
        ],
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
      sections: paper.sections.map((s, i) => ({
        ...s,
        heading: parsed.sections?.[i]?.heading || s.heading,
        content: parsed.sections?.[i]?.content || s.content,
      })),
    };
  } catch {
    return paper;
  }
}

/**
 * Expert review loop: audit → autofix → optional LLM polish → re-audit.
 * Repeats until no error-level issues remain or maxPasses hit.
 */
export async function expertReviewLoop(
  paper: SurveyPaper,
  options?: { maxPasses?: number; openaiApiKey?: string }
): Promise<ReviewResult> {
  const maxPasses = options?.maxPasses ?? 3;
  let current = paper;
  let issues: ReviewIssue[] = [];
  let passes = 0;

  for (let i = 0; i < maxPasses; i++) {
    passes = i + 1;
    issues = audit(current);
    const errors = issues.filter((x) => x.severity === "error" && !x.fixed);
    const fixableWarns = issues.filter((x) => x.severity === "warn");
    if (!errors.length && fixableWarns.filter((w) => !w.fixed).length <= 1) {
      // Still run one autofix pass for typography refresh
      current = autofix(current, issues);
      issues = audit(current);
      const remainingErrors = issues.filter((x) => x.severity === "error");
      return {
        paper: sanitizePaperTextDeep(current),
        issues,
        passes,
        perfect: remainingErrors.length === 0,
      };
    }

    current = autofix(current, issues);
    if (options?.openaiApiKey && (errors.length || fixableWarns.length > 2)) {
      current = await llmPolish(current, options.openaiApiKey);
      current = sanitizePaperTextDeep(current);
    }
  }

  issues = audit(current);
  const perfect = issues.every((x) => x.severity !== "error");
  return { paper: sanitizePaperTextDeep(current), issues, passes, perfect };
}
