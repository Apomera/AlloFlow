import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let S;

beforeAll(() => {
  loadAlloModule('agent_core_media_contracts_module.js');
  loadAlloModule('agent_core_managed_asset_store_module.js');
  loadAlloModule('agent_core_media_security_module.js');
  S = window.AlloModules.AgentCoreMediaSecurity;
});

describe('strict media security facade', () => {
  it('rejects authorization and bearer material in provider inventories', () => {
    const inventory = {
      schemaVersion: '1.0',
      providers: [{
        id: 'gemini', displayName: 'Gemini', transport: 'api', billing: 'metered',
        models: [{ id: 'image-model', modalities: ['imageGeneration'] }],
        authorization: 'Bearer hidden',
      }],
    };
    const report = S.validateProviderInventory(inventory);
    expect(report.ok).toBe(false);
    expect(report.errors.some((item) => item.code === 'secret-like-field')).toBe(true);
  });

  it('rejects prompts, reasoning, and malformed provider labels in results', () => {
    const report = S.validateMediaResult({
      schemaVersion: '1.0', requestId: 'media-result-001', status: 'failed',
      prompt: 'do not persist', reasoning: 'do not persist',
      provider: { id: '../provider', model: 'bad model id' },
      error: { code: 'provider-failed', message: 'No image returned.' },
    });
    expect(report.ok).toBe(false);
    expect(report.errors.map((item) => item.code)).toEqual(expect.arrayContaining([
      'forbidden-result-field', 'bad-result-provider', 'bad-result-model',
    ]));
  });

  it('requires runtime authorization for every adapter byte read', () => {
    let next = 0;
    const store = S.createManagedAssetStore({
      createId: () => `asset_secure_${String(++next).padStart(8, '0')}`,
      authorizeByteRead: ({ purpose }) => purpose === 'approved-image-edit',
    });
    const asset = store.importAsset({ bytes: new Uint8Array([1, 2]), mimeType: 'image/png' });
    expect(() => store.readBytesForAdapter(asset.handle, { purpose: 'unapproved' })).toThrow(/not authorized/i);
    expect([...store.readBytesForAdapter(asset.handle, { purpose: 'approved-image-edit' })]).toEqual([1, 2]);
  });

  it('does not expose an approval boolean that callers can self-assert', () => {
    const store = S.createManagedAssetStore({
      createId: () => 'asset_secure_00000001',
      authorizeByteRead: () => false,
    });
    const asset = store.importAsset({ bytes: new Uint8Array([3]), mimeType: 'image/png' });
    expect(() => store.readBytesForAdapter(asset.handle, { approved: true, purpose: 'anything' })).toThrow(/not authorized/i);
  });
});
