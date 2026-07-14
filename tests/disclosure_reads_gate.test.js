// Dead-disclosure gate (deep dive 2026-07-09) — vitest wrapper so the check rides the suite/CI.
//
// The bug class it guards: the pipeline writes a disclosure field (fidelity note, honesty flag,
// warning) that no UI or report ever renders — H6 (integrityWarning: 3-second toast only), D2
// (altQuality: no reader), D3 (_scoreSource: never read) were all this one pattern. The contract
// lives in dev-tools/check_disclosure_reads.cjs; adding a disclosure = adding a contract entry.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('dead-disclosure gate — every produced disclosure has a reader', () => {
  it('check_disclosure_reads passes', () => {
    let out = '';
    try {
      out = execFileSync(process.execPath, [resolve(process.cwd(), 'dev-tools/check_disclosure_reads.cjs')], { encoding: 'utf8' });
    } catch (e) {
      throw new Error('check_disclosure_reads FAILED:\n' + ((e.stdout || '') + (e.stderr || '')));
    }
    expect(out).toContain('disclosure contracts satisfied');
  });
});
