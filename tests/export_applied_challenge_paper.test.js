// Applied Challenge on paper and in the student copy, plus the IMS manifest (2026-11-11).
//
// A review of a real pack found: the section took 14 of 42 printed pages (whole
// panels refused to split), the self-check asked for a rating with no way to
// give one, criteria and constraints shared one count (Constraint 5-7), the
// student copy showed planning labels meant for the teacher, the name prompt
// printed over the worksheet, and the IMS manifest used IMS MD 1.2 element
// names from a later binding and a translated <schema> value.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

let pipeline;
beforeAll(() => {
  window.React = window.React || { useState: (v) => [v, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), useCallback: (fn) => fn, useMemo: (fn) => fn(), createElement: () => null, Fragment: 'fragment' };
  loadAlloModule('applied_challenge_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {},
    t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {},
  });
}, 60000);
afterEach(() => vi.restoreAllMocks());

const challenge = () => ({
  id: 'ac-paper', type: 'applied-challenge', title: 'Boycott decision',
  data: {
    family: 'decision', scope: 'compact', agencyMode: 'co-framed',
    instructions: 'Decide and explain.', fitReason: 'FIT REASON FOR THE TEACHER',
    brief: {
      context: 'A family in 1768.', drivingQuestion: 'Should the family sign?', lockedLessonFacts: ['Parliament taxed goods.'],
      criteria: ['Names two costs', 'Uses a lesson fact'], constraints: ['One page', 'No invented facts'],
      deliverable: 'A one-page statement.', factVerified: true,
    },
  },
});
const doc = (html) => new JSDOM(html).window.document;
const section = (isTeacher, isWorksheet) => doc(isTeacher
  ? pipeline.generateResourceHTML(challenge(), true, {}, { annotations: [] })
  : pipeline.generateFullPackHTML([challenge()], 'Pack', isWorksheet, {}, { annotations: [], includeTeacherKey: false })).querySelector('.applied-challenge-export');

