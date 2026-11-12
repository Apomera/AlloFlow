// Resource pack export labels follow the app language (2026-11-11).
//
// The export's own labels (concept sort, DBQ, FAQ, math, note-taking, anchor
// chart, section pills) used to be fixed English, so a class working in another
// language saw English around translated content. Every label now goes through
// t() with an English fallback. These tests render with a t() that marks each
// translated value «like this» and look for labels that skip it.

import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import { loadAlloModule } from './setup.js';

let create;
const english = (key) => key;
const marked = (key) => '«' + key + '»';

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('export_runtime_copy_module.js');
  for (const tag of window.AlloModules.ExportRuntimeCopy.labelTags) loadAlloModule('export_labels/' + tag + '.js');
  loadAlloModule('doc_pipeline_module.js');
  create = (t) => window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type, state: {},
  });
}, 60000);

const items = [
  { id: 'cs', type: 'concept-sort', title: 'Sort', data: { categories: [{ id: 'a', label: 'Plants' }, { id: 'b', label: 'Animals' }], items: [{ content: 'Fern', categoryId: 'a' }, { content: 'Fox', categoryId: 'b' }, { content: 'Moss', categoryId: 'a' }] } },
  { id: 'dbq', type: 'dbq', title: 'Sources', data: { historicalContext: 'Context text', documents: [{ id: 'A', excerpt: 'Text', source: 'Archive', sourcingQuestions: ['Who wrote it?'], analysisQuestions: ['What does it claim?'] }], synthesisPrompt: 'Write your conclusion.', rubric: [{ criteria: 'Thesis', 1: 'a', 2: 'b', 3: 'c', 4: 'd' }] } },
  { id: 'faq', type: 'faq', title: 'Questions', data: [{ question: 'Why?', answer: 'Because.' }] },
  { id: 'lab', type: 'note-taking', title: 'Lab', data: { templateType: 'lab-report' } },
  { id: 'ac', type: 'anchor-chart', title: 'Compare', data: { chartType: 'comparison', sections: [{ label: 'One', bullets: ['x'] }, { label: 'Two', bullets: ['y'] }] } },
];

function render(t, list = items, opts = {}) {
  const html = create(t).generateFullPackHTML(list, 'Labels', !!opts.worksheet, {}, { annotations: [], ...(opts.cfg || {}) });
  return new JSDOM(html, { runScripts: opts.run ? 'dangerously' : undefined, pretendToBeVisual: true, url: 'https://example.test/p.html', virtualConsole: new VirtualConsole() });
}

