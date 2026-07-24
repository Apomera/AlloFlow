// Headless Blueprint service tests (Task 3 of
// docs/CLAUDE_HANDOFF_FEDERATED_AGENT_2026-07-14.md). These prove the
// handoff's acceptance criteria WITHOUT the UI: a Blueprint can be created,
// revised (only requested fields change), validated (missing providers and
// unknown tools are caught), dry-run (ordered plan, no side effects), and is
// executable ONLY after an explicit approval transition — the review step
// from the Auto-Fill UI is a contract rule here, not a UI accident.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let C, S;
beforeAll(() => {
  loadAlloModule('agent_core_contracts_module.js');
  loadAlloModule('agent_core_blueprint_service_module.js');
  C = window.AlloModules.AgentCoreContracts;
  S = window.AlloModules.AgentCoreBlueprintService;
  if (!C || !S) throw new Error('Agent Core modules failed to register');
});

const fixture = (name) =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'test_data/agent_core', name), 'utf-8'));

const mkService = (deps = {}) => S.createBlueprintService({ contracts: C, ...deps });
const commandCatalog = [
  { id: 'generate_simplified' }, { id: 'generate_quiz' }, { id: 'open_learning_hub' },
];
const mkCommandService = (deps = {}) => S.createCommandWorkflowService({
  contracts: C,
  getCommands: () => commandCatalog,
  sanitizeCommandParams: (command, params) => command.id === 'generate_simplified' ? (params.grade ? { grade: String(params.grade) } : {}) : {},
  validatePlan: (_ctx, steps) => ({ ok: true, items: steps.map((step, index) => ({ index, commandId: step.commandId, status: 'ready', detail: '' })) }),
  ...deps,
});
const memoryStorage = () => {
  const data = {};
  return {
    getItem: (key) => Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null,
    setItem: (key, value) => { data[key] = String(value); },
    raw: (key) => data[key],
  };
};

