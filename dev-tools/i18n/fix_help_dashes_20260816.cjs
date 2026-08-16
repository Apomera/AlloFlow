#!/usr/bin/env node
// RULES.md section 5 forbids em/en dashes in user-facing text. help_strings.js carried 452
// of them across 325 entries. A dash is also a poor fit for the 3rd-4th grade target: it
// glues two clauses into one long sentence. So the rewrite splits rather than substitutes.
//
// Rules, in order:
//   1. numeric range  "1–10"           -> "1 to 10"
//   2. dash followed by a coordinating conjunction (and/but/so/or/...) -> ", "
//      (a period there would strand the sentence on "And ...")
//   3. otherwise -> ". " and capitalize the next word, turning one long sentence into two
//      short ones. Skipped when the left side already ends in sentence punctuation, or when
//      the next character is not a lowercase Latin letter (leave other scripts alone).
//
// Every replacement is dumped to a review file; nothing here is trusted blind.
// Usage: node dev-tools/i18n/fix_help_dashes_20260816.cjs [--write] [--review=<path>]
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..', 'help_strings.js');
const WRITE = process.argv.includes('--write');
const revArg = process.argv.find((a) => a.startsWith('--review='));
const REVIEW = revArg ? revArg.slice('--review='.length) : null;

const CONJ = /^(and|but|so|or|nor|yet|then|plus|while|though|although|because|which|who|that|not)\b/i;

const review = [];
let n = 0;

function fixValue(key, v) {
  let out = v;
  // 1. numeric ranges
  out = out.replace(/(\d)\s*[–—]\s*(\d)/g, '$1 to $2');
  // 2 + 3. clause dashes
  out = out.replace(/\s*[—–]\s*(\S)/g, (m, next, off, whole) => {
    const before = whole.slice(0, off).replace(/\s+$/, '');
    const after = whole.slice(off + m.length - 1);
    if (CONJ.test(after)) return ', ' + next;
    if (/[.!?:;,]$/.test(before)) return ' ' + next;
    // Inside an open parenthetical a full stop reads wrong ("(20 seconds. Gives time…)"),
    // so keep the aside as one phrase.
    const openParen = before.lastIndexOf('(') > before.lastIndexOf(')');
    if (openParen) return ', ' + next;
    if (next >= 'a' && next <= 'z') return '. ' + next.toUpperCase();
    return '. ' + next;
  });
  if (out !== v) {
    n++;
    review.push('### ' + key + '\n-- ' + v + '\n++ ' + out + '\n');
  }
  return out;
}

let src = fs.readFileSync(SRC, 'utf8');
// Rewrite in place, entry by entry, so formatting and comments survive untouched.
// Entry shape: 'key': "value with \" escapes",  — the file mixes quoted and bare keys,
// so both forms have to match or the bare ones silently keep their dashes.
const ENTRY = /('[A-Za-z0-9_.:-]+'|"[A-Za-z0-9_.:-]+"|[A-Za-z_$][A-Za-z0-9_$]*)(\s*:\s*)"((?:[^"\\]|\\.)*)"/g;
const outSrc = src.replace(ENTRY, (m, k, sep, val) => {
  const key = /^['"]/.test(k) ? k.slice(1, -1) : k;
  const decoded = val.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (!/[—–]/.test(decoded)) return m;
  const fixed = fixValue(key, decoded);
  const encoded = fixed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return k + sep + '"' + encoded + '"';
});

if (/[—–]/.test(outSrc.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) {
  console.error('WARNING: dashes remain after the pass (check the review file for what the entry regex missed).');
}

if (REVIEW) fs.writeFileSync(REVIEW, review.join('\n'), 'utf8');
if (WRITE) {
  // Parse-check before committing to disk.
  const probe = outSrc.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const obj = eval('(' + probe + ')');
  if (Object.keys(obj).length < 900) throw new Error('entry count collapsed: ' + Object.keys(obj).length);
  fs.writeFileSync(SRC, outSrc, 'utf8');
}
console.log(`${WRITE ? '' : '[dry] '}help_strings dashes: ${n} entr(ies) rewritten${REVIEW ? `, review -> ${REVIEW}` : ''}`);
