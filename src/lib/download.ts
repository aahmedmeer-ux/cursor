/** Tiny browser download helpers — safe for client components (no heavy deps). */

export function downloadBlob(filename: string, content: Blob | string, type?: string) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: type || "text/plain" });
  if ("size" in blob && blob.size === 0) {
    throw new Error("Download was empty.");
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  // dispatchEvent is more reliable than a.click() after async work in some browsers
  a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 2500);
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "survey"
  );
}

export async function downloadFromApi(
  url: string,
  body: unknown,
  fallbackName: string
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Network error while downloading: ${err.message}`
        : "Network error while downloading"
    );
  }

  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      try {
        const text = await res.text();
        if (text) message = text.slice(0, 240);
      } catch {
        /* ignore */
      }
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  if (!blob.size) {
    throw new Error("Export returned an empty file.");
  }
  const cd = res.headers.get("Content-Disposition") || "";
  const match = cd.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  const rawName = match?.[1] ? decodeURIComponent(match[1].replace(/"/g, "")) : fallbackName;
  downloadBlob(rawName || fallbackName, blob);
}
