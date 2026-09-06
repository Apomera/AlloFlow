import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

// Mounts the Hub against a bundled fixture whose learning library carries one
// record of every study-plan layer, then walks the four new library modes.
// Uses the same manifest/library fetch shape as the learning-library gate test.
const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const baseManifest = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/pack_manifest.json'), 'utf8'));
let React, ReactDOMClient, act, Hub, Component, root, host, originalFetch;

const jsonBytes = (payload) => Buffer.from(JSON.stringify(payload), 'utf8');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
function responseBytes(bytes, status = 200) {
  const payload = Buffer.from(bytes);
  return { ok: status < 300, status, json: async () => JSON.parse(payload.toString('utf8')), arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) };
}

function makeFixture() {
  const basePack = structuredClone(Hub.listPacks().find((pack) => pack.id === 'workplace-safety-foundations-demo'));
  const id = 'study-plan-render-fixture';
  const libraryUrl = './test_prep/study_plan_render_fixture.json';
  const pack = { ...basePack, id, title: 'Study Plan Fixture', shortTitle: 'Plan fixture', version: '1.0.0', visibility: 'public', learningLibraryUrl: libraryUrl,
    items: basePack.items.map((item, index) => ({ ...item, id: id + '-item-' + (index + 1) })) };
  const itemIds = pack.items.map((item) => item.id);
  const chapterId = id + '-chapter';
  const sectionId = id + '-section';
  const library = {
    schemaVersion: 1, packId: id, version: pack.version, visibility: pack.visibility, title: 'Study Plan Fixture Library', description: 'Fixture.',
    summary: { chapters: 1, sections: 1, knowledgeChecks: 0, flashcards: 0, memoryAids: 0, diagrams: 0, glossaryTerms: 0, sourceReviewedChapters: 1, sourceReviewedFlashcards: 0, sourceReviewedMemoryAids: 0 },
    chapters: [{ id: chapterId, title: 'Fixture Chapter', domain: pack.domains[0].label, summary: 'Chapter.', reviewStatus: 'source-reviewed-editorial-pass', objectives: [], knowledgeChecks: [],
      sections: [{ id: sectionId, heading: 'Fixture lesson', reviewStatus: 'source-reviewed-editorial-pass', contentBlocks: [{ type: 'paragraph', text: 'Lesson body text.' }] }] }],
    skills: [], flashcards: [], memoryAids: [], glossary: [], nativeDiagrams: [], diagrams: [],
    topicDiagnosticRoutes: [{ id: id + '-route-1', topicId: '1.1', topicLabel: '1.1 Hazard vectors', unitLabel: 'Unit 1: Hazards', chapterId, sectionIds: [sectionId], itemIds,
      diagnosticSets: [{ id: id + '-route-1-entry', label: 'Entry check', purpose: 'Establish a starting point.', sectionId, itemIds: itemIds.slice(0, 2) }, { id: id + '-route-1-transfer', label: 'Transfer set', purpose: 'Changed context.', sectionId, itemIds: itemIds.slice(2) }],
      masterySignals: [{ id: 'model', label: 'Name the hazard model first.' }], nextStep: 'Review the model, then retry a targeted set.', remediationPlaybookId: id + '-playbook-1' }],
    unitReviewRoutes: [{ id: id + '-unit-1', unitLabel: 'Unit 1: Hazards', chapterId, topicDiagnosticRouteIds: [id + '-route-1'], itemIds, mixedPracticeSet: { id: id + '-mixed', itemIds: itemIds.slice(0, 3) } }],
    reviewLadders: [{ id: id + '-ladder-1', order: 1, label: 'Foundation core', purpose: 'Build routines.', focus: ['units', 'signs'], itemIds }],
    practiceForms: [{ id: id + '-form-1', title: 'Alternate internal form 01', formType: 'internal-selected-response-form', itemIds, topicIds: ['1.1'], unitIds: ['u1'] }],
    misconceptionFamilies: [{ id: 'sign-error', label: 'Sign and direction', description: 'Drops the sign.', itemIds: itemIds.slice(0, 2), occurrenceCount: 12 }],
    misconceptionRemediationPlaybooks: [{ id: id + '-playbook-1', familyId: 'sign-error', familyLabel: 'Sign and direction', title: 'Fix the sign before you add', recognitionCue: 'Magnitudes added without direction.', repairQuestion: 'Which direction is positive here?',
      stages: [{ order: 1, id: 'recognize', label: 'Recognize', instruction: 'Name the pattern.', requiredOutput: 'One sentence.' }, { order: 2, id: 'repair', label: 'Repair', instruction: 'Restate with signs.' }] }],
    studySessionPlans: [{ id: id + '-session-1', sessionType: 'unit-launch', title: 'Hazards guided session', purpose: 'One bounded block.', durationMinutes: 30, chapterId, itemIds: itemIds.slice(0, 3),
      steps: [{ order: 1, id: 'orient', label: 'Orient', durationMinutes: 5, action: 'Read the takeaways.' }, { order: 2, id: 'practice', label: 'Practice', durationMinutes: 25, action: 'Run the entry set.' }] }],
    spacedReviewPlans: [{ id: id + '-spaced-1', topicId: '1.1', topicLabel: '1.1 Hazard vectors', diagnosticRouteId: id + '-route-1',
      cadenceStages: [{ id: 'same-day-retry', intervalHours: 0, action: 'retry-earliest-unmet-routine' }, { id: 'next-day-recall', intervalHours: 24, action: 'recall-without-cue' }, { id: 'three-day-transfer', intervalHours: 72, action: 'transfer-set' }, { id: 'seven-day-mixed-practice', intervalHours: 168, action: 'mixed-practice' }] }],
    sourceCatalog: [{ id: id + '-source-1', title: 'Public Safety Framework', organization: 'Fixture Board', url: 'https://example.com/framework', credibility: 'Public framework used for blueprint verification.', sourceType: 'official-blueprint', reviewedAt: '2026-09-01' }],
  };
  const libraryBytes = jsonBytes(library);
  const entry = { id, loadMode: 'bundled', visibility: 'public', portfolioCategories: ['k12-college-readiness'], title: pack.title, shortTitle: pack.shortTitle, description: pack.description, disclaimer: pack.disclaimer, credentialOwner: '', status: 'ready', version: pack.version, blueprintLabel: '', blueprintEffective: '', officialBlueprintUrl: '', itemCount: pack.items.length, domainCount: pack.domains.length, itemSchemaVersion: pack.itemSchemaVersion, responseTypes: ['single-choice'], examModes: ['practice'], packUrl: '', learningLibraryUrl: libraryUrl, learningLibraryQaUrl: '', nativeQaUrl: '', sha256: '', learningLibrarySha256: sha256(libraryBytes), learningLibraryQaSha256: '', nativeQaSha256: '' };
  Hub.registerPack(pack);
  return { pack, libraryBytes, entry, manifest: { schemaVersion: 1, catalogVersion: 'study-plan-render', categories: baseManifest.categories, entries: [entry] } };
}

