import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { buildGuidedModeConfigModule } = require('../_build_guided_mode_config_module.js');
const source = readFileSync(process.env.ALLO_GUIDED_CONFIG_CANDIDATE || resolve('guided_mode_config_source.jsx'), 'utf8');
const quietConsole = { log() {}, warn() {}, error() {} };
function configApi(text = source) {
  const window = { AlloModules: {} };
  vm.runInNewContext(buildGuidedModeConfigModule(text), { window, console: quietConsole });
  return window.AlloModules.GuidedModeConfig;
}
function readingApi() {
  const window = { AlloModules: {} };
  vm.runInNewContext(readFileSync(resolve('instructional_context_module.js'), 'utf8'), { window, console: quietConsole });
  return window.AlloModules.InstructionalContext;
}
const unavailable = { callGemini: async () => { throw new Error('offline'); }, cleanJson: value => value };
const activeIds = (api, progress) => api.GUIDED_STEP_IDS.filter(id => progress.selectedIds.includes(id));
const readingGoal = 'Help students read The Raven with vocabulary supports.';
const assertFocusedReading = plan => assert.deepEqual(Array.from(plan.stepIds), ['analysis', 'glossary', 'simplified']);

function originalAction(options = {}) {
  const api = readingApi();
  const history = options.history || [];
  const deps = {
    window: { AlloModules: { InstructionalContext: api } }, history,
    supportDraftSessionRef: { current: null }, requestReadingSupportTransition: vi.fn(),
    selectedReadingSourceId: '', activeUnitId: null, inputText: options.inputText || '',
    leveledTextLanguage: 'English', gradeLevel: '3rd Grade', sourceTopic: options.sourceTopic || '',
    addToast: vi.fn(), handleGenerate: vi.fn(), openReadingArtifact: vi.fn(),
    setHistory: vi.fn(update => { const next = typeof update === 'function' ? update(history) : update; history.splice(0, history.length, ...next); }),
  };
  const host = readFileSync(process.env.ALLO_ANTI_CANDIDATE || resolve('AlloFlowANTI.txt'), 'utf8');
  const start = host.indexOf('  const handleReadOriginal = (selected = null) => {');
  const end = host.indexOf('  const handleCreateAdaptedCompanion =', start);
  if (start < 0 || end <= start) throw new Error('Original-reading host action boundaries changed');
  const run = new Function('deps', 'const {window, history, supportDraftSessionRef, requestReadingSupportTransition, selectedReadingSourceId, activeUnitId, inputText, leveledTextLanguage, gradeLevel, sourceTopic, addToast, handleGenerate, openReadingArtifact, setHistory} = deps;\n' + host.slice(start, end) + '\nreturn handleReadOriginal;')(deps);
  return { run, deps, api, history };
}

const EXACT_SOURCE = 'Plants store energy in glucose.\nPond plants absorb water; pond plants also need light.';

describe('report follow-up: focused reading uses the existing original-support action', () => {
  it('keeps the seven saved reading steps and each existing tool anchor', () => {
    const api = configApi();
    const preset = api.GUIDED_PRESETS.find(item => item.id === 'reading-access');
    const progress = api.normalizeGuidedProgress({ selectedIds: preset.stepIds });
    expect(activeIds(api, progress)).toEqual(['source-input', 'analysis', 'glossary', 'simplified', 'directions', 'package-deliver', '_final']);
    expect(api.GUIDED_TOUR_MAP.simplified).toBe('ui-tool-simplified');
    expect(api.GUIDED_STEP_IDS).toHaveLength(26);
    expect(api.GUIDED_PRESETS.map(item => item.id)).toEqual(['core-lesson', 'reading-access', 'assessment', 'engagement', 'take-home', 'complete']);
  });

  it('opens a supported original from the exact source without generating an adaptation', () => {
    const { run, deps, api, history } = originalAction({ inputText: EXACT_SOURCE });
    run();
    expect(history).toHaveLength(1);
    const original = history[0];
    expect(api.isSupportedOriginal(original)).toBe(true);
    expect(original.type).toBe('simplified');
    expect(original.data).toBe(EXACT_SOURCE);
    expect(original.sourceSnapshot.text).toBe(EXACT_SOURCE);
    expect(original.instructionalText).toMatchObject({ form: 'same-text-supported', role: 'primary' });
    expect(deps.openReadingArtifact).toHaveBeenCalledWith(original);
    expect(deps.handleGenerate).not.toHaveBeenCalled();
  });

  it('uses the selected saved source and reopens it without duplicate history', () => {
    const { run, deps, api, history } = originalAction({ inputText: 'Unrelated input.', sourceTopic: 'Previous topic' });
    const analysis = { id: 'pond-source', type: 'analysis', title: 'Pond study', data: { originalText: EXACT_SOURCE }, config: { grade: '4th Grade', language: 'English' } };
    analysis.sourceSnapshot = api.createSourceSnapshot(EXACT_SOURCE, { sourceArtifactId: analysis.id, language: 'English' });
    history.push(analysis);
    run(analysis);
    const original = history[1];
    expect(original.data).toBe(EXACT_SOURCE);
    expect(original.title).toBe('Pond study — Original with supports');
    run(analysis);
    expect(history).toHaveLength(2);
    expect(deps.openReadingArtifact).toHaveBeenLastCalledWith(original);
    expect(deps.setHistory).toHaveBeenCalledTimes(1);
  });

  it('keeps history intact when no source can be opened', () => {
    const { run, deps, history } = originalAction();
    run();
    expect(history).toEqual([]);
    expect(deps.setHistory).not.toHaveBeenCalled();
    expect(deps.openReadingArtifact).not.toHaveBeenCalled();
    expect(deps.addToast).toHaveBeenCalled();
  });

  it('resumes older complete reading choices with their work and delivery evidence', () => {
    const api = configApi();
    const choices = ['analysis', 'glossary', 'simplified', 'outline', 'image', 'sentence-frames', 'quiz', 'lesson-plan', 'directions'];
    const progress = api.normalizeGuidedProgress({ selectedIds: choices, stepId: 'image', completedSteps: ['analysis', 'glossary', 'simplified', 'outline'], createdHistoryIds: ['saved-original', 'saved-companion'], deliveryEvidence: { exportCreated: true, studentPreviewed: true } });
    expect(activeIds(api, progress)[progress.guidedStep]).toBe('image');
    expect(progress.selectedIds).toEqual(expect.arrayContaining(choices));
    expect(progress.completedSteps).toEqual(['analysis', 'glossary', 'simplified', 'outline']);
    expect(progress.createdHistoryIds).toEqual(['saved-original', 'saved-companion']);
    expect(progress.deliveryEvidence).toEqual({ exportCreated: true, studentPreviewed: true });
  });
});

