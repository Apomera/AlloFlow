import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, BrainstormView, DbqView;
const t = key => ({ 'common.delete': 'Delete' }[key] || '');
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('timeline_revision_module.js');
  loadAlloModule('view_dbq_module.js');
  loadAlloModule('view_brainstorm_module.js');
  BrainstormView = window.AlloModules.BrainstormView;
  DbqView = window.AlloModules.DbqView;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  vi.useRealTimers();
});
function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(element));
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
let sequence = 0;
function timeline(data) {
  return { id: 'timeline-test-' + (++sequence), type: 'timeline', data: data || { items: [{ date: '1', event: 'Original' }] } };
}
function fixture(resource, options = {}) {
  const state = { active: resource, history: [resource] };
  const ctx = {
    generatedContent: resource, input: 'Revise the sequence', includeTimelineVisuals: false,
    t, cleanJson: text => text, addToast: vi.fn(), setTimelineRevisionInput: vi.fn(),
    setIsRevisingTimeline: vi.fn(), setIsAutoFixingTimeline: vi.fn(), setIsVerifyingTimeline: vi.fn(),
    setIsGeneratingTimelineImage: vi.fn(),
    setGeneratedContent: update => { state.active = typeof update === 'function' ? update(state.active) : update; },
    setHistory: update => { state.history = update(state.history); },
    ...options
  };
  return { state, ctx };
}
const revised = JSON.stringify({ progressionLabel: 'Order', items: [{ date: '1', event: 'Revised' }] });

