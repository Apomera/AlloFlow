// Unit tests for the content-fabrication (hallucination) guard in doc_pipeline_source.jsx.
// Extracts the pure detectFabrication() helper from source and exercises it directly, so the
// test pins the SHIPPED logic (the module is a 1:1 IIFE wrap of source for DocPipeline; the
// source/module pair-drift check guarantees they match). WARN-only design: it reports, the
// pipeline surfaces it, it never blocks a fix.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function extractDetectFabrication() {
  const src = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
  const anchor = 'const detectFabrication = ';
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error('detectFabrication not found in source');
  const arrowBrace = src.indexOf('{', src.indexOf('=>', at));
  let i = arrowBrace, depth = 0, end = -1;
  for (; i < src.length; i++) { const c = src[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i; break; } } }
  const head = src.slice(at + anchor.length, src.indexOf('=>', at)); // "(fixed, original, opts) "
  // eslint-disable-next-line no-eval
  return eval('(' + head + '=> ' + src.slice(arrowBrace, end + 1) + ')');
}

const detectFabrication = extractDetectFabrication();
const FAITHFUL = { mode: 'faithful' };
const wrap = (body) => `<!DOCTYPE html><html><body><main>${body}</main></body></html>`;

describe('detectFabrication (hallucination guard)', () => {
  it('passes identical content (no fabrication)', () => {
    const html = wrap('<p>The cat sat on the mat.</p>');
    expect(detectFabrication(html, html, FAITHFUL).suspected).toBe(false);
  });

  it('flags a fabricated multi-digit number not in the source', () => {
    const r = detectFabrication(wrap('<p>The study had 42 participants.</p>'), wrap('<p>The study had participants.</p>'), FAITHFUL);
    expect(r.suspected).toBe(true);
    expect(r.fabricatedNumbers).toContain('42');
  });

  it('flags a fabricated URL not in the source', () => {
    const r = detectFabrication(wrap('<p>See https://made-up-site.example/report for more.</p>'), wrap('<p>See the report for more.</p>'), FAITHFUL);
    expect(r.suspected).toBe(true);
    expect(r.fabricatedUrls.some(u => u.includes('made-up-site.example'))).toBe(true);
  });

  it('flags a fabricated date not in the source', () => {
    const r = detectFabrication(wrap('<p>Signed on 07/04/2024 in the capital.</p>'), wrap('<p>Signed in the capital.</p>'), FAITHFUL);
    expect(r.suspected).toBe(true);
    expect(r.fabricatedDates).toContain('07/04/2024');
  });

  it('does NOT flag legitimate image alt text added during remediation', () => {
    const fixed = wrap('<img src="barn.jpg" alt="A red barn at sunset with 12 lit windows"><p>The farm story.</p>');
    const orig = wrap('<img src="barn.jpg"><p>The farm story.</p>');
    expect(detectFabrication(fixed, orig, FAITHFUL).suspected).toBe(false);
  });

  it('does NOT flag an added aria-label', () => {
    const fixed = wrap('<button aria-label="Close dialog 99">X</button><p>Body text here.</p>');
    const orig = wrap('<button>X</button><p>Body text here.</p>');
    expect(detectFabrication(fixed, orig, FAITHFUL).suspected).toBe(false);
  });

  it('ignores single-digit numbers (avoid list-ordinal / coincidence false positives)', () => {
    const r = detectFabrication(wrap('<p>There are 5 schools.</p>'), wrap('<p>There are schools.</p>'), FAITHFUL);
    expect(r.fabricatedNumbers).toEqual([]);
    expect(r.suspected).toBe(false);
  });

  it('accepts a large number within ±10% (rounding) but flags one outside', () => {
    const orig = wrap('<p>The city has 1,200 residents.</p>');
    expect(detectFabrication(wrap('<p>The city has about 1180 residents.</p>'), orig, FAITHFUL).fabricatedNumbers).toEqual([]); // within 10%
    expect(detectFabrication(wrap('<p>The city has 500 residents.</p>'), orig, FAITHFUL).fabricatedNumbers).toContain('500'); // outside
  });

  it('does NOT flag faithful paraphrase of similar length (no high-precision trigger)', () => {
    const orig = wrap('<p>The committee approved the new policy after a long debate.</p>');
    const fixed = wrap('<p>After a lengthy debate, the committee approved the new policy.</p>');
    expect(detectFabrication(fixed, orig, FAITHFUL).suspected).toBe(false);
  });

  it('flags a low-grounding bulk expansion (wall of un-sourced prose)', () => {
    const orig = wrap('<p>Cats sleep often.</p>');
    const fixed = wrap('<p>Cats sleep often. Dolphins navigate oceans using sophisticated echolocation abilities developed across millions of evolutionary cycles throughout diverse marine habitats worldwide today.</p>');
    const r = detectFabrication(fixed, orig, FAITHFUL);
    expect(r.lowGrounding).toBe(true);
    expect(r.suspected).toBe(true);
  });

  it('bypasses entirely when mode !== faithful (simplified/translated paths)', () => {
    const r = detectFabrication(wrap('<p>Completely different simplified text with new words 12345.</p>'), wrap('<p>Original complex academic paragraph.</p>'), { mode: 'simplified' });
    expect(r.suspected).toBe(false);
    expect(r.reason).toBe('bypass');
  });
});
