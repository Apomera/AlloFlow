import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const root = (name) => resolve(process.cwd(), name);
const publicMirror = (name) => resolve(process.cwd(), 'desktop', 'web-app', 'public', name);
const runtimeModules = [
  'generation_matrix_module.js',
  'generation_helpers_module.js',
  'phase_o_misc_handlers_module.js',
];
const mirroredReleaseFiles = [
  ...runtimeModules,
  'generate_dispatcher_module.js',
  'persona_ui_module.js',
  'udl_chat_module.js',
  'agent_core_contracts_module.js',
  'agent_core_blueprint_service_module.js',
  'ui_strings.js',
];

let Matrix;
let Helpers;
let PhaseO;

beforeAll(() => {
  // Load the compiled release modules in their production dependency order.
  // These are deliberately not the editable *_source.jsx files.
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.GenerationMatrix;
  delete window.AlloModules.GenerationHelpers;
  delete window.AlloModules.GenerationHelpersModule;
  delete window.AlloModules.PhaseOHandlers;
  delete window.AlloModules.PhaseOHandlersModule;
  runtimeModules.forEach(loadAlloModule);
  Matrix = window.AlloModules.GenerationMatrix;
  Helpers = window.AlloModules.GenerationHelpers;
  PhaseO = window.AlloModules.PhaseOHandlers;
});

describe('compiled GenerationMatrix runtime smoke', () => {
  it('registers the matrix and critical Full Pack/Blueprint exports', () => {
    expect(Matrix).toBeTruthy();
    expect(Matrix.resolveGenerationMatrix).toBeTypeOf('function');
    expect(Matrix.resolvePlanRows).toBeTypeOf('function');
    expect(Matrix.buildFrozenGenerationSettings).toBeTypeOf('function');

    expect(Helpers).toBeTruthy();
    expect(Helpers.handlePlanFullPack).toBeTypeOf('function');
    expect(Helpers.handleGenerateFullPack).toBeTypeOf('function');
    expect(Helpers.handleRetryFailedFullPack).toBeTypeOf('function');

    expect(PhaseO).toBeTruthy();
    expect(PhaseO.executeOneBlueprint).toBeTypeOf('function');
    expect(PhaseO.handleExecuteBlueprint).toBeTypeOf('function');
    expect(PhaseO.handleRebuildBlueprintStep).toBeTypeOf('function');
  });

  it('resolves the compiled grade x language matrix deterministically', () => {
    const resolved = Matrix.resolveGenerationMatrix({ tool: 'quiz', directive: 'Check understanding.' }, {
      sourceText: 'A deterministic source.',
      gradeLevel: '6th Grade',
      language: 'All Selected Languages',
      selectedLanguages: ['Spanish'],
      differentiationRange: 'Both',
      differentiationTypes: ['quiz'],
    });
    expect(resolved.variants).toHaveLength(10);
    expect(new Set(resolved.variants.map((cell) => cell.grade)).size).toBe(5);
    expect(new Set(resolved.variants.map((cell) => cell.language))).toEqual(new Set(['English', 'Spanish']));
    expect(resolved.variants.every((cell) => typeof cell.generationIdentity === 'string')).toBe(true);
  });

  it('executes a compiled Blueprint missing-reuse fallback with runtime matrix metadata', async () => {
    const generate = vi.fn(async () => ({ id: 'compiled-replacement', type: 'analysis', data: { originalText: 'Source' } }));
    const steps = [];
    const result = await PhaseO.executeOneBlueprint({ resourcePlan: [{
      tool: 'analysis', uiId: 'compiled-row', generationAction: 'reuse', existingArtifactId: 'deleted-resource',
      generationVariants: [{
        generationIdentity: 'gm-compiled-reuse', action: 'reuse', existingArtifactId: 'deleted-resource',
        language: 'English', explicitVariantKey: null, variantKeyDerived: false,
      }],
    }] }, {
      handleGenerate: generate,
      historyOverride: [],
      initialSourceText: 'Source',
      onStep: (step) => steps.push(step),
    });

    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][4]).toMatchObject({
      generationMatrixManaged: true,
      generationIdentity: 'gm-compiled-reuse',
      generationAction: 'generate',
      explicitVariantKey: null,
      variantKeyDerived: false,
      skipDifferentiation: true,
    });
    expect(result.failedRows).toEqual([]);
    expect(steps.at(-1)).toMatchObject({
      status: 'landed', generationAction: 'generate', reviewedGenerationAction: 'reuse',
    });
  });

  it('contains the critical matrix integration markers in compiled code', () => {
    const helpers = readFileSync(root('generation_helpers_module.js'), 'utf8');
    const phaseO = readFileSync(root('phase_o_misc_handlers_module.js'), 'utf8');
    const dispatcher = readFileSync(root('generate_dispatcher_module.js'), 'utf8');
    const persona = readFileSync(root('persona_ui_module.js'), 'utf8');
    const udl = readFileSync(root('udl_chat_module.js'), 'utf8');
    const contracts = readFileSync(root('agent_core_contracts_module.js'), 'utf8');
    const blueprintService = readFileSync(root('agent_core_blueprint_service_module.js'), 'utf8');
    for (const marker of [
      '_getGenerationMatrixModule', 'resolveGenerationMatrix', 'matrixExecutionEnabled',
      'generationIdentity', 'explicitVariantKey', 'variantKeyDerived',
    ]) expect(helpers).toContain(marker);
    for (const marker of [
      '_resolveBlueprintExecutionMatrix', 'resolveGenerationMatrix', 'generationMatrixManaged',
      'reviewedGenerationAction', 'sourceChanged', 'explicitVariantKey', 'variantKeyDerived',
    ]) expect(phaseO).toContain(marker);
    expect(dispatcher).toContain('_reviewedGenerationConfigDrift');
    expect(persona).toContain('_missingRuntimeResourceIds');
    expect(udl).toContain('frozenGenerationOptions');
    for (const source of [contracts, blueprintService]) {
      expect(source).toContain('contextInputsFingerprint');
      expect(source).toContain('generationConfigFingerprint');
    }
  });
});

describe('compiled runtime mirror parity', () => {
  it.each(mirroredReleaseFiles)('%s is byte-identical to its public mirror', (filename) => {
    const canonical = readFileSync(root(filename));
    const mirror = readFileSync(publicMirror(filename));
    expect(Buffer.compare(canonical, mirror), filename).toBe(0);
  });
});
