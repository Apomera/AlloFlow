// Passage-path baseline (2026-10-28). Records what the app does today when a
// teacher works from a source passage: the prompt each generator sends to the
// model, the no-source gate, and the plans Full Pack and Blueprint build.
// The planned seed flow (start from a word list, topic, premise or another
// resource) must ADD behavior only; these baselines prove the passage path did
// not move. If you changed a prompt or plan ON PURPOSE, refresh the baselines:
//   npx vitest run tests/passage_path_baseline.test.js -u
// and review the diff under tests/__baselines__/passage_path/ like any code change.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// ALLO_*_CANDIDATE env vars point at mutated copies for mutation checks.
let dispatcher, contract, FullPack, Contracts, BlueprintService;
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-02T15:00:00Z') });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('prompts_library_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('utils_pure_module.js');
  loadAlloModule('allo_data_module.js');
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule(process.env.ALLO_GENERATION_HELPERS_CANDIDATE || 'generation_helpers_source.jsx');
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule(process.env.ALLO_BLUEPRINT_SERVICE_CANDIDATE || 'agent_core_blueprint_service_module.js');
  contract = window.AlloModules.InstructionalContext;
  FullPack = window.AlloModules.GenerationHelpers;
  Contracts = window.AlloModules.AgentCoreContracts;
  BlueprintService = window.AlloModules.AgentCoreBlueprintService;
  // The editable dispatcher source is what the seed work will change.
  new Function(readFileSync(process.env.ALLO_DISPATCHER_CANDIDATE || 'generate_dispatcher_source.jsx', 'utf8'))();
  dispatcher = window.AlloModules.GenDispatcher;
  if (!dispatcher || !FullPack || !Contracts || !BlueprintService) throw new Error('baseline modules failed to load');
});
afterAll(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const noop = () => {};
// Unset host deps: a name the dispatcher CALLS gets a no-op; anything else stays
// undefined, as an unset option is in the app (a no-op function would read as a
// truthy flag and send prompts down branches no teacher can reach).
const CALLED = new Set([...readFileSync(process.env.ALLO_DISPATCHER_CANDIDATE || 'generate_dispatcher_source.jsx', 'utf8')
  .matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const BASE = './__baselines__/passage_path/';
const PASSAGE = 'The Moon orbits Earth about once every 27 days. Its gravity pulls on the oceans and creates tides. '
  + 'Long ago, people used the phases of the Moon to keep track of time and to plan planting and harvests.';

function analysisItem() {
  return {
    id: 'moon-analysis', type: 'analysis', unitId: 'lesson', sourceFamilyId: 'moon-family', title: 'Moon reading',
    config: { language: 'English' },
    sourceSnapshot: contract.createSourceSnapshot(PASSAGE, { sourceArtifactId: 'moon-analysis', language: 'English' }),
    data: {
      analysisSourceVersion: 1, reportLanguage: 'English', sourceLanguage: 'English',
      originalText: PASSAGE, rawEnglishText: PASSAGE,
      readingLevel: { range: '5th Grade', explanation: 'Short informational text.' },
      concepts: ['orbit', 'gravity', 'tides', 'phases'], accuracy: { rating: 'Not checked', reason: '' }, grammar: [],
    },
  };
}

function fixture(overrides = {}) {
  const prompts = [];
  const callGemini = vi.fn(async (prompt) => { prompts.push(String(prompt)); return '[]'; });
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [analysisItem()], inputText: PASSAGE, activeUnitId: 'lesson',
    selectedReadingSourceId: 'moon-analysis', differentiationRange: 'None', leveledTextLanguage: 'English',
    selectedLanguages: [], studentInterests: [], guidedMode: false, guidedStep: 0, standardsInput: '',
    targetStandards: [], standardsPromptString: '', sourceTopic: 'The Moon', currentUiLanguage: 'English',
    generatedContent: null, audioRef: { current: null }, alloBotRef: { current: null }, GUIDED_STEPS: [],
    checkAccuracyWithSearch: false, callGemini,
    extractSourceTextForProcessing: text => ({ text, englishBlock: '', isBilingual: false }),
    cleanJson: String, getGroupDifferentiationContext: () => '', getDefaultTitle: type => type, t: key => key,
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }),
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '', glossaryTier2Count: 2, glossaryTier3Count: 2,
    chunkText: text => [text], countWords: text => text.trim().split(/\s+/).length,
    textFormat: 'Standard Text', leveledTextLength: 'Same as Source', keepCitations: false,
    quizMcqCount: 3, quizReflectionCount: 1, faqCount: 3, mathInput: 'tides and the Moon',
    timelineMode: 'auto', timelineItemCount: 6, noteTakingTemplateType: 'cornell-notes', selectedConcepts: [],
    TIMELINE_MODE_DEFINITIONS: window.AlloModules.AlloData.TIMELINE_MODE_DEFINITIONS,
    // App defaults (AlloFlowANTI.txt useState / glossary reducer initial state).
    glossaryDefinitionLevel: 'Same as Source Text', outlineType: 'Venn Diagram', frameType: 'Sentence Starters',
    bridgeSimType: 'react', bridgeStepCount: 5,
    // The host's formatLessonDNA returns '' when no lesson DNA is saved (persistedLessonDNA is null).
    formatLessonDNA: dna => (dna ? (() => { throw new Error('baseline assumes no lesson DNA'); })() : ''),
    // Same positional adapter the host defines (AlloFlowANTI.txt buildLessonPlanPrompt).
    buildLessonPlanPrompt: (context, assetManifest, language, customAdditions) => window.AlloModules.PromptsLibrary.buildLessonPlanPrompt({
      context, assetManifest, language, customAdditions, gradeLevel: '5th Grade', sourceTopic: 'The Moon',
      translationPolicy: { enabled: false, target: '', mode: 'auto' } }),
    getLessonContext: (...a) => window.AlloModules.ExportHandlers.getLessonContext(...a),
    getAssetManifest: (...a) => window.AlloModules.UtilsPure.getAssetManifest(...a),
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : (typeof key === 'string' && CALLED.has(key) ? noop : undefined) });
  return { deps, prompts, callGemini };
}

