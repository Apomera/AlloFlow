import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { makeAppsScriptHarness } from './helpers/educator_evaluation_gs_harness.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const DRAFT_KEY = 'alloflow_ae_walkthrough_draft_v1';
let api;
let mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  const compiled = readFileSync(resolve('educator_evaluation_module.js'), 'utf8');
  // Expose private helpers in this test's copy of the generated module.
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { aeSubmissionText, aeDateValue, aeParseRosterPaste, AeWalkthroughForm, AeWalkthroughs, AeThread, aeObservationStartTimestamp, AeFormalObservations, AeEducatorStatement, AeTextDraftContext, AeSimulationStudio, aeSampleWorkspace };})();'))({ React });
});

afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  sessionStorage.clear();
});

function mountForm(overrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const props = { teachers: [{ id: 't1', name: 'Educator', code: 'T1' }], selectedTeacherId: 't1', createWalkthrough: vi.fn(() => ''), onCreated: vi.fn(), ...overrides };
  act(() => root.render(React.createElement(api.AeWalkthroughForm, props)));
  mounted = { root, container };
  return { container, props };
}

function enterEvidence(container, value) {
  const textarea = container.querySelector('textarea');
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function save(container) {
  act(() => container.querySelector('.ae-walk-actions button').click());
}

describe('calendar date validation', () => {
  it.each(['2027-02-29', '2028-02-30', '2027-04-31', '2027-13-01', '2027-00-01', '2027-05-00', '2027-05-15extra', '0000-01-01'])('rejects impossible or malformed date %s on client and server', (value) => {
    expect(api.aeDateValue(value)).toBe('');
    expect(() => makeAppsScriptHarness().invoke('optionalDate_', value)).toThrow();
  });
  it.each(['2028-02-29', '2000-02-29', '2027-04-30', '2027-12-31'])('preserves valid date %s', (value) => {
    expect(api.aeDateValue(value)).toBe(value);
    expect(makeAppsScriptHarness().invoke('optionalDate_', value)).toBe(value);
  });
  it('flags impossible roster dates while preserving their preview text', () => {
    expect(api.aeParseRosterPaste('Educator, T1, Science, 2027-02-30')[0]).toMatchObject({ dueDate: '', rawDueDate: '2027-02-30' });
  });
  it('preserves empty leading spreadsheet cells instead of moving codes into names', () => {
    expect(api.aeParseRosterPaste('\tT1\tScience\t2027-05-15')[0]).toMatchObject({ name: '', code: 'T1', assignment: 'Science', dueDate: '2027-05-15' });
  });
});

describe('walkthrough draft recovery', () => {
  it('retains typed evidence and its recovery copy when creation is refused', () => {
    const { container, props } = mountForm();
    enterEvidence(container, 'Evidence that must survive a refused save.');
    save(container);
    expect(props.createWalkthrough).toHaveBeenCalledOnce();
    expect(props.onCreated).not.toHaveBeenCalled();
    expect(container.querySelector('textarea').value).toBe('Evidence that must survive a refused save.');
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)).evidence).toBe('Evidence that must survive a refused save.');
  });
  it('keeps changes visible when updating a saved draft is refused', () => {
    const { container, props } = mountForm({ editingRecord: { id: 'w1', teacherId: 't1', evidence: 'Saved evidence' }, updateWalkthroughDraft: vi.fn(() => '') });
    enterEvidence(container, 'Revised evidence');
    save(container);
    expect(props.onCreated).not.toHaveBeenCalled();
    expect(container.querySelector('textarea').value).toBe('Revised evidence');
  });
  it('does not erase a separate new-visit recovery copy when saving an existing visit', () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ teacherId: 't1', evidence: 'Another unfinished visit' }));
    const { container, props } = mountForm({ editingRecord: { id: 'w1', teacherId: 't1', evidence: 'Saved evidence' }, updateWalkthroughDraft: vi.fn(() => 'w1') });
    save(container);
    expect(props.onCreated).toHaveBeenCalledWith('w1');
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)).evidence).toBe('Another unfinished visit');
  });
  it('clears the recovery copy only after a new visit is accepted', () => {
    const { container, props } = mountForm({ createWalkthrough: vi.fn(() => 'w2') });
    enterEvidence(container, 'Saved new evidence');
    save(container);
    expect(props.onCreated).toHaveBeenCalledWith('w2');
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});

