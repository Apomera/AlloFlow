// Structure-aware table content-preservation gate (table refinement, 2026-06-17). The pipeline's
// content gate is doc-wide char count (coarse) — it can't tell a header-promotion (content preserved,
// only tags changed) from an edit that dropped/scrambled cells. _tableContentPreserved compares the
// Nth table's CELL TEXTS (multiset) before vs after. Visible "✓ N cells preserved" confidence now +
// the foundation a future merge/split/AI slice flips from report→BLOCK. Fail-OPEN on unparseable so a
// hiccup never blocks a legit edit (accept/revert stays the real net).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

const gs = src.indexOf('function _tableContentPreserved(beforeHtml, afterHtml, index, op) {');
const ge = src.indexOf('\nvar createDocPipeline', gs);
if (gs === -1 || ge === -1) throw new Error('gate extraction markers missing');
const { _tableContentPreserved } = new Function(src.slice(gs, ge) + '\n; return { _tableContentPreserved };')();

// reuse the real deterministic tools to prove they PASS the gate
const toolFn = (name, nextMarker) => {
  const s = src.indexOf(name + ': {');
  const e = src.indexOf(nextMarker, s);
  return new Function('return {' + src.slice(s, e).replace(/,\s*$/, '') + '};')()[name].fn;
};
const fix_table_header_row = toolFn('fix_table_header_row', 'fix_table_header_col:');
const fix_table_mark_layout = toolFn('fix_table_mark_layout', 'fix_input_label:');

const wrap = (body) => `<!DOCTYPE html><html lang="en"><body><main>${body}</main></body></html>`;
const T = '<table><tr><td>Q1</td><td>10</td></tr><tr><td>Q2</td><td>20</td></tr></table>';

describe('_tableContentPreserved — proves a table edit kept every cell', () => {
  it('a header-row promotion (real tool) preserves all cells (td→th, content intact)', () => {
    const before = wrap(T);
    const after = fix_table_header_row(before, { index: 0 });
    const r = _tableContentPreserved(before, after, 0);
    expect(r.checked).toBe(true);
    expect(r.preserved).toBe(true);
    expect(r.beforeCount).toBe(4);
    expect(r.afterCount).toBe(4);
  });

  it('mark-as-layout (real tool) preserves all cells (th→td, content intact)', () => {
    const before = wrap('<table><tr><th scope="col">A</th><th scope="col">B</th></tr><tr><td>1</td><td>2</td></tr></table>');
    const after = fix_table_mark_layout(before, { index: 0 });
    expect(_tableContentPreserved(before, after, 0).preserved).toBe(true);
  });

  it('catches a DROPPED cell (the thing the coarse char gate misses)', () => {
    const before = wrap(T);
    const after = wrap('<table><tr><td>Q1</td><td>10</td></tr><tr><td>Q2</td></tr></table>'); // "20" gone
    const r = _tableContentPreserved(before, after, 0);
    expect(r.preserved).toBe(false);
    expect(r.lost).toContain('20');
    expect(r.reason).toBe('changed');
  });

  it('catches a SCRAMBLED/changed cell text (old lost + new added)', () => {
    const before = wrap(T);
    const after = wrap('<table><tr><td>Q1</td><td>10</td></tr><tr><td>Q2</td><td>99</td></tr></table>'); // 20→99
    const r = _tableContentPreserved(before, after, 0);
    expect(r.preserved).toBe(false);
    expect(r.lost).toContain('20');
    expect(r.added).toContain('99');
  });

  it('caption add does NOT count as content change (caption is metadata, excluded)', () => {
    const before = wrap(T);
    const after = wrap('<table><caption>Quarterly</caption><tr><td>Q1</td><td>10</td></tr><tr><td>Q2</td><td>20</td></tr></table>');
    expect(_tableContentPreserved(before, after, 0).preserved).toBe(true);
  });

  it('fail-OPEN (checked:false, preserved:true) when the table is missing/unparseable', () => {
    const r = _tableContentPreserved('<p>no table</p>', '<p>still none</p>', 0);
    expect(r.checked).toBe(false);
    expect(r.preserved).toBe(true); // never blocks a legit edit on a parse miss
  });
});

describe('wiring: the content check is surfaced on both refinement paths', () => {
  it('Workbench: processExpertCommand attaches tableReadback.content', () => {
    expect(src).toContain('tableReadback.content = _tableContentPreserved(currentHtml, resultHtml, _tIdx, _tOp)');
    expect(src).toContain('all ' + "' + tableReadback.content.afterCount + '" + ' cell(s) intact.');
  });
  it('in-preview: applyOp computes + returns content vs the ORIGINAL snapshot', () => {
    expect(src).toContain("content = originalHtml ? _tableContentPreserved('<!DOCTYPE html><html><body>' + originalHtml + '</body></html>', out, 0, op === 'merge_row' ? 'merge' : null) : null");
    expect(src).toContain('const res = applyOp(_cur, pair[1], arg, _snapshot);');
  });
  it('view: the readback card shows the preserved/changed line', () => {
    expect(view).toContain('pdfFixResult._lastTableReadback.content && pdfFixResult._lastTableReadback.content.checked');
    expect(view).toContain('✓ No content lost — all ');
    expect(view).toContain('⚠ Content changed: ');
  });
});
