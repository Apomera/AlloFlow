// Universe Explorer, third pass (2026-10-17): the five Big Question fact lists became
// tasks. Fermi, Mysteries and Multiverse ask the learner to sort each idea and lock the
// pick before showing how scientists see it; Nurseries and Catastrophes ask for a
// prediction before revealing a size-in-the-sky chart and an energy ladder.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
const SECOND = 1 / 3.15576e16;
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });
const matched = (html) => { const m = /Placed (\d+) of (\d+): (\d+) match/.exec(html); return m ? { placed: +m[1], total: +m[2], matched: +m[3] } : null; };

describe('Energy ladder and sizes in the sky (pure)', () => {
  it('derives every Sun comparison from the Sun’s output', () => {
    expect(pure.universeSunTime(6e20)).toBe('1.6 microseconds');
    expect(pure.universeSunTime(4e23)).toBe('1 millisecond');
    expect(pure.universeSunTime(2e39)).toBe('166 thousand years');
    expect(pure.universeSunTime(pure.UNIVERSE_SUN_WATTS * 3.15576e17)).toBe('10 billion years');
    expect(pure.universeSpanLabel(1.02e-6 * SECOND)).toBe('1 microsecond');
  });

  it('labels energies with one honest significant figure', () => {
    expect(pure.universeEnergyLabel(2e39)).toBe('2 × 10³⁹');
    expect(pure.universeEnergyLabel(1.8e15)).toBe('1.8 × 10¹⁵');
    expect(pure.universeEnergyLabel(1e44)).toBe('10⁴⁴');
    expect(pure.universeEnergyLabel(pure.UNIVERSE_SUN_WATTS)).toBe('3.8 × 10²⁶');
  });

  it('keeps the ladder physically consistent', () => {
    const ladder = pure.UNIVERSE_ENERGY_LADDER, by = (id) => ladder.find((x) => x.id === id), problems = [];
    ladder.forEach((x) => {
      if (!['impact', 'star', 'yardstick'].includes(x.kind)) problems.push('kind ' + x.id);
      if (!(x.joules > 1e15 * 0.9 && x.joules < 1e48)) problems.push('off the ladder ' + x.id);
      if (x.upTo !== undefined && !(x.upTo > x.joules)) problems.push('range ' + x.id);
    });
    expect(problems).toEqual([]);
    expect(new Set(ladder.map((x) => x.id)).size).toBe(ladder.length);
    // A GRB is about a supernova's energy, beamed: never "the most energetic" at the same number.
    expect(by('grb').joules).toBeLessThanOrEqual(by('supernova').joules * 2);
    expect(by('grb').upTo).toBeGreaterThanOrEqual(by('supernova').joules * 100);
    // The classic comparison: a supernova's light and blast ≈ the Sun's whole life.
    expect(by('sun-life').joules / by('supernova').joules).toBeGreaterThan(0.8);
    expect(by('sun-life').joules / by('supernova').joules).toBeLessThan(1.5);
    expect(by('magnetar').joules).toBeGreaterThan(by('chicxulub').upTo * 1000);
  });

  it('turns size and distance into an angle and a full-Moon comparison', () => {
    expect(pure.universeAngularSizeDeg(24, 1344)).toBeCloseTo(1.02, 2);
    expect(pure.universeAngularSizeDeg(300, 8500)).toBeCloseTo(2.02, 2);
    expect(pure.universeAngularSizeDeg(3.5, 1500)).toBeCloseTo(0.134, 3);
    expect(pure.universeMoonCompare(2.02)).toBe('about 4 full Moons');
    expect(pure.universeMoonCompare(0.57)).toBe('about one full Moon');
    expect(pure.universeMoonCompare(0.358)).toBe('a bit smaller than the full Moon');
    expect(pure.universeMoonCompare(0.134)).toBe('about a quarter of the full Moon');
  });

  it('tallies a sort, counting any accepted kind as a match', () => {
    const items = [{ a: ['x'] }, { a: ['y', 'z'] }, { a: ['x'] }, { a: ['y'] }];
    expect(pure.universeSortScore(items, { 0: 'x', 1: 'z', 2: 'y' }, 'a')).toEqual({ placed: 3, matched: 2, total: 4 });
    expect(pure.universeSortScore(items, {}, 'a')).toEqual({ placed: 0, matched: 0, total: 4 });
  });
});

