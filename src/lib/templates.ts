import type { JournalTemplateId, SurveyFigure, SurveyPaper, SurveyTable } from "./types";

export type TemplateMeta = {
  id: JournalTemplateId;
  name: string;
  venueHint: string;
  description: string;
  citationStyle: "numbered" | "author-year";
  columns: 1 | 2;
  className: string;
};

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "ieee",
    name: "IEEE Transactions",
    venueHint: "IEEE Trans. / IEEE Access style",
    description: "Two-column numbered citations, compact abstract, keywords line.",
    citationStyle: "numbered",
    columns: 2,
    className: "tpl-ieee",
  },
  {
    id: "acm",
    name: "ACM",
    venueHint: "ACM Computing Surveys style",
    description: "CCS-like keywords, numbered refs, survey-friendly headings.",
    citationStyle: "numbered",
    columns: 1,
    className: "tpl-acm",
  },
  {
    id: "springer",
    name: "Springer",
    venueHint: "Springer journal article style",
    description: "Single column with numbered headings and reference list.",
    citationStyle: "numbered",
    columns: 1,
    className: "tpl-springer",
  },
  {
    id: "elsevier",
    name: "Elsevier",
    venueHint: "Elsevier / ScienceDirect style",
    description: "Structured abstract feel, author-year friendly numbering retained for draft.",
    citationStyle: "numbered",
    columns: 1,
    className: "tpl-elsevier",
  },
  {
    id: "nature",
    name: "Nature-style",
    venueHint: "Nature portfolio concise style",
    description: "Shorter abstract emphasis and cleaner section rhythm.",
    citationStyle: "numbered",
    columns: 1,
    className: "tpl-nature",
  },
];

