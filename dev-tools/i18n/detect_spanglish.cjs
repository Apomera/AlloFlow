#!/usr/bin/env node
// detect_spanglish.cjs — Find behavior_lens.* translations that retain too many
// English content words (function-word-only substitution residue from earlier
// build_language_pack.cjs / Phase T-AA pipelines).
//
// Output: dev-tools/i18n/spanglish_flagged/<slug>.json
//   { key: {en, tr, contentWordCount, matchedCount, ratio}, ... }

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const UI = path.join(ROOT, 'ui_strings.js');
const LANG = path.join(ROOT, 'lang');
const OUT = path.join(__dirname, 'spanglish_flagged');

const flatten = (obj, prefix = '') => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? prefix + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else if (typeof v === 'string') out[full] = v;
  }
  return out;
};

const PRESERVED = new Set((
  'BehaviorLens AlloFlow Gemini Firebase Chrome Edge Safari Imagen ' +
  'ABA ABC IEP BIP FBA BCBA BACB FERPA HIPAA MTSS RTI UDL SEL DTT IOA MSWO ' +
  'FCT DR DRA DRI DRO DRL GAS SCD CICO PECS VTA STAG NTAC AI JSON CSV PDF PNG SVG ' +
  'ARIA WCAG SMART K-2 FR VR CRF Tau-U NAP PND MI ASR AAC iPad SPED ' +
  'Skinner Skinnerstyle SOR SoR DIBELS DIBELS-8 ORF Tier IDEA ESSA ESSER ' +
  'Toulmin SIFT VAK STEM ABCdata ABCDe SCREEN'
).split(' '));

const isContent = (w) => {
  if (w.length < 4) return false;
  if (PRESERVED.has(w)) return false;
  if (/^[\d\W_]+$/.test(w)) return false;
  return /[A-Za-z]/.test(w);
};

const tokenize = (s) =>
  s.split(/[\s"'.,;:!?()[\]/\\\-—•]+/).filter(Boolean);

const escapeRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const ui = JSON.parse(fs.readFileSync(UI, 'utf8'));
const enFlat = flatten(ui.behavior_lens || {});

const packs = process.argv.slice(2);
if (packs.length === 0) {
  console.error('Usage: detect_spanglish.cjs <slug> [<slug>...]');
  process.exit(2);
}

fs.mkdirSync(OUT, { recursive: true });

for (const slug of packs) {
  const pack = JSON.parse(fs.readFileSync(path.join(LANG, slug + '.js'), 'utf8'));
  const langFlat = flatten(pack.behavior_lens || {});
  const flagged = {};
  const histogram = { pct40_60: 0, pct60_80: 0, pct80_100: 0 };

  for (const [k, en] of Object.entries(enFlat)) {
    if (typeof en !== 'string' || en.length < 25) continue;
    const tr = langFlat[k];
    if (typeof tr !== 'string' || tr === en) continue;
    const enWords = tokenize(en).filter(isContent);
    if (enWords.length < 3) continue;

    const matched = enWords.filter((w) => {
      const re = new RegExp('(?:^|[^A-Za-z])' + escapeRe(w) + '(?:[^A-Za-z]|$)', 'i');
      return re.test(tr);
    });
    const ratio = matched.length / enWords.length;
    if (ratio >= 0.4) {
      flagged[k] = {
        en,
        tr,
        contentWordCount: enWords.length,
        matchedCount: matched.length,
        ratio: +ratio.toFixed(2),
      };
      if (ratio < 0.6) histogram.pct40_60++;
      else if (ratio < 0.8) histogram.pct60_80++;
      else histogram.pct80_100++;
    }
  }

  const count = Object.keys(flagged).length;
  console.log(
    slug +
      ': ' +
      count +
      ' Spanglish-flagged (40-60%: ' +
      histogram.pct40_60 +
      ', 60-80%: ' +
      histogram.pct60_80 +
      ', 80-100%: ' +
      histogram.pct80_100 +
      ')'
  );
  fs.writeFileSync(path.join(OUT, slug + '.json'), JSON.stringify(flagged, null, 2) + '\n');
}
