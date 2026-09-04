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
// Kept beside the renderer's own constant and asserted equal in
// tests/mcp_page_image_format.test.js, so the encoder and the declared MIME
// type can never drift apart.
const PAGE_IMAGE_MIME = 'image/jpeg';
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

// A terminal primary/round checkpoint will never feed another fix pass: the
// persisted loop boundary says autoContinueDone=true and the resume path honors
// that fence before entering the loop. Persist only the fields consumed by
// final publication/verification in that state. Unfinished checkpoints retain
// the full remediation result because their audit node evidence, source text,
// issue-resolution baseline, and OCR state can all affect the next accepted
// round. Schema-1 full snapshots remain valid and resumable.
const TERMINAL_CHECKPOINT_CAPSULE_SCHEMA = 1;
const TERMINAL_CHECKPOINT_REMEDIATION_FIELDS = Object.freeze([
  'accessibleHtml',
  'verificationHtmlBinding',
  'verificationCoverage',
  'verificationState',
  'executionState',
  'outcomeState',
  'verificationScope',
  'testedScopeComplete',
  'engineExecutionComplete',
  'fullyVerifiedSuccess',
  'success',
  'afterScoreVerified',
  'requiresManualReview',
  'verificationReviewCount',
  'verificationReasons',
  'knownFindingCount',
  'knownFindings',
  'scoreEvidence',
  'evidenceSchemaVersion',
  'evidenceProfile',
  'evidenceProvenance',
  'evidenceManifest',
  'afterScore',
  '_aiVerificationIncomplete',
  '_scoreSource',
  '_estimatedMinimumScore',
  'integrityCoverage',
  'integrityWarning',
  'fidelityNotes',
  'needsExpertReview',
  'expertReviewReason',
  'activeContent',
  'documentLanguage',
  'sourceKind',
  'isScanned',
  'groundTruthMethod',
  'groundTruthPages',
  'sourceStructTree',
  'finalText',
  'ocrAccuracy',
  '_experimentEarlyGetPages',
  '_perLeafScannedOptOut',
  'runId',
  '_runId',
]);

function checkpointPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkpointHasExactKeys(value, expected) {
  if (!checkpointPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => (
    key === wanted[index]
  ));
}

function checkpointVerificationBinding(value, accessibleHtml) {
  if (!checkpointHasExactKeys(value, [
    'version',
    'algorithm',
    'digest',
    'utf8ByteLength',
  ]) || typeof accessibleHtml !== 'string') return false;
  const html = Buffer.from(accessibleHtml, 'utf8');
  return value.version === 1
    && value.algorithm === 'SHA-256'
    && /^[a-f0-9]{64}$/.test(String(value.digest || ''))
    && Number.isSafeInteger(value.utf8ByteLength)
    && value.utf8ByteLength > 0
    && value.utf8ByteLength === html.length
    && value.digest === crypto.createHash('sha256').update(html).digest('hex');
}

function checkpointActiveContent(value) {
  const types = new Set([
    'open-action',
    'javascript',
    'launch',
    'embedded-files',
    'additional-actions',
    'other-actions',
    'multimedia',
  ]);
  return checkpointHasExactKeys(value, [
    'schema',
    'complete',
    'pageScanFailures',
    'unexaminedStructures',
    'any',
    'findings',
    'externalLinks',
  ])
    && value.schema === 1
    && value.complete === true
    && value.pageScanFailures === 0
    && value.unexaminedStructures === 0
    && typeof value.any === 'boolean'
    && Number.isSafeInteger(value.externalLinks)
    && value.externalLinks >= 0
    && Array.isArray(value.findings)
    && value.findings.every((finding) => checkpointHasExactKeys(finding, [
      'type',
      'count',
      'label',
    ])
      && types.has(finding.type)
      && Number.isSafeInteger(finding.count)
      && finding.count > 0
      && typeof finding.label === 'string'
      && finding.label.length > 0)
    && value.any === (value.findings.length > 0);
}

function terminalCheckpointAuditSummary(value, countKey) {
  const audit = checkpointPlainObject(value) ? value : {};
  const score = audit.score === undefined || audit.score === null
    ? null : audit.score;
  const count = audit[countKey] === undefined || audit[countKey] === null
    ? null : audit[countKey];
  if (
    !(score === null ||
      (typeof score === 'number' &&
        Number.isFinite(score) &&
        score >= 0 &&
        score <= 100)) ||
    !(count === null ||
      (Number.isSafeInteger(count) && count >= 0))
  ) return null;
  return { score, [countKey]: count };
}

function terminalCheckpointRemediationCapsule(remediation) {
  const axeAudit = terminalCheckpointAuditSummary(
    remediation && remediation.axeAudit,
    'totalViolations',
  );
  const secondEngineAudit = terminalCheckpointAuditSummary(
    remediation && remediation.secondEngineAudit,
    'failViolations',
  );
  if (
    !checkpointPlainObject(remediation) ||
    !axeAudit ||
    !secondEngineAudit ||
    typeof remediation.accessibleHtml !== 'string' ||
    remediation.accessibleHtml.length === 0 ||
    !checkpointVerificationBinding(
      remediation.verificationHtmlBinding,
      remediation.accessibleHtml,
    ) ||
    !checkpointPlainObject(remediation.verificationCoverage) ||
    !checkpointActiveContent(remediation.activeContent) ||
    typeof remediation.sourceKind !== 'string' ||
    remediation.sourceKind.length === 0 ||
    !(remediation.groundTruthMethod === null ||
      typeof remediation.groundTruthMethod === 'string') ||
    !(remediation.groundTruthPages === null ||
      Array.isArray(remediation.groundTruthPages)) ||
    !(remediation.sourceStructTree === null ||
      checkpointPlainObject(remediation.sourceStructTree)) ||
    typeof remediation.finalText !== 'string' ||
    remediation.finalText.length === 0 ||
    !(remediation.ocrAccuracy === null ||
      checkpointPlainObject(remediation.ocrAccuracy)) ||
    !/^(?:complete|complete-for-tested-scope|review-required|partial|unavailable)$/.test(
      String(remediation.verificationState || ''),
    ) ||
    typeof remediation.afterScoreVerified !== 'boolean' ||
    typeof remediation.requiresManualReview !== 'boolean'
  ) return null;

  const capsule = { checkpointCapsuleSchema: TERMINAL_CHECKPOINT_CAPSULE_SCHEMA };
  for (const key of TERMINAL_CHECKPOINT_REMEDIATION_FIELDS) {
    capsule[key] = Object.hasOwn(remediation, key) && remediation[key] !== undefined
      ? remediation[key] : null;
  }
  capsule.isScanned = remediation.isScanned === true
    || /tesseract|vision|ocr/i.test(String(remediation.groundTruthMethod || ''));
  capsule._experimentEarlyGetPages =
    remediation._experimentEarlyGetPages === true;
  capsule._perLeafScannedOptOut =
    remediation._perLeafScannedOptOut === true;
  capsule.axeAudit = axeAudit;
  capsule.secondEngineAudit = secondEngineAudit;
  return capsule;
}

function compactTerminalCheckpointSnapshot(snapshot) {
  if (
    !checkpointPlainObject(snapshot) ||
    snapshot.schema !== 1 ||
    !['primary', 'round'].includes(snapshot.stage) ||
    snapshot.autoContinueDone !== true
  ) return snapshot;
  const capsule = terminalCheckpointRemediationCapsule(snapshot.remediation);
  return capsule ? Object.assign({}, snapshot, { remediation: capsule }) : snapshot;
}

// Browser dependencies are vendored so a remote job never sends document content to a
// public asset CDN. The manifest is checked before any input is opened and every response
// is served from memory over the loopback origin used by the pipeline page.
const VENDOR_BOOT_PATH = '/__alloflow_mcp_vendor/';
const VENDOR_BOOT_URL = 'http://127.0.0.1/__alloflow_mcp_boot__';
let vendorBundleCache = null;
const NORMALIZED_VENDOR_TEXT_PATHS = Object.freeze(['THIRD_PARTY_NOTICES.md']);
const NORMALIZED_VENDOR_TEXT_PATH_SET = new Set(NORMALIZED_VENDOR_TEXT_PATHS);

