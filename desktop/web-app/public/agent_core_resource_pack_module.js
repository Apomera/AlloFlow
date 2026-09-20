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
    var out = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
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
    var raw = JSON.stringify(value || '', function (key, child) {
      // Scan text, not encoded pixels. Embedded-image policy is enforced separately.
      return typeof child === 'string' && /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/i.test(child) ? '[image bytes]' : child;
    });
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
        if (typeof type !== 'string' || !TYPE_SET[type]) errors.push(error('unsupported-resource-type', path + '.type', 'Unsupported resource type: ' + text(type, '(non-string or empty)') + '.'));
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
      'All resource ids must be unique. All display fields must be strings, never nested objects. Use the requested type shapes: directions.data is markdown or {body,objectives}; simplified.data is markdown; glossary.data is an array of {term,def,tier}; outline.data is {main,branches:[{title,items}]}; quiz.data is {questions,reflections}; sentence-frames.data is {mode:"list",items:[{text}],rubric}; faq.data is an array of {question,answer}; concept-sort.data is {categories,items}; timeline.data is {progressionLabel,items:[{date,event}]}; math.data is {problems:[{question,answer,steps:[{explanation}]}]}; note-taking.data is {templateType:"cornell-notes",cues,notes}; anchor-chart.data is {title,sections:[{label,bullets}]}',
      'Nested field contract: concept-sort categories are {id,label,color} with unique ids; cards are {id,content,categoryId} with unique ids and matching categoryId. Quiz questions use {type:"mcq",question,options:[four distinct strings],correctAnswer:exact option text,conceptLabel} or {type:"shortAnswer",question,expectedAnswer,conceptLabel}; reflections are [{text}]. Directions objectives need unique id, label and kind (manual, game, xp, visited, responded, completed, time); automatic visited/responded/completed/time goals require resourceRef, game goals need gameType supported by their resource, and time goals need minutes >= 1. Optional resourceRef and lessonRef.resourceId must match an ID in this pack. Sequence principleOptions must include the exact orderingPrinciple. Time-goal labels describe observed engagement, such as Spent 10 minutes; goals are formative guides and do not block access to activities. Cornell cues are [{id,text}] and notes are matching blank note rows. Outline items and anchor-chart bullets are arrays of strings. Preserve paragraphs, markdown tables, and line breaks inside content strings. Include every requested resource, in the requested order.',
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
          meta: value.meta === undefined ? '' : value.meta,
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
        if (!isObject(question)) { errors.push(error('invalid-quiz-question', path + '.data.questions[' + index + ']', 'Each quiz question must be an object.')); return; }
        if (!text(question.question)) errors.push(error('invalid-quiz-question', path + '.data.questions[' + index + '].question', 'Each quiz question needs text.'));
        if (question.type && ['mcq', 'shortAnswer', 'short-answer', 'multi-select', 'fill-blank', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'].indexOf(question.type) === -1) errors.push(error('unsupported-quiz-type', path + '.data.questions[' + index + '].type', 'Use a recognized native quiz type.'));
        if ((!question.type || question.type === 'mcq') && (!Array.isArray(question.options) || question.options.length !== 4 || question.options.indexOf(question.correctAnswer) === -1)) errors.push(error('invalid-quiz-options', path + '.data.questions[' + index + ']', 'MCQ options must contain exactly four choices and the exact correctAnswer.'));
        if ((question.type === 'shortAnswer' || question.type === 'short-answer') && !text(question.expectedAnswer)) errors.push(error('invalid-quiz-answer', path + '.data.questions[' + index + ']', 'Short-answer questions need expectedAnswer.'));
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

  // Validate the nested fields that the app renders directly. Structural errors
  // must be actionable paths, never a thrown TypeError or an exported [object Object].
  function validateNestedFields(item, path, errors) {
    var data = item.data;
    function required(value, at) {
      if (!text(value)) errors.push(error('invalid-display-text', at, 'Expected a non-empty display string.'));
    }
    function strings(values, at) {
      if (!Array.isArray(values) || !values.length) { errors.push(error('invalid-text-list', at, 'Expected a non-empty list of display strings.')); return; }
      values.forEach(function (value, i) { required(value, at + '[' + i + ']'); });
    }
    function rows(values, at, visit) {
      if (!Array.isArray(values)) return;
      values.forEach(function (value, i) {
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
      rows(data.items, path + '.data.items', function (row, at) { required(row.content, at + '.content'); required(row.categoryId, at + '.categoryId'); });
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
      rows(data.cues, path + '.data.cues', function (row, at) { required(row.text, at + '.text'); });
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
        else data.reflections.forEach(function (row, i) {
          var value = isObject(row) ? (row.text || row.prompt || row.question || row.q || row.label || row.title) : row;
          required(value, path + '.data.reflections[' + i + ']');
        });
      }
    }
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
    var ids = Object.create(null), resourcesById = Object.create(null);
    (Array.isArray(pack.history) ? pack.history : []).forEach(function (item, index) {
      var itemPath = 'pack.history[' + index + ']';
      if (!isObject(item)) { errors.push(error('invalid-item', itemPath, 'Every history entry must be an object.')); return; }
      if (!text(item.id) || ids[item.id]) errors.push(error('duplicate-or-missing-id', itemPath + '.id', 'Every item needs a unique id.'));
      if (typeof item.id === 'string') { ids[item.id] = true; resourcesById[item.id] = item; }
      var registeredType = typeof item.type === 'string' && TYPE_SET[item.type];
      if (!registeredType) errors.push(error('unregistered-type', itemPath + '.type', 'Unsupported AlloPack type: ' + text(item.type, '(non-string or empty)') + '.'));
      if (!text(item.title) || item.title.length > MAX_TITLE_CHARS) errors.push(error('invalid-item-title', itemPath + '.title', 'Every item needs a bounded title.'));
      if (typeof item.meta !== 'string') errors.push(error('invalid-meta', itemPath + '.meta', 'meta must be a display string.'));
      if (JSON.stringify(item).length > MAX_ITEM_CHARS) errors.push(error('item-too-large', itemPath, 'Resource item exceeds the size limit.'));
      if (registeredType) { validateType(item, itemPath, errors, warnings); validateNestedFields(item, itemPath, errors); }
    });
    // Resolve references after indexing the complete history so forward links work.
    (Array.isArray(pack.history) ? pack.history : []).forEach(function (item, index) {
      if (!isObject(item) || !isObject(item.data)) return;
      var data = item.data, at = 'pack.history[' + index + '].data';
      function reference(value, field) {
        if (!text(value)) errors.push(error('invalid-resource-reference', field, 'Use a non-empty resource ID.'));
        else if (!ids[value]) errors.push(error('unresolved-resource-reference', field, 'Reference must match a resource ID in this pack.'));
      }
      if (Array.isArray(data.objectives)) data.objectives.forEach(function (objective, i) {
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
    scanUnsafe(pack, 'pack', errors, 0);
    if (privacyRisk(pack)) errors.push(error('privacy-risk-detected', 'pack', 'The generated pack appears to contain identifying or sensitive records.'));
    var serialized = JSON.stringify(pack);
    if (serialized.length > MAX_PACK_CHARS) errors.push(error('pack-too-large', 'pack', 'Serialized AlloPack exceeds ' + MAX_PACK_CHARS + ' characters.'));
    if (/data:image\//i.test(serialized)) errors.push(error('embedded-image-payload', 'pack', 'Use image slots or approved asset handles; do not embed image bytes.'));
    if (strict && (!Array.isArray(pack.history) || !pack.history.some(function (item) { return item && item.type === 'directions'; }))) warnings.push({ code: 'missing-directions', path: 'pack.history', message: 'A student-ready pack should include directions.' });
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
    if (pack.history.length !== normalized.resourcePlan.length || normalized.resourcePlan.some(function (row, index) { return !pack.history[index] || pack.history[index].type !== row.type; })) {
      return bad([error('resource-plan-mismatch', 'pack.history', 'Generated resource types, counts, and order must match the normalized request plan: ' + normalized.resourcePlan.map(function (row) { return row.type; }).join(', ') + '.')]);
    }
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
