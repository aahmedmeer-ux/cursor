import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { SurveyPaper } from "./types";
import { svgToPngDataUrl } from "./export-media";

function wrapParagraph(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineH = 5): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

export async function paperToPdfBlob(paper: SurveyPaper): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const pageW = 210;
  const maxW = pageW - margin * 2;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const titleLines = doc.splitTextToSize(paper.title, maxW) as string[];
  for (const line of titleLines) {
    doc.text(line, pageW / 2, y, { align: "center" });
    y += 7;
  }

  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(paper.authorsPlaceholder, pageW / 2, y, { align: "center" });
  y += 8;
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Abstract", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = wrapParagraph(doc, paper.abstract, margin, y, maxW, 5);
  y += 3;

  doc.setFont("helvetica", "bold");
  doc.text("Keywords", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  y = wrapParagraph(doc, paper.keywords.join("; "), margin, y, maxW, 5);
  y += 4;

  if (paper.contributions?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Contributions", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    for (let i = 0; i < paper.contributions.length; i++) {
      y = wrapParagraph(doc, `${i + 1}. ${paper.contributions[i]}`, margin, y, maxW, 5);
      y += 1;
    }
    y += 3;
  }

  let major = 0;
  for (const section of paper.sections) {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    if (section.level === 1) {
      major++;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      y = wrapParagraph(doc, `${major}. ${section.heading}`, margin, y, maxW, 6);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      y = wrapParagraph(doc, section.heading, margin, y, maxW, 5.5);
    }
    y += 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = wrapParagraph(doc, section.content, margin, y, maxW, 5);
    y += 4;
  }

  // Tables
  for (const table of paper.tables ?? []) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    y = wrapParagraph(doc, table.title, margin, y, maxW, 5.5);
    y += 1;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    y = wrapParagraph(doc, table.caption, margin, y, maxW, 4.5);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [table.headers],
      body: table.rows,
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [12, 31, 46], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [243, 247, 248] },
      margin: { left: margin, right: margin },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = ((doc as any).lastAutoTable?.finalY || y) + 8;
  }

  // Figures as rasterized PNGs
  let figIndex = 0;
  for (const fig of paper.figures ?? []) {
    figIndex++;
    try {
      const dataUrl = await svgToPngDataUrl(fig.svg, 2);
      if (y > 160) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      y = wrapParagraph(doc, `Figure ${figIndex}. ${fig.title}`, margin, y, maxW, 5.5);
      y += 2;
      const imgW = maxW;
      const imgH = 70;
      doc.addImage(dataUrl, "PNG", margin, y, imgW, imgH, undefined, "FAST");
      y += imgH + 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      y = wrapParagraph(doc, fig.caption, margin, y, maxW, 4.5);
      y += 6;
    } catch {
      // Skip figure if rasterization fails in this environment
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      y = wrapParagraph(
        doc,
        `[Figure ${figIndex}: ${fig.title} — see HTML/Markdown export for SVG]`,
        margin,
        y,
        maxW,
        4.5
      );
      y += 4;
    }
  }

  if (paper.references.length) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("References", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const ref of paper.references) {
      y = wrapParagraph(doc, ref.text, margin, y, maxW, 4.2);
      y += 1.5;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(100);
  if (y > 275) {
    doc.addPage();
    y = 20;
  }
  doc.text(
    `SurveyForge draft · ${paper.metadata.generatedAt} · Validate citations before submission.`,
    margin,
    Math.min(y + 6, 285)
  );

  return doc.output("blob");
}