const textOf = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('export labels follow the app language', () => {
  it('routes concept sort, DBQ, FAQ, lab report and anchor chart labels through t()', () => {
    const doc = render(marked).window.document;
    const controls = [...doc.querySelectorAll('.alloflow-cs-controls button, .alloflow-cs-place-btn, .alloflow-faq-controls button')].map(textOf);
    expect(controls).toEqual(['«export.cs_place_in»', '«export.cs_place_in»', '🎯 «export.cs_check»', '↻ «ui_common.reset»', '▾ «ui_common.show_all»', '▸ «ui_common.hide_all»']);
    expect(doc.querySelector('.alloflow-cs-strips').getAttribute('aria-label')).toBe('«a11y.sortable_items»');
    expect(doc.querySelector('.alloflow-cs-response').getAttribute('aria-label')).toBe('«export.cs_item_placement»');
    const dbq = textOf(doc.getElementById('dbq'));
    for (const key of ['dbq.historical_context', 'dbq.source_prefix_verbatim', 'dbq.sourcing_questions', 'dbq.analysis_questions', 'dbq.synthesis_prompt', 'dbq.rubric_tab', 'ui_common.criteria']) expect(dbq, key).toContain('«' + key + '»');
    expect(dbq).not.toMatch(/Historical Context|Sourcing Questions|Synthesis Essay Prompt|Rubric:/);
    expect(doc.querySelector('#dbq td[data-level]').getAttribute('data-level')).toBe('«export.rubric_level»');
    const lab = [...doc.querySelectorAll('#lab [data-note-typing-space] > div:first-child')].map(textOf);
    expect(lab).toContain('«note_taking.hypothesis»');
    expect(lab.every((label) => label.startsWith('«'))).toBe(true);
    expect(textOf(doc.getElementById('ac'))).toContain('«export.ac_compare»');
    const pills = [...doc.querySelectorAll('.alloflow-section-marker')].map(textOf);
    expect(pills.every((pill) => pill.includes('«'))).toBe(true);
  });

  it('keeps the English answer keys when lab report headings are translated', () => {
    const keys = (t) => [...render(t, [items[3]]).window.document.querySelectorAll('[data-allo-response-key]')].map((el) => el.getAttribute('data-allo-response-key'));
    expect(keys(marked)).toEqual(keys(english));
    expect(keys(marked)).toContain('lab:note:lab:data-observations');
  });

  it('builds the concept sort feedback from translated templates', async () => {
    const dom = render(marked, [items[0]], { run: true });
    const win = dom.window, doc = win.document;
    await new Promise((done) => (doc.readyState === 'complete' ? done() : win.addEventListener('load', done, { once: true })));
    await new Promise((done) => win.setTimeout(done, 50));
    const once = [...doc.querySelectorAll('[role="dialog"] button')].find((button) => /useOnce|once/i.test(button.textContent));
    if (once) { once.click(); await new Promise((done) => win.setTimeout(done, 100)); }
    const ctrl = doc.querySelector('.alloflow-cs-controls');
    ctrl.setAttribute('data-cs-copy-score', 'Bien: {correct}/{total}');
    ctrl.setAttribute('data-cs-copy-placed', '{item} → {category}');
    const strips = [...doc.querySelectorAll('.alloflow-cs-strip')];
    strips[0].click();
    doc.querySelector('.alloflow-cs-place-btn[data-place-for="a"]').click();
    const results = doc.querySelector('.alloflow-cs-results');
    expect(results.textContent).toBe('Fern → Plants');
    doc.querySelector('.alloflow-cs-check-btn').click();
    expect(results.textContent.startsWith('Bien: 1/3')).toBe(true);
    win.close();
  });

  it('shows a reading role on the student copy only when the teacher set one', () => {
    const reading = (role) => ({ id: 'r-' + role, type: 'simplified', title: 'Reading', data: 'A short passage about rivers.', instructionalText: { role, form: 'adapted' } });
    const doc = render(marked, [reading('primary'), reading('unspecified')]).window.document;
    expect(textOf(doc.getElementById('r-primary'))).toContain('«simplified.role_main_reading»');
    expect(doc.body.textContent).not.toMatch(/Not designated|role_not_designated/);
  });
});

