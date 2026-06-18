// AI free-form table rebuild (the riskiest table-refinement slice, 2026-06-17). Safe by THREE layers:
// (1) the AI returns a NEUTRAL GRID, not HTML — our _emitAccessibleTableHtml builds the markup we
// control; (2) the content gate is BLOCKING here — if the rebuilt table dropped OR hallucinated any
// cell text it's REJECTED (table unchanged); (3) semantic readback + accept/revert on top. The AI call
// itself is external, so we prove the load-bearing safety CHAIN functionally (grid→emit→gate) and
// source-assert the wiring + that the gate is wired as a REJECT, not just a report.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const ext = (marker, end, name) => {
  const s = src.indexOf(marker), e = src.indexOf(end, s);
  if (s === -1 || e === -1) throw new Error('extract markers missing for ' + name);
  return new Function(src.slice(s, e) + '\n; return ' + name + ';')();
};
const _emitAccessibleTableHtml = ext('function _emitAccessibleTableHtml(grid, opts) {', '\n// Sanitize an AI-parsed', '_emitAccessibleTableHtml');
const _tableContentPreserved = ext('function _tableContentPreserved(beforeHtml, afterHtml, index, op) {', '\nvar createDocPipeline', '_tableContentPreserved');

const wrap = (b) => `<!DOCTYPE html><html><body>${b}</body></html>`;
// the rebuild's safety chain: serialize the AI grid, then gate vs the original (op='merge' = word multiset)
const rebuildGate = (originalTableHtml, grid) => {
  const newTableHtml = _emitAccessibleTableHtml(grid, {});
  return { newTableHtml, content: _tableContentPreserved(wrap(originalTableHtml), wrap(newTableHtml), 0, 'merge') };
};

const ORIG = '<table><tr><td>Quarter</td><td>Sales</td></tr><tr><td>Q1</td><td>10</td></tr></table>';

describe('AI rebuild safety chain — grid → emitter → BLOCKING content gate', () => {
  it('a FAITHFUL restructure (same words, headers fixed) PASSES the gate', () => {
    const grid = { rows: [
      { cells: [{ text: 'Quarter', isHeader: true, scope: 'col' }, { text: 'Sales', isHeader: true, scope: 'col' }] },
      { cells: [{ text: 'Q1', isHeader: true, scope: 'row' }, { text: '10' }] },
    ] };
    const { newTableHtml, content } = rebuildGate(ORIG, grid);
    expect(content.preserved).toBe(true);
    expect(newTableHtml).toContain('scope="col"');   // structure our code built
    expect(newTableHtml).toContain('scope="row"');
  });

  it('a rebuild that DROPPED a cell is REJECTED (lost word caught)', () => {
    const grid = { rows: [
      { cells: [{ text: 'Quarter', isHeader: true, scope: 'col' }, { text: 'Sales', isHeader: true, scope: 'col' }] },
      { cells: [{ text: 'Q1', isHeader: true, scope: 'row' }] }, // "10" dropped
    ] };
    const { content } = rebuildGate(ORIG, grid);
    expect(content.preserved).toBe(false);
    expect(content.lost).toContain('10');
  });

  it('a rebuild that HALLUCINATED text is REJECTED (added word caught — the hardened gate)', () => {
    const grid = { rows: [
      { cells: [{ text: 'Quarter', isHeader: true, scope: 'col' }, { text: 'Sales', isHeader: true, scope: 'col' }] },
      { cells: [{ text: 'Q1', isHeader: true, scope: 'row' }, { text: '10' }, { text: 'estimated' }] }, // invented
    ] };
    const { content } = rebuildGate(ORIG, grid);
    expect(content.preserved).toBe(false);
    expect(content.added).toContain('estimated');
  });

  it('an AI caption is allowed (caption is metadata — not counted as added content)', () => {
    const grid = { caption: 'Quarterly sales', rows: [
      { cells: [{ text: 'Quarter', isHeader: true, scope: 'col' }, { text: 'Sales', isHeader: true, scope: 'col' }] },
      { cells: [{ text: 'Q1', isHeader: true, scope: 'row' }, { text: '10' }] },
    ] };
    const { newTableHtml, content } = rebuildGate(ORIG, grid);
    expect(content.preserved).toBe(true);          // caption words ("Quarterly","sales") don't fail it
    expect(newTableHtml).toContain('<caption');
  });
});

describe('wiring: rebuildTableWithAI is grid-not-HTML, blocking, fenced, validated', () => {
  it('proposes a neutral grid and serializes via the emitter (structure we control)', () => {
    expect(src).toContain('const rebuildTableWithAI = async (html, tableIndex, instruction) =>');
    expect(src).toContain('"rows":[{"cells":[{"text":"<cell text>"');     // neutral-grid schema, not HTML
    expect(src).toContain('newTableHtml = _emitAccessibleTableHtml(grid, {})');
  });
  it('the content gate is BLOCKING — rejects on any loss/hallucination', () => {
    expect(src).toContain("if (content && content.checked && !content.preserved) {\n      return { rejected: true, reason: 'content-lost'");
  });
  it('fences the untrusted instruction + table HTML (#29) and validates the grid shape', () => {
    expect(src).toContain('_neutralizePromptFence(String(instruction');
    expect(src).toContain('_neutralizePromptFence(originalTableHtml.slice(0, 8000))');
    expect(src).toContain("if (!grid || !Array.isArray(grid.rows) || grid.rows.length === 0) return { rejected: true, reason: 'bad-grid'");
    expect(src).toContain("typeof r.cells[j].text !== 'string'");
  });
  it('the Workbench "rebuild table" command routes to it + surfaces a REJECT honestly', () => {
    expect(src).toContain('command.match(/^\\s*(?:rebuild|restructure)(?:\\s+the)?\\s+table');
    expect(src).toContain('var _rb = await rebuildTableWithAI(currentHtml, _rbIdx, _rbInstr);');
    expect(src).toContain('⛔ Rebuild REJECTED');
  });
});

