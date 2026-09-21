#!/usr/bin/env node
/**
 * check_anchored_slices.cjs — blocks the vacuous source-pin class.
 *
 * A test that pins behaviour by slicing a region out of a source file:
 *
 *     const branch = source.slice(source.indexOf(START), source.indexOf(END));
 *     expect(branch).toContain('onClose={handleCloseDashboard}');
 *
 * FAILS OPEN. `indexOf` returns -1 for an anchor that no longer exists, and
 * `slice` treats a negative bound as an offset from the END of the string. So
 * a stale END anchor silently extends the region to the whole file, and every
 * `toContain` on it passes for free — the test keeps reporting green while
 * pinning nothing at all.
 *
 * That is not hypothetical: tests/dashboard_close_routing.test.js pinned the
 * teacher dashboard's close handler this way. Another session widened a branch
 * condition, the END anchor stopped matching, and the "teacher branch" slice
 * became the entire 44k-line file. The assertion passed against an unrelated
 * component's close handler. Only its sibling, which happened to fail closed,
 * ever complained.
 *
 * The fix is tests/helpers/anchored_slice.js — `sliceBetween(source, START,
 * END, { file, label })` throws naming the anchor that moved, and points at
 * the closest surviving line.
 *
 * This gate is a RATCHET. ~1,200 existing test files use the raw pattern and
 * are not rewritten here; the baseline records them so the count can only go
 * down. A NEW file using the raw pattern, or an existing file growing more
 * uses, fails. Refresh after a deliberate reduction with --update.
 *
 * Usage:
 *   node dev-tools/check_anchored_slices.cjs             # verify (exit 1 on a hit)
 *   node dev-tools/check_anchored_slices.cjs --list      # show every current use
 *   node dev-tools/check_anchored_slices.cjs --update    # re-baseline (only after a REDUCTION)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
// Overridable for the same reason as BASELINE below: a test that drives this
// gate has to put its fixtures under a directory the gate scans, and every
// suite doing that shares one tree. Two suites then see each other's fixtures
// appear and vanish mid-scan, which is a race nothing in either suite can fix
// from the outside. ANCHORED_SLICES_TESTS_DIR lets each one scan only its own.
const TESTS = process.env.ANCHORED_SLICES_TESTS_DIR
  ? path.resolve(process.env.ANCHORED_SLICES_TESTS_DIR)
  : path.join(ROOT, 'tests');
// Overridable so a test can hand the gate a PRIVATE baseline. The gate writes
// to this file by design (absorbing other people's growth), and vitest runs
// test files in parallel — two suites pointing at the shared baseline corrupt
// each other's expectations and fail only when run together, which is the
// worst kind of flake to chase.
const BASELINE = process.env.ANCHORED_SLICES_BASELINE
  ? path.resolve(process.env.ANCHORED_SLICES_BASELINE)
  : path.join(__dirname, 'anchored_slices_baseline.json');
const LIST = process.argv.includes('--list');
const UPDATE = process.argv.includes('--update');
const QUIET = process.argv.includes('--quiet');

// Which test files has the CURRENT author actually touched?
//
// A ratchet over 1,100 files in a tree several sessions write to has one
// failure mode that kills it: the baseline ages, dozens of unrelated new
// suites appear, and the gate fails on every run. On 2026-09-20 it flagged 92
// files, 84 of them brand-new work by other people. Nobody can act on that, so
// the gate stops being read — which is worse than not having it, because it
// also hides the one file the committer really did add.
//
// So the gate fails ONLY on files this author is working on (uncommitted, or
// added since origin/main), and quietly absorbs everyone else's into the
// baseline. You are accountable for your own debt, not the tree's.
// Returns null when git cannot attribute at all (not a repo, git missing).
// null is NOT "nobody touched anything" — see the caller: absorbing on a null
// would make the gate pass vacuously, which is the very bug it exists to stop.
function authorTouchedTests() {
  const probe = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: ROOT, encoding: 'utf8' });
  if (probe.status !== 0) return null;
  const touched = new Set();
  const add = (out) => {
    for (const line of String(out || '').split('\n')) {
      const rel = line.trim().replace(/^[A-Z?]{1,2}\s+/, '').replace(/\\/g, '/');
      if (rel.startsWith('tests/') && /\.test\.(js|jsx|mjs|cjs)$/.test(rel)) touched.add(rel);
    }
  };
  const run = (args) => {
    const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
    return r.status === 0 ? r.stdout : '';
  };
  // -uall, because plain `git status --porcelain` collapses an untracked
  // DIRECTORY to one `?? tests/newdir/` line and never names the files inside
  // it. A new suite added in a new folder would then look like someone else's
  // work and be absorbed instead of flagged — the gate silently excusing
  // exactly the case it exists for.
  // Scoped to tests/ — this gate only ever cares about test files, and the
  // pathspec turns a 3.4 s walk of a 3,800-file dirty tree into 1.0 s. That
  // mattered: unscoped, the gate took 19 s and blew the 5 s default timeout in
  // tests/check_anchored_slices_robustness.test.js.
  add(run(['status', '--porcelain', '-uall', '--', 'tests']));
  // Committed locally but not yet on the shared branch: still this author's.
  for (const base of ['origin/main', 'origin/master']) {
    const out = run(['diff', '--name-only', `${base}...HEAD`, '--', 'tests']);
    if (out) { add(out); break; }
  }
  return touched;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.test\.(js|jsx|mjs|cjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Count `.slice(` calls that take an `.indexOf(` as a bound on the same line,
// plus the `const i = x.indexOf(...)` ... `.slice(i` split form. Line-scoped
// so a regex cannot run across statements and invent a match.
const SLICE_WITH_INDEXOF = /\.slice\(\s*[^;\n]*?\.indexOf\(/;
const VAR_FROM_INDEXOF = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$.]*\.indexOf\(/;

// Deliberate uses — a fixture that must BE the broken pattern in order to
// prove a tool catches it — opt out per line. Requiring the marker on the
// line itself keeps the exemption narrow and self-documenting; a blanket
// file-level ignore would quietly cover future additions too.
const ALLOW_MARKER = 'allow-raw-slice';

function countRawSlices(source) {
  const lines = source.split('\n');
  let count = 0;
  const hits = [];

  // A COMMENT describing the pattern is not a use of it. Without this the gate
  // flags its own documentation — and any suite whose header explains what it
  // pins — which teaches people to sprinkle exemption markers through prose.
  const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

  // The marker may sit on the line itself, or in the comment block directly
  // above it. Three lines of lookback, because a marker worth writing usually
  // comes with a sentence or two saying WHY — and a one-line window silently
  // ignored those, which reads as the exemption simply not working.
  const exempt = (i) => {
    if (isComment(lines[i] || '')) return true;
    for (let k = i; k >= Math.max(0, i - 3); k--) {
      if ((lines[k] || '').includes(ALLOW_MARKER)) return true;
    }
    return false;
  };

  lines.forEach((line, i) => {
    if (SLICE_WITH_INDEXOF.test(line) && !exempt(i)) {
      count += 1;
      hits.push({ line: i + 1, text: line.trim().slice(0, 110) });
    }
  });

  // Split form: an index variable assigned from indexOf and later used as a
  // slice bound. Only counted when the variable is never compared to -1.
  // Indexed by position, not lines.indexOf(line) — that is O(n) per hit and
  // turns this scan quadratic on the repo's larger suites.
  lines.forEach((line, i) => {
    const m = VAR_FROM_INDEXOF.exec(line);
    if (!m) return;
    const name = m[1];
    const usedAsBound = new RegExp('\\.slice\\(\\s*(?:[^;\\n)]*,\\s*)?' + name + '\\b').test(source);
    if (!usedAsBound) return;
    const guarded = new RegExp(name + '\\s*(?:!==|===|>|<)\\s*-?1|toBeGreaterThan\\(\\s*-1\\s*\\)').test(source);
    if (guarded || exempt(i)) return;
    count += 1;
    hits.push({ line: i + 1, text: line.trim().slice(0, 110) });
  });

  return { count, hits };
}

function usesHelper(source) {
  return /from\s+['"][^'"]*helpers\/anchored_slice(\.js)?['"]/.test(source);
}

function scan() {
  // A scan root that does not exist is "nothing to scan", not a crash: the
  // directory can be deleted between runs (exactly what the robustness suite
  // exercises), and dying on the walk would replace the whole report with a
  // stack trace.
  const files = (fs.existsSync(TESTS) ? walk(TESTS) : []).sort();
  const current = {};
  const detail = {};
  for (const full of files) {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    // walk() lists the tree, then this reads it — and in a tree several
    // sessions write to, a scratch suite can be deleted in between. A vanished
    // file is not a gate failure; letting ENOENT escape turns a clean run into
    // an unreadable stack trace, which is how this gate crashed mid-scan while
    // another session cleaned up its fixtures.
    let source;
    try { source = fs.readFileSync(full, 'utf8'); }
    catch (e) { if (e && (e.code === 'ENOENT' || e.code === 'EBUSY' || e.code === 'EPERM')) continue; throw e; }
    if (!source.includes('.slice(') || !source.includes('.indexOf(')) continue;
    const { count, hits } = countRawSlices(source);
    if (count > 0) {
      current[rel] = count;
      detail[rel] = { hits, helper: usesHelper(source) };
    }
  }
  return { current, detail };
}

// Record other people's files at their CURRENT count, so the ratchet keeps
// holding them at today's number without blaming this author for them. Their
// own next commit is where the gate will ask them about it.
function absorb(baseline, current, entries) {
  if (!entries.length) return;
  const files = { ...baseline.files };
  for (const e of entries) files[e.file] = current[e.file];
  try {
    fs.writeFileSync(BASELINE, JSON.stringify({
      note: baseline.note,
      updated: new Date().toISOString().slice(0, 10),
      totalUses: Object.values(files).reduce((a, b) => a + b, 0),
      files,
    }, null, 1) + '\n');
  } catch (_) { /* read-only checkout: reporting still worked */ }
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) { return null; }
}

