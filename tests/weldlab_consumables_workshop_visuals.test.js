import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const state = extra => ({ view: 'consumables', cons_sect: 'cost', tech2_cons_proc: 'gmaw_spray', tech2_cons_leg: 0.3125, tech2_cons_rate: 60, ...extra });
let root, host;
beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: state(extra) }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}) {
  let latest;
  const updates = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: state(extra) });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => { updates.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  updates.length = 0;
  return { state: () => latest, updates };
}
const lens = (node = host) => node.querySelector('[data-cons-rate-lens]');
const model = (proc, leg, rate) => window.__WeldLabCore.tech2.costPerFoot(proc, leg, rate);
async function change(selector, value) {
  const input = host.querySelector(selector); expect(input).toBeTruthy();
  await React.act(() => Simulate.change(input, { target: { value: String(value) } }));
}
async function click(button) {
  const element = typeof button === 'string' ? host.querySelector(button) : button; expect(element).toBeTruthy();
  await React.act(() => element.click());
}
function check(node, current, peer, leg, rate, metric = 'total') {
  const results = { calculator: model(current, leg, rate), comparison: model(peer, leg, rate) };
  expect(lens(node).dataset.consRateLens).toBe(metric);
  expect(Number(lens(node).dataset.probeRate)).toBe(rate);
  for (const id of ['calculator', 'comparison']) {
    const expected = results[id], card = node.querySelector('[data-cons-rate-reading="' + id + '"]');
    expect(card.dataset.process).toBe(id === 'calculator' ? current : peer);
    expect(Number(card.dataset.rate)).toBe(rate);
    for (const key of ['filler', 'labor', 'total']) expect(Number(card.dataset[key])).toBeCloseTo(expected[key], 10);
    expect(Number(node.querySelector('[data-cons-rate-paid-minutes="' + id + '"]').dataset.minutes)).toBeCloseTo(expected.arcMinPerFt / expected.of, 10);
    expect(Number(node.querySelector('[data-cons-rate-mark="' + id + '"]').dataset.value)).toBeCloseTo(expected[metric], 10);
  }
  expect(Number(node.querySelector('[data-cons-rate-delta]').dataset.difference)).toBeCloseTo(results.comparison[metric] - results.calculator[metric], 10);
}

