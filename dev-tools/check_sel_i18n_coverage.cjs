#!/usr/bin/env node
'use strict';
/*
 * SEL hub translation coverage — a ratchet, not a pass/fail on the whole job.
 *
 * WHY THIS EXISTS (2026-09-21)
 * The SEL hub shipped English-only in all 63 language packs while STEM was at
 * 83% (67,145 of 80,996 registered keys translated into Spanish). Each pack
 * carried TWO sel_hub strings. 106 of 150 STEM tools call __alloT; 0 of 72 SEL
 * tools did.
 *
 * The cause was never missing infrastructure — `window.__alloT` is set in ANTI
 * and the SEL shell already passes `t` through ctx. The tools simply never
 * called it. So this is a long CONTENT job: ~90,430 prose strings across 72
 * tools, translated the way STEM's were — by hand, in batches, over many
 * sessions (see lang/SPANISH_TRANSLATION_HANDOFF.md: 8,440 keys in batches of
 * 75 per edit).
 *
 * A gate that failed until all 72 tools were done would be red for months and
 * teach everyone to ignore it. So this one:
 *
 *   1. REPORTS coverage per tool and hub-wide, so progress is visible;
 *   2. RATCHETS the number of WIRED tools — once a tool calls __alloT it may
 *      not silently stop, which is the regression that actually costs work;
 *   3. BLOCKS a wired tool whose keys are registered but whose shim is missing
 *      or malformed (the `ctx.t` fallback-dropping shape), because that ships
 *      raw keys like `sel.safety.foo` to a student.
 *
 * Usage:  node dev-tools/check_sel_i18n_coverage.cjs [--update] [--selftest]
 * Exit:   non-zero if a previously wired tool regressed, or a wired tool has a
 *         broken shim.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'sel_hub');
const BASELINE = path.join(ROOT, 'dev-tools', 'sel_i18n_coverage_baseline.json');
const UPDATE = process.argv.includes('--update');
const SELFTEST = process.argv.includes('--selftest');

/**
 * A correct shim reads ctx.t AND carries the English fallback. The SEL shell's
 * own `t` echoes the key when nothing is registered (sel_hub_module.js:2114),
 * so a shim that drops the fallback renders `sel.tool.key` at the student.
 */
function shimHealth(src) {
  if (src.indexOf('__alloT') === -1) return 'absent';
  const decl = /var\s+__alloT\s*=\s*function\s*\(\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\)/.exec(src);
  if (!decl) return 'malformed';                       // used but never declared with 2 args
  // Search the BODY, not the declaration: the fallback's parameter NAME lives
  // in the signature, so testing the whole slice always matched and the
  // fallback-dropping shape sailed through (caught by --selftest, 2026-09-21).
  const afterSig = src.indexOf('{', decl.index + decl[0].length);
  if (afterSig === -1) return 'malformed';
  const body = src.slice(afterSig, afterSig + 600);
  if (!/ctx\.t/.test(body)) return 'malformed';
  // The fallback must be RETURNED, not merely accepted as a parameter. Built
  // with a literal regex rather than a string: a `\b` inside a Python-written
  // string became a literal BACKSPACE and the healthy shim started failing.
  const fb = decl[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const returnsFallback = new RegExp('return[^;]{0,120}\\b' + fb + '\\b');
  if (!returnsFallback.test(body)) return 'malformed';
  return 'ok';
}

function scan() {
  const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
  const sel = ui.sel || {};
  const tools = [];
  for (const name of fs.readdirSync(DIR).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort()) {
    const src = fs.readFileSync(path.join(DIR, name), 'utf8');
    const id = name.replace('sel_tool_', '').replace('.js', '');
    const calls = (src.match(/__alloT\(/g) || []).length;
    // Sentence-like literals: a rough denominator, deliberately not exact.
    const prose = (src.match(/(?:^|[,:(\[])\s*(["'])[A-Z][a-z][^"'\n]{14,}\1/gm) || []).length;
    tools.push({
      id,
      wired: calls > 0,
      calls,
      prose,
      registered: sel[id] ? Object.keys(sel[id]).length : 0,
      shim: shimHealth(src),
    });
  }
  return tools;
}

if (SELFTEST) {
  const good = "var __alloT = function (key, fallback) { var fn = (ctx && typeof ctx.t === 'function') ? ctx.t : null; var v = null; if (fn) { try { v = fn(key, fallback); } catch (e) { v = null; } } return (v == null) ? fallback : v; }; __alloT('a','b');";
  const dropped = "var __alloT = function (key, fallback) { return ctx.t(key); }; __alloT('a','b');";
  const absent = "var x = 1;";
  const a = shimHealth(good) === 'ok';
  const b = shimHealth(dropped) === 'malformed';
  const c = shimHealth(absent) === 'absent';
  console.log(`SELFTEST: healthy ${a ? '✓' : '✗'} · fallback-dropping ${b ? 'CAUGHT ✓' : 'MISSED ✗'} · absent ${c ? '✓' : '✗'}`);
  process.exit(a && b && c ? 0 : 1);
}

const tools = scan();
const wired = tools.filter((t) => t.wired);
const broken = wired.filter((t) => t.shim !== 'ok');
const totalProse = tools.reduce((n, t) => n + t.prose, 0);
const totalReg = tools.reduce((n, t) => n + t.registered, 0);

if (UPDATE) {
  fs.writeFileSync(BASELINE, JSON.stringify({
    wiredCount: wired.length,
    wired: wired.map((t) => t.id).sort(),
    registered: totalReg,
  }, null, 1));
  console.log(`baseline written: ${wired.length} wired tool(s), ${totalReg} key(s) registered`);
  process.exit(0);
}

let prior = { wiredCount: 0, wired: [], registered: 0 };
if (fs.existsSync(BASELINE)) prior = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

console.log('SEL hub translation coverage');
console.log(`  tools wired   : ${wired.length} of ${tools.length}   (baseline ${prior.wiredCount})`);
console.log(`  keys registered: ${totalReg}   (baseline ${prior.registered})`);
console.log(`  prose strings : ~${totalProse.toLocaleString()} across the hub\n`);

for (const t of wired.sort((a, b) => b.registered - a.registered)) {
  const flag = t.shim === 'ok' ? '' : `  ✗ shim ${t.shim}`;
  console.log(`  ${t.id.padEnd(22)} ${String(t.registered).padStart(4)} keys · ${String(t.calls).padStart(3)} calls${flag}`);
}

const regressed = prior.wired.filter((id) => !wired.some((t) => t.id === id));
if (regressed.length) {
  console.log(`\n  ✗ ${regressed.length} tool(s) STOPPED calling __alloT: ${regressed.join(', ')}`);
  console.log('      A wired tool that loses its shim ships English to every language.');
}
for (const b of broken) {
  console.log(`\n  ✗ ${b.id}: shim is ${b.shim}.`);
  console.log('      Without a fallback the SEL shell echoes the KEY, so a student');
  console.log('      sees `sel.' + b.id + '.something` instead of words.');
}

const fail = regressed.length > 0 || broken.length > 0;
if (!fail) {
  console.log(`\n✓ check_sel_i18n_coverage: ${wired.length} wired tool(s), all shims healthy, none regressed.`);
  const left = tools.length - wired.length;
  if (left) console.log(`  ${left} tool(s) still English-only — tracked, not blocking.`);
}
process.exit(fail ? 1 : 0);