describe('CommandWorkflow service', () => {
  it('creates, dry-runs, approves, and plans a command workflow without executing it', () => {
    const svc = mkCommandService();
    const created = svc.createDraft({ workflowId: 'cw-service', audience: 'teacher', steps: [
      { commandId: 'generate_simplified', params: { grade: '3', discarded: 'x' } },
      { commandId: 'generate_quiz', params: {} },
    ] }, {});
    expect(created.ok).toBe(true);
    expect(created.value.steps[0].params).toEqual({ grade: '3' });
    expect(svc.dryRun(created.value, {}).steps.every((step) => step.readiness.status === 'ready')).toBe(true);
    expect(svc.planExecution(created.value, {}).errors[0].code).toBe('approval-required');
    const approved = svc.approve(created.value, 'teacher-ui', {}).value;
    expect(svc.planExecution(approved, {}).steps.map((step) => step.commandId)).toEqual(['generate_simplified', 'generate_quiz']);
  });

  it('supports deterministic text edits and invalidates prior approval', () => {
    const svc = mkCommandService();
    const created = svc.createDraft({ workflowId: 'cw-edit', audience: 'teacher', steps: [
      { commandId: 'generate_simplified', params: { grade: '3' } },
      { commandId: 'generate_quiz', params: {} },
      { commandId: 'open_learning_hub', params: {} },
    ] }, {}).value;
    const approved = svc.approve(created, 'teacher', {}).value;
    const moved = svc.reviseFromText(approved, 'move step 3 first', {});
    expect(moved.ok).toBe(true);
    expect(moved.value.steps[0].commandId).toBe('open_learning_hub');
    expect(moved.value.review.state).toBe('draft');
    const updated = svc.reviseFromText(moved.value, 'set step 2 grade to 4', {});
    expect(updated.ok).toBe(true);
    expect(updated.value.steps[1].params.grade).toBe('4');
    const removed = svc.reviseFromText(updated.value, 'remove step 3', {});
    expect(removed.ok).toBe(true);
    expect(removed.value.steps).toHaveLength(2);
  });

  it('reports blocked dry-run steps and refuses execution after approval', () => {
    const svc = mkCommandService({
      validatePlan: (_ctx, steps) => ({ ok: false, items: steps.map((step, index) => ({ index, commandId: step.commandId, status: index ? 'block' : 'ready', detail: index ? 'Needs source.' : '' })) }),
    });
    const workflow = svc.createDraft({ workflowId: 'cw-blocked', steps: [
      { commandId: 'open_learning_hub' }, { commandId: 'generate_quiz' },
    ] }, {}).value;
    const dry = svc.dryRun(workflow, {});
    expect(dry.ok).toBe(false);
    expect(dry.steps[1].readiness).toMatchObject({ status: 'block', detail: 'Needs source.' });
    const planned = svc.planExecution(svc.approve(workflow, 'teacher', {}).value, {});
    expect(planned.ok).toBe(false);
    expect(planned.errors[0].code).toBe('workflow-blocked');
  });

  it('supports before/after moves and typed numeric text edits', () => {
    const svc = mkCommandService({ sanitizeCommandParams: (_command, params) => params });
    const workflow = svc.createDraft({ workflowId: 'cw-regex', steps: [
      { commandId: 'generate_simplified' },
      { commandId: 'generate_quiz' },
      { commandId: 'open_learning_hub' },
    ] }, {}).value;
    const moved = svc.reviseFromText(workflow, 'move step 3 before step 1', {});
    expect(moved.ok).toBe(true);
    expect(moved.value.steps.map((step) => step.commandId)).toEqual(['open_learning_hub', 'generate_simplified', 'generate_quiz']);
    const updated = svc.reviseFromText(moved.value, 'set step 2 count to 4', {});
    expect(updated.ok).toBe(true);
    expect(updated.value.steps[1].params.count).toBe(4);
  });

  it('saves, lists, reloads, updates, and deletes local Command Blueprints as drafts', () => {
    const storage = memoryStorage();
    const svc = mkCommandService({ storage, getAudience: () => 'teacher', now: () => '2026-07-22T22:30:00.000Z' });
    const draft = svc.createDraft({ workflowId: 'cw-saved', audience: 'teacher', steps: [
      { commandId: 'generate_simplified', params: { grade: '3' } },
      { commandId: 'generate_quiz' },
    ] }, {}).value;
    const approved = svc.approve(draft, 'teacher-ui', {}).value;
    const saved = svc.saveSaved(approved, '  Weekly\u0000 review   flow  ', {});
    expect(saved.ok).toBe(true);
    expect(saved.value.name).toBe('Weekly review flow');
    expect(saved.value.workflow.review.state).toBe('draft');
    expect(JSON.parse(storage.raw(S.COMMAND_WORKFLOW_LIBRARY_KEY)).schemaVersion).toBe(C.SCHEMA_VERSION);
    expect(svc.listSaved({}).items).toHaveLength(1);
    const loaded = svc.loadSaved('cw-saved', {});
    expect(loaded.ok).toBe(true);
    expect(loaded.value.review).toEqual({ state: 'draft', reviewer: '' });
    expect(loaded.value.steps.map((step) => step.commandId)).toEqual(['generate_simplified', 'generate_quiz']);
    expect(svc.saveSaved(loaded.value, 'Updated weekly flow', {}).value.name).toBe('Updated weekly flow');
    expect(svc.listSaved({}).items).toHaveLength(1);
    expect(svc.deleteSaved('cw-saved', {}).ok).toBe(true);
    expect(svc.listSaved({}).items).toHaveLength(0);
  });

  it('keeps saved workflows isolated by audience and fails closed on corrupt storage', () => {
    const storage = memoryStorage();
    const teacher = mkCommandService({ storage, getAudience: () => 'teacher' });
    const workflow = teacher.createDraft({ workflowId: 'cw-teacher-only', audience: 'teacher', steps: [{ commandId: 'open_learning_hub' }] }, {}).value;
    expect(teacher.saveSaved(workflow, 'Teacher flow', {}).ok).toBe(true);
    const student = mkCommandService({ storage, getAudience: () => 'student' });
    expect(student.listSaved({}).items).toHaveLength(0);
    const studentWorkflow = student.createDraft({ workflowId: 'cw-teacher-only', audience: 'student', steps: [{ commandId: 'open_learning_hub' }] }, {}).value;
    expect(student.saveSaved(studentWorkflow, 'Student flow', {}).ok).toBe(true);
    expect(teacher.listSaved({}).items.map((item) => item.name)).toEqual(['Teacher flow']);
    expect(student.listSaved({}).items.map((item) => item.name)).toEqual(['Student flow']);
    expect(teacher.deleteSaved('cw-teacher-only', {}).ok).toBe(true);
    expect(student.listSaved({}).items.map((item) => item.name)).toEqual(['Student flow']);
    storage.setItem(S.COMMAND_WORKFLOW_LIBRARY_KEY, JSON.stringify({ schemaVersion: '99.0', items: [] }));
    expect(student.listSaved({}).errors[0].code).toBe('library-version-unsupported');
    storage.setItem(S.COMMAND_WORKFLOW_LIBRARY_KEY, '{bad json');
    expect(teacher.listSaved({}).errors[0].code).toBe('library-corrupt');
  });
});

