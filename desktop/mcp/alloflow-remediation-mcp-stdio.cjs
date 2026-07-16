#!/usr/bin/env node
/**
 * AlloFlow PDF Remediation - local stdio MCP server (v1, additive).
 *
 * Exposes the REAL remediation pipeline (doc_pipeline_module.js — the same
 * bytes the app ships) as MCP tools, via a headless-Chromium driver
 * (remediation_headless_driver.cjs). A deliberate SIBLING of
 * alloflow-mcp-stdio.cjs: same SDK-free newline-delimited JSON-RPC 2.0
 * transport, but fully self-contained — it does not touch the Agent Core
 * contracts, the app source, or the Blueprint track.
 *
 *   remediation_capabilities — honest environment report (key/driver/module
 *                              presence). Call first. Read-only.
 *   pdf_audit                — accessibility audit of a local PDF (scores +
 *                              issues). Spends Gemini quota; writes nothing.
 *   pdf_remediate            — full remediation run; writes
 *                              <stem>-accessible.html, <stem>-tagged.pdf and
 *                              <stem>-remediation-report.json (collision-safe
 *                              names, never overwrites) and returns the honesty
 *                              summary (verdict, scores, fidelity notes).
 *
 * Safety properties:
 *   - stdio only; no network listener. Network egress = Gemini API (document
 *     content!) + public CDNs for pdf.js/Tesseract/pdf-lib/axe. Use only with
 *     documents you are authorized to send to the configured Gemini key.
 *   - stdout carries ONLY protocol messages; all logging goes to stderr.
 *   - Input validation happens BEFORE the browser/driver is touched, so bad
 *     arguments never launch Chromium or spend quota.
 *   - Single-flight: one remediation/audit at a time; concurrent calls get a
 *     clean in-band error instead of quota-competing runs.
 *   - Output files never overwrite: existing names get a numeric suffix.
 *
 * Env: GEMINI_API_KEY (required for pdf_* tools), ALLOFLOW_MCP_GEMINI_MODEL,
 * ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL, ALLOFLOW_MCP_MAX_RUN_MINUTES (default 30),
 * ALLOFLOW_MCP_VERBOSE=1, ALLOFLOW_MCP_HEADFUL=1 (debug).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const Driver = require(path.join(__dirname, 'remediation_headless_driver.cjs'));

const SERVER_INFO = { name: 'alloflow-remediation', title: 'AlloFlow PDF Remediation (local)', version: '0.1.0' };
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_LINE_CHARS = 4000000;
const MAX_PDF_BYTES = 200 * 1024 * 1024; // mirrors the app's per-file batch preflight

function log(msg) { process.stderr.write('[alloflow-remediation-mcp] ' + msg + '\n'); }

let driver = null;
let busyWith = null; // tool name of the in-flight run, or null

function getDriver() {
  if (!driver) driver = Driver.createDriver({ log });
  return driver;
}

function invalidParams(message) { const e = new Error(message); e.rpcCode = -32602; return e; }

function requirePdfPath(args) {
  if (typeof args.file_path !== 'string' || !args.file_path.trim()) throw invalidParams('arguments.file_path is required (absolute path to a local PDF)');
  const p = path.resolve(args.file_path);
  if (!/\.pdf$/i.test(p)) throw invalidParams('arguments.file_path must point to a .pdf file');
  let st;
  try { st = fs.statSync(p); } catch (_) { throw invalidParams('arguments.file_path does not exist or is unreadable: ' + p); }
  if (!st.isFile()) throw invalidParams('arguments.file_path is not a file: ' + p);
  if (st.size > MAX_PDF_BYTES) throw invalidParams('PDF exceeds the ' + Math.round(MAX_PDF_BYTES / 1024 / 1024) + 'MB limit (' + Math.round(st.size / 1024 / 1024) + 'MB)');
  if (st.size < 5) throw invalidParams('File is empty: ' + p);
  return p;
}

function requireGeminiKey() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. This tool sends document content to the Gemini API and cannot run without a key.');
  }
}

function assertAllowedKeys(value, allowed, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalidParams(name + ' must be an object');
  const unknown = Object.keys(value).filter((k) => allowed.indexOf(k) === -1);
  if (unknown.length) throw invalidParams(name + ' has unsupported field(s): ' + unknown.join(', '));
}

function optionalBoundedNumber(args, key, min, max) {
  if (args[key] === undefined) return undefined;
  const n = Number(args[key]);
  if (!Number.isFinite(n) || n < min || n > max) throw invalidParams('arguments.' + key + ' must be a number between ' + min + ' and ' + max);
  return n;
}

function optionalOcrLanguage(args) {
  if (args.ocr_language === undefined) return '';
  if (typeof args.ocr_language !== 'string' || args.ocr_language.length > 20 || !/^[a-z_+-]*$/i.test(args.ocr_language)) {
    throw invalidParams("arguments.ocr_language must be a short language code (e.g. 'spa', 'fra') or '' for auto-detect");
  }
  return args.ocr_language;
}

// Collision-safe output path: never overwrite an existing file.
function claimOutputPath(dir, base) {
  let candidate = path.join(dir, base);
  if (!fs.existsSync(candidate)) return candidate;
  const ext = path.extname(base);
  const stem = base.slice(0, base.length - ext.length);
  for (let i = 2; i < 1000; i++) {
    candidate = path.join(dir, stem + '-' + i + ext);
    if (!fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Could not find a free output name for ' + base);
}

async function withSingleFlight(name, fn) {
  if (busyWith) {
    const e = new Error('A ' + busyWith + ' run is already in progress. The pipeline is single-flight per server: wait for it to finish (runs can take 5-30 minutes) and retry.');
    e.busy = true;
    throw e;
  }
  busyWith = name;
  try { return await fn(); }
  finally { busyWith = null; }
}

// ── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'remediation_capabilities',
    title: 'Check remediation environment',
    description: 'Report whether this machine can run PDF remediation: Gemini key present, Playwright/Chromium available, pipeline modules found, configured models and limits. Call this first. Read-only; launches nothing, spends nothing.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'Check remediation environment', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'pdf_audit',
    title: 'Audit a PDF for accessibility',
    description: 'Run the AlloFlow accessibility audit on a local PDF: overall score, per-severity issue list, scanned/searchable detection, page count, detected language. Sends document content to the Gemini API and fetches pdf.js/Tesseract from public CDNs. Writes no files. Typically 1-3 minutes.',
    inputSchema: {
      type: 'object',
      required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .pdf file (max 200MB)' },
        ocr_language: { type: 'string', description: "Tesseract language code for scanned pages (e.g. 'spa'); omit for auto-detect", maxLength: 20 },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Audit a PDF for accessibility', readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'pdf_remediate',
    title: 'Remediate a PDF for accessibility',
    description: 'Run the full AlloFlow remediation pipeline on a local PDF: audit, rebuild as accessible HTML, iterative AI fix passes to the target score, honesty-checked verification, and a tagged PDF export. Writes <name>-accessible.html, <name>-tagged.pdf, and <name>-remediation-report.json next to the input (or to output_dir), never overwriting existing files. Returns the distribution verdict, before/after scores, and every fidelity/honesty disclosure. Sends document content to the Gemini API. Typically 5-30 minutes; progress streams to the server log.',
    inputSchema: {
      type: 'object',
      required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .pdf file (max 200MB)' },
        output_dir: { type: 'string', description: 'Directory for output files (default: alongside the input)' },
        target_score: { type: 'number', minimum: 50, maximum: 100, description: 'Stop-improving target (default 95)' },
        fix_passes: { type: 'number', minimum: 0, maximum: 5, description: 'Max auto-fix passes (default 2)' },
        polish_passes: { type: 'number', minimum: 0, maximum: 3, description: 'Extra polish passes (default 0)' },
        tagged_pdf: { type: 'boolean', description: 'Also build the tagged PDF export (default true)' },
        ocr_language: { type: 'string', description: "Tesseract language code for scanned pages (e.g. 'spa'); omit for auto-detect", maxLength: 20 },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Remediate a PDF for accessibility', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
];

const TOOL_HANDLERS = {
  remediation_capabilities(args) {
    assertAllowedKeys(args, [], 'arguments');
    let playwrightAvailable = false;
    try { require.resolve('playwright'); playwrightAvailable = true; } catch (_) {}
    const modules = {};
    for (const f of Driver.MODULE_FILES) modules[f] = fs.existsSync(path.join(Driver.REPO_ROOT, f));
    return {
      geminiKeyPresent: !!process.env.GEMINI_API_KEY,
      playwrightAvailable,
      pipelineModulesPresent: modules,
      model: process.env.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview',
      fallbackModel: process.env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
      maxRunMinutes: Number(process.env.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30,
      maxPdfMB: Math.round(MAX_PDF_BYTES / 1024 / 1024),
      singleFlight: true,
      busy: busyWith || false,
      networkEgress: ['generativelanguage.googleapis.com (document content)', 'public CDNs (pdf.js, Tesseract, pdf-lib, axe)'],
      ready: !!process.env.GEMINI_API_KEY && playwrightAvailable && Object.values(modules).every(Boolean),
    };
  },

  async pdf_audit(args) {
    assertAllowedKeys(args, ['file_path', 'ocr_language'], 'arguments');
    const filePath = requirePdfPath(args);
    const ocrLanguage = optionalOcrLanguage(args);
    requireGeminiKey();
    return withSingleFlight('pdf_audit', async () => {
      const out = await getDriver().audit({ filePath, ocrLanguage });
      delete out._fullAudit; // keep the MCP payload bounded; the summary carries the decision-relevant facts
      return out;
    });
  },

  async pdf_remediate(args) {
    assertAllowedKeys(args, ['file_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'ocr_language'], 'arguments');
    const filePath = requirePdfPath(args);
    const ocrLanguage = optionalOcrLanguage(args);
    const targetScore = optionalBoundedNumber(args, 'target_score', 50, 100);
    const fixPasses = optionalBoundedNumber(args, 'fix_passes', 0, 5);
    const polishPasses = optionalBoundedNumber(args, 'polish_passes', 0, 3);
    if (args.tagged_pdf !== undefined && typeof args.tagged_pdf !== 'boolean') throw invalidParams('arguments.tagged_pdf must be a boolean');
    let outDir = path.dirname(filePath);
    if (args.output_dir !== undefined) {
      if (typeof args.output_dir !== 'string' || !args.output_dir.trim()) throw invalidParams('arguments.output_dir must be a non-empty string');
      outDir = path.resolve(args.output_dir);
      fs.mkdirSync(outDir, { recursive: true });
    }
    requireGeminiKey();

    return withSingleFlight('pdf_remediate', async () => {
      const out = await getDriver().remediate({
        filePath, ocrLanguage,
        targetScore, fixPasses, polishPasses,
        taggedPdf: args.tagged_pdf !== false,
      });
      const stem = path.basename(filePath).replace(/\.pdf$/i, '');
      const files = {};
      if (out.accessibleHtml) {
        files.accessibleHtml = claimOutputPath(outDir, stem + '-accessible.html');
        fs.writeFileSync(files.accessibleHtml, out.accessibleHtml, 'utf8');
      }
      if (out.taggedPdfB64) {
        files.taggedPdf = claimOutputPath(outDir, stem + '-tagged.pdf');
        fs.writeFileSync(files.taggedPdf, Buffer.from(out.taggedPdfB64, 'base64'));
      }
      const summary = {
        input: filePath,
        files,
        verdict: out.verdict,
        beforeScore: out.beforeScore,
        afterScore: out.afterScore,
        aiVerificationIncomplete: out.aiVerificationIncomplete,
        scoreSource: out.scoreSource,
        estimatedMinimumScore: out.estimatedMinimumScore,
        integrityCoverage: out.integrityCoverage,
        integrityWarning: out.integrityWarning,
        fidelityNotes: out.fidelityNotes,
        verificationState: out.verificationState,
        taggedPdfError: out.taggedPdfError || undefined,
        runId: out.runId,
        stats: out.stats,
        note: 'Scores and the verdict come from AlloFlow\'s honesty-gated verification. Review the fidelity notes and spot-check the output before distributing; the tagged PDF only carries a PDF/UA declaration when it earned one.',
      };
      files.report = claimOutputPath(outDir, stem + '-remediation-report.json');
      fs.writeFileSync(files.report, JSON.stringify(summary, null, 2), 'utf8');
      return summary;
    });
  },
};

// ── JSON-RPC plumbing (same NDJSON transport as alloflow-mcp-stdio.cjs) ────

function send(message) { process.stdout.write(JSON.stringify(message) + '\n'); }
function sendResult(id, result) { send({ jsonrpc: '2.0', id, result }); }
function sendError(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

let initialized = false;

async function handleRequest(msg) {
  const { id, method, params } = msg;
  if (!initialized && method !== 'initialize' && method !== 'ping') { sendError(id, -32002, 'Server not initialized'); return; }
  switch (method) {
    case 'initialize': {
      const requested = params && params.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.indexOf(requested) !== -1 ? requested : SUPPORTED_PROTOCOL_VERSIONS[0];
      initialized = true;
      sendResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'AlloFlow PDF remediation connector. Call `remediation_capabilities` first to confirm the environment is ready. `pdf_audit` scores a local PDF; `pdf_remediate` produces an accessible HTML + tagged PDF with an honesty-checked verdict. Runs send document content to the Gemini API and can take 5-30 minutes; the server is single-flight.'
      });
      return;
    }
    case 'ping': sendResult(id, {}); return;
    case 'tools/list': sendResult(id, { tools: TOOLS }); return;
    case 'tools/call': {
      const name = params && params.name;
      const handler = TOOL_HANDLERS[name];
      if (!handler) { sendError(id, -32602, 'Unknown tool: ' + String(name)); return; }
      try {
        const output = await handler((params && params.arguments) || {});
        sendResult(id, { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }], structuredContent: output, isError: false });
      } catch (e) {
        if (e && e.rpcCode) { sendError(id, e.rpcCode, e.message); return; }
        sendResult(id, { content: [{ type: 'text', text: 'Tool failed: ' + (e && e.message ? e.message : 'unknown error') }], isError: true });
      }
      return;
    }
    default: sendError(id, -32601, 'Method not found: ' + String(method));
  }
}

function handleMessage(line) {
  if (!line.trim()) return;
  if (line.length > MAX_LINE_CHARS) { sendError(null, -32600, 'Message too large'); return; }
  let msg;
  try { msg = JSON.parse(line); } catch (_) { sendError(null, -32700, 'Parse error'); return; }
  if (!msg || msg.jsonrpc !== '2.0') { sendError(msg && msg.id !== undefined ? msg.id : null, -32600, 'Invalid request'); return; }
  if (msg.id === undefined || msg.id === null) return; // notification — never respond
  return handleRequest(msg);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  Promise.resolve().then(() => handleMessage(line)).catch((e) => log('unexpected error: ' + (e && e.message ? e.message : 'unknown')));
});
rl.on('close', async () => {
  log('stdin closed; shutting down');
  try { if (driver) await driver.close(); } catch (_) {}
  process.exit(0);
});

log('ready (stdio only; tools: ' + TOOLS.map((t) => t.name).join(', ') + ')');
