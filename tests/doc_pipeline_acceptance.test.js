// Unit tests for the REMEDIATION ACCEPTANCE / INTEGRITY decision logic in
// doc_pipeline_source.jsx — the load-bearing guards that decide whether an AI fix is
// kept (acceptFixedHtmlDetailed), whether a chunk preserved its content
// (verifyChunkIntegrity), and the local heuristic score (scoreChunkLocally). These sit
// in the multi-pass orchestration and were previously trusted only because they "work in
// the live app"; this pins the 95%/97% floors + the growth ceilings + content-loss
// detection so a threshold tweak or refactor can't silently change acceptance behavior.
//
// Anti-drift: instead of hand-copying the functions (the mirror-discipline used elsewhere,
// which rots), this extracts the real arrow-function bodies from the source at runtime and
// evals them in one shared scope (so cross-references resolve). If the source signature
// shape changes, extraction throws loudly rather than testing stale copies.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');

// Extract `const NAME = (...) => { ... }` verbatim from source via brace-balancing.
// Regex {n,m} quantifiers self-balance, so they don't perturb the net brace depth.
function extractConst(name) {
  const anchor = 'const ' + name + ' = ';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('source extraction failed: ' + name + ' not found');
  const braceStart = SRC.indexOf('{', SRC.indexOf('=>', at));
  let i = braceStart, depth = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i; break; } } }
  if (end < 0) throw new Error('source extraction failed: unbalanced braces for ' + name);
  return SRC.slice(at, end + 1);
}

// Eval the acceptance helpers + their dependencies together (dependency order matters).
const NAMES = ['textCharCount', 'extractPlainText', 'detectFabrication', 'acceptFixedHtmlDetailed', 'acceptFixedHtml', 'verifyChunkIntegrity', 'scoreChunkLocally'];
const body = NAMES.map(extractConst).join(';\n');
// eslint-disable-next-line no-eval
const A = eval('(function(){ ' + body + ';\n return { ' + NAMES.join(', ') + ' }; })()');

const DOC = (inner) => `<!DOCTYPE html><html lang="en"><body><main>${inner}</main></body></html>`;
const para = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

describe('acceptFixedHtmlDetailed — AI-fix acceptance gate', () => {
  it('accepts a faithful, near-identical document', () => {
    const html = DOC('<p>' + para(120) + '</p>');
    const d = A.acceptFixedHtmlDetailed(html, html);
    expect(d.accepted).toBe(true);
  });

  it('rejects empty output and missing original', () => {
    expect(A.acceptFixedHtmlDetailed('', DOC('<p>x</p>')).reason).toBe('empty-output');
    expect(A.acceptFixedHtmlDetailed(DOC('<p>x</p>'), '').reason).toBe('no-original');
  });

  it('rejects size shrink below the 0.95 floor', () => {
    const orig = DOC('<p>' + para(400) + '</p>');
    const fixed = DOC('<p>' + para(40) + '</p>');
    const d = A.acceptFixedHtmlDetailed(fixed, orig);
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('size-shrink');
  });

  it('rejects text shrink below the 0.97 floor even when byte size is held in-band with markup', () => {
    const orig = DOC('<p>' + para(300) + '</p>');
    // Keep byte size ~equal to orig (so the size gates pass) but gut the actual TEXT — empty
    // spans add bytes without text, so size stays in [0.95,1.40] while textRatio collapses.
    const fixed = DOC('<p>' + para(5) + '</p>' + '<span></span>'.repeat(170));
    const d = A.acceptFixedHtmlDetailed(fixed, orig);
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('text-shrink');
  });

  it('rejects unexpected size growth above the 1.40 ceiling (injection guard)', () => {
    const orig = DOC('<p>' + para(100) + '</p>');
    const fixed = DOC('<p>' + para(100) + '</p>' + '<p>' + para(400) + '</p>');
    const d = A.acceptFixedHtmlDetailed(fixed, orig);
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('size-growth-unexpected');
  });

  it('rejects unexpected text growth above the 1.25 ceiling (size kept under the 1.40 ceiling)', () => {
    const orig = DOC('<p>' + para(300) + '</p>');
    const fixed = DOC('<p>' + para(390) + '</p>'); // ~1.31x text (>1.25) but ~1.30x size (<1.40)
    const d = A.acceptFixedHtmlDetailed(fixed, orig);
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('text-growth-unexpected');
  });

  it('rejects output with no document markers (size held in-band)', () => {
    const orig = DOC('<p>' + para(300) + '</p>');
    // Same content + ~same size, but wrapped in non-document elements (no <!DOCTYPE/html/main/body).
    const fixed = '<div><article><p>' + para(300) + '</p></article></div>';
    const d = A.acceptFixedHtmlDetailed(fixed, orig);
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('no-doc-markers');
  });

  it('honors opts threshold overrides', () => {
    const orig = DOC('<p>' + para(100) + '</p>');
    const fixed = DOC('<p>' + para(70) + '</p>'); // ~0.7 ratio
    expect(A.acceptFixedHtmlDetailed(fixed, orig).accepted).toBe(false); // default floor rejects
    expect(A.acceptFixedHtmlDetailed(fixed, orig, { sizeFloor: 0.5, textFloor: 0.5 }).accepted).toBe(true); // relaxed accepts
  });

  it('fabrication is WARN-only: a faithful-mode hallucinated number is flagged but still accepted', () => {
    const orig = DOC('<p>The study enrolled participants over two terms.</p>');
    const fixed = DOC('<p>The study enrolled 8742 participants over two terms.</p>');
    const d = A.acceptFixedHtmlDetailed(fixed, orig, { mode: 'faithful' });
    expect(d.accepted).toBe(true); // never blocks
    expect(d.fabrication && d.fabrication.suspected).toBe(true);
    expect(d.fabrication.fabricatedNumbers).toContain('8742');
  });

  it('does not run fabrication check when mode is not faithful', () => {
    const orig = DOC('<p>The study enrolled participants.</p>');
    const fixed = DOC('<p>The study enrolled 8742 participants.</p>');
    const d = A.acceptFixedHtmlDetailed(fixed, orig);
    expect(d.accepted).toBe(true);
    expect(d.fabrication).toBeUndefined();
  });

  it('acceptFixedHtml wrapper returns the boolean of .accepted', () => {
    const html = DOC('<p>' + para(80) + '</p>');
    expect(A.acceptFixedHtml(html, html)).toBe(true);
    expect(A.acceptFixedHtml('', html)).toBe(false);
  });
});

