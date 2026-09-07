import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

// Written-response workshops were authored in four shapes across the AP packs,
// and the Hub's view mapped over the Government/Psychology shape's lists without
// guards, so opening the view in Calculus, Physics 1, Statistics, or U.S. History
// threw. `normalizeWorkshop` folds every shape into one record; these tests pin
// that against the real shipped files and walk the view with a Physics-shaped
// record in the DOM.
const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const baseManifest = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep/pack_manifest.json'), 'utf8'));
const readLibrary = (name) => JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', name), 'utf8'));
let React, ReactDOMClient, act, Hub, Component, root, host, originalFetch;
const SLOW = 60_000;

const PHYSICS_SHAPED = {
  id: 'fixture-physics-workshop', title: 'Kinematics model-and-evidence brief', workshopType: 'original-constructed-response-workshop',
  scenario: 'A cart travels along a marked track while a sensor records position.', prompt: 'Construct a short evidence-backed model for the cart.', estimatedMinutes: 20,
  parts: [{ id: 'a', task: 'Define the positive direction and translate the record.', responseType: 'representation', lookFor: 'A stated axis and a correct slope.', points: 2, order: 1 },
    { id: 'b', task: 'Predict one later position and show the units.', responseType: 'mathematical-routine', lookFor: 'A named relationship with substituted quantities.', points: 2, order: 2 }],
  scoringGuide: [{ criterion: 'Model boundary', evidence: 'Coordinate convention and interval are explicit.', points: 2 }],
  selfCheck: ['Did I state the axis before assigning signs?'], commonPitfalls: ['Treating a positive position as proof of positive velocity.'],
  topicId: '1.4', reviewStatus: 'internal-editorial-draft', references: ['https://example.com/ced'],
};
const CALC_SHAPED = { id: 'c1', title: 'Limits at a join', responseType: 'constructed-response-planning-workshop', scenario: 'A piecewise function is described.', parts: [{ id: 'A', prompt: 'Determine a two-sided limit at the join.' }], responsePlanning: ['Identify givens.', 'Name a valid theorem.'], selfCheck: ['Every quantity is addressed.'], calculatorUse: 'calculator-permitted-planning', references: [] };
const STATS_SHAPED = { id: 's1', type: 'unscored-planning-workshop', title: 'Study design planning workshop', prompt: 'Plan a sampling study.', selfCheck: ['Name the target population.', 'Explain how randomization enters.'], scoreMeaning: 'No score is produced.', references: [] };
const USH_SHAPED = { id: 'u1', taskType: 'SAQ-style planning workshop', title: 'Source, context, connection', prompt: 'A synthetic note describes a dispute.', directions: 'Draft a planning response.', stimulus: 'An original classroom scenario.', selfCheck: ['Names a precise context.'], references: [] };

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
  if (!Hub || typeof Hub.normalizeWorkshop !== 'function') throw new Error('normalizeWorkshop did not register');
}, 30_000);

