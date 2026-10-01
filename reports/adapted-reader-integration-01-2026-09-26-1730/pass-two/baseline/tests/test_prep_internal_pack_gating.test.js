import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { resolve } from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/pack_manifest.json'), 'utf8'));
const apPackText = fs.readFileSync(resolve(root, 'test_prep/ap_psychology_pilot.json'), 'utf8');
const apPack = JSON.parse(apPackText);
const apEntry = manifest.entries.find((entry) => entry.id === apPack.id);
let Hub;

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

describe('Test Prep internal-pack fail-closed boundary', () => {
  it('keeps an internal pack out of the ordinary registry list after explicit QA registration', () => {
    Hub.registerPack(apPack);

    expect(Hub.listPacks().some((pack) => pack.id === apPack.id)).toBe(false);
    expect(Hub.listPacks({ includeInternal: true }).some((pack) => pack.id === apPack.id)).toBe(true);
  });

  it('revalidates an unprovenanced registered pack before trusting the descriptor', async () => {
    Hub.registerPack(apPack);
    const bytes = new TextEncoder().encode(apPackText);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => structuredClone(apPack),
      arrayBuffer: async () => bytes.slice().buffer,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(Hub.loadManifestPack(apEntry, { allowInternal: true }))
      .resolves.toMatchObject({ id: apPack.id, visibility: 'internal' });
    await expect(Hub.loadManifestPack({ ...apEntry, version: 'forged-version' }, { allowInternal: true, register: false }))
      .rejects.toThrow(/version does not match/i);
    await expect(Hub.loadManifestPack({ ...apEntry, visibility: 'preview' }, { register: false }))
      .rejects.toThrow(/visibility does not match/i);
    await expect(Hub.loadManifestPack({ ...apEntry, itemCount: apEntry.itemCount + 1 }, { allowInternal: true, register: false }))
      .rejects.toThrow(/item count does not match/i);
    await expect(Hub.loadManifestPack({ ...apEntry, itemSchemaVersion: apEntry.itemSchemaVersion + 1 }, { allowInternal: true, register: false }))
      .rejects.toThrow(/item schema does not match/i);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
