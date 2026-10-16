import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let core, host;
beforeAll(() => {
  ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'lesson_teaching_script_host_module.js'].forEach(loadAlloModule);
  core = window.AlloModules.LessonTeachingScript; host = window.AlloModules.LessonTeachingScriptHost;
});
const plan = () => ({ id: 'p', type: 'lesson-plan', title: 'Fraction lesson', data: { directInstruction: 'Compare equal parts', objectives: ['Compare fractions'] } });
const material = { id: 'm', type: 'simplified', data: 'Four equal intervals divide a whole into fourths.' };
const settings = (extra = {}) => ({ grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', scope: 'segment', durationMinutes: 15, goal: 'Compare equal parts', language: 'English', researchEnabled: false, materialIds: ['m'], ...extra });
const step = extra => ({ title: 'Compare equal parts', teacherSays: 'Here is one whole strip. I divide it into four equal intervals. Each interval measures one fourth of the same whole. Explain how the equal lengths help us compare.', studentDoes: 'Learners compare strips with a partner and wait for their turn.', checkQuestion: 'How can we check whether the parts are equal?', possibleResponse: 'One possible response is to compare their lengths.', ifStruggling: 'A possible difficulty is counting marks; count each interval together.', ifReady: 'Explain why two fourths also represents one half of the strip.', resourceIds: ['m'], recommendationIds: [], ...extra });
const evidence = { status: 'retrieved', sources: [{ id: 'source', title: 'Practice guide', url: 'https://example.org/guide', recommendations: [{ id: 'rec', text: 'Compare visual representations.' }] }] };
function storageFixture() {
  const entries = new Map();
  return { getItem: key => entries.get(key) || null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key), entries };
}
function part(prompt, researched = false) {
  const marker = 'BEGIN UNTRUSTED PART CONTEXT JSON\n';
  const input = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length).split('\nEND UNTRUSTED PART CONTEXT JSON')[0]);
  return JSON.stringify({ step: step({ ...input.assignedPart, recommendationIds: researched ? ['rec'] : [] }) });
}
function whole(researched = false) {
  return JSON.stringify({ title: 'Compare fractions', scope: 'segment', durationMinutes: 15, steps: [1, 2, 3].map(index => step({ id: 's' + index, phase: 'directInstruction', minutes: 5, recommendationIds: researched && index === 1 ? ['rec'] : [] })) });
}
function setup(callText, storage = storageFixture(), extra = {}) {
  let state = { history: [plan(), material], isTeacherMode: true, canGenerate: true, actorKey: 'teacher' };
  const statuses = [], writes = [];
  const deps = { core, storage, callText, getState: () => state, onStatus: s => statuses.push(s), updateResource: (id, update) => {
    const previous = state.history.find(item => item.id === id), next = update(previous);
    if (next === previous) return false;
    writes.push(next); state = { ...state, history: state.history.map(item => item.id === id ? next : item) }; return true;
  }, ...extra };
  return { controller: host.createController(deps), recreate: () => host.createController(deps), deps, storage, statuses, writes, get: () => state, set: update => { state = update(state); } };
}
function failSecondPart(researched = false) {
  let chunks = 0;
  return vi.fn(async prompt => {
    if (prompt.startsWith('Identify the subject')) return '{"subject":"mathematics","topic":"Equal fractions"}';
    if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
    if (++chunks === 2) throw new Error('Network disconnected');
    return part(prompt, researched);
  });
}

