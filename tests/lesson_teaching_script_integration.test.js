import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
// Host files (ANTI, its mirror, App.jsx) come back with the code moved out of them (host_handlers_source.jsx,
// allo_command_context_source.js, CDN view sources) put back; every other file reads unchanged.
import { readFileSync } from './helpers/host_source.js';
import { loadAlloModule } from './setup.js';

const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Missing teaching-script integration boundary.');
  return source.slice(from, to);
}
beforeAll(() => ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'lesson_teaching_script_host_module.js'].forEach(loadAlloModule));
afterEach(() => { vi.restoreAllMocks(); sessionStorage.clear(); });
const plan = { id: 'plan', type: 'lesson-plan', sourceArtifactId: 'source', config: { gradeLevel: '4', leveledTextLanguage: 'English' }, data: { essentialQuestion: 'How can we represent fractions?', directInstruction: 'Preserve this original explanation.' } };
const material = { id: 'source', type: 'analysis', data: { originalText: 'Fractions measure equal lengths between zero and one.' } };
const settings = { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions on a number line', scope: 'segment', durationMinutes: 15, goal: 'Represent fractions on a number line', materialIds: ['source'], researchEnabled: false, language: 'English' };
const response = JSON.stringify({ title: 'Representing fractions', scope: 'segment', durationMinutes: 15, steps: [1,2,3].map(index => ({ id: 's' + index, title: 'Model equal intervals', minutes: 5, teacherSays: 'Here is the whole interval from zero to one. I divide it into four equal lengths. Each length is one fourth of the whole. Explain how you can check that the parts are equal.', studentDoes: 'Draw and label equal intervals, then discuss with a partner.', checkQuestion: 'Why do all four lengths have to be equal?', possibleResponse: 'One possible response is that each part measures the same amount.', ifStruggling: 'Fold a strip into equal parts and compare the lengths.', ifReady: 'Explain where three fourths belongs on the same line.', resourceIds: ['source'], recommendationIds: [] })) });

function actualHost(overrides = {}) {
  const effects = [], mutations = [];
  const ai = { generateText: vi.fn(async () => response) };
  const scope = {
    React: { useState: value => [value === 'loading' ? 'ready' : value, vi.fn()], useRef: value => ({ current: value }), useEffect: effect => effects.push(effect) },
    history: [plan, material], generatedContent: plan, isTeacherMode: true, isParentMode: false, isIndependentMode: false,
    appId: 'app', selectedProfileId: 'teacher', user: { uid: 'user' }, canvasRecoveryCurrentIdRef: { current: 'workspace-1' }, ai,
    _isCanvasEnv: false, _aiConfig: { backend: 'gemini', apiKey: 'test-key' }, activeView: 'lesson-plan',
    leveledTextLanguage: 'English', targetStandards: [], WebSearchProvider: { search: vi.fn() },
    handleRestoreView: vi.fn(), onUpdateResource: (id, updater) => { const item = scope.history.find(entry => entry.id === id); const next = updater(item); if (next === item) return false; mutations.push(next); return true; },
    ...overrides,
  };
  const code = section('  // Script runs own a saved plan ID', '  const _sketchVisionBackend');
  const handlers = new Function(...Object.keys(scope), code + '\nreturn { onGenerateTeachingScript, onUpdateTeachingScript, onOpenTeachingMaterial, onGetTeachingScriptRecovery, onDiscardTeachingScriptRecovery, onRegenerateTeachingStep, teachingScriptMaterials, teachingScriptDefaultSettings, teachingScriptCanGenerate, teachingScriptStateRef };')(...Object.values(scope));
  return { handlers, scope, effects, mutations, ai };
}

describe('actual teaching-script app integration', () => {
  it('loads required tools independently of optional research', async () => {
    const localWindow = { AlloModules: {}, __alloModuleRegistry: {}, __alloEnsureLazyModule: vi.fn(async () => ({})), __alloRetryModule: vi.fn() };
    const load = vi.fn();
    new Function('window', 'loadModule', section('    // Teaching-script research and editor load only', '    window.__alloEnsureDocPipeline ='))(localWindow, load);
    localWindow.__alloLazyLessonTeachingScript();
    expect(load.mock.calls.map(call => call[0])).not.toContain('LessonTeachingResearchModule');
    await localWindow.__alloEnsureLessonTeachingScript();
    expect(localWindow.__alloEnsureLazyModule.mock.calls.map(call => call[0])).not.toContain('LessonTeachingResearchModule');
    localWindow.__alloLazyLessonTeachingResearch();
    expect(load).toHaveBeenLastCalledWith('LessonTeachingResearchModule', expect.stringContaining('/lesson_teaching_research_module.js'));
    localWindow.__alloModuleRegistry.LessonTeachingResearchModule = { status: 'failed' };
    localWindow.__alloLazyLessonTeachingResearch();
    expect(localWindow.__alloRetryModule).toHaveBeenCalledWith('LessonTeachingResearchModule');
  });

  it('uses the configured text provider, captured materials, and existing resource updater', async () => {
    const h = actualHost();
    const result = await h.handlers.onGenerateTeachingScript(settings);
    expect(result.ok).toBe(true);
    expect(h.ai.generateText).toHaveBeenCalledWith(expect.stringContaining(material.data.originalText), expect.objectContaining({ json: true, search: false, signal: expect.any(AbortSignal) }));
    expect(h.mutations[0].data.directInstruction).toBe(plan.data.directInstruction);
    expect(h.mutations[0].data.teachingScripts).toHaveLength(1);
    expect(h.handlers.teachingScriptMaterials.map(item => item.id)).toEqual(['source']);
    expect(h.handlers.teachingScriptDefaultSettings).toMatchObject({ grade: '4th Grade', gradeSource: 'plan', language: 'English', standard: '', subject: 'mathematics', subjectDetected: true, materialCount: 1 });
    expect(h.handlers.teachingScriptDefaultSettings.gradeOptions).toContain('Pre-K');
  });

  it('blocks missing provider credentials and nonteacher generation before network use', async () => {
    for (const overrides of [{ _aiConfig: { backend: 'gemini', apiKey: '' } }, { isParentMode: true }, { isTeacherMode: false }]) {
      const h = actualHost(overrides);
      expect((await h.handlers.onGenerateTeachingScript(settings)).ok).toBe(false);
      expect(h.ai.generateText).not.toHaveBeenCalled();
      expect(h.mutations).toHaveLength(0);
    }
  });

  it('returns a regenerated step through the configured provider without overwriting the saved script', async () => {
    const h = actualHost();
    await h.handlers.onGenerateTeachingScript(settings);
    const saved = h.mutations[0], version = saved.data.teachingScripts[0];
    h.handlers.teachingScriptStateRef.current = { ...h.handlers.teachingScriptStateRef.current, history: [saved, material], generatedContent: saved };
    const replacement = { ...version.steps[1], teacherSays: 'Use our fraction strip to find one fourth. Fold the whole into four equal lengths, then place a mark at the end of the first length. Explain how that mark shows one fourth.' };
    h.ai.generateText.mockResolvedValueOnce(JSON.stringify({ step: replacement }));
    const result = await h.handlers.onRegenerateTeachingStep('plan', version.id, replacement.id, { steps: version.steps, expectedSteps: version.steps, instruction: 'Use a paper strip first.' });
    expect(result).toMatchObject({ ok: true, step: replacement });
    expect(h.ai.generateText).toHaveBeenLastCalledWith(expect.stringContaining('Use a paper strip first.'), expect.objectContaining({ json: true, signal: expect.any(AbortSignal) }));
    expect(h.mutations).toHaveLength(1);
    expect(saved.data.teachingScripts[0].steps[1].teacherSays).not.toBe(replacement.teacherSays);
    expect((await h.handlers.onRegenerateTeachingStep('other', version.id, replacement.id, {})).ok).toBe(false);
    expect(h.ai.generateText).toHaveBeenCalledTimes(2);
  });

  it('exposes recovered progress and discards it through the lesson callbacks', async () => {
    const h = actualHost();
    let chunkCalls = 0;
    h.ai.generateText.mockImplementation(async prompt => {
      if (!prompt.includes('SMALLER RESPONSE MODE')) return '{}';
      if (++chunkCalls > 1) throw new Error('Network disconnected');
      const marker = 'BEGIN UNTRUSTED PART CONTEXT JSON\n';
      const context = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length).split('\nEND UNTRUSTED PART CONTEXT JSON')[0]);
      return JSON.stringify({ step: { ...JSON.parse(response).steps[0], ...context.assignedPart } });
    });
    expect((await h.handlers.onGenerateTeachingScript(settings)).ok).toBe(false);
    expect(h.handlers.onGetTeachingScriptRecovery(settings)).toMatchObject({ completedChunks: 1, totalChunks: 3 });
    expect(h.handlers.onGetTeachingScriptRecovery({ ...settings, durationMinutes: 20 })).toBeNull();
    expect(h.handlers.onGetTeachingScriptRecovery(settings)).toMatchObject({ completedChunks: 1, totalChunks: 3 });
    expect(h.mutations).toHaveLength(0);
    expect(h.handlers.onDiscardTeachingScriptRecovery()).toMatchObject({ ok: true });
    expect(h.handlers.onGetTeachingScriptRecovery(settings)).toBeNull();
  });

  it('repairs unfinished wording in one draft step and preserves edits to the surrounding steps', async () => {
    const h = actualHost();
    await h.handlers.onGenerateTeachingScript(settings);
    const saved = h.mutations[0], version = saved.data.teachingScripts[0];
    h.scope.history = [saved, material];
    h.handlers.teachingScriptStateRef.current = { ...h.handlers.teachingScriptStateRef.current, history: h.scope.history, generatedContent: saved };
    const draft = structuredClone(version.steps);
    draft[0].teacherSays += ' Use the teacher-prepared paper strips for this demonstration.';
    draft[1].title = '';
    draft[1].teacherSays = 'Rewrite this example';
    const replacement = { ...version.steps[1], title: 'Compare equal lengths' };
    h.ai.generateText.mockResolvedValueOnce(JSON.stringify({ step: replacement }));
    const result = await h.handlers.onRegenerateTeachingStep('plan', version.id, draft[1].id, {
      steps: draft, expectedSteps: version.steps, instruction: 'Complete this unfinished explanation.'
    });
    expect(result).toMatchObject({ ok: true, step: replacement });
    expect(h.ai.generateText.mock.calls[1][0]).toContain('teacher-prepared paper strips');
    expect(h.mutations).toHaveLength(1);
    expect(draft[1].teacherSays).toBe('Rewrite this example');
    const repaired = draft.map((step, index) => index === 1 ? result.step : step);
    expect(h.handlers.onUpdateTeachingScript('plan', version.id, repaired, version.steps)).toEqual({ ok: true });
    expect(h.mutations).toHaveLength(2);
    expect(h.mutations[1].data.teachingScripts[0].steps[0].teacherSays).toBe(draft[0].teacherSays);
    expect(h.mutations[1].data.teachingScripts[0].steps[1]).toEqual(replacement);
    expect(h.mutations[1].data.teachingScripts[0].steps[2]).toEqual(version.steps[2]);
  });

  it.each(['throws', 'does nothing'])('keeps completed progress recoverable when browser deletion %s, then allows a confirmed retry', async mode => {
    const h = actualHost({ onUpdateResource: () => false });
    expect((await h.handlers.onGenerateTeachingScript(settings)).ok).toBe(false);
    const checkpoint = h.handlers.onGetTeachingScriptRecovery(settings);
    expect(checkpoint).toMatchObject({ stage: 'ready', persistence: 'session' });
    const remove = vi.spyOn(window.Storage.prototype, 'removeItem').mockImplementation(() => {
      if (mode === 'throws') throw new Error('Browser storage unavailable');
    });

    expect(h.handlers.onDiscardTeachingScriptRecovery()).toMatchObject({ ok: false, error: expect.stringContaining('progress is still available') });
    expect(h.handlers.onGetTeachingScriptRecovery(settings)).toEqual(checkpoint);
    expect(actualHost().handlers.onGetTeachingScriptRecovery(settings)).toEqual(checkpoint);
    expect(h.ai.generateText).toHaveBeenCalledTimes(1);
    expect(h.mutations).toHaveLength(0);

    remove.mockRestore();
    expect(h.handlers.onDiscardTeachingScriptRecovery()).toEqual({ ok: true });
    expect(h.handlers.onGetTeachingScriptRecovery(settings)).toBeNull();
    expect(actualHost().handlers.onGetTeachingScriptRecovery(settings)).toBeNull();
    expect(h.ai.generateText).toHaveBeenCalledTimes(1);
  });

  it('recovers a completed script after a failed save without another provider request', async () => {
    let completedPlan;
    const initial = actualHost({ onUpdateResource: (_id, update) => { completedPlan = update(plan); return false; } });
    expect((await initial.handlers.onGenerateTeachingScript(settings)).ok).toBe(false);
    expect(initial.ai.generateText).toHaveBeenCalledTimes(1);
    const ready = initial.handlers.onGetTeachingScriptRecovery(settings);
    expect(ready.completedChunks).toBe(ready.totalChunks);
    const restored = actualHost({ _aiConfig: { backend: 'gemini', apiKey: '' } });
    expect(restored.handlers.teachingScriptCanGenerate).toBe(false);
    const result = await restored.handlers.onGenerateTeachingScript(settings);
    expect(result).toMatchObject({ ok: true, version: completedPlan.data.teachingScripts[0] });
    expect(restored.ai.generateText).not.toHaveBeenCalled();
    expect(restored.mutations).toHaveLength(1);
    expect(restored.mutations[0].data.teachingScripts).toEqual(completedPlan.data.teachingScripts);
    expect(restored.handlers.onGetTeachingScriptRecovery(settings)).toBeNull();
  });

  it('isolates script ownership across teachers, profiles, and restored workspaces', async () => {
    const h = actualHost();
    const baseline = h.handlers.teachingScriptStateRef.current.actorKey;
    for (const overrides of [
      { appId: 'another-app' }, { user: { uid: 'another-teacher' } },
      { selectedProfileId: 'another-profile' }, { canvasRecoveryCurrentIdRef: { current: 'another-workspace' } }
    ]) expect(actualHost(overrides).handlers.teachingScriptStateRef.current.actorKey).not.toBe(baseline);
    expect(actualHost().handlers.teachingScriptStateRef.current.actorKey).toBe(baseline);
    let complete;
    h.ai.generateText.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    const pending = h.handlers.onGenerateTeachingScript(settings);
    h.handlers.teachingScriptStateRef.current = { ...h.handlers.teachingScriptStateRef.current, actorKey: actualHost({ canvasRecoveryCurrentIdRef: { current: 'another-workspace' } }).handlers.teachingScriptStateRef.current.actorKey };
    complete(response);
    expect((await pending).ok).toBe(false);
    expect(h.mutations).toHaveLength(0);
  });

  it('keeps material navigation inside the scoped teacher resources', () => {
    const h = actualHost({ history: [plan, material, { ...material, id: 'foreign' }] });
    h.handlers.onOpenTeachingMaterial('foreign');
    expect(h.scope.handleRestoreView).not.toHaveBeenCalled();
    h.handlers.onOpenTeachingMaterial('source');
    expect(h.scope.handleRestoreView).toHaveBeenCalledWith(material);
  });
});
