import type { SurveyPaper } from "./types";
import { sanitizeCitationMarkers, sanitizePaperTextDeep } from "./citations";
import { paperToPdfBlob } from "./export-pdf";
import { paperToDocxBlob } from "./export-docx";
import { renderEquationSvg } from "./equations";

export type DocQcIssue = {
  id: string;
  severity: "error" | "warn";
  source: "paper" | "pdf" | "docx";
  message: string;
  fixed?: boolean;
};

export type DocQcResult = {
  paper: SurveyPaper;
  issues: DocQcIssue[];
  passes: number;
  perfect: boolean;
  pdfBytes: number;
  docxBytes: number;
};

function stripHtml(s: string): string {
  return s
    .replace(/<\/?(i|b|em|strong|scp|sub|sup|span|a)[^>]*>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "");
}

function cleanProse(s: string): string {
  return sanitizeCitationMarkers(
    stripHtml(s)
      .replace(/\u200b/g, "")
      .replace(/n\.d\.\.+/gi, "n.d.")
      .replace(/\)\)+/g, ")")
      .replace(/\(\(+/g, "(")
      .replace(/(\w)-\s+(\w)/g, "$1-$2")
      .replace(/\b10\.\s+(\d)/g, "10.$1")
      .replace(/\/\s+(?=[A-Za-z0-9])/g, "/")
      .replace(/\s+([,.；;])/g, "$1")
      .replace(/\s{2,}/g, " ")
      .replace(/\s+\./g, ".")
      .replace(/\.{2,}/g, ".")
  );
}

function auditPaper(paper: SurveyPaper): DocQcIssue[] {
  const issues: DocQcIssue[] = [];
  const allText = [
    paper.abstract,
    ...paper.sections.map((s) => s.content),
    ...paper.references.map((r) => r.text),
  ].join("\n");

  if (/<\/?[a-z][\s\S]*?>/i.test(allText)) {
    issues.push({
      id: "html-tags",
      severity: "error",
      source: "paper",
      message: "HTML tags remain in prose or references (e.g. <i>, <b>, <scp>).",
    });
  }
  if (/n\.d\.\./i.test(allText)) {
    issues.push({
      id: "nd-double",
      severity: "error",
      source: "paper",
      message: "Broken year marker “n.d..” found in text/references.",
    });
  }
  if (/\)\)/.test(allText)) {
    issues.push({
      id: "double-paren",
      severity: "warn",
      source: "paper",
      message: "Double closing parentheses “))” found in synthesis text.",
    });
  }
  if (/\w-\s+\w/.test(allText)) {
    issues.push({
      id: "broken-hyphen",
      severity: "warn",
      source: "paper",
      message: "Hyphenated terms have stray spaces (e.g. “Digital- twin”).",
    });
  }

  for (const eq of paper.equations ?? []) {
    const shown = eq.display || eq.plaintext || "";
    if (/_[a-zA-Z0-9]/.test(eq.plaintext || "") && !/[ᵢⱼₖₛ₍₎⁰-⁹]/.test(eq.display || "")) {
      issues.push({
        id: `eq-underscore-${eq.id}`,
        severity: "error",
        source: "paper",
        message: `Equation ${eq.number} lacks Unicode display form (underscore ASCII will look unprofessional in PDF).`,
      });
    }
    if (!shown.trim()) {
      issues.push({
        id: `eq-empty-${eq.id}`,
        severity: "error",
        source: "paper",
        message: `Equation ${eq.number} is empty.`,
      });
    }
  }

  if (!paper.references.length) {
    issues.push({
      id: "no-refs",
      severity: "error",
      source: "paper",
      message: "Reference list is empty.",
    });
  }

  return issues;
}

function auditExportBuffers(pdf: Buffer, docx: Buffer): DocQcIssue[] {
  const issues: DocQcIssue[] = [];
  if (pdf.length < 5000) {
    issues.push({
      id: "pdf-tiny",
      severity: "error",
      source: "pdf",
      message: "PDF export is suspiciously small — generation may have failed.",
    });
  }
  if (docx.length < 2000) {
    issues.push({
      id: "docx-tiny",
      severity: "error",
      source: "docx",
      message: "Word export is suspiciously small — generation may have failed.",
    });
  }

  // Lightweight PDF scans — avoid false positives from compressed binary noise
  const pdfLatin = pdf.toString("latin1");
  if (/Using <i>SHELX|<b>lme4<\/b>|<scp>UCSF|&amp;/i.test(pdfLatin)) {
    issues.push({
      id: "pdf-html",
      severity: "error",
      source: "pdf",
      message: "PDF still contains raw HTML tags or entities from paper titles/references.",
    });
  }
  if (/\bd_ij\b|\bv_i\(k\+1\)|\bJ_cov =|\bintegral_A\b|\bpbest_i\b/.test(pdfLatin)) {
    issues.push({
      id: "pdf-eq-ascii",
      severity: "error",
      source: "pdf",
      message: "PDF still contains underscore-style ASCII equations instead of journal math text.",
    });
  }
  if (/\b10\.\s+\d{4,}/.test(pdfLatin)) {
    issues.push({
      id: "pdf-doi-spaces",
      severity: "error",
      source: "pdf",
      message: "PDF DOIs contain broken spacing (e.g. “10. 32620/…”).",
    });
  }

  const docxUtf = docx.toString("utf8");
  if (/&amp;|&lt;i&gt;|<i>|<b>|<scp>/i.test(docxUtf)) {
    issues.push({
      id: "docx-html",
      severity: "error",
      source: "docx",
      message: "Word export still contains raw HTML tags or entities.",
    });
  }
  if (/\bd_ij\b|\bv_i\(k\+1\)|\bJ_cov =/.test(docxUtf)) {
    issues.push({
      id: "docx-eq-ascii",
      severity: "error",
      source: "docx",
      message: "Word export still contains underscore-style ASCII equations.",
    });
  }

  return issues;
}

