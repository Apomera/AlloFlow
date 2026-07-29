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
 *     for the others it stops the answer but cannot un-spend work already sent.
 *     No response is sent for a cancelled request, per spec.
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

const Driver = require(path.join(__dirname, 'remediation_headless_driver.cjs'));

const SERVER_INFO = { name: 'alloflow-remediation', title: 'AlloFlow PDF Remediation (local)', version: '0.1.0' };
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_LINE_CHARS = 4000000;
const MAX_PDF_BYTES = 200 * 1024 * 1024; // mirrors the app's per-file batch preflight

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
    if (now - lastSentAt < PROGRESS_MIN_INTERVAL_MS) return;
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

function getDriver() {
  if (!driver) driver = Driver.createDriver({ log });
  return driver;
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

// A job is terminal when nothing more will happen to it. `interrupted` joins the set on restore:
// a job the previous process was still running cannot be resumed (its browser context died with
// that process), but it is not a failure either, and pretending it is would misreport work that
// may well have finished writing its outputs.
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

// Persistence is best-effort by design: a read-only or full disk must degrade the connector to
// its old in-memory behaviour, never break a run that is otherwise fine.
let jobRecordsWritable = true; // flipped false the first time persistence fails, so capabilities can say so

function persistJob(job) {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    const record = {
      jobId: job.jobId, kind: job.kind, input: job.input, status: job.status,
      createdAt: job.createdAt, startedAt: job.startedAt, finishedAt: job.finishedAt,
      logLines: job.logLines, result: job.result, error: job.error,
      schema: 1,
    };
    fs.writeFileSync(jobRecordPath(job.jobId), JSON.stringify(record), 'utf8');
  } catch (e) {
    jobRecordsWritable = false;
    if (!persistJob._warned) { persistJob._warned = true; log('job records are not persisting (' + ((e && e.message) || e) + ') — status survives only while this server runs'); }
  }
}

function forgetJobRecord(jobId) { try { fs.rmSync(jobRecordPath(jobId), { force: true }); } catch (_) {} }

const JOB_RECORD_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function restoreJobs() {
  let names;
  try { names = fs.readdirSync(STATE_DIR); } catch (_) { return 0; }
  const now = Date.now();
  let restored = 0;
  let interrupted = 0;
  for (const n of names) {
    if (!/^rjob-.*\.json$/.test(n)) continue;
    const p = path.join(STATE_DIR, n);
    let rec;
    try { rec = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { try { fs.rmSync(p, { force: true }); } catch (__) {} continue; }
    if (!rec || !rec.jobId) { try { fs.rmSync(p, { force: true }); } catch (_) {} continue; }
    const age = now - Date.parse(rec.createdAt || 0);
    if (Number.isFinite(age) && age > JOB_RECORD_TTL_MS) { try { fs.rmSync(p, { force: true }); } catch (_) {} continue; }
    // Nothing is mid-flight in a process that just booted. Anything the previous one was still
    // working on is orphaned, and saying `running` would be a lie a client could poll forever.
    const wasUnfinished = rec.status === 'queued' || rec.status === 'running';
    if (wasUnfinished) { rec.status = 'interrupted'; rec.finishedAt = rec.finishedAt || new Date().toISOString(); interrupted++; }
    JOBS.set(rec.jobId, {
      jobId: rec.jobId, kind: rec.kind, input: rec.input, status: rec.status,
      createdAt: rec.createdAt, startedAt: rec.startedAt || null, finishedAt: rec.finishedAt || null,
      cancelRequested: false,
      logLines: Array.isArray(rec.logLines) ? rec.logLines : [],
      result: rec.result === undefined ? null : rec.result,
      error: rec.error || null,
      restored: true,
    });
    if (wasUnfinished) persistJob(JOBS.get(rec.jobId));
    restored++;
  }
  if (restored) log('restored ' + restored + ' job record(s) from ' + STATE_DIR + (interrupted ? ' (' + interrupted + ' marked interrupted)' : ''));
  return restored;
}

function newJob(kind, input) {
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
    status: 'queued', // queued | running | completed | failed | cancelled | interrupted (restore-only)
    createdAt: new Date().toISOString(),
    startedAt: null, finishedAt: null,
    cancelRequested: false,
    logLines: [],
    result: null, error: null,
  };
  JOBS.set(job.jobId, job);
  persistJob(job);
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
    restored: job.restored || undefined,
    interruptedNote: job.status === 'interrupted'
      ? 'This job was still running when the previous server process ended, so it cannot be resumed. Any files it had already written are on disk — check its output folder — and re-running the same batch with skip_existing (the default) will pick up where it left off without re-spending quota.'
      : undefined,
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
    if (job.cancelRequested) { job.status = 'cancelled'; job.finishedAt = new Date().toISOString(); jobLog(job, 'cancelled before start'); persistJob(job); return; }
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    // Persisted at each transition, not on every log line: a 200-file triage would otherwise do
    // thousands of writes to record telemetry that is already on stderr.
    persistJob(job);
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
      persistJob(job);
    }
  }).catch(() => {}); // the chain itself must never break
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
  return { targetScore, fixPasses, polishPasses, taggedPdf: args.tagged_pdf !== false, autoContinue: args.auto_continue === true, autoContinueRounds, validateUa: args.validate_ua === true, ocrLanguage: optionalOcrLanguage(args) };
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

