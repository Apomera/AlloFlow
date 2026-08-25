import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let C;
let BlueprintService;
let PhaseO;
let UdlChat;

beforeAll(() => {
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule('agent_core_blueprint_service_module.js');
  loadAlloModule('udl_chat_source.jsx');
  // Load the canonical source directly: generated/public mirrors are rebuilt
  // separately and are intentionally outside this focused implementation.
  loadAlloModule('phase_o_misc_handlers_source.jsx');
  C = window.AlloModules.AgentCoreContracts;
  BlueprintService = window.AlloModules.AgentCoreBlueprintService;
  PhaseO = window.AlloModules.PhaseOHandlers;
  UdlChat = window.AlloModules.UdlChat;
});

const frozenRequest = (extra = {}) => ({
  blueprintId: 'bp-matrix',
  sourceText: 'A short source shared by every resource in this plan.',
  gradeLevel: '6th Grade',
  language: 'All Selected Languages',
  selectedLanguages: ['Spanish'],
  translationMode: 'always',
  currentUiLanguage: 'English',
  translationTargetChoices: ['English', 'Spanish'],
  resolvedTranslationTarget: 'English',
  differentiationRange: 'Both',
  differentiationTypes: ['quiz'],
  differentiationCustomGrades: ['4th Grade'],
  interests: ['space', 'music'],
  dokLevel: '3',
  useEmojis: true,
  textFormat: 'Structured headings',
  imageGenerationStyle: 'diagram',
  imageAspectRatio: '16:9',
  instructionalContext: {
    schemaVersion: 1,
    instructionalGrade: '6th Grade',
    standardsFingerprint: 'std-reviewed-1',
  },
  ...extra,
});

