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
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { AeStaff, AeTextDraftContext, aeStaffInputError, aeRosterPreviewRows };})();'))({ React });
});
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } });
function mountStaff(overrides = {}, drafts = new Map()) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { root, container };
  const props = { workspace: { config: { academicYear: '2026-27', building: 'Main' }, teachers: [] }, selectedTeacher: null, role: 'evaluator', setSelectedTeacherId: vi.fn(), updateTeacher: vi.fn(), addTeacher: vi.fn(() => ''), addTeachersBulk: vi.fn(() => 0), ...overrides };
  const render = (visible = true) => act(() => root.render(React.createElement(api.AeTextDraftContext.Provider, { value: drafts }, visible ? React.createElement(api.AeStaff, props) : null)));
  render(); return { container, props, drafts, render };
}
function click(container, label) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === label);
  expect(button, label).toBeTruthy(); act(() => button.click());
}
function input(element, value) {
  const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); });
}
const form = container => container.querySelector('[aria-labelledby="ae-add-educator-title"]');
const roster = container => container.querySelector('[aria-labelledby="ae-paste-roster-title"]');
function fill(container) {
  input(form(container).querySelector('[name="name"]'), 'Jordan Rivera');
  input(form(container).querySelector('[name="code"]'), 'JR101');
}
describe('staff and roster session recovery', () => {
  it('restores a staff entry after leaving and returning to the tab', () => {
    const { container, drafts, render } = mountStaff(); click(container, '+ Add educator'); fill(container);
    render(false); render();
    expect(form(container).querySelector('[name="name"]').value).toBe('Jordan Rivera');
    expect(form(container).querySelector('[name="code"]').value).toBe('JR101');
    expect(drafts.size).toBe(2);
    expect(container.textContent).toContain('kept while this tool stays open');
  });
  it('does not create a pending draft just for opening an empty form', () => {
    const { container, drafts } = mountStaff(); click(container, '+ Add educator');
    expect(form(container).querySelector('[name="building"]').value).toBe('Main');
    expect(drafts.size).toBe(0);
  });
  it('Cancel discards the entry and prevents it reappearing after navigation', () => {
    const { container, drafts, render } = mountStaff(); click(container, '+ Add educator'); fill(container);
    click(form(container), 'Cancel'); expect(drafts.size).toBe(0);
    render(false); render(); expect(form(container)).toBeNull();
    click(container, '+ Add educator'); expect(form(container).querySelector('[name="name"]').value).toBe('');
  });
  it('keeps a refused entry and clears it only after successful creation', () => {
    const { container, drafts, props } = mountStaff(); click(container, '+ Add educator'); fill(container);
    click(form(container), 'Save educator');
    expect(form(container).querySelector('[role="alert"]').textContent).toContain('was not saved');
    expect(form(container).querySelector('[name="name"]').value).toBe('Jordan Rivera');
    expect(drafts.size).toBe(2);
    props.addTeacher.mockReturnValue('t1'); click(form(container), 'Save educator');
    expect(form(container)).toBeNull(); expect(drafts.size).toBe(0);
  });
  it('restores an unsaved roster and preserves it when adding is refused', () => {
    const { container, drafts, render, props } = mountStaff(); click(container, 'Paste roster');
    input(roster(container).querySelector('textarea'), 'Jordan Rivera, JR101, Math');
    render(false); render();
    expect(roster(container).querySelector('textarea').value).toBe('Jordan Rivera, JR101, Math');
    click(roster(container), 'Add 1 educator');
    expect(props.addTeachersBulk).toHaveBeenCalledOnce(); expect(drafts.size).toBe(1);
    props.addTeachersBulk.mockReturnValue(1); click(roster(container), 'Add 1 educator');
    expect(roster(container)).toBeNull(); expect(drafts.size).toBe(0);
  });
  it('keeps a hidden roster for reopening and discards it on Cancel', () => {
    const { container, drafts } = mountStaff(); click(container, 'Paste roster');
    input(roster(container).querySelector('textarea'), 'Jordan Rivera, JR101');
    click(container, 'Close roster paste'); expect(roster(container)).toBeNull(); expect(drafts.size).toBe(1);
    click(container, 'Paste roster'); expect(roster(container).querySelector('textarea').value).toContain('JR101');
    click(roster(container), 'Cancel'); expect(drafts.size).toBe(0);
  });
});
describe('staff entry validation and focus', () => {
  it('identifies and focuses the missing required field', () => {
    const { container, props } = mountStaff(); click(container, '+ Add educator'); click(form(container), 'Save educator');
    const name = form(container).querySelector('[name="name"]');
    expect(document.activeElement).toBe(name); expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(form(container).querySelector('#' + name.getAttribute('aria-describedby')).textContent).toBe('Name is required.');
    input(name, 'Jordan'); click(form(container), 'Save educator');
    expect(document.activeElement).toBe(form(container).querySelector('[name="code"]'));
    expect(props.addTeacher).not.toHaveBeenCalled();
  });
  it('requires correcting an invalid recovered date instead of silently removing it', () => {
    const drafts = new Map([[JSON.stringify(['staff-entry', '2026-27', 'dueDate']), { value: '2027-02-30', base: '', label: 'Due date' }]]);
    const { container, props } = mountStaff({}, drafts); fill(container); click(form(container), 'Save educator');
    const date = form(container).querySelector('[name="dueDate"]');
    expect(document.activeElement).toBe(date); expect(date.getAttribute('aria-invalid')).toBe('true');
    expect(props.addTeacher).not.toHaveBeenCalled();
    input(date, '2028-02-29'); click(form(container), 'Save educator');
    expect(props.addTeacher).toHaveBeenCalledWith(expect.objectContaining({ dueDate: '2028-02-29' }));
  });
  it('exposes staff field length limits', () => {
    const { container } = mountStaff(); click(container, '+ Add educator');
    expect(['name', 'code', 'assignment', 'building'].map(field => form(container).querySelector('[name="' + field + '"]').maxLength)).toEqual([160, 40, 240, 160]);
  });
  it.each([['name',161], ['code',41], ['assignment',241], ['building',161]])('rejects oversized %s instead of truncating it', (field, length) => {
    expect(api.aeStaffInputError({ name: 'Jordan', code: 'JR101', [field]: 'x'.repeat(length) }).field).toBe(field);
  });
  it('matches duplicate staff codes without case or surrounding whitespace differences', () => {
    expect(api.aeStaffInputError({ name: 'Jordan', code: ' jr101 ' }, [{ code: 'JR101' }])).toMatchObject({ field: 'code' });
  });
  it('accepts blank optional dates and real leap-day dates', () => {
    expect(api.aeStaffInputError({ name: 'Jordan', code: 'JR101', dueDate: '' })).toBeNull();
    expect(api.aeStaffInputError({ name: 'Jordan', code: 'JR101', dueDate: '2028-02-29' })).toBeNull();
  });
});

