#!/usr/bin/env node
'use strict';
/**
 * Materialise the EPUBCheck distribution under desktop/mcp/vendor/epubcheck/ without keeping
 * 35 MB of Java bytecode in git. The vendor manifest (committed) pins the SHA-256 of every file
 * this connector ships, so whatever source supplies the bytes, the result is verified against it.
 *
 * Sources, in order:
 *   1. already present and manifest-verified (no-op)
 *   2. a local install at ~/.alloflow-tools/epubcheck-<version>/ (or EPUBCHECK_HOME)
 *   3. the official W3C release archive, whose SHA-256 is pinned below
 *
 *   node desktop/mcp/fetch_epubcheck.cjs            # ensure
 *   node desktop/mcp/fetch_epubcheck.cjs --check    # report only, exit 1 if incomplete
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const VERSION = '5.3.0';
const RELEASE_URL = 'https://github.com/w3c/epubcheck/releases/download/v' + VERSION + '/epubcheck-' + VERSION + '.zip';
const RELEASE_SHA256 = '6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5';
const DEFAULT_VENDOR_DIR = path.join(__dirname, 'vendor');
const TARGET = path.join(DEFAULT_VENDOR_DIR, 'epubcheck');
const PREFIX = 'epubcheck/';

const log = (m) => process.stderr.write('[fetch-epubcheck] ' + m + '\n');
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function manifestEntries(vendorDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(vendorDir, 'manifest.json'), 'utf8'));
  const entries = (manifest.files || []).filter((e) => e && typeof e.path === 'string' && e.path.startsWith(PREFIX));
  if (!entries.length) throw new Error('vendor/manifest.json declares no epubcheck/ entries');
  return entries;
}

function missingOrMismatched(vendorDir, entries) {
  const bad = [];
  for (const e of entries) {
    const abs = path.join(vendorDir, e.path);
    if (!fs.existsSync(abs)) { bad.push(e.path); continue; }
    const bytes = fs.readFileSync(abs);
    if (bytes.length !== e.bytes || sha256(bytes) !== e.sha256) bad.push(e.path);
  }
  return bad;
}

function copyTree(vendorDir, fromRoot, entries) {
  // Copy exactly the manifest-declared files; anything else in the source is ignored.
  let copied = 0;
  for (const e of entries) {
    const rel = e.path.slice(PREFIX.length);
    const src = path.join(fromRoot, rel);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(vendorDir, e.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    copied++;
  }
  return copied;
}

function localInstallRoots(options) {
  const roots = [];
  if (options.localRoots) roots.push(...options.localRoots);
  if (process.env.EPUBCHECK_HOME) roots.push(process.env.EPUBCHECK_HOME);
  const tools = path.join(options.homeDir || os.homedir(), '.alloflow-tools');
  roots.push(path.join(tools, 'epubcheck-' + VERSION));
  return roots.filter((r) => fs.existsSync(path.join(r, 'epubcheck.jar')));
}

function download(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects fetching ' + url));
    https.get(url, { headers: { 'user-agent': 'alloflow-fetch-epubcheck' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return resolve(download(new URL(res.headers.location, url).toString(), dest, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode + ' fetching ' + url)); }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchRelease(vendorDir, options) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-epubcheck-'));
  const archive = path.join(scratch, 'epubcheck.zip');
  try {
    log('downloading ' + RELEASE_URL);
    await (options.download || download)(RELEASE_URL, archive);
    const digest = sha256(fs.readFileSync(archive));
    if (digest !== RELEASE_SHA256) throw new Error('Downloaded archive SHA-256 ' + digest + ' does not match the pinned ' + RELEASE_SHA256);
    const extracted = path.join(scratch, 'x');
    fs.mkdirSync(extracted);
    require('./verify_mcpb_artifact.cjs').extractArchive(archive, extracted);
    const root = path.join(extracted, 'epubcheck-' + VERSION);
    if (!fs.existsSync(path.join(root, 'epubcheck.jar'))) throw new Error('Archive did not contain epubcheck-' + VERSION + '/epubcheck.jar');
    return copyTree(vendorDir, root, manifestEntries(vendorDir));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

async function ensureEpubcheck(options = {}) {
  const vendorDir = options.vendorDir || DEFAULT_VENDOR_DIR;
  const entries = manifestEntries(vendorDir);
  let bad = missingOrMismatched(vendorDir, entries);
  if (!bad.length) return { source: 'present', files: entries.length };
  if (options.checkOnly) return { source: 'missing', files: entries.length, missing: bad };
  for (const root of localInstallRoots(options)) {
    log('copying from local install ' + root);
    copyTree(vendorDir, root, entries);
    bad = missingOrMismatched(vendorDir, entries);
    if (!bad.length) return { source: root, files: entries.length };
  }
  if (options.offline || process.env.ALLOFLOW_MCP_OFFLINE === '1') {
    throw new Error('EPUBCheck is incomplete (' + bad.length + ' files) and downloads are disabled');
  }
  await fetchRelease(vendorDir, options);
  bad = missingOrMismatched(vendorDir, entries);
  if (bad.length) throw new Error('EPUBCheck files still missing or mismatched after download: ' + bad.slice(0, 5).join(', '));
  return { source: RELEASE_URL, files: entries.length };
}

module.exports = { ensureEpubcheck, VERSION, RELEASE_URL, RELEASE_SHA256, TARGET };

if (require.main === module) {
  const checkOnly = process.argv.includes('--check');
  ensureEpubcheck({ checkOnly }).then((r) => {
    log(r.source === 'present' ? 'ok: ' + r.files + ' manifest-verified files present'
      : r.source === 'missing' ? 'INCOMPLETE: ' + r.missing.length + ' of ' + r.files + ' files missing or mismatched'
      : 'ok: ' + r.files + ' files materialised from ' + r.source);
    if (r.source === 'missing') process.exitCode = 1;
  }).catch((e) => { log('ERROR: ' + e.message); process.exitCode = 1; });
}
