import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const Matrix = require('../generation_matrix_module.js');

const BASE = Object.freeze({
  sourceText: 'Plate tectonics explains how Earth changes over time.',
  gradeLevel: '6th Grade',
  language: 'English',
});

function descriptorFor(resource, options = BASE, overrides = {}) {
  const matrix = Matrix.resolveGenerationMatrix(resource, options);
  const cell = matrix.variants[0];
  return Object.assign({
    id: 'artifact-' + cell.type,
    type: cell.type,
    generationIdentity: cell.generationIdentity,
    sourceFingerprint: cell.sourceFingerprint,
    sourceArtifactId: cell.sourceArtifactId,
    contextFingerprint: cell.contextFingerprint,
    contextInputsFingerprint: cell.contextInputsFingerprint,
    generationConfig: cell.generationConfig,
    generationConfigFingerprint: cell.generationConfigFingerprint,
    grade: cell.grade,
    language: cell.language,
    variantKey: resource.variantKey || '',
    directive: resource.directive || '',
    mode: resource.mode || '',
  }, overrides);
}

describe('Generation Matrix module contract', () => {
  it('publishes the same frozen API through CommonJS and AlloModules', () => {
    expect(Object.isFrozen(Matrix)).toBe(true);
    expect(window.AlloModules.GenerationMatrix).toBe(Matrix);
    for (const name of [
      'resolveGenerationMatrix',
      'resolvePlanRows',
      'buildFrozenGenerationSettings',
      'buildGenerationIdentity',
      'buildVariantKey',
      'getResourcePolicy',
      'normalizeSourceFingerprint',
      'normalizeLanguageValue',
      'normalizeLanguageValues',
      'projectEffectiveGenerationConfig',
      'buildGenerationConfigFingerprint',
    ]) {
      expect(typeof Matrix[name]).toBe('function');
    }
  });

  it('pins the exact dispatcher and universal differentiation allowlists', () => {
    expect(Matrix.DIFFERENTIABLE_TYPES).toEqual([
      'simplified', 'glossary', 'quiz', 'faq', 'outline', 'sentence-frames',
      'timeline', 'concept-sort', 'dbq', 'note-taking', 'anchor-chart',
      'applied-challenge',
    ]);
    expect(Matrix.MULTILINGUAL_FANOUT_TYPES).toEqual([
      'simplified', 'outline', 'image', 'quiz', 'faq', 'sentence-frames',
      'timeline', 'concept-sort', 'dbq', 'lesson-plan', 'adventure',
      'gemini-bridge', 'math', 'note-taking', 'anchor-chart',
      'applied-challenge', 'persona',
    ]);
    expect(Matrix.getResourcePolicy('analysis')).toMatchObject({
      cardinality: 'source-global-singleton', scope: 'source', allowVariants: false,
    });
    expect(Matrix.getResourcePolicy('image')).toMatchObject({
      cardinality: 'variant-repeatable', allowVariants: true,
    });
    expect(Matrix.isSingletonType('glossary')).toBe(true);
    expect(Matrix.isRepeatableType('quiz')).toBe(true);
  });
});

