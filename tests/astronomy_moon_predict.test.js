// Moon "predict, then check": the student sees only where the Moon is in its orbit, predicts the
// phase (and at the four principal phases, when it rises), then checks it in the simulator.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 30000, hookTimeout: 45000 });
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
const mounts = [];
let P;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); P = window.__alloAstroPure; });
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { for (const view of mounts.splice(0)) view.unmount(); globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag; });
function mount(state) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); let snapshot;
  function App() { const [data, setData] = React.useState({ astronomy: { observingList: [], tab: 'moon', ...state } }); snapshot = data; return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData })); }
  act(() => root.render(React.createElement(App)));
  const view = { host, get state() { return snapshot.astronomy; }, unmount() { act(() => root.unmount()); host.remove(); } };
  mounts.push(view); return view;
}
const NAMES = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];

describe('moonPredictRounds', () => {
  it('makes five rounds on five different phases, each keyed to the phase the simulator shows at that age', () => {
    for (let seed = 0; seed < 300; seed++) {
      const rounds = P.moonPredictRounds(seed);
      expect(rounds).toHaveLength(5);
      expect(new Set(rounds.map(r => r.phaseIndex)).size).toBe(5);
      for (const round of rounds) {
        expect(P.moonPhaseFromAge(round.ageDays).phaseIndex).toBe(round.phaseIndex);
        expect(P.moonPhaseFromAge(round.ageDays).name).toBe(NAMES[round.phaseIndex]);
        expect(round.orbitDeg).toBeCloseTo(round.phaseIndex * 45, 6);
        expect(round.options).toHaveLength(4);
        expect(new Set(round.options).size).toBe(4);
        expect(round.options[round.answer]).toBe(round.phaseIndex);
      }
    }
  });
  it('asks the rise time only at the four principal phases, with the right key', () => {
    const expected = { 0: 'sunrise', 2: 'midday', 4: 'sunset', 6: 'midnight' };
    let asked = 0;
    for (let seed = 0; seed < 100; seed++) for (const round of P.moonPredictRounds(seed)) {
      if (round.phaseIndex % 2 === 1) { expect(round.rise).toBeUndefined(); continue; }
      asked++;
      expect([...round.rise.options].sort()).toEqual([...P.MOON_RISE_TIMES].sort());
      expect(round.rise.options[round.rise.answer]).toBe(expected[round.phaseIndex]);
    }
    expect(asked).toBeGreaterThan(100);
  });
  it('gives the right answer no favourite position', () => {
    const phase = [0, 0, 0, 0], rise = [0, 0, 0, 0];
    for (let seed = 0; seed < 2000; seed++) for (const round of P.moonPredictRounds(seed)) { phase[round.answer]++; if (round.rise) rise[round.rise.answer]++; }
    for (const counts of [phase, rise]) {
      const total = counts.reduce((a, b) => a + b, 0);
      for (const n of counts) { expect(n / total).toBeGreaterThan(0.2); expect(n / total).toBeLessThan(0.3); }
    }
  });
  it('is repeatable for a seed and varies between seeds', () => {
    expect(P.moonPredictRounds(42)).toEqual(P.moonPredictRounds(42));
    const firsts = new Set(Array.from({ length: 50 }, (_, seed) => P.moonPredictRounds(seed).map(r => r.phaseIndex).join('')));
    expect(firsts.size).toBeGreaterThan(30);
    for (const bad of [NaN, null, 'x', {}]) expect(P.moonPredictRounds(bad)).toHaveLength(5);
  });
});