// ── Adversarial-review fixes (2026-06-17) ──
const _validateTableGrid = ext('function _validateTableGrid(grid) {', '\nfunction _normLocatorText', '_validateTableGrid');
// mirror of the object-anchored parse the fix uses (the array parser shredded {rows:[…]})
const objParse = (raw) => {
  try {
    let s = String(raw == null ? '' : raw).trim();
    if (s.indexOf('```') !== -1) { const p = s.split('```'); s = (p[1] || p[0] || '').replace(/^\s*(?:json|js)\s*/i, '').trim(); if (s.lastIndexOf('```') !== -1) s = s.substring(0, s.lastIndexOf('```')).trim(); }
    const b = s.indexOf('{'), e = s.lastIndexOf('}'); if (b >= 0 && e > b) s = s.substring(b, e + 1);
    return JSON.parse(s);
  } catch (_) { return null; }
};

describe('fix #0 — the grid object parses (was: array parser shredded {rows:[…]})', () => {
  it('a top-level {caption,rows:[…]} object survives parsing with .rows intact', () => {
    const g = objParse('```json\n{"caption":"Q","rows":[{"cells":[{"text":"A","isHeader":true,"scope":"col"}]}]}\n```');
    expect(Array.isArray(g.rows)).toBe(true);      // the old slice-first-[-to-last-] would have lost this
    expect(g.rows[0].cells[0].text).toBe('A');
  });
  it('source no longer routes the rebuild grid through the array-oriented shared parser', () => {
    const fn = src.slice(src.indexOf('const rebuildTableWithAI'), src.indexOf('const processExpertCommand'));
    expect(fn).not.toContain('repairAndParseJsonShared('); // not CALLED (a comment may name it)
    expect(fn).toContain('var _gb = _gs.indexOf(\'{\'), _ge = _gs.lastIndexOf(\'}\');');
  });
});

describe('fix #3 — the rebuild validates grid geometry/scope before emitting', () => {
  it('calls _validateTableGrid and rejects on !ok', () => {
    expect(src).toContain('var _gv = _validateTableGrid(grid);');
    expect(src).toContain("if (!_gv || !_gv.ok) return { rejected: true, reason: 'bad-grid'");
  });
  it('_validateTableGrid rejects an overlapping / inconsistent-width grid', () => {
    const bad = { rows: [ { cells: [{ text: 'A', colspan: 3 }] }, { cells: [{ text: 'B' }] } ] }; // width 3 vs 1
    expect(_validateTableGrid(bad).ok).toBe(false);
    const good = { rows: [ { cells: [{ text: 'A', isHeader: true, scope: 'col' }, { text: 'B', isHeader: true, scope: 'col' }] }, { cells: [{ text: 'x' }, { text: 'y' }] } ] };
    expect(_validateTableGrid(good).ok).toBe(true);
  });
});

// ── Bug-hunt H2 (2026-06-17): the content gate compares CELL text only — it cannot see <caption>. A
// rebuild that DROPPED the original caption would pass the "BLOCKING" gate with a false all-clear. The
// fix re-injects the original caption when the AI grid omitted it (content-preserving). Functionally
// prove the re-injection rule on the same grid the rebuild feeds the emitter, + source-assert the wiring.
describe('H2 — a dropped <caption> is re-injected before emit (the gate is caption-blind)', () => {
  // mirror of the re-injection rule: original caption survives when the AI grid omitted it
  const reinject = (origCap, grid) => {
    if (origCap && (!grid.caption || !String(grid.caption).trim())) grid.caption = origCap;
    return grid;
  };
  it('an empty AI caption is replaced by the original; the emitted table keeps the caption text', () => {
    const grid = reinject('Table 3: Sales', { caption: '', rows: [
      { cells: [{ text: 'Quarter', isHeader: true, scope: 'col' }, { text: 'Sales', isHeader: true, scope: 'col' }] },
      { cells: [{ text: 'Q1', isHeader: true, scope: 'row' }, { text: '10' }] },
    ] });
    expect(_emitAccessibleTableHtml(grid, {})).toContain('Table 3: Sales'); // no longer silently dropped
  });
  it('a non-empty AI caption is NOT overridden (the user may have asked to change it)', () => {
    const grid = reinject('Old caption', { caption: 'New caption', rows: [{ cells: [{ text: 'A' }] }] });
    expect(grid.caption).toBe('New caption');
  });
  it('source: the rebuild reads the original <caption> and re-injects only when the grid caption is empty', () => {
    const fn = src.slice(src.indexOf('const rebuildTableWithAI'), src.indexOf('const processExpertCommand'));
    expect(fn).toContain("var _origCapEl = table.querySelector('caption');");
    expect(fn).toContain('if (_origCap && (!grid.caption || !String(grid.caption).trim())) grid.caption = _origCap;');
  });
});

describe('fix #1 — honesty: the gate is reorder-blind, so placement is flagged not claimed correct', () => {
  it('the rebuild appends a placement caveat to the readback + softens the toast', () => {
    expect(src).toContain('confirm the values landed in the RIGHT cells in the preview before keeping');
    expect(src).toContain('cell PLACEMENT isn’t auto-verified; check the preview');
    expect(src).not.toContain('✓ Content preserved — no cell text dropped or invented.'); // the overclaiming line is gone
  });
});
