#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const SERVICE_NAME = 'alloflow-remediation-runner';
const SERVICE_VERSION = '0.2.0';
const RUN_SCHEMA = 1;
const DEFAULT_PORT = 8080;
const DEFAULT_MAX_INPUT_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_RESULT_BYTES = 64 * 1024 * 1024;
const MAX_JSON_BYTES = 32 * 1024;
const MAX_REPORT_BYTES = 1024 * 1024;
const MAX_RUN_MINUTES = 25;
const STORAGE_TIMEOUT_MS = 2 * 60 * 1000;
const JOB_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const SUPPORTED_OCR_LANGUAGE_BASES = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ru', 'uk', 'pl',
  'tr', 'sv', 'da', 'nb', 'no', 'fi', 'cs', 'sk', 'ro', 'hu', 'el', 'bg',
  'hr', 'sr', 'he', 'ar', 'fa', 'ps', 'ur', 'hi', 'bn', 'pa', 'gu', 'ta',
  'te', 'kn', 'ml', 'th', 'lo', 'km', 'my', 'vi', 'id', 'ms', 'tl', 'ja',
  'ko', 'am', 'ti', 'sw', 'so', 'ht', 'zh',
]);
const OCR_LANGUAGE_TAG_RE = /^[a-z]{2}(?:-[a-z]{2,4})?$/;

function isSupportedOcrLanguage(value) {
  if (value === '') return true;
  if (
    typeof value !== 'string' ||
    value.length > 12 ||
    !OCR_LANGUAGE_TAG_RE.test(value)
  ) return false;
  return SUPPORTED_OCR_LANGUAGE_BASES.has(value.slice(0, 2));
}

class RunnerError extends Error {
  constructor(code, status, retryable = false) {
    super(code);
    this.name = 'RunnerError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

class CancelledError extends RunnerError {
  constructor() {
    super('job_cancelled', 409, false);
    this.name = 'CancelledError';
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, i) => key === wanted[i]);
}

function integerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function validateJobId(value) {
  if (typeof value !== 'string' || !JOB_ID_RE.test(value)) {
    throw new RunnerError('invalid_job_id', 400);
  }
  return value;
}

function normalizeInternalUrl(value, allowedHosts) {
  if (typeof value !== 'string' || value.length > 2048) {
    throw new RunnerError('invalid_storage_url', 400);
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new RunnerError('invalid_storage_url', 400);
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== 'http:' ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !allowedHosts.has(hostname) ||
    !url.pathname.startsWith('/') ||
    url.pathname.startsWith('//')
  ) {
    throw new RunnerError('invalid_storage_url', 400);
  }

  return url.toString();
}

function validateRunPayload(value, allowedHosts) {
  if (!hasExactKeys(value, ['schema', 'jobId', 'input', 'output', 'options'])) {
    throw new RunnerError('invalid_run_request', 400);
  }
  if (value.schema !== RUN_SCHEMA) throw new RunnerError('unsupported_schema', 400);
  if (!hasExactKeys(value.input, ['url', 'contentType'])) {
    throw new RunnerError('invalid_input', 400);
  }
  if (!hasExactKeys(value.output, ['taggedPdfUrl', 'reportUrl'])) {
    throw new RunnerError('invalid_output', 400);
  }
  if (
    !hasExactKeys(value.options, [
      'targetScore',
      'fixPasses',
      'effortProfile',
      'ocrLanguage',
      'polishPasses',
      'taggedPdf',
      'autoContinue',
      'autoContinueRounds',
      'validateUa',
      'maxRunMinutes',
    ])
  ) {
    throw new RunnerError('invalid_options', 400);
  }

  if (value.input.contentType !== 'application/pdf') {
    throw new RunnerError('unsupported_input_type', 415);
  }
  const standardEffort =
    value.options.effortProfile === 'standard' &&
    value.options.polishPasses === 0 &&
    value.options.autoContinue === false &&
    value.options.autoContinueRounds === 0;
  const thoroughEffort =
    value.options.effortProfile === 'thorough' &&
    value.options.polishPasses === 1 &&
    value.options.autoContinue === true &&
    value.options.autoContinueRounds === 2;
  if (
    !integerInRange(value.options.targetScore, 80, 100) ||
    !integerInRange(value.options.fixPasses, 1, 3) ||
    !isSupportedOcrLanguage(value.options.ocrLanguage) ||
    (!standardEffort && !thoroughEffort) ||
    value.options.taggedPdf !== true ||
    value.options.validateUa !== false ||
    !integerInRange(value.options.maxRunMinutes, 1, MAX_RUN_MINUTES)
  ) {
    throw new RunnerError('unsupported_options', 400);
  }

  const inputUrl = normalizeInternalUrl(value.input.url, allowedHosts);
  const taggedPdfUrl = normalizeInternalUrl(value.output.taggedPdfUrl, allowedHosts);
  const reportUrl = normalizeInternalUrl(value.output.reportUrl, allowedHosts);
  if (taggedPdfUrl === reportUrl) throw new RunnerError('duplicate_output_url', 400);

  return {
    schema: RUN_SCHEMA,
    jobId: validateJobId(value.jobId),
    input: {
      url: inputUrl,
      contentType: 'application/pdf',
    },
    output: {
      taggedPdfUrl,
      reportUrl,
    },
    options: {
      targetScore: value.options.targetScore,
      fixPasses: value.options.fixPasses,
      effortProfile: value.options.effortProfile,
      ocrLanguage: value.options.ocrLanguage,
      polishPasses: value.options.polishPasses,
      taggedPdf: true,
      autoContinue: value.options.autoContinue,
      autoContinueRounds: value.options.autoContinueRounds,
      validateUa: false,
      maxRunMinutes: value.options.maxRunMinutes,
    },
  };
}

function requestDigest(spec) {
  return crypto.createHash('sha256').update(JSON.stringify(spec)).digest('hex');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function contentTypeOnly(value) {
  return String(value || '').split(';', 1)[0].trim().toLowerCase();
}

function jsonHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  };
}

