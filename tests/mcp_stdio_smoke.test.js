// Protocol smoke test for the local stdio MCP connector.
// Spawns the real server and speaks newline-delimited JSON-RPC 2.0 over
// stdio, pinning initialization, Task C tool schemas/annotations and jobs,
// contract validation, redacted append-only auditing, honest capabilities,
// clean protocol errors, and protocol-only stdout.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SERVER = resolve(process.cwd(), 'desktop/mcp/alloflow-mcp-stdio.cjs');
const auditHome = mkdtempSync(join(tmpdir(), 'alloflow-mcp-task-c-'));
const auditPath = join(auditHome, 'agent-core', 'mcp-audit.jsonl');
const fixture = (name) =>
  JSON.parse(readFileSync(resolve(process.cwd(), 'test_data/agent_core', name), 'utf-8'));

let child;
let nextId = 1;
const pending = new Map();
let buffer = '';
const stray = []; // protocol-invalid stdout lines — must stay empty

function onStdout(chunk) {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, idx);
    buffer = buffer.slice(idx + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch (_) { stray.push(line); continue; }
    if (msg.jsonrpc !== '2.0') { stray.push(line); continue; }
    const key = msg.id === null || msg.id === undefined ? 'null' : msg.id;
    const resolver = pending.get(key);
    if (resolver) { pending.delete(key); resolver(msg); }
    else stray.push(line);
  }
}

function request(method, params, { rawId } = {}) {
  const id = rawId !== undefined ? rawId : nextId++;
  const key = id === null ? 'null' : id;
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(key); rejectP(new Error(`timeout waiting for ${method}`)); }, 8000);
    pending.set(key, (msg) => { clearTimeout(timer); resolveP(msg); });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
}

function expectNullIdError() {
  const key = 'null';
  return new Promise((resolveP, rejectP) => {
    const timer = setTimeout(() => { pending.delete(key); rejectP(new Error('timeout waiting for null-id error')); }, 8000);
    pending.set(key, (msg) => { clearTimeout(timer); resolveP(msg); });
  });
}

const callTool = async (name, args) => (await request('tools/call', { name, arguments: args })).result;

beforeAll(() => {
  child = spawn(process.execPath, [SERVER], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ALLOFLOW_MCP_DATA_DIR: auditHome, ALLOFLOW_MCP_MEDIA_INVENTORY_PATH: resolve(process.cwd(), 'test_data/agent_core/mcp_media_inventory.json') },
  });
  child.stdout.setEncoding('utf-8');
  child.stdout.on('data', onStdout);
});

afterAll(() => {
  if (child) child.kill();
  rmSync(auditHome, { recursive: true, force: true });
});

