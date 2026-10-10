import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const ENGINE_KEY = '__geoWorldEngine';
const PREFERENCE_KEY = 'allo.geometryworld.hud.v1';
let cfg, mounted;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThreeStub() {
  function vector() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    for (const name of ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion',
      'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler'])
      value[name] = () => value;
    value.clone = () => vector(); value.distanceTo = () => 99; value.length = () => 1; value.dot = () => 0;
    return value;
  }
  return new Proxy({}, { get(_target, property) {
    if (property === 'SRGBColorSpace') return 'srgb';
    if (typeof property === 'symbol') return undefined;
    return function() { return vector(); };
  } });
}

function record(overrides = {}) {
  return { L: 2, W: 2, H: 3, occupiedVolume: 12, vol: '12', boundingVolume: 12, blocks: 12,
    isSolidPrism: true, isComplete: true, surfaceAreaExact: true, surfaceArea: 32, t: 1000, ...overrides };
}

function makeEngine() {
  const engine = {
    clearWorld: vi.fn(), scene: { remove() {} }, renderer: { dispose() {}, domElement: document.createElement('canvas') },
    camera: { position: { x: 3, y: 5, z: 8, distanceTo: () => 99, set() {}, clone: () => ({ x: 3, y: 5, z: 8 }) },
      quaternion: { x: 0, y: 0, z: 0, w: 1 }, rotation: { x: 0, y: 0, z: 0 },
      getWorldDirection: value => value || { x: 0, y: 0, z: -1 }, updateProjectionMatrix() {} },
    blocks: { '0,1,0': { userData: { gridPos: { x: 0, y: 1, z: 0 }, blockType: 'stone', shape: 'cube' } } },
    npcs: [], blocksPlaced: 7, sessionLog: [{ type: 'preserved' }], raycaster: null,
    flyMode: false, moveState: {}, velocity: { x: 0, y: 0, z: 0 }, onGround: true,
    _undoStack: [{ id: 'kept-undo' }], _redoStack: [{ id: 'kept-redo' }], _coordAnnounce: false, _targetGrid: null,
    _jumpLock: false, _sessionXP: 5, _crosshairTarget: 'none', _inWater: false, _inLava: false, _gridHelper: null,
    _predictionState: { input: '', strategy: '', reason: '', observedTargetKeys: [], history: [record()] },
    loadLesson: vi.fn(), logEvent: vi.fn(), undo() {}, redo() {}, returnToSpawn() {}, clearPlayerBlocks() {},
    placeBlock: vi.fn(), removeBlock: vi.fn(), clearLayerFocus: vi.fn(),
    applyRenderQuality: preference => ({ label: preference })
  };
  engine.blockUnderCrosshair = vi.fn(() => ({ object: engine.blocks['0,1,0'] }));
  engine.measureStructure = vi.fn(() => ({ ...record(), minX: 0, minY: 1, minZ: 0, count: 12,
    blocks: [{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }] }));
  return engine;
}

