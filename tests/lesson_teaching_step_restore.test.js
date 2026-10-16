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


const restoreButton = index => host.querySelector('[aria-label="Restore saved step ' + index + '"]');
const undoRestoreButton = index => host.querySelector('[aria-label="Undo step restore ' + index + '"]');
function restoreStep(index) { act(() => restoreButton(index).click()); }
function undoRestore(index) { act(() => undoRestoreButton(index).click()); }
function draftSteps() { return JSON.parse(window.sessionStorage.getItem(recoveryKey())).draft.steps; }

describe('restoring one saved teaching step', () => {
  it('restores all saved step content without saving or changing other teacher edits', () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    expect(restoreButton(1)).toBeNull();
    change('Step title 1', 'My revised introduction'); change('Teacher says · 1', '  My unfinished explanation  ');
    change('Step title 2', 'Keep this teacher edit'); change('Teacher says · 2', '  ' + script().steps[1].teacherSays + '\n');
    const before = draftSteps(); restoreStep(1);
    expect(draftSteps()[0]).toEqual(script().steps[0]); expect(draftSteps().slice(1)).toEqual(before.slice(1));
    expect(restoreButton(1)).toBeNull(); expect(undoRestoreButton(1)).toBeTruthy();
    expect(document.activeElement).toBe(field('Step title 1')); expect(button('Save edits').disabled).toBe(false);
    expect(host.textContent).toContain('saved wording and minutes in your draft');
    expect(p.onUpdateTeachingScript).not.toHaveBeenCalled(); expect(p.onRegenerateTeachingStep).not.toHaveBeenCalled();
    change('Step title 3', 'Keep a later edit'); undoRestore(1);
    expect(draftSteps()[0]).toEqual(before[0]); expect(field('Step title 3').value).toBe('Keep a later edit');
    expect(button('Save edits').disabled).toBe(true); expect(undoRestoreButton(1)).toBeNull();
    expect(document.activeElement).toBe(field('Step title 1'));
  });
  it('restores saved minutes without silently redistributing other steps, and undo recovers the pacing', () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Minutes 1', '4'); change('Minutes 2', '6'); restoreStep(1);
    expect(field('Minutes 1').value).toBe('5'); expect(field('Minutes 2').value).toBe('6');
    expect(host.textContent).toContain('Remove 1 minute across steps'); expect(button('Save edits').disabled).toBe(true);
    remount(p); undoRestore(1);
    expect(field('Minutes 1').value).toBe('4'); expect(field('Minutes 2').value).toBe('6');
    expect(button('Save edits').disabled).toBe(false);
  });
  it.each(['', '0', '-2', '1.5', '100'])('restores and recovers unfinished or invalid minutes %j', value => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Minutes 1', value); change('Teacher says · 1', ''); const before = draftSteps()[0]; restoreStep(1);
    expect(field('Minutes 1').value).toBe('5'); expect(button('Save edits').disabled).toBe(false);
    remount(p); expect(undoRestoreButton(1)).toBeTruthy(); undoRestore(1);
    expect(draftSteps()[0]).toEqual(before); expect(button('Save edits').disabled).toBe(true);
  });
  it('works offline when several steps are incomplete and repairs them independently', () => {
    const p = editingProps({ capabilities: { canGenerate: false, canResearch: false }, onRegenerateTeachingStep: null });
    mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Teacher says · 1', ''); change('Step title 2', ''); change('Step title 3', 'Keep my completed edit');
    restoreStep(1); expect(field('Step title 2').value).toBe(''); expect(button('Save edits').disabled).toBe(true);
    restoreStep(2); expect(field('Step title 3').value).toBe('Keep my completed edit'); expect(button('Save edits').disabled).toBe(false);
    expect(undoRestoreButton(1)).toBeTruthy(); expect(undoRestoreButton(2)).toBeTruthy();
    undoRestore(1); expect(field('Teacher says · 1').value).toBe(''); expect(undoRestoreButton(2)).toBeTruthy();
  });
  it('keeps one undo per step when restoring a generated replacement', async () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); clickStep(1); await replacement();
    expect(undoButton(1)).toBeTruthy(); restoreStep(1);
    expect(undoButton(1)).toBeNull(); expect(undoRestoreButton(1)).toBeTruthy();
    undoRestore(1); expect(field('Step title 1').value).toBe('A clearer explanation');
    expect(undoRestoreButton(1)).toBeNull(); expect(undoButton(1)).toBeNull();
  });
  it('replaces a restore undo with the next generated replacement undo', async () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Step title 1', 'A manual edit'); restoreStep(1); clickStep(1); await replacement();
    expect(undoRestoreButton(1)).toBeNull(); expect(undoButton(1)).toBeTruthy(); undo(1);
    expect(field('Step title 1').value).toBe(script().steps[0].title); expect(undoRestoreButton(1)).toBeNull();
  });
  it.each([['Step title 1', 'A newer title'], ['Minutes 1', '6'], ['Teacher says · 1', 'New wording in progress']])('accepts a restore when the teacher edits %s and keeps the newer work', (label, value) => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Step title 1', 'Earlier edit'); restoreStep(1); change(label, value);
    expect(undoRestoreButton(1)).toBeNull(); remount(p); expect(undoRestoreButton(1)).toBeNull(); expect(field(label).value).toBe(value);
  });
  it('locks restoration and undo when the saved version changes', () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Step title 1', 'Earlier edit'); restoreStep(1); change('Step title 2', 'Keep my draft');
    const changed = script(); changed.steps[0].title = 'Changed elsewhere';
    act(() => root.render(React.createElement(View, { ...p, generatedContent: plan('plan-a', [changed]) })));
    expect(undoRestoreButton(1).disabled).toBe(true); expect(restoreButton(2).disabled).toBe(true);
    undoRestore(1); restoreStep(2); expect(field('Step title 2').value).toBe('Keep my draft'); expect(field('Step title 1').value).toBe(script().steps[0].title);
  });
  it('cannot restore from a missing saved version in a recovered draft', () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script'); change('Step title 1', 'My recovery');
    remount({ ...p, generatedContent: plan('plan-a') });
    expect(restoreButton(1)).toBeNull(); expect(field('Step title 1').value).toBe('My recovery'); expect(button('Save edits').disabled).toBe(true);
  });
  it('locks step recovery during generation and makes it available after cancellation', async () => {
    const pending = deferred(), p = editingProps({ onRegenerateTeachingStep: vi.fn(() => pending.promise) });
    mount(React.createElement(View, p)); expand(); click('Edit script');
    change('Step title 1', 'Earlier edit'); restoreStep(1); change('Step title 2', 'Keep my draft');
    clickStep(3); act(() => button('Generate replacement').click());
    expect(undoRestoreButton(1).disabled).toBe(true); expect(restoreButton(2).disabled).toBe(true);
    click('Cancel generation'); await act(async () => pending.resolve({ ok: true, step: newStep(3) }));
    expect(undoRestoreButton(1).disabled).toBe(false); expect(restoreButton(2).disabled).toBe(false);
    expect(field('Step title 3').value).toBe(script().steps[2].title);
  });
  it('retains restore undo after a failed save and clears it when saving succeeds', async () => {
    const pending = deferred(), p = editingProps({ onUpdateTeachingScript: vi.fn().mockImplementationOnce(() => pending.promise).mockResolvedValueOnce({ ok: true }) });
    mount(React.createElement(View, p)); expand(); click('Edit script'); change('Step title 1', 'Earlier edit'); restoreStep(1); change('Step title 2', 'Keep this edit');
    act(() => button('Save edits').click()); expect(undoRestoreButton(1).disabled).toBe(true); expect(restoreButton(2).disabled).toBe(true);
    await act(async () => pending.resolve({ ok: false, error: 'Saving interrupted.' })); remount(p);
    expect(undoRestoreButton(1)).toBeTruthy(); await act(async () => button('Save edits').click());
    expect(p.onUpdateTeachingScript.mock.calls[1][2][0]).toEqual(script().steps[0]); expect(JSON.parse(window.sessionStorage.getItem(recoveryKey())).draft).toBeNull();
  });
  it('clears restore undo when all edits are discarded', () => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script'); change('Step title 1', 'Earlier edit'); restoreStep(1); change('Step title 2', 'Another edit');
    click('Discard edits'); click('Discard changes'); click('Edit script'); expect(undoRestoreButton(1)).toBeNull(); remount(p); expect(undoRestoreButton(1)).toBeNull();
  });
  it.each(['unknown-kind', 'wrong-phase', 'duplicate-id', 'oversized'])('keeps the main draft while rejecting %s restore metadata', corruption => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script'); change('Minutes 1', '4'); restoreStep(1); change('Step title 2', 'Keep this edit');
    const key = recoveryKey(), stored = JSON.parse(window.sessionStorage.getItem(key));
    if (corruption === 'unknown-kind') stored.draft.stepUndo[0].kind = 'arbitrary';
    if (corruption === 'wrong-phase') stored.draft.stepUndo[0].previous.phase = 'closure';
    if (corruption === 'duplicate-id') stored.draft.stepUndo.push(stored.draft.stepUndo[0]);
    if (corruption === 'oversized') stored.draft.stepUndo[0].previous.title = 'x'.repeat(1001);
    window.sessionStorage.setItem(key, JSON.stringify(stored)); remount(p);
    expect(undoRestoreButton(1)).toBeNull(); expect(field('Step title 2').value).toBe('Keep this edit'); expect(host.textContent).toContain('Recovered unsaved script edits');
  });
  it.each(['plan', 'actor'])('isolates restore recovery when changing the %s', kind => {
    const p = editingProps(); mount(React.createElement(View, p)); expand(); click('Edit script'); change('Step title 1', 'Earlier edit'); restoreStep(1);
    remount({ ...p, ...(kind === 'plan' ? { generatedContent: plan('plan-b', [script()]) } : { draftScope: 'another-teacher' }) }); expand();
    expect(undoRestoreButton(1)).toBeNull(); expect(button('Edit script')).toBeTruthy();
  });
});
