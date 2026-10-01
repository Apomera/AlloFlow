import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let Matrix, FullPack, PhaseO, Dispatcher, activityBranch;
const BASE = { sourceText: 'A reliable source text for the pack.', gradeLevel: '5th Grade', language: 'English' };
beforeAll(() => {
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('generation_helpers_source.jsx');
  loadAlloModule('phase_o_misc_handlers_source.jsx');
  loadAlloModule('generate_dispatcher_source.jsx');
  Matrix = window.AlloModules.GenerationMatrix;
  FullPack = window.AlloModules.GenerationHelpers;
  PhaseO = window.AlloModules.PhaseOHandlers;
  Dispatcher = window.AlloModules.GenDispatcher;
  // Execute the actual activity branch with a deterministic provider seam.
  // AST selection survives formatting changes and does not assert source text.
  const source = readFileSync('generate_dispatcher_source.jsx', 'utf8');
  const ast = require('@babel/parser').parse(source, { sourceType: 'script', plugins: ['jsx'] });
  const traverse = require('@babel/traverse').default;
  traverse(ast, {
    IfStatement(path) {
      const test = path.node.test;
      if (test.type !== 'BinaryExpression' || test.left.name !== 'type' || test.right.value !== 'brainstorm') return;
      if (path.node.consequent.type !== "BlockStatement" || !path.node.consequent.body.some(node => node.type === 'VariableDeclaration'
        && node.declarations.some(declaration => declaration.id.name === 'normalizedActivity'))) return;
      activityBranch = source.slice(path.node.consequent.start + 1, path.node.consequent.end - 1);
    }
  });
  if (!activityBranch) throw new Error('Activity generation branch missing');
});
afterEach(() => vi.useRealTimers());
function artifactFor(row, settings = BASE) {
  const cell = Matrix.resolveGenerationMatrix(row, settings).variants[0];
  return { ...cell, id: 'existing-' + row.type, type: row.type, gradeLevel: cell.grade, data: {} };
}
function action(row, settings, existing) {
  return Matrix.resolveGenerationMatrix(row, { ...BASE, ...settings, existingArtifacts: [existing] }).action;
}

