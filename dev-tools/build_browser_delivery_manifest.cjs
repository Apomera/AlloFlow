#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BEGIN_MARKER = '// BEGIN ALLOFLOW_BROWSER_DELIVERY_POLICY';
const END_MARKER = '// END ALLOFLOW_BROWSER_DELIVERY_POLICY';
const HOST_ANCHOR = 'const ALLO_MB_SCRIPT_VERSION =';
const HOST_FILES = Object.freeze(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']);
const MAX_ASSET_BYTES = 64 * 1024 * 1024;
const MAX_ASSETS = 10000;
const EXTRA_BOOT_ASSETS = Object.freeze([
  'concept_quest_engine.js', 'qrcode.js', 'ui_strings.js',
  'vendor/lz-string-1.4.4.min.js', 'vendor/idb-keyval-6.2.0.umd.min.js'
]);

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}

function assetPath(value) {
  if (typeof value !== 'string' || value.length > 240 || !/\.js$/.test(value)
    || !value.split('/').every((part) => /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part) && !['__proto__', 'constructor', 'prototype'].includes(part))) {
    throw new Error(`Invalid script asset path: ${value}`);
  }
  return value;
}

function readRegular(root, relative) {
  const parts = relative.split('/');
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error(`Asset must not traverse a symlink: ${relative}`);
  }
  const stat = fs.statSync(current);
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_ASSET_BYTES) throw new Error(`Invalid asset size or type: ${relative}`);
  return fs.readFileSync(current);
}

function staticStringArray(source, name) {
  const match = source.match(new RegExp('^const ' + name + ' = \\[([\\s\\S]*?)^\\];', 'm'));
  if (!match) throw new Error(`Missing static ${name} inventory in build.js`);
  return match[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').split(',').map((value) => value.trim()).filter(Boolean).map((value) => {
    const literal = value.match(/^'([A-Za-z0-9_./-]+)'$/);
    if (!literal) throw new Error(`Nonliteral ${name} inventory entry`);
    return literal[1];
  });
}

function discoverAssets(root = ROOT) {
  const publicRoot = path.join(root, 'desktop', 'web-app', 'public');
  const source = fs.readFileSync(path.join(root, 'build.js'), 'utf8');
  const selected = new Set(EXTRA_BOOT_ASSETS);
  for (const name of fs.readdirSync(root)) {
    if (/^[A-Za-z0-9][A-Za-z0-9_-]*(?:_module|_loader)\.js$/.test(name) && fs.existsSync(path.join(publicRoot, name))) selected.add(name);
  }
  const modules = source.match(/^const MODULES = \[([\s\S]*?)^\];/m);
  if (!modules) throw new Error('Missing static MODULES inventory in build.js');
  const filenames = [...modules[1].matchAll(/\bfilename\s*:\s*'([A-Za-z0-9_./-]+)'/g)].map((match) => match[1]);
  if (!filenames.length) throw new Error('Empty static MODULES inventory in build.js');
  filenames.forEach((name) => selected.add(name));
  for (const name of staticStringArray(source, 'PLUGIN_FILES')) if (name.endsWith('.js')) selected.add(name);
  // Include lazy first-party companions, not just the initially injected hub.
  // Public-only or root-only extras are not implicitly approved executable code.
  const directories = new Set(['stem_lab', 'sel_hub', 'plugins', ...staticStringArray(source, 'COMPANION_ASSET_DIRS')]);
  const walk = (relative) => {
    // A source-only developer/plugin directory is not a shipped browser tree.
    if (!fs.existsSync(path.join(publicRoot, relative))) return;
    if (!relative.split('/').every((part) => /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part))) throw new Error(`Invalid companion directory: ${relative}`);
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) return;
    if (fs.lstatSync(absolute).isSymbolicLink()) throw new Error(`Symlink in companion inventory: ${relative}`);
    for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
      const child = relative + '/' + entry.name;
      if (entry.isSymbolicLink()) throw new Error(`Symlink in companion inventory: ${child}`);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && child.endsWith('.js') && fs.existsSync(path.join(publicRoot, child))) selected.add(child);
    }
  };
  directories.forEach(walk);
  const result = [...selected].map(assetPath).sort();
  if (!result.length || result.length > MAX_ASSETS) throw new Error('Invalid script asset count');
  return result;
}

