// Universe Explorer, seventh pass (2026-10-18): the light's-journey lab (proper distances
// of light and its source from the same ΛCDM model as the timeline), a "you are here"
// zoom-out, an SVG composition donut, and drawn famous images in a rebuilt, properly
// nested list.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const count = (html, text) => html.split(text).length - 1;

describe('Light’s journey (pure)', () => {
  it('matches published comoving distances', () => {
    expect(pure.universeComovingGly(1)).toBe(0);
    expect(pure.universeComovingGly(0.5)).toBeCloseTo(11.07, 1);
    const cmb = pure.universeComovingGly(1 / 1078);
    expect(cmb).toBeGreaterThan(44.5);
    expect(cmb).toBeLessThan(46);
  });

  it('carries early light away from us before it turns toward us', () => {
    const j = pure.universeLightJourney(1077, 160);
    expect(j.te).toBeGreaterThan(0.00035);
    expect(j.te).toBeLessThan(0.0004);
    expect(j.startDistance * 1000).toBeGreaterThan(40);
    expect(j.startDistance * 1000).toBeLessThan(44);
    expect(j.peak.d).toBeGreaterThan(5.5);
    expect(j.peak.d).toBeLessThan(6.2);
    expect(j.peak.t).toBeGreaterThan(3.5);
    expect(j.peak.t).toBeLessThan(4.6);
    expect(j.points[0].source, 'light and source start together').toBeCloseTo(j.startDistance, 3);
    expect(j.points[0].photon).toBeCloseTo(j.startDistance, 3);
    const last = j.points[j.points.length - 1];
    expect(last.photon).toBe(0);
    expect(last.source).toBeCloseTo(j.chi, 6);
  });

  it('brings nearby light straight in, without a turn', () => {
    const j = pure.universeLightJourney(0.1, 80);
    expect(j.peak.d).toBeCloseTo(j.startDistance, 9);
    const bad = j.points.filter((p, i) => i > 0 && p.photon > j.points[i - 1].photon + 1e-9);
    expect(bad).toEqual([]);
  });

  it('keeps the zoom levels nested and the budgets whole', () => {
    const levels = pure.UNIVERSE_ZOOM_LEVELS;
    levels.forEach((l, i) => { if (i) expect(l.metres / levels[i - 1].metres, l.id).toBeGreaterThan(10); });
    expect(pure.UNIVERSE_COMPOSITION.reduce((s, p) => s + p[1], 0)).toBe(100);
    expect(pure.UNIVERSE_ORDINARY_SPLIT.reduce((s, p) => s + p[1], 0)).toBe(100);
  });
});

describe('Round 7 visuals (rendered)', () => {
  it('Observable universe: the light set off 42 million light-years away; its source is now 45 billion', () => {
    const html = render({ showObservable: true });
    expect(html.includes('It set off when the universe was 380 thousand years old, from a place 42 million light-years away. That place is now 45 billion light-years away.')).toBe(true);
    expect(html.includes('At first the light was carried away from us, up to 5.8 billion light-years')).toBe(true);
    expect(render({ showObservable: true, journeySource: 'z01' }).includes('At first the light was carried away')).toBe(false);
    expect(render({ showObservable: true, journeyAt: 0.25 }).includes('expanding space is carrying the light away from us')).toBe(true);
    expect(render({ showObservable: true, journeyAt: 0.9 }).includes('expanding space is carrying the light away from us')).toBe(false);
  });

  it('Structure: zooms out step by step with the size jump worked out', () => {
    const earth = render({ showStructures: true });
    expect(earth.includes('Earth: </strong>12,742 km across.')).toBe(true);
    expect(earth.includes('disabled="">← Zoom in')).toBe(true);
    const mw = render({ showStructures: true, zoomLevel: 3 });
    expect(mw.includes('About 5,000 times wider than our stellar neighbourhood.')).toBe(true);
    expect(mw.includes('The Milky Way seen from above')).toBe(true);
    expect(render({ showStructures: true, zoomLevel: 6 }).includes('disabled="">Zoom out →')).toBe(true);
  });

  it('Dark universe: a donut that zooms into the ordinary 5%', () => {
    const html = render({ showDark: true });
    expect(html.includes('every star in the universe adds up to roughly 0.4% of everything')).toBe(true);
    expect(html.includes('Inside the 5%')).toBe(true);
  });

  it('Famous images: a real button opens a panel with a labelled illustration', () => {
    const closed = render({ showImages: true });
    expect(count(closed, 'class="uni-image-head"')).toBe(8);
    expect(closed.includes('aria-expanded="false"')).toBe(true);
    const open = render({ showImages: true, imageIdx: 4 });
    expect(open.includes('aria-controls="uni-image-panel-4"')).toBe(true);
    expect(open.includes('Illustration of the first black hole image')).toBe(true);
    expect(open.includes('An illustration, not the real photograph.')).toBe(true);
  });
});

describe('Round 7 visuals (live)', () => {
  const { act } = React;
  let host, root, config, state;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Element.prototype.scrollIntoView = vi.fn();
    resetStemLab();
    config = loadTool(TOOL, 'universe');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    if (window._universeTimeLapse) clearInterval(window._universeTimeLapse);
    window._universeTimeLapse = null;
    await act(async () => root.unmount());
    host.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  async function mount(initial) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ universe: Object.assign({ tutorialDismissed: true }, initial) });
      state = toolData.universe;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const click = async (el) => act(async () => el.click());
  const button = (scope, text) => [...host.querySelectorAll(scope + ' button')].find((b) => b.textContent === text);

  it('zooms out, jumps, and credits the exploring', async () => {
    await mount({ showStructures: true });
    await click(button('#unisec-structures .uni-guess-row', 'Zoom out →'));
    await click(button('#unisec-structures .uni-guess-row', 'Zoom out →'));
    expect(state.zoomLevel).toBe(2);
    await click(button('#unisec-structures .uni-lab-choices', 'Milky Way'));
    expect(state.zoomLevel).toBe(3);
    expect(host.querySelector('#unisec-structures .uni-lab-readout').textContent).toContain('The Milky Way:');
    expect(state.uniEngaged.structures).toBe(3);
  });

  it('opens a famous image without nesting its Listen button inside the opener', async () => {
    await mount({ showImages: true });
    const head = host.querySelectorAll('#unisec-images .uni-image-head')[0];
    await click(head);
    expect(state.imageIdx).toBe(0);
    expect(head.getAttribute('aria-expanded')).toBe('true');
    const listen = [...host.querySelectorAll('#unisec-images .uni-image-panel button')].find((b) => b.textContent.includes('Listen'));
    expect(listen).toBeTruthy();
    expect(listen.closest('.uni-image-head')).toBe(null);
    expect(host.querySelector('#unisec-images [role="button"]')).toBe(null);
  });
});
