#!/usr/bin/env node
// Stale pack OVERRIDES (wave-2 lane W1). `t()` prefers the pack over UI_STRINGS
// (AlloFlowANTI.txt:4985), so a pack value left behind by an English rename does not
// merely fail to translate — it actively shows a retired feature name where the English
// fallback would have shown the current one. Two live cases:
//
//   1. "Visual Support" -> "Lesson Images" (L10's rename). 7 packs still pin the old name in
//      sidebar.tool_visual / visuals.title / quiz.help.sidebar_visuals_title. The other 56
//      packs simply lack the key and already fall through to the correct English.
//   2. "Throughline" -> "Learning Web: Unit Path". All 63 packs pin
//      palette.ctx.mindMap = "Here — Throughline" against an English source that now reads
//      "Here — Learning Web: Unit Path". The whole palette.ctx.* namespace is English
//      passthrough, so the fix is to carry the current English, not to translate one row.
//
// NOT touched: about.rep_desc, fab.visual_supports, simplified.use_emojis,
// visual_support.teacher_modal_aria, groups.visual_density_tooltip,
// educator_hub.symbol_studio_desc, adventure.word_sounds_review_image_gen. Those still say
// "visual support(s)" in English today because they mean the general UDL principle, not the
// renamed panel. Renaming them would be the regression L3 warned about.
//
// Usage: node dev-tools/i18n/apply_stale_overrides_20260816.cjs [--dry-run]
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [path.join(ROOT, 'lang'), path.join(ROOT, 'desktop/web-app/public/lang')];
const DRY = process.argv.includes('--dry-run');

// "Lesson Images" per pack, for the 7 packs that pinned the retired name.
const LESSON_IMAGES = {
  acholi: 'Cal me pwony',
  chin_falam: 'Cawnnak hmanthlak',
  chin_hakha: 'Cawnnak hmanthlak',
  karen: 'တၢ်မၤလိအဂီၤ',
  lao: 'ຮູບພາບບົດຮຽນ',
  maay_maay: 'Sawirrada Casharka',
  marshallese: 'Pija in katak',
};
const VISUAL_KEYS = ['sidebar.tool_visual', 'visuals.title', 'quiz.help.sidebar_visuals_title'];
const MINDMAP_KEY = 'palette.ctx.mindMap';
const MINDMAP_EN = 'Here — Learning Web: Unit Path'; // matches allo_commands_source.jsx today

const get = (o, k) => k.split('.').reduce((a, p) => (a && typeof a === 'object') ? a[p] : undefined, o);
function set(o, k, v) {
  const parts = k.split('.');
  let cur = o;
  for (let i = 0; i < parts.length - 1; i++) { if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) return false; cur = cur[parts[i]]; }
  cur[parts[parts.length - 1]] = v;
  return true;
}

let vis = 0, mm = 0, skipped = 0;
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const slug = f.replace(/\.js$/, '');
    const p = path.join(dir, f);
    const pack = JSON.parse(fs.readFileSync(p, 'utf8'));
    let dirty = false;

    const term = LESSON_IMAGES[slug];
    if (term) {
      for (const k of VISUAL_KEYS) {
        const val = get(pack, k);
        if (typeof val !== 'string') continue;
        if (!/visual support/i.test(val)) { if (val !== term) skipped++; continue; }
        if (set(pack, k, term)) { vis++; dirty = true; }
      }
    }

    const cur = get(pack, MINDMAP_KEY);
    if (typeof cur === 'string' && /throughline/i.test(cur)) {
      if (set(pack, MINDMAP_KEY, MINDMAP_EN)) { mm++; dirty = true; }
    }

    if (dirty && !DRY) {
      const out = JSON.stringify(pack, null, 2);
      JSON.parse(out);
      fs.writeFileSync(p, out, 'utf8');
    }
  }
}
console.log(`${DRY ? '[dry] ' : ''}stale overrides: ${vis} Lesson Images value(s), ${mm} palette.ctx.mindMap value(s), ${skipped} left alone.`);
