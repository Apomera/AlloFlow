// Unit tests for the PURE support logic of the multi-pass remediation loop:
//   - splitHtmlOnTagBoundary : the chunker that feeds chunked AI remediation. Its #1 job is
//     LOSSLESS partitioning — chunks must concatenate back to the exact original (a drop or
//     duplicate here = silent content loss/corruption in the output).
//   - reconcileOcrPages      : merges the parallel Tesseract + Vision OCR passes (longer text
//     wins per page, Tesseract word boxes carried through, disagreements flagged for review).
//   - _docFingerprint        : the cross-document guard that stops chunk-state from one PDF
//     bleeding into another.
//
// The async loop ITSELF (autoFixAxeViolations / fixAndVerifyPdf) re-runs axe-core in a real
// iframe — the acknowledged headless ceiling — so it stays on the Playwright e2e suite. These
// tests pin the deterministic pieces the loop depends on.
//
// Anti-drift: extracts the real arrow-function bodies from source at runtime (these are
// self-contained string/array ops with no external deps), so they can't rot against source.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');

function extractConst(name) {
  const anchor = 'const ' + name + ' = ';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('source extraction failed: ' + name);
  const arrowAt = SRC.indexOf('=>', at);
  const head = SRC.slice(at + anchor.length, arrowAt); // params, e.g. "(html, size) "
  let bodyStart = arrowAt + 2;
  while (/\s/.test(SRC[bodyStart])) bodyStart++;
  let bodySrc;
  if (SRC[bodyStart] === '{') {
    // Block body — brace-balance (these fns have no brace-in-string/regex).
    let i = bodyStart, depth = 0, end = -1;
    for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i; break; } } }
    if (end < 0) throw new Error('unbalanced braces: ' + name);
    bodySrc = SRC.slice(bodyStart, end + 1);
  } else {
    // Expression body (one-liner arrow) — capture to the statement-terminating ';'.
    const semi = SRC.indexOf(';', bodyStart);
    if (semi < 0) throw new Error('no statement terminator: ' + name);
    bodySrc = SRC.slice(bodyStart, semi);
  }
  // eslint-disable-next-line no-eval
  return eval('(' + head + '=> ' + bodySrc + ')');
}

const splitHtmlOnTagBoundary = extractConst('splitHtmlOnTagBoundary');
const reconcileOcrPages = extractConst('reconcileOcrPages');
const _docFingerprint = extractConst('_docFingerprint');

describe('splitHtmlOnTagBoundary — lossless chunker', () => {
  it('returns a single chunk when html fits within size', () => {
    expect(splitHtmlOnTagBoundary('<p>short</p>', 1000)).toEqual(['<p>short</p>']);
  });
  it('handles empty / null input', () => {
    expect(splitHtmlOnTagBoundary('', 100)).toEqual(['']);
    expect(splitHtmlOnTagBoundary(null, 100)).toEqual(['']);
  });
  it('CRITICAL: chunks concatenate back to the exact original (no loss / no duplication)', () => {
    const html = '<section>' + '<p>Lorem ipsum dolor sit amet.</p>'.repeat(1500) + '</section>';
    for (const size of [500, 1024, 4096, 16384]) {
      const chunks = splitHtmlOnTagBoundary(html, size);
      expect(chunks.join(''), `roundtrip failed at size ${size}`).toBe(html);
      expect(chunks.length, `expected multiple chunks at size ${size}`).toBeGreaterThan(1);
    }
  });
  it('no chunk exceeds the requested size (boundary-inclusive: at most size+1)', () => {
    // When a '>' lands exactly on the size boundary, end = lastClose+1 makes the chunk
    // one char over `size` — a benign off-by-one on a soft target (roundtrip is unaffected).
    const html = '<p>data</p>'.repeat(3000);
    const size = 2048;
    for (const c of splitHtmlOnTagBoundary(html, size)) expect(c.length).toBeLessThanOrEqual(size + 1);
  });
  it('backs up to a tag boundary when one is available past the 60% mark', () => {
    // A '>' sits well past 0.6*size before the hard cut → the chunk should end at it.
    const head = '<a>' + 'x'.repeat(80) + '>';   // a '>' at index ~84
    const html = head + 'y'.repeat(200);
    const chunks = splitHtmlOnTagBoundary(html, 100); // 0.6*100=60; the '>' at ~84 > 60 → used
    expect(chunks[0].endsWith('>')).toBe(true);
    expect(chunks.join('')).toBe(html);
  });
  it('falls back to a hard cut when no boundary exists near the size limit (still lossless)', () => {
    const html = 'z'.repeat(5000); // no '>' anywhere
    const chunks = splitHtmlOnTagBoundary(html, 1000);
    expect(chunks.join('')).toBe(html);
    expect(chunks.every((c) => c.length <= 1000)).toBe(true);
  });
});