// The reader toolbar follows the DOCUMENT language (the same catalog as the
// "Save my answers" box), so a Spanish worksheet made in an English app has a
// Spanish toolbar.
describe('reader toolbar follows the document language', () => {
  const page = (language) => {
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
      t: english, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type,
      getState: () => ({ leveledTextLanguage: language, currentUiLanguage: 'English' }), state: { leveledTextLanguage: language },
    });
    const doc = new JSDOM(pipeline.generateFullPackHTML([items[2]], 'Toolbar', false, {}, { annotations: [] })).window.document;
    return { doc, copy: JSON.parse(doc.getElementById('alloflow-runtime-copy').textContent) };
  };
  const toolbarKeys = (copy) => Object.keys(copy).filter((key) => /^rt[A-Z]/.test(key));

  it('keeps the English toolbar for an English document', () => {
    const { doc, copy } = page('English');
    expect(toolbarKeys(copy).length).toBeGreaterThan(80);
    expect(doc.querySelector('.alloflow-reading-tools-label').textContent).toBe('Theme');
    expect(doc.querySelector('[data-rt-anno-clear]').textContent).toContain('Erase my marks');
    expect(doc.querySelector('.alloflow-tools-panel').innerHTML).not.toContain('undefined');
  });

  it.each([['Spanish', 'es'], ['German', 'de'], ['Arabic', 'ar'], ['Vietnamese', 'vi']])('translates the toolbar for a %s document', (language, tag) => {
    const { doc, copy } = page(language);
    const { copy: en } = page('English');
    expect(doc.documentElement.lang).toBe(tag);
    // A few words are the same in some languages (Sepia, Original).
    const untranslated = toolbarKeys(en).filter((key) => copy[key] === en[key]);
    expect(untranslated.length).toBeLessThanOrEqual(4);
    expect(doc.querySelector('.alloflow-reading-tools-label').textContent).toBe(copy.rtTheme);
    expect(doc.querySelector('[data-rt-anno-clear]').getAttribute('title')).toBe(copy.rtEraseMineTitle);
    expect(doc.querySelector('[data-rt-draw-color="red"]').getAttribute('aria-label')).toBe(copy.rtPenRed);
    expect(doc.querySelector('option[value="dyslexic"]').textContent).toContain('Comic Sans');
  });

  it('translates the annotation and read-aloud messages the page builds while running', async () => {
    const { copy } = page('Spanish');
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
      t: english, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: (type) => type,
      getState: () => ({ leveledTextLanguage: 'Spanish', currentUiLanguage: 'English' }), state: { leveledTextLanguage: 'Spanish' },
    });
    const dom = new JSDOM(pipeline.generateFullPackHTML([items[2]], 'Toolbar', false, {}, { annotations: [] }), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/es.html', virtualConsole: new VirtualConsole() });
    const win = dom.window, doc = win.document;
    await new Promise((done) => (doc.readyState === 'complete' ? done() : win.addEventListener('load', done, { once: true })));
    await new Promise((done) => win.setTimeout(done, 100));
    const once = [...doc.querySelectorAll('.alloflow-export-prompt-overlay button')].find((button) => button.textContent === copy.useOnce);
    if (once) { once.click(); await new Promise((done) => win.setTimeout(done, 150)); }
    expect(copy.rtEraseNothing).toBeTruthy();
    expect(copy.rtEraseNothing).not.toBe('Nothing to erase yet. Your highlights, notes and drawings will show up here.');
    expect(doc.querySelector('[data-rt-anno-clear]').title).toBe(copy.rtEraseNothing);
    expect(win.__alloflowText('rtRemoveAnnoMany', 'x', { count: 3 })).toBe(copy.rtRemoveAnnoMany.replace('{count}', '3'));
    win.close();
  });

  it('carries every toolbar label in every catalog language, as plain text', () => {
    const { copy: en } = page('English');
    const catalog = window.AlloModules.ExportRuntimeCopy.catalog;
    const gaps = [];
    for (const tag of Object.keys(catalog)) for (const key of toolbarKeys(en)) {
      const value = catalog[tag][key];
      if (typeof value !== 'string' || !value.trim() || /[<>"]/.test(value)) gaps.push(tag + '.' + key);
    }
    expect(gaps).toEqual([]);
  });
});

