import JSZip from "jszip";
import mammoth from "mammoth";
import type { UploadedGuide } from "./types";

const KNOWN_HEADING =
  /^(abstract|title|introduction|background|literature|related work|problem|motivation|objectives?|aims?|research questions?|hypothesis|methodology|methods|approach|innovation|significance|expected|outcomes?|deliverables?|work plan|timeline|budget|resources?|risk|ethics|references|conclusion|discussion|preliminary|contribution|broader impacts?|intellectual merit|project description|specific aims?|agenda|overview|outline|thank you|q\s*&\s*a|gaps?|challenges?|taxonomy|results?|findings?|next steps?)\b/i;

function cleanText(s: string): string {
  return s
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Reject binary / font / encoding garbage that PDF scrapers often emit. */
export function isReadablePlainText(s: string): boolean {
  const t = s.trim();
  if (t.length < 3) return false;
  if (/Identity\s*Adobe/i.test(t)) return false;
  if (/\/(Font|Encoding|Type|Subtype|Filter|Length|FlateDecode)/i.test(t)) return false;
  // Score a sample so long paragraphs stay allowed
  const sample = t.length > 240 ? t.slice(0, 240) : t;
  const chars = [...sample];
  let letters = 0;
  let weird = 0;
  for (const ch of chars) {
    if (/[A-Za-z]/.test(ch)) letters += 1;
    else if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(ch)) weird += 1;
    else if (/[^\x20-\x7E\u00A0-\u024F\u2010-\u2027\u2030-\u205E\s]/.test(ch)) weird += 1;
  }
  if (letters < 3) return false;
  if (weird / chars.length > 0.12) return false;
  if (letters / chars.length < 0.35) return false;
  return true;
}

export function isCleanHeading(line: string): boolean {
  const t = line
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/^\d+(\.\d+)*[.)]?\s+/, "")
    .replace(/^slide\s*\d+:\s*/i, "");
  if (!isReadablePlainText(t)) return false;
  if (t.length < 3 || t.length > 100) return false;
  if (/^[^\w]+$/.test(t)) return false;
  return (
    KNOWN_HEADING.test(t) ||
    /^[A-Z][A-Za-z0-9 ,/&:–—-]{2,90}$/.test(t) ||
    /^[A-Z][A-Z0-9 ,/&:–—-]{4,80}$/.test(t)
  );
}

function structureFromText(text: string): string[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const headings: string[] = [];
  for (const line of lines) {
    if (!isCleanHeading(line)) continue;
    const cleaned = line
      .replace(/^#+\s*/, "")
      .replace(/^\d+(\.\d+)*[.)]?\s+/, "")
      .slice(0, 100);
    headings.push(cleaned);
    if (headings.length >= 24) break;
  }
  return headings;
}

function sanitizeExtractedText(text: string): string {
  return cleanText(
    text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => isReadablePlainText(l) || (l.length > 40 && isReadablePlainText(l.slice(0, 120))))
      .join("\n")
  );
}

async function extractPptxSlides(buf: Buffer): Promise<{
  text: string;
  notes: string[];
  slideTitles: string[];
  slideCount: number;
}> {
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
  const slideTitles: string[] = [];

  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map((m) => decodeXml(m[1] || "").trim())
      .filter((t) => t && isReadablePlainText(t));
    const slideText = texts.join(" ").replace(/\s+/g, " ").trim();
    const title =
      texts.find((t) => t.length >= 3 && t.length <= 80) ||
      `Slide ${slideTitles.length + 1}`;
    slideTitles.push(title);
    if (slideText) {
      chunks.push(slideText);
      notes.push(`Slide ${notes.length + 1}: ${title}`);
    } else {
      notes.push(`Slide ${notes.length + 1}: ${title}`);
    }
  }

  return {
    text: chunks.join("\n\n"),
    notes,
    slideTitles,
    slideCount: slideFiles.length,
  };
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractDocxText(buf: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: buf });
  return sanitizeExtractedText(result.value || "");
}

async function extractPdfText(buf: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buf) });
    const parsed = await parser.getText();
    const cleaned = sanitizeExtractedText(parsed.text || "");
    if (cleaned.length >= 40) return cleaned;
  } catch {
    /* fall through */
  }
  return "";
}

