// #8 (2026-06-15): two heading-skip fixers coexisted. The STRICT positional collapse (any
// skip > 1 level → +1) ran ONLY once before the AI auto-fix loop; inside the loop the only
// heading repair was the LENIENT fixHeadingHierarchy (tolerates a 2-level skip h1→h3). An AI
// fix pass routinely re-levels headings, so it could re-introduce an h1→h3 skip that the
// lenient post-pass left untouched → shipped → fails axe heading-order. Fix: extract the strict
// collapse into _collapseHeadingSkipsStrict and ALSO run it inside runDeterministicWcagFixes
// (which the loop calls), and dedupe the two inline copies into it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _collapseHeadingSkipsStrict(htmlContent) {');
const end = src.indexOf('var createDocPipeline', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _collapseHeadingSkipsStrict missing');
const _collapseHeadingSkipsStrict = new Function(src.slice(start, end) + '\n; return _collapseHeadingSkipsStrict;')();
const fix = (h) => _collapseHeadingSkipsStrict(h).html;

describe('#8 _collapseHeadingSkipsStrict — collapse ANY >1-level skip (strict)', () => {
  it('collapses h1→h3 to h1→h2 (the skip the LENIENT fixer tolerates and would ship)', () => {
    const r = _collapseHeadingSkipsStrict('<h1>A</h1><p>x</p><h3>B</h3>');
    expect(r.html).toContain('<h2>B</h2>');
    expect(r.fixCount).toBe(1);
  });
  it('collapses a deep skip h1→h5 down to h1→h2 (strict +1, not the lenient +2)', () => {
    expect(fix('<h1>A</h1><h5>B</h5>')).toBe('<h1>A</h1><h2>B</h2>');
  });
  it('cascades correctly across multiple skips (h1, h4, h6 → h1, h2, h3)', () => {
    expect(fix('<h1>A</h1><h4>B</h4><h6>C</h6>')).toBe('<h1>A</h1><h2>B</h2><h3>C</h3>');
  });
  it('is a no-op on a clean chain and on a single heading', () => {
    const clean = '<h1>A</h1><p>x</p><h2>B</h2><p>x</p><h3>C</h3>';
    expect(_collapseHeadingSkipsStrict(clean)).toEqual({ html: clean, fixCount: 0 });
    expect(_collapseHeadingSkipsStrict('<h2>only</h2>')).toEqual({ html: '<h2>only</h2>', fixCount: 0 });
  });
  it('preserves the heading’s attributes when relevelling', () => {
    expect(fix('<h1>A</h1><h4 id="x" class="y">B</h4>')).toContain('<h2 id="x" class="y">B</h2>');
  });

  it('anti-drift: the strict pass runs inside runDeterministicWcagFixes and the inline copies are deduped', () => {
    expect(src).toContain('result = _collapseHeadingSkipsStrict(result).html;'); // closes the loop gap
    expect(src).not.toContain('const _hOpens = [];'); // both inline duplicates removed
  });
});
