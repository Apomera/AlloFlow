// Aggregate text-preservation gate for aiFixChunked (compound-shrink defense).
//
// Background (2026-06-07): aiFixChunked has a per-chunk text-floor 0.95. Across N
// chunks, the theoretical compound worst case is 0.95^N (e.g., 0.51 across 13
// chunks) while every individual chunk passes. None of the 4 callers (L2500,
// L5339, L8180, L10727) had a downstream shrink gate. The aggregate tracker
// added at the bottom of aiFixChunked (text 0.85 floor) catches the
// hypothetical adversarial case and warnLogs it — bounded backstop.
//
// ANTI-DRIFT: textCharCount + the aggregate floor are now EXTRACTED from doc_pipeline_source.jsx
// at runtime (were hand-copied; the local textCharCount was a simpler tag-only version that could
// diverge from the shipped one, which also strips scripts/styles/entities). The gate itself is
// inline in source (not a named fn), so this reconstructs it using the extracted real helper +
// floor — pinning the two drift vectors (text-counting logic, floor value) to source.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
function extractArrow(name) {
  const anchor = 'const ' + name + ' = ';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('not found in source: ' + name);
  const braceStart = SRC.indexOf('{', SRC.indexOf('=>', at));
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  const head = SRC.slice(at + anchor.length, SRC.indexOf('=>', at));
  // eslint-disable-next-line no-eval
  return eval('(' + head + '=> ' + SRC.slice(braceStart, end + 1) + ')');
}
const textCharCount = extractArrow('textCharCount');
const _AGG_TEXT_FLOOR = parseFloat((SRC.match(/const _AGG_TEXT_FLOOR = ([\d.]+)/) || [])[1]);

// Reconstructs the inline aggregate gate that runs after Promise.all in aiFixChunked, using the
// EXTRACTED textCharCount + floor. Returns { accepted, ratio, kept, orig } for assertions.
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

describe('anti-drift extraction sanity', () => {
  it('extracted the real textCharCount + aggregate floor from source', () => {
    expect(typeof textCharCount).toBe('function');
    expect(_AGG_TEXT_FLOOR).toBe(0.85);
    expect(textCharCount('<p>hi</p>')).toBe(2);                       // strips tags
    expect(textCharCount('<style>x{}</style><p>hi</p>')).toBe(2);     // and strips <style> content
  });
});

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
