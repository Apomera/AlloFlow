/*
 * AlloFlow Agent Core - headless resource-pack authoring service.
 *
 * This module owns the provider-neutral boundary between an agent and an
 * AlloPack.  It deliberately does not know about React, Firebase, browser
 * storage, or a particular model provider.  Adapters inject a `generateText`
 * function; the module validates the request, builds the educational prompt,
 * normalizes the provider result, and validates the resulting pack before it
 * can be returned or exported.
 */
(function () {
  'use strict';

  var CONTRACT_VERSION = '1.0';
  var ALLOPACK_SPEC = '0.1';
  var MAX_SOURCE_CHARS = 120000;
  var MAX_DIRECTIVE_CHARS = 3000;
  var MAX_PLAN_ITEMS = 16;
  var MAX_PACK_CHARS = 500000;
  var MAX_ITEM_CHARS = 120000;
  var MAX_ILLUSTRATED_CHARS = 2000000;
  var MAX_TITLE_CHARS = 240;
  var MAX_DIAGNOSTICS = 100;
  var MAX_TYPES = [
    'directions', 'simplified', 'glossary', 'outline', 'quiz', 'sentence-frames',
    'faq', 'concept-sort', 'timeline', 'math', 'note-taking', 'anchor-chart'
  ];
  var TYPE_SET = Object.create(null);
  MAX_TYPES.forEach(function (type) { TYPE_SET[type] = true; });
  var ILLUSTRATED_TYPES = MAX_TYPES.concat(['image', 'memory-aid', 'applied-challenge']);
  var NATIVE_TYPES = ILLUSTRATED_TYPES.concat(['analysis', 'brainstorm', 'adventure', 'persona', 'dbq', 'lesson-plan', 'gemini-bridge', 'alignment-report', 'udl-advice', 'word-sounds']);
  function mediaProfile(profile) { return profile === 'illustrated' || profile === 'native'; }
  function supportedType(type, profile) {
    return typeof type === 'string' && (TYPE_SET[type] || (mediaProfile(profile) && ILLUSTRATED_TYPES.indexOf(type) !== -1) || (profile === 'native' && NATIVE_TYPES.indexOf(type) !== -1));
  }
  function resolveNativeModule() {
    if (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AgentCorePackNative) return window.AlloModules.AgentCorePackNative;
    if (typeof module !== 'undefined' && typeof require === 'function') {
      try { return require('./agent_core_pack_native_module.js'); } catch (_) {}
    }
    return null;
  }
  function resolveMediaModule() {
    if (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AgentCorePackMedia) return window.AlloModules.AgentCorePackMedia;
    if (typeof module !== 'undefined' && typeof require === 'function') {
      try { return require('./agent_core_pack_media_module.js'); } catch (_) {}
    }
    return null;
  }
  function textSize(value) {
    // Invalid or misplaced payloads still fail the media validator. Valid pixels
    // have their own byte budget instead of consuming the instructional text cap.
    return JSON.stringify(value, function (key, child) {
      return typeof child === 'string' && /^data:image\//i.test(child) ? '[image bytes]' : child;
    }).length;
  }

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function text(value, fallback) {
    var out = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    return out || (fallback || '');
  }
  function error(code, path, message) {
    return { code: code, path: path.slice(0, 600), message: message.slice(0, 2000) };
  }
  function boundedDiagnostics(issues) {
    var result = (issues || []).slice(0, MAX_DIAGNOSTICS).map(function (entry) { return error(entry.code, entry.path, entry.message); });
    if (result.length === MAX_DIAGNOSTICS) result[MAX_DIAGNOSTICS - 1] = error('diagnostics-truncated', 'pack', 'The diagnostic limit was reached. Correct the reported issues and validate again; additional issues may remain.');
    return result;
  }
  // Stop inspecting an already-rejected collection when its diagnostic budget
  // is exhausted. Valid collections retain their existing schema/size limits.
  function eachValidation(values, errors, visit) {
    for (var i = 0; i < values.length && errors.length < MAX_DIAGNOSTICS; i++) visit(values[i], i);
  }
  function ok(value, warnings) {
    return { ok: true, errors: [], warnings: boundedDiagnostics(warnings), value: value };
  }
  function bad(errors, warnings) {
    return { ok: false, errors: boundedDiagnostics(errors), warnings: boundedDiagnostics(warnings), value: null };
  }
  function nowIso() { return new Date().toISOString(); }

  function resolveInstructionalModule() {
    var mod = typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.InstructionalContext
      : null;
    if (!mod && typeof module !== 'undefined' && typeof require === 'function') {
      try { mod = require('./instructional_context_module.js'); } catch (_) {}
    }
    return mod;
  }

  function resolveStandardsModule() {
    var mod = typeof window !== 'undefined' && window.AlloModules
      ? window.AlloModules.StandardsContext
      : null;
    if (!mod && typeof module !== 'undefined' && typeof require === 'function') {
      try { mod = require('./standards_context_module.js'); } catch (_) {}
    }
    return mod;
  }

  function buildStandardsDirective(request) {
    var context = request && request.standardsContext;
    var mod = resolveStandardsModule();
    if (mod && typeof mod.buildResourceDirective === 'function') {
      var sharedDirective = mod.buildResourceDirective(context || (request && request.standards), {
        resourceType: 'resource-pack',
        textRole: 'primary'
      });
      if (text(sharedDirective)) return sharedDirective;
    }
    var promptText = text(context && (context.promptText || context.inputText), text(request && request.standards));
    var constraints = isObject(context && context.instructionalConstraints)
      ? context.instructionalConstraints : {};
    var expectation = text(constraints.textAccessExpectation);
    var lines = [];
    if (promptText) {
      lines.push('STANDARDS FIDELITY: Use this reviewed standards snapshot as the instructional target: ' + promptText + '.');
      lines.push('Preserve required content, cognitive verbs, evidence, and product expectations; language supports must not reduce cognitive demand.');
    }
    if (expectation === 'preserve-primary') {
      lines.push('TEXT ACCESS: Preserve the primary grade-level text. Any adapted text must remain a supplemental companion and must not replace primary-text access.');
    } else if (expectation === 'supplemental-adaptation-permitted') {
      lines.push('TEXT ACCESS: Adapted text may be offered only as a clearly labeled supplemental companion to the primary text.');
    } else if (expectation === 'educator-directed') {
      lines.push('TEXT ACCESS: Follow the educator-recorded text-access decision; do not infer an accommodation or replacement authorization.');
    } else if (expectation === 'adaptation-prohibited' && constraints.sourced === true) {
      lines.push('TEXT ACCESS: A sourced constraint prohibits adapted text. Use the primary text and same-text supports only.');
    }
    return lines.join('\n');
  }

  function fallbackInstructionalText(raw, type, request) {
    var source = isObject(raw) ? raw : {};
    var authorization = isObject(source.replacementAuthorization) ? source.replacementAuthorization : {};
    var rawComplexity = isObject(source.complexity) ? source.complexity : {};
    var rawMeasured = rawComplexity.measuredGrade;
    var measured = rawMeasured === null || rawMeasured === undefined || rawMeasured === '' ? NaN : Number(rawMeasured);
    var isAdapted = type === 'simplified';
    var role = ['primary', 'supplemental', 'unspecified'].indexOf(source.role) !== -1
      ? source.role : (isAdapted ? 'supplemental' : 'unspecified');
    var form = ['original', 'same-text-supported', 'adapted'].indexOf(source.form) !== -1
      ? source.form : (isAdapted ? 'adapted' : 'original');
    var authorized = authorization.authorized === true && authorization.source === 'educator';
    return {
      schemaVersion: 1,
      role: role,
      form: form,
      sourceArtifactId: text(source.sourceArtifactId) || null,
      primaryArtifactId: text(source.primaryArtifactId) || null,
      designationSource: ['educator', 'workflow-default', 'legacy-inferred'].indexOf(source.designationSource) !== -1
        ? source.designationSource : 'workflow-default',
      replacementAuthorization: { authorized: authorized, source: authorized ? 'educator' : 'none' },
      complexity: {
        requestedGrade: text(rawComplexity.requestedGrade, text(request && request.gradeLevel)),
        calibrationTarget: text(rawComplexity.calibrationTarget),
        measuredGrade: Number.isFinite(measured) ? measured : null,
        method: text(rawComplexity.method), status: text(rawComplexity.status, Number.isFinite(measured) ? 'unreviewed' : 'unavailable'),
        contentFingerprint: text(rawComplexity.contentFingerprint), measuredAt: text(rawComplexity.measuredAt),
        language: text(rawComplexity.language, text(request && request.language, 'English'))
      }
    };
  }

  function normalizeInstructionalText(raw, type, request) {
    var mod = resolveInstructionalModule();
    if (mod && typeof mod.normalizeInstructionalText === 'function') {
      var defaults = fallbackInstructionalText(raw, type, request);
      var candidate = Object.assign({}, defaults, isObject(raw) ? raw : {});
      candidate.complexity = Object.assign({}, defaults.complexity, isObject(raw) && isObject(raw.complexity) ? raw.complexity : {});
      return mod.normalizeInstructionalText(candidate);
    }
    return fallbackInstructionalText(raw, type, request);
  }

  // Module-missing fallback. Mirrors InstructionalContext.deriveTextAccessPlan:
  // a grade-level text standard defaults to NO adapted companion (source
  // 'standard'); an educator's include/omit is kept; a default the workflow or a
  // standard made earlier is derived again. Parity: tests/text_access_parity.test.js.
  function resourcePackTextAccessFallback(raw, standardsContext, standardsInput) {
    var source = isObject(raw) ? raw : {};
    var clean = function (value, limit) {
      return value === undefined || value === null ? '' : String(value).replace(/\s+/g, ' ').trim().slice(0, limit);
    };
    var context = isObject(standardsContext) ? standardsContext : {};
    var entries = Array.isArray(context.standards) ? context.standards : [];
    var named = function (value) { return isObject(value) && clean(value.textAccessExpectation, 80) !== 'unspecified'; };
    var entry = null;
    for (var i = 0; i < entries.length && !entry; i++) {
      if (entries[i] && named(entries[i].instructionalConstraints)) entry = entries[i];
    }
    var constraints = (named(context.instructionalConstraints) && context.instructionalConstraints)
      || (entry && entry.instructionalConstraints)
      || (isObject(context.instructionalConstraints) ? context.instructionalConstraints : {});
    var expectation = clean(constraints.textAccessExpectation, 80) || 'unspecified';
    var sourced = constraints.sourced === true
      || !!clean(constraints.basis || constraints.authority || constraints.sourceUrl || constraints.url, 600);
    var values = [standardsInput, context.inputText, context.promptText];
    entries.forEach(function (item) {
      if (isObject(item)) values.push(item.code, item.label, item.text, item.statement, item.description);
      else values.push(item);
    });
    var searchable = values.map(function (value) { return clean(value, 3600); }).filter(Boolean).join(' ');
    var complexity = /\b(?:text complexity|appropriately complex text|grade[- ]level complex text|complex (?:literary|informational|source) texts?|independently and proficiently|high end of (?:the )?text complexity band)\b/i.test(searchable)
      || /\b(?:CCSS\.)?(?:ELA-LITERACY\.)?(?:RL|RI|RST|RH)\.[A-Z0-9-]+\.10\b/i.test(searchable);
    var requiresPrimary = expectation === 'preserve-primary' || expectation === 'adaptation-prohibited' || complexity;
    var prohibition = sourced && expectation === 'adaptation-prohibited';
    var requested = clean(source.adaptedTextPolicy, 40);
    var priorSource = clean(source.adaptedTextPolicySource, 40);
    var derivedEarlier = (priorSource === 'workflow-default' && requested === 'include')
      || (priorSource === 'standard' && requested === 'omit');
    var explicit = derivedEarlier ? '' : requested;
    var valid = ['include', 'omit', 'prohibited'].indexOf(explicit) !== -1;
    var standardOmit = requiresPrimary && !valid;
    var policy = valid ? explicit : (standardOmit ? 'omit' : 'include');
    if (policy === 'prohibited' && !prohibition) policy = 'omit';
    if (prohibition) policy = 'prohibited';
    var decision = derivedEarlier ? '' : priorSource;
    if (prohibition || standardOmit) decision = 'standard';
    else if (explicit === 'prohibited') decision = 'educator';
    else if (['educator', 'standard', 'workflow-default'].indexOf(decision) === -1) decision = explicit ? 'educator' : 'workflow-default';
    var explicitAccess = clean(source.primaryTextAccess, 40);
    return {
      primaryTextAccess: requiresPrimary ? 'required' : (['required', 'available'].indexOf(explicitAccess) !== -1 ? explicitAccess : 'available'),
      adaptedTextPolicy: policy,
      adaptedTextPolicySource: decision,
      textAccessReason: prohibition ? 'sourced-adaptation-prohibition'
        : (expectation === 'preserve-primary' && sourced ? 'sourced-primary-text-requirement'
          : (complexity ? 'standard-text-complexity-requirement'
            : (explicit ? 'educator-choice' : (standardOmit ? 'standard-primary-text-requirement' : 'default-access-companion')))),
      standardRequiresPrimary: requiresPrimary,
      sourcedAdaptationProhibition: prohibition
    };
  }

  function normalizeInstructionalContext(raw, request) {
    var source = isObject(raw) ? raw : {};
    var mod = resolveInstructionalModule();
    if (mod && typeof mod.normalizeInstructionalContext === 'function') {
      return mod.normalizeInstructionalContext(source, {
        instructionalGrade: text(request && request.gradeLevel),
        standardsContext: request && request.standardsContext,
        standardsInput: request && request.standards
      });
    }
    var standardsContext = clone(source.standardsContext || (request && request.standardsContext) || null);
    var access = resourcePackTextAccessFallback(source, standardsContext, request && request.standards);
    return {
      schemaVersion: 1,
      instructionalGrade: text(source.instructionalGrade, text(request && request.gradeLevel)),
      primaryTextPolicy: source.primaryTextPolicy === 'educator-directed' ? 'educator-directed' : 'preserve-primary',
      primaryTextAccess: access.primaryTextAccess,
      adaptedTextPolicy: access.adaptedTextPolicy,
      adaptedTextPolicySource: access.adaptedTextPolicySource,
      textAccessReason: access.textAccessReason,
      standardsContext: standardsContext,
      standardsFingerprint: text(source.standardsFingerprint)
    };
  }

  function scanUnsafe(value, path, errors, depth, maxDepth, wordSounds) {
    if (!value || typeof value !== 'object' || errors.length >= MAX_DIAGNOSTICS) return;
    if (depth > (maxDepth || 8)) {
      errors.push(error('payload-too-deep', path, 'Resource-pack payloads may not exceed ' + (maxDepth || 8) + ' nesting levels.'));
      return;
    }
    var phoneticResource = wordSounds || (maxDepth === 16 && value.type === 'word-sounds' && Array.isArray(value.data));
    eachValidation(Object.keys(value), errors, function (key) {
      var next = path ? path + '.' + key : key;
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        errors.push(error('unsafe-object-key', next, 'Prototype-related keys are not allowed in resource packs.'));
        return;
      }
      if (/(?:api[_-]?key|access[_-]?token|secret|password|credential)/i.test(key)) {
        errors.push(error('secret-like-field', next, 'Secret-like fields are not allowed in AlloPacks.'));
        return;
      }
      var child = value[key];
      // Slash-delimited IPA is native Word Sounds content, not a filesystem
      // reference. Limit this exception to the actual phoneme renderer fields.
      var phoneticText = phoneticResource && /\.data\.\d+\.phonemes\.\d+(?:\.(?:sound|phoneme|ipa))?$/.test(next)
        && typeof child === 'string' && /^\/[\p{L}\p{M}ːˑˈˌ. -]{1,80}\/$/u.test(child);
      if (typeof child === 'string' && /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(child) && !phoneticText) {
        errors.push(error('unsafe-path-value', next, 'Absolute filesystem paths are not allowed in AlloPacks.'));
      } else if (child && typeof child === 'object') scanUnsafe(child, next, errors, depth + 1, maxDepth, phoneticResource);
    });
  }

  function privacyRisk(value) {
    var raw = JSON.stringify(value || '', function (key, child) {
      // Scan text, not encoded pixels. Embedded-image policy is enforced separately.
      return typeof child === 'string' && /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(child) ? '[image bytes]' : child;
    });
    // Search at delimiters, with bounded email components. An unanchored
    // unlimited local-part regex retried at every character of long prose or
    // graph data and could monopolize the MCP process before validation failed.
    for (var at = raw.indexOf('@'); at !== -1; at = raw.indexOf('@', at + 1)) {
      if (/[A-Z0-9._%+-]+$/i.test(raw.slice(Math.max(0, at - 64), at))
        && /^[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw.slice(at + 1, at + 255))) return true;
    }
    var patterns = [
      /\b(?:ssn|social security|student id|student number|date of birth)\b/i,
      /\b(?:iep|504 plan|medical diagnosis|health record|behavior incident)\b/i,
      /\b(?:call|text)\s+\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/i
    ];
    return patterns.some(function (pattern) { return pattern.test(raw); });
  }

  function validateRequest(request) {
    var errors = [];
    if (!isObject(request)) return bad([error('invalid-request', 'request', 'Resource-pack request must be an object.')]);
    var allowed = {
      requestId: 1, title: 1, sourceTopic: 1, sourceText: 1, gradeLevel: 1,
      language: 1, standards: 1, learningGoal: 1, resourcePlan: 1,
      standardsContext: 1, instructionalContext: 1,
      privacy: 1, providerPolicy: 1, author: 1, profile: 1
    };
    eachValidation(Object.keys(request), errors, function (key) {
      if (!allowed[key]) errors.push(error('unsupported-field', 'request.' + key, 'Unsupported request field.'));
    });
    if (request.profile !== undefined && ['text', 'illustrated', 'native'].indexOf(request.profile) === -1) errors.push(error('invalid-pack-profile', 'request.profile', 'Use text, illustrated, or native.'));
    ['requestId', 'title', 'sourceTopic', 'sourceText', 'gradeLevel', 'language', 'learningGoal', 'author'].forEach(function (key) {
      if (request[key] !== undefined && (typeof request[key] !== 'string' || request[key].length > (key === 'sourceText' ? MAX_SOURCE_CHARS : 1000))) {
        errors.push(error('invalid-string', 'request.' + key, 'Field must be a bounded string.'));
      }
    });
    if (!text(request.requestId)) errors.push(error('missing-request-id', 'request.requestId', 'requestId is required.'));
    if (!text(request.sourceText)) errors.push(error('missing-source', 'request.sourceText', 'sourceText is required for generation.'));
    if (!text(request.sourceTopic)) errors.push(error('missing-topic', 'request.sourceTopic', 'sourceTopic is required.'));
    if (!text(request.learningGoal)) errors.push(error('missing-learning-goal', 'request.learningGoal', 'learningGoal is required.'));
    if (request.resourcePlan === undefined || !Array.isArray(request.resourcePlan) || !request.resourcePlan.length || request.resourcePlan.length > MAX_PLAN_ITEMS) {
      errors.push(error('invalid-resource-plan', 'request.resourcePlan', 'resourcePlan must contain 1-' + MAX_PLAN_ITEMS + ' items.'));
    } else {
      eachValidation(request.resourcePlan, errors, function (entry, index) {
        var path = 'request.resourcePlan[' + index + ']';
        var type = typeof entry === 'string' ? entry : (isObject(entry) ? entry.type : '');
        if (!supportedType(type, request.profile)) errors.push(error('unsupported-resource-type', path + '.type', 'Unsupported resource type: ' + text(type, '(non-string or empty)') + '.'));
        if (isObject(entry)) {
          eachValidation(Object.keys(entry), errors, function (key) {
            if (key !== 'type' && key !== 'directive' && key !== 'uiId' && key !== 'instructionalText') {
              errors.push(error('unsupported-field', path + '.' + key, 'Only type, directive, uiId, and instructionalText are allowed.'));
            }
          });
          if (entry.directive !== undefined && (typeof entry.directive !== 'string' || entry.directive.length > MAX_DIRECTIVE_CHARS)) {
            errors.push(error('invalid-directive', path + '.directive', 'directive must be at most ' + MAX_DIRECTIVE_CHARS + ' characters.'));
          }
        }
      });
    }
    if (request.privacy !== undefined) {
      if (!isObject(request.privacy)) errors.push(error('invalid-privacy', 'request.privacy', 'privacy must be an object.'));
      else {
        if (request.privacy.confirmNoStudentPii !== true) errors.push(error('privacy-attestation-required', 'request.privacy.confirmNoStudentPii', 'Explicitly confirm that source and instructions contain no student-identifying information.'));
        if (request.privacy.confirmSourcePermission !== true) errors.push(error('source-permission-required', 'request.privacy.confirmSourcePermission', 'Explicitly confirm that the source may be used.'));
      }
    } else errors.push(error('privacy-attestation-required', 'request.privacy', 'privacy.confirmNoStudentPii and privacy.confirmSourcePermission are required.'));
    if (request.providerPolicy !== undefined) {
      if (!isObject(request.providerPolicy)) errors.push(error('invalid-provider-policy', 'request.providerPolicy', 'providerPolicy must be an object.'));
      else {
        var policy = request.providerPolicy;
        if (policy.provider !== undefined && policy.provider !== 'gemini' && policy.provider !== 'stub') errors.push(error('unsupported-provider', 'request.providerPolicy.provider', 'Only gemini or explicit test stub providers are supported.'));
        if (policy.model !== undefined && (typeof policy.model !== 'string' || policy.model.length > 200)) errors.push(error('invalid-model', 'request.providerPolicy.model', 'model must be a bounded string.'));
        if (policy.allowMeteredUsage !== true && policy.provider !== 'stub') errors.push(error('metered-usage-not-confirmed', 'request.providerPolicy.allowMeteredUsage', 'Set allowMeteredUsage to true to authorize a provider call.'));
      }
    } else errors.push(error('provider-policy-required', 'request.providerPolicy', 'providerPolicy is required.'));
    if (privacyRisk(request.sourceText)) errors.push(error('privacy-risk-detected', 'request.sourceText', 'The source appears to contain identifying or sensitive records; remove them before generation.'));
    scanUnsafe(request, 'request', errors, 0, request.profile === 'native' ? 16 : 8);
    if (errors.length) return bad(errors);
    var normalized = normalizeRequest(request);
    if (!normalized.resourcePlan.length) return bad([error('empty-resource-plan', 'request.resourcePlan', 'The text-access policy removed every requested resource. Add a permitted resource.')]);
    return ok(normalized);
  }

  function normalizeRequest(request) {
    var instructionalContext = normalizeInstructionalContext(request.instructionalContext, request);
    var resourcePlan = request.resourcePlan.map(function (entry, index) {
      var row = typeof entry === 'string' ? { type: entry, directive: '' } : entry;
      return {
        type: row.type,
        directive: text(row.directive),
        uiId: text(row.uiId, row.type + '-' + index),
        instructionalText: normalizeInstructionalText(row.instructionalText, row.type, request)
      };
    });
    if (instructionalContext.adaptedTextPolicy === 'include'
        && !resourcePlan.some(function (row) { return row.type === 'simplified'; })
        && resourcePlan.length < MAX_PLAN_ITEMS) {
      resourcePlan.unshift({
        type: 'simplified',
        directive: 'Create a supplemental Adapted Text while keeping the source text available.',
        uiId: 'simplified-access',
        instructionalText: normalizeInstructionalText(null, 'simplified', request)
      });
    } else if (instructionalContext.adaptedTextPolicy !== 'include') {
      resourcePlan = resourcePlan.filter(function (row) { return row.type !== 'simplified'; });
    }
    return {
      profile: request.profile || 'text', requestId: text(request.requestId), title: text(request.title, text(request.sourceTopic, 'AlloFlow resource pack')),
      sourceTopic: text(request.sourceTopic), sourceText: String(request.sourceText || '').trim(),
      gradeLevel: text(request.gradeLevel, 'middle school'), language: text(request.language, 'en').toLowerCase(),
      standards: text(request.standards), learningGoal: text(request.learningGoal),
      standardsContext: clone(request.standardsContext || null),
      instructionalContext: instructionalContext,
      author: text(request.author, 'AlloFlow Agent Draft'),
      resourcePlan: resourcePlan,
      privacy: clone(request.privacy), providerPolicy: clone(request.providerPolicy)
    };
  }

  function buildPrompt(request) {
    var plan = request.resourcePlan.map(function (entry, index) {
      return (index + 1) + '. ' + entry.type + (entry.directive ? ' — ' + entry.directive : '');
    }).join('\n');
    return [
      'You are the AlloFlow headless authoring provider. Create one coherent, teacher-reviewable resource pack.',
      'Return ONLY valid JSON with this exact top-level shape: {"history":[{"id":"...","type":"...","title":"...","meta":"...","data":...}]}',
      'Do not return markdown fences, commentary, prompts, chain-of-thought, secrets, student names, disability labels, accommodations, or personal records.',
      'Preserve the learning goal and essential meaning. Treat the source as ground truth; do not invent unsupported facts.',
      'Treat the source as the primary text. Resources whose internal type is "simplified" are supplemental adapted companions unless their instructionalText explicitly records an educator-authorized replacement. Never infer an IEP, accommodation, or replacement authorization.',
      buildStandardsDirective(request),
      'All resource ids must be unique. All display fields must be strings, never nested objects. Use the requested type shapes: directions.data is markdown or {body,objectives}; simplified.data is markdown; glossary.data is an array of {term,def,tier}; outline.data is {main,branches:[{title,items}]}; quiz.data is {questions,reflections}; sentence-frames.data is {mode:"list",items:[{text}],rubric}; faq.data is an array of {question,answer}; concept-sort.data is {categories,items}; timeline.data is {progressionLabel,items:[{date,event}]}; math.data is {problems:[{question,answer,steps:[{explanation}]}]}; note-taking.data is {templateType:"cornell-notes",cues,notes}; anchor-chart.data is {title,sections:[{label,bullets}]}',
      'Nested field contract: concept-sort categories are {id,label,color} with unique ids; cards are {id,content,categoryId,explanation?} with unique ids and matching categoryId. Optional explanation is plain text up to 1500 characters linking the evidence to its category; it is shown only after Check, not in the unsorted card. Quiz questions use {type:"mcq",question,options:[four distinct strings],correctAnswer:exact option text,conceptLabel} or {type:"shortAnswer",question,expectedAnswer,conceptLabel}; reflections are [{text}]. Directions objectives need unique id, label and kind (manual, game, xp, visited, responded, completed, time); automatic visited/responded/completed/time goals require resourceRef, game goals need gameType supported by their resource, and time goals need minutes >= 1. Optional resourceRef and lessonRef.resourceId must match an ID in this pack. Sequence principleOptions must include the exact orderingPrinciple. Time-goal labels describe observed engagement, such as Spent 10 minutes; goals are formative guides and do not block access to activities. Cornell cues are [{id,text,guidance?}]; optional guidance is plain text of at most 1000 characters, shown beside the response, not inserted as learner work. Notes are matching blank note rows. Outline items and anchor-chart bullets are arrays of strings. Preserve paragraphs, markdown tables, and line breaks inside content strings. Include every requested resource, in the requested order.',
      'Metadata: topic=' + request.sourceTopic + '; title=' + request.title + '; grade=' + request.gradeLevel + '; language=' + request.language + '; standards=' + (request.standards || 'not supplied') + '; standardsSnapshot=' + ((request.standardsContext && request.standardsContext.promptText) || 'not supplied') + '; primaryTextAccess=' + request.instructionalContext.primaryTextAccess + '; adaptedTextPolicy=' + request.instructionalContext.adaptedTextPolicy + '; goal=' + request.learningGoal + '.',
      'Requested resources:\n' + plan,
      mediaProfile(request.profile) ? 'Image-enabled profile: image.data uses visualPlan.panels with imageUrl, alt, altHash, altSource and decorative; memory-aid.data uses cards; applied-challenge.data uses a brief and supports. Artwork is supplied by the calling host, never fabricate base64. Use the media attachment tool to fill planned slots, and review the actual image before recording altSource=vision.' : '',
      request.profile === 'native' ? 'Native resource contracts (use the matching shape): ' + JSON.stringify(getCapabilities('native').contracts.filter(function (contract) { return request.resourcePlan.some(function (row) { return row.type === contract.type; }); })) : '',
      'Source material begins below. Use it only for instructional content:\n---\n' + request.sourceText + '\n---'
    ].join('\n\n');
  }

  function parseProviderResult(raw) {
    var value = raw && typeof raw === 'object' && raw.text !== undefined ? raw.text : raw;
    if (Array.isArray(value) || isObject(value)) return value;
    var source = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    try { return JSON.parse(source); } catch (_) { throw new Error('Provider returned invalid JSON; no pack was committed.'); }
  }

  function normalizePack(raw, request, provenance) {
    var history = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.history) ? raw.history : []);
    var timestamp = nowIso();
    var planByType = Object.create(null);
    (request.resourcePlan || []).forEach(function (row) {
      if (!planByType[row.type]) planByType[row.type] = [];
      planByType[row.type].push(row);
    });
    var pack = {
      allopack: {
        spec: ALLOPACK_SPEC, title: request.title, author: request.author,
        license: 'Teacher review required', language: request.language,
        gradeLevel: request.gradeLevel, createdAt: timestamp,
        standardsContext: clone(request.standardsContext || null),
        instructionalContext: normalizeInstructionalContext(request.instructionalContext, request)
      },
      sourceTopic: request.sourceTopic,
      history: history.map(function (item, index) {
        var value = isObject(item) ? item : {};
        var type = text(value.type);
        var planned = planByType[type] && planByType[type].length ? planByType[type].shift() : null;
        return Object.assign({}, mediaProfile(request.profile) ? clone(value) : {}, {
          id: text(value.id, 'resource-' + (index + 1)),
          type: type, title: text(value.title, text(value.type, 'Resource')),
          timestamp: text(value.timestamp, timestamp),
          data: value.data !== undefined ? value.data : value.content,
          meta: value.meta === undefined ? '' : value.meta,
          instructionalText: normalizeInstructionalText(value.instructionalText || (planned && planned.instructionalText), type, request)
        });
      }),
      provenance: {
        contractVersion: CONTRACT_VERSION,
        provider: text(provenance && provenance.provider, 'configured-provider'),
        model: text(provenance && provenance.model, 'configured-model'),
        generatedAt: text(provenance && provenance.generatedAt, timestamp)
      }
    };
    if (request.standards) pack.allopack.standards = request.standards;
    return pack;
  }

  // Mirrors the host goal registry. Native-goal parity tests check every offer.
  // BEGIN NATIVE PACK GOAL CAPABILITIES
  var PACK_OUTLINE_GAMES = {
      'Venn Diagram': 'vennDiagram',
      'T-Chart': 'tchartSort',
      'Fishbone': 'fishboneSort',
      'Cause and Effect': 'causeEffectSort',
      'Problem Solution': 'problemSolutionSort',
      'Key Concept Map': 'conceptMapSort',
      'Mind Map': 'conceptMapSort',
      'Frayer Model': 'frayerSort',
      'See-Think-Wonder': 'seeThinkWonderSort',
      'Story Map': 'storyMapSort',
      'Flow Chart': 'pipelineBuilder',
      'Process Flow / Sequence': 'pipelineBuilder',
      'Structured Outline': 'outlineSort'
  };
  var PACK_GOAL_CAPABILITIES = {
      'glossary':        { games: ['crossword', 'memory', 'matching', 'bingo', 'wordScramble', 'definitionDetective'] },
      'concept-sort':    { games: ['conceptSort'] },
      'timeline':        { games: ['timeline'] },
      'sentence-frames': { games: ['syntaxScramble'], responded: true },
      'outline':         { outlineGames: true },
      'math':            { responded: true },
      'dbq':             { responded: true },
      'quiz':            { completed: true }
  };
  // END NATIVE PACK GOAL CAPABILITIES
  function canSupportGoal(resource, goal) {
    if (!isObject(resource) || !isObject(goal)) return false;
    if (['visited', 'time', 'manual'].indexOf(goal.kind) !== -1) return true;
    var capability = PACK_GOAL_CAPABILITIES[resource.type] || {};
    if (goal.kind === 'completed' || goal.kind === 'responded') return capability[goal.kind] === true;
    if (goal.kind === 'game') {
      var games = capability.games || [];
      if (capability.outlineGames) {
        var structure = isObject(resource.data) ? resource.data.structureType : '';
        var game = PACK_OUTLINE_GAMES[structure || 'Structured Outline'];
        games = game ? [game] : [];
      }
      return games.indexOf(goal.gameType) !== -1;
    }
    return false;
  }

  var NOTE_TEMPLATES = ['cornell-notes', 'lab-report', 'reading-response', 'double-entry', 'guided-notes', 'q-and-a'];
  function validateNativeNotes(data, path, errors) {
    if (NOTE_TEMPLATES.indexOf(data.templateType) === -1) { errors.push(error('invalid-note-template', path + '.templateType', 'Use a supported native note template.')); return; }
    function stringField(value, at, required) {
      if ((required || value !== undefined) && typeof value !== 'string') errors.push(error('invalid-note-text', at, 'Expected text; blank learner response fields are allowed.'));
    }
    function rows(key, fields, requiredFields) {
      var list = data[key], seen = Object.create(null);
      if (!Array.isArray(list) || list.length > 200) { errors.push(error('invalid-note-rows', path + '.' + key, 'Expected an array of at most 200 native note rows.')); return; }
      eachValidation(list, errors, function (row, i) {
        var at = path + '.' + key + '[' + i + ']';
        if (!isObject(row)) { errors.push(error('invalid-note-row', at, 'Expected a note row object.')); return; }
        if (!text(row.id) || seen[row.id]) errors.push(error('duplicate-or-missing-id', at + '.id', 'Each note row needs a unique string id.'));
        if (typeof row.id === 'string') seen[row.id] = true;
        fields.forEach(function (field) { stringField(row[field], at + '.' + field, true); });
        (requiredFields || []).forEach(function (field) { if (!text(row[field])) errors.push(error('missing-note-prompt', at + '.' + field, 'This authored prompt or answer key must not be blank.')); });
      });
    }
    ['title', 'author', 'pageRange', 'question', 'hypothesis', 'data', 'analysis', 'conclusion', 'favoriteLine', 'thinkings', 'connections', 'notesExtra', 'summary'].forEach(function (key) { stringField(data[key], path + '.' + key, false); });
    if (data.templateType === 'lab-report') { rows('materials', ['text']); rows('procedure', ['text']); }
    if (data.templateType === 'reading-response' && data.connection !== undefined) {
      if (!isObject(data.connection) || ['text-to-self', 'text-to-text', 'text-to-world'].indexOf(data.connection.type) === -1) errors.push(error('invalid-note-connection', path + '.connection', 'Use a native connection type and string text.'));
      else stringField(data.connection.text, path + '.connection.text', true);
    }
    if (data.templateType === 'double-entry') rows('entries', ['quote', 'response']);
    if (data.templateType === 'guided-notes') rows('blanks', ['before', 'answer', 'after', 'studentAnswer'], ['answer']);
    if (data.templateType === 'q-and-a') rows('pairs', ['question', 'answer']);
  }

  function validateType(item, path, errors, warnings, profile) {
    var data = item.data;
    if (item.type === 'directions') {
      if (!(typeof data === 'string' || isObject(data))) errors.push(error('invalid-directions', path + '.data', 'directions.data must be markdown or an object with body.'));
      if (isObject(data) && typeof data.body !== 'string') errors.push(error('invalid-directions-body', path + '.data.body', 'directions body is required.'));
    } else if (item.type === 'simplified') {
      if (typeof data !== 'string' || data.trim().length < 40) errors.push(error('invalid-simplified', path + '.data', 'simplified.data must be a meaningful markdown string.'));
    } else if (item.type === 'glossary') {
      if (!Array.isArray(data) || data.length < (profile === 'native' ? 1 : 4)) errors.push(error('invalid-glossary', path + '.data', 'glossary.data needs terms (at least four in text/illustrated profiles).'));
      else eachValidation(data, errors, function (term, index) { if (!isObject(term) || !text(term.term) || !text(term.def)) errors.push(error('invalid-glossary-term', path + '.data[' + index + ']', 'Each glossary term needs term and def.')); });
    } else if (item.type === 'outline') {
      if (!isObject(data) || !text(data.main) || !Array.isArray(data.branches) || data.branches.length < 2) errors.push(error('invalid-outline', path + '.data', 'outline.data needs main and at least two branches.'));
    } else if (item.type === 'quiz') {
      if (!isObject(data) || !Array.isArray(data.questions) || data.questions.length < (profile === 'native' ? 1 : 3)) errors.push(error('invalid-quiz', path + '.data', 'quiz.data needs a nonempty questions array (at least three in text/illustrated profiles).'));
      else eachValidation(data.questions, errors, function (question, index) {
        if (!isObject(question)) { errors.push(error('invalid-quiz-question', path + '.data.questions[' + index + ']', 'Each quiz question must be an object.')); return; }
        if (!text(question.question)) errors.push(error('invalid-quiz-question', path + '.data.questions[' + index + '].question', 'Each quiz question needs text.'));
        if (question.type && ['mcq', 'shortAnswer', 'short-answer', 'multi-select', 'fill-blank', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'].indexOf(question.type) === -1) errors.push(error('unsupported-quiz-type', path + '.data.questions[' + index + '].type', 'Use a recognized native quiz type.'));
        if ((!question.type || question.type === 'mcq') && (!Array.isArray(question.options) || (profile === 'native' ? question.options.length < 2 : question.options.length !== 4) || question.options.indexOf(question.correctAnswer) === -1)) errors.push(error('invalid-quiz-options', path + '.data.questions[' + index + ']', 'MCQ options must contain distinct choices and the exact correctAnswer (four choices in text/illustrated profiles).'));
        if ((question.type === 'shortAnswer' || question.type === 'short-answer') && !text(question.expectedAnswer)) errors.push(error('invalid-quiz-answer', path + '.data.questions[' + index + ']', 'Short-answer questions need expectedAnswer.'));
      });
    } else if (item.type === 'sentence-frames') {
      if (profile === 'native' && isObject(data) && data.mode === 'paragraph') {
        if (!text(data.text) || (data.rubric !== undefined && typeof data.rubric !== 'string')) errors.push(error('invalid-sentence-frames', path + '.data', 'Paragraph scaffolds need text and an optional string rubric.'));
      } else if (!isObject(data) || data.mode !== 'list' || !Array.isArray(data.items) || !data.items.length || typeof data.rubric !== 'string') errors.push(error('invalid-sentence-frames', path + '.data', 'sentence-frames.data needs list items and a rubric.'));
    } else if (item.type === 'faq') {
      if (!Array.isArray(data) || data.length < (profile === 'native' ? 1 : 2) || data.some(function (row) { return !isObject(row) || !text(row.question) || !text(row.answer); })) errors.push(error('invalid-faq', path + '.data', 'faq.data needs question/answer rows.'));
    } else if (item.type === 'concept-sort') {
      if (!isObject(data) || !Array.isArray(data.categories) || data.categories.length < 2 || !Array.isArray(data.items) || data.items.length < 4) errors.push(error('invalid-concept-sort', path + '.data', 'concept-sort.data needs categories and items.'));
      else {
        var categoryIds = data.categories.map(function (category) { return category && category.id; });
        eachValidation(data.items, errors, function (entry, index) { if (!entry || categoryIds.indexOf(entry.categoryId) === -1) errors.push(error('orphan-category', path + '.data.items[' + index + ']', 'Every concept-sort item must reference a category.')); });
      }
    } else if (item.type === 'timeline') {
      if (!isObject(data) || !text(data.progressionLabel) || !Array.isArray(data.items) || data.items.length < (profile === 'native' ? 1 : 3)) errors.push(error('invalid-timeline', path + '.data', 'timeline.data needs a progressionLabel and events.'));
    } else if (item.type === 'math') {
      // Apply the same drawing boundary to both current and legacy math shapes,
      // including text-profile packs. A missing validator must fail closed.
      if (isObject(data) && (profile !== 'native' || Array.isArray(data.problems))) {
        var graphValidator = resolveNativeModule();
        var graphRows = [{ value: data.graphData, path: path + '.data.graphData' }];
        if (Array.isArray(data.problems)) eachValidation(data.problems, errors, function (row, index) { if (isObject(row)) graphRows.push({ value: row.graphData, path: path + '.data.problems[' + index + '].graphData' }); });
        eachValidation(graphRows, errors, function (graph) {
          if (graph.value === undefined || graph.value === null || graph.value === '') return;
          if (graphValidator && typeof graphValidator.validateMathGraph === 'function') graphValidator.validateMathGraph(graph.value, graph.path, errors);
          else errors.push(error('graph-validator-unavailable', graph.path, 'Load the native resource validator before validating SVG graphs.'));
        });
      }
      if (profile === 'native' && isObject(data) && !Array.isArray(data.problems)) {
        var nativeMath = resolveNativeModule();
        if (nativeMath) nativeMath.validateMathData(data, path + '.data', errors, warnings);
      } else if (!isObject(data) || !Array.isArray(data.problems) || data.problems.length < (profile === 'native' ? 1 : 3)) errors.push(error('invalid-math', path + '.data', 'math.data needs a nonempty problems array.'));
    } else if (item.type === 'note-taking') {
      if (profile === 'native' && isObject(data) && data.templateType !== 'cornell-notes') validateNativeNotes(data, path + '.data', errors);
      else if (!isObject(data) || data.templateType !== 'cornell-notes' || !Array.isArray(data.cues) || !Array.isArray(data.notes) || data.cues.length !== data.notes.length) errors.push(error('invalid-note-taking', path + '.data', 'note-taking.data needs matching Cornell cues and notes.'));
    } else if (item.type === 'anchor-chart') {
      if (!isObject(data) || !text(data.title) || !Array.isArray(data.sections) || data.sections.length < (profile === 'native' ? 1 : 2)) errors.push(error('invalid-anchor-chart', path + '.data', 'anchor-chart.data needs a title and sections.'));
    } else warnings.push({ code: 'type-check-skipped', path: path + '.data', message: 'No deep renderer contract is available for this type yet.' });
  }

  // Validate the nested fields that the app renders directly. Structural errors
  // must be actionable paths, never a thrown TypeError or an exported [object Object].
  function validateNestedFields(item, path, errors) {
    var data = item.data;
    function required(value, at) {
      if (!text(value)) errors.push(error('invalid-display-text', at, 'Expected a non-empty display string.'));
    }
    function strings(values, at) {
      if (!Array.isArray(values) || !values.length) { errors.push(error('invalid-text-list', at, 'Expected a non-empty list of display strings.')); return; }
      eachValidation(values, errors, function (value, i) { required(value, at + '[' + i + ']'); });
    }
    function rows(values, at, visit) {
      if (!Array.isArray(values)) return;
      eachValidation(values, errors, function (value, i) {
        if (!isObject(value)) errors.push(error('invalid-row', at + '[' + i + ']', 'Expected a resource row object.'));
        else visit(value, at + '[' + i + ']');
      });
    }
    function uniqueRows(values, at) {
      var seen = Object.create(null);
      rows(values, at, function (row, rowPath) {
        if (!text(row.id) || seen[row.id]) errors.push(error('duplicate-or-missing-id', rowPath + '.id', 'Every row needs a unique non-empty string id.'));
        if (typeof row.id === 'string') seen[row.id] = true;
      });
    }
    if (item.type === 'directions' && isObject(data) && data.objectives !== undefined) {
      if (!Array.isArray(data.objectives)) errors.push(error('invalid-objectives', path + '.data.objectives', 'Objectives must be an array.'));
      else {
        uniqueRows(data.objectives, path + '.data.objectives');
        rows(data.objectives, path + '.data.objectives', function (row, at) {
          required(row.label, at + '.label');
          if (['manual', 'game', 'xp', 'visited', 'responded', 'completed', 'time'].indexOf(row.kind) === -1) errors.push(error('invalid-objective-kind', at + '.kind', 'Use manual, game, xp, visited, responded, completed, or time.'));
          if (row.kind === 'game') required(row.gameType, at + '.gameType');
          if (row.kind === 'time' && (!Number.isFinite(row.minutes) || row.minutes < 1)) errors.push(error('invalid-time-objective', at + '.minutes', 'Time observations need a finite number of minutes, at least one.'));
          if (['visited', 'responded', 'completed', 'time'].indexOf(row.kind) !== -1 && row.resourceRef === undefined) errors.push(error('missing-goal-resource', at + '.resourceRef', 'This automatic goal needs a resourceRef.'));
          if (row.kind === 'xp' && (!Number.isFinite(row.amount) || row.amount < 1 || row.amount > 1000)) errors.push(error('invalid-xp-objective', at + '.amount', 'XP must be between 1 and 1000.'));
        });
      }
    }
    if (item.type === 'outline' && isObject(data)) rows(data.branches, path + '.data.branches', function (row, at) { required(row.title, at + '.title'); strings(row.items, at + '.items'); });
    if (item.type === 'anchor-chart' && isObject(data)) rows(data.sections, path + '.data.sections', function (row, at) { required(row.label, at + '.label'); strings(row.bullets, at + '.bullets'); });
    if (item.type === 'sentence-frames' && isObject(data)) rows(data.items, path + '.data.items', function (row, at) { required(row.text, at + '.text'); });
    if (item.type === 'timeline' && isObject(data)) rows(data.items, path + '.data.items', function (row, at) { required(row.date, at + '.date'); required(row.event, at + '.event'); });
    if (item.type === 'concept-sort' && isObject(data)) {
      uniqueRows(data.categories, path + '.data.categories'); uniqueRows(data.items, path + '.data.items');
      rows(data.categories, path + '.data.categories', function (row, at) { required(row.label, at + '.label'); });
      rows(data.items, path + '.data.items', function (row, at) {
        required(row.content, at + '.content'); required(row.categoryId, at + '.categoryId');
        if (row.explanation !== undefined && (typeof row.explanation !== 'string' || row.explanation.length > 1500)) {
          errors.push(error('invalid-sort-explanation', at + '.explanation', 'Optional sort explanation must be plain text of at most 1500 characters; it is revealed only after checking a placement.'));
        }
      });
    }
    if (item.type === 'math' && isObject(data)) rows(data.problems, path + '.data.problems', function (row, at) {
      required(row.question, at + '.question');
      if (!(text(row.answer) || (typeof row.answer === 'number' && Number.isFinite(row.answer)))) errors.push(error('invalid-math-answer', at + '.answer', 'Answer must be a display string or finite number.'));
      if (!Array.isArray(row.steps)) errors.push(error('invalid-math-steps', at + '.steps', 'Steps must be an array of explanation objects.'));
      else rows(row.steps, at + '.steps', function (step, stepPath) { required(step.explanation, stepPath + '.explanation'); });
    });
    if (item.type === 'note-taking' && isObject(data)) {
      uniqueRows(data.cues, path + '.data.cues');
      uniqueRows(data.notes, path + '.data.notes');
      rows(data.notes, path + '.data.notes', function (row, at) { if (typeof row.text !== 'string') errors.push(error('invalid-note-text', at + '.text', 'A note needs string text; an empty response is allowed.')); });
      rows(data.cues, path + '.data.cues', function (row, at) {
        required(row.text, at + '.text');
        if (row.guidance !== undefined && (typeof row.guidance !== 'string' || row.guidance.length > 1000)) {
          errors.push(error('invalid-note-guidance', at + '.guidance', 'Optional cue guidance must be plain text of at most 1000 characters; keep learner responses in notes.'));
        }
      });
    }
    if (item.type === 'quiz' && isObject(data)) {
      rows(data.questions, path + '.data.questions', function (row, at) {
        if (!row.type || row.type === 'mcq') {
          strings(row.options, at + '.options');
          if (Array.isArray(row.options) && new Set(row.options.map(function (x) { return text(x).toLowerCase(); })).size !== row.options.length) errors.push(error('duplicate-quiz-option', at + '.options', 'MCQ choices must be distinct.'));
          required(row.correctAnswer, at + '.correctAnswer');
        }
        function choiceSet(options, answers, field) {
          strings(options, at + '.' + field);
          if (Array.isArray(options) && (options.length < 2 || new Set(options.map(function (value) { return text(value).toLowerCase(); })).size !== options.length)) errors.push(error('invalid-choice-set', at + '.' + field, 'Use at least two distinct choices.'));
          if (!Array.isArray(answers) || !answers.length || answers.some(function (a) { return !text(a) || !Array.isArray(options) || options.indexOf(a) === -1; }) || new Set(answers).size !== answers.length) errors.push(error('invalid-choice-answer', at, 'Each correct answer must exactly match a distinct offered choice.'));
        }
        if (row.type === 'multi-select') choiceSet(row.options, row.correctAnswers, 'options');
        if (row.type === 'answer-evidence') {
          choiceSet(row.answerOptions, [row.correctAnswer], 'answerOptions');
          choiceSet(row.evidenceOptions, [row.correctEvidence], 'evidenceOptions');
          if (row.evidencePrompt !== undefined) required(row.evidencePrompt, at + '.evidencePrompt');
        }
        if (row.type === 'fill-blank') {
          required(row.expectedFill, at + '.expectedFill');
          if (row.acceptableAlternatives !== undefined && (!Array.isArray(row.acceptableAlternatives) || row.acceptableAlternatives.some(function (x) { return !text(x); }))) errors.push(error('invalid-fill-alternatives', at + '.acceptableAlternatives', 'Use an array of answer strings.'));
        }
        if (row.type === 'self-explanation' && row.rubric !== undefined) required(row.rubric, at + '.rubric');
        if (row.type === 'sequence-sense') {
          strings(row.items, at + '.items');
          if (Array.isArray(row.items) && row.items.length < 2) errors.push(error('invalid-sequence', at + '.items', 'A sequence needs at least two items.'));
          if (row.presentedOrder !== undefined && (!Array.isArray(row.presentedOrder) || !Array.isArray(row.items) || row.presentedOrder.length !== row.items.length || new Set(row.presentedOrder).size !== row.items.length || row.presentedOrder.some(function (n) { return !Number.isInteger(n) || n < 0 || n >= row.items.length; }))) errors.push(error('invalid-sequence-order', at + '.presentedOrder', 'Use each item index exactly once.'));
          if (row.intentionallyWrongIndex !== undefined && row.intentionallyWrongIndex !== null && (!Number.isInteger(row.intentionallyWrongIndex) || !Array.isArray(row.items) || row.intentionallyWrongIndex < 0 || row.intentionallyWrongIndex >= row.items.length)) errors.push(error('invalid-sequence-index', at + '.intentionallyWrongIndex', 'Index must refer to a displayed item.'));
          required(row.orderingPrinciple, at + '.orderingPrinciple');
          // These are the exact choices offered by the native sequence renderer.
          choiceSet(row.principleOptions === undefined ? ['chronological', 'cause-effect', 'process', 'size', 'hierarchy'] : row.principleOptions, [row.orderingPrinciple], 'principleOptions');
        }
        if (row.type === 'relation-mismatch') {
          if (!Array.isArray(row.pairs) || row.pairs.length < 2) errors.push(error('invalid-pairs', at + '.pairs', 'Use at least two pairs.'));
          rows(row.pairs, at + '.pairs', function (pair, pairPath) { required(pair.left, pairPath + '.left'); required(pair.right, pairPath + '.right'); });
          if (!Number.isInteger(row.wrongPairIndex) || !Array.isArray(row.pairs) || row.wrongPairIndex < 0 || row.wrongPairIndex >= row.pairs.length) errors.push(error('invalid-pair-index', at + '.wrongPairIndex', 'Index must identify one of the pairs.'));
          choiceSet(row.candidatePartners, [row.correctPartnerForWrong], 'candidatePartners');
        }
        if (row.type === 'numeric-response') {
          if (!Number.isFinite(row.correctValue)) errors.push(error('invalid-numeric-answer', at + '.correctValue', 'Expected a finite numeric answer.'));
          if (row.tolerance !== undefined && (!Number.isFinite(row.tolerance) || row.tolerance < 0)) errors.push(error('invalid-numeric-tolerance', at + '.tolerance', 'Tolerance must be a nonnegative number.'));
          if (row.unit !== undefined && typeof row.unit !== 'string') errors.push(error('invalid-unit', at + '.unit', 'Unit must be text.'));
          if (row.acceptableUnits !== undefined && (!Array.isArray(row.acceptableUnits) || row.acceptableUnits.some(function (x) { return !text(x); }))) errors.push(error('invalid-units', at + '.acceptableUnits', 'Use an array of unit strings.'));
        }
      });
      if (data.reflections !== undefined) {
        if (!Array.isArray(data.reflections)) errors.push(error('invalid-reflections', path + '.data.reflections', 'Reflections must be an array.'));
        else eachValidation(data.reflections, errors, function (row, i) {
          var value = isObject(row) ? (row.text || row.prompt || row.question || row.q || row.label || row.title) : row;
          required(value, path + '.data.reflections[' + i + ']');
        });
      }
    }
  }

  function validateIllustratedType(item, path, errors, warnings, profile) {
    var data = item.data;
    function required(value, at) { if (!text(value)) errors.push(error('invalid-display-text', at, 'Expected a non-empty display string.')); }
    function strings(value, at, min) {
      if (!Array.isArray(value) || value.length < (min || 1)) errors.push(error('invalid-text-list', at, 'Expected a non-empty list of strings.'));
      else eachValidation(value, errors, function (s, i) { required(s, at + '[' + i + ']'); });
    }
    function imageBackup(value, at) {
      if (value === undefined) return;
      if (!isObject(value)) { errors.push(error('invalid-image-backup', at, 'An original image backup must be an object.')); return; }
      if (typeof value.imageUrl !== 'string') errors.push(error('invalid-image-backup', at + '.imageUrl', 'An original image backup must include its imageUrl, or an empty string for a pre-image snapshot.'));
      // Restore spreads this object into active image data. Backups may retain
      // image metadata, but must not introduce unchecked renderer state.
      ['visualPlan', 'annotations', 'frames', 'originalImage', 'labels', 'type'].forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(value, key)) errors.push(error('unsupported-image-backup-state', at + '.' + key, 'Original image backups cannot replace visual plans, annotations, animation or other renderer controls.'));
      });
      ['prompt', 'title', 'caption', 'role', 'imagePrompt', 'imagenPrompt', 'motionPrompt', 'imageSource'].forEach(function (key) {
        if (value[key] !== undefined && typeof value[key] !== 'string') errors.push(error('invalid-display-text', at + '.' + key, 'Expected a display string.'));
      });
    }
    if (!isObject(data)) { errors.push(error('invalid-native-resource', path + '.data', 'Expected a native resource object.')); return; }
    if (item.type === 'image') {
      imageBackup(data.originalImage, path + '.data.originalImage');
      // Saved view overrides can replace the image, captions and labels after
      // validation. This profile authors native still-image fields, not runtime
      // annotation state; reject such state explicitly instead of losing it.
      if (profile !== 'native' && data.annotations !== undefined && (!isObject(data.annotations) || Object.keys(data.annotations).length)) errors.push(error('unsupported-image-annotations', path + '.data.annotations', 'Saved image-view annotations require profile: native; no annotations are removed automatically.'));
      ['prompt', 'title', 'caption'].forEach(function (key) {
        if (data[key] !== undefined && typeof data[key] !== 'string') errors.push(error('invalid-display-text', path + '.data.' + key, 'Expected a display string.'));
      });
      if (data.visualPlan !== undefined && !isObject(data.visualPlan)) errors.push(error('invalid-visual-plan', path + '.data.visualPlan', 'Expected a native visual plan object.'));
      if (isObject(data.visualPlan)) ['title', 'summary', 'description', 'layout'].forEach(function (key) {
        if (data.visualPlan[key] !== undefined && typeof data.visualPlan[key] !== 'string') errors.push(error('invalid-display-text', path + '.data.visualPlan.' + key, 'Expected a display string.'));
      });
      var panels = isObject(data.visualPlan) ? data.visualPlan.panels : null;
      if (!Array.isArray(panels) || !panels.length) {
        if (typeof data.imageUrl !== 'string' || !data.imageUrl) errors.push(error('invalid-image-resource', path + '.data', 'Use visualPlan.panels or a native imageUrl with altText.'));
        return;
      }
      eachValidation(panels, errors, function (panel, i) {
        var at = path + '.data.visualPlan.panels[' + i + ']';
        if (!isObject(panel)) { errors.push(error('invalid-image-panel', at, 'Each panel must be an object.')); return; }
        imageBackup(panel.originalImage, at + '.originalImage');
        if (panel.id !== undefined && typeof panel.id !== 'string' && !Number.isFinite(panel.id)) errors.push(error('invalid-panel-id', at + '.id', 'Panel ids must be strings or finite numbers.'));
        var hasFrames = profile === 'native' && Array.isArray(panel.frames) && panel.frames.length > 0;
        if (!text(panel.imageUrl) && !hasFrames && !text(panel.prompt) && !text(panel.imagePrompt) && !text(panel.imagenPrompt)) errors.push(error('empty-image-panel', at, 'Supply artwork or a prompt for a planned image slot.'));
        else if (!text(panel.imageUrl) && !hasFrames) warnings.push({ code: 'image-slot-unfilled', path: at + '.imageUrl', message: 'This planned panel still needs artwork. Attach and inspect the actual image before distribution.' });
        ['caption', 'title', 'role', 'prompt', 'imagePrompt', 'imagenPrompt', 'motionPrompt'].forEach(function (key) {
          if (panel[key] !== undefined && typeof panel[key] !== 'string') errors.push(error('invalid-display-text', at + '.' + key, 'Expected a display string.'));
        });
        if (profile !== 'native' && (panel.type === 'process_animation' || (panel.frames !== undefined && (!Array.isArray(panel.frames) || panel.frames.length > 0)))) errors.push(error('unsupported-animation-profile', at, 'Animations require profile: native. Preserve the original pack when selecting a compatible profile.'));
        if (panel.labels !== undefined) {
          if (!Array.isArray(panel.labels)) errors.push(error('invalid-image-labels', at + '.labels', 'Labels must be an array.'));
          else eachValidation(panel.labels, errors, function (label, j) {
            var labelPath = at + '.labels[' + j + ']';
            if (!isObject(label)) { errors.push(error('invalid-image-label', labelPath, 'Expected an editable label object.')); return; }
            if (label.id !== undefined && typeof label.id !== 'string' && !Number.isFinite(label.id)) errors.push(error('invalid-label-id', labelPath + '.id', 'Label ids must be strings or finite numbers.'));
            required(label.text, labelPath + '.text');
            if (label.position !== undefined && typeof label.position !== 'string') errors.push(error('invalid-display-text', labelPath + '.position', 'Label positions must be strings.'));
            ['anchorX', 'anchorY'].forEach(function (axis) {
              if (label[axis] !== undefined && (!Number.isFinite(label[axis]) || label[axis] < 0 || label[axis] > 100)) errors.push(error('invalid-label-anchor', labelPath + '.' + axis, 'Label anchors must be percentages from 0 to 100.'));
            });
          });
        }
      });
    } else if (item.type === 'memory-aid') {
      required(data.title, path + '.data.title');
      required(data.instructions, path + '.data.instructions');
      if (!Array.isArray(data.cards) || !data.cards.length) errors.push(error('invalid-memory-cards', path + '.data.cards', 'Memory aids need native cards.'));
      else {
        var ids = Object.create(null);
        var types = ['acronym-acrostic', 'rhyme-rhythm', 'chunking', 'story-chain', 'keyword-association', 'visual-association', 'analogy-pattern', 'sequence-cue'];
        eachValidation(data.cards, errors, function (card, i) {
          var at = path + '.data.cards[' + i + ']';
          if (!isObject(card)) { errors.push(error('invalid-memory-card', at, 'Expected a memory card object.')); return; }
          if (!text(card.id) || ids[card.id]) errors.push(error('duplicate-or-missing-id', at + '.id', 'Cards need unique ids.'));
          if (typeof card.id === 'string') ids[card.id] = true;
          ['target', 'aiExample', 'mapping', 'studentPrompt', 'reasoningPrompt'].forEach(function (key) { required(card[key], at + '.' + key); });
          strings(card.essentialFacts, at + '.essentialFacts');
          if (types.indexOf(card.type) === -1) errors.push(error('invalid-memory-type', at + '.type', 'Use a native memory-aid type.'));
        });
      }
    } else if (item.type === 'applied-challenge') {
      required(data.title, path + '.data.title');
      required(data.instructions, path + '.data.instructions');
      if (['investigate', 'design', 'decide', 'propose', 'explore'].indexOf(data.family) === -1) errors.push(error('invalid-challenge-family', path + '.data.family', 'Use a native challenge family.'));
      if (!isObject(data.brief)) errors.push(error('invalid-challenge-brief', path + '.data.brief', 'Expected a native challenge brief.'));
      else {
        if (data.brief.family !== data.family) errors.push(error('challenge-family-mismatch', path + '.data.brief.family', 'The brief and resource family must match.'));
        ['context', 'role', 'audience', 'drivingQuestion', 'deliverable'].forEach(function (key) { required(data.brief[key], path + '.data.brief.' + key); });
        ['lockedLessonFacts', 'criteria', 'constraints'].forEach(function (key) { strings(data.brief[key], path + '.data.brief.' + key); });
      }
      if (!isObject(data.supports)) errors.push(error('invalid-challenge-supports', path + '.data.supports', 'Expected native challenge supports.'));
    }
  }

  function validatePack(pack, options) {
    var errors = [], warnings = [], strict = !options || options.strict !== false;
    var profile = options && options.profile !== undefined ? options.profile : 'text';
    if (['text', 'illustrated', 'native'].indexOf(profile) === -1) return bad([error('invalid-pack-profile', 'profile', 'Use text, illustrated, or native.')]);
    var illustrated = mediaProfile(profile), native = profile === 'native', nativeModule = native ? resolveNativeModule() : null;
    if (native && !nativeModule) return bad([error('native-validator-unavailable', 'profile', 'Load agent_core_pack_native_module.js before validating native resources.')]);
    if (!isObject(pack)) return bad([error('invalid-pack', 'pack', 'AlloPack must be an object.')]);
    var serialized;
    try { serialized = JSON.stringify(pack); } catch (_) { return bad([error('invalid-json-pack', 'pack', 'Pack must be JSON serializable.')]); }
    var maxChars = illustrated ? MAX_ILLUSTRATED_CHARS : MAX_PACK_CHARS;
    if (serialized.length > maxChars) return bad([error('pack-too-large', 'pack', 'Serialized AlloPack exceeds ' + maxChars + ' characters.')]);
    if (!Array.isArray(pack.history) || !pack.history.length || pack.history.length > MAX_PLAN_ITEMS + 8) return bad([error('invalid-history', 'pack.history', 'history must contain between 1 and ' + (MAX_PLAN_ITEMS + 8) + ' items.')]);
    var mediaReport = null;
    if (illustrated) {
      var media = resolveMediaModule();
      if (!media) return bad([error('media-validator-unavailable', 'profile', 'The illustrated pack media module must be available.')]);
      mediaReport = media.validatePackMedia(pack, { profile: profile });
      errors = boundedDiagnostics(mediaReport.errors);
      warnings = boundedDiagnostics(mediaReport.warnings);
      if (textSize(pack) > MAX_PACK_CHARS) return bad([error('pack-text-too-large', 'pack', 'Instructional text exceeds ' + MAX_PACK_CHARS + ' characters.')], warnings);
    }
    if (!isObject(pack.allopack) || pack.allopack.spec !== ALLOPACK_SPEC) errors.push(error('invalid-envelope', 'pack.allopack.spec', 'AlloPack spec must be ' + ALLOPACK_SPEC + '.'));
    if (!text(pack.sourceTopic)) errors.push(error('missing-source-topic', 'pack.sourceTopic', 'sourceTopic is required.'));
    if (isObject(pack.allopack)) {
      ['title', 'language', 'gradeLevel', 'createdAt'].forEach(function (key) { if (!text(pack.allopack[key])) errors.push(error('missing-envelope-field', 'pack.allopack.' + key, key + ' is required.')); });
    }
    var ids = Object.create(null), resourcesById = Object.create(null);
    eachValidation((Array.isArray(pack.history) ? pack.history : []), errors, function (item, index) {
      var itemPath = 'pack.history[' + index + ']';
      if (!isObject(item)) { errors.push(error('invalid-item', itemPath, 'Every history entry must be an object.')); return; }
      if (!text(item.id) || ids[item.id]) errors.push(error('duplicate-or-missing-id', itemPath + '.id', 'Every item needs a unique id.'));
      if (typeof item.id === 'string') { ids[item.id] = true; resourcesById[item.id] = item; }
      var registeredType = supportedType(item.type, profile);
      if (!registeredType) errors.push(error('unregistered-type', itemPath + '.type', 'Unsupported AlloPack type: ' + text(item.type, '(non-string or empty)') + '.'));
      if (!text(item.title) || item.title.length > MAX_TITLE_CHARS) errors.push(error('invalid-item-title', itemPath + '.title', 'Every item needs a bounded title.'));
      if (typeof item.meta !== 'string' && !(illustrated && item.meta === undefined)) errors.push(error('invalid-meta', itemPath + '.meta', 'meta must be a display string when present.'));
      if ((illustrated ? textSize(item) : JSON.stringify(item).length) > MAX_ITEM_CHARS) { errors.push(error('item-too-large', itemPath, 'Resource instructional text exceeds the size limit.')); return; }
      if (registeredType) {
        if (TYPE_SET[item.type]) validateType(item, itemPath, errors, warnings, profile);
        else if (ILLUSTRATED_TYPES.indexOf(item.type) !== -1) validateIllustratedType(item, itemPath, errors, warnings, profile);
        else if (!nativeModule.validateResource(item, itemPath, errors, warnings)) errors.push(error('native-contract-missing', itemPath + '.type', 'No native renderer contract is available for this resource.'));
        if (errors.length < MAX_DIAGNOSTICS) validateNestedFields(item, itemPath, errors);
      }
    });
    // Resolve references after indexing the complete history so forward links work.
    eachValidation((Array.isArray(pack.history) ? pack.history : []), errors, function (item, index) {
      if (!isObject(item) || !isObject(item.data)) return;
      var data = item.data, at = 'pack.history[' + index + '].data';
      function reference(value, field) {
        if (!text(value)) errors.push(error('invalid-resource-reference', field, 'Use a non-empty resource ID.'));
        else if (!ids[value]) errors.push(error('unresolved-resource-reference', field, 'Reference must match a resource ID in this pack.'));
      }
      if (Array.isArray(data.objectives)) eachValidation(data.objectives, errors, function (objective, i) {
        if (!isObject(objective)) return;
        var objectivePath = at + '.objectives[' + i + ']';
        if (objective.resourceRef !== undefined) reference(objective.resourceRef, objectivePath + '.resourceRef');
        if (['game', 'responded', 'completed'].indexOf(objective.kind) !== -1) {
          if (text(objective.resourceRef) && resourcesById[objective.resourceRef]) {
            if (!canSupportGoal(resourcesById[objective.resourceRef], objective)) errors.push(error('incompatible-goal-resource', objectivePath, 'The linked resource cannot report completion for this goal.'));
          } else if (objective.kind === 'game' && objective.resourceRef === undefined && text(objective.gameType)) {
            // Legacy unbound game goals may match any compatible resource in this pack.
            if (!pack.history.some(function (candidate) { return canSupportGoal(candidate, objective); })) errors.push(error('unavailable-goal-game', objectivePath + '.gameType', 'No resource in this pack offers this game.'));
          }
        }
      });
      if (data.lessonRef !== undefined) {
        if (!isObject(data.lessonRef)) errors.push(error('invalid-lesson-reference', at + '.lessonRef', 'Use an object with a resourceId.'));
        else reference(data.lessonRef.resourceId, at + '.lessonRef.resourceId');
      }
    });
    scanUnsafe(pack, 'pack', errors, 0, native ? 16 : 8);
    if (privacyRisk(pack)) errors.push(error('privacy-risk-detected', 'pack', 'The generated pack appears to contain identifying or sensitive records.'));
    if (!illustrated && /data:image\//i.test(serialized)) errors.push(error('embedded-image-payload', 'pack', 'Use profile: illustrated to validate embedded PNG, JPEG or WebP artwork.'));
    if (strict && (!Array.isArray(pack.history) || !pack.history.some(function (item) { return item && item.type === 'directions'; }))) warnings.push({ code: 'missing-directions', path: 'pack.history', message: 'A student-ready pack should include directions.' });
    var result = errors.length ? bad(errors, warnings) : ok(clone(pack), warnings);
    if (mediaReport) result.media = mediaReport.stats;
    return result;
  }

  function previewPack(pack, options) {
    var report = validatePack(pack, Object.assign({}, options, { strict: false }));
    if (!report.ok) return { ok: false, errors: report.errors, warnings: report.warnings };
    return {
      ok: true, warnings: report.warnings, studentSafe: options && options.profile === 'native' ? undefined : true, metadataOnly: true, reviewRequired: true,
      title: pack.allopack.title, sourceTopic: pack.sourceTopic, media: report.media,
      resources: pack.history.map(function (item, index) {
        return { order: index + 1, id: item.id, type: item.type, title: item.title, hasData: item.data !== undefined,
          role: item.instructionalText && item.instructionalText.role,
          form: item.instructionalText && item.instructionalText.form };
      }),
      teacherReview: ['Check source fidelity and citations.', 'Preview the student route.', 'Confirm accessibility and answer keys.', 'Approve before distributing or publishing.']
    };
  }

  function exportPack(pack, options) {
    var report = validatePack(pack, Object.assign({}, options, { strict: false }));
    if (!report.ok) return { ok: false, errors: report.errors, warnings: report.warnings };
    var json = options && mediaProfile(options.profile) ? JSON.stringify(pack) : JSON.stringify(pack, null, 2) + '\n';
    return { ok: true, filename: text(pack.allopack.title, 'alloflow-resource-pack').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.allopack.json', contentType: 'application/json', bytes: json.length, json: json, warnings: report.warnings };
  }

  function attachImage(pack, attachment, options) {
    if (!options || !mediaProfile(options.profile)) return bad([error('illustrated-profile-required', 'profile', 'Image attachment requires profile: illustrated or native.')]);
    if (!isObject(pack) || !Array.isArray(pack.history)) return bad([error('invalid-pack', 'pack', 'Expected an AlloPack with history.')]);
    if (!isObject(attachment)) return bad([error('invalid-attachment', 'attachment', 'Expected a native image attachment.')]);
    var errors = [];
    var native = options.profile === 'native';
    var allowed = ['resourceId', 'slot', 'index', 'dataUrl', 'alt', 'decorative', 'altSource'].concat(native ? ['panelIndex', 'playbackDataUrl'] : []);
    eachValidation(Object.keys(attachment), errors, function (key) {
      if (allowed.indexOf(key) === -1) errors.push(error('unsupported-field', 'attachment.' + key, 'Unsupported attachment field.'));
    });
    if (!text(attachment.resourceId)) errors.push(error('missing-resource-id', 'attachment.resourceId', 'Name the target resource id.'));
    var slots = ['glossary', 'panel', 'anchor', 'sort'].concat(native ? ['single', 'timeline', 'frame', 'override', 'memory', 'challenge'] : []);
    if (slots.indexOf(attachment.slot) === -1) errors.push(error('invalid-image-slot', 'attachment.slot', 'Use a supported image slot for this profile.'));
    if (!Number.isInteger(attachment.index) || attachment.index < 0) errors.push(error('invalid-slot-index', 'attachment.index', 'Use a nonnegative native row index.'));
    if (attachment.panelIndex !== undefined && (attachment.slot !== 'frame' || !Number.isInteger(attachment.panelIndex) || attachment.panelIndex < 0)) errors.push(error('invalid-panel-index', 'attachment.panelIndex', 'panelIndex is a nonnegative integer used only for frame attachments.'));
    if (attachment.slot === 'frame' && attachment.panelIndex === undefined) errors.push(error('missing-panel-index', 'attachment.panelIndex', 'Frame attachments need a panelIndex and an existing frame index.'));
    if (attachment.slot === 'frame' && (typeof attachment.playbackDataUrl !== 'string' || !/^data:image\/gif;base64,/i.test(attachment.playbackDataUrl))) errors.push(error('missing-animation-playback', 'attachment.playbackDataUrl', 'Replace a frame together with a re-encoded playback GIF, so playing and stepping show the same animation.'));
    if (attachment.playbackDataUrl !== undefined && attachment.slot !== 'frame') errors.push(error('unexpected-animation-playback', 'attachment.playbackDataUrl', 'playbackDataUrl is used only with a frame attachment.'));
    if (typeof attachment.alt !== 'string' || attachment.alt.length > 250) errors.push(error('invalid-image-alt', 'attachment.alt', 'Provide image-specific alt text, at most 250 characters; use empty text only for decorative art.'));
    if (attachment.decorative !== undefined && typeof attachment.decorative !== 'boolean') errors.push(error('invalid-decorative', 'attachment.decorative', 'decorative must be boolean.'));
    if (attachment.altSource !== undefined && ['vision', 'author', 'planning'].indexOf(attachment.altSource) === -1) errors.push(error('invalid-alt-source', 'attachment.altSource', 'Use vision, author, or planning.'));
    if (errors.length) return bad(errors);
    var media = resolveMediaModule();
    if (!media) return bad([error('media-validator-unavailable', 'profile', 'The illustrated pack media module must be available.')]);
    var imageReport = media.inspectDataImage(attachment.dataUrl, { profile: options.profile });
    if (!imageReport.ok) return bad(imageReport.errors);
    if (attachment.slot === 'frame') {
      var playbackReport = media.inspectDataImage(attachment.playbackDataUrl, { profile: 'native' });
      if (!playbackReport.ok) return bad(playbackReport.errors);
    }
    var serialized;
    try { serialized = JSON.stringify(pack); } catch (_) { return bad([error('invalid-json-pack', 'pack', 'Pack must be JSON serializable.')]); }
    if (serialized.length > MAX_ILLUSTRATED_CHARS) return bad([error('pack-too-large', 'pack', 'Reduce the pack below the illustrated size cap before attaching artwork.')]);
    var next = JSON.parse(serialized);
    var item = next.history.find(function (row) { return row && row.id === attachment.resourceId; });
    if (!item) return bad([error('unknown-resource', 'attachment.resourceId', 'The resource id must belong to this pack.')]);
    var rows = null;
    if (attachment.slot === 'glossary' && item.type === 'glossary') rows = item.data;
    if (attachment.slot === 'panel' && item.type === 'image' && isObject(item.data) && isObject(item.data.visualPlan)) rows = item.data.visualPlan.panels;
    if (attachment.slot === 'anchor' && item.type === 'anchor-chart' && isObject(item.data)) rows = item.data.sections;
    if (attachment.slot === 'sort' && item.type === 'concept-sort' && isObject(item.data)) rows = item.data.items;
    if (native && attachment.slot === 'single' && item.type === 'image' && isObject(item.data) && !(isObject(item.data.visualPlan) && Array.isArray(item.data.visualPlan.panels) && item.data.visualPlan.panels.length)) rows = [item.data];
    if (native && attachment.slot === 'timeline' && item.type === 'timeline' && isObject(item.data)) rows = item.data.items;
    if (native && attachment.slot === 'memory' && item.type === 'memory-aid' && isObject(item.data)) rows = item.data.cards;
    if (native && attachment.slot === 'challenge' && item.type === 'applied-challenge' && isObject(item.data)) rows = [item.data.visual];
    if (native && ['frame', 'override'].indexOf(attachment.slot) !== -1 && item.type === 'image' && isObject(item.data) && isObject(item.data.visualPlan) && Array.isArray(item.data.visualPlan.panels)) {
      var panel = item.data.visualPlan.panels[attachment.slot === 'frame' ? attachment.panelIndex : attachment.index];
      if (!isObject(panel)) return bad([error('unknown-image-slot', 'attachment.index', 'Choose an existing native panel.')]);
      if (attachment.slot === 'frame') {
        if (!Array.isArray(panel.frames) || attachment.index >= panel.frames.length) return bad([error('unknown-image-slot', 'attachment.index', 'Choose an existing animation frame.')]);
        if (panel.frames[attachment.index] !== attachment.dataUrl && panel.imageUrl === attachment.playbackDataUrl) return bad([error('stale-animation-playback', 'attachment.playbackDataUrl', 'Changed frame artwork requires an updated playback GIF.')]);
        panel.frames[attachment.index] = attachment.dataUrl;
        panel.imageUrl = attachment.playbackDataUrl;
      } else {
        if (item.data.annotations === undefined) item.data.annotations = {};
        if (!isObject(item.data.annotations)) return bad([error('invalid-image-annotations', 'pack.history', 'Existing annotations must be a native object.')]);
        if (item.data.annotations.imageOverrides === undefined) item.data.annotations.imageOverrides = {};
        if (!isObject(item.data.annotations.imageOverrides)) return bad([error('invalid-image-annotations', 'pack.history', 'Existing image overrides must be a native map.')]);
        item.data.annotations.imageOverrides[attachment.index] = attachment.dataUrl;
      }
      rows = [panel];
    }
    var stateSlot = attachment.slot === 'frame' || attachment.slot === 'override';
    var rowIndex = stateSlot ? 0 : attachment.index;
    if (!Array.isArray(rows) || !isObject(rows[rowIndex])) return bad([error('unknown-image-slot', 'attachment.index', 'The slot and index must select an existing native row in the matching resource type.')]);
    var fields = media.IMAGE_FIELDS[stateSlot ? 'panel' : attachment.slot], row = rows[rowIndex];
    var changedDescription = row[fields.image] !== attachment.dataUrl || row[fields.alt] !== attachment.alt;
    if (!stateSlot) row[fields.image] = attachment.dataUrl;
    var describedImage = attachment.dataUrl;
    var hiddenArtwork = false;
    if (native && (stateSlot || attachment.slot === 'panel')) {
      var targetIndex = attachment.slot === 'frame' ? attachment.panelIndex : attachment.index;
      var overrides = item.data.annotations && item.data.annotations.imageOverrides;
      describedImage = (overrides && overrides[targetIndex]) || (Array.isArray(row.frames) && row.frames.length > 1 ? row.frames[0] : row.imageUrl);
      hiddenArtwork = attachment.slot !== 'override' && (!!(overrides && overrides[targetIndex]) || attachment.slot === 'frame' && attachment.index > 0 || attachment.slot === 'panel' && Array.isArray(row.frames) && row.frames.length > 1);
    }
    if (!hiddenArtwork) {
      row[fields.alt] = attachment.alt;
      if (fields.hash) row[fields.hash] = media.hashImage(describedImage);
      if (fields.source) row[fields.source] = attachment.altSource || 'planning';
      if (fields.decorative) row[fields.decorative] = attachment.decorative === true;
    }
    if (attachment.slot === 'challenge' && changedDescription) row.reviewed = false;
    if (attachment.slot === 'memory' && changedDescription) {
      row.visualNeedsReview = true;
      if (isObject(row.visualReview)) row.visualReview = Object.assign({}, row.visualReview, { status: 'unreviewed', reviewedAt: '' });
    }
    var attached = validatePack(next, options);
    if (attached.ok && hiddenArtwork) attached.warnings.push(error('image-description-preserved', 'attachment.alt', 'The changed artwork is not the image currently described by the renderer. Existing displayed-image alt metadata was preserved.'));
    return attached;
  }

  function compose(request) {
    var errors = [];
    if (!isObject(request)) return bad([error('invalid-request', 'request', 'Resource-pack compose request must be an object.')]);
    var allowed = { requestId: 1, title: 1, sourceTopic: 1, gradeLevel: 1, language: 1, standards: 1, standardsContext: 1, instructionalContext: 1, learningGoal: 1, author: 1, history: 1, privacy: 1, profile: 1 };
    eachValidation(Object.keys(request), errors, function (key) { if (!allowed[key]) errors.push(error('unsupported-field', 'request.' + key, 'Unsupported compose field.')); });
    if (request.profile !== undefined && ['text', 'illustrated', 'native'].indexOf(request.profile) === -1) errors.push(error('invalid-pack-profile', 'request.profile', 'Use text, illustrated, or native.'));
    if (!text(request.requestId)) errors.push(error('missing-request-id', 'request.requestId', 'requestId is required.'));
    if (!text(request.sourceTopic)) errors.push(error('missing-topic', 'request.sourceTopic', 'sourceTopic is required.'));
    if (!text(request.learningGoal)) errors.push(error('missing-learning-goal', 'request.learningGoal', 'learningGoal is required.'));
    if (!Array.isArray(request.history) || !request.history.length || request.history.length > MAX_PLAN_ITEMS + 8) errors.push(error('invalid-history', 'request.history', 'history must contain between 1 and ' + (MAX_PLAN_ITEMS + 8) + ' generated resources.'));
    if (!isObject(request.privacy) || request.privacy.confirmNoStudentPii !== true) errors.push(error('privacy-attestation-required', 'request.privacy.confirmNoStudentPii', 'Explicitly confirm that generated content contains no student-identifying information.'));
    if (!isObject(request.privacy) || request.privacy.confirmSourcePermission !== true) errors.push(error('source-permission-required', 'request.privacy.confirmSourcePermission', 'Explicitly confirm that the source may be used.'));
    scanUnsafe(request, 'request', errors, 0, request.profile === 'native' ? 16 : 8);
    if (errors.length) return bad(errors);
    var normalized = {
      profile: request.profile || 'text', requestId: text(request.requestId), title: text(request.title, text(request.sourceTopic, 'AlloFlow resource pack')),
      sourceTopic: text(request.sourceTopic), gradeLevel: text(request.gradeLevel, 'middle school'), language: text(request.language, 'en').toLowerCase(),
      standards: text(request.standards), standardsContext: clone(request.standardsContext || null),
      instructionalContext: normalizeInstructionalContext(request.instructionalContext, request),
      learningGoal: text(request.learningGoal), author: text(request.author, 'Agent Draft'), resourcePlan: []
    };
    var pack = normalizePack({ history: request.history }, normalized, { provider: 'agent-context', model: 'agent-selected', generatedAt: nowIso() });
    var report = validatePack(pack, { strict: true, profile: normalized.profile });
    if (!report.ok) return bad(report.errors, report.warnings);
    return ok(pack, report.warnings);
  }
  async function generate(request, provider) {
    var requestReport = validateRequest(request);
    if (!requestReport.ok) return requestReport;
    if (!provider || typeof provider.generateText !== 'function') return bad([error('provider-unavailable', 'provider', 'No approved text provider is configured for this deployment.')]);
    var normalized = requestReport.value;
    var generated = await provider.generateText(buildPrompt(normalized), { json: true, model: normalized.providerPolicy.model || undefined });
    var raw = parseProviderResult(generated);
    var pack = normalizePack(raw, normalized, { provider: provider.name, model: normalized.providerPolicy.model, generatedAt: nowIso() });
    if (pack.history.length !== normalized.resourcePlan.length || normalized.resourcePlan.some(function (row, index) { return !pack.history[index] || pack.history[index].type !== row.type; })) {
      return bad([error('resource-plan-mismatch', 'pack.history', 'Generated resource types, counts, and order must match the normalized request plan: ' + normalized.resourcePlan.map(function (row) { return row.type; }).join(', ') + '.')]);
    }
    var report = validatePack(pack, { strict: true, profile: normalized.profile });
    if (!report.ok) return bad(report.errors, report.warnings);
    return ok(pack, report.warnings);
  }

  function getCapabilities(profile) {
    profile = profile === undefined ? 'native' : profile;
    if (['text', 'illustrated', 'native'].indexOf(profile) === -1) return bad([error('invalid-pack-profile', 'profile', 'Use text, illustrated, or native.')]);
    var samples = {
      directions: { body: 'Read the source, compare two explanations, and support your reasoning with evidence.', objectives: [{ id: 'reflect', label: 'Explain which evidence supports your reasoning.', kind: 'manual' }] },
      simplified: 'This is a supplemental reading companion. Keep the original source available and use evidence from it to explain your thinking.',
      glossary: ['evidence', 'claim', 'reasoning', 'revision'].map(function (term, i) { return { term: term, def: ['Information used to support or question an explanation.', 'An idea offered for consideration.', 'An explanation of how evidence supports an idea.', 'A change made after reconsidering an idea.'][i], tier: 'Academic' }; }),
      outline: { structureType: 'Structured Outline', main: 'Compare explanations', branches: [{ title: 'First explanation', items: ['Claim', 'Supporting evidence'] }, { title: 'Second explanation', items: ['Claim', 'Supporting evidence'] }] },
      quiz: { questions: [
        { type: 'mcq', question: 'What best supports a claim?', options: ['Relevant evidence', 'Volume', 'Speed', 'Repetition'], correctAnswer: 'Relevant evidence' },
        { type: 'shortAnswer', question: 'How does the evidence connect to your claim?', expectedAnswer: 'Explains the connection using a relevant source detail.' },
        { type: 'shortAnswer', question: 'What remains uncertain?', expectedAnswer: 'Identifies a limit or question that the source does not resolve.' }
      ], reflections: [{ text: 'What helped you reconsider your reasoning?' }] },
      'sentence-frames': { mode: 'list', items: [{ text: 'My claim is ___. The evidence ___ supports it because ___.' }], rubric: 'Connect a claim to relevant evidence with reasoning.' },
      faq: [{ question: 'What counts as evidence?', answer: 'Information relevant to the question and supported by the source.' }, { question: 'Must I change my claim?', answer: 'Explain why the evidence supports keeping or revising it.' }],
      'concept-sort': { categories: [{ id: 'observation', label: 'Observation' }, { id: 'inference', label: 'Inference' }], items: [{ id: 's1', content: 'The record lists three trials.', categoryId: 'observation' }, { id: 's2', content: 'Two recorded values are equal.', categoryId: 'observation' }, { id: 's3', content: 'Another trial might differ.', categoryId: 'inference' }, { id: 's4', content: 'The variation may have several explanations.', categoryId: 'inference' }] },
      timeline: { progressionLabel: 'Inquiry steps', items: [{ date: 'First', event: 'Ask a question.' }, { date: 'Next', event: 'Gather evidence.' }, { date: 'Then', event: 'Explain what the evidence supports.' }] },
      math: { problems: [1, 2, 3].map(function (n) { return { question: n + ' + 1 = ?', answer: String(n + 1), steps: [{ explanation: 'Add one to ' + n + '.' }] }; }) },
      'note-taking': { templateType: 'cornell-notes', title: 'Reasoning record', cues: [{ id: 'c1', text: 'Evidence', guidance: 'Explain what this evidence supports.' }], notes: [{ id: 'n1', text: '' }], summary: '' },
      'anchor-chart': { title: 'Reason with evidence', sections: [{ label: 'Notice', bullets: ['Identify information in the source.'] }, { label: 'Explain', bullets: ['Connect the information to your claim.'] }] },
      image: { visualPlan: { title: 'Compare evidence', panels: [{ id: 'panel-1', title: 'A record and a question', prompt: 'Cut-paper illustration of a blank notebook beside a question bubble.', caption: 'What would you need to record to investigate your question?' }] } },
      'memory-aid': { title: 'Remember the reasoning steps', instructions: 'Use the example, explain its meaning, then make your own.', cards: [{ id: 'm1', type: 'acronym-acrostic', target: 'Claim, evidence, reasoning', essentialFacts: ['A claim needs relevant evidence and an explanation of the connection.'], aiExample: 'CER: Claim, Evidence, Reasoning.', mapping: 'Each letter stands for one part of an explanation.', studentPrompt: 'Create a reminder for the three parts.', reasoningPrompt: 'Explain how your reminder preserves their meanings.' }] },
      'applied-challenge': { title: 'Choose an investigation', instructions: 'Compare two possible questions and justify which to investigate.', family: 'decide', brief: { family: 'decide', context: 'The class can investigate one question.', role: 'Investigation planner', audience: 'Your class', drivingQuestion: 'Which question can our evidence help answer?', deliverable: 'A recommendation with reasons and limits.', lockedLessonFacts: ['Use only the supplied source and records.'], criteria: ['Match evidence to the question.'], constraints: ['Explain any information still needed.'] }, supports: { vocabulary: [], sentenceFrames: [], checkpoints: [] } }
    };
    var types = profile === 'native' ? NATIVE_TYPES : profile === 'illustrated' ? ILLUSTRATED_TYPES : MAX_TYPES;
    var contracts = types.filter(function (type) { return Object.prototype.hasOwnProperty.call(samples, type); }).map(function (type) {
      return { type: type, description: 'Native ' + type + ' resource; example includes renderer-critical fields.', example: { id: 'example-' + type, type: type, title: 'Example ' + type, meta: 'Authoring example for review', data: samples[type] } };
    });
    if (profile === 'native') {
      var mod = resolveNativeModule();
      if (!mod) return bad([error('native-validator-unavailable', 'profile', 'Native resource contracts are unavailable.')]);
      contracts = contracts.concat(mod.getContracts().map(function (contract) {
        var entry = clone(contract);
        entry.example = isObject(entry.example) && entry.example.type === entry.type && entry.example.data !== undefined ? entry.example : { id: 'example-' + entry.type, type: entry.type, title: 'Example ' + entry.type, meta: 'Authoring example for review', data: entry.example };
        return entry;
      }));
      var noteContract = contracts.find(function (contract) { return contract.type === 'note-taking'; });
      noteContract.templates = NOTE_TEMPLATES.slice();
      noteContract.variants = [
        { templateType: 'lab-report', title: 'Investigation record', question: 'What can our evidence show?', hypothesis: '', materials: [], procedure: [], data: '', analysis: '', conclusion: '' },
        { templateType: 'reading-response', title: 'Reading response', author: '', pageRange: '', favoriteLine: '', thinkings: '', connection: { type: 'text-to-self', text: '' }, question: '' },
        { templateType: 'double-entry', title: 'Quote and response', entries: [{ id: 'entry-1', quote: '', response: '' }] },
        { templateType: 'guided-notes', title: 'Reasoning notes', blanks: [{ id: 'blank-1', before: 'A claim is supported by relevant ', answer: 'evidence', after: '.', studentAnswer: '' }], notesExtra: '' },
        { templateType: 'q-and-a', title: 'Study questions', pairs: [{ id: 'pair-1', question: 'How can evidence support a claim?', answer: 'Explain the connection between the evidence and the claim.' }] }
      ];
    }
    var mathContract = contracts.find(function (contract) { return contract.type === 'math'; });
    if (mathContract) mathContract.graphData = { format: 'static-svg', maxCharacters: 120000, maxElements: 2048, maxDepth: 32, description: 'Optional static SVG using shapes, paths, text, gradients, clip paths and markers. Use presentation attributes; scripts, animation, CSS, hyperlinks, image/use elements, foreign content and external references are rejected.', example: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" role="img" aria-label="Triangle"><path d="M10 70 L50 10 L90 70 Z" fill="#fde68a" stroke="#334155"/></svg>' };
    return { ok: true, profile: profile, resourceTypes: types.slice(), contracts: contracts,
      limits: { maxDiagnostics: MAX_DIAGNOSTICS, maxDiagnosticPathCharacters: 600, maxDiagnosticMessageCharacters: 2000, maxResources: MAX_PLAN_ITEMS + 8, maxSerializedCharacters: mediaProfile(profile) ? MAX_ILLUSTRATED_CHARS : MAX_PACK_CHARS, maxTextCharacters: MAX_PACK_CHARS, maxResourceTextCharacters: MAX_ITEM_CHARS, maxDepth: profile === 'native' ? 16 : 8, media: mediaProfile(profile) && resolveMediaModule() ? clone(resolveMediaModule().LIMITS) : null },
      imageFormats: profile === 'native' ? ['png', 'jpeg', 'webp', 'gif (animation panels with still frames)'] : profile === 'illustrated' ? ['png', 'jpeg', 'webp'] : [],
      attachmentSlots: profile === 'native' ? ['glossary', 'panel', 'anchor', 'sort', 'timeline', 'single', 'frame', 'override', 'memory', 'challenge'] : profile === 'illustrated' ? ['glossary', 'panel', 'anchor', 'sort'] : [],
      limitations: ['Validation and preview do not render the app or establish educator approval.', 'The MCP does not generate media, call models, execute simulations, fetch URLs, or publish packs.', 'Native catalog tools can require an app runtime and configured model for their live interactions; gemini-bridge contains app-building prompts.', 'Standalone audio/video files and specialized learner submissions are not authored resource contracts. STEAM tools launch in the app rather than becoming 3D model payloads in math resources.'] };
  }

  function validateRevisionResource(item) {
    var errors = [], warnings = [];
    if (!isObject(item)) return bad([error('invalid-item', 'resource', 'Expected a native resource.')]);
    if (TYPE_SET[item.type]) validateType(item, 'resource', errors, warnings, 'native');
    else if (ILLUSTRATED_TYPES.indexOf(item.type) !== -1) validateIllustratedType(item, 'resource', errors, warnings, 'native');
    else {
      var nativeModule = resolveNativeModule();
      if (!nativeModule || !nativeModule.validateResource(item, 'resource', errors, warnings)) errors.push(error('native-contract-missing', 'resource.type', 'This native resource contract is unavailable.'));
    }
    validateNestedFields(item, 'resource', errors);
    return { ok: errors.length === 0, errors: boundedDiagnostics(errors), warnings: boundedDiagnostics(warnings) };
  }

  var api = {
    CONTRACT_VERSION: CONTRACT_VERSION, ALLOPACK_SPEC: ALLOPACK_SPEC, MAX_TYPES: MAX_TYPES.slice(), ILLUSTRATED_TYPES: ILLUSTRATED_TYPES.slice(), NATIVE_TYPES: NATIVE_TYPES.slice(),
    getCapabilities: getCapabilities,
    validateRevisionResource: validateRevisionResource,
    validateRequest: validateRequest, buildPrompt: buildPrompt, normalizePack: normalizePack,
    validatePack: validatePack, previewPack: previewPack, exportPack: exportPack, attachImage: attachImage, compose: compose, generate: generate
  };
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreResourcePack = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
