(function() {
'use strict';
if (window.AlloModules && window.AlloModules.GenerationHelpersModule) { console.log('[CDN] GenerationHelpersModule already loaded, skipping'); return; }
// generation_helpers_source.jsx - Phase H.2 of CDN modularization.
// handleGenerateMath + handleGenerateFullPack + handleComplexityAdjustment
// extracted from AlloFlowANTI.txt 2026-04-25.
const FULL_PACK_FALLBACK_TYPES = new Set([
  'analysis', 'simplified', 'glossary', 'image', 'outline', 'sentence-frames',
  'faq', 'timeline', 'persona', 'concept-sort', 'brainstorm', 'quiz',
  'lesson-plan', 'adventure', 'dbq', 'note-taking', 'anchor-chart',
  'alignment-report', 'math', 'gemini-bridge'
]);
const getFullPackKnownTypes = () => {
  try {
    const catalog = typeof window !== 'undefined' && Array.isArray(window.TOOL_CATALOG)
      ? window.TOOL_CATALOG.map(item => item && (item.id || item.type)).filter(Boolean)
      : [];
    return new Set(catalog.length ? catalog : Array.from(FULL_PACK_FALLBACK_TYPES));
  } catch (_) { return new Set(Array.from(FULL_PACK_FALLBACK_TYPES)); }
};
// The review editor intentionally exposes only generator-backed resource
// types. Return a fresh array so a select component cannot mutate the shared
// ordering, and keep workflow actions such as package delivery out of the
// resource list even if a future catalog happens to include them.
const getFullPackEditableResourceTypes = () => Array.from(FULL_PACK_FALLBACK_TYPES)
  .filter(type => !['full-pack', 'package-deliver', 'source-input', 'directions', '_final'].includes(type));
const isUsableGeneratedResource = (item, expectedType) => {
  if (!item || typeof item !== 'object') return false;
  if (expectedType && item.type && item.type !== expectedType) return false;
  if (item.data === null || item.data === undefined) return false;
  if (typeof item.data === 'string' && !item.data.trim()) return false;
  if (Array.isArray(item.data) && item.data.length === 0) return false;
  return true;
};
let _fullPackAbortCtl = null;
let _fullPackRunInFlight = false;
const handleStopFullPack = () => {
  try { if (_fullPackAbortCtl) _fullPackAbortCtl.abort(); } catch (_) {}
  return !!_fullPackAbortCtl;
};

const _isFullPackAbort = (error, signal) => !!(
  (signal && signal.aborted)
  || (error && error.name === 'AbortError')
  || (error && /abort(?:ed|error)/i.test(String(error.message || '')))
);

const _fullPackFingerprint = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return 'fp-' + (hash >>> 0).toString(36) + '-' + text.length;
};
const _cloneFullPackValue = (value) => {
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
};
const _getGenerationMatrixModule = () => {
  try {
    return typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.GenerationMatrix
      : null;
  } catch (_) { return null; }
};
const _normalizeFullPackSourceFingerprint = (value, sourceText) => {
  const matrixModule = _getGenerationMatrixModule();
  try {
    if (matrixModule && typeof matrixModule.normalizeSourceFingerprint === 'function') {
      const normalized = matrixModule.normalizeSourceFingerprint(value, sourceText);
      if (normalized) return String(normalized);
    }
    if (matrixModule && typeof matrixModule.fingerprintSourceText === 'function' && sourceText) {
      const normalized = matrixModule.fingerprintSourceText(sourceText);
      if (normalized) return String(normalized);
    }
  } catch (_) {}
  return String(value || _fullPackFingerprint(sourceText || ''));
};
const _fingerprintFullPackGenerationContextValue = (value) => {
  const matrixModule = _getGenerationMatrixModule();
  try {
    if (matrixModule && typeof matrixModule.fingerprintSourceText === 'function') {
      return String(matrixModule.fingerprintSourceText(
        typeof value === 'string' ? value : JSON.stringify(value)
      ) || '');
    }
  } catch (_) {}
  return value == null || value === '' ? '' : _fullPackFingerprint(
    typeof value === 'string' ? value : JSON.stringify(value)
  );
};
const _FULL_PACK_DIFFERENTIATION_CONTEXT_TYPES = Object.freeze([
  'glossary', 'simplified', 'image', 'quiz', 'brainstorm',
  'sentence-frames', 'alignment-report', 'timeline',
]);
const _FULL_PACK_LESSON_DNA_CONTEXT_TYPES = Object.freeze([
  'quiz', 'sentence-frames', 'adventure',
]);
const _buildFullPackScopedGenerationContext = (
  baseFingerprint, differentiationContext, lessonDNA, batchConfig
) => {
  const resources = {};
  const differentiationContextFingerprint = _fingerprintFullPackGenerationContextValue(differentiationContext);
  const lessonDnaFingerprint = _fingerprintFullPackGenerationContextValue(lessonDNA);
  _FULL_PACK_DIFFERENTIATION_CONTEXT_TYPES.forEach(type => {
    if (differentiationContextFingerprint) {
      resources[type] = { differentiationContextFingerprint };
    }
  });
  _FULL_PACK_LESSON_DNA_CONTEXT_TYPES.forEach(type => {
    if (!lessonDnaFingerprint) return;
    resources[type] = Object.assign({}, resources[type] || {}, { lessonDnaFingerprint });
  });
  const compactBatchConfig = typeof _compactFullPackBatchConfig === 'function'
    ? _compactFullPackBatchConfig(batchConfig || {}) : {};
  const batchResourceMap = {
    glossaryConfig: 'glossary',
    quizConfig: 'quiz',
    outlineConfig: 'outline',
    visualConfig: 'image',
    adventureConfig: 'adventure',
    brainstormConfig: 'brainstorm',
  };
  Object.entries(batchResourceMap).forEach(([key, type]) => {
    if (!compactBatchConfig[key] || typeof compactBatchConfig[key] !== 'object') return;
    resources[type] = Object.assign({}, resources[type] || {}, {
      batchConfig: _cloneFullPackValue(compactBatchConfig[key]),
    });
  });
  const batchGlobals = {};
  Object.entries(compactBatchConfig).forEach(([key, value]) => {
    if (key === 'lessonDNA' || Object.prototype.hasOwnProperty.call(batchResourceMap, key)
        || key === 'hasTimeline') return;
    batchGlobals[key] = _cloneFullPackValue(value);
  });
  if (Object.keys(batchGlobals).length) {
    // Batch-wide planner output may influence any generated support, but the
    // source-global analysis intentionally depends on the source alone so one
    // canonical analysis can be shared across roster groups.
    const contextualTypes = Object.keys(_FULL_PACK_TOOL_OVERRIDE_FIELDS)
      .concat(['lesson-plan', 'alignment-report']);
    contextualTypes.filter(type => type !== 'analysis').forEach(type => {
      resources[type] = Object.assign({}, resources[type] || {}, {
        batchConfig: batchGlobals,
      });
    });
  }
  return Object.keys(resources).length ? { resources } : {};
};
const _FULL_PACK_TOOL_OVERRIDE_FIELDS = Object.freeze({
  simplified: 'leveledTextCustomInstructions',
  quiz: 'quizCustomInstructions',
  adventure: 'adventureCustomInstructions',
  'sentence-frames': 'frameCustomInstructions',
  brainstorm: 'brainstormCustomInstructions',
  faq: 'faqCustomInstructions',
  outline: 'outlineCustomInstructions',
  image: 'visualCustomInstructions',
  timeline: 'timelineTopic',
  'lesson-plan': 'lessonCustomAdditions',
  glossary: 'glossaryCustomInstructions',
  persona: 'personaCustomInstructions',
  'concept-sort': 'conceptSortCustomInstructions',
  dbq: 'dbqCustomInstructions',
  'note-taking': 'noteTakingCustomInstructions',
  'anchor-chart': 'anchorChartCustomInstructions',
});
const _FULL_PACK_TOOL_OPTION_FIELDS = Object.freeze([
  'outlineType', 'visualStyle', 'visualCustomStyle', 'visualLayoutMode',
  'universalImageStyle',
  'quizMode', 'quizCount', 'quizMcqCount', 'quizReflectionCount',
  'passAnalysisToQuiz', 'cellGameDifficulty', 'faqCount',
  'noteTakingTemplateType', 'anchorChartType',
  'frameType', 'fillInTheBlank', 'vocabularyType', 'isAdventureStoryMode',
  'isSocialStoryMode', 'isImmersiveMode', 'adventureChanceMode',
  'adventureConsistentCharacters', 'adventureFreeResponseEnabled',
  'adventureLanguageMode', 'adventureInputMode', 'mcqVisualMode',
  'includeSourceCitations', 'includeBibliography',
  'checkAccuracyWithSearch', 'leveledTextLength', 'keepCitations', 'includeCharts',
  'glossaryDefinitionLevel', 'glossaryImageStyle', 'glossaryTier2Count',
  'glossaryTier3Count', 'includeEtymology', 'autoRemoveWords',
  'useLowQualityVisuals', 'noText', 'creativeMode',
  'timelineMode', 'timelineCount', 'timelineItemCount', 'includeTimelineVisuals',
  'conceptItemCount', 'conceptImageMode', 'selectedConcepts', 'dbqMode',
  'isParentMode', 'isIndependentMode', 'isTeacherMode',
  'bridgeSimType', 'bridgeStepCount', 'personaMode', 'alignmentMode',
]);
const _boundedFullPackConfigValue = (value) => {
  if (value == null || ['boolean', 'number'].includes(typeof value)) return value;
  if (typeof value === 'string') return value.slice(0, 4000);
  if (Array.isArray(value)) return value.slice(0, 100).map(_boundedFullPackConfigValue);
  return undefined;
};
const _fullPackMatrixToolOverrides = (toolOverrides) => Object.fromEntries(
  Object.entries(toolOverrides && typeof toolOverrides === 'object' ? toolOverrides : {})
    .filter(([, value]) => !!String(value || '').trim())
    .map(([type, value]) => [type, {
      customInstructions: String(value),
      generationContext: { customInstructions: String(value) },
    }])
);
const _captureFullPackGenerationConfig = (deps = {}) => {
  const matrixModule = _getGenerationMatrixModule();
  const toolOverrides = {};
  Object.entries(_FULL_PACK_TOOL_OVERRIDE_FIELDS).forEach(([type, field]) => {
    let value = deps[field];
    if (type === 'concept-sort' && !String(value || '').trim()) value = deps.conceptInput;
    toolOverrides[type] = String(value || '').slice(0, 4000);
  });
  const toolOptions = {};
  const canonicalOptionFields = matrixModule && matrixModule.RESOURCE_GENERATION_CONFIG_FIELDS
    ? Object.values(matrixModule.RESOURCE_GENERATION_CONFIG_FIELDS)
        .reduce((all, fields) => all.concat(Array.isArray(fields) ? fields : []), [])
    : [];
  Array.from(new Set(_FULL_PACK_TOOL_OPTION_FIELDS.concat(canonicalOptionFields))).forEach(field => {
    const value = _boundedFullPackConfigValue(deps[field]);
    if (value !== undefined) toolOptions[field] = value;
  });
  const profile = deps.aiProviderProfile && typeof deps.aiProviderProfile === 'object'
    ? deps.aiProviderProfile : {};
  const provider = {
    backend: String(profile.backend || deps.aiBackend || ''),
    provider: String(profile.provider || profile.aiProvider || deps.aiProvider
      || profile.backend || deps.aiBackend || ''),
    model: String(profile.model || deps.aiModel || ''),
    fallbackModel: String(profile.fallbackModel || profile.models?.fallback
      || deps.aiFallbackModel || ''),
    imageProvider: String(profile.imageProvider || ''),
    imageModel: String(profile.imageModel || profile.models?.image || ''),
    visionModel: String(profile.visionModel || profile.models?.vision || ''),
    isLocal: profile.isLocal === true,
  };
  const raw = {
    version: 1,
    toolOverrides,
    toolOptions,
    universal: {
      imageGenerationStyle: String(deps.imageGenerationStyle || ''),
      imageAspectRatio: String(deps.imageAspectRatio || ''),
    },
    provider,
  };
  const canonicalToolOverrides = _fullPackMatrixToolOverrides(toolOverrides);
  const canonicalSettings = {
    toolOverrides: canonicalToolOverrides,
    generationOptions: toolOptions,
    generationContext: { fullPackGenerationConfig: raw, toolOptions },
    imageGenerationStyle: raw.universal.imageGenerationStyle,
    universalImageStyle: raw.universal.imageGenerationStyle,
    imageAspectRatio: raw.universal.imageAspectRatio,
    backend: provider.backend,
    model: provider.model,
    provider: provider.provider,
    fallbackModel: provider.fallbackModel,
    imageProvider: provider.imageProvider,
    imageModel: provider.imageModel,
    visionModel: provider.visionModel,
  };
  let canonical = null;
  let fingerprint = '';
  try {
    if (matrixModule && typeof matrixModule.projectEffectiveGenerationConfig === 'function') {
      canonical = matrixModule.projectEffectiveGenerationConfig({ type: 'full-pack' }, canonicalSettings);
    }
    if (matrixModule && typeof matrixModule.buildGenerationConfigFingerprint === 'function') {
      fingerprint = matrixModule.buildGenerationConfigFingerprint({ type: 'full-pack' }, canonicalSettings) || '';
    }
  } catch (_) {}
  // Compatibility for a stale host. The canonical module owns this once its
  // config projector is available; the fallback is deliberately local to the
  // reviewed Full Pack envelope and never participates in cross-workflow policy.
  if (!fingerprint) fingerprint = _fullPackFingerprint(JSON.stringify(raw));
  return Object.freeze(Object.assign({}, raw, {
    canonical: _cloneFullPackValue(canonical),
    fingerprint: String(fingerprint),
  }));
};
const _fullPackToolOverride = (type, generationConfig) => String(
  generationConfig && generationConfig.toolOverrides
    && generationConfig.toolOverrides[type] || ''
);
const _fullPackGenerationConfigDeps = (generationConfig) => {
  const source = generationConfig && typeof generationConfig === 'object' ? generationConfig : {};
  const overrides = source.toolOverrides && typeof source.toolOverrides === 'object' ? source.toolOverrides : {};
  const out = Object.assign({}, source.toolOptions || {});
  Object.entries(_FULL_PACK_TOOL_OVERRIDE_FIELDS).forEach(([type, field]) => {
    out[field] = String(overrides[type] || '');
  });
  if (!out.conceptSortCustomInstructions && overrides['concept-sort']) {
    out.conceptSortCustomInstructions = String(overrides['concept-sort']);
  }
  out.imageGenerationStyle = String(source.universal && source.universal.imageGenerationStyle || '');
  out.universalImageStyle = out.imageGenerationStyle;
  out.imageAspectRatio = String(source.universal && source.universal.imageAspectRatio || '');
  out.aiProviderProfile = _cloneFullPackValue(source.provider || {});
  out.aiBackend = String(source.provider && source.provider.backend || '');
  out.aiProvider = String(source.provider && source.provider.provider || '');
  out.aiModel = String(source.provider && source.provider.model || '');
  out.aiFallbackModel = String(source.provider && source.provider.fallbackModel || '');
  return out;
};
const _buildFullPackGenerationSettings = (options = {}) => {
  const matrixModule = _getGenerationMatrixModule();
  if (matrixModule && typeof matrixModule.buildFrozenGenerationSettings === 'function') {
    return matrixModule.buildFrozenGenerationSettings(options);
  }
  // Compatibility only for a stale host that has not loaded GenerationMatrix.
  // Policy (singleton/repeatable/reuse decisions) intentionally remains in the
  // shared module; this fallback preserves the former one-call-per-row path.
  return Object.freeze({
    version: 0,
    sourceFingerprint: String(options.sourceFingerprint || ''),
    sourceArtifactId: options.sourceArtifactId || null,
    gradeLevel: String(options.gradeLevel || options.grade || ''),
    language: String(options.language || options.leveledTextLanguage || 'English'),
    selectedLanguages: Array.isArray(options.selectedLanguages) ? options.selectedLanguages.slice() : [],
    differentiationRange: String(options.differentiationRange || 'None'),
    differentiationGrades: Array.isArray(options.differentiationGrades || options.grades)
      ? (options.differentiationGrades || options.grades).slice() : [],
    differentiationTypes: Array.isArray(options.differentiationTypes) ? options.differentiationTypes.slice() : [],
    standardsFingerprint: String(options.standardsFingerprint || ''),
    contextBaseFingerprint: String(options.contextBaseFingerprint || options.contextFingerprint || ''),
    contextFingerprint: String(options.contextFingerprint || ''),
    groupId: options.groupId || null,
    translationMode: String(options.translationMode || options.translationPolicy?.mode || ''),
    currentUiLanguage: String(options.currentUiLanguage || options.uiLanguage || ''),
    translationTarget: String(options.translationTarget || options.translationTargetLanguage
      || options.attachedTranslationTarget || options.translationPolicy?.target || ''),
    studentInterests: Array.isArray(options.studentInterests) ? options.studentInterests.slice() : [],
    dokLevel: String(options.dokLevel || ''),
    useEmojis: !!options.useEmojis,
    textFormat: String(options.textFormat || ''),
    imageGenerationStyle: String(options.imageGenerationStyle || ''),
    imageAspectRatio: String(options.imageAspectRatio || ''),
    generationContext: _cloneFullPackValue(options.generationContext || {}),
    generationOptions: _cloneFullPackValue(options.generationOptions || {}),
    toolOverrides: _cloneFullPackValue(options.toolOverrides || {}),
    generationConfig: _cloneFullPackValue(options.generationConfig || {}),
    generationConfigFingerprint: String(options.generationConfigFingerprint || ''),
    backend: String(options.backend || ''),
    model: String(options.model || ''),
    provider: String(options.provider || ''),
    fallbackModel: String(options.fallbackModel || ''),
    imageProvider: String(options.imageProvider || ''),
    imageModel: String(options.imageModel || ''),
    visionModel: String(options.visionModel || ''),
    forceRefresh: !!options.forceRefresh,
  });
};
const _fallbackFullPackPlanRows = (rows, settings) => {
  const selected = (Array.isArray(rows) ? rows : []).map((raw, index) => {
    const row = raw && typeof raw === 'object' ? raw : {};
    const type = String(row.type || row.tool || '');
    const variantKey = String(row.variantKey || ('legacy-' + type + '-' + index));
    const variant = {
      generationIdentity: row.generationIdentity || null,
      type,
      grade: settings.gradeLevel || '',
      language: settings.language || 'English',
      action: 'generate',
      existingArtifactId: null,
      reason: 'Generation Matrix was unavailable; using legacy Full Pack dispatch.',
      variantKey,
      legacyDispatch: true,
    };
    return Object.assign({}, row, {
      type,
      generationAction: 'generate',
      generationIdentity: variant.generationIdentity,
      generationVariants: [variant],
      existingArtifactId: null,
      variantKey,
    });
  });
  const imageCalls = selected.filter(row => row.type === 'image').length;
  return {
    rows: selected,
    skipped: [],
    summary: {
      rowCount: selected.length,
      variantCount: selected.length,
      expectedCalls: selected.length,
      imageCalls,
      actions: { generate: selected.length, reuse: 0, variant: 0, refresh: 0 },
    },
    settings,
    legacyFallback: true,
  };
};
const _fullPackMatrixCustomInstruction = (type, settings) => {
  const typed = settings && settings.toolOverrides && settings.toolOverrides[type];
  if (typed && typeof typed === 'object') return String(typed.customInstructions || '');
  return typeof typed === 'string' ? typed : '';
};
const _fullPackMatrixIdentityRow = (row, settings) => {
  const source = row && typeof row === 'object' ? row : {};
  const displayDirective = String(source.directive || '');
  const userOverride = _fullPackMatrixCustomInstruction(source.type || source.tool || '', settings);
  const directive = `${displayDirective} ${userOverride ? `(User Note: ${userOverride})` : ''}`.trim();
  return Object.assign({}, source, {
    directive,
    _fullPackDisplayDirective: displayDirective,
  });
};
const _resolveFullPackPlanRows = (rows, options = {}) => {
  const settings = options.settings || _buildFullPackGenerationSettings(options);
  const matrixModule = _getGenerationMatrixModule();
  if (!matrixModule || typeof matrixModule.resolvePlanRows !== 'function') {
    return _fallbackFullPackPlanRows(rows, settings);
  }
  const identityRows = (Array.isArray(rows) ? rows : [])
    .map(row => _fullPackMatrixIdentityRow(row, settings));
  const resolved = matrixModule.resolvePlanRows(identityRows, Object.assign({}, options, settings, {
    settings,
  }));
  if (!resolved || !Array.isArray(resolved.rows) || !resolved.summary) {
    throw new Error('Generation Matrix returned an invalid Full Pack plan.');
  }
  const displayRows = resolved.rows.map(row => {
    const displayDirective = Object.prototype.hasOwnProperty.call(row, '_fullPackDisplayDirective')
      ? row._fullPackDisplayDirective : row.directive;
    const copy = Object.assign({}, row, { directive: displayDirective || '' });
    delete copy._fullPackDisplayDirective;
    return copy;
  });
  return Object.assign({}, resolved, { rows: displayRows, settings: resolved.settings || settings });
};
const _boundedFullPackWorkCount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.floor(parsed))) : 0;
};
const _estimateFullPackRowProviderWork = (row, settings = {}) => {
  const variants = Array.isArray(row && row.generationVariants) && row.generationVariants.length
    ? row.generationVariants
    : [{ action: row && row.generationAction || 'generate' }];
  const pendingVariants = variants.filter(variant => variant && variant.action !== 'reuse');
  const resourceCalls = pendingVariants.length;
  const baseImageCalls = row && row.type === 'image' ? resourceCalls : 0;
  let glossaryImageCalls = 0;
  let glossaryImageEditCalls = 0;
  if (row && row.type === 'glossary' && resourceCalls > 0) {
    pendingVariants.forEach(variant => {
      const generationFields = variant?.generationConfig?.fields || row?.generationConfig?.fields || {};
      const generationOptions = settings?.generationOptions || settings?.toolOptions || {};
      const tier2Count = _boundedFullPackWorkCount(
        generationFields.glossaryTier2Count ?? generationOptions.glossaryTier2Count
      );
      const tier3Count = _boundedFullPackWorkCount(
        generationFields.glossaryTier3Count ?? generationOptions.glossaryTier3Count
      );
      const termCount = tier2Count + tier3Count;
      glossaryImageCalls += termCount;
      const removeWords = generationFields.autoRemoveWords ?? generationOptions.autoRemoveWords;
      if (removeWords === true) glossaryImageEditCalls += termCount;
    });
  }
  const imageCalls = baseImageCalls + glossaryImageCalls + glossaryImageEditCalls;
  const providerCalls = resourceCalls + glossaryImageCalls + glossaryImageEditCalls;
  return {
    resourceCalls,
    providerCalls,
    textCalls: Math.max(0, providerCalls - imageCalls),
    imageCalls,
    glossaryImageCalls,
    glossaryImageEditCalls,
    requestConcurrency: glossaryImageCalls > 0 ? 3 : 1,
  };
};
const _summarizeFullPackMatrixRows = (rows, settings = {}) => {
  const actions = { reuse: 0, generate: 0, variant: 0, refresh: 0 };
  let variantCount = 0;
  let expectedCalls = 0;
  let imageCalls = 0;
  let providerCalls = 0;
  let glossaryImageCalls = 0;
  let glossaryImageEditCalls = 0;
  let maxRequestConcurrency = 1;
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const variants = Array.isArray(row && row.generationVariants) && row.generationVariants.length
      ? row.generationVariants
      : [{ action: row && row.generationAction || 'generate' }];
    variants.forEach(variant => {
      const action = ['reuse', 'generate', 'variant', 'refresh'].includes(variant && variant.action)
        ? variant.action : 'generate';
      actions[action] += 1;
      variantCount += 1;
      if (action !== 'reuse') expectedCalls += 1;
    });
    const work = _estimateFullPackRowProviderWork(row, settings);
    providerCalls += work.providerCalls;
    imageCalls += work.imageCalls;
    glossaryImageCalls += work.glossaryImageCalls;
    glossaryImageEditCalls += work.glossaryImageEditCalls;
    maxRequestConcurrency = Math.max(maxRequestConcurrency, work.requestConcurrency);
  });
  return {
    rowCount: Array.isArray(rows) ? rows.length : 0,
    skippedRowCount: 0,
    variantCount,
    expectedCalls,
    resourceCalls: expectedCalls,
    providerCalls,
    imageCalls,
    glossaryImageCalls,
    glossaryImageEditCalls,
    maxRequestConcurrency,
    actions,
  };
};
const _sameFullPackGenerationIdentity = (left, right) => {
  if (left == null || right == null) return false;
  if (typeof left === 'string' || typeof right === 'string') return String(left) === String(right);
  try { return JSON.stringify(left) === JSON.stringify(right); } catch (_) { return left === right; }
};
const _fullPackHistoryArtifact = (items, variant) => {
  const list = Array.isArray(items) ? items : [];
  const artifactId = variant && (variant.existingArtifactId || variant.resourceId);
  if (artifactId != null) {
    const exact = list.find(item => item && String(item.id) === String(artifactId));
    if (exact) return exact;
  }
  const identity = variant && variant.generationIdentity;
  if (identity != null) {
    return list.find(item => item && _sameFullPackGenerationIdentity(
      item.generationIdentity || item.config?.generationIdentity || item.provenance?.generationIdentity,
      identity
    )) || null;
  }
  return null;
};
const _trackFullPackHistoryArtifact = (items, artifact, variant, action) => {
  if (!artifact || typeof artifact !== 'object') return null;
  const generationIdentity = artifact.generationIdentity || variant?.generationIdentity || null;
  const sourceFingerprint = artifact.sourceFingerprint || artifact.config?.sourceFingerprint
    || variant?.sourceFingerprint || '';
  const sourceArtifactId = artifact.sourceArtifactId || artifact.config?.sourceArtifactId
    || variant?.sourceArtifactId || null;
  const contextFingerprint = artifact.contextFingerprint || artifact.config?.contextFingerprint
    || variant?.contextFingerprint || '';
  const contextInputsFingerprint = artifact.contextInputsFingerprint
    || artifact.config?.contextInputsFingerprint || variant?.contextInputsFingerprint || '';
  const generationConfig = _cloneFullPackValue(artifact.generationConfig
    || artifact.config?.generationConfig || variant?.generationConfig || {});
  const generationConfigFingerprint = artifact.generationConfigFingerprint
    || artifact.config?.generationConfigFingerprint || variant?.generationConfigFingerprint || '';
  const tracked = Object.assign({}, artifact, {
    generationIdentity,
    sourceFingerprint,
    sourceArtifactId,
    contextFingerprint,
    contextInputsFingerprint,
    generationConfig,
    generationConfigFingerprint,
    fullPackGenerationAction: action || variant?.action || 'generate',
    config: Object.assign({}, artifact.config || {}, {
      generationIdentity,
      sourceFingerprint,
      sourceArtifactId,
      contextFingerprint,
      contextInputsFingerprint,
      generationConfig,
      generationConfigFingerprint,
    }),
  });
  const list = Array.isArray(items) ? items : [];
  const index = list.findIndex(item => item && tracked.id != null && String(item.id) === String(tracked.id));
  if (index >= 0) list[index] = tracked;
  else list.push(tracked);
  return tracked;
};
const _fullPackVariantLineageKey = (variant, index = 0) => {
  if (variant && (variant.type || variant.grade || variant.language || variant.variantKey)) {
    return ['cell', variant.type || '', variant.grade || '', variant.language || '',
      variant.variantKey || ''].join('|');
  }
  if (variant && variant.generationIdentity) return 'identity:' + String(variant.generationIdentity);
  return 'cell|||||' + index;
};
const _mergeFullPackVariantLineage = (prior, updates) => {
  const out = (Array.isArray(prior) ? prior : []).map(item => _cloneFullPackValue(item));
  const positions = new Map(out.map((item, index) => [_fullPackVariantLineageKey(item, index), index]));
  (Array.isArray(updates) ? updates : []).forEach((item, index) => {
    const key = _fullPackVariantLineageKey(item, index);
    if (positions.has(key)) out[positions.get(key)] = Object.assign({}, out[positions.get(key)], item);
    else {
      positions.set(key, out.length);
      out.push(_cloneFullPackValue(item));
    }
  });
  return out;
};
const _FULL_PACK_RETRYABLE_STATUSES = new Set(['failed', 'interrupted', 'stopped', 'queued', 'planned']);
const _fullPackVariantNeedsRetry = variant => !!(variant
  && _FULL_PACK_RETRYABLE_STATUSES.has(variant.status || 'planned')
  && variant.retryable !== false);
