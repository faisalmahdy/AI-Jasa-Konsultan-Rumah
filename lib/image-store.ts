import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Generated PNGs live on disk under .data/images/, keyed by visual id, and are served
 * through a route. Keeps multi-MB base64 out of the DB rows. The id is validated as a
 * strict UUID before it ever touches the filesystem (path-traversal defense).
 */

const IMAGES_DIR = join(process.cwd(), ".data", "images");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidVisualId(id: string): boolean {
  return UUID_RE.test(id);
}

function imagePath(id: string): string {
  return join(IMAGES_DIR, `${id}.png`);
}

export function saveImagePng(id: string, b64: string): void {
  if (!isValidVisualId(id)) throw new Error("invalid visual id");
  mkdirSync(IMAGES_DIR, { recursive: true });
  writeFileSync(imagePath(id), Buffer.from(b64, "base64"));
}

export function readImagePng(id: string): Buffer | null {
  if (!isValidVisualId(id)) return null;
  const p = imagePath(id);
  return existsSync(p) ? readFileSync(p) : null;
}
