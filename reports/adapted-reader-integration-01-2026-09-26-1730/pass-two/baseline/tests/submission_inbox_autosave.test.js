import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('view_submission_inbox_source.jsx', 'utf8');
const start = source.indexOf('function siCreateSessionAutosave()');
const end = source.indexOf('\nfunction SubmissionInbox(props)', start);
if (start < 0 || end < 0) throw Error('Missing autosave controller');
const activeTimers = new Set();
const createAutosave = Function('setTimeout', 'clearTimeout', source.slice(start, end) + '\nreturn siCreateSessionAutosave;')(
  (fn, delay) => { const id = setTimeout(() => { activeTimers.delete(id); fn(); }, delay); activeTimers.add(id); return id; },
  id => { clearTimeout(id); activeTimers.delete(id); }
);
const state = text => ({ globalRubric: { rubric: text, context: 'Synthetic context' }, anchors: [{ text: 'Example', score: 90 }] });
const key = 'alloflow_inbox_session';

describe('Submission Inbox batched session persistence', () => {
  beforeEach(() => { activeTimers.clear(); vi.useFakeTimers(); localStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('serializes only the latest edit after a quiet interval', () => {
    const save = createAutosave();
    const stringify = vi.spyOn(JSON, 'stringify');
    for (let i = 0; i < 50; i++) { save.schedule(state('Edit ' + i)); vi.advanceTimersByTime(10); }
    expect(stringify).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(stringify).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(key))).toMatchObject(state('Edit 49'));
    expect(activeTimers.size).toBe(0);
  });

  it('checkpoints continuous typing by two seconds and resumes batching', () => {
    const save = createAutosave();
    for (let i = 0; i < 20; i++) { save.schedule(state('Edit ' + i)); vi.advanceTimersByTime(100); }
    expect(JSON.parse(localStorage.getItem(key))).toMatchObject(state('Edit 19'));
    save.schedule(state('Final')); vi.advanceTimersByTime(300);
    expect(JSON.parse(localStorage.getItem(key))).toMatchObject(state('Final'));
    expect(activeTimers.size).toBe(0);
  });

  it('flushes the latest pending references once and cancels both timers', () => {
    const save = createAutosave();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    save.schedule(state('Old')); save.schedule(state('Latest')); save.flush(); save.flush();
    vi.advanceTimersByTime(3000);
    expect(write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(key))).toMatchObject(state('Latest'));
    expect(activeTimers.size).toBe(0);
  });

  it('cancels a pending edit so clearing cannot resurrect it', () => {
    const save = createAutosave();
    save.schedule(state('Discard')); save.cancel(); save.flush(); vi.advanceTimersByTime(3000);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('removes empty sessions and preserves sessions containing only anchors', () => {
    const save = createAutosave();
    const onlyAnchors = { globalRubric: { rubric: ' ', context: '' }, anchors: [{ text: 'Anchor' }] };
    save.schedule(onlyAnchors); save.flush();
    expect(JSON.parse(localStorage.getItem(key))).toMatchObject(onlyAnchors);
    save.schedule({ ...onlyAnchors, anchors: [] }); save.flush();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('does not throw on quota or serialization failure and accepts later edits', () => {
    const save = createAutosave();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw Error('Quota'); });
    save.schedule(state('Quota')); expect(() => save.flush()).not.toThrow();
    const cyclic = state('Cycle'); cyclic.anchors.push(cyclic);
    save.schedule(cyclic); expect(() => save.flush()).not.toThrow();
    save.schedule(state('Recovered')); save.flush();
    expect(JSON.parse(localStorage.getItem(key))).toMatchObject(state('Recovered'));
    expect(write).toHaveBeenCalledTimes(2);
    expect(activeTimers.size).toBe(0);
  });
});