const _fullPackResourceNeedsRetry = resource => {
  if (!resource || !_FULL_PACK_RETRYABLE_STATUSES.has(resource.status)) return false;
  const variants = Array.isArray(resource.generationVariants) ? resource.generationVariants : [];
  return variants.length ? variants.some(_fullPackVariantNeedsRetry) : resource.retryable !== false;
};
const _fullPackResourceHasUnresolvedWork = resource => {
  if (!resource) return false;
  const variants = Array.isArray(resource.generationVariants) ? resource.generationVariants : [];
  return variants.length
    ? variants.some(variant => variant && _FULL_PACK_RETRYABLE_STATUSES.has(variant.status || 'planned'))
    : _FULL_PACK_RETRYABLE_STATUSES.has(resource.status);
};
const _queueFullPackPlanRows = (rows, existingResources = {}) => {
  const out = Object.assign({}, _cloneFullPackValue(existingResources || {}));
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    if (!row || !row.type) return;
    const key = String(row.uiId || row.key || (row.type + '-' + index));
    const prior = out[key] && typeof out[key] === 'object' ? out[key] : {};
    const plannedVariants = (Array.isArray(row.generationVariants) ? row.generationVariants : [])
      .map(variant => Object.assign({}, variant, {
        status: _FULL_PACK_RETRYABLE_STATUSES.has(variant && variant.status)
          ? variant.status : 'planned',
      }));
    out[key] = Object.assign({}, prior, {
      key,
      type: row.type,
      index,
      directive: row.directive || '',
      instructionalText: _cloneFullPackValue(row.instructionalText),
      generationAction: row.generationAction || row.action || prior.generationAction || 'generate',
      generationIdentity: row.generationIdentity || prior.generationIdentity || null,
      generationVariants: _mergeFullPackVariantLineage(prior.generationVariants, plannedVariants),
      status: prior.status && ['landed', 'completed'].includes(prior.status) ? prior.status : 'queued',
      retryable: prior.retryable === false && !plannedVariants.some(_fullPackVariantNeedsRetry)
        ? false : true,
    });
  });
  return out;
};
const _markQueuedFullPackResourcesStopped = (resources) => Object.fromEntries(
  Object.entries(resources || {}).map(([key, resource]) => {
    if (!resource || !['queued', 'planned'].includes(resource.status)) return [key, resource];
    return [key, Object.assign({}, resource, {
      status: 'stopped',
      retryable: true,
      reason: resource.reason || 'Queued when the Full Pack run stopped.',
    })];
  })
);
const _compactFullPackMatrixArtifacts = (items) => (Array.isArray(items) ? items : [])
  .filter(item => item && typeof item === 'object' && item.id != null && item.type)
  .map(item => {
    const config = item.config && typeof item.config === 'object' ? item.config : {};
    const provenance = item.provenance && typeof item.provenance === 'object' ? item.provenance : {};
    const instructionalText = item.instructionalText && typeof item.instructionalText === 'object'
      ? item.instructionalText : {};
    let sourceFingerprint = item.sourceFingerprint || config.sourceFingerprint || provenance.sourceFingerprint || '';
    const originalText = item.type === 'analysis' && item.data && typeof item.data.originalText === 'string'
      ? item.data.originalText : '';
    if (!sourceFingerprint && originalText) {
      try { sourceFingerprint = _buildFullPackGenerationSettings({ sourceText: originalText }).sourceFingerprint || ''; } catch (_) {}
    }
    const sourceArtifactId = item.sourceArtifactId || config.sourceArtifactId || provenance.sourceArtifactId
      || instructionalText.sourceArtifactId || instructionalText.primaryArtifactId || null;
    const grade = item.grade || item.gradeLevel || item.targetGradeLevel || config.grade || config.gradeLevel
      || instructionalText.complexity?.requestedGrade || '';
    const language = item.language || config.language || instructionalText.complexity?.language || '';
    const generationIdentity = item.generationIdentity || config.generationIdentity || provenance.generationIdentity || null;
    const variantKey = item.variantKey || config.variantKey || provenance.variantKey || '';
    const explicitVariantKey = item.explicitVariantKey || config.explicitVariantKey || provenance.explicitVariantKey || null;
    const variantKeyDerived = item.variantKeyDerived === true || config.variantKeyDerived === true || provenance.variantKeyDerived === true;
    const directive = item.directive || config.customInstructions || '';
    const mode = item.mode || config.mode || '';
    const contextFingerprint = item.contextFingerprint || config.contextFingerprint || provenance.contextFingerprint || '';
    const contextInputsFingerprint = item.contextInputsFingerprint
      || config.contextInputsFingerprint || provenance.contextInputsFingerprint || '';
    const generationConfig = _cloneFullPackValue(item.generationConfig
      || config.generationConfig || provenance.generationConfig || {});
    const generationConfigFingerprint = item.generationConfigFingerprint
      || config.generationConfigFingerprint || provenance.generationConfigFingerprint || '';
    const backend = item.backend || config.backend || provenance.backend || '';
    const provider = item.provider || config.provider || provenance.provider || '';
    const model = item.model || config.model || provenance.model || '';
    const fallbackModel = item.fallbackModel || config.fallbackModel || provenance.fallbackModel || '';
    const imageProvider = item.imageProvider || config.imageProvider || provenance.imageProvider || '';
    const imageModel = item.imageModel || config.imageModel || provenance.imageModel || '';
    const visionModel = item.visionModel || config.visionModel || provenance.visionModel || '';
    const standardsFingerprint = item.standardsFingerprint || config.standardsFingerprint || provenance.standardsFingerprint || '';
    const groupId = item.groupId || item.rosterGroupId || config.groupId || config.rosterGroupId || null;
    const translationMode = item.translationMode || config.translationMode || '';
    const currentUiLanguage = item.currentUiLanguage || config.currentUiLanguage || '';
    const translationTarget = item.translationTarget || config.translationTarget || '';
    const studentInterests = Array.isArray(item.studentInterests || config.studentInterests)
      ? (item.studentInterests || config.studentInterests).slice() : [];
    const dokLevel = item.dokLevel || item.dok || config.dokLevel || config.dok || '';
    const useEmojis = item.useEmojis === true || config.useEmojis === true;
    const textFormat = item.textFormat || config.textFormat || '';
    const imageGenerationStyle = item.imageGenerationStyle || item.imageStyle
      || config.imageGenerationStyle || config.imageStyle || '';
    const imageAspectRatio = item.imageAspectRatio || config.imageAspectRatio || '';
    const generationContext = _cloneFullPackValue(item.generationContext || config.generationContext || {});
    return {
      id: item.id,
      type: item.type,
      generationIdentity: _cloneFullPackValue(generationIdentity),
      sourceFingerprint,
      sourceArtifactId,
      grade,
      language,
      variantKey,
      explicitVariantKey,
      variantKeyDerived,
      directive,
      mode,
      contextFingerprint,
      contextInputsFingerprint,
      generationConfig,
      generationConfigFingerprint,
      backend,
      provider,
      model,
      fallbackModel,
      imageProvider,
      imageModel,
      visionModel,
      standardsFingerprint,
      groupId,
      translationMode,
      currentUiLanguage,
      translationTarget,
      studentInterests,
      dokLevel,
      useEmojis,
      textFormat,
      imageGenerationStyle,
      imageAspectRatio,
      generationContext,
      config: {
        generationIdentity: _cloneFullPackValue(generationIdentity),
        sourceFingerprint,
        sourceArtifactId,
        gradeLevel: grade,
        language,
        variantKey,
        explicitVariantKey,
        variantKeyDerived,
        customInstructions: directive,
        mode,
        contextFingerprint,
        contextInputsFingerprint,
        generationConfig,
        generationConfigFingerprint,
        backend,
        provider,
        model,
        fallbackModel,
        imageProvider,
        imageModel,
        visionModel,
        standardsFingerprint,
        groupId,
        rosterGroupId: groupId,
        translationMode,
        currentUiLanguage,
        translationTarget,
        studentInterests,
        dokLevel,
        useEmojis,
        textFormat,
        imageGenerationStyle,
        imageAspectRatio,
        generationContext,
      },
    };
  });
const _recheckFullPackVariant = (row, reviewedVariant, options = {}) => {
  const matrixModule = _getGenerationMatrixModule();
  if (!matrixModule || typeof matrixModule.resolveGenerationMatrix !== 'function' || reviewedVariant?.legacyDispatch) {
    return Object.assign({}, reviewedVariant || {});
  }
  const grade = reviewedVariant?.grade || options.settings?.gradeLevel || '';
  const language = reviewedVariant?.language || options.settings?.language || 'English';
  const identityRow = _fullPackMatrixIdentityRow(row, options.settings || {});
  const resolved = matrixModule.resolveGenerationMatrix(Object.assign({}, identityRow, {
    grade,
    language,
  }), Object.assign({}, options.settings || {}, {
    sourceText: options.sourceText,
    sourceFingerprint: options.sourceFingerprint || options.settings?.sourceFingerprint,
    sourceArtifactId: options.sourceArtifactId || options.settings?.sourceArtifactId,
    gradeLevel: grade,
    grades: [grade],
    differentiationGrades: [grade],
    differentiationRange: 'None',
    language,
    selectedLanguages: Array.isArray(options.settings?.selectedLanguages)
      ? options.settings.selectedLanguages : [],
    existingArtifacts: Array.isArray(options.existingArtifacts) ? options.existingArtifacts : [],
    groupId: options.groupId || options.settings?.groupId || null,
    allowVariants: true,
    forceRefresh: reviewedVariant?.action === 'refresh',
  }));
  const candidates = resolved && Array.isArray(resolved.variants) ? resolved.variants : [];
  const candidate = candidates.find(item => item && (
    (reviewedVariant?.variantKey && item.variantKey === reviewedVariant.variantKey)
    || _sameFullPackGenerationIdentity(item.generationIdentity, reviewedVariant?.generationIdentity)
  )) || candidates.find(item => item
    && String(item.grade || '') === String(grade || '')
    && String(item.language || '') === String(language || ''))
    || candidates[0];
  return candidate ? Object.assign({}, reviewedVariant || {}, candidate) : Object.assign({}, reviewedVariant || {});
};
const _getInstructionalContextModule = () => {
  try {
    return typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.InstructionalContext
      : null;
  } catch (_) { return null; }
};
const _fullPackStandardsPreserveTextComplexity = (standardsContext, standardsInput = '') => {
  const context = standardsContext && typeof standardsContext === 'object' ? standardsContext : {};
  const constraints = context.instructionalConstraints && typeof context.instructionalConstraints === 'object'
    ? context.instructionalConstraints : {};
  if (constraints.textAccessExpectation === 'preserve-primary') return true;
  const entries = Array.isArray(context.standards) ? context.standards : [];
  const searchable = [
    standardsInput,
    context.inputText,
    context.promptText,
    ...entries.flatMap(entry => entry && typeof entry === 'object'
      ? [entry.code, entry.label, entry.text, entry.statement, entry.description]
      : [entry]),
  ].filter(Boolean).join(' ');
  if (!searchable) return false;
  return /\b(?:text complexity|appropriately complex text|grade[- ]level complex text|complex (?:literary|informational|source) texts?|independently and proficiently|high end of (?:the )?text complexity band)\b/i.test(searchable)
    || /\b(?:CCSS\.)?(?:ELA-LITERACY\.)?(?:RL|RI|RST|RH)\.[A-Z0-9-]+\.10\b/i.test(searchable);
};
const _normalizeFullPackInstructionalContext = (raw, options = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const module = _getInstructionalContextModule();
  if (module && typeof module.normalizeInstructionalContext === 'function') {
    return module.normalizeInstructionalContext(source, {
      instructionalGrade: options.gradeLevel || '',
      standardsContext: options.standardsContext || null,
      standardsInput: options.standardsInput || '',
    });
  }
  const standardsContext = _cloneFullPackValue(source.standardsContext || options.standardsContext || null);
  const constraints = standardsContext && standardsContext.instructionalConstraints || {};
  const sourcedProhibition = constraints.textAccessExpectation === 'adaptation-prohibited'
    && (constraints.sourced === true || !!(constraints.basis || constraints.sourceUrl));
  const requestedAdaptedPolicy = ['include', 'omit', 'prohibited'].includes(source.adaptedTextPolicy)
    ? source.adaptedTextPolicy : '';
  const adaptedTextPolicy = sourcedProhibition
    ? 'prohibited'
    : (requestedAdaptedPolicy === 'prohibited' ? 'omit' : (requestedAdaptedPolicy || 'include'));
  const standardRequiresPrimary = _fullPackStandardsPreserveTextComplexity(
    standardsContext, options.standardsInput || ''
  ) || sourcedProhibition;
  return {
    schemaVersion: 1,
    instructionalGrade: String(source.instructionalGrade || options.gradeLevel || ''),
    primaryTextPolicy: source.primaryTextPolicy === 'educator-directed' ? 'educator-directed' : 'preserve-primary',
    primaryTextAccess: standardRequiresPrimary ? 'required' : (source.primaryTextAccess === 'required' ? 'required' : 'available'),
    adaptedTextPolicy,
    adaptedTextPolicySource: sourcedProhibition
      ? 'standard'
      : (requestedAdaptedPolicy === 'prohibited' ? 'educator'
        : (['educator', 'standard', 'workflow-default'].includes(source.adaptedTextPolicySource)
          ? source.adaptedTextPolicySource
          : (requestedAdaptedPolicy ? 'educator' : 'workflow-default'))),
    textAccessReason: sourcedProhibition
      ? 'sourced-adaptation-prohibition'
      : (standardRequiresPrimary ? 'standard-text-complexity-requirement'
          : (requestedAdaptedPolicy ? 'educator-choice' : 'default-access-companion')),
    standardsContext,
    standardsFingerprint: String(source.standardsFingerprint || _fullPackFingerprint(JSON.stringify(standardsContext || null))),
  };
};
const _fullPackInstructionalText = (type, raw, options = {}) => {
  const isAdapted = type === 'simplified';
  const isPrimaryAnalysis = type === 'analysis';
  const defaults = {
    schemaVersion: 1,
    role: isAdapted ? 'supplemental' : (isPrimaryAnalysis ? 'primary' : 'unspecified'),
    form: isAdapted ? 'adapted' : 'original',
    sourceArtifactId: options.primaryArtifactId || null,
    primaryArtifactId: options.primaryArtifactId || null,
    designationSource: 'workflow-default',
    replacementAuthorization: { authorized: false, source: 'none' },
    complexity: {
      requestedGrade: options.gradeLevel || '', calibrationTarget: '', measuredGrade: null,
      method: '', status: 'unavailable', contentFingerprint: '', measuredAt: '',
      language: options.language || 'English',
    },
  };
  const candidate = Object.assign({}, defaults, raw && typeof raw === 'object' ? raw : {});
  candidate.complexity = Object.assign({}, defaults.complexity,
    raw && raw.complexity && typeof raw.complexity === 'object' ? raw.complexity : {});
  const module = _getInstructionalContextModule();
  return module && typeof module.normalizeInstructionalText === 'function'
    ? module.normalizeInstructionalText(candidate)
    : candidate;
};
const _fullPackRosterSignature = (roster) => JSON.stringify(Object.entries(roster && roster.groups || {})
  .sort(([a], [b]) => String(a).localeCompare(String(b)))
  .map(([id, group]) => {
    const profile = group && group.profile || {};
    return {
      id,
      name: group && group.name || id,
      gradeLevel: profile.gradeLevel || '',
      leveledTextLanguage: profile.leveledTextLanguage || '',
      studentInterests: Array.isArray(profile.studentInterests) ? profile.studentInterests : String(profile.studentInterests || ''),
      dokLevel: profile.dokLevel || '',
      selectedLanguages: Array.isArray(profile.selectedLanguages) ? profile.selectedLanguages : [],
      targetStandards: Array.isArray(profile.targetStandards) ? profile.targetStandards : [],
      useEmojis: profile.useEmojis,
      textFormat: profile.textFormat || '',
    };
  }));

const _compactFullPackBatchConfig = (config) => {
  const source = config && typeof config === 'object' ? config : {};
  const out = {};
  const nestedKeys = ['lessonDNA', 'globalSettings', 'glossaryConfig', 'quizConfig', 'outlineConfig', 'visualConfig', 'adventureConfig', 'brainstormConfig'];
  nestedKeys.forEach(key => {
    if (!source[key] || typeof source[key] !== 'object') return;
    try { out[key] = JSON.parse(JSON.stringify(source[key])); } catch (_) {}
  });
  Object.keys(source).forEach(key => {
    if (nestedKeys.includes(key) || ['resourcePlan', 'recommendedResources', 'toolDirectives'].includes(key)) return;
    const value = source[key];
    if (value == null || ['number', 'boolean'].includes(typeof value) || (typeof value === 'string' && value.length <= 4000)) out[key] = value;
  });
  return out;
};
const FULL_PACK_PLAN_SCHEMA_VERSION = 2;
const FULL_PACK_CAPABILITY_FINGERPRINT = 'full-pack-plan-v2';
const _fullPackFailurePolicy = (failure) => {
  const module = typeof window !== 'undefined' && window.AlloModules
    ? window.AlloModules.UtilsPure : null;
  if (module && typeof module.classifyProviderError === 'function') {
    const policy = module.classifyProviderError(failure);
    const providerError = typeof module.getProviderErrorSafeFields === 'function'
      ? module.getProviderErrorSafeFields(policy)
      : {
          schemaVersion: 1, kind: policy.kind, category: policy.category,
          retryable: policy.retryable === true, quotaScope: policy.quotaScope,
          httpStatus: policy.httpStatus == null ? null : policy.httpStatus,
          retryAfterMs: policy.retryAfterMs == null ? null : policy.retryAfterMs,
        };
    return {
      category: policy.category,
      retryable: policy.retryable === true,
      delayMs: policy.retryable ? policy.delayMs : 0,
      kind: policy.kind,
      quotaScope: policy.quotaScope,
      providerError,
    };
  }

  // Conservative stale-module fallback. Only explicit minute-bucket evidence
  // earns an outer retry; an unscoped quota may be daily and must not multiply
  // provider calls.
  const err = failure && typeof failure === 'object' ? failure : {};
  const message = String(err.message || failure || '');
  const nested = err.classification && typeof err.classification === 'object' ? err.classification : {};
  const retryAfterMs = Number.isFinite(Number(err.retryAfterMs))
    ? Math.max(0, Math.min(120000, Math.ceil(Number(err.retryAfterMs))))
    : (Number.isFinite(Number(err.retryAfterSec))
        ? Math.max(0, Math.min(120000, Math.ceil(Number(err.retryAfterSec) * 1000))) : null);
  const daily = nested.perDay === true || /per[ -]?day|daily (?:quota|limit)|\brpd\b|insufficient quota|billing|credit balance/i.test(message);
  const minute = nested.perMinute === true || /per[ -]?minute|\brpm\b|\btpm\b|rate.?limit/i.test(message)
    || ((err.httpStatus === 429 || err.isQuota === true) && retryAfterMs != null);
  const quota = err.isQuota === true || err.httpStatus === 429 || /API_QUOTA_EXHAUSTED|RESOURCE_EXHAUSTED|quota|\b429\b/i.test(message);
  const authOrConfig = err.isAuth === true || err.isConfig === true || err.isFatal === true
    || /auth(?:entication|orization)?|api[ -]?key|forbidden|permission|unsupported|invalid (?:configuration|config)|not configured|unknown resource type|unusable|malformed|invalid output/i.test(message);
  let kind = 'unknown';
  let category = 'unknown';
  let retryable = true;
  let delayMs = 800;
  let quotaScope = 'none';
  if (quota && daily) {
    kind = 'quota-daily'; category = 'configuration'; retryable = false; delayMs = 0; quotaScope = 'daily';
  } else if (quota && minute) {
    kind = 'rate-limit'; category = 'transient'; retryable = true; delayMs = retryAfterMs == null ? 60000 : retryAfterMs; quotaScope = 'minute';
  } else if (quota) {
    kind = 'quota-unknown'; category = 'configuration'; retryable = false; delayMs = 0; quotaScope = 'unknown';
  } else if (authOrConfig) {
    kind = err.isAuth === true ? 'auth' : 'configuration'; category = 'configuration'; retryable = false; delayMs = 0;
  } else if (/temporar|timeout|timed out|network|fetch|connection|502|503|504|overload/i.test(message)) {
    kind = 'network'; category = 'transient'; retryable = true; delayMs = retryAfterMs == null ? 1500 : retryAfterMs;
  }
  const providerError = {
    schemaVersion: 1, kind, category, retryable, quotaScope,
    httpStatus: Number.isFinite(Number(err.httpStatus)) ? Number(err.httpStatus) : null,
    retryAfterMs,
  };
  return { category, retryable, delayMs, kind, quotaScope, providerError };
};

const _waitForFullPackDelay = (delayMs, signal) => new Promise((resolve, reject) => {
  let timer = null;
  const cleanup = () => { if (signal) signal.removeEventListener('abort', onAbort); };
  const onAbort = () => {
    if (timer) clearTimeout(timer);
    cleanup();
    const error = new Error('Full Pack generation aborted');
    error.name = 'AbortError';
    reject(error);
  };
  if (signal && signal.aborted) return onAbort();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  timer = setTimeout(() => { cleanup(); resolve(); }, Math.max(0, delayMs));
});

const _recordFullPackMetric = (event, payload = {}) => {
  try {
    const metrics = typeof window !== 'undefined' && window.AlloGenerationMetrics;
    if (!metrics || typeof metrics.record !== 'function') return;
    const safe = {};
    if (payload.status && ['landed', 'completed', 'partial', 'failed', 'stopped'].includes(payload.status)) safe.status = payload.status;
    if (payload.category && ['transient', 'configuration', 'unknown'].includes(payload.category)) safe.category = payload.category;
    if (payload.type && /^[a-z0-9-]{1,40}$/i.test(String(payload.type))) safe.type = String(payload.type);
    if (Number.isFinite(Number(payload.durationMs))) safe.durationMs = Math.max(0, Number(payload.durationMs));
    metrics.record(event, safe);
  } catch (_) {}
};

const _estimateFullPackCapacity = (aiCalls, imageCalls, profile = {}, workload = {}) => {
  const totalCalls = Math.max(0, Number(aiCalls) || 0);
  const visualCalls = Math.max(0, Math.min(totalCalls, Number(imageCalls) || 0));
  const textCalls = Math.max(0, totalCalls - visualCalls);
  const provider = String(profile.backend || 'gemini').toLowerCase();
  const isLocal = profile.isLocal === true || ['alloflow-local', 'ollama', 'localai', 'lmstudio'].includes(provider);
  const defaults = isLocal
    ? { textMs: 26000, imageMs: 55000 }
    : (/openai|anthropic|claude/.test(provider)
        ? { textMs: 15000, imageMs: 45000 }
        : (/gemini|google/.test(provider) ? { textMs: 12000, imageMs: 40000 } : { textMs: 20000, imageMs: 45000 }));
  const resources = profile.metricsSnapshot && profile.metricsSnapshot.resources || {};
  const imageMetric = resources.image || {};
  const textAggregate = Object.entries(resources).reduce((out, [type, metric]) => {
    if (type === 'image' || !metric) return out;
    out.total += Math.max(0, Number(metric.durationMsTotal) || 0);
    out.samples += Math.max(0, Number(metric.durationSamples) || 0);
    return out;
  }, { total: 0, samples: 0 });
  const imageSamples = Math.max(0, Number(imageMetric.durationSamples) || 0);
  const observedTextMs = textAggregate.samples >= 3 ? Math.round(textAggregate.total / textAggregate.samples) : null;
  const observedImageMs = imageSamples >= 3 ? Math.round((Number(imageMetric.durationMsTotal) || 0) / imageSamples) : null;
  const textMs = observedTextMs || defaults.textMs;
  const imageMs = observedImageMs || defaults.imageMs;
  // Full Pack currently dispatches sequentially, including roster groups.
  const estimatedMs = (textCalls * textMs) + (visualCalls * imageMs) + (Math.max(0, totalCalls - 1) * 800);
  const warnings = [];
  const warningCodes = [];
  if (isLocal && totalCalls >= 8) { warningCodes.push('local-serial'); warnings.push('Local models run this pack sequentially; keep the app open and consider a smaller pack for faster completion.'); }
  if (totalCalls >= 20) { warningCodes.push('large-pack'); warnings.push('Large pack: provider rate limits are more likely. Consider fewer resources or groups.'); }
  if (visualCalls > 0 && totalCalls >= 12) { warningCodes.push('image-quota'); warnings.push('Image generation may extend the run and consume additional provider quota.'); }
  return {
    aiCalls: totalCalls,
    resourceCalls: Math.max(0, Math.min(totalCalls, Number(workload.resourceCalls) || totalCalls)),
    textCalls,
    imageCalls: visualCalls,
    glossaryImageCalls: Math.max(0, Math.min(visualCalls, Number(workload.glossaryImageCalls) || 0)),
    imageEditCalls: Math.max(0, Math.min(visualCalls, Number(workload.imageEditCalls) || 0)),
    estimatedMinutes: Math.max(1, Math.ceil(estimatedMs / 60000)),
    provider,
    model: String(profile.model || ''),
    imageProvider: String(profile.imageProvider || 'auto'),
    imageModel: String(profile.imageModel || ''),
    isLocal,
    requestConcurrency: Math.max(1, Math.min(3, Number(workload.requestConcurrency) || 1)),
    estimateBasis: (observedTextMs || observedImageMs) ? 'observed-device-history' : 'provider-defaults',
    observedSamples: { text: textAggregate.samples, image: imageSamples },
    warningCodes,
    warnings,
  };
};