describe('createDraft', () => {
  it('wraps an injected autoConfigure (the live phase_k seam) into a valid Blueprint', async () => {
    const calls = [];
    const svc = mkService({
      autoConfigure: async (req) => { calls.push(req); return fixture('legacy_config.json'); },
    });
    const bp = await svc.createDraft({
      blueprintId: 'bp-ai', sourceText: 'The water cycle...', gradeLevel: '5th Grade',
      standards: 'NGSS 5-ESS2-1', language: 'English',
    });
    expect(calls.length).toBe(1);
    expect(bp.schemaVersion).toBe('1.0');
    expect(bp.review.state).toBe('draft');
    expect(bp.plan[0].tool).toBe('analysis');
    expect(bp.plan[bp.plan.length - 1].tool).toBe('lesson-plan');
  });

  it('builds a deterministic offline draft without any AI dependency', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-offline', gradeLevel: '3rd Grade', plan: ['analysis', 'glossary'], globalSettings: { theme: 'high-contrast' } });
    expect(bp.plan.map((r) => r.tool)).toEqual(['analysis', 'glossary']);
    expect(bp.audience.gradeLevel).toBe('3rd Grade');
    expect(bp.globalSettings).toMatchObject({ gradeLevel: '3rd Grade', theme: 'high-contrast' });
  });

  it('rejects an AI result that fails the contract (fail closed, no partial value)', async () => {
    const svc = mkService({ autoConfigure: async () => ({ recommendedResources: ['invented-tool'] }) });
    await expect(svc.createDraft({ blueprintId: 'bp-bad' })).rejects.toMatchObject({
      report: { ok: false },
    });
  });
});

describe('revise', () => {
  it('changes only the requested fields and re-enters draft state', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-r', plan: ['analysis', 'quiz', 'lesson-plan'] });
    const approved = svc.approve(bp, 'ms-frizzle').value;
    const r = svc.revise(approved, { addTools: ['glossary'], setDirectives: { quiz: 'Focus on DOK 3' } });
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    // requested changes applied…
    expect(r.value.plan.map((x) => x.tool)).toEqual(['analysis', 'quiz', 'glossary', 'lesson-plan']);
    expect(r.value.plan.find((x) => x.tool === 'quiz').directive).toBe('Focus on DOK 3');
    // …everything else untouched…
    expect(r.value.audience).toEqual(bp.audience);
    expect(r.value.lessonDNA).toEqual(bp.lessonDNA);
    // …and the prior approval is invalidated.
    expect(r.value.review.state).toBe('draft');
  });

  it('removeTools removes exactly the named tools', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-rm', plan: ['analysis', 'quiz', 'image', 'lesson-plan'] });
    const r = svc.revise(bp, { removeTools: ['image'] });
    expect(r.value.plan.map((x) => x.tool)).toEqual(['analysis', 'quiz', 'lesson-plan']);
  });
});

