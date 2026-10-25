import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { stripUnderwaterDepths } from './helpers/weldlab_underwater_depth_restore.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'underwater', uw_view: 'pressure', uw_depth: 66, uw_tech: 'wet', uw_probe_time: 7.25, tech2_uw_pred: 'skip', tech2_uw_pred_from: 10, tech2_uw_dec: { 1: 0 }, weldBadges: {}, defectCatalog: {}, speedBest: {} };
const SOURCE = 'https://www.omao.noaa.gov/sites/default/files/documents/DMT%20Formula%20book%20111816.pdf#page=4';
let root, host;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
const core = () => window.__WeldLabCore.tech2;
const bench = () => host.querySelector('[data-uw-gas-bench]');
const plot = () => bench().querySelector('[data-uw-gas-plot]');
const num = (node, attribute) => Number(node.getAttribute(attribute));
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function change(selector, value) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
async function blurVolume() { await React.act(() => Simulate.blur(bench().querySelector('[data-uw-gas-volume]'))); }
async function click(selector) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function textButton(text) { const node = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(node, text).toBeTruthy(); await React.act(() => node.click()); }
async function tab(number) { const node = [...host.querySelectorAll('[role="tab"]')].find(el => el.textContent.startsWith(number + '.')); expect(node).toBeTruthy(); await React.act(() => node.click()); }
function check(depth, full = true) {
  const pressure = 1 + depth / 33, volume = 1 / pressure, width = Math.pow(volume, 1 / 3), x = 72 + (pressure - 1) / 10 * 576, y = 264 - volume * 228;
  expect(num(bench(), 'data-depth-ft')).toBeCloseTo(depth, 11); expect(num(bench(), 'data-pressure-atm')).toBeCloseTo(core().pressureAtm(depth), 12); expect(num(bench(), 'data-volume-ratio')).toBeCloseTo(volume, 13); expect(num(bench(), 'data-width-ratio')).toBeCloseTo(core().bubbleScale(depth), 13);
  expect(num(bench(), 'data-product')).toBeCloseTo(1, 13); expect(num(bench(), 'data-width-ratio') ** 3).toBeCloseTo(volume, 13);
  const marker = plot().querySelector('[data-uw-gas-marker]'); expect(num(marker, 'cx')).toBeCloseTo(x, 11); expect(num(marker, 'cy')).toBeCloseTo(y, 11); expect(num(marker, 'data-pressure-atm')).toBeCloseTo(pressure, 12); expect(num(marker, 'data-volume-ratio')).toBeCloseTo(volume, 13);
  expect(num(marker, 'cx')).toBeGreaterThanOrEqual(72); expect(num(marker, 'cx')).toBeLessThanOrEqual(648); expect(num(marker, 'cy')).toBeGreaterThanOrEqual(36); expect(num(marker, 'cy')).toBeLessThanOrEqual(264);
  const vertical = plot().querySelector('[data-uw-gas-guide="x"]'), horizontal = plot().querySelector('[data-uw-gas-guide="y"]');
  expect(num(vertical, 'x1')).toBeCloseTo(x, 11); expect(vertical.getAttribute('x1')).toBe(vertical.getAttribute('x2')); expect(num(vertical, 'y1')).toBeCloseTo(y, 11); expect(num(vertical, 'y2')).toBe(264);
  expect(num(horizontal, 'x1')).toBe(72); expect(num(horizontal, 'x2')).toBeCloseTo(x, 11); expect(num(horizontal, 'y1')).toBeCloseTo(y, 11); expect(horizontal.getAttribute('y1')).toBe(horizontal.getAttribute('y2'));
  expect(Number(bench().querySelector('[data-uw-gas-depth]').value)).toBeCloseTo(depth, 11); expect(Number(bench().querySelector('[data-uw-gas-volume]').value)).toBeCloseTo(volume * 100, 11);
  expect(num(bench().querySelector('[data-uw-gas-identity]'), 'data-value')).toBeCloseTo(1, 13); expect(num(bench().querySelector('[data-uw-gas-width-cube]'), 'data-value')).toBeCloseTo(volume, 13);
  if (!full) return;
  for (const [id, value, unit] of [['depth', depth, 'ft'], ['pressure', pressure, 'atm'], ['volume', volume * 100, '%'], ['width', width * 100, '%']]) {
    const reading = bench().querySelector(`[data-uw-gas-reading="${id}"]`); expect(num(reading, 'data-value')).toBeCloseTo(value, 11); expect(reading.querySelector('dd').textContent).toBe('≈ ' + value.toFixed(3) + ' ' + unit);
  }
  expect(bench().querySelector('[data-uw-gas-identity]').textContent).toBe(`Relative balance: (P ÷ 1 atm) × (V ÷ surface volume) = 1. Here, ${pressure.toFixed(6)} × ${volume.toFixed(6)} ≈ 1.`);
  expect(bench().querySelector('[data-uw-gas-width-cube]').textContent).toBe(`The lab’s schematic width ratio is the cube root of the volume ratio: ${width.toFixed(6)}³ ≈ ${volume.toFixed(6)}. A width percentage is not a volume percentage.`);
}

