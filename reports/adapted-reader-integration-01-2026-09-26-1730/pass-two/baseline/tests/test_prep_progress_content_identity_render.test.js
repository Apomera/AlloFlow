import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule, registerCredentialPacks } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let Hub;
let Component;
let pack;
let root;
let host;
let originalFetch;
let manifestFixture;

// Serve the REAL bytes for lazy pack URLs, not just the manifest.
//
// Opening a manifest-backed pack always goes through testPrepLoadManifestPack,
// and that is correct even when the pack is already in the registry: the
// registry short-circuit requires manifest PROVENANCE (recorded only by
// testPrepRegisterManifestPack), because the cheap match assertion checks id,
// version, visibility, schema and item count but NOT the SHA-256 digest. A pack
// put into the registry by any other route has never been digest-verified
// against the manifest, so re-fetching it is the integrity-preserving choice —
// this fixture must therefore satisfy the fetch rather than 404 it.
//
// That means arrayBuffer(), not just json(): testPrepReadRepoJsonResponse
// digests the exact response bytes whenever the entry carries a sha256, and
// raises TestPrepIntegrityUnavailableError if it cannot get at them. Reading the
// file off disk keeps the digest honest, so this suite exercises the real
// verify-then-register path instead of a stub of it.
const packBytesCache = new Map();

function packBytesForUrl(url) {
  const match = /([a-z0-9_]+_pack)\.json(?:$|[?#])/i.exec(String(url));
  if (!match) return null;
  const name = match[1] + '.json';
  if (!packBytesCache.has(name)) {
    const packPath = resolve(process.cwd(), 'test_prep', name);
    packBytesCache.set(name, fs.existsSync(packPath) ? fs.readFileSync(packPath) : null);
  }
  return packBytesCache.get(name);
}

async function fixtureFetch(url) {
  if (String(url).includes('pack_manifest.json')) {
    return { ok: true, status: 200, json: async () => manifestFixture };
  }
  const bytes = packBytesForUrl(url);
  if (bytes) {
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      text: async () => bytes.toString('utf8'),
      json: async () => JSON.parse(bytes.toString('utf8')),
    };
  }
  return { ok: false, status: 404, json: async () => ({}) };
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  // Credential packs ship lazily; register them as fixtures so listPacks()
  // can resolve them (see registerCredentialPacks in setup.js).
  registerCredentialPacks(['audiology_5343']);
  Component = Hub.TestPrepHub;
  pack = Hub.listPacks().find((candidate) => candidate.id === 'praxis-audiology-5343');
  manifestFixture = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/pack_manifest.json'), 'utf8'));
  originalFetch = global.fetch;
  global.fetch = window.fetch = fixtureFetch;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  localStorage.clear();
  global.fetch = window.fetch = originalFetch;
});

async function mountAndOpenPack() {
  global.fetch = window.fetch = fixtureFetch;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Component, { isOpen: true, onClose: () => {} }));
  });
  const card = host.querySelector(`[data-test-prep-pack-id="${pack.id}"]`);
  expect(card).toBeTruthy();
  const openButton = Array.from(card.querySelectorAll('button')).find((button) => button.textContent.includes('Open practice pack'));
  expect(openButton).toBeTruthy();
  await act(async () => { openButton.click(); });
}

async function waitForText(text, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (!host.textContent.includes(text) && Date.now() < deadline) {
    await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 20)); });
  }
  expect(host.textContent).toContain(text);
}

function savedSession(identity) {
  return {
    packId: pack.id,
    mode: 'standard',
    label: 'Saved revision fixture',
    itemIds: pack.items.slice(0, 2).map((item) => item.id),
    questionIndex: 1,
    answers: { [pack.items[0].id]: pack.items[0].answerIndex },
    confidence: {},
    updatedAt: 100,
    ...(identity || {}),
  };
}

// Resolve identity the way resumeSavedPractice does: WITH the manifest entry.
// For a lazy pack the resolver prefers the manifest's SHA-256 ('sha256:<digest>')
// over the content-derived fingerprint ('tp-content-v1:<hash>'), so calling it
// bare produces an identity the running hub will never match and every session
// reads as an earlier revision. Same pack, same bytes, different identity domain.
function currentIdentity() {
  const entry = manifestFixture.entries.find((candidate) => candidate.id === pack.id);
  return Hub.resolvePackContentIdentity(pack, entry);
}

describe('Test Prep saved-session revision UI', () => {
  it('offers resume for an exact current content identity', async () => {
    localStorage.setItem(
      'alloflow_test_prep_session_v1',
      JSON.stringify(savedSession(currentIdentity())),
    );

    await mountAndOpenPack();
    await waitForText('Resume saved practice');
    expect(host.textContent).not.toContain('cannot be resumed safely');
  }, 30_000);

  it('retains a legacy session with an explanation and explicit discard control', async () => {
    localStorage.setItem('alloflow_test_prep_session_v1', JSON.stringify(savedSession()));

    await mountAndOpenPack();
    await waitForText('cannot be resumed safely');
    expect(host.textContent).toContain('It remains stored until you discard it or start a new session.');
    expect(host.textContent).not.toContain('Resume saved practice');
    expect(localStorage.getItem('alloflow_test_prep_session_v1')).not.toBeNull();

    const discardButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Discard'));
    expect(discardButton).toBeTruthy();
    await act(async () => { discardButton.click(); });
    expect(localStorage.getItem('alloflow_test_prep_session_v1')).toBeNull();
  }, 30_000);
});
