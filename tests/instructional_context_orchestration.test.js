import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Contracts = require('../agent_core_contracts_module.js');
const BlueprintService = require('../agent_core_blueprint_service_module.js');
const ResourcePack = require('../agent_core_resource_pack_module.js');
const root = process.cwd();

const standardsContext = {
  version: 'standards-context/v1',
  inputText: 'NGSS 5-ESS2-1',
  promptText: 'NGSS 5-ESS2-1 — Earth systems interact',
  standards: [{ code: 'NGSS 5-ESS2-1', label: 'Earth systems interact', grade: '5' }],
  instructionalConstraints: {
    textAccessExpectation: 'preserve-primary',
    basis: 'District-adopted grade-level text access policy',
    sourced: true,
  },
};

const instructionalContext = {
  schemaVersion: 1,
  instructionalGrade: '5th Grade',
  primaryTextPolicy: 'preserve-primary',
  standardsContext,
  standardsFingerprint: 'txt-approved-standards',
};

describe('instructional context orchestration', () => {
  it('round-trips approved standards and per-row text roles through the legacy Blueprint bridge', () => {
    const adapted = {
      schemaVersion: 1,
      role: 'supplemental',
      form: 'adapted',
      designationSource: 'educator',
      replacementAuthorization: { authorized: false, source: 'none' },
      complexity: { requestedGrade: '3rd Grade', language: 'English' },
    };
    const blueprint = Contracts.fromLegacyConfig({
      resourcePlan: [{ tool: 'analysis' }, { tool: 'simplified', instructionalText: adapted }],
      globalSettings: { gradeLevel: '5th Grade' },
      standardsContext,
      instructionalContext,
    }, { blueprintId: 'bp-context' });
    const validated = Contracts.validateBlueprint(blueprint);
    expect(validated.ok).toBe(true);
    expect(validated.value.instructionalContext.standardsFingerprint).toBe('txt-approved-standards');
    const legacy = Contracts.toLegacyConfig(validated.value);
    expect(legacy.standardsContext.standards[0].code).toBe('NGSS 5-ESS2-1');
    expect(legacy.instructionalContext).toMatchObject({
      instructionalGrade: '5th Grade',
      primaryTextPolicy: 'preserve-primary',
      standardsFingerprint: 'txt-approved-standards',
    });
    expect(legacy.resourcePlan.find((row) => row.tool === 'simplified').instructionalText)
      .toMatchObject({ role: 'supplemental', form: 'adapted' });
    expect(legacy.standardsContext.instructionalConstraints).toMatchObject({
      textAccessExpectation: 'preserve-primary',
      sourced: true,
    });
  });

  it('keeps the reviewed fingerprint and row metadata across a directive-only revision', () => {
    const service = BlueprintService.createBlueprintService({ contracts: Contracts });
    const blueprint = Contracts.fromLegacyConfig({
      resourcePlan: [{ tool: 'simplified', directive: 'First draft', instructionalText: { role: 'supplemental', form: 'adapted' } }],
      globalSettings: { gradeLevel: '5th Grade' },
      standardsContext,
      instructionalContext,
    }, { blueprintId: 'bp-revise' });
    const revised = service.revise(blueprint, { setDirectives: { simplified: 'Revised direction' } });
    expect(revised.ok).toBe(true);
    expect(revised.value.instructionalContext.standardsFingerprint).toBe('txt-approved-standards');
    expect(revised.value.plan[0]).toMatchObject({
      directive: 'Revised direction',
      instructionalText: { role: 'supplemental', form: 'adapted' },
    });
  });

  it('invalidates the reviewed standards fingerprint when the standards target changes', () => {
    const service = BlueprintService.createBlueprintService({ contracts: Contracts });
    const blueprint = Contracts.fromLegacyConfig({
      resourcePlan: [{ tool: 'analysis' }],
      globalSettings: { gradeLevel: '5th Grade' },
      standards: 'NGSS 5-ESS2-1', standardsContext, instructionalContext,
    }, { blueprintId: 'bp-new-standard' });
    const revised = service.revise(blueprint, { standards: 'NGSS 5-PS1-1' });
    expect(revised.ok).toBe(true);
    expect(revised.value.standardsContext).toMatchObject({
      inputText: 'NGSS 5-PS1-1', promptText: 'NGSS 5-PS1-1', resolutionStatus: 'unresolved',
    });
    expect(revised.value.instructionalContext.standardsFingerprint).not.toBe('txt-approved-standards');
  });

  it('preserves educator row designations across AI revision and rejects model-minted authorization', async () => {
    const service = BlueprintService.createBlueprintService({
      contracts: Contracts,
      modifyBlueprint: async (legacy) => ({
        ...legacy,
        resourcePlan: [
          { tool: 'simplified', uiId: 'simplified-0', directive: 'Revise the companion.' },
          {
            tool: 'quiz', uiId: 'quiz-new', directive: 'Add a check.',
            instructionalText: {
              role: 'primary', form: 'adapted', designationSource: 'educator',
              replacementAuthorization: { authorized: true, source: 'educator' },
            },
          },
        ],
      }),
    });
    const blueprint = Contracts.fromLegacyConfig({
      resourcePlan: [{
        tool: 'simplified', uiId: 'simplified-0', directive: 'Original companion.',
        instructionalText: {
          role: 'supplemental', form: 'adapted', designationSource: 'educator',
          replacementAuthorization: { authorized: false, source: 'none' },
        },
      }],
      globalSettings: { gradeLevel: '5th Grade' },
      standardsContext,
      instructionalContext,
    }, { blueprintId: 'bp-ai-row-context' });
    const revised = await service.reviseWithAI(blueprint, 'Revise and add a quiz.');
    expect(revised.plan.find((row) => row.tool === 'simplified').instructionalText).toMatchObject({
      role: 'supplemental', form: 'adapted', designationSource: 'educator',
      replacementAuthorization: { authorized: false, source: 'none' },
    });
    expect(revised.plan.find((row) => row.tool === 'quiz').instructionalText).toMatchObject({
      role: 'unspecified', form: 'original', designationSource: 'workflow-default',
      replacementAuthorization: { authorized: false, source: 'none' },
    });
  });

  it('stamps adapted headless-pack resources as supplemental without changing the legacy type', async () => {
    let providerPrompt = '';
    const result = await ResourcePack.generate({
      requestId: 'pack-context',
      title: 'Context pack',
      sourceTopic: 'Water cycle',
      sourceText: 'Water evaporates, condenses, and falls as precipitation.',
      gradeLevel: '5th Grade',
      language: 'English',
      standards: 'NGSS 5-ESS2-1',
      standardsContext,
      instructionalContext,
      learningGoal: 'Explain interactions in the water cycle.',
      resourcePlan: [{ type: 'simplified', directive: 'Create an optional companion.' }],
      privacy: { confirmNoStudentPii: true, confirmSourcePermission: true },
      providerPolicy: { provider: 'stub', allowMeteredUsage: false },
    }, {
      name: 'stub',
      generateText: async (prompt) => {
        providerPrompt = prompt;
        return { history: [{ id: 'adapted-1', type: 'simplified', title: 'Adapted Text', data: 'This supplemental text explains how water changes state and moves through the cycle in clear steps.' }] };
      },
    });
    expect(result.ok).toBe(true);
    expect(result.value.history[0]).toMatchObject({
      type: 'simplified',
      instructionalText: {
        role: 'supplemental',
        form: 'adapted',
        replacementAuthorization: { authorized: false, source: 'none' },
      },
    });
    expect(result.value.allopack.instructionalContext.standardsFingerprint).toBe('txt-approved-standards');
    expect(providerPrompt).toContain('Preserve its required content, cognitive verbs');
    expect(providerPrompt).toContain('SOURCED TEXT-ACCESS EXPECTATION');
  });

  it('pins the source orchestration seams that are compiled into browser modules', () => {
    const fullPack = readFileSync(resolve(root, 'generation_helpers_source.jsx'), 'utf8');
    const blueprint = readFileSync(resolve(root, 'phase_o_misc_handlers_source.jsx'), 'utf8');
    const chat = readFileSync(resolve(root, 'udl_chat_source.jsx'), 'utf8');
    const blueprintCard = readFileSync(resolve(root, 'persona_ui_source.jsx'), 'utf8');

    expect(fullPack).toContain("const essentials = ['analysis', 'lesson-plan'];");
    expect(fullPack).toContain("_activeInstructionalContext.primaryTextPolicy === 'preserve-primary'");
    expect(fullPack).toContain('instructionalText: _cloneFullPackValue(item.instructionalText)');
    expect(fullPack).toContain('standardsFingerprint: _activeInstructionalContext.standardsFingerprint');
    expect(fullPack).toContain('removeFullPackPlanResource');

    expect(blueprint).toContain('const executionSettingsSnapshot = settingsSnapshot || Object.freeze({');
    expect(blueprint).toContain('standardsContext: executionStandardsContext');
    expect(blueprint).toContain('instructionalText: stepInstructionalText');
    expect(chat).toContain('standardsContext: resolvedStandardsContext');
    expect(chat).toContain('instructionalContext,');
    expect(blueprintCard).toContain('instructionalText: getPlanInstructionalText(type');
    expect(blueprintCard).toContain('instructionalText: getPlanInstructionalText(i.type, i.instructionalText)');
    expect(blueprintCard).toContain("instructionalText: getPlanInstructionalText('simplified', null)");
  });

  it('makes a reviewed Full Pack row removable without mutating the approved draft', () => {
    const source = readFileSync(resolve(root, 'generation_helpers_source.jsx'), 'utf8');
    new Function(source + '\n//# sourceURL=generation_helpers_source.jsx')();
    const remove = window.AlloModules.GenerationHelpers.removeFullPackPlanResource;
    const run = {
      status: 'ready',
      preflight: {
        selected: [
          { type: 'simplified', uiId: 'simplified-0', index: 0 },
          { type: 'quiz', uiId: 'quiz-1', index: 1 },
        ],
        skipped: [],
        differentiation: { types: ['simplified'], levelCount: 2 },
        capacity: { provider: 'gemini' },
      },
    };
    const updated = remove(run, 'simplified-0');
    expect(updated).not.toBe(run);
    expect(run.preflight.selected).toHaveLength(2);
    expect(updated.preflight.selected).toEqual([{ type: 'quiz', uiId: 'quiz-1', index: 0 }]);
    expect(updated.preflight.estimatedResourceGenerations).toBe(1);
    expect(updated.preflight.skipped.at(-1).reason).toContain('Removed by educator');
  });

  it('derives a dispatcher snapshot for Unit Path-style Blueprint callers that omit one', async () => {
    const source = readFileSync(resolve(root, 'phase_o_misc_handlers_source.jsx'), 'utf8');
    new Function(source + '\n//# sourceURL=phase_o_misc_handlers_source.jsx')();
    const generateCalls = [];
    const result = await window.AlloModules.PhaseOHandlers.executeOneBlueprint({
      resourcePlan: [{ tool: 'quiz', uiId: 'quiz-unit', directive: 'Check the lesson focus.' }],
      globalSettings: { gradeLevel: '8th Grade' },
      standardsContext,
      instructionalContext: { ...instructionalContext, instructionalGrade: '8th Grade' },
    }, {
      handleGenerate: async (...args) => {
        generateCalls.push(args);
        return { id: 'quiz-unit-result', type: 'quiz', data: { questions: [] } };
      },
      historyOverride: [],
      dna: { grade: '8th Grade', standard: standardsContext.promptText, concepts: [], keyTerms: [] },
      initialSourceText: 'Primary source text.',
    });
    expect(result.items).toHaveLength(1);
    expect(generateCalls[0][6]).toMatchObject({
      gradeLevel: '8th Grade',
      instructionalContext: { standardsFingerprint: 'txt-approved-standards' },
    });
    expect(generateCalls[0][4]).toMatchObject({
      standardsContext: { promptText: standardsContext.promptText },
      instructionalText: { role: 'unspecified', form: 'original' },
    });
  });
});
