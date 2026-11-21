#!/usr/bin/env node
'use strict';

/**
 * Standalone readiness preflight and post-publish live CDN verifier for the
 * verified-candidate release flow (dev-tools/deploy_verified_candidate.sh).
 * Keeps release-time verification separate from dev/commit scripts without
 * installing packages, logging in, or mutating repository state.
 */
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { dryRunSite, MAX_FILES } = require('./security_release_candidate.cjs');

const DEFAULT_CDN = 'https://alloflow-cdn.pages.dev';
const DEFAULT_MODULES = Object.freeze([
  'doc_pipeline_module.js',
  'view_pdf_audit_module.js',
  'view_export_preview_module.js',
  'gemini_api_module.js',
  'app/index.html',
  'app/sw.js',
  'lame.min.js',
]);
const VERAPDF_HTML_ROUTE = 'verapdf/verapdf_validator.html';
const VERAPDF_JAR_ROUTE = 'verapdf/verapdf-cli.jar';

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const MAX_LIVE_FETCH_BYTES = 64 * 1024 * 1024;
const LIVE_FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECT_HOPS = 5;
const SAFE_GIT_REF_RE = /^[A-Za-z0-9._/@^{}~-]+$/;

function runTool(command, args, cwd) {
  const isWinCmd = process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command);
  const execCmd = isWinCmd ? (process.env.ComSpec || 'cmd.exe') : command;
  const execArgs = isWinCmd ? ['/d', '/s', '/c', command, ...args] : args;
  const result = spawnSync(execCmd, execArgs, {
    cwd,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 60000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    ok: !result.error && !result.signal && result.status === 0,
    status: result.status,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
  };
}

/**
 * Evaluate local prerequisites required before running deploy_verified_candidate.sh.
 * @param {object} probe Collected tool/env/site measurements.
 * @returns {{ ready: boolean, checks: Array<{ name: string, ok: boolean, detail: string, remediation?: string }> }}
 */
function evaluatePreflight(probe) {
  const checks = [];
  const nodeOk = Boolean(probe.nodeVersion && /^v\d+\./.test(probe.nodeVersion));
  checks.push({
    name: 'node',
    ok: nodeOk,
    detail: probe.nodeVersion || 'missing',
    ...(nodeOk ? {} : { remediation: 'Install Node.js 20+' }),
  });

  const ghOk = Boolean(probe.ghOk && probe.ghAttestationOk);
  checks.push({
    name: 'gh-cli',
    ok: ghOk,
    detail: ghOk ? (probe.ghVersion || 'available with attestation') : (probe.ghVersion || 'missing or lacks attestation verify'),
    ...(ghOk ? {} : { remediation: 'Install GitHub CLI >= 2.49 (with gh attestation verify) and run gh auth login' }),
  });

  const wranglerVer = String(probe.wranglerVersion || '').trim();
  const wranglerOk = /(?:^|\s)4\.\d+\.\d+(?:\s|$)/.test(wranglerVer);
  checks.push({
    name: 'wrangler-4',
    ok: wranglerOk,
    detail: wranglerOk ? wranglerVer : (wranglerVer || 'missing or broken'),
    ...(wranglerOk ? {} : { remediation: 'npm install -g wrangler@^4' }),
  });

  const accountId = String(probe.cloudflareAccountId || '').trim();
  const accountOk = /^[a-fA-F0-9]{32}$/.test(accountId);
  checks.push({
    name: 'cloudflare-account-id',
    ok: accountOk,
    detail: accountOk ? 'configured (32-hex)' : 'unset or invalid',
    ...(accountOk ? {} : { remediation: 'Set CLOUDFLARE_ACCOUNT_ID=<32-hex-account-id> before running deploy_verified_candidate.sh' }),
  });

  const dirty = String(probe.gitDirtyTracked || '').trim();
  const cleanOk = typeof probe.gitDirtyTracked === 'string' && dirty === '';
  checks.push({
    name: 'git-clean-tracked',
    ok: cleanOk,
    detail: cleanOk ? 'clean tracked working tree' : 'tracked files modified or staged',
    ...(cleanOk ? {} : { remediation: 'Commit or clean tracked changes and check out the exact reviewed source SHA' }),
  });

  if (probe.siteSkipped) {
    checks.push({ name: 'candidate-site', ok: true, detail: 'skipped (--skip-site)' });
  } else {
    const site = probe.site;
    const siteOk = Boolean(
      site && !probe.siteError
      && site.files > 0 && site.files <= MAX_FILES
      && site.hasHeaders && site.hasGuide && site.hasStudentShell && site.hasVeraPdf
    );
    checks.push({
      name: 'candidate-site',
      ok: siteOk,
      detail: siteOk
        ? `${site.files} files (${(site.totalBytes / 1048576).toFixed(1)} MiB), _headers, guide, /app/, veraPDF present`
        : (probe.siteError || 'incomplete site candidate'),
      ...(siteOk ? {} : { remediation: 'Run node dev-tools/security_release_candidate.cjs dry-run-site to inspect blockers' }),
    });
  }

  return { ready: checks.every(c => c.ok), checks };
}