const handleGenerateMath = async (inputOverride = null, switchView = true, modeOverride = null, deps) => {
  const { mathInput, history, inputText, useMathSourceContext, studentInterests, gradeLevel, mathMode, mathSubject, mathQuantity, autoAttachManipulatives, leveledTextLanguage, translationMode, resolveTranslationPolicy, currentUiLanguage, isMathGraphEnabled, autoSnapshotManipulatives, setIsProcessing, setGenerationStep, setGenerationStage, setError, setGeneratedContent, setActiveView, setShowMathAnswers, setHistory, setToolSnapshots, addToast, t, callGemini, cleanJson, safeJsonParse, warnLog, verifyMathProblems, flyToElement } = deps;
  // Resolved once from the host-threaded policy. Falls back to the historical
  // rule (gloss into English when the content is not English) if an older host
  // has not threaded the resolver yet, so a stale CDN never silently changes
  // what teachers get.
  const _xlate = (typeof resolveTranslationPolicy === 'function')
    ? resolveTranslationPolicy(translationMode, leveledTextLanguage, currentUiLanguage)
    : { enabled: !!leveledTextLanguage && leveledTextLanguage !== 'English' && leveledTextLanguage !== 'All Selected Languages', target: 'English', mode: 'auto' };
  try { if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] handleGenerateMath fired"); } catch(_) {}
      const problemToSolve = typeof inputOverride === 'string' ? inputOverride : mathInput;
      const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis');
      const availableSource = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
          ? latestAnalysis.data.originalText
          : inputText;
      let contextText = "";
      if (useMathSourceContext) {
          contextText = availableSource || "";
      }
      let mathContextPrompt = "";
      if (contextText) {
          mathContextPrompt += `Source Context: "${contextText.substring(0, 1500)}..."\n`;
      }
      if (studentInterests.length > 0) {
          mathContextPrompt += `Interests: ${studentInterests.join(', ')}\n`;
      }
      mathContextPrompt += `Grade Level: ${gradeLevel}\n`;
      if (!problemToSolve.trim()) {
          console.error('[MATH] Empty input — nothing to generate');
          addToast('Please enter a topic or problem first', 'error');
          return;
      }
      setIsProcessing(true);
      if (typeof setGenerationStage === 'function') setGenerationStage('analyze');
      setGenerationStep(t('status.solving'));
      setError(null);
      if (switchView) {
          setGeneratedContent(null);
          setActiveView('math');
      }
      setShowMathAnswers(false);
      try {
          let prompt = "";
          const effectiveMode = modeOverride || mathMode;
          if (effectiveMode === 'Freeform Builder') {
              prompt = `
                You are an Expert Math Curriculum Designer creating a CUSTOM problem set.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '.' + (_xlate.enabled ? ' After each text field, include a ' + _xlate.target + ' translation in parentheses.' : ' Do NOT add a translation in parentheses or anywhere else.') + ' Keep mathematical expressions and JSON keys in English.' : ''}
                Teacher's Request: "${problemToSolve}"
                ${mathContextPrompt}
                Subject: ${mathSubject}
                Grade Level: ${gradeLevel}
                
                INSTRUCTIONS:
                The teacher has described exactly what they want in natural language. Create the requested mix of problems.
                Number of Problems: Generate EXACTLY ${mathQuantity} problems unless the teacher's request specifies a different count.
                ${autoAttachManipulatives ? `
                MANIPULATIVE INTEGRATION (REQUIRED when toggle is ON):
                You MUST include "manipulativeSupport" and/or "manipulativeResponse" objects for problems where a visual manipulative would aid understanding. Use your judgment on which tool fits best:
                - "base10": for place value, addition/subtraction, regrouping. State: {"hundreds":N, "tens":N, "ones":N}
                - "coordinate": for graphing, plotting, geometry. State: {"points":[{"x":N,"y":N,"label":"A"}]}
                - "numberline": for addition, subtraction, fractions, number sense. State: {"markers":[{"value":N,"label":"..."}], "range":{"min":N,"max":N}}
                - "fractions": for fraction comparison, operations. State: {"numerator":N, "denominator":N}
                - "volume": for 3D geometry, volume calculation. State: {"dims":{"l":N,"w":N,"h":N}}
                - "protractor": for angle measurement, classification. State: {"angle":N}
                - "funcGrapher": for algebra, functions, graphing. State: {"eq":"f(x)","type":"linear|quadratic|trig","a":N,"b":N,"c":N}
                - "physics": for projectile motion, kinematics. State: {"angle":N,"velocity":N,"gravity":9.8}
                - "chemBalance": for balancing chemical equations. State: {"equation":"H2+O2->H2O","coefficients":[2,1,2]}
                - "punnett": for genetics, Punnett squares. State: {"parent1":["A","a"],"parent2":["A","a"]}
                - "circuit": for electrical circuits, Ohm's law. State: {"components":[{"type":"resistor","value":100}],"voltage":9}
                - "dataPlot": for scatter plots, trend lines, statistics. State: {"points":[{"x":N,"y":N}]}
                - "inequality": for graphing inequalities. State: {"expr":"x>3","variable":"x"}
                - "molecule": for molecular structure, chemistry. State: {"formula":"H2O","atoms":[{"element":"O","x":0,"y":0}]}
                - "calculus": for integrals, derivatives, area under curve, Riemann sums. State: {"func":"x^2","a":1,"b":0,"c":0,"xMin":0,"xMax":4,"n":8,"mode":"riemann"}
                - "wave": for wave physics, sound, light, interference patterns. State: {"amplitude":1,"frequency":1,"wavelength":2}
                - "cell": for biology cell diagrams, organelle identification. State: {"type":"animal","selectedOrganelle":"nucleus"}
                "manipulativeSupport" pre-loads the tool as a visual scaffold alongside the problem.
                "manipulativeResponse" replaces the text input — the student must configure the manipulative correctly to answer.
                ` : 'Optionally, you can enable STEAM Lab manipulatives by returning objects in "manipulativeSupport" (to pre-load scaffolding) or "manipulativeResponse" (to grade the student\'s physical configuration instead of typed text). Supported tools are "base10", "coordinate", "numberline", "fractions", "volume", "protractor", "funcGrapher", "physics", "chemBalance", "punnett", "circuit", "dataPlot", "inequality", "molecule", "calculus", "wave", and "cell" — the same set the renderer grades.'}
                You may include ANY type of math problem: computation, word problems, geometry/volume, missing number, algebraic equations, fractions, measurement, data/graphing, etc.
                Follow the teacher's instructions precisely regarding:
                - Number and types of problems
                - Difficulty level
                - Specific topics or concepts
                - Any thematic context they requested
                
                If the teacher's request is vague (e.g. "5 mixed problems for grade 3"), create a diverse set spanning multiple math domains appropriate for that level.
                
                Return ONLY JSON in the following format:
                {
                  "title": "Custom Problem Set: [brief description]",
                  "problems": [
                    {
                      "question": "Problem text WITHOUT any leading directive verb (the renderer prepends it from taskType). For 'simplify' tasks the question is just the expression like '3x + 8 - 15'. For 'solve' tasks the question is the equation like '3x + 8 = 15'. For word_problem tasks the question is the full natural-language prose.",
                      "taskType": "REQUIRED. One of: 'simplify' (combine like terms / reduce; answer is an expression), 'solve' (find the unknown; answer is x = ...), 'evaluate' (compute at given inputs; answer is a number), 'factor' (factor a polynomial), 'graph' (sketch/plot), 'compute' (straight calculation like 5*7), 'word_problem' (natural-language problem; question already reads as a sentence), 'prove' (geometric/mathematical proof), 'convert' (unit conversion). Pick the action the student is being asked to perform.",
                      "expression": "Math expression (e.g. 3 * 4 + 5)",
                      "answer": "The answer",
                      "steps": [{ "explanation": "Clear step-by-step explanation", "latex": "Math expression for this step" }],
                      "type": "computation|word_problem|geometry|missing_number|fraction|algebra|measurement",
                      "realWorld": "1-2 sentence explanation of WHY this math concept matters in real life. Do NOT restate the problem as a word problem. Instead, name a specific career, hobby, or everyday situation where this skill is used (e.g. 'Nurses use unit conversion to calculate medication dosages').",
                      "manipulativeSupport": null,
                      "manipulativeResponse": null
                    }
                  ],
                  "graphData": null
                }
              `;
          } else if (effectiveMode === 'Problem Set Generator') {
              prompt = `
                You are an expert Math Curriculum Designer.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (questions, explanations, steps, real-world applications) in ' + leveledTextLanguage + '.' + (_xlate.enabled ? ' After each text field, include a ' + _xlate.target + ' translation in parentheses.' : ' Do NOT add a translation in parentheses or anywhere else.') + ' Keep mathematical expressions and JSON keys in English.' : ''}
                Topic/Skill: "${problemToSolve}"
                ${mathContextPrompt}
                Instruction: Create EXACTLY the number and types of problems described in the Topic/Skill above. Match the count, types, and difficulty the user specified. If no specific count is given, create 5 problems.
                Context Usage: Frame the word problems using characters, settings, or themes from the Source Context. Use names/concepts from the Student Interests.
                Output Format:
                Return a JSON object with a "problems" array.
                Each item in the array must have:
                - "question": The problem text WITHOUT any leading directive verb (no "Simplify:" / "Solve:" prefix — the renderer prepends it from taskType). For simplify tasks the question is just the expression like "3x + 8 - 15"; for solve tasks it's the equation like "3x + 8 = 15"; for word_problem tasks the question is the full natural-language prose.
                - "taskType": REQUIRED. One of: "simplify" (combine like terms / reduce), "solve" (find the unknown), "evaluate" (compute at given inputs), "factor" (factor a polynomial), "graph" (sketch/plot), "compute" (straight calculation like 5*7), "word_problem" (natural-language; question reads as a sentence), "prove", "convert". Pick the action the student is asked to perform.
                - "expression": The math expression that solves this (standard notation: +, -, *, /, ^, parentheses). Example: "15 - (3 * 4)"
                - "answer": The numeric solution (a number).
                - "steps": An array of 2-5 step objects { "explanation": "Clear explanation of what to do in this step", "latex": "The math expression for this step", "expression": "The computed sub-expression" }. CRITICAL: Every problem MUST have detailed steps showing the complete solution process. Students see these after attempting the problem. Make explanations clear and educational.
                Return ONLY JSON in the following format:
                {
                  "title": "Problem Set: ${problemToSolve.substring(0, 30)}...",
                  "problems": [
                    {
                      "question": "Problem 1 text...",
                      "taskType": "simplify",
                      "answer": "Answer 1",
                      "steps": [{ "explanation": "First...", "latex": "x=..." }],
                      "realWorld": "1-2 sentence real-life connection — name a specific career or everyday situation where this skill is used. Do NOT restate the problem as a word problem.",
                      "manipulativeSupport": null,
                      "manipulativeResponse": null
                    }
                  ],
                  "graphData": null
                }
              `;
          } else {
              prompt = `
                You are an Expert Math & Science Tutor.
                ${leveledTextLanguage && leveledTextLanguage !== 'English' ? 'IMPORTANT: Generate ALL text content (explanations, steps, real-world applications) in ' + leveledTextLanguage + '.' + (_xlate.enabled ? ' After each text field, include a ' + _xlate.target + ' translation in parentheses.' : ' Do NOT add a translation in parentheses or anywhere else.') + ' Keep mathematical expressions and JSON keys in English.' : ''}
                Subject: ${mathSubject}
                Mode: ${mathMode}
                Problem: "${problemToSolve}",
                Context:
                ${mathContextPrompt}
                Instructions:
                Solve the problem or explain the concept based on the selected mode.
                - If "Step-by-Step": Provide a clear, numbered sequence of steps to reach the solution. Show work for every calculation.
                - If "Conceptual": Explain the "Why" and "How" behind the concept. Use analogies.
                - If "Real-World Application": Explain how this specific concept is used in real life (engineering, finance, nature, etc.).
                ${useMathSourceContext ? 'Relate the explanation to the Source Context concepts.' : ''}
                ${isMathGraphEnabled ? `
                    VISUALS REQUIRED:
                    - PREFER a parametric "manipulativeSupport" {tool,state} over a "graphData" SVG string WHENEVER the visual fits a supported interactive manipulative — these render INLINE as accessible, editable diagrams (vs a static, non-editable SVG). Supported inline: "numberline" (number lines / integers / fractions on a line), "coordinate" (plotting points, lines, geometry on a grid), "fractions" (fraction bars / comparison), "base10" (place value), "protractor" (angles). Use the state shapes from the manipulative instructions.
                    - Only fall back to a "graphData" SVG for visuals that do NOT fit one of those: Math/Physics curves/plots, Biology/Earth Science diagrams (Punnett Square, Water Cycle, Cell Structure), or Computer Science Flowcharts / Logic Gates.
                    - If a "graphData" SVG is used: keep it clean, minimal, responsive (viewBox), standard colors — AND ALWAYS set "graphAlt" to a one-sentence plain-text description of the diagram for screen-reader users.
                ` : ''}
                Return ONLY JSON in the following format:
                {
                  "problem": "Clean Latex string of the input WITHOUT any leading directive verb (no 'Simplify:' / 'Solve:' prefix — the renderer prepends from taskType).",
                  "taskType": "REQUIRED. One of: 'simplify', 'solve', 'evaluate', 'factor', 'graph', 'compute', 'word_problem', 'prove', 'convert'. Pick the action the student is being asked to perform on this single problem.",
                  "answer": "Final Answer string",
                  "steps": [{ "explanation": "Step explanation", "latex": "Step math in Latex" }],
                  "graphData": "SVG string or null (prefer manipulativeSupport for the supported inline types)",
                  "graphAlt": "one-sentence plain-text description of graphData for screen readers (null if no graphData)",
                  "realWorld": "1-2 sentence explanation of a specific career, hobby, or everyday situation where this concept is applied — NOT a word problem restatement",
                  "manipulativeSupport": null,
                  "manipulativeResponse": null
                }
              `;
          }
          console.error('[MATH] Sending prompt to Gemini, mode:', effectiveMode, 'subject:', mathSubject);
          const result = await callGemini(prompt, true);
          console.error('[MATH] Raw Gemini result length:', result?.length, 'first 200 chars:', result?.substring(0, 200));
          let rawContent;
          let cleaned;
          try {
              cleaned = cleanJson(result);
              rawContent = safeJsonParse(result);
              if (!rawContent) {
                try { rawContent = JSON.parse(cleaned); } catch (_) {}
              }
              if (!rawContent) {
                const jsonMatch = result.match(/[\[{][\s\S]*[\]}]/);
                if (jsonMatch) {
                  const extracted = jsonMatch[0];
                  if (typeof window !== 'undefined' && window.jsonrepair) {
                    try { rawContent = JSON.parse(window.jsonrepair(extracted)); } catch (_) {}
                  }
                  if (!rawContent) {
                    try { rawContent = JSON.parse(extracted); } catch (_) {}
                  }
                }
              }
              if (!rawContent) throw new Error("Parsed JSON is null after all strategies");
          } catch (parseErr) {
              console.error('[MATH] JSON Parse Error:', parseErr, 'Cleaned input:', cleaned?.substring(0, 300));
              warnLog("Math Parse Error:", parseErr);
              throw new Error("Failed to parse Math JSON. The AI response was not valid.");
          }
          let normalizedContent = {
              title: rawContent.title || 'Math & STEM Solver',
              problems: [],
              graphData: rawContent.graphData || null
          };
          const normalizeSteps = (steps) => {
              if (!Array.isArray(steps)) return [];
              return steps.map(s => {
                  if (typeof s === 'string') return { explanation: s, latex: '' };
                  return s;
              });
          };
          // Normalize taskType: default missing/invalid to 'simplify' (most common).
          // The renderer's directive map has fallback handling, but defaulting here
          // makes downstream logic (analytics, validators, manipulative auto-attach)
          // simpler since they can assume the field exists.
          const VALID_TASK_TYPES = new Set(['simplify','solve','evaluate','factor','graph','compute','word_problem','prove','convert']);
          const normalizeTaskType = (raw) => {
              const t = (raw || '').toString().trim().toLowerCase();
              return VALID_TASK_TYPES.has(t) ? t : 'simplify';
          };
          if (Array.isArray(rawContent.problems)) {
              normalizedContent.problems = rawContent.problems.map(p => ({
                  ...p,
                  taskType: normalizeTaskType(p.taskType),
                  steps: normalizeSteps(p.steps)
              }));
          } else {
              normalizedContent.problems = [{
                  question: rawContent.problem || problemToSolve,
                  taskType: normalizeTaskType(rawContent.taskType),
                  answer: rawContent.answer,
                  steps: normalizeSteps(rawContent.steps || (Array.isArray(rawContent.steps) ? rawContent.steps : [])),
                  realWorld: rawContent.realWorld
              }];
          }
          normalizedContent.problems = verifyMathProblems(normalizedContent.problems);
          const verifiedCount = normalizedContent.problems.filter(p => p._verification?.verified).length;
          const mismatchCount = normalizedContent.problems.filter(p => p._verification?.mismatch).length;
          if (mismatchCount > 0) {
            warnLog(`Math verification: ${mismatchCount} answer(s) auto-corrected via expression evaluation`);
          }
          if (verifiedCount > 0) {
            console.error('[MATH] ' +`Math verification: ${verifiedCount}/${normalizedContent.problems.length} answers computationally verified ✓`);
          }
          const newItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: 'math',
              data: normalizedContent,
              meta: `${mathSubject} - ${mathMode}`,
              title: normalizedContent.title,
              timestamp: new Date(),
              config: {}
          };
          setGeneratedContent({ type: 'math', data: normalizedContent, id: newItem.id });
          setHistory(prev => [...prev, newItem]);
          if (autoSnapshotManipulatives && normalizedContent.problems) {
            const newSnaps = [];
            normalizedContent.problems.forEach((p, idx) => {
              const manip = p.manipulativeSupport || p.manipulativeResponse;
              if (manip && manip.tool && manip.state) {
                newSnaps.push({
                  id: 'auto-' + Date.now() + '-' + idx,
                  tool: manip.tool,
                  label: 'P' + (idx + 1) + ': ' + (manip.tool === 'base10' ? (manip.state.hundreds || 0) + 'H ' + (manip.state.tens || 0) + 'T ' + (manip.state.ones || 0) + 'O' : manip.tool === 'coordinate' ? (manip.state.points?.length || 0) + ' points' : manip.tool),
                  mode: 'auto',
                  data: manip.state,
                  timestamp: Date.now()
                });
              }
            });
            if (newSnaps.length > 0) {
              setToolSnapshots(prev => [...prev, ...newSnaps]);
              addToast('📸 Auto-captured ' + newSnaps.length + ' manipulative snapshot(s)', 'info');
            }
          }
          console.error('[MATH] Success! Problems generated:', normalizedContent.problems?.length);
          addToast(t('math.success_toast'), "success");
          flyToElement('tour-tool-math');
      } catch (e) {
          console.error('[MATH] Generation failed:', e.message, e.stack);
          warnLog("Unhandled error:", e);
          setError(t('math.error_generation'));
          addToast(t('math.error_generation'), "error");
      } finally {
          setIsProcessing(false);
      }
};