function main() {
  const { current, detail } = scan();
  const total = Object.values(current).reduce((a, b) => a + b, 0);

  if (LIST) {
    for (const file of Object.keys(current).sort()) {
      console.log(`${current[file]}\t${file}${detail[file].helper ? '  (already imports the helper)' : ''}`);
    }
    console.log(`\n${Object.keys(current).length} file(s), ${total} raw slice(indexOf) use(s).`);
    return 0;
  }

  const baseline = loadBaseline();

  if (UPDATE || !baseline) {
    const previousTotal = baseline ? Object.values(baseline.files).reduce((a, b) => a + b, 0) : Infinity;
    if (baseline && total > previousTotal) {
      console.error(`check_anchored_slices: refusing to --update, the count went UP (${previousTotal} -> ${total}). This gate only ratchets down.`);
      return 1;
    }
    fs.writeFileSync(BASELINE, JSON.stringify({
      note: 'Raw source.slice(source.indexOf(...)) uses per test file. Ratchet: counts may only go DOWN. Use tests/helpers/anchored_slice.js in new tests.',
      updated: new Date().toISOString().slice(0, 10),
      totalUses: total,
      files: current,
    }, null, 1) + '\n');
    console.log(`check_anchored_slices: baseline written — ${Object.keys(current).length} file(s), ${total} use(s).`);
    return 0;
  }

  const touched = authorTouchedTests();
  const failures = [];
  const inherited = [];
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline.files[file];
    const grew = allowed === undefined ? count > 0 : count > allowed;
    if (!grew) continue;
    const entry = {
      file, count, allowed: allowed === undefined ? 0 : allowed,
      why: allowed === undefined ? 'NEW test file uses the raw pattern' : 'more raw uses than the baseline',
    };
    // touched === null means git could not tell us who owns what (CI on a
    // clean checkout of main, a tarball, no git binary). Absorbing then would
    // report OK while real new debt sat in the tree — the fail-open bug this
    // gate exists to prevent, reproduced inside the gate itself. When we
    // cannot attribute, everything is in scope and nothing is absorbed.
    (touched === null || touched.has(file) ? failures : inherited).push(entry);
  }

  if (failures.length) {
    console.error('check_anchored_slices: raw slice(indexOf) use grew in files you are working on.\n');
    for (const f of failures) {
      console.error(`  ${f.file}: ${f.count} use(s), baseline ${f.allowed} — ${f.why}`);
      for (const hit of (detail[f.file].hits || []).slice(0, 3)) {
        console.error(`      line ${hit.line}: ${hit.text}`);
      }
    }
    console.error('\n  A slice whose indexOf bound is stale silently swallows the rest of the file,');
    console.error('  so every toContain() on it passes for free. Use the helper instead:\n');
    console.error("      import { sliceBetween } from './helpers/anchored_slice.js';");
    console.error("      const region = sliceBetween(source, START, END, { file: 'AlloFlowANTI.txt' });\n");
    console.error('  It throws naming the anchor that moved. A line that must keep the raw');
    console.error("  pattern (a fixture proving a detector works) takes an `allow-raw-slice` comment.");
    if (inherited.length) {
      console.error(`\n  (${inherited.length} other file(s) also grew, but you have not touched them — absorbed into the baseline, not your problem.)`);
    }
    absorb(baseline, current, inherited);
    return 1;
  }

  // Nothing of yours grew. Fold everyone else's new debt into the baseline so
  // the next run starts from today's reality rather than failing forever.
  if (inherited.length) {
    absorb(baseline, current, inherited);
    console.log(`check_anchored_slices: absorbed ${inherited.length} file(s) added by other work into the baseline (none of them yours).`);
  }

  const shrunk = Object.entries(baseline.files).filter(([f, n]) => (current[f] || 0) < n).length;
  if (!QUIET) {
    console.log(`check_anchored_slices: OK — ${total} raw use(s) across ${Object.keys(current).length} file(s), none new` +
      (shrunk ? `; ${shrunk} file(s) improved — run --update to lock it in.` : '.'));
  }
  return 0;
}

process.exit(main());
