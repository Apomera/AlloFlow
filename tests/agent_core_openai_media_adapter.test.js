import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let Contracts;
let Security;
let OpenAIRuntime;
let OpenAIAdapter;
let fixture;

beforeAll(() => {
  loadAlloModule('agent_core_media_contracts_module.js');
  loadAlloModule('agent_core_managed_asset_store_module.js');
  loadAlloModule('agent_core_media_security_module.js');
  loadAlloModule('agent_core_openai_media_adapter_module.js');
  loadAlloModule('agent_core_openai_media_runtime_module.js');
  Contracts = window.AlloModules.AgentCoreMediaContracts;
  Security = window.AlloModules.AgentCoreMediaSecurity;
  OpenAIAdapter = window.AlloModules.AgentCoreOpenAIMediaAdapter;
  OpenAIRuntime = window.AlloModules.AgentCoreOpenAIMediaRuntime;
  fixture = JSON.parse(readFileSync(
    resolve(process.cwd(), 'test_data/agent_core/openai_media_request_shapes.json'), 'utf8'
  ));
});

class FakeBlob {
  constructor(parts, options = {}) {
    this.parts = parts;
    this.type = options.type || '';
  }
}

class FakeFormData {
  constructor() { this.entries = []; }
  append(name, value, filename) { this.entries.push({ name, value, filename }); }
}

function generateRequest(overrides = {}) {
  return {
    schemaVersion: '1.0',
    requestId: 'openai-media-001',
    operation: 'generate',
    prompt: 'Create a clear instructional illustration of evaporation.',
    purpose: 'glossary-illustration',
    output: { width: 1024, height: 1024, mimeType: 'image/png', quality: 'standard' },
    accessibility: { altTextRequired: true },
    providerPolicy: {
      mode: 'allow-listed',
      allowedProviders: ['openai-api'],
      allowedModels: ['gpt-image-2'],
      preferredProvider: 'openai-api',
      preferredModel: 'gpt-image-2',
      allowMeteredUsage: true,
      maxCostUsd: 1,
      maxOperations: 1,
    },
    ...overrides,
  };
}

function createHarness(overrides = {}) {
  let nextId = 0;
  const fetchCalls = [];
  const store = Security.createManagedAssetStore({
    createId: () => `asset_openai_${String(++nextId).padStart(8, '0')}`,
    authorizeByteRead: ({ purpose }) => purpose.startsWith('openai-image-edit-'),
  });
  const options = {
    contracts: Contracts,
    assetStore: store,
    fetchAuthorized: vi.fn(async (url, request, authorizationContext) => {
      fetchCalls.push({ url, request, authorizationContext });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ b64_json: 'AQIDBA==' }],
          usage: {
            input_tokens: 10,
            input_tokens_details: { text_tokens: 4, image_tokens: 6 },
            output_tokens: 20,
            total_tokens: 30,
          },
        }),
      };
    }),
    authorizeExecution: () => true,
    estimateCost: () => ({ upperBoundUsd: 0.25 }),
    calculateActualCost: () => 0.2,
    createAltText: async () => 'Water vapor rising from a lake toward a cloud.',
    base64ToBytes: () => new Uint8Array([1, 2, 3, 4]),
    FormData: FakeFormData,
    Blob: FakeBlob,
    ...overrides,
  };
  return {
    store,
    fetchCalls,
    options,
    adapter: OpenAIRuntime.createGuardedOpenAIMediaAdapter(options),
  };
}

