import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.BEEHIVE_TEST_SOURCE || 'stem_lab/stem_tool_beehive.js';
let config, host, root, latest, writes, awardXP, replaceData;
const selectors = {
  disclosure: '[data-inspection-brood-guide="true"]',
  summary: '[data-inspection-brood-guide-toggle="true"]',
  overlay: '[data-inspection-brood-overlay-toggle="true"]',
  help: '[data-inspection-brood-overlay-help="true"]',
  inspect: '[data-inspection-brood-inspect="true"]'
};
const savedRecord = { day: 40, brood: 'solid', cells: 'no', broodCorrect: true, cellsCorrect: true, framesRead: 6, queenFound: true };
const colony = (patch = {}) => ({
  viewMode: 'beekeeper', day: 40, tutorialDone: true, motionPaused: true, autoAdvance: false,
  soundOn: false, show3dHive: true, hive3dFrame: 2, hive3dExploded: true, hive3dPart: 'brood_frames',
  queenHealth: 100, workers: 8000, honey: 60, syrup: 0, pollen: 20, brood: 8000, capacity: 80,
  morale: 80, varroaLevel: 5, actionPoints: 3, colonySurvived: true,
  simulationSeed: 2468, randomState: 1357, seededFromDay: 40, experimentRunSerial: 1, modelVersion: 'colony-daily-1.2',
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
function baseGeometry(view) {
  return ['solid', 'spotty'].map(kind => Array.from(diagram(view, kind).querySelectorAll('[data-brood-guide-cell]'), cell => ({
    cell: cell.outerHTML,
    marks: Array.from(cell.parentElement.querySelectorAll('circle:not([data-brood-guide-gap]), path'), mark => mark.outerHTML)
  })));
}
function points(node) {
  return node.getAttribute('points').trim().split(/\s+/).map(point => point.split(',').map(Number));
}
function center(node) {
  const vertices = points(node);
  return [0, 1].map(axis => vertices.reduce((sum, point) => sum + point[axis], 0) / vertices.length);
}
function insidePolygon([x, y], vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, yi] = vertices[i], [xj, yj] = vertices[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function assertOverlay(view, on) {
  expect(view.querySelector(selectors.overlay).getAttribute('aria-pressed')).toBe(String(on));
  for (const kind of ['solid', 'spotty']) {
    const svg = diagram(view, kind);
    expect(svg.querySelectorAll('[data-brood-guide-boundary]')).toHaveLength(on ? 1 : 0);
    expect(svg.querySelectorAll('[data-brood-guide-gap]')).toHaveLength(on ? (kind === 'solid' ? 1 : 5) : 0);
  }
}

describe('brood area teaching overlay', () => {
  it('starts off with one named toggle controlling both examples and clearer answer wording', () => {
    const view = staticView();
    const toggle = view.querySelector(selectors.overlay), disclosure = view.querySelector(selectors.disclosure);
    expect(disclosure.open).toBe(false);
    expect(toggle.tagName).toBe('BUTTON'); expect(toggle.type).toBe('button');
    expect(toggle.textContent).toBe('Show brood area guide');
    expect(toggle.getAttribute('aria-controls')).toBe('beehive-inspection-brood-examples');
    const controlled = view.getElementById(toggle.getAttribute('aria-controls'));
    expect(controlled.querySelectorAll('[data-inspection-brood-example]')).toHaveLength(2);
    expect(disclosure.contains(toggle)).toBe(true); expect(disclosure.contains(controlled)).toBe(true);
    expect(view.querySelector(selectors.help).textContent).toContain('gaps within the patch');
    expect(view.querySelector('[data-inspection-brood-guide-scope]').textContent).toMatch(/Teaching examples only.*not this colony/);
    expect(view.querySelector('[data-inspection-choice="brood:solid"]').textContent).toContain('Solid, mostly continuous');
    expect(view.querySelector('[data-inspection-result="brood"] [data-inspection-answer]').textContent).toBe('Solid, mostly continuous');
    expect(view.querySelector('[data-inspection-result="brood"] [data-inspection-expected]').textContent).toBe('Solid, mostly continuous');
    assertOverlay(view, false);
  });

  it('outlines only the central example area and rings its blank cells without changing any brood marks', async () => {
    await mount(); await click(selectors.summary);
    const geometry = baseGeometry(host), before = structuredClone(latest);
    const names = ['solid', 'spotty'].map(kind => diagram(host, kind).getAttribute('aria-label'));
    await click(selectors.overlay); assertOverlay(host, true);
    expect(baseGeometry(host)).toEqual(geometry);
    const legend = host.querySelector(selectors.help).textContent;
    expect(legend).toContain('Dashed boundary: example brood area.');
    expect(legend).toContain('Ring: unmarked cell inside that area.');
    expect(legend).toContain('Blank margins lie outside.');
    for (const [index, kind] of ['solid', 'spotty'].entries()) {
      const svg = diagram(host, kind), cells = Array.from(svg.querySelectorAll('[data-brood-guide-cell]'));
      const boundary = svg.querySelector('polygon[data-brood-guide-boundary="true"]');
      expect(boundary).toBeTruthy();
      const vertices = points(boundary);
      expect(vertices.length).toBeGreaterThanOrEqual(3);
      expect(vertices.flat().every(Number.isFinite)).toBe(true);
      expect(cells).toHaveLength(35);
      expect(cells.filter(cell => cell.dataset.broodGuideCell === 'brood')).toHaveLength(kind === 'solid' ? 14 : 10);
      for (const cell of cells) {
        const [row, col] = cell.dataset.broodGuidePosition.split(':').map(Number);
        expect(insidePolygon(center(cell), vertices), kind + ' ' + cell.dataset.broodGuidePosition)
          .toBe(row >= 1 && row <= 3 && col >= 1 && col <= 5);
      }
      const rings = Array.from(svg.querySelectorAll('circle[data-brood-guide-gap]'));
      expect(rings.map(ring => ring.dataset.broodGuideGap).sort())
        .toEqual(kind === 'solid' ? ['2:3'] : ['1:2', '1:4', '2:3', '3:2', '3:4']);
      for (const ring of rings) {
        const cell = cells.find(item => item.dataset.broodGuidePosition === ring.dataset.broodGuideGap);
        expect(cell.dataset.broodGuideCell).toBe('blank');
        const [x, y] = center(cell);
        expect(Number(ring.getAttribute('cx'))).toBeCloseTo(x);
        expect(Number(ring.getAttribute('cy'))).toBeCloseTo(y);
        expect(insidePolygon([x, y], vertices)).toBe(true);
      }
      expect(svg.getAttribute('aria-label')).toContain(names[index]);
      expect(svg.getAttribute('aria-label')).toContain(legend);
      expect(svg.querySelectorAll('button, a, input, [tabindex="0"], [role="button"]')).toHaveLength(0);
    }
    expect(latest).toEqual(before); expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  });

  it('toggles reversibly without selecting answers, enabling recording, moving focus, or writing colony work', async () => {
    await mount(); await click(selectors.summary);
    const before = structuredClone(latest), pictures = examples(host), help = host.querySelector(selectors.help).textContent;
    const toggle = host.querySelector(selectors.overlay); toggle.focus();
    for (const on of [true, false, true, false]) {
      await click(selectors.overlay); assertOverlay(host, on);
      expect(document.activeElement).toBe(toggle);
      expect(toggle.textContent).toBe('Show brood area guide');
      expect(host.querySelector('[data-inspection-record]').disabled).toBe(true);
      expect(host.querySelectorAll('[data-inspection-choice][aria-checked="true"]')).toHaveLength(0);
      expect(latest).toEqual(before); expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
      if (!on) {
        expect(examples(host)).toEqual(pictures);
        expect(host.querySelector(selectors.help).textContent).toBe(help);
      }
    }
  });

  it('retains the guide through native disclosure and current-brood navigation while preserving held readings and a draft', async () => {
    await mount({ inspectionDraft: { brood: 'spotty', cells: 'no', note: 'Keep my draft note' } });
    await click('[data-interior-hold]');
    const held = host.querySelector('[data-reference-card="held"]').textContent;
    await click(selectors.summary); await click(selectors.overlay);
    const before = structuredClone(latest), pictures = examples(host);
    await click(selectors.summary); expect(host.querySelector(selectors.disclosure).open).toBe(false);
    await click(selectors.summary); expect(host.querySelector(selectors.disclosure).open).toBe(true);
    assertOverlay(host, true);
    await click('[data-interior-topic="queen"]'); await click(selectors.inspect);
    expect(document.activeElement).toBe(host.querySelector('[data-interior-detail-title]') || host.querySelector('#beehive-interior-detail-title'));
    expect(host.querySelector('[data-interior-topic="brood"]').getAttribute('aria-pressed')).toBe('true');
    await click('[data-interior-inspection-return="true"]');
    expect(document.activeElement).toBe(host.querySelector('#beehive-guided-inspection-title'));
    expect(host.querySelector(selectors.disclosure).open).toBe(true); assertOverlay(host, true);
    expect(examples(host)).toEqual(pictures);
    expect(host.querySelector('[data-reference-card="held"]').textContent).toBe(held);
    expect(latest).toEqual(before); expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  });

  it('keeps the guide and fixed examples independent of changed colony readings and recorded feedback', async () => {
    await mount({ inspectionDraft: { brood: 'spotty', cells: 'yes' } });
    await click(selectors.summary); await click(selectors.overlay);
    const pictures = examples(host), feedback = host.querySelector('[data-inspection-feedback]').textContent;
    const next = { ...latest, beehive: { ...latest.beehive, queenHealth: 40, hive3dFrame: 5, capacity: 120 } };
    await act(async () => { replaceData(next); await Promise.resolve(); });
    assertOverlay(host, true); expect(host.querySelector(selectors.disclosure).open).toBe(true);
    expect(examples(host)).toEqual(pictures);
    expect(host.querySelector('[data-inspection-feedback]').textContent).toBe(feedback);
    expect(latest).toEqual(next); expect(latest.beehive.lastInspection).toEqual(savedRecord);
    expect(writes).not.toHaveBeenCalled(); expect(awardXP).not.toHaveBeenCalled();
  });

  it.each([{ queenHealth: 84, brood: 'spotty' }, { queenHealth: 85, brood: 'solid' }])
    ('preserves the stored answer and scoring at queen health $queenHealth with the guide on', async ({ queenHealth, brood }) => {
      await mount({ queenHealth, inspectionDraft: { brood, cells: 'no' } });
      await click(selectors.summary); await click(selectors.overlay);
      const pictures = examples(host), before = structuredClone(latest);
      await click('[data-inspection-record]');
      expect(latest).toEqual({ ...before, beehive: { ...before.beehive,
        lastInspection: { day: 40, framesRead: 2, queenFound: false, brood, cells: 'no', broodCorrect: true, cellsCorrect: true },
        inspectionDraft: {}, inspectionsDone: 5
      } });
      assertOverlay(host, true); expect(examples(host)).toEqual(pictures);
      expect(writes).toHaveBeenCalledTimes(1); expect(awardXP).toHaveBeenCalledTimes(1);
      expect(awardXP).toHaveBeenCalledWith('beehive', 14, 'Guided hive inspection');
    });

  it('keeps the active teaching guide and its overlay unavailable during winter', () => {
    const view = staticView({ day: 100 });
    expect(view.querySelector('[data-beehive-guided-inspection="winter"]').textContent).toContain('Keep the hive closed');
    expect(view.querySelector(selectors.disclosure)).toBeNull();
    expect(view.querySelector(selectors.overlay)).toBeNull();
    expect(view.querySelector(selectors.help)).toBeNull();
    expect(view.querySelector('[data-brood-guide-boundary], [data-brood-guide-gap]')).toBeNull();
  });
});
