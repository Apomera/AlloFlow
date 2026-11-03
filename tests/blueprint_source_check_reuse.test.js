import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let matrix, service, phaseO;
const text = 'Roots absorb water. Leaves use sunlight.';
const check = (extra = {}) => ({ id: 'checked-source', type: 'analysis', data: { originalText: text, concepts: ['Plants'] }, ...extra });
beforeAll(() => {
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule('agent_core_blueprint_service_module.js');
  loadAlloModule('phase_o_misc_handlers_module.js');
  loadAlloModule('udl_chat_module.js');
  matrix = window.AlloModules.GenerationMatrix;
  service = window.AlloModules.AgentCoreBlueprintService;
  phaseO = window.AlloModules.PhaseOHandlers;
});

describe('guided chat source-check handoff', () => {
  const run = async (stage, sourceSnapshot) => {
    const state = { flow: { isFlowActive: true, currentStage: stage }, messages: [] };
    const generate = vi.fn(async () => check());
    const apply = (previous, next) => typeof next === 'function' ? next(previous) : next;
    await window.AlloModules.UdlChat.handleSendUDLMessage('yes', {
      guidedFlowState: state.flow, isAutoFillMode: true, udlMessages: [], udlInput: '',
      inputText: 'Old render source', sourceTopic: 'Plants', history: [],
      gradeLevel: '5th Grade', sourceLevel: '5th Grade', sourceTone: 'Informative', sourceLength: '250',
      standardsInput: '', targetStandards: [], dokLevel: '', studentInterests: [], leveledTextLanguage: 'English',
      isBotVisible: false, isShowMeMode: false, alloBotRef: { current: null },
      setUdlMessages: next => { state.messages = apply(state.messages, next); },
      setGuidedFlowState: next => { state.flow = apply(state.flow, next); },
      setUdlInput: vi.fn(), setIsChatProcessing: vi.fn(),
      detectWorkflowIntent: vi.fn(async () => ({ intent: 'CONFIRM', modification: null })),
      handleGenerateSource: vi.fn(async () => ({})), handleGenerate: generate,
      getWorkflowContext: () => ({}), generateDynamicBridge: vi.fn(async () => 'Can I check this source?'),
      getCurrentSourceSnapshot: () => sourceSnapshot,
      flyToElement: vi.fn(), getStageElementId: value => value,
      t: key => key, warnLog: vi.fn(),
    });
    return { state, generate };
  };

  it('skips the offer after source generation when the actual current source is already checked', async () => {
    const { state, generate } = await run('source', { inputText: text, history: [check()] });
    expect(state.flow.currentStage).toBe('post_analysis_route');
    expect(state.flow.generatedIds).toContain('checked-source');
    expect(state.messages.at(-1).text).toContain('already checked');
    expect(state.messages.some(message => message.stage === 'analysis')).toBe(false);
    expect(generate).not.toHaveBeenCalled();
  });

  it('still offers a check for a changed source and does not reuse an old render snapshot', async () => {
    const { state } = await run('source', { inputText: text + ' Changed.', history: [check()] });
    expect(state.flow.currentStage).toBe('analysis');
    expect(state.messages.at(-1).stage).toBe('analysis');
  });

  it('does not regenerate a source check when a stale analysis confirmation is clicked', async () => {
    const { state, generate } = await run('analysis', { inputText: text, history: [check()] });
    expect(state.flow.currentStage).toBe('post_analysis_route');
    expect(generate).not.toHaveBeenCalled();
  });
});

