// Tests for the accessible-table reconstruction core (2026-06-14):
// _validateTableGrid (span-consistency) + _emitAccessibleTableHtml. These are the
// deterministic "accept-or-revert" half of the vision table-reconstruction — a
// grid that fails validation is reverted (image kept) rather than shipping broken
// table markup. Module-scope pure fns, extracted from doc_pipeline_source.jsx.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _validateTableGrid(grid) {');
const end = src.indexOf('var createDocPipeline = function(deps) {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for the table-grid core missing');
const slice = src.slice(start, end);
const { _validateTableGrid, _emitAccessibleTableHtml } =
  new Function('warnLog', slice + '; return { _validateTableGrid, _emitAccessibleTableHtml };')(() => {});

const row = (...cells) => ({ cells });
const td = (text, extra) => ({ text, ...(extra || {}) });
// Default header cells to scope:'col' so span-validation tests aren't tripped by
// the §1.5 headers-without-scope assertion; pass { scope: ... } to override.
const th = (text, extra) => ({ text, isHeader: true, scope: 'col', ...(extra || {}) });

describe('_validateTableGrid — span consistency', () => {
  it('accepts a plain rectangular grid', () => {
    const r = _validateTableGrid({ rows: [row(th('A'), th('B')), row(td('1'), td('2'))] });
    expect(r.ok).toBe(true);
    expect(r.cols).toBe(2);
  });

  it('rejects a ragged grid (a short row)', () => {
    const r = _validateTableGrid({ rows: [row(td('a'), td('b'), td('c')), row(td('x'), td('y'))] });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/width/);
  });

  it('reconciles colspan across rows', () => {
    // row 1 is one cell spanning 2 cols; row 2 is two single cells → both width 2
    const r = _validateTableGrid({ rows: [row(th('Header', { colspan: 2 })), row(td('1'), td('2'))] });
    expect(r.ok).toBe(true);
    expect(r.cols).toBe(2);
  });

  it('reconciles rowspan across rows', () => {
    // col 0 spans both rows; row 2 supplies only the right column
    const r = _validateTableGrid({ rows: [row(th('Side', { rowspan: 2 }), td('top')), row(td('bottom'))] });
    expect(r.ok).toBe(true);
    expect(r.cols).toBe(2);
  });

  it('rejects a rowspan that overflows past the last row', () => {
    const r = _validateTableGrid({ rows: [row(td('x', { rowspan: 2 }), td('y'))] });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/rowspan-overflow/);
  });

  it('rejects overlapping cells (a colspan colliding with a carried rowspan)', () => {
    // row1 col0 has rowspan2; row2 then tries to place 2 cells → width 3 ≠ 2 (or overlap)
    const r = _validateTableGrid({ rows: [row(td('a', { rowspan: 2 }), td('b')), row(td('c'), td('d'))] });
    expect(r.ok).toBe(false);
  });

  it('rejects empty input', () => {
    expect(_validateTableGrid({ rows: [] }).ok).toBe(false);
    expect(_validateTableGrid(null).ok).toBe(false);
  });

  // §1.5 accessibility-correctness assertions (now wired into _validateTableGrid).
  it('rejects header cells with NO scope anywhere (headers-without-scope)', () => {
    const grid = { rows: [row({ text: 'A', isHeader: true }, { text: 'B', isHeader: true }), row(td('1'), td('2'))] };
    expect(_validateTableGrid(grid)).toEqual({ ok: false, reason: 'headers-without-scope' });
  });
  it('accepts header cells once at least one has col/row scope', () => {
    const grid = { rows: [row(th('A'), th('B')), row(td('1'), td('2'))] }; // th() now defaults scope:col
    expect(_validateTableGrid(grid).ok).toBe(true);
  });
  it('rejects an entirely-empty row (row-N-all-empty — silent vision failure)', () => {
    const grid = { rows: [row(th('A'), th('B')), row(td(''), td('   '))] };
    expect(_validateTableGrid(grid)).toEqual({ ok: false, reason: 'row-1-all-empty' });
  });
  it('does not reject a header-less grid or a row with SOME empty cells', () => {
    expect(_validateTableGrid({ rows: [row(td('a'), td('b')), row(td('c'), td('d'))] }).ok).toBe(true);
    expect(_validateTableGrid({ rows: [row(th('A'), th('B')), row(td('x'), td(''))] }).ok).toBe(true);
  });
});

describe('_emitAccessibleTableHtml', () => {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  it('promotes an all-header first row to thead with scope="col"', () => {
    const html = _emitAccessibleTableHtml({ rows: [row(th('Name'), th('Age')), row(td('Ada'), td('36'))] }, { sanitize: esc });
    expect(html).toMatch(/<thead><tr><th scope="col"[^>]*>Name<\/th>/);
    expect(html).toContain('<tbody><tr>');
    expect(html).toContain('>Ada<');
  });

  it('emits scope="row" for row-header cells', () => {
    const html = _emitAccessibleTableHtml({ rows: [row(th('Q1', { scope: 'row' }), td('100'))] }, { sanitize: esc });
    expect(html).toContain('<th scope="row"');
  });

  it('emits colspan/rowspan attributes', () => {
    const html = _emitAccessibleTableHtml({ rows: [row(th('Span', { colspan: 2, rowspan: 3 }))] }, { sanitize: esc });
    expect(html).toContain('colspan="2"');
    expect(html).toContain('rowspan="3"');
  });

  it('renders a caption with the reconstruction note + data attribute', () => {
    const html = _emitAccessibleTableHtml({ caption: 'Scores', rows: [row(td('x'))] }, { sanitize: esc, reconNote: 'AI-reconstructed. ', reconAttr: true });
    expect(html).toContain('<caption');
    expect(html).toContain('AI-reconstructed. Scores');
    expect(html).toContain('data-allo-reconstructed="image"');
  });

  it('escapes cell text', () => {
    const html = _emitAccessibleTableHtml({ rows: [row(td('a < b & c'))] }, { sanitize: esc });
    expect(html).toContain('a &lt; b &amp; c');
  });

  it('defaults an unknown scope to col', () => {
    const html = _emitAccessibleTableHtml({ rows: [row(th('H', { scope: 'bogus' }))] }, { sanitize: esc });
    expect(html).toContain('scope="col"');
  });
});
