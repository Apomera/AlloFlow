import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = file => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('Blueprint generation-matrix review UI', () => {
  const source = read('persona_ui_source.jsx');

  it('preserves frozen generation decisions while the reviewed plan is synchronized', () => {
    for (const field of [
      'generationAction',
      'generationIdentity',
      'generationVariants',
      'existingArtifactId',
      'variantKey',
      'explicitVariantKey',
      'variantKeyDerived',
      'sourceFingerprint',
      'contextFingerprint',
      'contextInputsFingerprint',
      'generationPolicy',
      'novelResource',
    ]) {
      expect(source).toContain(field);
    }
  });

  it('invalidates the frozen matrix when an educator changes a type or directive', () => {
    expect(source.match(/generationVariants = \[\]/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/generationIdentity = null/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/generationAction = null/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/explicitVariantKey = null/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/variantKeyDerived = false/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('previews the total calls, reuse, audiences, languages, and each row impact', () => {
    expect(source).toContain('data-testid="bp-generation-matrix-summary"');
    expect(source).toContain('data-testid="bp-row-generation-impact"');
    expect(source).toContain("variant.action !== 'reuse'");
    expect(source).toContain("variant.action === 'reuse'");
    expect(source).toContain('blueprintGrades.join');
    expect(source).toContain('blueprintLanguages');
    expect(source).toContain('configuredLanguages');
  });

  it('treats partial rows as settled and exposes every runtime variant for preview', () => {
    expect(source).toContain("partial:     { label: t('blueprint.status_partial')");
    expect(source).toContain("r.status === 'partial'");
    expect(source).toContain('data-testid="bp-variant-results"');
    expect(source).toContain('data-testid="bp-variant-result"');
    expect(source).toContain('data-testid="bp-preview-variant-btn"');
    expect(source).toContain('artifactId: variant && (variant.artifactId || variant.resourceId)');
    expect(source).toContain('resourceIds: _rowRun && Array.isArray(_rowRun.resourceIds)');
    expect(source).toContain('onPreviewStep(item.id, selection.resourceId, selection)');
    expect(source).toContain('_missingRuntimeResourceIds');
    expect(source).toContain('_runtimeArtifactMissing(variant)');
    expect(source).toContain("data-variant-status={isMissingArtifact ? 'missing'");
    expect(source).toContain('isSuccessful && typeof onPreviewStep');
  });

  it('shows reviewed-setting drift, source choice, and resolved translation impact', () => {
    expect(source).toContain('data-testid="bp-settings-stale-notice"');
    expect(source).toContain('run?.settingsStale');
    expect(source).toContain('staleSettingNames.map(readableSettingName)');
    expect(source).toContain('data-testid="bp-source-choice-notice"');
    expect(source).toContain('sourceSelection?.divergentFromLatestAnalysis');
    expect(source).toContain('data-testid="bp-translation-impact"');
    expect(source).toContain('resolvedTranslationTarget');
    expect(source).toContain('embeddedGlossaryLanguages');
  });

  it('discloses a missing Generation Matrix and offers a truthful retry state', () => {
    expect(source).toContain("typeof matrix.resolveGenerationMatrix === 'function'");
    expect(source).toContain('plannedMatrixUnavailable');
    expect(source).toContain('runtimeMatrixUnavailable');
    expect(source).toContain('data-testid="bp-matrix-unavailable-warning"');
    expect(source).toContain('data-testid="bp-matrix-retry-guidance"');
    expect(source).toContain('data-testid="bp-row-matrix-unavailable"');
    expect(source).toContain("run.reasonCode === 'generation-matrix-unavailable'");
    expect(source).toContain('Exact call, reuse, and audience-version counts are unavailable');
    expect(source).toContain('Nothing is generated while this warning is shown.');
    expect(source).toContain('Retry generation planning');
  });

  it('has durable English copy for matrix review rather than relying only on JSX fallbacks', () => {
    const strings = read('ui_strings.js');
    for (const key of [
      'generation_impact',
      'output_languages',
      'new_generations',
      'reused_outputs',
      'matrix_refresh_pending',
      'row_matrix_pending',
    ]) {
      expect(strings).toContain(`"${key}":`);
    }
  });
});

describe('Blueprint source and Universal image-style adapters', () => {
  const udl = read('udl_chat_source.jsx');
  const phaseO = read('phase_o_misc_handlers_source.jsx');

  it('records a deliberate current-vs-analysis source choice in the plan and run', () => {
    expect(udl).toContain('resolveBlueprintSourceChoice');
    expect(udl).toContain('divergentFromLatestAnalysis');
    expect(udl).toContain('sourceChoiceRequired: false');
    expect(udl).toContain('sourcePolicy: Object.assign');
    expect(phaseO).toContain('_resolveBlueprintSourceSelection');
    expect(phaseO).toContain('sourceSelection: _sourceSelection.metadata');
  });

  it('accepts universalImageStyle as the canonical imageGenerationStyle alias', () => {
    expect(udl).toContain('universalImageStyle');
    expect(udl).toContain("owns('universalImageStyle')");
    expect(phaseO).toContain('const universalImageStyle = deps && deps.universalImageStyle');
    expect(phaseO).toContain('universalImageStyle: _reviewedImageGenerationStyle');
    expect(phaseO).toContain('contextInputsFingerprint: variant.contextInputsFingerprint');
  });
});

describe('Full Pack generation-matrix review UI', () => {
  // The Full Pack run view was extracted from ANTI into its own CDN module.
  const source = read('view_full_pack_run_source.jsx');

  it('preserves reviewed matrix cells when run state is joined onto plan rows', () => {
    expect(source).toContain("return Object.assign({}, item, { key: item.uiId");
    expect(source).toContain('row.generationVariants');
  });

  it('shows new, reused, grade, and language cells for every ready row', () => {
    expect(source).toContain('data-testid="full-pack-row-generation-impact"');
    expect(source).toContain('data-testid="full-pack-generation-cells"');
    expect(source).toContain("variant.action !== 'reuse'");
    expect(source).toContain("variant.action === 'reuse'");
    expect(source).toContain('[variant.grade, variant.language].filter(Boolean).join');
    expect(source).toContain('rowGenerationVariants.map((variant, variantIndex)');
  });
});

describe('direct resource identity handoff', () => {
  const dispatcher = read('generate_dispatcher_source.jsx');

  it('stamps individual-tool artifacts so later plans can reuse them safely', () => {
    expect(dispatcher).toContain('_generationMatrixModule.resolveGenerationMatrix');
    expect(dispatcher).toContain('sourceFingerprint: _generationSourceFingerprint');
    expect(dispatcher).toContain('contextFingerprint: _generationContextFingerprint');
    expect(dispatcher).toContain('generationIdentity: _resolvedGenerationIdentity');
    expect(dispatcher).toContain('variantKeyDerived: _resolvedVariantKeyDerived');
  });
});

describe('host Generation Matrix wiring', () => {
  const host = read('AlloFlowANTI.txt');

  it('eagerly loads the policy and forwards all identity-bearing Universal Settings', () => {
    expect(host).toContain("loadModule('GenerationMatrix'");
    expect(host).toContain('differentiationRange, differentiationTypes, differentiationCustomGrades');
    expect(host).toContain('translationMode, translationTargetChoices, resolveTranslationPolicy');
    expect(host).toContain('useEmojis, universalImageStyle, imageGenerationStyle, imageAspectRatio, outlineType, visualStyle');
    expect(host).toMatch(/const _alloPhaseOHandlersDeps[\s\S]*?selectedLanguages,\s+useEmojis,/);
    expect(host).toContain("provider: String(_aiConfig?.providerId || _aiConfig?.provider || backend)");
    expect(host).toContain("fallbackModel: String(models.fallback || '')");
    expect(host).toContain("visionModel: String(models.vision || '')");
    expect(host).toMatch(/const _alloGenerationHelpersDeps[\s\S]*?quizReflectionCount,[\s\S]*?timelineItemCount,[\s\S]*?bridgeStepCount,/);
    expect(host).toContain('generationConfigSnapshot: (() => {');
  });

  it('forwards each core math setting exactly once to GenerationHelpers', () => {
    const depsBlock = host.match(/const _alloGenerationHelpersDeps = \(\) => \(\{([\s\S]*?)\n\s*\}\);/);
    expect(depsBlock).not.toBeNull();

    for (const key of ['mathSubject', 'mathMode', 'mathInput', 'isMathGraphEnabled']) {
      const occurrences = depsBlock[1].match(new RegExp(`^\\s*${key},\\s*$`, 'gm')) || [];
      expect(occurrences).toHaveLength(1);
    }
  });
});
