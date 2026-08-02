import { readFile } from "fs/promises";
import mammoth from "mammoth";
import { countWords, normalizeText } from "@/services/text/normalize";
import type { ExtractedDocument, ExtractedPage } from "@/types";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT_MIME = "text/plain";

export const ALLOWED_MIME_TYPES = [PDF_MIME, DOCX_MIME, TXT_MIME, "text/txt"] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export function isAllowedUpload(fileName: string, mimeType: string): boolean {
  const lower = fileName.toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  const mimeOk =
    ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number]) ||
    mimeType === "" ||
    mimeType === "application/octet-stream";
  return extOk && mimeOk;
}

function pagesFromPlainText(raw: string): ExtractedPage[] {
  const text = normalizeText(raw);
  if (!text) return [];

  // Prefer form-feed page breaks; otherwise approximate ~3000 chars/page
  if (text.includes("\f")) {
    return text
      .split("\f")
      .map((p) => normalizeText(p))
      .filter(Boolean)
      .map((pageText, i) => ({ pageNumber: i + 1, text: pageText }));
  }

  const approx = 3000;
  const pages: ExtractedPage[] = [];
  for (let i = 0; i < text.length; i += approx) {
    pages.push({
      pageNumber: pages.length + 1,
      text: text.slice(i, i + approx),
    });
  }
  return pages;
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const pages: ExtractedPage[] =
      result.pages?.length > 0
        ? result.pages.map((page) => ({
            pageNumber: page.num ?? 0,
            text: normalizeText(page.text || ""),
          }))
        : pagesFromPlainText(result.text || "");

    const normalizedPages = pages
      .map((page, index) => ({
        pageNumber: page.pageNumber || index + 1,
        text: page.text,
      }))
      .filter((page) => page.text.length > 0);

    const text =
      normalizedPages.map((p) => p.text).join("\n\n") ||
      normalizeText(result.text || "");

    return {
      text,
      pages: normalizedPages.length
        ? normalizedPages
        : [{ pageNumber: 1, text }],
      pageCount: normalizedPages.length || 1,
      wordCount: countWords(text),
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const pages = pagesFromPlainText(result.value || "");
  const text = pages.map((p) => p.text).join("\n\n");
  return {
    text,
    pages: pages.length ? pages : [{ pageNumber: 1, text }],
    pageCount: pages.length || 1,
    wordCount: countWords(text),
  };
}

async function extractTxt(buffer: Buffer): Promise<ExtractedDocument> {
  const pages = pagesFromPlainText(buffer.toString("utf8"));
  const text = pages.map((p) => p.text).join("\n\n");
  return {
    text,
    pages: pages.length ? pages : [{ pageNumber: 1, text }],
    pageCount: pages.length || 1,
    wordCount: countWords(text),
  };
}

export async function extractDocument(
  absolutePath: string,
  fileName: string,
  mimeType: string,
): Promise<ExtractedDocument> {
  const buffer = await readFile(absolutePath);
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf") || mimeType === PDF_MIME) {
    return extractPdf(buffer);
  }
  if (lower.endsWith(".docx") || mimeType === DOCX_MIME) {
    return extractDocx(buffer);
  }
  if (lower.endsWith(".txt") || mimeType.startsWith("text/")) {
    return extractTxt(buffer);
  }

  throw new Error(`Unsupported file type: ${fileName} (${mimeType})`);
}
