import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  window.React = globalThis.React = require(resolve('desktop/web-app/node_modules/react'));
  ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js',
    'lesson_teaching_script_host_module.js', 'host_handlers_module.js'].forEach(loadAlloModule);
}, 30000);

const plan = () => ({ id: 'plan', type: 'lesson-plan', title: 'Fractions lesson', data: {
  objectives: ['Explain one fourth'], directInstruction: 'Keep this saved teacher explanation.',
} });
const material = { id: 'source', type: 'analysis', data: { originalText: 'Fractions measure equal lengths between zero and one.' } };
const settings = { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions on a number line',
  scope: 'segment', durationMinutes: 15, goal: 'Represent fractions on a number line',
  materialIds: ['source'], researchEnabled: false, language: 'English' };
const response = JSON.stringify({ title: 'Representing fractions', scope: 'segment', durationMinutes: 15,
  steps: [1, 2, 3].map(index => ({ id: 's' + index, title: 'Model equal intervals', minutes: 5,
    teacherSays: 'Here is the whole interval from zero to one. I divide it into four equal lengths. Each length is one fourth of the whole. Explain how you can check that the parts are equal.',
    studentDoes: 'Draw and label equal intervals, then discuss with a partner.',
    checkQuestion: 'Why do all four lengths have to be equal?',
    possibleResponse: 'One possible response is that each part measures the same amount.',
    ifStruggling: 'Fold a strip into equal parts and compare the lengths.',
    ifReady: 'Explain where three fourths belongs on the same line.', resourceIds: ['source'], recommendationIds: [],
  })),
});

function host(initial = plan(), callText = vi.fn(async () => response)) {
  let state = { history: [initial, material], generatedContent: initial };
  const mutationRef = { current: state }, scriptStateRef = { current: null };
  const sync = () => {
    mutationRef.current = state;
    scriptStateRef.current = { ...state, isTeacherMode: true, isParentMode: false,
      isIndependentMode: false, canGenerate: true, actorKey: 'teacher', callText };
  };
  sync();
  let handlers;
  // An already-open shell delegates to this export. Re-entering the shim from
  // the restored handler would recurse, while removing the export throws.
  const oldShellShim = vi.fn((...args) => handlers.onUpdateResource(...args));
  const deps = {
    _resourceMutationStateRef: mutationRef, teachingScriptStateRef: scriptStateRef,
    teachingScriptControllerRef: { current: null }, onUpdateResource: oldShellShim,
    _alloArtifactMatchesInstanceId: (item, instanceId) => item.instanceId === instanceId,
    setHistory: updater => { state = { ...state, history: updater(state.history) }; sync(); },
    setGeneratedContent: updater => { state = { ...state, generatedContent: updater(state.generatedContent) }; sync(); },
    setTeachingScriptRuns: vi.fn(),
  };
  handlers = window.AlloModules.HostHandlers(deps);
  return { handlers, oldShellShim, callText, get: () => state,
    navigate: resource => { state = { ...state, history: [...state.history, resource], generatedContent: resource }; sync(); } };
}

describe('teaching-script saves through older app shells', () => {
  it('generates and saves through the actual exported host updater without recursive forwarding', async () => {
    const h = host();
    const result = await h.handlers.getTeachingScriptController().generate('plan', settings);
    expect(result.ok).toBe(true);
    expect(h.oldShellShim).toHaveBeenCalledTimes(1);
    const saved = h.get().history.find(item => item.id === 'plan');
    expect(saved.data.teachingScripts).toHaveLength(1);
    expect(saved.data.directInstruction).toBe(plan().data.directInstruction);
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(h.get().generatedContent).toEqual(saved);
  });

  it('saves to the captured plan after navigation while leaving the current resource alone', async () => {
    let complete;
    const h = host(plan(), vi.fn(() => new Promise(resolve => { complete = resolve; })));
    const pending = h.handlers.getTeachingScriptController().generate('plan', settings);
    const other = { id: 'other', type: 'lesson-plan', data: { directInstruction: 'Keep this other lesson.' } };
    h.navigate(other);
    complete(response);
    expect((await pending).ok).toBe(true);
    expect(h.get().history.find(item => item.id === 'plan').data.teachingScripts).toHaveLength(1);
    expect(h.get().generatedContent).toBe(other);
    expect(h.get().history.find(item => item.id === 'other')).toBe(other);
    expect(h.oldShellShim).toHaveBeenCalledTimes(1);
  });

  it('rejects missing, unchanged and wrong-instance saves, and retains saved identity', () => {
    const initial = { ...plan(), instanceId: 'copy-a' }, h = host(initial);
    expect(h.oldShellShim('missing', item => ({ ...item, title: 'Changed' }))).toBe(false);
    expect(h.oldShellShim('plan', item => item)).toBe(false);
    expect(h.oldShellShim('plan', item => ({ ...item, title: 'Changed' }), { instanceId: 'copy-b' })).toBe(false);
    expect(h.get().generatedContent).toBe(initial);
    expect(h.oldShellShim('plan', item => ({ ...item, id: 'wrong', type: 'quiz', title: 'Revised title' }), { instanceId: 'copy-a' })).toBe(true);
    expect(h.get().generatedContent).toMatchObject({ id: 'plan', type: 'lesson-plan', title: 'Revised title' });
    expect(h.get().history[0]).toEqual(h.get().generatedContent);
  });

  it('preserves the original reading in same-text-supported resources', () => {
    const initial = { id: 'reading', type: 'simplified', title: 'Original reading', data: 'Unchanged passage.',
      sourceSnapshot: { text: 'Unchanged passage.' }, instructionalText: { form: 'same-text-supported' } };
    const h = host(initial);
    expect(h.oldShellShim('reading', item => ({ ...item, data: 'Rewritten passage.' }))).toBe(false);
    expect(h.oldShellShim('reading', item => ({ ...item, sourceSnapshot: { text: 'Rewritten passage.' } }))).toBe(false);
    expect(h.get().generatedContent).toBe(initial);
    expect(h.oldShellShim('reading', item => ({ ...item, title: 'A clearer title' }))).toBe(true);
    expect(h.get().generatedContent).toMatchObject({ title: 'A clearer title', data: initial.data,
      sourceSnapshot: initial.sourceSnapshot, instructionalText: initial.instructionalText });
  });
});
