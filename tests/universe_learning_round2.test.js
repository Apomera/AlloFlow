// Universe Explorer, second pass (2026-10-17): the expansion readouts, predict-then-
// watch at chapter stops, the put-it-in-order challenge, and the library upgrades
// (gravity mass vs weight, What-If predictions, star paths, Drake, Hubble fate).
// Behaviour is pinned through window.__universePure, SSR markup and a live mount.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
const SECOND = 1 / 3.15576e16;
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });

describe('Expansion model behind the readouts', () => {
  it('matches the standard numbers at recombination, one second, and today', () => {
    const recombination = pure.universeConditions(0.00038), second = pure.universeConditions(SECOND), today = pure.universeConditions(13.8);
    expect(recombination.temperature).toBeGreaterThan(2800);
    expect(recombination.temperature).toBeLessThan(3100);
    expect(recombination.redshift).toBeGreaterThan(1000);
    expect(recombination.redshift).toBeLessThan(1150);
    expect(second.temperature).toBeGreaterThan(5e9);
    expect(second.temperature).toBeLessThan(2e10);
    expect(today.temperature).toBeCloseTo(2.7255, 3);
    expect(today.smaller).toBeCloseTo(1, 3);
  });

  it('places the farthest JWST galaxies and the end of reionization at their known redshifts', () => {
    expect(pure.universeConditions(0.29).redshift).toBeGreaterThan(13);
    expect(pure.universeConditions(0.29).redshift).toBeLessThan(15.5);
    expect(pure.universeConditions(1).redshift).toBeGreaterThan(5);
    expect(pure.universeConditions(1).redshift).toBeLessThan(6.5);
  });

  it('says what it cannot know, and keeps the future separate', () => {
    expect(pure.universeConditions(0).unknown).toBe(true);
    expect(pure.universeConditions(1e-40 * SECOND).unknown).toBe(true);
    expect(pure.universeConditions(13.81).future).toBe(true);
    expect(pure.universeConditionLabels(0.0001).redshift).toContain('trapped');
    expect(pure.universeConditionLabels(1e-20 * SECOND).note).toContain('extrapolation');
  });

  it('turns a distance into a redshift and look-back time that grow faster than z = v/c allows', () => {
    const c = 299792;
    expect(pure.universeRedshiftAtHubbleDistance(100 * 70 / c)).toBeCloseTo(100 * 70 / c, 2);
    const far = pure.universeRedshiftAtHubbleDistance(4000 * 70 / c);
    expect(far).toBeGreaterThan(1.2);
    expect(far).toBeLessThan(1.45);
    const lookBack = 13.8 - pure.universeAgeAtScale(1 / (1 + far));
    expect(lookBack).toBeGreaterThan(8.3);
    expect(lookBack).toBeLessThan(9.5);
  });
});

describe('Predict, then watch', () => {
  it('asks one well-formed question at each chapter stop that has a next chapter', () => {
    const items = pure.UNIVERSE_PREDICTIONS, problems = [];
    for (let chapter = 1; chapter <= 7; chapter++) {
      const item = items[chapter];
      if (!item) { problems.push('missing ' + chapter); continue; }
      if (item.options.length !== 3 || !(item.answer >= 0 && item.answer < 3) || !item.explain) problems.push('malformed ' + chapter);
      const lengths = item.options.map((o) => o.length);
      if (Math.max(...lengths) / Math.min(...lengths) > 2.1) problems.push('length cue ' + chapter);
      if (new Set(item.options).size !== 3) problems.push('duplicate option ' + chapter);
    }
    expect(problems).toEqual([]);
  });

  it('spreads the keyed answer across display positions', () => {
    const slots = [0, 0, 0];
    for (let chapter = 1; chapter <= 7; chapter++) slots[pure.universePredictionOrder(chapter).indexOf(pure.UNIVERSE_PREDICTIONS[chapter].answer)]++;
    expect(Math.min(...slots)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...slots)).toBeLessThanOrEqual(4);
  });
});

describe('Time detective', () => {
  it('deals five different events, never already in order, the same way for the same seed', () => {
    const problems = [];
    for (let seed = 1; seed <= 300; seed++) {
      const round = pure.universeOrderRound(seed);
      const ages = round.map((id) => pure.UNIVERSE_ORDER_EVENTS.find((e) => e.id === id).age);
      if (round.length !== 5 || new Set(round).size !== 5) problems.push('bad round ' + seed);
      if (ages.every((age, i) => i === 0 || age >= ages[i - 1])) problems.push('already sorted ' + seed);
      if (JSON.stringify(pure.universeOrderRound(seed)) !== JSON.stringify(round)) problems.push('not deterministic ' + seed);
    }
    expect(problems).toEqual([]);
  });
});

