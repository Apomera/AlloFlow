#!/usr/bin/env node
// merge_help_missing.cjs — Incrementally translate the per-language help-string
// gaps from help_gaps/<lang>.json (produced by help_mode_gap_report.cjs) into
// each lang/*.js pack's help_mode namespace using Gemini. Sends only the DELTA
// (missing + passthrough keys), not the full 878-key namespace.
//
// Usage:
//   node dev-tools/i18n/help_mode_gap_report.cjs            # 1) build gap files
//   node dev-tools/i18n/merge_help_missing.cjs --dry-run    # 2) verify wiring (no API, echoes English)
//   GEMINI_API_KEY=... node dev-tools/i18n/merge_help_missing.cjs            # 3) translate all
//   GEMINI_API_KEY=... node dev-tools/i18n/merge_help_missing.cjs --lang=lao # single pack
//
// After: re-run help_mode_gap_report.cjs to confirm gaps dropped, then
//   node dev-tools/i18n/check_safety_string_spanglish.cjs   (guard)
//   node dev-tools/check_lang_json.cjs                       (shape)
// and have a native speaker spot-check the low-resource packs.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const GAPS_DIR = path.join(__dirname, 'help_gaps');
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
const ts = 'merge-help-20260621';

if (!DRY_RUN && !API_KEY) {
  console.error('No API key. Set GEMINI_API_KEY=... or pass --api-key=, or use --dry-run.');
  process.exit(2);
}

const LANG_NAMES = {
  acholi: 'Acholi', amharic: 'Amharic', arabic: 'Arabic', bengali: 'Bengali',
  burmese: 'Burmese', chin_falam: 'Chin (Falam)', chin_hakha: 'Chin (Hakha)',
  chinese_simplified: 'Chinese (Simplified)', chinese_traditional: 'Chinese (Traditional)',
  dari: 'Dari', dutch: 'Dutch', farsi: 'Farsi (Persian)', french: 'French', french_canadian: 'French (Canadian)',
  german: 'German', greek: 'Greek', gujarati: 'Gujarati', haitian_creole: 'Haitian Creole', hausa: 'Hausa',
  hebrew: 'Hebrew', hindi: 'Hindi', hmong: 'Hmong', igbo: 'Igbo', indonesian: 'Indonesian',
  italian: 'Italian', japanese: 'Japanese', kannada: 'Kannada', karen: 'Karen', khmer: 'Khmer',
  kinyarwanda: 'Kinyarwanda', kirundi: 'Kirundi', korean: 'Korean', lao: 'Lao',
  latin: 'Latin', lingala: 'Lingala', malayalam: 'Malayalam', marathi: 'Marathi', marshallese: 'Marshallese',
  nepali: 'Nepali', pashto: 'Pashto', polish: 'Polish',
  portuguese_angola: 'Portuguese (Angola)', portuguese_brazil: 'Portuguese (Brazil)',
  portuguese_portugal: 'Portuguese (Portugal)', punjabi: 'Punjabi', romanian: 'Romanian',
  russian: 'Russian', somali: 'Somali', spanish_castilian: 'Spanish (Castilian)',
  spanish_latin_america: 'Spanish (Latin America)', swahili: 'Swahili', tagalog: 'Tagalog',
  tamil: 'Tamil', telugu: 'Telugu', thai: 'Thai', tigrinya: 'Tigrinya', turkish: 'Turkish',
  ukrainian: 'Ukrainian', urdu: 'Urdu', vietnamese: 'Vietnamese', yoruba: 'Yoruba'
};

function buildPrompt(targetLang, missingJson) {
  return [
    'You are a UI translator for AlloFlow, a K-12 special-education web app that supports Universal Design for Learning (UDL), accessibility remediation of documents, social-emotional learning, RTI, and IEPs. Your audience is teachers and school staff. These are HELP-MODE TOOLTIPS — explanatory help text shown when a user hovers/taps a control.',
    '',
    'TRANSLATE the JSON values into ' + targetLang + '. Use the locale\'s standard pedagogical and accessibility terminology. Keep a clear, professional, learner-friendly tone in full sentences.',
    '',
    'RULES — strict, the output will be auto-validated:',
    '  1. Keep all JSON keys IDENTICAL. Do not translate keys.',
    '  2. Preserve emoji and symbols exactly (🤖, ⚠️, ☐, [ ], ~, +, −, ✅).',
    '  3. Preserve technical/branded terms verbatim: AlloFlow, Gemini, Canvas, WCAG 2.2 AA, axe-core, ARIA, PDF/UA, AcroForm, OCR, WebAssembly, CDN, CSV, HTML, RTL, ELL, CBM, IDEA, IEP, FERPA, .alloflow.json, OpenDyslexic, Lexend, Atkinson Hyperlegible. Keep px units and number ranges (e.g. 12-24px, 8-14).',
    '  4. Preserve any {placeholder} or ${variable} tokens EXACTLY — do not translate or alter them.',
    '  5. Return ONLY valid JSON. No prose, no markdown fences, no leading/trailing whitespace.',
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
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 65536 } })
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

