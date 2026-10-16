import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
let config, host, root, latest, writes, awardXP, replaceData;
const selectors = {
  disclosure: '[data-inspection-brood-guide="true"]',
  toggle: '[data-inspection-brood-guide-toggle="true"]',
  content: '[data-inspection-brood-guide-content="true"]',
  scope: '[data-inspection-brood-guide-scope="true"]',
  inspect: '[data-inspection-brood-inspect="true"]'
};
const savedRecord = { day: 40, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: true, framesRead: 6, queenFound: true };
const colony = (patch = {}) => ({
  viewMode: 'beekeeper', day: 40, tutorialDone: true, motionPaused: true, autoAdvance: false,
  soundOn: false, show3dHive: true, hive3dFrame: 2, hive3dExploded: true, hive3dPart: 'brood_frames',
  queenHealth: 100, workers: 8000, honey: 60, syrup: 0, pollen: 20, brood: 8000, capacity: 80,
  morale: 80, varroaLevel: 5, actionPoints: 3, colonySurvived: true,
  simulationSeed: 2468, randomState: 1357, seededFromDay: 0, experimentRunSerial: 1, modelVersion: 'colony-daily-1.2',
  inspectionDraft: {}, inspectionsDone: 4, hive3dFramesSeen: [0, 2], hive3dFoundQueen: false,
  lastInspection: { ...savedRecord },
  beekeeperNotebook: { prediction: 'Keep my prediction', evidence: 'Keep my observations', explanation: 'Keep my explanation' },
  ...patch
});

