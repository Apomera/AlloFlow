import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let textHelpers, generation, math;
const response = () => JSON.stringify({ title: 'Practice', problems: [
  { id: 'p1', taskType: 'compute', question: '2 + 2', expression: '2 + 2', answer: '4', steps: [{ explanation: 'Add.', latex: '2 + 2 = 4' }] },
] });

beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  loadAlloModule('math_helpers_module.js');
  textHelpers = window.AlloModules.TextPipelineHelpers;
  generation = window.AlloModules.GenerationHelpers;
  math = window.AlloModules.MathHelpers;
});

function mathDeps(overrides = {}) {
  return {
    mathInput: 'addition', history: [], inputText: '', useMathSourceContext: false,
    studentInterests: [], gradeLevel: '5', mathMode: 'Problem Set Generator', mathSubject: 'Math',
    mathQuantity: 1, autoAttachManipulatives: false, leveledTextLanguage: 'Portuguese',
    translationMode: 'Spanish', currentUiLanguage: 'English', selectedLanguages: [],
    resolveTranslationPolicy: textHelpers.resolveTranslationPolicy,
    isMathGraphEnabled: false, autoSnapshotManipulatives: false,
    setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setGenerationStage: vi.fn(), setError: vi.fn(),
    setGeneratedContent: vi.fn(), setActiveView: vi.fn(), setShowMathAnswers: vi.fn(),
    setHistory: vi.fn(), setToolSnapshots: vi.fn(), addToast: vi.fn(), t: key => key,
    callGemini: vi.fn(async () => response()), cleanJson: value => value, safeJsonParse: JSON.parse,
    warnLog: vi.fn(), flyToElement: vi.fn(), ...overrides,
  };
}

async function editMath(config, overrides = {}) {
  let current = { id: 'saved-language-math-' + Math.random(), type: 'math', config, data: JSON.parse(response()) };
  let history = [current];
  const deps = mathDeps({
    generatedContent: current, history, setIsMathEditingChat: vi.fn(), setMathEditInput: vi.fn(),
    setGeneratedContent: next => { current = typeof next === 'function' ? next(current) : next; },
    setHistory: next => { history = typeof next === 'function' ? next(history) : next; },
    ...overrides,
  });
  await math.handleMathEdit('Use another example.', deps);
  expect(deps.callGemini).toHaveBeenCalledTimes(1);
  return { deps, current };
}

describe('translation selection agrees across generation entry points', () => {
  it('falls back to Automatic after a selected companion language is removed', async () => {
    const deps = mathDeps();
    await generation.handleGenerateMath(null, false, null, deps);
    expect(deps.callGemini.mock.calls[0][0]).toContain('include a English translation in parentheses.');
    expect(deps.callGemini.mock.calls[0][0]).not.toContain('include a Spanish translation');
    expect(deps.setGeneratedContent.mock.calls[0][0].config).toMatchObject({
      language: 'Portuguese', translationMode: 'auto', translationTarget: 'English',
    });
  });

  it.each(['Freeform Builder', 'Problem Set Generator', 'Solve Step-by-Step'])(
    'adds an app-language companion to English primary math in %s', async mathMode => {
      const deps = mathDeps({ mathMode, leveledTextLanguage: 'English', currentUiLanguage: 'Arabic', translationMode: 'auto' });
      await generation.handleGenerateMath(null, false, null, deps);
      expect(deps.callGemini.mock.calls[0][0]).toContain('include a Arabic translation in parentheses.');
      expect(deps.setGeneratedContent.mock.calls[0][0].config.translationTarget).toBe('Arabic');
    },
  );

  it('keeps English primary math single-language when companions are off', async () => {
    const deps = mathDeps({ leveledTextLanguage: 'English', currentUiLanguage: 'Arabic', translationMode: 'off' });
    await generation.handleGenerateMath(null, false, null, deps);
    expect(deps.callGemini.mock.calls[0][0]).toContain('Do NOT add a translation in parentheses or anywhere else.');
    expect(deps.setGeneratedContent.mock.calls[0][0].config.translationPolicy).toEqual({ enabled: false, target: '', mode: 'off' });
  });

  it('uses the same available-language choices for assessment section generation', async () => {
    const callGemini = vi.fn(async () => response());
    await generation.generateMathAssessment([{ id: 'a', type: 'computation', quantity: 1 }], {
      language: 'Portuguese', uiLanguage: 'English', translationMode: 'Spanish', selectedLanguages: [],
      resolveTranslationPolicy: textHelpers.resolveTranslationPolicy, callGemini, grade: '5',
    });
    expect(callGemini.mock.calls[0][0]).toContain('Include English translations in parentheses.');
    expect(callGemini.mock.calls[0][0]).not.toContain('Include Spanish translations');
  });

  it('uses the same available-language choices for persona dialogue', () => {
    const source = readFileSync('personas_source.jsx', 'utf8');
    const start = source.indexOf('    const personaTranslationPolicy =');
    const end = source.indexOf('    const resolvePersonaLanguage =', start);
    const liveRef = { current: {
      translationMode: 'Spanish', currentUiLanguage: 'English', selectedLanguages: [],
      resolveTranslationPolicy: textHelpers.resolveTranslationPolicy,
    } };
    const resolve = new Function('liveRef', source.slice(start, end) + '\nreturn personaTranslationPolicy;')(liveRef);
    expect(resolve('Portuguese')).toMatchObject({ target: 'English', mode: 'auto' });
    liveRef.current.selectedLanguages = ['Spanish'];
    expect(resolve('Portuguese')).toMatchObject({ target: 'Spanish', mode: 'Spanish' });
  });
});

