#!/usr/bin/env node
/**
 * find_vacuous_pins.cjs — PROVES which source-pin tests are passing vacuously.
 *
 * A source-pin test reads a big file and asserts on a region of it:
 *
 *     const branch = source.slice(source.indexOf(START), source.indexOf(END));
 *     expect(branch).toContain('onClose={handleCloseDashboard}');
 *
 * When an anchor goes stale, `indexOf` returns -1, `slice` reads that as an
 * offset from the END of the string, and the region silently becomes the whole
 * file — so the assertion passes against unrelated code. The test stays green
 * while pinning nothing. See tests/helpers/anchored_slice.js for the fix and
 * dev-tools/check_anchored_slices.cjs for the ratchet that stops new cases.
 *
 * WHY THIS TOOL EXISTS, and why it mutates instead of grepping: a static scan
 * for "asserted literal missing from the file the test reads" is badly wrong in
 * both directions. It flags `not.toContain('...')`, where absence is the whole
 * point. It flags assertions against rendered HTML rather than the source file.
 * It misses literals built by concatenation. When this was attempted by grep it
 * reported 32 vacuous suites; the real number was zero, and every one of those
 * suites was either healthy or already failing loudly. The only trustworthy
 * question is behavioural:
 *
 *     If I DELETE the pinned code, does the test notice?
 *
 * So this tool runs a suite, and for each source file that suite reads, mutates
 * a copy of that file (destroying the anchors the suite names) and re-runs. A
 * suite that still passes against gutted source is not testing anything. The
 * original file is restored from the in-memory original in a finally block, and
 * verified byte-identical afterwards.
 *
 * WHAT THIS TOOL CANNOT SEE — read this before trusting an "ok".
 *
 * Gutting proves a suite pins SOMETHING. It cannot prove the suite pins the
 * RIGHT REGION, and that is the bug this whole line of work started from.
 * dashboard_close_routing sliced a "teacher branch", its END anchor went stale,
 * the region silently became the whole 44k-line file, and its assertion passed
 * against an unrelated component's onClose for weeks. Gut that file and the
 * suite DOES fail (the text is gone), so it reports "ok" — correctly, and
 * uselessly. Verified with a fixture: a suite whose stale END anchor makes it
 * assert the STUDENT branch while claiming the TEACHER branch reads "ok".
 *
 * So "ok" means "not vacuous", NOT "pinning what it says it pins". The defence
 * against a widened region is `--scope`, below, and structurally it is
 * tests/helpers/anchored_slice.js, which throws when an anchor moves instead of
 * letting the region grow.
 *
 * SAFETY: this tool WRITES to tracked source files for a few seconds at a time.
 * It refuses to run if the named files are dirty in git (so a crash can never
 * lose someone else's uncommitted work), restores in a finally, and verifies
 * the restore. Run it on a quiet tree. It never touches more than one file at
 * a time and never runs the repo's build.
 *
 * Usage:
 *   node dev-tools/find_vacuous_pins.cjs tests/foo.test.js [more.test.js ...]
 *   node dev-tools/find_vacuous_pins.cjs --from <file-with-one-test-path-per-line>
 *   node dev-tools/find_vacuous_pins.cjs --dry tests/foo.test.js    # show plan only
 *   node dev-tools/find_vacuous_pins.cjs --scope tests/foo.test.js # also hunt widened regions
 *
 * Verdicts:
 *   ok        destroying its source fails it — it pins something real
 *   VACUOUS   every file it reads can be destroyed and it still passes
 *   partial   pins some of its files, not others (a negated assertion, or the
 *             behaviour comes from a built artifact) — not a defect
 *   WIDENED   (--scope only) passes only because it matches code OUTSIDE its own
 *             anchors: a stale END anchor has grown the region past its intent
 *   skipped   no discoverable source, or a file it reads has uncommitted work
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry');
const SCOPE = process.argv.includes('--scope');

function argList() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const fromIdx = process.argv.indexOf('--from');
  if (fromIdx !== -1 && process.argv[fromIdx + 1]) {
    const listed = fs.readFileSync(process.argv[fromIdx + 1], 'utf8')
      .split('\n').map((s) => s.trim()).filter(Boolean);
    return listed;
  }
  return args;
}

// Collect readFileSync targets out of one file's text.
//
// Three shapes, because the original regex missed the two most common ones:
//
//   readFileSync('a/b.js')                          -- a bare literal
//   readFileSync(resolve(process.cwd(), 'a/b.js'))  -- the repo's usual idiom
//   const TOOL = resolve(...); readFileSync(TOOL)   -- path hoisted to a const
//
// The second failed because the old pattern used `[^)]*?` to skip resolve()'s
// leading args, and that character class cannot cross the ')' in `process.cwd()`.
// So the single most common way this repo names a source file never matched, and
// those suites were all reported "skipped" -- which reads as benign rather than
// as "no vacuity coverage at all".
//
// Rather than parse arguments, collect every string literal that looks like a
// repo-relative path and keep the ones that resolve to a real file. Over-
// collecting is safe here: a literal that is not a file is dropped, and the
// gutting step only ever touches files this returns.
function readTargetsIn(src, out) {
  // Keep any literal that resolves to a real file. Do NOT require a '/': this
  // repo keeps most sources at the root (adventure_source.jsx, ui_strings.js),
  // and demanding a separator silently dropped 317 suites that the previous
  // regex did see. Existence on disk is the filter; 'utf8' and the like are not
  // files and fall out on their own.
  const add = (rel) => {
    const clean = (rel || '').replace(/\\/g, '/');
    if (!clean || clean.endsWith('/')) return;
    const full = path.join(ROOT, clean);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) out.add(clean);
  };

  // Literals sitting directly inside a readFileSync(...) call, however nested.
  // Scan forward from each call rather than matching a bounded window: a single
  // line can pack several statements (vm.runInContext(readFileSync(...) + ';...'))
  // and a `[^;]` bound stops at the first semicolon INSIDE the call, losing it.
  const call = /readFileSync\(/g;
  let m;
  while ((m = call.exec(src))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    for (; i < src.length && depth > 0 && i - start < 600; i++) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === '\n' && depth === 1 && i - start > 400) break;
    }
    const args = src.slice(start, i);

    // path.join(ROOT, 'a', 'b', 'c.md') names ONE file across several literals.
    // Collecting them separately grabbed the last segment on its own -- and
    // 'README.md' exists at the repo root, so the tool gutted the ROOT readme
    // for two suites that actually read apps_script/<x>/README.md, then called
    // them vacuous for not noticing. Destroying an unrelated file is worse than
    // a false verdict, so join the segments first and only fall back to loose
    // literals when the joined path is not a real file.
    const joined = [];
    const joinRe = /\b(?:path\.)?(?:join|resolve)\(([^)]*)\)/g;
    let j;
    while ((j = joinRe.exec(args))) {
      const parts = [];
      const partRe = /['"]([^'"\n]+)['"]/g;
      let pm;
      while ((pm = partRe.exec(j[1]))) parts.push(pm[1]);
      if (parts.length > 1) joined.push(parts.join('/'));
    }
    let matched = false;
    for (const rel of joined) {
      const before = out.size;
      add(rel);
      if (out.size > before || fs.existsSync(path.join(ROOT, rel))) matched = true;
    }
    if (!matched) {
      const litRe = /['"]([^'"\n]+)['"]/g;
      let lit;
      while ((lit = litRe.exec(args))) add(lit[1]);
    }
  }

  // Files fed to a parameterised block: it.each(['a.txt','b.txt'])(..., (file) =>
  // readFileSync(resolve(process.cwd(), file))). The path is a LOOP VARIABLE, so
  // no literal sits inside the call and all three files went undiscovered --
  // which then made a healthy suite look vacuous, because the only file the tool
  // did find was one it reads for a negated assertion.
  if (/readFileSync\(/.test(src)) {
    const each = /\.each\(\s*\[([\s\S]{0,600}?)\]/g;
    while ((m = each.exec(src))) {
      const litRe = /['"]([^'"\n]+)['"]/g;
      let lit;
      while ((lit = litRe.exec(m[1]))) add(lit[1]);
    }
  }

  // A PATH ARRAY iterated somewhere else in the file:
  //
  //   const WATER_CYCLE_PATHS = ['stem_lab/x.js', 'desktop/.../x.js'];
  //   WATER_CYCLE_PATHS.forEach((filePath) => { readFileSync(filePath, 'utf8') })
  //
  // No literal sits inside the readFileSync call and the const is not read
  // directly by it either, so neither of the two rules above sees these. That
  // blinded the tool to 218 suites — reported as "skipped: reads no source file
  // directly", which reads as benign rather than as "no vacuity coverage". The
  // four-mirror suites in this repo are nearly all written this way.
  //
  // Only accept entries that resolve to a real file, so an array of ids, keys
  // or fixture strings contributes nothing.
  if (/readFileSync\(/.test(src)) {
    const arrayDecl = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[([^\]]{0,1200})\]/g;
    let arr;
    while ((arr = arrayDecl.exec(src))) {
      const name = arr[1];
      // The array must actually be iterated or indexed somewhere.
      const used = new RegExp(name + '\\s*(?:\\.\\s*(?:forEach|map|flatMap|filter|some|every)\\b|\\[|\\))').test(src)
        || new RegExp('(?:of|in)\\s+' + name + '\\b').test(src)
        || new RegExp('describe\\.each\\(\\s*' + name).test(src)
        || new RegExp('it\\.each\\(\\s*' + name).test(src);
      if (!used) continue;
      const litRe = /['"]([^'"\n]+)['"]/g;
      let lit;
      while ((lit = litRe.exec(arr[2]))) add(lit[1]);
    }
  }

  // Path consts referenced by a readFileSync elsewhere in the same file.
  const named = new Set();
  const useRe = /readFileSync\(\s*([A-Z_][A-Z0-9_]*)\b/g;
  while ((m = useRe.exec(src))) named.add(m[1]);
  for (const name of named) {
    const declRe = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*([^;\\n]+)`, 'g');
    let d;
    while ((d = declRe.exec(src))) {
      let lit;
      const litRe = /['"]([^'"]+)['"]/g;
      while ((lit = litRe.exec(d[1]))) add(lit[1]);
    }
  }
}

// Local helper modules this test imports (./x, ../x) — resolved to real files.
function localHelperImports(testPath, src) {
  const dir = path.dirname(path.join(ROOT, testPath));
  const re = /(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g;
  const out = new Set();
  let m;
  while ((m = re.exec(src))) {
    const spec = m[1];
    for (const cand of [spec, `${spec}.js`, `${spec}/index.js`]) {
      const full = path.resolve(dir, cand);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) { out.add(full); break; }
    }
  }
  return [...out];
}

// Which source files does this suite read? Direct readFileSync of a path that
// exists, PLUS anything its local helpers read on its behalf.
//
// The harness case was a silent blind spot: a suite that loads the code under
// test through tests/helpers/*.js does no readFileSync of its own, so every one
// was reported "skipped" — which reads as benign rather than as "this suite got
// no vacuity coverage at all". All 25 Arc City suites (and the tool they pin)
// were invisible for exactly this reason, and 1,112 test files import a local
// helper. One level of indirection is enough for the harness pattern and keeps
// the discovery honest — a suite whose paths are genuinely dynamic is still
// skipped rather than guessed at.
function filesRead(testPath) {
  const src = fs.readFileSync(path.join(ROOT, testPath), 'utf8');
  const out = new Set();
  readTargetsIn(src, out);
  for (const helper of localHelperImports(testPath, src)) {
    try { readTargetsIn(fs.readFileSync(helper, 'utf8'), out); }
    catch (e) { if (!e || e.code !== 'ENOENT') throw e; }
  }
  return [...out];
}

// "Dirty" means TRACKED with uncommitted modifications — that is work a crash
// could destroy. An untracked file ('??') has nothing in git to lose and is
// safe to mutate-and-restore, which is also what lets this tool be tested
// against throwaway fixtures.
function isDirty(rel) {
  const r = spawnSync('git', ['status', '--porcelain', '--', rel], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return true; // cannot tell — refuse
  const lines = r.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.some((l) => !l.startsWith('??'));
}

function runSuite(testPath) {
  const r = spawnSync('npx', ['vitest', 'run', testPath, '--reporter=dot'], {
    cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', timeout: 15 * 60 * 1000,
  });
  const text = `${r.stdout || ''}${r.stderr || ''}`;
  return { passed: r.status === 0, text };
}

// Gut the file: keep its byte length roughly plausible but destroy every
// identifier and string a pin could match. Comments go too — several suites
// pin '// @section NAME' markers.
function gut(content) {
  return content
    .split('\n')
    .map((line, i) => (line.trim() ? `// gutted line ${i + 1}` : ''))
    .join('\n');
}

// A mutated file must survive a CRASH, not just a thrown error.
//
// restoreOrDie runs in a `finally`, which covers an exception. It does NOT
// cover Ctrl+C, a kill, or a hard crash: the process dies between the gutting
// write and the restore, and a TRACKED source file is left full of
// `// gutted line N`. Nothing on disk would say which file, or that anything
// happened at all — the next person just finds a mangled source.
//
// So every mutation is announced on disk BEFORE the write and cleared after.
// The journal holds the original bytes, so recovery never depends on git (the
// file may have been legitimately dirty-free but unstaged elsewhere, and
// `git checkout --` would throw away nothing only by luck). Signals and
// uncaught exceptions restore from it immediately; a journal found at startup
// means a previous run died, and is restored before anything else happens.
//
// The journal is PER PROCESS. A single shared filename looked fine until two
// runs overlapped: the second run's journalBegin clobbered the first's entry,
// and the recovery step then restored the WRONG file while the real mutation
// stayed on disk. Caught by the kill test, which recovered a concurrent
// session's fixture instead of its own. Recovery scans for every journal,
// restores each, and skips the ones whose process is still alive.
const JOURNAL_PREFIX = '.vacuous-pins-journal';
const JOURNAL = path.join(ROOT, `${JOURNAL_PREFIX}.${process.pid}.json`);
let pending = null; // { rel, full, original: Buffer }

function journalFiles() {
  try {
    return fs.readdirSync(ROOT)
      .filter((n) => n.startsWith(`${JOURNAL_PREFIX}.`) && n.endsWith('.json'))
      .map((n) => path.join(ROOT, n));
  } catch (_) { return []; }
}

// Is that pid still running? A live pid means another run owns that journal.
function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function journalBegin(rel, full, original) {
  pending = { rel, full, original };
  try {
    fs.writeFileSync(JOURNAL, JSON.stringify({
      rel,
      startedAt: new Date().toISOString(),
      pid: process.pid,
      originalBase64: original.toString('base64'),
    }));
  } catch (e) {
    // If the journal cannot be written, do NOT mutate: an unrecoverable
    // mutation is far worse than a skipped suite.
    throw new Error(`refusing to mutate ${rel}: cannot write the recovery journal (${e.message})`);
  }
}

function journalEnd() {
  pending = null;
  try { if (fs.existsSync(JOURNAL)) fs.unlinkSync(JOURNAL); } catch (_) {}
}

// Restore whatever any DEAD previous run left behind. Called at startup.
// A journal whose pid is still alive belongs to a run in progress: leave it
// alone, or this run would restore a file the other one is mid-mutation on.
function recoverJournal() {
  for (const file of journalFiles()) {
    let entry;
    try { entry = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { entry = null; }
    if (!entry || !entry.rel || typeof entry.originalBase64 !== 'string') {
      console.error(`Found an unreadable ${path.basename(file)}; delete it by hand after checking your tree.`);
      continue;
    }
    if (pidAlive(entry.pid)) continue; // another run owns this one
    const full = path.join(ROOT, entry.rel);
    const original = Buffer.from(entry.originalBase64, 'base64');
    const current = fs.existsSync(full) ? fs.readFileSync(full) : null;
    if (!current) {
      // The mutated file is gone entirely (a fixture directory removed, say).
      // Nothing to restore; drop the journal rather than recreating a file
      // somebody deliberately deleted.
      try { fs.unlinkSync(file); } catch (_) {}
      continue;
    }
    if (current.equals(original)) {
      console.log(`Recovered: ${entry.rel} was already intact (previous run died after restoring).`);
    } else {
      restoreOrDie(full, entry.rel, original);
      console.log(`Recovered: restored ${entry.rel}, left mutated by a run that died at ${entry.startedAt}.`);
    }
    try { fs.unlinkSync(file); } catch (_) {}
  }
}

function emergencyRestore(why) {
  if (!pending) return;
  const { rel, full, original } = pending;
  console.error(`\n${why} — restoring ${rel} before exiting.`);
  try {
    fs.writeFileSync(full, original);
    if (fs.readFileSync(full).equals(original)) {
      console.error(`Restored ${rel}.`);
      journalEnd();
      return;
    }
  } catch (e) {
    console.error(`Restore failed: ${e.message}`);
  }
  console.error(`COULD NOT RESTORE ${rel}. Recover it with:  git checkout -- ${rel}`);
  console.error(`The original bytes are also in ${path.basename(JOURNAL)}.`);
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => { emergencyRestore(`Interrupted (${signal})`); process.exit(130); });
}
process.on('uncaughtException', (e) => { emergencyRestore(`Uncaught error: ${e && e.message}`); process.exit(1); });
process.on('unhandledRejection', (e) => { emergencyRestore(`Unhandled rejection: ${e && e.message}`); process.exit(1); });

// Put a file back, and do not give up after one try.
//
// The restore is the one write in this tool that MUST succeed — it is holding
// someone's source hostage until it lands. A real run died here with
// `UNKNOWN: unknown error, open ...doc_pipeline_source.jsx` (errno -4094): a
// transient Windows/OneDrive lock, thrown from inside the `finally`, which
// escaped and killed the process. That time the write failed BEFORE truncating
// and the file survived — luck, not design.
//
// So: retry with a short backoff, verify the bytes, and only then declare
// failure. If it still will not land, say exactly which file and how to get it
// back rather than exiting silently.
function restoreOrDie(full, rel, original) {
  let lastErr = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      fs.writeFileSync(full, original);
      if (fs.readFileSync(full).equals(original)) return;
      lastErr = new Error('bytes differ after write');
    } catch (e) {
      lastErr = e;
    }
    // Synchronous backoff: this runs inside a finally, so there is no awaiting.
    const until = Date.now() + 150 * (attempt + 1);
    while (Date.now() < until) { /* spin briefly, then retry */ }
  }
  console.error(`\nFATAL: could not restore ${rel} after 6 attempts (${lastErr && lastErr.message}).`);
  console.error(`Recover it now:  git checkout -- ${rel}`);
  process.exit(3);
}

