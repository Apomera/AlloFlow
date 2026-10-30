import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Plan-first lesson layout (2026-10-29): the lesson's own sections come before the teaching script
// and the generation inputs; research detail sits behind disclosures; the bottom print button
// prints this plan, not the whole pack.
const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, PlanView;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  loadAlloModule('resource_content_fingerprint_module.js');
  loadAlloModule('lesson_teaching_script_module.js');
  loadAlloModule('view_lesson_teaching_script_module.js');
  loadAlloModule('view_lesson_plan_module.js');
  PlanView = window.AlloModules.LessonPlanView;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.restoreAllMocks();
});

const materials = [{ id: 'fractions-cards', type: 'source', title: 'Fraction models', data: { text: 'Use models of equal wholes to compare halves and fourths.' } }];
const legacySource = { id: 'wwc', title: 'Organizing Instruction and Study to Improve Student Learning', url: 'https://ies.ed.gov/ncee/wwc/PracticeGuide/1', author: 'What Works Clearinghouse', publishedAt: '2007-09', retrievedAt: '2026-10-29T23:46:27.935Z', scope: 'WWC practice guide for grades K to postsecondary.', evidenceLevel: 'Varies by recommendation', evidenceKind: 'general-practice', recommendations: [{ id: 'quiz-6b', text: 'Use tests and quizzes to identify content that needs to be learned.', locator: 'Recommendation 6b; retrieved page text offset 39', evidenceLevel: 'Moderate evidence' }] };
function script(overrides = {}) {
  return {
    ...baseScript(),
    ...overrides
  };
}
function baseScript() {
  return {
    id: 'script-a', schemaVersion: 2, scope: 'segment', title: 'Compare fractions on a number line', createdAt: '2026-09-04T12:00:00.000Z', durationMinutes: 15,
    researchStatus: 'retrieved', warnings: [],
    inputSnapshot: { settings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', goal: 'Compare fractions' }, materialIds: ['fractions-cards'], materialTitles: [] },
    sources: [legacySource],
    steps: [1, 2, 3].map(index => ({ id: 'step-' + index, title: 'Compare fractions ' + index, minutes: 5, phase: 'directInstruction', teacherSays: 'Place one half on our shared number line. Explain how the equal spaces help you choose its position.', studentDoes: 'Learners explain their placements to a partner.', checkQuestion: 'How do you know where one half belongs?', possibleResponse: 'It is halfway between zero and one.', ifStruggling: 'Fold a paper strip into equal halves together.', ifReady: 'Compare one half with three fourths and explain.', resourceIds: ['fractions-cards'], recommendationIds: ['quiz-6b'] }))
  };
}
const plan = (versions = [script()]) => ({ id: 'plan-a', type: 'lesson-plan', data: { essentialQuestion: 'How can we compare fractions?', objectives: ['Compare fractions using models'], materialsNeeded: ['Fraction strips'], hook: 'Plan hook text', directInstruction: 'Original teacher plan', closure: 'Plan closure text', teachingScripts: versions } });
function props(overrides = {}) {
  return {
    generatedContent: plan(), history: [{ id: 'analysis-a', type: 'analysis' }], teachingScriptMaterials: materials, isTeacherMode: true, isParentMode: false, isIndependentMode: false, t: () => '',
    capabilities: { canGenerate: true, canResearch: true }, defaultSettings: { grade: '4th Grade', gradeSource: 'plan', subject: 'mathematics', subjectDetected: true, topic: 'Fractions', language: 'English', standard: '', phases: ['directInstruction'], suggestedDuration: { segment: 15, lesson: 45 } },
    onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onCancelTeachingScript: vi.fn(), onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onOpenTeachingMaterial: vi.fn(),
    sourceTopic: 'Fractions', gradeLevel: 4, getRows: () => 2, normalizeMaterialItem: value => value, renderFormattedText: value => value,
    BilingualFieldRenderer: ({ text }) => React.createElement('p', null, text), handleExportPDF: vi.fn(), handleExport: vi.fn(),
    ...overrides
  };
}
function mount(value) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(value));
}
const before = (a, b) => Boolean(a && b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING));
const textNode = (text) => Array.from(host.querySelectorAll('*')).find(node => node.children.length === 0 && node.textContent.trim() === text);
function openScript() {
  const toggle = Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === 'Teaching script+');
  if (!toggle) throw new Error('Teaching script toggle not found');
  act(() => toggle.click());
}

describe('plan-first lesson layout', () => {
  it('puts the plan sections before the teaching script and the generation inputs', () => {
    mount(React.createElement(PlanView, props()));
    const lessonText = textNode('Original teacher plan');
    const materialsItem = textNode('Fraction strips');
    const scriptToggle = Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === 'Teaching script+');
    // This fixture records no generation inputs, so the summary renders its one-line note.
    const inputs = textNode('Input versions were not recorded for this saved guide.');
    expect(lessonText, 'plan body renders').toBeTruthy();
    expect(scriptToggle, 'teaching script renders').toBeTruthy();
    expect(inputs, 'generation inputs render').toBeTruthy();
    expect(before(materialsItem, scriptToggle)).toBe(true);
    expect(before(lessonText, scriptToggle)).toBe(true);
    expect(before(scriptToggle, inputs)).toBe(true);
  });

  it('prints only this plan from the bottom print button', () => {
    const handleExportPDF = vi.fn();
    const handleExport = vi.fn();
    mount(React.createElement(PlanView, props({ handleExportPDF, handleExport })));
    const bottom = host.querySelector('[data-lesson-plan-print-bottom]');
    expect(bottom).toBeTruthy();
    act(() => bottom.click());
    expect(handleExportPDF).toHaveBeenCalledOnce();
    expect(handleExport).not.toHaveBeenCalled();
  });

  it('keeps research detail behind disclosures and hides the reader line offset', () => {
    mount(React.createElement(PlanView, props()));
    openScript();
    const sources = host.querySelector('[data-script-sources]');
    expect(sources, 'sources disclosure renders').toBeTruthy();
    expect(sources.open).toBe(false);
    expect(sources.querySelector('summary').textContent).toContain('(1)');
    const about = Array.from(sources.querySelectorAll('details')).find(node => node.querySelector('summary')?.textContent === 'About this source');
    expect(about, 'per-source disclosure renders').toBeTruthy();
    expect(about.open).toBe(false);
    expect(about.textContent).toContain('WWC practice guide');
    const time = about.querySelector('time');
    expect(time.getAttribute('datetime')).toBe('2026-10-29T23:46:27.935Z');
    expect(time.textContent.includes('T23:'), 'readable retrieval date').toBe(false);
    expect(host.textContent.includes('Recommendation 6b'), 'locator kept').toBe(true);
    expect(host.textContent.includes('retrieved page text offset'), 'legacy offset stripped').toBe(false);
  });
});