describe('Consumables labour-rate comparison workshop', () => {
  it('uses the existing representative model at the calculator rate and states what the comparison includes', () => {
    const node = render();
    check(node, 'gmaw_spray', 'fcaw', 0.3125, 60);
    expect(lens(node).textContent).toContain('representative midpoint inputs');
    expect(lens(node).textContent).toContain('calculator above stays at $60/hr');
    expect(lens(node).textContent).toContain('Gas, flux, power and equipment are excluded');
    expect(node.querySelectorAll('[data-cons-rate-curve]')).toHaveLength(2);
    expect(node.querySelector('[data-cons-rate-plot]').getAttribute('aria-label')).toContain('same fillet size and linear cost scale');
  });

  it('reveals the model’s actual labour-rate reversal and isolates filler versus labour contributions', async () => {
    await mount();
    for (const rate of [20, 60, 100, 104, 105, 150]) {
      await change('[data-cons-rate-probe]', rate);
      check(host, 'gmaw_spray', 'fcaw', 0.3125, rate);
      const delta = Number(host.querySelector('[data-cons-rate-delta]').dataset.difference);
      expect(Math.sign(delta)).toBe(rate <= 100 ? 1 : -1);
    }
    expect(host.querySelector('[data-cons-rate-delta]').textContent).toContain('−$');
    await click('[data-cons-rate-metric="filler"]');
    check(host, 'gmaw_spray', 'fcaw', 0.3125, 150, 'filler');
    expect(Number(host.querySelector('[data-cons-rate-delta]').dataset.difference)).toBeGreaterThan(0);
    await click('[data-cons-rate-metric="labor"]');
    check(host, 'gmaw_spray', 'fcaw', 0.3125, 150, 'labor');
    expect(Number(host.querySelector('[data-cons-rate-delta]').dataset.difference)).toBeLessThan(0);
  });

  it('keeps new probe, comparison and component controls local without touching saved calculator or scenario work', async () => {
    const saved = { tech2_cons_code: 'E7018-H4R', cons_sc_idx: 5, cons_sc_picked: 1, cons_sc_score: 3 };
    const app = await mount(saved), before = JSON.parse(JSON.stringify(app.state()));
    await change('[data-cons-rate-probe]', 120);
    await change('[data-cons-rate-peer]', 'smaw');
    await click('[data-cons-rate-metric="filler"]');
    check(host, 'gmaw_spray', 'smaw', 0.3125, 120, 'filler');
    expect(app.state()).toEqual(before);
    expect(app.updates).toEqual([]);
    await click('[data-cons-rate-follow]');
    check(host, 'gmaw_spray', 'smaw', 0.3125, 60, 'filler');
    expect(app.updates).toEqual([]);
  });

  it('recalculates after original process, fillet-size and labour controls while preserving a deliberate local probe', async () => {
    const app = await mount();
    await change('input[aria-label="Labour + overhead"]', 80);
    check(host, 'gmaw_spray', 'fcaw', 0.3125, 80);
    await change('[data-cons-rate-probe]', 100);
    await change('input[aria-label="Labour + overhead"]', 90);
    check(host, 'gmaw_spray', 'fcaw', 0.3125, 100);
    expect(lens().dataset.calculatorRate).toBe('90');
    await change('input[aria-label="Fillet leg size"]', 0.5);
    check(host, 'gmaw_spray', 'fcaw', 0.5, 100);
    await click(host.querySelector('[role="radiogroup"][aria-label="Process"]').querySelectorAll('button')[4]);
    expect(app.state().tech2_cons_proc).toBe('gtaw');
    check(host, 'gtaw', 'fcaw', 0.5, 100);
    await click('[data-cons-rate-follow]');
    check(host, 'gtaw', 'fcaw', 0.5, 90);
  });

  it('plots every sample and marker on one common dollar-per-foot scale for each component', async () => {
    await mount();
    for (const metric of ['total', 'filler', 'labor']) {
      await click('[data-cons-rate-metric="' + metric + '"]');
      const high = Math.max(0.01, model('gmaw_spray', 0.3125, 150)[metric], model('fcaw', 0.3125, 150)[metric]);
      for (const [id, proc] of [['calculator', 'gmaw_spray'], ['comparison', 'fcaw']]) {
        const curve = host.querySelector('[data-cons-rate-curve="' + id + '"]');
        const values = curve.dataset.values.split(',').map(Number);
        const points = curve.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
        expect(points).toHaveLength(27);
        values.forEach((value, i) => {
          const rate = 20 + i * 5, expected = model(proc, 0.3125, rate)[metric];
          expect(value).toBeCloseTo(expected, 10);
          expect(points[i][0]).toBeCloseTo(12 + (rate - 20) / 130 * 616, 9);
          expect(points[i][1]).toBeCloseTo(184 - expected / high * 164, 9);
        });
        if (metric === 'filler') expect(new Set(values).size).toBe(1);
      }
    }
  });

  it('handles all six processes, identical-process comparisons and native probe bounds', async () => {
    const app = await mount();
    for (const row of window.__WeldLabCore.tech2.CONS_PROC) {
      await change('[data-cons-rate-peer]', row.id);
      check(host, 'gmaw_spray', row.id, 0.3125, 60);
    }
    await change('[data-cons-rate-peer]', 'gmaw_spray');
    expect(host.querySelector('[data-cons-rate-delta]').dataset.difference).toBe('0');
    expect(host.querySelector('[data-cons-rate-curve="calculator"]').getAttribute('points')).toBe(host.querySelector('[data-cons-rate-curve="comparison"]').getAttribute('points'));
    await change('[data-cons-rate-probe]', 999); check(host, 'gmaw_spray', 'gmaw_spray', 0.3125, 150);
    await change('[data-cons-rate-probe]', -50); check(host, 'gmaw_spray', 'gmaw_spray', 0.3125, 20);
    await change('[data-cons-rate-probe]', 'not a number'); check(host, 'gmaw_spray', 'gmaw_spray', 0.3125, 20);
    expect(app.updates).toEqual([]);
  });

  it('keeps quiz answers and feedback behind the existing commit and excludes the lens from scenario and decoder views', async () => {
    expect(render({ cons_sect: 'decoder' }).querySelector('[data-cons-rate-lens]')).toBeNull();
    const app = await mount({ cons_mode: 'scenarios', cons_sc_idx: 0, cons_sc_picked: null, cons_sc_score: 0 });
    expect(host.querySelector('[data-cons-rate-lens]')).toBeNull();
    const options = host.querySelector('[aria-label="Consumable options"]').querySelectorAll('button');
    expect([...options].every(button => !button.disabled)).toBe(true);
    expect(host.textContent).not.toContain('E6010 (high-cellulose sodium coating) is THE pipeline root electrode');
    await click(options[3]);
    expect(app.state().cons_sc_score).toBe(1);
    expect(app.state().cons_sc_picked).toBe(3);
    expect(host.textContent).toContain('E6010 (high-cellulose sodium coating) is THE pipeline root electrode');
    await click(options[0]);
    expect(app.state().cons_sc_score).toBe(1);
    expect(app.state().cons_sc_picked).toBe(3);
    expect(host.querySelector('[data-cons-rate-lens]')).toBeNull();
  });

  it('uses existing normalization for hostile saved calculator inputs without NaN or changed quiz credit', () => {
    const node = render({ tech2_cons_proc: '__proto__', tech2_cons_leg: 99, tech2_cons_rate: -99, cons_sc_score: 4 });
    check(node, 'gmaw_sc', 'fcaw', 0.5, 20);
    expect(lens(node).innerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
    expect(node.querySelectorAll('[data-cons-rate-peer] option')).toHaveLength(6);
  });

  it('keeps axis readings in HTML, supplies contrast surfaces and makes every new control native and 44px', () => {
    const node = render({}, true), pane = lens(node);
    expect(pane.style.background).toBe('rgb(0, 0, 0)');
    expect(pane.style.color).toBe('rgb(255, 255, 255)');
    const selected = pane.querySelector('[data-cons-rate-metric="total"]');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(selected.style.background).toBe('rgb(255, 255, 0)');
    expect(selected.style.color).toBe('rgb(0, 0, 0)');
    for (const control of pane.querySelectorAll('button, select, input')) expect(control.style.minHeight).toBe('44px');
    for (const card of pane.querySelectorAll('[data-cons-rate-reading]')) { expect(parseFloat(card.style.minWidth)).toBe(0); expect(card.querySelectorAll('[data-cons-rate-number]')).toHaveLength(3); }
    const plot = pane.querySelector('[data-cons-rate-plot]');
    expect(plot.querySelector('text, animate, animateTransform, image')).toBeNull();
    expect(pane.textContent).toContain('Labour + overhead rate ($/hr)');
    expect(plot.style.width).toBe('100%');
  });
});
