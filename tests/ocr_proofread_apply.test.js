// OCR proofread corrections are derived from the OCR text but applied to the HTML, which is built
// from the page images and is often already right. A correction that only ADDS words around its
// `wrong` text ("other casualty," -> "other casualty, or theft") turned the 1954 Form 1040 heading
// into "... or other casualty, or theft or theft" (keyless run, 2026-10-19). It now skips a site
// where the HTML already reads `right`. Runs the REAL apply loop sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync('doc_pipeline_source.jsx', 'utf8');
const loop = sliceBetween(SRC, '          let fixCount = 0;\n', '          if (fixCount > 0) {', { file: 'doc_pipeline_source.jsx' });
const apply = (html, corrections) => new Function('accessibleHtml', 'allCorrections', 'warnLog', loop + '\nreturn { html: accessibleHtml, fixCount };')(
  html, new Map(corrections.map((c) => [c.wrong, c])), () => {});

describe('OCR proofread corrections in the HTML', () => {
  it('skip a site that already reads `right` (the 1954 "or theft or theft")', () => {
    const html = '<h3>Losses from fire, storm, or other casualty, or theft</h3>';
    const r = apply(html, [{ wrong: 'other casualty,', right: 'other casualty, or theft' }]);
    expect(r.html).toBe(html);
    expect(r.fixCount).toBe(0);
  });
  it('look through markup: a tag between the words does not hide that the text is already right', () => {
    const html = '<p>other casualty,<em> or theft</em></p>';
    expect(apply(html, [{ wrong: 'other casualty,', right: 'other casualty, or theft' }]).html).toBe(html);
  });
  it('still insert the words where they are really missing', () => {
    const r = apply('<p>Losses from other casualty, and more.</p>', [{ wrong: 'other casualty,', right: 'other casualty, or theft' }]);
    expect(r.html).toBe('<p>Losses from other casualty, or theft and more.</p>');
    expect(r.fixCount).toBe(1);
  });
  it('handle words added BEFORE `wrong` the same way', () => {
    expect(apply('<p>paid by check or theft</p>', [{ wrong: 'theft', right: 'or theft' }]).html).toBe('<p>paid by check or theft</p>');
    expect(apply('<p>paid by check and theft</p>', [{ wrong: 'theft', right: 'or theft' }]).html).toBe('<p>paid by check and or theft</p>');
  });
  it('still fix an ordinary OCR misspelling, and never touch markup', () => {
    const r = apply('<main role="main"><p>the rnodern form</p></main>', [{ wrong: 'rnodern', right: 'modern' }, { wrong: 'main', right: 'Main' }]);
    expect(r.html).toBe('<main role="main"><p>the modern form</p></main>');
  });
});