describe('teaching script woven into the plan', () => {
  const sectionOf = (text) => textNode(text)?.closest('.rounded-lg');
  const toggle = () => Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === 'Show script lines in the plan');

  it('shows each step’s spoken lines under the plan phase it teaches', () => {
    const phased = script({ steps: baseScript().steps.map((step, index) => ({ ...step, phase: ['hook', 'directInstruction', 'closure'][index] })) });
    mount(React.createElement(PlanView, props({ generatedContent: plan([phased]) })));
    const hook = sectionOf('Plan hook text').querySelector('[data-plan-script-phase="hook"]');
    const instruction = sectionOf('Original teacher plan').querySelector('[data-plan-script-phase="directInstruction"]');
    const closure = sectionOf('Plan closure text').querySelector('[data-plan-script-phase="closure"]');
    expect(hook.textContent).toContain('1. Compare fractions 1');
    expect(instruction.textContent).toContain('2. Compare fractions 2');
    expect(closure.textContent).toContain('3. Compare fractions 3');
    expect(instruction.textContent).toContain('Say aloud: Place one half on our shared number line.');
    expect(instruction.textContent).toContain('Ask aloud: How do you know where one half belongs?');
    expect(instruction.textContent).toContain('Based on: Organizing Instruction and Study to Improve Student Learning · Recommendation 6b');
    expect(instruction.textContent.includes('offset'), 'legacy offset stripped').toBe(false);
    const support = instruction.querySelector('details');
    expect(support.open).toBe(false);
    expect(support.textContent).toContain('Fold a paper strip into equal halves together.');
  });

  it('lets the teacher hide the woven lines', () => {
    mount(React.createElement(PlanView, props()));
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelectorAll('[data-plan-script-phase]').length).toBeGreaterThan(0);
    act(() => toggle().click());
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelectorAll('[data-plan-script-phase]').length).toBe(0);
  });

  it('keeps steps without a lesson phase visible in their own block', () => {
    const unphased = script({ steps: baseScript().steps.map((step, index) => index === 2 ? { ...step, phase: '' } : step) });
    mount(React.createElement(PlanView, props({ generatedContent: plan([unphased]) })));
    const other = host.querySelector('[data-plan-script-other]');
    expect(other.textContent).toContain('More script steps');
    expect(other.textContent).toContain('3. Compare fractions 3');
  });

  it('is not shown to families, while editing the plan, or when no script is saved', () => {
    // The family projection already drops teachingScripts; pass the data through unchanged so the view's own audience guard is what is tested.
    const previousTransport = window.AlloModules.SessionTransport;
    window.AlloModules.SessionTransport = { projectStudentGuideData: data => data };
    try {
      mount(React.createElement(PlanView, props({ isParentMode: true })));
      expect(host.querySelector('[data-plan-script-woven]')).toBeNull();
      expect(host.querySelectorAll('[data-plan-script-phase]').length).toBe(0);
    } finally { window.AlloModules.SessionTransport = previousTransport; }
    act(() => root.unmount()); root = null; host.remove();
    mount(React.createElement(PlanView, props({ isEditingLessonPlan: true, toggleLessonPlanEditing: vi.fn(), handleLessonPlanChange: vi.fn() })));
    expect(host.querySelectorAll('[data-plan-script-phase]').length).toBe(0);
    act(() => root.unmount()); root = null; host.remove();
    mount(React.createElement(PlanView, props({ generatedContent: plan([]) })));
    expect(host.querySelector('[data-plan-script-woven]')).toBeNull();
  });

  it('warns when the lesson changed after the script was written', () => {
    const current = window.AlloModules.LessonTeachingScript.captureInputs(plan(), {}, []).planFingerprint;
    mount(React.createElement(PlanView, props({ generatedContent: plan([script({ inputSnapshot: { ...baseScript().inputSnapshot, planFingerprint: 'an-older-plan' } })]) })));
    expect(host.querySelector('[data-plan-script-woven]').textContent).toContain('This lesson changed after the script was written.');
    act(() => root.unmount()); root = null; host.remove();
    const freshPlan = plan();
    freshPlan.data.teachingScripts = [script({ inputSnapshot: { ...baseScript().inputSnapshot, planFingerprint: current } })];
    mount(React.createElement(PlanView, props({ generatedContent: freshPlan })));
    expect(host.querySelector('[data-plan-script-woven]').textContent.includes('This lesson changed'), 'no warning for a current script').toBe(false);
  });
});