const handleGenerateFullPack = async (chatContextOverride = null, deps) => {
  const { isProcessing, fullPackTargetGroup, fullPackGroupId, rosterKey, gradeLevel, leveledTextLanguage, translationMode, resolveTranslationPolicy, currentUiLanguage, studentInterests, dokLevel, differentiationRange, differentiationTypes, differentiationCustomGrades, generationSignal, leveledTextCustomInstructions, selectedLanguages, targetStandards, useEmojis, textFormat, imageGenerationStyle, imageAspectRatio, history, inputText, sourceTopic, standardsInput, standardsContext, instructionalContext, resourceCount, isAutoConfigEnabled, quizCustomInstructions, adventureCustomInstructions, frameCustomInstructions, brainstormCustomInstructions, faqCustomInstructions, outlineCustomInstructions, visualCustomInstructions, timelineTopic, lessonCustomAdditions, conceptInput, glossaryCustomInstructions, personaCustomInstructions, conceptSortCustomInstructions, dbqCustomInstructions, noteTakingCustomInstructions, anchorChartCustomInstructions, setIsProcessing, setGenerationStep, setGenerationStage, setFullPackTargetGroup, setGradeLevel, setLeveledTextLanguage, setStudentInterests, setDokLevel, setLeveledTextCustomInstructions, setSelectedLanguages, setTargetStandards, setUseEmojis, setTextFormat, setPersistedLessonDNA, setFullPackRun, setError, addToast, t, warnLog, handleApplyRosterGroup, handleGenerate, autoConfigureSettings, applyDetailedAutoConfig, getGroupDifferentiationContext, getAssetManifest, getDifferentiationGrades, aiProviderProfile } = deps;
  // Resolved once from the host-threaded policy. Falls back to the historical
  // rule (gloss into English when the content is not English) if an older host
  // has not threaded the resolver yet, so a stale CDN never silently changes
  // what teachers get.
  const _xlate = (typeof resolveTranslationPolicy === 'function')
    ? resolveTranslationPolicy(translationMode, leveledTextLanguage, currentUiLanguage)
    : { enabled: !!leveledTextLanguage && leveledTextLanguage !== 'English' && leveledTextLanguage !== 'All Selected Languages', target: 'English', mode: 'auto' };
  try { if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] handleGenerateFullPack fired"); } catch(_) {}
    const _fullPackStartedAt = Date.now();
    const _fullPackRunId = 'full-pack-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const redactFullPackDiagnosticText = (value, maxLength = 8000) => {
        const raw = String(value || '');
        const clipped = raw.length > maxLength ? raw.slice(0, maxLength) + ' [truncated]' : raw;
        return clipped
            .replace(/\b(Bearer)\s+[A-Za-z0-9._~+\/=-]{6,}/gi, '$1 [REDACTED]')
            .replace(/\b(?:AIza[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{12,}|xox[baprs]-[A-Za-z0-9-]{12,})\b/g, '[REDACTED]')
            .replace(/((?:api[ _-]?key|access[ _-]?token|authorization|credential|secret|password)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
            .replace(/([?&](?:key|api_key|token|access_token)=)[^&#\s]+/gi, '$1[REDACTED]');
    };
    const recordFullPackFailure = (details) => {
        const d = details || {};
        const reason = redactFullPackDiagnosticText(d.reason || 'unknown generation failure', 4000);
        const metricPolicy = _fullPackFailurePolicy(d.error || reason);
        _recordFullPackMetric('failure', { category: d.category || metricPolicy.category });
        const message = '[FullPack] resource generation failed'
            + ' resource=' + String(d.type || 'unknown')
            + ' step=' + String(Number.isFinite(d.index) ? d.index + 1 : '?')
            + ' reason=' + reason
            + ' sourceTextChars=' + String(Number.isFinite(d.sourceTextChars) ? d.sourceTextChars : 0)
            + ' runId=' + _fullPackRunId
            + ' elapsedMs=' + String(Math.max(0, Date.now() - _fullPackStartedAt));
        try { if (typeof warnLog === 'function') warnLog(message); else if (typeof console !== 'undefined' && console.warn) console.warn(message); } catch (_) {}
        const stack = d.error && d.error.stack ? redactFullPackDiagnosticText(d.error.stack, 12000) : '';
        try {
            const reporter = typeof window !== 'undefined'
                && window.AlloModules
                && window.AlloModules.ErrorReporter;
            if (reporter && typeof reporter.record === 'function') {
                reporter.record('error', message, stack, 'full-pack-resource-generation', 0, 0);
            } else if (typeof window !== 'undefined') {
                const pending = window.__alloPendingErrorReports = window.__alloPendingErrorReports || [];
                pending.push({ level: 'error', message: message, stack: stack, source: 'full-pack-resource-generation' });
                while (pending.length > 20) pending.shift();
            }
        } catch (_) {}
        return message;
    };
    const _ownsFullPackAbort = !generationSignal;
    if (isProcessing || (_ownsFullPackAbort && _fullPackRunInFlight)) {
        try { if (typeof addToast === 'function') addToast('A Full Pack is already running.', 'info'); } catch (_) {}
        return false;
    }
    if (_ownsFullPackAbort) _fullPackRunInFlight = true;
    const _fullPackRequest = chatContextOverride && typeof chatContextOverride === 'object' ? chatContextOverride : {};
    const _retryRun = _fullPackRequest.__fullPackRetryRun || null;
    const _approvedRun = _fullPackRequest.__fullPackApprovedRun || null;
    const _groupRetryRun = _fullPackRequest.__fullPackGroupRetryRun || null;
    const _preflightOnly = _fullPackRequest.__fullPackPreflightOnly === true;
    if (typeof setGenerationStage === 'function') setGenerationStage(_preflightOnly ? 'analyze' : 'build');
    const _recordTopLevelMetrics = _ownsFullPackAbort && !_preflightOnly;
    if (_recordTopLevelMetrics) _recordFullPackMetric('run-start');
    const _planSourceRun = _approvedRun || _retryRun;
    const _standardsContextModule = typeof window !== 'undefined' && window.AlloModules
        ? window.AlloModules.StandardsContext
        : null;
    const _ambientStandardsContext = standardsContext && Array.isArray(standardsContext.standards)
        ? standardsContext
        : (_standardsContextModule && typeof _standardsContextModule.resolve === 'function'
            ? _standardsContextModule.resolve(standardsInput || targetStandards)
            : null);
    const _plannedStandardsContext = _planSourceRun && _planSourceRun.planPayload
        && (_planSourceRun.planPayload.standardsContext
            || (_planSourceRun.planPayload.instructionalContext && _planSourceRun.planPayload.instructionalContext.standardsContext));
    const _runStandardsContext = _plannedStandardsContext || _ambientStandardsContext || null;
    const _plannedInstructionalContext = _planSourceRun
        && ((_planSourceRun.planPayload && _planSourceRun.planPayload.instructionalContext)
            || (_planSourceRun.settingsSnapshot && _planSourceRun.settingsSnapshot.instructionalContext));
    const _requestedInstructionalContext = _plannedInstructionalContext
        || _fullPackRequest.instructionalContext || instructionalContext;
    const _normalizedInstructionalContext = _normalizeFullPackInstructionalContext(
        _requestedInstructionalContext,
        { gradeLevel, standardsContext: _runStandardsContext, standardsInput }
    );
    const _activeInstructionalContext = _normalizedInstructionalContext;
    // Primary-text preservation and adapted-companion inclusion are separate
    // decisions. The common path includes both regardless of whether an
    // Analysis artifact already exists; the Generation Matrix will reuse that
    // analysis at zero calls. Only an explicit omit or sourced prohibition
    // suppresses Adapted Text.
    const _defaultToAnalyzedAndAdaptedText = !_planSourceRun
        && _activeInstructionalContext.adaptedTextPolicy === 'include';
    const _fullPackRunAbortCtl = _ownsFullPackAbort && typeof AbortController !== 'undefined' ? new AbortController() : null;
    const _fullPackSignal = generationSignal || (_fullPackRunAbortCtl && _fullPackRunAbortCtl.signal) || null;
    if (_fullPackRunAbortCtl) _fullPackAbortCtl = _fullPackRunAbortCtl;
    const _fullPackGenerationConfig = _captureFullPackGenerationConfig(deps);
    const _fullPackSettingsSnapshot = Object.freeze({
        gradeLevel,
        leveledTextLanguage,
        translationMode,
        currentUiLanguage,
        studentInterests: Array.isArray(studentInterests) ? studentInterests.slice() : studentInterests,
        dokLevel,
        selectedLanguages: Array.isArray(selectedLanguages) ? selectedLanguages.slice() : selectedLanguages,
        targetStandards: Array.isArray(targetStandards) ? targetStandards.slice() : targetStandards,
        useEmojis,
        textFormat,
        imageGenerationStyle,
        imageAspectRatio,
        aiProviderProfile: _cloneFullPackValue(_fullPackGenerationConfig.provider),
        fullPackGenerationConfig: _cloneFullPackValue(_fullPackGenerationConfig),
        differentiationRange,
        differentiationTypes: Array.isArray(differentiationTypes) ? differentiationTypes.slice() : differentiationTypes,
        differentiationCustomGrades: Array.isArray(differentiationCustomGrades) ? differentiationCustomGrades.slice() : differentiationCustomGrades,
        resourceCount,
        isAutoConfigEnabled,
        standardsContext: _cloneFullPackValue(_runStandardsContext),
        instructionalContext: _cloneFullPackValue(_activeInstructionalContext),
        fullPackTargetGroup,
        fullPackGroupId: fullPackGroupId || null,
        rosterSignature: _fullPackRosterSignature(rosterKey),
    });
    const updateFullPackRun = (mutator) => {
        if (typeof setFullPackRun !== 'function') return;
        setFullPackRun(prev => {
            // Async resource completions belong only to the run that started
            // them. If that record was dismissed or replaced, a late result
            // must not recreate it or write into the newer run.
            if (!prev || prev.runId !== _fullPackRunId) return prev;
            return mutator(prev);
        });
    };
    if (typeof setFullPackRun === 'function') {
        const lineageResources = _retryRun && _retryRun.resources
            ? _cloneFullPackValue(_retryRun.resources) : {};
        const lineageGroups = _groupRetryRun && (_groupRetryRun.lineageGroups || _groupRetryRun.groups)
            ? _cloneFullPackValue(_groupRetryRun.lineageGroups || _groupRetryRun.groups) : {};
        setFullPackRun({ runId: _fullPackRunId, retryOf: (_retryRun || _groupRetryRun) && (_retryRun || _groupRetryRun).runId || null, approvedFrom: _approvedRun && _approvedRun.runId || null, status: _preflightOnly ? 'planning' : 'running', startedAt: new Date().toISOString(), elapsedMs: 0, settingsSnapshot: _fullPackSettingsSnapshot, resources: lineageResources, groups: lineageGroups });
    }
    const targetGroup = (_approvedRun && _approvedRun.targetMode === 'all-groups') || _groupRetryRun ? 'all' : fullPackTargetGroup;
    const reviewedGroupMap = _approvedRun && _approvedRun.targetMode === 'all-groups' && _approvedRun.groups
        ? Object.fromEntries(Object.entries(_approvedRun.groups).map(([gid, run]) => [gid, {
            name: run && run.groupName || gid,
            profile: run && run.settingsSnapshot || {},
        }]))
        : null;
    const activeGroupMap = reviewedGroupMap || (rosterKey && rosterKey.groups) || {};
    if (targetGroup === 'all' && Object.keys(activeGroupMap).length > 0) {
        const groupEntries = Object.entries(activeGroupMap);
        // Every child sees artifacts landed by earlier children. This is
        // especially important for source-scoped singleton resources such as
        // analysis: the first group may create the canonical artifact, and all
        // later groups can re-resolve their reviewed row to reuse it.
        const sharedGroupHistory = Array.isArray(history) ? history.slice() : [];
        const sharedGroupHandleGenerate = async (...args) => {
            const generatedItem = await handleGenerate(...args);
            const cellConfig = args[4] && typeof args[4] === 'object' ? args[4] : {};
            const identityEnvelope = cellConfig.generationIdentity && typeof cellConfig.generationIdentity === 'object'
                ? cellConfig.generationIdentity : {};
            const generatedIdentity = generatedItem && (generatedItem.generationIdentity
                || generatedItem.config?.generationIdentity)
                || identityEnvelope.key || cellConfig.generationIdentity || null;
            // The dispatcher normally stamps this provenance. Mirror the
            // reviewed cell metadata here as well so a custom/legacy
            // dispatcher cannot make a resource invisible to the next roster
            // group and accidentally regenerate a source-global singleton.
            const item = generatedItem && typeof generatedItem === 'object'
                ? Object.assign({}, generatedItem, {
                    generationIdentity: generatedIdentity,
                    sourceFingerprint: generatedItem.sourceFingerprint || cellConfig.sourceFingerprint
                        || identityEnvelope.sourceFingerprint || '',
                    sourceArtifactId: generatedItem.sourceArtifactId || cellConfig.sourceArtifactId
                        || identityEnvelope.sourceArtifactId || null,
                    contextFingerprint: generatedItem.contextFingerprint || cellConfig.contextFingerprint
                        || identityEnvelope.contextFingerprint || '',
                    contextInputsFingerprint: generatedItem.contextInputsFingerprint
                        || cellConfig.contextInputsFingerprint
                        || identityEnvelope.contextInputsFingerprint || '',
                    generationConfig: _cloneFullPackValue(generatedItem.generationConfig
                        || cellConfig.generationConfig || identityEnvelope.generationConfig || {}),
                    generationConfigFingerprint: generatedItem.generationConfigFingerprint
                        || cellConfig.generationConfigFingerprint
                        || identityEnvelope.generationConfigFingerprint || '',
                    variantKey: generatedItem.variantKey || cellConfig.variantKey
                        || identityEnvelope.variantKey || '',
                    explicitVariantKey: generatedItem.explicitVariantKey || cellConfig.explicitVariantKey
                        || identityEnvelope.explicitVariantKey || null,
                    variantKeyDerived: generatedItem.variantKeyDerived === true
                        || cellConfig.variantKeyDerived === true || identityEnvelope.variantKeyDerived === true,
                    config: Object.assign({}, generatedItem.config || {}, {
                        generationIdentity: generatedIdentity,
                        sourceFingerprint: generatedItem.config?.sourceFingerprint || cellConfig.sourceFingerprint
                            || identityEnvelope.sourceFingerprint || '',
                        sourceArtifactId: generatedItem.config?.sourceArtifactId || cellConfig.sourceArtifactId
                            || identityEnvelope.sourceArtifactId || null,
                        contextFingerprint: generatedItem.config?.contextFingerprint || cellConfig.contextFingerprint
                            || identityEnvelope.contextFingerprint || '',
                        contextInputsFingerprint: generatedItem.config?.contextInputsFingerprint
                            || cellConfig.contextInputsFingerprint
                            || identityEnvelope.contextInputsFingerprint || '',
                        generationConfig: _cloneFullPackValue(generatedItem.config?.generationConfig
                            || cellConfig.generationConfig || identityEnvelope.generationConfig || {}),
                        generationConfigFingerprint: generatedItem.config?.generationConfigFingerprint
                            || cellConfig.generationConfigFingerprint
                            || identityEnvelope.generationConfigFingerprint || '',
                        variantKey: generatedItem.config?.variantKey || cellConfig.variantKey
                            || identityEnvelope.variantKey || '',
                        explicitVariantKey: generatedItem.config?.explicitVariantKey || cellConfig.explicitVariantKey
                            || identityEnvelope.explicitVariantKey || null,
                        variantKeyDerived: generatedItem.config?.variantKeyDerived === true
                            || cellConfig.variantKeyDerived === true || identityEnvelope.variantKeyDerived === true,
                    }),
                }) : generatedItem;
            if (item && item.id != null) {
                const existingIndex = sharedGroupHistory.findIndex(existing => existing
                    && String(existing.id) === String(item.id));
                if (existingIndex >= 0) sharedGroupHistory[existingIndex] = item;
                else sharedGroupHistory.push(item);
            }
            return item;
        };
        let _hadGroupFailures = false;
        updateFullPackRun(prev => Object.assign({}, prev, {
            targetMode: 'all-groups',
            groups: Object.assign({}, prev.groups || {}, Object.fromEntries(groupEntries.map(([gid, group]) => {
                const reviewed = (_approvedRun && _approvedRun.groups && _approvedRun.groups[gid])
                    || (_groupRetryRun && ((_groupRetryRun.lineageGroups && _groupRetryRun.lineageGroups[gid])
                        || (_groupRetryRun.groups && _groupRetryRun.groups[gid]))) || {};
                const selected = reviewed.preflight && Array.isArray(reviewed.preflight.selected)
                    ? reviewed.preflight.selected : [];
                return [gid, Object.assign({}, reviewed, {
                    groupId: gid,
                    groupName: reviewed.groupName || group && group.name || gid,
                    status: 'queued',
                    resources: _queueFullPackPlanRows(selected, reviewed.resources || {}),
                })];
            })))
        }));
        const savedSettings = {
            grade: gradeLevel, lang: leveledTextLanguage, interests: studentInterests,
            dok: dokLevel, custom: leveledTextCustomInstructions,
            selectedLangs: selectedLanguages, standards: targetStandards,
            emojis: useEmojis, fmt: textFormat
        };
        setIsProcessing(true);
        try {
            for (let gi = 0; gi < groupEntries.length && !(_fullPackSignal && _fullPackSignal.aborted); gi++) {
                const [gid, group] = groupEntries[gi];
                const reviewedGroupRun = (_approvedRun && _approvedRun.groups && _approvedRun.groups[gid])
                    || (_groupRetryRun && _groupRetryRun.groups && _groupRetryRun.groups[gid])
                    || null;
                const profile = reviewedGroupRun && reviewedGroupRun.settingsSnapshot
                    ? reviewedGroupRun.settingsSnapshot
                    : ((group && group.profile) || {});
                if (typeof setGenerationStage === 'function') setGenerationStage(_preflightOnly ? 'analyze' : 'build');
                setGenerationStep(`${_preflightOnly ? 'Planning' : 'Generating'} full pack for ${group.name} (${gi+1}/${groupEntries.length})...`);
                handleApplyRosterGroup(gid);
                await new Promise(r => setTimeout(r, 150));
                setFullPackTargetGroup(_preflightOnly ? 'all' : 'none');
                // React setters above are asynchronous. Pass the profile values
                // directly to the child run so the next pack cannot race with
                // the previous render and silently use the wrong group settings.
                let childRun = null;
                const setChildFullPackRun = (next) => {
                    childRun = typeof next === 'function' ? next(childRun || {}) : next;
                    updateFullPackRun(prev => Object.assign({}, prev, {
                        groups: Object.assign({}, prev.groups, {
                            [gid]: Object.assign({ groupId: gid, groupName: group.name || gid }, childRun || {})
                        })
                    }));
                };
                const groupStandardsContext = Array.isArray(profile.targetStandards)
                    && profile.targetStandards.length
                    && _standardsContextModule
                    && typeof _standardsContextModule.resolve === 'function'
                    ? _standardsContextModule.resolve(profile.targetStandards)
                    : _runStandardsContext;
                const groupInstructionalContext = _normalizeFullPackInstructionalContext(
                    Object.assign({}, _activeInstructionalContext, {
                        instructionalGrade: profile.gradeLevel || gradeLevel,
                        standardsContext: groupStandardsContext,
                        standardsFingerprint: groupStandardsContext === _runStandardsContext
                            ? _activeInstructionalContext.standardsFingerprint : '',
                    }),
                    {
                        gradeLevel: profile.gradeLevel || gradeLevel,
                        standardsContext: groupStandardsContext,
                        standardsInput: Array.isArray(profile.targetStandards)
                            ? profile.targetStandards.join('; ') : standardsInput,
                    }
                );
                const groupFrozenGenerationDeps = _fullPackGenerationConfigDeps(
                    profile.fullPackGenerationConfig || _fullPackGenerationConfig
                );
                const groupDeps = Object.assign({}, deps, groupFrozenGenerationDeps, {
                    isProcessing: false,
                    setIsProcessing: () => {},
                    fullPackTargetGroup: 'none',
                    fullPackGroupId: gid,
                    history: sharedGroupHistory,
                    handleGenerate: sharedGroupHandleGenerate,
                    gradeLevel: profile.gradeLevel || gradeLevel,
                    leveledTextLanguage: profile.leveledTextLanguage || leveledTextLanguage,
                    translationMode: profile.translationMode === undefined ? translationMode : profile.translationMode,
                    currentUiLanguage: profile.currentUiLanguage || currentUiLanguage,
                    studentInterests: profile.studentInterests
                        ? (Array.isArray(profile.studentInterests) ? profile.studentInterests : String(profile.studentInterests).split(',').map(s => s.trim()).filter(Boolean))
                        : studentInterests,
                    dokLevel: profile.dokLevel || dokLevel,
                    leveledTextCustomInstructions: profile.leveledTextCustomInstructions || leveledTextCustomInstructions,
                    selectedLanguages: Array.isArray(profile.selectedLanguages) ? profile.selectedLanguages : selectedLanguages,
                    differentiationRange: profile.differentiationRange || differentiationRange,
                    differentiationTypes: Array.isArray(profile.differentiationTypes) ? profile.differentiationTypes : differentiationTypes,
                    differentiationCustomGrades: Array.isArray(profile.differentiationCustomGrades) ? profile.differentiationCustomGrades : differentiationCustomGrades,
                    targetStandards: Array.isArray(profile.targetStandards) ? profile.targetStandards : targetStandards,
                    standardsContext: groupStandardsContext,
                    instructionalContext: groupInstructionalContext,
                    // The normalized child context carries an explicit policy,
                    // so preserve the parent's automatic pair decision out of
                    // band instead of mistaking it for an educator override.
                    fullPackDefaultTextPair: _defaultToAnalyzedAndAdaptedText,
                    useEmojis: profile.useEmojis === undefined ? useEmojis : profile.useEmojis,
                    textFormat: profile.textFormat || textFormat,
                    generationSignal: _fullPackSignal,
                    setFullPackRun: setChildFullPackRun,
                });
                const groupRetryCandidate = _groupRetryRun && _groupRetryRun.groups
                    && _groupRetryRun.groups[gid];
                const groupHasRetryableResources = groupRetryCandidate
                    && Object.values(groupRetryCandidate.resources || {}).some(_fullPackResourceNeedsRetry);
                const childRequest = groupRetryCandidate && groupHasRetryableResources
                    ? { __fullPackRetryRun: groupRetryCandidate }
                    : (groupRetryCandidate && groupRetryCandidate.preflight
                        && Array.isArray(groupRetryCandidate.preflight.selected)
                        && groupRetryCandidate.preflight.selected.length
                        ? { __fullPackApprovedRun: groupRetryCandidate }
                    : (_approvedRun && _approvedRun.groups && _approvedRun.groups[gid]
                        ? { __fullPackApprovedRun: _approvedRun.groups[gid] }
                        : (_preflightOnly ? { __fullPackPreflightOnly: true } : chatContextOverride)));
                await handleGenerateFullPack(childRequest, groupDeps);
                if (_preflightOnly && childRun && childRun.preflight && Array.isArray(childRun.preflight.selected)) {
                    const matrixModule = _getGenerationMatrixModule();
                    childRun.preflight.selected.forEach(row => {
                        const policy = matrixModule && typeof matrixModule.getResourcePolicy === 'function'
                            ? matrixModule.getResourcePolicy(row && row.type) : null;
                        if (!policy || policy.cardinality !== 'source-global-singleton') return;
                        (Array.isArray(row.generationVariants) ? row.generationVariants : []).forEach((variant, index) => {
                            if (!variant || !variant.generationIdentity) return;
                            if (_fullPackHistoryArtifact(sharedGroupHistory, variant)) return;
                            sharedGroupHistory.push({
                                id: 'planned-full-pack-' + String(variant.generationIdentity) + '-' + index,
                                type: row.type,
                                generationIdentity: variant.generationIdentity,
                                sourceFingerprint: variant.sourceFingerprint || childRun.preflight.sourceFingerprint || '',
                                sourceArtifactId: variant.sourceArtifactId || null,
                                grade: variant.grade || null,
                                language: variant.language || 'English',
                                variantKey: variant.variantKey || row.variantKey || '',
                                explicitVariantKey: row.explicitVariantKey || null,
                                variantKeyDerived: row.variantKeyDerived === true,
                                _fullPackPlannedArtifact: true,
                            });
                        });
                    });
                }
                if (childRun && ['failed', 'partial', 'interrupted'].includes(childRun.status)) _hadGroupFailures = true;
            }
            const _allStopped = !!(_fullPackSignal && _fullPackSignal.aborted);
            const _groupFinalStatus = _allStopped ? 'stopped' : (_preflightOnly ? 'ready' : (_hadGroupFailures ? 'partial' : 'completed'));
            updateFullPackRun(prev => {
                const groups = prev.groups || {};
                const childRuns = Object.values(groups);
                const hasChildFailures = childRuns.some(run => run && (run.status === 'failed' || run.status === 'partial' || run.status === 'interrupted'));
                const finishedAt = new Date().toISOString();
                const resolvedGroupStatus = _allStopped ? 'stopped'
                    : (_preflightOnly ? 'ready' : (hasChildFailures ? 'partial' : _groupFinalStatus));
                return Object.assign({}, prev, {
                    status: resolvedGroupStatus,
                    finishedAt: _preflightOnly ? null : finishedAt,
                    readyAt: _preflightOnly ? finishedAt : null,
                    elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt),
                });
            });
            if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: _groupFinalStatus });
            addToast(_allStopped
                ? `Full Pack generation stopped. Finished group resources were kept.`
                : (_preflightOnly
                    ? `Full Pack plan ready for ${groupEntries.length} groups. Review it before generating.`
                    : `Generated full packs for ${groupEntries.length} groups!`), _allStopped ? 'info' : (_preflightOnly ? 'info' : 'success'));
        } finally {
            setGradeLevel(savedSettings.grade);
            setLeveledTextLanguage(savedSettings.lang);
            setStudentInterests(savedSettings.interests);
            setDokLevel(savedSettings.dok);
            setLeveledTextCustomInstructions(savedSettings.custom);
            setSelectedLanguages(savedSettings.selectedLangs);
            setTargetStandards(savedSettings.standards);
            setUseEmojis(savedSettings.emojis);
            setTextFormat(savedSettings.fmt);
            setIsProcessing(false);
            setGenerationStep('');
            setFullPackTargetGroup(_preflightOnly ? 'all' : 'none');
            if (_ownsFullPackAbort) _fullPackRunInFlight = false;
            if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        }
        return true;
    }
    if (targetGroup !== 'none' && rosterKey?.groups?.[targetGroup]) {
        handleApplyRosterGroup(targetGroup);
        await new Promise(r => setTimeout(r, 100));
    }
    // Virtual artifacts are inserted only to make later roster-group plans
    // account for reuse. They are not real source artifacts and must never be
    // written into an approved row as its primary/source artifact id.
    const latestAnalysis = history.slice().reverse().find(h => h && h.type === 'analysis'
        && h._fullPackPlannedArtifact !== true);
    let batchSourceText = (latestAnalysis && latestAnalysis.data && latestAnalysis.data.originalText)
        ? latestAnalysis.data.originalText
        : (typeof inputText === 'string' ? inputText.trim() : '');
    if (!batchSourceText) {
        const noSourceError = new Error('No source text is available for Full Pack generation.');
        recordFullPackFailure({ type: 'preflight', index: 0, reason: noSourceError.message, error: noSourceError, sourceTextChars: 0 });
        addToast(t('process.source_missing'), "error");
        updateFullPackRun(prev => Object.assign({}, prev, { status: 'failed', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
        if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: 'failed' });
        if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        if (_ownsFullPackAbort) _fullPackRunInFlight = false;
        return false;
    }
    const _sourceFingerprint = _normalizeFullPackSourceFingerprint('', batchSourceText);
    const _plannedSourceFingerprint = _planSourceRun && _planSourceRun.preflight
        ? _normalizeFullPackSourceFingerprint(_planSourceRun.preflight.sourceFingerprint || '') : '';
    if (_plannedSourceFingerprint && _plannedSourceFingerprint !== _sourceFingerprint) {
        const changedSourceError = new Error('The source changed since this Full Pack plan was created. Create a new plan before generating or retrying.');
        recordFullPackFailure({ type: 'preflight', index: 0, reason: changedSourceError.message, error: changedSourceError, sourceTextChars: batchSourceText.length });
        updateFullPackRun(prev => Object.assign({}, prev, { status: 'failed', reason: changedSourceError.message, finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
        addToast(changedSourceError.message, 'warning');
        if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: 'failed' });
        if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        if (_ownsFullPackAbort) _fullPackRunInFlight = false;
        return false;
    }
    if (_planSourceRun && _planSourceRun.preflight && _planSourceRun.preflight.standardsFingerprint
        && _planSourceRun.preflight.standardsFingerprint !== _activeInstructionalContext.standardsFingerprint) {
        const changedStandardsError = new Error('The standards context changed since this Full Pack plan was created. Create a new plan before generating or retrying.');
        recordFullPackFailure({ type: 'preflight', index: 0, reason: changedStandardsError.message, error: changedStandardsError, sourceTextChars: batchSourceText.length });
        updateFullPackRun(prev => Object.assign({}, prev, { status: 'failed', reason: changedStandardsError.message, finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt) }));
        addToast(changedStandardsError.message, 'warning');
        if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: 'failed' });
        if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        if (_ownsFullPackAbort) _fullPackRunInFlight = false;
        return false;
    }
    setIsProcessing(true);
    if (typeof setGenerationStage === 'function') setGenerationStage(_preflightOnly ? 'analyze' : 'build');
    setGenerationStep(_preflightOnly ? 'Planning Full Pack resources…' : t('fullpack.status_init'));
    addToast(_preflightOnly ? 'Building a Full Pack plan for review…' : t('fullpack.status_start'), "info");
    try {
        const activeStandardsContext = _runStandardsContext
            && Array.isArray(_runStandardsContext.standards)
            && _runStandardsContext.standards.length
            ? _runStandardsContext
            : null;
        const lessonDNA = {
            grade: gradeLevel,
            topic: sourceTopic || "General Topic",
            standard: (activeStandardsContext && activeStandardsContext.promptText) || standardsInput || '',
            concepts: [],
            keyTerms: [],
            visualContext: "",
            essentialQuestion: "",
        };
        const _plannedFullPackGenerationContext = _planSourceRun && _planSourceRun.planPayload
            && _planSourceRun.planPayload.generationContext || null;
        const _hasPlannedDifferentiationContext = !!(_plannedFullPackGenerationContext
            && Object.prototype.hasOwnProperty.call(
                _plannedFullPackGenerationContext, 'differentiationContext'
            ));
        const _fullPackDifferentiationContext = _hasPlannedDifferentiationContext
            ? String(_plannedFullPackGenerationContext.differentiationContext || '')
            : (typeof getGroupDifferentiationContext === 'function'
                ? String(getGroupDifferentiationContext() || '') : '');
        if (_approvedRun && _approvedRun.planPayload && _approvedRun.planPayload.lessonDNA) {
            Object.assign(lessonDNA, _approvedRun.planPayload.lessonDNA);
        }
        let batchConfig = _approvedRun && _approvedRun.planPayload && _approvedRun.planPayload.batchConfig
            ? Object.assign({}, _approvedRun.planPayload.batchConfig)
            : {};
        let resourcesToGen = [
            { type: 'glossary', directive: '' },
            { type: 'image', directive: '' },
            { type: 'outline', directive: '' },
            { type: 'sentence-frames', directive: '' },
            { type: 'faq', directive: '' },
            { type: 'timeline', directive: '' },
            { type: 'persona', directive: '' },
            { type: 'concept-sort', directive: '' },
            { type: 'brainstorm', directive: '' },
            { type: 'quiz', directive: '' },
            { type: 'lesson-plan', directive: '' },
            { type: 'adventure', directive: '' }
        ];
        // The adapted companion is included by default and remains
        // supplemental. This is independent of whether the source must remain
        // the primary text for standards alignment.
        if (_activeInstructionalContext.adaptedTextPolicy === 'include') {
            resourcesToGen.splice(1, 0, { type: 'simplified', directive: '' });
        }
        if (!_retryRun && !_approvedRun && (resourceCount === 'Auto' || resourceCount === 'All')) {
             if (!resourcesToGen.some(item => item && item.type === 'analysis')) {
                 resourcesToGen.unshift({ type: 'analysis', directive: "Essential verification step." });
             }
        }
        const existingTypes = history.map(h => h.type);
        if (_approvedRun) {
            resourcesToGen = ((_approvedRun.preflight && _approvedRun.preflight.selected) || [])
                .map((item, index) => Object.assign({}, item, {
                    type: item.type,
                    directive: item.directive || '',
                    uiId: item.uiId || (item.type + '-' + index),
                    instructionalText: item.instructionalText || null,
                    generationVariants: Array.isArray(item.generationVariants)
                        ? _cloneFullPackValue(item.generationVariants) : item.generationVariants,
                }));
        } else if (_retryRun) {
            resourcesToGen = Object.values(_retryRun.resources || {})
                .filter(_fullPackResourceNeedsRetry)
                .map(item => Object.assign({}, item, {
                    type: item.type,
                    directive: item.directive || '',
                    uiId: item.key || (item.type + '-' + item.index),
                    instructionalText: item.instructionalText || null,
                    lineageGenerationVariants: Array.isArray(item.generationVariants)
                        ? _cloneFullPackValue(item.generationVariants) : [],
                    generationVariants: Array.isArray(item.generationVariants)
                        ? item.generationVariants.filter(_fullPackVariantNeedsRetry)
                            .map(variant => Object.assign({}, variant, {
                                status: 'planned', resourceId: null,
                            }))
                        : item.generationVariants,
                }));
        } else if (isAutoConfigEnabled) {
            setGenerationStep(t('process.auto_config'));
            const customInputToUse = (chatContextOverride && typeof chatContextOverride === 'string') ? chatContextOverride : leveledTextCustomInstructions;
            const rosterCtx = _fullPackDifferentiationContext;
            const enrichedCustomInput = rosterCtx ? `${customInputToUse}\n${rosterCtx}` : customInputToUse;
            batchConfig = await autoConfigureSettings(
                batchSourceText,
                gradeLevel,
                standardsInput,
                leveledTextLanguage,
                enrichedCustomInput,
                existingTypes,
                resourceCount,
                _fullPackSignal
            );
            applyDetailedAutoConfig(batchConfig);
            if (batchConfig.lessonDNA) {
                if (Array.isArray(batchConfig.lessonDNA.goldenThread) && lessonDNA.concepts.length === 0) {
                    lessonDNA.concepts = batchConfig.lessonDNA.goldenThread.slice(0, 5);
                }
                if (Array.isArray(batchConfig.lessonDNA.keyTerms) && lessonDNA.keyTerms.length === 0) {
                    lessonDNA.keyTerms = batchConfig.lessonDNA.keyTerms.slice(0, 8);
                }
                if (batchConfig.lessonDNA.essentialQuestion && !lessonDNA.essentialQuestion) {
                    lessonDNA.essentialQuestion = batchConfig.lessonDNA.essentialQuestion;
                }
                try {
                    const eqLine = lessonDNA.essentialQuestion ? `EQ: "${lessonDNA.essentialQuestion}"` : '';
                    const conceptsLine = lessonDNA.concepts.length ? `Concepts: ${lessonDNA.concepts.slice(0, 3).join(', ')}${lessonDNA.concepts.length > 3 ? '…' : ''}` : '';
                    const parts = [eqLine, conceptsLine].filter(Boolean);
                    if (parts.length > 0) addToast(`Golden Thread locked in — ${parts.join(' · ')}`, 'info');
                } catch(e) { /* best-effort */ }
            }
            if (batchConfig.resourcePlan && Array.isArray(batchConfig.resourcePlan)) {
                 resourcesToGen = batchConfig.resourcePlan.map(item => ({
                     type: item.tool,
                     directive: item.directive || "",
                 }));
            }
            else if (batchConfig.recommendedResources) {
                resourcesToGen = batchConfig.recommendedResources.map(type => ({
                    type,
                    directive: batchConfig.toolDirectives?.[type] || "",
                }));
            }
            if (resourceCount === 'Auto' || resourceCount === 'All') {
                const essentials = ['analysis', 'lesson-plan'];
                essentials.forEach(item => {
                    const inBatch = resourcesToGen.some(r => r.type === item);
                    // Keep source-scoped singleton rows visible in the reviewed
                    // plan even when a matching artifact already exists. The
                    // Generation Matrix resolves that row to reuse (zero calls)
                    // instead of hiding the instructional dependency.
                    if (!inBatch) {
                        resourcesToGen.push({ type: item, directive: "Essential resource added by default." });
                    }
                });
            }
            const planItems = resourcesToGen.filter(r => r.type === 'lesson-plan');
            resourcesToGen = resourcesToGen.filter(r => r.type !== 'lesson-plan');
            resourcesToGen.sort((a, b) => (a.type === 'analysis' ? -1 : b.type === 'analysis' ? 1 : 0));
            if (planItems.length > 0) {
                resourcesToGen.push(...planItems);
            }
        }
        if (_defaultToAnalyzedAndAdaptedText && !_approvedRun && !_retryRun) {
            if (!resourcesToGen.some(item => item && item.type === 'analysis')) {
                resourcesToGen.unshift({ type: 'analysis', directive: 'Analyze the primary source before building its companion resources.' });
            }
            if (!resourcesToGen.some(item => item && item.type === 'simplified')) {
                const analysisIndex = resourcesToGen.findIndex(item => item && item.type === 'analysis');
                resourcesToGen.splice(Math.max(0, analysisIndex + 1), 0, {
                    type: 'simplified',
                    directive: 'Create a supplemental Adapted Text while keeping the analyzed primary text available.'
                });
            }
        }
        const _policySkippedResources = [];
        if (!_approvedRun && !_retryRun && _activeInstructionalContext.adaptedTextPolicy !== 'include') {
            const adaptedRows = resourcesToGen.filter(item => item && item.type === 'simplified');
            resourcesToGen = resourcesToGen.filter(item => !item || item.type !== 'simplified');
            adaptedRows.forEach(item => _policySkippedResources.push({
                type: 'simplified',
                uiId: item.uiId || null,
                reason: _activeInstructionalContext.adaptedTextPolicy === 'prohibited'
                    ? 'Adapted Text is contraindicated by a sourced standards constraint.'
                    : 'Adapted Text was omitted by educator choice.'
            }));
        }
        const fullPackFailures = [];
        const planFailures = [];
        const knownTypes = getFullPackKnownTypes();
        const normalizedResources = [];
        resourcesToGen.forEach((item, planIndex) => {
            const type = item && typeof item.type === 'string' ? item.type.trim() : '';
            if (!type) {
                planFailures.push({ type: 'plan', index: planIndex, reason: 'Full Pack plan item has no resource type', sourceTextChars: batchSourceText.length });
                return;
            }
            if (!knownTypes.has(type)) {
                planFailures.push({ type, index: planIndex, reason: 'Unsupported Full Pack resource type: ' + type, sourceTextChars: batchSourceText.length });
                return;
            }
            const primaryArtifact = latestAnalysis && latestAnalysis.id ? latestAnalysis.id : null;
            normalizedResources.push(Object.assign({}, item, {
                type,
                instructionalText: _fullPackInstructionalText(type, item.instructionalText, {
                    gradeLevel: _activeInstructionalContext.instructionalGrade || gradeLevel,
                    language: leveledTextLanguage,
                    primaryArtifactId: primaryArtifact,
                })
            }));
        });
        planFailures.forEach(failure => { fullPackFailures.push(failure); recordFullPackFailure(failure); });
        let runnableResources = normalizedResources.filter(item => !(item.type === 'timeline' && batchConfig.hasTimeline === false));
        let _skippedResources = planFailures.map(f => ({ type: f.type, index: f.index, reason: f.reason }))
            .concat(_policySkippedResources)
            .concat(normalizedResources.filter(item => item.type === 'timeline' && batchConfig.hasTimeline === false)
                .map(item => ({ type: item.type, reason: 'Skipped by auto-configuration.' })));
        const _diffLevels = typeof getDifferentiationGrades === 'function'
            ? getDifferentiationGrades(gradeLevel, differentiationRange, differentiationCustomGrades)
            : (differentiationRange === 'None' ? [gradeLevel] : differentiationRange === 'Custom'
                ? Array.from(new Set([gradeLevel].concat(Array.isArray(differentiationCustomGrades) ? differentiationCustomGrades : [])))
                : [gradeLevel, gradeLevel, gradeLevel]);
        const _diffTypeSet = new Set(Array.isArray(differentiationTypes) ? differentiationTypes : ['simplified']);
        const _matrixContextFingerprint = _fullPackFingerprint(JSON.stringify({
            standardsFingerprint: _activeInstructionalContext.standardsFingerprint,
            instructionalGrade: _activeInstructionalContext.instructionalGrade || gradeLevel,
            interests: Array.isArray(studentInterests) ? studentInterests : [],
            dokLevel: dokLevel || '',
            useEmojis: !!useEmojis,
            translationMode: translationMode || '',
            currentUiLanguage: currentUiLanguage || '',
            translationTarget: _xlate && _xlate.target || '',
            selectedLanguages: Array.isArray(selectedLanguages) ? selectedLanguages : [],
            groupId: fullPackGroupId || null,
        }));
        const _matrixGenerationContext = _buildFullPackScopedGenerationContext(
            _matrixContextFingerprint,
            _fullPackDifferentiationContext,
            lessonDNA,
            batchConfig
        );
        const _reviewedGenerationMatrix = _planSourceRun && _planSourceRun.preflight
            && _planSourceRun.preflight.generationMatrix;
        const _matrixArtifacts = _reviewedGenerationMatrix && Array.isArray(_reviewedGenerationMatrix.artifacts)
            ? _cloneFullPackValue(_reviewedGenerationMatrix.artifacts)
            : _compactFullPackMatrixArtifacts(history);
        const _matrixSettings = _reviewedGenerationMatrix && _reviewedGenerationMatrix.settings
            ? _reviewedGenerationMatrix.settings
            : _buildFullPackGenerationSettings({
                sourceText: batchSourceText,
                sourceFingerprint: _sourceFingerprint,
                sourceArtifactId: latestAnalysis && latestAnalysis.id || null,
                gradeLevel,
                language: leveledTextLanguage,
                leveledTextLanguage,
                selectedLanguages,
                differentiationRange,
                differentiationGrades: _diffLevels,
                differentiationCustomGrades,
                differentiationTypes: Array.from(_diffTypeSet),
                standardsFingerprint: _activeInstructionalContext.standardsFingerprint,
                contextFingerprint: _matrixContextFingerprint,
                groupId: fullPackGroupId || null,
                translationMode,
                currentUiLanguage,
                translationTarget: _xlate && _xlate.target || null,
                studentInterests,
                dokLevel,
                useEmojis,
                textFormat,
                imageGenerationStyle,
                universalImageStyle: imageGenerationStyle,
                imageAspectRatio,
                backend: _fullPackGenerationConfig.provider.backend,
                model: _fullPackGenerationConfig.provider.model,
                provider: _fullPackGenerationConfig.provider.provider
                    || _fullPackGenerationConfig.provider.backend,
                fallbackModel: _fullPackGenerationConfig.provider.fallbackModel,
                imageProvider: _fullPackGenerationConfig.provider.imageProvider,
                imageModel: _fullPackGenerationConfig.provider.imageModel,
                visionModel: _fullPackGenerationConfig.provider.visionModel,
                toolOverrides: _fullPackMatrixToolOverrides(_fullPackGenerationConfig.toolOverrides),
                generationOptions: _cloneFullPackValue(_fullPackGenerationConfig.toolOptions),
                generationConfig: _cloneFullPackValue(_fullPackGenerationConfig.canonical || _fullPackGenerationConfig),
                generationConfigFingerprint: _fullPackGenerationConfig.fingerprint,
                generationContext: _matrixGenerationContext,
            });
        const _hasReviewedVariants = !!(_approvedRun || _retryRun)
            && runnableResources.every(item => Array.isArray(item.generationVariants) && item.generationVariants.length > 0);
        const _matrixResolution = _hasReviewedVariants
            ? {
                rows: runnableResources,
                skipped: [],
                summary: _summarizeFullPackMatrixRows(runnableResources, _matrixSettings),
                settings: _matrixSettings,
              }
            : _resolveFullPackPlanRows(runnableResources, Object.assign({}, _matrixSettings, {
                settings: _matrixSettings,
                sourceText: batchSourceText,
                sourceFingerprint: _sourceFingerprint,
                sourceArtifactId: latestAnalysis && latestAnalysis.id || null,
                existingArtifacts: history,
                allowVariants: true,
                groupId: fullPackGroupId || null,
                translationMode,
                currentUiLanguage,
                translationTarget: _xlate && _xlate.target || null,
            }));
        runnableResources = _matrixResolution.rows;
        const _matrixSkipped = (Array.isArray(_matrixResolution.skipped) ? _matrixResolution.skipped : [])
            .map(item => Object.assign({}, item, { matrixPolicy: true }));
        _skippedResources = _skippedResources.concat(_matrixSkipped);
        runnableResources = runnableResources.map(item => Object.assign({}, item, {
            providerWorkEstimate: _estimateFullPackRowProviderWork(item, _matrixResolution.settings || _matrixSettings),
        }));
        const _matrixSummary = Object.assign(
            {},
            _matrixResolution.summary || {},
            _summarizeFullPackMatrixRows(runnableResources, _matrixResolution.settings || _matrixSettings)
        );
        const _estimatedResourceGenerations = Math.max(0, Number(_matrixSummary.expectedCalls) || 0);
        const _estimatedProviderCalls = Math.max(_estimatedResourceGenerations, Number(_matrixSummary.providerCalls) || 0);
        const _imageCalls = Math.max(0, Number(_matrixSummary.imageCalls) || 0);
        const _capacity = _estimateFullPackCapacity(_estimatedProviderCalls, _imageCalls, aiProviderProfile || {}, {
            resourceCalls: _estimatedResourceGenerations,
            glossaryImageCalls: _matrixSummary.glossaryImageCalls,
            imageEditCalls: _matrixSummary.glossaryImageEditCalls,
            requestConcurrency: _matrixSummary.maxRequestConcurrency,
        });
        const _fullPackPreflight = {
            createdAt: new Date().toISOString(),
            sourceTextChars: batchSourceText.length,
            sourceFingerprint: _sourceFingerprint,
            retryOf: _retryRun && _retryRun.runId || null,
            selected: runnableResources.map((item, index) => Object.assign({}, item, {
                type: item.type,
                index,
                uiId: item.uiId || (item.type + '-' + index),
                directive: item.directive || '',
                instructionalText: _cloneFullPackValue(item.instructionalText),
                generationVariants: _cloneFullPackValue(item.generationVariants || []),
            })),
            skipped: _skippedResources,
            differentiation: { range: differentiationRange || 'None', types: Array.from(_diffTypeSet), grades: _diffLevels.slice(), levelCount: Math.max(1, _diffLevels.length) },
            generationMatrix: {
                version: 1,
                settings: _cloneFullPackValue(_matrixSettings),
                summary: _cloneFullPackValue(_matrixSummary),
                artifacts: _matrixArtifacts,
                translation: {
                    mode: translationMode || 'auto',
                    currentUiLanguage: currentUiLanguage || 'English',
                    target: _xlate && _xlate.target || null,
                    outputLanguage: leveledTextLanguage || 'English',
                    selectedLanguages: Array.isArray(selectedLanguages) ? selectedLanguages.slice() : [],
                },
            },
            estimatedResourceGenerations: _estimatedResourceGenerations,
            estimatedProviderCalls: _estimatedProviderCalls,
            planSchemaVersion: FULL_PACK_PLAN_SCHEMA_VERSION,
            capabilityFingerprint: FULL_PACK_CAPABILITY_FINGERPRINT,
            standardsFingerprint: _activeInstructionalContext.standardsFingerprint,
            capacity: _capacity,
        };
        const _planPayload = {
            batchConfig: _compactFullPackBatchConfig(batchConfig),
            generationContext: {
                differentiationContext: _fullPackDifferentiationContext,
            },
            standardsContext: _cloneFullPackValue(activeStandardsContext),
            instructionalContext: _cloneFullPackValue(_activeInstructionalContext),
            lessonDNA: Object.assign({}, lessonDNA, {
                concepts: Array.isArray(lessonDNA.concepts) ? lessonDNA.concepts.slice() : [],
                keyTerms: Array.isArray(lessonDNA.keyTerms) ? lessonDNA.keyTerms.slice() : [],
            }),
        };
        updateFullPackRun(prev => Object.assign({}, prev, { preflight: _fullPackPreflight, planPayload: _planPayload }));
        warnLog('[FullPack] preflight runId=' + _fullPackRunId + ' selected=' + runnableResources.length + ' skipped=' + _skippedResources.length + ' estimatedResourceGenerations=' + _estimatedResourceGenerations);
        if (runnableResources.length === 0) {
            throw new Error('Full Pack auto-configuration produced no runnable resources.');
        }
        if (_preflightOnly) {
            updateFullPackRun(prev => Object.assign({}, prev, {
                status: 'ready',
                readyAt: new Date().toISOString(),
                elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt),
            }));
            if (typeof setGenerationStage === 'function') setGenerationStage('finalize');
            setGenerationStep('Full Pack plan ready for review.');
            addToast('Full Pack plan ready. Review the resources and settings before generating.', 'info');
            return true;
        }
        let currentSessionHistory = [...history];
        // Materialize the whole reviewed queue before the first request. If a
        // teacher stops between rows (or the browser interrupts the run), the
        // remaining work stays explicit and can be resumed without rebuilding
        // or silently dropping later resources.
        updateFullPackRun(prev => Object.assign({}, prev, {
            resources: _queueFullPackPlanRows(runnableResources, prev.resources || {}),
        }));
        const matrixExecutionEnabled = !!(_getGenerationMatrixModule()
            && _matrixSettings && _matrixSettings.version && _matrixSettings.version !== 0);
        if (matrixExecutionEnabled) {
            let plannedCallsRemaining = _estimatedResourceGenerations;
            const applyResultToLessonDna = (type, resultItem) => {
                if (!resultItem || !resultItem.data) return;
                if (type === 'analysis') {
                    if (resultItem.data.originalText) batchSourceText = resultItem.data.originalText;
                    if (Array.isArray(resultItem.data.concepts) && lessonDNA.concepts.length === 0) {
                        lessonDNA.concepts = resultItem.data.concepts.slice(0, 5);
                    }
                }
                if (type === 'glossary' && Array.isArray(resultItem.data) && lessonDNA.keyTerms.length === 0) {
                    lessonDNA.keyTerms = resultItem.data.slice(0, 8).map(term => term.term).filter(Boolean);
                }
                if (type === 'image') lessonDNA.visualContext = resultItem.data.prompt || resultItem.data.altText;
                if (type === 'lesson-plan' && resultItem.data.essentialQuestion && !lessonDNA.essentialQuestion) {
                    lessonDNA.essentialQuestion = resultItem.data.essentialQuestion;
                }
            };
            addToast(t('process.gen_batch', { count: runnableResources.length }), "info");
            for (let i = 0; i < runnableResources.length && !(_fullPackSignal && _fullPackSignal.aborted); i++) {
                const plannedRow = runnableResources[i] || {};
                const { type, directive } = plannedRow;
                const plannedInstructionalText = plannedRow.instructionalText;
                const resourceKey = String(plannedRow.uiId || (type + '-' + i));
                const resourceStartedAt = Date.now();
                const reviewedVariants = Array.isArray(plannedRow.generationVariants) && plannedRow.generationVariants.length
                    ? _cloneFullPackValue(plannedRow.generationVariants)
                    : _fallbackFullPackPlanRows([plannedRow], _matrixSettings).rows[0].generationVariants;
                const runtimeVariants = [];
                const rowResults = [];
                const rowFailures = [];
                const rowMatrixSettings = _buildFullPackGenerationSettings(Object.assign({}, _matrixSettings, {
                    generationContext: _buildFullPackScopedGenerationContext(
                        _matrixContextFingerprint,
                        _fullPackDifferentiationContext,
                        lessonDNA,
                        batchConfig
                    ),
                }));
                let maxAttempts = reviewedVariants.some(variant => variant && variant.action === 'reuse') ? 0 : 1;
                updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, {
                    [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], {
                        key: resourceKey, type, index: i, directive: directive || '',
                        instructionalText: _cloneFullPackValue(plannedInstructionalText),
                        generationAction: plannedRow.generationAction || plannedRow.action || 'generate',
                        generationIdentity: plannedRow.generationIdentity || null,
                        generationVariants: _mergeFullPackVariantLineage(
                            prev.resources && prev.resources[resourceKey]
                                && prev.resources[resourceKey].generationVariants,
                            reviewedVariants.map(variant => Object.assign({}, variant, { status: 'planned' }))
                        ),
                        status: 'running', attempts: maxAttempts,
                        startedAt: new Date(resourceStartedAt).toISOString(), elapsedMs: 0,
                    })
                }) }));

                const userOverride = _fullPackToolOverride(type, _fullPackGenerationConfig);
                const combinedInstructions = `${directive} ${userOverride ? `(User Note: ${userOverride})` : ''}`.trim();
                const stepConfigBase = {
                    ...batchConfig,
                    ..._cloneFullPackValue(_fullPackGenerationConfig.toolOptions || {}),
                    lessonDNA,
                    customInstructions: combinedInstructions,
                    standardsContext: activeStandardsContext,
                    instructionalContext: _activeInstructionalContext,
                    instructionalText: plannedInstructionalText,
                    historyOverride: currentSessionHistory,
                    rethrowErrors: true,
                };
                if (type === 'outline' && directive
                    && !_fullPackGenerationConfig.toolOptions?.outlineType) {
                    const lower = directive.toLowerCase();
                    if (lower.includes('compare') || lower.includes('venn')) stepConfigBase.outlineType = 'Venn Diagram';
                    else if (lower.includes('process') || lower.includes('flow')) stepConfigBase.outlineType = 'Flow Chart';
                    else if (lower.includes('cause')) stepConfigBase.outlineType = 'Cause and Effect';
                    else if (lower.includes('mind') || lower.includes('concept')) stepConfigBase.outlineType = 'Key Concept Map';
                    else stepConfigBase.outlineType = 'Structured Outline';
                }
                if (type === 'lesson-plan') stepConfigBase.assetManifest = getAssetManifest(currentSessionHistory);
                const effectiveDokLevel = (batchConfig && batchConfig.quizConfig && batchConfig.quizConfig.dok)
                    || rowMatrixSettings.dokLevel || dokLevel;

                for (let vi = 0; vi < reviewedVariants.length && !(_fullPackSignal && _fullPackSignal.aborted); vi++) {
                    const reviewedVariant = reviewedVariants[vi] || {};
                    let variant = _recheckFullPackVariant(plannedRow, reviewedVariant, {
                        settings: rowMatrixSettings,
                        sourceText: batchSourceText,
                        sourceFingerprint: _sourceFingerprint,
                        sourceArtifactId: rowMatrixSettings.sourceArtifactId,
                        existingArtifacts: currentSessionHistory,
                        groupId: fullPackGroupId || null,
                    });
                    variant = Object.assign({}, variant, {
                        explicitVariantKey: plannedRow.explicitVariantKey || null,
                        variantKeyDerived: plannedRow.variantKeyDerived === true,
                    });
                    let action = ['reuse', 'generate', 'variant', 'refresh'].includes(variant.action)
                        ? variant.action : (reviewedVariant.action || 'generate');
                    let resultItem = action === 'reuse' ? _fullPackHistoryArtifact(currentSessionHistory, variant) : null;
                    if (action === 'reuse' && !resultItem) {
                        action = reviewedVariant.action === 'refresh' ? 'refresh'
                            : (reviewedVariant.action === 'variant' ? 'variant' : 'generate');
                        variant = Object.assign({}, variant, {
                            action, existingArtifactId: null,
                            reason: 'Reviewed reusable artifact was unavailable at execution.',
                        });
                    }
                    if (resultItem) {
                        const trackedReuse = _trackFullPackHistoryArtifact(currentSessionHistory, resultItem, variant, 'reuse');
                        rowResults.push(trackedReuse);
                        runtimeVariants.push(Object.assign({}, variant, {
                            action: 'reuse', status: 'reused', resourceId: trackedReuse.id || null, attempts: 0,
                        }));
                        applyResultToLessonDna(type, trackedReuse);
                        continue;
                    }

                    const cellGrade = variant.grade || gradeLevel;
                    const cellLanguage = variant.language || (leveledTextLanguage === 'All Selected Languages' ? 'English' : leveledTextLanguage);
                    const identityEnvelope = variant.generationIdentity ? {
                        key: variant.generationIdentity,
                        type,
                        sourceFingerprint: variant.sourceFingerprint || _sourceFingerprint,
                        sourceArtifactId: variant.sourceArtifactId || rowMatrixSettings.sourceArtifactId || null,
                        grade: cellGrade || null,
                        language: cellLanguage || 'English',
                        variantKey: variant.variantKey || plannedRow.variantKey || '',
                        explicitVariantKey: plannedRow.explicitVariantKey || null,
                        variantKeyDerived: plannedRow.variantKeyDerived === true,
                        contextFingerprint: variant.contextFingerprint || rowMatrixSettings.contextFingerprint || '',
                        contextInputsFingerprint: variant.contextInputsFingerprint
                            || rowMatrixSettings.contextInputsFingerprint || '',
                        generationConfig: _cloneFullPackValue(variant.generationConfig || {}),
                        generationConfigFingerprint: variant.generationConfigFingerprint
                            || rowMatrixSettings.generationConfigFingerprint || '',
                    } : null;
                    const cellConfig = Object.assign({}, stepConfigBase, {
                        grade: cellGrade,
                        skipDifferentiation: true,
                        generationIdentity: identityEnvelope,
                        sourceFingerprint: variant.sourceFingerprint || _sourceFingerprint,
                        sourceArtifactId: variant.sourceArtifactId || rowMatrixSettings.sourceArtifactId || null,
                        variantKey: variant.variantKey || plannedRow.variantKey || '',
                        explicitVariantKey: plannedRow.explicitVariantKey || null,
                        variantKeyDerived: plannedRow.variantKeyDerived === true,
                        contextFingerprint: variant.contextFingerprint || rowMatrixSettings.contextFingerprint || '',
                        contextFingerprintDerived: true,
                        contextInputsFingerprint: variant.contextInputsFingerprint
                            || rowMatrixSettings.contextInputsFingerprint || '',
                        generationMatrixManaged: true,
                        translationMode: rowMatrixSettings.translationMode || translationMode || '',
                        currentUiLanguage: rowMatrixSettings.currentUiLanguage || currentUiLanguage || '',
                        translationTarget: rowMatrixSettings.translationTarget || (_xlate && _xlate.target) || '',
                        selectedLanguages: Array.isArray(rowMatrixSettings.selectedLanguages)
                            ? rowMatrixSettings.selectedLanguages.slice() : selectedLanguages,
                        standardsFingerprint: rowMatrixSettings.standardsFingerprint || '',
                        studentInterests: Array.isArray(rowMatrixSettings.studentInterests)
                            ? rowMatrixSettings.studentInterests.slice() : studentInterests,
                        dokLevel: rowMatrixSettings.dokLevel || dokLevel || '',
                        useEmojis: rowMatrixSettings.useEmojis === true,
                        textFormat: rowMatrixSettings.textFormat || textFormat || '',
                        imageGenerationStyle: rowMatrixSettings.imageGenerationStyle || imageGenerationStyle || '',
                        imageAspectRatio: rowMatrixSettings.imageAspectRatio || imageAspectRatio || '',
                        generationContext: _cloneFullPackValue(rowMatrixSettings.generationContext || {}),
                        generationConfig: _cloneFullPackValue(variant.generationConfig
                            || rowMatrixSettings.generationConfig || _fullPackGenerationConfig.canonical || {}),
                        generationConfigFingerprint: variant.generationConfigFingerprint
                            || rowMatrixSettings.generationConfigFingerprint
                            || _fullPackGenerationConfig.fingerprint,
                        backend: rowMatrixSettings.backend || _fullPackGenerationConfig.provider.backend,
                        model: rowMatrixSettings.model || _fullPackGenerationConfig.provider.model,
                        provider: rowMatrixSettings.provider
                            || _fullPackGenerationConfig.provider.provider
                            || _fullPackGenerationConfig.provider.backend,
                        fallbackModel: rowMatrixSettings.fallbackModel
                            || _fullPackGenerationConfig.provider.fallbackModel,
                        imageProvider: rowMatrixSettings.imageProvider || _fullPackGenerationConfig.provider.imageProvider,
                        imageModel: rowMatrixSettings.imageModel || _fullPackGenerationConfig.provider.imageModel,
                        visionModel: rowMatrixSettings.visionModel || _fullPackGenerationConfig.provider.visionModel,
                        toolOverrides: _cloneFullPackValue(rowMatrixSettings.toolOverrides
                            || _fullPackGenerationConfig.toolOverrides),
                        rosterGroupId: fullPackGroupId || undefined,
                        historyOverride: currentSessionHistory,
                    });
                    const generationDepsOverride = {
                        ..._fullPackGenerationConfigDeps(_fullPackGenerationConfig),
                        gradeLevel: cellGrade,
                        leveledTextLanguage: cellLanguage,
                        studentInterests: Array.isArray(rowMatrixSettings.studentInterests)
                            ? rowMatrixSettings.studentInterests.slice() : studentInterests,
                        dokLevel: effectiveDokLevel,
                        // The explicit language override and skipDifferentiation
                        // make this one exact matrix cell; retain the frozen
                        // language set because Glossary embeds those selected
                        // translations inside its single artifact.
                        selectedLanguages: Array.isArray(rowMatrixSettings.selectedLanguages)
                            ? rowMatrixSettings.selectedLanguages.slice() : selectedLanguages,
                        translationMode: rowMatrixSettings.translationMode || translationMode,
                        currentUiLanguage: rowMatrixSettings.currentUiLanguage || currentUiLanguage,
                        resolveTranslationPolicy,
                        targetStandards,
                        standardsContext: activeStandardsContext,
                        instructionalContext: _activeInstructionalContext,
                        useEmojis: rowMatrixSettings.useEmojis === true,
                        textFormat: rowMatrixSettings.textFormat || textFormat,
                        imageGenerationStyle: rowMatrixSettings.imageGenerationStyle || imageGenerationStyle,
                        imageAspectRatio: rowMatrixSettings.imageAspectRatio || imageAspectRatio,
                        aiProviderProfile: _cloneFullPackValue(_fullPackGenerationConfig.provider),
                        fullPackGenerationConfig: _cloneFullPackValue(_fullPackGenerationConfig),
                        ..._cloneFullPackValue(_fullPackGenerationConfig.toolOptions || {}),
                        differentiationRange: 'None',
                        differentiationTypes,
                        differentiationCustomGrades,
                        getGroupDifferentiationContext: () => type === 'analysis'
                            ? '' : _fullPackDifferentiationContext,
                        generationSignal: _fullPackSignal,
                    };
                    let finalError = null;
                    let failureReason = '';
                    let failurePolicy = null;
                    let attempts = 1;
                    const keepLoading = plannedCallsRemaining > 1;
                    try {
                        resultItem = await handleGenerate(type, cellLanguage, keepLoading, batchSourceText, cellConfig, false, generationDepsOverride);
                        plannedCallsRemaining = Math.max(0, plannedCallsRemaining - 1);
                        if (!isUsableGeneratedResource(resultItem, type)) throw new Error('handleGenerate returned an unusable ' + type + ' resource');
                    } catch (error) {
                        plannedCallsRemaining = Math.max(0, plannedCallsRemaining - 1);
                        finalError = error;
                        resultItem = null;
                        failureReason = redactFullPackDiagnosticText((finalError && (finalError.message || finalError.name)) || String(finalError), 2000);
                        failurePolicy = _fullPackFailurePolicy(finalError);
                        if (!_isFullPackAbort(finalError, _fullPackSignal) && failurePolicy.retryable) {
                            attempts = 2;
                            maxAttempts = Math.max(maxAttempts, attempts);
                            updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, {
                                [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], {
                                    status: 'retrying', attempts, failureCategory: failurePolicy.category,
                                    suggestedDelayMs: failurePolicy.delayMs,
                                    failureKind: failurePolicy.kind,
                                    quotaScope: failurePolicy.quotaScope,
                                    providerError: failurePolicy.providerError,
                                })
                            }) }));
                            _recordFullPackMetric('retry-scheduled', { type });
                            warnLog('[FullPack] retrying resource=' + type + ' afterMs=' + failurePolicy.delayMs
                                + ' kind=' + failurePolicy.kind + ' quotaScope=' + failurePolicy.quotaScope);
                            try {
                                await _waitForFullPackDelay(failurePolicy.delayMs, _fullPackSignal);
                                resultItem = await handleGenerate(type, cellLanguage, keepLoading, batchSourceText, cellConfig, false, generationDepsOverride);
                                if (!isUsableGeneratedResource(resultItem, type)) throw new Error('handleGenerate retry returned an unusable ' + type + ' resource');
                                _recordFullPackMetric('retry-recovered', { type });
                            } catch (retryError) {
                                finalError = retryError;
                                resultItem = null;
                                failureReason = redactFullPackDiagnosticText((finalError && (finalError.message || finalError.name)) || String(finalError), 2000);
                                failurePolicy = _fullPackFailurePolicy(finalError);
                                if (!_isFullPackAbort(finalError, _fullPackSignal)) _recordFullPackMetric('retry-exhausted', { type });
                            }
                        }
                    }
                    maxAttempts = Math.max(maxAttempts, attempts);
                    if (resultItem) {
                        if (!resultItem.instructionalText && plannedInstructionalText) {
                            resultItem = Object.assign({}, resultItem, { instructionalText: _cloneFullPackValue(plannedInstructionalText) });
                        }
                        const trackedResult = _trackFullPackHistoryArtifact(currentSessionHistory, resultItem, variant, action);
                        rowResults.push(trackedResult);
                        runtimeVariants.push(Object.assign({}, variant, {
                            action, status: 'landed', resourceId: trackedResult.id || null, attempts,
                        }));
                        applyResultToLessonDna(type, trackedResult);
                    } else if (_isFullPackAbort(finalError, _fullPackSignal)) {
                        runtimeVariants.push(Object.assign({}, variant, {
                            action, status: 'stopped', resourceId: null, attempts,
                        }));
                    } else {
                        failurePolicy = failurePolicy || _fullPackFailurePolicy(finalError || failureReason);
                        const failure = {
                            type,
                            index: i,
                            reason: failureReason,
                            error: finalError,
                            category: failurePolicy.category,
                            retryable: failurePolicy.retryable,
                            suggestedDelayMs: failurePolicy.delayMs,
                            failureKind: failurePolicy.kind,
                            quotaScope: failurePolicy.quotaScope,
                            providerError: failurePolicy.providerError,
                            sourceTextChars: batchSourceText ? batchSourceText.length : 0,
                            generationIdentity: variant.generationIdentity || null,
                            grade: cellGrade,
                            language: cellLanguage,
                        };
                        rowFailures.push(failure);
                        fullPackFailures.push(failure);
                        recordFullPackFailure(failure);
                        runtimeVariants.push(Object.assign({}, variant, {
                            action, status: 'failed', resourceId: null, attempts,
                            reason: failure.reason, failureCategory: failure.category,
                            retryable: failure.retryable, suggestedDelayMs: failure.suggestedDelayMs,
                            failureKind: failure.failureKind, quotaScope: failure.quotaScope,
                            providerError: failure.providerError,
                        }));
                    }
                }

                const resourceElapsedMs = Math.max(0, Date.now() - resourceStartedAt);
                const stopped = !!(_fullPackSignal && _fullPackSignal.aborted);
                const pendingVariants = reviewedVariants.slice(runtimeVariants.length).map(variant => Object.assign({}, variant, {
                    status: 'queued', resourceId: null, attempts: 0, retryable: true,
                    reason: variant.reason || 'Queued when the Full Pack run stopped.',
                }));
                const currentVariantResults = runtimeVariants.concat(pendingVariants);
                const finalizedVariants = _mergeFullPackVariantLineage(
                    plannedRow.lineageGenerationVariants || [], currentVariantResults
                );
                const unresolvedVariants = finalizedVariants.filter(variant => variant
                    && ['failed', 'interrupted', 'stopped', 'queued', 'planned'].includes(variant.status));
                const rowStatus = unresolvedVariants.length
                    ? (stopped ? 'stopped' : 'failed') : 'landed';
                const runtimeActions = Array.from(new Set(finalizedVariants.map(variant => variant.action).filter(Boolean)));
                const generationAction = runtimeActions.length === 1 ? runtimeActions[0]
                    : (runtimeActions.length ? 'mixed' : plannedRow.generationAction || 'generate');
                const resourceIds = rowResults.map(item => item && item.id)
                    .filter((id, index, list) => id != null && list.indexOf(id) === index);
                if (rowStatus === 'landed') _recordFullPackMetric('resource-finish', { type, status: 'landed', durationMs: resourceElapsedMs });
                else if (!stopped) _recordFullPackMetric('resource-finish', { type, status: 'failed', durationMs: resourceElapsedMs });
                const firstFailure = rowFailures[0]
                    || unresolvedVariants.find(variant => variant && variant.reason) || null;
                const retryableVariants = finalizedVariants.filter(_fullPackVariantNeedsRetry);
                updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, {
                    [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], {
                        key: resourceKey, type, index: i, directive: directive || '', status: rowStatus,
                        generationAction,
                        generationIdentity: plannedRow.generationIdentity || null,
                        generationVariants: finalizedVariants,
                        resourceId: resourceIds[0]
                            || prev.resources && prev.resources[resourceKey]
                                && prev.resources[resourceKey].resourceId || null,
                        resourceIds: Array.from(new Set([].concat(
                            prev.resources && prev.resources[resourceKey]
                                && prev.resources[resourceKey].resourceIds || [],
                            resourceIds
                        ).filter(id => id != null))),
                        attempts: maxAttempts,
                        reason: firstFailure && firstFailure.reason || undefined,
                        failureCategory: firstFailure
                            && (firstFailure.category || firstFailure.failureCategory) || undefined,
                        retryable: retryableVariants.length > 0,
                        suggestedDelayMs: retryableVariants[0] && retryableVariants[0].suggestedDelayMs
                            || firstFailure && firstFailure.suggestedDelayMs || undefined,
                        finishedAt: new Date().toISOString(), elapsedMs: resourceElapsedMs,
                    })
                }) }));
                const isLast = i === runnableResources.length - 1;
                if (!isLast && !(_fullPackSignal && _fullPackSignal.aborted)) await _waitForFullPackDelay(800, _fullPackSignal);
            }
        } else {
        addToast(t('process.gen_batch', { count: runnableResources.length }), "info");
        for (let i = 0; i < runnableResources.length && !(_fullPackSignal && _fullPackSignal.aborted); i++) {
            const { type, directive } = runnableResources[i];
            const plannedInstructionalText = runnableResources[i].instructionalText;
            const resourceKey = String(runnableResources[i].uiId || (type + '-' + i));
            const _resourceStartedAt = Date.now();
            updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: { key: resourceKey, type, index: i, directive: directive || '', instructionalText: _cloneFullPackValue(plannedInstructionalText), status: 'running', attempts: 1, startedAt: new Date(_resourceStartedAt).toISOString(), elapsedMs: 0 } }) }));
            let userOverride = "";
            switch(type) {
                case 'simplified': userOverride = leveledTextCustomInstructions; break;
                case 'quiz': userOverride = quizCustomInstructions; break;
                case 'adventure': userOverride = adventureCustomInstructions; break;
                case 'sentence-frames': userOverride = frameCustomInstructions; break;
                case 'brainstorm': userOverride = brainstormCustomInstructions; break;
                case 'faq': userOverride = faqCustomInstructions; break;
                case 'outline': userOverride = outlineCustomInstructions; break;
                case 'image': userOverride = visualCustomInstructions; break;
                case 'timeline': userOverride = timelineTopic; break;
                case 'lesson-plan': userOverride = lessonCustomAdditions; break;
                // conceptInput is unsubmitted category text, NOT an instruction —
                // prefer the real field and fall back, never concatenate.
                case 'concept-sort': userOverride = conceptSortCustomInstructions || conceptInput; break;
                // Added 2026-07-28: without these, a resource generated inside a
                // Full Pack silently ignored the custom instructions that the
                // same resource honours when generated from its own button.
                case 'glossary': userOverride = glossaryCustomInstructions; break;
                case 'persona': userOverride = personaCustomInstructions; break;
                case 'dbq': userOverride = dbqCustomInstructions; break;
                case 'note-taking': userOverride = noteTakingCustomInstructions; break;
                case 'anchor-chart': userOverride = anchorChartCustomInstructions; break;
            }
            const combinedInstructions = `${directive} ${userOverride ? `(User Note: ${userOverride})` : ''}`.trim();
            const stepConfig = {
                ...batchConfig,
                ..._cloneFullPackValue(_fullPackGenerationConfig.toolOptions || {}),
                lessonDNA: lessonDNA,
                customInstructions: combinedInstructions,
                standardsContext: activeStandardsContext,
                instructionalContext: _activeInstructionalContext,
                instructionalText: plannedInstructionalText,
                historyOverride: currentSessionHistory,
                // Full Pack is unattended: do not turn a rejected, throttled,
                // or malformed resource into a false success/no-op.
                rethrowErrors: true,
                // Differentiation is deliberately NOT suppressed here (Aaron,
                // 2026-07-29): differentiationTypes is opt-in per resource, so a
                // pack only multiplies for the types the teacher explicitly
                // chose — and a teacher who opted the quiz in wants the pack's
                // quiz differentiated too. The universal panel's cost preview is
                // the spend disclosure.
            };
            if (type === 'outline' && directive) {
                 const lower = directive.toLowerCase();
                 if (lower.includes('compare') || lower.includes('venn')) stepConfig.outlineType = 'Venn Diagram';
                 else if (lower.includes('process') || lower.includes('flow')) stepConfig.outlineType = 'Flow Chart';
                 else if (lower.includes('cause')) stepConfig.outlineType = 'Cause and Effect';
                 else if (lower.includes('mind') || lower.includes('concept')) stepConfig.outlineType = 'Key Concept Map';
                 else stepConfig.outlineType = 'Structured Outline';
            }
            if (type === 'lesson-plan') {
                 const upToDateManifest = getAssetManifest(currentSessionHistory);
                 stepConfig.assetManifest = upToDateManifest;
            }
            const isLast = i === runnableResources.length - 1;
            const effectiveDokLevel = (batchConfig && batchConfig.quizConfig && batchConfig.quizConfig.dok) || dokLevel;
            const generationLanguageOverride = leveledTextLanguage === 'All Selected Languages' ? null : leveledTextLanguage;
            const generationDepsOverride = {
                ..._fullPackGenerationConfigDeps(_fullPackGenerationConfig),
                // Full Pack can be invoked for roster groups while the React
                // render still contains the previous group's settings. These
                // values are explicit inputs for the dispatcher, not UI state.
                gradeLevel,
                leveledTextLanguage,
                studentInterests,
                dokLevel: effectiveDokLevel,
                selectedLanguages,
                targetStandards,
                standardsContext: activeStandardsContext,
                instructionalContext: _activeInstructionalContext,
                useEmojis,
                textFormat,
                differentiationRange,
                differentiationTypes,
                differentiationCustomGrades,
                generationSignal: _fullPackSignal,
            };
            let resultItem = null;
            try {
                resultItem = await handleGenerate(type, generationLanguageOverride, !isLast, batchSourceText, stepConfig, false, generationDepsOverride);
                if (!isUsableGeneratedResource(resultItem, type)) throw new Error('handleGenerate returned an unusable ' + type + ' resource');
                if (!resultItem.instructionalText && plannedInstructionalText) {
                    resultItem = Object.assign({}, resultItem, { instructionalText: _cloneFullPackValue(plannedInstructionalText) });
                }
            } catch (error) {
                let finalError = error;
                resultItem = null;
                let failureReason = redactFullPackDiagnosticText((finalError && (finalError.message || finalError.name)) || String(finalError), 2000);
                let failurePolicy = _fullPackFailurePolicy(finalError);
                if (!_isFullPackAbort(finalError, _fullPackSignal) && failurePolicy.retryable) {
                    updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, {
                        [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], {
                            status: 'retrying', attempts: 2,
                            failureCategory: failurePolicy.category,
                            suggestedDelayMs: failurePolicy.delayMs,
                            failureKind: failurePolicy.kind,
                            quotaScope: failurePolicy.quotaScope,
                            providerError: failurePolicy.providerError,
                        })
                    }) }));
                    _recordFullPackMetric('retry-scheduled', { type });
                    warnLog('[FullPack] retrying resource=' + type + ' afterMs=' + failurePolicy.delayMs
                        + ' kind=' + failurePolicy.kind + ' quotaScope=' + failurePolicy.quotaScope);
                    try {
                        await _waitForFullPackDelay(failurePolicy.delayMs, _fullPackSignal);
                        resultItem = await handleGenerate(type, generationLanguageOverride, !isLast, batchSourceText, stepConfig, false, generationDepsOverride);
                        if (!isUsableGeneratedResource(resultItem, type)) throw new Error('handleGenerate retry returned an unusable ' + type + ' resource');
                        if (!resultItem.instructionalText && plannedInstructionalText) {
                            resultItem = Object.assign({}, resultItem, { instructionalText: _cloneFullPackValue(plannedInstructionalText) });
                        }
                        _recordFullPackMetric('retry-recovered', { type });
                    } catch (retryError) {
                        finalError = retryError;
                        resultItem = null;
                        failureReason = redactFullPackDiagnosticText((finalError && (finalError.message || finalError.name)) || String(finalError), 2000);
                        failurePolicy = _fullPackFailurePolicy(finalError);
                        if (!_isFullPackAbort(finalError, _fullPackSignal)) _recordFullPackMetric('retry-exhausted', { type });
                    }
                }
                if (!resultItem) {
                    const _resourceFinishedAt = new Date().toISOString();
                    const _resourceElapsedMs = Math.max(0, Date.now() - _resourceStartedAt);
                    if (_isFullPackAbort(finalError, _fullPackSignal)) {
                        updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], { key: resourceKey, type, index: i, directive: directive || '', status: 'stopped', finishedAt: _resourceFinishedAt, elapsedMs: _resourceElapsedMs }) }) }));
                    } else {
                        const failure = {
                            type,
                            index: i,
                            reason: failureReason,
                            error: finalError,
                            category: failurePolicy.category,
                            retryable: failurePolicy.retryable,
                            suggestedDelayMs: failurePolicy.delayMs,
                            failureKind: failurePolicy.kind,
                            quotaScope: failurePolicy.quotaScope,
                            providerError: failurePolicy.providerError,
                            sourceTextChars: batchSourceText ? batchSourceText.length : 0,
                        };
                        fullPackFailures.push(failure);
                        recordFullPackFailure(failure);
                        _recordFullPackMetric('resource-finish', { type, status: 'failed', durationMs: _resourceElapsedMs });
                        updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, {
                            [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], {
                                key: resourceKey, type, index: i, directive: directive || '', status: 'failed',
                                reason: failure.reason, failureCategory: failure.category,
                                retryable: failure.retryable, suggestedDelayMs: failure.suggestedDelayMs,
                                failureKind: failure.failureKind, quotaScope: failure.quotaScope,
                                providerError: failure.providerError,
                                finishedAt: _resourceFinishedAt, elapsedMs: _resourceElapsedMs,
                            })
                        }) }));
                    }
                }
            }
            if (resultItem) {
                const _landedElapsedMs = Math.max(0, Date.now() - _resourceStartedAt);
                _recordFullPackMetric('resource-finish', { type, status: 'landed', durationMs: _landedElapsedMs });
                updateFullPackRun(prev => Object.assign({}, prev, { resources: Object.assign({}, prev.resources, { [resourceKey]: Object.assign({}, prev.resources && prev.resources[resourceKey], { key: resourceKey, type, index: i, directive: directive || '', status: 'landed', resourceId: resultItem.id || null, finishedAt: new Date().toISOString(), elapsedMs: _landedElapsedMs }) }) }));
                currentSessionHistory.push(resultItem);
                if (resultItem.data) {
                    if (type === 'analysis') {
                        if (resultItem.data.originalText) {
                            batchSourceText = resultItem.data.originalText;
                        }
                        if (Array.isArray(resultItem.data.concepts) && lessonDNA.concepts.length === 0) {
                            lessonDNA.concepts = resultItem.data.concepts.slice(0, 5);
                        }
                    }
                    if (type === 'glossary') {
                        if (Array.isArray(resultItem.data) && lessonDNA.keyTerms.length === 0) {
                            lessonDNA.keyTerms = resultItem.data.slice(0, 8).map(t => t.term).filter(Boolean);
                        }
                    }
                    if (type === 'image') {
                        lessonDNA.visualContext = resultItem.data.prompt || resultItem.data.altText;
                    }
                    if (type === 'lesson-plan' && resultItem.data.essentialQuestion && !lessonDNA.essentialQuestion) {
                        lessonDNA.essentialQuestion = resultItem.data.essentialQuestion;
                    }
                }
            }
            if (!isLast && !(_fullPackSignal && _fullPackSignal.aborted)) await _waitForFullPackDelay(800, _fullPackSignal);
        }
        }
        setPersistedLessonDNA(lessonDNA);
        const _fullPackStopped = !!(_fullPackSignal && _fullPackSignal.aborted);
        if (_fullPackStopped) {
            updateFullPackRun(prev => Object.assign({}, prev, {
                status: 'stopped',
                resources: _markQueuedFullPackResourcesStopped(prev.resources),
                finishedAt: new Date().toISOString(),
                elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt),
            }));
            if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: 'stopped' });
            addToast('Full Pack generation stopped. Finished resources were kept.', 'info');
        } else if (fullPackFailures.length > 0) {
            const failedTypes = fullPackFailures.map(f => f.type).join(', ');
            const partialMessage = `Full Pack finished with ${fullPackFailures.length} failed resource${fullPackFailures.length === 1 ? '' : 's'}: ${failedTypes}. See Diagnostics & Logs for details.`;
            updateFullPackRun(prev => Object.assign({}, prev, { status: 'partial', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt), failureCount: fullPackFailures.length }));
            warnLog('[FullPack] completed with failures=' + fullPackFailures.length + ' types=' + failedTypes);
            if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: 'partial' });
            addToast(partialMessage, "warning");
        } else {
            const retainedPermanentFailures = !!(_retryRun && Object.values(_retryRun.resources || {})
                .some(resource => {
                    const variants = Array.isArray(resource && resource.generationVariants)
                        ? resource.generationVariants : [];
                    return variants.length
                        ? variants.some(variant => variant
                            && _FULL_PACK_RETRYABLE_STATUSES.has(variant.status || 'planned')
                            && variant.retryable === false)
                        : _fullPackResourceHasUnresolvedWork(resource) && resource.retryable === false;
                }));
            updateFullPackRun(prev => {
                const unresolved = Object.values(prev.resources || {}).filter(_fullPackResourceHasUnresolvedWork);
                return Object.assign({}, prev, {
                    status: unresolved.length ? 'partial' : 'completed',
                    failureCount: unresolved.length || 0,
                    finishedAt: new Date().toISOString(),
                    elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt),
                });
            });
            if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', {
                status: retainedPermanentFailures ? 'partial' : 'completed'
            });
            addToast(retainedPermanentFailures
                ? 'Retry finished. Permanently failed resources were preserved for review.'
                : t('process.pack_complete'), retainedPermanentFailures ? 'warning' : "success");
        }
    } catch (e) {
        if (_isFullPackAbort(e, _fullPackSignal)) {
            updateFullPackRun(prev => Object.assign({}, prev, {
                status: 'stopped',
                resources: _markQueuedFullPackResourcesStopped(prev.resources),
                finishedAt: new Date().toISOString(),
                elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt),
            }));
            if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: 'stopped' });
            addToast('Full Pack generation stopped. Finished resources were kept.', 'info');
        } else {
            updateFullPackRun(prev => Object.assign({}, prev, { status: 'failed', finishedAt: new Date().toISOString(), elapsedMs: Math.max(0, Date.now() - _fullPackStartedAt), reason: (e && (e.message || e.name)) || String(e) }));
            recordFullPackFailure({ type: 'run', index: 0, reason: (e && (e.message || e.name)) || String(e), error: e, sourceTextChars: batchSourceText ? batchSourceText.length : 0 });
            if (_recordTopLevelMetrics) _recordFullPackMetric('run-finish', { status: 'failed' });
            setError(t('errors.default_desc'));
            addToast(t('errors.default_desc'), "error");
        }
    } finally {
        setIsProcessing(false);
        if (_fullPackAbortCtl === _fullPackRunAbortCtl) _fullPackAbortCtl = null;
        if (_ownsFullPackAbort) _fullPackRunInFlight = false;
    }
    return true;
};