/**
 * Validate security and CORS headers returned by Cloudflare Pages.
 * @param {{ rootHeaders: Record<string, string>, engineHeaders: Record<string, string> }} input
 * @returns {{ ok: boolean, failures: string[] }}
 */
function evaluateSecurityHeaders({ rootHeaders = {}, engineHeaders = {} }) {
  const normalize = headers => Object.fromEntries(
    Object.entries(headers || {}).map(([k, v]) => [String(k).toLowerCase(), String(v || '').trim()])
  );
  const root = normalize(rootHeaders);
  const engine = normalize(engineHeaders);
  const failures = [];
  if ((root['x-content-type-options'] || '').toLowerCase() !== 'nosniff') {
    failures.push('missing or invalid X-Content-Type-Options: nosniff on /app/');
  }
  const hstsMatch = /(?:^|;\s*)max-age=(\d+)(?:\s*;|$)/i.exec(root['strict-transport-security'] || '');
  if (!hstsMatch || Number(hstsMatch[1]) < 31536000) {
    failures.push('missing or weak Strict-Transport-Security header on /app/');
  }
  if (engine['access-control-allow-origin'] !== '*') {
    failures.push('missing Access-Control-Allow-Origin: * header on /axe-core/axe.min.js');
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Validate live veraPDF HTML validator content to detect Cloudflare SPA fallback.
 * @param {number} status
 * @param {string} body
 * @returns {{ ok: boolean, reason: string }}
 */
function evaluateVeraPdfHtml(status, body) {
  const text = String(body || '');
  if (status !== 200 || !text.length) return { ok: false, reason: `HTTP ${status} / empty` };
  const hasMarkers = text.includes('Independent PDF/UA-1 validator')
    && text.includes("type: 'verapdf-ready'")
    && text.includes('boot();');
  if (!hasMarkers) {
    return { ok: false, reason: 'HTTP 200 without validator identity/ready/boot markers (likely SPA fallback)' };
  }
  return { ok: true, reason: 'validator markers present' };
}

/**
 * Validate live veraPDF CLI JAR binary response against HTML SPA fallback.
 * @param {number} status
 * @param {string} contentType
 * @param {Buffer} buffer
 * @returns {{ ok: boolean, reason: string }}
 */
function evaluateVeraPdfJar(status, contentType, buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  const ctype = String(contentType || '').trim().toLowerCase();
  const magic = buf.subarray(0, 4).toString('hex');
  if (status !== 200 || !buf.length) return { ok: false, reason: `HTTP ${status} / empty` };
  if (ctype.startsWith('text/html') || ctype.startsWith('text/plain')) {
    return { ok: false, reason: `content-type ${ctype} (likely SPA fallback)` };
  }
  if (magic !== '504b0304' || buf.length < 1000000) {
    return { ok: false, reason: `not a plausible JAR (magic=${magic || '<empty>'}, bytes=${buf.length}, type=${ctype || '<missing>'})` };
  }
  return { ok: true, reason: `real JAR (${buf.length} bytes, PK magic)` };
}

function runPreflight(options) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const ghVer = runTool('gh', ['--version'], root);
  const ghAttest = ghVer.ok ? runTool('gh', ['attestation', 'verify', '--help'], root) : { ok: false };
  const wranglerCmd = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
  const wranglerVer = runTool(wranglerCmd, ['--version'], root);
  const gitStatus = runTool('git', ['status', '--porcelain=v1', '--untracked-files=no'], root);

  let site = null;
  let siteError = '';
  if (!options.skipSite) {
    try { site = dryRunSite({ root }); }
    catch (error) { siteError = error.message; }
  }

  const report = evaluatePreflight({
    nodeVersion: process.version,
    ghOk: ghVer.ok,
    ghAttestationOk: ghAttest.ok,
    ghVersion: ghVer.stdout.split(/\r?\n/)[0] || '',
    wranglerVersion: wranglerVer.ok ? wranglerVer.stdout.split(/\r?\n/)[0] : '',
    cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    gitDirtyTracked: gitStatus.ok ? gitStatus.stdout : 'git status failed',
    siteSkipped: options.skipSite,
    site,
    siteError,
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('=== Verified-Candidate Release Preflight ===');
    for (const check of report.checks) {
      const icon = check.ok ? '[PASS]' : '[FAIL]';
      console.log(`  ${icon} ${check.name}: ${check.detail}`);
      if (!check.ok && check.remediation) console.log(`         Fix: ${check.remediation}`);
    }
    console.log(report.ready ? 'Preflight ready: local host can run deploy_verified_candidate.sh.' : 'Preflight incomplete: resolve the [FAIL] item(s) above before candidate publish.');
  }
  if (options.strict && !report.ready) process.exitCode = 2;
  return report;
}

async function fetchLiveUrl(url, expectedOrigin) {
  let currentUrl = new URL(url);
  if (currentUrl.protocol !== 'https:') {
    throw new Error('Live verification URL must use HTTPS: ' + url);
  }
  const pinnedOrigin = expectedOrigin || currentUrl.origin;
  let response = null;
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    if (currentUrl.protocol !== 'https:' || currentUrl.origin !== pinnedOrigin) {
      throw new Error('Refusing cross-origin or non-HTTPS redirect: ' + currentUrl.href);
    }
    response = await fetch(currentUrl.href, {
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
      signal: AbortSignal.timeout(LIVE_FETCH_TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location || hop === MAX_REDIRECT_HOPS) {
        throw new Error('Invalid or excessive redirect while verifying: ' + currentUrl.href);
      }
      currentUrl = new URL(location, currentUrl);
      continue;
    }
    break;
  }
  const declaredLen = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLen) && declaredLen > MAX_LIVE_FETCH_BYTES) {
    throw new Error('Live response exceeds 64 MiB safety limit: ' + currentUrl.href);
  }
  let buffer;
  if (response.body && typeof response.body.getReader === 'function') {
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > MAX_LIVE_FETCH_BYTES) {
            try { await reader.cancel(); } catch (_) {}
            throw new Error('Live response exceeds 64 MiB safety limit: ' + currentUrl.href);
          }
          chunks.push(Buffer.from(value));
        }
      }
    } finally {
      try { reader.releaseLock(); } catch (_) {}
    }
    buffer = Buffer.concat(chunks, total);
  } else {
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_LIVE_FETCH_BYTES) {
      throw new Error('Live response exceeds 64 MiB safety limit: ' + currentUrl.href);
    }
    buffer = Buffer.from(arrayBuffer);
  }
  const headers = Object.fromEntries(response.headers.entries());
  return { status: response.status, headers, buffer };
}

