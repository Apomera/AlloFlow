// A STEM tool needs THREE registrations to be reachable, and only two were guarded.
//
//   1. stem_lab/stem_tool_<x>.js — StemLab.registerTool('id', {...})
//   2. stem_lab_module.js        — a tile in `var _allStemTools`
//   3. AlloFlowANTI.txt          — 'stem_lab/stem_tool_<x>.js' in `var stemToolModules`
//
// check_stem_tile_catalog guards (1) <-> (2). (3) is what the browser depends on:
// __alloEnsureStemPluginLoaded resolves a tool id against that manifest, so a
// module missing from it can never be fetched however the tool is launched.
//
// The identical gap in SEL left 39 carded tools unopenable (commit 1d424a800).
// STEM's tiled tools are all present; this keeps it that way, and also checks
// the deep-link map, where the sweep did find two holes (forge, timelineStudio
// — allowlisted in the gate, reported every run).

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const GATE = resolve(process.cwd(), 'dev-tools/check_stem_tool_manifest.cjs');

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

describe('STEM runtime manifest', () => {
  const report = JSON.parse(runGate(['--json']).out);

  it('parses all three registrations, not an empty set', () => {
    // Vacuity guard. Every assertion below is "nothing is missing", which a
    // parser returning nothing would satisfy perfectly. The gate itself exits 2
    // on an implausible parse; this pins the same floors from the outside.
    expect(report.manifestCount).toBeGreaterThan(100);
    expect(report.tileCount).toBeGreaterThan(100);
    expect(report.deepLinkCount).toBeGreaterThan(100);
    expect(report.registeredCount).toBeGreaterThan(100);
  });

  it('every tiled or deep-linked tool is in the manifest the app fetches', () => {
    const detail = report.findings
      .map((f) => `${f.id} (${f.route}) — ${f.module} is not in stemToolModules`)
      .join('\n');
    expect(report.findings, detail).toHaveLength(0);
  });

  it('every manifest entry has a file on disk', () => {
    expect(report.missingFiles, report.missingFiles.join('\n')).toHaveLength(0);
  });

  it('the gate can actually fail (selftest)', () => {
    // "0 unreachable" must not be reachable by the detector being broken. My
    // first parser silently found 0 tiles and 0 deep links — the second of which
    // would have hidden the only real finding.
    const res = runGate(['--selftest']);
    expect(res.code, res.out).toBe(0);
    expect(res.out).toMatch(/selftest: removing .* is detected/);
  });

  it('known-unreachable tools stay visible rather than silently allowlisted', () => {
    // forge and timelineStudio are deep-linkable with no loadable module: the
    // URL resolves the name and then loads nothing. That is a decision pending,
    // not a regression — but a dead end nobody is reminded of becomes permanent.
    const plain = runGate([]).out;
    expect(plain).toMatch(/Known-unreachable/);
    for (const id of report.known.map((k) => k.id)) {
      expect(plain, `${id} should be named in the report`).toContain(id);
    }
  });
});