describe('main-resource generation identity behavior', () => {
  it('invalidates quiz reuse when image placement changes', () => {
    const quiz = { type: 'quiz' };
    const artifact = artifactFor(quiz, { ...BASE, mcqVisualMode: 'none' });
    expect(action(quiz, { mcqVisualMode: 'none' }, artifact)).toBe('reuse');
    for (const mode of ['question', 'options', 'both']) expect(action(quiz, { mcqVisualMode: mode }, artifact)).not.toBe('reuse');
  });
  it('changes visual quiz identity for inherited/explicit image style, while nonvisual quizzes remain reusable', () => {
    const quiz = { type: 'quiz' };
    const imageSettings = { ...BASE, mcqVisualMode: 'both', universalImageStyle: 'watercolor' };
    const artifact = artifactFor(quiz, imageSettings);
    expect(action(quiz, imageSettings, artifact)).toBe('reuse');
    expect(action(quiz, { ...imageSettings, universalImageStyle: 'photographic' }, artifact)).not.toBe('reuse');
    expect(action({ type: 'quiz', config: { imageStyle: 'line art' } }, imageSettings, artifact)).not.toBe('reuse');
    const noImages = artifactFor(quiz, { ...BASE, mcqVisualMode: 'none', universalImageStyle: 'watercolor' });
    expect(action(quiz, { mcqVisualMode: 'none', universalImageStyle: 'photographic' }, noImages)).toBe('reuse');
  });
  it('uses effective per-row quiz overrides ahead of global settings', () => {
    const row = { type: 'quiz', config: { mcqVisualMode: 'options', imageStyle: 'line art' } };
    const fields = Matrix.projectEffectiveGenerationConfig(row, { ...BASE, mcqVisualMode: 'question', universalImageStyle: 'watercolor' }).fields;
    expect(fields.mcqVisualMode).toBe('options');
    expect(fields.imageStyle).toBe('line art');
  });
  it('gives omitted, explicit and invalid idea modes the same exact identity and reuse decision', () => {
    const rows = [{ type: 'brainstorm' }, { type: 'brainstorm', activityMode: 'ideas' },
      { type: 'brainstorm', activityMode: 'unsupported', activityConfig: { groupSize: 6, protocol: 'fishbowl' } }];
    const ids = rows.map(row => Matrix.buildGenerationIdentity(row, BASE));
    expect(new Set(ids).size).toBe(1);
    const prior = artifactFor(rows[0]);
    rows.forEach(row => expect(action(row, {}, prior)).toBe('reuse'));
  });
  it('normalizes equivalent discussion placement/case/defaults and distinguishes selected protocols', () => {
    const top = { type: 'brainstorm', activityMode: 'discussion', activityConfig: { protocol: 'fishbowl' } };
    const nested = { type: 'brainstorm', config: { activityMode: ' DISCUSSION ', activityConfig: { protocol: ' FISHBOWL ', groupSize: 6 } } };
    expect(Matrix.normalizeActivityOptions(nested)).toEqual({ activityMode: 'discussion', activityConfig: { protocol: 'fishbowl' } });
    expect(Matrix.buildGenerationIdentity(top, BASE)).toBe(Matrix.buildGenerationIdentity(nested, BASE));
    expect(Matrix.buildGenerationIdentity(top, BASE)).toBe(Matrix.buildGenerationIdentity({ type: 'brainstorm' }, {
      ...BASE, toolOverrides: { brainstorm: { activityMode: 'discussion', activityConfig: { protocol: 'fishbowl' } } }
    }));
    const prior = artifactFor(top);
    expect(action(nested, {}, prior)).toBe('reuse');
    expect(action({ ...top, activityConfig: { protocol: 'gallery-walk' } }, {}, prior)).not.toBe('reuse');
    expect(Matrix.buildGenerationIdentity({ ...top, activityConfig: {} }, BASE))
      .toBe(Matrix.buildGenerationIdentity({ ...top, activityConfig: { protocol: 'invalid' } }, BASE));
  });
  it('normalizes jigsaw size and discards irrelevant fields before comparing reuse', () => {
    const row = { type: 'brainstorm', activityMode: 'jigsaw', activityConfig: { groupSize: 3 } };
    const equivalent = { ...row, activityConfig: { groupSize: '3.7', protocol: 'fishbowl', hidden: 'irrelevant' } };
    expect(Matrix.normalizeActivityOptions(equivalent)).toEqual({ activityMode: 'jigsaw', activityConfig: { groupSize: 3 } });
    expect(action(equivalent, {}, artifactFor(row))).toBe('reuse');
    expect(action({ ...row, activityConfig: { groupSize: 5 } }, {}, artifactFor(row))).not.toBe('reuse');
    const defaultSize = { ...row, activityConfig: { groupSize: 4 } };
    for (const size of [undefined, 0, 9, 'bad']) {
      expect(Matrix.buildGenerationIdentity({ ...row, activityConfig: { groupSize: size } }, BASE))
        .toBe(Matrix.buildGenerationIdentity(defaultSize, BASE));
    }
  });
});