// The remediate-every-file loop, shared by the folder batch and the scoreboard selection so the
// two cannot drift on resumability, per-file failure handling, cancellation, or progress.
async function runRemediateBatch(j, { files, dir, outDir, opts, skipExisting }) {
  const perFile = [];
  for (let i = 0; i < files.length; i++) {
    if (j.cancelRequested) { jobLog(j, 'batch cancelled at file ' + (i + 1) + '/' + files.length); break; }
    const f = files[i];
    // Resumability (default ON): a file whose report already sits in outDir was finished by a
    // previous run — skip it instead of re-spending its quota. skip_existing: false forces
    // re-remediation (fresh outputs get collision-suffixed names, nothing overwrites).
    if (skipExisting) {
      const stem = path.basename(f).replace(/\.(pdf|docx|pptx)$/i, '');
      if (fs.existsSync(path.join(outDir, stem + '-remediation-report.json'))) {
        perFile.push({ file: f, ok: true, skipped: 'report-exists' });
        noteBatchProgress(j, { done: i + 1, total: files.length });
        jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(f) + ' SKIPPED (report exists — resumed batch)');
        continue;
      }
    }
    jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(f));
    const startedAt = Date.now();
    try {
      // Per-file validation (size/header) at run time — one bad file must not sink the batch.
      requireDocPath({ file_path: f });
      const summary = await remediateOneFile(f, outDir, opts, (line) => jobLog(j, line));
      perFile.push({ file: f, ok: true, verdict: summary.verdict, afterScore: summary.afterScore, aiVerificationIncomplete: summary.aiVerificationIncomplete, files: summary.files });
    } catch (e) {
      perFile.push({ file: f, ok: false, error: (e && e.message) || String(e) });
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
function auditRow(filePath, out) {
  return {
    file: filePath, ok: true,
    score: out && out.score,
    issueCounts: (out && out.issueCounts) || {},
    pageCount: (out && out.pageCount) != null ? out.pageCount : null,
    isScanned: !!(out && out.isScanned),
    hasSearchableText: !!(out && out.hasSearchableText),
    documentLanguage: (out && out.documentLanguage) || null,
    summary: String((out && out.summary) || '').slice(0, 300),
  };
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
  // validate_ua: independent ISO 14289-1 check of the just-written tagged bytes (keyless,
  // ~1 min incl. JVM boot). Parity with the app's auto-veraPDF; verdict rides the report.
  let pdfUa;
  if (opts.validateUa && files.taggedPdf) {
    try {
      const v = await getDriver().validatePdfUa({ filePath: files.taggedPdf, onLog });
      pdfUa = { standard: 'PDF/UA-1 (ISO 14289-1)', compliant: !!(v && v.compliant), failedChecks: (v && v.failedChecks) || 0, failedRules: ((v && v.failedRules) || []).slice(0, 100) };
    } catch (e) { pdfUa = { error: (e && e.message) || String(e) }; }
  } else if (opts.validateUa) {
    pdfUa = { skipped: out.taggedPdfB64 ? 'tagged PDF not written' : 'no tagged PDF (office input or tagged_pdf: false)' };
  }
  const summary = {
    input: filePath,
    files,
    pdfUa,
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
    autoContinue: out.autoContinue,
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
    name: 'remediation_selftest',
    title: 'Prove this install can actually remediate',
    description: 'Run the REAL remediation pipeline end-to-end in headless Chromium against a scripted local model and a generated one-page PDF, then report which stage worked. Needs NO Gemini key and spends NO quota (nothing leaves the machine; the scripted model is a loopback server), writes no files you keep. Takes roughly 20-60s. Use this when remediation_capabilities says ready but real runs fail, after installing or updating the connector, or to tell a broken install apart from an API-key/quota problem: a failure here names the stage (assets / browser / module-boot / ownership-gate / audit-contract) and is never about your key.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'Prove this install can actually remediate', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
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
    annotations: { title: 'Repair colour contrast', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
    annotations: { title: 'Generate the AlloFlow conformance report', readOnlyHint: false, destructiveHint: false, openWorldHint: true },
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
    description: 'Convert the blanks you accepted from detect_form_fields into real, labelled form inputs in the HTML. Deterministic, no API key. Pass the ids you want applied; anything you omit is left as-is, so a reviewer stays in control of which blanks become fields.',
    inputSchema: {
      type: 'object', required: ['file_path', 'accepted'],
      properties: {
        file_path: { type: 'string', description: 'Absolute path to a local .html file' },
        accepted: { type: 'array', items: {}, description: 'The accepted entries from detect_form_fields (or their ids)' },
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
    annotations: { title: 'Audit with two engines', readOnlyHint: true, destructiveHint: false, openWorldHint: true },
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
    annotations: { title: 'Check structure and extract plain text', readOnlyHint: true, destructiveHint: false, openWorldHint: true },
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
      auto_continue: { type: 'boolean', description: "Run the app's auto-continue improvement loop after the primary pass: extra fix rounds merged through the same canonical reducer the app uses, until the target score + complete verification or the rounds are spent (default false; adds time and Gemini quota)" },
      auto_continue_rounds: { type: 'number', minimum: 1, maximum: 5, description: 'Max auto-continue rounds (default 3)' },
      validate_ua: { type: 'boolean', description: 'Also run the independent keyless PDF/UA-1 (ISO 14289-1) veraPDF check on the tagged output and include its verdict in the report (default false; ~1 min extra)' },
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
          properties: Object.assign({
            dir_path: { type: 'string', description: 'Folder containing .pdf/.docx/.pptx files (searched non-recursively)' },
            skip_existing: { type: 'boolean', description: 'Skip files whose -remediation-report.json already exists in the output folder — makes an interrupted batch resumable without re-spending quota (default true)' },
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
            ocr_language: { type: 'string', description: "Tesseract language code for scanned pages (e.g. 'spa'); omit for auto-detect", maxLength: 20 },
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
            skip_existing: { type: 'boolean', description: 'Skip documents whose -remediation-report.json already exists in the output folder (default true)' },
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
        name: 'remediation_job_cancel',
        title: 'Cancel a remediation job',
        description: 'Cancel a queued job (it never starts) or the running one (its browser context closes and in-flight AI calls die within seconds). Output files already written stay on disk.',
        inputSchema: JOB_ID_SCHEMA,
        annotations: { title: 'Cancel a remediation job', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      },
    ];
  })(),
].flat();

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
const S_NUM = { type: 'number' };
const S_STR = { type: 'string' };
const S_BOOL = { type: 'boolean' };
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
  verdict: { type: ['string', 'null'], description: 'Distribution verdict from the honesty-gated verification' },
  beforeScore: { type: ['number', 'null'] }, afterScore: { type: ['number', 'null'] },
  aiVerificationIncomplete: { type: ['boolean', 'null'], description: 'True when the AI semantic audit degraded — the headline is then the deterministic score' },
  scoreSource: { type: ['string', 'null'] }, estimatedMinimumScore: { type: ['number', 'null'] },
  integrityCoverage: {}, integrityWarning: {}, fidelityNotes: {}, verificationState: {},
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
  resultAvailable: S_BOOL, restored: S_BOOL, interruptedNote: S_STR,
  partial: S_BOOL, fromPreviousServerRun: S_BOOL, result: {},
});

const OUTPUT_SCHEMAS = {
  remediation_capabilities: obj({
    ready: { type: 'boolean', description: 'Parts are present. Presence is not function — see readyMeans and remediation_selftest.' },
    readyMeans: S_STR,
    geminiKeyPresent: S_BOOL, geminiKeySource: S_STR,
    playwrightAvailable: S_BOOL, chromiumInstalled: S_BOOL, setupHint: S_STR,
    pipelineModulesPresent: obj({}), model: S_STR, fallbackModel: S_STR,
    maxRunMinutes: S_NUM, maxPdfMB: S_NUM, singleFlight: S_BOOL, busy: {},
    jobs: obj({ stored: S_NUM, unfinished: S_NUM, interrupted: S_NUM, stateDir: S_STR, durable: S_BOOL, retentionDays: S_NUM }),
    allowedRoots: { type: ['array', 'null'], items: S_STR, description: 'null means unrestricted' },
    networkEgress: { type: 'array', items: S_STR },
  }, ['ready']),
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
    compliant: S_BOOL, failedChecks: S_NUM, failedRules: { type: 'array' }, note: S_STR,
  }, ['compliant']),
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
  remediation_job_cancel: obj({ ok: S_BOOL, error: S_STR, jobId: S_STR, status: S_STR, wasRunning: S_BOOL, killedRun: S_BOOL }),
};