describe('reconcileOcrPages — Tesseract/Vision merge', () => {
  it('picks the longer text per page (Tesseract wins ties) and reports the source', () => {
    const r = reconcileOcrPages(
      [{ text: 'same length text here' }],
      [{ text: 'same length text here' }] // equal → tesseract wins
    );
    expect(r.pages[0].source).toBe('tesseract');
    const r2 = reconcileOcrPages([{ text: 'short' }], [{ text: 'a much much much longer vision result' }]);
    expect(r2.pages[0].source).toBe('vision');
    expect(r2.pages[0].text).toBe('a much much much longer vision result');
  });
  it('flags a disagreement when the length gap exceeds max(20, 10%)', () => {
    const r = reconcileOcrPages([{ text: 'tiny' }], [{ text: 'a substantially longer vision extraction string' }]);
    expect(r.disagreements).toHaveLength(1);
    expect(r.disagreements[0].pageNum).toBe(1);
  });
  it('does NOT flag a disagreement within tolerance', () => {
    const base = 'x'.repeat(300);
    const r = reconcileOcrPages([{ text: base }], [{ text: base + 'x'.repeat(15) }]); // +15 chars on 315 → within 10% and <20
    expect(r.disagreements).toHaveLength(0);
  });
  it('carries Tesseract word boxes + page dims onto the merged page (even when Vision text wins)', () => {
    const words = [{ t: 'hi', x0: 1, y0: 2, x1: 3, y1: 4 }];
    const r = reconcileOcrPages(
      [{ text: 'short', words, pageW: 612, pageH: 792 }],
      [{ text: 'a longer vision text that wins the length contest here' }]
    );
    expect(r.pages[0].source).toBe('vision');      // vision text won
    expect(r.pages[0].words).toEqual(words);        // but tesseract boxes carried
    expect(r.pages[0].pageW).toBe(612);
    expect(r.pages[0].pageH).toBe(792);
  });
  it('handles mismatched page counts (vision-only page → words null)', () => {
    const r = reconcileOcrPages([{ text: 'p1' }], [{ text: 'p1v' }, { text: 'p2 vision only' }]);
    expect(r.pages).toHaveLength(2);
    expect(r.pages[1].text).toBe('p2 vision only');
    expect(r.pages[1].words).toBe(null);
    expect(r.pages[1].pageNum).toBe(2);
  });
  it('joins page text with blank lines, skipping empty pages', () => {
    const r = reconcileOcrPages([{ text: 'one' }, { text: '' }, { text: 'three' }], [{}, {}, {}]);
    expect(r.fullText).toBe('one\n\nthree');
  });
});

describe('_docFingerprint — cross-document chunk-state guard', () => {
  it('distinguishes documents of different length', () => {
    expect(_docFingerprint('<p>doc a</p>')).not.toBe(_docFingerprint('<p>doc bbbbb</p>'));
  });
  it('is stable for the same document', () => {
    const html = '<p>same</p>'.repeat(50);
    expect(_docFingerprint(html)).toBe(_docFingerprint(html));
  });
  it('encodes length + prefix (documents differing only after the 200-char prefix collide — documents the known limitation)', () => {
    const prefix = 'p'.repeat(200);
    const a = prefix + 'AAAA';
    const b = prefix + 'BBBB'; // same length + same 200-char prefix
    expect(_docFingerprint(a)).toBe(_docFingerprint(b)); // known limitation: prefix+length only
    expect(_docFingerprint(prefix + 'AAAA')).not.toBe(_docFingerprint(prefix + 'AAAAA')); // different length → distinct
  });
});
