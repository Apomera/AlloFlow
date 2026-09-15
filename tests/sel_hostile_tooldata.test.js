// A malformed saved project file must not crash a SEL tool.
//
// A save file is INPUT: a student can copy it between devices, hand-edit it, or
// carry it across tool versions. On 2026-09-15 a sweep found **34 of 68 SEL
// tools crashed** on one — 100 distinct crashes. The equivalent STEM figure was
// 4%, so this was an order of magnitude worse, and the data is more sensitive:
// the file may hold a safety plan.
//
// Every crash reduced to the same defect — a guard that checks TRUTHINESS when
// it should check TYPE:
//
//     d.connections || []      // "abc" is truthy -> passes -> .forEach throws
//     d.name || '(your name)'  // an object is truthy -> React refuses to render
//     d.pillarIdx || 0         // "abc" is truthy -> ARRAY["abc"] is undefined
//
// Seven fix waves took it to zero. This keeps it there.
//
// NOTE ON TRUST: the gate carries a `--selftest` canary, and this suite runs it.
// A sweep that reports "clean" because it silently stopped exercising anything
// is the exact failure mode its own notes record three times over — so "0
// crashes" is only meaningful alongside proof the detector still bites.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const GATE = resolve(process.cwd(), 'dev-tools/check_sel_hostile_tooldata.cjs');

function run(args = []) {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [GATE, ...args], {
        cwd: process.cwd(), encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024, timeout: 900000,
      }),
    };
  } catch (err) {
    return { code: err.status ?? 1, out: `${err.stdout || ''}${err.stderr || ''}` };
  }
}

describe('SEL hostile toolData', () => {
  const result = run();

  it('actually exercises the tool set', () => {
    // Guards against a silent collapse making the pass below vacuous.
    const m = /(\d+) tools exercised/.exec(result.out);
    expect(m, result.out.slice(0, 600)).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThan(60);
  });

  it('no SEL tool crashes on a malformed save file', () => {
    expect(result.out, result.out.slice(0, 3000)).not.toMatch(/check_sel_hostile_tooldata: \d+ crash/);
    expect(result.code).toBe(0);
  });

  it('the sweep can still detect a crash (canary)', () => {
    // Without this, a zero could mean the instrument broke rather than the
    // tools being safe.
    const self = run(['--selftest']);
    expect(self.out).toMatch(/canary CAUGHT/);
    expect(self.code).toBe(0);
  }, 900000);
});