function mountTool(overrides = {}) {
  const engine = makeEngine(); window[ENGINE_KEY] = engine;
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: {
    _introShownOnce: true, tutorialDismissed: true, worldActive: true, activeLesson: 'volumeExplorer',
    showPredictionPanel: true, showGeometryHome: false, score: 2, totalQ: 4, answeredNpcs: { 0: true },
    npcAnswerDrafts: { 1: { step: 0, text: 'My unfinished explanation' } },
    measureHistory: [record(), record({ t: 2000 })], reflectionText: 'I counted equal layers.',
    objectiveChecks: { volumeExplorer: { 0: true } },
    volumePrediction: '10 1/2', predictionStrategy: 'layers', predictionReason: 'I counted equal layers.', ...overrides
  } };
  let bump;
  const context = makeCtx({ toolData,
    update(section, key, value) { toolData[section] = { ...toolData[section], [key]: value }; if (bump) bump(); },
    updateMulti(section, patch) { toolData[section] = { ...toolData[section], ...patch }; if (bump) bump(); }
  });
  function Host() { const state = React.useState(0); bump = () => state[1](value => value + 1); return cfg.render(context); }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, engine, bucket: () => toolData.geometryWorld,
    patch(value) { React.act(() => context.updateMulti('geometryWorld', value)); } };
  return mounted;
}

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function write(node, value) {
  expect(node).toBeTruthy();
  React.act(() => {
    const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    if (node.tagName !== 'SELECT') node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function drawer(view) { return view.container.querySelector('#gw-prediction-panel'); }
function field(view, id) { return view.container.querySelector('#' + id); }
function action(view) { return drawer(view).querySelector('[data-geometry-estimate-action]'); }
function learningEvidence(view) {
  return structuredClone(Object.fromEntries(['activeLesson', 'worldActive', 'score', 'totalQ', 'answeredNpcs',
    'npcAnswerDrafts', 'measureHistory', 'reflectionText', 'objectiveChecks'].map(name => [name, view.bucket()[name]])));
}
function worldEvidence(view) {
  return structuredClone({ blocks: view.engine.blocks, undo: view.engine._undoStack, redo: view.engine._redoStack,
    placed: view.engine.blocksPlaced, log: view.engine.sessionLog });
}
function useLargerText() {
  localStorage.setItem(PREFERENCE_KEY, JSON.stringify({ version: 1, preset: 'minimal', toolbarCollapsed: false,
    uiTextSize: 'large', uiSurface: 'solid', showCoordinates: true, showStationCompass: true }));
}

// Assert the explicit Larger contract here; browser QA verifies the final cascade and geometry.
function largerFont(node) {
  expect(node).toBeTruthy();
  const values = [];
  function visit(rules) {
    for (const rule of rules) {
      if (rule.cssRules) visit(rule.cssRules);
      if (!rule.selectorText || !rule.selectorText.includes('[data-ui-text-size="large"]')) continue;
      const fontSize = rule.style.getPropertyValue('font-size');
      if (node.matches(rule.selectorText) && fontSize) values.push(parseFloat(fontSize));
    }
  }
  for (const sheet of document.styleSheets) visit(sheet.cssRules);
  const direct = values.filter(Number.isFinite);
  if (direct.length) return Math.max(...direct);
  return node.parentElement ? largerFont(node.parentElement) : 0;
}

beforeAll(() => {
  resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld');
}, 120000);
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); window.THREE = makeThreeStub(); });
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('readable estimate drawer', () => {
  it.each([
    ['gw-volume-prediction', 'Estimated volume'], ['gw-prediction-strategy', 'Strategy'], ['gw-prediction-reason', 'Reason']
  ])('associates the visible %s label with its native control', (id, expected) => {
    const view = mountTool(); const input = field(view, id);
    const label = drawer(view).querySelector('label[for="' + id + '"]');
    expect(label).toBeTruthy(); expect(label.control).toBe(input); expect(label.textContent).toContain(expected);
    expect(label.closest('[hidden]')).toBeNull(); expect(label.closest('.gw-prediction-field')).toBeTruthy();
  });

  it('shows the full cubic-unit quantity instead of an unexplained cu abbreviation', () => {
    const view = mountTool(); const label = drawer(view).querySelector('label[for="gw-volume-prediction"]');
    expect(label.textContent).toContain('cubic units');
    expect([...drawer(view).querySelectorAll('span')].some(node => node.textContent.trim() === 'cu')).toBe(false);
    expect(field(view, 'gw-volume-prediction').getAttribute('aria-label')).toBe('Estimated volume in cubic units');
    expect(field(view, 'gw-prediction-strategy').getAttribute('aria-label')).toBe('Estimation strategy');
    expect(field(view, 'gw-prediction-reason').getAttribute('aria-label')).toBe('Brief reason for estimate');
  });

  it.each(['24', '0.5', '3/4', '2 1/4'])('keeps a supported numeric draft %s editable and uncommitted', value => {
    const view = mountTool(); const before = learningEvidence(view); const world = worldEvidence(view);
    write(field(view, 'gw-volume-prediction'), value);
    expect(view.bucket().volumePrediction).toBe(value); expect(action(view).disabled).toBe(false);
    expect(drawer(view).getAttribute('data-geometry-estimate-locked')).toBe('false');
    expect(view.bucket().volumeEstimateCommitment).toBeUndefined();
    expect(learningEvidence(view)).toEqual(before); expect(worldEvidence(view)).toEqual(world);
    expect(view.engine.measureStructure).not.toHaveBeenCalled(); expect(view.engine.logEvent).not.toHaveBeenCalled();
  });

  it.each(['0', '-2', '1/0', 'words'])('retains the invalid draft %s without making a commitment', value => {
    const view = mountTool(); write(field(view, 'gw-volume-prediction'), value);
    expect(field(view, 'gw-volume-prediction').value).toBe(value); expect(action(view).disabled).toBe(true);
    expect(field(view, 'gw-volume-prediction').getAttribute('aria-invalid')).toBe('true');
    expect(view.bucket().volumeEstimateCommitment).toBeUndefined(); expect(view.engine.measureStructure).not.toHaveBeenCalled();
  });

  it('locks all three authored fields and restores the same draft when changing the estimate', () => {
    const view = mountTool(); const before = learningEvidence(view); const world = worldEvidence(view);
    click(action(view));
    expect(view.bucket().volumeEstimateCommitment).toMatchObject({ prediction: 10.5,
      strategy: 'layers', reason: 'I counted equal layers.' });
    expect(drawer(view).getAttribute('data-geometry-estimate-locked')).toBe('true');
    for (const id of ['gw-volume-prediction', 'gw-prediction-strategy', 'gw-prediction-reason']) expect(field(view, id).disabled).toBe(true);
    expect(action(view).getAttribute('data-geometry-estimate-action')).toBe('change');
    click(action(view));
    for (const id of ['gw-volume-prediction', 'gw-prediction-strategy', 'gw-prediction-reason']) expect(field(view, id).disabled).toBe(false);
    expect(field(view, 'gw-volume-prediction').value).toBe('10 1/2'); expect(field(view, 'gw-prediction-strategy').value).toBe('layers');
    expect(field(view, 'gw-prediction-reason').value).toBe('I counted equal layers.');
    expect(view.bucket().volumeEstimateCommitment).toBeNull();
    expect(learningEvidence(view)).toEqual(before); expect(worldEvidence(view)).toEqual(world);
    expect(view.engine.placeBlock).not.toHaveBeenCalled(); expect(view.engine.removeBlock).not.toHaveBeenCalled();
  });

  it('keeps updated strategy and reason intact when the drawer closes and opens again', () => {
    const view = mountTool(); const before = learningEvidence(view); const world = worldEvidence(view);
    write(field(view, 'gw-prediction-strategy'), 'decomposition'); write(field(view, 'gw-prediction-reason'), 'I split the structure into two prisms.');
    click(drawer(view).querySelector('.gw-prediction-close')); expect(drawer(view)).toBeNull();
    view.patch({ showPredictionPanel: true });
    expect(field(view, 'gw-prediction-strategy').value).toBe('decomposition');
    expect(field(view, 'gw-prediction-reason').value).toBe('I split the structure into two prisms.');
    expect(field(view, 'gw-volume-prediction').value).toBe('10 1/2');
    expect(learningEvidence(view)).toEqual(before); expect(worldEvidence(view)).toEqual(world);
    expect(view.engine.logEvent).not.toHaveBeenCalled();
  });
});

