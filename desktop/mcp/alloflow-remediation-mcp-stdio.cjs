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
 *   remediation_selftest     — proves this install can actually REMEDIATE, by
 *                              running the real pipeline in the real browser
 *                              against a scripted loopback model: no key, no
 *                              quota, nothing leaves the machine. Names the
 *                              broken stage. Presence (capabilities) is not
 *                              function; this is the difference.
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
 *   pdf_batch_audit_start    — job AUDITING a whole folder into one triage
 *                              scoreboard (JSON + CSV). The cheap pass: find
 *                              which documents need work before spending
 *                              remediation quota on all of them.
 *   pdf_remediate_from_scoreboard_start
 *                            — job remediating only the documents a scoreboard
 *                              banded (default needs-work). Closes the loop.
 *   remediation_job_status   — job state + recent pipeline telemetry lines.
 *   remediation_job_result   — the completed job's summary.
 *   remediation_job_cancel   — cancel a queued job, or kill the running one
 *                              (its browser context closes; in-flight AI calls
 *                              die with it).
 *
 * Long synchronous calls are observable and interruptible:
 *   - Progress: send `_meta.progressToken` on tools/call and the run's live
 *     pipeline telemetry streams back as `notifications/progress` (throttled to
 *     one per 250ms; `progress` counts every line so it stays monotonic). Opt-in
 *     per spec — no token, no notifications. Covers pdf_audit, pdf_remediate,
 *     and pdf_validate_ua. The job tools already expose the same telemetry
 *     through remediation_job_status.
 *   - Cancellation: `notifications/cancelled` for an in-flight tools/call stops
 *     the run. For pdf_audit/pdf_remediate that closes the driver's active
 *     browser context, killing queued and in-flight Gemini calls within seconds;
 *     pdf_validate_ua gets its own AbortSignal, which terminates only that
 *     validator process; the other tools stop the answer but cannot un-spend
 *     work already sent.
 *     No response is sent for a cancelled request, per spec.
 *
 * Safety properties:
 *   - stdio only; no network listener. AI tools send document content to Gemini.
 *     Core browser libraries and veraPDF are bundled locally; optional Office export
 *     may fetch public libraries. Use AI tools only with authorized documents.
 *   - stdout carries ONLY protocol messages; all logging goes to stderr.
 *   - Input validation happens BEFORE the browser/driver is touched, so bad
 *     arguments never launch Chromium or spend quota.
 *   - Single-flight: one remediation/audit at a time; concurrent calls get a
 *     clean in-band error instead of quota-competing runs.
 *   - Output files never overwrite: existing names get a numeric suffix.
 *
 * Env: GEMINI_API_KEY (required for pdf_* tools), ALLOFLOW_MCP_GEMINI_MODEL,
 * ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL, ALLOFLOW_MCP_MAX_RUN_MINUTES (default 30),
 * ALLOFLOW_MCP_VERBOSE=1, ALLOFLOW_MCP_HEADFUL=1 (debug),
 * ALLOFLOW_MCP_STATE_DIR (job records; default ~/.alloflow-mcp/jobs),
 * ALLOFLOW_MCP_ALLOWED_ROOTS (path-list; when set, every file/folder argument must
 *   resolve inside one of these roots — an auditable boundary for shared or
 *   student-data machines, rather than a promise about where the tool will look).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const zlib = require('zlib');

const Driver = require(path.join(__dirname, 'remediation_headless_driver.cjs'));

const SERVER_INFO = { name: 'alloflow-remediation', title: 'AlloFlow PDF Remediation (local)', version: '0.3.0' };
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_LINE_CHARS = 4000000;
const MAX_PDF_BYTES = 200 * 1024 * 1024; // mirrors the app's per-file batch preflight

// The skill remains authored once in agent_skills/. The MCPB builder copies those exact bytes
// into skills/, while repo runs resolve the source directly. Clients that understand the bounded
// skills extension can import the workflow; every other client safely ignores the capability.
const SKILL_NAME = 'alloflow-pdf-remediation';
const SKILL_URI = 'skill://alloflow-remediation/' + SKILL_NAME + '/SKILL.md';
function loadBundledSkill() {
  const candidates = [
    process.env.ALLOFLOW_MCP_SKILLS_DIR && path.join(process.env.ALLOFLOW_MCP_SKILLS_DIR, SKILL_NAME, 'SKILL.md'),
    path.resolve(__dirname, '..', 'skills', SKILL_NAME, 'SKILL.md'),
    path.resolve(__dirname, '..', '..', 'agent_skills', SKILL_NAME, 'SKILL.md'),
  ].filter(Boolean);
  const skillPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!skillPath) return null;
  const text = fs.readFileSync(skillPath, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!match) throw new Error('Bundled skill has no YAML frontmatter: ' + skillPath);
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([a-zA-Z0-9_-]+):\s*(.+)$/.exec(line);
    if (pair) frontmatter[pair[1]] = pair[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  if (frontmatter.name !== SKILL_NAME || !frontmatter.description) {
    throw new Error('Bundled skill frontmatter must contain the expected name and description: ' + skillPath);
  }
  const digest = 'sha256:' + crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
  return {
    path: skillPath, text,
    entry: { uri: SKILL_URI, frontmatter, resources: [{ uri: SKILL_URI, digest }] },
  };
}
const BUNDLED_SKILL = loadBundledSkill();
const REMEDIATION_PROMPT_NAME = 'remediate_document';
const REMEDIATION_PROMPT = {
  name: REMEDIATION_PROMPT_NAME,
  title: 'Remediate a document with AlloFlow',
  description: 'Apply AlloFlow canonical privacy-aware remediation workflow to a user-selected document.',
  arguments: [
    { name: 'document', description: 'A local path or an attached-document reference supplied by the user.', required: true },
    { name: 'goal', description: 'Optional remediation priorities or output requirements.', required: false },
  ],
};

function remediationPromptText(document, goal) {
  return [
    BUNDLED_SKILL.text.trimEnd(),
    '',
    '---',
    '',
    '## Current user request',
    '',
    'Document reference: ' + document,
    goal ? 'Additional goal: ' + goal : 'Additional goal: Use the canonical full remediation workflow.',
    '',
    'Apply the workflow above. Do not invent a local path, claim a privacy tier the connector did not return, or imply that merely retrieving this prompt opened the document.',
  ].join('\n');
}

function log(msg) { process.stderr.write('[alloflow-remediation-mcp] ' + msg + '\n'); }

let driver = null;
let busyWith = null; // tool name of the in-flight run, or null

// ── Progress + cancellation for the SYNCHRONOUS tools ───────────────────────
// A remediation blocks 5-30 minutes. Without these two the caller stares at a
// dead socket and cannot change its mind. Both are standard MCP and both ride
// infrastructure the driver already has: the per-run `onLog` telemetry sink
// (page console + the pipeline's own __mcpProgress) and `cancelActiveRun()`.
//
// The job tools already solve this by polling; these give the same visibility
// and the same escape hatch to clients that call the synchronous tools.

const PROGRESS_MIN_INTERVAL_MS = 250; // coalesce bursts; the pipeline can chatter

// Returns an onLog sink that emits notifications/progress, or null when the
// client did not opt in by sending _meta.progressToken (progress is opt-in per
// spec — an unsolicited progress notification is a protocol violation).
function makeProgressReporter(token) {
  if (token === undefined || token === null) return null;
  let seen = 0;       // counts EVERY telemetry line, so `progress` stays monotonic
  let lastSentAt = 0; // even across the lines the throttle drops
  return function onProgress(line) {
    seen++;
    const now = Date.now();
    const terminal = /(?:complete|cancel|fail)(?:d|led|ure)?\b/i.test(String(line));
    if (!terminal && now - lastSentAt < PROGRESS_MIN_INTERVAL_MS) return;
    lastSentAt = now;
    send({
      jsonrpc: '2.0',
      method: 'notifications/progress',
      params: { progressToken: token, progress: seen, message: String(line).slice(0, 300) },
    });
  };
}

// In-flight tools/call requests, keyed by String(id) so a numeric id and the
// string the client echoes back in notifications/cancelled still match.
const IN_FLIGHT = new Map();

// Cancelling one of these kills the driver's active browser context. Deliberately
// NOT pdf_validate_ua: it runs outside the single-flight lane and never occupies
// activeContext (driver, by design, so a job cancel cannot kill a validation), so
// calling cancelActiveRun for it would kill somebody ELSE's run. Also not
// remediation_setup, which is an npx download with no context to close.
const RUN_CANCELLABLE_TOOLS = new Set(['pdf_audit', 'pdf_remediate']);

// veraPDF is deliberately outside the remediation single-flight lane, but an
// unbounded number of concurrent JVMs can exhaust a desktop quickly. Two slots
// retain useful parallelism without letting one MCP client fork-bomb Java. A
// queued request remains independently cancellable through its AbortSignal.
const PDF_UA_MAX_CONCURRENCY = 2;
let pdfUaActive = 0;
const PDF_UA_WAITERS = [];

function validationAbortError() {
  const error = new Error('veraPDF validation cancelled');
  error.name = 'AbortError';
  error.code = 'ALLOFLOW_VALIDATION_CANCELLED';
  return error;
}

function acquirePdfUaSlot(signal, onProgress) {
  if (signal && signal.aborted) return Promise.reject(validationAbortError());
  if (pdfUaActive < PDF_UA_MAX_CONCURRENCY) {
    pdfUaActive++;
    return Promise.resolve();
  }
  if (onProgress) onProgress('veraPDF: queued; both local validator slots are busy');
  return new Promise((resolve, reject) => {
    const waiter = { resolve, reject, signal, onAbort: null };
    waiter.onAbort = () => {
      const index = PDF_UA_WAITERS.indexOf(waiter);
      if (index !== -1) PDF_UA_WAITERS.splice(index, 1);
      reject(validationAbortError());
    };
    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', waiter.onAbort, { once: true });
    }
    PDF_UA_WAITERS.push(waiter);
  });
}

function releasePdfUaSlot() {
  while (PDF_UA_WAITERS.length) {
    const waiter = PDF_UA_WAITERS.shift();
    if (waiter.signal && typeof waiter.signal.removeEventListener === 'function') {
      waiter.signal.removeEventListener('abort', waiter.onAbort);
    }
    if (waiter.signal && waiter.signal.aborted) continue;
    waiter.resolve();
    return;
  }
  pdfUaActive = Math.max(0, pdfUaActive - 1);
}

async function withPdfUaSlot(signal, onProgress, operation) {
  await acquirePdfUaSlot(signal, onProgress);
  try { return await operation(); }
  finally { releasePdfUaSlot(); }
}

function getDriver() {
  requireCurrentRuntimeBuild();
  if (!driver) driver = Driver.createDriver({ log });
  return driver;
}

async function validatePdfUaLocally(filePath, onProgress, signal) {
  try {
    const result = await getDriver().validatePdfUaCli({
      filePath, onProgress, onLog: onProgress, signal,
      timeoutMs: 300000, maxBytes: MAX_PDF_BYTES,
    });
    return {
      validator: 'veraPDF CLI',
      validatorVersion: result.validatorVersion || undefined,
      profile: result.profile || 'ua1',
      transport: 'local-java-cli',
      compliant: result.status === 'compliant',
      failedChecks: result.failedChecks,
      failedRuleCount: result.failedRules,
      failedRules: result.failedRuleSummaries || [],
      passedChecks: result.passedChecks,
      passedRuleCount: result.passedRules,
      inputSha256: result.inputSha256,
      inputBytes: result.inputBytes,
      validatedAt: result.validatedAt,
      validationDurationMs: result.validationDurationMs,
    };
  } catch (error) {
    const message = String(error && error.message || error);
    if (!/CLI could not start|CLI JAR is not packaged/i.test(message)) throw error;
    const offlineError = new Error(
      'The packaged offline veraPDF CLI could not start. pdf_validate_ua will not fall back '
      + 'to the browser validator because that path downloads public CDN dependencies. '
      + 'Reinstall the connector and confirm local Java is available. Cause: ' + message,
    );
    offlineError.cause = error;
    throw offlineError;
  }
}

function invalidParams(message) { const e = new Error(message); e.rpcCode = -32602; return e; }

// ── Filesystem boundary (opt-in) ────────────────────────────────────────────
// Unset, the connector reads and writes anywhere the user can — defensible for a personal stdio
// server behind a client that gates every call. Set, it is a boundary a district can point at:
// "this connector may only touch S:\accessibility-queue", enforced rather than promised. That
// matters for a tool aimed at schools, where the folders next door hold IEPs and evaluations.
const ALLOWED_ROOTS = (process.env.ALLOFLOW_MCP_ALLOWED_ROOTS || '')
  .split(path.delimiter).map((s) => s.trim()).filter(Boolean).map((s) => path.resolve(s));

// path.relative is the check, NOT string prefixing: `C:\queue-archive` starts with `C:\queue`
// as a string but is a DIFFERENT directory, and a prefix test would wrongly admit it. Resolving
// first also collapses any `..`, so no traversal survives to be compared.
function isInsideRoot(target, root) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}

function enforceAllowedRoot(resolvedPath, label) {
  if (!ALLOWED_ROOTS.length) return resolvedPath;
  if (ALLOWED_ROOTS.some((root) => isInsideRoot(resolvedPath, root))) return resolvedPath;
  throw invalidParams(label + ' is outside the folders this connector is allowed to use. '
    + 'Allowed: ' + ALLOWED_ROOTS.join(', ') + '. (Set by ALLOFLOW_MCP_ALLOWED_ROOTS.) Got: ' + resolvedPath);
}

