#!/usr/bin/env node
// G3 rename propagation (wave-1 L1 -> wave-2 W1). English `sidebar.tool_glossary`,
// `glossary.title` and `tools.glossary` were shortened to "Glossary"; all 63 packs still
// carried "Glossary & Language Selection" in each of those 3 keys (189 values), so every
// non-English user saw the retired label. `t()` prefers the pack over UI_STRINGS, so a stale
// pack value OVERRIDES correct English — this is a wrong-text bug, not a missing-text gap.
//
// Per-pack term derived from that pack's own existing string (its first component), per L1's
// derivation note. Packs whose string was a half-English hybrid ("Glossary & leb Selection")
// keep the English head word they already had, rather than inventing a term.
//
// Safety: a value is only rewritten when it still equals one of the stale strings recorded
// below. Anything a concurrent lane already changed is left alone and reported.
//
// Usage: node dev-tools/i18n/apply_glossary_rename_20260816.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop/web-app/public/lang')];
const KEYS = ['sidebar.tool_glossary', 'glossary.title', 'tools.glossary'];
const DRY = process.argv.includes('--dry-run');

const TERM = {
  acholi: 'Glossary',
  amharic: 'መዝገበ ቃላት',
  arabic: 'المسرد',
  bengali: 'শব্দকোষ',
  burmese: 'အဘိဓာန်',
  chinese_simplified: '词汇表',
  chinese_traditional: '詞彙表',
  chin_falam: 'Glossary',
  chin_hakha: 'Glossary',
  dari: 'واژه‌نامه',
  dutch: 'Woordenlijst',
  esperanto: 'Glosaro',
  farsi: 'واژه‌نامه',
  french: 'Glossaire',
  french_canadian: 'Glossaire',
  german: 'Glossar',
  greek: 'Γλωσσάρι',
  gujarati: 'શબ્દાવલિ',
  haitian_creole: 'Glosè',
  hausa: 'Ƙamus',
  hebrew: 'מילון',
  hindi: 'शब्दकोश',
  hmong: 'Phau ntawv qhia lus',
  igbo: 'Akwụkwọ ọkọwa okwu',
  indonesian: 'Daftar istilah',
  italian: 'Glossario',
  japanese: '用語集',
  kannada: 'ಪದಕೋಶ',
  karen: 'Glossary',
  khmer: 'វាក្យានុក្រម',
  kinyarwanda: 'Inkoranyamagambo',
  kirundi: 'Inkoranya',
  korean: '용어집',
  lao: 'ບັນຊີຄຳສັບ',
  latin: 'Glōssārium',
  lingala: 'Mokanda ya maloba',
  maay_maay: 'Liiska Erayada',
  malayalam: 'പദകോശം',
  marathi: 'शब्दकोश',
  marshallese: 'Glossary',
  nepali: 'शब्दावली',
  pashto: 'قاموس',
  polish: 'Słowniczek',
  portuguese_angola: 'Glossário',
  portuguese_brazil: 'Glossário',
  portuguese_portugal: 'Glossário',
  punjabi: 'ਸ਼ਬਦਕੋਸ਼',
  romanian: 'Glosar',
  russian: 'Глоссарий',
  somali: 'Liiska Erayada',
  spanish_castilian: 'Glosario',
  spanish_latin_america: 'Glosario',
  swahili: 'Kamusi',
  tagalog: 'Glosaryo',
  tamil: 'சொல்லகராதி',
  telugu: 'పదకోశం',
  thai: 'อภิธานศัพท์',
  tigrinya: 'መዝገበ ቃላት',
  turkish: 'Sözlük',
  ukrainian: 'Глосарій',
  urdu: 'لغت',
  vietnamese: 'Từ vựng',
  yoruba: 'Ìwé ìtumọ̀ ọ̀rọ̀',
};

// A value is stale (and therefore safe to rewrite) when it names the language-selection half.
// Covers every observed shape, including the half-English hybrids.
const STALE = /(selection|selección|seleção|seleksyon|sélection|auswählen|выбор|вибір|選択|選擇|选择|선택|เลือก|ເລືອກ|निवड|पसंदगी|પસંદગી|ಆಯ್ಕೆ|തിരഞ്ഞെടുപ്പ|ఆయ|எடு|اختيار|انتخاب|غوراوی|doorasho|doorashada|igihitamo|chọn|wybór|seçimi|elekto|taalkeuze|keuze|בחירת|ছিলেকশ|selecti)/i;

let changed = 0, skipped = 0, missing = 0;
const notes = [];

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) { notes.push(`(dir absent, skipped: ${dir})`); continue; }
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const slug = f.replace(/\.js$/, '');
    const term = TERM[slug];
    if (!term) { notes.push(`${dir}/${f}: no term mapped`); missing++; continue; }
    const p = path.join(dir, f);
    const pack = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;
    for (const k of KEYS) {
      const parts = k.split('.');
      let cur = pack;
      for (let i = 0; i < parts.length - 1; i++) { if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) { cur = null; break; } cur = cur[parts[i]]; }
      if (!cur) continue;
      const leaf = parts[parts.length - 1];
      const val = cur[leaf];
      if (typeof val !== 'string') continue;
      if (val === term) { continue; }
      if (!STALE.test(val)) { notes.push(`${slug}.${k}: not stale, left as ${JSON.stringify(val)}`); skipped++; continue; }
      cur[leaf] = term;
      dirty = true;
      changed++;
    }
    if (dirty && !DRY) {
      const out = JSON.stringify(pack, null, 2);
      JSON.parse(out);
      fs.writeFileSync(p, out, 'utf8');
    }
  }
}
notes.forEach((n) => console.log('  ' + n));
console.log(`${DRY ? '[dry] ' : ''}glossary rename: ${changed} value(s) rewritten, ${skipped} left (not stale), ${missing} pack(s) unmapped.`);
