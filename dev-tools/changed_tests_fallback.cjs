// Fallback for check_changed_tests.cjs when `vitest related` cannot resolve the
// import graph. On Windows a large tree (2,300+ test files) can exhaust file handles
// mid-resolve: vitest dies with "EMFILE: too many open files" before running a test,
// and the gate used to report that as "a test covering this change is red".
//
// The fallback picks the tests that NAME a changed file (its basename, or its stem
// for *_module / *_source pairs) plus changed test files themselves. That is
// narrower than the import graph, so the gate says it used it; it never passes a
// change no test names without saying so.
'use strict';

const fs = require('fs');
const path = require('path');

// vitest died before judging anything: an EMFILE crash and no "Tests N ..." summary.
function isHandleExhaustion(output) {
  const text = String(output || '');
  return /EMFILE: too many open files/.test(text) && !/^\s*Tests\s+\d/m.test(text);
}

// Names a test would use for a changed file: "personas_module.js", and the shared
// stem "personas" for a compiled pair, so a test reading the source also counts.
function namesFor(file) {
  const base = path.posix.basename(String(file).replace(/\\/g, '/'));
  const names = new Set([base]);
  const pair = base.match(/^(.+?)_(module\.js|source\.jsx)$/);
  if (pair) { names.add(pair[1] + '_module.js'); names.add(pair[1] + '_source.jsx'); }
  return [...names];
}

const TEST_FILE = /\.test\.(?:[cm]?js|jsx|ts|tsx)$/;

function listTestFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (TEST_FILE.test(entry.name)) out.push(path.relative(root, full).replace(/\\/g, '/'));
    }
  };
  walk(path.join(root, 'tests'));
  return out.sort();
}

// tests/... paths that should run for `changed` (repo-relative paths).
function selectTests(changed, testFiles, readFile, quarantined = []) {
  const skip = new Set(quarantined.map((f) => String(f).replace(/\\/g, '/')));
  const wanted = new Set();
  const names = [...new Set(changed.flatMap(namesFor))];
  for (const file of changed) {
    const rel = String(file).replace(/\\/g, '/');
    if (TEST_FILE.test(rel) && testFiles.includes(rel)) wanted.add(rel);
  }
  for (const test of testFiles) {
    if (wanted.has(test)) continue;
    let text = '';
    try { text = readFile(test); } catch (_) { continue; }
    if (names.some((name) => text.includes(name))) wanted.add(test);
  }
  return [...wanted].filter((t) => !skip.has(t)).sort();
}

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

module.exports = { isHandleExhaustion, namesFor, listTestFiles, selectTests, chunk };
