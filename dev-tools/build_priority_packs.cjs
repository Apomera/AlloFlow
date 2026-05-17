#!/usr/bin/env node
// =============================================================================
// dev-tools/build_priority_packs.cjs
//
// Batch-builds the top PPS-priority language packs by invoking
// dev-tools/build_language_pack.cjs once per language. Sequential, not
// parallel, to stay under Gemini's per-key rate limits.
//
// Usage:
//   GEMINI_API_KEY=... node dev-tools/build_priority_packs.cjs
//   node dev-tools/build_priority_packs.cjs --tier=1            # Spanish, Haitian Creole, Somali, Arabic
//   node dev-tools/build_priority_packs.cjs --tier=2            # tier 1 + Portuguese Brazil, French, Vietnamese, Chinese Simp, Russian
//   node dev-tools/build_priority_packs.cjs --tier=3            # tier 1+2 + tier 3 (~17 packs total)
//   node dev-tools/build_priority_packs.cjs --model=gemini-3-pro
//   node dev-tools/build_priority_packs.cjs --resume            # skip packs that already exist with ≥95% coverage
//   node dev-tools/build_priority_packs.cjs --langs="Korean,Tagalog,Japanese"
//
// The script runs one language at a time and regenerates the manifest after
// every successful pack so the runtime fuzzy matcher always sees the latest
// available packs. If any individual language fails, the script continues to
// the next; failed languages are reported at the end.
// =============================================================================

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LANG_DIR = path.join(ROOT, 'lang');
const BUILD_SCRIPT = path.join(__dirname, 'build_language_pack.cjs');
const UPDATE_MANIFEST_SCRIPT = path.join(__dirname, 'update_lang_manifest.cjs');

// ─── Tiered priority list (PPS-relevant order) ──────────────────────────────
// Tier 1: largest PPS family-language populations + critical refugee communities.
// Tier 2: significant PPS populations + Maine-statewide ELL languages.
// Tier 3: long-tail coverage for PPS families + neighboring district reach.
const TIERS = {
  1: [
    'Spanish (Latin America)',
    'Haitian Creole',
    'Somali',
    'Arabic'
  ],
  2: [
    'Portuguese (Brazil)',
    'French',
    'Vietnamese',
    'Chinese (Simplified)',
    'Russian'
  ],
  3: [
    'Tagalog',
    'Korean',
    'Japanese',
    'Ukrainian',
    'Lingala',
    'Kinyarwanda',
    'Swahili',
    'Amharic'
  ]
};

// ─── Args ───────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function arg(name, fallback) {
  const flag = '--' + name + '=';
  const found = argv.find(a => a.startsWith(flag));
  return found ? found.slice(flag.length) : (argv.includes('--' + name) ? true : fallback);
}
const TIER = parseInt(arg('tier', 3), 10);
const MODEL = arg('model', 'gemini-3-flash-preview');
const RESUME = !!arg('resume', false);
const LANGS_OVERRIDE = arg('langs', null);
const DRY_RUN = !!arg('dry-run', false);
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

if (!API_KEY && !DRY_RUN) {
  console.error('ERROR: No API key in env. Set GEMINI_API_KEY first:');
  console.error('  $env:GEMINI_API_KEY = "..."     # PowerShell');
  console.error('  export GEMINI_API_KEY=...       # bash');
  console.error('Get a key at https://aistudio.google.com/app/apikey');
  process.exit(1);
}

// Build the list of languages to process.
let LANGUAGES;
if (LANGS_OVERRIDE) {
  LANGUAGES = LANGS_OVERRIDE.split(',').map(s => s.trim()).filter(Boolean);
} else {
  LANGUAGES = [];
  for (let t = 1; t <= TIER; t++) {
    if (TIERS[t]) LANGUAGES = LANGUAGES.concat(TIERS[t]);
  }
}

function localeSlug(lang) {
  return lang.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function packExistsWithCoverage(lang, threshold) {
  const slug = localeSlug(lang);
  const fp = path.join(LANG_DIR, slug + '.js');
  if (!fs.existsSync(fp)) return false;
  try {
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\s*\/\/.*$/gm, '').trim();
    const obj = JSON.parse(raw);
    let count = 0;
    (function walk(o) {
      for (const k in o) {
        if (typeof o[k] === 'object' && o[k] !== null) walk(o[k]);
        else count++;
      }
    })(obj);
    // Manifest count threshold (matches expected 9307 from ui_strings + help_strings)
    return count >= (threshold || 9000);
  } catch (_) { return false; }
}

// ─── Main ───────────────────────────────────────────────────────────────────
console.log('');
console.log('═════════════════════════════════════════════════════════════════');
console.log(' Batch building ' + LANGUAGES.length + ' language pack(s)');
console.log(' Model: ' + MODEL);
console.log(' Resume mode: ' + (RESUME ? 'ON (skip ≥95% packs)' : 'OFF'));
console.log('═════════════════════════════════════════════════════════════════');
LANGUAGES.forEach((lang, i) => {
  console.log('  ' + (i + 1) + '. ' + lang);
});
console.log('');

const startTime = Date.now();
const results = { ok: [], failed: [], skipped: [] };

for (let i = 0; i < LANGUAGES.length; i++) {
  const lang = LANGUAGES[i];
  console.log('');
  console.log('▶ [' + (i + 1) + '/' + LANGUAGES.length + '] ' + lang);

  if (RESUME && packExistsWithCoverage(lang, 9000)) {
    console.log('  skipping (existing pack ≥95% coverage)');
    results.skipped.push(lang);
    continue;
  }

  const args = [BUILD_SCRIPT, '--lang=' + lang, '--model=' + MODEL];
  if (RESUME) args.push('--resume');
  if (DRY_RUN) args.push('--dry-run');

  const child = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: ROOT
  });

  if (child.status === 0) {
    results.ok.push(lang);
    // Regenerate manifest after every success so partial-batch crashes still
    // leave the runtime in a consistent state.
    spawnSync(process.execPath, [UPDATE_MANIFEST_SCRIPT], { stdio: 'inherit', cwd: ROOT });
  } else {
    console.log('  ✗ failed (exit ' + child.status + '). Continuing with next language.');
    results.failed.push(lang);
  }
}

const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);

console.log('');
console.log('═════════════════════════════════════════════════════════════════');
console.log(' Batch complete in ' + elapsedMin + ' min');
console.log('═════════════════════════════════════════════════════════════════');
console.log(' ✓ Succeeded: ' + results.ok.length);
results.ok.forEach(l => console.log('     ' + l));
if (results.skipped.length > 0) {
  console.log(' ○ Skipped (already complete): ' + results.skipped.length);
  results.skipped.forEach(l => console.log('     ' + l));
}
if (results.failed.length > 0) {
  console.log(' ✗ Failed: ' + results.failed.length);
  results.failed.forEach(l => console.log('     ' + l));
  console.log('');
  console.log('   Retry just the failed ones:');
  console.log('     node dev-tools/build_priority_packs.cjs --langs="' + results.failed.join(',') + '" --resume');
}
console.log('');
console.log('Next: commit + push so Cloudflare serves the new packs.');
console.log('  git add lang/ prismflow-deploy/public/lang/');
console.log('  git commit -m "lang: add ' + results.ok.length + ' priority packs"');
console.log('  bash deploy.sh "lang: batch ' + TIER + ' (' + results.ok.length + ' packs)"');
console.log('');

process.exit(results.failed.length > 0 ? 1 : 0);
