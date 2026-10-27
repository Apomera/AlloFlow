#!/usr/bin/env node
'use strict';

// Reproduce the reviewed DuckDB adapter from the unchanged, pinned local source.
// No network access, npm lifecycle scripts, models, or existing asset overwrites.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const acorn = require('acorn');
const { assertClosedCode } = require('./build_browser_runtime_graphs.cjs');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = Object.freeze({ path: 'duckdb-assets/duckdb-browser.mjs', bytes: 227413,
  sha384: '509d389b8b9b15ec67f42071c157902115846890f5b049de48207974f63a99f94b9fa94448ff93c32b40fcb9c90898ef' });
const CATALOG = 'data_kernel_runtime_integrity.json';
const PROVENANCE = 'data_kernel_runtime_provenance.json';
const sha384 = bytes => createHash('sha384').update(bytes).digest('hex');
function walk(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (node.type) visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node));
    else if (value && typeof value === 'object') walk(value, visit, node);
  }
}
function closeModule(input) {
  const bytes = Buffer.from(input);
  if (bytes.length !== SOURCE.bytes || sha384(bytes) !== SOURCE.sha384) throw Error('Pinned DuckDB source bytes changed');
  const source = bytes.toString('utf8'), tree = acorn.parse(source, { sourceType: 'module', ecmaVersion: 'latest' });
  const exports = tree.body.filter(node => node.type === 'ExportNamedDeclaration').flatMap(node => node.specifiers || [])
    .filter(node => node.exported.name === 'createWorker');
  if (exports.length !== 1) throw Error('DuckDB createWorker export anchor changed');
  const helpers = tree.body.filter(node => node.type === 'FunctionDeclaration' && node.id.name === exports[0].local.name);
  if (helpers.length !== 1) throw Error('DuckDB createWorker function anchor changed');
  const edits = [];
  walk(tree, (node, parent) => {
    if (node.type === 'Identifier' && node.name === 'Worker' && parent?.type === 'AssignmentExpression'
      && parent.right === node && parent.left.type === 'MemberExpression' && !parent.left.computed
      && parent.left.property.name === 'exports') edits.push({ start: node.start, end: node.end,
        expected: 'Worker', replacement: '__alloRuntimeWorker', purpose: 'Bind the browser Worker adapter to the verified graph capability' });
  });
  walk(helpers[0], node => {
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
      edits.push({ start: node.callee.start, end: node.callee.end, expected: 'fetch', replacement: '__alloRuntimeFetch',
        purpose: 'Limit the exported worker factory fetch to its verified graph' });
    }
  });
  if (edits.length !== 2 || edits.filter(edit => edit.expected === 'Worker').length !== 1
    || edits.filter(edit => edit.expected === 'fetch').length !== 1) throw Error('DuckDB capability patch anchors changed');
  let output = source;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    if (output.slice(edit.start, edit.end) !== edit.expected) throw Error('DuckDB capability patch bytes changed');
    output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  }
  assertClosedCode(output);
  const result = Buffer.from(output), digest = sha384(result);
  const record = { kind: 'module', path: 'runtime_assets/data-kernel/duckdb.closed.' + digest.slice(0, 24) + '.mjs',
    bytes: result.length, sha384: digest, mirrors: [], closed: true };
  return { bytes: result, record, provenance: { schemaVersion: 1, source: SOURCE,
    output: { path: record.path, bytes: record.bytes, sha384: digest }, transformations: edits, modelsDownloaded: false } };
}
function safeFile(root, relative, { missing = false } = {}) {
  let file = path.resolve(root);
  if (fs.lstatSync(file).isSymbolicLink()) throw Error('DuckDB build root is a symlink');
  for (const part of relative.split('/')) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(part)) throw Error('Invalid DuckDB build path');
    file = path.join(file, part);
    if (!fs.existsSync(file)) { if (missing) continue; throw Error('Missing DuckDB build file: ' + relative); }
    if (fs.lstatSync(file).isSymbolicLink()) throw Error('DuckDB build path is a symlink: ' + relative);
  }
  return file;
}
function build({ root = ROOT, write = false } = {}) {
  const sourceFile = safeFile(root, SOURCE.path), sourceStat = fs.statSync(sourceFile);
  if (!sourceStat.isFile() || sourceStat.size !== SOURCE.bytes) throw Error('Pinned DuckDB source bytes changed');
  const result = closeModule(fs.readFileSync(sourceFile));
  const catalogFile = safeFile(root, CATALOG), before = fs.readFileSync(catalogFile), catalog = JSON.parse(before);
  const current = catalog.assets?.['duckdb.module'];
  const original = current && current.path === SOURCE.path && current.bytes === SOURCE.bytes && current.sha384 === SOURCE.sha384;
  if (!current || (!original && JSON.stringify(current) !== JSON.stringify(result.record))) throw Error('DuckDB catalog entry changed concurrently');
  const outputs = [[result.record.path, result.bytes], ['desktop/web-app/public/' + result.record.path, result.bytes],
    [PROVENANCE, Buffer.from(JSON.stringify(result.provenance, null, 2) + '\n')]];
  for (const [relative, bytes] of outputs) {
    const file = safeFile(root, relative, { missing: write });
    if (fs.existsSync(file) && (!fs.statSync(file).isFile() || !fs.readFileSync(file).equals(bytes))) throw Error('Existing DuckDB output differs: ' + relative);
    if (!write && !fs.existsSync(file)) throw Error('Missing closed DuckDB output: ' + relative);
  }
  if (!write && original) throw Error('DuckDB catalog still selects the native Worker adapter');
  if (write) {
    for (const [relative, bytes] of outputs) {
      const file = safeFile(root, relative, { missing: true });
      if (!fs.existsSync(file)) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' }); }
    }
    if (original) {
      if (!fs.readFileSync(catalogFile).equals(before)) throw Error('DuckDB catalog changed concurrently');
      catalog.assets['duckdb.module'] = result.record;
      fs.writeFileSync(catalogFile, JSON.stringify(catalog, null, 2) + '\n');
    }
  }
  return result;
}
if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some(arg => !['--check', '--write'].includes(arg)) || args.includes('--check') && args.includes('--write')) throw Error('Use --check or explicit --write');
    const result = build({ write: args.includes('--write') });
    console.log(JSON.stringify({ ...result.record, provenance: PROVENANCE }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { ROOT, SOURCE, CATALOG, PROVENANCE, closeModule, build };