function enterField(element, value) {
  const proto = element instanceof window.HTMLSelectElement ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element instanceof window.HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}

describe('walkthrough input validation and educator identity', () => {
  it.each(['1', '180'])('accepts a valid duration at the boundary: %s', (value) => {
    const { container, props } = mountForm({ createWalkthrough: vi.fn(() => 'w1') });
    enterEvidence(container, 'Valid visit evidence');
    enterField(container.querySelector('input[type="number"]'), value);
    save(container);
    expect(props.createWalkthrough).toHaveBeenCalledWith(expect.objectContaining({ durationMin: value }));
    expect(props.onCreated).toHaveBeenCalledWith('w1');
  });

  it('does not duplicate a saved visit when its update handler is unavailable', () => {
    const { container, props } = mountForm({ editingRecord: { id: 'w1', teacherId: 't1', evidence: 'Saved evidence' } });
    save(container);
    expect(props.createWalkthrough).not.toHaveBeenCalled();
    expect(props.onCreated).not.toHaveBeenCalled();
    expect(container.querySelector('textarea').value).toBe('Saved evidence');
  });

  it.each(['', '0', '-2', '181', '8.5'])('keeps evidence and focuses duration when minutes are invalid: %s', (value) => {
    const { container, props } = mountForm();
    enterEvidence(container, 'Evidence to preserve');
    const duration = container.querySelector('input[type="number"]');
    enterField(duration, value);
    save(container);
    expect(props.createWalkthrough).not.toHaveBeenCalled();
    expect(props.onCreated).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toContain('whole number from 1 to 180');
    expect(document.activeElement).toBe(duration);
    expect(duration.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('textarea').value).toBe('Evidence to preserve');
  });

  it('requires a valid visit date and lets the evaluator correct it without retyping evidence', () => {
    const { container, props } = mountForm({ createWalkthrough: vi.fn(() => 'w1') });
    enterEvidence(container, 'Evidence to preserve');
    const date = container.querySelector('input[type="date"]');
    enterField(date, '');
    save(container);
    expect(props.createWalkthrough).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(date);
    expect(container.querySelector('[role="alert"]').textContent).toContain('valid visit date');
    enterField(date, '2028-02-29');
    save(container);
    expect(props.createWalkthrough).toHaveBeenCalledWith(expect.objectContaining({ date: '2028-02-29', evidence: 'Evidence to preserve' }));
    expect(props.onCreated).toHaveBeenCalledWith('w1');
  });

  it('does not open a publication review until the visit details are valid', () => {
    const review = vi.fn();
    const { container, props } = mountForm({ requestActionReview: review });
    enterEvidence(container, 'Reviewed evidence');
    enterField(container.querySelector('input[type="number"]'), '999');
    const privacy = Array.from(container.querySelectorAll('input[type="checkbox"]')).at(-1);
    act(() => privacy.click());
    act(() => container.querySelectorAll('.ae-walk-actions button')[1].click());
    expect(review).not.toHaveBeenCalled();
    expect(props.createWalkthrough).not.toHaveBeenCalled();
  });

  it('requires an explicit educator choice when a recovered visit belongs to an unavailable educator', () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ teacherId: 'removed', evidence: 'Evidence for the original educator', date: '2027-04-30', durationMin: '8' }));
    const { container, props } = mountForm({ createWalkthrough: vi.fn(() => 'w1') });
    const educator = container.querySelector('select');
    expect(educator.value).toBe('');
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)).teacherId).toBe('');
    save(container);
    expect(props.createWalkthrough).not.toHaveBeenCalled();
    enterField(educator, 't1');
    save(container);
    expect(props.createWalkthrough).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 't1', evidence: 'Evidence for the original educator' }));
  });

  it('prevents moving a saved visit to a different educator or quick-adding a replacement', () => {
    const { container } = mountForm({ editingRecord: { id: 'w1', teacherId: 't1', evidence: 'Saved evidence' }, canAddStaff: true, addTeacher: vi.fn() });
    expect(container.querySelector('select').disabled).toBe(true);
    expect(container.textContent).not.toContain('+ New educator');
    expect(container.textContent).toContain('original educator');
  });
});