// Labels inside resources follow the DOCUMENT language too, from the per-language
// files (export_labels/<tag>.js) built by dev-tools/i18n/build_export_label_catalog.cjs.
// The teacher copy, and any label the set lacks, stay in the app language.
describe('resource labels follow the document language', () => {
  const make = (language, uiLanguage = 'English', updateExportPreview = () => {}) => window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t: marked, isRtlLang: () => false, updateExportPreview, getDefaultTitle: (type) => type,
    getState: () => ({ leveledTextLanguage: language, currentUiLanguage: uiLanguage }), state: { leveledTextLanguage: language, currentUiLanguage: uiLanguage },
  });
  const labels = () => window.AlloModules.ExportLabels;
  const pack = (pipeline) => new JSDOM(pipeline.generateFullPackHTML([items[0], items[3]], 'Labels', false, {}, { annotations: [] })).window.document;

  it('uses the document language for student labels when it differs from the app language', () => {
    const doc = pack(make('Vietnamese'));
    const check = [...doc.querySelectorAll('.alloflow-cs-controls button')].map(textOf);
    expect(check[0]).toBe('🎯 ' + labels().vi['export.cs_check']);
    expect(labels().vi['export.cs_check']).not.toBe('Check my sort');
    expect(doc.querySelector('.alloflow-cs-strips').getAttribute('aria-label')).toBe(labels().vi['a11y.sortable_items']);
    expect([...doc.querySelectorAll('#lab [data-note-typing-space] > div:first-child')].map(textOf)).toContain(labels().vi['note_taking.hypothesis'] || '«note_taking.hypothesis»');
  });

  it('fills placeholders in document-language labels', () => {
    const doc = pack(make('Vietnamese'));
    const place = textOf(doc.querySelector('.alloflow-cs-place-btn'));
    expect(place).toBe(labels().vi['export.cs_place_in'].replace('{category}', 'Plants'));
    expect(place).not.toContain('{');
  });

  it('keeps the app language when the document is in the app language, and on the teacher copy', () => {
    const same = pack(make('Vietnamese', 'Vietnamese'));
    expect(textOf(same.querySelector('.alloflow-cs-check-btn'))).toBe('🎯 «export.cs_check»');
    const teacher = make('Vietnamese').generateResourceHTML(items[0], true, {}, { annotations: [] });
    expect(teacher).toContain('«export.cs_answer_key»');
    expect(teacher).not.toContain(labels().vi['export.cs_category']);
  });

  it('falls back to the app language for a label the set lacks or that carries markup', () => {
    const real = window.AlloModules.ExportLabels;
    try {
      const vi = { ...real.vi, 'export.cs_check': '<img src=x onerror=alert(1)>' };
      delete vi['ui_common.reset'];
      window.AlloModules.ExportLabels = { vi };
      const buttons = [...pack(make('Vietnamese')).querySelectorAll('.alloflow-cs-controls button')].map(textOf);
      expect(buttons).toEqual(['🎯 «export.cs_check»', '↻ «ui_common.reset»']);
    } finally { window.AlloModules.ExportLabels = real; }
  });

  it('fills placeholders when the pipeline passes values to a label', () => {
    const [key, value] = Object.entries(labels().vi).find(([, v]) => /\{through\}/.test(v) && /\{total\}/.test(v));
    const real = window.AlloModules.AppliedChallenge;
    try {
      window.AlloModules.AppliedChallenge = { renderPreset: (data, preset, t) => '<p id="slot">' + t(key, { through: 7, total: 40 }) + '</p>' };
      const html = make('Vietnamese').generateResourceHTML({ id: 'x', type: 'applied-challenge', data: { appliedChallengeExportPreset: 'task' } }, false, {}, { annotations: [] });
      const text = textOf(new JSDOM(html).window.document.getElementById('slot'));
      expect(text).toBe(value.replace('{through}', '7').replace('{total}', '40'));
      expect(text).not.toContain('{');
    } finally { window.AlloModules.AppliedChallenge = real; }
  });

  it('fetches a language file the first time it is needed, then refreshes the preview', async () => {
    const real = window.AlloModules.ExportLabels;
    const asked = [];
    let refreshed = 0;
    try {
      window.AlloModules.ExportLabels = {};
      // Like a script tag, the file registers itself after the current render.
      window.__alloLoadPlugin = (file) => { asked.push(file); return Promise.resolve().then(() => { window.AlloModules.ExportLabels = { vi: real.vi }; return true; }); };
      const pipeline = make('Vietnamese', 'English', () => { refreshed++; });
      expect(textOf(pack(pipeline).querySelector('.alloflow-cs-check-btn'))).toBe('🎯 «export.cs_check»');
      await new Promise((done) => setTimeout(done, 0));
      expect(asked).toEqual(['export_labels/vi.js']);
      expect(refreshed).toBe(1);
      expect(textOf(pack(pipeline).querySelector('.alloflow-cs-check-btn'))).toBe('🎯 ' + real.vi['export.cs_check']);
      expect(asked).toHaveLength(1);
    } finally { window.AlloModules.ExportLabels = real; delete window.__alloLoadPlugin; }
  });

  it('keeps the app language when a language file cannot load, and asks only once', async () => {
    const real = window.AlloModules.ExportLabels;
    const asked = [];
    let refreshed = 0;
    try {
      window.AlloModules.ExportLabels = {};
      window.__alloLoadPlugin = (file) => { asked.push(file); return Promise.resolve(false); };
      const pipeline = make('Portuguese (Brazil)', 'English', () => { refreshed++; });
      pack(pipeline); pack(pipeline);
      await new Promise((done) => setTimeout(done, 0));
      expect(asked).toEqual(['export_labels/pt.js']);
      expect(refreshed).toBe(0);
      expect(textOf(pack(pipeline).querySelector('.alloflow-cs-check-btn'))).toBe('🎯 «export.cs_check»');
    } finally { window.AlloModules.ExportLabels = real; delete window.__alloLoadPlugin; }
  });

  it('keeps every label as plain text with the same placeholders as the English', () => {
    const strings = JSON.parse(require('node:fs').readFileSync(require('node:path').resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
    const english = (key) => key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), strings);
    const slots = (text) => (String(text).match(/\{\w+\}/g) || []).sort().join(',');
    const problems = [];
    for (const [tag, set] of Object.entries(labels())) for (const [key, value] of Object.entries(set)) {
      if (typeof value !== 'string' || !value.trim() || /[<>&"]/.test(value)) problems.push(tag + ' ' + key + ' markup');
      else if (typeof english(key) === 'string' && slots(value) !== slots(english(key))) problems.push(tag + ' ' + key + ' placeholders');
      else if (typeof english(key) === 'string' && /\s$/.test(value) !== /\s$/.test(english(key))) problems.push(tag + ' ' + key + ' trailing space');
    }
    expect(problems).toEqual([]);
    expect(Object.keys(labels()).sort()).toEqual([...window.AlloModules.ExportRuntimeCopy.labelTags].sort());
  });
});

