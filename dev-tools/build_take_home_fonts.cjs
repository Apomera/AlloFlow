// Puts the two reading fonts of Reading tools > Letters (data/vendor/fonts/source.json) into
// word_sounds_take_home_loader.js, between the GENERATED FONTS markers, as one style rule each with the
// font inside it (a data: address). A file loads nothing, so a font must travel inside the file; its rule
// allows fonts from inside the file only (font-src data:). Then copies the loader to its three mirrors.
//
//   node dev-tools/build_take_home_fonts.cjs           build + mirror
//   node dev-tools/build_take_home_fonts.cjs --check   fail if stale (or if a font file changed)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const LOADER = path.join(ROOT, 'word_sounds_take_home_loader.js');
const MIRRORS = ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build'];
const DIR = path.join(ROOT, 'data/vendor/fonts');
const source = JSON.parse(fs.readFileSync(path.join(DIR, 'source.json'), 'utf8'));

const rules = source.fonts.map((font) => {
  const bytes = fs.readFileSync(path.join(DIR, font.file));
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha !== font.sha256) throw new Error(font.file + ': its SHA-256 is ' + sha + ', not the ' + font.sha256 + ' in source.json');
  if (bytes.slice(0, 4).toString('latin1') !== 'wOF2') throw new Error(font.file + ': not a WOFF2 font');
  if (!fs.existsSync(path.join(DIR, font.licenseFile))) throw new Error(font.file + ': its licence file is missing');
  return '@font-face{font-family:"' + font.family + '";font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,' + bytes.toString('base64') + ') format("woff2")}';
});
const credit = source.fonts.map((font) => font.family + ' (' + font.copyright.replace(/^Copyright /, '').replace(/\s*\(https?:[^)]*\)/, '') + ')').join(' and ') + ', SIL Open Font License 1.1';
const begin = '  // BEGIN GENERATED FONTS (dev-tools/build_take_home_fonts.cjs)';
const end = '  // END GENERATED FONTS';
const block = begin + '\n'
  + '  // The reading fonts of Reading tools > Letters, inside every file (data/vendor/fonts/source.json).\n'
  + '  var FONT_CSS = ' + JSON.stringify(rules.join('\n')) + ';\n'
  + '  var FONT_CREDIT = ' + JSON.stringify('Fonts: ' + credit + '.') + ';\n'
  + end;
const pattern = /  \/\/ BEGIN GENERATED FONTS[^\n]*\n[\s\S]*?  \/\/ END GENERATED FONTS(?=\n)/;

const loader = fs.readFileSync(LOADER, 'utf8');
if (!pattern.test(loader)) throw new Error('word_sounds_take_home_loader.js has no GENERATED FONTS markers');
const next = loader.replace(pattern, () => block);
const kb = (rules.join('').length / 1000).toFixed(1);
if (process.argv.includes('--check')) {
  const stale = next !== loader || MIRRORS.some((m) => { const p = path.join(ROOT, m, 'word_sounds_take_home_loader.js'); return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== next; });
  if (stale) { console.error('take-home fonts are stale: run node dev-tools/build_take_home_fonts.cjs'); process.exit(1); }
  console.log('take-home fonts are current (' + source.fonts.length + ' fonts, ' + kb + ' KB of style rules in every file)');
  process.exit(0);
}
// A mirror is replaced only when it is the root loader as it was before this run (or already the result). A mirror
// that holds anything else may hold another person's edit: stop and say so (CLAUDE.md, "Before you overwrite").
const odd = MIRRORS.filter((m) => { const p = path.join(ROOT, m, 'word_sounds_take_home_loader.js'); if (!fs.existsSync(p)) return false; const t = fs.readFileSync(p, 'utf8'); return t !== loader && t !== next; });
if (odd.length) { console.error('Not written: these copies differ from the root loader, so they may hold someone else\'s edit: ' + odd.join(', ') + '. Compare them first.'); process.exit(1); }
if (next !== loader) fs.writeFileSync(LOADER, next);
MIRRORS.forEach((m) => { const p = path.join(ROOT, m, 'word_sounds_take_home_loader.js'); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== next) fs.writeFileSync(p, next); });
console.log('take-home fonts: ' + source.fonts.map((f) => f.family).join(', ') + ' (' + kb + ' KB of style rules in every file)');
