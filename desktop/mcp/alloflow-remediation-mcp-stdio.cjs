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
 *   pdf_remediate            — full remediation run (SYNCHRONOUS; can block
 *                              5-30 min — prefer the job tools below from MCP
 *                              clients with tool timeouts); writes
 *                              <stem>-accessible.html, <stem>-tagged.pdf and
 *                              <stem>-remediation-report.json (collision-safe
 *                              names, never overwrites) and returns the honesty
 *                              summary (verdict, scores, fidelity notes).
 *   pdf_remediate_start      — same run as a background JOB: returns a job id
 *                              immediately. Jobs run one at a time (FIFO).
 *   pdf_batch_remediate_start— job remediating every PDF in a folder,
 *                              sequentially, continuing past per-file failures.
 *   remediation_job_status   — job state + recent pipeline telemetry lines.
 *   remediation_job_result   — the completed job's summary.
 *   remediation_job_cancel   — cancel a queued job, or kill the running one
 *                              (its browser context closes; in-flight AI calls
 *                              die with it).
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
const crypto = require('crypto');

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

function _requireFileOfType(args, extRe, extLabel) {
  if (typeof args.file_path !== 'string' || !args.file_path.trim()) throw invalidParams('arguments.file_path is required (absolute path to a local ' + extLabel + ' file)');
  const p = path.resolve(args.file_path);
  if (!extRe.test(p)) throw invalidParams('arguments.file_path must point to a ' + extLabel + ' file');
  let st;
  try { st = fs.statSync(p); } catch (_) { throw invalidParams('arguments.file_path does not exist or is unreadable: ' + p); }
  if (!st.isFile()) throw invalidParams('arguments.file_path is not a file: ' + p);
  if (st.size > MAX_PDF_BYTES) throw invalidParams('File exceeds the ' + Math.round(MAX_PDF_BYTES / 1024 / 1024) + 'MB limit (' + Math.round(st.size / 1024 / 1024) + 'MB)');
  if (st.size < 5) throw invalidParams('File is empty: ' + p);
  return p;
}
function requirePdfPath(args) { return _requireFileOfType(args, /\.pdf$/i, '.pdf'); }
// Remediation/audit also take Office inputs — the pipeline sniffs .docx/.pptx from the
// fileName and routes them through its deterministic office branches (no Vision pass).
function requireDocPath(args) { return _requireFileOfType(args, /\.(pdf|docx|pptx)$/i, '.pdf, .docx, or .pptx'); }

function requireGeminiKey() {
  if (!Driver.resolveGeminiApiKey().key) {
    throw new Error('GEMINI_API_KEY is not set (and no key file was found). This tool sends document content to the Gemini API and cannot run without a key — set the env var or ALLOFLOW_MCP_ENV_PATH.');
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
    const e = new Error('A ' + busyWith + ' run is already in progress. The pipeline is single-flight per server: wait for it to finish (runs can take 5-30 minutes) and retry — or use pdf_remediate_start, which queues jobs instead of failing.');
    e.busy = true;
    throw e;
  }
  busyWith = name;
  try { return await fn(); }
  finally { busyWith = null; }
}

// ── Background jobs ─────────────────────────────────────────────────────────
// pdf_remediate can legitimately run 5-30 minutes; most MCP clients time a
// tools/call out long before that. The job tools return immediately and let
// the client poll: start → status (with live pipeline telemetry) → result.
// Jobs share the same single-flight lane as the synchronous tools via a FIFO
// promise chain; input validation still happens at START time, before a job
// record exists, so a bad request never occupies the queue.

const JOBS = new Map();
const MAX_JOBS = 64;
const JOB_LOG_LINES = 40;
let jobQueue = Promise.resolve();

