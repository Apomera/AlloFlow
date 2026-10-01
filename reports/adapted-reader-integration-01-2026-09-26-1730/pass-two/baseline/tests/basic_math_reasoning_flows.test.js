import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let root;
beforeEach(() => { vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; vi.useRealTimers(); vi.restoreAllMocks(); });
async function mount(file, id, initial, context) {
  const tool = loadTool('stem_lab/stem_tool_' + file + '.js', id);
  let latest, setter;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state; setter = setState;
    return tool.render(makeCtx({ toolData: state, labToolData: state, setToolData: setState, setLabToolData: setState, ...(context ? context(state, setState) : {}) }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest, patch: async (fn) => React.act(() => setter(fn)) };
}
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label || el.getAttribute('aria-label') === label);
  expect(button, label).toBeTruthy();
  await React.act(() => button.click());
}
const prediction = (value, fromUnit, toUnit) => ({ unitConvert: { category: 'length', tab: 'convert', value, fromUnit, toUnit, predictBeforeConvert: true } });

describe('conversion predictions', () => {
  it('withholds numeric and accessible answers until a prediction is checked, then resets for changed units', async () => {
    const app = await mount('unitconvert', 'unitConvert', { unitConvert: { ...prediction(1, 'm', 'cm').unitConvert, history: [{ from: 'saved example', to: 'previous answer', ts: 1 }] } });
    expect(document.querySelector('[aria-label="Result hidden while you predict"]')).toBeTruthy();
    expect(document.querySelector('[data-unit-equality-model]')).toBeNull();
    expect(document.body.textContent).not.toContain('previous answer');
    await click('Larger');
    expect(document.querySelector('[aria-label="Result hidden while you predict"]')).toBeTruthy();
    await click('Compare with my prediction');
    expect(document.querySelector('[aria-label="Converted result: 100 cm"]')).toBeTruthy();
    expect(document.body.textContent).toContain('Your prediction matches.');
    expect(document.body.textContent).toContain('The new unit is smaller.');
    await app.patch(s => ({ ...s, unitConvert: { ...s.unitConvert, toUnit: 'km' } }));
    expect(document.querySelector('[aria-label="Result hidden while you predict"]')).toBeTruthy();
    expect([...document.querySelectorAll('[aria-label="Your prediction"] button')].every(el => el.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it.each([[0, 'm', 'cm', 'Zero stays zero'], [4, 'cm', 'cm', 'same size']])('handles unchanged values without a false unit-size explanation', async (value, from, to, reason) => {
    await mount('unitconvert', 'unitConvert', prediction(value, from, to));
    await click('The same');
    await click('Compare with my prediction');
    expect(document.body.textContent).toContain('Your prediction matches.');
    expect(document.body.textContent).toContain(reason);
  });

  it('explains a mistaken prediction without locking the converter', async () => {
    const app = await mount('unitconvert', 'unitConvert', prediction(250, 'cm', 'm'));
    await click('Larger'); await click('Compare with my prediction');
    expect(document.body.textContent).toContain('Revisit your prediction.');
    expect(document.body.textContent).toContain('The new unit is larger.');
    expect(document.querySelector('[aria-label="Converted result: 2.5 m"]')).toBeTruthy();
    await app.patch(s => ({ ...s, unitConvert: { ...s.unitConvert, value: 125 } }));
    expect(document.querySelector('[aria-label="Result hidden while you predict"]')).toBeTruthy();
  });

  it.each([['temperature', 32, '°F', '°C'], ['length', -3, 'm', 'cm']])('preserves the normal converter outside the prediction scope', (category, value, fromUnit, toUnit) => {
    loadTool('stem_lab/stem_tool_unitconvert.js', 'unitConvert');
    const html = renderTool('unitConvert', { unitConvert: { category, value, fromUnit, toUnit, predictBeforeConvert: true } });
    expect(html).not.toContain('Result hidden while you predict');
    expect(html).toContain('Choose a valid nonnegative quantity');
  });
});

describe('equivalent money sets', () => {
  const quarter = { id: 'q', name: 'Quarter', value: 0.25 };
  const nickels = Array.from({ length: 5 }, (_, i) => ({ id: 'n' + i, name: 'Nickel', value: 0.05 }));
  it('keeps a saved set through clearing and recognizes a different equal-value set', async () => {
    const app = await mount('money', 'moneyMath', { _moneyMath: { placed: [quarter] } });
    await click('Save current set'); await click('Clear');
    expect(app.state()._moneyMath.equivalentSet.pieces).toEqual([quarter]);
    expect(document.querySelector('[data-equivalent-money]').textContent).toContain('Saved set');
    await app.patch(s => ({ ...s, _moneyMath: { ...s._moneyMath, placed: nickels } }));
    expect(document.querySelector('[data-equal-value]').dataset.equalValue).toBe('true');
    expect(document.querySelector('[data-different-set]').dataset.differentSet).toBe('true');
    expect(document.body.textContent).toContain('Same value, different pieces!');
    expect(app.state()._moneyMath.equivalentSet.pieces).toEqual([quarter]);
  });

  it('distinguishes rearrangement from a new set and never compares different currencies', async () => {
    const app = await mount('money', 'moneyMath', { _moneyMath: { currency: 'USD', placed: nickels } });
    await click('Save current set');
    await app.patch(s => ({ ...s, _moneyMath: { ...s._moneyMath, placed: [...nickels].reverse() } }));
    expect(document.querySelector('[data-different-set]').dataset.differentSet).toBe('false');
    await app.patch(s => ({ ...s, _moneyMath: { ...s._moneyMath, currency: 'EUR', placed: [] } }));
    expect(document.querySelector('[data-equivalent-money]')).toBeNull();
  });
});

describe('multiplication feedback pacing', () => {
  it.each([[false, false], [true, false], [true, true]])('advances automatically only in a running speed run (active=%s, pause=%s)', async (active, pauseAfter) => {
    vi.useFakeTimers();
    const advanced = vi.fn();
    const app = await mount('multtable', 'multtable', { exploreScore: { correct: 0, total: 0 }, challenge: { a: 7, b: 8, mode: 'mult' }, answer: '56', _multTimer: { active, endTime: Date.now() + 120000, timeLeft: 120, missed: [] } }, (state, setState) => {
      const set = key => value => setState(s => ({ ...s, [key]: typeof value === 'function' ? value(s[key]) : value }));
      return { multTableChallenge: state.challenge, setMultTableChallenge: value => { advanced(value); set('challenge')(value); }, multTableAnswer: state.answer, setMultTableAnswer: set('answer'), multTableFeedback: state.feedback, setMultTableFeedback: set('feedback'), setExploreScore: set('exploreScore'), exploreScore: state.exploreScore || { correct: 0, total: 0 }, setMultTableRevealed: set('revealed'), setMultTableHover: set('hover'), setMultTableHidden: set('hidden') };
    });
    await click('Check');
    expect(app.state().feedback.correct).toBe(true);
    if (pauseAfter) await app.patch(s => ({ ...s, _multTimer: { ...s._multTimer, paused: true } }));
    await React.act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    if (active && !pauseAfter) expect(advanced).toHaveBeenCalled();
    else {
      expect(advanced).not.toHaveBeenCalled();
      expect(app.state().challenge).toMatchObject({ a: 7, b: 8 });
      await click('Next question');
      expect(advanced).toHaveBeenCalledOnce();
    }
  });
});

describe('aligned ratio scaffolds', () => {
  it('aligns known and unknown values without showing the ticket-price answer', () => {
    loadTool('stem_lab/stem_tool_ratios.js', 'ratioLab');
    document.body.innerHTML = renderTool('ratioLab', { _ratioLab: { mode: 'numberLine' } });
    const line = document.querySelector('[data-linked-ratio-line="line-tickets"]');
    expect(line).toBeTruthy();
    expect(line.textContent).not.toContain('24');
    const texts = [...line.querySelectorAll('text')];
    const x = text => Number(texts.find(n => n.textContent === text).getAttribute('x'));
    expect(x('5')).toBe(x('15'));
    expect(x('8')).toBe(x('?'));
    expect((x('8') - 35) / (x('5') - 35)).toBeCloseTo(8 / 5);
  });
});