describe('workshop normalizer', () => {

  it('folds the Physics shape: parts become task parts, lookFor becomes a planning frame, the scoring guide becomes criteria', () => {
    const w = Hub.normalizeWorkshop(PHYSICS_SHAPED);
    expect(w.taskType).toBe('Original constructed response workshop');
    expect(w.stimulus).toMatch(/cart travels/);
    expect(w.taskParts).toEqual(['Define the positive direction and translate the record.', 'Predict one later position and show the units.']);
    expect(w.planningFrame).toEqual([{ label: 'Representation', guidance: 'A stated axis and a correct slope.' }, { label: 'Mathematical routine', guidance: 'A named relationship with substituted quantities.' }]);
    expect(w.successCriteria).toEqual(['Model boundary: Coordinate convention and interval are explicit.']);
    expect(w.selfCheck).toEqual(['Did I state the axis before assigning signs?']);
    expect(w.commonPitfalls).toHaveLength(1);
    expect(w.topicIds).toEqual(['1.4']);
    expect(w.estimatedMinutes).toBe(20);
    expect(w.sampleOutline).toEqual([]);
  });

  it('folds the Calculus, Statistics, and U.S. History shapes without inventing content', () => {
    const c = Hub.normalizeWorkshop(CALC_SHAPED);
    expect(c.prompt).toMatch(/Plan a complete written response/);
    expect(c.taskParts).toEqual(['Determine a two-sided limit at the join.']);
    expect(c.planningFrame).toEqual([{ label: 'Step 1', guidance: 'Identify givens.' }, { label: 'Step 2', guidance: 'Name a valid theorem.' }]);
    expect(c.successCriteria).toEqual(['Every quantity is addressed.']);
    expect(c.calculatorUse).toBe('Calculator permitted planning');
    const s = Hub.normalizeWorkshop(STATS_SHAPED);
    expect(s.taskType).toBe('Unscored planning workshop');
    expect(s.successCriteria).toHaveLength(2);
    expect(s.taskParts).toEqual([]);
    expect(s.stimulus).toBe('');
    expect(s.reviewNote).toBe('No score is produced.');
    const u = Hub.normalizeWorkshop(USH_SHAPED);
    expect(u.prompt).toBe('A synthetic note describes a dispute.');
    expect(u.stimulus).toBe('An original classroom scenario.');
    expect(u.successCriteria).toEqual(['Names a precise context.']);
    expect(Hub.normalizeWorkshop(null).id).toBe('');
    expect(Hub.normalizeWorkshop({ id: 'x', references: ['javascript:alert(1)', 'https://ok.example'] }).references).toEqual(['https://ok.example']);
  });

  it('gives every shipped AP workshop task parts or criteria to show, and a prompt', () => {
    const files = fs.readdirSync(resolve(process.cwd(), 'test_prep')).filter((name) => /^ap_.*_learning_library\.json$/.test(name));
    let total = 0;
    files.forEach((file) => {
      const workshops = readLibrary(file).constructedResponseWorkshops || [];
      workshops.forEach((raw) => {
        total += 1;
        const w = Hub.normalizeWorkshop(raw);
        expect(w.id, file).toBeTruthy();
        expect(w.title.length, file + ' ' + w.id).toBeGreaterThan(5);
        expect(w.prompt.length, file + ' ' + w.id + ' has no prompt').toBeGreaterThan(10);
        expect(w.taskParts.length + w.successCriteria.length, file + ' ' + w.id + ' renders nothing to do').toBeGreaterThan(0);
      });
    });
    // 35 authored before this session plus 8 Biology and 9 Chemistry.
    expect(total).toBe(52);
  }, SLOW);

  it('ships Biology and Chemistry workshops at Government depth', () => {
    for (const [file, count] of [['ap_biology_foundation_pilot_learning_library.json', 8], ['ap_chemistry_foundation_pilot_learning_library.json', 9]]) {
      const library = readLibrary(file);
      const workshops = library.constructedResponseWorkshops;
      expect(workshops, file).toHaveLength(count);
      expect(library.summary.constructedResponseWorkshops).toBe(count);
      const units = new Set();
      workshops.forEach((w) => {
        expect(w.taskParts).toHaveLength(3);
        expect(w.planningFrame).toHaveLength(4);
        expect(w.successCriteria).toHaveLength(4);
        expect(w.commonPitfalls).toHaveLength(4);
        expect(w.sampleOutline).toHaveLength(3);
        expect(w.stimulus).toMatch(/^Original synthetic/);
        expect(w.unscored).toBe(true);
        expect(w.officialItem).toBe(false);
        expect(w.reviewNote).toMatch(/does not score written responses/);
        units.add(w.unitIds[0]);
      });
      expect(units.size).toBe(count);
    }
  }, SLOW);
});