// Most vendor files are executable/binary payloads whose hashes bind their exact bytes. The
// notices file is the sole text payload: Git can leave an older Windows checkout with CRLF bytes
// even after an `eol=lf` rule is added, while the index and manifest correctly contain LF. An
// explicit per-entry normalization policy keeps that non-executable provenance text stable
// without weakening byte-exact verification for any runtime asset. The packager materializes
// these canonical bytes into the MCPB before it verifies the staged bundle.
function normalizeVendorAssetBytes(entry, input) {
  const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input || '');
  if (!entry || entry.normalization === undefined) return bytes;
  if (!NORMALIZED_VENDOR_TEXT_PATH_SET.has(entry.path)) {
    throw new Error('AlloFlow MCP vendor normalization is allowed only for an explicitly identified text asset: ' + String(entry.path || 'unknown'));
  }
  if (entry.normalization !== 'lf') {
    throw new Error('AlloFlow MCP vendor manifest contains an unsupported normalization policy: ' + String(entry.normalization));
  }
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) {
    throw new Error('AlloFlow MCP vendor text asset is not valid UTF-8: ' + String(entry.path || 'unknown'));
  }
  return Buffer.from(text.replace(/\r\n?/g, '\n'), 'utf8');
}

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
      || (entry.normalization !== undefined && entry.normalization !== 'lf')
      || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
      throw new Error('AlloFlow MCP vendor manifest contains an unsafe entry: ' + JSON.stringify(entry));
    }
    const absolute = path.resolve(root, entry.path);
    if (!absolute.startsWith(path.resolve(root) + path.sep) || files.has(entry.path)) {
      throw new Error('AlloFlow MCP vendor manifest contains a duplicate or out-of-root entry: ' + entry.path);
    }
    let bytes;
    try { bytes = normalizeVendorAssetBytes(entry, fs.readFileSync(absolute)); } catch (error) {
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
const DEFAULT_MODEL_RETRY_BUDGET = 6;
const MAX_MODEL_RETRY_BUDGET = 20;
const MAX_PROVIDER_RETRY_AFTER_MS = 10 * 60 * 1000;
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
function retryDelayMs(value) {
  if (typeof value === 'string') {
    const match = /^(\d+)(?:\.(\d{1,9}))?s$/.exec(value.trim());
    if (!match) return null;
    const fraction = (match[2] || '').padEnd(9, '0');
    const milliseconds = Number(match[1]) * 1000 + Math.ceil(Number(fraction || 0) / 1e6);
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }
  if (!value || typeof value !== 'object') return null;
  const seconds = Number(value.seconds || 0);
  const nanos = Number(value.nanos || 0);
  if (!Number.isFinite(seconds) || !Number.isFinite(nanos) || seconds < 0 || nanos < 0) return null;
  const milliseconds = seconds * 1000 + Math.ceil(nanos / 1e6);
  return Number.isSafeInteger(milliseconds) ? milliseconds : null;
}

function providerRetryAfterMs(headers, bodyText, now = Date.now()) {
  const candidates = [];
  const header = headers && typeof headers.get === 'function' ? headers.get('retry-after') : null;
  if (typeof header === 'string' && /^\d+$/.test(header.trim())) {
    candidates.push(Number(header.trim()) * 1000);
  } else if (typeof header === 'string' && header.trim()) {
    const date = Date.parse(header);
    if (Number.isFinite(date)) candidates.push(Math.max(0, date - now));
  }
  try {
    const body = JSON.parse(String(bodyText || ''));
    const details = body && body.error && Array.isArray(body.error.details) ? body.error.details : [];
    for (const detail of details) {
      if (!detail || typeof detail !== 'object' || !/google\.rpc\.RetryInfo$/.test(String(detail['@type'] || detail.type || ''))) continue;
      const parsed = retryDelayMs(detail.retryDelay);
      if (parsed !== null) candidates.push(parsed);
    }
  } catch (_) {}
  const finite = candidates.filter((value) => Number.isFinite(value) && value >= 0);
  if (!finite.length) return null;
  return Math.min(MAX_PROVIDER_RETRY_AFTER_MS, Math.max(0, Math.ceil(Math.max(...finite))));
}

function classifyHttpFailure(status, bodyText, headers) {
  const raw = 'HTTP ' + status + ': ' + String(bodyText || '').slice(0, 2000);
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(bodyText || '')) {
    const perDay = /per\s*day|daily|PerDay/i.test(bodyText || '');
    const retryAfterMs = providerRetryAfterMs(headers, bodyText);
    return {
      message: 'API_QUOTA_EXHAUSTED', originalMessage: raw,
      isQuota: true, code: perDay ? 'model_quota_exhausted' : 'model_throttled',
      retryAfterMs,
      classification: { kind: 'quota', perMinute: !perDay, perDay },
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

function abortEnvelope() {
  return {
    message: 'Gemini request aborted',
    code: 'request_aborted',
    isAbort: true,
    classification: { kind: 'abort' },
  };
}

function abortableDelay(ms, signal) {
  if (!(ms > 0)) return Promise.resolve();
  if (signal && signal.aborted) return Promise.reject(signal.reason || new Error('aborted'));
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener?.('abort', onAbort);
      if (error) reject(error); else resolve();
    };
    const onAbort = () => finish(signal.reason || new Error('aborted'));
    timer = setTimeout(() => finish(), ms);
    timer.unref?.();
    signal?.addEventListener?.('abort', onAbort, { once: true });
  });
}

function abortablePromise(value, signal, onLateResolve) {
  const pending = Promise.resolve(value);
  if (!signal) return pending;
  const abortError = () => signal.reason || new Error('aborted');
  const cleanupLateResult = (result) => {
    if (typeof onLateResolve !== 'function') return;
    try { Promise.resolve(onLateResolve(result)).catch(() => {}); } catch (_) {}
  };
  if (signal.aborted) {
    pending.then(cleanupLateResult, () => {});
    return Promise.reject(abortError());
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
    pending.then(
      (result) => {
        if (settled) {
          cleanupLateResult(result);
          return;
        }
        settled = true;
        signal.removeEventListener('abort', onAbort);
        resolve(result);
      },
      (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function modelRetryBudget(value) {
  const configured = Number(value);
  if (Number.isInteger(configured) && configured >= 0) return Math.min(MAX_MODEL_RETRY_BUDGET, configured);
  const fromEnv = Number(process.env.ALLOFLOW_MCP_MODEL_RETRY_BUDGET);
  if (Number.isInteger(fromEnv) && fromEnv >= 0) return Math.min(MAX_MODEL_RETRY_BUDGET, fromEnv);
  return DEFAULT_MODEL_RETRY_BUDGET;
}

async function withTransportGate(state, signal, operation) {
  if (!state) return operation();
  const previous = Promise.resolve(state.gateTail).catch(() => {});
  let release;
  const slot = new Promise((resolve) => { release = resolve; });
  state.gateTail = previous.then(() => slot);
  try {
    await abortablePromise(previous, signal);
    return await operation();
  } finally {
    release();
  }
}

async function geminiGenerateLocked({ apiKey, model, parts, log, signal, transportState }) {
  // Key travels in the x-goog-api-key header, never the URL (2026-08-28): AI Studio now
  // issues AQ.-prefixed Authentication Keys that Google rejects on the legacy ?key= query
  // path (400 "API key not valid" / 401 ACCESS_TOKEN_TYPE_UNSUPPORTED), and headers also
  // keep the credential out of proxy logs and copied diagnostics. Matches gemini_api_module
  // and the remediation_verify_key probe, which already authenticated this way.
  const url = geminiBase() + '/' + model + ':generateContent';
  const state = transportState || null;
  if (signal && signal.aborted) return { ok: false, error: abortEnvelope() };
  if (state && state.throttled) {
    if (state.retryBudgetRemaining <= 0) {
      return {
        ok: false,
        error: {
          message: 'API_QUOTA_EXHAUSTED',
          code: 'model_throttled',
          isQuota: true,
          retryAfterMs: state.retryAfterMs,
          retryBudgetExhausted: true,
          classification: { kind: 'quota', perMinute: true, perDay: false },
        },
      };
    }
    state.retryBudgetRemaining -= 1;
    try {
      await abortableDelay(Math.max(0, state.notBeforeAt - Date.now()), signal);
    } catch (_) {
      return { ok: false, error: abortEnvelope() };
    }
  }
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts }] }),
      signal,
    });
  } catch (e) {
    if (signal && signal.aborted) return { ok: false, error: abortEnvelope() };
    return { ok: false, error: { message: 'Network error calling Gemini: ' + (e && e.message ? e.message : 'fetch failed'), classification: { kind: 'transient' } } };
  }
  const bodyText = await res.text().catch(() => '');
  if (signal && signal.aborted) return { ok: false, error: abortEnvelope() };
  if (!res.ok) {
    const error = classifyHttpFailure(res.status, bodyText, res.headers);
    if (state && error.code === 'model_throttled') {
      const delay = Number.isFinite(error.retryAfterMs) ? error.retryAfterMs : 2500;
      state.throttled = true;
      state.retryAfterMs = delay;
      state.notBeforeAt = Math.max(state.notBeforeAt, Date.now() + delay);
      error.retryBudgetExhausted = state.retryBudgetRemaining <= 0;
    }
    return { ok: false, error };
  }
  if (state) {
    state.throttled = false;
    state.retryAfterMs = null;
    state.notBeforeAt = 0;
  }
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

