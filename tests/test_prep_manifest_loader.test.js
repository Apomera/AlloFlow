import fs from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/pack_manifest.json'), 'utf8'));
const apPackText = fs.readFileSync(resolve(root, 'test_prep/ap_psychology_pilot.json'), 'utf8');
const apPack = JSON.parse(apPackText);
const apLibraryText = fs.readFileSync(resolve(root, 'test_prep/ap_psychology_pilot_learning_library.json'), 'utf8');
const apLibrary = JSON.parse(apLibraryText);
const apEntry = manifest.entries.find((entry) => entry.id === 'ap-psychology-pilot');
let Hub;

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function response(payload, status = 200, rawText = JSON.stringify(payload)) {
  const bytes = new TextEncoder().encode(rawText);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => structuredClone(payload),
    arrayBuffer: async () => bytes.slice().buffer,
  };
}

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
});

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Test Prep manifest lazy loader', () => {
  it('validates and lists the generated manifest without pre-bundling AP content', () => {
    expect(Hub.manifestSchemaVersion).toBe(1);
    expect(Hub.portfolioCategories).toEqual([
      'professional-school-personnel',
      'workforce-vocational',
      'k12-college-readiness',
    ]);

    const result = Hub.validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(Hub.listManifestEntries(manifest).some((entry) => entry.id === apEntry.id)).toBe(false);
    expect(Hub.listManifestEntries(manifest, { includeInternal: true }).some((entry) => entry.id === apEntry.id)).toBe(true);
    expect(Hub.listPacks().some((pack) => pack.id === apEntry.id)).toBe(false);
  });

  it('loads and validates the AP preview from the trusted CDN candidate without registering it', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url === 'https://alloflow-cdn.pages.dev/test_prep/ap_psychology_pilot.json') {
        return response(apPack, 200, apPackText);
      }
      return response({}, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    const loaded = await Hub.loadManifestPack(apEntry, { allowInternal: true, register: false });

    expect(loaded).toMatchObject({
      id: 'ap-psychology-pilot',
      version: apEntry.version,
      status: 'preview',
    });
    expect(loaded).toMatchObject({
      itemSchemaVersion: apPack.itemSchemaVersion,
      visibility: apPack.visibility,
      released: apPack.released,
      calibrated: apPack.calibrated,
      portfolioCategories: apPack.portfolioCategories,
      learningLibraryUrl: apPack.learningLibraryUrl,
      capabilities: apPack.capabilities,
      releaseGates: apPack.releaseGates,
      expertReviewGate: apPack.expertReviewGate,
    });
    const sourceItem = apPack.items[0];
    expect(loaded.items[0]).toMatchObject({
      practiceId: sourceItem.practiceId,
      topicIds: sourceItem.topicIds,
      provenance: sourceItem.provenance,
      releaseEligible: sourceItem.releaseEligible,
      rights: sourceItem.rights,
      accessibility: sourceItem.accessibility,
      expertReview: sourceItem.expertReview,
    });
    expect(loaded.items).toHaveLength(apEntry.itemCount);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://alloflow-cdn.pages.dev/test_prep/ap_psychology_pilot.json',
      expect.objectContaining({ cache: 'no-store', signal: expect.anything() }),
    );
    expect(Hub.listPacks().some((pack) => pack.id === apEntry.id)).toBe(false);
  });

  it('falls back from the CDN to the canonical raw-repository asset', async () => {
    const requestedUrls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      requestedUrls.push(url);
      if (url === 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/test_prep/ap_psychology_pilot.json') {
        return response(apPack, 200, apPackText);
      }
      return response({}, 503);
    }));

    const loaded = await Hub.loadManifestPack(apEntry, { allowInternal: true, register: false });

    expect(loaded.id).toBe(apPack.id);
    expect(requestedUrls).toEqual([
      'https://alloflow-cdn.pages.dev/test_prep/ap_psychology_pilot.json',
      'https://raw.githubusercontent.com/Apomera/AlloFlow/main/test_prep/ap_psychology_pilot.json',
    ]);
  });

  it('fails closed on internal visibility and untrusted pack URLs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(Hub.loadManifestPack({ ...apEntry, visibility: 'internal' }, { register: false }))
      .rejects.toThrow(/Internal test prep packs/);
    await expect(Hub.loadManifestPack({ ...apEntry, packUrl: 'https://example.com/ap.json' }, { allowInternal: true, register: false }))
      .rejects.toThrow(/no trusted pack URL/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed when exact response bytes do not match the manifest digest', async () => {
    const mutatedText = JSON.stringify({ ...apPack, title: 'Mutated after QA binding' });
    vi.stubGlobal('fetch', vi.fn(async () => response(JSON.parse(mutatedText), 200, mutatedText)));

    await expect(Hub.loadManifestPack(apEntry, { allowInternal: true, register: false }))
      .rejects.toMatchObject({ name: 'TestPrepIntegrityError' });
    expect(Hub.listPacks({ includeInternal: true }).some((pack) => pack.id === apEntry.id)).toBe(false);
  });

  it('verifies exact learning-library bytes and fails explicitly without WebCrypto', async () => {
    const fetchMock = vi.fn(async () => response(apLibrary, 200, apLibraryText));
    vi.stubGlobal('fetch', fetchMock);

    await expect(Hub.fetchRepoJson(
      apEntry.learningLibraryUrl,
      (catalog) => catalog && catalog.packId === apPack.id && catalog.version === apPack.version,
      { expectedSha256: apEntry.learningLibrarySha256 },
    )).resolves.toMatchObject({ packId: apPack.id, version: apPack.version });

    vi.stubGlobal('crypto', {});
    await expect(Hub.fetchRepoJson(
      apEntry.learningLibraryUrl,
      () => true,
      { expectedSha256: apEntry.learningLibrarySha256 },
    )).rejects.toMatchObject({ name: 'TestPrepIntegrityUnavailableError' });
  });

  it('rejects pack payloads whose version or item count differs after their bytes verify', async () => {
    const wrongVersion = { ...apPack, version: 'unexpected-version' };
    const wrongVersionText = JSON.stringify(wrongVersion);
    vi.stubGlobal('fetch', vi.fn(async () => response(wrongVersion, 200, wrongVersionText)));
    await expect(Hub.loadManifestPack(
      { ...apEntry, sha256: sha256(wrongVersionText) },
      { allowInternal: true, register: false },
    )).rejects.toThrow(/version does not match/i);

    const wrongCount = { ...apPack, items: apPack.items.slice(1) };
    const wrongCountText = JSON.stringify(wrongCount);
    vi.stubGlobal('fetch', vi.fn(async () => response(wrongCount, 200, wrongCountText)));
    await expect(Hub.loadManifestPack(
      { ...apEntry, sha256: sha256(wrongCountText) },
      { allowInternal: true, register: false },
    )).rejects.toThrow(/item count does not match/i);
  });

  it('times out a hung response body and advances through bounded candidates', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => apPack,
      arrayBuffer: async () => new Promise(() => {}),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(Hub.loadManifestPack(apEntry, {
      allowInternal: true,
      register: false,
      timeoutMs: 5,
    })).rejects.toMatchObject({ name: 'TestPrepTimeoutError' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('shares verified bytes without sharing caller registration semantics', async () => {
    let release;
    const pending = new Promise((resolveValue) => { release = resolveValue; });
    const fetchMock = vi.fn(async () => pending);
    vi.stubGlobal('fetch', fetchMock);

    const readOnly = Hub.loadManifestPack(apEntry, { allowInternal: true, register: false });
    const registering = Hub.loadManifestPack(apEntry, { allowInternal: true });
    release(response(apPack, 200, apPackText));

    const [readOnlyPack, registeredPack] = await Promise.all([readOnly, registering]);
    expect(readOnlyPack.id).toBe(apPack.id);
    expect(registeredPack.id).toBe(apPack.id);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Hub.listPacks({ includeInternal: true }).some((pack) => pack.id === apPack.id)).toBe(true);
  });
});
