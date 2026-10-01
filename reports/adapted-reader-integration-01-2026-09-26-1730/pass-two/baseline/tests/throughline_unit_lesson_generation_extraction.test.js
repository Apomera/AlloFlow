import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupThroughline } from './helpers/throughline_harness.js';

function generationApi() {
  const Throughline = setupThroughline();
  expect(Throughline.generateUnitLesson).toBeTypeOf('function');
  return Throughline.generateUnitLesson;
}

function makeCapabilities(overrides) {
  const executeOneBlueprint = vi.fn(async () => ({
    items: [
      { id: 'analysis-1', type: 'analysis' },
      { id: 'lesson-plan-1', type: 'lesson-plan' },
    ],
    dnaOut: { topic: 'Water cycle' },
    nulls: [],
  }));
  const instructionalContext = {
    normalizeGradeLabel: vi.fn((value, fallback) => String(value || fallback || '')),
    normalizeInstructionalContext: vi.fn((_current, options) => ({
      schemaVersion: 1,
      standardsFingerprint: 'standards-fingerprint',
      ...options,
    })),
    normalizeInstructionalText: vi.fn((current, options) => ({
      ...options,
      previousRole: current && current.role,
    })),
    getSourceCalibrationTarget: vi.fn((requestedGrade) => ({
      requestedGrade,
      promptGrade: 'Grade 4',
      policyVersion: 'calibration-test-v1',
    })),
    isEnglishLanguage: vi.fn(() => true),
    withComplexityEvidence: vi.fn((profile, evidence, text) => ({
      ...profile,
      evidence,
      measuredText: text,
    })),
  };
  const standardsContext = {
    resolve: vi.fn((raw) => ({ promptText: 'Resolved standards', raw })),
    buildResourceDirective: vi.fn(() => 'Use the resolved standards.'),
  };
  const capabilities = {
    modules: {
      PhaseOHandlers: { executeOneBlueprint },
      InstructionalContext: instructionalContext,
      StandardsContext: standardsContext,
    },
    gradeLevel: 'Grade 5',
    activeResolvedStandardsContext: { promptText: 'Host standards' },
    standardsInput: 'CCSS.ELA-LITERACY.RI.5.1',
    targetStandards: ['CCSS.ELA-LITERACY.RI.5.1'],
    leveledTextLanguage: 'English',
    inputText: 'Host source text.',
    history: [],
    aiConfig: { backend: 'gemini', models: { default: 'gemini-default' } },
    callGemini: vi.fn(),
    warnLog: vi.fn(),
    calculateReadability: vi.fn(() => ({ score: 6.2 })),
    recordSourceProvenance: vi.fn(),
    handleGenerate: vi.fn(),
  };
  return Object.assign(capabilities, overrides || {}, {
    executeOneBlueprint,
    instructionalContext,
    standardsContext,
  });
}

