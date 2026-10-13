import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let core, host;
beforeAll(() => {
  ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'lesson_teaching_script_host_module.js'].forEach(loadAlloModule);
  core = window.AlloModules.LessonTeachingScript;
  host = window.AlloModules.LessonTeachingScriptHost;
});
const plan = () => ({ id: 'plan', type: 'lesson-plan', title: 'Fractions lesson', data: { objectives: ['Compare equal parts'], hook: 'Show a fraction strip', directInstruction: 'Model equal intervals', guidedPractice: 'Compare strips together', independentPractice: 'Draw a fraction', closure: 'Explain the model' } });
const material = { id: 'material', type: 'simplified', data: 'Four equal intervals divide a whole into fourths.' };
const settings = (extra = {}) => ({ grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', scope: 'segment', durationMinutes: 15, goal: 'Compare equal parts', language: 'English', researchEnabled: false, materialIds: ['material'], ...extra });
const evidence = { status: 'disabled', sources: [] };
const step = (extra = {}) => ({ id: 'step-1', phase: 'directInstruction', minutes: 5, title: 'Compare equal parts', teacherSays: 'Here is one whole strip. I divide it into four equal intervals. Each interval measures one fourth of the same whole. Explain how the equal lengths help us compare.', studentDoes: 'Learners compare strips with a partner and wait for their turn.', checkQuestion: 'How can we check whether the parts are equal?', possibleResponse: 'One possible response is to compare their lengths.', ifStruggling: 'A possible difficulty is counting marks; count each interval together.', ifReady: 'Explain why two fourths also represents one half of the strip.', resourceIds: ['material'], recommendationIds: [], ...extra });
const full = () => ({ title: 'Compare fractions', scope: 'segment', durationMinutes: 15, steps: [1, 2, 3].map(i => step({ id: 'step-' + i })) });
const snapshot = (extra = {}) => core.captureInputs(plan(), settings(extra), [material]);
function setup(callText) {
  let state = { history: [plan(), material], isTeacherMode: true, canGenerate: true, actorKey: 'teacher' };
  const writes = [], statuses = [];
  const controller = host.createController({ core, callText, getState: () => state, onStatus: status => statuses.push(status), updateResource: (id, update) => {
    const old = state.history[0], next = update(old);
    if (old === next) return false;
    writes.push(next); state = { ...state, history: [next, material] }; return true;
  } });
  return { controller, writes, statuses, set: update => { state = update(state); } };
}
function chunkResponse(prompt, extra = {}) {
  const marker = 'BEGIN UNTRUSTED PART CONTEXT JSON\n';
  const data = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length).split('\nEND UNTRUSTED PART CONTEXT JSON')[0]);
  return JSON.stringify({ step: step({ ...data.assignedPart, ...extra }) });
}

describe('teaching-script JSON healing', () => {
  it('accepts complete fenced/prose JSON and harmless syntax repairs without changing spoken punctuation', () => {
    const data = full(); data.steps[0].teacherSays += ' Notice the symbols ",}" and the words // wait.';
    const raw = 'Here is the script:\n```json\n' + JSON.stringify(data).replace('"steps":', '/* steps */ "steps":').replace(/}$/, ',}') + '\n```';
    const normalized = core.normalizeScript(raw, snapshot(), evidence);
    expect(normalized.ok).toBe(true);
    expect(normalized.version.steps[0].teacherSays).toBe(data.steps[0].teacherSays);
  });
  it('never closes truncated strings or structures to accept missing teaching content', () => {
    const raw = JSON.stringify(full());
    expect(core.parseRaw(raw.slice(0, -2))).toBeNull();
    expect(core.parseRaw('{"title":"This is incomplete')).toBeNull();
    expect(core.parseRaw('[{"title":"array"}]')).toBeNull();
  });
  it('retains semantic/reference validation after syntax repair', () => {
    const data = full(); data.steps[0].resourceIds = ['invented'];
    const result = core.normalizeScript(JSON.stringify(data).replace(/}$/, ',}'), snapshot(), evidence);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('unknown resourceIds');
  });
  it('budgets bounded chunks across all saved phases and the exact duration', () => {
    for (const durationMinutes of [15, 37, 240]) {
      const captured = snapshot({ scope: 'lesson', durationMinutes });
      const chunks = core.scriptChunks(captured);
      expect(chunks.length).toBeGreaterThanOrEqual(5);
      expect(chunks.length).toBeLessThanOrEqual(8);
      expect(chunks.reduce((sum, chunk) => sum + chunk.minutes, 0)).toBe(durationMinutes);
      expect(new Set(chunks.map(chunk => chunk.phase))).toEqual(new Set(core.PHASES));
      expect(chunks.every(chunk => chunk.minutes > 0 && chunk.minutes <= 60)).toBe(true);
    }
  });
});

