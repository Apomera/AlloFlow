import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { restorePostureStudy } from './helpers/weldlab_posture_restore.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const baseline = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-noise-exchange-baseline.json'), 'utf8'));
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const BASE = { view: 'safetyHealth', sh_mode: 'browse', sh_sect: 'noise' };
const INITIAL = [{ db: 100, h: 1 }, { db: 85, h: 6 }];
let host, root;
const bench = (node = host) => node.querySelector('[data-noise-exchange]');
const n = (node, attribute) => Number(node.getAttribute(attribute));
const dose = (rows, id) => window.__WeldLabCore.safe2NoiseDose(rows, id);
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest;
  const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
async function preset(step) { await click(bench().querySelector(`[data-noise-exchange-preset="${step}"]`)); }
const X = level => 92 + (level - 85) / 25 * 560;
const Y = hours => 284 - hours / 8 * 240;
function check(step, node = host) {
  const panel = bench(node), expectedTime = baseline.referenceHours[step];
  expect(n(panel, 'data-step')).toBe(step);
  for (const std of baseline.standards) {
    const level = std.criterion + step * std.exchange, expected = dose([{ db: level, h: 1 }], std.id).parts[0].T;
    expect(expected).toBe(expectedTime);
    expect(dose([{ db: level, h: expected }], std.id).dose).toBe(100);
    const marker = panel.querySelector(`[data-noise-exchange-marker="${std.id}"]`), x = X(level), y = Y(expected);
    expect(n(marker, 'data-level')).toBe(level); expect(n(marker, 'data-hours')).toBe(expected);
    if (std.id === 'osha') {
      expect(marker.tagName).toBe('circle'); expect(n(marker, 'cx')).toBe(x); expect(n(marker, 'cy')).toBe(y);
    } else {
      expect(marker.tagName).toBe('polygon'); expect(n(marker, 'data-center-x')).toBe(x); expect(n(marker, 'data-center-y')).toBe(y);
      const vertices = marker.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
      expect(vertices).toEqual([[x, y - 9], [x + 9, y], [x, y + 9], [x - 9, y]]);
    }
    const bar = panel.querySelector(`[data-noise-exchange-timebar="${std.id}"]`), track = panel.querySelector(`[data-noise-exchange-time-track="${std.id}"]`);
    expect(n(bar, 'x')).toBe(140); expect(n(track, 'x')).toBe(140); expect(n(track, 'width')).toBe(512);
    expect(n(bar, 'width')).toBe(expected * 64); expect(n(bar, 'data-hours')).toBe(expected);
    expect(n(bar, 'height')).toBe(n(track, 'height'));
    const reading = panel.querySelector(`[data-noise-exchange-reading="${std.id}"]`);
    expect(n(reading, 'data-level')).toBe(level); expect(n(reading, 'data-hours')).toBe(expected); expect(n(reading, 'data-reference-hours')).toBe(8);
    expect(reading.textContent).toContain(`${level} dBA · ${expected} h`);
    expect(reading.textContent).toContain(`${std.criterion} dBA + ${step} × ${std.exchange} dB = ${level} dBA`);
    expect(reading.querySelector('[data-noise-exchange-equation]').textContent).toBe(`T = 8 ÷ 2^((${level} − ${std.criterion}) ÷ ${std.exchange}) = ${expected} h`);
    expect(reading.querySelector('[data-noise-exchange-ratio]').textContent).toBe(`T ÷ T₀ = ${expected} ÷ 8 = 1 ÷ 2^${step} = ${expected / 8}`);
  }
  const guide = panel.querySelector('[data-noise-exchange-equal-guide]');
  expect(n(guide, 'x1')).toBe(X(85 + step * 3)); expect(n(guide, 'x2')).toBe(X(90 + step * 5));
  expect(n(guide, 'y1')).toBe(Y(expectedTime)); expect(n(guide, 'y2')).toBe(Y(expectedTime));
  expect(panel.querySelector('[data-noise-exchange-timebar="osha"]').getAttribute('width')).toBe(panel.querySelector('[data-noise-exchange-timebar="niosh"]').getAttribute('width'));
}
function fixedGeometry() {
  return [...bench().querySelectorAll('[data-noise-exchange-curve],[data-noise-exchange-axes],[data-noise-exchange-time-tick],[data-noise-exchange-level-tick],[data-noise-exchange-bar-tick],[data-noise-exchange-time-track]')].map(node => node.outerHTML);
}
function checkTaskDose(rows, elapsed = rows.reduce((sum, row) => sum + row.h, 0)) {
  let time = 0;
  const partial = rows.map(row => { const h = Math.max(0, Math.min(row.h, elapsed - time)); time += row.h; return { db: row.db, h }; });
  for (const id of ['osha', 'niosh']) {
    expect(n(host.querySelector(`[data-noise-current-dose="${id}"]`), 'data-dose')).toBeCloseTo(dose(partial, id).dose, 10);
    expect(n(host.querySelector('[data-noise-cumulative]'), `data-${id}-dose`)).toBeCloseTo(dose(partial, id).dose, 10);
  }
}