function newJob(kind, input) {
  if (JOBS.size >= MAX_JOBS) {
    // Evict the oldest FINISHED job; never evict queued/running ones.
    for (const [id, j] of JOBS) {
      if (['completed', 'failed', 'cancelled'].indexOf(j.status) !== -1) { JOBS.delete(id); break; }
    }
    if (JOBS.size >= MAX_JOBS) throw new Error('Job store is full of unfinished jobs (' + MAX_JOBS + '); wait for or cancel some first.');
  }
  const job = {
    jobId: 'rjob-' + crypto.randomUUID(),
    kind, input,
    status: 'queued', // queued | running | completed | failed | cancelled
    createdAt: new Date().toISOString(),
    startedAt: null, finishedAt: null,
    cancelRequested: false,
    logLines: [],
    result: null, error: null,
  };
  JOBS.set(job.jobId, job);
  return job;
}

function jobLog(job, line) {
  job.logLines.push(new Date().toISOString().slice(11, 19) + ' ' + String(line).slice(0, 300));
  if (job.logLines.length > JOB_LOG_LINES) job.logLines.splice(0, job.logLines.length - JOB_LOG_LINES);
  log('[' + job.jobId.slice(0, 13) + '] ' + String(line).slice(0, 300));
}

function jobStatusPayload(job) {
  return {
    jobId: job.jobId, kind: job.kind, status: job.status,
    createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt,
    input: job.input,
    recentLog: job.logLines.slice(-15),
    error: job.error || undefined,
    resultAvailable: job.status === 'completed',
  };
}

