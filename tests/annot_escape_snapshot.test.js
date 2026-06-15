// sec-annot-escape + perf-pdffix-snapshots (2026-06-15) — these fixes live inside a
// large annotation-runtime IIFE / a React onClick that aren't cleanly extractable, so
// we (a) unit-test the real esc() helper's logic and (b) anti-drift-guard that both
// untrusted innerHTML insertions are wrapped and the undo snapshot is freed.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const docSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// Extract the REAL esc() the annotation runtime now uses.
const m = docSrc.match(/function esc\(s\) \{ return String\(s == null \? '' : s\)[^\n]*\}/);
if (!m) throw new Error('annotation esc() helper not found');
const esc = new Function(m[0] + '\n; return esc;')();

describe('sec-annot-escape — esc() neutralizes HTML in untrusted annotation fields', () => {
  it('escapes &, <, >', () => {
    expect(esc('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(esc('a & b')).toBe('a &amp; b');
  });
  it('coerces non-strings and null safely', () => {
    expect(esc(null)).toBe('');
    expect(esc(42)).toBe('42');
  });
  it('leaves a plain author name untouched', () => {
    expect(esc('Ms. Rivera')).toBe('Ms. Rivera');
  });

  it('anti-drift: both author/title innerHTML insertions are wrapped in esc()', () => {
    expect(docSrc).toContain("esc(a.authorName || 'Voice note')");      // voice expanded-header
    expect(docSrc).toContain("'<div class=\"alloflow-anno-item-meta\">' + esc(title)"); // sidebar meta
  });
});

describe('perf-pdffix-snapshots — the undo handler frees the full-doc snapshot', () => {
  it('anti-drift: the Undo state update nulls preRestoreHtml', () => {
    expect(viewSrc).toContain('undone: true, preRestoreHtml: null');
  });
});

describe('sec-annot-storekey — per-student namespace on shared devices', () => {
  it('both exported-doc storage keys fold in the ?nickname= namespace (absent → unscoped, no orphaning)', () => {
    // annotation runtime STORE_KEY
    expect(docSrc).toContain("+ (_annoNick ? '|u:' + _annoNick : '')");
    // interactive-textarea/box autosave _docKey (the twin defect)
    expect(docSrc).toContain("+ (_docNick ? '|u:' + _docNick : '')");
    // both read the nickname from the URL param the submission flow already uses
    expect((docSrc.match(/URLSearchParams\(window\.location\.search\)\.get\('nickname'\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