function proveCommit(root, commit, files) {
  if (typeof commit !== 'string' || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Fallback requires an explicit full 40-character commit');
  let resolved;
  try {
    resolved = execFileSync('git', ['rev-parse', '--verify', `${commit}^{commit}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (_) { throw new Error('Fallback commit is not available in the local repository'); }
  if (resolved !== commit) throw new Error('Fallback commit did not resolve exactly');
  const names = Object.keys(files);
  const expectedSize = names.reduce((sum, name) => sum + files[name].length, 0);
  let batch;
  try {
    batch = execFileSync('git', ['cat-file', '--batch'], {
      cwd: root, input: names.map((name) => `${commit}:${name}\n`).join(''),
      maxBuffer: expectedSize + 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (_) { throw new Error('Could not read exact fallback commit asset bytes'); }
  let offset = 0;
  for (const name of names) {
    const newline = batch.indexOf(10, offset);
    const header = batch.subarray(offset, newline).toString('utf8');
    const match = header.match(/^[a-f0-9]{40} blob ([0-9]+)$/);
    if (newline < 0 || !match) throw new Error(`Fallback asset is missing or not a blob: ${name}`);
    const length = Number(match[1]);
    offset = newline + 1;
    if (length !== files[name].length || !batch.subarray(offset, offset + length).equals(files[name])) throw new Error(`Fallback commit bytes differ for ${name}`);
    offset += length;
    if (batch[offset++] !== 10) throw new Error('Malformed git asset byte response');
  }
  if (offset !== batch.length) throw new Error('Unexpected git asset byte response');
  return commit;
}

function buildManifest({ root = ROOT, assets, publicRoot = path.join(root, 'desktop', 'web-app', 'public'), fallbackCommit = null } = {}) {
  root = path.resolve(root);
  publicRoot = path.resolve(publicRoot);
  const names = [...new Set(assets || discoverAssets(root))].map(assetPath).sort();
  if (!names.length || names.length > MAX_ASSETS) throw new Error('Invalid script asset count');
  const records = Object.create(null);
  const bytes = Object.create(null);
  const errors = [];
  for (const name of names) {
    try {
      const source = readRegular(root, name);
      const mirror = readRegular(publicRoot, name);
      if (!source.equals(mirror)) throw new Error(`Root/public asset bytes differ: ${name}`);
      bytes[name] = source;
      records[name] = Object.freeze({ integrity: 'sha384-' + createHash('sha384').update(source).digest('base64'), bytes: source.length });
    } catch (error) {
      errors.push(error.code === 'ENOENT' ? `Missing required root/public asset: ${name}` : error.message);
    }
  }
  if (errors.length) throw new Error(`Asset approval failed (${errors.length}):\n${errors.slice(0, 12).join('\n')}${errors.length > 12 ? '\nAdditional mismatches omitted' : ''}`);
  Object.freeze(records);
  const body = {
    schemaVersion: 1, assets: records,
    fallbackCommit: fallbackCommit === null ? null : proveCommit(root, fallbackCommit, bytes),
    allowDesktopRemoteFallback: false
  };
  const releaseId = createHash('sha256').update(canonical(body)).digest('hex');
  return Object.freeze({ ...body, releaseId });
}

function buildHostBlock(manifest) {
  const policySource = fs.readFileSync(path.join(__dirname, '..', 'browser_delivery_policy.js'), 'utf8').trim();
  // Validate the public contract without executing any supplied asset code.
  const sandbox = { URL };
  const vm = require('node:vm');
  vm.runInNewContext(policySource + '\nthis.factory = _alloCreateBrowserDeliveryPolicy;', sandbox);
  sandbox.factory(manifest, { baseUrl: 'https://alloflow-cdn.pages.dev/' });
  const { releaseId, ...body } = manifest;
  if (createHash('sha256').update(canonical(body)).digest('hex') !== releaseId) throw new Error('Manifest releaseId does not match its contents');
  const json = canonical(manifest).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `${BEGIN_MARKER}\n${policySource}\nconst _alloBrowserDeliveryManifest = (() => {\n  const manifest = ${json};\n  Object.keys(manifest.assets).forEach((name) => Object.freeze(manifest.assets[name]));\n  Object.freeze(manifest.assets);\n  return Object.freeze(manifest);\n})();\n${END_MARKER}`;
}

function replaceHostBlock(source, block) {
  const start = source.indexOf(BEGIN_MARKER);
  const end = source.indexOf(END_MARKER);
  if (start === -1 && end === -1) {
    const anchor = source.indexOf(HOST_ANCHOR);
    if (anchor < 0 || source.indexOf(HOST_ANCHOR, anchor + HOST_ANCHOR.length) !== -1) throw new Error('Host must contain exactly one delivery policy marker pair or insertion anchor');
    return source.slice(0, anchor) + block + '\n\n' + source.slice(anchor);
  }
  if (start < 0 || end < start || source.indexOf(BEGIN_MARKER, start + BEGIN_MARKER.length) !== -1 || source.indexOf(END_MARKER, end + END_MARKER.length) !== -1) throw new Error('Host must contain exactly one delivery policy marker pair');
  return source.slice(0, start) + block + source.slice(end + END_MARKER.length);
}

function readEmbeddedManifest(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 32 * 1024 * 1024) throw new Error('Trusted host source must be bounded text');
  const start = source.indexOf(BEGIN_MARKER);
  const end = source.indexOf(END_MARKER);
  if (start < 0 || end < start || source.indexOf(BEGIN_MARKER, start + BEGIN_MARKER.length) !== -1 || source.indexOf(END_MARKER, end + END_MARKER.length) !== -1) throw new Error('Trusted host must contain exactly one generated delivery block');
  const block = source.slice(start, end + END_MARKER.length);
  // Parse only the generated, single-line JSON literal. Never execute the
  // surrounding host JSX, wrapper, or a supplied manifest expression.
  const literal = block.match(/\nconst _alloBrowserDeliveryManifest = \(\(\) => \{\n  const manifest = ([^\r\n]+);\n/);
  if (!literal) throw new Error('Trusted host has no canonical generated manifest literal');
  let manifest;
  try { manifest = JSON.parse(literal[1]); } catch (_) { throw new Error('Trusted host manifest is not JSON'); }
  if (buildHostBlock(manifest) !== block) throw new Error('Trusted host delivery block is stale or modified; regenerate it from reviewed source bytes');
  return manifest;
}

function assertHostCurrent({ root = ROOT, hostFile = 'desktop/web-app/src/App.jsx' } = {}) {
  root = path.resolve(root);
  const absoluteHost = path.resolve(root, hostFile);
  if (!absoluteHost.startsWith(root + path.sep)) throw new Error('Trusted host must stay inside the selected source root');
  const relativeHost = path.relative(root, absoluteHost).split(path.sep).join('/');
  const manifest = readEmbeddedManifest(readRegular(root, relativeHost).toString('utf8'));
  const current = buildManifest({ root, fallbackCommit: manifest.fallbackCommit });
  if (canonical(current) !== canonical(manifest)) throw new Error('Trusted host delivery manifest is stale for current root/public bytes; regenerate it before building');
  return manifest;
}

function assertBuiltDelivery({ root = ROOT, buildDir, hostFile = 'desktop/web-app/src/App.jsx' } = {}) {
  if (typeof buildDir !== 'string' || !buildDir) throw new Error('An explicit built artifact directory is required');
  buildDir = path.resolve(buildDir);
  if (fs.lstatSync(buildDir).isSymbolicLink()) throw new Error('Built artifact directory must not be a symlink');
  const manifest = assertHostCurrent({ root, hostFile });
  const html = readRegular(buildDir, 'index.html').toString('utf8');
  const mainReferences = [...html.matchAll(/\bsrc=["']((?:\.\/|\/)?static\/js\/main\.[a-f0-9]+\.js)["']/g)];
  if (mainReferences.length !== 1) throw new Error('Built delivery requires exactly one content-hashed main script reference');
  const mainPath = mainReferences[0][1].replace(/^(?:\.\/|\/)/, '');
  const mainBytes = readRegular(buildDir, mainPath);
  // This catches stale/incomplete CRA output. It is an identity marker, not a
  // substitute for trusting the compiler and reviewed build inputs.
  if (!mainBytes.includes(Buffer.from(manifest.releaseId))) throw new Error('Built main script does not contain the trusted delivery release identity; rebuild the compiled shell');
  const errors = [];
  for (const [name, expected] of Object.entries(manifest.assets)) {
    try {
      const actual = readRegular(buildDir, name);
      if (actual.length !== expected.bytes || 'sha384-' + createHash('sha384').update(actual).digest('base64') !== expected.integrity) throw new Error(`Built asset bytes differ from trusted host: ${name}`);
    } catch (error) {
      errors.push(error.code === 'ENOENT' ? `Missing built delivery asset: ${name}` : error.message);
    }
  }
  if (errors.length) throw new Error(`Built delivery approval failed (${errors.length}):\n${errors.slice(0, 12).join('\n')}${errors.length > 12 ? '\nAdditional mismatches omitted' : ''}`);
  return { releaseId: manifest.releaseId, assetCount: Object.keys(manifest.assets).length };
}

function run(argv = process.argv.slice(2)) {
  let root = ROOT;
  let fallbackCommit = null;
  let sync = false;
  let host = null;
  for (const arg of argv) {
    if (arg === '--check') continue;
    if (arg === '--sync') sync = true;
    else if (arg.startsWith('--root=')) root = path.resolve(arg.slice(7));
    else if (arg.startsWith('--fallback-commit=')) fallbackCommit = arg.slice(18);
    else if (arg.startsWith('--host=')) host = arg.slice(7);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  const manifest = buildManifest({ root, fallbackCommit });
  const block = buildHostBlock(manifest);
  if (host !== null) {
    if (!HOST_FILES.includes(host)) throw new Error('Select a known canonical host or generated host mirror');
    const target = path.resolve(root, host);
    if (target === root || !target.startsWith(root + path.sep)) throw new Error('Host path must stay inside the selected root');
    const source = fs.readFileSync(target, 'utf8');
    const next = replaceHostBlock(source, block);
    if (sync) fs.writeFileSync(target, next);
    else if (next !== source) throw new Error('Embedded delivery policy is stale; use explicit --sync after reviewing the asset bytes');
  } else if (sync) throw new Error('--sync requires an explicit --host path');
  console.log(`Browser delivery manifest ${manifest.releaseId}: ${Object.keys(manifest.assets).length} assets; immutable fallback ${manifest.fallbackCommit || 'disabled'}${host ? (sync ? '; host synchronized' : '; host current') : '; read-only validation'}`);
  return manifest;
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { BEGIN_MARKER, END_MARKER, HOST_ANCHOR, HOST_FILES, MAX_ASSET_BYTES, EXTRA_BOOT_ASSETS, canonical, discoverAssets, buildManifest, buildHostBlock, replaceHostBlock, readEmbeddedManifest, assertHostCurrent, assertBuiltDelivery, run };
