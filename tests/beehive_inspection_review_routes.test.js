import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
let config, host, root, latest, writes, awardXP, replaceData, decoy;
const routes = {
  brood: { disclosure: '[data-inspection-brood-guide]', toggle: '[data-inspection-brood-guide-toggle]', label: 'Review brood examples' },
  cells: { disclosure: '[data-inspection-bottom-bar]', toggle: '[data-inspection-bottom-bar-toggle]', label: 'Observe current bottom bar' }
};
const savedRecord = { day: 40, brood: 'spotty', cells: 'no', broodCorrect: false, cellsCorrect: false, framesRead: 6, queenFound: true };
const colony = (patch = {}) => ({
  viewMode: 'beekeeper', day: 40, tutorialDone: true, motionPaused: true, autoAdvance: false,
  soundOn: false, show3dHive: true, hive3dFrame: 2, hive3dExploded: true, hive3dPart: 'brood_frames',
  queenHealth: 100, workers: 14000, honey: 60, syrup: 0, pollen: 20, brood: 8000, capacity: 80,
  morale: 80, varroaLevel: 5, actionPoints: 3, colonySurvived: true,
  simulationSeed: 2468, randomState: 1357, seededFromDay: 0, experimentRunSerial: 1, modelVersion: 'colony-daily-1.2',
  inspectionDraft: { brood: 'solid', cells: 'yes', note: 'Keep my draft note' }, inspectionsDone: 4,
  hive3dFramesSeen: [0, 2], hive3dFoundQueen: false, lastInspection: { ...savedRecord },
  beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my observations', explanation: 'Keep my explanation' },
  ...patch
});

beforeAll(() => { resetStemLab(); config = loadTool(TOOL, 'beehive'); });
afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  if (decoy) decoy.remove();
  root = null; host = null; decoy = null; replaceData = null;
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
function returnSelector(kind) { return '[data-inspection-review-return="' + kind + '"]'; }
function resourceSelector(kind) { return '[data-inspection-review-resource="' + kind + '"]'; }
function expectNoWrites(before) {
  expect(latest).toEqual(before);
  expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
}

