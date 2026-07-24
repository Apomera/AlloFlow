/**
 * AlloFlow Agent Core — versioned contracts (Phase 0 of the federated agent
 * roadmap, docs/ALLOFLOW_FEDERATED_AGENT_ROADMAP_2026-07-14.md).
 *
 * Pure validators and converters for the CapabilityManifest, Blueprint, Job,
 * and Provenance contracts, plus the MCP tool-classification table. No React,
 * no network, no AI calls — usable in browser and Node. Adapters (Canvas
 * in-process, Desktop stdio MCP, district MCP) all consume THIS module so
 * educational semantics cannot fork per transport.
 *
 * Fail-closed policy: unknown schema versions, unknown tools, and unknown
 * deployment modes are validation errors. Unknown top-level fields are
 * dropped with a warning during normalization (explicit policy — additive
 * vendor fields never silently ride along into artifacts). Secret-like field
 * names anywhere in a payload are rejected outright.
 *
 * Dual-mode export: window.AlloModules.AgentCoreContracts in the app,
 * module.exports for the vitest suite (same pattern as allo_crypto_module.js).
 */
(function () {
  'use strict';

  var SCHEMA_VERSION = '1.0';

  var DEPLOYMENT_MODES = ['canvas', 'desktop-local', 'district-hosted', 'demo'];

  // Mirrors the phase_k fallback list; live callers should inject the
  // ToolCatalog registry (window.TOOL_CATALOG) instead of relying on this.
  var FALLBACK_TOOL_IDS = ['analysis', 'simplified', 'glossary', 'outline', 'image', 'quiz',
    'sentence-frames', 'brainstorm', 'timeline', 'concept-sort', 'adventure', 'faq', 'persona',
    'dbq', 'note-taking', 'anchor-chart', 'math', 'lesson-plan', 'gemini-bridge', 'alignment-report'];

  // Capability each blueprint tool needs from the provider registry.
  var TOOL_CAPABILITY = { image: 'imageGeneration' };
  var DEFAULT_CAPABILITY = 'text';

  // Blueprint tool → AlloCommands command id, where a live command contract
  // exists (PLAN_CONTRACTS in allo_commands_source.jsx). Lets the service
  // reuse getCommandContract semantics instead of duplicating them.
  var TOOL_TO_COMMAND = {
    quiz: 'generate_quiz',
    glossary: 'generate_glossary',
    simplified: 'generate_simplified',
    'sentence-frames': 'generate_sentence_frames',
    analysis: 'generate_analysis',
    outline: 'generate_outline'
  };

  var PERMISSIONS = ['artifact:read', 'artifact:draft', 'artifact:execute', 'artifact:export',
    'catalog:read', 'catalog:stage', 'catalog:publish'];
  var DEMO_ALLOWED_PERMISSIONS = ['artifact:read', 'artifact:draft', 'catalog:read'];

  // MCP tool names must satisfy Claude's API charset (letters, digits, _ , -).
  // No dots: clients namespace by server (mcp__alloflow__blueprint_create).
  var TOOL_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

  // Classification → MCP annotations. 'read-only' → readOnlyHint,
  // 'destructive' → destructiveHint; draft-writing/external-effect get neither
  // hint but are still non-read-only (explicit false keeps intent visible).
  var TOOL_CLASSIFICATION = [
    { name: 'capabilities', title: 'List AlloFlow capabilities', kind: 'read-only' },
    { name: 'get_state_summary', title: 'Summarize workspace state', kind: 'read-only' },
    { name: 'get_command_contracts', title: 'List command contracts', kind: 'read-only' },
    { name: 'blueprint_create', title: 'Draft a lesson Blueprint', kind: 'draft-writing' },
    { name: 'blueprint_get', title: 'Read a Blueprint', kind: 'read-only' },
    { name: 'blueprint_revise', title: 'Revise a Blueprint draft', kind: 'draft-writing' },
    { name: 'blueprint_validate', title: 'Validate a Blueprint', kind: 'read-only' },
    { name: 'blueprint_preview', title: 'Preview a Blueprint plan', kind: 'read-only' },
    { name: 'media_plan', title: 'Plan media operations', kind: 'read-only' },
    { name: 'blueprint_execute', title: 'Execute an approved Blueprint', kind: 'external-effect' },
    { name: 'job_get', title: 'Read job status', kind: 'read-only' },
    { name: 'job_cancel', title: 'Cancel a running job', kind: 'external-effect' },
    { name: 'job_get_result', title: 'Read job result artifacts', kind: 'read-only' },
    { name: 'artifact_validate', title: 'Validate an artifact', kind: 'read-only' },
    { name: 'artifact_preview', title: 'Preview an artifact', kind: 'read-only' },
    { name: 'artifact_export_allopack', title: 'Export an AlloPack', kind: 'external-effect' },
    { name: 'asset_generate_image', title: 'Generate an image asset', kind: 'external-effect' },
    { name: 'asset_edit_image', title: 'Edit an image asset', kind: 'external-effect' },
    { name: 'asset_attach', title: 'Attach an asset to an artifact', kind: 'draft-writing' },
    { name: 'catalog_search', title: 'Search the Community Library', kind: 'read-only' },
    { name: 'catalog_get', title: 'Read a Community Library entry', kind: 'read-only' },
    { name: 'catalog_validate_submission', title: 'Validate a library submission', kind: 'read-only' },
    { name: 'catalog_stage_submission', title: 'Stage a library submission for review', kind: 'publication' },
    { name: 'catalog_get_submission_status', title: 'Read submission review status', kind: 'read-only' }
  ];

  // Demo deployments may only advertise tools that cannot spend money,
  // write outside the workspace, or touch the public catalog write path.
  var DEMO_SAFE_TOOL_KINDS = { 'read-only': true, 'draft-writing': true };

  var JOB_STATUSES = ['queued', 'running', 'input_required', 'completed', 'failed', 'cancelled'];

  var SECRET_FIELD_RE = /(?:^|[_-])(?:api)?key$|token|secret|password|credential/i;
  var UNSAFE_PATH_RE = /^(?:[A-Za-z]:[\\/]|\\\\|\/)/;
  var MAX_SCAN_DEPTH = 8;

  // ── small helpers ──────────────────────────────────────────────────────

  function isPlainObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function err(code, path, message) {
    return { code: code, path: path, message: message };
  }

  // Recursively scan for secret-like field names and unsafe path-like string
  // values. Returns error objects; empty array = clean.
  function scanUnsafeFields(obj, path, out, depth) {
    if (!obj || typeof obj !== 'object') return out;
    if (depth > MAX_SCAN_DEPTH) {
      out.push(err('payload-too-deep', path, 'Contract payloads may not exceed ' + MAX_SCAN_DEPTH + ' levels of nesting.'));
      return out;
    }
    var keys = Array.isArray(obj) ? obj.map(function (_, i) { return i; }) : Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var p = path ? path + '.' + k : String(k);
      if (typeof k === 'string' && SECRET_FIELD_RE.test(k)) {
        out.push(err('secret-like-field', p, 'Field name "' + k + '" looks like a secret and is not allowed in contract payloads.'));
        continue;
      }
      var v = obj[k];
      if (typeof v === 'string' && UNSAFE_PATH_RE.test(v)) {
        out.push(err('unsafe-path-value', p, 'Absolute filesystem paths are not allowed in contract payloads.'));
      } else if (v && typeof v === 'object') {
        scanUnsafeFields(v, p, out, depth + 1);
      }
    }
    return out;
  }

  // ── tool classification / MCP annotations ─────────────────────────────

  function getToolClassification(name) {
    for (var i = 0; i < TOOL_CLASSIFICATION.length; i++) {
      if (TOOL_CLASSIFICATION[i].name === name) return TOOL_CLASSIFICATION[i];
    }
    return null;
  }

  /**
   * MCP annotations for a classified tool. Directory-submission requirement:
   * every tool carries `title` plus the applicable readOnly/destructive hint.
   */
  function getMcpAnnotations(name) {
    var c = getToolClassification(name);
    if (!c) return null;
    return {
      title: c.title,
      readOnlyHint: c.kind === 'read-only',
      destructiveHint: c.kind === 'destructive'
    };
  }

  function validateToolTable() {
    var errors = [];
    var seen = {};
    for (var i = 0; i < TOOL_CLASSIFICATION.length; i++) {
      var t = TOOL_CLASSIFICATION[i];
      if (!TOOL_NAME_RE.test(t.name)) errors.push(err('bad-tool-name', 'tools[' + i + ']', 'Tool name "' + t.name + '" violates [a-zA-Z0-9_-]{1,64}.'));
      if (seen[t.name]) errors.push(err('duplicate-tool', 'tools[' + i + ']', 'Duplicate tool "' + t.name + '".'));
      seen[t.name] = true;
      if (!t.title) errors.push(err('missing-title', 'tools[' + i + ']', 'Tool "' + t.name + '" is missing a title.'));
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function isDemoSafeTool(name) {
    var c = getToolClassification(name);
    return !!(c && DEMO_SAFE_TOOL_KINDS[c.kind]);
  }

  // ── CapabilityManifest ─────────────────────────────────────────────────

  var MODALITY_KEYS = ['text', 'vision', 'imageGeneration', 'imageEditing'];

  /**
   * Validate + normalize a CapabilityManifest. Returns
   * { ok, errors, warnings, value } — value is the normalized manifest when
   * ok, else null. Never echoes secrets (they fail validation instead).
   */
  function validateCapabilityManifest(input) {
    var errors = [];
    var warnings = [];
    if (!isPlainObject(input)) {
      return { ok: false, errors: [err('not-an-object', '', 'CapabilityManifest must be an object.')], warnings: [], value: null };
    }
    if (input.schemaVersion !== SCHEMA_VERSION) {
      errors.push(err('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '", got "' + input.schemaVersion + '".'));
    }
    if (DEPLOYMENT_MODES.indexOf(input.deploymentMode) === -1) {
      errors.push(err('unknown-deployment-mode', 'deploymentMode', 'deploymentMode must be one of ' + DEPLOYMENT_MODES.join(', ') + '.'));
    }
    scanUnsafeFields(input, '', errors, 0);

    var value = { schemaVersion: SCHEMA_VERSION, deploymentMode: input.deploymentMode };
    for (var i = 0; i < MODALITY_KEYS.length; i++) {
      var key = MODALITY_KEYS[i];
      var m = input[key];
      if (m === undefined) { value[key] = { available: false, providers: [] }; continue; }
      if (!isPlainObject(m) || typeof m.available !== 'boolean' || !Array.isArray(m.providers)) {
        errors.push(err('bad-modality', key, key + ' must be { available: boolean, providers: string[] }.'));
        continue;
      }
      value[key] = { available: m.available, providers: m.providers.map(String) };
    }
    value.speech = isPlainObject(input.speech)
      ? { tts: !!input.speech.tts, asr: !!input.speech.asr }
      : { tts: false, asr: false };
    value.webSearch = isPlainObject(input.webSearch) ? { available: !!input.webSearch.available } : { available: false };
    value.catalog = isPlainObject(input.catalog)
      ? { read: !!input.catalog.read, stage: !!input.catalog.stage }
      : { read: false, stage: false };

    var perms = Array.isArray(input.permissions) ? input.permissions.map(String) : [];
    for (var p = 0; p < perms.length; p++) {
      if (PERMISSIONS.indexOf(perms[p]) === -1) {
        errors.push(err('unknown-permission', 'permissions[' + p + ']', 'Unknown permission "' + perms[p] + '".'));
      }
    }
    value.permissions = perms;

    // Demo mode must not advertise privileged production capabilities.
    if (input.deploymentMode === 'demo') {
      for (var d = 0; d < perms.length; d++) {
        if (DEMO_ALLOWED_PERMISSIONS.indexOf(perms[d]) === -1) {
          errors.push(err('demo-privileged-permission', 'permissions[' + d + ']', 'Demo mode may not advertise "' + perms[d] + '".'));
        }
      }
      if (value.catalog.stage) {
        errors.push(err('demo-privileged-capability', 'catalog.stage', 'Demo mode may not advertise catalog staging.'));
      }
    }

    // Unknown top-level fields: dropped with a warning (explicit policy).
    var known = ['schemaVersion', 'deploymentMode', 'speech', 'webSearch', 'catalog', 'permissions'].concat(MODALITY_KEYS);
    Object.keys(input).forEach(function (k) {
      if (known.indexOf(k) === -1) warnings.push(err('unknown-field-dropped', k, 'Unknown field "' + k + '" was dropped.'));
    });

    return { ok: errors.length === 0, errors: errors, warnings: warnings, value: errors.length === 0 ? value : null };
  }

  // ── Blueprint ──────────────────────────────────────────────────────────

  var BLUEPRINT_KNOWN_FIELDS = ['schemaVersion', 'blueprintId', 'audience', 'standards', 'sourcePolicy',
    'lessonDNA', 'globalSettings', 'plan', 'configs', 'requiredCapabilities', 'warnings', 'review', 'provenance'];
  var REVIEW_STATES = ['draft', 'approved'];

  function normalizePlanItems(rawPlan, toolDirectives) {
    var items = [];
    var list = Array.isArray(rawPlan) ? rawPlan : [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var tool = typeof item === 'string' ? item : (item && (item.tool || item.type || item.id));
      if (!tool) continue;
      var directive = typeof item === 'string'
        ? ((toolDirectives && toolDirectives[tool]) || '')
        : (item.directive || item.instructions || item.customInstructions || (toolDirectives && toolDirectives[tool]) || '');
      items.push({ tool: String(tool), directive: String(directive || '') });
    }
    // Ordering invariant shared with phase_k/phase_o/ANTI: analysis first,
    // lesson-plan last.
    var analysis = items.filter(function (r) { return r.tool === 'analysis'; });
    var lessonPlan = items.filter(function (r) { return r.tool === 'lesson-plan'; });
    var rest = items.filter(function (r) { return r.tool !== 'analysis' && r.tool !== 'lesson-plan'; });
    return analysis.concat(rest, lessonPlan);
  }

  function requiredCapabilitiesForPlan(plan) {
    var caps = {};
    for (var i = 0; i < plan.length; i++) {
      caps[TOOL_CAPABILITY[plan[i].tool] || DEFAULT_CAPABILITY] = true;
    }
    return Object.keys(caps).sort();
  }

  /**
   * Validate + normalize a versioned Blueprint. opts.knownTools (string[])
   * overrides the fallback tool list — live callers pass the ToolCatalog ids.
   */
  function validateBlueprint(input, opts) {
    var options = opts || {};
    var knownTools = Array.isArray(options.knownTools) && options.knownTools.length ? options.knownTools : FALLBACK_TOOL_IDS;
    var errors = [];
    var warnings = [];
    if (!isPlainObject(input)) {
      return { ok: false, errors: [err('not-an-object', '', 'Blueprint must be an object.')], warnings: [], value: null };
    }
    if (input.schemaVersion !== SCHEMA_VERSION) {
      errors.push(err('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '", got "' + input.schemaVersion + '".'));
    }
    if (typeof input.blueprintId !== 'string' || !input.blueprintId.trim()) {
      errors.push(err('missing-blueprint-id', 'blueprintId', 'blueprintId is required.'));
    }
    scanUnsafeFields(input, '', errors, 0);

    var rawPlan = input.plan;
    if (!Array.isArray(rawPlan)) {
      errors.push(err('bad-plan', 'plan', 'plan must be a non-empty array of items shaped as { tool, directive }.'));
    } else {
      if (!rawPlan.length) {
        errors.push(err('empty-plan', 'plan', 'A Blueprint needs at least one plan item.'));
      }
      for (var rawIndex = 0; rawIndex < rawPlan.length; rawIndex++) {
        var rawItem = rawPlan[rawIndex];
        var rawTool = typeof rawItem === 'string' ? rawItem : (rawItem && (rawItem.tool || rawItem.type || rawItem.id));
        if (typeof rawTool !== 'string' || !rawTool.trim()) {
          errors.push(err('invalid-plan-item', 'plan[' + rawIndex + ']', 'Plan item must provide a non-empty "tool" string; canonical shape is { tool, directive }.'));
        }
      }
    }

    var plan = normalizePlanItems(rawPlan, null);
    for (var i = 0; i < plan.length; i++) {
      if (knownTools.indexOf(plan[i].tool) === -1) {
        errors.push(err('unknown-tool', 'plan[' + i + ']', 'Unknown tool "' + plan[i].tool + '".'));
      }
    }

    var review = isPlainObject(input.review) ? input.review : { state: 'draft' };
    if (REVIEW_STATES.indexOf(review.state) === -1) {
      errors.push(err('unknown-review-state', 'review.state', 'review.state must be one of ' + REVIEW_STATES.join(', ') + '.'));
    }

    var provenance = {};
    if (input.provenance !== undefined) {
      var blueprintProvenance = validateProvenance(input.provenance);
      if (!blueprintProvenance.ok) {
        errors = errors.concat(blueprintProvenance.errors.map(function (e) {
          return err(e.code, e.path ? 'provenance.' + e.path : 'provenance', e.message);
        }));
      } else {
        provenance = blueprintProvenance.value;
      }
    }

    Object.keys(input).forEach(function (k) {
      if (BLUEPRINT_KNOWN_FIELDS.indexOf(k) === -1) warnings.push(err('unknown-field-dropped', k, 'Unknown field "' + k + '" was dropped.'));
    });

    if (errors.length) return { ok: false, errors: errors, warnings: warnings, value: null };

    var value = {
      schemaVersion: SCHEMA_VERSION,
      blueprintId: input.blueprintId,
      audience: isPlainObject(input.audience) ? input.audience : {},
      standards: typeof input.standards === 'string' ? input.standards : '',
      sourcePolicy: isPlainObject(input.sourcePolicy) ? input.sourcePolicy : { kind: 'workspace-source' },
      lessonDNA: isPlainObject(input.lessonDNA) ? input.lessonDNA : {},
      globalSettings: isPlainObject(input.globalSettings) ? input.globalSettings : {},
      plan: plan,
      configs: isPlainObject(input.configs) ? input.configs : {},
      requiredCapabilities: requiredCapabilitiesForPlan(plan),
      warnings: Array.isArray(input.warnings) ? input.warnings.slice(0, 20) : [],
      review: { state: review.state, reviewer: typeof review.reviewer === 'string' ? review.reviewer : '' },
      provenance: provenance
    };
    return { ok: true, errors: [], warnings: warnings, value: value };
  }

  // ── legacy (live Auto-Fill) conversion ─────────────────────────────────

  var LEGACY_CONFIG_KEYS = ['glossaryConfig', 'quizConfig', 'outlineConfig', 'visualConfig', 'adventureConfig', 'brainstormConfig'];

  /**
   * Wrap the live autoConfigureSettings output in a versioned Blueprint.
   * context: { blueprintId, gradeLevel, language, standards, interests }.
   */
  function fromLegacyConfig(config, context) {
    var c = isPlainObject(config) ? config : {};
    var ctx = isPlainObject(context) ? context : {};
    var plan = normalizePlanItems(
      Array.isArray(c.resourcePlan) && c.resourcePlan.length ? c.resourcePlan : c.recommendedResources,
      c.toolDirectives
    );
    var configs = {};
    LEGACY_CONFIG_KEYS.forEach(function (k) { if (isPlainObject(c[k])) configs[k] = c[k]; });
    return {
      schemaVersion: SCHEMA_VERSION,
      blueprintId: String(ctx.blueprintId || 'bp-' + Math.abs(JSON.stringify(plan).split('').reduce(function (a, ch) { return ((a << 5) - a + ch.charCodeAt(0)) | 0; }, 0))),
      audience: {
        gradeLevel: (c.globalSettings && c.globalSettings.gradeLevel) || ctx.gradeLevel || '',
        language: ctx.language || '',
        interests: ctx.interests || ''
      },
      standards: ctx.standards || '',
      sourcePolicy: { kind: 'workspace-source' },
      lessonDNA: isPlainObject(c.lessonDNA) ? c.lessonDNA : {},
      globalSettings: isPlainObject(c.globalSettings) ? c.globalSettings : {},
      plan: plan,
      configs: configs,
      warnings: [],
      review: { state: 'draft', reviewer: '' },
      provenance: isPlainObject(ctx.provenance) ? ctx.provenance : {}
    };
  }

  /**
   * Convert a versioned Blueprint back to the exact legacy shape consumed by
   * getBlueprintResourcePlan / handleExecuteBlueprint / applyDetailedAutoConfig.
   */
  function toLegacyConfig(blueprint) {
    var b = isPlainObject(blueprint) ? blueprint : {};
    var plan = normalizePlanItems(b.plan, null);
    var legacy = {
      resourcePlan: plan.map(function (r) { return { tool: r.tool, directive: r.directive }; }),
      recommendedResources: plan.map(function (r) { return r.tool; }),
      toolDirectives: plan.reduce(function (acc, r) { if (!acc[r.tool]) acc[r.tool] = r.directive || ''; return acc; }, {}),
      lessonDNA: isPlainObject(b.lessonDNA) ? b.lessonDNA : {},
      globalSettings: isPlainObject(b.globalSettings) ? b.globalSettings : {}
    };
    var configs = isPlainObject(b.configs) ? b.configs : {};
    LEGACY_CONFIG_KEYS.forEach(function (k) { if (isPlainObject(configs[k])) legacy[k] = configs[k]; });
    return legacy;
  }

  // ── CommandWorkflow ────────────────────────────────────────────────────

  var COMMAND_WORKFLOW_AUDIENCES = ['teacher', 'student', 'independent', 'parent'];
  var COMMAND_WORKFLOW_FAILURE_POLICIES = ['pause', 'stop'];
  var COMMAND_WORKFLOW_KNOWN_FIELDS = ['schemaVersion', 'workflowId', 'kind', 'audience', 'steps', 'warnings', 'review', 'provenance'];
  var COMMAND_WORKFLOW_STEP_FIELDS = ['stepId', 'commandId', 'params', 'why', 'onFailure'];
  var COMMAND_ID_RE = /^[a-z0-9_:-]{1,80}$/;

  function normalizeCommandParams(input, path, errors) {
    if (input === undefined || input === null) return {};
    if (!isPlainObject(input)) {
      errors.push(err('bad-command-params', path, 'Command params must be a flat object.'));
      return {};
    }
    var out = {};
    var keys = Object.keys(input);
    if (keys.length > 8) errors.push(err('too-many-command-params', path, 'Command params may contain at most 8 keys.'));
    keys.slice(0, 8).forEach(function (key) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(key)) {
        errors.push(err('bad-command-param-key', path + '.' + key, 'Command parameter names must be short identifiers.'));
        return;
      }
      var value = input[key];
      if (typeof value === 'string') out[key] = value.trim().slice(0, 200);
      else if (typeof value === 'number' && isFinite(value)) out[key] = value;
      else if (typeof value === 'boolean') out[key] = value;
      else errors.push(err('bad-command-param-value', path + '.' + key, 'Command parameter values must be bounded strings, numbers, or booleans.'));
    });
    return out;
  }

  /**
   * Validate + normalize a durable command workflow. This is deliberately a
   * sibling to lesson Blueprints: it reuses versioning/review/provenance rules
   * without inheriting resource-specific ordering or legacy conversion.
   */
  function validateCommandWorkflow(input, opts) {
    var options = opts || {};
    var knownCommandIds = Array.isArray(options.knownCommandIds) ? options.knownCommandIds : [];
    var errors = [];
    var warnings = [];
    if (!isPlainObject(input)) return { ok: false, errors: [err('not-an-object', '', 'CommandWorkflow must be an object.')], warnings: [], value: null };
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(err('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '".'));
    if (input.kind !== 'command-workflow') errors.push(err('bad-workflow-kind', 'kind', 'kind must be "command-workflow".'));
    if (typeof input.workflowId !== 'string' || !input.workflowId.trim() || input.workflowId.length > 120) errors.push(err('missing-workflow-id', 'workflowId', 'workflowId is required and must be short.'));
    if (COMMAND_WORKFLOW_AUDIENCES.indexOf(input.audience) === -1) errors.push(err('unknown-command-audience', 'audience', 'Unknown command workflow audience.'));
    scanUnsafeFields(input, '', errors, 0);

    var rawSteps = input.steps;
    if (!Array.isArray(rawSteps)) errors.push(err('bad-workflow-steps', 'steps', 'steps must be a non-empty array.'));
    else if (!rawSteps.length) errors.push(err('empty-workflow', 'steps', 'A command workflow needs at least one step.'));
    else if (rawSteps.length > 8) errors.push(err('too-many-workflow-steps', 'steps', 'A command workflow may contain at most 8 steps.'));

    var seenStepIds = {};
    var steps = [];
    (Array.isArray(rawSteps) ? rawSteps.slice(0, 8) : []).forEach(function (raw, index) {
      var path = 'steps[' + index + ']';
      if (!isPlainObject(raw)) { errors.push(err('bad-workflow-step', path, 'Each workflow step must be an object.')); return; }
      var stepId = typeof raw.stepId === 'string' ? raw.stepId.trim() : '';
      var commandId = typeof raw.commandId === 'string' ? raw.commandId.trim() : '';
      if (!COMMAND_ID_RE.test(stepId)) errors.push(err('bad-step-id', path + '.stepId', 'stepId must be a short identifier.'));
      else if (seenStepIds[stepId]) errors.push(err('duplicate-step-id', path + '.stepId', 'stepId must be unique.'));
      else seenStepIds[stepId] = true;
      if (!COMMAND_ID_RE.test(commandId)) errors.push(err('bad-command-id', path + '.commandId', 'commandId must be a short identifier.'));
      else if (knownCommandIds.length && knownCommandIds.indexOf(commandId) === -1) errors.push(err('unknown-command', path + '.commandId', 'Unknown command "' + commandId + '".'));
      var onFailure = raw.onFailure || 'pause';
      if (COMMAND_WORKFLOW_FAILURE_POLICIES.indexOf(onFailure) === -1) errors.push(err('bad-failure-policy', path + '.onFailure', 'onFailure must be pause or stop.'));
      Object.keys(raw).forEach(function (key) {
        if (COMMAND_WORKFLOW_STEP_FIELDS.indexOf(key) === -1) warnings.push(err('unknown-field-dropped', path + '.' + key, 'Unknown workflow step field was dropped.'));
      });
      steps.push({
        stepId: stepId,
        commandId: commandId,
        params: normalizeCommandParams(raw.params, path + '.params', errors),
        why: typeof raw.why === 'string' ? raw.why.trim().slice(0, 120) : '',
        onFailure: onFailure
      });
    });

    var review = isPlainObject(input.review) ? input.review : { state: 'draft' };
    if (REVIEW_STATES.indexOf(review.state) === -1) errors.push(err('unknown-review-state', 'review.state', 'review.state must be draft or approved.'));
    var provenance = {};
    if (input.provenance !== undefined) {
      var provenanceReport = validateProvenance(input.provenance);
      if (!provenanceReport.ok) errors = errors.concat(provenanceReport.errors.map(function (e) { return err(e.code, e.path ? 'provenance.' + e.path : 'provenance', e.message); }));
      else provenance = provenanceReport.value;
    }
    Object.keys(input).forEach(function (key) {
      if (COMMAND_WORKFLOW_KNOWN_FIELDS.indexOf(key) === -1) warnings.push(err('unknown-field-dropped', key, 'Unknown CommandWorkflow field was dropped.'));
    });
    if (errors.length) return { ok: false, errors: errors, warnings: warnings, value: null };
    return {
      ok: true,
      errors: [],
      warnings: warnings,
      value: {
        schemaVersion: SCHEMA_VERSION,
        workflowId: input.workflowId.trim(),
        kind: 'command-workflow',
        audience: input.audience,
        steps: steps,
        warnings: Array.isArray(input.warnings) ? input.warnings.slice(0, 20) : [],
        review: { state: review.state, reviewer: typeof review.reviewer === 'string' ? review.reviewer.slice(0, 200) : '' },
        provenance: provenance
      }
    };
  }

  // ── Job ────────────────────────────────────────────────────────────────

  function validateJob(input) {
    var errors = [];
    if (!isPlainObject(input)) {
      return { ok: false, errors: [err('not-an-object', '', 'Job must be an object.')], value: null };
    }
    if (input.schemaVersion !== SCHEMA_VERSION) errors.push(err('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '".'));
    if (typeof input.jobId !== 'string' || !input.jobId.trim()) errors.push(err('missing-job-id', 'jobId', 'jobId is required.'));
    if (typeof input.blueprintId !== 'string' || !input.blueprintId.trim()) errors.push(err('missing-blueprint-id', 'blueprintId', 'blueprintId is required.'));
    if (JOB_STATUSES.indexOf(input.status) === -1) errors.push(err('unknown-status', 'status', 'status must be one of ' + JOB_STATUSES.join(', ') + '.'));
    if (input.resultArtifactIds !== undefined) {
      if (!Array.isArray(input.resultArtifactIds) || input.resultArtifactIds.some(function (id) { return typeof id !== 'string' || id.length > 200; })) {
        errors.push(err('bad-result-artifacts', 'resultArtifactIds', 'resultArtifactIds must be short string IDs — never embedded payloads.'));
      }
    }
    scanUnsafeFields(input, '', errors, 0);
    if (errors.length) return { ok: false, errors: errors, value: null };
    return {
      ok: true,
      errors: [],
      value: {
        schemaVersion: SCHEMA_VERSION,
        jobId: input.jobId,
        blueprintId: input.blueprintId,
        status: input.status,
        currentStep: typeof input.currentStep === 'number' ? input.currentStep : 0,
        progress: typeof input.progress === 'number' ? Math.max(0, Math.min(1, input.progress)) : 0,
        warnings: Array.isArray(input.warnings) ? input.warnings.slice(0, 20) : [],
        resultArtifactIds: Array.isArray(input.resultArtifactIds) ? input.resultArtifactIds.slice() : [],
        createdAt: typeof input.createdAt === 'string' ? input.createdAt : '',
        updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : ''
      }
    };
  }

  // ── Provenance ─────────────────────────────────────────────────────────

  function validateProvenance(input) {
    var errors = [];
    if (!isPlainObject(input)) {
      return { ok: false, errors: [err('not-an-object', '', 'Provenance must be an object.')], value: null };
    }
    scanUnsafeFields(input, '', errors, 0);
    // No hidden chain-of-thought or prompt storage: cap free-text fields.
    ['provider', 'model', 'sourceDeclaration', 'licenseDeclaration'].forEach(function (k) {
      if (input[k] !== undefined && (typeof input[k] !== 'string' || input[k].length > 500)) {
        errors.push(err('bad-provenance-field', k, k + ' must be a short string.'));
      }
    });
    if (input.prompt !== undefined || input.chainOfThought !== undefined) {
      errors.push(err('forbidden-provenance-field', 'prompt', 'Provenance must not store prompts or model reasoning.'));
    }
    if (errors.length) return { ok: false, errors: errors, value: null };
    return {
      ok: true,
      errors: [],
      value: {
        provider: input.provider || '',
        model: input.model || '',
        sourceDeclaration: input.sourceDeclaration || '',
        licenseDeclaration: input.licenseDeclaration || '',
        generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : '',
        validatedAt: typeof input.validatedAt === 'string' ? input.validatedAt : '',
        contractVersion: SCHEMA_VERSION
      }
    };
  }

  // ── Artifact ───────────────────────────────────────────────────────────

  var ARTIFACT_KNOWN_FIELDS = ['schemaVersion', 'artifactId', 'type', 'title', 'language', 'data', 'provenance'];
  var ARTIFACT_MAX_DATA_CHARS = 2000000; // ~2MB serialized; larger payloads belong in files, not contract messages

  /**
   * Validate + normalize a minimal Artifact envelope: a generated resource
   * (one Blueprint plan item's output) or a whole AlloPack. `data` is an
   * opaque payload — the envelope is what the agent surface validates;
   * per-tool payload schemas are a later, per-tool concern.
   */
  function validateArtifact(input, opts) {
    var options = opts || {};
    var knownTools = Array.isArray(options.knownTools) && options.knownTools.length ? options.knownTools : FALLBACK_TOOL_IDS;
    var knownTypes = knownTools.concat(['allopack']);
    var errors = [];
    var warnings = [];
    if (!isPlainObject(input)) {
      return { ok: false, errors: [err('not-an-object', '', 'Artifact must be an object.')], warnings: [], value: null };
    }
    if (input.schemaVersion !== SCHEMA_VERSION) {
      errors.push(err('unsupported-version', 'schemaVersion', 'Expected schemaVersion "' + SCHEMA_VERSION + '", got "' + input.schemaVersion + '".'));
    }
    if (typeof input.artifactId !== 'string' || !input.artifactId.trim()) {
      errors.push(err('missing-artifact-id', 'artifactId', 'artifactId is required.'));
    }
    if (knownTypes.indexOf(input.type) === -1) {
      errors.push(err('unknown-artifact-type', 'type', 'type must be a known tool id or "allopack".'));
    }
    if (input.data !== undefined) {
      var size = 0;
      try { size = typeof input.data === 'string' ? input.data.length : JSON.stringify(input.data).length; }
      catch (_) { errors.push(err('unserializable-data', 'data', 'data must be JSON-serializable.')); }
      if (size > ARTIFACT_MAX_DATA_CHARS) {
        errors.push(err('data-too-large', 'data', 'data exceeds ' + ARTIFACT_MAX_DATA_CHARS + ' serialized characters; reference a file instead.'));
      }
    }
    scanUnsafeFields(input, '', errors, 0);
    var provenance = {};
    if (input.provenance !== undefined) {
      var prov = validateProvenance(input.provenance);
      if (!prov.ok) {
        errors = errors.concat(prov.errors.map(function (e) {
          return err(e.code, e.path ? 'provenance.' + e.path : 'provenance', e.message);
        }));
      } else {
        provenance = prov.value;
      }
    }
    Object.keys(input).forEach(function (k) {
      if (ARTIFACT_KNOWN_FIELDS.indexOf(k) === -1) warnings.push(err('unknown-field-dropped', k, 'Unknown field "' + k + '" was dropped.'));
    });
    if (errors.length) return { ok: false, errors: errors, warnings: warnings, value: null };
    return {
      ok: true,
      errors: [],
      warnings: warnings,
      value: {
        schemaVersion: SCHEMA_VERSION,
        artifactId: input.artifactId,
        type: input.type,
        title: typeof input.title === 'string' ? input.title.slice(0, 300) : '',
        language: typeof input.language === 'string' ? input.language.slice(0, 100) : '',
        data: input.data === undefined ? null : input.data,
        provenance: provenance
      }
    };
  }

  var API = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEPLOYMENT_MODES: DEPLOYMENT_MODES,
    FALLBACK_TOOL_IDS: FALLBACK_TOOL_IDS,
    TOOL_TO_COMMAND: TOOL_TO_COMMAND,
    PERMISSIONS: PERMISSIONS,
    DEMO_ALLOWED_PERMISSIONS: DEMO_ALLOWED_PERMISSIONS,
    TOOL_CLASSIFICATION: TOOL_CLASSIFICATION,
    TOOL_NAME_RE: TOOL_NAME_RE,
    JOB_STATUSES: JOB_STATUSES,
    COMMAND_WORKFLOW_AUDIENCES: COMMAND_WORKFLOW_AUDIENCES,
    COMMAND_WORKFLOW_FAILURE_POLICIES: COMMAND_WORKFLOW_FAILURE_POLICIES,
    getToolClassification: getToolClassification,
    getMcpAnnotations: getMcpAnnotations,
    validateToolTable: validateToolTable,
    isDemoSafeTool: isDemoSafeTool,
    validateCapabilityManifest: validateCapabilityManifest,
    validateBlueprint: validateBlueprint,
    validateCommandWorkflow: validateCommandWorkflow,
    normalizePlanItems: normalizePlanItems,
    requiredCapabilitiesForPlan: requiredCapabilitiesForPlan,
    fromLegacyConfig: fromLegacyConfig,
    toLegacyConfig: toLegacyConfig,
    validateJob: validateJob,
    validateProvenance: validateProvenance,
    validateArtifact: validateArtifact
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') {
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.AgentCoreContracts = API;
  }
})();
