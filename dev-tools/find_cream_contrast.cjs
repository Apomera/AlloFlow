#!/usr/bin/env node
// find_cream_contrast.cjs — detector for the light-mode contrast bug where a
// hardcoded light/cream TEXT color (#fef3c7 etc.) sits on a THEME-FLIPPING
// background (var(--allo-stem-canvas) or a low-alpha translucent tint), so it
// becomes invisible in light mode. Cream on a hardcoded-DARK background, or as an
// SVG fill: on a dark canvas, is CORRECT — those are false positives and must be
// left alone.
//
// For each `color: '#<cream>'` (HTML text only, not fill:), it walks BACKWARD to
// the nearest enclosing `background:` and classifies:
//   FLIP  → var(--allo-stem-canvas) / low-alpha rgba / light hex  → fix candidate
//   DARK  → dark hex / high-alpha rgba                            → leave
//   NONE  → no background found nearby                            → leave (unsure)
// Usage: node dev-tools/find_cream_contrast.cjs [--fix] [tool ...]
'use strict';
const fs = require('fs');
const path = require('path');

const CREAMS = ['fef3c7', 'fde68a', 'fef9c3', 'fffbeb', 'fefce8', 'fcd34d', 'fde047'];
const creamRe = new RegExp("color: ?'#(" + CREAMS.join('|') + ")'", '');
const LOOKBACK = 60;

function classifyBg(bgVal) {
  // Ambiguous → never auto-fix (gradients go dark→light; ternaries are conditional;
  // hardcoded-light bg needs FIXED-dark text, not a theme var that flips).
  if (/gradient\(/.test(bgVal)) return 'REVIEW';
  if (/\?[^:]*:/.test(bgVal)) return 'REVIEW';
  // Genuinely theme-flipping, where var(--allo-stem-text) is the right fix:
  if (/^(['"]?)var\(--allo-stem-(canvas|panel|surface|card)/.test(bgVal)) return 'FLIP';
  const rgba = bgVal.match(/^['"]?rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([01]?\.?\d+))?/);
  if (rgba) {
    const r = +rgba[1], g = +rgba[2], b = +rgba[3], a = rgba[4] === undefined ? 1 : parseFloat(rgba[4]);
    const lum = (r + g + b) / 3;
    if (a <= 0.22) return 'FLIP';   // translucent tint → effective bg is the (flipping) app bg
    if (lum < 70) return 'DARK';    // opaque dark fill → cream is correct, leave
    return 'REVIEW';                // opaque light/mid fill → needs fixed-dark text, not var
  }
  if (/^['"]?#[0-3][0-9a-f]{2,5}\b/i.test(bgVal)) return 'DARK';   // hardcoded dark hex → leave
  return 'REVIEW';                  // light hex / transparent / unknown → manual
}

function nearestBg(lines, idx) {
  for (let j = idx; j >= Math.max(0, idx - LOOKBACK); j--) {
    // Capture the full background value: quoted string, var(), rgba(), or bare token.
    const bm = lines[j].match(/background: ?('[^']*'|"[^"]*"|var\([^)]*\)|rgba?\([^)]*\)|linear-gradient\([^)]*\)|[^,}]+)/);
    if (bm) return { line: j + 1, val: bm[1].trim() };
  }
  return null;
}

const fix = process.argv.includes('--fix');
const onlyTools = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dir = 'stem_lab';
let files = fs.readdirSync(dir).filter((f) => /^stem_tool_.*\.js$/.test(f) && !f.endsWith('.bak'));
if (onlyTools.length) files = files.filter((f) => onlyTools.some((t) => f.includes(t)));

let totFlip = 0, totDark = 0, totUnknown = 0;
const fixPlan = {};
for (const f of files) {
  const fp = path.join(dir, f);
  const lines = fs.readFileSync(fp, 'utf8').split('\n');
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    if (!creamRe.test(lines[i])) continue;
    if (/fill: ?'#/.test(lines[i])) continue; // SVG fill — skip
    const bg = nearestBg(lines, i);
    const cls = bg ? classifyBg(bg.val) : 'NONE';
    rows.push({ line: i + 1, cls, bg: bg ? bg.val.slice(0, 42) : '(none)' });
    if (cls === 'FLIP') { totFlip++; (fixPlan[f] = fixPlan[f] || []).push(i); }
    else if (cls === 'DARK') totDark++;
    else totUnknown++;
  }
  if (rows.length) {
    const flip = rows.filter((r) => r.cls === 'FLIP').length;
    console.log('\n' + f.replace(/^stem_tool_|\.js$/g, '') + '  (FLIP=' + flip + ' DARK=' + rows.filter((r) => r.cls === 'DARK').length + ' other=' + rows.filter((r) => r.cls !== 'FLIP' && r.cls !== 'DARK').length + ')');
    for (const r of rows) console.log('   ' + r.cls.padEnd(7) + ' L' + r.line + '  bg=' + r.bg);
  }
}
console.log('\n==== TOTALS:  FLIP(fix)=' + totFlip + '  DARK(leave)=' + totDark + '  UNKNOWN(leave)=' + totUnknown + ' ====');

if (fix) {
  let n = 0;
  for (const f of Object.keys(fixPlan)) {
    const fp = path.join(dir, f);
    let lines = fs.readFileSync(fp, 'utf8').split('\n');
    for (const i of fixPlan[f]) {
      lines[i] = lines[i].replace(new RegExp("color: ?'#(" + CREAMS.join('|') + ")'", 'g'), "color: 'var(--allo-stem-text, #$1)'");
      n++;
    }
    fs.writeFileSync(fp, lines.join('\n'));
  }
  console.log('Applied theme-aware fix to ' + n + ' FLIP instances.');
}