// The model always answers "[]", so each generator sends its main prompt and then
// stops at its own empty-result guard. The prompt is the baseline.
async function promptsFor(type) {
  const f = fixture(type === 'analysis' ? { history: [], selectedReadingSourceId: '' } : {});
  try { await dispatcher.handleGenerate(type, null, false, null, { rethrowErrors: true }, true, f.deps); } catch (e) { if (process.env.BASELINE_DEBUG) console.log('ERRDBG', type, String(e && e.stack).split('\n').slice(0, 3).join(' | ')); }
  return f.prompts;
}

const TYPES = ['analysis', 'simplified', 'glossary', 'sentence-frames', 'faq', 'note-taking', 'anchor-chart',
  'quiz', 'concept-sort', 'timeline', 'math', 'memory-aid', 'applied-challenge', 'brainstorm', 'outline',
  'image', 'dbq', 'persona', 'adventure', 'lesson-plan', 'gemini-bridge'];

describe('passage path: the prompt each generator sends', () => {
  it.each(TYPES)('%s', async type => {
    const prompts = await promptsFor(type);
    expect(prompts.length, type + ' sent no prompt').toBeGreaterThan(0);
    expect(prompts.every(p => p.length > 200), type + ' sent a placeholder prompt').toBe(true);
    expect(await promptsFor(type), type + ' prompt is not deterministic').toEqual(prompts);
    await expect(prompts.join('\n\n======== NEXT PROMPT ========\n\n')).toMatchFileSnapshot(BASE + 'prompts/' + type + '.txt');
  });
});

describe('no source and no seed: generation stops before any AI call', () => {
  const empty = () => fixture({ history: [], inputText: '', selectedReadingSourceId: '' });
  it.each(TYPES)('%s', async type => {
    const batch = empty();
    let error = null;
    try { await dispatcher.handleGenerate(type, null, false, null, { rethrowErrors: true }, true, batch.deps); } catch (e) { error = e; }
    expect(error && error.code, 'batch callers get allo/source-missing').toBe('allo/source-missing');
    const button = empty();
    await expect(dispatcher.handleGenerate(type, null, false, null, {}, true, button.deps)).resolves.toBeUndefined();
    expect(batch.callGemini.mock.calls.length + button.callGemini.mock.calls.length, 'no AI call without a source').toBe(0);
  });

  it('alignment-report is exempt from the gate and asks for resources instead', async () => {
    const batch = empty();
    let error = null;
    try { await dispatcher.handleGenerate('alignment-report', null, false, null, { rethrowErrors: true }, true, batch.deps); } catch (e) { error = e; }
    expect(error && error.code).not.toBe('allo/source-missing');
    expect(String(error && error.message)).toMatch(/No resources found to audit/);
    expect(batch.callGemini).not.toHaveBeenCalled();
  });
});

