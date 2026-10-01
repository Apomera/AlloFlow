import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let Contracts;
let Planner;

beforeAll(() => {
  loadAlloModule('agent_core_media_contracts_module.js');
  loadAlloModule('agent_core_media_planner_module.js');
  Contracts = window.AlloModules.AgentCoreMediaContracts;
  Planner = window.AlloModules.AgentCoreMediaPlanner;
});

const inventory = () => ({
  schemaVersion: '1.0',
  providers: [
    {
      id: 'gemini-canvas',
      displayName: 'Gemini Canvas',
      transport: 'host-subscription',
      billing: 'included',
      models: [
        { id: 'canvas-image', modalities: ['imageGeneration', 'imageEditing'] },
        { id: 'canvas-vision', modalities: ['vision', 'text'] },
      ],
    },
    {
      id: 'openai-api',
      displayName: 'OpenAI API',
      transport: 'api',
      billing: 'metered',
      models: [
        { id: 'gpt-image-2', modalities: ['imageGeneration', 'imageEditing'] },
        { id: 'gpt-vision', modalities: ['vision', 'text'] },
      ],
    },
  ],
});

function request(id = 'glossary-water-cycle') {
  return {
    schemaVersion: '1.0',
    requestId: id,
    operation: 'generate',
    prompt: 'Create a clear instructional illustration of evaporation.',
    purpose: 'glossary-illustration',
    accessibility: { altTextRequired: true },
    providerPolicy: {
      mode: 'deployment-default',
      allowMeteredUsage: false,
      maxCostUsd: 0,
      maxOperations: 2,
    },
  };
}

function batch(requests = [request()]) {
  return {
    schemaVersion: '1.0',
    planId: 'glossary-media-plan',
    requests,
    batchPolicy: { maxCostUsd: 0, maxOperations: requests.length * 2 },
  };
}

describe('capability-aware media planner', () => {
  it('selects included image and vision capabilities without invoking anything', () => {
    const estimateOperation = vi.fn();
    const plan = Planner.planMediaBatch(batch(), inventory(), { estimateOperation }, Contracts);
    expect(plan).toMatchObject({
      status: 'ready',
      ready: true,
      executionAuthorized: false,
      estimate: { upperBoundUsd: 0, operations: 2, currency: 'USD' },
    });
    expect(plan.items[0].selections).toMatchObject({
      image: { provider: 'gemini-canvas', model: 'canvas-image', billing: 'included' },
      altText: { provider: 'gemini-canvas', model: 'canvas-vision', billing: 'included' },
    });
    expect(estimateOperation).not.toHaveBeenCalled();
  });

  it('requires current runtime pricing for every metered role', () => {
    const mediaRequest = request();
    mediaRequest.providerPolicy = {
      mode: 'allow-listed',
      allowedProviders: ['openai-api'],
      allowedModels: ['gpt-image-2', 'gpt-vision'],
      preferredProvider: 'openai-api',
      allowMeteredUsage: true,
      maxCostUsd: 1,
      maxOperations: 2,
    };
    const value = batch([mediaRequest]);
    value.batchPolicy = { maxCostUsd: 1, maxOperations: 2 };
    const plan = Planner.planMediaBatch(value, inventory(), {}, Contracts);
    expect(plan.status).toBe('input_required');
    expect(plan.items[0].issues.map((issue) => issue.code)).toEqual([
      'pricing-estimate-required',
      'pricing-estimate-required',
    ]);
  });

  it('aggregates metered image and alt-text estimates against request and batch approval', () => {
    const mediaRequest = request();
    mediaRequest.providerPolicy = {
      mode: 'allow-listed',
      allowedProviders: ['openai-api'],
      allowedModels: ['gpt-image-2', 'gpt-vision'],
      preferredProvider: 'openai-api',
      allowMeteredUsage: true,
      maxCostUsd: 0.3,
      maxOperations: 2,
    };
    const value = batch([mediaRequest]);
    value.batchPolicy = { maxCostUsd: 0.3, maxOperations: 2 };
    const estimateOperation = vi.fn(({ role }) => ({
      upperBoundUsd: role === 'image' ? 0.2 : 0.05,
      operations: 1,
    }));
    const plan = Planner.planMediaBatch(value, inventory(), { estimateOperation }, Contracts);
    expect(plan.status).toBe('ready');
    expect(plan.estimate).toEqual({ upperBoundUsd: 0.25, operations: 2, currency: 'USD' });
    expect(estimateOperation).toHaveBeenCalledTimes(2);
  });

  it('blocks a plan whose accessible image omits an approved vision capability', () => {
    const onlyImages = inventory();
    onlyImages.providers[0].models = [{ id: 'canvas-image', modalities: ['imageGeneration'] }];
    onlyImages.providers.splice(1, 1);
    const plan = Planner.planMediaBatch(batch(), onlyImages, {}, Contracts);
    expect(plan.status).toBe('blocked');
    expect(plan.items[0].issues[0].code).toBe('missing-alt-text-capability');
  });

  it('suggests but never applies generation or text-only fallbacks for unsupported editing', () => {
    const mediaRequest = request('edit-water-cycle');
    mediaRequest.operation = 'edit';
    mediaRequest.sourceAsset = { handle: 'asset_source_12345678', mimeType: 'image/png' };
    const noEditing = inventory();
    noEditing.providers[0].models[0].modalities = ['imageGeneration'];
    noEditing.providers.splice(1, 1);
    const plan = Planner.planMediaBatch(batch([mediaRequest]), noEditing, {}, Contracts);
    expect(plan.status).toBe('blocked');
    expect(plan.items[0].selections).toEqual({});
    expect(plan.items[0].suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'generation-fallback-available', requiresApproval: true }),
      expect.objectContaining({ code: 'text-only-fallback-available', requiresApproval: true }),
    ]));
    expect(plan.executionAuthorized).toBe(false);
  });

  it('rejects secrets at the batch boundary before provider planning', () => {
    const value = batch();
    value.apiKey = 'must-never-enter-agent-contracts';
    const plan = Planner.planMediaBatch(value, inventory(), {}, Contracts);
    expect(plan.status).toBe('invalid');
    expect(plan.errors.some((item) => item.code === 'secret-like-field')).toBe(true);
  });

  it('builds deterministic glossary image requests without executing them', () => {
    const value = Planner.createGlossaryMediaBatch({
      planId: 'science-glossary',
      entries: [
        { id: 'evaporation', term: 'Evaporation', definition: 'Liquid water changes into water vapor.' },
        {
          id: 'condensation',
          term: 'Condensation',
          definition: 'Water vapor cools into liquid droplets.',
          sourceAsset: { handle: 'asset_source_12345678', mimeType: 'image/png' },
        },
      ],
      providerPolicy: {
        mode: 'deployment-default', allowMeteredUsage: false, maxCostUsd: 0, maxOperations: 2,
      },
      batchPolicy: { maxCostUsd: 0, maxOperations: 4 },
    });
    expect(value.requests).toHaveLength(2);
    expect(value.requests[0]).toMatchObject({ requestId: 'science-glossary:evaporation', operation: 'generate' });
    expect(value.requests[0].prompt).toContain('Evaporation');
    expect(value.requests[1]).toMatchObject({ requestId: 'science-glossary:condensation', operation: 'edit' });
    expect(Planner.validateBatch(value, Contracts).ok).toBe(true);
  });
});