describe('Noise exchange-rate reference', () => {
  it('draws all five actual3-dB/5-dB exchange pairs and equal durations from the unchanged core model', async () => {
    await mount();
    const widths = [], levels = { osha: [], niosh: [] };
    for (let step = 0; step <= 4; step++) {
      await preset(step); check(step);
      expect(bench().querySelector(`[data-noise-exchange-preset="${step}"]`).getAttribute('aria-pressed')).toBe('true');
      expect(bench().querySelectorAll('[data-noise-exchange-preset][aria-pressed="true"]')).toHaveLength(1);
      widths.push(n(bench().querySelector('[data-noise-exchange-timebar="osha"]'), 'width'));
      for (const id of ['osha', 'niosh']) levels[id].push(n(bench().querySelector(`[data-noise-exchange-marker="${id}"]`), 'data-level'));
    }
    expect(widths).toEqual([512, 256, 128, 64, 32]);
    for (let step = 1; step <= 4; step++) { expect(widths[step] / widths[step - 1]).toBe(0.5); expect(levels.osha[step] - levels.osha[step - 1]).toBe(5); expect(levels.niosh[step] - levels.niosh[step - 1]).toBe(3); }
  });

  it('keeps both81-point exponential curves and shared linear axes fixed under every selected step', async () => {
    await mount(); const fixed = fixedGeometry();
    for (const std of baseline.standards) {
      const curve = bench().querySelector(`[data-noise-exchange-curve="${std.id}"]`), points = curve.getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
      expect(points).toHaveLength(81);
      points.forEach(([x, y], i) => { const level = std.criterion + i / 80 * 4 * std.exchange, T = 8 / 2 ** ((level - std.criterion) / std.exchange); expect(x).toBeCloseTo(X(level), 10); expect(y).toBeCloseTo(Y(T), 10); if (i) { expect(x).toBeGreaterThan(points[i - 1][0]); expect(y).toBeGreaterThan(points[i - 1][1]); } });
      expect(curve.getAttribute('stroke-dasharray')).toBe(std.id === 'niosh' ? '9 4' : null);
    }
    for (let step = 0; step <= 4; step++) { await preset(step); expect(fixedGeometry()).toEqual(fixed); expect(bench().querySelector('svg').getAttribute('viewBox')).toBe('0 0 720 526'); }
    expect([...bench().querySelectorAll('[data-noise-exchange-time-tick]')].map(node => node.dataset.noiseExchangeTimeTick)).toEqual(['0', '2', '4', '6', '8']);
    expect([...bench().querySelectorAll('[data-noise-exchange-level-tick]')].map(node => node.dataset.noiseExchangeLevelTick)).toEqual(['85', '90', '95', '100', '105', '110']);
    expect(bench().querySelector('[data-noise-exchange-axes]').getAttribute('d')).toBe('M92 44 V284 H652');
  });

  it('normalizes manual step events locally, ignores pseudo saved explorer fields and preserves exact endpoint geometry', async () => {
    const app = await mount({ safe9_step: 4, safe9_level: 200 }); check(0);
    const input = bench().querySelector('[data-noise-exchange-step]');
    for (const bad of ['', ' ', null, undefined, {}, [], 'bad', 'Infinity', 'NaN']) { await change(input, bad); check(0); }
    for (const [value, expected] of [[1, 1], [2, 2], [3, 3], [4, 4], [-100, 0], [999, 4], [1.6, 2]]) { await change(input, String(value)); check(expected); }
    expect(app.writes).toHaveLength(0); expect(app.latest()).toMatchObject({ safe9_step: 4, safe9_level: 200 });
  });

  it('leaves saved tasks, cumulative dose, audit, hierarchy and other safety selections byte-identical during exploration', async () => {
    const saved = { safe2_noise: INITIAL, sh_audit: { lev: 'no', screens: 'yes' }, safe2_hoc: { eng1: 0, ppe2: 4 }, sh_shop_station: 'eyes', safe2_gas: 'helium', safe2_level: 'top', sh_best: 61, ps_view: 'gear' };
    const app = await mount(saved), original = JSON.stringify(app.latest());
    const oldJourney = host.querySelector('[data-noise-journey]').outerHTML;
    for (let step = 0; step <= 4; step++) { await preset(step); checkTaskDose(INITIAL); expect(host.querySelector('[data-noise-journey]').outerHTML).toBe(oldJourney); }
    expect(JSON.stringify(app.latest())).toBe(original); expect(app.writes).toHaveLength(0);
    expect(dose(INITIAL, 'osha').dose).toBe(87.5); expect(dose(INITIAL, 'niosh').dose).toBe(475);
  });

  it('preserves actual task edits, partial-dose probes and existing add/remove/reset controls without changing the local exchange point', async () => {
    const app = await mount({ safe2_noise: INITIAL }); await preset(3);
    await change(host.querySelector('input[aria-label="Task 1: hours per day"]'), '2');
    let rows = [{ db: 100, h: 2 }, { db: 85, h: 6 }]; expect(app.latest().safe2_noise).toEqual(rows); checkTaskDose(rows); check(3);
    await change(host.querySelector('input[aria-label="Task 1: sound level"]'), '95'); rows = [{ db: 95, h: 2 }, { db: 85, h: 6 }]; checkTaskDose(rows); check(3);
    await change(host.querySelector('[data-noise-probe]'), '1'); checkTaskDose(rows, 1); check(3);
    await click(button('+ Add a task')); rows.push({ db: 88, h: 1 }); expect(app.latest().safe2_noise).toEqual(rows); check(3);
    await click(host.querySelector('button[aria-label="Remove task 3"]')); expect(app.latest().safe2_noise).toEqual(rows.slice(0, 2));
    await click(button('↺ Reset')); expect(app.latest().safe2_noise).toEqual(INITIAL); await click(host.querySelector('[data-noise-probe-end]')); checkTaskDose(INITIAL); check(3);
    expect(app.writes.every(([key]) => key === 'safe2_noise')).toBe(true);
  });

  it('renders only in noise browse and retains the local step through real section/mode navigation', async () => {
    for (const sh_sect of ['overview', 'fume', 'eyes', 'burns', 'ergonomics', 'electrical', 'controls', 'mental', 'bad']) expect(bench(render({ sh_sect }))).toBeNull();
    expect(bench(render({ sh_mode: 'audit' }))).toBeNull();
    const app = await mount(); await preset(4);
    await click(button('⚕️ Overview')); expect(bench()).toBeNull();
    await click(button('🔊 Noise + hearing')); check(4);
    await click(button('🛡 How safe is your shop?')); expect(bench()).toBeNull();
    await click(button('⚕️ Browse topics')); check(4);
    expect(app.writes.every(([key]) => ['sh_sect', 'sh_mode'].includes(key))).toBe(true);
  });

  it('preserves real audit fix visibility, completion score and reset after exploring all exchange steps', async () => {
    const app = await mount({ sh_audit: {} }); await preset(4); await click(button('🛡 How safe is your shop?'));
    expect(bench()).toBeNull(); expect(host.textContent).not.toContain('📊 Your shop score:');
    const fix = 'Fix: put a fume extractor or downdraft table at each station';
    expect(host.textContent).not.toContain(fix);
    await click(host.querySelector('[data-audit-answer="lev:no"]')); expect(host.textContent).toContain(fix); expect(app.latest().sh_audit).toEqual({ lev: 'no' });
    await click(host.querySelector('[data-audit-answer="lev:yes"]')); expect(host.textContent).not.toContain(fix);
    const items = [...host.querySelectorAll('[data-shop-checklist-item]')].map(node => node.dataset.shopChecklistItem); expect(items).toHaveLength(18);
    for (let i = 1; i < items.length; i++) { if (i < items.length - 1) expect(host.textContent).not.toContain('📊 Your shop score:'); await click(host.querySelector(`[data-audit-answer="${items[i]}:yes"]`)); }
    expect(host.textContent).toContain('📊 Your shop score: 100%'); expect(Object.keys(app.latest().sh_audit)).toHaveLength(18);
    await click(button('↺ Reset audit')); expect(app.latest().sh_audit).toEqual({}); expect(host.textContent).not.toContain('📊 Your shop score:');
    await click(button('⚕️ Browse topics')); check(4); expect(app.writes.every(([key]) => ['sh_mode', 'sh_audit'].includes(key))).toBe(true);
  });

  it('preserves the actual hierarchy first-check feedback gate, edits, score and reset', async () => {
    const app = await mount({ safe2_hoc: { eng1: 0, ppe2: 4 } }); await preset(2); await click(button('🧱 Hierarchy of controls'));
    const feedback = 'Engineering: the equipment pulls fume away without relying on anyone remembering a rule.';
    expect(bench()).toBeNull(); expect(host.textContent).not.toContain(feedback);
    await click(button('Check my sort')); expect(host.textContent).toContain('1 of 10 placed correctly'); expect(host.textContent).toContain('You chose Elimination. ' + feedback);
    await change(host.querySelector('#safe2-hoc-eng1'), '2'); expect(host.textContent).not.toContain(feedback); expect(app.latest().safe2_hoc).toEqual({ eng1: 2, ppe2: 4 });
    await click(button('Check my sort')); expect(host.textContent).toContain('2 of 10 placed correctly'); expect(host.textContent).toContain('✓ ' + feedback);
    await click(button('↺ Reset')); expect(app.latest().safe2_hoc).toEqual({}); expect(host.textContent).not.toContain(feedback);
    await click(button('🔊 Noise + hearing')); check(2); expect(app.writes.every(([key]) => ['sh_sect', 'safe2_hoc'].includes(key))).toBe(true);
  });

  it('states model-specific100%-dose references and primary sources without treating either as a hearing-safety guarantee', () => {
    const panel = bench(render()), scope = panel.querySelector('[data-noise-exchange-scope]').textContent;
    for (const text of ['100% dose for a constant sound level', 'general-industry PEL criterion, 90 dBA for 8 hours', 'NIOSH recommends 85 dBA for 8 hours', 'not a guarantee against hearing damage or permission to work without controls']) expect(scope).toContain(text);
    const sources = { osha: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.95AppA', niosh: 'https://www.cdc.gov/niosh/noise/prevent/understand.html' };
    for (const [id, url] of Object.entries(sources)) { const link = panel.querySelector(`[data-noise-exchange-source="${id}"]`); expect(link.href).toBe(url); expect(link.target).toBe('_blank'); expect(link.rel).toContain('noopener'); }
  });

  it.each([false, true])('uses native44px controls,32px short labels, full HTML units and explicit focus/contrast without motion (contrast=%s)', contrast => {
    const panel = bench(render({}, contrast)), input = panel.querySelector('input'), edge = contrast ? '#ffff00' : '#075985';
    expect(panel.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(panel.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    expect(input.type).toBe('range'); expect(input.min).toBe('0'); expect(input.max).toBe('4'); expect(input.step).toBe('1'); expect(panel.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
    for (const control of panel.querySelectorAll('input,button,a')) expect(control.style.minHeight).toBe('44px');
    for (const button of panel.querySelectorAll('button')) { expect(button.type).toBe('button'); expect(button.getAttribute('aria-controls')).toBe('safe9-readings'); }
    const css = panel.querySelector('style').textContent; expect(css).toContain(`:focus-visible{outline:3px solid ${edge}!important;outline-offset:3px}`); expect(css).toContain('transition:none!important;animation:none!important');
    const svg = panel.querySelector('svg'); expect(svg.style.width).toBe('100%'); expect(svg.style.height).toBe('auto'); expect(svg.style.maxWidth).toBe('720px'); expect(svg.getAttribute('aria-label')).toContain('Complete equations follow.');
    for (const text of svg.querySelectorAll('text')) { expect(n(text, 'font-size')).toBe(32); expect(text.textContent.length).toBeLessThanOrEqual(3); }
    expect(panel.querySelectorAll('[data-noise-exchange-reading]')).toHaveLength(2); expect(panel.querySelector('#safe9-readings').getAttribute('aria-live')).toBe('polite');
    expect(panel.querySelector('animate,animateTransform,canvas')).toBeNull();
  });

  it('restores every old SafetyHealth model, passage, task, audit and HOC gate by removing only the additive hook/helper/call', () => {
    const source = stripWeldlabWcagFixes(readFileSync(resolve(SRC), 'utf8'));
    let region = source.slice(source.indexOf('function SafetyHealthDeepDive('), source.indexOf('function MathBlueprintLab('));
    region = restorePostureStudy(region);
    const hook = '        var noiseExchangeState = useState(0);\n', call = '            renderNoiseExchangeExplorer(),\n';
    expect(region.split(hook)).toHaveLength(2); region = region.replace(hook, '');
    const a = region.indexOf('        function renderNoiseExchangeExplorer() {'), b = region.indexOf('        function renderNoiseCalc() {', a);
    expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a); region = region.slice(0, a) + region.slice(b);
    expect(region.split(call)).toHaveLength(2); region = region.replace(call, '');
    expect(createHash('sha256').update(region).digest('hex')).toBe(baseline.safetyRegionSha256);
  });
});