export function getTemplate(id: JournalTemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

function sectionNumber(index: number, template: JournalTemplateId): string {
  if (template === "ieee") {
    const romans = [
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
      "XII",
    ];
    return romans[index] ?? String(index + 1);
  }
  return String(index + 1);
}

function tableToMarkdown(table: SurveyTable): string {
  const lines = [
    `### ${table.title}`,
    "",
    table.caption,
    "",
    `| ${table.headers.join(" | ")} |`,
    `| ${table.headers.map(() => "---").join(" | ")} |`,
    ...table.rows.map((row) => `| ${row.map((c) => c.replace(/\|/g, "/")).join(" | ")} |`),
    "",
  ];
  return lines.join("\n");
}

function tableToHtml(table: SurveyTable, index: number): string {
  const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = table.rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`
    )
    .join("");
  return `<figure class="paper-table" id="${table.id}">
  <figcaption><strong>Table ${index}.</strong> ${escapeHtml(table.caption)}</figcaption>
  <div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
</figure>`;
}

function figureToHtml(fig: SurveyFigure, index: number): string {
  const body = fig.html || fig.svg;
  return `<figure class="paper-figure" id="${fig.id}" data-kind="${fig.kind}">
  ${body}
  <figcaption><strong>Fig. ${index}.</strong> ${escapeHtml(fig.caption)}</figcaption>
</figure>`;
}

/** Place visuals after the section they support (high-impact survey practice). */
function attachmentForSection(sectionId: string): {
  figureKinds: SurveyFigure["kind"][];
  tableKinds: SurveyTable["kind"][];
} {
  switch (sectionId) {
    case "background":
      return { figureKinds: ["problem"], tableKinds: [] };
    case "related-surveys":
      return { figureKinds: [], tableKinds: ["related-surveys"] };
    case "taxonomy":
      return { figureKinds: ["taxonomy"], tableKinds: ["taxonomy"] };
    case "comparison":
      return { figureKinds: ["comparison"], tableKinds: ["comparison"] };
    case "challenges":
      return { figureKinds: ["challenges"], tableKinds: ["challenges"] };
    case "trends-gaps":
      return { figureKinds: ["venn", "timeline", "gaps"], tableKinds: [] };
    case "method":
      return { figureKinds: ["methods"], tableKinds: [] };
    default:
      return { figureKinds: [], tableKinds: [] };
  }
}

export function paperToMarkdown(paper: SurveyPaper): string {
  const tpl = getTemplate(paper.template);
  const figures = paper.figures ?? [];
  const tables = paper.tables ?? [];
  const contributions = paper.contributions ?? [];
  const usedFigs = new Set<string>();
  const usedTables = new Set<string>();

  const lines: string[] = [];
  lines.push(`# ${paper.title}`);
  lines.push("");
  lines.push(`**Authors:** ${paper.authorsPlaceholder}`);
  lines.push(`**Template:** ${tpl.name}`);
  if (paper.metadata.rubric) {
    lines.push(`**Survey rubric:** ${paper.metadata.rubric}`);
  }
  lines.push("");
  lines.push("## Abstract");
  lines.push(paper.abstract);
  lines.push("");
  lines.push(`**Keywords:** ${paper.keywords.join("; ")}`);
  lines.push("");

  if (contributions.length) {
    lines.push("## Contributions");
    lines.push("");
    contributions.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    lines.push("");
  }

  let major = 0;
  let figNum = 0;
  let tblNum = 0;

  for (const section of paper.sections) {
    if (section.level === 1) {
      const num = sectionNumber(major, paper.template);
      major++;
      lines.push(`## ${num}. ${section.heading.toUpperCase()}`);
    } else {
      lines.push(`### ${section.heading}`);
    }
    lines.push("");
    const eqs = (paper.equations ?? []).filter((e) => e.sectionId === section.id);
    const eqDump = new Set(
      eqs.flatMap((e) => [e.display, e.plaintext, e.description].map((s) => s.trim().toLowerCase()))
    );
    const prose = section.content
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter((t) => t && !/^Equation\s*\(\d+\)/i.test(t) && !eqDump.has(t.toLowerCase()))
      .join("\n\n");
    if (prose) {
      lines.push(prose);
      lines.push("");
    }
    for (const eq of eqs) {
      lines.push(`**Equation (${eq.number}) — ${eq.label}.**`);
      lines.push("");
      lines.push(`$${eq.latex}$`);
      lines.push("");
      lines.push(`*${eq.description}*`);
      lines.push("");
    }

    const attach = attachmentForSection(section.id);
    for (const fig of figures) {
      if (usedFigs.has(fig.id)) continue;
      if (!attach.figureKinds.includes(fig.kind)) continue;
      usedFigs.add(fig.id);
      figNum++;
      lines.push(`### Figure ${figNum}: ${fig.title}`);
      lines.push("");
      lines.push(fig.caption);
      lines.push("");
      lines.push("```svg");
      lines.push(fig.svg);
      lines.push("```");
      lines.push("");
    }
    for (const table of tables) {
      if (usedTables.has(table.id)) continue;
      if (!attach.tableKinds.includes(table.kind)) continue;
      usedTables.add(table.id);
      tblNum++;
      lines.push(tableToMarkdown({ ...table, title: `Table ${tblNum}: ${table.title}` }));
    }
  }

  const leftoverFigs = figures.filter((f) => !usedFigs.has(f.id));
  const leftoverTables = tables.filter((t) => !usedTables.has(t.id));
  if (leftoverFigs.length || leftoverTables.length) {
    lines.push("## Visual Synthesis (Additional)");
    lines.push("");
    for (const fig of leftoverFigs) {
      figNum++;
      lines.push(`### Figure ${figNum}: ${fig.title}`);
      lines.push("");
      lines.push(fig.caption);
      lines.push("");
      lines.push("```svg");
      lines.push(fig.svg);
      lines.push("```");
      lines.push("");
    }
    for (const table of leftoverTables) {
      tblNum++;
      lines.push(tableToMarkdown({ ...table, title: `Table ${tblNum}: ${table.title}` }));
    }
  }

  lines.push("## References");
  lines.push("");
  for (const ref of paper.references) {
    lines.push(ref.text);
  }
  lines.push("");
  return lines.join("\n");
}

export function paperToLatex(paper: SurveyPaper): string {
  const isIeee = paper.template === "ieee";
  const figures = paper.figures ?? [];
  const tables = paper.tables ?? [];
  const contributions = paper.contributions ?? [];

  const contribBlock = contributions.length
    ? `\n\\noindent\\textbf{Contributions.}\n\\begin{enumerate}\n${contributions
        .map((c) => `\\item ${escapeLatex(c)}`)
        .join("\n")}\n\\end{enumerate}\n`
    : "";

  const preamble = isIeee
    ? `\\documentclass[conference]{IEEEtran}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{cite}
\\begin{document}
\\title{${escapeLatex(paper.title)}}
\\author{${escapeLatex(paper.authorsPlaceholder)}}
\\maketitle
\\begin{abstract}
${escapeLatex(paper.abstract)}
\\end{abstract}
\\begin{IEEEkeywords}
${escapeLatex(paper.keywords.join(", "))}
\\end{IEEEkeywords}
${contribBlock}`
    : `\\documentclass[11pt]{article}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage[margin=1in]{geometry}
\\begin{document}
\\title{${escapeLatex(paper.title)}}
\\author{${escapeLatex(paper.authorsPlaceholder)}}
\\maketitle
\\begin{abstract}
${escapeLatex(paper.abstract)}
\\end{abstract}
\\noindent\\textbf{Keywords:} ${escapeLatex(paper.keywords.join("; "))}
${contribBlock}`;

  const usedFigs = new Set<string>();
  const usedTables = new Set<string>();

  const bodyParts: string[] = [];
  for (const section of paper.sections) {
    const cmd = section.level === 1 ? "section" : "subsection";
    bodyParts.push(`\\${cmd}{${escapeLatex(section.heading)}}\n${escapeLatex(section.content)}\n`);

    const attach = attachmentForSection(section.id);
    for (const fig of figures) {
      if (usedFigs.has(fig.id) || !attach.figureKinds.includes(fig.kind)) continue;
      usedFigs.add(fig.id);
      bodyParts.push(
        `\\begin{figure}[ht]\\centering\\fbox{\\parbox{0.9\\linewidth}{\\textit{[SVG figure: ${escapeLatex(fig.title)}]}}}\\caption{${escapeLatex(fig.caption)}}\\label{fig:${fig.id}}\\end{figure}\n`
      );
    }
    for (const table of tables) {
      if (usedTables.has(table.id) || !attach.tableKinds.includes(table.kind)) continue;
      usedTables.add(table.id);
      const header = table.headers.map(escapeLatex).join(" & ");
      const rows = table.rows
        .map((r) => r.map(escapeLatex).join(" & ") + " \\\\")
        .join("\n");
      bodyParts.push(
        `\\begin{table}[ht]\\centering\\caption{${escapeLatex(table.caption)}}\\label{tab:${table.id}}\\begin{tabular}{${"l".repeat(table.headers.length)}}\\toprule\n${header} \\\\\n\\midrule\n${rows}\n\\bottomrule\\end{tabular}\\end{table}\n`
      );
    }
  }

  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    bodyParts.push(
      `\\begin{figure}[ht]\\centering\\fbox{\\parbox{0.9\\linewidth}{\\textit{[SVG figure: ${escapeLatex(fig.title)}]}}}\\caption{${escapeLatex(fig.caption)}}\\label{fig:${fig.id}}\\end{figure}\n`
    );
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    const header = table.headers.map(escapeLatex).join(" & ");
    const rows = table.rows.map((r) => r.map(escapeLatex).join(" & ") + " \\\\").join("\n");
    bodyParts.push(
      `\\begin{table}[ht]\\centering\\caption{${escapeLatex(table.caption)}}\\label{tab:${table.id}}\\begin{tabular}{${"l".repeat(table.headers.length)}}\\toprule\n${header} \\\\\n\\midrule\n${rows}\n\\bottomrule\\end{tabular}\\end{table}\n`
    );
  }

  const refs = paper.references
    .map((r) => `\\bibitem{${r.key}} ${escapeLatex(r.text.replace(/^\[\d+\]\s*/, ""))}`)
    .join("\n");

  return `${preamble}

${bodyParts.join("\n")}

\\begin{thebibliography}{99}
${refs}
\\end{thebibliography}
\\end{document}
`;
}

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

