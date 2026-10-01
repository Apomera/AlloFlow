import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const KEY = 'allo_educator_evaluation_workspace_v1';
let api, mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeAll(() => {
  window.React = React;
  const source = readFileSync(resolve('educator_evaluation_module.js'), 'utf8');
  const instrumented = source.replace('(function() {', 'return (function() {')
    .replace('const updateConfig =', 'window.__aeMutations = { createWalkthrough, updateStaffProfile, addTeachersBulk, addTeacher, createObservation, createSpm, updateObservation, updateSpm, updateTeacher, addComment, updateWalkthroughDraft, discardWalkthroughDraft, publishWalkthrough, acknowledgeWalkthrough, review: () => actionReview, setRole, workspace: () => workspaceRef.current }; const updateConfig =')
    .replace(/\}\)\(\);\s*$/, 'return { EducatorEvaluationPanel, aeSampleWorkspace, aeReviewSnapshot, aeStaffProfileValues, aeNormalizeWorkspace };})();');
  api = new Function('window', instrumented)(window);
});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  delete window.__aeMutations;
  localStorage.clear(); sessionStorage.clear();
});
function mount(overrides = {}) {
  const workspace = api.aeSampleWorkspace();
  workspace.config.sampleMode = false;
  const teacher = { ...workspace.teachers[0], id: 't1', code: 'T1', name: 'Educator One', active: true, finalizedAt: null, cycleStatus: 'not_started' };
  Object.assign(workspace, { teachers: [teacher, { ...teacher, id: 't2', code: 'T2', name: 'Educator Two' }], walkthroughs: [], observations: [], spms: [], comments: [], audit: [], cycleSnapshots: [] }, overrides);
  localStorage.setItem(KEY, JSON.stringify(workspace));
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted = { root, container };
  act(() => root.render(React.createElement(api.EducatorEvaluationPanel, { addToast: vi.fn(), onClose: vi.fn() })));
  return () => window.__aeMutations;
}
function call(action) { let value; act(() => { value = action(); }); return value; }
function seedSpm(overrides = {}) {
  return { id: 's1', teacherId: 't1', status: 'results_submitted', version: 1, rating: 3, ratingRationale: 'Evidence supports this rating.', results: 'Measured growth', reflection: 'Educator reflection', ...overrides };
}
describe('accepted creation and current-record guards', () => {
  it.each(['createObservation', 'createSpm'])('%s returns no id after a refused commit', method => {
    const current = mount();
    call(() => current().setRole('teacher'));
    expect(call(() => current()[method]('t1'))).toBe('');
    expect(current().workspace().observations).toHaveLength(0);
    expect(current().workspace().spms).toHaveLength(0);
    expect(current().workspace().audit).toHaveLength(0);
  });
  it.each(['createObservation', 'createSpm'])('%s rejects missing, inactive and finalized educators', method => {
    const current = mount();
    expect(call(() => current()[method]('missing'))).toBe('');
    call(() => current().updateTeacher('t1', teacher => { teacher.active = false; }, 'PROFILE_UPDATED', 'Inactive'));
    expect(call(() => current()[method]('t1'))).toBe('');
    call(() => current().updateTeacher('t2', teacher => { teacher.finalizedAt = '2026-09-04T12:00:00.000Z'; }, 'PROFILE_UPDATED', 'Finalized'));
    expect(call(() => current()[method]('t2'))).toBe('');
  });
  it.each([['createObservation', 'observations'], ['createSpm', 'spms']])('%s reuses its new record on a repeated stale-handler invocation', (method, collection) => {
    const current = mount(); const create = current()[method]; let first, second;
    act(() => { first = create('t1'); second = create('t1'); });
    expect(first).toBeTruthy(); expect(second).toBe(first);
    expect(current().workspace()[collection]).toHaveLength(1);
    expect(current().workspace().audit).toHaveLength(1);
  });
  it.each([['updateObservation', 'createObservation'], ['updateSpm', 'createSpm']])('%s can update a just-created record from the same render', (update, create) => {
    const current = mount(); const stale = current(); let accepted;
    act(() => { const id = stale[create]('t1'); accepted = stale[update](id, {}, 'DRAFT_SAVED', 'Draft saved'); });
    expect(accepted).toBe(true);
  });
  it.each([['updateObservation', 'createObservation', 'observations'], ['updateSpm', 'createSpm', 'spms']])('%s refuses identity changes without an audit or mutation', (update, create, collection) => {
    const current = mount(); const id = call(() => current()[create]('t1'));
    const before = JSON.stringify(current().workspace());
    expect(call(() => current()[update](id, { teacherId: 't2' }, 'DRAFT_SAVED', 'Move record'))).toBe(false);
    expect(call(() => current()[update](id, { id: 'replacement' }, 'DRAFT_SAVED', 'Change identity'))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
    expect(current().workspace()[collection][0].teacherId).toBe('t1');
  });
});
describe('single-commit SPM finalization', () => {
  it('locks the result and annual rating together with one audit event', () => {
    const current = mount({ spms: [seedSpm()] });
    expect(call(() => current().updateSpm('s1', { status: 'locked', lockedAt: '2026-09-04T12:00:00.000Z' }, 'FINALIZED', 'SPM record rated and locked'))).toBe(true);
    const saved = current().workspace();
    expect(saved.spms[0].status).toBe('locked');
    expect(saved.teachers[0].ratings.lea).toBe(3);
    expect(saved.audit).toHaveLength(1);
    expect(saved.audit[0].event).toBe('FINALIZED');
  });
  it.each([{ status: 'draft' }, { rating: null }, { ratingRationale: '   ' }])('refuses invalid lock without changing the annual rating: %j', overrides => {
    const current = mount({ spms: [seedSpm(overrides)] });
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateSpm('s1', { status: 'locked' }, 'FINALIZED', 'Lock'))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('leaves both rating and record unchanged when the save is refused', () => {
    const current = mount({ spms: [seedSpm()] });
    call(() => current().setRole('teacher'));
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateSpm('s1', { status: 'locked' }, 'FINALIZED', 'Lock'))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('refuses a second lock from a stale callback without adding another audit entry', () => {
    const current = mount({ spms: [seedSpm()] }); const update = current().updateSpm;
    expect(call(() => update('s1', { status: 'locked' }, 'FINALIZED', 'Lock'))).toBe(true);
    expect(call(() => update('s1', { status: 'locked' }, 'FINALIZED', 'Lock'))).toBe(false);
    expect(current().workspace().audit).toHaveLength(1);
  });
});
describe('comment record ownership', () => {
  it.each([
    { recordType: 'spm', recordId: 's1', teacherId: 't2', text: 'Wrong educator' },
    { recordType: 'spm', recordId: 'missing', teacherId: 't1', text: 'Missing record' },
    { recordType: 'unsupported', recordId: 's1', teacherId: 't1', text: 'Wrong type' },
    { recordType: 'spm', recordId: 's1', teacherId: 't1', text: '  ' },
    { recordType: 'spm', recordId: 's1', teacherId: 't1', text: 'x'.repeat(3001) },
    { recordType: 'walkthrough', recordId: 'w1', teacherId: 't1', text: 'Private visit' },
  ])('rejects an invalid comment without saving or auditing (%#)', input => {
    const current = mount({ spms: [seedSpm()], walkthroughs: [{ id: 'w1', teacherId: 't1', evidence: 'Private draft' }] });
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().addComment(input))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('accepts trimmed text attached to the correct record', () => {
    const current = mount({ spms: [seedSpm()] });
    expect(call(() => current().addComment({ recordType: 'spm', recordId: 's1', teacherId: 't1', text: '  Shared context  ' }))).toBe(true);
    expect(current().workspace().comments[0].text).toBe('Shared context');
    expect(current().workspace().audit).toHaveLength(1);
  });
});


it('reviews and cancels before locking the SPM and annual rating in one UI action', () => {
  const current = mount({ spms: [seedSpm()] });
  const clickButton = (scope, label) => {
    const button = Array.from(scope.querySelectorAll('button')).find(item => item.textContent.trim() === label);
    expect(button, label).toBeTruthy(); call(() => button.click());
  };
  call(() => mounted.container.querySelector('#ae-tab-spm').click());
  const before = JSON.stringify(current().workspace());
  clickButton(mounted.container, 'Review rating & lock');
  let review = mounted.container.querySelector('[aria-labelledby="ae-action-review-title"]');
  expect(review.textContent).toContain('Rate and lock this SPM / SLO record?');
  expect(JSON.stringify(current().workspace())).toBe(before);
  clickButton(review, 'Cancel');
  expect(JSON.stringify(current().workspace())).toBe(before);
  clickButton(mounted.container, 'Review rating & lock');
  review = mounted.container.querySelector('[aria-labelledby="ae-action-review-title"]');
  call(() => review.querySelector('input[type="checkbox"]').click());
  clickButton(review, 'Rate and lock record');
  expect(current().workspace().spms[0].status).toBe('locked');
  expect(current().workspace().teachers[0].ratings.lea).toBe(3);
  expect(current().workspace().audit).toHaveLength(1);
  expect(mounted.container.textContent).toContain('Rated and locked');
});

it('disables the SPM lock review until the evaluator supplies a nonblank rationale', () => {
  mount({ spms: [seedSpm({ ratingRationale: '   ' })] });
  call(() => mounted.container.querySelector('#ae-tab-spm').click());
  const button = Array.from(mounted.container.querySelectorAll('button')).find(item => item.textContent.trim() === 'Review rating & lock');
  expect(button.disabled).toBe(true);
});


describe('submission requirements at the mutation boundary', () => {
  it.each([
    [{ prework: { plan: ' ', outcomes: 'Learning goal' } }, { preworkSubmittedAt: '2026-09-04T12:00:00.000Z' }, 'SUBMITTED'],
    [{ evidence: ' ', privacyChecked: true }, { evidencePublishedAt: '2026-09-04T12:00:00.000Z' }, 'EVIDENCE_PUBLISHED'],
    [{ reflection: ' ' }, { reflectionSubmittedAt: '2026-09-04T12:00:00.000Z' }, 'SUBMITTED'],
    [{ postConferenceNotes: ' ' }, { postConferenceAt: '2026-09-04T12:00:00.000Z' }, 'CONFERENCED'],
    [{ ratings: { d1: 0, d2: 1, d3: 2, d4: 3 }, rationales: { d1: 'Evidence', d2: 'Evidence', d3: ' ', d4: 'Evidence' } }, { evaluatorSignedAt: '2026-09-04T12:00:00.000Z' }, 'SIGNED'],
  ])('rejects an incomplete formal milestone without mutation or audit (%#)', (fields, changes, event) => {
    const current = mount({ observations: [{ id: 'o1', teacherId: 't1', ...fields }] });
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateObservation('o1', changes, event, 'Incomplete milestone'))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it.each([
    [{ status: 'draft', context: 'Context', baseline: 'Baseline', goal: ' ', measures: 'Measures', actionPlan: 'Actions' }, { status: 'submitted' }, 'SUBMITTED'],
    [{ status: 'approved', results: 'Growth', reflection: ' ' }, { status: 'results_submitted' }, 'SUBMITTED'],
    [{ status: 'submitted', pendingReturnReason: ' ' }, { status: 'returned', pendingReturnReason: '', returnReason: ' ' }, 'RETURNED'],
  ])('rejects an incomplete SPM milestone without mutation or audit (%#)', (fields, changes, event) => {
    const current = mount({ spms: [seedSpm(fields)] });
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateSpm('s1', changes, event, 'Incomplete milestone'))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
});


describe('walkthrough snapshot review and stale actions', () => {
  const visit = () => ({ id: 'w1', teacherId: 't1', date: '2026-09-04', durationMin: 8, announced: 'unannounced', lessonPhase: 'middle', evidence: 'Reviewed evidence', interpretation: 'Initial interpretation', componentTags: [], privacyChecked: true });
  it('refuses stale edit baselines and leaves the newer saved version intact', () => {
    const current = mount({ walkthroughs: [visit()] });
    const base = JSON.parse(JSON.stringify(current().workspace().walkthroughs[0]));
    expect(call(() => current().updateWalkthroughDraft('w1', { evidence: 'New saved evidence' }))).toBe('w1');
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateWalkthroughDraft('w1', { evidence: 'Stale form evidence' }, base))).toBe('');
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('accepts an edit based on the current saved snapshot', () => {
    const current = mount({ walkthroughs: [visit()] });
    const base = JSON.parse(JSON.stringify(current().workspace().walkthroughs[0]));
    expect(call(() => current().updateWalkthroughDraft('w1', { evidence: 'Updated evidence' }, base))).toBe('w1');
    expect(current().workspace().walkthroughs[0].evidence).toBe('Updated evidence');
  });
  it.each(['evidence', 'interpretation', 'date', 'durationMin', 'subject'])('refuses a publication confirmation after the reviewed %s changes', field => {
    const current = mount({ walkthroughs: [visit()] });
    call(() => current().publishWalkthrough('w1'));
    const reviewed = current().review();
    const value = field === 'date' ? '2026-09-05' : field === 'durationMin' ? 10 : 'Changed after review';
    call(() => current().updateWalkthroughDraft('w1', { [field]: value }));
    const before = JSON.stringify(current().workspace());
    call(reviewed.onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
    expect(current().workspace().walkthroughs[0].publishedAt).toBeNull();
  });
  it('publishes only the unchanged reviewed snapshot', () => {
    const current = mount({ walkthroughs: [visit()] });
    call(() => current().publishWalkthrough('w1'));
    call(current().review().onConfirm);
    expect(current().workspace().walkthroughs[0].publishedAt).toBeTruthy();
    expect(current().workspace().audit).toHaveLength(1);
  });
  it('does not dismiss a saved draft when discard is refused by the commit gate', () => {
    const current = mount({ walkthroughs: [visit()] }); const dismissed = vi.fn();
    call(() => current().setRole('teacher'));
    call(() => current().discardWalkthroughDraft('w1', dismissed));
    const before = JSON.stringify(current().workspace());
    call(current().review().onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
    expect(dismissed).not.toHaveBeenCalled();
  });
  it('does not discard a draft changed after the confirmation opened', () => {
    const current = mount({ walkthroughs: [visit()] }); const dismissed = vi.fn();
    call(() => current().discardWalkthroughDraft('w1', dismissed)); const reviewed = current().review();
    call(() => current().updateWalkthroughDraft('w1', { evidence: 'Newer evidence' }));
    const before = JSON.stringify(current().workspace());
    call(reviewed.onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
    expect(dismissed).not.toHaveBeenCalled();
  });
  it('cannot delete a visit published after an earlier discard review', () => {
    const current = mount({ walkthroughs: [visit()] }); const dismissed = vi.fn();
    call(() => current().discardWalkthroughDraft('w1', dismissed)); const discard = current().review();
    call(() => current().publishWalkthrough('w1')); call(current().review().onConfirm);
    const before = JSON.stringify(current().workspace()); call(discard.onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
    expect(dismissed).not.toHaveBeenCalled();
  });
  it('discards an unchanged private draft exactly once', () => {
    const current = mount({ walkthroughs: [visit()] }); const dismissed = vi.fn();
    call(() => current().discardWalkthroughDraft('w1', dismissed)); const reviewed = current().review();
    call(reviewed.onConfirm); call(reviewed.onConfirm);
    expect(current().workspace().walkthroughs).toHaveLength(0);
    expect(current().workspace().audit).toHaveLength(1);
    expect(dismissed).toHaveBeenCalledOnce();
  });
  it('does not create duplicate acknowledgment receipts from an old handler', () => {
    const current = mount({ walkthroughs: [{ ...visit(), publishedAt: '2026-09-04T12:00:00.000Z' }] });
    const acknowledge = current().acknowledgeWalkthrough;
    call(() => acknowledge('w1')); call(() => acknowledge('w1'));
    expect(current().workspace().audit).toHaveLength(1);
  });
});


describe('staff creation input integrity', () => {
  it.each([
    { name: 'Jordan', code: 'JR1', dueDate: '2027-02-30' },
    { name: 'x'.repeat(161), code: 'JR1' },
    { name: 'Jordan', code: 'x'.repeat(41) },
    { name: 'Jordan', code: 'JR1', assignment: 'x'.repeat(241) },
    { name: 'Jordan', code: 'JR1', building: 'x'.repeat(161) },
    { name: ' ', code: 'JR1' },
    { name: 'Jordan', code: ' t1 ' },
  ])('rejects invalid staff details without adding a record or audit (%#)', details => {
    const current = mount(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().addTeacher(details))).toBe('');
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
});


it('normalizes surrounding spaces before saving validated staff details', () => {
  const current = mount();
  const id = call(() => current().addTeacher({ name: ' '.repeat(170) + 'Jordan Rivera ', code: ' '.repeat(45) + 'JR101 ', assignment: ' '.repeat(250) + 'Math ', building: ' Main ', dueDate: ' 2028-02-29 ' }));
  expect(id).toBeTruthy();
  expect(current().workspace().teachers.find(item => item.id === id)).toMatchObject({ name: 'Jordan Rivera', code: 'JR101', assignment: 'Math', building: 'Main', dueDate: '2028-02-29' });
});

describe('bulk roster mutation integrity', () => {
  it.each([
    { name: 'Jordan', code: 'J1', dueDate: '2027-02-30' },
    { name: 'Jordan', code: 'J1', dueDate: '', rawDueDate: 'tomorrow' },
    { name: 'Jordan', code: 'x'.repeat(41) },
    { name: 'x'.repeat(161), code: 'J1' },
    { name: 'Jordan', code: 'J1', assignment: 'x'.repeat(241) },
    { name: 'Jordan', code: ' t1 ' },
    { name: 'Jordan', code: 'J1', extraColumns: true },
  ])('refuses the whole requested batch if any row is invalid (%#)', invalid => {
    const current = mount(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().addTeachersBulk([{ name: 'Valid', code: 'V1' }, invalid]))).toBe(0);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('rejects duplicate codes within the requested batch without partial creation', () => {
    const current = mount(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().addTeachersBulk([{ name: 'First', code: 'J1' }, { name: 'Second', code: ' j1 ' }]))).toBe(0);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('normalizes valid fields without shortening them and links the single audit to the first new educator', () => {
    const current = mount();
    expect(call(() => current().addTeachersBulk([{ name: ' '.repeat(170)+'Jordan ', code: ' '.repeat(45)+'J1 ', assignment: ' '.repeat(250)+'Math ', dueDate: ' 2028-02-29 ' }, { name: 'Sam', code: 'S1' }]))).toBe(2);
    const saved = current().workspace(); const jordan = saved.teachers.find(teacher => teacher.code === 'J1');
    expect(jordan).toMatchObject({ name: 'Jordan', assignment: 'Math', dueDate: '2028-02-29' });
    expect(saved.audit).toHaveLength(1); expect(saved.audit[0]).toMatchObject({ teacherId: jordan.id, entityId: jordan.id });
  });
  it('returns zero when the commit gate refuses the roster', () => {
    const current = mount(); call(() => current().setRole('teacher')); const before = JSON.stringify(current().workspace());
    expect(call(() => current().addTeachersBulk([{ name: 'Jordan', code: 'J1' }]))).toBe(0);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('refuses a stale batch when another action has already claimed a staff code', () => {
    const current = mount(); const add = current().addTeachersBulk;
    call(() => current().addTeacher({ name: 'Other educator', code: 'J1' }));
    const before = JSON.stringify(current().workspace());
    expect(call(() => add([{ name: 'Jordan', code: 'J1' }, { name: 'Sam', code: 'S1' }]))).toBe(0);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
});

function clickLabel(label, container = mounted.container) {
  const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent.trim() === label);
  expect(button, label).toBeTruthy(); expect(button.disabled, label).toBe(false); call(() => button.click());
}
const formalReviewCases = [
  ['Publish evidence to teacher', { observedAt: '2026-09-04T12:00:00.000Z' }, { evidence: 'New evidence received after review' }, 'evidencePublishedAt'],
  ['Sign evaluator assessment', { postConferenceAt: '2026-09-04T12:00:00.000Z' }, { ratings: { d1: 1, d2: 2, d3: 2, d4: 2 } }, 'evaluatorSignedAt'],
  ['Finalize formal observation', { teacherAcknowledgedAt: '2026-09-04T12:00:00.000Z' }, { rationales: { d1: 'Revised rationale', d2: 'Second', d3: 'Third', d4: 'Fourth' } }, 'finalizedAt'],
];
function reviewFormal(stage) {
  const current = mount({ observations: [{ id: 'f1', teacherId: 't1', version: 1, createdAt: '2026-09-04T10:00:00.000Z', evidence: 'Observed factual evidence', privacyChecked: true, ratings: { d1: 2, d2: 2, d3: 2, d4: 2 }, rationales: { d1: 'First', d2: 'Second', d3: 'Third', d4: 'Fourth' }, ...stage }] });
  clickLabel('Formal observations'); return current;
}
describe('formal review snapshot enforcement', () => {
  it.each(formalReviewCases)('cancels stale confirmation for %s', (label, stage, changes) => {
    const current = reviewFormal(stage); clickLabel(label); const reviewed = current().review();
    expect(reviewed).toBeTruthy();
    call(() => current().updateObservation('f1', changes, 'DRAFT_SAVED', 'New saved content'));
    const before = JSON.stringify(current().workspace());
    expect(call(reviewed.onConfirm)).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it.each(formalReviewCases)('accepts the unchanged review for %s once', (label, stage, changes, field) => {
    const current = reviewFormal(stage); clickLabel(label); const reviewed = current().review();
    expect(call(reviewed.onConfirm)).toBe(true);
    expect(current().workspace().observations[0][field]).toBeTruthy();
    const before = JSON.stringify(current().workspace()); call(reviewed.onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
});
const spmReviewCases = [
  ['Approve plan', { status: 'submitted', context: 'Context', baseline: 'Baseline', goal: 'Goal', measures: 'Measure', actionPlan: 'Plan' }, { goal: 'Revised goal after review' }, 'approved'],
  ['Review rating & lock', {}, { rating: 1, ratingRationale: 'A revised human judgment' }, 'locked'],
];
describe('SPM review snapshot enforcement', () => {
  it.each(spmReviewCases)('cancels stale confirmation for %s', (label, seed, changes) => {
    const current = mount({ spms: [seedSpm(seed)] }); clickLabel('SPM / SLO'); clickLabel(label); const reviewed = current().review();
    call(() => current().updateSpm('s1', changes, 'DRAFT_SAVED', 'New saved content'));
    const before = JSON.stringify(current().workspace()); call(reviewed.onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it.each(spmReviewCases)('accepts the unchanged review for %s once', (label, seed, changes, status) => {
    const current = mount({ spms: [seedSpm(seed)] }); clickLabel('SPM / SLO'); clickLabel(label); const reviewed = current().review();
    call(reviewed.onConfirm); expect(current().workspace().spms[0].status).toBe(status);
    const before = JSON.stringify(current().workspace()); call(reviewed.onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
});
function reviewAnnual() {
  const current = mount({ walkthroughs: [{ id: 'w1', teacherId: 't1', evidence: 'Published cycle evidence', publishedAt: '2026-09-04T12:00:00.000Z' }] });
  call(() => current().updateTeacher('t1', teacher => {
    teacher.ratings = { domains: { d1: 2, d2: 2, d3: 2, d4: 2 }, building: 2, teacher: 2, lea: 2 };
    teacher.annualRationales = { d1: 'First', d2: 'Second', d3: 'Third', d4: 'Fourth' };
    teacher.annualEvidenceRefs = { d1: ['walkthrough:w1'], d2: ['walkthrough:w1'], d3: ['walkthrough:w1'], d4: ['walkthrough:w1'] };
  }, 'RATING_UPDATED', 'Complete annual basis'));
  const annual = mounted.container.querySelector('#ae-annual-rating-composer');
  const label = Array.from(annual.querySelectorAll('label')).find(item => item.textContent.includes('I confirm the official'));
  expect(label).toBeTruthy(); call(() => label.querySelector('input').click()); clickLabel('Review final release', annual);
  return current;
}
describe('annual release review snapshot enforcement', () => {
  it('refuses a changed annual judgment without locking a stale score or creating a snapshot', () => {
    const current = reviewAnnual(); const reviewed = current().review();
    call(() => current().updateTeacher('t1', teacher => { teacher.ratings.domains.d1 = 1; }, 'RATING_UPDATED', 'Revised annual rating'));
    const before = JSON.stringify(current().workspace()); expect(call(reviewed.onConfirm)).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
    expect(current().workspace().cycleSnapshots).toHaveLength(0);
  });
  it('releases an unchanged annual judgment once and creates its snapshot', () => {
    const current = reviewAnnual(); const reviewed = current().review();
    expect(call(reviewed.onConfirm)).toBe(true);
    expect(current().workspace().teachers[0].finalizedAt).toBeTruthy();
    expect(current().workspace().cycleSnapshots).toHaveLength(1);
    const before = JSON.stringify(current().workspace()); call(reviewed.onConfirm);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
});
it('compares nested review content independent of object property order', () => {
  expect(api.aeReviewSnapshot({ id: 'f1', ratings: { d1: 1, d2: 2 }, tags: ['1a', '2a'] })).toBe(api.aeReviewSnapshot({ tags: ['1a', '2a'], ratings: { d2: 2, d1: 1 }, id: 'f1' }));
  expect(api.aeReviewSnapshot({ ratings: { d1: 1 } })).not.toBe(api.aeReviewSnapshot({ ratings: { d1: 2 } }));
});

describe('explicit staff profile save integrity', () => {
  function profileEditor() {
    const current = mount();
    // Use an unstarted cycle, as required by the existing profile editor.
    call(() => current().updateTeacher('t1', teacher => { teacher.cycleLockedAt = null; }, 'PROFILE_UPDATED', 'Unstarted profile'));
    const details = api.aeStaffProfileValues(current().workspace().teachers[0]); const base = api.aeReviewSnapshot(details);
    return { current, details, base };
  }
  it.each([{ name: '' }, { code: ' t2 ' }, { code: 'x'.repeat(41) }, { dueDate: '2027-02-30' }, { assignment: 'x'.repeat(241) }, { evaluator: 'x'.repeat(161) }, { employeeType: 'unknown' }, { active: 'yes' }])('refuses invalid profile changes without a mutation or audit (%#)', changes => {
    const { current, details, base } = profileEditor(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateStaffProfile('t1', { ...details, ...changes }, base))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('saves validated profile fields together and writes exactly one educator-linked audit', () => {
    const { current, details, base } = profileEditor();
    expect(call(() => current().updateStaffProfile('t1', { ...details, name: ' New name ', assignment: ' New assignment ', dueDate: ' 2028-02-29 ' }, base))).toBe(true);
    expect(current().workspace().teachers[0]).toMatchObject({ id: 't1', name: 'New name', assignment: 'New assignment', dueDate: '2028-02-29' });
    expect(current().workspace().audit).toHaveLength(1); expect(current().workspace().audit[0]).toMatchObject({ event: 'PROFILE_UPDATED', teacherId: 't1', entityId: 't1' });
  });
  it('refuses a stale profile save and preserves newer saved values', () => {
    const { current, details, base } = profileEditor();
    call(() => current().updateTeacher('t1', teacher => { teacher.assignment = 'Changed elsewhere'; }, 'PROFILE_UPDATED', 'Changed'));
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateStaffProfile('t1', { ...details, name: 'My draft' }, base))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('refuses a profile save after cycle work begins', () => {
    const { current, details, base } = profileEditor(); call(() => current().createObservation('t1'));
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateStaffProfile('t1', { ...details, name: 'My draft' }, base))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('does not save or audit unchanged profile values', () => {
    const { current, details, base } = profileEditor(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateStaffProfile('t1', details, base))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('refuses a profile save in educator preview', () => {
    const { current, details, base } = profileEditor(); call(() => current().setRole('teacher'));
    const before = JSON.stringify(current().workspace());
    expect(call(() => current().updateStaffProfile('t1', { ...details, name: 'My draft' }, base))).toBe(false);
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
});

describe('walkthrough content persistence integrity', () => {
  const valid = { teacherId: 't1', date: '2026-09-04', durationMin: '8', evidence: 'Observed evidence', subject: 'Math', interpretation: 'A question to discuss', componentTags: [], lessonPhase: 'middle', announced: 'unannounced', privacyChecked: false };
  it.each([['subject', 241], ['evidence', 30001], ['interpretation', 15001]])('refuses oversized %s on creation and saved-draft editing', (field, size) => {
    const current = mount(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().createWalkthrough({ ...valid, [field]: 'x'.repeat(size) }))).toBe('');
    expect(JSON.stringify(current().workspace())).toBe(before);
    const id = call(() => current().createWalkthrough(valid)); expect(id).toBeTruthy();
    const after = JSON.stringify(current().workspace());
    expect(call(() => current().updateWalkthroughDraft(id, { [field]: 'x'.repeat(size) }))).toBe('');
    expect(JSON.stringify(current().workspace())).toBe(after);
  });
  it.each(['', '   ', '\u200B'])('rejects missing factual evidence without creating a record or audit (%#)', evidence => {
    const current = mount(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().createWalkthrough({ ...valid, evidence }))).toBe('');
    expect(JSON.stringify(current().workspace())).toBe(before);
  });
  it('preserves all three fields at their supported limits through workspace normalization', () => {
    const current = mount(); const content = { subject: 's'.repeat(240), evidence: 'e'.repeat(30000), interpretation: 'i'.repeat(15000) };
    const id = call(() => current().createWalkthrough({ ...valid, ...content })); expect(id).toBeTruthy();
    expect(api.aeNormalizeWorkspace(current().workspace()).walkthroughs.find(item => item.id === id)).toMatchObject(content);
  });
  it('requires the privacy confirmation when creating published evidence', () => {
    const current = mount(); const before = JSON.stringify(current().workspace());
    expect(call(() => current().createWalkthrough({ ...valid, published: true }))).toBe('');
    expect(JSON.stringify(current().workspace())).toBe(before);
    expect(call(() => current().createWalkthrough({ ...valid, published: true, privacyChecked: true }))).toBeTruthy();
  });
  it('assigns new-record identity and receipts itself instead of trusting recovered metadata', () => {
    const current = mount();
    const id = call(() => current().createWalkthrough({ ...valid, id: 'stale-id', createdAt: '2000-01-01', version: 99, observer: 'Stale observer', teacherAcknowledgedAt: '2000-01-01', publishedAt: '2000-01-01', unknownMetadata: 'ignored' }));
    const record = current().workspace().walkthroughs[0];
    expect(record.id).toBe(id); expect(id).not.toBe('stale-id'); expect(record.version).toBe(1);
    expect(record.observer).toBe(current().workspace().config.evaluatorName);
    expect(record.teacherAcknowledgedAt).toBeNull(); expect(record.publishedAt).toBeNull();
    expect(record.createdAt).not.toBe('2000-01-01'); expect(record).not.toHaveProperty('unknownMetadata');
  });
});
