// 2026-11-12 worksheet print pass:
//   1. "Start each activity on a new page" (worksheet option) so a name strip never sits alone at a page foot.
//   2. Right-to-left print: concept-map connector stubs point at the hub, and card text starts on the reading side.
//   3. The anchor-chart type label used help_mode.tool_anchor_chart. Packs hold help_strings.js's tool
//      DESCRIPTION under help_mode.* (only ui_strings' English has the short name), so every other
//      language showed a paragraph. Labels and default titles now use sidebar.tool_*.
//   4. The 150px printed hub fits its title.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

let pipeline;
const pack = JSON.parse(readFileSync('allopacks/current/body_systems_grade6.allopack.json', 'utf8')).history;
const conceptMap = pack.find((item) => item.type === 'outline' && item.data && item.data.structureType === 'Key Concept Map');
const anchor = pack.find((item) => item.type === 'anchor-chart');
const parse = (html) => new DOMParser().parseFromString(html, 'text/html');
const css = (doc) => [...doc.querySelectorAll('style')].map((style) => style.textContent).join('\n');

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('anchor_charts_module.js');
  loadAlloModule('export_runtime_copy_module.js');
  loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t: (key) => ({ 'sidebar.tool_anchor_chart': 'Anchor Chart', 'help_mode.tool_anchor_chart': 'Creates a class reference chart with a first draft written for you.' })[key] || key,
    isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type, state: {},
  });
}, 60000);

const BREAK = /\.alloflow-resource-wrap:has\(> \.alloflow-worksheet-continuation\) \{ break-before: page;/;

describe('start each activity on a new page', () => {
  it('adds a page break before each later student activity only when the teacher turns it on', () => {
    const on = parse(pipeline.generateFullPackHTML([conceptMap, anchor], 'Body', true, {}, { annotations: [], worksheetPagePerActivity: true }));
    expect(css(on)).toMatch(BREAK);
    // The break hangs on the continuation strip, which only later student activities carry.
    expect(on.querySelectorAll('.alloflow-resource-wrap > .alloflow-worksheet-continuation')).toHaveLength(1);
    const off = parse(pipeline.generateFullPackHTML([conceptMap, anchor], 'Body', true, {}, { annotations: [] }));
    expect(css(off)).not.toMatch(BREAK);
  });

  it('is offered beside Writing space for worksheets, with a registered label', () => {
    const view = readFileSync('view_export_preview_source.jsx', 'utf8');
    expect(view).toContain('id="alloflow-worksheet-page-per-activity"');
    expect(view).toContain('worksheetPagePerActivity: e.target.checked');
    expect(view).toContain("t('export_preview.worksheet_page_per_activity')");
    const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
    expect(strings.export_preview.worksheet_page_per_activity).toBe('Start each activity on a new page');
  });
});

describe('right-to-left print and the concept-map hub', () => {
  it('places connector stubs with logical sides, so they face the hub in either direction', () => {
    const doc = parse(pipeline.generateResourceHTML(conceptMap, false, {}, { isWorksheet: true }));
    const links = [...doc.querySelectorAll('.allo-hub-link')].map((link) => link.getAttribute('style'));
    expect(links.length).toBeGreaterThan(1);
    for (const style of links) {
      expect(style).toMatch(/inset-inline-(start|end): -43px/);
      expect(style).not.toMatch(/(^|[ ;])(left|right): -43px/);
    }
    for (const card of doc.querySelectorAll('.allo-hub-card')) expect(card.style.textAlign).toBe('start');
  });

  it('fits the title inside the printed 150px hub', () => {
    const doc = parse(pipeline.generateFullPackHTML([conceptMap], 'Body', true, {}, { annotations: [] }));
    expect(css(doc)).toContain('.allo-hub-map > .allo-hub-center { width: 150px !important; height: 150px !important; flex-shrink: 0; padding: 10px !important; }');
    expect(css(doc)).toContain('.allo-hub-map > .allo-hub-center h3 { font-size: 0.95em !important;');
  });
});

describe('anchor chart type label', () => {
  it('uses the short sidebar label, not the help-mode description', () => {
    const doc = parse(pipeline.generateFullPackHTML([anchor], 'Body', true, {}, { annotations: [] }));
    expect(doc.body.textContent).toContain('Anchor Chart');
    expect(doc.body.textContent).not.toContain('Creates a class reference chart');
    for (const file of ['doc_pipeline_source.jsx', 'export_source.jsx']) expect(readFileSync(file, 'utf8')).not.toContain('help_mode.tool_anchor_chart');
    // help_mode.tool_* is a help DESCRIPTION outside English (help_strings.js), so no default title reads it.
    for (const file of ['export_source.jsx', 'AlloFlowANTI.txt']) {
      expect(readFileSync(file, 'utf8')).not.toMatch(/return t\('help_mode\.tool_(note_taking|anchor_chart|memory_aid|applied_challenge)'\)/);
    }
  });

  it('every document-language label file has no paragraph standing in for a short label', () => {
    const require = createRequire(import.meta.url);
    const { garbled } = require('../dev-tools/i18n/build_export_label_catalog.cjs');
    expect(garbled('ar', 'sidebar.tool_anchor_chart', 'ينشئ لوحة مرجعية للصف مع مسودة أولى مكتوبة لك وأيقونات بأسلوب مرسوم باليد. اختر تلقائي')).toBe(true);
    expect(garbled('ar', 'sidebar.tool_anchor_chart', 'الرسم البياني المرجعي')).toBe(false);
    const keys = JSON.parse(readFileSync('dev-tools/i18n/export_label_keys.json', 'utf8'));
    expect(keys).toContain('sidebar.tool_anchor_chart');
    expect(keys).not.toContain('help_mode.tool_anchor_chart');
  });
});
