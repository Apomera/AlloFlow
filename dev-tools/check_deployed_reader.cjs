#!/usr/bin/env node
'use strict';
// GET-only byte verification. Never executes the served host/module, writes a
// file, reads current Git state, builds an artifact or operates the application.
const fs = require('node:fs'), crypto = require('node:crypto');
const { HOSTS, PATHS, readerLoaders } = require('./check_reader_release.cjs');
const { OUTPUTS } = require('./lib/reader_compiler.cjs');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const SHA = /^[0-9a-f]{64}$/, HEAD = /^[0-9a-f]{40}$/;
const MAX_HOST_BYTES = 16 * 1024 * 1024, MAX_MODULE_BYTES = 8 * 1024 * 1024;
const HEADER_NAMES = ['content-type', 'content-encoding', 'cache-control', 'age', 'etag', 'last-modified', 'date', 'cf-cache-status', 'cf-ray'];
const LIMITS = [
  'Checks only the supplied host-text URL and its exact reader module URL from one network vantage point.',
  'Does not verify the compiled /app/ shell, Canvas pastes, installed desktop apps, service-worker/browser caches, other modules or user journeys.',
  'A supplied local manifest is evidence chosen by the operator, not an authenticated release attestation. HEAD alone never proves served bytes.',
  'Ordinary and no-cache GETs are point-in-time observations; cache headers do not prove global propagation.'
];

function hostAddress(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash) throw Error('Host URL must use HTTPS, with no credentials or fragment.');
  return url.href;
}

function validateManifest(bytes) {
  const manifest = JSON.parse(Buffer.from(bytes).toString('utf8').replace(/^\uFEFF/, ''));
  const reject = () => { throw Error('Expected an unchanged, successful schema-1 local reader manifest with matching file hashes and exact loader pins.'); };
  if (!manifest || manifest.schemaVersion !== 1 || manifest.scope !== 'local-reader-source-output-and-hosts' || manifest.ok !== true
      || !HEAD.test(manifest.startHead || '') || manifest.endHead !== manifest.startHead || !SHA.test(manifest.expectedModuleSha256 || '')
      || manifest.mirrorsMatch !== true || manifest.hostsMatch !== true
      || !Array.isArray(manifest.errors) || manifest.errors.length !== 0
      || !Array.isArray(manifest.changedDuringCheck) || manifest.changedDuringCheck.length !== 0) reject();
  for (const file of PATHS) {
    const entry = manifest.files?.[file];
    if (!entry || !SHA.test(entry.sha256 || '') || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0) reject();
  }
  const host = manifest.files[HOSTS[0]], module = manifest.files[OUTPUTS[0]];
  if (host.bytes > MAX_HOST_BYTES || module.bytes > MAX_MODULE_BYTES || module.sha256 !== manifest.expectedModuleSha256) reject();
  const moduleUrl = 'https://alloflow-cdn.pages.dev/view_simplified_module.js?v=' + module.sha256.slice(0, 8);
  for (const file of HOSTS) {
    const pins = manifest.pins?.[file], entry = manifest.files[file];
    if (entry.sha256 !== host.sha256 || entry.bytes !== host.bytes || !Array.isArray(pins) || pins.length !== 1 || pins[0].url !== moduleUrl) reject();
  }
  for (const file of OUTPUTS) if (manifest.files[file].sha256 !== module.sha256 || manifest.files[file].bytes !== module.bytes) reject();
  return { manifest, host, module, moduleUrl };
}

async function readResponse(url, mode, fetchImpl, timeoutMs, maxBytes) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const result = { url, mode, at: new Date().toISOString() };
  let reader;
  try {
    const response = await fetchImpl(url, {
      method: 'GET', redirect: 'manual', credentials: 'omit', signal: controller.signal,
      headers: mode === 'revalidate' ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } : {}
    });
    result.status = response.status;
    result.responseUrl = response.url || url;
    result.headers = Object.fromEntries(HEADER_NAMES.map(name => [name, response.headers.get(name)]).filter(([, value]) => value !== null));
    if (response.status >= 300 && response.status < 400) throw Error('Redirect rejected; supply the final host URL and publish the exact module URL.');
    if (response.status !== 200) throw Error('Expected HTTP 200, received ' + response.status + '.');
    if (response.redirected || (response.url && response.url !== url)) throw Error('Response URL differs from the requested URL.');
    if (!response.body?.getReader) throw Error('Response body is unavailable.');
    reader = response.body.getReader();
    const chunks = []; let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) throw Error('Response exceeds the ' + maxBytes + '-byte verification limit.');
      chunks.push(Buffer.from(value));
    }
    const bytes = Buffer.concat(chunks);
    result.bytes = bytes.length; result.sha256 = sha256(bytes);
    return { result, bytes };
  } catch (cause) {
    controller.abort();
    if (reader) { try { await reader.cancel(); } catch (_) {} }
    result.error = controller.signal.aborted && cause.name === 'AbortError' ? 'Request timed out.' : cause.message;
    return { result };
  } finally { clearTimeout(timer); }
}

