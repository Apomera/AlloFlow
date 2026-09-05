import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const source = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Missing teaching-script integration boundary.');
  return source.slice(from, to);
}
beforeAll(() => ['resource_content_fingerprint_module.js', 'lesson_teaching_script_module.js', 'lesson_teaching_script_host_module.js'].forEach(loadAlloModule));
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
    appId: 'app', selectedProfileId: 'teacher', user: { uid: 'user' }, ai,
    _isCanvasEnv: false, _aiConfig: { backend: 'gemini', apiKey: 'test-key' }, activeView: 'lesson-plan',
    leveledTextLanguage: 'English', targetStandards: [], WebSearchProvider: { search: vi.fn() },
    handleRestoreView: vi.fn(), onUpdateResource: (id, updater) => { const item = scope.history.find(entry => entry.id === id); const next = updater(item); if (next === item) return false; mutations.push(next); return true; },
    ...overrides,
  };
  const code = section('  // Script runs own a saved plan ID', '  const _sketchVisionBackend');
  const handlers = new Function(...Object.keys(scope), code + '\nreturn { onGenerateTeachingScript, onUpdateTeachingScript, onOpenTeachingMaterial, teachingScriptMaterials, teachingScriptDefaultSettings, teachingScriptCanGenerate, teachingScriptStateRef };')(...Object.values(scope));
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

  it('keeps material navigation inside the scoped teacher resources', () => {
    const h = actualHost({ history: [plan, material, { ...material, id: 'foreign' }] });
    h.handlers.onOpenTeachingMaterial('foreign');
    expect(h.scope.handleRestoreView).not.toHaveBeenCalled();
    h.handlers.onOpenTeachingMaterial('source');
    expect(h.scope.handleRestoreView).toHaveBeenCalledWith(material);
  });
});
