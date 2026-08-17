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
const DEBRIS = '[\\u0080-\\u009F\\u00A7\\u00B0\\u00B3\\u00B8\\u00BA\\u00BC\\u00EF\\u2020\\u2026]+';
const re = () => new RegExp('(' + EMOJI + ')(' + DEBRIS + ')', 'gu');

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
  const hits = [...src.matchAll(re())];
  if (!hits.length) continue;
  totalFiles++; totalHits += hits.length;
  if (fixMode) {
    fs.writeFileSync(full, src.replace(re(), (m, e) => e), 'utf8');
    const remain = [...fs.readFileSync(full, 'utf8').matchAll(re())].length;
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
