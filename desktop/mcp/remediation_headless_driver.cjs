#!/usr/bin/env node
/**
 * Headless driver for the AlloFlow PDF remediation pipeline.
 *
 * Runs the REAL doc_pipeline_module.js (the same bytes the app ships) inside
 * headless Chromium, exactly the way tests/e2e/remediation_fault_injection_golden.spec.ts
 * proved works: load verification_policy + doc_builder_renderer + doc_pipeline
 * into a bare page, instantiate createDocPipeline with injected deps, and call
 * runPdfAccessibilityAudit / fixAndVerifyPdf. Nothing in the app is modified —
 * this is a pure consumer.
 *
 * Isolation model: ONE fresh browser page per run. The pipeline uses ambient
 * window.__* globals for cross-cutting run state; a fresh page means a fresh
 * module instance, so runs can never stomp each other's globals (the zombie-run
 * class the app needed gen-guards for cannot occur here).
 *
 * Gemini transport: Node-side fetch to the Gemini API (GEMINI_API_KEY), bridged
 * into the page via exposeFunction. Errors cross the bridge as a JSON envelope
 * and are re-thrown in-page with the classification flags doc_pipeline's
 * breaker/permanence logic expects (isQuota/isAuth/isConfig/classification/
 * originalMessage — the shape pinned by tests/gemini_error_taxonomy_contract.test.js).
 * A direct-API 401 is a REAL key problem (canvasTransientAuth is never set).
 *
 * Requires: network for the host-provided Gemini API only. Browser libraries are
 * loaded from the hash-verified vendor bundle beside this driver; strict remote
 * jobs block all other browser egress. No AlloFlow server involved.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');       // self-test scratch dir
const http = require('http');   // self-test loopback model (127.0.0.1, no listener beyond the run)
const { zipFileMap } = require('./zip_writer.cjs'); // ePub/DAISY packaging, no CDN, works offline
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MODULE_FILES = [
  'verification_policy_module.js',
  'doc_builder_renderer_module.js',
  'doc_pipeline_module.js',
  'view_pdf_validator_module.js',
];
// Where the pipeline modules + verapdf/ actually live. A repo checkout serves them from the
// repo root; a packaged MCPB bundle ships them in an assets/ dir next to server/. Resolution:
// ALLOFLOW_MCP_ASSETS_DIR override → repo root when the modules are there → ../assets.
function resolveAssetsRoot() {
  if (process.env.ALLOFLOW_MCP_ASSETS_DIR) return path.resolve(process.env.ALLOFLOW_MCP_ASSETS_DIR);
  if (fs.existsSync(path.join(REPO_ROOT, MODULE_FILES[0]))) return REPO_ROOT;
  return path.resolve(__dirname, '..', 'assets');
}
const ASSETS_ROOT = resolveAssetsRoot();
const HEADLESS_AUDITOR_COUNT = 5;

// Browser dependencies are vendored so a remote job never sends document content to a
// public asset CDN. The manifest is checked before any input is opened and every response
// is served from memory over the loopback origin used by the pipeline page.
const VENDOR_BOOT_PATH = '/__alloflow_mcp_vendor/';
const VENDOR_BOOT_URL = 'http://127.0.0.1/__alloflow_mcp_boot__';
let vendorBundleCache = null;

function resolveVendorRoot() {
  const candidates = [
    path.join(__dirname, 'vendor'),
    path.join(ASSETS_ROOT, 'vendor'),
  ];
  return candidates.find((root) => fs.existsSync(path.join(root, 'manifest.json'))) || candidates[0];
}

function vendorContentType(name) {
  if (/\.wasm$/i.test(name)) return 'application/wasm';
  if (/\.json$/i.test(name)) return 'application/json';
  if (/\.css$/i.test(name)) return 'text/css';
  return 'application/javascript; charset=utf-8';
}

function loadVendorBundle() {
  if (vendorBundleCache) return vendorBundleCache;
  const root = resolveVendorRoot();
  const manifestPath = path.join(root, 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (error) {
    throw new Error('AlloFlow MCP vendor manifest is missing or invalid: ' + manifestPath + ' (' + error.message + ')');
  }
  if (!manifest || manifest.schema !== 1 || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('AlloFlow MCP vendor manifest has an unsupported schema: ' + manifestPath);
  }
  const files = new Map();
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== 'string' || entry.path.startsWith('/') || entry.path.includes('..')
      || !/^[A-Za-z0-9._/-]+$/.test(entry.path) || !Number.isSafeInteger(entry.bytes)
      || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
      throw new Error('AlloFlow MCP vendor manifest contains an unsafe entry: ' + JSON.stringify(entry));
    }
    const absolute = path.resolve(root, entry.path);
    if (!absolute.startsWith(path.resolve(root) + path.sep) || files.has(entry.path)) {
      throw new Error('AlloFlow MCP vendor manifest contains a duplicate or out-of-root entry: ' + entry.path);
    }
    let bytes;
    try { bytes = fs.readFileSync(absolute); } catch (error) {
      throw new Error('AlloFlow MCP vendor asset is missing: ' + entry.path + ' (' + error.message + ')');
    }
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== entry.bytes || sha256 !== entry.sha256) {
      throw new Error('AlloFlow MCP vendor asset failed hash verification: ' + entry.path);
    }
    files.set(entry.path, { path: absolute, body: bytes, bytes: entry.bytes, sha256 });
  }
  vendorBundleCache = { root, files };
  return vendorBundleCache;
}

function verifyVendorBundle() {
  try {
    const bundle = loadVendorBundle();
    return { present: true, hashVerified: true, root: bundle.root, files: bundle.files.size };
  } catch (error) {
    return { present: false, hashVerified: false, root: null, files: 0, error: String((error && error.message) || error) };
  }
}

function vendorAssetPath(name) {
  const asset = loadVendorBundle().files.get(name);
  if (!asset) throw new Error('AlloFlow MCP vendor asset is not in the manifest: ' + name);
  return asset.path;
}

function vendorAssetUrl(name) {
  if (!loadVendorBundle().files.has(name)) throw new Error('AlloFlow MCP vendor asset is not in the manifest: ' + name);
  const encoded = name.split('/').map((part) => encodeURIComponent(part)).join('/');
  return 'http://127.0.0.1' + VENDOR_BOOT_PATH + encoded;
}

async function installVendorRuntime(page, options) {
  const o = options || {};
  const bundle = loadVendorBundle();
  const strict = process.env.ALLOFLOW_MCP_OFFLINE_ASSETS === '1';
  await page.route('**/*', async (route) => {
    let parsed;
    try { parsed = new URL(route.request().url()); } catch (_) { return route.abort(); }
    if (parsed.href === VENDOR_BOOT_URL) {
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' });
    }
    if (parsed.hostname === '127.0.0.1' && parsed.pathname.startsWith(VENDOR_BOOT_PATH)) {
      let name;
      try { name = parsed.pathname.slice(VENDOR_BOOT_PATH.length).split('/').map((part) => decodeURIComponent(part)).join('/'); } catch (_) { return route.fulfill({ status: 400, body: 'bad vendor path' }); }
      const asset = bundle.files.get(name);
      if (!asset) return route.fulfill({ status: 404, body: 'vendor asset not found' });
      return route.fulfill({ status: 200, contentType: vendorContentType(name), body: asset.body });
    }
    if (parsed.protocol === 'about:' || parsed.protocol === 'blob:' || parsed.protocol === 'data:' || parsed.hostname === '127.0.0.1') {
      return route.continue();
    }
    return strict ? route.abort() : route.continue();
  });
  await page.goto(VENDOR_BOOT_URL);
  const assetNames = [];
  if (o.loadPdfjs || o.loadCore) assetNames.push('pdfjs.min.js');
  if (o.loadCore) assetNames.push('pdf-lib.min.js', 'pako.min.js', 'fontkit.umd.min.js', 'tesseract.min.js');
  if (o.loadAxe || o.loadCore) assetNames.push('axe.min.js');
  for (const name of [...new Set(assetNames)]) await page.addScriptTag({ path: vendorAssetPath(name) });
  const runtimeAssets = {
    pdfjsWorker: vendorAssetUrl('pdf.worker.min.js'),
    tesseractWorker: vendorAssetUrl('tesseract.worker.min.js'),
    tesseractCore: vendorAssetUrl('tesseract-core.wasm.js'),
    tesseractLang: 'http://127.0.0.1' + VENDOR_BOOT_PATH + 'tessdata/',
  };
  await page.evaluate((assets) => {
    window.__alloflowRuntimeAssets = Object.assign({}, window.__alloflowRuntimeAssets || {}, assets);
    if (window.Tesseract && typeof window.Tesseract.createWorker === 'function' && !window.Tesseract.__alloflowLocalPatched) {
      const original = window.Tesseract.createWorker;
      window.Tesseract.createWorker = (langs, oem, options, config) => original(
        langs, oem, Object.assign({}, options || {}, {
          workerPath: assets.tesseractWorker,
          corePath: assets.tesseractCore,
          langPath: assets.tesseractLang,
        }), config,
      );
      window.Tesseract.__alloflowLocalPatched = true;
    }
  }, runtimeAssets);
  return { bundle, strict, assets: runtimeAssets };
}

// veraPDF validator transport. The page + its 16MB JAR live in the repo (verapdf/), and
// CheerpJ (the in-browser JVM) REQUIRES HTTP Range (206) responses to load a JAR — the
// hosted CDN copy fails that requirement at some edges ("HTTP server does not support the
// 'Range' header. CheerpJ cannot run.", observed 2026-07-16), so the driver serves the repo
// copy from a loopback HTTP server with real Range support. ALLOFLOW_MCP_VERAPDF_URL
// overrides (it must point at a Range-capable host).
const VERAPDF_URL_OVERRIDE = process.env.ALLOFLOW_MCP_VERAPDF_URL || '';