function gitFileSha256(root, ref, relPath) {
  if (typeof ref !== 'string' || !ref || ref.startsWith('-') || !SAFE_GIT_REF_RE.test(ref)) {
    throw new Error('Unsafe git ref for live verification: ' + ref);
  }
  const res = spawnSync('git', ['show', `${ref}:${relPath}`], {
    cwd: root,
    encoding: null,
    windowsHide: true,
    timeout: 30000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error || res.status !== 0 || !res.stdout) return null;
  return sha256(res.stdout);
}

async function runLiveVerify(options) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const cdnBase = String(options.cdn || DEFAULT_CDN).replace(/\/+$/, '');
  let parsedCdn;
  try {
    parsedCdn = new URL(cdnBase);
  } catch (_) {
    throw new Error('Invalid --cdn URL: ' + cdnBase);
  }
  if (parsedCdn.protocol !== 'https:' || parsedCdn.username || parsedCdn.password) {
    throw new Error('CDN URL must be a credential-free HTTPS origin: ' + cdnBase);
  }
  const ref = options.ref || 'HEAD';
  if (typeof ref !== 'string' || !ref || ref.startsWith('-') || !SAFE_GIT_REF_RE.test(ref)) {
    throw new Error('Invalid --ref value: ' + ref);
  }
  const rawRetries = options.retries ?? 4;
  const rawWaitMs = options.waitMs ?? 20000;
  if (!Number.isSafeInteger(rawRetries) || rawRetries < 0 || rawRetries > 60) {
    throw new Error('Invalid --retries value (must be integer 0..60)');
  }
  if (!Number.isSafeInteger(rawWaitMs) || rawWaitMs < 0 || rawWaitMs > 300000) {
    throw new Error('Invalid --wait-ms value (must be integer 0..300000)');
  }
  const retries = rawRetries;
  const waitMs = rawWaitMs;
  const bust = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

  const failures = [];
  const warnings = [];
  console.log(`=== Post-Publish Live CDN Verification (${cdnBase}, ref ${ref}) ===`);

  const [rootAppResp, axeResp] = await Promise.all([
    fetchLiveUrl(`${cdnBase}/app/?verify=${bust}-hdr1`, parsedCdn.origin),
    fetchLiveUrl(`${cdnBase}/axe-core/axe.min.js?verify=${bust}-hdr2`, parsedCdn.origin),
  ]);
  const sec = evaluateSecurityHeaders({ rootHeaders: rootAppResp.headers, engineHeaders: axeResp.headers });
  if (sec.ok) console.log('  [PASS] Security & CORS headers (_headers active)');
  else {
    for (const msg of sec.failures) {
      failures.push(msg);
      console.error(`  [FAIL] ${msg}`);
    }
  }

  let stale = [];
  for (const mod of DEFAULT_MODULES) {
    const expected = gitFileSha256(root, ref, mod);
    if (!expected) {
      failures.push(`${mod}: missing at git ref ${ref}`);
      console.error(`  [FAIL] ${mod}: missing at git ref ${ref}`);
      continue;
    }
    let resp;
    try {
      resp = await fetchLiveUrl(`${cdnBase}/${mod}?v=${bust}`, parsedCdn.origin);
    } catch (err) {
      stale.push({ mod, expected, reason: err.message });
      continue;
    }
    if (resp.status !== 200 || !resp.buffer.length) {
      failures.push(`${mod}: HTTP ${resp.status} / empty`);
      console.error(`  [FAIL] ${mod}: HTTP ${resp.status} / empty`);
      continue;
    }
    if (sha256(resp.buffer) === expected) {
      console.log(`  [PASS] ${mod}: reachable + fresh`);
    } else {
      stale.push({ mod, expected });
    }
  }

  for (let attempt = 1; stale.length > 0 && attempt <= retries; attempt++) {
    console.log(`  ... ${stale.length} module(s) propagating; rechecking in ${Math.round(waitMs / 1000)}s (${attempt}/${retries})`);
    await sleep(waitMs);
    const still = [];
    for (const item of stale) {
      try {
        const resp = await fetchLiveUrl(`${cdnBase}/${item.mod}?v=${bust}-${attempt}`, parsedCdn.origin);
        if (resp.status === 200 && sha256(resp.buffer) === item.expected) {
          console.log(`  [PASS] ${item.mod}: now fresh`);
        } else {
          still.push(item);
        }
      } catch (err) {
        still.push({ ...item, reason: err.message });
      }
    }
    stale = still;
  }
  for (const item of stale) {
    const msg = `${item.mod}: content SHA-256 digest differs after ${retries} retries${item.reason ? ` (${item.reason})` : ''}`;
    failures.push(msg);
    console.error(`  [FAIL] ${msg}`);
  }

  let htmlResult = { ok: false, reason: 'not checked' };
  let jarResult = { ok: false, reason: 'not checked' };
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (!htmlResult.ok) {
      try {
        const htmlResp = await fetchLiveUrl(`${cdnBase}/${VERAPDF_HTML_ROUTE}?verify=${bust}-${attempt}`, parsedCdn.origin);
        htmlResult = evaluateVeraPdfHtml(htmlResp.status, htmlResp.buffer.toString('utf8'));
      } catch (err) {
        htmlResult = { ok: false, reason: err.message };
      }
    }
    if (!jarResult.ok) {
      try {
        const jarResp = await fetchLiveUrl(`${cdnBase}/${VERAPDF_JAR_ROUTE}?verify=${bust}-${attempt}`, parsedCdn.origin);
        jarResult = evaluateVeraPdfJar(jarResp.status, jarResp.headers['content-type'], jarResp.buffer);
      } catch (err) {
        jarResult = { ok: false, reason: err.message };
      }
    }
    if (htmlResult.ok && jarResult.ok) break;
    if (attempt < retries) await sleep(waitMs);
  }
  if (htmlResult.ok) console.log(`  [PASS] ${VERAPDF_HTML_ROUTE}: ${htmlResult.reason}`);
  else {
    failures.push(`${VERAPDF_HTML_ROUTE}: ${htmlResult.reason}`);
    console.error(`  [FAIL] ${VERAPDF_HTML_ROUTE}: ${htmlResult.reason}`);
  }
  if (jarResult.ok) console.log(`  [PASS] ${VERAPDF_JAR_ROUTE}: ${jarResult.reason}`);
  else {
    failures.push(`${VERAPDF_JAR_ROUTE}: ${jarResult.reason}`);
    console.error(`  [FAIL] ${VERAPDF_JAR_ROUTE}: ${jarResult.reason}`);
  }

  if (failures.length) process.exitCode = 1;
  return { ok: failures.length === 0, failures, warnings };
}

