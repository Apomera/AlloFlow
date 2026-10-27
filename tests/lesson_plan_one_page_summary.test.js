import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// "Lesson at a glance" shows authored planned timing, and teachers can print the same facts as a
// one-page summary. Mounting mirrors lesson_plan_overview_links.test.js (real shell helpers).
const require = createRequire(import.meta.url);
const native = require('../agent_core_pack_native_module.js');
let React, createRoot, act, PlanView, root, host, shellHelpers;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('ExternalLink', () => null);
  loadAlloModule('phase_k_helpers_module.js');
  loadAlloModule('view_renderers_module.js');
  loadAlloModule('module_scope_extras_module.js');
  loadAlloModule('view_lesson_plan_module.js');
  PlanView = window.AlloModules.LessonPlanView;
  const source = readFileSync('AlloFlowANTI.txt', 'utf8');
  const slice = (start, end) => {
    const from = source.indexOf(start), to = source.indexOf(end, from);
    if (from < 0 || to < 0) throw new Error('Lesson formatting helper not found: ' + start);
    return source.slice(from, to);
  };
  const helpers = slice('const normalizeResourceLinks =', 'const formatInlineText =')
    + slice('const BilingualFieldRenderer =', 'const REFERENCES_HEADER_RE =');
  const { code } = require('@babel/core').transformSync(helpers, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false });
  const createShellHelpers = new Function('React', 'renderFormattedText', 't', 'generatedContent', 'getSpeechLangCode', 'getContentDirection', `
    const currentUiLanguage = 'English';
    ${code}
    return { normalizeResourceLinks, normalizeMaterialItem, BilingualFieldRenderer };
  `);
  const language = window.AlloModules.ModuleScopeExtras;
  shellHelpers = (react, render, translate, artifact) => createShellHelpers(react, render, translate, artifact, language.getSpeechLangCode, language.getContentDirection);
}, 30000);

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.restoreAllMocks();
  document.querySelectorAll('iframe').forEach(frame => frame.remove());
});
afterAll(() => vi.unstubAllGlobals());

function mount(data, { isTeacherMode = true, title = 'Fractions on a line' } = {}) {
  const t = () => '';
  const inlineDeps = { history: [], handleRestoreView: vi.fn(), addToast: vi.fn(), t, highlightGlossaryTerms: text => text, getDefaultTitle: () => 'Resource' };
  let helpers;
  const renderFormattedText = text => window.AlloModules.ViewRenderers.renderFormattedText(text, true, false, {
    sanitizeTruncatedCitations: text => text, normalizeResourceLinks: helpers.normalizeResourceLinks, t,
    formatInlineText: (...args) => window.AlloModules.PhaseKHelpers.formatInlineText(...args, inlineDeps),
  });
  const artifact = { id: 'plan', type: 'lesson-plan', title, data, config: { gradeLevel: '4th Grade' } };
  helpers = shellHelpers(React, renderFormattedText, t, artifact);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(React.createElement(PlanView, { generatedContent: artifact, isTeacherMode, t, ...helpers, renderFormattedText })));
  return host;
}

const plan = {
  essentialQuestion: 'Where does 3/4 sit on a number line?',
  objectives: ['Place fractions on a number line.', 'Explain <script>alert(1)</script> safely.'],
  successCriteria: ['I can place 3/4 between 0 and 1.', { statement: 'I can explain my placement.' }],
  materialsNeeded: ['Number line strips', 'See [Fraction models](resource:fraction-models)'],
  assessmentIdeas: ['Exit ticket: place two fractions.'],
  timing: [{ label: 'Warm-up', minutes: 5 }, { label: 'Model and practise', minutes: 20 }, { label: 'Exit ticket', minutes: 5 }],
};