const handleComplexityAdjustment = async (deps) => {
  const { complexityLevel, generatedContent, gradeLevel, leveledTextLanguage, translationMode, resolveTranslationPolicy, currentUiLanguage, standardsContext, standardsInput, targetStandards, saveOriginalOnAdjust, generatedTerms, setIsProcessing, setGeneratedContent, setHistory, setError, setComplexityLevel, setWordSoundsCustomTerms, setWsPreloadedWords, callGemini, cleanJson, addToast, t, warnLog, extractSourceTextForProcessing, generateBilingualText, getDefaultTitle, calculateReadability } = deps;
  const contextModule = typeof window !== 'undefined' && window.AlloModules
    ? window.AlloModules.InstructionalContext
    : null;
  const artifactContext = contextModule && typeof contextModule.resolveArtifactContext === 'function'
    ? contextModule.resolveArtifactContext(generatedContent, {
        grade: gradeLevel,
        language: leveledTextLanguage,
        standardsContext: standardsContext || null,
        standards: standardsInput || targetStandards || null
      })
    : {
        grade: generatedContent?.instructionalText?.complexity?.requestedGrade
          || generatedContent?.targetGradeLevel
          || generatedContent?.config?.grade
          || gradeLevel,
        language: generatedContent?.instructionalText?.complexity?.language
          || generatedContent?.config?.language
          || leveledTextLanguage
          || 'English',
        standards: generatedContent?.config?.standardsContext
          || generatedContent?.config?.standards
          || standardsContext
          || standardsInput
          || targetStandards
          || null,
        instructionalText: generatedContent?.instructionalText || null
      };
  const effectiveGrade = artifactContext.grade || gradeLevel;
  const effectiveLanguage = artifactContext.language || leveledTextLanguage || 'English';
  const standardsValue = artifactContext.standards;
  const standardsForPrompt = (() => {
    if (!standardsValue) return '';
    if (typeof standardsValue === 'string') return standardsValue.trim();
    if (typeof standardsValue.promptText === 'string' && standardsValue.promptText.trim()) return standardsValue.promptText.trim();
    const entries = Array.isArray(standardsValue.standards) ? standardsValue.standards : (Array.isArray(standardsValue) ? standardsValue : []);
    return entries.map(entry => typeof entry === 'string'
      ? entry
      : [entry?.code || entry?.id, entry?.text || entry?.label].filter(Boolean).join(': ')
    ).filter(Boolean).join('; ');
  })().slice(0, 2400);
  const standardsDirective = standardsForPrompt
    ? `Standards context to preserve: ${standardsForPrompt}\nDo not lower or replace the concepts, disciplinary content, or cognitive demand required by these standards.`
    : '';
  const assessmentStandardsDirective = standardsForPrompt
    ? `Standards context to retain: ${standardsForPrompt}\nKeep assessing the same standard-aligned content. This educator-requested difficulty adjustment may change item DOK, but it must not silently switch the skill or content being assessed.`
    : '';
  // Resolved once from the host-threaded policy. Falls back to the historical
  // rule (gloss into English when the content is not English) if an older host
  // has not threaded the resolver yet, so a stale CDN never silently changes
  // what teachers get.
  const resolvedTranslationPolicy = (typeof resolveTranslationPolicy === 'function')
    ? resolveTranslationPolicy(translationMode, effectiveLanguage, currentUiLanguage)
    : { enabled: !!effectiveLanguage && effectiveLanguage !== 'English' && effectiveLanguage !== 'All Selected Languages', target: 'English', mode: 'auto' };
  const artifactIsBilingual = generatedContent?.type === 'simplified'
    && typeof generatedContent?.data === 'string'
    && /---\s*ENGLISH TRANSLATION\s*---/i.test(generatedContent.data);
  // A rewrite of an already bilingual artifact must remain bilingual even if
  // the teacher has since changed the ambient translation toggle. The content
  // itself is the durable language snapshot for legacy artifacts that predate
  // an explicit translation-policy field.
  const _xlate = artifactIsBilingual
    ? { ...resolvedTranslationPolicy, enabled: true, target: 'English', mode: 'artifact-preserve' }
    : resolvedTranslationPolicy;
  try { if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] handleComplexityAdjustment fired"); } catch(_) {}
    const supportedTypes = ['simplified', 'quiz', 'sentence-frames', 'glossary'];
    if (complexityLevel === 5 || !generatedContent || !supportedTypes.includes(generatedContent.type)) return;
    setIsProcessing(true);
    try {
        const isSimpler = complexityLevel < 5;
        const intensity = Math.abs(complexityLevel - 5);
        const splitReferenceTrailer = (value) => {
            const helpers = typeof window !== 'undefined' && window.AlloModules;
            const shared = helpers?.TextPipelineHelpers?.splitReferencesFromBody;
            const dispatcherSplit = helpers?.GenDispatcher?.splitAdaptationReferences;
            try {
                if (typeof shared === 'function') return shared(String(value || ''));
                if (typeof dispatcherSplit === 'function') return dispatcherSplit(String(value || ''));
            } catch (_) {}
            return { body: String(value || ''), references: '' };
        };
        const validateCitationsInOrder = (original, candidate) => {
            const helpers = typeof window !== 'undefined' && window.AlloModules;
            const dispatcherValidate = helpers?.GenDispatcher?.validateAdaptationCitationConservation;
            if (typeof dispatcherValidate === 'function') {
                return dispatcherValidate(original, candidate);
            }
            const pipeline = helpers?.TextPipelineHelpers;
            const hasPipelineValidator = typeof pipeline?.validateCitationConservation === 'function';
            const hasPipelineLedger = typeof pipeline?.extractCitationLedger === 'function';
            const citationShaped = /\[⁽[⁰¹²³⁴⁵⁶⁷⁸⁹]+⁾\]\(/.test(`${original}\n${candidate}`);
            if ((!hasPipelineValidator || !hasPipelineLedger) && citationShaped) {
                return {
                    valid: false,
                    ok: false,
                    reason: 'citation-validator-unavailable',
                    beforeCount: null,
                    afterCount: null,
                    orderChanged: false
                };
            }
            if (!hasPipelineValidator || !hasPipelineLedger) {
                return { valid: true, ok: true, beforeCount: 0, afterCount: 0, orderChanged: false };
            }
            const sharedResult = pipeline.validateCitationConservation(original, candidate);
            const originalOccurrences = pipeline.extractCitationLedger(original).occurrences || [];
            const candidateOccurrences = pipeline.extractCitationLedger(candidate).occurrences || [];
            const orderChanged = originalOccurrences.length !== candidateOccurrences.length
                || originalOccurrences.some((entry, index) => entry.key !== candidateOccurrences[index]?.key);
            return {
                ...sharedResult,
                valid: !!sharedResult.valid && !orderChanged,
                orderChanged,
                beforeCount: originalOccurrences.length,
                afterCount: candidateOccurrences.length
            };
        };
        let prompt = '';
        let jsonMode = false;
        let simplifiedCitationContext = null;
        let complexityCitationAudit = null;
        if (generatedContent.type === 'simplified') {
            const rawText = typeof generatedContent?.data === 'string' ? generatedContent?.data : '';
            const referenceParts = splitReferenceTrailer(rawText);
            const sourceExtraction = extractSourceTextForProcessing(referenceParts.body, false);
            const currentText = sourceExtraction.text;
            simplifiedCitationContext = {
                sourceBody: referenceParts.body,
                sourceTarget: currentText,
                references: referenceParts.references || '',
                wasBilingual: !!sourceExtraction.isBilingual
            };
            const direction = isSimpler ? "Simpler / Easier to read" : "More Complex / Academic / Rigorous";
            prompt = `
                Rewrite the following educational text.
                Goal: Make the text ${direction} relative to its current version.
                Intensity of Change: ${intensity} out of 5 (1=Slight adjustment, 5=Major revision).
                Target Audience: ${effectiveGrade} students.
                ${standardsDirective}
                Instructions:
                - Keep the same topic and core information.
                - ${isSimpler ? "Shorten sentences, reduce vocabulary difficulty, focus on clarity." : "Increase sentence variety, use more precise academic vocabulary, add nuance."}
                - Write the rewritten text in ${effectiveLanguage}.
                - Preserve every inline citation exactly, including its superscript number, URL, occurrence count, and order.
                - Do not produce a Sources, References, Bibliography, or Works Cited section; AlloFlow appends the preserved reference trailer after validation.
                Current Text:
                "${currentText}"
            `;
        }
        else if (generatedContent.type === 'glossary') {
            jsonMode = true;
            const cleanGlossary = generatedContent?.data.map(({ image, ...rest }) => rest);
            const currentData = JSON.stringify(cleanGlossary);
            const direction = isSimpler ? "Simpler definitions / Basic vocabulary" : "More detailed / Academic definitions";
            prompt = `
                Rewrite the definitions in the following glossary to adjust their complexity.
                Goal: Make definitions ${direction}.
                Intensity: ${intensity} out of 5.
                Target Audience: ${effectiveGrade} students.
                ${standardsDirective}
                Current Glossary: ${currentData}
                Instructions:
                - Keep the exact same terms.
                - ${isSimpler ? "Simplify definitions to be very short and use common words." : "Expand definitions with more precise academic language and context."}
                - Maintain the exact JSON structure (Array of objects).
                - IMPORTANT: If translations exist, adjust them to match the new complexity level of the English definition.
                Return ONLY JSON matching the input structure exactly.
            `;
        }
        else if (generatedContent.type === 'quiz') {
            jsonMode = true;
            const currentQuestions = JSON.stringify(generatedContent?.data.questions);
            const direction = isSimpler ? "Easier / Lower DOK" : "Harder / Higher DOK";
            prompt = `
                Rewrite the following quiz questions to adjust their difficulty level.
                Goal: Make questions ${direction}.
                Intensity: ${intensity} out of 5.
                Target Audience: ${effectiveGrade} students.
                ${assessmentStandardsDirective}
                Current Questions: ${currentQuestions}
                Instructions:
                - ${isSimpler ? "Simplify vocabulary, focus on direct recall (DOK 1), ensure distractors are clearly incorrect/distinct." : "Increase vocabulary rigor, focus on inference/analysis (DOK 2-3), make distractors more plausible to test deep understanding."}
                - Keep the same number of questions.
                - Maintain the exact JSON structure.
                ${_xlate.enabled ? `Ensure the ${_xlate.target} translations (suffix _en) match the new difficulty.` : 'Do NOT add translation fields.'}
                Return ONLY JSON: { "questions": [...] }
            `;
        }
        else if (generatedContent.type === 'sentence-frames') {
            jsonMode = true;
            const currentData = JSON.stringify(generatedContent?.data);
            const direction = isSimpler ? "More Supportive (Heavy Scaffolding)" : "Less Supportive (Open-ended)";
            prompt = `
                Modify the following writing scaffolds.
                Goal: Provide ${direction}.
                Intensity: ${intensity} out of 5.
                Target Audience: ${effectiveGrade} students.
                ${standardsDirective}
                Current Scaffolds: ${currentData}
                Instructions:
                - ${isSimpler ? "Provide longer sentence starters, include specific prompts/clues within the blanks, guide the student's thought process rigidly." : "Shorten starters to just the first word or phrase, remove internal clues, allow for more independent critical thinking."}
                - Maintain the existing format (List or Paragraph Frame).
                ${effectiveLanguage !== 'English' ? `Ensure translations match the new structure.` : ''}
                Return ONLY JSON matching the input structure exactly.
            `;
        }
        let result = (!jsonMode && generatedContent.type === 'simplified')
            ? await generateBilingualText(prompt, effectiveLanguage, callGemini, _xlate)
            : await callGemini(prompt, jsonMode);
        if (generatedContent.type === 'simplified' && simplifiedCitationContext) {
            const candidateParts = splitReferenceTrailer(result);
            const candidateBody = candidateParts.body.trim();
            const candidateExtraction = extractSourceTextForProcessing(candidateBody, false);
            const candidateTarget = candidateExtraction.targetLangBlock || candidateExtraction.text;
            const originalForValidation = simplifiedCitationContext.wasBilingual
                ? simplifiedCitationContext.sourceBody
                : simplifiedCitationContext.sourceTarget;
            const candidateForValidation = simplifiedCitationContext.wasBilingual
                ? candidateBody
                : candidateTarget;
            let conservation = validateCitationsInOrder(originalForValidation, candidateForValidation);
            const shouldValidateGeneratedEnglish = !simplifiedCitationContext.wasBilingual
                && (candidateExtraction.isBilingual || String(effectiveLanguage || '').trim().toLowerCase() !== 'english');
            if (shouldValidateGeneratedEnglish) {
                const englishConservation = validateCitationsInOrder(
                    candidateTarget,
                    candidateExtraction.isBilingual ? candidateExtraction.englishBlock : ''
                );
                conservation = {
                    ...conservation,
                    valid: !!conservation.valid && !!englishConservation.valid,
                    ok: !!conservation.valid && !!englishConservation.valid,
                    beforeCount: Number(conservation.beforeCount || 0) + Number(englishConservation.beforeCount || 0),
                    afterCount: Number(conservation.afterCount || 0) + Number(englishConservation.afterCount || 0),
                    orderChanged: !!conservation.orderChanged || !!englishConservation.orderChanged,
                    english: englishConservation
                };
            }
            complexityCitationAudit = {
                stage: 'complexity-adjustment',
                valid: !!conservation.valid,
                beforeCount: Number(conservation.beforeCount ?? conservation.originalLedger?.occurrences?.length ?? 0),
                afterCount: Number(conservation.afterCount ?? conservation.candidateLedger?.occurrences?.length ?? 0),
                orderChanged: !!conservation.orderChanged
            };
            if (!conservation.valid) {
                const citationError = new Error('Complexity adjustment changed source citations.');
                citationError.code = 'citation-conservation-failed';
                citationError.details = conservation;
                throw citationError;
            }
            result = [
                candidateBody,
                simplifiedCitationContext.references
            ].filter(Boolean).join('\n\n');
        }
        let updatedData;
        if (jsonMode) {
            const parsed = JSON.parse(cleanJson(result));
            if (generatedContent.type === 'quiz') {
                updatedData = { ...generatedContent?.data, questions: parsed.questions };
            } else if (generatedContent.type === 'glossary') {
                updatedData = parsed.map((item, index) => {
                    const originalItem = generatedContent?.data.find(o => o.term === item.term) || generatedContent?.data[index];
                    return {
                        ...item,
                        image: originalItem?.image,
                        isSelected: originalItem?.isSelected
                    };
                });
            } else {
                updatedData = { ...generatedContent?.data, ...parsed };
            }
        } else {
            updatedData = result;
        }
        const changeLabel = generatedContent.type === 'sentence-frames'
            ? (isSimpler ? 'More Support' : 'Less Support')
            : (isSimpler ? 'Adapted' : 'Increased Rigor');
        const priorConfig = generatedContent.config && typeof generatedContent.config === 'object'
            ? generatedContent.config
            : {};
        const priorAudit = priorConfig.citationAudit && typeof priorConfig.citationAudit === 'object'
            ? priorConfig.citationAudit
            : null;
        const adjustedConfig = {
            ...priorConfig,
            ...(complexityCitationAudit ? {
                citationAudit: {
                    ...(priorAudit || {
                        version: 1,
                        policy: 'exact-marker-order',
                        enabled: complexityCitationAudit.beforeCount > 0,
                        status: 'valid',
                        fallbackCount: 0
                    }),
                    stages: [...(Array.isArray(priorAudit?.stages) ? priorAudit.stages : []), complexityCitationAudit]
                }
            } : {})
        };
        const refreshSimplifiedComplexity = (item) => {
            if (!item) return item;
            if (item.type !== 'simplified' || typeof item.data !== 'string') {
                const invalidatedItem = { ...item };
                if (invalidatedItem.levelCheck) delete invalidatedItem.levelCheck;
                if (invalidatedItem.alignmentCheck) delete invalidatedItem.alignmentCheck;
                return invalidatedItem;
            }
            const exactContent = item.data;
            const bodyParts = splitReferenceTrailer(exactContent);
            const extracted = extractSourceTextForProcessing(bodyParts.body, false);
            const bilingual = !!extracted?.isBilingual
                || /---\s*ENGLISH TRANSLATION\s*---/i.test(bodyParts.body)
                || /---\s*TRANSLATION\s*---/i.test(bodyParts.body);
            const englishLanguage = contextModule && typeof contextModule.isEnglishLanguage === 'function'
                ? contextModule.isEnglishLanguage(effectiveLanguage)
                : /^(?:english|en)$/i.test(String(effectiveLanguage || '').trim());
            const canMeasure = !bilingual && englishLanguage && typeof calculateReadability === 'function';
            let measuredStats = null;
            if (canMeasure) {
                try { measuredStats = calculateReadability(extracted?.text || bodyParts.body); } catch (_) { measuredStats = null; }
            }
            const baseInstructionalText = contextModule && typeof contextModule.getInstructionalText === 'function'
                ? contextModule.getInstructionalText(item, {
                    complexity: { requestedGrade: effectiveGrade, language: effectiveLanguage }
                })
                : (item.instructionalText || artifactContext.instructionalText || {
                    role: 'unspecified',
                    form: 'adapted',
                    designationSource: 'legacy-inferred',
                    complexity: { requestedGrade: effectiveGrade, language: effectiveLanguage }
                });
            const fallbackFingerprint = (value) => {
                const input = String(value == null ? '' : value).replace(/\r\n?/g, '\n');
                let hash = 2166136261;
                for (let index = 0; index < input.length; index++) {
                    hash ^= input.charCodeAt(index);
                    hash = Math.imul(hash, 16777619);
                }
                return `txt-${(hash >>> 0).toString(16).padStart(8, '0')}-${input.length}`;
            };
            const fingerprint = contextModule && typeof contextModule.fingerprintText === 'function'
                ? contextModule.fingerprintText(exactContent)
                : fallbackFingerprint(exactContent);
            let instructionalText;
            if (measuredStats && contextModule && typeof contextModule.withComplexityEvidence === 'function') {
                instructionalText = contextModule.withComplexityEvidence(baseInstructionalText, {
                    requestedGrade: effectiveGrade,
                    measuredGrade: Number(measuredStats.score),
                    method: 'flesch-kincaid-en',
                    language: effectiveLanguage
                }, exactContent);
            } else if (contextModule && typeof contextModule.invalidateComplexityEvidence === 'function') {
                instructionalText = contextModule.invalidateComplexityEvidence(
                    baseInstructionalText,
                    exactContent,
                    canMeasure ? 'unavailable' : 'not-applicable'
                );
            } else {
                instructionalText = {
                    ...baseInstructionalText,
                    complexity: {
                        ...(baseInstructionalText?.complexity || {}),
                        requestedGrade: effectiveGrade,
                        measuredGrade: measuredStats ? Number(measuredStats.score) : null,
                        method: measuredStats ? 'flesch-kincaid-en' : '',
                        status: measuredStats ? 'measured' : (canMeasure ? 'unavailable' : 'not-applicable'),
                        contentFingerprint: fingerprint,
                        measuredAt: measuredStats ? new Date().toISOString() : '',
                        language: effectiveLanguage
                    }
                };
            }
            const freshItem = {
                ...item,
                instructionalText,
                targetGradeLevel: effectiveGrade,
                ...(measuredStats ? { localStats: measuredStats } : {})
            };
            if (!measuredStats && freshItem.localStats) delete freshItem.localStats;
            if (freshItem.levelCheck) delete freshItem.levelCheck;
            if (freshItem.alignmentCheck) delete freshItem.alignmentCheck;
            return freshItem;
        };
        if (saveOriginalOnAdjust) {
            const newItem = refreshSimplifiedComplexity({
                ...generatedContent,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                data: updatedData,
                title: `${generatedContent.title || getDefaultTitle(generatedContent.type)} (${changeLabel})`,
                timestamp: new Date(),
                config: adjustedConfig
            });
            setGeneratedContent(newItem); setWordSoundsCustomTerms(generatedTerms); setWsPreloadedWords(generatedTerms);
            setHistory(prev => [...prev, newItem]);
            addToast(t('toasts.saved_new_version', { label: changeLabel }), "success");
        } else {
            const updatedContent = refreshSimplifiedComplexity({ ...generatedContent, data: updatedData, config: adjustedConfig });
            setGeneratedContent(updatedContent);
            setHistory(prev => prev.map(item => item.id === generatedContent.id ? updatedContent : item));
            addToast(t('toasts.adjusted_version', { label: changeLabel }), "success");
        }
    } catch (err) {
        if (err?.code === 'citation-conservation-failed') {
            warnLog('[CitationConservation] Complexity adjustment rejected; original resource retained.', err.details || err);
            addToast('The adjustment changed a source citation, so the original citation-safe version was retained.', 'warning');
            return;
        }
        warnLog("Unhandled error:", err);
        setError(t('errors.complexity_adjustment_failed'));
        addToast(t('toasts.adjustment_failed'), "error");
    } finally {
        setIsProcessing(false);
        setComplexityLevel(5);
    }
};

const _waitForGenerationMatrixReady = async (deps = {}) => {
  if (_getGenerationMatrixModule()) return true;
  try {
    if (typeof window !== 'undefined' && typeof window.__alloRetryModule === 'function') {
      window.__alloRetryModule('GenerationMatrix');
    }
  } catch (_) {}
  const requestedTimeout = Number(deps.generationMatrixWaitMs);
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(0, Math.min(30000, requestedTimeout))
    : 30000;
  return new Promise(resolve => {
    let settled = false;
    let timer = null;
    let poller = null;
    const finish = value => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (poller) clearInterval(poller);
      try { window.removeEventListener('alloflow:module-registry-changed', check); } catch (_) {}
      resolve(value);
    };
    const check = () => { if (_getGenerationMatrixModule()) finish(true); };
    try { window.addEventListener('alloflow:module-registry-changed', check); } catch (_) {}
    poller = setInterval(check, 100);
    timer = setTimeout(() => finish(Boolean(_getGenerationMatrixModule())), timeoutMs);
    check();
  });
};

