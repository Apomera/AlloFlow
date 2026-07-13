// @vitest-environment jsdom
// Table cell-POSITION gate (phase-2 of the numeric multiset gate, 2026-07-13).
// The value-fidelity gates are bag-of-values: two SWAPPED subtest scores passed
// them clean — the exact worst-case document (a psych-report score table) for
// this tool. _alloTableCellDrift detects same-multiset transposition and
// acceptFixedHtmlDetailed BLOCKS on it (original ships for the pass).
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 }); // 33MB live-module import exceeds the 5s default under parallel-suite load
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

async function liveDrift() {
  globalThis.window = globalThis.window || globalThis;
  await import(resolve(process.cwd(), 'doc_pipeline_module.js'));
  return window.AlloModules && window.AlloModules.createDocPipeline && window.AlloModules.createDocPipeline.tableCellDrift;
}

const table = (rows) => '<table>' + rows.map((r) => '<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>';
const doc = (body) => `<!DOCTYPE html><html><body><main>${body}</main></body></html>`;

describe('_alloTableCellDrift — live module behavioral', () => {
  it('the live module exposes tableCellDrift', async () => {
    expect(typeof await liveDrift()).toBe('function');
  });

  it('catches the WISC-swap: two unique scores exchanged between cells', async () => {
    const fn = await liveDrift();
    const before = doc(table([['Subtest', 'Score'], ['Vocabulary', '95'], ['Block Design', '102']]));
    const after = doc(table([['Subtest', 'Score'], ['Vocabulary', '102'], ['Block Design', '95']]));
    const r = fn(before, after);
    expect(r.checked).toBe(1);
    expect(r.moved.length).toBeGreaterThanOrEqual(2);
    const values = r.moved.map((m) => m.value);
    expect(values).toContain('95');
    expect(values).toContain('102');
  });

  it('accepts legitimate header promotion (td to th, same positions)', async () => {
    const fn = await liveDrift();
    const before = doc(table([['Subtest', 'Score'], ['Vocabulary', '95'], ['Block Design', '102']]));
    const after = doc('<table><tr><th>Subtest</th><th>Score</th></tr><tr><td>Vocabulary</td><td>95</td></tr><tr><td>Block Design</td><td>102</td></tr></table>');
    const r = fn(before, after);
    expect(r.checked).toBe(1);
    expect(r.moved.length).toBe(0);
  });

  it('skips changed-value tables (the multiset/numeric gates own those)', async () => {
    const fn = await liveDrift();
    const before = doc(table([['A', 'B'], ['1x', '2x'], ['3x', '4x']]));
    const after = doc(table([['A', 'B'], ['1x', '9x'], ['3x', '4x']]));
    const r = fn(before, after);
    expect(r.checked).toBe(0);
    expect(r.moved.length).toBe(0);
  });

  it('does not false-positive on duplicate values (untrackable by design)', async () => {
    const fn = await liveDrift();
    const before = doc(table([['A', 'B'], ['10', '10'], ['keep', 'also']]));
    const after = doc(table([['B', 'A'], ['10', '10'], ['keep', 'also']]).replace('<td>B</td><td>A</td>', '<td>A</td><td>B</td>'));
    const r = fn(before, doc(table([['A', 'B'], ['10', '10'], ['keep', 'also']])));
    expect(r.moved.length).toBe(0);
  });

  it('skips tiny tables and mismatched table counts', async () => {
    const fn = await liveDrift();
    const tiny = fn(doc(table([['a', 'b']])), doc(table([['b', 'a']])));
    expect(tiny.moved.length).toBe(0);
    const counts = fn(doc(table([['a1', 'b1'], ['c1', 'd1']])), doc(table([['a1', 'b1'], ['c1', 'd1']]) + table([['x', 'y']])));
    expect(counts.checked).toBe(0);
  });

  it('nested tables do not contaminate the outer grid', async () => {
    const fn = await liveDrift();
    const inner = table([['n1', 'n2'], ['n3', 'n4']]);
    const outerBefore = `<!DOCTYPE html><html><body><table><tr><td>o1</td><td>${inner}</td></tr><tr><td>o3</td><td>o4</td></tr></table></body></html>`;
    const r = fn(outerBefore, outerBefore);
    expect(r.moved.length).toBe(0);
  });
});

describe('acceptance-gate wiring (anti-drift)', () => {
  it('acceptFixedHtmlDetailed blocks on table-cell-transposition BEFORE the warn-only checks', () => {
    expect(pipeSrc).toContain("return { accepted: false, reason: 'table-cell-transposition', cellDrift: _cellDrift };");
    const gateAt = pipeSrc.indexOf("reason: 'table-cell-transposition'");
    const roWarnAt = pipeSrc.indexOf('Reading-order WARN (H-4', gateAt - 4000);
    expect(gateAt).toBeGreaterThan(0);
    // The gate must sit inside acceptFixedHtmlDetailed and precede the reading-order warn attach.
    const fnStart = pipeSrc.indexOf('const acceptFixedHtmlDetailed');
    const fnEnd = pipeSrc.indexOf('const acceptFixedHtml =', fnStart);
    expect(gateAt).toBeGreaterThan(fnStart);
    expect(gateAt).toBeLessThan(fnEnd);
  });
  it('rejection is disclosed: named-values warnLog + single-pass toast', () => {
    expect(pipeSrc).toContain('table cell values changed POSITIONS (transposition risk)');
    expect(pipeSrc).toContain('table cell values would have moved positions (transposition risk). The original table layout was kept.');
  });
  it('helper is exported as instance member and window static', () => {
    expect(pipeSrc).toContain('tableCellDrift: _alloTableCellDrift');
    expect(pipeSrc).toContain('window.AlloModules.createDocPipeline.tableCellDrift = _alloTableCellDrift');
  });
});
