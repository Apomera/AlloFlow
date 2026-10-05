import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ENGINE_KEY = '__geoWorldEngine';
const ORIGINAL_UA = navigator.userAgent;
let cfg;
let mounted;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion',
      'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round',
      'floor', 'setScalar', 'applyEuler', 'fromArray'].forEach(name => { value[name] = () => value; });
    value.clone = () => vec(); value.distanceTo = () => 99; value.length = () => 1;
    value.lengthSq = () => 1; value.dot = () => 0; value.toArray = () => [0, 0, 0];
    return value;
  }
  return new Proxy({}, { get: (_target, property) => property === 'SRGBColorSpace' ? 'srgb'
    : typeof property === 'symbol' ? undefined : function() { return vec(); } });
}

function makeEngine() {
  return {
    clearWorld() {}, scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: {
      position: { x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone: () => ({ x: 0, y: 0, z: 0 }) },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: value => value || { x: 0, y: 0, z: -1 }, updateProjectionMatrix() {}
    },
    blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [], _redoStack: [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [],
    loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {}, logEvent: vi.fn(),
    setLayerFocus: vi.fn(), clearLayerFocus: vi.fn(), applyRenderQuality: preference => ({ label: preference })
  };
}

function cells(length, width, height, include = () => true) {
  const blocks = [];
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < width; z++) {
      for (let x = 0; x < length; x++) {
        if (include(x, y, z)) blocks.push({ x, y, z });
      }
    }
  }
  return blocks;
}

function measurement(blocks, dimensions, overrides = {}) {
  const [L, W, H] = dimensions;
  return Object.assign({ L, W, H, count: blocks.length, totalVolume: blocks.length,
    boundingVolume: L * W * H, fillPercent: blocks.length / (L * W * H) * 100,
    shapeCounts: { cube: blocks.length }, materialCounts: { stone: blocks.length }, blocks, isComplete: true }, overrides);
}

function solid() { return measurement(cells(2, 2, 3), [2, 2, 3]); }
function composite() { return measurement(cells(2, 2, 3, (_x, y, z) => y === 0 || z === 0), [2, 2, 3]); }
function hollow() { return measurement(cells(3, 3, 1, (x, _y, z) => x !== 1 || z !== 1), [3, 3, 1]); }
function fractional() {
  return measurement(cells(2, 1, 1), [2, 1, 1], {
    totalVolume: 1.5, fillPercent: 75, shapeCounts: { cube: 1, halfA: 1 }
  });
}

function mountTool(scan, overrides = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({
    _introShownOnce: true, worldActive: true, tutorialDismissed: true, activeLesson: 'volumeExplorer',
    touchMode: true, score: 0, totalQ: 3, answeredNpcs: {}, npcAnswerDrafts: { 'Counting Coach': 'My draft' },
    volumePrediction: '10', volumeEstimateCommitment: null, showGeometryHome: false,
    measureResult: scan, measureHistory: []
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
  return mounted;
}

function card(view) { return view.container.querySelector('.gw-measure-card'); }
function details(view) { return card(view).querySelector('.gw-measure-details'); }
function dimensions(view) { return card(view).querySelector('.gw-measure-dimensions'); }
function openDetails(view) {
  const disclosure = details(view);
  React.act(() => { disclosure.open = true; disclosure.dispatchEvent(new Event('toggle')); });
  return disclosure;
}
function hasVisibleUnitLabel(view) {
  const region = dimensions(view);
  expect(region.getAttribute('aria-label')).toMatch(/units/i);
  const caption = card(view).querySelector('.gw-measure-dimension-caption');
  expect(caption.textContent).toMatch(/\bunits\b/);
  expect(details(view).contains(caption)).toBe(false);
  expect(details(view).contains(region)).toBe(false);
}

beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld'); });
beforeEach(() => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
  window.localStorage.removeItem('allo.geometryworld.hud.v1');
  window.THREE = makeThreeStub(); window[ENGINE_KEY] = makeEngine();
});
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ORIGINAL_UA });
});