async function extractImageText(buf: Buffer, mimeType: string): Promise<{ text: string; warning?: string }> {
  try {
    const Tesseract = await import("tesseract.js");
    // Avoid Next.js broken worker path by running recognize in-process when possible
    const result = await Tesseract.recognize(buf, "eng", {
      logger: () => undefined,
    });
    const cleaned = sanitizeExtractedText(result.data.text || "");
    if (cleaned.length >= 10) return { text: cleaned };
    return {
      text: cleaned,
      warning:
        "Image guidelines uploaded with limited OCR text. Using the standard proposal outline plus any detected words.",
    };
  } catch {
    return {
      text: "",
      warning: `Image “guidelines” uploaded (${mimeType || "image"}), but OCR is unavailable in this environment. Using the standard proposal outline. Prefer DOCX or TXT for full guideline text.`,
    };
  }
}

function isImageFile(fileName: string, mimeType: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    mimeType.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(lower)
  );
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
  let originalBase64: string | undefined;
  let warnings: string[] = [];

  if (lower.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
    text = await extractDocxText(data);
  } else if (lower.endsWith(".pptx") || mimeType.includes("presentationml")) {
    const extracted = await extractPptxSlides(data);
    text = sanitizeExtractedText(extracted.text);
    structureNotes = extracted.slideTitles.filter(isCleanHeading).length
      ? extracted.slideTitles.map((t, i) =>
          isCleanHeading(t) ? t : `Slide ${i + 1}`
        )
      : extracted.notes;
    // Keep original bytes so export can duplicate this exact template
    originalBase64 = data.toString("base64");
    if (!extracted.slideCount) {
      warnings.push("PPTX had no readable slides; a standard outline will be used.");
    }
  } else if (
    lower.endsWith(".txt") ||
    lower.endsWith(".md") ||
    lower.endsWith(".markdown") ||
    mimeType.startsWith("text/")
  ) {
    text = sanitizeExtractedText(data.toString("utf8"));
  } else if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    text = await extractPdfText(data);
    if (!text) {
      text = "";
      warnings.push(
        "Could not extract clean text from PDF (likely scanned or font-encoded). Using the standard proposal outline; prefer DOCX/TXT or an image of the guidelines."
      );
    }
  } else if (isImageFile(fileName, mimeType)) {
    const imaged = await extractImageText(data, mimeType);
    text = imaged.text;
    if (imaged.warning) warnings.push(imaged.warning);
    // Do not keep image bytes in the guide payload (keeps generate requests small)
  } else {
    throw new Error(
      `Unsupported guide format for "${fileName}". Upload .txt, .md, .docx, .pptx, .pdf, or an image (PNG/JPG/WEBP).`
    );
  }

  if (!structureNotes?.length) {
    structureNotes = structureFromText(text);
  } else {
    structureNotes = structureNotes.filter((n) => isReadablePlainText(n) || /^Slide \d+/i.test(n));
  }

  // Never keep binary garbage in the text blob used for generation
  text = sanitizeExtractedText(text);

  return {
    fileName,
    kind,
    mimeType: mimeType || "application/octet-stream",
    text: text.slice(0, 120_000),
    structureNotes,
    byteLength: data.byteLength,
    originalBase64,
    warnings: warnings.length ? warnings : undefined,
  };
}

/** Infer ordered section headings from uploaded template/guidelines text. */
export function inferSectionHeadings(guides: UploadedGuide[], fallback: string[]): string[] {
  const fromStructure = guides.flatMap((g) => g.structureNotes || []);
  const fromText: string[] = [];
  for (const g of guides) {
    for (const line of g.text.split("\n")) {
      const t = line
        .trim()
        .replace(/^#+\s*/, "")
        .replace(/^\d+(\.\d+)*[.)]?\s+/, "");
      if (isCleanHeading(t) && KNOWN_HEADING.test(t)) {
        fromText.push(t.slice(0, 100));
      }
    }
  }
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const h of [...fromStructure, ...fromText]) {
    if (!isReadablePlainText(h) && !/^Slide \d+/i.test(h)) continue;
    const key = h.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    // Skip generic "Slide N" if we already have real headings
    if (/^slide\s*\d+$/i.test(key) && ordered.some((x) => !/^slide\s*\d+/i.test(x))) continue;
    seen.add(key);
    ordered.push(h.replace(/^slide\s*\d+:\s*/i, "").slice(0, 100));
    if (ordered.length >= 14) break;
  }
  return ordered.length ? ordered : fallback;
}