describe('Larger learning-surface typography contracts', () => {
  it.each([
    ['label[for="gw-volume-prediction"]', 16], ['label[for="gw-prediction-strategy"]', 16],
    ['label[for="gw-prediction-reason"]', 16], ['#gw-volume-prediction', 16],
    ['#gw-prediction-strategy', 16], ['#gw-prediction-reason', 16], ['[data-geometry-estimate-action]', 16],
    ['#gw-volume-estimate-status', 16], ['[data-geometry-prediction-scaffold]', 16], ['.gw-prediction-title', 18]
  ])('provides at least %s Larger typography in the estimate drawer', (selector, minimum) => {
    useLargerText(); const view = mountTool();
    expect(view.container.querySelector('#geoworld-fs-workspace').getAttribute('data-ui-text-size')).toBe('large');
    expect(largerFont(drawer(view).querySelector(selector))).toBeGreaterThanOrEqual(minimum);
  });

  it.each([
    ['.gw-retrieval-title', 16], ['#gw-retrieval-prompt', 16], ['label[for="gw-retrieval-answer"]', 16],
    ['#gw-retrieval-answer', 16], ['.gw-retrieval-button', 16], ['[data-geometry-retrieval-result]', 16],
    ['.gw-notebook-caption', 14], ['.gw-notebook-estimate summary', 16], ['.gw-notebook-estimate p', 14]
  ])('honors Larger text for notebook %s', (selector, minimum) => {
    useLargerText(); const view = mountTool({ showPredictionPanel: false, hudPanel: 'history',
      measureHistory: [record({ prediction: 10, strategy: 'layers', reason: 'Layer reasoning.' }), record({ t: 2000, prediction: 11 })],
      retrievalResult: { checkpointId: 'retrieval-2000-scale_height', correct: false, valid: true, feedback: 'Check the layers.' } });
    expect(largerFont(view.container.querySelector('#gw-history-panel').querySelector(selector))).toBeGreaterThanOrEqual(minimum);
  });
});

describe('notebook practice support associations', () => {
  it.each(['words', '5'])('associates current feedback for %s and removes it after editing', answer => {
    const view = mountTool({ showPredictionPanel: false, hudPanel: 'history' });
    click(view.container.querySelector('#gw-notebook-tab-practice'));
    const input = field(view, 'gw-retrieval-answer');
    expect(input.getAttribute('aria-describedby')).toBe('gw-retrieval-prompt');
    write(input, answer);
    React.act(() => view.container.querySelector('.gw-retrieval-controls').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })));
    const feedback = field(view, 'gw-retrieval-feedback');
    expect(feedback).toBeTruthy(); expect(feedback.getAttribute('role')).toBe('status');
    expect(input.getAttribute('aria-describedby')).toBe('gw-retrieval-prompt gw-retrieval-feedback');
    expect(feedback.textContent).toBe(view.bucket().retrievalResult.feedback);
    expect(input.getAttribute('aria-invalid')).toBe(answer === 'words' ? 'true' : 'false');
    write(input, '6');
    expect(input.getAttribute('aria-describedby')).toBe('gw-retrieval-prompt');
    expect(field(view, 'gw-retrieval-feedback')).toBeNull(); expect(view.bucket().retrievalResult).toBeNull();
  });

  it('does not associate feedback from a different checkpoint', () => {
    const view = mountTool({ showPredictionPanel: false, hudPanel: 'history',
      retrievalResult: { checkpointId: 'older-checkpoint', correct: false, valid: true, feedback: 'Old guidance.' } });
    expect(field(view, 'gw-retrieval-answer').getAttribute('aria-describedby')).toBe('gw-retrieval-prompt');
    expect(field(view, 'gw-retrieval-feedback')).toBeNull();
  });
});
