import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'symbolsReader', sr_view: 'library' };
const SIZES = [0.1875, 0.25, 0.375];
const ORIGINAL_SYMBOLS_SHA256 = '823a39af23c40870b2f6a7565688789260daae91975e05fff605afa5db8ef8eb';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let host, root;
const panel = (node = host) => node.querySelector('[data-fillet-throat]');
const n = (node, attr) => Number(node.getAttribute(attr));
const xy = (node, x = 'cx', y = 'cy') => [n(node, x), n(node, y)];
const difference = (a, b) => a.map((value, i) => value - b[i]);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const magnitude = vector => Math.hypot(...vector);
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
const button = (text, scope = host) => [...scope.querySelectorAll('button')].find(node => node.textContent.trim() === text);
async function open() { if (!panel().open) await click(panel().querySelector('summary')); }
async function size(value) { await click(panel().querySelector(`[data-fillet-leg="${value}"]`)); }
async function probe(value) { await change(panel().querySelector('[data-fillet-face-probe]'), value); }
const tabs = { anatomy: '1. Anatomy of a Symbol', library: '2. Common Symbols', practice: '3. Decoder Practice', builder: '4. Symbol Builder', blueprint: '5. Mini Blueprint' };
async function tab(id) { await click(button(tabs[id])); }
const scoredGroup = index => [...host.querySelectorAll('[role="radiogroup"]')].filter(group => group.getAttribute('aria-label') !== 'Pick a symbol on the drawing')[index];
async function checkQuestion(group) { await click(button('Check answer', group.parentElement)); }

function checkGeometry(leg, percent) {
  const bench = panel(), scale = 640;
  expect(n(bench, 'data-leg')).toBe(leg); expect(n(bench, 'data-probe-percent')).toBe(percent); expect(n(bench, 'data-scale')).toBe(scale);
  const rootPoint = xy(bench.querySelector('[data-fillet-root]')), a = xy(bench.querySelector('[data-fillet-toe="1"]')), b = xy(bench.querySelector('[data-fillet-toe="2"]'));
  expect(rootPoint).toEqual([180, 340]); expect(a).toEqual([180 + leg * scale, 340]); expect(b).toEqual([180, 340 - leg * scale]);
  const legA = difference(a, rootPoint), legB = difference(b, rootPoint);
  expect(magnitude(legA) / scale).toBe(leg); expect(magnitude(legB) / scale).toBe(leg); expect(dot(legA, legB)).toBe(0);
  const triangle = bench.querySelector('[data-fillet-area]').getAttribute('points').split(' ').map(pair => pair.split(',').map(Number));
  expect(triangle).toEqual([rootPoint, a, b]);
  const face = bench.querySelector('[data-fillet-face]'); expect(xy(face, 'x1', 'y1')).toEqual(a); expect(xy(face, 'x2', 'y2')).toEqual(b);
  const point = xy(bench.querySelector('[data-fillet-probe-point]')), fraction = percent / 100;
  expect(point[0]).toBeCloseTo(a[0] + (b[0] - a[0]) * fraction, 10); expect(point[1]).toBeCloseTo(a[1] + (b[1] - a[1]) * fraction, 10);
  const line = bench.querySelector('[data-fillet-probe-line]'); expect(xy(line, 'x1', 'y1')).toEqual(rootPoint); expect(xy(line, 'x2', 'y2')).toEqual(point);
  const actualLength = magnitude(difference(point, rootPoint)) / scale;
  expect(actualLength).toBeCloseTo(leg * Math.sqrt(fraction ** 2 + (1 - fraction) ** 2), 13); expect(n(line, 'data-length')).toBeCloseTo(actualLength, 13);
  const minimum = bench.querySelector('[data-fillet-minimum]'), midpoint = a.map((value, i) => (value + b[i]) / 2), throat = magnitude(difference(midpoint, rootPoint)) / scale;
  expect(xy(minimum, 'x1', 'y1')).toEqual(rootPoint); expect(xy(minimum, 'x2', 'y2')).toEqual(midpoint);
  expect(dot(difference(midpoint, rootPoint), difference(b, a))).toBe(0); expect(throat).toBeCloseTo(leg / Math.sqrt(2), 13);
  expect(n(minimum, 'data-length')).toBeCloseTo(throat, 13); expect(actualLength).toBeGreaterThanOrEqual(throat - 1e-14);
  expect(bench.querySelector('[data-fillet-relation]').dataset.filletRelation).toBe(percent === 50 ? 'midpoint' : 'longer');
  for (const [id, expected] of [['leg', leg], ['probe', actualLength], ['throat', throat]]) {
    const reading = bench.querySelector(`[data-fillet-reading="${id}"]`);
    expect(n(reading, 'data-value')).toBeCloseTo(expected, 13); expect(reading.querySelector('dd').textContent).toBe(`≈ ${expected.toFixed(4)} in`);
  }
  expect(n(bench.querySelector('[data-fillet-ratio]'), 'data-value')).toBeCloseTo(1 / Math.sqrt(2), 13);
  return { actualLength, throat, midpoint };
}

