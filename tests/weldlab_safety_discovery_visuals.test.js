import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const INITIAL = [{ db: 100, h: 1 }, { db: 85, h: 6 }];
const state = extra => ({ view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'noise', ...extra });
let root, host;
beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});
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
      update: (tool, key, value) => { updates.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  updates.length = 0;
  return { state: () => latest, updates };
}
const journey = (node = host) => node.querySelector('[data-noise-journey]');
const dose = (rows, std) => window.__WeldLabCore.safe2NoiseDose(rows, std);
async function change(selector, value) {
  const input = host.querySelector(selector); expect(input).toBeTruthy();
  await React.act(() => Simulate.change(input, { target: { value: String(value) } }));
}
async function click(selector) {
  const button = typeof selector === 'string' ? host.querySelector(selector) : selector; expect(button).toBeTruthy();
  await React.act(() => button.click());
}
function atProbe(rows, elapsed) {
  let start = 0;
  return rows.map(row => { const h = Math.max(0, Math.min(row.h, elapsed - start)); start += row.h; return { db: row.db, h }; });
}
function checkDose(node, rows, elapsed, selected = 0) {
  const reading = node.querySelector('[data-noise-cumulative]');
  const partialRows = atProbe(rows, elapsed);
  for (const std of ['osha', 'niosh']) {
    const full = dose(rows, std), accrued = dose(partialRows, std);
    expect(Number(reading.dataset[std + 'Dose'])).toBeCloseTo(accrued.dose, 8);
    expect(Number(node.querySelector('[data-noise-current-dose="' + std + '"]').dataset.dose)).toBeCloseTo(accrued.dose, 8);
    const card = node.querySelector('[data-noise-contribution="' + std + '"]');
    expect(Number(card.dataset.task)).toBe(selected);
    expect(Number(card.dataset.fullDose)).toBeCloseTo(full.parts[selected].frac * 100, 8);
    expect(Number(card.dataset.accruedDose)).toBeCloseTo(dose([partialRows[selected]], std).dose, 8);
    expect(Number(card.dataset.elapsed)).toBeCloseTo(partialRows[selected].h, 9);
    expect(Number(card.querySelector('[data-noise-allowed]').dataset.hours)).toBeCloseTo(full.parts[selected].T, 9);
  }
}

