#!/usr/bin/env node
// merge_missing_translations.cjs — Incrementally translate the per-language
// missing keys from lang_pack_gaps/<lang>.json (produced by
// lang_pack_gap_report.cjs) into each lang/*.js pack using Gemini. Unlike
// build_language_pack.cjs which regenerates the ENTIRE behavior_lens
// namespace per call, this only sends the DELTA — typically 10-100 keys —
// dropping API cost by ~95% per language.
//
// Usage:
//   GEMINI_API_KEY=... node dev-tools/i18n/merge_missing_translations.cjs
//   node dev-tools/i18n/merge_missing_translations.cjs --lang=spanish_latin_america
//   node dev-tools/i18n/merge_missing_translations.cjs --dry-run
//   node dev-tools/i18n/merge_missing_translations.cjs --concurrency=2
//
// Default behavior: iterate every lang/*.js that has ≥1 missing key, translate
// the delta with the same prompt build_language_pack.cjs uses, merge into the
// pack with a *.bak.<timestamp> backup, write the pack back as pretty JSON.
//
// Cost estimate: 46 new keys × 56 langs × ~50 tokens output each ≈ 130K
// output tokens total. Single-digit dollars on gemini-3-flash-preview.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const GAPS_DIR = path.join(__dirname, 'lang_pack_gaps');
const LANG_DIR = path.join(ROOT, 'lang');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const flag = '--' + name + '=';
  const found = argv.find(a => a.startsWith(flag));
  return found ? found.slice(flag.length) : (argv.includes('--' + name) ? true : fallback);
};
const ONLY_LANG = arg('lang', null);
const DRY_RUN = !!arg('dry-run', false);
const CONCURRENCY = parseInt(arg('concurrency', 2), 10);
const MODEL = arg('model', 'gemini-3-flash-preview');
const API_KEY = arg('api-key', process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

if (!DRY_RUN && !API_KEY) {
  console.error('No API key. Set GEMINI_API_KEY=... or pass --api-key=, or use --dry-run.');
  process.exit(2);
}

// Map slug → display name expected by translator prompt.
const LANG_NAMES = {
  acholi: 'Acholi', amharic: 'Amharic', arabic: 'Arabic', bengali: 'Bengali',
  burmese: 'Burmese', chin_falam: 'Chin (Falam)', chin_hakha: 'Chin (Hakha)',
  chinese_simplified: 'Chinese (Simplified)', chinese_traditional: 'Chinese (Traditional)',
  dari: 'Dari', farsi: 'Farsi (Persian)', french: 'French', french_canadian: 'French (Canadian)',
  german: 'German', greek: 'Greek', haitian_creole: 'Haitian Creole', hausa: 'Hausa',
  hebrew: 'Hebrew', hindi: 'Hindi', hmong: 'Hmong', igbo: 'Igbo', indonesian: 'Indonesian',
  italian: 'Italian', japanese: 'Japanese', karen: 'Karen', khmer: 'Khmer',
  kinyarwanda: 'Kinyarwanda', kirundi: 'Kirundi', korean: 'Korean', lao: 'Lao',
  latin: 'Latin', lingala: 'Lingala', maay_maay: 'Maay Maay',
  marshallese: 'Marshallese', nepali: 'Nepali', pashto: 'Pashto', polish: 'Polish',
  portuguese_angola: 'Portuguese (Angola)', portuguese_brazil: 'Portuguese (Brazil)',
  portuguese_portugal: 'Portuguese (Portugal)', punjabi: 'Punjabi', romanian: 'Romanian',
  russian: 'Russian', somali: 'Somali', spanish_castilian: 'Spanish (Castilian)',
  spanish_latin_america: 'Spanish (Latin America)', swahili: 'Swahili', tagalog: 'Tagalog',
  tamil: 'Tamil', telugu: 'Telugu', thai: 'Thai', tigrinya: 'Tigrinya',
  ukrainian: 'Ukrainian', urdu: 'Urdu', vietnamese: 'Vietnamese', yoruba: 'Yoruba'
};

// ─── Translation prompt (matches build_language_pack.cjs structure) ──────
function buildPrompt(targetLang, missingJson) {
  return [
    'You are a UI translator for AlloFlow, a K-12 special-education web app that supports Universal Design for Learning (UDL), social-emotional learning (SEL), Response to Intervention (RTI), and Individualized Education Programs (IEP). Your audience is teachers, school psychologists, and students.',
    '',
    'TRANSLATE the JSON values into ' + targetLang + '. Use the locale\'s standard special-education and pedagogical terminology. Keep a clear, professional, learner-friendly tone — short imperatives for buttons, full sentences for help text.',
    '',
    'RULES — these are strict, the output will be auto-validated:',
    '  1. Keep all JSON keys IDENTICAL. Do not translate keys.',
    '  2. Preserve every ${variable} placeholder EXACTLY. Do not translate the variable name, do not add or remove braces or the $ prefix. These are JS template-literal slots filled at runtime.',
    '  3. Preserve all markdown syntax: **bold**, ### headings, * bullets, • bullets, line breaks (\\n), numbered lists, code in `backticks`. Translate the text inside the markdown, not the syntax itself.',
    '  4. Preserve emoji exactly (🤖, ⚠️, ✅, etc.).',
    '  5. Preserve technical/branded terms verbatim: BehaviorLens, AlloFlow, Gemini, ABC (in behavioral context), FBA, BIP, IEP, BCBA, FERPA, HIPAA, WCAG, ARIA, JSON, CSV, PDF.',
    '  6. For UI controls (buttons, labels, menu items), prefer the shortest natural ' + targetLang + ' equivalent. Translated text should not be more than ~30% longer than the source.',
    '  7. Return ONLY valid JSON. No prose, no markdown fences, no leading or trailing whitespace, no commentary.',
    '',
    'INPUT JSON:',
    JSON.stringify(missingJson)
  ].join('\n');
}

async function callGemini(prompt, attempt) {
  attempt = attempt || 1;
  if (DRY_RUN) {
    // Echo input back so the pipeline can be verified without spending tokens.
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

// Set a nested key path on an object, creating intermediate namespaces as needed.
function setDeep(obj, dotPath, value) {
  const segs = dotPath.split('.');
  let cursor = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    if (cursor[segs[i]] == null || typeof cursor[segs[i]] !== 'object' || Array.isArray(cursor[segs[i]])) {
      cursor[segs[i]] = {};
    }
    cursor = cursor[segs[i]];
  }
  cursor[segs[segs.length - 1]] = value;
}

async function translateAndMergeOne(langSlug) {
  const gapPath = path.join(GAPS_DIR, langSlug + '.json');
  const langPath = path.join(LANG_DIR, langSlug + '.js');
  if (!fs.existsSync(gapPath)) return { langSlug, status: 'no-gap-file' };
  if (!fs.existsSync(langPath)) return { langSlug, status: 'no-lang-pack' };
  const gap = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
  if (!gap.missing || Object.keys(gap.missing).length === 0) return { langSlug, status: 'already-complete', missing: 0 };

  const targetLang = LANG_NAMES[langSlug] || langSlug;
  const missingCount = Object.keys(gap.missing).length;
  console.log(`[${langSlug}] ${missingCount} missing → translating to ${targetLang}...`);

  // The missing block is the canonical English; build the prompt with just
  // the local-key portion (strip the `behavior_lens.` prefix for cleaner I/O).
  const inputForLLM = {};
  for (const [fullKey, en] of Object.entries(gap.missing)) {
    const local = fullKey.slice('behavior_lens.'.length);
    inputForLLM[local] = en;
  }

  let text;
  try { text = await callGemini(buildPrompt(targetLang, inputForLLM)); }
  catch (e) { return { langSlug, status: 'api-error', error: e.message }; }

  let translated;
  try { translated = JSON.parse(text); }
  catch {
    // Repair attempt
    try {
      const repaired = await callGemini('The following JSON is malformed. Fix syntax errors. Return ONLY valid JSON.\n\n' + text);
      translated = JSON.parse(repaired);
    } catch { return { langSlug, status: 'parse-error' }; }
  }

  if (!translated || typeof translated !== 'object') return { langSlug, status: 'bad-shape' };

  // Validate: every input key should be present in the output, no keys added.
  const inKeys = new Set(Object.keys(inputForLLM));
  const outKeys = new Set(Object.keys(translated));
  const dropped = [...inKeys].filter(k => !outKeys.has(k));
  const added = [...outKeys].filter(k => !inKeys.has(k));
  if (dropped.length > 0) console.log(`  [${langSlug}] LLM dropped ${dropped.length} keys: ${dropped.slice(0, 3).join(', ')}${dropped.length > 3 ? '…' : ''}`);
  if (added.length > 0) console.log(`  [${langSlug}] LLM hallucinated ${added.length} extra keys (ignoring): ${added.slice(0, 3).join(', ')}${added.length > 3 ? '…' : ''}`);

  // Merge into lang pack (under behavior_lens.* namespace).
  const langJson = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  if (!langJson.behavior_lens || typeof langJson.behavior_lens !== 'object') langJson.behavior_lens = {};
  let merged = 0;
  for (const localKey of inKeys) {
    if (!(localKey in translated)) continue;
    setDeep(langJson.behavior_lens, localKey, translated[localKey]);
    merged++;
  }

  if (!DRY_RUN && merged > 0) {
    const backup = langPath + '.bak.20260604';
    fs.copyFileSync(langPath, backup);
    fs.writeFileSync(langPath, JSON.stringify(langJson, null, 2) + '\n');
  }

  return { langSlug, status: 'ok', merged, dropped: dropped.length, added: added.length };
}

// ─── Driver ──────────────────────────────────────────────────────────────
const gapFiles = fs.readdirSync(GAPS_DIR).filter(f => f.endsWith('.json'));
const slugs = gapFiles
  .map(f => f.replace(/\.json$/, ''))
  .filter(s => !ONLY_LANG || s === ONLY_LANG);

if (slugs.length === 0) {
  console.error(`No matching lang slugs. Did you run lang_pack_gap_report.cjs first?`);
  process.exit(2);
}

console.log(`Processing ${slugs.length} language${slugs.length === 1 ? '' : 's'} (concurrency=${CONCURRENCY}, dry-run=${DRY_RUN}, model=${MODEL})...`);

(async () => {
  const results = [];
  const queue = slugs.slice();
  async function worker() {
    while (queue.length > 0) {
      const slug = queue.shift();
      const r = await translateAndMergeOne(slug);
      results.push(r);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Summary
  const ok = results.filter(r => r.status === 'ok').length;
  const skipped = results.filter(r => r.status === 'already-complete').length;
  const errors = results.filter(r => !['ok', 'already-complete'].includes(r.status));
  console.log(`\n── Done ──`);
  console.log(`  OK:               ${ok}`);
  console.log(`  Already complete: ${skipped}`);
  console.log(`  Errors:           ${errors.length}`);
  if (errors.length > 0) {
    console.log(`\nError detail:`);
    errors.forEach(r => console.log(`  ${r.langSlug}: ${r.status}${r.error ? ' — ' + r.error.slice(0, 100) : ''}`));
  }
  console.log(`\nRecommended: re-run lang_pack_gap_report.cjs to confirm missing-counts dropped.`);
})();
