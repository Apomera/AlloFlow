// SEL Hub — content that ships, parses, and can never be reached.
//
// A 2026-08-25 sweep found 652 module-scope content declarations across 11 SEL
// tools — about 5 MB — that nothing in the repo reads. Some is generated filler;
// some is the strongest clinical writing in the hub (mindfulness
// TRAUMA_ADAPTATIONS, zones ZONE_COREGULATION, howl CONFERENCE_SCRIPTS). Every
// byte is downloaded and parsed on every tool open and no student can reach a
// word of it.
//
// Deciding wire-vs-delete on that content is the maintainer's call, so the debt is
// BASELINED. This runner exists because a gate with no runner is not a gate — the
// repo has ~18 of those. It fails only when the debt GROWS.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const GATE = resolve(ROOT, 'dev-tools/check_sel_dead_content.cjs');
const BASELINE = resolve(ROOT, 'dev-tools/sel_dead_content_baseline.json');

function runGate(args = []) {
  try {
    return { code: 0, out: execFileSync('node', [GATE, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

describe('SEL Hub · never-read content does not grow', () => {
  it('the gate and its baseline are present', () => {
    expect(existsSync(GATE), 'check_sel_dead_content.cjs is missing').toBe(true);
    expect(existsSync(BASELINE), 'the ratchet baseline is missing').toBe(true);
  });

  it('the baseline records the debt it is holding', () => {
    const b = JSON.parse(readFileSync(BASELINE, 'utf8'));
    expect(b.totalDeclarations, 'baseline records no declarations — it would police nothing').toBeGreaterThan(0);
    expect(b.scannedFiles, 'baseline scanned no files').toBeGreaterThan(50);
    expect(Object.keys(b.entries || {}).length).toBeGreaterThan(0);
  });

  it('passes: no new or grown never-read content', () => {
    const { code, out } = runGate(['--quiet']);
    expect(out.includes('FAIL') ? out : code, out.slice(0, 1500)).toBe(0);
  });

  it('the scanner reports a real file count (a gate that scans nothing must not read as clean)', () => {
    const { out } = runGate([]);
    const m = out.match(/scanned (\d+) file\(s\)/);
    expect(m, 'the gate does not report how many files it scanned').toBeTruthy();
    expect(Number(m[1]), 'scanned suspiciously few files').toBeGreaterThan(50);
  });
});