function printSummary(container) {
  const written = [];
  const popup = { document: { write: html => written.push(html), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
  const open = vi.spyOn(window, 'open').mockReturnValue(popup);
  const button = container.querySelector('[data-lesson-plan-print-summary]');
  act(() => button.click());
  return { html: written.join(''), popup, open };
}

describe('Lesson at a glance: planned timing', () => {
  it('shows authored timing with a total when no whole-lesson script exists', () => {
    const container = mount(plan);
    const list = container.querySelector('[data-lesson-planned-timing]');
    expect([...list.querySelectorAll('li')].map(li => li.textContent)).toEqual(['Warm-up · 5 minutes', 'Model and practise · 20 minutes', 'Exit ticket · 5 minutes']);
    expect(container.querySelector('[data-lesson-overview]').textContent).toContain('Total: 30 minutes');
  });
  it('lets a timed whole-lesson script take precedence and ignores malformed steps', () => {
    const script = { scope: 'lesson', schemaVersion: 2, title: 'Script', durationMinutes: 10, steps: [{ title: 'Open', minutes: 4 }, { title: 'Practise', minutes: 6 }] };
    expect(mount({ ...plan, teachingScripts: [script] }).querySelector('[data-lesson-planned-timing]')).toBeNull();
    root && act(() => root.unmount()); root = null; host.remove();
    const bad = mount({ ...plan, timing: [{ label: '', minutes: 5 }, { label: 'Zero', minutes: 0 }, { label: 'Fraction', minutes: 2.5 }] });
    expect(bad.querySelector('[data-lesson-planned-timing]')).toBeNull();
  });
});

describe('Print 1-page summary', () => {
  it('prints the plan facts as escaped plain text on one compact page', () => {
    const { html, popup, open } = printSummary(mount(plan));
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(popup.print).toHaveBeenCalledTimes(1);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('h1').textContent).toBe('Fractions on a line');
    expect(doc.body.textContent).toContain('Where does 3/4 sit on a number line?');
    const sections = Object.fromEntries([...doc.querySelectorAll('section')].map(s => [s.querySelector('h2').textContent, [...s.querySelectorAll('li')].map(li => li.textContent)]));
    expect(sections['Objectives']).toEqual(['Place fractions on a number line.', 'Explain <script>alert(1)</script> safely.']);
    expect(sections['Success criteria']).toEqual(['I can place 3/4 between 0 and 1.', 'I can explain my placement.']);
    expect(sections['Materials']).toEqual(['Number line strips', 'See Fraction models']);
    expect(sections['Phase timing']).toEqual(['Warm-up · 5 minutes', 'Model and practise · 20 minutes', 'Exit ticket · 5 minutes']);
    expect(doc.querySelector('.total').textContent).toBe('Total: 30 minutes');
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(html).not.toContain('resource:fraction-models');
    expect(html).toContain('@page');
  });
  it('falls back to a hidden frame when pop-ups are blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const container = mount(plan);
    act(() => container.querySelector('[data-lesson-plan-print-summary]').click());
    const frame = document.querySelector('iframe[aria-hidden="true"]');
    expect(frame).not.toBeNull();
    expect(frame.contentDocument.querySelector('h1').textContent).toBe('Fractions on a line');
  });
  it('is a teacher tool only', () => {
    expect(mount(plan, { isTeacherMode: false }).querySelector('[data-lesson-plan-print-summary]')).toBeNull();
  });
  it('summarises the real Thinking Together teacher guide with its 60 planned minutes', () => {
    const pack = JSON.parse(readFileSync('allopacks/academic_discourse_reading_space_grade6.allopack.json', 'utf8'));
    const guide = pack.history.find(r => r.id === 'reading-space-teaching-playbook');
    const { html } = printSummary(mount(guide.data, { title: guide.title }));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('.total').textContent).toBe('Total: 60 minutes');
    expect(doc.body.textContent).toContain('I can explain my idea with a case fact and a reason.');
    expect(doc.body.textContent).not.toMatch(/\*\*|\]\(/);
  });
});

describe('native validator: lesson-plan timing', () => {
  it('accepts labelled whole-minute steps and rejects malformed timing', () => {
    const pack = timing => ({ allopack: { spec: '0.1', title: 'T', language: 'en' }, history: [{ id: 'tp-plan', type: 'lesson-plan', title: 'P', timestamp: '2026-10-25T00:00:00.000Z', data: { essentialQuestion: 'Q?', objectives: ['O.'], timing } }] });
    const service = require('../agent_core_resource_pack_module.js');
    const codes = timing => service.validatePack(pack(timing), { profile: 'native' }).errors.map(e => e.path).filter(p => /timing/.test(p));
    expect(codes([{ label: 'Warm-up', minutes: 5 }])).toEqual([]);
    expect(codes([{ label: 'Warm-up', minutes: 0 }]).length).toBeGreaterThan(0);
    expect(codes([{ label: 'Warm-up', minutes: 2.5 }]).length).toBeGreaterThan(0);
    expect(codes([{ minutes: 5 }]).length).toBeGreaterThan(0);
    expect(codes('5 minutes').length).toBeGreaterThan(0);
    expect(native).toBeTruthy();
  });
});
