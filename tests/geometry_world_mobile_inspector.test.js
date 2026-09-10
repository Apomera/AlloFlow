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
    ['set','copy','add','sub','subVectors','normalize','multiplyScalar','applyQuaternion','setFromQuaternion','crossVectors','cross','lerp','addScaledVector','setY','round','floor','setScalar','applyEuler'].forEach(name => { value[name] = () => value; });
    value.clone = () => vec(); value.distanceTo = () => 99; value.length = () => 1; value.dot = () => 0;
    return value;
  }
  return new Proxy({}, { get: (_target, property) => property === 'SRGBColorSpace' ? 'srgb' : typeof property === 'symbol' ? undefined : function() { return vec(); } });
}

function makeEngine() {
  return {
    clearWorld() {}, scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: {
      position: { x: 0, y: 0, z: 0, distanceTo() { return 99; }, set() {}, clone() { return { x: 0, y: 0, z: 0 }; } },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection(value) { return value || { x: 0, y: 0, z: -1 }; }, updateProjectionMatrix() {}
    },
    blocks: {}, npcs: [], blocksPlaced: 0, sessionLog: [], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [], _redoStack: [], _coordAnnounce: false, _targetGrid: null,
    _jumpLock: false, _sessionXP: 0, _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
    loadLesson() {}, logEvent() {}, undo() {}, redo() {}, returnToSpawn() {}, clearPlayerBlocks() {},
    measureStructure() {}, placeBlock() {}, removeBlock() {},
    setLayerFocus: vi.fn(), clearLayerFocus: vi.fn(),
    applyRenderQuality(preference) { return { label: preference }; }
  };
}

function measurement(overrides) {
  return Object.assign({ count: 12, L: 2, W: 2, H: 3, boundingVolume: 12, totalVolume: 12,
    shapeCounts: { cube: 12 }, materialCounts: { stone: 12 }, blocks: [{ x: 0, y: 0, z: 0 }], isComplete: true }, overrides);
}

function mountTool(overrides) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({
    _introShownOnce: true, worldActive: true, tutorialDismissed: true, activeLesson: 'builderSandbox',
    touchMode: true, measureResult: measurement(), measureHistory: [{ t: 1000, isComplete: true }]
  }, overrides) };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = Object.assign({}, toolData[section], { [key]: value }); if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = Object.assign({}, toolData[section], patch); if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, toolData, patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); } };
  return mounted;
}

function disclosure(view) { return view.container.querySelector('.gw-measure-details'); }
function openDetails(view, open = true) {
  const details = disclosure(view);
  React.act(() => { details.open = open; details.dispatchEvent(new Event('toggle')); });
  expect(details.open).toBe(open);
  return details;
}
function click(node) { React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }

beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld'); });
beforeEach(() => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' });
  window.localStorage.removeItem('allo.geometryworld.hud.v1');
  window.THREE = makeThreeStub(); window[ENGINE_KEY] = makeEngine();
});
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: ORIGINAL_UA });
});

