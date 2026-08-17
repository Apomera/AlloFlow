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
// ★★★ 2026-08-16 — it HAD become that gate, three times over. It had no runner
// (absent from package.json, deploy.sh, and .github), its file glob was
// `^stem_tool_*.js` under stem_lab/ so every non-STEM tool was invisible, and
// it recognised an announcer only if it was literally named announceToSR /
// srSay / announce. The codebase has 35 announcers; this gate could see NONE
// of them — 21 sit inside stem_lab/, i.e. files it did glob, under names like
// rhAnnounce and klAnnounce. It reported "0 silent tool(s)" and would have
// reported that no matter what regressed. Widened below: discover announcers
// by name SHAPE, scan every tool root, and classify the two shapes that made
// the naive widening produce 4/4 false positives (see BUILDER / DELEGATES).
//
// Usage: node dev-tools/scan_silent_announcer.cjs [dir] [--quiet]

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
// Optional directory argument so the gate can be pointed at a fixture — a
// scanner that has only ever been run against a clean tree is not known to
// work. Calibrate against the pre-fix lifeskills (a576162a7^) and it must FLAG.
const DIR = args.find((a) => !a.startsWith('--')) || null;

// Every surface that ships a tool, not just stem_lab. A named dir still wins so
// the gate stays calibratable against a pre-fix fixture.
function collectFiles() {
  if (DIR) {
    return fs.readdirSync(DIR)
      .filter((n) => /\.jsx?$/.test(n))
      .map((n) => ({ label: n.replace(/^stem_tool_/, '').replace(/\.jsx?$/, ''), full: path.join(DIR, n) }));
  }
  const out = [];
  for (const sub of ['stem_lab', 'sel_hub']) {
    const d = path.join(ROOT, sub);
    if (!fs.existsSync(d)) continue;
    for (const n of fs.readdirSync(d).filter((x) => /^(stem|sel)_tool_.*\.js$/.test(x))) {
      out.push({ label: n.replace(/^(stem|sel)_tool_/, '').replace('.js', ''), full: path.join(d, n) });
    }
  }
  // Root-level tool modules — StoryForge, LitLab, PoetTree, MathFluency, the
  // walkthrough copilot and friends all live here and were never scanned.
  for (const n of fs.readdirSync(ROOT).filter((x) => /_module\.js$/.test(x) && !/^(view_|_build)/.test(x))) {
    out.push({ label: n.replace('_module.js', ''), full: path.join(ROOT, n) });
  }
  return out;
}

// Brace-match the named function so the check reads its real body rather than
// a fixed window (announcers sit near other helpers).
function bodyOf(src, name) {
  const i = src.search(new RegExp('function\\s+' + name.replace(/\$/g, '\\$') + '\\s*\\('));
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length && j < i + 4000; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

const broken = [], fine = [], usesHost = [], skipped = [];
for (const { label: tool, full } of collectFiles()) {
  let src;
  try { src = fs.readFileSync(full, 'utf8'); } catch (_) { continue; }

  // Discover by SHAPE, not by allowlist. Every real announcer in this repo is
  // `function <prefix>Announce<suffix>(` — sfAnnounce, rhAnnounce, klAnnounce,
  // _mfAnnounce, frAnnounceUrgent. The old three-name allowlist matched none.
  const names = [];
  const declRe = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = declRe.exec(src))) {
    const n = m[1];
    if ((/announce/i.test(n) || n === 'srSay') && !names.includes(n)) names.push(n);
  }

  const hostCalls = (src.match(/\b(ctx|props)\.(announceToSR|srSay)\s*\(/g) || []).length;
  if (!names.length) {
    if (hostCalls) usesHost.push({ tool, callCount: hostCalls });
    continue;
  }

  for (const localName of names) {
    const decl = bodyOf(src, localName) || '';
    // ★★★ Strip the signature before testing. bodyOf() slices from `function
    // <name>(`, so the text it returns CONTAINS the declaration — and a
    // delegation test like /\bannounceToSR\s*\(/ then matches the announcer's
    // OWN name and pronounces it healthy. That self-match made this gate pass
    // the pre-fix lifeskills fixture (a576162a7^), the one bug it was written
    // to catch. Everything below must read the braces only.
    const body = decl.slice(Math.max(0, decl.indexOf('{')));
    const callCount = (src.match(new RegExp('\\b' + localName.replace(/\$/g, '\\$') + '\\s*\\(', 'g')) || []).length - 1;
    // Never called — an unused helper discards nothing.
    if (callCount < 1) { skipped.push({ tool, localName, why: 'unused' }); continue; }

    const touchesDom = /getElementById|textContent|innerText|document\.|setAttribute|liveRegion|ariaLive/i.test(body);

    // ★ BUILDER — returns its text instead of speaking it. fpAnnounceText and
    // composeAnnouncement build a string; typingPracticeMistakeAnnouncement
    // returns {shouldAnnounce,message,next}. The CALLER announces. Flagging
    // these was 3 of the 4 false positives a naive widening produced.
    if (!touchesDom && /\breturn\s+[^;\s}]/.test(body)) { skipped.push({ tool, localName, why: 'builder' }); continue; }

    // ★ Delegation is not always a member expression. Widening the file set
    // surfaced three more shapes, all of which reach a real live region and all
    // of which a `ctx.|props.` test calls silent:
    //   • bare `announceToSR(...)` — the host global (anatomy, artstudio)
    //   • `window.alloAnnounce(...)` — AlloFlowANTI.txt:15236 (research lanes)
    //   • `addToast(...)` — toasts render aria-live polite/assertive, :46666
    const delegatesToHost = /ctx\.|props\.|window\.\w*[Aa]nnounce|\b(announceToSR|srSay|alloAnnounce|addToast)\s*\(/.test(body);
    // ★ DELEGATES — a throttle/dedupe wrapper around a sibling announcer that
    // does reach the DOM. roadready's tryAnnounce calls rrAnnounce; it is not
    // silent. This was the 4th false positive.
    const delegatesToSibling = names.some((other) => other !== localName
      && new RegExp('\\b' + other.replace(/\$/g, '\\$') + '\\s*\\(').test(body));

    if (touchesDom || delegatesToHost || delegatesToSibling) fine.push({ tool, localName, callCount });
    else broken.push({ tool, localName, callCount, body: body.replace(/\s+/g, ' ').slice(0, 110) });
  }
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
    + fine.length + ' working local announcer(s), ' + usesHost.length + ' using the host announcer, '
    + skipped.length + ' skipped (' + skipped.filter((s) => s.why === 'builder').length + ' builder, '
    + skipped.filter((s) => s.why === 'unused').length + ' unused).');
}
process.exit(broken.length ? 1 : 0);
