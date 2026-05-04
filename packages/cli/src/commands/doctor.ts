import chalk from 'chalk';
import puppeteer from 'puppeteer-core';
import { resolveBrowserExecutable, resolveRequiredBrowserExecutable } from '@ui2v/producer';
import * as http from 'http';

interface CheckResult {
  name: string;
  installed: boolean;
  version?: string | null;
  ok: boolean;
  message: string;
}

export async function doctorCommand(): Promise<void> {
  console.log(chalk.bold('ui2v Environment Check\n'));

  const checks: CheckResult[] = [
    checkNode(),
    await checkBrowser(),
  ];

  let allOk = true;

  for (const result of checks) {
    const status = result.ok ? chalk.green('OK') : chalk.red('FAIL');
    const version = result.version ? chalk.dim(` (${result.version})`) : '';
    const message = result.ok ? chalk.green(result.message) : chalk.yellow(result.message);

    console.log(`${status} ${result.name}${version}`);
    if (!result.ok) {
      console.log(chalk.dim(`  ${message}`));
      allOk = false;
    }
  }

  console.log();

  if (allOk) {
    console.log(chalk.green('All checks passed'));
  } else {
    console.log(chalk.yellow('Some checks failed'));
    console.log(chalk.dim('\nThe standalone renderer needs Node.js 18+ and a locally installed Chrome, Edge, or Chromium browser.'));
  }

  process.exit(allOk ? 0 : 1);
}

function checkNode(): CheckResult {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  return {
    name: 'Node.js',
    installed: true,
    version,
    ok: major >= 18,
    message: major >= 18 ? 'OK' : 'Node.js >= 18 required',
  };
}

async function checkBrowser(): Promise<CheckResult> {
  let browser;
  let server: http.Server | undefined;
  const browserResolution = resolveBrowserExecutable();
  try {
    const executablePath = resolveRequiredBrowserExecutable();
    browser = await withTimeout(
      puppeteer.launch({
        headless: true,
        executablePath,
        protocolTimeout: 15_000,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-features=WebCodecs'],
      }),
      20_000,
      'Timed out launching local browser for WebCodecs probe'
    );
    server = await createProbeServer();
    const page = await browser.newPage();
    page.setDefaultTimeout(10_000);
    page.setDefaultNavigationTimeout(10_000);
    await withTimeout(page.goto(getServerUrl(server), { waitUntil: 'load' }), 10_000, 'Timed out loading WebCodecs probe page');
    const support = await withTimeout(page.evaluate(async () => {
      const videoEncoder = globalThis['VideoEncoder' as keyof typeof globalThis] as any;
      const hasWebCodecs =
        typeof videoEncoder !== 'undefined' &&
        typeof globalThis['VideoFrame' as keyof typeof globalThis] !== 'undefined';
      const avcConfig = {
        codec: 'avc1.42E01E',
        width: 640,
        height: 360,
        bitrate: 1_000_000,
        framerate: 30,
      };
      const hevcConfig = {
        codec: 'hev1.1.6.L93.B0',
        width: 640,
        height: 360,
        bitrate: 1_000_000,
        framerate: 30,
      };

      const avc = hasWebCodecs
        ? await queryVideoEncoderSupport(videoEncoder, avcConfig)
        : { supported: false, error: 'WebCodecs is not available' };
      const hevc = hasWebCodecs
        ? await queryVideoEncoderSupport(videoEncoder, hevcConfig)
        : { supported: false, error: 'WebCodecs is not available' };

      return {
        webCodecs: hasWebCodecs,
        avc,
        hevc,
        userAgent: navigator.userAgent,
      };

      async function queryVideoEncoderSupport(encoder: any, config: Record<string, unknown>) {
        if (typeof encoder.isConfigSupported !== 'function') {
          return { supported: false, error: 'VideoEncoder.isConfigSupported is not available' };
        }

        try {
          const result = await encoder.isConfigSupported(config);
          return {
            supported: Boolean(result.supported),
            config: result.config,
          };
        } catch (error) {
          return {
            supported: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }), 10_000, 'Timed out evaluating WebCodecs probe');

    const hevcMessage = support.hevc.supported ? '; HEVC available' : '; HEVC unavailable';
    const browserSource = browserResolution.source ? ` via ${browserResolution.source}` : '';
    const failureReason = support.webCodecs
      ? support.avc.error ?? 'AVC/H.264 is not supported by this browser'
      : 'WebCodecs is not available in this browser';

    return {
      name: 'Chromium/WebCodecs AVC',
      installed: true,
      version: support.userAgent.match(/Chrome\/([^\s]+)/)?.[1] || 'unknown',
      ok: support.webCodecs && support.avc.supported,
      message: support.webCodecs && support.avc.supported
        ? `OK; AVC/H.264 available${hevcMessage}${browserSource}`
        : failureReason,
    };
  } catch (error) {
    return {
      name: 'Chromium/WebCodecs AVC',
      installed: false,
      version: null,
      ok: false,
      message: `${(error as Error).message} Install Chrome/Edge/Chromium or set PUPPETEER_EXECUTABLE_PATH/CHROME_PATH`,
    };
  } finally {
    if (server) {
      await closeServer(server);
    }
    if (browser) {
      await browser.close();
    }
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function createProbeServer(): Promise<http.Server> {
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><meta charset="utf-8"><title>ui2v probe</title>');
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

function getServerUrl(server: http.Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start probe server');
  }
  return `http://127.0.0.1:${address.port}/`;
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise(resolve => server.close(() => resolve()));
}

