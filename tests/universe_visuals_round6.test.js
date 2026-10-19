// Universe Explorer, sixth pass (2026-10-18): visuals. The HR diagram is now an SVG
// built from a realistic star population; lensing is a ray-traced lab; the spectrum
// section shows which light gets through Earth's air; planetary nebulae have drawings;
// always-dark cards get dark-theme ink; and the Powers of Ten canvas no longer wipes
// itself when its size has not changed.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const count = (html, text) => html.split(text).length - 1;

describe('Visual models (pure)', () => {
  it('builds an HR population that lies on the real branches', () => {
    const stars = pure.UNIVERSE_HR_STARS, problems = [];
    expect(stars.length).toBeGreaterThan(220);
    ['ms', 'giant', 'super', 'wd'].forEach((k) => { if (!stars.some((s) => s.kind === k)) problems.push('no ' + k); });
    stars.forEach((s, i) => {
      if (!(s.T >= 2500 && s.T <= 40000 && s.L >= 1e-4 && s.L <= 1e6)) problems.push('off the axes ' + i);
      if (s.kind === 'wd' && !(s.L < 0.2 && s.T > 5000)) problems.push('white dwarf misplaced ' + i);
      if (s.kind === 'giant' && !(s.L > 5 && s.T < 5200)) problems.push('giant misplaced ' + i);
    });
    const ms = stars.filter((s) => s.kind === 'ms').sort((a, b) => a.T - b.T), third = Math.floor(ms.length / 3);
    const meanLog = (list) => list.reduce((sum, s) => sum + Math.log10(s.L), 0) / list.length;
    expect(meanLog(ms.slice(-third)) - meanLog(ms.slice(0, third)), 'hotter main-sequence stars are far brighter').toBeGreaterThan(2.5);
    expect(problems).toEqual([]);
    const sun = pure.universeHRPoint(5772, 1);
    expect(sun.y).toBeCloseTo(0.6, 5);
    expect(sun.x).toBeCloseTo(0.698, 2);
    expect(pure.universeStarColor(30000)).toBe('#9bb0ff');
    expect(pure.universeStarColor(3000)).toBe('#ff8448');
  });

  it('places a point lens’s two images and its magnification exactly', () => {
    const one = pure.universeLensImages(1);
    expect(one.outer).toBeCloseTo(1.618, 3);
    expect(one.inner).toBeCloseTo(-0.618, 3);
    expect(pure.universeLensMagnification(1)).toBeCloseTo(1.342, 3);
    expect(pure.universeLensMagnification(3)).toBeCloseTo(1.017, 3);
    expect(pure.universeLensMagnification(0.01)).toBeGreaterThan(50);
  });

  it('opens the atmospheric windows in the right places', () => {
    expect(pure.universeAirOpacity(Math.log10(5.5e-7)), 'visible').toBeLessThan(0.1);
    expect(pure.universeAirOpacity(0), 'one-metre radio').toBeLessThan(0.15);
    expect(pure.universeAirOpacity(-4), 'far infrared').toBeGreaterThan(0.85);
    expect(pure.universeAirOpacity(-9), 'X-rays').toBe(1);
    expect(pure.universeAirOpacity(Math.log10(30)), 'long radio, ionosphere').toBe(1);
  });
});

describe('Visuals (rendered)', () => {
  it('draws the HR diagram as labelled SVG and lights only the picked region', () => {
    const plain = render({ showHR: true });
    ['Proxima Centauri', 'Betelgeuse', 'Sirius B', 'Surface temperature (hotter to the left)', 'Luminosity (Sun = 1)', '10,000 K'].forEach((t) => expect(plain.includes(t), t).toBe(true));
    expect(plain.includes('class="uni-hr-svg"')).toBe(true);
    expect(count(plain, 'data-lit="true"')).toBe(0);
    const whiteDwarfs = pure.UNIVERSE_HR_STARS.filter((s) => s.kind === 'wd').length;
    expect(count(render({ showHR: true, hrPick: 3 }), 'data-lit="true"')).toBe(whiteDwarfs);
    const giants = pure.UNIVERSE_HR_STARS.filter((s) => s.kind === 'giant').length;
    expect(count(render({ showHR: true, hrPick: 1 }), 'data-lit="true"')).toBe(giants);
  });

  it('reports the lens geometry from the lens equation', () => {
    const html = render({ showLensing: true });
    expect(html.includes('0.7 Einstein radii off the line')).toBe(true);
    expect(html.includes('Two images: a brighter one 1.4 Einstein radii out on the same side as the real galaxy, and a fainter one 0.7 on the opposite side. A small source here would look about 1.7 times brighter than with no lens.')).toBe(true);
    expect(render({ showLensing: true, lensOffset: 0 }).includes('spreads into an Einstein ring')).toBe(true);
  });

  it('shows which light reaches the ground, and draws each nebula', () => {
    const spectrum = render({ showSpectrum: true });
    expect(spectrum.includes('Which light reaches the ground')).toBe(true);
    expect(spectrum.includes('Chandra and Fermi')).toBe(true);
    expect(render({ showPNebulae: true, pnPick: 3 }).includes('Drawing of the Butterfly Nebula')).toBe(true);
    expect(render({ showPNebulae: true, pnPick: 0 }).includes('Drawing of the Ring Nebula')).toBe(true);
  });

  it('gives always-dark cards dark-theme ink, so their controls stay readable', () => {
    const html = render({ showLensing: true });
    expect(html.includes('.uni-card[data-uni-dark]{--uni-ink:#eef2ff;')).toBe(true);
    expect(html.includes('.uni-card[data-uni-dark] .text-slate-600')).toBe(true);
  });
});

describe('Powers of Ten canvas (live)', () => {
  const { act } = React;
  let host, root, config, observers, restore;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    observers = [];
    vi.stubGlobal('ResizeObserver', class { constructor(cb) { observers.push(cb); } observe() {} disconnect() {} });
    Element.prototype.scrollIntoView = vi.fn();
    const proto = HTMLCanvasElement.prototype, widthDesc = Object.getOwnPropertyDescriptor(proto, 'width');
    const wDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth'), hDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    const getContext = proto.getContext;
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => ctx), set: (t, k, v) => { t[k] = v; return true; } });
    window.__widthSets = 0;
    Object.defineProperty(proto, 'width', { configurable: true, get: widthDesc.get, set(v) { window.__widthSets++; widthDesc.set.call(this, v); } });
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return 600; } });
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return 300; } });
    proto.getContext = () => ctx;
    restore = () => {
      Object.defineProperty(proto, 'width', widthDesc);
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', wDesc);
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', hDesc);
      proto.getContext = getContext;
    };
    resetStemLab();
    config = loadTool(TOOL, 'universe');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    if (window._universeTimeLapse) clearInterval(window._universeTimeLapse);
    window._universeTimeLapse = null;
    await act(async () => root.unmount());
    restore();
    host.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });

  it('never re-sets an unchanged canvas size, which would wipe a still picture', async () => {
    function Harness() {
      const [toolData, setToolData] = React.useState({ universe: { tutorialDismissed: true, sceneMotion: 'still', showScale: true } });
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => root.render(React.createElement(Harness)));
    expect(host.querySelector('#unisec-powers-of-ten canvas'), 'zoom canvas mounted').not.toBe(null);
    const sized = window.__widthSets;
    expect(sized, 'canvases were sized once').toBeGreaterThan(0);
    await act(async () => { observers.forEach((cb) => cb([])); });
    expect(window.__widthSets).toBe(sized);
  });
});