async function verifyDeployedReader(options) {
  const report = { schemaVersion: 1, at: new Date().toISOString(), scope: 'served-reader-host-and-module',
    manifestSha256: sha256(options.manifestBytes), requests: [], errors: [], ok: false, limits: LIMITS };
  const error = (code, message, mode, url) => report.errors.push({ code, message, ...(mode ? { mode } : {}), ...(url ? { url } : {}) });
  let baseline, hostUrl;
  try { baseline = validateManifest(options.manifestBytes); hostUrl = hostAddress(options.hostUrl); }
  catch (cause) { error('invalid-baseline-or-url', cause.message); return report; }
  const { manifest, host, module, moduleUrl } = baseline;
  report.baseline = { at: manifest.at, head: manifest.startHead, hostSha256: host.sha256, moduleSha256: module.sha256, moduleUrl };
  report.hostUrl = hostUrl;
  const fetchImpl = options.fetchImpl || globalThis.fetch, timeoutMs = options.timeoutMs ?? 15000;
  if (typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000) {
    error('invalid-network-options', 'A fetch implementation and a timeout of 1–60000 ms are required.'); return report;
  }
  for (const mode of ['ordinary', 'revalidate']) {
    const servedHost = await readResponse(hostUrl, mode, fetchImpl, timeoutMs, MAX_HOST_BYTES);
    report.requests.push({ kind: 'host', ...servedHost.result });
    if (!servedHost.bytes) { error('host-request-failed', servedHost.result.error, mode, hostUrl); continue; }
    if (servedHost.result.sha256 !== host.sha256 || servedHost.result.bytes !== host.bytes) error('host-bytes-mismatch', 'Served host bytes differ from the captured local host.', mode, hostUrl);
    let loaders;
    try { loaders = readerLoaders(servedHost.bytes.toString('utf8')); }
    catch (cause) { error('served-host-parse-failed', cause.message, mode, hostUrl); continue; }
    report.requests[report.requests.length - 1].loaders = loaders;
    if (loaders.length !== 1 || loaders[0].url !== moduleUrl) {
      error('served-loader-mismatch', 'Expected exactly one executable reader loader using the baseline URL; its observed URL will not be followed.', mode, hostUrl); continue;
    }
    const servedModule = await readResponse(loaders[0].url, mode, fetchImpl, timeoutMs, MAX_MODULE_BYTES);
    report.requests.push({ kind: 'reader', ...servedModule.result });
    if (!servedModule.bytes) error('reader-request-failed', servedModule.result.error, mode, moduleUrl);
    else if (servedModule.result.sha256 !== module.sha256 || servedModule.result.bytes !== module.bytes) {
      error('reader-bytes-mismatch', 'The exact pinned URL returned different reader bytes.', mode, moduleUrl);
    }
  }
  report.ok = report.errors.length === 0;
  return report;
}

function parseArgs(args) {
  const parsed = { json: false };
  const usage = () => { throw Error('Usage: node dev-tools/check_deployed_reader.cjs --manifest UTF8_JSON --host-url HTTPS_URL [--json]'); };
  if (args.length === 1 && args[0] === '--help') return { help: true };
  for (let i = 0; i < args.length; i++) {
    const key = args[i] === '--manifest' ? 'manifestPath' : args[i] === '--host-url' ? 'hostUrl' : null;
    if (key && !parsed[key] && args[i + 1] && !args[i + 1].startsWith('--')) parsed[key] = args[++i];
    else if (args[i] === '--json' && !parsed.json) parsed.json = true;
    else usage();
  }
  if (!parsed.manifestPath || !parsed.hostUrl) usage();
  hostAddress(parsed.hostUrl);
  return parsed;
}

async function main(args) {
  const options = parseArgs(args);
  if (options.help) {
    console.log('GET-only verification against a successful check_reader_release.cjs --json manifest. Reads the exact HTTPS host-text URL, parses its reader loader without executing it, and hashes the served module. Repeats with no-cache headers. No writes, builds, app actions or Git access. Does not verify the compiled app shell or browser caches.');
    return;
  }
  const manifestBytes = fs.readFileSync(options.manifestPath);
  const report = await verifyDeployedReader({ ...options, manifestBytes });
  try {
    if (!fs.readFileSync(options.manifestPath).equals(manifestBytes)) throw Error('Baseline manifest changed during verification.');
  } catch (cause) { report.errors.push({ code: 'manifest-changed', message: cause.message }); report.ok = false; }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log((report.ok ? 'PASS' : 'FAIL') + ' served reader/host byte comparison against manifest ' + report.manifestSha256);
    for (const issue of report.errors) console.error(issue.code + (issue.mode ? ' [' + issue.mode + ']' : '') + ': ' + issue.message);
    console.log('Point-in-time GET evidence only; app-shell and browser/service-worker validation remain separate.');
  }
  if (!report.ok) process.exitCode = 1;
}
if (require.main === module) main(process.argv.slice(2)).catch(cause => { console.error(cause.message); process.exitCode = 2; });
module.exports = { validateManifest, hostAddress, readResponse, verifyDeployedReader, parseArgs, main, MAX_HOST_BYTES, MAX_MODULE_BYTES };
