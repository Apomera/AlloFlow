// Round-2 fixes from the adversarial verification workflow (2026-06-17). The first-round fast-follows
// were verified by 6 distinct-lens finders + refute-by-default skeptics, which surfaced real issues the
// first pass MISSED or INTRODUCED:
//  XSS-1 (HIGH): the rich/grid reconstructed-table path passed the NON-escaping sanitizeField as
//    _emitAccessibleTableHtml's `sanitize`, overriding its built-in escaper — raw vision text reached the
//    recon dangerouslySetInnerHTML sink. (The "grid path is already escaped" claim was false.)
//  XSS-2 (HIGH): the banner block (untrusted PDF title/eyebrow/subtitle) was interpolated unescaped.
//  XSS-3 (LOW): _imgAltSafe/_altSafe stripped quotes but not backslash (JS-string escape).
//  H2-1/H2-2 (MED/LOW): caption re-injection was instruction-blind (overrode "remove caption" + resurrected
//    the sr-only "Data table N" placeholder as a visible caption) and descendant-scoped (nested caption).
//  DEFER-1 (MED): the Workbench _preCmdHtml revert snapshot went stale on a non-Workbench in-preview edit.
//  F1/F2 (LOW-MED): the DOM table tools wrapped a bare fragment chunk in <html>/<body> chrome.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

// The table tools now `return _serializeDomEdit(html, doc)`, so inject that module-scope helper into the
// evaluated tool scope (it references nothing external).
const helperSrc = src.slice(src.indexOf('function _serializeDomEdit(originalHtml, doc) {'), src.indexOf('\n// Sanitize an AI-parsed'));
const toolFn = (name, nextMarker) => {
  const s = src.indexOf(name + ': {');
  const e = src.indexOf(nextMarker, s);
  if (s === -1 || e === -1) throw new Error('extract markers missing for ' + name);
  return new Function(helperSrc + '\nreturn {' + src.slice(s, e).replace(/,\s*$/, '') + '};')()[name].fn;
};
const ext = (marker, end, name) => {
  const s = src.indexOf(marker), e = src.indexOf(end, s);
  if (s === -1 || e === -1) throw new Error('extract markers missing for ' + name);
  return new Function(src.slice(s, e) + '\n; return ' + name + ';')();
};
const _emitAccessibleTableHtml = ext('function _emitAccessibleTableHtml(grid, opts) {', '\n// A surgical DOM table tool', '_emitAccessibleTableHtml');
const fix_table_caption = toolFn('fix_table_caption', 'fix_th_scope:');
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');

// ── F1/F2: fragment-aware serialization ──
describe('F1/F2 — DOM table tools match the INPUT shape (no <html>/<body> chrome on a fragment)', () => {
  it('a BARE fragment stays a fragment (no wrapper) but still gets the edit', () => {
    const out = fix_table_caption('<p>intro</p><table><tr><td>A</td></tr></table><p>after</p>', { index: 0, caption: 'Cap' });
    expect(out).not.toMatch(/<html[\s>]/i);
    expect(out).not.toMatch(/<body[\s>]/i);
    expect(out).toContain('<caption');
    expect(out).toContain('Cap');
    expect(out).toContain('<p>intro</p>'); // sibling content preserved, no truncation
  });
  it('a FULL document keeps its DOCTYPE + html/body wrapper (unchanged for the in-preview/full-doc callers)', () => {
    const out = fix_table_caption('<!DOCTYPE html><html lang="en"><body><table><tr><td>A</td></tr></table></body></html>', { index: 0, caption: 'Cap' });
    expect(out).toMatch(/<body[\s>]/i);
    expect(out).toContain('<caption');
  });
});

// ── XSS-1: grid path escaping ──
describe('XSS-1 — _emitAccessibleTableHtml escapes when given an escaping sanitize; the grid call now is', () => {
  const escSanitize = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const grid = { caption: '<script>evil()</script>', rows: [{ cells: [{ text: '<img src=x onerror=alert(1)>', isHeader: true, scope: 'col' }] }] };
  it('an escaping sanitize neutralizes a markup payload in caption + cell', () => {
    const out = _emitAccessibleTableHtml(grid, { sanitize: escSanitize });
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script>evil');
    expect(out).toContain('&lt;img');
  });
  it('PROOF the override mattered: a NON-escaping sanitize (the old bare sanitizeField) leaves the payload LIVE', () => {
    const out = _emitAccessibleTableHtml(grid, { sanitize: (v) => v });
    expect(out).toContain('<img src=x onerror'); // exactly the XSS the old grid call allowed
  });
  it('source: the grid renderer no longer passes the non-escaping bare sanitizeField', () => {
    expect(src).toContain('sanitize: (v) => escapeTextField(sanitizeField(v)),');
    expect(src).not.toContain('return _emitAccessibleTableHtml(block.grid, {\n                    sanitize: sanitizeField,');
  });
});

