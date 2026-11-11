// Quiz changes (2026-11 review): practice feedback on by default, two reworded questions, an ungraded
// six-question simulator warm-up, and a daily sky question that does not repeat a neighbouring day's answer.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 120000, hookTimeout: 60000 });
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
const mounts = [];
let P;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { for (const view of mounts.splice(0)) view.unmount(); globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag; });
function mount(state) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); let snapshot;
  function App() { const [data, setData] = React.useState({ astronomy: { observingList: [], tab: 'quiz', ...state } }); snapshot = data; return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData })); }
  act(() => root.render(React.createElement(App)));
  const view = { host, get state() { return snapshot.astronomy; }, unmount() { act(() => root.unmount()); host.remove(); } };
  mounts.push(view); return view;
}

describe('graded bank', () => {
  it('keeps its fifteen questions (saved progress, XP and the 80% mission depend on the length)', () => {
    expect(P.QUIZ_QUESTIONS).toHaveLength(15);
  });
  it('no longer hands out the answer to another question, and drops a contestable superlative', () => {
    const all = JSON.stringify(P.QUIZ_QUESTIONS.map(q => [q.q, q.choices]));
    expect(all).not.toContain('includes Proxima');
    expect(all).not.toContain('the most distant object visible to the naked eye');
    const system = P.QUIZ_QUESTIONS.find(q => q.q === 'Which is the closest star system to our Sun?');
    expect(system.choices[system.answer]).toBe('Alpha Centauri, in the southern constellation Centaurus');
    const andromeda = P.QUIZ_QUESTIONS.find(q => q.q.startsWith('The Andromeda Galaxy is the most distant object most people can see without a telescope'));
    expect(andromeda.choices[andromeda.answer]).toBe('2.5 million light-years');
  });
  it('shows the explanation after each answer unless the student turns practice mode off', () => {
    const view = mount({});
    const practice = [...view.host.querySelectorAll('input[type="checkbox"]')].find(i => i.closest('label').textContent.includes('Practice mode'));
    expect(practice.checked).toBe(true);
    expect(mount({ quizPractice: false }).host.querySelector('input[aria-describedby="astronomy-quiz-practice-help"]').checked).toBe(false);
    expect(mount({ quizPractice: true }).host.querySelector('input[aria-describedby="astronomy-quiz-practice-help"]').checked).toBe(true);
  });
});