const handlePlanFullPack = async (deps) => {
  if (!_getGenerationMatrixModule()) {
    try {
      if (deps && typeof deps.addToast === 'function') deps.addToast(
        'The generation engine is finishing loading. Full Pack planning will start automatically when it is ready.',
        'info'
      );
    } catch (_) {}
    const ready = await _waitForGenerationMatrixReady(deps || {});
    if (!ready) {
      try {
        if (deps && typeof deps.setIsProcessing === 'function') deps.setIsProcessing(false);
        if (deps && typeof deps.addToast === 'function') deps.addToast(
          'The generation engine could not finish loading. No resources were started; retry the failed module, then plan the pack again.',
          'warning'
        );
      } catch (_) {}
      return false;
    }
  }
  return handleGenerateFullPack({ __fullPackPreflightOnly: true }, deps);
};

// Pure ready-plan edits used by the Full Pack review UI. The approved path
// executes preflight.selected, so these edits are authoritative rather than
// cosmetic. Every operation returns the original object for invalid/no-op
// requests and never mutates the reviewed run or its nested plan records.
const _fullPackPlanItemKey = (item, index) => String(
  item && (item.uiId || (String(item.type || 'resource') + '-' + index)) || ''
);
const _fullPackPlanDirective = (value) => String(value == null ? '' : value).slice(0, 4000);