describe('temporary teaching-script recovery', () => {
  it('resumes only remaining validated chunks after controller recreation and writes one complete version', async () => {
    const call = failSecondPart(), h = setup(call);
    expect((await h.controller.generate('p', settings())).ok).toBe(false);
    expect(h.writes).toHaveLength(0);
    expect(h.controller.getRecovery('p', settings())).toMatchObject({ completedChunks: 1, totalChunks: 3, stage: 'chunking', persistence: 'session' });
    const statusCount = h.statuses.length;
    h.controller.getRecovery('p'); expect(h.statuses).toHaveLength(statusCount);
    const resumedCall = vi.fn(async prompt => part(prompt)); h.deps.callText = resumedCall;
    const resumed = h.recreate();
    expect(resumed.getRecovery('p', settings())).toMatchObject({ completedChunks: 1, persistence: 'session' });
    const result = await resumed.generate('p', settings());
    expect(result.ok).toBe(true); expect(resumedCall).toHaveBeenCalledTimes(2);
    expect(resumedCall.mock.calls[0][0]).toContain('part 2 of 3');
    expect(h.writes).toHaveLength(1); expect(result.version.steps).toHaveLength(3);
    expect(resumed.getRecovery('p')).toBeNull(); expect(h.storage.entries.size).toBe(0);
  });
  it('keeps completed chunks on cancellation and ignores a late provider response', async () => {
    let release, begin, chunks = 0;
    const pending = new Promise(resolve => { begin = resolve; });
    const h = setup(vi.fn(async prompt => {
      if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
      if (++chunks === 2) { begin(); return new Promise(resolve => { release = () => resolve(part(prompt)); }); }
      return part(prompt);
    }));
    const run = h.controller.generate('p', settings()); await pending;
    h.controller.cancel('p'); expect((await run).ok).toBe(false);
    release(); await Promise.resolve(); expect(h.writes).toHaveLength(0);
    const resumed = h.recreate(); expect(resumed.getRecovery('p')).toMatchObject({ completedChunks: 1 });
    const call = vi.fn(async prompt => part(prompt)); h.deps.callText = call;
    expect((await resumed.generate('p', settings())).ok).toBe(true); expect(call).toHaveBeenCalledTimes(2);
  });
  it('resumes inferred context and verified research despite changed heuristic subject/topic', async () => {
    const collect = vi.fn(async () => evidence), call = failSecondPart(true);
    const h = setup(call, storageFixture(), { research: { collect }, read: vi.fn() });
    const request = settings({ subject: 'other', topic: '', inferContext: { subject: true, topic: true }, researchEnabled: true });
    expect((await h.controller.generate('p', request)).ok).toBe(false); expect(collect).toHaveBeenCalledTimes(1);
    const resumedCall = vi.fn(async prompt => part(prompt, true)); h.deps.callText = resumedCall;
    const resumed = h.recreate();
    expect(resumed.getRecovery('p', { ...request, topic: 'Equal fractions', subject: 'mathematics' })).toMatchObject({ completedChunks: 1 });
    const result = await resumed.generate('p', { ...request, topic: 'New heuristic', subject: 'science' });
    expect(result.ok).toBe(true); expect(collect).toHaveBeenCalledTimes(1); expect(resumedCall).toHaveBeenCalledTimes(2);
    expect(result.version.inputSnapshot.settings.topic).toBe('Equal fractions');
  });
  it.each(['generating', 'chunking'])('resumes %s with cached research after live research becomes unavailable', async stage => {
    const ensureResearch = vi.fn(async () => undefined), read = vi.fn(async () => 'Verified guidance text');
    const collect = vi.fn(async (_context, adapters) => {
      await adapters.read(evidence.sources[0].url);
      return evidence;
    });
    const call = stage === 'chunking' ? failSecondPart(true) : vi.fn(async prompt => {
      if (prompt.startsWith('Identify the subject')) return '{"subject":"mathematics","topic":"Equal fractions"}';
      throw new Error('Network disconnected');
    });
    const h = setup(call, storageFixture(), { ensureResearch, research: { collect }, read });
    const request = settings({ subject: 'other', topic: '', inferContext: { subject: true, topic: true }, researchEnabled: true });
    expect((await h.controller.generate('p', request)).ok).toBe(false);
    expect(ensureResearch).toHaveBeenCalledTimes(1); expect(collect).toHaveBeenCalledTimes(1); expect(read).toHaveBeenCalledTimes(1);
    const expectedRecovery = { stage, completedChunks: stage === 'chunking' ? 1 : 0, totalChunks: 3 };
    expect(h.controller.getRecovery('p', request)).toMatchObject(expectedRecovery);
    expect(h.writes).toHaveLength(0);
    h.controller.dispose();
    ensureResearch.mockClear().mockRejectedValue(new Error('Research loader unavailable'));
    collect.mockClear().mockRejectedValue(new Error('Research search unavailable'));
    read.mockClear().mockRejectedValue(new Error('Research reader unavailable'));
    const resumedCall = vi.fn(async prompt => stage === 'chunking' ? part(prompt, true) : whole(true));
    h.deps.callText = resumedCall;
    const resumed = h.recreate();
    expect(resumed.getRecovery('p', request)).toMatchObject(expectedRecovery);
    // Cached research removes the research dependency, but unfinished wording still needs text AI.
    h.set(state => ({ ...state, canGenerate: false }));
    expect(await resumed.generate('p', request)).toMatchObject({ ok: false, error: expect.stringContaining('AI text provider') });
    expect(resumed.getRecovery('p', request)).toMatchObject(expectedRecovery);
    expect(resumedCall).not.toHaveBeenCalled();
    h.set(state => ({ ...state, canGenerate: true }));
    const result = await resumed.generate('p', request);
    expect(result.ok).toBe(true);
    expect(resumedCall).toHaveBeenCalledTimes(stage === 'chunking' ? 2 : 1);
    expect(resumedCall.mock.calls.every(([prompt]) => !prompt.startsWith('Identify the subject'))).toBe(true);
    expect(ensureResearch).not.toHaveBeenCalled(); expect(collect).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
    expect(result.version.inputSnapshot.settings).toMatchObject({ subject: 'mathematics', topic: 'Equal fractions', researchEnabled: true });
    expect(result.version).toMatchObject({ researchStatus: 'retrieved', sources: evidence.sources });
    expect(result.version.steps.some(step => step.recommendationIds.includes('rec'))).toBe(true);
    expect(h.writes).toHaveLength(1); expect(resumed.getRecovery('p')).toBeNull();
  });
  it.each(['material', 'plan', 'missing'])('drops recovery for changed %s', async change => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    if (change === 'material') h.set(s => ({ ...s, history: [s.history[0], { ...material, data: 'Different actual teaching content.' }] }));
    if (change === 'plan') h.set(s => ({ ...s, history: [{ ...s.history[0], title: 'New lesson topic' }, material] }));
    if (change === 'missing') h.set(s => ({ ...s, history: [] }));
    expect(h.recreate().getRecovery('p', settings())).toBeNull(); expect(h.storage.entries.size).toBe(0);
  });
  it.each([
    { goal: 'A different goal' },
    { inferContext: { subject: true, topic: false } },
    { researchEnabled: true },
    { durationMinutes: '' },
    { materialIds: [] },
  ])('keeps valid progress while form settings temporarily differ: %j', async change => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    const resumed = h.recreate(), stored = [...h.storage.entries];
    expect(resumed.getRecovery('p', settings(change))).toBeNull();
    expect([...h.storage.entries]).toEqual(stored);
    expect(resumed.getRecovery('p', settings())).toMatchObject({ completedChunks: 1 });
    const call = vi.fn(async prompt => part(prompt)); h.deps.callText = call;
    expect((await resumed.generate('p', settings())).ok).toBe(true); expect(call).toHaveBeenCalledTimes(2);
  });
  it('replaces prior progress only when a valid new generation is requested', async () => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    expect((await h.controller.generate('p', settings({ goal: '' }))).ok).toBe(false);
    expect(h.controller.getRecovery('p', settings())).toMatchObject({ completedChunks: 1 });
    h.deps.callText = vi.fn(async () => { throw new Error('Network disconnected'); });
    const changed = settings({ goal: 'Explain equivalent fractions' });
    expect((await h.controller.generate('p', changed)).ok).toBe(false);
    expect(h.controller.getRecovery('p', settings())).toBeNull();
    expect(h.controller.getRecovery('p', changed)).toMatchObject({ completedChunks: 0, stage: 'generating' });
    expect(h.deps.callText).toHaveBeenCalledTimes(1);
  });
  it('isolates actors and does not reveal another teacher\'s pending script', async () => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    h.set(s => ({ ...s, actorKey: 'another-teacher' }));
    expect(h.recreate().getRecovery('p')).toBeNull();
    h.set(s => ({ ...s, actorKey: 'teacher' }));
    expect(h.recreate().getRecovery('p')).toMatchObject({ completedChunks: 1 });
  });
  it.each(['expired', 'references', 'fingerprint', 'evidence', 'structure'])('rejects invalid %s in recovered storage', async kind => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    const [key, raw] = [...h.storage.entries][0], entries = JSON.parse(raw), entry = entries[0];
    if (kind === 'expired') entry.updatedAt = Date.now() - 86400001;
    if (kind === 'references') entry.steps[0].resourceIds = ['invented'];
    if (kind === 'fingerprint') entry.fingerprint = 'tampered';
    if (kind === 'evidence') entry.evidence = { status: 'retrieved', sources: [] };
    h.storage.setItem(key, kind === 'structure' ? '{not json' : JSON.stringify(entries));
    expect(h.recreate().getRecovery('p')).toBeNull(); expect(h.writes).toHaveLength(0);
  });
  it('keeps in-memory progress when storage is unavailable and can discard it explicitly', async () => {
    const storage = { getItem() { throw new Error('disabled'); }, setItem() { throw new Error('full'); }, removeItem() {} };
    const h = setup(failSecondPart(), storage); await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'memory' });
    expect(h.recreate().getRecovery('p')).toBeNull();
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true }); expect(h.controller.getRecovery('p')).toBeNull();
  });
  it.each(['throwing', 'no-op', 'missing'])('keeps progress when the durable remover is %s, then clears it on retry', async kind => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    const before = h.controller.getRecovery('p'), removeItem = h.storage.removeItem, statuses = h.statuses.length;
    h.storage.removeItem = kind === 'throwing' ? () => { throw new Error('Storage unavailable'); } : kind === 'no-op' ? () => {} : undefined;
    expect(h.controller.discardRecovery('p')).toMatchObject({ ok: false, error: expect.stringContaining('Retry Start over') });
    expect(h.controller.getRecovery('p')).toEqual(before);
    expect(h.recreate().getRecovery('p')).toEqual(before);
    expect(h.statuses).toHaveLength(statuses);
    h.storage.removeItem = removeItem;
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true });
    expect(h.controller.getRecovery('p')).toBeNull(); expect(h.recreate().getRecovery('p')).toBeNull();
    // Later persistence of another plan must not restore the successfully cleared one.
    h.set(state => ({ ...state, history: [...state.history, { ...plan(), id: 'other-plan' }] }));
    h.deps.callText = failSecondPart(); await h.controller.generate('other-plan', settings());
    expect(h.recreate().getRecovery('p')).toBeNull();
    expect(h.recreate().getRecovery('other-plan')).toMatchObject({ completedChunks: 1 });
  });
  it.each(['before deletion', 'after deletion'])('retains the draft when durable removal cannot be read %s', async when => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    const getItem = h.storage.getItem, before = h.controller.getRecovery('p');
    let reads = 0;
    h.storage.getItem = key => {
      if (when === 'before deletion' || ++reads > 1) throw new Error('Storage unavailable');
      return getItem(key);
    };
    expect(h.controller.discardRecovery('p')).toMatchObject({ ok: false, error: expect.stringContaining('current progress is still available') });
    expect(h.controller.getRecovery('p')).toEqual({ ...before, persistence: when === 'after deletion' ? 'memory' : 'session' });
    h.storage.getItem = getItem;
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true });
    expect(h.recreate().getRecovery('p')).toBeNull();
  });
  it('preserves the latest memory-only chunks when an older durable checkpoint cannot be removed', async () => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    h.storage.setItem = () => { throw new Error('Quota exceeded'); };
    let calls = 0;
    h.deps.callText = vi.fn(async prompt => { if (++calls === 2) throw new Error('Network disconnected'); return part(prompt); });
    await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 2, persistence: 'memory' });
    h.storage.removeItem = () => {};
    expect(h.controller.discardRecovery('p').ok).toBe(false);
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 2, persistence: 'memory' });
    expect(h.recreate().getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'session' });
  });
  it('requires confirmed deletion when writes succeeded but their readback was unavailable', async () => {
    const storage = storageFixture(), getItem = storage.getItem;
    const h = setup(failSecondPart(), storage);
    // The initial empty read succeeded. Subsequent writes still work, but none
    // can be confirmed, so the UI correctly describes this as memory recovery.
    storage.getItem = () => { throw new Error('Read temporarily unavailable'); };
    await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'memory' });
    expect(storage.entries.size).toBe(1);
    expect(h.controller.discardRecovery('p')).toMatchObject({ ok: false, error: expect.stringContaining('Retry Start over') });
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1 });
    storage.getItem = getItem;
    expect(h.recreate().getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'session' });
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true });
    expect(h.controller.getRecovery('p')).toBeNull(); expect(h.recreate().getRecovery('p')).toBeNull();
  });
  it.each(['throwing', 'no-op'])('preserves other stored actors and plans when clearing requires a %s writer', async kind => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    const [key, raw] = [...h.storage.entries][0], entry = JSON.parse(raw)[0];
    // These entries arrived after this controller was created and must be retained.
    const others = [{ ...entry, actor: 'another-teacher' }, { ...entry, planId: 'other-plan' }];
    h.storage.setItem(key, JSON.stringify([entry, ...others]));
    const setItem = h.storage.setItem, stored = h.storage.getItem(key);
    h.storage.setItem = kind === 'throwing' ? () => { throw new Error('Quota exceeded'); } : () => {};
    expect(h.controller.discardRecovery('p').ok).toBe(false);
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1 });
    expect(h.storage.getItem(key)).toBe(stored);
    h.storage.setItem = setItem;
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true });
    expect(JSON.parse(h.storage.getItem(key))).toEqual(others);
    expect(h.recreate().getRecovery('p')).toBeNull();
    h.set(state => ({ ...state, actorKey: 'another-teacher' }));
    expect(h.recreate().getRecovery('p')).toMatchObject({ completedChunks: 1 });
  });
  it('does not rewrite malformed or oversized durable collections during discard', async () => {
    const h = setup(failSecondPart()); await h.controller.generate('p', settings());
    const [key, raw] = [...h.storage.entries][0];
    for (const invalid of ['{broken', '[' + ' '.repeat(1500000) + ']', JSON.stringify(Array(6).fill(JSON.parse(raw)[0]))]) {
      h.storage.setItem(key, invalid);
      expect(h.controller.discardRecovery('p').ok).toBe(false);
      expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1 });
      expect(h.storage.getItem(key)).toBe(invalid);
    }
    h.storage.setItem(key, raw);
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true });
  });
  it.each([
    ['disabled', null],
    ['missing writer', { getItem: () => null }],
    ['no-op writer', { getItem: () => null, setItem() {}, removeItem() {} }],
    ['quota exceeded', { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} }],
  ])('reports current-page recovery when storage is %s', async (_, storage) => {
    const h = setup(failSecondPart(), storage);
    await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'memory' });
    expect(h.statuses.at(-1).recovery).toMatchObject({ completedChunks: 1, persistence: 'memory' });
    expect(h.recreate().getRecovery('p')).toBeNull();
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true });
    expect(h.controller.getRecovery('p')).toBeNull();
  });
  it('distinguishes newer memory-only progress from the last durable checkpoint and recovers when writes resume', async () => {
    const storage = storageFixture(), setItem = storage.setItem;
    const h = setup(failSecondPart(), storage);
    await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'session' });
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    let chunks = 0;
    h.deps.callText = vi.fn(async prompt => { if (++chunks === 2) throw new Error('Network disconnected'); return part(prompt); });
    await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 2, persistence: 'memory' });
    expect(h.recreate().getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'session' });
    storage.setItem = setItem;
    h.deps.callText = vi.fn(async prompt => part(prompt)); h.deps.updateResource = () => false;
    await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ stage: 'ready', persistence: 'session' });
    expect(h.recreate().getRecovery('p')).toMatchObject({ stage: 'ready', persistence: 'session' });
    expect(h.controller.discardRecovery('p')).toEqual({ ok: true });
    expect(h.controller.getRecovery('p')).toBeNull(); expect(h.recreate().getRecovery('p')).toBeNull();
  });
  it('keeps unchanged confirmed records durable when a different plan cannot be stored', async () => {
    const storage = storageFixture(), h = setup(failSecondPart(), storage);
    await h.controller.generate('p', settings());
    h.set(state => ({ ...state, history: [...state.history, { ...plan(), id: 'other-plan' }] }));
    storage.setItem = () => { throw new Error('QuotaExceededError'); };
    storage.getItem = () => { throw new Error('Storage disabled'); };
    h.deps.callText = failSecondPart();
    await h.controller.generate('other-plan', settings());
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'session' });
    expect(h.controller.getRecovery('other-plan')).toMatchObject({ completedChunks: 1, persistence: 'memory' });
  });
  it('keeps the aggregate storage envelope loadable when five records approach their individual limits', async () => {
    const h = setup(failSecondPart());
    await h.controller.generate('p', settings());
    const [key, raw] = [...h.storage.entries][0], entry = JSON.parse(raw)[0];
    const snapshot = core.captureInputs(plan(), entry.settings, [material]), chunks = core.scriptChunks(snapshot);
    const nextStep = core.normalizeScriptChunk({ step: step(chunks[1]) }, snapshot, entry.evidence, chunks[1], false).step;
    const addedLength = JSON.stringify([...entry.steps, nextStep]).length - JSON.stringify(entry.steps).length;
    const padded = (value, size) => {
      const result = { ...value, padding: '' };
      result.padding = 'P'.repeat(size - JSON.stringify(result).length);
      return result;
    };
    const otherEntries = [1, 2, 3, 4].map(index => padded({ ...entry, actor: 'teacher-' + index, updatedAt: entry.updatedAt - 1000 }, 300000));
    h.storage.setItem(key, JSON.stringify([padded(entry, 300000 - addedLength), ...otherEntries]));
    expect(h.storage.getItem(key).length).toBeLessThanOrEqual(1500000);
    let calls = 0;
    h.deps.callText = vi.fn(async prompt => { if (++calls === 2) throw new Error('Network disconnected'); return part(prompt); });
    const resumed = h.recreate();
    await resumed.generate('p', settings());
    const written = h.storage.getItem(key), stored = JSON.parse(written);
    expect(resumed.getRecovery('p')).toMatchObject({ completedChunks: 2, persistence: 'session' });
    expect(JSON.stringify(stored.find(value => value.actor === 'teacher')).length).toBe(300000);
    expect(written.length).toBeLessThanOrEqual(1500000); expect(stored).toHaveLength(4);
    expect(h.recreate().getRecovery('p')).toMatchObject({ completedChunks: 2, persistence: 'session' });
    const omitted = otherEntries.find(value => !stored.some(record => record.actor === value.actor));
    h.set(state => ({ ...state, actorKey: omitted.actor }));
    expect(resumed.getRecovery('p')).toMatchObject({ completedChunks: 1, persistence: 'memory' });
  });
  it('retries only the final atomic save when every chunk is already complete', async () => {
    const call = vi.fn(async prompt => prompt.includes('SMALLER RESPONSE MODE') ? part(prompt) : '{}');
    const h = setup(call), originalUpdate = h.deps.updateResource;
    h.deps.updateResource = () => false;
    expect((await h.controller.generate('p', settings())).ok).toBe(false);
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 3, totalChunks: 3, stage: 'ready' });
    call.mockClear(); h.deps.updateResource = originalUpdate;
    expect((await h.recreate().generate('p', settings())).ok).toBe(true);
    expect(call).not.toHaveBeenCalled(); expect(h.writes).toHaveLength(1);
  });
  it('preserves a completed whole response across reload and retries only its save, without a provider', async () => {
    const call = vi.fn(async () => whole(true)), collect = vi.fn(async () => evidence);
    const h = setup(call, storageFixture(), { research: { collect }, read: vi.fn() }), originalUpdate = h.deps.updateResource;
    h.deps.updateResource = () => false;
    const request = settings({ researchEnabled: true });
    expect((await h.controller.generate('p', request)).ok).toBe(false);
    expect(call).toHaveBeenCalledTimes(1); expect(collect).toHaveBeenCalledTimes(1); expect(h.writes).toHaveLength(0);
    const savedVersion = JSON.parse([...h.storage.entries.values()][0])[0].completeVersion;
    expect(savedVersion.id).toMatch(/^script-/); expect(savedVersion.createdAt).toBeTruthy();
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 3, totalChunks: 3, stage: 'ready' });
    h.controller.dispose(); h.deps.updateResource = originalUpdate; h.set(s => ({ ...s, canGenerate: false }));
    call.mockClear(); collect.mockClear();
    const resumed = h.recreate();
    expect(resumed.getRecovery('p', request)).toMatchObject({ stage: 'ready' }); expect(h.writes).toHaveLength(0);
    const result = await resumed.generate('p', request);
    expect(result.ok).toBe(true); expect(result.version).toEqual(savedVersion);
    expect(h.get().history[0].data.teachingScripts).toEqual([savedVersion]);
    expect(call).not.toHaveBeenCalled(); expect(collect).not.toHaveBeenCalled(); expect(h.writes).toHaveLength(1);
    expect(resumed.getRecovery('p')).toBeNull(); expect(h.storage.entries.size).toBe(0);
  });
  it('recognizes the exact saved version after a lost save acknowledgement without adding a duplicate', async () => {
    const call = vi.fn(async () => whole()), h = setup(call), originalUpdate = h.deps.updateResource;
    h.deps.updateResource = (id, update) => { originalUpdate(id, update); return false; };
    expect((await h.controller.generate('p', settings())).ok).toBe(false);
    const savedVersion = structuredClone(h.get().history[0].data.teachingScripts[0]);
    expect(h.controller.getRecovery('p')).toMatchObject({ stage: 'ready' });
    h.deps.updateResource = vi.fn(originalUpdate); call.mockClear();
    const result = await h.recreate().generate('p', settings());
    expect(result.ok).toBe(true); expect(result.version).toEqual(savedVersion);
    expect(call).not.toHaveBeenCalled(); expect(h.deps.updateResource).not.toHaveBeenCalled();
    expect(h.writes).toHaveLength(1); expect(h.get().history[0].data.teachingScripts).toEqual([savedVersion]);
    expect(h.storage.entries.size).toBe(0);
  });
  it.each(['partial', 'references', 'settings', 'fingerprint', 'research', 'identity', 'timestamp', 'extra'])('rejects %s corruption in a completed whole-script checkpoint', async kind => {
    const h = setup(vi.fn(async () => whole()), storageFixture(), { updateResource: () => false });
    await h.controller.generate('p', settings());
    const [key, raw] = [...h.storage.entries][0], entries = JSON.parse(raw), version = entries[0].completeVersion;
    if (kind === 'partial') version.steps.pop();
    if (kind === 'references') version.steps[0].resourceIds = ['invented'];
    if (kind === 'settings') version.inputSnapshot.settings.goal = 'Unrelated goal';
    if (kind === 'fingerprint') version.inputFingerprint = 'tampered';
    if (kind === 'research') version.sources = [{ id: 'invented', url: 'javascript:bad', title: 'Invalid' }];
    if (kind === 'identity') version.id = '';
    if (kind === 'timestamp') version.createdAt = 'invalid';
    if (kind === 'extra') version.hiddenOverride = true;
    h.storage.setItem(key, JSON.stringify(entries));
    expect(h.recreate().getRecovery('p')).toBeNull(); expect(h.storage.entries.size).toBe(0); expect(h.writes).toHaveLength(0);
  });
  it('retains completed-save recovery through temporary settings and actor changes, but rejects changed material content', async () => {
    const h = setup(vi.fn(async () => whole()), storageFixture(), { updateResource: () => false });
    await h.controller.generate('p', settings());
    expect(h.controller.getRecovery('p', settings({ researchEnabled: true }))).toBeNull();
    expect(h.controller.getRecovery('p', settings())).toMatchObject({ stage: 'ready' });
    h.set(s => ({ ...s, actorKey: 'another-teacher' })); expect(h.recreate().getRecovery('p')).toBeNull();
    h.set(s => ({ ...s, actorKey: 'teacher' })); expect(h.recreate().getRecovery('p')).toMatchObject({ stage: 'ready' });
    h.set(s => ({ ...s, history: [s.history[0], { ...material, data: 'Changed teaching content.' }] }));
    expect(h.recreate().getRecovery('p', settings({ goal: 'Different form setting' }))).toBeNull();
    expect(h.storage.entries.size).toBe(0); expect(h.writes).toHaveLength(0);
  });
  it('never records a part returned after the original material changed', async () => {
    const h = setup(vi.fn(async prompt => {
      if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
      h.set(s => ({ ...s, history: [s.history[0], { ...material, data: 'Changed material content' }] }));
      return part(prompt);
    }));
    const result = await h.controller.generate('p', settings());
    expect(result.ok).toBe(false); expect(result.error).toContain('changed during generation');
    expect(h.controller.getRecovery('p')).toBeNull(); expect(h.writes).toHaveLength(0);
  });
  it('keeps every valid large chunk in memory when its checkpoint exceeds the storage limit', async () => {
    let chunks = 0;
    const h = setup(vi.fn(async prompt => {
      if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
      if (++chunks === 5) throw new Error('Network disconnected');
      const parsed = JSON.parse(part(prompt));
      ['teacherSays', 'studentDoes', 'checkQuestion', 'possibleResponse', 'ifStruggling', 'ifReady'].forEach(field => { parsed.step[field] = 'A'.repeat(16000); });
      return JSON.stringify(parsed);
    }));
    const request = settings({ scope: 'lesson', durationMinutes: 240 });
    expect((await h.controller.generate('p', request)).ok).toBe(false);
    expect(h.controller.getRecovery('p')).toMatchObject({ completedChunks: 4, totalChunks: 8, persistence: 'memory' });
    // An older smaller checkpoint must not survive in persistent storage.
    expect(h.storage.entries.size).toBe(0);
    expect(h.recreate().getRecovery('p')).toBeNull();
    const call = vi.fn(async prompt => part(prompt)); h.deps.callText = call;
    expect((await h.controller.generate('p', request)).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(4); expect(h.writes).toHaveLength(1);
  });
});
