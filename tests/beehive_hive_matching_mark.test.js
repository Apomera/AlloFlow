import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
const SHORTCUT = '[data-interior-inspect-matching="true"]';
let config, previousExports, host, root, latest, writes, awardXP, replaceData;
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
  config = loadTool(TOOL, 'beehive');
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
  await act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
}
async function replace(patch) {
  const next = { ...latest, beehive: { ...latest.beehive, ...patch } };
  await act(async () => { replaceData(next); await Promise.resolve(); });
}
function position() {
  return { row: Number(host.querySelector('[data-interior-lens-row]').value), col: Number(host.querySelector('[data-interior-lens-column]').value) };
}
function cells(selector = '[data-interior-cell][data-highlighted="true"]') {
  return [...host.querySelectorAll(selector)].map(node => {
    const [row, col] = node.getAttribute('data-interior-cell-position').split(':').map(Number);
    return { row, col, role: node.getAttribute('data-interior-cell') || node.getAttribute('data-held-cell') };
  });
}
function nearestDrawn(origin) {
  // Read the actual highlighted drawing instead of reproducing the cell model.
  const highlighted = cells();
  expect(highlighted.length).toBeGreaterThan(0);
  const distance = cell => Math.abs(cell.row - origin.row) + Math.abs(cell.col - origin.col);
  const shortest = Math.min(...highlighted.map(distance));
  return highlighted.filter(cell => distance(cell) === shortest).sort((a, b) => a.row - b.row || a.col - b.col)[0];
}
function selection() {
  return {
    topic: host.querySelector('[data-interior-topic][aria-pressed="true"]').getAttribute('data-interior-topic'),
    role: host.querySelector('[data-interior-role][aria-pressed="true"]')?.getAttribute('data-interior-role') || null
  };
}
function expectLocalOnly(before) {
  expect(latest).toEqual(before);
  expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
}
async function expectMatchingOpen(origin) {
  const target = nearestDrawn(origin), beforeSelection = selection();
  await click(SHORTCUT);
  expect(position()).toEqual({ row: target.row, col: target.col });
  expect(selection()).toEqual(beforeSelection);
  const heading = host.querySelector('[data-interior-lens-title="true"]');
  expect(heading.id).toBe('beehive-interior-lens-title');
  expect(heading.getAttribute('tabindex')).toBe('-1');
  expect(heading.getAttribute('data-beehive-focus-panel')).toBe('true');
  expect(document.activeElement).toBe(heading);
  expect(host.querySelector(SHORTCUT).getAttribute('aria-controls')).toBe('beehive-interior-cell-lens');
  expect(host.querySelector(SHORTCUT).getAttribute('aria-expanded')).toBe('true');
  const selected = host.querySelector('[data-lens-current-cell][data-lens-position="' + target.row + ':' + target.col + '"]');
  expect(selected.getAttribute('data-highlighted')).toBe('true');
  return target;
}

