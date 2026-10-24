// Table header association with merged cells (2026-10-16).
//  - The tagged-PDF /Headers pass ("Stage 5b lite" in createTaggedPdf) used each cell's position
//    among its row's children as its column, so any colspan/rowspan put later cells under the
//    wrong header (gradebook: "A" under "Total", "95" under nothing). It now places cells on the
//    visual grid (_alloPlaceTableCells) and matches headers by overlapping column/row ranges.
//  - fix_complex_table reused positional ids across header rows (duplicate ids) and wrote
//    positional `headers` attributes that overrode the browser's correct scope association.
// The Stage 5b block runs as sliced from doc_pipeline_source.jsx (it is inline in createTaggedPdf);
// fix_complex_table runs from the built module's exported registry.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const slice = (from, to) => {
  const s = src.indexOf(from);
  const e = src.indexOf(to, s);
  if (s < 0 || e < 0) throw new Error('slice markers missing: ' + from);
  return src.slice(s, e);
};
const placeSrc = slice('function _alloPlaceTableCells(table) {', '// Stamp scope on scope-less');
const placeTableCells = new Function(placeSrc + '\nreturn _alloPlaceTableCells;')();
const stage5b = new Function('htmlDoc', '_alloPlaceTableCells', slice('      let tableIndex = 0;\n      for (const table of Array.from(htmlDoc.querySelectorAll(\'table\'))) {', '    } catch(tableErr) {'));

// Run the real Stage 5b pass and report each data cell's header TEXTS, in emitted order.
const headersFor = (tableHtml) => {
  const doc = new DOMParser().parseFromString('<body>' + tableHtml + '</body>', 'text/html');
  stage5b(doc, placeTableCells);
  const byId = {};
  doc.querySelectorAll('th[data-struct-id]').forEach((th) => { byId[th.getAttribute('data-struct-id')] = th.textContent.trim(); });
  const out = {};
  doc.querySelectorAll('td').forEach((td) => {
    out[td.textContent.trim()] = (td.getAttribute('data-headers') || '').split(/\s+/).filter(Boolean).map((id) => byId[id]);
  });
  return out;
};

describe('placeTableCells — the visual grid', () => {
  it('places spanned cells in the columns a browser would', () => {
    const doc = new DOMParser().parseFromString('<table><tr><th rowspan="2">S</th><th colspan="2">Q1</th></tr><tr><th>Score</th><th>Grade</th></tr></table>', 'text/html');
    const p = placeTableCells(doc.querySelector('table')).map((x) => x.cell.textContent + '@' + x.r + ',' + x.c + ' ' + x.rs + 'x' + x.cs);
    expect(p).toEqual(['S@0,0 2x1', 'Q1@0,1 1x2', 'Score@1,1 1x1', 'Grade@1,2 1x1']);
  });
});

describe('tagged-PDF /Headers follow merged cells', () => {
  it('one header row with Q1 spanning two columns', () => {
    const h = headersFor('<table><tr><th scope="col">Student</th><th scope="col" colspan="2">Q1</th><th scope="col">Total</th></tr>'
      + '<tr><th scope="row">Ada</th><td>90</td><td>A</td><td>95</td></tr></table>');
    expect(h['90']).toEqual(['Q1', 'Ada']);
    expect(h['A']).toEqual(['Q1', 'Ada']);   // was ["Total"]
    expect(h['95']).toEqual(['Total', 'Ada']); // was []
  });
  it('two header rows: Student rowspan 2, Q1/Q2 spanning Score|Grade', () => {
    const h = headersFor('<table><tr><th scope="col" rowspan="2">Student</th><th scope="col" colspan="2">Q1</th><th scope="col" colspan="2">Q2</th></tr>'
      + '<tr><th scope="col">Score</th><th scope="col">Grade</th><th scope="col">Score</th><th scope="col">Grade</th></tr>'
      + '<tr><th scope="row">Ada</th><td>90</td><td>A</td><td>85</td><td>B</td></tr></table>');
    expect(h['90']).toEqual(['Q1', 'Score', 'Ada']);
    expect(h['A']).toEqual(['Q1', 'Grade', 'Ada']);
    expect(h['85']).toEqual(['Q2', 'Score', 'Ada']);
    expect(h['B']).toEqual(['Q2', 'Grade', 'Ada']);
  });
  it('a rowspan in the body does not shift later cells', () => {
    const h = headersFor('<table><tr><th scope="col">Day</th><th scope="col">Period</th><th scope="col">Room</th></tr>'
      + '<tr><td rowspan="2">Mon</td><td>P1</td><td>R1</td></tr><tr><td>P2</td><td>R2</td></tr></table>');
    expect(h['P2']).toEqual(['Period']); // was ["Day"]
    expect(h['R2']).toEqual(['Room']);   // was ["Period"]
  });
  it('colgroup/rowgroup-scoped headers get ids and apply', () => {
    const h = headersFor('<table><tr><th scope="col" rowspan="2">Student</th><th scope="colgroup" colspan="2">Q1</th></tr>'
      + '<tr><th scope="col">Score</th><th scope="col">Grade</th></tr><tr><th scope="row">Ada</th><td>90</td><td>A</td></tr></table>');
    expect(h['90']).toEqual(['Q1', 'Score', 'Ada']);
  });
  it('a nested table\'s rows stay out of the outer grid', () => {
    const doc = new DOMParser().parseFromString('<body><table><tr><th scope="col">Outer</th></tr><tr><td>o1<table><tr><th scope="col">Inner</th></tr><tr><td>i1</td></tr></table></td></tr></table></body>', 'text/html');
    stage5b(doc, placeTableCells);
    const ids = Array.from(doc.querySelectorAll('th')).map((th) => th.getAttribute('data-struct-id'));
    const inner = Array.from(doc.querySelectorAll('td')).find((td) => td.textContent === 'i1');
    const innerHeader = doc.querySelectorAll('th')[1];
    expect(inner.getAttribute('data-headers')).toBe(innerHeader.getAttribute('data-struct-id'));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('fix_complex_table — unique ids, no positional headers', () => {
  let registry;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    const p = window.AlloModules.createDocPipeline({
      callGemini: async () => 'OK', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'D', state: {},
    });
    registry = p.surgicalToolRegistry;
    expect(typeof (registry && registry.fix_complex_table && registry.fix_complex_table.fn)).toBe('function');
  });
  it('gives every header cell its own id and leaves the body to scope + spans', () => {
    const raw = '<table><tr><td rowspan="2">Student</td><td colspan="2">Q1</td><td colspan="2">Q2</td></tr>'
      + '<tr><td>Score</td><td>Grade</td><td>Score</td><td>Grade</td></tr><tr><td>Ada</td><td>90</td><td>A</td><td>85</td><td>B</td></tr></table>';
    const out = registry.fix_complex_table.fn(raw, { index: 0, headerRowCount: 2 });
    const doc = new DOMParser().parseFromString('<body>' + out + '</body>', 'text/html');
    const ids = Array.from(doc.querySelectorAll('[id]')).map((e) => e.id);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(ids.length);
    expect(doc.querySelectorAll('thead th[scope="col"]')).toHaveLength(7);
    expect(doc.querySelectorAll('[headers]')).toHaveLength(0);
  });
});
