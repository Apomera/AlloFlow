// S7 (deep dive 2026-07-02): _normTokenForDiff single-sourcing drift sentinel.
// The canonical unicode token fold lives in doc_pipeline (_alloNormTokenForDiff, exported as
// the normTokenForDiff static). The view delegates at runtime but keeps a FALLBACK copy for
// load-order edge cases (_viewNormTokenFallback). This test pins the two to identical
// behavior — the exact drift class that bit on 2026-06-23, when a fold added to one copy
// made the pipeline's residual missing-word count disagree with the view's restoration UI.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const dp = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const vp = fs.readFileSync(path.join(root, 'view_pdf_audit_source.jsx'), 'utf8');

// Extract a function body by evaluating the fold chain against probe strings.
function extractFold(src, marker, wrap) {
  const idx = src.indexOf(marker);
  if (idx === -1) return null;
  const slice = src.slice(idx, idx + 1400);
  const bodyMatch = slice.match(wrap);
  if (!bodyMatch) return null;
  // eslint-disable-next-line no-new-func
  return new Function('t', 'return ' + bodyMatch[1] + ';');
}

const dpFold = extractFold(
  dp,
  'var _alloNormTokenForDiff = function (t) {',
  /return (String\(t \|\| ''\)[\s\S]*?\.replace\(\/\\s\+\/g, ''\));/
);
const vpFold = extractFold(
  vp,
  'function _viewNormTokenFallback(s) {',
  /return (String\(s \|\| ''\)[\s\S]*?\.replace\(\/\\s\+\/g, ''\));/
);

describe('S7: view fallback token fold matches the pipeline canonical fold', () => {
  it('both copies were found in source', () => {
    expect(typeof dpFold).toBe('function');
    expect(typeof vpFold).toBe('function');
  });
  const probes = [
    'straight-forward',            // line-break hyphen fold
    'di­vide',                // soft hyphen
    'ﬁnal ﬂight',        // fi / fl ligatures
    'eﬀort oﬃce suﬄate', // ff / ffi / ffl
    '“quoted” ‘text’', // smart quotes
    'zero​width‌‍﻿join', // zero-width + BOM
    'Mixed‐Case‑Words',  // U+2010/2011 hyphens
    're—sign 1-2',            // em-dash + numeric hyphen must NOT fold
    '', '   ', null, undefined,    // degenerate inputs
  ];
  // vpFold takes (s) but extractFold binds the param name 't' — rebuild with matching name
  it('identical output on every probe (incl. the NOT-folded classes)', () => {
    for (const p of probes) {
      // Both extracted functions received parameter name 't'; the view body references 's'.
      // Re-extract the view body with 's' bound instead.
      const vSlice = vp.slice(vp.indexOf('function _viewNormTokenFallback(s) {'), vp.indexOf('function _viewNormTokenFallback(s) {') + 1400);
      const vBody = vSlice.match(/return (String\(s \|\| ''\)[\s\S]*?\.replace\(\/\\s\+\/g, ''\));/)[1];
      // eslint-disable-next-line no-new-func
      const vFn = new Function('s', 'return ' + vBody + ';');
      expect(vFn(p)).toBe(dpFold(p));
    }
  });
  it('the two view call sites delegate to the shared helper (no fresh inline copies)', () => {
    const inlineCopies = (vp.match(/const _normTokenForDiff = \(s\) =>/g) || []).length;
    expect(inlineCopies).toBe(0);
    expect((vp.match(/const _normTokenForDiff = _normTokenForDiffShared/g) || []).length).toBe(2);
  });
});