function mountThread(overrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  let props = { workspace: { comments: [], teachers: [{ id: 't1', name: 'First educator' }, { id: 't2', name: 'Second educator' }] }, recordType: 'walkthrough', recordId: 'w1', teacherId: 't1', role: 'evaluator', onAdd: vi.fn(() => true), ...overrides };
  const render = (updates = {}) => { props = { ...props, ...updates }; act(() => root.render(React.createElement(api.AeThread, props))); };
  render();
  mounted = { root, container };
  return { container, props, render };
}

describe('comment draft scope and refused saves', () => {
  it('keeps each record draft separate and restores it when returning', () => {
    const { container, render, props } = mountThread();
    enterEvidence(container, 'Context for the first educator.');
    render({ teacherId: 't2', recordId: 'w2' });
    expect(container.querySelector('textarea').value).toBe('');
    enterEvidence(container, 'Context for the second educator.');
    render({ teacherId: 't1', recordId: 'w1' });
    expect(container.querySelector('textarea').value).toBe('Context for the first educator.');
    act(() => container.querySelector('button').click());
    expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 't1', recordId: 'w1', text: 'Context for the first educator.' }));
    expect(container.querySelector('textarea').value).toBe('');
    render({ teacherId: 't2', recordId: 'w2' });
    expect(container.querySelector('textarea').value).toBe('Context for the second educator.');
  });

  it('keeps evaluator and educator drafts separate during a role switch', () => {
    const { container, render } = mountThread();
    enterEvidence(container, 'Evaluator draft');
    render({ role: 'teacher' });
    expect(container.querySelector('textarea').value).toBe('');
    render({ role: 'evaluator' });
    expect(container.querySelector('textarea').value).toBe('Evaluator draft');
  });

  it('preserves a comment when the save is refused', () => {
    const { container, props } = mountThread({ onAdd: vi.fn(() => false) });
    enterEvidence(container, 'Comment to preserve');
    act(() => container.querySelector('button').click());
    expect(props.onAdd).toHaveBeenCalledOnce();
    expect(container.querySelector('textarea').value).toBe('Comment to preserve');
  });

  it('does not clear a draft without an explicit accepted result', () => {
    const { container } = mountThread({ onAdd: vi.fn() });
    enterEvidence(container, 'Unconfirmed comment');
    act(() => container.querySelector('button').click());
    expect(container.querySelector('textarea').value).toBe('Unconfirmed comment');
  });
});

describe('formal observation schedule validation', () => {
  it.each(['not a date', '2027-02-30T10:00', '2027-04-31T09:30', '2027-05-01T24:00', '2027-05-01T10:60', '2027-05-01T10:00Z'])('rejects malformed local schedule %s without throwing', (value) => {
    expect(api.aeObservationStartTimestamp(value)).toBeNull();
  });
  it('converts a valid local time to the corresponding instant', () => {
    expect(api.aeObservationStartTimestamp('2028-02-29T10:30')).toBe(new Date('2028-02-29T10:30').toISOString());
  });
  it('uses the current instant when no schedule is entered', () => {
    const before = Date.now();
    const timestamp = Date.parse(api.aeObservationStartTimestamp(''));
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
  });
});

