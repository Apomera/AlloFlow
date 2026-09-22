#!/usr/bin/env node
'use strict';
/*
 * STEM __alloT key registration — a ratchet on unregistered call sites.
 *
 * WHY THIS EXISTS (2026-09-22)
 * `__alloT('stem.<tool>.<key>', 'English fallback')` renders the fallback when
 * the key is absent from ui_strings.js. That is not a visible failure: the tool
 * looks perfect in English, forever, in every language. Nothing checked it, so
 * 1,929 distinct call sites across 103 tools were calling keys that no language
 * pack can ever translate — 3.4% of the surface, concentrated in a handful of
 * tools (cephalopodlab 355, treelab 341, machinelab 312, printingpress 191).
 *
 * The existing i18n gates do not cover this:
 *   - check_i18n_fallback  — shape of the __alloT SHIM, not the keys it calls.
 *   - check_sel_i18n_coverage — whether a SEL tool is wired at all, and sel.*.
 *   - check_ui_strings_drift  — the two ui_strings.js copies agreeing.
 * None compares a STEM call site against the registry.
 *
 * SHAPE: ratchet, not pass/fail. Registering 1,929 keys is a long content job
 * (they must be extracted faithfully — a reworded fallback ships stale text to
 * every language once the key IS registered). A gate that stayed red until the
 * job finished would teach everyone to ignore it. So this one pins the CURRENT
 * per-tool count and fails only when a tool gets WORSE, which is the regression
 * that actually costs work: a new call site added without registering its key.
 *
 * Usage:  node dev-tools/check_stem_i18n_registration.cjs [--update] [--selftest]
 * Exit:   non-zero if any tool exceeds its baseline, or --selftest fails.
 *
 * --update rewrites the baseline. Run it after registering keys (the count goes
 * DOWN and the ratchet tightens) — never to paper over a regression.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TOOL_DIR = path.join(ROOT, 'stem_lab');
const BASELINE = path.join(ROOT, 'dev-tools', 'stem_i18n_registration_baseline.json');
const UPDATE = process.argv.includes('--update');
const SELFTEST = process.argv.includes('--selftest');

/**
 * Every distinct `stem.<ns>.<key>` a source calls, grouped by namespace.
 * A tool may legitimately call another tool's namespace (shared strings), so
 * the namespace comes from the call site, not from the filename.
 */
function keysCalledBy(src) {
  const byNs = new Map();
  // Keys may nest deeper than two levels: machinelab and gisstudio use
  // stem.<tool>.<group>.<key> (e.g. stem.machinelab.windlass.copy_g68).
  // Stopping at two levels made 129 call sites invisible to this gate.
  const re = /__alloT\('stem\.([a-z0-9_]+)\.([a-z0-9_]+(?:\.[a-z0-9_]+)*)'/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (!byNs.has(m[1])) byNs.set(m[1], new Set());
    byNs.get(m[1]).add(m[2]);
  }
  return byNs;
}

