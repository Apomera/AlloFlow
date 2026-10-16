import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
let config, host, root, latest, writes, awardXP, replaceData, hiveStatus;
const selectors = {
  disclosure: '[data-inspection-bottom-bar="true"]',
  toggle: '[data-inspection-bottom-bar-toggle="true"]',
  content: '[data-inspection-bottom-bar-content="true"]',
  context: '[data-inspection-bottom-bar-context="true"]',
  diagram: '[data-inspection-bottom-bar-diagram="true"]'
};
const savedRecord = { day: 40, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: true, framesRead: 6, queenFound: true };
const colony = (patch = {}) => ({
  viewMode: 'beekeeper', day: 40, tutorialDone: true, motionPaused: true, autoAdvance: false,
  soundOn: false, show3dHive: true, hive3dFrame: 2, hive3dExploded: true, hive3dPart: 'brood_frames',
  queenHealth: 100, workers: 14000, honey: 60, pollen: 20, brood: 8000, capacity: 80,
  morale: 80, varroaLevel: 5, actionPoints: 3, colonySurvived: true,
  simulationSeed: 2468, randomState: 1357, seededFromDay: 0,
  inspectionDraft: {}, inspectionsDone: 4, hive3dFramesSeen: [0, 2], hive3dFoundQueen: false,
  lastInspection: { ...savedRecord },
  beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my observations', explanation: 'Keep my explanation' },
  ...patch
});

beforeAll(() => {
  const registry = resetStemLab();
  // Status callbacks exercise the UI contract without requiring a WebGL renderer in jsdom.
  registry.makeBayViewer = () => ({
    attach() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; },
    sync(options) {
      if (options.sceneProps && Object.hasOwn(options.sceneProps, 'swarmPressure')) hiveStatus = options.onStatus;
    }
  });
  config = loadTool(TOOL, 'beehive');
});
afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  root = null; host = null; hiveStatus = null; replaceData = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
afterAll(() => { resetStemLab(); });

function staticView(patch = {}) {
  const data = { beehive: colony(patch) }, before = structuredClone(data);
  const callbacks = { setToolData: vi.fn(), setLabToolData: vi.fn(), update: vi.fn(), updateMulti: vi.fn(), awardXP: vi.fn() };
  const template = document.createElement('template');
  template.innerHTML = renderTool('beehive', data, callbacks);
  expect(data).toEqual(before);
  for (const callback of Object.values(callbacks)) expect(callback).not.toHaveBeenCalled();
  return template.content;
}
async function mount(patch = {}) {
  const gradient = { addColorStop: vi.fn() };
  const context = new Proxy({
    measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => gradient, createRadialGradient: () => gradient
  }, { get: (target, key) => key in target ? target[key] : (target[key] = vi.fn()) });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  writes = vi.fn(); awardXP = vi.fn();
  function App() {
    const [data, setData] = React.useState(() => ({ beehive: colony(patch) }));
    const setToolData = React.useCallback(updater => { writes(updater); setData(updater); }, []);
    latest = data; replaceData = setData;
    return config.render(makeCtx({ toolData: data, setToolData, awardXP }));
  }
  await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  writes.mockClear(); awardXP.mockClear();
}
async function click(selector) {
  const node = host.querySelector(selector);
  expect(node, selector).toBeTruthy();
  await act(async () => { node.click(); await Promise.resolve(); });
}
function expectDrawing(view, shown) {
  const diagram = view.querySelector(selectors.diagram);
  expect(diagram).toBeTruthy();
  expect(diagram.tagName.toLowerCase()).toBe('svg');
  expect(diagram.getAttribute('role')).toBe('img');
  expect(diagram.getAttribute('data-shown')).toBe(String(shown));
  expect(diagram.querySelectorAll('path[data-inspection-hanging-form]')).toHaveLength(shown ? 5 : 0);
  expect(view.querySelector(selectors.content).textContent).toContain(shown
    ? 'Drawing: hanging forms beneath the bar.' : 'Drawing: bar without hanging forms.');
}