const _fullPackPlanContextOptions = (record) => {
  const payloadContext = record && record.planPayload && record.planPayload.instructionalContext;
  const snapshot = record && record.settingsSnapshot || {};
  const context = payloadContext || snapshot.instructionalContext || {};
  return {
    gradeLevel: context.instructionalGrade || snapshot.gradeLevel || '',
    language: snapshot.leveledTextLanguage || 'English',
  };
};

const _nextFullPackPlanUiId = (selected, type, requestedUiId = '') => {
  const used = new Set((Array.isArray(selected) ? selected : [])
    .map((item, index) => _fullPackPlanItemKey(item, index)).filter(Boolean));
  const requested = String(requestedUiId || '').trim();
  if (requested && !used.has(requested)) return requested;
  const base = String(type || 'resource').replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'resource';
  let suffix = 0;
  while (used.has(base + '-' + suffix)) suffix += 1;
  return base + '-' + suffix;
};

const _safeFullPackPlanInstructionalText = (type, raw, options = {}, resetForType = false, educatorAdaptation = false) => {
  const normalized = _fullPackInstructionalText(type, resetForType ? null : _cloneFullPackValue(raw), options);
  const isAdapted = type === 'simplified' || (normalized && normalized.form === 'adapted');
  if (isAdapted) {
    return Object.assign({}, normalized, {
      role: 'supplemental',
      form: 'adapted',
      designationSource: educatorAdaptation ? 'educator' : (normalized.designationSource || 'workflow-default'),
      replacementAuthorization: { authorized: false, source: 'none' },
    });
  }
  if (resetForType) {
    return Object.assign({}, normalized, {
      role: type === 'analysis' ? 'primary' : 'unspecified',
      form: 'original',
      designationSource: 'workflow-default',
      replacementAuthorization: { authorized: false, source: 'none' },
    });
  }
  return normalized;
};

const _normalizeFullPackPlanRows = (record, rows) => {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const used = new Set();
  const contextOptions = _fullPackPlanContextOptions(record);
  return sourceRows.map((raw, index) => {
    const row = raw && typeof raw === 'object' ? raw : {};
    const type = String(row.type || '').trim();
    let uiId = String(row.uiId || '').trim();
    if (!uiId || used.has(uiId)) {
      uiId = _nextFullPackPlanUiId(
        Array.from(used).map(id => ({ uiId: id })),
        type,
        ''
      );
    }
    used.add(uiId);
    const normalizedRow = Object.assign({}, row, {
      type,
      uiId,
      index,
    });
    if (Object.prototype.hasOwnProperty.call(row, 'directive')) normalizedRow.directive = _fullPackPlanDirective(row.directive);
    // Legacy ready plans may not yet carry instructionalText on ordinary
    // resources. Preserve that compact shape, while always stamping adapted
    // rows because their supplemental/non-replacement status is an invariant.
    if (type === 'simplified' || row.instructionalText) {
      normalizedRow.instructionalText = _safeFullPackPlanInstructionalText(type, row.instructionalText, contextOptions);
    }
    return normalizedRow;
  });
};

const _recalculateFullPackPlan = (record, rows, skipped = null) => {
  const preflight = record.preflight || {};
  let selected = _normalizeFullPackPlanRows(record, rows);
  const matrixEnvelope = preflight.generationMatrix && typeof preflight.generationMatrix === 'object'
    ? preflight.generationMatrix : null;
  let matrixSummary = null;
  let matrixSkipped = [];
  let resolvedMatrixSettings = null;
  if (matrixEnvelope && matrixEnvelope.settings && _getGenerationMatrixModule()) {
    const resolution = _resolveFullPackPlanRows(selected, Object.assign({}, matrixEnvelope.settings, {
      settings: matrixEnvelope.settings,
      existingArtifacts: Array.isArray(matrixEnvelope.artifacts) ? matrixEnvelope.artifacts : [],
      allowVariants: true,
      translationMode: matrixEnvelope.translation?.mode || matrixEnvelope.settings.translationMode,
      currentUiLanguage: matrixEnvelope.translation?.currentUiLanguage || matrixEnvelope.settings.currentUiLanguage,
      translationTarget: matrixEnvelope.translation?.target || matrixEnvelope.settings.translationTarget,
    }));
    selected = _normalizeFullPackPlanRows(record, resolution.rows).map(item => Object.assign({}, item, {
      providerWorkEstimate: _estimateFullPackRowProviderWork(item, resolution.settings || matrixEnvelope.settings),
    }));
    resolvedMatrixSettings = resolution.settings || matrixEnvelope.settings;
    matrixSummary = Object.assign(
      {},
      resolution.summary || {},
      _summarizeFullPackMatrixRows(selected, resolvedMatrixSettings)
    );
    matrixSkipped = (Array.isArray(resolution.skipped) ? resolution.skipped : [])
      .map(item => Object.assign({}, item, { matrixPolicy: true }));
  }
  if (!matrixSummary) {
    const diff = preflight.differentiation || {};
    const diffTypes = new Set(Array.isArray(diff.types) ? diff.types : []);
    const levelCount = Math.max(1, Number(diff.levelCount) || 1);
    const estimationRows = selected.map(item => {
      if (Array.isArray(item.generationVariants) && item.generationVariants.length > 0) return item;
      const count = diffTypes.has(item.type) ? levelCount : 1;
      return Object.assign({}, item, {
        generationVariants: Array.from({ length: count }, () => ({ action: item.generationAction || 'generate' })),
      });
    });
    selected = selected.map((item, index) => Object.assign({}, item, {
      providerWorkEstimate: _estimateFullPackRowProviderWork(estimationRows[index], matrixEnvelope?.settings || {}),
    }));
    matrixSummary = _summarizeFullPackMatrixRows(estimationRows, matrixEnvelope?.settings || {});
  }
  const resourceCalls = Math.max(0, Number(matrixSummary.expectedCalls) || 0);
  const aiCalls = Math.max(resourceCalls, Number(matrixSummary.providerCalls) || 0);
  const imageCalls = Math.max(0, Number(matrixSummary.imageCalls) || 0);
  const priorCapacity = preflight.capacity || {};
  const capacity = _estimateFullPackCapacity(aiCalls, imageCalls, {
    backend: priorCapacity.provider,
    model: priorCapacity.model,
    imageProvider: priorCapacity.imageProvider,
    imageModel: priorCapacity.imageModel,
    isLocal: priorCapacity.isLocal,
  }, {
    resourceCalls,
    glossaryImageCalls: matrixSummary.glossaryImageCalls,
    imageEditCalls: matrixSummary.glossaryImageEditCalls,
    requestConcurrency: matrixSummary.maxRequestConcurrency,
  });
  const priorSkipped = skipped === null
    ? (Array.isArray(preflight.skipped) ? preflight.skipped : [])
    : (Array.isArray(skipped) ? skipped : []);
  const nextSkipped = priorSkipped.filter(item => !(item && item.matrixPolicy)).concat(matrixSkipped);
  return Object.assign({}, record, {
    preflight: Object.assign({}, preflight, {
      selected,
      skipped: nextSkipped,
      generationMatrix: matrixEnvelope ? Object.assign({}, matrixEnvelope, {
        settings: _cloneFullPackValue(resolvedMatrixSettings || matrixEnvelope.settings),
        summary: _cloneFullPackValue(matrixSummary),
      }) : preflight.generationMatrix,
      estimatedResourceGenerations: resourceCalls,
      estimatedProviderCalls: aiCalls,
      capacity,
    }),
  });
};

const _setFullPackRecordPrimaryTextPolicy = (record, policy) => {
  const normalizedPolicy = policy === 'educator-directed' ? 'educator-directed' : 'preserve-primary';
  const payload = record.planPayload && typeof record.planPayload === 'object' ? record.planPayload : {};
  const snapshot = record.settingsSnapshot && typeof record.settingsSnapshot === 'object' ? record.settingsSnapshot : {};
  const existingContext = payload.instructionalContext || snapshot.instructionalContext || {};
  const instructionalContext = Object.assign({}, existingContext, {
    schemaVersion: Number(existingContext.schemaVersion) || 1,
    primaryTextPolicy: normalizedPolicy,
  });
  return Object.assign({}, record, {
    planPayload: Object.assign({}, payload, { instructionalContext: _cloneFullPackValue(instructionalContext) }),
    settingsSnapshot: Object.assign({}, snapshot, { instructionalContext: _cloneFullPackValue(instructionalContext) }),
    preflight: Object.assign({}, record.preflight || {}, { primaryTextPolicy: normalizedPolicy }),
  });
};

