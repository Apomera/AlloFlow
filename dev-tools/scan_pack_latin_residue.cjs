#!/usr/bin/env node
// scan_pack_latin_residue.cjs — catch untranslated English left inside a
// non-Latin-script pack.
//
//   node dev-tools/scan_pack_latin_residue.cjs [--section a11y] [--prefix storyforge_]
//                                              [--list]
//
// ★ The sibling of scan_pack_script_bleed, and deliberately a SEPARATE gate.
//   That one asks "did a foreign alphabet leak in"; this asks "did English fail
//   to leave". Both were real, both happened while hand-translating 60 packs in
//   one sitting, and neither can see the other's bug:
//     bleed    → a Chinese 预 inside Russian    (foreign script, right language)
//     residue  → "そしてかつてないほど good な結末へ"  (Latin, and Latin is legal
//                everywhere because of StoryForge / Ctrl+Cmd / .storyforge)
//   scan_pack_script_bleed allows Latin unconditionally, so it is structurally
//   blind to the second. Merging them would mean weakening that allowance.
//
// Only packs written in a non-Latin script are checked — in a Latin-script pack
// (Spanish, Somali, Vietnamese) every word is Latin and the signal is zero.
//
// ★★ The allowlist is the whole design. Brand names, key names, file
//   extensions and measurement units are SUPPOSED to stay Latin, so the gate is
//   only as good as its list of them. Run with --list to see every distinct
//   Latin token currently surviving, which is how the list below was built.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const SECTION = flag('section', 'a11y');
const PREFIX = flag('prefix', 'storyforge_');
const LIST = args.includes('--list');

// Packs whose body text is not written in the Latin alphabet.
const NON_LATIN = new Set(['arabic', 'farsi', 'dari', 'pashto', 'urdu', 'hebrew', 'russian',
  'ukrainian', 'greek', 'chinese_simplified', 'chinese_traditional', 'japanese', 'korean',
  'thai', 'lao', 'khmer', 'burmese', 'hindi', 'marathi', 'nepali', 'bengali', 'punjabi',
  'gujarati', 'tamil', 'telugu', 'kannada', 'malayalam', 'amharic', 'tigrinya', 'karen']);

// Latin tokens that are correct in every language: do-not-translate brands, key
// names, units, file extensions, and the assessment acronyms the UI cites by name.
const OK = new Set([
  'alloflow', 'allobot', 'allohaven', 'storyforge', 'story', 'forge', 'litlab', 'poettree',
  'gemini', 'imagen', 'kokoro', 'xp', 'udl', 'sel', 'iep', 'ferpa', 'wcag', 'wcpm', 'tts',
  'portfolio', 'ai', 'sfx', 'url', 'mb', 'kb', 'gb', 'ctrl', 'cmd', 'shift', 'alt', 'home',
  'end', 'esc', 'tab', 'orf', 'dibels', 'flesch', 'kincaid', 'manga', 'e', 'g', 'z', 'x',
  // hyphenated as one token by the word regex; 'sf' is the Japanese genre label
  'flesch-kincaid', 'sf',
]);

// ★ Per-pack allowance, NOT a global one. Karen's existing pack is deliberately
//   mixed-script: its own human translators leave a Latin technical term inside
//   63% of their Karen strings (measured against this repo's karen.js), because
//   S'gaw Karen has no settled vocabulary for comic-production jargon. Coining
//   compounds for it would be fabrication, so the StoryForge keys follow the
//   same convention at half that rate (32%).
//   These terms stay global-FLAGGED for every other non-Latin pack — Bengali,
//   Khmer, Thai and the rest all have real words for panel/bubble/frame and use
//   them, so widening OK globally would blind the gate exactly where it works.
const PACK_OK = {
  karen: new Set([
    // 'key' is left Latin by this pack's own translators ("ကၠိ key loaded",
    // "class key file") and is not lettered on the physical hardware. The
    // direction words around it ARE translated — ဖီခိၣ်/ဖီလာ်/စုစ့ၢ်/စုထွဲ —
    // because those aria strings tell a screen-reader user how to drive the
    // control, which is the last place to leave English.
    'key', 'keys',
    // 'microphone' is left Latin in every pre-existing string of this pack
    // ("Microphone", "Use Microphone", "ဒိး microphone လၢလာ်") — convention, checked.
    'microphone',
    'shot', 'angle', 'bubble', 'panel', 'panels', 'comic', 'grid', 'camera',
    'frame', 'checkpoint', 'backup', 'clipboard', 'file', 'menu', 'science',
    'blend', 'find', 'families', 'scramble', 'sort', 'hub', 'available',
    'scaffolds', 'analysis', 'alignment', 'session', 'per', 'rhyme', 'say',
    'hello', 'cinderella', 'icarus',
  ]),
};

let flagged = 0, checked = 0;
const seen = new Map();
for (const file of fs.readdirSync(path.join(ROOT, 'lang')).filter((f) => f.endsWith('.js')).sort()) {
  const slug = file.replace('.js', '');
  if (!NON_LATIN.has(slug)) continue;
  let pack;
  try { pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', file), 'utf8')); } catch (_) { continue; }
  const sec = pack[SECTION];
  if (!sec) continue;

  const hits = [];
  for (const k of Object.keys(sec).filter((x) => x.startsWith(PREFIX))) {
    const v = sec[k];
    if (typeof v !== 'string') continue;
    checked++;
    // A run of Latin letters, apostrophes and hyphens = one candidate word.
    for (const w of v.match(/[A-Za-z][A-Za-z'’-]*/g) || []) {
      // ★ Trim trailing hyphens/apostrophes before the allowlist lookup. Several
      //   languages glue their own grammar onto a Latin brand name with a
      //   hyphen — Bengali "Portfolio-তে" (in Portfolio), "AlloHaven-এর" (of
      //   AlloHaven), "MB-এর" — and the token then arrives here as "Portfolio-",
      //   which no allowlist entry matches. That is correct orthography, not
      //   untranslated English, and it made this gate cry wolf 7 times on its
      //   first real non-Latin pack.
      const key = w.toLowerCase().replace(/[-'’]+$/, '').replace(/[’']s$/, '');
      if (OK.has(key)) continue;
      if (PACK_OK[slug] && PACK_OK[slug].has(key)) continue;
      seen.set(key, (seen.get(key) || 0) + 1);
      hits.push({ k, w, v });
    }
  }
  if (hits.length && !LIST) {
    flagged += hits.length;
    console.log('FLAG ' + slug + ' — ' + hits.length + ' untranslated Latin word(s):');
    for (const h of hits.slice(0, 6)) {
      console.log('   ' + h.k + '  ["' + h.w + '"]');
      console.log('     ' + h.v.slice(0, 84));
    }
  }
}

if (LIST) {
  console.log('distinct non-allowlisted Latin tokens (token × occurrences):');
  for (const [w, n] of [...seen.entries()].sort((a, b) => b[1] - a[1])) console.log('  ' + String(n).padStart(4) + '  ' + w);
}
console.log('---');
console.log('scan_pack_latin_residue: ' + flagged + ' residue(s) across ' + checked
  + ' translated string(s) in non-Latin pack(s).');
process.exit(flagged && !LIST ? 1 : 0);