/** Walk a dotted path; undefined if any segment is absent. */
function lookup(obj, dotted) {
  let cur = obj;
  for (const seg of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, seg)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

function unregisteredCount(src, stemRegistry) {
  let called = 0;
  let missing = 0;
  for (const [ns, keys] of keysCalledBy(src)) {
    const reg = stemRegistry[ns] || {};
    for (const k of keys) {
      called += 1;
      if (lookup(reg, k) === undefined) missing += 1;
    }
  }
  return { called, missing };
}

/**
 * Keys called with two or more DIFFERENT English fallbacks in one file.
 * Registering such a key is lossy: ui_strings holds one value and overrides
 * every call site, so one of the texts is silently replaced. The common shape
 * is a visible label using symbols ("Activation energy Ea") paired with an
 * aria-label that spells them out ("...in kilojoules per mole"), so the
 * collapse costs screen-reader users the unit.
 */
function collidingKeys(src) {
  const byKey = new Map();
  const re = /(.{0,40})__alloT\('stem\.([a-z0-9_]+)\.([a-z0-9_]+(?:\.[a-z0-9_]+)*)',\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const key = m[2] + '.' + m[3];
    let val;
    try { val = JSON.parse(toJsonLiteral(m[4])); } catch (e) { continue; }
    if (!byKey.has(key)) byKey.set(key, { vals: new Set(), aria: false });
    const rec = byKey.get(key);
    rec.vals.add(val);
    if (/aria-label|aria-description|title:/.test(m[1])) rec.aria = true;
  }
  const out = [];
  for (const [key, rec] of byKey) {
    if (rec.vals.size > 1) out.push({ key, vals: [...rec.vals], aria: rec.aria });
  }
  return out;
}

/** A JS string literal (either quote style) as a JSON literal, for safe parsing. */
function toJsonLiteral(lit) {
  const body = lit.slice(1, -1);
  if (lit[0] === '"') return lit;
  // single-quoted: unescape \' and escape any bare "
  return '"' + body.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"';
}

function loadRegistry() {
  const raw = fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8');
  const ui = JSON.parse(raw.slice(raw.indexOf('{')).trim().replace(/;$/, ''));
  return ui.stem || {};
}

if (SELFTEST) {
  // The detector must fire on an unregistered key and stay quiet on a
  // registered one. A gate that cannot fail is worse than no gate.
  const registry = { demo: { known: 'Known' } };
  const clean = "__alloT('stem.demo.known', 'Known')";
  const dirty = "__alloT('stem.demo.known', 'Known') __alloT('stem.demo.ghost', 'Ghost')";
  const a = unregisteredCount(clean, registry);
  const b = unregisteredCount(dirty, registry);
  // A namespace absent from the registry entirely must count as missing, not crash.
  const c = unregisteredCount("__alloT('stem.nosuch.key', 'X')", registry);
  const okA = a.called === 1 && a.missing === 0;
  const okB = b.called === 2 && b.missing === 1;
  const okC = c.called === 1 && c.missing === 1;
  // Deep keys (stem.<tool>.<group>.<key>) must be seen, not skipped.
  const deepReg = { demo: { grp: { known: 'K' } } };
  const dOk = unregisteredCount("__alloT('stem.demo.grp.known', 'K')", deepReg);
  const dBad = unregisteredCount("__alloT('stem.demo.grp.ghost', 'G')", deepReg);
  const okG = dOk.called === 1 && dOk.missing === 0;
  const okH = dBad.called === 1 && dBad.missing === 1;
  // Collision detection must fire on two texts and stay quiet on one.
  const same = "__alloT('stem.demo.k', 'One') __alloT('stem.demo.k', 'One')";
  const diff = "'aria-label': __alloT('stem.demo.k', 'One') __alloT('stem.demo.k', 'Two')";
  const okD = collidingKeys(same).length === 0;
  const dc = collidingKeys(diff);
  const okE = dc.length === 1 && dc[0].vals.length === 2 && dc[0].aria === true;
  // and it must handle BOTH quote styles, incl. an apostrophe in double quotes
  const dq = '__alloT(\'stem.demo.q\', "Predator\'s eye") __alloT(\'stem.demo.q\', \'Other\')';
  const okF = collidingKeys(dq).length === 1;
  console.log(
    'SELFTEST: registered ' + (okA ? 'quiet OK' : 'FAIL') +
    ' | unregistered ' + (okB ? 'CAUGHT' : 'MISSED') +
    ' | unknown namespace ' + (okC ? 'CAUGHT' : 'MISSED') +
    ' | identical-fallback ' + (okD ? 'quiet OK' : 'FAIL') +
    ' | colliding ' + (okE ? 'CAUGHT+ARIA' : 'MISSED') +
    ' | both quote styles ' + (okF ? 'OK' : 'FAIL') +
    ' | deep key ' + (okG ? 'seen' : 'FAIL') +
    ' | deep missing ' + (okH ? 'CAUGHT' : 'MISSED')
  );
  process.exit(okA && okB && okC && okD && okE && okF && okG && okH ? 0 : 1);
}

const registry = loadRegistry();
const rows = [];
for (const file of fs.readdirSync(TOOL_DIR).filter((f) => /^stem_tool_.*\.js$/.test(f)).sort()) {
  const src = fs.readFileSync(path.join(TOOL_DIR, file), 'utf8');
  const id = file.replace('stem_tool_', '').replace('.js', '');
  const { called, missing } = unregisteredCount(src, registry);
  if (called === 0) continue;
  // A colliding key that is STILL UNREGISTERED is a trap for whoever
  // registers next; one already registered has already lost a text.
  const collisions = collidingKeys(src).filter((c) => {
    const [ns, k] = c.key.split('.');
    return !Object.prototype.hasOwnProperty.call(registry[ns] || {}, k);
  });
  rows.push({ id, called, missing, collisions });
}

const totalCalled = rows.reduce((n, r) => n + r.called, 0);
const totalMissing = rows.reduce((n, r) => n + r.missing, 0);
const clean = rows.filter((r) => r.missing === 0).length;

if (UPDATE) {
  const out = {
    _comment:
      'Per-tool count of DISTINCT __alloT keys not registered in ui_strings.js. ' +
      'A tool may not exceed its number. Lower it by registering keys, then re-run with --update.',
    _generated: new Date().toISOString().slice(0, 10),
    _totals: { tools: rows.length, called: totalCalled, missing: totalMissing },
    tools: Object.fromEntries(rows.map((r) => [r.id, r.missing])),
  };
  fs.writeFileSync(BASELINE, JSON.stringify(out, null, 2) + '\n');
  console.log('[updated] ' + BASELINE);
  console.log('  ' + rows.length + ' tools, ' + totalMissing + ' unregistered of ' + totalCalled + ' called');
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('[abort] no baseline. Run with --update once to create it.');
  process.exit(2);
}
const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')).tools || {};

const regressed = [];
const improved = [];
for (const r of rows) {
  const was = Object.prototype.hasOwnProperty.call(base, r.id) ? base[r.id] : 0;
  if (r.missing > was) regressed.push({ ...r, was });
  else if (r.missing < was) improved.push({ ...r, was });
}

console.log('STEM __alloT registration: ' + totalMissing + ' unregistered keys across ' +
            rows.length + ' tools (' + clean + ' fully clean)');

const withCollisions = rows.filter((r) => r.collisions && r.collisions.length);
if (withCollisions.length) {
  const total = withCollisions.reduce((n, r) => n + r.collisions.length, 0);
  const aria = withCollisions.reduce((n, r) => n + r.collisions.filter((c) => c.aria).length, 0);
  console.log('');
  console.log('! ' + total + ' unregistered key(s) across ' + withCollisions.length +
              ' tool(s) carry TWO different English fallbacks (' + aria + ' involve an aria-label).');
  console.log('  Registering one of these REPLACES one of its texts. Split the key first');
  console.log('  (e.g. foo + foo_aria) rather than picking a winner.');
  for (const r of withCollisions.slice(0, 6)) {
    for (const c of r.collisions.slice(0, 2)) {
      console.log('    ' + c.key + (c.aria ? '  [ARIA]' : ''));
      for (const v of c.vals.slice(0, 2)) console.log('      - ' + JSON.stringify(v).slice(0, 80));
    }
  }
}

if (improved.length) {
  console.log('');
  console.log('improved (run --update to tighten the ratchet):');
  for (const r of improved) console.log('  ' + r.id + ': ' + r.was + ' -> ' + r.missing);
}

if (regressed.length) {
  console.log('');
  console.error('x check_stem_i18n_registration FAILED');
  for (const r of regressed) {
    console.error('  * ' + r.id + ': ' + r.was + ' -> ' + r.missing +
                  ' unregistered key' + (r.missing === 1 ? '' : 's'));
  }
  console.error('');
  console.error('  A key absent from ui_strings.js renders its English fallback in EVERY');
  console.error('  language, forever, and nothing else reports it. Register the new keys');
  console.error('  in ui_strings.js (both copies) rather than raising this baseline.');
  console.error('  stem.<tool> is NESTED under stem, so dev-tools/i18n/add_ui_keys.cjs');
  console.error('  (top-level only) will abort — splice by hand with the same rails.');
  process.exit(1);
}

console.log('check_stem_i18n_registration: no tool regressed against its baseline.');
