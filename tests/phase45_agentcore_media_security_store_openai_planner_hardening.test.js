import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const manifestTool = require('../dev-tools/build_browser_delivery_manifest.cjs');

const PHASE45_DELIVERABLES = [
  'agent_core_media_security_module.js',
  'agent_core_managed_asset_store_module.js',
  'agent_core_openai_media_adapter_module.js',
  'agent_core_openai_media_production_guard_module.js',
  'agent_core_media_planner_module.js',
];

const MIRROR_DIRS = [
  '.',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

let Contracts;
let Store;
let Security;
let Adapter;
let Runtime;
let Guard;
let Planner;

beforeAll(() => {
  loadAlloModule('agent_core_media_contracts_module.js');
  loadAlloModule('agent_core_managed_asset_store_module.js');
  loadAlloModule('agent_core_media_security_module.js');
  loadAlloModule('agent_core_openai_media_adapter_module.js');
  loadAlloModule('agent_core_openai_media_runtime_module.js');
  loadAlloModule('agent_core_openai_media_production_guard_module.js');
  loadAlloModule('agent_core_media_planner_module.js');
  Contracts = window.AlloModules.AgentCoreMediaContracts;
  Store = window.AlloModules.AgentCoreManagedAssetStore;
  Security = window.AlloModules.AgentCoreMediaSecurity;
  Adapter = window.AlloModules.AgentCoreOpenAIMediaAdapter;
  Runtime = window.AlloModules.AgentCoreOpenAIMediaRuntime;
  Guard = window.AlloModules.AgentCoreOpenAIMediaProductionGuard;
  Planner = window.AlloModules.AgentCoreMediaPlanner;
});

afterEach(() => {
  delete window.__alloOfflineOnly;
  delete window.__alloQrStudentMode;
  delete window._alloQrBlocked;
  vi.restoreAllMocks();
});

function sampleRequest(overrides = {}) {
  return {
    schemaVersion: '1.0',
    requestId: 'phase45-req-001',
    operation: 'generate',
    prompt: 'Create a clear diagram of photosynthesis.',
    purpose: 'glossary-illustration',
    output: { width: 1024, height: 1024, mimeType: 'image/png', quality: 'standard' },
    accessibility: { altTextRequired: false },
    providerPolicy: {
      mode: 'allow-listed',
      allowedProviders: ['openai-api'],
      allowedModels: ['gpt-image-2'],
      preferredProvider: 'openai-api',
      preferredModel: 'gpt-image-2',
      allowMeteredUsage: true,
      maxCostUsd: 1.0,
      maxOperations: 3,
    },
    ...overrides,
  };
}

describe('Phase 45: mirror parity & 3-host SRI integrity', () => {
  it('keeps all 5 Phase 45 deliverables byte-identical across 4 mirrors and canonically synced in 3 hosts', () => {
    const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
    const sha384 = (buf) => 'sha384-' + createHash('sha384').update(buf).digest('base64');

    const rootMeta = {};
    for (const file of PHASE45_DELIVERABLES) {
      const rootBuf = readFileSync(file);
      const rootHash = sha256(rootBuf);
      rootMeta[file] = { bytes: rootBuf.length, integrity: sha384(rootBuf) };
      for (const dir of MIRROR_DIRS) {
        const targetBuf = readFileSync(dir === '.' ? file : `${dir}/${file}`);
        expect(sha256(targetBuf), `${dir}/${file}`).toBe(rootHash);
      }
    }

    const releaseIds = new Set();
    for (const host of HOSTS) {
      const embedded = manifestTool.readEmbeddedManifest(readFileSync(host, 'utf8'));
      expect(embedded?.assets, host).toBeTruthy();
      releaseIds.add(embedded.releaseId);
      for (const file of PHASE45_DELIVERABLES) {
        expect(embedded.assets[file], `${host} missing ${file}`).toBeTruthy();
        expect(embedded.assets[file].bytes, `${host} bytes ${file}`).toBe(rootMeta[file].bytes);
        expect(embedded.assets[file].integrity, `${host} sri ${file}`).toBe(rootMeta[file].integrity);
      }
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 45: agent_core_media_security_module.js hardening', () => {
  it('detects cyclic payloads and prototype keys, fails closed on throwing authorizer, and freezes exports', () => {
    expect(Object.isFrozen(Security)).toBe(true);

    const cyclic = { schemaVersion: '1.0', providers: [] };
    cyclic.self = cyclic;
    const cyclicReport = Security.validateProviderInventory(cyclic);
    expect(cyclicReport.ok).toBe(false);
    expect(cyclicReport.errors.some((e) => e.code === 'cyclic-payload')).toBe(true);

    const withProto = JSON.parse('{"schemaVersion":"1.0","providers":[],"__proto__":{"x":1}}');
    const protoReport = Security.validateProviderInventory(withProto);
    expect(protoReport.ok).toBe(false);
    expect(protoReport.errors.some((e) => e.code === 'unsafe-key')).toBe(true);

    const facadeStore = Security.createManagedAssetStore({
      createId: () => 'asset_sec_00000001',
      authorizeByteRead: () => { throw new Error('auth-crash'); },
    });
    expect(Object.isFrozen(facadeStore)).toBe(true);
    const asset = facadeStore.importAsset({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'image/png' });
    expect(() => facadeStore.readBytesForAdapter(asset.handle, { purpose: 'edit\u0000' })).toThrow(/not authorized/i);
  });
});

describe('Phase 45: agent_core_managed_asset_store_module.js hardening', () => {
  it('blocks BOM-prefixed SVG/iframe markup and prototype keys, strips control chars, and freezes exports', () => {
    expect(Object.isFrozen(Store)).toBe(true);
    expect(Object.isFrozen(Store.MIME_TYPES)).toBe(true);

    let seq = 0;
    const store = Store.createManagedAssetStore({
      createId: () => `asset_store_${String(++seq).padStart(8, '0')}`,
    });
    expect(Object.isFrozen(store)).toBe(true);

    // UTF-8 BOM + <svg> must be rejected as active markup
    const bomSvg = new Uint8Array([0xEF, 0xBB, 0xBF, ...Buffer.from('<svg onload=alert(1)></svg>')]);
    expect(() => store.importAsset({ bytes: bomSvg, mimeType: 'image/png' })).toThrow(/declared raster MIME/i);

    const iframeBytes = new Uint8Array(Buffer.from('<iframe src="javascript:alert(1)"></iframe>'));
    expect(() => store.importAsset({ bytes: iframeBytes, mimeType: 'image/png' })).toThrow(/declared raster MIME/i);

    // Prototype key rejected on import
    const poisoned = Object.defineProperty({ bytes: new Uint8Array([1, 2, 3, 4]), mimeType: 'image/png' }, 'constructor', { value: 'bad', enumerable: true });
    expect(() => store.importAsset(poisoned)).toThrow(/not accepted/i);

    // Control characters stripped from metadata
    const meta = store.importAsset({
      bytes: new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
      mimeType: 'image/png',
      altText: 'Diagram\u0000 of plant\u0007',
      sourceDeclaration: 'Teacher\u0000 upload',
    });
    expect(meta.altText).toBe('Diagram of plant');
    expect(meta.sourceDeclaration).toBe('Teacher upload');
  });
});

describe('Phase 45: agent_core_openai_media_adapter_module.js hardening', () => {
  it('fails closed in offline/QR modes, rejects malformed base64 in Node, and freezes adapter & exports', async () => {
    expect(Object.isFrozen(Adapter)).toBe(true);

    const store = Store.createManagedAssetStore({ createId: () => 'asset_adp_00000001' });
    const fetchBadB64 = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: 'not!valid!base64***' }], usage: { input_tokens: -5 } }),
    }));
    const adapter = Adapter.createOpenAIMediaAdapter({
      contracts: Contracts,
      assetStore: store,
      fetchAuthorized: fetchBadB64,
      authorizeExecution: () => true,
      estimateCost: () => ({ upperBoundUsd: 0.1 }),
      calculateActualCost: () => 0.1,
    });
    expect(Object.isFrozen(adapter)).toBe(true);

    // Offline-only gate blocks before fetch
    window.__alloOfflineOnly = true;
    await expect(adapter.execute(sampleRequest())).rejects.toMatchObject({ code: 'execution-not-authorized' });
    expect(fetchBadB64).not.toHaveBeenCalled();
    delete window.__alloOfflineOnly;

    // QR student mode gate blocks before fetch
    window.__alloQrStudentMode = true;
    await expect(adapter.execute(sampleRequest())).rejects.toMatchObject({ code: 'execution-not-authorized' });
    expect(fetchBadB64).not.toHaveBeenCalled();
    delete window.__alloQrStudentMode;

    // Malformed base64 fails cleanly even when Node Buffer.from is used
    await expect(adapter.execute(sampleRequest())).rejects.toMatchObject({ code: 'openai-invalid-image' });
  });
});