describe('Library upgrades (rendered)', () => {
  it('keeps mass fixed, reports weight in newtons, and asks for a prediction first', () => {
    const before = render({ showGravity: true });
    expect(before.includes('Your mass (kg)'), 'asks for mass').toBe(true);
    expect(before.includes('Predict first'), 'prediction first').toBe(true);
    expect(before.includes('Scale reads'), 'results hidden before predicting').toBe(false);
    const after = render({ showGravity: true, gravityGuess: 'Mars', earthWeight: 70 });
    expect(after.includes('The closest is Saturn'), 'feedback names Saturn').toBe(true);
    expect(after.includes('Scale reads 0 kg'), 'the ISS scale reads zero').toBe(true);
    expect(after.includes('Weight 687 N'), 'Earth weight in newtons').toBe(true);
  });

  it('hides each What-If answer until the learner asks for it', () => {
    // The same phrase in both checks, so the hidden case cannot pass by spelling.
    const answer = 'several generations of stars would already have lived and died';
    expect(render({ showWhatIf: true }).includes(answer)).toBe(false);
    const shown = render({ showWhatIf: true, whatIfShown: [4], whatIfNotes: { 4: 'No metals yet' } });
    expect(shown.includes(answer)).toBe(true);
    expect(shown.includes('No metals yet')).toBe(true);
  });

  it('lets a Drake factor of 0 mean 0', () => {
    // Defaults: 1.5 × 0.5 × 2 × 0.5 × 0.1 × 0.1 × 10,000 = 75.
    expect(render({ showDrake: true }).includes('N ≈ 75<')).toBe(true);
    expect(render({ showDrake: true, drakeFp: 0 }).includes('N ≈ 0')).toBe(true);
  });

  it('never labels a universe that cannot recollapse as collapsing', () => {
    const html = render({ showHubbleInquiry: true, hubbleInquiry: { distMpc: 100, hubbleConst: 70, darkEnergy: 25, matter: 75, log: [] } });
    expect(html.includes('collapsing')).toBe(false);
    expect(html.includes('slowing, still expands forever')).toBe(true);
    expect(render({ showHubbleInquiry: true }).includes('speeding up, expands forever')).toBe(true);
  });

  it('draws the path a star of a given mass actually takes', () => {
    expect(render({ showStarLife: true, starMassLog: Math.log10(0.2) }).includes('never swells into a giant')).toBe(true);
    expect(render({ showStarLife: true, starMassLog: Math.log10(15) }).includes('leaving a neutron star')).toBe(true);
    expect(render({ showStarLife: true, starMassLog: Math.log10(40) }).includes('collapses into a black hole')).toBe(true);
  });

  it('shows real bold text rather than markdown asterisks', () => {
    const html = render({ showDark: true, showObservable: true, showRedshift: true });
    expect(html.includes('**'), 'literal asterisks').toBe(false);
    expect(html.includes('<strong>Dark Energy</strong>'), 'bold heading').toBe(true);
  });
});

describe('Chapter-stop prediction (live)', () => {
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
  const tick = async (ms) => act(async () => vi.advanceTimersByTime(ms));

  it('stops at a chapter, asks what comes next, locks the answer, then plays on', async () => {
    await mount({ pauseAtChapters: true, speed: 5 });
    await click(host.querySelector('[aria-label="Play cosmic timeline playback"]'));
    for (let i = 0; i < 20 && window._universeTimeLapse; i++) await tick(1000);
    expect(state.chapterHold).toBe(1);
    const options = [...host.querySelectorAll('.uni-predict-options button')];
    expect(options).toHaveLength(3);
    await click(options[0]);
    expect(Object.keys(state.predictions)).toEqual(['recombination']);
    expect([...host.querySelectorAll('.uni-predict-options button')].filter((b) => b.disabled)).toHaveLength(2);
    expect(host.querySelector('.uni-predict-feedback').textContent.length).toBeGreaterThan(40);
    await click(host.querySelector('.uni-predict-continue'));
    expect(state.isPlaying).toBe(true);
    expect(state.chapterHold).toBe(null);
    expect(host.querySelector('.uni-predict')).toBe(null);
  });
});
