/**
 * Deterministic generation/reuse policy for Blueprint and Full Pack planners.
 *
 * This module is deliberately pure: it does not read React state, mutate
 * history, or dispatch generation. Callers may use the returned matrix to show
 * the educator exactly which artifacts will be reused, generated, refreshed,
 * or created as intentional variants.
 */
(function () {
  'use strict';

  var VERSION = 'generation-matrix/v1';
  var GENERATION_CONFIG_VERSION = 'generation-config/v1';
  var ACTIONS = Object.freeze({
    REUSE: 'reuse',
    GENERATE: 'generate',
    VARIANT: 'variant',
    REFRESH: 'refresh'
  });

  // Must stay aligned with UNIVERSAL_DIFFERENTIABLE_TYPES in
  // view_sidebar_panels_source.jsx.
  var DIFFERENTIABLE_TYPES = Object.freeze([
    'simplified', 'glossary', 'quiz', 'faq', 'outline', 'sentence-frames',
    'timeline', 'concept-sort', 'dbq', 'note-taking', 'anchor-chart'
  ]);

  // Must stay aligned with MULTILINGUAL_FANOUT_TYPES in
  // generate_dispatcher_source.jsx. Types outside this list generate once in
  // English when the UI value is "All Selected Languages".
  var MULTILINGUAL_FANOUT_TYPES = Object.freeze([
    'simplified', 'outline', 'image', 'quiz', 'faq', 'sentence-frames',
    'timeline', 'concept-sort', 'dbq', 'lesson-plan', 'adventure',
    'gemini-bridge', 'math', 'note-taking', 'anchor-chart', 'persona'
  ]);

  var SOURCE_GLOBAL_SINGLETON_TYPES = Object.freeze(['analysis']);
  var CONTEXT_SINGLETON_TYPES = Object.freeze([
    'simplified', 'glossary', 'lesson-plan', 'alignment-report'
  ]);
  var REPEATABLE_RESOURCE_TYPES = Object.freeze([
    'image', 'outline', 'quiz', 'faq', 'sentence-frames', 'timeline',
    'persona', 'concept-sort', 'brainstorm', 'adventure', 'dbq',
    'note-taking', 'anchor-chart', 'math', 'gemini-bridge'
  ]);
  var IMAGE_MODEL_RESOURCE_TYPES = Object.freeze([
    'image', 'glossary', 'quiz', 'timeline', 'concept-sort', 'anchor-chart'
  ]);

  var GRADE_ORDER = Object.freeze([
    'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', '4th Grade',
    '5th Grade', '6th Grade', '7th Grade', '8th Grade', '9th Grade',
    '10th Grade', '11th Grade', '12th Grade', 'College', 'Graduate Level'
  ]);

  // Identity must describe what a resource actually consumes, not every
  // Universal Settings control that happened to be open. Keeping these fields
  // type-scoped prevents (for example) an image-style change from invalidating
  // a quiz while still making an image generated with a different style novel.
  var RESOURCE_GENERATION_CONFIG_FIELDS = (function () {
    var fields = {
      analysis: ['checkAccuracyWithSearch'],
      simplified: ['textFormat', 'leveledTextLength', 'keepCitations', 'includeCharts',
        'sourceTopic'],
      glossary: ['glossaryDefinitionLevel', 'effectiveImageStyle', 'glossaryTier2Count',
        'glossaryTier3Count', 'includeEtymology', 'autoRemoveWords'],
      outline: ['outlineType'],
      image: ['effectiveVisualStyle', 'visualLayoutMode', 'useLowQualityVisuals', 'noText',
        'fillInTheBlank', 'creativeMode'],
      quiz: ['quizMode', 'itemCount', 'reflectionCount',
        'passAnalysisToQuiz', 'cellGameDifficulty'],
      faq: ['itemCount'],
      'sentence-frames': ['frameType'],
      timeline: ['mode', 'itemCount', 'includeTimelineVisuals', 'topic', 'imageStyle',
        'autoRemoveWords'],
      'concept-sort': ['itemCount', 'conceptImageMode', 'selectedConcepts', 'imageStyle'],
      dbq: ['dbqMode'],
      'lesson-plan': ['isParentMode', 'isIndependentMode', 'isTeacherMode'],
      adventure: ['isAdventureStoryMode'],
      'gemini-bridge': ['simulationType', 'stepCount'],
      math: ['mathSubject', 'mathMode', 'mathInput', 'isMathGraphEnabled'],
      'note-taking': ['templateType'],
      'anchor-chart': ['chartType', 'sourceTopic'],
      brainstorm: ['isIndependentMode'],
      persona: ['personaMode', 'sourceTopic'],
      'alignment-report': ['alignmentMode']
    };
    Object.keys(fields).forEach(function (type) { fields[type] = Object.freeze(fields[type].slice()); });
    return Object.freeze(fields);
  })();
  var GENERATION_CONFIG_INPUT_FIELDS = Object.freeze([
    'visualStyle', 'visualCustomStyle', 'visualLayoutMode', 'universalImageStyle',
    'glossaryImageStyle', 'quizCount', 'quizMcqCount', 'quizReflectionCount',
    'faqCount', 'timelineMode', 'timelineCount', 'timelineItemCount', 'timelineTopic',
    'conceptItemCount', 'bridgeSimType', 'bridgeStepCount', 'noteTakingTemplateType',
    'anchorChartType', 'imageGenerationStyle', 'imageAspectRatio'
  ]);

  var DEFAULT_POLICY = Object.freeze({
    cardinality: 'context-singleton',
    scope: 'source-context',
    allowVariants: false,
    differentiable: false,
    multilingual: false
  });

  function makePolicy(type, cardinality, scope, allowVariants) {
    return Object.freeze({
      type: type,
      cardinality: cardinality,
      scope: scope,
      allowVariants: allowVariants === true,
      differentiable: DIFFERENTIABLE_TYPES.indexOf(type) !== -1,
      multilingual: MULTILINGUAL_FANOUT_TYPES.indexOf(type) !== -1
    });
  }

  var RESOURCE_POLICIES = (function () {
    var out = {};
    SOURCE_GLOBAL_SINGLETON_TYPES.forEach(function (type) {
      out[type] = makePolicy(type, 'source-global-singleton', 'source', false);
    });
    CONTEXT_SINGLETON_TYPES.forEach(function (type) {
      out[type] = makePolicy(type, 'context-singleton', 'source-context', false);
    });
    REPEATABLE_RESOURCE_TYPES.forEach(function (type) {
      out[type] = makePolicy(type, 'variant-repeatable', 'source-context', true);
    });
    return Object.freeze(out);
  })();

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function fold(value) {
    return clean(value).toLowerCase();
  }

  function uniqueStrings(values, fallback) {
    var result = [];
    var seen = {};
    (Array.isArray(values) ? values : []).forEach(function (value) {
      var text = clean(value);
      var key = fold(text);
      if (!text || seen[key]) return;
      seen[key] = true;
      result.push(text);
    });
    if (!result.length && fallback != null && clean(fallback)) result.push(clean(fallback));
    return result;
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!isObject(value)) return value;
    var out = {};
    Object.keys(value).sort().forEach(function (key) {
      if (value[key] !== undefined && typeof value[key] !== 'function') out[key] = stableValue(value[key]);
    });
    return out;
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  function hashText(value) {
    var text = String(value == null ? '' : value);
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function fingerprintSourceText(value) {
    var normalized = clean(value);
    return normalized ? 'src-' + hashText(normalized) + '-' + normalized.length : '';
  }

  function normalizeSourceFingerprint(value, sourceText) {
    var fromText = fingerprintSourceText(sourceText);
    if (fromText) return fromText;
    var direct = clean(value);
    if (!direct) return '';
    if (/^src-/i.test(direct)) return 'src-' + direct.slice(4);
    // Full Pack's pre-matrix fingerprint used the same compact envelope with an
    // fp- prefix. Accept it at the boundary, but never emit a second namespace.
    if (/^fp-/i.test(direct)) return 'src-' + direct.slice(3);
    // Preserve opaque external identifiers without allowing them to become a
    // second output format.
    return 'src-ref-' + hashText(direct) + '-' + direct.length;
  }

  function normalizeLanguageValue(value, fallback) {
    var normalized = clean(value);
    if (!normalized && fallback != null) normalized = clean(fallback);
    if (fold(normalized) === 'english') return 'English';
    if (fold(normalized) === 'all selected languages') return 'All Selected Languages';
    return normalized;
  }

  function normalizeLanguageValues(values, fallback) {
    return uniqueStrings((Array.isArray(values) ? values : []).map(function (value) {
      return normalizeLanguageValue(value);
    }), fallback == null ? fallback : normalizeLanguageValue(fallback));
  }

  function deepFreeze(value, seen) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    var visited = seen || [];
    if (visited.indexOf(value) !== -1) return value;
    visited.push(value);
    Object.keys(value).forEach(function (key) { deepFreeze(value[key], visited); });
    return Object.freeze(value);
  }

  function getResourceType(resource) {
    if (typeof resource === 'string') return fold(resource);
    return fold(resource && (resource.type || resource.tool || resource.resourceType || resource.id));
  }

  function getResourcePolicy(resource) {
    var type = getResourceType(resource);
    return RESOURCE_POLICIES[type] || Object.freeze({
      type: type,
      cardinality: DEFAULT_POLICY.cardinality,
      scope: DEFAULT_POLICY.scope,
      allowVariants: DEFAULT_POLICY.allowVariants,
      differentiable: DEFAULT_POLICY.differentiable,
      multilingual: DEFAULT_POLICY.multilingual
    });
  }

  function isSingletonType(resource) {
    return getResourcePolicy(resource).allowVariants !== true;
  }

  function isRepeatableType(resource) {
    return getResourcePolicy(resource).allowVariants === true;
  }

  function own(object, key) {
    return !!object && Object.prototype.hasOwnProperty.call(object, key);
  }

  function typedOverrideFrom(settings, type) {
    var overrides = isObject(settings && settings.toolOverrides) ? settings.toolOverrides : {};
    if (isObject(overrides[type])) return overrides[type];
    if (clean(overrides[type])) return { customInstructions: clean(overrides[type]) };
    var keys = Object.keys(overrides);
    for (var i = 0; i < keys.length; i++) {
      if (fold(keys[i]) !== type) continue;
      if (isObject(overrides[keys[i]])) return overrides[keys[i]];
      if (clean(overrides[keys[i]])) return { customInstructions: clean(overrides[keys[i]]) };
    }
    return {};
  }

  function effectiveConfigValue(resource, settings, type, key) {
    var row = isObject(resource) ? resource : {};
    var rowConfig = isObject(row.config) ? row.config : {};
    var typedOverride = typedOverrideFrom(settings, type);
    var frozenOptions = isObject(settings && settings.generationOptions)
      ? settings.generationOptions : {};
    var containers = [row, rowConfig, typedOverride, frozenOptions, settings || {}];
    for (var i = 0; i < containers.length; i++) {
      if (own(containers[i], key) && containers[i][key] !== undefined) return containers[i][key];
    }
    return undefined;
  }

  function compactStableObject(value) {
    if (!isObject(value)) return {};
    var out = {};
    Object.keys(value).sort().forEach(function (key) {
      if (/api.?key|token|secret|password|authorization|base.?url/i.test(key)) return;
      var candidate = value[key];
      if (candidate === undefined || typeof candidate === 'function') return;
      if (typeof candidate === 'string') candidate = clean(candidate);
      if (candidate === '' || candidate == null) return;
      if (isObject(candidate)) candidate = compactStableObject(candidate);
      else if (Array.isArray(candidate)) candidate = candidate.map(function (item) {
        return isObject(item) ? compactStableObject(item) : stableValue(item);
      });
      out[key] = stableValue(candidate);
    });
    return out;
  }

  function scopedGenerationContext(type, settings, typedOverride) {
    var raw = isObject(settings && settings.generationContext) ? settings.generationContext : {};
    var overrideContext = isObject(typedOverride && typedOverride.generationContext)
      ? typedOverride.generationContext : {};
    if (type === 'full-pack') {
      return compactStableObject(Object.assign({}, raw,
        Object.keys(overrideContext).length ? { resourceOverride: overrideContext } : {}));
    }
    var structured = own(raw, 'common') || own(raw, 'resources') || own(raw, 'tools')
      || own(raw, 'types') || own(raw, type);
    if (!structured) {
      return compactStableObject(Object.assign({}, raw,
        Object.keys(overrideContext).length ? { resource: overrideContext } : {}));
    }
    var resourceContext = {};
    [raw.resources, raw.tools, raw.types].forEach(function (collection) {
      if (isObject(collection) && isObject(collection[type])) {
        resourceContext = Object.assign(resourceContext, collection[type]);
      }
    });
    if (isObject(raw[type])) resourceContext = Object.assign(resourceContext, raw[type]);
    resourceContext = Object.assign(resourceContext, overrideContext);
    var scoped = {};
    if (isObject(raw.common) && Object.keys(raw.common).length) scoped.common = raw.common;
    if (Object.keys(resourceContext).length) scoped.resource = resourceContext;
    return compactStableObject(scoped);
  }

  function projectEffectiveGenerationConfig(resource, settings) {
    var row = typeof resource === 'string' ? { type: resource } : (resource || {});
    var type = getResourceType(row);
    var source = isObject(settings) ? settings : {};
    var typedOverride = typedOverrideFrom(source, type);
    var fields = {};
    var allowed = RESOURCE_GENERATION_CONFIG_FIELDS[type] || [];
    allowed.forEach(function (key) {
      var value = effectiveConfigValue(row, source, type, key);
      if (value === undefined || value == null) return;
      if (typeof value === 'string') value = clean(value);
      if (value === '') return;
      fields[key] = stableValue(value);
    });
    var customInstructions = resourceDirective(row)
      || clean(effectiveConfigValue(row, source, type, 'customInstructions'));
    if (customInstructions) fields.customInstructions = fold(customInstructions);
    if (getResourcePolicy(type).allowVariants) {
      var mode = resourceMode(row);
      if (mode) fields.mode = fold(mode);
    }
    if (type === 'full-pack') {
      fields.toolOverrides = compactStableObject(source.toolOverrides);
      var optionFields = compactStableObject(source.generationOptions);
      if (Object.keys(optionFields).length) fields.generationOptions = optionFields;
    }
    var backend = effectiveConfigValue(row, source, type, 'backend');
    if (backend === undefined) backend = effectiveConfigValue(row, source, type, 'aiBackend');
    var provider = effectiveConfigValue(row, source, type, 'provider');
    if (provider === undefined) provider = effectiveConfigValue(row, source, type, 'aiProvider');
    var model = effectiveConfigValue(row, source, type, 'model');
    if (model === undefined) model = effectiveConfigValue(row, source, type, 'modelId');
    var fallbackModel = effectiveConfigValue(row, source, type, 'fallbackModel');
    var imageProvider = effectiveConfigValue(row, source, type, 'imageProvider');
    var imageModel = effectiveConfigValue(row, source, type, 'imageModel');
    var visionModel = effectiveConfigValue(row, source, type, 'visionModel');
    if (isObject(source.models)) {
      if (model === undefined) model = source.models.default;
      if (fallbackModel === undefined) fallbackModel = source.models.fallback;
      if (imageModel === undefined) imageModel = source.models.image;
      if (visionModel === undefined) visionModel = source.models.vision;
    }
    var usesImageModel = type === 'full-pack' || IMAGE_MODEL_RESOURCE_TYPES.indexOf(type) !== -1;
    var backendKey = fold(backend);
    var isLocalBackend = ['local', 'ollama', 'localai', 'lmstudio', 'alloflow-local', 'custom']
      .indexOf(backendKey) !== -1;
    function effective(key) { return effectiveConfigValue(row, source, type, key); }
    function setField(key, value) {
      if (value === undefined || value == null) return;
      if (typeof value === 'string') value = clean(value);
      if (value === '') return;
      fields[key] = stableValue(value);
    }
    if (type === 'image') {
      var visual = effective('effectiveVisualStyle');
      if (!clean(visual)) {
        var selectedVisual = clean(effective('visualStyle'));
        visual = fold(selectedVisual) === 'custom'
          ? clean(effective('visualCustomStyle')) || 'Default'
          : ((!selectedVisual || fold(selectedVisual) === 'default')
            ? clean(effective('universalImageStyle')) || selectedVisual || 'Default'
            : selectedVisual);
      }
      setField('effectiveVisualStyle', visual);
    } else if (type === 'glossary') {
      setField('effectiveImageStyle', clean(effective('effectiveImageStyle'))
        || clean(effective('glossaryImageStyle'))
        || clean(effective('universalImageStyle')));
    } else if (type === 'quiz') {
      setField('quizMode', effective('quizMode') || 'exit-ticket');
      setField('itemCount', effective('itemCount') !== undefined ? effective('itemCount')
        : (effective('quizCount') !== undefined ? effective('quizCount') : effective('quizMcqCount')));
      setField('reflectionCount', effective('reflectionCount') !== undefined
        ? effective('reflectionCount') : effective('quizReflectionCount'));
    } else if (type === 'faq') {
      var faqItems = effective('itemCount') !== undefined ? effective('itemCount') : effective('faqCount');
      if (isLocalBackend) faqItems = Math.max(3, Math.min(Number(faqItems) || 5, 6));
      setField('itemCount', faqItems);
    } else if (type === 'timeline') {
      setField('mode', effective('timelineMode') || effective('mode') || 'auto');
      setField('itemCount', effective('timelineCount') !== undefined
        ? effective('timelineCount') : effective('timelineItemCount'));
      setField('topic', effective('timelineTopic'));
      setField('imageStyle', effective('imageStyle') || effective('universalImageStyle'));
    } else if (type === 'concept-sort') {
      var conceptItems = effective('itemCount') !== undefined
        ? effective('itemCount') : effective('conceptItemCount');
      if (conceptItems === undefined || conceptItems === null || conceptItems === '') conceptItems = 'auto';
      else if (isLocalBackend) conceptItems = Math.max(6, Math.min(Number(conceptItems) || 10, 12));
      setField('itemCount', conceptItems);
      setField('imageStyle', effective('imageStyle') || effective('universalImageStyle'));
    } else if (type === 'gemini-bridge') {
      setField('simulationType', effective('bridgeSimType'));
      var steps = effective('stepCount') !== undefined ? effective('stepCount') : effective('bridgeStepCount');
      if (isLocalBackend) steps = Math.max(3, Math.min(Number(steps) || 5, 6));
      setField('stepCount', steps);
    } else if (type === 'note-taking') {
      setField('templateType', effective('templateType') || effective('noteTakingTemplateType') || 'cornell-notes');
    } else if (type === 'anchor-chart') {
      setField('chartType', effective('chartType') || effective('anchorChartType') || 'auto');
    } else if (type === 'math') {
      setField('mathSubject', effective('mathSubject') || 'General Math');
      setField('mathMode', effective('mathMode') || 'Problem Set Generator');
      setField('mathInput', effective('mathInput') || effective('sourceTopic')
        || 'Create a relevant word problem based on the text');
    } else if (type === 'dbq') {
      setField('dbqMode', effective('dbqMode') || 'standard');
    }
    var projection = {
      version: GENERATION_CONFIG_VERSION,
      type: type,
      backend: backendKey,
      provider: fold(provider),
      model: clean(model),
      fallbackModel: clean(fallbackModel),
      imageProvider: usesImageModel ? fold(imageProvider) : '',
      imageModel: usesImageModel ? clean(imageModel) : '',
      visionModel: usesImageModel ? clean(visionModel) : '',
      fields: compactStableObject(fields),
      generationContext: scopedGenerationContext(type, source, typedOverride)
    };
    return deepFreeze(projection);
  }

  function buildGenerationConfigFingerprint(resource, settings) {
    var projection = projectEffectiveGenerationConfig(resource, settings);
    return 'cfg-' + (projection.type || 'unknown') + '-'
      + hashText(stableStringify(projection));
  }

  function deriveDifferentiationGrades(baseGrade, range, customGrades) {
    var grade = clean(baseGrade);
    if (!grade) return [];
    if (!range || range === 'None') return [grade];
    if (range === 'Custom') {
      var picked = uniqueStrings(customGrades).filter(function (item) { return GRADE_ORDER.indexOf(item) !== -1; });
      return uniqueStrings([grade].concat(picked)).sort(function (a, b) {
        return GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b);
      });
    }
    var index = GRADE_ORDER.indexOf(grade);
    if (index === -1) return [grade];
    var indexes = [index];
    function add(next) { if (indexes.indexOf(next) === -1) indexes.push(next); }
    if (range === '1' || range === 'Both') {
      add(Math.max(0, index - 1));
      add(Math.min(GRADE_ORDER.length - 1, index + 1));
    }
    if (range === '2' || range === 'Both') {
      add(Math.max(0, index - 2));
      add(Math.min(GRADE_ORDER.length - 1, index + 2));
    }
    return indexes.sort(function (a, b) { return a - b; }).map(function (i) { return GRADE_ORDER[i]; });
  }

  function sourceFingerprintFrom(value) {
    if (!value) return '';
    var structuredIdentity = isObject(value.generationIdentity) ? value.generationIdentity : {};
    var sourceText = value.sourceText || value.originalText
      || (value.data && (value.data.originalText || value.data.rawEnglishText))
      || (value.config && value.config.sourceText);
    var direct = clean(value.sourceFingerprint
      || (value.config && value.config.sourceFingerprint)
      || (value.provenance && value.provenance.sourceFingerprint)
      || structuredIdentity.sourceFingerprint);
    return normalizeSourceFingerprint(direct, sourceText);
  }

  function sourceArtifactIdFrom(value) {
    if (!value) return '';
    var text = value.instructionalText || (value.config && value.config.instructionalText) || {};
    return clean(value.sourceArtifactId || value.primaryArtifactId
      || (value.config && (value.config.sourceArtifactId || value.config.primaryArtifactId))
      || text.sourceArtifactId || text.primaryArtifactId
      || (value.provenance && (value.provenance.sourceArtifactId || value.provenance.primaryArtifactId)));
  }

  function contextFieldsFrom(settings) {
    var interestInput = settings && (settings.studentInterests || settings.interests);
    var interests = uniqueStrings(Array.isArray(interestInput)
      ? interestInput : (clean(interestInput) ? [interestInput] : []))
      .map(fold).sort();
    return {
      standardsFingerprint: clean(settings && settings.standardsFingerprint),
      groupId: clean(settings && (settings.groupId || settings.rosterGroupId)),
      translationMode: clean(settings && settings.translationMode),
      currentUiLanguage: fold(normalizeLanguageValue(settings
        && (settings.currentUiLanguage || settings.uiLanguage))),
      translationTarget: fold(normalizeLanguageValue(settings && (settings.translationTarget
        || settings.translationTargetLanguage || settings.attachedTranslationTarget
        || (settings.translationPolicy && settings.translationPolicy.target)))),
      studentInterests: interests,
      dokLevel: clean(settings && (settings.dokLevel || settings.dok)),
      useEmojis: !!(settings && settings.useEmojis)
    };
  }

  function contextInputsFingerprintFrom(settings) {
    return 'ctxi-' + hashText(stableStringify(contextFieldsFrom(settings)));
  }

  function contextFingerprintFrom(settings) {
    var derived = clean(settings && (settings.derivedContextFingerprint
      || (settings.contextFingerprintDerived === true ? settings.contextFingerprint : '')));
    var declaredInputs = clean(settings && settings.contextInputsFingerprint);
    var currentInputs = contextInputsFingerprintFrom(settings);
    // A compact dispatcher descriptor may not carry the input signature. Trust
    // its explicit matrix-managed marker. Full snapshots do carry the signature,
    // allowing edits/revisions to invalidate a stale reviewed fingerprint.
    if (derived && (!declaredInputs || declaredInputs === currentInputs)) return derived;
    // Keep a caller-supplied context as a stable parent instead of repeatedly
    // hashing our own derived context when a frozen snapshot is passed back in.
    var explicit = clean(settings && (settings.contextBaseFingerprint
      || (settings.contextFingerprintDerived === true ? ''
        : (settings.version === VERSION ? '' : settings.contextFingerprint))));
    var contextFields = contextFieldsFrom(settings);
    var context = Object.assign({ parent: explicit }, contextFields);
    var hasDerivedContext = context.standardsFingerprint || context.groupId || context.translationMode
      || context.currentUiLanguage || context.translationTarget || context.studentInterests.length
      || context.dokLevel || context.useEmojis;
    if (explicit && !hasDerivedContext) return explicit;
    if (!explicit && !hasDerivedContext) return '';
    return 'ctx-' + hashText(stableStringify(context));
  }

  function buildFrozenGenerationSettings(settings) {
    var source = isObject(settings) ? settings : {};
    var gradeLevel = clean(source.gradeLevel || source.grade);
    var language = normalizeLanguageValue(source.language || source.leveledTextLanguage, 'English');
    var selectedLanguages = normalizeLanguageValues(source.selectedLanguages);
    var differentiationRange = clean(source.differentiationRange) || 'None';
    var suppliedGrades = uniqueStrings(source.differentiationGrades || source.grades);
    var differentiationGrades = suppliedGrades.length
      ? uniqueStrings([gradeLevel].concat(suppliedGrades))
      : deriveDifferentiationGrades(gradeLevel, differentiationRange, source.differentiationCustomGrades);
    var sourceFingerprint = normalizeSourceFingerprint(source.sourceFingerprint, source.sourceText);
    var suppliedDerivedContext = clean(source.derivedContextFingerprint
      || (source.contextFingerprintDerived === true ? source.contextFingerprint : ''));
    var contextBaseFingerprint = clean(source.contextBaseFingerprint
      || (suppliedDerivedContext || source.version === VERSION ? '' : source.contextFingerprint));
    var interestInput = source.studentInterests || source.interests;
    var allGenerationFields = [];
    Object.keys(RESOURCE_GENERATION_CONFIG_FIELDS).forEach(function (type) {
      allGenerationFields = allGenerationFields.concat(RESOURCE_GENERATION_CONFIG_FIELDS[type]);
    });
    allGenerationFields = allGenerationFields.concat(GENERATION_CONFIG_INPUT_FIELDS);
    allGenerationFields = uniqueStrings(allGenerationFields);
    var generationOptions = {};
    allGenerationFields.forEach(function (key) {
      if (!own(source, key) || source[key] === undefined || source[key] == null) return;
      if (typeof source[key] === 'string' && !clean(source[key])) return;
      generationOptions[key] = stableValue(source[key]);
    });
    var snapshot = {
      version: VERSION,
      sourceFingerprint: sourceFingerprint,
      sourceArtifactId: clean(source.sourceArtifactId || source.primaryArtifactId),
      gradeLevel: gradeLevel,
      language: language,
      selectedLanguages: selectedLanguages,
      differentiationRange: differentiationRange,
      differentiationGrades: differentiationGrades,
      differentiationTypes: uniqueStrings(source.differentiationTypes),
      standardsFingerprint: clean(source.standardsFingerprint),
      contextBaseFingerprint: contextBaseFingerprint,
      contextFingerprint: '',
      contextFingerprintDerived: true,
      contextInputsFingerprint: '',
      groupId: clean(source.groupId || source.rosterGroupId),
      translationMode: clean(source.translationMode
        || (source.translationPolicy && source.translationPolicy.mode)),
      currentUiLanguage: normalizeLanguageValue(source.currentUiLanguage || source.uiLanguage),
      translationTarget: normalizeLanguageValue(source.translationTarget || source.translationTargetLanguage
        || source.attachedTranslationTarget
        || (source.translationPolicy && source.translationPolicy.target)),
      studentInterests: uniqueStrings(Array.isArray(interestInput)
        ? interestInput : (clean(interestInput) ? [interestInput] : [])),
      dokLevel: clean(source.dokLevel || source.dok),
      useEmojis: source.useEmojis === true,
      textFormat: clean(source.textFormat),
      imageGenerationStyle: clean(source.imageGenerationStyle
        || source.imageStyle || source.universalImageStyle),
      imageAspectRatio: clean(source.imageAspectRatio),
      generationContext: isObject(source.generationContext)
        ? stableValue(source.generationContext) : {},
      generationOptions: stableValue(Object.assign({}, source.generationOptions || {}, generationOptions)),
      toolOverrides: isObject(source.toolOverrides) ? stableValue(source.toolOverrides) : {},
      backend: clean(source.backend || source.aiBackend),
      provider: clean(source.provider || source.aiProvider || source.providerId),
      model: clean(source.model || source.modelId || (source.models && source.models.default)),
      fallbackModel: clean(source.fallbackModel || (source.models && source.models.fallback)),
      imageProvider: clean(source.imageProvider),
      imageModel: clean(source.imageModel || (source.models && source.models.image)),
      visionModel: clean(source.visionModel || (source.models && source.models.vision)),
      forceRefresh: source.forceRefresh === true
    };
    snapshot.contextInputsFingerprint = contextInputsFingerprintFrom(snapshot);
    var suppliedInputsFingerprint = clean(source.contextInputsFingerprint);
    var suppliedContextIsCurrent = suppliedDerivedContext
      && (!suppliedInputsFingerprint || suppliedInputsFingerprint === snapshot.contextInputsFingerprint);
    snapshot.contextFingerprint = suppliedContextIsCurrent
      ? suppliedDerivedContext : contextFingerprintFrom(snapshot);
    return deepFreeze(snapshot);
  }

  function resourceDirective(resource) {
    if (!resource || typeof resource === 'string') return '';
    return clean(resource.directive || resource.instructions || resource.customInstructions);
  }

  function resourceMode(resource) {
    if (!resource || typeof resource === 'string') return '';
    var config = isObject(resource.config) ? resource.config : {};
    var activity = isObject(resource.activityConfig) ? resource.activityConfig : {};
    return clean(resource.mode || resource.activityMode || resource.outlineType || resource.quizMode
      || resource.templateType || resource.chartType || config.mode || config.activityMode
      || config.type || activity.protocol);
  }

  function buildVariantKey(resource, policy) {
    if (!policy.allowVariants) return 'singleton';
    var explicit = clean(resource && (resource.explicitVariantKey || resource.variantKeyInput));
    // Plan rows carry the resolved key for display together with a marker that
    // says it was derived. Ignore that displayed value on re-resolution so an
    // edited directive/mode is allowed to produce a new identity.
    if (!explicit && resource && resource.variantKeyDerived !== true) {
      explicit = clean(resource.variantKey);
    }
    if (explicit) return 'key-' + hashText(fold(explicit));
    var mode = resourceMode(resource);
    var directive = resourceDirective(resource);
    if (!mode && !directive) return 'default';
    return 'variant-' + hashText(stableStringify({ mode: fold(mode), directive: fold(directive) }));
  }

  function buildGenerationIdentity(resource, options, variant) {
    var type = getResourceType(resource);
    var policy = getResourcePolicy(type);
    var settings = buildFrozenGenerationSettings(options || {});
    var cell = isObject(variant) ? variant : {};
    var sourceFingerprint = normalizeSourceFingerprint(
      cell.sourceFingerprint || settings.sourceFingerprint || sourceFingerprintFrom(resource));
    var sourceArtifactId = clean(cell.sourceArtifactId || settings.sourceArtifactId || sourceArtifactIdFrom(resource));
    var sourceKey = sourceFingerprint || (sourceArtifactId ? 'artifact-' + sourceArtifactId : 'unknown-source');
    var payload = { version: 1, type: type, source: sourceKey };
    if (policy.cardinality !== 'source-global-singleton') {
      payload.grade = clean(cell.grade == null ? settings.gradeLevel : cell.grade);
      payload.language = fold(normalizeLanguageValue(
        cell.language == null ? settings.language : cell.language, 'English'));
      payload.context = clean(cell.contextFingerprint || settings.contextFingerprint);
      payload.config = clean(cell.generationConfigFingerprint
        || buildGenerationConfigFingerprint(resource, options || settings));
      // A glossary is a single resource per grade/context, but that resource
      // embeds translations for the selected language set. Preserve the
      // singleton while making a changed attached-language set a new exact
      // identity rather than reusing a glossary with the wrong translations.
      if (type === 'glossary') {
        payload.attachedLanguages = normalizeLanguageValues(settings.selectedLanguages)
          .map(fold).sort();
      }
      if (policy.allowVariants) payload.variant = clean(cell.variantKey || buildVariantKey(resource, policy));
    }
    return 'gm1-' + (type || 'unknown') + '-' + hashText(stableStringify(payload));
  }

  function resolveGrades(type, settings, resource) {
    var policy = getResourcePolicy(type);
    if (policy.cardinality === 'source-global-singleton') return [null];
    var rowGrade = clean(resource && (resource.grade || resource.gradeLevel));
    var base = rowGrade || settings.gradeLevel;
    var optedIn = policy.differentiable
      && settings.differentiationRange !== 'None'
      && settings.differentiationTypes.indexOf(type) !== -1;
    return optedIn ? uniqueStrings(settings.differentiationGrades, base) : [base || null];
  }

  function resolveLanguages(type, settings, resource) {
    var rowLanguage = normalizeLanguageValue(resource
      && (resource.language || resource.leveledTextLanguage));
    var requested = normalizeLanguageValue(rowLanguage || settings.language, 'English');
    if (fold(requested) !== 'all selected languages') return [requested];
    if (MULTILINGUAL_FANOUT_TYPES.indexOf(type) === -1) return ['English'];
    return normalizeLanguageValues(['English'].concat(settings.selectedLanguages), 'English');
  }

  function artifactIdentityValues(artifact) {
    if (!artifact) return [];
    var candidates = [artifact.generationIdentity,
      artifact.config && artifact.config.generationIdentity,
      artifact.provenance && artifact.provenance.generationIdentity,
      artifact.generation && artifact.generation.identity];
    var values = [];
    candidates.forEach(function (candidate) {
      if (typeof candidate === 'string' && clean(candidate)) values.push(clean(candidate));
      else if (isObject(candidate)) {
        var key = clean(candidate.key || candidate.id || candidate.generationIdentity || candidate.identity);
        if (key) values.push(key);
        else if (candidate.type || candidate.tool) values.push(buildGenerationIdentity(candidate, candidate, candidate));
      }
    });
    return uniqueStrings(values);
  }

  function artifactGrade(artifact) {
    if (!artifact) return '';
    var text = artifact.instructionalText || (artifact.config && artifact.config.instructionalText) || {};
    var complexity = text.complexity || {};
    var direct = clean(artifact.grade || artifact.gradeLevel || artifact.targetGradeLevel
      || (artifact.config && (artifact.config.grade || artifact.config.gradeLevel || artifact.config.targetGradeLevel))
      || complexity.requestedGrade);
    if (direct) return direct;
    var meta = clean(artifact.meta);
    for (var i = 0; i < GRADE_ORDER.length; i++) if (meta.indexOf(GRADE_ORDER[i]) !== -1) return GRADE_ORDER[i];
    return '';
  }

  function artifactLanguage(artifact) {
    if (!artifact) return '';
    var text = artifact.instructionalText || (artifact.config && artifact.config.instructionalText) || {};
    var complexity = text.complexity || {};
    return normalizeLanguageValue(artifact.language || artifact.outputLanguage
      || (artifact.config && (artifact.config.language || artifact.config.outputLanguage || artifact.config.leveledTextLanguage))
      || complexity.language);
  }

  function artifactGenerationConfigFingerprint(artifact) {
    if (!artifact) return '';
    var config = isObject(artifact.config) ? artifact.config : {};
    var provenance = isObject(artifact.provenance) ? artifact.provenance : {};
    var identity = isObject(artifact.generationIdentity) ? artifact.generationIdentity
      : (isObject(config.generationIdentity) ? config.generationIdentity : {});
    return clean(artifact.generationConfigFingerprint || config.generationConfigFingerprint
      || provenance.generationConfigFingerprint || identity.generationConfigFingerprint);
  }

  function artifactVariantKey(artifact, policy) {
    if (!artifact || !policy.allowVariants) return 'singleton';
    var config = isObject(artifact.config) ? artifact.config : {};
    var candidate = {
      variantKey: artifact.variantKey || config.variantKey,
      explicitVariantKey: artifact.explicitVariantKey || config.explicitVariantKey,
      variantKeyInput: artifact.variantKeyInput || config.variantKeyInput,
      variantKeyDerived: artifact.variantKeyDerived === true || config.variantKeyDerived === true,
      directive: artifact.directive || artifact.customInstructions || config.customInstructions,
      mode: artifact.mode || artifact.activityMode || config.mode || config.type,
      activityConfig: artifact.activityConfig
    };
    return buildVariantKey(candidate, policy);
  }

  function artifactDirective(artifact) {
    if (!artifact) return '';
    var config = isObject(artifact.config) ? artifact.config : {};
    return clean(artifact.directive || artifact.instructions || artifact.customInstructions
      || config.customInstructions);
  }

  function artifactMode(artifact) {
    if (!artifact) return '';
    var config = isObject(artifact.config) ? artifact.config : {};
    var activity = isObject(artifact.activityConfig) ? artifact.activityConfig : {};
    return clean(artifact.mode || artifact.activityMode || artifact.outlineType || artifact.quizMode
      || artifact.templateType || artifact.chartType || config.mode || activity.protocol);
  }

  function singletonGenerationInputsChanged(artifact, resource, policy) {
    if (!artifact || policy.allowVariants || policy.cardinality === 'source-global-singleton') return false;
    return fold(artifactDirective(artifact)) !== fold(resourceDirective(resource))
      || fold(artifactMode(artifact)) !== fold(resourceMode(resource));
  }

  function artifactContextFingerprint(artifact) {
    if (!artifact) return '';
    var config = isObject(artifact.config) ? artifact.config : {};
    var provenance = isObject(artifact.provenance) ? artifact.provenance : {};
    var direct = clean(artifact.contextFingerprint || config.contextFingerprint
      || provenance.contextFingerprint);
    if (direct) return direct;
    return contextFingerprintFrom({
      standardsFingerprint: artifact.standardsFingerprint || config.standardsFingerprint
        || provenance.standardsFingerprint,
      groupId: artifact.groupId || artifact.rosterGroupId || config.groupId
        || config.rosterGroupId || provenance.groupId || provenance.rosterGroupId,
      translationMode: artifact.translationMode || config.translationMode
        || provenance.translationMode,
      currentUiLanguage: artifact.currentUiLanguage || config.currentUiLanguage
        || provenance.currentUiLanguage,
      translationTarget: artifact.translationTarget || config.translationTarget
        || provenance.translationTarget,
      studentInterests: artifact.studentInterests || artifact.interests
        || config.studentInterests || config.interests
        || provenance.studentInterests || provenance.interests,
      dokLevel: artifact.dokLevel || artifact.dok || config.dokLevel || config.dok
        || provenance.dokLevel || provenance.dok,
      useEmojis: artifact.useEmojis === true || config.useEmojis === true
        || provenance.useEmojis === true,
      textFormat: artifact.textFormat || config.textFormat || provenance.textFormat,
      imageGenerationStyle: artifact.imageGenerationStyle || artifact.imageStyle
        || config.imageGenerationStyle || config.imageStyle
        || provenance.imageGenerationStyle || provenance.imageStyle,
      imageAspectRatio: artifact.imageAspectRatio || config.imageAspectRatio
        || provenance.imageAspectRatio,
      generationContext: artifact.generationContext || config.generationContext
        || provenance.generationContext
    });
  }

  function artifactHasContextMetadata(artifact) {
    if (!artifact) return false;
    var config = isObject(artifact.config) ? artifact.config : {};
    var provenance = isObject(artifact.provenance) ? artifact.provenance : {};
    var fields = [
      'contextFingerprint', 'standardsFingerprint', 'groupId', 'rosterGroupId',
      'translationMode', 'currentUiLanguage', 'translationTarget', 'dokLevel',
      'dok', 'studentInterests', 'interests', 'useEmojis', 'textFormat',
      'imageGenerationStyle', 'imageStyle', 'imageAspectRatio', 'generationContext'
    ];
    return fields.some(function (field) {
      return Object.prototype.hasOwnProperty.call(artifact, field)
        || Object.prototype.hasOwnProperty.call(config, field)
        || Object.prototype.hasOwnProperty.call(provenance, field);
    });
  }

  function normalizeArtifacts(options) {
    var raw = options && (options.existingArtifacts || options.history || options.resources);
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (isObject(raw)) return Object.keys(raw).map(function (key) { return raw[key]; }).filter(Boolean);
    return [];
  }

  function legacySourceMatches(artifact, sourceFingerprint, sourceArtifactId, options) {
    var candidateFingerprint = sourceFingerprintFrom(artifact);
    var candidateArtifactId = sourceArtifactIdFrom(artifact);
    var normalizedSource = normalizeSourceFingerprint(sourceFingerprint);
    if (normalizedSource && candidateFingerprint) return normalizedSource === candidateFingerprint;
    if (sourceArtifactId && candidateArtifactId) return sourceArtifactId === candidateArtifactId;
    if ((sourceFingerprint || sourceArtifactId) && !(candidateFingerprint || candidateArtifactId)) {
      return !!(options && options.allowLegacyUnknownSource);
    }
    if (!(sourceFingerprint || sourceArtifactId)) return !!(options && options.allowUnknownSourceReuse);
    return false;
  }

  function legacyArtifactMatches(artifact, cell, resource, settings, options, exactVariant) {
    if (!artifact || getResourceType(artifact) !== cell.type) return false;
    var policy = getResourcePolicy(cell.type);
    if (!legacySourceMatches(artifact, cell.sourceFingerprint, cell.sourceArtifactId, options)) return false;
    if (policy.cardinality === 'source-global-singleton') return true;
    var contextFingerprint = artifactContextFingerprint(artifact);
    if (artifactHasContextMetadata(artifact)
        && settings.contextFingerprint !== contextFingerprint) return false;
    var grade = artifactGrade(artifact);
    var language = artifactLanguage(artifact);
    if (cell.grade && grade && fold(cell.grade) !== fold(grade)) return false;
    if (cell.grade && !grade && !(options && options.allowLegacyMissingGrade)) return false;
    if (cell.language && language && fold(cell.language) !== fold(language)) return false;
    // Missing legacy language means English; older English artifacts generally
    // predate the explicit language field.
    if (cell.language && !language && fold(cell.language) !== 'english') return false;
    var artifactConfigFingerprint = artifactGenerationConfigFingerprint(artifact);
    if (exactVariant && artifactConfigFingerprint && cell.generationConfigFingerprint
        && artifactConfigFingerprint !== cell.generationConfigFingerprint) return false;
    if (exactVariant && policy.allowVariants) {
      return artifactVariantKey(artifact, policy) === cell.variantKey;
    }
    return true;
  }

  function artifactId(artifact) {
    return clean(artifact && (artifact.id || artifact.resourceId || artifact.artifactId));
  }

  function findExactArtifact(artifacts, cell, resource, settings, options) {
    // A stable identity cannot safely prove source equality when neither a
    // content fingerprint nor a source artifact id is available. The plan can
    // still suppress duplicate rows via its local seen-identity set, but it
    // must not reuse persisted history across unknown sources by default.
    var sourceKnown = !!(cell.sourceFingerprint || cell.sourceArtifactId);
    var mayReuseUnknownSource = !!(options && options.allowUnknownSourceReuse);
    for (var i = 0; i < artifacts.length; i++) {
      var identities = artifactIdentityValues(artifacts[i]);
      if ((sourceKnown || mayReuseUnknownSource)
          && identities.indexOf(cell.generationIdentity) !== -1) return artifacts[i];
    }
    for (var j = 0; j < artifacts.length; j++) {
      // An explicit non-matching identity is authoritative; use legacy fields
      // only for artifacts that predate generation identities.
      if (artifactIdentityValues(artifacts[j]).length) continue;
      if (legacyArtifactMatches(artifacts[j], cell, resource, settings, options, true)) return artifacts[j];
    }
    return null;
  }

  function findSameBaseArtifact(artifacts, cell, resource, settings, options) {
    for (var i = 0; i < artifacts.length; i++) {
      // A non-matching modern identity without its compact context descriptor
      // cannot prove that only directive/mode/variant differs. Treat it as a
      // fresh generation instead of incorrectly labeling a settings change as
      // an intentional repeatable variant.
      if (artifactIdentityValues(artifacts[i]).length
          && !artifactHasContextMetadata(artifacts[i])
          && getResourcePolicy(cell.type).cardinality !== 'source-global-singleton') continue;
      if (legacyArtifactMatches(artifacts[i], cell, resource, settings, options, false)) return artifacts[i];
    }
    return null;
  }

  function hasSameBaseArtifact(artifacts, cell, resource, settings, options) {
    return !!findSameBaseArtifact(artifacts, cell, resource, settings, options);
  }

  function forceRefreshRequested(resource, cell, options) {
    if (resource && (resource.forceRefresh === true || resource.action === ACTIONS.REFRESH || resource.generationAction === ACTIONS.REFRESH)) return true;
    var force = options && options.forceRefresh;
    if (force === true) return true;
    if (typeof force === 'function') return force(resource, cell) === true;
    if (Array.isArray(force)) {
      return force.indexOf(cell.generationIdentity) !== -1 || force.indexOf(cell.type) !== -1
        || force.indexOf(resource && (resource.uiId || resource.key || resource.id)) !== -1;
    }
    if (isObject(force)) {
      return force[cell.generationIdentity] === true || force[cell.type] === true
        || force[resource && (resource.uiId || resource.key || resource.id)] === true;
    }
    return false;
  }

  function aggregateAction(variants) {
    var rank = { reuse: 0, variant: 1, generate: 2, refresh: 3 };
    var action = ACTIONS.REUSE;
    (variants || []).forEach(function (item) {
      if ((rank[item.action] || 0) > (rank[action] || 0)) action = item.action;
    });
    return action;
  }

  function resolveGenerationMatrix(resource, options) {
    var row = typeof resource === 'string' ? { type: resource } : (resource || {});
    var type = getResourceType(row);
    var policy = getResourcePolicy(type);
    var settingsInput = Object.assign({}, (options && options.settings) || {}, options || {});
    // A current source text supplied by the caller outranks source metadata on
    // a reopened plan row. This lets a plan be safely re-resolved after the
    // educator changes the source instead of pinning the row's old fingerprint.
    if (!settingsInput.sourceFingerprint && !clean(settingsInput.sourceText)) {
      settingsInput.sourceFingerprint = sourceFingerprintFrom(row);
    }
    if (!settingsInput.sourceArtifactId && !settingsInput.sourceFingerprint
        && !clean(settingsInput.sourceText)) {
      settingsInput.sourceArtifactId = sourceArtifactIdFrom(row);
    }
    if (!settingsInput.gradeLevel) settingsInput.gradeLevel = row.gradeLevel || row.grade;
    if (!settingsInput.language) settingsInput.language = row.language || row.leveledTextLanguage;
    var settings = buildFrozenGenerationSettings(settingsInput);
    var generationConfig = projectEffectiveGenerationConfig(row, settingsInput);
    var generationConfigFingerprint = buildGenerationConfigFingerprint(row, settingsInput);
    var sourceFingerprint = settings.sourceFingerprint || sourceFingerprintFrom(row);
    var sourceArtifactId = settings.sourceArtifactId || sourceArtifactIdFrom(row);
    var explicitVariantKey = policy.allowVariants
      ? clean(row.explicitVariantKey || row.variantKeyInput
        || (row.variantKeyDerived !== true ? row.variantKey : ''))
      : '';
    var variantKey = buildVariantKey(row, policy);
    var artifacts = normalizeArtifacts(options || {});
    var grades = resolveGrades(type, settings, row);
    var languages = resolveLanguages(type, settings, row);
    var variants = [];
    grades.forEach(function (grade) {
      languages.forEach(function (language) {
        var identity = buildGenerationIdentity(row, settings, {
          grade: grade,
          language: language,
          variantKey: variantKey,
          sourceFingerprint: sourceFingerprint,
          sourceArtifactId: sourceArtifactId,
          generationConfigFingerprint: generationConfigFingerprint
        });
        var cell = {
          generationIdentity: identity,
          type: type,
          grade: grade,
          language: language,
          variantKey: variantKey,
          sourceFingerprint: sourceFingerprint,
          sourceArtifactId: sourceArtifactId,
          contextFingerprint: settings.contextFingerprint,
          contextInputsFingerprint: settings.contextInputsFingerprint,
          generationConfig: generationConfig,
          generationConfigFingerprint: generationConfigFingerprint
        };
        var exact = findExactArtifact(artifacts, cell, row, settings, options || {});
        var force = forceRefreshRequested(row, cell, options || {});
        var baseArtifact = findSameBaseArtifact(artifacts, cell, row, settings, options || {});
        var sameBase = !!baseArtifact;
        var changedSingletonInputs = singletonGenerationInputsChanged(exact, row, policy);
        var exactConfigFingerprint = artifactGenerationConfigFingerprint(exact);
        var changedEffectiveConfig = !!(exact && exactConfigFingerprint
          && exactConfigFingerprint !== generationConfigFingerprint);
        if (exact && (force || changedSingletonInputs || changedEffectiveConfig)) {
          cell.action = ACTIONS.REFRESH;
          cell.existingArtifactId = artifactId(exact) || null;
          cell.reason = force
            ? 'Explicit refresh requested for an existing generation identity.'
            : (changedEffectiveConfig
              ? 'Generation settings changed; refresh the canonical artifact.'
              : 'Generation instructions changed; replace the canonical singleton artifact.');
        } else if (exact) {
          cell.action = ACTIONS.REUSE;
          cell.existingArtifactId = artifactId(exact) || null;
          cell.reason = 'An artifact with the same source-aware generation identity already exists.';
        } else if (sameBase) {
          var baseVariant = artifactVariantKey(baseArtifact, policy);
          var configDrift = artifactGenerationConfigFingerprint(baseArtifact)
            && artifactGenerationConfigFingerprint(baseArtifact) !== generationConfigFingerprint;
          if ((!policy.allowVariants && configDrift)
              || (policy.allowVariants && baseVariant === cell.variantKey)) {
            cell.action = ACTIONS.REFRESH;
            cell.existingArtifactId = artifactId(baseArtifact) || null;
            cell.reason = configDrift
              ? 'Generation settings changed; refresh the existing resource identity.'
              : 'The resource identity changed without a new pedagogical variant; refresh it.';
          } else if (policy.allowVariants) {
            cell.action = ACTIONS.VARIANT;
            cell.existingArtifactId = null;
            cell.reason = 'A distinct directive, mode, or variant key makes this an intentional variant.';
          } else {
            cell.action = ACTIONS.GENERATE;
            cell.existingArtifactId = null;
            cell.reason = 'A non-matching modern identity is authoritative.';
          }
        } else {
          cell.action = ACTIONS.GENERATE;
          cell.existingArtifactId = null;
          cell.reason = 'No reusable artifact exists for this source-aware generation identity.';
        }
        variants.push(cell);
      });
    });
    var action = aggregateAction(variants);
    var sameTypeBase = variants.some(function (cell) {
      return hasSameBaseArtifact(artifacts, cell, row, settings, options || {});
    });
    var matchedExisting = variants.some(function (cell) {
      return cell.action === ACTIONS.REUSE || cell.action === ACTIONS.REFRESH;
    });
    return {
      type: type,
      policy: policy,
      settings: settings,
      sourceFingerprint: sourceFingerprint,
      sourceArtifactId: sourceArtifactId || null,
      generationConfig: generationConfig,
      generationConfigFingerprint: generationConfigFingerprint,
      variantKey: variantKey,
      explicitVariantKey: explicitVariantKey || null,
      variantKeyDerived: policy.allowVariants ? !explicitVariantKey : false,
      variants: variants,
      action: action,
      generationIdentity: variants.length === 1 ? variants[0].generationIdentity : null,
      existingArtifactId: variants.length === 1 ? variants[0].existingArtifactId : null,
      novel: !sameTypeBase && !matchedExisting
    };
  }

  function planPriority(row, index) {
    if (row.type === 'analysis') return -100000 + index;
    if (row.type === 'lesson-plan') return 100000 + index;
    if (row.novelResource) return index;
    if (row.generationAction === ACTIONS.GENERATE) return 10000 + index;
    if (row.generationAction === ACTIONS.REFRESH) return 20000 + index;
    if (row.generationAction === ACTIONS.REUSE) return 30000 + index;
    return 40000 + index;
  }

  function resolvePlanRows(rows, options) {
    var list = Array.isArray(rows) ? rows : [];
    var baseOptions = Object.assign({}, (options && options.settings) || {}, options || {});
    var existingArtifacts = normalizeArtifacts(baseOptions);
    var virtualArtifacts = existingArtifacts.slice();
    var seenIdentities = {};
    var seenSingletonSlots = {};
    var resolved = [];
    var skipped = [];

    list.forEach(function (raw, index) {
      var input = typeof raw === 'string' ? { tool: raw } : Object.assign({}, raw || {});
      var matrix = resolveGenerationMatrix(input, Object.assign({}, baseOptions, { existingArtifacts: virtualArtifacts }));
      var keptVariants = [];
      var suppressedVariants = [];
      matrix.variants.forEach(function (cell) {
        if (seenIdentities[cell.generationIdentity] !== undefined) {
          suppressedVariants.push(Object.assign({}, cell, { duplicateOf: seenIdentities[cell.generationIdentity] }));
          return;
        }
        var singletonSlot = matrix.policy.allowVariants ? '' : stableStringify({
          type: cell.type,
          source: cell.sourceFingerprint || ('artifact-' + (cell.sourceArtifactId || 'unknown')),
          grade: cell.grade,
          language: fold(cell.language),
          context: cell.contextFingerprint
        });
        if (singletonSlot && seenSingletonSlots[singletonSlot] !== undefined) {
          suppressedVariants.push(Object.assign({}, cell, {
            duplicateOf: seenSingletonSlots[singletonSlot],
            reason: 'A canonical singleton is already planned for this source and context.'
          }));
          return;
        }
        seenIdentities[cell.generationIdentity] = index;
        if (singletonSlot) seenSingletonSlots[singletonSlot] = index;
        keptVariants.push(cell);
        virtualArtifacts.push({
          id: 'planned-' + index + '-' + keptVariants.length,
          type: matrix.type,
          generationIdentity: cell.generationIdentity,
          sourceFingerprint: cell.sourceFingerprint,
          sourceArtifactId: cell.sourceArtifactId,
          contextFingerprint: cell.contextFingerprint,
          contextInputsFingerprint: cell.contextInputsFingerprint,
          generationConfig: cell.generationConfig,
          generationConfigFingerprint: cell.generationConfigFingerprint,
          grade: cell.grade,
          language: cell.language,
          variantKey: matrix.policy.allowVariants ? cell.variantKey : null,
          explicitVariantKey: matrix.explicitVariantKey,
          variantKeyDerived: matrix.variantKeyDerived,
          directive: resourceDirective(input),
          mode: resourceMode(input),
          config: {
            customInstructions: resourceDirective(input),
            contextInputsFingerprint: cell.contextInputsFingerprint,
            generationConfig: cell.generationConfig,
            generationConfigFingerprint: cell.generationConfigFingerprint
          }
        });
      });
      if (!keptVariants.length) {
        skipped.push({
          index: index,
          type: matrix.type,
          reason: 'Exact duplicate generation identity suppressed.',
          generationIdentity: suppressedVariants[0] && suppressedVariants[0].generationIdentity,
          duplicateOf: suppressedVariants[0] && suppressedVariants[0].duplicateOf
        });
        return;
      }
      var action = aggregateAction(keptVariants);
      var row = Object.assign({}, input, {
        type: matrix.type,
        generationAction: action,
        action: action,
        generationIdentity: keptVariants.length === 1 ? keptVariants[0].generationIdentity : null,
        generationVariants: keptVariants,
        suppressedGenerationVariants: suppressedVariants,
        existingArtifactId: keptVariants.length === 1 ? keptVariants[0].existingArtifactId : null,
        sourceFingerprint: matrix.sourceFingerprint,
        sourceArtifactId: matrix.sourceArtifactId,
        contextFingerprint: matrix.settings.contextFingerprint,
        contextFingerprintDerived: true,
        contextInputsFingerprint: matrix.settings.contextInputsFingerprint,
        generationConfig: matrix.generationConfig,
        generationConfigFingerprint: matrix.generationConfigFingerprint,
        variantKey: matrix.variantKey,
        explicitVariantKey: matrix.explicitVariantKey,
        variantKeyDerived: matrix.variantKeyDerived,
        generationPolicy: matrix.policy.cardinality,
        novelResource: matrix.novel,
        _generationOriginalIndex: index
      });
      resolved.push(row);
    });

    resolved.sort(function (a, b) {
      return planPriority(a, a._generationOriginalIndex) - planPriority(b, b._generationOriginalIndex);
    });
    resolved = resolved.map(function (row) {
      var copy = Object.assign({}, row);
      delete copy._generationOriginalIndex;
      return copy;
    });

    var actions = { reuse: 0, generate: 0, variant: 0, refresh: 0 };
    var expectedCalls = 0;
    var imageCalls = 0;
    var variantCount = 0;
    resolved.forEach(function (row) {
      row.generationVariants.forEach(function (cell) {
        actions[cell.action] = (actions[cell.action] || 0) + 1;
        variantCount++;
        if (cell.action !== ACTIONS.REUSE) {
          expectedCalls++;
          if (cell.type === 'image') imageCalls++;
        }
      });
    });

    return {
      rows: resolved,
      skipped: skipped,
      summary: {
        rowCount: resolved.length,
        skippedRowCount: skipped.length,
        variantCount: variantCount,
        expectedCalls: expectedCalls,
        imageCalls: imageCalls,
        actions: actions
      },
      settings: buildFrozenGenerationSettings(baseOptions)
    };
  }

  var API = Object.freeze({
    VERSION: VERSION,
    GENERATION_CONFIG_VERSION: GENERATION_CONFIG_VERSION,
    ACTIONS: ACTIONS,
    RESOURCE_POLICIES: RESOURCE_POLICIES,
    DIFFERENTIABLE_TYPES: DIFFERENTIABLE_TYPES,
    MULTILINGUAL_FANOUT_TYPES: MULTILINGUAL_FANOUT_TYPES,
    SOURCE_GLOBAL_SINGLETON_TYPES: SOURCE_GLOBAL_SINGLETON_TYPES,
    CONTEXT_SINGLETON_TYPES: CONTEXT_SINGLETON_TYPES,
    REPEATABLE_RESOURCE_TYPES: REPEATABLE_RESOURCE_TYPES,
    GRADE_ORDER: GRADE_ORDER,
    RESOURCE_GENERATION_CONFIG_FIELDS: RESOURCE_GENERATION_CONFIG_FIELDS,
    getResourcePolicy: getResourcePolicy,
    isSingletonType: isSingletonType,
    isRepeatableType: isRepeatableType,
    fingerprintSourceText: fingerprintSourceText,
    normalizeSourceFingerprint: normalizeSourceFingerprint,
    normalizeLanguageValue: normalizeLanguageValue,
    normalizeLanguageValues: normalizeLanguageValues,
    projectEffectiveGenerationConfig: projectEffectiveGenerationConfig,
    buildGenerationConfigFingerprint: buildGenerationConfigFingerprint,
    buildVariantKey: buildVariantKey,
    buildGenerationIdentity: buildGenerationIdentity,
    buildFrozenGenerationSettings: buildFrozenGenerationSettings,
    resolveGenerationMatrix: resolveGenerationMatrix,
    resolvePlanRows: resolvePlanRows
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.GenerationMatrix = API;
  }
})();