function packFixture(resourcePlan, overrides = {}) {
  let latestRun;
  const deps = {
    isProcessing: false, fullPackTargetGroup: 'none', rosterKey: null,
    gradeLevel: '5th Grade', leveledTextLanguage: 'English', translationMode: 'auto', currentUiLanguage: 'English',
    studentInterests: [], dokLevel: '', leveledTextCustomInstructions: '', selectedLanguages: [],
    differentiationRange: 'None', differentiationTypes: [], differentiationCustomGrades: [], targetStandards: [],
    useEmojis: false, textFormat: 'Standard Text', imageGenerationStyle: 'Auto', imageAspectRatio: '16:9',
    aiProviderProfile: { backend: 'gemini', model: 'gemini-test', imageProvider: 'auto', imageModel: 'imagen-test', isLocal: false },
    history: [], inputText: BASE.sourceText, sourceTopic: 'Test topic', standardsInput: '', standardsContext: null,
    instructionalContext: { primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' },
    resourceCount: '5', isAutoConfigEnabled: true,
    setFullPackRun: update => { latestRun = typeof update === 'function' ? update(latestRun) : update; },
    addToast: vi.fn(), t: key => key, warnLog: vi.fn(),
    autoConfigureSettings: vi.fn(async () => ({ resourcePlan })),
    getGroupDifferentiationContext: () => '', getAssetManifest: () => [], getDifferentiationGrades: grade => [grade],
    handleGenerate: vi.fn(async (type, language, keep, text, config) => ({ id: 'resource-' + config.generationIdentity, type, data: {} })),
    ...overrides
  };
  for (const field of ['quizCustomInstructions', 'adventureCustomInstructions', 'frameCustomInstructions', 'brainstormCustomInstructions',
    'faqCustomInstructions', 'outlineCustomInstructions', 'visualCustomInstructions', 'timelineTopic', 'lessonCustomAdditions', 'conceptInput',
    'glossaryCustomInstructions', 'personaCustomInstructions', 'conceptSortCustomInstructions', 'dbqCustomInstructions',
    'noteTakingCustomInstructions', 'anchorChartCustomInstructions']) if (!(field in deps)) deps[field] = '';
  for (const setter of ['setIsProcessing', 'setGenerationStep', 'setFullPackTargetGroup', 'setGradeLevel', 'setLeveledTextLanguage',
    'setStudentInterests', 'setDokLevel', 'setLeveledTextCustomInstructions', 'setSelectedLanguages', 'setTargetStandards', 'setUseEmojis',
    'setTextFormat', 'setPersistedLessonDNA', 'setError', 'handleApplyRosterGroup', 'applyDetailedAutoConfig']) if (!deps[setter]) deps[setter] = vi.fn();
  return { deps, getRun: () => latestRun };
}
async function runTimers(promise) {
  await vi.runAllTimersAsync();
  return promise;
}
describe('Full Pack activity row execution and retry', () => {
  it('preserves different per-row options from auto-plan through reviewed execution', async () => {
    vi.useFakeTimers();
    const fixture = packFixture([
      { tool: 'brainstorm', uiId: 'discussion-row', config: { activityMode: 'discussion', activityConfig: { protocol: 'gallery-walk' } } },
      { tool: 'brainstorm', uiId: 'jigsaw-row', activityMode: 'jigsaw', activityConfig: { groupSize: 5 } }
    ]);
    await runTimers(FullPack.handlePlanFullPack(fixture.deps));
    const reviewed = fixture.getRun();
    expect(reviewed.status).toBe('ready');
    expect(reviewed.preflight.selected).toEqual(expect.arrayContaining([
      expect.objectContaining({ activityMode: 'discussion', activityConfig: { protocol: 'gallery-walk' } }),
      expect.objectContaining({ activityMode: 'jigsaw', activityConfig: { groupSize: 5 } })
    ]));
    await runTimers(FullPack.handleApproveFullPack(reviewed, fixture.deps));
    const calls = fixture.deps.handleGenerate.mock.calls.filter(call => call[0] === 'brainstorm');
    expect(calls).toHaveLength(2);
    expect(calls.map(call => [call[4].activityMode, call[4].activityConfig])).toEqual([
      ['discussion', { protocol: 'gallery-walk' }], ['jigsaw', { groupSize: 5 }]
    ]);
    expect(fixture.getRun().status).toBe('completed');
  });
  it('retains a failed row’s activity options on manual retry after automatic retries are exhausted', async () => {
    vi.useFakeTimers();
    let fail = true;
    const generate = vi.fn(async (type) => {
      if (fail) throw new Error('network temporarily unavailable');
      return { id: 'recovered-jigsaw', type, data: {} };
    });
    const fixture = packFixture([{ tool: 'brainstorm', activityMode: 'jigsaw', activityConfig: { groupSize: 6 } }], { handleGenerate: generate });
    await runTimers(FullPack.handleGenerateFullPack(null, fixture.deps));
    const failed = fixture.getRun();
    expect(Object.values(failed.resources).some(row => row.status === 'failed')).toBe(true);
    expect(generate.mock.calls.length).toBeGreaterThan(1);
    fail = false;
    generate.mockClear();
    await runTimers(FullPack.handleRetryFailedFullPack(failed, fixture.deps));
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][4]).toMatchObject({ activityMode: 'jigsaw', activityConfig: { groupSize: 6 } });
    expect(fixture.getRun().status).toBe('completed');
  });
});