// The build script's own filters; a lost escape once disabled two of them silently.
describe('export label build checks', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const script = path.resolve(process.cwd(), 'dev-tools/i18n/build_export_label_catalog.cjs');
  const { usable, garbled, fit } = require(script);

  it('has no control characters where an escape should be', () => {
    expect(fs.readFileSync(script, 'utf8')).not.toMatch(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  });

  it('rejects half-translated values and keeps real translations', () => {
    expect(garbled('it', 'alignment.no_activities', 'No interattivo attività found.')).toBe(true);
    expect(garbled('de', 'export.cs_check', 'Thema und andere')).toBe(false);
    expect(garbled('hi', 'alignment.no_activities', 'नहीं इंटरैक्टिव गतिविधियां found')).toBe(true);
    expect(garbled('hi', 'analysis.section_range', 'विभाग {number} · वर्ण {start}–{end}')).toBe(false);
  });

  it('keeps values plain text with matching placeholders and spacing', () => {
    expect(usable('analysis.section_range', 'Teil {number} · {start}–{end}')).toBe(true);
    expect(usable('analysis.section_range', 'Teil {number}')).toBe(false);
    expect(usable('export.cs_check', '<b>Prüfen</b>')).toBe(false);
    expect(fit('export.cs_check', ' Prüfen ')).toBe('Prüfen');
  });
});
