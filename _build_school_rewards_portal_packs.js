#!/usr/bin/env node
// =============================================================================
// _build_school_rewards_portal_packs.js
//
// Translates the School Rewards portal catalogue into the app's shipped
// languages, using the same Gemini pipeline that produced lang/*.js. The
// prompt rules below are kept identical to dev-tools/build_language_pack.cjs;
// tests/school_rewards_portal_packs.test.js fails if the two drift.
//
// This exists as a separate entry point because the shared builder translates
// ui_strings.js + help_strings.js into lang/<slug>.js, while the portal cannot
// read either of those at runtime: Google serves it from the school's own Apps
// Script project. Its catalogue is apps_script/school_rewards/portal_strings.json
// and its packs are apps_script/school_rewards/i18n_src/<code>.json.
//
// Usage:
//   GEMINI_API_KEY=... node _build_school_rewards_portal_packs.js --all
//   GEMINI_API_KEY=... node _build_school_rewards_portal_packs.js --lang=French
//   node _build_school_rewards_portal_packs.js --all --dry-run   # no API calls
//   node _build_school_rewards_portal_packs.js --list
//
// Then run: node _build_school_rewards_i18n.js   (emits the runtime packs)
//
// Languages the app marks "english-passthrough" are skipped: no usable
// translation exists for them anywhere in the product, and shipping an English
// pack under a language's own name would misrepresent it.
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PKG = path.join(ROOT, 'apps_script', 'school_rewards');
const SELECTOR = path.join(ROOT, 'ui_language_selector_source.jsx');
const CATALOGUE = path.join(PKG, 'portal_strings.json');