describe('Safety Health manual noise sequence discovery', () => {
  it('derives initial cumulative curves and full-task contributions from the unchanged dose model', () => {
    const node = render();
    expect(journey(node).dataset.noiseHours).toBe('7');
    expect(journey(node).dataset.noiseElapsed).toBe('7');
    expect(node.querySelectorAll('[data-noise-task]')).toHaveLength(2);
    expect(node.querySelector('[data-noise-timeline]').getAttribute('aria-label')).toContain('same linear scale');
    expect(journey(node).textContent).toContain('illustrative sequence');
    expect(journey(node).textContent).toContain('does not change task durations');
    checkDose(node, INITIAL, 7);
    expect(Number(node.querySelector('[data-noise-cumulative]').dataset.oshaDose)).toBe(87.5);
    expect(Number(node.querySelector('[data-noise-cumulative]').dataset.nioshDose)).toBe(475);
  });

  it('probes partial tasks and exact row boundaries without changing saved rows, answers or scores', async () => {
    const saved = { safe2_noise: INITIAL, sh_audit: { lev: 'no', screens: 'yes' }, safe2_hoc: { eng1: 2, ppe2: 4 }, sh_best: 61 };
    const app = await mount(saved);
    for (const elapsed of [0, 0.5, 1, 4, 7]) {
      await change('[data-noise-probe]', elapsed);
      expect(Number(journey().dataset.noiseElapsed)).toBe(elapsed);
      checkDose(host, INITIAL, elapsed);
    }
    expect(app.updates).toEqual([]);
    for (const [key, value] of Object.entries(saved)) expect(app.state()[key]).toEqual(value);
    await click('[data-noise-probe-start]'); checkDose(host, INITIAL, 0);
    await click('[data-noise-probe-end]'); checkDose(host, INITIAL, 7);
  });

  it('selects a task at its actual endpoint and keeps selection while moving back before that task', async () => {
    const app = await mount();
    await click('[data-noise-task="1"]');
    expect(journey().dataset.noiseSelected).toBe('1');
    expect(host.querySelector('[data-noise-task="1"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-noise-task="0"]').getAttribute('aria-pressed')).toBe('false');
    checkDose(host, INITIAL, 7, 1);
    await change('[data-noise-probe]', 0.5);
    checkDose(host, INITIAL, 0.5, 1);
    expect(host.querySelector('[data-noise-contribution="osha"]').dataset.accruedDose).toBe('0');
    await click('[data-noise-task="0"]');
    checkDose(host, INITIAL, 1, 0);
    expect(app.updates).toEqual([]);
  });

  it('recalculates after existing duration and preset controls, including end-following and probe clamping', async () => {
    const app = await mount({ safe2_noise: INITIAL });
    await change('input[aria-label="Task 1: hours per day"]', 2);
    const longer = [{ db: 100, h: 2 }, { db: 85, h: 6 }];
    expect(app.state().safe2_noise).toEqual(longer);
    checkDose(host, longer, 8);
    await change('select', 'gouge');
    const louder = [{ db: 110, h: 2 }, { db: 85, h: 6 }];
    checkDose(host, louder, 8);
    await change('[data-noise-probe]', 7);
    await change('input[aria-label="Task 2: hours per day"]', 0.25);
    const shorter = [{ db: 110, h: 2 }, { db: 85, h: 0.25 }];
    expect(Number(journey().dataset.noiseElapsed)).toBe(2.25);
    checkDose(host, shorter, 2.25);
  });

  it('handles all six tasks and preserves original add/remove/reset behavior', async () => {
    const rows = [{ db: 80, h: 0.25 }, { db: 88, h: 1 }, { db: 100, h: 2 }, { db: 102, h: 3 }, { db: 108, h: 4 }, { db: 110, h: 5 }];
    const app = await mount({ safe2_noise: rows });
    expect(host.querySelectorAll('[data-noise-duration-block]')).toHaveLength(6);
    for (let selected = 0, elapsed = 0; selected < rows.length; selected++) {
      elapsed += rows[selected].h;
      await click('[data-noise-task="' + selected + '"]');
      checkDose(host, rows, elapsed, selected);
    }
    await click('button[aria-label="Remove task 6"]');
    expect(app.state().safe2_noise).toHaveLength(5);
    expect(journey().dataset.noiseSelected).toBe('4');
    checkDose(host, rows.slice(0, 5), 10.25, 4);
    await click([...host.querySelectorAll('button')].find(button => button.textContent === '+ Add a task'));
    expect(app.state().safe2_noise.at(-1)).toEqual({ db: 88, h: 1 });
    await click([...host.querySelectorAll('button')].find(button => button.textContent === '↺ Reset'));
    expect(app.state().safe2_noise).toEqual(INITIAL);
    await click('[data-noise-probe-end]');
    checkDose(host, INITIAL, 7, 1);
  });

  it('uses the model counting floor and valid zero-dose plots without invented exposure credit', async () => {
    const rows = [{ db: 75, h: 12 }, { db: 79, h: 0.25 }];
    await mount({ safe2_noise: rows });
    checkDose(host, rows, 12.25);
    expect(host.querySelector('[data-noise-allowed="osha"]').textContent).toContain('Not counted by this model');
    expect(host.querySelector('[data-noise-cumulative]').dataset.oshaDose).toBe('0');
    expect(host.querySelector('[data-noise-cumulative]').dataset.nioshDose).toBe('0');
    const curves = [...host.querySelectorAll('[data-noise-curve]')].map(line => line.getAttribute('points'));
    expect(curves[0]).toBe(curves[1]);
    expect(journey().innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('normalizes empty and hostile saved rows through existing calculator rules', () => {
    for (const rows of [[], 'bad', {}]) {
      const node = render({ safe2_noise: rows });
      expect(journey(node).textContent).toContain('Add a task');
      expect(node.querySelector('[data-noise-probe]')).toBeNull();
      expect(journey(node).innerHTML).not.toMatch(/NaN|Infinity/);
    }
    // usePersistedState already treats null as an absent value, so its defaults remain intact.
    checkDose(render({ safe2_noise: null }), INITIAL, 7);
    const rows = [{ db: 999, h: 99 }, { db: 'bad', h: 'bad' }];
    const normalized = [{ db: 130, h: 12 }, { db: 85, h: 1 }];
    const node = render({ safe2_noise: rows });
    checkDose(node, normalized, 13);
    expect(journey(node).innerHTML).not.toMatch(/NaN|Infinity/);
    expect(journey(node).textContent).toContain('0.00024414 h');
  });

  it('keeps both curves on one scale while making selected-task and probe information readable outside SVG', () => {
    const rows = [{ db: 100, h: 2 }], node = render({ safe2_noise: rows });
    const points = std => node.querySelector('[data-noise-curve="' + std + '"]').getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
    const osha = points('osha'), niosh = points('niosh');
    expect(osha[0]).toEqual(niosh[0]);
    expect(osha.at(-1)[0]).toBe(niosh.at(-1)[0]);
    const ratio = (osha[0][1] - osha.at(-1)[1]) / (niosh[0][1] - niosh.at(-1)[1]);
    expect(ratio).toBeCloseTo(dose(rows, 'osha').dose / dose(rows, 'niosh').dose, 9);
    expect(node.querySelectorAll('[data-noise-dose-reading]')).toHaveLength(2);
    expect(node.querySelectorAll('[data-noise-contribution]')).toHaveLength(2);
    expect(node.querySelector('[data-noise-probe]').getAttribute('aria-valuetext')).toBe('2 h / 2 h');
    expect(node.querySelector('[data-noise-timeline]').querySelector('animate, animateTransform, image')).toBeNull();
  });

  it('supplies explicit contrast surfaces and native 44px controls, and stays out of audit/hierarchy topics', () => {
    const node = render({}, true), pane = journey(node);
    expect(pane.style.background).toBe('rgb(0, 0, 0)');
    expect(pane.style.color).toBe('rgb(255, 255, 255)');
    for (const button of pane.querySelectorAll('button')) { expect(button.tagName).toBe('BUTTON'); expect(button.style.minHeight).toBe('44px'); }
    const selected = pane.querySelector('[data-noise-task="0"]');
    expect(selected.style.background).toBe('rgb(255, 255, 0)');
    expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(pane.querySelector('[data-noise-probe]').style.minHeight).toBe('44px');
    const scroll = pane.querySelector('[data-noise-chart-scroll]');
    expect(scroll.getAttribute('role')).toBe('region');
    expect(scroll.tabIndex).toBe(0);
    expect(scroll.style.overflowX).toBe('auto');
    expect(scroll.style.maxWidth).toBe('100%');
    expect(scroll.querySelector('svg').style.minWidth).toBe('680px');
    expect(render({ sh_mode: 'audit' }).querySelector('[data-noise-journey]')).toBeNull();
    expect(render({ sh_sect: 'controls' }).querySelector('[data-noise-journey]')).toBeNull();
    expect(render({ sh_sect: 'electrical' }).querySelector('[data-noise-journey]')).toBeNull();
  });
});
