// Table merge/split slice (2026-06-17), unblocked by the content-preservation gate. Honest scope:
// MERGE a row's cells into one spanning cell (CONCATENATES — nothing lost; validated by the gate's
// declared 'merge'/containment delta) and column-span UNMERGE (text stays in the first cell, rest
// empty — passes the default equality gate). Arbitrary multi-cell selection + rowspan-split are
// content-ambiguous and deferred. Additive + reversible via the same readback / mini-audit revert.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const gs = src.indexOf('function _tableContentPreserved(beforeHtml, afterHtml, index, op) {');
const ge = src.indexOf('\nvar createDocPipeline', gs);
const { _tableContentPreserved } = new Function(src.slice(gs, ge) + '\n; return { _tableContentPreserved };')();

const toolFn = (name, nextMarker) => {
  const s = src.indexOf(name + ': {');
  const e = src.indexOf(nextMarker, s);
  return new Function('return {' + src.slice(s, e).replace(/,\s*$/, '') + '};')()[name].fn;
};
const fix_table_merge_row = toolFn('fix_table_merge_row', 'fix_table_unmerge_cell:');
const fix_table_unmerge_cell = toolFn('fix_table_unmerge_cell', 'fix_input_label:');

const wrap = (b) => `<!DOCTYPE html><html lang="en"><body><main>${b}</main></body></html>`;
const parse = (h) => new DOMParser().parseFromString(h, 'text/html');

describe('fix_table_merge_row — combine a row into one spanning cell (content concatenated)', () => {
  it('merges a 3-cell header row into one <th colspan=3 scope=colgroup> with all text', () => {
    const before = wrap('<table><tr><th>Quarterly</th><th>Sales</th><th>Report</th></tr><tr><td>x</td><td>y</td><td>z</td></tr></table>');
    const after = fix_table_merge_row(before, { index: 0, rowIndex: 0 });
    const d = parse(after);
    const top = d.querySelectorAll('tr')[0].querySelectorAll('th, td');
    expect(top.length).toBe(1);
    expect(top[0].getAttribute('colspan')).toBe('3');
    expect(top[0].getAttribute('scope')).toBe('colgroup');
    expect(top[0].textContent).toBe('Quarterly Sales Report'); // nothing lost
  });
  it('the merge PASSES the gate under the declared merge/containment delta', () => {
    const before = wrap('<table><tr><th>A</th><th>B</th></tr></table>');
    const after = fix_table_merge_row(before, { index: 0, rowIndex: 0 });
    const r = _tableContentPreserved(before, after, 0, 'merge');
    expect(r.preserved).toBe(true);
    expect(r.op).toBe('merge');
    expect(r.reason).toBe('ok-merged');
  });
  it('the gate CATCHES a merge that actually dropped text (containment fails)', () => {
    const before = wrap('<table><tr><th>A</th><th>B</th></tr></table>');
    const fakeAfter = wrap('<table><tr><th colspan="2">A</th></tr></table>'); // "B" lost
    const r = _tableContentPreserved(before, fakeAfter, 0, 'merge');
    expect(r.preserved).toBe(false);
    expect(r.lost).toContain('B');
  });
  it('hardened: word-aware — a dropped "10" is NOT masked by a present "100" (no substring false-pass)', () => {
    const before = wrap('<table><tr><td>10</td><td>20</td></tr></table>');
    const fakeAfter = wrap('<table><tr><td colspan="2">100</td></tr></table>'); // "10"/"20" gone, "100" added
    const r = _tableContentPreserved(before, fakeAfter, 0, 'merge');
    expect(r.preserved).toBe(false);
    expect(r.lost).toContain('10');
  });
});

describe('fix_table_unmerge_cell — split a colspan cell back (text in first, rest empty)', () => {
  it('splits colspan=3 into 3 cells, text in the first, and PRESERVES content (default gate)', () => {
    const before = wrap('<table><tr><th colspan="3">Section A</th></tr><tr><td>1</td><td>2</td><td>3</td></tr></table>');
    const after = fix_table_unmerge_cell(before, { index: 0 });
    const d = parse(after);
    const top = d.querySelectorAll('tr')[0].querySelectorAll('th, td');
    expect(top.length).toBe(3);
    expect(top[0].hasAttribute('colspan')).toBe(false);
    expect(top[0].textContent).toBe('Section A');
    expect(top[1].textContent).toBe(''); // honest: combined text can't be auto-distributed
    // content gate (default equality): the only non-empty text "Section A" survives → preserved
    expect(_tableContentPreserved(before, after, 0).preserved).toBe(true);
  });
  it('is a no-op (returns input) when there is no merged cell to split', () => {
    const before = wrap('<table><tr><td>a</td><td>b</td></tr></table>');
    expect(fix_table_unmerge_cell(before, { index: 0 })).toBe(before);
  });
});

describe('wiring: merge/split registered + declared-op gate on both paths', () => {
  it('processExpertCommand registers the tools + declares merge to the gate', () => {
    expect(src).toContain('fix_table_merge_row: 1, fix_table_unmerge_cell: 1 };');
    expect(src).toContain("var _tOp = _tAct.tool === 'fix_table_merge_row' ? 'merge' : null;");
    expect(src).toContain('_tableContentPreserved(currentHtml, resultHtml, _tIdx, _tOp)');
  });
  it('in-preview offers merge/unmerge chips + declares merge for the content check', () => {
    expect(src).toContain("['Merge the top row into one cell', 'merge_row']");
    expect(src).toContain("['Unmerge a merged cell', 'unmerge']");
    expect(src).toContain("out, 0, op === 'merge_row' ? 'merge' : null");
  });
  it('the interpreter knows the merge/unmerge tools', () => {
    expect(src).toContain("'- fix_table_merge_row: {index: N, rowIndex: R}");
    expect(src).toContain("'- fix_table_unmerge_cell: {index: N, rowIndex: R, cellIndex: C}");
  });
});