// Plans keep every field except per-run ids and timestamps.
const VOLATILE = /^(runId|id|createdAt|updatedAt|startedAt|timestamp|approvedAt|plannedAt)$/;
const stable = value => JSON.stringify(value, (key, v) => (VOLATILE.test(key) ? undefined : v), 2);
// What decides behavior: row order, type, directive, reuse/new action and the
// generation config (its fingerprint catches any config drift compactly).
const packView = preflight => ({
  selected: preflight.selected.map(row => ({
    index: row.index, type: row.type, directive: row.directive, action: row.action, generationAction: row.generationAction,
    existingArtifactId: row.existingArtifactId, novelResource: row.novelResource, generationPolicy: row.generationPolicy,
    generationConfigFingerprint: row.generationConfigFingerprint, generationConfig: row.generationConfig,
    variants: (row.generationVariants || []).map(v => ({ action: v.action, reason: v.reason, grade: v.grade, language: v.language,
      existingArtifactId: v.existingArtifactId, generationConfigFingerprint: v.generationConfigFingerprint })),
  })),
  skipped: preflight.skipped, readingSource: preflight.readingSource,
  estimatedProviderCalls: preflight.estimatedProviderCalls, estimatedResourceGenerations: preflight.estimatedResourceGenerations,
  summary: preflight.generationMatrix && preflight.generationMatrix.summary,
});
const blueprintView = (dry, planned) => ({
  dryRun: { ok: dry.ok, approvalRequired: dry.approvalRequired, errors: dry.errors, missingCapabilities: dry.missingCapabilities,
    requiredCapabilities: dry.requiredCapabilities,
    steps: dry.steps.map(s => ({ index: s.index, tool: s.tool, status: s.status, commandId: s.commandId, directive: s.directive,
      generationAction: s.generationAction, expectedCalls: s.expectedCalls, generationConfigFingerprint: s.generationConfigFingerprint })) },
  execution: { errors: planned.errors, legacyConfig: planned.legacyConfig && {
    recommendedResources: planned.legacyConfig.recommendedResources, resourcePlan: planned.legacyConfig.resourcePlan,
    toolDirectives: planned.legacyConfig.toolDirectives, sourcePolicy: planned.legacyConfig.sourcePolicy,
    globalSettings: planned.legacyConfig.globalSettings } },
});

const PLAN = TYPES.filter(type => type !== 'analysis').map(tool => ({ tool, directive: 'Teach the Moon and tides: ' + tool + '.' }));
function packDeps(overrides = {}) {
  return Object.assign({
    isProcessing: false, fullPackTargetGroup: 'none', rosterKey: null,
    gradeLevel: '5th Grade', leveledTextLanguage: 'English', translationMode: 'auto', currentUiLanguage: 'English',
    studentInterests: [], dokLevel: '', leveledTextCustomInstructions: '', selectedLanguages: [],
    differentiationRange: 'None', differentiationTypes: ['simplified'], differentiationCustomGrades: [],
    targetStandards: [], useEmojis: false, textFormat: 'Standard Text', imageGenerationStyle: 'Auto', imageAspectRatio: '16:9',
    aiProviderProfile: { backend: 'gemini', model: 'gemini-test', imageProvider: 'auto', imageModel: 'imagen-test', isLocal: false },
    history: [], inputText: PASSAGE, sourceTopic: 'The Moon', standardsInput: '', standardsContext: null,
    instructionalContext: { primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' },
    resourceCount: 'Auto', isAutoConfigEnabled: true,
    setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setFullPackTargetGroup: vi.fn(), setGradeLevel: vi.fn(),
    setLeveledTextLanguage: vi.fn(), setStudentInterests: vi.fn(), setDokLevel: vi.fn(), setLeveledTextCustomInstructions: vi.fn(),
    setSelectedLanguages: vi.fn(), setTargetStandards: vi.fn(), setUseEmojis: vi.fn(), setTextFormat: vi.fn(),
    setPersistedLessonDNA: vi.fn(), setError: vi.fn(), addToast: vi.fn(), t: key => key, warnLog: vi.fn(),
    handleApplyRosterGroup: vi.fn(),
    autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'analysis', directive: 'Analyze the Moon text.' }, ...PLAN] })),
    applyDetailedAutoConfig: vi.fn(), getGroupDifferentiationContext: vi.fn(() => ''), getAssetManifest: vi.fn(() => []),
    getDifferentiationGrades: vi.fn(grade => [grade]),
    handleGenerate: vi.fn(async type => ({ id: 'resource-' + type, type, data: {} })),
  }, overrides);
}
async function planPack(overrides = {}) {
  let run = null;
  const deps = packDeps(Object.assign({ setFullPackRun: next => { run = typeof next === 'function' ? next(run) : next; } }, overrides));
  await FullPack.handlePlanFullPack(deps);
  expect(run && run.status, 'the plan should be ready for review').toBe('ready');
  expect(deps.handleGenerate, 'planning must not generate').not.toHaveBeenCalled();
  return run.preflight;
}

