#!/usr/bin/env node
// scan_emoji_mojibake.cjs — gate for emoji-trailing mojibake debris.
//
// The corruption shape (found 14× in StoryForge, plus view_math and ui_strings,
// 2026-08-16): a correct emoji, then fragments of its OWN UTF-8 bytes
// re-decoded as Latin-1 — e.g. VS16's bytes EF B8 8F surfacing as ï ¸ plus a
// C1 control. Students saw '🏆†', '🖼️¼ï¸', '🗺️ºï¸' in achievement badges,
// genre pickers, and buttons. It enters through any Latin-1 write of UTF-8
// content (see feedback_latin1_write_truncates_multibyte /
// feedback_powershell_pipe_mangles_files) and then spreads by copy-paste and
// by string-extraction tooling copying values verbatim.
//
// ANCHORED detection: debris counts only when IMMEDIATELY after an emoji-plane
// character or VS16 — ï in "naïve" or … in prose can never match. That anchor
// is what makes this safe to run repo-wide with zero baseline.
//
// Usage:
//   node dev-tools/scan_emoji_mojibake.cjs             # scan default set, exit 1 on findings
//   node dev-tools/scan_emoji_mojibake.cjs --fix       # peel findings to fixed point
//   node dev-tools/scan_emoji_mojibake.cjs <files...>  # explicit file list
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const explicit = args.filter(a => !a.startsWith('--'));

const EMOJI = '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}]\\uFE0F?';
// C1 controls + the Latin-1 debris alphabet observed in the wild: § ° ³ ¸ º ¼ ï † …
// CANDIDATE alphabet: every char whose CP1252 byte is a UTF-8 continuation
// byte (raw C1 + Latin-1 0xA0-0xBF + the CP1252 C1 remap, e.g. 🏃's tail 0x83
// surfacing as ƒ U+0192). Deliberately broad — candidates are then confirmed
// BYTE-EXACTLY below, so '📦± Change Var' (semantic ±) and a Pashto 🧹’
// (prose quote) pass through while real tails flag. History: a raw-C1-only
// alphabet missed ƒ; widening without the byte check flagged 60 false
// positives; the byte confirmation is what makes broad safe. Also ï U+00EF —
// VS16's first tail byte — plus the rest of Latin-1 0xC0+ excluded: lead
// bytes, not continuation bytes.
const DEBRIS = '[\\u0080-\\u00BF\\u20AC\\u201A\\u0192\\u201E\\u2026\\u2020\\u2021\\u02C6\\u2030\\u0160\\u2039\\u0152\\u017D\\u2018\\u2019\\u201C\\u201D\\u2022\\u2013\\u2014\\u02DC\\u2122\\u0161\\u203A\\u0153\\u017E\\u0178\\u00EF]+';
const re = () => new RegExp('(' + EMOJI + ')(' + DEBRIS + ')', 'gu');

// ── Byte-exact confirmation ──────────────────────────────────────────────────
// The alphabet alone still false-positives on legitimate punctuation directly
// after an emoji ('📦± Change Var' is semantic; a Pashto string had 🧹’ with a
// real prose quote). The discriminator that needs no judgment: genuine debris
// chars are the emoji sequence's OWN UTF-8 tail bytes re-decoded as CP1252.
// So: encode the matched emoji (incl. its VS16) to UTF-8, map each debris char
// back to its CP1252 byte, and confirm EVERY debris byte occurs among the
// emoji's continuation bytes. 🏅+… is debris (… = 0x85, 🏅 = F0 9F 8F 85);
// 🧹+’ is prose (’ = 0x92, 🧹 = F0 9F A7 B9 — no 0x92).
const CP1252_REMAP = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
  0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
  0x017E: 0x9E, 0x0178: 0x9F,
};
function cp1252ByteOf(ch) {
  const cp = ch.codePointAt(0);
  if (cp <= 0xFF) return cp;               // Latin-1: byte = codepoint
  return CP1252_REMAP[cp] ?? null;         // remap set, else not encodable
}
function isRealDebris(emoji, debris) {
  const emojiBytes = new Set(Buffer.from(emoji, 'utf8'));
  for (const ch of debris) {
    const b = cp1252ByteOf(ch);
    if (b === null || !emojiBytes.has(b)) return false;
  }
  return true;
}

function defaultFiles() {
  const out = [];
  for (const f of fs.readdirSync(ROOT)) {
    if ((/_source\.jsx$/.test(f) || /_module\.js$/.test(f)) && !/^_build/.test(f)) out.push(f);
  }
  for (const sub of ['stem_lab', 'sel_hub', 'lang']) {
    const d = path.join(ROOT, sub);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) if (/\.js$/.test(f)) out.push(path.join(sub, f));
  }
  out.push('ui_strings.js', 'help_strings.js', 'AlloFlowANTI.txt');
  return out;
}

const files = explicit.length ? explicit : defaultFiles();
let totalHits = 0, totalFiles = 0;
for (const rel of files) {
  const full = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  let src;
  try { src = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }
  const hits = [...src.matchAll(re())].filter(h => isRealDebris(h[1], h[2]));
  if (!hits.length) continue;
  totalFiles++; totalHits += hits.length;
  if (fixMode) {
    // Replace only byte-confirmed runs; punctuation that happens to sit next
    // to an emoji passes through untouched.
    fs.writeFileSync(full, src.replace(re(), (m, e, d) => isRealDebris(e, d) ? e : m), 'utf8');
    const remain = [...fs.readFileSync(full, 'utf8').matchAll(re())].filter(h => isRealDebris(h[1], h[2])).length;
    console.log('  fixed ' + rel + ' (' + hits.length + ' run(s))' + (remain ? '  !! NOT at fixed point' : ''));
  } else {
    for (const h of hits.slice(0, 5)) {
      const line = src.slice(0, h.index).split(/\r?\n/).length;
      console.log('  ' + rel + ':' + line + '  ' + h[1] + ' + ' + [...h[2]].map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' '));
    }
    if (hits.length > 5) console.log('  ' + rel + ': ... ' + (hits.length - 5) + ' more');
  }
}

if (totalHits && !fixMode) {
  console.log('scan_emoji_mojibake: ' + totalHits + ' debris run(s) in ' + totalFiles + ' file(s).');
  console.log('  Fix with --fix (peels the debris, keeps the emoji), then rebuild any');
  console.log('  paired *_module.js and re-sync the desktop/web-app/public mirror.');
  process.exit(1);
}
console.log('scan_emoji_mojibake: ' + (fixMode ? totalHits + ' run(s) fixed in ' + totalFiles + ' file(s).' : 'clean (' + files.length + ' file(s) scanned).'));
process.exit(0);
