#!/usr/bin/env node
/**
 * check_test_sync — map changed source files to the tests that cover them.
 *
 * WHY THIS EXISTS
 * deploy.sh runs seventeen static gates and ZERO vitest. Those gates catch
 * crashes, free variables and contract drift, but nothing tells you that the
 * tool you just edited has a render golden, or a behaviour suite, or a WebGL
 * spec that now needs re-running or re-baselining. The failure is silent and
 * routine: a tool changes, its snapshot goes stale, and the next person to run
 * the suite inherits a red test they did not cause and cannot safely fix.
 *
 * So this answers one question: "I touched these files. What must I run?"
 *
 * Coverage is DERIVED, never hand-maintained. A test covers a source file if
 * it names the file path, its basename, or the tool id the file registers.
 * A hand-written map would rot the first time somebody added a test.
 *
 * USAGE
 *   node dev-tools/check_test_sync.cjs              # report what covers the working diff
 *   node dev-tools/check_test_sync.cjs --run        # ...and actually run those tests
 *   node dev-tools/check_test_sync.cjs --strict     # exit 1 if a changed file has no test
 *   node dev-tools/check_test_sync.cjs --quiet      # findings only
 *   node dev-tools/check_test_sync.cjs <paths...>   # explicit files instead of the git diff
 *   node dev-tools/check_test_sync.cjs --hook       # PostToolUse hook: stdin JSON in, context out
 *
 * --hook does its own JSON parsing on purpose. The documented hook idiom pipes
 * through `jq`, and jq is NOT installed on this machine — that pipeline would
 * fail silently and the hook would look configured while doing nothing.
 *
 * Exit codes: 0 clean/advisory, 1 strict violation or a failing test run.
 */
'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const FLAG = (f) => argv.includes(f);
const QUIET = FLAG('--quiet');
const STRICT = FLAG('--strict');
const RUN = FLAG('--run');
const explicit = argv.filter((a) => !a.startsWith('--'));

const TEST_DIRS = ['tests'];
// Source trees worth tracking. The public mirror is a byte copy, so a change
// there is reported against its root original rather than twice.
const SOURCE_PREFIXES = ['stem_lab/', 'sel_lab/', 'dev-tools/', 'desktop/web-app/src/'];
const MIRROR_PREFIX = 'desktop/web-app/public/';

function sh(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
  catch { return ''; }
}

/** Absolute or backslashed path -> repo-relative POSIX path. */
function toRepoRel(p) {
  if (!p) return '';
  let s = String(p).replace(/\\/g, '/');
  const root = ROOT.replace(/\\/g, '/');
  if (s.toLowerCase().startsWith(root.toLowerCase())) s = s.slice(root.length);
  return s.replace(/^\/+/, '');
}

function changedFiles() {
  if (explicit.length) return explicit.map(toRepoRel);
  const tracked = sh('git diff --name-only HEAD').split('\n');
  const untracked = sh('git ls-files --others --exclude-standard').split('\n');
  return [...new Set([...tracked, ...untracked])].map((s) => s.trim()).filter(Boolean);
}

function isSource(rel) {
  if (rel.startsWith(MIRROR_PREFIX)) return false;         // mirror of a root file
  if (rel.startsWith('tests/')) return false;              // tests are not subjects
  return SOURCE_PREFIXES.some((p) => rel.startsWith(p)) && /\.(js|jsx|cjs|mjs)$/.test(rel);
}

