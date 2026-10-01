import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let api, mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeAll(() => {
  const compiled = readFileSync(resolve('educator_evaluation_module.js'), 'utf8');
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { aeSubmissionMissing, AeFormalObservations, AeSpm };})();'))({ React });
});
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } });
function mountWorkflow(kind, record, role) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { container, root };
  const teacher = { id: 't1', code: 'T1', name: 'Educator', active: true };
  const item = { id: 'r1', teacherId: 't1', version: 1, prework: {}, ratings: {}, rationales: {}, componentTags: [], revisions: [], ...record };
  const workspace = { teachers: [teacher], comments: [], config: { sampleMode: false, evaluatorName: 'Evaluator' }, observations: kind === 'formal' ? [item] : [], spms: kind === 'spm' ? [item] : [] };
  const update = vi.fn((_id, changes) => { Object.assign(item, changes); render(); return true; });
  const render = () => root.render(React.createElement(kind === 'formal' ? api.AeFormalObservations : api.AeSpm, {
    workspace, selectedTeacher: teacher, role, setSelectedTeacherId: vi.fn(), createObservation: vi.fn(), createSpm: vi.fn(), updateObservation: update, updateSpm: update, updateTeacher: vi.fn(), addComment: vi.fn(),
  }));
  act(render); update.mockClear();
  return { container, item, update, render: changes => act(() => { Object.assign(item, changes); render(); }) };
}
const button = (container, text) => Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === text);
const textField = (container, labelText) => Array.from(container.querySelectorAll('label')).find(item => item.querySelector('span')?.textContent.trim() === labelText)?.querySelector('textarea');
function type(element, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const completePlan = { context: 'Context', baseline: 'Baseline', goal: 'Goal', measures: 'Measures', actionPlan: 'Actions' };
describe('required-text readiness', () => {
  it.each(['', '   ', '\t\n', '\u0000\u0007\u001f'])('rejects text the repository treats as empty (%j)', value => {
    expect(api.aeSubmissionMissing({ reflection: value }, 'formal-reflection')).toEqual(['Reflection / self-assessment']);
  });
  it('accepts actual text with surrounding whitespace', () => {
    expect(api.aeSubmissionMissing({ reflection: '  Evidence-informed reflection. \n' }, 'formal-reflection')).toEqual([]);
  });
  it('accepts zero ratings and rejects fractional domain ratings', () => {
    const record = { ratings: { d1: 0, d2: 1, d3: 2, d4: 3 }, rationales: { d1: 'Evidence', d2: 'Evidence', d3: 'Evidence', d4: 'Evidence' } };
    expect(api.aeSubmissionMissing(record, 'formal-assessment')).toEqual([]);
    record.ratings.d1 = 1.5;
    expect(api.aeSubmissionMissing(record, 'formal-assessment')).toHaveLength(1);
    record.ratings.d1 = 0; record.rationales.d3 = ' ';
    expect(api.aeSubmissionMissing(record, 'formal-assessment')).toHaveLength(1);
  });
  it.each(['context', 'baseline', 'goal', 'measures', 'actionPlan'])('requires substantive SPM %s', field => {
    expect(api.aeSubmissionMissing({ ...completePlan, [field]: '  ' }, 'spm-plan')).toHaveLength(1);
  });
});
it('explains missing prework and enables submission when the educator fills the required fields', () => {
  const { container, update } = mountWorkflow('formal', { prework: { plan: ' ', outcomes: '\n' } }, 'teacher');
  const submit = button(container, 'Submit pre-observation materials');
  expect(submit.disabled).toBe(true);
  const helpId = submit.getAttribute('aria-describedby');
  expect(container.querySelector('#' + helpId).textContent).toContain('Lesson / unit plan summary');
  const plan = textField(container, 'Lesson / unit plan summary');
  const outcomes = textField(container, 'Expected student learning outcomes');
  expect(plan.maxLength).toBe(30000); expect(outcomes.maxLength).toBe(20000);
  expect(plan.getAttribute('aria-required')).toBe('true');
  type(plan, 'Lesson plan'); type(outcomes, 'Expected outcomes');
  expect(submit.disabled).toBe(false);
  expect(container.querySelector('#' + helpId).textContent).toContain('Required information is complete');
  act(() => submit.click());
  expect(update).toHaveBeenLastCalledWith('r1', expect.objectContaining({ preworkSubmittedAt: expect.any(String) }), 'SUBMITTED', 'Pre-observation materials submitted');
});
it.each([
  ['formal', { observedAt: '2026-09-04', evidence: ' ', privacyChecked: true }, 'evaluator', 'Publish evidence to teacher', 'Factual evidence'],
  ['formal', { evidencePublishedAt: '2026-09-04', reflection: ' ' }, 'teacher', 'Submit reflection', 'Reflection / self-assessment'],
  ['formal', { reflectionSubmittedAt: '2026-09-04', postConferenceNotes: ' ' }, 'evaluator', 'Mark post-conference complete', 'Post-conference'],
  ['formal', { postConferenceAt: '2026-09-04', ratings: { d1: 0, d2: 1, d3: 2, d4: 3 }, rationales: { d1: 'Evidence', d2: 'Evidence', d3: ' ', d4: 'Evidence' } }, 'evaluator', 'Sign evaluator assessment', 'rationale'],
  ['spm', { status: 'draft', ...completePlan, goal: ' ' }, 'teacher', 'Submit plan for approval', 'Goal statement'],
  ['spm', { status: 'approved', results: 'Measured growth', reflection: ' ' }, 'teacher', 'Submit results and reflection', 'Teacher reflection'],
  ['spm', { status: 'submitted', ...completePlan, firstOpenedAt: '2026-09-04', pendingReturnReason: ' ' }, 'evaluator', 'Return for revision', 'Reason for returning'],
])('blocks blank required content and explains why (%#)', (kind, record, role, label, missing) => {
  const { container, update } = mountWorkflow(kind, record, role);
  const action = button(container, label);
  expect(action.disabled).toBe(true);
  expect(container.querySelector('#' + action.getAttribute('aria-describedby')).textContent).toContain(missing);
  act(() => action.click()); expect(update).not.toHaveBeenCalled();
});
it('keeps optional prework fields optional while applying their repository limits', () => {
  const { container } = mountWorkflow('formal', { prework: { plan: 'Plan', outcomes: 'Outcomes' } }, 'teacher');
  expect(button(container, 'Submit pre-observation materials').disabled).toBe(false);
  expect(textField(container, 'Resources and planned supports').maxLength).toBe(20000);
  expect(textField(container, 'Assessment / evidence of learning').maxLength).toBe(20000);
  expect(textField(container, 'Secure artifact references / links').maxLength).toBe(10000);
  expect(textField(container, 'Resources and planned supports').getAttribute('aria-required')).toBeNull();
});
it('applies matching text limits to the plan, results, and rating fields', () => {
  const { container, render } = mountWorkflow('spm', { status: 'draft', ...completePlan }, 'teacher');
  expect(Array.from(container.querySelectorAll('fieldset textarea')).slice(0, 5).map(item => item.maxLength)).toEqual([20000, 20000, 20000, 20000, 20000]);
  render({ status: 'approved' });
  expect(textField(container, 'Year-end results').maxLength).toBe(30000);
  expect(textField(container, 'Teacher reflection').maxLength).toBe(30000);
});
