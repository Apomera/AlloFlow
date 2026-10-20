// Dual-OCR auto-restore candidate selection (1954 Form 1040 keyless run, 2026-10-19). The token
// normalizer folded em dashes into hyphens, so "$5,000—Use" became one token "5000-use" that the HTML
// (where </strong> split it) never contained: a false "Content recovery" appendix. And "---" (a
// markdown divider / dashed rule) counted as a word both engines saw and was spliced into a table
// header. Runs the REAL selection code sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync('doc_pipeline_source.jsx', 'utf8');
const code = sliceBetween(SRC, '          const _arWords = (s) =>', '          if (_arMissing.length > 0) {', { file: 'doc_pipeline_source.jsx' });
const missing = (tess, vis, src, html) => new Function('_arTess', '_arVis', 'extractedText', 'accessibleHtml', 'htmlToPlainText', '_ALLO_MARKER_RE',
  code + '\nreturn _arMissing.map((x) => x.word);')(tess, vis, src, html, (h) => h.replace(/<[^>]*>/g, ' '), /(?!)/g);

describe('auto-restore only asks for words that are really missing', () => {
  const SRC_TEXT = 'IF YOUR INCOME WAS LESS THAN $5,000—Use Tax Table. IF YOUR INCOME WAS $5,000 OR MORE—Compute tax.\n---\n| Line | Amount |';
  const HTML = '<p><strong>IF YOUR INCOME WAS LESS THAN $5,000</strong>—Use Tax Table.</p><p><strong>IF YOUR INCOME WAS $5,000 OR MORE</strong>—Compute tax.</p><table><tr><th>Line</th><th>Amount</th></tr></table>';
  it('em-dash-joined words are separate words, so markup between them is not a "loss"', () => {
    expect(missing(SRC_TEXT, SRC_TEXT, SRC_TEXT, HTML)).toEqual([]);
  });
  it('a token with no letter or digit ("---") is never a restore candidate', () => {
    expect(missing('a b ---', 'a b ---', 'Words here ---', '<p>Words here</p>')).toEqual([]);
  });
  it('a word both engines saw that the HTML really lost is still a candidate', () => {
    expect(missing(SRC_TEXT + ' Contributions', SRC_TEXT + ' Contributions', SRC_TEXT + ' Contributions', HTML)).toEqual(['contributions']);
  });
  it('hyphenated words and minus signs still join', () => {
    expect(missing('self-employment tax −5', 'self-employment tax −5', 'self-employment tax', '<p>self employment tax</p>')).toEqual(['self-employment']);
    // OCR writes U+2212 / U+2010 where the HTML has an ASCII hyphen: same word, not a loss.
    expect(missing('pre−tax non‐farm', 'pre−tax non‐farm', 'pre−tax non‐farm', '<p>pre-tax non-farm</p>')).toEqual([]);
  });
});