describe('simulator warm-up bank', () => {
  it('has six sound questions keyed to the right answer', () => {
    const key = Object.fromEntries(P.QUIZ_SIM_QUESTIONS.map(q => [q.q, q.choices[q.answer]]));
    expect(key).toEqual({
      'In the Seasons tilt lab, set Earth\'s tilt to 0°. What happens to the length of the day through the year?': 'It stays at about 12 hours all year',
      'In which month is Earth closest to the Sun?': 'January',
      'The Moon is on the far side of Earth from the Sun. Which phase do we see?': 'Full Moon',
      'About when does a Full Moon rise?': 'Around sunset',
      'Why is there not a solar eclipse at every New Moon?': 'The Moon\'s orbit is tilted, so its shadow usually misses',
      'It is July. What season is it in Sydney, Australia?': 'Winter',
    });
  });
  it('agrees with the tool’s own models', () => {
    const flat = P.tiltLabModel(0, 6, 43.66, 1);
    expect(flat.dayLengthRange).toBeCloseTo(0, 6);
    expect(flat.here.dayLength).toBeCloseTo(12, 6);
    expect(P.moonPhaseFromAge(P.AM_SYNODIC / 2).name).toBe('Full Moon');
    expect(P.MOON_RISE_TIMES[2]).toBe('sunset');
    expect(P.seasonalSky(7, -33.87).season).toBe('winter');
    // Perihelion: the Sun's distance is smallest in early January.
    const distance = (m, d) => { const s = P.sunEcliptic(P.astroDayNumber(2026, m, d, 12)); return s.r; };
    expect(distance(1, 4)).toBeLessThan(distance(4, 4));
    expect(distance(1, 4)).toBeLessThan(distance(7, 4));
    expect(distance(1, 4)).toBeLessThan(distance(10, 4));
  });
  it('gives no position or length cue', () => {
    const slots = [0, 0, 0, 0];
    for (const q of P.QUIZ_SIM_QUESTIONS) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      slots[q.answer]++;
      const lengths = q.choices.map(c => c.length), right = lengths[q.answer];
      const longestOther = Math.max(...lengths.filter((_, i) => i !== q.answer));
      expect(right).toBeLessThanOrEqual(longestOther * 1.25 + 2);
      expect(['seasons', 'moon', 'eclipses']).toContain(q.tab);
      expect(q.explain.length).toBeGreaterThan(60);
    }
    expect(Math.max(...slots)).toBeLessThanOrEqual(2);
    expect(slots.filter(n => n > 0).length).toBeGreaterThanOrEqual(3);
  });
  it('explains each answer at once, locks it, and is never part of the graded score', () => {
    const view = mount({ quizSimOpen: true });
    const group = i => view.host.querySelector('[data-warmup-question="' + i + '"]');
    const q0 = P.QUIZ_SIM_QUESTIONS[0], wrong = (q0.answer + 1) % 4;
    expect(group(0).textContent).not.toContain(q0.explain.slice(0, 30));
    act(() => Simulate.click(group(0).querySelectorAll('button')[wrong]));
    expect(view.state.quizSimAnswers[0]).toBe(wrong);
    expect(group(0).textContent).toContain('Not quite. ' + q0.explain);
    expect(group(0).querySelector('[data-warmup-state="right"]').textContent).toBe(q0.choices[q0.answer] + ' ✓');
    expect(group(0).querySelector('[data-warmup-state="wrong"]').textContent).toBe(q0.choices[wrong] + ' ✗');
    act(() => Simulate.click(group(0).querySelectorAll('button')[q0.answer]));     // locked: a second pick changes nothing
    expect(view.state.quizSimAnswers[0]).toBe(wrong);
    expect(view.state.quizAnswers).toBeUndefined();
    P.QUIZ_SIM_QUESTIONS.forEach((q, i) => { if (i) act(() => Simulate.click(group(i).querySelectorAll('button')[q.answer])); });
    expect(view.host.querySelector('#astronomy-quiz-warmup-score').textContent).toBe('Warm-up: 5 of 6 right.');
    expect(view.host.textContent).toContain('0 of 15 answered');
  });
  it('survives forged saved answers', () => {
    for (const bad of [{ quizSimAnswers: 'x' }, { quizSimAnswers: [9, -1, {}, null, 'a', 2.5] }, { quizSimAnswers: { 0: 1 }, quizSimOpen: 'yes' }]) {
      expect(() => renderTool('astronomy', { astronomy: { observingList: [], tab: 'quiz', ...bad } })).not.toThrow();
    }
  });
});

describe('daily sky question', () => {
  const SITES = [{ lat: 45.58, lon: -69.72, timeZone: 'America/New_York' }, { lat: -33.87, lon: 151.21, timeZone: 'Australia/Sydney' }, { lat: 51.51, lon: -0.13, timeZone: 'Europe/London' }];
  const key = n => new Date(Date.UTC(2026, 0, 1) + n * 86400000).toISOString().slice(0, 10);
  const answer = q => String(q.options[q.answer]);
  it('no longer gives the same answer on 9, 10 and 11 November 2026', () => {
    const three = ['2026-11-09', '2026-11-10', '2026-11-11'].map(day => answer(P.dailySkyQuestion(day, SITES[0])));
    expect(three[0]).not.toBe(three[1]);
    expect(three[1]).not.toBe(three[2]);
  });
  it('almost never repeats the previous day’s answer across a year at three places', () => {
    let pairs = 0, repeats = 0;
    for (const site of SITES) {
      let previous = null;
      for (let n = 0; n < 365; n++) {
        const q = P.dailySkyQuestion(key(n), site);
        if (!q) { previous = null; continue; }
        if (previous !== null) { pairs++; if (answer(q) === previous) repeats++; }
        previous = answer(q);
      }
    }
    expect(pairs).toBeGreaterThan(1000);
    expect(repeats / pairs).toBeLessThan(0.01);
  });
  it('stays a pure function of the day and place', () => {
    const a = P.dailySkyQuestion('2026-11-11', SITES[0]), b = P.dailySkyQuestion('2026-11-11', SITES[0]);
    expect(P.dailySignature(a)).toBe(P.dailySignature(b));
    expect(a.options[a.answer]).toBe(b.options[b.answer]);
    for (const day of ['2026-11-10', '2026-11-11', '2026-11-12']) {
      const q = P.dailySkyQuestion(day, SITES[1]);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }
  });
});