describe('main-resource Timeline ownership and persistence', () => {
  it.each(['quiz', 'timeline'])('saves the original timeline while a different %s is selected', async type => {
    const request = deferred();
    const resource = timeline();
    const { state, ctx } = fixture(resource);
    const api = window.AlloModules.createTimelineRevision({ callGemini: () => request.promise });
    const run = api.handleTimelineRevision(ctx);
    const other = { id: 'other-' + type, type, data: type === 'quiz' ? { questions: ['Question'] } : { items: [{ event: 'Other' }] } };
    state.active = other;
    request.resolve(revised);
    await run;
    expect(state.active).toBe(other);
    expect(state.history[0].data.items[0].event).toBe('Revised');
  });
  it('persists revisions immediately when images are off, including through the host update contract', async () => {
    const resource = timeline();
    const { state, ctx } = fixture(resource);
    ctx.onUpdateResource = vi.fn((id, updater) => {
      state.history = state.history.map(item => item.id === id ? updater(item) : item);
      if (state.active.id === id) state.active = updater(state.active);
      return true;
    });
    const api = window.AlloModules.createTimelineRevision({ callGemini: async () => revised });
    await api.handleTimelineRevision(ctx);
    expect(ctx.onUpdateResource).toHaveBeenCalledWith(resource.id, expect.any(Function));
    expect(state.active.data).toEqual(state.history[0].data);
    expect(state.history[0].data.items[0].event).toBe('Revised');
  });
  it('does not replace teacher edits made while a revision is pending', async () => {
    const request = deferred();
    const { state, ctx } = fixture(timeline());
    const run = window.AlloModules.createTimelineRevision({ callGemini: () => request.promise }).handleTimelineRevision(ctx);
    state.active = { ...state.active, data: { items: [{ date: '1', event: 'Teacher edit' }] } };
    state.history = [state.active];
    request.resolve(revised);
    await run;
    expect(state.history[0].data.items[0].event).toBe('Teacher edit');
    expect(state.active.data.items[0].event).toBe('Teacher edit');
  });
  it('ignores an older same-resource revision even when it resolves first', async () => {
    const older = deferred(), newer = deferred();
    const { state, ctx } = fixture(timeline());
    const callGemini = vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const api = window.AlloModules.createTimelineRevision({ callGemini });
    const first = api.handleTimelineRevision(ctx), second = api.handleTimelineRevision(ctx);
    older.resolve(JSON.stringify({ items: [{ event: 'Old answer' }] }));
    await first;
    expect(state.active.data.items[0].event).toBe('Original');
    newer.resolve(revised);
    await second;
    expect(state.history[0].data.items[0].event).toBe('Revised');
  });
  it('keeps a delayed image update with the original resource and correct duplicate-text item', async () => {
    const request = deferred();
    const resource = timeline({ items: [{ date: '1', event: 'Repeat' }, { date: '2', event: 'Repeat' }] });
    const { state, ctx } = fixture(resource, { index: 1, date: '2', event: 'Repeat', callImagen: () => request.promise });
    const run = window.AlloModules.createTimelineRevision({ callGemini: vi.fn() }).handleGenerateTimelineItemImage(ctx);
    const other = timeline({ items: [{ date: '2', event: 'Repeat' }] });
    state.active = other;
    request.resolve('data:image/png;base64,aGVsbG8=');
    await run;
    expect(state.active).toBe(other);
    expect(state.history[0].data.items[0].image).toBeUndefined();
    expect(state.history[0].data.items[1].image).toContain('data:image/png');
  });
  it('updates only the original history record for delayed auto-fix and verification', async () => {
    for (const method of ['handleAutoFixTimeline', 'handleVerifyTimelineAccuracy']) {
      const request = deferred();
      const resource = timeline({ items: [{ date: '1', event: 'Original' }], validationIssues: [{ message: 'Fix event' }] });
      const { state, ctx } = fixture(resource);
      const run = window.AlloModules.createTimelineRevision({ callGemini: () => request.promise })[method](ctx);
      const other = timeline();
      state.active = other;
      request.resolve(method === 'handleAutoFixTimeline' ? revised : JSON.stringify([{ index: 0, isFactuallyAccurate: true, isPositionCorrect: true }]));
      await run;
      expect(state.active).toBe(other);
      if (method === 'handleAutoFixTimeline') expect(state.history[0].data.items[0].event).toBe('Revised');
      else expect(state.history[0].data.items[0].verification.factual).toBe(true);
    }
  });

  it('does not clear a newer draft or the busy state of a newer resource request', async () => {
    const older = deferred(), newer = deferred();
    let draft = 'A newer draft';
    const first = fixture(timeline());
    const second = fixture(timeline());
    const status = vi.fn();
    first.ctx.setTimelineRevisionInput = updater => { draft = updater(draft); };
    first.ctx.setIsRevisingTimeline = second.ctx.setIsRevisingTimeline = status;
    const api = window.AlloModules.createTimelineRevision({ callGemini: vi.fn().mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise) });
    const runOne = api.handleTimelineRevision(first.ctx);
    const runTwo = api.handleTimelineRevision(second.ctx);
    older.resolve(revised);
    await runOne;
    expect(draft).toBe('A newer draft');
    expect(status.mock.calls.map(call => call[0])).toEqual([true, true]);
    newer.resolve(revised);
    await runTwo;
    expect(status.mock.calls.at(-1)).toEqual([false]);
  });
  it('commits the text before images and does not replace a later manual edit with the image batch', async () => {
    const images = deferred();
    const { state, ctx } = fixture(timeline(), { includeTimelineVisuals: true, callImagen: () => images.promise });
    const api = window.AlloModules.createTimelineRevision({ callGemini: async () => revised });
    const run = api.handleTimelineRevision(ctx);
    await Promise.resolve();
    await Promise.resolve();
    expect(state.history[0].data.items[0].event).toBe('Revised');
    const edited = { ...state.active, data: { ...state.active.data, items: [{ event: 'Edited after revision' }] } };
    state.active = edited;
    state.history = [edited];
    images.resolve('data:image/png;base64,aGVsbG8=');
    await run;
    expect(state.active).toBe(edited);
    expect(state.history[0].data.items[0].event).toBe('Edited after revision');
  });

});