describe('guarded OpenAI media adapter', () => {
  it('remains disabled and unregistered by default', () => {
    expect(OpenAIAdapter.OPENAI_MEDIA_EXECUTION_DEFAULT_ENABLED).toBe(false);
    expect(OpenAIAdapter.OPENAI_BASE_URL).toBe('https://api.openai.com/v1');
  });

  it('maps educational output dimensions to supported GPT Image sizes', () => {
    expect(OpenAIAdapter.selectOpenAIImageSize(800, 800)).toBe('1024x1024');
    expect(OpenAIAdapter.selectOpenAIImageSize(1600, 900)).toBe('1536x1024');
    expect(OpenAIAdapter.selectOpenAIImageSize(900, 1600)).toBe('1024x1536');
  });

  it('preflights metered cost before authorizing execution', () => {
    const { adapter } = createHarness();
    expect(adapter.prepare(generateRequest())).toMatchObject({
      ready: true,
      estimate: { upperBoundUsd: 0.25, currency: 'USD' },
      provider: { id: 'openai-api', model: 'gpt-image-2', billing: 'metered' },
      api: { size: '1024x1024', quality: 'medium', outputFormat: 'png' },
    });
  });

  it('uses the documented JSON generation shape without receiving an API key', async () => {
    const { adapter, fetchCalls } = createHarness();
    const result = await adapter.execute(generateRequest());
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0].url).toBe(fixture.generation.url);
    expect(fetchCalls[0].authorizationContext).toEqual(fixture.generation.authorizationContext);
    expect(fetchCalls[0].request.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(fetchCalls[0].request.body)).toEqual(fixture.generation.body);
    expect(result).toMatchObject({
      schemaVersion: '1.0', requestId: 'openai-media-001', status: 'completed',
      provider: { id: 'openai-api', model: 'gpt-image-2' },
      usage: { operations: 1, actualCostUsd: 0.2, currency: 'USD' },
      asset: { mimeType: 'image/png', width: 1024, height: 1024 },
    });
    expect(result.asset.altText).toMatch(/Water vapor/);
    expect(result.prompt).toBeUndefined();
    expect(result.providerUsage).toBeUndefined();
    expect(Security.validateMediaResult(result, { request: generateRequest() }).ok).toBe(true);
  });

  it('uses multipart image[] fields for source and reference editing', async () => {
    const { adapter, store, fetchCalls } = createHarness();
    const source = store.importAsset({ bytes: new Uint8Array([8, 8]), mimeType: 'image/png' });
    const reference = store.importAsset({ bytes: new Uint8Array([9, 9]), mimeType: 'image/jpeg' });
    const request = generateRequest({
      requestId: 'openai-edit-001',
      operation: 'edit',
      prompt: 'Remove the label while preserving the diagram.',
      sourceAsset: { handle: source.handle, mimeType: 'image/png' },
      referenceAssets: [{ handle: reference.handle, mimeType: 'image/jpeg' }],
      output: { width: 1600, height: 900, mimeType: 'image/webp', quality: 'high' },
    });
    const result = await adapter.execute(request);
    const call = fetchCalls[0];
    expect(call.url).toBe(fixture.editing.url);
    expect(call.authorizationContext).toEqual(fixture.editing.authorizationContext);
    expect(call.request.headers).toBeUndefined();
    expect(call.request.body).toBeInstanceOf(FakeFormData);
    const fields = call.request.body.entries.map(({ name, value, filename }) => [
      name,
      value instanceof FakeBlob ? filename : value,
    ]);
    expect(fields).toEqual(fixture.editing.fields);
    expect(fields.some(([name]) => name === 'input_fidelity')).toBe(false);
    expect(result.asset).toMatchObject({ mimeType: 'image/webp', width: 1536, height: 1024 });
  });

  it('blocks unapproved metered usage, budgets, and runtime authorization before fetch', async () => {
    const noMeter = generateRequest();
    noMeter.providerPolicy.allowMeteredUsage = false;
    const first = createHarness();
    await expect(first.adapter.execute(noMeter)).rejects.toMatchObject({ code: 'metered-usage-not-approved' });
    expect(first.fetchCalls).toHaveLength(0);

    const second = createHarness({ estimateCost: () => ({ upperBoundUsd: 1.5 }) });
    await expect(second.adapter.execute(generateRequest())).rejects.toMatchObject({ code: 'cost-limit-exceeded' });
    expect(second.fetchCalls).toHaveLength(0);

    const third = createHarness({ authorizeExecution: () => false });
    await expect(third.adapter.execute(generateRequest())).rejects.toMatchObject({ code: 'execution-not-authorized' });
    expect(third.fetchCalls).toHaveLength(0);
  });

  it('requires an alt-text provider before making a paid accessible request', async () => {
    const { adapter, fetchCalls } = createHarness({ createAltText: null });
    expect(adapter.prepare(generateRequest())).toMatchObject({ ready: false, code: 'alt-text-provider-required' });
    await expect(adapter.execute(generateRequest())).rejects.toMatchObject({ code: 'alt-text-provider-required' });
    expect(fetchCalls).toHaveLength(0);
  });

  it('returns sanitized provider errors without reading or echoing response bodies', async () => {
    const { options } = createHarness();
    const text = vi.fn(async () => 'sensitive provider response');
    options.fetchAuthorized = async () => ({ ok: false, status: 429, text });
    const adapter = OpenAIRuntime.createGuardedOpenAIMediaAdapter(options);
    await expect(adapter.execute(generateRequest())).rejects.toMatchObject({
      code: 'openai-http-error',
      message: 'OpenAI image request failed with HTTP status 429.',
    });
    expect(text).not.toHaveBeenCalled();
  });
});
