import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const DIR = "/tmp/surveyforge-templates";

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

/** Persist an uploaded PPTX (or other binary template) and return a short id. */
export function saveTemplateFile(buf: Buffer, ext = "pptx"): string {
  ensureDir();
  const id = randomUUID().replace(/-/g, "");
  const filePath = path.join(DIR, `${id}.${ext.replace(/^\./, "")}`);
  fs.writeFileSync(filePath, buf);
  return id;
}

export function loadTemplateFile(id: string, ext = "pptx"): Buffer | null {
  if (!id || !/^[a-f0-9]{16,64}$/i.test(id)) return null;
  const filePath = path.join(DIR, `${id}.${ext.replace(/^\./, "")}`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

export function templateFilePath(id: string, ext = "pptx"): string {
  return path.join(DIR, `${id}.${ext.replace(/^\./, "")}`);
}
