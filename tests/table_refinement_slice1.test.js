// Table-refinement slice 1 (2026-06-17): deterministic table ops through the Expert Workbench +
// the plain-language SEMANTIC READBACK (the human check axe can't do — it verifies a valid <th scope>,
// never the RIGHT one). Purely additive: applies to the current HTML, keep = right / Revert = wrong
// via the existing mini-audit snapshot. This pins the two new tools + the readback + the wiring.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── extract _tableSemanticReadback (module-scope) ──
const rbStart = src.indexOf('function _tableSemanticReadback(html, index) {');
const rbEnd = src.indexOf('\nvar createDocPipeline', rbStart);
if (rbStart === -1 || rbEnd === -1) throw new Error('readback extraction markers missing');
const { _tableSemanticReadback } = new Function(src.slice(rbStart, rbEnd) + '\n; return { _tableSemanticReadback };')();

// ── extract the two new surgical-tool fns from the registry ──
// The DOM tools `return _serializeDomEdit(html, doc)`, so inject that module-scope helper into scope.
const _helperSrc = src.slice(src.indexOf('function _serializeDomEdit(originalHtml, doc) {'), src.indexOf('\n// Sanitize an AI-parsed'));
const toolFn = (name, nextMarker) => {
  const s = src.indexOf(name + ': {');
  const e = src.indexOf(nextMarker, s);
  if (s === -1 || e === -1) throw new Error('tool extraction markers missing for ' + name);
  const slice = src.slice(s, e).replace(/,\s*$/, '');
  return new Function(_helperSrc + '\nreturn {' + slice + '};')()[name].fn;
};
const fix_table_header_col = toolFn('fix_table_header_col', 'fix_table_mark_layout:');
const fix_table_mark_layout = toolFn('fix_table_mark_layout', 'fix_input_label:');

const wrap = (body) => `<!DOCTYPE html><html lang="en"><body><main>${body}</main></body></html>`;
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');

describe('fix_table_header_col — promote the first column to row headers', () => {
  it('turns each row\'s first <td> into <th scope="row">, leaving the rest as <td>', () => {
    const html = wrap('<table><tr><td>Q1</td><td>10</td></tr><tr><td>Q2</td><td>20</td></tr></table>');
    const d = parse(fix_table_header_col(html, { index: 0 }));
    const rows = d.querySelectorAll('tr');
    expect(rows[0].children[0].tagName.toLowerCase()).toBe('th');
    expect(rows[0].children[0].getAttribute('scope')).toBe('row');
    expect(rows[0].children[0].textContent).toBe('Q1');
    expect(rows[0].children[1].tagName.toLowerCase()).toBe('td'); // data cell untouched
    expect(rows[1].children[0].getAttribute('scope')).toBe('row');
  });
  it('an already-<th> first cell just gains scope="row" (no double-wrap)', () => {
    const html = wrap('<table><tr><th>Name</th><td>x</td></tr></table>');
    const d = parse(fix_table_header_col(html, { index: 0 }));
    expect(d.querySelector('th').getAttribute('scope')).toBe('row');
  });
});

describe('fix_table_mark_layout — remove a table from the a11y tree (guarded op)', () => {
  it('sets role=presentation and strips header semantics to plain <td>', () => {
    const html = wrap('<table><tr><th scope="col">A</th><th scope="col">B</th></tr><tr><td>1</td><td>2</td></tr></table>');
    const d = parse(fix_table_mark_layout(html, { index: 0 }));
    const t = d.querySelector('table');
    expect(t.getAttribute('role')).toBe('presentation');
    expect(t.querySelectorAll('th').length).toBe(0); // headers downgraded
    expect(t.textContent.replace(/\s+/g, '')).toBe('AB12'); // content preserved
  });
});

describe('_tableSemanticReadback — the plain-language meaning check', () => {
  it('describes column + row headers a screen reader will announce', () => {
    const html = wrap('<table><tr><th scope="col">Quarter</th><th scope="col">Sales</th></tr><tr><th scope="row">Q1</th><td>10</td></tr></table>');
    const r = _tableSemanticReadback(html, 0);
    expect(r.kind).toBe('data');
    expect(r.text).toContain('“Quarter”');
    expect(r.text).toContain('“Sales”');
    expect(r.text).toContain('“Q1”');
    expect(r.text).toContain('Is that the right meaning?');
  });
  it('LOUDLY warns when a table is marked layout (it left the a11y tree)', () => {
    const html = wrap('<table role="presentation"><tr><td>x</td><td>y</td></tr></table>');
    const r = _tableSemanticReadback(html, 0);
    expect(r.kind).toBe('layout');
    expect(r.text).toContain('will NOT announce');
  });
  it('flags a header-less data table (no row/column context)', () => {
    const r = _tableSemanticReadback(wrap('<table><tr><td>a</td><td>b</td></tr></table>'), 0);
    expect(r.kind).toBe('no-headers');
  });
});

describe('wiring: Workbench surfaces the readback, additive + revertible', () => {
  it('the interpreter knows the new table tools', () => {
    expect(src).toContain("'- fix_table_header_row: {index: N}");
    expect(src).toContain("'- fix_table_header_col: {index: N}");
    expect(src).toContain("'- fix_table_mark_layout: {index: N}");
  });
  it('processExpertCommand computes + returns tableReadback for a table op', () => {
    expect(src).toContain('tableReadback = _tableSemanticReadback(resultHtml, _tIdx)');
    expect(src).toContain('miniAudit: cmdAudit, tableReadback: tableReadback }');
  });
  it('the view renders the readback card and clears it on revert (so it stays keep-or-revert)', () => {
    expect(view).toContain('_lastTableReadback: result.tableReadback || null');
    expect(view).toContain('pdfFixResult._lastTableReadback && pdfFixResult._lastTableReadback.text');
    expect(view).toContain('_lastCmdDiff: null, _lastTableReadback: null'); // cleared on revert
  });
});