describe('math revisions preserve saved language choices', () => {
  it('preserves a quiz companion removed from the current picker during complexity adjustment', async () => {
    const deps = mathDeps({ complexityLevel: 4, gradeLevel: 'Grade 5', currentUiLanguage: 'French', translationMode: 'off',
      generatedContent: { id: 'saved-quiz', type: 'quiz', config: { language: 'English', translationTarget: 'Spanish' },
        data: { questions: [{ question: 'Question?', question_en: '¿Pregunta?', options: ['A'], options_en: ['A'] }] } },
      callGemini: vi.fn(async () => JSON.stringify({ questions: [{ question: 'New?', question_en: '¿Nueva?', options: ['A'], options_en: ['A'] }] })),
      setComplexityLevel: vi.fn(), setWordSoundsCustomTerms: vi.fn(), setWsPreloadedWords: vi.fn(),
      getDefaultTitle: () => 'Quiz', extractSourceTextForProcessing: textHelpers.extractSourceTextForProcessing,
    });
    await generation.handleComplexityAdjustment(deps);
    expect(deps.callGemini.mock.calls[0][0]).toContain('Ensure the Spanish translations (suffix _en) match the new difficulty.');
  });
  it('preserves a saved companion that is no longer in the current picker', async () => {
    const { deps } = await editMath({ language: 'English', translationTarget: 'Hebrew' }, {
      currentUiLanguage: 'French', leveledTextLanguage: 'Portuguese', translationMode: 'off',
    });
    expect(deps.callGemini.mock.calls[0][0]).toContain('applications) in English.');
    expect(deps.callGemini.mock.calls[0][0]).toContain('include a Hebrew translation in parentheses.');
  });

  it('preserves saved single-language content after the app language changes', async () => {
    const { deps } = await editMath({ language: 'English', translationMode: 'auto', translationTarget: null }, {
      currentUiLanguage: 'French', translationMode: 'auto',
    });
    expect(deps.callGemini.mock.calls[0][0]).toContain('Do NOT add a translation in parentheses or anywhere else.');
    expect(deps.callGemini.mock.calls[0][0]).not.toContain('include a French translation');
  });

  it('validates available companion choices when a legacy resource has no saved policy', async () => {
    const { deps, current } = await editMath({});
    expect(deps.callGemini.mock.calls[0][0]).toContain('include a English translation in parentheses.');
    expect(deps.callGemini.mock.calls[0][0]).not.toContain('include a Spanish translation');
    expect(current.config).toMatchObject({ language: 'Portuguese', translationTarget: 'English' });
  });
});
