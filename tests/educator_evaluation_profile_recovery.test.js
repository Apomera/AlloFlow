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
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { AeStaffProfileEditor, AeTextDraftContext, aeStaffProfileValues, aeReviewSnapshot };})();'))({ React });
});
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } });

const teacher = { id: 't1', name: 'Jordan', code: 'J1', assignment: 'Math', building: 'Main', evaluator: 'Principal', dueDate: '', employeeType: 'professional', active: true, buildingData: true, teacherSpecificData: true };
function mountProfile(overrides = {}, drafts = new Map()) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { root, container };
  let props = { teacher: { ...teacher }, workspace: { config: { academicYear: '2026-27' }, teachers: [{ ...teacher }, { ...teacher, id: 't2', code: 'S2', name: 'Sam' }] }, role: 'evaluator', isRemote: false, updateStaffProfile: vi.fn(() => false), ...overrides };
  const render = (updates = {}, visible = true) => { props = { ...props, ...updates }; act(() => root.render(React.createElement(api.AeTextDraftContext.Provider, { value: drafts }, visible ? React.createElement(api.AeStaffProfileEditor, props) : null))); };
  render(); return { container, drafts, props, render };
}
function click(container, label) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === label);
  expect(button, label).toBeTruthy(); expect(button.disabled).toBe(false); act(() => button.click());
}
function input(container, field, value) {
  const element = container.querySelector('[name="' + field + '"]');
  act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
describe('profile edit recovery', () => {
  it('keeps edits out of the saved profile until Save and recovers across tab navigation', () => {
    const { container, drafts, props, render } = mountProfile(); input(container, 'name', 'Revised Jordan');
    expect(props.updateStaffProfile).not.toHaveBeenCalled(); expect(props.teacher.name).toBe('Jordan'); expect(drafts.size).toBe(1);
    render({}, false); render(); expect(container.querySelector('[name="name"]').value).toBe('Revised Jordan');
  });
  it('scopes unfinished profile edits to their educator', () => {
    const { container, render } = mountProfile(); input(container, 'assignment', 'Science');
    render({ teacher: { ...teacher, id: 't2', name: 'Sam', code: 'S2' } });
    expect(container.querySelector('[name="assignment"]').value).toBe('Math');
    render({ teacher: { ...teacher } }); expect(container.querySelector('[name="assignment"]').value).toBe('Science');
  });
  it('preserves refused saves and clears accepted saves', () => {
    const { container, drafts, props } = mountProfile(); input(container, 'assignment', 'Science'); click(container, 'Save profile');
    expect(container.querySelector('[role="alert"]').textContent).toContain('changes are still here'); expect(drafts.size).toBe(1);
    props.updateStaffProfile.mockReturnValue(true); click(container, 'Save profile'); expect(drafts.size).toBe(0);
  });
  it('discards edits without changing the saved record', () => {
    const { container, drafts, props } = mountProfile(); input(container, 'name', 'New name'); click(container, 'Discard profile changes');
    expect(container.querySelector('[name="name"]').value).toBe('Jordan'); expect(drafts.size).toBe(0); expect(props.updateStaffProfile).not.toHaveBeenCalled();
  });
  it.each([['name', '', 'Name is required'], ['code', ' s2 ', 'already in this workspace'], ['evaluator', 'x'.repeat(161), '160 characters']])('focuses invalid %s while preserving the correction draft', (field, value, error) => {
    const { container, props, drafts } = mountProfile(); input(container, field, value); click(container, 'Save profile');
    expect(document.activeElement).toBe(container.querySelector('[name="' + field + '"]'));
    expect(document.activeElement.getAttribute('aria-invalid')).toBe('true'); expect(container.textContent).toContain(error);
    expect(props.updateStaffProfile).not.toHaveBeenCalled(); expect(drafts.size).toBe(1);
  });
  it('shows a changed saved profile and requires a deliberate choice before saving', () => {
    const { container, render, props } = mountProfile(); input(container, 'assignment', 'My draft');
    const newer = { ...teacher, assignment: 'Updated elsewhere' }; render({ teacher: newer });
    expect(container.textContent).toContain('Updated elsewhere');
    const save = Array.from(container.querySelectorAll('button')).find(button => button.textContent === 'Save profile'); expect(save.disabled).toBe(true);
    click(container, 'Keep editing my changes'); click(container, 'Save profile');
    expect(props.updateStaffProfile).toHaveBeenCalledWith('t1', expect.objectContaining({ assignment: 'My draft' }), api.aeReviewSnapshot(api.aeStaffProfileValues(newer)));
  });
  it('can discard the draft in favor of a changed saved profile', () => {
    const { container, render, drafts } = mountProfile(); input(container, 'assignment', 'My draft'); render({ teacher: { ...teacher, assignment: 'Saved elsewhere' } });
    click(container, 'Use saved profile'); expect(container.querySelector('[name="assignment"]').value).toBe('Saved elsewhere'); expect(drafts.size).toBe(0);
  });
  it('preserves copyable edits when cycle work locks the profile', () => {
    const { container, render, drafts } = mountProfile(); input(container, 'assignment', 'Unfinished assignment'); render({ teacher: { ...teacher, cycleLockedAt: '2026-09-04' } });
    const recovery = container.querySelector('[aria-label="Unfinished profile changes"]'); expect(recovery.value).toContain('Unfinished assignment'); expect(recovery.readOnly).toBe(true); expect(recovery.disabled).toBe(false);
    expect(container.textContent).not.toContain('Save profile'); click(container, 'Discard profile changes'); expect(drafts.size).toBe(0);
  });
  it('normalizes surrounding spaces and treats unchanged content as a no-op', () => {
    const { container, props, drafts } = mountProfile(); input(container, 'name', ' Jordan '); click(container, 'Save profile');
    expect(props.updateStaffProfile).not.toHaveBeenCalled(); expect(drafts.size).toBe(0); expect(container.textContent).toContain('No profile changes');
  });
  it('keeps the district evaluator display label read-only and reports queued saves accurately', () => {
    const { container } = mountProfile({ isRemote: true, updateStaffProfile: vi.fn(() => true) });
    expect(container.querySelector('[name="evaluator"]').readOnly).toBe(true); input(container, 'assignment', 'Science'); click(container, 'Save profile');
    expect(container.textContent).toContain('queued for district save');
  });
});
