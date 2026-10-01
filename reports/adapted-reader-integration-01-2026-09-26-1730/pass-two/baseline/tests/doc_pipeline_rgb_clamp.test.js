// B9 (audit batch, 2026-06-28): the contrast fixer parsed rgb()/rgba() channels with bare parseInt and
// never clamped them. CSS lets rgba(300,…) parse to 300; 300/255≈1.18 then breaks the sRGB transfer
// function in luminance() → wrong contrast ratios (a fix can pass/fail incorrectly, undermining the core
// contrast-remediation claim). Both parse sites (parseColor + the `color:rgba(…)` replacer) now clamp 0–255.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('B9: contrast-fixer RGB channels are clamped to 0–255', () => {
  it('the clamp maps out-of-range channels into [0,255]', () => {
    const clamp = (v) => Math.max(0, Math.min(255, parseInt(v, 10)));
    expect([300, 999, 128, 255, 0].map(clamp)).toEqual([255, 255, 128, 255, 0]);
  });
  it('anti-drift: BOTH rgb parse sites clamp (parseColor + the color:rgba replacer)', () => {
    const n = (dp.match(/Math\.max\(0, Math\.min\(255, parseInt\(v, 10\)\)\)/g) || []).length;
    expect(n).toBeGreaterThanOrEqual(2);
  });
});
