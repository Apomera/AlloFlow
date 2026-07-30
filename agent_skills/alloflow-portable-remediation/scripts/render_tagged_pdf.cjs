#!/usr/bin/env node
'use strict';

/*
 * Optional tagged-PDF tier for the portable skill.
 *
 * This helper loads a locally available Playwright installation, renders the
 * already-sanitized semantic HTML with Chromium's tagged-PDF option, and blocks
 * every page network request. It never downloads a browser or dependency.
 */

const fs = require('fs');
const path = require('path');

const MAX_HTML_BYTES = 8 * 1024 * 1024;

function output(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exitCode = code;
}

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function compactError(error) {
  return String(error && (error.message || error) || 'Unknown error')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
}

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try {
      const candidate = require(name);
      if (candidate && candidate.chromium) return { api: candidate, packageName: name };
    } catch (_) {}
  }
  return null;
}

function executableReady(chromium) {
  try {
    const bundled = chromium.executablePath();
    if (bundled && fs.existsSync(bundled)) return { ready: true, executablePath: bundled };
  } catch (_) {}
  const configured = process.env.ALLOFLOW_CHROMIUM_PATH;
  if (configured && fs.existsSync(configured)) {
    return { ready: true, executablePath: path.resolve(configured) };
  }
  return {
    ready: false,
    reason: 'Playwright is present but no local Chromium executable was found.',
  };
}

function capabilities() {
  const loaded = loadPlaywright();
  if (!loaded) {
    return {
      available: false,
      reason: 'A local Playwright or Playwright Core package is required.',
      networkPolicy: 'deny',
    };
  }
  const executable = executableReady(loaded.api.chromium);
  if (!executable.ready) {
    return {
      available: false,
      reason: executable.reason,
      package: loaded.packageName,
      networkPolicy: 'deny',
    };
  }
  return {
    available: true,
    package: loaded.packageName,
    renderer: 'Chromium tagged PDF',
    networkPolicy: 'deny',
  };
}

function validateInputs(htmlPath, pdfPath) {
  if (!htmlPath || !pdfPath) throw new Error('Use --html INPUT and --pdf OUTPUT.');
  const resolvedHtml = path.resolve(htmlPath);
  const resolvedPdf = path.resolve(pdfPath);
  if (resolvedHtml === resolvedPdf) throw new Error('HTML input and PDF output must be different files.');
  if (!fs.existsSync(resolvedHtml) || !fs.statSync(resolvedHtml).isFile()) {
    throw new Error('HTML input does not exist.');
  }
  if (fs.statSync(resolvedHtml).size > MAX_HTML_BYTES) {
    throw new Error('HTML input exceeds the 8 MiB limit.');
  }
  if (fs.existsSync(resolvedPdf)) throw new Error('Refusing to overwrite an existing PDF.');
  const parent = path.dirname(resolvedPdf);
  if (!fs.existsSync(parent) || !fs.statSync(parent).isDirectory()) {
    throw new Error('PDF output directory does not exist.');
  }
  const html = fs.readFileSync(resolvedHtml, 'utf8');
  if (/<(?:script|iframe|object|embed|base)\b/i.test(html) || /\son[a-z]+\s*=/i.test(html)) {
    throw new Error('Active HTML content is not allowed.');
  }
  if (/<meta\b[^>]*\bhttp-equiv\s*=\s*["']?\s*refresh\b/i.test(html)) {
    throw new Error('Meta refresh navigation is not allowed.');
  }
  const resourceUrls = [];
  html.replace(/<(?:img|link|source)\b[^>]*\b(?:src|href)\s*=\s*["']([^"']+)["']/gi, (_, url) => {
    resourceUrls.push(url);
    return _;
  });
  if (resourceUrls.some((url) => !String(url).startsWith('data:'))) {
    throw new Error('External or file-backed resources are not allowed; embed images as data URLs.');
  }
  if (/@import\b/i.test(html) || /url\(\s*["']?(?!data:)/i.test(html)) {
    throw new Error('External CSS resources are not allowed.');
  }
  return { htmlPath: resolvedHtml, pdfPath: resolvedPdf, html };
}

function structuralMarkers(pdfPath) {
  const bytes = fs.readFileSync(pdfPath);
  const text = bytes.toString('latin1');
  return {
    structTreeRoot: text.includes('/StructTreeRoot'),
    markInfo: text.includes('/MarkInfo'),
    marked: /\/Marked\s+true\b/.test(text),
    language: text.includes('/Lang'),
    title: text.includes('/Title'),
  };
}

async function render() {
  const input = validateInputs(arg('--html'), arg('--pdf'));
  const loaded = loadPlaywright();
  if (!loaded) throw new Error('A local Playwright or Playwright Core package is required.');
  const executable = executableReady(loaded.api.chromium);
  if (!executable.ready) throw new Error(executable.reason);

  let browser;
  let blockedNetworkRequests = 0;
  try {
    browser = await loaded.api.chromium.launch({
      headless: true,
      executablePath: executable.executablePath,
      args: [
        '--disable-background-networking',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-domain-reliability',
        '--disable-features=AutofillServerCommunication,MediaRouter,OptimizationHints',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
      ],
    });
    const context = await browser.newContext({
      javaScriptEnabled: false,
      serviceWorkers: 'block',
    });
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();
      if (url === 'about:blank' || (url.startsWith('data:') && request.resourceType() !== 'document')) {
        await route.continue();
      } else {
        blockedNetworkRequests += 1;
        await route.abort('blockedbyclient');
      }
    });
    const page = await context.newPage();
    await page.setContent(input.html, { waitUntil: 'load', timeout: 30_000 });
    await page.emulateMedia({ media: 'print', colorScheme: 'light', reducedMotion: 'reduce' });
    await page.pdf({
      path: input.pdfPath,
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
    });
    await context.close();
  } catch (error) {
    try {
      if (fs.existsSync(input.pdfPath)) fs.rmSync(input.pdfPath, { force: true });
    } catch (_) {}
    throw error;
  } finally {
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }

  const markers = structuralMarkers(input.pdfPath);
  if (!markers.structTreeRoot || !markers.markInfo || !markers.marked) {
    try { fs.rmSync(input.pdfPath, { force: true }); } catch (_) {}
    throw new Error('Chromium returned PDF bytes without the required tagged-PDF structural markers.');
  }
  return {
    ok: true,
    bytes: fs.statSync(input.pdfPath).size,
    structuralMarkers: markers,
    blockedNetworkRequests,
    networkPolicy: 'deny',
  };
}

async function main() {
  if (process.argv.includes('--capabilities')) {
    output(capabilities());
    return;
  }
  try {
    output(await render());
  } catch (error) {
    output({ ok: false, error: compactError(error), networkPolicy: 'deny' }, 2);
  }
}

main();
