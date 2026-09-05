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
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { AeWalkthroughs, AeTextDraftContext };})();'))({ React });
});
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } });

const NEW_DRAFT = 'alloflow_ae_walkthrough_draft_v1';
const teacher = { id: 't1', name: 'Jordan', code: 'J1', active: true };
const visit = { id: 'w1', teacherId: 't1', date: '2026-09-04', durationMin: '8', evidence: 'Saved evidence', interpretation: '', subject: '', componentTags: [], announced: 'unannounced', lessonPhase: 'middle', privacyChecked: false, createdAt: '2026-09-04T12:00:00.000Z', startedAt: '2026-09-04T12:00:00.000Z', publishedAt: null, version: 1 };
afterEach(() => sessionStorage.clear());
function mountVisits(overrides = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { root, container }; const drafts = new Map();
  let props = { workspace: { config: { academicYear: '2026-27' }, teachers: [teacher], walkthroughs: [{ ...visit }], comments: [] }, selectedTeacher: teacher, setSelectedTeacherId: vi.fn(), role: 'evaluator', createWalkthrough: vi.fn(), updateWalkthroughDraft: vi.fn(() => ''), discardWalkthroughDraft: vi.fn(), publishWalkthrough: vi.fn(), addComment: vi.fn(), acknowledgeWalkthrough: vi.fn(), ...overrides };
  const render = (updates = {}, visible = true) => { props = { ...props, ...updates }; act(() => root.render(React.createElement(api.AeTextDraftContext.Provider, { value: drafts }, visible ? React.createElement(api.AeWalkthroughs, props) : null))); };
  render(); return { container, drafts, props, render };
}
function click(container, label) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === label);
  expect(button, label).toBeTruthy(); expect(button.disabled, label).toBe(false); act(() => button.click());
}
function edit(container, index = 0) { act(() => container.querySelectorAll('button.ae-record')[index].click()); click(container, 'Edit draft'); }
function enter(container, value) {
  const element = container.querySelector('[name="evidence"]'); act(() => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
const pending = container => container.querySelector('[aria-label="Unfinished walkthrough edits"]');
function resume(container, index = 0) { expect(pending(container)).toBeTruthy(); act(() => pending(container).querySelectorAll('button')[index].click()); }
const saveButton = container => Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === 'Save draft changes');
describe('unsaved edits to existing walkthroughs', () => {
  it('does not create an unfinished edit just for opening a saved draft', () => {
    const { container, drafts } = mountVisits(); edit(container); expect(drafts.size).toBe(0); click(container, 'Close draft'); expect(pending(container)).toBeNull();
  });
  it('offers resume after closing the form and leaves the saved record unchanged', () => {
    const { container, drafts, props } = mountVisits(); edit(container); enter(container, 'Unfinished revised evidence'); click(container, 'Close draft');
    expect(drafts.size).toBe(1); expect(props.workspace.walkthroughs[0].evidence).toBe('Saved evidence');
    resume(container); expect(container.querySelector('[name="evidence"]').value).toBe('Unfinished revised evidence'); expect(props.updateWalkthroughDraft).not.toHaveBeenCalled();
  });
  it('recovers the edit after the walkthrough tab unmounts', () => {
    const { container, render } = mountVisits(); edit(container); enter(container, 'Notes before navigation'); render({}, false); render(); resume(container);
    expect(container.querySelector('[name="evidence"]').value).toBe('Notes before navigation');
  });
  it('preserves refused saves and clears the recovery copy after an accepted save', () => {
    const { container, props, drafts } = mountVisits(); edit(container); enter(container, 'Revised notes'); click(container, 'Save draft changes');
    expect(container.textContent).toContain('save was not accepted'); expect(drafts.size).toBe(1);
    props.updateWalkthroughDraft.mockReturnValue('w1'); click(container, 'Save draft changes'); expect(drafts.size).toBe(0); expect(pending(container)).toBeNull();
  });
  it('discards only unsaved edits without deleting or changing the saved visit', () => {
    const { container, props, drafts } = mountVisits(); edit(container); enter(container, 'Changes to discard'); click(container, 'Discard unsaved edits');
    expect(container.querySelector('[name="evidence"]').value).toBe('Saved evidence'); expect(drafts.size).toBe(0);
    expect(props.updateWalkthroughDraft).not.toHaveBeenCalled(); expect(props.discardWalkthroughDraft).not.toHaveBeenCalled();
  });
  it('detects changes saved elsewhere while the tab was closed and rebases only by explicit choice', () => {
    const { container, props, render } = mountVisits(); edit(container); enter(container, 'My edited notes'); render({}, false);
    const latest = { ...visit, evidence: 'Newer saved evidence', version: 2 };
    render({ workspace: { ...props.workspace, walkthroughs: [latest] } }); resume(container);
    expect(container.querySelector('[name="evidence"]').value).toBe('My edited notes'); expect(container.textContent).toContain('Newer saved evidence'); expect(saveButton(container).disabled).toBe(true);
    click(container, 'Keep editing my version'); click(container, 'Save draft changes');
    expect(props.updateWalkthroughDraft).toHaveBeenCalledWith('w1', expect.objectContaining({ evidence: 'My edited notes' }), latest);
  });
  it('can restore the latest saved draft instead of the recovered edit', () => {
    const { container, props, render, drafts } = mountVisits(); edit(container); enter(container, 'My edit'); render({}, false);
    render({ workspace: { ...props.workspace, walkthroughs: [{ ...visit, evidence: 'Latest saved evidence' }] } }); resume(container); click(container, 'Use latest saved draft');
    expect(container.querySelector('[name="evidence"]').value).toBe('Latest saved evidence'); expect(drafts.size).toBe(0);
  });
  it.each(['deleted', 'published', 'finalized'])('keeps notes copyable when the original visit becomes %s', change => {
    const { container, props, render } = mountVisits(); edit(container); enter(container, 'Notes worth keeping'); render({}, false);
    const updatedTeacher = change === 'finalized' ? { ...teacher, finalizedAt: '2026-09-05' } : teacher;
    render({ selectedTeacher: updatedTeacher, workspace: { ...props.workspace, teachers: [updatedTeacher], walkthroughs: change === 'deleted' ? [] : [{ ...visit, ...(change === 'published' ? { publishedAt: '2026-09-05' } : {}) }] } }); resume(container);
    const input = container.querySelector('[name="evidence"]'); expect(input.value).toBe('Notes worth keeping'); expect(input.disabled).toBe(false); expect(saveButton(container).disabled).toBe(true);
    click(container, 'Discard unsaved edits'); expect(saveButton(container).disabled).toBe(true);
  });
  it('does not show evaluator edits in educator view or another academic year', () => {
    const { container, props, render } = mountVisits(); edit(container); enter(container, 'Private evaluator edits'); render({}, false);
    render({ role: 'teacher' }); expect(pending(container)).toBeNull();
    render({ role: 'evaluator', workspace: { ...props.workspace, config: { academicYear: '2027-28' } } }); expect(pending(container)).toBeNull();
  });
  it('keeps separate edits for two saved records', () => {
    const { container, drafts } = mountVisits({ workspace: { config: { academicYear: '2026-27' }, teachers: [teacher], comments: [], walkthroughs: [{ ...visit }, { ...visit, id: 'w2', date: '2026-09-05' }] } });
    edit(container); enter(container, 'First visit edits'); click(container, 'Close draft'); edit(container, 1); enter(container, 'Second visit edits'); click(container, 'Close draft');
    expect(drafts.size).toBe(2); resume(container); expect(container.querySelector('[name="evidence"]').value).toBe('First visit edits');
  });
  it('does not overwrite a separate new-visit recovery draft', () => {
    const newDraft = JSON.stringify({ teacherId: 't1', evidence: 'A different new visit' }); sessionStorage.setItem(NEW_DRAFT, newDraft);
    const { container } = mountVisits(); edit(container); enter(container, 'Saved visit edits'); click(container, 'Discard unsaved edits');
    expect(sessionStorage.getItem(NEW_DRAFT)).toBe(newDraft);
  });
});
