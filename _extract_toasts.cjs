// Extract every addToast("literal") call from AlloFlowANTI.txt, generate a
// snake_case slug for each, check for collisions against existing
// ui_strings.toasts keys, and output a migration plan as JSON.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const monolith = path.join(ROOT, 'AlloFlowANTI.txt');
const stringsFile = path.join(ROOT, 'ui_strings.js');

const src = fs.readFileSync(monolith, 'utf-8');
const stringsRaw = fs.readFileSync(stringsFile, 'utf-8');

// Pull the existing toasts namespace to avoid collisions. Parse loosely.
const toastsMatch = stringsRaw.match(/^\s*"toasts"\s*:\s*\{([\s\S]*?)^\s*\}\s*,/m);
const existingKeys = new Set();
if (toastsMatch) {
  const body = toastsMatch[1];
  const keyRe = /^\s*"([a-z_0-9]+)"\s*:/gm;
  let m;
  while ((m = keyRe.exec(body)) !== null) existingKeys.add(m[1]);
}
console.log(`Existing toasts.* keys: ${existingKeys.size}`);

// Slug generator: keep first ~5 meaningful tokens
const STOP = new Set(['the','a','an','is','to','of','for','on','in','at','by','no','and','or','this','that','it','be','you','your','please','was','were','are']);
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

// addToast("literal", optional 2nd arg) — single or double quotes, literal only
const re = /\baddToast\s*\(\s*(['"])((?:\\.|[^\\])*?)\1/g;
const findings = [];
let m;
while ((m = re.exec(src)) !== null) {
  const quote = m[1];
  let text = m[2];
  // Unescape per quote style
  text = text.replace(new RegExp('\\\\' + quote, 'g'), quote).replace(/\\\\/g, '\\');
  if (!/[A-Za-z]{3,}/.test(text)) continue;
  if (text.length < 6) continue;
  if (text.length > 200) continue;
  // Skip template literals or interpolations we can't safely auto-replace
  if (text.includes('${')) continue;
  const line = src.slice(0, m.index).split('\n').length;
  const slug = slugify(text);
  if (!slug) continue;
  findings.push({ line, slug, text, fullMatch: m[0], quote });
}

console.log(`Found ${findings.length} addToast literals in AlloFlowANTI.txt`);

// Resolve collisions: append _2, _3, etc.
const finalKeys = {};
const reservedSlugs = new Set(existingKeys);
findings.forEach(f => {
  let key = f.slug;
  let i = 2;
  while (reservedSlugs.has(key) || finalKeys[key]) {
    key = f.slug + '_' + i;
    i++;
  }
  finalKeys[key] = f;
  reservedSlugs.add(key);
});

const plan = Object.entries(finalKeys).map(([key, f]) => ({
  key,
  text: f.text,
  line: f.line,
  fullMatch: f.fullMatch,
  quote: f.quote
}));

fs.writeFileSync(path.join(ROOT, '_toast_migration_plan.json'), JSON.stringify(plan, null, 2));
console.log(`Migration plan written to _toast_migration_plan.json (${plan.length} entries)`);
console.log(`\nSample (first 10):`);
plan.slice(0, 10).forEach(p => console.log(`  L${p.line}: toasts.${p.key}  ←  "${p.text.slice(0, 70)}${p.text.length > 70 ? '...' : ''}"`));
