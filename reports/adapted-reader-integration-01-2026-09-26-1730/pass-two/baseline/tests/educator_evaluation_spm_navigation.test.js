import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, mounted;
beforeAll(() => {
  const compiled = readFileSync(resolve('educator_evaluation_module.js'), 'utf8');
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { aeSpmRecordsFor, AeSpm, AeTextDraftContext };})();'))({ React });
});
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } });
const plan = (id, extra = {}) => ({ id, teacherId: 't1', status: 'draft', version: 1, createdAt: '2026-09-08T12:00:00Z', context: 'Class context', baseline: 'Baseline', goal: 'Goal ' + id, measures: 'Measures', actionPlan: 'Actions', revisions: [], ...extra });
function mount(records, extra = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { root, container };
  const teachers = [{ id: 't1', name: 'Educator One', code: 'T-01', active: true }, { id: 't2', name: 'Educator Two', code: 'T-02', active: true }];
  const workspace = { teachers, spms: records, comments: [], config: { academicYear: '2026-27', evaluatorName: 'Evaluator', sampleMode: false } };
  const drafts = new Map();
  const props = { workspace, selectedTeacher: teachers[0], role: 'teacher', createSpm: vi.fn(), updateSpm: vi.fn(() => false), updateTeacher: vi.fn(), addComment: vi.fn(), ...extra };
  const draw = () => root.render(React.createElement(api.AeTextDraftContext.Provider, { value: drafts }, React.createElement(api.AeSpm, props)));
  props.setSelectedTeacherId = id => { props.selectedTeacher = teachers.find(t => t.id === id) || null; draw(); };
  act(draw);
  return { container, props, drafts, workspace, render: changes => act(() => { Object.assign(props, changes); draw(); }) };
}
const chooser = h => h.container.querySelector('select[aria-labelledby="ae-spm-record-label"]');
const field = (h, text) => [...h.container.querySelectorAll('label')].find(el => el.querySelector('span')?.textContent.trim() === text)?.querySelector('textarea');
function change(el, value) {
  act(() => {
    const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
const goal = h => field(h, 'Unit / goal statement and expected outcomes');

describe('SPM records remain reachable and scoped', () => {
  it('orders unfinished plans before locked plans without mutating repository order', () => {
    const records = [plan('locked', { status: 'locked', createdAt: '2027-06-01' }), plan('old', { createdAt: '2026-01-01' }), plan('new'), plan('other', { teacherId: 't2' })];
    expect(api.aeSpmRecordsFor(records, 't1').map(r => r.id)).toEqual(['new', 'old', 'locked']);
    expect(records.map(r => r.id)).toEqual(['locked', 'old', 'new', 'other']);
    expect(api.aeSpmRecordsFor(records, '')).toEqual([]);
  });
  it.each(['teacher', 'evaluator'])('opens unfinished work and offers only the selected educator records (%s)', role => {
    const h = mount([plan('locked', { status: 'locked' }), plan('current'), plan('other', { teacherId: 't2', goal: 'Another educator private goal' })], { role });
    expect(chooser(h).value).toBe('current');
    expect([...chooser(h).options].map(o => o.value)).toEqual(['current', 'locked']);
    expect(h.container.textContent).not.toContain('Another educator private goal');
    expect(goal(h).value).toBe('Goal current');
    change(chooser(h), 'locked');
    expect(goal(h).value).toBe('Goal locked');
    expect(goal(h).closest('fieldset').disabled).toBe(true);
    expect(h.container.querySelector('.ae-spm-stepper [aria-current="step"]').textContent).toBe('Locked record');
  });
  it('honors an explicit locked record shortcut but rejects a different educator record', () => {
    const records = [plan('locked', { status: 'locked' }), plan('current'), plan('foreign', { teacherId: 't2' })];
    const h = mount(records, { initialRecordId: 'locked' }); expect(chooser(h).value).toBe('locked');
    h.render({ selectedTeacher: h.workspace.teachers[1] }); expect(chooser(h).value).toBe('foreign');
    h.render({ selectedTeacher: h.workspace.teachers[0] }); expect(chooser(h).value).toBe('current');
  });
  it('uses the selected educator fallback for an invalid initial record', () => {
    const h = mount([plan('own'), plan('foreign', { teacherId: 't2' })], { initialRecordId: 'foreign' });
    expect(chooser(h).value).toBe('own');
  });
  it('keeps an explicitly chosen record through refresh and falls back when it disappears', () => {
    const locked = plan('locked', { status: 'locked' }), current = plan('current');
    const h = mount([locked, current]); change(chooser(h), 'locked');
    h.render({ workspace: { ...h.workspace, spms: [plan('newer', { createdAt: '2027-01-01' }), locked, current] } });
    expect(chooser(h).value).toBe('locked');
    h.render({ workspace: { ...h.workspace, spms: [current] } }); expect(chooser(h).value).toBe('current');
    h.render({ selectedTeacher: null }); expect(chooser(h)).toBe(null); expect(goal(h)).toBeUndefined();
  });
  it('preserves refused edits when browsing a locked plan and returning to the draft', () => {
    const h = mount([plan('locked', { status: 'locked' }), plan('current')]);
    change(goal(h), 'My unsaved goal'); expect(h.drafts.size).toBe(1);
    change(chooser(h), 'locked'); expect(goal(h).value).toBe('Goal locked');
    change(chooser(h), 'current'); expect(goal(h).value).toBe('My unsaved goal');
    expect(h.workspace.spms.find(r => r.id === 'current').goal).toBe('Goal current');
    const submit = [...h.container.querySelectorAll('button')].find(el => el.textContent === 'Submit plan for approval');
    expect(submit.disabled).toBe(true);
  });
  it('marks only the submitted plan the evaluator actually opens', () => {
    const h = mount([plan('current'), plan('submitted', { status: 'submitted', createdAt: '2026-01-01' })], { role: 'evaluator' });
    expect(h.props.updateSpm).not.toHaveBeenCalled();
    change(chooser(h), 'submitted');
    expect(h.props.updateSpm).toHaveBeenCalledTimes(1);
    expect(h.props.updateSpm.mock.calls[0][0]).toBe('submitted');
    expect(h.props.updateSpm.mock.calls[0][2]).toBe('OPENED');
  });
  it('keeps saved form content out of explicit field names', () => {
    const h = mount([plan('current', { status: 'results_submitted', results: 'Saved results', reflection: 'Saved reflection', ratingRationale: 'Saved rationale' })], { role: 'evaluator' });
    for (const name of ['context', 'baseline', 'goal', 'measures', 'actions', 'rating', 'rationale']) {
      const labelId = 'ae-spm-' + name + '-label';
      const label = h.container.querySelector('#' + labelId);
      expect(label).toBeTruthy(); expect(label.textContent).not.toContain('Saved');
      const control = label.closest('label').querySelector('textarea, select');
      expect(control.getAttribute('aria-labelledby')).toBe(labelId);
    }
    expect(h.container.querySelector('#ae-spm-rating-label').textContent).toBe('Human-selected SPM rating');
  });
  it('treats plan labels as text and keeps real local previews read-only', () => {
    const h = mount([plan('current', { goal: '<img src=x onerror=alert(1)>' })], { readOnlyPreview: true });
    expect(h.container.querySelector('img')).toBe(null);
    expect(chooser(h).textContent).toContain('<img src=x onerror=alert(1)>');
    expect(goal(h).closest('fieldset').disabled).toBe(true);
    expect(h.props.updateSpm).not.toHaveBeenCalled();
  });
});

describe('SPM guide reflects the saved workflow', () => {
  it.each([
    ['draft', 'Prepare proposal', "Educator's turn"],
    ['returned', 'Prepare proposal', "Educator's turn"],
    ['submitted', 'Review proposal', "Evaluator's turn"],
    ['approved', 'Submit results', "Educator's turn"],
    ['results_submitted', 'Rate and lock', "Evaluator's turn"],
    ['locked', 'Locked record', 'Read-only'],
  ])('shows the current stage and owner for %s', (status, current, owner) => {
    const h = mount([plan('current', { status, rating: 2, ratingRationale: 'Reviewed evidence', results: 'Results', reflection: 'Reflection' })]);
    const guide = h.container.querySelector('[aria-labelledby="ae-spm-progress-title"]');
    expect(guide.querySelectorAll('li')).toHaveLength(5);
    expect(guide.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(guide.querySelector('[aria-current="step"]').textContent).toBe(current);
    expect(guide.textContent).toContain(owner);
    expect(guide.querySelector('ol').tabIndex).toBe(0);
  });
  it('explains revision and finalized-cycle branches without reopening the workflow', () => {
    const h = mount([plan('current', { status: 'returned', returnReason: 'Clarify baseline' })]);
    expect(h.container.textContent).toContain('resubmits it for approval');
    h.render({ selectedTeacher: { ...h.workspace.teachers[0], finalizedAt: '2026-09-08', cycleStatus: 'finalized' } });
    const guide = h.container.querySelector('[aria-labelledby="ae-spm-progress-title"]');
    expect(guide.textContent).toContain('Read-only'); expect(guide.textContent).not.toContain("Educator's turn");
    expect(guide.textContent).toContain('annual cycle is finalized');
  });
});
