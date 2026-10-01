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
    expect(docSrc).toContain("'<span class=\"alloflow-anno-item-meta\">' + esc(title)"); // sidebar meta
  });
});

describe('perf-pdffix-snapshots — the undo handler frees the full-doc snapshot', () => {
  it('anti-drift: the Undo state update nulls preRestoreHtml', () => {
    expect(viewSrc).toContain('undone: true, preRestoreHtml: null');
  });
});

describe('sec-annot-storekey — per-student namespace on shared devices', () => {
  it('uses one privacy gate before answer or annotation storage is restored', () => {
    expect(docSrc).toContain('window.__alloflowGetLearnerWorkspace = (function ()');
    expect((docSrc.match(/await window\.__alloflowGetLearnerWorkspace\(\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(docSrc).toContain("var STORE_KEY = (_workspacePersist && _annoDocId) ? ('alloflow-annotations:v2|'");
    expect(docSrc).toContain("'allo-response:v2:' + _documentId + ':u:' + encodeURIComponent(_docNick)");
    expect(docSrc).toContain('alloflow-storage-migration:v2:annotations:');
    expect(docSrc).toContain('alloflow-storage-migration:v2:responses:');
    expect(docSrc).toContain('if (current !== null) return current;');
    expect(docSrc).not.toContain("+ (_annoNick ? '|u:' + _annoNick : '')");
    expect(docSrc).not.toContain("+ (_docNick ? '|u:' + _docNick : '')");
  });

  it('keeps one-time sessions out of learner-work storage while preserving live collection', () => {
    expect(docSrc).toContain('var saved = STORE_KEY ? localStorage.getItem(STORE_KEY) : null;');
    expect(docSrc).toContain('if (!STORE_KEY) return;');
    expect((docSrc.match(/if \(!_storageEnabled\) return;/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(docSrc).toContain("localStorage.setItem(storageKey, value && value !== '[]' ? value : '')");
    expect(docSrc).toContain("const value = String(tx.value == null ? '' : tx.value);");
    expect(docSrc).toContain("const value = String(bx.value == null ? '' : bx.value);");
  });

  it('bypasses the learner prompt for worksheets and dedicated print windows', () => {
    expect(docSrc).toContain("window.__alloflowPrintExport === true");
    expect(docSrc).toContain("workspacePromise = Promise.resolve(publish('', false));");
  });
});
