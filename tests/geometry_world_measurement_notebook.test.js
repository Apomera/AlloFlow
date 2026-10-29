import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const SOURCE = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
let cfg;
let mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function helper(name) {
  const result = SOURCE.match(new RegExp('  function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}'))?.[0];
  if (!result) throw new Error('Missing Geometry World helper: ' + name);
  return result;
}

const formatMeasurementQuantity = new Function(helper('formatVolume') + '\n' + helper('formatMeasurementQuantity') + '\nreturn formatMeasurementQuantity;')();
const measurementNotebookEntry = new Function(helper('formatVolume') + '\n' + helper('formatMeasurementQuantity') + '\n' + helper('parseVolumePrediction') + '\n' + helper('measurementNotebookEntry') + '\nreturn measurementNotebookEntry;')();
const compareMeasurementRecords = new Function(helper('parseVolumePrediction') + '\n' + helper('compareMeasurementRecords') + '\nreturn compareMeasurementRecords;')();
const formatMeasurementChange = new Function(helper('formatVolume') + '\n' + helper('formatMeasurementChange') + '\nreturn formatMeasurementChange;')();
const buildRetrievalCheckpoint = new Function(helper('formatVolume') + '\n' + helper('formatMeasurementQuantity') + '\n' + helper('parseVolumePrediction') + '\n' + helper('completeMeasurementRecords') + '\n' + helper('buildRetrievalCheckpoint') + '\nreturn buildRetrievalCheckpoint;')();
const checkRetrievalAnswer = new Function(helper('formatVolume') + '\n' + helper('formatMeasurementQuantity') + '\n' + helper('parseRetrievalAnswer') + '\n' + helper('checkRetrievalAnswer') + '\nreturn checkRetrievalAnswer;')();

function makeThreeStub() {
  function vec() {
    const value = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion',
      'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray'].forEach(name => { value[name] = () => value; });
    value.clone = () => vec(); value.distanceTo = () => 99; value.length = () => 1; value.lengthSq = () => 1;
    value.dot = () => 0; value.toArray = () => [0, 0, 0];
    return value;
  }
  return new Proxy({}, { get: (_target, property) => property === 'SRGBColorSpace' ? 'srgb' : typeof property === 'symbol' ? undefined : function() { return vec(); } });
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

function measurement(overrides) {
  return Object.assign(record(), { count: 12, totalVolume: 12, missingVolume: 0, fillPercent: 100,
    shapeCounts: { cube: 12 }, materialCounts: { stone: 12 }, blocks: [{ x: 0, y: 1, z: 0 }] }, overrides);
}

