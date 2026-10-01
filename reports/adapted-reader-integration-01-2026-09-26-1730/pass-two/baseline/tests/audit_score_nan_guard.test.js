// vision-parseaudit-nan (2026-06-15): a parseAuditJson result that omitted issues[] (or
// otherwise carried a non-finite score) propagated NaN/undefined into the averaging /
// plateau math. Fix: (producer) coerce a non-finite score — deduction-ground it when
// issues[] is present, else mark degraded and report null (NOT a fabricated 100); and
// (consumers) harden the two score filters to Number.isFinite. The producer lives in an
// async closure, so we mirror its load-bearing coercion + anti-drift the shipped guards.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Mirror of the producer coercion.
function coerceScore(parsed) {
  if (!Number.isFinite(parsed.score)) {
    if (Array.isArray(parsed.issues)) {
      parsed.score = Math.max(0, 100 - Math.round(parsed.issues.reduce((s, i) => s + (i.deduction || 0), 0)));
    } else {
      parsed._scoreDegraded = true;
      parsed.score = null;
    }
  }
  return parsed;
}

describe('vision-parseaudit-nan — never let a non-finite audit score escape', () => {
  it('deduction-grounds a NaN score when issues[] is present', () => {
    const r = coerceScore({ score: NaN, issues: [{ deduction: 10 }, { deduction: 5 }] });
    expect(r.score).toBe(85);
    expect(r._scoreDegraded).toBeUndefined();
  });
  it('reports null (degraded), NOT 100, when issues[] is missing', () => {
    const r = coerceScore({ score: undefined });
    expect(r.score).toBe(null);
    expect(r._scoreDegraded).toBe(true);
  });
  it('leaves a finite score untouched', () => {
    expect(coerceScore({ score: 72, issues: [] }).score).toBe(72);
  });

  it('the consumer filter rejects null/NaN/undefined and keeps real scores', () => {
    const kept = [null, NaN, undefined, 85, 0, 100].filter((s) => Number.isFinite(s));
    expect(kept).toEqual([85, 0, 100]);
  });

  it('anti-drift: the producer coercion + both Number.isFinite consumer guards are live', () => {
    expect(src).toContain('parsed._scoreDegraded = true;');
    expect(src).toContain('parsed.score = null;');
    expect((src.match(/\.filter\(s => Number\.isFinite\(s\)\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
