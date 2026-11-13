// 2026-11-12:
//   1. "Compact math: less room to show work": a worksheet option, offered only when the export holds math. The
//      student paper copy gets 2 work lines a problem instead of 4; screen copies and the teacher key are unchanged.
//   2. The export accessibility gate (dev-tools/check_pack_export_a11y.cjs) found duplicate-named regions:
//      Memory Aid cue boxes (one per card, same name) and the Applied Challenge brief (twice in a teacher copy).
//   3. dev-tools/a11y_page_audit.cjs is the shared per-page audit both gates can call.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

let pipeline;
const math = JSON.parse(readFileSync('allopacks/current/area_perimeter_grade4.allopack.json', 'utf8')).history.find((item) => item.type === 'math');
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
const workLines = (doc) => [...doc.querySelectorAll('.alloflow-math-work .alloflow-ruled-response')].map((box) => Number(box.getAttribute('data-allo-print-lines')));

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('export_runtime_copy_module.js');
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type, state: {},
  });
}, 60000);

describe('compact math worksheet option', () => {
  it('halves the paper work space only when the teacher turns it on', () => {
    const problems = math.data.problems.length;
    const standard = parse(pipeline.generateResourceHTML(math, false, {}, { isWorksheet: true }));
    expect(workLines(standard)).toEqual(Array(problems).fill(4));
    expect(standard.querySelector('.alloflow-math-compact')).toBeNull();
    const compact = parse(pipeline.generateResourceHTML(math, false, {}, { isWorksheet: true, worksheetMathCompact: true }));
    expect(workLines(compact)).toEqual(Array(problems).fill(2));
    expect(compact.querySelectorAll('.alloflow-math-problem.alloflow-math-compact')).toHaveLength(problems);
    // Still scales with Writing space: Extended gives 3 lines.
    const extended = parse(pipeline.generateResourceHTML(math, false, {}, { isWorksheet: true, worksheetMathCompact: true, worksheetResponseSpace: 'extended' }));
    expect(workLines(extended)).toEqual(Array(problems).fill(3));
  });

  it('leaves the screen copy and the teacher key alone', () => {
    const screen = parse(pipeline.generateResourceHTML(math, false, {}, { isWorksheet: false, worksheetMathCompact: true }));
    expect(screen.querySelector('.alloflow-math-compact')).toBeNull();
    expect(screen.querySelectorAll('textarea[data-allo-response-key$=":work"]').length).toBe(math.data.problems.length);
    const teacher = parse(pipeline.generateResourceHTML(math, true, {}, { isWorksheet: true, worksheetMathCompact: true }));
    expect(teacher.querySelector('.alloflow-math-compact')).toBeNull();
  });

  it('is offered only for worksheets that include math, with a registered label', () => {
    const view = readFileSync('view_export_preview_source.jsx', 'utf8');
    expect(view).toContain("exportPreviewMode === 'worksheet' && exportConfig.includeMath !== false && (history || []).some(item => item && item.type === 'math') && (");
    expect(view).toContain('worksheetMathCompact: e.target.checked');
    const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    expect(strings.export_preview.worksheet_math_compact).toBe('Compact math: less room to show work');
  });
});

describe('regions found by the export accessibility gate', () => {
  it('Memory Aid cue boxes and the Applied Challenge brief are groups, not duplicate-named regions', () => {
    const source = readFileSync('doc_pipeline_source.jsx', 'utf8');
    // axe still counts a named <section role="group"> as a region, so the card boxes are divs.
    expect(source).not.toContain('<section aria-labelledby="\' + cueId + \'"');
    expect(source).not.toContain('<section role="group" aria-labelledby="\' + cueId + \'"');
    expect(source.split('<div role="group" aria-labelledby="\' + cueId + \'"').length - 1).toBe(2);
    expect(source).toContain('const briefHtml = \'<section class="ace-panel ace-brief"><h3');
  });

  it('the shared audit module exposes one independent audit per gate', () => {
    const require = createRequire(import.meta.url);
    const { createAudit, TAGS } = require('../dev-tools/a11y_page_audit.cjs');
    expect(TAGS).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa']);
    const a = createAudit(), b = createAudit();
    a.add('state', 'axe', 'rule', 1, 'detail');
    expect(a.findings).toHaveLength(1);
    expect(b.findings).toHaveLength(0);
    for (const fn of ['audit', 'axeRun', 'keyboard', 'liveStart', 'liveCheck', 'selfTest', 'report']) expect(typeof a[fn]).toBe('function');
    expect(a.report(['state']).text).toMatch(/^FAIL state/);
  });
});
