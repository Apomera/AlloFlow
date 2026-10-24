// Universe Explorer, fourth pass (2026-10-18): five reading lists gained labs. Dark matter
// (fit a rotation curve), the distance ladder (parallax + standard candles), telescopes
// (mirror size, air blur, a double star), black holes (squeeze it into a horizon) and
// element origins (sort a body's elements by where they were made).
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });

describe('Lab models (pure)', () => {
  it('turns a parallax into a distance', () => {
    const proxima = pure.universeParallax(768.07);
    expect(proxima.pc).toBeCloseTo(1.302, 3);
    expect(proxima.ly).toBeCloseTo(4.246, 2);
    expect(proxima.coinKm).toBeCloseTo(6.44, 1);
    expect(pure.universeParallax(7.54).ly).toBeCloseTo(432.6, 0);
  });

  it('gives a mirror its light grasp, its diffraction limit and the air’s blur', () => {
    const hubble = pure.universeTelescope(2.4, false);
    expect(hubble.gather).toBeCloseTo(117551, -2);
    expect(hubble.arcsec).toBeCloseTo(0.0577, 3);
    expect(hubble.coinKm).toBeCloseTo(85.8, 0);
    expect(hubble.splits).toBe(true);
    const grounded = pure.universeTelescope(2.4, true);
    expect(grounded.arcsec).toBe(0.8);
    expect(grounded.blurredByAir).toBe(true);
    expect(grounded.splits).toBe(false);
    const eye = pure.universeTelescope(0.007, true);
    expect(eye.arcsec).toBeCloseTo(19.8, 1);
    expect(eye.blurredByAir).toBe(false);
  });

  it('sizes event horizons at 2,953 m per solar mass, and big ones are thin', () => {
    expect(pure.universeHorizon(1).metres).toBeCloseTo(2953, 0);
    expect(pure.universeHorizon(3.003e-6).metres * 1000).toBeCloseTo(8.87, 1);
    const sgr = pure.universeHorizon(4.3e6).density;
    expect(sgr).toBeGreaterThan(9e5);
    expect(sgr).toBeLessThan(1.1e6);
    expect(pure.universeHorizon(6.5e9).density).toBeLessThan(1.2);
    expect(pure.universeDensityLabel(0.5)).toBe('less dense than air');
    expect(pure.universeDensityLabel(997000)).toBe('about 1,000 times the density of water');
  });

  it('labels lengths in the unit a learner would use', () => {
    expect(pure.universeLengthLabel(0.00887)).toBe('8.9 mm');
    expect(pure.universeLengthLabel(0.0177)).toBe('1.8 cm');
    expect(pure.universeLengthLabel(2.4)).toBe('2.4 m');
    expect(pure.universeLengthLabel(2953)).toBe('3 km');
    expect(pure.universeLengthLabel(1.27e10)).toBe('13 million km');
    expect(pure.universeLengthLabel(1.92e13)).toBe('128 AU');
  });

  it('needs a dark halo: visible matter alone falls off, the measurements stay flat', () => {
    const inner = pure.universeRotation(4, 0).visible, outer = pure.universeRotation(28, 0).visible;
    expect(outer).toBeLessThan(inner * 0.6);
    const flat = [6, 10, 16, 24, 28].map((r) => pure.universeRotation(r, 190).total);
    expect(Math.max(...flat) / Math.min(...flat)).toBeLessThan(1.1);
    expect(pure.universeRotationFit(190)).toBeLessThan(5);
    expect(pure.universeRotationFit(0)).toBeGreaterThan(50);
    expect(pure.universeRotationFit(120)).toBeGreaterThan(8);
    const ratio = pure.universeDarkRatio(28, 190);
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3.5);
  });

  it('tallies a body by the origin of its atoms', () => {
    const origin = pure.universeBodyByOrigin();
    expect(origin.massive).toBeCloseTo(76.5, 0);
    expect(origin.lowmass).toBeCloseTo(12, 5);
    expect(origin.bigbang).toBeCloseTo(10, 5);
    const sources = new Set(pure.UNIVERSE_ELEMENT_SOURCES.map((s) => s.id)), problems = [];
    pure.UNIVERSE_BODY_ELEMENTS.forEach((el) => el.from.forEach((src) => { if (!sources.has(src)) problems.push(el.symbol + ' ' + src); }));
    expect(problems).toEqual([]);
  });

  it('keeps every predict-first key from being the uniquely longest option', () => {
    const banks = [pure.UNIVERSE_ROTATION_PREDICTION, pure.UNIVERSE_CANDLE_PREDICTION, pure.UNIVERSE_TELESCOPE_PREDICTION, pure.UNIVERSE_HORIZON_PREDICTION,
      pure.UNIVERSE_NURSERY_PREDICTION, pure.UNIVERSE_ENERGY_PREDICTION].concat(pure.UNIVERSE_PREDICTIONS.filter(Boolean));
    let longestKeys = 0;
    banks.forEach((item) => {
      expect(item.options).toHaveLength(3);
      const lengths = item.options.map((o) => o.length), max = Math.max(...lengths);
      if (lengths[item.answer] === max && lengths.filter((l) => l === max).length === 1) longestKeys++;
    });
    expect(longestKeys).toBeLessThanOrEqual(1);
  });
});

