import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const SOURCE = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
const MATH_SOURCE = SOURCE.slice(SOURCE.indexOf('  function formatVolume(vol)'), SOURCE.indexOf('  var ACHIEVEMENTS = ['));
const math = new Function(MATH_SOURCE + '\nreturn { retrievalMeasurementCount, buildRetrievalCheckpoint };')();
let cfg;
let mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function record(overrides) {
  return Object.assign({ L: 2, W: 3, H: 4, occupiedVolume: 24, vol: '24', boundingVolume: 24,
    blocks: 24, isSolidPrism: true, isComplete: true, hasFractions: false, t: 1000 }, overrides);
}

function history(length = 10) {
  return Array.from({ length }, (_, index) => record({ t: index + 1 }));
}

function measurement(overrides) {
  return Object.assign(record(), { count: 24, totalVolume: 24, formattedOccupiedVolume: '24',
    minX: 0, minY: 1, minZ: 0, missingVolume: 0, fillPercent: 100,
    exposedSurfaceArea: 52, surfaceAreaExact: true, shapeCounts: { cube: 24 }, materialCounts: { stone: 24 },
    blocks: [{ x: 0, y: 1, z: 0 }] }, overrides);
}

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion',
      'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round',
      'floor', 'setScalar', 'applyEuler', 'fromArray'].forEach(name => { value[name] = () => value; });
    value.clone = () => vec(); value.distanceTo = () => 99; value.length = () => 1; value.lengthSq = () => 1;
    value.dot = () => 0; value.toArray = () => [0, 0, 0];
    return value;
  }
  return new Proxy({}, { get: (_target, property) => property === 'SRGBColorSpace' ? 'srgb'
    : typeof property === 'symbol' ? undefined : function() { return vec(); } });
}

function makeEngine() {
  const engine = {
    clearWorld() {}, scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: { position: { x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone: () => ({ x: 0, y: 0, z: 0 }) },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: value => value || { x: 0, y: 0, z: -1 }, updateProjectionMatrix() {} },
    blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [], _redoStack: [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [],
    _predictionState: { input: '', strategy: '', reason: '', commitment: null, observedTargetKeys: [], history: [] },
    loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {},
    clearLayerFocus: vi.fn(), setLayerFocus: vi.fn(), applyRenderQuality: preference => ({ label: preference }),
    blockUnderCrosshair: vi.fn(() => ({ object: { userData: { gridPos: { x: 0, y: 1, z: 0 } } } })),
    measureStructure: vi.fn(() => measurement())
  };
  engine.logEvent = vi.fn((type, data) => engine.sessionLog.push({ type, data }));
  return engine;
}

// Exercise the real append handler without initializing a WebGL renderer.
function installMeasurement(engine, update) {
  const start = SOURCE.indexOf('engine.performMeasurement = function(inputMode) {');
  const end = SOURCE.indexOf('\n        };', start);
  if (start < 0 || end < 0) throw new Error('Missing native Geometry World measurement handler');
  const body = SOURCE.slice(start, end + '\n        };'.length);
  const noop = () => {};
  new Function('engine', 'upd', 'setLayerFocus', 'sfxMeasure', 'showDimLines', 'showSelectionGlow',
    'spawnPlaceParticles', 'announceToSR', 'runAchievementCheck', 'awardXP',
    MATH_SOURCE + '\n' + body)(engine, update, noop, noop, noop, noop, noop, noop, noop, noop);
}

function mountTool(records, progress) {
  const engine = makeEngine(); engine._retrievalMeasurementProgress = progress; window[ENGINE_KEY] = engine;
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: {
    _introShownOnce: true, worldActive: true, tutorialDismissed: true, activeLesson: 'volumeExplorer',
    score: 2, totalQ: 3, answeredNpcs: { 'Layer Counter': true }, npcAnswerDrafts: { 'Layer Counter': 'kept' },
    hudPanel: 'history', showGeometryHome: false, measureHistory: records
  } };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = Object.assign({}, toolData[section], { [key]: value }); if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = Object.assign({}, toolData[section], patch); if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, engine, bucket: () => toolData.geometryWorld,
    patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); },
    update(value) { context.updateMulti('geometryWorld', value); } };
  return mounted;
}

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function checkpoint(view) { return view.container.querySelector('[data-geometry-retrieval-checkpoint]'); }

