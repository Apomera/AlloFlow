import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const manifest = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/pack_manifest.json'), 'utf8'));
const apPackBytes = fs.readFileSync(resolve(process.cwd(), 'test_prep/ap_psychology_pilot.json'));
const apLearningLibraryBytes = fs.readFileSync(resolve(process.cwd(), 'test_prep/ap_psychology_pilot_learning_library.json'));
const apPack = JSON.parse(apPackBytes.toString('utf8'));
const apEntry = manifest.entries.find((entry) => entry.id === apPack.id);
const epppEntry = manifest.entries.find((entry) => entry.id === 'eppp-part-one');
let React, ReactDOMClient, act, axe, Hub, Component, root, host, originalFetch;

const AXE_OPTIONS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: {
    'color-contrast': { enabled: false },
    'region': { enabled: false },
    'page-has-heading-one': { enabled: false },
    'landmark-one-main': { enabled: false },
    'scrollable-region-focusable': { enabled: false },
  },
};

function jsonBytes(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function responseBytes(bytes, status = 200) {
  const payload = Buffer.from(bytes);
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(payload.toString('utf8')),
    arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
  };
}

function response(payload, status = 200) {
  return responseBytes(jsonBytes(payload), status);
}

function deferred() {
  let resolvePromise, rejectPromise;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolvePromise = resolveValue;
    rejectPromise = rejectValue;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function setFetch(fetchImplementation) {
  global.fetch = window.fetch = fetchImplementation;
}

function findButton(text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}

function packCard(id) {
  return host.querySelector('[data-test-prep-pack-id="' + id + '"]');
}

function requestedExactPack(urls, stem) {
  const pattern = new RegExp('/' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\.json(?:[?#]|$)');
  return urls.filter((url) => pattern.test(String(url)));
}

async function waitUntil(predicate, message, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    await act(async () => { await new Promise((resolveValue) => setTimeout(resolveValue, 20)); });
  }
  expect(predicate(), message).toBe(true);
}

async function mount(props = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await rerender(props);
}

async function rerender(props = {}) {
  await act(async () => {
    root.render(React.createElement(Component, { isOpen: true, onClose: () => {}, ...props }));
  });
}

async function unmount() {
  if (root) {
    await act(async () => { root.unmount(); });
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  document.body.style.overflow = '';
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  Component = Hub.TestPrepHub;
  originalFetch = global.fetch;
}, 30_000);

afterEach(async () => {
  await unmount();
  localStorage.clear();
  setFetch(originalFetch);
  vi.restoreAllMocks();
});

afterAll(() => {
  setFetch(originalFetch);
});

describe('Test Prep manifest-aware catalog UI', () => {
  it('keeps bundled fallback packs available while adding EPPP only after the manifest resolves', async () => {
    const catalogResponse = deferred();
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return catalogResponse.promise;
      return response({}, 404);
    }));

    await mount();

    expect(host.textContent).toContain('Workplace Safety Foundations');
    expect(packCard(epppEntry.id)).toBeNull();
    expect(Hub.listPacks().some((pack) => pack.id === epppEntry.id)).toBe(false);
    const loadingStatus = host.querySelector('[role="status"]');
    expect(loadingStatus).toBeTruthy();
    expect(loadingStatus.textContent).toContain('Built-in public packs remain available');
    expect(packCard(apPack.id)).toBeNull();
    expect(requestedExactPack(requestedUrls, 'eppp_part_one_pack')).toEqual([]);
    expect(requestedExactPack(requestedUrls, 'ap_psychology_pilot')).toEqual([]);

    await act(async () => {
      catalogResponse.resolve(response(manifest));
      await Promise.resolve();
    });
    await waitUntil(
      () => !host.textContent.includes('Updating the exam-pack catalog'),
      'Expected the catalog manifest to finish loading.',
    );

    expect(packCard(epppEntry.id)).toBeTruthy();
    expect(Array.from(packCard(epppEntry.id).querySelectorAll('dd')).map((node) => node.textContent)).toEqual(['8', '1500']);
    expect(Hub.listPacks().some((pack) => pack.id === epppEntry.id)).toBe(false);
    expect(requestedExactPack(requestedUrls, 'eppp_part_one_pack')).toEqual([]);
    expect(packCard(apPack.id)).toBeNull();
    expect(requestedExactPack(requestedUrls, 'ap_psychology_pilot')).toEqual([]);
    const axeResults = await axe.run(host, AXE_OPTIONS);
    expect(axeResults.violations.map((violation) => violation.id)).toEqual([]);
  }, 30_000);
  it('announces manifest failure, preserves only bundled fallbacks, and restores the EPPP descriptor on retry', async () => {
    let manifestRequests = 0;
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) {
        manifestRequests += 1;
        return manifestRequests <= 3 ? response({}, 503) : response(manifest);
      }
      return response({}, 404);
    }));

    await mount();
    await waitUntil(
      () => Boolean(host.querySelector('[role="alert"]') && findButton('Retry catalog')),
      'Expected an accessible manifest failure state.',
    );

    expect(host.querySelector('[role="alert"]').textContent).toContain('Built-in public packs remain available');
    expect(host.textContent).toContain('Workplace Safety Foundations');
    expect(packCard(epppEntry.id)).toBeNull();
    expect(Hub.listPacks().some((pack) => pack.id === epppEntry.id)).toBe(false);
    expect(requestedExactPack(requestedUrls, 'eppp_part_one_pack')).toEqual([]);
    expect(packCard(apPack.id)).toBeNull();

    await act(async () => { findButton('Retry catalog').click(); });
    await waitUntil(
      () => manifestRequests >= 4 && !findButton('Retry catalog') && Boolean(packCard(epppEntry.id)),
      'Expected catalog retry to load the manifest and restore the EPPP descriptor.',
    );

    expect(manifestRequests).toBe(4);
    expect(packCard(epppEntry.id)).toBeTruthy();
    expect(Hub.listPacks().some((pack) => pack.id === epppEntry.id)).toBe(false);
    expect(requestedExactPack(requestedUrls, 'eppp_part_one_pack')).toEqual([]);
    expect(packCard(apPack.id)).toBeNull();
  });
  it('shows manifest counts without prefetching a public lazy pack, then loads and registers it only on action', async () => {
    const basePack = structuredClone(Hub.listPacks().find((pack) => pack.id === 'workplace-safety-foundations-demo'));
    const fixturePack = {
      ...basePack,
      id: 'public-lazy-catalog-fixture',
      title: 'Public Lazy Catalog Fixture',
      shortTitle: 'Lazy Fixture',
      description: 'A public lazy-loading fixture used only by this focused UI test.',
      disclaimer: 'Independent test fixture. Not an official score or credential.',
      version: '1.0.0',
      visibility: 'public',
      items: basePack.items.map((item, index) => ({ ...item, id: 'public-lazy-item-' + (index + 1) })),
    };
    const fixturePackBytes = jsonBytes(fixturePack);
    const fixtureEntry = {
      id: fixturePack.id,
      loadMode: 'lazy',
      visibility: 'public',
      portfolioCategories: ['k12-college-readiness'],
      title: fixturePack.title,
      shortTitle: fixturePack.shortTitle,
      description: fixturePack.description,
      disclaimer: fixturePack.disclaimer,
      credentialOwner: '',
      status: 'ready',
      version: fixturePack.version,
      blueprintLabel: '',
      blueprintEffective: '',
      officialBlueprintUrl: '',
      itemCount: fixturePack.items.length,
      domainCount: fixturePack.domains.length,
      itemSchemaVersion: fixturePack.itemSchemaVersion,
      responseTypes: ['single-choice'],
      examModes: ['practice'],
      packUrl: './test_prep/public_lazy_catalog_fixture.json',
      learningLibraryUrl: '',
      learningLibraryQaUrl: '',
      nativeQaUrl: '',
      sha256: sha256(fixturePackBytes),
      learningLibrarySha256: '',
      learningLibraryQaSha256: '',
      nativeQaSha256: '',
    };
    const fixtureManifest = {
      schemaVersion: 1,
      catalogVersion: 'ui-fixture',
      categories: manifest.categories,
      entries: [fixtureEntry],
    };
    const packResponse = deferred();
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response(fixtureManifest);
      if (String(url).includes('public_lazy_catalog_fixture.json')) return packResponse.promise;
      return response({}, 404);
    }));

    await mount();
    await waitUntil(() => Boolean(packCard(fixturePack.id)), 'Expected the public lazy descriptor card.');

    const card = packCard(fixturePack.id);
    expect(Array.from(card.querySelectorAll('dd')).map((node) => node.textContent)).toEqual([
      String(fixturePack.domains.length),
      String(fixturePack.items.length),
    ]);
    expect(card.textContent).toContain(fixturePack.disclaimer);
    expect(requestedExactPack(requestedUrls, 'public_lazy_catalog_fixture')).toEqual([]);
    expect(Hub.listPacks().some((pack) => pack.id === fixturePack.id)).toBe(false);

    await act(async () => {
      card.querySelector('button').click();
      await Promise.resolve();
    });
    expect(card.querySelector('[role="status"]').textContent).toContain('Loading Lazy Fixture');
    expect(card.querySelector('button').disabled).toBe(true);
    expect(requestedExactPack(requestedUrls, 'public_lazy_catalog_fixture')).toHaveLength(1);

    await act(async () => {
      packResponse.resolve(responseBytes(fixturePackBytes));
      await Promise.resolve();
    });
    await waitUntil(() => host.textContent.includes('Question 1 of 5'), 'Expected the lazy pack practice screen.');

    expect(Hub.listPacks().some((pack) => pack.id === fixturePack.id)).toBe(true);
    expect(requestedExactPack(requestedUrls, 'public_lazy_catalog_fixture')).toHaveLength(1);
    await waitUntil(
      () => document.activeElement === host.querySelector('[data-test-prep-tab="practice"]'),
      'Expected focus to move to the activated Practice tab.',
    );
  });

  it('rejects altered response bytes without registering or opening the lazy pack', async () => {
    const basePack = structuredClone(Hub.listPacks().find((pack) => pack.id === 'workplace-safety-foundations-demo'));
    const fixturePack = {
      ...basePack,
      id: 'public-integrity-catalog-fixture',
      title: 'Public Integrity Catalog Fixture',
      shortTitle: 'Integrity Fixture',
      description: 'The digest describes these original bytes.',
      version: '1.0.0',
      visibility: 'public',
      items: basePack.items.map((item, index) => ({ ...item, id: 'public-integrity-item-' + (index + 1) })),
    };
    const expectedBytes = jsonBytes(fixturePack);
    const alteredBytes = jsonBytes({ ...fixturePack, description: 'These bytes were altered after the digest was published.' });
    const fixtureEntry = {
      id: fixturePack.id,
      loadMode: 'lazy',
      visibility: 'public',
      portfolioCategories: ['k12-college-readiness'],
      title: fixturePack.title,
      shortTitle: fixturePack.shortTitle,
      description: fixturePack.description,
      disclaimer: fixturePack.disclaimer,
      credentialOwner: '',
      status: 'ready',
      version: fixturePack.version,
      blueprintLabel: '',
      blueprintEffective: '',
      officialBlueprintUrl: '',
      itemCount: fixturePack.items.length,
      domainCount: fixturePack.domains.length,
      itemSchemaVersion: fixturePack.itemSchemaVersion,
      responseTypes: ['single-choice'],
      examModes: ['practice'],
      packUrl: './test_prep/public_integrity_catalog_fixture.json',
      learningLibraryUrl: '',
      learningLibraryQaUrl: '',
      nativeQaUrl: '',
      sha256: sha256(expectedBytes),
      learningLibrarySha256: '',
      learningLibraryQaSha256: '',
      nativeQaSha256: '',
    };
    const fixtureManifest = {
      schemaVersion: 1,
      catalogVersion: 'integrity-ui-fixture',
      categories: manifest.categories,
      entries: [fixtureEntry],
    };
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response(fixtureManifest);
      if (String(url).includes('public_integrity_catalog_fixture.json')) return responseBytes(alteredBytes);
      return response({}, 404);
    }));

    await mount();
    await waitUntil(() => Boolean(packCard(fixturePack.id)), 'Expected the integrity fixture card.');
    await act(async () => { packCard(fixturePack.id).querySelector('button').click(); });
    await waitUntil(
      () => Boolean(packCard(fixturePack.id).querySelector('[role="alert"]')),
      'Expected an integrity failure alert on the fixture card.',
    );

    expect(packCard(fixturePack.id).querySelector('[role="alert"]').textContent).toContain('failed its integrity check');
    expect(Hub.listPacks().some((pack) => pack.id === fixturePack.id)).toBe(false);
    expect(host.querySelector('[data-test-prep-tab="explore"]').getAttribute('aria-selected')).toBe('true');
    expect(requestedExactPack(requestedUrls, 'public_integrity_catalog_fixture')).toHaveLength(3);
  });

  it('cancels an in-flight internal load when its live QA gate is revoked', async () => {
    const fixturePack = {
      ...structuredClone(apPack),
      id: 'internal-live-gate-revocation-fixture',
      title: 'Internal Live Gate Revocation Fixture',
      shortTitle: 'Revocation Fixture',
      version: '1.0.0',
    };
    const fixturePackBytes = jsonBytes(fixturePack);
    const fixtureEntry = {
      ...structuredClone(apEntry),
      id: fixturePack.id,
      title: fixturePack.title,
      shortTitle: fixturePack.shortTitle,
      description: fixturePack.description,
      version: fixturePack.version,
      itemCount: fixturePack.items.length,
      domainCount: fixturePack.domains.length,
      itemSchemaVersion: fixturePack.itemSchemaVersion,
      packUrl: './test_prep/internal_live_gate_revocation_fixture.json',
      learningLibraryUrl: '',
      learningLibraryQaUrl: '',
      nativeQaUrl: '',
      sha256: sha256(fixturePackBytes),
      learningLibrarySha256: '',
      learningLibraryQaSha256: '',
      nativeQaSha256: '',
    };
    const fixtureManifest = {
      schemaVersion: 1,
      catalogVersion: 'live-gate-ui-fixture',
      categories: manifest.categories,
      entries: [fixtureEntry],
    };
    const packResponse = deferred();
    let packSignal = null;
    setFetch(vi.fn(async (url, options = {}) => {
      if (String(url).includes('pack_manifest.json')) return response(fixtureManifest);
      if (String(url).includes('internal_live_gate_revocation_fixture.json')) {
        packSignal = options.signal;
        return packResponse.promise;
      }
      return response({}, 404);
    }));

    const enabledProps = { internalQaMode: true, internalQaPackIds: [fixturePack.id] };
    await mount(enabledProps);
    await waitUntil(() => Boolean(packCard(fixturePack.id)), 'Expected the allowlisted internal fixture card.');
    await act(async () => {
      packCard(fixturePack.id).querySelector('button').click();
      await Promise.resolve();
    });
    await waitUntil(() => Boolean(packSignal), 'Expected the internal pack request to begin.');

    await rerender({ internalQaMode: false, internalQaPackIds: [fixturePack.id] });
    await waitUntil(() => packCard(fixturePack.id) === null, 'Expected live gate revocation to hide the card.');
    expect(packSignal.aborted).toBe(true);

    await act(async () => {
      packResponse.resolve(responseBytes(fixturePackBytes));
      await Promise.resolve();
    });
    expect(Hub.listPacks({ includeInternal: true }).some((pack) => pack.id === fixturePack.id)).toBe(false);
    expect(host.querySelector('[data-test-prep-tab="explore"]').getAttribute('aria-selected')).toBe('true');
    expect(host.textContent).not.toContain('What would you like to work on?');
  });

  it('requires both internal QA props, labels AP unreleased, and hides a registered AP pack on a normal remount', async () => {
    async function mountWithManifest(props, fetchImplementation) {
      setFetch(fetchImplementation);
      await mount(props);
      await waitUntil(
        () => !host.textContent.includes('Updating the exam-pack catalog'),
        'Expected the manifest-backed catalog to settle.',
      );
    }

    await mountWithManifest(
      { internalQaMode: true, internalQaPackIds: [apPack.id + ' '] },
      vi.fn(async (url) => String(url).includes('pack_manifest.json') ? response(manifest) : response({}, 404)),
    );
    expect(packCard(apPack.id)).toBeNull();
    await unmount();

    await mountWithManifest(
      { internalQaMode: false, internalQaPackIds: [apPack.id] },
      vi.fn(async (url) => String(url).includes('pack_manifest.json') ? response(manifest) : response({}, 404)),
    );
    expect(packCard(apPack.id)).toBeNull();
    await unmount();

    const apResponse = deferred();
    const qaRequestedUrls = [];
    await mountWithManifest(
      { internalQaMode: true, internalQaPackIds: [apPack.id] },
      vi.fn(async (url) => {
        qaRequestedUrls.push(String(url));
        if (String(url).includes('pack_manifest.json')) return response(manifest);
        if (/\/ap_psychology_pilot\.json(?:[?#]|$)/.test(String(url))) return apResponse.promise;
        if (/\/ap_psychology_pilot_learning_library\.json(?:[?#]|$)/.test(String(url))) return responseBytes(apLearningLibraryBytes);
        return response({}, 404);
      }),
    );

    const card = packCard(apPack.id);
    expect(card).toBeTruthy();
    expect(card.textContent).toContain('Unreleased');
    expect(card.textContent).toContain('explicitly allowlisted review session');
    expect(Array.from(card.querySelectorAll('dd')).map((node) => node.textContent)).toEqual(['5', '20']);
    expect(card.textContent).toContain(apEntry.disclaimer);
    expect(requestedExactPack(qaRequestedUrls, 'ap_psychology_pilot')).toEqual([]);

    await act(async () => {
      card.querySelector('button').click();
      await Promise.resolve();
    });
    expect(card.querySelector('[role="status"]').textContent).toContain('Loading AP Psychology Pilot');
    expect(requestedExactPack(qaRequestedUrls, 'ap_psychology_pilot')).toHaveLength(1);

    await act(async () => {
      apResponse.resolve(responseBytes(apPackBytes));
      await Promise.resolve();
    });
    await waitUntil(
      () => host.textContent.includes('What would you like to work on?'),
      'Expected the explicitly enabled AP pack to open.',
    );
    expect(Hub.listPacks({ includeInternal: true }).some((pack) => pack.id === apPack.id)).toBe(true);
    expect(requestedExactPack(qaRequestedUrls, 'ap_psychology_pilot_learning_library')).toEqual([]);
    const fallbackSkillSelect = host.querySelector('select[aria-label="Target practice skill"]');
    expect(fallbackSkillSelect).toBeTruthy();
    expect(Array.from(fallbackSkillSelect.options).map((option) => option.value)).toEqual(['', 'p1', 'p2', 'p3']);
    expect(Array.from(fallbackSkillSelect.options).find((option) => option.value === 'p1').textContent).toBe('Across domains: P1');
    await act(async () => { findButton('Learning library').click(); });
    await waitUntil(
      () => requestedExactPack(qaRequestedUrls, 'ap_psychology_pilot_learning_library').length === 1,
      'Expected the first Learning library action to request the manifest-bound AP catalog.',
    );
    await waitUntil(
      () => host.textContent.includes('Biological Bases of Behavior'),
      'Expected the exact-byte AP learning library to render.',
    );
    await act(async () => { host.querySelector('[data-test-prep-tab="practice"]').click(); });
    const reviewedSkillSelect = host.querySelector('select[aria-label="Target practice skill"]');
    expect(Array.from(reviewedSkillSelect.options).find((option) => option.value === 'p1').textContent)
      .toBe('Across domains: Concept Understanding');
    await act(async () => {
      reviewedSkillSelect.value = 'p1';
      reviewedSkillSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { findButton('Start targeted set').click(); });
    await waitUntil(
      () => host.textContent.includes('Question 1 of 13'),
      'Expected normalized AP P1 targeting to select the 13 P1 items.',
    );
    expect(host.textContent).toContain('Targeted practice: Concept Understanding');
    expect(requestedExactPack(qaRequestedUrls, 'ap_psychology_pilot_learning_library')).toHaveLength(1);
    await unmount();

    const ordinaryRequestedUrls = [];
    await mountWithManifest(
      {},
      vi.fn(async (url) => {
        ordinaryRequestedUrls.push(String(url));
        if (String(url).includes('pack_manifest.json')) return response(manifest);
        return response({}, 404);
      }),
    );

    expect(packCard(apPack.id)).toBeNull();
    expect(host.textContent).not.toContain(apEntry.title);
    expect(requestedExactPack(ordinaryRequestedUrls, 'ap_psychology_pilot')).toEqual([]);
    expect(ordinaryRequestedUrls.some((url) => url.includes('ap_psychology_pilot_learning_library.json'))).toBe(false);

    await act(async () => { findButton('Notes & highlights').click(); });
    const selectorLabels = Array.from(host.querySelectorAll('select option')).map((option) => option.textContent);
    expect(selectorLabels).not.toContain(apEntry.shortTitle);
  }, 30_000);
});