for (const t of TOOLS) {
  if (OUTPUT_SCHEMAS[t.name]) t.outputSchema = OUTPUT_SCHEMAS[t.name];
  else throw new Error('Tool ' + t.name + ' has no outputSchema — every tool here returns structuredContent, so add one.');
}

const TOOL_HANDLERS = {
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
    return {
      geminiKeyPresent: !!keyInfo.key,
      geminiKeySource: keyInfo.source, // label only ('env:…'/'file:…'/'none') — never the value
      playwrightAvailable,
      chromiumInstalled: chrome.installed,
      setupHint: (!chrome.installed && playwrightAvailable) ? 'The Chromium browser binary is not installed yet — call remediation_setup once (a ~200MB one-time download) and this environment becomes ready.' : undefined,
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
        interrupted: Array.from(JOBS.values()).filter((j) => j.status === 'interrupted').length,
        stateDir: STATE_DIR,
        durable: jobRecordsWritable,
        retentionDays: Math.round(JOB_RECORD_TTL_MS / 86400000),
      },
      // Absent means unrestricted, which is the honest word for it: the connector can read and
      // write wherever this user can. Set ALLOFLOW_MCP_ALLOWED_ROOTS to make that a boundary.
      allowedRoots: ALLOWED_ROOTS.length ? ALLOWED_ROOTS : null,
      networkEgress: ['generativelanguage.googleapis.com (document content)', 'public CDNs (pdf.js, Tesseract, pdf-lib, axe)'],
      ready: !!keyInfo.key && playwrightAvailable && chrome.installed && Object.values(modules).every(Boolean),
      // `ready` is a PRESENCE check, and presence is not function. It reported true for an install
      // where every run died at the pipeline's ownership gate (2026-07-28). Say so, rather than
      // letting one word imply more than it verifies.
      readyMeans: 'The parts are present (key, Playwright, Chromium, pipeline modules). It does NOT prove a run succeeds — run remediation_selftest for that, which needs no key and no quota.',
    };
  },

  async remediation_selftest(args, ctx) {
    assertAllowedKeys(args, [], 'arguments');
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
    if (!Array.isArray(args.accepted)) throw invalidParams('arguments.accepted must be an array');
    const dest = _htmlOutputPath(args, htmlPath, '-fillable.html');
    const out = await withSingleFlight('apply_form_fields', () => getDriver().applyFormFields({
      html: fs.readFileSync(htmlPath, 'utf8'), accepted: args.accepted, onLog: ctx && ctx.onProgress,
    }));
    fs.writeFileSync(dest, out.html, 'utf8');
    return { input: htmlPath, output: dest, applied: args.accepted.length, bytes: Buffer.byteLength(out.html) };
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
    // No Gemini key, no pipeline globals, its own browser context — deliberately OUTSIDE the
    // single-flight lane so a 30-minute remediation doesn't block a 60-second validation.
    const result = await getDriver().validatePdfUa({ filePath, onLog: ctx && ctx.onProgress });
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

  async pdf_remediate(args, ctx) {
    assertAllowedKeys(args, ['file_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'auto_continue', 'auto_continue_rounds', 'validate_ua', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const opts = validateRemediateOptions(args);
    const outDir = resolveOutputDir(args, filePath);
    requireGeminiKey();
    return withSingleFlight('pdf_remediate', () => remediateOneFile(filePath, outDir, opts, (ctx && ctx.onProgress) || null));
  },

  pdf_remediate_start(args) {
    assertAllowedKeys(args, ['file_path', 'output_dir', 'target_score', 'fix_passes', 'polish_passes', 'tagged_pdf', 'auto_continue', 'auto_continue_rounds', 'validate_ua', 'ocr_language'], 'arguments');
    const filePath = requireDocPath(args);
    const opts = validateRemediateOptions(args);
    const outDir = resolveOutputDir(args, filePath);
    requireGeminiKey();
    const job = newJob('pdf_remediate', { file: filePath, outputDir: outDir });
    enqueueJob(job, (j) => remediateOneFile(filePath, outDir, opts, (line) => jobLog(j, line)));
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
    const job = newJob('pdf_batch_audit', { dir, files: files.length, outputDir: outDir });
    enqueueJob(job, async (j) => {
      // Prior rows are READ once at job start, then carried into the new scoreboard, so a resumed
      // triage produces a complete picture rather than a scoreboard with holes where the skips were.
      const prior = skipExisting ? readPriorScoreboards(outDir) : new Map();
      const rows = [];
      let audited = 0;
      let skipped = 0;
      for (let i = 0; i < files.length; i++) {
        if (j.cancelRequested) { jobLog(j, 'triage cancelled at file ' + (i + 1) + '/' + files.length); break; }
        const f = files[i];
        if (prior.has(f)) {
          rows.push(Object.assign({}, prior.get(f), { resumedFromPriorRun: true }));
          skipped++;
          noteBatchProgress(j, { done: i + 1, total: files.length });
          jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(f) + ' SKIPPED (already in a scoreboard)');
          continue;
        }
        jobLog(j, 'file ' + (i + 1) + '/' + files.length + ': ' + path.basename(f));
        const startedAt = Date.now();
        try {
          requireDocPath({ file_path: f }); // per-file size/header validation — one bad file must not sink the triage
          const out = await getDriver().audit({ filePath: f, ocrLanguage, onLog: (line) => jobLog(j, line) });
          const row = auditRow(f, out);
          rows.push(row);
          audited++;
          jobLog(j, '  → ' + triageBand(row) + ' (score ' + row.score + ')');
        } catch (e) {
          rows.push({ file: f, ok: false, error: ((e && e.message) || String(e)).slice(0, 300) });
          jobLog(j, '  → FAILED (continuing): ' + ((e && e.message) || e));
        }
        // Counted whether it succeeded or failed: a file that took four minutes to fail still
        // tells you what the next one might cost.
        noteBatchProgress(j, { done: i + 1, total: files.length, processedMs: Date.now() - startedAt });
      }
      // Written even for a cancelled run: a partial triage is still useful, and throwing away the
      // quota already spent because the user stopped early would be the wrong trade.
      const written = writeScoreboard(outDir, dir, rows);
      jobLog(j, 'scoreboard: ' + written.scoreboardJson);
      return {
        dir, outputDir: outDir,
        requested: files.length, audited, skipped,
        failed: rows.filter((r) => !r.ok).length,
        cancelled: j.cancelRequested || undefined,
        bands: written.bands,
        medianScore: written.medianScore,
        scoreboardJson: written.scoreboardJson,
        scoreboardCsv: written.scoreboardCsv,
        files: rows,
        note: 'Bands name the next action, not a grade. Scores judge the SOURCE documents; remediate the needs-work band first, and OCR anything in scanned before trusting its score.',
      };
    });
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
    const job = newJob('pdf_batch_remediate', { dir, files: pdfs.length, outputDir: outDir });
    enqueueJob(job, (j) => runRemediateBatch(j, { files: pdfs, dir, outDir, opts, skipExisting }));
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
    const job = newJob('pdf_remediate_from_scoreboard', { scoreboard: scoreboardPath, bands, files: selected.length, outputDir: outDir });
    enqueueJob(job, async (j) => {
      jobLog(j, 'remediating ' + selected.length + ' of ' + rows.length + ' scored document(s) in band(s): ' + bands.join(', '));
      if (missing.length) jobLog(j, missing.length + ' scored file(s) no longer exist and were left out');
      const out = await runRemediateBatch(j, { files: selected, dir: board.generatedFor || path.dirname(scoreboardPath), outDir, opts, skipExisting });
      return Object.assign(out, {
        scoreboard: scoreboardPath, bands,
        scoredDocuments: rows.length,
        selected: selected.length,
        missingFromDisk: missing.length ? missing : undefined,
      });
    });
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

  remediation_job_result(args) {
    const job = requireJob(args);
    if (!job) return { ok: false, error: JOB_NOT_FOUND };
    // A cancelled batch keeps its PARTIAL scoreboard (files finished before the cancel) —
    // that result stays fetchable; only truly result-less states are refused.
    if (job.result == null) {
      return {
        ok: false, status: job.status,
        error: job.status === 'interrupted'
          ? 'This job was still running when the previous server process ended, so it never produced a result. Its partial outputs are on disk in ' + ((job.input && job.input.outputDir) || 'its output folder') + '; re-run the same batch with skip_existing (the default) to finish it without re-spending quota.'
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
          ? 'This job ended with the server process that was running it; there is nothing left to cancel.'
          : 'Job already finished; nothing to cancel.',
      };
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
        instructions: 'AlloFlow PDF remediation connector. Call `remediation_capabilities` first to confirm the environment is ready. `pdf_audit` scores a local PDF (1-3 min). For remediation PREFER the job flow: `pdf_remediate_start` (or `pdf_batch_remediate_start` for a folder) returns a job_id immediately; poll `remediation_job_status` every 30-60s and fetch `remediation_job_result` when completed — full runs take 5-30 minutes, longer than most tool timeouts, which is why the synchronous `pdf_remediate` exists only for small documents. When you do call a synchronous tool, send `_meta.progressToken` to receive live pipeline telemetry as progress notifications, and `notifications/cancelled` to abort the run. Runs send document content to the Gemini API; work is single-flight (jobs queue FIFO).'
      });
      return;
    }
    case 'ping': sendResult(id, {}); return;
    case 'tools/list': sendResult(id, { tools: TOOLS }); return;
    case 'tools/call': {
      const name = params && params.name;
      const handler = TOOL_HANDLERS[name];
      if (!handler) { sendError(id, -32602, 'Unknown tool: ' + String(name)); return; }
      const key = String(id);
      const entry = { tool: name, cancelled: false };
      IN_FLIGHT.set(key, entry);
      const ctx = { onProgress: makeProgressReporter(params && params._meta && params._meta.progressToken) };
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
if (ALLOWED_ROOTS.length) log('filesystem boundary active — only: ' + ALLOWED_ROOTS.join(', '));
log('ready (stdio only; tools: ' + TOOLS.map((t) => t.name).join(', ') + ')');
