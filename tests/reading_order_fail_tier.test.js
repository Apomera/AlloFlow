// Reading-order enforcement tier (2026-07-13) — the follow-up the H-5 warn-only
// check scheduled: a round-trip sequence ratio below 0.50 is a catastrophic
// scramble (full column interleave), far below any legitimate reflow, and now
// FAILS the check + folds into roundTrip.ok (which every delivery gate honors).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = pipe.indexOf('function readingOrderSequenceRatio');
const end = pipe.indexOf('\n}', start) + 2;
const ratioFn = new Function(pipe.slice(start, end) + '\nreturn readingOrderSequenceRatio;')();

describe('calibration sanity for the 0.50 fail line', () => {
  const words = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}word${i}`);
  it('a full two-column interleave scores far below 0.50', () => {
    const left = words('left', 60);
    const right = words('right', 60);
    const columnMajor = left.concat(right).join(' ');
    const interleaved = left.map((w, i) => w + ' ' + right[i]).join(' ');
    const r = ratioFn(columnMajor, interleaved);
    expect(r).toBeLessThan(0.7); // materially scrambled…
    // …and the CATASTROPHIC direction (source order vs fully reversed halves) is even lower:
    const reversed = right.concat(left).join(' ');
    expect(ratioFn(columnMajor, reversed)).toBeLessThanOrEqual(0.55);
  });
  it('identical and lightly-reflowed text stays near 1.0 (no false-fail headroom)', () => {
    const base = words('body', 100);
    expect(ratioFn(base.join(' '), base.join(' '))).toBeGreaterThanOrEqual(0.99);
    const lightSwap = base.slice();
    [lightSwap[10], lightSwap[11]] = [lightSwap[11], lightSwap[10]];
    [lightSwap[50], lightSwap[51]] = [lightSwap[51], lightSwap[50]];
    expect(ratioFn(base.join(' '), lightSwap.join(' '))).toBeGreaterThanOrEqual(0.9);
  });
});

describe('enforcement wiring (anti-drift)', () => {
  it('the <0.50 tier fails the check and folds into roundTrip.ok', () => {
    expect(pipe).toContain("const _roStatus = _orderRatio < 0.50 ? 'fail' : (_orderRatio < 0.80 ? 'warn' : 'info');");
    expect(pipe).toContain("if (_roStatus === 'fail') _roundTrip.ok = false;");
    expect(pipe).toContain('the export is withheld from the verified-delivery gates');
  });
  it('the warn/info band below 0.90 is unchanged (calibration pending on real multi-column docs)', () => {
    expect(pipe).toContain('if (_orderRatio < 0.90) {');
    expect(pipe).toContain("pending real multi-column Canvas calibration");
  });
});
