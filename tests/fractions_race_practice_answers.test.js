// Fraction Race asked "What fraction is this?" over a pie and a strip that printed the fraction, and promised a
// 30-second clock that never ran. The Practice Bank, the first screen of Practice, printed every answer under its
// question, and "Find the equivalent" read "1/2 = [object Object]/4".

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.FRACTIONS_RACE_SRC || 'stem_lab/stem_tool_fractions.js';
let root = null;

beforeEach(() => {
  resetStemLab();
  if (!window.ResizeObserver) { window.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} }; globalThis.ResizeObserver = window.ResizeObserver; }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => new Proxy({}, { get: (tg, k) => (k in tg ? tg[k] : /create.*Gradient/.test(k) ? () => ({ addColorStop() {} }) : k === 'measureText' ? () => ({ width: 20 }) : () => {}), set: (tg, k, v) => { tg[k] = v; return true; } }));
  loadTool(FILE, 'fractionViz');
  window.__fracTabTracked = true;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; document.body.innerHTML = '';
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function mount(saved) {
  document.body.innerHTML = '<div id="root"></div>';
  const view = { said: [] };
  function App() {
    const [state, setState] = React.useState({ _fractions: Object.assign({}, saved) });
    view.state = state._fractions;
    return window.StemLab._registry.fractionViz.render(makeCtx({ toolData: state, setToolData: setState, isTeacherMode: false, announceToSR: (m) => view.said.push(m) }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return view;
}
const panel = () => document.getElementById('fraction-section-panel');
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(text));
const click = async (el) => { expect(!!el, 'control missing').toBe(true); await React.act(async () => el.click()); };
const raceAt = (model, extra) => ({ tab: 'games', activeGame: 'race', frGame: Object.assign({ round: { n: 3, d: 8, model }, score: 0, mistakes: 0, answer: '', noClock: true }, extra) });
const type = async (value) => {
  const input = panel().querySelector('input[aria-label="Race answer"]');
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
};

describe('Fraction Race does not print the answer', () => {
  it.each(['pie', 'bar', 'length'])('%s round shows no fraction or part numbers', async (model) => {
    await mount(raceAt(model));
    const drawing = panel().querySelector('svg, [data-fraction-model="bar"]');
    expect(drawing.textContent).toBe('');
    expect(panel().textContent).not.toContain('3/8');
  });

  it.each(['pie', 'bar', 'length'])('%s round still tells a screen reader how many parts are shaded', async (model) => {
    await mount(raceAt(model));
    const drawing = panel().querySelector('[role="img"]');
    expect(drawing.getAttribute('aria-label')).toMatch(/3/);
    expect(drawing.getAttribute('aria-label')).toMatch(/8/);
  });

  it('every part can be counted: the strip and bar mark the parts on the unshaded side too', async () => {
    await mount(raceAt('length'));
    expect(panel().querySelectorAll('svg [data-fraction-part-line]').length).toBe(7);
    await mount(raceAt('bar'));
    const segs = [...panel().querySelector('[data-fraction-model="bar"]').children];
    expect(segs.slice(0, 7).every((s) => s.style.boxShadow.length > 0)).toBe(true);
  });

  it('the number stays on screens where naming the fraction is not the question', async () => {
    // The Pizza Shop builder shows what the student has built so far.
    const src = (await import('node:fs')).readFileSync(FILE, 'utf8');
    expect(src).toContain("drawPie(num, den, options.size || 240, palMain)");
    expect(src).toContain("drawPie(ps.slices, ps.totalSlices, 200, '#dc2626')");
  });
});

describe('Fraction Race clock', () => {
  it('counts down and ends the race at 30 seconds, keeping the score', async () => {
    vi.useFakeTimers();
    await mount({ tab: 'games', activeGame: 'race' });
    await click(button('Start race'));
    expect(panel().querySelector('[role="timer"]').textContent).toMatch(/30/);
    await React.act(async () => { vi.advanceTimersByTime(5000); });
    expect(panel().querySelector('[role="timer"]').textContent).toMatch(/25/);
    await React.act(async () => { vi.advanceTimersByTime(26000); });
    expect(panel().querySelector('[role="timer"]')).toBe(null);
    expect(panel().querySelector('input[aria-label="Race answer"]')).toBe(null);
    expect(panel().textContent).toMatch(/Time!/);
    expect(button('Race again')).toBeTruthy();
  });

  it('a race reopened after its time has passed is over, not frozen', async () => {
    vi.useFakeTimers();
    await mount(raceAt('bar', { noClock: false, endsAt: Date.now() - 1000, timeLeft: 12 }));
    expect(panel().querySelector('input[aria-label="Race answer"]')).toBe(null);
    expect(panel().textContent).toMatch(/Time!/);
  });

  it('warns a screen reader at 10 seconds and when time is up', async () => {
    vi.useFakeTimers();
    const view = await mount({ tab: 'games', activeGame: 'race' });
    await click(button('Start race'));
    await React.act(async () => { vi.advanceTimersByTime(21000); });
    expect(view.said.join(' | ')).toMatch(/10 seconds/);
    await React.act(async () => { vi.advanceTimersByTime(10000); });
    expect(view.said.join(' | ')).toMatch(/Time!/);
  });

  it('pressing Enter as time runs out cannot restart: focus goes to the result, not a button', async () => {
    vi.useFakeTimers();
    await mount({ tab: 'games', activeGame: 'race' });
    await click(button('Start race'));
    await React.act(async () => { vi.advanceTimersByTime(31000); });
    expect(document.activeElement.tagName).not.toBe('BUTTON');
    expect(document.activeElement.textContent).toMatch(/Time!/);
  });

  it('a learner can race with no clock, and it stays that way on restart', async () => {
    vi.useFakeTimers();
    await mount({ tab: 'games', activeGame: 'race' });
    await click(button('without a clock'));
    expect(panel().querySelector('[role="timer"]')).toBe(null);
    await React.act(async () => { vi.advanceTimersByTime(120000); });
    expect(panel().querySelector('input[aria-label="Race answer"]')).toBeTruthy();
    await click(button('Restart'));
    await React.act(async () => { vi.advanceTimersByTime(120000); });
    expect(panel().querySelector('input[aria-label="Race answer"]')).toBeTruthy();
  });

  it('says what is wrong: a whole number gets a format hint, a wrong fraction says so', async () => {
    const view = await mount(raceAt('bar'));
    await type('3');
    await click(button('Submit'));
    expect(panel().textContent).toContain('like 3/4');
    expect(view.state.frGame.mistakes).toBe(0);
    await type('1/8');
    await click(button('Submit'));
    expect(panel().textContent).toContain('Wrong, try again');
    expect(view.state.frGame.mistakes).toBe(1);
    await type('6/16');
    await click(button('Submit'));
    expect(view.state.frGame.score).toBe(1);
    expect(panel().textContent).not.toContain('Wrong, try again');
  });
});

describe('Practice Bank', () => {
  const OPEN = (pbSkill, pbIdx) => ({ tab: 'drill', drillSub: 'pbank', pbSkill, pbIdx: pbIdx || 0 });

  it.each(['identify', 'equivalent', 'simplify', 'compare'])('%s keeps the answer hidden until asked', async (skill) => {
    await mount(OPEN(skill));
    expect(panel().textContent).not.toContain('Answer:');
    await click(button('Show answer'));
    expect(panel().textContent).toContain('Answer:');
    expect(button('Hide answer').getAttribute('aria-expanded')).toBe('true');
  });

  it('the identify pie carries no printed fraction', async () => {
    await mount(OPEN('identify', 4));
    expect(panel().querySelector('[role="img"]').textContent).toBe('');
    expect(panel().textContent).not.toContain('3/4');
  });

  it.each(['Next', 'Previous'])('%s hides the answer again', async (label) => {
    await mount(OPEN('identify'));
    await click(button('Show answer'));
    await click(button(label));
    expect(panel().textContent).not.toContain('Answer:');
  });

  it('changing skill hides the answer again', async () => {
    await mount(OPEN('identify'));
    await click(button('Show answer'));
    await click(button('simplify'));
    expect(panel().textContent).not.toContain('Answer:');
  });

  it('Find the equivalent reads as a fraction, not [object Object]', async () => {
    await mount(OPEN('equivalent'));
    expect(panel().textContent).not.toContain('[object Object]');
    expect(panel().textContent).toContain('1/2 = ?/4');
  });
});