it('shows a recoverable schedule error and proceeds after the evaluator corrects it', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  const teacher = { id: 't1', name: 'Educator', code: 'T1', active: true };
  const observation = { id: 'o1', teacherId: 't1', prework: {}, preworkSubmittedAt: '2026-09-01T10:00:00.000Z', preConferenceAt: '2026-09-02T10:00:00.000Z', observedLocal: 'corrupted date', componentTags: [], ratings: {}, rationales: {} };
  const workspace = { teachers: [teacher], observations: [observation], comments: [], config: { sampleMode: false } };
  const updateObservation = vi.fn((id, changes) => { Object.assign(observation, changes); render(); });
  const render = () => root.render(React.createElement(api.AeFormalObservations, { workspace, selectedTeacher: teacher, role: 'evaluator', updateObservation, setSelectedTeacherId: vi.fn(), createObservation: vi.fn(), addComment: vi.fn() }));
  act(render);
  const start = () => act(() => Array.from(container.querySelectorAll('button')).find(button => button.textContent.trim() === 'Start observation').click());
  start();
  expect(updateObservation).not.toHaveBeenCalled();
  const input = container.querySelector('input[type="datetime-local"]');
  expect(document.activeElement).toBe(input);
  expect(container.querySelector('[role="alert"]').textContent).toContain('valid local observation date and time');
  enterField(input, '2026-09-04T10:30');
  start();
  expect(updateObservation).toHaveBeenLastCalledWith('o1', { observedAt: new Date('2026-09-04T10:30').toISOString() }, 'OBSERVATION_STARTED', 'Formal observation started');
  expect(container.querySelector('input[type="datetime-local"]')).toBeNull();
});