function enqueueJob(job, runner) {
  jobQueue = jobQueue.then(async () => {
    // The FIFO chain serializes jobs against EACH OTHER, but a synchronous tool
    // (pdf_audit / pdf_remediate) may hold the single-flight lane when this job's
    // turn arrives. Waiting here is the correct semantics — withSingleFlight would
    // THROW and fail the job spuriously.
    let waitedForLane = false;
    while (busyWith && !job.cancelRequested) {
      if (!waitedForLane) { waitedForLane = true; jobLog(job, 'waiting for the in-progress ' + busyWith + ' call to finish'); }
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (job.cancelRequested) { job.status = 'cancelled'; job.finishedAt = new Date().toISOString(); jobLog(job, 'cancelled before start'); return; }
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    try {
      job.result = await withSingleFlight(job.kind, () => runner(job));
      // A cancelled batch returns normally with a partial scoreboard — the status
      // must still say cancelled (the result stays fetchable, see job_result).
      job.status = job.cancelRequested ? 'cancelled' : 'completed';
    } catch (e) {
      if (job.cancelRequested) { job.status = 'cancelled'; }
      else { job.status = 'failed'; job.error = (e && e.message) || String(e); }
    } finally {
      job.finishedAt = new Date().toISOString();
      jobLog(job, job.status + (job.error ? ': ' + job.error : ''));
    }
  }).catch(() => {}); // the chain itself must never break
}

function requireJob(args) {
  assertAllowedKeys(args, ['job_id'], 'arguments');
  if (typeof args.job_id !== 'string' || !args.job_id.trim()) throw invalidParams('arguments.job_id is required');
  return JOBS.get(args.job_id) || null;
}

// ── Shared remediate-and-write runner (sync tool, job, and batch all use it) ──

function validateRemediateOptions(args) {
  const targetScore = optionalBoundedNumber(args, 'target_score', 50, 100);
  const fixPasses = optionalBoundedNumber(args, 'fix_passes', 0, 5);
  const polishPasses = optionalBoundedNumber(args, 'polish_passes', 0, 3);
  if (args.tagged_pdf !== undefined && typeof args.tagged_pdf !== 'boolean') throw invalidParams('arguments.tagged_pdf must be a boolean');
  return { targetScore, fixPasses, polishPasses, taggedPdf: args.tagged_pdf !== false, ocrLanguage: optionalOcrLanguage(args) };
}

function resolveOutputDir(args, filePath) {
  if (args.output_dir === undefined) return path.dirname(filePath);
  if (typeof args.output_dir !== 'string' || !args.output_dir.trim()) throw invalidParams('arguments.output_dir must be a non-empty string');
  const outDir = path.resolve(args.output_dir);
  fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

async function remediateOneFile(filePath, outDir, opts, onLog) {
  const out = await getDriver().remediate(Object.assign({ filePath, onLog }, opts));
  const stem = path.basename(filePath).replace(/\.(pdf|docx|pptx)$/i, '');
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
    description: 'Run the AlloFlow accessibility audit on a local PDF, DOCX, or PPTX: overall score, per-severity issue list, scanned/searchable detection, page count, detected language. Sends document content to the Gemini API and fetches pdf.js/Tesseract from public CDNs. Writes no files. Office files are audited deterministically from extracted text (no Vision pass). Typically 1-3 minutes.',
    inputSchema: {
      type: 'object',
      required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .pdf, .docx, or .pptx file (max 200MB)' },
        ocr_language: { type: 'string', description: "Tesseract language code for scanned pages (e.g. 'spa'); omit for auto-detect", maxLength: 20 },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Audit a PDF for accessibility', readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'pdf_validate_ua',
    title: 'Validate PDF/UA-1 conformance',
    description: 'Independent ISO 14289-1 (PDF/UA-1) validation of a local PDF using veraPDF (a real JVM in headless Chromium via CheerpJ — the same validator the app uses). Run it on a -tagged.pdf produced by remediation to independently confirm the byte-level tagging, or on any PDF to check its current conformance. Needs NO Gemini key, sends the document only to the validator page loaded from AlloFlow\'s CDN (validation runs locally in the browser JVM), writes nothing. Typically 30-60s including JVM boot. This is a DIFFERENT artifact from the remediation score: the score judges the accessible-HTML content; this judges the exported PDF bytes.',
    inputSchema: {
      type: 'object',
      required: ['file_path'],
      properties: { file_path: { type: 'string', description: 'Absolute path to a local .pdf file (max 200MB)' } },
      additionalProperties: false,
    },
    annotations: { title: 'Validate PDF/UA-1 conformance', readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  (() => {
    const REMEDIATE_OPTION_PROPS = {
      output_dir: { type: 'string', description: 'Directory for output files (default: alongside the input)' },
      target_score: { type: 'number', minimum: 50, maximum: 100, description: 'Stop-improving target (default 95)' },
      fix_passes: { type: 'number', minimum: 0, maximum: 5, description: 'Max auto-fix passes (default 2)' },
      polish_passes: { type: 'number', minimum: 0, maximum: 3, description: 'Extra polish passes (default 0)' },
      tagged_pdf: { type: 'boolean', description: 'Also build the tagged PDF export (default true)' },
      ocr_language: { type: 'string', description: "Tesseract language code for scanned pages (e.g. 'spa'); omit for auto-detect", maxLength: 20 },
    };
    const JOB_ID_SCHEMA = { type: 'object', required: ['job_id'], properties: { job_id: { type: 'string', minLength: 1, maxLength: 200 } }, additionalProperties: false };
    const RESULT_DOC = 'Accepts .pdf, .docx, or .pptx. Writes <name>-accessible.html, <name>-tagged.pdf, and <name>-remediation-report.json next to the input (or to output_dir), never overwriting existing files (Office inputs skip the tagged-PDF export — the accessible HTML is the deliverable). Returns the distribution verdict, before/after scores, and every fidelity/honesty disclosure. Sends document content to the Gemini API.';
    return [
      {
        name: 'pdf_remediate',
        title: 'Remediate a PDF (synchronous)',
        description: 'Run the full AlloFlow remediation pipeline on a local PDF: audit, rebuild as accessible HTML, iterative AI fix passes to the target score, honesty-checked verification, and a tagged PDF export. ' + RESULT_DOC + ' SYNCHRONOUS: blocks 5-30 minutes — if your client enforces a tool timeout, use pdf_remediate_start + remediation_job_status instead.',
        inputSchema: {
          type: 'object', required: ['file_path'],
          properties: Object.assign({ file_path: { type: 'string', description: 'Absolute path to a local .pdf, .docx, or .pptx file (max 200MB)' } }, REMEDIATE_OPTION_PROPS),
          additionalProperties: false,
        },
        annotations: { title: 'Remediate a PDF (synchronous)', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      {
        name: 'pdf_remediate_start',
        title: 'Start a remediation job',
        description: 'Start the same remediation as pdf_remediate as a BACKGROUND JOB and return a job_id immediately. Jobs run one at a time in start order. Poll remediation_job_status (every 30-60s is plenty; runs take 5-30 minutes), then fetch remediation_job_result. ' + RESULT_DOC,
        inputSchema: {
          type: 'object', required: ['file_path'],
          properties: Object.assign({ file_path: { type: 'string', description: 'Absolute path to a local .pdf, .docx, or .pptx file (max 200MB)' } }, REMEDIATE_OPTION_PROPS),
          additionalProperties: false,
        },
        annotations: { title: 'Start a remediation job', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      {
        name: 'pdf_batch_remediate_start',
        title: 'Start a folder batch job',
        description: 'Start a BACKGROUND JOB that remediates every .pdf/.docx/.pptx in a folder (non-recursive, up to 60 files), one at a time, continuing past per-file failures. Returns a job_id immediately; poll remediation_job_status for per-file progress and fetch remediation_job_result for the per-file summaries. Same outputs and options as pdf_remediate, applied to each file.',
        inputSchema: {
          type: 'object', required: ['dir_path'],
          properties: Object.assign({ dir_path: { type: 'string', description: 'Folder containing .pdf files (searched non-recursively)' } }, REMEDIATE_OPTION_PROPS),
          additionalProperties: false,
        },
        annotations: { title: 'Start a folder batch job', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      {
        name: 'remediation_job_status',
        title: 'Check a remediation job',
        description: 'Status of a remediation job (queued/running/completed/failed/cancelled) plus the most recent pipeline telemetry lines — throttle waits show up here, so a slow job is distinguishable from a stuck one. Read-only.',
        inputSchema: JOB_ID_SCHEMA,
        annotations: { title: 'Check a remediation job', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: 'remediation_job_result',
        title: 'Fetch a remediation job result',
        description: 'The completed job\'s full summary (verdict, scores, honesty disclosures, output file paths; per-file summaries for batch jobs). Available only once remediation_job_status reports completed. Read-only.',
        inputSchema: JOB_ID_SCHEMA,
        annotations: { title: 'Fetch a remediation job result', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      {
        name: 'remediation_job_cancel',
        title: 'Cancel a remediation job',
        description: 'Cancel a queued job (it never starts) or the running one (its browser context closes and in-flight AI calls die within seconds). Output files already written stay on disk.',
        inputSchema: JOB_ID_SCHEMA,
        annotations: { title: 'Cancel a remediation job', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      },
    ];
  })(),
].flat();

const TOOL_HANDLERS = {
  remediation_capabilities(args) {
    assertAllowedKeys(args, [], 'arguments');
    let playwrightAvailable = false;
    try { require.resolve('playwright'); playwrightAvailable = true; } catch (_) {}
    const modules = {};
    for (const f of Driver.MODULE_FILES) modules[f] = fs.existsSync(path.join(Driver.ASSETS_ROOT, f));
    const keyInfo = Driver.resolveGeminiApiKey();
    return {
      geminiKeyPresent: !!keyInfo.key,
      geminiKeySource: keyInfo.source, // label only ('env:…'/'file:…'/'none') — never the value
      playwrightAvailable,
      pipelineModulesPresent: modules,
      model: process.env.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview',
      fallbackModel: process.env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
      maxRunMinutes: Number(process.env.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30,
      maxPdfMB: Math.round(MAX_PDF_BYTES / 1024 / 1024),
      singleFlight: true,
      busy: busyWith || false,
      jobs: {
        stored: JOBS.size,
        unfinished: Array.from(JOBS.values()).filter((j) => ['queued', 'running'].indexOf(j.status) !== -1).length,
      },
      networkEgress: ['generativelanguage.googleapis.com (document content)', 'public CDNs (pdf.js, Tesseract, pdf-lib, axe)'],
      ready: !!keyInfo.key && playwrightAvailable && Object.values(modules).every(Boolean),
    };
  },

  async pdf_audit(args) {
    assertAllowedKeys(args, ['file_path', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const ocrLanguage = optionalOcrLanguage(args);
    requireGeminiKey();
    return withSingleFlight('pdf_audit', async () => {
      const out = await getDriver().audit({ filePath, ocrLanguage });
      delete out._fullAudit; // keep the MCP payload bounded; the summary carries the decision-relevant facts
      return out;
    });
  },

  async pdf_validate_ua(args) {
    assertAllowedKeys(args, ['file_path'], 'arguments');
    const filePath = requirePdfPath(args);
    // No Gemini key, no pipeline globals, its own browser context — deliberately OUTSIDE the
    // single-flight lane so a 30-minute remediation doesn't block a 60-second validation.
    const result = await getDriver().validatePdfUa({ filePath });
    return {
      input: filePath,
      standard: 'PDF/UA-1 (ISO 14289-1)',
      validator: 'veraPDF greenfield (in-browser JVM)',
      compliant: !!(result && result.compliant),
      failedChecks: (result && result.failedChecks) || 0,
      failedRules: ((result && result.failedRules) || []).slice(0, 100),
      note: 'Byte-level ISO conformance of THIS file. A remediation score judges the accessible-HTML content instead — the two are complementary, never interchangeable.',
    };
  },

  async pdf_remediate(args) {
    assertAllowedKeys(args, ['file_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const opts = validateRemediateOptions(args);
    const outDir = resolveOutputDir(args, filePath);
    requireGeminiKey();
    return withSingleFlight('pdf_remediate', () => remediateOneFile(filePath, outDir, opts, null));
  },

  pdf_remediate_start(args) {
    assertAllowedKeys(args, ['file_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const opts = validateRemediateOptions(args);
    const outDir = resolveOutputDir(args, filePath);
    requireGeminiKey();
    const job = newJob('pdf_remediate', { file: filePath, outputDir: outDir });
    enqueueJob(job, (j) => remediateOneFile(filePath, outDir, opts, (line) => jobLog(j, line)));
    return { jobId: job.jobId, status: job.status, note: 'Poll remediation_job_status every 30-60s; runs typically take 5-30 minutes.' };
  },

  pdf_batch_remediate_start(args) {
    assertAllowedKeys(args, ['dir_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'ocr_language'], 'arguments');
    if (typeof args.dir_path !== 'string' || !args.dir_path.trim()) throw invalidParams('arguments.dir_path is required');
    const dir = path.resolve(args.dir_path);
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (_) { throw invalidParams('arguments.dir_path does not exist or is unreadable: ' + dir); }
    const pdfs = entries
      .filter((e) => e.isFile() && /\.(pdf|docx|pptx)$/i.test(e.name) && !/-tagged\.pdf$/i.test(e.name)) // don't re-remediate our own outputs
      .map((e) => path.join(dir, e.name))
      .sort();
    if (!pdfs.length) throw invalidParams('No .pdf files found in ' + dir);
    if (pdfs.length > 60) throw invalidParams('Folder has ' + pdfs.length + ' PDFs; the batch limit is 60 (mirror of the app preflight). Split the folder.');
    const opts = validateRemediateOptions(args);
    const outDir = args.output_dir !== undefined ? resolveOutputDir(args, pdfs[0]) : dir;
    requireGeminiKey();
    const job = newJob('pdf_batch_remediate', { dir, files: pdfs.length, outputDir: outDir });
    enqueueJob(job, async (j) => {
      const perFile = [];
      for (let i = 0; i < pdfs.length; i++) {
        if (j.cancelRequested) { jobLog(j, 'batch cancelled at file ' + (i + 1) + '/' + pdfs.length); break; }
        const f = pdfs[i];
        jobLog(j, 'file ' + (i + 1) + '/' + pdfs.length + ': ' + path.basename(f));
        try {
          // Per-file validation (size/header) at run time — one bad file must not sink the batch.
          requireDocPath({ file_path: f });
          const summary = await remediateOneFile(f, outDir, opts, (line) => jobLog(j, line));
          perFile.push({ file: f, ok: true, verdict: summary.verdict, afterScore: summary.afterScore, aiVerificationIncomplete: summary.aiVerificationIncomplete, files: summary.files });
        } catch (e) {
          perFile.push({ file: f, ok: false, error: (e && e.message) || String(e) });
          jobLog(j, 'FAILED (continuing): ' + ((e && e.message) || e));
        }
      }
      return {
        dir, outputDir: outDir,
        requested: pdfs.length, attempted: perFile.length,
        succeeded: perFile.filter((r) => r.ok).length,
        failed: perFile.filter((r) => !r.ok).length,
        cancelled: j.cancelRequested || undefined,
        perFile,
      };
    });
    return { jobId: job.jobId, status: job.status, files: pdfs.length, note: 'Poll remediation_job_status for per-file progress; each file typically takes 5-30 minutes.' };
  },

  remediation_job_status(args) {
    const job = requireJob(args);
    if (!job) return { ok: false, error: 'No job with that job_id (jobs do not survive a server restart).' };
    return jobStatusPayload(job);
  },

  remediation_job_result(args) {
    const job = requireJob(args);
    if (!job) return { ok: false, error: 'No job with that job_id (jobs do not survive a server restart).' };
    // A cancelled batch keeps its PARTIAL scoreboard (files finished before the cancel) —
    // that result stays fetchable; only truly result-less states are refused.
    if (job.result == null) return { ok: false, status: job.status, error: 'Result is available only once the job completes. Check remediation_job_status.' };
    return { ok: true, jobId: job.jobId, kind: job.kind, status: job.status, partial: job.status === 'cancelled' || undefined, result: job.result };
  },

  async remediation_job_cancel(args) {
    const job = requireJob(args);
    if (!job) return { ok: false, error: 'No job with that job_id (jobs do not survive a server restart).' };
    if (['completed', 'failed', 'cancelled'].indexOf(job.status) !== -1) {
      return { ok: false, status: job.status, error: 'Job already finished; nothing to cancel.' };
    }
    job.cancelRequested = true;
    let killedRun = false;
    if (job.status === 'running' && driver) {
      killedRun = await driver.cancelActiveRun(); // page context closes → the run dies in seconds
      jobLog(job, 'cancel requested — active browser context ' + (killedRun ? 'closed' : 'not found'));
    }
    return { ok: true, jobId: job.jobId, wasRunning: job.status === 'running', killedRun };
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
        instructions: 'AlloFlow PDF remediation connector. Call `remediation_capabilities` first to confirm the environment is ready. `pdf_audit` scores a local PDF (1-3 min). For remediation PREFER the job flow: `pdf_remediate_start` (or `pdf_batch_remediate_start` for a folder) returns a job_id immediately; poll `remediation_job_status` every 30-60s and fetch `remediation_job_result` when completed — full runs take 5-30 minutes, longer than most tool timeouts, which is why the synchronous `pdf_remediate` exists only for small documents. Runs send document content to the Gemini API; work is single-flight (jobs queue FIFO).'
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