function dbqProps(id, responses = {}) {
  return {
    generatedContent: { id, type: 'dbq', data: { title: 'Test DBQ', documents: [{ id: 'A', title: 'Source A', excerpt: 'A historical excerpt.', sourcingQuestions: ['Who wrote it?'], analysisQuestions: [] }], rubric: [] } },
    studentResponses: { [id]: responses },
    handleStudentInput: vi.fn(), handleScoreUpdate: vi.fn(), callGemini: async () => JSON.stringify({ overallRating: 'proficient' }),
    cleanJson: text => text, addToast: vi.fn(), t, gradeLevel: '5th Grade', isTeacherMode: false
  };
}
function clickText(text) {
  const button = [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
  expect(button, 'Expected button: ' + text).toBeTruthy();
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
describe('main-resource DBQ timer and rewards', () => {
  it('resumes from a deadline, ignores obsolete saved handles, and never writes tick responses', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T12:00:00Z'));
    const props = dbqProps('dbq-timer', { _dbqTimerEnd: Date.now() + 900000, _dbqTimerInterval: 1234 });
    mount(React.createElement(DbqView, props));
    expect(host.querySelector('[role=timer]').textContent).toBe('15:00');
    act(() => vi.advanceTimersByTime(3000));
    expect(host.querySelector('[role=timer]').textContent).toBe('14:57');
    expect(props.handleStudentInput).not.toHaveBeenCalled();
    act(() => root.render(React.createElement('div', null, 'Another resource')));
    expect(vi.getTimerCount()).toBe(0);
    act(() => vi.advanceTimersByTime(60000));
    expect(props.handleStudentInput).not.toHaveBeenCalled();
  });
  it('cleans up the previous resource timer and stops its interval at expiry', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T12:00:00Z'));
    mount(React.createElement(DbqView, dbqProps('first', { _dbqTimerEnd: Date.now() + 900000 })));
    const props = dbqProps('second', { _dbqTimerEnd: Date.now() + 2000 });
    act(() => root.render(React.createElement(DbqView, props)));
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(3000));
    expect(host.textContent).toContain("Time's up!");
    expect(vi.getTimerCount()).toBe(0);
    expect(props.handleStudentInput).not.toHaveBeenCalled();
  });
  it('uses different source-analysis and reliability reward keys in different DBQs', async () => {
    const keys = [];
    for (const id of ['dbq-one', 'dbq-two']) {
      const props = dbqProps(id, {
        _reliability_A: { reasoning: 'It is a firsthand account.', rating: 'Very Reliable' },
        'doc-A-sourcing-0': 'The author wrote this.',
        _happNotes: { A: { historical: 'History', audience: 'Audience', purpose: 'Purpose', pointOfView: 'Perspective' } }
      });
      if (!root) mount(React.createElement(DbqView, props));
      else act(() => root.render(React.createElement(DbqView, props)));
      await act(async () => { clickText('Compare My Assessment'); });
      await act(async () => { clickText('Check My Analysis'); });
      expect(props.handleScoreUpdate).toHaveBeenCalledTimes(2);
      keys.push(...props.handleScoreUpdate.mock.calls.map(call => call[2]));
    }
    expect(new Set(keys).size).toBe(4);
    expect(keys).toEqual(['dbq-reliability-dbq-one-A', 'dbq-analysis-dbq-one-A', 'dbq-reliability-dbq-two-A', 'dbq-analysis-dbq-two-A']);
  });
});

