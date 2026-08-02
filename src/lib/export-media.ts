/** Browser helpers to rasterize SVG figures for PDF/DOCX embedding. */

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
  // Ensure xmlns for standalone rendering
  if (!/xmlns=/.test(out)) {
    out = out.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  // Strip nested double-quotes inside font-family attributes that break XML
  out = out.replace(/font-family="([^"]*)"/g, (_m, fam: string) => {
    const clean = fam.replace(/"/g, "'");
    return `font-family="${clean}"`;
  });
  return out;
}

async function rasterizeWithCanvg(svg: string, scale: number): Promise<string> {
  // canvg ships types that don't resolve via package exports in Next/TS.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const canvgMod: any = await import(/* webpackIgnore: false */ "canvg");
  const Canvg = canvgMod.Canvg;
  const { width, height } = parseSvgSize(svg);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(scale, scale);
  const v = await Canvg.from(ctx, sanitizeSvg(svg));
  await v.render();
  ctx.restore();
  return canvas.toDataURL("image/png");
}

async function rasterizeWithImage(svg: string, scale: number): Promise<string> {
  const cleaned = sanitizeSvg(svg);
  const { width, height } = parseSvgSize(cleaned);
  const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
  const img = await loadImage(encoded);
  const canvas = document.createElement("canvas");
  const w = Math.max(img.naturalWidth || width, 640);
  const h = Math.max(img.naturalHeight || height, 280);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

async function rasterizeWithDom(svg: string, scale: number): Promise<string> {
  const cleaned = sanitizeSvg(svg);
  const { width, height } = parseSvgSize(cleaned);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;";
  host.innerHTML = cleaned;
  document.body.appendChild(host);
  try {
    const svgEl = host.querySelector("svg");
    if (!svgEl) throw new Error("SVG element missing");
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));
    const xml = new XMLSerializer().serializeToString(svgEl);
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    const img = await loadImage(encoded);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    host.remove();
  }
}

export async function svgToPngDataUrl(svg: string, scale = 2): Promise<{ dataUrl: string; width: number; height: number }> {
  const { width, height } = parseSvgSize(svg);
  const errors: string[] = [];

  for (const fn of [rasterizeWithCanvg, rasterizeWithDom, rasterizeWithImage]) {
    try {
      const dataUrl = await fn(svg, scale);
      if (dataUrl.startsWith("data:image/png")) {
        return { dataUrl, width, height };
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : "raster fail");
    }
  }
  throw new Error(`Failed to rasterize SVG figure (${errors.join("; ")})`);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load SVG image"));
    img.src = src;
  });
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function downloadBlob(filename: string, content: Blob | string, type?: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