describe('Geometry World compact measurement clarity', () => {
  it('names filled whole-cube prism dimensions and supplies visible linear units', () => {
    const view = mountTool(solid());
    expect(card(view).textContent).toContain('Prism dimensions');
    expect(card(view).textContent).not.toContain('Bounding-box dimensions');
    expect(card(view).querySelector('[data-geometry-dimension-model]').dataset.geometryDimensionModel).toBe('prism');
    expect(details(view).open).toBe(false); hasVisibleUnitLabel(view);
    expect(Array.from(dimensions(view).querySelectorAll('strong')).map(node => node.textContent)).toEqual(['2', '2', '3']);
  });

  it.each([['composite', composite], ['hollow', hollow], ['fractional', fractional]])
    ('names %s enclosing dimensions as bounding-box dimensions, not filled prism edges', (_kind, fixture) => {
      const view = mountTool(fixture());
      expect(card(view).textContent).toContain('Bounding-box dimensions');
      expect(card(view).textContent).not.toContain('Prism dimensions');
      expect(card(view).querySelector('[data-geometry-dimension-model]').dataset.geometryDimensionModel).toBe('bounding-box');
      expect(card(view).textContent).toContain('Grid-cell spans, including gaps and partial cells.');
      hasVisibleUnitLabel(view);
    });

  it('retains occupied volume rather than multiplying composite enclosing dimensions', () => {
    const view = mountTool(composite());
    expect(card(view).querySelector('[data-geometry-occupied-volume]').textContent).toBe('Occupied volume8 cubic units');
    expect(details(view).textContent).toContain('Bounding box 12');
    expect(details(view).textContent).not.toContain('V = 2');
  });

  it('retains the hollow opening instead of showing the full enclosing capacity as volume', () => {
    const view = mountTool(hollow());
    expect(card(view).querySelector('[data-geometry-occupied-volume]').textContent).toBe('Occupied volume8 cubic units');
    expect(details(view).textContent).toContain('Bounding box 9');
    expect(details(view).textContent).toContain('empty 1');
  });

  it('keeps piece count distinct from fractional occupied volume', () => {
    const view = mountTool(fractional());
    expect(card(view).querySelector('[data-geometry-occupied-volume]').textContent).toBe('Occupied volume1 1/2 cubic units');
    expect(card(view).querySelector('.gw-measure-block-count').textContent).toContain('2 blocks');
    expect(card(view).querySelector('.gw-measure-block-count').textContent).toContain('\u00bd');
  });

  it('labels fractional-cell dimensions as grid spans rather than physical mesh dimensions', () => {
    const scan = measurement(cells(1, 1, 1), [1, 1, 1], {
      totalVolume: 0.5, fillPercent: 50, shapeCounts: { halfA: 1 }
    });
    const view = mountTool(scan);
    expect(card(view).querySelector('[data-geometry-dimension-model]').dataset.geometryDimensionModel).toBe('bounding-box');
    expect(card(view).textContent).toContain('Grid-cell spans, including gaps and partial cells.');
    expect(Array.from(dimensions(view).querySelectorAll('strong')).map(node => node.textContent)).toEqual(['1', '1', '1']);
    expect(card(view).querySelector('[data-geometry-occupied-volume]').textContent).toBe('Occupied volume1/2 cubic units');
  });

  it.each([['prism', solid, 32], ['composite', composite, 28], ['hollow', hollow, 32]])
    ('shows exact %s exposed surface with square units outside closed details', (_kind, fixture, expectedSurface) => {
      const view = mountTool(fixture());
      const summary = card(view).querySelector('[data-geometry-surface-summary]');
      expect(summary.dataset.geometrySurfaceSummary).toBe('exact');
      expect(summary.textContent).toContain('Exposed surface area');
      expect(summary.textContent).toContain(expectedSurface + ' square units');
      expect(summary.textContent).not.toContain('cubic units');
      expect(details(view).open).toBe(false); expect(details(view).contains(summary)).toBe(false);
    });

  it('keeps unavailable fractional surface visible without fabricated square units', () => {
    const view = mountTool(fractional());
    const summary = card(view).querySelector('[data-geometry-surface-summary]');
    expect(summary.dataset.geometrySurfaceSummary).toBe('unavailable');
    expect(summary.querySelector('.gw-measure-surface-unavailable').textContent).toBe('Exact exposed surface area is unavailable for partial blocks.');
    expect(summary.textContent).not.toMatch(/square units|press N/i);
    expect(details(view).contains(summary)).toBe(false);
  });

  it('keeps the incomplete-scan surface limit visible outside the disclosure', () => {
    const view = mountTool(Object.assign(solid(), { isComplete: false }));
    const summary = card(view).querySelector('[data-geometry-surface-summary]');
    expect(summary.dataset.geometrySurfaceSummary).toBe('unavailable');
    expect(summary.querySelector('.gw-measure-surface-unavailable').textContent).toBe('Surface area unavailable until the full structure is measured');
    expect(summary.textContent).not.toContain('square units');
    expect(details(view).contains(summary)).toBe(false);
  });

  it('omits exact dimensions for an incomplete scan and labels volume as a lower bound', () => {
    const view = mountTool(Object.assign(solid(), { isComplete: false }));
    expect(dimensions(view)).toBeNull();
    expect(card(view).textContent).not.toMatch(/Prism dimensions|Bounding-box dimensions/);
    expect(card(view).querySelector('[data-geometry-occupied-volume]').textContent).toBe('Occupied volume, at least12 cubic units');
    expect(card(view).querySelector('[data-geometry-measurement-incomplete]')).toBeTruthy();
    expect(card(view).textContent).not.toContain('V = ');
  });

  it('honestly marks fractional surface area unavailable without promising an N-key analysis', () => {
    const view = mountTool(fractional());
    const surface = card(view).querySelector('[data-geometry-surface-area]');
    expect(surface.dataset.geometrySurfaceArea).toBe('partial');
    expect(surface.textContent).toMatch(/unavailable/i);
    expect(surface.textContent).toMatch(/partial|fractional/i);
    expect(surface.textContent).not.toMatch(/press N|square units|surface area\s*=/i);
  });

  it('never presents incomplete exposed surface as exact square-unit evidence', () => {
    const view = mountTool(Object.assign(solid(), { isComplete: false }));
    const surface = card(view).querySelector('[data-geometry-surface-area]');
    expect(surface.dataset.geometrySurfaceArea).toBe('partial');
    expect(surface.textContent).toMatch(/unavailable/i);
    expect(surface.textContent).not.toMatch(/square units|surface area\s*=/i);
  });

  it('switches dimension meaning when an equivalent measurement replacement becomes composite', () => {
    const view = mountTool(solid());
    openDetails(view);
    view.patch({ measureResult: composite() });
    expect(card(view).textContent).toContain('Bounding-box dimensions');
    expect(card(view).textContent).not.toContain('Prism dimensions');
    expect(details(view).open).toBe(true);
    expect(card(view).querySelector('[data-geometry-occupied-volume]').textContent).toBe('Occupied volume8 cubic units');
  });

  it('does not reference an unmounted notebook with aria-controls and still opens its records', () => {
    const view = mountTool(solid(), { hudPanel: '', measureHistory: [{
      L: 2, W: 2, H: 3, occupiedVolume: 12, vol: '12', boundingVolume: 12,
      blocks: 12, isSolidPrism: true, isComplete: true, surfaceAreaExact: true, surfaceArea: 32, t: 1000
    }] });
    const trigger = card(view).querySelector('.gw-notebook-trigger');
    expect(trigger).toBeTruthy();
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(view.container.querySelector('#gw-history-panel')).toBeNull();
    React.act(() => trigger.click());
    const notebook = view.container.querySelector('#gw-history-panel');
    expect(notebook).toBeTruthy();
    expect(notebook.getAttribute('role')).toBe('region');
    expect(notebook.textContent).toContain('Measurement notebook');
    expect(notebook.querySelector('#gw-notebook-view-records').hidden).toBe(false);
  });

  it('renders the adaptive compact layout contract without shrinking metric rows or its close heading', () => {
    const view = mountTool(fractional());
    const css = view.container.querySelector('style[data-gw-clarity]').textContent;
    expect(css).toContain('.gw-measure-card[data-measurement-compact="true"][data-details-open="false"]{max-height:min(460px,calc(100% - 140px))!important}');
    expect(css).toContain('.gw-measure-card>*{flex-shrink:0}');
    expect(css).toContain('.gw-measure-card .gw-measure-heading{position:sticky;top:-16px;z-index:2}');
    expect(css).toContain('@media(max-width:800px) and (orientation:portrait)');
    expect(css).toContain('max-height:min(460px,calc(100% - var(--gw-toolbar-height,58px) - 320px))!important');
    expect(css).toContain('[data-build-tools="open"] .gw-measure-card[data-measurement-compact="true"][data-details-open="false"]{max-height:min(460px,calc(100% - var(--gw-toolbar-height,58px) - 486px))!important}');
    expect(css).toContain('[data-ui-text-size="large"] :is(.gw-measure-dimension,.gw-measure-volume,.gw-measure-volume-value){font-size:15px!important;line-height:1.5}');
  });

  it('isolates touch inspection chrome and respects system text and button colors', () => {
    const view = mountTool(fractional());
    const css = view.container.querySelector('style[data-gw-clarity]').textContent;
    expect(css).toContain('[data-touch-active="true"]:has(>.gw-measure-card) .gwe-builder-dock[data-collapsed="true"]{visibility:hidden;pointer-events:none}');
    expect(css).toContain('@media(max-width:800px) and (max-height:600px) and (orientation:portrait)');
    expect(css).toContain(':has(>.gw-measure-card) :is(.gw-touch-controls,.gw-hotbar,.gw-shape-tray,.gw-action-bar){display:none!important}');
    expect(css).toContain('max-height:calc(100% - var(--gw-toolbar-height,58px) - 28px)!important');
    expect(css).not.toContain('max-height:min(460px,calc(100% - var(--gw-toolbar-height,58px) - 240px))!important');
    expect(css).toContain('.gw-measure-card *{color:CanvasText!important;border-color:CanvasText!important}');
    expect(css).toContain('.gw-measure-card .gw-notebook-trigger{background:ButtonFace!important;color:ButtonText!important;border-color:ButtonText!important}');
    expect(css).toContain(':is(.gw-measure-heading>[role="status"],.gw-measure-details-toggle){font-size:15px!important;line-height:1.5}');
  });

  it('does not reveal keyed question feedback or change learner drafts by inspecting measurements', () => {
    const scan = fractional();
    const view = mountTool(scan); const initial = view.bucket();
    const scanBefore = JSON.stringify(scan);
    const protectedState = JSON.stringify({ score: initial.score, answeredNpcs: initial.answeredNpcs,
      npcAnswerDrafts: initial.npcAnswerDrafts, volumePrediction: initial.volumePrediction,
      volumeEstimateCommitment: initial.volumeEstimateCommitment });
    openDetails(view);
    const current = view.bucket();
    expect(JSON.stringify({ score: current.score, answeredNpcs: current.answeredNpcs,
      npcAnswerDrafts: current.npcAnswerDrafts, volumePrediction: current.volumePrediction,
      volumeEstimateCommitment: current.volumeEstimateCommitment })).toBe(protectedState);
    expect(JSON.stringify(scan)).toBe(scanBefore);
    expect(window[ENGINE_KEY].logEvent.mock.calls.some(([type]) => type === 'npc_answer' || type === 'question_answer')).toBe(false);
    expect(view.container.querySelector('[data-geometry-answer-feedback]')).toBeNull();
  });
});
