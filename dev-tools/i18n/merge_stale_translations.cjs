#!/usr/bin/env node
// merge_stale_translations.cjs — re-translate STALE keys (English reworded after the
// translation was made) into each lang/*.js pack. The companion to
// merge_missing_translations.cjs: that one FILLS missing keys; this one REPLACES
// translations whose English source has since changed.
//
// Source of work: the staleness computed from lang_source_baseline.json (run
// `npm run verify:stale` to also see it as lang_staleness/<lang>.json). It sends only
// the changed keys to Gemini — the same strict prompt the other merge tools use.
//
// SAFETY (this tool OVERWRITES existing, possibly human-reviewed translations):
//   • Native-review-hold packs are SKIPPED by default and reported for a human
//     (lingala, acholi, marshallese, chin_falam, chin_hakha, karen). --include-held overrides.
//   • A *.bak.stale backup of each pack is written before any change.
//   • DRY-RUN by default for safety — pass --apply to actually write.
//   • Re-blessing is NOT automatic: replacing a stale string with fresh AI output does
//     not prove it's correct. After review, clear keys with bless_lang_sources.cjs --key …
//     (or pass --bless to auto-clear ONLY keys that end up stale in zero packs).
//
// Usage:
//   node dev-tools/i18n/merge_stale_translations.cjs                 # dry-run preview, all non-held packs
//   GEMINI_API_KEY=... node dev-tools/i18n/merge_stale_translations.cjs --apply
//   ... --lang=french   --concurrency=2   --include-held   --bless
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lang_src_lib.cjs');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const flag = '--' + name + '=';
  const found = argv.find(a => a.startsWith(flag));
  return found ? found.slice(flag.length) : (argv.includes('--' + name) ? true : fallback);
};
const ONLY_LANG = arg('lang', null);
const APPLY = !!arg('apply', false);          // default is dry-run (overwrite is destructive)
const DRY_RUN = !APPLY;
const INCLUDE_HELD = !!arg('include-held', false);
const AUTO_BLESS = !!arg('bless', false);
const CONCURRENCY = parseInt(arg('concurrency', 2), 10);
const MODEL = arg('model', 'gemini-3-flash-preview');
const API_KEY = arg('api-key', process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

if (APPLY && !API_KEY) {
  console.error('No API key. Set GEMINI_API_KEY=... or pass --api-key=, or drop --apply for a dry run.');
  process.exit(2);
}

// Packs held for native-language human review — auto-overwriting them with machine
// output is exactly what the hold exists to prevent. (maay_maay is already excluded
// by the lib as wrong-language.)
const HELD = new Set(['lingala', 'acholi', 'marshallese', 'chin_falam', 'chin_hakha', 'karen']);

const LANG_NAMES = {
  acholi: 'Acholi', amharic: 'Amharic', arabic: 'Arabic', bengali: 'Bengali',
  burmese: 'Burmese', chin_falam: 'Chin (Falam)', chin_hakha: 'Chin (Hakha)',
  chinese_simplified: 'Chinese (Simplified)', chinese_traditional: 'Chinese (Traditional)',
  dari: 'Dari', farsi: 'Farsi (Persian)', french: 'French', french_canadian: 'French (Canadian)',
  german: 'German', greek: 'Greek', haitian_creole: 'Haitian Creole', hausa: 'Hausa',
  hebrew: 'Hebrew', hindi: 'Hindi', hmong: 'Hmong', igbo: 'Igbo', indonesian: 'Indonesian',
  italian: 'Italian', japanese: 'Japanese', kannada: 'Kannada', karen: 'Karen', khmer: 'Khmer',
  kinyarwanda: 'Kinyarwanda', kirundi: 'Kirundi', korean: 'Korean', lao: 'Lao',
  latin: 'Latin', lingala: 'Lingala', malayalam: 'Malayalam', marathi: 'Marathi',
  marshallese: 'Marshallese', nepali: 'Nepali', pashto: 'Pashto', polish: 'Polish',
  portuguese_angola: 'Portuguese (Angola)', portuguese_brazil: 'Portuguese (Brazil)',
  portuguese_portugal: 'Portuguese (Portugal)', punjabi: 'Punjabi', romanian: 'Romanian',
  russian: 'Russian', somali: 'Somali', spanish_castilian: 'Spanish (Castilian)',
  spanish_latin_america: 'Spanish (Latin America)', swahili: 'Swahili', tagalog: 'Tagalog',
  tamil: 'Tamil', telugu: 'Telugu', thai: 'Thai', tigrinya: 'Tigrinya', turkish: 'Turkish',
  ukrainian: 'Ukrainian', urdu: 'Urdu', vietnamese: 'Vietnamese', yoruba: 'Yoruba'
};

// Strict translation prompt — mirrors merge_missing_translations.cjs / build_language_pack.cjs.
function buildPrompt(targetLang, staleJson) {
  return [
    'You are a UI translator for AlloFlow, a K-12 special-education web app that supports Universal Design for Learning (UDL), social-emotional learning (SEL), Response to Intervention (RTI), and Individualized Education Programs (IEP). Your audience is teachers, school psychologists, and students.',
    '',
    'The English wording of these UI strings was UPDATED. Produce a fresh, accurate ' + targetLang + ' translation of each current English value (an earlier translation of the old wording exists and will be replaced). Use the locale\'s standard special-education and pedagogical terminology; short imperatives for buttons, full sentences for help text.',
    '',
    'RULES — these are strict, the output will be auto-validated:',
    '  1. Keep all JSON keys IDENTICAL. Do not translate keys. Keys may contain dots — keep them verbatim.',
    '  2. Preserve every ${variable} placeholder EXACTLY. Do not translate the variable name, do not add or remove braces or the $ prefix. These are JS template-literal slots filled at runtime.',
    '  3. Preserve all markdown syntax: **bold**, ### headings, * bullets, • bullets, line breaks (\\n), numbered lists, code in `backticks`. Translate the text inside the markdown, not the syntax itself.',
    '  4. Preserve emoji exactly (🤖, ⚠️, ✅, etc.).',
    '  5. Preserve technical/branded terms verbatim: BehaviorLens, AlloFlow, Gemini, ABC (in behavioral context), FBA, BIP, IEP, BCBA, FERPA, HIPAA, WCAG, ARIA, JSON, CSV, PDF.',
    '  6. For UI controls (buttons, labels, menu items), prefer the shortest natural ' + targetLang + ' equivalent. Translated text should not be more than ~30% longer than the source.',
    '  7. Return ONLY valid JSON. No prose, no markdown fences, no leading or trailing whitespace, no commentary.',
    '',
    'INPUT JSON:',
    JSON.stringify(staleJson)
  ].join('\n');
}

async function callGemini(prompt, attempt) {
  attempt = attempt || 1;
  if (DRY_RUN) {
    const start = prompt.indexOf('INPUT JSON:\n');
    return start < 0 ? '{}' : prompt.slice(start + 'INPUT JSON:\n'.length); // echo input; nothing is written in dry-run
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
    if (cursor[segs[i]] == null || typeof cursor[segs[i]] !== 'object' || Array.isArray(cursor[segs[i]])) cursor[segs[i]] = {};
    cursor = cursor[segs[i]];
  }
  cursor[segs[segs.length - 1]] = value;
}

// Count ${...} placeholders so we can refuse a translation that lost or invented one.
function placeholders(s) {
  const m = String(s).match(/\$\{[^}]+\}/g) || [];
  return m.slice().sort().join('\x00');
}