const discussion = { kind: 'discussion', title: 'Discussion', protocol: 'think-pair-share', grouping: 'Pairs', openingQuestion: 'Why?', questionSets: [{ depth: 'literal', questions: ['What happened?'] }], talkStems: { agree: ['I agree because...'] }, facilitationNotes: 'TEACHER SECRET', lookFors: ['TEACHER SECRET'] };
const jigsaw = { kind: 'jigsaw', title: 'Jigsaw', groupSize: 3, chunks: [{ label: 'Team A', expertPacket: 'Read this packet.', teachBack: { keyPoints: ['Main point'], checkQuestions: ['Explain it.'] } }], homeGroupTask: 'Teach your group.', synthesisOrganizer: 'Compare the parts.', accountabilityCheck: [{ q: 'What did you learn?', answer: 'TEACHER SECRET' }] };
function activityProps(item) {
  return { generatedContent: { id: 'activity', type: 'brainstorm', data: [item] }, t, isTeacherMode: true, isEditingBrainstorm: true, isGeneratingGuide: {}, handleBrainstormChange: vi.fn(), renderFormattedText: value => value, getRows: () => 3 };
}
function changeText(label, value) {
  const element = [...host.querySelectorAll('textarea, input')].find(node => node.getAttribute('aria-label') === label);
  expect(element, 'Expected field: ' + label).toBeTruthy();
  const prototype = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
describe('main-resource Activities editing and learner projection', () => {
  it('edits discussion prompts and nested question sets through the shared persistence callback', () => {
    const props = activityProps(discussion);
    mount(React.createElement(BrainstormView, props));
    act(() => changeText('Opening question', 'What changed?'));
    expect(props.handleBrainstormChange).toHaveBeenLastCalledWith(0, 'openingQuestion', 'What changed?');
    act(() => changeText('Questions (one per line) 1', 'First question\nSecond question'));
    expect(props.handleBrainstormChange).toHaveBeenLastCalledWith(0, 'questionSets', [{ depth: 'literal', questions: ['First question', 'Second question'] }]);
    act(() => clickText('Add question set'));
    expect(props.handleBrainstormChange.mock.calls.at(-1)[2]).toHaveLength(2);
  });
  it('edits expert packets and teacher answers while preserving the rest of their schema', () => {
    const props = activityProps(jigsaw);
    mount(React.createElement(BrainstormView, props));
    act(() => changeText('Expert packet 1', 'Revised packet.'));
    expect(props.handleBrainstormChange).toHaveBeenLastCalledWith(0, 'chunks', [{ ...jigsaw.chunks[0], expertPacket: 'Revised packet.' }]);
    act(() => changeText('Answer key (teacher only) 1', 'Revised answer'));
    expect(props.handleBrainstormChange).toHaveBeenLastCalledWith(0, 'accountabilityCheck', [{ q: 'What did you learn?', answer: 'Revised answer' }]);
  });
  it('projects learner content idempotently, retaining safe identity and excluding nested teacher data', () => {
    const resource = {
      id: 'activity', artifactInstanceId: 'instance', unitId: 'unit', sourceFingerprint: 'fingerprint', type: 'brainstorm',
      config: { language: 'Spanish', grade: '5th Grade', customInstructions: 'TEACHER SECRET' }, answerKey: 'TEACHER SECRET',
      data: [
        { ...discussion, guide: 'TEACHER SECRET', worksheet: 'TEACHER SECRET', rubric: { answer: 'TEACHER SECRET' }, questionSets: [{ depth: 'literal', questions: ['What happened?'], answer: 'TEACHER SECRET' }] },
        { ...jigsaw, chunks: [{ ...jigsaw.chunks[0], teacherNotes: 'TEACHER SECRET' }] },
        { kind: 'idea', title: 'Teacher-only idea' }
      ]
    };
    const before = JSON.stringify(resource);
    const project = BrainstormView.projectStudentActivityResource;
    const result = project(resource);
    expect(result.data).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain('TEACHER SECRET');
    expect(result.config).toEqual({ language: 'Spanish', grade: '5th Grade' });
    expect(result.artifactInstanceId).toBe('instance');
    expect(result.unitId).toBe('unit');
    expect(result.sourceFingerprint).toBe('fingerprint');
    expect(project(result)).toEqual(result);
    expect(JSON.stringify(resource)).toBe(before);
    expect(project({ type: 'brainstorm', data: [{ title: 'Idea' }] })).toBeNull();
    const props = { ...activityProps(discussion), generatedContent: result, isTeacherMode: false, isEditingBrainstorm: true };
    mount(React.createElement(BrainstormView, props));
    expect(host.textContent).toContain('What happened?');
    expect(host.textContent).toContain('Read this packet.');
    expect(host.querySelector('textarea, input')).toBeNull();
    expect(host.textContent).not.toContain('Generate');
    expect(host.textContent).not.toContain('TEACHER SECRET');
  });
});
