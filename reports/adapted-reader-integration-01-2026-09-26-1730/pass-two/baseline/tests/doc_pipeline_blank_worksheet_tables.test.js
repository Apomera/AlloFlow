// A blank worksheet table must not be mistaken for a failed extraction.
//
// Teachers remediate forms — expense sheets, course trackers, sign-up grids —
// whose data cells are empty BY DESIGN. Two independent checks used to read
// "these cells are empty" as "the vision model silently failed":
//
//   1. _isSuspectExtraction flagged any table >50% empty, which sent it down a
//      re-extraction path costing two model calls (rich-grid, then legend) that
//      for a genuinely blank worksheet can only ever return null.
//   2. _validateTableGrid then REJECTED the correct rich transcription with
//      'row-N-all-empty' — so the flat table shipped with weaker semantics than
//      the re-extraction had already produced. Observed 2026-09-04: a merged
//      `<th scope="row" colspan="2">Total All Expenses</th>` was discarded and
//      shipped as a plain <td>, losing the row-header association.
//
// Both now treat a populated header row as proof the grid WAS read. These tests
// pin that, and equally pin that a genuine failure — no headers, empty rows —
// is still caught.
//
// The two functions are pure and self-contained (built-ins only), so they are
// lifted straight out of the source rather than reached through the 3.2MB
// module, which needs a browser.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

function extract(startMarker, endMarker) {
  const i = SRC.indexOf(startMarker);
  if (i === -1) throw new Error('start marker not found: ' + startMarker);
  const j = SRC.indexOf(endMarker, i);
  if (j === -1) throw new Error('end marker not found: ' + endMarker);
  return SRC.slice(i, j + endMarker.length);
}

const validateSrc = extract('function _validateTableGrid(grid) {', '\n  const _gridOk = { ok: true, cols: colCount, rows: grid.rows.length };\n  return _gridOk;\n}');
const suspectSrc = extract('const _isSuspectExtraction = (block) => {', '\n    return null;\n  };');

// eslint-disable-next-line no-new-func
const _validateTableGrid = new Function(validateSrc + '\nreturn _validateTableGrid;')();
// eslint-disable-next-line no-new-func
const _isSuspectExtraction = new Function(suspectSrc + '\nreturn _isSuspectExtraction;')();

const hdr = (t) => ({ text: t, isHeader: true, scope: 'col' });
const blank = () => ({ text: '' });

describe('blank worksheet tables are content, not extraction failures', () => {
  // ── _isSuspectExtraction ────────────────────────────────────────────────
  it('does not flag a fillable worksheet whose headers came through', () => {
    const worksheet = {
      type: 'table',
      caption: 'Blank worksheet for recording accessibility courses of interest.',
      headers: ['Date of Course/Class', 'Course/Class Name', 'Status'],
      rows: [['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']],
    };
    expect(_isSuspectExtraction(worksheet)).toBeNull();
  });

  // The exemption is deliberately narrow: it needs the emptiness to be UNIFORM.
  // A worksheet is blank in every data cell; a botched read is patchy. So an
  // expense sheet carrying a total label stays suspect and still gets its rich
  // re-extraction — which is the right outcome now that _validateTableGrid
  // ACCEPTS that transcription instead of discarding it, so the table is
  // repaired (gaining its merged row header) rather than merely re-reported.
  it('still flags a partially-filled sheet, leaving the re-extraction to improve it', () => {
    const expenses = {
      type: 'table',
      caption: 'Blank worksheet for recording training expenses.',
      headers: ['Expense Description', 'Date', 'Expense Amount'],
      rows: [['', '', ''], ['', '', ''], ['', '', ''], ['Total All Expenses', '', '']],
    };
    expect(_isSuspectExtraction(expenses)).toMatch(/table-mostly-empty/);
  });

  // The guard must not become a blanket amnesty for broken extractions.
  it('still flags a mostly-empty table whose headers never came through', () => {
    const broken = { type: 'table', headers: [], rows: [['', ''], ['', ''], ['x', '']] };
    expect(_isSuspectExtraction(broken)).toMatch(/table-mostly-empty/);
  });

  it('still flags a mostly-empty table whose rows do not match the header width', () => {
    const ragged = { type: 'table', headers: ['A', 'B', 'C'], rows: [['', ''], ['', ''], ['', '']] };
    expect(_isSuspectExtraction(ragged)).toMatch(/table-mostly-empty/);
  });

  it('leaves a populated table alone', () => {
    const full = { type: 'table', headers: ['Name', 'Bio'], rows: [['Desiree', 'QA engineer'], ['Teenya', 'Specialist']] };
    expect(_isSuspectExtraction(full)).toBeNull();
  });

  // ── _validateTableGrid ──────────────────────────────────────────────────
  it('accepts a transcribed worksheet whose data rows are legitimately blank', () => {
    const grid = {
      caption: 'Accessibility courses',
      rows: [
        { cells: [hdr('Date of Course/Class'), hdr('Course/Class Name'), hdr('Status')] },
        { cells: [blank(), blank(), blank()] },
        { cells: [blank(), blank(), blank()] },
      ],
    };
    const v = _validateTableGrid(grid);
    expect(v.ok, 'reason: ' + v.reason).toBe(true);
    expect(v.cols).toBe(3);
  });

  // The exact structure that was thrown away on 2026-09-04.
  it('accepts a merged row-header total line over blank rows', () => {
    const grid = {
      caption: 'Expenses',
      rows: [
        { cells: [hdr('Expense Description'), hdr('Date'), hdr('Expense Amount')] },
        { cells: [blank(), blank(), blank()] },
        { cells: [{ text: 'Total All Expenses', isHeader: true, scope: 'row', colspan: 2 }, blank()] },
      ],
    };
    const v = _validateTableGrid(grid);
    expect(v.ok, 'reason: ' + v.reason).toBe(true);
  });

  it('still rejects an all-empty grid with no header text — a real silent failure', () => {
    const grid = {
      rows: [
        { cells: [blank(), blank()] },
        { cells: [blank(), blank()] },
      ],
    };
    const v = _validateTableGrid(grid);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/all-empty/);
  });

  // Geometry checks must keep working regardless of the new guard.
  it('still rejects a grid whose rows disagree on width', () => {
    const grid = {
      rows: [
        { cells: [hdr('A'), hdr('B')] },
        { cells: [{ text: 'x' }, { text: 'y' }, { text: 'z' }] },
      ],
    };
    expect(_validateTableGrid(grid).ok).toBe(false);
  });

  it('still rejects headers that carry no scope', () => {
    const grid = {
      rows: [
        { cells: [{ text: 'A', isHeader: true }, { text: 'B', isHeader: true }] },
        { cells: [{ text: 'x' }, { text: 'y' }] },
      ],
    };
    const v = _validateTableGrid(grid);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('headers-without-scope');
  });
});
