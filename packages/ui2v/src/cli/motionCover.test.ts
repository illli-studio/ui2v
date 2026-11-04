/* @vitest-environment node */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { coverFingerprint, prepareMotionCover, type CoverFile } from "./motionCover.js";

const capture = vi.hoisted(() => vi.fn());
vi.mock("./motionCoverCapture.js", () => ({ captureMotionCover: capture }));
const manifest = { name: "test", dimensions: { width: 1920, height: 1080 }, duration: 4, files: [{ path: "index.html", type: "hyperframes:composition" }] };
const files: CoverFile[] = [
  { relPath: "registry-item.json", bytes: Buffer.from(JSON.stringify(manifest)) },
  { relPath: "index.html", bytes: Buffer.from("<html>composition</html>") },
];
const image = () => sharp({ create: { width: 960, height: 540, channels: 3, background: "red" } }).png().toBuffer();

describe("default publish covers", () => {
  it("captures once, reuses cached content, invalidates on edits/time and refreshes on demand", async () => {
    const folder = await mkdtemp(join(tmpdir(), "ui2v-cover-test-"));
    capture.mockReset().mockResolvedValue(await image());
    try {
      const first = await prepareMotionCover(folder, files);
      expect(first?.relPath).toBe("ui2v-cover.webp");
      expect(await sharp(first!.bytes).metadata()).toMatchObject({ format: "webp", width: 640, height: 360 });
      await prepareMotionCover(folder, files);
      expect(capture).toHaveBeenCalledTimes(1);
      const changed = [...files, { relPath: "style.css", bytes: Buffer.from("body{color:red}") }];
      await prepareMotionCover(folder, changed);
      await prepareMotionCover(folder, changed, { coverTime: 1 });
      await prepareMotionCover(folder, changed, { coverTime: 1, refreshCover: true });
      expect(capture).toHaveBeenCalledTimes(4);
    } finally { await rm(folder, { recursive: true, force: true }); }
  });
  it("uses existing thumbnail images without opening a browser", async () => {
    capture.mockClear();
    const cover = await prepareMotionCover("unused", [...files, { relPath: "thumbnail.png", bytes: await image() }]);
    expect(cover?.contentType).toBe("image/webp");
    expect(capture).not.toHaveBeenCalled();
  });
  it("requires valid package data and rejects invalid timestamps", async () => {
    await expect(prepareMotionCover("unused", [])).rejects.toThrow(/registry-item/);
    await expect(prepareMotionCover("unused", files, { coverTime: 4 })).rejects.toThrow(/cover-time/);
    await expect(prepareMotionCover("unused", files, { coverTime: NaN })).rejects.toThrow(/cover-time/);
  });
  it("hashes file content independently of enumeration order", () => {
    expect(coverFingerprint(files)).toBe(coverFingerprint([...files].reverse()));
    expect(coverFingerprint(files, 1)).not.toBe(coverFingerprint(files, 2));
  });
});