describe('the predict card on the Moon tab', () => {
  const SEED = 7;
  it('starts closed, with nothing saved but a seed and counters once started', () => {
    const view = mount({});
    expect(view.host.querySelector('#astronomy-moon-predict-form')).toBeNull();
    act(() => Simulate.click(view.host.querySelector('#astronomy-moon-predict-start')));
    expect(Number.isInteger(view.state.moonPredictSeed)).toBe(true);
    expect(view.state).toMatchObject({ moonPredictRound: 0, moonPredictPick: null, moonPredictChecked: false, moonPredictScore: 0 });
    expect(view.host.querySelector('#astronomy-moon-predict-form').textContent).toContain('Round 1 of 5');
  });
  it('shows the orbit position without naming the phase, and does not reveal the answer before the check', () => {
    const round = P.moonPredictRounds(SEED)[0];
    const view = mount({ moonPredictSeed: SEED, moonPredictRound: 0 });
    const label = view.host.querySelector('#astronomy-moon-predict-diagram').getAttribute('aria-label');
    expect(label).toContain('The Moon is ' + Math.round(round.orbitDeg) + ' degrees around its counterclockwise orbit');
    for (const name of NAMES) expect(label).not.toContain(name);
    const options = [...view.host.querySelectorAll('input[name="astronomy-moon-predict-phase"]')].map(i => i.closest('label').textContent);
    expect(options).toEqual(round.options.map(i => NAMES[i]));
    expect(view.host.querySelector('#astronomy-moon-predict-feedback').textContent).toBe('');
    expect(view.host.querySelector('[data-predict-state]')).toBeNull();
  });
  it('plays five rounds, scores them, explains each answer and can show it in the simulator', () => {
    const rounds = P.moonPredictRounds(SEED);
    const view = mount({ moonPredictSeed: SEED, moonPredictRound: 0, moonPredictScore: 0 });
    const pickRadio = (name, index) => act(() => Simulate.change(view.host.querySelectorAll('input[name="' + name + '"]')[index], { target: { checked: true } }));
    rounds.forEach((round, n) => {
      const correct = n !== 1;                                   // answer round 2 wrongly on purpose
      pickRadio('astronomy-moon-predict-phase', correct ? round.answer : (round.answer + 1) % 4);
      if (round.rise) {
        act(() => Simulate.submit(view.host.querySelector('#astronomy-moon-predict-form')));
        expect(view.state.moonPredictChecked).toBe(false);       // both questions must be answered first
        pickRadio('astronomy-moon-predict-rise', round.rise.answer);
      }
      act(() => Simulate.submit(view.host.querySelector('#astronomy-moon-predict-form')));
      const feedback = view.host.querySelector('#astronomy-moon-predict-feedback');
      expect(feedback.getAttribute('data-correct')).toBe(String(correct));
      expect(feedback.textContent).toContain((correct ? 'Right: ' : 'Not this time: it is ') + NAMES[round.phaseIndex] + '.');
      expect(view.host.querySelector('[data-predict-state="right"]').textContent).toContain(NAMES[round.phaseIndex] + ' ✓');
      if (!correct) expect(view.host.querySelector('[data-predict-state="wrong"]').textContent).toContain('✗');
      act(() => Simulate.submit(view.host.querySelector('#astronomy-moon-predict-form')));   // a second submit cannot score twice
      if (n === 0) {
        act(() => Simulate.click(view.host.querySelector('#astronomy-moon-predict-see')));
        expect(view.state.moonAgeDays).toBeCloseTo(round.ageDays, 6);
        expect(view.state.moonViewMode).toBe('telescope');
      }
      act(() => Simulate.click(view.host.querySelector('#astronomy-moon-predict-next')));
    });
    expect(view.state.moonPredictScore).toBe(4);
    expect(view.host.querySelector('#astronomy-moon-predict-done').textContent).toContain('You predicted 4 of 5 phases correctly.');
    expect(view.host.querySelector('#astronomy-moon-predict-done').textContent).toContain('half of the Moon is always lit by the Sun');
  });
  it('survives forged saved state', () => {
    for (const bad of [{ moonPredictSeed: 'x' }, { moonPredictSeed: 3, moonPredictRound: 99 }, { moonPredictSeed: 3, moonPredictRound: -1, moonPredictPick: 9, moonPredictChecked: true, moonPredictScore: 'many' }, { moonPredictSeed: 3, moonPredictRound: {}, moonPredictRisePick: {} }]) {
      expect(() => renderTool('astronomy', { astronomy: { observingList: [], tab: 'moon', ...bad } })).not.toThrow();
    }
  });
});
