// Reading-order preservation guard (S3, 2026-06-23). The deterministic prerequisite for block-restyle /
// any structure transform: it certifies a transform DID NOT reorder or drop content WITHOUT trusting the
// (throttle-prone, possibly-partial) AI audit. Reordering or dropping content silently corrupts the
// screen-reader reading order + the tagged-PDF MCID linkage — the b0d24ae3 content-loss scar class.
//
// The contract: the BEFORE reading-order token sequence (document-order text) must remain a SUBSEQUENCE of
// AFTER's. Additive wrapping/labels are fine (extra tokens allowed); REORDER or DROP breaks the subsequence
// → ok:false → the caller reverts. These tests recompute the expected verdict independently of the impl.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const _s = dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {');
const _e = dp.indexOf('\n  return _r;\n}', _s) + '\n  return _r;\n}'.length;
if (_s === -1 || _e < 0) throw new Error('extraction markers for checkReadingOrderPreserved missing');
const checkReadingOrderPreserved = new Function(
  dp.slice(_s, _e) + '\nreturn checkReadingOrderPreserved;'
)();

describe('checkReadingOrderPreserved: PASS when content + order are preserved (additive structure ok)', () => {
  it('identical html → ok', () => {
    const h = '<body><h2>Intro</h2><p>The quick brown fox jumps.</p></body>';
    const r = checkReadingOrderPreserved(h, h);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('preserved');
    expect(r.droppedToken).toBeNull();
  });

  it('a paragraph re-styled into a callout (wrapped, same text) → ok', () => {
    const before = '<body><p>Remember to submit the form by Friday.</p></body>';
    const after = '<body><aside role="note"><p>Remember to submit the form by Friday.</p></aside></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(true);
  });

  it('a heading/label ADDED in front of the same content → ok (additions allowed)', () => {
    const before = '<body><p>Steps to complete the assignment.</p></body>';
    const after = '<body><h3>Note</h3><p>Steps to complete the assignment.</p></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(true);
  });

  it('a flat paragraph split into a list — same tokens, same order → ok', () => {
    const before = '<body><p>apples bananas cherries</p></body>';
    const after = '<body><ul><li>apples</li><li>bananas</li><li>cherries</li></ul></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(true);
  });

  it('whitespace / casing / punctuation differences do not count as changes', () => {
    const before = '<body><p>Hello,   World!</p></body>';
    const after = '<body><p>hello world</p></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(true);
  });

  it('<script>/<style> content is ignored (not part of reading order)', () => {
    const before = '<body><p>visible text here</p></body>';
    const after = '<body><style>.x{color:red}</style><p>visible text here</p><script>var z=1;</script></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(true);
  });
});

describe('checkReadingOrderPreserved: FAIL when content is dropped or reordered', () => {
  it('dropped content → ok:false and names the dropped token', () => {
    const before = '<body><p>alpha beta gamma delta</p></body>';
    const after = '<body><p>alpha beta delta</p></body>';   // "gamma" dropped
    const r = checkReadingOrderPreserved(before, after);
    expect(r.ok).toBe(false);
    expect(r.droppedToken).toBe('gamma');
    expect(r.reason).toMatch(/reading order changed or content dropped/);
  });

  it('a moved block (reordered reading order) → ok:false', () => {
    // the conclusion paragraph pulled to the top, intro pushed down
    const before = '<body><p>first intro sentence</p><p>second conclusion sentence</p></body>';
    const after = '<body><p>second conclusion sentence</p><p>first intro sentence</p></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(false);
  });

  it('a swapped pair of words inside a sentence → ok:false', () => {
    const before = '<body><p>cats chase mice</p></body>';
    const after = '<body><p>mice chase cats</p></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(false);
  });

  it('whole document emptied → ok:false (everything dropped)', () => {
    const r = checkReadingOrderPreserved('<body><p>important content</p></body>', '<body></body>');
    expect(r.ok).toBe(false);
    expect(r.droppedToken).toBe('important');
  });
});

describe('checkReadingOrderPreserved: a duplicated tail still keeps the original order (PASS)', () => {
  // Duplication is a SEPARATE guardrail (pull-quotes should not duplicate into the flow); the reading-order
  // guard only asserts the original sequence survives in order — a duplicate appends extra tokens, which the
  // subsequence check tolerates. Documented so the contract is explicit, not an accident.
  it('content repeated after itself → still a subsequence → ok', () => {
    const before = '<body><p>one two three</p></body>';
    const after = '<body><p>one two three</p><blockquote>two three</blockquote></body>';
    expect(checkReadingOrderPreserved(before, after).ok).toBe(true);
  });
});

describe('checkReadingOrderPreserved: edge cases', () => {
  it('empty before → ok (nothing to preserve)', () => {
    expect(checkReadingOrderPreserved('', '<body><p>new content</p></body>').ok).toBe(true);
  });
  it('null/undefined inputs do not throw', () => {
    expect(() => checkReadingOrderPreserved(null, undefined)).not.toThrow();
    expect(checkReadingOrderPreserved(null, undefined).ok).toBe(true);
  });
  it('reports token counts for telemetry', () => {
    const r = checkReadingOrderPreserved('<body><p>a1 b2 c3</p></body>', '<body><p>a1 b2 c3 d4</p></body>');
    expect(r.beforeCount).toBe(3);
    expect(r.afterCount).toBe(4);
    expect(r.ok).toBe(true);
  });
});

describe('anti-drift: the guard is exported on the factory API', () => {
  it('checkReadingOrderPreserved is on the doc-pipeline factory return', () => {
    expect(dp).toMatch(/checkReadingOrderPreserved: checkReadingOrderPreserved,/);
  });
});