function _requireFileOfType(args, extRe, extLabel) {
  if (typeof args.file_path !== 'string' || !args.file_path.trim()) throw invalidParams('arguments.file_path is required (absolute path to a local ' + extLabel + ' file)');
  const p = enforceAllowedRoot(path.resolve(args.file_path), 'arguments.file_path');
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

// Keep this contract identical to the remote MCP. The pipeline's internal mapper falls back to
// English for unknown values, so accepting Tesseract's legacy `spa` / `fra` codes here would
// silently run the wrong OCR model. Accept only canonical lower-case ISO/BCP 47 tags whose base
// language is actually supported.
const SUPPORTED_OCR_LANGUAGE_BASES = Object.freeze([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'uk', 'pl',
  'tr', 'sv', 'da', 'nb', 'no', 'fi', 'cs', 'sk', 'ro', 'hu', 'el', 'bg',
  'hr', 'sr', 'he', 'ar', 'fa', 'ps', 'ur', 'hi', 'bn', 'pa', 'gu', 'ta',
  'te', 'kn', 'ml', 'th', 'lo', 'km', 'my', 'vi', 'id', 'ms', 'tl', 'ja',
  'ko', 'am', 'ti', 'sw', 'so', 'ht', 'zh',
]);
const SUPPORTED_OCR_LANGUAGE_BASE_SET = new Set(SUPPORTED_OCR_LANGUAGE_BASES);
const OCR_LANGUAGE_TAG_RE = /^[a-z]{2}(?:-[a-z]{2,4})?$/;
const OCR_LANGUAGE_SCHEMA_PATTERN = '^(?:$|(?:' + SUPPORTED_OCR_LANGUAGE_BASES.join('|') + ')(?:-[a-z]{2,4})?)$';
const OCR_LANGUAGE_INPUT_SCHEMA = Object.freeze({
  type: 'string',
  description: "Supported lower-case ISO/BCP 47 OCR language tag (for example 'es', 'fr', or 'zh-hant'); omit or pass '' for auto-detect. Legacy Tesseract codes such as 'spa' and 'fra' are not accepted.",
  maxLength: 12,
  pattern: OCR_LANGUAGE_SCHEMA_PATTERN,
});

function optionalOcrLanguage(args) {
  if (args.ocr_language === undefined || args.ocr_language === '') return '';
  const value = args.ocr_language;
  if (
    typeof value !== 'string'
    || value.length > 12
    || !OCR_LANGUAGE_TAG_RE.test(value)
    || !SUPPORTED_OCR_LANGUAGE_BASE_SET.has(value.slice(0, 2))
  ) {
    throw invalidParams("arguments.ocr_language must be '' or a supported lower-case ISO/BCP 47 tag such as 'es', 'fr', or 'zh-hant' (legacy codes such as 'spa'/'fra' and combined codes are not accepted)");
  }
  return value;
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

// A job is terminal when nothing more will happen to it. Schema-3 queued/running jobs are
// automatically requeued. `interrupted` is reserved for legacy, corrupt, incomplete, or
// compatibility-unsafe durable state that cannot be resumed without risking wrong-file work.
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'interrupted'];

// ── Durability ──────────────────────────────────────────────────────────────
// A triage across 200 documents can run for hours; a remediation batch longer. Keeping job
// records only in memory meant a client restart, a crashed server, or a sleeping laptop erased
// the bookkeeping for all of it — while the actual outputs (per-file reports, scoreboards) sat
// on disk the whole time. The work was never lost, only the ability to ask about it. Records now
// persist so a restarted server can still answer, and so an interrupted run says so plainly
// instead of becoming a job id that no longer exists.
const STATE_DIR = process.env.ALLOFLOW_MCP_STATE_DIR
  ? path.resolve(process.env.ALLOFLOW_MCP_STATE_DIR)
  : path.join(os.homedir() || os.tmpdir(), '.alloflow-mcp', 'jobs');

function jobRecordPath(jobId) { return path.join(STATE_DIR, jobId + '.json'); }
function jobRecordTempPath(jobId) { return path.join(STATE_DIR, jobId + '.json.tmp'); }
function jobCheckpointPath(jobId) { return path.join(STATE_DIR, jobId + '.checkpoint.json.gz'); }
function jobCheckpointTempPath(jobId) { return path.join(STATE_DIR, jobId + '.checkpoint.json.gz.tmp'); }

const JOB_RECORD_SCHEMA = 3;
const JOB_EXECUTION_SCHEMA = 1;
const JOB_TERMINAL_INTENT_SCHEMA = 1;
const CHECKPOINT_SCHEMA = 1;
const CHECKPOINT_ENGINE_ABI = 1;
const CHECKPOINT_STAGES = new Set(['extraction', 'primary', 'round']);
const CHECKPOINT_MAX_JSON_BYTES = 128 * 1024 * 1024;
const CHECKPOINT_MAX_COMPRESSED_BYTES = 32 * 1024 * 1024;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;
const SAFE_JOB_ID_RE = /^rjob-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ENGINE_ENV_AT_BOOT = Object.freeze({
  geminiBase: process.env.ALLOFLOW_MCP_GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta/models',
  geminiModel: process.env.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview',
  geminiFallbackModel: process.env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
});

function sha256Bytes(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function jsonSha256(value) {
  return sha256Bytes(Buffer.from(JSON.stringify(value), 'utf8'));
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasExactKeys(value, keys) {
  return isPlainObject(value)
    && Object.keys(value).sort().join('\u0000') === keys.slice().sort().join('\u0000');
}

function integerInRange(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}

function atomicWriteBytes(finalPath, bytes, mode = 0o600) {
  const tempPath = finalPath + '.tmp';
  let fd = null;
  fs.mkdirSync(path.dirname(finalPath), { recursive: true });
  try {
    fd = fs.openSync(tempPath, 'w', mode);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    // Never remove the previous committed file first: delete-then-rename creates a crash window.
    fs.renameSync(tempPath, finalPath);
    if (process.platform !== 'win32') {
      let dirFd = null;
      try {
        dirFd = fs.openSync(path.dirname(finalPath), 'r');
        fs.fsyncSync(dirFd);
      } finally {
        try { if (dirFd !== null) fs.closeSync(dirFd); } catch (_) {}
      }
    }
  } catch (error) {
    try { if (fd !== null) fs.closeSync(fd); } catch (_) {}
    throw error;
  }
}

function atomicWriteJson(finalPath, value, mode = 0o600) {
  atomicWriteBytes(finalPath, Buffer.from(JSON.stringify(value, null, 2), 'utf8'), mode);
}

function checkpointEngineFiles() {
  const files = [__filename, path.join(__dirname, 'remediation_headless_driver.cjs')];
  for (const name of Driver.MODULE_FILES) files.push(path.join(Driver.ASSETS_ROOT, name));
  const vendorManifest = [
    path.join(__dirname, 'vendor', 'manifest.json'),
    path.join(Driver.ASSETS_ROOT, 'vendor', 'manifest.json'),
  ].find((candidate) => fs.existsSync(candidate));
  if (!vendorManifest) throw new Error('Checkpoint engine vendor manifest is missing.');
  files.push(vendorManifest);
  return files;
}

function checkpointEngineFileState(files = checkpointEngineFiles()) {
  return files.map((file) => {
    const stat = fs.statSync(file);
    return [file, stat.size, stat.mtimeMs, stat.ctimeMs];
  });
}

function computeCheckpointEngineDigest(files = checkpointEngineFiles()) {
  const hash = crypto.createHash('sha256');
  hash.update('alloflow-desktop-checkpoint-engine-abi:' + CHECKPOINT_ENGINE_ABI + '\n');
  for (const file of files) {
    const bytes = fs.readFileSync(file);
    hash.update(path.basename(file) + '\u0000' + bytes.length + '\u0000');
    hash.update(sha256Bytes(bytes));
    hash.update('\n');
  }
  let normalizedBase = ENGINE_ENV_AT_BOOT.geminiBase;
  try { normalizedBase = new URL(normalizedBase).toString(); } catch (_) {}
  hash.update(jsonSha256({
    geminiBase: normalizedBase,
    geminiModel: ENGINE_ENV_AT_BOOT.geminiModel,
    geminiFallbackModel: ENGINE_ENV_AT_BOOT.geminiFallbackModel,
  }));
  return hash.digest('hex');
}

function computeStableCheckpointEngineFingerprint() {
  const files = checkpointEngineFiles();
  const before = JSON.stringify(checkpointEngineFileState(files));
  const digest = computeCheckpointEngineDigest(files);
  const after = JSON.stringify(checkpointEngineFileState(files));
  if (before !== after) {
    throw new Error('Desktop remediation files changed while their build fingerprint was being verified.');
  }
  return { digest, fileState: after };
}

// Bind this process to the files it actually booted from. A desktop rebuild can
// replace modules while an older MCP process is still alive; recomputing only at
// job start would then label old in-memory code with the new on-disk digest.
const CHECKPOINT_ENGINE_AT_BOOT = computeStableCheckpointEngineFingerprint();
const CHECKPOINT_ENGINE_DIGEST_AT_BOOT = CHECKPOINT_ENGINE_AT_BOOT.digest;
const CHECKPOINT_ENGINE_FINGERPRINTED_AT = new Date().toISOString();
let checkpointEngineFileStateCache = CHECKPOINT_ENGINE_AT_BOOT.fileState;
let checkpointBuildVerification = {
  fingerprintSha256: CHECKPOINT_ENGINE_DIGEST_AT_BOOT,
  current: true,
  checkedAt: CHECKPOINT_ENGINE_FINGERPRINTED_AT,
  error: undefined,
};
function currentBuildFingerprint() {
  try {
    const diskState = JSON.stringify(checkpointEngineFileState());
    if (diskState === checkpointEngineFileStateCache) return { ...checkpointBuildVerification };
    const disk = computeStableCheckpointEngineFingerprint();
    checkpointEngineFileStateCache = disk.fileState;
    checkpointBuildVerification = {
      fingerprintSha256: CHECKPOINT_ENGINE_DIGEST_AT_BOOT,
      current: disk.digest === CHECKPOINT_ENGINE_DIGEST_AT_BOOT,
      checkedAt: new Date().toISOString(),
      error: disk.digest === CHECKPOINT_ENGINE_DIGEST_AT_BOOT
        ? undefined
        : 'The desktop remediation files changed after this MCP server started. Restart the connector before running or resuming work.',
    };
    return { ...checkpointBuildVerification };
  } catch (error) {
    checkpointBuildVerification = {
      fingerprintSha256: CHECKPOINT_ENGINE_DIGEST_AT_BOOT,
      current: false,
      checkedAt: new Date().toISOString(),
      error: 'Could not verify the current desktop remediation build: ' + ((error && error.message) || error),
    };
    return { ...checkpointBuildVerification };
  }
}
function requireCurrentRuntimeBuild() {
  const build = currentBuildFingerprint();
  if (!build.current) {
    const error = new Error('desktop_runtime_build_changed_since_server_start: ' + build.error);
    error.detail = build.error;
    throw error;
  }
  return build;
}
function checkpointEngineDigest() {
  requireCurrentRuntimeBuild();
  return CHECKPOINT_ENGINE_DIGEST_AT_BOOT;
}

function checkpointAudit(value) {
  if (!hasExactKeys(value, [
    'score', 'documentLanguage', 'requestedAuditors', 'auditorCount', 'sliced',
  ])) return null;
  if (
    !(value.score === null || (typeof value.score === 'number' && Number.isFinite(value.score)
      && value.score >= 0 && value.score <= 100)) ||
    !(value.documentLanguage === null || (typeof value.documentLanguage === 'string'
      && value.documentLanguage.length <= 32)) ||
    !integerInRange(value.requestedAuditors, 3, 5) ||
    !integerInRange(value.auditorCount, value.requestedAuditors, 5) ||
    value.sliced !== false
  ) return null;
  return value;
}

function checkpointExtraction(value, inputSha256) {
  if (!hasExactKeys(value, [
    'fileName', 'documentDigest', 'text', 'groundTruthCharCount', 'groundTruthMethod',
    'groundTruthPages', 'ocrMethod', 'ocrTesseractText', 'ocrVisionText',
    'ocrDisagreements', 'ocrPageErrors', 'ocrLowConfidencePages', 'detectedFolios',
    'ocrDupeCollapses', 'ocrColumnReorders', 'strippedEdgeLines', 'visionStripTrail',
  ])) return null;
  if (
    typeof value.fileName !== 'string' || value.fileName.length === 0 || value.fileName.length > 255 ||
    value.documentDigest !== 'sha256:' + inputSha256 ||
    typeof value.text !== 'string' || value.text.length === 0 ||
    !Number.isSafeInteger(value.groundTruthCharCount) || value.groundTruthCharCount < 0 ||
    !(value.groundTruthMethod === null || (typeof value.groundTruthMethod === 'string'
      && value.groundTruthMethod.length <= 128)) ||
    !(value.groundTruthPages === null || Array.isArray(value.groundTruthPages)) ||
    !(value.ocrMethod === null || (typeof value.ocrMethod === 'string'
      && value.ocrMethod.length <= 128)) ||
    typeof value.ocrTesseractText !== 'string' ||
    typeof value.ocrVisionText !== 'string' ||
    ![
      value.ocrDisagreements, value.ocrPageErrors, value.ocrLowConfidencePages,
      value.detectedFolios, value.ocrDupeCollapses, value.ocrColumnReorders,
      value.strippedEdgeLines, value.visionStripTrail,
    ].every(Array.isArray)
  ) return null;
  return value;
}

function checkpointTerminalAudit(value, countKey) {
  return hasExactKeys(value, ['score', countKey])
    && (value.score === null || (typeof value.score === 'number' && Number.isFinite(value.score) && value.score >= 0 && value.score <= 100))
    && (value[countKey] === null || (Number.isSafeInteger(value[countKey]) && value[countKey] >= 0));
}

function checkpointTerminalCapsule(value) {
  const keys = ['checkpointCapsuleSchema', ...Driver.TERMINAL_CHECKPOINT_REMEDIATION_FIELDS, 'axeAudit', 'secondEngineAudit'];
  const binding = value && value.verificationHtmlBinding;
  const active = value && value.activeContent;
  const findingTypes = new Set(['open-action', 'javascript', 'launch', 'embedded-files', 'additional-actions', 'other-actions', 'multimedia']);
  if (!hasExactKeys(value, keys) || value.checkpointCapsuleSchema !== 1
      || typeof value.accessibleHtml !== 'string' || value.accessibleHtml.length === 0
      || !hasExactKeys(binding, ['version', 'algorithm', 'digest', 'utf8ByteLength'])
      || binding.version !== 1 || binding.algorithm !== 'SHA-256'
      || binding.digest !== sha256Bytes(Buffer.from(value.accessibleHtml, 'utf8'))
      || binding.utf8ByteLength !== Buffer.byteLength(value.accessibleHtml, 'utf8')
      || !isPlainObject(value.verificationCoverage)
      || !['complete', 'complete-for-tested-scope', 'review-required', 'partial', 'unavailable'].includes(value.verificationState)
      || typeof value.afterScoreVerified !== 'boolean' || typeof value.requiresManualReview !== 'boolean'
      || !hasExactKeys(active, ['schema', 'complete', 'pageScanFailures', 'unexaminedStructures', 'any', 'externalLinks', 'findings'])
      || active.schema !== 1 || active.complete !== true || active.pageScanFailures !== 0 || active.unexaminedStructures !== 0
      || typeof active.any !== 'boolean' || !Number.isSafeInteger(active.externalLinks) || active.externalLinks < 0
      || !Array.isArray(active.findings) || active.any !== (active.findings.length > 0)
      || !active.findings.every((finding) => hasExactKeys(finding, ['type', 'count', 'label'])
        && findingTypes.has(finding.type) && Number.isSafeInteger(finding.count) && finding.count > 0
        && typeof finding.label === 'string' && finding.label.length > 0)
      || typeof value.sourceKind !== 'string' || value.sourceKind.length === 0
      || typeof value.finalText !== 'string' || value.finalText.length === 0
      || !(value.groundTruthMethod === null || typeof value.groundTruthMethod === 'string')
      || !(value.groundTruthPages === null || Array.isArray(value.groundTruthPages))
      || !(value.sourceStructTree === null || isPlainObject(value.sourceStructTree))
      || !(value.ocrAccuracy === null || isPlainObject(value.ocrAccuracy))
      || typeof value.isScanned !== 'boolean' || typeof value._experimentEarlyGetPages !== 'boolean'
      || typeof value._perLeafScannedOptOut !== 'boolean'
      || !checkpointTerminalAudit(value.axeAudit, 'totalViolations')
      || !checkpointTerminalAudit(value.secondEngineAudit, 'failViolations')) return null;
  return value;
}

function checkpointRemediationSnapshot(value) {
  if (!hasExactKeys(value, [
    'schema', 'stage', 'audit', 'remediation', 'nextRound', 'roundsRun',
    'roundLog', 'loopState', 'autoContinueDone',
  ])) return null;
  if (
    value.schema !== CHECKPOINT_SCHEMA ||
    !['primary', 'round'].includes(value.stage) ||
    !checkpointAudit(value.audit) ||
    !isPlainObject(value.remediation) ||
    (Object.hasOwn(value.remediation, 'checkpointCapsuleSchema')
      ? (!value.autoContinueDone || !checkpointTerminalCapsule(value.remediation))
      : (typeof value.remediation.accessibleHtml !== 'string' || value.remediation.accessibleHtml.length === 0)) ||
    !integerInRange(value.nextRound, 0, 5) ||
    !integerInRange(value.roundsRun, 0, 5) ||
    !Array.isArray(value.roundLog) || value.roundLog.length > 64 ||
    !value.roundLog.every((line) => typeof line === 'string' && line.length <= 1000) ||
    !hasExactKeys(value.loopState, ['lastViolations', 'lastDet', 'lastIssues', 'stagnant']) ||
    ![
      value.loopState.lastViolations, value.loopState.lastDet, value.loopState.lastIssues,
    ].every((entry) => entry === null || (typeof entry === 'number' && Number.isFinite(entry))) ||
    !integerInRange(value.loopState.stagnant, 0, 10) ||
    typeof value.autoContinueDone !== 'boolean' ||
    (value.stage === 'primary' && (value.nextRound !== 0 || value.roundsRun !== 0)) ||
    (value.stage === 'round' && (value.nextRound === 0 || value.nextRound !== value.roundsRun))
  ) return null;
  return value;
}

function validateCheckpointEnvelope(value, expected = {}) {
  if (!hasExactKeys(value, [
    'schema', 'sequence', 'stage', 'inputSha256', 'optionsSha256', 'engineSha256', 'snapshot',
  ])) return null;
  if (
    value.schema !== CHECKPOINT_SCHEMA ||
    !integerInRange(value.sequence, 1, 1000000) ||
    !CHECKPOINT_STAGES.has(value.stage) ||
    ![value.inputSha256, value.optionsSha256, value.engineSha256]
      .every((digest) => typeof digest === 'string' && SHA256_HEX_RE.test(digest)) ||
    (expected.inputSha256 && value.inputSha256 !== expected.inputSha256) ||
    (expected.optionsSha256 && value.optionsSha256 !== expected.optionsSha256) ||
    (expected.engineSha256 && value.engineSha256 !== expected.engineSha256)
  ) return null;
  let snapshot = null;
  if (
    value.stage === 'extraction' &&
    hasExactKeys(value.snapshot, ['schema', 'stage', 'audit', 'extraction']) &&
    value.snapshot.schema === CHECKPOINT_SCHEMA &&
    value.snapshot.stage === 'extraction' &&
    checkpointAudit(value.snapshot.audit) &&
    checkpointExtraction(value.snapshot.extraction, value.inputSha256)
  ) snapshot = value.snapshot;
  else if (value.stage === 'primary' || value.stage === 'round') {
    snapshot = checkpointRemediationSnapshot(value.snapshot);
  }
  return snapshot && snapshot.stage === value.stage ? value : null;
}

function readCheckpointCandidate(candidatePath, expected, pointer) {
  try {
    const stat = fs.statSync(candidatePath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > CHECKPOINT_MAX_COMPRESSED_BYTES) return null;
    const compressed = fs.readFileSync(candidatePath);
    const compressedSha256 = sha256Bytes(compressed);
    const json = zlib.gunzipSync(compressed, { maxOutputLength: CHECKPOINT_MAX_JSON_BYTES });
    if (!json.length || json.length > CHECKPOINT_MAX_JSON_BYTES) return null;
    const envelope = validateCheckpointEnvelope(JSON.parse(json.toString('utf8')), expected);
    if (!envelope) return null;
    if (
      pointer && pointer.sequence === envelope.sequence &&
      pointer.compressedSha256 && pointer.compressedSha256 !== compressedSha256
    ) return null;
    return { envelope, compressedSha256, sizeBytes: compressed.length, path: candidatePath };
  } catch (_) {
    return null;
  }
}

function checkpointPointer(candidate, job) {
  return {
    schema: CHECKPOINT_SCHEMA,
    sequence: candidate.envelope.sequence,
    stage: candidate.envelope.stage,
    inputSha256: candidate.envelope.inputSha256,
    optionsSha256: candidate.envelope.optionsSha256,
    engineSha256: candidate.envelope.engineSha256,
    compressedSha256: candidate.compressedSha256,
    sizeBytes: candidate.sizeBytes,
    attemptId: job.attemptId || null,
    createdAt: new Date().toISOString(),
  };
}

function loadLocalCheckpoint(job, expected, persistPointer = true) {
  const finalPath = jobCheckpointPath(job.jobId);
  const tempPath = jobCheckpointTempPath(job.jobId);
  const finalCandidate = readCheckpointCandidate(finalPath, expected, job.checkpoint);
  const tempCandidate = readCheckpointCandidate(tempPath, expected, null);
  let selected = finalCandidate;
  if (tempCandidate && (!selected || tempCandidate.envelope.sequence >= selected.envelope.sequence)) {
    try {
      fs.renameSync(tempPath, finalPath);
      selected = Object.assign({}, tempCandidate, { path: finalPath });
    } catch (_) {
      selected = tempCandidate;
    }
  } else if (fs.existsSync(tempPath)) {
    try { fs.rmSync(tempPath, { force: true }); } catch (_) {}
  }
  if (!selected) {
    try { fs.rmSync(finalPath, { force: true }); } catch (_) {}
    try { fs.rmSync(tempPath, { force: true }); } catch (_) {}
    return null;
  }
  const pointer = checkpointPointer(selected, job);
  if (persistPointer && JSON.stringify(job.checkpoint || null) !== JSON.stringify(pointer)) {
    job.checkpoint = pointer;
    persistJob(job, { required: true });
  }
  return selected.envelope;
}

function saveLocalCheckpoint(job, snapshot, compatibility) {
  const prior = loadLocalCheckpoint(job, compatibility, false);
  const sequence = Math.max(
    prior && prior.sequence || 0,
    job.checkpoint && job.checkpoint.sequence || 0,
  ) + 1;
  if (!integerInRange(sequence, 1, 1000000)) throw new Error('checkpoint_sequence_exhausted');
  const envelope = {
    schema: CHECKPOINT_SCHEMA,
    sequence,
    stage: snapshot && snapshot.stage,
    inputSha256: compatibility.inputSha256,
    optionsSha256: compatibility.optionsSha256,
    engineSha256: compatibility.engineSha256,
    snapshot,
  };
  if (!validateCheckpointEnvelope(envelope, compatibility)) {
    throw new Error('checkpoint_snapshot_invalid');
  }
  let json;
  try { json = Buffer.from(JSON.stringify(envelope), 'utf8'); }
  catch (_) { throw new Error('checkpoint_snapshot_invalid'); }
  if (!json.length) throw new Error('checkpoint_snapshot_invalid');
  if (json.length > CHECKPOINT_MAX_JSON_BYTES) throw new Error('checkpoint_snapshot_too_large');
  let compressed;
  try { compressed = zlib.gzipSync(json, { level: 6 }); }
  catch (_) { throw new Error('checkpoint_snapshot_invalid'); }
  if (!compressed.length) throw new Error('checkpoint_snapshot_invalid');
  if (compressed.length > CHECKPOINT_MAX_COMPRESSED_BYTES) {
    throw new Error('checkpoint_snapshot_too_large');
  }
  atomicWriteBytes(jobCheckpointPath(job.jobId), compressed);
  const candidate = { envelope, compressedSha256: sha256Bytes(compressed), sizeBytes: compressed.length };
  job.checkpoint = checkpointPointer(candidate, job);
  job.runStage = 'checkpoint:' + envelope.stage;
  persistJob(job, { required: true });
  return { saved: true, sequence, stage: envelope.stage };
}

function removeLocalCheckpointFiles(jobId) {
  try { fs.rmSync(jobCheckpointPath(jobId), { force: true }); } catch (_) {}
  try { fs.rmSync(jobCheckpointTempPath(jobId), { force: true }); } catch (_) {}
}

function clearLocalCheckpoint(job, persist = false) {
  removeLocalCheckpointFiles(job.jobId);
  job.checkpoint = null;
  job.currentFile = null;
  if (persist) persistJob(job, { required: true });
}

// Durable job acceptance and every checkpoint/file-boundary commit are fail-closed.
let jobRecordsWritable = true; // flipped false the first time persistence fails, so capabilities can say so

function persistJob(job, options = {}) {
  try {
    const record = {
      jobId: job.jobId, kind: job.kind, input: job.input, status: job.status,
      createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt,
      logLines: job.logLines, progress: job.progress || null,
      result: job.result, error: job.error,
      cancelRequested: job.cancelRequested === true,
      execution: job.execution || null,
      inputIdentitySha256: job.inputIdentitySha256 || null,
      inputSha256: job.inputSha256 || null,
      optionsSha256: job.optionsSha256 || null,
      engineSha256: job.engineSha256 || null,
      attemptId: job.attemptId || null,
      attemptNumber: Number(job.attemptNumber) || 0,
      attemptStartedAt: job.attemptStartedAt || null,
      runStage: job.runStage || null,
      checkpoint: job.checkpoint || null,
      currentFile: job.currentFile || null,
      fileRows: Array.isArray(job.fileRows) ? job.fileRows : [],
      terminalIntent: job.terminalIntent || null,
      durabilityWarning: job.durabilityWarning || null,
      persistedAt: new Date().toISOString(),
      schema: JOB_RECORD_SCHEMA,
    };
    if (process.env.NODE_ENV === 'test'
        && process.env.ALLOFLOW_MCP_TEST_FAIL_TERMINAL_RECORD_ONCE === '1'
        && TERMINAL_STATUSES.includes(job.status)
        && !job.terminalIntent
        && !persistJob._terminalRecordFaultInjected) {
      persistJob._terminalRecordFaultInjected = true;
      throw new Error('injected_terminal_record_persist_failure');
    }
    atomicWriteJson(jobRecordPath(job.jobId), record);
    return true;
  } catch (e) {
    jobRecordsWritable = false;
    if (!persistJob._warned) { persistJob._warned = true; log('job records are not persisting (' + ((e && e.message) || e) + ') — status survives only while this server runs'); }
    if (options.required) {
      const failure = new Error('job_state_persistence_failed');
      failure.cause = e;
      throw failure;
    }
    return false;
  }
}

function storedTerminalIntentIsValid(intent, rec) {
  return hasExactKeys(intent, [
    'schema', 'jobId', 'attemptId', 'attemptNumber', 'status', 'finishedAt',
  ])
    && intent.schema === JOB_TERMINAL_INTENT_SCHEMA
    && intent.jobId === rec.jobId
    && intent.attemptId === rec.attemptId
    && intent.attemptNumber === rec.attemptNumber
    && TERMINAL_STATUSES.includes(intent.status)
    && typeof intent.finishedAt === 'string'
    && Number.isFinite(Date.parse(intent.finishedAt));
}

// Two-phase terminal commit: first persist the result/error plus a terminal
// intent while the record is still unfinished, then publish the terminal
// status. If phase two fails, restart recovery finalizes from the intent rather
// than treating the old running record as resumable work.
function commitTerminalJob(job, status) {
  if (!TERMINAL_STATUSES.includes(status)) throw new Error('invalid_terminal_status');
  const intent = {
    schema: JOB_TERMINAL_INTENT_SCHEMA,
    jobId: job.jobId,
    attemptId: job.attemptId || null,
    attemptNumber: Number(job.attemptNumber) || 0,
    status,
    finishedAt: job.finishedAt || new Date().toISOString(),
  };
  job.finishedAt = intent.finishedAt;
  job.terminalIntent = intent;
  job.runStage = 'terminal-commit:' + status;
  // Phase one must remain visibly unfinished: this is what proves restart
  // recovery consumed the identity-bound intent rather than merely noticing an
  // already-terminal status.
  job.status = job.startedAt ? 'running' : 'queued';
  persistJob(job, { required: true });

  job.status = status;
  job.terminalIntent = null;
  try {
    persistJob(job, { required: true });
    job.durabilityWarning = null;
    return { recordCommitted: true, intentCommitted: true };
  } catch (error) {
    job.terminalIntent = intent;
    job.durabilityWarning = 'terminal_record_commit_failed; restart will finalize from the durable terminal intent';
    jobRecordsWritable = false;
    log('[' + job.jobId.slice(0, 13) + '] ' + job.durabilityWarning);
    return { recordCommitted: false, intentCommitted: true, error };
  }
}

function forgetJobRecord(jobId) {
  try { fs.rmSync(jobRecordPath(jobId), { force: true }); } catch (_) {}
  try { fs.rmSync(jobRecordTempPath(jobId), { force: true }); } catch (_) {}
  try { fs.rmSync(jobCheckpointPath(jobId), { force: true }); } catch (_) {}
  try { fs.rmSync(jobCheckpointTempPath(jobId), { force: true }); } catch (_) {}
}

const JOB_RECORD_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESTORED_TO_REQUEUE = [];

function storedExecutionIsValid(execution, kind) {
  if (
    !isPlainObject(execution) ||
    execution.schema !== JOB_EXECUTION_SCHEMA ||
    execution.kind !== kind ||
    !['pdf_remediate', 'pdf_batch_audit', 'pdf_batch_remediate',
      'pdf_remediate_from_scoreboard'].includes(kind) ||
    !Array.isArray(execution.files) ||
    execution.files.length < 1 ||
    execution.files.length > BATCH_LIMIT_AUDIT ||
    !execution.files.every((file) => typeof file === 'string' && path.isAbsolute(file)) ||
    typeof execution.outDir !== 'string' || !path.isAbsolute(execution.outDir) ||
    !isPlainObject(execution.options) ||
    typeof execution.skipExisting !== 'boolean' ||
    !(execution.meta === null || isPlainObject(execution.meta))
  ) return false;
  if (kind === 'pdf_remediate') return execution.files.length === 1 && execution.meta === null;
  if (!execution.meta || typeof execution.meta.dir !== 'string'
      || !path.isAbsolute(execution.meta.dir)) return false;
  if (kind === 'pdf_batch_audit') return execution.files.length <= BATCH_LIMIT_AUDIT;
  if (execution.files.length > BATCH_LIMIT_REMEDIATE) return false;
  if (kind === 'pdf_batch_remediate') return true;
  return typeof execution.meta.scoreboard === 'string'
    && path.isAbsolute(execution.meta.scoreboard)
    && Array.isArray(execution.meta.bands)
    && execution.meta.bands.every((band) => typeof band === 'string')
    && Number.isSafeInteger(execution.meta.scoredDocuments)
    && execution.meta.scoredDocuments >= execution.files.length
    && Array.isArray(execution.meta.missingFromDisk)
    && execution.meta.missingFromDisk.every((file) => typeof file === 'string');
}

function recordCanResume(rec) {
  return rec.schema === JOB_RECORD_SCHEMA &&
    storedExecutionIsValid(rec.execution, rec.kind) &&
    typeof rec.inputIdentitySha256 === 'string' && SHA256_HEX_RE.test(rec.inputIdentitySha256) &&
    (rec.inputSha256 === null || rec.inputSha256 === undefined || SHA256_HEX_RE.test(rec.inputSha256)) &&
    typeof rec.optionsSha256 === 'string' && SHA256_HEX_RE.test(rec.optionsSha256) &&
    typeof rec.engineSha256 === 'string' && SHA256_HEX_RE.test(rec.engineSha256);
}

function restoreJobs() {
  let names;
  try { names = fs.readdirSync(STATE_DIR); } catch (_) { return 0; }
  // Recover a fully-flushed write that was interrupted between fsync and rename. A valid temp
  // is the newer intended snapshot and atomically replaces any older committed record. Invalid
  // temp data is quarantined while the last known-good final record remains untouched.
  for (const n of names) {
    if (!/^rjob-.*\.json\.tmp$/.test(n)) continue;
    const tempPath = path.join(STATE_DIR, n);
    const finalPath = tempPath.slice(0, -4);
    try {
      const candidate = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
      const expectedId = n.slice(0, -'.json.tmp'.length);
      if (!candidate || candidate.jobId !== expectedId || !SAFE_JOB_ID_RE.test(candidate.jobId)) {
        throw new Error('invalid temporary job record');
      }
      fs.renameSync(tempPath, finalPath);
    } catch (_) {
      // Preserve corrupt evidence for support/recovery instead of making the job id disappear.
      try { fs.renameSync(tempPath, tempPath + '.corrupt-' + Date.now()); } catch (__) {}
    }
  }
  try { names = fs.readdirSync(STATE_DIR); } catch (_) { return 0; }
  const now = Date.now();
  let restored = 0;
  let interrupted = 0;
  let requeued = 0;
  for (const n of names) {
    if (!/^rjob-.*\.json$/.test(n)) continue;
    const p = path.join(STATE_DIR, n);
    let rec;
    try { rec = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { try { fs.renameSync(p, p + '.corrupt-' + Date.now()); } catch (__) {} continue; }
    const expectedId = n.slice(0, -'.json'.length);
    if (!rec || rec.jobId !== expectedId || !SAFE_JOB_ID_RE.test(rec.jobId)) {
      try { fs.renameSync(p, p + '.corrupt-' + Date.now()); } catch (_) {}
      removeLocalCheckpointFiles(expectedId);
      continue;
    }
    const age = now - Date.parse(rec.createdAt || 0);
    if (Number.isFinite(age) && age > JOB_RECORD_TTL_MS) {
      forgetJobRecord(rec.jobId);
      continue;
    }
    const priorStatus = rec.status;
    const wasUnfinished = priorStatus === 'queued' || priorStatus === 'running';
    const hasTerminalIntent = wasUnfinished && rec.terminalIntent != null;
    const terminalIntentValid = hasTerminalIntent && storedTerminalIntentIsValid(rec.terminalIntent, rec);
    const resumable = wasUnfinished && !hasTerminalIntent && rec.cancelRequested !== true && recordCanResume(rec) &&
      ((priorStatus === 'queued' && !rec.startedAt) || priorStatus === 'running');
    if (terminalIntentValid) {
      rec.status = rec.terminalIntent.status;
      rec.finishedAt = rec.terminalIntent.finishedAt;
      rec.terminalIntent = null;
    } else if (wasUnfinished && rec.cancelRequested === true) {
      rec.status = 'cancelled';
      rec.finishedAt = rec.finishedAt || new Date().toISOString();
    } else if (resumable) {
      rec.status = 'queued';
      rec.finishedAt = null;
      rec.error = null;
      requeued++;
    } else if (wasUnfinished) {
      rec.status = 'interrupted';
      rec.finishedAt = rec.finishedAt || new Date().toISOString();
      interrupted++;
    }
    const restoredJob = {
      jobId: rec.jobId, kind: rec.kind, input: rec.input, status: rec.status,
      createdAt: rec.createdAt, startedAt: rec.startedAt || null, finishedAt: rec.finishedAt || null,
      cancelRequested: false,
      logLines: Array.isArray(rec.logLines) ? rec.logLines : [],
      progress: rec.progress && typeof rec.progress === 'object' ? rec.progress : null,
      result: rec.result === undefined ? null : rec.result,
      error: rec.error || null,
      execution: isPlainObject(rec.execution) ? rec.execution : null,
      inputIdentitySha256: rec.inputIdentitySha256 || null,
      inputSha256: rec.inputSha256 || null,
      optionsSha256: rec.optionsSha256 || null,
      engineSha256: rec.engineSha256 || null,
      attemptId: rec.attemptId || null,
      attemptNumber: Number(rec.attemptNumber) || 0,
      attemptStartedAt: rec.attemptStartedAt || null,
      runStage: rec.runStage || null,
      checkpoint: isPlainObject(rec.checkpoint) ? rec.checkpoint : null,
      currentFile: isPlainObject(rec.currentFile) ? rec.currentFile : null,
      fileRows: Array.isArray(rec.fileRows) ? rec.fileRows.filter(isPlainObject).slice(0, BATCH_LIMIT_AUDIT) : [],
      terminalIntent: null,
      durabilityWarning: rec.durabilityWarning || null,
      restoredFromStatus: resumable ? priorStatus : null,
      restored: true,
    };
    JOBS.set(rec.jobId, restoredJob);
    if (resumable) RESTORED_TO_REQUEUE.push(restoredJob);
    if (wasUnfinished) {
      if (!resumable) removeLocalCheckpointFiles(rec.jobId);
      persistJob(restoredJob, { required: true });
    } else {
      removeLocalCheckpointFiles(rec.jobId);
    }
    restored++;
  }
  // Checkpoint bodies can contain extracted document text. Never retain an orphan after its
  // record expired, was quarantined, or reached a terminal state.
  try {
    for (const name of fs.readdirSync(STATE_DIR)) {
      const match = /^(rjob-[0-9a-f-]{36})\.checkpoint\.json\.gz(?:\.tmp)?$/.exec(name);
      if (!match) continue;
      const job = JOBS.get(match[1]);
      if (!job || TERMINAL_STATUSES.includes(job.status)) removeLocalCheckpointFiles(match[1]);
    }
  } catch (_) {}
  if (restored) log('restored ' + restored + ' job record(s) from ' + STATE_DIR
    + (requeued ? ' (' + requeued + ' requeued)' : '')
    + (interrupted ? ' (' + interrupted + ' marked interrupted)' : ''));
  return restored;
}

function newJob(kind, input, execution) {
  if (JOBS.size >= MAX_JOBS) {
    // Evict the oldest FINISHED job; never evict queued/running ones.
    for (const [id, j] of JOBS) {
      if (TERMINAL_STATUSES.indexOf(j.status) !== -1) { JOBS.delete(id); forgetJobRecord(id); break; }
    }
    if (JOBS.size >= MAX_JOBS) throw new Error('Job store is full of unfinished jobs (' + MAX_JOBS + '); wait for or cancel some first.');
  }
  const job = {
    jobId: 'rjob-' + crypto.randomUUID(),
    kind, input,
    status: 'queued', // queued | running | completed | failed | cancelled | interrupted (unsafe resume)
    createdAt: new Date().toISOString(),
    startedAt: null, finishedAt: null,
    cancelRequested: false,
    logLines: [],
    result: null, error: null,
    execution,
    inputIdentitySha256: execution.inputIdentitySha256,
    inputSha256: null,
    optionsSha256: execution.optionsSha256,
    engineSha256: execution.engineSha256,
    attemptId: null,
    attemptNumber: 0,
    attemptStartedAt: null,
    runStage: 'queued',
    checkpoint: null,
    currentFile: null,
    fileRows: [],
    terminalIntent: null,
    durabilityWarning: null,
  };
  JOBS.set(job.jobId, job);
  try {
    persistJob(job, { required: true });
  } catch (error) {
    JOBS.delete(job.jobId);
    forgetJobRecord(job.jobId);
    throw error;
  }
  return job;
}

function jobLog(job, line) {
  job.logLines.push(new Date().toISOString().slice(11, 19) + ' ' + String(line).slice(0, 300));
  if (job.logLines.length > JOB_LOG_LINES) job.logLines.splice(0, job.logLines.length - JOB_LOG_LINES);
  log('[' + job.jobId.slice(0, 13) + '] ' + String(line).slice(0, 300));
}

// ── Batch progress + ETA ────────────────────────────────────────────────────
// The pipeline is single-flight ON PURPOSE (its Gemini gate paces a run's calls against a
// per-run ceiling that is reset per run, so two concurrent runs would double the transport
// concurrency the gate exists to prevent). A folder batch is therefore serial, and a serial
// batch of 40 documents is a long afternoon. It does not need to be an opaque one: a caller
// should be able to tell "slow" from "stuck" without reading telemetry, which is the same
// question remediation_job_status already exists to answer.
function noteBatchProgress(job, { done, total, processedMs }) {
  const p = job.progress || (job.progress = { total, done: 0, processed: 0, processedMs: 0 });
  p.total = total;
  p.done = done;
  if (typeof processedMs === 'number') { p.processed += 1; p.processedMs += processedMs; }
  // One write per completed/skipped file is cheap compared with the remediation itself and makes
  // the visible checkpoint survive a connector restart. Log lines remain intentionally buffered.
  persistJob(job, { required: true });
}

function batchProgressPayload(job) {
  const p = job.progress;
  if (!p || !p.total) return undefined;
  const remaining = Math.max(0, p.total - p.done);
  // Mean over files actually PROCESSED — skipped files finish instantly and would drag the
  // estimate to nonsense. Absent until one file has completed: an ETA from zero samples is a
  // guess wearing a number's clothes.
  const meanMs = p.processed ? Math.round(p.processedMs / p.processed) : null;
  return {
    filesDone: p.done,
    filesTotal: p.total,
    filesRemaining: remaining,
    meanSecondsPerFile: meanMs ? Math.round(meanMs / 1000) : undefined,
    estimatedMinutesRemaining: meanMs && remaining ? Math.round((remaining * meanMs) / 60000) : (remaining ? undefined : 0),
    estimateBasis: meanMs
      ? 'Observed mean of ' + p.processed + ' completed file(s) in THIS run, extrapolated over the ' + remaining + ' not yet reached. Documents vary a lot in size and scan quality, and any file still to be skipped will finish instantly, so treat this as a floor-ish guide, not a promise.'
      : 'No file has finished yet, so there is nothing to estimate from.',
  };
}

function jobStatusPayload(job) {
  return {
    jobId: job.jobId, kind: job.kind, status: job.status,
    createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt,
    input: job.input,
    progress: batchProgressPayload(job),
    recentLog: job.logLines.slice(-15),
    error: job.error || undefined,
    resultAvailable: job.result != null,
    durabilityWarning: job.durabilityWarning || undefined,
    restored: job.restored || undefined,
    interruptedNote: job.status === 'interrupted'
      ? 'This job had legacy, incomplete, corrupt, or compatibility-unsafe recovery state, so AlloFlow stopped rather than resume against the wrong input or engine. Verified outputs remain on disk; inspect the error and re-run explicitly if appropriate.'
      : undefined,
  };
}

function enqueueJob(job, runner) {
  jobQueue = jobQueue.then(async () => {
    if (TERMINAL_STATUSES.includes(job.status)) return;
    // The FIFO chain serializes jobs against EACH OTHER, but a synchronous tool
    // (pdf_audit / pdf_remediate) may hold the single-flight lane when this job's
    // turn arrives. Waiting here is the correct semantics — withSingleFlight would
    // THROW and fail the job spuriously.
    let waitedForLane = false;
    while (busyWith && !job.cancelRequested) {
      if (!waitedForLane) { waitedForLane = true; jobLog(job, 'waiting for the in-progress ' + busyWith + ' call to finish'); }
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (job.cancelRequested) {
      job.finishedAt = new Date().toISOString();
      jobLog(job, 'cancelled before start');
      commitTerminalJob(job, 'cancelled');
      return;
    }
    const attemptStartedAt = new Date().toISOString();
    job.status = 'running';
    job.startedAt = job.startedAt || attemptStartedAt;
    job.attemptNumber = Math.max(0, Number(job.attemptNumber) || 0) + 1;
    job.attemptId = crypto.randomUUID();
    job.attemptStartedAt = attemptStartedAt;
    job.runStage = 'starting';
    // Persisted at each transition, not on every log line: a 200-file triage would otherwise do
    // thousands of writes to record telemetry that is already on stderr.
    persistJob(job, { required: true });
    // One request-scoped signal owns the whole attempt, including the
    // post-export veraPDF process that runs after the browser page has closed.
    // This controller is runtime-only and is deliberately not persisted.
    const attemptAbortController = new AbortController();
    job.abortController = attemptAbortController;
    try {
      job.result = await withSingleFlight(job.kind, () => runner(job));
      // (2026-08-16) Stash the run's diagnostic snapshot on the job record so
      // remediation_job_diagnostics can serve it after the fact (numbers/enums only).
      try {
        const _diag = driver && typeof driver.takeLastRunDiagnostics === 'function' ? driver.takeLastRunDiagnostics() : null;
        if (_diag) job.diagnostics = _diag;
      } catch (_) { /* diagnostics must never affect job completion */ }
      // A cancelled batch returns normally with a partial scoreboard — the status
      // must still say cancelled (the result stays fetchable, see job_result).
      job.status = job.cancelRequested ? 'cancelled' : 'completed';
    } catch (e) {
      if (job.cancelRequested) { job.status = 'cancelled'; }
      else if (e && e.interrupted) {
        job.status = 'interrupted';
        job.error = e.message || String(e);
      } else { job.status = 'failed'; job.error = (e && e.message) || String(e); }
    } finally {
      job.finishedAt = new Date().toISOString();
      jobLog(job, job.status + (job.error ? ': ' + job.error : ''));
      commitTerminalJob(job, job.status);
      if (job.abortController === attemptAbortController) job.abortController = null;
    }
  }).catch((error) => {
    // The FIFO chain itself must never break, but a required durability failure
    // must remain visible rather than disappearing into an empty catch.
    job.durabilityWarning = (error && error.message) || 'job_queue_transition_failed';
    jobRecordsWritable = false;
    log('[' + job.jobId.slice(0, 13) + '] queue transition failed: ' + job.durabilityWarning);
  });
}

const JOB_NOT_FOUND = 'No job with that job_id. Records are kept for ' + Math.round(JOB_RECORD_TTL_MS / 86400000) + ' days and survive a server restart, so this id is unknown, expired, or was evicted once ' + MAX_JOBS + ' newer jobs accumulated.';

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
  if (args.auto_continue !== undefined && typeof args.auto_continue !== 'boolean') throw invalidParams('arguments.auto_continue must be a boolean');
  if (args.validate_ua !== undefined && typeof args.validate_ua !== 'boolean') throw invalidParams('arguments.validate_ua must be a boolean');
  const autoContinueRounds = optionalBoundedNumber(args, 'auto_continue_rounds', 1, 5);
  return {
    targetScore: targetScore === undefined ? 95 : targetScore,
    fixPasses: fixPasses === undefined ? 2 : fixPasses,
    polishPasses: polishPasses === undefined ? 0 : polishPasses,
    taggedPdf: args.tagged_pdf !== false,
    autoContinue: args.auto_continue === true,
    autoContinueRounds: autoContinueRounds === undefined ? 3 : autoContinueRounds,
    validateUa: args.validate_ua === true,
    ocrLanguage: optionalOcrLanguage(args),
    maxRunMinutes: Math.max(1, Number(process.env.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30),
  };
}

function checkpointOptionsDigest(options) {
  return jsonSha256({
    targetScore: options.targetScore,
    fixPasses: options.fixPasses,
    polishPasses: options.polishPasses,
    taggedPdf: options.taggedPdf,
    autoContinue: options.autoContinue,
    autoContinueRounds: options.autoContinueRounds,
    validateUa: options.validateUa,
    ocrLanguage: options.ocrLanguage,
    maxRunMinutes: options.maxRunMinutes,
  });
}

function inputIdentityDigest(files) {
  return jsonSha256(files.map((file) => {
    const stat = fs.statSync(file);
    return { file, sizeBytes: stat.size, modifiedMs: Math.trunc(stat.mtimeMs) };
  }));
}

function storedExecution(kind, files, outDir, options, skipExisting, meta = null) {
  const normalizedFiles = files.map((file) => path.resolve(file));
  const normalizedOptions = Object.assign({}, options);
  const optionsSha256 = kind === 'pdf_batch_audit'
    ? jsonSha256({ kind, ocrLanguage: normalizedOptions.ocrLanguage || '',
      maxRunMinutes: normalizedOptions.maxRunMinutes })
    : checkpointOptionsDigest(normalizedOptions);
  return {
    schema: JOB_EXECUTION_SCHEMA,
    kind,
    files: normalizedFiles,
    outDir: path.resolve(outDir),
    options: normalizedOptions,
    skipExisting: !!skipExisting,
    meta,
    inputIdentitySha256: inputIdentityDigest(normalizedFiles),
    optionsSha256,
    engineSha256: checkpointEngineDigest(),
  };
}

function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function unsafeResume(message) {
  const error = new Error(message);
  error.interrupted = true;
  return error;
}

async function prepareStoredExecution(job) {
  const execution = job.execution;
  if (!storedExecutionIsValid(execution, job.kind)) throw unsafeResume('stored_execution_invalid');
  const expectedOptionsSha256 = job.kind === 'pdf_batch_audit'
    ? jsonSha256({ kind: job.kind, ocrLanguage: execution.options.ocrLanguage || '',
      maxRunMinutes: execution.options.maxRunMinutes })
    : checkpointOptionsDigest(execution.options);
  if (expectedOptionsSha256 !== job.optionsSha256 || expectedOptionsSha256 !== execution.optionsSha256) {
    throw unsafeResume('stored_options_digest_mismatch');
  }
  const currentInputIdentitySha256 = inputIdentityDigest(execution.files);
  if (currentInputIdentitySha256 !== job.inputIdentitySha256
      || currentInputIdentitySha256 !== execution.inputIdentitySha256) {
    throw unsafeResume('stored_input_identity_mismatch');
  }
  const currentEngineSha256 = checkpointEngineDigest();
  if (job.restoredFromStatus === 'queued') {
    // An untouched queued job has no prior engine work to preserve.
    job.engineSha256 = currentEngineSha256;
    execution.engineSha256 = currentEngineSha256;
  }
  job.runStage = 'preparing-inputs';
  persistJob(job, { required: true });
  const entries = [];
  for (const file of execution.files) {
    if (job.cancelRequested) throw new Error('cancelled');
    const resolved = requireDocPath({ file_path: file });
    if (resolved !== path.resolve(file)) throw unsafeResume('stored_input_path_mismatch');
    const before = fs.statSync(resolved);
    const digest = await sha256File(resolved);
    const after = fs.statSync(resolved);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) {
      throw unsafeResume('input_changed_while_hashing');
    }
    entries.push({
      file: resolved,
      sha256: digest,
      sizeBytes: after.size,
      modifiedMs: Math.trunc(after.mtimeMs),
    });
  }
  const inputSha256 = jsonSha256(entries.map(({ file, sha256, sizeBytes }) => ({
    file, sha256, sizeBytes,
  })));
  if (job.inputSha256 && job.inputSha256 !== inputSha256) {
    throw unsafeResume('input_changed_since_job_started');
  }
  execution.fileDigests = entries;
  job.inputSha256 = inputSha256;
  job.runStage = 'inputs-verified';
  persistJob(job, { required: true });
  return {
    entries,
    byFile: new Map(entries.map((entry) => [entry.file, entry])),
    currentEngineSha256,
    engineCompatible: job.engineSha256 === currentEngineSha256,
  };
}

function resolveOutputDir(args, filePath) {
  if (args.output_dir === undefined) return path.dirname(filePath);
  if (typeof args.output_dir !== 'string' || !args.output_dir.trim()) throw invalidParams('arguments.output_dir must be a non-empty string');
  // Checked BEFORE mkdir: a rejected boundary must not leave a directory behind as a side effect.
  const outDir = enforceAllowedRoot(path.resolve(args.output_dir), 'arguments.output_dir');
  fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

// ── Folder batches ──────────────────────────────────────────────────────────
// Remediation is 5-30 min/file and spends real quota, so its batch stays at the app preflight's
// 60. An audit is 1-3 min and writes nothing, which is the whole point of triage: you run it over
// a folder too big to remediate blind, precisely so you only remediate the files that need it.
const BATCH_LIMIT_REMEDIATE = 60;
const BATCH_LIMIT_AUDIT = 200;

function listBatchInputs(dirPathArg, limit, label) {
  if (typeof dirPathArg !== 'string' || !dirPathArg.trim()) throw invalidParams('arguments.dir_path is required');
  const dir = enforceAllowedRoot(path.resolve(dirPathArg), 'arguments.dir_path');
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (_) { throw invalidParams('arguments.dir_path does not exist or is unreadable: ' + dir); }
  const files = entries
    .filter((e) => e.isFile() && /\.(pdf|docx|pptx)$/i.test(e.name) && !/-tagged\.pdf$/i.test(e.name)) // don't re-process our own outputs
    .map((e) => path.join(dir, e.name))
    .sort();
  if (!files.length) throw invalidParams('No .pdf files found in ' + dir);
  if (files.length > limit) throw invalidParams('Folder has ' + files.length + ' documents; the ' + label + ' batch limit is ' + limit + '. Split the folder.');
  return { dir, files };
}

// ── Audit scoreboard ────────────────────────────────────────────────────────
// One artifact a coordinator can actually open, not 200 JSON files. Written under a
// collision-safe name like every other output (the never-overwrite invariant holds), and each
// new scoreboard carries the FULL merged view, so the newest file is always the complete picture.
const SCOREBOARD_STEM = 'accessibility-audit-scoreboard';

function readPriorScoreboards(outDir) {
  const seen = new Map(); // file path -> prior row
  let names;
  try { names = fs.readdirSync(outDir); } catch (_) { return seen; }
  for (const n of names) {
    if (!n.startsWith(SCOREBOARD_STEM) || !n.endsWith('.json')) continue;
    try {
      const prev = JSON.parse(fs.readFileSync(path.join(outDir, n), 'utf8'));
      for (const row of (prev && prev.files) || []) {
        if (row && row.file && row.ok) seen.set(row.file, row);
      }
    } catch (_) { /* an unreadable or hand-edited scoreboard just means less resumability */ }
  }
  return seen;
}

// Triage bands. These decide what a human does next, so they are named for the action, not the
// number: `scanned` outranks the score because an image-only PDF needs OCR before its score means
// anything at all, and a coordinator sorting by score alone would mis-rank exactly those files.
function triageBand(row) {
  if (!row.ok) return 'failed';
  if (row.isScanned) return 'scanned';
  const s = Number(row.score);
  if (!Number.isFinite(s) || s < 0) return 'failed';
  if (s < 70) return 'needs-work';
  if (s < 90) return 'review';
  return 'likely-ok';
}

// `name` leads because this CSV is opened in a spreadsheet and sorted by eye: a column of long
// absolute paths is unreadable at a glance. The full path stays (a folder can hold two files with
// the same name only if one came from output_dir, and ambiguity in an audit record is not worth
// the tidiness), and the folder itself is recorded once in the JSON's generatedFor.
const SCOREBOARD_COLUMNS = ['name', 'file', 'band', 'score', 'critical', 'serious', 'moderate', 'minor', 'pages', 'scanned', 'searchableText', 'language', 'error'];

function scoreboardCsv(rows) {
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const counts = (r) => (r.issueCounts || {});
  const line = (r) => [
    path.basename(r.file || ''), r.file, triageBand(r), r.ok ? r.score : '',
    counts(r).critical, counts(r).serious, counts(r).moderate, counts(r).minor,
    r.pageCount, r.isScanned, r.hasSearchableText, r.documentLanguage, r.error || '',
  ].map(cell).join(',');
  return [SCOREBOARD_COLUMNS.join(','), ...rows.map(line)].join('\r\n') + '\r\n';
}

function writeScoreboard(outDir, dir, rows) {
  const bands = rows.reduce((acc, r) => { const b = triageBand(r); acc[b] = (acc[b] || 0) + 1; return acc; }, {});
  const scored = rows.filter((r) => r.ok && Number.isFinite(Number(r.score)));
  const payload = {
    generatedFor: dir,
    documents: rows.length,
    bands,
    medianScore: scored.length
      ? scored.map((r) => Number(r.score)).sort((a, b) => a - b)[Math.floor(scored.length / 2)]
      : null,
    triage: 'Bands name the next action, not a grade. scanned = image-only, needs OCR before its score means anything. needs-work (<70) = remediate first. review (70-89) = worth a look. likely-ok (90+) = spend quota elsewhere. Scores come from the same deduction-grounded audit the app uses; they judge the SOURCE document, not any remediated output.',
    files: rows,
  };
  const jsonPath = claimOutputPath(outDir, SCOREBOARD_STEM + '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  const csvPath = claimOutputPath(outDir, path.basename(jsonPath).replace(/\.json$/, '.csv'));
  fs.writeFileSync(csvPath, scoreboardCsv(rows), 'utf8');
  return { scoreboardJson: jsonPath, scoreboardCsv: csvPath, bands, medianScore: payload.medianScore };
}

const TRIAGE_BANDS = ['scanned', 'needs-work', 'review', 'likely-ok', 'failed'];

function validateBands(value) {
  if (value === undefined) return ['needs-work']; // the band the triage exists to find
  if (!Array.isArray(value) || !value.length) throw invalidParams('arguments.bands must be a non-empty array of band names');
  const unknown = value.filter((b) => TRIAGE_BANDS.indexOf(b) === -1);
  if (unknown.length) throw invalidParams('arguments.bands has unknown band(s): ' + unknown.join(', ') + '. Valid: ' + TRIAGE_BANDS.join(', '));
  return Array.from(new Set(value));
}

// Accepts an explicit scoreboard, or a folder whose NEWEST scoreboard is used. The folder form
// exists because the natural way to ask for this is "remediate what needs work in S:\queue", and
// making the caller hunt for a filename first would be a worse tool for no safety gained.
function loadScoreboard(args) {
  const hasPath = args.scoreboard_path !== undefined;
  const hasDir = args.dir_path !== undefined;
  if (hasPath === hasDir) throw invalidParams('Pass exactly one of arguments.scoreboard_path or arguments.dir_path');

  let scoreboardPath;
  if (hasPath) {
    if (typeof args.scoreboard_path !== 'string' || !args.scoreboard_path.trim()) throw invalidParams('arguments.scoreboard_path must be a non-empty string');
    scoreboardPath = enforceAllowedRoot(path.resolve(args.scoreboard_path), 'arguments.scoreboard_path');
    if (!fs.existsSync(scoreboardPath)) throw invalidParams('No scoreboard at ' + scoreboardPath);
  } else {
    if (typeof args.dir_path !== 'string' || !args.dir_path.trim()) throw invalidParams('arguments.dir_path must be a non-empty string');
    const dir = enforceAllowedRoot(path.resolve(args.dir_path), 'arguments.dir_path');
    let names;
    try { names = fs.readdirSync(dir); } catch (_) { throw invalidParams('arguments.dir_path does not exist or is unreadable: ' + dir); }
    const boards = names
      .filter((n) => n.startsWith(SCOREBOARD_STEM) && n.endsWith('.json'))
      .map((n) => ({ p: path.join(dir, n), m: (() => { try { return fs.statSync(path.join(dir, n)).mtimeMs; } catch (_) { return 0; } })() }))
      .sort((a, b) => b.m - a.m);
    if (!boards.length) throw invalidParams('No ' + SCOREBOARD_STEM + '*.json in ' + dir + ' — run pdf_batch_audit_start on that folder first.');
    scoreboardPath = boards[0].p;
  }

  let board;
  try { board = JSON.parse(fs.readFileSync(scoreboardPath, 'utf8')); }
  catch (e) { throw invalidParams('Could not read that scoreboard as JSON (' + ((e && e.message) || e) + '): ' + scoreboardPath); }
  if (!board || typeof board !== 'object' || !Array.isArray(board.files)) {
    throw invalidParams('That file is not an AlloFlow audit scoreboard (no `files` array): ' + scoreboardPath);
  }
  return { scoreboardPath, board };
}

const COMPLETION_MANIFEST_SCHEMA = 1;
const COMPLETION_MANIFEST_KIND = 'alloflow-remediation-completion';

function completionManifestPath(outDir, reportPath) {
  const reportBase = path.basename(reportPath);
  const base = reportBase.replace(/-remediation-report(-\d+)?\.json$/i,
    (_match, suffix) => '-remediation-completion' + (suffix || '') + '.json');
  return claimOutputPath(outDir, base === reportBase ? reportBase + '.completion.json' : base);
}

async function writeCompletionManifest(filePath, outDir, summary, compatibility, job) {
  const artifacts = [];
  for (const role of ['accessibleHtml', 'taggedPdf', 'report']) {
    const artifactPath = summary.files && summary.files[role];
    if (!artifactPath) continue;
    const resolved = path.resolve(artifactPath);
    const relativePath = path.relative(outDir, resolved);
    if (!relativePath || path.isAbsolute(relativePath) || relativePath.startsWith('..' + path.sep)
      || relativePath === '..') throw new Error('completion_artifact_outside_output_dir');
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) throw new Error('completion_artifact_missing');
    const sha256 = await sha256File(resolved);
    const statAfter = fs.statSync(resolved);
    if (stat.size !== statAfter.size || stat.mtimeMs !== statAfter.mtimeMs ||
      stat.ctimeMs !== statAfter.ctimeMs || stat.dev !== statAfter.dev || stat.ino !== statAfter.ino) {
      throw new Error('completion_artifact_changed_while_manifest_was_written');
    }
    artifacts.push({
      role,
      relativePath: relativePath.split(path.sep).join('/'),
      sizeBytes: statAfter.size,
      sha256,
    });
  }
  if (!artifacts.some((artifact) => artifact.role === 'report')) {
    throw new Error('completion_report_missing');
  }
  const sourceBefore = fs.statSync(filePath);
  const sourceSha256 = await sha256File(filePath);
  const source = fs.statSync(filePath);
  if (sourceBefore.size !== source.size || sourceBefore.mtimeMs !== source.mtimeMs
      || sourceSha256 !== compatibility.inputSha256) {
    throw new Error('completion_source_changed_since_remediation_started');
  }
  const manifest = {
    schema: COMPLETION_MANIFEST_SCHEMA,
    kind: COMPLETION_MANIFEST_KIND,
    source: { path: filePath, sizeBytes: source.size, sha256: sourceSha256 },
    compatibility: {
      optionsSha256: compatibility.optionsSha256,
      engineSha256: compatibility.engineSha256,
    },
    attempt: {
      jobId: job && job.jobId || null,
      attemptId: job && job.attemptId || null,
      attemptNumber: job && job.attemptNumber || 0,
    },
    completedAt: new Date().toISOString(),
    artifacts,
  };
  atomicWriteJson(summary.files.completionManifest, manifest);
  return manifest;
}

async function validateCompletionManifest(manifestPath, filePath, outDir, compatibility) {
  try {
    const manifestStat = fs.statSync(manifestPath);
    if (!manifestStat.isFile() || manifestStat.size <= 0 || manifestStat.size > 2 * 1024 * 1024) return null;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (
      !hasExactKeys(manifest, [
        'schema', 'kind', 'source', 'compatibility', 'attempt', 'completedAt', 'artifacts',
      ]) ||
      manifest.schema !== COMPLETION_MANIFEST_SCHEMA ||
      manifest.kind !== COMPLETION_MANIFEST_KIND ||
      !hasExactKeys(manifest.source, ['path', 'sizeBytes', 'sha256']) ||
      path.resolve(manifest.source.path) !== filePath ||
      manifest.source.sha256 !== compatibility.inputSha256 ||
      !Number.isSafeInteger(manifest.source.sizeBytes) || manifest.source.sizeBytes < 0 ||
      !hasExactKeys(manifest.compatibility, ['optionsSha256', 'engineSha256']) ||
      manifest.compatibility.optionsSha256 !== compatibility.optionsSha256 ||
      manifest.compatibility.engineSha256 !== compatibility.engineSha256 ||
      !hasExactKeys(manifest.attempt, ['jobId', 'attemptId', 'attemptNumber']) ||
      !Array.isArray(manifest.artifacts) || manifest.artifacts.length < 1 ||
      manifest.artifacts.length > 4
    ) return null;
    const sourceBefore = fs.statSync(filePath);
    if (sourceBefore.size !== manifest.source.sizeBytes) return null;
    const sourceSha256 = await sha256File(filePath);
    const sourceAfter = fs.statSync(filePath);
    if (sourceBefore.size !== sourceAfter.size || sourceBefore.mtimeMs !== sourceAfter.mtimeMs
      || sourceAfter.size !== manifest.source.sizeBytes
      || sourceSha256 !== manifest.source.sha256) return null;
    const artifacts = new Map();
    let verifiedReportBytes = null;
    for (const artifact of manifest.artifacts) {
      if (
        !hasExactKeys(artifact, ['role', 'relativePath', 'sizeBytes', 'sha256']) ||
        !['accessibleHtml', 'taggedPdf', 'report'].includes(artifact.role) ||
        artifacts.has(artifact.role) ||
        typeof artifact.relativePath !== 'string' || !artifact.relativePath ||
        artifact.relativePath.includes('\\') ||
        !Number.isSafeInteger(artifact.sizeBytes) || artifact.sizeBytes < 0 ||
        typeof artifact.sha256 !== 'string' || !SHA256_HEX_RE.test(artifact.sha256)
      ) return null;
      const resolved = path.resolve(outDir, ...artifact.relativePath.split('/'));
      const relative = path.relative(outDir, resolved);
      if (path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep)) return null;
      const stat = fs.statSync(resolved);
      if (!stat.isFile() || stat.size !== artifact.sizeBytes) return null;
      let digest;
      if (artifact.role === 'report') {
        if (stat.size > 8 * 1024 * 1024) return null;
        verifiedReportBytes = fs.readFileSync(resolved);
        if (verifiedReportBytes.length !== artifact.sizeBytes) return null;
        digest = sha256Bytes(verifiedReportBytes);
      } else {
        digest = await sha256File(resolved);
      }
      const statAfter = fs.statSync(resolved);
      if (stat.size !== statAfter.size || stat.mtimeMs !== statAfter.mtimeMs ||
        stat.ctimeMs !== statAfter.ctimeMs || stat.dev !== statAfter.dev || stat.ino !== statAfter.ino ||
        statAfter.size !== artifact.sizeBytes || digest !== artifact.sha256) return null;
      artifacts.set(artifact.role, resolved);
    }
    const reportPath = artifacts.get('report');
    if (!reportPath || !verifiedReportBytes) return null;
    const summary = JSON.parse(verifiedReportBytes.toString('utf8'));
    if (!isPlainObject(summary) || path.resolve(summary.input || '') !== filePath ||
      !isPlainObject(summary.files) ||
      path.resolve(summary.files.report || '') !== reportPath ||
      path.resolve(summary.files.completionManifest || '') !== path.resolve(manifestPath)) return null;
    for (const role of ['accessibleHtml', 'taggedPdf']) {
      const declared = summary.files[role];
      if (!!declared !== artifacts.has(role)) return null;
      if (declared && path.resolve(declared) !== artifacts.get(role)) return null;
    }
    return { manifest, manifestPath: path.resolve(manifestPath), summary };
  } catch (_) {
    return null;
  }
}

async function findValidCompletionManifest(filePath, outDir, compatibility) {
  let names;
  try { names = fs.readdirSync(outDir); } catch (_) { return null; }
  const candidates = names
    .filter((name) => /-remediation-completion(?:-\d+)?\.json$/i.test(name))
    .map((name) => path.join(outDir, name))
    .sort((a, b) => {
      try { return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs; } catch (_) { return 0; }
    });
  for (const candidate of candidates) {
    const valid = await validateCompletionManifest(candidate, filePath, outDir, compatibility);
    if (valid) return valid;
  }
  return null;
}

function compatibilityForFile(job, prepared, file) {
  const entry = prepared.byFile.get(file);
  if (!entry) throw unsafeResume('stored_file_digest_missing');
  return {
    inputSha256: entry.sha256,
    optionsSha256: job.optionsSha256,
    engineSha256: prepared.currentEngineSha256,
  };
}

function committedFileRow(job, kind, file, compatibility) {
  return (job.fileRows || []).find((row) => (
    row.kind === kind && row.file === file &&
    row.inputSha256 === compatibility.inputSha256 &&
    row.optionsSha256 === compatibility.optionsSha256 &&
    row.engineSha256 === compatibility.engineSha256 &&
    isPlainObject(row.result)
  )) || null;
}

function commitFileRow(job, kind, file, compatibility, result) {
  const row = {
    kind, file,
    inputSha256: compatibility.inputSha256,
    optionsSha256: compatibility.optionsSha256,
    engineSha256: compatibility.engineSha256,
    committedAt: new Date().toISOString(),
    result,
  };
  job.fileRows = (job.fileRows || []).filter((prior) => !(prior.kind === kind && prior.file === file));
  job.fileRows.push(row);
  job.currentFile = null;
  job.runStage = 'file-committed';
  return row;
}

// The remediate-every-file loop, shared by the folder batch and the scoreboard selection so the
// two cannot drift on resumability, per-file failure handling, cancellation, or progress.
async function runRemediateBatch(j, { files, dir, outDir, opts, skipExisting, prepared }) {
  const perFile = [];
  for (let i = 0; i < files.length; i++) {
    if (j.cancelRequested) { jobLog(j, 'batch cancelled at file ' + (i + 1) + '/' + files.length); break; }
    const f = files[i];
    const compatibility = compatibilityForFile(j, prepared, f);
    const committed = committedFileRow(j, 'remediation', f, compatibility);
    if (committed) {
      perFile.push(committed.result);
      noteBatchProgress(j, { done: i + 1, total: files.length });
      jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(f)
        + ' SKIPPED (digest-bound journal row)');
      continue;
    }
    const proofCompatibility = prepared.engineCompatible
      ? compatibility : Object.assign({}, compatibility, { engineSha256: j.engineSha256 });
    const proof = (skipExisting || j.restoredFromStatus === 'running')
      ? await findValidCompletionManifest(f, outDir, proofCompatibility) : null;
    if (proof) {
      const summary = proof.summary;
      const result = {
        file: f, ok: true, skipped: 'completion-manifest-verified',
        verdict: summary.verdict, afterScore: summary.afterScore,
        aiVerificationIncomplete: summary.aiVerificationIncomplete, files: summary.files,
      };
      commitFileRow(j, 'remediation', f, proofCompatibility, result);
      perFile.push(result);
      noteBatchProgress(j, { done: i + 1, total: files.length });
      jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(f)
        + ' SKIPPED (artifact hashes verified)');
      continue;
    }
    if (!prepared.engineCompatible && j.restoredFromStatus === 'running') {
      throw unsafeResume('checkpoint_engine_changed_since_job_started');
    }
    if (j.restoredFromStatus === 'running' && j.currentFile && j.currentFile.file === f
      && !loadLocalCheckpoint(j, compatibility, false)) {
      throw unsafeResume('running_file_has_no_valid_checkpoint_or_completion_manifest');
    }
    jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(f));
    const startedAt = Date.now();
    try {
      // Per-file validation (size/header) at run time — one bad file must not sink the batch.
      requireDocPath({ file_path: f });
      requireGeminiKey();
      const summary = await remediateOneFile(f, outDir, opts, (line) => jobLog(j, line),
        { job: j, compatibility });
      const result = {
        file: f, ok: true, verdict: summary.verdict, afterScore: summary.afterScore,
        aiVerificationIncomplete: summary.aiVerificationIncomplete, files: summary.files,
      };
      perFile.push(result);
      commitFileRow(j, 'remediation', f, compatibility, result);
    } catch (e) {
      const message = (e && e.message) || String(e);
      if (e && e.interrupted || /^(?:checkpoint_|job_state_persistence_failed)/.test(message)) throw e;
      clearLocalCheckpoint(j, false);
      const result = { file: f, ok: false, error: message };
      perFile.push(result);
      commitFileRow(j, 'remediation', f, compatibility, result);
      jobLog(j, 'FAILED (continuing): ' + ((e && e.message) || e));
    }
    noteBatchProgress(j, { done: i + 1, total: files.length, processedMs: Date.now() - startedAt });
  }
  return {
    dir, outputDir: outDir,
    requested: files.length, attempted: perFile.length,
    succeeded: perFile.filter((r) => r.ok).length,
    failed: perFile.filter((r) => !r.ok).length,
    cancelled: j.cancelRequested || undefined,
    perFile,
  };
}

// Output path for the HTML-in/HTML-out tools. An explicit output_path wins; otherwise a suffixed
// sibling. Collision-safe either way, so these tools can never destroy the file handed to them.
function _htmlOutputPath(args, inputPath, suffix) {
  if (args.output_path !== undefined) {
    if (typeof args.output_path !== 'string' || !args.output_path.trim()) throw invalidParams('arguments.output_path must be a non-empty string');
    const p = enforceAllowedRoot(path.resolve(args.output_path), 'arguments.output_path');
    fs.mkdirSync(path.dirname(p), { recursive: true });
    return p;
  }
  const stem = path.basename(inputPath).replace(/\.html?$/i, '');
  return claimOutputPath(path.dirname(inputPath), stem + suffix);
}

// One audited file, reduced to a scoreboard row. The full issue list and _fullAudit are dropped
// on purpose: 200 of them would blow the MCP payload, and per-file detail is one pdf_audit away.
function auditRow(filePath, out, compatibility) {
  return {
    file: filePath, ok: true,
    inputSha256: compatibility.inputSha256,
    optionsSha256: compatibility.optionsSha256,
    engineSha256: compatibility.engineSha256,
    score: out && out.score,
    issueCounts: (out && out.issueCounts) || {},
    pageCount: (out && out.pageCount) != null ? out.pageCount : null,
    isScanned: !!(out && out.isScanned),
    hasSearchableText: !!(out && out.hasSearchableText),
    documentLanguage: (out && out.documentLanguage) || null,
    summary: String((out && out.summary) || '').slice(0, 300),
  };
}

async function runAuditBatch(j, { files, dir, outDir, options, skipExisting, prepared }) {
  const prior = skipExisting ? readPriorScoreboards(outDir) : new Map();
  const rows = [];
  let audited = 0;
  let skipped = 0;
  for (let i = 0; i < files.length; i++) {
    if (j.cancelRequested) { jobLog(j, 'triage cancelled at file ' + (i + 1) + '/' + files.length); break; }
    const file = files[i];
    const currentCompatibility = compatibilityForFile(j, prepared, file);
    const rowCompatibility = prepared.engineCompatible ? currentCompatibility
      : Object.assign({}, currentCompatibility, { engineSha256: j.engineSha256 });
    const committed = committedFileRow(j, 'audit', file, rowCompatibility);
    if (committed) {
      rows.push(committed.result);
      skipped++;
      noteBatchProgress(j, { done: i + 1, total: files.length });
      jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(file)
        + ' SKIPPED (digest-bound audit row)');
      continue;
    }
    const priorRow = prior.get(file);
    if (priorRow && priorRow.inputSha256 === currentCompatibility.inputSha256
      && priorRow.optionsSha256 === currentCompatibility.optionsSha256
      && priorRow.engineSha256 === currentCompatibility.engineSha256) {
      const row = Object.assign({}, priorRow, { resumedFromPriorRun: true });
      rows.push(row);
      commitFileRow(j, 'audit', file, currentCompatibility, row);
      skipped++;
      noteBatchProgress(j, { done: i + 1, total: files.length });
      continue;
    }
    if (!prepared.engineCompatible && j.restoredFromStatus === 'running') {
      throw unsafeResume('audit_engine_changed_since_job_started');
    }
    j.currentFile = Object.assign({ file }, currentCompatibility);
    j.runStage = 'auditing';
    persistJob(j, { required: true });
    jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(file));
    const startedAt = Date.now();
    let row;
    try {
      requireDocPath({ file_path: file });
      requireGeminiKey();
      const out = await getDriver().audit({
        filePath: file, ocrLanguage: options.ocrLanguage,
        onLog: (line) => jobLog(j, line),
      });
      row = auditRow(file, out, currentCompatibility);
      audited++;
      jobLog(j, '  → ' + triageBand(row) + ' (score ' + row.score + ')');
    } catch (error) {
      const message = (error && error.message) || String(error);
      if (error && error.interrupted || message === 'job_state_persistence_failed') throw error;
      row = {
        file, ok: false, error: message.slice(0, 300),
        inputSha256: currentCompatibility.inputSha256,
        optionsSha256: currentCompatibility.optionsSha256,
        engineSha256: currentCompatibility.engineSha256,
      };
      jobLog(j, '  → FAILED (continuing): ' + message);
    }
    rows.push(row);
    commitFileRow(j, 'audit', file, currentCompatibility, row);
    noteBatchProgress(j, {
      done: i + 1, total: files.length, processedMs: Date.now() - startedAt,
    });
  }
  const written = writeScoreboard(outDir, dir, rows);
  jobLog(j, 'scoreboard: ' + written.scoreboardJson);
  return {
    dir, outputDir: outDir, requested: files.length, audited, skipped,
    failed: rows.filter((row) => !row.ok).length,
    cancelled: j.cancelRequested || undefined,
    bands: written.bands, medianScore: written.medianScore,
    scoreboardJson: written.scoreboardJson, scoreboardCsv: written.scoreboardCsv,
    files: rows,
    note: 'Bands name the next action, not a grade. Scores judge the SOURCE documents; remediate the needs-work band first, and OCR anything in scanned before trusting its score.',
  };
}

