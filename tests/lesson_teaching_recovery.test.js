import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const research = require('../lesson_teaching_research_module.js');
let core, host;
beforeAll(() => {
  ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'lesson_teaching_script_host_module.js'].forEach(loadAlloModule);
  core = window.AlloModules.LessonTeachingScript; host = window.AlloModules.LessonTeachingScriptHost;
});
const plan = () => ({ id: 'plan', type: 'lesson-plan', title: 'Fraction lesson', config: { gradeLevel: '4th Grade' }, data: { directInstruction: 'Explain equal intervals on a number line.' } });
const material = () => ({ id: 'source', type: 'analysis', data: { originalText: 'Four equal intervals from zero to one each have a length of one fourth.' } });
const settings = () => ({ grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', scope: 'segment', durationMinutes: 15, goal: 'Explain one fourth on a number line', language: 'English', researchEnabled: false, materialIds: ['source'] });
const raw = () => JSON.stringify({ title: 'Represent one fourth', scope: 'segment', durationMinutes: 15, steps: [1, 2, 3].map(n => ({ id: 'step-' + n, title: 'Model equal intervals', minutes: 5, teacherSays: 'The whole interval runs from zero to one. I divide it into four equal lengths. One of those lengths is one fourth of the whole. Explain how you can check that the lengths are equal.', studentDoes: 'Draw four equal intervals and label one fourth.', checkQuestion: 'Why must the four intervals be equal in length?', possibleResponse: 'One possible answer is that each part must represent the same amount.', ifStruggling: 'A likely difficulty is counting marks instead of intervals. Count the spaces together.', ifReady: 'Explain where three fourths belongs on the same number line.', resourceIds: ['source'], recommendationIds: [] })) });
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function harness(overrides = {}) {
  let state = { history: [plan(), material()], isTeacherMode: true, isParentMode: false, isIndependentMode: false, actorKey: 'teacher', canGenerate: true };
  const statuses = [], writes = [];
  const deps = {
    core, getState: () => state, onStatus: value => statuses.push(value), callText: vi.fn(async () => raw()),
    updateResource: (id, update) => {
      const before = state.history.find(item => item.id === id), after = before && update(before);
      if (!after || before === after) return false;
      state = { ...state, history: state.history.map(item => item.id === id ? after : item) }; writes.push(after); return true;
    }, ...overrides
  };
  return { controller: host.createController(deps), deps, statuses, writes, get: () => state, set: change => { state = change(state); } };
}

describe('teaching-script host recovery and material boundaries', () => {
  it('offers only materials with extractable teaching text', async () => {
    const empty = [
      { id: 'blank-analysis', type: 'analysis', data: { originalText: '   ' } },
      { id: 'empty-image', type: 'image', data: { imageUrl: 'data:image/png;base64,aGVsbG8=' } },
      { id: 'blank-quiz', type: 'quiz', data: { questions: [] } },
      { id: 'blank-source', type: 'simplified', data: '' }
    ];
    expect(host.availableMaterials(plan(), [material(), ...empty]).map(item => item.id)).toEqual(['source']);
    const h = harness(); h.set(state => ({ ...state, history: [plan(), ...empty] }));
    const result = await h.controller.generate('plan', { ...settings(), materialIds: ['blank-analysis'] });
    expect(result.ok).toBe(false); expect(h.deps.callText).not.toHaveBeenCalled();
  });
  it('refuses the result when a selected material becomes blank during generation', async () => {
    const wait = deferred(), h = harness({ callText: vi.fn(() => wait.promise) });
    h.set(state => ({ ...state, history: [...state.history, { id: 'other', type: 'simplified', data: 'Other fraction teaching content remains available.' }] }));
    const pending = h.controller.generate('plan', { ...settings(), materialIds: ['source', 'other'] });
    h.set(state => ({ ...state, history: state.history.map(item => item.id === 'source' ? { ...item, data: { originalText: '   ' } } : item) }));
    wait.resolve(raw());
    expect((await pending).ok).toBe(false); expect(h.writes).toEqual([]);
    expect(h.get().history[0].data.teachingScripts).toBeUndefined();
  });
  it('rejects ambiguous saved plan IDs before generation or editing', async () => {
    const h = harness(); h.set(state => ({ ...state, history: [...state.history, plan()] }));
    expect((await h.controller.generate('plan', settings())).ok).toBe(false);
    expect(h.controller.saveEdits('plan', 'version', []).ok).toBe(false);
    expect(h.deps.callText).not.toHaveBeenCalled(); expect(h.writes).toEqual([]);
  });
  it.each(['text', 'loader', 'research'])('settles cancellation while an uncooperative %s adapter remains pending', async stage => {
    const never = () => new Promise(() => {});
    const overrides = stage === 'text' ? { callText: vi.fn(never) } : stage === 'loader' ? { ensureResearch: vi.fn(never) } : { research: { collect: vi.fn(never) }, read: vi.fn() };
    const h = harness(overrides), pending = h.controller.generate('plan', { ...settings(), researchEnabled: stage !== 'text' });
    expect(h.controller.cancel('plan')).toBe(true);
    expect(await pending).toMatchObject({ ok: false, error: 'Script generation cancelled.' });
    expect(h.statuses.at(-1).stage).toBe('cancelled'); expect(h.writes).toEqual([]);
  });
  it('keeps a retry independent of the canceled provider response and its late rejection', async () => {
    const old = deferred(), fresh = deferred();
    const h = harness({ callText: vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise) });
    const first = h.controller.generate('plan', settings()); h.controller.cancel('plan'); await first;
    const second = h.controller.generate('plan', settings());
    old.reject(new Error('The canceled provider failed late.'));
    await Promise.resolve();
    expect(h.statuses.at(-1)).toMatchObject({ stage: 'generating', busy: true });
    fresh.resolve(raw()); expect((await second).ok).toBe(true);
    expect(h.writes).toHaveLength(1); expect(h.get().history[0].data.teachingScripts).toHaveLength(1);
  });
  it('settles cancellation during the corrective retry without saving invalid output', async () => {
    const secondStarted = deferred();
    const h = harness({ callText: vi.fn().mockResolvedValueOnce('{}').mockImplementationOnce(() => { secondStarted.resolve(); return new Promise(() => {}); }) });
    const pending = h.controller.generate('plan', settings()); await secondStarted.promise;
    h.controller.cancel('plan'); expect((await pending).ok).toBe(false);
    expect(h.deps.callText).toHaveBeenCalledTimes(2); expect(h.writes).toEqual([]);
  });
  it('preserves a newer saved script edit when the caller supplies an older baseline', async () => {
    const h = harness(); await h.controller.generate('plan', settings());
    const version = h.get().history[0].data.teachingScripts[0], expected = structuredClone(version.steps), draft = structuredClone(expected);
    draft[0].teacherSays += ' This was the older editor draft.';
    h.set(state => ({ ...state, history: state.history.map(item => item.id === 'plan' ? { ...item, data: { ...item.data, teachingScripts: item.data.teachingScripts.map(value => ({ ...value, steps: value.steps.map((step, index) => index ? step : { ...step, teacherSays: step.teacherSays + ' Newer saved teacher edit.' }) })) } } : item) }));
    const result = h.controller.saveEdits('plan', version.id, draft, expected);
    expect(result.ok).toBe(false); expect(result.error).toContain('changed while you were editing');
    expect(h.get().history[0].data.teachingScripts[0].steps[0].teacherSays).toContain('Newer saved teacher edit');
    expect(h.writes).toHaveLength(1);
  });
  it('checks the baseline again inside a deferred resource updater', async () => {
    const h = harness(); await h.controller.generate('plan', settings());
    const saved = h.get().history[0], version = saved.data.teachingScripts[0], expected = structuredClone(version.steps), draft = structuredClone(expected);
    draft[0].teacherSays += ' My draft to save.';
    let queued;
    h.deps.updateResource = (id, update) => { queued = update; return true; };
    expect(h.controller.saveEdits('plan', version.id, draft, expected).ok).toBe(true);
    const newer = { ...saved, data: { ...saved.data, teachingScripts: [{ ...version, steps: version.steps.map((step, index) => index ? step : { ...step, teacherSays: step.teacherSays + ' Concurrent saved wording.' }) }] } };
    expect(queued(newer)).toBe(newer);
  });
});

describe('teaching research cancellation cleanup', () => {
  const url = 'https://ies.ed.gov/ncee/wwc/PracticeGuide/15';
  it('observes an adapter result even when the fetch aborts synchronously', async () => {
    const controller = new AbortController();
    const then = vi.fn((resolve, reject) => reject(new Error('Late aborted fetch rejection')));
    const pending = research.readPublicGuidance(url, { signal: controller.signal, fetch: () => { controller.abort(); return { then }; } });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    expect(then).toHaveBeenCalledTimes(1);
  });
  it('aborts the underlying fetch when a declared response body is too large', async () => {
    let signal;
    const pending = research.readPublicGuidance(url, { fetch: async (destination, options) => { signal = options.signal; return { ok: true, url: destination, headers: { get: () => '100001' }, text: vi.fn() }; } });
    await expect(pending).rejects.toThrow('100 KB');
    expect(signal.aborted).toBe(true);
  });
});
