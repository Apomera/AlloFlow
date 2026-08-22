import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const baseManifest = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/pack_manifest.json'), 'utf8'));
let React, ReactDOMClient, act, Hub, Component, root, host, originalFetch;

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

function makeFixture(suffix, title = 'Gate Catalog') {
  const basePack = structuredClone(
    Hub.listPacks().find((pack) => pack.id === 'workplace-safety-foundations-demo'),
  );
  const id = 'learning-library-gate-' + suffix;
  const libraryUrl = './test_prep/' + id.replace(/-/g, '_') + '.json';
  const pack = {
    ...basePack,
    id,
    title: 'Learning Library Gate ' + suffix,
    shortTitle: 'Gate ' + suffix,
    version: '1.0.0',
    visibility: 'public',
    learningLibraryUrl: libraryUrl,
    simulationItemCount: basePack.items.length,
    simulationTimeMinutes: 5,
    simulationLabel: 'Fixture simulation',
    simulationDomainCounts: { 'hazard-awareness': 2, 'safe-response': 3 },
    items: basePack.items.map((item, index) => ({
      ...item,
      id: id + '-item-' + (index + 1),
      skillIds: [index < 3 ? 'hazard-recognition' : 'emergency-response'],
    })),
  };
  const library = {
    schemaVersion: 1,
    packId: id,
    version: pack.version,
    visibility: pack.visibility,
    title,
    description: title + ' description.',
    summary: {
      chapters: 1,
      sections: 0,
      knowledgeChecks: 0,
      flashcards: 0,
      memoryAids: 0,
      diagrams: 0,
      glossaryTerms: 0,
      sourceReviewedChapters: 1,
      sourceReviewedFlashcards: 0,
      sourceReviewedMemoryAids: 0,
      editorialReviewedSourcePendingMemoryAids: 0,
      foundationalDocuments: 1,
      sourceReviewedFoundationalDocuments: 1,
      foundationalDocumentRoutes: 1,
      sourceReviewedFoundationalDocumentRoutes: 1,
    },
    chapters: [{
      id: id + '-chapter',
      title: title + ' Chapter',
      domain: pack.domains[0].label,
      summary: 'A focused regression fixture chapter.',
      reviewStatus: 'source-reviewed-editorial-pass',
      objectives: [],
      sections: [],
      knowledgeChecks: [],
    }],
    foundationalDocumentRoutes: [{
      id: id + '-document-route',
      documentId: id + '-document',
      title: 'Public Foundation Document ' + suffix,
      academicYearReference: '2026-27',
      topicIds: ['hazard-awareness'],
      chapterIds: [id + '-chapter'],
      sectionIds: [id + '-chapter-section'],
      workshopIds: [],
      itemIds: pack.items.map((item) => item.id),
      foundationItemIds: pack.items.slice(0, 3).map((item) => item.id),
      depthItemIds: pack.items.slice(3, 4).map((item) => item.id),
      transferItemIds: pack.items.slice(4).map((item) => item.id),
      itemCount: pack.items.length,
      practiceSliceCounts: { 'foundation-slice': 3, 'depth-slice': 1, 'transfer-slice': 1 },
      studyMove: 'Use this public document title as a retrieval cue, then connect it to the linked practice topics.',
      accessNote: 'This route contains public metadata and original practice links only; it does not reproduce official document text.',
      references: ['https://example.com/public-foundation-document'],
      reviewStatus: 'source-reviewed-editorial-pass',
    }],
    skills: [],
    flashcards: [],
    memoryAids: [],
    glossary: [],
    nativeDiagrams: [],
    diagrams: [],
  };
  const libraryBytes = jsonBytes(library);
  const entry = {
    id,
    loadMode: 'bundled',
    visibility: 'public',
    portfolioCategories: ['k12-college-readiness'],
    title: pack.title,
    shortTitle: pack.shortTitle,
    description: pack.description,
    disclaimer: pack.disclaimer,
    credentialOwner: '',
    status: 'ready',
    version: pack.version,
    blueprintLabel: '',
    blueprintEffective: '',
    officialBlueprintUrl: '',
    itemCount: pack.items.length,
    domainCount: pack.domains.length,
    itemSchemaVersion: pack.itemSchemaVersion,
    responseTypes: ['single-choice'],
    examModes: ['practice'],
    packUrl: '',
    learningLibraryUrl: libraryUrl,
    learningLibraryQaUrl: '',
    nativeQaUrl: '',
    sha256: '',
    learningLibrarySha256: sha256(libraryBytes),
    learningLibraryQaSha256: '',
    nativeQaSha256: '',
  };
  Hub.registerPack(pack);
  return {
    pack,
    library,
    libraryBytes,
    entry,
    manifest: {
      schemaVersion: 1,
      catalogVersion: 'library-gate-' + suffix,
      categories: baseManifest.categories,
      entries: [entry],
    },
  };
}

