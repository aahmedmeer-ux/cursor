import JSZip from "jszip";
import mammoth from "mammoth";
import type { UploadedGuide } from "./types";

function cleanText(s: string): string {
  return s
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function structureFromText(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const headings: string[] = [];
  for (const line of lines) {
    if (
      /^(section|chapter|part|appendix|\d+(\.\d+)*)\b/i.test(line) ||
      /^[A-Z][A-Z0-9 \-/&,:]{8,80}$/.test(line) ||
      /^(title|abstract|introduction|background|literature|methodology|methods|objectives?|aims?|research questions?|hypothesis|expected outcomes?|timeline|budget|references|conclusion|discussion|significance|innovation|work plan)\b/i.test(
        line
      )
    ) {
      headings.push(line.slice(0, 120));
    }
    if (headings.length >= 24) break;
  }
  return headings;
}

async function extractPptxText(buf: Buffer): Promise<{ text: string; notes: string[] }> {
  const zip = await JSZip.loadAsync(buf);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const nb = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return na - nb;
    });

  const chunks: string[] = [];
  const notes: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]).filter(Boolean);
    const slideText = texts.join(" ").replace(/\s+/g, " ").trim();
    if (slideText) {
      chunks.push(slideText);
      notes.push(`Slide ${notes.length + 1}: ${slideText.slice(0, 140)}`);
    }
  }
  return { text: chunks.join("\n\n"), notes };
}

async function extractDocxText(buf: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: buf });
  return cleanText(result.value || "");
}

export async function parseGuideFile(
  fileName: string,
  mimeType: string,
  data: Buffer,
  kind: UploadedGuide["kind"]
): Promise<UploadedGuide> {
  const lower = fileName.toLowerCase();
  let text = "";
  let structureNotes: string[] | undefined;

  if (lower.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
    text = await extractDocxText(data);
  } else if (lower.endsWith(".pptx") || mimeType.includes("presentationml")) {
    const extracted = await extractPptxText(data);
    text = cleanText(extracted.text);
    structureNotes = extracted.notes.slice(0, 24);
  } else if (
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".markdown") ||
    mimeType.startsWith("text/")
  ) {
    text = cleanText(data.toString("utf8"));
  } else if (lower.endsWith(".pdf")) {
    // Lightweight PDF text scrape (best-effort; binary streams may yield partial text)
    const raw = data.toString("latin1");
    const pieces = [...raw.matchAll(/\(([^)]{4,200})\)/g)]
      .map((m) => m[1])
      .filter((t) => /[A-Za-z]{3}/.test(t) && !/^[\\%]| Tj| Tf/.test(t));
    text = cleanText(pieces.join("\n"));
    if (text.length < 40) {
      text =
        "PDF template uploaded. Structure could not be fully extracted; using standard research-proposal / presentation outline guided by filename and survey content.";
    }
  } else {
    text = cleanText(data.toString("utf8"));
    if (text.length < 20) {
      throw new Error(
        `Unsupported guide format for "${fileName}". Upload .txt, .md, .docx, .pptx, or .pdf.`
      );
    }
  }

  if (!structureNotes?.length) {
    structureNotes = structureFromText(text);
  }

  return {
    fileName,
    kind,
    mimeType: mimeType || "application/octet-stream",
    text: text.slice(0, 120_000),
    structureNotes,
    byteLength: data.byteLength,
  };
}

/** Infer ordered section headings from uploaded template/guidelines text. */
export function inferSectionHeadings(guides: UploadedGuide[], fallback: string[]): string[] {
  const fromStructure = guides.flatMap((g) => g.structureNotes || []);
  const fromText: string[] = [];
  for (const g of guides) {
    for (const line of g.text.split("\n")) {
      const t = line.trim().replace(/^#+\s*/, "").replace(/^\d+(\.\d+)*\s+/, "");
      if (
        t.length >= 4 &&
        t.length <= 90 &&
        /^(abstract|title|introduction|background|literature|problem|motivation|objectives?|aims?|research questions?|hypothesis|methodology|methods|approach|innovation|significance|expected|outcomes?|deliverables?|work plan|timeline|budget|resources?|risk|ethics|references|conclusion|discussion|preliminary|related work|contribution)/i.test(
          t
        )
      ) {
        fromText.push(t);
      }
    }
  }
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const h of [...fromStructure, ...fromText, ...fallback]) {
    const key = h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(h.replace(/^slide\s*\d+:\s*/i, "").slice(0, 100));
    if (ordered.length >= 14) break;
  }
  return ordered.length ? ordered : fallback;
}