describe('Ideal equal-leg fillet throat probe', () => {
  it('starts as closed native details and retains its open state while manual geometry changes', async () => {
    const app = await mount();
    expect(panel().tagName).toBe('DETAILS'); expect(panel().open).toBe(false); expect(panel().hasAttribute('open')).toBe(false);
    expect(n(panel(), 'data-leg')).toBe(0.25); expect(n(panel(), 'data-probe-percent')).toBe(50);
    await open(); expect(panel().open).toBe(true); await probe('100'); expect(panel().open).toBe(true); await size(0.375); expect(panel().open).toBe(true);
    await click(panel().querySelector('summary')); expect(panel().open).toBe(false); expect(app.writes).toHaveLength(0);
  });

  it('draws all3 authored leg sizes at one fixed scale and all101 actual root-to-face distances', async () => {
    await mount(); await open(); let cases = 0;
    for (const leg of SIZES) {
      await size(leg); const values = [];
      for (let percent = 0; percent <= 100; percent++) { await probe(String(percent)); values.push(checkGeometry(leg, percent).actualLength); cases++; }
      expect(values[0]).toBe(leg); expect(values[100]).toBe(leg);
      expect(values[50]).toBeCloseTo(leg / Math.sqrt(2), 13);
      for (let i = 1; i <= 50; i++) expect(values[i]).toBeLessThan(values[i - 1]);
      for (let i = 51; i <= 100; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
      for (let i = 0; i <= 100; i++) expect(values[i]).toBeCloseTo(values[100 - i], 13);
    }
    expect(cases).toBe(303);
  }, 60000);

  it('constructs the right-angle mark on the real midpoint and keeps the minimum and plate fixed while P moves', async () => {
    await mount(); await open();
    const members = panel().querySelector('[data-fillet-members]').outerHTML;
    for (const leg of SIZES) {
      await size(leg);
      const fixed = () => [...panel().querySelectorAll('[data-fillet-area],[data-fillet-face],[data-fillet-leg-line],[data-fillet-minimum],[data-fillet-right-angle],[data-fillet-toe],[data-fillet-root]')].map(node => node.outerHTML);
      const baseline = fixed();
      for (const percent of [0, 25, 50, 75, 100]) { await probe(String(percent)); expect(fixed()).toEqual(baseline); expect(panel().querySelector('[data-fillet-members]').outerHTML).toBe(members); expect(panel().querySelector('svg').getAttribute('viewBox')).toBe('0 0 600 430'); }
      const mark = panel().querySelector('[data-fillet-right-angle]').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      const points = [[mark[0], mark[1]], [mark[2], mark[3]], [mark[4], mark[5]]], minimum = panel().querySelector('[data-fillet-minimum]'), m = xy(minimum, 'x2', 'y2');
      expect(dot(difference(points[1], points[0]), difference(points[2], points[1]))).toBeCloseTo(0, 9);
      expect(dot(difference(points[0], m), difference(points[2], m))).toBeCloseTo(0, 9);
      expect(magnitude(difference(points[0], m))).toBeCloseTo(14, 11); expect(magnitude(difference(points[2], m))).toBeCloseTo(14, 11);
      await click(panel().querySelector('[data-fillet-midpoint]')); checkGeometry(leg, 50);
      expect(xy(panel().querySelector('[data-fillet-probe-point]'))).toEqual(m);
    }
  }, 30000);

  it('labels the current distance separately from the theoretical throat and explains the ideal geometry in complete HTML', async () => {
    await mount(); await open();
    for (const leg of SIZES) {
      await size(leg); await probe('100'); const { actualLength, throat } = checkGeometry(leg, 100);
      expect(actualLength).toBe(leg); expect(actualLength).toBeGreaterThan(throat);
      expect(panel().querySelector('[data-fillet-reading="probe"] dt').textContent).toBe('Root-to-P distance');
      expect(panel().querySelector('[data-fillet-reading="throat"] dt').textContent).toBe('Theoretical throat');
      expect(panel().querySelector('[data-fillet-ratio]').textContent).toContain('Theoretical throat ÷ leg = 1 ÷ √2 ≈ 0.707107.');
      expect(panel().querySelector('[data-fillet-relation]').textContent).toContain('longer than the perpendicular minimum');
      await click(panel().querySelector('[data-fillet-midpoint]')); expect(panel().querySelector('[data-fillet-relation]').textContent).toContain('perpendicular to the face');
    }
    const scope = panel().querySelector('[data-fillet-scope]').textContent;
    for (const text of ['equal legs and a straight face', 'without root penetration or convex or concave weld faces', 'one fixed drawing scale', 'geometry uses unrounded values', 'not weld strength or acceptance']) expect(scope).toContain(text);
    expect(panel().querySelector('figcaption').textContent).toContain('Toe 1 ends the horizontal leg; toe 2 ends the vertical leg');
    expect(panel().querySelector('svg').getAttribute('aria-label')).toContain('Root-to-P distance');
    expect(panel().querySelectorAll('svg text')).toHaveLength(0);
  });

  it('keeps slider and preset exploration local while preserving library sketches, other references and every saved score', async () => {
    const saved = { sym2_pr_ans: { '0_0': 1 }, sym2_b_res: { b3: 2 }, sym2_bp_ans: { c4: 1 }, sym2_lib_side: 'both', sym3_lp_example: '2-10', sym2_m_score: 8, mb_q_score: 3, weldBadges: { saved: true } };
    const app = await mount(saved), before = JSON.stringify(app.latest()), cards = () => [...host.querySelectorAll('[data-sym2-card]')].map(node => node.outerHTML), originalCards = cards();
    const modifiers = host.querySelector('[data-symbol-modifier-lens]').outerHTML;
    await open(); for (const leg of SIZES) { await size(leg); await probe('0'); await probe('100'); await click(panel().querySelector('[data-fillet-midpoint]')); }
    expect(cards()).toEqual(originalCards); expect(host.querySelector('[data-symbol-modifier-lens]').outerHTML).toBe(modifiers);
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(0);
  });

  it('normalizes manual probe events, ignores pseudo saved fields and bounds the native range without moving either toe', async () => {
    const app = await mount({ sym11_leg: 10, sym11_probe: 0 }); await open(); checkGeometry(0.25, 50);
    for (const bad of ['', ' ', null, undefined, {}, [], 'bad', 'Infinity', 'NaN']) { await probe(bad); checkGeometry(0.25, 50); }
    for (const [value, expected] of [[-8, 0], [999, 100], [24.6, 25], [75, 75]]) { await probe(String(value)); checkGeometry(0.25, expected); }
    expect(app.writes).toHaveLength(0); expect(panel().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('appears only in the free Library and keeps its local geometry through original tab navigation', async () => {
    for (const sr_view of ['anatomy', 'practice', 'builder', 'blueprint', 'bad']) expect(panel(render({ sr_view }))).toBeNull();
    const app = await mount(); await open(); await size(0.375); await probe('25');
    for (const id of ['anatomy', 'practice', 'builder', 'blueprint']) { await tab(id); expect(panel()).toBeNull(); }
    await tab('library'); expect(panel().open).toBe(false); await open(); checkGeometry(0.375, 25);
    expect(app.writes.every(([key]) => key === 'sr_view')).toBe(true);
  });

  it('preserves the real decoder pending choice, Check gate, first-answer lock and reset after reference exploration', async () => {
    const app = await mount(); await open(); await probe('100'); await tab('practice');
    expect(panel()).toBeNull(); expect(host.querySelector('#sym2-pr-fb-0_2')).toBeNull(); expect(host.textContent).not.toContain('the throat is about 0.707');
    const group = scoredGroup(2); await click(group.querySelectorAll('button')[1]);
    expect(host.querySelector('#sym2-pr-fb-0_2')).toBeNull(); expect(app.latest().sym2_pr_ans).toBeUndefined();
    await checkQuestion(group); expect(app.latest().sym2_pr_ans).toEqual({ '0_2': 1 }); expect(host.querySelector('#sym2-pr-fb-0_2').textContent).toContain('the throat is about 0.707');
    await click(scoredGroup(2).querySelectorAll('button')[0]); expect(app.latest().sym2_pr_ans).toEqual({ '0_2': 1 }); expect([...scoredGroup(2).querySelectorAll('button')].every(node => node.disabled)).toBe(true);
    expect(host.textContent).toContain('First-try score: 0 / 19');
    await click(scoredGroup(0).querySelectorAll('button')[1]); await checkQuestion(scoredGroup(0)); expect(host.textContent).toContain('First-try score: 1 / 19');
    await click(button('↺ Restart practice (clears the score)')); expect(app.latest().sym2_pr_ans).toEqual({}); expect(host.querySelector('#sym2-pr-fb-0_2')).toBeNull(); expect(host.textContent).toContain('First-try score: 0 / 19');
  });

  it('preserves real builder first-check credit and retry credit without transferring reference dimensions into a build', async () => {
    const app = await mount(); await open(); await size(0.375); await probe('75'); await tab('builder');
    expect(panel()).toBeNull(); expect(host.querySelector('#sym2-b-fb')).toBeNull();
    await click(button('Fillet weld')); await click(button('1/4')); await click(button('Check my symbol'));
    expect(host.querySelector('#sym2-b-fb').textContent).toContain('you have not chosen'); expect(app.latest().sym2_b_res || {}).toEqual({});
    await click(button('Arrow side (below the line)')); expect(host.querySelector('#sym2-b-fb')).toBeNull(); await click(button('Check my symbol')); expect(app.latest().sym2_b_res).toEqual({ b1: 2 });
    await click(host.querySelector('button[aria-label="Build 2"]')); await click(button('Fillet weld')); await click(button('Other side (above the line)')); await click(button('5/16')); await click(button('Check my symbol'));
    expect(app.latest().sym2_b_res).toEqual({ b1: 2, b2: 1 }); expect(host.textContent).toContain('Matches the spec on the first check');
  });

  it('preserves the mini-blueprint pending/Check/first-pick gate and existing reset', async () => {
    const app = await mount(); await open(); await size(0.1875); await probe('0'); await tab('blueprint'); expect(panel()).toBeNull();
    const group = scoredGroup(0); expect(button('Check answer').disabled).toBe(true); expect(host.querySelector('#sym2-bp-fb-c1')).toBeNull();
    await click(group.querySelectorAll('button')[0]); expect(host.querySelector('#sym2-bp-fb-c1')).toBeNull(); expect(app.latest().sym2_bp_ans).toBeUndefined(); await click(button('Check answer'));
    expect(app.latest().sym2_bp_ans).toEqual({ c1: 0 }); expect(host.querySelector('#sym2-bp-fb-c1')).toBeTruthy();
    await click(scoredGroup(0).querySelectorAll('button')[2]); expect(app.latest().sym2_bp_ans).toEqual({ c1: 0 }); expect(host.textContent).toContain('First-try score: 0 / 4');
    await click(button('↺ Clear blueprint answers')); expect(app.latest().sym2_bp_ans).toEqual({}); expect(host.querySelector('#sym2-bp-fb-c1')).toBeNull(); expect(button('Check answer').disabled).toBe(true);
  });

  it.each([false, true])('uses native44px controls, strong focus, full HTML units and explicit contrast without SVG text or autoplay (contrast=%s)', async contrast => {
    await mount({}, contrast); await open(); const bench = panel(), edge = contrast ? '#ffff00' : '#9a3412';
    expect(bench.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(bench.style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const control of bench.querySelectorAll('summary,input,button')) expect(control.style.minHeight).toBe('44px');
    const input = bench.querySelector('input'); expect(input.type).toBe('range'); expect([input.min, input.max, input.step]).toEqual(['0', '100', '1']); expect(bench.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
    for (const button of bench.querySelectorAll('button')) { expect(button.type).toBe('button'); expect(button.getAttribute('aria-controls')).toBe('sym11-readings'); }
    const css = bench.querySelector('style').textContent; expect(css).toContain(`:focus-visible{outline:3px solid ${edge}!important;outline-offset:3px}`); expect(css).toContain('transition:none!important;animation:none!important');
    const svg = bench.querySelector('svg'); expect(svg.style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(15, 23, 42)'); expect(svg.style.width).toBe('100%'); expect(svg.style.height).toBe('auto'); expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(svg.querySelectorAll('text,animate,animateTransform,canvas')).toHaveLength(0); expect(bench.querySelectorAll('[data-fillet-reading]')).toHaveLength(3); expect(bench.querySelector('#sym11-readings').getAttribute('aria-live')).toBe('polite');
    expect(bench.querySelector('[data-fillet-minimum]').getAttribute('stroke-dasharray')).toBe('7 5'); expect(bench.querySelector('[data-fillet-probe-line]').getAttribute('stroke-dasharray')).toBeNull();
    if (contrast) expect(bench.querySelector('[data-fillet-probe-line]').getAttribute('stroke')).toBe('#ffff00');
  });

  it('restores all original SymbolsReader renderers, prose, assessments and saved-field handlers by removing only the additive hook/helper/call', () => {
    const source = readFileSync(resolve(SRC), 'utf8').replace(/\r\n/g, '\n');
    let region = source.slice(source.indexOf('function SymbolsReader('), source.indexOf('function PPESafetyLab('));
    const hook = '        var filletThroatState = useState({ leg: 0.25, probe: 50 });\n', call = '              renderFilletThroatProbe(),\n';
    expect(region.split(hook)).toHaveLength(2); region = region.replace(hook, '');
    const a = region.indexOf('        function renderFilletThroatProbe() {'), b = region.indexOf('        function renderModifierLens() {', a);
    expect(a).toBeGreaterThan(0); expect(b).toBeGreaterThan(a); region = region.slice(0, a) + region.slice(b);
    expect(region.split(call)).toHaveLength(2); region = region.replace(call, '');
    expect(createHash('sha256').update(region).digest('hex')).toBe(ORIGINAL_SYMBOLS_SHA256);
  });
});
