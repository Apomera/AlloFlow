import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
let config, BH, previousExports, host, root, latest, writes, awardXP, replaceData;
const labels = { shown: 'Shown here', elsewhere: 'Shown on another frame', absent: 'No matching marks', unmapped: 'Queen not mapped', unavailable: 'Unavailable' };
const colony = (patch = {}) => ({
  viewMode: 'beekeeper', day: 40, tutorialDone: true, motionPaused: true, autoAdvance: false,
  soundOn: false, show3dHive: true, hive3dFrame: 2, hive3dExploded: true, hive3dPart: 'brood_frames',
  queenHealth: 90, workers: 8000, honey: 40, syrup: 5, pollen: 12, brood: 6000, capacity: 80,
  morale: 80, varroaLevel: 5, actionPoints: 3, colonySurvived: true,
  simulationSeed: 2468, randomState: 1357, seededFromDay: 40, experimentRunSerial: 1, modelVersion: 'colony-daily-1.2',
  inspectionDraft: { brood: 'spotty', cells: 'yes', note: 'Keep my draft note' }, inspectionsDone: 4,
  hive3dFramesSeen: [5, 5, '1', 8], hive3dFoundQueen: false,
  lastInspection: { day: 40, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: true, framesRead: 6, queenFound: true },
  beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my observations', explanation: 'Keep my explanation' },
  ...patch
});
beforeAll(() => {
  previousExports = window.__RR_TEST_EXPORTS__;
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  config = loadTool(TOOL, 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  root = null; host = null; replaceData = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
afterAll(() => {
  resetStemLab();
  if (previousExports === undefined) delete window.__RR_TEST_EXPORTS__;
  else window.__RR_TEST_EXPORTS__ = previousExports;
});
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
function guide(data, topic = 'brood', role = null) { return BH.bhHiveInteriorFrameGuide(data, data.hive3dFrame, topic, role); }
function expectStatus(view, data, topic = 'brood', role = null) {
  const model = guide(data, topic, role);
  const state = !model.available ? 'unavailable' : !model.mapped ? 'unmapped'
    : model.matchingFrames.includes(data.hive3dFrame) ? 'shown' : model.matchingFrames.length ? 'elsewhere' : 'absent';
  const panel = view.querySelector('[data-interior-pattern-status]');
  expect(panel.getAttribute('data-interior-pattern-status')).toBe(state);
  expect(panel.querySelector('[data-interior-pattern-label]').textContent).toBe(labels[state]);
  const context = panel.querySelector('[data-interior-pattern-context]');
  expect(context.tagName).toBe('H5');
  expect(context.textContent).toBe('Current model · Frame ' + (data.hive3dFrame + 1) + ' of 6');
  const note = panel.querySelector('[data-interior-highlight-note]');
  expect(note.id).toBe('beehive-interior-pattern-note');
  expect(note.getAttribute('role')).toBe('status'); expect(note.getAttribute('aria-live')).toBe('polite');
  const button = panel.querySelector('[data-interior-show-matching]');
  if (state === 'elsewhere') {
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
    expect(button.textContent).toBe('Show matching frame');
    expect(button.getAttribute('aria-describedby')).toBe(note.id);
    expect(note.textContent.endsWith('Matching marks are shown on another current frame.')).toBe(true);
  } else {
    expect(button).toBeNull();
    if (state === 'shown') expect(note.textContent).toBe(model.label + ' highlighted in this model frame.');
    if (state === 'absent') expect(note.textContent).toBe('No matching marks for ' + model.label + ' are shown across the six current model frames. This drawing does not measure cell counts.');
    if (state === 'unmapped') expect(note.textContent).toBe('Queen topic selected. The cutaway does not mark the queen’s location.');
    if (state === 'unavailable') expect(note.textContent).toBe('Pattern unavailable: a required colony reading is not recorded.');
  }
  return state;
}

describe('current hive pattern status', () => {
  it.each([
    ['shown', { hive3dFrame: 2 }],
    ['elsewhere', { hive3dFrame: 0 }],
    ['absent', { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 }],
    ['unavailable', { pollen: undefined }]
  ])('distinguishes %s using the actual current schematic', (state, patch) => {
    const data = colony(patch), view = staticView(patch);
    expect(expectStatus(view, data)).toBe(state);
    const title = view.querySelector('[data-interior-read-title="true"]');
    expect(title.id).toBe('beehive-interior-read-title');
    expect(title.getAttribute('tabindex')).toBe('-1');
    expect(title.getAttribute('data-beehive-focus-panel')).toBe('true');
  });

  it('keeps the queen unmapped and gives missing readings precedence over a queen-location explanation', async () => {
    await mount();
    const before = structuredClone(latest);
    await click('[data-interior-topic="queen"]');
    expect(expectStatus(host, latest.beehive, 'queen')).toBe('unmapped');
    expect(latest).toEqual(before);
    const next = { ...before, beehive: { ...before.beehive, honey: undefined } };
    await act(async () => { replaceData(next); await Promise.resolve(); });
    expect(expectStatus(host, latest.beehive, 'queen')).toBe('unavailable');
    // Existing saved-data recovery removes the invalid own field once. The
    // study controls must stay read-only after that independently verified repair.
    const recovered = { ...next, beehive: { ...next.beehive, saveRecovery: { fields: ['honey'] } } };
    delete recovered.beehive.honey;
    expect(latest).toEqual(recovered);
    expect(writes).toHaveBeenCalledTimes(1); expect(awardXP).not.toHaveBeenCalled();
    writes.mockClear();
    const settled = structuredClone(latest);
    for (const topic of ['brood', 'queen']) {
      await click('[data-interior-topic="' + topic + '"]');
      expect(expectStatus(host, latest.beehive, topic)).toBe('unavailable');
      expect(latest).toEqual(settled);
    }
    expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  });

  it('follows food, pollen, brood, and all cell-mark selections without changing colony state', async () => {
    await mount();
    const before = structuredClone(latest);
    for (const topic of ['food', 'pollen', 'brood']) {
      await click('[data-interior-topic="' + topic + '"]');
      expectStatus(host, latest.beehive, topic);
    }
    for (const role of ['honey', 'pollen', 'open_brood', 'capped_brood', 'drone_brood', 'empty']) {
      await click('[data-interior-topic="queen"]');
      await click('[data-interior-role="' + role + '"]');
      expectStatus(host, latest.beehive, 'queen', role);
    }
    const next = { ...before, beehive: { ...before.beehive, honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 } };
    await act(async () => { replaceData(next); await Promise.resolve(); });
    const roles = new Set(BH.bhHiveInteriorFrameModel(next.beehive, 2).cells.map(cell => cell.role));
    expect(roles.has('empty')).toBe(true); expect(roles.has('foundation')).toBe(true);
    expect(expectStatus(host, latest.beehive, 'queen', 'empty')).toBe('shown');
    expect(latest).toEqual(next);
    expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  });

  it('opens a matching current frame at the reading heading while preserving held readings and saved work', async () => {
    await mount({ hive3dFrame: 0, hive3dExploded: false, hive3dPart: null });
    await click('[data-interior-hold]');
    const held = host.querySelector('[data-reference-card="held"]').textContent;
    expect(held).toContain('Day 40');
    for (const kind of ['held', 'current']) expect(host.querySelector('[data-frame-caption="' + kind + '"]').textContent).toContain('Frame 1');
    const before = structuredClone(latest), target = guide(before.beehive).nextFrame;
    expect(expectStatus(host, before.beehive)).toBe('elsewhere');
    expect(target).not.toBeNull();
    await click('[data-interior-show-matching]');
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive,
      hive3dFrame: target, hive3dExploded: true, hive3dPart: 'brood_frames', hive3dFramesSeen: [5, target]
    } });
    expect(document.activeElement).toBe(host.querySelector('[data-interior-read-title="true"]'));
    expect(expectStatus(host, latest.beehive)).toBe('shown');
    expect(host.querySelector('[data-reference-card="held"]').textContent).toBe(held);
    expect(host.querySelector('.bee-interior-study').getAttribute('data-comparing')).toBe('true');
    for (const kind of ['held', 'current']) expect(host.querySelector('[data-frame-caption="' + kind + '"]').textContent).toContain('Frame ' + (target + 1));
    expect(writes).toHaveBeenCalledTimes(1); expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps the existing next-match control focused on the selected frame button', async () => {
    await mount({ hive3dFrame: 0 });
    const before = structuredClone(latest), target = guide(before.beehive).nextFrame;
    await click('[data-interior-next-match]');
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive, hive3dFrame: target, hive3dFramesSeen: [5, target] } });
    expect(document.activeElement).toBe(host.querySelector('[data-interior-frame="' + target + '"]'));
    expect(expectStatus(host, latest.beehive)).toBe('shown');
    expect(writes).toHaveBeenCalledTimes(1); expect(awardXP).not.toHaveBeenCalled();
  });
});