function mountStatement(overrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const drafts = new Map();
  let props = { teacher: { id: 't1', name: 'First educator', educatorStatement: { text: 'Original statement', updatedAt: '2026-09-01' } }, role: 'teacher', updateTeacher: vi.fn(() => false), ...overrides };
  const render = (updates = {}, visible = true) => {
    props = { ...props, ...updates };
    act(() => root.render(React.createElement(api.AeTextDraftContext.Provider, { value: drafts }, visible ? React.createElement(api.AeEducatorStatement, props) : null)));
  };
  render();
  mounted = { root, container };
  return { container, drafts, props, render };
}
function clickText(container, label) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === label);
  expect(button, label).toBeTruthy();
  act(() => button.click());
}
describe('educator statement recovery', () => {
  it('restores unsaved text after leaving and returning to the tab', () => {
    const { container, render, drafts } = mountStatement();
    enterEvidence(container, 'Unfinished personal statement');
    render({}, false);
    expect(container.querySelector('textarea')).toBeNull();
    render();
    expect(container.querySelector('textarea').value).toBe('Unfinished personal statement');
    expect(drafts.size).toBe(1);
    clickText(container, 'Discard statement draft');
    expect(container.querySelector('textarea').value).toBe('Original statement');
    expect(drafts.size).toBe(0);
  });
  it('keeps each educator statement attached to its educator', () => {
    const { container, render, props } = mountStatement();
    enterEvidence(container, 'First educator draft');
    render({ teacher: { id: 't2', name: 'Second educator' } });
    expect(container.querySelector('textarea').value).toBe('');
    enterEvidence(container, 'Second educator draft');
    render({ teacher: props.teacher });
    expect(container.querySelector('textarea').value).toBe('First educator draft');
  });
  it('shows a refreshed saved statement when there are no local edits', () => {
    const { container, render, props } = mountStatement();
    render({ teacher: { ...props.teacher, educatorStatement: { text: 'Refreshed statement', updatedAt: '2026-09-02' } } });
    expect(container.querySelector('textarea').value).toBe('Refreshed statement');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
  it('preserves a draft and requires reviewing a changed saved statement', () => {
    const { container, render, props } = mountStatement();
    enterEvidence(container, 'My unfinished statement');
    render({ teacher: { ...props.teacher, educatorStatement: { text: 'New district version', updatedAt: '2026-09-02' } } });
    expect(container.querySelector('textarea').value).toBe('My unfinished statement');
    expect(container.querySelector('[role="alert"]').textContent).toContain('New district version');
    clickText(container, 'Update statement');
    expect(props.updateTeacher).not.toHaveBeenCalled();
    clickText(container, 'Keep editing my draft');
    clickText(container, 'Update statement');
    expect(props.updateTeacher).toHaveBeenCalledOnce();
    expect(container.querySelector('textarea').value).toBe('My unfinished statement');
  });
  it('can explicitly restore the refreshed saved version', () => {
    const { container, render, props, drafts } = mountStatement();
    enterEvidence(container, 'My draft');
    render({ teacher: { ...props.teacher, educatorStatement: { text: 'Latest saved text' } } });
    clickText(container, 'Use saved statement');
    expect(container.querySelector('textarea').value).toBe('Latest saved text');
    expect(drafts.size).toBe(0);
  });
  it('retains a draft when the statement save is refused', () => {
    const { container, drafts } = mountStatement();
    enterEvidence(container, 'Retain this draft');
    clickText(container, 'Update statement');
    expect(drafts.size).toBe(1);
    expect(container.querySelector('textarea').value).toBe('Retain this draft');
  });
  it('clears a draft only after an accepted save', () => {
    const { container, drafts } = mountStatement({ updateTeacher: vi.fn(() => true) });
    enterEvidence(container, 'Accepted statement');
    clickText(container, 'Update statement');
    expect(drafts.size).toBe(0);
  });
  it('refuses a stale save callback when the record has changed again', () => {
    const { container, props } = mountStatement();
    enterEvidence(container, 'Draft text');
    clickText(container, 'Update statement');
    const mutation = props.updateTeacher.mock.calls[0][1];
    const latest = { educatorStatement: { text: 'Even newer statement' } };
    expect(mutation(latest)).toBe(false);
    expect(latest.educatorStatement.text).toBe('Even newer statement');
  });
  it('keeps an unfinished statement recoverable if the cycle is finalized remotely', () => {
    const { container, render, props } = mountStatement();
    enterEvidence(container, 'Unfinished when finalized');
    render({ teacher: { ...props.teacher, finalizedAt: '2026-09-04' } });
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.textContent).toContain('Unfinished when finalized');
    clickText(container, 'Discard statement draft');
    expect(container.textContent).not.toContain('Unfinished when finalized');
  });
  it('does not move an old draft into a new academic year', () => {
    const { container, render } = mountStatement({ academicYear: '2026-27' });
    enterEvidence(container, 'Prior cycle draft');
    render({ academicYear: '2027-28' });
    expect(container.querySelector('textarea').value).toBe('Original statement');
  });
});

it('restores an unsent comment after its tab unmounts', () => {
  const { container, props } = mountThread();
  const drafts = new Map();
  const render = (visible) => act(() => mounted.root.render(React.createElement(api.AeTextDraftContext.Provider, { value: drafts }, visible ? React.createElement(api.AeThread, props) : null)));
  render(true);
  enterEvidence(container, 'Unsent comment across tabs');
  render(false);
  render(true);
  expect(container.querySelector('textarea').value).toBe('Unsent comment across tabs');
  clickText(container, 'Discard comment draft');
  expect(drafts.size).toBe(0);
});


it('preserves the simulation preview and undo option when workspace replacement is refused', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted = { root, container };
  const onApply = vi.fn(() => false);
  act(() => root.render(React.createElement(api.AeSimulationStudio, { workspace: api.aeSampleWorkspace(), onApply })));
  clickText(container, 'Preview changes');
  clickText(container, 'Apply this simulated scenario');
  expect(onApply).toHaveBeenCalledOnce();
  expect(container.textContent).toContain('Preview · nothing applied yet');
  expect(container.textContent).not.toContain('Simulation applied.');
  expect(container.textContent).not.toContain('Undo last simulation');
  onApply.mockReturnValue(true);
  clickText(container, 'Apply this simulated scenario');
  expect(container.textContent).toContain('Simulation applied.');
  expect(container.textContent).not.toContain('Preview · nothing applied yet');
  onApply.mockReturnValue(false);
  clickText(container, 'Undo last simulation');
  expect(container.textContent).toContain('Undo last simulation');
  expect(container.textContent).not.toContain('Previous simulated workspace restored.');
});


