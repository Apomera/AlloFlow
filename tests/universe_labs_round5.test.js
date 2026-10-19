// Universe Explorer, fifth pass (2026-10-18): four more reading lists gained labs. The
// cosmic calendar becomes a guess-the-date game, Big Numbers a powers-of-ten estimate,
// Galaxy Types a shape classifier, and Supernovae a blink-comparison hunt plus a spectrum.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
let pure;
beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });
const render = (state) => renderTool('universe', { universe: Object.assign({ tutorialDismissed: true }, state) });

describe('Lab data (pure)', () => {
  it('places events on the cosmic calendar', () => {
    const day = (id) => pure.universeDayName(pure.universeCalendarDay(pure.UNIVERSE_CALENDAR_EVENTS.find((e) => e.id === id).yearsAgo));
    expect(day('sun')).toBe('Sep 2');
    expect(day('fossils')).toBe('Sep 30');
    expect(day('dinosaurs')).toBe('Dec 25');
    expect(day('extinction')).toBe('Dec 30');
    expect(day('humans')).toBe('Dec 31');
    expect(pure.universeDayName(0)).toBe('Jan 1');
    expect(pure.universeDayName(364)).toBe('Dec 31');
    expect(pure.universeCalendarMiss(4.57e9, 182)).toBe(62);
    expect(pure.universeCalendarMiss(2.3e8, 358)).toBe(0);
    // A guess after the real date is just as far off as one before it.
    expect(pure.universeCalendarMiss(4.57e9, 300)).toBe(56);
  });

  it('measures an estimate’s miss in powers of ten', () => {
    expect(pure.universeEstimateMiss(1.3e6, 6)).toBeCloseTo(0.114, 2);
    expect(pure.universeEstimateMiss(2e11, 6)).toBeCloseTo(5.301, 2);
    const seconds = pure.UNIVERSE_ESTIMATES.find((e) => e.id === 'seconds').value;
    expect(Math.log10(seconds)).toBeCloseTo(17.64, 2);
  });

  it('gives every galaxy kind at least one specimen, and no kind every specimen', () => {
    const counts = {};
    pure.UNIVERSE_GALAXY_SPECIMENS.forEach((g) => g.kinds.forEach((k) => { counts[k] = (counts[k] || 0) + 1; }));
    pure.UNIVERSE_GALAXY_KINDS.forEach((k) => {
      expect(counts[k.id] || 0, k.id).toBeGreaterThan(0);
      expect(counts[k.id], k.id).toBeLessThan(pure.UNIVERSE_GALAXY_SPECIMENS.length);
    });
  });

  it('keeps the spectrum question free of a length cue', () => {
    const item = pure.UNIVERSE_SN_SPECTRUM_PREDICTION, lengths = item.options.map((o) => o.length), max = Math.max(...lengths);
    expect(lengths[item.answer] === max && lengths.filter((l) => l === max).length === 1).toBe(false);
    expect(new Set(pure.UNIVERSE_SN_HUNT.options.map((o) => o.length)).size).toBe(1);
  });
});

