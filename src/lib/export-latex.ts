import JSZip from "jszip";
import type { SurveyFigure, SurveyPaper, SurveyTable } from "./types";
import { svgToPngDataUrl } from "./export-raster-node";

function escapeLatex(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function attachmentForSection(sectionId: string): {
  figureKinds: SurveyFigure["kind"][];
  tableKinds: SurveyTable["kind"][];
} {
  switch (sectionId) {
    case "background":
    case "related-surveys":
      return { figureKinds: ["problem"], tableKinds: ["related-surveys"] };
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

function figFileName(fig: SurveyFigure, num: number): string {
  const safe = fig.id.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || `fig-${num}`;
  return `figures/${safe}.png`;
}

/** Full-width table* that breaks IEEE two-column rules */
function latexTableStar(table: SurveyTable, num: number): string {
  const cols = Math.max(table.headers.length, 1);
  const colSpec = Array.from({ length: cols }, () => "X").join("");
  const header = table.headers.map((h) => `\\textbf{${escapeLatex(h)}}`).join(" & ");
  const rows = table.rows
    .map((r) => {
      const cells = [...r];
      while (cells.length < cols) cells.push("");
      return cells
        .slice(0, cols)
        .map((c) => escapeLatex(String(c ?? "")))
        .join(" & ");
    })
    .join(" \\\\\n");

  return `
\\begin{table*}[!t]
\\centering
\\caption{${escapeLatex(table.caption || table.title)}}
\\label{tab:${table.id}}
\\renewcommand{\\arraystretch}{1.15}
\\begin{tabularx}{\\textwidth}{${colSpec}}
\\toprule
${header} \\\\
\\midrule
${rows} \\\\
\\bottomrule
\\end{tabularx}
\\end{table*}
`;
}

function latexFigureStar(fig: SurveyFigure, num: number, file: string): string {
  return `
\\begin{figure*}[!t]
\\centering
\\includegraphics[width=\\textwidth]{${file}}
\\caption{${escapeLatex(fig.caption || fig.title)}}
\\label{fig:${fig.id}}
\\end{figure*}
`;
}

export async function paperToLatexZip(paper: SurveyPaper): Promise<Buffer> {
  const zip = new JSZip();
  const figures = paper.figures ?? [];
  const tables = paper.tables ?? [];
  const isIeee = paper.template === "ieee";

  const figFiles = new Map<string, string>(); // figId -> path
  let figNum = 0;
  for (const fig of figures) {
    if (!fig.svg?.trim()) continue;
    figNum += 1;
    const path = figFileName(fig, figNum);
    try {
      const { dataUrl } = await svgToPngDataUrl(fig.svg, 2.5);
      const b64 = dataUrl.split(",")[1] || "";
      zip.file(path, Buffer.from(b64, "base64"));
      figFiles.set(fig.id, path);
    } catch (err) {
      console.error("LaTeX figure raster failed:", fig.id, err);
    }
  }

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
\\usepackage{tabularx}
\\usepackage{cite}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\graphicspath{{./figures/}}
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
\\usepackage{tabularx}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage[margin=1in]{geometry}
\\graphicspath{{./figures/}}
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
  let eqAttached = false;

  for (const section of paper.sections) {
    const cmd = section.level === 1 ? "section" : "subsection";
    bodyParts.push(`\\${cmd}{${escapeLatex(section.heading)}}\n${escapeLatex(section.content)}\n`);

    // Attach equations once near background / first technical section
    if (!eqAttached && paper.equations?.length && /background|method|taxonomy/i.test(section.id)) {
      eqAttached = true;
      bodyParts.push("\\begin{align}\n");
      for (const eq of paper.equations) {
        const tex = (eq.latex || eq.plaintext || eq.display || "").replace(/\n/g, " ");
        bodyParts.push(`${tex} \\tag{${eq.number}} \\label{eq:${eq.id}} \\\\\n`);
      }
      bodyParts.push("\\end{align}\n");
    }

    const attach = attachmentForSection(section.id);
    for (const fig of figures) {
      if (usedFigs.has(fig.id) || !attach.figureKinds.includes(fig.kind)) continue;
      usedFigs.add(fig.id);
      const file = figFiles.get(fig.id);
      if (file) {
        bodyParts.push(latexFigureStar(fig, usedFigs.size, file));
      } else {
        bodyParts.push(
          `\\begin{figure*}[!t]\\centering\\fbox{\\parbox{0.9\\textwidth}{\\textit{Figure unavailable: ${escapeLatex(fig.title)}}}}\\caption{${escapeLatex(fig.caption)}}\\label{fig:${fig.id}}\\end{figure*}\n`
        );
      }
    }
    for (const table of tables) {
      if (usedTables.has(table.id) || !attach.tableKinds.includes(table.kind)) continue;
      usedTables.add(table.id);
      bodyParts.push(latexTableStar(table, usedTables.size));
    }
  }

  for (const fig of figures.filter((f) => !usedFigs.has(f.id))) {
    usedFigs.add(fig.id);
    const file = figFiles.get(fig.id);
    if (file) bodyParts.push(latexFigureStar(fig, usedFigs.size, file));
  }
  for (const table of tables.filter((t) => !usedTables.has(t.id))) {
    usedTables.add(table.id);
    bodyParts.push(latexTableStar(table, usedTables.size));
  }

  const refs = paper.references
    .map((r) => `\\bibitem{${r.key}} ${escapeLatex(r.text.replace(/^\[\d+\]\s*/, ""))}`)
    .join("\n");

  const tex = `${preamble}

${bodyParts.join("\n")}

\\begin{thebibliography}{99}
${refs}
\\end{thebibliography}
\\end{document}
`;

  zip.file("main.tex", tex);
  zip.file(
    "README.txt",
    [
      "SurveyForge LaTeX package",
      "",
      "1. Unzip this archive.",
      "2. Compile with: pdflatex main.tex  (run twice for references).",
      "3. Figures are in ./figures/*.png and are already referenced via \\includegraphics.",
      "4. Tables use table* (full page width) to break IEEE two-column layout.",
      "5. Figures use figure* (full page width) for the same reason.",
      "",
      `Title: ${paper.title}`,
      `Figures exported: ${figFiles.size}`,
      `Tables exported: ${tables.length}`,
    ].join("\n")
  );

  return Buffer.from(await zip.generateAsync({ type: "nodebuffer" }));
}