describe('Blueprint per-row activity execution and rebuild', () => {
  const row = { tool: 'brainstorm', uiId: 'activity-row', config: { activityMode: ' JIGSAW ', activityConfig: { groupSize: '5' } } };
  it('dispatches nested reviewed mode and group-size options intact', async () => {
    const generate = vi.fn(async type => ({ id: 'jigsaw-artifact', type, data: {} }));
    const result = await PhaseO.executeOneBlueprint({ resourcePlan: [row], globalSettings: BASE }, {
      handleGenerate: generate, historyOverride: [], settingsSnapshot: BASE
    });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][4]).toMatchObject({ activityMode: 'jigsaw', activityConfig: { groupSize: 5 } });
    expect(result.items).toHaveLength(1);
  });
  it('rebuilds a discussion row with its nested protocol instead of defaulting to ideas', async () => {
    let run = { runId: 'blueprint-retry', rows: { 'activity-row': { uiId: 'activity-row', status: 'failed', resourceId: null } }, settingsSnapshot: BASE };
    const generate = vi.fn(async type => ({ id: 'rebuilt-discussion', type, data: {} }));
    const result = await PhaseO.handleRebuildBlueprintStep({
      activeBlueprint: { resourcePlan: [{ ...row, config: { activityMode: 'discussion', activityConfig: { protocol: 'fishbowl' } } }], globalSettings: BASE },
      blueprintExecutionResult: run, persistedLessonDNA: null, history: [],
      setBlueprintExecutionResult: update => { run = typeof update === 'function' ? update(run) : update; },
      handleGenerate: generate, addToast: vi.fn(), t: () => '', warnLog: vi.fn()
    }, 'activity-row');
    expect(result.id).toBe('rebuilt-discussion');
    expect(generate.mock.calls[0][4]).toMatchObject({ activityMode: 'discussion', activityConfig: { protocol: 'fishbowl' } });
  });
});

async function dispatchActivity(configOverride, response) {
  let capturedPrompt;
  const deps = {
    configOverride, _generationMatrixModule: Matrix, content: null, metaInfo: '',
    DISCUSSION_PROTOCOLS: ['think-pair-share', 'socratic-seminar', 'fishbowl', 'gallery-walk'],
    t: () => '', setGenerationStatus: vi.fn(), setGenerationStep: vi.fn(), setGenerationTaskProgress: vi.fn(),
    usesLocalTextBackend: false, textToProcess: BASE.sourceText, effectiveGrade: '5th Grade',
    studentInterests: [], standardsPromptString: '', dokDirective: '', effCustomInstructions: '', languageDirective: '', differentiationContext: '',
    normalizeDiscussionKit: Dispatcher.normalizeDiscussionKit, normalizeJigsawActivity: Dispatcher.normalizeJigsawActivity,
    generateStructuredActivityWithRecovery: async (prompt, normalize) => {
      capturedPrompt = prompt;
      return { value: normalize(response), attempts: 1 };
    }
  };
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const result = await new AsyncFunction(...Object.keys(deps), activityBranch + '\nreturn {content,metaInfo};')(...Object.values(deps));
  return { ...result, prompt: capturedPrompt };
}
describe('dispatcher uses the same normalized activity options as planning', () => {
  it('uses the selected protocol in the prompt and the resulting discussion artifact', async () => {
    const result = await dispatchActivity({ activityMode: ' DISCUSSION ', activityConfig: { protocol: ' GALLERY-WALK ' } }, {
      title: 'Discussion', questionSets: [{ depth: 'literal', questions: ['What happened?'] }]
    });
    expect(result.content[0]).toMatchObject({ kind: 'discussion', protocol: 'gallery-walk' });
    expect(result.prompt).toContain('"gallery-walk" protocol');
  });
  it('uses the normalized chosen group size in the prompt and resulting jigsaw artifact', async () => {
    const result = await dispatchActivity({ activityMode: 'jigsaw', activityConfig: { groupSize: '3.7' } }, {
      title: 'Jigsaw', chunks: [1, 2, 3].map(number => ({ label: 'Group ' + number, expertPacket: 'Packet ' + number })),
      homeGroupTask: 'Combine the parts.', accountabilityCheck: [{ q: 'Explain.', answer: 'Answer.' }]
    });
    expect(result.content[0]).toMatchObject({ kind: 'jigsaw', groupSize: 3 });
    expect(result.prompt).toContain('into 3 ');
  });
});
