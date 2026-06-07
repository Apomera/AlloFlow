// Lumen INGEST tests (design §5 Pillar 1, §6.1 L0 contract).
//
// Pins the pure-parser surface — parseTextTable, mapTextTableToObservations,
// parseWorkbookSheet, ingestFileTypeFromName, lazyLoadXLSX — under fixed
// inputs so the parsers can be refactored with a safety net AND so a
// regression in delimiter autodetect, header sniff, quoted-field handling,
// or numeric-coercion refusal surfaces as a test failure instead of as a
// silently-misbound observation in a school-psych progress chart.
//
// Out of scope: the FileReader / file-picker UI wiring (covered by the
// render golden master) and SheetJS itself (covered by SheetJS's own
// tests; we pin only the wrapper's null-library + empty-workbook + happy
// paths via an inline minimal fake XLSX namespace).

import { describe, it, expect } from 'vitest';
import * as LumenMod from '../stem_lab/stem_tool_lumen.js';

const L = LumenMod.default || LumenMod;

describe('Lumen ingest — parseTextTable', () => {
  it('parses a simple header + 3 rows of CSV', () => {
    const t = L.parseTextTable('week,wcpm,phase\n1,42,baseline\n2,45,baseline\n6,53,tier2');
    expect(t.headers).toEqual(['week', 'wcpm', 'phase']);
    expect(t.rows).toEqual([
      ['1', '42', 'baseline'],
      ['2', '45', 'baseline'],
      ['6', '53', 'tier2']
    ]);
    expect(t.delimiter).toBe(',');
    expect(t.notes).toEqual([]);
  });

  it('autodetects TAB delimiter from the first line', () => {
    const t = L.parseTextTable('week\twcpm\n1\t42\n2\t45');
    expect(t.delimiter).toBe('\t');
    expect(t.headers).toEqual(['week', 'wcpm']);
    expect(t.rows.length).toBe(2);
  });

  it('autodetects semicolon (European Excel default)', () => {
    const t = L.parseTextTable('week;wcpm\n1;42\n2;45');
    expect(t.delimiter).toBe(';');
    expect(t.headers).toEqual(['week', 'wcpm']);
  });

  it('downgrades hasHeader when the first row is all numeric', () => {
    const t = L.parseTextTable('1,42\n2,45\n3,48');
    expect(t.headers).toEqual(['col1', 'col2']);
    expect(t.rows.length).toBe(3);
  });

  it('respects opts.hasHeader=false even when the first row is non-numeric', () => {
    const t = L.parseTextTable('a,b\n1,2\n3,4', { hasHeader: false });
    expect(t.headers).toEqual(['col1', 'col2']);
    expect(t.rows[0]).toEqual(['a', 'b']);
  });

  it('handles quoted fields with embedded delimiters (RFC-4180)', () => {
    const t = L.parseTextTable('label,value\n"Smith, J",10\n"Doe",20');
    expect(t.rows[0]).toEqual(['Smith, J', '10']);
    expect(t.rows[1]).toEqual(['Doe', '20']);
  });

  it('handles escaped doubled quotes inside a quoted field', () => {
    const t = L.parseTextTable('label,value\n"He said ""hi""",1');
    expect(t.rows[0][0]).toBe('He said "hi"');
  });

  it('strips a UTF-8 BOM at the start of the file', () => {
    const t = L.parseTextTable('﻿week,wcpm\n1,42');
    expect(t.headers).toEqual(['week', 'wcpm']);
    expect(t.rows).toEqual([['1', '42']]);
  });

  it('normalizes CRLF and CR line endings', () => {
    const t = L.parseTextTable('week,wcpm\r\n1,42\r\n2,45');
    expect(t.rows.length).toBe(2);
    expect(t.rows[0]).toEqual(['1', '42']);
  });

  it('trims wholly-empty trailing rows (Excel artefact)', () => {
    const t = L.parseTextTable('week,wcpm\n1,42\n\n\n');
    expect(t.rows).toEqual([['1', '42']]);
  });

  it('refuses files over 2 MB (parser CPU/memory guard)', () => {
    const huge = 'a,b\n' + '1,2\n'.repeat(L.INGEST_MAX_BYTES);
    const t = L.parseTextTable(huge);
    expect(t.error).toMatch(/exceeds.*MB/);
    expect(t.rows).toEqual([]);
  });

  it('truncates row count to INGEST_MAX_ROWS and reports it in notes', () => {
    const lines = ['x,y'];
    for (let i = 0; i < L.INGEST_MAX_ROWS + 50; i++) lines.push(i + ',' + i);
    const t = L.parseTextTable(lines.join('\n'));
    expect(t.notes).toContain('truncated');
    // Header is consumed first, then truncation kicks in.
    expect(t.rows.length).toBeLessThanOrEqual(L.INGEST_MAX_ROWS);
  });

  it('returns the empty-table shape (no throw) on null / empty / whitespace input', () => {
    expect(L.parseTextTable(null).rows).toEqual([]);
    expect(L.parseTextTable('').rows).toEqual([]);
    expect(L.parseTextTable('\n\n').rows).toEqual([]);
  });
});