function setFetch(fetchImplementation) {
  global.fetch = window.fetch = fetchImplementation;
}

function libraryRequests(urls, fixture) {
  return urls.filter((url) => String(url).includes(fixture.entry.learningLibraryUrl.replace('./', '')));
}

function findButton(text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}

function packCard(id) {
  return host.querySelector('[data-test-prep-pack-id="' + id + '"]');
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

async function openFixture(fixture) {
  await waitUntil(() => Boolean(packCard(fixture.pack.id)), 'Expected the manifest-backed fixture card.');
  await act(async () => { packCard(fixture.pack.id).querySelector('button').click(); });
  await waitUntil(
    () => Boolean(host.querySelector('[data-test-prep-tab="practice"][aria-selected="true"]')),
    'Expected fixture practice to open.',
  );
}

async function clickTab(id) {
  const tab = host.querySelector('[data-test-prep-tab="' + id + '"]');
  expect(tab).toBeTruthy();
  await act(async () => { tab.click(); });
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  Component = Hub.TestPrepHub;
  originalFetch = global.fetch;
}, 30_000);

afterEach(async () => {
  if (root) {
    await act(async () => { root.unmount(); });
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  document.body.style.overflow = '';
  localStorage.clear();
  setFetch(originalFetch);
  vi.restoreAllMocks();
});

afterAll(() => {
  setFetch(originalFetch);
});

describe('Test Prep interaction-gated learning library', () => {
  it('does not fetch on pack open or practice, fetches once on first library action, and retains the validated same-identity library across tabs', async () => {
    const fixture = makeFixture('retention', 'Initial Gate Catalog');
    let activeManifest = fixture.manifest;
    let activeLibraryBytes = fixture.libraryBytes;
    let pendingLibraryResponse = null;
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response(activeManifest);
      if (String(url).includes(fixture.entry.learningLibraryUrl.replace('./', ''))) {
        if (pendingLibraryResponse) return pendingLibraryResponse.promise;
        return responseBytes(activeLibraryBytes);
      }
      return response({}, 404);
    }));

    await mount();
    await openFixture(fixture);
    expect(libraryRequests(requestedUrls, fixture)).toEqual([]);
    const skillSelect = host.querySelector('select[aria-label="Target practice skill"]');
    expect(skillSelect).toBeTruthy();
    expect(Array.from(skillSelect.options).map((option) => option.textContent)).toEqual([
      'Choose a skill',
      'Across domains: Hazard Recognition',
      fixture.pack.domains[1].label + ': Emergency Response',
    ]);

    await clickTab('practice');
    expect(libraryRequests(requestedUrls, fixture)).toEqual([]);

    await clickTab('library');
    await waitUntil(() => host.textContent.includes('Initial Gate Catalog'), 'Expected the first library action to load the catalog.');
    expect(libraryRequests(requestedUrls, fixture)).toHaveLength(1);

    await clickTab('practice');
    await clickTab('library');
    expect(host.textContent).toContain('Initial Gate Catalog');
    expect(libraryRequests(requestedUrls, fixture)).toHaveLength(1);

    const changedLibrary = {
      ...fixture.library,
      title: 'Changed Digest Catalog',
      description: 'The manifest now binds a different exact-byte catalog.',
    };
    activeLibraryBytes = jsonBytes(changedLibrary);
    activeManifest = {
      ...fixture.manifest,
      catalogVersion: 'library-gate-retention-2',
      entries: [{
        ...fixture.entry,
        learningLibrarySha256: sha256(activeLibraryBytes),
      }],
    };
    pendingLibraryResponse = deferred();
    await rerender({ isOpen: false });
    await rerender({ isOpen: true });
    await waitUntil(
      () => libraryRequests(requestedUrls, fixture).length === 2,
      'Expected a new request after the manifest-bound digest identity changed.',
    );
    expect(host.textContent).not.toContain('Initial Gate Catalog');
    expect(host.textContent).toContain('Loading the learning library');

    await act(async () => {
      pendingLibraryResponse.resolve(responseBytes(activeLibraryBytes));
      await Promise.resolve();
    });
    await waitUntil(() => host.textContent.includes('Changed Digest Catalog'), 'Expected the new identity catalog to replace the old one.');
    expect(libraryRequests(requestedUrls, fixture)).toHaveLength(2);
  }, 30_000);

  it('uses the trusted pack-level library fallback after the manifest becomes unavailable', async () => {
    const fixture = makeFixture('manifest-fallback', 'Manifest Failure Fallback Catalog');
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response({}, 503);
      if (String(url).includes(fixture.entry.learningLibraryUrl.replace('./', ''))) {
        return responseBytes(fixture.libraryBytes);
      }
      return response({}, 404);
    }));

    await mount();
    await waitUntil(() => Boolean(findButton('Retry catalog')), 'Expected the catalog manifest to settle in its fallback state.');
    await openFixture(fixture);
    expect(libraryRequests(requestedUrls, fixture)).toEqual([]);
    expect(host.querySelector('select[aria-label="Target practice skill"]')).toBeTruthy();

    await clickTab('library');
    await waitUntil(
      () => host.textContent.includes('Manifest Failure Fallback Catalog'),
      'Expected the trusted pack-level catalog to load after manifest failure.',
    );
    expect(libraryRequests(requestedUrls, fixture)).toHaveLength(1);
  }, 30_000);

  it('offers an accessible retry after a failed library load', async () => {
    const fixture = makeFixture('failure', 'Recovered Gate Catalog');
    let failLibrary = true;
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response(fixture.manifest);
      if (String(url).includes(fixture.entry.learningLibraryUrl.replace('./', ''))) {
        return failLibrary ? response({}, 503) : responseBytes(fixture.libraryBytes);
      }
      return response({}, 404);
    }));

    await mount();
    await openFixture(fixture);
    await clickTab('library');
    await waitUntil(() => Boolean(findButton('Retry learning library')), 'Expected the failed library state to expose retry.');
    const failedRequestCount = libraryRequests(requestedUrls, fixture).length;
    expect(failedRequestCount).toBeGreaterThanOrEqual(3);
    expect(host.querySelector('[role="alert"]').textContent).toContain('Practice questions remain available');

    failLibrary = false;
    await act(async () => { findButton('Retry learning library').click(); });
    await waitUntil(() => host.textContent.includes('Recovered Gate Catalog'), 'Expected retry to load the validated library.');
    expect(libraryRequests(requestedUrls, fixture)).toHaveLength(failedRequestCount + 1);
  }, 30_000);

  it('aborts an in-flight library request when practice resumes and retries on the next library action', async () => {
    const fixture = makeFixture('cancel', 'Retried After Cancel Catalog');
    const firstLibraryResponse = deferred();
    let libraryRequestCount = 0;
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response(fixture.manifest);
      if (String(url).includes(fixture.entry.learningLibraryUrl.replace('./', ''))) {
        libraryRequestCount += 1;
        return libraryRequestCount === 1 ? firstLibraryResponse.promise : responseBytes(fixture.libraryBytes);
      }
      return response({}, 404);
    }));

    await mount();
    await openFixture(fixture);
    await clickTab('library');
    await waitUntil(() => libraryRequestCount === 1, 'Expected the initial library request to start.');
    expect(host.textContent).toContain('Loading the learning library');

    await clickTab('practice');
    await clickTab('library');
    await waitUntil(() => host.textContent.includes('Retried After Cancel Catalog'), 'Expected the next library action to retry after cancellation.');
    expect(libraryRequestCount).toBe(2);
    expect(libraryRequests(requestedUrls, fixture)).toHaveLength(2);
  }, 30_000);

  it('surfaces foundational-document routes and launches their linked practice set', async () => {
    const fixture = makeFixture('document-routes', 'Document Route Catalog');
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response(fixture.manifest);
      if (String(url).includes(fixture.entry.learningLibraryUrl.replace('./', ''))) return responseBytes(fixture.libraryBytes);
      return response({}, 404);
    }));

    await mount();
    await openFixture(fixture);
    await clickTab('library');
    await waitUntil(() => host.textContent.includes('Document Route Catalog'), 'Expected the document-route library to load.');
    const modeButton = findButton('Foundational documents');
    expect(modeButton).toBeTruthy();
    await act(async () => { modeButton.click(); });
    expect(host.textContent).toContain('Foundational-document study routes');
    expect(host.textContent).toContain('Public Foundation Document document-routes');
    expect(host.querySelector('[data-test-prep-foundational-route-id="learning-library-gate-document-routes-document-route"]')).toBeTruthy();
    expect(host.querySelector('[data-test-prep-foundational-route-progress="not-started"]')).toBeTruthy();
    expect(host.textContent).toContain('Not started yet');
    expect(findButton('Start foundation set')).toBeTruthy();
    expect(findButton('Start depth set')).toBeTruthy();
    expect(findButton('Start transfer set')).toBeTruthy();

    await act(async () => { findButton('Start foundation set').click(); });
    await waitUntil(() => host.textContent.includes('Question 1 of 3'), 'Expected the foundation slice to open a focused practice set.');
    const foundationSession = JSON.parse(localStorage.getItem('alloflow_test_prep_session_v1'));
    expect(foundationSession.itemIds).toEqual(fixture.library.foundationalDocumentRoutes[0].foundationItemIds);
    await clickTab('library');
    await waitUntil(() => host.textContent.includes('Foundational-document study routes'), 'Expected the document route catalog to return after slice practice.');

    const startButton = findButton('Start document route');
    expect(startButton).toBeTruthy();
    await act(async () => { startButton.click(); });
    await waitUntil(() => host.textContent.includes('Question 1 of 5'), 'Expected the document route to open its linked practice set.');
    const session = JSON.parse(localStorage.getItem('alloflow_test_prep_session_v1'));
    expect(session).toMatchObject({ packId: fixture.pack.id, mode: 'custom' });
    expect(session.label).toContain('Foundational document: Public Foundation Document document-routes');
    expect(session.itemIds).toEqual(fixture.pack.items.map((item) => item.id));
    expect(requestedUrls.filter((url) => url.includes(fixture.entry.learningLibraryUrl.replace('./', '')))).toHaveLength(1);
  }, 30_000);

  it('shows route coverage and the latest route score from current practice history', async () => {
    const fixture = makeFixture('document-progress', 'Document Progress Catalog');
    const route = fixture.library.foundationalDocumentRoutes[0];
    const identity = Hub.resolvePackContentIdentity(fixture.pack, fixture.entry);
    const itemIds = fixture.pack.items.map((item) => item.id);
    localStorage.setItem('alloflow_test_prep_progress_v1', JSON.stringify({
      attempts: [{
        id: 'document-route-attempt',
        packId: fixture.pack.id,
        ...identity,
        completedAt: 1_700_000_000_000,
        correct: 3,
        total: itemIds.length,
        percent: 60,
        mode: 'custom',
        label: 'Foundational document: ' + route.title,
        itemIds,
        itemResults: Object.fromEntries(itemIds.map((itemId, index) => [itemId, { correct: index < 3, confidence: 'unrated' }])),
      }],
    }));
    const requestedUrls = [];
    setFetch(vi.fn(async (url) => {
      requestedUrls.push(String(url));
      if (String(url).includes('pack_manifest.json')) return response(fixture.manifest);
      if (String(url).includes(fixture.entry.learningLibraryUrl.replace('./', ''))) return responseBytes(fixture.libraryBytes);
      return response({}, 404);
    }));

    await mount();
    await openFixture(fixture);
    await clickTab('library');
    await waitUntil(() => host.textContent.includes('Document Progress Catalog'), 'Expected the document-progress library to load.');
    await act(async () => { findButton('Foundational documents').click(); });
    expect(host.querySelector('[data-test-prep-foundational-route-progress="complete"]')).toBeTruthy();
    expect(host.textContent).toContain('Coverage complete');
    expect(host.textContent).toContain('5 of 5 linked questions practiced');
    expect(host.textContent).toContain('last route score 60%');
    expect(requestedUrls.filter((url) => url.includes(fixture.entry.learningLibraryUrl.replace('./', '')))).toHaveLength(1);
  }, 30_000);
});
