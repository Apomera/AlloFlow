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
  api = new Function('window', compiled.replace('(function() {', 'return (function() {').replace(/\}\)\(\);\s*$/, 'return { aeTeacherNextAction, aeOverviewDueBand, aeOverviewMatches, aeSampleWorkspace, AeFormalObservations, AeSpm, AeWalkthroughs, AeOverview };})();'))({ React });
});
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; } sessionStorage.clear(); });
const teacher = () => ({ id: 't1', name: 'Jordan Rivera', code: 'JR-14', building: 'North Campus', assignment: 'Science', evaluator: 'Casey Lee', active: true, cycleStatus: 'in_progress', finalizedAt: '' });
const small = () => ({ teachers: [teacher()], observations: [], walkthroughs: [], spms: [] });

describe('next actions follow the person and exact record', () => {
  it('shows the educator their returned plan while a formal record waits for an evaluator', () => {
    const w = small(); w.observations = [{ id: 'o1', teacherId: 't1', preworkSubmittedAt: '2026-09-07' }]; w.spms = [{ id: 's1', teacherId: 't1', status: 'returned' }];
    expect(api.aeTeacherNextAction(w, teacher(), 'teacher')).toMatchObject({ owner: 'teacher', tab: 'spm', recordId: 's1', teacherLabel: 'Revise and resubmit your SPM / SLO plan' });
    expect(api.aeTeacherNextAction(w, teacher())).toMatchObject({ owner: 'evaluator', tab: 'formal', recordId: 'o1' });
  });
  it('keeps a waiting educator step ahead of the annual fallback', () => {
    const w = small(); w.observations = [{ id: 'prework', teacherId: 't1' }];
    expect(api.aeTeacherNextAction(w, teacher())).toMatchObject({ owner: 'teacher', recordId: 'prework' });
  });
  it('finds actionable SPM work when a different open plan appears first', () => {
    const w = small(); w.spms = [{ id: 'draft', teacherId: 't1', status: 'draft' }, { id: 'review', teacherId: 't1', status: 'submitted' }];
    expect(api.aeTeacherNextAction(w, teacher())).toMatchObject({ owner: 'evaluator', recordId: 'review' });
    expect(api.aeTeacherNextAction(w, teacher(), 'teacher')).toMatchObject({ owner: 'teacher', recordId: 'draft' });
  });
  it('points educator acknowledgment at the published visit, not a private evaluator draft', () => {
    const w = small(); w.walkthroughs = [{ id: 'private', teacherId: 't1' }, { id: 'published', teacherId: 't1', publishedAt: '2026-09-07' }];
    expect(api.aeTeacherNextAction(w, teacher(), 'teacher')).toMatchObject({ recordId: 'published', owner: 'teacher' });
    expect(api.aeTeacherNextAction(w, teacher())).toMatchObject({ recordId: 'private', owner: 'evaluator' });
  });
  it('does not reopen a finalized cycle or borrow another educator’s records', () => {
    const w = small(); w.observations = [{ id: 'other', teacherId: 't2', preworkSubmittedAt: '2026-09-07' }];
    expect(api.aeTeacherNextAction(w, { ...teacher(), cycleStatus: 'finalized' })).toMatchObject({ owner: 'complete', tab: 'audit' });
    expect(api.aeTeacherNextAction(w, teacher()).recordId).toBeUndefined();
  });
  it('targets annual judgments only when existing workflows are complete', () => {
    const w = small(); w.observations = [{ id: 'done', teacherId: 't1', finalizedAt: '2026-09-07' }];
    expect(api.aeTeacherNextAction(w, teacher())).toMatchObject({ tab: 'overview', targetId: 'ae-annual-rating-composer' });
  });
});

describe('overview search and calendar-day filters', () => {
  it.each([['2026-09-29', 'overdue'], ['2026-09-30', 'soon'], ['2026-10-14', 'soon'], ['2026-10-15', 'month'], ['2026-10-30', 'month'], ['2026-10-31', 'later'], ['', 'none']])('classifies %s as %s across a month boundary', (dueDate, band) => {
    expect(api.aeOverviewDueBand({ ...teacher(), dueDate }, '2026-09-30')).toBe(band);
  });
  it('handles leap days and excludes finalized cycles from overdue counts', () => {
    expect(api.aeOverviewDueBand({ ...teacher(), dueDate: '2028-03-01' }, '2028-02-16')).toBe('soon');
    expect(api.aeOverviewDueBand({ ...teacher(), cycleStatus: 'finalized', dueDate: '2026-01-01' }, '2026-09-30')).toBe('complete');
  });
  it.each([' jordan ', 'jr-14', 'NORTH', 'science', 'CASEY'])('finds the educator by %s', query => {
    expect(api.aeOverviewMatches(teacher(), { owner: 'evaluator' }, { query, owner: 'all', due: 'all' })).toBe(true);
  });
  it('combines owner and due filters, rejects inactive rows and treats markup as search text', () => {
    const row = { ...teacher(), dueDate: '2026-10-01' }, action = { owner: 'teacher' };
    expect(api.aeOverviewMatches(row, action, { owner: 'teacher', due: 'soon' }, '2026-09-30')).toBe(true);
    expect(api.aeOverviewMatches(row, action, { owner: 'evaluator', due: 'soon' }, '2026-09-30')).toBe(false);
    expect(api.aeOverviewMatches({ ...row, active: false }, action, {})).toBe(false);
    expect(api.aeOverviewMatches(row, action, { query: '<img onerror=alert(1)>' })).toBe(false);
  });
});