describe('saved inspection review routes', () => {
  it('places evidence controls after the saved status with clear scope and a focusable return heading', () => {
    const view = staticView(), feedback = view.querySelector('[data-inspection-feedback]');
    const next = view.querySelector('[data-inspection-review-next="true"]');
    expect(feedback.getAttribute('role')).toBe('status');
    expect(next.tagName).toBe('SECTION');
    expect(next.parentElement).toBe(feedback.parentElement);
    expect(feedback.nextElementSibling).toBe(next);
    expect(next.closest('[role="status"]')).toBeNull();
    expect(next.querySelector('#beehive-inspection-review-next-title').textContent).toBe('Review with evidence');
    expect(next.textContent).toContain('Saved results stay as recorded. Current observations can change after management actions.');
    const title = feedback.querySelector('[data-inspection-review-title="true"]');
    expect(title.id).toBe('beehive-inspection-review-title');
    expect(title.getAttribute('data-beehive-focus-panel')).toBe('true');
    expect(title.tagName).toBe('H4'); expect(title.getAttribute('tabindex')).toBe('-1');
    expect(title.textContent).toContain('Recorded inspection');
    expect(feedback.querySelectorAll('button, a, input')).toHaveLength(0);
    expect(next.querySelectorAll('[data-inspection-review-resource]')).toHaveLength(2);
    for (const [kind, route] of Object.entries(routes)) {
      const button = next.querySelector(resourceSelector(kind));
      expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button');
      expect(button.textContent).toContain(route.label);
      const back = view.querySelector(route.disclosure).querySelector(returnSelector(kind));
      expect(back.tagName).toBe('BUTTON'); expect(back.type).toBe('button');
      expect(back.textContent).toBe('Return to recorded inspection');
    }
  });

  it.each([
    { label: 'no record', patch: { lastInspection: null } },
    { label: 'a previous-day record', patch: { lastInspection: { ...savedRecord, day: 39 } } },
    { label: 'winter', patch: { day: 100, lastInspection: { ...savedRecord, day: 100 } } }
  ])('omits review routes for $label', ({ patch }) => {
    const view = staticView(patch);
    expect(view.querySelector('[data-inspection-feedback]')).toBeNull();
    expect(view.querySelector('[data-inspection-review-next]')).toBeNull();
    expect(view.querySelector('[data-inspection-review-resource]')).toBeNull();
    expect(view.querySelector('[data-inspection-review-return]')).toBeNull();
    expect(view.querySelector('[data-inspection-review-title]')).toBeNull();
  });

  it.each(['brood', 'cells'])('opens and returns from the %s resource within its own hive, including an already-open disclosure', async kind => {
    await mount();
    await click('[data-interior-hold]');
    await click('[data-interior-topic="queen"]');
    await click('[data-interior-role="honey"]');
    const before = structuredClone(latest);
    const held = host.querySelector('[data-reference-card="held"]').textContent;
    expect(held).toContain('Day 40');
    const detail = host.querySelector('[data-interior-detail]').outerHTML;
    const feedback = host.querySelector('[data-inspection-feedback]').outerHTML;
    const route = routes[kind], disclosure = host.querySelector(route.disclosure);
    expect(disclosure.open).toBe(false);
    // Another hive before this one must not receive the route or return focus.
    decoy = document.createElement('div'); decoy.setAttribute('data-beehive-root', 'true');
    decoy.innerHTML = '<details data-inspection-brood-guide="true"><summary data-inspection-brood-guide-toggle="true">Other brood</summary></details>'
      + '<details data-inspection-bottom-bar="true"><summary data-inspection-bottom-bar-toggle="true">Other cells</summary></details>'
      + '<h4 id="beehive-inspection-review-title" data-inspection-review-title="true" data-beehive-focus-panel="true" tabindex="-1">Other recorded inspection</h4>';
    document.body.insertBefore(decoy, host);
    for (let attempt = 0; attempt < 2; attempt++) {
      await click(resourceSelector(kind));
      expect(disclosure.open).toBe(true);
      expect(document.activeElement).toBe(host.querySelector(route.toggle));
      expect(decoy.querySelector(route.disclosure).open).toBe(false);
      expect(host.querySelector(routes[kind === 'brood' ? 'cells' : 'brood'].disclosure).open).toBe(false);
      await click(returnSelector(kind));
      expect(document.activeElement).toBe(host.querySelector('[data-inspection-review-title="true"]'));
      expect(document.activeElement).not.toBe(decoy.querySelector('[data-inspection-review-title="true"]'));
      expect(disclosure.open).toBe(true);
      expect(host.querySelector('[data-reference-card="held"]').textContent).toBe(held);
      expect(host.querySelector('[data-interior-detail]').outerHTML).toBe(detail);
      expect(host.querySelector('[data-interior-role="honey"]').getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelector('[data-inspection-feedback]').outerHTML).toBe(feedback);
      expectNoWrites(before);
    }
  });

  it('keeps saved feedback and drafts intact while the current bottom-bar observation changes after a rerender', async () => {
    await mount();
    const feedback = host.querySelector('[data-inspection-feedback]').textContent;
    expect(host.querySelector('[data-inspection-bottom-bar-diagram]').getAttribute('data-shown')).toBe('true');
    await click(resourceSelector('cells'));
    const next = { ...latest, beehive: { ...latest.beehive, queenHealth: 30, capacity: 120 } };
    const before = structuredClone(next);
    await act(async () => { replaceData(next); await Promise.resolve(); });
    expect(host.querySelector(routes.cells.disclosure).open).toBe(true);
    expect(host.querySelector('[data-inspection-bottom-bar-diagram]').getAttribute('data-shown')).toBe('false');
    expect(host.querySelector('[data-inspection-feedback]').textContent).toBe(feedback);
    for (const kind of ['cells', 'brood']) {
      await click(resourceSelector(kind));
      expect(document.activeElement).toBe(host.querySelector(routes[kind].toggle));
      await click(returnSelector(kind));
      expect(document.activeElement).toBe(host.querySelector('[data-inspection-review-title="true"]'));
      expectNoWrites(before);
    }
    expect(latest.beehive.lastInspection).toEqual(savedRecord);
  });

  it('offers both routes for an incomplete legacy comparison without inventing saved results', async () => {
    const legacy = { day: 40, brood: 'solid', cells: 'no', oldNote: 'Keep this legacy note' };
    await mount({ lastInspection: legacy, inspectionDraft: { brood: 'unsupported', cells: null, note: 'Preserve incomplete draft' } });
    const before = structuredClone(latest), feedback = host.querySelector('[data-inspection-feedback]').textContent;
    expect(host.querySelectorAll('[data-inspection-result][data-result="unknown"]')).toHaveLength(2);
    expect(host.querySelector('[data-inspection-record]').disabled).toBe(true);
    for (const kind of ['brood', 'cells']) {
      await click(resourceSelector(kind));
      expect(host.querySelector(routes[kind].disclosure).open).toBe(true);
      expect(document.activeElement).toBe(host.querySelector(routes[kind].toggle));
      await click(returnSelector(kind));
      expect(document.activeElement).toBe(host.querySelector('[data-inspection-review-title="true"]'));
      expect(host.querySelector('[data-inspection-feedback]').textContent).toBe(feedback);
      expect(host.querySelectorAll('[data-inspection-result][data-result="unknown"]')).toHaveLength(2);
      expectNoWrites(before);
    }
  });
});
