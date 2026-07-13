#!/usr/bin/env node
// check_i18n_fallback.cjs — block the `__alloT = ctx.t` fallback regression.
//
// The host `ctx.t` (= props.t) is a SINGLE-ARG translator: t(key) -> translation or
// undefined. It ignores a fallback 2nd arg. So `var __alloT = <param>.t || fn` makes
// __alloT === ctx.t and its fallback branch is dead code — any stem.<tool>.<key> not
// in the loaded pack renders the literal string "undefined" (moneyMath + 74 tools,
// 2026-07-04). __alloT MUST be defined as a wrapper that applies the fallback itself:
//   var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t==='function') ?
//     ctx.t(k, fb) : null; } catch(e){ v=null; } return (v==null) ? (fb!=null?fb:k) : v; };
//
// This gate fails if any tool declares __alloT as a direct alias of <param>.t. It does
// NOT touch `t` (that alias is intentionally overloaded as a local in many tools).
//
// Usage: node dev-tools/check_i18n_fallback.cjs [--quiet]
// Exit: 0 clean · 1 if any buggy decl is found.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');

// `var __alloT = <ident>.t` with or without a `|| ...` tail (the buggy short-circuit).
// The correct wrapper form is `var __alloT = function (...)` and does NOT match.
const BUGGY = /var\s+__alloT\s*=\s*[A-Za-z_$][\w$]*\.t\b/;

const offenders = [];
for (const dir of ['stem_lab', 'sel_hub']) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d)) {
    if (!/^(stem|sel)_tool_.+\.js$/.test(f) || f.endsWith('.bak')) continue;
    const p = path.join(d, f);
    let src;
    try { src = fs.readFileSync(p, 'utf8'); } catch (_) { continue; }
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (BUGGY.test(lines[i])) offenders.push(`${dir}/${f}:${i + 1}`);
    }
  }
}

if (offenders.length) {
  console.error('✖ check_i18n_fallback: ' + offenders.length + ' buggy `__alloT = <param>.t` decl(s) — these render "undefined" for any key missing from the pack.');
  for (const o of offenders) console.error('    ' + o);
  console.error('  Fix: define __alloT as a wrapper that applies the fallback (see this file\'s header).');
  process.exit(1);
}
if (!QUIET) console.log('✓ check_i18n_fallback: no `__alloT = ctx.t` fallback-dropping decls in STEM/SEL tools.');
process.exit(0);