const findButton = (text) => Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
async function waitUntil(predicate, message, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) await act(async () => { await new Promise((done) => setTimeout(done, 20)); });
  expect(predicate(), message).toBe(true);
}
async function click(button) { expect(button).toBeTruthy(); await act(async () => { button.click(); }); }

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

describe('Test Prep study-plan library modes', () => {
  it('renders topic routes, playbooks, sessions, and sources from the library and launches a set', async () => {
    const fixture = makeFixture();
    global.fetch = window.fetch = vi.fn(async (url) => {
      if (String(url).includes('pack_manifest.json')) return responseBytes(jsonBytes(fixture.manifest));
      if (String(url).includes('study_plan_render_fixture.json')) return responseBytes(fixture.libraryBytes);
      return responseBytes(jsonBytes({}), 404);
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component, { isOpen: true, onClose: () => {} })); });
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-pack-id="' + fixture.pack.id + '"]')), 'Expected the fixture card.');
    await click(host.querySelector('[data-test-prep-pack-id="' + fixture.pack.id + '"] button'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-tab="library"]')), 'Expected the library tab.');
    await click(host.querySelector('[data-test-prep-tab="library"]'));
    await waitUntil(() => Boolean(findButton('Study plan')), 'Expected the study-plan mode button.');

    expect(host.textContent).toContain('Topic routes');
    await click(findButton('Study plan'));
    expect(host.textContent).toContain('1.1 Hazard vectors');
    expect(host.textContent).toContain('Entry check');
    expect(host.textContent).toContain('Name the hazard model first.');
    expect(host.textContent).toContain('Unit 1: Hazards');
    expect(host.textContent).toContain('Foundation core');
    expect(host.textContent).toContain('Alternate internal form 01');
    // Resting state with no history: route reads not started, first set is the pointer.
    expect(host.querySelector('[data-test-prep-study-route-status="not-started"]')).toBeTruthy();
    expect(host.textContent).toContain('0 of 5 linked questions practiced');
    expect(host.querySelector('[data-test-prep-study-set-pointer="start"]').textContent).toContain('Entry check');
    expect(host.querySelector('[data-test-prep-study-set-pointer="start"]').textContent).toContain('Start here');

    await click(findButton('Read the lesson first'));
    await waitUntil(() => host.textContent.includes('Fixture lesson'), 'Expected the linked chapter to open.');

    await click(findButton('Study plan'));
    await click(findButton('Open remediation playbook'));
    expect(host.textContent).toContain('Fix the sign before you add');
    expect(host.textContent).toContain('Which direction is positive here?');
    expect(host.textContent).toContain('appears 12 times');

    await click(findButton('Study sessions'));
    expect(host.textContent).toContain('Hazards guided session');
    expect(host.textContent).toContain('Orient');
    expect(host.textContent).toContain('Spaced-review cadence by topic (1)');
    expect(host.textContent).toContain('After 7 days');

    await click(findButton('Sources'));
    expect(host.textContent).toContain('Public Safety Framework');
    const link = host.querySelector('a[href="https://example.com/framework"]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('rel')).toContain('noopener');

    await click(findButton('Study plan'));
    await click(findButton('Start set'));
    await waitUntil(() => host.textContent.includes('1.1 Hazard vectors · Entry check'), 'Expected the entry set to start as a practice run.');
  }, 60_000);
});
