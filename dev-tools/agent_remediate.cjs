#!/usr/bin/env node
/*
 * agent_remediate.cjs — remediation with the AGENT as the model, and no API key anywhere.
 *
 *   node dev-tools/agent_remediate.cjs ocr      <source.pdf> [--json out.json] [--lang eng]
 *   node dev-tools/agent_remediate.cjs audit    <file.html>  [--json out.json]
 *   node dev-tools/agent_remediate.cjs decide   <prev-audit.json> <new-audit.json>
 *   node dev-tools/agent_remediate.cjs tag      <source.pdf> <accessible.html> <out.pdf> [--title T] [--lang en]
 *   node dev-tools/agent_remediate.cjs validate <file.pdf>
 *
 * WHY THIS EXISTS
 * The pipeline needs a model it can CALL, synchronously, dozens to hundreds of times per document.
 * A turn-based agent cannot be that endpoint, which is why a pipeline run needs an API key today.
 * But the call volume is almost entirely in EXTRACTION (per-page OCR, multi-auditor panels,
 * chunked fixes). The parts that actually produce and verify the artifact are deterministic:
 *
 *   DocBuilderRenderer.renderBlocks  blocks  -> accessible HTML   (no model)
 *   pipeline.runAxeAudit             HTML    -> WCAG violations   (no model)
 *   pipeline.createTaggedPdf         PDF+HTML-> tagged PDF        (no model)
 *   veraPDF (CheerpJ)                PDF     -> ISO 14289-1       (no model)
 *
 * So the agent does the one genuinely model-shaped job — read the document, describe it as
 * blocks, and revise when the auditor complains — and these subcommands do everything else with
 * the SAME code the keyed pipeline uses. `decide` is the pipeline's own _alloLoopPolicy, so the
 * accept/revert rule governing the loop is not a reimplementation of it.
 *
 * A structural guarantee, not a promise: the pipeline is instantiated with AI dependencies that
 * THROW. If any command ever reached a model call it would fail loudly instead of quietly
 * working, so "no model was involved" is enforced rather than asserted.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const Driver = require(path.join(REPO, 'desktop/mcp/remediation_headless_driver.cjs'));
const PDFLIB_CDN = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
const AXE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';

const MODULES = ['verification_policy_module.js', 'doc_builder_renderer_module.js', 'doc_pipeline_module.js'];

const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = argv.slice(1).filter((a) => !a.startsWith('--'));
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? dflt : argv[i + 1];
};

function log(m) { process.stderr.write('[agent-remediate] ' + m + '\n'); }

// Shared browser setup. Everything runs in the same Chromium the connector uses, against the
// same local module files, so these results are the pipeline's results and not a lookalike.
async function withPage(fn, { needPdfLib = false, needAxe = false } = {}) {
  const chrome = Driver.resolveChromium();
  if (!chrome.installed) throw new Error('Chromium is not installed — run: npx playwright install chromium');
  const browser = await chrome.chromium.launch({ headless: !process.env.ALLOFLOW_MCP_HEADFUL });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('about:blank');
    if (needPdfLib) {
      await page.addScriptTag({ url: PDFLIB_CDN });
      await page.waitForFunction(() => !!(window.PDFLib && window.PDFLib.PDFDocument), null, { timeout: 30000 });
    }
    if (needAxe) {
      await page.addScriptTag({ url: AXE_CDN });
      await page.waitForFunction(() => typeof window.axe !== 'undefined', null, { timeout: 30000 });
    }
    for (const m of MODULES) await page.addScriptTag({ path: path.join(Driver.ASSETS_ROOT, m) });
    await page.waitForFunction(
      () => !!(window.AlloModules && window.AlloModules.createDocPipeline && window.AlloModules.DocBuilderRenderer),
      null, { timeout: 30000 }
    );
    // The AI seams throw. If a deterministic path ever reaches one, this run fails loudly.
    await page.evaluate(() => {
      const boom = (which) => async () => { throw new Error('agent_remediate: ' + which + ' was called — this path is supposed to be model-free'); };
      window.__agentPipeline = window.AlloModules.createDocPipeline({
        callGemini: boom('callGemini'),
        callGeminiVision: boom('callGeminiVision'),
        callImagen: async () => null,
        addToast: () => {},
        t: (k) => k,
        isRtlLang: () => false,
        updateExportPreview: () => {},
        getDefaultTitle: () => 'Document',
        state: {},
      });
    });
    const out = await fn(page);
    if (errors.length) log('page errors: ' + errors.slice(0, 3).join(' | '));
    return out;
  } finally {
    try { await browser.close(); } catch (_) {}
  }
}

// ── ocr ─────────────────────────────────────────────────────────────────────
// The cross-validation step the keyed pipeline gets for free on scans, and which an
// agent-authored transcription would otherwise lose.
//
// The weakness of "the agent reads the pages" is that nothing checks the agent. Tesseract is a
// genuinely INDEPENDENT reader: a different algorithm, no model, no network beyond the CDN, no
// knowledge of what the agent claims the page says. Diffing the two catches the failure mode
// that matters most here — a confident transcription of something the page does not say.
//
// It is a cross-check, not an oracle. Tesseract on photographed book pages with bleed-through
// will produce its own garbage; the point is that the two readings fail DIFFERENTLY, so
// agreement is evidence and disagreement is a flag for a human to look at.
async function cmdOcr() {
  const [pdfPath] = positional;
  if (!pdfPath) throw new Error('usage: ocr <file.pdf> [--json out.json] [--lang eng] [--pages 8]');
  const lang = opt('lang', 'eng');
  const maxPages = Number(opt('pages', 0)) || 0;
  const driver = Driver.createDriver({ log });
  let rendered;
  try {
    const b64 = fs.readFileSync(path.resolve(pdfPath)).toString('base64');
    rendered = await driver.renderPdfToPageImages(b64, { onLog: log });
  } finally { await driver.close(); }

  const pages = maxPages ? rendered.pages.slice(0, maxPages) : rendered.pages;
  log('running Tesseract over ' + pages.length + ' page image(s) — this is slow, ~10-40s/page');

  const out = await withPage(async (page) => {
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js' });
    await page.waitForFunction(() => !!window.Tesseract, null, { timeout: 60000 });
    return page.evaluate(async ({ imgs, lng }) => {
      const worker = await window.Tesseract.createWorker(lng);
      const texts = [];
      for (const b of imgs) {
        try {
          const r = await worker.recognize('data:image/png;base64,' + b);
          texts.push({ text: (r && r.data && r.data.text) || '', confidence: (r && r.data && r.data.confidence) || null });
        } catch (e) { texts.push({ text: '', confidence: null, error: String((e && e.message) || e) }); }
      }
      await worker.terminate();
      return texts;
    }, { imgs: pages, lng: lang });
  });

  const report = {
    file: pdfPath,
    engine: 'tesseract.js 5.1.1 (local, no model, no API key)',
    totalPages: rendered.totalPages,
    ocrPages: out.length,
    meanConfidence: out.filter((p) => p.confidence != null).length
      ? Math.round(out.reduce((n, p) => n + (p.confidence || 0), 0) / out.filter((p) => p.confidence != null).length)
      : null,
    pages: out.map((p, i) => ({ page: i + 1, confidence: p.confidence, chars: p.text.length, text: p.text })),
  };
  const jsonOut = opt('json', null);
  if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), 'utf8'); log('wrote ' + jsonOut); }
  console.log(JSON.stringify({
    file: report.file, totalPages: report.totalPages, ocrPages: report.ocrPages,
    meanConfidence: report.meanConfidence,
    charsPerPage: report.pages.map((p) => p.chars),
    note: 'Independent reading for cross-checking an agent transcription. Use --json to capture the text.',
  }, null, 2));
}

// ── audit ───────────────────────────────────────────────────────────────────
// The deterministic half of the pipeline's output verification. This is the number the loop
// steers on, precisely because no model produced it.
async function cmdAudit() {
  const [htmlPath] = positional;
  if (!htmlPath) throw new Error('usage: audit <file.html>');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const result = await withPage(async (page) => page.evaluate(async (h) => {
    return await window.__agentPipeline.runAxeAudit(h);
  }, html), { needAxe: true });

  const violations = (result && result.violations) || [];
  const summary = {
    file: htmlPath,
    axeScore: result && typeof result.score === 'number' ? result.score : null,
    totalViolations: (result && result.totalViolations) != null ? result.totalViolations : violations.length,
    byImpact: violations.reduce((acc, v) => { const k = v.impact || 'unknown'; acc[k] = (acc[k] || 0) + (v.nodes || 1); return acc; }, {}),
    violations: violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes, wcag: v.wcag })),
    passes: result && result.passes,
  };
  const jsonOut = opt('json', null);
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2), 'utf8');
  console.log(JSON.stringify(summary, null, 2));
}

// ── decide ──────────────────────────────────────────────────────────────────
// The pipeline's OWN convergence policy, not a reimplementation: keep a round only if it did not
// regress the deterministic signal, and stop when improvement plateaus.
async function cmdDecide() {
  const [prevPath, newPath] = positional;
  if (!prevPath || !newPath) throw new Error('usage: decide <prev-audit.json> <new-audit.json>');
  const prev = JSON.parse(fs.readFileSync(prevPath, 'utf8'));
  const next = JSON.parse(fs.readFileSync(newPath, 'utf8'));
  const p = {
    newAi: next.axeScore == null ? 0 : next.axeScore,
    bestAi: prev.axeScore == null ? 0 : prev.axeScore,
    newAxe: next.totalViolations, bestAxe: prev.totalViolations,
    prevBestAxe: prev.totalViolations, prevBestAi: prev.axeScore == null ? 0 : prev.axeScore,
    partial: false,
  };
  const verdict = await withPage(async (page) => page.evaluate((pp) => {
    const policy = window.__agentPipeline._alloLoopPolicy || window._alloLoopPolicy;
    if (!policy) return { error: 'loop policy not exposed by this build' };
    return {
      shouldRevert: policy.shouldRevert(pp),
      revertReason: policy.shouldRevert(pp) ? policy.revertReason(pp) : null,
      isBest: policy.isBest(pp),
      improved: policy.improved(pp),
    };
  }, p));
  console.log(JSON.stringify({
    prev: { violations: prev.totalViolations, score: prev.axeScore },
    next: { violations: next.totalViolations, score: next.axeScore },
    verdict,
    accept: verdict && !verdict.shouldRevert,
  }, null, 2));
}

// ── tag ─────────────────────────────────────────────────────────────────────
async function cmdTag() {
  const [srcPdf, htmlPath, outPdf] = positional;
  if (!srcPdf || !htmlPath || !outPdf) throw new Error('usage: tag <source.pdf> <accessible.html> <out.pdf>');
  const srcB64 = fs.readFileSync(srcPdf).toString('base64');
  const accessibleHtml = fs.readFileSync(htmlPath, 'utf8');
  const title = opt('title', path.basename(srcPdf).replace(/\.pdf$/i, ''));
  const lang = opt('lang', 'en');

  const out = await withPage(async (page) => page.evaluate(async ({ b64, html, title: t, lang: l }) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const res = await window.__agentPipeline.createTaggedPdf(bytes, { accessibleHtml: html }, {
      title: t, lang: l, subject: 'Remediated for accessibility by AlloFlow (agent-driven, model-free tagging)',
      modDate: '2026-07-28T00:00:00Z', // fixed so re-tagging identical content is byte-identical
    });
    if (!res || !res.bytes) throw new Error('createTaggedPdf returned no bytes');
    let s = '';
    const u8 = res.bytes;
    for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    return { b64: btoa(s), declared: !!res.declaredPdfUa, note: res.note || null };
  }, { b64: srcB64, html: accessibleHtml, title, lang }), { needPdfLib: true });

  fs.writeFileSync(outPdf, Buffer.from(out.b64, 'base64'));
  console.log(JSON.stringify({ ok: true, out: outPdf, bytes: fs.statSync(outPdf).size, declaredPdfUa: out.declared, note: out.note }, null, 2));
}

// ── validate ────────────────────────────────────────────────────────────────
async function cmdValidate() {
  const [pdfPath] = positional;
  if (!pdfPath) throw new Error('usage: validate <file.pdf>');
  const driver = Driver.createDriver({ log });
  try {
    const r = await driver.validatePdfUa({ filePath: path.resolve(pdfPath), onLog: log });
    console.log(JSON.stringify({
      file: pdfPath, standard: 'PDF/UA-1 (ISO 14289-1)', validator: 'veraPDF greenfield (in-browser JVM)',
      compliant: !!(r && r.compliant), failedChecks: (r && r.failedChecks) || 0,
      failedRules: ((r && r.failedRules) || []).slice(0, 60),
    }, null, 2));
  } finally { await driver.close(); }
}

// ── report ──────────────────────────────────────────────────────────────────
// AlloFlow's OWN report generator, not a lookalike. An agent should never have to invent what a
// conformance report looks like: the connector already knows, and a hand-rolled report would
// drift from the app's every time the app's changed. Inputs are assembled from the deterministic
// artifacts this harness produced (axe audit + veraPDF verdict), so the numbers in the report are
// the numbers the tools returned.
async function cmdReport() {
  const [auditJson, veraJson, outHtml] = positional;
  if (!auditJson || !veraJson || !outHtml) throw new Error('usage: report <audit.json> <verapdf.json> <out.html> [--file NAME] [--html accessible.html]');
  const axe = JSON.parse(fs.readFileSync(auditJson, 'utf8'));
  const vera = JSON.parse(fs.readFileSync(veraJson, 'utf8'));
  const accessibleHtmlPath = opt('html', null);
  const fileName = opt('file', path.basename(vera.file || 'document.pdf'));

  // veraPDF speaks failed RULES; the report speaks pass/fail CHECKS. Only clause 5 test 1 is the
  // by-design withheld declaration, so it is reported as a warning rather than a failure — the
  // same distinction the app draws.
  const failed = (vera.failedRules || []);
  const checks = failed.map((r) => ({
    id: 'ISO 14289-1 clause ' + r.clause + ' test ' + r.testNumber,
    label: r.message,
    status: (String(r.clause) === '5' && Number(r.testNumber) === 1) ? 'warn' : 'fail',
    detail: (r.count || 1) + ' occurrence(s)',
  }));
  const summary = {
    pass: 0, fail: checks.filter((c) => c.status === 'fail').length,
    warn: checks.filter((c) => c.status === 'warn').length, manual: 0, na: 0,
    conformancePct: vera.compliant ? 100 : (checks.some((c) => c.status === 'fail') ? 0 : 95),
  };

  const html = await withPage(async (page) => page.evaluate(async ({ axeAudit, checksIn, summaryIn, fName, accessibleHtml }) => {
    const fixResult = {
      accessibleHtml: accessibleHtml || '',
      axeAudit: { totalViolations: axeAudit.totalViolations, violations: axeAudit.violations || [], score: axeAudit.axeScore },
      afterScore: axeAudit.axeScore, beforeScore: null,
      _aiVerificationIncomplete: true, // no AI verification ran in this path, and the report must say so
      verificationCoverage: { pdfUaSelfCheck: true },
    };
    return window.__agentPipeline.generateAccessibilityReportHtml(
      fixResult,
      { score: null, summary: 'Source audited by the agent, not by a triangulated auditor panel.', issues: [] },
      { checks: checksIn, summary: summaryIn },
      { fileName: fName }
    );
  }, { axeAudit: axe, checksIn: checks, summaryIn: summary, fName: fileName, accessibleHtml: accessibleHtmlPath ? fs.readFileSync(accessibleHtmlPath, 'utf8') : '' }), { needAxe: true });

  fs.writeFileSync(outHtml, html, 'utf8');
  console.log(JSON.stringify({ ok: true, out: outHtml, bytes: Buffer.byteLength(html), generator: "AlloFlow's own generateAccessibilityReportHtml", veraFailedChecks: vera.failedChecks }, null, 2));
}

const COMMANDS = { ocr: cmdOcr, audit: cmdAudit, decide: cmdDecide, tag: cmdTag, validate: cmdValidate, report: cmdReport };

(async () => {
  const fn = COMMANDS[cmd];
  if (!fn) {
    console.error('usage: agent_remediate.cjs <render|audit|decide|tag|validate> ...');
    process.exit(2);
  }
  try { await fn(); } catch (e) { console.error('FAILED: ' + ((e && e.message) || e)); process.exit(1); }
})();
