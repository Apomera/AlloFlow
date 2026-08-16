#!/usr/bin/env node
// screen_scope_handwritten_theme_rules.cjs — one-time transform (2026-08-16).
//
// Wraps every top-level .theme-dark / .theme-contrast rule in the HAND-WRITTEN
// <style> blocks of app_styles_source.jsx in `@media screen { ... }`, one wrapper
// per rule, position preserved (so cascade order is untouched — @media changes
// neither specificity nor order).
//
// Why: these rules are !important, so they beat every `print:` colour variant in
// the repo regardless of media. W2 measured a crossword printed from dark mode
// rendering as a near-black page, and proved that fixing only the GENERATED block
// is insufficient: a hand-written `.theme-dark .bg-white` took over. Both layers
// must be screen-scoped. The generated block is handled by gen_docsuite_theme v4;
// this script handles the hand-written layer.
//
// Idempotent: a rule already inside any @media is left alone (the walk only sees
// top-level rules, and a wrapped rule is nested).
//
// Usage: node dev-tools/screen_scope_handwritten_theme_rules.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'app_styles_source.jsx');
const DRY = process.argv.includes('--dry-run');

// Brace-aware top-level walk (same logic W2's c7fix2_full.mjs verified against a
// browser). Returns the css with each top-level .theme-* rule wrapped.
function wrapThemeRules(css, counter) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (/\s/.test(css[i])) { out += css[i]; i++; continue; }
    if (css.startsWith('/*', i)) { const e = css.indexOf('*/', i) + 2; out += css.slice(i, e); i = e; continue; }
    const braceOpen = css.indexOf('{', i);
    if (braceOpen < 0) { out += css.slice(i); break; }
    let depth = 0, j = braceOpen;
    for (; j < css.length; j++) { if (css[j] === '{') depth++; else if (css[j] === '}') { depth--; if (!depth) break; } }
    const rule = css.slice(i, j + 1);
    const selector = css.slice(i, braceOpen);
    if (!selector.trim().startsWith('@') && /\.theme-(dark|contrast)\b/.test(selector)) {
      out += '@media screen { ' + rule + ' }';
      counter.wrapped++;
    } else {
      out += rule;
    }
    i = j + 1;
  }
  return out;
}

const source = fs.readFileSync(FILE, 'utf8');
const counter = { wrapped: 0, blocks: 0 };
const next = source.replace(/<style(?![^>]*data-docsuite-theme)([^>]*)>\{`([\s\S]*?)`\}<\/style>/g, (whole, attrs, css) => {
  counter.blocks++;
  const wrapped = wrapThemeRules(css, counter);
  return '<style' + attrs + '>{`' + wrapped + '`}</style>';
});

if (/[`\\]/.test(next.replace(/[\s\S]*?/, '')) === false) { /* no-op guard shape */ }
console.log('blocks scanned: ' + counter.blocks + ', theme rules wrapped: ' + counter.wrapped);
if (counter.wrapped === 0) { console.log('nothing to do (already scoped).'); process.exit(0); }
if (DRY) { console.log('[dry-run] not written.'); process.exit(0); }
fs.writeFileSync(FILE, next);
console.log('written.');
