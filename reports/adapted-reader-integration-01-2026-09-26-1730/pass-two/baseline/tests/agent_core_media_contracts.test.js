import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let M;

beforeAll(() => {
  loadAlloModule('agent_core_media_contracts_module.js');
  M = window.AlloModules.AgentCoreMediaContracts;
  if (!M) throw new Error('AgentCoreMediaContracts failed to register');
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
        { id: 'canvas-text', modalities: ['text', 'vision'] },
      ],
    },
    {
      id: 'openai-api',
      displayName: 'OpenAI API',
      transport: 'api',
      billing: 'metered',
      models: [{ id: 'gpt-image-2', modalities: ['imageGeneration', 'imageEditing'] }],
    },
  ],
});

const generateRequest = () => ({
  schemaVersion: '1.0',
  requestId: 'media-glossary-001',
  operation: 'generate',
  prompt: 'Create a clear instructional illustration of evaporation.',
  purpose: 'glossary-illustration',
  accessibility: { altTextRequired: true },
  providerPolicy: {
    mode: 'deployment-default',
    allowMeteredUsage: false,
    maxCostUsd: 0,
    maxOperations: 1,
  },
});

describe('Agent Core media foundation safety boundary', () => {
  it('is inert and disabled by default', () => {
    expect(M.MEDIA_EXECUTION_DEFAULT_ENABLED).toBe(false);
    expect(typeof M.validateMediaRequest).toBe('function');
    expect(typeof M.preflightMediaRequest).toBe('function');
  });

  it('advertises safe capability labels without credentials or endpoints', () => {
    const report = M.validateProviderInventory(inventory());
    expect(report.ok).toBe(true);
    expect(report.value.providers[0]).toEqual({
      id: 'gemini-canvas',
      displayName: 'Gemini Canvas',
      transport: 'host-subscription',
      billing: 'included',
      models: [
        { id: 'canvas-image', modalities: ['imageGeneration', 'imageEditing'], enabled: true },
        { id: 'canvas-text', modalities: ['text', 'vision'], enabled: true },
      ],
    });

    const leaky = inventory();
    leaky.providers[0].apiKey = 'not-for-the-agent';
    const rejected = M.validateProviderInventory(leaky);
    expect(rejected.ok).toBe(false);
    expect(rejected.errors.some((item) => item.code === 'secret-like-field')).toBe(true);
  });

  it('normalizes a generate request without changing any runtime provider', () => {
    const report = M.validateMediaRequest(generateRequest());
    expect(report.ok).toBe(true);
    expect(report.value.output).toEqual({
      width: 1024,
      height: 1024,
      mimeType: 'image/png',
      quality: 'standard',
    });
    expect(report.value.sourceAsset).toBe(null);
    expect(report.value.providerPolicy.allowMeteredUsage).toBe(false);
  });

  it('requires opaque managed handles for image editing', () => {
    const missing = generateRequest();
    missing.operation = 'edit';
    expect(M.validateMediaRequest(missing).errors.some((item) => item.code === 'source-required')).toBe(true);

    const valid = generateRequest();
    valid.operation = 'edit';
    valid.sourceAsset = { handle: 'asset_source_12345678', mimeType: 'image/png' };
    expect(M.validateMediaRequest(valid).ok).toBe(true);

    const path = generateRequest();
    path.operation = 'edit';
    path.sourceAsset = { handle: 'C:\\Users\\teacher\\image.png', mimeType: 'image/png' };
    const pathReport = M.validateMediaRequest(path);
    expect(pathReport.ok).toBe(false);
    expect(pathReport.errors.some((item) => item.code === 'unsafe-path-value')).toBe(true);
  });

  it('does not allow image bytes to travel through the agent contract', () => {
    const request = generateRequest();
    request.operation = 'edit';
    request.sourceAsset = { handle: 'asset_source_12345678', data: 'data:image/png;base64,AAAA' };
    const report = M.validateMediaRequest(request);
    expect(report.ok).toBe(false);
    expect(report.errors.some((item) => item.code === 'embedded-asset-data')).toBe(true);
  });

  it('prefers included deployment capability and excludes metered providers by default', () => {
    const report = M.preflightMediaRequest(generateRequest(), inventory());
    expect(report.ok).toBe(true);
    expect(report.ready).toBe(true);
    expect(report.selection).toEqual({
      provider: 'gemini-canvas',
      model: 'canvas-image',
      transport: 'host-subscription',
      billing: 'included',
    });
  });

  it('uses a metered provider only when it is explicitly approved and allow-listed', () => {
    const request = generateRequest();
    request.providerPolicy = {
      mode: 'allow-listed',
      allowedProviders: ['openai-api'],
      allowedModels: ['gpt-image-2'],
      preferredProvider: 'openai-api',
      preferredModel: 'gpt-image-2',
      allowMeteredUsage: true,
      maxCostUsd: 2,
      maxOperations: 10,
    };
    const report = M.preflightMediaRequest(request, inventory());
    expect(report.ready).toBe(true);
    expect(report.selection.provider).toBe('openai-api');
    expect(report.selection.model).toBe('gpt-image-2');
  });

  it('fails preflight visibly when no approved model has the required capability', () => {
    const request = generateRequest();
    request.operation = 'edit';
    request.sourceAsset = { handle: 'asset_source_12345678' };
    request.providerPolicy = {
      mode: 'allow-listed',
      allowedProviders: ['openai-api'],
      allowedModels: ['text-only'],
      allowMeteredUsage: true,
      maxCostUsd: 2,
      maxOperations: 2,
    };
    const report = M.preflightMediaRequest(request, inventory());
    expect(report.ok).toBe(true);
    expect(report.ready).toBe(false);
    expect(report.errors[0].code).toBe('missing-approved-capability');
  });

  it('never accepts a completed accessible result without an asset and alt text', () => {
    const noAsset = M.validateMediaResult({
      schemaVersion: '1.0', requestId: 'media-glossary-001', status: 'completed',
    }, { request: generateRequest() });
    expect(noAsset.errors.some((item) => item.code === 'completed-without-asset')).toBe(true);

    const noAlt = M.validateMediaResult({
      schemaVersion: '1.0', requestId: 'media-glossary-001', status: 'completed',
      asset: { handle: 'asset_result_12345678', mimeType: 'image/png' },
      usage: { operations: 1, actualCostUsd: 0 },
    }, { request: generateRequest() });
    expect(noAlt.errors.some((item) => item.code === 'missing-alt-text')).toBe(true);
  });

  it('fails validation when actual operations or cost exceed teacher approval', () => {
    const request = generateRequest();
    request.providerPolicy.allowMeteredUsage = true;
    request.providerPolicy.maxCostUsd = 0.5;
    request.providerPolicy.maxOperations = 2;
    const report = M.validateMediaResult({
      schemaVersion: '1.0', requestId: 'media-glossary-001', status: 'completed',
      asset: {
        handle: 'asset_result_12345678', mimeType: 'image/png', altText: 'Water vapor rising from a lake.',
      },
      provider: { id: 'openai-api', model: 'gpt-image-2' },
      usage: { operations: 3, actualCostUsd: 0.75 },
    }, { request });
    expect(report.ok).toBe(false);
    expect(report.errors.map((item) => item.code)).toEqual(
      expect.arrayContaining(['operation-limit-exceeded', 'cost-limit-exceeded'])
    );
  });
});
