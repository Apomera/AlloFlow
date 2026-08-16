#!/usr/bin/env node
// scan_write_only_state.cjs — gate for React state that is written and never read.
//
// `const [x, setX] = useState(...)` where `x` never appears again is one of two
// things, and both are worth knowing about:
//
//   1. Dead weight. A feature was removed and its state declaration survived.
//   2. A DEAD FEATURE PATH still wired to a button, which is the expensive case.
//
// Case 2, found 2026-08-16: `mathFluencyActive` appeared exactly ONCE in the
// whole repository, its own useState. The host's math-fluency probe overlay had
// been deleted (two placeholder comments were left where it used to mount) but
// `startMathFluencyProbe` was still wired to the STEM Lab Assessment Builder. It
// set the flag nothing read, switched views, and started a 120-second countdown
// that expired into `finishMathFluencyProbe`, which built a curriculum-based
// measurement from zero attempted problems and wrote it to the student's probe
// history AND the progress charts. A fabricated 0 DCPM / 0% accuracy CBM result
// for a student who was never shown a problem. Nothing else caught it: the
// module renders, the tests pass, the feature simply has no UI.
//
// This is the cheap, low-noise complement to reachability review. A grep for
// "is this component mounted?" is unreliable — consumption is often dynamic
// (`CDNModuleGate moduleKey="StemLab"`, `loadModule('Name', url)`) and modules
// commonly export sub-components they only consume internally. A getter that
// appears once is not ambiguous.
//
// Deliberately TEXT-based, not AST. The canonical file is JSX inside a .txt, so
// an AST pass would need a JSX-capable parser; @babel/core is a peer dep that
// disappears on npm operations in this tree, and acorn alone cannot read JSX.
// The pattern being matched is regular enough that text is both sufficient and
// more robust. Word boundaries, so `setMathFluencyActive` never counts as a read
// of `mathFluencyActive`.
//
// Baseline is keyed by `file::identifier`, NOT by line number, so unrelated
// edits above a hit do not invalidate it. Ten agents edit these files.
//
// Usage:
//   node dev-tools/scan_write_only_state.cjs [--quiet] [--json] [--update-baseline]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'write_only_state_baseline.json');

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const asJson = args.includes('--json');
const updateBaseline = args.includes('--update-baseline');

// Files that actually hold React state. Root-level sources and the monolith;
// stem_lab/ and sel_hub/ tools use a host-provided state bag, not useState.
function targets() {
  const out = [];
  for (const name of ['AlloFlowANTI.txt']) {
    const p = path.join(ROOT, name);
    if (fs.existsSync(p)) out.push(p);
  }
  for (const name of fs.readdirSync(ROOT)) {
    if (!/(_source\.jsx|_module\.js)$/.test(name)) continue;
    if (name.startsWith('_build_')) continue;
    out.push(path.join(ROOT, name));
  }
  return out;
}

// `const [getter, setter] = useState` / `React.useState`, tolerant of newlines
// inside the destructuring pattern.
const DECL = /(?:const|let|var)\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*(?:React\.)?useState\b/g;

function countWord(haystack, word) {
  // Manual boundary scan rather than a built RegExp: identifiers here are
  // user-controlled and a constructed pattern is easy to get subtly wrong.
  const isPart = (ch) => ch !== undefined && /[\w$]/.test(ch);
  let count = 0;
  let i = 0;
  for (;;) {
    const at = haystack.indexOf(word, i);
    if (at < 0) break;
    const before = at > 0 ? haystack[at - 1] : undefined;
    const after = haystack[at + word.length];
    if (!isPart(before) && !isPart(after)) count++;
    i = at + word.length;
  }
  return count;
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === '\n') line++;
  return line;
}

function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const hits = [];
  DECL.lastIndex = 0;
  let m;
  while ((m = DECL.exec(src))) {
    const [, getter, setter] = m;
    // Exactly one occurrence means the declaration itself and nothing else.
    if (countWord(src, getter) !== 1) continue;
    hits.push({
      key: rel + '::' + getter,
      file: rel,
      line: lineOf(src, m.index),
      getter,
      setter,
      // A setter that is also never called means the whole pair is inert; a
      // setter that IS called means something writes state nobody reads, which
      // is the shape that hides a dead feature path.
      setterCalls: countWord(src, setter) - 1,
    });
  }
  return hits;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return { note: '', allow: [] };
  try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); }
  catch (e) { return { note: '', allow: [] }; }
}

const hits = targets().flatMap(scanFile).sort((a, b) => a.key.localeCompare(b.key));

if (updateBaseline) {
  const existing = loadBaseline();
  fs.writeFileSync(BASELINE, JSON.stringify({
    note: existing.note || 'Write-only useState hits accepted at baseline time. Each entry is dead weight or a dead feature path someone chose not to remove yet. Removing an entry is always safe; adding one needs a reason.',
    allow: hits.map((h) => h.key),
  }, null, 2) + '\n');
  process.stdout.write('Baseline updated: ' + hits.length + ' entr' + (hits.length === 1 ? 'y' : 'ies') + '\n');
  process.exit(0);
}

const allow = new Set(loadBaseline().allow || []);
const fresh = hits.filter((h) => !allow.has(h.key));
const stale = [...allow].filter((k) => !hits.some((h) => h.key === k));

if (asJson) {
  process.stdout.write(JSON.stringify({ hits, fresh, stale }, null, 2) + '\n');
  process.exit(fresh.length ? 1 : 0);
}

if (fresh.length) {
  process.stderr.write('✗ scan_write_only_state: ' + fresh.length + ' new write-only useState hook(s).\n\n');
  for (const h of fresh) {
    process.stderr.write('  ' + h.file + ':' + h.line + '  ' + h.getter
      + '  (' + h.setter + ' called ' + h.setterCalls + 'x)\n');
  }
  process.stderr.write('\nThe getter is never read, so nothing renders from this state.\n'
    + 'If the setter is still called, trace what calls it: that path may be a dead end\n'
    + 'that still runs side effects. mathFluencyActive looked exactly like this and its\n'
    + 'caller was recording fabricated CBM probe results.\n\n'
    + 'Fix: remove the declaration, or wire the state to something that reads it.\n'
    + 'Deliberate: node dev-tools/scan_write_only_state.cjs --update-baseline\n');
  process.exit(1);
}

if (!quiet) {
  process.stdout.write('✓ scan_write_only_state: no new write-only useState hooks ('
    + hits.length + ' baselined).\n');
  if (stale.length) {
    process.stdout.write('  ' + stale.length + ' baseline entr'
      + (stale.length === 1 ? 'y is' : 'ies are') + ' now clean and can be dropped:\n');
    for (const k of stale) process.stdout.write('    ' + k + '\n');
  }
}
process.exit(0);