describe('workshop view with a legacy-shaped record', () => {
  const jsonBytes = (payload) => Buffer.from(JSON.stringify(payload), 'utf8');
  const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const responseBytes = (bytes, status = 200) => { const payload = Buffer.from(bytes); return { ok: status < 300, status, json: async () => JSON.parse(payload.toString('utf8')), arrayBuffer: async () => payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) }; };
  const findButton = (text) => Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
  async function waitUntil(predicate, message, timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs;
    while (!predicate() && Date.now() < deadline) await act(async () => { await new Promise((done) => setTimeout(done, 20)); });
    expect(predicate(), message).toBe(true);
  }
  async function click(button) { expect(button).toBeTruthy(); await act(async () => { button.click(); }); }

  afterEach(async () => {
    if (root) { await act(async () => { root.unmount(); }); root = null; }
    if (host) { host.remove(); host = null; }
    document.body.style.overflow = '';
    localStorage.clear();
    global.fetch = window.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders Physics-, Calculus-, and Statistics-shaped workshops instead of throwing', async () => {
    const basePack = structuredClone(Hub.listPacks().find((pack) => pack.id === 'workplace-safety-foundations-demo'));
    const id = 'workshop-shape-fixture';
    const libraryUrl = './test_prep/workshop_shape_fixture.json';
    const pack = { ...basePack, id, title: 'Workshop Shape Fixture', shortTitle: 'Shape fixture', version: '1.0.0', visibility: 'public', learningLibraryUrl: libraryUrl, items: basePack.items.map((item, index) => ({ ...item, id: id + '-item-' + (index + 1) })) };
    const library = {
      schemaVersion: 1, packId: id, version: pack.version, visibility: pack.visibility, title: 'Workshop Shape Fixture Library', description: 'Fixture.',
      summary: { chapters: 1, sections: 0, knowledgeChecks: 0, flashcards: 0, memoryAids: 0, diagrams: 0, glossaryTerms: 0, sourceReviewedChapters: 1, sourceReviewedFlashcards: 0, sourceReviewedMemoryAids: 0, constructedResponseWorkshops: 3 },
      chapters: [{ id: id + '-chapter', title: 'Fixture Chapter', domain: pack.domains[0].label, summary: 'Chapter.', reviewStatus: 'source-reviewed-editorial-pass', objectives: [], sections: [], knowledgeChecks: [] }],
      skills: [], flashcards: [], memoryAids: [], glossary: [], nativeDiagrams: [], diagrams: [],
      constructedResponseWorkshops: [PHYSICS_SHAPED, CALC_SHAPED, STATS_SHAPED],
    };
    const libraryBytes = jsonBytes(library);
    const entry = { id, loadMode: 'bundled', visibility: 'public', portfolioCategories: ['k12-college-readiness'], title: pack.title, shortTitle: pack.shortTitle, description: pack.description, disclaimer: pack.disclaimer, credentialOwner: '', status: 'ready', version: pack.version, blueprintLabel: '', blueprintEffective: '', officialBlueprintUrl: '', itemCount: pack.items.length, domainCount: pack.domains.length, itemSchemaVersion: pack.itemSchemaVersion, responseTypes: ['single-choice'], examModes: ['practice'], packUrl: '', learningLibraryUrl: libraryUrl, learningLibraryQaUrl: '', nativeQaUrl: '', sha256: '', learningLibrarySha256: sha256(libraryBytes), learningLibraryQaSha256: '', nativeQaSha256: '' };
    Hub.registerPack(pack);
    const manifest = { schemaVersion: 1, catalogVersion: 'workshop-shape', categories: baseManifest.categories, entries: [entry] };
    global.fetch = window.fetch = vi.fn(async (url) => {
      if (String(url).includes('pack_manifest.json')) return responseBytes(jsonBytes(manifest));
      if (String(url).includes('workshop_shape_fixture.json')) return responseBytes(libraryBytes);
      return responseBytes(jsonBytes({}), 404);
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component, { isOpen: true, onClose: () => {} })); });
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-pack-id="' + id + '"]')), 'Expected the fixture card.');
    await click(host.querySelector('[data-test-prep-pack-id="' + id + '"] button'));
    await waitUntil(() => Boolean(host.querySelector('[data-test-prep-tab="library"]')), 'Expected the library tab.');
    await click(host.querySelector('[data-test-prep-tab="library"]'));
    await waitUntil(() => Boolean(findButton('Written-response workshops')), 'Expected the workshops mode button.');
    await click(findButton('Written-response workshops'));
    // The Physics-shaped record now shows its tasks, frame, criteria, and self-check.
    expect(host.textContent).toContain('Showing 3 of 3 written-response workshops');
    expect(host.textContent).toContain('Kinematics model-and-evidence brief');
    expect(host.textContent).toContain('Define the positive direction and translate the record.');
    expect(host.textContent).toContain('Representation:');
    expect(host.textContent).toContain('Model boundary: Coordinate convention');
    expect(host.textContent).toContain('Self-check questions');
    expect(host.textContent).toContain('About 20 minutes');
    // Calculus gets a prompt and its planning steps; Statistics shows its self-check as criteria.
    expect(host.textContent).toContain('Plan a complete written response');
    expect(host.textContent).toContain('Calculator permitted planning');
    expect(host.textContent).toContain('Name the target population.');
    // No empty "Sample outline" or "Stimulus" headings for records that lack them.
    expect(host.textContent.match(/Sample outline/g) || []).toHaveLength(0);
  }, 60_000);
});