/** Tool ids a source file registers, e.g. registerTool('petsLab', ...). */
function toolIds(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  let src = '';
  try { src = fs.readFileSync(abs, 'utf8'); } catch { return []; }
  const ids = new Set();
  for (const m of src.matchAll(/registerTool\(\s*['"]([A-Za-z0-9_$]+)['"]/g)) ids.add(m[1]);
  for (const m of src.matchAll(/registerSelTool\(\s*['"]([A-Za-z0-9_$]+)['"]/g)) ids.add(m[1]);
  return [...ids];
}

function walk(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__snapshots__') continue;
      walk(full, out);
    } else if (/\.(test|spec)\.(js|ts|jsx|tsx|mjs|cjs)$/.test(e.name)) {
      out.push(path.relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
  return out;
}

const testFiles = TEST_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const testText = new Map();
for (const t of testFiles) {
  try { testText.set(t, fs.readFileSync(path.join(ROOT, t), 'utf8')); } catch { testText.set(t, ''); }
}

/** Tests that name this file, its basename, or a tool id it registers. */
function coveringTests(rel) {
  const base = path.basename(rel);
  const ids = toolIds(rel);
  const hits = [];
  for (const [t, text] of testText) {
    let why = null;
    if (text.includes(rel)) why = 'path';
    else if (text.includes(base)) why = 'filename';
    else if (ids.some((id) => text.includes("'" + id + "'") || text.includes('"' + id + '"'))) why = 'tool id';
    if (why) hits.push({ test: t, why });
  }
  return hits;
}

/** A test is snapshot-backed if a .snap exists beside it. */
function hasSnapshot(testRel) {
  const dir = path.dirname(testRel);
  const snap = path.join(ROOT, dir, '__snapshots__', path.basename(testRel) + '.snap');
  return fs.existsSync(snap);
}

// ── PostToolUse hook mode ─────────────────────────────────────────────
// Reads the hook payload on stdin, and if the edited file is a lab source,
// injects the covering-test list straight back into the model's context.
// Stays silent for everything else so it never adds noise to unrelated edits.
if (FLAG('--hook')) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    let payload = {};
    try { payload = JSON.parse(raw || '{}'); } catch { process.exit(0); }
    const p = (payload.tool_input && payload.tool_input.file_path) ||
      (payload.tool_response && payload.tool_response.filePath) || '';
    const rel = toRepoRel(p);
    if (!/^(stem_lab|sel_lab)\/.*\.(js|jsx|cjs|mjs)$/.test(rel)) process.exit(0);

    const hits = coveringTests(rel);
    let msg;
    if (!hits.length) {
      msg = 'No test file covers ' + rel + '. This change is currently unverified — ' +
        'consider adding coverage before moving on.';
    } else {
      const unit = hits.filter((h) => !h.test.includes('/e2e/'));
      const e2e = hits.filter((h) => h.test.includes('/e2e/'));
      const snaps = hits.filter((h) => hasSnapshot(h.test)).map((h) => h.test);
      const lines = ['You just edited ' + rel + '. These tests cover it and must still pass:'];
      if (unit.length) lines.push('  npx vitest run ' + unit.map((h) => h.test).join(' ') + ' --pool=threads');
      if (e2e.length) lines.push('  npx playwright test ' + e2e.map((h) => h.test).join(' '));
      if (snaps.length) {
        lines.push('Snapshot-backed (re-baseline ONLY if the render change is intentional, ' +
          'and scope it with -t so you do not rewrite other tools’ baselines): ' + snaps.join(', '));
      }
      lines.push('Update the test alongside the code — a stale snapshot left red is inherited by whoever runs the suite next.');
      msg = lines.join('\n');
    }
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: msg },
      suppressOutput: true,
    }));
    process.exit(0);
  });
  return;
}

const changed = changedFiles();
const sources = changed.filter(isSource);
const mirrorsOnly = changed.filter((f) => f.startsWith(MIRROR_PREFIX));

if (!sources.length) {
  if (!QUIET) {
    console.log('check_test_sync: no tracked source changes to map' +
      (mirrorsOnly.length ? ' (' + mirrorsOnly.length + ' mirror file(s) ignored)' : '') + '.');
  }
  process.exit(0);
}

const toRun = new Set();
const uncovered = [];
const rows = [];

for (const rel of sources) {
  const hits = coveringTests(rel);
  if (!hits.length) { uncovered.push(rel); continue; }
  hits.forEach((h) => toRun.add(h.test));
  rows.push({ rel, hits });
}

if (!QUIET) {
  console.log('check_test_sync: ' + sources.length + ' changed source file(s)\n');
  for (const { rel, hits } of rows) {
    console.log('  ' + rel);
    for (const h of hits) {
      const snap = hasSnapshot(h.test) ? '  [snapshot — may need -u]' : '';
      console.log('      covered by ' + h.test + '  (' + h.why + ')' + snap);
    }
  }
  if (rows.length && uncovered.length) console.log('');
}

if (uncovered.length) {
  console.log('  NO TEST COVERS these changed files:');
  for (const u of uncovered) console.log('      ' + u);
  console.log('      -> add coverage, or accept the change is unverified.');
}

if (toRun.size && !QUIET) {
  console.log('\n  Run:  npx vitest run ' + [...toRun].filter((t) => !t.includes('/e2e/')).join(' '));
  const e2e = [...toRun].filter((t) => t.includes('/e2e/'));
  if (e2e.length) console.log('  Plus: npx playwright test ' + e2e.join(' '));
}

let failed = false;

if (RUN) {
  const unit = [...toRun].filter((t) => !t.includes('/e2e/'));
  if (unit.length) {
    console.log('\ncheck_test_sync: running ' + unit.length + ' covering test file(s)...');
    const r = spawnSync('npx', ['vitest', 'run', ...unit, '--pool=threads'],
      { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) failed = true;
  }
  const e2e = [...toRun].filter((t) => t.includes('/e2e/'));
  if (e2e.length) {
    console.log('\ncheck_test_sync: ' + e2e.length + ' e2e spec(s) also cover this change ' +
      '(not run automatically — they need a browser):\n  npx playwright test ' + e2e.join(' '));
  }
}

if (STRICT && uncovered.length) {
  console.error('\ncheck_test_sync: FAIL — ' + uncovered.length + ' changed source file(s) have no covering test.');
  process.exit(1);
}
if (failed) {
  console.error('\ncheck_test_sync: FAIL — covering tests did not pass. Update the tool or the test, not neither.');
  process.exit(1);
}
if (!QUIET) console.log('\ncheck_test_sync: mapping complete.');
process.exit(0);
