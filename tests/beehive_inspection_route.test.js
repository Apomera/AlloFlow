import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
let BH, config, previousExports;
let host, root, latest, writes, awardXP;
beforeAll(() => {
  previousExports = window.__RR_TEST_EXPORTS__;
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  config = loadTool(TOOL, 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
afterAll(() => {
  if (previousExports === undefined) delete window.__RR_TEST_EXPORTS__;
  else window.__RR_TEST_EXPORTS__ = previousExports;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  root = null; host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

const visits = value => BH.bhHiveFrameVisits(value);
const quest = () => config.questHooks.find(item => item.id === 'read_every_frame');
const record = { day: 40, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: true, framesRead: 6, queenFound: true };
const colony = (patch = {}) => ({
  viewMode: 'beekeeper', day: 40, tutorialDone: true, motionPaused: true, autoAdvance: false,
  soundOn: false, show3dHive: true, hive3dFrame: 2, hive3dExploded: true, hive3dPart: 'brood_frames',
  queenHealth: 100, workers: 8000, honey: 60, pollen: 20, brood: 8000, capacity: 80,
  morale: 80, varroaLevel: 5, actionPoints: 3, colonySurvived: true,
  simulationSeed: 2468, randomState: 1357, seededFromDay: 0,
  inspectionDraft: {}, inspectionsDone: 4, hive3dFramesSeen: [], hive3dFoundQueen: false,
  lastInspection: { ...record },
  beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my observations', explanation: 'Keep my explanation' },
  ...patch
});
function staticView(patch = {}) {
  const data = { beehive: colony(patch) }, saved = structuredClone(data);
  const callbacks = { setToolData: vi.fn(), setLabToolData: vi.fn(), update: vi.fn(), updateMulti: vi.fn(), awardXP: vi.fn() };
  const template = document.createElement('template');
  template.innerHTML = renderTool('beehive', data, callbacks);
  expect(data).toEqual(saved);
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
    latest = data;
    return config.render(makeCtx({ toolData: data, setToolData, awardXP }));
  }
  await act(async () => { root.render(React.createElement(App)); await Promise.resolve(); });
  writes.mockClear(); awardXP.mockClear();
}
async function click(selector) {
  const button = host.querySelector(selector);
  expect(button, selector).toBeTruthy();
  await act(async () => { button.click(); await Promise.resolve(); });
}

describe('inspection frame visits are six distinct valid positions', () => {
  it('ignores malformed entries and preserves the first visit order', () => {
    expect(visits([4, '0', null, 2, 4, -1, 5, 6, 1.5, 0, NaN, Infinity, 1, false, {}, [], 3, 2]))
      .toEqual([4, 2, 5, 0, 1, 3]);
  });

  it('treats non-array values as no visits without coercing array-like objects', () => {
    for (const value of [undefined, null, false, 0, '012345', { 0: 0, 1: 1, length: 6 }, new Set([0, 1])]) {
      expect(visits(value)).toEqual([]);
    }
  });

  it('returns independent arrays without changing frozen saved visits', () => {
    const saved = Object.freeze([5, 2, 5, 1]);
    const first = visits(saved);
    expect(first).not.toBe(saved);
    first.push(3); first[0] = 4;
    expect(saved).toEqual([5, 2, 5, 1]);
    expect(visits(saved)).toEqual([5, 2, 1]);
    const empty = visits(null); empty.push(4);
    expect(visits(null)).toEqual([]);
  });

  it('does not complete the frame quest from duplicates, invalid entries, or an array-like value', () => {
    for (const [value, count] of [[[0, 0, 0, 0, 0, 0], 1], [[0, 1, 2, 3, 4, 8, '5'], 5], ['012345', 0], [{ length: 6 }, 0]]) {
      const data = { hive3dFramesSeen: value };
      expect(quest().check(data)).toBe(false);
      expect(quest().progress(data)).toBe(count + '/6 frames');
    }
    expect(quest().check(null)).toBe(false);
    expect(quest().progress(null)).toBe('0/6 frames');
  });

  it('completes the quest after every valid position appears, regardless of order or extra entries', () => {
    const data = { hive3dFramesSeen: [4, 1, 3, 0, 5, 2, 2, 99, '0'] };
    const saved = structuredClone(data);
    expect(quest().check(data)).toBe(true);
    expect(quest().progress(data)).toBe('6/6 frames');
    expect(data).toEqual(saved);
  });
});

describe('inspection preparation explains progress without rewriting saved work', () => {
  it('labels all positions, separates selected from visited, and counts each valid frame once', () => {
    const view = staticView({ hive3dFrame: 2, hive3dFramesSeen: [0, 0, 5, 7, '2', null] });
    const route = view.querySelector('[data-inspection-preparation="true"]');
    expect(route).toBeTruthy();
    expect(route.querySelector('[data-inspection-frame-progress="true"]').textContent).toContain('Frames explored: 2 of 6');
    const buttons = Array.from(route.querySelectorAll('[data-inspection-frame]'));
    expect(buttons).toHaveLength(6);
    buttons.forEach((button, index) => {
      const visited = index === 0 || index === 5;
      expect(button.tagName).toBe('BUTTON'); expect(button.getAttribute('type')).toBe('button');
      expect(button.getAttribute('data-inspection-frame')).toBe(String(index));
      expect(button.getAttribute('aria-pressed')).toBe(String(index === 2));
      expect(button.getAttribute('data-visited')).toBe(String(visited));
      expect(button.textContent).toContain('Frame ' + (index + 1));
      expect(button.textContent).toContain(index === 0 || index === 5 ? 'Outside' : index === 1 || index === 4 ? 'Shoulder' : 'Centre');
      expect(button.textContent).toContain(visited ? 'Visited' : 'Not yet visited');
    });
    expect(view.querySelector('[data-inspection-queen-status="true"]')).toBeTruthy();
    expect(view.querySelector('[data-inspection-queen-link]')).toBeNull();
    expect(view.querySelector('[data-inspection-feedback]').textContent).toContain('Recorded inspection');
    expect(view.querySelector('[data-interior-inspection-return="true"]')).toBeTruthy();
    expect(view.querySelector('#beehive-guided-inspection-title').getAttribute('tabindex')).toBe('-1');
  });

  it('shows zero visits for malformed input and retains the older inspection comparison', () => {
    const view = staticView({ hive3dFramesSeen: '012345' });
    expect(view.querySelector('[data-inspection-frame-progress]').textContent).toContain('Frames explored: 0 of 6');
    expect(view.querySelectorAll('[data-inspection-frame][data-visited="true"]')).toHaveLength(0);
    const feedback = view.querySelector('[data-inspection-feedback]');
    expect(feedback.querySelector('[data-inspection-result="brood"] [data-inspection-expected]').textContent).toBe('Solid, mostly continuous');
    expect(feedback.querySelector('[data-inspection-result="cells"] [data-inspection-expected]').textContent).toBe('No');
  });

  it('keeps winter inspection guidance instead of offering the active preparation route', () => {
    const view = staticView({ day: 100 });
    expect(view.querySelector('[data-beehive-guided-inspection="winter"]').textContent).toContain('Keep the hive closed');
    expect(view.querySelector('[data-inspection-preparation]')).toBeNull();
    expect(view.querySelector('[data-inspection-record]')).toBeNull();
  });
});

describe('inspection route interactions preserve the colony and the recorded review', () => {
  it('opens the chosen cutaway frame, normalizes visits, and returns focus without editing work', async () => {
    await mount({ hive3dFrame: 0, hive3dExploded: false, hive3dPart: null, hive3dFramesSeen: [5, 5, '2', 8] });
    const before = structuredClone(latest);
    await click('[data-inspection-frame="2"]');
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive,
      hive3dFrame: 2, hive3dPart: 'brood_frames', hive3dExploded: true, hive3dFramesSeen: [5, 2]
    } });
    expect(document.activeElement).toBe(host.querySelector('#beehive-interior-read-title'));
    expect(writes).toHaveBeenCalledTimes(1);
    expect(awardXP).not.toHaveBeenCalled();
    expect(host.querySelector('[data-inspection-frame="2"]').getAttribute('data-visited')).toBe('true');
    const afterSelection = structuredClone(latest);
    await click('[data-interior-inspection-return="true"]');
    expect(document.activeElement).toBe(host.querySelector('#beehive-guided-inspection-title'));
    expect(latest).toEqual(afterSelection);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(awardXP).not.toHaveBeenCalled();
    await click('[data-interior-frame="3"]');
    expect(latest).toEqual({ ...afterSelection, beehive: { ...afterSelection.beehive,
      hive3dFrame: 3, hive3dFramesSeen: [5, 2, 3]
    } });
  });

  it('records valid answers without requiring every frame or a found queen and saves the normalized count', async () => {
    await mount({ hive3dFramesSeen: [1, 1, 6, '0', null], inspectionDraft: { brood: 'solid', cells: 'no' } });
    const before = structuredClone(latest);
    expect(host.querySelector('[data-inspection-record]').disabled).toBe(false);
    await click('[data-inspection-record]');
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive,
      lastInspection: { day: 40, framesRead: 1, queenFound: false, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: true },
      inspectionDraft: {}, inspectionsDone: 5
    } });
    expect(before.beehive.lastInspection).toEqual(record);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('beehive', 14, 'Guided hive inspection');
    expect(quest().check(latest.beehive)).toBe(false);
  });
});