function render(Component, workspace, extra = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const props = { workspace, selectedTeacher: workspace.teachers[0], setSelectedTeacherId: vi.fn(), role: 'evaluator', setRole: vi.fn(), setTab: vi.fn(), createObservation: vi.fn(), updateObservation: vi.fn(), updateTeacher: vi.fn(), addComment: vi.fn(), createSpm: vi.fn(), updateSpm: vi.fn(), createWalkthrough: vi.fn(), updateWalkthroughDraft: vi.fn(), discardWalkthroughDraft: vi.fn(), publishWalkthrough: vi.fn(), acknowledgeWalkthrough: vi.fn(), ...extra };
  const update = changes => { Object.assign(props, changes); act(() => root.render(React.createElement(Component, props))); };
  update({}); mounted = { root, container }; return { container, props, update };
}
function sample() {
  const w = api.aeSampleWorkspace(); w.config.sampleMode = false;
  w.teachers = [{ ...w.teachers[0], finalizedAt: '', cycleStatus: 'in_progress' }];
  return w;
}
function click(node) { act(() => node.click()); }

describe('record navigation and record-specific privacy review', () => {
  it('opens an intended formal record even when a newer finalized record sorts first', () => {
    const w = sample(), base = w.observations[0], id = w.teachers[0].id;
    w.observations = [{ ...base, id: 'newer-final', teacherId: id, finalizedAt: '2027-06-01' }, { ...base, id: 'requested-open', teacherId: id, finalizedAt: '', teacherAcknowledgedAt: '', evaluatorSignedAt: '', observedAt: '2026-09-01' }];
    const { container } = render(api.AeFormalObservations, w, { initialRecordId: 'requested-open' });
    const select = [...container.querySelectorAll('select')].find(el => [...el.options].some(o => o.value === 'requested-open'));
    expect(select.value).toBe('requested-open');
  });
  it('opens the requested SPM rather than an earlier locked plan', () => {
    const w = sample(), base = w.spms[0], id = w.teachers[0].id;
    w.spms = [{ ...base, id: 'locked-first', teacherId: id, status: 'locked', goal: 'Earlier locked goal' }, { ...base, id: 'requested-plan', teacherId: id, status: 'returned', goal: 'Current returned goal', lockedAt: '' }];
    const { container } = render(api.AeSpm, w, { initialRecordId: 'requested-plan', role: 'teacher' });
    expect([...container.querySelectorAll('textarea')].some(el => el.value === 'Current returned goal')).toBe(true);
  });
  it('opens the requested visit and requires a fresh privacy check after changing records or content', () => {
    const w = sample(), base = w.walkthroughs[0], id = w.teachers[0].id;
    w.walkthroughs = [{ ...base, id: 'draft-one', teacherId: id, publishedAt: '', evidence: 'First private evidence' }, { ...base, id: 'draft-two', teacherId: id, publishedAt: '', evidence: 'Second private evidence' }];
    const { container, update } = render(api.AeWalkthroughs, w, { initialRecordId: 'draft-one' });
    expect(container.querySelector('.ae-evidence').textContent).toBe('First private evidence');
    const checkbox = () => container.querySelector('.ae-check input');
    const publish = () => [...container.querySelectorAll('button')].find(b => b.textContent === 'Publish saved draft to teacher');
    click(checkbox()); expect(publish().disabled).toBe(false);
    click([...container.querySelectorAll('button.ae-record')].find(b => b.textContent.includes('Second private evidence')));
    expect(checkbox().checked).toBe(false); expect(publish().disabled).toBe(true);
    click(checkbox()); expect(publish().disabled).toBe(false);
    update({ workspace: { ...w, walkthroughs: w.walkthroughs.map(r => r.id === 'draft-two' ? { ...r, evidence: 'Updated second private evidence' } : r) } });
    expect(checkbox().checked).toBe(false); expect(publish().disabled).toBe(true);
  });
});
