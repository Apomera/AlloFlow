import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, PlanView;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  loadAlloModule('view_lesson_plan_module.js');
  loadAlloModule('anchor_charts_module.js');
  PlanView = window.AlloModules.LessonPlanView;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks();
  localStorage.removeItem('alloflow_stem_stations');
});
const labels = {
  'common.edit': 'Edit', 'common.done': 'Done', 'common.check': 'Check',
  'common.refresh': 'Refresh', 'common.generate': 'Generate',
  'brainstorm.generate_guide': 'Generate teacher guide', 'brainstorm.creating_guide': 'Creating guide',
  'progression.build_btn': 'Build this lesson', 'progression.analyze_btn': 'Explore next lessons',
};
function props(extra = {}) {
  return {
    generatedContent: { id: 'plan', type: 'lesson-plan', data: {
      essentialQuestion: 'How do fractions compare?', objectives: ['Compare fractions'],
      extensions: [{ title: 'Explore equivalent fractions', description: 'Use fraction models.' }],
      recommendedStemTools: [{ id: 'fractions', rationale: 'Compare parts.' }],
    } },
    history: [], isTeacherMode: true, sourceTopic: 'Fractions', gradeLevel: 4,
    t: key => labels[key] || key, getRows: () => 2, normalizeMaterialItem: value => value,
    renderFormattedText: value => value,
    BilingualFieldRenderer: ({ text }) => React.createElement('span', null, text),
    setActiveStation: vi.fn(), addToast: vi.fn(), handleToggleIsEditingLessonPlan: vi.fn(),
    ...extra,
  };
}
function mount(value) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(value));
}
function button(text) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
  if (!found) throw new Error('Missing button: ' + text);
  return found;
}
function createStation(config) {
  mount(React.createElement(PlanView, config));
  act(() => button('📌 Create Station').click());
}

describe('Lesson Plan station saving', () => {
  it('preserves existing stations and activates the new station only after saving it', () => {
    const existing = { id: 'existing', name: 'Existing station', tools: ['geometry'] };
    localStorage.setItem('alloflow_stem_stations', JSON.stringify([existing]));
    const config = props(); createStation(config);
    const saved = JSON.parse(localStorage.getItem('alloflow_stem_stations'));
    expect(saved).toHaveLength(2); expect(saved[0]).toEqual(existing);
    expect(saved[1]).toMatchObject({ name: 'Fractions Station', tools: ['fractions'] });
    expect(config.setActiveStation).toHaveBeenCalledExactlyOnceWith(saved[1]);
    expect(config.addToast).toHaveBeenCalledOnce();
  });
  it.each(['not JSON', '{"station":"recoverable"}', 'null'])('keeps invalid saved data intact and explains the failed save: %s', raw => {
    localStorage.setItem('alloflow_stem_stations', raw);
    const config = props(); createStation(config);
    expect(localStorage.getItem('alloflow_stem_stations')).toBe(raw);
    expect(config.setActiveStation).not.toHaveBeenCalled();
    expect(config.addToast).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('could not be saved'), 'error');
  });
  it('does not report success or activate an unsaved station when storage is full', () => {
    const existing = JSON.stringify([{ id: 'existing', tools: ['geometry'] }]);
    localStorage.setItem('alloflow_stem_stations', existing);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    const config = props(); createStation(config);
    expect(localStorage.getItem('alloflow_stem_stations')).toBe(existing);
    expect(config.setActiveStation).not.toHaveBeenCalled();
    expect(config.addToast).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('could not be saved'), 'error');
  });
});

describe('Lesson Plan action names', () => {
  it('exposes the visible edit and guide actions, and announces their current state', () => {
    const config = props(); mount(React.createElement(PlanView, config));
    expect(button('Edit').getAttribute('aria-label')).toBeNull();
    expect(button('Edit').getAttribute('aria-pressed')).toBe('false');
    expect(button('Generate teacher guide').getAttribute('aria-label')).toBeNull();
    expect(button('Generate teacher guide').getAttribute('aria-busy')).toBe('false');
    act(() => root.render(React.createElement(PlanView, { ...config, isEditingLessonPlan: true, isGeneratingExtensionGuide: { 0: true } })));
    expect(button('Done').getAttribute('aria-pressed')).toBe('true');
    expect(button('Creating guide').getAttribute('aria-busy')).toBe('true');
    expect(button('Creating guide').disabled).toBe(true);
  });
  it('distinguishes next-lesson and tool actions by their destination', () => {
    mount(React.createElement(PlanView, props({ progressionData: [
      { nextTopic: 'Equivalent fractions', rationale: 'Use equal parts' },
      { nextTopic: 'Comparing decimals', rationale: 'Extend the model' },
    ] })));
    const names = [...host.querySelectorAll('button')].map(node => node.getAttribute('aria-label')).filter(Boolean);
    expect(names).toContain('Build this lesson: Equivalent fractions');
    expect(names).toContain('Build this lesson: Comparing decimals');
    expect(names).toContain('Open Tool: fractions');
  });
});

describe('Anchor Chart shared typography', () => {
  it('does not load a separate decorative font sheet or modify other resources when printing', () => {
    expect(document.querySelector('#anchor-charts-fonts')).toBeNull();
    const css = document.querySelector('#anchor-charts-module-a11y').textContent;
    expect(css).not.toMatch(/}\s*textarea,\s*input\s*{/);
    expect(css).toContain('.ac-root textarea, .ac-root input');
  });
  it('uses inherited families and scalable content in the reading and editing views', () => {
    const config = {
      generatedContent: { id: 'chart', type: 'anchor-chart', data: { title: 'Water cycle', sections: [{ id: 'evaporation', label: 'Evaporation', bullets: ['Water becomes vapor'] }] } },
      isTeacherMode: true, handleNoteUpdate: vi.fn(), allowRuntimeAi: false, t: key => key,
    };
    mount(React.createElement(window.AlloModules.AnchorChartView, config));
    expect(host.querySelector('.ac-title').style.fontSize).toBe('2.625rem');
    expect(host.querySelector('.ac-section-label').style.fontFamily).toBe('inherit');
    expect(host.querySelector('.ac-section-label').style.fontSize).toBe('1.375rem');
    const body = [...host.querySelectorAll('.ac-bullets span')].find(node => node.textContent === 'Water becomes vapor');
    expect(body.style.fontFamily).toBe('inherit'); expect(body.style.fontSize).toBe('1.125rem');
    act(() => host.querySelector('[data-help-key="anchor_chart_edit_toggle"]').click());
    expect(host.querySelector('input[aria-label="Bullet 1"]').style.fontFamily).toBe('inherit');
    expect(host.querySelector('input[aria-label="Bullet 1"]').style.fontSize).toBe('1.125rem');
  });
});
