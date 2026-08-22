// Runner for dev-tools/scan_dark_mode_contrast.cjs.
//
// This repo's standing problem is gates that exist and nothing runs
// (tests/dev_tools_orphan_gates.test.js documents an audit that found 18 of
// 102 dev-tools scripts with zero callers). This file is that scanner's runner,
// added in the same commit as the scanner so it never joins that list.
//
// WHAT THE SCANNER GUARDS
// AlloFlow's theme is an app setting written as `theme-${theme}` on a div inside
// #root. Tailwind's `dark:` variant is a different mechanism: with no `darkMode`
// key in desktop/web-app/tailwind.config.js, Tailwind 3.4 compiles every `dark:`
// utility into a single `@media (prefers-color-scheme: dark)` block, so it
// follows the user's OPERATING SYSTEM. Measured on the shipped bundle: one such
// block, zero `.dark` class rules. `bg-white dark:bg-slate-800` under a panel's
// `text-white` therefore measured 1.00 contrast with app theme dark + OS light,
// and 14.63 with OS dark -- the header Typography and Voice & Audio panels,
// exactly as reported on 2026-08-16.
//
// THE NEGATIVE CONTROL BELOW IS THE POINT
// The scanner is baselined, so its passing state is "402 known findings, 0 new".
// A scanner that silently stopped matching would also report 0 new. Zero-equals-
// pass has produced false clean audits in this repo before (a no-op
// setLabToolData made stub tools score clean). So the second test writes a
// fixture tree containing one deliberate instance of each rule and asserts the
// scanner goes red on every one.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCANNER = resolve(process.cwd(), 'dev-tools/scan_dark_mode_contrast.cjs');

function run(extraArgs = []) {
  try {
    return { code: 0, out: execFileSync('node', [SCANNER, ...extraArgs], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 180_000,
    }) };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

describe('dark-mode contrast scanner', () => {
  it('reports no NEW theme-blind colour sites', () => {
    const r = run();
    const tail = r.out.split('\n').filter(Boolean).slice(-30).join('\n');
    expect(r.code, 'A new theme-blind colour was added. Pick colours from the app `theme`\n' +
      'value in JS the way the surrounding code does, or accept the site with\n' +
      '`node dev-tools/scan_dark_mode_contrast.cjs --update-baseline` after reading it.\n\n' + tail).toBe(0);
  }, 200_000);

  it('still counts the sites it is meant to be watching', () => {
    // Guards against the scanner degrading into a no-op: if a regex breaks, this
    // drops toward zero while the test above stays green.
    // Floor history: 300 when the baseline was 402 (pre variant-layer apply).
    // 2026-08-16: applying the v3 generated theme layer legitimately covered most
    // STATE-LIGHT-BG hover sites, dropping the honest count to 128 — that drop is
    // the fix landing, not a broken regex. Floor re-set below the new true count.
    const r = run(['--quiet']);
    const m = r.out.match(/(\d+) findings \((\d+) baselined/);
    expect(m, r.out).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThan(80);
  }, 200_000);

  it('goes red on a deliberately introduced violation of every rule', () => {
    const dir = mkdtempSync(join(tmpdir(), 'allo-dmc-'));
    try {
      // Empty baseline, so every fixture finding counts as new.
      writeFileSync(join(dir, 'dark_mode_contrast_baseline.json'), JSON.stringify({ note: 'fixture', accepted: {} }));
      writeFileSync(join(dir, 'AlloFlowANTI.txt'), '');
      writeFileSync(join(dir, 'probe.fixture.jsx'), `
const _p = (node) => window.ReactDOM.createPortal(node, document.body);
function Broken() {
  return _p(
    <div className="fixed p-4 bg-white dark:bg-slate-800 text-slate-800">
      <span className="text-white">half pair, light fg, no bg</span>
      <button className="rounded px-2 hover:bg-slate-100">hover-only light surface</button>
      <div style={{ background: '#ffffff', color: 'var(--allo-text)' }}>literal vs var</div>
      <style>{\`
        .allo-probe-card { padding: 4px; }
        .theme-dark .allo-probe-only { color: #ffffff; background: #111111; }
        .allo-probe-mix { color: #ffffff; background: var(--allo-surface); }
      \`}</style>
    </div>
  );
}
`);
      const r = run(['--root=' + dir]);
      expect(r.code, 'the scanner did NOT flag a tree built entirely out of the shapes it exists to find:\n' + r.out).toBe(1);
      for (const rule of ['DARK-VARIANT-PAIRED', 'STATE-LIGHT-BG', 'HALF-PAIR-FG',
        'PORTAL-ESCAPE', 'STYLE-LITERAL-VS-VAR', 'CSS-LITERAL-VS-VAR', 'DARK-ONLY-DEF']) {
        expect(r.out, `rule ${rule} did not fire on its own fixture`).toContain(rule);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 200_000);
});