describe('Blueprint creation freezes and preserves GenerationMatrix decisions', () => {
  it('uses a divergent current source instead of silently binding to stale analysis', async () => {
    const latestAnalysis = { id: 'analysis-old', type: 'analysis', data: { originalText: 'Older analyzed source.' } };
    const choice = UdlChat.resolveBlueprintSourceChoice({
      requestedSourceText: 'Current editor source.',
      sourceOrigin: 'current-editor',
      latestAnalysis,
    });
    expect(choice.text).toBe('Current editor source.');
    expect(choice.metadata).toMatchObject({
      selectedSource: 'current-editor',
      divergentFromLatestAnalysis: true,
      sourceChoiceRequired: false,
      latestAnalysisArtifactId: 'analysis-old',
    });
    const service = BlueprintService.createBlueprintService({
      contracts: C,
      generationMatrix: window.AlloModules.GenerationMatrix,
      autoConfigure: vi.fn(async () => ({ resourcePlan: [{ tool: 'analysis', uiId: 'analysis-current' }] })),
    });
    const bp = await service.createDraft(frozenRequest({ sourceText: choice.text, sourcePolicy: choice.metadata }));
    expect(bp.sourcePolicy).toMatchObject(choice.metadata);
    expect(C.toLegacyConfig(bp).sourcePolicy).toMatchObject(choice.metadata);
  });

  it('uses matching latest analysis as the stable workspace source anchor', () => {
    const choice = UdlChat.resolveBlueprintSourceChoice({
      requestedSourceText: ' Same source  text. ',
      latestAnalysis: { id: 'analysis-current', data: { originalText: 'Same source text.' } },
    });
    expect(choice.text).toBe('Same source text.');
    expect(choice.metadata).toMatchObject({
      selectedSource: 'latest-analysis', divergentFromLatestAnalysis: false,
    });
  });

  it('freezes every language/differentiation input and resolves grade x language cells', async () => {
    const service = BlueprintService.createBlueprintService({
      contracts: C,
      generationMatrix: window.AlloModules.GenerationMatrix,
      autoConfigure: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', uiId: 'quiz-1' }] })),
    });
    const bp = await service.createDraft(frozenRequest());

    expect(bp.globalSettings).toMatchObject({
      gradeLevel: '6th Grade',
      primaryLanguage: 'All Selected Languages',
      language: 'All Selected Languages',
      selectedLanguages: ['Spanish'],
      translationMode: 'always',
      currentUiLanguage: 'English',
      translationTargetChoices: ['English', 'Spanish'],
      resolvedTranslationTarget: 'English',
      differentiationRange: 'Both',
      differentiationTypes: ['quiz'],
      differentiationCustomGrades: ['4th Grade'],
      studentInterests: ['space', 'music'],
      dokLevel: '3',
      useEmojis: true,
      textFormat: 'Structured headings',
      imageGenerationStyle: 'diagram',
      imageAspectRatio: '16:9',
      standardsFingerprint: 'std-reviewed-1',
    });
    expect(bp.globalSettings.sourceFingerprint).toMatch(/^src-/);
    expect(bp.globalSettings.contextInputsFingerprint).toMatch(/^ctxi-/);
    const quiz = bp.plan.find((row) => row.tool === 'quiz');
    expect(quiz.generationVariants).toHaveLength(10);
    expect(new Set(quiz.generationVariants.map((cell) => cell.grade)).size).toBe(5);
    expect(new Set(quiz.generationVariants.map((cell) => cell.language))).toEqual(new Set(['English', 'Spanish']));
    expect(quiz.generationVariants.every((cell) => cell.contextInputsFingerprint === bp.globalSettings.contextInputsFingerprint)).toBe(true);

    const roundTrip = C.fromLegacyConfig(C.toLegacyConfig(bp), { blueprintId: bp.blueprintId });
    const roundTripQuiz = roundTrip.plan.find((row) => row.tool === 'quiz');
    expect(roundTripQuiz).toBeTruthy();
    expect(roundTripQuiz.generationVariants).toEqual(quiz.generationVariants);
    expect(roundTripQuiz.generationAction).toBe(quiz.generationAction);
    expect(roundTripQuiz.variantKey).toBe(quiz.variantKey);
    expect(roundTripQuiz.explicitVariantKey).toBe(quiz.explicitVariantKey);
    expect(roundTripQuiz.variantKeyDerived).toBe(true);
    expect(roundTripQuiz.generationVariants.every((cell) => cell.contextInputsFingerprint === bp.globalSettings.contextInputsFingerprint)).toBe(true);
  });

  it('does not reuse an artifact after reviewed generation context changes', async () => {
    const autoConfigure = vi.fn(async () => ({ resourcePlan: [{ tool: 'glossary', uiId: 'glossary-context', directive: 'Key terms.' }] }));
    const service = BlueprintService.createBlueprintService({
      contracts: C,
      generationMatrix: window.AlloModules.GenerationMatrix,
      autoConfigure,
    });
    const first = await service.createDraft(frozenRequest({ language: 'English', selectedLanguages: [], differentiationRange: 'None', dokLevel: '2' }));
    const firstGlossary = first.plan.find((row) => row.tool === 'glossary');
    expect(firstGlossary).toBeTruthy();
    const firstCell = firstGlossary.generationVariants[0];
    const artifact = {
      id: 'old-context-artifact', type: 'glossary', directive: 'Key terms.',
      generationIdentity: firstCell.generationIdentity,
      sourceFingerprint: firstCell.sourceFingerprint,
      gradeLevel: firstCell.grade,
      language: firstCell.language,
      contextFingerprint: firstCell.contextFingerprint,
    };
    const reusable = await service.createDraft(frozenRequest({
      language: 'English', selectedLanguages: [], differentiationRange: 'None',
      dokLevel: '2', existingArtifacts: [artifact],
    }));
    expect(reusable.plan.find((row) => row.tool === 'glossary').generationAction).toBe('reuse');
    const revisedContext = service.revise(reusable, { globalSettings: { dokLevel: '4' } });
    expect(revisedContext.ok).toBe(true);
    expect(revisedContext.value.plan.find((row) => row.tool === 'glossary').generationAction).not.toBe('reuse');
    const changed = await service.createDraft(frozenRequest({
      language: 'English', selectedLanguages: [], differentiationRange: 'None',
      dokLevel: '4', existingArtifacts: [artifact],
    }));
    expect(changed.globalSettings.contextFingerprint).not.toBe(first.globalSettings.contextFingerprint);
    const changedGlossary = changed.plan.find((row) => row.tool === 'glossary');
    expect(changedGlossary.generationAction).not.toBe('reuse');
    expect(changedGlossary.existingArtifactId).toBeNull();
  });

  it('marks a same-context singleton for reuse and refreshes it when AI edits its directive', async () => {
    const sourceText = 'The exact original source text.';
    const glossary = {
      id: 'glossary-existing', type: 'glossary', data: [], directive: 'Build terms.',
      sourceFingerprint: window.AlloModules.GenerationMatrix.fingerprintSourceText(sourceText),
      gradeLevel: '6th Grade', language: 'English',
    };
    const service = BlueprintService.createBlueprintService({
      contracts: C,
      generationMatrix: window.AlloModules.GenerationMatrix,
      autoConfigure: vi.fn(async () => ({ resourcePlan: [{ tool: 'glossary', uiId: 'glossary-1', directive: 'Build terms.' }] })),
      modifyBlueprint: vi.fn(async (legacy) => ({
        ...legacy,
        resourcePlan: legacy.resourcePlan.map(({ tool, uiId, directive }) => ({ tool, uiId, directive: directive + ' More detail.' })),
      })),
    });
    const bp = await service.createDraft(frozenRequest({ sourceText, existingArtifacts: [glossary] }));
    const blueprintGlossary = bp.plan.find((row) => row.tool === 'glossary');
    expect(blueprintGlossary.generationAction).toBe('reuse');
    expect(blueprintGlossary.existingArtifactId).toBe('glossary-existing');

    const revised = await service.reviseWithAI(bp, 'add detail');
    const revisedGlossary = revised.plan.find((row) => row.tool === 'glossary');
    expect(revisedGlossary.generationAction).toBe('refresh');
    expect(revisedGlossary.generationVariants[0].existingArtifactId).toBe('glossary-existing');
    expect(revised.globalSettings).toEqual(bp.globalSettings);
  });
});