describe('editing refreshed saved walkthroughs', () => {
  function editingVisit() {
    const original = { id: 'w1', teacherId: 't1', evidence: 'Original evidence', interpretation: 'Original interpretation', date: '2026-09-04', durationMin: 8, componentTags: [], privacyChecked: true };
    const view = mountForm({ editingRecord: original, updateWalkthroughDraft: vi.fn(() => 'w1') });
    const refresh = latest => act(() => mounted.root.render(React.createElement(api.AeWalkthroughForm, { ...view.props, currentRecord: latest })));
    return { ...view, original, refresh };
  }
  it('keeps local edits visible and blocks saving when the saved visit changes', () => {
    const { container, original, refresh, props } = editingVisit();
    enterEvidence(container, 'My unfinished evidence');
    refresh({ ...original, evidence: 'Newly saved evidence', updatedAt: '2026-09-04T12:00:00.000Z' });
    expect(container.querySelector('textarea').value).toBe('My unfinished evidence');
    expect(container.textContent).toContain('Newly saved evidence');
    expect(container.querySelector('.ae-walk-actions button').disabled).toBe(true);
    save(container); expect(props.updateWalkthroughDraft).not.toHaveBeenCalled();
  });
  it('lets the evaluator explicitly keep their edits against the reviewed latest baseline', () => {
    const { container, original, refresh, props } = editingVisit();
    const latest = { ...original, evidence: 'Newly saved evidence', subject: 'Science' };
    enterEvidence(container, 'My version'); refresh(latest);
    clickText(container, 'Keep editing my version');
    expect(container.querySelector('textarea').value).toBe('My version');
    save(container);
    expect(props.updateWalkthroughDraft).toHaveBeenCalledWith('w1', expect.objectContaining({ evidence: 'My version' }), latest);
  });
  it('can replace the form with the latest saved draft after an explicit choice', () => {
    const { container, original, refresh, props } = editingVisit();
    const latest = { ...original, evidence: 'Latest evidence', interpretation: 'Latest interpretation' };
    enterEvidence(container, 'My version'); refresh(latest);
    clickText(container, 'Use latest saved draft');
    expect(container.querySelector('textarea').value).toBe('Latest evidence');
    save(container);
    expect(props.updateWalkthroughDraft).toHaveBeenCalledWith('w1', expect.objectContaining({ evidence: 'Latest evidence', interpretation: 'Latest interpretation' }), latest);
  });
  it.each(['published', 'deleted'])('preserves copyable local notes when the visit is %s', state => {
    const { container, original, refresh } = editingVisit();
    enterEvidence(container, 'Notes to recover');
    refresh(state === 'deleted' ? null : { ...original, publishedAt: '2026-09-04T12:00:00.000Z' });
    expect(container.querySelector('textarea').value).toBe('Notes to recover');
    expect(container.querySelector('.ae-walk-actions button').disabled).toBe(true);
    expect(container.textContent).not.toContain('Keep editing my version');
    expect(container.textContent).toContain('Copy any notes you need');
  });
  it('explains a refused save without clearing the typed notes', () => {
    const { container } = mountForm({ editingRecord: { id: 'w1', teacherId: 't1', evidence: 'Original' }, updateWalkthroughDraft: vi.fn(() => '') });
    enterEvidence(container, 'Keep these notes'); save(container);
    expect(container.querySelector('textarea').value).toBe('Keep these notes');
    expect(container.querySelector('[role="alert"]').textContent).toContain('This save was not accepted');
  });
});