describe('guided bottom-bar observation', () => {
  it('starts closed with a named native disclosure, current frame context, and an accessible model drawing', () => {
    const view = staticView();
    const disclosure = view.querySelector(selectors.disclosure);
    const summary = view.querySelector(selectors.toggle);
    expect(disclosure.tagName).toBe('DETAILS');
    expect(disclosure.open).toBe(false);
    expect(summary.tagName).toBe('SUMMARY');
    expect(summary.parentElement).toBe(disclosure);
    expect(summary.textContent).toContain('Observe the bottom bar');
    expect(disclosure.querySelector(selectors.context).textContent).toContain('Current model · Day 40 · Frame 3 of 6');
    expectDrawing(view, true);
    const diagram = view.querySelector(selectors.diagram);
    const name = diagram.getAttribute('aria-label');
    const labelledBy = diagram.getAttribute('aria-labelledby');
    expect(Boolean(name?.trim() || labelledBy?.trim())).toBe(true);
    if (labelledBy) labelledBy.trim().split(/\s+/).forEach(id => expect(view.getElementById(id)?.textContent.trim()).toBeTruthy());
    expect(disclosure.textContent.toLowerCase()).toContain('model');
    expect(disclosure.textContent.toLowerCase()).toMatch(/(not|rather than|illustration).*count/);
  });

  it.each([
    { workers: 11000, shown: false, answer: 'no' },
    { workers: 11001, shown: true, answer: 'yes' }
  ])('matches the recorded model answer at $workers workers with capacity 80', async ({ workers, shown, answer }) => {
    // Capacity 80 holds 20,000 model bees: 11,000 is exactly the strict 0.55 threshold.
    await mount({ workers, inspectionDraft: { brood: 'solid', cells: answer } });
    expectDrawing(host, shown);
    const before = structuredClone(latest);
    await click('[data-inspection-record]');
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive,
      lastInspection: { day: 40, framesRead: 2, queenFound: false, brood: 'solid', cells: answer, broodCorrect: true, cellsCorrect: true },
      inspectionDraft: {}, inspectionsDone: 5
    } });
    expect(writes).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('beehive', 14, 'Guided hive inspection');
    expectDrawing(host, shown);
  });

  it('updates the live cue when capacity changes while preserving previous results and answer drafts', async () => {
    await mount({ inspectionDraft: { brood: 'spotty', cells: 'yes', note: 'Keep my draft note' } });
    expectDrawing(host, true);
    await click(selectors.toggle);
    const before = structuredClone(latest);
    const feedback = host.querySelector('[data-inspection-feedback]').textContent;
    const next = { ...before, beehive: { ...before.beehive, capacity: 120, hive3dFrame: 5 } };
    await act(async () => { replaceData(next); await Promise.resolve(); });
    expectDrawing(host, false);
    expect(host.querySelector(selectors.disclosure).open).toBe(true);
    expect(host.querySelector(selectors.context).textContent).toContain('Current model · Day 40 · Frame 6 of 6');
    expect(host.querySelector('[data-inspection-feedback]').textContent).toBe(feedback);
    expect(host.querySelector('[data-inspection-choice="cells:yes"]').getAttribute('aria-checked')).toBe('true');
    expect(host.querySelector('[data-inspection-choice="brood:spotty"]').getAttribute('aria-checked')).toBe('true');
    expect(latest).toEqual(next);
    expect(latest.beehive.lastInspection).toEqual(savedRecord);
    expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  });

  it('opens and closes without choosing answers, spending action points, editing notes, or awarding XP', async () => {
    await mount();
    const before = structuredClone(latest);
    expect(host.querySelector('[data-inspection-record]').disabled).toBe(true);
    for (const open of [true, false, true, false]) {
      await click(selectors.toggle);
      expect(host.querySelector(selectors.disclosure).open).toBe(open);
      expect(latest).toEqual(before);
      expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
      expect(host.querySelector('[data-inspection-record]').disabled).toBe(true);
      expect(host.querySelectorAll('[data-inspection-choice][aria-checked="true"]')).toHaveLength(0);
    }
  });

  it('keeps the observation available independently of unavailable, loading, and ready 3D states', async () => {
    await mount();
    const before = structuredClone(latest);
    expect(typeof hiveStatus).toBe('function');
    for (const [status, words] of [['failed', 'unavailable'], ['loading', 'loading'], ['ready', 'available']]) {
      await act(async () => { hiveStatus(status); await Promise.resolve(); });
      expect(host.querySelector('[data-inspection-queen-status]').textContent).toContain('The 3D queen finder is ' + words + '.');
      expectDrawing(host, true);
      expect(host.querySelector(selectors.toggle).hasAttribute('disabled')).toBe(false);
      await click(selectors.toggle);
      expect(host.querySelector(selectors.disclosure).open).toBe(true);
      await click(selectors.toggle);
      expect(host.querySelector(selectors.disclosure).open).toBe(false);
      expect(latest).toEqual(before);
      expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
    }
  });

  it('omits the observation and answer controls during winter, including in a crowded colony', () => {
    const view = staticView({ day: 100, workers: 40000 });
    expect(view.querySelector('[data-beehive-guided-inspection="winter"]').textContent).toContain('Keep the hive closed');
    expect(view.querySelector(selectors.disclosure)).toBeNull();
    expect(view.querySelector(selectors.diagram)).toBeNull();
    expect(view.querySelector('[data-inspection-record]')).toBeNull();
  });
});
