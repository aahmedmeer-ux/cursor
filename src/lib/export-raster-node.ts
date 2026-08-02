/**
 * Server-only SVG rasterizer using sharp.
 * Imported only from PDF/DOCX export paths (API routes) — never from client components.
 */
import sharp from "sharp";

function parseSvgSize(svg: string): { width: number; height: number } {
  const viewBox = svg.match(/viewBox=["']\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*["']/i);
  if (viewBox) {
    return { width: Number(viewBox[3]) || 900, height: Number(viewBox[4]) || 420 };
  }
  const w = Number(svg.match(/\bwidth=["'](\d+)/i)?.[1] || 900);
  const h = Number(svg.match(/\bheight=["'](\d+)/i)?.[1] || 420);
  return { width: w, height: h };
}

function sanitizeSvg(svg: string): string {
  let out = svg.trim();
  if (!/xmlns=/.test(out)) {
    out = out.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  out = out.replace(/font-family="([^"]*)"/g, (_m, fam: string) => {
    const clean = fam.replace(/"/g, "'");
    return `font-family="${clean}"`;
  });
  // sharp/librsvg is happier with explicit hex fills than percentages in some builds
  out = out.replace(/width="100%"/g, (m, offset, full) => {
    const vb = full.match(/viewBox=["']\s*[0-9.]+\s+[0-9.]+\s+([0-9.]+)/);
    return vb ? `width="${vb[1]}"` : m;
  });
  out = out.replace(/height="100%"/g, (m, offset, full) => {
    const vb = full.match(/viewBox=["']\s*[0-9.]+\s+[0-9.]+\s+[0-9.]+\s+([0-9.]+)/);
    return vb ? `height="${vb[1]}"` : m;
  });
  return out;
}

export async function svgToPngDataUrl(
  svg: string,
  scale = 2,
  opts?: { transparent?: boolean }
): Promise<{ dataUrl: string; width: number; height: number }> {
  let cleaned = sanitizeSvg(svg);
  // Drop solid page-sized background rects so equations don't show a gray panel in PDF
  if (opts?.transparent) {
    cleaned = cleaned.replace(/<rect\b[^>]*\bfill=["']#fff(?:fff)?["'][^>]*\/?>/gi, "");
    cleaned = cleaned.replace(/<rect\b[^>]*\bfill=["']white["'][^>]*\/?>/gi, "");
  }
  const { width, height } = parseSvgSize(cleaned);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const bg = opts?.transparent
    ? { r: 255, g: 255, b: 255, alpha: 0 }
    : { r: 255, g: 255, b: 255, alpha: 1 };
  const fit = opts?.transparent ? "fill" : "contain";
  try {
    let pipeline = sharp(Buffer.from(cleaned), { density: Math.round(96 * scale) });
    if (opts?.transparent) pipeline = pipeline.ensureAlpha();
    const png = await pipeline
      .resize(w, h, {
        fit,
        background: bg,
      })
      .png()
      .toBuffer();
    return { dataUrl: `data:image/png;base64,${png.toString("base64")}`, width, height };
  } catch {
    // Fallback: wrap in a minimal SVG shell if the original fails to parse
    const wrapped = `<?xml version="1.0" encoding="UTF-8"?>${cleaned}`;
    let pipeline = sharp(Buffer.from(wrapped), { density: Math.round(96 * scale) });
    if (opts?.transparent) pipeline = pipeline.ensureAlpha();
    const png = await pipeline
      .resize(w, h, {
        fit,
        background: bg,
      })
      .png()
      .toBuffer();
    return { dataUrl: `data:image/png;base64,${png.toString("base64")}`, width, height };
  }
}
