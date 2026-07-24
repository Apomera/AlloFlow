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
console.log('Remember: node build.js --mode=prod --force to regenerate the App.jsx pair.');