describe('Predict-first questions carry no answer cues', () => {
  it('keeps the keyed option from being the uniquely longest', () => {
    const banks = [pure.UNIVERSE_NURSERY_PREDICTION, pure.UNIVERSE_ENERGY_PREDICTION].concat(pure.UNIVERSE_PREDICTIONS.filter(Boolean));
    let longestKeys = 0;
    banks.forEach((item) => {
      expect(item.options).toHaveLength(3);
      expect(new Set(item.options).size).toBe(3);
      const lengths = item.options.map((o) => o.length), max = Math.max(...lengths);
      if (lengths[item.answer] === max && lengths.filter((l) => l === max).length === 1) longestKeys++;
    });
    // Chance alone would make the key longest in about a third of 9 questions.
    expect(longestKeys).toBeLessThanOrEqual(1);
  });
});

describe('Sort tasks (rendered)', () => {
  it('Fermi: links the Drake estimate, hides the test until the learner commits', () => {
    const fresh = render({ showFermi: true });
    expect(fresh.includes('Your Drake Equation estimate: N ≈ 75. '), 'Drake link').toBe(true);
    expect(fresh.includes('the silence needs explaining')).toBe(true);
    expect(fresh.includes('What does it say about the silence?')).toBe(true);
    expect(fresh.includes('Our radio signals have travelled'), 'test hidden before sorting').toBe(false);
    const right = render({ showFermi: true, fermiSort: { 7: 'missed' } });
    expect(right.includes('That fits. ')).toBe(true);
    expect(right.includes('Our radio signals have travelled')).toBe(true);
    expect(matched(right)).toEqual({ placed: 1, total: 8, matched: 1 });
    const wrong = render({ showFermi: true, fermiSort: { 0: 'quiet' } });
    expect(wrong.includes('Most scientists would say “Hardly anyone is out there”.')).toBe(true);
    expect(matched(wrong)).toEqual({ placed: 1, total: 8, matched: 0 });
    const none = render({ showFermi: true, drakeFp: 0 });
    expect(none.includes('N ≈ 0. ')).toBe(true);
    expect(none.includes('the paradox mostly disappears')).toBe(true);
  });

  it('Mysteries: shows what scientists are doing only after a pick', () => {
    expect(render({ showMysteries: true }).includes('XENONnT')).toBe(false);
    const html = render({ showMysteries: true, mysterySort: { 1: 'now' } });
    expect(html.includes('XENONnT')).toBe(true);
    expect(html.includes('About 95% of the universe is something we cannot yet explain')).toBe(true);
  });

  it('Multiverse: keeps the evidence hidden until the learner decides', () => {
    expect(render({ showMultiverse: true }).includes('Evidence so far')).toBe(false);
    const html = render({ showMultiverse: true, multiverseSort: { 3: 'hard' } });
    expect(html.includes('Most scientists would say “Could be tested”.')).toBe(true);
    expect(html.includes('this model is ruled out')).toBe(true);
    expect(html.includes('Evidence so far')).toBe(true);
  });

  it('never makes one kind the answer to everything, or to nothing', () => {
    const sections = [
      ['showFermi', 'fermiSort', 8, ['rare', 'quiet', 'missed']],
      ['showMysteries', 'mysterySort', 8, ['now', 'new', 'never']],
      ['showMultiverse', 'multiverseSort', 5, ['test', 'hard']],
    ];
    const problems = [];
    sections.forEach(([flag, key, n, kinds]) => kinds.forEach((kind) => {
      const picks = {};
      for (let i = 0; i < n; i++) picks[i] = kind;
      const score = matched(render({ [flag]: true, [key]: picks }));
      if (!score || score.placed !== n) problems.push(key + ' ' + kind + ' did not place all');
      else if (score.matched < 2 || score.matched === n) problems.push(key + ' ' + kind + ' matches ' + score.matched + ' of ' + n);
    }));
    expect(problems).toEqual([]);
  });
});