const DISTRIBUTION_LEVELS = new Set(['ready', 'caution', 'review']);
const VERIFICATION_STATES = new Set(['complete', 'complete-for-tested-scope', 'partial', 'review-required', 'unavailable']);
const TAGGED_PDF_DELIVERY_CODES = new Set([
  'verified',
  'typeset-content-dropped',
  'roundtrip-unavailable',
  'roundtrip-failed',
  'validator-unavailable',
  'validator-error',
  'validator-failed',
  'ocr-text-layer-incomplete',
  'delivery-verdict-unavailable',
]);
const TAGGED_PDF_EXPORT_MODES = new Set(['original_layout', 'clean_rebuild']);

function boundedEvidenceCount(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= 1000000 ? value : null;
}

function safeEvidenceBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function safeDistributionVerdict(value) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || !DISTRIBUTION_LEVELS.has(value.level)
    || !Array.isArray(value.review)
    || !Array.isArray(value.cautions)
    || value.review.length > 1000000
    || value.cautions.length > 1000000
  ) return null;
  return {
    level: value.level,
    reviewCount: value.review.length,
    cautionCount: value.cautions.length,
  };
}

function safeVerificationState(value) {
  return VERIFICATION_STATES.has(value) ? value : null;
}

function safeTaggedPdfDelivery(value) {
  if (
    !value
    || typeof value !== 'object'
    || Array.isArray(value)
    || typeof value.ok !== 'boolean'
    || !TAGGED_PDF_DELIVERY_CODES.has(value.code)
  ) return null;
  return { ok: value.ok, code: value.code };
}