beforeAll(() => {
  resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld');
});
beforeEach(() => {
  vi.useFakeTimers(); window.localStorage.removeItem('allo.geometryworld.hud.v1'); window.THREE = makeThreeStub();
});
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.clearAllTimers(); vi.restoreAllMocks(); vi.useRealTimers();
  delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('Geometry World trusted retrieval measurement count', () => {
  it('uses the native count only for the exact retained history array', () => {
    const records = history();
    expect(math.retrievalMeasurementCount(records, { history: records, completeCount: 11 })).toBe(11);
    expect(math.retrievalMeasurementCount(records.slice(), { history: records, completeCount: 11 })).toBe(10);
    expect(math.retrievalMeasurementCount(records, { history: records.slice(), completeCount: 11 })).toBe(10);
  });

  it.each([undefined, null, NaN, Infinity, -Infinity, -1, 0, 9, 10.5, '11', Number.MAX_SAFE_INTEGER + 1])
  ('falls back for invalid runtime counts (%s)', completeCount => {
    const records = history();
    expect(math.retrievalMeasurementCount(records, { history: records, completeCount })).toBe(10);
    expect(math.buildRetrievalCheckpoint(records, completeCount)).toMatchObject({ concept: 'scale_height', expected: 8 });
  });

  it('preserves legacy complete-record counting and does not count partial scans', () => {
    const records = [record(), record({ isComplete: false }), record()];
    expect(math.retrievalMeasurementCount(records)).toBe(2);
    expect(math.retrievalMeasurementCount(null)).toBe(0);
    expect(math.retrievalMeasurementCount([])).toBe(0);
    expect(math.buildRetrievalCheckpoint(records)).toMatchObject({ concept: 'scale_height', expected: 8 });
  });

  it('alternates at 11 and 12 complete scans without changing retained records or IDs', () => {
    const records = history(), before = JSON.stringify(records);
    expect(math.buildRetrievalCheckpoint(records, 11)).toMatchObject({ concept: 'layer_area', expected: 6,
      id: 'retrieval-10-layer_area' });
    expect(math.buildRetrievalCheckpoint(records, 12)).toMatchObject({ concept: 'scale_height', expected: 8,
      id: 'retrieval-10-scale_height' });
    expect(JSON.stringify(records)).toBe(before);
  });

  it('does not let a large native count bypass the two complete records requirement', () => {
    expect(math.buildRetrievalCheckpoint([record(), record({ isComplete: false })], 12)).toBeNull();
    expect(math.buildRetrievalCheckpoint([], 12)).toBeNull();
  });

  it('ignores authored sequence fields and keeps fractional and composite concepts first', () => {
    const forged = history().map(item => Object.assign(item, { completeCount: 11, sequence: 11, measurementCount: 11 }));
    expect(math.retrievalMeasurementCount(forged)).toBe(10);
    expect(math.buildRetrievalCheckpoint(forged)).toMatchObject({ concept: 'scale_height', expected: 8 });
    const fractional = record({ occupiedVolume: 1.5, blocks: 2, boundingVolume: 2, hasFractions: true, isSolidPrism: false });
    const composite = record({ occupiedVolume: 8, blocks: 8, boundingVolume: 12, isSolidPrism: false });
    for (const count of [11, 12]) {
      expect(math.buildRetrievalCheckpoint([record(), fractional], count)).toMatchObject({ concept: 'fractional_volume', expected: 0.5 });
      expect(math.buildRetrievalCheckpoint([record(), composite], count)).toMatchObject({ concept: 'empty_space', expected: 4 });
      expect(math.buildRetrievalCheckpoint([record({ isSolidPrism: false }), record({ isSolidPrism: false })], count))
        .toMatchObject({ concept: 'volume_difference', expected: 0 });
    }
  });
});