describe('Phase 45: agent_core_openai_media_production_guard_module.js hardening', () => {
  it('blocks offline-only mode, guards hostile date/cyclic objects and throwing authorizers, and freezes exports', async () => {
    expect(Object.isFrozen(Guard)).toBe(true);

    const store = Security.createManagedAssetStore({
      createId: () => 'asset_grd_00000001',
      authorizeByteRead: () => true,
    });
    const fetchMock = vi.fn();
    const guard = Guard.createProductionOpenAIMediaAdapter({
      executionEnabled: true,
      contracts: Contracts,
      assetStore: store,
      fetchAuthorized: fetchMock,
      authorizeExecution: () => true,
      authorizeProductionExecution: () => { throw new Error('auth-boom'); },
      pricingPolicy: {
        schemaVersion: '1.0',
        provider: 'openai-api',
        model: 'gpt-image-2',
        effectiveAt: '2026-07-01T00:00:00Z',
        expiresAt: '2026-08-01T00:00:00Z',
        sourceUrl: 'https://developers.openai.com/api/docs/models/gpt-image-2',
        estimateImageCost: () => 0.1,
        calculateImageCost: () => 0.1,
      },
      now: () => new Date('2026-07-15T00:00:00Z'),
      retryDelaysMs: [999999999],
    }, Runtime);
    expect(Object.isFrozen(guard)).toBe(true);

    // Offline-only blocks at prepare()
    window.__alloOfflineOnly = true;
    expect(guard.prepare(sampleRequest())).toMatchObject({ ready: false, code: 'student-or-locked-ai-disabled' });
    delete window.__alloOfflineOnly;

    // Throwing authorizer fails closed
    await expect(guard.execute(sampleRequest())).rejects.toMatchObject({ code: 'production-execution-not-authorized' });
    expect(fetchMock).not.toHaveBeenCalled();

    // Cyclic request fails closed before transport
    const cycReq = sampleRequest();
    cycReq.loop = cycReq;
    await expect(guard.execute(cycReq)).rejects.toMatchObject({ code: 'invalid-media-request' });

    // Hostile non-string date in pricing policy does not invoke toString()
    expect(Guard.validateDatedPolicy({
      schemaVersion: '1.0',
      provider: 'openai-api',
      model: 'gpt-image-2',
      sourceUrl: 'https://developers.openai.com/x',
      effectiveAt: { toString() { throw new Error('hostile-date'); } },
      expiresAt: '2026-08-01T00:00:00Z',
      estimateImageCost: () => 0,
      calculateImageCost: () => 0,
    }, 'openai-api', 'gpt-image-2', Date.parse('2026-07-15T00:00:00Z'))).toBe('pricing-policy-dates-invalid');
  });
});

