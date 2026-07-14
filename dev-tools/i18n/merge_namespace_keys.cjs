#!/usr/bin/env node
// merge_namespace_keys.cjs — General namespace-delta translator.
//
// Translates the keys of one or more ui_strings.js namespaces (default:
// guided,common) into each lang/*.js pack using Gemini, sending ONLY the keys
// a pack is missing — the cheap "delta" path. Unlike merge_missing_translations.cjs
// (hardcoded to behavior_lens + per-language gap files), this computes the gap
// itself from ui_strings.js, so it works for ANY namespace with no gap-report step.
//
// Usage:
//   GEMINI_API_KEY=... node dev-tools/i18n/merge_namespace_keys.cjs
//   node dev-tools/i18n/merge_namespace_keys.cjs --ns=guided,common
//   node dev-tools/i18n/merge_namespace_keys.cjs --lang=spanish_latin_america
//   node dev-tools/i18n/merge_namespace_keys.cjs --dry-run         # no API, no writes
//   node dev-tools/i18n/merge_namespace_keys.cjs --include-passthrough  # also re-do keys equal to English
//   node dev-tools/i18n/merge_namespace_keys.cjs --concurrency=3 --model=gemini-3-flash-preview
//
// Default: for every lang/*.js, find keys in the chosen namespaces that are
// ABSENT from the pack (or, with --include-passthrough, also present-but-equal-to-
// English), translate them, merge under the same namespace, back up *.bak.<ts>,
// write pretty JSON. Re-run with --dry-run first to preview counts at zero cost.
//
// Cost: ~34 keys × 63 langs × ~40 tokens ≈ ~85K output tokens. Single-digit USD
// on gemini-3-flash-preview.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const UI_STRINGS = path.join(ROOT, 'ui_strings.js');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const flag = '--' + name + '=';
  const found = argv.find(a => a.startsWith(flag));
  return found ? found.slice(flag.length) : (argv.includes('--' + name) ? true : fallback);
};
const NAMESPACES = String(arg('ns', 'guided,common')).split(',').map(s => s.trim()).filter(Boolean);
const ONLY_LANG = arg('lang', null);
const DRY_RUN = !!arg('dry-run', false);
const INCLUDE_PASSTHROUGH = !!arg('include-passthrough', false);
const CONCURRENCY = parseInt(arg('concurrency', 2), 10);
const MODEL = arg('model', 'gemini-3-flash-preview');
const API_KEY = arg('api-key', process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const STAMP = arg('stamp', null) || (new Date().toISOString().slice(0, 10).replace(/-/g, ''));

if (!DRY_RUN && !API_KEY) {
  console.error('No API key. Set GEMINI_API_KEY=... or pass --api-key=, or use --dry-run.');
  process.exit(2);
}

// Map slug → display name expected by the translator prompt. Unmapped slugs fall
// back to a title-cased slug (works for single-word language names).
const LANG_NAMES = {
  acholi: 'Acholi', amharic: 'Amharic', arabic: 'Arabic', bengali: 'Bengali',
  burmese: 'Burmese', chin_falam: 'Chin (Falam)', chin_hakha: 'Chin (Hakha)',
  chinese_simplified: 'Chinese (Simplified)', chinese_traditional: 'Chinese (Traditional)',
  dari: 'Dari', dutch: 'Dutch', esperanto: 'Esperanto', farsi: 'Farsi (Persian)',
  french: 'French', french_canadian: 'French (Canadian)', german: 'German', greek: 'Greek',
  gujarati: 'Gujarati', haitian_creole: 'Haitian Creole', hausa: 'Hausa', hebrew: 'Hebrew',
  hindi: 'Hindi', hmong: 'Hmong', igbo: 'Igbo', indonesian: 'Indonesian', italian: 'Italian',
  japanese: 'Japanese', kannada: 'Kannada', karen: 'Karen', khmer: 'Khmer',
  kinyarwanda: 'Kinyarwanda', kirundi: 'Kirundi', korean: 'Korean', lao: 'Lao',
  latin: 'Latin', lingala: 'Lingala', maay_maay: 'Maay Maay', malayalam: 'Malayalam',
  marathi: 'Marathi', marshallese: 'Marshallese', nepali: 'Nepali', pashto: 'Pashto',
  polish: 'Polish', portuguese_angola: 'Portuguese (Angola)', portuguese_brazil: 'Portuguese (Brazil)',
  portuguese_portugal: 'Portuguese (Portugal)', punjabi: 'Punjabi', romanian: 'Romanian',
  russian: 'Russian', somali: 'Somali', spanish_castilian: 'Spanish (Castilian)',
  spanish_latin_america: 'Spanish (Latin America)', swahili: 'Swahili', tagalog: 'Tagalog',
  tamil: 'Tamil', telugu: 'Telugu', thai: 'Thai', tigrinya: 'Tigrinya', turkish: 'Turkish',
  ukrainian: 'Ukrainian', urdu: 'Urdu', vietnamese: 'Vietnamese', yoruba: 'Yoruba'
};
const titleCase = (s) => s.split(/[_\s]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// ─── Translation prompt (matches build_language_pack.cjs / merge_missing_translations.cjs) ──
function buildPrompt(targetLang, missingJson) {
  return [
    'You are a UI translator for AlloFlow, a K-12 special-education web app that supports Universal Design for Learning (UDL), social-emotional learning (SEL), Response to Intervention (RTI), and Individualized Education Programs (IEP). Your audience is teachers, school psychologists, and students.',
    '',
    'TRANSLATE the JSON values into ' + targetLang + '. Use the locale\'s standard special-education and pedagogical terminology. Keep a clear, professional, learner-friendly tone — short imperatives for buttons, full sentences for help text.',
    '',
    'RULES — these are strict, the output will be auto-validated:',
    '  1. Keep all JSON keys IDENTICAL. Do not translate keys.',
    '  2. Preserve every {variable} placeholder EXACTLY (e.g. {n}, {current}, {total}, {text}, {name}). Do not translate the variable name, do not add or remove braces. These are slots filled at runtime.',
    '  3. Preserve all markdown syntax: **bold**, ### headings, * bullets, • bullets, line breaks (\\n), numbered lists, code in `backticks`. Translate the text inside the markdown, not the syntax itself.',
    '  4. Preserve emoji and arrows exactly (🤖, ⚠️, ✅, →, ←, etc.).',
    '  5. Preserve technical/branded terms verbatim: AlloFlow, Gemini, StoryForge, PoetTree, LitLab, UDL, IEP, FERPA, WCAG, ARIA, JSON, CSV, PDF.',
    '  6. For UI controls (buttons, labels, tabs), prefer the shortest natural ' + targetLang + ' equivalent. Translated text should not be more than ~30% longer than the source.',
    '  7. Return ONLY valid JSON. No prose, no markdown fences, no leading or trailing whitespace, no commentary.',
    '',
    'INPUT JSON:',
    JSON.stringify(missingJson)
  ].join('\n');
}

async function callGemini(prompt, attempt) {
  attempt = attempt || 1;
  if (DRY_RUN) {
    const start = prompt.indexOf('INPUT JSON:\n');
    return start < 0 ? '{}' : prompt.slice(start + 'INPUT JSON:\n'.length);
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent?key=' + API_KEY;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 65536 }
    })
  });
  const body = await resp.json();
  if (!resp.ok) {
    if ((resp.status === 429 || resp.status >= 500) && attempt < 5) {
      const wait = 2000 * Math.min(attempt, 5);
      console.log('  rate-limit/server error, retrying in ' + wait + 'ms...');
      await new Promise(r => setTimeout(r, wait));
      return callGemini(prompt, attempt + 1);
    }
    throw new Error('Gemini API error ' + resp.status + ': ' + JSON.stringify(body).slice(0, 300));
  }
  return body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts && body.candidates[0].content.parts[0] && body.candidates[0].content.parts[0].text;
}