describe('reviseWithAI', () => {
  it('round-trips through the legacy shape the live modifyBlueprintWithAI expects', async () => {
    let seenLegacy = null;
    const svc = mkService({
      modifyBlueprint: async (legacy, instruction) => {
        seenLegacy = { legacy, instruction };
        return { ...legacy, recommendedResources: [...legacy.recommendedResources, 'timeline'], resourcePlan: null };
      },
    });
    const bp = await svc.createDraft({
      blueprintId: 'bp-ai-rev',
      plan: ['analysis', 'lesson-plan'],
      interests: 'space exploration',
    });
    bp.sourcePolicy = { kind: 'workspace-source', ref: 'source-42' };
    const next = await svc.reviseWithAI(bp, 'add a timeline');
    expect(seenLegacy.legacy.recommendedResources).toEqual(['analysis', 'lesson-plan']);
    expect(seenLegacy.instruction).toBe('add a timeline');
    expect(next.plan.map((r) => r.tool)).toEqual(['analysis', 'timeline', 'lesson-plan']);
    expect(next.audience.interests).toBe('space exploration');
    expect(next.sourcePolicy).toEqual({ kind: 'workspace-source', ref: 'source-42' });
    expect(next.review.state).toBe('draft');
  });

  it('fails when the dependency is not configured', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-no-ai', plan: ['analysis'] });
    await expect(svc.reviseWithAI(bp, 'x')).rejects.toThrow('modifyBlueprint dependency not configured');
  });
});

describe('capability checks and dry run', () => {
  it('flags missing providers instead of failing at generation time', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-cap', plan: ['analysis', 'image'] });
    const noImage = {
      ...fixture('capability_manifest_desktop.json'),
      imageGeneration: { available: false, providers: [] },
    };
    const manifest = C.validateCapabilityManifest(noImage).value;
    const check = svc.checkCapabilities(bp, manifest);
    expect(check.ok).toBe(false);
    expect(check.missing).toEqual(['imageGeneration']);
    const dry = svc.dryRun(bp, manifest);
    expect(dry.ok).toBe(false);
    expect(dry.steps.find((s) => s.tool === 'image').status).toBe('blocked-missing-capability');
    expect(dry.steps.find((s) => s.tool === 'analysis').status).toBe('ready');
  });

  it('dry run is ordered, side-effect free, and always requires approval', async () => {
    const svc = mkService({
      getCommandContract: (id) => ({ id, requires: ['source'], demoSafe: true }),
    });
    const legacy = fixture('legacy_config.json');
    const bp = C.fromLegacyConfig(legacy, { blueprintId: 'bp-dry' });
    const before = JSON.stringify(bp);
    const dry = svc.dryRun(bp, C.validateCapabilityManifest(fixture('capability_manifest_desktop.json')).value);
    expect(dry.ok).toBe(true);
    expect(dry.approvalRequired).toBe(true);
    expect(dry.steps.map((s) => s.tool)).toEqual(['analysis', 'glossary', 'quiz', 'image', 'lesson-plan']);
    // command-contract reuse: quiz maps onto the AlloCommands contract
    expect(dry.steps.find((s) => s.tool === 'quiz').commandId).toBe('generate_quiz');
    expect(dry.steps.find((s) => s.tool === 'quiz').contract.requires).toEqual(['source']);
    // no side effects: the input Blueprint is untouched
    expect(JSON.stringify(bp)).toBe(before);
  });
});

describe('approval gate (review-before-execution preserved headlessly)', () => {
  it('planExecution refuses a draft Blueprint', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-gate', plan: ['analysis', 'quiz'] });
    const r = svc.planExecution(bp);
    expect(r.ok).toBe(false);
    expect(r.errors[0].code).toBe('approval-required');
    expect(r.legacyConfig).toBe(null);
  });

  it('approve → planExecution yields the legacy config for handleExecuteBlueprint', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-go', plan: ['analysis', 'quiz', 'lesson-plan'] });
    const approved = svc.approve(bp, 'teacher@school').value;
    expect(approved.review).toEqual({ state: 'approved', reviewer: 'teacher@school' });
    const r = svc.planExecution(approved);
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.legacyConfig.recommendedResources).toEqual(['analysis', 'quiz', 'lesson-plan']);
    expect(r.legacyConfig.resourcePlan.length).toBe(3);
  });

  it('planExecution also blocks on missing capabilities when a manifest is supplied', async () => {
    const svc = mkService();
    const bp = await svc.createDraft({ blueprintId: 'bp-cap-gate', plan: ['analysis', 'image'] });
    const approved = svc.approve(bp).value;
    const manifest = C.validateCapabilityManifest({
      ...fixture('capability_manifest_desktop.json'),
      imageGeneration: { available: false, providers: [] },
    }).value;
    const r = svc.planExecution(approved, manifest);
    expect(r.ok).toBe(false);
    expect(r.errors[0].code).toBe('missing-capability');
  });
});