describe('Lumen ingest — mapTextTableToObservations', () => {
  const table = L.parseTextTable('week,wcpm,phase,y2,cond\n1,42,baseline,55,A\n2,45,baseline,58,A\n6,53,tier2,66,B');

  it('maps x/y with phase and ignores absent y2/series', () => {
    const m = L.mapTextTableToObservations(table, { xCol: 0, yCol: 1, phaseCol: 2 });
    expect(m.dropped).toEqual([]);
    expect(m.rows).toEqual([
      { x: 1, y: 42, phase: 'baseline' },
      { x: 2, y: 45, phase: 'baseline' },
      { x: 6, y: 53, phase: 'tier2' }
    ]);
  });

  it('writes y2 ONLY when supplied (byte-identity for single-var compendia)', () => {
    const m = L.mapTextTableToObservations(table, { xCol: 0, yCol: 1, y2Col: 3 });
    expect(m.rows[0]).toEqual({ x: 1, y: 42, phase: null, y2: 55 });
    expect('y2' in m.rows[0]).toBe(true);
    const m2 = L.mapTextTableToObservations(table, { xCol: 0, yCol: 1 });
    expect('y2' in m2.rows[0]).toBe(false); // conditional spread — no `y2: undefined`
  });

  it('writes series ONLY when supplied; stringifies verbatim', () => {
    const m = L.mapTextTableToObservations(table, { xCol: 0, yCol: 1, seriesCol: 4 });
    expect(m.rows[0].series).toBe('A');
    expect(m.rows[2].series).toBe('B');
  });

  it('drops rows with missing or non-numeric x or y; reports rowIdx + reason', () => {
    const t = L.parseTextTable('week,wcpm\n1,42\n,99\nabc,xyz\n3,48');
    const m = L.mapTextTableToObservations(t, { xCol: 0, yCol: 1 });
    expect(m.rows.length).toBe(2);
    expect(m.rows.map(r => r.x)).toEqual([1, 3]);
    expect(m.dropped.length).toBe(2);
    expect(m.dropped[0]).toEqual({ rowIdx: 1, reason: 'missing-xy', preview: ['', '99'] });
    expect(m.dropped[1].reason).toBe('non-numeric-xy');
  });

  it('refuses to map without xCol AND yCol', () => {
    const m = L.mapTextTableToObservations(table, { yCol: 1 });
    expect(m.error).toMatch(/xCol and yCol/);
    expect(m.rows).toEqual([]);
  });

  it('handles a non-table input shape without throwing', () => {
    const m = L.mapTextTableToObservations(null, { xCol: 0, yCol: 1 });
    expect(m.error).toMatch(/no rows/);
  });
});

describe('Lumen ingest — parseWorkbookSheet (XLSX wrapper)', () => {
  it('returns the empty-table shape with a structured error when SheetJS is missing', () => {
    const w = L.parseWorkbookSheet(null, new ArrayBuffer(0));
    expect(w.error).toMatch(/SheetJS not loaded/);
    expect(w.rows).toEqual([]);
  });

  it('delegates to parseTextTable via sheet_to_csv (deterministic)', () => {
    // Minimal fake XLSX namespace: returns the same CSV the test would parse directly,
    // so the wrapper passes through cleanly and we can compare end-to-end.
    const fakeXLSX = {
      read: () => ({ SheetNames: ['Data'], Sheets: { Data: {} } }),
      utils: { sheet_to_csv: () => 'week,wcpm,phase\n1,42,baseline\n2,45,tier2' }
    };
    const w = L.parseWorkbookSheet(fakeXLSX, new ArrayBuffer(8));
    expect(w.headers).toEqual(['week', 'wcpm', 'phase']);
    expect(w.rows.length).toBe(2);
    expect(w.sheetName).toBe('Data');
    expect(w.sheetNames).toEqual(['Data']);
  });

  it('returns a structured error on a workbook with zero sheets', () => {
    const fakeXLSX = {
      read: () => ({ SheetNames: [], Sheets: {} }),
      utils: { sheet_to_csv: () => '' }
    };
    const w = L.parseWorkbookSheet(fakeXLSX, new ArrayBuffer(0));
    expect(w.error).toMatch(/no sheets/i);
  });

  it('returns a structured error when the named sheet is missing', () => {
    const fakeXLSX = {
      read: () => ({ SheetNames: ['Sheet1'], Sheets: { Sheet1: {} } }),
      utils: { sheet_to_csv: () => 'a,b\n1,2' }
    };
    const w = L.parseWorkbookSheet(fakeXLSX, new ArrayBuffer(0), 'NotASheet');
    expect(w.error).toMatch(/not found/i);
  });

  it('catches XLSX read throws and reports them as structured errors', () => {
    const fakeXLSX = {
      read: () => { throw new Error('corrupt file'); },
      utils: { sheet_to_csv: () => '' }
    };
    const w = L.parseWorkbookSheet(fakeXLSX, new ArrayBuffer(0));
    expect(w.error).toMatch(/XLSX parse failed: corrupt file/);
  });
});