describe('Geometry World native retrieval cadence', () => {
  it('appends twelve real scans with a ten-record cap and alternating checkpoints', () => {
    const engine = makeEngine(), update = vi.fn(); installMeasurement(engine, update);
    const concepts = [];
    for (let index = 1; index <= 12; index += 1) {
      vi.setSystemTime(1000 + index); engine.performMeasurement(index % 2 ? 'key' : 'touch');
      const records = engine._predictionState.history;
      expect(records).toHaveLength(Math.min(index, 10));
      expect(engine._retrievalMeasurementProgress).toEqual({ history: records, completeCount: index });
      const current = math.buildRetrievalCheckpoint(records, math.retrievalMeasurementCount(records, engine._retrievalMeasurementProgress));
      if (index === 1) expect(current).toBeNull();
      else concepts.push(current.concept);
    }
    expect(concepts).toEqual(Array.from({ length: 11 }, (_, index) => index % 2 ? 'layer_area' : 'scale_height'));
    expect(engine.sessionLog).toHaveLength(12); expect(engine.sessionLog.every(event => event.type === 'measurement')).toBe(true);
    expect(update.mock.calls.some(([patch]) => patch && typeof patch === 'object' && ('score' in patch || 'answeredNpcs' in patch))).toBe(false);
    expect(update.mock.calls.some(([patch]) => patch && typeof patch === 'object' && '_retrievalMeasurementProgress' in patch)).toBe(false);
  });

  it('keeps an existing checkpoint stable when a partial scan removes an older complete record', () => {
    const engine = makeEngine(); installMeasurement(engine, vi.fn());
    for (let index = 1; index <= 10; index += 1) { vi.setSystemTime(index); engine.performMeasurement('key'); }
    const before = math.buildRetrievalCheckpoint(engine._predictionState.history, 10);
    engine.measureStructure.mockReturnValue(measurement({ isComplete: false }));
    vi.setSystemTime(11); engine.performMeasurement('touch');
    const records = engine._predictionState.history;
    expect(records).toHaveLength(10); expect(records.filter(item => item.isComplete !== false)).toHaveLength(9);
    expect(math.retrievalMeasurementCount(records, engine._retrievalMeasurementProgress)).toBe(10);
    expect(math.buildRetrievalCheckpoint(records, 10)).toEqual(before);
    engine.measureStructure.mockReturnValue(measurement());
    vi.setSystemTime(12); engine.performMeasurement('key');
    expect(engine._retrievalMeasurementProgress.completeCount).toBe(11);
    expect(math.buildRetrievalCheckpoint(engine._predictionState.history, 11)).toMatchObject({ concept: 'layer_area', expected: 6 });
  });

  it('starts fresh after native history is replaced for a new world', () => {
    const engine = makeEngine(); installMeasurement(engine, vi.fn());
    for (let index = 1; index <= 12; index += 1) engine.performMeasurement('key');
    engine._predictionState = Object.assign({}, engine._predictionState, { history: [] });
    engine.performMeasurement('key');
    expect(engine._predictionState.history).toHaveLength(1); expect(engine._retrievalMeasurementProgress.completeCount).toBe(1);
    expect(math.buildRetrievalCheckpoint(engine._predictionState.history, 1)).toBeNull();
    engine.performMeasurement('touch');
    expect(engine._retrievalMeasurementProgress.completeCount).toBe(2);
    expect(math.buildRetrievalCheckpoint(engine._predictionState.history, 2)).toMatchObject({ concept: 'scale_height', expected: 8 });
  });

  it('rebases cloned history without trusting sequence fields from imported records', () => {
    const engine = makeEngine(); installMeasurement(engine, vi.fn());
    for (let index = 1; index <= 12; index += 1) engine.performMeasurement('key');
    const replacement = engine._predictionState.history.map(item => Object.assign({}, item, { completeCount: 200, sequence: 200 }));
    engine._predictionState = Object.assign({}, engine._predictionState, { history: replacement });
    expect(math.retrievalMeasurementCount(replacement, engine._retrievalMeasurementProgress)).toBe(10);
    engine.performMeasurement('touch');
    expect(engine._retrievalMeasurementProgress.completeCount).toBe(11);
    expect(engine._retrievalMeasurementProgress.history).toBe(engine._predictionState.history);
  });

  it('publishes runtime progress before a synchronous measurement update can render', () => {
    const engine = makeEngine(), seen = [];
    installMeasurement(engine, patch => {
      if (patch && patch.measureHistory) seen.push(math.retrievalMeasurementCount(patch.measureHistory, engine._retrievalMeasurementProgress));
    });
    for (let index = 1; index <= 12; index += 1) engine.performMeasurement('key');
    expect(seen).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
  });

  it('does not advance the count when no target or measurement result exists', () => {
    const engine = makeEngine(); installMeasurement(engine, vi.fn()); engine.performMeasurement('key');
    const before = engine._retrievalMeasurementProgress;
    engine.blockUnderCrosshair.mockReturnValue(null); expect(engine.performMeasurement('key')).toBeNull();
    expect(engine._retrievalMeasurementProgress).toBe(before);
    engine.blockUnderCrosshair.mockReturnValue({ object: { userData: { gridPos: { x: 0, y: 1, z: 0 } } } });
    engine.measureStructure.mockReturnValue(null); expect(engine.performMeasurement('touch')).toBeNull();
    expect(engine._retrievalMeasurementProgress).toBe(before); expect(engine.sessionLog).toHaveLength(1);
  });
});

