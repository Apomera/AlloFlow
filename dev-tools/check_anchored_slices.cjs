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

const ROOT = path.resolve(__dirname, '..');
const TESTS = path.join(ROOT, 'tests');
const BASELINE = path.join(__dirname, 'anchored_slices_baseline.json');
const LIST = process.argv.includes('--list');
const UPDATE = process.argv.includes('--update');
const QUIET = process.argv.includes('--quiet');

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

  const exempt = (i) => {
    const here = lines[i] || '';
    const above = lines[i - 1] || '';
    return here.includes(ALLOW_MARKER) || above.includes(ALLOW_MARKER);
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
  const files = walk(TESTS).sort();
  const current = {};
  const detail = {};
  for (const full of files) {
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    const source = fs.readFileSync(full, 'utf8');
    if (!source.includes('.slice(') || !source.includes('.indexOf(')) continue;
    const { count, hits } = countRawSlices(source);
    if (count > 0) {
      current[rel] = count;
      detail[rel] = { hits, helper: usesHelper(source) };
    }
  }
  return { current, detail };
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

  const failures = [];
  for (const [file, count] of Object.entries(current)) {
    const allowed = baseline.files[file];
    if (allowed === undefined) {
      failures.push({ file, count, allowed: 0, why: 'NEW test file uses the raw pattern' });
    } else if (count > allowed) {
      failures.push({ file, count, allowed, why: 'more raw uses than the baseline' });
    }
  }

  if (failures.length) {
    console.error('check_anchored_slices: raw slice(indexOf) use grew.\n');
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
    console.error('  It throws naming the anchor that moved. Run with --list to see every current use.');
    return 1;
  }

  const shrunk = Object.entries(baseline.files).filter(([f, n]) => (current[f] || 0) < n).length;
  if (!QUIET) {
    console.log(`check_anchored_slices: OK — ${total} raw use(s) across ${Object.keys(current).length} file(s), none new` +
      (shrunk ? `; ${shrunk} file(s) improved — run --update to lock it in.` : '.'));
  }
  return 0;
}

process.exit(main());