const DEFAULT_MODEL = process.env.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview';
const FALLBACK_MODEL = process.env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite';
// Lazy + env-overridable so tests can point the transport at a scripted loopback model
// (ALLOFLOW_MCP_GEMINI_BASE) even after this module is loaded.
function geminiBase() { return process.env.ALLOFLOW_MCP_GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta/models'; }

function defaultLog(msg) { process.stderr.write('[alloflow-remediation] ' + msg + '\n'); }

// ── Chromium resolution ─────────────────────────────────────────────────────
// The playwright PACKAGE resolving is not the same as the BROWSER BINARY being
// installed — a packaged bundle ships the package but never the ~250MB browser.
// resolveChromium() reports both, plus the CLI entry point installChromium()
// spawns to download the binary (Playwright's supported install path).
function resolveChromium() {
  for (const pkg of ['@playwright/test', 'playwright']) {
    try {
      const m = require(pkg);
      if (!m || !m.chromium) continue;
      let execPath = null, installed = false;
      try { execPath = m.chromium.executablePath(); installed = !!(execPath && fs.existsSync(execPath)); } catch (_) {}
      let cliPath = null;
      try { cliPath = require.resolve(pkg + '/cli.js'); } catch (_) {}
      return { pkg, chromium: m.chromium, executablePath: execPath, installed, cliPath };
    } catch (_) {}
  }
  return { pkg: null, chromium: null, executablePath: null, installed: false, cliPath: null };
}

// Download the Chromium binary via the bundled Playwright CLI (the supported installer).
// ~150-250MB, 1-5 minutes on school wifi. Resolves {installed, log} — never throws for a
// failed install; the caller reports honestly.
function installChromium(onLog) {
  const rlog = typeof onLog === 'function' ? onLog : defaultLog;
  const res = resolveChromium();
  if (res.installed) return Promise.resolve({ installed: true, alreadyInstalled: true });
  if (!res.cliPath) return Promise.resolve({ installed: false, error: 'Playwright CLI not found — the playwright package is missing entirely.' });
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    rlog('Downloading Chromium via Playwright (' + res.pkg + ') — this is a one-time ~150-250MB download...');
    const child = spawn(process.execPath, [res.cliPath, 'install', 'chromium'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    const sink = (chunk) => { const t = String(chunk); tail = (tail + t).slice(-2000); const line = t.trim().split('\n').pop(); if (line) rlog('installer: ' + line.slice(0, 200)); };
    child.stdout.on('data', sink);
    child.stderr.on('data', sink);
    child.on('error', (e) => resolve({ installed: false, error: 'Installer failed to start: ' + e.message }));
    child.on('exit', (code) => {
      const after = resolveChromium();
      if (after.installed) resolve({ installed: true });
      else resolve({ installed: false, error: 'Installer exited with code ' + code + ' but the browser binary is still missing. Last output: ' + tail.slice(-400) });
    });
  });
}

// ── Gemini key resolution ───────────────────────────────────────────────────
// Order: GEMINI_API_KEY env var → the file at ALLOFLOW_MCP_ENV_PATH → the repo's
// gitignored maintainer env file (desktop/web-app/.env.maintainer-demo), reading
// GEMINI_API_KEY / REACT_APP_GEMINI_API_KEY / REACT_APP_API_KEY. The key VALUE is
// never logged or returned by any tool — only its source label. Set
// ALLOFLOW_MCP_NO_KEY_FILES=1 to disable the file fallbacks (the smoke test does,
// so its "no key" contract holds on machines where the maintainer file exists).
function readKeyFromEnvFile(p) {
  let text;
  try { text = fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
  // Gemini-specific names ONLY. `REACT_APP_API_KEY` was accepted here until
  // 2026-08-04, but in a CRA env file that name holds the FIREBASE web key —
  // a different credential for a different service. Falling back to it silently
  // transmitted a Firebase key to generativelanguage.googleapis.com. Never
  // guess which service a generically-named key belongs to.
  for (const name of ['GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY']) {
    const m = text.match(new RegExp('^\\s*' + name + '\\s*=\\s*(["\']?)([^"\'\\r\\n]+)\\1\\s*$', 'm'));
    if (m && m[2] && m[2].trim() && !/YOUR|CHANGE|PLACEHOLDER|XXXX/i.test(m[2])) return m[2].trim();
  }
  return null;
}

function resolveGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return { key: process.env.GEMINI_API_KEY, source: 'env:GEMINI_API_KEY' };
  if (process.env.ALLOFLOW_MCP_NO_KEY_FILES === '1') return { key: null, source: 'none' };
  const candidates = [];
  if (process.env.ALLOFLOW_MCP_ENV_PATH) candidates.push(path.resolve(process.env.ALLOFLOW_MCP_ENV_PATH));
  candidates.push(path.join(REPO_ROOT, 'desktop/web-app', '.env.maintainer-demo'));
  for (const p of candidates) {
    const key = readKeyFromEnvFile(p);
    if (key) return { key, source: 'file:' + path.basename(p) };
  }
  return { key: null, source: 'none' };
}

// ── Gemini transport (Node side) ────────────────────────────────────────────
// Returns { ok: true, text } or { ok: false, error: {...} } — never throws.
// The in-page wrapper re-throws the error envelope with its flags attached so
// doc_pipeline's classifier-driven paths (per-day permanence, burst retry,
// transient breaker feed) behave exactly as they do in the app.
function classifyHttpFailure(status, bodyText) {
  const raw = 'HTTP ' + status + ': ' + String(bodyText || '').slice(0, 2000);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(bodyText || '')) {
    const perDay = /per\s*day|daily|PerDay/i.test(bodyText || '');
    return {
      message: 'API_QUOTA_EXHAUSTED', originalMessage: raw,
      isQuota: true, classification: { kind: 'quota', perMinute: !perDay, perDay },
    };
  }
  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(bodyText || '')) {
    // Direct API: a 401/403 is a genuine key/permission problem, not a Canvas throttle.
    return { message: 'API_AUTH_FAILED', originalMessage: raw, isAuth: true, classification: { kind: 'auth' } };
  }
  if (status === 404 || /is not found for API version/i.test(bodyText || '')) {
    return { message: 'API_MODEL_NOT_FOUND', originalMessage: raw, isConfig: true, classification: { kind: 'config' } };
  }
  // Everything else stays RAW so doc_pipeline's transient regex (5xx/timeout/
  // empty-body) treats it as retryable and feeds the breaker.
  return { message: raw, originalMessage: raw, classification: { kind: 'transient' } };
}

async function geminiGenerate({ apiKey, model, parts, log }) {
  const url = geminiBase() + '/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
  } catch (e) {
    return { ok: false, error: { message: 'Network error calling Gemini: ' + (e && e.message ? e.message : 'fetch failed'), classification: { kind: 'transient' } } };
  }
  const bodyText = await res.text().catch(() => '');
  if (!res.ok) return { ok: false, error: classifyHttpFailure(res.status, bodyText) };
  let body;
  try { body = JSON.parse(bodyText); } catch (_) { return { ok: true, text: '' }; } // empty/garbled 200 → empty (pipeline counts it transient by design)
  const cand = body && body.candidates && body.candidates[0];
  if (cand && cand.finishReason === 'RECITATION') {
    return { ok: false, error: { message: 'RECITATION: content filter refused this content', originalMessage: 'finishReason=RECITATION', classification: { kind: 'content' } } };
  }
  const text = ((cand && cand.content && cand.content.parts) || [])
    .map((p) => (p && typeof p.text === 'string') ? p.text : '')
    .join('');
  if (!text && log) log('Gemini returned an empty body (finishReason=' + ((cand && cand.finishReason) || 'none') + ')');
  return { ok: true, text };
}

// One model-level fallback, mirroring the app's default→fallback behavior:
// a 404/config failure on the primary retries ONCE on the fallback model.
async function geminiCallWithFallback(opts) {
  const first = await geminiGenerate(opts);
  if (!first.ok && first.error && first.error.isConfig && FALLBACK_MODEL && FALLBACK_MODEL !== opts.model) {
    if (opts.log) opts.log('model ' + opts.model + ' unavailable — retrying on fallback ' + FALLBACK_MODEL);
    return geminiGenerate(Object.assign({}, opts, { model: FALLBACK_MODEL }));
  }
  return first;
}

// ── Driver ──────────────────────────────────────────────────────────────────