const argv = process.argv.slice(2);
function arg(name, fallback) {
  const flag = '--' + name + '=';
  const found = argv.find((a) => a.startsWith(flag));
  return found ? found.slice(flag.length) : (argv.includes('--' + name) ? true : fallback);
}
const API_KEY = arg('api-key', process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
const MODEL = arg('model', 'gemini-3-flash-preview');
const CHUNK_SIZE = parseInt(arg('chunk-size', 200), 10);
const CONCURRENCY = parseInt(arg('concurrency', 3), 10);
const DRY_RUN = !!arg('dry-run', false);
const ONE = arg('lang', null);
const ALL = !!arg('all', false);
const LIST = !!arg('list', false);
const FORCE = !!arg('force', false);

// Portal-specific do-not-translate terms. Product and format names only; status
// words a person reads (ACTIVE, DRAFT, PREVIEW) are deliberately translatable.
const DNT = ['AlloFlow', 'Google Education', 'Google Workspace', 'Google', 'Apps Script', 'Drive',
  'Gemini', 'SHA-256', 'GLB', 'STL', 'MiB', 'CSV', 'JSON', 'SIS', 'HOWL', 'PHA-NATURAL'];

// BCP-47 tags, used as the pack code and as the page's lang attribute. Spanish
// (Latin America) keeps the plain "es" it already shipped with, so preferences
// saved by students and the repository stay valid.
const BCP47 = {
  'Acholi': 'ach', 'Amharic': 'am', 'Arabic': 'ar', 'Bengali': 'bn', 'Burmese': 'my',
  'Chin (Falam)': 'cfm', 'Chin (Hakha)': 'cnh', 'Chinese (Simplified)': 'zh-Hans',
  'Chinese (Traditional)': 'zh-Hant', 'Dari': 'prs', 'Dutch': 'nl', 'Esperanto': 'eo',
  'Farsi': 'fa', 'French': 'fr', 'French (Canadian)': 'fr-CA', 'German': 'de', 'Greek': 'el',
  'Gujarati': 'gu', 'Haitian Creole': 'ht', 'Hausa': 'ha', 'Hebrew': 'he', 'Hindi': 'hi',
  'Hmong': 'hmn', 'Igbo': 'ig', 'Indonesian': 'id', 'Italian': 'it', 'Japanese': 'ja',
  'Kannada': 'kn', 'Karen': 'ksw', 'Khmer': 'km', 'Kinyarwanda': 'rw', 'Kirundi': 'rn',
  'Korean': 'ko', 'Lao': 'lo', 'Latin': 'la', 'Lingala': 'ln', 'Maay Maay': 'ymm',
  'Malayalam': 'ml', 'Marathi': 'mr', 'Marshallese': 'mh', 'Nepali': 'ne', 'Pashto': 'ps',
  'Polish': 'pl', 'Portuguese (Angola)': 'pt-AO', 'Portuguese (Brazil)': 'pt-BR',
  'Portuguese (Portugal)': 'pt-PT', 'Punjabi': 'pa', 'Romanian': 'ro', 'Russian': 'ru',
  'Somali': 'so', 'Spanish (Castilian)': 'es-ES', 'Spanish (Latin America)': 'es',
  'Swahili': 'sw', 'Tagalog': 'tl', 'Tamil': 'ta', 'Telugu': 'te', 'Thai': 'th',
  'Tigrinya': 'ti', 'Turkish': 'tr', 'Ukrainian': 'uk', 'Urdu': 'ur', 'Vietnamese': 'vi',
  'Yoruba': 'yo',
};

// ─── the language table, read from the app's own selector ───────────────────
function languages() {
  const src = fs.readFileSync(SELECTOR, 'utf8');
  const start = src.indexOf('const FALLBACK_LANGUAGE_OPTIONS = [');
  const end = src.indexOf('];', start);
  if (start === -1 || end === -1) throw new Error('language table not found in ui_language_selector_source.jsx');
  // eslint-disable-next-line no-eval
  const table = eval(src.slice(src.indexOf('[', start), end + 1));
  return table.filter((row) => row.value !== 'English').map((row) => ({
    name: row.value,
    endonym: row.endonym,
    provenance: row.provenance || 'ai-drafted',
    code: BCP47[row.value],
  }));
}

// ─── prompt plumbing, mirroring dev-tools/build_language_pack.cjs ───────────
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function maskDNT(strings) {
  const tokens = {};
  let next = 0;
  const sorted = DNT.slice().sort((a, b) => b.length - a.length);
  const out = {};
  for (const [key, value] of Object.entries(strings)) {
    let masked = String(value);
    for (const term of sorted) {
      masked = masked.replace(new RegExp('\\b' + escapeRe(term) + '\\b', 'g'), (m) => {
        const id = next++; tokens[id] = m; return '‹dnt:' + id + '›';
      });
    }
    out[key] = masked;
  }
  return { masked: out, tokens };
}
function unmaskDNT(strings, tokens) {
  const out = {};
  for (const [key, value] of Object.entries(strings)) {
    out[key] = String(value).replace(/‹dnt:(\d+)›/g, (m, id) => (tokens[id] !== undefined ? tokens[id] : m));
  }
  return out;
}
/* RULES_START */
const RULES = [
  '  1. Keep all JSON keys IDENTICAL. Do not translate keys.',
  '  2. Preserve every ‹dnt:N› token EXACTLY as you see it. Do not translate, reorder, or modify these tokens. They mark do-not-translate values that will be restored after translation.',
  '  3. Preserve all markdown syntax: **bold**, ### headings, * bullets, • bullets, line breaks (\\n), numbered lists, code in `backticks`. Translate the text inside the markdown, not the syntax itself.',
  '  4. Preserve all parameter placeholders like {name}, {count}, {grade} EXACTLY. Do not translate the word inside the braces, do not add or remove braces.',
  '  5. Preserve units (cm, °C, MB, fps) and version tags (v1, v2.3) and brand names verbatim.',
  '  6. For UI controls (buttons, labels, menu items), prefer the shortest natural {LANG} equivalent. Translated text should not be more than ~30% longer than the source.',
  '  7. Return ONLY valid JSON. No prose, no markdown fences, no leading or trailing whitespace, no commentary.',
];
/* RULES_END */

function buildPrompt(chunk, targetLanguage) {
  return [
    'You are a UI translator for AlloFlow, a K-12 special-education web app that supports Universal Design for Learning (UDL), social-emotional learning (SEL), Response to Intervention (RTI), and Individualized Education Programs (IEP). Your audience is teachers, school psychologists, and students.',
    '',
    'TRANSLATE the JSON values into ' + targetLanguage + '. Use the locale\'s standard special-education and pedagogical terminology. Keep a clear, professional, learner-friendly tone — short imperatives for buttons, full sentences for help text.',
    '',
    'This text is the interface of a school rewards and store portal: staff recognize students with points, students see a private balance and a prize catalog, and a cashier checks them out. Translate for a school audience, not a retail one.',
    '',
    'RULES — these are strict, the output will be auto-validated:',
    ...RULES.map((r) => r.replace('{LANG}', targetLanguage)),
    '',
    'INPUT JSON:',
    JSON.stringify(chunk),
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
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 65536 } }),
  });
  const body = await resp.json();
  if (!resp.ok) {
    if ((resp.status === 429 || resp.status >= 500) && attempt < 5) {
      const wait = 2000 * Math.min(attempt, 5);
      console.log('    rate-limited, retrying in ' + wait + 'ms');
      await new Promise((r) => setTimeout(r, wait));
      return callGemini(prompt, attempt + 1);
    }
    throw new Error('Gemini API error ' + resp.status + ': ' + JSON.stringify(body).slice(0, 300));
  }
  return body.candidates && body.candidates[0] && body.candidates[0].content
    && body.candidates[0].content.parts && body.candidates[0].content.parts[0]
    && body.candidates[0].content.parts[0].text;
}
const safeJsonParse = (s) => { try { return JSON.parse(s); } catch (_) { return null; } };