function safeTaggedPdfExportMode(value) {
  return TAGGED_PDF_EXPORT_MODES.has(value) ? value : null;
}

function safeAuditCoverage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    configuredAuditorCap: boundedEvidenceCount(value.configuredAuditorCap),
    requestedAuditors: boundedEvidenceCount(value.requestedAuditors),
    completedAuditors: boundedEvidenceCount(value.completedAuditors),
    sliced: safeEvidenceBoolean(value.sliced),
  };
}

async function remediateOneFile(filePath, outDir, opts, onLog, durability = null) {
  const signal = durability && (durability.signal
    || (durability.job && durability.job.abortController
      && durability.job.abortController.signal));
  const compatibility = durability && durability.compatibility
    ? durability.compatibility
    : {
      inputSha256: await sha256File(filePath),
      optionsSha256: checkpointOptionsDigest(opts),
      engineSha256: checkpointEngineDigest(),
    };
  const job = durability && durability.job;
  const driverOptions = Object.assign({ filePath, onLog, signal }, opts);
  if (job) {
    job.currentFile = {
      file: filePath,
      inputSha256: compatibility.inputSha256,
      optionsSha256: compatibility.optionsSha256,
      engineSha256: compatibility.engineSha256,
    };
    job.runStage = 'remediating';
    persistJob(job, { required: true });
    const envelope = loadLocalCheckpoint(job, compatibility);
    if (envelope) {
      driverOptions.resumeCheckpoint = envelope.snapshot;
      if (onLog) onLog('checkpoint: resuming ' + envelope.stage + ' sequence ' + envelope.sequence);
    }
    driverOptions.onCheckpoint = (snapshot) => saveLocalCheckpoint(job, snapshot, compatibility);
  }
  const out = await getDriver().remediate(driverOptions);
  if (job) {
    job.runStage = 'writing-artifacts';
    persistJob(job, { required: true });
  }
  const stem = path.basename(filePath).replace(/\.(pdf|docx|pptx)$/i, '');
  const files = {};
  if (out.accessibleHtml) {
    files.accessibleHtml = claimOutputPath(outDir, stem + '-accessible.html');
    atomicWriteBytes(files.accessibleHtml, Buffer.from(out.accessibleHtml, 'utf8'));
  }
  if (out.taggedPdfB64) {
    files.taggedPdf = claimOutputPath(outDir, stem + '-tagged.pdf');
    atomicWriteBytes(files.taggedPdf, Buffer.from(out.taggedPdfB64, 'base64'));
  }
  // validate_ua: independent ISO 14289-1 check of the just-written tagged bytes (keyless,
  // ~1 min incl. JVM boot). Parity with the app's auto-veraPDF; verdict rides the report.
  let pdfUa;
  if (opts.validateUa && files.taggedPdf) {
    try {
      const v = await withPdfUaSlot(
        signal,
        onLog,
        () => validatePdfUaLocally(files.taggedPdf, onLog, signal),
      );
      pdfUa = { standard: 'PDF/UA-1 (ISO 14289-1)', compliant: !!(v && v.compliant), validator: v && v.validator, validatorVersion: v && v.validatorVersion, failedChecks: (v && v.failedChecks) || 0, failedRuleCount: (v && v.failedRuleCount) || 0, failedRules: ((v && v.failedRules) || []).slice(0, 100) };
    } catch (e) {
      // Cancellation is control flow, not a validation verdict. Let the owner
      // mark the request/job cancelled instead of publishing a completed report
      // whose verifier merely says it errored.
      if (signal && signal.aborted) throw e;
      pdfUa = { error: (e && e.message) || String(e) };
    }
  } else if (opts.validateUa) {
    pdfUa = { skipped: out.taggedPdfB64 ? 'tagged PDF not written' : 'no tagged PDF (office input or tagged_pdf: false)' };
  }
  const summary = {
    input: filePath,
    files,
    pdfUa,
    verdict: safeDistributionVerdict(out.verdict),
    beforeScore: out.beforeScore,
    afterScore: out.afterScore,
    aiVerificationIncomplete: out.aiVerificationIncomplete,
    scoreSource: out.scoreSource,
    estimatedMinimumScore: out.estimatedMinimumScore,
    integrityCoverage: out.integrityCoverage,
    integrityWarning: out.integrityWarning,
    fidelityNotes: out.fidelityNotes,
    verificationState: safeVerificationState(out.verificationState),
    verificationHtmlBound: safeEvidenceBoolean(out.verificationHtmlBound),
    remainingAxeViolations: boundedEvidenceCount(out.remainingAxeViolations),
    remainingEqualAccessFailures: boundedEvidenceCount(out.remainingEqualAccessFailures),
    taggedPdfDelivery: safeTaggedPdfDelivery(out.taggedPdfDelivery),
    taggedPdfExportMode: safeTaggedPdfExportMode(out.taggedPdfExportMode),
    activeContentScanVerified: safeEvidenceBoolean(out.activeContentScanVerified),
    activeContentDetected: safeEvidenceBoolean(out.activeContentDetected),
    auditCoverage: safeAuditCoverage(out.auditCoverage),
    autoContinue: out.autoContinue,
    taggedPdfError: out.taggedPdfError || undefined,
    runId: out.runId,
    stats: out.stats,
    note: 'Scores and the verdict come from AlloFlow\'s honesty-gated verification. Review the fidelity notes and spot-check the output before distributing; the tagged PDF only carries a PDF/UA declaration when it earned one.',
  };
  files.report = claimOutputPath(outDir, stem + '-remediation-report.json');
  files.completionManifest = completionManifestPath(outDir, files.report);
  atomicWriteJson(files.report, summary);
  await writeCompletionManifest(filePath, outDir, summary, compatibility, job);
  if (job) clearLocalCheckpoint(job, true);
  return summary;
}

