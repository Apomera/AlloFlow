// Lane N2 (2026-09-28, Katie Novak follow-up; N1 REQUEST R3). When a standard
// requires grade-level text, Full Pack plans no adapted companion by default at
// EVERY pack size (5, 8, 12, Auto), keeps the Analysis (primary text) row, says
// why the companion was left out and how to add it, and includes the companion
// on an explicit request. The same holds when the InstructionalContext module
// is missing (the planner's own fallback).
//
// Runs against the BUILT module (what ships). ALLO_N2_GENERATION_HELPERS_MODULE_JS
// can point at a scratch copy for mutation runs.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

loadAlloModule('instructional_context_module.js');
loadAlloModule('generation_matrix_module.js');
// eslint-disable-next-line no-new-func
new Function(readFileSync(process.env.ALLO_N2_GENERATION_HELPERS_MODULE_JS
  || resolve(process.cwd(), 'generation_helpers_module.js'), 'utf8'))();
const GenerationHelpers = window.AlloModules.GenerationHelpers;

const RL10_INPUT = 'CCSS.ELA-LITERACY.RL.9-10.10';
const RL10_CONTEXT = {
  inputText: RL10_INPUT,
  promptText: 'By the end of grade 10, read and comprehend literature in the grades 9-10 text complexity band proficiently.',
  standards: [{ code: RL10_INPUT, text: 'Read and comprehend literature in the grades 9-10 text complexity band proficiently.' }],
};

const makeDeps = (overrides = {}) => {
  const deps = {
    isProcessing: false, fullPackTargetGroup: 'none', rosterKey: null, gradeLevel: '10th Grade',
    leveledTextLanguage: 'English', translationMode: 'auto', currentUiLanguage: 'English', studentInterests: [],
    dokLevel: '', leveledTextCustomInstructions: '', selectedLanguages: [], differentiationRange: 'None',
    differentiationTypes: ['simplified'], differentiationCustomGrades: [], targetStandards: [], useEmojis: false,
    textFormat: 'Standard Text', imageGenerationStyle: 'Auto', imageAspectRatio: '16:9',
    aiProviderProfile: { backend: 'gemini', model: 'gemini-test', imageProvider: 'auto', imageModel: 'imagen-test', isLocal: false },
    history: [], inputText: 'When shall we three meet again, in thunder, lightning, or in rain?', sourceTopic: 'Macbeth 1.1',
    standardsInput: RL10_INPUT, standardsContext: RL10_CONTEXT, instructionalContext: null,
    resourceCount: '5', isAutoConfigEnabled: true,
    quizCustomInstructions: '', adventureCustomInstructions: '', frameCustomInstructions: '', brainstormCustomInstructions: '',
    faqCustomInstructions: '', outlineCustomInstructions: '', visualCustomInstructions: '', timelineTopic: '',
    lessonCustomAdditions: '', conceptInput: '', glossaryCustomInstructions: '', personaCustomInstructions: '',
    conceptSortCustomInstructions: '', dbqCustomInstructions: '', noteTakingCustomInstructions: '', anchorChartCustomInstructions: '',
    setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setFullPackTargetGroup: vi.fn(), setGradeLevel: vi.fn(),
    setLeveledTextLanguage: vi.fn(), setStudentInterests: vi.fn(), setDokLevel: vi.fn(), setLeveledTextCustomInstructions: vi.fn(),
    setSelectedLanguages: vi.fn(), setTargetStandards: vi.fn(), setUseEmojis: vi.fn(), setTextFormat: vi.fn(),
    setPersistedLessonDNA: vi.fn(), setError: vi.fn(), addToast: vi.fn(),
    t: (key, values) => values ? `${key}:${values.count || ''}` : key,
    warnLog: vi.fn(), handleApplyRosterGroup: vi.fn(),
    // The AI plan proposes an adapted text; the policy decides whether it stays.
    autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [
      { tool: 'quiz', directive: '' }, { tool: 'glossary', directive: '' }, { tool: 'simplified', directive: '' },
    ] })),
    applyDetailedAutoConfig: vi.fn(), getGroupDifferentiationContext: vi.fn(() => ''), getAssetManifest: vi.fn(() => []),
    getDifferentiationGrades: vi.fn(grade => [grade]),
    handleGenerate: vi.fn(async (type) => ({ id: `resource-${type}`, type, data: {} })),
  };
  return Object.assign(deps, overrides);
};

