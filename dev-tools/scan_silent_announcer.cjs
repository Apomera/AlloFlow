#!/usr/bin/env node
// scan_silent_announcer.cjs — gate for the "announcer that announces nothing" class.
//
// The bug shape, found twice:
//     function announceToSR(msg) { upd('srMsg', msg); }
// The tool builds a polite live region at load and never writes to it, and
// nothing renders `srMsg`, so EVERY screen-reader announcement is discarded.
// lifeskills lost 67 of them (fixed a576162a7); epidemic had the same before it.
//
// ★ Nothing else can catch this. Dead state renders fine, the live region
// genuinely exists so an axe scan PASSES, and every test is written against
// what IS shown. The state write also forces a React re-render per
// announcement, so it costs something in order to do nothing.
//
// ★★ Scope it before reporting it. The original pass flagged 22 tools and ~700
// "lost" announcements; almost all were FALSE. Those tools do
// `var announceToSR = ctx.announceToSR` and use the HOST announcer, which
// works (writes #stem-a11y-live, then clears). An unused local live region is
// untidy, not broken. The real defect is narrower: a tool that defines its OWN
// announcer whose body never touches the DOM and never delegates to ctx.
//
// Promoted to dev-tools 2026-08-11 from a session scratchpad, where it was one
// temp-dir cleanup from being lost — the same "a gate nobody runs is not a
// gate" problem this repo has shipped bugs behind twice.
//
// Usage: node dev-tools/scan_silent_announcer.cjs [--quiet]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
// Optional directory argument so the gate can be pointed at a fixture — a
// scanner that has only ever been run against a clean tree is not known to
// work. Calibrate against the pre-fix lifeskills (a576162a7^) and it must FLAG.
const DIR = args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'stem_lab');

// Brace-match the named function so the check reads its real body rather than
// a fixed window (announcers sit near other helpers).
function bodyOf(src, name) {
  const i = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length && j < i + 4000; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

const broken = [], fine = [], usesHost = [];
for (const f of fs.readdirSync(DIR).filter((n) => /^stem_tool_.*\.js$/.test(n))) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const tool = f.replace('stem_tool_', '').replace('.js', '');

  let localName = null;
  for (const n of ['announceToSR', 'srSay', 'announce']) {
    if (new RegExp('function\\s+' + n + '\\s*\\(').test(src)) { localName = n; break; }
  }
  const callCount = (src.match(/\b(announceToSR|srSay)\s*\(/g) || []).length;
  if (!callCount) continue;
  if (!localName) { usesHost.push({ tool, callCount }); continue; }

  const body = bodyOf(src, localName) || '';
  const touchesDom = /getElementById|textContent|document\./.test(body);
  const delegatesToHost = /ctx\.announceToSR|props\.announceToSR/.test(body);
  if (touchesDom || delegatesToHost) fine.push({ tool, localName });
  else broken.push({ tool, localName, callCount, body: body.replace(/\s+/g, ' ').slice(0, 110) });
}

broken.sort((a, b) => b.callCount - a.callCount);
const lost = broken.reduce((a, b) => a + b.callCount, 0);

if (broken.length) {
  console.log('FLAG — tool defines its own announcer that never reaches the DOM:');
  for (const b of broken) {
    console.log('  ' + b.tool.padEnd(18) + String(b.callCount).padStart(4) + ' announcement(s) discarded  [' + b.localName + ']');
    console.log('        ' + b.body);
  }
  console.log('  Fix: write the live region, and CLEAR IT FIRST on a ~30ms timeout (a screen');
  console.log('  reader will not repeat identical text, so two same messages would speak once).');
  console.log('  Wrap in try/catch: the render smoke harness has no DOM and renderTool()');
  console.log('  swallows throws, so an unguarded announcer blanks the tool in silence.');
}
if (!quiet || broken.length) {
  console.log('---');
  console.log('scan_silent_announcer: ' + broken.length + ' silent tool(s), ' + lost + ' announcement(s) lost; '
    + fine.length + ' working local announcer(s), ' + usesHost.length + ' using the host announcer.');
}
process.exit(broken.length ? 1 : 0);
