import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let Context;

const extractFunction = (path, startMarker, endMarker, name) => {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error(`Unable to extract ${name} from ${path}`);
  // eslint-disable-next-line no-new-func
  return new Function(`${source.slice(start, end)}\nreturn ${name};`)();
};

const makeCheckLevel = () => extractFunction(
  'phase_n_misc_helpers_source.jsx',
  'const handleCheckLevel = async (deps) => {',
  '\nwindow.AlloModules = window.AlloModules || {};',
  'handleCheckLevel',
);

const makeComplexityAdjustment = () => extractFunction(
  'generation_helpers_source.jsx',
  'const handleComplexityAdjustment = async (deps) => {',
  '\nconst handlePlanFullPack = async',
  'handleComplexityAdjustment',
);

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  Context = window.AlloModules.InstructionalContext;
  if (!Context) throw new Error('InstructionalContext failed to register');
});

const profile = ({ grade = '5th Grade', language = 'English', role = 'supplemental', sourceArtifactId = 'source-1' } = {}) => (
  Context.normalizeInstructionalText({
    role,
    form: role === 'primary' ? 'original' : 'adapted',
    designationSource: 'workflow-default',
    sourceArtifactId,
    complexity: { requestedGrade: grade, language },
  })
);

describe('artifact-owned Check Level context', () => {
  it('uses the artifact snapshot and withholds English FK for non-English text', async () => {
    const generatedContent = {
      id: 'spanish-reading',
      type: 'simplified',
      data: 'Las plantas usan la luz para producir alimento.',
      localStats: { score: '2.0' },
      instructionalText: profile({ grade: '5th Grade', language: 'Spanish' }),
      config: {
        grade: '5th Grade',
        language: 'Spanish',
        standardsContext: { promptText: 'ARTIFACT STANDARD: explain how matter moves through plants.' },
      },
    };
    const prompts = [];
    const callGemini = vi.fn(async (prompt) => {
      prompts.push(prompt);
      return prompts.length === 1
        ? JSON.stringify({ estimatedLevel: '5th Grade', alignment: 'Aligned', feedback: 'Clear.' })
        : JSON.stringify({
          confirmedLevel: '5th Grade',
          rubric: {
            vocabulary: { score: 0, reason: 'Aligned.' },
            sentenceStructure: { score: 0, reason: 'Aligned.' },
            conceptDensity: { score: 0, reason: 'Aligned.' },
          },
          nuanceSummary: 'Aligned.',
        });
    });
    const calculateReadability = vi.fn(() => ({ score: '1.0' }));
    const setGeneratedContent = vi.fn();

    await makeCheckLevel()({
      generatedContent,
      gradeLevel: '2nd Grade',
      leveledTextLanguage: 'English',
      standardsInput: 'AMBIENT STANDARD',
      targetStandards: ['AMBIENT STANDARD'],
      callGemini,
      cleanJson: value => value,
      calculateReadability,
      setGeneratedContent,
      setHistory: vi.fn(),
      setIsCheckingLevel: vi.fn(),
      setError: vi.fn(),
      addToast: vi.fn(),
      t: key => key,
      warnLog: vi.fn(),
      alloBotRef: { current: null },
    });

    expect(prompts[0]).toContain('Target Level: 5th Grade');
    expect(prompts[0]).toContain('Text Language: Spanish');
    expect(prompts[0]).toContain('ARTIFACT STANDARD');
    expect(prompts[0]).not.toContain('AMBIENT STANDARD');
    expect(calculateReadability).not.toHaveBeenCalled();
    const saved = setGeneratedContent.mock.calls[0][0];
    expect(saved.localStats).toBeUndefined();
    expect(saved.levelCheck.measurementStatus).toBe('not-evaluated');
    expect(saved.levelCheck.contentFingerprint).toBe(Context.fingerprintText(generatedContent.data));
    expect(saved.instructionalText).toMatchObject({
      role: 'supplemental',
      sourceArtifactId: 'source-1',
      complexity: {
        requestedGrade: '5th Grade',
        language: 'Spanish',
        measuredGrade: null,
        status: 'not-applicable',
      },
    });
  });

  it('refreshes English FK evidence against the artifact target', async () => {
    const generatedContent = {
      id: 'english-reading',
      type: 'simplified',
      data: 'Plants capture light energy. They use that energy to build sugars.',
      instructionalText: profile({ grade: '8th Grade', language: 'English' }),
      config: { grade: '8th Grade', language: 'English' },
    };
    const callGemini = vi.fn()
      .mockResolvedValueOnce(JSON.stringify({ estimatedLevel: '7th-8th Grade', alignment: 'Aligned', feedback: 'Clear.' }))
      .mockResolvedValueOnce(JSON.stringify({ confirmedLevel: '8th Grade', rubric: {}, nuanceSummary: 'Aligned.' }));
    const stats = { score: '7.6', words: 11, sentences: 2, syllables: 14 };
    const setGeneratedContent = vi.fn();

    await makeCheckLevel()({
      generatedContent,
      gradeLevel: '3rd Grade',
      leveledTextLanguage: 'Spanish',
      callGemini,
      cleanJson: value => value,
      calculateReadability: vi.fn(() => stats),
      setGeneratedContent,
      setHistory: vi.fn(),
      setIsCheckingLevel: vi.fn(),
      setError: vi.fn(),
      addToast: vi.fn(),
      t: key => key,
      warnLog: vi.fn(),
      alloBotRef: { current: null },
    });

    const saved = setGeneratedContent.mock.calls[0][0];
    expect(saved.localStats).toEqual(stats);
    expect(saved.targetGradeLevel).toBe('8th Grade');
    expect(saved.instructionalText.complexity).toMatchObject({
      requestedGrade: '8th Grade',
      measuredGrade: 7.6,
      method: 'flesch-kincaid-en',
      status: 'below-target',
      contentFingerprint: Context.fingerprintText(generatedContent.data),
    });
  });
});