describe('Applied Challenge student copy and paper', () => {
  it('keeps planning labels and the fit reason on the teacher copy only', () => {
    const student = section(false, false);
    const teacher = section(true, false);
    expect(student.querySelector('.ace-chips')).toBeNull();
    expect(student.textContent).not.toContain('FIT REASON FOR THE TEACHER');
    expect(student.querySelector('h2 span').textContent).toBe('');
    expect(teacher.querySelector('.ace-chips')).not.toBeNull();
    expect(teacher.textContent).toContain('FIT REASON FOR THE TEACHER');
    expect(teacher.querySelector('h2 span').textContent).toMatch(/^\(.+\)$/);
  });

  it('numbers criteria and constraints separately and offers the three ratings', () => {
    const student = section(false, false);
    const rows = [...student.querySelectorAll('.ace-feedback .ace-ledger-row h4')].map((h) => h.textContent);
    expect(rows.map((label) => label.replace(/\D+/g, ''))).toEqual(['1', '2', '1', '2']);
    const groups = student.querySelectorAll('.ace-feedback [role="radiogroup"]');
    expect(groups).toHaveLength(4);
    expect(groups[2].getAttribute('aria-label')).toContain(rows[2]);
    expect([...groups[0].querySelectorAll('input[type="radio"]')].map((input) => input.value)).toEqual(['met', 'partly', 'not-yet']);
    const keys = new Set([...groups[0].querySelectorAll('input')].map((input) => input.getAttribute('data-allo-response-key')));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toMatch(/:applied:selfcheck-.+:rating$/);
  });

  it('prints rating bubbles, two lines for short answers, and lets big panels split', () => {
    const html = pipeline.generateFullPackHTML([challenge()], 'Pack', true, {}, { annotations: [], includeTeacherKey: false });
    const paper = doc(html).querySelector('.applied-challenge-export');
    expect(paper.querySelectorAll('input[type="radio"]')).toHaveLength(0);
    expect(paper.querySelector('.ace-feedback .ace-ledger-row .alloflow-print-bubble')).not.toBeNull();
    expect(paper.querySelectorAll('.ace-feedback .ace-ledger-row').length * 3).toBe(paper.querySelectorAll('.ace-feedback .alloflow-print-bubble').length);
    const where = paper.querySelector('.ace-feedback .ace-ledger-row dd:last-child');
    const workspace = paper.querySelector('.ace-phase');
    expect(where.innerHTML.length).toBeLessThan(workspace.innerHTML.length);
    expect(html).toContain('@media print{.applied-challenge-export .ace-panel{break-inside:auto;');
    expect(paper.textContent).not.toContain('Your writing stays separate');
  });

  it('gives the finished deliverable a full page of lines on paper', () => {
    const paper = doc(pipeline.generateFullPackHTML([challenge()], 'Pack', true, {}, { annotations: [], includeTeacherKey: false })).querySelector('.applied-challenge-export');
    const lines = [...paper.querySelectorAll('.ace-phase')].map((phase) => phase.querySelectorAll('.alloflow-ruled-line').length);
    const most = Math.max(...lines);
    expect(most).toBeGreaterThanOrEqual(20);
    expect(lines.filter((count) => count === most)).toHaveLength(1);
    expect(lines.filter((count) => count !== most).every((count) => count <= 8)).toBe(true);
  });

  it('never uses a default phase prompt that just repeats its heading', () => {
    const AC = window.AlloModules.AppliedChallenge;
    const words = (text) => String(text).toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z ]/g, '').trim();
    for (const family of ['investigate', 'design', 'decide', 'propose', 'explore']) {
      const model = AC.exportModel({ ...challenge().data, family, scope: 'full' });
      for (const phase of model.phases) {
        const heading = words(phase.label);
        expect(words(phase.prompt), family + ' ' + phase.id).not.toContain(heading);
      }
    }
  });

  it('never prints the "Who is working" prompt over the page', () => {
    const html = pipeline.generateFullPackHTML([challenge()], 'Pack', true, {}, { annotations: [] });
    expect(html).toMatch(/@media print \{[^}]*\{[^}]*\}\s*\.alloflow-export-prompt-overlay \{ display: none !important; \}/);
    expect(html).toContain("overlay.className = 'alloflow-export-prompt-overlay';");
  });
});

describe('IMS package manifest', () => {
  const build = async (history, lang) => {
    let zip;
    window.JSZip = class MockZip { constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); } file(name, value) { this.files.set(name, value); } };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ims');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const api = window.AlloModules.createExport({
      liveRef: { current: { history, sourceTopic: 'Topic', studentResponses: {}, addToast: vi.fn(), t: (key) => (key === 'common.ims_content' ? 'Contenido IMS' : key), generateResourceHTML: () => '<p>x</p>' } },
      warnLog: vi.fn(), debugLog: vi.fn(), escapeXml: (v) => String(v), generateUUID: () => '12345678-1234-1234-1234-123456789abc',
    });
    document.documentElement.lang = lang || 'en';
    await api.handleExportIMS();
    return zip;
  };

  it('uses IMS MD 1.2 langstring elements, a fixed schema name, and lists the profile file', async () => {
    const zip = await build([{ id: 'a', type: 'simplified', title: 'Reading', data: 'Text' }], 'es');
    const xml = zip.files.get('imsmanifest.xml');
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(xml).toContain('<schema>IMS Content</schema>');
    expect(xml).not.toContain('Contenido IMS');
    expect(xml).toContain('<lom:langstring xml:lang="es">');
    expect(xml).not.toContain('lom:string');
    expect(xml).toContain('<file href="alloflow-object-profile.json"/>');
  });

  it('keeps identifiers unique when item ids are very long', async () => {
    const long = 'x'.repeat(120);
    const zip = await build([{ id: long, type: 'simplified', title: 'One', data: 'A' }, { id: long, type: 'simplified', title: 'Two', data: 'B' }]);
    const ids = [...zip.files.get('imsmanifest.xml').matchAll(/identifier="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length <= 90)).toBe(true);
  });
});
