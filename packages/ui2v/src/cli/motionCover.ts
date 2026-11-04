import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

export type CoverFile = { relPath: string; bytes: Uint8Array; contentType?: string };
export type CoverOptions = { cover?: string; coverTime?: number; refreshCover?: boolean };
export type CoverMetadata = { width: number; height: number; duration: number; entryPath: string };
const COVER_PATH = "ui2v-cover.webp";

export function coverMetadata(files: CoverFile[]): CoverMetadata {
  const manifestFile = files.find((file) => file.relPath === "registry-item.json");
  if (!manifestFile) throw new Error("registry-item.json required at package root");
  const manifest = JSON.parse(Buffer.from(manifestFile.bytes).toString("utf8"));
  const entryPath = files.some((file) => file.relPath === "index.html") ? "index.html"
    : manifest.files?.find((file: { type?: string; path?: string }) => file.type === "hyperframes:composition")?.path ?? `${manifest.name}.html`;
  const { width, height } = manifest.dimensions ?? {};
  const duration = manifest.duration;
  if (![width, height, duration].every((value) => typeof value === "number" && Number.isFinite(value) && value > 0) || width > 8192 || height > 8192) {
    throw new Error("Cover requires valid dimensions (1–8192px) and duration in registry-item.json");
  }
  if (!files.some((file) => file.relPath === entryPath)) throw new Error("Cover composition entry missing");
  return { width, height, duration, entryPath };
}

export function coverFingerprint(files: CoverFile[], time?: number) {
  const hash = createHash("sha256").update(`ui2v-cover-v1:${time ?? "auto"}\n`);
  for (const file of [...files].sort((a, b) => a.relPath.localeCompare(b.relPath))) {
    hash.update(file.relPath).update("\0").update(file.bytes).update("\0");
  }
  return hash.digest("hex");
}

async function compressCover(bytes: Uint8Array) {
  const image = sharp(bytes, { limitInputPixels: 40_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["png", "jpeg", "webp"].includes(metadata.format ?? "")) throw new Error("Cover must be PNG, JPEG or WebP");
  const output = await image.rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  if (output.length > 512_000) throw new Error("Cover exceeds 512000 bytes");
  return output;
}

export async function prepareMotionCover(folder: string, files: CoverFile[], options: CoverOptions = {}) {
  if (files.some((file) => file.relPath === COVER_PATH)) {
    throw new Error(`${COVER_PATH} is reserved for publish covers; rename the source image`);
  }
  const metadata = coverMetadata(files);
  if (options.coverTime !== undefined && (!Number.isFinite(options.coverTime) || options.coverTime < 0 || options.coverTime >= metadata.duration)) {
    throw new Error("--cover-time must be >= 0 and less than the composition duration");
  }
  const manifest = JSON.parse(Buffer.from(files.find((file) => file.relPath === "registry-item.json")!.bytes).toString("utf8"));
  const explicit = typeof options.cover === "string" ? options.cover : undefined;
  const declared = typeof manifest.thumbnail === "string" ? manifest.thumbnail : undefined;
  const existing = declared ?? ["thumbnail.webp", "thumbnail.png", "thumbnail.jpg", "cover.webp", "cover.png", "cover.jpg"].find((path) => files.some((file) => file.relPath === path));
  let bytes: Uint8Array;
  if (explicit) {
    bytes = await readFile(resolve(folder, explicit));
  } else if (existing) {
    const file = files.find((file) => file.relPath === existing);
    if (!file) throw new Error(`Declared thumbnail must be a local package file: ${existing}`);
    bytes = file.bytes;
  } else {
    const cacheDir = join(folder, ".ui2v");
    const fingerprint = coverFingerprint(files, options.coverTime);
    const cachePath = join(cacheDir, "cover.png");
    const cachedHash = await readFile(join(cacheDir, "cover.sha256"), "utf8").catch(() => "");
    if (!options.refreshCover && cachedHash === fingerprint && existsSync(cachePath)) {
      bytes = await readFile(cachePath);
    } else {
      // Loaded only when a screenshot is actually required; no browser on install/search.
      const { captureMotionCover } = await import("./motionCoverCapture.js");
      bytes = await captureMotionCover(files, metadata, options.coverTime);
      await mkdir(cacheDir, { recursive: true });
      await writeFile(cachePath, bytes);
      await writeFile(join(cacheDir, "cover.sha256"), fingerprint);
    }
  }
  return { relPath: COVER_PATH, bytes: await compressCover(bytes), contentType: "image/webp" } satisfies CoverFile;
}