export function paperToHtml(paper: SurveyPaper): string {
  const tpl = getTemplate(paper.template);
  const figures = paper.figures ?? [];
  const tables = paper.tables ?? [];
  const contributions = paper.contributions ?? [];
  const usedFigs = new Set<string>();
  const usedTables = new Set<string>();
  let major = 0;
  let figNum = 0;
  let tblNum = 0;

  const sectionsHtml = paper.sections
    .map((section) => {
      let headingHtml: string;
      if (section.level === 1) {
        const num = sectionNumber(major, paper.template);
        major++;
        headingHtml = `<h2>${num}. ${escapeHtml(section.heading)}</h2>`;
      } else {
        headingHtml = `<h3>${escapeHtml(section.heading)}</h3>`;
      }

      const equations = paper.equations ?? [];
      const eqDescs = new Set(equations.map((e) => e.description.trim().toLowerCase()));
      const eqForms = new Set(
        equations.flatMap((e) => [e.display, e.plaintext].map((s) => s.trim().toLowerCase()))
      );

      const paras = section.content
        .split(/\n{2,}/)
        .map((block) => {
          const t = block.trim();
          if (!t) return "";
          // Skip injected/legacy equation dumps — rendered from structured data below
          if (/^Equation\s*\(\d+\)/i.test(t)) return "";
          const lower = t.toLowerCase();
          if (eqDescs.has(lower) || eqForms.has(lower)) return "";
          if (/[=∫Σ∑√‖]/.test(t) && t.length < 180) return "";
          return `<p>${escapeHtml(t)}</p>`;
        })
        .join("");

      const eqHtml = equations
        .filter((e) => e.sectionId === section.id)
        .map((eq) => {
          const formula = escapeHtml(eq.display || eq.plaintext);
          const body = eq.svg
            ? `<div class="eq-svg">${eq.svg}</div>`
            : `<div class="eq-formula">${formula}</div>`;
          return `<div class="equation">
  <div class="eq-head">(${eq.number}) ${escapeHtml(eq.label)}</div>
  ${body}
  <div class="eq-desc">${escapeHtml(eq.description)}</div>
</div>`;
        })
        .join("\n");

      const attach = attachmentForSection(section.id);
      const attached: string[] = [];
      for (const fig of figures) {
        if (usedFigs.has(fig.id) || !attach.figureKinds.includes(fig.kind)) continue;
        usedFigs.add(fig.id);
        figNum++;
        attached.push(figureToHtml(fig, figNum));
      }
      for (const table of tables) {
        if (usedTables.has(table.id) || !attach.tableKinds.includes(table.kind)) continue;
        usedTables.add(table.id);
        tblNum++;
        attached.push(tableToHtml(table, tblNum));
      }

      return `<section class="${section.level === 1 ? "section" : "subsection"}">${headingHtml}${paras}${eqHtml}${attached.join("\n")}</section>`;
    })
    .join("\n");

  const leftover: string[] = [];
  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    figNum++;
    leftover.push(figureToHtml(fig, figNum));
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    tblNum++;
    leftover.push(tableToHtml(table, tblNum));
  }

  const contribHtml = contributions.length
    ? `<div class="contributions"><strong>Contributions</strong><ol>${contributions
        .map((c) => `<li>${escapeHtml(c)}</li>`)
        .join("")}</ol></div>`
    : "";

  const refsHtml = paper.references
    .map((r) => `<li id="${r.id}">${escapeHtml(r.text.replace(/^\[\d+\]\s*/, ""))}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(paper.title)}</title>
<style>
  :root { --ink:#0c1f2e; --sea:#1a6b7a; --muted:#5a6b75; --line:#d5dee3; --foam:#f3f7f8; }
  body { font-family: "Times New Roman", Times, serif; color: var(--ink); margin: 0; background: #fff; }
  .page { max-width: ${tpl.columns === 2 ? "920px" : "780px"}; margin: 0 auto; padding: 48px 32px 80px; }
  .tpl-ieee .columns { column-count: 2; column-gap: 28px; }
  .tpl-ieee .front { column-span: all; }
  h1 { font-size: 22px; text-align: center; line-height: 1.25; margin-bottom: 8px; }
  .authors { text-align: center; font-size: 13px; margin-bottom: 20px; color: var(--muted); }
  .abstract { font-size: 12.5px; margin-bottom: 12px; }
  .abstract strong { display: block; text-align: center; margin-bottom: 6px; }
  .keywords { font-size: 12px; margin-bottom: 14px; }
  .contributions { font-size: 12.5px; margin-bottom: 18px; padding: 0; }
  .contributions ol { margin: 6px 0 0; padding-left: 18px; }
  .contributions li { margin-bottom: 4px; }
  h2 { font-family: "Times New Roman", Times, serif; font-size: 13px; font-weight: 700; text-transform: ${paper.template === "ieee" ? "uppercase" : "none"}; margin: 18px 0 8px; color: #111; background: transparent; }
  h3 { font-family: "Times New Roman", Times, serif; font-size: 12.5px; margin: 14px 0 6px; font-style: italic; font-weight: 700; color: #111; background: transparent; }
  p { font-size: 12.5px; line-height: 1.45; text-align: justify; margin: 0 0 8px; }
  .paper-figure, .paper-table { margin: 16px 0; break-inside: avoid; }
  .paper-figure svg { max-width: 100%; height: auto; display: block; margin: 0 auto; min-height: 220px; }
  .paper-figure text { font-weight: 700 !important; }
  figcaption { font-size: 11.5px; margin: 6px 0 8px; text-align: center; font-weight: 600; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th, td { border: 1px solid var(--line); padding: 6px 7px; text-align: left; vertical-align: top; }
  th { background: var(--ink); color: #fff; font-weight: 800; }
  td { font-weight: 500; }
  ol.refs { padding-left: 18px; font-size: 11.5px; }
  ol.refs li { margin-bottom: 6px; }
  /* Equations share the same Times typography as headings — no tinted panel */
  .equation { margin: 14px 0; padding: 0; background: transparent; border: none; break-inside: avoid; }
  .eq-head { font-family: "Times New Roman", Times, serif; font-size: 12.5px; font-weight: 700; font-style: italic; margin: 0 0 6px; color: #111; text-align: center; background: transparent; border: none; padding: 0; }
  .eq-formula { font-family: "Times New Roman", Times, serif; font-style: italic; font-size: 14px; text-align: center; margin: 8px 0; color: #111; }
  .eq-svg { display: flex; justify-content: center; margin: 6px 0; }
  .eq-svg svg { max-width: 100%; height: auto; }
  .eq-desc { font-family: "Times New Roman", Times, serif; font-size: 11px; font-style: italic; color: #333; text-align: center; margin-top: 4px; }
  .tpl-nature h1 { font-family: Georgia, serif; font-size: 26px; }
  .tpl-acm h1 { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 24px; letter-spacing: -0.02em; }
  .tpl-elsevier .abstract { border-left: 3px solid var(--sea); padding-left: 12px; }
  .tpl-springer h2 { color: var(--sea); text-transform: none; font-size: 15px; }
</style>
</head>
<body>
  <article class="page ${tpl.className}">
    <header class="front">
      <h1>${escapeHtml(paper.title)}</h1>
      <div class="authors">${escapeHtml(paper.authorsPlaceholder)} · ${escapeHtml(tpl.venueHint)}</div>
      <div class="abstract"><strong>Abstract—</strong>${escapeHtml(paper.abstract)}</div>
      <div class="keywords"><strong>Index Terms—</strong>${escapeHtml(paper.keywords.join(", "))}.</div>
      ${contribHtml}
    </header>
    <div class="${tpl.columns === 2 ? "columns" : "single"}">
      ${sectionsHtml}
      ${leftover.join("\n")}
      <section>
        <h2>References</h2>
        <ol class="refs">${refsHtml}</ol>
      </section>
    </div>
  </article>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