async function runnerForStoredJob(job) {
  const execution = job.execution;
  const prepared = await prepareStoredExecution(job);
  enforceAllowedRoot(execution.outDir, 'stored output directory');
  fs.mkdirSync(execution.outDir, { recursive: true });
  if (job.kind === 'pdf_remediate') {
    const file = execution.files[0];
    const compatibility = compatibilityForFile(job, prepared, file);
    const proofCompatibility = prepared.engineCompatible ? compatibility
      : Object.assign({}, compatibility, { engineSha256: job.engineSha256 });
    const proof = job.restoredFromStatus === 'running'
      ? await findValidCompletionManifest(file, execution.outDir, proofCompatibility) : null;
    if (proof) return proof.summary;
    if (!prepared.engineCompatible && job.restoredFromStatus === 'running') {
      throw unsafeResume('checkpoint_engine_changed_since_job_started');
    }
    if (job.restoredFromStatus === 'running' && job.currentFile
      && !loadLocalCheckpoint(job, compatibility, false)) {
      throw unsafeResume('running_file_has_no_valid_checkpoint_or_completion_manifest');
    }
    requireGeminiKey();
    return remediateOneFile(file, execution.outDir, execution.options,
      (line) => jobLog(job, line), { job, compatibility });
  }
  if (job.kind === 'pdf_batch_audit') {
    return runAuditBatch(job, {
      files: execution.files,
      dir: execution.meta.dir,
      outDir: execution.outDir,
      options: execution.options,
      skipExisting: execution.skipExisting,
      prepared,
    });
  }
  if (job.kind === 'pdf_batch_remediate') {
    return runRemediateBatch(job, {
      files: execution.files,
      dir: execution.meta.dir,
      outDir: execution.outDir,
      opts: execution.options,
      skipExisting: execution.skipExisting,
      prepared,
    });
  }
  if (job.kind === 'pdf_remediate_from_scoreboard') {
    const meta = execution.meta;
    jobLog(job, 'remediating ' + execution.files.length + ' of '
      + meta.scoredDocuments + ' scored document(s) in band(s): ' + meta.bands.join(', '));
    if (meta.missingFromDisk.length) {
      jobLog(job, meta.missingFromDisk.length + ' scored file(s) no longer exist and were left out');
    }
    const out = await runRemediateBatch(job, {
      files: execution.files,
      dir: meta.dir,
      outDir: execution.outDir,
      opts: execution.options,
      skipExisting: execution.skipExisting,
      prepared,
    });
    return Object.assign(out, {
      scoreboard: meta.scoreboard,
      bands: meta.bands,
      scoredDocuments: meta.scoredDocuments,
      selected: execution.files.length,
      missingFromDisk: meta.missingFromDisk.length ? meta.missingFromDisk : undefined,
    });
  }
  throw unsafeResume('stored_job_kind_unsupported');
}

