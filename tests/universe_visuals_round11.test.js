// Universe Explorer, eleventh pass (2026-10-19): a habitable-zone lab driven by the
// Kopparapu et al. (2013) climate-model fit, a Drake equation chain and galaxy map, a
// low-gravity jump lab, and the light-journey ages shown as 13.8 (not 14) billion years.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const count = (html, text) => html.split(text).length - 1;
const star = (id) => pure.UNIVERSE_HZ_STARS.find((s) => s.id === id);

describe('Habitable zone model (pure)', () => {
  it('puts the Sun’s zone at about 0.95 to 1.68 AU', () => {
    const z = pure.universeHabitableZone(5772, 1);
    expect(z.inner).toBeCloseTo(0.951, 2);
    expect(z.outer).toBeCloseTo(1.677, 2);
  });

  it('sorts real planets the way published studies do', () => {
    const zones = (id) => star(id).planets.map((p) => pure.universeZoneOf(star(id), p[1]));
    expect(zones('sun')).toEqual(['hot', 'zone', 'zone']);
    expect(zones('trappist')).toEqual(['hot', 'hot', 'hot', 'zone', 'zone', 'zone', 'cold']);
    expect(zones('proxima')).toEqual(['hot', 'zone']);
    expect(pure.universeStarlight(star('trappist').lum, 0.0293)).toBeCloseTo(0.644, 2);
  });

  it('gets year lengths from Kepler’s third law', () => {
    expect(pure.universeYearDays(1, 1)).toBeCloseTo(365.25, 1);
    expect(pure.universeYearDays(0.0293, star('trappist').mass)).toBeCloseTo(6.1, 1);
    expect(pure.universeYearDays(0.0486, star('proxima').mass)).toBeCloseTo(11.2, 1);
  });

  it('asks a cue-free question', () => {
    const item = pure.UNIVERSE_HZ_PREDICTION, lengths = item.options.map((o) => o.length), max = Math.max(...lengths);
    expect(lengths[item.answer] === max && lengths.filter((l) => l === max).length === 1).toBe(false);
  });
});

describe('Jump, Drake and age helpers (pure)', () => {
  it('scales one push-off by gravity', () => {
    const moon = pure.universeJump(0.5, 0.166), earth = pure.universeJump(0.5, 1);
    expect(moon.height).toBeCloseTo(3.01, 2);
    expect(earth.air).toBeCloseTo(0.6386, 3);
    expect(moon.speed).toBeCloseTo(earth.speed, 9);
  });

  it('multiplies the Drake factors in order and spaces civilizations over the disc', () => {
    const chain = pure.universeDrakeChain([1.5, 0.5, 2, 0.5, 0.1, 0.1, 10000]);
    expect(chain.map((v) => +v.toPrecision(3))).toEqual([1.5, 0.75, 1.5, 0.75, 0.075, 0.0075, 75]);
    expect(pure.universeNeighbourLy(75)).toBeCloseTo(5117, -1);
    expect(pure.universeNeighbourLy(1)).toBe(null);
  });

  it('shows billions of years to one decimal', () => {
    expect(pure.universeGyrLabel(13.8)).toBe('13.8 billion years');
    expect(pure.universeGyrLabel(0.00038)).toBe('380 thousand years');
  });
});

describe('Habitable zone lab (rendered)', () => {
  it('asks first, then reads Earth’s orbit around the Sun', () => {
    expect(render({ showExoplanets: true }).includes('Your planet’s distance from the star')).toBe(false);
    const html = render({ showExoplanets: true, hzGuess: 0 });
    expect(html.includes('Your planet: 1.00 AU from the Sun. Starlight: about the same as Earth gets. A year there lasts 365 days. In the habitable zone')).toBe(true);
  });

  it('colours TRAPPIST-1’s planets by zone and warns when too close', () => {
    const html = render({ showExoplanets: true, hzGuess: 'skip', hzStar: 'trappist' });
    expect(count(html, 'data-zone="zone"')).toBe(4);
    expect(count(html, 'data-zone="hot"')).toBe(3);
    expect(count(html, 'data-zone="cold"')).toBe(1);
    const hot = render({ showExoplanets: true, hzGuess: 'skip', hzStar: 'proxima', hzPos: 0.2 });
    expect(hot.includes('Your planet: 0.020 AU from Proxima Centauri. Starlight: 3.9 times what Earth gets. A year there lasts 3 days. Too hot')).toBe(true);
  });
});

describe('Drake picture (rendered)', () => {
  const dots = (html) => count(/<g class="uni-drake-dots">(.*?)<\/g>/.exec(html)[1], '<circle');
  it('walks the chain and maps one dot per civilization', () => {
    const html = render({ showDrake: true });
    expect(html.includes('about 1 every 130 years')).toBe(true);
    expect(html.includes('about 5,100 light-years away')).toBe(true);
    expect(dots(html)).toBe(75);
  });

  it('draws no other dots when the estimate is below about one', () => {
    const html = render({ showDrake: true, drakeFi: 0.05, drakeFc: 0.05, drakeL: 300 });
    expect(html.includes('we may well be the only one')).toBe(true);
    expect(dots(html)).toBe(0);
  });
});

describe('Jump lab and light journey (rendered)', () => {
  it('opens with the gravity answer and shows each world’s jump', () => {
    expect(render({ showGravity: true }).includes('Lab: how high could you jump?')).toBe(false);
    const html = render({ showGravity: true, gravityRevealed: true });
    expect(html.includes('7.9 m · 10 s')).toBe(true);
    expect(html.includes('3 m · 3.8 s')).toBe(true);
  });

  it('says 13.8 billion years when the light arrives', () => {
    const html = render({ showObservable: true, journeyAt: 1 });
    expect(html.includes('The universe is 13.8 billion years old. This light has travelled for 13.8 billion years and has reached us')).toBe(true);
  });
});

describe('Jump lab (live)', () => {
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

  it('launches every figure for its real time in the air', async () => {
    await mount({ showGravity: true, gravityRevealed: true });
    expect(host.querySelectorAll('.uni-jump-go').length).toBe(0);
    await act(async () => host.querySelector('.uni-jump-button').click());
    const go = [...host.querySelectorAll('.uni-jump-go')];
    expect(go.length).toBe(5);
    expect(go.map((g) => g.style.animationDuration)).toEqual(['0.64s', '1.69s', '3.85s', '4.63s', '10.14s']);
    expect(parseFloat(go[4].style.getPropertyValue('--uni-jump-h'))).toBeGreaterThan(parseFloat(go[0].style.getPropertyValue('--uni-jump-h')) * 15);
    expect(state.jumpRun).toBe(1);
  });
});
