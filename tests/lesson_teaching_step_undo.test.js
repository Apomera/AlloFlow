import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, View, PlanView;
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
  View = window.AlloModules.LessonTeachingScriptView;
  PlanView = window.AlloModules.LessonPlanView;
});
beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  window.AlloModules.LessonTeachingScriptView = View;
  vi.restoreAllMocks(); vi.useRealTimers();
});
const materials = [{ id: 'fractions-cards', type: 'source', title: 'Fraction models', data: { text: 'Use models of equal wholes to compare halves and fourths.' } }, { id: 42, type: 'quiz', title: 'Fraction comparison check', data: { questions: [{ question: 'Which fraction is larger?', options: ['One half', 'One fourth'], answer: 'One half' }] } }];
function script(id = 'script-a', overrides = {}) {
  return {
    id, schemaVersion: 2, scope: 'segment', title: 'Compare fractions on a number line', createdAt: '2026-09-04T12:00:00.000Z', durationMinutes: 15,
    researchStatus: 'retrieved', warnings: ['Teaching guidance is not a verification of every generated step.'],
    inputSnapshot: { settings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', goal: 'Compare fractions' }, materialIds: ['fractions-cards'], materialTitles: [] },
    sources: [{ id: 'wwc', title: 'Developing Effective Fractions Instruction', url: 'https://ies.ed.gov/ncee/wwc/PracticeGuide/15', author: 'Institute of Education Sciences', publishedAt: '2010-09', retrievedAt: '2026-09-04', scope: 'K–8 fractions guidance, applied to this grade 4 lesson.', evidenceLevel: 'Moderate evidence', evidenceKind: 'content-specific', recommendations: [{ id: 'number-line', text: 'Use number lines as a central representation of fractions.', locator: 'Recommendation 2', evidenceLevel: 'Moderate evidence' }] }],
    steps: [1,2,3].map(index => ({ id: 'step-' + index, title: 'Compare fractions ' + index, minutes: 5, phase: 'directInstruction', teacherSays: 'Place one half on our shared number line. Explain how the equal spaces help you choose its position.', studentDoes: 'Learners explain their placements to a partner.', checkQuestion: 'How do you know where one half belongs?', possibleResponse: 'It is halfway between zero and one.', ifStruggling: 'Fold a paper strip into equal halves together.', ifReady: 'Compare one half with three fourths and explain.', resourceIds: ['fractions-cards'], recommendationIds: ['number-line'] })),
    ...overrides
  };
}
function plan(id = 'plan-a', versions = []) {
  return { id, type: 'lesson-plan', data: { essentialQuestion: 'How can we compare fractions?', objectives: ['Compare fractions using models'], directInstruction: 'Original teacher plan', teachingScripts: versions } };
}
const defaults = (overrides = {}) => ({ grade: '4th Grade', gradeSource: 'plan', subject: 'mathematics', subjectDetected: true, topic: 'Comparing fractions', language: 'English', standard: '', phases: ['directInstruction'], suggestedDuration: { segment: 15, lesson: 45 }, ...overrides });
function props(overrides = {}) {
  return { generatedContent: plan(), history: materials, isTeacherMode: true, isParentMode: false, isIndependentMode: false, t: () => '', capabilities: { canGenerate: true, canResearch: true }, defaultSettings: defaults(), onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onCancelTeachingScript: vi.fn(), onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onOpenTeachingMaterial: vi.fn(), ...overrides };
}
function mount(value) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(value));
}
function button(label) {
  const found = Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === label);
  if (!found) throw new Error('Button not found: ' + label);
  return found;
}
function click(label) { act(() => button(label).click()); }
function expand() { click('Teaching script+'); }
function field(label) {
  const found = Array.from(host.querySelectorAll('label')).find(node => node.textContent.trim() === label || node.textContent.trim().startsWith(label));
  if (!found) throw new Error('Field not found: ' + label);
  return found.htmlFor ? host.querySelector('[id="' + found.htmlFor + '"]') : found.querySelector('input,select,textarea');
}
function change(label, value) {
  const node = field(label), prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit() { await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
function deferred() { let resolve, reject; const promise = new Promise((yes,no) => {resolve=yes;reject=no;}); return {promise,resolve,reject}; }


function clickStep(index) { act(() => host.querySelector('[aria-label="Regenerate step ' + index + '"]').click()); }
async function replacement() { await act(async () => button('Generate replacement').click()); }
const newStep = (index = 1) => ({ ...script().steps[index - 1], title: 'A clearer explanation', teacherSays: 'Look at our matching fraction strips. Tell your partner why the equal-sized whole matters before comparing these pieces.' });
function editingProps(overrides = {}) { return props({ generatedContent: plan('plan-a', [script()]), draftScope: 'teacher-workspace', onRegenerateTeachingStep: vi.fn().mockResolvedValue({ ok: true, step: newStep() }), ...overrides }); }

const undoButton = index => host.querySelector('[aria-label="Undo step replacement ' + index + '"]');
function undo(index) { act(() => undoButton(index).click()); }
function remount(p) {
  act(() => root.unmount()); root = null; host.remove(); host = null;
  mount(React.createElement(View, p));
}
const recoveryKey = () => Object.keys(window.sessionStorage).find(key => key.startsWith('alloflow:lesson-script-session:'));

describe('undoing an individual generated step', () => {
  it('restores exact pre-replacement teacher wording, preserving later edits to other steps', async () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Step title 1', 'My original explanation'); change('Teacher says · 1', '  ' + script().steps[0].teacherSays + '\n');
    change('Minutes 1', '4'); change('Minutes 2', '6');
    p.onRegenerateTeachingStep.mockResolvedValue({ ok: true, step: { ...newStep(), minutes: 4 } });
    clickStep(1); await replacement(); change('Step title 2', 'Keep my later teacher edit');
    undo(1);
    expect(field('Step title 1').value).toBe('My original explanation');
    expect(field('Teacher says · 1').value).toBe('  ' + script().steps[0].teacherSays + '\n');
    expect(field('Minutes 1').value).toBe('4'); expect(field('Minutes 2').value).toBe('6');
    expect(field('Step title 2').value).toBe('Keep my later teacher edit');
    expect(undoButton(1)).toBeNull(); expect(document.activeElement).toBe(field('Step title 1'));
    expect(host.textContent).toContain('Your other edits are still here.'); expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();
  });
  it('keeps one undo per step and restores only the most recent replacement', async () => {
    const p = editingProps({ onRegenerateTeachingStep: vi.fn().mockResolvedValueOnce({ ok: true, step: newStep() }).mockResolvedValueOnce({ ok: true, step: newStep(2) }).mockResolvedValueOnce({ ok: true, step: { ...newStep(), title: 'Another explanation' } }) });
    mount(React.createElement(View, p)); expand(); clickStep(1); await replacement(); clickStep(2); await replacement(); clickStep(1); await replacement();
    undo(1); expect(field('Step title 1').value).toBe('A clearer explanation'); expect(undoButton(1)).toBeNull();
    expect(undoButton(2)).toBeTruthy(); undo(2); expect(field('Step title 2').value).toBe('Compare fractions 2');
  });
  it.each([['Step title 1', 'My newer title'], ['Teacher says · 1', 'My new teacher wording remains even while I am still writing it.'], ['Minutes 1', '6']])('removes undo after manually editing %s so newer work cannot be erased', async (label, value) => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    expect(undoButton(1)).toBeTruthy(); change(label, value); expect(undoButton(1)).toBeNull();
    remount(p); expect(undoButton(1)).toBeNull(); expect(field(label).value).toBe(value);
  });
  it('recovers undo through navigation and works without an AI connection', async () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script'); change('Step title 1', 'Original teacher wording'); clickStep(1); await replacement();
    remount({ ...p, capabilities: { canGenerate: false, canResearch: false }, onRegenerateTeachingStep: null });
    expect(field('Step title 1').value).toBe('A clearer explanation'); undo(1);
    expect(field('Step title 1').value).toBe('Original teacher wording'); expect(button('Save edits').disabled).toBe(false);
  });
  it('keeps the main draft recoverable when optional undo would exceed the tab storage limit', async () => {
    const large = script();
    for (const step of large.steps) for (const key of ['teacherSays', 'studentDoes', 'checkQuestion', 'possibleResponse', 'ifStruggling', 'ifReady']) step[key] = 'Detailed teaching words. '.repeat(600).slice(0, 14000);
    const replacementStep = { ...large.steps[0], title: 'A replacement worth reviewing' };
    const p = editingProps({ generatedContent: plan('plan-a', [large]), onRegenerateTeachingStep: vi.fn().mockResolvedValue({ ok: true, step: replacementStep }) });
    mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    expect(undoButton(1)).toBeTruthy();
    const stored = window.sessionStorage.getItem(recoveryKey());
    expect(stored.length).toBeLessThanOrEqual(800000); expect(JSON.parse(stored).draft.stepUndo).toEqual([]);
    expect(JSON.parse(stored).draft.steps[0].title).toBe('A replacement worth reviewing');
    expect(host.textContent).not.toContain('could not keep a recovery copy');
    remount(p); expect(field('Step title 1').value).toBe('A replacement worth reviewing'); expect(undoButton(1)).toBeNull();
  });
  it.each(['missing', 'unknown-id', 'duplicate', 'phase', 'minutes', 'shape', 'oversized'])('retains the recovered draft while ignoring %s undo metadata', async corruption => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    const key = recoveryKey(), stored = JSON.parse(window.sessionStorage.getItem(key));
    if (corruption === 'missing') delete stored.draft.stepUndo;
    if (corruption === 'unknown-id') stored.draft.stepUndo[0].stepId = 'unknown';
    if (corruption === 'duplicate') stored.draft.stepUndo.push(stored.draft.stepUndo[0]);
    if (corruption === 'phase') stored.draft.stepUndo[0].previous.phase = 'closure';
    if (corruption === 'minutes') stored.draft.stepUndo[0].previous.minutes = 7;
    if (corruption === 'shape') delete stored.draft.stepUndo[0].previous.teacherSays;
    if (corruption === 'oversized') stored.draft.stepUndo[0].previous.title = 'a'.repeat(1001);
    window.sessionStorage.setItem(key, JSON.stringify(stored)); remount(p);
    expect(field('Step title 1').value).toBe('A clearer explanation'); expect(host.textContent).toContain('Recovered unsaved script edits'); expect(undoButton(1)).toBeNull();
  });
  it('refuses undo when the saved version changed', async () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    const changed = script(); changed.steps[0].title = 'Changed externally';
    act(() => root.render(React.createElement(View, { ...p, generatedContent: plan('plan-a', [changed]) })));
    expect(undoButton(1).disabled).toBe(true); undo(1); expect(field('Step title 1').value).toBe('A clearer explanation');
  });
  it('keeps undo after a failed save and clears it after saving successfully', async () => {
    const pending = deferred(), p = editingProps({ onUpdateTeachingScript: vi.fn().mockImplementationOnce(() => pending.promise).mockResolvedValueOnce({ ok: true }) });
    mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    act(() => button('Save edits').click()); expect(undoButton(1).disabled).toBe(true);
    await act(async () => pending.resolve({ ok: false, error: 'Save was interrupted.' }));
    expect(undoButton(1).disabled).toBe(false); remount(p); expect(undoButton(1)).toBeTruthy();
    await act(async () => button('Save edits').click()); expect(undoButton(1)).toBeNull();
    expect(JSON.parse(window.sessionStorage.getItem(recoveryKey())).draft).toBeNull();
  });
  it('locks undo during another regeneration and keeps it after cancellation or failure', async () => {
    const pending = deferred(), p = editingProps({ onRegenerateTeachingStep: vi.fn().mockResolvedValueOnce({ ok: true, step: newStep() }).mockImplementationOnce(() => pending.promise).mockResolvedValueOnce({ ok: false, error: 'Try again.' }) });
    mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    clickStep(2); act(() => button('Generate replacement').click()); expect(undoButton(1).disabled).toBe(true);
    click('Cancel generation'); await act(async () => pending.resolve({ ok: true, step: newStep(2) })); expect(undoButton(1).disabled).toBe(false);
    await replacement(); expect(undoButton(1)).toBeTruthy(); undo(1); expect(field('Step title 1').value).toBe('Compare fractions 1');
  });
  it('clears undo when all edits are discarded', async () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); clickStep(1); await replacement(); click('Discard edits'); click('Discard changes');
    expect(undoButton(1)).toBeNull(); click('Edit script'); expect(undoButton(1)).toBeNull(); remount(p); expect(undoButton(1)).toBeNull();
  });
  it.each(['plan', 'actor'])('isolates recovered undo when changing the %s', async kind => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    remount({ ...p, ...(kind === 'plan' ? { generatedContent: plan('plan-b', [script()]) } : { draftScope: 'another-teacher' }) });
    expand(); expect(undoButton(1)).toBeNull(); expect(host.textContent).not.toContain('A clearer explanation');
  });
});

