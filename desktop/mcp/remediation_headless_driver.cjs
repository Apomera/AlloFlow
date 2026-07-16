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
 * Requires: network (Gemini API + the pipeline's CDN libraries: pdf.js,
 * Tesseract, pdf-lib, axe). No AlloFlow server involved.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MODULE_FILES = [
  'verification_policy_module.js',
  'doc_builder_renderer_module.js',
  'doc_pipeline_module.js',
];
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

// veraPDF validator transport. The page + its 16MB JAR live in the repo (verapdf/), and
// CheerpJ (the in-browser JVM) REQUIRES HTTP Range (206) responses to load a JAR — the
// hosted CDN copy fails that requirement at some edges ("HTTP server does not support the
// 'Range' header. CheerpJ cannot run.", observed 2026-07-16), so the driver serves the repo
// copy from a loopback HTTP server with real Range support. ALLOFLOW_MCP_VERAPDF_URL
// overrides (it must point at a Range-capable host).
const VERAPDF_URL_OVERRIDE = process.env.ALLOFLOW_MCP_VERAPDF_URL || '';

const DEFAULT_MODEL = process.env.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview';
const FALLBACK_MODEL = process.env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function defaultLog(msg) { process.stderr.write('[alloflow-remediation] ' + msg + '\n'); }

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
  const url = GEMINI_BASE + '/' + model + ':generateContent?key=' + encodeURIComponent(apiKey);
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

  function requireModuleFiles() {
    const missing = MODULE_FILES.filter((f) => !fs.existsSync(path.join(REPO_ROOT, f)));
    if (missing.length) throw new Error('Pipeline module file(s) missing from the repo root: ' + missing.join(', '));
  }

  async function getBrowser() {
    if (browser) return browser;
    // Prefer @playwright/test's chromium: it is what the repo's e2e suite runs with, so its
    // browser revision is the one actually installed on this machine. Fall back to the plain
    // playwright package (a fresh `npx playwright install chromium` serves either).
    let chromium = null;
    for (const pkg of ['@playwright/test', 'playwright']) {
      try { const m = require(pkg); if (m && m.chromium) { chromium = m.chromium; break; } } catch (_) {}
    }
    if (!chromium) throw new Error('Playwright is not installed. From the AlloFlow repo run: npm install && npx playwright install chromium');
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

  async function newPipelinePage(runOpts) {
    requireModuleFiles();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set. The remediation pipeline needs a Gemini API key.');
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
    await page.goto('about:blank');

    await page.exposeFunction('__mcpGeminiText', async (prompt) => {
      return geminiCallWithFallback({ apiKey, model: DEFAULT_MODEL, parts: [{ text: String(prompt) }], log: rlog });
    });
    await page.exposeFunction('__mcpGeminiVision', async (prompt, base64Data, mimeType) => {
      return geminiCallWithFallback({
        apiKey, model: DEFAULT_MODEL, log: rlog,
        parts: [{ text: String(prompt) }, { inline_data: { mime_type: mimeType || 'application/pdf', data: String(base64Data || '') } }],
      });
    });
    await page.exposeFunction('__mcpProgress', async (line) => { rlog('progress: ' + String(line).slice(0, 300)); });

    for (const f of MODULE_FILES) await page.addScriptTag({ path: path.join(REPO_ROOT, f) });
    await page.waitForFunction(
      () => !!(window.AlloModules && window.AlloModules.VerificationPolicy && window.AlloModules.DocBuilderRenderer && window.AlloModules.createDocPipeline),
      null, { timeout: 30000 }
    );

    await page.evaluate((cfg) => {
      const w = window;
      // Host-state slot the OCR path reads (language picker parity).
      w.__docPipelineState = { pdfOcrLanguage: cfg.ocrLanguage || '' };
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
    }, { ocrLanguage: runOpts.ocrLanguage || '', fileName: runOpts.fileName || '' });

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

  async function withRunPage(runOpts, fn) {
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
    return withRunPage(Object.assign({ fileName }, opts), (page) =>
      page.evaluate(async ({ b64, fileName }) => {
        const a = await window.__mcpPipeline.runPdfAccessibilityAudit(b64, { skipUiUpdates: true, skipCache: true, fileName });
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
          _fullAudit: a,
        };
      }, { b64, fileName })
    );
  }

  async function remediate(opts) {
    const fileName = path.basename(opts.filePath);
    const b64 = readDocBase64(opts.filePath);
    const _isPdfInput = /\.pdf$/i.test(fileName);
    (opts.onLog || log)('remediate: ' + fileName + ' (' + Math.round(b64.length * 0.75 / 1024) + ' KB, target ' + (opts.targetScore || 95) + ')');
    return withRunPage(Object.assign({ fileName }, opts), (page) =>
      page.evaluate(async ({ b64, fileName, targetScore, fixPasses, polishPasses, wantTaggedPdf, pdfLibCdn }) => {
        const pipeline = window.__mcpPipeline;
        const progress = (stage, msg) => { try { window.__mcpProgress(stage + ' — ' + msg); } catch (_) {} };
        progress('audit', 'opening accessibility audit');
        const audit = await pipeline.runPdfAccessibilityAudit(b64, { skipUiUpdates: true, skipCache: true, fileName });
        progress('audit', 'before-score ' + (audit && audit.score));
        const result = await pipeline.fixAndVerifyPdf({
          base64: b64, fileName, auditResult: audit,
          targetScore: targetScore, autoFixPasses: fixPasses, polishPasses: polishPasses,
          onProgress: (step, msg) => progress('fix', (typeof step === 'number' ? 'step ' + step + ': ' : '') + (msg || '')),
        });
        const verdict = (() => {
          try { return pipeline.distributionVerdict(result, { targetScore }); } catch (_) { return null; }
        })();
        let taggedPdfB64 = null, taggedPdfError = null;
        if (wantTaggedPdf) {
          try {
            progress('tag', 'building tagged PDF');
            if (!(window.PDFLib && window.PDFLib.PDFDocument)) {
              await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = pdfLibCdn; s.onload = res; s.onerror = () => rej(new Error('pdf-lib CDN load failed'));
                document.head.appendChild(s);
              });
            }
            const bin = atob(b64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const tagged = await pipeline.createTaggedPdf(bytes, result, {
              title: fileName.replace(/\.pdf$/i, ''),
              lang: (result && result.documentLanguage) || (audit && audit.documentLanguage) || 'en',
              subject: 'Remediated for accessibility by AlloFlow',
            });
            const outBytes = tagged && (tagged.bytes || tagged);
            if (outBytes && outBytes.length) {
              let ob = ''; const CH = 0x8000;
              for (let i = 0; i < outBytes.length; i += CH) ob += String.fromCharCode.apply(null, Array.from(outBytes.subarray(i, i + CH)));
              taggedPdfB64 = btoa(ob);
              if (tagged && tagged.declarationWithheld !== undefined) progress('tag', 'PDF/UA declaration withheld: ' + !!tagged.declarationWithheld);
            } else taggedPdfError = 'createTaggedPdf returned no bytes';
          } catch (e) { taggedPdfError = (e && e.message) || String(e); }
        }
        const stats = (() => { try { return pipeline.getPipelineStats(); } catch (_) { return null; } })();
        return {
          beforeScore: audit && typeof audit.score === 'number' ? audit.score : null,
          afterScore: result ? (typeof result.afterScore === 'number' ? result.afterScore : null) : null,
          verdict,
          aiVerificationIncomplete: !!(result && result._aiVerificationIncomplete),
          scoreSource: (result && result._scoreSource) || null,
          estimatedMinimumScore: (result && result._estimatedMinimumScore) !== undefined ? result._estimatedMinimumScore : null,
          integrityCoverage: (result && result.integrityCoverage) !== undefined ? result.integrityCoverage : null,
          integrityWarning: (result && result.integrityWarning) || null,
          fidelityNotes: ((result && result.fidelityNotes) || []).map((n) => ({ kind: n.kind, msg: (n.msg || n.message || '').slice(0, 400) })),
          verificationState: (result && result.verificationState) || null,
          runId: (result && result._runId) || null,
          accessibleHtml: (result && result.accessibleHtml) || null,
          taggedPdfB64, taggedPdfError,
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
        pdfLibCdn: PDFLIB_CDN,
      })
    );
  }

  // Loopback static server for verapdf/ with REAL Range (206) support — see VERAPDF_URL_OVERRIDE.
  let verapdfServer = null;
  function getVerapdfUrl() {
    if (VERAPDF_URL_OVERRIDE) return Promise.resolve(VERAPDF_URL_OVERRIDE);
    if (verapdfServer) return Promise.resolve('http://127.0.0.1:' + verapdfServer.address().port + '/verapdf/verapdf_validator.html');
    const http = require('http');
    const rootDir = path.join(REPO_ROOT, 'verapdf');
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

  async function close() {
    activeContext = null;
    if (verapdfServer) { try { verapdfServer.close(); } catch (_) {} verapdfServer = null; }
    if (browser) { try { await browser.close(); } catch (_) {} browser = null; }
  }

  return { audit, remediate, validatePdfUa, cancelActiveRun, close };
}

module.exports = { createDriver, classifyHttpFailure, REPO_ROOT, MODULE_FILES };

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
        const out = await driver.validatePdfUa({ filePath: path.resolve(file) });
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