// ── Tools ───────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'remediation_capabilities',
    title: 'Check remediation environment',
    description: 'Report both operating modes: the tools available without a Gemini key/account/Worker and whether the optional full AI pipeline has its key, Playwright/Chromium, and modules. Call this first. Read-only; launches nothing, spends nothing.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'Check remediation environment', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'remediation_verify_key',
    title: 'Test whether the Gemini key actually works',
    description: "Prove the configured Gemini key WORKS rather than merely existing, by listing models — the cheapest authenticated call. Sends NO document content and spends no generation quota. Call this whenever remediation_capabilities reports a key but Gemini-powered tools fail, and after setting up a key for the first time. Distinguishes: no key configured, valid, valid-but-quota-exhausted, invalid (revoked/mistyped/wrong API), and unreachable (offline — key untested, not proven bad). When no key or an invalid key is found it returns exact setup instructions. Never returns or logs the key value.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'Test whether the Gemini key actually works', readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'remediation_selftest',
    title: 'Prove this install can actually remediate',
    description: 'Run the REAL remediation pipeline end-to-end in headless Chromium against a scripted local model and a generated one-page PDF, then report which stage worked. Needs NO Gemini key and spends NO quota (nothing leaves the machine; the scripted model is a loopback server), writes no files you keep. Takes roughly 20-60s. Use this when remediation_capabilities says ready but real runs fail, after installing or updating the connector, or to tell a broken install apart from an API-key/quota problem: a failure here names the stage (assets / browser / module-boot / ownership-gate / audit-contract) and is never about your key.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'Prove this install can actually remediate', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'generate_resource_pack',
    title: 'Generate an AlloFlow resource pack (no API key)',
    description: "Generate the same student/teacher resource-pack HTML as the normal AlloFlow app by calling its existing generateFullPackHTML pipeline export unchanged. The input JSON uses the app's native resource shape, so this is a thin adapter rather than a second renderer. Deterministic: needs NO Gemini key, account, or Worker. The JSON must contain `items` and may include `topic`, `isWorksheet`, `responses`, and `config`.",
    inputSchema: {
      type: 'object', required: ['resource_pack_json', 'output_path'],
      properties: {
        resource_pack_json: { type: 'string', description: 'Absolute path to a local .json file containing {items, topic?, isWorksheet?, responses?, config?}' },
        output_path: { type: 'string', description: 'Where to write the generated .html file (collision-safe; existing files are not overwritten)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Generate an AlloFlow resource pack', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'export_accessible_office',
    title: 'Export accessible HTML to Word or ODT',
    description: 'Convert an accessible HTML file (the -accessible.html a remediation produced) into an accessible Word (.docx) or OpenDocument (.odt) file, preserving heading structure, lists, and tables. Deterministic packaging: needs NO Gemini key and spends no quota, though it does fetch React and JSZip from public CDNs. Use when someone needs the remediated document in an editable Office format rather than a PDF. For ePub 3, DAISY 3 or Braille, use export_alt_format instead.',
    inputSchema: {
      type: 'object', required: ['file_path', 'format'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local accessible .html file' },
        format: { type: 'string', enum: ['docx', 'odt'], description: 'Output format' },
        output_dir: { type: 'string', description: 'Directory for the output file (default: alongside the input)' },
        title: { type: 'string', description: 'Document title embedded in the export (default: the input file name)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Export accessible HTML to Word or ODT', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'export_alt_format',
    title: 'Export to ePub 3, DAISY 3, or Braille (no API key)',
    description: "Convert an accessible HTML file into an ePub 3 ebook, a DAISY 3 full-text talking-book package, or an uncontracted (Grade 1) Braille BRF file for embossers and refreshable displays. Deterministic restructuring: needs NO Gemini key, spends no quota, and packages entirely offline (unlike export_accessible_office it does not need JSZip from a CDN, though React is still fetched). Use when a student needs an ebook, a DAISY reader, or hard-copy braille rather than a PDF. ePub output is checked by a built-in structural self-check whose findings are returned as `structuralErrors` — that is NOT epubcheck, so a book reported valid here can still be worth running through epubcheck. Braille is Grade 1 only (contracted UEB needs the liblouis plugin, which is in the app, not here) and reports how many characters had no braille equivalent and were dropped.",
    inputSchema: {
      type: 'object', required: ['file_path', 'format'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local accessible .html file' },
        format: { type: 'string', enum: ['epub', 'daisy', 'brf'], description: "'epub' = ePub 3 ebook; 'daisy' = DAISY 3 talking-book zip (text only, the reader supplies speech/braille/large print); 'brf' = ASCII Braille ready to emboss" },
        output_dir: { type: 'string', description: 'Directory for the output file (default: alongside the input)' },
        title: { type: 'string', description: 'Document title embedded in the package metadata (default: the input file name)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Export to ePub 3, DAISY 3, or Braille', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'fix_contrast',
    title: 'Repair colour contrast (no API key)',
    description: "Apply AlloFlow's deterministic contrast repair to an accessible HTML file: darkens or lightens foreground colours that fail WCAG AA against their detected background, then sanitises remaining style for WCAG. Pure colour math — needs NO Gemini key and spends no quota. IMPORTANT: the returned axe numbers do NOT verify contrast. axe-core does not reliably detect contrast in this harness (measured: zero findings on text at ~1.6:1), so `styleFixes` (the count of corrections actually applied) is the evidence, and a human or a contrast checker should confirm.",
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .html file' },
        output_path: { type: 'string', description: 'Where to write the corrected HTML (default: <name>-contrast.html beside the input, never overwriting)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Repair colour contrast', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'generate_conformance_report',
    title: 'Generate the AlloFlow conformance report',
    description: "Produce AlloFlow's own Accessibility Conformance Report as HTML, the same report the app generates, from artifacts you already have: an axe audit and (optionally) a veraPDF verdict. Deterministic templating — needs NO Gemini key. Use this instead of hand-writing a report, so what an agent hands a user matches what the application produces and cannot drift from it.",
    inputSchema: {
      type: 'object', required: ['audit_json', 'output_path'],
      properties: {
        audit_json: { type: 'string', description: 'Path to a JSON file holding an axe audit (as pdf_audit or the agent harness emits)' },
        verapdf_json: { type: 'string', description: 'Optional path to a JSON file holding a pdf_validate_ua result; its failed rules are folded in' },
        accessible_html: { type: 'string', description: 'Optional path to the remediated HTML, so the report can reference the content it describes' },
        output_path: { type: 'string', description: 'Where to write the report HTML' },
        document_name: { type: 'string', description: 'Document name shown in the report heading' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Generate the AlloFlow conformance report', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'describe_images',
    title: 'Generate alt text for images in accessible HTML',
    description: "Run AlloFlow's vision pass over the data-URI images embedded in an accessible HTML file: describes each one, classifies equations and charts, marks recurring chrome (logos, letterheads) decorative, and groups near-identical images so a repeated logo costs one vision call rather than one per page. Writes alt text into the HTML. REQUIRES a Gemini key and sends image content to the API — this is the one HTML operation here that genuinely needs a model.",
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .html file containing data-URI images' },
        output_path: { type: 'string', description: 'Where to write the annotated HTML (default: <name>-alt.html beside the input)' },
        cap: { type: 'number', minimum: 1, maximum: 40, description: 'Maximum image groups to describe (default 10)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Generate alt text for images', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'transcribe_media',
    title: 'Transcribe audio or video to an accessible transcript',
    description: "Transcribe a local audio or video file into an accessible transcript payload. Modes: 'speech' (spoken words), 'visual' (what is shown on screen), 'dual' (both, separately), 'synthesis' (a combined narrative). Long recordings are segmented automatically by the pipeline's large-file machinery. Supports .mp3 .m4a .wav .aac .ogg .flac .mp4 .mov .webm .mpeg. REQUIRES a Gemini key and sends the media to the API. This is how a recorded lesson becomes a document the rest of these tools can make accessible.",
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local audio or video file' },
        mode: { type: 'string', enum: ['speech', 'visual', 'dual', 'synthesis'], description: "Default 'speech'. Use 'dual' or 'synthesis' for video where on-screen content matters." },
        output_path: { type: 'string', description: 'Where to write the transcript (default: <name>-transcript.txt beside the input)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Transcribe audio or video', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'translate_accessible_html',
    title: 'Translate accessible HTML into another language',
    description: 'Translate an accessible HTML document into a target language while preserving its structure: headings, lists, tables, and reading order survive, and embedded data-URI images are swapped for placeholders during translation so they are never sent to the model and come back intact. Long documents are chunked on tag boundaries. REQUIRES a Gemini key. Use to produce the same accessible document for multilingual families or students.',
    inputSchema: {
      type: 'object', required: ['file_path', 'target_language'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local accessible .html file' },
        target_language: { type: 'string', maxLength: 120, description: 'Target language, e.g. "Spanish", "Vietnamese", "Somali"' },
        output_path: { type: 'string', description: 'Where to write the translated HTML (default: <name>-<lang>.html beside the input)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Translate accessible HTML', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'redact_document',
    title: 'Redact PII from accessible HTML (no API key)',
    description: "Remove named strings (student names, emails, phone numbers, IDs) from an accessible HTML document, then VERIFY the removal: the pipeline re-scans its own output and reports `clean` plus any `leaks` that survived. Deterministic — needs NO Gemini key and nothing leaves the machine. Use before sharing a document that contains student data. A redaction that silently missed something is worse than none, which is why the verification pass is part of the result rather than an optional extra.",
    inputSchema: {
      type: 'object', required: ['file_path', 'targets'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .html file' },
        targets: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 1, description: 'Exact strings to remove, e.g. ["Shawn Carter", "shawn@example.org"]' },
        output_path: { type: 'string', description: 'Where to write the redacted HTML (default: <name>-redacted.html beside the input)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Redact PII from accessible HTML', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'extract_document_text',
    title: 'Extract text from DOCX, PPTX, XLSX or PDF (no API key)',
    description: "Pull the text out of a .docx, .pptx, .xlsx or .pdf deterministically — mammoth for Word (preserving heading styles and list structure as markdown), the spreadsheet converter producing markdown tables, pdf.js for PDF text layers. Needs NO Gemini key and sends nothing anywhere. Reports the extraction `method` and any `error`, so an empty result is distinguishable from a failed one. Use to inspect a document before deciding how to remediate it, or to check whether a PDF has a usable text layer at all.",
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .docx, .pptx, .xlsx or .pdf file' },
        output_path: { type: 'string', description: 'Optional path to write the extracted text' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Extract document text', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'detect_form_fields',
    title: 'Find fillable blanks in accessible HTML (no API key)',
    description: 'Scan an accessible HTML document for places that should become fillable form fields (blank lines, underscored runs, answer boxes) and report each with its label, kind, width and surrounding context, flagging any that have no label. Deterministic, no API key. Pair with apply_form_fields to turn the accepted ones into real labelled inputs. Unlabelled fields are a WCAG 4.1.2 failure, so `labelMissing` is the field to act on.',
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: { file_path: { type: 'string', description: 'Absolute path to a local .html file' } },
      additionalProperties: false,
    },
    annotations: { title: 'Find fillable blanks', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'apply_form_fields',
    title: 'Turn accepted blanks into labelled form fields (no API key)',
    description: 'Convert the blanks you accepted from detect_form_fields into real, labelled form inputs in the HTML. Deterministic, no API key. Pass the production pipeline\'s native object map keyed by candidate id, for example `{ "f0": { "label": "Student name" } }`; anything omitted is left as-is.',
    inputSchema: {
      type: 'object', required: ['file_path', 'accepted'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .html file' },
        accepted: {
          type: 'object', minProperties: 1, maxProperties: 500,
          additionalProperties: {
            type: 'object', properties: { label: { type: 'string', maxLength: 200 } }, additionalProperties: false,
          },
          description: 'Object map keyed by ids from detect_form_fields; each value may override the label',
        },
        output_path: { type: 'string', description: 'Where to write the result (default: <name>-fillable.html beside the input)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Apply form fields', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'simplify_accessible_html',
    title: 'Rewrite accessible HTML in plain language',
    description: 'Produce a plain-language version of an accessible HTML document, preserving its structure and reading order. This is the UDL move that most changes who can use a document: an accessible PDF that is written at a graduate reading level is still inaccessible to many readers. REQUIRES a Gemini key. The simplified text is model-generated and should be reviewed by someone who knows the subject before it replaces the original.',
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local accessible .html file' },
        output_path: { type: 'string', description: 'Where to write the simplified HTML (default: <name>-plain.html beside the input)' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Rewrite in plain language', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'audit_two_engines',
    title: 'Audit HTML with TWO independent engines (no API key)',
    description: "Audit an accessible HTML file with axe-core AND IBM Equal Access, then report where they DISAGREE. Both run locally in the browser with no model and no API key. This matters because a single engine is a single opinion: on this project axe reported 100/0 on a document veraPDF then failed, and reported no contrast findings on text at roughly 1.6:1. Two engines that disagree give a short, concrete list a human can check. Use it before telling anyone a document is clean.",
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: { file_path: { type: 'string', description: 'Absolute path to a local .html file' } },
      additionalProperties: false,
    },
    annotations: { title: 'Audit with two engines', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'check_document_structure',
    title: 'Check heading structure and extract plain text (no API key)',
    description: 'Report the heading hierarchy of an accessible HTML document (counts per level and any SKIPPED levels, e.g. h2 followed by h4, which is a WCAG 1.3.1 failure) and produce a plain-text rendering. Deterministic, no API key. Plain text is itself a legitimate accessible format for readers who want no markup at all, and the heading check is the cheapest way to catch a structural mistake before tagging a PDF.',
    inputSchema: {
      type: 'object', required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .html file' },
        output_path: { type: 'string', description: 'Optional path to write the plain-text rendering' },
      },
      additionalProperties: false,
    },
    annotations: { title: 'Check structure and extract plain text', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'remediation_setup',
    title: 'One-time environment setup',
    description: 'Download the Chromium browser binary the pipeline runs in (a one-time ~200MB download via Playwright, 1-5 minutes). Call this when remediation_capabilities reports chromiumInstalled: false — typically right after installing the packaged connector. Idempotent: returns immediately if Chromium is already installed. Writes only to the Playwright browser cache; needs no Gemini key.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'One-time environment setup', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'pdf_audit',
    title: 'Audit a PDF for accessibility',
    description: 'Run the AlloFlow accessibility audit on a local PDF, DOCX, or PPTX: overall score, per-severity issue list, scanned/searchable detection, page count, detected language. Sends document content to the Gemini API; core browser libraries are bundled locally. Writes no files. Office files are audited deterministically from extracted text (no Vision pass). Typically 1-3 minutes.',
    inputSchema: {
      type: 'object',
      required: ['file_path'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .pdf, .docx, or .pptx file (max 200MB)' },
        ocr_language: OCR_LANGUAGE_INPUT_SCHEMA,
      },
      additionalProperties: false,
    },
    annotations: { title: 'Audit a PDF for accessibility', readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  {
    name: 'pdf_validate_ua',
    title: 'Validate PDF/UA-1 conformance',
    description: 'Independent ISO 14289-1 (PDF/UA-1) validation of a local PDF using the packaged veraPDF CLI and local Java. It fails closed if that offline validator is unavailable; it never silently uses the CDN-backed browser validator. Run it on a -tagged.pdf produced by remediation or on any PDF. Needs NO Gemini key, paid Worker, institution account, AlloFlow service, or document upload; writes nothing. Typically 30-120s including JVM startup. This is a DIFFERENT artifact from the remediation score: the score judges the accessible-HTML content; this judges the exported PDF bytes.',
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
      auto_continue: { type: 'boolean', description: "Run the app's auto-continue improvement loop after the primary pass: extra fix rounds merged through the same canonical reducer the app uses, until the target score + complete verification or the rounds are spent (default false; adds time and Gemini quota)" },
      auto_continue_rounds: { type: 'number', minimum: 1, maximum: 5, description: 'Max auto-continue rounds (default 3)' },
      validate_ua: { type: 'boolean', description: 'Also run the independent keyless PDF/UA-1 (ISO 14289-1) veraPDF check on the tagged output and include its verdict in the report (default false; ~1 min extra)' },
      ocr_language: OCR_LANGUAGE_INPUT_SCHEMA,
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
          properties: Object.assign({
            dir_path: { type: 'string', description: 'Folder containing .pdf/.docx/.pptx files (searched non-recursively)' },
            skip_existing: { type: 'boolean', description: 'Skip only files with a digest-bound completion manifest whose input, options, engine, and artifact hashes all verify (default true)' },
          }, REMEDIATE_OPTION_PROPS),
          additionalProperties: false,
        },
        annotations: { title: 'Start a folder batch job', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      {
        name: 'pdf_batch_audit_start',
        title: 'Triage a folder (audit only)',
        description: 'Start a BACKGROUND JOB that AUDITS every .pdf/.docx/.pptx in a folder (non-recursive, up to ' + BATCH_LIMIT_AUDIT + ' files) and writes one triage scoreboard. This is the cheap first pass before remediation: an audit is 1-3 minutes and writes no document files, where a remediation is 5-30 minutes and spends far more quota, so run this to find out WHICH files are worth remediating instead of remediating a folder blind. Each document is sorted into a band that names the next action: scanned (image-only, needs OCR first), needs-work (<70), review (70-89), likely-ok (90+). Writes ' + SCOREBOARD_STEM + '.json and .csv (collision-safe, never overwrites); the CSV opens in Excel. Sends document content to the Gemini API. Poll remediation_job_status for per-file progress; remediation_job_result returns the scoreboard.',
        inputSchema: {
          type: 'object', required: ['dir_path'],
          properties: {
            dir_path: { type: 'string', description: 'Folder containing .pdf/.docx/.pptx files (searched non-recursively)' },
            output_dir: { type: 'string', description: 'Where to write the scoreboard (default: the audited folder)' },
            skip_existing: { type: 'boolean', description: 'Skip files already recorded as audited in a scoreboard in the output folder — makes an interrupted triage resumable without re-spending quota. Their prior rows are carried into the new scoreboard so it stays complete (default true)' },
            ocr_language: OCR_LANGUAGE_INPUT_SCHEMA,
          },
          additionalProperties: false,
        },
        annotations: { title: 'Triage a folder (audit only)', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      },
      {
        name: 'pdf_remediate_from_scoreboard_start',
        title: 'Remediate what the triage flagged',
        description: 'Start a BACKGROUND JOB that remediates only the documents a triage scoreboard put in the bands you name (default: needs-work). This closes the triage loop: pdf_batch_audit_start finds which documents need work, this fixes exactly those, so a folder that would be an overnight serial run becomes the handful that earned it. Point it at a scoreboard with scoreboard_path, or at a folder with dir_path to use that folder\'s newest scoreboard. Files listed in the scoreboard but no longer on disk are reported, not silently dropped. Same outputs, options, and resumability as pdf_batch_remediate_start.',
        inputSchema: {
          type: 'object',
          properties: Object.assign({
            scoreboard_path: { type: 'string', description: 'Path to an ' + SCOREBOARD_STEM + '*.json written by pdf_batch_audit_start (pass this OR dir_path)' },
            dir_path: { type: 'string', description: 'Folder whose NEWEST audit scoreboard should be used (pass this OR scoreboard_path)' },
            bands: {
              type: 'array', items: { type: 'string', enum: TRIAGE_BANDS },
              description: "Which triage bands to remediate (default ['needs-work']). 'scanned' documents are remediable but slower — they take the full OCR path.",
            },
            skip_existing: { type: 'boolean', description: 'Skip only documents with a digest-bound completion manifest whose input, options, engine, and artifact hashes all verify (default true)' },
          }, REMEDIATE_OPTION_PROPS),
          additionalProperties: false,
        },
        annotations: { title: 'Remediate what the triage flagged', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
        name: 'remediation_job_diagnostics',
        title: 'Fetch run diagnostics (numbers only)',
        description: 'The diagnostic snapshot for a run: the per-call ledger (outcomes, timings, byte counts, retries, models), throttle events, and the constants in force. Counts, timings, and enums only — never prompts, responses, or document text. Pass job_id for a background job; omit it for the most recent run in this server session. Use this to debug a slow, failing, or rate-limited run. Read-only.',
        inputSchema: { type: 'object', properties: { job_id: { type: 'string', minLength: 1, maxLength: 200 } }, additionalProperties: false },
        annotations: { title: 'Fetch run diagnostics (numbers only)', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

// This is the one classification source for capability reporting. It does not duplicate
// implementations: the names refer to the registry above, and keyless names are derived by
// subtraction so adding a tool cannot silently create a second hand-maintained list.
const GEMINI_REQUIRED_TOOL_NAMES = Object.freeze([
  'describe_images',
  'transcribe_media',
  'translate_accessible_html',
  'simplify_accessible_html',
  'pdf_audit',
  'pdf_remediate',
  'pdf_remediate_start',
  'pdf_batch_audit_start',
  'pdf_batch_remediate_start',
  'pdf_remediate_from_scoreboard_start',
]);
const GEMINI_REQUIRED_TOOL_SET = new Set(GEMINI_REQUIRED_TOOL_NAMES);
const KEYLESS_TOOL_NAMES = Object.freeze(
  TOOLS.map((tool) => tool.name).filter((name) => !GEMINI_REQUIRED_TOOL_SET.has(name))
);

// Keyless is an account/cost classification, not a privacy classification. Keep these
// dependency-download exceptions explicit so clients can distinguish "no document egress"
// from "no network request at all". The remaining keyless tools use only local files,
// bundled assets, local processes, and (for selftest) loopback HTTP.
const PUBLIC_DEPENDENCY_DOWNLOAD_TOOL_NAMES = Object.freeze([
  'remediation_setup',
  'export_accessible_office',
  'export_alt_format',
]);
const PUBLIC_DEPENDENCY_DOWNLOAD_TOOL_SET = new Set(PUBLIC_DEPENDENCY_DOWNLOAD_TOOL_NAMES);

// A third network shape, distinct from both: contacts the Gemini API using ONLY the
// configured key, to test whether that key works. No document content is sent, so
// listing it under geminiDocumentEgressToolNames would be a false privacy claim, and
// listing it as offline would be a false network claim.
// Self-serve setup, returned in tool output rather than left in a README the
// assistant relaying this may never have read. The ordering is deliberate: both
// recommended options keep the key OUT of any file an assistant routinely reads,
// which the `claude mcp add --env` / `claude_desktop_config.json` "env" route
// does not.
const KEY_SETUP_HINT = [
  'A Gemini key is OPTIONAL and only unlocks the AI tools. To add one:',
  '(1) get a free key at https://aistudio.google.com/app/apikey (no credit card, about two minutes);',
  '(2) supply it EITHER by setting the GEMINI_API_KEY environment variable in your OS/shell,',
  'OR by writing GEMINI_API_KEY=<value> into a file OUTSIDE this repository and setting',
  'ALLOFLOW_MCP_ENV_PATH to that file path;',
  '(3) call remediation_verify_key to confirm it works.',
  'Do NOT paste the key into this conversation, and avoid putting it in an MCP client config',
  '"env" block — both leave the secret in text an assistant can read.',
  'Free-tier prompts may be used by the provider to improve their products and have daily caps,',
  'so prefer the no-key tools for student-identifiable documents.',
].join(' ');

const CREDENTIAL_CHECK_TOOL_NAMES = Object.freeze(['remediation_verify_key']);
const CREDENTIAL_CHECK_TOOL_SET = new Set(CREDENTIAL_CHECK_TOOL_NAMES);
let geminiKeyVerification = null;
function geminiCredentialIdentity(info) {
  if (!info || !info.key) return null;
  return crypto.createHash('sha256').update('alloflow-mcp-key-identity\0' + String(info.source || '') + '\0' + info.key).digest('hex');
}
function currentGeminiKeyVerification(keyInfo) {
  const identity = geminiCredentialIdentity(keyInfo);
  if (!identity || !geminiKeyVerification || geminiKeyVerification.identity !== identity
      || geminiKeyVerification.source !== keyInfo.source) {
    geminiKeyVerification = null;
    return null;
  }
  return geminiKeyVerification;
}

const OFFLINE_TOOL_NAMES = Object.freeze(
  KEYLESS_TOOL_NAMES.filter(
    (name) => !PUBLIC_DEPENDENCY_DOWNLOAD_TOOL_SET.has(name) && !CREDENTIAL_CHECK_TOOL_SET.has(name)
  )
);

// Fail closed if a future tool is added without a data-handling classification. This remains
// metadata only: every operation still calls the normal app pipeline implementation.
const PRIVACY_CLASSIFIED_TOOL_NAMES = new Set([
  ...OFFLINE_TOOL_NAMES,
  ...PUBLIC_DEPENDENCY_DOWNLOAD_TOOL_NAMES,
  ...CREDENTIAL_CHECK_TOOL_NAMES,
  ...GEMINI_REQUIRED_TOOL_NAMES,
]);
if (PRIVACY_CLASSIFIED_TOOL_NAMES.size !== TOOLS.length || TOOLS.some((tool) => !PRIVACY_CLASSIFIED_TOOL_NAMES.has(tool.name))) {
  throw new Error('Every MCP tool must have exactly one data-handling classification.');
}

// ── Output schemas ──────────────────────────────────────────────────────────
// Every tool returns structuredContent, and until now none said what shape it had — so a caller
// had to guess that `verdict`, `aiVerificationIncomplete` and `integrityWarning` even exist.
// Publishing the shape is what makes the honesty surfaces consumable instead of decorative.
//
// Deliberately permissive: additionalProperties stays open (the pipeline's summary carries more
// than is worth pinning here) and `required` lists only fields present on EVERY branch. The job
// tools answer either a payload or an in-band {ok:false,error}, which share no field, so they
// declare properties and require nothing — a schema that lied about a branch would be worse than
// no schema at all.
const obj = (properties, required) => ({ type: 'object', properties, additionalProperties: true, ...(required && required.length ? { required } : {}) });
const strictObj = (properties, required, nullable) => ({
  type: nullable ? ['object', 'null'] : 'object',
  properties,
  additionalProperties: false,
  ...(required && required.length ? { required } : {}),
});
const S_NUM = { type: 'number' };
const S_STR = { type: 'string' };
const S_BOOL = { type: 'boolean' };
const S_NULLABLE_NUM = { type: ['number', 'null'], minimum: 0, maximum: 1000000 };
const S_NULLABLE_BOOL = { type: ['boolean', 'null'] };
const S_JOB_START = obj({
  jobId: { type: 'string', description: 'Pass to remediation_job_status / _result / _cancel' },
  status: S_STR, files: S_NUM, note: S_STR,
}, ['jobId', 'status']);
const S_AUDIT = obj({
  score: { type: 'number', description: 'Deduction-grounded accessibility score, 0-100. -1 means the audit produced no usable evidence.' },
  summary: S_STR, documentLanguage: { type: ['string', 'null'] },
  isScanned: S_BOOL, hasSearchableText: S_BOOL, pageCount: { type: ['number', 'null'] },
  issueCounts: obj({ critical: S_NUM, serious: S_NUM, moderate: S_NUM, minor: S_NUM }),
  issues: { type: 'array', items: obj({ issue: S_STR, wcag: S_STR, severity: S_STR }) },
});
const S_REMEDIATE = obj({
  input: S_STR,
  files: obj({ accessibleHtml: S_STR, taggedPdf: S_STR, report: S_STR }),
  verdict: strictObj({
    level: { type: 'string', enum: ['ready', 'caution', 'review'] },
    reviewCount: S_NUM,
    cautionCount: S_NUM,
  }, ['level', 'reviewCount', 'cautionCount'], true),
  beforeScore: { type: ['number', 'null'] }, afterScore: { type: ['number', 'null'] },
  aiVerificationIncomplete: { type: ['boolean', 'null'], description: 'True when the AI semantic audit degraded — the headline is then the deterministic score' },
  scoreSource: { type: ['string', 'null'] }, estimatedMinimumScore: { type: ['number', 'null'] },
  integrityCoverage: {}, integrityWarning: {}, fidelityNotes: {},
  verificationState: { type: ['string', 'null'], enum: ['complete', 'complete-for-tested-scope', 'partial', 'review-required', 'unavailable', null] },
  verificationHtmlBound: S_NULLABLE_BOOL,
  remainingAxeViolations: S_NULLABLE_NUM,
  remainingEqualAccessFailures: S_NULLABLE_NUM,
  taggedPdfDelivery: strictObj({
    ok: S_BOOL,
    code: {
      type: 'string',
      enum: ['verified', 'typeset-content-dropped', 'roundtrip-unavailable', 'roundtrip-failed', 'validator-unavailable', 'validator-error', 'validator-failed', 'ocr-text-layer-incomplete', 'delivery-verdict-unavailable'],
    },
  }, ['ok', 'code'], true),
  taggedPdfExportMode: { type: ['string', 'null'], enum: ['original_layout', 'clean_rebuild', null] },
  activeContentScanVerified: S_NULLABLE_BOOL,
  activeContentDetected: S_NULLABLE_BOOL,
  auditCoverage: strictObj({
    configuredAuditorCap: S_NULLABLE_NUM,
    requestedAuditors: S_NULLABLE_NUM,
    completedAuditors: S_NULLABLE_NUM,
    sliced: S_NULLABLE_BOOL,
  }, ['configuredAuditorCap', 'requestedAuditors', 'completedAuditors', 'sliced'], true),
  autoContinue: {}, taggedPdfError: {}, runId: {}, stats: {},
  pdfUa: obj({ standard: S_STR, compliant: S_BOOL, failedChecks: S_NUM, failedRules: { type: 'array' } }),
  note: S_STR,
}, ['input', 'files']);
const S_JOB_VIEW = obj({
  ok: S_BOOL, error: S_STR, jobId: S_STR, kind: S_STR,
  status: { type: 'string', enum: ['queued', 'running', 'completed', 'failed', 'cancelled', 'interrupted'] },
  createdAt: S_STR, startedAt: { type: ['string', 'null'] }, finishedAt: { type: ['string', 'null'] },
  input: {}, recentLog: { type: 'array', items: S_STR },
  progress: obj({
    filesDone: S_NUM, filesTotal: S_NUM, filesRemaining: S_NUM,
    meanSecondsPerFile: S_NUM, estimatedMinutesRemaining: S_NUM, estimateBasis: S_STR,
  }),
  resultAvailable: S_BOOL, restored: S_BOOL, interruptedNote: S_STR, durabilityWarning: S_STR,
  partial: S_BOOL, fromPreviousServerRun: S_BOOL, result: {},
});

const OUTPUT_SCHEMAS = {
  remediation_capabilities: obj({
    ready: { type: 'boolean', description: 'Current build/components are intact and this process verified the configured key.' },
    readyMeans: S_STR,
    fullAiPipelineReady: S_BOOL,
    keylessModeAvailable: S_BOOL,
    keylessModeMeans: S_STR,
    keylessToolNames: { type: 'array', items: S_STR },
    geminiRequiredToolNames: { type: 'array', items: S_STR },
    dataHandling: strictObj({
      offlineToolNames: { type: 'array', items: S_STR },
      publicDependencyDownloadToolNames: { type: 'array', items: S_STR },
      credentialCheckToolNames: { type: 'array', items: S_STR },
      geminiDocumentEgressToolNames: { type: 'array', items: S_STR },
      dependencyDownloadsSendDocumentContent: S_BOOL,
      note: S_STR,
    }, ['offlineToolNames', 'publicDependencyDownloadToolNames', 'credentialCheckToolNames', 'geminiDocumentEgressToolNames', 'dependencyDownloadsSendDocumentContent', 'note']),
    onboarding: strictObj({
      state: { type: 'string', enum: ['busy', 'setup-required', 'reinstall-required', 'keyless-ready', 'key-present-untested', 'key-invalid', 'key-unreachable', 'key-quota-exhausted', 'full-ai-ready'] },
      nextTool: { type: ['string', 'null'] },
      actionRequired: S_BOOL,
      message: S_STR,
    }, ['state', 'nextTool', 'actionRequired', 'message']),
    alloflowAccountRequired: S_BOOL,
    paidWorkerRequired: S_BOOL,
    institutionAccountRequired: S_BOOL,
    geminiKeyPresent: S_BOOL, geminiKeySource: S_STR,
    keyVerified: S_BOOL,
    keyVerificationState: { type: 'string', enum: ['not-checked', 'valid', 'valid-but-quota-exhausted', 'invalid', 'unreachable'] },
    keyVerificationCheckedAt: { type: ['string', 'null'] },
    playwrightAvailable: S_BOOL, chromiumInstalled: S_BOOL, setupHint: S_STR,
    vendorAssets: obj({ present: S_BOOL, hashVerified: S_BOOL, root: {}, files: S_NUM, error: S_STR }, ['present', 'hashVerified', 'files']),
    runtimeBuild: strictObj({ fingerprintSha256: S_STR, current: S_BOOL, checkedAt: S_STR, error: S_STR }, ['fingerprintSha256', 'current', 'checkedAt']),
    pipelineModulesPresent: obj({}), model: S_STR, fallbackModel: S_STR,
    maxRunMinutes: S_NUM, maxPdfMB: S_NUM, singleFlight: S_BOOL, busy: {},
    jobs: obj({ stored: S_NUM, unfinished: S_NUM, interrupted: S_NUM, stateDir: S_STR, durable: S_BOOL, retentionDays: S_NUM }),
    allowedRoots: { type: ['array', 'null'], items: S_STR, description: 'null means unrestricted' },
    networkEgress: { type: 'array', items: S_STR },
  }, ['ready']),
  remediation_verify_key: obj({
    state: { type: 'string', enum: ['no-key', 'valid', 'valid-but-quota-exhausted', 'invalid', 'unreachable'] },
    keyWorks: { type: ['boolean', 'null'], description: 'true/false when tested; null when no key or the API was unreachable' },
    checked: S_BOOL, checkedAt: S_STR,
    geminiKeySource: S_STR,
    detail: S_STR,
    setup: S_STR,
    documentContentSent: S_BOOL,
  }, ['state', 'keyWorks', 'checked', 'documentContentSent']),
  remediation_selftest: obj({
    ok: S_BOOL,
    stage: { type: 'string', description: "'complete' on success; otherwise the stage that broke: assets | browser | module-boot | ownership-gate | audit-contract | run | output" },
    hint: S_STR, error: S_STR, durationMs: S_NUM, modelCalls: S_NUM,
    checks: obj({ browserLaunched: S_BOOL, modulesBooted: S_BOOL, auditAccepted: S_BOOL, remediationStarted: S_BOOL, contentPreserved: S_BOOL }),
    beforeScore: {}, afterScore: {}, note: S_STR,
  }, ['ok', 'stage']),
  remediation_setup: obj({ ok: S_BOOL, installed: S_BOOL, alreadyInstalled: S_BOOL, error: S_STR, note: S_STR }, ['ok']),
  audit_two_engines: obj({
    input: S_STR, axe: {}, equalAccess: {}, equalAccessError: S_STR,
    onlyAxe: { type: 'array', items: S_STR }, onlyEqualAccess: { type: 'array', items: S_STR },
    disagreements: S_NUM, note: S_STR,
  }, ['input', 'axe']),
  check_document_structure: obj({
    input: S_STR, output: S_STR, characters: S_NUM, headingCounts: {},
    headingSkips: { type: 'number', description: 'Skipped levels (h2 -> h4) are a WCAG 1.3.1 failure' },
    headingIssue: {}, note: S_STR,
  }, ['input', 'characters']),
  redact_document: obj({
    input: S_STR, output: S_STR, redactionCount: S_NUM, redacted: {},
    clean: { type: 'boolean', description: 'The pipeline re-scanned its own output; false means targets survived' },
    leaks: { type: 'array' }, note: S_STR,
  }, ['input', 'output', 'clean']),
  extract_document_text: obj({
    input: S_STR, output: S_STR, kind: S_STR, characters: S_NUM,
    method: { type: ['string', 'null'], description: "'failed' means extraction failed, not that the document was empty" },
    error: S_STR, mediaImages: S_NUM, text: S_STR, note: S_STR,
  }, ['input', 'kind', 'characters']),
  detect_form_fields: obj({
    input: S_STR, count: S_NUM, unlabelled: S_NUM, blanks: { type: 'array' }, note: S_STR,
  }, ['input', 'count']),
  apply_form_fields: obj({ input: S_STR, output: S_STR, applied: S_NUM, bytes: S_NUM }, ['input', 'output']),
  simplify_accessible_html: obj({ input: S_STR, output: S_STR, bytes: S_NUM, note: S_STR }, ['input', 'output']),
  transcribe_media: obj({
    input: S_STR, output: S_STR, mode: S_STR, words: S_NUM, note: S_STR,
  }, ['input', 'output']),
  translate_accessible_html: obj({
    input: S_STR, output: S_STR, targetLanguage: S_STR, bytes: S_NUM, note: S_STR,
  }, ['input', 'output']),
  fix_contrast: obj({
    input: S_STR, output: S_STR, changed: S_BOOL,
    styleFixes: { type: ['number', 'null'], description: 'Deterministic count of colour corrections applied — this is the evidence, not the axe numbers' },
    axeBefore: {}, axeAfter: {}, contrastFindings: {},
    evidence: { type: 'string', description: 'States plainly that axe does not verify contrast in this harness' },
  }, ['input', 'output']),
  generate_conformance_report: obj({
    output: S_STR, bytes: S_NUM, generator: S_STR, pdfUaIncluded: S_BOOL, note: S_STR,
  }, ['output']),
  generate_resource_pack: obj({
    input: S_STR, output: S_STR, bytes: S_NUM, resourcesRequested: S_NUM,
    worksheet: S_BOOL, modelFree: S_BOOL, generator: S_STR, note: S_STR,
  }, ['input', 'output', 'resourcesRequested']),
  describe_images: obj({
    input: S_STR, output: S_STR, classified: S_NUM, equations: S_NUM, charts: S_NUM,
    visionCalls: S_NUM, dedupedCopies: S_NUM, note: S_STR,
  }, ['input', 'output']),
  export_accessible_office: obj({
    input: S_STR, output: S_STR, format: { type: 'string', enum: ['docx', 'odt'] },
    bytes: S_NUM, counts: {}, note: S_STR,
  }, ['input', 'output', 'format']),
  export_alt_format: obj({
    input: S_STR, output: S_STR, format: { type: 'string', enum: ['epub', 'daisy', 'brf'] },
    bytes: S_NUM, modelFree: S_BOOL,
    // ePub / DAISY only
    entries: { type: 'array' }, language: S_STR, identifier: S_STR, navEntries: S_NUM,
    selfChecked: S_BOOL, valid: S_BOOL, structuralErrors: { type: 'array' },
    // BRF only
    grade: S_NUM, code: S_STR, droppedCharacters: S_NUM, sourceCharacters: S_NUM,
    warnings: { type: 'array' }, note: S_STR,
  }, ['input', 'output', 'format']),
  pdf_audit: S_AUDIT,
  pdf_validate_ua: obj({
    input: S_STR, standard: S_STR, validator: S_STR,
    compliant: S_BOOL, failedChecks: S_NUM, failedRuleCount: S_NUM, failedRules: { type: 'array' }, passedChecks: S_NUM, passedRuleCount: S_NUM, validatorVersion: S_STR, profile: S_STR, transport: S_STR,
    inputSha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    inputBytes: S_NUM, validatedAt: S_STR, validationDurationMs: S_NUM, note: S_STR,
  }, ['compliant', 'inputSha256', 'inputBytes', 'validatedAt']),
  pdf_remediate: S_REMEDIATE,
  pdf_remediate_start: S_JOB_START,
  pdf_batch_audit_start: S_JOB_START,
  pdf_batch_remediate_start: S_JOB_START,
  pdf_remediate_from_scoreboard_start: obj({
    jobId: S_STR, status: S_STR, files: S_NUM, note: S_STR,
    selectedFrom: { type: 'number', description: 'How many documents the scoreboard scored, of which `files` were selected' },
    bands: { type: 'array', items: S_STR }, scoreboard: S_STR,
    missingFromDisk: S_NUM,
  }, ['jobId', 'status']),
  remediation_job_status: S_JOB_VIEW,
  remediation_job_result: S_JOB_VIEW,
  remediation_job_diagnostics: obj({ ok: S_BOOL, error: S_STR, jobId: S_STR, source: { type: 'string', enum: ['job', 'last-run'] }, capturedAt: S_STR, fileName: S_STR, diagnostics: {} }, ['ok']),
  remediation_job_cancel: obj({ ok: S_BOOL, error: S_STR, jobId: S_STR, status: S_STR, wasRunning: S_BOOL, killedRun: S_BOOL, durabilityWarning: S_STR }),
};

for (const t of TOOLS) {
  if (OUTPUT_SCHEMAS[t.name]) t.outputSchema = OUTPUT_SCHEMAS[t.name];
  else throw new Error('Tool ' + t.name + ' has no outputSchema — every tool here returns structuredContent, so add one.');
}

const TOOL_HANDLERS = {
  async generate_resource_pack(args, ctx) {
    assertAllowedKeys(args, ['resource_pack_json', 'output_path'], 'arguments');
    const inputPath = enforceAllowedRoot(path.resolve(String(args.resource_pack_json || '')), 'arguments.resource_pack_json');
    if (!/\.json$/i.test(inputPath)) throw invalidParams('arguments.resource_pack_json must be a .json file');
    if (!fs.existsSync(inputPath)) throw invalidParams('arguments.resource_pack_json does not exist: ' + inputPath);
    const size = fs.statSync(inputPath).size;
    if (size > 10 * 1024 * 1024) throw invalidParams('arguments.resource_pack_json exceeds the 10 MB limit');
    if (typeof args.output_path !== 'string' || !args.output_path.trim()) throw invalidParams('arguments.output_path is required');
    const requestedOutput = enforceAllowedRoot(path.resolve(args.output_path), 'arguments.output_path');
    if (!/\.html?$/i.test(requestedOutput)) throw invalidParams('arguments.output_path must end in .html or .htm');

    let payload;
    try { payload = JSON.parse(fs.readFileSync(inputPath, 'utf8')); }
    catch (e) { throw invalidParams('arguments.resource_pack_json is not readable JSON: ' + ((e && e.message) || e)); }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw invalidParams('resource-pack JSON must be an object');
    assertAllowedKeys(payload, ['items', 'topic', 'isWorksheet', 'responses', 'config'], 'resource-pack JSON');
    if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 500) {
      throw invalidParams('resource-pack JSON.items must contain 1-500 resources');
    }
    if (payload.items.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
      throw invalidParams('every resource-pack JSON.items entry must be an object');
    }
    if (payload.topic !== undefined && typeof payload.topic !== 'string') throw invalidParams('resource-pack JSON.topic must be a string');
    if (payload.isWorksheet !== undefined && typeof payload.isWorksheet !== 'boolean') throw invalidParams('resource-pack JSON.isWorksheet must be a boolean');
    for (const key of ['responses', 'config']) {
      if (payload[key] !== undefined && (payload[key] === null || typeof payload[key] !== 'object' || Array.isArray(payload[key]))) {
        throw invalidParams('resource-pack JSON.' + key + ' must be an object');
      }
    }

    fs.mkdirSync(path.dirname(requestedOutput), { recursive: true });
    const dest = claimOutputPath(path.dirname(requestedOutput), path.basename(requestedOutput));
    const out = await withSingleFlight('generate_resource_pack', () => getDriver().generateResourcePack({
      items: payload.items,
      topic: payload.topic || '',
      isWorksheet: payload.isWorksheet === true,
      responses: payload.responses || {},
      config: payload.config || null,
      onLog: ctx && ctx.onProgress,
    }));
    if (!out || typeof out.html !== 'string') throw new Error('The production resource-pack generator returned no HTML');
    fs.writeFileSync(dest, out.html, 'utf8');
    return {
      input: inputPath, output: dest, bytes: Buffer.byteLength(out.html),
      resourcesRequested: out.resourcesRequested, worksheet: out.worksheet, modelFree: true,
      generator: "AlloFlow's production generateFullPackHTML",
      note: 'This is the normal app resource-pack renderer exposed through MCP; no rendering or remediation logic is duplicated in the connector.',
    };
  },

  async remediation_verify_key(args) {
    assertAllowedKeys(args, [], 'arguments');
    const keyBefore = Driver.resolveGeminiApiKey();
    const identityBefore = geminiCredentialIdentity(keyBefore);
    const result = await Driver.verifyGeminiApiKey();
    const keyWorks = result.state === 'valid' || result.state === 'valid-but-quota-exhausted'
      ? true
      : (result.state === 'invalid' ? false : null);
    const out = {
      state: result.state,
      keyWorks,
      checked: !!result.checked,
      geminiKeySource: result.source, // label only; never the value
      documentContentSent: false,
    };
    const keyAfter = Driver.resolveGeminiApiKey();
    const identityAfter = geminiCredentialIdentity(keyAfter);
    if (identityBefore && identityBefore === identityAfter && keyBefore.source === keyAfter.source) {
      geminiKeyVerification = {
        identity: identityAfter, source: keyAfter.source, state: result.state,
        keyWorks, checkedAt: new Date().toISOString(),
      };
      out.checkedAt = geminiKeyVerification.checkedAt;
    } else {
      geminiKeyVerification = null;
      out.keyWorks = null;
      out.detail = 'The configured Gemini credential changed while it was being checked. Run remediation_verify_key again.';
    }
    if (result.detail) out.detail = result.detail;
    // Only hand back setup steps when the user actually needs to act.
    if (result.state === 'no-key' || result.state === 'invalid') out.setup = KEY_SETUP_HINT;
    return out;
  },

  remediation_capabilities(args) {
    assertAllowedKeys(args, [], 'arguments');
    // The playwright PACKAGE resolving is necessary but NOT sufficient — a packaged
    // bundle ships the package, never the ~200MB browser binary. Probe both, or a
    // fresh install claims ready and then dies at first run.
    const chrome = Driver.resolveChromium();
    const playwrightAvailable = !!chrome.chromium;
    const modules = {};
    for (const f of Driver.MODULE_FILES) modules[f] = fs.existsSync(path.join(Driver.ASSETS_ROOT, f));
    const keyInfo = Driver.resolveGeminiApiKey();
    const keyVerification = currentGeminiKeyVerification(keyInfo);
    const keyVerified = !!(keyVerification && keyVerification.keyWorks === true);
    const keyUsableNow = !!(keyVerification && keyVerification.state === 'valid');
    const vendorAssets = Driver.verifyVendorBundle();
    const runtimeBuild = currentBuildFingerprint();
    const modulesReady = Object.values(modules).every(Boolean);
    const browserRuntimeReady = playwrightAvailable && chrome.installed && vendorAssets.hashVerified && modulesReady && runtimeBuild.current;
    let onboarding;
    if (busyWith) {
      onboarding = {
        state: 'busy', nextTool: null, actionRequired: true,
        message: 'A run is already active. Wait for it to finish or use the job id already returned by a background start tool with remediation_job_status.',
      };
    } else if (!playwrightAvailable || !vendorAssets.hashVerified || !modulesReady || !runtimeBuild.current) {
      onboarding = {
        state: 'reinstall-required', nextTool: null, actionRequired: true,
        message: runtimeBuild.current ? 'The connector package is incomplete or failed its local asset integrity check. Reinstall this connector; adding a Gemini key will not fix it.' : runtimeBuild.error,
      };
    } else if (!chrome.installed) {
      onboarding = {
        state: 'setup-required', nextTool: 'remediation_setup', actionRequired: true,
        message: 'Call remediation_setup once to download Chromium. No Gemini key or AlloFlow account is needed.',
      };
    } else if (keyUsableNow) {
      onboarding = {
        state: 'full-ai-ready', nextTool: null, actionRequired: false,
        message: 'The current build and local runtime are intact, and this configured Gemini key was accepted at ' + keyVerification.checkedAt + '.',
      };
    } else if (keyVerification && keyVerification.state === 'valid-but-quota-exhausted') {
      onboarding = {
        state: 'key-quota-exhausted', nextTool: 'remediation_verify_key', actionRequired: true,
        message: 'The configured key was accepted, but its Gemini quota was exhausted at ' + keyVerification.checkedAt + '. Wait for quota to reset, then verify again. Keyless tools remain ready.',
      };
    } else if (keyVerification && keyVerification.state === 'invalid') {
      onboarding = {
        state: 'key-invalid', nextTool: 'remediation_verify_key', actionRequired: true,
        message: 'The configured key was rejected at ' + keyVerification.checkedAt + '. Replace or re-enable it, then verify again. Keyless tools remain ready.',
      };
    } else if (keyVerification && keyVerification.state === 'unreachable') {
      onboarding = {
        state: 'key-unreachable', nextTool: 'remediation_verify_key', actionRequired: true,
        message: 'Gemini was unreachable at ' + keyVerification.checkedAt + ', so the configured key is still unverified. Restore connectivity and verify again. Keyless tools remain ready.',
      };
    } else if (keyInfo.key) {
      // DETECTED, not verified. This state deliberately does not claim the key works:
      // a revoked or mistyped key used to report ready here and then fail at call time.
      onboarding = {
        state: 'key-present-untested', nextTool: 'remediation_verify_key', actionRequired: false,
        message: 'A Gemini key is configured (source: ' + keyInfo.source + '), but its presence has NOT been tested — this check only reads whether a key exists. Call remediation_verify_key to prove it works before relying on the Gemini-powered tools; it sends no document content and spends no generation quota. All keyless tools are ready regardless.',
      };
    } else {
      onboarding = {
        state: 'keyless-ready', nextTool: 'remediation_selftest', actionRequired: false,
        message: 'Local tools are ready without an account or key, and cover audit, structure checks, extraction, exports, redaction, conformance reports and PDF/UA validation. ' + KEY_SETUP_HINT,
      };
    }
    return {
      geminiKeyPresent: !!keyInfo.key,
      geminiKeySource: keyInfo.source, // label only; never the value
      keyVerified,
      keyVerificationState: keyVerification ? keyVerification.state : 'not-checked',
      keyVerificationCheckedAt: keyVerification ? keyVerification.checkedAt : null,
      keylessModeAvailable: true,
      keylessModeMeans: 'These registered tools require no Gemini key, paid Worker, institution account, or AlloFlow service. Individual tools can still require local files, Java/Chromium, or an optional library download; inspect the tool description.',
      keylessToolNames: KEYLESS_TOOL_NAMES,
      geminiRequiredToolNames: GEMINI_REQUIRED_TOOL_NAMES,
      dataHandling: {
        offlineToolNames: OFFLINE_TOOL_NAMES,
        publicDependencyDownloadToolNames: PUBLIC_DEPENDENCY_DOWNLOAD_TOOL_NAMES,
        credentialCheckToolNames: CREDENTIAL_CHECK_TOOL_NAMES,
        geminiDocumentEgressToolNames: GEMINI_REQUIRED_TOOL_NAMES,
        dependencyDownloadsSendDocumentContent: false,
        note: 'Offline tools make no external network request. Dependency-download tools fetch Chromium or pinned public JavaScript libraries; AlloFlow does not intentionally include document content in those requests, though the provider can observe ordinary connection metadata such as IP address and timing. Credential-check tools contact the Gemini API with the configured key only, to test whether it works, and send no document content. Gemini tools send the document or derived content to Gemini under the user-provided key.',
      },
      onboarding,
      alloflowAccountRequired: false,
      paidWorkerRequired: false,
      institutionAccountRequired: false,
      playwrightAvailable,
      chromiumInstalled: chrome.installed,
      setupHint: (!chrome.installed && playwrightAvailable) ? 'The Chromium browser binary is not installed yet — call remediation_setup once (a ~200MB one-time download) and this environment becomes ready.' : undefined,
      pipelineModulesPresent: modules,
      vendorAssets,
      runtimeBuild,
      model: process.env.ALLOFLOW_MCP_GEMINI_MODEL || 'gemini-3-flash-preview',
      fallbackModel: process.env.ALLOFLOW_MCP_GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite',
      maxRunMinutes: Number(process.env.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30,
      maxPdfMB: Math.round(MAX_PDF_BYTES / 1024 / 1024),
      singleFlight: true,
      busy: busyWith || false,
      jobs: {
        stored: JOBS.size,
        unfinished: Array.from(JOBS.values()).filter((j) => ['queued', 'running'].indexOf(j.status) !== -1).length,
        interrupted: Array.from(JOBS.values()).filter((j) => j.status === 'interrupted').length,
        stateDir: STATE_DIR,
        durable: jobRecordsWritable,
        retentionDays: Math.round(JOB_RECORD_TTL_MS / 86400000),
      },
      // Absent means unrestricted, which is the honest word for it: the connector can read and
      // write wherever this user can. Set ALLOFLOW_MCP_ALLOWED_ROOTS to make that a boundary.
      allowedRoots: ALLOWED_ROOTS.length ? ALLOWED_ROOTS : null,
      networkEgress: ['generativelanguage.googleapis.com (document or derived content; Gemini tools only)', 'Playwright browser download service (remediation_setup only; no document)', 'unpkg.com and cdn.jsdelivr.net (pinned exporter libraries only; no document intentionally included)'],
      ready: keyUsableNow && browserRuntimeReady,
      fullAiPipelineReady: keyUsableNow && browserRuntimeReady,
      // `ready` is a PRESENCE check, and presence is not function. It reported true for an install
      // where every run died at the pipeline's ownership gate (2026-07-28). Say so, rather than
      // letting one word imply more than it verifies.
      readyMeans: 'True means the on-disk build still matches this process, required local components are present, and the current key passed remediation_verify_key here. It still does NOT prove a full remediation succeeds; call remediation_selftest for the keyless pipeline path.',
    };
  },

  async remediation_selftest(args, ctx) {
    assertAllowedKeys(args, [], 'arguments');
    requireCurrentRuntimeBuild();
    // Needs the browser but NOT a key: the whole point is to be runnable on an install that has
    // no key yet, so a user can separate "the connector is broken" from "my key is wrong".
    const chrome = Driver.resolveChromium();
    if (!chrome.chromium) return { ok: false, stage: 'browser', error: 'The playwright package is missing — reinstall the connector.' };
    if (!chrome.installed) return { ok: false, stage: 'browser', error: 'Chromium is not installed yet — call remediation_setup once (a ~200MB one-time download), then retry.' };
    return withSingleFlight('remediation_selftest', () => getDriver().selfTest({ onLog: ctx && ctx.onProgress }));
  },

  async export_accessible_office(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'format', 'output_dir', 'title'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const format = String(args.format || '').toLowerCase();
    if (format !== 'docx' && format !== 'odt') throw invalidParams("arguments.format must be 'docx' or 'odt'");
    if (args.title !== undefined && (typeof args.title !== 'string' || !args.title.trim())) throw invalidParams('arguments.title must be a non-empty string');
    const outDir = resolveOutputDir(args, htmlPath);
    const title = args.title || path.basename(htmlPath).replace(/\.html?$/i, '');
    // No key gate: this path is deterministic packaging, so requiring one would be a lie about
    // what it needs. It still takes the single-flight lane because it drives the browser.
    return withSingleFlight('export_accessible_office', async () => {
      const out = await getDriver().exportAccessibleOffice({
        html: fs.readFileSync(htmlPath, 'utf8'), title, format, onLog: ctx && ctx.onProgress,
      });
      const dest = claimOutputPath(outDir, out.fileName);
      fs.writeFileSync(dest, Buffer.from(out.b64, 'base64'));
      return {
        input: htmlPath, output: dest, format,
        bytes: fs.statSync(dest).size,
        counts: out.counts || undefined,
        note: (out.message || '') + ' Structure comes from the HTML, so verify the source HTML is the remediated one, not the original.',
      };
    });
  },

  async export_alt_format(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'format', 'output_dir', 'title'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const format = String(args.format || '').toLowerCase();
    if (!['epub', 'daisy', 'brf'].includes(format)) throw invalidParams("arguments.format must be 'epub', 'daisy' or 'brf'");
    if (args.title !== undefined && (typeof args.title !== 'string' || !args.title.trim())) throw invalidParams('arguments.title must be a non-empty string');
    const outDir = resolveOutputDir(args, htmlPath);
    const title = args.title || path.basename(htmlPath).replace(/\.html?$/i, '');
    return withSingleFlight('export_alt_format', async () => {
      const out = await getDriver().exportAltFormat({
        html: fs.readFileSync(htmlPath, 'utf8'), title, format, onLog: ctx && ctx.onProgress,
      });
      const dest = claimOutputPath(outDir, out.fileName);
      fs.writeFileSync(dest, Buffer.from(out.b64, 'base64'));
      const res = {
        input: htmlPath, output: dest, format: out.format,
        bytes: fs.statSync(dest).size, modelFree: true,
        warnings: out.warnings || [],
      };
      if (format === 'brf') {
        Object.assign(res, {
          grade: out.grade, code: out.code,
          droppedCharacters: out.droppedCharacters, sourceCharacters: out.sourceCharacters,
          note: 'Uncontracted (Grade 1) braille. Most experienced braille readers expect contracted UEB (Grade 2), which this connector cannot produce — say so rather than implying this is the finished article. Have a certified transcriber review anything going to a student.',
        });
      } else {
        Object.assign(res, {
          entries: out.entries, language: out.language, identifier: out.identifier,
          navEntries: out.navEntries, selfChecked: out.selfChecked,
          valid: out.valid, structuralErrors: out.structuralErrors,
          note: format === 'epub'
            ? 'Structure comes from the source HTML, so verify it is the remediated file. The self-check is structural only and is not epubcheck; a clean result is not a conformance claim.'
            : 'DAISY 3 full text, no recorded audio. A DAISY reader supplies speech, braille or large print from this text. NOTHING validated this package — there is no DAISY validator in this connector, so absence of errors is not evidence of correctness; run it through a DAISY reader or ZedVal before relying on it.',
        });
      }
      return res;
    });
  },

  // Output path helper for the HTML-in/HTML-out tools: honours an explicit path, otherwise writes
  // a suffixed sibling. Collision-safe either way, so no tool here can destroy an input.
  async fix_contrast(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'output_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const dest = _htmlOutputPath(args, htmlPath, '-contrast.html');
    const out = await withSingleFlight('fix_contrast', () => getDriver().fixContrast({ html: fs.readFileSync(htmlPath, 'utf8'), onLog: ctx && ctx.onProgress }));
    fs.writeFileSync(dest, out.html, 'utf8');
    return {
      input: htmlPath, output: dest, changed: out.changed, styleFixes: out.styleFixes,
      axeBefore: { violations: out.beforeViolations, ids: out.beforeViolationIds },
      axeAfter: { violations: out.afterViolations, ids: out.afterViolationIds },
      contrastFindings: { before: out.beforeContrast, after: out.afterContrast },
      evidence: out.evidence,
    };
  },

  async generate_conformance_report(args) {
    assertAllowedKeys(args, ['audit_json', 'verapdf_json', 'accessible_html', 'output_path', 'document_name'], 'arguments');
    const auditPath = enforceAllowedRoot(path.resolve(String(args.audit_json || '')), 'arguments.audit_json');
    if (!fs.existsSync(auditPath)) throw invalidParams('arguments.audit_json does not exist: ' + auditPath);
    if (typeof args.output_path !== 'string' || !args.output_path.trim()) throw invalidParams('arguments.output_path is required');
    const outPath = enforceAllowedRoot(path.resolve(args.output_path), 'arguments.output_path');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    let axe;
    try { axe = JSON.parse(fs.readFileSync(auditPath, 'utf8')); }
    catch (e) { throw invalidParams('arguments.audit_json is not readable JSON: ' + ((e && e.message) || e)); }

    let vera = null;
    if (args.verapdf_json !== undefined) {
      const vp = enforceAllowedRoot(path.resolve(String(args.verapdf_json)), 'arguments.verapdf_json');
      if (!fs.existsSync(vp)) throw invalidParams('arguments.verapdf_json does not exist: ' + vp);
      try { vera = JSON.parse(fs.readFileSync(vp, 'utf8')); }
      catch (e) { throw invalidParams('arguments.verapdf_json is not readable JSON: ' + ((e && e.message) || e)); }
    }
    let accessibleHtml = '';
    if (args.accessible_html !== undefined) {
      const hp = _requireFileOfType({ file_path: args.accessible_html }, /\.html?$/i, '.html');
      accessibleHtml = fs.readFileSync(hp, 'utf8');
    }

    // Only clause 5 test 1 is the by-design withheld PDF/UA declaration; everything else is a
    // genuine failure. Preserving that distinction is what keeps the report honest in both
    // directions rather than flattening a deliberate abstention into a defect.
    const failed = (vera && vera.failedRules) || [];
    const checks = failed.map((r) => ({
      id: 'ISO 14289-1 clause ' + r.clause + ' test ' + r.testNumber,
      label: r.message,
      status: (String(r.clause) === '5' && Number(r.testNumber) === 1) ? 'warn' : 'fail',
      detail: (r.count || 1) + ' occurrence(s)',
    }));
    const summary = {
      pass: 0, fail: checks.filter((c) => c.status === 'fail').length,
      warn: checks.filter((c) => c.status === 'warn').length, manual: 0, na: 0,
      conformancePct: vera ? (vera.compliant ? 100 : (checks.some((c) => c.status === 'fail') ? 0 : 95)) : 0,
    };

    const html = await withSingleFlight('generate_conformance_report', () => getDriver().buildConformanceReport({
      fixResult: {
        accessibleHtml,
        axeAudit: { totalViolations: axe.totalViolations, violations: axe.violations || [], score: axe.axeScore },
        afterScore: axe.axeScore, beforeScore: null,
        _aiVerificationIncomplete: true, // no AI verification pass runs in this flow; the report must say so
        verificationCoverage: { pdfUaSelfCheck: !!vera },
      },
      auditResult: { score: null, summary: 'Source audit not performed by a triangulated auditor panel in this flow.', issues: [] },
      pdfUa: vera ? { checks, summary } : null,
      reportOpts: { fileName: args.document_name || path.basename(auditPath) },
    }));
    fs.writeFileSync(outPath, html, 'utf8');
    return {
      output: outPath, bytes: Buffer.byteLength(html),
      generator: "AlloFlow's own generateAccessibilityReportHtml",
      pdfUaIncluded: !!vera,
      note: 'Automated checks cover only machine-decidable criteria. The report states that; do not describe it as certifying WCAG compliance.',
    };
  },

  async describe_images(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'output_path', 'cap'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const cap = optionalBoundedNumber(args, 'cap', 1, 40);
    const dest = _htmlOutputPath(args, htmlPath, '-alt.html');
    requireGeminiKey(); // the only HTML operation here that truly needs one
    const out = await withSingleFlight('describe_images', () => getDriver().describeImages({
      html: fs.readFileSync(htmlPath, 'utf8'), cap: cap || 10,
      fileName: path.basename(htmlPath), onLog: ctx && ctx.onProgress,
    }));
    fs.writeFileSync(dest, out.html, 'utf8');
    return {
      input: htmlPath, output: dest,
      classified: out.classified, equations: out.equations, charts: out.charts,
      visionCalls: out.visionCalls, dedupedCopies: out.dedupedCopies,
      note: 'Alt text is model-generated and unverified. A person should read it: whether a description is MEANINGFUL is not machine-decidable.',
    };
  },

  async transcribe_media(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'mode', 'output_path'], 'arguments');
    const filePath = _requireFileOfType(args, /\.(mp3|m4a|wav|aac|ogg|flac|mp4|mov|webm|mpeg|mpg)$/i, 'audio or video');
    if (args.mode !== undefined && ['speech', 'visual', 'dual', 'synthesis'].indexOf(args.mode) === -1) {
      throw invalidParams("arguments.mode must be one of: speech, visual, dual, synthesis");
    }
    const dest = args.output_path !== undefined
      ? enforceAllowedRoot(path.resolve(args.output_path), 'arguments.output_path')
      : claimOutputPath(path.dirname(filePath), path.basename(filePath).replace(/\.[^.]+$/, '') + '-transcript.txt');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    requireGeminiKey();
    return withSingleFlight('transcribe_media', async () => {
      const out = await getDriver().transcribeMedia({ filePath, mode: args.mode || 'speech', onLog: ctx && ctx.onProgress });
      fs.writeFileSync(dest, String(out.payload || ''), 'utf8');
      return {
        input: filePath, output: dest, mode: out.mode, words: out.words,
        note: 'A transcript is a starting point, not a finished accessible document. Long or noisy recordings degrade; a person should check names, numbers and speaker attribution before distribution.',
      };
    });
  },

  async translate_accessible_html(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'target_language', 'output_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    if (typeof args.target_language !== 'string' || !args.target_language.trim()) throw invalidParams('arguments.target_language is required');
    if (args.target_language.length > 120) throw invalidParams('arguments.target_language is too long (max 120 characters)');
    const langSlug = args.target_language.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'translated';
    const dest = _htmlOutputPath(args, htmlPath, '-' + langSlug + '.html');
    requireGeminiKey();
    return withSingleFlight('translate_accessible_html', async () => {
      const out = await getDriver().translateHtml({
        html: fs.readFileSync(htmlPath, 'utf8'), targetLang: args.target_language,
        fileName: path.basename(htmlPath), onLog: ctx && ctx.onProgress,
      });
      if (!out || typeof out.html !== 'string' || !out.html.trim()) throw new Error('Translation returned no HTML');
      fs.writeFileSync(dest, out.html, 'utf8');
      return {
        input: htmlPath, output: dest, targetLanguage: args.target_language,
        bytes: Buffer.byteLength(out.html),
        note: 'Machine translation. Structure is preserved and images are protected during translation, but a fluent speaker should review it before it reaches families — an accessible document in bad language is not accessible.',
      };
    });
  },

  async redact_document(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'targets', 'output_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    if (!Array.isArray(args.targets) || !args.targets.length) throw invalidParams('arguments.targets must be a non-empty array of strings');
    const targets = args.targets.map((t) => String(t)).filter((t) => t.trim());
    if (!targets.length) throw invalidParams('arguments.targets contained no non-empty strings');
    const dest = _htmlOutputPath(args, htmlPath, '-redacted.html');
    const out = await withSingleFlight('redact_document', () => getDriver().redactDocumentHtml({
      html: fs.readFileSync(htmlPath, 'utf8'), targets, options: {}, onLog: ctx && ctx.onProgress,
    }));
    fs.writeFileSync(dest, out.html, 'utf8');
    return {
      input: htmlPath, output: dest,
      redactionCount: out.count, redacted: out.redacted,
      clean: out.clean, leaks: out.leaks,
      note: out.clean
        ? 'The pipeline re-scanned its own output and found no surviving instance of the targets. It can only remove strings you named: variants, misspellings and inferable identifiers are not covered.'
        : 'LEAKS DETECTED — some targets survived redaction. Do not distribute this file; inspect `leaks`.',
    };
  },

  async extract_document_text(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'output_path'], 'arguments');
    const filePath = _requireFileOfType(args, /\.(docx|pptx|xlsx|xlsm|pdf)$/i, '.docx, .pptx, .xlsx or .pdf');
    const out = await withSingleFlight('extract_document_text', () => getDriver().extractDocumentText({ filePath, onLog: ctx && ctx.onProgress }));
    let dest;
    if (args.output_path !== undefined) {
      dest = enforceAllowedRoot(path.resolve(args.output_path), 'arguments.output_path');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, out.text, 'utf8');
    }
    return {
      input: filePath, output: dest, kind: out.kind,
      characters: out.text.length, method: out.method, error: out.error || undefined,
      mediaImages: out.mediaImages,
      // Bounded so a 200-page extraction cannot blow the MCP payload; output_path gets it all.
      text: out.text.length > 20000 ? out.text.slice(0, 20000) + '\n…[truncated; pass output_path for the full text]' : out.text,
      note: out.method === 'failed' ? 'Extraction FAILED — an empty result here is a failure, not an empty document.' : undefined,
    };
  },

  async detect_form_fields(args, ctx) {
    assertAllowedKeys(args, ['file_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const out = await withSingleFlight('detect_form_fields', () => getDriver().inspectFormFields({ html: fs.readFileSync(htmlPath, 'utf8'), onLog: ctx && ctx.onProgress }));
    const unlabelled = out.blanks.filter((b) => b.labelMissing).length;
    return {
      input: htmlPath, count: out.blanks.length, unlabelled, blanks: out.blanks,
      note: unlabelled
        ? unlabelled + ' blank(s) have no label. An unlabelled form field is a WCAG 4.1.2 failure, so give those a label before applying them.'
        : 'Pass the entries you want converted to apply_form_fields; omitted ones are left alone.',
    };
  },

  async apply_form_fields(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'accepted', 'output_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    if (!args.accepted || typeof args.accepted !== 'object' || Array.isArray(args.accepted)) {
      throw invalidParams('arguments.accepted must be an object map keyed by field id');
    }
    const acceptedIds = Object.keys(args.accepted);
    if (!acceptedIds.length || acceptedIds.length > 500) throw invalidParams('arguments.accepted must contain 1-500 field ids');
    for (const id of acceptedIds) {
      if (!/^f\d+$/.test(id)) throw invalidParams('arguments.accepted has an invalid field id: ' + id);
      const override = args.accepted[id];
      if (!override || typeof override !== 'object' || Array.isArray(override)) throw invalidParams('arguments.accepted.' + id + ' must be an object');
      assertAllowedKeys(override, ['label'], 'arguments.accepted.' + id);
      if (override.label !== undefined && (typeof override.label !== 'string' || override.label.length > 200)) {
        throw invalidParams('arguments.accepted.' + id + '.label must be a string of at most 200 characters');
      }
    }
    const dest = _htmlOutputPath(args, htmlPath, '-fillable.html');
    const out = await withSingleFlight('apply_form_fields', () => getDriver().applyFormFields({
      html: fs.readFileSync(htmlPath, 'utf8'), accepted: args.accepted, onLog: ctx && ctx.onProgress,
    }));
    fs.writeFileSync(dest, out.html, 'utf8');
    return { input: htmlPath, output: dest, applied: out.converted, bytes: Buffer.byteLength(out.html) };
  },

  async simplify_accessible_html(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'output_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const dest = _htmlOutputPath(args, htmlPath, '-plain.html');
    requireGeminiKey();
    return withSingleFlight('simplify_accessible_html', async () => {
      const out = await getDriver().simplifyHtml({
        html: fs.readFileSync(htmlPath, 'utf8'), fileName: path.basename(htmlPath), options: {}, onLog: ctx && ctx.onProgress,
      });
      if (!out || typeof out.html !== 'string' || !out.html.trim()) throw new Error('Simplification returned no HTML');
      fs.writeFileSync(dest, out.html, 'utf8');
      return {
        input: htmlPath, output: dest, bytes: Buffer.byteLength(out.html),
        note: 'Plain-language rewriting changes wording, so it can change MEANING. A person who knows the subject should compare it against the original before it replaces anything.',
      };
    });
  },

  async audit_two_engines(args, ctx) {
    assertAllowedKeys(args, ['file_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const out = await withSingleFlight('audit_two_engines', () => getDriver().auditWithBothEngines({
      html: fs.readFileSync(htmlPath, 'utf8'), onLog: ctx && ctx.onProgress,
    }));
    const disagreements = out.onlyAxe.length + out.onlyEqualAccess.length;
    return {
      input: htmlPath, axe: out.axe, equalAccess: out.equalAccess,
      equalAccessError: out.equalAccessError || undefined,
      onlyAxe: out.onlyAxe, onlyEqualAccess: out.onlyEqualAccess, disagreements,
      note: out.equalAccessError
        ? 'IBM Equal Access failed to run, so this is a SINGLE-engine result. Do not describe it as cross-validated.'
        : (disagreements
          ? disagreements + ' rule(s) flagged by one engine and not the other. Those are the ones worth a human look.'
          : 'The two engines agree on rule findings. Note their SCORES can still differ, and neither covers the criteria that need human judgment.'),
    };
  },

  async check_document_structure(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'output_path'], 'arguments');
    const htmlPath = _requireFileOfType(args, /\.html?$/i, '.html');
    const out = await withSingleFlight('check_document_structure', () => getDriver().htmlDerivatives({
      html: fs.readFileSync(htmlPath, 'utf8'), onLog: ctx && ctx.onProgress,
    }));
    let dest;
    if (args.output_path !== undefined) {
      dest = enforceAllowedRoot(path.resolve(args.output_path), 'arguments.output_path');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, out.text, 'utf8');
    }
    return {
      input: htmlPath, output: dest,
      characters: out.characters, headingCounts: out.headingCounts, headingSkips: out.headingSkips,
      headingIssue: out.headingIssue || undefined,
      note: out.headingSkips
        ? out.headingSkips + ' skipped heading level(s) — a jump like h2 to h4 is a WCAG 1.3.1 failure. Fix before tagging.'
        : 'No skipped heading levels. Whether the levels are semantically CORRECT is still a human judgment.',
    };
  },

  async remediation_setup(args) {
    assertAllowedKeys(args, [], 'arguments');
    const before = Driver.resolveChromium();
    if (!before.chromium) return { ok: false, error: 'The playwright package itself is missing — reinstall the connector (or run npm install in the AlloFlow repo).' };
    if (before.installed) return { ok: true, alreadyInstalled: true, note: 'Chromium is already installed; nothing to do.' };
    if (busyWith) return { ok: false, error: 'A ' + busyWith + ' run is in progress — retry setup once it finishes.' };
    const out = await withSingleFlight('remediation_setup', () => Driver.installChromium(log));
    if (!out.installed) return { ok: false, error: out.error || 'Install failed.' };
    return { ok: true, installed: true, note: 'Chromium installed — remediation_capabilities should now report ready (given a Gemini key).' };
  },

  async pdf_audit(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const ocrLanguage = optionalOcrLanguage(args);
    requireGeminiKey();
    return withSingleFlight('pdf_audit', async () => {
      const out = await getDriver().audit({ filePath, ocrLanguage, onLog: ctx && ctx.onProgress });
      delete out._fullAudit; // keep the MCP payload bounded; the summary carries the decision-relevant facts
      return out;
    });
  },

  async pdf_validate_ua(args, ctx) {
    assertAllowedKeys(args, ['file_path'], 'arguments');
    const filePath = requirePdfPath(args);
    // No Gemini key and no remote service. The CLI path is intentionally
    // fail-closed: the browser validator fetches CDN dependencies and is not an
    // honest fallback for a tool advertised in offlineToolNames.
    const result = await withPdfUaSlot(
      ctx && ctx.signal,
      ctx && ctx.onProgress,
      () => validatePdfUaLocally(filePath, ctx && ctx.onProgress, ctx && ctx.signal),
    );
    return Object.assign({
      input: filePath,
      standard: 'PDF/UA-1 (ISO 14289-1)',
      note: 'Byte-level ISO conformance of THIS file. A remediation score judges the accessible-HTML content instead — the two are complementary, never interchangeable.',
    }, result);
  },

  async pdf_remediate(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'auto_continue', 'auto_continue_rounds', 'validate_ua', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const opts = validateRemediateOptions(args);
    const outDir = resolveOutputDir(args, filePath);
    requireGeminiKey();
    return withSingleFlight('pdf_remediate', () => remediateOneFile(
      filePath,
      outDir,
      opts,
      (ctx && ctx.onProgress) || null,
      { signal: ctx && ctx.signal },
    ));
  },

  pdf_remediate_start(args) {
    assertAllowedKeys(args, ['file_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'auto_continue', 'auto_continue_rounds', 'validate_ua', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const opts = validateRemediateOptions(args);
    const outDir = resolveOutputDir(args, filePath);
    requireGeminiKey();
    const execution = storedExecution('pdf_remediate', [filePath], outDir, opts, false, null);
    const job = newJob('pdf_remediate', { file: filePath, outputDir: outDir }, execution);
    enqueueJob(job, runnerForStoredJob);
    return { jobId: job.jobId, status: job.status, note: 'Poll remediation_job_status every 30-60s; runs typically take 5-30 minutes.' };
  },

  pdf_batch_audit_start(args) {
    assertAllowedKeys(args, ['dir_path', 'output_dir', 'skip_existing', 'ocr_language'], 'arguments');
    if (args.skip_existing !== undefined && typeof args.skip_existing !== 'boolean') throw invalidParams('arguments.skip_existing must be a boolean');
    const skipExisting = args.skip_existing !== false;
    const ocrLanguage = optionalOcrLanguage(args);
    const { dir, files } = listBatchInputs(args.dir_path, BATCH_LIMIT_AUDIT, 'audit');
    const outDir = args.output_dir !== undefined ? resolveOutputDir(args, files[0]) : dir;
    requireGeminiKey();
    const auditOptions = {
      ocrLanguage,
      maxRunMinutes: Math.max(1, Number(process.env.ALLOFLOW_MCP_MAX_RUN_MINUTES) || 30),
    };
    const execution = storedExecution(
      'pdf_batch_audit', files, outDir, auditOptions, skipExisting, { dir },
    );
    const job = newJob(
      'pdf_batch_audit',
      { dir, files: files.length, outputDir: outDir },
      execution,
    );
    enqueueJob(job, runnerForStoredJob);
    return { jobId: job.jobId, status: job.status, files: files.length, note: 'Poll remediation_job_status for per-file progress; each document typically takes 1-3 minutes.' };
  },

  pdf_batch_remediate_start(args) {
    assertAllowedKeys(args, ['dir_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'auto_continue', 'auto_continue_rounds', 'validate_ua', 'skip_existing', 'ocr_language'], 'arguments');
    if (args.skip_existing !== undefined && typeof args.skip_existing !== 'boolean') throw invalidParams('arguments.skip_existing must be a boolean');
    const skipExisting = args.skip_existing !== false;
    const { dir, files: pdfs } = listBatchInputs(args.dir_path, BATCH_LIMIT_REMEDIATE, 'remediation');
    const opts = validateRemediateOptions(args);
    const outDir = args.output_dir !== undefined ? resolveOutputDir(args, pdfs[0]) : dir;
    requireGeminiKey();
    const execution = storedExecution(
      'pdf_batch_remediate', pdfs, outDir, opts, skipExisting, { dir },
    );
    const job = newJob(
      'pdf_batch_remediate',
      { dir, files: pdfs.length, outputDir: outDir },
      execution,
    );
    enqueueJob(job, runnerForStoredJob);
    return { jobId: job.jobId, status: job.status, files: pdfs.length, note: 'Poll remediation_job_status for per-file progress and an ETA; each file typically takes 5-30 minutes.' };
  },

  pdf_remediate_from_scoreboard_start(args) {
    assertAllowedKeys(args, ['scoreboard_path', 'dir_path', 'bands', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'auto_continue', 'auto_continue_rounds', 'validate_ua', 'skip_existing', 'ocr_language'], 'arguments');
    if (args.skip_existing !== undefined && typeof args.skip_existing !== 'boolean') throw invalidParams('arguments.skip_existing must be a boolean');
    const skipExisting = args.skip_existing !== false;
    const bands = validateBands(args.bands);
    const { scoreboardPath, board } = loadScoreboard(args);
    const opts = validateRemediateOptions(args);

    const rows = Array.isArray(board.files) ? board.files : [];
    if (!rows.length) throw invalidParams('That scoreboard lists no documents: ' + scoreboardPath);

    const selected = [];
    const missing = [];
    for (const row of rows) {
      if (!row || !row.file || bands.indexOf(triageBand(row)) === -1) continue;
      // The scoreboard is a record of a past run; the folder may have moved on since. A file that
      // is gone is reported by name rather than silently dropped, so the count still adds up.
      if (!fs.existsSync(row.file)) { missing.push(row.file); continue; }
      selected.push(enforceAllowedRoot(path.resolve(row.file), 'a document listed in the scoreboard'));
    }
    if (!selected.length) {
      throw invalidParams('No documents in ' + scoreboardPath + ' are in band(s) ' + bands.join(', ')
        + '. Bands present: ' + JSON.stringify(rows.reduce((acc, r) => { const b = triageBand(r); acc[b] = (acc[b] || 0) + 1; return acc; }, {}))
        + (missing.length ? '. (' + missing.length + ' matching file(s) no longer exist.)' : ''));
    }
    if (selected.length > BATCH_LIMIT_REMEDIATE) {
      throw invalidParams('That selection is ' + selected.length + ' documents; the remediation batch limit is ' + BATCH_LIMIT_REMEDIATE
        + '. Narrow `bands` (needs-work alone is the usual first pass) or split the folder.');
    }

    const outDir = args.output_dir !== undefined ? resolveOutputDir(args, selected[0]) : path.dirname(scoreboardPath);
    requireGeminiKey();
    const sourceDir = typeof board.generatedFor === 'string' && path.isAbsolute(board.generatedFor)
      ? path.resolve(board.generatedFor) : path.dirname(scoreboardPath);
    const execution = storedExecution(
      'pdf_remediate_from_scoreboard',
      selected,
      outDir,
      opts,
      skipExisting,
      {
        dir: sourceDir,
        scoreboard: scoreboardPath,
        bands: bands.slice(),
        scoredDocuments: rows.length,
        missingFromDisk: missing.slice(),
      },
    );
    const job = newJob(
      'pdf_remediate_from_scoreboard',
      { scoreboard: scoreboardPath, bands, files: selected.length, outputDir: outDir },
      execution,
    );
    enqueueJob(job, runnerForStoredJob);
    return {
      jobId: job.jobId, status: job.status, files: selected.length,
      selectedFrom: rows.length, bands, scoreboard: scoreboardPath,
      missingFromDisk: missing.length || undefined,
      note: 'Remediating ' + selected.length + ' of ' + rows.length + ' scored document(s). Poll remediation_job_status for per-file progress and an ETA.',
    };
  },

  remediation_job_status(args) {
    const job = requireJob(args);
    if (!job) return { ok: false, error: JOB_NOT_FOUND };
    return jobStatusPayload(job);
  },

  remediation_job_diagnostics(args) {
    assertAllowedKeys(args, ['job_id'], 'arguments');
    if (args && args.job_id != null && String(args.job_id).trim()) {
      const job = requireJob(args);
      if (!job) return { ok: false, error: JOB_NOT_FOUND };
      if (!job.diagnostics || !job.diagnostics.snapshot) {
        return { ok: false, jobId: job.jobId, error: 'No diagnostics were captured for this job — it may predate this server version, still be running, or have failed before the pipeline booted.' };
      }
      return { ok: true, jobId: job.jobId, source: 'job', capturedAt: job.diagnostics.capturedAt || null, fileName: job.diagnostics.fileName || null, diagnostics: job.diagnostics.snapshot };
    }
    // No job_id: the most recent run (job or synchronous tool) in THIS server session.
    // Reads the existing driver instance without booting one — a diagnostics query must
    // never cost a browser launch.
    const d = driver && typeof driver.takeLastRunDiagnostics === 'function' ? driver.takeLastRunDiagnostics() : null;
    if (!d || !d.snapshot) return { ok: false, error: 'No run has completed in this server session yet. Pass job_id for a persisted background job, or run a tool first.' };
    return { ok: true, source: 'last-run', capturedAt: d.capturedAt || null, fileName: d.fileName || null, diagnostics: d.snapshot };
  },

  remediation_job_result(args) {
    const job = requireJob(args);
    if (!job) return { ok: false, error: JOB_NOT_FOUND };
    // A cancelled batch keeps its PARTIAL scoreboard (files finished before the cancel) —
    // that result stays fetchable; only truly result-less states are refused.
    if (job.result == null) {
      return {
        ok: false, status: job.status,
        error: job.status === 'interrupted'
          ? 'Recovery stopped because the durable state was legacy, incomplete, corrupt, or incompatible. Verified partial outputs remain in ' + ((job.input && job.input.outputDir) || 'its output folder') + '; inspect the status error before explicitly re-running.'
          : 'Result is available only once the job completes. Check remediation_job_status.',
      };
    }
    return {
      ok: true, jobId: job.jobId, kind: job.kind, status: job.status,
      partial: (job.status === 'cancelled' || job.status === 'interrupted') || undefined,
      fromPreviousServerRun: job.restored || undefined,
      result: job.result,
    };
  },

  async remediation_job_cancel(args) {
    const job = requireJob(args);
    if (!job) return { ok: false, error: JOB_NOT_FOUND };
    if (TERMINAL_STATUSES.indexOf(job.status) !== -1) {
      return {
        ok: false, status: job.status,
        error: job.status === 'interrupted'
          ? 'This job is already stopped because its durable recovery state was unsafe; there is nothing left to cancel.'
          : 'Job already finished; nothing to cancel.',
      };
    }
    job.cancelRequested = true;
    // Commit the cancellation fence before killing work or acknowledging the
    // request. If this write fails, fail closed and leave the run untouched.
    try {
      persistJob(job, { required: true });
    } catch (error) {
      job.cancelRequested = false;
      return {
        ok: false,
        jobId: job.jobId,
        status: job.status,
        error: 'Cancellation was not applied because durable job state could not be written. The active run was left untouched; retry after fixing the state directory.',
      };
    }
    const wasRunning = job.status === 'running';
    if (!wasRunning) {
      job.finishedAt = new Date().toISOString();
      jobLog(job, 'cancelled before start');
      const committed = commitTerminalJob(job, 'cancelled');
      return {
        ok: true,
        jobId: job.jobId,
        status: job.status,
        wasRunning: false,
        killedRun: false,
        durabilityWarning: committed.recordCommitted ? undefined : job.durabilityWarning,
      };
    }
    // Abort the entire attempt before touching browser state. This also
    // terminates a post-export veraPDF child, where activeRun is already null.
    try { job.abortController?.abort(new Error('Remediation job cancelled')); } catch (_) {}
    let killedRun = false;
    if (driver) {
      killedRun = await driver.cancelActiveRun(); // page context closes → the run dies in seconds
      jobLog(job, 'cancel requested — active browser context ' + (killedRun ? 'closed' : 'not found'));
    }
    return { ok: true, jobId: job.jobId, status: job.status, wasRunning, killedRun };
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
      const capabilities = { tools: { listChanged: false } };
      if (BUNDLED_SKILL) {
        capabilities.resources = { subscribe: false, listChanged: false };
        capabilities.prompts = { listChanged: false };
        capabilities.extensions = { 'io.modelcontextprotocol/skills': {} };
      }
      sendResult(id, {
        protocolVersion,
        capabilities,
        serverInfo: SERVER_INFO,
        instructions: [
          "AlloFlow local document-remediation connector.",
          "Call remediation_capabilities first, follow onboarding, and inspect dataHandling before opening a document.",
          "A false fullAiPipelineReady does not disable keyless tools. offlineToolNames make no external network request; publicDependencyDownloadToolNames fetch software dependencies but do not intentionally send document content.",
          "The optional AI pipeline sends document content to Gemini under the user's key. Prefer pdf_remediate_start, poll remediation_job_status, then fetch remediation_job_result.",
          "For synchronous long runs, send _meta.progressToken for progress and notifications/cancelled to stop the request.",
          "A bundled alloflow-pdf-remediation skill supplies the safe tool sequence and honesty-reporting rules to clients that support MCP skill import.",
        ].join(' ')      });
      return;
    }
    case 'ping': sendResult(id, {}); return;
    case 'prompts/list': {
      if (!BUNDLED_SKILL) { sendError(id, -32601, 'Bundled prompts are unavailable in this installation'); return; }
      const p = params || {};
      if (typeof p !== 'object' || Array.isArray(p) || Object.keys(p).some((key) => key !== 'cursor')) { sendError(id, -32602, 'prompts/list accepts only an optional cursor'); return; }
      if (p.cursor !== undefined && typeof p.cursor !== 'string') { sendError(id, -32602, 'prompts/list cursor must be a string'); return; }
      sendResult(id, { prompts: p.cursor ? [] : [REMEDIATION_PROMPT] });
      return;
    }
    case 'prompts/get': {
      if (!BUNDLED_SKILL) { sendError(id, -32601, 'Bundled prompts are unavailable in this installation'); return; }
      if (!params || typeof params !== 'object' || Array.isArray(params) || params.name !== REMEDIATION_PROMPT_NAME || Object.keys(params).some((key) => key !== 'name' && key !== 'arguments')) { sendError(id, -32602, 'Unknown or invalid prompt name'); return; }
      const args = params.arguments || {};
      if (typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some((key) => key !== 'document' && key !== 'goal')) { sendError(id, -32602, 'Prompt arguments must contain only document and optional goal strings'); return; }
      const document = typeof args.document === 'string' ? args.document.trim() : '';
      const goal = typeof args.goal === 'string' ? args.goal.trim() : '';
      if (!document || document.length > 2000) { sendError(id, -32602, 'document is required and must be at most 2000 characters'); return; }
      if ((args.goal !== undefined && typeof args.goal !== 'string') || goal.length > 4000) { sendError(id, -32602, 'goal must be a string of at most 4000 characters'); return; }
      sendResult(id, {
        description: REMEDIATION_PROMPT.description,
        messages: [{ role: 'user', content: { type: 'text', text: remediationPromptText(document, goal) } }],
      });
      return;
    }
    case 'skills/list': {
      if (!BUNDLED_SKILL) { sendError(id, -32601, 'Bundled skills are unavailable in this installation'); return; }
      const p = params || {};
      if (typeof p !== 'object' || Array.isArray(p) || Object.keys(p).some((key) => key !== 'cursor')) { sendError(id, -32602, 'skills/list accepts only an optional cursor'); return; }
      if (p.cursor !== undefined && typeof p.cursor !== 'string') { sendError(id, -32602, 'skills/list cursor must be a string'); return; }
      sendResult(id, { skills: p.cursor ? [] : [BUNDLED_SKILL.entry] });
      return;
    }
    case 'skills/get': {
      if (!BUNDLED_SKILL) { sendError(id, -32601, 'Bundled skills are unavailable in this installation'); return; }
      if (!params || params.uri !== SKILL_URI || Object.keys(params).some((key) => key !== 'uri')) { sendError(id, -32602, 'Unknown or invalid skill URI'); return; }
      sendResult(id, { skill: BUNDLED_SKILL.entry });
      return;
    }
    case 'resources/list': {
      if (!BUNDLED_SKILL) { sendError(id, -32601, 'Bundled resources are unavailable in this installation'); return; }
      const p = params || {};
      if (typeof p !== 'object' || Array.isArray(p) || Object.keys(p).some((key) => key !== 'cursor')) { sendError(id, -32602, 'resources/list accepts only an optional cursor'); return; }
      if (p.cursor !== undefined && typeof p.cursor !== 'string') { sendError(id, -32602, 'resources/list cursor must be a string'); return; }
      sendResult(id, { resources: p.cursor ? [] : [{ uri: SKILL_URI, name: SKILL_NAME, title: 'AlloFlow PDF Remediation Skill', description: BUNDLED_SKILL.entry.frontmatter.description, mimeType: 'text/markdown' }] });
      return;
    }
    case 'resources/read': {
      if (!BUNDLED_SKILL) { sendError(id, -32601, 'Bundled resources are unavailable in this installation'); return; }
      if (!params || params.uri !== SKILL_URI || Object.keys(params).some((key) => key !== 'uri')) { sendError(id, -32602, 'Unknown or invalid resource URI'); return; }
      sendResult(id, { contents: [{ uri: SKILL_URI, mimeType: 'text/markdown', text: BUNDLED_SKILL.text }] });
      return;
    }
    case 'tools/list': sendResult(id, { tools: TOOLS }); return;
    case 'tools/call': {
      const name = params && params.name;
      const handler = TOOL_HANDLERS[name];
      if (!handler) { sendError(id, -32602, 'Unknown tool: ' + String(name)); return; }
      const key = String(id);
      const abortController = new AbortController();
      const entry = { tool: name, cancelled: false, abortController };
      IN_FLIGHT.set(key, entry);
      const ctx = {
        onProgress: makeProgressReporter(params && params._meta && params._meta.progressToken),
        signal: abortController.signal,
      };
      try {
        const output = await handler((params && params.arguments) || {}, ctx);
        // Cancelled mid-run: the spec says not to answer a cancelled request, and a
        // late success would contradict the cancel the caller already acted on.
        if (entry.cancelled) return;
        sendResult(id, { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }], structuredContent: output, isError: false });
      } catch (e) {
        if (entry.cancelled) return; // the failure IS the cancellation (closed context) — stay silent
        if (e && e.rpcCode) { sendError(id, e.rpcCode, e.message); return; }
        sendResult(id, { content: [{ type: 'text', text: 'Tool failed: ' + (e && e.message ? e.message : 'unknown error') }], isError: true });
      } finally {
        IN_FLIGHT.delete(key);
      }
      return;
    }
    default: sendError(id, -32601, 'Method not found: ' + String(method));
  }
}

// Notifications are never answered (JSON-RPC), but notifications/cancelled is the
// only way a client can stop a synchronous 5-30 minute run, so it is acted on.
// notifications/initialized and anything else stay ignored.
async function handleNotification(msg) {
  if (msg.method !== 'notifications/cancelled') return;
  const p = msg.params || {};
  if (p.requestId === undefined || p.requestId === null) return;
  const entry = IN_FLIGHT.get(String(p.requestId));
  if (!entry) return; // already answered, or never ours — nothing to stop
  entry.cancelled = true;
  // Request-scoped cancellation is always signalled first. For pdf_validate_ua
  // this removes a queued waiter or terminates only its Java process.
  try { entry.abortController.abort(p.reason); } catch (_) {}
  log('cancellation requested for request ' + String(p.requestId) + ' (' + entry.tool + ')' + (p.reason ? ': ' + String(p.reason).slice(0, 200) : ''));
  if (RUN_CANCELLABLE_TOOLS.has(entry.tool) && driver) {
    // Closing the run's browser context rejects its page.evaluate and every queued
    // Gemini bridge call with it — the same mechanism remediation_job_cancel uses.
    try {
      const killed = await driver.cancelActiveRun();
      log('cancellation: active browser context ' + (killed ? 'closed' : 'not found'));
    } catch (e) { log('cancellation: cancelActiveRun failed: ' + ((e && e.message) || e)); }
  }
}

function handleMessage(line) {
  if (!line.trim()) return;
  if (line.length > MAX_LINE_CHARS) { sendError(null, -32600, 'Message too large'); return; }
  let msg;
  try { msg = JSON.parse(line); } catch (_) { sendError(null, -32700, 'Parse error'); return; }
  if (!msg || msg.jsonrpc !== '2.0') { sendError(msg && msg.id !== undefined ? msg.id : null, -32600, 'Invalid request'); return; }
  if (msg.id === undefined || msg.id === null) return handleNotification(msg); // notification — acted on, never answered
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

restoreJobs(); // before the first request, so a client can ask about work the last process was doing
RESTORED_TO_REQUEUE.sort(
  (a, b) => Date.parse(a.createdAt || 0) - Date.parse(b.createdAt || 0),
);
for (const restoredJob of RESTORED_TO_REQUEUE.splice(0)) {
  jobLog(
    restoredJob,
    'requeued after server restart from ' + restoredJob.restoredFromStatus,
  );
  enqueueJob(restoredJob, runnerForStoredJob);
}
if (ALLOWED_ROOTS.length) log('filesystem boundary active — only: ' + ALLOWED_ROOTS.join(', '));
log('ready (stdio only; tools: ' + TOOLS.map((t) => t.name).join(', ') + ')');
