// Tests for the §1.5 table accessibility-correctness assertions (2026-06-14).
import { describe, it, expect } from 'vitest';
import { assertTableAccessibility } from './lib/table_accessibility_assertions.js';

const row = (...cells) => ({ cells });
const td = (text) => ({ text });
const th = (text, scope) => ({ text, isHeader: true, ...(scope ? { scope } : {}) });

describe('assertTableAccessibility (Beat-Adobe §1.5)', () => {
  it('accepts a grid whose headers carry col/row scope', () => {
    const grid = { rows: [row(th('Name', 'col'), th('Score', 'col')), row(th('Ada', 'row'), td('95'))] };
    expect(assertTableAccessibility(grid).ok).toBe(true);
  });

  it('rejects header cells with NO scope anywhere', () => {
    const grid = { rows: [row(th('Name'), th('Score')), row(td('Ada'), td('95'))] };
    expect(assertTableAccessibility(grid)).toEqual({ ok: false, reason: 'headers-without-scope' });
  });

  it('is a no-op when there are no header cells (assertion N/A)', () => {
    const grid = { rows: [row(td('a'), td('b')), row(td('c'), td('d'))] };
    expect(assertTableAccessibility(grid).ok).toBe(true);
  });

  it('passes when at least one header has scope (mixed)', () => {
    const grid = { rows: [row(th('A', 'col'), th('B'))] };
    expect(assertTableAccessibility(grid).ok).toBe(true);
  });

  it('rejects an entirely-empty row (silent vision failure)', () => {
    const grid = { rows: [row(th('A', 'col'), th('B', 'col')), row(td(''), td('   '))] };
    expect(assertTableAccessibility(grid)).toEqual({ ok: false, reason: 'row-1-all-empty' });
  });

  it('does not reject a row that merely has SOME empty cells', () => {
    const grid = { rows: [row(th('A', 'col'), th('B', 'col')), row(td('x'), td(''))] };
    expect(assertTableAccessibility(grid).ok).toBe(true);
  });

  it('handles empty / malformed input without throwing', () => {
    expect(assertTableAccessibility(null).ok).toBe(true);
    expect(assertTableAccessibility({ rows: [] }).ok).toBe(true);
  });
});