describe('verifyChunkIntegrity — per-chunk content-preservation gate', () => {
  it('treats an empty original chunk as trivially passed', () => {
    const r = A.verifyChunkIntegrity('', '<p>anything</p>');
    expect(r.passed).toBe(true);
    expect(r.reason).toBe('empty-chunk');
  });

  it('passes when the chunk content is preserved', () => {
    const orig = '<p>' + para(40) + '</p>';
    const r = A.verifyChunkIntegrity(orig, '<section><p>' + para(40) + '</p></section>');
    expect(r.passed).toBe(true);
    expect(r.overlapRatio).toBeGreaterThanOrEqual(0.85);
  });

  it('fails on heavy word-count loss (below 0.80)', () => {
    const orig = '<p>' + para(50) + '</p>';
    const r = A.verifyChunkIntegrity(orig, '<p>' + para(10) + '</p>');
    expect(r.passed).toBe(false);
    expect(r.wordCountRatio).toBeLessThan(0.8);
  });

  it('fails on low word overlap even when length is similar (content swapped)', () => {
    const orig = '<p>' + para(40) + '</p>';
    const swapped = Array.from({ length: 40 }, (_, i) => `other${i}`).join(' ');
    const r = A.verifyChunkIntegrity(orig, '<p>' + swapped + '</p>');
    expect(r.passed).toBe(false);
    expect(r.overlapRatio).toBeLessThan(0.85);
  });

  it('allows legitimate expansion (all original words retained, more added)', () => {
    const orig = '<p>' + para(40) + '</p>';
    const r = A.verifyChunkIntegrity(orig, '<p>' + para(40) + ' extra alpha beta gamma delta</p>');
    expect(r.passed).toBe(true);
    expect(r.wordCountRatio).toBeGreaterThan(1);
  });
});

describe('scoreChunkLocally — heuristic local score (no API)', () => {
  it('scores clean content at 100', () => {
    expect(A.scoreChunkLocally('<p>Hello world, this is fine.</p>')).toBe(100);
  });
  it('penalizes an image missing alt (-10) but not one with alt', () => {
    expect(A.scoreChunkLocally('<img src="x">')).toBe(90);
    expect(A.scoreChunkLocally('<img src="x" alt="a chart">')).toBe(100);
  });
  it('penalizes TH without scope (-5) and a data table with no TH (-10)', () => {
    expect(A.scoreChunkLocally('<table><tr><th>H</th></tr><tr><td>d</td></tr></table>')).toBe(95);
    expect(A.scoreChunkLocally('<table><tr><td>d</td></tr></table>')).toBe(90);
  });
  it('penalizes empty and generic-text links (-5 each)', () => {
    expect(A.scoreChunkLocally('<a href="x"></a>')).toBe(95);
    expect(A.scoreChunkLocally('<a href="x">click here</a>')).toBe(95);
  });
  it('penalizes a skipped heading level (-5)', () => {
    expect(A.scoreChunkLocally('<h1>A</h1><h3>B</h3>')).toBe(95);
  });
  it('clamps to a 0..100 range', () => {
    const many = '<img src="x">'.repeat(20); // 20 * -10 = -200 -> clamp 0
    expect(A.scoreChunkLocally(many)).toBe(0);
  });
});
