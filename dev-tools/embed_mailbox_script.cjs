#!/usr/bin/env node
/**
 * embed_mailbox_script.cjs — re-embed apps_script/session_mailbox/Code.gs into
 * AlloFlowANTI.txt as the ALLO_MB_SCRIPT_SOURCE template literal (idempotent).
 *
 * tests/mailbox_session_bridge.test.js pins the embedded copy byte-identical to
 * Code.gs (three-copy sync). Any Code.gs edit MUST be followed by this tool +
 * `node build.js --mode=prod --force` so the prismflow pair regenerates.
 * Also mirrors Code.gs to desktop/web-app/public/apps_script/session_mailbox/.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ANTI = path.join(ROOT, 'AlloFlowANTI.txt');
const GS = path.join(ROOT, 'apps_script', 'session_mailbox', 'Code.gs');
const GS_PUB = path.join(ROOT, 'desktop/web-app', 'public', 'apps_script', 'session_mailbox', 'Code.gs');

const gs = fs.readFileSync(GS, 'utf8');
let anti = fs.readFileSync(ANTI, 'utf8');

const MARK = 'const ALLO_MB_SCRIPT_SOURCE = `';
const start = anti.indexOf(MARK);
if (start === -1) { console.error('embed_mailbox_script: ALLO_MB_SCRIPT_SOURCE not found in ANTI'); process.exit(1); }
const open = start + MARK.length - 1; // position of the opening backtick
// escape-aware scan for the closing backtick (same walk the test uses)
let close = open + 1;
while (close < anti.length && anti[close] !== '`') close += anti[close] === '\\' ? 2 : 1;
if (close >= anti.length) { console.error('embed_mailbox_script: unterminated embedded literal'); process.exit(1); }

const escaped = gs.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const before = anti.slice(open, close + 1);
const fresh = '`' + escaped + '`';
if (before === fresh) {
  console.log('embed_mailbox_script: already in sync (no change).');
} else {
  anti = anti.slice(0, open) + fresh + anti.slice(close + 1);
  fs.writeFileSync(ANTI, anti);
  console.log('embed_mailbox_script: re-embedded Code.gs (' + gs.length + ' chars) into ANTI.');
}
if (fs.readFileSync(GS_PUB, 'utf8') !== gs) {
  fs.writeFileSync(GS_PUB, gs);
  console.log('embed_mailbox_script: mirrored Code.gs to desktop/web-app/public.');
}

// The src-side ANTI mirror embeds the SAME literal, and mailbox_session_bridge
// asserts byte-identity across every copy. Re-embedding only the root left the
// mirror stale and the three-copy pin red — so do both here rather than leaving
// a hand step that is easy to forget. Splices the one literal; never copies the
// file, because the two ANTIs legitimately differ elsewhere.
// mailbox_session_bridge asserts byte-identity across ALL THREE copies that
// carry the literal — root ANTI, the src ANTI mirror, and the generated
// App.jsx. Re-embedding only the root left the other two stale and the pin red.
// Splice the one literal in each: never copy the files, because they
// legitimately differ elsewhere. App.jsx is generated, so this is idempotent
// with the next real build rather than a substitute for it.
[
  ['desktop/web-app/src/AlloFlowANTI.txt', 'src ANTI mirror'],
  ['desktop/web-app/src/App.jsx', 'generated App.jsx']
].forEach(function (pair) {
  const file = path.join(ROOT, pair[0]);
  const label = pair[1];
  if (!fs.existsSync(file)) return;
  const mirror = fs.readFileSync(file, 'utf8');
  const mStart = mirror.indexOf(MARK);
  if (mStart === -1) {
    console.warn('embed_mailbox_script: WARNING — ALLO_MB_SCRIPT_SOURCE not found in ' + label + '.');
    return;
  }
  const mOpen = mStart + MARK.length - 1;
  let mClose = mOpen + 1;
  while (mClose < mirror.length && mirror[mClose] !== '`') mClose += mirror[mClose] === '\\' ? 2 : 1;
  if (mClose >= mirror.length) {
    console.error('embed_mailbox_script: unterminated embedded literal in ' + label);
    process.exit(1);
  }
  if (mirror.slice(mOpen, mClose + 1) !== fresh) {
    fs.writeFileSync(file, mirror.slice(0, mOpen) + fresh + mirror.slice(mClose + 1));
    console.log('embed_mailbox_script: re-embedded Code.gs into ' + label + '.');
  }
});
console.log('Remember: node build.js --mode=prod --force to regenerate the App.jsx pair.');