function setDeep(obj, dotPath, value) {
  const segs = dotPath.split('.');
  let cursor = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cursor[segs[i]] == null || typeof cursor[segs[i]] !== 'object' || Array.isArray(cursor[segs[i]])) cursor[segs[i]] = {};
    cursor = cursor[segs[i]];
  }
  cursor[segs[segs.length - 1]] = value;
}

const UI = JSON.parse(fs.readFileSync(UI_STRINGS, 'utf8'));
// Canonical English for the chosen namespaces: { 'guided.tab_how': 'How it works', ... }
const ENGLISH = {};
for (const ns of NAMESPACES) {
  const block = UI[ns];
  if (!block || typeof block !== 'object') { console.warn('⚠️  namespace "' + ns + '" not in ui_strings.js — skipping'); continue; }
  for (const [k, v] of Object.entries(block)) if (typeof v === 'string') ENGLISH[ns + '.' + k] = v;
}
const ENGLISH_KEYS = Object.keys(ENGLISH);
if (ENGLISH_KEYS.length === 0) { console.error('No string keys found in namespaces: ' + NAMESPACES.join(',')); process.exit(2); }

function gapForPack(langJson) {
  const missing = {};
  for (const fullKey of ENGLISH_KEYS) {
    const [ns, sub] = [fullKey.slice(0, fullKey.indexOf('.')), fullKey.slice(fullKey.indexOf('.') + 1)];
    const cur = langJson[ns] && langJson[ns][sub];
    if (cur === undefined || cur === null) { missing[fullKey] = ENGLISH[fullKey]; continue; }
    if (INCLUDE_PASSTHROUGH && cur === ENGLISH[fullKey]) missing[fullKey] = ENGLISH[fullKey];
  }
  return missing;
}

