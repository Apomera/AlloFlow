// Geometry-aware <th> scope runs IN the deterministic loop (audit #14, 2026-06-15).
// fixComplexTables re-ran after every AI pass and stamped a blanket scope="col" on any scope-less
// <th> in a merged-cell table — mis-announcing left-column ROW headers (the geometry-aware stamper
// only ran pre-loop). Fix: drop the blanket stamp and call _stampThScopeGeometryAware each loop
// iteration. The stamper's own correctness is covered in pipeline_correctness_batchB; this pins the
// WIRING so the blanket stamp can't creep back.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('runDeterministicWcagFixes stamps th scope geometry-aware (audit #14)', () => {
  it('calls _stampThScopeGeometryAware inside the deterministic loop, right after fixComplexTables', () => {
    const loopStart = src.indexOf('const runDeterministicWcagFixes = (html) => {');
    const loopEnd = src.indexOf('return result;', loopStart);
    expect(loopStart).toBeGreaterThan(-1);
    const loopBody = src.slice(loopStart, loopEnd);
    const fcIdx = loopBody.indexOf('fixComplexTables(result)');
    const geoIdx = loopBody.indexOf('_stampThScopeGeometryAware(result)');
    expect(fcIdx).toBeGreaterThan(-1);
    expect(geoIdx).toBeGreaterThan(-1);
    expect(geoIdx).toBeGreaterThan(fcIdx); // geometry scope AFTER fixComplexTables
  });

  it('fixComplexTables no longer blanket-stamps scope="col" on scope-less th', () => {
    const fcStart = src.indexOf('const fixComplexTables = (htmlContent) => {');
    const fcEnd = src.indexOf('const fixLangSpans', fcStart);
    const fcBody = src.slice(fcStart, fcEnd);
    // The first-row td->th promotion legitimately uses scope="col"; the BLANKET fallback stamp
    // (the `if (/\sscope\s*=/...) return m; ... return <th scope="col"...>` block) must be gone.
    expect(fcBody).not.toMatch(/if \(\/\\sscope\\s\*=\/i\.test\(attrs\)\) return m;[\s\S]*?return `<th scope="col"\$\{attrs\}>`/);
  });
});