beforeAll(() => { resetStemLab(); config = loadTool(TOOL, 'beehive'); });
afterEach(() => {
  if (root) act(() => root.unmount());
  if (host) host.remove();
  root = null; host = null; replaceData = null;
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
function diagram(view, kind) { return view.querySelector('[data-inspection-brood-diagram="' + kind + '"]'); }
function examples(view) { return ['solid', 'spotty'].map(kind => diagram(view, kind).outerHTML); }

describe('brood pattern teaching guide', () => {
  it('offers an optional named disclosure with paired static examples, accessible names, and guidance linked to the brood question', () => {
    const view = staticView();
    const disclosure = view.querySelector(selectors.disclosure), summary = view.querySelector(selectors.toggle);
    expect(disclosure.tagName).toBe('DETAILS'); expect(disclosure.open).toBe(false);
    expect(summary.tagName).toBe('SUMMARY'); expect(summary.parentElement).toBe(disclosure);
    expect(summary.textContent).toContain('Compare brood patterns');
    expect(view.querySelector(selectors.scope).textContent).toMatch(/Teaching examples only/i);
    expect(view.querySelector(selectors.scope).textContent).toMatch(/not.*(colony|reading)/i);
    const bottomBar = view.querySelector('[data-inspection-bottom-bar]');
    expect(disclosure.compareDocumentPosition(bottomBar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const [kind, count, title] of [['solid', 14, 'Solid example'], ['spotty', 10, 'Spotty example']]) {
      const figure = view.querySelector('[data-inspection-brood-example="' + kind + '"]'), svg = diagram(view, kind);
      expect(figure.tagName).toBe('FIGURE'); expect(figure.textContent).toContain(title);
      expect(svg.tagName.toLowerCase()).toBe('svg'); expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toMatch(new RegExp(kind, 'i'));
      const cells = Array.from(svg.querySelectorAll('polygon[data-brood-guide-cell]'));
      expect(cells).toHaveLength(35);
      expect(cells.filter(cell => cell.dataset.broodGuideCell === 'brood')).toHaveLength(count);
      const positions = cells.map(cell => cell.dataset.broodGuidePosition);
      expect(new Set(positions).size).toBe(35);
      expect(positions.slice().sort()).toEqual(Array.from({ length: 5 }, (_, row) => Array.from({ length: 7 }, (_, col) => row + ':' + col)).flat().sort());
      for (const cell of cells) {
        const position = cell.dataset.broodGuidePosition;
        const [row, col] = position.split(':').map(Number);
        const gaps = kind === 'solid' ? ['2:3'] : ['1:2', '1:4', '2:3', '3:2', '3:4'];
        const brood = row >= 1 && row <= 3 && col >= 1 && col <= 5 && !gaps.includes(position);
        expect(cell.dataset.broodGuideCell, kind + ' ' + position).toBe(brood ? 'brood' : 'blank');
        expect(cell.parentElement.querySelectorAll('circle')).toHaveLength(brood ? 1 : 0);
        expect(cell.parentElement.querySelectorAll('path')).toHaveLength(brood ? 1 : 0);
      }
      expect(svg.querySelectorAll('button, a, input, [tabindex="0"], [role="button"]')).toHaveLength(0);
    }
    const broodGroup = view.querySelector('[role="radiogroup"][aria-label="Brood pattern"]');
    expect(broodGroup.getAttribute('aria-describedby').split(/\s+/)).toContain('beehive-inspection-brood-guide-help');
    expect(view.getElementById('beehive-inspection-brood-guide-help').textContent).toContain('Compare the examples above, then inspect the current brood before choosing.');
    expect(disclosure.compareDocumentPosition(broodGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(view.querySelector(selectors.inspect).textContent).toContain('Inspect current brood');
  });

  it('keeps both examples fixed when the colony health, frame, and capacity change', async () => {
    await mount({ inspectionDraft: { brood: 'spotty', cells: 'yes', note: 'Keep my draft note' } });
    await click(selectors.toggle);
    const before = structuredClone(latest), pictures = examples(host);
    const feedback = host.querySelector('[data-inspection-feedback]').textContent;
    const next = { ...before, beehive: { ...before.beehive, queenHealth: 40, hive3dFrame: 5, capacity: 120 } };
    await act(async () => { replaceData(next); await Promise.resolve(); });
    expect(examples(host)).toEqual(pictures);
    expect(host.querySelector(selectors.disclosure).open).toBe(true);
    expect(host.querySelector('[data-inspection-feedback]').textContent).toBe(feedback);
    expect(latest).toEqual(next); expect(latest.beehive.lastInspection).toEqual(savedRecord);
    expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  });

  it('opens and closes without choosing answers or changing colony work', async () => {
    await mount();
    const before = structuredClone(latest);
    for (const open of [true, false, true, false]) {
      await click(selectors.toggle);
      expect(host.querySelector(selectors.disclosure).open).toBe(open);
      expect(host.querySelector('[data-inspection-record]').disabled).toBe(true);
      expect(host.querySelectorAll('[data-inspection-choice][aria-checked="true"]')).toHaveLength(0);
      expect(latest).toEqual(before);
      expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
    }
  });

  it('opens current brood from queen and cell studies, clears the cell selection, and preserves held readings and saved work', async () => {
    await mount({ inspectionDraft: { brood: 'spotty', cells: 'no' } });
    await click('[data-interior-hold]');
    const held = host.querySelector('[data-reference-card="held"]').textContent;
    expect(held).toContain('Day 40');
    await click(selectors.toggle);
    const before = structuredClone(latest), pictures = examples(host);
    for (const start of ['[data-interior-topic="queen"]', '[data-interior-role="honey"]']) {
      await click(start);
      expect(host.querySelector(start).getAttribute('aria-pressed')).toBe('true');
      await click(selectors.inspect);
      expect(document.activeElement).toBe(host.querySelector('#beehive-interior-detail-title'));
      expect(host.querySelector('[data-interior-detail="brood"]')).toBeTruthy();
      expect(host.querySelector('[data-interior-topic="brood"]').getAttribute('aria-pressed')).toBe('true');
      expect(host.querySelectorAll('[data-interior-role][aria-pressed="true"]')).toHaveLength(0);
      expect(host.querySelector('[data-reference-card="held"]').textContent).toBe(held);
      await click('[data-interior-inspection-return="true"]');
      expect(document.activeElement).toBe(host.querySelector('#beehive-guided-inspection-title'));
      expect(host.querySelector(selectors.disclosure).open).toBe(true);
      expect(examples(host)).toEqual(pictures);
      expect(latest).toEqual(before);
      expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
    }
  });

  it.each([{ queenHealth: 84, brood: 'spotty' }, { queenHealth: 85, brood: 'solid' }])('keeps the existing model answer and scoring at queen health $queenHealth', async ({ queenHealth, brood }) => {
    await mount({ queenHealth, inspectionDraft: { brood, cells: 'no' } });
    await click(selectors.toggle);
    const pictures = examples(host), before = structuredClone(latest);
    await click('[data-inspection-record]');
    expect(latest).toEqual({ ...before, beehive: { ...before.beehive,
      lastInspection: { day: 40, framesRead: 2, queenFound: false, brood, cells: 'no', broodCorrect: true, cellsCorrect: true },
      inspectionDraft: {}, inspectionsDone: 5
    } });
    expect(examples(host)).toEqual(pictures);
    expect(writes).toHaveBeenCalledTimes(1); expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('beehive', 14, 'Guided hive inspection');
  });

  it('keeps winter guidance without exposing the active brood guide or answering controls', () => {
    const view = staticView({ day: 100 });
    expect(view.querySelector('[data-beehive-guided-inspection="winter"]').textContent).toContain('Keep the hive closed');
    expect(view.querySelector(selectors.disclosure)).toBeNull();
    expect(view.querySelector('[data-inspection-brood-diagram]')).toBeNull();
    expect(view.querySelector(selectors.inspect)).toBeNull();
    expect(view.querySelector('[data-inspection-record]')).toBeNull();
  });
});
