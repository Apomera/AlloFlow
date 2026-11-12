#!/usr/bin/env node
// build_export_label_catalog.cjs — document-language labels for HTML exports.
//
// Student-facing export labels follow the DOCUMENT language, which may differ
// from the app language (an English-speaking teacher making a Spanish
// worksheet). The app only has its own language pack loaded, and a pack is
// ~11 MB, so the export loads a compact per-language label file instead:
// export_labels/<tag>.js -> window.AlloModules.ExportLabels[tag][key].
//
// This script rebuilds those files (beside every export_runtime_copy_module.js
// copy, which lists the tags in labelTags) from:
//   1. the language packs in lang/ (preferred: reviewed app translations), then
//   2. export_label_translations.json (machine-assisted fills for labels the
//      packs lack; dropped automatically once the English wording changes).
// Keys come from export_label_keys.json. Re-run after packs or keys change:
//   node dev-tools/i18n/build_export_label_catalog.cjs          (report only)
//   node dev-tools/i18n/build_export_label_catalog.cjs --write
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./lang_src_lib.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const WRITE = process.argv.includes('--write');
const KEYS = JSON.parse(fs.readFileSync(path.join(__dirname, 'export_label_keys.json'), 'utf8'));
const OWN = JSON.parse(fs.readFileSync(path.join(__dirname, 'export_label_translations.json'), 'utf8'));
// Document language tag -> pack slug (null: no pack exists).
const TAGS = { am: 'amharic', bn: 'bengali', de: 'german', el: 'greek', eo: 'esperanto', 'fa-AF': 'dari', fa: 'farsi', gu: 'gujarati', ha: 'hausa', he: 'hebrew', hi: 'hindi', hmn: 'hmong', ht: 'haitian_creole', id: 'indonesian', ig: 'igbo', it: 'italian', ja: 'japanese', km: 'khmer', kn: 'kannada', ko: 'korean', lo: 'lao', ml: 'malayalam', mn: null, mr: 'marathi', ms: null, my: 'burmese', ne: 'nepali', nl: 'dutch', pa: 'punjabi', pl: 'polish', ps: 'pashto', ru: 'russian', rw: 'kinyarwanda', so: 'somali', sw: 'swahili', ta: 'tamil', th: 'thai', ti: 'tigrinya', tl: 'tagalog', tr: 'turkish', uk: 'ukrainian', ur: 'urdu', vi: 'vietnamese', yo: 'yoruba', 'zh-TW': 'chinese_traditional', es: 'spanish_latin_america', fr: 'french', pt: 'portuguese_brazil', ar: 'arabic', zh: 'chinese_simplified' };
const COPIES = ['export_runtime_copy_module.js', 'desktop/web-app/public/export_runtime_copy_module.js', 'desktop/app-build/export_runtime_copy_module.js', 'desktop/web-app/build/export_runtime_copy_module.js'];

