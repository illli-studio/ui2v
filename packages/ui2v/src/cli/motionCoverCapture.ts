import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";
import sharp from "sharp";
import type { CoverFile, CoverMetadata } from "./motionCover.js";

const require = createRequire(import.meta.url);

export async function captureMotionCover(files: CoverFile[], metadata: CoverMetadata, time?: number) {
  const { width, height, duration, entryPath } = metadata;
  const frameTime = time ?? Math.min(3, duration / 2);
  const executablePath = process.env.UI2V_COVER_BROWSER ?? [
    chromium.executablePath(),
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
  ].find(existsSync);
  if (!executablePath) throw new Error("Cover browser missing. Install Chromium with npx playwright@1.64.1 install chromium, set UI2V_COVER_BROWSER, or pass --cover thumbnail.png.");
  const player = readFileSync(new URL("./hyperframes-player.global.js", import.meta.resolve("@hyperframes/player")));
  const gsap = readFileSync(require.resolve("gsap/dist/gsap.min.js"));
  const byPath = new Map(files.map((file) => [file.relPath, file]));
  const encodedEntry = entryPath.split("/").map(encodeURIComponent).join("/");
  const server = createServer((request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const path = decodeURIComponent(url.pathname);
      if (path === "/__cover/player.js" || path === "/__cover/gsap.js") {
        response.setHeader("Content-Type", "text/javascript");
        response.end(path.endsWith("player.js") ? player : gsap);
      } else if (path === "/__cover/harness") {
        response.setHeader("Content-Type", "text/html");
        response.end(`<!doctype html><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111}hyperframes-player{display:block;width:100%;height:100%}</style><script src="/__cover/player.js"></script><hyperframes-player width="${width}" height="${height}" muted assets-loading-ui="none" shader-loading="none" disable-click-to-play src="/files/${encodedEntry}"></hyperframes-player>`);
      } else {
        const file = path.startsWith("/files/") ? byPath.get(path.slice(7)) : undefined;
        if (!file) { response.writeHead(404).end(); return; }
        response.setHeader("Content-Type", file.contentType ?? "application/octet-stream");
        const html = Buffer.from(file.bytes).toString("utf8");
        // Instantiate reusable template entries through the player's nested composition path.
        const live = html.replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, "");
        const id = /<template\b[^>]*>[\s\S]*?data-composition-id=["']([^"']+)["']/.exec(html)?.[1];
        if (file.relPath === entryPath && !url.searchParams.has("template") && id && !/data-composition-id\s*=/.test(live)) {
          const safeId = id.replace(/[&<>"']/g, "");
          response.end(`<!doctype html><script src="/__cover/gsap.js"></script><div data-composition-id="cover-root" data-duration="${duration}" data-width="${width}" data-height="${height}"><div data-composition-id="${safeId}" data-composition-src="/files/${encodedEntry}?template=1" data-start="0" data-duration="${duration}" data-width="${width}" data-height="${height}"></div></div><script>window.__timelines={"cover-root":gsap.timeline({paused:true})}</script>`);
        } else response.end(Buffer.from(file.bytes));
      }
    } catch { response.writeHead(400).end(); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Cover server unavailable");
  const origin = `http://127.0.0.1:${address.port}`;
  let browser;
  try {
    browser = await chromium.launch({ executablePath, headless: true });
    const scale = Math.min(640 / width, 640 / height);
    const context = await browser.newContext({ viewport: { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }, serviceWorkers: "block", acceptDownloads: false });
    // This server exposes the package's uploaded bytes only, never filesystem paths or auth.
    await context.routeWebSocket("**/*", (socket) => socket.close());
    const page = await context.newPage();
    await page.goto(`${origin}/__cover/harness`, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(() => (document.querySelector("hyperframes-player") as HTMLElement & { painted?: boolean })?.painted, undefined, { timeout: 30_000 });
    await page.evaluate(async (seconds) => {
      const element = document.querySelector("hyperframes-player") as HTMLElement & { pause(): void; seek(time: number): void };
      element.pause(); element.seek(seconds);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }, frameTime);
    const screenshot = await page.locator("hyperframes-player").screenshot({ timeout: 10_000 });
    if ((await sharp(screenshot).stats()).entropy < 0.1) throw new Error("Captured frame is blank; choose a different --cover-time or supply --cover");
    return screenshot;
  } catch (error) {
    throw new Error(`Cover screenshot failed; fix the composition or provide --cover thumbnail.png. ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
