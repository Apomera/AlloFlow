#!/usr/bin/env node
/**
 * AlloFlow Agent Core - local stdio MCP server.
 * Tasks A-C of docs/CHATGPT_HANDOFF_FEDERATED_AGENT_2026-07-14.md.
 *
 * Deliberately SDK-free: the MCP stdio transport is newline-delimited
 * JSON-RPC 2.0, and hand-rolling it keeps the boundary visible while the
 * contracts are young (an SDK can replace this file without touching the
 * Agent Core). Exposes validation plus deterministic local draft jobs:
 *
 *   capabilities        — validated CapabilityManifest for this deployment
 *   blueprint_validate  — contract-validate a Blueprint (normalized result)
 *   artifact_validate   — contract-validate an Artifact envelope
 *   blueprint_create/revise/preview - local Blueprint draft workflow
 *   job_get/cancel/get_result - inspect local in-process job records
 *
 * Safety properties:
 *   - stdio only; no network listener of any kind.
 *   - stdout carries ONLY protocol messages; all logging goes to stderr.
 *   - All tool inputs are schema-checked and re-validated by the Agent Core
 *     contracts (fail closed); tool names/annotations come from the same
 *     classification table the Connectors Directory requires.
 *   - No secrets: the manifest is contract-validated, and secret-like fields
 *     anywhere in inputs are rejected by the contract layer.
 *   - Draft-writing and cancellation attempts append redacted JSONL audit
 *     records under the desktop data directory before state commits.
 *   - Jobs/results are bounded and in-memory only. No network, inference,
 *     quota spend, artifact execution, or blueprint_execute tool.
 *
 * Manifest: honest-by-default (no capabilities advertised). Set
 * ALLOFLOW_MCP_MANIFEST_PATH to a JSON CapabilityManifest to advertise real
 * local providers; an explicitly configured invalid file denies scoped tools.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { LIMITS, BoundedJobs, BoundedInput, BoundedOutput, boundedDiagnostics, readConfigurationJson } = require('./agent_core_stdio_security.cjs');

const Contracts = require(path.join(__dirname, '..', '..', 'agent_core_contracts_module.js'));
const BlueprintServiceModule = require(path.join(__dirname, '..', '..', 'agent_core_blueprint_service_module.js'));
const MediaContracts = require(path.join(__dirname, '..', '..', 'agent_core_media_contracts_module.js'));
const MediaPlanner = require(path.join(__dirname, '..', '..', 'agent_core_media_planner_module.js'));
const ResourcePackService = require(path.join(__dirname, '..', '..', 'agent_core_resource_pack_module.js'));

const SERVER_INFO = { name: 'alloflow-agent-core', title: 'AlloFlow Agent Core (local)', version: '0.5.0' };
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
// An atomic frame replacement carries the bounded pack, new still frame, and
// re-encoded playback GIF in one request. Keep transport headroom above those
// payloads without changing the service's pack or decoded-media budgets.
const AUDITED_TOOLS = new Set(['blueprint_create', 'blueprint_revise', 'resource_pack_generate', 'resource_pack_attach_image', 'resource_pack_export', 'job_cancel']);

function log(msg) {
  process.stderr.write('[alloflow-mcp] ' + msg + '\n');
}

// ── capability manifest ────────────────────────────────────────────────────

function emptyManifest() {
  return {
    schemaVersion: Contracts.SCHEMA_VERSION,
    deploymentMode: 'desktop-local',
    text: { available: false, providers: [] },
    vision: { available: false, providers: [] },
    imageGeneration: { available: false, providers: [] },
    imageEditing: { available: false, providers: [] },
    speech: { tts: false, asr: false },
    webSearch: { available: false },
    catalog: { read: false, stage: false },
    permissions: ['artifact:read', 'artifact:draft']
  };
}

function loadManifest() {
  const fallback = Contracts.validateCapabilityManifest(emptyManifest()).value;
  const p = process.env.ALLOFLOW_MCP_MANIFEST_PATH;
  if (!p) return fallback;
  try {
    const parsed = readConfigurationJson(p);
    const report = Contracts.validateCapabilityManifest(parsed);
    if (report.ok) { log('configured manifest loaded'); return report.value; }
    log('configured manifest failed validation; scoped tools disabled');
  } catch (_) {
    log('configured manifest unreadable; scoped tools disabled');
  }
  fallback.permissions = [];
  return fallback;
}

const MANIFEST = loadManifest();

function emptyMediaInventory() { return { schemaVersion: MediaContracts.SCHEMA_VERSION, providers: [] }; }
function loadMediaInventory() {
  const fallback = MediaContracts.validateProviderInventory(emptyMediaInventory()).value;
  const p = process.env.ALLOFLOW_MCP_MEDIA_INVENTORY_PATH;
  if (!p) return fallback;
  try {
    const report = MediaContracts.validateProviderInventory(readConfigurationJson(p));
    if (report.ok) { log('configured media inventory loaded'); return report.value; }
    log('configured media inventory failed validation; using empty inventory');
  } catch (_) { log('configured media inventory unreadable or outside local limits; using empty inventory'); }
  return fallback;
}
const MEDIA_INVENTORY = loadMediaInventory();

const BLUEPRINT_SERVICE = BlueprintServiceModule.createBlueprintService({ contracts: Contracts });
const JOBS = new BoundedJobs();
const jobSweep = setInterval(() => JOBS.sweep(), 60000);
jobSweep.unref();

function getDataDir() {
  if (process.env.ALLOFLOW_MCP_DATA_DIR) return path.resolve(process.env.ALLOFLOW_MCP_DATA_DIR);
  if (process.env.ALLOFLOW_DESKTOP_HOME) return path.resolve(process.env.ALLOFLOW_DESKTOP_HOME);
  return path.resolve(__dirname, '..', '.local');
}

function getAuditPath() { return path.join(getDataDir(), 'agent-core', 'mcp-audit.jsonl'); }
function hashRef(value) { return 'sha256:' + crypto.createHash('sha256').update(String(value), 'utf8').digest('hex').slice(0, 16); }
function rotateAudit(auditPath, incomingBytes) {
  if (!fs.existsSync(auditPath) || fs.statSync(auditPath).size + incomingBytes <= LIMITS.auditBytes) return;
  for (let index = LIMITS.auditFiles - 1; index >= 1; index--) {
    const target = auditPath + '.' + index;
    if (fs.existsSync(target)) fs.unlinkSync(target);
    const source = index === 1 ? auditPath : auditPath + '.' + (index - 1);
    if (fs.existsSync(source)) {
      if (fs.statSync(source).size > LIMITS.auditBytes) fs.unlinkSync(source);
      else fs.renameSync(source, target);
    }
  }
}

function appendAudit(toolName, outcome, context) {
  const classification = Contracts.getToolClassification(toolName);
  const ctx = context || {};
  const record = { schemaVersion: Contracts.SCHEMA_VERSION, eventId: crypto.randomUUID(), recordedAt: new Date().toISOString(), tool: toolName, classification: classification ? classification.kind : "unknown", outcome };
  if (typeof ctx.jobId === 'string' && ctx.jobId) {
    if (ctx.issuedJob === true || JOBS.get(ctx.jobId)) record.jobId = ctx.jobId;
    else record.jobRef = hashRef(ctx.jobId);
  }
  if (typeof ctx.blueprintId === 'string' && ctx.blueprintId) {
    record.blueprintRef = hashRef(ctx.blueprintId);
  }
  if (typeof ctx.errorCode === 'string' && ctx.errorCode) record.errorCode = ctx.errorCode.slice(0, 100);
  try {
    const auditPath = getAuditPath();
    fs.mkdirSync(path.dirname(auditPath), { recursive: true, mode: 0o700 });
    const line = JSON.stringify(record) + '\n';
    rotateAudit(auditPath, Buffer.byteLength(line, 'utf8'));
    fs.appendFileSync(auditPath, line, { encoding: 'utf8', mode: 0o600 });
  } catch (_) {
    const e = new Error('Audit log unavailable; the requested state change was not committed.');
    e.auditFailure = true;
    throw e;
  }
}

function isPlainObject(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function assertObject(value, name) { if (!isPlainObject(value)) throw invalidParams(name + ' must be an object'); }
function assertAllowedKeys(value, allowed, name) {
  assertObject(value, name);
  const unknown = Object.keys(value).filter((key) => allowed.indexOf(key) === -1);
  if (unknown.length) throw invalidParams(name + ' has unsupported fields');
}
function assertOptionalString(value, key, maxLength, name) {
  if (value[key] !== undefined && (typeof value[key] !== "string" || value[key].length > maxLength)) throw invalidParams(name + "." + key + " must be a string of at most " + maxLength + " characters");
}
function assertOptionalObject(value, key, name) {
  if (value[key] !== undefined && !isPlainObject(value[key])) throw invalidParams(name + "." + key + " must be an object");
}
function assertOptionalToolArray(value, key, name) {
  if (value[key] === undefined) return;
  if (!Array.isArray(value[key]) || value[key].length > LIMITS.planSteps || value[key].some((tool) => typeof tool !== "string" || Contracts.FALLBACK_TOOL_IDS.indexOf(tool) === -1)) throw invalidParams(name + "." + key + " must contain at most " + LIMITS.planSteps + " known tool IDs");
}
function assertBlueprintBounds(blueprint) {
  if (Array.isArray(blueprint.plan)) {
    if (blueprint.plan.length > LIMITS.planSteps) throw invalidParams('Blueprint plans may contain at most ' + LIMITS.planSteps + ' steps');
    blueprint.plan.forEach(item => { if (isPlainObject(item)) assertOptionalString(item, 'directive', LIMITS.directiveChars, 'plan item'); });
  }
}
function validateCreateRequest(request) {
  assertAllowedKeys(request, ['blueprintId', 'gradeLevel', 'language', 'standards', 'interests', 'plan', 'lessonDNA', 'globalSettings', 'provenance'], 'arguments.request');
  if (typeof request.blueprintId !== 'string' || !request.blueprintId.trim() || request.blueprintId.length > 200) throw invalidParams('arguments.request.blueprintId is required and must be at most 200 characters');
  const limits = { gradeLevel: 200, language: 100, standards: 4000, interests: 2000 };
  Object.keys(limits).forEach((key) => assertOptionalString(request, key, limits[key], 'arguments.request'));
  ['lessonDNA', 'globalSettings', 'provenance'].forEach((key) => assertOptionalObject(request, key, 'arguments.request'));
  if (!Array.isArray(request.plan) || !request.plan.length) throw invalidParams('arguments.request.plan must be a non-empty array');
  assertBlueprintBounds(request);
  request.plan.forEach((item, index) => {
    if (typeof item === 'string') {
      if (Contracts.FALLBACK_TOOL_IDS.indexOf(item) === -1) throw invalidParams('arguments.request.plan[' + index + '] must be a known tool ID');
      return;
    }
    assertAllowedKeys(item, ['tool', 'directive'], 'arguments.request.plan[' + index + ']');
    if (typeof item.tool !== 'string' || Contracts.FALLBACK_TOOL_IDS.indexOf(item.tool) === -1) throw invalidParams('arguments.request.plan[' + index + '].tool must be a known tool ID');
    assertOptionalString(item, 'directive', LIMITS.directiveChars, 'arguments.request.plan[' + index + ']');
  });
}
function validateRevisionChanges(changes) {
  assertAllowedKeys(changes, ['addTools', 'removeTools', 'setDirectives', 'audience', 'standards', 'globalSettings', 'configs', 'lessonDNA'], 'arguments.changes');
  assertOptionalToolArray(changes, 'addTools', 'arguments.changes');
  assertOptionalToolArray(changes, 'removeTools', 'arguments.changes');
  ['audience', 'globalSettings', 'configs', 'lessonDNA'].forEach((key) => assertOptionalObject(changes, key, 'arguments.changes'));
  assertOptionalString(changes, 'standards', 4000, 'arguments.changes');
  if (changes.setDirectives !== undefined) {
    assertObject(changes.setDirectives, 'arguments.changes.setDirectives');
    const bad = Object.keys(changes.setDirectives).find((tool) => Contracts.FALLBACK_TOOL_IDS.indexOf(tool) === -1 || typeof changes.setDirectives[tool] !== 'string' || changes.setDirectives[tool].length > LIMITS.directiveChars);
    if (bad) throw invalidParams('arguments.changes.setDirectives must map known tool IDs to strings');
  }
}
function requireJobId(args) {
  assertAllowedKeys(args, ['jobId'], 'arguments');
  if (typeof args.jobId !== 'string' || !args.jobId.trim() || args.jobId.length > 200) throw invalidParams('arguments.jobId must be a non-empty string of at most 200 characters');
  return args.jobId;
}
function auditContextFromArgs(args) {
  const a = isPlainObject(args) ? args : {};
  const request = isPlainObject(a.request) ? a.request : {};
  const blueprint = isPlainObject(a.blueprint) ? a.blueprint : {};
  return { jobId: typeof a.jobId === 'string' ? a.jobId : '', blueprintId: typeof request.blueprintId === 'string' ? request.blueprintId : (typeof blueprint.blueprintId === 'string' ? blueprint.blueprintId : '') };
}
function createCompletedJob(blueprintId) {
  const now = new Date().toISOString();
  const report = Contracts.validateJob({ schemaVersion: Contracts.SCHEMA_VERSION, jobId: 'job-' + crypto.randomUUID(), blueprintId, status: 'completed', currentStep: 0, progress: 1, warnings: [], resultArtifactIds: [], createdAt: now, updatedAt: now });
  if (!report.ok) throw new Error('Internal Job contract failure');
  return report.value;
}
function storeJob(record) { JOBS.prepare(record)(); }
function copyValue(value) { return JSON.parse(JSON.stringify(value)); }
function pendingWrite(payload, audit, commit, auditOutcome) { return { __pendingWrite: true, payload, audit, commit, auditOutcome: auditOutcome || 'succeeded' }; }
function notFound(jobId) { return { ok: false, errors: [{ code: 'job-not-found', path: 'jobId', message: 'No job exists for the supplied jobId.' }], jobId }; }

// Tool registry: validation plus deterministic local draft jobs.

function toolEntry(name, description, inputSchema) {
  const annotations = Contracts.getMcpAnnotations(name);
  if (!annotations) throw new Error('Tool "' + name + '" missing from the classification table');
  return { name, title: annotations.title, description, inputSchema, annotations };
}

const PROVENANCE_INPUT_SCHEMA = {
  type: 'object',
  description: 'Safe generation provenance. Prompts and chain-of-thought are forbidden.',
  properties: {
    provider: { type: 'string', maxLength: 500 },
    model: { type: 'string', maxLength: 500 },
    sourceDeclaration: { type: 'string', maxLength: 500 },
    licenseDeclaration: { type: 'string', maxLength: 500 },
    generatedAt: { type: 'string' },
    validatedAt: { type: 'string' },
    contractVersion: { type: 'string' }
  },
  additionalProperties: false
};

const BLUEPRINT_INPUT_SCHEMA = {
  type: 'object',
  description: 'Canonical AlloFlow Blueprint 1.0. Plan entries must use the tool discriminator.',
  required: ['schemaVersion', 'blueprintId', 'plan'],
  properties: {
    schemaVersion: { type: 'string', const: Contracts.SCHEMA_VERSION },
    blueprintId: { type: 'string', minLength: 1 },
    audience: {
      type: 'object',
      properties: {
        gradeLevel: { type: 'string' },
        language: { type: 'string' },
        interests: { type: 'string' }
      },
      additionalProperties: true
    },
    standards: { type: 'string' },
    sourcePolicy: { type: 'object', additionalProperties: true },
    lessonDNA: { type: 'object', additionalProperties: true },
    globalSettings: { type: 'object', additionalProperties: true },
    plan: {
      type: 'array',
      minItems: 1,
      maxItems: LIMITS.planSteps,
      items: {
        type: 'object',
        required: ['tool'],
        properties: {
          tool: { type: 'string', enum: Contracts.FALLBACK_TOOL_IDS },
          directive: { type: 'string', maxLength: LIMITS.directiveChars }
        },
        additionalProperties: false
      }
    },
    configs: { type: 'object', additionalProperties: true },
    requiredCapabilities: { type: 'array', items: { type: 'string' } },
    warnings: { type: 'array' },
    review: {
      type: 'object',
      properties: {
        state: { type: 'string', enum: ['draft', 'approved'] },
        reviewer: { type: 'string' }
      },
      additionalProperties: false
    },
    provenance: PROVENANCE_INPUT_SCHEMA
  },
  additionalProperties: false
};

const ARTIFACT_INPUT_SCHEMA = {
  type: 'object',
  description: 'Structural Artifact 1.0 envelope. This does not assess pedagogical completeness.',
  required: ['schemaVersion', 'artifactId', 'type'],
  properties: {
    schemaVersion: { type: 'string', const: Contracts.SCHEMA_VERSION },
    artifactId: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: Contracts.FALLBACK_TOOL_IDS.concat(['allopack']) },
    title: { type: 'string', maxLength: 300 },
    language: { type: 'string', maxLength: 100 },
    data: { description: 'Artifact payload; limited to 2,000,000 serialized characters by the contract.' },
    provenance: PROVENANCE_INPUT_SCHEMA
  },
  additionalProperties: false
};

const CREATE_REQUEST_INPUT_SCHEMA = {
  type: 'object', description: 'Deterministic local draft request. This does not call AI or analyze source text.',
  required: ['blueprintId', 'plan'],
  properties: {
    blueprintId: { type: 'string', minLength: 1, maxLength: 200 },
    gradeLevel: { type: 'string', maxLength: 200 }, language: { type: 'string', maxLength: 100 },
    standards: { type: 'string', maxLength: 4000 }, interests: { type: 'string', maxLength: 2000 },
    plan: { type: 'array', minItems: 1, maxItems: LIMITS.planSteps, items: { oneOf: [{ type: 'string', enum: Contracts.FALLBACK_TOOL_IDS }, BLUEPRINT_INPUT_SCHEMA.properties.plan.items] } },
    lessonDNA: { type: 'object', additionalProperties: true }, globalSettings: { type: 'object', additionalProperties: true },
    provenance: PROVENANCE_INPUT_SCHEMA
  }, additionalProperties: false
};

const REVISION_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    addTools: { type: 'array', maxItems: LIMITS.planSteps, items: { type: 'string', enum: Contracts.FALLBACK_TOOL_IDS } },
    removeTools: { type: 'array', maxItems: LIMITS.planSteps, items: { type: 'string', enum: Contracts.FALLBACK_TOOL_IDS } },
    setDirectives: { type: 'object', additionalProperties: { type: 'string', maxLength: LIMITS.directiveChars } },
    audience: { type: 'object', additionalProperties: true }, standards: { type: 'string' },
    globalSettings: { type: 'object', additionalProperties: true }, configs: { type: 'object', additionalProperties: true },
    lessonDNA: { type: 'object', additionalProperties: true }
  }, additionalProperties: false
};

const JOB_ID_INPUT_SCHEMA = { type: 'object', required: ['jobId'], properties: { jobId: { type: 'string', minLength: 1, maxLength: 200 } }, additionalProperties: false };

const PROVIDER_POLICY_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    mode: { type: 'string', enum: ['deployment-default', 'allow-listed'] },
    allowedProviders: { type: 'array', items: { type: 'string' } },
    allowedModels: { type: 'array', items: { type: 'string' } },
    preferredProvider: { type: 'string' }, preferredModel: { type: 'string' },
    allowMeteredUsage: { type: 'boolean' },
    maxCostUsd: { type: 'number', minimum: 0, maximum: 100000 },
    maxOperations: { type: 'integer', minimum: 1, maximum: 10000 }
  }, additionalProperties: false
};
const ASSET_REF_INPUT_SCHEMA = {
  type: 'object', required: ['handle'],
  properties: {
    handle: { type: 'string', pattern: '^asset_[A-Za-z0-9_-]{8,128}$' },
    mimeType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp'] }
  }, additionalProperties: false
};
const MEDIA_REQUEST_INPUT_SCHEMA = {
  type: 'object', required: ['schemaVersion', 'requestId', 'operation', 'prompt', 'providerPolicy'],
  properties: {
    schemaVersion: { type: 'string', const: MediaContracts.SCHEMA_VERSION },
    requestId: { type: 'string', minLength: 1, maxLength: 128 },
    operation: { type: 'string', enum: ['generate', 'edit'] },
    prompt: { type: 'string', minLength: 1, maxLength: 8000 }, purpose: { type: 'string', maxLength: 200 },
    sourceAsset: ASSET_REF_INPUT_SCHEMA,
    referenceAssets: { type: 'array', maxItems: 4, items: ASSET_REF_INPUT_SCHEMA },
    output: {
      type: 'object',
      properties: {
        width: { type: 'integer', minimum: 256, maximum: 4096 },
        height: { type: 'integer', minimum: 256, maximum: 4096 },
        mimeType: { type: 'string', enum: ['image/png', 'image/jpeg', 'image/webp'] },
        quality: { type: 'string', enum: ['draft', 'standard', 'high'] }
      }, additionalProperties: false
    },
    accessibility: { type: 'object', properties: { altTextRequired: { type: 'boolean' } }, additionalProperties: false },
    providerPolicy: PROVIDER_POLICY_INPUT_SCHEMA
  }, additionalProperties: false
};
const MEDIA_BATCH_INPUT_SCHEMA = {
  type: 'object', required: ['schemaVersion', 'planId', 'requests', 'batchPolicy'],
  properties: {
    schemaVersion: { type: 'string', const: MediaContracts.SCHEMA_VERSION },
    planId: { type: 'string', minLength: 1, maxLength: 128 },
    requests: { type: 'array', minItems: 1, maxItems: MediaPlanner.MAX_ITEMS, items: MEDIA_REQUEST_INPUT_SCHEMA },
    batchPolicy: {
      type: 'object', required: ['maxCostUsd', 'maxOperations'],
      properties: {
        maxCostUsd: { type: 'number', minimum: 0, maximum: 100000 },
        maxOperations: { type: 'integer', minimum: 1, maximum: 10000 }
      }, additionalProperties: false
    }
  }, additionalProperties: false
};

const PACK_PROFILE_SCHEMA = { type: 'string', enum: ['text', 'illustrated', 'native'], default: 'text', description: 'Text: original 12-type subset. Illustrated: original 15-type still-image profile. Native: all supported native resource formats, notebook templates, animation and saved image state. Call resource_pack_capabilities for format contracts and limits. Accepted metadata is preserved on validate/export.' };
const RESOURCE_PACK_REQUEST_INPUT_SCHEMA = {
  type: 'object', required: ['requestId', 'sourceTopic', 'learningGoal', 'history', 'privacy'],
  properties: {
    profile: PACK_PROFILE_SCHEMA,
    requestId: { type: 'string', minLength: 1, maxLength: 128 }, title: { type: 'string', maxLength: 240 },
    sourceTopic: { type: 'string', minLength: 1, maxLength: 1000 }, gradeLevel: { type: 'string', maxLength: 200 },
    language: { type: 'string', maxLength: 100 }, standards: { type: 'string', maxLength: 4000 },
    learningGoal: { type: 'string', minLength: 1, maxLength: 1000 }, author: { type: 'string', maxLength: 200 },
    history: { type: 'array', minItems: 1, maxItems: 24, items: { type: 'object', required: ['id', 'type', 'title', 'data'], properties: { id: { type: 'string', maxLength: 200 }, type: { type: 'string', enum: ResourcePackService.NATIVE_TYPES, description: 'Supported type depends on request.profile. Call resource_pack_capabilities for each type\'s native format contract and example.' }, title: { type: 'string', maxLength: 240 }, timestamp: { type: 'string', maxLength: 80 }, data: {}, meta: { type: 'string', maxLength: 500 } }, additionalProperties: true } },
    privacy: { type: 'object', required: ['confirmNoStudentPii', 'confirmSourcePermission'], properties: { confirmNoStudentPii: { type: 'boolean', const: true }, confirmSourcePermission: { type: 'boolean', const: true } }, additionalProperties: false }
  }, additionalProperties: false
};
const RESOURCE_PACK_INPUT_SCHEMA = { type: 'object', description: 'A native AlloPack envelope; validation/export preserve all accepted metadata and history fields.', required: ['allopack', 'sourceTopic', 'history'], properties: { allopack: { type: 'object' }, sourceTopic: { type: 'string' }, history: { type: 'array' } }, additionalProperties: true };
const PACK_ARGUMENT_SCHEMA = { type: 'object', properties: { pack: RESOURCE_PACK_INPUT_SCHEMA, profile: PACK_PROFILE_SCHEMA }, required: ['pack'], additionalProperties: false };
const IMAGE_ATTACHMENT_SCHEMA = {
  type: 'object', required: ['resourceId', 'slot', 'index', 'dataUrl', 'alt'], additionalProperties: false,
  properties: {
    resourceId: { type: 'string', minLength: 1, maxLength: 200 },
    slot: { type: 'string', enum: ['glossary', 'panel', 'anchor', 'sort', 'single', 'timeline', 'frame', 'override', 'memory', 'challenge'], description: 'single, timeline, frame, override, memory and challenge require profile: native. Targets must already exist; index is zero-based; single and challenge require index 0.' },
    index: { type: 'integer', minimum: 0 },
    panelIndex: { type: 'integer', minimum: 0, description: 'Parent panel for a frame attachment; native profile only.' },
    playbackDataUrl: { type: 'string', maxLength: 1333400, description: 'Re-encoded base64 GIF playback, required when replacing a native frame so playback and individual still frames remain consistent. Used only with slot: frame; at most 1,000,000 decoded bytes.' },
    dataUrl: { type: 'string', maxLength: 1333400, description: 'Self-contained PNG/JPEG/WebP base64 data URL supplied by the host; native also supports GIF. Maximum 1,000,000 decoded bytes; no network URL or filesystem path.' },
    alt: { type: 'string', maxLength: 250, description: 'Image-specific description. Empty only when decorative is true.' },
    decorative: { type: 'boolean', default: false },
    altSource: { type: 'string', enum: ['vision', 'author', 'planning'], default: 'planning', description: 'vision means reviewed against the actual image; author means human-written; planning is an unverified draft.' }
  }
};
const TOOLS = [
  toolEntry(
    'capabilities',
    'Report which AI modalities, permissions, and catalog operations this AlloFlow deployment provides. Call this first to learn what the workspace can do. Read-only; never returns secrets.',
    { type: 'object', properties: {}, additionalProperties: false }
  ),
  toolEntry(
    'blueprint_validate',
    'Validate a lesson Blueprint against the versioned AlloFlow contract. Returns ok/errors/warnings, the normalized Blueprint (analysis-first/lesson-plan-last ordering), and the capabilities the plan requires. Read-only; performs no generation.',
    {
      type: 'object',
      properties: { blueprint: BLUEPRINT_INPUT_SCHEMA },
      required: ['blueprint'],
      additionalProperties: false
    }
  ),
  toolEntry(
    'blueprint_create',
    'Create a deterministic local Blueprint draft from an explicit plan and audience settings. Returns a completed local job; call job_get_result for the Blueprint. Does not call AI, analyze source text, use the network, or spend quota.',
    { type: 'object', properties: { request: CREATE_REQUEST_INPUT_SCHEMA }, required: ['request'], additionalProperties: false }
  ),
  toolEntry(
    'blueprint_revise',
    'Apply explicit field and plan changes to a Blueprint draft using the pure Agent Core revision service. Any prior approval is invalidated. Returns a completed local job; call job_get_result for the revised Blueprint. No AI call.',
    { type: 'object', properties: { blueprint: BLUEPRINT_INPUT_SCHEMA, changes: REVISION_INPUT_SCHEMA }, required: ['blueprint', 'changes'], additionalProperties: false }
  ),
  toolEntry(
    'blueprint_preview',
    'Preview ordered Blueprint steps and missing local capabilities without executing or generating anything. Returns a completed local job; call job_get_result for the preview.',
    { type: 'object', properties: { blueprint: BLUEPRINT_INPUT_SCHEMA }, required: ['blueprint'], additionalProperties: false }
  ),
  toolEntry(
    'media_plan',
    'Create a capability-aware dry-run plan for bounded image generation or editing requests. Uses only the runtime-configured credential-free media inventory, never accepts pricing or credentials from the agent, performs no provider call, writes no asset, and always leaves execution unauthorized.',
    { type: 'object', properties: { batch: MEDIA_BATCH_INPUT_SCHEMA }, required: ['batch'], additionalProperties: false }
  ),
  toolEntry('job_get', 'Read status metadata for a local in-process Agent Core job. Jobs do not survive connector restart.', JOB_ID_INPUT_SCHEMA),
  toolEntry('job_cancel', 'Request cancellation of a queued, running, or input-required local job. Current deterministic draft jobs normally complete immediately and therefore cannot be cancelled.', JOB_ID_INPUT_SCHEMA),
  toolEntry('job_get_result', 'Read the result of a completed local in-process Agent Core job. Returns a Blueprint or side-effect-free preview, never execution output.', JOB_ID_INPUT_SCHEMA),
  toolEntry(
    'artifact_validate',
    'Structurally validate an AlloFlow Artifact 1.0 envelope for known type, size, provenance, and safety constraints. This does not assess content quality or pedagogical completeness. Read-only.',
    {
      type: 'object',
      properties: { artifact: ARTIFACT_INPUT_SCHEMA },
      required: ['artifact'],
      additionalProperties: false
    }
  ),
  toolEntry(
    'resource_pack_capabilities',
    'Discover supported AlloPack resource types, native data contracts and examples, notebook templates, attachment slots, and size limits for a profile. Defaults to native. Format support does not imply an AI provider, renderer execution, publication, or educator approval. Read-only; no network or generation.',
    { type: 'object', properties: { profile: { ...PACK_PROFILE_SCHEMA, default: 'native' } }, additionalProperties: false }
  ),
  toolEntry(
    'resource_pack_generate',
    'Assemble a fresh agent-authored AlloPack. Set request.profile=native for all supported native resource formats; call resource_pack_capabilities for contracts and examples. Default text and explicit illustrated profiles retain their original subsets. For existing packs use validate/export to preserve their complete envelope. The host supplies content and images; no model call, image generation, file read, or network request. Returns a completed job; call job_get_result.',
    { type: 'object', properties: { request: RESOURCE_PACK_REQUEST_INPUT_SCHEMA }, required: ['request'], additionalProperties: false }
  ),
  toolEntry(
    'resource_pack_validate',
    'Validate renderer shapes, references, privacy and size, preserving the complete accepted pack. profile=native covers the full supported native resource catalog, notebook templates and saved image state. profile=illustrated retains the still-image subset; default text retains its original subset. Checks embedded media and alt metadata. Validation does not execute interactive resources or establish visual correctness or educator approval. Read-only.',
    PACK_ARGUMENT_SCHEMA
  ),
  toolEntry(
    'resource_pack_preview',
    'Return a structured teacher-review summary with resource order, media statistics, warnings and a review checklist. Use the same profile used to validate the pack: text, illustrated or native. This is not a rendered student preview and does not execute interactive content. Read-only.',
    PACK_ARGUMENT_SCHEMA
  ),
  toolEntry(
    'resource_pack_export',
    'Export a validated AlloPack as a .allopack.json payload. profile=illustrated or native returns compact JSON, preserving images, captions, labels, credits, provenance and all accepted fields without normalizing them away. The connector does not execute resources, write files or publish.',
    PACK_ARGUMENT_SCHEMA
  ),
  toolEntry(
    'resource_pack_attach_image',
    'Attach host-supplied artwork to an existing resource target. profile=illustrated supports glossary, panel, anchor and sort. profile=native adds single, timeline, frame, override, memory and challenge targets, plus GIF. A frame replacement also requires re-encoded playbackDataUrl. Returns a validated copy with native accessibility fields and preserves review gates; never mutates input. No generation, network fetch or file reads. Default altSource=planning does not claim visual review.',
    { type: 'object', required: ['pack', 'profile', 'attachment'], properties: { pack: RESOURCE_PACK_INPUT_SCHEMA, profile: { type: 'string', enum: ['illustrated', 'native'] }, attachment: IMAGE_ATTACHMENT_SCHEMA }, additionalProperties: false }
  )
];

function reportPayload(report) {
  return {
    ok: report.ok,
    errors: boundedDiagnostics(report.errors),
    warnings: boundedDiagnostics(report.warnings),
    value: report.ok ? report.value : null,
    media: report.media
  };
}

const TOOL_HANDLERS = {
  capabilities(args) { assertAllowedKeys(args, [], 'arguments'); return MANIFEST; },
  async blueprint_create(args) {
    assertAllowedKeys(args, ['request'], 'arguments');
    const request = args.request;
    validateCreateRequest(request);
    const blueprint = await BLUEPRINT_SERVICE.createDraft(request);
    const job = createCompletedJob(blueprint.blueprintId);
    const record = { job, operation: 'blueprint_create', result: { kind: 'blueprint', blueprint } };
    return pendingWrite({ job: copyValue(job), resultAvailable: true }, { jobId: job.jobId, issuedJob: true, blueprintId: blueprint.blueprintId }, JOBS.prepare(record));
  },
  blueprint_revise(args) {
    assertAllowedKeys(args, ['blueprint', 'changes'], 'arguments');
    assertObject(args.blueprint, 'arguments.blueprint');
    assertBlueprintBounds(args.blueprint);
    validateRevisionChanges(args.changes);
    const report = BLUEPRINT_SERVICE.revise(args.blueprint, args.changes);
    if (!report.ok) throw invalidParams('Blueprint revision failed contract validation: ' + report.errors.map((e) => e.code).join(', '));
    const blueprint = report.value;
    assertBlueprintBounds(blueprint);
    const job = createCompletedJob(blueprint.blueprintId);
    const record = { job, operation: 'blueprint_revise', result: { kind: 'blueprint', blueprint } };
    return pendingWrite({ job: copyValue(job), resultAvailable: true }, { jobId: job.jobId, issuedJob: true, blueprintId: blueprint.blueprintId }, JOBS.prepare(record));
  },
  blueprint_preview(args) {
    assertAllowedKeys(args, ['blueprint'], 'arguments');
    assertObject(args.blueprint, 'arguments.blueprint');
    assertBlueprintBounds(args.blueprint);
    const report = BLUEPRINT_SERVICE.validate(args.blueprint);
    if (!report.ok) throw invalidParams('Blueprint preview failed contract validation: ' + report.errors.map((e) => e.code).join(', '));
    const preview = BLUEPRINT_SERVICE.dryRun(report.value, MANIFEST);
    const job = createCompletedJob(report.value.blueprintId);
    storeJob({ job, operation: 'blueprint_preview', result: { kind: 'preview', preview } });
    return { job: copyValue(job), resultAvailable: true };
  },
  media_plan(args) {
    assertAllowedKeys(args, ['batch'], 'arguments');
    assertObject(args.batch, 'arguments.batch');
    return MediaPlanner.planMediaBatch(args.batch, MEDIA_INVENTORY, {}, MediaContracts);
  },
  job_get(args) { const jobId = requireJobId(args); const record = JOBS.get(jobId); return record ? { ok: true, job: copyValue(record.job) } : notFound(jobId); },
  job_cancel(args) {
    const jobId = requireJobId(args); const record = JOBS.get(jobId);
    if (!record) return pendingWrite(notFound(jobId), { jobId, errorCode: 'job-not-found' }, () => {}, 'rejected');
    if (['queued', 'running', 'input_required'].indexOf(record.job.status) === -1) {
      const payload = { ok: false, errors: [{ code: 'job-not-cancellable', path: 'jobId', message: 'Only queued, running, or input-required jobs can be cancelled.' }], job: copyValue(record.job) };
      return pendingWrite(payload, { jobId, blueprintId: record.job.blueprintId, errorCode: 'job-not-cancellable' }, () => {}, 'rejected');
    }
    const next = copyValue(record); next.job.status = 'cancelled'; next.job.updatedAt = new Date().toISOString();
    return pendingWrite({ ok: true, job: copyValue(next.job) }, { jobId, blueprintId: next.job.blueprintId }, JOBS.prepare(next));
  },
  job_get_result(args) {
    const jobId = requireJobId(args); const record = JOBS.get(jobId);
    if (!record) return notFound(jobId);
    if (record.job.status !== 'completed') return { ok: false, errors: [{ code: 'job-result-unavailable', path: 'jobId', message: 'A result is available only after job completion.' }], job: copyValue(record.job) };
    return { ok: true, job: copyValue(record.job), operation: record.operation, result: copyValue(record.result) };
  },
  blueprint_validate(args) {
    assertAllowedKeys(args, ['blueprint'], 'arguments');
    assertObject(args.blueprint, 'arguments.blueprint');
    assertBlueprintBounds(args.blueprint);
    const payload = reportPayload(Contracts.validateBlueprint(args.blueprint)); if (payload.ok) payload.requiredCapabilities = payload.value.requiredCapabilities; return payload;
  },
  resource_pack_capabilities(args) {
    assertAllowedKeys(args, ['profile'], 'arguments');
    if (args.profile !== undefined && !PACK_PROFILE_SCHEMA.enum.includes(args.profile)) throw invalidParams('arguments.profile must be text, illustrated or native');
    return ResourcePackService.getCapabilities(args.profile === undefined ? 'native' : args.profile);
  },
  resource_pack_generate(args) {
    assertAllowedKeys(args, ['request'], 'arguments');
    assertObject(args.request, 'arguments.request');
    const report = ResourcePackService.compose(args.request);
    if (!report.ok) throw invalidParams('Resource-pack draft failed validation: ' + report.errors.map((e) => e.code).join(', '));
    const job = createCompletedJob(args.request.requestId);
    const record = { job, operation: 'resource_pack_generate', result: { kind: 'resource-pack', pack: report.value, warnings: report.warnings, preview: ResourcePackService.previewPack(report.value, { profile: args.request.profile }) } };
    return pendingWrite({ job: copyValue(job), resultAvailable: true }, { jobId: job.jobId, issuedJob: true, blueprintId: args.request.requestId }, JOBS.prepare(record));
  },
  resource_pack_validate(args) {
    assertAllowedKeys(args, ['pack', 'profile'], 'arguments');
    assertObject(args.pack, 'arguments.pack');
    return reportPayload(ResourcePackService.validatePack(args.pack, { strict: true, profile: args.profile }));
  },
  resource_pack_preview(args) {
    assertAllowedKeys(args, ['pack', 'profile'], 'arguments');
    assertObject(args.pack, 'arguments.pack');
    const report = ResourcePackService.previewPack(args.pack, { profile: args.profile });
    if (!report.ok) return report;
    return report;
  },
  resource_pack_export(args) {
    assertAllowedKeys(args, ['pack', 'profile'], 'arguments');
    assertObject(args.pack, 'arguments.pack');
    const result = ResourcePackService.exportPack(args.pack, { profile: args.profile });
    if (!result.ok) throw invalidParams('Resource-pack export failed validation: ' + result.errors.map((e) => e.code).join(', '));
    return pendingWrite(result, { blueprintId: args.pack.allopack && args.pack.allopack.title ? String(args.pack.allopack.title) : '' }, () => {});
  },
  resource_pack_attach_image(args) {
    assertAllowedKeys(args, ['pack', 'profile', 'attachment'], 'arguments');
    assertObject(args.pack, 'arguments.pack');
    assertObject(args.attachment, 'arguments.attachment');
    const report = ResourcePackService.attachImage(args.pack, args.attachment, { profile: args.profile });
    if (!report.ok) throw invalidParams('Image attachment failed validation: ' + report.errors.map((e) => e.code).join(', '));
    return pendingWrite(reportPayload(report), { blueprintId: String(args.pack.allopack && args.pack.allopack.title || '') }, () => {});
  },
  artifact_validate(args) {
    assertAllowedKeys(args, ['artifact'], 'arguments');
    assertObject(args.artifact, 'arguments.artifact');
    return reportPayload(Contracts.validateArtifact(args.artifact));
  }
};

// ── JSON-RPC plumbing ──────────────────────────────────────────────────────

function invalidParams(message) {
  const e = new Error(String(message).slice(0, LIMITS.diagnosticChars));
  e.rpcCode = -32602;
  return e;
}

function send(message) {
  output.send(message);
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message: String(message).slice(0, LIMITS.diagnosticChars) } });
}

let initialized = false;

// Preserve JSON-RPC's distinction between numeric and string request identifiers.
function requestKey(id) { return typeof id + ':' + String(id); }
function validId(id) { return (typeof id === 'string' && id.length > 0 && id.length <= 128) || (typeof id === 'number' && Number.isSafeInteger(id)); }
const IN_FLIGHT = new Map();
const ACTIVE_IDS = new Set();
const REGISTERED_NAMES = new Set(TOOLS.map(tool => tool.name));
function permitted(name) {
  if (name === 'capabilities') return true;
  const classification = Contracts.getToolClassification(name);
  const scope = classification && classification.kind === 'read-only' ? 'artifact:read' : 'artifact:draft';
  return Array.isArray(MANIFEST.permissions) && MANIFEST.permissions.includes(scope);
}

async function handleRequest(msg) {
  const { id, method, params } = msg;
  if (!initialized && method !== 'initialize' && method !== 'ping') {
    sendError(id, -32002, 'Server not initialized');
    return;
  }
  switch (method) {
    case 'initialize': {
      const requested = params && params.protocolVersion;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.indexOf(requested) !== -1 ? requested : SUPPORTED_PROTOCOL_VERSIONS[0];
      initialized = true;
      sendResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'AlloFlow Agent Core local connector. Call `capabilities` for deployment providers and `resource_pack_capabilities` for AlloPack format contracts, examples and profile limits. Validate or create, revise, and preview deterministic Blueprint drafts, compose and validate agent-authored AlloPacks, or use `media_plan` for a read-only provider-aware media dry run. Resource-pack tools do not invoke AI or spend quota; the connector never makes hidden network requests. Execution and publication tools are intentionally unavailable.'
      });
      return;
    }
    case 'ping':
      sendResult(id, {});
      return;
    case 'tools/list':
      sendResult(id, { tools: TOOLS.filter(tool => permitted(tool.name)) });
      return;
    case 'tools/call': {
      const name = params && params.name;
      if (!isPlainObject(params) || Object.keys(params).some(key => !['name', 'arguments', '_meta'].includes(key)) || typeof name !== 'string' || !REGISTERED_NAMES.has(name) || !Object.prototype.hasOwnProperty.call(TOOL_HANDLERS, name)) { sendError(id, -32602, 'Unknown tool or invalid tool-call parameters'); return; }
      const handler = TOOL_HANDLERS[name];
      const inFlightKey = requestKey(id);
      const inFlight = { tool: name, cancelled: false };
      IN_FLIGHT.set(inFlightKey, inFlight);
      try {
        if (!permitted(name)) { const error = new Error('Configured manifest does not permit this tool.'); error.rpcCode = -32003; throw error; }
        const args = params.arguments === undefined ? {} : params.arguments;
        assertObject(args, 'arguments');
        if (params._meta !== undefined) assertObject(params._meta, 'params._meta');
        const output = await handler(args);
        let structured = output;
        if (AUDITED_TOOLS.has(name)) {
          if (!output || output.__pendingWrite !== true || typeof output.commit !== 'function') throw new Error('Audited tool did not provide a pending state change');
          appendAudit(name, output.auditOutcome || 'succeeded', output.audit || auditContextFromArgs(args));
          // The audit entry and the commit stay UNCONDITIONAL: a cancellation suppresses the
          // reply, never the record of a state change that already happened. An audit log with a
          // hole in it where someone cancelled would be worse than a late answer.
          output.commit(); structured = output.payload;
        }
        if (inFlight.cancelled) return; // per spec: no response for a cancelled request
        if (isPlainObject(structured) && (Array.isArray(structured.errors) || Array.isArray(structured.warnings))) {
          structured = { ...structured, ...(Array.isArray(structured.errors) ? { errors: boundedDiagnostics(structured.errors) } : {}), ...(Array.isArray(structured.warnings) ? { warnings: boundedDiagnostics(structured.warnings) } : {}) };
        }
        sendResult(id, {
          content: [{ type: 'text', text: JSON.stringify(structured) }],
          structuredContent: structured,
          isError: false
        });
      } catch (e) {
        if (AUDITED_TOOLS.has(name) && !(e && e.auditFailure)) {
          try {
            const context = auditContextFromArgs((params && params.arguments) || {});
            context.errorCode = e && e.rpcCode === -32003 ? 'permission-denied' : (e && e.rpcCode ? 'invalid-params' : 'tool-failed');
            appendAudit(name, 'rejected', context);
          } catch (auditError) { e = auditError; }
        }
        if (inFlight.cancelled) return;
        if (e && e.rpcCode) { sendError(id, e.rpcCode, e.message); return; }
        // Tool execution failure — reported in-band per MCP so the model can react.
        sendResult(id, {
          content: [{ type: 'text', text: 'Tool failed: ' + (e && e.message ? String(e.message).slice(0, LIMITS.diagnosticChars) : 'unknown error') }],
          isError: true
        });
      } finally {
        IN_FLIGHT.delete(inFlightKey);
      }
      return;
    }
    default:
      sendError(id, -32601, 'Method not found');
  }
}

// Protocol parity with the remediation sibling (2026-07-28). Two connectors from the same
// project behaving differently at the protocol level is a papercut for anyone writing against
// both. The stakes are lower here — these tools are deterministic and return in milliseconds, so
// a cancel almost always arrives after the answer — but "almost always" is why the suppression
// below checks rather than assumes.
function handleNotification(msg) {
  if (msg.method !== 'notifications/cancelled') return;
  const p = msg.params || {};
  if (!validId(p.requestId)) return;
  const entry = IN_FLIGHT.get(requestKey(p.requestId));
  if (!entry) return; // already answered, or never ours
  entry.cancelled = true;
  log('cancellation requested for request ' + hashRef(requestKey(p.requestId)) + ' (' + entry.tool + ')');
}

async function handleMessage(line) {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); }
  catch (_) { sendError(null, -32700, 'Parse error'); return; }
  if (!isPlainObject(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || !msg.method || msg.method.length > 128 || Object.keys(msg).some(key => !['jsonrpc', 'id', 'method', 'params'].includes(key)) || (Object.prototype.hasOwnProperty.call(msg, 'id') && !validId(msg.id)) || (msg.params !== undefined && !isPlainObject(msg.params))) {
    sendError(validId(msg && msg.id) ? msg.id : null, -32600, 'Invalid request'); return;
  }
  // Bound validation work as well as wire bytes. Images are strings and do not
  // increase this node count; ordinary native packs remain well below it.
  const stack = [[msg, 0]]; let nodes = 1;
  while (stack.length) {
    const [value, depth] = stack.pop();
    if (depth > 32) { if (msg.id !== undefined) sendError(msg.id, -32602, 'Request structure exceeds local limits'); return; }
    if (value && typeof value === 'object') for (const key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      if (++nodes > 50000) { if (msg.id !== undefined) sendError(msg.id, -32602, 'Request structure exceeds local limits'); return; }
      stack.push([value[key], depth + 1]);
    }
  }
  if (msg.id === undefined) {
    // Notification — never answered. notifications/cancelled is acted on; notifications/initialized
    // and everything else stay ignored.
    return handleNotification(msg);
  }
  const key = requestKey(msg.id);
  if (ACTIVE_IDS.has(key)) { sendError(msg.id, -32600, 'Duplicate in-flight request ID'); return; }
  ACTIVE_IDS.add(key);
  try { await handleRequest(msg); } finally { ACTIVE_IDS.delete(key); }
}

let input;
let ending = false;
const output = new BoundedOutput(process.stdout, {
  pressure: blocked => input?.setPressure(blocked),
  fatal: () => { log('transport output unavailable or backlog limit exceeded; closing'); input?.close(); process.stdout.destroy(); process.exitCode = 1; }
});
input = new BoundedInput(process.stdin, {
  dispatch: handleMessage,
  oversized: () => sendError(null, -32600, 'Message too large'),
  malformed: () => sendError(null, -32700, 'Invalid UTF-8 message'),
  failure: () => { log('unexpected transport failure; closing'); input?.close(); process.stdout.destroy(); process.exitCode = 1; },
  idle: () => { if (output.idle && !ending) { ending = true; log('stdin closed; exiting'); process.stdout.end(); } }
});

log('ready (stdio only, local validation/draft tools: ' + TOOLS.map((t) => t.name).join(', ') + ')');
