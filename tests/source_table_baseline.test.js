// (2026-11-06, keyless complaint4) Six ruled tables came out as bullet lists and the verdict said ready: on a born-digital PDF
// there was nothing to compare the output's tables against. The measure must not cry wolf, since a note on every letter teaches
// people to skip the note. Each false case below is one the corpus really produced (Word's white boxes, clips, a logo, a bar chart).
// @vitest-environment jsdom
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';
import { loadAlloModule } from './setup.js';

const SRC = readFileSync(process.env.ALLO_PIPELINE_SOURCE || resolve('doc_pipeline_source.jsx'), 'utf8');
const VIEW = readFileSync(process.env.ALLO_VIEW_SOURCE || resolve('view_pdf_audit_source.jsx'), 'utf8');
const measure = sliceBetween(SRC, 'function _alloRuledTablesOnPage(', '// _computeStructuralFidelityNotes: compares the SOURCE text');
const { ruled, tagged } = new Function(measure + '\nreturn { ruled: _alloRuledTablesOnPage, tagged: _alloTaggedTablesOnPage };')();
const netStart = 'function _computeStructuralFidelityNotes(srcText, outHtml, srcCounts) {';
const net = new Function('_detectRefusalText', sliceBetween(SRC, netStart, '\n  return notes;\n}') + '\n  return notes;\n}\nreturn _computeStructuralFidelityNotes;')(() => null);

const OPS = { save: 1, restore: 2, transform: 3, constructPath: 4, rectangle: 5, moveTo: 6, lineTo: 7, curveTo: 8, curveTo2: 9, curveTo3: 10, stroke: 11, closeStroke: 12, fill: 13, eoFill: 14, fillStroke: 15, eoFillStroke: 16, closeFillStroke: 17, closeEOFillStroke: 18, endPath: 19, paintFormXObjectBegin: 20, paintFormXObjectEnd: 21 };
const W = 612;
const path = (cmds, coords, paint) => [[OPS.constructPath, [cmds, coords, [0, 0, 0, 0]]], [paint]];
const line = (x0, y0, x1, y1, paint = OPS.stroke) => path([OPS.moveTo, OPS.lineTo], [x0, y0, x1, y1], paint);
const box = (x, y, w, h, paint) => path([OPS.rectangle], [x, y, w, h], paint);
const rules = (x0, y0, rows, cols, cw, rh, draw = line) => {
  const out = [];
  for (let r = 0; r <= rows; r++) out.push(...draw(x0, y0 + r * rh, x0 + cols * cw, y0 + r * rh));
  for (let c = 0; c <= cols; c++) out.push(...draw(x0 + c * cw, y0, x0 + c * cw, y0 + rows * rh));
  return out;
};
const thinFilled = (x0, y0, x1, y1) => box(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || 0.5, Math.abs(y1 - y0) || 0.5, OPS.fill);
const item = (x, y, str = 'Name') => ({ str, transform: [1, 0, 0, 10, x, y], width: 20, height: 10 });
const labels = (x, y0, rows, rh) => Array.from({ length: rows }, (_, r) => item(x, y0 + r * rh + 4));
const run = (ops, items) => ruled(ops.map((o) => o[0]), ops.map((o) => o[1] || []), OPS, items, W);
const cell = (role = 'TD') => ({ role, children: [] });
const tr = (n) => ({ role: 'TR', children: Array.from({ length: n }, () => cell()) });

