#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const BEGIN = '// BEGIN ALLOFLOW_OPTIONAL_BROWSER_DELIVERY_POLICY';
const END = '// END ALLOFLOW_OPTIONAL_BROWSER_DELIVERY_POLICY';
const ANCHOR = "if (typeof window !== 'undefined' && typeof document !== 'undefined') {";
const HOSTS = Object.freeze(['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']);
// These existing reviewed vendored files are shipped from public/, rather than
// copied from the repository root. No other missing root mirror is permitted.
const PUBLIC_ONLY = new Set(['vendor/jsonrepair-3.15.0.min.js', 'vendor/jszip-3.10.1.min.js', 'vendor/pptxgenjs-3.12.0.bundle.js']);
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function regular(root, relative) {
  if (!relative.split('/').every(part => /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part))) throw new Error('Invalid vendor path');
  let target = path.resolve(root);
  for (const part of relative.split('/')) {
    target = path.join(target, part);
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error('Vendor asset traverses a symbolic link: ' + relative);
  }
  const stat = fs.statSync(target);
  if (!stat.isFile() || stat.size <= 0 || stat.size > 64 * 1024 * 1024) throw new Error('Invalid vendor file: ' + relative);
  return fs.readFileSync(target);
}
function readCatalog(root = ROOT) {
  const catalog = JSON.parse(regular(root, 'browser_vendor_integrity.json').toString('utf8'));
  const context = vm.createContext({ URL });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'optional_browser_delivery_policy.js'), 'utf8'), context);
  context._alloCreateOptionalBrowserDeliveryPolicy(catalog, { baseUrl: 'https://alloflow-cdn.pages.dev/' });
  return catalog;
}
function assertVendorAssets({ root = ROOT, buildDir } = {}) {
  const catalog = readCatalog(root), records = [];
  for (const [key, record] of Object.entries(catalog.libraries)) {
    if (record.asset === null) continue;
    const bytes = regular(path.join(root, 'desktop/web-app/public'), record.asset);
    const integrity = 'sha384-' + createHash('sha384').update(bytes).digest('base64');
    if (bytes.length !== record.bytes || integrity !== record.integrity) throw new Error('Reviewed public vendor bytes differ: ' + record.asset);
    if (fs.existsSync(path.join(root, record.asset)) || !PUBLIC_ONLY.has(record.asset)) {
      if (!regular(root, record.asset).equals(bytes)) throw new Error('Root/public vendor bytes differ: ' + record.asset);
    }
    if (buildDir && !regular(buildDir, record.asset).equals(bytes)) throw new Error('Built vendor bytes differ: ' + record.asset);
    records.push({ key, asset: record.asset, integrity, bytes: bytes.length });
  }
  return { catalog, records };
}
function policySources() {
  return ['optional_browser_delivery_policy.js', 'optional_browser_loader.js'].map(file => fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n').trim());
}
function policyId(catalog) {
  return createHash('sha256').update(canonical(catalog) + '\0' + policySources().join('\0')).digest('hex');
}
function buildBlock(catalog) {
  const context = vm.createContext({ URL });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'optional_browser_delivery_policy.js'), 'utf8'), context);
  context._alloCreateOptionalBrowserDeliveryPolicy(catalog, { baseUrl: 'https://alloflow-cdn.pages.dev/' });
  const json = canonical(catalog).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const id = policyId(catalog);
  const [policy, loader] = policySources();
  return `${BEGIN}\n${policy}\n${loader}\nconst _alloOptionalBrowserDeliveryId = '${id}';\nconst _alloOptionalBrowserDeliveryManifest = ${json};\nObject.values(_alloOptionalBrowserDeliveryManifest.libraries).forEach(record => { record.mirrors.forEach(Object.freeze); Object.freeze(record.mirrors); Object.freeze(record); });\nObject.freeze(_alloOptionalBrowserDeliveryManifest.libraries);\nObject.freeze(_alloOptionalBrowserDeliveryManifest);\n${END}`;
}
function replaceBlock(source, block) {
  const start = source.indexOf(BEGIN), end = source.indexOf(END);
  if (start < 0 && end < 0) {
    const anchor = source.indexOf(ANCHOR);
    if (anchor < 0 || anchor > 20000 || !source.slice(0, anchor).includes('import React')) throw new Error('Optional delivery insertion anchor missing');
    return source.slice(0, anchor) + block + '\n\n' + source.slice(anchor);
  }
  if (start < 0 || end < start || source.indexOf(BEGIN, start + BEGIN.length) >= 0 || source.indexOf(END, end + END.length) >= 0) throw new Error('Ambiguous optional delivery block');
  return source.slice(0, start) + block + source.slice(end + END.length);
}
function assertOptionalHost({ root = ROOT, hostFile = 'desktop/web-app/src/App.jsx', buildDir } = {}) {
  if (!HOSTS.includes(hostFile)) throw new Error('Unknown trusted host');
  const result = assertVendorAssets({ root, buildDir });
  const source = regular(root, hostFile).toString('utf8');
  const block = buildBlock(result.catalog);
  if (replaceBlock(source, block) !== source) throw new Error('Optional vendor host policy is stale; synchronize the reviewed block');
  const id = policyId(result.catalog);
  if (buildDir) {
    const html = regular(buildDir, 'index.html').toString('utf8');
    const main = [...html.matchAll(/\bsrc=["'](?:\.\/|\/)?(static\/js\/main\.[a-f0-9]+\.js)["']/g)];
    if (main.length !== 1 || !regular(buildDir, main[0][1]).includes(Buffer.from(id))) throw new Error('Compiled optional vendor policy is stale');
  }
  return { id, records: result.records };
}
function run(args = process.argv.slice(2)) {
  let host, sync = false;
  for (const arg of args) {
    if (arg === '--check') continue;
    if (arg === '--sync') sync = true;
    else if (arg.startsWith('--host=')) host = arg.slice(7);
    else throw new Error('Unknown argument: ' + arg);
  }
  const { catalog, records } = assertVendorAssets();
  if (host) {
    if (!HOSTS.includes(host)) throw new Error('Unknown trusted host');
    const file = path.join(ROOT, host), before = fs.readFileSync(file, 'utf8'), after = replaceBlock(before, buildBlock(catalog));
    if (sync) {
      // A concurrent edit is a conflict, never authority to overwrite it.
      if (fs.readFileSync(file, 'utf8') !== before) throw new Error('Host changed while preparing optional policy');
      if (before !== after) fs.writeFileSync(file, after);
    } else if (before !== after) throw new Error('Optional vendor policy is stale');
  } else if (sync) throw new Error('--sync requires a known host');
  console.log('Optional browser policy: ' + Object.keys(catalog.libraries).length + ' pinned libraries; ' + records.length + ' checked local assets; ' + (host || 'read-only validation'));
}
if (require.main === module) { try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { BEGIN, END, HOSTS, canonical, policyId, readCatalog, assertVendorAssets, buildBlock, replaceBlock, assertOptionalHost, run };
