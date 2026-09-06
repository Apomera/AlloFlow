import fs from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

// The AP Physics 1 and AP Calculus AB libraries author diagnostic routes,
// remediation playbooks, session plans, spaced-review cadences, and source
// catalogs in two different shapes. Before this layer existed the Hub read none
// of it, so the assertions below pin the normalized contract to the real
// shipped files rather than to a fixture that could drift from them.
let Hub;

function readLibrary(name) {
  return JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', name), 'utf8'));
}

beforeAll(() => {
  window.React = window.React || {
    useState: (value) => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useRef: () => ({ current: null }),
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('test_prep_hub_module.js');
  Hub = window.AlloModules.TestPrepHub;
  if (!Hub || typeof Hub.studyPlanLayers !== 'function') throw new Error('TestPrepHub.studyPlanLayers did not register');
});

describe('Test Prep study-plan layers', () => {
  it('returns an empty contract for a library without any study-plan records', () => {
    const layers = Hub.studyPlanLayers({ chapters: [] });
    expect(layers.topicRoutes).toEqual([]);
    expect(layers.playbooks).toEqual([]);
    expect(layers.sessions).toEqual([]);
    expect(layers.spacedPlans).toEqual([]);
    expect(layers.sources).toEqual([]);
    expect(layers.hasStudyPlan).toBe(false);
    expect(layers.hasPlaybooks).toBe(false);
    expect(layers.hasSessions).toBe(false);
    expect(layers.hasSources).toBe(false);
    expect(Hub.studyPlanLayers(null).hasStudyPlan).toBe(false);
  });

  it('normalizes the AP Physics 1 route-centred shape', () => {
    const library = readLibrary('ap_physics_1_foundation_pilot_learning_library.json');
    const layers = Hub.studyPlanLayers(library);
    expect(layers.topicRoutes).toHaveLength(39);
    expect(layers.unitRoutes).toHaveLength(8);
    expect(layers.ladders).toHaveLength(5);
    expect(layers.forms).toHaveLength(4);
    expect(layers.playbooks).toHaveLength(9);
    expect(layers.sessions).toHaveLength(15);
    expect(layers.spacedPlans).toHaveLength(39);
    expect(layers.sources.length).toBeGreaterThan(0);

    const route = layers.topicRoutes[0];
    expect(route.title).toBe('1.1 Scalars and Vectors');
    expect(route.sets.map((set) => set.label)).toEqual(['Entry check', 'Reinforcement set', 'Transfer set']);
    expect(route.sets.every((set) => set.itemIds.length > 0 && set.sectionId)).toBe(true);
    expect(route.itemIds.length).toBe(9);
    expect(route.masterySignals).toHaveLength(3);
    expect(route.chapterId).toBe('ap-physics-1-ch-01');

    // Every routed item must resolve to a real pack item, otherwise the launch
    // button would announce an empty set.
    const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', 'ap_physics_1_foundation_pilot.json'), 'utf8'));
    const itemIds = new Set(pack.items.map((item) => item.id));
    layers.topicRoutes.forEach((entry) => entry.itemIds.forEach((id) => expect(itemIds.has(id), id).toBe(true)));
    layers.ladders.forEach((entry) => entry.itemIds.forEach((id) => expect(itemIds.has(id), id).toBe(true)));
    layers.forms.forEach((entry) => entry.itemIds.forEach((id) => expect(itemIds.has(id), id).toBe(true)));
    layers.playbooks.forEach((entry) => entry.itemIds.forEach((id) => expect(itemIds.has(id), id).toBe(true)));
    layers.sessions.forEach((entry) => entry.itemIds.forEach((id) => expect(itemIds.has(id), id).toBe(true)));

    const playbook = layers.playbooks[0];
    expect(playbook.familyLabel).toBe('Representation and translation');
    expect(playbook.recognitionCue).toMatch(/without naming/);
    expect(playbook.steps.length).toBeGreaterThanOrEqual(4);
    expect(playbook.itemIds.length).toBeGreaterThan(0);

    const session = layers.sessions[0];
    expect(session.durationMinutes).toBe(45);
    expect(session.steps[0].label).toBe('Orient');
    expect(session.steps[0].durationMinutes).toBe(5);

    const spaced = layers.spacedPlans[0];
    expect(spaced.stages.map((stage) => stage.intervalHours)).toEqual([0, 24, 72, 168]);
    expect(spaced.diagnosticRouteId).toBe('ap-physics-1-route-1-1');

    const source = layers.sources[0];
    expect(source.url).toMatch(/^https:\/\//);
    expect(source.organization).toBe('College Board');
  });

  it('normalizes the AP Calculus AB diagnostic-set shape and separate remediation list', () => {
    const library = readLibrary('ap_calculus_ab_foundation_pilot_learning_library.json');
    const layers = Hub.studyPlanLayers(library);
    expect(layers.topicRoutes).toHaveLength(40);
    expect(layers.playbooks).toHaveLength(40);
    expect(layers.hasStudyPlan).toBe(true);
    expect(layers.hasPlaybooks).toBe(true);
    expect(layers.hasSessions).toBe(false);

    const route = layers.topicRoutes[0];
    expect(route.sets.map((set) => set.label)).toEqual(['Foundation concept check', 'Depth and boundary check', 'Transfer check']);
    expect(route.sets[0].needsRepairAction).toMatch(/remediation/);
    expect(route.remediationPlaybookId).toBe('ap-calc-ab-remediation-1-2');

    const playbook = layers.playbooks.find((entry) => entry.id === 'ap-calc-ab-remediation-1-2');
    expect(playbook.recognitionCue).toMatch(/limit may exist/i);
    expect(playbook.steps.map((step) => step.label)).toEqual(['Recognize', 'Repair', 'Contrast', 'Practice', 'Retry transfer reflect']);
    expect(playbook.itemIds).toEqual(expect.arrayContaining(route.itemIds));
  });

  it('drops malformed records and rejects non-https source links', () => {
    const layers = Hub.studyPlanLayers({
      topicDiagnosticRoutes: [null, 'bad', { id: '', topicLabel: 'orphan' }, { id: 'ok', topicLabel: 'Keep', diagnosticSets: [{ label: 'Set', itemIds: ['a', '', null] }] }],
      misconceptionRemediationPlaybooks: [{ id: 'pb', title: 'T', stages: [{ label: 'Only', instruction: 'Do it' }, { label: 'Empty' }] }],
      sourceCatalog: [{ id: 's1', title: 'Insecure', url: 'http://example.com' }, { id: 's2', title: 'Script', url: 'javascript:alert(1)' }],
    });
    expect(layers.topicRoutes).toHaveLength(1);
    expect(layers.topicRoutes[0].sets[0].itemIds).toEqual(['a']);
    expect(layers.topicRoutes[0].itemIds).toEqual(['a']);
    expect(layers.playbooks[0].steps).toHaveLength(1);
    expect(layers.sources.map((source) => source.url)).toEqual(['', '']);
  });

  it('derives a deterministic start / continue / retry pointer from local set progress', () => {
    const pointer = Hub.studyPlanRoutePointer;
    expect(pointer([])).toEqual({ index: -1, kind: 'none' });
    expect(pointer([{ status: 'not-started', totalItemCount: 3, correctItemCount: 0 }, { status: 'not-started', totalItemCount: 2, correctItemCount: 0 }])).toEqual({ index: 0, kind: 'start' });
    expect(pointer([{ status: 'complete', totalItemCount: 3, correctItemCount: 3 }, { status: 'in-progress', totalItemCount: 2, correctItemCount: 1 }])).toEqual({ index: 1, kind: 'continue' });
    expect(pointer([{ status: 'complete', totalItemCount: 3, correctItemCount: 3 }, { status: 'complete', totalItemCount: 2, correctItemCount: 1 }])).toEqual({ index: 1, kind: 'retry' });
    expect(pointer([{ status: 'complete', totalItemCount: 3, correctItemCount: 3 }])).toEqual({ index: -1, kind: 'practiced' });
  });

  it('reports per-item correctness and last-practiced time from attempt history', () => {
    const now = Date.parse('2026-09-06T12:00:00Z');
    const attempts = [
      { mode: 'custom', label: 'Route · Entry check', completedAt: now - 3 * 86400000, percent: 50, itemIds: ['a', 'b'], itemResults: { a: { correct: true }, b: { correct: false } } },
      { mode: 'custom', label: 'Other', completedAt: now - 3600000, percent: 100, itemIds: ['b'], itemResults: { b: { correct: true } } },
      { mode: 'guided-review', label: 'Ignored', completedAt: now, itemIds: ['c'], itemResults: { c: { correct: true } } },
    ];
    const progress = Hub.routeProgress(attempts, { title: 'Route · Entry check', itemIds: ['a', 'b', 'c'] });
    expect(progress.attemptedItemCount).toBe(2);
    expect(progress.correctItemCount).toBe(2);
    expect(progress.status).toBe('in-progress');
    expect(progress.latestRouteScore).toBe(50);
    expect(progress.latestCompletedAt).toBe(now - 3600000);
    expect(Hub.studyPlanAgoLabel(progress.latestCompletedAt, now)).toBe('Practiced 1 hour ago');
    expect(Hub.studyPlanAgoLabel(now - 3 * 86400000, now)).toBe('Practiced 3 days ago');
    expect(Hub.studyPlanAgoLabel(0, now)).toBe('Not practiced yet');
  });

  it('indexes study-plan records in pack-wide search', () => {
    const library = readLibrary('ap_physics_1_foundation_pilot_learning_library.json');
    const pack = JSON.parse(fs.readFileSync(resolve(process.cwd(), 'test_prep', 'ap_physics_1_foundation_pilot.json'), 'utf8'));
    const routes = Hub.searchPack(pack, library, 'scalars and vectors', { limit: 100 });
    expect(routes.results.some((result) => result.type === 'topic-route')).toBe(true);
    const playbooks = Hub.searchPack(pack, library, 'translate before you calculate', { limit: 100 });
    expect(playbooks.results.some((result) => result.type === 'playbook')).toBe(true);
    const sources = Hub.searchPack(pack, library, 'course and exam description', { limit: 100 });
    expect(sources.results.some((result) => result.type === 'source')).toBe(true);
  });
});