async function translateChunk(chunk, targetLanguage, idx) {
  const { masked, tokens } = maskDNT(chunk);
  let text;
  try { text = await callGemini(buildPrompt(masked, targetLanguage)); }
  catch (e) { console.log('    chunk ' + idx + ': ' + e.message); return null; }
  let parsed = safeJsonParse(text);
  if (!parsed) {
    const repaired = await callGemini('The following JSON is malformed. Fix syntax errors. Return ONLY valid JSON.\n\n' + text);
    parsed = safeJsonParse(repaired);
  }
  if (!parsed) { console.log('    chunk ' + idx + ': irrecoverable parse error'); return null; }
  return unmaskDNT(parsed, tokens);
}

// ─── validation ─────────────────────────────────────────────────────────────
const placeholders = (t) => (String(t).match(/\{\d\}/g) || []).sort().join(',');
const NON_LATIN = /[^ -ɏḀ-ỿ\s\p{P}\p{S}\p{N}]/u;

function validate(language, catalogue, strings, patterns) {
  const problems = [];
  for (const key of Object.keys(catalogue.strings)) if (!strings[key]) problems.push('missing string ' + key);
  for (const [key, entry] of Object.entries(catalogue.patterns)) {
    if (!patterns[key]) { problems.push('missing pattern ' + key); continue; }
    if (placeholders(patterns[key]) !== placeholders(entry.en)) problems.push('placeholder drift in ' + key + ': ' + JSON.stringify(patterns[key]));
  }
  // A dry run deliberately echoes the input back, which is how the masking and
  // chunking get verified; the "did it really translate" checks below would
  // always fire, so they are skipped there and only there.
  if (DRY_RUN) return problems;
  // A language written in a non-Latin script whose output is mostly Latin means
  // the model echoed English back. Cheap, and it catches a whole silent class.
  if (NON_LATIN.test(language.endonym)) {
    const values = Object.values(strings);
    const scripted = values.filter((v) => NON_LATIN.test(v)).length;
    const ratio = values.length ? scripted / values.length : 0;
    if (ratio < 0.6) problems.push('only ' + Math.round(ratio * 100) + '% of values use a non-Latin script; the model may have returned English');
  }
  const echoed = Object.entries(catalogue.strings).filter(([k, en]) => strings[k] === en && en.split(/\s+/).length > 3).length;
  if (echoed > Object.keys(catalogue.strings).length * 0.5) problems.push(echoed + ' long strings came back identical to English');
  return problems;
}