describe('frozen generation settings and stable identities', () => {
  it('normalizes, derives, and deeply freezes a privacy-safe settings snapshot', () => {
    const settings = Matrix.buildFrozenGenerationSettings({
      sourceText: '  Plate   tectonics  ',
      sourceArtifactId: ' source-1 ',
      gradeLevel: '6th Grade',
      leveledTextLanguage: 'All Selected Languages',
      selectedLanguages: ['Spanish', ' spanish ', 'French'],
      differentiationRange: 'Custom',
      differentiationCustomGrades: ['7th Grade', '5th Grade', '7th Grade'],
      differentiationTypes: ['quiz', 'quiz', 'glossary'],
      standardsFingerprint: 'std-1',
      rosterGroupId: 'group-a',
      translationMode: 'auto',
      currentUiLanguage: 'Spanish',
      translationPolicy: { target: 'English' },
      universalImageStyle: 'watercolor',
      backend: 'cloud',
      provider: 'gemini',
      model: 'gemini-current',
      toolOverrides: { quiz: { quizCount: 7 } },
    });

    expect(settings).toMatchObject({
      version: Matrix.VERSION,
      sourceArtifactId: 'source-1',
      gradeLevel: '6th Grade',
      language: 'All Selected Languages',
      selectedLanguages: ['Spanish', 'French'],
      differentiationGrades: ['5th Grade', '6th Grade', '7th Grade'],
      differentiationTypes: ['quiz', 'glossary'],
      standardsFingerprint: 'std-1',
      groupId: 'group-a',
      translationMode: 'auto',
      currentUiLanguage: 'Spanish',
      translationTarget: 'English',
      backend: 'cloud',
      provider: 'gemini',
      model: 'gemini-current',
    });
    expect(settings.generationOptions.universalImageStyle).toBe('watercolor');
    expect(settings.toolOverrides).toEqual({ quiz: { quizCount: 7 } });
    expect(settings.sourceFingerprint).toBe(Matrix.fingerprintSourceText('Plate tectonics'));
    expect(settings).not.toHaveProperty('sourceText');
    expect(Object.isFrozen(settings)).toBe(true);
    expect(Object.isFrozen(settings.selectedLanguages)).toBe(true);
    expect(Object.isFrozen(settings.differentiationGrades)).toBe(true);
  });

  it('normalizes source whitespace and object key order without conflating different sources', () => {
    expect(Matrix.fingerprintSourceText('one   two\nthree')).toBe(
      Matrix.fingerprintSourceText('one two three'),
    );
    expect(Matrix.fingerprintSourceText('one two')).not.toBe(
      Matrix.fingerprintSourceText('one three'),
    );

    const left = Matrix.buildGenerationIdentity(
      { type: 'quiz', directive: '  Check Evidence  ', mode: 'Mixed' },
      BASE,
    );
    const right = Matrix.buildGenerationIdentity(
      { mode: 'mixed', directive: 'check   evidence', type: 'quiz' },
      Object.assign({}, BASE),
    );
    expect(left).toBe(right);
  });

  it('emits one canonical source namespace while accepting legacy fp descriptors', () => {
    const canonical = Matrix.fingerprintSourceText(BASE.sourceText);
    const legacy = canonical.replace(/^src-/, 'fp-');
    expect(Matrix.normalizeSourceFingerprint(legacy)).toBe(canonical);
    expect(Matrix.buildFrozenGenerationSettings({
      ...BASE,
      sourceFingerprint: 'fp-deliberately-stale',
    }).sourceFingerprint).toBe(canonical);

    const result = Matrix.resolveGenerationMatrix({ type: 'analysis' }, {
      ...BASE,
      existingArtifacts: [{ id: 'legacy-fp', type: 'analysis', sourceFingerprint: legacy }],
    });
    expect(result.action).toBe('reuse');
    expect(result.sourceFingerprint.startsWith('src-')).toBe(true);
  });

  it('keeps analysis source-global while context and translation affect other resources', () => {
    const analysisA = Matrix.buildGenerationIdentity({ type: 'analysis' }, {
      ...BASE, groupId: 'a', translationMode: 'none', currentUiLanguage: 'English',
    });
    const analysisB = Matrix.buildGenerationIdentity({ type: 'analysis' }, {
      ...BASE, gradeLevel: '12th Grade', language: 'Spanish', groupId: 'b',
      translationMode: 'auto', currentUiLanguage: 'French', translationTarget: 'English',
    });
    expect(analysisA).toBe(analysisB);

    const quizA = Matrix.buildGenerationIdentity({ type: 'quiz' }, {
      ...BASE, translationMode: 'none', currentUiLanguage: 'Spanish',
    });
    const quizB = Matrix.buildGenerationIdentity({ type: 'quiz' }, {
      ...BASE, translationMode: 'auto', currentUiLanguage: 'Spanish', translationTarget: 'English',
    });
    expect(quizA).not.toBe(quizB);
  });

  it('keeps derived context and identities idempotent when a frozen snapshot is reused', () => {
    const raw = {
      ...BASE,
      contextFingerprint: 'caller-context',
      standardsFingerprint: 'std-9',
      groupId: 'group-a',
      translationMode: 'auto',
      currentUiLanguage: 'Spanish',
      translationTarget: 'English',
    };
    const once = Matrix.buildFrozenGenerationSettings(raw);
    const twice = Matrix.buildFrozenGenerationSettings(once);
    expect(twice).toEqual(once);

    const direct = Matrix.resolveGenerationMatrix({ type: 'quiz' }, raw);
    const nested = Matrix.resolveGenerationMatrix({ type: 'quiz' }, { settings: once });
    expect(nested.generationIdentity).toBe(direct.generationIdentity);
    expect(nested.settings.contextFingerprint).toBe(once.contextFingerprint);
  });

  it('does not rehash a reviewed dispatcher context but invalidates it after snapshot edits', () => {
    const reviewed = Matrix.buildFrozenGenerationSettings({
      ...BASE, standardsFingerprint: 'std-1', dokLevel: '2', groupId: 'g-a',
    });
    const dispatcherCell = Matrix.buildFrozenGenerationSettings({
      ...BASE,
      standardsFingerprint: 'std-1',
      dokLevel: '2',
      groupId: 'g-a',
      contextFingerprint: reviewed.contextFingerprint,
      contextFingerprintDerived: true,
    });
    expect(dispatcherCell.contextFingerprint).toBe(reviewed.contextFingerprint);

    const revised = Matrix.buildFrozenGenerationSettings({ ...reviewed, dokLevel: '4' });
    expect(revised.contextFingerprint).not.toBe(reviewed.contextFingerprint);
    expect(revised.contextInputsFingerprint).not.toBe(reviewed.contextInputsFingerprint);
  });

  it('keeps shared context identity-bearing and scopes tool settings to consumers', () => {
    const base = Matrix.buildGenerationIdentity({ type: 'quiz' }, BASE);
    for (const changed of [
      { dokLevel: '3' },
      { studentInterests: ['space'] },
      { useEmojis: true },
      { generationContext: { assessment: { answerMode: 'constructed-response' } } },
    ]) {
      expect(Matrix.buildGenerationIdentity(
        { type: 'quiz' }, { ...BASE, ...changed },
      )).not.toBe(base);
    }
    expect(Matrix.buildGenerationIdentity(
      { type: 'quiz' }, { ...BASE, textFormat: 'Dialogue Script' },
    )).toBe(base);
    expect(Matrix.buildGenerationIdentity(
      { type: 'simplified' }, { ...BASE, textFormat: 'Dialogue Script' },
    )).not.toBe(Matrix.buildGenerationIdentity({ type: 'simplified' }, BASE));
    expect(Matrix.buildGenerationIdentity(
      { type: 'quiz' }, { ...BASE, universalImageStyle: 'watercolor' },
    )).toBe(base);
    expect(Matrix.buildGenerationIdentity(
      { type: 'image' }, { ...BASE, universalImageStyle: 'watercolor' },
    )).not.toBe(Matrix.buildGenerationIdentity({ type: 'image' }, BASE));
    // These controls are currently unused by the dispatcher and must not cause
    // false invalidation merely because they exist in Universal Settings.
    expect(Matrix.buildGenerationIdentity(
      { type: 'image' }, { ...BASE, imageAspectRatio: '16:9', imageGenerationStyle: 'cinematic' },
    )).toBe(Matrix.buildGenerationIdentity({ type: 'image' }, BASE));
  });

  it('projects deterministic effective config without secrets or unrelated overrides', () => {
    const projection = Matrix.projectEffectiveGenerationConfig({ type: 'quiz' }, {
      backend: ' Cloud ', provider: ' Gemini ', model: 'gemini-x', apiKey: 'never-store-me',
      toolOverrides: {
        quiz: { quizCount: 8, quizReflectionCount: 2, apiKey: 'also-secret' },
        image: { visualStyle: 'watercolor' },
      },
    });
    expect(projection).toMatchObject({
      version: Matrix.GENERATION_CONFIG_VERSION,
      type: 'quiz', backend: 'cloud', provider: 'gemini', model: 'gemini-x',
      fields: { quizMode: 'exit-ticket', itemCount: 8, reflectionCount: 2 },
    });
    expect(JSON.stringify(projection)).not.toContain('never-store-me');
    expect(JSON.stringify(projection)).not.toContain('watercolor');
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection.fields)).toBe(true);
  });

  it('retains a safe whole-plan projection for Full Pack review fingerprints', () => {
    const projection = Matrix.projectEffectiveGenerationConfig({ type: 'full-pack' }, {
      backend: 'cloud', provider: 'gemini', model: 'text-a', imageProvider: 'openai',
      imageModel: 'image-a',
      generationContext: { common: { standardsRole: 'primary-supported' } },
      toolOverrides: {
        quiz: { quizCount: 6, mode: 'exit-ticket', apiKey: 'drop-me' },
        image: { effectiveVisualStyle: 'watercolor' },
      },
      generationOptions: { universalImageStyle: 'watercolor' },
    });
    expect(projection).toMatchObject({
      type: 'full-pack', backend: 'cloud', provider: 'gemini', model: 'text-a',
      imageProvider: 'openai', imageModel: 'image-a',
      fields: {
        toolOverrides: {
          quiz: { quizCount: 6, mode: 'exit-ticket' },
          image: { effectiveVisualStyle: 'watercolor' },
        },
        generationOptions: { universalImageStyle: 'watercolor' },
      },
      generationContext: { common: { standardsRole: 'primary-supported' } },
    });
    expect(JSON.stringify(projection)).not.toContain('drop-me');
  });

  it('makes backend/model and only the relevant tool override identity-bearing', () => {
    const resource = { type: 'quiz' };
    const base = Matrix.buildGenerationIdentity(resource, { ...BASE, backend: 'cloud', model: 'a' });
    expect(Matrix.buildGenerationIdentity(resource, {
      ...BASE, backend: 'cloud', model: 'b',
    })).not.toBe(base);
    expect(Matrix.buildGenerationIdentity(resource, {
      ...BASE, backend: 'cloud', model: 'a', toolOverrides: { image: { visualStyle: 'ink' } },
    })).toBe(base);
    expect(Matrix.buildGenerationIdentity(resource, {
      ...BASE, backend: 'cloud', model: 'a', toolOverrides: { quiz: { quizCount: 12 } },
    })).not.toBe(base);
    expect(Matrix.buildGenerationIdentity(resource, {
      ...BASE, backend: 'cloud', model: 'a', toolOverrides: { quiz: 'Use source evidence.' },
    })).not.toBe(base);
    expect(Matrix.projectEffectiveGenerationConfig(resource, {
      toolOverrides: { quiz: { customInstructions: 'Use source evidence.' } },
    }).fields.customInstructions).toBe('use source evidence.');

    const image = Matrix.buildGenerationIdentity({ type: 'image' }, {
      ...BASE, imageProvider: 'gemini', imageModel: 'imagen-a',
    });
    expect(Matrix.buildGenerationIdentity({ type: 'image' }, {
      ...BASE, imageProvider: 'openai', imageModel: 'imagen-a',
    })).not.toBe(image);
    expect(Matrix.buildGenerationIdentity({ type: 'outline' }, {
      ...BASE, imageProvider: 'openai', imageModel: 'imagen-b',
    })).toBe(Matrix.buildGenerationIdentity({ type: 'outline' }, BASE));
  });

  it('normalizes language case for identity and case-insensitive fan-out', () => {
    expect(Matrix.normalizeLanguageValues([' English ', 'english', 'Spanish', ' spanish ']))
      .toEqual(['English', 'Spanish']);
    expect(Matrix.buildGenerationIdentity({ type: 'quiz' }, { ...BASE, language: 'Spanish' }))
      .toBe(Matrix.buildGenerationIdentity({ type: 'quiz' }, { ...BASE, language: ' spanish ' }));
  });

  it('makes glossary attached-language membership identity-bearing but order independent', () => {
    const a = Matrix.buildGenerationIdentity({ type: 'glossary' }, {
      ...BASE, selectedLanguages: ['Spanish', 'French'],
    });
    const b = Matrix.buildGenerationIdentity({ type: 'glossary' }, {
      ...BASE, selectedLanguages: ['french', 'SPANISH'],
    });
    const c = Matrix.buildGenerationIdentity({ type: 'glossary' }, {
      ...BASE, selectedLanguages: ['Spanish'],
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('uses a stable explicit variant key and distinguishes directive or mode variants', () => {
    const policy = Matrix.getResourcePolicy('image');
    expect(Matrix.buildVariantKey({ type: 'image', variantKey: ' Map-A ' }, policy)).toBe(
      Matrix.buildVariantKey({ type: 'image', variantKey: 'map-a' }, policy),
    );
    expect(Matrix.buildVariantKey({ type: 'image', directive: 'a' }, policy)).not.toBe(
      Matrix.buildVariantKey({ type: 'image', directive: 'b' }, policy),
    );
    expect(Matrix.buildVariantKey({ type: 'image', mode: 'diagram' }, policy)).not.toBe(
      Matrix.buildVariantKey({ type: 'image', mode: 'photo' }, policy),
    );
  });
});

describe('grade and language matrix resolution', () => {
  const matrixOptions = {
    ...BASE,
    language: 'All Selected Languages',
    selectedLanguages: ['Spanish', 'French', 'spanish'],
    differentiationRange: 'Custom',
    differentiationCustomGrades: ['7th Grade', '5th Grade'],
    differentiationTypes: ['simplified', 'glossary', 'image'],
  };

  it('cross-products grades and languages only for a type on both allowlists', () => {
    const matrix = Matrix.resolveGenerationMatrix({ type: 'simplified' }, matrixOptions);
    expect(matrix.variants).toHaveLength(9);
    expect([...new Set(matrix.variants.map(v => v.grade))]).toEqual([
      '5th Grade', '6th Grade', '7th Grade',
    ]);
    expect([...new Set(matrix.variants.map(v => v.language))]).toEqual([
      'English', 'Spanish', 'French',
    ]);
  });

  it('keeps glossary to one language while preserving its differentiated grades', () => {
    const matrix = Matrix.resolveGenerationMatrix({ type: 'glossary' }, matrixOptions);
    expect(matrix.variants).toHaveLength(3);
    expect(matrix.variants.map(v => v.grade)).toEqual([
      '5th Grade', '6th Grade', '7th Grade',
    ]);
    expect(matrix.variants.every(v => v.language === 'English')).toBe(true);
  });

  it('keeps analysis source-global with no grade and one language', () => {
    const matrix = Matrix.resolveGenerationMatrix({ type: 'analysis' }, matrixOptions);
    expect(matrix.variants).toHaveLength(1);
    expect(matrix.variants[0]).toMatchObject({ grade: null, language: 'English' });
  });

  it('fans image out by language but never by grade because it is not differentiable', () => {
    const matrix = Matrix.resolveGenerationMatrix({ type: 'image' }, matrixOptions);
    expect(matrix.variants).toHaveLength(3);
    expect(matrix.variants.map(v => v.grade)).toEqual([
      '6th Grade', '6th Grade', '6th Grade',
    ]);
    expect(matrix.variants.map(v => v.language)).toEqual(['English', 'Spanish', 'French']);
  });

  it('generates once in English for a type on neither fanout allowlist', () => {
    const matrix = Matrix.resolveGenerationMatrix({ type: 'brainstorm' }, matrixOptions);
    expect(matrix.variants).toHaveLength(1);
    expect(matrix.variants[0]).toMatchObject({ grade: '6th Grade', language: 'English' });
  });
});

describe('existing artifact matching and deterministic actions', () => {
  it('reuses an exact generation identity before considering misleading legacy fields', () => {
    const artifact = descriptorFor({ type: 'glossary', directive: 'key terms' });
    artifact.sourceFingerprint = 'wrong-source';
    artifact.grade = '12th Grade';
    artifact.language = 'Spanish';
    const result = Matrix.resolveGenerationMatrix(
      { type: 'glossary', directive: 'key terms' },
      { ...BASE, existingArtifacts: [artifact] },
    );
    expect(result.action).toBe('reuse');
    expect(result.existingArtifactId).toBe(artifact.id);
    expect(result.novel).toBe(false);
  });

  it('does not fall back to legacy matching when an explicit identity is non-matching', () => {
    const artifact = descriptorFor({ type: 'glossary' }, BASE, {
      generationIdentity: 'gm1-glossary-deliberately-stale',
    });
    const result = Matrix.resolveGenerationMatrix(
      { type: 'glossary' },
      { ...BASE, existingArtifacts: [artifact] },
    );
    expect(result.action).toBe('generate');
  });

  it('tolerantly reuses a legacy artifact by type, source, grade, and language', () => {
    const result = Matrix.resolveGenerationMatrix(
      { type: 'Glossary', directive: 'key terms' },
      {
        ...BASE,
        existingArtifacts: [{
          id: 'legacy-glossary',
          type: 'GLOSSARY',
          sourceFingerprint: Matrix.fingerprintSourceText(BASE.sourceText),
          config: { gradeLevel: '6th Grade', language: 'English', customInstructions: 'KEY TERMS' },
        }],
      },
    );
    expect(result.action).toBe('reuse');
    expect(result.existingArtifactId).toBe('legacy-glossary');
  });

  it('reuses legacy analysis from originalText across grades, languages, and groups', () => {
    const legacy = {
      id: 'legacy-analysis',
      type: 'analysis',
      data: { originalText: BASE.sourceText },
    };
    const result = Matrix.resolveGenerationMatrix(
      { type: 'analysis', directive: 'new group phrasing' },
      {
        sourceText: BASE.sourceText,
        gradeLevel: '12th Grade',
        language: 'Spanish',
        groupId: 'group-z',
        existingArtifacts: [legacy],
      },
    );
    expect(result.action).toBe('reuse');
    expect(result.existingArtifactId).toBe('legacy-analysis');
  });

  it('never reuses a legacy artifact from a different known source', () => {
    const result = Matrix.resolveGenerationMatrix(
      { type: 'glossary' },
      {
        ...BASE,
        existingArtifacts: [{
          id: 'other-source', type: 'glossary',
          sourceFingerprint: Matrix.fingerprintSourceText('A different passage'),
          grade: '6th Grade', language: 'English',
        }],
      },
    );
    expect(result.action).toBe('generate');
  });

  it('does not reuse persisted history across an unknown source unless explicitly allowed', () => {
    const noSource = { gradeLevel: '6th Grade', language: 'English' };
    const artifact = descriptorFor({ type: 'analysis' }, noSource);
    expect(Matrix.resolveGenerationMatrix(
      { type: 'analysis' }, { ...noSource, existingArtifacts: [artifact] },
    ).action).toBe('generate');
    expect(Matrix.resolveGenerationMatrix(
      { type: 'analysis' }, {
        ...noSource, existingArtifacts: [artifact], allowUnknownSourceReuse: true,
      },
    ).action).toBe('reuse');
  });

  it('requires an opt-in before trusting a legacy artifact with a missing grade', () => {
    const legacy = {
      id: 'old', type: 'glossary',
      sourceFingerprint: Matrix.fingerprintSourceText(BASE.sourceText),
      language: 'English',
    };
    expect(Matrix.resolveGenerationMatrix(
      { type: 'glossary' }, { ...BASE, existingArtifacts: [legacy] },
    ).action).toBe('generate');
    expect(Matrix.resolveGenerationMatrix(
      { type: 'glossary' },
      { ...BASE, existingArtifacts: [legacy], allowLegacyMissingGrade: true },
    ).action).toBe('reuse');
  });

  it('refreshes a canonical context singleton when directive or mode changes', () => {
    const artifact = descriptorFor({ type: 'lesson-plan', directive: 'seminar', mode: 'weekly' });
    const directiveChange = Matrix.resolveGenerationMatrix(
      { type: 'lesson-plan', directive: 'project', mode: 'weekly' },
      { ...BASE, existingArtifacts: [artifact] },
    );
    const modeChange = Matrix.resolveGenerationMatrix(
      { type: 'lesson-plan', directive: 'seminar', mode: 'daily' },
      { ...BASE, existingArtifacts: [artifact] },
    );
    expect(directiveChange.action).toBe('refresh');
    expect(modeChange.action).toBe('refresh');
    expect(directiveChange.existingArtifactId).toBe(artifact.id);
  });

  it('honors explicit force refresh for an exact artifact and otherwise reuses it', () => {
    const resource = { type: 'glossary', directive: 'key terms' };
    const artifact = descriptorFor(resource);
    const reused = Matrix.resolveGenerationMatrix(resource, { ...BASE, existingArtifacts: [artifact] });
    const refreshed = Matrix.resolveGenerationMatrix(resource, {
      ...BASE, existingArtifacts: [artifact], forceRefresh: true,
    });
    expect(reused.action).toBe('reuse');
    expect(refreshed.action).toBe('refresh');
    expect(refreshed.existingArtifactId).toBe(artifact.id);
  });

  it('refreshes config drift instead of inventing a pedagogical variant or duplicate singleton', () => {
    const quizExisting = descriptorFor({ type: 'quiz' }, { ...BASE, model: 'model-a' });
    const quiz = Matrix.resolveGenerationMatrix({ type: 'quiz' }, {
      ...BASE, model: 'model-b', existingArtifacts: [quizExisting],
    });
    expect(quiz.action).toBe('refresh');
    expect(quiz.existingArtifactId).toBe(quizExisting.id);

    const glossaryExisting = descriptorFor(
      { type: 'glossary' }, { ...BASE, glossaryDefinitionLevel: 'Same as Source Text' },
    );
    const glossary = Matrix.resolveGenerationMatrix({ type: 'glossary' }, {
      ...BASE,
      glossaryDefinitionLevel: 'Same as Global Level',
      existingArtifacts: [glossaryExisting],
    });
    expect(glossary.action).toBe('refresh');
    expect(glossary.existingArtifactId).toBe(glossaryExisting.id);
  });

  it('keeps analysis source-global but refreshes its one copy when effective analysis config changes', () => {
    const artifact = descriptorFor(
      { type: 'analysis' }, { ...BASE, checkAccuracyWithSearch: false },
    );
    const result = Matrix.resolveGenerationMatrix({ type: 'analysis' }, {
      ...BASE, checkAccuracyWithSearch: true, existingArtifacts: [artifact],
    });
    expect(result.generationIdentity).toBe(artifact.generationIdentity);
    expect(result.action).toBe('refresh');
    expect(result.existingArtifactId).toBe(artifact.id);
  });

  it('does not reuse or mislabel a DOK or interest context change as a row variant', () => {
    const artifact = descriptorFor({ type: 'quiz', directive: 'check evidence' });
    expect(Matrix.resolveGenerationMatrix(
      { type: 'quiz', directive: 'check evidence' },
      { ...BASE, dokLevel: '3', existingArtifacts: [artifact] },
    ).action).toBe('generate');
    expect(Matrix.resolveGenerationMatrix(
      { type: 'quiz', directive: 'check evidence' },
      { ...BASE, studentInterests: ['space'], existingArtifacts: [artifact] },
    ).action).toBe('generate');
  });

  it('classifies only a distinct repeatable directive, mode, or key as a variant', () => {
    const existing = descriptorFor({ type: 'image', directive: 'cross-section', mode: 'diagram' });
    expect(Matrix.resolveGenerationMatrix(
      { type: 'image', directive: ' CROSS-SECTION ', mode: 'DIAGRAM' },
      { ...BASE, existingArtifacts: [existing] },
    ).action).toBe('reuse');
    expect(Matrix.resolveGenerationMatrix(
      { type: 'image', directive: 'regional map', mode: 'diagram' },
      { ...BASE, existingArtifacts: [existing] },
    ).action).toBe('variant');
    expect(Matrix.resolveGenerationMatrix(
      { type: 'image', variantKey: 'teacher-alt' },
      { ...BASE, existingArtifacts: [existing] },
    ).action).toBe('variant');
  });
});

describe('plan duplicate suppression, ordering, and call accounting', () => {
  it('suppresses exact singleton and repeatable duplicates but retains distinct variants', () => {
    const plan = Matrix.resolvePlanRows([
      { type: 'analysis' },
      { type: 'analysis', directive: 'ignored for source-global identity' },
      { type: 'image' },
      { type: 'image' },
      { type: 'image', directive: 'map' },
      { type: 'image', directive: ' MAP ' },
      { type: 'image', mode: 'diagram' },
    ], BASE);

    expect(plan.rows.map(row => row.type)).toEqual(['analysis', 'image', 'image', 'image']);
    expect(plan.rows.map(row => row.generationAction)).toEqual([
      'generate', 'generate', 'variant', 'variant',
    ]);
    expect(plan.skipped).toHaveLength(3);
    expect(plan.summary).toEqual({
      rowCount: 4,
      skippedRowCount: 3,
      variantCount: 4,
      expectedCalls: 4,
      imageCalls: 3,
      actions: { reuse: 0, generate: 2, variant: 2, refresh: 0 },
    });
  });

  it('plans only one canonical singleton even when duplicate rows carry conflicting config', () => {
    const plan = Matrix.resolvePlanRows([
      { type: 'glossary', config: { glossaryDefinitionLevel: 'Same as Source Text' } },
      { type: 'glossary', config: { glossaryDefinitionLevel: 'Same as Global Level' } },
    ], BASE);
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0].generationVariants).toHaveLength(1);
    expect(plan.skipped).toHaveLength(1);
    expect(plan.summary.expectedCalls).toBe(1);
  });

  it('suppresses a second row even when each row expands to the same full matrix', () => {
    const result = Matrix.resolvePlanRows([
      { type: 'simplified' },
      { type: 'simplified' },
    ], {
      ...BASE,
      language: 'All Selected Languages',
      selectedLanguages: ['Spanish'],
      differentiationRange: 'Custom',
      differentiationCustomGrades: ['5th Grade'],
      differentiationTypes: ['simplified'],
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].generationVariants).toHaveLength(4);
    expect(result.skipped).toHaveLength(1);
    expect(result.summary.expectedCalls).toBe(4);
  });

  it('prioritizes novel resources while keeping analysis first and lesson plan last', () => {
    const analysis = descriptorFor({ type: 'analysis' });
    const glossary = descriptorFor({ type: 'glossary' });
    const image = descriptorFor({ type: 'image', directive: 'existing' });
    const plan = Matrix.resolvePlanRows([
      { type: 'glossary' },
      { type: 'image', directive: 'new view' },
      { type: 'outline', directive: 'new organizer' },
      { type: 'analysis' },
      { type: 'lesson-plan' },
    ], { ...BASE, existingArtifacts: [analysis, glossary, image] });

    expect(plan.rows.map(row => row.type)).toEqual([
      'analysis', 'outline', 'glossary', 'image', 'lesson-plan',
    ]);
    expect(plan.rows.map(row => row.generationAction)).toEqual([
      'reuse', 'generate', 'reuse', 'variant', 'generate',
    ]);
    expect(plan.summary.expectedCalls).toBe(3);
    expect(plan.summary.imageCalls).toBe(1);
  });

  it('accepts a nested frozen settings snapshot and an artifact map', () => {
    const settings = Matrix.buildFrozenGenerationSettings(BASE);
    const artifact = descriptorFor({ type: 'analysis' });
    const result = Matrix.resolvePlanRows([{ type: 'analysis' }], {
      settings,
      existingArtifacts: { [artifact.id]: artifact },
    });
    expect(result.rows[0].generationAction).toBe('reuse');
    expect(result.summary.expectedCalls).toBe(0);
    expect(result.settings.sourceFingerprint).toBe(settings.sourceFingerprint);
  });

  it('round-trips derived and explicit variant keys without identity drift', () => {
    const first = Matrix.resolvePlanRows([
      { type: 'image', directive: 'regional map' },
      { type: 'quiz', variantKey: 'teacher-form-b', directive: 'alternate form' },
    ], BASE);
    const firstIdentities = Object.fromEntries(first.rows.map(row => [row.type, row.generationIdentity]));

    const reordered = Matrix.resolvePlanRows(first.rows.slice().reverse(), BASE);
    const secondIdentities = Object.fromEntries(reordered.rows.map(row => [row.type, row.generationIdentity]));
    expect(secondIdentities).toEqual(firstIdentities);

    const image = first.rows.find(row => row.type === 'image');
    expect(image.variantKeyDerived).toBe(true);
    const edited = Matrix.resolvePlanRows([
      { ...image, directive: 'global plate map' },
    ], BASE);
    expect(edited.rows[0].generationIdentity).not.toBe(image.generationIdentity);

    const quiz = first.rows.find(row => row.type === 'quiz');
    expect(quiz.variantKeyDerived).toBe(false);
    expect(quiz.explicitVariantKey).toBe('teacher-form-b');
  });

  it('lets a current caller source replace stale source metadata on a reopened row', () => {
    const first = Matrix.resolvePlanRows([
      { type: 'quiz', directive: 'check evidence' },
    ], BASE);
    const reopened = first.rows[0];
    const changed = Matrix.resolvePlanRows([reopened], {
      ...BASE,
      sourceText: 'Volcanoes form in several different tectonic settings.',
    });
    expect(changed.rows[0].sourceFingerprint).not.toBe(reopened.sourceFingerprint);
    expect(changed.rows[0].generationIdentity).not.toBe(reopened.generationIdentity);
  });
});