const en = L.flatten(L.loadUiStrings());
const slugs = new Set(L.getLangSlugs());
const placeholders = (text) => (String(text).match(/\{\w+\}/g) || []).sort().join(',');
// Some t() results are written into the page unescaped, so values stay plain text.
const usable = (key, value) => typeof value === 'string' && value.trim() && !/[<>&"]/.test(value) && placeholders(value) === placeholders(en[key]);

// Half-translated pack values (English words left inside) are not shown to students.
const NON_LATIN = new Set(['am', 'bn', 'el', 'fa', 'fa-AF', 'gu', 'he', 'hi', 'ja', 'km', 'kn', 'ko', 'lo', 'ml', 'mn', 'mr', 'my', 'ne', 'pa', 'ps', 'ru', 'ta', 'th', 'ti', 'uk', 'ur', 'zh', 'zh-TW', 'ar']);
const KEEP_LATIN = new Set(['gemini', 'canvas', 'alloflow', 'cornell', 'steam', 'wcag', 'json', 'html', 'google', 'notebooklm', 'verdana', 'georgia', 'tahoma']);
const garbled = (tag, key, value) => {
  // A short label that came back as a paragraph is a stale pack entry (help_mode.tool_anchor_chart held the old tool description).
  if (en[key].length <= 30 && String(value).length > Math.max(60, en[key].length * 4)) return true;
  const bare = String(value).replace(/\{\w+\}/g, ' ');
  if (/\b(the|and|your|with|found|below|this|that)\b/i.test(bare)) return true;
  if (!NON_LATIN.has(tag)) return false;
  const source = new Set((en[key].replace(/\{\w+\}/g, ' ').toLowerCase().match(/[a-z]{4,}/g) || []));
  return (bare.toLowerCase().match(/[a-z]{4,}/g) || []).some((word) => source.has(word) && !KEEP_LATIN.has(word));
};
const fit = (key, value) => value.trim() + (/\s$/.test(en[key]) ? ' ' : '');
module.exports = { usable, garbled, fit };
if (require.main === module) main();

function main() {
  const labels = {}; const stats = {};
  for (const [tag, slug] of Object.entries(TAGS)) {
    if (slug && !slugs.has(slug)) throw new Error('no pack for ' + slug);
    const pack = slug ? L.flatten(L.loadPack(slug)) : {};
    const own = OWN.translations[tag] || {};
    const out = {}; const s = { pack: 0, own: 0, stale: 0, missing: 0, garbled: 0 };
    for (const key of KEYS) {
      if (typeof en[key] !== 'string') continue;
      const fromPack = pack[key];
      if (usable(key, fromPack) && fromPack.trim() !== en[key].trim() && garbled(tag, key, fromPack)) s.garbled++;
      else if (usable(key, fromPack) && fromPack.trim() !== en[key].trim()) { out[key] = fit(key, fromPack); s.pack++; continue; }
      if (typeof own[key] === 'string') {
        if (OWN.english[key] !== en[key]) { s.stale++; continue; }
        if (usable(key, own[key])) { out[key] = fit(key, own[key]); s.own++; continue; }
      }
      s.missing++;
    }
    labels[tag] = out; stats[tag] = s;
  }
  const total = Object.values(stats).reduce((a, s) => ({ pack: a.pack + s.pack, own: a.own + s.own, stale: a.stale + s.stale, missing: a.missing + s.missing, garbled: a.garbled + s.garbled }), { pack: 0, own: 0, stale: 0, missing: 0, garbled: 0 });
  console.log('keys', KEYS.length, '| languages', Object.keys(TAGS).length, '| from packs', total.pack, '| from fills', total.own, '| stale fills dropped', total.stale, '| garbled pack values rejected', total.garbled, '| still English', total.missing);
  const worst = Object.entries(stats).sort((a, b) => b[1].missing - a[1].missing).slice(0, 6).map(([t, s]) => t + ':' + s.missing).join(' ');
  console.log('most gaps:', worst);
  const gapsAt = process.argv.indexOf('--gaps');
  if (gapsAt > 0) fs.writeFileSync(process.argv[gapsAt + 1], JSON.stringify(Object.fromEntries(Object.keys(TAGS).map((tag) => [tag, KEYS.filter((key) => typeof en[key] === 'string' && !labels[tag][key])])), null, 1));
  if (!WRITE) return;

  // One small file per language (export_labels/<tag>.js) so an export downloads
  // only its own language; the main module lists which tags have a file. The
  // folder is a COMPANION_ASSET_DIRS entry in build.js, so releases pin each file.
  const DIR = 'export_labels';
  const tags = Object.keys(labels).filter((tag) => Object.keys(labels[tag]).length);
  for (const rel of COPIES) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) { console.log('skip (absent)', rel); continue; }
    const text = fs.readFileSync(file, 'utf8');
    const nl = text.includes('\r\n') ? '\r\n' : '\n';
    const lines = text.split(/\r?\n/);
    // Older output kept every language inline between these markers.
    const a = lines.indexOf('  // export-labels:start (generated by dev-tools/i18n/build_export_label_catalog.cjs)');
    const b = lines.indexOf('  // export-labels:end');
    if (a >= 0 && b > a) lines.splice(a, b - a + 1);
    const at = lines.findIndex((line) => line.indexOf('window.AlloModules.ExportRuntimeCopy = Object.freeze(') >= 0);
    if (at < 0) throw new Error(rel + ': export line not found');
    lines[at] = '  window.AlloModules.ExportRuntimeCopy = Object.freeze({ version: 3, catalog: Object.freeze(catalog), labelTags: Object.freeze(' + JSON.stringify(tags) + ') });';
    fs.writeFileSync(file, lines.join(nl));
    const dir = path.join(path.dirname(file), DIR);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of fs.readdirSync(dir)) if (/\.js$/.test(name) && !tags.includes(name.slice(0, -3))) fs.unlinkSync(path.join(dir, name));
    let bytes = 0;
    for (const tag of tags) {
      const out = ['// Generated by dev-tools/i18n/build_export_label_catalog.cjs: HTML export labels (' + tag + '). Do not edit.',
        '(function () {', "  'use strict';", "  var root = typeof window !== 'undefined' ? window : globalThis;",
        '  root.AlloModules = root.AlloModules || {};', '  var sets = root.AlloModules.ExportLabels = root.AlloModules.ExportLabels || {};',
        '  sets[' + JSON.stringify(tag) + '] = Object.freeze(' + JSON.stringify(labels[tag]) + ');', '})();', ''].join('\n');
      fs.writeFileSync(path.join(dir, tag + '.js'), out);
      bytes += Buffer.byteLength(out);
    }
    console.log('wrote', rel, Math.round(fs.statSync(file).size / 1024) + ' KB +', tags.length, 'label files', Math.round(bytes / 1024) + ' KB');
  }
}
