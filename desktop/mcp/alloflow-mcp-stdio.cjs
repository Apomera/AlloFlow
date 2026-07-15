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
 * local providers; an invalid file falls back to the empty manifest.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const Contracts = require(path.join(__dirname, '..', '..', 'agent_core_contracts_module.js'));
const BlueprintServiceModule = require(path.join(__dirname, '..', '..', 'agent_core_blueprint_service_module.js'));
const MediaContracts = require(path.join(__dirname, '..', '..', 'agent_core_media_contracts_module.js'));
const MediaPlanner = require(path.join(__dirname, '..', '..', 'agent_core_media_planner_module.js'));

const SERVER_INFO = { name: 'alloflow-agent-core', title: 'AlloFlow Agent Core (local)', version: '0.3.0' };
const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_LINE_CHARS = 4000000;
const MAX_JOBS = 256;
const AUDITED_TOOLS = new Set(['blueprint_create', 'blueprint_revise', 'job_cancel']);

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
    const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const report = Contracts.validateCapabilityManifest(parsed);
    if (report.ok) { log('manifest loaded from ' + path.basename(p)); return report.value; }
    log('manifest at ALLOFLOW_MCP_MANIFEST_PATH failed validation (' + report.errors.map((e) => e.code).join(', ') + '); using empty manifest');
  } catch (e) {
    log('manifest unreadable (' + e.message + '); using empty manifest');
  }
  return fallback;
}

const MANIFEST = loadManifest();

function emptyMediaInventory() { return { schemaVersion: MediaContracts.SCHEMA_VERSION, providers: [] }; }
function loadMediaInventory() {
  const fallback = MediaContracts.validateProviderInventory(emptyMediaInventory()).value;
  const p = process.env.ALLOFLOW_MCP_MEDIA_INVENTORY_PATH;
  if (!p) return fallback;
  try {
    const report = MediaContracts.validateProviderInventory(JSON.parse(fs.readFileSync(p, 'utf-8')));
    if (report.ok) { log('media inventory loaded from ' + path.basename(p)); return report.value; }
    log('media inventory failed validation (' + report.errors.map((e) => e.code).join(', ') + '); using empty inventory');
  } catch (e) { log('media inventory unreadable (' + e.message + '); using empty inventory'); }
  return fallback;
}
const MEDIA_INVENTORY = loadMediaInventory();

const BLUEPRINT_SERVICE = BlueprintServiceModule.createBlueprintService({ contracts: Contracts });
const JOBS = new Map();

function getDataDir() {
  if (process.env.ALLOFLOW_MCP_DATA_DIR) return path.resolve(process.env.ALLOFLOW_MCP_DATA_DIR);
  if (process.env.ALLOFLOW_DESKTOP_HOME) return path.resolve(process.env.ALLOFLOW_DESKTOP_HOME);
  return path.resolve(__dirname, '..', '.local');
}

function getAuditPath() { return path.join(getDataDir(), 'agent-core', 'mcp-audit.jsonl'); }