describe('Blueprint reuses the exact completed source check', () => {
  it('recognizes ordinary source checks without generation metadata and rejects changed text or unfinished checks', () => {
    const saved = check();
    expect(matrix.findExistingSourceAnalysis([saved], text)).toBe(saved);
    for (const changed of [text + ' ', text.replace(' ', '  '), text.replace('water', 'nutrients')]) {
      expect(matrix.findExistingSourceAnalysis([saved], changed)).toBeNull();
      expect(matrix.resolveGenerationMatrix({ tool: 'analysis' }, { sourceText: changed, existingArtifacts: [saved] }).action).not.toBe('reuse');
    }
    for (const status of ['running', 'failed', 'interrupted']) {
      expect(matrix.findExistingSourceAnalysis([check({ status })], text)).toBeNull();
      expect(matrix.resolveGenerationMatrix({ tool: 'analysis' }, { sourceText: text, existingArtifacts: [check({ status })] }).action).not.toBe('reuse');
    }
  });

  it('keeps the checked source visible as a reuse row when the planner correctly omits another analysis', async () => {
    const bp = await service.createBlueprintService({
      autoConfigure: vi.fn(async () => ({ resourcePlan: [{ tool: 'glossary' }] })),
    }).createDraft({ sourceText: text, gradeLevel: '5th Grade', language: 'English', existingArtifacts: [check()] });
    const row = bp.plan.find(item => item.tool === 'analysis');
    expect(row).toMatchObject({ generationAction: 'reuse', existingArtifactId: 'checked-source' });
    expect(row.directive).toContain('Already checked, reused');
    expect(row.generationVariants[0].reason).toContain('Already checked');
  });

  it('reuses a source check that landed after plan review without calling the generator', async () => {
    const saved = check();
    const reviewed = matrix.resolvePlanRows([{ tool: 'analysis', uiId: 'source-row' }], { sourceText: text }).rows[0];
    const generate = vi.fn();
    const steps = [];
    const result = await phaseO.executeOneBlueprint({ resourcePlan: [reviewed] }, {
      initialSourceText: text, historyOverride: [saved], handleGenerate: generate, onStep: step => steps.push(step),
    });
    expect(generate).not.toHaveBeenCalled();
    expect(result.items).toEqual([saved]);
    expect(steps.at(-1)).toMatchObject({ status: 'landed', generationAction: 'reuse', resourceId: saved.id });
  });

  it('runs a fresh check if the reviewed artifact was edited, even when its normalized fingerprint is unchanged', async () => {
    const reviewed = matrix.resolvePlanRows([{ tool: 'analysis', uiId: 'source-row' }], { sourceText: text, existingArtifacts: [check()] }).rows[0];
    const saved = check({ data: { originalText: text + ' ' } });
    const generate = vi.fn(async () => check({ id: 'fresh-check' }));
    const result = await phaseO.executeOneBlueprint({ resourcePlan: [reviewed] }, {
      initialSourceText: text, historyOverride: [saved], handleGenerate: generate,
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0][3]).toBe(text);
    expect(result.items[0].id).toBe('fresh-check');
  });

  it('prefers an earlier successful check to later incomplete and legacy placeholder reports', () => {
    const good = check();
    const incomplete = check({ id: 'attempt', data: { originalText: text, analysisIncomplete: true } });
    const legacy = check({ id: 'legacy', data: { originalText: text, concepts: ['Analysis format issue'],
      readingLevel: { range: 'N/A', explanation: 'Local model returned unstructured analysis text.' } } });
    expect(matrix.findExistingSourceAnalysis([good, legacy, incomplete], text)).toBe(good);
    expect(matrix.findExistingSourceAnalysis([incomplete, legacy], text)).toBeNull();
    expect(matrix.resolveGenerationMatrix({ tool: 'analysis' }, { sourceText: text, existingArtifacts: [legacy, incomplete] }).action).toBe('generate');
  });
  it('honors an explicit request to refresh a source check', () => {
    const result = matrix.resolveGenerationMatrix({ tool: 'analysis', forceRefresh: true }, { sourceText: text, existingArtifacts: [check()] });
    expect(result.action).toBe('refresh');
  });
  it('rejects a previously approved reuse after the report itself was edited', async () => {
    const reviewed = matrix.resolvePlanRows([{ tool: 'analysis', uiId: 'source-row' }], { sourceText: text, existingArtifacts: [check()] }).rows[0];
    const dirty = check({ data: { originalText: text, analysisNeedsRecheck: true } });
    expect(matrix.findExistingSourceAnalysis([dirty], text)).toBeNull();
    const generate = vi.fn(async () => check({ id: 'rechecked' }));
    const result = await phaseO.executeOneBlueprint({ resourcePlan: [reviewed] }, { initialSourceText: text, historyOverride: [dirty], handleGenerate: generate });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.items[0].id).toBe('rechecked');
  });
});

describe('execution validates the source check it is about to reuse', () => {
  it('does not promote a stale check on a matching generation identity alone', async () => {
    const edited = text + ' ';
    const row = { tool: 'analysis', uiId: 'source-row' };
    const original = matrix.resolvePlanRows([row], { sourceText: text }).rows[0];
    const reviewed = matrix.resolvePlanRows([row], { sourceText: edited }).rows[0];
    expect(reviewed.generationVariants[0]).toMatchObject({ action: 'generate', existingArtifactId: null, generationIdentity: original.generationVariants[0].generationIdentity });
    const stale = check({ generationIdentity: original.generationVariants[0].generationIdentity,
      data: { originalText: edited, analysisNeedsRecheck: true } });
    const fresh = check({ id: 'fresh', data: { originalText: edited } });
    const generate = vi.fn(async () => fresh);
    const result = await phaseO.executeOneBlueprint({ resourcePlan: [reviewed] }, {
      initialSourceText: edited, historyOverride: [stale], handleGenerate: generate,
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(result.items.map(item => item.id)).toEqual(['fresh']);
  });

  it.each([
    ['edited', { data: { originalText: text, analysisNeedsRecheck: true } }],
    ['unfinished', { status: 'running' }],
    ['failed', { status: 'failed' }],
  ])('does not reuse a reviewed %s check when a legacy caller supplies only its ID', async (_kind, changes) => {
    const saved = check(changes);
    const generate = vi.fn(async () => check({ id: 'replacement' }));
    const result = await phaseO.executeOneBlueprint({ resourcePlan: [{
      tool: 'analysis', uiId: 'legacy-check', generationAction: 'reuse', existingArtifactId: saved.id,
    }] }, { historyOverride: [saved], handleGenerate: generate });
    expect(generate).toHaveBeenCalledOnce();
    expect(result.items.map(item => item.id)).toEqual(['replacement']);
  });
});
