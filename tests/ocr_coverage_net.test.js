// OCR tagged-PDF coverage safety net (2026-06-18). User report: scanned/OCR'd PDFs don't get ALL
// their text tagged. The tagger's text layer is built from OCR word/page data; text can be lost when
// a page fails OCR (empty), a page's geometry mismatches, or a non-Latin page has no Unicode font.
// Rather than blindly "fixing" each cause (which risks mis-placing text), the net is mechanism-
// agnostic: every scanned page with text is GUARANTEED at least a block text layer, and the per-page
// outcome (covered / incomplete / empty) is accounted + surfaced honestly so we never overclaim full
// coverage. This logic lives inside createTaggedPdf's per-page loop (can't be unit-executed), so we
// pin the load-bearing structure by source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const doc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const tagger = doc.slice(doc.indexOf('const createTaggedPdf ='), doc.indexOf('// ── Stage 4b'));

describe('OCR coverage net — per-page accounting', () => {
  it('declares the page-level counters', () => {
    expect(tagger).toContain('let _ocrPagesWithText = 0, _ocrPagesDrew = 0, _ocrPagesEmpty = 0;');
  });
  it('counts pages with text, and counts scanned pages that produced NO OCR text (blank/unreadable)', () => {
    expect(tagger).toContain('_ocrPagesWithText++;');
    // the else branch of `if (ocrText && ocrText.trim())` tallies empty pages
    expect(tagger).toMatch(/}\s*else\s*{[\s\S]*?_ocrPagesEmpty\+\+;/);
  });
});

describe('OCR coverage net — guaranteed text layer (no silent page drop)', () => {
  it('factors the block draw into a reusable helper so it can run as both fallback AND last resort', () => {
    expect(tagger).toContain('const _drawBlockLayer = async (countDrops) =>');
    // last-resort call does NOT re-tally drops the per-word path already counted
    expect(tagger).toContain('_drawBlockLayer(false)');
    expect(tagger).toContain('_drawBlockLayer(true)');
  });
  it('a page that drew NOTHING via per-word still gets a guaranteed block (only if the block was not already tried)', () => {
    expect(tagger).toContain('if (!_pageDrewAny && !_blockTried) { if (await _drawBlockLayer(false)) _pageDrewAny = true; }');
  });
  it('marks the per-word path as having drawn so the last-resort does not double-draw', () => {
    expect(tagger).toContain('_pageDrewAny = true;');
    expect(tagger).toContain('_blockTried = true;');
  });
  it('counts a page as covered only when it actually rendered usable text (non-Latin w/o font → not covered)', () => {
    expect(tagger).toContain('const _pageRenderable = _uniFont ? _pageStripped.length : (_pageStripped.length - _countNonWinAnsi(ocrText));');
    expect(tagger).toContain('if (_pageDrewAny && _pageRenderable >= Math.min(15, _pageStripped.length)) _ocrPagesDrew++;');
  });
});

describe('OCR coverage net — honest surfacing (never overclaim)', () => {
  it('computes incomplete pages and warns when whole pages have no usable text layer', () => {
    expect(tagger).toContain('_ocrPagesIncomplete = Math.max(0, _ocrPagesWithText - _ocrPagesDrew);');
    expect(tagger).toContain('if (_ocrPagesIncomplete > 0 || _ocrPagesEmpty > 0) {');
    expect(tagger).toMatch(/no searchable\/screen-reader text/);
  });
  it('returns the page-level coverage on the result so the UI can warn', () => {
    expect(doc).toContain('pagesWithText: _ocrPagesWithText, pagesCovered: _ocrPagesDrew, pagesIncomplete: _ocrPagesIncomplete, pagesEmpty: _ocrPagesEmpty');
  });
});