const _setFullPackRecordAdaptedTextPolicy = (record, policy, decisionSource = 'educator') => {
  const normalizedPolicy = ['include', 'omit', 'prohibited'].includes(policy) ? policy : 'include';
  const payload = record.planPayload && typeof record.planPayload === 'object' ? record.planPayload : {};
  const snapshot = record.settingsSnapshot && typeof record.settingsSnapshot === 'object' ? record.settingsSnapshot : {};
  const existingContext = payload.instructionalContext || snapshot.instructionalContext || {};
  const instructionalContext = Object.assign({}, existingContext, {
    schemaVersion: Number(existingContext.schemaVersion) || 1,
    adaptedTextPolicy: normalizedPolicy,
    adaptedTextPolicySource: normalizedPolicy === 'prohibited' ? 'standard' : decisionSource,
    textAccessReason: normalizedPolicy === 'prohibited'
      ? 'sourced-adaptation-prohibition'
      : 'educator-choice',
  });
  return Object.assign({}, record, {
    planPayload: Object.assign({}, payload, { instructionalContext: _cloneFullPackValue(instructionalContext) }),
    settingsSnapshot: Object.assign({}, snapshot, { instructionalContext: _cloneFullPackValue(instructionalContext) }),
    preflight: Object.assign({}, record.preflight || {}, { adaptedTextPolicy: normalizedPolicy }),
  });
};

const _getFullPackReadyPlanTarget = (priorRun, groupId, editRecord) => {
  const run = priorRun && typeof priorRun === 'object' ? priorRun : null;
  if (!run || run.status !== 'ready' || typeof editRecord !== 'function') return run;
  const hasGroupId = groupId !== null && groupId !== undefined && String(groupId) !== '';
  if (hasGroupId) {
    const gid = String(groupId);
    const group = run.groups && run.groups[gid];
    if (!group || group.status !== 'ready' || !group.preflight || !Array.isArray(group.preflight.selected)) return run;
    const updatedGroup = editRecord(group);
    if (!updatedGroup || updatedGroup === group) return run;
    return Object.assign({}, run, { groups: Object.assign({}, run.groups, { [gid]: updatedGroup }) });
  }
  if (!run.preflight || !Array.isArray(run.preflight.selected)) return run;
  return editRecord(run) || run;
};

const _syncFullPackPolicyToRows = (record, preferredPolicy = null) => {
  const rows = record.preflight && Array.isArray(record.preflight.selected) ? record.preflight.selected : [];
  const hasAdapted = rows.some(item => item && item.type === 'simplified');
  const context = record.planPayload && record.planPayload.instructionalContext
    || record.settingsSnapshot && record.settingsSnapshot.instructionalContext || {};
  if (context.adaptedTextPolicy === 'prohibited') return record;
  const policy = preferredPolicy || (hasAdapted ? 'include' : 'omit');
  if (context.adaptedTextPolicy === policy) return record;
  return _setFullPackRecordAdaptedTextPolicy(record, policy);
};

const addFullPackPlanResource = (priorRun, resource, groupId = null) => {
  const source = resource && typeof resource === 'object' ? resource : { type: resource };
  const type = String(source.type || source.tool || '').trim();
  if (!getFullPackEditableResourceTypes().includes(type)) return priorRun && typeof priorRun === 'object' ? priorRun : null;
  return _getFullPackReadyPlanTarget(priorRun, groupId, record => {
    const context = record.planPayload && record.planPayload.instructionalContext
      || record.settingsSnapshot && record.settingsSnapshot.instructionalContext || {};
    if (type === 'simplified' && context.adaptedTextPolicy === 'prohibited') return record;
    const rows = record.preflight.selected;
    const uiId = _nextFullPackPlanUiId(rows, type, source.uiId);
    const contextOptions = _fullPackPlanContextOptions(record);
    const added = Object.assign({}, source, {
      type,
      uiId,
      directive: _fullPackPlanDirective(source.directive),
      instructionalText: _safeFullPackPlanInstructionalText(
        type,
        source.instructionalText,
        contextOptions,
        !source.instructionalText,
        type === 'simplified'
      ),
    });
    let updated = _recalculateFullPackPlan(record, rows.concat(added));
    updated = _syncFullPackPolicyToRows(updated, type === 'simplified' ? 'include' : null);
    return updated;
  });
};

const removeFullPackPlanResource = (priorRun, resourceKey, groupId = null) => {
  const key = String(resourceKey || '');
  if (!key) return priorRun && typeof priorRun === 'object' ? priorRun : null;
  return _getFullPackReadyPlanTarget(priorRun, groupId, record => {
    const rows = record.preflight.selected;
    if (rows.length <= 1) return record;
    const removedIndex = rows.findIndex((item, index) => _fullPackPlanItemKey(item, index) === key);
    if (removedIndex < 0) return record;
    const removed = rows[removedIndex];
    const selected = rows.filter((_, index) => index !== removedIndex);
    if (selected.length === 0) return record;
    const skipped = (Array.isArray(record.preflight.skipped) ? record.preflight.skipped : []).concat({
      type: removed && removed.type || 'review',
      uiId: key,
      reason: 'Removed by educator during Full Pack review.',
    });
    return _syncFullPackPolicyToRows(_recalculateFullPackPlan(record, selected, skipped));
  });
};

const changeFullPackPlanResourceType = (priorRun, resourceKey, nextType, groupId = null) => {
  const key = String(resourceKey || '');
  const type = String(nextType || '').trim();
  if (!key || !getFullPackEditableResourceTypes().includes(type)) return priorRun && typeof priorRun === 'object' ? priorRun : null;
  return _getFullPackReadyPlanTarget(priorRun, groupId, record => {
    const rows = record.preflight.selected;
    const rowIndex = rows.findIndex((item, index) => _fullPackPlanItemKey(item, index) === key);
    if (rowIndex < 0) return record;
    const current = rows[rowIndex] || {};
    const context = record.planPayload && record.planPayload.instructionalContext
      || record.settingsSnapshot && record.settingsSnapshot.instructionalContext || {};
    if (type === 'simplified' && context.adaptedTextPolicy === 'prohibited') return record;
    if (current.type === type) {
      const safeRows = _normalizeFullPackPlanRows(record, rows);
      const same = JSON.stringify(safeRows) === JSON.stringify(rows);
      return same ? record : _syncFullPackPolicyToRows(_recalculateFullPackPlan(record, safeRows));
    }
    const contextOptions = _fullPackPlanContextOptions(record);
    const changed = Object.assign({}, current, {
      type,
      // uiId deliberately remains stable when the resource type changes.
      uiId: key,
      instructionalText: _safeFullPackPlanInstructionalText(type, null, contextOptions, true, type === 'simplified'),
    });
    const selected = rows.map((item, index) => index === rowIndex ? changed : item);
    let updated = _recalculateFullPackPlan(record, selected);
    updated = _syncFullPackPolicyToRows(updated, type === 'simplified' ? 'include' : null);
    return updated;
  });
};

const editFullPackPlanResourceDirective = (priorRun, resourceKey, directive, groupId = null) => {
  const key = String(resourceKey || '');
  const nextDirective = _fullPackPlanDirective(directive);
  if (!key) return priorRun && typeof priorRun === 'object' ? priorRun : null;
  return _getFullPackReadyPlanTarget(priorRun, groupId, record => {
    const rows = record.preflight.selected;
    const rowIndex = rows.findIndex((item, index) => _fullPackPlanItemKey(item, index) === key);
    if (rowIndex < 0) return record;
    const current = rows[rowIndex] || {};
    const safeText = _safeFullPackPlanInstructionalText(current.type, current.instructionalText, _fullPackPlanContextOptions(record));
    const textChanged = JSON.stringify(safeText) !== JSON.stringify(current.instructionalText || null);
    if (String(current.directive || '') === nextDirective && !textChanged) return record;
    const selected = rows.map((item, index) => index === rowIndex
      ? Object.assign({}, current, { directive: nextDirective, instructionalText: safeText })
      : item);
    return _syncFullPackPolicyToRows(_recalculateFullPackPlan(record, selected));
  });
};

const moveFullPackPlanResource = (priorRun, resourceKey, toIndex, groupId = null) => {
  const key = String(resourceKey || '');
  if (!key) return priorRun && typeof priorRun === 'object' ? priorRun : null;
  return _getFullPackReadyPlanTarget(priorRun, groupId, record => {
    const rows = record.preflight.selected;
    const fromIndex = rows.findIndex((item, index) => _fullPackPlanItemKey(item, index) === key);
    if (fromIndex < 0) return record;
    const requested = toIndex === 'up' ? fromIndex - 1 : (toIndex === 'down' ? fromIndex + 1 : Number(toIndex));
    if (!Number.isFinite(requested)) return record;
    const targetIndex = Math.max(0, Math.min(rows.length - 1, Math.trunc(requested)));
    if (targetIndex === fromIndex) return record;
    const selected = rows.slice();
    const [moved] = selected.splice(fromIndex, 1);
    selected.splice(targetIndex, 0, moved);
    return _syncFullPackPolicyToRows(_recalculateFullPackPlan(record, selected));
  });
};

const setFullPackPlanPrimaryTextPolicy = (priorRun, policy, groupId = null) => {
  if (!['preserve-primary', 'educator-directed'].includes(policy)) return priorRun && typeof priorRun === 'object' ? priorRun : null;
  return _getFullPackReadyPlanTarget(priorRun, groupId, record => {
    const existingPolicy = record.planPayload && record.planPayload.instructionalContext
      && record.planPayload.instructionalContext.primaryTextPolicy;
    if (existingPolicy === policy) return record;
    return _setFullPackRecordPrimaryTextPolicy(record, policy);
  });
};

const setFullPackPlanAdaptedTextPolicy = (priorRun, policy, groupId = null) => {
  if (!['include', 'omit', 'prohibited'].includes(policy)) return priorRun && typeof priorRun === 'object' ? priorRun : null;
  return _getFullPackReadyPlanTarget(priorRun, groupId, record => {
    const context = record.planPayload && record.planPayload.instructionalContext
      || record.settingsSnapshot && record.settingsSnapshot.instructionalContext || {};
    if (context.adaptedTextPolicy === 'prohibited' && policy !== 'prohibited') return record;
    const rows = record.preflight.selected;
    if (policy !== 'include') {
      const nonAdapted = rows.filter(item => item && item.type !== 'simplified');
      if (nonAdapted.length === 0) return record;
      const removed = rows.filter(item => item && item.type === 'simplified');
      if (removed.length === 0 && context.adaptedTextPolicy === policy) return record;
      const skipped = (Array.isArray(record.preflight.skipped) ? record.preflight.skipped : []).concat(
        removed.map((item, index) => ({
          type: 'simplified',
          uiId: _fullPackPlanItemKey(item, index),
          reason: policy === 'prohibited'
            ? 'Supplemental adapted text removed because a sourced standard prohibits adaptation.'
            : 'Supplemental adapted text omitted by educator choice.',
        }))
      );
      return _setFullPackRecordAdaptedTextPolicy(
        _recalculateFullPackPlan(record, nonAdapted, skipped), policy,
        policy === 'prohibited' ? 'standard' : 'educator'
      );
    }
    let selected = rows.slice();
    if (!selected.some(item => item && item.type === 'simplified')) {
      const type = 'simplified';
      const analysisIndex = selected.findIndex(item => item && item.type === 'analysis');
      const adapted = {
        type,
        uiId: _nextFullPackPlanUiId(selected, type),
        directive: 'Create a supplemental Adapted Text while keeping the analyzed primary text available.',
        instructionalText: _safeFullPackPlanInstructionalText(
          type, null, _fullPackPlanContextOptions(record), true, true
        ),
      };
      selected.splice(analysisIndex >= 0 ? analysisIndex + 1 : selected.length, 0, adapted);
    }
    const normalized = _recalculateFullPackPlan(record, selected);
    if (context.adaptedTextPolicy === 'include' && selected.length === rows.length
        && JSON.stringify(normalized.preflight.selected) === JSON.stringify(rows)) return record;
    return _setFullPackRecordAdaptedTextPolicy(normalized, 'include');
  });
};

const handleRemoveFullPackPlanResource = (priorRun, resourceKey, deps, groupId = null) => {
  const updated = removeFullPackPlanResource(priorRun, resourceKey, groupId);
  if (updated !== priorRun && deps && typeof deps.setFullPackRun === 'function') deps.setFullPackRun(updated);
  return updated;
};

const _fullPackRecordNeedsMatrixUpgrade = (record) => {
  const preflight = record && record.preflight;
  const matrix = preflight && preflight.generationMatrix;
  if (!matrix || !matrix.settings) return false;
  if (!matrix.settings.version || matrix.settings.version === 0) return true;
  return (Array.isArray(preflight.selected) ? preflight.selected : []).some(row =>
    (Array.isArray(row && row.generationVariants) ? row.generationVariants : [])
      .some(variant => variant && variant.legacyDispatch === true));
};

const _upgradeFullPackPlanAfterMatrixLoad = (run) => {
  const matrixModule = _getGenerationMatrixModule();
  if (!run || !matrixModule || typeof matrixModule.resolvePlanRows !== 'function') return run;
  if (run.targetMode === 'all-groups') {
    let changed = false;
    const groups = Object.fromEntries(Object.entries(run.groups || {}).map(([groupId, group]) => {
      if (!_fullPackRecordNeedsMatrixUpgrade(group)) return [groupId, group];
      const upgraded = _recalculateFullPackPlan(group, group.preflight.selected);
      changed = changed || upgraded !== group;
      return [groupId, upgraded];
    }));
    return changed ? Object.assign({}, run, { groups }) : run;
  }
  if (!_fullPackRecordNeedsMatrixUpgrade(run)) return run;
  return _recalculateFullPackPlan(run, run.preflight.selected);
};

const _fullPackRunNeedsMatrixUpgrade = (run) => {
  if (!run) return false;
  if (run.targetMode === 'all-groups') {
    return Object.values(run.groups || {}).some(_fullPackRecordNeedsMatrixUpgrade);
  }
  return _fullPackRecordNeedsMatrixUpgrade(run);
};

// Full Pack diagnostics are generation-owned and deliberately fail closed if
// the host's privacy sanitizers are unavailable. Raw prompts, directives,
// roster identifiers, provider errors, and credentials must never fall
// through into an exported report.
const buildSanitizedFullPackDiagnostic = (fullPackRun, deps = {}) => {
  if (!fullPackRun) return null;
  const {
    diagnosticReason,
    diagnosticResourceType,
    diagnosticBoundedInt,
    diagnosticTimestamp,
    diagnosticRunId,
    sanitizeFullPackPreflight,
    metricsSnapshot,
  } = deps;
  if ([
    diagnosticReason,
    diagnosticResourceType,
    diagnosticBoundedInt,
    diagnosticTimestamp,
    diagnosticRunId,
    sanitizeFullPackPreflight,
  ].some(helper => typeof helper !== 'function')) return null;

  const safeGradeBand = value => {
    const grade = String(value || '').toLowerCase();
    if (!grade) return null;
    if (/pre[ -]?k|preschool/.test(grade)) return 'pre-k';
    if (/kindergarten/.test(grade) || grade === 'k') return 'kindergarten';
    const match = grade.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
    const numeric = match ? Number(match[1]) : NaN;
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return 'grade-' + numeric;
    if (/college|university|adult|postsecondary/.test(grade)) return 'postsecondary';
    return 'custom';
  };
  const safeDok = value => {
    const match = String(value || '').match(/[1-4]/);
    return match ? 'dok-' + match[0] : (value ? 'custom' : null);
  };
  const sanitizeSettings = settings => {
    const source = settings && typeof settings === 'object' ? settings : {};
    const language = String(source.leveledTextLanguage || '');
    const resourceCountValue = String(source.resourceCount || '');
    return {
      gradeBand: safeGradeBand(source.gradeLevel),
      primaryLanguageConfigured: Boolean(language),
      primaryLanguageIsEnglish: /^english$/i.test(language),
      dokLevel: safeDok(source.dokLevel),
      selectedLanguageCount: Array.isArray(source.selectedLanguages) ? Math.min(200, source.selectedLanguages.length) : 0,
      targetStandardCount: Array.isArray(source.targetStandards) ? Math.min(200, source.targetStandards.length) : 0,
      studentInterestCount: Array.isArray(source.studentInterests) ? Math.min(200, source.studentInterests.length) : (source.studentInterests ? 1 : 0),
      useEmojis: source.useEmojis === true,
      textFormatConfigured: Boolean(source.textFormat),
      differentiationRange: ['None', '1', '2', 'Both', 'Custom'].includes(source.differentiationRange) ? source.differentiationRange : 'unknown',
      differentiationTypes: Array.isArray(source.differentiationTypes)
        ? source.differentiationTypes.slice(0, 30).map(diagnosticResourceType)
        : [],
      differentiationCustomGradeCount: Array.isArray(source.differentiationCustomGrades) ? Math.min(30, source.differentiationCustomGrades.length) : 0,
      packSize: /^auto$/i.test(resourceCountValue)
        ? 'auto'
        : (diagnosticBoundedInt(resourceCountValue, 1000) || null),
      isAutoConfigEnabled: source.isAutoConfigEnabled !== false,
      targetMode: source.fullPackTargetGroup === 'all' ? 'all-groups' : 'current-settings',
    };
  };
  const resourceStatuses = ['planned', 'running', 'retrying', 'landed', 'failed', 'interrupted', 'stopped', 'skipped'];
  const runStatuses = ['planning', 'ready', 'running', 'retrying', 'completed', 'partial', 'failed', 'stopped', 'interrupted'];
  const sanitizeResource = resource => {
    if (!resource || typeof resource !== 'object') return { status: 'unknown' };
    const safeReason = resource.reason ? diagnosticReason(resource.reason) : null;
    return {
      type: diagnosticResourceType(resource.type),
      index: diagnosticBoundedInt(resource.index, 100000),
      status: resourceStatuses.includes(resource.status) ? resource.status : 'unknown',
      failureCode: safeReason ? safeReason.code : null,
      reason: safeReason ? safeReason.summary : null,
      failureCategory: ['transient', 'configuration', 'unknown'].includes(resource.failureCategory) ? resource.failureCategory : null,
      retryable: resource.retryable !== false,
      suggestedDelayMs: diagnosticBoundedInt(resource.suggestedDelayMs, 24 * 60 * 60 * 1000),
      elapsedMs: diagnosticBoundedInt(resource.elapsedMs, 24 * 60 * 60 * 1000),
      attempts: diagnosticBoundedInt(resource.attempts, 100),
      startedAt: diagnosticTimestamp(resource.startedAt),
      finishedAt: diagnosticTimestamp(resource.finishedAt),
    };
  };
  const sanitizeResources = resources => Object.fromEntries(
    Object.values(resources || {}).slice(0, 1000).map((resource, index) => ['resource-' + (index + 1), sanitizeResource(resource)])
  );
  const sanitizeGroup = (group, index) => {
    if (!group) return null;
    const safeReason = group.reason ? diagnosticReason(group.reason) : null;
    return {
      group: index + 1,
      status: runStatuses.includes(group.status) ? group.status : 'unknown',
      failureCode: safeReason ? safeReason.code : null,
      reason: safeReason ? safeReason.summary : null,
      elapsedMs: diagnosticBoundedInt(group.elapsedMs, 24 * 60 * 60 * 1000),
      settingsSnapshot: sanitizeSettings(group.settingsSnapshot),
      preflight: sanitizeFullPackPreflight(group.preflight),
      resources: sanitizeResources(group.resources),
    };
  };
  const rootReason = fullPackRun.reason ? diagnosticReason(fullPackRun.reason) : null;
  return {
    reportVersion: 2,
    generatorCapability: FULL_PACK_CAPABILITY_FINGERPRINT,
    exportedAt: new Date().toISOString(),
    runId: diagnosticRunId(fullPackRun.runId, 'full-pack'),
    wasRetry: Boolean(fullPackRun.retryOf),
    usedApprovedPlan: Boolean(fullPackRun.approvedFrom),
    status: runStatuses.includes(fullPackRun.status) ? fullPackRun.status : 'unknown',
    failureCode: rootReason ? rootReason.code : null,
    reason: rootReason ? rootReason.summary : null,
    startedAt: diagnosticTimestamp(fullPackRun.startedAt),
    finishedAt: diagnosticTimestamp(fullPackRun.finishedAt),
    elapsedMs: diagnosticBoundedInt(fullPackRun.elapsedMs, 24 * 60 * 60 * 1000),
    failureCount: diagnosticBoundedInt(fullPackRun.failureCount, 100000),
    persistenceWarning: fullPackRun.persistenceWarning ? 'Compact persistence fallback was used.' : null,
    settingsSnapshot: sanitizeSettings(fullPackRun.settingsSnapshot),
    preflight: sanitizeFullPackPreflight(fullPackRun.preflight),
    resources: sanitizeResources(fullPackRun.resources),
    groups: Object.fromEntries(
      Object.values(fullPackRun.groups || {}).slice(0, 100).map((group, index) => ['group-' + (index + 1), sanitizeGroup(group, index)])
    ),
    observability: typeof metricsSnapshot === 'function' ? metricsSnapshot() : {},
  };
};

const handleApproveFullPack = async (priorRun, deps) => {
  let run = priorRun && typeof priorRun === 'object' ? priorRun : null;
  if (!run || run.status !== 'ready') {
    try { if (deps && typeof deps.addToast === 'function') deps.addToast('Create or refresh the Full Pack plan before generating.', 'info'); } catch (_) {}
    return false;
  }
  const planSummaries = run.targetMode === 'all-groups'
    ? Object.values(run.groups || {}).map(group => group && group.preflight).filter(Boolean)
    : [run.preflight].filter(Boolean);
  if (planSummaries.length === 0 || planSummaries.some(plan => !Array.isArray(plan.selected) || plan.selected.length === 0)) {
    try { if (deps && typeof deps.addToast === 'function') deps.addToast('Keep at least one resource in each Full Pack plan before generating.', 'warning'); } catch (_) {}
    return false;
  }
  const incompatiblePlan = planSummaries.some(plan => plan.planSchemaVersion !== FULL_PACK_PLAN_SCHEMA_VERSION || plan.capabilityFingerprint !== FULL_PACK_CAPABILITY_FINGERPRINT);
  if (incompatiblePlan) {
    try { if (deps && typeof deps.addToast === 'function') deps.addToast('This Full Pack plan was created by an older generator. Refresh the plan before generating.', 'warning'); } catch (_) {}
    return false;
  }
  if (_fullPackRunNeedsMatrixUpgrade(run) && !_getGenerationMatrixModule()) {
    try {
      if (deps && typeof deps.addToast === 'function') deps.addToast(
        'The generation engine is finishing loading. This reviewed plan will be checked automatically when it is ready.',
        'info'
      );
    } catch (_) {}
    await _waitForGenerationMatrixReady(deps || {});
  }
  const upgradedRun = _upgradeFullPackPlanAfterMatrixLoad(run);
  if (upgradedRun !== run) {
    run = upgradedRun;
    if (deps && typeof deps.setFullPackRun === 'function') {
      deps.setFullPackRun(run);
      try {
        if (typeof deps.addToast === 'function') deps.addToast(
          'The generation engine finished loading, so this plan was refreshed with its exact grade and language variants. Review the updated plan, then generate again.',
          'info'
        );
      } catch (_) {}
      return false;
    }
  }
  if (_fullPackRunNeedsMatrixUpgrade(run)) {
    try {
      if (deps && typeof deps.addToast === 'function') deps.addToast(
        'The generation engine is still loading. Your reviewed Full Pack plan was kept; wait a moment, then generate again so its exact grade and language variants can be verified.',
        'info'
      );
    } catch (_) {}
    return false;
  }
  const snapshot = run.settingsSnapshot && typeof run.settingsSnapshot === 'object' ? run.settingsSnapshot : {};
  const frozenGenerationDeps = _fullPackGenerationConfigDeps(snapshot.fullPackGenerationConfig);
  const approvedDeps = Object.assign({}, deps || {}, snapshot, frozenGenerationDeps, {
    isProcessing: false,
    fullPackTargetGroup: run.targetMode === 'all-groups' ? 'all' : 'none',
  });
  return handleGenerateFullPack({ __fullPackApprovedRun: run }, approvedDeps);
};

const handleRetryFailedFullPack = async (priorRun, deps) => {
  const run = priorRun && typeof priorRun === 'object' ? priorRun : null;
  const failed = run ? Object.values(run.resources || {}).filter(_fullPackResourceNeedsRetry) : [];
  const affectedGroups = run ? Object.entries(run.groups || {}).filter(([, group]) =>
    group && (Object.values(group.resources || {}).some(_fullPackResourceNeedsRetry)
      || (Object.keys(group.resources || {}).length === 0
        && ['queued', 'stopped', 'interrupted'].includes(group.status)
        && group.preflight && Array.isArray(group.preflight.selected)
        && group.preflight.selected.length > 0))) : [];
  if (!run || (failed.length === 0 && affectedGroups.length === 0)) {
    try { if (deps && typeof deps.addToast === 'function') deps.addToast('There are no failed or interrupted Full Pack resources to retry.', 'info'); } catch (_) {}
    return false;
  }
  if (affectedGroups.length > 0) {
    const retryGroups = Object.fromEntries(affectedGroups.map(([gid, group]) => [gid, group]));
    const rosterGroups = Object.fromEntries(affectedGroups.map(([gid, group]) => [gid, {
      name: group.groupName || gid,
      profile: group.settingsSnapshot || {},
    }]));
    const rootSnapshot = run.settingsSnapshot && typeof run.settingsSnapshot === 'object'
      ? run.settingsSnapshot : {};
    const frozenGenerationDeps = _fullPackGenerationConfigDeps(rootSnapshot.fullPackGenerationConfig);
    const retryDeps = Object.assign({}, deps || {}, rootSnapshot, frozenGenerationDeps, {
      isProcessing: false,
      fullPackTargetGroup: 'all',
      rosterKey: Object.assign({}, deps && deps.rosterKey || {}, { groups: rosterGroups }),
    });
    return handleGenerateFullPack({ __fullPackGroupRetryRun: Object.assign({}, run, {
      groups: retryGroups,
      lineageGroups: run.groups || {},
    }) }, retryDeps);
  }
  const snapshot = run.settingsSnapshot && typeof run.settingsSnapshot === 'object' ? run.settingsSnapshot : {};
  const frozenGenerationDeps = _fullPackGenerationConfigDeps(snapshot.fullPackGenerationConfig);
  const retryDeps = Object.assign({}, deps || {}, snapshot, frozenGenerationDeps, {
    isProcessing: false, fullPackTargetGroup: 'none'
  });
  return handleGenerateFullPack({ __fullPackRetryRun: run }, retryDeps);
};window.AlloModules = window.AlloModules || {};
window.AlloModules.GenerationHelpers = {
  handleGenerateMath,
  handleGenerateFullPack,
  handlePlanFullPack,
  getFullPackEditableResourceTypes,
  addFullPackPlanResource,
  removeFullPackPlanResource,
  changeFullPackPlanResourceType,
  editFullPackPlanResourceDirective,
  moveFullPackPlanResource,
  setFullPackPlanPrimaryTextPolicy,
  setFullPackPlanAdaptedTextPolicy,
  handleRemoveFullPackPlanResource,
  handleApproveFullPack,
  handleRetryFailedFullPack,
  handleStopFullPack,
  buildSanitizedFullPackDiagnostic,
  getFullPackGenerationConfigSnapshot: deps => _cloneFullPackValue(_captureFullPackGenerationConfig(deps || {})),
  estimateFullPackRowProviderWork: (row, settings) => _cloneFullPackValue(_estimateFullPackRowProviderWork(row, settings || {})),
  estimateFullPackCapacity: _estimateFullPackCapacity,
  handleComplexityAdjustment,
};

window.AlloModules.GenerationHelpersModule = true;
console.log('[GenerationHelpers] 3 helpers registered (handleGenerateMath + handleGenerateFullPack + handleComplexityAdjustment)');
})();