async function translateAndMergeOne(langSlug) {
  const langPath = path.join(LANG_DIR, langSlug + '.js');
  if (!fs.existsSync(langPath)) return { langSlug, status: 'no-lang-pack' };
  let langJson;
  try { langJson = JSON.parse(fs.readFileSync(langPath, 'utf8')); }
  catch (e) { return { langSlug, status: 'pack-parse-error', error: e.message }; }

  const missing = gapForPack(langJson);
  const missingKeys = Object.keys(missing);
  if (missingKeys.length === 0) return { langSlug, status: 'already-complete', missing: 0 };

  const targetLang = LANG_NAMES[langSlug] || titleCase(langSlug);
  console.log('[' + langSlug + '] ' + missingKeys.length + ' missing → ' + targetLang + (DRY_RUN ? ' (dry-run)' : '') + '...');

  let text;
  try { text = await callGemini(buildPrompt(targetLang, missing)); }
  catch (e) { return { langSlug, status: 'api-error', error: e.message }; }

  let translated;
  try { translated = JSON.parse(text); }
  catch {
    try { translated = JSON.parse(await callGemini('The following JSON is malformed. Fix syntax errors. Return ONLY valid JSON.\n\n' + text)); }
    catch { return { langSlug, status: 'parse-error' }; }
  }
  if (!translated || typeof translated !== 'object') return { langSlug, status: 'bad-shape' };

  const inSet = new Set(missingKeys);
  const dropped = missingKeys.filter(k => !(k in translated));
  const added = Object.keys(translated).filter(k => !inSet.has(k));
  if (dropped.length) console.log('  [' + langSlug + '] LLM dropped ' + dropped.length + ': ' + dropped.slice(0, 3).join(', ') + (dropped.length > 3 ? '…' : ''));
  if (added.length) console.log('  [' + langSlug + '] LLM hallucinated ' + added.length + ' extra (ignoring): ' + added.slice(0, 3).join(', ') + (added.length > 3 ? '…' : ''));

  let merged = 0;
  for (const k of missingKeys) {
    if (!(k in translated) || typeof translated[k] !== 'string') continue;
    setDeep(langJson, k, translated[k]);
    merged++;
  }

  if (!DRY_RUN && merged > 0) {
    fs.copyFileSync(langPath, langPath + '.bak.' + STAMP);
    fs.writeFileSync(langPath, JSON.stringify(langJson, null, 2) + '\n');
  }
  return { langSlug, status: 'ok', merged, dropped: dropped.length, added: added.length };
}

// ─── Driver ──────────────────────────────────────────────────────────────
const slugs = fs.readdirSync(LANG_DIR)
  .filter(f => f.endsWith('.js') && !f.includes('.bak.'))
  .map(f => f.replace(/\.js$/, ''))
  .filter(s => !ONLY_LANG || s === ONLY_LANG);

if (slugs.length === 0) { console.error('No lang packs found' + (ONLY_LANG ? ' for --lang=' + ONLY_LANG : '') + '.'); process.exit(2); }

console.log('Namespaces: ' + NAMESPACES.join(', ') + ' (' + ENGLISH_KEYS.length + ' English keys)');
console.log('Processing ' + slugs.length + ' language' + (slugs.length === 1 ? '' : 's') + ' (concurrency=' + CONCURRENCY + ', dry-run=' + DRY_RUN + ', include-passthrough=' + INCLUDE_PASSTHROUGH + ', model=' + MODEL + ')...');

(async () => {
  const results = [];
  const queue = slugs.slice();
  async function worker() { while (queue.length) { results.push(await translateAndMergeOne(queue.shift())); } }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()));

  const ok = results.filter(r => r.status === 'ok');
  const complete = results.filter(r => r.status === 'already-complete');
  const errors = results.filter(r => !['ok', 'already-complete'].includes(r.status));
  const totalMerged = ok.reduce((s, r) => s + (r.merged || 0), 0);
  console.log('\n── Done ──');
  console.log('  Translated: ' + ok.length + ' pack(s), ' + totalMerged + ' key(s) merged' + (DRY_RUN ? ' (dry-run — nothing written)' : ''));
  console.log('  Already complete: ' + complete.length);
  console.log('  Errors: ' + errors.length);
  errors.forEach(r => console.log('    ' + r.langSlug + ': ' + r.status + (r.error ? ' — ' + r.error.slice(0, 120) : '')));
  console.log('\nNext: node dev-tools/check_lang_json.cjs && npm run verify:spanglish');
})();