async function translateAndMergeOne(langSlug) {
  const gapPath = path.join(GAPS_DIR, langSlug + '.json');
  const langPath = path.join(LANG_DIR, langSlug + '.js');
  if (!fs.existsSync(gapPath)) return { langSlug, status: 'no-gap-file' };
  if (!fs.existsSync(langPath)) return { langSlug, status: 'no-lang-pack' };
  const gap = JSON.parse(fs.readFileSync(gapPath, 'utf8'));
  if (!gap.missing || Object.keys(gap.missing).length === 0) return { langSlug, status: 'already-complete', missing: 0 };

  const targetLang = LANG_NAMES[langSlug] || langSlug;
  const input = gap.missing; // flat help keys → English
  const inKeys = Object.keys(input);
  console.log(`[${langSlug}] ${inKeys.length} gap keys → translating to ${targetLang}...`);

  // Chunk large gap sets (lao/thai/chin_falam have ~495) to stay under token limits.
  const CHUNK = 60;
  const translated = {};
  for (let i = 0; i < inKeys.length; i += CHUNK) {
    const slice = {};
    inKeys.slice(i, i + CHUNK).forEach(k => { slice[k] = input[k]; });
    let text;
    try { text = await callGemini(buildPrompt(targetLang, slice)); }
    catch (e) { return { langSlug, status: 'api-error', error: e.message }; }
    let part;
    try { part = JSON.parse(text); }
    catch {
      try { part = JSON.parse(await callGemini('The following JSON is malformed. Fix syntax errors. Return ONLY valid JSON.\n\n' + text)); }
      catch { return { langSlug, status: 'parse-error', at: i }; }
    }
    if (part && typeof part === 'object') Object.assign(translated, part);
  }

  const dropped = inKeys.filter(k => !(k in translated));
  if (dropped.length) console.log(`  [${langSlug}] LLM dropped ${dropped.length} keys: ${dropped.slice(0, 3).join(', ')}${dropped.length > 3 ? '…' : ''}`);

  const langJson = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  if (!langJson.help_mode || typeof langJson.help_mode !== 'object') langJson.help_mode = {};
  let merged = 0;
  for (const k of inKeys) { if (!(k in translated)) continue; langJson.help_mode[k] = translated[k]; merged++; }

  if (!DRY_RUN && merged > 0) {
    fs.copyFileSync(langPath, langPath + '.bak.' + ts);
    fs.writeFileSync(langPath, JSON.stringify(langJson, null, 2) + '\n');
  }
  return { langSlug, status: 'ok', merged, dropped: dropped.length };
}

const gapFiles = fs.existsSync(GAPS_DIR) ? fs.readdirSync(GAPS_DIR).filter(f => f.endsWith('.json')) : [];
const slugs = gapFiles.map(f => f.replace(/\.json$/, '')).filter(s => !ONLY_LANG || s === ONLY_LANG);
if (slugs.length === 0) { console.error('No gap files. Run help_mode_gap_report.cjs first.'); process.exit(2); }

console.log(`Processing ${slugs.length} language${slugs.length === 1 ? '' : 's'} (concurrency=${CONCURRENCY}, dry-run=${DRY_RUN}, model=${MODEL})...`);
(async () => {
  const results = [];
  const queue = slugs.slice();
  async function worker() { while (queue.length) { results.push(await translateAndMergeOne(queue.shift())); } }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  const ok = results.filter(r => r.status === 'ok').length;
  const skipped = results.filter(r => r.status === 'already-complete').length;
  const errors = results.filter(r => !['ok', 'already-complete'].includes(r.status));
  console.log(`\n── Done ──\n  OK: ${ok}\n  Already complete: ${skipped}\n  Errors: ${errors.length}`);
  errors.forEach(r => console.log(`  ${r.langSlug}: ${r.status}${r.error ? ' — ' + r.error.slice(0, 100) : ''}`));
  console.log(`\nNext: re-run help_mode_gap_report.cjs, then check_safety_string_spanglish.cjs + check_lang_json.cjs.`);
})();
