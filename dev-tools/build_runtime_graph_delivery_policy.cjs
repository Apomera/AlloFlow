#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { canonical, HOSTS } = require('./build_optional_browser_delivery_policy.cjs');
const ROOT = path.resolve(__dirname, '..');
const BEGIN = '// BEGIN ALLOFLOW_RUNTIME_GRAPH_DELIVERY_POLICY';
const END = '// END ALLOFLOW_RUNTIME_GRAPH_DELIVERY_POLICY';
const SOURCES = ['runtime_graph_delivery_policy.js', 'runtime_graph_host.js'];
const CATALOGS = ['engine_runtime_integrity.json', 'document_runtime_integrity.json', 'data_kernel_runtime_integrity.json'];
function regular(root, relative) {
  if (!relative.split('/').every(part => /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part) && !['constructor', 'prototype'].includes(part))) throw Error('Unsafe runtime path');
  let file = path.resolve(root);
  for (const part of relative.split('/')) { file = path.join(file, part); if (fs.lstatSync(file).isSymbolicLink()) throw Error('Runtime path is a symlink: ' + relative); }
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 128 * 1024 * 1024) throw Error('Runtime file is not bounded: ' + relative);
  return fs.readFileSync(file);
}
function sources(root = ROOT) { return SOURCES.map(file => regular(root, file).toString('utf8').replace(/\r\n/g, '\n').trim()); }
function readManifest(root = ROOT) {
  const result = { schemaVersion: 1, assets: {}, graphs: {} };
  for (const file of CATALOGS) {
    const catalog = JSON.parse(regular(root, file));
    if (catalog.schemaVersion !== 1) throw Error('Unknown runtime catalog');
    for (const field of ['assets', 'graphs']) for (const [key, value] of Object.entries(catalog[field])) {
      if (Object.hasOwn(result[field], key)) throw Error('Duplicate runtime record: ' + key);
      result[field][key] = value;
    }
  }
  const context = vm.createContext({ URL });
  vm.runInContext(sources(root)[0], context);
  context._alloCreateRuntimeGraphDeliveryPolicy(result, { baseUrl: 'https://alloflow-cdn.pages.dev/' });
  return result;
}
function assertRuntimeAssets({ root = ROOT, buildDir } = {}) {
  const manifest = readManifest(root), records = [], checked = new Map();
  const bytesFor = (id, chain = []) => {
    if (chain.includes(id)) throw Error('Cyclic runtime parts');
    if (checked.has(id)) return checked.get(id);
    const record = manifest.assets[id];
    const bytes = record.parts?.length ? Buffer.concat(record.parts.map(child => bytesFor(child, [...chain, id]))) : regular(root, record.path);
    if (bytes.length !== record.bytes || createHash('sha384').update(bytes).digest('hex') !== record.sha384) throw Error('Reviewed runtime bytes differ: ' + id);
    if (record.kind === 'module') require('./build_browser_runtime_graphs.cjs').assertClosedCode(bytes.toString('utf8'));
    if (record.path) {
      if (!regular(path.join(root, 'desktop/web-app/public'), record.path).equals(bytes)) throw Error('Root/public runtime bytes differ: ' + id);
      if (buildDir && !regular(buildDir, record.path).equals(bytes)) throw Error('Built runtime bytes differ: ' + id);
      records.push({ id, asset: record.path, bytes: record.bytes, sha384: record.sha384 });
    }
    checked.set(id, bytes); return bytes;
  };
  Object.keys(manifest.assets).forEach(id => bytesFor(id));
  return { manifest, records };
}
function policyId(manifest, root = ROOT) { return createHash('sha256').update(canonical(manifest) + '\0' + sources(root).join('\0')).digest('hex'); }
function buildBlock(manifest, root = ROOT) {
  const json = canonical(manifest).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `${BEGIN}\n${sources(root).join('\n')}\nconst _alloRuntimeGraphDeliveryId = '${policyId(manifest, root)}';\nconst _alloRuntimeGraphManifest = ${json};\nconst _alloRuntimeGraphPolicy = typeof window !== 'undefined' && typeof document !== 'undefined' ? _alloInstallRuntimeGraphHost(_alloRuntimeGraphManifest, window) : null;\n${END}`;
}
function replaceBlock(source, block) {
  const start = source.indexOf(BEGIN), end = source.indexOf(END);
  if (start < 0 && end < 0) {
    const anchor = source.indexOf("if (typeof window !== 'undefined' && typeof document !== 'undefined') {");
    // The first such expression is inside the optional policy function. Insert
    // after the complete optional generated block instead.
    const optionalEnd = source.indexOf('// END ALLOFLOW_OPTIONAL_BROWSER_DELIVERY_POLICY');
    if (anchor < 0 || optionalEnd < 0) throw Error('Runtime insertion anchor missing');
    const offset = optionalEnd + '// END ALLOFLOW_OPTIONAL_BROWSER_DELIVERY_POLICY'.length;
    return source.slice(0, offset) + '\n\n' + block + source.slice(offset);
  }
  if (start < 0 || end < start || source.indexOf(BEGIN, start + BEGIN.length) >= 0 || source.indexOf(END, end + END.length) >= 0) throw Error('Ambiguous runtime block');
  return source.slice(0, start) + block + source.slice(end + END.length);
}
function assertRuntimeHost({ root = ROOT, hostFile = 'desktop/web-app/src/App.jsx', buildDir } = {}) {
  if (!HOSTS.includes(hostFile)) throw Error('Unknown trusted host');
  const result = assertRuntimeAssets({ root, buildDir }), source = regular(root, hostFile).toString('utf8');
  if (replaceBlock(source, buildBlock(result.manifest, root)) !== source) throw Error('Runtime graph host block is stale');
  const id = policyId(result.manifest, root);
  if (buildDir) {
    const html = regular(buildDir, 'index.html').toString('utf8');
    const main = [...html.matchAll(/\bsrc=["'](?:\.\/|\/)?(static\/js\/main\.[a-f0-9]+\.js)["']/g)];
    if (main.length !== 1 || !regular(buildDir, main[0][1]).includes(Buffer.from(id))) throw Error('Compiled runtime graph policy is stale');
    require('./check_private_loader_coverage.cjs').assertPrivateLoaderCoverage({ root, buildDir });
  }
  return { id, records: result.records, graphs: Object.keys(result.manifest.graphs).length };
}
if (require.main === module) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw Error('Only read-only --check is supported; use reviewed host patches');
    const result = assertRuntimeAssets(); console.log(JSON.stringify({ assets: result.records.length, graphs: Object.keys(result.manifest.graphs).length, id: policyId(result.manifest) }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { ROOT, BEGIN, END, HOSTS, CATALOGS, SOURCES, regular, readManifest, assertRuntimeAssets, policyId, buildBlock, replaceBlock, assertRuntimeHost };
