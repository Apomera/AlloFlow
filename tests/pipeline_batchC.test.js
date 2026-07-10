// Batch C from the 2026-06-15 fresh review:
//   #6 collapse multiple <main> landmarks into one (chunked-join landmark-one-main)
//   #9 batch quota circuit-breaker requires an ACTIVE + FRESH global quota state

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const start = src.indexOf('function _collapseExtraMains(html) {');
const end = src.indexOf('\nvar createDocPipeline = function(deps) {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _collapseExtraMains missing');
const _collapseExtraMains = new Function(src.slice(start, end) + '\n; return _collapseExtraMains;')();

const countMain = (h) => [(h.match(/<main\b/gi) || []).length, (h.match(/<\/main\s*>/gi) || []).length];

describe('#6 _collapseExtraMains — exactly one <main> survives, content preserved', () => {
  it('merges two sibling <main>s into one wrapping both (no mismatched nesting)', () => {
    const out = _collapseExtraMains('<main>A</main><main>B</main>');
    expect(countMain(out)).toEqual([1, 1]);
    expect(out).toContain('A');
    expect(out).toContain('B');
    expect(out).not.toContain('<div>'); // we delete boundaries, never emit a mismatched <div>
  });
  it('merges three siblings, preserving all content in order', () => {
    const out = _collapseExtraMains('<body><main>A</main><main>B</main><main>C</main></body>');
    expect(countMain(out)).toEqual([1, 1]);
    expect(out.indexOf('A')).toBeLessThan(out.indexOf('B'));
    expect(out.indexOf('B')).toBeLessThan(out.indexOf('C'));
  });
  it('keeps the FIRST <main>’s attributes (id/role)', () => {
    const out = _collapseExtraMains('<main id="main-content" role="main">A</main><main>B</main>');
    expect(out).toContain('<main id="main-content" role="main">');
  });
  it('leaves a single <main> untouched (no-op on the common path)', () => {
    const html = '<main id="x"><p>only one</p></main>';
    expect(_collapseExtraMains(html)).toBe(html);
  });
  it('collapses an (invalid) nested <main> too', () => {
    expect(countMain(_collapseExtraMains('<main><main>x</main></main>'))).toEqual([1, 1]);
  });
  it('fail-safe: odd input never throws', () => {
    expect(() => _collapseExtraMains(null)).not.toThrow();
  });
});

describe('#9 batch quota breaker — stale global state must not trip on file 1', () => {
  // mirror of the shipped _isQuota predicate (now=stamped)
  const quotaTrips = (err, qs, now) => {
    const perErr = !!(err && (err.isQuota || /API_QUOTA_EXHAUSTED|RESOURCE_EXHAUSTED|quota|\b429\b/i.test(err.message || '')));
    const global = !!(qs && qs.kind === 'quota' && qs.active === true && (now - (qs.hitAt || 0) < 60000));
    return perErr || global;
  };
  const NOW = 1_000_000_000_000;
  it('a STALE active quota state (2 min old) does NOT trip on a non-quota error', () => {
    expect(quotaTrips({ message: 'network blip' }, { kind: 'quota', active: true, hitAt: NOW - 120_000 }, NOW)).toBe(false);
  });
  it('a FRESH active quota state still trips', () => {
    expect(quotaTrips({ message: 'network blip' }, { kind: 'quota', active: true, hitAt: NOW - 1_000 }, NOW)).toBe(true);
  });
  it('a cleared {active:false} state never trips', () => {
    expect(quotaTrips({ message: 'x' }, { active: false }, NOW)).toBe(false);
  });
  it('a live per-error quota still trips regardless of global state', () => {
    expect(quotaTrips({ isQuota: true }, null, NOW)).toBe(true);
    expect(quotaTrips({ message: 'HTTP 429 RESOURCE_EXHAUSTED' }, null, NOW)).toBe(true);
  });
  it('anti-drift: the shipped global half requires active + freshness', () => {
    // Repointed 2026-07-10 (ChatGPT finding 10): the check moved into the per-day/burst
    // disposition split - same active + <60s freshness contract on the _gq alias, and the
    // batch-stop additionally requires per-day evidence.
    expect(src).toContain("const _gqFresh = !!(_gq && _gq.kind === 'quota' && _gq.active === true && (Date.now() - (_gq.hitAt || 0) < 60000));");
    expect(src).toContain('(_gqFresh && _gq.perDay === true)');
  });
});