describe('a page that shows a table', () => {
  it('finds a label-and-blank form grid, with text in one column only', () => {
    expect(run(rules(70, 500, 7, 2, 200, 20), labels(75, 500, 7, 20))).toEqual([{ rows: 7, cols: 2, cells: 14 }]);
  });
  it('accepts rules drawn as thin filled bars, as Word does', () => {
    expect(run(rules(70, 500, 7, 2, 200, 20, thinFilled), labels(75, 500, 7, 20))).toEqual([{ rows: 7, cols: 2, cells: 14 }]);
  });
  it('accepts a stroked rectangle as a whole cell outline', () => {
    const ops = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) ops.push(...box(70 + c * 150, 500 + r * 20, 150, 20, OPS.stroke));
    expect(run(ops, labels(75, 500, 3, 20))).toEqual([{ rows: 3, cols: 2, cells: 6 }]);
  });
  it('counts two separate grids separately', () => {
    const ops = [...rules(70, 500, 4, 2, 200, 20), ...rules(70, 200, 4, 2, 200, 20)];
    expect(run(ops, [...labels(75, 500, 4, 20), ...labels(75, 200, 4, 20)])).toHaveLength(2);
  });
  it('follows the page transform, and restores it after a form', () => {
    const shifted = [[OPS.save], [OPS.transform, [1, 0, 0, 1, 0, 300]], ...rules(70, 200, 4, 2, 200, 20), [OPS.restore]];
    expect(run(shifted, labels(75, 500, 4, 20))).toHaveLength(1);
    const inForm = [[OPS.paintFormXObjectBegin, [[1, 0, 0, 1, 0, 300], [0, 0, W, 792]]], ...rules(70, 200, 4, 2, 200, 20), [OPS.paintFormXObjectEnd], ...rules(70, 100, 4, 2, 200, 20)];
    expect(run(inForm, [...labels(75, 500, 4, 20), ...labels(75, 100, 4, 20)])).toHaveLength(2);
  });
});

describe('a page that does not', () => {
  const rows = labels(75, 500, 7, 20);
  it('ignores a clip, which puts nothing on the page', () => {
    // The paint after it must not pick up the clip's lines.
    const ops = [...rules(70, 500, 7, 2, 200, 20, (a, b, c, d) => line(a, b, c, d, OPS.endPath)), ...line(70, 100, 300, 100)];
    expect(run(ops, rows)).toEqual([]);
  });
  it('ignores the white boxes Word fills behind runs of text', () => {
    // Widths vary with each line of text, so their edges would line up as columns if a filled box counted as lines (syllabus page 8).
    const ops = [];
    [468, 430, 300, 468, 430, 300, 468].forEach((w, r) => ops.push(...box(72, 500 + r * 14, w, 14, OPS.fill)));
    expect(run(ops, labels(75, 500, 7, 14))).toEqual([]);
    const painted = [];
    [468, 430, 300, 468, 430, 300, 468].forEach((w, r) => painted.push(...box(72, 500 + r * 14, w, 14, OPS.stroke)));
    expect(run(painted, labels(75, 500, 7, 14))).toHaveLength(1); // the same boxes with real lines around them do
  });
  it('ignores rulings with no text between them, like a logo', () => {
    expect(run(rules(70, 500, 7, 2, 200, 20), [])).toEqual([]);
    expect(run(rules(70, 500, 7, 2, 200, 20), labels(75, 100, 7, 20))).toEqual([]);
  });
  it('ignores a chart: gridlines with a few labels', () => {
    expect(run(rules(70, 300, 20, 20, 24, 15), labels(75, 300, 14, 15))).toEqual([]);
  });
  it('ignores a grid where most rows are empty, even with both columns of the others full', () => {
    const items = [...labels(75, 500, 3, 20), ...labels(275, 500, 3, 20)];
    expect(run(rules(70, 500, 7, 2, 200, 20), items)).toEqual([]);
  });
  it('ignores a narrow or very small grid', () => {
    expect(run(rules(70, 500, 7, 2, 40, 20), labels(75, 500, 7, 20))).toEqual([]);
    expect(run(rules(70, 500, 2, 2, 200, 20), labels(75, 500, 2, 20))).toEqual([]);
    expect(run(rules(70, 500, 3, 2, 200, 4), labels(75, 500, 3, 4))).toEqual([]);
  });
  it('says "not measured" when pdf.js stores paths another way', () => {
    expect(ruled([OPS.constructPath], [[new Float32Array(4), [], []]], OPS, rows, W)).toBeNull();
  });
});