async function geminiGenerate(options) {
  const state = options && options.transportState;
  try {
    return await withTransportGate(
      state,
      options && options.signal,
      () => geminiGenerateLocked(options),
    );
  } catch (error) {
    if (options && options.signal && options.signal.aborted) {
      return { ok: false, error: abortEnvelope() };
    }
    throw error;
  }
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
  const spawnProcess = typeof o.spawnProcess === 'function' ? o.spawnProcess : require('child_process').spawn;
  let browser = null;
  let activeRun = null; // context + abortable Node transports for the single in-flight run
  // (2026-08-16) The last completed run's diagnostic snapshot — the same numbers-only instrument
  // the Canvas 🧪 bundle exports (per-call ledger, outcomes, timings, throttle events, constants).
  // Captured in withRunPage before the run page closes; read via takeLastRunDiagnostics(). Never
  // contains prompts, responses, or document text (the pipeline's privacy test pins that).
  let lastRunDiagnostics = null;
  let documentEpochSeq = 0; // one document-ownership epoch per run page (see newPipelinePage)

  function requireModuleFiles() {
    const missing = MODULE_FILES.filter((f) => !fs.existsSync(path.join(ASSETS_ROOT, f)));
    if (missing.length) throw new Error('Pipeline module file(s) missing from ' + ASSETS_ROOT + ': ' + missing.join(', '));
  }

  async function getBrowser(signal) {
    if (browser) return browser;
    if (signal && signal.aborted) throw signal.reason || new Error('Run cancelled');
    if (typeof o.browserFactory === 'function') {
      browser = await abortablePromise(
        o.browserFactory(),
        signal,
        (lateBrowser) => lateBrowser && lateBrowser.close && lateBrowser.close(),
      );
      browser.on?.('disconnected', () => { browser = null; });
      return browser;
    }
    // resolveChromium prefers @playwright/test (the repo e2e's browser revision) and falls
    // back to the plain playwright package (what the MCPB bundle ships).
    const res = resolveChromium();
    if (!res.chromium) throw new Error('Playwright is not installed. From the AlloFlow repo run: npm install && npx playwright install chromium');
    if (!res.installed) throw new Error('The Chromium browser binary is not installed yet. Call the remediation_setup tool (one-time ~200MB download), or run: npx playwright install chromium');
    const chromium = res.chromium;
    browser = await abortablePromise(chromium.launch({
      headless: process.env.ALLOFLOW_MCP_HEADFUL !== '1',
      // CheerpJ (the veraPDF JVM) boots via timer/rAF loops that Chromium throttles for
      // backgrounded/occluded content — in headless that throttling stalled the boot
      // indefinitely ("CheerpJ runtime ready", then silence). These flags disable it.
      args: ['--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding'],
    }), signal, (lateBrowser) => lateBrowser && lateBrowser.close && lateBrowser.close());
    browser.on('disconnected', () => { browser = null; });
    return browser;
  }

  function trackRunContext(runState, context) {
    if (runState && runState.contexts && context) runState.contexts.add(context);
    return context;
  }

  async function closeRunResources(runState) {
    if (!runState) return;
    const closing = [];
    if (runState.page) {
      try {
        closing.push(runState.page.evaluate(
          () => window.__mcpRunAbortController && window.__mcpRunAbortController.abort(),
        ).catch(() => {}));
      } catch (_) {}
    }
    const contexts = new Set(runState.contexts || []);
    if (runState.context) contexts.add(runState.context);
    for (const context of contexts) {
      if (context && typeof context.close === 'function') {
        closing.push(Promise.resolve(context.close()).catch(() => {}));
      }
    }
    await Promise.allSettled(closing);
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
  // Page images are photographs of a page, not line art, so PNG was the wrong
  // codec: a scanned page cost ~3MB where JPEG q0.82 costs ~0.42MB for the same
  // legibility (measured on an 8-page scan; body text and footnotes stayed
  // readable, and even reverse-side bleed-through survived). It also matters for
  // correctness here: an oversized part is dropped by the agent bridge, so the
  // codec decides whether a page reaches the answering model at all. 0.82 is not
  // a new guess — it is what the app's own page canvases already use, so both
  // lanes now show the model the same fidelity and can be scored against
  // each other.
  const RENDER_IMAGE_MIME = 'image/jpeg';
  const RENDER_IMAGE_QUALITY = 0.82;
  const RENDER_MAX_PAGES = Number(process.env.ALLOFLOW_MCP_MAX_PAGE_IMAGES) || 30;

  async function renderPdfToPageImages(b64, opts) {
    const o = opts || {};
    const rlog = typeof o.onLog === 'function' ? o.onLog : log;
    const signal = o.signal;
    const runState = o.runState;
    const b = await getBrowser(signal);
    const context = trackRunContext(
      runState,
      await abortablePromise(
        b.newContext(),
        signal,
        (lateContext) => lateContext && lateContext.close && lateContext.close(),
      ),
    );
    try {
      const page = await abortablePromise(context.newPage(), signal);
      await abortablePromise(installVendorRuntime(page, { loadPdfjs: true }), signal);
      const loaded = await abortablePromise(
        page.evaluate(() => !!(window.pdfjsLib && window.pdfjsLib.getDocument)),
        signal,
      );
      if (!loaded) throw new Error('Could not load pdf.js from any CDN — page rendering needs it.');
      const out = await abortablePromise(page.evaluate(async ({ b64: data, workers, targetWidth, maxPages, mimeType, quality }) => {
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
          pages.push(canvas.toDataURL(mimeType, quality).split(',')[1] || '');
          canvas.width = 0; canvas.height = 0; // release the backing store now, not at GC
        }
        return { pages, totalPages: total };
      }, { b64, workers: [vendorAssetUrl(PDFJS_WORKER_ASSET)], targetWidth: RENDER_TARGET_WIDTH, maxPages: RENDER_MAX_PAGES, mimeType: RENDER_IMAGE_MIME, quality: RENDER_IMAGE_QUALITY }), signal);

      const bytes = out.pages.reduce((n, p) => n + Math.round(p.length * 0.75), 0);
      const truncated = out.totalPages > out.pages.length;
      rlog('rendered ' + out.pages.length + '/' + out.totalPages + ' page(s) to ' + RENDER_IMAGE_MIME.replace('image/', '').toUpperCase() + ' (' + Math.round(bytes / 1024) + ' KB)'
        + (truncated ? ' — TRUNCATED at the ' + RENDER_MAX_PAGES + '-page cap' : ''));
      return { pages: out.pages, totalPages: out.totalPages, renderedPages: out.pages.length, bytes, truncated };
    } finally {
      try { await context.close(); } catch (_) {}
      runState?.contexts?.delete(context);
    }
  }

  async function newPipelinePage(runOpts) {
    requireModuleFiles();
    // Agent bridge: when the caller supplies modelBridge, the MCP CLIENT's own model answers
    // the pipeline's calls instead of Gemini. No key is required and no Gemini request is made
    // — the prompts (which carry document-derived content) go to the client conversation.
    const modelBridge = typeof runOpts.modelBridge === 'function' ? runOpts.modelBridge : null;
    let apiKey = null;
    if (modelBridge) {
      log('model transport: agent bridge — the MCP client\'s model answers pipeline calls (no Gemini key, no Gemini egress)');
    } else {
      const resolved = resolveGeminiApiKey();
      apiKey = resolved.key;
      if (!apiKey) throw new Error('GEMINI_API_KEY is not set (and no key file was found). The remediation pipeline needs a Gemini API key — set the env var or point ALLOFLOW_MCP_ENV_PATH at an env file containing one.');
      if (resolved.source !== 'env:GEMINI_API_KEY') log('using Gemini key from ' + resolved.source);
    }
    // Per-run log sink: job-based callers route a run's telemetry into that job's record;
    // everything still lands on the driver-level log (stderr) too via the caller's sink.
    const rlog = typeof runOpts.onLog === 'function' ? runOpts.onLog : log;
    const runState = runOpts.runState;
    const transportState = runOpts.transportState;
    const signal = runOpts.signal;
    const trackTransport = (factory) => {
      const pending = Promise.resolve().then(factory);
      if (runState && runState.inFlight) {
        runState.inFlight.add(pending);
        pending.then(
          () => runState.inFlight.delete(pending),
          () => runState.inFlight.delete(pending),
        );
      }
      return pending;
    };
    const b = await getBrowser(signal);
    const context = trackRunContext(
      runState,
      await abortablePromise(
        b.newContext(),
        signal,
        (lateContext) => lateContext && lateContext.close && lateContext.close(),
      ),
    );
    if (runState) runState.context = context;
    const page = await abortablePromise(context.newPage(), signal);
    if (runState) runState.page = page;
    page.on('console', (msg) => {
      const t = msg.text();
      // The pipeline's own telemetry IS the diagnostic — forward the load-bearing lines.
      // [Auto-fix] carries the per-pass ACCEPT/REVERT verdicts and [Legend repair] the
      // re-extraction fallbacks. Without them a fix that was applied, verified, and then
      // reverted by the regression guard simply vanishes with no trace, and neither an
      // operator nor an answering model can tell whether the output was rewritten, the
      // pass was rolled back, or the edit never landed (2026-09-04: a forced-colors block
      // disappeared between passes and this allowlist is why it could not be diagnosed).
      // [PDF Det] reports what the DETERMINISTIC extractor found before any model saw
      // the document — hyperlink and form-control counts, multi-column reading-order
      // repairs, RTL detection. It is the ground truth every later stage inherits, and
      // it was invisible too: the form-field count above had to be chased with a
      // throwaway diagnostic because of it.
      // All of these are low-volume, decision-bearing lines — not per-element chatter.
      if (/\[GeminiGate\]|\[Retry\]|\[PDF Fix\]|\[PDF Det\]|\[Tesseract\]|\[Throttle\]|\[Auto-fix\]|\[WCAG Sanitizer\]|\[Legend repair\]|API-start|Vision-start/.test(t)) rlog(t.slice(0, 500));
      else if (process.env.ALLOFLOW_MCP_VERBOSE === '1') rlog('console: ' + t.slice(0, 300));
    });
    // Web Crypto is unavailable in Chromium's opaque `about:blank` context. The canonical
    // pipeline binds verification evidence to the exact HTML with SHA-256, so boot on a
    // browser-trustworthy loopback origin. Route fulfillment keeps this entirely in-process:
    // no listener, DNS, network request, cookie scope, or document data leaves the machine.
    await abortablePromise(installVendorRuntime(page, { loadCore: true }), signal);

    // Bridge failures cross back to the page in the same envelope shape the Gemini transport
    // uses, so the pipeline's retry/degradation taxonomy applies unchanged.
    const bridgeCall = (kind, prompt, parts) => trackTransport(async () => {
      try {
        if (runOpts.signal && runOpts.signal.aborted) throw Object.assign(new Error('Run cancelled'), { isAbort: true });
        const text = await modelBridge({ kind, prompt: String(prompt), parts });
        if (typeof text !== 'string' || !text.length) throw new Error('agent bridge returned an empty reply');
        return { ok: true, text };
      } catch (e) {
        return {
          ok: false,
          error: {
            message: (e && e.message) || String(e),
            code: (e && e.code) || 'agent_bridge_error',
            isAbort: !!(e && (e.isAbort || e.name === 'AbortError')) || !!(runOpts.signal && runOpts.signal.aborted),
          },
        };
      }
    });
    await page.exposeFunction('__mcpGeminiText', async (prompt) => {
      const parts = [{ text: String(prompt) }];
      if (modelBridge) return bridgeCall('text', prompt, parts);
      return trackTransport(() => geminiCallWithFallback({
        apiKey, model: DEFAULT_MODEL, parts, log: rlog,
        signal: runOpts.signal, transportState,
      }));
    });
    await page.exposeFunction('__mcpGeminiVision', async (prompt, base64Data, mimeType) => {
      const mime = mimeType || 'application/pdf';
      // Image mode: swap the attached document for its rendered pages. Scoped to PDFs on purpose
      // — audio/video transcription and already-image payloads pass through untouched, since the
      // point is to remove the PDF content type, not to re-encode everything.
      const pageImages = runOpts.pageImages;
      const parts = (pageImages && pageImages.length && mime === 'application/pdf')
        ? [{ text: String(prompt) }].concat(
          pageImages.map((p) => ({ inline_data: { mime_type: PAGE_IMAGE_MIME, data: p } }))
        )
        : [{ text: String(prompt) }, { inline_data: { mime_type: mime, data: String(base64Data || '') } }];
      if (modelBridge) return bridgeCall('vision', prompt, parts);
      return trackTransport(() => geminiCallWithFallback({
        apiKey, model: DEFAULT_MODEL, log: rlog, parts,
        signal: runOpts.signal, transportState,
      }));
    });
    await page.exposeFunction('__mcpProgress', async (line) => { rlog('progress: ' + String(line).slice(0, 300)); });
    if (typeof runOpts.onCheckpoint === 'function') {
      await page.exposeFunction('__mcpCheckpoint', async (snapshot) => {
        return runOpts.onCheckpoint(compactTerminalCheckpointSnapshot(snapshot));
      });
    }

    for (const f of MODULE_FILES) await page.addScriptTag({ path: path.join(ASSETS_ROOT, f) });
    await page.waitForFunction(
      () => !!(window.AlloModules && window.AlloModules.VerificationPolicy && window.AlloModules.DocBuilderRenderer && window.AlloModules.createDocPipeline),
      null, { timeout: 30000 }
    );

    await page.evaluate((cfg) => {
      const w = window;
      // Host-state slot the OCR path reads (language picker parity).
      w.__docPipelineState = { pdfOcrLanguage: cfg.ocrLanguage || '', pdfDocumentEpoch: cfg.documentEpoch };
      if (cfg.hostTransportProfile) {
        // Declare the transport's latency character to the pipeline (supported host knob, not a
        // fork). Agent bridge: the "model" is a conversational client that reads a 15–20KB
        // prompt and composes its reply over a tool-call round trip, so per-call deadlines tuned
        // for an HTTP socket (180s text / 120s vision) misread healthy calls as failures, and
        // there is no Gemini quota for pacing or calm probes to protect. Selftest: the scripted
        // loopback answers instantly and has no quota either, so waiting out the rolling start
        // budget (~3 minutes observed) proves nothing about whether the install can remediate.
        w.__alloHostTransportProfile = cfg.hostTransportProfile;
      }
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
        let message = envelope && envelope.message ? envelope.message : 'Gemini call failed';
        if (envelope && envelope.code === 'model_throttled') {
          const retryAfterMs = Number.isFinite(Number(envelope.retryAfterMs))
            ? Math.max(0, Math.round(Number(envelope.retryAfterMs))) : 0;
          message += ' [model_throttled retryAfterMs=' + retryAfterMs
            + ' retryBudgetExhausted=' + (envelope.retryBudgetExhausted === true) + ']';
        } else if (envelope && envelope.code === 'model_quota_exhausted') {
          message += ' [model_quota_exhausted]';
        }
        const err = new Error(message);
        if (envelope) {
          ['code', 'isQuota', 'isAuth', 'isConfig', 'isAbort', 'retryAfterMs', 'retryBudgetExhausted', 'originalMessage', 'classification'].forEach((k) => {
            if (envelope[k] !== undefined) err[k] = envelope[k];
          });
        }
        if (envelope && envelope.isAbort) err.name = 'AbortError';
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
      w.__mcpRunAbortController = new AbortController();
      w.__alloPdfAbortSignal = w.__mcpRunAbortController.signal;
    }, {
      ocrLanguage: runOpts.ocrLanguage || '',
      fileName: runOpts.fileName || '',
      documentEpoch: ++documentEpochSeq,
      hostTransportProfile: runOpts.hostTransportProfile
        || (modelBridge ? {
          kind: 'agent-bridge',
          textInitialMs: 600000, textRetryMs: 600000,
          visionInitialMs: 600000, visionRetryMs: 600000,
          pacingExempt: true, probeExempt: true,
        } : null),
    });

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
    const rendered = await renderPdfToPageImages(runOpts.base64ForRender, {
      onLog: runOpts.onLog,
      signal: runOpts.signal,
      runState: runOpts.runState,
    });
    return Object.assign({}, runOpts, { pageImages: rendered.pages, renderReport: rendered });
  }

  async function withRunPage(runOptsIn, fn) {
    if (activeRun) throw new Error('A remediation run is already active.');
    const parentSignal = runOptsIn && runOptsIn.signal;
    const abort = new AbortController();
    const parentAbort = () => abort.abort(parentSignal.reason || new Error('Run cancelled'));
    if (parentSignal) {
      if (parentSignal.aborted) parentAbort();
      else parentSignal.addEventListener('abort', parentAbort, { once: true });
    }
    const configuredMaxMs = Math.max(
      60000,
      (Number(runOptsIn.maxRunMinutes) || Number(process.env.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30) * 60000,
    );
    const requestedDeadline = Number(runOptsIn.deadlineAt);
    const deadlineAt = Number.isFinite(requestedDeadline) && requestedDeadline > 0
      ? Math.min(requestedDeadline, Date.now() + configuredMaxMs)
      : Date.now() + configuredMaxMs;
    const runState = {
      abort,
      context: null,
      page: null,
      contexts: new Set(),
      inFlight: new Set(),
      operation: null,
    };
    const transportState = {
      retryBudgetRemaining: modelRetryBudget(runOptsIn.modelRetryBudget),
      throttled: false,
      retryAfterMs: null,
      notBeforeAt: 0,
    };
    activeRun = runState;
    const remainingMs = deadlineAt - Date.now();
    let timer = null;
    const deadlinePromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error('remediation_deadline_reached');
        if (!abort.signal.aborted) abort.abort(error);
        closeRunResources(runState).catch(() => {});
        reject(error);
      }, Math.max(0, remainingMs));
      timer.unref?.();
    });
    let operation = null;
    let context = null;
    let page = null;
    try {
      operation = (async () => {
        if (abort.signal.aborted) {
          throw abort.signal.reason || new Error('Run cancelled');
        }
        const runOpts = await abortablePromise(
          prepareVisionMode(Object.assign({}, runOptsIn, {
            signal: abort.signal, runState, transportState,
          })),
          abort.signal,
        );
        const opened = await abortablePromise(
          newPipelinePage(runOpts),
          abort.signal,
        );
        page = opened.page;
        context = opened.context;
        runState.page = page;
        runState.context = context;
        return abortablePromise((async () => {
          const _result = await fn(page);
          // Diagnostics capture — after the operation, before the page closes. Must never
          // fail or slow the run: one bounded evaluate, everything guarded.
          try {
            const _snap = await page.evaluate(() => {
              try {
                return (window.__mcpPipeline && typeof window.__mcpPipeline.getDiagnosticSnapshot === 'function')
                  ? window.__mcpPipeline.getDiagnosticSnapshot() : null;
              } catch (_) { return null; }
            });
            if (_snap) lastRunDiagnostics = { capturedAt: new Date().toISOString(), fileName: (runOpts && runOpts.fileName) || null, snapshot: _snap };
          } catch (_) { /* diagnostics must never break a run */ }
          return _result;
        })(), abort.signal);
      })();
      runState.operation = operation;
      return await Promise.race([operation, deadlinePromise]);
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener?.('abort', parentAbort);
      if (!abort.signal.aborted) abort.abort(new Error('Run transport closed'));
      await closeRunResources(runState);
      await Promise.allSettled([
        ...(operation ? [operation] : []),
        ...Array.from(runState.inFlight),
      ]);
      if (activeRun === runState) activeRun = null;
    }
  }

  // Best-effort cancel of the in-flight run: closing its browser context makes the run's
  // page.evaluate reject immediately, and with it every queued/in-flight Gemini bridge call.
  // Page-per-run isolation means nothing else is affected. Returns false when idle.
  async function cancelActiveRun() {
    const run = activeRun;
    if (!run) return false;
    if (!run.abort.signal.aborted) run.abort.abort(new Error('Run cancelled'));
    await closeRunResources(run);
    await Promise.allSettled([
      ...(run.operation ? [run.operation] : []),
      ...Array.from(run.inFlight),
    ]);
    return true;
  }

  // ── Text-family preprocessing (2026-08-17, MCP 0.3.4) ──────────────────────────────────────
  // The pipeline's entry sniffs PDF magic, Office zips, and image MIME only. The BROWSER handles
  // md/csv/tsv/spreadsheets by converting them in its intake (view_pdf_audit batch reader):
  // sheets → convertXlsxToMarkdownTables (a pipeline export), text → UTF-8 decode, then BOTH →
  // transcribeMediaToPayload(null, 'text/plain', { preText }) which produces the pipeline-native
  // payload. The driver replicates those exact steps IN THE PAGE with the same exported
  // functions, so behavior parity with the app is by construction, not by reimplementation.
  // (.txt rides the text branch — a strict superset of the browser's list.)
  function textFamilyKind(fileName) {
    if (/\.(xlsx|xls|xlsb|ods)$/i.test(fileName || '')) return 'sheet';
    if (/\.(md|markdown|csv|tsv|txt)$/i.test(fileName || '')) return 'text';
    return null;
  }
  // The conversion itself is inlined in each run evaluate (page.evaluate serializes the whole
  // callback, so an inlined helper is the robust form; a shared snippet string is not).
  async function audit(opts) {
    const fileName = path.basename(opts.filePath);
    const b64 = readDocBase64(opts.filePath);
    (opts.onLog || log)('audit: ' + fileName + ' (' + Math.round(b64.length * 0.75 / 1024) + ' KB)');
    return withRunPage(Object.assign({ fileName, base64ForRender: b64 }, opts), (page) =>
      page.evaluate(async ({ b64, fileName, auditorCount, textFamily }) => {
        let effB64 = b64;
        if (textFamily) {
          // Mirror of the browser intake (view_pdf_audit batch reader): sheet → markdown tables,
          // text → UTF-8 decode, both → the pipeline-native text/plain payload.
          const p0 = window.__mcpPipeline;
          let textValue;
          if (textFamily === 'sheet') {
            const cs = await p0.convertXlsxToMarkdownTables(b64, { fileName });
            textValue = '# ' + String(fileName || 'Spreadsheet').replace(/\.(xlsx|xls|xlsb|ods)$/i, '') + '\n\n' + ((cs && cs.text) || '')
              + ((cs && cs.truncatedRows) ? ('\n\n*Note: ' + cs.truncatedRows + ' row(s) beyond the first 200 per sheet were omitted.*') : '');
          } else {
            textValue = new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
          }
          if (!textValue || !textValue.trim()) throw new Error('The file contains no extractable text.');
          const converted = await p0.transcribeMediaToPayload(null, 'text/plain', { preText: textValue, file: { name: fileName } });
          effB64 = (converted && converted.payload) || b64;
        }
        const a = await window.__mcpPipeline.runPdfAccessibilityAudit(effB64, { skipUiUpdates: true, skipCache: true, fileName, auditorCount });
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
      }, { b64, fileName, auditorCount: HEADLESS_AUDITOR_COUNT, textFamily: textFamilyKind(fileName) })
    );
  }

  async function remediate(opts) {
    loadVendorBundle();
    const fileName = path.basename(opts.filePath);
    const b64 = readDocBase64(opts.filePath);
    const _isPdfInput = /\.pdf$/i.test(fileName);
    (opts.onLog || log)('remediate: ' + fileName + ' (' + Math.round(b64.length * 0.75 / 1024) + ' KB, target ' + (opts.targetScore || 95) + ')');
    return withRunPage(Object.assign({ fileName, base64ForRender: b64 }, opts), (page) =>
      page.evaluate(async ({ b64: _rawB64, fileName, targetScore, fixPasses, polishPasses, wantTaggedPdf, wantAutoContinue, autoContinueRounds, pdfLibCdn, auditorCount, resumeCheckpoint, pageRange, textFamily }) => {
        const pipeline = window.__mcpPipeline;
        // Text-family conversion — same mirror of the browser intake as audit()'s evaluate.
        let b64 = _rawB64;
        if (textFamily) {
          let textValue;
          if (textFamily === 'sheet') {
            const cs = await pipeline.convertXlsxToMarkdownTables(_rawB64, { fileName });
            textValue = '# ' + String(fileName || 'Spreadsheet').replace(/\.(xlsx|xls|xlsb|ods)$/i, '') + '\n\n' + ((cs && cs.text) || '')
              + ((cs && cs.truncatedRows) ? ('\n\n*Note: ' + cs.truncatedRows + ' row(s) beyond the first 200 per sheet were omitted.*') : '');
          } else {
            textValue = new TextDecoder().decode(Uint8Array.from(atob(_rawB64), (c) => c.charCodeAt(0)));
          }
          if (!textValue || !textValue.trim()) throw new Error('The file contains no extractable text.');
          const converted = await pipeline.transcribeMediaToPayload(null, 'text/plain', { preText: textValue, file: { name: fileName } });
          b64 = (converted && converted.payload) || _rawB64;
        }
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
        const checkpointEnabled = typeof window.__mcpCheckpoint === 'function';
        const checkpointAuditView = (value) => {
          if (!value || typeof value !== 'object') return null;
          const requestedAuditors = Number.isSafeInteger(value.requestedAuditors) ? value.requestedAuditors : null;
          const completedAuditors = Number.isSafeInteger(value.auditorCount) ? value.auditorCount : null;
          if (requestedAuditors === null || requestedAuditors < 3 || requestedAuditors > auditorCount
            || completedAuditors === null || completedAuditors < requestedAuditors || completedAuditors > auditorCount
            || value._slicedAudit === true || value.sliced === true) return null;
          return {
            score: typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : null,
            documentLanguage: typeof value.documentLanguage === 'string' ? value.documentLanguage.slice(0, 32) : null,
            requestedAuditors,
            auditorCount: completedAuditors,
            sliced: false,
          };
        };
        const auditFromCheckpoint = (value) => {
          const view = checkpointAuditView(value);
          return view ? {
            score: view.score,
            documentLanguage: view.documentLanguage,
            requestedAuditors: view.requestedAuditors,
            auditorCount: view.auditorCount,
            _slicedAudit: false,
          } : null;
        };
        let audit = null;
        let cur = null;
        let roundsRun = 0;
        let roundLog = [];
        let nextRound = 0;
        let lastViolations = Infinity;
        let lastDet = -1;
        let lastIssues = Infinity;
        let stagnant = 0;
        let autoContinueDone = false;
        let resumeExtractionApplied = false;
        const checkpointLoopState = () => ({
          lastViolations: Number.isFinite(lastViolations) ? lastViolations : null,
          lastDet: Number.isFinite(lastDet) ? lastDet : null,
          lastIssues: Number.isFinite(lastIssues) ? lastIssues : null,
          stagnant,
        });
        const isComplete = (r) => !!(r
          && r.verificationState === 'complete'
          && r.afterScoreVerified === true
          && !r.requiresManualReview
          && pipeline.isLiveVerificationHtmlBound(r, r.accessibleHtml));
        const emitCheckpoint = async (snapshot) => {
          if (!checkpointEnabled) return null;
          const auditView = checkpointAuditView(audit);
          if (!auditView) throw new Error('checkpoint_snapshot_invalid');
          let portable;
          try {
            portable = JSON.parse(JSON.stringify(Object.assign({}, snapshot, { audit: auditView })));
          } catch (_) {
            throw new Error('checkpoint_snapshot_invalid');
          }
          return window.__mcpCheckpoint(portable);
        };
        const resume = resumeCheckpoint && typeof resumeCheckpoint === 'object'
          ? resumeCheckpoint : null;
        if (resume && resume.schema === 1 && resume.stage === 'extraction'
          && resume.extraction && typeof resume.extraction === 'object') {
          const restoredAudit = auditFromCheckpoint(resume.audit);
          const extraction = resume.extraction;
          if (restoredAudit
            && extraction.fileName === fileName
            && /^sha256:[a-f0-9]{64}$/.test(String(extraction.documentDigest || ''))
            && typeof extraction.text === 'string' && extraction.text.length > 0) {
            // The checkpoint carries only bounded audit identity/evidence. The full
            // baseline audit is rerun before fixAndVerifyPdf consumes auditResult.
            window.__resumeExtractedText = {
              fileName: extraction.fileName,
              text: extraction.text,
              extractedText: extraction.text,
              docKey: extraction.documentDigest,
              groundTruthCharCount: extraction.groundTruthCharCount || extraction.text.length,
              groundTruthPages: Array.isArray(extraction.groundTruthPages) ? extraction.groundTruthPages : null,
              groundTruthMethod: extraction.groundTruthMethod || null,
              ocrMethod: extraction.ocrMethod || null,
              ocrTesseractText: extraction.ocrTesseractText || '',
              ocrVisionText: extraction.ocrVisionText || '',
              ocrDisagreements: Array.isArray(extraction.ocrDisagreements) ? extraction.ocrDisagreements : [],
              ocrPageErrors: Array.isArray(extraction.ocrPageErrors) ? extraction.ocrPageErrors : [],
              ocrLowConfidencePages: Array.isArray(extraction.ocrLowConfidencePages) ? extraction.ocrLowConfidencePages : [],
              detectedFolios: Array.isArray(extraction.detectedFolios) ? extraction.detectedFolios : [],
              ocrDupeCollapses: Array.isArray(extraction.ocrDupeCollapses) ? extraction.ocrDupeCollapses : [],
              ocrColumnReorders: Array.isArray(extraction.ocrColumnReorders) ? extraction.ocrColumnReorders : [],
              strippedEdgeLines: Array.isArray(extraction.strippedEdgeLines) ? extraction.strippedEdgeLines : [],
              visionStripTrail: Array.isArray(extraction.visionStripTrail) ? extraction.visionStripTrail : [],
            };
            resumeExtractionApplied = true;
          }
        } else if (resume && resume.schema === 1
          && (resume.stage === 'primary' || resume.stage === 'round')
          && resume.remediation && typeof resume.remediation.accessibleHtml === 'string') {
          const restoredAudit = auditFromCheckpoint(resume.audit);
          try {
            const rebound = await pipeline.rehydrateVerificationHtmlBinding(resume.remediation);
            const progressValid = resume.stage === 'primary'
              ? resume.nextRound === 0 && resume.roundsRun === 0
              : resume.nextRound > 0 && resume.nextRound === resume.roundsRun;
            if (restoredAudit && progressValid
              && pipeline.isLiveVerificationHtmlBound(rebound, rebound.accessibleHtml)) {
              audit = restoredAudit;
              cur = rebound;
              roundsRun = resume.roundsRun;
              nextRound = resume.nextRound;
              roundLog = Array.isArray(resume.roundLog) ? resume.roundLog.slice(0, 64) : [];
              const loop = resume.loopState && typeof resume.loopState === 'object' ? resume.loopState : {};
              lastViolations = Number.isFinite(loop.lastViolations) ? loop.lastViolations : Infinity;
              lastDet = Number.isFinite(loop.lastDet) ? loop.lastDet : -1;
              lastIssues = Number.isFinite(loop.lastIssues) ? loop.lastIssues : Infinity;
              stagnant = Number.isSafeInteger(loop.stagnant) ? Math.max(0, Math.min(10, loop.stagnant)) : 0;
              autoContinueDone = resume.autoContinueDone === true;
              progress('checkpoint', 'resumed ' + resume.stage + ' boundary');
            }
          } catch (_) {
            audit = null;
            cur = null;
          }
        }
        if (!audit) {
          progress('audit', 'opening accessibility audit');
          audit = await pipeline.runPdfAccessibilityAudit(b64, { skipUiUpdates: true, skipCache: true, fileName, auditorCount });
          progress('audit', 'before-score ' + (audit && audit.score));
        }
        if (!cur) {
          const fixOptions = {
            base64: b64, fileName, auditResult: audit,
            // (2026-08-17) Optional page-range remediation — fixAndVerifyPdf's own batchOverrides
            // contract; the pipeline normalizes a full-document range back to null itself.
            ...(Array.isArray(pageRange) && pageRange.length === 2 ? { pageRange } : {}),
            targetScore: targetScore, autoFixPasses: fixPasses, polishPasses: polishPasses, auditorCount,
            onProgress: (step, msg) => progress('fix', (typeof step === 'number' ? 'step ' + step + ': ' : '') + (msg || '')),
          };
          if (checkpointEnabled && !resumeExtractionApplied) {
            fixOptions.onCheckpoint = async (snapshot) => {
              if (!snapshot || snapshot.schema !== 1 || snapshot.stage !== 'extraction'
                || !snapshot.extraction || typeof snapshot.extraction.text !== 'string') throw new Error('checkpoint_snapshot_invalid');
              return emitCheckpoint({
                schema: 1,
                stage: 'extraction',
                extraction: snapshot.extraction,
              });
            };
          }
          cur = await pipeline.fixAndVerifyPdf(fixOptions);
          if (cur && typeof cur.accessibleHtml === 'string') {
            cur = await pipeline.rehydrateVerificationHtmlBinding(cur);
          }
          if (!cur || !pipeline.isLiveVerificationHtmlBound(cur, cur.accessibleHtml)) {
            throw new Error('Canonical verification binding could not be restored.');
          }
          autoContinueDone = !wantAutoContinue || isComplete(cur);
          await emitCheckpoint({
            schema: 1,
            stage: 'primary',
            remediation: cur,
            nextRound: 0,
            roundsRun: 0,
            roundLog: [],
            loopState: checkpointLoopState(),
            autoContinueDone,
          });
        }
        if (wantAutoContinue && !autoContinueDone && cur && typeof cur.accessibleHtml === 'string') {
          for (let round = nextRound; round < autoContinueRounds; round++) {
        // ── AUTO-CONTINUE (#6-full payoff): the SAME improvement loop the app runs, merging every
        // accepted round through the ONE canonical reducer (finalizeRemediationRound) — so the
        // connector and the app can never disagree about what a round means. Branch fidelity
        // mirrors the host: axe violations → deterministic autoFixAxeViolations; AI-flagged
        // issues (+ Equal-Access-confirmed lines, finding 7) → aiFixChunked; nothing fixable but
        // verification incomplete → ONE audit-only evidence refresh. Loop POLICY mirrors the host
        // too: wait-not-stop calm gate per round, noise-aware revert on a REAL deterministic
        // regression (the reducer's _detScore), two-stall abandon.
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
            autoContinueDone = !!roundOut._auditOnly
              || round + 1 >= autoContinueRounds
              || ((cur.afterScore || 0) >= targetScore && isComplete(cur));
            await emitCheckpoint({
              schema: 1,
              stage: 'round',
              remediation: cur,
              nextRound: round + 1,
              roundsRun,
              roundLog: roundLog.slice(-64).map((line) => String(line).slice(0, 1000)),
              loopState: checkpointLoopState(),
              autoContinueDone,
            });
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
        pageRange: (Array.isArray(opts.pageRange) && opts.pageRange.length === 2)
          ? [Math.max(1, Number(opts.pageRange[0]) || 1), Math.max(1, Number(opts.pageRange[1]) || 1)]
          : null,
        textFamily: textFamilyKind(fileName),
        // Tagged-PDF export is a PDF-in → PDF-out artifact; for DOCX/PPTX inputs the
        // accessible HTML is the deliverable (matches the app).
        wantTaggedPdf: opts.taggedPdf !== false && _isPdfInput,
        wantAutoContinue: !!opts.autoContinue,
        autoContinueRounds: Math.max(1, Math.min(5, Number(opts.autoContinueRounds) || 3)),
        resumeCheckpoint: opts.resumeCheckpoint || null,
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

  const VALIDATION_HEARTBEAT_MS = 12000;

  function validationCancelledError(signal) {
    const reason = signal && signal.reason;
    const detail = reason && reason.message ? ': ' + String(reason.message).slice(0, 200) : '';
    const error = new Error('veraPDF validation cancelled' + detail);
    error.name = 'AbortError';
    error.code = 'ALLOFLOW_VALIDATION_CANCELLED';
    if (reason !== undefined) error.cause = reason;
    return error;
  }

  function validationTelemetry(opts, label) {
    const o = opts || {};
    const sink = typeof o.onProgress === 'function' ? o.onProgress
      : (typeof o.onLog === 'function' ? o.onLog : log);
    const startedAt = Date.now();
    let settled = false;
    let pulse = null;
    const emit = (message) => {
      try { sink(String(message)); } catch (_) {}
    };
    emit('veraPDF validation started: ' + label);
    pulse = setInterval(() => {
      emit('veraPDF validation still running (' + Math.max(1, Math.round((Date.now() - startedAt) / 1000)) + 's elapsed)');
    }, VALIDATION_HEARTBEAT_MS);
    pulse.unref?.();
    return {
      startedAt,
      finish(message) {
        if (settled) return;
        settled = true;
        if (pulse) clearInterval(pulse);
        emit(message);
      },
    };
  }

  // Read once, then validate that immutable snapshot rather than reopening the caller's path.
  // Besides removing the path-change/TOCTOU window, this lets every verdict identify the exact
  // bytes it covered. The bounded allocation happens only after fstat on the opened handle.
  function snapshotPdfForValidation(inputPath, maxBytes) {
    const filePath = path.resolve(String(inputPath || ''));
    let fd;
    try { fd = fs.openSync(filePath, 'r'); } catch (_) { throw new Error('veraPDF input is not a regular file'); }
    try {
      const stat = fs.fstatSync(fd);
      const limit = Number(maxBytes) || 50 * 1024 * 1024;
      if (!stat.isFile()) throw new Error('veraPDF input is not a regular file');
      if (stat.size < 5 || stat.size > limit) throw new Error('veraPDF input is outside the bounded size range');
      const bytes = Buffer.allocUnsafe(stat.size);
      let offset = 0;
      while (offset < bytes.length) {
        const read = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
        if (!read) break;
        offset += read;
      }
      if (offset !== bytes.length) throw new Error('veraPDF input changed while its immutable validation snapshot was being read');
      if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('veraPDF input is not a PDF');
      return {
        filePath,
        fileName: path.basename(filePath),
        bytes,
        inputBytes: bytes.length,
        inputSha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      };
    } finally {
      try { fs.closeSync(fd); } catch (_) {}
    }
  }

  function bindValidationResult(result, snapshot, startedAt, overrides) {
    return Object.assign({}, result || {}, overrides || {}, {
      inputSha256: snapshot.inputSha256,
      inputBytes: snapshot.inputBytes,
      profile: 'ua1',
      validatorVersion: (overrides && Object.prototype.hasOwnProperty.call(overrides, 'validatorVersion'))
        ? overrides.validatorVersion
        : ((result && result.validatorVersion) || null),
      validatedAt: new Date().toISOString(),
      validationDurationMs: Math.max(0, Date.now() - startedAt),
    });
  }

  // Offline PDF/UA-1 validation for the remote runner. Production calls the pinned veraPDF CLI
  // JAR directly through Java so neither document bytes nor executable dependencies leave the
  // container. The caller may cancel via AbortSignal; cancellation terminates the Java process.
  async function validatePdfUaCli(opts) {
    const o = opts || {};
    const signal = o.signal;
    if (signal && signal.aborted) throw validationCancelledError(signal);
    const snapshot = snapshotPdfForValidation(o.filePath, o.maxBytes);
    const telemetry = validationTelemetry(o, snapshot.fileName + ' (' + snapshot.inputBytes + ' bytes; local Java CLI)');
    const jarPath = path.resolve(process.env.ALLOFLOW_MCP_VERAPDF_CLI || path.join(ASSETS_ROOT, 'verapdf', 'verapdf-cli.jar'));
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-verapdf-'));
    const immutablePath = path.join(scratch, 'input-' + snapshot.inputSha256.slice(0, 16) + '.pdf');
    try {
      if (!fs.existsSync(jarPath)) throw new Error('veraPDF CLI JAR is not packaged: ' + jarPath);
      fs.writeFileSync(immutablePath, snapshot.bytes, { flag: 'wx', mode: 0o600 });
      // veraPDF is normally much faster, but cold JVM/classloading on a busy CI or synced Windows
      // profile can exceed two minutes. Progress pulses keep the wider fail-safe observable.
      const timeoutMs = Math.max(1000, Math.min(300000, Number(o.timeoutMs) || 300000));
      const javaBin = process.env.ALLOFLOW_MCP_JAVA_BIN || 'java';
      const args = ['-jar', jarPath, '--format', 'json', '--flavour', 'ua1', '--maxfailuresdisplayed', '25', '--loglevel', '1', immutablePath];
      const result = await new Promise((resolve, reject) => {
        const child = spawnProcess(javaBin, args, { stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
        let stdout = '';
        let timer = null;
        let forcedFinish = null;
        let settled = false;
        let terminationError = null;
        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (forcedFinish) clearTimeout(forcedFinish);
          signal?.removeEventListener?.('abort', onAbort);
        };
        const finish = (fn, value) => { if (settled) return; settled = true; cleanup(); fn(value); };
        const terminate = (error) => {
          if (settled || terminationError) return;
          terminationError = error;
          try { child.kill('SIGKILL'); } catch (_) {}
          // `close` normally follows immediately. Bound the wait so a platform-specific failed
          // kill cannot leave the RPC pending forever; the child handle is already unreferenced.
          forcedFinish = setTimeout(() => finish(reject, terminationError), 5000);
          forcedFinish.unref?.();
        };
        const onAbort = () => terminate(validationCancelledError(signal));
        if (signal && signal.aborted) onAbort();
        else signal?.addEventListener?.('abort', onAbort, { once: true });
        child.stdout.on('data', (chunk) => {
          stdout += String(chunk);
          if (stdout.length > 4 * 1024 * 1024) terminate(new Error('veraPDF output exceeded the bounded limit'));
        });
        child.on('error', (error) => finish(reject, new Error('veraPDF CLI could not start: ' + error.message)));
        child.on('close', (code) => {
          if (terminationError) return finish(reject, terminationError);
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
            validator: 'veraPDF',
            validatorVersion: core && typeof core.version === 'string' ? core.version : null,
            failedRules: count(details.failedRules), failedChecks: count(details.failedChecks),
            passedRules: count(details.passedRules), passedChecks: count(details.passedChecks),
            failedRuleSummaries,
          });
        });
        timer = setTimeout(() => terminate(new Error('veraPDF validation timed out')), timeoutMs);
        timer.unref?.();
      });
      const bound = bindValidationResult(result, snapshot, telemetry.startedAt);
      telemetry.finish('veraPDF validation complete: ' + bound.status + ' (' + bound.validationDurationMs + 'ms)');
      return bound;
    } catch (error) {
      const finalError = signal && signal.aborted && (!error || error.code !== 'ALLOFLOW_VALIDATION_CANCELLED')
        ? validationCancelledError(signal) : error;
      telemetry.finish(finalError && finalError.code === 'ALLOFLOW_VALIDATION_CANCELLED'
        ? 'veraPDF validation cancelled'
        : 'veraPDF validation failed: ' + String(finalError && finalError.message || finalError).slice(0, 240));
      throw finalError;
    } finally {
      try { fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch (_) {}
    }
  }

  // Independent PDF/UA-1 (ISO 14289-1) validation via the SAME in-browser veraPDF the app
  // uses: the validator page boots a real JVM (CheerpJ) and accepts postMessage
  // {verapdf-validate, bytes} → replies {verapdf-result} to ev.source. We load it TOP-LEVEL
  // and post to our own window (the reply comes straight back) — an about:blank host with a
  // loopback IFRAME is silently blocked by Chromium's Private Network Access rules, and
  // readiness is visible in the page's own #status line. Needs NO Gemini key and touches NO
  // pipeline globals, so it runs in its own context OUTSIDE the single-flight lane and
  // deliberately never occupies activeRun (a job cancel must not kill a validation).
  async function validatePdfUa(opts) {
    const o = opts || {};
    const signal = o.signal;
    if (signal && signal.aborted) throw validationCancelledError(signal);
    // This compatibility path loads CheerpJ and pdf-lib from public CDNs. It receives document
    // bytes only through postMessage on the loopback page, but it is still network-dependent and
    // therefore must never silently replace the fully local Java CLI.
    if (process.env.ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS !== '1') {
      const error = new Error('veraPDF browser fallback is disabled because it downloads public runtime dependencies. Install local Java for the offline CLI, or explicitly set ALLOFLOW_MCP_ALLOW_BROWSER_VERAPDF_EGRESS=1.');
      error.code = 'ALLOFLOW_BROWSER_VERAPDF_EGRESS_DISABLED';
      throw error;
    }
    const snapshot = snapshotPdfForValidation(o.filePath, o.maxBytes);
    const b64 = snapshot.bytes.toString('base64');
    const telemetry = validationTelemetry(o, snapshot.fileName + ' (' + snapshot.inputBytes + ' bytes; browser compatibility fallback)');
    const rlog = typeof o.onProgress === 'function' ? o.onProgress
      : (typeof o.onLog === 'function' ? o.onLog : log);
    try {
      const b = await getBrowser(signal);
      const validatorUrl = await abortablePromise(getVerapdfUrl(), signal);
      // CheerpJ's boot occasionally races itself ("Java code still running") — observed ~1 in 3
      // cold boots headless. A fresh page reliably recovers, so one retry is part of the contract.
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (attempt > 1) rlog('veraPDF: boot hiccup (' + String(lastErr && lastErr.message).slice(0, 120) + ') — retrying on a fresh page');
        try {
          const result = await _validateOnFreshPage(b, validatorUrl, b64, rlog, signal);
          const bound = bindValidationResult(result, snapshot, telemetry.startedAt, {
            status: result && result.compliant ? 'compliant' : 'noncompliant',
            validator: 'veraPDF browser',
            validatorVersion: (result && result.validatorVersion) || null,
          });
          telemetry.finish('veraPDF validation complete: ' + bound.status + ' (' + bound.validationDurationMs + 'ms)');
          return bound;
        } catch (e) {
          lastErr = signal && signal.aborted ? validationCancelledError(signal) : e;
          if (lastErr.code === 'ALLOFLOW_VALIDATION_CANCELLED'
            || !/Java code still running|not ready within|Boot failed/i.test(String(lastErr && lastErr.message))) throw lastErr;
        }
      }
      throw lastErr;
    } catch (error) {
      const finalError = signal && signal.aborted && (!error || error.code !== 'ALLOFLOW_VALIDATION_CANCELLED')
        ? validationCancelledError(signal) : error;
      telemetry.finish(finalError && finalError.code === 'ALLOFLOW_VALIDATION_CANCELLED'
        ? 'veraPDF validation cancelled'
        : 'veraPDF validation failed: ' + String(finalError && finalError.message || finalError).slice(0, 240));
      throw finalError;
    }
  }

  async function _validateOnFreshPage(b, validatorUrl, b64, rlog, signal) {
    let context = null;
    let closeOnAbort = null;
    try {
      context = await abortablePromise(b.newContext(), signal, (lateContext) => lateContext?.close?.());
      const page = await abortablePromise(context.newPage(), signal);
      if (process.env.ALLOFLOW_MCP_VERBOSE === '1') page.on('console', (m) => rlog('verapdf console: ' + m.text().slice(0, 300)));
      closeOnAbort = () => { try { context.close().catch(() => {}); } catch (_) {} };
      signal?.addEventListener?.('abort', closeOnAbort, { once: true });
      await abortablePromise(page.goto(validatorUrl, { waitUntil: 'domcontentloaded' }), signal);
      const result = await abortablePromise(page.evaluate(({ b64, bootMs, validateMs }) => new Promise((resolve, reject) => {
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
      }), { b64, bootMs: 180000, validateMs: 240000 }), signal);
      rlog('veraPDF: ' + (result && result.compliant ? 'COMPLIANT' : (result ? result.failedChecks + ' failed check(s) across ' + (result.failedRules || []).length + ' rule(s)' : 'no result')));
      return result;
    } finally {
      if (closeOnAbort) signal?.removeEventListener?.('abort', closeOnAbort);
      try { if (context) await context.close(); } catch (_) {}
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
    // Tagged on purpose (2026-08-24): the structure tree exercises the Document Safety
    // scanner's ref -> StructElem dict -> K array -> MCID number walk, the exact path where
    // minified-pdf-lib type detection silently failed and blocked every tagged-PDF export
    // with active_content_scan_unavailable. A selftest that only shipped an untagged page
    // could never catch that class of regression.
    const body = '/P <</MCID 0>> BDC\nBT /F1 16 Tf 72 700 Td (' + SELFTEST_MARKER + ') Tj ET\nEMC\n';
    const objs = [
      null,
      '<</Type/Catalog/Pages 2 0 R/MarkInfo<</Marked true>>/StructTreeRoot 6 0 R>>',
      '<</Type/Pages/Kids[3 0 R]/Count 1>>',
      '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R/StructParents 0>>',
      '<</Length ' + Buffer.byteLength(body, 'latin1') + '>>\nstream\n' + body + 'endstream',
      '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
      '<</Type/StructTreeRoot/K 7 0 R/ParentTree<</Nums[0 [7 0 R]]>>>>',
      '<</Type/StructElem/S/P/P 6 0 R/Pg 3 0 R/K[0]>>',
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
    if (/vendor (?:manifest|asset|bundle)|hash verification|integrity/i.test(m)) return { stage: 'assets', hint: 'A bundled vendor asset is missing or failed its integrity hash. Reinstall or rebuild the connector; do not bypass the integrity gate.' };
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
        // The loopback model is instant and quota-free: exempt the run from quota pacing so the
        // selftest verifies the INSTALL (its advertised 20-60s), not the rate limiter. Deadlines
        // and probes stay at Gemini-lane defaults to keep the transport path representative.
        hostTransportProfile: { kind: 'selftest-loopback', pacingExempt: true },
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

  // (2026-08-17) audit_html: the pipeline's native two-engine audit on caller-supplied HTML.
  // Title II is web-first, and this is the same evidence stack every internal reverify uses
  // (AI rubric + axe). File/string input only — no URL fetching, so document egress stays
  // exactly what the key configuration says.
  async function auditHtml(opts) {
    const o = opts || {};
    (o.onLog || log)('audit_html: ' + (o.fileName || 'page.html') + ' (' + Math.round(String(o.html || '').length / 1024) + ' KB)');
    return withRunPage(Object.assign({ fileName: o.fileName || 'page.html' }, o), (page) =>
      page.evaluate(async ({ html, fileName }) => {
        const p = window.__mcpPipeline;
        const [ai, axe] = await Promise.all([
          p.auditOutputAccessibility(html, { trigger: 'mcp-html-audit' }),
          p.runAxeAudit(html).catch(() => null),
        ]);
        const issues = (ai && Array.isArray(ai.issues) ? ai.issues : []).slice(0, 60)
          .map((i) => ({ issue: (i && (i.issue || i.description)) || '', wcag: (i && i.wcag) || '', severity: (i && i.severity) || '' }));
        return {
          fileName,
          score: ai && typeof ai.score === 'number' ? ai.score : null,
          sectionsAudited: (ai && Number.isFinite(ai.chunksAudited)) ? ai.chunksAudited : null,
          sectionsRequested: (ai && Number.isFinite(ai.chunksRequested)) ? ai.chunksRequested : null,
          issueCount: issues.length,
          issues,
          passCount: (ai && Array.isArray(ai.passes)) ? ai.passes.length : null,
          axeViolations: axe && axe.totalViolations != null ? axe.totalViolations : null,
          axeScore: axe && typeof axe.score === 'number' ? axe.score : null,
        };
      }, { html: String(o.html || ''), fileName: o.fileName || 'page.html' })
    );
  }

  async function close() {
    if (activeRun) await cancelActiveRun();
    if (verapdfServer) { try { verapdfServer.close(); } catch (_) {} verapdfServer = null; }
    if (browser) { try { await browser.close(); } catch (_) {} browser = null; }
  }

  return {
    audit, remediate, validatePdfUa, validatePdfUaCli, selfTest, renderPdfToPageImages, exportAccessibleOffice,
    fixContrast, buildConformanceReport, generateResourcePack, describeImages, transcribeMedia, translateHtml,
    redactDocumentHtml, extractDocumentText, inspectFormFields, applyFormFields, simplifyHtml,
    auditWithBothEngines, htmlDerivatives, exportAltFormat, auditHtml,
    cancelActiveRun, close,
    takeLastRunDiagnostics: () => lastRunDiagnostics,
    // Test-only surfaces for the agent-bridge end-to-end test: the same scripted replies and
    // one-page PDF the keyless selftest uses, so a bridge-transported run can be driven to
    // completion without any model. Not part of the tool surface.
    _selfTestScriptedReply: selfTestReply,
    _buildSelfTestPdf: buildSelfTestPdf,
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

module.exports = {
  createDriver,
  compactTerminalCheckpointSnapshot,
  terminalCheckpointRemediationCapsule,
  TERMINAL_CHECKPOINT_CAPSULE_SCHEMA,
  TERMINAL_CHECKPOINT_REMEDIATION_FIELDS,
  classifyHttpFailure,
  providerRetryAfterMs,
  geminiGenerate,
  resolveGeminiApiKey,
  verifyGeminiApiKey,
  resolveChromium,
  installChromium,
  verifyVendorBundle,
  normalizeVendorAssetBytes,
  NORMALIZED_VENDOR_TEXT_PATHS,
  REPO_ROOT,
  ASSETS_ROOT,
  MODULE_FILES,
};

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
