// A SEL tool needs THREE registrations to be reachable, and only two were guarded:
//
//   1. sel_hub/sel_tool_<x>.js  — window.SelHub.registerTool('id', {...})
//   2. sel_hub_module.js        — a card { id: 'id', label, desc, ... }
//   3. AlloFlowANTI.txt → desktop/web-app/src/App.jsx — 'sel_hub/sel_tool_<x>.js'
//      inside `var selToolModules`, the manifest __alloEnsureSelPluginsLoaded fetches
//
// (3) is the one the browser depends on. Measured 2026-09-20: the manifest held
// 34 modules against 71 registered tools and 73 cards. The other 39 cards
// rendered in the grid, but their file was never requested, so isRegistered()
// stayed false and openSelToolById() fell to its else branch — "<Tool> is
// loading..." on every click, forever. Among them TIPP (a DBT crisis-survival
// skill) and howlTracker, the tool the Crew/King pilot path was built around.
//
// No existing test could see it: check_sel_render readdirSync's sel_hub/, and
// the Playwright walk addScriptTag's every sel_tool_*.js by hand. Both load
// what the app does not, so 190+ SEL tests passed against unreachable tools.
//
// AlloFlowANTI.txt is the SOURCE (build.js transforms it into App.jsx), so a
// fix applied only to App.jsx is erased by the next build. Both are asserted.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_sel_tool_manifest.cjs');

function runGate(args = []) {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [GATE, ...args], {
        cwd: process.cwd(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
      }),
    };
  } catch (err) {
    if (err.stdout != null) return { code: err.status ?? 1, out: err.stdout };
    throw err;
  }
}

describe('SEL runtime manifest', () => {
  const report = JSON.parse(runGate(['--json']).out);

  it('parses a real manifest, not an empty one', () => {
    // Without this, a parser that silently returns [] would make every
    // assertion below vacuous while reporting a clean bill of health.
    expect(report.manifestCount).toBeGreaterThan(60);
    expect(report.cardCount).toBeGreaterThan(60);
    expect(report.registeredCount).toBeGreaterThan(60);
  });

  it('every carded SEL tool is in the manifest the app loads', () => {
    const detail = report.unreachable
      .map((u) => `${u.id} — ${u.module} is on disk but not in selToolModules`)
      .join('\n');
    expect(report.unreachable, detail).toHaveLength(0);
  });

  it('every manifest entry has a file on disk', () => {
    // A listed module with no file 404s on every hub open.
    expect(report.missingFiles, report.missingFiles.join('\n')).toHaveLength(0);
  });

  it('the gate can actually fail (selftest)', () => {
    // "0 unreachable" must not be achievable by the detector being broken.
    const res = runGate(['--selftest']);
    expect(res.code, res.out).toBe(0);
    expect(res.out).toMatch(/selftest: removing .* is detected/);
  });

  it('the fix is in AlloFlowANTI.txt, not only the generated App.jsx', () => {
    // build.js regenerates App.jsx FROM AlloFlowANTI.txt. A manifest entry that
    // exists only in App.jsx is deleted by the next build, and the tools go
    // quietly unreachable again.
    const SPOT = ['sel_tool_howl.js', 'sel_tool_tipp.js', 'sel_tool_windowoftolerance.js'];
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const src = readFileSync(resolve(process.cwd(), f), 'utf8');
      for (const mod of SPOT) {
        expect(src.includes(mod), `${f} is missing ${mod}`).toBe(true);
      }
    }
  });
});
