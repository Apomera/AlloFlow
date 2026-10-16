import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let core, host;
beforeAll(() => {
  ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'lesson_teaching_script_host_module.js'].forEach(loadAlloModule);
  core = window.AlloModules.LessonTeachingScript; host = window.AlloModules.LessonTeachingScriptHost;
});
const plan = () => ({ id: 'p', type: 'lesson-plan', title: 'Fraction lesson', data: { directInstruction: 'Compare equal parts', objectives: ['Compare fractions'] } });
const material = { id: 'm', type: 'simplified', data: 'Four equal intervals divide a whole into fourths.' };
const settings = { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', scope: 'segment', durationMinutes: 15, goal: 'Compare equal parts', language: 'English', researchEnabled: false, materialIds: ['m'] };
const step = extra => ({ id: 's1', phase: 'directInstruction', minutes: 5, title: 'Compare equal parts', teacherSays: 'Here is one whole strip. I divide it into four equal intervals. Each interval measures one fourth of the same whole. Explain how the equal lengths help us compare.', studentDoes: 'Learners compare strips with a partner and wait for their turn.', checkQuestion: 'How can we check whether the parts are equal?', possibleResponse: 'One possible response is to compare their lengths.', ifStruggling: 'A possible difficulty is counting marks; count each interval together.', ifReady: 'Explain why two fourths also represents one half of the strip.', resourceIds: ['m'], recommendationIds: [], ...extra });
function replacement(extra = {}) { return JSON.stringify({ step: step({ id: 's2', title: 'A clearer comparison', ...extra }) }); }
function setup(overrides = {}, evidence = { status: 'disabled', sources: [] }) {
  const savedPlan = plan(), snapshot = core.captureInputs(savedPlan, settings, [material]);
  const result = core.normalizeScript({ title: 'Compare fractions', scope: 'segment', durationMinutes: 15, steps: [1, 2, 3].map(i => step({ id: 's' + i, recommendationIds: evidence.status === 'retrieved' && i === 1 ? ['rec'] : [] })) }, snapshot, evidence);
  expect(result.ok).toBe(true);
  let state = { history: [core.appendVersion(savedPlan, result.version), material], isTeacherMode: true, canGenerate: true, actorKey: 'teacher' };
  const writes = [], statuses = [];
  const deps = { core, storage: null, callText: vi.fn(async () => replacement()), getState: () => state, onStatus: s => statuses.push(s), updateResource: vi.fn((id, update) => {
    const previous = state.history.find(item => item.id === id), next = update(previous);
    if (next === previous) return false;
    writes.push(next); state = { ...state, history: state.history.map(item => item.id === id ? next : item) }; return true;
  }), ...overrides };
  return { controller: host.createController(deps), deps, writes, statuses, version: result.version, get: () => state, set: update => { state = update(state); } };
}
function options(h) { return { steps: structuredClone(h.version.steps), expectedSteps: structuredClone(h.version.steps), instruction: 'Use a clearer example.' }; }
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

describe('regenerating a teaching step through the host', () => {
  it('uses draft neighbors and saved research, returns only a replacement, and waits for Save edits', async () => {
    const evidence = { status: 'retrieved', sources: [{ id: 'source', title: 'Practice guide', url: 'https://example.org/guide', recommendations: [{ id: 'rec', text: 'Compare visual representations.' }] }] };
    const h = setup({}, evidence), request = options(h), before = JSON.stringify(h.get());
    request.steps[0].teacherSays += ' Preserve my teacher wording.';
    request.steps[2].minutes = '5';
    const result = await h.controller.regenerateStep('p', h.version.id, 's2', request);
    expect(result.ok).toBe(true); expect(result.step.title).toBe('A clearer comparison');
    expect(h.deps.callText.mock.calls[0][0]).toContain('Preserve my teacher wording.');
    expect(h.deps.callText.mock.calls[0][0]).toContain('Compare visual representations.');
    expect(h.deps.callText.mock.calls[0][0]).toContain('Use a clearer example.');
    expect(h.deps.updateResource).not.toHaveBeenCalled(); expect(JSON.stringify(h.get())).toBe(before);
    expect(h.statuses).toContainEqual(expect.objectContaining({ busy: true, stage: 'regenerating-step', stepId: 's2' }));
    expect(h.statuses.at(-1)).toMatchObject({ busy: false, stage: 'step-ready', stepId: '' });
    const draft = request.steps.map(s => s.id === 's2' ? result.step : { ...s, minutes: Number(s.minutes) });
    expect(h.controller.saveEdits('p', h.version.id, draft, request.expectedSteps)).toEqual({ ok: true });
    expect(h.writes).toHaveLength(1);
    expect(h.get().history[0].data.teachingScripts[0].steps[0].teacherSays).toContain('Preserve my teacher wording.');
  });
  it('repairs one malformed response without regenerating another step', async () => {
    const call = vi.fn().mockResolvedValueOnce('{"step":').mockResolvedValueOnce(replacement()), h = setup({ callText: call });
    expect((await h.controller.regenerateStep('p', h.version.id, 's2', options(h))).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(2); expect(call.mock.calls[1][0]).toContain(JSON.stringify({ draft: '{"step":', truncatedForRepair: false })); expect(h.writes).toHaveLength(0);
  });
  it('stops after one repair and leaves all teacher edits untouched', async () => {
    const call = vi.fn(async () => replacement({ minutes: 7 })), h = setup({ callText: call }), request = options(h), before = JSON.stringify(request);
    const result = await h.controller.regenerateStep('p', h.version.id, 's2', request);
    expect(result.ok).toBe(false); expect(result.error).toContain('Your draft was kept');
    expect(call).toHaveBeenCalledTimes(2); expect(JSON.stringify(request)).toBe(before); expect(h.writes).toHaveLength(0);
  });
  it.each(['plan', 'material', 'missing', 'untracked'])('rejects stale original %s before any AI request', async change => {
    const h = setup();
    h.set(s => ({ ...s, history: s.history.map(item => {
      if (change === 'plan' && item.id === 'p') return { ...item, title: 'New topic' };
      if (change === 'material' && item.id === 'm') return { ...item, data: 'Different teaching content.' };
      if (change === 'untracked' && item.id === 'p') return { ...item, data: { ...item.data, teachingScripts: item.data.teachingScripts.map(v => ({ ...v, inputSnapshot: { ...v.inputSnapshot, materialFingerprints: undefined } })) } };
      return item;
    }).filter(item => change !== 'missing' || item.id !== 'm') }));
    const result = await h.controller.regenerateStep('p', h.version.id, 's2', options(h));
    expect(result.ok).toBe(false); expect(h.deps.callText).not.toHaveBeenCalled(); expect(h.writes).toHaveLength(0);
    if (change === 'untracked') expect(result.error).toContain('older script does not record all its original inputs');
  });
  it.each(['actor', 'version', 'removed', 'material', 'mode'])('rejects late response after %s changes', async change => {
    const wait = deferred(), h = setup({ callText: vi.fn(() => wait.promise) });
    const run = h.controller.regenerateStep('p', h.version.id, 's2', options(h));
    if (change === 'actor') h.set(s => ({ ...s, actorKey: 'other' }));
    if (change === 'mode') h.set(s => ({ ...s, isParentMode: true }));
    if (change === 'removed') h.set(s => ({ ...s, history: [material] }));
    if (change === 'material') h.set(s => ({ ...s, history: [s.history[0], { ...material, data: 'Changed material' }] }));
    if (change === 'version') h.set(s => ({ ...s, history: [{ ...s.history[0], data: { ...s.history[0].data, teachingScripts: [{ ...h.version, editedAt: 'changed' }] } }, material] }));
    wait.resolve(replacement()); expect((await run).ok).toBe(false); expect(h.writes).toHaveLength(0);
    expect(h.statuses.at(-1)).toMatchObject({ busy: false, stage: 'error', stepId: '' });
  });
  it('cancels a provider that ignores AbortSignal and shares the generation lock', async () => {
    const wait = deferred(), h = setup({ callText: vi.fn(() => wait.promise) });
    const run = h.controller.regenerateStep('p', h.version.id, 's2', options(h));
    expect((await h.controller.generate('p', settings)).ok).toBe(false);
    expect((await h.controller.regenerateStep('p', h.version.id, 's1', options(h))).ok).toBe(false);
    expect(h.controller.cancel('p')).toBe(true); expect((await run).ok).toBe(false);
    wait.resolve(replacement()); await Promise.resolve(); expect(h.writes).toHaveLength(0);
    expect(h.statuses.at(-1)).toMatchObject({ busy: false, stage: 'cancelled', stepId: '' });
  });
  it('keeps provider errors terminal and rejects outdated core capabilities', async () => {
    const call = vi.fn().mockRejectedValue(new Error('401 invalid API key')), h = setup({ callText: call });
    expect((await h.controller.regenerateStep('p', h.version.id, 's2', options(h))).error).toBe('401 invalid API key');
    expect(call).toHaveBeenCalledTimes(1);
    h.deps.core = { ...core, buildStepRegenerationPrompt: undefined };
    expect((await h.controller.regenerateStep('p', h.version.id, 's2', options(h))).error).toContain('out of date');
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('rejects a stale editing baseline before calling AI', async () => {
    const h = setup(), request = options(h); request.expectedSteps[0].title = 'Old baseline';
    expect((await h.controller.regenerateStep('p', h.version.id, 's2', request)).error).toContain('changed while you were editing');
    expect(h.deps.callText).not.toHaveBeenCalled();
  });
});