describe('bounded teaching-script generation recovery', () => {
  it('heals formatting on the first response without another AI request', async () => {
    const call = vi.fn(async () => JSON.stringify(full()).replace(/}$/, ',}')), h = setup(call);
    expect((await h.controller.generate('plan', settings())).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(1); expect(h.writes).toHaveLength(1);
  });
  it('sends the original draft and failed checks for one targeted repair', async () => {
    const damaged = '{"title":"Compare fractions","steps":[';
    const call = vi.fn().mockResolvedValueOnce(damaged).mockResolvedValueOnce(JSON.stringify(full())), h = setup(call);
    expect((await h.controller.generate('plan', settings())).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[1][0]).toContain(JSON.stringify({ draft: damaged, truncatedForRepair: false }));
    expect(call.mock.calls[1][0]).toContain('not valid JSON');
    expect(h.writes).toHaveLength(1);
  });
  it('assembles whole lessons in phase order after two incomplete responses and writes only once', async () => {
    const call = vi.fn(async prompt => prompt.includes('SMALLER RESPONSE MODE') ? chunkResponse(prompt) : '{"steps":['), h = setup(call);
    const result = await h.controller.generate('plan', settings({ scope: 'lesson', durationMinutes: 37 }));
    expect(result.ok).toBe(true); expect(call).toHaveBeenCalledTimes(7);
    expect(h.writes).toHaveLength(1);
    expect(result.version.steps.map(s => s.phase)).toEqual(core.PHASES);
    expect(result.version.steps.reduce((sum, s) => sum + s.minutes, 0)).toBe(37);
    expect(h.statuses.some(s => s.stage === 'chunking' && s.totalChunks === 5)).toBe(true);
  });
  it('repairs just a failed part and retains earlier successful parts', async () => {
    let partAttempts = 0;
    const call = vi.fn(async prompt => {
      if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
      partAttempts++;
      return partAttempts === 2 ? '{"step":' : chunkResponse(prompt);
    }), h = setup(call);
    expect((await h.controller.generate('plan', settings())).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(6);
    expect(call.mock.calls[4][0]).toContain('part 2 of 3');
    expect(h.writes[0].data.teachingScripts[0].steps).toHaveLength(3);
  });
  it.each(['AI', 'PE', '诗'])('saves completed chunks for the short topic %s using the valid plan title', async topic => {
    const call = vi.fn(async prompt => prompt.includes('SMALLER RESPONSE MODE') ? chunkResponse(prompt) : '{}'), h = setup(call);
    const result = await h.controller.generate('plan', settings({ topic }));
    expect(result.ok).toBe(true); expect(result.version.title).toBe('Fractions lesson');
    expect(result.version.inputSnapshot.settings.topic).toBe(topic);
    expect(call).toHaveBeenCalledTimes(5); expect(h.writes).toHaveLength(1);
  });
  it.each([
    ['  Recovered script  ', 'AI', 'AI', 'Recovered script'],
    ['', 'A specific topic', 'AI', 'A specific topic'],
    ['AI', 'AI', 'AI', 'Teaching script'],
    ['x'.repeat(501), 'AI', 'AI', 'x'.repeat(500)]
  ])('chooses a valid bounded title when assembling completed chunks (%#)', async (draftTitle, topic, planTitle, expectedTitle) => {
    const call = vi.fn(async prompt => prompt.includes('SMALLER RESPONSE MODE') ? chunkResponse(prompt) : JSON.stringify({ title: draftTitle })), h = setup(call);
    h.set(state => ({ ...state, history: state.history.map(item => item.id === 'plan' ? { ...item, title: planTitle } : item) }));
    const result = await h.controller.generate('plan', settings({ topic }));
    expect(result.ok).toBe(true); expect(result.version.title).toBe(expectedTitle);
    expect(h.writes).toHaveLength(1);
  });
  it('stops at an unrecoverable part without saving previously completed parts', async () => {
    let parts = 0;
    const call = vi.fn(async prompt => prompt.includes('SMALLER RESPONSE MODE') && ++parts === 1 ? chunkResponse(prompt) : '{}'), h = setup(call);
    const result = await h.controller.generate('plan', settings());
    expect(result.ok).toBe(false); expect(result.error).toContain('part 2 of 3');
    expect(call).toHaveBeenCalledTimes(5); expect(h.writes).toHaveLength(0);
  });
  it('cancels a pending chunk even when the provider ignores the signal', async () => {
    let release, started;
    const pending = new Promise(resolve => { started = resolve; });
    const call = vi.fn(async prompt => {
      if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
      started(); return new Promise(resolve => { release = () => resolve(chunkResponse(prompt)); });
    }), h = setup(call);
    const result = h.controller.generate('plan', settings()); await pending;
    h.controller.cancel('plan'); expect((await result).ok).toBe(false); release();
    await Promise.resolve(); expect(h.writes).toHaveLength(0); expect(call).toHaveBeenCalledTimes(3);
  });
  it('rejects plan edits while recovering and never overwrites the updated lesson', async () => {
    const call = vi.fn(async prompt => {
      if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
      h.set(state => ({ ...state, history: [{ ...state.history[0], data: { ...state.history[0].data, hook: 'New teacher wording' } }, material] }));
      return chunkResponse(prompt);
    }), h = setup(call);
    const result = await h.controller.generate('plan', settings());
    expect(result.ok).toBe(false); expect(result.error).toContain('changed during generation'); expect(h.writes).toHaveLength(0); expect(call).toHaveBeenCalledTimes(3);
  });
  it('recovers provider JSON errors while preserving access and cancellation failures', async () => {
    const recover = vi.fn().mockRejectedValueOnce(new SyntaxError('Unexpected end of JSON input')).mockResolvedValueOnce(JSON.stringify(full())), h = setup(recover);
    expect((await h.controller.generate('plan', settings())).ok).toBe(true);
    for (const error of [new Error('401 invalid API key'), Object.assign(new Error('Stopped'), { name: 'AbortError' }), new Error('Network disconnected')]) {
      const call = vi.fn().mockRejectedValue(error), failed = setup(call);
      expect((await failed.controller.generate('plan', settings())).ok).toBe(false);
      expect(call).toHaveBeenCalledTimes(1); expect(failed.writes).toHaveLength(0);
    }
  });
});
