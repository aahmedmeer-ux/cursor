import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ResearchProposal } from "./types";

function p(
  text: string,
  opts?: { bold?: boolean; italics?: boolean; size?: number; center?: boolean; after?: number }
): Paragraph {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: opts?.after ?? 160, line: 276 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        italics: opts?.italics,
        size: opts?.size ?? 22,
        font: "Times New Roman",
      }),
    ],
  });
}

function heading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: "Times New Roman",
        size: 26,
      }),
    ],
  });
}

export async function proposalToDocxBlob(proposal: ResearchProposal): Promise<Blob> {
  const children: Paragraph[] = [
    p(proposal.title, { bold: true, center: true, size: 32, after: 80 }),
    p(proposal.authorsPlaceholder, { center: true, italics: true, after: 80 }),
    p(
      `Prepared from survey: ${proposal.metadata.surveyTitle}${
        proposal.metadata.templateFileName
          ? ` · Template: ${proposal.metadata.templateFileName}`
          : ""
      }${
        proposal.metadata.guidelinesFileName
          ? ` · Guidelines: ${proposal.metadata.guidelinesFileName}`
          : ""
      }`,
      { center: true, size: 18, after: 240 }
    ),
    heading("Abstract"),
    p(proposal.abstract),
  ];

  for (const section of proposal.sections) {
    children.push(heading(section.heading));
    for (const para of section.content.split(/\n+/).filter(Boolean)) {
      children.push(p(para));
    }
  }

  if (proposal.references.length) {
    children.push(heading("References"));
    proposal.references.slice(0, 40).forEach((ref, i) => {
      children.push(p(`[${i + 1}] ${ref.text}`, { size: 18, after: 80 }));
    });
  }

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}
