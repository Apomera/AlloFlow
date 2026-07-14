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
    const bp = await svc.createDraft({ blueprintId: 'bp-offline', gradeLevel: '3rd Grade', plan: ['analysis', 'glossary'] });
    expect(bp.plan.map((r) => r.tool)).toEqual(['analysis', 'glossary']);
    expect(bp.audience.gradeLevel).toBe('3rd Grade');
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
    const bp = await svc.createDraft({ blueprintId: 'bp-ai-rev', plan: ['analysis', 'lesson-plan'] });
    const next = await svc.reviseWithAI(bp, 'add a timeline');
    expect(seenLegacy.legacy.recommendedResources).toEqual(['analysis', 'lesson-plan']);
    expect(seenLegacy.instruction).toBe('add a timeline');
    expect(next.plan.map((r) => r.tool)).toEqual(['analysis', 'timeline', 'lesson-plan']);
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