function appendAudit(toolName, outcome, context) {
  const classification = Contracts.getToolClassification(toolName);
  const ctx = context || {};
  const record = { schemaVersion: Contracts.SCHEMA_VERSION, eventId: crypto.randomUUID(), recordedAt: new Date().toISOString(), tool: toolName, classification: classification ? classification.kind : "unknown", outcome };
  if (typeof ctx.jobId === 'string' && ctx.jobId) record.jobId = ctx.jobId.slice(0, 200);
  if (typeof ctx.blueprintId === 'string' && ctx.blueprintId) {
    record.blueprintRef = 'sha256:' + crypto.createHash('sha256').update(ctx.blueprintId, 'utf8').digest('hex').slice(0, 16);
  }
  if (typeof ctx.errorCode === 'string' && ctx.errorCode) record.errorCode = ctx.errorCode.slice(0, 100);
  try {
    const auditPath = getAuditPath();
    fs.mkdirSync(path.dirname(auditPath), { recursive: true, mode: 0o700 });
    fs.appendFileSync(auditPath, JSON.stringify(record) + '\n', { encoding: 'utf8', mode: 0o600 });
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
  if (unknown.length) throw invalidParams(name + ' has unsupported field(s): ' + unknown.join(', '));
}
function assertOptionalString(value, key, maxLength, name) {
  if (value[key] !== undefined && (typeof value[key] !== "string" || value[key].length > maxLength)) throw invalidParams(name + "." + key + " must be a string of at most " + maxLength + " characters");
}
function assertOptionalObject(value, key, name) {
  if (value[key] !== undefined && !isPlainObject(value[key])) throw invalidParams(name + "." + key + " must be an object");
}
function assertOptionalToolArray(value, key, name) {
  if (value[key] === undefined) return;
  if (!Array.isArray(value[key]) || value[key].some((tool) => typeof tool !== "string" || Contracts.FALLBACK_TOOL_IDS.indexOf(tool) === -1)) throw invalidParams(name + "." + key + " must contain only known tool IDs");
}
function validateCreateRequest(request) {
  assertAllowedKeys(request, ['blueprintId', 'gradeLevel', 'language', 'standards', 'interests', 'plan', 'lessonDNA', 'globalSettings', 'provenance'], 'arguments.request');
  if (typeof request.blueprintId !== 'string' || !request.blueprintId.trim() || request.blueprintId.length > 200) throw invalidParams('arguments.request.blueprintId is required and must be at most 200 characters');
  const limits = { gradeLevel: 200, language: 100, standards: 4000, interests: 2000 };
  Object.keys(limits).forEach((key) => assertOptionalString(request, key, limits[key], 'arguments.request'));
  ['lessonDNA', 'globalSettings', 'provenance'].forEach((key) => assertOptionalObject(request, key, 'arguments.request'));
  if (!Array.isArray(request.plan) || !request.plan.length) throw invalidParams('arguments.request.plan must be a non-empty array');
  request.plan.forEach((item, index) => {
    if (typeof item === 'string') {
      if (Contracts.FALLBACK_TOOL_IDS.indexOf(item) === -1) throw invalidParams('arguments.request.plan[' + index + '] must be a known tool ID');
      return;
    }
    assertAllowedKeys(item, ['tool', 'directive'], 'arguments.request.plan[' + index + ']');
    if (typeof item.tool !== 'string' || Contracts.FALLBACK_TOOL_IDS.indexOf(item.tool) === -1) throw invalidParams('arguments.request.plan[' + index + '].tool must be a known tool ID');
    if (item.directive !== undefined && typeof item.directive !== 'string') throw invalidParams('arguments.request.plan[' + index + '].directive must be a string');
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
    const bad = Object.keys(changes.setDirectives).find((tool) => Contracts.FALLBACK_TOOL_IDS.indexOf(tool) === -1 || typeof changes.setDirectives[tool] !== 'string');
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
function storeJob(record) {
  if (!JOBS.has(record.job.jobId) && JOBS.size >= MAX_JOBS) { const oldest = JOBS.keys().next().value; if (oldest) JOBS.delete(oldest); }
  JOBS.set(record.job.jobId, record);
}
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
      items: {
        type: 'object',
        required: ['tool'],
        properties: {
          tool: { type: 'string', enum: Contracts.FALLBACK_TOOL_IDS },
          directive: { type: 'string' }
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
    plan: { type: 'array', minItems: 1, items: { oneOf: [{ type: 'string', enum: Contracts.FALLBACK_TOOL_IDS }, BLUEPRINT_INPUT_SCHEMA.properties.plan.items] } },
    lessonDNA: { type: 'object', additionalProperties: true }, globalSettings: { type: 'object', additionalProperties: true },
    provenance: PROVENANCE_INPUT_SCHEMA
  }, additionalProperties: false
};

const REVISION_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    addTools: { type: 'array', items: { type: 'string', enum: Contracts.FALLBACK_TOOL_IDS } },
    removeTools: { type: 'array', items: { type: 'string', enum: Contracts.FALLBACK_TOOL_IDS } },
    setDirectives: { type: 'object', additionalProperties: { type: 'string' } },
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
  )
];

function reportPayload(report) {
  return {
    ok: report.ok,
    errors: report.errors || [],
    warnings: report.warnings || [],
    value: report.ok ? report.value : null
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
    return pendingWrite({ job: copyValue(job), resultAvailable: true }, { jobId: job.jobId, blueprintId: blueprint.blueprintId }, () => storeJob(record));
  },
  blueprint_revise(args) {
    assertAllowedKeys(args, ['blueprint', 'changes'], 'arguments');
    assertObject(args.blueprint, 'arguments.blueprint');
    validateRevisionChanges(args.changes);
    const report = BLUEPRINT_SERVICE.revise(args.blueprint, args.changes);
    if (!report.ok) throw invalidParams('Blueprint revision failed contract validation: ' + report.errors.map((e) => e.code).join(', '));
    const blueprint = report.value;
    const job = createCompletedJob(blueprint.blueprintId);
    const record = { job, operation: 'blueprint_revise', result: { kind: 'blueprint', blueprint } };
    return pendingWrite({ job: copyValue(job), resultAvailable: true }, { jobId: job.jobId, blueprintId: blueprint.blueprintId }, () => storeJob(record));
  },
  blueprint_preview(args) {
    assertAllowedKeys(args, ['blueprint'], 'arguments');
    assertObject(args.blueprint, 'arguments.blueprint');
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
    return pendingWrite({ ok: true, job: copyValue(next.job) }, { jobId, blueprintId: next.job.blueprintId }, () => storeJob(next));
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
    const payload = reportPayload(Contracts.validateBlueprint(args.blueprint)); if (payload.ok) payload.requiredCapabilities = payload.value.requiredCapabilities; return payload;
  },
  artifact_validate(args) {
    assertAllowedKeys(args, ['artifact'], 'arguments');
    assertObject(args.artifact, 'arguments.artifact');
    return reportPayload(Contracts.validateArtifact(args.artifact));
  }
};

// ── JSON-RPC plumbing ──────────────────────────────────────────────────────

function invalidParams(message) {
  const e = new Error(message);
  e.rpcCode = -32602;
  return e;
}

function send(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

let initialized = false;

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
        instructions: 'AlloFlow Agent Core local connector. Call `capabilities` first; validate or create, revise, and preview deterministic Blueprint drafts, or use `media_plan` for a read-only provider-aware media dry run. These calls do not invoke AI or spend quota. Execution tools are intentionally unavailable.'
      });
      return;
    }
    case 'ping':
      sendResult(id, {});
      return;
    case 'tools/list':
      sendResult(id, { tools: TOOLS });
      return;
    case 'tools/call': {
      const name = params && params.name;
      const handler = TOOL_HANDLERS[name];
      if (!handler) { sendError(id, -32602, 'Unknown tool: ' + String(name)); return; }
      try {
        const args = (params && params.arguments) || {};
        const output = await handler(args);
        let structured = output;
        if (AUDITED_TOOLS.has(name)) {
          if (!output || output.__pendingWrite !== true || typeof output.commit !== 'function') throw new Error('Audited tool did not provide a pending state change');
          appendAudit(name, output.auditOutcome || 'succeeded', output.audit || auditContextFromArgs(args));
          output.commit(); structured = output.payload;
        }
        sendResult(id, {
          content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }],
          structuredContent: structured,
          isError: false
        });
      } catch (e) {
        if (AUDITED_TOOLS.has(name) && !(e && e.auditFailure)) {
          try {
            const context = auditContextFromArgs((params && params.arguments) || {});
            context.errorCode = e && e.rpcCode ? 'invalid-params' : 'tool-failed';
            appendAudit(name, 'rejected', context);
          } catch (auditError) { e = auditError; }
        }
        if (e && e.rpcCode) { sendError(id, e.rpcCode, e.message); return; }
        // Tool execution failure — reported in-band per MCP so the model can react.
        sendResult(id, {
          content: [{ type: 'text', text: 'Tool failed: ' + (e && e.message ? e.message : 'unknown error') }],
          isError: true
        });
      }
      return;
    }
    default:
      sendError(id, -32601, 'Method not found: ' + String(method));
  }
}

function handleMessage(line) {
  if (!line.trim()) return;
  if (line.length > MAX_LINE_CHARS) { sendError(null, -32600, 'Message too large'); return; }
  let msg;
  try { msg = JSON.parse(line); }
  catch (_) { sendError(null, -32700, 'Parse error'); return; }
  if (!msg || msg.jsonrpc !== '2.0') { sendError(msg && msg.id !== undefined ? msg.id : null, -32600, 'Invalid request'); return; }
  if (msg.id === undefined || msg.id === null) {
    // Notification — never respond. notifications/initialized and
    // notifications/cancelled are expected; others are ignored.
    return;
  }
  return handleRequest(msg);
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', (line) => {
  Promise.resolve().then(() => handleMessage(line)).catch((e) => {
    log('unexpected error: ' + (e && e.message ? e.message : 'unknown'));
  });
});
rl.on('close', () => { log('stdin closed; exiting'); process.exit(0); });

log('ready (stdio only, local validation/draft tools: ' + TOOLS.map((t) => t.name).join(', ') + ')');