describe('Phase 45: agent_core_media_planner_module.js hardening', () => {
  it('bounds oversized request arrays, isolates throwing estimators, strips bidi/control chars, and freezes API', () => {
    expect(Object.isFrozen(Planner)).toBe(true);

    // Glossary batch caps at MAX_ITEMS and strips bidi/control chars + prototype planId
    const entries = Array.from({ length: 520 }, (_, i) => ({
      term: `Cell\u202E\u0000 ${i}`,
      definition: `Living unit\u0007 ${i}`,
    }));
    const batch = Planner.createGlossaryMediaBatch({ planId: '__proto__', entries });
    expect(batch.planId).toBe('glossary-media-plan');
    expect(batch.requests).toHaveLength(Planner.MAX_ITEMS);
    expect(batch.requests[0].prompt).not.toContain('\u202E');
    expect(batch.requests[0].prompt).not.toContain('\u0000');

    // Throwing estimator becomes input_required instead of crashing planMediaBatch
    const inventory = {
      schemaVersion: '1.0',
      providers: [{
        id: 'openai-api',
        displayName: 'OpenAI',
        transport: 'api',
        billing: 'metered',
        models: [{ id: 'gpt-image-2', modalities: ['imageGeneration'] }],
      }],
    };
    const plan = Planner.planMediaBatch(
      { schemaVersion: '1.0', planId: 'p45-plan', batchPolicy: { maxCostUsd: 5, maxOperations: 5 }, requests: [sampleRequest()] },
      inventory,
      { estimateOperation: () => { throw new Error('estimator-boom'); } },
      Contracts
    );
    expect(plan.status).toBe('input_required');
    expect(plan.items[0].issues[0].code).toBe('pricing-estimate-invalid');
  });
});
