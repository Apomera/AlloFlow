import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ENGINE_KEY = '__geoWorldEngine';
let cfg;
let mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion',
      'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray']
      .forEach(name => { value[name] = () => value; });
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
    loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {},
    setLayerFocus: vi.fn(), clearLayerFocus: vi.fn(), applyRenderQuality: preference => ({ label: preference })
  };
  engine.logEvent = vi.fn((type, data) => engine.sessionLog.push({ type, data }));
  return engine;
}

function record(overrides) {
  return Object.assign({ L: 2, W: 2, H: 3, occupiedVolume: 12, vol: '12', boundingVolume: 12,
    blocks: 12, isSolidPrism: true, isComplete: true, surfaceAreaExact: true, surfaceArea: 32, t: 1000 }, overrides);
}

function mountTool(overrides) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({
    _introShownOnce: true, worldActive: true, tutorialDismissed: true, activeLesson: 'volumeExplorer',
    score: 0, totalQ: 3, objectivesOpen: false, hudPanel: 'history', showGeometryHome: false,
    measureHistory: [record(), record({ t: 2000 }), record({ t: 3000 })]
  }, overrides) };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = Object.assign({}, toolData[section], { [key]: value }); if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = Object.assign({}, toolData[section], patch); if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, bucket: () => toolData.geometryWorld,
    patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); } };
  click(container.querySelector('#gw-notebook-tab-compare'));
  return mounted;
}

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function control(view, side) { return view.container.querySelector('#gw-compare-' + side); }
function choose(view, side, index) {
  const select = control(view, side);
  expect(select).toBeTruthy();
  React.act(() => { select.value = String(index); select.dispatchEvent(new Event('change', { bubbles: true })); });
}
function pair(view) { return ['baseline', 'result'].map(side => control(view, side)?.value); }
function comparison(view) { return view.container.querySelector('[data-geometry-measurement-comparison]'); }
function change(view, kind) { return comparison(view).querySelector('[data-geometry-quantity-change="' + kind + '"]').textContent; }
function sources(view) { return view.container.querySelector('[data-geometry-comparison-source]').textContent; }

beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld'); });
beforeEach(() => { window.localStorage.removeItem('allo.geometryworld.hud.v1'); window.THREE = makeThreeStub(); window[ENGINE_KEY] = makeEngine(); });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('Geometry World measurement comparison selection', () => {
  it('labels native controls and keeps original record numbers when excluding unusable scans', () => {
    const history = [record({ occupiedVolume: 4 }), record({ isComplete: false }), record({ occupiedVolume: NaN }),
      record({ occupiedVolume: Infinity }), record({ occupiedVolume: -1 }),
      record({ occupiedVolume: undefined, vol: '1 1/2', t: 6000 }), record({ occupiedVolume: 8, t: 7000 })];
    const view = mountTool({ measureHistory: history });
    for (const [side, label] of [['baseline', 'Starting measurement'], ['result', 'Comparison measurement']]) {
      const select = control(view, side);
      expect(select.tagName).toBe('SELECT');
      expect([...select.labels].map(node => node.textContent).join(' ')).toContain(label);
      expect([...select.options].map(option => option.value)).toEqual(['0', '5', '6']);
      expect([...select.options].map(option => option.textContent)).toEqual([
        expect.stringContaining('Record 1'), expect.stringContaining('Record 6'), expect.stringContaining('Record 7')]);
    }
    expect(pair(view)).toEqual(['5', '6']);
    expect(sources(view)).toContain('Record 6'); expect(sources(view)).toContain('Record 7');
    expect(change(view, 'volume')).toContain('6 1/2 more cubic units');
  });

  it('compares nonadjacent records with the correct volume and surface differences', () => {
    const view = mountTool({ measureHistory: [record({ occupiedVolume: 8, surfaceArea: 24 }),
      record({ occupiedVolume: 30, surfaceArea: 60, t: 2000 }), record({ occupiedVolume: 12, surfaceArea: 32, t: 3000 })] });
    choose(view, 'baseline', 0);
    expect(pair(view)).toEqual(['0', '2']);
    expect(sources(view)).toContain('Record 1'); expect(sources(view)).toContain('Record 3');
    expect(change(view, 'volume')).toBe('Record 3 has 4 more cubic units');
    expect(change(view, 'surface')).toBe('Record 3 has 8 more square units');
    expect(comparison(view).textContent).not.toContain('Latest occupied volume');
    choose(view, 'result', 1);
    expect(change(view, 'volume')).toBe('Record 2 has 22 more cubic units');
    expect(change(view, 'surface')).toBe('Record 2 has 36 more square units');
  });

  it('swaps the pair when either side selects the same record as the other', () => {
    const view = mountTool({ measureHistory: [record(), record({ occupiedVolume: 8, t: 2000 }), record({ occupiedVolume: 12, t: 3000 })] });
    choose(view, 'baseline', 2);
    expect(pair(view)).toEqual(['2', '1']);
    expect(change(view, 'volume')).toBe('Record 2 has 4 fewer cubic units');
    choose(view, 'result', 2);
    expect(pair(view)).toEqual(['1', '2']);
    expect(change(view, 'volume')).toBe('Record 3 has 4 more cubic units');
  });

  it('distinguishes records sharing a timestamp and names the more efficient build', () => {
    const view = mountTool({ measureHistory: [record({ surfaceArea: 36 }), record({ surfaceArea: 32 }), record({ surfaceArea: 40 })] });
    choose(view, 'baseline', 0); choose(view, 'result', 1);
    expect(pair(view)).toEqual(['0', '1']);
    expect(change(view, 'volume')).toContain('No change');
    expect(change(view, 'surface')).toBe('Record 2 has 4 fewer square units');
    expect(comparison(view).querySelector('.gw-notebook-insight').textContent)
      .toBe('Record 2 has 4 fewer square units of exposed surface for the same occupied volume.');
  });

  it('keeps a chosen pair through new scans, notebook tabs and reopening without changing learner work', () => {
    const history = [record(), record({ t: 2000 }), record({ t: 3000 })];
    const protectedState = { measureHistory: history, score: 2, volumePrediction: '10', predictionReason: 'Count layers.',
      retrievalAnswer: '4', retrievalAttemptCount: 1, npcAnswerDrafts: { guide: '8' }, reflectionText: 'Equal volume.' };
    const view = mountTool(protectedState);
    const before = Object.fromEntries(Object.keys(protectedState).map(key => [key, JSON.stringify(view.bucket()[key])]));
    const events = JSON.stringify(window[ENGINE_KEY].sessionLog);
    choose(view, 'baseline', 0); choose(view, 'result', 1);
    click(view.container.querySelector('#gw-notebook-tab-practice'));
    click(view.container.querySelector('#gw-notebook-tab-compare'));
    view.patch({ hudPanel: '' }); view.patch({ hudPanel: 'history' });
    expect(pair(view)).toEqual(['0', '1']);
    for (const key of Object.keys(protectedState)) expect(JSON.stringify(view.bucket()[key])).toBe(before[key]);
    expect(JSON.stringify(window[ENGINE_KEY].sessionLog)).toBe(events);
    const extended = [...history, record({ t: 4000 })]; view.patch({ measureHistory: extended });
    expect(pair(view)).toEqual(['0', '1']);
    expect(view.bucket().measureHistory).toBe(extended);
    expect(JSON.stringify(window[ENGINE_KEY].sessionLog)).toBe(events);
  });

  it('follows new scans by default and resumes following after resetting a chosen pair', () => {
    const history = [record(), record({ t: 2000 }), record({ t: 3000 })];
    const view = mountTool({ measureHistory: history });
    const extended = [...history, record({ t: 4000 })]; view.patch({ measureHistory: extended });
    expect(pair(view)).toEqual(['2', '3']);
    choose(view, 'baseline', 0); choose(view, 'result', 1);
    click(view.container.querySelector('[data-geometry-comparison-reset]'));
    expect(pair(view)).toEqual(['2', '3']);
    view.patch({ measureHistory: [...extended, record({ t: 5000 })] });
    expect(pair(view)).toEqual(['3', '4']);
  });

  it('tracks retained selected records after older scans are pruned, then resets when a selection disappears', () => {
    const history = [record(), record({ t: 2000 }), record({ t: 3000 }), record({ t: 4000 })];
    const view = mountTool({ measureHistory: history }); choose(view, 'baseline', 1); choose(view, 'result', 2);
    const pruned = [...history.slice(1), record({ t: 5000 })]; view.patch({ measureHistory: pruned });
    expect(pair(view)).toEqual(['0', '1']);
    const prunedAgain = [...pruned.slice(1), record({ t: 6000 })]; view.patch({ measureHistory: prunedAgain });
    expect(pair(view)).toEqual(['2', '3']);
    view.patch({ measureHistory: [...prunedAgain, record({ t: 7000 })] });
    expect(pair(view)).toEqual(['3', '4']);
  });

  it('clears a chosen pair at lesson changes even when the same history remains', () => {
    const view = mountTool(); choose(view, 'baseline', 0); choose(view, 'result', 1);
    view.patch({ activeLesson: 'areaSurface' });
    click(view.container.querySelector('#gw-notebook-tab-compare'));
    expect(pair(view)).toEqual(['1', '2']);
  });

  it('preserves inexact surface limitations when comparing a fractional build', () => {
    const view = mountTool({ measureHistory: [record({ hasFractions: true, occupiedVolume: 1.5, surfaceAreaExact: false }),
      record({ occupiedVolume: 4, t: 2000 }), record({ occupiedVolume: 2.5, t: 3000 })] });
    choose(view, 'baseline', 0);
    expect(change(view, 'volume')).toBe('Record 3 has 1 more cubic unit');
    expect(change(view, 'surface')).toContain('Exact surface area unavailable');
    expect(comparison(view).querySelector('.gw-notebook-insight')).toBeNull();
  });

  it.each(['skip', 'save'])('reflects on the selected pair instead of an unrelated live measurement and restores the pair after %s', action => {
    const view = mountTool({ measureHistory: [record({ occupiedVolume: 8, surfaceArea: 24 }),
      record({ occupiedVolume: 12, surfaceArea: 32, t: 2000 }), record({ occupiedVolume: 60, surfaceArea: 94, t: 3000 })],
      measureResult: Object.assign(record({ occupiedVolume: 999 }), { count: 999, totalVolume: 999,
        missingVolume: 0, fillPercent: 100, shapeCounts: { cube: 999 }, materialCounts: { stone: 999 },
        blocks: [{ x: 0, y: 1, z: 0 }] }), reflectionText: 'I added another layer.',
      volumePrediction: '900', predictionStrategy: 'guess', revisedPrediction: '950', predictionReason: 'Unrelated live estimate.' });
    choose(view, 'baseline', 0); choose(view, 'result', 1);
    click(view.container.querySelector('[data-geometry-reflect-trigger="notebook"]'));
    const prompt = view.container.querySelector('#gw-reflection-prompt').textContent;
    expect(prompt).toContain('Record 1'); expect(prompt).toContain('Record 2');
    expect(prompt).toContain('8 cubic units'); expect(prompt).toContain('12 cubic units');
    expect(prompt).not.toContain('999'); expect(prompt).not.toContain('60 cubic units');
    expect(view.container.querySelector('#gw-reflection-text').value).toBe('I added another layer.');
    click(view.container.querySelector('.gw-reflection-' + action));
    expect(pair(view)).toEqual(['0', '1']);
    expect(view.container.querySelector('#gw-notebook-tab-compare').getAttribute('aria-selected')).toBe('true');
    const reflectionEvents = window[ENGINE_KEY].sessionLog.filter(event => event.type === 'reflection');
    expect(reflectionEvents).toHaveLength(action === 'save' ? 1 : 0);
    if (action === 'save') expect(reflectionEvents[0].data).toMatchObject({
      concept: 'measurement_comparison', measuredVolume: null, prediction: null, revisedPrediction: null,
      strategy: '', misconception: '', comparison: {
        previous: { recordNumber: 1, occupiedVolume: 8, surfaceArea: 24 },
        latest: { recordNumber: 2, occupiedVolume: 12, surfaceArea: 32 },
        volumeDifference: 4, surfaceAreaDifference: 8
      }
    });
  });

  it('offers no comparison when fewer than two valid complete records remain', () => {
    const view = mountTool(); choose(view, 'baseline', 0);
    view.patch({ measureHistory: [record(), record({ isComplete: false }), record({ occupiedVolume: -2 })] });
    expect(comparison(view)).toBeNull();
    expect(view.container.querySelector('#gw-notebook-view-compare').textContent).toContain('Two complete measurements');
  });
});