describe('Blueprint execution honors exact reviewed variants', () => {
  const variants = [
    { generationIdentity: 'gm-grade5-en', action: 'generate', grade: '5th Grade', language: 'English', variantKey: 'default' },
    { generationIdentity: 'gm-grade5-es', action: 'generate', grade: '5th Grade', language: 'Spanish', variantKey: 'default' },
    { generationIdentity: 'gm-grade6-en', action: 'generate', grade: '6th Grade', language: 'English', variantKey: 'default' },
    { generationIdentity: 'gm-grade6-es', action: 'generate', grade: '6th Grade', language: 'Spanish', variantKey: 'default' },
  ];
  const plan = {
    globalSettings: { gradeLevel: '6th Grade', language: 'All Selected Languages', selectedLanguages: ['Spanish'] },
    resourcePlan: [{ tool: 'quiz', uiId: 'quiz-row', directive: 'Check understanding.', generationAction: 'generate', variantKey: 'variant-derived-test', explicitVariantKey: null, variantKeyDerived: true, generationVariants: variants }],
  };

  it('dispatches every exact grade-language cell once and records every identity/action', async () => {
    const steps = [];
    const generate = vi.fn(async (_type, language, _keep, _text, config) => ({
      id: `${config.grade}-${language}`,
      type: 'quiz',
      data: {},
    }));
    const out = await PhaseO.executeOneBlueprint(plan, {
      handleGenerate: generate,
      historyOverride: [],
      settingsSnapshot: Object.freeze({ gradeLevel: '6th Grade', language: 'All Selected Languages', leveledTextLanguage: 'All Selected Languages', selectedLanguages: ['Spanish'] }),
      onStep: (step) => steps.push(step),
    });

    expect(generate).toHaveBeenCalledTimes(4);
    expect(generate.mock.calls.map((call) => [call[4].grade, call[1]])).toEqual([
      ['5th Grade', 'English'], ['5th Grade', 'Spanish'],
      ['6th Grade', 'English'], ['6th Grade', 'Spanish'],
    ]);
    expect(generate.mock.calls.every((call) => call[4].skipDifferentiation === true)).toBe(true);
    expect(generate.mock.calls.every((call) => call[4].explicitVariantKey === null && call[4].variantKeyDerived === true)).toBe(true);
    const landed = steps.at(-1);
    expect(landed.status).toBe('landed');
    expect(landed.resourceIds).toHaveLength(4);
    expect(landed.variantResults.map((cell) => cell.variantId)).toEqual(variants.map((cell) => cell.generationIdentity));
    expect(landed.variantResults.every((cell) => cell.action === 'generate')).toBe(true);
    expect(landed.variantResults.every((cell) => cell.artifactId === cell.resourceId)).toBe(true);
    expect(landed).toMatchObject({ successfulVariantCount: 4, failedVariantCount: 0, interruptedVariantCount: 0 });
    expect(out.items).toHaveLength(4);
  });

  it('reuses a reviewed artifact without an AI call', async () => {
    const existing = { id: 'analysis-existing', type: 'analysis', data: { originalText: 'Source' } };
    const generate = vi.fn();
    const steps = [];
    const out = await PhaseO.executeOneBlueprint({ resourcePlan: [{
      tool: 'analysis', uiId: 'analysis-row', generationAction: 'reuse', existingArtifactId: existing.id,
      generationVariants: [{ generationIdentity: 'gm-analysis-1', action: 'reuse', existingArtifactId: existing.id, language: 'English' }],
    }] }, { handleGenerate: generate, historyOverride: [existing], onStep: (step) => steps.push(step) });

    expect(generate).not.toHaveBeenCalled();
    expect(out.items[0]).toBe(existing);
    expect(steps.at(-1).variantResults).toEqual(expect.arrayContaining([
      expect.objectContaining({ variantId: 'gm-analysis-1', action: 'reuse', resourceId: existing.id }),
    ]));
  });

  it('generates the reviewed cell when its reuse target was deleted after review', async () => {
    const generate = vi.fn(async () => ({ id: 'replacement-analysis', type: 'analysis', data: { originalText: 'Source' } }));
    const steps = [];
    const out = await PhaseO.executeOneBlueprint({ resourcePlan: [{
      tool: 'analysis', uiId: 'missing-reuse-row', generationAction: 'reuse', existingArtifactId: 'deleted-analysis',
      generationVariants: [{ generationIdentity: 'gm-analysis-missing', action: 'reuse', existingArtifactId: 'deleted-analysis', language: 'English' }],
    }] }, { handleGenerate: generate, historyOverride: [], initialSourceText: 'Source', onStep: (step) => steps.push(step) });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][4].generationAction).toBe('generate');
    expect(out.failedRows).toEqual([]);
    expect(steps.at(-1)).toMatchObject({ generationAction: 'generate', reviewedGenerationAction: 'reuse' });
    expect(steps.at(-1).variantResults[0]).toMatchObject({
      action: 'generate', reviewedAction: 'reuse', status: 'landed', resourceId: 'replacement-analysis',
    });
    expect(steps.at(-1).variantResults[0].reason).toMatch(/missing/i);
  });

  it('reuses an exact artifact that landed after review instead of generating a duplicate', async () => {
    const landed = {
      id: 'landed-after-review', type: 'quiz', data: {},
      generationIdentity: 'gm-grade6-en',
    };
    const generate = vi.fn();
    const steps = [];
    const oneCellPlan = {
      globalSettings: plan.globalSettings,
      resourcePlan: [{
        ...plan.resourcePlan[0],
        generationVariants: [variants[2]],
      }],
    };
    const out = await PhaseO.executeOneBlueprint(oneCellPlan, {
      handleGenerate: generate,
      historyOverride: [landed],
      settingsSnapshot: Object.freeze({ gradeLevel: '6th Grade', language: 'English', leveledTextLanguage: 'English' }),
      onStep: (step) => steps.push(step),
    });

    expect(generate).not.toHaveBeenCalled();
    expect(out.items[0]).toBe(landed);
    expect(steps.at(-1).variantResults[0]).toMatchObject({
      action: 'reuse', resourceId: landed.id,
    });
  });

  it('re-resolves a reviewed reuse against the provider that will actually execute it', async () => {
    const matrix = window.AlloModules.GenerationMatrix;
    const sourceText = 'Provider drift source';
    const sourceFingerprint = matrix.fingerprintSourceText(sourceText);
    const oldSettings = {
      sourceText, sourceFingerprint, gradeLevel: '6th Grade', language: 'English',
      backend: 'gemini', provider: 'gemini', model: 'old-model',
    };
    const reviewed = matrix.resolveGenerationMatrix({ type: 'quiz', directive: 'Check understanding.' }, oldSettings).variants[0];
    const existing = {
      id: 'old-provider-quiz', type: 'quiz', data: {},
      generationIdentity: reviewed.generationIdentity,
      generationConfigFingerprint: reviewed.generationConfigFingerprint,
      sourceFingerprint,
      gradeLevel: reviewed.grade,
      language: reviewed.language,
    };
    const generate = vi.fn(async () => ({ id: 'current-provider-quiz', type: 'quiz', data: {} }));
    const currentSettings = Object.freeze({
      ...oldSettings,
      backend: 'openai', provider: 'openai', model: 'new-model',
      leveledTextLanguage: 'English',
    });
    await PhaseO.executeOneBlueprint({ resourcePlan: [{
      tool: 'quiz', uiId: 'provider-drift-row', directive: 'Check understanding.',
      generationAction: 'reuse', existingArtifactId: existing.id,
      generationConfigFingerprint: reviewed.generationConfigFingerprint,
      generationVariants: [{ ...reviewed, action: 'reuse', existingArtifactId: existing.id }],
    }] }, {
      handleGenerate: generate,
      historyOverride: [existing],
      initialSourceText: sourceText,
      settingsSnapshot: currentSettings,
    });

    expect(generate).toHaveBeenCalledTimes(1);
    const dispatched = generate.mock.calls[0][4];
    expect(dispatched.generationAction).not.toBe('reuse');
    expect(dispatched.generationIdentity).not.toBe(reviewed.generationIdentity);
    expect(dispatched.generationConfigFingerprint).not.toBe(reviewed.generationConfigFingerprint);
  });

  it('re-resolves reviewed reuse cells when the canonical source changed after review', async () => {
    const matrix = window.AlloModules.GenerationMatrix;
    const oldSource = 'Old canonical source';
    const newSource = 'New canonical source';
    const oldFingerprint = matrix.fingerprintSourceText(oldSource);
    const existing = { id: 'old-analysis', type: 'analysis', sourceFingerprint: oldFingerprint, data: { originalText: oldSource } };
    const generate = vi.fn(async () => ({ id: 'new-analysis', type: 'analysis', data: { originalText: newSource } }));
    const steps = [];
    await PhaseO.executeOneBlueprint({
      globalSettings: { gradeLevel: '6th Grade', language: 'English', sourceFingerprint: oldFingerprint },
      resourcePlan: [{
        tool: 'analysis', uiId: 'source-stale-row', sourceFingerprint: oldFingerprint,
        generationAction: 'reuse', existingArtifactId: existing.id,
        generationVariants: [{ generationIdentity: 'gm-old-source-analysis', action: 'reuse', existingArtifactId: existing.id, sourceFingerprint: oldFingerprint, language: 'English' }],
      }],
    }, {
      handleGenerate: generate,
      historyOverride: [existing],
      initialSourceText: newSource,
      settingsSnapshot: Object.freeze({ gradeLevel: '6th Grade', language: 'English', leveledTextLanguage: 'English', sourceFingerprint: oldFingerprint }),
      onStep: (step) => steps.push(step),
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][4].sourceFingerprint).toBe(matrix.fingerprintSourceText(newSource));
    expect(steps.at(-1)).toMatchObject({ sourceChanged: true, generationAction: 'generate' });
    expect(steps.at(-1).reviewedSourceFingerprint).toBe(oldFingerprint);
    expect(steps.at(-1).currentSourceFingerprint).toBe(matrix.fingerprintSourceText(newSource));
  });

  it('defensively resolves a legacy row and reuses same-source analysis without an AI call', async () => {
    const existing = { id: 'legacy-analysis', type: 'analysis', data: { originalText: 'Same source text' } };
    const generate = vi.fn();
    const out = await PhaseO.executeOneBlueprint({ resourcePlan: [{ tool: 'analysis', uiId: 'legacy-analysis-row' }] }, {
      handleGenerate: generate,
      historyOverride: [existing],
      initialSourceText: 'Same source text',
      settingsSnapshot: Object.freeze({ gradeLevel: '6th Grade', language: 'English', leveledTextLanguage: 'English' }),
    });
    expect(generate).not.toHaveBeenCalled();
    expect(out.items[0]).toBe(existing);
  });

  it('rebuild refreshes only the selected row using the same grade-language cells', async () => {
    const initialGenerate = vi.fn(async (_type, language, _keep, _text, config) => ({ id: `initial-${config.grade}-${language}`, type: 'quiz', data: {} }));
    await PhaseO.executeOneBlueprint(plan, { handleGenerate: initialGenerate, historyOverride: [] });
    const rebuildGenerate = vi.fn(async (_type, language, _keep, _text, config) => ({ id: `rebuilt-${config.grade}-${language}`, type: 'quiz', data: {} }));
    let run = { runId: 'run-1', settingsSnapshot: Object.freeze({ gradeLevel: '6th Grade', language: 'All Selected Languages', leveledTextLanguage: 'All Selected Languages', selectedLanguages: ['Spanish'] }), rows: { 'quiz-row': { uiId: 'quiz-row', status: 'landed' } } };
    await PhaseO.handleRebuildBlueprintStep({
      activeBlueprint: plan,
      blueprintExecutionResult: run,
      persistedLessonDNA: null,
      history: [],
      setBlueprintExecutionResult: (next) => { run = typeof next === 'function' ? next(run) : next; },
      handleGenerate: rebuildGenerate,
      addToast: vi.fn(),
      t: () => undefined,
      warnLog: vi.fn(),
    }, 'quiz-row');

    expect(rebuildGenerate.mock.calls.map((call) => [call[4].grade, call[1]])).toEqual(
      initialGenerate.mock.calls.map((call) => [call[4].grade, call[1]])
    );
    expect(rebuildGenerate.mock.calls.every((call) => call[4].generationAction === 'refresh')).toBe(true);
    expect(run.rows['quiz-row'].variantResults).toHaveLength(4);
    expect(run.rows['quiz-row'].variantResults.every((cell) => cell.action === 'refresh')).toBe(true);
  });

  it('rebuild records every cell and continues after one recoverable variant failure', async () => {
    let run = { runId: 'run-retry', settingsSnapshot: Object.freeze({ gradeLevel: '6th Grade', language: 'All Selected Languages', leveledTextLanguage: 'All Selected Languages', selectedLanguages: ['Spanish'] }), rows: { 'quiz-row': { uiId: 'quiz-row', status: 'failed' } } };
    const generate = vi.fn(async (_type, language, _keep, _text, config) => {
      if (config.grade === '5th Grade' && language === 'Spanish') throw new Error('recoverable parser error');
      return { id: `retry-${config.grade}-${language}`, type: 'quiz', data: {} };
    });
    await PhaseO.handleRebuildBlueprintStep({
      activeBlueprint: plan, blueprintExecutionResult: run, persistedLessonDNA: null, history: [],
      setBlueprintExecutionResult: (next) => { run = typeof next === 'function' ? next(run) : next; },
      handleGenerate: generate, addToast: vi.fn(), t: () => undefined, warnLog: vi.fn(),
    }, 'quiz-row');
    expect(generate).toHaveBeenCalledTimes(4);
    expect(run.rows['quiz-row'].status).toBe('partial');
    expect(run.rows['quiz-row'].variantResults).toHaveLength(4);
    expect(run.rows['quiz-row'].variantResults.filter((cell) => cell.status === 'failed')).toHaveLength(1);
    expect(run.rows['quiz-row'].resourceIds).toHaveLength(3);
    expect(run.rows['quiz-row']).toMatchObject({ successfulVariantCount: 3, failedVariantCount: 1, interruptedVariantCount: 0 });
    expect(run.rows['quiz-row'].variantResults.filter((cell) => cell.status === 'landed').every((cell) => cell.artifactId === cell.resourceId)).toBe(true);
  });

  it('full execution uses the reviewed snapshot and reports later Universal-setting drift', async () => {
    const reviewedVariant = {
      generationIdentity: 'gm-reviewed-frozen', action: 'generate', grade: '6th Grade', language: 'Spanish', variantKey: 'default',
    };
    const activeBlueprint = {
      standards: 'Reviewed standard',
      globalSettings: {
        gradeLevel: '6th Grade', language: 'Spanish', primaryLanguage: 'Spanish',
        selectedLanguages: ['Spanish'], translationMode: 'always', currentUiLanguage: 'English',
        translationTargetChoices: ['English'], resolvedTranslationTarget: 'English',
        differentiationRange: 'None', differentiationTypes: ['quiz'], differentiationCustomGrades: [],
        dokLevel: '3', useEmojis: true, textFormat: 'Headings',
        imageGenerationStyle: 'diagram', imageAspectRatio: '16:9',
        generationOptions: { quizMode: 'reviewed-exam', quizMcqCount: 7 },
        toolOverrides: { quiz: { customInstructions: 'Reviewed quiz note.', generationContext: { customInstructions: 'Reviewed quiz note.' } } },
        backend: 'gemini', provider: 'gemini', model: 'reviewed-model', imageProvider: 'imagen', imageModel: 'reviewed-image-model',
        sourceFingerprint: 'src-reviewed', standardsFingerprint: 'std-reviewed',
      },
      resourcePlan: [{ tool: 'quiz', uiId: 'reviewed-row', generationAction: 'generate', generationVariants: [reviewedVariant] }],
    };
    let run = null;
    const applyRun = (next) => { run = typeof next === 'function' ? next(run) : next; };
    const generate = vi.fn(async () => ({ id: 'frozen-result', type: 'quiz', data: {} }));
    const noop = () => {};
    await PhaseO.handleExecuteBlueprint({
      activeBlueprint,
      // Deliberately different ambient values: none may leak into dispatch.
      gradeLevel: '10th Grade', leveledTextLanguage: 'French', currentUiLanguage: 'French', translationMode: 'never',
      selectedLanguages: ['French'], studentInterests: [], standardsInput: 'Ambient standard', targetStandards: [],
      dokLevel: '1', useEmojis: false, textFormat: 'Plain', differentiationRange: 'Both',
      differentiationTypes: ['simplified'], differentiationCustomGrades: ['10th Grade'],
      imageGenerationStyle: undefined, universalImageStyle: 'photo', imageAspectRatio: '1:1',
      generationConfigSnapshot: {
        toolOverrides: { quiz: 'Ambient quiz note.' },
        toolOptions: { quizMode: 'ambient-exit-ticket', quizMcqCount: 3 },
        canonical: { fields: { toolOverrides: { quiz: { customInstructions: 'Ambient quiz note.', generationContext: { customInstructions: 'Ambient quiz note.' } } } } },
        provider: { backend: 'gemini', model: 'reviewed-model', imageProvider: 'imagen', imageModel: 'reviewed-image-model' },
      },
      sourceTopic: '', inputText: 'Reviewed source', history: [],
      setGradeLevel: noop, setSourceTone: noop, applyDetailedAutoConfig: noop,
      setIsExecutingBlueprint: noop, setBlueprintExecutionResult: applyRun,
      setGuidedFlowState: noop, setUdlMessages: noop, setIsProcessing: noop,
      setPersistedLessonDNA: noop, handleGenerate: generate,
      addToast: noop, warnLog: noop, t: () => undefined,
    });

    expect(generate).toHaveBeenCalledTimes(1);
    const dispatchSnapshot = generate.mock.calls[0][6];
    expect(dispatchSnapshot).toMatchObject({
      gradeLevel: '6th Grade', leveledTextLanguage: 'Spanish', selectedLanguages: ['Spanish'],
      translationMode: 'always', currentUiLanguage: 'English',
      differentiationRange: 'None', differentiationTypes: ['quiz'], dokLevel: '3',
      useEmojis: true, textFormat: 'Headings', imageGenerationStyle: 'diagram', imageAspectRatio: '16:9',
      generationOptions: { quizMode: 'reviewed-exam', quizMcqCount: 7 },
      backend: 'gemini', model: 'reviewed-model', imageProvider: 'imagen', imageModel: 'reviewed-image-model',
    });
    expect(generate.mock.calls[0][4]).toMatchObject({
      quizMode: 'reviewed-exam', quizMcqCount: 7,
      customInstructions: 'Reviewed quiz note.',
    });
    expect(run.settingsStale).toBe(true);
    expect(run.staleSettings).toEqual(expect.arrayContaining(['gradeLevel', 'language', 'translationMode', 'differentiationRange', 'dokLevel', 'imageGenerationStyle', 'toolOverrides', 'generationOptions']));
  });

  it('prefers a changed editor source at execution and records the explicit choice', async () => {
    const matrix = window.AlloModules.GenerationMatrix;
    const analyzedText = 'The old analyzed source.';
    const editorText = 'The teacher changed the source in the editor.';
    const oldFingerprint = matrix.fingerprintSourceText(analyzedText);
    const oldAnalysis = { id: 'analysis-old-runtime', type: 'analysis', sourceFingerprint: oldFingerprint, data: { originalText: analyzedText } };
    const activeBlueprint = {
      sourcePolicy: { kind: 'workspace-source', selectedSource: 'latest-analysis' },
      globalSettings: { gradeLevel: '6th Grade', language: 'English', sourceFingerprint: oldFingerprint },
      resourcePlan: [{
        tool: 'analysis', uiId: 'source-choice-runtime', sourceFingerprint: oldFingerprint,
        generationAction: 'reuse', existingArtifactId: oldAnalysis.id,
        generationVariants: [{ generationIdentity: 'gm-old-analysis', action: 'reuse', existingArtifactId: oldAnalysis.id, sourceFingerprint: oldFingerprint, language: 'English' }],
      }],
    };
    let run = null;
    const applyRun = (next) => { run = typeof next === 'function' ? next(run) : next; };
    const noop = () => {};
    const generate = vi.fn(async () => ({ id: 'analysis-current-runtime', type: 'analysis', data: { originalText: editorText } }));
    await PhaseO.handleExecuteBlueprint({
      activeBlueprint, gradeLevel: '6th Grade', leveledTextLanguage: 'English', currentUiLanguage: 'English',
      selectedLanguages: [], studentInterests: [], standardsInput: '', targetStandards: [], dokLevel: '2',
      differentiationRange: 'None', differentiationTypes: [], differentiationCustomGrades: [],
      sourceTopic: '', inputText: editorText, history: [oldAnalysis],
      setGradeLevel: noop, setSourceTone: noop, applyDetailedAutoConfig: noop,
      setIsExecutingBlueprint: noop, setBlueprintExecutionResult: applyRun,
      setGuidedFlowState: noop, setUdlMessages: noop, setIsProcessing: noop,
      setPersistedLessonDNA: noop, handleGenerate: generate,
      addToast: noop, warnLog: noop, t: () => undefined,
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][3]).toBe(editorText);
    expect(generate.mock.calls[0][4].sourceFingerprint).toBe(matrix.fingerprintSourceText(editorText));
    expect(run.sourceSelection).toMatchObject({
      selectedSource: 'current-editor', reviewedSelection: 'latest-analysis',
      divergentFromLatestAnalysis: true, sourceChoiceRequired: false,
    });
    expect(run.rows['source-choice-runtime']).toMatchObject({ sourceChanged: true, status: 'landed' });
  });
});

