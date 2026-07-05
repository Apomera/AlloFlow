#!/usr/bin/env node
/**
 * apply_guided_tl.cjs — additive merge of hand-translated guided/toolbar keys into lang packs.
 *
 * Usage: node dev-tools/i18n/apply_guided_tl.cjs <translations.json>
 *   translations.json = { "<slug>": { "guided": {k:v,...}, "toolbar": {k:v,...} }, ... }
 *
 * Rules (matches the established STEM-translation pipeline):
 *  - ADDITIVE ONLY: never overwrites an existing key in a pack (protects concurrent work).
 *  - Writes canonical JSON: JSON.stringify(obj, null, 2) + '\n'.
 *  - Refuses to touch the 6 native-review holds.
 *  - Scans each added value for foreign-script / replacement-char contamination and
 *    stray English runs; prints warnings (does not block — some passthrough is intentional).
 *  - Verifies the pack still parses after write.
 */
const fs = require('fs');
const path = require('path');

const HOLDS = new Set(['acholi', 'karen', 'marshallese', 'chin_falam', 'chin_hakha', 'maay_maay']);
const LANG_DIR = path.resolve(__dirname, '../../lang');

// Kept-identifier allowlist for the stray-Latin scan (brands / product names / placeholders).
const KEEP_LATIN = /\b(AlloFlow|StoryForge|PoetTree|LitLab|Learning Hub)\b|\{n\}/g;

// Latin-script packs legitimately contain Latin runs, so the stray-Latin heuristic is only
// meaningful for non-Latin-script targets (Cyrillic/Greek/RTL/CJK/Indic/Ethiopic/…). List the
// Latin-script packs so the scan stays quiet for them and loud where a Latin run = leftover.
const LATIN_SCRIPT = new Set([
  'spanish_latin_america','spanish_castilian','french','french_canadian','italian',
  'portuguese_brazil','portuguese_portugal','portuguese_angola','romanian','latin','haitian_creole',
  'german','dutch','esperanto','polish','turkish','vietnamese','indonesian','tagalog','hmong',
  'swahili','hausa','igbo','yoruba','somali','lingala','kinyarwanda','kirundi',
]);

function readPack(slug) {
  const p = path.join(LANG_DIR, slug + '.js');
  const raw = fs.readFileSync(p, 'utf8');
  return { p, raw, obj: JSON.parse(raw) };
}

function scanValue(slug, ns, key, val) {
  const warns = [];
  if (/�/.test(val)) warns.push('U+FFFD replacement char');
  // Universal replacement char is always a problem. The stray-Latin-run heuristic (possible
  // untranslated leftover) only makes sense for non-Latin-script targets; Latin-script packs
  // are all Latin runs by definition.
  if (!LATIN_SCRIPT.has(slug)) {
    const stripped = String(val).replace(/[μψπ∝∞≈×→↑↓←Δ°²³½·’‘“”«»„、。！？]/g, '');
    const latinRuns = stripped.replace(KEEP_LATIN, '').match(/[A-Za-z]{3,}/g);
    if (latinRuns && latinRuns.length) warns.push('Latin run(s): ' + Array.from(new Set(latinRuns)).join(','));
  }
  return warns;
}

function main() {
  const arg = process.argv[2];
  if (!arg) { console.error('need translations.json path'); process.exit(2); }
  const tl = JSON.parse(fs.readFileSync(arg, 'utf8'));
  let touched = 0, added = 0, warned = 0;
  for (const slug of Object.keys(tl)) {
    if (HOLDS.has(slug)) { console.log('SKIP hold: ' + slug); continue; }
    let pack;
    try { pack = readPack(slug); } catch (e) { console.error('MISSING pack ' + slug + ': ' + e.message); process.exit(1); }
    const nsMap = tl[slug];
    let packAdded = 0;
    for (const ns of Object.keys(nsMap)) {
      pack.obj[ns] = pack.obj[ns] || {};
      for (const [k, v] of Object.entries(nsMap[ns])) {
        if (k in pack.obj[ns]) continue; // additive: never clobber
        pack.obj[ns][k] = v;
        packAdded++; added++;
        const warns = scanValue(slug, ns, k, v);
        if (warns.length) { warned++; console.log('  ⚠ ' + slug + ' ' + ns + '.' + k + ' :: ' + warns.join('; ') + ' :: ' + JSON.stringify(v)); }
      }
    }
    if (packAdded) {
      const out = JSON.stringify(pack.obj, null, 2) + '\n';
      JSON.parse(out); // re-validate before write
      fs.writeFileSync(pack.p, out, 'utf8');
      touched++;
      console.log('✓ ' + slug + ' +' + packAdded);
    } else {
      console.log('· ' + slug + ' (no new keys)');
    }
  }
  console.log('\nDONE: ' + touched + ' packs touched, ' + added + ' keys added, ' + warned + ' scan warnings.');
}
main();
