import { afterEach, beforeAll, expect, it, vi } from 'vitest';
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
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { AeTextDraftContext, AeFormalObservations, AeSpm, aeReviewSnapshot, aeDraftReviewText };})();'))({ React });
});
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } });
const completePlan = { context: 'Context', baseline: 'Baseline', goal: 'Goal', measures: 'Measures', actionPlan: 'Actions' };
function mountWorkflow(kind, record = {}, role = 'teacher') {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { container, root };
  const teacher = { id: 't1', code: 'T1', name: 'Educator', active: true };
  const item = { id: 'r1', teacherId: 't1', version: 1, prework: { plan: 'Plan', outcomes: 'Outcomes' }, ratings: {}, rationales: {}, componentTags: [], revisions: [], status: 'draft', ...completePlan, ...record };
  const workspace = { teachers: [teacher], comments: [], config: { academicYear: '2026-27', sampleMode: false, evaluatorName: 'Evaluator' }, observations: kind === 'formal' ? [item] : [], spms: kind === 'spm' ? [item] : [] };
  const drafts = new Map(); let accepted = false, visible = true, currentRole = role, readOnlyPreview = false;
  const update = vi.fn((_id, changes, _event, _summary, snapshot) => {
    if (!accepted || (snapshot && snapshot !== api.aeReviewSnapshot(item))) return false;
    Object.assign(item, changes); render(); return true;
  });
  const render = () => root.render(React.createElement(api.AeTextDraftContext.Provider, { value: drafts }, visible ? React.createElement(kind === 'formal' ? api.AeFormalObservations : api.AeSpm, {
    workspace, selectedTeacher: teacher, role: currentRole, readOnlyPreview, setSelectedTeacherId: vi.fn(), createObservation: vi.fn(), createSpm: vi.fn(), updateObservation: update, updateSpm: update, updateTeacher: vi.fn(), addComment: vi.fn(),
  }) : null));
  act(render); update.mockClear();
  return { container, item, update, drafts, teacher, workspace,
    accept: () => { accepted = true; },
    render: changes => act(() => { Object.assign(item, changes); render(); }),
    show: value => act(() => { visible = value; render(); }),
    role: value => act(() => { currentRole = value; render(); }),
    preview: value => act(() => { readOnlyPreview = value; render(); }),
    refresh: () => act(render),
  };
}
const button = (container, text) => Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === text);
const field = (container, text) => Array.from(container.querySelectorAll('label')).find(item => item.querySelector('span')?.textContent.trim() === text)?.querySelector('textarea, input, select');
function type(element, value) {
  act(() => {
    const prototype = element.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : element.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
const click = (container, label) => act(() => button(container, label).click());
it.each([
  ['formal', {}, 'teacher', 'Lesson / unit plan summary', 'Submit pre-observation materials'],
  ['formal', { observedAt: '2026-09-04', evidence: 'Evidence', privacyChecked: true }, 'evaluator', 'Time-stamped factual evidence', 'Publish evidence to teacher'],
  ['formal', { evidencePublishedAt: '2026-09-04', reflection: 'Reflection' }, 'teacher', 'Reflection / self-assessment', 'Submit reflection'],
  ['spm', {}, 'teacher', 'Unit / goal statement and expected outcomes', 'Submit plan for approval'],
  ['spm', { status: 'approved', results: 'Results', reflection: 'Reflection' }, 'teacher', 'Year-end results', 'Submit results and reflection'],
  ['spm', { status: 'submitted', firstOpenedAt: '2026-09-04' }, 'evaluator', 'Reason if returning', 'Return for revision'],
])('preserves refused %s edits and blocks advancing (%#)', (kind, record, role, label, action) => {
  const h = mountWorkflow(kind, record, role);
  type(field(h.container, label), 'My unsaved words');
  expect(field(h.container, label).value).toBe('My unsaved words');
  expect(h.drafts.size).toBe(1);
  expect(button(h.container, action).disabled).toBe(true);
  h.update.mockClear(); click(h.container, action); expect(h.update).not.toHaveBeenCalled();
  h.show(false); h.show(true);
  expect(field(h.container, label).value).toBe('My unsaved words');
  h.accept(); click(h.container, 'Retry saving edits');
  expect(h.drafts.size).toBe(0);
  expect(field(h.container, label).value).toBe('My unsaved words');
  expect(button(h.container, action).disabled).toBe(false);
});
it('collects multiple nested prework edits and retries them together', () => {
  const h = mountWorkflow('formal');
  type(field(h.container, 'Lesson / unit plan summary'), 'New plan');
  type(field(h.container, 'Expected student learning outcomes'), 'New outcomes');
  expect(h.item.prework).toEqual({ plan: 'Plan', outcomes: 'Outcomes' });
  h.accept(); click(h.container, 'Retry saving edits');
  expect(h.item.prework).toEqual({ plan: 'New plan', outcomes: 'New outcomes' });
});
it('keeps unsuccessful retries and discards only the recovery copy', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Unsaved goal');
  click(h.container, 'Retry saving edits');
  expect(h.drafts.size).toBe(1);
  click(h.container, 'Discard unsaved workflow edits');
  expect(h.drafts.size).toBe(0); expect(h.item.goal).toBe('Goal');
  expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Goal');
});
it('compares changed records and refuses to overwrite a newer version', () => {
  const h = mountWorkflow('formal');
  type(field(h.container, 'Lesson / unit plan summary'), 'My older edit');
  h.render({ prework: { plan: 'Newer saved plan', outcomes: 'New outcomes' } });
  h.accept(); h.update.mockClear();
  expect(button(h.container, 'Retry saving edits').disabled).toBe(true);
  expect(h.container.textContent).toContain('Newer saved plan');
  expect(h.container.textContent).toContain('My older edit');
  type(field(h.container, 'Lesson / unit plan summary'), 'Continued older edit');
  expect(h.update).not.toHaveBeenCalled();
  click(h.container, 'Discard unsaved workflow edits');
  expect(field(h.container, 'Lesson / unit plan summary').value).toBe('Newer saved plan');
});
it('keeps recovery scoped to the educator role, year, and record', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Private unfinished goal');
  h.role('evaluator'); expect(h.container.textContent).not.toContain('These edits have not been saved.');
  expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Goal');
  h.role('teacher'); expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Private unfinished goal');
  h.workspace.config.academicYear='2027-28'; h.refresh(); expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Goal');
  h.workspace.config.academicYear='2026-27'; h.render({ id: 'r2' }); expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Goal');
  h.render({ id: 'r1' }); expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Private unfinished goal');
});
it('keeps submitted or locked edits copyable without allowing retries', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Keep for reference');
  h.render({ status: 'locked', rating: 2, lockedAt: '2026-09-04' });
  expect(h.container.textContent).toContain('Keep for reference');
  expect(button(h.container, 'Retry saving edits').disabled).toBe(true);
  click(h.container, 'Discard unsaved workflow edits'); expect(h.item.status).toBe('locked');
});
it('does not allow retry in preview or after cycle finalization', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Keep my draft');
  h.preview(true); expect(button(h.container, 'Retry saving edits').disabled).toBe(true);
  h.preview(false); h.teacher.finalizedAt='2026-09-04'; h.refresh();
  expect(button(h.container, 'Retry saving edits').disabled).toBe(true);
  click(h.container, 'Discard unsaved workflow edits'); expect(h.drafts.size).toBe(0);
});
it('retains a zero rating, preserves its audit event on retry, and blocks locking', () => {
  const h = mountWorkflow('spm', { status: 'results_submitted', results: 'Results', reflection: 'Reflection', rating: 2, ratingRationale: 'Evidence' }, 'evaluator');
  type(field(h.container, 'Human-selected SPM rating'), '0');
  type(field(h.container, 'Rating rationale'), 'Rationale for zero');
  expect(button(h.container, 'Review rating & lock').disabled).toBe(true);
  h.accept(); click(h.container, 'Retry saving edits');
  expect(h.item.rating).toBe(0);
  expect(h.update).toHaveBeenLastCalledWith('r1', { rating: 0, ratingRationale: 'Rationale for zero' }, 'RATING_UPDATED', 'Recovered workflow edits saved', expect.any(String));
});
it('shows readable nested recovery text in the panel close review', () => {
  const h = mountWorkflow('formal');
  type(field(h.container, 'Lesson / unit plan summary'), 'Copy this lesson');
  const [key, draft] = [...h.drafts][0];
  expect(api.aeDraftReviewText(key, draft)).toContain('prework / plan: Copy this lesson');
  expect(api.aeDraftReviewText(key, draft)).not.toContain('{');
});
it('does not leave recovery copies after accepted saves', () => {
  const h = mountWorkflow('spm'); h.accept();
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Saved goal');
  expect(h.item.goal).toBe('Saved goal'); expect(h.drafts.size).toBe(0);
  expect(h.container.textContent).not.toContain('These edits have not been saved.');
});
it('clears recovery when the user restores all saved values without another write', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Temporary edit');
  h.update.mockClear();
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Goal');
  expect(h.drafts.size).toBe(0); expect(h.update).not.toHaveBeenCalled();
  expect(button(h.container, 'Submit plan for approval').disabled).toBe(false);
});
it('disables approval until a refused return reason is saved or discarded', () => {
  const h = mountWorkflow('spm', { status: 'submitted', firstOpenedAt: '2026-09-04' }, 'evaluator');
  type(field(h.container, 'Reason if returning'), 'Please revise measures');
  expect(button(h.container, 'Approve plan').disabled).toBe(true);
  h.update.mockClear(); click(h.container, 'Approve plan'); expect(h.update).not.toHaveBeenCalled();
});
it.each([
  ['formal', 'observations', 'Lesson / unit plan summary'],
  ['spm', 'spms', 'Unit / goal statement and expected outcomes'],
])('keeps removed %s record edits accessible without recreating the record', (kind, collection, label) => {
  const h = mountWorkflow(kind);
  type(field(h.container, label), 'Recover these missing-record words');
  h.workspace[collection] = []; h.refresh(); h.update.mockClear();
  expect(h.container.textContent).toContain('The saved record is no longer available');
  const copy = h.container.querySelector('textarea[aria-label^="Unfinished edits"]');
  expect(copy.value).toContain('Recover these missing-record words'); expect(copy.readOnly).toBe(true);
  expect(button(h.container, 'Retry saving edits')).toBeUndefined();
  expect(button(h.container, 'Open saved record')).toBeUndefined();
  h.show(false); h.show(true);
  expect(h.container.querySelector('textarea[aria-label^="Unfinished edits"]').value).toContain('Recover these missing-record words');
  click(h.container, 'Discard this recovery copy');
  expect(h.drafts.size).toBe(0); expect(h.workspace[collection]).toEqual([]); expect(h.update).not.toHaveBeenCalled();
});
it('reopens unfinished edits for another saved formal record', () => {
  const h = mountWorkflow('formal');
  type(field(h.container, 'Lesson / unit plan summary'), 'First record edit');
  const second = { ...h.item, id: 'r2', prework: { plan: 'Second plan', outcomes: 'Second outcomes' } };
  h.workspace.observations.push(second); h.refresh();
  type(field(h.container, 'Observation record'), 'r2');
  expect(field(h.container, 'Lesson / unit plan summary').value).toBe('Second plan');
  expect(h.container.textContent).toContain('Other unfinished edits (1)');
  click(h.container, 'Open saved record');
  expect(field(h.container, 'Observation record').value).toBe('r1');
  expect(field(h.container, 'Lesson / unit plan summary').value).toBe('First record edit');
  expect(h.container.textContent).not.toContain('Other unfinished edits (1)');
});
it('keeps multiple recovery copies separate when one is discarded', () => {
  const h = mountWorkflow('formal');
  type(field(h.container, 'Lesson / unit plan summary'), 'First record edit');
  h.workspace.observations.push({ ...h.item, id: 'r2', prework: { plan: 'Second plan', outcomes: 'Second outcomes' } }); h.refresh();
  type(field(h.container, 'Observation record'), 'r2');
  type(field(h.container, 'Lesson / unit plan summary'), 'Second record edit');
  expect(h.drafts.size).toBe(2);
  click(h.container, 'Discard this recovery copy');
  expect(h.drafts.size).toBe(1);
  expect(field(h.container, 'Lesson / unit plan summary').value).toBe('Second record edit');
  expect(h.workspace.observations[0].prework.plan).toBe('Plan');
  expect(h.workspace.observations[1].prework.plan).toBe('Second plan');
});
it('does not expose unavailable recovery copies in another role, year, educator, or workflow', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Scoped missing-record draft');
  h.workspace.spms=[]; h.refresh();
  expect(h.container.querySelector('textarea[aria-label^="Unfinished edits"]')).not.toBeNull();
  h.role('evaluator'); expect(h.container.querySelector('textarea[aria-label^="Unfinished edits"]')).toBeNull();
  h.role('teacher'); h.workspace.config.academicYear='2027-28'; h.refresh();
  expect(h.container.querySelector('textarea[aria-label^="Unfinished edits"]')).toBeNull();
  h.workspace.config.academicYear='2026-27'; h.teacher.id='t2'; h.refresh();
  expect(h.container.querySelector('textarea[aria-label^="Unfinished edits"]')).toBeNull();
  h.teacher.id='t1';
  const [key, draft]=[...h.drafts][0]; h.drafts.delete(key);
  const scope=JSON.parse(key); scope[2]='formal'; h.drafts.set(JSON.stringify(scope),draft); h.refresh();
  expect(h.container.querySelector('textarea[aria-label^="Unfinished edits"]')).toBeNull();
});
it('ignores malformed entries and does not treat an unrelated record as resumable', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Original educator draft');
  h.workspace.spms=[{ ...h.item, teacherId: 't2' }];
  h.drafts.set('not-json', { value: 'unrelated notes' });
  h.drafts.set(JSON.stringify(['workflow-edit','2026-27','spm','broken','teacher']), { base: 'bad-json', value: '{}' });
  h.refresh();
  expect(h.container.textContent).toContain('Other unfinished edits (1)');
  expect(button(h.container, 'Open saved record')).toBeUndefined();
  expect(h.container.querySelector('textarea[aria-label^="Unfinished edits"]').value).toContain('Original educator draft');
});
it('restores the original recovery controls when a missing record returns', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Recover after refresh');
  h.workspace.spms=[]; h.refresh();
  h.workspace.spms=[h.item]; h.refresh();
  expect(h.container.querySelector('[aria-label="Other unfinished workflow edits"]')).toBeNull();
  expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Recover after refresh');
  h.accept(); click(h.container, 'Retry saving edits'); expect(h.item.goal).toBe('Recover after refresh');
});
it('shows current saved plan contents separately from recovery when the plan becomes locked', () => {
  const h = mountWorkflow('spm');
  type(field(h.container, 'Unit / goal statement and expected outcomes'), 'Unfinished goal');
  h.render({ goal: 'Official locked goal', status: 'locked', rating: 2, lockedAt: '2026-09-04' });
  expect(field(h.container, 'Unit / goal statement and expected outcomes').value).toBe('Official locked goal');
  expect(h.container.querySelector('[aria-label="Unsaved workflow edits"]').textContent).toContain('Unfinished goal');
  expect(field(h.container, 'Unit / goal statement and expected outcomes').matches(':disabled')).toBe(true);
});
it('shows newer formal contents and suspends editing until the conflict copy is discarded', () => {
  const h = mountWorkflow('formal');
  type(field(h.container, 'Lesson / unit plan summary'), 'Older unsaved lesson');
  h.render({ prework: { plan: 'Current saved lesson', outcomes: 'Current outcomes' } });
  const plan = field(h.container, 'Lesson / unit plan summary');
  expect(plan.value).toBe('Current saved lesson'); expect(plan.matches(':disabled')).toBe(true);
  expect(h.container.querySelector('[aria-label="Unsaved workflow edits"]').textContent).toContain('Older unsaved lesson');
  click(h.container, 'Discard unsaved workflow edits');
  expect(plan.matches(':disabled')).toBe(false); expect(h.item.prework.plan).toBe('Current saved lesson');
});
