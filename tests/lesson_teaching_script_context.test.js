import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const core = require('../lesson_teaching_script_module.js');
const host = require('../lesson_teaching_script_host_module.js');
const settings = { grade: '4th Grade', subject: 'other', topic: '', goal: 'Explain energy transfer', scope: 'segment', durationMinutes: 15, language: 'English', researchEnabled: false, materialIds: ['m'], inferContext: { subject: true, topic: true } };
function setup(callText, overrides = {}) {
  let state = { isTeacherMode: true, canGenerate: true, actorKey: 'teacher', history: [
    { id: 'p', type: 'lesson-plan', title: 'Lesson plan', data: { objectives: ['Explain energy transfer in food webs'], directInstruction: 'Trace energy from sunlight through plants and animals.' } },
    { id: 'm', type: 'source', title: 'Food webs', data: 'Plants store energy from sunlight; animals obtain energy by eating.' },
  ] };
  const writes = [], statuses = [];
  const deps = { core, getState: () => state, callText, onStatus: value => statuses.push(value), updateResource: (id, update) => { const item = state.history.find(item => item.id === id); const next = update(item); if (item === next) return false; state = { ...state, history: state.history.map(item => item.id === id ? next : item) }; writes.push(next); return true; }, ...overrides };
  return { controller: host.createController(deps), writes, statuses, change: fn => { state = fn(state); } };
}
const script = () => JSON.stringify({ title: 'Tracing energy in food webs', scope: 'segment', durationMinutes: 15, steps: [1, 2, 3].map(index => ({ id: 'step-' + index, title: 'Trace energy ' + index, minutes: 5, teacherSays: 'Start with sunlight and follow the arrows to a plant, then to an animal. Each arrow helps us explain where the energy came from and how it moves between living things.', studentDoes: 'Learners draw arrows and explain their model to a partner.', checkQuestion: 'How does the animal obtain energy from this food web?', possibleResponse: 'The animal obtains energy by eating a plant or another animal.', ifStruggling: 'Trace one arrow at a time from sunlight to a plant together.', ifReady: 'Explain how energy can travel through a different pathway.', resourceIds: ['m'], recommendationIds: [] })) });
describe('AI teaching-script context', () => {
  it('infers subject and topic before script generation and saves the resolved settings', async () => {
    const call = vi.fn().mockResolvedValueOnce('{"subject":"science","topic":"Energy flow in food webs"}').mockResolvedValueOnce(script()), h = setup(call);
    expect((await h.controller.generate('p', settings)).ok).toBe(true);
    expect(call.mock.calls[0][0]).toContain('UNTRUSTED INPUT DATA');
    expect(call.mock.calls[0][0]).toContain('Trace energy from sunlight');
    expect(call.mock.calls[1][0]).toContain('Subject: Science. Topic: Energy flow in food webs');
    expect(h.writes[0].data.teachingScripts[0].inputSnapshot.settings).toMatchObject({ subject: 'science', topic: 'Energy flow in food webs' });
  });
  it('preserves a teacher subject while inferring only the topic', async () => {
    const call = vi.fn().mockResolvedValueOnce('{"subject":"arts","topic":"Energy pathways"}').mockResolvedValueOnce(script()), h = setup(call);
    expect((await h.controller.generate('p', { ...settings, subject: 'science', inferContext: { subject: false, topic: true } })).ok).toBe(true);
    expect(h.writes[0].data.teachingScripts[0].inputSnapshot.settings).toMatchObject({ subject: 'science', topic: 'Energy pathways' });
    expect(call.mock.calls[0][0]).toContain('"teacherSubject":"science"');
  });
  it('matches research against inferred context before requesting a script', async () => {
    const call = vi.fn().mockResolvedValue('{"subject":"science","topic":"Food webs"}'), collect = vi.fn().mockResolvedValue({ status: 'unavailable', sources: [], warnings: [] });
    const h = setup(call, { research: { collect }, read: vi.fn() });
    expect((await h.controller.generate('p', { ...settings, researchEnabled: true })).ok).toBe(false);
    expect(collect.mock.calls[0][0]).toMatchObject({ subject: 'science', topic: 'Food webs' });
    expect(call).toHaveBeenCalledTimes(1); expect(h.writes).toEqual([]);
  });
  it('repairs invalid context once and never writes unresolved context', async () => {
    const call = vi.fn().mockResolvedValueOnce('{"subject":"biology","topic":"Food webs"}').mockResolvedValueOnce('{"subject":"science","topic":"Food webs"}').mockResolvedValueOnce(script()), h = setup(call);
    expect((await h.controller.generate('p', settings)).ok).toBe(true);
    expect(call.mock.calls[1][0]).toContain('Correct these validation errors');
    const badCall = vi.fn().mockResolvedValue('{}'), bad = setup(badCall), result = await bad.controller.generate('p', settings);
    expect(result.ok).toBe(false); expect(result.error).toContain('choose the subject and enter the topic yourself'); expect(badCall).toHaveBeenCalledTimes(2); expect(bad.writes).toEqual([]);
  });
  it('keeps existing explicit callers on one script-generation call', async () => {
    const call = vi.fn().mockResolvedValue(script()), h = setup(call);
    expect((await h.controller.generate('p', { ...settings, subject: 'science', topic: 'Food webs', inferContext: undefined })).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('retries provider JSON parsing failures during context inference once', async () => {
    const call = vi.fn().mockRejectedValueOnce(new SyntaxError('Unexpected end of JSON input')).mockResolvedValueOnce('{"subject":"science","topic":"Food webs"}').mockResolvedValueOnce(script()), h = setup(call);
    expect((await h.controller.generate('p', settings)).ok).toBe(true);
    expect(call).toHaveBeenCalledTimes(3); expect(call.mock.calls[1][0]).toContain('Correct these validation errors');
    expect(h.writes[0].data.teachingScripts[0].inputSnapshot.settings.subject).toBe('science');
  });
  it('bounds repeated provider JSON failures before requesting the script', async () => {
    const call = vi.fn().mockRejectedValue(Object.assign(new Error('Could not parse JSON'), { code: 'JSON_PARSE_ERROR' })), h = setup(call);
    const result = await h.controller.generate('p', settings);
    expect(result.ok).toBe(false); expect(result.error).toContain('choose the subject and enter the topic yourself');
    expect(call).toHaveBeenCalledTimes(2); expect(h.writes).toEqual([]);
  });
  it('does not retry authentication, network or abort failures during context inference', async () => {
    for (const error of [Object.assign(new SyntaxError('Invalid JSON from unauthorized provider'), { status: 401 }), new Error('Network disconnected'), Object.assign(new Error('Stopped'), { name: 'AbortError' })]) {
      const call = vi.fn().mockRejectedValue(error), h = setup(call);
      const result = await h.controller.generate('p', settings);
      expect(result.ok).toBe(false); expect(call).toHaveBeenCalledTimes(1); expect(h.writes).toEqual([]);
      if (error.name !== 'AbortError') expect(result.error).toBe(error.message);
    }
  });
  it.each(['captureInputs', 'validateInputs', 'buildScriptPrompt', 'normalizeScript', 'buildScriptRepairPrompt', 'scriptChunks', 'buildScriptChunkPrompt', 'normalizeScriptChunk', 'parseRaw', 'appendVersion', 'buildContextPrompt', 'normalizeContext'])('rejects a cached core missing %s before any provider call', async missing => {
    const call = vi.fn(), oldCore = { ...core, [missing]: undefined }, h = setup(call, { core: oldCore });
    const result = await h.controller.generate('p', settings);
    expect(result.ok).toBe(false); expect(result.error).toContain('Reload the app'); expect(result.error).not.toContain('not a function');
    expect(call).not.toHaveBeenCalled(); expect(h.writes).toEqual([]);
  });
  it('checks new repair capabilities even when both context fields are teacher selected', async () => {
    const call = vi.fn(), h = setup(call, { core: { ...core, buildScriptRepairPrompt: undefined } });
    const result = await h.controller.generate('p', { ...settings, subject: 'science', topic: 'Food webs', inferContext: undefined });
    expect(result.error).toContain('Reload the app'); expect(call).not.toHaveBeenCalled(); expect(h.writes).toEqual([]);
  });
  it('drops inferred context when cancelled or the saved lesson changes', async () => {
    for (const cancel of [true, false]) {
      let resolve; const pending = new Promise(done => { resolve = done; });
      const call = vi.fn(() => pending), h = setup(call), run = h.controller.generate('p', settings);
      if (cancel) h.controller.cancel('p');
      else h.change(state => ({ ...state, history: state.history.map(item => item.id === 'p' ? { ...item, data: { ...item.data, directInstruction: 'A revised teacher lesson' } } : item) }));
      resolve('{"subject":"science","topic":"Food webs"}');
      expect((await run).ok).toBe(false); expect(call).toHaveBeenCalledTimes(1); expect(h.writes).toEqual([]);
    }
  });
  it('validates only inferred fields without changing teacher choices', () => {
    expect(core.normalizeContext({ subject: 'wrong', topic: '  Food webs  ' }, { topic: true })).toEqual({ ok: true, context: { topic: 'Food webs' }, errors: [] });
    expect(core.normalizeContext({ subject: 'science', topic: 'x'.repeat(201) }, { subject: true, topic: true }).ok).toBe(false);
  });
});
