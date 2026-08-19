import type { JournalTemplateId, SurveyPaper } from "./types";
import { sanitizeCitationMarkers, sanitizePaperTextDeep } from "./citations";
import { renderEquationSvg } from "./equations";
import { getTemplate } from "./templates";

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
    if (!eq.display && !eq.plaintext) {
      issues.push({
        id: `eq-empty-${eq.id}`,
        severity: "error",
        message: `Equation ${eq.number} missing display form.`,
      });
    }
  }

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

function auditProfessor(paper: SurveyPaper): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const synth = paper.sections.filter((s) => s.id.startsWith("theme-") || s.level === 2);
  for (const s of synth) {
    // Flag dump-style paragraphs that cite many papers at once without explanation
    const paras = s.content.split(/\n{2,}/);
    for (const p of paras) {
      const cites = (p.match(/\[\d+\]/g) || []).length;
      if (cites >= 5 && p.length < 280) {
        issues.push({
          id: `dump-cite-${s.id}-${cites}`,
          severity: "warn",
          message: `Section “${s.heading}” cites many papers in one short paragraph; prefer smaller groups with explanation.`,
        });
      }
    }
  }

  const challenges = paper.sections.find((s) => s.id === "challenges");
  if (challenges && challenges.content.length < 400) {
    issues.push({
      id: "shallow-challenges",
      severity: "warn",
      message: "Challenges section is thin for a professor-level survey; expand per-dimension explanations.",
    });
  }

  if ((paper.metadata.targetPages ?? 0) >= 12 && paper.sections.length < 10) {
    issues.push({
      id: "short-for-target",
      severity: "warn",
      message: `Draft may be short for the requested ~${paper.metadata.targetPages}-page length.`,
    });
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
  issues.push(...auditProfessor(paper));
  return issues;
}

function autofix(paper: SurveyPaper, issues: ReviewIssue[]): SurveyPaper {
  let next = sanitizePaperTextDeep(paper);

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
          skipFollow = true;
          continue;
        }
        if (skipFollow) {
          if (/[=∫Σ∑√‖]/.test(t) || t.length < 160) continue;
          skipFollow = false;
        }
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

/**
 * Apply journal-template expectations onto the draft before professor review
 * (section naming conventions, keyword density hints stored in metadata).
 */
export function applyTemplatePass(paper: SurveyPaper, templateId?: JournalTemplateId): SurveyPaper {
  const id = templateId || paper.template;
  const tpl = getTemplate(id);
  return {
    ...paper,
    template: id,
    metadata: {
      ...paper.metadata,
      templateApplied: tpl.id,
      templateName: tpl.name,
    },
  };
}

async function llmProfessorPolish(
  paper: SurveyPaper,
  apiKey?: string,
  templateName?: string
): Promise<SurveyPaper> {
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
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a senior professor reviewing a ${templateName || "IEEE"} survey paper for journal submission.
Act as an expert examiner: strengthen argumentative structure, ensure literature is discussed in small groups or individually with clear explanation (never dump long citation lists without analysis), deepen challenge explanations, tighten abstract contribution claims, and fix broken citations / Unknown authors / duplicate equation prose.
Preserve every citation number exactly. Do not invent papers, DOIs, or results.
Remove leftover "Equation (n)" blocks and raw formula lines from section prose.
Keep the same section order and count.
Return JSON: { "abstract": string, "sections": [{ "heading": string, "content": string }], "professorNotes": string[] }.`,
          },
          {
            role: "user",
            content: JSON.stringify({
              template: templateName || paper.template,
              targetPages: paper.metadata.targetPages ?? null,
              abstract: paper.abstract,
              sections: paper.sections.map((s) => ({
                id: s.id,
                heading: s.heading,
                level: s.level,
                content: s.content,
              })),
              references: paper.references.map((r) => r.text),
              contributions: paper.contributions,
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
      professorNotes?: string[];
    };
    return {
      ...paper,
      abstract: parsed.abstract || paper.abstract,
      sections: paper.sections.map((s, i) => ({
        ...s,
        heading: parsed.sections?.[i]?.heading || s.heading,
        content: parsed.sections?.[i]?.content || s.content,
      })),
      metadata: {
        ...paper.metadata,
        professorNotes: parsed.professorNotes?.slice(0, 8),
      },
    };
  } catch {
    return paper;
  }
}

/**
 * Expert professor review loop — runs AFTER template application:
 * audit → autofix → professor LLM polish → re-audit until clean or maxPasses.
 */
export async function expertReviewLoop(
  paper: SurveyPaper,
  options?: { maxPasses?: number; openaiApiKey?: string; templateId?: JournalTemplateId }
): Promise<ReviewResult> {
  const maxPasses = options?.maxPasses ?? 3;
  const tpl = getTemplate(options?.templateId || paper.template);
  let current = applyTemplatePass(paper, tpl.id);
  let issues: ReviewIssue[] = [];
  let passes = 0;

  for (let i = 0; i < maxPasses; i++) {
    passes = i + 1;
    issues = audit(current);
    const errors = issues.filter((x) => x.severity === "error" && !x.fixed);
    const fixableWarns = issues.filter((x) => x.severity === "warn");
    if (!errors.length && fixableWarns.filter((w) => !w.fixed).length <= 2) {
      current = autofix(current, issues);
      // Always attempt one professor polish pass when a key is available
      if (options?.openaiApiKey && i === 0) {
        current = await llmProfessorPolish(current, options.openaiApiKey, tpl.name);
        current = sanitizePaperTextDeep(current);
        current = autofix(current, audit(current));
      }
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
    if (options?.openaiApiKey) {
      current = await llmProfessorPolish(current, options.openaiApiKey, tpl.name);
      current = sanitizePaperTextDeep(current);
    }
  }

  issues = audit(current);
  const perfect = issues.every((x) => x.severity !== "error");
  return { paper: sanitizePaperTextDeep(current), issues, passes, perfect };
}
