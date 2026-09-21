// The SEL tools live in FOUR places. Every other parity test checks two.
//
//     sel_hub/                        source
//     desktop/web-app/public/sel_hub  served by the CDN
//     desktop/app-build/sel_hub       the packaged desktop app
//     desktop/web-app/build/sel_hub   the React build output
//
// Every mirror assertion in the SEL suite is shaped like
//
//     expect(readFileSync(MIRROR)).toBe(readFileSync(SOURCE))
//
// with MIRROR = the public copy. So `app-build` and `build` can drift
// indefinitely while the whole suite stays green — and a student on the
// packaged desktop app runs different code from a student on the web.
//
// That risk was live during the 2026-09-14/15 SEL work: 45 files were edited
// and hand-synced one mirror at a time, and a `cp` loop was caught missing a
// file at least once. All four happen to be in sync today; this keeps it
// checkable rather than lucky.
//
// A stale BUILD output can be legitimate between builds. The point is that it
// should be a visible, deliberate state — not something a one-mirror assertion
// conceals.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const GATE = resolve(process.cwd(), 'dev-tools/check_sel_four_copy_parity.cjs');

function runGate() {
  try {
    return {
      code: 0,
      out: execFileSync(process.execPath, [GATE, '--json'], {
        cwd: process.cwd(), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
      }),
    };
  } catch (err) {
    if (err.stdout) return { code: err.status ?? 1, out: err.stdout };
    throw err;
  }
}

describe('SEL four-copy parity', () => {
  const report = JSON.parse(runGate().out);

  it('knows about all three mirrors, not just the public one', () => {
    expect(report.mirrors).toContain('desktop/web-app/public/sel_hub');
    expect(report.mirrors).toContain('desktop/app-build/sel_hub');
    expect(report.mirrors).toContain('desktop/web-app/build/sel_hub');
  });

  it('actually compares the tool set', () => {
    // Guards against a silent collapse making the assertion below vacuous.
    expect(report.compared).toBeGreaterThan(60);
  });

  it('finds no drift between any of the four copies', () => {
    const detail = report.findings
      .map((f) => `${f.mirror}/${f.file} — ${f.why}`)
      .join('\n');
    expect(report.findings, detail).toHaveLength(0);
  });

  it('the mirrors carry the crash-recovery panel', () => {
    // A spot check with teeth: this string was added to sel_hub_module.js on
    // 2026-09-15 and must have reached every copy, or a desktop student hits a
    // blank screen where a web student gets a way back.
    const NEEDLE = 'Your saved work has not been deleted';
    for (const dir of ['sel_hub', ...report.mirrors]) {
      const p = resolve(process.cwd(), dir, 'sel_hub_module.js');
      expect(existsSync(p), `${dir}/sel_hub_module.js missing`).toBe(true);
      // eslint-disable-next-line global-require
      const src = require('node:fs').readFileSync(p, 'utf8');
      expect(src.includes(NEEDLE), `${dir} is missing the crash-recovery panel`).toBe(true);
    }
  });
});