describe('tables the author tagged', () => {
  it('counts rows and cells through TBody and THead', () => {
    const tree = { children: [{ role: 'Table', children: [{ role: 'THead', children: [{ role: 'TR', children: [cell('TH'), cell('TH')] }] }, { role: 'TBody', children: [tr(2), tr(2)] }] }] };
    expect(tagged(tree)).toEqual([{ rows: 3, cols: 2, cells: 6 }]);
  });
  it('leaves out layout: one row or one column', () => {
    expect(tagged({ role: 'Table', children: [tr(3)] })).toEqual([]);
    expect(tagged({ role: 'Table', children: [tr(1), tr(1), tr(1)] })).toEqual([]);
  });
  it('does not count a table inside a cell twice', () => {
    const inner = { role: 'Table', children: [tr(2), tr(2)] };
    expect(tagged({ role: 'Table', children: [{ role: 'TR', children: [{ role: 'TD', children: [inner] }, cell()] }, tr(2)] })).toHaveLength(1);
    expect(tagged({ role: 'Table', children: [tr(2), tr(2), inner] })).toEqual([{ rows: 2, cols: 2, cells: 4 }]);
  });
  it('copes with an untagged page', () => {
    expect(tagged(null)).toEqual([]);
    expect(tagged({ role: 'Sect', children: [{ role: 'P', children: [{ type: 'content', id: 'a' }] }] })).toEqual([]);
  });
});

describe('the note', () => {
  const FIVE = { tables: 5, cells: 74, pages: [1, 2] };
  const flat = (notes) => notes.filter((n) => n.kind === 'tablesFlattened');
  const list = '<ul><li>Name</li><li>Address</li></ul>';
  const table = (cells) => '<table>' + '<tr>' + '<td>x</td>'.repeat(cells) + '</tr></table>';
  it('speaks when the output keeps none of them, as a caution that names the pages', () => {
    const [n] = flat(net('plain text', list, { tables: FIVE }));
    expect(n.caution).toBe(true);
    expect(n.msg).toContain('about 5 tables (pages 1, 2)');
    expect(n.msg).toContain('this version has 0');
    expect(n.msg).toMatch(/each label still goes with its value/);
    expect(n.msg.length).toBeLessThan(400); // the connector cuts notes at 400
  });
  it('says "table" and "page" for one', () => {
    expect(flat(net('', list, { tables: { tables: 1, cells: 161, pages: [1] } }))[0].msg).toContain('about 1 table (page 1) but');
  });
  it('speaks when only a small table is left', () => {
    expect(flat(net('', table(14), { tables: FIVE }))).toHaveLength(1);
  });
  it('shortens a long page list', () => {
    const pages = Array.from({ length: 40 }, (_, i) => i + 1);
    const [n] = flat(net('', list, { tables: { tables: 40, cells: 800, pages } }));
    expect(n.msg).toContain('1, 2, 3, 4, 5, 6, 7, 8 and others');
    expect(n.msg.length).toBeLessThan(400);
  });
  it('stays quiet when they survive', () => {
    expect(flat(net('', table(74).repeat(5), { tables: FIVE }))).toEqual([]);
  });
  it('stays quiet for one table across pages, kept whole', () => {
    expect(flat(net('', table(40), { tables: { tables: 2, cells: 40, pages: [1, 2] } }))).toEqual([]);
  });
  it('stays quiet when every table is there and some cells were merged', () => {
    expect(flat(net('', table(4).repeat(5), { tables: FIVE }))).toEqual([]);
  });
  it('stays quiet with no measurement, or below six cells', () => {
    expect(flat(net('', list, null))).toEqual([]);
    expect(flat(net('', list, {}))).toEqual([]);
    expect(flat(net('', list, { tables: { tables: 1, cells: 5, pages: [1] } }))).toEqual([]);
  });
  it('leaves scans to the markdown check, so one problem gets one note', () => {
    const notes = net('| a | b |\n|---|---|\n| 1 | 2 |', list, { tables: FIVE });
    expect(notes.map((n) => n.kind)).toEqual(['tables']);
  });
});