const plan = async (overrides) => {
  let latestRun = null;
  const deps = makeDeps(Object.assign({
    setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
  }, overrides));
  await GenerationHelpers.handlePlanFullPack(deps);
  expect(latestRun && latestRun.status).toBe('ready');
  expect(deps.handleGenerate).not.toHaveBeenCalled();
  return latestRun;
};
const types = run => run.preflight.selected.map(item => item.type);
const withoutInstructionalContextModule = async (fn) => {
  const saved = window.AlloModules.InstructionalContext;
  delete window.AlloModules.InstructionalContext;
  try { return await fn(); } finally { window.AlloModules.InstructionalContext = saved; }
};

describe.each(['5', '8', '12', 'Auto'])('Full Pack under a grade-level text standard, pack size %s', (resourceCount) => {
  it('leaves out the adapted companion by default, keeps the Analysis row, and says why', async () => {
    const run = await plan({ resourceCount });
    expect(types(run)[0]).toBe('analysis');
    expect(types(run)).not.toContain('simplified');
    expect(types(run)).toEqual(expect.arrayContaining(['quiz', 'glossary']));
    expect(run.planPayload.instructionalContext).toMatchObject({
      primaryTextAccess: 'required', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard',
    });
    const skipped = run.preflight.skipped.find(item => item.type === 'simplified');
    expect(skipped && skipped.reason).toContain('the standard asks students to read grade-level text');
    expect(skipped.reason).toContain('"Include an adapted companion for background and preview"');
    expect(skipped.reason).not.toContain('educator choice');
  });

  it('adds the companion right after Analysis on one click', async () => {
    const run = await plan({ resourceCount });
    const included = GenerationHelpers.setFullPackPlanAdaptedTextPolicy(run, 'include', null);
    expect(types(included).slice(0, 2)).toEqual(['analysis', 'simplified']);
    expect(included.planPayload.instructionalContext).toMatchObject({
      primaryTextAccess: 'required', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator',
    });
  });

  it('plans the companion when the teacher asked for it before planning', async () => {
    const run = await plan({ resourceCount, instructionalContext: { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' } });
    expect(types(run)[0]).toBe('analysis');
    expect(types(run)).toContain('simplified');
    expect(run.planPayload.instructionalContext).toMatchObject({ primaryTextAccess: 'required', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' });
    expect(run.preflight.skipped.filter(item => item.type === 'simplified')).toEqual([]);
  });

  it('derives a stale automatic include again instead of keeping it', async () => {
    const run = await plan({ resourceCount, instructionalContext: { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default' } });
    expect(types(run)[0]).toBe('analysis');
    expect(types(run)).not.toContain('simplified');
    expect(run.planPayload.instructionalContext).toMatchObject({ adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard' });
  });

  it('applies the same rule through the planner fallback when InstructionalContext is not loaded', async () => {
    await withoutInstructionalContextModule(async () => {
      const run = await plan({ resourceCount });
      expect(types(run)[0]).toBe('analysis');
      expect(types(run)).not.toContain('simplified');
      expect(run.planPayload.instructionalContext).toMatchObject({
        primaryTextAccess: 'required', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'standard',
      });
      expect(run.preflight.skipped.find(item => item.type === 'simplified').reason).toContain('grade-level text');
      const requested = await plan({ resourceCount, instructionalContext: { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' } });
      expect(types(requested)[0]).toBe('analysis');
      expect(types(requested)).toContain('simplified');
    });
  });

  it('still includes both text paths when no standard requires grade-level text', async () => {
    const run = await plan({ resourceCount, standardsInput: 'CCSS.ELA-LITERACY.RI.5.2', standardsContext: {
      inputText: 'CCSS.ELA-LITERACY.RI.5.2', standards: [{ code: 'CCSS.ELA-LITERACY.RI.5.2', text: 'Determine two or more main ideas of a text.' }],
    } });
    expect(types(run)[0]).toBe('analysis');
    expect(types(run)).toContain('simplified');
    expect(run.planPayload.instructionalContext).toMatchObject({ primaryTextAccess: 'available', adaptedTextPolicy: 'include', adaptedTextPolicySource: 'workflow-default' });
  });
});

describe('Full Pack text access: teacher choices at a fixed pack size', () => {
  it('keeps the Analysis row when the teacher omits the companion under a grade-level standard', async () => {
    const run = await plan({ resourceCount: '5', instructionalContext: { adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' } });
    expect(types(run)[0]).toBe('analysis');
    expect(types(run)).not.toContain('simplified');
    expect(run.preflight.skipped.find(item => item.type === 'simplified').reason).toContain('educator choice');
  });

  it('does not add an Analysis row for a teacher omit when no standard requires the text', async () => {
    const run = await plan({ resourceCount: '5', standardsInput: '', standardsContext: null,
      instructionalContext: { adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' } });
    expect(types(run)).toEqual(['quiz', 'glossary']);
  });

  it('approving the default plan generates the original analysis and no adapted text', async () => {
    let latestRun = null;
    const deps = makeDeps({
      resourceCount: '5',
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
    });
    await GenerationHelpers.handlePlanFullPack(deps);
    await GenerationHelpers.handleApproveFullPack(latestRun, deps);
    const generated = deps.handleGenerate.mock.calls.map(call => call[0]);
    expect(generated[0]).toBe('analysis');
    expect(generated).not.toContain('simplified');
  });
});

// N1 REQUEST R3 (iv): once a required-text pack's Analysis lands, the original
// with word supports exists as the main reading without the teacher's click.
describe('Full Pack adds the original with word supports when grade-level text is required', () => {
  const IC = window.AlloModules.InstructionalContext;
  const SOURCE = 'When shall we three meet again\nIn thunder, lightning, or in rain?';
  const analysis = { id: 'analysis-macbeth', type: 'analysis', title: 'Macbeth 1.1', data: { originalText: SOURCE, concepts: ['witches'] } };
  const runPack = async (overrides = {}) => {
    let latestRun = null;
    let historyState = Array.isArray(overrides.initialState) ? overrides.initialState.slice()
      : (Array.isArray(overrides.history) ? overrides.history.slice() : []);
    const setHistory = vi.fn(next => { historyState = typeof next === 'function' ? next(historyState) : next; });
    const deps = makeDeps(Object.assign({
      resourceCount: '5',
      setHistory,
      setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
      handleGenerate: vi.fn(async (type) => type === 'analysis'
        ? JSON.parse(JSON.stringify(analysis))
        : { id: `resource-${type}`, type, data: {} }),
    }, overrides));
    await GenerationHelpers.handlePlanFullPack(deps);
    await GenerationHelpers.handleApproveFullPack(latestRun, deps);
    return { deps, setHistory, history: () => historyState };
  };

  it('adds one supported original of the analyzed text as the primary reading, and tells the teacher', async () => {
    const { deps, setHistory, history } = await runPack();
    expect(setHistory).toHaveBeenCalledTimes(1);
    const added = history().filter(item => IC.isSupportedOriginal(item));
    expect(added).toHaveLength(1);
    expect(added[0].data).toBe(SOURCE);
    expect(added[0].title).toBe('Macbeth 1.1 — Original with supports');
    expect(added[0].instructionalText).toMatchObject({ role: 'primary', form: 'same-text-supported' });
    expect(IC.sameReadingSourceFamily(added[0], analysis)).toBe(true);
    expect(deps.addToast).toHaveBeenCalledWith('Added the original with word supports as the main reading.', 'info');
  });

  it('also adds it when the teacher included an adapted companion (the text is still required)', async () => {
    const { history } = await runPack({ instructionalContext: { adaptedTextPolicy: 'include', adaptedTextPolicySource: 'educator' } });
    expect(history().filter(item => IC.isSupportedOriginal(item))).toHaveLength(1);
  });

  it('keeps an original with supports that is already saved for the same text', async () => {
    const existing = IC.createSupportedReading(SOURCE, { id: 'original-existing', sourceItem: analysis, title: 'Saved original' });
    const { setHistory, history } = await runPack({ history: [analysis, existing] });
    expect(setHistory).not.toHaveBeenCalled();
    expect(history().filter(item => IC.isSupportedOriginal(item)).map(item => item.id)).toEqual(['original-existing']);
  });

  it('does not duplicate an original that was saved after the pack started', async () => {
    const existing = IC.createSupportedReading(SOURCE, { id: 'original-meanwhile', sourceItem: analysis, title: 'Saved meanwhile' });
    const { setHistory, history } = await runPack({ history: [], initialState: [existing] });
    expect(setHistory).toHaveBeenCalledTimes(1);
    expect(history().filter(item => IC.isSupportedOriginal(item)).map(item => item.id)).toEqual(['original-meanwhile']);
  });

  it('does not add one when no standard requires grade-level text', async () => {
    const { setHistory, history } = await runPack({ standardsInput: 'CCSS.ELA-LITERACY.RI.5.2', standardsContext: {
      inputText: 'CCSS.ELA-LITERACY.RI.5.2', standards: [{ code: 'CCSS.ELA-LITERACY.RI.5.2', text: 'Determine two or more main ideas of a text.' }],
    } });
    expect(setHistory).not.toHaveBeenCalled();
    expect(history().filter(item => IC.isSupportedOriginal(item))).toEqual([]);
  });

  it('does nothing while only planning', async () => {
    const setHistory = vi.fn();
    await plan({ resourceCount: '5', setHistory });
    expect(setHistory).not.toHaveBeenCalled();
  });
});