describe('Reversible constant-temperature pressure-volume reference', () => {
  it('keeps all new controls, graph and readings behind the original prediction-or-skip gate', () => {
    for (const tech2_uw_pred of ['', 'bad', { chosen: true }]) {
      const node = render({ tech2_uw_pred }); expect(node.querySelector('[data-uw-gas-bench]')).toBeNull(); expect(node.querySelector('[data-uw-gas-depth]')).toBeNull(); expect(node.querySelector('[data-uw-gas-volume]')).toBeNull(); expect(node.textContent).toContain('Predict first');
    }
    for (const tech2_uw_pred of ['faster', 'same', 'slower', 'skip']) expect(render({ tech2_uw_pred }).querySelector('[data-uw-gas-bench]')).toBeTruthy();
    for (const uw_view of ['intro', 'decide', 'safety', 'career', 'bad']) expect(render({ uw_view }).querySelector('[data-uw-gas-bench]')).toBeNull();
  });

  it('starts at a local33ft example and distinguishes fixed-amount gas volume from schematic linear width', async () => {
    await mount(); check(33); expect(num(bench(), 'data-pressure-atm')).toBe(2); expect(num(bench(), 'data-volume-ratio')).toBe(0.5); expect(num(bench(), 'data-width-ratio')).toBeGreaterThan(0.79);
    expect(bench().textContent).toContain('holds the amount of gas and its temperature fixed'); expect(bench().querySelector('[data-uw-gas-assumptions]').textContent).toContain('absolute pressure = 1 + depth ÷ 33'); expect(bench().textContent).toContain('At the surface, pressure is 1 atm');
    expect(bench().querySelector('[data-uw-gas-reading="volume"] dt').textContent).toBe('Volume compared with its surface value'); expect(bench().querySelector('[data-uw-gas-reading="width"] dt').textContent).toBe('Drawn width compared with its surface value');
    for (const text of ['actual welding arc bubble exchanges gas and heat', 'not a model of its full behavior', 'Readouts are rounded; controls and geometry retain unrounded values', 'does not set a diving or welding procedure']) expect(bench().querySelector('[data-uw-gas-note]').textContent).toContain(text);
    expect(bench().querySelector('[data-uw-gas-source]').href).toBe(SOURCE);
  });

  it('matches the existing pressure and cube-root model at every integer depth and preserves fractional depth precision', async () => {
    await mount(); let count = 0;
    for (let depth = 0; depth <= 300; depth++) { await change('[data-uw-gas-depth]', String(depth)); check(depth, depth % 10 === 0); count++; }
    for (const depth of [0.123456789, 10.125, 33.3333333333, 99.987654321, 299.875]) { await change('[data-uw-gas-depth]', String(depth)); check(depth); count++; }
    expect(count).toBe(306);
  }, 60000);

  it('solves the inverse for dense volume inputs without rounding or maintaining a second conflicting scalar', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()); let count = 0; const minimum = 100 / core().pressureAtm(300);
    for (let index = 0; index <= 100; index++) {
      const percent = minimum + (100 - minimum) * index / 100, depth = Math.max(0, Math.min(300, 33 * (100 / percent - 1)));
      await change('[data-uw-gas-volume]', String(percent)); check(depth, index % 10 === 0); expect(num(bench(), 'data-volume-ratio') * 100).toBeCloseTo(percent, 11); count++;
    }
    for (const [percent, depth] of [[100, 0], [50, 33], [25, 99], [10, 297], [37.123456789, 33 * (100 / 37.123456789 - 1)]]) { await change('[data-uw-gas-volume]', String(percent)); check(depth); }
    expect(count).toBe(101); expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(0);
  }, 60000);

  it('keeps the complete101-point curve, surface reference and both absolute-pressure/volume axes fixed', async () => {
    await mount(); const fixed = () => [...plot().querySelectorAll('[data-uw-gas-curve],[data-uw-gas-axis],[data-uw-gas-volume-tick],[data-uw-gas-pressure-tick],[data-uw-gas-surface-marker]')].map(node => node.outerHTML); const original = fixed();
    expect(plot().getAttribute('viewBox')).toBe('0 0 720 320'); expect(plot().querySelector('[data-uw-gas-axis]').getAttribute('d')).toBe('M72 36 V264 H648');
    const points = plot().querySelector('[data-uw-gas-curve]').getAttribute('points').split(' ').map(pair => pair.split(',').map(Number)); expect(points).toHaveLength(101);
    points.forEach(([x, y], index) => { const pressure = core().pressureAtm(index * 3); expect(x).toBeCloseTo(72 + (pressure - 1) / 10 * 576, 12); expect(y).toBeCloseTo(264 - 228 / pressure, 12); if (index) { expect(x).toBeGreaterThan(points[index - 1][0]); expect(y).toBeGreaterThan(points[index - 1][1]); } });
    expect([...plot().querySelectorAll('[data-uw-gas-pressure-tick]')].map(node => node.dataset.uwGasPressureTick)).toEqual(['1', '3', '5', '7', '9', '11']);
    for (const tick of plot().querySelectorAll('[data-uw-gas-pressure-tick]')) expect(num(tick.querySelector('line'), 'x1')).toBe(72 + (Number(tick.dataset.uwGasPressureTick) - 1) / 10 * 576);
    for (const tick of plot().querySelectorAll('[data-uw-gas-volume-tick]')) expect(num(tick.querySelector('line'), 'y1')).toBe(264 - Number(tick.dataset.uwGasVolumeTick) / 100 * 228);
    const surface = plot().querySelector('[data-uw-gas-surface-marker]'); expect(num(surface, 'cx')).toBe(72); expect(num(surface, 'cy')).toBe(36); expect(surface.getAttribute('fill')).toBe('#0f172a'); expect(surface.getAttribute('stroke')).toBe('#ffffff');
    for (const depth of ['0', '33', '99', '199.123456', '300']) { await change('[data-uw-gas-depth]', depth); expect(fixed()).toEqual(original); }
  });

  it('bounds both linked controls, ignores malformed events and keeps the two physical endpoint values exact', async () => {
    await mount({ uw7_depth: 250, uw7_volume: 10 }); check(33);
    for (const selector of ['[data-uw-gas-depth]', '[data-uw-gas-volume]']) {
      for (const bad of ['', ' ', null, undefined, {}, [], 'bad', 'NaN', 'Infinity']) { await change(selector, bad); if (selector === '[data-uw-gas-volume]') await blurVolume(); check(33); }
    }
    for (const [selector, value, expected] of [['[data-uw-gas-depth]', '-1', 0], ['[data-uw-gas-depth]', '999', 300], ['[data-uw-gas-volume]', '-1', 300], ['[data-uw-gas-volume]', '0', 300], ['[data-uw-gas-volume]', '1000', 0]]) { await change(selector, value); if (selector === '[data-uw-gas-volume]') await blurVolume(); check(expected); }
    for (const depth of [0, 33, 99, 300]) { await click(`[data-uw-gas-preset="${depth}"]`); check(depth); expect(bench().querySelector(`[data-uw-gas-preset="${depth}"]`).getAttribute('aria-pressed')).toBe('true'); }
    expect(num(bench(), 'data-pressure-atm')).toBeCloseTo(1 + 300 / 33, 13); expect(num(bench(), 'data-volume-ratio')).toBeCloseTo(33 / 333, 13); expect(bench().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('allows multi-digit volume typing and empty/intermediate drafts before committing a normalized value on blur', async () => {
    await mount(); await change('[data-uw-gas-volume]', ''); expect(bench().querySelector('[data-uw-gas-volume]').value).toBe(''); expect(num(bench(), 'data-depth-ft')).toBe(33);
    await change('[data-uw-gas-volume]', '2'); expect(bench().querySelector('[data-uw-gas-volume]').value).toBe('2'); expect(num(bench(), 'data-depth-ft')).toBe(33);
    await change('[data-uw-gas-volume]', '25'); check(99); await blurVolume(); check(99);
    await change('[data-uw-gas-volume]', ''); await blurVolume(); check(99);
    await change('[data-uw-gas-volume]', '2'); expect(num(bench(), 'data-depth-ft')).toBe(99); await blurVolume(); check(300);
    await change('[data-uw-gas-volume]', '101'); expect(num(bench(), 'data-depth-ft')).toBe(300); await blurVolume(); check(0);
    await change('[data-uw-gas-volume]', '2'); await click('[data-uw-gas-preset="33"]'); check(33);
    await change('[data-uw-gas-volume]', '2'); await change('[data-uw-gas-depth]', '11.123456789'); check(11.123456789);
    await change('[data-uw-gas-volume]', '2'); await click('[data-uw-gas-use-lab]'); check(BASE.uw_depth);
  });

  it('keeps all exploration local and leaves existing depth, technique, cooling clock, workshop and assessment records unchanged', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    const workshop = host.querySelector('[data-uw-workshop]').outerHTML, graph = host.querySelector('[data-uw-cooling-graph]').outerHTML, cooling = host.querySelector('[data-uw-cooling-probe]').outerHTML;
    await change('[data-uw-gas-depth]', '299.123'); await change('[data-uw-gas-volume]', '37.123456789');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes); expect(host.querySelector('[data-uw-workshop]').outerHTML).toBe(workshop); expect(host.querySelector('[data-uw-cooling-graph]').outerHTML).toBe(graph); expect(host.querySelector('[data-uw-cooling-probe]').outerHTML).toBe(cooling);
    const before = num(bench(), 'data-depth-ft'); await change('input[aria-label="Depth"]', '123.25'); check(before); await textButton('🛎️ Hyperbaric (dry)'); check(before);
    await click('[data-uw-gas-use-lab]'); check(123.25); expect(app.latest()).toMatchObject({ uw_depth: 123.25, uw_tech: 'dry', uw_probe_time: 7.25, tech2_uw_pred: 'skip', tech2_uw_pred_from: 10, tech2_uw_dec: { 1: 0 } });
    expect(app.writes.map(([key]) => key)).toEqual(['uw_depth', 'uw_tech']);
  });

  it('preserves prediction-distance feedback, hides on Predict again and restores its local point only after a real prediction or skip', async () => {
    const app = await mount({ tech2_uw_pred: 'same', uw_depth: 30, tech2_uw_pred_from: 10 });
    await change('[data-uw-gas-depth]', '300'); expect(host.textContent).toContain('at least 60 ft away from 10 ft'); expect(host.textContent).not.toContain('Not what the model shows.');
    await textButton('Predict again'); expect(bench()).toBeNull(); expect(app.latest()).toMatchObject({ tech2_uw_pred: '', uw_depth: 30, uw_probe_time: 7.25, tech2_uw_dec: { 1: 0 } });
    expect(host.querySelector('[data-uw-gas-use-lab]')).toBeNull(); await textButton('Skip the prediction'); check(300);
    await tab(4); expect(bench()).toBeNull(); await tab(2); check(300);
  });

  it('preserves real wet/dry decision feedback, first-answer locks, score and reset through local gas-law work', async () => {
    const app = await mount({ tech2_uw_dec: {} }); await change('[data-uw-gas-volume]', '25'); await tab(3); expect(bench()).toBeNull(); expect(host.textContent).toContain('Score 0 / 0'); expect(host.textContent).not.toContain('Why:'); expect(host.textContent).not.toContain('Why not');
    const group = host.querySelector('[aria-label="Choices for job 1"]'), options = [...group.querySelectorAll('[role="radio"]')]; expect(options).toHaveLength(4); await React.act(() => options[0].click()); expect(app.latest().tech2_uw_dec).toEqual({ 0: 0 }); expect(host.textContent).toContain('Score 1 / 1'); expect(host.textContent).toContain('Why:'); await React.act(() => options[1].click()); expect(app.latest().tech2_uw_dec).toEqual({ 0: 0 }); expect(host.textContent).toContain('Score 1 / 1');
    await tab(2); check(99); await change('[data-uw-gas-depth]', '0'); expect(app.latest().tech2_uw_dec).toEqual({ 0: 0 }); await tab(3); expect([...host.querySelector('[aria-label="Choices for job 1"]').querySelectorAll('button')].every(node => node.disabled)).toBe(true);
    await textButton('↺ Reset decisions'); expect(app.latest().tech2_uw_dec).toEqual({}); expect(host.textContent).toContain('Score 0 / 0'); expect(host.textContent).not.toContain('Why:'); await tab(2); check(0);
  });

  it.each([false, true])('provides native44px controls, full HTML units/identities, explicit focus and non-color graph markers without motion (contrast=%s)', async contrast => {
    await mount({}, contrast); expect(bench().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(bench().style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const control of bench().querySelectorAll('button,input,a')) expect(control.style.minHeight).toBe('44px');
    const depth = bench().querySelector('[data-uw-gas-depth]'), volume = bench().querySelector('[data-uw-gas-volume]'); expect(depth.type).toBe('range'); expect(volume.type).toBe('number'); expect(depth.step).toBe('any'); expect(volume.step).toBe('any'); expect(depth.min).toBe('0'); expect(depth.max).toBe('300'); expect(Number(volume.min)).toBeCloseTo(100 / core().pressureAtm(300), 13); expect(volume.max).toBe('100');
    for (const input of bench().querySelectorAll('input')) expect(bench().querySelector(`label[for="${input.id}"]`)).toBeTruthy(); expect(volume.getAttribute('aria-describedby')).toBe('uw7-volume-help');
    for (const button of bench().querySelectorAll('button')) { expect(button.type).toBe('button'); expect(bench().querySelector('#' + button.getAttribute('aria-controls'))).toBeTruthy(); }
    const selected = bench().querySelector('[data-uw-gas-preset="33"]'); expect(selected.style.background).toBe(contrast ? 'rgb(255, 255, 0)' : 'rgb(7, 89, 133)'); expect(selected.style.color).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    expect(plot().style.width).toBe('100%'); expect(plot().style.height).toBe('auto'); expect(plot().style.maxWidth).toBe('720px'); expect(plot().getAttribute('aria-label')).toContain('white ring is the surface reference'); expect(plot().querySelector('[data-uw-gas-marker]').getAttribute('fill')).toBe(contrast ? '#ffff00' : '#67e8f9');
    for (const text of plot().querySelectorAll('text')) { expect(text.getAttribute('font-size')).toBe('32'); expect(text.getAttribute('font-family')).toBe('monospace'); expect(text.textContent).not.toContain('%'); } expect(num(plot().querySelector('[data-uw-gas-volume-tick="100"] text'), 'x')).toBe(58);
    expect(bench().querySelector('#uw7-readings').getAttribute('aria-live')).toBe('polite'); expect(bench().querySelectorAll('dl dt')).toHaveLength(4); expect(bench().querySelectorAll('dl dd')).toHaveLength(4); expect(bench().querySelector('[data-uw-gas-identity]').className).toContain('text-base');
    const css = bench().querySelector('style').textContent; for (const value of [':is(input,button,a):focus-visible', 'outline:3px solid ' + (contrast ? '#ffff00' : '#075985') + '!important', 'transition:none!important', 'animation:none!important']) expect(css).toContain(value);
    expect(bench().querySelector('animate,animateTransform,canvas,filter,linearGradient,radialGradient')).toBeNull(); expect(bench().querySelectorAll('input')).toHaveLength(2); expect(bench().querySelector('[data-uw-gas-source]').style.minHeight).toBe('44px');
  });

  it('restores the complete original Underwater region after removing only the one local scalar, helper and existing-prediction-gated call', () => {
    const source = stripUnderwaterDepths(stripWeldlabWcagFixes(readFileSync(SRC, 'utf8'))); const start = source.indexOf('      function UnderwaterLab() {'), end = source.indexOf('      function ProcessSleuth() {', start); let region = source.slice(start, end);
    const helperAt = region.indexOf('        function renderGasVolumeReference() {'), helperEnd = region.indexOf('        function renderArcBubble() {', helperAt); expect(helperAt).toBeGreaterThan(0); expect(helperEnd).toBeGreaterThan(helperAt); region = region.slice(0, helperAt) + region.slice(helperEnd);
    for (const line of ['        var uwGasState = useState({ depth: 33, volumeText: null });', '              uwPred && renderGasVolumeReference(),']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line + '\n', ''); }
    expect(createHash('sha256').update(region).digest('hex')).toBe('ac98edcf816eb27c554ca67bcf663855a337d06390a1e317cf1e5feac2ed2b98');
  });
});
