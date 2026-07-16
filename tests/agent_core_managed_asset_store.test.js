import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let A;

beforeAll(() => {
  loadAlloModule('agent_core_managed_asset_store_module.js');
  A = window.AlloModules.AgentCoreManagedAssetStore;
  if (!A) throw new Error('AgentCoreManagedAssetStore failed to register');
});

function createStore(overrides = {}) {
  let id = 0;
  return A.createManagedAssetStore({
    createId: () => `asset_fixture_${String(++id).padStart(8, '0')}`,
    now: () => '2026-07-15T12:00:00.000Z',
    ...overrides,
  });
}

describe('managed asset store safety boundary', () => {
  it('returns opaque metadata without exposing image bytes', () => {
    const store = createStore();
    const metadata = store.importAsset({
      bytes: new Uint8Array([1, 2, 3, 4]),
      mimeType: 'image/png',
      width: 2,
      height: 2,
      altText: 'A four-pixel fixture.',
      sourceDeclaration: 'Generated fixture',
    });
    expect(metadata.handle).toBe('asset_fixture_00000001');
    expect(metadata.byteLength).toBe(4);
    expect(metadata.bytes).toBeUndefined();
    expect(metadata.path).toBeUndefined();
    expect(metadata.url).toBeUndefined();
    expect(store.getMetadata(metadata.handle)).toEqual(metadata);
  });

  it('requires explicit internal approval before returning a byte copy', () => {
    const store = createStore();
    const source = new Uint8Array([5, 6, 7]);
    const asset = store.importAsset({ bytes: source, mimeType: 'image/png' });
    source[0] = 99;
    expect(() => store.readBytesForAdapter(asset.handle)).toThrow(/approval/i);
    const first = store.readBytesForAdapter(asset.handle, { approved: true, purpose: 'image-edit-provider-input' });
    expect([...first]).toEqual([5, 6, 7]);
    first[0] = 88;
    const second = store.readBytesForAdapter(asset.handle, { approved: true, purpose: 'image-edit-provider-input' });
    expect([...second]).toEqual([5, 6, 7]);
  });

  it('rejects paths, URLs, embedded data, credentials, and unsupported MIME types', () => {
    const store = createStore();
    const base = { bytes: new Uint8Array([1]), mimeType: 'image/png' };
    expect(() => store.importAsset({ ...base, path: 'C:\\Users\\teacher\\image.png' })).toThrow(/Paths/);
    expect(() => store.importAsset({ ...base, url: 'https://example.test/image.png' })).toThrow(/URLs/);
    expect(() => store.importAsset({ ...base, data: 'base64' })).toThrow(/embedded data/);
    expect(() => store.importAsset({ ...base, apiKey: 'hidden' })).toThrow(/credentials/);
    expect(() => store.importAsset({ ...base, authorization: 'Bearer hidden' })).toThrow(/credentials/);
    expect(() => store.importAsset({ bytes: new Uint8Array([1]), mimeType: 'image/svg+xml' })).toThrow(/MIME/);
  });

  it('enforces per-asset, total-byte, and asset-count limits', () => {
    const store = createStore({ maxAssets: 2, maxAssetBytes: 4, maxTotalBytes: 6 });
    expect(() => store.importAsset({ bytes: new Uint8Array(5), mimeType: 'image/png' })).toThrow(/per-asset/);
    store.importAsset({ bytes: new Uint8Array(3), mimeType: 'image/png' });
    store.importAsset({ bytes: new Uint8Array(3), mimeType: 'image/png' });
    expect(() => store.importAsset({ bytes: new Uint8Array(1), mimeType: 'image/png' })).toThrow(/count limit/);
    expect(store.getStats()).toMatchObject({ assetCount: 2, totalBytes: 6 });
  });

  it('attaches by artifact id and semantic slot without mutating artifacts', () => {
    const store = createStore();
    const asset = store.importAsset({ bytes: new Uint8Array([1]), mimeType: 'image/webp' });
    const attached = store.attach(asset.handle, { artifactId: 'glossary-001', slot: 'term.evaporation.image' });
    expect(attached.attachments).toEqual([{ artifactId: 'glossary-001', slot: 'term.evaporation.image' }]);
    expect(() => store.remove(asset.handle)).toThrow(/Attached assets/);
  });

  it('zeroes and removes unattached bytes', () => {
    const store = createStore();
    const asset = store.importAsset({ bytes: new Uint8Array([9, 9]), mimeType: 'image/jpeg' });
    expect(store.remove(asset.handle)).toBe(true);
    expect(store.getStats()).toMatchObject({ assetCount: 0, totalBytes: 0 });
    expect(() => store.getMetadata(asset.handle)).toThrow(/not found/);
  });
});