describe('report follow-up: goal plans keep purposeful journeys and explicit choices', () => {
  it('makes an offline reading fallback with only the three reading essentials', async () => {
    const plan = await configApi().generateGuidedPlanFromGoal(readingGoal, null, unavailable);
    assertFocusedReading(plan);
    expect(plan.source).toBe('fallback');
    expect(plan.fallbackReason).toContain('local goal-matched plan');
  });

  it('adds explicitly requested visual and writing supports to a reading goal', async () => {
    const plan = await configApi().generateGuidedPlanFromGoal('Help students read The Raven with a visual organizer and sentence frames.', null, unavailable);
    expect(Array.from(plan.stepIds)).toEqual(['analysis', 'glossary', 'simplified', 'image', 'outline', 'sentence-frames']);
  });

  it('keeps assessment and engagement journeys distinct from reading', async () => {
    const api = configApi();
    const assessment = await api.generateGuidedPlanFromGoal('Build an assessment with evidence and standards.', null, unavailable);
    expect(assessment.stepIds).toEqual(expect.arrayContaining(['faq', 'dbq', 'quiz', 'alignment']));
    expect(assessment.stepIds).not.toContain('simplified');
    expect(assessment.stepIds).not.toContain('glossary');
    const engagement = await api.generateGuidedPlanFromGoal('Create interactive games and discussion choices.', null, unavailable);
    expect(engagement.stepIds).toEqual(expect.arrayContaining(['brainstorm', 'concept-sort', 'persona', 'adventure']));
    expect(engagement.stepIds).not.toContain('simplified');
    expect(engagement.stepIds).not.toContain('glossary');
  });

  it('does not mistake cell for an English-language-learner reading request', async () => {
    const plan = await configApi().generateGuidedPlanFromGoal('Build a science lesson about a cell.', null, unavailable);
    expect(plan.stepIds).toContain('math');
    expect(plan.stepIds).not.toContain('simplified');
    expect(plan.stepIds).not.toContain('glossary');
  });

  it('does not re-add vocabulary or assessment after an explicit removal', async () => {
    const api = configApi();
    const currentPlan = { title: 'Raven review', stepIds: ['analysis', 'glossary', 'simplified', 'quiz'], deliverySetting: 'print', deliveryPriority: 'low-connectivity' };
    const plan = await api.generateGuidedPlanFromGoal(readingGoal, { refinement: 'Without vocabulary or quizzes.', currentPlan }, unavailable);
    expect(Array.from(plan.stepIds)).toEqual(['analysis', 'simplified']);
    expect(plan.deliverySetting).toBe('print');
  });

  it('preserves a reviewed AI activity order while removing unsupported and duplicate IDs', async () => {
    let prompt = '';
    const plan = await configApi().generateGuidedPlanFromGoal('Read the source, then let learners choose notes or a memory aid.', null, {
      callGemini: async value => { prompt = value; return JSON.stringify({ title: 'Reading choices', stepIds: ['simplified', 'note-taking', 'memory-aid', 'unknown', 'note-taking'], stepReasons: { 'note-taking': 'Learner choice', unknown: 'Remove' } }); },
      cleanJson: value => value,
    });
    expect(Array.from(plan.stepIds)).toEqual(['simplified', 'note-taking', 'memory-aid']);
    expect(plan.stepReasons).toEqual({ 'note-taking': 'Learner choice' });
    expect(prompt).toContain('creating an adapted companion is optional');
    expect(prompt).toContain('Preserve the teacher');
  });

  it('self-checks that the focused-plan assertion rejects the old forced extra-tools behavior', async () => {
    const mutation = source.replace("if (!selected.size) add('analysis');", "if (selected.size < 5) add('glossary', 'simplified', 'image', 'quiz');");
    expect(mutation).not.toBe(source);
    const broken = await configApi(mutation).generateGuidedPlanFromGoal(readingGoal, null, unavailable);
    expect(() => assertFocusedReading(broken)).toThrow();
  });
});