describe('Blueprint Generation Matrix load-failure gate', () => {
  const removeMatrix = () => {
    const saved = window.AlloModules.GenerationMatrix;
    delete window.AlloModules.GenerationMatrix;
    return () => { window.AlloModules.GenerationMatrix = saved; };
  };

  it('rejects direct execution before any resource call when the matrix module is absent', async () => {
    const restore = removeMatrix();
    const generate = vi.fn();
    try {
      await expect(PhaseO.executeOneBlueprint({
        resourcePlan: [{ tool: 'quiz', uiId: 'matrix-blocked-direct' }],
      }, { handleGenerate: generate })).rejects.toMatchObject({
        name: 'BlueprintGenerationMatrixUnavailableError',
        code: 'BLUEPRINT_GENERATION_MATRIX_UNAVAILABLE',
        reasonCode: 'generation-matrix-unavailable',
        isRetryable: true,
        matrixUnavailableRows: ['matrix-blocked-direct'],
      });
      expect(generate).not.toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  it('records a retryable waiting run and makes no call when the module is absent', async () => {
    const restore = removeMatrix();
    const generate = vi.fn();
    let run = null;
    const toasts = [];
    try {
      const blocked = await PhaseO.handleExecuteBlueprint({
        activeBlueprint: { resourcePlan: [{ tool: 'quiz', uiId: 'matrix-blocked-full' }] },
        setBlueprintExecutionResult: (next) => { run = typeof next === 'function' ? next(run) : next; },
        setIsExecutingBlueprint: vi.fn(),
        setUdlMessages: vi.fn(),
        addToast: (message, level) => toasts.push({ message, level }),
        warnLog: vi.fn(),
        t: () => undefined,
        handleGenerate: generate,
      });

      expect(generate).not.toHaveBeenCalled();
      expect(blocked).toBe(run);
      expect(run).toMatchObject({
        status: 'waiting',
        done: true,
        retryable: true,
        reasonCode: 'generation-matrix-unavailable',
        generationMatrixUnavailable: true,
        generationMatrixStatus: 'unavailable',
        generationMatrixGuarantees: { exactDedupe: false, exactFanOut: false, dispatchBlocked: true },
        matrixUnavailableRows: ['matrix-blocked-full'],
      });
      expect(run.rows['matrix-blocked-full']).toMatchObject({
        status: 'planned',
        generationMatrixUnavailable: true,
        blockedReason: 'generation-matrix-unavailable',
        retryable: true,
      });
      expect(toasts.at(-1)).toMatchObject({ level: 'warning' });
    } finally {
      restore();
    }
  });

  it('keeps a runtime resolution failure retryable instead of dispatching a legacy fallback', async () => {
    const saved = window.AlloModules.GenerationMatrix;
    window.AlloModules.GenerationMatrix = {
      resolveGenerationMatrix: () => { throw new Error('module still initializing'); },
    };
    const generate = vi.fn();
    let run = null;
    const noop = () => {};
    try {
      await PhaseO.handleExecuteBlueprint({
        activeBlueprint: { globalSettings: { gradeLevel: '6th Grade', language: 'English' }, resourcePlan: [{ tool: 'quiz', uiId: 'matrix-resolution-blocked' }] },
        gradeLevel: '6th Grade', leveledTextLanguage: 'English', currentUiLanguage: 'English',
        selectedLanguages: [], studentInterests: [], sourceTopic: '', inputText: 'Source text', history: [],
        standardsInput: '', targetStandards: [], dokLevel: '2', differentiationRange: 'None', differentiationTypes: [], differentiationCustomGrades: [],
        setGradeLevel: noop, setSourceTone: noop, applyDetailedAutoConfig: noop,
        setIsExecutingBlueprint: noop,
        setBlueprintExecutionResult: (next) => { run = typeof next === 'function' ? next(run) : next; },
        setGuidedFlowState: noop, setUdlMessages: noop, setIsProcessing: noop,
        setPersistedLessonDNA: noop, addToast: noop, warnLog: noop,
        t: () => undefined, handleGenerate: generate,
      });

      expect(generate).not.toHaveBeenCalled();
      expect(run).toMatchObject({
        status: 'waiting', done: true, retryable: true,
        reasonCode: 'generation-matrix-unavailable', generationMatrixUnavailable: true,
      });
      expect(run.rows['matrix-resolution-blocked']).toMatchObject({
        status: 'planned', generationMatrixUnavailable: true,
        blockedReason: 'generation-matrix-unavailable', retryable: true,
      });
    } finally {
      window.AlloModules.GenerationMatrix = saved;
    }
  });

  it('blocks rebuild before marking the row running and preserves a retryable run', async () => {
    const restore = removeMatrix();
    const generate = vi.fn();
    let run = {
      runId: 'matrix-rebuild-run', status: 'partial', done: true,
      rows: { 'matrix-rebuild-row': { uiId: 'matrix-rebuild-row', tool: 'quiz', status: 'failed' } },
    };
    try {
      await PhaseO.handleRebuildBlueprintStep({
        activeBlueprint: { resourcePlan: [{ tool: 'quiz', uiId: 'matrix-rebuild-row' }] },
        blueprintExecutionResult: run,
        history: [],
        setBlueprintExecutionResult: (next) => { run = typeof next === 'function' ? next(run) : next; },
        handleGenerate: generate,
        addToast: vi.fn(), t: () => undefined, warnLog: vi.fn(),
      }, 'matrix-rebuild-row');

      expect(generate).not.toHaveBeenCalled();
      expect(run).toMatchObject({
        status: 'waiting', retryable: true,
        reasonCode: 'generation-matrix-unavailable', generationMatrixUnavailable: true,
      });
      expect(run.rows['matrix-rebuild-row']).toMatchObject({
        status: 'failed',
        generationMatrixUnavailable: true,
        generationMatrixStatus: 'unavailable',
        blockedReason: 'generation-matrix-unavailable',
        retryable: true,
      });
    } finally {
      restore();
    }
  });
});