const complexityHarness = ({ language = 'English', original, candidate }) => {
  const generatedContent = {
    id: 'adapted-1',
    type: 'simplified',
    title: 'Adapted Text',
    data: original,
    localStats: { score: '2.1' },
    levelCheck: { contentFingerprint: 'old' },
    alignmentCheck: { contentFingerprint: 'old' },
    instructionalText: profile({ grade: '5th Grade', language }),
    config: {
      grade: '5th Grade',
      language,
      standardsContext: { promptText: 'ARTIFACT STANDARD: explain energy transfer.' },
    },
  };
  const setGeneratedContent = vi.fn();
  const calculateReadability = vi.fn(() => ({ score: '5.4', words: 20, sentences: 2, syllables: 27 }));
  const extractSourceTextForProcessing = value => {
    const text = String(value || '');
    const isBilingual = text.includes('--- ENGLISH TRANSLATION ---');
    const pieces = text.split('--- ENGLISH TRANSLATION ---');
    return {
      text: pieces[0].trim(),
      targetLangBlock: pieces[0].trim(),
      englishBlock: isBilingual ? pieces.slice(1).join('--- ENGLISH TRANSLATION ---').trim() : '',
      isBilingual,
    };
  };
  const generateBilingualText = vi.fn(async () => candidate);
  const resolveTranslationPolicy = vi.fn(() => ({ enabled: false, target: 'English', mode: 'off' }));
  return {
    generatedContent,
    setGeneratedContent,
    calculateReadability,
    generateBilingualText,
    resolveTranslationPolicy,
    deps: {
      complexityLevel: 4,
      generatedContent,
      gradeLevel: '2nd Grade',
      leveledTextLanguage: 'Spanish',
      standardsInput: 'AMBIENT STANDARD',
      targetStandards: ['AMBIENT STANDARD'],
      translationMode: 'off',
      resolveTranslationPolicy,
      currentUiLanguage: 'English',
      saveOriginalOnAdjust: false,
      generatedTerms: [],
      setIsProcessing: vi.fn(),
      setGeneratedContent,
      setHistory: vi.fn(),
      setError: vi.fn(),
      setComplexityLevel: vi.fn(),
      setWordSoundsCustomTerms: vi.fn(),
      setWsPreloadedWords: vi.fn(),
      callGemini: vi.fn(),
      cleanJson: value => value,
      addToast: vi.fn(),
      t: key => key,
      warnLog: vi.fn(),
      extractSourceTextForProcessing,
      generateBilingualText,
      getDefaultTitle: () => 'Adapted Text',
      calculateReadability,
    },
  };
};