describe('MCP stdio local connector', () => {
  it('rejects tool requests before initialization, then completes the handshake', async () => {
    const early = await request('tools/list', {});
    expect(early.error.code).toBe(-32002);

    const res = await request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'smoke-test', version: '0.0.0' },
    });
    expect(res.error).toBeUndefined();
    expect(res.result.protocolVersion).toBe('2025-06-18');
    expect(res.result.serverInfo.name).toBe('alloflow-agent-core');
    expect(res.result.capabilities.tools).toBeDefined();
    notify('notifications/initialized', {});
    const ping = await request('ping', {});
    expect(ping.result).toEqual({});
  });

  it('lists the validation and Task C job slice with correct annotations', async () => {
    const res = await request('tools/list', {});
    const tools = res.result.tools;
    expect(tools.map((t) => t.name).sort()).toEqual(['artifact_validate', 'blueprint_create', 'blueprint_preview', 'blueprint_revise', 'blueprint_validate', 'capabilities', 'job_cancel', 'job_get', 'job_get_result', 'media_plan']);
    expect(tools.map((t) => t.name)).not.toContain('blueprint_execute');
    for (const t of tools) {
      expect(t.name).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
      expect(t.name).not.toContain('.');
      expect(t.annotations.title).toBeTruthy();
      const isReadOnly = ['capabilities', 'blueprint_validate', 'blueprint_preview', 'media_plan', 'job_get', 'job_get_result', 'artifact_validate'].includes(t.name);
      expect(t.annotations.readOnlyHint).toBe(isReadOnly);
      expect(t.annotations.destructiveHint).toBe(false);
      expect(t.inputSchema.type).toBe('object');
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  it('advertises canonical nested Blueprint and structural Artifact schemas', async () => {
    const res = await request('tools/list', {});
    const blueprintTool = res.result.tools.find((t) => t.name === 'blueprint_validate');
    const blueprintSchema = blueprintTool.inputSchema.properties.blueprint;
    expect(blueprintSchema.required).toEqual(expect.arrayContaining(['schemaVersion', 'blueprintId', 'plan']));
    expect(blueprintSchema.properties.plan.minItems).toBe(1);
    expect(blueprintSchema.properties.plan.items.required).toContain('tool');
    expect(blueprintSchema.properties.plan.items.properties.tool.enum).toContain('analysis');
    expect(blueprintSchema.properties.plan.items.additionalProperties).toBe(false);

    const artifactTool = res.result.tools.find((t) => t.name === 'artifact_validate');
    const artifactSchema = artifactTool.inputSchema.properties.artifact;
    expect(artifactSchema.required).toEqual(expect.arrayContaining(['schemaVersion', 'artifactId', 'type']));
    expect(artifactSchema.properties.type.enum).toContain('allopack');
    expect(artifactTool.description).toMatch(/structurally validate/i);
    expect(artifactTool.description).toMatch(/does not assess content quality or pedagogical completeness/i);
  });

  it('capabilities returns the honest empty desktop-local manifest with no secret fields', async () => {
    const result = await callTool('capabilities', {});
    const manifest = result.structuredContent;
    expect(result.isError).toBe(false);
    expect(manifest.schemaVersion).toBe('1.0');
    expect(manifest.deploymentMode).toBe('desktop-local');
    expect(manifest.text.available).toBe(false);
    expect(manifest.permissions).toEqual(['artifact:read', 'artifact:draft']);
    expect(JSON.stringify(manifest)).not.toMatch(/key|token|secret|password/i);
  });

  it('blueprint_validate accepts a valid Blueprint and returns the normalized contract value', async () => {
    // Build the blueprint the same way the service does: from the live legacy fixture.
    const legacy = fixture('legacy_config.json');
    const blueprint = {
      schemaVersion: '1.0',
      blueprintId: 'bp-mcp-smoke',
      audience: { gradeLevel: '5th Grade', language: 'English' },
      lessonDNA: legacy.lessonDNA,
      globalSettings: legacy.globalSettings,
      plan: legacy.resourcePlan,
    };
    const result = await callTool('blueprint_validate', { blueprint });
    expect(result.isError).toBe(false);
    expect(result.structuredContent.ok).toBe(true);
    expect(result.structuredContent.value.plan[0].tool).toBe('analysis');
    expect(result.structuredContent.requiredCapabilities).toEqual(['imageGeneration', 'text']);
  });

  it('blueprint_validate fails closed on unknown tools and secret-like fields', async () => {
    const bad = await callTool('blueprint_validate', {
      blueprint: { schemaVersion: '1.0', blueprintId: 'bp-bad', plan: [{ tool: 'invented' }], apiKey: 'sk-x' },
    });
    expect(bad.isError).toBe(false); // tool ran fine; the CONTRACT says no
    expect(bad.structuredContent.ok).toBe(false);
    const codes = bad.structuredContent.errors.map((e) => e.code);
    expect(codes).toContain('unknown-tool');
    expect(codes).toContain('secret-like-field');

    const malformed = await callTool('blueprint_validate', {
      blueprint: { schemaVersion: '1.0', blueprintId: 'bp-step', plan: [{ step: 'analysis' }] },
    });
    const malformedCodes = malformed.structuredContent.errors.map((e) => e.code);
    expect(malformedCodes).toContain('invalid-plan-item');
    expect(malformedCodes).not.toContain('empty-plan');
  });

  it('media_plan performs a credential-free included-provider dry run', async () => {
    const batch = {
      schemaVersion: '1.0', planId: 'mcp-media-plan',
      requests: [{
        schemaVersion: '1.0', requestId: 'mcp-media-1', operation: 'generate',
        prompt: 'Create a clear instructional illustration of evaporation.',
        accessibility: { altTextRequired: true },
        providerPolicy: { mode: 'deployment-default', allowMeteredUsage: false, maxCostUsd: 0, maxOperations: 2 }
      }],
      batchPolicy: { maxCostUsd: 0, maxOperations: 2 }
    };
    const result = await callTool('media_plan', { batch });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      status: 'ready', ready: true, executionAuthorized: false,
      estimate: { upperBoundUsd: 0, operations: 2 },
      items: [{ selections: { image: { provider: 'gemini-canvas' }, altText: { provider: 'gemini-canvas' } } }]
    });

    const leaky = structuredClone(batch);
    leaky.apiKey = 'sentinel-media-secret';
    const rejected = await callTool('media_plan', { batch: leaky });
    expect(rejected.structuredContent.status).toBe('invalid');
    expect(rejected.structuredContent.errors.some((e) => e.code === 'secret-like-field')).toBe(true);
    expect(JSON.stringify(rejected)).not.toContain('sentinel-media-secret');

    const metered = structuredClone(batch);
    metered.requests[0].providerPolicy = {
      mode: 'allow-listed', allowedProviders: ['openai-api'],
      allowedModels: ['gpt-image-2', 'gpt-vision'], allowMeteredUsage: true,
      maxCostUsd: 1, maxOperations: 2
    };
    metered.batchPolicy.maxCostUsd = 1;
    const pricingRequired = await callTool('media_plan', { batch: metered });
    expect(pricingRequired.structuredContent.status).toBe('input_required');
    expect(pricingRequired.structuredContent.executionAuthorized).toBe(false);

    const injectedInventory = await request('tools/call', {
      name: 'media_plan', arguments: { batch, inventory: { schemaVersion: '1.0', providers: [] } }
    });
    expect(injectedInventory.error.code).toBe(-32602);
  });

  it('artifact_validate works end to end', async () => {
    const good = await callTool('artifact_validate', {
      artifact: { schemaVersion: '1.0', artifactId: 'art-1', type: 'quiz', title: 'Quiz', data: { questions: [] } },
    });
    expect(good.structuredContent.ok).toBe(true);
    const bad = await callTool('artifact_validate', {
      artifact: { schemaVersion: '0.9', artifactId: 'art-2', type: 'nope' },
    });
    expect(bad.structuredContent.ok).toBe(false);
  });


  it('runs create, revise, preview, and job tools with redacted append-only audit records', async () => {
    const created = await callTool('blueprint_create', {
      request: { blueprintId: 'bp-task-c', gradeLevel: '5th Grade', standards: 'NGSS 5-ESS2-1', plan: ['analysis', 'quiz', 'lesson-plan'] },
    });
    expect(created.isError).toBe(false);
    expect(created.structuredContent.job.status).toBe('completed');
    const createJobId = created.structuredContent.job.jobId;

    const createStatus = await callTool('job_get', { jobId: createJobId });
    expect(createStatus.structuredContent).toMatchObject({ ok: true, job: { blueprintId: "bp-task-c", progress: 1 } });
    const missingStatus = await callTool('job_get', { jobId: 'job-missing' });
    expect(missingStatus.structuredContent.errors[0].code).toBe('job-not-found');
    const createResult = await callTool('job_get_result', { jobId: createJobId });
    expect(createResult.structuredContent.result.kind).toBe('blueprint');
    const blueprint = createResult.structuredContent.result.blueprint;
    expect(blueprint.plan.map((step) => step.tool)).toEqual(['analysis', 'quiz', 'lesson-plan']);

    const revised = await callTool('blueprint_revise', { blueprint, changes: { addTools: ['glossary'], setDirectives: { quiz: 'Use DOK 3' } } });
    const revisedResult = await callTool('job_get_result', { jobId: revised.structuredContent.job.jobId });
    const revisedBlueprint = revisedResult.structuredContent.result.blueprint;
    expect(revisedBlueprint.review.state).toBe('draft');
    expect(revisedBlueprint.plan.map((step) => step.tool)).toEqual(['analysis', 'quiz', 'glossary', 'lesson-plan']);
    expect(revisedBlueprint.plan.find((step) => step.tool === 'quiz').directive).toBe('Use DOK 3');

    const previewed = await callTool('blueprint_preview', { blueprint: revisedBlueprint });
    const previewResult = await callTool('job_get_result', { jobId: previewed.structuredContent.job.jobId });
    expect(previewResult.structuredContent.result.kind).toBe('preview');
    expect(previewResult.structuredContent.result.preview.approvalRequired).toBe(true);
    expect(previewResult.structuredContent.result.preview.missingCapabilities).toEqual(['text']);

    const cancel = await callTool('job_cancel', { jobId: createJobId });
    expect(cancel.structuredContent.errors[0].code).toBe('job-not-cancellable');
    const rejected = await request('tools/call', { name: 'blueprint_create', arguments: { request: { blueprintId: 'bp-rejected', plan: [{ tool: 'analysis', apiKey: 'sentinel-secret' }] } } });
    expect(rejected.error.code).toBe(-32602);

    const lines = readFileSync(auditPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(lines.map((entry) => [entry.tool, entry.outcome])).toEqual([['blueprint_create', 'succeeded'], ['blueprint_revise', 'succeeded'], ['job_cancel', 'rejected'], ['blueprint_create', 'rejected']]);
    expect(lines[0]).toMatchObject({ schemaVersion: '1.0', classification: 'draft-writing', jobId: createJobId });
    expect(lines[0].blueprintRef).toMatch(/^sha256:[a-f0-9]{16}$/);
    expect(lines[2]).toMatchObject({ classification: 'external-effect', errorCode: 'job-not-cancellable' });
    expect(lines[3]).toMatchObject({ errorCode: 'invalid-params' });
    expect(lines[3].blueprintRef).toMatch(/^sha256:[a-f0-9]{16}$/);
    expect(readFileSync(auditPath, 'utf8')).not.toContain('sentinel-secret');
    for (const entry of lines) {
      expect(Object.keys(entry).every((key) => ['schemaVersion', 'eventId', 'recordedAt', 'tool', 'classification', 'outcome', 'jobId', 'blueprintRef', 'errorCode'].includes(key))).toBe(true);
    }
  });
  it('returns clean protocol errors for unknown methods, unknown tools, and bad params', async () => {
    const noMethod = await request('resources/list', {});
    expect(noMethod.error.code).toBe(-32601);
    const noTool = await request('tools/call', { name: 'blueprint_execute', arguments: {} });
    expect(noTool.error.code).toBe(-32602);
    const badParams = await request('tools/call', { name: 'blueprint_validate', arguments: { blueprint: 'not-an-object' } });
    expect(badParams.error.code).toBe(-32602);
  });

  it('answers malformed JSON with -32700 and never breaks the session', async () => {
    const errPromise = expectNullIdError();
    child.stdin.write('this is not json\n');
    const err = await errPromise;
    expect(err.error.code).toBe(-32700);
    const ping = await request('ping', {});
    expect(ping.result).toEqual({});
  });

  it('kept stdout protocol-clean (no stray non-JSON-RPC output)', () => {
    expect(stray).toEqual([]);
  });
});
