import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Local filesystem storage with a clean swap path to S3 / Supabase Storage.
 * Uploads are treated as ephemeral working files and deleted after analysis.
 */
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./uploads";

export async function ensureUploadDir(): Promise<string> {
  const abs = path.join(/* turbopackIgnore: true */ process.cwd(), UPLOAD_DIR);
  await mkdir(abs, { recursive: true });
  return abs;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}

export async function saveUpload(
  file: File | Buffer,
  originalName: string,
): Promise<{ fileUrl: string; absolutePath: string; storedName: string }> {
  const dir = await ensureUploadDir();
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizeFileName(originalName)}`;
  const absolutePath = path.join(dir, storedName);

  const buffer =
    file instanceof Buffer
      ? file
      : Buffer.from(await (file as File).arrayBuffer());

  await writeFile(absolutePath, buffer);

  // Private app path — never a public CDN URL. Served only to the owner.
  const fileUrl = `/api/files/${storedName}`;
  return { fileUrl, absolutePath, storedName };
}

export async function readStoredFile(storedName: string): Promise<Buffer> {
  const dir = await ensureUploadDir();
  const safe = path.basename(storedName);
  return readFile(path.join(dir, safe));
}

export function resolveStoredPath(fileUrl: string): string {
  const storedName = path.basename(fileUrl);
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    UPLOAD_DIR,
    storedName,
  );
}

/** Best-effort delete of a raw upload after text extraction. */
export async function deleteStoredFile(fileUrlOrName: string): Promise<void> {
  try {
    const abs = resolveStoredPath(fileUrlOrName);
    await unlink(abs);
  } catch {
    /* already gone */
  }
}
