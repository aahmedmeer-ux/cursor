export type DemoSession = {
  id: string;
  email: string;
};

export const DEMO_COOKIE = "leadunlock_demo_user";

function toBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64url").toString("utf8");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeDemoSession(session: DemoSession) {
  return toBase64Url(JSON.stringify(session));
}

export function decodeDemoSession(value?: string | null): DemoSession | null {
  if (!value) return null;
  try {
    // Legacy cookies were raw UUIDs
    if (/^[0-9a-f-]{36}$/i.test(value)) {
      return { id: value, email: "demo@leadunlock.app" };
    }
    const parsed = JSON.parse(fromBase64Url(value)) as DemoSession;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}