describe('open a matching current comb mark', () => {
  it.each([
    ['shown', {}],
    ['elsewhere', { hive3dFrame: 0 }],
    ['absent', { honey: 0, syrup: 0, pollen: 0, brood: 0, queenHealth: 0 }],
    ['unavailable', { pollen: undefined }]
  ])('offers the shortcut only for marks shown in the current frame: %s', (state, patch) => {
    const view = staticView(patch), panel = view.querySelector('[data-interior-pattern-status]');
    expect(panel.getAttribute('data-interior-pattern-status')).toBe(state);
    const button = panel.querySelector(SHORTCUT);
    if (state !== 'shown') { expect(button).toBeNull(); return; }
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
    expect(button.textContent).toBe('Open matching close-up');
    expect(button.getAttribute('aria-describedby')).toBe('beehive-interior-pattern-note');
    expect(button.getAttribute('aria-controls')).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(panel.querySelector('[data-interior-highlight-note]').contains(button)).toBe(false);
    expect(view.querySelector('[data-interior-cell-lens]')).toBeNull();
  });

  it('opens food, pollen and brood highlights without narrowing the selected topic or writing colony data', async () => {
    await mount();
    const before = structuredClone(latest);
    let origin = { row: 5, col: 10 };
    for (const topic of ['food', 'pollen', 'brood']) {
      await click('[data-interior-topic="' + topic + '"]');
      expect(selection()).toEqual({ topic, role: null });
      await expectMatchingOpen(origin);
      origin = position();
      await click('[data-interior-lens-close]');
      expect(host.querySelector('[data-interior-cell-lens]')).toBeNull();
      expect(document.activeElement).toBe(host.querySelector(SHORTCUT));
    }
    expectLocalOnly(before);
  });

  it('respects every selected mark and includes foundation in the blank-cell selection', async () => {
    await mount();
    const before = structuredClone(latest);
    await click('[data-interior-lens-toggle]');
    for (const role of ['honey', 'pollen', 'open_brood', 'capped_brood', 'drone_brood', 'empty']) {
      await click('[data-interior-role="' + role + '"]');
      expect(selection().role).toBe(role);
      const highlights = cells();
      expect(highlights.every(cell => cell.role === role || role === 'empty' && cell.role === 'foundation')).toBe(true);
      await expectMatchingOpen(position());
    }
    const foundation = cells('[data-interior-cell="foundation"]')[0];
    expect(foundation).toBeTruthy();
    await click('[data-interior-cell-position="' + foundation.row + ':' + foundation.col + '"][data-interior-cell]');
    expect(selection().role).toBe('empty');
    await expectMatchingOpen({ row: foundation.row, col: foundation.col });
    expect(position()).toEqual({ row: foundation.row, col: foundation.col });
    expectLocalOnly(before);
  });

  it('chooses the nearest visible match from an old position with deterministic row and column ties', async () => {
    await mount();
    const before = structuredClone(latest);
    await click('[data-interior-topic="pollen"]');
    const highlights = cells();
    const origin = cells('[data-interior-cell][data-highlighted="false"]').find(candidate => {
      const distances = highlights.map(cell => Math.abs(cell.row - candidate.row) + Math.abs(cell.col - candidate.col));
      const shortest = Math.min(...distances);
      return distances.filter(distance => distance === shortest).length > 1;
    });
    expect(origin, 'fixture has a nearest-distance tie in the visible pollen marks').toBeTruthy();
    await click('[data-interior-cell-position="' + origin.row + ':' + origin.col + '"][data-interior-cell]');
    await click('[data-interior-topic="pollen"]');
    expect(position()).toEqual({ row: origin.row, col: origin.col });
    const target = await expectMatchingOpen(origin);
    expect({ row: target.row, col: target.col }).not.toEqual({ row: origin.row, col: origin.col });
    expectLocalOnly(before);
  });

  it('uses the current drawing after readings change while preserving the held reference and saved work', async () => {
    await mount();
    await click('[data-interior-hold]');
    const heldText = host.querySelector('[data-reference-card="held"]').textContent;
    await replace({ brood: 1500 });
    const before = structuredClone(latest);
    await click('[data-interior-topic="brood"]');
    const current = new Set(cells().map(cell => cell.row + ':' + cell.col));
    const heldOnly = cells('[data-held-cell][data-highlighted="true"]').find(cell => !current.has(cell.row + ':' + cell.col));
    expect(heldOnly, 'held brood drawing contains a position absent from the current brood patch').toBeTruthy();
    await click('[data-interior-cell-position="' + heldOnly.row + ':' + heldOnly.col + '"][data-interior-cell]');
    await click('[data-interior-topic="brood"]');
    await expectMatchingOpen(heldOnly);
    expect(position()).not.toEqual({ row: heldOnly.row, col: heldOnly.col });
    expect(host.querySelector('[data-reference-card="held"]').textContent).toBe(heldText);
    expect(host.querySelector('.bee-interior-study').getAttribute('data-comparing')).toBe('true');
    expectLocalOnly(before);
  });

  it('omits the unmapped queen shortcut and returns to the ordinary lens control if the originating shortcut disappears', async () => {
    await mount();
    const before = structuredClone(latest);
    await click(SHORTCUT);
    await click('[data-interior-topic="queen"]');
    expect(host.querySelector('[data-interior-pattern-status="unmapped"]')).toBeTruthy();
    expect(host.querySelector(SHORTCUT)).toBeNull();
    await click('[data-interior-lens-close]');
    expect(document.activeElement).toBe(host.querySelector('[data-interior-lens-toggle]'));
    expectLocalOnly(before);
  });

  it('preserves ordinary close-up opening and return focus after using the matching shortcut', async () => {
    await mount();
    const before = structuredClone(latest);
    await click(SHORTCUT); await click('[data-interior-lens-close]');
    expect(host.querySelector('[data-interior-cell-lens]')).toBeNull();
    await click('[data-interior-lens-toggle]');
    const reopenedPosition = position();
    await click('[data-interior-lens-close]');
    expect(document.activeElement).toBe(host.querySelector('[data-interior-lens-toggle]'));
    await click('[data-interior-lens-toggle]');
    expect(position()).toEqual(reopenedPosition);
    await click('[data-interior-lens-close]');
    await click('[data-interior-cell-position="0:0"][data-interior-cell]');
    expect(position()).toEqual({ row: 0, col: 0 });
    await click('[data-interior-lens-close]');
    expect(document.activeElement).toBe(host.querySelector('[data-interior-lens-toggle]'));
    expectLocalOnly(before);
  });

  it('revalidates a saved event handler against live frame and missing-reading changes', async () => {
    await mount();
    const button = host.querySelector(SHORTCUT);
    expect(button).toBeTruthy();
    const propsKey = Object.keys(button).find(key => key.startsWith('__reactProps$'));
    expect(propsKey).toBeTruthy();
    const savedHandler = button[propsKey].onClick;
    const dispatchSaved = async () => {
      // Supply the still-connected hive root so this tests live-data guards,
      // rather than merely the detached-button guard.
      await act(async () => { savedHandler({ currentTarget: host.querySelector('[data-beehive-root]') }); await Promise.resolve(); });
    };
    await replace({ hive3dFrame: 0 });
    expect(host.querySelector('[data-interior-pattern-status="elsewhere"]')).toBeTruthy();
    let before = structuredClone(latest);
    await dispatchSaved();
    expect(host.querySelector('[data-interior-cell-lens]')).toBeNull();
    expectLocalOnly(before);
    await replace({ hive3dFrame: 2, brood: 0 });
    expect(host.querySelector('[data-interior-pattern-status="absent"]')).toBeTruthy();
    before = structuredClone(latest);
    await dispatchSaved();
    expect(host.querySelector('[data-interior-cell-lens]')).toBeNull();
    expectLocalOnly(before);
    await replace({ honey: undefined });
    expect(host.querySelector('[data-interior-pattern-status="unavailable"]')).toBeTruthy();
    expect(writes).toHaveBeenCalledTimes(1); // Existing saved-data recovery removes the invalid field.
    writes.mockClear();
    before = structuredClone(latest);
    await dispatchSaved();
    expect(host.querySelector('[data-interior-cell-lens]')).toBeNull();
    expectLocalOnly(before);
  });
});