function parseCliArgs(args = process.argv.slice(2)) {
  const parsed = { mode: '', json: false, strict: false, skipSite: false };
  for (const arg of args) {
    if (arg === '--preflight' || arg === '--live' || arg === '--help' || arg === '-h') parsed.mode = arg;
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--strict') parsed.strict = true;
    else if (arg === '--skip-site') parsed.skipSite = true;
    else {
      const match = /^--(root|cdn|ref|retries|wait-ms)=(.+)$/.exec(arg);
      if (!match) throw new Error('Invalid argument: ' + arg);
      const key = match[1] === 'wait-ms' ? 'waitMs' : match[1];
      parsed[key] = ['retries', 'waitMs'].includes(key) ? Number(match[2]) : match[2];
    }
  }
  return parsed;
}

async function main() {
  const options = parseCliArgs();
  if (!options.mode || options.mode === '--help' || options.mode === '-h') {
    console.log('Usage:\n  node dev-tools/verify_live_cdn_release.cjs --preflight [--json] [--strict] [--skip-site]\n  node dev-tools/verify_live_cdn_release.cjs --live [--cdn=https://alloflow-cdn.pages.dev] [--ref=HEAD]');
    return;
  }
  if (options.mode === '--preflight') runPreflight(options);
  else if (options.mode === '--live') await runLiveVerify(options);
}

module.exports = {
  DEFAULT_CDN,
  DEFAULT_MODULES,
  evaluatePreflight,
  evaluateSecurityHeaders,
  evaluateVeraPdfHtml,
  evaluateVeraPdfJar,
  parseCliArgs,
};
if (require.main === module) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
