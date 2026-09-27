#!/usr/bin/env node
'use strict';
// Read-only local evidence. No build entry point, runtime module, app, network,
// Git mutation, cache installation or report file is invoked/written here.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const parser = require('@babel/parser'), traverse = require('@babel/traverse').default;
const { INPUTS, OUTPUTS, renderReaderModule } = require('./lib/reader_compiler.cjs');
const ROOT = path.resolve(__dirname, '..');
const HOSTS = Object.freeze(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']);
const PATHS = Object.freeze([...INPUTS, ...OUTPUTS, ...HOSTS, '_build_view_simplified_module.js', 'dev-tools/lib/reader_compiler.cjs', 'dev-tools/check_reader_release.cjs']);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const head = root => execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim();

function readerLoaders(source) {
  const loaders = [];
  const ast = parser.parse(source, { sourceType: 'unambiguous', plugins: ['jsx'] });
  traverse(ast, { CallExpression(p) {
    const node = p.node;
    if (node.callee.type !== 'Identifier' || node.callee.name !== 'loadModule' || node.arguments[0]?.type !== 'StringLiteral' || node.arguments[0].value !== 'ViewSimplifiedModule') return;
    const value = node.arguments[1];
    loaders.push({ line: node.loc.start.line, url: value?.type === 'StringLiteral' ? value.value : null });
  } });
  return loaders;
}

function verifyReaderRelease(options = {}) {
  const root = path.resolve(options.root || ROOT), read = options.read || (file => fs.readFileSync(file));
  const readHead = options.readHead || (() => head(root)), render = options.render || renderReaderModule;
  const errors = [], bytes = new Map(), files = {}, pins = {}, stability = [];
  const error = (code, file, message) => errors.push({ code, ...(file ? { file } : {}), message });
  let startHead = null, endHead = null, expectedHash = null;
  try { startHead = readHead(); } catch (cause) { error('git-unavailable', null, 'Could not read HEAD: ' + cause.message); }
  if (options.expectedHead && startHead !== options.expectedHead) error('unexpected-head', null, 'Expected HEAD ' + options.expectedHead + ', found ' + startHead);
  for (const file of PATHS) {
    try {
      const data = Buffer.from(read(path.join(root, file)));
      bytes.set(file, data); files[file] = { bytes: data.length, sha256: hash(data) };
    } catch (cause) { files[file] = { error: cause.code || cause.message }; error('unreadable-file', file, 'Required input or output is unavailable.'); }
  }
  if (INPUTS.every(file => bytes.has(file))) {
    try {
      const expected = Buffer.from(render(INPUTS.map(file => bytes.get(file).toString('utf8'))));
      expectedHash = hash(expected);
      for (const file of OUTPUTS) if (bytes.has(file) && !bytes.get(file).equals(expected)) {
        error('stale-generated-output', file, 'Output differs from the canonical inputs compiled in memory. Expected SHA-256 ' + expectedHash + '.');
      }
    } catch (cause) { error('compile-failed', null, cause.message); }
  }
  const mirrorsMatch = OUTPUTS.every(file => bytes.has(file)) && bytes.get(OUTPUTS[0]).equals(bytes.get(OUTPUTS[1]));
  if (!mirrorsMatch) error('reader-mirror-drift', null, 'The two reader outputs must exist and match exactly.');
  const hostsMatch = HOSTS.every(file => bytes.has(file) && bytes.get(file).equals(bytes.get(HOSTS[0]) || Buffer.alloc(0)));
  if (!hostsMatch) error('host-mirror-drift', null, 'The canonical host and both source mirrors must match exactly.');
  const actualHash = files[OUTPUTS[0]]?.sha256;
  const expectedUrl = actualHash ? 'https://alloflow-cdn.pages.dev/view_simplified_module.js?v=' + actualHash.slice(0, 8) : null;
  const parsed = new Map();
  for (const file of HOSTS) {
    if (!bytes.has(file)) continue;
    try {
      const digest = files[file].sha256;
      if (!parsed.has(digest)) parsed.set(digest, readerLoaders(bytes.get(file).toString('utf8')));
      pins[file] = parsed.get(digest);
      if (pins[file].length !== 1) error('reader-loader-count', file, 'Expected exactly one executable ViewSimplifiedModule loader, found ' + pins[file].length + '.');
      else if (!expectedUrl || pins[file][0].url !== expectedUrl) error('reader-pin-mismatch', file, 'Loader URL must be the exact reader content-hash URL: ' + expectedUrl);
    } catch (cause) { error('host-parse-failed', file, cause.message); }
  }
  // A mixed snapshot from another writer must never be certified as coherent.
  for (const file of PATHS) {
    try {
      const digest = hash(read(path.join(root, file)));
      if (digest !== files[file]?.sha256) { stability.push(file); error('input-changed', file, 'File changed during verification; rerun after the writer finishes.'); }
    } catch (_) { if (bytes.has(file)) { stability.push(file); error('input-changed', file, 'File became unreadable during verification.'); } }
  }
  try { endHead = readHead(); } catch (cause) { error('git-unavailable', null, 'Could not recheck HEAD: ' + cause.message); }
  if (startHead !== endHead) error('head-changed', null, 'HEAD changed during verification; inspect the new baseline and rerun.');
  return { schemaVersion: 1, at: new Date().toISOString(), scope: 'local-reader-source-output-and-hosts', root, startHead, endHead,
    compiler: { babelVersion: require('@babel/core/package.json').version, jsxPluginVersion: require('@babel/plugin-transform-react-jsx/package.json').version },
    expectedModuleSha256: expectedHash, files, mirrorsMatch, hostsMatch, pins, changedDuringCheck: stability,
    ok: errors.length === 0, errors,
    limits: ['Does not verify app-shell builds, every module, locales, runtime behavior or deployed bytes.', 'HEAD identifies Git history; file hashes identify this working snapshot. No clean-working-tree claim.', 'Concurrent edits after this check require revalidation.'] };
}

function parseArgs(args) {
  const parsed = { json: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && !parsed.json) parsed.json = true;
    else if (args[i] === '--help' && !parsed.help) parsed.help = true;
    else if (args[i] === '--expect-head' && !parsed.expectedHead && /^[0-9a-f]{40}$/i.test(args[i + 1] || '')) parsed.expectedHead = args[++i].toLowerCase();
    else throw new Error('Usage: node dev-tools/check_reader_release.cjs [--json] [--expect-head FULL_SHA]');
  }
  return parsed;
}
if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) console.log('Read-only: compile canonical reader inputs in memory, compare both outputs, parse host loader pins, and recheck all fingerprints/HEAD. --json prints a manifest to stdout. --expect-head FULL_SHA pins the inspected baseline. Does not verify deployment.');
    else {
      const report = verifyReaderRelease(options);
      if (options.json) console.log(JSON.stringify(report, null, 2));
      else {
        console.log((report.ok ? 'PASS' : 'FAIL') + ' local reader release consistency; HEAD ' + report.startHead);
        if (report.expectedModuleSha256) console.log('Canonical reader SHA-256: ' + report.expectedModuleSha256);
        for (const issue of report.errors) console.error(issue.code + (issue.file ? ' [' + issue.file + ']' : '') + ': ' + issue.message);
        console.log('Read-only local check; deployed bytes and runtime behavior remain separate checks.');
      }
      if (!report.ok) process.exitCode = 1;
    }
  } catch (cause) { console.error(cause.message); process.exitCode = 2; }
}
module.exports = { HOSTS, PATHS, readerLoaders, verifyReaderRelease, parseArgs };