describe('Learning Web unit lesson generation extraction', () => {
  it('reuses the latest analyzed source and preserves the Phase O execution contract', async () => {
    const generateUnitLesson = generationApi();
    const sourceHistory = [
      { id: 'old-source', type: 'analysis', data: { originalText: 'Older source.' } },
      {
        id: 'latest-source',
        type: 'analysis',
        data: { originalText: 'Existing analyzed source.' },
        config: { language: 'English' },
        instructionalText: { role: 'primary' },
      },
    ];
    const capabilities = makeCapabilities({ history: sourceHistory });
    const signal = { aborted: false };
    const onResource = vi.fn();
    const lessonSpec = {
      title: 'Clouds and Rain',
      focus: 'Trace water through the atmosphere.',
      suggestedResourceTypes: ['lesson-plan', 'glossary', 'analysis'],
    };
    const dna = {
      grade: 'Grade 6',
      sourceConfig: { readingLevel: 'Grade 5' },
      concepts: ['water cycle'],
      keyTerms: ['condensation'],
      essentialQuestion: 'How does water move?',
      desiredResults: ['Water changes state.'],
    };

    const result = await generateUnitLesson(lessonSpec, dna, { signal, onResource }, capabilities);

    expect(capabilities.callGemini).not.toHaveBeenCalled();
    expect(capabilities.recordSourceProvenance).not.toHaveBeenCalled();
    expect(capabilities.calculateReadability).toHaveBeenCalledWith('Existing analyzed source.');
    expect(capabilities.executeOneBlueprint).toHaveBeenCalledTimes(1);
    const [blueprint, execution] = capabilities.executeOneBlueprint.mock.calls[0];
    expect(blueprint.resourcePlan.map((resource) => resource.tool)).toEqual(['analysis', 'glossary', 'lesson-plan']);
    expect(blueprint.resourcePlan[0].directive).toContain('Unit enduring understandings: Water changes state.');
    expect(blueprint.resourcePlan[0].instructionalText.evidence).toMatchObject({
      requestedGrade: 'Grade 5',
      calibrationTarget: 'Grade 4',
      measuredGrade: 6.2,
      method: 'flesch-kincaid-en',
      language: 'English',
    });
    expect(execution).toMatchObject({
      handleGenerate: capabilities.handleGenerate,
      initialSourceText: 'Existing analyzed source.',
      signal,
      onResource,
    });
    expect(execution.historyOverride).toEqual(sourceHistory);
    expect(execution.historyOverride).not.toBe(sourceHistory);
    expect(execution.dna).toMatchObject({
      grade: 'Grade 6',
      topic: 'Clouds and Rain',
      standard: 'Resolved standards',
      concepts: ['water cycle'],
      keyTerms: ['condensation'],
    });
    expect(Object.isFrozen(execution.settingsSnapshot)).toBe(true);
    expect(execution.settingsSnapshot).toMatchObject({
      gradeLevel: 'Grade 6',
      leveledTextLanguage: 'English',
      targetStandards: ['CCSS.ELA-LITERACY.RI.5.1'],
      standardsInput: 'Resolved standards',
    });
    expect(result.anchorItem).toEqual({ id: 'lesson-plan-1', type: 'lesson-plan' });
    expect(result.dnaOut).toEqual({ topic: 'Water cycle' });
  });

  it('forwards cancellation to source generation and records generated-source provenance', async () => {
    const generateUnitLesson = generationApi();
    const capabilities = makeCapabilities({
      inputText: '   ',
      history: [{ id: 'glossary-1', type: 'glossary', data: [] }],
      aiConfig: { backend: 'Vertex', models: { default: 'gemini-3-flash' } },
      callGemini: vi.fn(async () => '  Generated source prose.  '),
    });
    capabilities.executeOneBlueprint.mockResolvedValue({
      items: [{ id: 'analysis-only', type: 'analysis' }],
      dnaOut: { generated: true },
      nulls: ['quiz'],
    });
    const signal = { aborted: false, reason: null };
    const lessonSpec = {
      title: 'The Carbon Cycle',
      objective: 'Explain how carbon moves.',
      suggestedResourceTypes: ['analysis'],
    };
    const dna = {
      grade: 'Grade 7',
      sourceConfig: { readingLevel: 'Grade 6', lengthWords: 10, tone: 'Narrative' },
      desiredResults: ['Matter is conserved.'],
    };

    const result = await generateUnitLesson(lessonSpec, dna, { signal }, capabilities);

    expect(capabilities.callGemini).toHaveBeenCalledTimes(1);
    const sourceCall = capabilities.callGemini.mock.calls[0];
    expect(sourceCall[0]).toContain('about 100 words');
    expect(sourceCall[0]).toContain('Reinforce these enduring understandings: Matter is conserved.');
    expect(sourceCall[0]).toContain('Use the resolved standards.');
    expect(sourceCall.slice(1)).toEqual([false, false, null, null, signal]);
    expect(capabilities.recordSourceProvenance).toHaveBeenCalledWith(expect.objectContaining({
      title: 'The Carbon Cycle',
      type: 'generated',
      importMethod: 'unit-path-generation',
      provider: 'vertex',
      model: 'gemini-3-flash',
      requestedGrade: 'Grade 6',
      calibrationTarget: 'Grade 4',
      calibrationPolicy: 'calibration-test-v1',
      measuredGrade: 6.2,
    }), 'Generated source prose.');
    const [, execution] = capabilities.executeOneBlueprint.mock.calls[0];
    expect(execution.initialSourceText).toBe('Generated source prose.');
    expect(execution.signal).toBe(signal);
    expect(result.anchorItem).toEqual({ id: 'analysis-only', type: 'analysis' });
    expect(result.nulls).toEqual(['quiz']);
  });

  it('fails before generation when the shared blueprint engine is unavailable', async () => {
    const generateUnitLesson = generationApi();
    const capabilities = makeCapabilities();
    capabilities.modules = {};

    await expect(generateUnitLesson({}, {}, {}, capabilities)).rejects.toThrow('blueprint engine unavailable');
    expect(capabilities.callGemini).not.toHaveBeenCalled();
  });

  it('keeps only a thin host bridge and mirrors the lazy module', () => {
    const hostSources = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
      'desktop/web-app/src/AlloFlowANTI.txt',
    ].map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'));
    const moduleSource = readFileSync(resolve(process.cwd(), 'mind_map_module.js'), 'utf8');
    const publicModule = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/mind_map_module.js'), 'utf8');

    for (const host of hostSources) {
      const start = host.indexOf('const onGenerateUnitLesson = async');
      const end = host.indexOf('// Auto-config writes settings', start);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeGreaterThan(start);
      const bridge = host.slice(start, end);
      expect(bridge).toContain('_mindMapModule.generateUnitLesson(lessonSpec, dna, opts');
      expect(bridge).not.toContain('executeOneBlueprint');
      expect(bridge).not.toContain('callGemini(');
    }
    expect(moduleSource).toContain('async function generateUnitLesson(lessonSpec, dna, opts, dependencies)');
    expect(moduleSource).toContain('ThroughlineModal.generateUnitLesson = generateUnitLesson;');
    expect(publicModule).toBe(moduleSource);
  });
});