describe('Labs (rendered)', () => {
  it('Calendar: one guess at a time, scored in days, then an average', () => {
    const fresh = render({ showCalendar: true });
    expect(fresh.includes('The Sun and Earth form')).toBe(true);
    expect(fresh.includes('Your guess: <strong>Jul 2')).toBe(true);
    const one = render({ showCalendar: true, calendarGuesses: { sun: 182 } });
    expect(one.includes('you said Jul 2; really Sep 2, ')).toBe(true);
    expect(one.includes('62 days off.')).toBe(true);
    expect(render({ showCalendar: true, calendarGuesses: { sun: 300 } }).includes('you said Oct 28; really Sep 2, 3:02 AM. 56 days off.')).toBe(true);
    expect(one.includes('The oldest fossils of life (microbial mats)')).toBe(true);
    const all = render({ showCalendar: true, calendarGuesses: { sun: 244, fossils: 272, dinosaurs: 300, extinction: 363, humans: 364, pyramids: 364 } });
    expect(all.includes('On average you were 9.7 days off.')).toBe(true);
    expect(all.includes('really Dec 30, 6:06 AM. Right day!')).toBe(true);
    expect(all.includes('Lock in my guess')).toBe(false);
  });

  it('holds back the reference lists that would give the games away', () => {
    expect(render({ showCalendar: true }).includes('Dinosaurs appear'), 'calendar list waits').toBe(false);
    expect(render({ showCalendar: true }).includes('Show the full calendar now')).toBe(true);
    expect(render({ showCalendar: true, calendarShowAll: true }).includes('Dinosaurs appear')).toBe(true);
    expect(render({ showCalendar: true, calendarGuesses: { sun: 1, fossils: 1, dinosaurs: 1, extinction: 1, humans: 1, pyramids: 1 } }).includes('Dinosaurs appear')).toBe(true);
    expect(render({ showNumbers: true }).includes('Atoms in a human body'), 'number list waits').toBe(false);
    expect(render({ showNumbers: true, numbersShowAll: true }).includes('Atoms in a human body')).toBe(true);
    const done = render({ showNumbers: true, estimateGuesses: { earths: 1, milkyway: 1, proxima: 1, seconds: 1, earthmass: 1, atoms: 1 } });
    expect(done.includes('Atoms in a human body')).toBe(true);
    expect(done.includes('Show the list of big numbers now')).toBe(false);
  });

  it('Big Numbers: estimates scored in powers of ten', () => {
    expect(render({ showNumbers: true, estimateGuesses: { earths: 6 } }).includes('Spot on: within a factor of 3.')).toBe(true);
    const two = render({ showNumbers: true, estimateGuesses: { earths: 6, milkyway: 6 } });
    expect(two.includes('About 200,000 times too small.')).toBe(true);
    expect(two.includes('How many kilometres away is the nearest star after the Sun?')).toBe(true);
    const all = render({ showNumbers: true, estimateGuesses: { earths: 6, milkyway: 11, proxima: 14, seconds: 17, earthmass: 25, atoms: 28 } });
    expect(all.includes('On average you were off by 0.3 powers of ten.')).toBe(true);
    expect(all.includes('really about 435 quadrillion (4.4 × 10¹⁷).')).toBe(true);
  });

  it('Galaxy Types: drawings with text alternatives, sorted with feedback', () => {
    const fresh = render({ showGalaxyTypes: true });
    expect(fresh.includes('Galaxy 6')).toBe(true);
    expect(fresh.includes('<title id="uni-galaxy-1-look">A smooth, round, yellow-orange glow')).toBe(true);
    expect(fresh.includes('Real example')).toBe(false);
    const wrong = render({ showGalaxyTypes: true, galaxySort: { 1: 'spiral' } });
    expect(wrong.includes('Most scientists would say “Elliptical”.')).toBe(true);
    expect(wrong.includes('it looks like M87 in the Virgo Cluster.')).toBe(true);
  });

  it('Supernovae: blink, find the new star, then read its spectrum', () => {
    const before = render({ showSupernovae: true });
    expect(before.includes('Last month: spots A, B, D and E each have a star; spot C is empty.')).toBe(true);
    expect(before.includes('cx="150" cy="94"'), 'no new star last month').toBe(false);
    expect(before.includes('Read the spectrum')).toBe(false);
    expect(before.includes('Skip and show me')).toBe(false);
    const after = render({ showSupernovae: true, snView: 'after' });
    expect(after.includes('Tonight: spots A, B, C, D and E each have a star.')).toBe(true);
    expect(after.includes('cx="150" cy="94"')).toBe(true);
    const found = render({ showSupernovae: true, snSpot: 0 });
    expect(found.includes('It is spot C.')).toBe(true);
    expect(found.includes('no hydrogen dip at 656 nanometres')).toBe(true);
    expect(render({ showSupernovae: true, snSpot: 2, snType: 1 }).includes('It was a white dwarf: a Type Ia supernova.')).toBe(true);
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
  async function slide(el, value) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('moves the calendar slider, locks a guess and moves on to the next event', async () => {
    await mount({ showCalendar: true });
    await slide(host.querySelector('#universe-calendar-guess'), 244);
    expect(state.calendarDraft).toBe(244);
    await click(button('#unisec-calendar .uni-guess-row', 'Lock in my guess'));
    expect(state.calendarGuesses).toEqual({ sun: 244 });
    expect(state.uniEngaged.calendar).toBe(1);
    expect(host.querySelector('#unisec-calendar .uni-guess-list').textContent).toContain('Right day!');
    expect(host.querySelector('#unisec-calendar label[for="universe-calendar-guess"]').textContent).toContain('The oldest fossils');
  });

  it('blinks the images, finds spot C and reads the spectrum', async () => {
    await mount({ showSupernovae: true });
    await click(button('#unisec-supernovae .uni-lab-choices', 'Tonight'));
    expect(state.snView).toBe('after');
    await click(button('#unisec-supernovae .uni-mini-predict', 'Spot C'));
    expect(state.snSpot).toBe(2);
    await click(button('#unisec-supernovae .uni-mini-predict', 'A white dwarf (Type Ia)'));
    expect(state.snType).toBe(0);
    expect(host.querySelector('#unisec-supernovae').textContent).toContain('Yes: a white dwarf, a Type Ia supernova.');
    expect(state.uniEngaged.supernovae).toBe(3);
  });
});
