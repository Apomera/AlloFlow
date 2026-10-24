// Probability Lab: values on screen must come from the model and the runs shown.
//  - A 0-probability outcome set the "5 expected per outcome" gate to 0 trials
//    and added a degree of freedom: 10 rolls of a 1/20 : 19/20 : 0/20 model
//    printed "df=2 ... Fair ... Great sample size!".
//  - "Run 100 rooms" pooled different room sizes, then compared the pooled rate
//    with the current n's theory.
//  - The pi panel claimed ~10k points give 2 decimal places; the estimator's
//    SE at 10k is 0.016, and SE 0.005 needs ~108k.
//  - Slow-dropped darts never reached totalTrials / experimentsUsed (quests).
//  - Monty "Reset stats" kept the recent-play strips.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MATH_REVIEW_PROBABILITY_SRC || 'stem_lab/stem_tool_probability.js';
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const mounted = [];
beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'probability');
});
afterEach(async () => {
  while (mounted.length) {
    const { root, container } = mounted.pop();
    await React.act(async () => root.unmount());
    container.remove();
  }
});

async function mount(initial) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const cfg = window.StemLab._registry.probability;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const box = { state: { probability: initial } };
  function Host() {
    const [toolData, setToolData] = React.useState({ probability: initial });
    box.state = toolData;
    return cfg.render(makeCtx({ toolData, setToolData }));
  }
  const root = ReactDOMClient.createRoot(container);
  await React.act(async () => { root.render(React.createElement(Host)); });
  mounted.push({ root, container });
  return { container, get p() { return box.state.probability || {}; } };
}
const click = (el) => React.act(async () => { el.click(); });
const wait = (ms) => React.act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const statsPanel = (html) => { const s = text(html); const i = s.indexOf('Statistical Analysis'); return i >= 0 ? s.slice(i, i + 420) : ''; };

describe('chi-squared fairness test', () => {
  const model = [
    { label: 'A', numerator: 1, denominator: 20, color: '#ef4444' },
    { label: 'B', numerator: 19, denominator: 20, color: '#3b82f6' },
    { label: 'C', numerator: 0, denominator: 20, color: '#22c55e' },
  ];
  const render = (outs, results) => statsPanel(renderTool('probability', { probability: { mode: 'custom', customSubMode: 'fraction', customOutcomes: outs, results, trials: results.length } }));

  it('an impossible outcome neither waives the 5-expected gate nor adds a df', () => {
    const s = render(model, Array(10).fill('B'));
    expect(s.includes('Fair') && s.includes('✅'), s).toBe(false);
    expect(s.includes('df=1'), s).toBe(true);
    expect(s.includes('100 trials'), s).toBe(true);
  });

  it('the same model at 100 trials is judged with df = 1', () => {
    const s = render(model, Array(5).fill('A').concat(Array(95).fill('B')));
    expect(s.includes('df=1'), s).toBe(true);
    expect(s.includes('✅ Fair'), s).toBe(true);
  });

  it('a model with a single possible outcome gets no verdict (df = 0)', () => {
    const one = [
      { label: 'A', numerator: 20, denominator: 20, color: '#ef4444' },
      { label: 'B', numerator: 0, denominator: 20, color: '#3b82f6' },
    ];
    const s = render(one, Array(10).fill('A'));
    expect(s.includes('✅ Fair') || s.includes('❌ Biased'), s).toBe(false);
  });
});

describe('birthday room batches', () => {
  it('a batch is only reported for the room size it was run at', async () => {
    const m = await mount({ mode: 'birthday', birthdayN: 10, results: [], trials: 0 });
    const run = () => m.container.querySelector('button[aria-label="Run 100 simulations of this room size"]');
    await wait(5);
    await click(run());
    expect(m.p.birthdayBatch.runs).toBe(100);
    await click(m.container.querySelector('button[aria-label="Set group size to 57 people"]'));
    await wait(5);
    // The n = 10 tally must not be shown against the n = 57 theory line.
    const shown = text(m.container.innerHTML);
    expect(/rooms had a match/.test(shown), 'stale batch shown after the room size changed').toBe(false);
    await click(run());
    expect(m.p.birthdayBatch.runs).toBe(100);
    expect(m.p.birthdayBatch.n).toBe(57);
    const s = text(m.container.innerHTML);
    expect(/\/\s*100 rooms had a match/.test(s), s.slice(s.indexOf('rooms had') - 40, s.indexOf('rooms had') + 30)).toBe(true);
  });
});

describe('Monte Carlo pi', () => {
  const pts = [{ x: 0.1, y: 0.2, inside: true }, { x: 0.9, y: 0.9, inside: false }];
  const piState = () => ({ mode: 'pi', results: ['inside', 'outside'], trials: 2, _piPoints: pts.slice(), _piTotal: 2, _piInside: 1, totalTrials: 2, experimentsUsed: {} });

  it('states the real cost of 2 decimal places', () => {
    const s = text(renderTool('probability', { probability: piState() }));
    expect(s.includes('~10k points needed'), 'old claim').toBe(false);
    expect(s.includes('~100,000 points for 2 decimal places'), 'corrected claim').toBe(true);
  });

  async function slowDrop(initial) {
    const m = await mount(initial);
    const before = (m.p.results || []).length;
    const startTotal = m.p.totalTrials || 0;
    await click(m.container.querySelector('button[aria-label="Slow-drop 100 points one at a time"]'));
    await wait(650);
    const stop = m.container.querySelector('button[aria-label="Stop slow-drop animation"]');
    if (stop) await click(stop);
    await wait(150);
    const added = m.p.results.length - before;
    return { added, totalAdded: (m.p.totalTrials || 0) - startTotal, used: m.p.experimentsUsed || {} };
  }

  it('slow-dropped darts count as trials (stats-panel button)', async () => {
    const r = await slowDrop(piState());
    expect(r.added > 0, 'darts landed').toBe(true);
    expect(r.totalAdded).toBe(r.added);
    expect(r.used.pi).toBe(true);
  });

  it('slow-dropped darts count as trials (empty-state button)', async () => {
    const r = await slowDrop({ mode: 'pi', results: [], trials: 0, totalTrials: 0, experimentsUsed: {} });
    expect(r.added > 0, 'darts landed').toBe(true);
    expect(r.totalAdded).toBe(r.added);
    expect(r.used.pi).toBe(true);
  });
});

describe('Monty Hall', () => {
  it('Reset stats also clears the recent-play strips', async () => {
    const m = await mount({
      mode: 'monty', results: [], trials: 0,
      monty: { stage: 'pick', prizeDoor: 0, picked: null, revealed: null, finalChoice: null, won: false },
      montyStats: { stayWins: 4, stayN: 4, switchWins: 0, switchN: 4 },
      montyStrip: { stay: [true, true, true, true], switch: [false, false, false, false] },
    });
    const reset = Array.from(m.container.querySelectorAll('button')).find((b) => /Reset stats/.test(b.textContent));
    await click(reset);
    expect(m.p.montyStats).toEqual({ switchWins: 0, switchN: 0, stayWins: 0, stayN: 0 });
    expect(m.p.montyStrip).toEqual({ stay: [], switch: [] });
  });
});