function createDriver(options) {
  const o = options || {};
  const log = typeof o.log === 'function' ? o.log : defaultLog;
  let browser = null;
  let activeContext = null; // the in-flight run's browser context (single-flight callers only)
  let documentEpochSeq = 0; // one document-ownership epoch per run page (see newPipelinePage)

  function requireModuleFiles() {
    const missing = MODULE_FILES.filter((f) => !fs.existsSync(path.join(ASSETS_ROOT, f)));
    if (missing.length) throw new Error('Pipeline module file(s) missing from ' + ASSETS_ROOT + ': ' + missing.join(', '));
  }

  async function getBrowser() {
    if (browser) return browser;
    // resolveChromium prefers @playwright/test (the repo e2e's browser revision) and falls
    // back to the plain playwright package (what the MCPB bundle ships).
    const res = resolveChromium();
    if (!res.chromium) throw new Error('Playwright is not installed. From the AlloFlow repo run: npm install && npx playwright install chromium');
    if (!res.installed) throw new Error('The Chromium browser binary is not installed yet. Call the remediation_setup tool (one-time ~200MB download), or run: npx playwright install chromium');
    const chromium = res.chromium;
    browser = await chromium.launch({
      headless: process.env.ALLOFLOW_MCP_HEADFUL !== '1',
      // CheerpJ (the veraPDF JVM) boots via timer/rAF loops that Chromium throttles for
      // backgrounded/occluded content — in headless that throttling stalled the boot
      // indefinitely ("CheerpJ runtime ready", then silence). These flags disable it.
      args: ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
    });
    browser.on('disconnected', () => { browser = null; });
    return browser;
  }

  // ── Page rendering: the PDF as pictures ─────────────────────────────────────
  // Why this exists: MCP sampling can carry text, images and audio, but there is no PDF content
  // type. Measured on a real run (dev-tools/mcp_model_call_inventory.cjs), the calls that attach
  // the document are all INPUT UNDERSTANDING — audit it, describe its figures, read its colours,
  // find its headings — and every one of those is a question a rendered page answers. None of
  // them writes the deliverable, and the gates that carry the real guarantee (axe-core on the
  // produced HTML, veraPDF on the exported bytes) are deterministic and modelless.
  //
  // So: render the pages, send pictures, and the whole pipeline becomes transportable over model
  // access the HOST provides — no API key from the user at all.
  //
  // What it costs, stated plainly because the honesty surfaces depend on it: a picture of a page
  // cannot show a tag tree, a text layer, /Lang, /Title, or an existing /Alt. The audit of the
  // SOURCE therefore gets rougher, and its "before" score becomes an estimate from appearance.
  // The audit of the OUTPUT does not change at all.
  const PDFJS_WORKER_ASSET = 'pdf.worker.min.js';
  const RENDER_TARGET_WIDTH = Number(process.env.ALLOFLOW_MCP_PAGE_WIDTH) || 1600;
  const RENDER_MAX_PAGES = Number(process.env.ALLOFLOW_MCP_MAX_PAGE_IMAGES) || 30;

  async function renderPdfToPageImages(b64, opts) {
    const o = opts || {};
    const rlog = typeof o.onLog === 'function' ? o.onLog : log;
    const b = await getBrowser();
    const context = await b.newContext();
    try {
      const page = await context.newPage();
      await installVendorRuntime(page, { loadPdfjs: true });
      const loaded = await page.evaluate(() => !!(window.pdfjsLib && window.pdfjsLib.getDocument));
      if (!loaded) throw new Error('Could not load pdf.js from any CDN — page rendering needs it.');
      const out = await page.evaluate(async ({ b64: data, workers, targetWidth, maxPages }) => {
        for (const w of workers) { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = w; break; } catch (_) {} }
        const bin = atob(data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        const total = pdf.numPages;
        const pages = [];
        for (let n = 1; n <= Math.min(total, maxPages); n++) {
          const pg = await pdf.getPage(n);
          const base = pg.getViewport({ scale: 1 });
          const viewport = pg.getViewport({ scale: Math.min(3, Math.max(1, targetWidth / base.width)) });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          await pg.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          pages.push(canvas.toDataURL('image/png').split(',')[1] || '');
          canvas.width = 0; canvas.height = 0; // release the backing store now, not at GC
        }
        return { pages, totalPages: total };
      }, { b64, workers: [vendorAssetUrl(PDFJS_WORKER_ASSET)], targetWidth: RENDER_TARGET_WIDTH, maxPages: RENDER_MAX_PAGES });

      const bytes = out.pages.reduce((n, p) => n + Math.round(p.length * 0.75), 0);
      const truncated = out.totalPages > out.pages.length;
      rlog('rendered ' + out.pages.length + '/' + out.totalPages + ' page(s) to PNG (' + Math.round(bytes / 1024) + ' KB)'
        + (truncated ? ' — TRUNCATED at the ' + RENDER_MAX_PAGES + '-page cap' : ''));
      return { pages: out.pages, totalPages: out.totalPages, renderedPages: out.pages.length, bytes, truncated };
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  async function newPipelinePage(runOpts) {
    requireModuleFiles();
    const resolved = resolveGeminiApiKey();
    const apiKey = resolved.key;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set (and no key file was found). The remediation pipeline needs a Gemini API key — set the env var or point ALLOFLOW_MCP_ENV_PATH at an env file containing one.');
    if (resolved.source !== 'env:GEMINI_API_KEY') log('using Gemini key from ' + resolved.source);
    // Per-run log sink: job-based callers route a run's telemetry into that job's record;
    // everything still lands on the driver-level log (stderr) too via the caller's sink.
    const rlog = typeof runOpts.onLog === 'function' ? runOpts.onLog : log;
    const b = await getBrowser();
    const context = await b.newContext();
    const page = await context.newPage();
    page.on('console', (msg) => {
      const t = msg.text();
      // The pipeline's own telemetry IS the diagnostic — forward the load-bearing lines.
      if (/\[GeminiGate\]|\[Retry\]|\[PDF Fix\]|\[Tesseract\]|\[Throttle\]|API-start|Vision-start/.test(t)) rlog(t.slice(0, 500));
      else if (process.env.ALLOFLOW_MCP_VERBOSE === '1') rlog('console: ' + t.slice(0, 300));
    });
    // Web Crypto is unavailable in Chromium's opaque `about:blank` context. The canonical
    // pipeline binds verification evidence to the exact HTML with SHA-256, so boot on a
    // browser-trustworthy loopback origin. Route fulfillment keeps this entirely in-process:
    // no listener, DNS, network request, cookie scope, or document data leaves the machine.
    await installVendorRuntime(page, { loadCore: true });

    await page.exposeFunction('__mcpGeminiText', async (prompt) => {
      return geminiCallWithFallback({ apiKey, model: DEFAULT_MODEL, parts: [{ text: String(prompt) }], log: rlog });
    });
    await page.exposeFunction('__mcpGeminiVision', async (prompt, base64Data, mimeType) => {
      const mime = mimeType || 'application/pdf';
      // Image mode: swap the attached document for its rendered pages. Scoped to PDFs on purpose
      // — audio/video transcription and already-image payloads pass through untouched, since the
      // point is to remove the PDF content type, not to re-encode everything.
      const pageImages = runOpts.pageImages;
      if (pageImages && pageImages.length && mime === 'application/pdf') {
        return geminiCallWithFallback({
          apiKey, model: DEFAULT_MODEL, log: rlog,
          parts: [{ text: String(prompt) }].concat(
            pageImages.map((p) => ({ inline_data: { mime_type: 'image/png', data: p } }))
          ),
        });
      }
      return geminiCallWithFallback({
        apiKey, model: DEFAULT_MODEL, log: rlog,
        parts: [{ text: String(prompt) }, { inline_data: { mime_type: mime, data: String(base64Data || '') } }],
      });
    });
    await page.exposeFunction('__mcpProgress', async (line) => { rlog('progress: ' + String(line).slice(0, 300)); });

    for (const f of MODULE_FILES) await page.addScriptTag({ path: path.join(ASSETS_ROOT, f) });
    await page.waitForFunction(
      () => !!(window.AlloModules && window.AlloModules.VerificationPolicy && window.AlloModules.DocBuilderRenderer && window.AlloModules.createDocPipeline),
      null, { timeout: 30000 }
    );

    await page.evaluate((cfg) => {
      const w = window;
      // Host-state slot the OCR path reads (language picker parity).
      w.__docPipelineState = { pdfOcrLanguage: cfg.ocrLanguage || '', pdfDocumentEpoch: cfg.documentEpoch };
      // ── Document ownership stamp (required since the pipeline's ownership-epoch gate) ──
      // fixAndVerifyPdf refuses to start an "unstamped" run: an unowned document means a
      // completion could be attributed to a document that was swapped mid-run. In the app the
      // epoch is republished every time the teacher selects a new file. Here the invariant is
      // stronger and structural — withRunPage gives every run its own browser context holding
      // exactly ONE document for its whole lifetime — so the run IS the ownership scope and we
      // stamp it once at page setup. Published on the authoritative global (the pipeline treats
      // __alloPdfDocumentEpoch as final and deliberately will NOT fall back past it), which also
      // puts the epoch on the run's telemetry and warning envelopes.
      w.__alloPdfDocumentEpoch = cfg.documentEpoch;
      const rethrow = (envelope) => {
        const err = new Error(envelope && envelope.message ? envelope.message : 'Gemini call failed');
        if (envelope) {
          ['isQuota', 'isAuth', 'isConfig', 'originalMessage', 'classification'].forEach((k) => {
            if (envelope[k] !== undefined) err[k] = envelope[k];
          });
        }
        throw err;
      };
      const callGemini = async (prompt) => {
        const r = await w.__mcpGeminiText(String(prompt));
        if (!r.ok) rethrow(r.error);
        return r.text;
      };
      const callGeminiVision = async (prompt, base64Data, mimeType) => {
        const r = await w.__mcpGeminiVision(String(prompt), base64Data || '', mimeType || 'application/pdf');
        if (!r.ok) rethrow(r.error);
        return r.text;
      };
      w.__mcpPipeline = w.AlloModules.createDocPipeline({
        callGemini,
        callGeminiVision,
        callImagen: async () => null,
        addToast: (m) => { try { w.__mcpProgress('toast: ' + m); } catch (_) {} },
        t: (k) => k,
        isRtlLang: () => false,
        updateExportPreview: () => {},
        getDefaultTitle: () => cfg.fileName || 'Document',
        state: {},
      });
    }, { ocrLanguage: runOpts.ocrLanguage || '', fileName: runOpts.fileName || '', documentEpoch: ++documentEpochSeq });

    return { page, context };
  }

  function readPdfBase64(filePath) {
    const bytes = fs.readFileSync(filePath);
    if (bytes.length < 5 || bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
      throw new Error('Not a PDF (missing %PDF- header): ' + filePath);
    }
    return bytes.toString('base64');
  }

  // PDF, DOCX, or PPTX — the pipeline's audit + extraction phases sniff the kind from the
  // fileName they already receive (office files get the deterministic mammoth/pptx route).
  function readDocBase64(filePath) {
    if (/\.pdf$/i.test(filePath)) return readPdfBase64(filePath);
    const bytes = fs.readFileSync(filePath);
    if (/\.(docx|pptx)$/i.test(filePath)) {
      if (bytes.length < 4 || bytes.subarray(0, 2).toString('latin1') !== 'PK') {
        throw new Error('Not a valid Office file (missing ZIP header): ' + filePath);
      }
      return bytes.toString('base64');
    }
    throw new Error('Unsupported file type (need .pdf, .docx, or .pptx): ' + filePath);
  }

  // Rendered ONCE per run, before the pipeline page exists, rather than lazily inside the vision
  // bridge: rendering needs its own page, and calling back into the browser from a handler the
  // page is already awaiting is how you get a deadlock.
  async function prepareVisionMode(runOpts) {
    if (runOpts.visionMode !== 'images') return runOpts;
    if (!/\.pdf$/i.test(runOpts.fileName || '')) {
      (runOpts.onLog || log)('vision mode "images" ignored — page rendering applies to PDFs only');
      return runOpts;
    }
    const rendered = await renderPdfToPageImages(runOpts.base64ForRender, { onLog: runOpts.onLog });
    return Object.assign({}, runOpts, { pageImages: rendered.pages, renderReport: rendered });
  }

  async function withRunPage(runOptsIn, fn) {
    const runOpts = await prepareVisionMode(runOptsIn);
    const maxMs = Math.max(60000, (Number(runOpts.maxRunMinutes) || Number(process.env.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30) * 60000);
    const { page, context } = await newPipelinePage(runOpts);
    activeContext = context;
    let timer = null;
    try {
      return await Promise.race([
        fn(page),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Run exceeded the ' + Math.round(maxMs / 60000) + '-minute wall clock and was stopped. Partial console telemetry is on stderr.')), maxMs); }),
      ]);
    } finally {
      clearTimeout(timer);
      if (activeContext === context) activeContext = null;
      try { await context.close(); } catch (_) {}
    }
  }

  // Best-effort cancel of the in-flight run: closing its browser context makes the run's
  // page.evaluate reject immediately, and with it every queued/in-flight Gemini bridge call.
  // Page-per-run isolation means nothing else is affected. Returns false when idle.
  async function cancelActiveRun() {
    const c = activeContext;
    if (!c) return false;
    activeContext = null;
    try { await c.close(); } catch (_) {}
    return true;
  }

  async function audit(opts) {
    const fileName = path.basename(opts.filePath);
    const b64 = readDocBase64(opts.filePath);
    (opts.onLog || log)('audit: ' + fileName + ' (' + Math.round(b64.length * 0.75 / 1024) + ' KB)');
    return withRunPage(Object.assign({ fileName, base64ForRender: b64 }, opts), (page) =>
      page.evaluate(async ({ b64, fileName, auditorCount }) => {
        const a = await window.__mcpPipeline.runPdfAccessibilityAudit(b64, { skipUiUpdates: true, skipCache: true, fileName, auditorCount });
        return {
          score: a && typeof a.score === 'number' ? a.score : null,
          summary: (a && a.summary) || '',
          documentLanguage: (a && a.documentLanguage) || null,
          isScanned: !!(a && a.isScanned),
          hasSearchableText: a ? a.hasSearchableText !== false : null,
          pageCount: (a && a.pageCount) || null,
          issueCounts: {
            critical: ((a && a.critical) || []).length,
            serious: ((a && a.serious) || []).length,
            moderate: ((a && a.moderate) || []).length,
            minor: ((a && a.minor) || []).length,
          },
          issues: ['critical', 'serious', 'moderate', 'minor'].flatMap((sev) =>
            ((a && a[sev]) || []).slice(0, 40).map((i) => ({ severity: sev, issue: i.issue || i.description || i.text || '', wcag: i.wcag || '', location: i.location || '' }))
          ),
          auditCoverage: {
            configuredAuditorCap: auditorCount,
            requestedAuditors: Number.isSafeInteger(a && a.requestedAuditors) ? a.requestedAuditors : null,
            completedAuditors: Number.isSafeInteger(a && a.auditorCount) ? a.auditorCount : null,
            sliced: !!(a && a._slicedAudit),
          },
          _fullAudit: a,
        };
      }, { b64, fileName, auditorCount: HEADLESS_AUDITOR_COUNT })
    );
  }

  async function remediate(opts) {
    loadVendorBundle();
    const fileName = path.basename(opts.filePath);
    const b64 = readDocBase64(opts.filePath);
    const _isPdfInput = /\.pdf$/i.test(fileName);
    (opts.onLog || log)('remediate: ' + fileName + ' (' + Math.round(b64.length * 0.75 / 1024) + ' KB, target ' + (opts.targetScore || 95) + ')');
    return withRunPage(Object.assign({ fileName, base64ForRender: b64 }, opts), (page) =>
      page.evaluate(async ({ b64, fileName, targetScore, fixPasses, polishPasses, wantTaggedPdf, wantAutoContinue, autoContinueRounds, pdfLibCdn, auditorCount }) => {
        const pipeline = window.__mcpPipeline;
        const progress = (stage, msg) => { try { window.__mcpProgress(stage + ' — ' + msg); } catch (_) {} };
        const loopPolicy = window.AlloModules
          && window.AlloModules.createDocPipeline
          && window.AlloModules.createDocPipeline.loopPolicy;
        if (typeof pipeline.isLiveVerificationHtmlBound !== 'function'
          || typeof pipeline.rehydrateVerificationHtmlBinding !== 'function') {
          throw new Error('Canonical verification binding is unavailable.');
        }
        if (wantAutoContinue && (
          !loopPolicy
          || typeof loopPolicy.roundProgressed !== 'function'
          || typeof loopPolicy.roundRegressed !== 'function'
        )) {
          throw new Error('Canonical remediation loop policy is unavailable.');
        }
        progress('audit', 'opening accessibility audit');
        const audit = await pipeline.runPdfAccessibilityAudit(b64, { skipUiUpdates: true, skipCache: true, fileName, auditorCount });
        progress('audit', 'before-score ' + (audit && audit.score));
        const result = await pipeline.fixAndVerifyPdf({
          base64: b64, fileName, auditResult: audit,
          targetScore: targetScore, autoFixPasses: fixPasses, polishPasses: polishPasses, auditorCount,
          onProgress: (step, msg) => progress('fix', (typeof step === 'number' ? 'step ' + step + ': ' : '') + (msg || '')),
        });
        // ── AUTO-CONTINUE (#6-full payoff): the SAME improvement loop the app runs, merging every
        // accepted round through the ONE canonical reducer (finalizeRemediationRound) — so the
        // connector and the app can never disagree about what a round means. Branch fidelity
        // mirrors the host: axe violations → deterministic autoFixAxeViolations; AI-flagged
        // issues (+ Equal-Access-confirmed lines, finding 7) → aiFixChunked; nothing fixable but
        // verification incomplete → ONE audit-only evidence refresh. Loop POLICY mirrors the host
        // too: wait-not-stop calm gate per round, noise-aware revert on a REAL deterministic
        // regression (the reducer's _detScore), two-stall abandon.
        let cur = result;
        if (cur && typeof cur.accessibleHtml === 'string') {
          cur = await pipeline.rehydrateVerificationHtmlBinding(cur);
        }
        let roundsRun = 0;
        const roundLog = [];
        if (wantAutoContinue && cur && typeof cur.accessibleHtml === 'string') {
          const isComplete = (r) => r.verificationState === 'complete' && r.afterScoreVerified === true && !r.requiresManualReview && pipeline.isLiveVerificationHtmlBound(r, r.accessibleHtml);
          let lastViolations = Infinity;
          let lastDet = -1;
          let lastIssues = Infinity;
          let stagnant = 0;
          for (let round = 0; round < autoContinueRounds; round++) {
            if ((cur.afterScore || 0) >= targetScore && isComplete(cur)) break;
            const _vio = (cur.axeAudit && cur.axeAudit.totalViolations) || 0;
            const _aiIssues = (cur.verificationAudit && Array.isArray(cur.verificationAudit.issues)) ? cur.verificationAudit.issues : [];
            const _eaFails = (cur.secondEngineAudit && (cur.secondEngineAudit.failViolations
              || (Array.isArray(cur.secondEngineAudit.fails) ? cur.secondEngineAudit.fails.length : 0))) || 0;
            const auditOnly = _vio === 0 && _aiIssues.length === 0 && _eaFails === 0 && !isComplete(cur);
            const _curAxe = (cur.axeAudit && typeof cur.axeAudit.score === 'number') ? cur.axeAudit.score : null;
            const _curEa = (cur.secondEngineAudit && typeof cur.secondEngineAudit.score === 'number') ? cur.secondEngineAudit.score : null;
            const _curDet = (typeof cur._detScore === 'number') ? cur._detScore
              : ((_curAxe !== null) ? (_curEa !== null ? Math.min(_curAxe, _curEa) : _curAxe) : _curEa);
            const _progressed = loopPolicy.roundProgressed({
              violations: _vio, prevViolations: lastViolations,
              newDet: _curDet, prevDet: lastDet,
              newIssues: _aiIssues.length, prevIssues: lastIssues,
            });
            if (!_progressed) { stagnant++; if (stagnant >= 2) break; } else stagnant = 0;
            lastViolations = _vio;
            lastDet = _curDet;
            lastIssues = _aiIssues.length;
            if (auditOnly) {
              const _cov = cur.verificationCoverage || {};
              const _eaDead = typeof pipeline.equalAccessUnavailable === 'function' && pipeline.equalAccessUnavailable();
              if (_eaDead && _cov.ai === 'complete' && _cov.axe === 'complete' && _cov.equalAccess !== 'complete') {
                roundLog.push('verification refresh skipped: Equal Access is unavailable in this environment');
                break;
              }
            }
            try { await pipeline.waitForGeminiCalm({ maxWaitMs: 120000 }); } catch (_) {}
            progress('auto-continue', 'round ' + (round + 1) + '/' + autoContinueRounds + ' — ' +
              (auditOnly ? 'verification refresh (no rewrite)' : (_vio > 0 ? _vio + ' axe violation(s)' : _aiIssues.length + ' AI-flagged issue(s)')) +
              ', score ' + (cur.afterScore || 0) + '/' + targetScore);
            roundsRun = round + 1;
            let roundOut;
            try {
              if (_vio > 0) {
                roundOut = await pipeline.autoFixAxeViolations(cur.accessibleHtml, cur.axeAudit, fixPasses);
              } else if (auditOnly) {
                let _refreshAxe = null;
                try { _refreshAxe = await pipeline.runAxeAudit(cur.accessibleHtml); } catch (_) {}
                roundOut = { html: cur.accessibleHtml, axe: _refreshAxe, passes: 0, _auditOnly: true };
              } else {
                const _eaLines = ((cur.secondEngineAudit && Array.isArray(cur.secondEngineAudit.fails)) ? cur.secondEngineAudit.fails : []).slice(0, 15)
                  .map((f) => 'EQUAL-ACCESS-CONFIRMED: ' + String((f && (f.message || f.ruleId || f.reasonId)) || JSON.stringify(f)).slice(0, 200));
                const _instr = _aiIssues.slice(0, 25).map((i) => 'AI-FLAGGED: ' + (typeof i === 'string' ? i : (i.issue || i.description || JSON.stringify(i)))).concat(_eaLines).join('\n');
                let _fixedHtml = await pipeline.aiFixChunked(cur.accessibleHtml, _instr, 'mcp-auto-continue-round-' + (round + 1));
                const _hasContrast = _aiIssues.some((i) => { const _s = (typeof i === 'string') ? i : (((i.wcag || '') + ' ' + (i.issue || i.description || ''))); return /1\.4\.3|contrast/i.test(_s); });
                if (_hasContrast) { try { const _sr = pipeline.sanitizeStyleForWCAG(_fixedHtml); if (_sr && _sr.html && _sr.fixCount > 0) _fixedHtml = _sr.html; } catch (_) {} }
                let _axe = null;
                try { _axe = await pipeline.runAxeAudit(_fixedHtml); } catch (_) {}
                roundOut = { html: _fixedHtml, axe: _axe, passes: 1 };
              }
            } catch (e) { roundLog.push('round ' + (round + 1) + ' failed: ' + ((e && e.message) || e)); break; }
            if (!roundOut || typeof roundOut.html !== 'string' || !roundOut.html) { roundLog.push('round ' + (round + 1) + ': no output — stopping'); break; }
            const reVerify = await pipeline.auditOutputAccessibility(roundOut.html).catch(() => null);
            if (!reVerify) { roundLog.push('round ' + (round + 1) + ': re-verification unavailable — keeping prior state'); break; }
            let _ea = null;
            try { _ea = await pipeline.runEqualAccessAudit(roundOut.html); } catch (_) {}
            let _roundIR = cur.issueResolution;
            try { const _r = pipeline.recomputeIssueResolution(cur.issueResolution, reVerify); if (_r) _roundIR = _r; } catch (_) {}
            let _plainText = null;
            try { _plainText = pipeline.htmlToPlainText(roundOut.html); } catch (_) {}
            let merged;
            try {
              merged = await pipeline.finalizeRemediationRound(cur, {
                html: roundOut.html, aiAudit: reVerify, axeAudit: roundOut.axe, eaAudit: _ea,
                auditOnly: !!roundOut._auditOnly, sourceText: cur.sourceText, issueResolution: _roundIR,
                plainText: _plainText, passes: roundOut.passes || 0,
                chunkState: roundOut.chunkState, chunkWeightedScore: roundOut.chunkWeightedScore,
              });
              merged = await pipeline.rehydrateVerificationHtmlBinding(merged);
            } catch (e) { roundLog.push('round ' + (round + 1) + ' merge failed: ' + ((e && e.message) || e)); break; }
            const _det = merged._detScore;
            const _regressed = loopPolicy.roundRegressed({
              newDet: _det, prevDet: _curDet, violations: _vio,
              newIssues: reVerify.issues ? reVerify.issues.length : 0, prevIssues: _aiIssues.length,
            });
            if (!roundOut._auditOnly && _regressed) {
              roundLog.push('round ' + (round + 1) + ' REVERTED (det ' + _det + ' vs ' + _curDet + ', issues ' + (reVerify.issues ? reVerify.issues.length : 0) + ' vs ' + _aiIssues.length + ')');
              continue;
            }
            roundLog.push('round ' + (round + 1) + ' accepted: score ' + (cur.afterScore || 0) + ' → ' + (merged.afterScore || 0) + ' (det ' + _det + ', state ' + merged.verificationState + ')');
            cur = merged;
            if (roundOut._auditOnly) break; // evidence refresh is deliberately single-shot
          }
        }
        let verdict = null;
        let taggedPdfB64 = null, taggedPdfError = null, taggedPdfDelivery = null, taggedPdfExportMode = null;
        let activeContentDetected = false;
        let activeContentScanVerified = false;
        if (wantTaggedPdf) {
          try {
            if (typeof pipeline.taggedPdfDeliveryVerdict !== 'function') {
              throw new Error('Canonical tagged-PDF safety gates are unavailable.');
            }
            const activeScan = cur && cur.activeContent;
            const activeTypes = new Set([
              'open-action',
              'javascript',
              'launch',
              'embedded-files',
              'additional-actions',
              'other-actions',
              'multimedia',
            ]);
            const scanFindings = activeScan && activeScan.findings;
            const findingsValid = Array.isArray(scanFindings) && scanFindings.every((finding) =>
              finding && typeof finding === 'object'
              && activeTypes.has(finding.type)
              && Number.isSafeInteger(finding.count)
              && finding.count > 0
              && typeof finding.label === 'string');
            if (!activeScan || activeScan.schema !== 1 || activeScan.complete !== true
              || activeScan.pageScanFailures !== 0 || typeof activeScan.any !== 'boolean'
              || activeScan.unexaminedStructures !== 0
              || !findingsValid || activeScan.any !== (scanFindings.length > 0)
              || !Number.isSafeInteger(activeScan.externalLinks) || activeScan.externalLinks < 0) {
              throw new Error('active_content_scan_unavailable');
            }
            activeContentScanVerified = true;
            activeContentDetected = activeScan.any;
            if (activeContentDetected) throw new Error('active_content_requires_review');
            taggedPdfExportMode = 'original_layout';
            let artifactVerdict = null;
            try {
              verdict = pipeline.distributionVerdict(cur, { targetScore });
              artifactVerdict = verdict;
            } catch (_) { verdict = null; artifactVerdict = null; }
            if (!artifactVerdict || artifactVerdict.level === 'review') {
              throw new Error(artifactVerdict ? 'distribution_review_required' : 'distribution_verdict_unavailable');
            }
            progress('tag', 'building tagged PDF');
            if (!(window.PDFLib && window.PDFLib.PDFDocument)) {
              await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = pdfLibCdn; s.onload = res; s.onerror = () => rej(new Error('pdf-lib local asset load failed'));
                document.head.appendChild(s);
              });
            }
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const tagOptions = {
              title: fileName.replace(/\.pdf$/i, ''),
              lang: (cur && cur.documentLanguage) || (audit && audit.documentLanguage) || 'en',
              subject: 'Remediated for accessibility by AlloFlow',
            };
            const tagged = await pipeline.createTaggedPdf(bytes, cur, tagOptions);
            const outBytes = tagged && (tagged.bytes || tagged);
            const delivery = pipeline.taggedPdfDeliveryVerdict(tagged);
            taggedPdfDelivery = delivery && typeof delivery === 'object'
              ? { ok: delivery.ok === true, code: String(delivery.code || '') }
              : { ok: false, code: 'delivery-verdict-unavailable' };
            if (outBytes && outBytes.length && taggedPdfDelivery.ok) {
              let ob = ''; const CH = 0x8000;
              for (let i = 0; i < outBytes.length; i += CH) ob += String.fromCharCode.apply(null, Array.from(outBytes.subarray(i, i + CH)));
              taggedPdfB64 = btoa(ob);
              verdict = artifactVerdict;
            } else taggedPdfError = outBytes && outBytes.length ? 'tagged_pdf_delivery_unverified' : 'createTaggedPdf returned no bytes';
          } catch (e) { taggedPdfError = (e && e.message) || String(e); }
        }
        if (!verdict) { try { verdict = pipeline.distributionVerdict(cur, { targetScore }); } catch (_) { verdict = null; } }
        const stats = (() => { try { return pipeline.getPipelineStats(); } catch (_) { return null; } })();
        return {
          beforeScore: audit && typeof audit.score === 'number' ? audit.score : null,
          afterScore: cur ? (typeof cur.afterScore === 'number' ? cur.afterScore : null) : null,
          verdict,
          aiVerificationIncomplete: !!(cur && cur._aiVerificationIncomplete),
          scoreSource: (cur && cur._scoreSource) || null,
          estimatedMinimumScore: (cur && cur._estimatedMinimumScore) !== undefined ? cur._estimatedMinimumScore : null,
          integrityCoverage: (cur && cur.integrityCoverage) !== undefined ? cur.integrityCoverage : null,
          integrityWarning: (cur && cur.integrityWarning) || null,
          fidelityNotes: ((cur && cur.fidelityNotes) || []).map((n) => ({ kind: n.kind, msg: (n.msg || n.message || '').slice(0, 400) })),
          verificationState: (cur && cur.verificationState) || null,
          verificationHtmlBound: !!(cur && typeof pipeline.isLiveVerificationHtmlBound === 'function' && pipeline.isLiveVerificationHtmlBound(cur, cur.accessibleHtml)),
          remainingAxeViolations: (cur && cur.axeAudit && Number.isSafeInteger(cur.axeAudit.totalViolations) && cur.axeAudit.totalViolations >= 0) ? cur.axeAudit.totalViolations : null,
          remainingEqualAccessFailures: (cur && cur.secondEngineAudit && Number.isSafeInteger(cur.secondEngineAudit.failViolations) && cur.secondEngineAudit.failViolations >= 0)
            ? cur.secondEngineAudit.failViolations : null,
          runId: (cur && (cur.runId || cur._runId)) || null,
          autoContinue: wantAutoContinue ? { roundsRun, log: roundLog } : undefined,
          auditCoverage: {
            configuredAuditorCap: auditorCount,
            requestedAuditors: Number.isSafeInteger(audit && audit.requestedAuditors) ? audit.requestedAuditors : null,
            completedAuditors: Number.isSafeInteger(audit && audit.auditorCount) ? audit.auditorCount : null,
            sliced: !!(audit && audit._slicedAudit),
          },
          accessibleHtml: (cur && cur.accessibleHtml) || null,
          taggedPdfB64, taggedPdfError, taggedPdfDelivery, taggedPdfExportMode,
          activeContentScanVerified, activeContentDetected,
          stats: stats ? { apiCalls: stats.apiCalls, visionCalls: stats.visionCalls, retries: stats.retries, recoveredRetries: stats.recoveredRetries, authThrottles: stats.authThrottles, terminalFailures: stats.terminalFailures } : null,
        };
      }, {
        b64, fileName,
        targetScore: Number(opts.targetScore) || 95,
        fixPasses: Number.isFinite(Number(opts.fixPasses)) ? Number(opts.fixPasses) : 2,
        polishPasses: Number.isFinite(Number(opts.polishPasses)) ? Number(opts.polishPasses) : 0,
        // Tagged-PDF export is a PDF-in → PDF-out artifact; for DOCX/PPTX inputs the
        // accessible HTML is the deliverable (matches the app).
        wantTaggedPdf: opts.taggedPdf !== false && _isPdfInput,
        wantAutoContinue: !!opts.autoContinue,
        autoContinueRounds: Math.max(1, Math.min(5, Number(opts.autoContinueRounds) || 3)),
        pdfLibCdn: vendorAssetUrl('pdf-lib.min.js'),
        auditorCount: HEADLESS_AUDITOR_COUNT,
      })
    );
  }

  // Loopback static server for verapdf/ with REAL Range (206) support — see VERAPDF_URL_OVERRIDE.
  let verapdfServer = null;
  function getVerapdfUrl() {
    if (VERAPDF_URL_OVERRIDE) return Promise.resolve(VERAPDF_URL_OVERRIDE);
    if (verapdfServer) return Promise.resolve('http://127.0.0.1:' + verapdfServer.address().port + '/verapdf/verapdf_validator.html');
    const http = require('http');
    const rootDir = path.join(ASSETS_ROOT, 'verapdf');
    if (!fs.existsSync(path.join(rootDir, 'verapdf_validator.html'))) {
      return Promise.reject(new Error('verapdf/verapdf_validator.html not found in the repo — cannot serve the validator locally.'));
    }
    return new Promise((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        try {
          const u = decodeURIComponent((req.url || '/').split('?')[0]);
          const rel = u.replace(/^\/verapdf\//, '').replace(/[\\/]|\.\./g, ''); // flat dir; no traversal
          const f = path.join(rootDir, rel);
          if (!u.startsWith('/verapdf/') || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
          const size = fs.statSync(f).size;
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Content-Type', f.endsWith('.html') ? 'text/html; charset=utf-8' : (f.endsWith('.jar') ? 'application/java-archive' : 'application/octet-stream'));
          const m = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (req.method === 'HEAD') { res.writeHead(200, { 'Content-Length': size }); res.end(); return; }
          if (m && (m[1] || m[2])) {
            const start = m[1] ? parseInt(m[1], 10) : Math.max(0, size - parseInt(m[2], 10));
            const end = (m[1] && m[2]) ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
            if (!(start >= 0 && start <= end && end < size)) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }); res.end(); return; }
            res.writeHead(206, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': end - start + 1 });
            fs.createReadStream(f, { start, end }).pipe(res);
          } else {
            res.writeHead(200, { 'Content-Length': size });
            fs.createReadStream(f).pipe(res);
          }
        } catch (_) { try { res.writeHead(500); res.end(); } catch (_2) {} }
      });
      srv.on('error', reject);
      srv.listen(0, '127.0.0.1', () => {
        verapdfServer = srv;
        resolve('http://127.0.0.1:' + srv.address().port + '/verapdf/verapdf_validator.html');
      });
    });
  }

  // Offline PDF/UA-1 validation for the remote runner. The browser validator above is kept for
  // local interactive use, but it needs CheerpJ/CDN resources. Production calls the pinned
  // veraPDF CLI JAR directly through Java so no document bytes or executable dependencies leave
  // the container. Only bounded counts/status are returned to the caller.
  async function validatePdfUaCli(opts) {
    const o = opts || {};
    const filePath = path.resolve(String(o.filePath || ''));
    const jarPath = path.resolve(process.env.ALLOFLOW_MCP_VERAPDF_CLI || path.join(ASSETS_ROOT, 'verapdf', 'verapdf-cli.jar'));
    const stat = fs.statSync(filePath, { throwIfNoEntry: false });
    if (!stat || !stat.isFile()) throw new Error('veraPDF input is not a regular file');
    if (stat.size < 5 || stat.size > (Number(o.maxBytes) || 50 * 1024 * 1024)) throw new Error('veraPDF input is outside the bounded size range');
    const fd = fs.openSync(filePath, 'r');
    try {
      const head = Buffer.alloc(5); fs.readSync(fd, head, 0, 5, 0);
      if (head.toString('latin1') !== '%PDF-') throw new Error('veraPDF input is not a PDF');
    } finally { fs.closeSync(fd); }
    if (!fs.existsSync(jarPath)) throw new Error('veraPDF CLI JAR is not packaged: ' + jarPath);
    const timeoutMs = Math.max(1000, Math.min(300000, Number(o.timeoutMs) || 120000));
    const javaBin = process.env.ALLOFLOW_MCP_JAVA_BIN || 'java';
    const args = ['-jar', jarPath, '--format', 'json', '--flavour', 'ua1', '--maxfailuresdisplayed', '25', '--loglevel', '1', filePath];
    const signal = o.signal;
    return new Promise((resolve, reject) => {
      const child = require('child_process').spawn(javaBin, args, { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
      let stdout = '';
      let timer = null;
      let settled = false;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (signal && typeof signal.removeEventListener === 'function') signal.removeEventListener('abort', onAbort);
      };
      const finish = (fn, value) => { if (settled) return; settled = true; cleanup(); fn(value); };
      const onAbort = () => { try { child.kill(); } catch (_) {} finish(reject, new Error('veraPDF validation cancelled')); };
      if (signal && signal.aborted) return onAbort();
      if (signal && typeof signal.addEventListener === 'function') signal.addEventListener('abort', onAbort, { once: true });
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
        if (stdout.length > 4 * 1024 * 1024) { try { child.kill(); } catch (_) {} finish(reject, new Error('veraPDF output exceeded the bounded limit')); }
      });
      child.on('error', (error) => finish(reject, new Error('veraPDF CLI could not start: ' + error.message)));
      child.on('close', (code) => {
        if (settled) return;
        let parsed;
        try { parsed = JSON.parse(stdout); } catch (_) {
          return finish(reject, new Error('veraPDF CLI returned no valid JSON (exit ' + code + ')'));
        }
        const report = parsed && parsed.report;
        const job = report && Array.isArray(report.jobs) ? report.jobs[0] : null;
        const validation = job && Array.isArray(job.validationResult) ? job.validationResult[0] : null;
        const details = validation && validation.details;
        if (!validation || !details || typeof validation.compliant !== 'boolean') {
          return finish(reject, new Error('veraPDF CLI returned an incomplete validation result'));
        }
        const releases = report && report.buildInformation && Array.isArray(report.buildInformation.releaseDetails)
          ? report.buildInformation.releaseDetails : [];
        const core = releases.find((item) => item && item.id === 'core');
        const count = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000 ? value : 0;
        const safeText = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
        const failedRuleSummaries = (Array.isArray(details.ruleSummaries) ? details.ruleSummaries : [])
          .filter((item) => item && item.ruleStatus === 'FAILED')
          .slice(0, 25)
          .map((item) => ({
            specification: safeText(item.specification, 64),
            clause: safeText(item.clause, 32),
            testNumber: count(item.testNumber),
            description: safeText(item.description, 400),
            failedChecks: count(item.failedChecks),
          }));
        finish(resolve, {
          status: validation.compliant ? 'compliant' : 'noncompliant',
          validator: 'veraPDF', profile: 'ua1', validatorVersion: core && typeof core.version === 'string' ? core.version : null,
          failedRules: count(details.failedRules), failedChecks: count(details.failedChecks),
          passedRules: count(details.passedRules), passedChecks: count(details.passedChecks),
          failedRuleSummaries,
        });
      });
      timer = setTimeout(() => { try { child.kill(); } catch (_) {} finish(reject, new Error('veraPDF validation timed out')); }, timeoutMs);
      timer.unref?.();
    });
  }

  // Independent PDF/UA-1 (ISO 14289-1) validation via the SAME in-browser veraPDF the app
  // uses: the validator page boots a real JVM (CheerpJ) and accepts postMessage
  // {verapdf-validate, bytes} → replies {verapdf-result} to ev.source. We load it TOP-LEVEL
  // and post to our own window (the reply comes straight back) — an about:blank host with a
  // loopback IFRAME is silently blocked by Chromium's Private Network Access rules, and
  // readiness is visible in the page's own #status line. Needs NO Gemini key and touches NO
  // pipeline globals, so it runs in its own context OUTSIDE the single-flight lane and
  // deliberately never occupies activeContext (a job cancel must not kill a validation).
  async function validatePdfUa(opts) {
    const rlog = typeof opts.onLog === 'function' ? opts.onLog : log;
    const fileName = path.basename(opts.filePath);
    const b64 = readPdfBase64(opts.filePath);
    rlog('veraPDF: validating ' + fileName + ' (' + Math.round(b64.length * 0.75 / 1024) + ' KB; JVM boot typically 40-90s cold)');
    const b = await getBrowser();
    const validatorUrl = await getVerapdfUrl();
    // CheerpJ's boot occasionally races itself ("Java code still running") — observed ~1 in 3
    // cold boots headless. A fresh page reliably recovers, so one retry is part of the contract.
    let lastErr = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (attempt > 1) rlog('veraPDF: boot hiccup (' + String(lastErr && lastErr.message).slice(0, 120) + ') — retrying on a fresh page');
      try {
        return await _validateOnFreshPage(b, validatorUrl, b64, rlog);
      } catch (e) {
        lastErr = e;
        if (!/Java code still running|not ready within|Boot failed/i.test(String(e && e.message))) throw e;
      }
    }
    throw lastErr;
  }

  async function _validateOnFreshPage(b, validatorUrl, b64, rlog) {
    const context = await b.newContext();
    const page = await context.newPage();
    if (process.env.ALLOFLOW_MCP_VERBOSE === '1') page.on('console', (m) => rlog('verapdf console: ' + m.text().slice(0, 300)));
    try {
      await page.goto(validatorUrl, { waitUntil: 'domcontentloaded' });
      const result = await page.evaluate(({ b64, bootMs, validateMs }) => new Promise((resolve, reject) => {
        const t0 = Date.now();
        window.addEventListener('message', (ev) => {
          const d = ev.data || {};
          if (d.type === 'verapdf-result') {
            if (d.error) reject(new Error('veraPDF: ' + d.error));
            else resolve(d.result);
          }
        });
        (function waitReady() {
          const s = ((document.getElementById('status') || {}).textContent) || '';
          if (/✅/.test(s)) {
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            setTimeout(() => reject(new Error('veraPDF validation timed out after ' + Math.round(validateMs / 1000) + 's')), validateMs);
            window.postMessage({ type: 'verapdf-validate', bytes }, '*');
            return;
          }
          if (/❌/.test(s)) { reject(new Error('veraPDF boot failed: ' + s.slice(0, 200))); return; }
          if (Date.now() - t0 > bootMs) { reject(new Error('veraPDF validator not ready within ' + Math.round(bootMs / 1000) + 's — last status: ' + s.slice(0, 150))); return; }
          setTimeout(waitReady, 1000);
        })();
      }), { b64, bootMs: 180000, validateMs: 240000 });
      rlog('veraPDF: ' + (result && result.compliant ? 'COMPLIANT' : (result ? result.failedChecks + ' failed check(s) across ' + (result.failedRules || []).length + ' rule(s)' : 'no result')));
      return result;
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  // ── Self-test: does this install actually REMEDIATE, not merely have the parts? ──────────
  // remediation_capabilities answers "are the pieces present" (key, Chromium, module files). It
  // answered `ready: true` for an install where every single run died at the pipeline's
  // ownership-epoch gate, because presence is not function. This runs the REAL pipeline, in the
  // REAL browser, over the REAL fixAndVerifyPdf — against a scripted loopback model, so it needs
  // NO Gemini key and spends NO quota — and reports which stage broke.
  //
  // It is deliberately a CANARY for connector-vs-pipeline drift: the scripted replies below must
  // satisfy the pipeline's current strict-parse contract, so when the pipeline hardens again this
  // goes red and names the stage instead of every real run failing mysteriously. A red self-test
  // means the connector is out of date with the pipeline it ships beside, which is exactly the
  // failure the two 2026-07-28 bugs were.
  const SELFTEST_MARKER = 'AlloFlow connector self test document';

  // A minimal but genuinely valid single-page PDF, built here rather than shipped as a fixture:
  // the MCPB bundle carries server/ and assets/ only, never tests/, so a file dependency would
  // make the self-test work in the repo and not in the thing users install.
  function buildSelfTestPdf() {
    const body = 'BT /F1 16 Tf 72 700 Td (' + SELFTEST_MARKER + ') Tj ET\n';
    const objs = [
      null,
      '<</Type/Catalog/Pages 2 0 R>>',
      '<</Type/Pages/Kids[3 0 R]/Count 1>>',
      '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
      '<</Length ' + Buffer.byteLength(body, 'latin1') + '>>\nstream\n' + body + 'endstream',
      '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
    ];
    let out = '%PDF-1.4\n';
    const offsets = [];
    for (let i = 1; i < objs.length; i++) {
      offsets[i] = Buffer.byteLength(out, 'latin1');
      out += i + ' 0 obj\n' + objs[i] + '\nendobj\n';
    }
    const xrefStart = Buffer.byteLength(out, 'latin1');
    out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (let i = 1; i < objs.length; i++) out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    out += 'trailer\n<</Size ' + objs.length + '/Root 1 0 R>>\nstartxref\n' + xrefStart + '\n%%EOF\n';
    return Buffer.from(out, 'latin1');
  }

  // Scripted model replies. Shape is pinned by the pipeline's own prompt skeletons — issues need
  // ruleId/claimKind/count, replies need confidence + the document-metadata booleans — because
  // _parseStrictInitialAudit / _requireStrictOutputAudit discard anything less as "no evidence".
  const SELFTEST_AUDIT_PDF = JSON.stringify({
    score: 70, summary: 'self-test scripted PDF audit', confidence: 'high', documentLanguage: 'en',
    pageCount: 1, hasSearchableText: true, hasImages: false, hasTables: false, hasForms: false,
    critical: [],
    serious: [{ ruleId: 'document-title', claimKind: 'absence', issue: 'The document has no title entry.', wcag: '2.4.2', count: 1, location: 'document' }],
    moderate: [], minor: [], passes: ['document has a language'],
  });
  const SELFTEST_AUDIT_HTML = JSON.stringify({
    score: 80, summary: 'self-test scripted HTML audit',
    issues: [{ ruleId: 'document-title', claimKind: 'absence', issue: 'The document has no title entry.', wcag: '2.4.2', count: 1 }],
    passes: ['document has a language'],
  });

  function selfTestReply(prompt) {
    if (/Reply with exactly: OK/.test(prompt)) return 'OK';
    if (/accessibility auditor for educational documents/i.test(prompt) || /SLICE CONTEXT/i.test(prompt)) return SELFTEST_AUDIT_PDF;
    if (/Audit this HTML/i.test(prompt)) return SELFTEST_AUDIT_HTML;
    if (/Return ONLY a JSON array/i.test(prompt)) return JSON.stringify([{ type: 'h1', text: SELFTEST_MARKER, id: 'self-test' }]);
    if (/Extract ALL text content/i.test(prompt)) return '# ' + SELFTEST_MARKER;
    // HTML-expecting prompts say so explicitly, and several ALSO contain the word "JSON" (as in
    // "do NOT wrap in JSON") — so they must be claimed before the generic JSON rules below.
    if (/raw HTML only|do NOT wrap in JSON|Return the COMPLETE fixed HTML|Return ONLY the fixed fragment/i.test(prompt)) {
      return '<p>' + SELFTEST_MARKER + '</p>';
    }
    // Generic well-formed-but-empty JSON for the optional enrichment passes (image inventory,
    // style/palette extraction, ...). Returning HTML to those made them throw a parse error that
    // the pipeline swallows as non-blocking — harmless for the run, but it meant a genuinely
    // broken enrichment path looked exactly like our own stub noise, which is a blind canary.
    // Empty-but-valid says "nothing to add" and keeps a real parse failure visible.
    if (/JSON array/i.test(prompt)) return '[]';
    if (/\bJSON\b/i.test(prompt)) return '{}';
    return '<p>' + SELFTEST_MARKER + '</p>';
  }

  // Which stage a failure belongs to, from the error the pipeline actually threw. Keeps the
  // report actionable ("the ownership gate rejected the run") instead of a raw stack.
  function classifySelfTestFailure(message) {
    const m = String(message || '');
    if (/Pipeline module file\(s\) missing/i.test(m)) return { stage: 'assets', hint: 'The pipeline module files are missing from the assets directory. Reinstall the connector, or set ALLOFLOW_MCP_ASSETS_DIR.' };
    if (/executable doesn't exist|Executable doesn't exist|browserType\.launch|playwright/i.test(m)) return { stage: 'browser', hint: 'Chromium could not launch. Run remediation_setup once (a ~200MB one-time download).' };
    if (/ALLO_DOCUMENT_EPOCH_REQUIRED|DocumentOwnershipError|ownership epoch/i.test(m)) return { stage: 'ownership-gate', hint: 'The pipeline refused an unstamped run: the driver is not publishing a document-ownership epoch this pipeline build accepts. Connector and pipeline are out of sync.' };
    if (/BASELINE_AUDIT_REQUIRED|BaselineAuditRequiredError|baseline accessibility audit/i.test(m)) return { stage: 'audit-contract', hint: 'The audit produced no usable evidence, so remediation refused to start. The pipeline\'s strict audit-reply contract has almost certainly changed underneath the connector.' };
    if (/waitForFunction|AlloModules|createDocPipeline/i.test(m)) return { stage: 'module-boot', hint: 'The pipeline modules loaded but did not expose the expected globals. Connector and pipeline are out of sync.' };
    return { stage: 'run', hint: 'The run failed after boot. See `error` for the pipeline\'s own message.' };
  }

  async function selfTest(opts) {
    const o = opts || {};
    const rlog = typeof o.onLog === 'function' ? o.onLog : log;
    const startedAt = Date.now();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-selftest-'));
    const pdfPath = path.join(tmpDir, 'self-test.pdf');
    fs.writeFileSync(pdfPath, buildSelfTestPdf());

    let calls = 0;
    const server = http.createServer((req, res) => {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        calls++;
        let prompt = '';
        try {
          const j = JSON.parse(raw);
          prompt = (((j.contents || [])[0] || {}).parts || []).map((p) => p.text || '').join('\n');
        } catch (_) {}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: selfTestReply(String(prompt)) }] }, finishReason: 'STOP' }] }));
      });
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

    // The driver reads both of these per call, so redirecting them for the duration is enough to
    // keep the run entirely local. Restored in `finally` — a self-test must never leave the
    // process pointed at a loopback model or holding a fake key.
    const prevBase = process.env.ALLOFLOW_MCP_GEMINI_BASE;
    const prevKey = process.env.GEMINI_API_KEY;
    process.env.ALLOFLOW_MCP_GEMINI_BASE = 'http://127.0.0.1:' + server.address().port + '/v1beta/models';
    process.env.GEMINI_API_KEY = 'self-test-loopback-key';

    rlog('self-test: running the real pipeline against a scripted loopback model (no key, no quota)');
    try {
      const out = await remediate({
        filePath: pdfPath, onLog: o.onLog,
        targetScore: 100, fixPasses: 0, polishPasses: 0, taggedPdf: true, autoContinue: false,
      });
      const producedHtml = !!(out && typeof out.accessibleHtml === 'string' && out.accessibleHtml.trim());
      const carriedContent = producedHtml && out.accessibleHtml.indexOf(SELFTEST_MARKER) !== -1;
      const scoredHonestly = !!(out && Number.isFinite(Number(out.beforeScore)) && Number(out.beforeScore) >= 0);
      const auditorCoverage = !!(out && out.auditCoverage
        && out.auditCoverage.configuredAuditorCap === HEADLESS_AUDITOR_COUNT
        && Number.isSafeInteger(out.auditCoverage.requestedAuditors)
        && out.auditCoverage.requestedAuditors >= 3
        && out.auditCoverage.requestedAuditors <= HEADLESS_AUDITOR_COUNT
        && Number.isSafeInteger(out.auditCoverage.completedAuditors)
        && out.auditCoverage.completedAuditors >= out.auditCoverage.requestedAuditors
        && out.auditCoverage.completedAuditors <= out.auditCoverage.configuredAuditorCap
        && out.auditCoverage.sliced === false);
      const taggedBytes = out && typeof out.taggedPdfB64 === 'string'
        ? Buffer.from(out.taggedPdfB64, 'base64')
        : null;
      const taggedArtifact = !!(taggedBytes && taggedBytes.length > 5
        && taggedBytes.subarray(0, 5).toString('latin1') === '%PDF-');
      const taggedDelivery = !!(out && out.taggedPdfDelivery
        && out.taggedPdfDelivery.ok === true
        && out.taggedPdfDelivery.code === 'verified');
      const originalLayout = !!(out && out.taggedPdfExportMode === 'original_layout');
      const verificationBinding = !!(out && out.verificationHtmlBound === true);
      const activeContentScan = !!(out && out.activeContentScanVerified === true && out.activeContentDetected === false);
      const ok = producedHtml && carriedContent && scoredHonestly && auditorCoverage
        && taggedArtifact && taggedDelivery && originalLayout && verificationBinding && activeContentScan;
      return {
        ok,
        stage: ok ? 'complete' : 'output',
        durationMs: Date.now() - startedAt,
        modelCalls: calls,
        checks: {
          browserLaunched: true,
          modulesBooted: true,
          auditAccepted: scoredHonestly,     // the strict audit parse produced usable evidence
          remediationStarted: producedHtml,  // ownership + baseline gates let the run begin
          contentPreserved: carriedContent,  // the document survived the round trip
          auditorCoverage,
          taggedArtifact,
          taggedDelivery,
          originalLayout,
          verificationBinding,
          activeContentScan,
        },
        beforeScore: out && out.beforeScore,
        afterScore: out && out.afterScore,
        note: ok
          ? 'This install can remediate: real pipeline, real browser, real fixAndVerifyPdf. Only the model was scripted, so a live run additionally needs a valid GEMINI_API_KEY.'
          : 'The run completed but its output was not usable — see checks for which assertion failed.',
      };
    } catch (e) {
      const message = (e && e.message) || String(e);
      const { stage, hint } = classifySelfTestFailure(message);
      rlog('self-test FAILED at ' + stage + ': ' + message.slice(0, 200));
      return {
        ok: false, stage, hint, durationMs: Date.now() - startedAt, modelCalls: calls,
        error: message.slice(0, 600),
        note: 'The connector cannot remediate on this machine. This ran with a scripted model, so the failure is NOT an API-key or quota problem.',
      };
    } finally {
      if (prevBase === undefined) delete process.env.ALLOFLOW_MCP_GEMINI_BASE; else process.env.ALLOFLOW_MCP_GEMINI_BASE = prevBase;
      if (prevKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = prevKey;
      try { server.close(); } catch (_) {}
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
    }
  }

  // ── Accessible Office export (DOCX / ODT) ───────────────────────────────────
  // The connector shipped three modules and reached 11% of the pipeline (see
  // dev-tools/mcp_capability_inventory.cjs). Office export was one of the missing pieces, and it
  // lives in view_pdf_audit_module.js — a VIEW module that destructures React hooks at top level
  // and throws "Cannot read properties of undefined (reading 'useState')" without React present.
  //
  // That is why it could not simply be added to MODULE_FILES. It loads cleanly once React is
  // there, and then exposes _buildAccessibleOfficeExport as window.AlloModules.AccessibleOfficeExport.
  // Loaded on demand rather than for every run, since most runs never export Office and the
  // module is ~1.4 MB.
  //
  // ePub 3, DAISY and Braille used to be excluded here for the same reason plus one more: their
  // generation lived INSIDE the PdfAuditView component as download handlers. That was extracted to
  // module scope on 2026-07-29 (view_pdf_audit_source.jsx, `_build*PackageFiles`), and the builders
  // are published as window.AlloModules.AltFormatExports. See exportAltFormat below.
  const REACT_CDN = 'https://unpkg.com/react@18.3.1/umd/react.production.min.js';
  const REACT_DOM_CDN = 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js';
  const JSZIP_CDN = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  const EXPORT_MODULE = 'view_pdf_audit_module.js';

  async function exportAccessibleOffice(opts) {
    const o = opts || {};
    const rlog = typeof o.onLog === 'function' ? o.onLog : log;
    const format = String(o.format || '').toLowerCase();
    if (format !== 'docx' && format !== 'odt') throw new Error("format must be 'docx' or 'odt'");
    if (!o.html || typeof o.html !== 'string') throw new Error('html is required');
    const modulePath = path.join(ASSETS_ROOT, EXPORT_MODULE);
    if (!fs.existsSync(modulePath)) {
      throw new Error(EXPORT_MODULE + ' is missing from ' + ASSETS_ROOT + ' — this connector build cannot export Office formats.');
    }
    const b = await getBrowser();
    const context = await b.newContext();
    try {
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
      await page.goto('about:blank');
      rlog('office export: loading React + JSZip + the export module');
      await page.addScriptTag({ url: REACT_CDN });
      await page.addScriptTag({ url: REACT_DOM_CDN });
      await page.addScriptTag({ url: JSZIP_CDN }); // ODT packaging needs it and the module will not fetch it itself
      await page.waitForFunction(() => !!(window.React && window.ReactDOM && window.JSZip), null, { timeout: 30000 });
      await page.addScriptTag({ path: modulePath });
      await page.waitForFunction(
        () => !!(window.AlloModules && window.AlloModules.AccessibleOfficeExport && typeof window.AlloModules.AccessibleOfficeExport.build === 'function'),
        null, { timeout: 30000 }
      );
      const out = await page.evaluate(async ({ html, title, format: fmt }) => {
        const res = await window.AlloModules.AccessibleOfficeExport.build({ html, title, format: fmt });
        if (!res || !res.blob) throw new Error('Office export returned no data');
        const buf = new Uint8Array(await res.blob.arrayBuffer());
        let s = '';
        for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
        return { b64: btoa(s), fileName: res.fileName, message: res.message || null, counts: res.counts || null };
      }, { html: o.html, title: o.title || 'AlloFlow Document', format });
      if (pageErrors.length) rlog('office export page errors: ' + pageErrors.slice(0, 2).join(' | '));
      rlog('office export: ' + out.fileName + ' (' + Math.round(out.b64.length * 0.75 / 1024) + ' KB)');
      return out;
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  // ── Alternative accessible formats (ePub 3 / DAISY 3 / BRF) ─────────────────
  // All three are MODEL-FREE: they restructure HTML that has already been remediated, so no key.
  //
  // The view module is loaded for the same reason the Office export loads it — the builders live
  // there — but the packaging is done in Node with desktop/mcp/zip_writer.cjs rather than by
  // pulling JSZip off a CDN. These are the formats a user reaches for when they have no network,
  // and a CDN dependency would make an offline install quietly unable to produce an ebook.
  const ALT_FORMATS = { epub: 'epub', daisy: 'daisy', brf: 'brf', braille: 'brf' };

  async function loadViewModulePage(context, rlog, what) {
    const modulePath = path.join(ASSETS_ROOT, EXPORT_MODULE);
    if (!fs.existsSync(modulePath)) {
      throw new Error(EXPORT_MODULE + ' is missing from ' + ASSETS_ROOT + ' — this connector build cannot produce ' + what + '.');
    }
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
    await page.goto('about:blank');
    rlog(what + ': loading React + the view module');
    // React is not optional: the module destructures hooks at top level and throws without it.
    await page.addScriptTag({ url: REACT_CDN });
    await page.addScriptTag({ url: REACT_DOM_CDN });
    await page.waitForFunction(() => !!(window.React && window.ReactDOM), null, { timeout: 30000 });
    await page.addScriptTag({ path: modulePath });
    await page.waitForFunction(
      () => !!(window.AlloModules && window.AlloModules.AltFormatExports && typeof window.AlloModules.AltFormatExports.epub === 'function'),
      null, { timeout: 30000 }
    );
    return { page, pageErrors };
  }

  async function exportAltFormat(opts) {
    const o = opts || {};
    const rlog = typeof o.onLog === 'function' ? o.onLog : log;
    const format = ALT_FORMATS[String(o.format || '').toLowerCase()];
    if (!format) throw new Error("format must be one of: epub, daisy, brf");
    if (!o.html || typeof o.html !== 'string') throw new Error('html is required');
    const title = String(o.title || 'document').replace(/\.\w+$/, '') || 'document';

    const b = await getBrowser();
    const context = await b.newContext();
    try {
      const { page, pageErrors } = await loadViewModulePage(context, rlog, format);
      const built = await page.evaluate(({ html, title: ttl, format: fmt }) => {
        const A = window.AlloModules.AltFormatExports;
        if (fmt === 'brf') {
          const r = A.braille(html);
          return { kind: 'text', brf: r.brf, dropped: r.dropped, grade: r.grade, code: r.code, chars: r.text.length };
        }
        const pkg = fmt === 'epub' ? A.epub(html, { title: ttl }) : A.daisy(html, { title: ttl });
        return {
          kind: 'package', files: pkg.files, storeFirst: pkg.storeFirst || null,
          lang: pkg.lang, uid: pkg.uid,
          headings: typeof pkg.headings === 'number' ? pkg.headings : null,
          validation: pkg.validation || null,
        };
      }, { html: o.html, title, format });
      if (pageErrors.length) rlog(format + ' page errors: ' + pageErrors.slice(0, 2).join(' | '));

      if (built.kind === 'text') {
        // A .brf is emitted as-is. Not zipped, not re-encoded: an embosser reads the raw ASCII
        // bytes, and any transcoding on the way out is the bug this format is prone to.
        const buf = Buffer.from(built.brf, 'ascii');
        rlog('brf: ' + buf.length + ' bytes, grade ' + built.grade + ', ' + built.dropped + ' character(s) dropped');
        return {
          format: 'brf', fileName: title + '.brf', b64: buf.toString('base64'), bytes: buf.length,
          grade: built.grade, code: built.code, droppedCharacters: built.dropped,
          sourceCharacters: built.chars, modelFree: true,
          // Surfaced rather than swallowed: characters with no Grade-1 equivalent are gone from
          // the braille, and a reader has no way to know unless the caller is told.
          warnings: built.dropped > 0
            ? [built.dropped + ' character(s) had no uncontracted-braille equivalent and were dropped.']
            : [],
        };
      }

      const errs = ((built.validation && built.validation.issues) || []).filter((i) => i.severity === 'error');
      const buf = zipFileMap(built.files, built.storeFirst || undefined);
      rlog(format + ': ' + Object.keys(built.files).length + ' entries, ' + buf.length + ' bytes'
        + (errs.length ? ', ' + errs.length + ' structural error(s)' : ''));
      return {
        format, fileName: title + (format === 'epub' ? '.epub' : '-daisy.zip'),
        b64: buf.toString('base64'), bytes: buf.length,
        entries: Object.keys(built.files), language: built.lang, identifier: built.uid,
        navEntries: typeof built.headings === 'number' ? built.headings : undefined, modelFree: true,
        // The EPUB self-check runs inside the builder so no caller can skip it. Reported as
        // structuralErrors rather than folded into a boolean: an invalid EPUB opens nowhere, and
        // "downloaded successfully" is how that used to reach a user unnoticed.
        structuralErrors: errs,
        // `valid` is ONLY meaningful where something validated. There is no DAISY validator here,
        // and reporting valid:true off an empty error list would be a clean bill of health nobody
        // issued — the same failure as calling a document compliant because axe was quiet.
        selfChecked: format === 'epub',
        valid: format === 'epub' ? errs.length === 0 : undefined,
        warnings: errs.length
          ? [errs.length + ' structural issue(s) found by the built-in EPUB self-check; this file may not open in all readers. Not a substitute for epubcheck.']
          : [],
      };
    } finally {
      try { await context.close(); } catch (_) {}
    }
  }

  // ── HTML-in / HTML-out pipeline operations ──────────────────────────────────
  // Three capabilities the capability inventory flagged as present-but-unreachable. They share a
  // shape: give the pipeline HTML, get something back. What differs is whether a model is needed,
  // and that difference is load-bearing rather than incidental:
  //
  //   contrast repair   — fixContrastViolations / fixAxeContrastViolationsTargeted /
  //                       sanitizeStyleForWCAG are all SYNCHRONOUS. Pure contrast math, no model.
  //                       So this works with no API key at all.
  //   conformance report— generateAccessibilityReportHtml is synchronous templating.  No key.
  //   image alt text    — describeAndClassifyImages is async and makes callGeminiVision calls
  //                       (2 sites). This one genuinely needs a model, and says so.
  //
  // `aiRequired` decides whether the AI seams are wired to the real bridge or to throwing stubs,
  // so a no-key operation cannot silently start spending quota if the pipeline changes underneath.
  async function withHtmlPage(aiRequired, fn, runOpts) {
    const o = runOpts || {};
    const rlog = typeof o.onLog === 'function' ? o.onLog : log;
    if (aiRequired) {
      // Real pipeline page: AI bridges live, page-per-run isolation, cancellable.
      return withRunPage(Object.assign({ fileName: o.fileName || 'document.html' }, o), fn);
    }
    requireModuleFiles();
    const b = await getBrowser();
    const context = await b.newContext();
    try {
      const page = await context.newPage();
      await installVendorRuntime(page, { loadAxe: true });
      for (const f of MODULE_FILES) await page.addScriptTag({ path: path.join(ASSETS_ROOT, f) });
      await page.waitForFunction(() => !!(window.AlloModules && window.AlloModules.createDocPipeline), null, { timeout: 30000 });
      await page.evaluate(() => {
        const boom = (w) => async () => { throw new Error('this operation is model-free; ' + w + ' must not be called'); };
        window.__mcpPipeline = window.AlloModules.createDocPipeline({
          callGemini: boom('callGemini'), callGeminiVision: boom('callGeminiVision'),
          callImagen: async () => null, addToast: () => {}, t: (k) => k, isRtlLang: () => false,
          updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
        });
      });
      rlog('model-free page ready');
      return await fn(page);
    } finally { try { await context.close(); } catch (_) {} }
  }

  // Deterministic contrast repair. Runs the axe audit first so the targeted fixer has real
  // violations to work from, then re-audits so the caller sees what actually changed rather than
  // a promise that something did.
  async function fixContrast(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate(async (html) => {
      const p = window.__mcpPipeline;
      // These three return DIFFERENT shapes. fixContrastViolations and
      // fixAxeContrastViolationsTargeted return HTML strings; sanitizeStyleForWCAG returns
      // { html, fixCount }. Assuming a uniform string silently replaced the document with
      // "[object Object]" downstream, so normalise explicitly.
      const asHtml = (v, fallback) => (typeof v === 'string' ? v : (v && typeof v.html === 'string' ? v.html : fallback));

      const before = await p.runAxeAudit(html);
      const pass1 = asHtml(p.fixContrastViolations(html), html);
      const mid = await p.runAxeAudit(pass1);
      const pass2 = asHtml(p.fixAxeContrastViolationsTargeted(pass1, mid), pass1);
      const sanitizedRes = p.sanitizeStyleForWCAG(pass2);
      const sanitized = asHtml(sanitizedRes, pass2);
      const styleFixes = (sanitizedRes && typeof sanitizedRes.fixCount === 'number') ? sanitizedRes.fixCount : null;
      const after = await p.runAxeAudit(sanitized);

      // axe reports contrast it cannot fully resolve as INCOMPLETE, not as a violation. Counting
      // only violations reported zero contrast problems on text at roughly 1.6:1, which is worse
      // than useless — it would have certified a document nobody can read.
      const contrastNodes = (a) => {
        const pick = (arr) => (arr || []).filter((v) => /contrast/i.test(v.id || '')).reduce((n, v) => n + (v.nodes || 1), 0);
        return { violations: pick(a && a.violations), incomplete: pick(a && a.incomplete) };
      };
      return {
        html: sanitized,
        beforeViolations: before && before.totalViolations, afterViolations: after && after.totalViolations,
        beforeContrast: contrastNodes(before), afterContrast: contrastNodes(after),
        beforeScore: before && before.score, afterScore: after && after.score,
        styleFixes, changed: sanitized !== html,
        beforeViolationIds: ((before && before.violations) || []).map((v) => v.id),
        afterViolationIds: ((after && after.violations) || []).map((v) => v.id),
        // Measured 2026-07-29: axe reported ZERO contrast findings, in violations AND incomplete,
        // on text at roughly 1.6:1 — before and after. The fixer meanwhile made real changes
        // (#dddddd -> #636363, ~5.9:1). So in this harness axe does not corroborate contrast, and
        // the honest evidence is the deterministic fix count, not an axe delta. Reporting an axe
        // improvement here would be citing a measurement that never happened.
        evidence: 'styleFixes is the deterministic count of colour corrections applied by the pipeline. '
          + 'axe-core does NOT reliably detect contrast in this iframe harness (it reported none on text at ~1.6:1), '
          + 'so the axe numbers here are context, not proof that contrast improved. Verify visually or with a contrast checker.',
      };
    }, o.html), o);
  }

  // AlloFlow's own conformance report. Deterministic templating over artifacts the caller already
  // has, so the report an agent produces is the report the app produces.
  async function buildConformanceReport(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate(({ fixResult, auditResult, pdfUa, reportOpts }) => {
      return window.__mcpPipeline.generateAccessibilityReportHtml(fixResult, auditResult, pdfUa, reportOpts);
    }, { fixResult: o.fixResult || {}, auditResult: o.auditResult || {}, pdfUa: o.pdfUa || null, reportOpts: o.reportOpts || {} }), o);
  }

  // Resource packs stay owned by doc_pipeline_module.js. This adapter only moves the app-shaped
  // inputs across the process boundary and returns the exact HTML produced by the app's exporter.
  async function generateResourcePack(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate(({ items, topic, isWorksheet, responses, config }) => {
      const html = window.__mcpPipeline.generateFullPackHTML(items, topic, isWorksheet, responses, config);
      return { html, resourcesRequested: items.length, worksheet: isWorksheet, modelFree: true };
    }, {
      items: o.items,
      topic: o.topic || '',
      isWorksheet: o.isWorksheet === true,
      responses: o.responses || {},
      config: o.config || null,
    }), o);
  }

  // Image alt text. The one of the three that genuinely needs a model.
  async function describeImages(opts) {
    const o = opts || {};
    return withHtmlPage(true, async (page) => page.evaluate(async ({ html, cap }) => {
      const r = await window.__mcpPipeline.describeAndClassifyImages(html, { cap });
      return { html: r.html, classified: r.classified, equations: r.equations, charts: r.charts, visionCalls: r.visionCalls, dedupedCopies: r.dedupedCopies };
    }, { html: o.html, cap: o.cap || 10 }), Object.assign({ base64ForRender: null }, o));
  }

  // ── Media transcription and translation ─────────────────────────────────────
  // The two capabilities that turn this connector from "PDF remediation" into the UDL story the
  // app actually tells: an audio or video file becomes an accessible transcript, and any
  // accessible output can be produced in another language. Both are genuinely AI-dependent
  // (translateAccessibleHtml throws 'AI unavailable' without callGemini), so both take the real
  // pipeline page and both are key-gated at the tool layer rather than pretending otherwise.
  const MEDIA_MIME = {
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac',
    '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.webm': 'video/webm', '.mp4': 'video/mp4',
    '.mov': 'video/quicktime', '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg',
  };

  async function transcribeMedia(opts) {
    const o = opts || {};
    const fileName = path.basename(o.filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mime = o.mimeType || MEDIA_MIME[ext];
    if (!mime) throw new Error('Unsupported media type "' + ext + '". Supported: ' + Object.keys(MEDIA_MIME).join(', '));
    const bytes = fs.readFileSync(o.filePath);
    (o.onLog || log)('transcribe: ' + fileName + ' (' + Math.round(bytes.length / 1024 / 1024 * 10) / 10 + ' MB, ' + mime + ', mode=' + (o.mode || 'speech') + ')');
    const b64 = bytes.toString('base64');
    return withRunPage(Object.assign({ fileName }, o), (page) =>
      page.evaluate(async ({ data, mimeType, mode }) => {
        const r = await window.__mcpPipeline.transcribeMediaToPayload(data, mimeType, { mode });
        return { payload: r.payload, words: r.words, mode: r.mode };
      }, { data: b64, mimeType: mime, mode: o.mode || 'speech' }));
  }

  async function translateHtml(opts) {
    const o = opts || {};
    (o.onLog || log)('translate: -> ' + o.targetLang + ' (' + Math.round(String(o.html || '').length / 1024) + ' KB of HTML)');
    return withRunPage(Object.assign({ fileName: o.fileName || 'document.html' }, o), (page) =>
      page.evaluate(async ({ html, targetLang }) => {
        // The pipeline swaps data-URI images for placeholders before chunking and restores them
        // after, so images survive translation without being sent through the model as base64.
        const out = await window.__mcpPipeline.translateAccessibleHtml(html, targetLang, {});
        return typeof out === 'string' ? { html: out } : { html: (out && out.html) || '', meta: out };
      }, { html: o.html, targetLang: o.targetLang }));
  }

  // ── Redaction, extraction, forms, simplification ────────────────────────────
  // Four more capability areas the inventory flagged. Measured, not assumed: _redactDocument,
  // detectFormBlanks and applyFormBlanks are SYNCHRONOUS; the *Deterministic extractors and
  // convertXlsxToMarkdownTables are async only because they load parsing libraries, and contain
  // zero callGemini sites. So all four run model-free. simplifyAccessibleHtml is the exception.
  //
  // _redactDocument is worth noting: it redacts, then runs _redactionLeaks over its own output and
  // returns { clean, leaks }. It verifies its own work, which is exactly the property a redaction
  // tool needs — a redaction that silently missed something is worse than none.
  async function redactDocumentHtml(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate(({ html, targets, options }) => {
      const r = window.__mcpPipeline.redactDocument(html, targets, options || {});
      return { html: r.html, count: r.count, redacted: r.redacted, clean: r.clean, leaks: r.leaks };
    }, { html: o.html, targets: o.targets, options: o.options }), o);
  }

  // One entry point for "get the text out of this file", because a caller should not have to know
  // which extractor matches which extension.
  async function extractDocumentText(opts) {
    const o = opts || {};
    const ext = path.extname(o.filePath).toLowerCase();
    const b64 = fs.readFileSync(o.filePath).toString('base64');
    (o.onLog || log)('extract: ' + path.basename(o.filePath) + ' (' + ext + ')');
    return withHtmlPage(false, async (page) => page.evaluate(async ({ data, kind }) => {
      const p = window.__mcpPipeline;
      // Each extractor returns its OWN shape. The Office ones use `fullText` (with a `method`
      // field that can be 'failed' plus an `error`), the XLSX one produces markdown. Reading a
      // `text` property that never existed returned empty strings while reporting success — the
      // same object-shape trap as sanitizeStyleForWCAG. Normalise explicitly and carry `method`
      // and `error` through, so a failed extraction cannot masquerade as an empty document.
      const pick = (r) => {
        if (typeof r === 'string') return { text: r, method: null, error: null };
        if (!r || typeof r !== 'object') return { text: '', method: null, error: 'extractor returned nothing usable' };
        const text = [r.fullText, r.markdown, r.text].find((v) => typeof v === 'string' && v.length) || '';
        return { text, method: r.method || null, error: r.error || null, sourceCharCount: r.sourceCharCount, mediaImages: (r.mediaImages || []).length || 0 };
      };
      let raw;
      if (kind === '.docx') raw = await p.extractDocxTextDeterministic(data);
      else if (kind === '.pptx') raw = await p.extractPptxTextDeterministic(data);
      else if (kind === '.xlsx' || kind === '.xlsm') raw = await p.convertXlsxToMarkdownTables(data, {});
      else if (kind === '.pdf') raw = await p.extractPdfTextDeterministic(data, {});
      else throw new Error('Unsupported extension for deterministic extraction: ' + kind);
      return Object.assign({ kind: kind.replace('.', '') }, pick(raw));
    }, { data: b64, kind: ext }), o);
  }

  async function inspectFormFields(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate(({ html }) => {
      return { blanks: window.__mcpPipeline.detectFormBlanks(html) || [] };
    }, { html: o.html }), o);
  }

  async function applyFormFields(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate(({ html, accepted }) => {
      const out = window.__mcpPipeline.applyFormBlanks(html, accepted);
      return {
        html: typeof out === 'string' ? out : (out && out.html) || html,
        converted: out && typeof out.converted === 'number' ? out.converted : null,
      };
    }, { html: o.html, accepted: o.accepted }), o);
  }

  async function simplifyHtml(opts) {
    const o = opts || {};
    (o.onLog || log)('simplify: ' + Math.round(String(o.html || '').length / 1024) + ' KB of HTML');
    return withRunPage(Object.assign({ fileName: o.fileName || 'document.html' }, o), (page) =>
      page.evaluate(async ({ html, options }) => {
        const out = await window.__mcpPipeline.simplifyAccessibleHtml(html, options || {});
        return typeof out === 'string' ? { html: out } : { html: (out && out.html) || '', meta: out };
      }, { html: o.html, options: o.options }));
  }

  // ── Second-engine audit, plain text, structure check ────────────────────────
  // runEqualAccessAudit is IBM Equal Access: a genuinely INDEPENDENT rule engine, in-browser,
  // zero callGemini sites. That matters more here than it looks. axe-core was measured on this
  // project reporting no contrast findings on text at ~1.6:1, and reporting 100/0 on a document
  // veraPDF then failed. A single automated engine is one opinion; two that disagree is a signal
  // a human can act on. Cross-engine disagreement is the cheapest accessibility evidence there is.
  async function auditWithBothEngines(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate(async (html) => {
      const p = window.__mcpPipeline;
      const axe = await p.runAxeAudit(html);
      let equalAccess = null;
      let equalAccessError = null;
      try { equalAccess = await p.runEqualAccessAudit(html); }
      catch (e) { equalAccessError = String((e && e.message) || e).slice(0, 300); }
      const ids = (a, key) => new Set(((a && a[key]) || []).map((v) => v.id).filter(Boolean));
      const axeIds = ids(axe, 'violations');
      const eaIds = new Set(((equalAccess && (equalAccess.fails || equalAccess.violations)) || []).map((v) => v.ruleId || v.id).filter(Boolean));
      return {
        axe: {
          score: axe && axe.score, violations: axe && axe.totalViolations,
          incomplete: axe && axe.totalIncomplete, ids: [...axeIds],
        },
        equalAccess: equalAccess ? {
          score: equalAccess.score,
          failViolations: equalAccess.failViolations != null ? equalAccess.failViolations : (equalAccess.fails || []).length,
          ids: [...eaIds],
        } : null,
        equalAccessError,
        onlyAxe: [...axeIds].filter((i) => !eaIds.has(i)),
        onlyEqualAccess: [...eaIds].filter((i) => !axeIds.has(i)),
      };
    }, o.html), o);
  }

  // Plain text and heading-structure check. Both synchronous in the pipeline; useful on their own
  // (a plain-text alternative is a legitimate accessible format) and as cheap sanity checks.
  async function htmlDerivatives(opts) {
    const o = opts || {};
    return withHtmlPage(false, async (page) => page.evaluate((html) => {
      const p = window.__mcpPipeline;
      const text = p.htmlToPlainText(html) || '';
      let headingIssue = null;
      try { headingIssue = p.headingOutlineIssue ? p.headingOutlineIssue(html) : null; } catch (_) { headingIssue = null; }
      const heads = (html.match(/<h([1-6])\b/gi) || []).map((h) => Number(h.slice(2)));
      const counts = heads.reduce((acc, n) => { acc['h' + n] = (acc['h' + n] || 0) + 1; return acc; }, {});
      // A skipped level (h2 -> h4) is a WCAG 1.3.1 problem and is cheap to detect here rather than
      // hoping an engine flags it.
      let skips = 0;
      for (let i = 1; i < heads.length; i++) if (heads[i] > heads[i - 1] + 1) skips++;
      return { text, characters: text.length, headingCounts: counts, headingSkips: skips, headingIssue };
    }, o.html), o);
  }

  async function close() {
    activeContext = null;
    if (verapdfServer) { try { verapdfServer.close(); } catch (_) {} verapdfServer = null; }
    if (browser) { try { await browser.close(); } catch (_) {} browser = null; }
  }

  return {
    audit, remediate, validatePdfUa, validatePdfUaCli, selfTest, renderPdfToPageImages, exportAccessibleOffice,
    fixContrast, buildConformanceReport, generateResourcePack, describeImages, transcribeMedia, translateHtml,
    redactDocumentHtml, extractDocumentText, inspectFormFields, applyFormFields, simplifyHtml,
    auditWithBothEngines, htmlDerivatives, exportAltFormat,
    cancelActiveRun, close,
  };
}

