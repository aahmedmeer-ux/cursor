export type GoogleSheetRef = {
  spreadsheetId: string;
  gid?: string;
  exportCsvUrl: string;
  exportXlsxUrl: string;
  embedUrl: string;
  editUrl: string;
};

const SHEET_ID_RE =
  /(?:https?:\/\/)?(?:docs\.google\.com\/spreadsheets\/d\/|spreadsheets\/d\/)([a-zA-Z0-9-_]+)/i;
const GID_RE = /[?&#]gid=([0-9]+)/i;

export function parseGoogleSheetUrl(input: string): GoogleSheetRef | null {
  const text = input.trim();
  if (!text) return null;

  // Allow bare spreadsheet IDs
  const bareId = /^[a-zA-Z0-9-_]{20,}$/.test(text) ? text : null;
  const idMatch = text.match(SHEET_ID_RE);
  const spreadsheetId = idMatch?.[1] || bareId;
  if (!spreadsheetId) return null;

  const gid = text.match(GID_RE)?.[1];
  const gidParam = gid ? `&gid=${gid}` : "";
  const gidQuery = gid ? `?gid=${gid}` : "";

  return {
    spreadsheetId,
    gid,
    exportCsvUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidParam}`,
    exportXlsxUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx${gidParam}`,
    embedUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/preview${gidQuery}`,
    editUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit${gidQuery}`,
  };
}

export function isGoogleSheetUrl(input: string): boolean {
  return Boolean(parseGoogleSheetUrl(input));
}

export async function fetchGoogleSheetCsv(ref: GoogleSheetRef): Promise<string> {
  const res = await fetch(ref.exportCsvUrl, {
    redirect: "follow",
    headers: {
      Accept: "text/csv,text/plain,*/*",
      "User-Agent": "SurveyForge/1.0 (synthesis-matrix importer)",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `Could not fetch Google Sheet (HTTP ${res.status}). Make sure sharing is set to “Anyone with the link can view”.`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (
    contentType.includes("text/html") ||
    text.includes("<!DOCTYPE html") ||
    text.includes("accounts.google.com") ||
    text.includes("Sign in")
  ) {
    throw new Error(
      "Google Sheet requires sign-in. Open the sheet → Share → General access → Anyone with the link → Viewer, then try again."
    );
  }

  if (!text.trim()) {
    throw new Error("Google Sheet export was empty.");
  }

  return text;
}