// ─── main ───────────────────────────────────────────────────────────────────
async function buildLanguage(language, catalogue) {
  const flat = {};
  for (const [key, english] of Object.entries(catalogue.strings)) flat['s:' + key] = english;
  for (const [key, entry] of Object.entries(catalogue.patterns)) flat['p:' + key] = entry.en;

  const keys = Object.keys(flat);
  const chunks = [];
  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    chunks.push(Object.fromEntries(keys.slice(i, i + CHUNK_SIZE).map((k) => [k, flat[k]])));
  }
  const results = new Array(chunks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < chunks.length) {
      const idx = cursor++;
      results[idx] = await translateChunk(chunks[idx], language.name, idx + 1);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));
  if (results.some((r) => !r)) return { ok: false, problems: ['one or more chunks failed'] };

  const merged = Object.assign({}, ...results);
  const strings = {};
  const patterns = {};
  for (const [key, value] of Object.entries(merged)) {
    if (typeof value !== 'string' || !value.trim()) continue;
    if (key.startsWith('s:')) strings[key.slice(2)] = value;
    else if (key.startsWith('p:')) patterns[key.slice(2)] = value;
  }
  const problems = validate(language, catalogue, strings, patterns);
  if (problems.length) return { ok: false, problems };

  const target = path.join(PKG, 'i18n_src', language.code + '.json');
  fs.writeFileSync(target, JSON.stringify({
    code: language.code,
    name: language.endonym,
    englishName: language.name,
    provenance: language.provenance,
    strings,
    patterns,
  }, null, 2) + '\n');
  return { ok: true, entries: Object.keys(strings).length + Object.keys(patterns).length };
}

async function main() {
  const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, 'utf8'));
  const all = languages();
  const missingCode = all.filter((l) => !l.code);
  if (missingCode.length) throw new Error('no BCP-47 tag for: ' + missingCode.map((l) => l.name).join(', '));

  if (LIST) {
    for (const l of all) console.log('  ' + l.code.padEnd(8) + l.name.padEnd(26) + l.provenance);
    console.log(all.length + ' languages; ' + all.filter((l) => l.provenance !== 'english-passthrough').length + ' translatable');
    return;
  }
  if (!API_KEY && !DRY_RUN) {
    console.error('No API key. Set GEMINI_API_KEY, or pass --dry-run to verify the pipeline without calling the API.');
    process.exit(2);
  }

  let targets = ONE && ONE !== true ? all.filter((l) => l.name === ONE || l.code === ONE) : (ALL ? all : []);
  if (!targets.length) { console.error('Pass --all, --lang=<name|code>, or --list.'); process.exit(2); }
  const skipped = targets.filter((l) => l.provenance === 'english-passthrough');
  targets = targets.filter((l) => l.provenance !== 'english-passthrough');
  if (!FORCE) {
    const existing = targets.filter((l) => l.code !== 'es' && fs.existsSync(path.join(PKG, 'i18n_src', l.code + '.json')));
    if (existing.length) console.log('(already present, pass --force to redo: ' + existing.map((l) => l.code).join(', ') + ')');
    targets = targets.filter((l) => l.code === 'es' ? false : !fs.existsSync(path.join(PKG, 'i18n_src', l.code + '.json')));
  }

  const total = Object.keys(catalogue.strings).length + Object.keys(catalogue.patterns).length;
  console.log('Catalogue: ' + total + ' entries. Languages to build: ' + targets.length + (DRY_RUN ? ' (dry run)' : ''));
  const failures = [];
  for (const language of targets) {
    process.stdout.write('  ' + language.code.padEnd(8) + language.name.padEnd(26));
    const result = await buildLanguage(language, catalogue);
    if (result.ok) console.log('ok  ' + result.entries + '/' + total);
    else { console.log('FAILED'); result.problems.slice(0, 3).forEach((p) => console.log('      ' + p)); failures.push(language.code); }
  }
  if (skipped.length) console.log('Skipped (english-passthrough, no usable translation exists): ' + skipped.map((l) => l.code).join(', '));
  if (failures.length) { console.log('Failed: ' + failures.join(', ')); process.exitCode = 1; }
  console.log('Now run: node _build_school_rewards_i18n.js');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
