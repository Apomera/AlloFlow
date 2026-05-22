// Apply the toast migration plan:
//   1. For each entry, replace the literal addToast("text") with addToast(t('toasts.<key>'))
//      in AlloFlowANTI.txt
//   2. Append the new key/value pairs into ui_strings.js inside the "toasts" namespace
//   3. Print a summary
//
// Defensive: bails out if the exact addToast literal isn't found verbatim
// in the source (catches the case where the source has drifted since
// extraction). Won't touch addToast calls that interpolate values.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const monolith = path.join(ROOT, 'AlloFlowANTI.txt');
const stringsFile = path.join(ROOT, 'ui_strings.js');
const planFile = path.join(ROOT, '_toast_migration_plan.json');

const plan = JSON.parse(fs.readFileSync(planFile, 'utf-8'));
let src = fs.readFileSync(monolith, 'utf-8');
let strings = fs.readFileSync(stringsFile, 'utf-8');

let applied = 0;
let skipped = [];

// Apply replacements. Each plan entry has fullMatch (the exact substring,
// including addToast(, the quote, and the literal text) and key.
for (const entry of plan) {
  const original = entry.fullMatch;
  const replacement = `addToast(t('toasts.${entry.key}')`;
  // Count occurrences to detect ambiguity
  const count = src.split(original).length - 1;
  if (count === 0) {
    skipped.push({ key: entry.key, reason: 'literal not found (file drifted?)', text: entry.text });
    continue;
  }
  if (count > 1) {
    // Multiple identical addToast calls — replace ALL with the same key (correct
    // because identical messages should use the same translation key).
    src = src.split(original).join(replacement);
    applied += count;
  } else {
    src = src.replace(original, replacement);
    applied++;
  }
}

// Append new entries to ui_strings.js inside the existing "toasts" object.
// Find the closing brace of the toasts namespace and inject right before it.
const toastsOpen = strings.match(/^\s*"toasts"\s*:\s*\{/m);
if (!toastsOpen) {
  console.error('Could not find "toasts" namespace in ui_strings.js — aborting.');
  process.exit(1);
}

// Find the matching closing brace by counting braces from the opening
let pos = toastsOpen.index + toastsOpen[0].length;
let depth = 1;
while (pos < strings.length && depth > 0) {
  const ch = strings[pos];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
  if (depth === 0) break;
  pos++;
}
if (depth !== 0) {
  console.error('Could not find closing brace of toasts namespace.');
  process.exit(1);
}
// pos is at the closing '}'. Insert new entries just before it.

const newEntries = plan
  .filter(p => !skipped.find(s => s.key === p.key))
  .map(p => {
    // JSON-quote the value so embedded characters are safe
    const safeText = JSON.stringify(p.text);
    return `    "${p.key}": ${safeText}`;
  })
  .join(',\n');

// Determine if we need a leading comma (yes, because the existing last entry has no trailing comma)
// Look backward from pos for the most recent non-whitespace char
let insertBefore = pos;
let trail = pos - 1;
while (trail > 0 && /\s/.test(strings[trail])) trail--;
const lastChar = strings[trail];
const needsLeadingComma = lastChar !== ',' && lastChar !== '{';
const injection = (needsLeadingComma ? ',\n' : '\n') +
  '    // ── Auto-migrated from AlloFlowANTI.txt addToast() calls (2026-05-19) ──\n' +
  newEntries + '\n  ';

strings = strings.slice(0, insertBefore) + injection + strings.slice(insertBefore);

// Write
fs.writeFileSync(monolith, src);
fs.writeFileSync(stringsFile, strings);

console.log(`✓ Applied ${applied} addToast replacements in AlloFlowANTI.txt`);
console.log(`✓ Appended ${plan.length - skipped.length} new keys to ui_strings.toasts`);
if (skipped.length) {
  console.log(`\n⚠ Skipped ${skipped.length} (likely file drift):`);
  skipped.forEach(s => console.log(`  - toasts.${s.key}: "${s.text.slice(0, 60)}"`));
}