async function retranslateOne(slug, staleBlock) {
  const langPath = path.join(L.LANG_DIR, slug + '.js');
  const targetLang = LANG_NAMES[slug] || slug;
  const keys = Object.keys(staleBlock);
  console.log(`[${slug}] ${keys.length} stale → re-translating to ${targetLang}...`);

  let text;
  try { text = await callGemini(buildPrompt(targetLang, staleBlock)); }
  catch (e) { return { slug, status: 'api-error', error: e.message }; }

  let translated;
  try { translated = JSON.parse(text); }
  catch {
    try { translated = JSON.parse(await callGemini('The following JSON is malformed. Fix syntax errors. Return ONLY valid JSON.\n\n' + text)); }
    catch { return { slug, status: 'parse-error' }; }
  }
  if (!translated || typeof translated !== 'object') return { slug, status: 'bad-shape' };

  const langJson = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  let merged = 0, skippedPh = 0;
  const appliedKeys = [];
  for (const k of keys) {
    if (!(k in translated)) continue;
    // Placeholder integrity guard — never write a translation that drops/adds a ${slot}.
    if (placeholders(translated[k]) !== placeholders(staleBlock[k])) { skippedPh++; continue; }
    setDeep(langJson, k, translated[k]);
    appliedKeys.push(k);
    merged++;
  }

  if (APPLY && merged > 0) {
    fs.copyFileSync(langPath, langPath + '.bak.stale');
    fs.writeFileSync(langPath, JSON.stringify(langJson, null, 2) + '\n');
  }
  return { slug, status: 'ok', merged, skippedPh, appliedKeys };
}

