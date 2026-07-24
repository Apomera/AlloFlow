// Generic toast-literal migrator. Usage:
//   node _migrate_toasts.cjs <file.js|file.jsx>
//
// For the given file:
//   1. Scans every addToast("literal") call (skips ones with ${interp} or
//      strings shorter than 6 chars or longer than 200 chars).
//   2. Generates snake_case slugs from the message text. Avoids collisions
//      against existing ui_strings.toasts.* keys.
//   3. Rewrites addToast("literal") → addToast(t('toasts.<key>')) in-place.
//   4. Appends new key/value pairs to ui_strings.toasts (inside its existing
//      object literal).
//   5. Prints a summary.
//
// Safe behaviors:
//   - Identical messages within or across files dedupe to the same key.
//   - Skips matches where the literal string was already replaced earlier in
//     the same run (i.e., dedup happens automatically).
//   - Preserves the surrounding addToast(...) call structure exactly —
//     only the literal string argument is touched.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const stringsFile = path.join(ROOT, 'ui_strings.js');

const targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: node _migrate_toasts.cjs <file>');
  process.exit(1);
}
const targetFile = path.isAbsolute(targetArg) ? targetArg : path.join(ROOT, targetArg);
if (!fs.existsSync(targetFile)) {
  console.error('Target file not found: ' + targetFile);
  process.exit(1);
}

const src = fs.readFileSync(targetFile, 'utf-8');
let strings = fs.readFileSync(stringsFile, 'utf-8');

// Pull existing toasts.* keys to avoid collisions.
const toastsMatch = strings.match(/^\s*"toasts"\s*:\s*\{([\s\S]*?)^\s*\}\s*,/m);
const existingKeys = new Set();
if (toastsMatch) {
  const body = toastsMatch[1];
  const keyRe = /^\s*"([a-z_0-9]+)"\s*:/gm;
  let m;
  while ((m = keyRe.exec(body)) !== null) existingKeys.add(m[1]);
}

const STOP = new Set(['the','a','an','is','to','of','for','on','in','at','by','no','and','or','this','that','it','be','you','your','please','was','were','are','will','can','not','do','does']);
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(t => t.length > 1 && !STOP.has(t))
    .slice(0, 5)
    .join('_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

const re = /\baddToast\s*\(\s*(['"])((?:\\.|[^\\])*?)\1/g;
const findings = [];
let m;
while ((m = re.exec(src)) !== null) {
  const quote = m[1];
  let text = m[2];
  text = text.replace(new RegExp('\\\\' + quote, 'g'), quote).replace(/\\\\/g, '\\');
  if (!/[A-Za-z]{3,}/.test(text)) continue;
  if (text.length < 6) continue;
  if (text.length > 200) continue;
  if (text.includes('${')) continue;
  const line = src.slice(0, m.index).split('\n').length;
  const slug = slugify(text);
  if (!slug) continue;
  findings.push({ line, slug, text, fullMatch: m[0], quote });
}

console.log(`${path.basename(targetFile)}: found ${findings.length} addToast literals`);
if (!findings.length) process.exit(0);

// Dedupe identical messages → same key; resolve slug collisions
const byText = new Map();          // text → key
const finalKeys = {};              // key → first finding (for the ui_strings entry)
const reservedSlugs = new Set(existingKeys);

for (const f of findings) {
  if (byText.has(f.text)) continue;
  let key = f.slug;
  let i = 2;
  while (reservedSlugs.has(key) || finalKeys[key]) {
    key = f.slug + '_' + i;
    i++;
  }
  byText.set(f.text, key);
  finalKeys[key] = f;
  reservedSlugs.add(key);
}

// Apply replacements
let updated = src;
let appliedCount = 0;
for (const [text, key] of byText) {
  const finding = findings.find(f => f.text === text);
  if (!finding) continue;
  const fullMatch = finding.fullMatch;
  const replacement = `addToast(t('toasts.${key}')`;
  const before = updated;
  updated = updated.split(fullMatch).join(replacement);
  const occurrences = (before.length - updated.length) / (fullMatch.length - replacement.length);
  if (occurrences > 0 && fullMatch.length !== replacement.length) {
    appliedCount += Math.round(occurrences);
  }
}

// Append new keys to ui_strings.toasts (only ones not already present)
const newToInject = Object.entries(finalKeys).filter(([k]) => !existingKeys.has(k));

if (newToInject.length) {
  // Find the closing brace of toasts namespace
  const openMatch = strings.match(/^\s*"toasts"\s*:\s*\{/m);
  if (!openMatch) {
    console.error('Could not find "toasts" namespace in ui_strings.js — aborting.');
    process.exit(1);
  }
  let pos = openMatch.index + openMatch[0].length;
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

  let trail = pos - 1;
  while (trail > 0 && /\s/.test(strings[trail])) trail--;
  const lastChar = strings[trail];
  const needsLeadingComma = lastChar !== ',' && lastChar !== '{';

  // ui_strings.js is parsed with strict JSON.parse — NO comments allowed.
  // (A migration script comment line here would break the parser.)
  const entries = newToInject.map(([k, f]) => `    "${k}": ${JSON.stringify(f.text)}`).join(',\n');
  const injection =
    (needsLeadingComma ? ',\n' : '\n') +
    entries + '\n  ';

  strings = strings.slice(0, pos) + injection + strings.slice(pos);
}

fs.writeFileSync(targetFile, updated);
fs.writeFileSync(stringsFile, strings);

// IMPORTANT: Production loads ui_strings.js from desktop/web-app/public/ via
// Firebase Hosting (not from the repo root). If we only update the root file,
// every migrated t('toasts.xxx') call renders the raw key string in production
// because the mirror doesn't yet have the new keys. Sync after every write.
const mirrorStringsFile = path.join(ROOT, 'desktop/web-app', 'public', 'ui_strings.js');
if (fs.existsSync(mirrorStringsFile)) {
  fs.writeFileSync(mirrorStringsFile, strings);
}

// Also sync the target file to its desktop/web-app mirror if one exists.
// This matters for hand-maintained .js modules (no .jsx → no build-script sync).
// For .jsx sources, the build script handles the sync — but mirroring here too
// is idempotent and safer.
const mirrorTargetFile = path.join(ROOT, 'desktop/web-app', 'public', path.basename(targetFile));
if (fs.existsSync(mirrorTargetFile) && targetFile.endsWith('.js')) {
  fs.writeFileSync(mirrorTargetFile, updated);
}

console.log(`  ✓ Replaced ${appliedCount} addToast literals (${byText.size} unique messages)`);
console.log(`  ✓ Appended ${newToInject.length} new keys to ui_strings.toasts (root + mirror)`);