describe('Labs (rendered)', () => {
  it('Dark matter: predict, then fit the curve', () => {
    const fresh = render({ showDark: true });
    expect(fresh.includes('how fast do its stars orbit?')).toBe(true);
    expect(fresh.includes('Add a dark matter halo'), 'lab waits for a prediction').toBe(false);
    const none = render({ showDark: true, rotationGuess: 0 });
    expect(none.includes('They orbit at about the same speed.')).toBe(true);
    expect(none.includes('Visible matter alone predicts the dashed curve')).toBe(true);
    expect(render({ showDark: true, rotationGuess: 1, rotationHalo: 100 }).includes('Still off by about')).toBe(true);
    const fitted = render({ showDark: true, rotationGuess: 1, rotationHalo: 190 });
    expect(fitted.includes('Your model fits the measurements. Inside about 91,000 light-years it needs about 3 times as much unseen mass as visible mass')).toBe(true);
  });

  it('Distance ladder: parallax worked out, then a standard candle', () => {
    const fresh = render({ showDistance: true });
    expect(fresh.includes('Distance = 1 ÷ 0.768 = 1.3 parsecs, or 4.2 light-years.')).toBe(true);
    expect(fresh.includes('a coin seen from 6.4 km away')).toBe(true);
    expect(fresh.includes('times as far, so'), 'candle waits for a prediction').toBe(false);
    expect(render({ showDistance: true, parallaxStar: 'polaris' }).includes('Distance = 1 ÷ 0.0075 = 133 parsecs, or 433 light-years.')).toBe(true);
    expect(render({ showDistance: true, candleGuess: 0 }).includes('It is twice as far.')).toBe(true);
    expect(render({ showDistance: true, candleGuess: 1, candleDist: 3 }).includes('3 times as far, so 1/9 as bright.')).toBe(true);
  });

  it('Element origins: sort, then see the body by origin', () => {
    const fresh = render({ showElements: true });
    expect(fresh.includes('Where was it made?')).toBe(true);
    expect(fresh.includes('You, by where your atoms were made'), 'tally waits for the sort').toBe(false);
    expect(render({ showElements: true, elementSort: { 0: 'massive' } }).includes('Yes. </strong>Made by fusion inside massive stars')).toBe(true);
    expect(render({ showElements: true, elementSort: { 2: 'massive' } }).includes('Most scientists would say “The Big Bang”.')).toBe(true);
    const all = {};
    pure.UNIVERSE_BODY_ELEMENTS.forEach((el, i) => { all[i] = el.from[0]; });
    const done = render({ showElements: true, elementSort: all });
    ['about 77%', 'about 12%', 'about 10%', 'The last 1.5%'].forEach((text) => expect(done.includes(text), text).toBe(true));
  });

  it('Telescopes: light grasp, detail, and the air', () => {
    expect(render({ showTelescopes: true }).includes('Mirror width'), 'lab waits for a prediction').toBe(false);
    const space = render({ showTelescopes: true, telescopeGuess: 1 });
    expect(space.includes('It is about 340 times wider.')).toBe(true);
    expect(space.includes('Collects about 120,000 times as much light as your eye')).toBe(true);
    expect(space.includes('a coin 86 km away')).toBe(true);
    expect(space.includes('Split! ')).toBe(true);
    const ground = render({ showTelescopes: true, telescopeGuess: 0, telescopeGround: true });
    expect(ground.includes('moving air blurs detail')).toBe(true);
    expect(ground.includes('Blurred into one. ')).toBe(true);
    const eye = render({ showTelescopes: true, telescopeGuess: 0, telescopeLogD: Math.log10(0.007) });
    expect(eye.includes('Collects the same light as your eye.')).toBe(true);
    expect(eye.includes('Finest detail: 20 arcseconds, enough to make out a coin 250 m away.')).toBe(true);
    expect(eye.includes('in practice you see detail of about 60 arcseconds'), 'the eye’s real limit').toBe(true);
    expect(space.includes('in practice you see detail'), 'eye note only for an eye-sized mirror').toBe(false);
  });

  it('Black holes: the orbit question, then horizons from a marble to the planets', () => {
    expect(render({ showBlackHole: true, horizonGuess: 0 }).includes('Surprisingly, Earth keeps the same orbit.')).toBe(true);
    const sun = render({ showBlackHole: true, horizonGuess: 1 });
    expect(sun.includes('3 km in radius, 5.9 km across, about the size of a small town.')).toBe(true);
    expect(sun.includes('about 18 quadrillion times the density of water')).toBe(true);
    expect(render({ showBlackHole: true, horizonGuess: 1, horizonLogM: Math.log10(3.003e-6) }).includes('8.9 mm in radius, 1.8 cm across, about the size of a marble.')).toBe(true);
    const m87 = render({ showBlackHole: true, horizonGuess: 1, horizonLogM: Math.log10(6.5e9) });
    expect(m87.includes('128 AU in radius, 257 AU across, wider than the orbits of all the planets.')).toBe(true);
    expect(m87.includes('less dense than air')).toBe(true);
  });
});

