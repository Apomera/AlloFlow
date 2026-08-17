#!/usr/bin/env node
// scan_pack_length_outlier.cjs — catch a translation that lost its content.
//
//   node dev-tools/scan_pack_length_outlier.cjs [--section a11y] [--prefix storyforge_]
//                                               [--min-en 24] [--ratio 0.28]
//
// ★ The third failure mode found while hand-translating 63 packs, and the one
//   the other two gates are blind to by construction. The real near-miss, in a
//   Tigrinya draft:
//       EN  "🌍 Accent patterns detected — scores adjusted conservatively…"  (92 ch)
//       TI  "🀃 "                                                            (2 ch)
//   scan_pack_script_bleed sees nothing — a mahjong tile is Script=Common, legal
//   everywhere. scan_pack_latin_residue sees nothing — there is no Latin in it.
//   insert_pack_keys sees nothing — non-empty string, no placeholders in the
//   English to lose, no DNT terms to drop. It is simply a sentence that stopped
//   being a sentence, and only a reader would notice.
//
// The check is deliberately blunt: a translation far shorter than its English
// source has almost certainly lost content. It cannot prove meaning, only that
// something of the right SIZE is present — which is exactly the class of slip a
// human eye misses on pass 40 of 63.
//
// ★★ Thresholds are set where real translations do not live. Compact scripts
//   genuinely run short — Chinese "翻页" is 2 characters against "Page turn" at
//   9 — so the floor only considers English strings of --min-en chars or more,
//   and only flags below --ratio of the source length. Tightening this without
//   re-checking CJK/Thai/Khmer will produce noise and get the gate switched off.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const SECTION = flag('section', 'a11y');
const PREFIX = flag('prefix', 'storyforge_');
const MIN_EN = parseInt(flag('min-en', '24'), 10);
const RATIO = parseFloat(flag('ratio', '0.28'));

// ★★ Logographic scripts genuinely say the same thing in a third of the
//   characters — Chinese "关闭书写反馈" is a complete rendering of "Disable
//   penmanship feedback" (6 chars vs 27), and Korean "삽화 만들기" of "Generate an
//   illustration" (6 vs 24). At the flat 0.28 ratio these packs produced 64
//   false positives and zero real ones. They get a much lower floor; the real
//   defect this gate exists for scored 0.00, so the signal survives the change.
const DENSE = new Set(['chinese_simplified', 'chinese_traditional', 'japanese', 'korean']);
const DENSE_RATIO = parseFloat(flag('dense-ratio', '0.12'));

const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));
const en = ui[SECTION];
if (!en) { console.error('no such section: ' + SECTION); process.exit(1); }

let flagged = 0, checked = 0;
for (const file of fs.readdirSync(path.join(ROOT, 'lang')).filter((f) => f.endsWith('.js')).sort()) {
  const slug = file.replace('.js', '');
  let pack;
  try { pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', file), 'utf8')); } catch (_) { continue; }
  const sec = pack[SECTION];
  if (!sec) continue;

  const hits = [];
  const ratio = DENSE.has(slug) ? DENSE_RATIO : RATIO;
  for (const k of Object.keys(sec).filter((x) => x.startsWith(PREFIX))) {
    const src = en[k], dst = sec[k];
    if (typeof src !== 'string' || typeof dst !== 'string') continue;
    if (src.length < MIN_EN) continue;
    checked++;
    // Compare on visible content: strip placeholders and emoji/symbols so a
    // string that is ONLY an emoji cannot pass on its emoji's width.
    const visible = (s) => s.replace(/\{\d+\}/g, '').replace(/[\p{Extended_Pictographic}\p{S}]/gu, '').trim();
    const a = visible(src).length, b = visible(dst).length;
    if (a >= MIN_EN && b < a * ratio) hits.push({ k, src, dst, a, b });
  }
  if (hits.length) {
    flagged += hits.length;
    console.log('FLAG ' + slug + ' — ' + hits.length + ' translation(s) far shorter than source:');
    for (const h of hits.slice(0, 5)) {
      console.log('   ' + h.k + '  [' + h.b + ' vs ' + h.a + ' visible chars]');
      console.log('     EN: ' + h.src.slice(0, 76));
      console.log('     ' + slug.slice(0, 2).toUpperCase() + ': ' + h.dst.slice(0, 76));
    }
  }
}
console.log('---');
console.log('scan_pack_length_outlier: ' + flagged + ' outlier(s) across ' + checked + ' comparable string(s).');
process.exit(flagged ? 1 : 0);
