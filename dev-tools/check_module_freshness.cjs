// Source-vs-module staleness gate (deep dive 2026-07-27).
//
// WHY THIS EXISTS. ~120 modules in this repo are generated from a *_source.jsx by a hand-run
// _build_*_module.js script. Only ten of them are in build.js's COMPILE_PAIRS and get rebuilt by
// `node build.js --compile`. For the rest, editing the source and committing does NOT change what
// ships — the app loads the module from the CDN.
//
// That bit hard: four remediation fixes (H18, M20's loop half, L11, L12) were written to
// misc_handlers_source.jsx, committed, tested, and never shipped, because every test reads the
// SOURCE and no gate compared the two. Worse, M20 was split across two files — the half in
// doc_pipeline (an auto-compiled module) DID ship and removed the fallback the other half was
// meant to replace, so the net effect of "fixing" it was to make a watchdog strictly worse.
//
// The check is git-based rather than content-based: a module is STALE when its source has commits
// newer than the module's own last commit. That is cheap, needs no rebuild, and catches exactly the
// "committed the source, forgot the module" mistake.
//
// Pre-existing staleness is baselined in dev-tools/module_freshness_baseline.json, in the same
// allowlist-plus-anti-rot shape as tests/QUARANTINE.txt: a NEW stale pair fails the gate, and a
// baselined pair that has since been rebuilt must leave the file. Run with --update to re-baseline
// deliberately.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(__dirname, 'module_freshness_baseline.json');

const git = (args) => {
  try { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch (_) { return ''; }
};

// Discover pairs from the build scripts themselves, so a new module is covered the day it appears.
function discoverPairs() {
  const pairs = [];
  for (const f of fs.readdirSync(ROOT)) {
    if (!/^_build_.*\.js$/.test(f)) continue;
    let body = '';
    try { body = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { continue; }
    const src = (body.match(/[a-z0-9_]+_source\.jsx/i) || [])[0];
    const mod = (body.match(/[a-z0-9_]+_module\.js/i) || [])[0];
    if (!src || !mod) continue;
    if (!fs.existsSync(path.join(ROOT, src)) || !fs.existsSync(path.join(ROOT, mod))) continue;
    pairs.push({ builder: f, source: src, module: mod });
  }
  return pairs.sort((a, b) => a.source.localeCompare(b.source));
}

// A source commit that touched ONLY comments still counts — cheap to rebuild, and "is the shipped
// artifact built from the committed source" is the property we actually want.
function staleness(pair) {
  const srcCommit = git(['log', '-1', '--format=%H', '--', pair.source]);
  const modCommit = git(['log', '-1', '--format=%H', '--', pair.module]);
  if (!srcCommit || !modCommit) return null;
  if (srcCommit === modCommit) return null;
  // Is the module's commit an ancestor of the source's? If so the source is genuinely newer.
  const behind = git(['rev-list', '--count', modCommit + '..' + srcCommit, '--', pair.source]);
  const n = Number(behind);
  if (!Number.isFinite(n) || n <= 0) return null;
  return { commitsBehind: n, sourceCommit: srcCommit.slice(0, 9), moduleCommit: modCommit.slice(0, 9) };
}

const pairs = discoverPairs();
const stale = [];
for (const p of pairs) {
  const s = staleness(p);
  if (s) stale.push(Object.assign({}, p, s));
}

const staleNames = stale.map((s) => s.module).sort();

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE, JSON.stringify({
    note: 'Modules known to be behind their source. A NEW entry fails check_module_freshness; a rebuilt one must be removed. Regenerate deliberately with --update.',
    updated: new Date().toISOString().slice(0, 10),
    stale: staleNames,
  }, null, 2) + '\n', 'utf8');
  console.log('check_module_freshness: baseline updated with ' + staleNames.length + ' known-stale module(s).');
  process.exit(0);
}

let baseline = { stale: [] };
try { baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (_) {}
const known = new Set(baseline.stale || []);

const introduced = stale.filter((s) => !known.has(s.module));
const fixed = Array.from(known).filter((m) => !staleNames.includes(m));

console.log('check_module_freshness: ' + pairs.length + ' source/module pair(s) checked, ' + stale.length + ' stale (' + known.size + ' baselined).');

let bad = false;
if (introduced.length) {
  bad = true;
  console.error('');
  console.error('FAIL — ' + introduced.length + ' module(s) are NEWLY stale. The source was committed but the module was not rebuilt,');
  console.error('so this change DOES NOT SHIP. Run the builder, then commit the module too:');
  for (const s of introduced) {
    console.error('  node ' + s.builder + '   (' + s.source + ' is ' + s.commitsBehind + ' commit(s) ahead of ' + s.module + ')');
  }
}
if (fixed.length) {
  bad = true;
  console.error('');
  console.error('FAIL — ' + fixed.length + ' baselined module(s) are no longer stale. Remove them from');
  console.error(path.relative(ROOT, BASELINE) + ' so the gate keeps protecting them:');
  for (const m of fixed) console.error('  ' + m);
}
if (!bad) console.log('check_module_freshness: OK — no new source/module drift.');
process.exit(bad ? 1 : 0);