describe('Labs (live)', () => {
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

  it('squeezes Sagittarius A* and credits the study', async () => {
    await mount({ showBlackHole: true });
    await click(button('#unisec-black-holes .uni-mini-predict', 'It keeps the same orbit'));
    expect(state.horizonGuess).toBe(1);
    await click(button('#unisec-black-holes .uni-lab-choices', 'Sagittarius A*'));
    expect(state.horizonLogM).toBeCloseTo(Math.log10(4.3e6), 6);
    const facts = host.querySelector('#unisec-black-holes .uni-lab-facts').textContent;
    expect(facts).toContain('13 million km in radius');
    expect(facts).toContain('about 1,000 times the density of water');
    expect(state.uniEngaged['black-holes']).toBe(2);
  });

  it('moves a telescope to the ground and shows the air’s blur', async () => {
    await mount({ showTelescopes: true, telescopeGuess: 0 });
    expect(host.querySelector('#unisec-telescopes .uni-lab-facts').textContent).not.toContain('moving air');
    await click(button('#unisec-telescopes .uni-lab-choices', 'On the ground'));
    expect(state.telescopeGround).toBe(true);
    expect(host.querySelector('#unisec-telescopes .uni-lab-facts').textContent).toContain('moving air blurs detail');
    await click(button('#unisec-telescopes .uni-lab-choices', 'Webb (JWST)'));
    expect(state.telescopeGround).toBe(false);
    expect(host.querySelector('#unisec-telescopes .uni-lab-facts').textContent).toContain('infrared');
  });
});