function mountTool(overrides) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({
    _introShownOnce: true, worldActive: true, tutorialDismissed: true, activeLesson: 'volumeExplorer',
    score: 0, totalQ: 3, objectivesOpen: false, hudPanel: 'history', showGeometryHome: false,
    measureHistory: [record(), record({ t: 2000 })]
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

function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function tab(view, name) { return view.container.querySelector('#gw-notebook-tab-' + name); }
function panel(view, name) { return view.container.querySelector('#gw-notebook-view-' + name); }
function write(node, value) {
  React.act(() => {
    const prototype = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
function submit(view) {
  const form = view.container.querySelector('form.gw-retrieval-controls');
  expect(form).toBeTruthy();
  const event = new Event('submit', { bubbles: true, cancelable: true });
  React.act(() => form.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
}
function retrievalEvents() { return window[ENGINE_KEY].sessionLog.filter(event => event.type === 'retrieval_check'); }
async function settleFocus() { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); }

beforeAll(() => {
  resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld');
});
beforeEach(() => {
  window.localStorage.removeItem('allo.geometryworld.hud.v1');
  window.THREE = makeThreeStub(); window[ENGINE_KEY] = makeEngine();
});
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); delete window[ENGINE_KEY]; delete window[ENGINE_KEY + '_failed']; document.body.innerHTML = '';
});

describe('Geometry World learner-controlled notebook support', () => {
  function retainedHistory() {
    return Array.from({ length: 10 }, (_, index) => record({ t: 1000 + index, isComplete: index < 2 }));
  }

  it('reveals older complete evidence without changing retained records or learner work', () => {
    const history = retainedHistory();
    const view = mountTool({ measureHistory: history, retrievalAnswer: '5', retrievalAttemptCount: 1, score: 4 });
    const before = JSON.stringify(view.bucket());
    const control = view.container.querySelector('.gw-notebook-record-scope input');
    expect(control.getAttribute('aria-controls')).toBe('gw-notebook-records');
    expect(control.closest('label').textContent).toBe('Show all 10 retained scans');
    expect(panel(view, 'records').querySelectorAll('.gw-history-row')).toHaveLength(5);
    expect(panel(view, 'records').textContent).not.toContain('Solid rectangular prism');
    control.focus(); click(control);
    expect(document.activeElement).toBe(control);
    expect(panel(view, 'records').querySelectorAll('.gw-history-row')).toHaveLength(10);
    expect(panel(view, 'records').textContent).toContain('Record 1');
    expect(panel(view, 'records').textContent).toContain('Solid rectangular prism');
    expect(panel(view, 'records').textContent).not.toContain('latest 5 shown');
    expect(view.bucket().measureHistory).toBe(history);
    expect(JSON.stringify(view.bucket())).toBe(before);
    expect(window[ENGINE_KEY].logEvent).not.toHaveBeenCalled();
    click(control);
    expect(panel(view, 'records').querySelectorAll('.gw-history-row')).toHaveLength(5);
  });

  it('keeps the chosen record scope across notebook views and reopening', () => {
    const view = mountTool({ measureHistory: retainedHistory() });
    click(view.container.querySelector('.gw-notebook-record-scope input'));
    click(tab(view, 'practice')); click(tab(view, 'records'));
    view.patch({ hudPanel: null }); view.patch({ hudPanel: 'history' });
    expect(view.container.querySelector('.gw-notebook-record-scope input').checked).toBe(true);
    expect(panel(view, 'records').querySelectorAll('.gw-history-row')).toHaveLength(10);
    expect(view.bucket()).not.toHaveProperty('showAllNotebookRecords');
  });

  it('starts a different lesson with the recent-record view', () => {
    const view = mountTool({ measureHistory: retainedHistory() });
    click(view.container.querySelector('.gw-notebook-record-scope input'));
    view.patch({ activeLesson: 'areaSurface' });
    expect(view.container.querySelector('.gw-notebook-record-scope input').checked).toBe(false);
    expect(panel(view, 'records').querySelectorAll('.gw-history-row')).toHaveLength(5);
  });

  it.each([1, 5])('shows every retained record without an unnecessary scope control at %s scans', count => {
    const view = mountTool({ measureHistory: retainedHistory().slice(0, count) });
    expect(view.container.querySelector('.gw-notebook-record-scope')).toBeNull();
    expect(panel(view, 'records').querySelectorAll('.gw-history-row')).toHaveLength(count);
  });

  it('offers a native optional hint without submitting an answer or consuming an attempt', () => {
    const view = mountTool({ retrievalAnswer: '5', retrievalAttemptCount: 1, score: 4 });
    click(tab(view, 'practice'));
    const before = JSON.stringify(view.bucket());
    const hint = panel(view, 'practice').querySelector('details[data-geometry-retrieval-hint]');
    expect(hint.open).toBe(false);
    click(hint.querySelector('summary'));
    expect(hint.open).toBe(true);
    expect(hint.querySelector('p').textContent).toBe(buildRetrievalCheckpoint(view.bucket().measureHistory).hint);
    click(tab(view, 'compare')); click(tab(view, 'practice'));
    expect(hint.open).toBe(true);
    expect(JSON.stringify(view.bucket())).toBe(before);
    expect(retrievalEvents()).toHaveLength(0);
    click(hint.querySelector('summary'));
    expect(hint.open).toBe(false);
  });

  it('keeps a hint open for the same question and closes it when the question changes', () => {
    const view = mountTool(); click(tab(view, 'practice'));
    const hint = panel(view, 'practice').querySelector('[data-geometry-retrieval-hint]');
    click(hint.querySelector('summary'));
    view.patch({ measureHistory: view.bucket().measureHistory.concat(record({ t: 3000, isComplete: false })) });
    expect(panel(view, 'practice').querySelector('[data-geometry-retrieval-hint]')).toBe(hint);
    expect(hint.open).toBe(true);
    view.patch({ measureHistory: view.bucket().measureHistory.concat(record({ t: 4000 })) });
    const nextHint = panel(view, 'practice').querySelector('[data-geometry-retrieval-hint]');
    expect(nextHint).not.toBe(hint); expect(nextHint.open).toBe(false);
    expect(nextHint.querySelector('p').textContent).toBe('Multiply the two dimensions of the base.');
  });

  it('marks a solved question as complete while guarding against repeat submission', () => {
    const view = mountTool(); click(tab(view, 'practice'));
    write(view.container.querySelector('#gw-retrieval-answer'), '6'); submit(view);
    const button = panel(view, 'practice').querySelector('.gw-retrieval-button');
    expect(button.textContent).toBe('Correct'); expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Answer correct');
    expect(panel(view, 'practice').querySelector('[data-geometry-practice-state]').dataset.geometryPracticeState).toBe('complete');
    const result = view.bucket().retrievalResult;
    submit(view);
    expect(view.bucket().retrievalResult).toBe(result);
    expect(retrievalEvents()).toHaveLength(1);
  });

  it('does not mark a new question invalid because an older checkpoint had a parse error', () => {
    const view = mountTool({ retrievalResult: { checkpointId: 'older-question', correct: false, valid: false, feedback: 'Old feedback.' } });
    click(tab(view, 'practice'));
    const input = view.container.querySelector('#gw-retrieval-answer');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.getAttribute('aria-describedby')).toBe('gw-retrieval-prompt');
    expect(panel(view, 'practice').querySelector('[data-geometry-practice-state]').dataset.geometryPracticeState).toBe('ready');
    expect(panel(view, 'practice').textContent).not.toContain('Old feedback.');
  });

  it('identifies the complete record behind Practice when newer scans are partial', () => {
    const view = mountTool({ measureHistory: retainedHistory() }); click(tab(view, 'practice'));
    expect(panel(view, 'practice').querySelector('[data-geometry-practice-source]').textContent)
      .toBe('Based on Record 2, the latest complete measurement.');
    view.patch({ measureHistory: [record(), record({ t: 2000 })] });
    expect(panel(view, 'practice').querySelector('[data-geometry-practice-source]')).toBeNull();
  });
});

describe('Geometry World measurement notebook record model', () => {
  it('distinguishes prism dimensions, occupied volume, and exposed surface', () => {
    expect(measurementNotebookEntry(record())).toMatchObject({ complete: true, kind: 'Solid rectangular prism',
      dimensionLabel: 'Prism dimensions', dimensions: '2 \u00d7 2 \u00d7 3 units', volumeLabel: 'Occupied volume', volume: '12', surfaceArea: '32' });
  });

  it('does not substitute bounding-box capacity for occupied composite volume', () => {
    expect(measurementNotebookEntry(record({ isSolidPrism: false, occupiedVolume: 8, boundingVolume: 12 })))
      .toMatchObject({ kind: 'Composite structure', dimensionLabel: 'Bounding box', volume: '8' });
  });

  it('formats fractional pieces and legacy fractional volume records', () => {
    expect(measurementNotebookEntry(record({ hasFractions: true, isSolidPrism: false, occupiedVolume: 1.5, surfaceAreaExact: false })))
      .toMatchObject({ kind: 'Fractional structure', volume: '1 1/2', surfaceArea: null });
    expect(measurementNotebookEntry({ vol: '2 1/4', L: 3, W: 2, H: 1 })).toMatchObject({ volume: '2 1/4', dimensionLabel: 'Bounding box' });
  });

  it('shows partial occupied volume only as a lower bound without exact dimensions or surface area', () => {
    expect(measurementNotebookEntry(record({ isComplete: false }))).toMatchObject({ complete: false,
      kind: 'Incomplete scan', dimensions: null, volumeLabel: 'Occupied volume, at least', volume: '12', surfaceArea: null });
  });

  it.each([NaN, Infinity, -Infinity, -1])('does not present invalid occupied or surface quantities (%s)', value => {
    const entry = measurementNotebookEntry(record({ occupiedVolume: value, surfaceArea: value }));
    expect(entry.volume).toBeNull(); expect(entry.surfaceArea).toBeNull();
  });

  it('omits invalid dimensions and keeps committed reasoning descriptive without mutating records', () => {
    const input = record({ L: 0, prediction: 10.5, strategy: ' layers ', reason: '  I counted equal layers.  ' });
    const before = JSON.stringify(input);
    expect(measurementNotebookEntry(input)).toMatchObject({ dimensions: null, estimate: '10 1/2', strategy: 'layers', reason: 'I counted equal layers.' });
    expect(JSON.stringify(input)).toBe(before);
    expect(measurementNotebookEntry(null)).toMatchObject({ dimensions: null, volume: null, surfaceArea: null, estimate: null });
  });

  it('accepts legacy exact face counts but never compares partial scans or nonfinite volume', () => {
    const previous = record({ surfaceAreaExact: undefined });
    const latest = record({ surfaceArea: 28, surfaceAreaExact: undefined });
    expect(compareMeasurementRecords(previous, latest)).toMatchObject({ sameVolume: true, surfaceAreaDifference: -4, moreSurfaceEfficient: 'latest' });
    expect(compareMeasurementRecords(previous, record({ isComplete: false }))).toBeNull();
    for (const value of [NaN, Infinity, -Infinity]) expect(compareMeasurementRecords(previous, record({ occupiedVolume: value }))).toBeNull();
  });

  it('does not use inexact or nonfinite surfaces in a covering comparison', () => {
    for (const latest of [record({ surfaceAreaExact: false }), record({ surfaceArea: NaN }), record({ surfaceArea: Infinity }), record({ surfaceArea: -1 })]) {
      expect(compareMeasurementRecords(record(), latest)).toMatchObject({ surfaceAreaDifference: null, moreSurfaceEfficient: null });
      expect(compareMeasurementRecords(latest, record())).toMatchObject({ surfaceAreaDifference: null, moreSurfaceEfficient: null });
    }
  });
});

describe('Geometry World measurement notebook navigation', () => {
  it('connects one selected tab to each labelled panel and hides inactive views', async () => {
    const view = mountTool(); await settleFocus();
    expect(view.container.querySelector('[role="tablist"]').getAttribute('aria-label')).toBe('Measurement notebook views');
    const tabs = [...view.container.querySelectorAll('#gw-history-panel [role="tab"]')];
    expect(tabs.map(node => node.textContent)).toEqual(['Records', 'Compare', 'Practice']);
    expect(tabs.filter(node => node.tabIndex === 0)).toEqual([tab(view, 'records')]);
    expect(document.activeElement).toBe(tab(view, 'records'));
    for (const name of ['records', 'compare', 'practice']) {
      expect(tab(view, name).getAttribute('aria-controls')).toBe(panel(view, name).id);
      expect(panel(view, name).getAttribute('aria-labelledby')).toBe(tab(view, name).id);
      expect(panel(view, name).hidden).toBe(name !== 'records');
      expect(panel(view, name).getAttribute('role')).toBe('tabpanel');
    }
  });

  it('uses Arrow keys, Home, and End with wrapping focus and a single tab stop', () => {
    const view = mountTool(); tab(view, 'records').focus();
    for (const [key, expected] of [['ArrowRight', 'compare'], ['ArrowRight', 'practice'], ['ArrowRight', 'records'],
      ['ArrowLeft', 'practice'], ['Home', 'records'], ['End', 'practice'], ['ArrowLeft', 'compare']]) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      React.act(() => document.activeElement.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(tab(view, expected));
      expect(tab(view, expected).getAttribute('aria-selected')).toBe('true');
      expect([...view.container.querySelectorAll('#gw-history-panel [role="tab"]')].filter(node => node.tabIndex === 0)).toEqual([tab(view, expected)]);
      expect(panel(view, expected).hidden).toBe(false);
    }
  });

  it('resets the selected notebook view when the active lesson changes', () => {
    const view = mountTool(); click(tab(view, 'practice'));
    view.patch({ activeLesson: 'areaSurface' });
    expect(tab(view, 'records').getAttribute('aria-selected')).toBe('true');
    expect(panel(view, 'records').hidden).toBe(false); expect(panel(view, 'practice').hidden).toBe(true);
  });

  it('opens from the inspector without losing measurement or reasoning drafts, then restores it and world focus', async () => {
    const measured = measurement(), history = [record(), record({ t: 2000 })];
    const view = mountTool({ hudPanel: '', measureResult: measured, measureHistory: history,
      volumeRepresentationReason: 'These views keep the same pieces.', volumeRepresentationInvariantChecked: true,
      volumeRepresentationEvidenceChecked: true, predictionReason: 'Equal layers.', volumePrediction: '10' });
    const trigger = view.container.querySelector('.gw-notebook-trigger');
    expect(trigger.textContent).toBe('Compare measurements'); expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(view.container.querySelector('#gw-history-panel')).toBeNull();
    click(trigger); await settleFocus();
    expect(view.bucket().hudPanel).toBe('history'); expect(view.container.querySelector('.gw-measure-card')).toBeNull();
    expect(view.bucket().measureResult).toBe(measured); expect(view.bucket().measureHistory).toBe(history);
    expect(tab(view, 'compare').getAttribute('aria-selected')).toBe('true'); expect(document.activeElement).toBe(tab(view, 'compare'));
    const close = view.container.querySelector('.gw-notebook-return'); expect(close.textContent).toBe('Back to measurement');
    click(close); await settleFocus();
    expect(view.bucket().hudPanel).toBe(''); expect(view.container.querySelector('.gw-measure-card')).toBeTruthy();
    expect(view.bucket()).toMatchObject({ volumeRepresentationReason: 'These views keep the same pieces.',
      volumeRepresentationInvariantChecked: true, volumeRepresentationEvidenceChecked: true, predictionReason: 'Equal layers.', volumePrediction: '10' });
    expect(view.bucket().measureResult).toBe(measured); expect(view.bucket().measureHistory).toBe(history);
    expect(document.activeElement.id).toBe('geoworld-fs-wrap');
  });

  it('returns to the world when no current inspector is present', async () => {
    const view = mountTool(); const close = view.container.querySelector('.gw-notebook-return');
    expect(close.textContent).toBe('Return to world'); click(close); await settleFocus();
    expect(view.container.querySelector('#gw-history-panel')).toBeNull(); expect(view.bucket().measureResult).toBeUndefined();
    expect(document.activeElement.id).toBe('geoworld-fs-wrap');
  });

  it.each(['skip', 'save'])('returns reflection %s to Compare, preserving notebook and reflection drafts', async action => {
    const view = mountTool({ reflectionText: 'I noticed equal occupied volume.' });
    click(tab(view, 'practice')); write(view.container.querySelector('#gw-retrieval-answer'), '3/2');
    click(tab(view, 'compare'));
    const opener = panel(view, 'compare').querySelector('[data-geometry-reflect-trigger="notebook"]');
    opener.focus(); click(opener);
    expect(view.bucket()).toMatchObject({ showReflection: true, hudPanel: '' });
    expect(view.container.querySelector('#gw-history-panel')).toBeNull();
    expect(view.container.querySelector('#gw-reflection-text').value).toBe('I noticed equal occupied volume.');
    write(view.container.querySelector('#gw-reflection-text'), '  Equal volume can have different exposed faces.  ');
    click(view.container.querySelector('.gw-reflection-' + action)); await settleFocus();
    expect(view.bucket()).toMatchObject({ showReflection: false, hudPanel: 'history', retrievalAnswer: '3/2',
      reflectionText: '  Equal volume can have different exposed faces.  ' });
    expect(tab(view, 'compare').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab(view, 'compare'));
    expect(window[ENGINE_KEY].sessionLog.filter(event => event.type === 'reflection')).toHaveLength(action === 'save' ? 1 : 0);
    if (action === 'save') expect(window[ENGINE_KEY].sessionLog.find(event => event.type === 'reflection').data.text).toBe('Equal volume can have different exposed faces.');
    click(tab(view, 'practice')); expect(view.container.querySelector('#gw-retrieval-answer').value).toBe('3/2');
    expect(retrievalEvents()).toHaveLength(0);
  });

  it.each(['lesson', 'record-count', 'latest-record'])('does not restore a stale notebook after the %s changes during reflection', async change => {
    const view = mountTool(); click(tab(view, 'compare'));
    click(panel(view, 'compare').querySelector('[data-geometry-reflect-trigger="notebook"]'));
    if (change === 'lesson') view.patch({ activeLesson: 'areaSurface' });
    if (change === 'record-count') view.patch({ measureHistory: [record(), record({ t: 2000 }), record({ t: 2000 })] });
    if (change === 'latest-record') view.patch({ measureHistory: [record(), record({ t: 3000 })] });
    click(view.container.querySelector('.gw-reflection-skip')); await settleFocus();
    expect(view.bucket().showReflection).toBe(false); expect(view.bucket().hudPanel).toBe('');
    expect(view.container.querySelector('#gw-history-panel')).toBeNull(); expect(document.activeElement.id).toBe('geoworld-fs-wrap');
  });
});

describe('Geometry World measurement notebook quantities', () => {
  it('labels lengths, occupied cubic units, and exposed square units separately for composite records', () => {
    const view = mountTool({ measureHistory: [record({ occupiedVolume: 8, isSolidPrism: false })] });
    const entry = panel(view, 'records').querySelector('.gw-history-row');
    expect(entry.textContent).toContain('Bounding box'); expect(entry.textContent).toContain('2 \u00d7 2 \u00d7 3 units');
    expect(entry.textContent).toContain('Occupied volume8 cubic units'); expect(entry.textContent).toContain('Exposed surface area32 square units');
    expect(entry.textContent).not.toContain('12 cubic units');
  });

  it('retains the latest five records while describing all retained scans', () => {
    const view = mountTool({ measureHistory: Array.from({ length: 7 }, (_, index) => record({ t: index + 1, occupiedVolume: index + 1 })) });
    const records = panel(view, 'records');
    expect(records.querySelector('.gw-notebook-caption').textContent).toBe('7 complete \u00b7 7 scans retained \u00b7 latest 5 shown');
    expect(records.querySelectorAll('li')).toHaveLength(5);
    expect(records.querySelector('[data-current="true"]').textContent).toContain('7 cubic units');
    expect(records.textContent).not.toContain('Occupied volume1 cubic units');
  });

  it('keeps a partial scan visibly partial and out of comparison or practice', () => {
    const view = mountTool({ measureHistory: [record(), record({ occupiedVolume: 900, isComplete: false, t: 2000 })] });
    const partial = panel(view, 'records').querySelector('[data-incomplete="true"]');
    expect(partial.textContent).toContain('Occupied volume, at least900 cubic units');
    expect(partial.textContent).toContain('Partial scan; not evidence for comparison or practice.');
    expect(partial.textContent).not.toContain('dimensions'); expect(partial.textContent).not.toContain('square units');
    expect(panel(view, 'compare').textContent).toContain('Two complete measurements with valid occupied volumes are needed');
    expect(panel(view, 'practice').querySelector('form')).toBeNull();
  });

  it('compares the latest two complete measurements without treating a later partial scan as evidence', () => {
    const view = mountTool({ measureHistory: [record({ surfaceArea: 32 }), record({ surfaceArea: 28, t: 2000 }), record({ isComplete: false, occupiedVolume: 900, t: 3000 })] });
    const compare = panel(view, 'compare');
    expect(compare.textContent).toContain('Occupied volume changeNo change (same occupied volume)');
    expect(compare.textContent).toContain('4 fewer square units'); expect(compare.textContent).not.toContain('900');
    expect(compare.querySelector('[data-geometry-reflect-trigger="notebook"]')).toBeTruthy();
  });
});

describe('Geometry World retained quantity readability', () => {
  it.each([
    [0, 'volume', '0 cubic units'],
    [1, 'volume', '1 cubic unit'],
    [2, 'volume', '2 cubic units'],
    [0.5, 'volume', '1/2 cubic units'],
    [1.5, 'volume', '1 1/2 cubic units'],
    [1, 'length', '1 unit'],
    [2, 'length', '2 units'],
    [0, 'surface', '0 square units'],
    [1, 'surface', '1 square unit'],
    [2, 'surface', '2 square units'],
    [0.25, 'surface', '1/4 square units']
  ])('formats %s %s quantity with its own unit', (value, kind, expected) => {
    expect(formatMeasurementQuantity(value, kind)).toBe(expected);
  });

  it.each([null, undefined, NaN, Infinity, -1])('does not fabricate a quantity from %s', value => {
    expect(formatMeasurementQuantity(value, 'volume')).toBeNull();
    expect(formatMeasurementQuantity(value, 'surface')).toBeNull();
  });

  it('keeps formatted legacy fields while adding full unit labels without mutating evidence', () => {
    const input = record({ occupiedVolume: 1, surfaceArea: 1, prediction: 1, surfaceAreaExact: undefined });
    const before = JSON.stringify(input);
    expect(measurementNotebookEntry(input)).toMatchObject({ volume: '1', volumeQuantity: '1 cubic unit',
      surfaceArea: '1', surfaceAreaQuantity: '1 square unit', surfaceAreaState: 'exact', surfaceAreaUnavailable: null,
      estimate: '1', estimateQuantity: '1 cubic unit' });
    expect(JSON.stringify(input)).toBe(before);
    expect(measurementNotebookEntry({ vol: '1/2', prediction: 1.5 })).toMatchObject({ volume: '1/2',
      volumeQuantity: '1/2 cubic units', estimate: '1 1/2', estimateQuantity: '1 1/2 cubic units' });
  });

  it.each([
    [{ isComplete: false, hasFractions: true }, 'incomplete', 'Unavailable until the full structure is measured.'],
    [{ surfaceArea: null, hasFractions: true }, 'unsupported', 'Exact exposed surface area is unavailable for these block shapes.'],
    [{ surfaceAreaExact: false }, 'unavailable', 'Exact exposed surface area is unavailable in this record.'],
    [{ surfaceArea: undefined, surfaceAreaExact: undefined }, 'unavailable', 'Exact exposed surface area is unavailable in this record.'],
    [{ surfaceArea: NaN }, 'unavailable', 'Exact exposed surface area is unavailable in this record.'],
    [{ surfaceArea: -1 }, 'unavailable', 'Exact exposed surface area is unavailable in this record.']
  ])('keeps unavailable surface explicit for %j', (overrides, state, message) => {
    const input = record(overrides), before = JSON.stringify(input);
    expect(measurementNotebookEntry(input)).toMatchObject({ surfaceArea: null, surfaceAreaQuantity: null,
      surfaceAreaState: state, surfaceAreaUnavailable: message });
    const view = mountTool({ measureHistory: [input] });
    const row = panel(view, 'records').querySelector('.gw-history-row');
    const surface = row.querySelector('[data-geometry-record-surface]');
    expect(surface.previousElementSibling.textContent).toBe('Exposed surface area');
    expect(surface.getAttribute('data-geometry-record-surface')).toBe(state); expect(surface.textContent).toBe(message);
    expect(surface.textContent).not.toContain('square units'); expect(JSON.stringify(input)).toBe(before);
    expect(window[ENGINE_KEY].logEvent).not.toHaveBeenCalled();
  });

  it('uses singular occupied, surface, and committed-estimate quantities in Records', () => {
    const view = mountTool({ measureHistory: [record({ occupiedVolume: 1, surfaceArea: 1, prediction: 1 })] });
    const row = panel(view, 'records').querySelector('.gw-history-row');
    expect(row.textContent).toContain('Occupied volume1 cubic unit');
    expect(row.querySelector('[data-geometry-record-surface="exact"]').textContent).toBe('1 square unit');
    expect(row.querySelector('.gw-notebook-estimate p').textContent).toBe('Committed estimate: 1 cubic unit. Descriptive, ungraded.');
    expect(row.textContent).not.toContain('1 cubic units'); expect(row.textContent).not.toContain('1 square units');
  });

  it('uses singular Compare quantities and the equal-volume covering insight without changing comparisons', () => {
    const history = [record({ occupiedVolume: 1, surfaceArea: 2 }), record({ occupiedVolume: 1, surfaceArea: 1, t: 2000 })];
    const view = mountTool({ measureHistory: history }); click(tab(view, 'compare'));
    const compare = panel(view, 'compare');
    expect(compare.textContent).toContain('Previous occupied volume1 cubic unit');
    expect(compare.textContent).toContain('Latest occupied volume1 cubic unit');
    expect(compare.textContent).toContain('Latest exposed surface1 square unit');
    expect(compare.querySelector('.gw-notebook-insight').textContent).toBe('Latest measurement has 1 fewer square unit of exposed surface for the same occupied volume.');
    expect(compare.querySelector('[data-geometry-quantity-change="surface"]').textContent).toBe('Latest has 1 fewer square unit');
    expect(view.bucket().measureHistory).toBe(history); expect(window[ENGINE_KEY].logEvent).not.toHaveBeenCalled();
  });

  it('preserves learner data while reading explicit fractional surface availability', () => {
    const history = [record({ occupiedVolume: 1.5, hasFractions: true, surfaceArea: null })];
    const protectedState = { measureHistory: history, score: 2, npcAnswerDrafts: { guide: '2' },
      volumePrediction: '1', predictionReason: 'I counted pieces.', retrievalAnswer: '3/2',
      retrievalAttemptCount: 1, reflectionText: 'Same occupied volume.' };
    const view = mountTool(protectedState);
    const before = Object.fromEntries(Object.keys(protectedState).map(key => [key, JSON.stringify(view.bucket()[key])]));
    for (const name of ['compare', 'practice', 'records']) click(tab(view, name));
    expect(panel(view, 'records').querySelector('[data-geometry-record-surface]').textContent).toContain('these block shapes');
    for (const key of Object.keys(protectedState)) expect(JSON.stringify(view.bucket()[key])).toBe(before[key]);
    expect(window[ENGINE_KEY].logEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['iPhone', true, 'tap Measure.'],
    ['iPhone', false, 'press M.'],
    ['Desktop browser', true, 'press M.']
  ])('matches the estimate cue to active touch controls (%s, %s)', (userAgent, touchMode, expected) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
    const view = mountTool({ hudPanel: '', showPredictionPanel: true, volumePrediction: '', touchMode });
    const status = view.container.querySelector('#gw-volume-estimate-status');
    expect(status.textContent).toContain('Aim at an unmeasured structure, commit, then ' + expected);
    expect(status.textContent).toContain('not scored');
    if (expected === 'tap Measure.') expect(status.textContent).not.toContain('press M');
    expect(view.bucket()).toMatchObject({ volumePrediction: '', touchMode });
    expect(window[ENGINE_KEY].logEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['scale_height', '1 unit'],
    ['layer_area', '1 square unit'],
    ['empty_space', '1 cubic unit'],
    ['fractional_volume', '1 cubic unit'],
    ['volume_difference', '1 cubic unit']
  ])('uses a singular quantity in correct %s feedback only after answering', (concept, expected) => {
    const checkpoint = { concept, expected: 1, hint: 'Keep the original hint.' };
    const result = checkRetrievalAnswer(checkpoint, '1', 1);
    expect(result).toMatchObject({ correct: true, valid: true, answer: 1, expected: 1 });
    expect(result.feedback).toContain(expected); expect(result.feedback).not.toContain(expected + 's');
    expect(checkRetrievalAnswer(checkpoint, '2', 1).feedback).not.toContain(expected);
    expect(checkRetrievalAnswer(checkpoint, '2', 2).feedback).toBe(checkpoint.hint);
    expect(checkpoint).toEqual({ concept, expected: 1, hint: 'Keep the original hint.' });
  });

  it('keeps zero and fractional practice feedback valid and plural without changing accepted answers', () => {
    expect(checkRetrievalAnswer({ concept: 'volume_difference', expected: 0 }, '0'))
      .toMatchObject({ correct: true, valid: true, expected: 0, feedback: expect.stringContaining('difference is 0 cubic units') });
    expect(checkRetrievalAnswer({ concept: 'fractional_volume', expected: 0.5 }, '1/2'))
      .toMatchObject({ correct: true, valid: true, answer: 0.5, feedback: expect.stringContaining('1/2 cubic units less') });
  });

  it.each([
    [1, 'Estimate of 1 cubic unit locked'],
    [1.5, 'Estimate of 1 1/2 cubic units locked'],
    [undefined, 'Estimate locked'],
    [0, 'Estimate locked']
  ])('confirms only a valid committed estimate amount (%s)', (prediction, expected) => {
    const commitment = { prediction, targetKey: 'student:0,1,0', input: '1', reason: 'Fixed reasoning.' };
    const view = mountTool({ hudPanel: '', showPredictionPanel: true, volumePrediction: '2', volumeEstimateCommitment: commitment });
    const status = view.container.querySelector('#gw-volume-estimate-status');
    expect(status.textContent).toBe(expected + ' for the aimed structure. Measure that same structure; the original stays fixed.');
    expect(view.container.querySelector('#gw-volume-prediction').disabled).toBe(true);
    expect(view.bucket().volumeEstimateCommitment).toBe(commitment); expect(view.bucket().volumePrediction).toBe('2');
    expect(window[ENGINE_KEY].logEvent).not.toHaveBeenCalled();
  });

  it('keeps fractional and empty-space prompt quantities and unchanged checkpoint evidence', () => {
    const fractional = record({ occupiedVolume: 1, blocks: 2, hasFractions: true, t: 3000 });
    const fractionalQuestion = buildRetrievalCheckpoint([record(), fractional]);
    expect(fractionalQuestion).toMatchObject({ id: 'retrieval-3000-fractional_volume', concept: 'fractional_volume', expected: 1,
      hint: 'Subtract the occupied volume from the number of whole-cube spaces.' });
    expect(fractionalQuestion.prompt).toContain('occupies 1 cubic unit.');
    expect(fractionalQuestion.prompt).not.toContain('1 cubic units');
    const empty = record({ occupiedVolume: 0.5, boundingVolume: 1, isSolidPrism: false, t: 4000 });
    const emptyQuestion = buildRetrievalCheckpoint([record(), empty]);
    expect(emptyQuestion).toMatchObject({ id: 'retrieval-4000-empty_space', concept: 'empty_space', expected: 0.5,
      hint: 'Subtract occupied volume from bounding-box volume.' });
    expect(emptyQuestion.prompt).toContain('A bounding box is 1 cubic unit and the structure occupies 1/2.');
    expect(emptyQuestion.prompt).not.toContain('1 cubic units');
  });
});

describe('Geometry World notebook directional changes', () => {
  it.each([
    [4, 'volume', 'Latest has 4 more cubic units'],
    [-4, 'volume', 'Latest has 4 fewer cubic units'],
    [1, 'volume', 'Latest has 1 more cubic unit'],
    [-1, 'volume', 'Latest has 1 fewer cubic unit'],
    [0.5, 'volume', 'Latest has 1/2 more cubic units'],
    [-1.5, 'volume', 'Latest has 1 1/2 fewer cubic units'],
    [4, 'surface', 'Latest has 4 more square units'],
    [-4, 'surface', 'Latest has 4 fewer square units'],
    [1, 'surface', 'Latest has 1 more square unit'],
    [-1, 'surface', 'Latest has 1 fewer square unit']
  ])('formats signed %s %s change with the correct unit', (difference, kind, expected) => {
    expect(formatMeasurementChange(difference, kind)).toBe(expected);
  });

  it.each(['volume', 'surface'])('treats zero and floating-point noise as no %s change', kind => {
    const expected = kind === 'volume' ? 'No change (same occupied volume)' : 'No change (same exposed surface area)';
    for (const difference of [0, 0.0000005, -0.0000005]) expect(formatMeasurementChange(difference, kind)).toBe(expected);
  });

  it.each([
    [8, 28, 'Latest has 4 fewer cubic units', 'Latest has 4 fewer square units'],
    [16, 36, 'Latest has 4 more cubic units', 'Latest has 4 more square units'],
    [16, 28, 'Latest has 4 more cubic units', 'Latest has 4 fewer square units'],
    [12, 32, 'No change (same occupied volume)', 'No change (same exposed surface area)']
  ])('labels both measured changes for latest volume %s and surface %s', (occupiedVolume, surfaceArea, volumeText, surfaceText) => {
    const view = mountTool({ measureHistory: [record(), record({ occupiedVolume, surfaceArea, t: 2000 })] });
    const compare = panel(view, 'compare');
    expect(compare.textContent).toContain('Occupied volume change' + volumeText);
    expect(compare.textContent).toContain('Exposed surface area change' + surfaceText);
    expect(compare.querySelector('[data-geometry-quantity-change="volume"]').textContent).toBe(volumeText);
    expect(compare.querySelector('[data-geometry-quantity-change="surface"]').textContent).toBe(surfaceText);
    if (occupiedVolume !== 12) expect(compare.querySelector('.gw-notebook-insight')).toBeNull();
  });

  it('keeps fractional occupied volume comparable without implying an exact fractional surface', () => {
    const view = mountTool({ measureHistory: [record({ occupiedVolume: 2, isSolidPrism: false }),
      record({ occupiedVolume: 1.5, hasFractions: true, isSolidPrism: false, surfaceAreaExact: false, t: 2000 })] });
    const compare = panel(view, 'compare');
    expect(compare.querySelector('[data-geometry-quantity-change="volume"]').textContent).toBe('Latest has 1/2 fewer cubic units');
    expect(compare.querySelector('[data-geometry-quantity-change="surface"]').textContent).toBe('Exact surface area unavailable for one or both measurements.');
    expect(compare.textContent).not.toContain('square units');
    expect(compare.querySelector('.gw-notebook-insight')).toBeNull();
  });

  it('accepts legacy exact surfaces and retains the equal-volume covering insight', () => {
    const view = mountTool({ measureHistory: [record({ surfaceAreaExact: undefined }),
      record({ surfaceArea: 28, surfaceAreaExact: undefined, t: 2000 })] });
    const compare = panel(view, 'compare');
    expect(compare.querySelector('[data-geometry-quantity-change="surface"]').textContent).toBe('Latest has 4 fewer square units');
    expect(compare.querySelector('.gw-notebook-insight').textContent).toContain('4 fewer square units of exposed surface for the same occupied volume.');
    expect(compare.querySelector('.gw-notebook-question').textContent).toContain('Which shared or exposed faces explain');
  });

  it('does not reinterpret a later incomplete scan as either directional change', () => {
    const view = mountTool({ measureHistory: [record(), record({ occupiedVolume: 8, surfaceArea: 28, t: 2000 }),
      record({ occupiedVolume: 900, surfaceArea: 901, isComplete: false, t: 3000 })] });
    const compare = panel(view, 'compare');
    expect(compare.querySelector('[data-geometry-quantity-change="volume"]').textContent).toBe('Latest has 4 fewer cubic units');
    expect(compare.querySelector('[data-geometry-quantity-change="surface"]').textContent).toBe('Latest has 4 fewer square units');
    expect(compare.textContent).not.toContain('900'); expect(compare.textContent).not.toContain('901');
  });

  it('keeps comparison and reflection navigation descriptive without changing protected learning state', async () => {
    const protectedState = { score: 2, answeredNpcs: { 'Layer Counter': true }, npcAnswerDrafts: { 'Layer Counter': 'draft answer' },
      objectiveChecks: { volumeExplorer: { 'count-layers': true } }, volumePrediction: '10', predictionStrategy: 'layers',
      predictionReason: 'I counted equal layers.', volumeEstimateCommitment: { prediction: 10, targetKey: 'student:0,1,0' },
      volumeEstimateObservedTargets: ['student:1,1,0'], retrievalAnswer: '3/2', retrievalAttemptCount: 1,
      retrievalResult: { correct: false, valid: true, answer: 1.5, expected: 6, checkpointId: 'retrieval-2000-scale_height', attempt: 1 },
      reflectionText: 'I noticed the same volume.' };
    const view = mountTool(protectedState); await settleFocus();
    const before = Object.fromEntries(Object.keys(protectedState).map(key => [key, JSON.stringify(view.bucket()[key])]));
    const eventsBefore = JSON.stringify(window[ENGINE_KEY].sessionLog);
    for (const name of ['compare', 'practice', 'records', 'compare']) click(tab(view, name));
    click(panel(view, 'compare').querySelector('[data-geometry-reflect-trigger="notebook"]'));
    click(view.container.querySelector('.gw-reflection-skip')); await settleFocus();
    for (const key of Object.keys(protectedState)) expect(JSON.stringify(view.bucket()[key])).toBe(before[key]);
    expect(JSON.stringify(window[ENGINE_KEY].sessionLog)).toBe(eventsBefore);
  });

  it('does not publish a generated practice answer or worked solution in the comparison', () => {
    const view = mountTool(); click(tab(view, 'compare'));
    const compare = panel(view, 'compare');
    expect(compare.textContent).not.toContain('6 units');
    expect(compare.textContent).not.toContain('new height is');
    expect(compare.querySelector('[data-geometry-retrieval-result]')).toBeNull();
    expect(compare.querySelector('input, form')).toBeNull();
    expect(view.bucket().retrievalResult).toBeUndefined(); expect(retrievalEvents()).toHaveLength(0);
  });
});

describe('Geometry World notebook practice form', () => {
  it('accepts a zero difference through native form submit, logs once, and ignores resubmission after success', () => {
    const view = mountTool({ measureHistory: [record({ isSolidPrism: false }), record({ isSolidPrism: false, t: 2000 })] });
    click(tab(view, 'practice'));
    const input = view.container.querySelector('#gw-retrieval-answer'); write(input, '0'); submit(view);
    expect(view.bucket()).toMatchObject({ retrievalAnswer: '0', retrievalAttemptCount: 1, retrievalResult: { correct: true, valid: true, answer: 0, expected: 0 } });
    expect(retrievalEvents()).toHaveLength(1);
    expect(panel(view, 'practice').querySelector('[role="status"]').textContent).toContain('difference is 0 cubic units');
    expect(input.disabled).toBe(true); expect(panel(view, 'practice').querySelector('[type="submit"]').disabled).toBe(true);
    submit(view); expect(retrievalEvents()).toHaveLength(1); expect(view.bucket().retrievalAttemptCount).toBe(1);
  });

  it.each(['', 'not a number', '-1', '1/0'])('rejects invalid input without recording an attempt (%s)', answer => {
    const view = mountTool(); click(tab(view, 'practice')); write(view.container.querySelector('#gw-retrieval-answer'), answer); submit(view);
    expect(view.bucket().retrievalResult).toMatchObject({ correct: false, valid: false, attempt: 0 });
    expect(view.bucket().retrievalAttemptCount).toBe(0); expect(retrievalEvents()).toHaveLength(0);
    expect(view.container.querySelector('#gw-retrieval-answer').getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps a submitted answer and feedback when changing views, and submits correctly by button', () => {
    const view = mountTool(); click(tab(view, 'practice'));
    write(view.container.querySelector('#gw-retrieval-answer'), '5'); submit(view);
    expect(view.bucket().retrievalResult.correct).toBe(false); expect(retrievalEvents()).toHaveLength(1);
    click(tab(view, 'records')); click(tab(view, 'compare')); click(tab(view, 'practice'));
    expect(view.container.querySelector('#gw-retrieval-answer').value).toBe('5');
    expect(panel(view, 'practice').querySelector('[role="status"]')).toBeTruthy();
    expect(view.bucket().retrievalAttemptCount).toBe(1);
    write(view.container.querySelector('#gw-retrieval-answer'), '6'); click(panel(view, 'practice').querySelector('[type="submit"]'));
    expect(view.bucket().retrievalResult.correct).toBe(true); expect(view.bucket().retrievalAttemptCount).toBe(2); expect(retrievalEvents()).toHaveLength(2);
  });

  it('retains an unsubmitted draft across all notebook views without logging an attempt', () => {
    const view = mountTool(); click(tab(view, 'practice'));
    write(view.container.querySelector('#gw-retrieval-answer'), '3/2');
    click(tab(view, 'records')); click(tab(view, 'compare')); click(tab(view, 'practice'));
    expect(view.container.querySelector('#gw-retrieval-answer').value).toBe('3/2');
    expect(view.bucket().retrievalResult).toBeNull(); expect(view.bucket().retrievalAttemptCount).toBeUndefined();
    expect(retrievalEvents()).toHaveLength(0);
  });

  it.each([
    ['units', [record(), record({ t: 2000 })]],
    ['square units', [record(), record({ t: 2000 }), record({ t: 3000 })]],
    ['cubic units', [record(), record({ isSolidPrism: false, occupiedVolume: 8, t: 2000 })]]
  ])('labels the generated question answer in %s', (units, history) => {
    const view = mountTool({ measureHistory: history }); click(tab(view, 'practice'));
    const label = panel(view, 'practice').querySelector('label');
    expect(label.getAttribute('for')).toBe('gw-retrieval-answer'); expect(label.textContent).toBe('Your answer (' + units + ')');
    expect(view.container.querySelector('#gw-retrieval-answer').getAttribute('aria-describedby')).toBe('gw-retrieval-prompt');
  });
});