describe('Lumen ingest — file-type detection', () => {
  it('detects supported extensions (case-insensitive)', () => {
    expect(L.ingestFileTypeFromName('foo.csv')).toBe('csv');
    expect(L.ingestFileTypeFromName('foo.CSV')).toBe('csv');
    expect(L.ingestFileTypeFromName('foo.tsv')).toBe('tsv');
    expect(L.ingestFileTypeFromName('foo.txt')).toBe('txt');
    expect(L.ingestFileTypeFromName('foo.xlsx')).toBe('xlsx');
    expect(L.ingestFileTypeFromName('foo.XLSX')).toBe('xlsx');
    expect(L.ingestFileTypeFromName('foo.json')).toBe('json');
    expect(L.ingestFileTypeFromName('foo.JSON')).toBe('json');
    expect(L.ingestFileTypeFromName('foo.ods')).toBe('ods');
    expect(L.ingestFileTypeFromName('foo.xls')).toBe('xls');
    expect(L.ingestFileTypeFromName('foo.xlsb')).toBe('xlsb');
  });

  it('does not confuse .xls / .xlsb with .xlsx (longest-correct match)', () => {
    expect(L.ingestFileTypeFromName('book.xls')).toBe('xls');
    expect(L.ingestFileTypeFromName('book.xlsx')).toBe('xlsx');
    expect(L.ingestFileTypeFromName('book.xlsb')).toBe('xlsb');
  });

  it('routes every workbook format through the SheetJS path', () => {
    expect(L.isWorkbookIngestType('xlsx')).toBe(true);
    expect(L.isWorkbookIngestType('ods')).toBe(true);
    expect(L.isWorkbookIngestType('xls')).toBe(true);
    expect(L.isWorkbookIngestType('xlsb')).toBe(true);
    expect(L.isWorkbookIngestType('json')).toBe(false);
    expect(L.isWorkbookIngestType('csv')).toBe(false);
  });

  it('returns null for unsupported / missing extensions', () => {
    expect(L.ingestFileTypeFromName('foo.pdf')).toBeNull();
    expect(L.ingestFileTypeFromName('foo.docx')).toBeNull();
    expect(L.ingestFileTypeFromName('no-ext')).toBeNull();
    expect(L.ingestFileTypeFromName(null)).toBeNull();
    expect(L.ingestFileTypeFromName('')).toBeNull();
  });
});

