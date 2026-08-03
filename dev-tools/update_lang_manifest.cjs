#!/usr/bin/env node
// dev-tools/update_lang_manifest.cjs
// Scans lang/*.js and (re)writes lang/manifest.json so the fuzzy matcher
// knows what packs exist. Also mirrors to desktop/web-app/public/lang/.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LANG_DIR = path.join(ROOT, 'lang');
const DEPLOY_LANG_DIR = path.join(ROOT, 'desktop/web-app', 'public', 'lang');

function slugToDisplay(slug) {
  // Convert "spanish_latin_america" -> "Spanish (Latin America)" using a
  // simple rule: title-case words, then wrap any trailing segments after
  // the first non-bracketed token in parentheses.
  // For known patterns, keep them clean:
  const known = {
    spanish_latin_america: 'Spanish (Latin America)',
    // NOTE: `display` is the ENGLISH name. It is what the manifest sorts by and
    // what English-reading staff search for. It is NOT what the language picker
    // should lead with — see ENDONYMS below.
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

// Endonyms: each language written in ITSELF.
//
// The picker used to label options with the English `display` name, which fails
// the person it exists for: someone who reads only Somali cannot find "Somali"
// when the interface is in Vietnamese. Endonyms are legible to the speaker
// regardless of what language the rest of the UI is in, which is why this is the
// convention in OS and browser language pickers.
//
// It is also 63 strings rather than 63x63 - translating every language NAME into
// every UI language would be ~3,969 and would still leave a speaker stranded
// whenever their own language was not the current UI language.
//
// Kept here, in the generator, so `node dev-tools/update_lang_manifest.cjs`
// cannot silently drop them the way a hand-edit of manifest.json would be.
const ENDONYMS = {
  acholi: 'Leb Acholi',
  amharic: 'አማርኛ',
  arabic: 'العربية',
  bengali: 'বাংলা',
  burmese: 'မြန်မာ',
  chin_falam: 'Laiholh (Falam)',
  chin_hakha: 'Laiholh (Hakha)',
  chinese_simplified: '简体中文',
  chinese_traditional: '繁體中文',
  dari: 'دری',
  dutch: 'Nederlands',
  esperanto: 'Esperanto',
  farsi: 'فارسی',
  french: 'Français',
  french_canadian: 'Français (Canada)',
  german: 'Deutsch',
  greek: 'Ελληνικά',
  gujarati: 'ગુજરાતી',
  haitian_creole: 'Kreyòl Ayisyen',
  hausa: 'Hausa',
  hebrew: 'עברית',
  hindi: 'हिन्दी',
  hmong: 'Hmoob',
  igbo: 'Igbo',
  indonesian: 'Bahasa Indonesia',
  italian: 'Italiano',
  japanese: '日本語',
  kannada: 'ಕನ್ನಡ',
  karen: 'ကညီကျိာ်',
  khmer: 'ភាសាខ្មែរ',
  kinyarwanda: 'Ikinyarwanda',
  kirundi: 'Ikirundi',
  korean: '한국어',
  lao: 'ພາສາລາວ',
  latin: 'Latina',
  lingala: 'Lingála',
  maay_maay: 'Af-Maay',
  malayalam: 'മലയാളം',
  marathi: 'मराठी',
  marshallese: 'Kajin Ṃajeḷ',
  nepali: 'नेपाली',
  pashto: 'پښتو',
  polish: 'Polski',
  portuguese_angola: 'Português (Angola)',
  portuguese_brazil: 'Português (Brasil)',
  portuguese_portugal: 'Português (Portugal)',
  punjabi: 'ਪੰਜਾਬੀ',
  romanian: 'Română',
  russian: 'Русский',
  somali: 'Soomaali',
  spanish_castilian: 'Español (España)',
  spanish_latin_america: 'Español (Latinoamérica)',
  swahili: 'Kiswahili',
  tagalog: 'Tagalog',
  tamil: 'தமிழ்',
  telugu: 'తెలుగు',
  thai: 'ภาษาไทย',
  tigrinya: 'ትግርኛ',
  turkish: 'Türkçe',
  ukrainian: 'Українська',
  urdu: 'اردو',
  vietnamese: 'Tiếng Việt',
  yoruba: 'Yorùbá',
};

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
    const endonym = ENDONYMS[slug] || display;
    return { slug, display, endonym, keys, bytes: stat.size, updated: stat.mtime.toISOString().slice(0, 10) };
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