function sendJson(res, status, value, headers = {}) {
  if (res.destroyed || res.writableEnded) return;
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    ...jsonHeaders(headers),
    'Content-Length': body.length,
  });
  res.end(body);
}

function errorBody(error) {
  const known = error instanceof RunnerError;
  return {
    schema: RUN_SCHEMA,
    status: 'error',
    error: {
      code: known ? error.code : 'internal_error',
      retryable: known ? error.retryable : false,
    },
  };
}

function sendError(res, error) {
  const known = error instanceof RunnerError;
  const status = known ? error.status : 500;
  const headers = status === 401
    ? { 'WWW-Authenticate': 'Bearer realm="alloflow-runner"' }
    : {};
  sendJson(res, status, errorBody(error), headers);
}

async function readJsonBody(req) {
  if (contentTypeOnly(req.headers['content-type']) !== 'application/json') {
    throw new RunnerError('unsupported_content_type', 415);
  }
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new RunnerError('unsupported_content_encoding', 415);
  }

  const declared = req.headers['content-length'];
  if (declared !== undefined) {
    if (!/^\d+$/.test(declared)) throw new RunnerError('invalid_content_length', 400);
    if (Number(declared) > MAX_JSON_BYTES) throw new RunnerError('request_too_large', 413);
  }

  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_JSON_BYTES) throw new RunnerError('request_too_large', 413);
    chunks.push(buffer);
  }
  if (bytes === 0) throw new RunnerError('empty_request', 400);

  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'));
  } catch {
    throw new RunnerError('invalid_json', 400);
  }
  return parsed;
}

function bearerMatches(req, expectedToken) {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const received = Buffer.from(header.slice(7), 'utf8');
  const expected = Buffer.from(expectedToken, 'utf8');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function parseAllowedHosts(value) {
  const hosts = new Set(
    String(value || 'r2.internal')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!hosts.size) throw new RunnerError('storage_hosts_not_configured', 500);
  for (const host of hosts) {
    if (!/^[a-z0-9.-]+$/.test(host) || host.startsWith('.') || host.endsWith('.')) {
      throw new RunnerError('invalid_storage_host_configuration', 500);
    }
  }
  return hosts;
}

function createStateStore(root) {
  const resolvedRoot = path.resolve(root);

  function pathsFor(jobId) {
    validateJobId(jobId);
    const dir = path.join(resolvedRoot, jobId);
    if (path.dirname(dir) !== resolvedRoot) throw new RunnerError('invalid_job_id', 400);
    return {
      dir,
      state: path.join(dir, 'state.json'),
      input: path.join(dir, 'input.pdf'),
      taggedPdf: path.join(dir, 'tagged.pdf'),
      report: path.join(dir, 'report.json'),
    };
  }

  async function read(jobId) {
    const files = pathsFor(jobId);
    try {
      const parsed = JSON.parse(await fsp.readFile(files.state, 'utf8'));
      return isPlainObject(parsed) ? parsed : null;
    } catch (error) {
      if (error && error.code === 'ENOENT') return null;
      throw new RunnerError('state_read_failed', 500, true);
    }
  }

  async function write(jobId, value) {
    const files = pathsFor(jobId);
    await fsp.mkdir(files.dir, { recursive: true, mode: 0o700 });
    const temp = path.join(files.dir, `.state-${process.pid}-${crypto.randomUUID()}.tmp`);
    await fsp.writeFile(temp, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 });
    try {
      await fsp.rename(temp, files.state);
    } catch (error) {
      if (error && (error.code === 'EEXIST' || error.code === 'EPERM')) {
        await fsp.rm(files.state, { force: true });
        await fsp.rename(temp, files.state);
      } else {
        await fsp.rm(temp, { force: true }).catch(() => {});
        throw error;
      }
    }
  }

  return { pathsFor, read, write };
}