it('keeps an open saved-visit edit available for copying when the educator cycle finalizes', () => {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { root, container };
  let teacher = { id: 't1', name: 'Educator', code: 'T1', active: true };
  const record = { id: 'w1', teacherId: 't1', evidence: 'Original evidence', date: '2026-09-04', durationMin: 8, announced: 'unannounced', lessonPhase: 'middle', componentTags: [] };
  const render = () => root.render(React.createElement(api.AeWalkthroughs, {
    workspace: { teachers: [teacher], walkthroughs: [record], comments: [], config: {} }, selectedTeacher: teacher, role: 'evaluator', setSelectedTeacherId: vi.fn(), updateWalkthroughDraft: vi.fn(),
  }));
  act(render); act(() => container.querySelector('.ae-record').click());
  clickText(container, 'Edit draft'); enterEvidence(container, 'Unfinished notes at finalization');
  teacher = { ...teacher, finalizedAt: '2026-09-04T12:00:00.000Z' }; act(render);
  expect(container.querySelector('textarea').value).toBe('Unfinished notes at finalization');
  expect(container.querySelector('.ae-walk-actions button').disabled).toBe(true);
  expect(container.textContent).toContain('This record is no longer editable');
  clickText(container, 'Close draft');
  expect(container.querySelector('.ae-walk-form')).toBeNull();
  expect(record.evidence).toBe('Original evidence');
});

describe('walkthrough text limits without truncation', () => {
  it.each([['subject', 240], ['evidence', 30000], ['interpretation', 15000]])('preserves an oversized recovered %s and focuses it before saving', (field, limit) => {
    const full = 'x'.repeat(limit + 1);
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ teacherId: 't1', date: '2026-09-04', durationMin: '8', evidence: 'Observed evidence', subject: '', interpretation: '', [field]: full }));
    const { container, props } = mountForm(); const input = container.querySelector('[name="' + field + '"]');
    expect(input.value).toBe(full); expect(input.maxLength).toBe(-1);
    expect(container.querySelector('#ae-walk-limit-' + field).textContent).toContain('full text is preserved');
    save(container);
    expect(props.createWalkthrough).not.toHaveBeenCalled(); expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-invalid')).toBe('true'); expect(input.getAttribute('aria-describedby')).toContain('ae-walk-validation');
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY))[field]).toBe(full);
    act(() => {
      const proto = input.tagName === 'INPUT' ? window.HTMLInputElement.prototype : window.HTMLTextAreaElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, 'x'.repeat(limit)); input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    props.createWalkthrough.mockReturnValue('w1'); save(container);
    expect(props.createWalkthrough).toHaveBeenCalledWith(expect.objectContaining({ [field]: 'x'.repeat(limit) }));
    expect(props.onCreated).toHaveBeenCalledWith('w1'); expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
  it('keeps an oversized paste in the evidence box for deliberate editing', () => {
    const { container, props } = mountForm(); const full = 'Evidence '.repeat(4000);
    enterEvidence(container, full); save(container);
    expect(container.querySelector('[name="evidence"]').value).toBe(full);
    expect(props.createWalkthrough).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem(DRAFT_KEY)).evidence).toBe(full);
  });
});

describe('meaningful required text', () => {
  it.each(['\u200B', '\u200C\u200D', '\u200E\u200F', '\u202A\u202C', '\u2060\u2067\u2069', '\uFEFF', '\t\n '])('does not treat invisible formatting as written content (%#)', value => {
    expect(api.aeSubmissionText(value)).toBe(false);
  });
  it.each(['Observed words and actions.', 'یادگیری\u200C', 'تعلم\u200F', 'Learning\u200D'])('accepts written content that contains formatting characters (%#)', value => {
    expect(api.aeSubmissionText(value)).toBe(true);
  });
});
