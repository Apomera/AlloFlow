#!/usr/bin/env node
/*
 * check_reactive_viewport_reads.cjs — guard against stale viewport reads.
 *
 * WHY: `sel_hub_module.js`'s standard tool shell hid two header pills with a
 * RAW `window.innerWidth` read evaluated during render:
 *
 *     !(typeof window !== 'undefined' && window.innerWidth < 720) && pill(...)
 *
 * React does not re-render when innerWidth changes. The hub already tracked
 * width reactively (`viewportWidth` state + resize listener + `isCompact`) and
 * every other responsive decision used it — these were the only raw reads, so
 * on a rotate or resize the header reflowed while those two pills kept their
 * mount-time state. Fixed 2026-09-14 by threading `ctx.isCompact`.
 *
 * A full sweep of sel_hub/ + stem_lab/ (25 reads) found this was the ONLY
 * genuine instance. Every other read is legitimate, and this gate is written to
 * keep it that way without flagging them:
 *
 *   - resize / orientationchange handlers ....... that IS the update path
 *   - useState initialisers .................... seeds state a listener maintains
 *   - useEffect bodies / event callbacks ....... run after layout, not in render
 *   - imperative canvas & renderer sizing ...... no React render involved
 *   - a guarded fallback behind reactive state . e.g. `state.opViewportWidth ||`
 *   - `<details open={...}>` initial state ..... the user then controls it
 *   - device detection (userAgent + touch) ..... not a layout decision
 *
 * What it flags: a read whose value feeds a RENDER-TIME branch with no reactive
 * state behind it — the shape that shipped the bug.
 *
 * Usage:  node dev-tools/check_reactive_viewport_reads.cjs [--quiet] [--json]
 * Exit:   non-zero if a new stale render-time read appears.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const QUIET = process.argv.includes('--quiet');
const AS_JSON = process.argv.includes('--json');
const DIRS = ['sel_hub', 'stem_lab'];
const PROP = /window\.(innerWidth|innerHeight)/;

// Reviewed exemptions. Each is a real read that is NOT a stale render branch,
// where no syntactic rule above catches it reliably. Keep the reason with the
// entry; an entry that no longer matches a viewport read is reported as stale.
const ALLOWLIST = [
  {
    file: 'stem_lab/stem_tool_flightsim.js',
    match: 'var narrowScreen = typeof window',
    reason: 'Runs in an event handler; seeds railCollapsed as a DEFAULT the student can override, documented in place.',
  },
];

// Legitimate shapes, judged from the lines leading up to the read.
function classify(lineText, before, nearby) {
  const recent = before.slice(-6).join('\n');
  const wide = before.slice(-14).join('\n');

  // A mention inside a comment is documentation, not a read.
  const code = lineText.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/^\s*(\/\/|\*|\/\*)/.test(lineText) || !PROP.test(code)) return 'comment';

  // Imperative writes: assigning a style/CSS var is not a React render branch.
  if (/\.style\.\w+\s*=|setProperty\(\s*['"]--/.test(lineText)) return 'imperative-sizing';

  // ctx-first / state-first fallback — exactly the pattern this gate wants.
  if (/(ctx|props|state)\.\w+\s*\|\|/.test(lineText)) return 'guarded-fallback';

  // visualViewport trackers keep a CSS var in sync; they are update paths.
  if (/visualViewport/.test(nearby)) return 'viewport-tracker';

  // A read inside a function declared above is a callback body, not a render
  // branch. Uses the full lookback: galaxy's `galaxyFsFitViewport()` opens six
  // lines before its read, past a narrower window.
  if (/function\s*\w*\s*\([^)]*\)\s*\{/.test(wide)) return 'callback-body';

  if (/addEventListener\(\s*['"](resize|orientationchange)/.test(wide)) return 'resize-handler';
  if (/function\s+(onResize|handleResize|syncViewport)|(onResize|syncViewport)\s*\(\)\s*\{/.test(wide)) return 'resize-handler';
  if (/useState\(/.test(lineText) || /useState\(\s*function/.test(recent)) return 'state-init';
  if (/useEffect\(/.test(recent)) return 'effect';
  if (/(canvas|renderer|setSize|clientWidth|getBoundingClientRect|devicePixelRatio)/i.test(nearby)) return 'imperative-sizing';
  if (/(changedTouches|clientX|clientY|pointer|onClick|onPointer|addEventListener)/i.test(nearby)) return 'event-callback';
  if (/navigator\.userAgent|ontouchstart/.test(lineText)) return 'device-detection';
  // A raw read used only when reactive state is absent is the sanctioned fallback.
  if (/(typeof ctx\.isCompact|state\s*&&\s*state\.\w*[Vv]iewport|!viewport|\|\|\s*1024|\|\|\s*1100)/.test(nearby)) return 'guarded-fallback';
  // <details open={...}> seeds a control the user then owns.
  if (/\bopen\s*:/.test(lineText)) return 'initial-disclosure-state';
  return 'STALE-RENDER-READ';
}

const findings = [];
const used = new Set();
let scanned = 0;

for (const dir of DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const name of fs.readdirSync(abs).filter((n) => n.endsWith('.js'))) {
    const rel = `${dir}/${name}`;
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!PROP.test(line)) return;
      scanned += 1;
      const before = lines.slice(Math.max(0, i - 14), i);
      const nearby = lines.slice(Math.max(0, i - 3), i + 3).join(' ').replace(/\s+/g, ' ');
      const kind = classify(line, before, nearby);
      if (kind !== 'STALE-RENDER-READ') return;
      const exempt = ALLOWLIST.find((a) => a.file === rel && line.includes(a.match));
      if (exempt) { used.add(exempt); return; }
      findings.push({ file: rel, line: i + 1, snippet: line.trim().slice(0, 150) });
    });
  }
}

if (AS_JSON) {
  console.log(JSON.stringify({ scanned, findings }, null, 2));
} else {
  for (const f of findings) {
    console.log(`[STALE-RENDER-READ] ${f.file}:${f.line}`);
    console.log(`    ${f.snippet}`);
    console.log('    A render-time viewport read does not re-run on resize. Use reactive');
    console.log('    state (ctx.isCompact for SEL tools, a synced state field in STEM), or');
    console.log('    move the read into a resize handler / effect.');
    console.log();
  }
  const stale = ALLOWLIST.filter((a) => !used.has(a));
  for (const a of stale) {
    console.log(`[STALE-ALLOWLIST] ${a.file} — "${a.match}" no longer matches a viewport read; drop the entry.`);
  }
  if (!QUIET) {
    console.log(`viewport reads scanned: ${scanned}`);
    console.log(`reviewed exemptions   : ${used.size}/${ALLOWLIST.length}`);
  }
  if (findings.length === 0) {
    console.log(`✓ check_reactive_viewport_reads: no stale render-time viewport reads (${scanned} reads scanned).`);
  } else {
    console.log(`✗ check_reactive_viewport_reads: ${findings.length} stale render-time read(s).`);
  }
}

process.exit(findings.length || ALLOWLIST.some((a) => !used.has(a)) ? 1 : 0);