describe('complexity adjustment freshness', () => {
  it('rewrites with the artifact context and replaces stale English evidence', async () => {
    const h = complexityHarness({
      original: 'Plants use sunlight to make food.',
      candidate: 'Plants capture sunlight. They use its energy to build sugar molecules.',
    });

    await makeComplexityAdjustment()(h.deps);

    const prompt = h.generateBilingualText.mock.calls[0][0];
    expect(prompt).toContain('Target Audience: 5th Grade students');
    expect(prompt).toContain('Write the rewritten text in English');
    expect(prompt).toContain('ARTIFACT STANDARD');
    expect(prompt).not.toContain('AMBIENT STANDARD');
    expect(h.resolveTranslationPolicy).toHaveBeenCalledWith('off', 'English', 'English');
    const saved = h.setGeneratedContent.mock.calls[0][0];
    expect(saved.levelCheck).toBeUndefined();
    expect(saved.alignmentCheck).toBeUndefined();
    expect(saved.localStats.score).toBe('5.4');
    expect(saved.instructionalText).toMatchObject({
      role: 'supplemental',
      sourceArtifactId: 'source-1',
      complexity: {
        requestedGrade: '5th Grade',
        measuredGrade: 5.4,
        status: 'within-target',
        contentFingerprint: Context.fingerprintText(saved.data),
      },
    });
  });

  it('removes old English FK evidence from bilingual rewrites', async () => {
    const h = complexityHarness({
      language: 'English',
      original: 'La planta usa luz.\n\n--- ENGLISH TRANSLATION ---\n\nThe plant uses light.',
      candidate: 'La planta capta luz.\n\n--- ENGLISH TRANSLATION ---\n\nThe plant captures light.',
    });

    await makeComplexityAdjustment()(h.deps);

    const saved = h.setGeneratedContent.mock.calls[0][0];
    expect(h.generateBilingualText.mock.calls[0][3]).toMatchObject({
      enabled: true,
      target: 'English',
      mode: 'artifact-preserve',
    });
    expect(h.calculateReadability).not.toHaveBeenCalled();
    expect(saved.localStats).toBeUndefined();
    expect(saved.instructionalText.complexity).toMatchObject({
      measuredGrade: null,
      method: '',
      status: 'not-applicable',
      contentFingerprint: Context.fingerprintText(saved.data),
    });
  });
});

describe('selection revision artifact context', () => {
  it('uses the saved grade, language, and standards instead of current controls', async () => {
    loadAlloModule('content_engine_source.jsx');
    const callGemini = vi.fn(async () => 'Plants use light to make sugar.');
    const setRevisionData = vi.fn();
    const generatedContent = {
      id: 'saved-reading',
      type: 'simplified',
      data: 'Plants capture sunlight and convert its energy into chemical energy.',
      instructionalText: profile({ grade: '5th Grade', language: 'English' }),
      config: {
        grade: '5th Grade',
        language: 'English',
        standardsContext: { promptText: 'ARTIFACT STANDARD: explain energy conversion.' },
      },
    };
    const state = {
      generatedContent,
      selectionMenu: { text: generatedContent.data, x: 10, y: 20 },
      gradeLevel: '2nd Grade',
      leveledTextLanguage: 'Spanish',
      standardsPromptString: 'AMBIENT STANDARD',
      standardsContext: { promptText: 'AMBIENT STANDARD' },
      targetStandards: ['AMBIENT STANDARD'],
      sourceTopic: 'Plants',
      currentUiLanguage: 'English',
      setSelectionMenu: vi.fn(),
      setIsCustomReviseOpen: vi.fn(),
      setRevisionData,
      setCustomReviseInstruction: vi.fn(),
      setDefinitionData: vi.fn(),
      setPhonicsData: vi.fn(),
      setPlayingContentId: vi.fn(),
      setPlaybackState: vi.fn(),
    };
    const engine = window.AlloModules.createContentEngine({
      getState: () => state,
      callGemini,
      addToast: vi.fn(),
      t: key => key,
    });

    await engine.handleReviseSelection('simplify');

    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('for a 5th Grade student');
    expect(prompt).toContain('Recorded Resource Language: English');
    expect(prompt).toContain('ARTIFACT STANDARD');
    expect(prompt).not.toContain('AMBIENT STANDARD');
    expect(prompt).not.toContain('for a 2nd Grade student');
    expect(setRevisionData).toHaveBeenLastCalledWith(expect.any(Function));
  });
});