describe('roster preview integrity', () => {
  it.each([
    ['Jordan, J1, Math, 2027-02-30', 'valid cycle due date'],
    ['x'.repeat(161) + ', J1', '160 characters'],
    ['Jordan, ' + 'x'.repeat(41), '40 characters'],
    ['Jordan, J1, ' + 'x'.repeat(241), '240 characters'],
    ['Jordan, J1, Math, 2027-05-15, ignored', 'Too many columns'],
  ])('keeps invalid input out of the ready count (%#)', (line, error) => {
    const rows = api.aeRosterPreviewRows(line, []);
    expect(rows).toHaveLength(1); expect(rows[0].status).toContain(error);
    const { container, props } = mountStaff(); click(container, 'Paste roster');
    input(roster(container).querySelector('textarea'), line);
    const add = Array.from(roster(container).querySelectorAll('button')).find(button => button.textContent === 'Add 0 educators');
    expect(add.disabled).toBe(true); expect(props.addTeachersBulk).not.toHaveBeenCalled();
  });
  it('lets a corrected later row use the code from an earlier invalid line', () => {
    const rows = api.aeRosterPreviewRows('Jordan, J1, Math, tomorrow\nJordan, J1, Math, 2028-02-29', []);
    expect(rows[0].status).toContain('valid cycle due date'); expect(rows[1].status).toBe('');
  });
  it('keeps only skipped lines after a successful import, including their original tabs', () => {
    const { container, drafts, render } = mountStaff({ addTeachersBulk: vi.fn(() => 1) });
    click(container, 'Paste roster');
    input(roster(container).querySelector('textarea'), 'Jordan, J1\nSam\tS1\tScience\ttomorrow');
    click(roster(container), 'Add 1 educator');
    expect(roster(container).querySelector('textarea').value).toBe('Sam\tS1\tScience\ttomorrow');
    expect(roster(container).querySelector('[role="status"]').textContent).toContain('1 skipped line(s) kept');
    render(false); render();
    expect(roster(container).querySelector('textarea').value).toBe('Sam\tS1\tScience\ttomorrow');
    expect(drafts.size).toBe(1);
  });
  it('shows an inline refusal message and preserves the entire paste', () => {
    const { container } = mountStaff(); click(container, 'Paste roster');
    input(roster(container).querySelector('textarea'), 'Jordan, J1');
    click(roster(container), 'Add 1 educator');
    expect(roster(container).querySelector('[role="alert"]').textContent).toContain('Your pasted text is still here');
    expect(roster(container).querySelector('textarea').value).toBe('Jordan, J1');
  });
});