describe('Full Pack: the plan it builds for a passage', () => {
  it('auto-configured plan', async () => {
    const preflight = await planPack();
    // Determinism is checked on the WHOLE plan, the baseline on what decides behavior.
    expect(await planPack().then(stable), 'plan is not deterministic').toBe(stable(preflight));
    await expect(stable(packView(preflight))).toMatchFileSnapshot(BASE + 'full_pack_auto.json');
  });

  it('fixed list (auto-configure off)', async () => {
    const preflight = await planPack({ isAutoConfigEnabled: false });
    await expect(stable(packView(preflight))).toMatchFileSnapshot(BASE + 'full_pack_fixed.json');
  });

  it('with a saved analysis of the same passage', async () => {
    const first = await planPack();
    const settings = first.generationMatrix.settings;
    const cell = window.AlloModules.GenerationMatrix.resolveGenerationMatrix({ type: 'analysis', directive: '' },
      Object.assign({}, settings, { sourceText: PASSAGE })).variants[0];
    const stamp = { generationIdentity: { key: cell.generationIdentity, type: 'analysis', sourceFingerprint: cell.sourceFingerprint },
      sourceFingerprint: cell.sourceFingerprint, generationConfig: JSON.parse(JSON.stringify(cell.generationConfig)),
      generationConfigFingerprint: cell.generationConfigFingerprint };
    const saved = Object.assign({ id: 'analysis-1', type: 'analysis', title: 'Source Analysis', data: { originalText: PASSAGE } }, stamp, { config: stamp });
    const preflight = await planPack({ history: [saved] });
    const view = packView(preflight);
    expect(view.selected.find(row => row.type === 'analysis').variants.map(v => v.action), 'saved analysis is reused').toEqual(['reuse']);
    await expect(stable(view)).toMatchFileSnapshot(BASE + 'full_pack_with_saved_analysis.json');
  });
});

describe('Blueprint: the plan it builds for a passage', () => {
  const manifest = () => Contracts.validateCapabilityManifest(JSON.parse(readFileSync(resolve(process.cwd(), 'test_data/agent_core/capability_manifest_desktop.json'), 'utf8'))).value;
  const service = () => BlueprintService.createBlueprintService({ contracts: Contracts,
    getCommandContract: id => ({ id, requires: ['source'], demoSafe: true }) });

  it('dry run and approved execution plan', async () => {
    const svc = service();
    const draft = await svc.createDraft({ blueprintId: 'bp-moon', plan: Contracts.FALLBACK_TOOL_IDS.slice() });
    const dry = svc.dryRun(draft, manifest());
    const approved = svc.approve(draft, 'teacher@school').value;
    const planned = svc.planExecution(approved, manifest());
    expect(planned.ok, JSON.stringify(planned.errors)).toBe(true);
    const snapshot = { dryRun: dry, execution: { errors: planned.errors, legacyConfig: planned.legacyConfig } };
    const again = service();
    const draft2 = await again.createDraft({ blueprintId: 'bp-moon', plan: Contracts.FALLBACK_TOOL_IDS.slice() });
    const planned2 = again.planExecution(again.approve(draft2, 'teacher@school').value, manifest());
    expect(stable({ dryRun: again.dryRun(draft2, manifest()), execution: { errors: planned2.errors, legacyConfig: planned2.legacyConfig } }),
      'blueprint plan is not deterministic').toBe(stable(snapshot));
    await expect(stable(blueprintView(dry, planned))).toMatchFileSnapshot(BASE + 'blueprint_plan.json');
  });

  it('short plan without adapted text (the planner adds it after the analysis)', async () => {
    const svc = service();
    const draft = await svc.createDraft({ blueprintId: 'bp-moon-short', plan: ['analysis', 'quiz', 'lesson-plan'] });
    const planned = svc.planExecution(svc.approve(draft, 'teacher@school').value, manifest());
    expect(planned.ok, JSON.stringify(planned.errors)).toBe(true);
    expect(planned.legacyConfig.recommendedResources).toEqual(['analysis', 'simplified', 'quiz', 'lesson-plan']);
    await expect(stable(blueprintView(svc.dryRun(draft, manifest()), planned))).toMatchFileSnapshot(BASE + 'blueprint_short_plan.json');
  });
});