function throwIfCancelled(signal) {
  if (signal.aborted) throw new CancelledError();
}

async function fetchWithTimeout(fetchImpl, url, init, timeoutMs, parentSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener('abort', abort, { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch {
    if (parentSignal && parentSignal.aborted) throw new CancelledError();
    throw new RunnerError('storage_request_failed', 502, true);
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abort);
  }
}

async function downloadPdf(fetchImpl, url, destination, maxBytes, signal) {
  throwIfCancelled(signal);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/pdf',
        'Cache-Control': 'no-store',
      },
      redirect: 'error',
    },
    STORAGE_TIMEOUT_MS,
    signal,
  );

  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new RunnerError('input_fetch_failed', 502, response.status >= 500);
  }
  if (contentTypeOnly(response.headers.get('content-type')) !== 'application/pdf') {
    await response.body?.cancel().catch(() => {});
    throw new RunnerError('input_type_mismatch', 422);
  }
  const encoding = response.headers.get('content-encoding');
  if (encoding && encoding !== 'identity') {
    await response.body?.cancel().catch(() => {});
    throw new RunnerError('input_encoding_unsupported', 422);
  }
  const declaredText = response.headers.get('content-length');
  let declared = null;
  if (declaredText !== null) {
    if (!/^\d+$/.test(declaredText)) throw new RunnerError('input_length_invalid', 422);
    declared = Number(declaredText);
    if (declared > maxBytes) {
      await response.body?.cancel().catch(() => {});
      throw new RunnerError('input_too_large', 413);
    }
  }
  if (!response.body) throw new RunnerError('input_body_missing', 422);

  const temp = `${destination}.${crypto.randomUUID()}.tmp`;
  await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  const handle = await fsp.open(temp, 'wx', 0o600);
  const hash = crypto.createHash('sha256');
  const prefixParts = [];
  let prefixBytes = 0;
  let size = 0;
  try {
    for await (const chunk of response.body) {
      throwIfCancelled(signal);
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) throw new RunnerError('input_too_large', 413);
      if (prefixBytes < 5) {
        const part = buffer.subarray(0, 5 - prefixBytes);
        prefixParts.push(part);
        prefixBytes += part.length;
      }
      hash.update(buffer);
      await handle.write(buffer);
    }
    if (declared !== null && size !== declared) {
      throw new RunnerError('input_length_mismatch', 422);
    }
    const prefix = Buffer.concat(prefixParts, prefixBytes);
    if (prefix.length < 5 || prefix.toString('ascii') !== '%PDF-') {
      throw new RunnerError('input_not_pdf', 422);
    }
  } catch (error) {
    await handle.close().catch(() => {});
    await fsp.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
  await handle.close();
  await fsp.rm(destination, { force: true });
  await fsp.rename(temp, destination);
  return { size, sha256: hash.digest('hex') };
}

async function writeBufferAtomic(destination, buffer) {
  const temp = `${destination}.${crypto.randomUUID()}.tmp`;
  await fsp.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  await fsp.writeFile(temp, buffer, { mode: 0o600 });
  await fsp.rm(destination, { force: true });
  await fsp.rename(temp, destination);
}

async function putArtifact(fetchImpl, url, filePath, contentType, metadata, signal) {
  throwIfCancelled(signal);
  const stat = await fsp.stat(filePath);
  const body = fs.createReadStream(filePath);
  let response;
  try {
    response = await fetchWithTimeout(
      fetchImpl,
      url,
      {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(stat.size),
          'Cache-Control': 'no-store',
          'X-AlloFlow-Job-Id': metadata.jobId,
          'X-AlloFlow-SHA256': metadata.sha256,
        },
        body,
        duplex: 'half',
        redirect: 'error',
      },
      STORAGE_TIMEOUT_MS,
      signal,
    );
  } catch (error) {
    body.destroy();
    throw error;
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new RunnerError('artifact_upload_failed', 502, response.status >= 500);
  }
  await response.body?.cancel().catch(() => {});
}

function safeOptionalNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function autoContinueRoundsRun(spec, result) {
  if (spec.options.autoContinueRounds === 0) return 0;
  const value = result && result.autoContinue && result.autoContinue.roundsRun;
  if (!integerInRange(value, 0, spec.options.autoContinueRounds)) {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  return value;
}

const VERIFICATION_STATES = new Set([
  'complete',
  'complete-for-tested-scope',
  'review-required',
  'partial',
  'unavailable',
]);

function nullableFindingCount(value) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  return value;
}

function remediationAuditCoverage(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  const configuredAuditorCap = value.configuredAuditorCap;
  const requestedAuditors = value.requestedAuditors;
  const completedAuditors = value.completedAuditors;
  if (
    configuredAuditorCap !== 5 ||
    !Number.isSafeInteger(requestedAuditors) ||
    requestedAuditors < 3 ||
    requestedAuditors > configuredAuditorCap ||
    !Number.isSafeInteger(completedAuditors) ||
    completedAuditors < requestedAuditors ||
    completedAuditors > configuredAuditorCap ||
    value.sliced !== false
  ) {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  return {
    configuredAuditorCap,
    requestedAuditors,
    completedAuditors,
    sliced: false,
  };
}

function remediationQuality(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  if (result.activeContentScanVerified !== true) {
    throw new RunnerError('active_content_scan_unavailable', 422, false);
  }
  if (result.activeContentDetected === true) {
    throw new RunnerError('active_content_requires_review', 422, false);
  }
  if (result.activeContentDetected !== false) {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  const level = result.verdict && result.verdict.level;
  if (level === 'review') {
    throw new RunnerError('distribution_review_required', 422, false);
  }
  if (level !== 'ready' && level !== 'caution') {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  const delivery = result.taggedPdfDelivery;
  if (!delivery || delivery.ok !== true || delivery.code !== 'verified') {
    throw new RunnerError('tagged_pdf_verification_failed', 422, false);
  }
  if (result.verificationHtmlBound !== true) {
    throw new RunnerError('verification_binding_failed', 422, false);
  }
  if (!VERIFICATION_STATES.has(result.verificationState)) {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  if (result.taggedPdfExportMode !== 'original_layout') {
    throw new RunnerError('driver_result_invalid', 500, false);
  }
  return {
    activeContentScanVerified: true,
    activeContentDetected: false,
    distributionLevel: level,
    verificationState: result.verificationState,
    verificationHtmlBound: true,
    taggedPdfDelivery: 'verified',
    taggedPdfExportMode: result.taggedPdfExportMode,
    remainingAxeViolations: nullableFindingCount(
      result.remainingAxeViolations,
    ),
    remainingEqualAccessFailures: nullableFindingCount(
      result.remainingEqualAccessFailures,
    ),
    auditCoverage: remediationAuditCoverage(result.auditCoverage),
  };
}

function normalizePdfUaValidation(value) {
  const fallback = {
    status: 'not_run',
    reason: 'independent_validator_not_packaged',
  };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const count = (candidate) => (
    Number.isSafeInteger(candidate) && candidate >= 0 && candidate <= 1_000_000
      ? candidate
      : 0
  );
  if (value.status === 'compliant' || value.status === 'noncompliant') {
    if (value.validator !== 'veraPDF' || value.profile !== 'ua1') {
      throw new RunnerError('driver_result_invalid', 500, false);
    }
    return {
      status: value.status,
      validator: 'veraPDF',
      profile: 'ua1',
      validatorVersion: typeof value.validatorVersion === 'string' && value.validatorVersion.length <= 32
        ? value.validatorVersion
        : null,
      failedRules: count(value.failedRules),
      failedChecks: count(value.failedChecks),
      passedRules: count(value.passedRules),
      passedChecks: count(value.passedChecks),
    };
  }
  if (value.status === 'unavailable') {
    const reason = ['validator_not_available', 'validator_timeout', 'validator_error'].includes(value.reason)
      ? value.reason
      : 'validator_error';
    return { status: 'unavailable', reason };
  }
  if (
    value.status === 'not_run' &&
    ['disabled_for_institution_pilot', 'independent_validator_not_packaged'].includes(value.reason)
  ) {
    return { status: 'not_run', reason: value.reason };
  }
  throw new RunnerError('driver_result_invalid', 500, false);
}

function buildReport(spec, inputMetadata, result, taggedMetadata, quality, pdfUaValidation) {
  const roundsRun = autoContinueRoundsRun(spec, result);
  return {
    schema: RUN_SCHEMA,
    jobId: spec.jobId,
    status: 'succeeded',
    input: {
      contentType: 'application/pdf',
      size: inputMetadata.size,
    },
    options: spec.options,
    summary: {
      beforeScore: safeOptionalNumber(result.beforeScore),
      afterScore: safeOptionalNumber(result.afterScore),
      estimatedMinimumScore: safeOptionalNumber(result.estimatedMinimumScore),
      integrityCoverage: safeOptionalNumber(result.integrityCoverage),
      aiVerificationIncomplete: result.aiVerificationIncomplete === true,
      autoContinueRoundsRun: roundsRun,
      ...quality,
    },
    artifact: {
      kind: 'tagged_pdf',
      contentType: 'application/pdf',
      size: taggedMetadata.size,
      sha256: taggedMetadata.sha256,
    },
    pdfUaValidation: normalizePdfUaValidation(pdfUaValidation),
  };
}

function publicStatus(state, active) {
  if (!state && active) {
    return {
      schema: RUN_SCHEMA,
      jobId: active.jobId,
      status: active.stage,
    };
  }
  if (!state) return null;
  if (state.status === 'succeeded' && state.result) return state.result;
  const status = (
    !active &&
    ['receiving', 'running', 'uploading'].includes(state.status)
  ) ? 'interrupted' : state.status;
  return {
    schema: RUN_SCHEMA,
    jobId: state.jobId,
    status,
    error: state.error || undefined,
  };
}

function classifyDriverFailure(error) {
  const message = String((error && error.message) || '');
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(message)) {
    return new RunnerError('model_quota_exhausted', 503, true);
  }
  if (/API_AUTH_FAILED|API key|401|403|permission/i.test(message)) {
    return new RunnerError('model_route_rejected', 502, false);
  }
  if (/Playwright|Chromium|browser binary|module file/i.test(message)) {
    return new RunnerError('runner_dependency_unavailable', 500, false);
  }
  if (/exceeded|timeout|timed out/i.test(message)) {
    return new RunnerError('remediation_timed_out', 504, true);
  }
  return new RunnerError('remediation_failed', 500, false);
}

function resolveDriverPath() {
  const candidates = [
    process.env.ALLOFLOW_RUNNER_DRIVER_PATH,
    path.join(__dirname, 'alloflow', 'desktop', 'mcp', 'remediation_headless_driver.cjs'),
    path.join(__dirname, '.runner-context', 'desktop', 'mcp', 'remediation_headless_driver.cjs'),
    path.join(__dirname, '..', '.runner-context', 'desktop', 'mcp', 'remediation_headless_driver.cjs'),
    path.join(__dirname, '..', '..', '..', 'desktop', 'mcp', 'remediation_headless_driver.cjs'),
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new RunnerError('runner_driver_missing', 500);
  return path.resolve(found);
}

function defaultDriverFactory(options) {
  const routingKey = process.env.ALLOFLOW_MCP_GEMINI_KEY;
  if (typeof routingKey !== 'string' || routingKey.length < 16) {
    throw new RunnerError('model_route_key_not_configured', 500);
  }
  const base = process.env.ALLOFLOW_MCP_GEMINI_BASE;
  let baseUrl;
  try {
    baseUrl = new URL(base);
  } catch {
    throw new RunnerError('model_route_not_configured', 500);
  }
  if (
    baseUrl.protocol !== 'http:' ||
    baseUrl.hostname !== 'gemini.internal' ||
    baseUrl.port ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new RunnerError('model_route_not_internal', 500);
  }

  // The canonical driver reads GEMINI_API_KEY. This is only a routing
  // placeholder consumed by the Worker's outbound handler, never a real key.
  process.env.GEMINI_API_KEY = routingKey;
  process.env.ALLOFLOW_MCP_NO_KEY_FILES = '1';
  const loaded = require(resolveDriverPath());
  if (!loaded || typeof loaded.createDriver !== 'function') {
    throw new RunnerError('runner_driver_invalid', 500);
  }
  return loaded.createDriver(options);
}

function createRunnerServer(options = {}) {
  const allowInsecure = options.allowInsecure === true;
  const token = options.token ?? process.env.ALLOFLOW_RUNNER_TOKEN ?? '';
  if (!allowInsecure && (typeof token !== 'string' || token.length < 32)) {
    throw new RunnerError('runner_token_not_configured', 500);
  }

  const allowedHosts = options.allowedHosts
    ? new Set(options.allowedHosts)
    : parseAllowedHosts(process.env.ALLOFLOW_RUNNER_STORAGE_HOSTS);
  const stateDir = options.stateDir || process.env.ALLOFLOW_RUNNER_STATE_DIR || '/tmp/alloflow-runner';
  const maxInputBytes = options.maxInputBytes || DEFAULT_MAX_INPUT_BYTES;
  const maxResultBytes = options.maxResultBytes || DEFAULT_MAX_RESULT_BYTES;
  const fetchImpl = options.fetch || globalThis.fetch;
  const createDriver = options.createDriver || defaultDriverFactory;
  if (typeof fetchImpl !== 'function') throw new RunnerError('fetch_unavailable', 500);
  if (typeof createDriver !== 'function') throw new RunnerError('driver_factory_invalid', 500);

  const store = createStateStore(stateDir);
  let active = null;
  let shuttingDown = false;

  function requireAuth(req) {
    if (!allowInsecure && !bearerMatches(req, token)) {
      throw new RunnerError('unauthorized', 401);
    }
  }

  async function persist(jobId, value) {
    await store.write(jobId, value);
    return value;
  }

  async function executeRun(spec, digest, previous, context) {
    const files = store.pathsFor(spec.jobId);
    await fsp.mkdir(files.dir, { recursive: true, mode: 0o700 });
    let inputMetadata = previous && previous.inputMetadata;
    let taggedMetadata = previous && previous.taggedMetadata;
    let reportMetadata = previous && previous.reportMetadata;
    let pendingResult = previous && previous.pendingResult;

    const localOutputsReady = (
      taggedMetadata &&
      reportMetadata &&
      pendingResult &&
      fs.existsSync(files.taggedPdf) &&
      fs.existsSync(files.report)
    );

    try {
      if (!localOutputsReady) {
        context.stage = 'receiving';
        await persist(spec.jobId, {
          schema: RUN_SCHEMA,
          jobId: spec.jobId,
          requestDigest: digest,
          status: 'receiving',
        });
        inputMetadata = await downloadPdf(
          fetchImpl,
          spec.input.url,
          files.input,
          maxInputBytes,
          context.abort.signal,
        );
        throwIfCancelled(context.abort.signal);

        context.stage = 'running';
        await persist(spec.jobId, {
          schema: RUN_SCHEMA,
          jobId: spec.jobId,
          requestDigest: digest,
          status: 'running',
          inputMetadata,
        });

        const driver = createDriver({
          log() {
            // Browser-pipeline diagnostics can contain filenames, document
            // excerpts, model errors, or credential-shaped strings. Never
            // forward that free-form text across the container log boundary.
            // Emit one fixed event so operators can see the suppression.
            if (!context.driverTelemetrySuppressed) {
              context.driverTelemetrySuppressed = true;
              process.stderr.write(
                '[alloflow-runner] event=driver_telemetry_suppressed\n',
              );
            }
          },
        });
        context.driver = driver;
        let remediation;
        try {
          remediation = await driver.remediate({
            filePath: files.input,
            targetScore: spec.options.targetScore,
            fixPasses: spec.options.fixPasses,
            polishPasses: spec.options.polishPasses,
            taggedPdf: true,
            autoContinue: spec.options.autoContinue,
            autoContinueRounds: spec.options.autoContinueRounds,
            ocrLanguage: spec.options.ocrLanguage,
            validateUa: false,
            maxRunMinutes: spec.options.maxRunMinutes,
          });
        } catch (error) {
          if (context.abort.signal.aborted) throw new CancelledError();
          throw classifyDriverFailure(error);
        } finally {
          context.driver = null;
          await driver.close().catch(() => {});
        }
        throwIfCancelled(context.abort.signal);

        const quality = remediationQuality(remediation);
        if (typeof remediation.taggedPdfB64 !== 'string' || !remediation.taggedPdfB64) {
          throw new RunnerError('tagged_pdf_not_produced', 500, false);
        }
        const maximumBase64Length = Math.ceil(maxResultBytes / 3) * 4 + 4;
        if (remediation.taggedPdfB64.length > maximumBase64Length) {
          throw new RunnerError('result_too_large', 413, false);
        }
        const taggedPdf = Buffer.from(remediation.taggedPdfB64, 'base64');
        if (
          taggedPdf.length === 0 ||
          taggedPdf.length > maxResultBytes ||
          taggedPdf.subarray(0, 5).toString('ascii') !== '%PDF-'
        ) {
          throw new RunnerError('tagged_pdf_invalid', 500, false);
        }
        taggedMetadata = {
          size: taggedPdf.length,
          sha256: sha256(taggedPdf),
        };
        await writeBufferAtomic(files.taggedPdf, taggedPdf);

        let pdfUaValidation = {
          status: 'not_run',
          reason: 'independent_validator_not_packaged',
        };
        if (typeof driver.validatePdfUaCli === 'function') {
          context.stage = 'validating';
          context.driver = driver;
          try {
            pdfUaValidation = await driver.validatePdfUaCli({
              filePath: files.taggedPdf,
              signal: context.abort.signal,
              timeoutMs: 120000,
              maxBytes: maxResultBytes,
            });
          } catch (error) {
            if (context.abort.signal.aborted) throw new CancelledError();
            const message = String(error && error.message || '');
            pdfUaValidation = {
              status: 'unavailable',
              reason: /timed out/i.test(message)
                ? 'validator_timeout'
                : (/could not start|not packaged/i.test(message)
                  ? 'validator_not_available'
                  : 'validator_error'),
            };
          } finally {
            context.driver = null;
          }
        }

        const report = buildReport(
          spec,
          inputMetadata,
          remediation,
          taggedMetadata,
          quality,
          pdfUaValidation,
        );
        const reportBuffer = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, 'utf8');
        if (reportBuffer.length > MAX_REPORT_BYTES) {
          throw new RunnerError('report_too_large', 500, false);
        }
        reportMetadata = {
          size: reportBuffer.length,
          sha256: sha256(reportBuffer),
        };
        await writeBufferAtomic(files.report, reportBuffer);

        pendingResult = {
          schema: RUN_SCHEMA,
          jobId: spec.jobId,
          status: 'succeeded',
          summary: report.summary,
          artifacts: [
            {
              kind: 'tagged_pdf',
              url: spec.output.taggedPdfUrl,
              contentType: 'application/pdf',
              size: taggedMetadata.size,
              sha256: taggedMetadata.sha256,
            },
            {
              kind: 'report',
              url: spec.output.reportUrl,
              contentType: 'application/json',
              size: reportMetadata.size,
              sha256: reportMetadata.sha256,
            },
          ],
        };
      }

      context.stage = 'uploading';
      await persist(spec.jobId, {
        schema: RUN_SCHEMA,
        jobId: spec.jobId,
        requestDigest: digest,
        status: 'uploading',
        inputMetadata,
        taggedMetadata,
        reportMetadata,
        pendingResult,
      });

      await putArtifact(
        fetchImpl,
        spec.output.taggedPdfUrl,
        files.taggedPdf,
        'application/pdf',
        { jobId: spec.jobId, sha256: taggedMetadata.sha256 },
        context.abort.signal,
      );
      await putArtifact(
        fetchImpl,
        spec.output.reportUrl,
        files.report,
        'application/json',
        { jobId: spec.jobId, sha256: reportMetadata.sha256 },
        context.abort.signal,
      );
      throwIfCancelled(context.abort.signal);

      await persist(spec.jobId, {
        schema: RUN_SCHEMA,
        jobId: spec.jobId,
        requestDigest: digest,
        status: 'succeeded',
        result: pendingResult,
      });
      return pendingResult;
    } finally {
      await fsp.rm(files.input, { force: true }).catch(() => {});
    }
  }

  async function handleRun(req, res) {
    const raw = await readJsonBody(req);
    const spec = validateRunPayload(raw, allowedHosts);
    const digest = requestDigest(spec);
    const previous = await store.read(spec.jobId);

    if (previous && previous.requestDigest && previous.requestDigest !== digest) {
      throw new RunnerError('idempotency_conflict', 409);
    }
    if (previous && previous.status === 'succeeded' && previous.result) {
      sendJson(res, 200, previous.result);
      return;
    }
    if (previous && ['failed', 'cancelled'].includes(previous.status)) {
      sendJson(res, 409, publicStatus(previous, null));
      return;
    }
    if (active) {
      throw new RunnerError(
        active.jobId === spec.jobId ? 'job_already_running' : 'runner_busy',
        409,
        true,
      );
    }

    const context = {
      jobId: spec.jobId,
      stage: 'receiving',
      abort: new AbortController(),
      driver: null,
      driverTelemetrySuppressed: false,
    };
    active = context;
    try {
      const result = await executeRun(spec, digest, previous, context);
      sendJson(res, 200, result);
    } catch (error) {
      const normalized = error instanceof RunnerError
        ? error
        : new RunnerError('internal_error', 500, false);
      const cancelled = normalized instanceof CancelledError || context.abort.signal.aborted;
      const terminal = cancelled ? new CancelledError() : normalized;
      const latest = terminal.retryable
        ? await store.read(spec.jobId).catch(() => null)
        : null;
      const resumable = latest && latest.requestDigest === digest
        ? {
            inputMetadata: latest.inputMetadata,
            taggedMetadata: latest.taggedMetadata,
            reportMetadata: latest.reportMetadata,
            pendingResult: latest.pendingResult,
          }
        : {};
      await persist(spec.jobId, {
        schema: RUN_SCHEMA,
        jobId: spec.jobId,
        requestDigest: digest,
        ...resumable,
        status: cancelled ? 'cancelled' : (terminal.retryable ? 'retryable' : 'failed'),
        error: {
          code: terminal.code,
          retryable: terminal.retryable,
        },
      }).catch(() => {});
      throw terminal;
    } finally {
      if (active === context) active = null;
    }
  }

  async function handleStatus(url, res) {
    const values = url.searchParams.getAll('job_id');
    if (values.length !== 1 || url.searchParams.size !== 1) {
      throw new RunnerError('invalid_status_request', 400);
    }
    const jobId = validateJobId(values[0]);
    const state = await store.read(jobId);
    const status = publicStatus(state, active && active.jobId === jobId ? active : null);
    if (!status) throw new RunnerError('job_not_found', 404);
    sendJson(res, 200, status);
  }

  async function handleCancel(req, res) {
    const raw = await readJsonBody(req);
    if (!hasExactKeys(raw, ['jobId'])) throw new RunnerError('invalid_cancel_request', 400);
    const jobId = validateJobId(raw.jobId);

    if (active && active.jobId === jobId) {
      active.abort.abort();
      if (active.driver && typeof active.driver.cancelActiveRun === 'function') {
        await active.driver.cancelActiveRun().catch(() => {});
      }
      sendJson(res, 202, {
        schema: RUN_SCHEMA,
        jobId,
        status: 'cancelling',
      });
      return;
    }

    const state = await store.read(jobId);
    if (!state) throw new RunnerError('job_not_found', 404);
    if (state.status === 'succeeded') throw new RunnerError('job_already_succeeded', 409);
    if (state.status === 'cancelled') {
      sendJson(res, 200, publicStatus(state, null));
      return;
    }
    await persist(jobId, {
      schema: RUN_SCHEMA,
      jobId,
      requestDigest: state.requestDigest,
      status: 'cancelled',
      error: { code: 'job_cancelled', retryable: false },
    });
    sendJson(res, 200, {
      schema: RUN_SCHEMA,
      jobId,
      status: 'cancelled',
    });
  }

  const server = http.createServer((req, res) => {
    (async () => {
      const url = new URL(req.url || '/', 'http://runner.internal');
      if (req.method === 'GET' && url.pathname === '/healthz' && !url.search) {
        sendJson(res, shuttingDown ? 503 : 200, {
          ok: !shuttingDown,
          service: SERVICE_NAME,
          version: SERVICE_VERSION,
          active: active ? active.stage : null,
        });
        return;
      }

      if (shuttingDown) throw new RunnerError('runner_shutting_down', 503, true);
      requireAuth(req);
      if (req.method === 'POST' && url.pathname === '/v1/run' && !url.search) {
        await handleRun(req, res);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/v1/status') {
        await handleStatus(url, res);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/v1/cancel' && !url.search) {
        await handleCancel(req, res);
        return;
      }
      throw new RunnerError('not_found', 404);
    })().catch((error) => {
      if (!(error instanceof RunnerError)) {
        process.stderr.write('[alloflow-runner] unhandled=Error\n');
      }
      sendError(res, error);
    });
  });

  server.maxHeadersCount = 32;
  server.headersTimeout = 10_000;
  server.requestTimeout = 30 * 60 * 1000;
  server.keepAliveTimeout = 5_000;

  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    if (active) {
      active.abort.abort();
      if (active.driver && typeof active.driver.cancelActiveRun === 'function') {
        await active.driver.cancelActiveRun().catch(() => {});
      }
    }
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  return {
    server,
    shutdown,
    getActiveJob() {
      return active ? { jobId: active.jobId, stage: active.stage } : null;
    },
  };
}

async function main() {
  let app;
  try {
    app = createRunnerServer();
  } catch (error) {
    const code = error instanceof RunnerError ? error.code : 'startup_failed';
    process.stderr.write(`[alloflow-runner] startup_error=${code}\n`);
    process.exitCode = 1;
    return;
  }

  const port = Number(process.env.PORT || DEFAULT_PORT);
  if (!integerInRange(port, 1, 65535)) {
    process.stderr.write('[alloflow-runner] startup_error=invalid_port\n');
    process.exitCode = 1;
    return;
  }
  app.server.listen(port, '0.0.0.0', () => {
    process.stderr.write(`[alloflow-runner] listening port=${port}\n`);
  });

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    const force = setTimeout(() => {
      app.server.closeAllConnections?.();
      process.exit(1);
    }, 10_000);
    force.unref?.();
    await app.shutdown();
    clearTimeout(force);
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
}

if (require.main === module) {
  main().catch(() => {
    process.stderr.write('[alloflow-runner] startup_error=unhandled\n');
    process.exitCode = 1;
  });
}

module.exports = {
  RUN_SCHEMA,
  RunnerError,
  createRunnerServer,
  validateRunPayload,
  requestDigest,
};
