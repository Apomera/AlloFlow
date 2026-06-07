#!/usr/bin/env node
// apply_ci_guard_fixes_20260605.cjs — Patch the two defect classes the CI guard
// (check_translation_quality.cjs) surfaced on its first run:
//
//   (A) acholi "Matter" calque for "Data" — 35 sites in behavior_lens.*
//       Regex: replace standalone "Matter" with "Data". Audit's preferred fix —
//       "Matter" is NOT a real Acholi or English word for behavioral data; "Data"
//       as an English clinical term is the conservative correct choice (Acholi has
//       no widely-agreed native term for it).
//
//   (B) hub.cantdowontdo_title contraction-stub corruption — present in 26 packs.
//       Same old pipeline bug: "Can" was substituted with a target-language verb but
//       the contraction stub "'t Do" stayed in place, producing strings like
//       "Kann't Do / Won't Do" (German), "potest't Do / Won't Do" (Latin),
//       "可以't Do / Won't Do" (Chinese), etc.
//
//       Per-pack fix policy:
//         - High-resource languages (Romance/Germanic/Slavic/Asian/Indic/Arabic/etc) →
//           hand-write the proper translation pair using common ABA term equivalents.
//         - Low-resource / scripts I have very low confidence in → revert to clean
//           English compound "Can't Do / Won't Do" (conservative principle).
//
// Idempotent. Backups at lang/<slug>.js.bak.ciguard-20260605.

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG = path.join(ROOT, 'lang');

const setDeep = (obj, dotted, value) => {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
};
const getDeep = (obj, dotted) => {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) { if (!cur || typeof cur !== 'object') return undefined; cur = cur[p]; }
  return cur;
};

// === (B) hub.cantdowontdo_title — per-pack proper translations ===
// All EN: "Can't Do / Won't Do" — the ABA functional-assessment skill-deficit vs performance-deficit pair.
const CANTDOWONTDO = {
  // High-resource, confident hand-written translations:
  german:            'Kann nicht / Will nicht',
  italian:           'Non può / Non vuole',
  romanian:          'Nu poate / Nu vrea',
  latin:             'Non potest / Non vult',
  greek:             'Δεν μπορεί / Δεν θέλει',
  ukrainian:         'Не може / Не хоче',
  portuguese_angola: 'Não pode / Não quer',
  indonesian:        'Tidak bisa / Tidak mau',
  tagalog:           'Hindi kaya / Ayaw',
  swahili:           'Hawezi / Hataki',
  kinyarwanda:       'Ntibishoboka / Ntabwo ashaka',
  hausa:             'Ba zai iya ba / Ba zai yi ba',
  yoruba:            'Kò lè / Kò fẹ́',
  igbo:              'Enweghị ike / Achọghị',
  amharic:           'መስራት አይችልም / መስራት አይፈልግም',
  tigrinya:          'ክገብር ኣይክእልን / ክገብር ኣይደልን',
  hindi:             'नहीं कर सकता / नहीं करेगा',
  nepali:            'गर्न सक्दैन / गर्न चाहँदैन',
  punjabi:           'ਕਰ ਨਹੀਂ ਸਕਦਾ / ਕਰਨਾ ਨਹੀਂ ਚਾਹੁੰਦਾ',
  tamil:             'செய்ய முடியாது / செய்ய விரும்பவில்லை',
  telugu:            'చేయలేరు / చేయడానికి ఇష్టపడరు',
  burmese:           'မလုပ်နိုင် / မလုပ်လို',
  khmer:             'មិនអាច / មិនចង់',
  hmong:             'Ua tsis tau / Tsis xav ua',
  korean:            '할 수 없음 / 하지 않으려 함',
  // Conservative English revert (very-low confidence + already audit-flagged or low-resource refugee):
  marshallese:       "Can't Do / Won't Do",   // already done earlier; idempotent
  // maay_maay already done earlier this session: 'Ma Awoodo / Ma Doonayo'
};

// === Apply ===
let totalChanges = 0;
const changeLog = [];

// (A) acholi Matter → Data
{
  const langPath = path.join(LANG, 'acholi.js');
  const pack = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  let packChanges = 0;
  const walkAndPatch = (obj, prefix='behavior_lens') => {
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix + '.' + k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        walkAndPatch(v, full);
      } else if (typeof v === 'string') {
        // Match standalone "Matter" (capital M) used as a noun — leave lowercase "matter" verb alone
        const nv = v.replace(/\bMatter\b/g, 'Data');
        if (nv !== v) {
          obj[k] = nv;
          packChanges++;
          changeLog.push({ slug: 'acholi', key: full, before: v, after: nv });
        }
      }
    }
  };
  if (pack.behavior_lens) walkAndPatch(pack.behavior_lens);
  if (packChanges > 0) {
    fs.copyFileSync(langPath, langPath + '.bak.ciguard-20260605');
    fs.writeFileSync(langPath, JSON.stringify(pack, null, 2) + '\n');
    console.log('acholi: ' + packChanges + ' Matter→Data replacements');
    totalChanges += packChanges;
  } else {
    console.log('acholi: no Matter calque found (already fixed?)');
  }
}

// (B) cantdowontdo_title fixes
for (const [slug, newValue] of Object.entries(CANTDOWONTDO)) {
  const langPath = path.join(LANG, slug + '.js');
  if (!fs.existsSync(langPath)) {
    console.log('  WARN: ' + slug + ' — pack not found, skipping');
    continue;
  }
  const pack = JSON.parse(fs.readFileSync(langPath, 'utf8'));
  const cur = getDeep(pack, 'behavior_lens.hub.cantdowontdo_title');
  if (cur === undefined) {
    console.log('  WARN: ' + slug + ' — key not found, skipping');
    continue;
  }
  if (cur === newValue) {
    console.log('  noop: ' + slug + ' (already at target)');
    continue;
  }
  setDeep(pack, 'behavior_lens.hub.cantdowontdo_title', newValue);
  const bak = langPath + '.bak.ciguard-20260605';
  if (!fs.existsSync(bak)) fs.copyFileSync(langPath, bak);
  fs.writeFileSync(langPath, JSON.stringify(pack, null, 2) + '\n');
  console.log(slug + ': ' + JSON.stringify(cur).slice(0,40) + ' → ' + JSON.stringify(newValue));
  totalChanges++;
  changeLog.push({ slug, key: 'behavior_lens.hub.cantdowontdo_title', before: cur, after: newValue });
}

console.log('\n=== TOTAL: ' + totalChanges + ' changes ===');