describe('the verdict', () => {
  let pipeline;
  beforeAll(() => {
    loadAlloModule('doc_pipeline_module.js');
    pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {} });
  });
  it('turns ready into caution and holds nothing', () => {
    const base = { afterScore: 100, integrityCoverage: 100, axeAudit: { totalViolations: 0 } };
    const without = pipeline.distributionVerdict({ ...base, fidelityNotes: [] }, {});
    const v = pipeline.distributionVerdict({ ...base, fidelityNotes: [{ kind: 'tablesFlattened', caution: true, msg: 'x' }] }, {});
    expect(v.cautions.filter((c) => /does not keep them as tables/.test(c))).toHaveLength(1);
    expect(without.cautions.filter((c) => /does not keep them as tables/.test(c))).toEqual([]);
    expect(v.review).toEqual(without.review);
    expect(v.level).not.toBe('ready');
  });
  it('is replaced each round, so a later round that restores the tables clears it', () => {
    expect(pipeline.recomputableFidelityKinds.tablesFlattened).toBe(1);
  });
  it('the module reads its baseline through one accessor', () => {
    window.__alloSourceTables = { tables: 1, cells: 6, pages: [1] };
    expect(pipeline.sourceTableBaseline()).toEqual({ tables: 1, cells: 6, pages: [1] });
    window.__alloSourceTables = null;
    expect(pipeline.sourceTableBaseline()).toBeNull();
  });
  it('recompute after a follow-up round still has the baseline', () => {
    window.__alloSourceTables = { tables: 5, cells: 74, pages: [1, 2] };
    const out = pipeline.recomputeContentFidelity('Name Address', '<main><ul><li>Name</li><li>Address</li></ul></main>');
    window.__alloSourceTables = null;
    expect(out.fidelityNotes.map((n) => n.kind)).toContain('tablesFlattened');
  });
});

describe('every lane reads the same baseline', () => {
  it('both recompute lists replace the note, and the verdict names it', () => {
    expect(SRC).toMatch(/_RECOMPUTABLE_FIDELITY_KINDS = \{[^}]*tablesFlattened: 1/);
    expect(SRC).toMatch(/_REFIX_LANE_RECOMPUTED_FIDELITY_KINDS = \{[^}]*tablesFlattened: 1/);
    expect(SRC).toContain("if (kinds.tablesFlattened) cautions.push(");
  });
  it('the shared recompute passes the baseline', () => {
    const lane = sliceBetween(SRC, 'const _recomputeContentFidelity = (sourceText, html) => {', 'out.structuralNotes = _computeStructuralFidelityNotes(sourceText, html, _srcCounts)');
    expect(lane).toContain('{ tables: _st }');
  });
  it('a new run starts empty, so one document never inherits another\'s count', () => {
    expect(SRC).toContain('window.__alloSourceTables = null; // same rule for the measured table baseline');
  });
  it('a page-range run clears it, for the lanes that run after too', () => {
    const lane = sliceBetween(SRC, 'const _sliceRun = !!(_pageRange && (_pageRange[0] || _pageRange[1]));', '_structuralFidelityNotes = _computeStructuralFidelityNotes(');
    expect(lane).toContain("if (_sliceRun && typeof window !== 'undefined') window.__alloSourceTables = null;");
    expect(lane).toContain('{ tables: _st }');
    expect(lane.indexOf('window.__alloSourceTables = null')).toBeLessThan(lane.indexOf('{ tables: _st }'));
  });
  it('the app\'s Fix Remaining lane passes it, and refuses it on a slice', () => {
    const lane = sliceBetween(VIEW, 'const _sliceRun = !!(pdfPageRange', 'if (Array.isArray(_sf))');
    expect(lane).toContain("(!_sliceRun && typeof _docPipeline.sourceTableBaseline === 'function') ? _docPipeline.sourceTableBaseline() : null");
    expect(lane).toContain('{ tables: _srcTables }');
  });
});