function autofixPaper(paper: SurveyPaper, issues: DocQcIssue[]): SurveyPaper {
  let next = sanitizePaperTextDeep(paper);

  next = {
    ...next,
    abstract: cleanProse(next.abstract || ""),
    sections: next.sections.map((s) => ({
      ...s,
      heading: stripHtml(s.heading),
      content: cleanProse(s.content),
    })),
    references: next.references.map((r) => ({
      ...r,
      text: cleanProse(r.text)
        .replace(/\bn\.d\.\.+/gi, "n.d.")
        .replace(/\.\s*doi:/gi, ". doi:")
        .replace(/\s{2,}/g, " ")
        .trim(),
    })),
    tables: (next.tables ?? []).map((t) => ({
      ...t,
      title: stripHtml(t.title),
      caption: stripHtml(t.caption),
      headers: t.headers.map(stripHtml),
      rows: t.rows.map((row) => row.map(stripHtml)),
    })),
    figures: (next.figures ?? []).map((f) => ({
      ...f,
      title: stripHtml(f.title),
      caption: stripHtml(f.caption),
      svg: f.svg
        ? f.svg
            .replace(/&lt;\/?i&gt;/gi, "")
            .replace(/&lt;\/?b&gt;/gi, "")
            .replace(/&lt;\/?scp&gt;/gi, "")
            .replace(/<\/?i>/gi, "")
            .replace(/<\/?b>/gi, "")
            .replace(/<\/?scp>/gi, "")
        : f.svg,
    })),
    equations: (next.equations ?? []).map((eq) => {
      const rebuilt = {
        ...eq,
        display: eq.display || eq.plaintext,
        svg: "",
      };
      rebuilt.svg = renderEquationSvg(rebuilt);
      return rebuilt;
    }),
  };

  for (const issue of issues) {
    if (
      issue.id === "html-tags" ||
      issue.id === "nd-double" ||
      issue.id === "double-paren" ||
      issue.id === "broken-hyphen" ||
      issue.id.startsWith("eq-underscore") ||
      issue.id === "pdf-html" ||
      issue.id === "pdf-eq-ascii" ||
      issue.id === "pdf-doi-spaces" ||
      issue.id === "docx-html" ||
      issue.id === "docx-eq-ascii"
    ) {
      issue.fixed = true;
    }
  }

  return next;
}

/**
 * Final gate before Ready: build PDF + Word, audit defects, autofix, re-export.
 * Runs after template application and professor review.
 */
export async function documentQcLoop(
  paper: SurveyPaper,
  options?: { maxPasses?: number }
): Promise<DocQcResult> {
  const maxPasses = options?.maxPasses ?? 2;
  let current = paper;
  let issues: DocQcIssue[] = [];
  let passes = 0;
  let pdfBuf = Buffer.alloc(0);
  let docxBuf = Buffer.alloc(0);

  for (let i = 0; i < maxPasses; i++) {
    passes = i + 1;
    issues = auditPaper(current);
    current = autofixPaper(current, issues);

    pdfBuf = Buffer.from(await (await paperToPdfBlob(current)).arrayBuffer());
    docxBuf = Buffer.from(await (await paperToDocxBlob(current)).arrayBuffer());
    const exportIssues = auditExportBuffers(pdfBuf, docxBuf);
    issues = [...auditPaper(current), ...exportIssues];

    const errors = issues.filter((x) => x.severity === "error" && !x.fixed);
    if (!errors.length) {
      return {
        paper: sanitizePaperTextDeep(current),
        issues,
        passes,
        perfect: true,
        pdfBytes: pdfBuf.length,
        docxBytes: docxBuf.length,
      };
    }

    current = autofixPaper(current, issues);
  }

  pdfBuf = Buffer.from(await (await paperToPdfBlob(current)).arrayBuffer());
  docxBuf = Buffer.from(await (await paperToDocxBlob(current)).arrayBuffer());
  issues = [...auditPaper(current), ...auditExportBuffers(pdfBuf, docxBuf)];

  return {
    paper: sanitizePaperTextDeep(current),
    issues,
    passes,
    perfect: issues.every((x) => x.severity !== "error"),
    pdfBytes: pdfBuf.length,
    docxBytes: docxBuf.length,
  };
}
