// Aggregate text-preservation gate for aiFixChunked (compound-shrink defense).
//
// Background (2026-06-07): aiFixChunked has a per-chunk text-floor 0.95. Across N
// chunks, the theoretical compound worst case is 0.95^N (e.g., 0.51 across 13
// chunks) while every individual chunk passes. None of the 4 callers (L2500,
// L5339, L8180, L10727) had a downstream shrink gate. The aggregate tracker
// added at the bottom of aiFixChunked (text 0.85 floor) catches the
// hypothetical adversarial case and warnLogs it — bounded backstop.
//
// MIRROR DISCIPLINE: the gate logic is copied verbatim from
// doc_pipeline_source.jsx. If you change the floor in source, update here.

import { describe, it, expect, vi } from 'vitest';

const textCharCount = (s) => String(s || '').replace(/<[^>]+>/g, '').length;
const _AGG_TEXT_FLOOR = 0.85;

// Mirror: the aggregate-gate logic that runs after Promise.all in aiFixChunked.
// Returns { accepted, ratio, kept, orig } for testing; in source it either
// returns _restoreImages(html) on reject or _restoreImages(fixed.join('')) on accept.
const aggregateGate = (chunks, fixed) => {
  let _sumOrigText = 0, _sumKeptText = 0;
  for (let i = 0; i < chunks.length; i++) {
    _sumOrigText += textCharCount(chunks[i]);
    _sumKeptText += textCharCount(fixed[i] || '');
  }
  if (_sumOrigText === 0) return { accepted: true, ratio: 1, kept: 0, orig: 0 };
  const ratio = _sumKeptText / _sumOrigText;
  return { accepted: ratio >= _AGG_TEXT_FLOOR, ratio, kept: _sumKeptText, orig: _sumOrigText };
};

describe('aiFixChunked aggregate text-preservation gate', () => {
  it('accepts when AI returns chunks unchanged (~1.0 ratio)', () => {
    const chunks = ['<p>hello world</p>', '<p>second paragraph</p>', '<p>third</p>'];
    const fixed = chunks.slice();
    const r = aggregateGate(chunks, fixed);
    expect(r.accepted).toBe(true);
    expect(r.ratio).toBe(1);
  });

  it('accepts mild shrink within band (~0.92, above 0.85 floor)', () => {
    // ~8% text shrink — within the per-chunk floor 0.95 individually, aggregate 0.92.
    const chunks = ['<p>aaaaaaaaaa</p>', '<p>bbbbbbbbbb</p>'];
    const fixed = ['<p>aaaaaaaaa</p>', '<p>bbbbbbbbb</p>']; // 1 char less per chunk → 18/20 = 0.9
    const r = aggregateGate(chunks, fixed);
    expect(r.accepted).toBe(true);
    expect(r.ratio).toBeGreaterThan(0.85);
  });

  it('REJECTS the compound-shrink case — adversarial 0.80 per chunk across many chunks', () => {
    // Simulate the hypothetical case: every chunk lands in the band [0.80, 0.95)
    // — individually passing per-chunk floor in the verifier's eyes (if the per-
    // chunk floor were 0.80) but compounding way past the aggregate floor.
    const chunks = Array.from({ length: 10 }, (_, i) => '<p>' + 'word '.repeat(100) + '</p>');
    const fixed = chunks.map(c => '<p>' + 'word '.repeat(80) + '</p>'); // 0.80 per chunk
    const r = aggregateGate(chunks, fixed);
    expect(r.accepted).toBe(false);
    expect(r.ratio).toBeLessThan(_AGG_TEXT_FLOOR);
  });

  it('REJECTS mixed catastrophic + ok chunks (one chunk lost 50%)', () => {
    const chunks = Array.from({ length: 4 }, () => '<p>' + 'word '.repeat(50) + '</p>');
    const fixed = chunks.slice();
    fixed[2] = '<p>word</p>'; // one chunk almost completely lost
    const r = aggregateGate(chunks, fixed);
    expect(r.accepted).toBe(false);
  });

  it('handles markup-only chunks (textCharCount strips tags)', () => {
    const chunks = ['<div><span></span></div>', '<p></p>'];
    const fixed = ['<div></div>', '<p></p>'];
    // textCharCount of both = 0, total origText = 0 → early-return accepted
    const r = aggregateGate(chunks, fixed);
    expect(r.accepted).toBe(true);
    expect(r.orig).toBe(0);
  });

  it('passes when total grew (extra tags, same text)', () => {
    const chunks = ['<p>hello</p>'];
    const fixed = ['<div><p>hello</p></div>']; // wrapped — text identical, html grew
    const r = aggregateGate(chunks, fixed);
    expect(r.accepted).toBe(true);
    expect(r.ratio).toBe(1);
  });
});