// ─── Driver ──────────────────────────────────────────────────────────────
(async () => {
  if (!fs.existsSync(L.BASELINE_PATH)) {
    console.error('No baseline — run  node dev-tools/i18n/bless_lang_sources.cjs  first.');
    process.exit(2);
  }
  const allSlugs = L.getLangSlugs().filter(s => !ONLY_LANG || s === ONLY_LANG);
  const { perPack, changedKeys } = L.computeStaleness({ slugs: allSlugs });

  const heldHits = allSlugs.filter(s => HELD.has(s) && perPack[s]);
  const work = allSlugs.filter(s => perPack[s] && (INCLUDE_HELD || !HELD.has(s)));

  if (changedKeys.length === 0) {
    console.log('✓ nothing stale — no English strings changed since the baseline.');
    return;
  }
  console.log(`${changedKeys.length} changed English key(s); ${work.length} pack(s) to re-translate ` +
    `(concurrency=${CONCURRENCY}, ${DRY_RUN ? 'DRY-RUN — no writes' : 'APPLY'}, model=${MODEL}).`);
  if (!INCLUDE_HELD && heldHits.length) {
    console.log(`  ⏸ ${heldHits.length} native-review-hold pack(s) skipped (need a human): ${heldHits.join(', ')}`);
    console.log(`     (use --include-held to machine-translate them anyway)`);
  }
  if (work.length === 0) { console.log('Nothing to do.'); return; }

  const results = [];
  const queue = work.slice();
  async function worker() {
    while (queue.length) { const slug = queue.shift(); results.push(await retranslateOne(slug, perPack[slug])); }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()));

  const ok = results.filter(r => r.status === 'ok');
  const totalMerged = ok.reduce((a, r) => a + r.merged, 0);
  const totalPh = ok.reduce((a, r) => a + (r.skippedPh || 0), 0);
  const errs = results.filter(r => r.status !== 'ok');
  console.log(`\n── ${DRY_RUN ? 'Dry-run' : 'Done'} ──`);
  console.log(`  packs re-translated: ${ok.length}`);
  console.log(`  keys ${DRY_RUN ? 'that would be ' : ''}written: ${totalMerged}`);
  if (totalPh) console.log(`  ⚠ keys skipped for placeholder mismatch: ${totalPh}`);
  if (errs.length) { console.log(`  errors: ${errs.length}`); errs.forEach(r => console.log(`    ${r.slug}: ${r.status}${r.error ? ' — ' + r.error.slice(0, 90) : ''}`)); }

  if (DRY_RUN) {
    console.log(`\nThis was a preview. Re-run with --apply (and GEMINI_API_KEY) to write.`);
    return;
  }

  // Optional auto-clear: re-bless ONLY keys that are now stale in zero packs.
  const after = L.computeStaleness({});
  const resolved = changedKeys.filter(k => !after.byKey[k]);
  const stillStale = changedKeys.filter(k => after.byKey[k]);
  if (AUTO_BLESS && resolved.length) {
    const baseline = L.loadBaseline();
    const source = L.loadSourceStrings();
    for (const k of resolved) baseline[k] = L.hashEn(source[k]);
    const sorted = {}; for (const k of Object.keys(baseline).sort()) sorted[k] = baseline[k];
    fs.writeFileSync(L.BASELINE_PATH, JSON.stringify(sorted, null, 0) + '\n');
    console.log(`\n✓ auto-blessed ${resolved.length} fully-resolved key(s).`);
  }
  if (stillStale.length) {
    console.log(`\n${stillStale.length} key(s) still stale (held packs / placeholder skips). They stay flagged until handled.`);
  } else if (!AUTO_BLESS && resolved.length) {
    console.log(`\nAll ${resolved.length} changed key(s) now re-translated everywhere. After review, clear them:`);
    console.log(`  node dev-tools/i18n/bless_lang_sources.cjs ${resolved.slice(0, 6).map(k => '--key ' + k).join(' ')}${resolved.length > 6 ? ' …' : ''}`);
  }
})();
