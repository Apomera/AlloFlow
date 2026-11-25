import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const baseManifest = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/pack_manifest.json'), 'utf8'));

let React, ReactDOMClient, act, Hub, Component, root, host, originalFetch;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function responseBytes(bytes, status = 200) {
  const payload = Buffer.from(bytes);
  return {
    ok: status < 300,
    status,
    json: async () => JSON.parse(payload.toString('utf8')),
    arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength),
  };
}

const findButton = (text) => Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
async function waitUntil(predicate, message, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    await act(async () => { await new Promise((done) => setTimeout(done, 20)); });
  }
  expect(predicate(), message).toBe(true);
}
async function click(el) {
  expect(el).toBeTruthy();
  await act(async () => { el.click(); });
}

function mountRealPack({ packFile, libraryFile, packId }) {
  const packRaw = fs.readFileSync(resolve(process.cwd(), 'test_prep', packFile));
  const libRaw = fs.readFileSync(resolve(process.cwd(), 'test_prep', libraryFile));
  const packData = JSON.parse(packRaw.toString('utf8'));
  const libData = JSON.parse(libRaw.toString('utf8'));
  const manifestEntry = baseManifest.entries.find((e) => e.id === packId);
  expect(manifestEntry, `manifest entry for ${packId}`).toBeTruthy();

  const stubEntry = {
    ...manifestEntry,
    loadMode: 'bundled',
    sha256: '',
    learningLibraryUrl: `./test_prep/${libraryFile}`,
    learningLibrarySha256: sha256(libRaw),
  };
  const bundledPack = {
    ...packData,
    id: packId,
    visibility: packData.visibility || manifestEntry.visibility || 'public',
    learningLibraryUrl: `./test_prep/${libraryFile}`,
  };
  Hub.registerPack(bundledPack);

  const manifest = {
    schemaVersion: 1,
    catalogVersion: 'smoke-' + packId,
    categories: baseManifest.categories,
    entries: [stubEntry],
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest), 'utf8');

  global.fetch = window.fetch = vi.fn(async (url) => {
    const u = String(url || '');
    if (u.includes('pack_manifest.json')) return responseBytes(manifestBytes);
    if (u.includes(libraryFile)) return responseBytes(libRaw);
    if (u.includes(packFile)) return responseBytes(packRaw);
    return responseBytes(Buffer.from('{}'), 404);
  });

  return { packData: bundledPack, libData, stubEntry };
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
  if (root) { await act(async () => { root.unmount(); }); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.style.overflow = '';
  localStorage.clear();
  global.fetch = window.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('Test Prep Hub study checklist helpers and full-tab live runtime smoke', () => {
  it('toggles, counts, isolates, and resets persisted study checklist entries cleanly', () => {
    let store = Hub.normalizeStudyChecklists(null);
    expect(store).toEqual({});

    store = Hub.toggleStudyCheck(store, 'eppp-part-one', 'sess:eppp-session-1:0');
    store = Hub.toggleStudyCheck(store, 'eppp-part-one', 'sess:eppp-session-1:1');
    store = Hub.toggleStudyCheck(store, 'eppp-part-one', 'qr:eppp-reference-01:0');
    store = Hub.toggleStudyCheck(store, 'parapro-1755-practice-1', 'sess:parapro-1:0');

    expect(Hub.countStudyChecks(store['eppp-part-one'], ['sess:eppp-session-1:0', 'sess:eppp-session-1:1', 'sess:eppp-session-1:2']))
      .toEqual({ checked: 2, total: 3, percent: 67 });

    // Toggling an existing key clears only that key
    store = Hub.toggleStudyCheck(store, 'eppp-part-one', 'sess:eppp-session-1:0');
    expect(store['eppp-part-one']['sess:eppp-session-1:0']).toBeUndefined();
    expect(store['eppp-part-one']['sess:eppp-session-1:1']).toBe(true);

    // Prefix reset clears only matching prefix inside the target pack
    store = Hub.resetStudyChecks(store, 'eppp-part-one', 'sess:eppp-session-1:');
    expect(store['eppp-part-one']['sess:eppp-session-1:1']).toBeUndefined();
    expect(store['eppp-part-one']['qr:eppp-reference-01:0']).toBe(true);
    expect(store['parapro-1755-practice-1']['sess:parapro-1:0']).toBe(true);

    // Backup exportProgress / importProgress round-trip preserves studyChecklists cleanly
    const exported = Hub.exportProgress({ attempts: [] }, {}, Date.now(), { studyChecklists: store });
    expect(exported.studyChecklists).toEqual(store);
    const reimported = Hub.importProgress(JSON.stringify(exported));
    expect(reimported.studyChecklists).toEqual(store);
    // Backwards compatibility: older v4 backups without studyChecklists import with null
    const legacyV4 = { ...exported };
    delete legacyV4.studyChecklists;
    expect(Hub.importProgress(JSON.stringify(legacyV4)).studyChecklists).toBeNull();
  });

  it('indexes quickReference and unitReviewRoutes in pack-wide search across EPPP and Praxis packs', () => {
    const epppPack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_part_one_pack.json'), 'utf8'));
    const epppLib = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/eppp_learning_library.json'), 'utf8'));
    const qrTitle = epppLib.quickReference[0].title;
    const qrHits = Hub.searchPack(epppPack, epppLib, qrTitle, { limit: 100 });
    expect(qrHits.results.some((r) => r.type === 'quick-reference')).toBe(true);
    const routeHits = Hub.searchPack(epppPack, epppLib, 'Domain 1 (10%)', { limit: 100 });
    expect(routeHits.results.some((r) => r.type === 'unit-route')).toBe(true);
  });

  it('resolves matching misconception playbooks and Quick Reference cards for missed items across EPPP, AP, and Praxis packs', () => {
    const cases = [
      ['eppp_part_one_pack.json', 'eppp_learning_library.json'],
      ['ap_psychology_pilot.json', 'ap_psychology_pilot_learning_library.json'],
      ['audiology_5343_pack.json', 'audiology_5343_learning_library.json'],
    ];
    for (const [pf, lf] of cases) {
      const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', pf), 'utf8'));
      const lib = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', lf), 'utf8'));
      const linkedItemId = lib.misconceptionFamilies[0].itemIds[0];
      const item = pack.items.find((entry) => entry.id === linkedItemId);
      expect(item, `${pf} linked item ${linkedItemId}`).toBeTruthy();

      const itemLinks = Hub.findStudyLinksForItem(lib, item);
      expect(itemLinks.hasLinks, `${pf} itemLinks.hasLinks`).toBe(true);
      expect(itemLinks.playbooks.length, `${pf} matching playbook`).toBeGreaterThanOrEqual(1);
      expect(itemLinks.quickRefs.length, `${pf} matching quickRef`).toBeGreaterThanOrEqual(1);

      const attemptLinks = Hub.findStudyLinksForItems(lib, [item]);
      expect(attemptLinks.playbooks[0].matchedCount).toBe(1);
      expect(attemptLinks.quickRefs[0].matchedCount).toBe(1);

      const analytics = { domainRows: [{ id: item.domainId, correct: 1, total: 3, percent: 33 }] };
      const fakeAttempts = [{ completedAt: Date.now(), itemResults: { [item.id]: { correct: false } } }];
      const triage = Hub.buildProgressTriage(lib, analytics, fakeAttempts, pack.items);
      expect(triage.hasTriage, `${pf} progress triage`).toBe(true);
      expect(triage.weakDomains[0].id).toBe(item.domainId);
      expect(triage.weakDomains[0].quickRef).toBeTruthy();
      expect(triage.weakDomains[0].missedItemIds).toContain(item.id);
      expect(triage.missedItemIds).toContain(item.id);
      expect(triage.playbooks.length).toBeGreaterThanOrEqual(1);
      expect(triage.unresolvedMissedCount).toBe(1);
    }
  });

  it('round-trips studyChecklists, flashcardStores, and progress cleanly through v4 exportProgress/importProgress', () => {
    const checks = Hub.toggleStudyCheck(
      Hub.toggleStudyCheck({}, 'eppp-part-one', 'pb:eppp-pb-1:0'),
      'ap-calculus-ab-foundation-pilot',
      'qr:calc-ref-1:0'
    );
    const fcSchedule = Hub.rateFlashcard({}, 'fc-1', 'again', 1_700_000_000_000);
    const exported = Hub.exportProgress(
      { attempts: [{ id: 'a1', packId: 'eppp-part-one', completedAt: 1_700_000_000_000, correct: 4, total: 5, percent: 80, mode: 'standard' }] },
      {},
      1_700_000_100_000,
      {
        studyChecklists: checks,
        flashcardStores: { 'eppp-part-one': { schemaVersion: 2, scopes: [{ packId: 'eppp-part-one', packVersion: '1', packContentFingerprint: '', schedule: fcSchedule }] } },
      }
    );
    expect(exported.schemaVersion).toBe(4);
    const imported = Hub.importProgress(JSON.parse(JSON.stringify(exported)));
    expect(imported).toBeTruthy();
    expect(imported.studyChecklists['eppp-part-one']['pb:eppp-pb-1:0']).toBe(true);
    expect(imported.studyChecklists['ap-calculus-ab-foundation-pilot']['qr:calc-ref-1:0']).toBe(true);
    expect(imported.progress.attempts).toHaveLength(1);
    expect(imported.flashcardStores.byPack['eppp-part-one'].scopes[0].schedule['fc-1'].rating).toBe('again');
  });

  const REPRESENTATIVE_PACKS = [
    {
      label: 'EPPP Part 1',
      packId: 'eppp-part-one',
      packFile: 'eppp_part_one_pack.json',
      libraryFile: 'eppp_learning_library.json',
      expectedWorkshopLabel: 'Applied clinical case workshops',
      expectedUnitHeading: 'Domain review',
    },
    {
      label: 'AP Calculus AB',
      packId: 'ap-calculus-ab-foundation-pilot',
      packFile: 'ap_calculus_ab_foundation_pilot.json',
      libraryFile: 'ap_calculus_ab_foundation_pilot_learning_library.json',
      expectedWorkshopLabel: 'Written-response workshops',
      expectedUnitHeading: 'Unit review',
    },
    {
      label: 'Praxis Audiology 5343',
      packId: 'praxis-audiology-5343',
      packFile: 'audiology_5343_pack.json',
      libraryFile: 'audiology_5343_learning_library.json',
      expectedWorkshopLabel: 'Applied clinical case workshops',
      expectedUnitHeading: 'Unit review',
    },
    {
      label: 'Praxis SPED Early Childhood 5692',
      packId: 'praxis-special-education-early-childhood-5692',
      packFile: 'special_education_early_childhood_5692_pack.json',
      libraryFile: 'special_education_early_childhood_5692_learning_library.json',
      expectedWorkshopLabel: 'Applied practice case workshops',
      expectedUnitHeading: 'Unit review',
    },
    {
      label: 'ParaPro Assessment 1755',
      packId: 'parapro-1755-practice-1',
      packFile: 'parapro_pack.json',
      libraryFile: 'parapro_learning_library.json',
      expectedWorkshopLabel: 'Applied classroom case workshops',
      expectedUnitHeading: 'Unit review',
    },
  ];

  for (const spec of REPRESENTATIVE_PACKS) {
    it(`renders all live study tabs and persists interactive checklists cleanly for ${spec.label}`, async () => {
      const { libData } = mountRealPack(spec);
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);

      await act(async () => {
        root.render(React.createElement(Component, {
          isOpen: true,
          onClose: () => {},
          internalQaMode: true,
          internalQaPackIds: [spec.packId],
        }));
      });
      await waitUntil(() => Boolean(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"]`)), `${spec.label} pack card`);
      await click(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"] button`));
      await waitUntil(() => Boolean(host.querySelector('[data-test-prep-tab="library"]')), `${spec.label} library tab`);
      await click(host.querySelector('[data-test-prep-tab="library"]'));
      await waitUntil(() => Boolean(findButton('Study plan')), `${spec.label} Study plan mode`);

      // 1. Study Plan tab
      await click(findButton('Study plan'));
      expect(host.textContent).toContain(spec.expectedUnitHeading);
      expect(host.querySelectorAll('[data-test-prep-unit-route]').length).toBeGreaterThanOrEqual(8);
      expect(host.querySelectorAll('[data-test-prep-ladder]').length).toBeGreaterThanOrEqual(3);
      expect(host.querySelectorAll('[data-test-prep-practice-form]').length).toBeGreaterThanOrEqual(3);

      // 2. Quick Reference tab + interactive checklist persistence
      await click(findButton('Quick reference'));
      expect(host.querySelectorAll('[data-test-prep-quick-ref]').length).toBe(libData.quickReference.length);
      const firstQrCheck = host.querySelector('[data-test-prep-quickref-check]');
      expect(firstQrCheck).toBeTruthy();
      expect(firstQrCheck.checked).toBe(false);
      await click(firstQrCheck);
      expect(firstQrCheck.checked).toBe(true);
      expect(host.textContent).toContain('Reset checklist');

      // 3. Misconception Playbooks tab + interactive stage checkbox
      await click(findButton('Misconception playbooks'));
      expect(host.querySelectorAll('[data-test-prep-playbook]').length).toBeGreaterThanOrEqual(6);
      const firstPbCheck = host.querySelector('[data-test-prep-playbook-step]');
      expect(firstPbCheck).toBeTruthy();
      await click(firstPbCheck);
      expect(firstPbCheck.checked).toBe(true);

      // 4. Study Sessions & Spaced Review tab + persisted step/stage ticks
      await click(findButton('Study sessions'));
      expect(host.querySelectorAll('[data-test-prep-study-session]').length).toBeGreaterThanOrEqual(7);
      const firstSessCheck = host.querySelector('[data-test-prep-session-step]');
      expect(firstSessCheck).toBeTruthy();
      await click(firstSessCheck);
      expect(firstSessCheck.checked).toBe(true);
      const firstSpacedCheck = host.querySelector('[data-test-prep-spaced-stage]');
      expect(firstSpacedCheck).toBeTruthy();
      await click(firstSpacedCheck);
      expect(firstSpacedCheck.checked).toBe(true);

      // Verify localStorage persisted all 4 interactive checklist ticks under this pack
      const persisted = JSON.parse(localStorage.getItem('alloflow_test_prep_study_checklists_v1') || '{}');
      expect(Object.keys(persisted[spec.packId] || {}).length).toBe(4);
      const progressBar = host.querySelector('[data-test-prep-library-progress-bar="true"]');
      expect(progressBar).toBeTruthy();
      expect(progressBar.textContent).toContain('4 study checks done');

      // 5. Public Sources tab
      await click(findButton('Sources'));
      expect(host.textContent).toContain(`of ${libData.sourceCatalog.length} verified public sources`);

      // 6. Applied / Written-Response Workshops tab
      await click(findButton(libData.workshopLabel || 'Written-response workshops'));
      expect(host.textContent).toContain(libData.constructedResponseWorkshops[0].title);

      // 7. Searchable Glossary tab (sorted alphabetically in UI)
      await click(findButton('Glossary'));
      const firstAlphaTerm = [...libData.glossary]
        .sort((a, b) => String(a.term || '').localeCompare(String(b.term || ''), 'en-US'))[0].term;
      expect(host.textContent).toContain(firstAlphaTerm);
      expect(host.textContent).toContain('Read term aloud');

      // 8. Practice-to-Study cross-linking, Flashcard/Check Needs-Review filters & Reset Pack Checks (EPPP Part 1 end-to-end check)
      if (spec.packId === 'eppp-part-one') {
        // 8a. Flashcards "Needs review only" filter + keyboard navigation (Space reveal, 1/2/3 rate, ArrowRight/ArrowLeft, search input isolation)
        await click(findButton('Flashcards'));
        await waitUntil(() => Boolean(findButton('Reveal answer')), 'Flashcard Reveal answer button');
        expect(host.querySelector('[data-test-prep-flashcard-shortcuts-hint="true"]')).toBeTruthy();

        // Typing Space inside search input must NOT reveal flashcard
        const fcSearch = host.querySelector('input[type="search"]');
        expect(fcSearch).toBeTruthy();
        await act(async () => {
          fcSearch.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        });
        expect(findButton('Reveal answer')).toBeTruthy();

        // ArrowRight moves to card 2; ArrowLeft returns to card 1
        expect(host.textContent).toContain('1 of ');
        await act(async () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        });
        expect(host.textContent).toContain('2 of ');
        await act(async () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
        });
        expect(host.textContent).toContain('1 of ');

        // Space reveals answer; '1' rates Study again
        await act(async () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
        });
        await waitUntil(() => Boolean(findButton('Study again')), 'Space revealed flashcard answer');
        await act(async () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }));
        });
        const needsReviewBox = host.querySelector('[data-test-prep-flashcard-needs-review="true"]');
        expect(needsReviewBox).toBeTruthy();
        expect(host.textContent).toContain('Needs review only (1)');
        await click(needsReviewBox);
        expect(host.textContent).toContain('1 of 1 matching cards');
        await click(needsReviewBox);

        // 8b. Inline two-click Reset pack checks confirmation (Cancel preserves, Confirm clears)
        const resetBtn = host.querySelector('[data-test-prep-reset-pack-checks="true"]');
        expect(resetBtn).toBeTruthy();
        await click(resetBtn);
        const cancelBtn = host.querySelector('[data-test-prep-cancel-reset-pack-checks="true"]');
        expect(cancelBtn).toBeTruthy();
        await click(cancelBtn);
        expect(host.querySelector('[data-test-prep-library-progress-bar="true"]').textContent).toContain('4 study checks done');
        await click(host.querySelector('[data-test-prep-reset-pack-checks="true"]'));
        await click(host.querySelector('[data-test-prep-confirm-reset-pack-checks="true"]'));
        expect(host.querySelector('[data-test-prep-library-progress-bar="true"]').textContent).toContain('0 study checks done');
        const persistedAfterReset = JSON.parse(localStorage.getItem('alloflow_test_prep_study_checklists_v1') || '{}');
        expect(Object.keys(persistedAfterReset[spec.packId] || {}).length).toBe(0);

        // 8c. Chapter Knowledge Checks "Needs review" filter + "Retry missed"
        await click(findButton('Chapters'));
        const openChapterBtn = Array.from(host.querySelectorAll('button')).find((b) => /Open chapter|Read chapter/i.test(b.textContent || ''));
        if (openChapterBtn) {
          await click(openChapterBtn);
          await waitUntil(() => Boolean(host.querySelector('[data-test-prep-chapter-check]')), 'Inline chapter knowledge check');
          const firstCheck = host.querySelector('[data-test-prep-chapter-check]');
          const checkId = firstCheck.getAttribute('data-test-prep-chapter-check');
          const checkMeta = (libData.chapters.flatMap((c) => c.knowledgeChecks || [])).find((k) => k.id === checkId);
          if (checkMeta && Array.isArray(checkMeta.choices)) {
            const wrongChoiceIndex = (checkMeta.answerIndex + 1) % checkMeta.choices.length;
            const wrongRadio = firstCheck.querySelector(`input[id="${checkId}-choice-${wrongChoiceIndex}"]`);
            await click(wrongRadio);
            const checkBtn = Array.from(firstCheck.querySelectorAll('button')).find((b) => b.textContent.includes('Check answer'));
            await click(checkBtn);
            const retryBtn = host.querySelector('[data-test-prep-retry-missed-checks="true"]');
            expect(retryBtn).toBeTruthy();
            expect(retryBtn.textContent).toContain('Retry missed (1)');
            const filterChecksBtn = host.querySelector('[data-test-prep-chapter-checks-filter="true"]');
            expect(filterChecksBtn).toBeTruthy();
            await click(filterChecksBtn);
            expect(filterChecksBtn.getAttribute('aria-pressed')).toBe('true');
            await click(retryBtn);
            expect(host.querySelector('[data-test-prep-retry-missed-checks="true"]')).toBeFalsy();
            await click(filterChecksBtn);
          }
          await click(findButton('Back to chapter catalog'));
        }

        // 8d. Search-all type-filter pills and deep-link jumps (Quick Reference + Study Route)
        await click(findButton('Search all'));
        const globalSearchInput = host.querySelector('input[aria-label="Search this pack\'s available content"]');
        expect(globalSearchInput).toBeTruthy();
        const setInputVal = (input, value) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        };
        await act(async () => { setInputVal(globalSearchInput, 'Domain 1 (10%)'); });
        const routeTypeBtn = host.querySelector('[data-test-prep-search-type-filter="unit-route"]');
        if (routeTypeBtn) {
          await click(routeTypeBtn);
          expect(routeTypeBtn.getAttribute('aria-pressed')).toBe('true');
        }
        const openRouteBtn = host.querySelector('[data-test-prep-search-open^="unit-route:"]');
        expect(openRouteBtn).toBeTruthy();
        await click(openRouteBtn);
        await waitUntil(() => host.querySelectorAll('[data-test-prep-unit-route]').length === 1, 'Deep-linked directly to single matching unit route');
        const clearRouteFilterBtn = host.querySelector('[data-test-prep-clear-study-plan-filter="true"]');
        expect(clearRouteFilterBtn).toBeTruthy();
        await click(clearRouteFilterBtn);
        expect(host.querySelectorAll('[data-test-prep-unit-route]').length).toBe(8);

        await click(findButton('Search all'));
        const qrSearchInput = host.querySelector('input[aria-label="Search this pack\'s available content"]');
        await act(async () => { setInputVal(qrSearchInput, libData.quickReference[0].title); });
        const qrTypeBtn = host.querySelector('[data-test-prep-search-type-filter="quick-reference"]');
        if (qrTypeBtn) await click(qrTypeBtn);
        const openQrBtn = host.querySelector('[data-test-prep-search-open^="quick-reference:"]');
        expect(openQrBtn).toBeTruthy();
        await click(openQrBtn);
        await waitUntil(() => host.querySelectorAll('[data-test-prep-quick-ref]').length === 1, 'Deep-linked directly to single matching Quick Reference card');
        const clearQrFilterBtn = host.querySelector('[data-test-prep-clear-quickref-filter="true"]');
        expect(clearQrFilterBtn).toBeTruthy();
        await click(clearQrFilterBtn);
        expect(host.querySelectorAll('[data-test-prep-quick-ref]').length).toBe(libData.quickReference.length);

        // 8e. Practice-to-Study cross-linking
        await click(findButton('Misconception playbooks'));
        await click(findButton('Practice this pattern'));
        await waitUntil(() => Boolean(host.querySelector('input[type="radio"]')), 'EPPP practice choice radio');
        await click(host.querySelector('input[type="radio"]'));
        await click(findButton('Check answer'));
        await waitUntil(() => Boolean(host.querySelector('[data-test-prep-item-study-links="true"]')), 'Post-answer study links bar');
        expect(host.querySelector('[data-test-prep-item-playbook-link]')).toBeTruthy();
        const qrJump = host.querySelector('[data-test-prep-item-quickref-link]');
        expect(qrJump).toBeTruthy();
        await click(qrJump);
        await waitUntil(() => Boolean(host.querySelector('[data-test-prep-quick-ref]')), 'Jumped to Quick Reference card');
      }
    }, 60_000);
  }

  it('renders the Progress tab triage card and routes Drill missed items, Quick Reference, Spaced review, and Open playbook live', async () => {
    const spec = REPRESENTATIVE_PACKS[0];
    const { packData, libData, stubEntry } = mountRealPack(spec);
    const missedIds = libData.misconceptionFamilies[0].itemIds.slice(0, 2);
    const missedItems = missedIds.map((id) => packData.items.find((it) => it.id === id)).filter(Boolean);
    expect(missedItems).toHaveLength(2);
    const weakDomainId = missedItems[0].domainId;
    const correctItem = packData.items.find((it) => it.domainId !== weakDomainId);
    expect(correctItem).toBeTruthy();

    const normalizedPack = Hub.normalizePack(packData);
    const identity = Hub.resolvePackContentIdentity(normalizedPack, stubEntry);
    const seededProgress = {
      attempts: [
        {
          id: 'smoke-triage-attempt-1',
          packId: spec.packId,
          packVersion: identity.packVersion,
          packContentFingerprint: identity.packContentFingerprint,
          completedAt: Date.now() - 60_000,
          correct: 1,
          total: 3,
          percent: 33,
          mode: 'standard',
          label: 'Diagnostic triage seed',
          itemIds: [missedItems[0].id, missedItems[1].id, correctItem.id],
          itemResults: {
            [missedItems[0].id]: { correct: false, selectedIndex: (missedItems[0].answerIndex + 1) % 4 },
            [missedItems[1].id]: { correct: false, selectedIndex: (missedItems[1].answerIndex + 1) % 4 },
            [correctItem.id]: { correct: true, selectedIndex: correctItem.answerIndex },
          },
          byDomain: {
            [weakDomainId]: { correct: 0, total: 2 },
            [correctItem.domainId]: { correct: 1, total: 1 },
          },
        },
      ],
    };
    localStorage.setItem('alloflow_test_prep_progress_v1', JSON.stringify(seededProgress));

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    await act(async () => {
      root.render(React.createElement(Component, {
        isOpen: true,
        onClose: () => {},
        internalQaMode: true,
        internalQaPackIds: [spec.packId],
      }));
    });
    await waitUntil(() => Boolean(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"]`)), 'EPPP pack card');
    await click(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"] button`));
    await waitUntil(() => Boolean(host.querySelector('select[aria-label="Domain focus domain"]')), 'Domain focus dropdown');
    const domainOpt = host.querySelector(`select[aria-label="Domain focus domain"] option[value="${weakDomainId}"]`);
    expect(domainOpt && domainOpt.textContent).toMatch(/— \d+% \(\d+\/\d+\)/);
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-tab="progress"]')), 'Progress tab button');
    await click(host.querySelector('[data-test-prep-tab="progress"]'));

    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-progress-triage="true"]')), 'Progress triage card');
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-triage-open-playbook]')), 'Progress triage playbook button');
    expect(host.querySelector(`[data-test-prep-progress-practice-domain="${weakDomainId}"]`)).toBeTruthy();

    const drillAllBtn = host.querySelector('[data-test-prep-drill-missed="all"]');
    expect(drillAllBtn).toBeTruthy();
    expect(drillAllBtn.textContent).toContain('Drill missed items (2)');
    expect(host.querySelector('[data-test-prep-triage-export-missed="true"]')).toBeTruthy();
    expect(host.querySelector(`[data-test-prep-drill-domain-missed="${weakDomainId}"]`)).toBeTruthy();

    // 1. Open playbook jump
    await click(host.querySelector('[data-test-prep-triage-open-playbook]'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-playbook]')), 'Jumped to Misconception Playbooks');

    // 2. Return to Progress -> Spaced review jump
    await click(host.querySelector('[data-test-prep-tab="progress"]'));
    await waitUntil(() => Boolean(host.querySelector(`[data-test-prep-triage-spaced="${weakDomainId}"]`)), 'Spaced review shortcut');
    await click(host.querySelector(`[data-test-prep-triage-spaced="${weakDomainId}"]`));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-spaced-stage]')), 'Jumped to Spaced Review');

    // 3. Return to Progress -> Quick Reference jump
    await click(host.querySelector('[data-test-prep-tab="progress"]'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-triage-quickref]')), 'Quick Reference shortcut');
    await click(host.querySelector('[data-test-prep-triage-quickref]'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-quick-ref]')), 'Jumped to Quick Reference');

    // 4. Return to Progress -> Drill missed items launches practice on missed IDs
    await click(host.querySelector('[data-test-prep-tab="progress"]'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-drill-missed="all"]')), 'Drill missed items button');
    await click(host.querySelector('[data-test-prep-drill-missed="all"]'));
    await waitUntil(() => Boolean(host.querySelector('input[type="radio"]')), 'Launched missed-item practice drill');
    expect(host.textContent).toContain('Missed-item review drill');
    expect(host.textContent).toContain('Question 1 of 2');

    // 5. Practice keyboard shortcuts (?, S scratchpad, Q reference aid, scratchpad isolation, 1-4 selection, F flag, Enter check & advance)
    expect(host.querySelector('[data-test-prep-shortcut-bar="true"]')).toBeFalsy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true, cancelable: true }));
    });
    const shortcutBar = host.querySelector('[data-test-prep-shortcut-bar="true"]');
    expect(shortcutBar).toBeTruthy();
    expect(shortcutBar.textContent).toContain('scratchpad');
    expect(shortcutBar.textContent).toContain('reference aid');

    // Press 's' -> opens scratchpad; verify keydown inside <textarea> does NOT trigger choice selection; press 's' on document -> closes it
    expect(host.querySelector('#test-prep-practice-scratchpad')).toBeFalsy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true }));
    });
    const pad = host.querySelector('#test-prep-scratchpad-input');
    expect(pad).toBeTruthy();
    await act(async () => {
      pad.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true }));
    });
    const radiosBefore = Array.from(host.querySelectorAll('input[type="radio"]'));
    expect(radiosBefore.some((r) => r.checked)).toBe(false);
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#test-prep-practice-scratchpad')).toBeFalsy();

    // Press 'q' -> opens in-practice reference aid drawer (with zero-AI Read reference button); press Escape -> closes reference drawer first, next Escape closes shortcuts bar, without closing Hub
    expect(host.querySelector('#test-prep-practice-reference-drawer')).toBeFalsy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#test-prep-practice-reference-drawer')).toBeTruthy();
    expect(host.querySelector('[data-test-prep-practice-ref-read="true"]')).toBeTruthy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('#test-prep-practice-reference-drawer')).toBeFalsy();
    expect(host.querySelector('[data-test-prep-shortcut-bar="true"]')).toBeTruthy();
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[data-test-prep-shortcut-bar="true"]')).toBeFalsy();
    expect(host.querySelector('[role="dialog"]')).toBeTruthy();

    // Press Shift+A -> strikes out option A; Clear strike-outs restores all struck-out options in one click
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', shiftKey: true, bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('button[aria-label="Restore option A"]')).toBeTruthy();
    const clearStrikeoutsBtn = host.querySelector('[data-test-prep-clear-strikeouts="true"]');
    expect(clearStrikeoutsBtn).toBeTruthy();
    await click(clearStrikeoutsBtn);
    expect(host.querySelector('button[aria-label="Strike out option A"]')).toBeTruthy();

    // Press ']' -> raises speech speed to 110%; '[' -> returns to 100%
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ']', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[data-test-prep-global-rate-reset="true"]').textContent).toBe('110%');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[data-test-prep-global-rate-reset="true"]').textContent).toBe('100%');

    // Press '2' on document -> selects option B (index 1)
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true }));
    });
    expect(host.querySelectorAll('input[type="radio"]')[1].checked).toBe(true);

    // Press 'f' -> toggles Save for review
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true, cancelable: true }));
    });
    expect(host.textContent).toContain('Remove from review');

    // Press Enter -> checks answer; press '2' -> marks Unsure confidence; press Enter again -> advances to Question 2 of 2
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    await waitUntil(() => Boolean(findButton('Next question')), 'Enter checked answer');
    expect(host.querySelector('[data-test-prep-session-tally="true"]')).toBeTruthy();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true }));
    });
    const unsureBtn = findButton('I was unsure');
    expect(unsureBtn && unsureBtn.getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    expect(host.textContent).toContain('Question 2 of 2');

    // Finish Question 2 -> Completion screen -> Missed-item review card + Retry missed button (when any missed)
    const q2Radios = Array.from(host.querySelectorAll('input[type="radio"]'));
    // Deliberately pick a wrong choice on Q2 so completion always has >= 1 miss
    const q2ChoiceTextWrong = missedItems[1].choices[(missedItems[1].answerIndex + 1) % 4];
    const q2WrongIdx = q2Radios.findIndex((r) => r.closest('label') && r.closest('label').textContent.includes(q2ChoiceTextWrong));
    await click(q2Radios[q2WrongIdx >= 0 ? q2WrongIdx : 0]);
    await click(findButton('Check answer'));
    await waitUntil(() => Boolean(findButton('Finish practice')), 'Finish practice button');
    await click(findButton('Finish practice'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-result-missed-review="true"]')), 'Completion missed-item review card');
    expect(host.querySelector('[data-test-prep-result-missed-review="true"]').textContent).toContain('Supported answer:');
    // Wave-7 zero-AI Completion Read summary & Save missed for review buttons
    const resultReadBtn = host.querySelector('[data-test-prep-result-read="true"]');
    expect(resultReadBtn).toBeTruthy();
    expect(host.querySelector('[data-test-prep-result-copy="true"]')).toBeTruthy();
    const saveMissedBtn = host.querySelector('[data-test-prep-save-session-missed="true"]');
    expect(saveMissedBtn).toBeTruthy();
    if (!saveMissedBtn.disabled) {
      await click(saveMissedBtn);
      expect(host.querySelector('[data-test-prep-save-session-missed="true"]').textContent).toContain('Missed saved for review');
    }
    expect(host.querySelector('[data-test-prep-export-session-missed="true"]')).toBeTruthy();
    const retryMissedBtn = host.querySelector('[data-test-prep-retry-session-missed="true"]');
    expect(retryMissedBtn).toBeTruthy();
    await click(retryMissedBtn);
    await waitUntil(() => host.textContent.includes('Missed-item retry'), 'Launched missed-item retry from completion screen');
    expect(host.textContent).toContain('Question 1 of');

    // Return to Practice Setup to verify Wave-11 Saved-question queue drawer & Custom Quiz presets + Wave-14 Quick 10-Q warm-up
    await click(findButton('Practice options'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-custom-quiz-preset="10"]')), 'Custom quiz 10 Qs preset');
    expect(host.querySelector('[data-test-prep-quick-warmup="true"]')).toBeTruthy();
    await click(host.querySelector('[data-test-prep-custom-quiz-preset="10"]'));
    expect(host.querySelector('input[aria-label="Custom quiz question count"]').value).toBe('10');
    expect(host.querySelector('[data-test-prep-saved-queue-drawer="true"]')).toBeTruthy();
    await click(host.querySelector('[data-test-prep-clear-saved-queue="true"]'));
    await click(host.querySelector('[data-test-prep-confirm-clear-saved="true"]'));
    expect(host.querySelector('[data-test-prep-saved-queue-drawer="true"]')).toBeFalsy();

    // Return to Progress -> Accuracy by domain -> one-click Practice launches Domain focus set
    await click(host.querySelector('[data-test-prep-tab="progress"]'));
    await waitUntil(() => Boolean(host.querySelector(`[data-test-prep-progress-practice-domain="${weakDomainId}"]`)), 'Accuracy by domain Practice button');
    // Wave-12 Recent practice Retry missed button appears for past attempt with misses
    expect(host.querySelector('[data-test-prep-recent-retry-missed]')).toBeTruthy();
    const skillPracticeBtn = host.querySelector('[data-test-prep-progress-practice-skill]');
    if (skillPracticeBtn) {
      await click(skillPracticeBtn);
      await waitUntil(() => host.textContent.includes('Targeted practice:'), 'Launched Targeted practice from Accuracy by skill table');
      await click(host.querySelector('[data-test-prep-tab="progress"]'));
      await waitUntil(() => Boolean(host.querySelector(`[data-test-prep-progress-practice-domain="${weakDomainId}"]`)), 'Returned to Progress after skill launch');
    }
    await click(host.querySelector(`[data-test-prep-progress-practice-domain="${weakDomainId}"]`));
    await waitUntil(() => host.textContent.includes('Domain focus:'), 'Launched Domain focus from Accuracy by domain table');
  }, 60_000);

  it('reads flashcards aloud via Read card button and R keyboard shortcut before and after reveal', async () => {
    const spec = REPRESENTATIVE_PACKS[0];
    const { libData } = mountRealPack(spec);
    const spoken = [];
    const spokenRates = [];
    const callTTS = async (text, _voice, rate) => {
      spoken.push(text);
      spokenRates.push(rate);
      return '';
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component, {
        isOpen: true,
        onClose: () => {},
        callTTS,
        internalQaMode: true,
        internalQaPackIds: [spec.packId],
      }));
    });
    await waitUntil(() => Boolean(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"]`)), 'EPPP pack card');
    await click(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"] button`));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-tab="library"]')), 'Learning library tab');
    await click(host.querySelector('[data-test-prep-tab="library"]'));
    await waitUntil(() => Boolean(findButton('Flashcards')), 'Flashcards mode button');
    await click(findButton('Flashcards'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-flashcard-read="true"]')), 'Read card button');

    const readBtn = host.querySelector('[data-test-prep-flashcard-read="true"]');
    expect(readBtn.textContent).toContain('Read card');
    // Wave-8 zero-AI Flashcard shuffle toggle switches to shuffled order and back to default
    const shuffleBtn = host.querySelector('[data-test-prep-flashcard-shuffle="true"]');
    expect(shuffleBtn).toBeTruthy();
    expect(shuffleBtn.getAttribute('aria-pressed')).toBe('false');
    await click(shuffleBtn);
    expect(host.querySelector('[data-test-prep-flashcard-shuffle="true"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('· shuffled');
    await click(host.querySelector('[data-test-prep-flashcard-shuffle="true"]'));
    expect(host.querySelector('[data-test-prep-flashcard-shuffle="true"]').getAttribute('aria-pressed')).toBe('false');
    // Wave-10 Flashcard keyboard shortcuts: 's' toggles shuffle, ']'/'[' adjust speed
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[data-test-prep-flashcard-shuffle="true"]').getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[data-test-prep-flashcard-shuffle="true"]').getAttribute('aria-pressed')).toBe('false');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ']', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[data-test-prep-global-rate-reset="true"]').textContent).toBe('110%');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('[data-test-prep-global-rate-reset="true"]').textContent).toBe('100%');
    await click(readBtn);
    await waitUntil(() => spoken.length >= 1, 'Read card TTS call');
    expect(spoken[0]).toMatch(/^Flashcard prompt\./);
    // Wave-16/19 Flashcard Add note, Export deck (.md), & Clear filters controls
    expect(host.querySelector('[data-test-prep-flashcard-note="true"]')).toBeTruthy();
    expect(host.querySelector('[data-test-prep-flashcards-export="true"]')).toBeTruthy();
    expect(host.querySelector('[data-test-prep-flashcard-shortcuts-hint="true"]').textContent).toContain('N note');
    const needsRevCb = host.querySelector('[data-test-prep-flashcard-needs-review="true"]');
    expect(needsRevCb).toBeTruthy();
    await click(needsRevCb);
    expect(host.querySelector('[data-test-prep-clear-flashcards-filter="true"]')).toBeTruthy();
    await click(host.querySelector('[data-test-prep-clear-flashcards-filter="true"]'));
    expect(host.querySelector('[data-test-prep-flashcard-needs-review="true"]').checked).toBe(false);

    // Reveal via Space, then press R to read the answer aloud
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    });
    await waitUntil(() => host.querySelector('[data-test-prep-flashcard-read="true"]').textContent.includes('Read answer'), 'Read answer label');
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true }));
    });
    await waitUntil(() => spoken.length >= 2, 'Read answer TTS call');
    expect(spoken[1]).toMatch(/^Flashcard answer\./);

    // Memory aids Read aid & Wave-16 Add note buttons
    await click(findButton('Memory aids'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-memory-aid-read]')), 'Memory aid read button');
    expect(host.querySelector('[data-test-prep-memory-aid-note]')).toBeTruthy();
    await click(host.querySelector('[data-test-prep-memory-aid-read]'));
    await waitUntil(() => spoken.length >= 3, 'Memory aid TTS call');
    expect(spoken[2]).toMatch(/^Memory aid\./);

    // Quick reference Read reference aloud & Wave-17 Export sheet (.md) buttons
    await click(findButton('Quick reference'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-quickref-read]')), 'Quick reference read button');
    expect(host.querySelector('[data-test-prep-quickref-export="true"]')).toBeTruthy();
    await click(host.querySelector('[data-test-prep-quickref-read]'));
    await waitUntil(() => spoken.length >= 4, 'Quick reference TTS call');
    expect(spoken[3].length).toBeGreaterThan(20);

    // Misconception playbooks Read playbook, Export playbooks (.md), & Add note buttons
    await click(findButton('Misconception playbooks'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-playbook-read]')), 'Playbook read button');
    expect(host.querySelector('[data-test-prep-playbooks-export="true"]')).toBeTruthy();
    expect(host.querySelector('[data-test-prep-playbook-note]')).toBeTruthy();
    await click(host.querySelector('[data-test-prep-playbook-read]'));
    await waitUntil(() => spoken.length >= 5, 'Playbook TTS call');
    expect(spoken[4]).toMatch(/^Misconception playbook\./);

    // Written-response workshops Read prompt button + Wave-13 auto-persisted draft & export/clear controls
    await click(findButton(libData.workshopLabel || 'Written-response workshops'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-workshop-read]')), 'Workshop read button');
    await click(host.querySelector('[data-test-prep-workshop-read]'));
    await waitUntil(() => spoken.length >= 6, 'Workshop TTS call');
    expect(spoken[5]).toMatch(/^Written-response workshop\./);
    const wsTextarea = host.querySelector('textarea[id^="workshop-draft-"]');
    expect(wsTextarea).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(wsTextarea, 'Persisted draft outline for clinical review.');
      wsTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(localStorage.getItem('alloflow_test_prep_workshop_drafts_v1')).toContain('Persisted draft outline');
    expect(host.querySelector('[data-test-prep-workshop-export-draft]').disabled).toBe(false);
    await click(host.querySelector('[data-test-prep-workshop-clear-draft]'));
    expect(wsTextarea.value).toBe('');

    // Glossary A-Z quick-jump letter strip & Add note button
    const glossaryBtn = findButton('Glossary');
    if (glossaryBtn) {
      await click(glossaryBtn);
      await waitUntil(() => Boolean(host.querySelector('[data-test-prep-glossary-letter="all"]')), 'Glossary A-Z letter bar');
      const letterBtns = Array.from(host.querySelectorAll('[data-test-prep-glossary-letter]')).filter((b) => b.getAttribute('data-test-prep-glossary-letter') !== 'all');
      if (letterBtns.length > 0) {
        await click(letterBtns[0]);
        expect(letterBtns[0].getAttribute('aria-pressed')).toBe('true');
        await click(host.querySelector('[data-test-prep-glossary-letter="all"]'));
      }
      expect(host.querySelector('[data-test-prep-glossary-note]')).toBeTruthy();
      expect(host.querySelector('[data-test-prep-glossary-export="true"]')).toBeTruthy();
    }

    // Practice toolbar Explanations mode cycles full -> core -> off -> full and persists
    await click(host.querySelector('[data-test-prep-tab="practice"]'));
    await waitUntil(() => Boolean(findButton('Start')), 'Practice start button');
    await click(findButton('Start'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-explanations-mode]')), 'Explanations mode toggle');
    const expBtn = () => host.querySelector('[data-test-prep-explanations-mode]');
    expect(expBtn().getAttribute('data-test-prep-explanations-mode')).toBe('full');
    await click(expBtn());
    expect(expBtn().getAttribute('data-test-prep-explanations-mode')).toBe('core');
    expect(localStorage.getItem('alloflow_test_prep_hands_free_explanations_v1')).toBe('core');
    await click(expBtn());
    expect(expBtn().getAttribute('data-test-prep-explanations-mode')).toBe('off');
    expect(localStorage.getItem('alloflow_test_prep_hands_free_explanations_v1')).toBe('off');
    await click(expBtn());
    expect(expBtn().getAttribute('data-test-prep-explanations-mode')).toBe('full');
    expect(localStorage.getItem('alloflow_test_prep_hands_free_explanations_v1')).toBe('on');

    // Post-check Read explanation button & E keyboard shortcut (zero-AI)
    const firstRadio = host.querySelector('input[type="radio"]');
    await click(firstRadio);
    await click(findButton('Check answer'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-read-explanation="true"]')), 'Post-check Read explanation button');
    const spokenBeforeExp = spoken.length;
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', bubbles: true, cancelable: true }));
    });
    await waitUntil(() => spoken.length > spokenBeforeExp, 'E shortcut read explanation aloud');
    expect(spoken[spoken.length - 1]).not.toMatch(/clarification/i);

    // Wave-18 Practice keyboard shortcut 'n' opens Notes & Highlights attached to the current question
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true }));
    });
    await waitUntil(() => Boolean(host.querySelector('textarea[aria-label="Study annotation text"]')), 'Notes textarea opened via N shortcut');
    const notesArea = host.querySelector('textarea[aria-label="Study annotation text"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(notesArea, 'Thiamine deficiency note for Wernicke-Korsakoff review');
      notesArea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      notesArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true }));
    });
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-annotation-card]')), 'Saved note card via Ctrl+Enter');
    expect(host.querySelector('[data-test-prep-notes-export="true"]')).toBeTruthy();
    await click(host.querySelector('[data-test-prep-notes-kind-filter="highlight"]'));
    expect(host.querySelectorAll('[data-test-prep-annotation-card]').length).toBe(0);
    await click(host.querySelector('[data-test-prep-notes-clear-filter="true"]'));
    expect(host.querySelectorAll('[data-test-prep-annotation-card]').length).toBe(1);
    const spokenBeforeNote = spoken.length;
    await click(host.querySelector('[data-test-prep-annotation-read]'));
    await waitUntil(() => spoken.length > spokenBeforeNote, 'Read note aloud TTS call');
    expect(spoken[spoken.length - 1]).toContain('Thiamine deficiency note');

    // Chapters: Knowledge-check Read check (before checking) & Read explanation (after checking) remain enabled & zero-AI
    await click(host.querySelector('[data-test-prep-tab="library"]'));
    await waitUntil(() => Boolean(findButton('Chapters')), 'Chapters mode button');
    await click(findButton('Chapters'));
    await waitUntil(() => Boolean(Array.from(host.querySelectorAll('button')).find((b) => /Open chapter|Read chapter/i.test(b.textContent || ''))), 'Open chapter button');
    await click(Array.from(host.querySelectorAll('button')).find((b) => /Open chapter|Read chapter/i.test(b.textContent || '')));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-chapter-check-read]')), 'Chapter check read button');
    // Wave-18 Chapter Export study sheet & Mark all sections complete
    expect(host.querySelector('[data-test-prep-chapter-export="true"]')).toBeTruthy();
    const markAllBtn = host.querySelector('[data-test-prep-chapter-mark-all="true"]');
    expect(markAllBtn).toBeTruthy();
    await click(markAllBtn);
    expect(host.querySelector('[data-test-prep-chapter-mark-all="true"]')).toBeFalsy();
    // Wave-10 per-section Read section button speaks individual lesson without AI
    const sectionReadBtn = host.querySelector('[data-test-prep-chapter-section-read]');
    expect(sectionReadBtn).toBeTruthy();
    const spokenBeforeSec = spoken.length;
    await click(sectionReadBtn);
    await waitUntil(() => spoken.length > spokenBeforeSec, 'Chapter section read-aloud TTS');
    expect(spoken[spoken.length - 1]).toMatch(/^Lesson 1\./);
    const checkReadBtn = host.querySelector('[data-test-prep-chapter-check-read]');
    expect(checkReadBtn.textContent).toContain('Read check');
    const spokenBeforeCheck = spoken.length;
    await click(checkReadBtn);
    await waitUntil(() => spoken.length > spokenBeforeCheck, 'Chapter check read-aloud TTS');
    expect(spoken[spoken.length - 1]).toMatch(/^Knowledge check\./);
    const checkCard = checkReadBtn.closest('[data-test-prep-chapter-check]');
    await click(checkCard.querySelector('input[type="radio"]'));
    await click(Array.from(checkCard.querySelectorAll('button')).find((b) => b.textContent.includes('Check answer')));
    await waitUntil(() => checkCard.querySelector('[data-test-prep-chapter-check-read]').textContent.includes('Read explanation'), 'Post-check Read explanation label');
    const postCheckBtn = checkCard.querySelector('[data-test-prep-chapter-check-read]');
    expect(postCheckBtn.disabled).toBe(false);
    const spokenBeforeCheckExp = spoken.length;
    await click(postCheckBtn);
    await waitUntil(() => spoken.length > spokenBeforeCheckExp, 'Chapter check post-reveal explanation TTS');
    expect(spoken[spoken.length - 1]).toMatch(/^(?:Correct\.|Review the reasoning\.)/);

    // Chapter Reader bottom Next chapter footer navigates seamlessly to Chapter 2
    const nextChFooterBtn = host.querySelector('[data-test-prep-chapter-footer-next="true"]');
    expect(nextChFooterBtn && !nextChFooterBtn.disabled).toBe(true);
    const ch1Title = host.querySelector('#native-chapter-title').textContent;
    await click(nextChFooterBtn);
    await waitUntil(() => host.querySelector('#native-chapter-title').textContent !== ch1Title, 'Navigated to next chapter via footer');

    // Study sessions: Read session button speaks title, duration, and steps without AI
    await click(findButton('Study sessions'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-study-session-read]')), 'Study session read button');
    // Global header read-aloud speed control persists rate & applies to read-aloud calls
    const globalFaster = host.querySelector('[data-test-prep-global-rate-faster="true"]');
    const globalReset = host.querySelector('[data-test-prep-global-rate-reset="true"]');
    expect(globalFaster && globalReset).toBeTruthy();
    expect(globalReset.textContent).toBe('100%');
    await click(globalFaster);
    expect(globalReset.textContent).toBe('110%');
    expect(localStorage.getItem('alloflow_test_prep_hands_free_rate_v1')).toBe('1.1');
    const spokenBeforeSess = spoken.length;
    await click(host.querySelector('[data-test-prep-study-session-read]'));
    await waitUntil(() => spoken.length > spokenBeforeSess, 'Study session read-aloud TTS');
    expect(spoken[spoken.length - 1]).toMatch(/^Study session\./);
    expect(spokenRates[spokenRates.length - 1]).toBe(1.1);
    await click(globalReset);
    expect(globalReset.textContent).toBe('100%');
    expect(localStorage.getItem('alloflow_test_prep_hands_free_rate_v1')).toBe('1');

    // Larger text preference persists in localStorage cleanly
    const textSizeBtn = findButton('Larger text');
    expect(textSizeBtn).toBeTruthy();
    await click(textSizeBtn);
    expect(localStorage.getItem('alloflow_test_prep_large_text_v1')).toBe('true');
    await click(findButton('Standard text'));
    expect(localStorage.getItem('alloflow_test_prep_large_text_v1')).toBe('false');

    // Progress tab: zero-AI Read summary button speaks progress without claiming official scores
    await click(host.querySelector('[data-test-prep-tab="progress"]'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-progress-read="true"]')), 'Progress Read summary button');
    expect(host.querySelector('[data-test-prep-progress-copy="true"]')).toBeTruthy();
    const spokenBeforeProgress = spoken.length;
    await click(host.querySelector('[data-test-prep-progress-read="true"]'));
    await waitUntil(() => spoken.length > spokenBeforeProgress, 'Progress summary read-aloud TTS');
    expect(spoken[spoken.length - 1]).toMatch(/^Practice progress for /);
    expect(spoken[spoken.length - 1]).not.toMatch(/\bAI\b|clarification/i);

    // Explore tab: zero-AI exam-pack search filter narrows cards and Clear filter restores all packs
    await click(host.querySelector('[data-test-prep-tab="explore"]'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-catalog-search="true"]')), 'Explore pack search input');
    const allPackCardsCount = host.querySelectorAll('[data-test-prep-pack-id]').length;
    expect(allPackCardsCount).toBeGreaterThan(3);
    const catalogInput = host.querySelector('[data-test-prep-catalog-search="true"]');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(catalogInput, 'EPPP');
      catalogInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const filteredCardsCount = host.querySelectorAll('[data-test-prep-pack-id]').length;
    expect(filteredCardsCount).toBeGreaterThanOrEqual(1);
    expect(filteredCardsCount).toBeLessThan(allPackCardsCount);
    await click(host.querySelector('[data-test-prep-catalog-clear="true"]'));
    expect(host.querySelectorAll('[data-test-prep-pack-id]').length).toBe(allPackCardsCount);
  }, 60_000);

  it('runs zero-AI hands-free flashcards (flip, pre-reveal guard, rate, next card, stop) over browser speech', async () => {
    const spec = REPRESENTATIVE_PACKS[0];
    mountRealPack(spec);
    const spokenUtterances = [];
    const recognitionInstances = [];
    const origSynth = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    const origUtt = Object.getOwnPropertyDescriptor(window, 'SpeechSynthesisUtterance');
    const origRec = Object.getOwnPropertyDescriptor(window, 'SpeechRecognition');
    const origAlloVoice = Object.getOwnPropertyDescriptor(window, 'AlloFlowVoice');
    Object.defineProperty(window, 'AlloFlowVoice', {
      configurable: true,
      writable: true,
      value: {
        acquireVoiceSession: () => ({ release: () => {}, update: () => {} }),
        getActiveVoiceSessionStatus: () => null,
      },
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        cancel: () => {},
        speak: (u) => {
          spokenUtterances.push(u);
          if (u.onstart) u.onstart();
        },
      },
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: function MockUtterance(text) {
        this.text = text;
        this.lang = '';
        this.rate = 1;
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
      },
    });
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      writable: true,
      value: function MockRecognition() {
        this.start = () => { if (this.onstart) this.onstart(); };
        this.abort = () => {};
        this.stop = () => {};
        recognitionInstances.push(this);
      },
    });

    const finishSpeechAndWaitMic = async (prevRecCount) => {
      await waitUntil(() => spokenUtterances.length > 0, 'utterance spoken');
      const u = spokenUtterances[spokenUtterances.length - 1];
      await act(async () => {
        if (u.onend) u.onend();
        await new Promise((r) => setTimeout(r, 150));
      });
      await waitUntil(() => recognitionInstances.length > prevRecCount, 'mic restarted');
      return u.text;
    };
    const say = async (transcript) => {
      const prevRec = recognitionInstances.length;
      const prevUtt = spokenUtterances.length;
      const rec = recognitionInstances[recognitionInstances.length - 1];
      await act(async () => {
        rec.onresult({ results: [[{ transcript, confidence: 0.95 }]] });
        await new Promise((r) => setTimeout(r, 40));
      });
      await waitUntil(() => spokenUtterances.length > prevUtt, 'speech after ' + transcript);
      return finishSpeechAndWaitMic(prevRec);
    };

    try {
      host = document.createElement('div');
      document.body.appendChild(host);
      root = ReactDOMClient.createRoot(host);
      await act(async () => {
        root.render(React.createElement(Component, {
          isOpen: true,
          onClose: () => {},
          callTTS: null,
          callGemini: null,
          internalQaMode: true,
          internalQaPackIds: [spec.packId],
        }));
      });
      await waitUntil(() => Boolean(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"]`)), 'EPPP pack card');
      await click(host.querySelector(`[data-test-prep-pack-id="${spec.packId}"] button`));
      await waitUntil(() => Boolean(host.querySelector('[data-test-prep-tab="library"]')), 'Learning library tab');
      await click(host.querySelector('[data-test-prep-tab="library"]'));
      await waitUntil(() => Boolean(findButton('Flashcards')), 'Flashcards tab');
      await click(findButton('Flashcards'));
      await waitUntil(() => Boolean(host.querySelector('[data-test-prep-flashcard-hands-free="true"]')), 'Hands-free flashcards button');

      await click(host.querySelector('[data-test-prep-flashcard-hands-free="true"]'));
      const firstPrompt = await finishSpeechAndWaitMic(0);
      expect(firstPrompt).toMatch(/^Flashcard prompt\./);
      const panel = host.querySelector('[data-test-prep-flashcard-hands-free-panel="true"]');
      expect(panel).toBeTruthy();
      expect(panel.textContent).not.toMatch(/\bAI\b|clarification/i);

      // Zero-AI 1-click speed controls (+ -> 110%, reset -> 100%) inside Flashcards Hands-Free panel
      await click(panel.querySelector('[data-test-prep-flashcard-rate-faster="true"]'));
      expect(panel.textContent).toContain('110% speed');
      await click(panel.querySelector('[data-test-prep-flashcard-rate-reset="true"]'));
      expect(panel.textContent).toContain('100% speed');

      const preFlipGuard = await say('know it');
      expect(preFlipGuard).toContain('Say flip to hear the answer first');

      const flippedAnswer = await say('flip');
      expect(flippedAnswer).toMatch(/^Flashcard answer\./);

      const nextPrompt = await say('know it');
      expect(nextPrompt).toMatch(/^Flashcard prompt\./);
      expect(host.textContent).toContain('1 marked Know');

      // Wave-17 Hands-Free Flashcards voice "status", "shuffle", and "default order"
      const statusSpoken = await say('status');
      expect(statusSpoken).toMatch(/^Card \d+ of \d+/);
      expect(statusSpoken).toContain('1 marked know');
      const shuffledPrompt = await say('shuffle');
      expect(shuffledPrompt).toMatch(/^Flashcard prompt\./);
      expect(host.textContent).toContain('· shuffled');
      const unshuffledPrompt = await say('default order');
      expect(unshuffledPrompt).toMatch(/^Flashcard prompt\./);
      expect(host.textContent).not.toContain('· shuffled');

      const rec = recognitionInstances[recognitionInstances.length - 1];
      await act(async () => {
        rec.onresult({ results: [[{ transcript: 'stop hands free', confidence: 0.95 }]] });
        await new Promise((r) => setTimeout(r, 40));
      });
      expect(host.querySelector('[data-test-prep-flashcard-hands-free-panel="true"]')).toBeNull();

      // Switch to Practice in zero-AI hands-free mode and verify voice "read reference" / "hide reference"
      await click(host.querySelector('[data-test-prep-tab="practice"]'));
      await waitUntil(() => Boolean(findButton('Start')), 'Practice start button');
      await click(findButton('Start'));
      await waitUntil(() => Boolean(findButton('Hands-free mode')), 'Practice hands-free button');
      const prevRecBeforePractice = recognitionInstances.length;
      const prevUttBeforePractice = spokenUtterances.length;
      await click(findButton('Hands-free mode'));
      await waitUntil(() => spokenUtterances.length > prevUttBeforePractice, 'Practice hands-free opening speech');
      await finishSpeechAndWaitMic(prevRecBeforePractice);

      expect(host.querySelector('#test-prep-practice-reference-drawer')).toBeFalsy();
      const refSpoken = await say('read reference');
      expect(refSpoken).toMatch(/^Reference aid\./);
      expect(refSpoken).not.toMatch(/\bAI\b|clarification/i);
      expect(host.querySelector('#test-prep-practice-reference-drawer')).toBeTruthy();

      const hideSpoken = await say('hide reference');
      expect(hideSpoken).toContain('Reference aid hidden.');
      expect(host.querySelector('#test-prep-practice-reference-drawer')).toBeFalsy();

      const rec2 = recognitionInstances[recognitionInstances.length - 1];
      await act(async () => {
        rec2.onresult({ results: [[{ transcript: 'stop hands free', confidence: 0.95 }]] });
        await new Promise((r) => setTimeout(r, 40));
      });
    } finally {
      if (origSynth) Object.defineProperty(window, 'speechSynthesis', origSynth); else delete window.speechSynthesis;
      if (origUtt) Object.defineProperty(window, 'SpeechSynthesisUtterance', origUtt); else delete window.SpeechSynthesisUtterance;
      if (origRec) Object.defineProperty(window, 'SpeechRecognition', origRec); else delete window.SpeechRecognition;
      if (origAlloVoice) Object.defineProperty(window, 'AlloFlowVoice', origAlloVoice); else delete window.AlloFlowVoice;
    }
  }, 60_000);
});
