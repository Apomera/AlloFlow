#!/usr/bin/env node
// scan_pack_script_bleed.cjs — catch a writing system leaking into the wrong pack.
//
//   node dev-tools/scan_pack_script_bleed.cjs [--section a11y] [--prefix storyforge_]
//
// ★ The bug this exists for, caught by hand once and therefore certain to happen
//   again unattended: while hand-translating 60 packs in one sitting, a
//   character from the language you just finished lands in the next one. The
//   real hit was a Chinese 预 inside a Russian string —
//       "Потяните за угол预 просмотра"
//   Nothing else in the toolchain can see it. It is valid JSON, valid UTF-8,
//   the key count is right, placeholders survive, DNT terms survive, and the
//   pack loads and renders. It is simply wrong, and only a reader of that
//   language would ever notice.
//
// The check: every pack declares which Unicode scripts it may contain. Any
// character from a script NOT on that list, and not on the universal allowlist
// (Latin — brand names and Ctrl/Cmd survive everywhere — digits, punctuation,
// emoji, symbols), is reported with its key and a caret at the offending index.
//
// ★★ Latin is allowed everywhere on purpose. StoryForge / AlloHaven / Portfolio
//   / Story Forge are do-not-translate, ".storyforge" is a file extension, and
//   Ctrl/Cmd+Z is a literal key combination. A gate that flagged those would
//   cry wolf on all 63 packs and get switched off.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const SECTION = flag('section', 'a11y');
const PREFIX = flag('prefix', 'storyforge_');

// Scripts each pack is allowed to use, beyond the universal allowlist below.
// A pack absent from this map is checked against Latin only.
const SCRIPTS = {
  arabic: ['Arabic'], farsi: ['Arabic'], dari: ['Arabic'], pashto: ['Arabic'], urdu: ['Arabic'],
  hebrew: ['Hebrew'],
  russian: ['Cyrillic'], ukrainian: ['Cyrillic'],
  greek: ['Greek'],
  chinese_simplified: ['Han'], chinese_traditional: ['Han'],
  japanese: ['Han', 'Hiragana', 'Katakana'],
  korean: ['Hangul'],
  thai: ['Thai'], lao: ['Lao'], khmer: ['Khmer'], burmese: ['Myanmar'],
  hindi: ['Devanagari'], marathi: ['Devanagari'], nepali: ['Devanagari'],
  bengali: ['Bengali'], punjabi: ['Gurmukhi'], gujarati: ['Gujarati'],
  tamil: ['Tamil'], telugu: ['Telugu'], kannada: ['Kannada'], malayalam: ['Malayalam'],
  amharic: ['Ethiopic'], tigrinya: ['Ethiopic'],
  karen: ['Myanmar'], chin_falam: [], chin_hakha: [],
};

const RE = {
  Arabic: /\p{Script=Arabic}/u, Hebrew: /\p{Script=Hebrew}/u, Cyrillic: /\p{Script=Cyrillic}/u,
  Greek: /\p{Script=Greek}/u, Han: /\p{Script=Han}/u, Hiragana: /\p{Script=Hiragana}/u,
  Katakana: /\p{Script=Katakana}/u, Hangul: /\p{Script=Hangul}/u, Thai: /\p{Script=Thai}/u,
  Lao: /\p{Script=Lao}/u, Khmer: /\p{Script=Khmer}/u, Myanmar: /\p{Script=Myanmar}/u,
  Devanagari: /\p{Script=Devanagari}/u, Bengali: /\p{Script=Bengali}/u,
  Gurmukhi: /\p{Script=Gurmukhi}/u, Gujarati: /\p{Script=Gujarati}/u, Tamil: /\p{Script=Tamil}/u,
  Telugu: /\p{Script=Telugu}/u, Kannada: /\p{Script=Kannada}/u, Malayalam: /\p{Script=Malayalam}/u,
  Ethiopic: /\p{Script=Ethiopic}/u,
};
const ALL = Object.keys(RE);
// Latin, digits, marks, punctuation, separators, symbols, emoji — legal in every pack.
const UNIVERSAL = /[\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u;

let flagged = 0, checked = 0;
const packs = fs.readdirSync(path.join(ROOT, 'lang')).filter((f) => f.endsWith('.js')).sort();
for (const file of packs) {
  const slug = file.replace('.js', '');
  let pack;
  try { pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'lang', file), 'utf8')); } catch (_) { continue; }
  const sec = pack[SECTION];
  if (!sec) continue;
  const keys = Object.keys(sec).filter((k) => k.startsWith(PREFIX));
  if (!keys.length) continue;

  const allowed = SCRIPTS[slug] || [];
  const forbidden = ALL.filter((s) => !allowed.includes(s));
  const hits = [];
  for (const k of keys) {
    const v = sec[k];
    if (typeof v !== 'string') continue;
    checked++;
    // ★★★ U+FFFD is a decode failure that already happened — a character that
    //   was lost before it ever reached the file. It slips past every other
    //   check: the string is the right length, in the right script, with no
    //   Latin residue, so only a reader of that language would see the hole.
    //   Real hit: Punjabi "<U+FFFD>ਮੂਨਾ ਕਹਾਣੀ" where "ਨਮੂਨਾ" (sample) lost its
    //   first letter. Control characters are grouped here for the same reason.
    const badChar = v.match(/[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F]/);
    if (badChar) {
      hits.push({ k, ch: badChar[0], i: badChar.index, v,
        bad: badChar[0] === '\uFFFD' ? 'U+FFFD replacement' : 'control char' });
      continue;
    }
    for (let i = 0; i < v.length; i++) {
      const ch = v[i];
      if (UNIVERSAL.test(ch)) continue;
      const bad = forbidden.find((s) => RE[s].test(ch));
      if (bad) { hits.push({ k, ch, i, v, bad }); break; }
    }
  }
  if (hits.length) {
    flagged += hits.length;
    console.log('FLAG ' + slug + ' — ' + hits.length + ' string(s) contain a foreign script:');
    for (const h of hits.slice(0, 6)) {
      console.log('   ' + h.k + '  [' + h.bad + ' "' + h.ch + '" at ' + h.i + ']');
      console.log('     ' + h.v.slice(Math.max(0, h.i - 28), h.i + 28));
    }
  }
}
console.log('---');
console.log('scan_pack_script_bleed: ' + flagged + ' bleed(s) across ' + checked + ' translated string(s) in '
  + packs.length + ' pack(s).');
process.exit(flagged ? 1 : 0);