describe('Geometry World mounted retrieval cadence', () => {
  it('renders layer area from matching runtime progress without changing learner evidence', () => {
    const records = history(), view = mountTool(records, { history: records, completeCount: 11 });
    const before = JSON.stringify(view.bucket()); click(view.container.querySelector('#gw-notebook-tab-practice'));
    expect(checkpoint(view).dataset.geometryRetrievalCheckpoint).toBe('layer_area');
    expect(view.container.querySelector('label[for="gw-retrieval-answer"]').textContent).toBe('Your answer (square units)');
    expect(JSON.stringify(view.bucket())).toBe(before); expect(view.engine.sessionLog).toHaveLength(0);
  });

  it('falls back safely after replacing the displayed history with a clone', () => {
    const records = history(), view = mountTool(records, { history: records, completeCount: 11 });
    click(view.container.querySelector('#gw-notebook-tab-practice'));
    expect(checkpoint(view).dataset.geometryRetrievalCheckpoint).toBe('layer_area');
    view.patch({ measureHistory: records.map(item => Object.assign({}, item, { completeCount: 11, sequence: 11 })) });
    expect(checkpoint(view).dataset.geometryRetrievalCheckpoint).toBe('scale_height');
    expect(view.container.querySelector('label[for="gw-retrieval-answer"]').textContent).toBe('Your answer (units)');
    expect(view.bucket()).toMatchObject({ score: 2, answeredNpcs: { 'Layer Counter': true }, npcAnswerDrafts: { 'Layer Counter': 'kept' } });
    expect(view.engine.sessionLog).toHaveLength(0);
  });

  it('renders native scans eleven and twelve through the actual append handler', () => {
    const view = mountTool([], null); installMeasurement(view.engine, patch => view.update(patch));
    for (let index = 1; index <= 12; index += 1) {
      vi.setSystemTime(1000 + index); React.act(() => view.engine.performMeasurement(index % 2 ? 'key' : 'touch'));
      if (index === 11) {
        click(view.container.querySelector('#gw-notebook-tab-practice'));
        expect(checkpoint(view).dataset.geometryRetrievalCheckpoint).toBe('layer_area');
      }
    }
    expect(view.bucket().measureHistory).toHaveLength(10);
    expect(checkpoint(view).dataset.geometryRetrievalCheckpoint).toBe('scale_height');
    expect(view.bucket()).toMatchObject({ score: 2, answeredNpcs: { 'Layer Counter': true }, npcAnswerDrafts: { 'Layer Counter': 'kept' } });
    expect(view.engine.sessionLog.filter(event => event.type === 'measurement')).toHaveLength(12);
    expect(view.engine.sessionLog.filter(event => event.type === 'retrieval_check')).toHaveLength(0);
  });
});
