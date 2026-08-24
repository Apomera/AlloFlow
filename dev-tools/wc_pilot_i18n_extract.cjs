// Wrap the Water Cycle tool's newer hardcoded English in t() calls, and emit the
// matching ui_strings.js keys.
//
//   node dev-tools/wc_pilot_i18n_extract.cjs --dry     # report only
//   node dev-tools/wc_pilot_i18n_extract.cjs --write   # rewrite + emit keys JSON
//
// DESIGN. The original literal is MOVED into the t() fallback position, never
// retyped:  'Cloud droplet'  ->  t('stem.watercycle.pilot_cloud_droplet', 'Cloud droplet')
// so the shipped English is byte-identical by construction. Extraction is
// mechanical; changing the words is a separate, reviewed change.
//
// It deliberately REFUSES concatenation fragments. A literal with a `+` on
// either side is part of a sentence assembled at runtime, and wrapping the
// pieces individually produces keys no translator can use ("Climb. At ",
// " m the air has cooled...") and word order that is wrong in most languages.
// Those are listed for manual conversion into one key with {tokens}.
//
// ALWAYS --dry FIRST AND READ THE LIST. The already-keyed detector is a
// heuristic and it does not reliably recognise a fallback that sits on a later
// line of a multi-line t() call, so a blind --write re-wraps its own output and
// mints keys whose value is another key. It has done exactly that twice. Treat
// this as a finder, and hand-apply anything it reports beyond the obvious.
'use strict';

const fs = require('fs');
const SRC = 'stem_lab/stem_tool_watercycle.js';
const WRITE = process.argv.includes('--write');

const source = fs.readFileSync(SRC, 'utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
const lines = source.split(/\r?\n/);

// Component-scope regions only. The module-level kernel is handled separately by
// applyPilotCopy(), which re-reads the English out of the data itself.
const REGIONS = [
  ['sect', '          var WC_MODE_TABS = [', '          function renderWcModeBar() {'],
  ['mode', '          function renderWcModeBar() {', '          function startStewardCampaign('],
  ['pilot', '          function wcPilotCanvasRef(canvasEl) {', "          if (wcMode === 'pilot') {"],
];

// Not user-visible: shaders, media queries, font specs, css, tokens.
const SKIP = [
  /^[a-z0-9-]+$/,
  /gl_Position|uniform |varying |void main/,
  /prefers-reduced-motion/,
  /^bold \d+px/,
  /^#[0-9a-f]{3,8}$/i,
  /^[\d.,\s%pxremvhw+*/()-]+$/i,
  /^rgba?\(/i,
];

function slug(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 38)
    .replace(/_+$/, '');
}

const keys = {};
const skipped = [];
const usedKeys = new Set();
let wrapped = 0;

for (const [prefix, startAnchor, endAnchor] of REGIONS) {
  const start = lines.findIndex((l) => l.startsWith(startAnchor));
  if (start === -1) throw new Error(`start anchor missing: ${startAnchor}`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith(endAnchor));
  if (end === -1) throw new Error(`end anchor missing: ${endAnchor}`);

  for (let i = start; i < end; i++) {
    let line = lines[i];
    if (/^\s*(\/\/|\*)/.test(line)) continue;
    if (/className:|addColorStop|createLinearGradient|dataset\.|^\s*,?'\./.test(line)) continue;

    let out = '';
    let cursor = 0;
    const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(line))) {
      const quote = m[0][0];
      const raw = m[1] !== undefined ? m[1] : m[2];
      const decoded = raw.replace(/\\u([0-9a-fA-F]{4})/g, (_x, h) => String.fromCharCode(parseInt(h, 16)));
      const before = line.slice(0, m.index);
      const after = line.slice(m.index + m[0].length);

      const isCopy = decoded.length >= 3
        && !SKIP.some((r) => r.test(decoded))
        && (/\s/.test(decoded) || /[.!?]/.test(decoded) || /^[A-Z]/.test(decoded));
      // Is this literal already inside a t() call?
      //
      // Two earlier attempts were both wrong in instructive ways. A pure
      // look-behind missed the ternary form  t(c ? keyA : keyB, c ? enA : enB).
      // Replacing it with "does the previous line mention a key" made wrapping
      // CONTAGIOUS: wrapping row 1 of an array caused row 2 to be treated as
      // already handled, and two of four mode-bar destinations silently stayed
      // English.
      //
      // The actual question is structural - am I inside an unclosed call that
      // already named a key? - so it is answered by counting parentheses back
      // from the start of the statement.
      const stmtStart = (() => {
        for (let j = i; j >= 0 && j > i - 6; j -= 1) {
          const text = lines.slice(j, i).join('\n') + before;
          const depth = (text.match(/\(/g) || []).length - (text.match(/\)/g) || []).length;
          if (depth <= 0) return text.slice(text.lastIndexOf('\n') + 1);
          if (j === i - 5) return text;
        }
        return before;
      })();
      const openCall = (stmtStart.match(/\(/g) || []).length - (stmtStart.match(/\)/g) || []).length > 0;
      const alreadyKeyed = /\b(?:t|__alloT)\(\s*$/.test(before)
        || /\b(?:t|__alloT)\('[^']*',\s*$/.test(before)
        || before.indexOf('stem.watercycle.') !== -1
        || (openCall && stmtStart.indexOf('stem.watercycle.') !== -1);
      // Part of a runtime-assembled sentence.
      const concatenated = /\+\s*$/.test(before) || /^\s*\+/.test(after);
      // A string being COMPARED is program logic, not copy. Wrapping
      // `geometry.type === 'ConeGeometry'` or `e.key === 'Enter'` silently
      // breaks behaviour the moment a pack translates it - and it looks like a
      // localisation win right up until the control stops responding.
      const compared = /[=!]==?\s*$/.test(before) || /^\s*[=!]==?/.test(after)
        || /\.(?:indexOf|includes|startsWith|endsWith|split|join)\(\s*$/.test(before);

      if (!isCopy || alreadyKeyed || compared) continue;
      if (concatenated) { skipped.push({ line: i + 1, text: decoded, why: 'concatenated' }); continue; }

      let key = prefix + '_' + slug(decoded);
      if (usedKeys.has(key) && keys[key] !== decoded) {
        let n = 2;
        while (usedKeys.has(key + '_' + n)) n += 1;
        key = key + '_' + n;
      }
      usedKeys.add(key);
      keys[key] = decoded;

      out += line.slice(cursor, m.index);
      out += `t('stem.watercycle.${key}', ${quote}${raw}${quote})`;
      cursor = m.index + m[0].length;
      wrapped += 1;
    }
    if (cursor) {
      out += line.slice(cursor);
      lines[i] = out;
    }
  }
}

console.log(`wrapped: ${wrapped}   distinct keys: ${Object.keys(keys).length}`);
console.log(`\nSKIPPED (concatenation fragments needing manual {token} keys): ${skipped.length}`);
for (const s of skipped) console.log(`  ${String(s.line).padStart(6)}  ${JSON.stringify(s.text).slice(0, 110)}`);

if (WRITE) {
  fs.writeFileSync(SRC, lines.join(eol));
  fs.writeFileSync('dev-tools/.cache/wc_pilot_keys.json', JSON.stringify(keys, null, 2));
  console.log(`\nwrote ${SRC} and dev-tools/.cache/wc_pilot_keys.json`);
} else {
  console.log('\nWOULD WRAP:');
  for (const [k, v] of Object.entries(keys)) console.log(`  ${k} :: ${JSON.stringify(v).slice(0, 110)}`);
  console.log('\n(dry run - pass --write to apply)');
}