describe('Predict, then compare (rendered)', () => {
  it('Nurseries: asks first, then explains with numbers from the chart', () => {
    const fresh = render({ showNurseries: true });
    expect(fresh.includes('Which looks bigger in our night sky?')).toBe(true);
    expect(fresh.includes('Size in our sky'), 'chart waits for a prediction').toBe(false);
    const html = render({ showNurseries: true, nurseryGuess: 1 });
    expect(html.includes('It is Orion. Orion looks about 3 times wider, even though the Tarantula is about 40 times bigger, because the Tarantula is about 120 times farther away.')).toBe(true);
    expect(html.includes('2.0°, about 4 full Moons')).toBe(true);
    expect(html.includes('0.13°, about a quarter of the full Moon')).toBe(true);
    const trueSize = render({ showNurseries: true, nurseryGuess: 'skip', nurseryView: 'true' });
    expect(trueSize.includes('Size in our sky')).toBe(true);
    expect(trueSize.includes('°, about')).toBe(false);
  });

  it('Catastrophes: predict, then a ladder measured against the Sun', () => {
    const fresh = render({ showCatastrophes: true });
    expect(fresh.includes('Which of these gives out the most energy in one go?')).toBe(true);
    expect(fresh.includes('Pick a row to compare it with the Sun'), 'ladder waits for a prediction').toBe(false);
    expect(fresh.includes('most energetic events since the Big Bang'), 'old GRB claim').toBe(false);
    expect(fresh.includes('10^44 joules in seconds')).toBe(false);
    const wrong = render({ showCatastrophes: true, energyGuess: 0 });
    expect(wrong.includes('It is the magnetar flare, by far.')).toBe(true);
    expect(wrong.includes('about 34 trillion times more energy')).toBe(true);
    expect(render({ showCatastrophes: true, energyGuess: 1, energyPick: 'world-year' }).includes('The Sun gives out this much energy in 1.6 microseconds.')).toBe(true);
    const asteroid = render({ showCatastrophes: true, energyGuess: 1, energyPick: 'chicxulub' });
    expect(asteroid.includes('about 4 × 10²³ joules, up to 5.8 × 10²⁵ joules.')).toBe(true);
    expect(asteroid.includes('in 1 millisecond.')).toBe(true);
  });
});

describe('Big Questions (live)', () => {
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
  const fermiGroup = () => [...host.querySelectorAll('#unisec-fermi .uni-sort-options')[0].querySelectorAll('button')];

  it('locks a sort pick, credits it once, and can start again', async () => {
    await mount({ showFermi: true });
    const [rare, quiet] = fermiGroup();
    expect(rare.textContent).toBe('Hardly anyone is out there');
    await click(rare);
    expect(state.fermiSort).toEqual({ 0: 'rare' });
    expect(state.uniEngaged.fermi).toBe(1);
    expect(fermiGroup().filter((b) => b.disabled)).toHaveLength(2);
    await click(quiet);
    expect(state.fermiSort).toEqual({ 0: 'rare' });
    expect(host.querySelector('#unisec-fermi .uni-sort-feedback').textContent).toContain('How could we test it?');
    const again = [...host.querySelectorAll('#unisec-fermi .uni-sort-score button')].find((b) => b.textContent === 'Start again');
    await click(again);
    expect(state.fermiSort).toEqual({});
    expect(fermiGroup().filter((b) => b.disabled)).toHaveLength(0);
  });

  it('reveals the energy ladder after a prediction and compares a pick with the Sun', async () => {
    await mount({ showCatastrophes: true });
    const magnetarGuess = [...host.querySelectorAll('#unisec-catastrophes .uni-mini-predict button')].find((b) => b.textContent === 'A magnetar flare');
    await click(magnetarGuess);
    expect(state.energyGuess).toBe(1);
    const row = [...host.querySelectorAll('#unisec-catastrophes .uni-energy-list button')].find((b) => b.textContent.startsWith('Magnetar giant flare'));
    await click(row);
    expect(state.energyPick).toBe('magnetar');
    expect(host.querySelector('#unisec-catastrophes .uni-energy-detail').textContent).toContain('The Sun gives out this much energy in 166 thousand years.');
    expect(state.uniEngaged.catastrophes).toBe(2);
  });
});