describe('Geometry World compact measurement inspector', () => {
  it('shows dimensions and accurate volume above a closed native phone disclosure', () => {
    const view = mountTool();
    const card = view.container.querySelector('.gw-measure-card');
    expect(card.getAttribute('role')).toBe('region');
    expect(card.getAttribute('aria-label')).toBe('Measurement inspector');
    expect(card.dataset.measurementCompact).toBe('true'); expect(card.dataset.detailsOpen).toBe('false');
    expect(view.container.querySelector('#geoworld-fs-workspace').dataset.measurementExpanded).toBe('false');
    const details = disclosure(view); expect(details.tagName).toBe('DETAILS'); expect(details.open).toBe(false);
    expect(details.querySelector('summary').textContent).toBe('Explore measurement details');
    expect(Array.from(card.querySelectorAll('.gw-measure-dimension')).map(node => node.textContent)).toEqual(['Length2', 'Width2', 'Height3']);
    const volume = card.querySelector('[data-geometry-occupied-volume="true"]');
    expect(volume.textContent).toBe('Occupied volume12 cubic units');
    expect(details.contains(volume)).toBe(false); expect(details.contains(card.querySelector('.gw-measure-dimensions'))).toBe(false);
    expect(details.textContent).toContain('V = 2 × 2 × 3 = 12');
    expect(details.querySelector('[aria-label="Layer explorer"]')).toBeTruthy();
    expect(details.querySelector('[data-geometry-surface-area]')).toBeTruthy();
  });

  it('toggles with native disclosure state and retains focus on its summary', () => {
    const view = mountTool(); const summary = disclosure(view).querySelector('summary');
    React.act(() => summary.focus()); expect(document.activeElement).toBe(summary);
    openDetails(view); expect(view.container.querySelector('.gw-measure-card').dataset.detailsOpen).toBe('true');
    expect(view.container.querySelector('#geoworld-fs-workspace').dataset.measurementExpanded).toBe('true');
    expect(document.activeElement).toBe(summary);
    openDetails(view, false); expect(view.container.querySelector('.gw-measure-card').dataset.detailsOpen).toBe('false');
    expect(view.container.querySelector('#geoworld-fs-workspace').dataset.measurementExpanded).toBe('false');
    expect(document.activeElement).toBe(summary);
  });

  it('keeps expanded details and focused controls through equivalent polling replacements', () => {
    const view = mountTool(); const details = openDetails(view); const slider = details.querySelector('#gw-layer-focus');
    React.act(() => slider.focus());
    for (let index = 0; index < 3; index++) view.patch({ measureResult: measurement(), measureHistory: [{ t: 1000, isComplete: true }] });
    expect(disclosure(view)).toBe(details); expect(details.open).toBe(true); expect(document.activeElement).toBe(slider);
  });

  it('keeps expanded details while the selected connected build changes dimensions', () => {
    const view = mountTool(); const details = openDetails(view); const slider = details.querySelector('#gw-layer-focus');
    React.act(() => slider.focus());
    view.patch({ measureResult: measurement({ count: 16, H: 4, boundingVolume: 16, totalVolume: 16, shapeCounts: { cube: 16 } }) });
    expect(details.open).toBe(true); expect(document.activeElement).toBe(slider); expect(slider.max).toBe('4');
    expect(view.container.querySelector('.gw-measure-volume-value').textContent).toBe('16 cubic units');
  });

  it('starts compact for a new explicit measurement even if dimensions match', () => {
    const view = mountTool(); openDetails(view);
    view.patch({ measureResult: measurement(), measureHistory: [{ t: 1000 }, { t: 2000 }] });
    expect(disclosure(view).open).toBe(false);
  });

  it('starts compact when the active lesson changes', () => {
    const view = mountTool(); openDetails(view); view.patch({ activeLesson: 'volumeExplorer' });
    expect(disclosure(view).open).toBe(false);
  });

  it('closes measurement without clearing the retained build selection and reopens compact', () => {
    const engine = window[ENGINE_KEY]; const selected = { blocks: [{ x: 2, y: 1, z: 0 }] }; engine._builderSelection = selected;
    const view = mountTool(); openDetails(view); engine.clearLayerFocus.mockClear();
    click(view.container.querySelector('[aria-label="Close measurement inspector"]'));
    expect(view.toolData.geometryWorld.measureResult).toBeNull(); expect(view.container.querySelector('.gw-measure-card')).toBeNull();
    expect(view.container.querySelector('#geoworld-fs-workspace').dataset.measurementExpanded).toBe('false');
    expect(engine.clearLayerFocus).toHaveBeenCalledTimes(1); expect(engine._builderSelection).toBe(selected);
    view.patch({ measureResult: measurement() }); expect(disclosure(view).open).toBe(false);
  });

  it('preserves layer controls and resets the revealed layer with Show all layers', () => {
    const engine = window[ENGINE_KEY]; const view = mountTool(); openDetails(view);
    const slider = view.container.querySelector('#gw-layer-focus');
    React.act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '2');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(engine.setLayerFocus).toHaveBeenCalledWith(2);
    expect(slider.getAttribute('aria-valuetext')).toBe('Layers 1 through 2 of 3 visible');
    const reset = view.container.querySelector('[aria-label="Show all layers"]'); expect(reset.disabled).toBe(false);
    engine.clearLayerFocus.mockClear(); click(reset); expect(engine.clearLayerFocus).toHaveBeenCalledTimes(1);
    expect(slider.getAttribute('aria-valuetext')).toBe('All layers visible'); expect(disclosure(view).open).toBe(true);
  });

  it('keeps all teaching details expanded on desktop', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    const view = mountTool({ touchMode: false });
    expect(view.container.querySelector('.gw-measure-card').dataset.measurementCompact).toBe('false');
    expect(disclosure(view).open).toBe(true);
    view.patch({ measureResult: measurement(), measureHistory: [{ t: 2000 }] }); expect(disclosure(view).open).toBe(true);
  });

  it('does not label fractional block counts as cubic units in an incomplete measurement', () => {
    const view = mountTool({ measureResult: measurement({ count: 8, totalVolume: 2.5, occupiedVolume: 2.5, isComplete: false, shapeCounts: { quarter: 6, slab: 2 }, hasFractions: true }) });
    const card = view.container.querySelector('.gw-measure-card');
    expect(card.querySelector('.gw-measure-volume').textContent).toMatch(/^Occupied volume, at least2/);
    expect(card.querySelector('.gw-measure-volume-value strong').textContent).not.toBe('8');
    expect(card.querySelector('.gw-measure-dimensions')).toBeNull();
    expect(card.querySelector('[role="alert"]').textContent).toContain('partial and not exact');
    expect(disclosure(view).textContent).toContain('Counted at least 8 connected blocks');
    expect(disclosure(view).textContent).not.toContain('8 cubic units');
    expect(disclosure(view).textContent).toContain('Surface area unavailable until the full structure is measured');
  });

  it('keeps composite occupied volume distinct from its bounding-box equation', () => {
    const view = mountTool({ measureResult: measurement({ count: 3, L: 2, W: 1, H: 2, boundingVolume: 4, totalVolume: 2.5, shapeCounts: { cube: 2, slab: 1 }, materialCounts: { stone: 2, wood: 1 }, hasFractions: true }) });
    const content = disclosure(view).textContent;
    expect(content).toContain('Occupied volume ='); expect(content).toContain('Bounding box 4');
    expect(content).not.toContain('V = 2 × 1 × 2 =');
    expect(disclosure(view).querySelector('[data-geometry-material-breakdown="true"]').textContent).toContain('Materials: 2 stone, 1 wood');
  });
});
