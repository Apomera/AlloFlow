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
  var MAX_TITLE_CHARS = 240;
  var MAX_TYPES = [
    'directions', 'simplified', 'glossary', 'outline', 'quiz', 'sentence-frames',
    'faq', 'concept-sort', 'timeline', 'math', 'note-taking', 'anchor-chart'
  ];
  var TYPE_SET = Object.create(null);
  MAX_TYPES.forEach(function (type) { TYPE_SET[type] = true; });

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function text(value, fallback) {
    var out = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return out || (fallback || '');
  }
  function error(code, path, message) {
    return { code: code, path: path, message: message };
  }
  function ok(value, warnings) {
    return { ok: true, errors: [], warnings: warnings || [], value: value };
  }
  function bad(errors, warnings) {
    return { ok: false, errors: errors || [], warnings: warnings || [], value: null };
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
    var constraints = standardsContext && standardsContext.instructionalConstraints || {};
    var prohibited = constraints.textAccessExpectation === 'adaptation-prohibited'
      && (constraints.sourced === true || !!(constraints.basis || constraints.sourceUrl));
    var explicitAdapted = ['include', 'omit', 'prohibited'].indexOf(source.adaptedTextPolicy) !== -1
      ? source.adaptedTextPolicy : '';
    var effectiveAdapted = explicitAdapted === 'prohibited' && !prohibited ? 'omit' : explicitAdapted;
    return {
      schemaVersion: 1,
      instructionalGrade: text(source.instructionalGrade, text(request && request.gradeLevel)),
      primaryTextPolicy: source.primaryTextPolicy === 'educator-directed' ? 'educator-directed' : 'preserve-primary',
      primaryTextAccess: constraints.textAccessExpectation === 'preserve-primary' || prohibited ? 'required' : 'available',
      adaptedTextPolicy: prohibited ? 'prohibited' : (effectiveAdapted || 'include'),
      adaptedTextPolicySource: prohibited ? 'standard' : (explicitAdapted ? 'educator' : 'workflow-default'),
      textAccessReason: prohibited ? 'sourced-adaptation-prohibition' : (explicitAdapted ? 'educator-choice' : 'default-access-companion'),
      standardsContext: standardsContext,
      standardsFingerprint: text(source.standardsFingerprint)
    };
  }

  function scanUnsafe(value, path, errors, depth) {
    if (!value || typeof value !== 'object') return;
    if (depth > 8) {
      errors.push(error('payload-too-deep', path, 'Resource-pack payloads may not exceed 8 nesting levels.'));
      return;
    }
    Object.keys(value).forEach(function (key) {
      var next = path ? path + '.' + key : key;
      if (/(?:api[_-]?key|access[_-]?token|secret|password|credential)/i.test(key)) {
        errors.push(error('secret-like-field', next, 'Secret-like fields are not allowed in AlloPacks.'));
        return;
      }
      var child = value[key];
      if (typeof child === 'string' && /^(?:[A-Za-z]:[\\/]|\\\\|\/)/.test(child)) {
        errors.push(error('unsafe-path-value', next, 'Absolute filesystem paths are not allowed in AlloPacks.'));
      } else if (child && typeof child === 'object') scanUnsafe(child, next, errors, depth + 1);
    });
  }

  function privacyRisk(value) {
    var raw = JSON.stringify(value || '');
    var patterns = [
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
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
      privacy: 1, providerPolicy: 1, author: 1
    };
    Object.keys(request).forEach(function (key) {
      if (!allowed[key]) errors.push(error('unsupported-field', 'request.' + key, 'Unsupported request field.'));
    });
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
      request.resourcePlan.forEach(function (entry, index) {
        var path = 'request.resourcePlan[' + index + ']';
        var type = typeof entry === 'string' ? entry : (isObject(entry) ? entry.type : '');
        if (!TYPE_SET[type]) errors.push(error('unsupported-resource-type', path + '.type', 'Unsupported resource type: ' + type + '.'));
        if (isObject(entry)) {
          Object.keys(entry).forEach(function (key) {
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
    scanUnsafe(request, 'request', errors, 0);
    return errors.length ? bad(errors) : ok(normalizeRequest(request));
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
      requestId: text(request.requestId), title: text(request.title, text(request.sourceTopic, 'AlloFlow resource pack')),
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
      'All resource ids must be unique. Use the requested type shapes: directions.data is markdown or {body,objectives}; simplified.data is markdown; glossary.data is an array of {term,def,tier}; outline.data is {main,branches:[{title,items}]}; quiz.data is {questions,reflections}; sentence-frames.data is {mode:"list",items:[{text}],rubric}; faq.data is an array of {question,answer}; concept-sort.data is {categories,items}; timeline.data is {progressionLabel,items:[{date,event}]}; math.data is {problems:[{question,answer,steps:[{explanation}]}]}; note-taking.data is {templateType:"cornell-notes",cues,notes}; anchor-chart.data is {title,sections:[{label,bullets}]}',
      'Metadata: topic=' + request.sourceTopic + '; title=' + request.title + '; grade=' + request.gradeLevel + '; language=' + request.language + '; standards=' + (request.standards || 'not supplied') + '; standardsSnapshot=' + ((request.standardsContext && request.standardsContext.promptText) || 'not supplied') + '; primaryTextAccess=' + request.instructionalContext.primaryTextAccess + '; adaptedTextPolicy=' + request.instructionalContext.adaptedTextPolicy + '; goal=' + request.learningGoal + '.',
      'Requested resources:\n' + plan,
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
        return {
          id: text(value.id, 'resource-' + (index + 1)),
          type: type, title: text(value.title, text(value.type, 'Resource')),
          timestamp: text(value.timestamp, timestamp),
          data: value.data !== undefined ? value.data : value.content,
          meta: value.meta === undefined ? '' : String(value.meta),
          instructionalText: normalizeInstructionalText(value.instructionalText || (planned && planned.instructionalText), type, request)
        };
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

  function validateType(item, path, errors, warnings) {
    var data = item.data;
    if (item.type === 'directions') {
      if (!(typeof data === 'string' || isObject(data))) errors.push(error('invalid-directions', path + '.data', 'directions.data must be markdown or an object with body.'));
      if (isObject(data) && typeof data.body !== 'string') errors.push(error('invalid-directions-body', path + '.data.body', 'directions body is required.'));
    } else if (item.type === 'simplified') {
      if (typeof data !== 'string' || data.trim().length < 40) errors.push(error('invalid-simplified', path + '.data', 'simplified.data must be a meaningful markdown string.'));
    } else if (item.type === 'glossary') {
      if (!Array.isArray(data) || data.length < 4) errors.push(error('invalid-glossary', path + '.data', 'glossary.data needs at least four terms.'));
      else data.forEach(function (term, index) { if (!isObject(term) || !text(term.term) || !text(term.def)) errors.push(error('invalid-glossary-term', path + '.data[' + index + ']', 'Each glossary term needs term and def.')); });
    } else if (item.type === 'outline') {
      if (!isObject(data) || !text(data.main) || !Array.isArray(data.branches) || data.branches.length < 2) errors.push(error('invalid-outline', path + '.data', 'outline.data needs main and at least two branches.'));
    } else if (item.type === 'quiz') {
      if (!isObject(data) || !Array.isArray(data.questions) || data.questions.length < 3) errors.push(error('invalid-quiz', path + '.data', 'quiz.data needs at least three questions.'));
      else data.questions.forEach(function (question, index) {
        if (!isObject(question) || !text(question.question)) errors.push(error('invalid-quiz-question', path + '.data.questions[' + index + ']', 'Each quiz question needs text.'));
        if (question.type === 'mcq' && (!Array.isArray(question.options) || question.options.length !== 4 || question.options.indexOf(question.correctAnswer) === -1)) errors.push(error('invalid-quiz-options', path + '.data.questions[' + index + ']', 'MCQ options must contain exactly four choices and the exact correctAnswer.'));
        if (question.type === 'shortAnswer' && !text(question.expectedAnswer)) errors.push(error('invalid-quiz-answer', path + '.data.questions[' + index + ']', 'Short-answer questions need expectedAnswer.'));
      });
    } else if (item.type === 'sentence-frames') {
      if (!isObject(data) || data.mode !== 'list' || !Array.isArray(data.items) || !data.items.length || typeof data.rubric !== 'string') errors.push(error('invalid-sentence-frames', path + '.data', 'sentence-frames.data needs list items and a rubric.'));
    } else if (item.type === 'faq') {
      if (!Array.isArray(data) || data.length < 2 || data.some(function (row) { return !isObject(row) || !text(row.question) || !text(row.answer); })) errors.push(error('invalid-faq', path + '.data', 'faq.data needs question/answer rows.'));
    } else if (item.type === 'concept-sort') {
      if (!isObject(data) || !Array.isArray(data.categories) || data.categories.length < 2 || !Array.isArray(data.items) || data.items.length < 4) errors.push(error('invalid-concept-sort', path + '.data', 'concept-sort.data needs categories and items.'));
      else {
        var categoryIds = data.categories.map(function (category) { return category && category.id; });
        data.items.forEach(function (entry, index) { if (!entry || categoryIds.indexOf(entry.categoryId) === -1) errors.push(error('orphan-category', path + '.data.items[' + index + ']', 'Every concept-sort item must reference a category.')); });
      }
    } else if (item.type === 'timeline') {
      if (!isObject(data) || !text(data.progressionLabel) || !Array.isArray(data.items) || data.items.length < 3) errors.push(error('invalid-timeline', path + '.data', 'timeline.data needs a progressionLabel and events.'));
    } else if (item.type === 'math') {
      if (!isObject(data) || !Array.isArray(data.problems) || data.problems.length < 3) errors.push(error('invalid-math', path + '.data', 'math.data needs problems.'));
    } else if (item.type === 'note-taking') {
      if (!isObject(data) || data.templateType !== 'cornell-notes' || !Array.isArray(data.cues) || !Array.isArray(data.notes) || data.cues.length !== data.notes.length) errors.push(error('invalid-note-taking', path + '.data', 'note-taking.data needs matching Cornell cues and notes.'));
    } else if (item.type === 'anchor-chart') {
      if (!isObject(data) || !text(data.title) || !Array.isArray(data.sections) || data.sections.length < 2) errors.push(error('invalid-anchor-chart', path + '.data', 'anchor-chart.data needs a title and sections.'));
    } else warnings.push({ code: 'type-check-skipped', path: path + '.data', message: 'No deep renderer contract is available for this type yet.' });
  }

  function validatePack(pack, options) {
    var errors = [], warnings = [], strict = !options || options.strict !== false;
    if (!isObject(pack)) return bad([error('invalid-pack', 'pack', 'AlloPack must be an object.')]);
    if (!isObject(pack.allopack) || pack.allopack.spec !== ALLOPACK_SPEC) errors.push(error('invalid-envelope', 'pack.allopack.spec', 'AlloPack spec must be ' + ALLOPACK_SPEC + '.'));
    if (!text(pack.sourceTopic)) errors.push(error('missing-source-topic', 'pack.sourceTopic', 'sourceTopic is required.'));
    if (!Array.isArray(pack.history) || !pack.history.length || pack.history.length > MAX_PLAN_ITEMS + 8) errors.push(error('invalid-history', 'pack.history', 'history must contain between 1 and ' + (MAX_PLAN_ITEMS + 8) + ' items.'));
    if (isObject(pack.allopack)) {
      ['title', 'language', 'gradeLevel', 'createdAt'].forEach(function (key) { if (!text(pack.allopack[key])) errors.push(error('missing-envelope-field', 'pack.allopack.' + key, key + ' is required.')); });
    }
    var ids = Object.create(null);
    (pack.history || []).forEach(function (item, index) {
      var itemPath = 'pack.history[' + index + ']';
      if (!isObject(item)) { errors.push(error('invalid-item', itemPath, 'Every history entry must be an object.')); return; }
      if (!text(item.id) || ids[item.id]) errors.push(error('duplicate-or-missing-id', itemPath + '.id', 'Every item needs a unique id.'));
      ids[item.id] = true;
      if (!TYPE_SET[item.type]) errors.push(error('unregistered-type', itemPath + '.type', 'Unsupported AlloPack type: ' + item.type + '.'));
      if (!text(item.title) || item.title.length > MAX_TITLE_CHARS) errors.push(error('invalid-item-title', itemPath + '.title', 'Every item needs a bounded title.'));
      if (typeof item.meta !== 'string') errors.push(error('invalid-meta', itemPath + '.meta', 'meta must be a display string.'));
      if (JSON.stringify(item).length > MAX_ITEM_CHARS) errors.push(error('item-too-large', itemPath, 'Resource item exceeds the size limit.'));
      if (TYPE_SET[item.type]) validateType(item, itemPath, errors, warnings);
    });
    scanUnsafe(pack, 'pack', errors, 0);
    if (privacyRisk(pack)) errors.push(error('privacy-risk-detected', 'pack', 'The generated pack appears to contain identifying or sensitive records.'));
    var serialized = JSON.stringify(pack);
    if (serialized.length > MAX_PACK_CHARS) errors.push(error('pack-too-large', 'pack', 'Serialized AlloPack exceeds ' + MAX_PACK_CHARS + ' characters.'));
    if (/data:image\//i.test(serialized)) errors.push(error('embedded-image-payload', 'pack', 'Use image slots or approved asset handles; do not embed image bytes.'));
    if (strict && (!pack.history || !pack.history.some(function (item) { return item.type === 'directions'; }))) warnings.push({ code: 'missing-directions', path: 'pack.history', message: 'A student-ready pack should include directions.' });
    return errors.length ? bad(errors, warnings) : ok(clone(pack), warnings);
  }

  function previewPack(pack) {
    var report = validatePack(pack, { strict: false });
    if (!report.ok) return { ok: false, errors: report.errors, warnings: report.warnings };
    return {
      ok: true, warnings: report.warnings, studentSafe: true,
      title: pack.allopack.title, sourceTopic: pack.sourceTopic,
      resources: pack.history.map(function (item, index) {
        return { order: index + 1, id: item.id, type: item.type, title: item.title, hasData: item.data !== undefined,
          role: item.instructionalText && item.instructionalText.role,
          form: item.instructionalText && item.instructionalText.form };
      }),
      teacherReview: ['Check source fidelity and citations.', 'Preview the student route.', 'Confirm accessibility and answer keys.', 'Approve before distributing or publishing.']
    };
  }

  function exportPack(pack) {
    var report = validatePack(pack, { strict: false });
    if (!report.ok) return { ok: false, errors: report.errors, warnings: report.warnings };
    var json = JSON.stringify(pack, null, 2) + '\n';
    return { ok: true, filename: text(pack.allopack.title, 'alloflow-resource-pack').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.allopack.json', contentType: 'application/json', bytes: json.length, json: json, warnings: report.warnings };
  }

  function compose(request) {
    var errors = [];
    if (!isObject(request)) return bad([error('invalid-request', 'request', 'Resource-pack compose request must be an object.')]);
    var allowed = { requestId: 1, title: 1, sourceTopic: 1, gradeLevel: 1, language: 1, standards: 1, standardsContext: 1, instructionalContext: 1, learningGoal: 1, author: 1, history: 1, privacy: 1 };
    Object.keys(request).forEach(function (key) { if (!allowed[key]) errors.push(error('unsupported-field', 'request.' + key, 'Unsupported compose field.')); });
    if (!text(request.requestId)) errors.push(error('missing-request-id', 'request.requestId', 'requestId is required.'));
    if (!text(request.sourceTopic)) errors.push(error('missing-topic', 'request.sourceTopic', 'sourceTopic is required.'));
    if (!text(request.learningGoal)) errors.push(error('missing-learning-goal', 'request.learningGoal', 'learningGoal is required.'));
    if (!Array.isArray(request.history) || !request.history.length || request.history.length > MAX_PLAN_ITEMS + 8) errors.push(error('invalid-history', 'request.history', 'history must contain between 1 and ' + (MAX_PLAN_ITEMS + 8) + ' generated resources.'));
    if (!isObject(request.privacy) || request.privacy.confirmNoStudentPii !== true) errors.push(error('privacy-attestation-required', 'request.privacy.confirmNoStudentPii', 'Explicitly confirm that generated content contains no student-identifying information.'));
    if (!isObject(request.privacy) || request.privacy.confirmSourcePermission !== true) errors.push(error('source-permission-required', 'request.privacy.confirmSourcePermission', 'Explicitly confirm that the source may be used.'));
    scanUnsafe(request, 'request', errors, 0);
    if (errors.length) return bad(errors);
    var normalized = {
      requestId: text(request.requestId), title: text(request.title, text(request.sourceTopic, 'AlloFlow resource pack')),
      sourceTopic: text(request.sourceTopic), gradeLevel: text(request.gradeLevel, 'middle school'), language: text(request.language, 'en').toLowerCase(),
      standards: text(request.standards), standardsContext: clone(request.standardsContext || null),
      instructionalContext: normalizeInstructionalContext(request.instructionalContext, request),
      learningGoal: text(request.learningGoal), author: text(request.author, 'Agent Draft'), resourcePlan: []
    };
    var pack = normalizePack({ history: request.history }, normalized, { provider: 'agent-context', model: 'agent-selected', generatedAt: nowIso() });
    var report = validatePack(pack, { strict: true });
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
    var report = validatePack(pack, { strict: true });
    if (!report.ok) return bad(report.errors, report.warnings);
    return ok(pack, report.warnings);
  }

  var api = {
    CONTRACT_VERSION: CONTRACT_VERSION, ALLOPACK_SPEC: ALLOPACK_SPEC, MAX_TYPES: MAX_TYPES.slice(),
    validateRequest: validateRequest, buildPrompt: buildPrompt, normalizePack: normalizePack,
    validatePack: validatePack, previewPack: previewPack, exportPack: exportPack, compose: compose, generate: generate
  };
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreResourcePack = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