describe('Lumen ingest — parseJsonTable', () => {
  it('parses an array of flat objects (keys -> columns, first-seen order)', () => {
    const t = L.parseJsonTable('[{"week":1,"wcpm":42,"phase":"baseline"},{"week":2,"wcpm":45,"phase":"baseline"}]');
    expect(t.headers).toEqual(['week', 'wcpm', 'phase']);
    expect(t.rows).toEqual([['1', '42', 'baseline'], ['2', '45', 'baseline']]);
    expect(t.delimiter).toBe('json');
    expect(t.error).toBeUndefined();
  });

  it('takes the UNION of keys across rows and aligns missing cells to empty', () => {
    const t = L.parseJsonTable('[{"a":1},{"a":2,"b":9}]');
    expect(t.headers).toEqual(['a', 'b']);
    expect(t.rows).toEqual([['1', ''], ['2', '9']]);
  });

  it('unwraps a { data:[...] } / { rows:[...] } / { records:[...] } envelope', () => {
    expect(L.parseJsonTable('{"data":[{"x":1}]}').headers).toEqual(['x']);
    expect(L.parseJsonTable('{"rows":[{"y":2}]}').headers).toEqual(['y']);
    expect(L.parseJsonTable('{"records":[{"z":3}]}').headers).toEqual(['z']);
  });

  it('treats a single bare object as one row', () => {
    const t = L.parseJsonTable('{"week":1,"wcpm":42}');
    expect(t.headers).toEqual(['week', 'wcpm']);
    expect(t.rows).toEqual([['1', '42']]);
  });

  it('parses an array-of-arrays with a sniffed header row', () => {
    const t = L.parseJsonTable('[["week","wcpm"],[1,42],[2,45]]');
    expect(t.headers).toEqual(['week', 'wcpm']);
    expect(t.rows).toEqual([['1', '42'], ['2', '45']]);
  });

  it('synthesizes col-N headers when an array-of-arrays has no header row', () => {
    const t = L.parseJsonTable('[[1,42],[2,45]]');
    expect(t.headers).toEqual(['col1', 'col2']);
    expect(t.rows).toEqual([['1', '42'], ['2', '45']]);
  });

  it('stringifies nested values rather than coercing them (L0: no numeric guessing)', () => {
    const t = L.parseJsonTable('[{"a":1,"b":{"k":2}}]');
    expect(t.headers).toEqual(['a', 'b']);
    expect(t.rows[0][1]).toBe('{"k":2}');
  });

  it('never throws on invalid JSON — returns an error note', () => {
    const t = L.parseJsonTable('{not json');
    expect(t.headers).toEqual([]);
    expect(t.rows).toEqual([]);
    expect(typeof t.error).toBe('string');
    expect(t.error).toMatch(/not valid json/i);
  });

  it('flags an empty array and a column-less array without throwing', () => {
    expect(L.parseJsonTable('[]').notes).toEqual(['empty']);
    expect(typeof L.parseJsonTable('[1,2,3]').error).toBe('string');
  });
});

describe('Lumen ingest — L0 contract + privacy invariants', () => {
  it('mapped observations carry the same shape addObservation accepts (round-trip)', () => {
    const comp = L.makeCompendium('WCPM', 'words/min');
    const table = L.parseTextTable('week,wcpm,phase\n1,42,baseline\n2,45,baseline\n6,53,tier2');
    const m = L.mapTextTableToObservations(table, { xCol: 0, yCol: 1, phaseCol: 2 });
    m.rows.forEach(r => L.addObservation(comp, r));
    expect(comp.observations.length).toBe(3);
    expect(comp.observations[0]).toMatchObject({ x: 1, y: 42, phase: 'baseline' });
    expect(comp.observations[2].phase).toBe('tier2');
    // Round-trip a trend claim — L1 derivation should land cleanly on imported L0 data.
    // n=3 here is below the small-n flag floor but above the refuse floor.
    const claim = L.deriveTrendClaim(comp, {});
    expect(claim.refused).toBeFalsy();
    expect(claim.level).toBe('L1');
  });

  it('buildClaimContext from imported data is PII-free numbers (headers never leak)', () => {
    // Even with a header that LOOKS like a student name, the headers stay on
    // the preview shape only — they are not part of the compendium or claim.
    const comp = L.makeCompendium('WCPM', 'words/min');
    const t = L.parseTextTable('Reyna_Hernandez_grade4_wcpm,wcpm,phase\n1,42,baseline\n2,45,baseline\n6,53,tier2\n7,58,tier2\n8,61,tier2\n9,60,tier2\n10,66,tier2\n11,70,tier2');
    const m = L.mapTextTableToObservations(t, { xCol: 0, yCol: 1, phaseCol: 2 });
    m.rows.forEach(r => L.addObservation(comp, r));
    const claim = L.deriveTrendClaim(comp, {});
    const ctx = L.buildClaimContext(comp, claim);
    const json = JSON.stringify(ctx);
    expect(/reyna/i.test(json)).toBe(false);
    expect(/hernandez/i.test(json)).toBe(false);
    expect(/student/i.test(json)).toBe(false);
    expect(ctx.slope).toBeDefined();
  });

  it('the parser never invents a value: row count in equals row count out (kept + dropped)', () => {
    const t = L.parseTextTable('x,y\n1,1\n2,bad\n3,3\n,99\n4,4');
    const m = L.mapTextTableToObservations(t, { xCol: 0, yCol: 1 });
    expect(m.rows.length + m.dropped.length).toBe(t.rows.length);
  });
});