describe('saving completed recovered generation', () => {
  it.each(['ready', 'chunking'])('explains a complete %s checkpoint without claiming sections remain', async stage => {
    const p = props({ onGetTeachingScriptRecovery: () => ({ stage, completedChunks: 3, totalChunks: 3 }) });
    mount(React.createElement(View, p)); expand();
    expect(host.textContent).toContain('All sections are ready. Finish saving'); expect(host.textContent).not.toContain('remaining sections');
    expect(button('Finish saving').disabled).toBe(false); await submit(); expect(p.onGenerateTeachingScript).toHaveBeenCalledTimes(1);
  });
  it('can finish saving a ready script without AI or research access while Start over stays disabled', async () => {
    const p = props({ capabilities: { canGenerate: false, canResearch: false }, onGetTeachingScriptRecovery: () => ({ stage: 'ready', completedChunks: 3, totalChunks: 3 }), onDiscardTeachingScriptRecovery: vi.fn() });
    mount(React.createElement(View, p)); expand(); expect(button('Finish saving').disabled).toBe(false); expect(button('Start over').disabled).toBe(true);
    await submit(); expect(p.onGenerateTeachingScript).toHaveBeenCalledTimes(1); expect(p.onDiscardTeachingScriptRecovery).not.toHaveBeenCalled();
  });
});

