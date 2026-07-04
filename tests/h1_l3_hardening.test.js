// H1 + L3 (previously deferred; done 2026-07-03, deterministic — no calibration needed).
//   H1 — STEM image intelligence (equation->spoken-math, chart->data-table, image-of-text transcription)
//        ran while extracted figures still carried __ALLOFLOW_DATAURL_FINAL_N__ placeholder tokens, so it
//        classified ZERO images (a silent no-op). MOVED to after the token->data:URL restore, where the
//        figures are real. Verified by source order (the tagger/pipeline isn't headless-runnable).
//   L3 — restoreSentencesDeterministic's "already-present" check used substring indexOf, so "states" was
//        found inside "statements" and a genuinely-missing sentence was marked present (content lost but
//        counted recovered). Now a word-boundary match.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

describe('H1 — STEM image intel runs AFTER the token restore (real images)', () => {
  it('the old pre-restore call site is gone (replaced by the MOVED marker)', () => {
    expect(src).toContain('STEM image intelligence MOVED to after the deferred-image token restore');
  });
  it('the classifier call now lives after the token-restore log', () => {
    expect(src).toContain('const _stemIntel = await describeAndClassifyImages(accessibleHtml, { cap: 10 });');
    const restoreIdx = src.indexOf('image data URL(s) from placeholder tokens');
    const stemIdx = src.indexOf('const _stemIntel = await describeAndClassifyImages');
    expect(restoreIdx).toBeGreaterThan(-1);
    expect(stemIdx).toBeGreaterThan(restoreIdx); // classify AFTER tokens are real data: URLs
  });
});

describe('L3 — sentence "already-present" uses a word boundary, not substring', () => {
  it('source pins the word-boundary check at both sites', () => {
    expect(src).toContain('const _wc = String(w).replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi');
    expect(src).toContain('word-boundary, not substring');
  });
  it('mirror: "states" is NOT found inside "statements"; whole words still match', () => {
    const wordInDoc = (w, doc) => {
      const wc = String(w).replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
      return !!wc && new RegExp('\\b' + wc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(doc);
    };
    expect(wordInDoc('states', 'the statements were clear')).toBe(false);
    expect(wordInDoc('states', 'the states were listed')).toBe(true);
    expect(wordInDoc('states.', 'various states are shown')).toBe(true); // trailing punct stripped
    expect(wordInDoc('assessment', 'the assessment procedures follow')).toBe(true);
  });
});