// ── XSS-2: banner escaping + sanitizer hardening ──
describe('XSS-2 — banner block is escaped + the write sanitizer kills unclosed <script>', () => {
  it('source: _bEyebrow/_bTitle/_bSubtitle route through escapeTextField', () => {
    expect(src).toContain("'\">' + escapeTextField(_bEyebrow) + '</div>'");
    expect(src).toContain("'\">' + escapeTextField(_bTitle) + '</div>'");
    expect(src).toContain("'\">' + escapeTextField(_bSubtitle) + '</div>'");
  });
  it('source: _sanitizeHtmlForWrite now strips an UNCLOSED <script src=…>', () => {
    expect(src).toContain(".replace(/<\\/?script\\b[^>]*>/gi, '')");
  });
});

// ── XSS-3: backslash stripped from JS-context alt ──
describe('XSS-3 — _imgAltSafe / _altSafe strip backslash (no JS-string delimiter escape)', () => {
  it('source: both alt-safe builders strip backslash before the quotes', () => {
    expect((src.match(/\.replace\(\/\\\\\/g, ''\)\.replace\(\/"\/g, ''\)\.replace\(\/'\/g, ''\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});

// ── H2-1 / H2-2: caption re-injection guards ──
describe('H2-1/H2-2 — caption re-injection is instruction-aware, sr-only-aware, direct-child only', () => {
  // mirror of the guard predicate in rebuildTableWithAI
  const reinject = (origCap, origIsSrOnly, instruction, gridCaption) => {
    const wantsRemoval = /\b(?:remove|delete|drop|no)\b[\s\S]*\bcaption\b/i.test(String(instruction || ''));
    const isPlaceholder = origIsSrOnly || /^Data table \d+$/.test(origCap);
    return !!(origCap && !wantsRemoval && !isPlaceholder && (!gridCaption || !String(gridCaption).trim()));
  };
  it('re-injects a real dropped caption (the H2 win still holds)', () => {
    expect(reinject('Quarterly Sales', false, 'make row 1 the header', '')).toBe(true);
  });
  it('does NOT re-inject when the instruction asked to remove the caption (H2-1a)', () => {
    expect(reinject('Quarterly Sales', false, 'rebuild and remove the caption', '')).toBe(false);
  });
  it('does NOT resurrect the sr-only "Data table N" placeholder (H2-1b) — by text or by class', () => {
    expect(reinject('Data table 3', false, 'fix headers', '')).toBe(false);
    expect(reinject('Some caption', true, 'fix headers', '')).toBe(false);
  });
  it('never overrides an AI-provided caption', () => {
    expect(reinject('Original', false, 'fix headers', 'AI chose this')).toBe(false);
  });
  it('source: the guards + the direct-child caption scan are present', () => {
    expect(src).toContain('var _wantsRemoval = /\\b(?:remove|delete|drop|no)\\b[\\s\\S]*\\bcaption\\b/i.test(String(instruction || \'\'));');
    expect(src).toContain("/^Data table \\d+$/.test(_origCap)");
    expect(src).toContain("if (table.children[_ci].tagName === 'CAPTION')"); // direct-child, not querySelector
    expect(src).not.toContain("var _origCapEl = table.querySelector('caption');"); // the descendant-scoped version is gone
  });
});

// ── DEFER-1: stale Workbench revert snapshot invalidated on a non-Workbench mutation ──
describe('DEFER-1 — the host mutation-sync invalidates the stale _preCmdHtml revert snapshot', () => {
  it('source: AlloFlowANTI.txt clears _preCmdHtml + dependent panels when a non-Workbench edit advances accessibleHtml', () => {
    expect(anti).toContain('prev._preCmdHtml ? { _preCmdHtml: null, _lastCmdDiff: null, _lastMiniAudit: null, _lastTableReadback: null } : {}');
  });
});