/*
 * Prove the configured key actually WORKS, rather than merely existing.
 *
 * Presence is not validity: a revoked, expired, or mistyped key made every
 * capability field report ready and then every AI tool failed at call time with
 * API_AUTH_FAILED. This lists models — the cheapest authenticated endpoint —
 * and sends NO document content, so it is safe to run at any time and costs no
 * generation quota. The key value is never returned or logged.
 */
async function verifyGeminiApiKey({ timeoutMs = 15000 } = {}) {
  const info = resolveGeminiApiKey();
  if (!info.key) return { state: 'no-key', source: info.source, checked: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      { headers: { 'x-goog-api-key': info.key }, signal: controller.signal },
    );
    const body = await response.text();
    if (response.ok) return { state: 'valid', source: info.source, checked: true };
    const classified = classifyHttpFailure(response.status, body);
    // Quota exhaustion means the key is GOOD but currently rate-limited; that is
    // a different user action from a bad key, so never conflate the two.
    if (classified.isQuota) {
      return {
        state: 'valid-but-quota-exhausted', source: info.source, checked: true,
        detail: 'The key is accepted but its quota is currently exhausted. Wait for the quota window to reset.',
      };
    }
    return {
      state: 'invalid', source: info.source, checked: true,
      detail: 'The API rejected this key (HTTP ' + response.status + '). It is revoked, mistyped, or lacks Generative Language API access.',
    };
  } catch (error) {
    // Offline, DNS failure, proxy, timeout: the key is untested, NOT proven bad.
    return {
      state: 'unreachable', source: info.source, checked: false,
      detail: 'Could not reach the Gemini API to test the key: ' + String((error && error.message) || error).slice(0, 200),
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { createDriver, classifyHttpFailure, resolveGeminiApiKey, verifyGeminiApiKey, resolveChromium, installChromium, verifyVendorBundle, REPO_ROOT, ASSETS_ROOT, MODULE_FILES };

// ── Direct CLI (for manual testing without an MCP client) ──────────────────
//   GEMINI_API_KEY=... node desktop/mcp/remediation_headless_driver.cjs audit <file.pdf>
//   GEMINI_API_KEY=... node desktop/mcp/remediation_headless_driver.cjs remediate <file.pdf> [outDir]
if (require.main === module) {
  (async () => {
    const [, , cmd, file, outDir] = process.argv;
    if (!cmd || !file || ['audit', 'remediate', 'validate'].indexOf(cmd) === -1) {
      defaultLog('usage: node remediation_headless_driver.cjs <audit|remediate|validate> <file.pdf> [outDir]');
      defaultLog('  validate = PDF/UA-1 check via veraPDF; needs NO GEMINI_API_KEY');
      process.exit(2);
    }
    const driver = createDriver({});
    try {
      if (cmd === 'validate') {
        const out = await driver.validatePdfUaCli({ filePath: path.resolve(file) });
        process.stdout.write(JSON.stringify(out, null, 2) + '\n');
      } else if (cmd === 'audit') {
        const out = await driver.audit({ filePath: path.resolve(file) });
        delete out._fullAudit;
        process.stdout.write(JSON.stringify(out, null, 2) + '\n');
      } else {
        const out = await driver.remediate({ filePath: path.resolve(file) });
        const dir = path.resolve(outDir || path.dirname(path.resolve(file)));
        const stem = path.basename(file).replace(/\.pdf$/i, '');
        if (out.accessibleHtml) fs.writeFileSync(path.join(dir, stem + '-accessible.html'), out.accessibleHtml, 'utf8');
        if (out.taggedPdfB64) fs.writeFileSync(path.join(dir, stem + '-tagged.pdf'), Buffer.from(out.taggedPdfB64, 'base64'));
        const summary = Object.assign({}, out, { accessibleHtml: out.accessibleHtml ? '(written)' : null, taggedPdfB64: out.taggedPdfB64 ? '(written)' : null });
        process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
      }
    } catch (e) {
      defaultLog('FAILED: ' + (e && e.message ? e.message : String(e)));
      process.exitCode = 1;
    } finally {
      await driver.close();
    }
  })();
}
