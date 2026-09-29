import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const component = { id: 1, type: 'resistor', value: 10000 };
const families = [
  { name: 'current from voltage', first: [3, 5, 6, 9, 12, 24], second: [10, 20, 50, 100, 200, 500], answer: (v, r) => v / r, unit: 'A' },
  { name: 'voltage', first: [.1, .2, .5, 1, 2, 3], second: [10, 20, 50, 100, 200], answer: (i, r) => i * r, unit: 'V' },
  { name: 'resistance', first: [6, 9, 12, 24], second: [.1, .2, .5, 1, 2], answer: (v, i) => v / i, unit: 'Ω' },
  { name: 'power from current', first: [6, 9, 12], second: [.5, 1, 2, 3], answer: (v, i) => v * i, unit: 'W' },
  { name: 'series resistance', first: [50, 100, 200], second: [50, 100, 200], answer: (a, b) => a + b, unit: 'Ω' },
  { name: 'parallel resistance', first: [100, 200, 300], second: [100, 200, 300], answer: (a, b) => a * b / (a + b), unit: 'Ω' },
  { name: 'power from resistance', first: [6, 9, 12], second: [10, 20, 50, 100], answer: (v, r) => v * v / r, unit: 'W' },
  { name: 'current from power', first: [6, 9, 12, 24], second: [6, 12, 24, 36, 48], answer: (v, p) => p / v, unit: 'A' }
];

describe('Ohm quiz options', () => {
  beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); });
  afterEach(() => vi.restoreAllMocks());

  it.each(families.map((family, index) => ({ ...family, index })))('has one correct, positive, visibly distinct option for every $name input pair', family => {
    const random = vi.spyOn(Math, 'random');
    const decimals = family.unit === 'A' ? 3 : 1;
    for (let a = 0; a < family.first.length; a++) for (let b = 0; b < family.second.length; b++) {
      for (const draws of [[0, 0, 0], [.999, .999, .999], [.5, .5, .5], [.25, .75, .25]]) {
        const sequence = [(family.index + .1) / 8, (a + .1) / family.first.length, (b + .1) / family.second.length, ...draws];
        let draw = 0;
        random.mockImplementation(() => sequence[draw++] ?? .5);
        const question = window.StemLab.circuitOhmQuestion();
        const expected = Number(family.answer(family.first[a], family.second[b]).toFixed(decimals));
        expect(question.answer).toBe(expected);
        expect(question.unit).toBe(family.unit);
        expect(question.opts).toHaveLength(4);
        expect(question.opts.every(value => Number.isFinite(value) && value > 0)).toBe(true);
        expect(new Set(question.opts.map(value => value.toFixed(decimals))).size).toBe(4);
        expect(question.opts.filter(value => value === question.answer)).toHaveLength(1);
      }
    }
  });
});

describe('Circuit learning interactions', () => {
  let host, root, config, latest, awardXP;

  beforeEach(() => {
    const canvas = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, {
      get(target, key) { return key in target ? target[key] : () => {}; }
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    awardXP = vi.fn(); latest = null;
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

  async function mount(circuit = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ _circuit: { mode: 'series', voltage: 1, components: [component], pauseMotion: true, ...circuit } });
      latest = toolData._circuit;
      return config.render(makeCtx({ toolData, setToolData, awardXP }));
    }
    await act(async () => { root.render(React.createElement(Harness)); });
  }
  const button = text => Array.from(host.querySelectorAll('button')).find(element => element.textContent === text);
  const quizAwards = () => awardXP.mock.calls.filter(call => call[0] === 'circuit');
  const legacyQuiz = { text: 'A 3V battery with a 500Ω resistor: current?', answer: .006, unit: 'A', formula: 'I = V/R = 3/500 = 0.006A', opts: [.006, .02, .007, .007], answered: false };

  it('generates usable small-current choices and awards only the exact generated answer', async () => {
    await mount();
    const sequence = [0, 0, .999, 0, 0, 0]; let draw = 0;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => sequence[draw++] ?? .6);
    await act(async () => Array.from(host.querySelectorAll('button')).find(element => element.textContent.includes("Ohm's Law Quiz")).click());
    random.mockRestore();
    expect(latest.ohmQuiz.answer).toBe(.006);
    expect(new Set(latest.ohmQuiz.opts).size).toBe(4);
    const wrong = latest.ohmQuiz.opts.find(value => value !== .006 && Math.abs(value - .006) < .01);
    expect(wrong).toBeDefined();
    await act(async () => button(wrong + 'A').click());
    expect(latest.ohmScore).toBe(0);
    expect(latest.ohmStreak).toBe(0);
    expect(quizAwards()).toHaveLength(0);
    expect(host.textContent).toContain('Answer: 0.006A');
  });

  it.each([{ choice: .007, correct: false }, { choice: .006, correct: true }])('grades an existing saved quiz choice $choice without tolerance or schema changes', async ({ choice, correct }) => {
    await mount({ ohmQuiz: legacyQuiz, ohmScore: 0, ohmStreak: 2 });
    await act(async () => button(choice + 'A').click());
    expect(latest.ohmQuiz.answered).toBe(true);
    expect(latest.ohmQuiz.chosen).toBe(choice);
    expect(latest.ohmScore).toBe(correct ? 1 : 0);
    expect(latest.ohmStreak).toBe(correct ? 3 : 0);
    expect(quizAwards()).toEqual(correct ? [['circuit', 10, "Ohm's Law Quiz"]] : []);
    expect(host.textContent).toContain(correct ? 'Correct!' : 'Answer: 0.006A');
    expect(button(choice + 'A')).toBeUndefined();
    expect(!!latest.badges?.quizStreak).toBe(correct);
  });

  it('shows precise signed evidence through saving a baseline, changing supply, and recording a trial', async () => {
    await mount();
    await act(async () => button('Save baseline').click());
    const supply = host.querySelector('input[type="range"][min="0"][max="24"]');
    expect(supply).not.toBeNull();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(supply, '2');
      supply.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(latest.voltage).toBe(2);
    const readings = Array.from(host.querySelectorAll('.circuit-lab-workflow .circuit-comparison strong')).map(element => element.textContent);
    expect(readings).toEqual(['100 µA', '200 µA', '+100 µA']);
    await act(async () => button('Record comparison').click());
    expect(latest.observations).toHaveLength(1);
    expect(latest.observations[0].delta).toBeCloseTo(.0001, 12);
    expect(host.querySelector('.circuit-lab-workflow').textContent).toContain('Change in source current: +100 µA');
    expect(host.querySelector('.circuit-lab-workflow').textContent).not.toContain('0.000 A');
    expect(button('Record comparison').disabled).toBe(true);
  });
});