// --scope: catch a pin that passes against the WRONG region.
//
// A suite slices `source.indexOf(START)` to `source.indexOf(END)`. When END goes
// stale the region silently becomes the rest of the file, so the assertion can be
// satisfied by text far outside the intended scope. Plain gutting cannot see
// this: the text still exists somewhere, so destroying everything still fails the
// suite and it reports "ok".
//
// This mutation keeps each region a suite NAMES and guts only what lies outside
// them. A suite pinning the region it claims survives untouched. A suite whose
// region has widened loses the far-away text it was really matching, and fails --
// which is the signal.
//
// Anchors are read from the suite's own indexOf/sliceBetween literals. If none
// are found, the file is left alone (reported as no-anchors rather than guessed
// at): over-mutating here would manufacture failures, which is the one thing
// worse than missing a finding.
function anchorsIn(suiteSrc) {
  const out = new Set();
  const re = /(?:indexOf|indexOfOrThrow|sliceBetween)\(\s*(?:[A-Za-z_$][\w$]*\s*,\s*)?['"]([^'"\n]{6,})['"]/g;
  let m;
  while ((m = re.exec(suiteSrc))) out.add(m[1]);
  const between = /sliceBetween\([^,]+,\s*['"]([^'"\n]{6,})['"]\s*,\s*['"]([^'"\n]{6,})['"]/g;
  while ((m = between.exec(suiteSrc))) { out.add(m[1]); out.add(m[2]); }
  return [...out];
}

// Keep a window around every anchor present in the file; gut the rest.
function gutOutsideAnchors(content, anchors, windowChars) {
  const keep = [];
  for (const a of anchors) {
    let at = content.indexOf(a);
    while (at !== -1) {
      keep.push([Math.max(0, at - 200), Math.min(content.length, at + windowChars)]);
      at = content.indexOf(a, at + a.length);
      if (keep.length > 400) break;
    }
  }
  if (!keep.length) return null;
  keep.sort((x, y) => x[0] - y[0]);
  const merged = [keep[0]];
  for (const [s, e] of keep.slice(1)) {
    const last = merged[merged.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const inKept = (idx) => merged.some(([s, e]) => idx >= s && idx < e);
  let pos = 0;
  return content.split('\n').map((line, i) => {
    const start = pos;
    pos += line.length + 1;
    if (!line.trim()) return '';
    return inKept(start) || inKept(pos - 1) ? line : `// out-of-scope line ${i + 1}`;
  }).join('\n');
}

function main() {
  recoverJournal();
  const suites = argList();
  if (!suites.length) {
    console.error('usage: node dev-tools/find_vacuous_pins.cjs tests/foo.test.js [...]');
    console.error('       node dev-tools/find_vacuous_pins.cjs --from list.txt');
    return 2;
  }

  const results = [];
  for (const testPath of suites) {
    if (!fs.existsSync(path.join(ROOT, testPath))) {
      console.error(`skip (missing): ${testPath}`);
      continue;
    }
    const reads = filesRead(testPath);
    if (!reads.length) {
      results.push({ testPath, verdict: 'skipped', why: 'reads no source file directly' });
      continue;
    }

    const baseline = DRY ? { passed: true, text: '' } : runSuite(testPath);
    if (!baseline.passed) {
      results.push({ testPath, verdict: 'already-failing', why: 'fails before any mutation; fix or triage it first', reads });
      continue;
    }

    const dirty = reads.filter(isDirty);
    if (dirty.length) {
      results.push({ testPath, verdict: 'skipped', why: `refusing to mutate dirty file(s): ${dirty.join(', ')}`, reads });
      continue;
    }

    if (DRY) {
      results.push({ testPath, verdict: 'planned', why: `would mutate: ${reads.join(', ')}`, reads });
      continue;
    }

    // --scope: does the suite still pass when only the code OUTSIDE the regions
    // it names is destroyed? If not, it was matching text beyond its own anchors
    // — a widened region, the failure plain gutting cannot see.
    const outOfScope = [];
    if (SCOPE) {
      const suiteSrc = fs.readFileSync(path.join(ROOT, testPath), 'utf8');
      const anchors = anchorsIn(suiteSrc);
      // Only suites whose assertions target the SLICED REGION can be widened.
      // Two shapes make this mutation meaningless, and together they were 18 of
      // 40 suites — a 45% false-positive rate that would have buried any real
      // finding:
      //   1. asserting against the WHOLE source (`expect(src).toContain(...)`)
      //      alongside a slice. Gutting outside the anchors legitimately removes
      //      text such an assertion checks. brainatlas_data_colors does exactly
      //      this on line 50.
      //   2. EXTRACTING and EXECUTING source (`new Function(span(...))`,
      //      vm.runInContext). Gutting removes data and helpers the extracted
      //      code needs, so the suite dies on a broken fixture, not on scope.
      //      autorepair_quiz_position_bias splices four spans and runs them.
      //   3. RENDERING the tool and slicing the resulting HTML. The anchors look
      //      identical to source anchors, but they are applied to rendered
      //      output; gutting the source means nothing renders at all, so the
      //      suite fails for a reason unrelated to scope. Four brain_atlas_*
      //      suites were flagged for exactly this.
      const rendersTool = /renderTool\(|renderToStaticMarkup\(|loadTool\(|\brender\s*\(/.test(suiteSrc);
      const executesSource = /new Function\(|vm\.runInContext|(?<![\w.])eval\(/.test(suiteSrc);
      const assertsWholeSource = /expect\(\s*(?:src|source|SRC|SOURCE|host|anti)\s*\)\s*\.\s*(?:not\s*\.\s*)?(?:toContain|toMatch)/.test(suiteSrc);
      const scopeMeaningful = anchors.length > 0 && !executesSource && !assertsWholeSource && !rendersTool;
      for (const rel of scopeMeaningful ? reads : []) {
        const full = path.join(ROOT, rel);
        const original = fs.readFileSync(full);
        const scoped = gutOutsideAnchors(original.toString('utf8'), anchors, 4000);
        if (!scoped) continue; // no anchor of this suite appears in this file
        journalBegin(rel, full, original);
        try {
          fs.writeFileSync(full, scoped, 'utf8');
          if (!runSuite(testPath).passed) outOfScope.push(rel);
        } finally {
          restoreOrDie(full, rel, original);
          journalEnd();
        }
      }
    }

    const blind = [];
    for (const rel of reads) {
      const full = path.join(ROOT, rel);
      const original = fs.readFileSync(full);
      journalBegin(rel, full, original);
      try {
        fs.writeFileSync(full, gut(original.toString('utf8')), 'utf8');
        const mutated = runSuite(testPath);
        if (mutated.passed) blind.push(rel);
      } finally {
        restoreOrDie(full, rel, original);
        journalEnd();
      }
    }

    // A suite is VACUOUS only when destroying EVERY file it reads leaves it
    // green — that is the case where it pins nothing at all. A suite that
    // notices some files but not others is not vacuous: it legitimately reads a
    // file for a NEGATED assertion (`not.toMatch`, which a gutted file satisfies
    // for free), or reads source text while the behaviour under test is loaded
    // from a built artifact. allobot_conversation_first_intake was reported
    // VACUOUS for exactly that shape — it drives the real voice loop out of
    // allo_commands_MODULE.js and only reads allo_commands_SOURCE.jsx for one
    // `not.toMatch`; all 28 of its tests are healthy. Calling that vacuous sends
    // someone to re-anchor a suite that is already correct, and a tool that
    // cries wolf is one people stop running.
    const partial = blind.length > 0 && blind.length < reads.length;
    results.push({
      testPath,
      verdict: blind.length === 0 ? (outOfScope.length ? 'WIDENED' : 'ok') : (partial ? 'partial' : 'VACUOUS'),
      why: blind.length === 0
        ? (outOfScope.length
          ? `passes only because it matches code OUTSIDE its own anchors in: ${outOfScope.join(', ')} — a stale END anchor has widened the region`
          : 'notices when its source is destroyed')
        : (partial
          ? `does not pin ${blind.join(', ')} — but does notice its other source(s), so it is not vacuous`
          : `still passes with these gutted: ${blind.join(', ')}`),
      reads,
    });
  }

  console.log('');
  for (const r of results) {
    const tag = { VACUOUS: 'VACUOUS ', WIDENED: 'WIDENED ', partial: 'partial ', ok: 'ok      ', skipped: 'skipped ', 'already-failing': 'FAILING ', planned: 'planned ' }[r.verdict] || `${r.verdict} `;
    console.log(`${tag} ${r.testPath}`);
    console.log(`         ${r.why}`);
  }
  const vacuous = results.filter((r) => r.verdict === 'VACUOUS');
  console.log(`\n${results.length} suite(s): ${vacuous.length} vacuous, ` +
    `${results.filter((r) => r.verdict === 'ok').length} ok, ` +
    `${results.filter((r) => r.verdict === 'partial').length} partial, ` +
    `${results.filter((r) => r.verdict === 'WIDENED').length} widened, ` +
    `${results.filter((r) => r.verdict === 'already-failing').length} already failing, ` +
    `${results.filter((r) => r.verdict === 'skipped').length} skipped.`);
  if (vacuous.length) {
    console.log('\nA vacuous suite asserts on a region that no longer exists. Re-point its anchors');
    console.log("at what the code says now, and slice with tests/helpers/anchored_slice.js so the");
    console.log('next rename fails loudly instead of silently widening the region.');
  }
  const widened = results.filter((r) => r.verdict === 'WIDENED');
  if (widened.length) {
    console.log('\nA WIDENED suite is not vacuous — it pins something — but it is matching code');
    console.log('outside the region it names, so it no longer guards what its name claims.');
    console.log('Re-point its END anchor and slice with tests/helpers/anchored_slice.js.');
  }
  return (vacuous.length + widened.length) ? 1 : 0;
}

process.exit(main());
