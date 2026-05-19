#!/usr/bin/env node
// dev-tools/update_lang_manifest.cjs
// Scans lang/*.js and (re)writes lang/manifest.json so the fuzzy matcher
// knows what packs exist. Also mirrors to prismflow-deploy/public/lang/.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LANG_DIR = path.join(ROOT, 'lang');
const DEPLOY_LANG_DIR = path.join(ROOT, 'prismflow-deploy', 'public', 'lang');

function slugToDisplay(slug) {
  // Convert "spanish_latin_america" -> "Spanish (Latin America)" using a
  // simple rule: title-case words, then wrap any trailing segments after
  // the first non-bracketed token in parentheses.
  // For known patterns, keep them clean:
  const known = {
    spanish_latin_america: 'Spanish (Latin America)',
    spanish_castilian: 'Spanish (Castilian)',
    french_canadian: 'French (Canadian)',
    portuguese_brazil: 'Portuguese (Brazil)',
    portuguese_portugal: 'Portuguese (Portugal)',
    portuguese_angola: 'Portuguese (Angola)',
    chinese_simplified: 'Chinese (Simplified)',
    chinese_traditional: 'Chinese (Traditional)',
    arabic_levantine: 'Arabic (Levantine)',
    arabic_egyptian: 'Arabic (Egyptian)',
    arabic_gulf: 'Arabic (Gulf)',
    arabic_maghrebi: 'Arabic (Maghrebi)',
    arabic_sudanese: 'Arabic (Sudanese)',
    chin_falam: 'Chin (Falam)',
    chin_hakha: 'Chin (Hakha)',
    chin_matu: 'Chin (Matu)',
    haitian_creole: 'Haitian Creole',
    scottish_gaelic: 'Scottish Gaelic',
    american_sign_language_asl: 'American Sign Language (ASL)'
  };
  if (known[slug]) return known[slug];
  return slug.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function countKeys(filepath) {
  try {
    const text = fs.readFileSync(filepath, 'utf8').replace(/^\s*\/\/.*$/gm, '').trim();
    let obj;
    try { obj = JSON.parse(text); } catch (_) { obj = new Function('return ' + text)(); }
    function flat(o, p, acc) {
      for (const k in o) {
        if (typeof o[k] === 'object' && o[k] !== null && !Array.isArray(o[k])) flat(o[k], p + k + '.', acc);
        else acc[p + k] = o[k];
      }
      return acc;
    }
    return Object.keys(flat(obj, '', {})).length;
  } catch (_) { return 0; }
}

function main() {
  const files = fs.existsSync(LANG_DIR)
    ? fs.readdirSync(LANG_DIR).filter((f) => f.endsWith('.js') && !f.startsWith('.'))
    : [];

  const available = files.map((f) => {
    const slug = f.replace(/\.js$/, '');
    const display = slugToDisplay(slug);
    const fp = path.join(LANG_DIR, f);
    const stat = fs.statSync(fp);
    const keys = countKeys(fp);
    return { slug, display, keys, bytes: stat.size, updated: stat.mtime.toISOString().slice(0, 10) };
  }).sort((a, b) => a.display.localeCompare(b.display));

  const manifest = {
    version: 2,
    generated: new Date().toISOString(),
    count: available.length,
    total_keys_expected: 9307,
    available
  };

  fs.mkdirSync(LANG_DIR, { recursive: true });
  fs.mkdirSync(DEPLOY_LANG_DIR, { recursive: true });
  const json = JSON.stringify(manifest, null, 2);
  fs.writeFileSync(path.join(LANG_DIR, 'manifest.json'), json);
  fs.writeFileSync(path.join(DEPLOY_LANG_DIR, 'manifest.json'), json);

  console.log('Manifest updated: ' + available.length + ' language pack' + (available.length === 1 ? '' : 's'));
  available.forEach((a) => {
    const cov = a.keys >= manifest.total_keys_expected * 0.99 ? '✓' : (a.keys >= manifest.total_keys_expected * 0.9 ? '~' : '✗');
    console.log('  ' + cov + ' ' + a.display.padEnd(36) + a.keys + ' keys, ' + (a.bytes / 1024).toFixed(0) + ' KB');
  });
}
main();
