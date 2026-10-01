// tbl-empty-table-latent (2026-06-15): when a rich-grid table block FAILS
// re-validation at render time, the old code fell through to a flat headers/rows
// path the block didn't have → it emitted an EMPTY <table> (silent data loss).
// The fix flattens grid.rows[].cells[].text into the flat shape before the flat
// path runs (degraded — scope/spans dropped — but non-empty + readable).
//
// We can't cleanly extract the giant render switch, so we (a) runtime-extract the
// REAL _validateTableGrid to prove the fallback branch is reachable, (b) mirror the
// inserted flatten logic as a pure helper and assert it yields non-empty content,
// and (c) anti-drift-guard that the source still contains the flatten branch anchor
// so this mirror can't silently diverge.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8')
  + '\n' + readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');
const start = src.indexOf('function _validateTableGrid(grid) {');
const end = src.indexOf('var createDocPipeline = function(deps) {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for the table-grid core missing');
const { _validateTableGrid } =
  new Function('warnLog', src.slice(start, end) + '; return { _validateTableGrid };')(() => {});

// Mirror of the inserted flatten branch (keep in sync; guarded by the anti-drift test).
function flattenGridToFlat(grid) {
  const out = {};
  const _gr = grid.rows;
  const _cellTxt = (cells) => (Array.isArray(cells) ? cells : []).map((c) => (c && c.text) || '');
  const _firstAllHeader = _gr[0] && Array.isArray(_gr[0].cells) && _gr[0].cells.length > 0 && _gr[0].cells.every((c) => c && c.isHeader);
  if (_firstAllHeader) {
    out.headers = _cellTxt(_gr[0].cells);
    out.rows = _gr.slice(1).map((r) => _cellTxt(r && r.cells));
  } else {
    out.rows = _gr.map((r) => _cellTxt(r && r.cells));
  }
  return out;
}

describe('table render fallback — flatten a revalidation-failed grid instead of empty <table>', () => {
  it('the chosen grid genuinely fails validation (so the fallback branch is reachable)', () => {
    // ragged: row 0 has 2 cols, row 1 has 1 → width mismatch
    const grid = { rows: [{ cells: [{ text: 'A', isHeader: true }, { text: 'B', isHeader: true }] }, { cells: [{ text: '1' }] }] };
    expect(_validateTableGrid(grid).ok).toBe(false);
  });

  it('flatten promotes a leading all-header row to headers and keeps every cell (non-empty)', () => {
    const grid = { rows: [{ cells: [{ text: 'A', isHeader: true }, { text: 'B', isHeader: true }] }, { cells: [{ text: '1' }, { text: '2' }] }] };
    const flat = flattenGridToFlat(grid);
    expect(flat.headers).toEqual(['A', 'B']);
    expect(flat.rows).toEqual([['1', '2']]);
  });

  it('flatten of a header-less grid makes every row a data row (no content dropped)', () => {
    const grid = { rows: [{ cells: [{ text: 'x' }, { text: 'y' }] }, { cells: [{ text: 'z' }] }] };
    const flat = flattenGridToFlat(grid);
    expect(flat.headers).toBeUndefined();
    expect(flat.rows).toEqual([['x', 'y'], ['z']]);
  });

  it('a flat render of the flattened grid is NOT an empty table (the regression guard)', () => {
    const grid = { rows: [{ cells: [{ text: 'A', isHeader: true }, { text: 'B', isHeader: true }] }, { cells: [{ text: '1' }] }] };
    const flat = flattenGridToFlat(grid);
    // minimal stand-in for the flat-path template (headers→thead, rows→tbody)
    const hdr = (flat.headers || []).length ? '<thead><tr>' + flat.headers.map((h) => '<th>' + h + '</th>').join('') + '</tr></thead>' : '';
    const body = '<tbody>' + (flat.rows || []).map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>';
    const html = '<table>' + hdr + body + '</table>';
    expect(html).toContain('>A<');
    expect(html).toContain('>1<');
    expect(html).not.toMatch(/<tbody><\/tbody>/); // old behavior produced exactly this
  });

  it('anti-drift: the source still carries the flatten branch (mirror cannot silently diverge)', () => {
    expect(src).toContain('flattening grid cells to a flat table');
    expect(src).toContain("!Array.isArray(block.headers) && !Array.isArray(block.rows)");
  });
});
