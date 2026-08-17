#!/usr/bin/env node
/**
 * add_ui_keys.cjs — append keys to an existing ui_strings.js namespace. W1.
 *
 *   node dev-tools/i18n/add_ui_keys.cjs --ns=volume_builder --payload=x.json [--apply]
 *
 * Why raw-text splicing instead of JSON.stringify(parsed): ui_strings.js is
 * ~70k lines of strict JSON with CRLF endings. Re-serialising it would rewrite
 * every line, producing an unreviewable diff and clobbering any concurrent
 * lane's work. This finds the namespace's closing brace by brace-matching and
 * inserts before it, leaving every other byte untouched.
 *
 * Safety rails, all fatal:
 *   - file must parse as JSON before AND after
 *   - namespace must exist and be an object
 *   - no key may already exist (a second run aborts rather than duplicating)
 *   - added-count must equal payload size
 *   - every added value must survive the round trip verbatim
 *   - nothing outside the target namespace may change
 *
 * Run under the fleet lock for ui_strings.js.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (name) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : null;
};
const NS = getArg('ns');
const PAYLOAD = getArg('payload');
const APPLY = args.includes('--apply');

if (!NS || !PAYLOAD) {
  console.error('usage: --ns=<namespace> --payload=<file.json> [--apply]');
  process.exit(2);
}

const FILE = path.resolve(__dirname, '..', '..', 'ui_strings.js');
const additions = JSON.parse(fs.readFileSync(path.resolve(PAYLOAD), 'utf8'));
const raw = fs.readFileSync(FILE, 'utf8');

let before;
try {
  before = JSON.parse(raw);
} catch (err) {
  console.error('[abort] ui_strings.js does not parse:', err.message);
  process.exit(2);
}
if (!before[NS] || typeof before[NS] !== 'object' || Array.isArray(before[NS])) {
  console.error('[abort] namespace "' + NS + '" missing or not an object');
  process.exit(2);
}
const clash = Object.keys(additions).filter((k) => before[NS][k] !== undefined);
if (clash.length) {
  console.error('[abort] already present (applied before?): ' + clash.join(', '));
  process.exit(1);
}

// Locate the namespace object and brace-match to its closing brace.
const opener = '\n  ' + JSON.stringify(NS) + ': {';
const start = raw.indexOf(opener);
if (start < 0) {
  console.error('[abort] could not locate the "' + NS + '" block at top level');
  process.exit(2);
}
if (raw.indexOf(opener, start + 1) >= 0) {
  console.error('[abort] "' + NS + '" opener appears more than once');
  process.exit(2);
}
let depth = 0;
let close = -1;
let inStr = false;
let esc = false;
for (let i = start + opener.length - 1; i < raw.length; i++) {
  const c = raw[i];
  if (inStr) {
    if (esc) esc = false;
    else if (c === '\\') esc = true;
    else if (c === '"') inStr = false;
    continue;
  }
  if (c === '"') inStr = true;
  else if (c === '{') depth++;
  else if (c === '}') {
    depth--;
    if (depth === 0) { close = i; break; }
  }
}
if (close < 0) {
  console.error('[abort] unbalanced braces scanning "' + NS + '"');
  process.exit(2);
}

const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const body = raw.slice(start, close);
// Trailing whitespace/EOL between the last value and the closing brace.
const tailMatch = body.match(/\s*$/);
const tail = tailMatch ? tailMatch[0] : '';
const upto = raw.slice(0, close - tail.length);
const lines = Object.entries(additions)
  .map(([k, v]) => '    ' + JSON.stringify(k) + ': ' + JSON.stringify(v))
  .join(',' + EOL);
const next = upto + ',' + EOL + lines + tail + raw.slice(close);

let after;
try {
  after = JSON.parse(next);
} catch (err) {
  console.error('[abort] result would not parse:', err.message);
  process.exit(2);
}
const added = Object.keys(after[NS]).length - Object.keys(before[NS]).length;
if (added !== Object.keys(additions).length) {
  console.error('[abort] added ' + added + ', expected ' + Object.keys(additions).length);
  process.exit(2);
}
for (const [k, v] of Object.entries(additions)) {
  if (after[NS][k] !== v) {
    console.error('[abort] round-trip mismatch on ' + NS + '.' + k);
    process.exit(2);
  }
}
if (JSON.stringify({ ...before, [NS]: 0 }) !== JSON.stringify({ ...after, [NS]: 0 })) {
  console.error('[abort] content outside "' + NS + '" changed');
  process.exit(2);
}

if (APPLY) {
  fs.writeFileSync(FILE, next, 'utf8');
  console.log('[applied] ' + NS + ' +' + added + ' -> ' + Object.keys(after[NS]).length + ' keys');
} else {
  console.log('[dry-run] ' + NS + ' ' + Object.keys(before[NS]).length + ' -> ' +
    Object.keys(after[NS]).length + ' (+' + added + '). Re-run with --apply.');
}
