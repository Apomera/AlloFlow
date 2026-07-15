import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let Contracts;
let Security;
let Runtime;
let Guard;

beforeAll(() => {
  loadAlloModule('agent_core_media_contracts_module.js');
  loadAlloModule('agent_core_managed_asset_store_module.js');
  loadAlloModule('agent_core_media_security_module.js');
  loadAlloModule('agent_core_openai_media_adapter_module.js');
  loadAlloModule('agent_core_openai_media_runtime_module.js');
  loadAlloModule('agent_core_openai_media_production_guard_module.js');
  Contracts = window.AlloModules.AgentCoreMediaContracts;
  Security = window.AlloModules.AgentCoreMediaSecurity;
  Runtime = window.AlloModules.AgentCoreOpenAIMediaRuntime;
  Guard = window.AlloModules.AgentCoreOpenAIMediaProductionGuard;
});

function request(overrides = {}) {
  return {
    schemaVersion: '1.0',
    requestId: 'production-openai-001',
    operation: 'generate',
    prompt: 'Create an accessible instructional image of the water cycle.',
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
      maxCostUsd: 0.5,
      maxOperations: 3,
    },
    ...overrides,
  };
}

function pricingPolicy(overrides = {}) {
  return {
    schemaVersion: '1.0',
    provider: 'openai-api',
    model: 'gpt-image-2',
    effectiveAt: '2026-07-01T00:00:00Z',
    expiresAt: '2026-08-01T00:00:00Z',
    sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-image-2',
    estimateImageCost: () => 0.2,
    calculateImageCost: () => 0.15,
    ...overrides,
  };
}

function harness(overrides = {}) {
  let id = 0;
  const store = Security.createManagedAssetStore({
    createId: () => `asset_guard_${String(++id).padStart(8, '0')}`,
    authorizeByteRead: () => true,
  });
  const fetchAuthorized = overrides.fetchAuthorized || vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ data: [{ b64_json: 'AQIDBA==' }], usage: { total_tokens: 10 } }),
  }));
  const options = {
    executionEnabled: true,
    contracts: Contracts,
    assetStore: store,
    fetchAuthorized,
    authorizeExecution: () => true,
    authorizeProductionExecution: () => true,
    pricingPolicy: pricingPolicy(),
    altTextPolicy: {
      billing: 'metered',
      upperBoundUsd: 0.05,
      operations: 1,
      createAltText: async () => ({ text: 'Water moves through evaporation and precipitation.', actualCostUsd: 0.03, operations: 1 }),
    },
    now: () => new Date('2026-07-15T12:00:00Z'),
    maxImageAttempts: 2,
    retryDelaysMs: [0],
    sleep: async () => {},
    base64ToBytes: () => new Uint8Array([1, 2, 3, 4]),
    ...overrides,
  };
  return {
    fetchAuthorized,
    adapter: Guard.createProductionOpenAIMediaAdapter(options, Runtime),
  };
}

describe('OpenAI media production guard', () => {
  it('requires explicit production enablement independently of the base adapter', () => {
    const { adapter } = harness({ executionEnabled: false });
    expect(adapter.prepare(request())).toMatchObject({ ready: false, code: 'production-execution-disabled' });
  });

  it('refuses stale pricing before transport or authorization', async () => {
    const fetchAuthorized = vi.fn();
    const authorizeProductionExecution = vi.fn();
    const { adapter } = harness({
      fetchAuthorized,
      authorizeProductionExecution,
      pricingPolicy: pricingPolicy({ expiresAt: '2026-07-10T00:00:00Z' }),
    });
    expect(adapter.prepare(request())).toMatchObject({ ready: false, code: 'pricing-policy-stale' });
    await expect(adapter.execute(request())).rejects.toMatchObject({ code: 'pricing-policy-stale' });
    expect(fetchAuthorized).not.toHaveBeenCalled();
    expect(authorizeProductionExecution).not.toHaveBeenCalled();
  });

  it('reserves retry and alt-text cost and operations before execution', () => {
    const authorizeProductionExecution = vi.fn(() => true);
    const { adapter } = harness({ authorizeProductionExecution });
    expect(adapter.prepare(request())).toMatchObject({
      ready: true,
      estimate: { upperBoundUsd: 0.45, currency: 'USD' },
      operationUpperBound: 3,
      safety: { maxImageAttempts: 2, altTextOperations: 1 },
    });
  });

  it('retries only an approved transient status and reports aggregate usage', async () => {
    const fetchAuthorized = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [{ b64_json: 'AQIDBA==' }], usage: { total_tokens: 10 } }),
      });
    const { adapter } = harness({ fetchAuthorized });
    const result = await adapter.execute(request());
    expect(fetchAuthorized).toHaveBeenCalledTimes(2);
    expect(result.usage).toEqual({ operations: 3, actualCostUsd: 0.18, currency: 'USD' });
    expect(result.asset.altText).toMatch(/evaporation/);
    expect(Security.validateMediaResult(result, { request: request() }).ok).toBe(true);
  });

  it('does not retry non-transient provider failures or read their body', async () => {
    const text = vi.fn(async () => 'sensitive error');
    const fetchAuthorized = vi.fn(async () => ({ ok: false, status: 400, text }));
    const { adapter } = harness({ fetchAuthorized });
    await expect(adapter.execute(request())).rejects.toMatchObject({ code: 'openai-http-error' });
    expect(fetchAuthorized).toHaveBeenCalledTimes(1);
    expect(text).not.toHaveBeenCalled();
  });

  it('rejects oversized successful image data before decoding or import', async () => {
    const decode = vi.fn(() => new Uint8Array([1, 2, 3, 4]));
    const fetchAuthorized = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: 'AQIDBA==' }] }),
    }));
    const { adapter } = harness({ fetchAuthorized, maxDecodedBytes: 3, base64ToBytes: decode });
    await expect(adapter.execute(request())).rejects.toMatchObject({ code: 'openai-image-response-too-large' });
    expect(decode).not.toHaveBeenCalled();
  });

  it('requires itemized accounting from a metered alt-text provider', async () => {
    const { adapter, fetchAuthorized } = harness({
      altTextPolicy: {
        billing: 'metered', upperBoundUsd: 0.05, operations: 1,
        createAltText: async () => 'Unitemized alt text',
      },
    });
    await expect(adapter.execute(request())).rejects.toMatchObject({ code: 'alt-text-accounting-failed' });
    expect(fetchAuthorized).toHaveBeenCalledTimes(1);
  });
});
