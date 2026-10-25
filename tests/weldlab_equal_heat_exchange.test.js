import { stripWeldlabWcagFixes } from './helpers/weldlab_wcag_restore.js';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const NOTEBOOK = { hypothesis: 'Compare energy with shape', log: [], stuckRevealed: false, understood: false, explanation: '' };
const BASE = { view: 'heatInput', hi_V: 22, hi_A: 180, hi_TS: 12, hi_process: 'mig', tech2_hi_th: 0.25, hi3_progress: 37, hi_inquiry: NOTEBOOK, weldBadges: {}, defectCatalog: {}, speedBest: {} };
let root, host;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
const core = () => window.__WeldLabCore;
const bench = () => host.querySelector('[data-hi-exchange]');
const result = () => bench().querySelector('[data-hi-exchange-result]');
const plot = () => bench().querySelector('[data-hi-exchange-plot]');
const num = (node, attr) => Number(node.getAttribute(attr));
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function change(selector, value) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
async function click(selector) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function textButton(text) { const node = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(node, text).toBeTruthy(); await React.act(() => node.click()); }
async function pickProcess(id) { const names = { mig: 'MIG / GMAW', tig: 'TIG / GTAW', stick: 'Stick / SMAW', oxy: 'Oxy-Fuel' }; const node = [...host.querySelector('[aria-label="Welding process"]').querySelectorAll('button')].find(el => el.textContent === names[id]); expect(node).toBeTruthy(); await React.act(() => node.click()); }
function check(v, ref = { V: 22, A: 180, TS: 12, P: 'mig', TH: 0.25 }, geometry = true) {
  const power = ref.V * ref.A, a = power / v, gross = core().heatInputGross(v, a, ref.TS), net = core().heatInputNet(v, a, ref.TS, ref.P), expectedGross = core().heatInputGross(ref.V, ref.A, ref.TS);
  expect(result().dataset.process).toBe(ref.P); expect(num(result(), 'data-speed')).toBe(ref.TS); expect(num(result(), 'data-thickness')).toBe(ref.TH); expect(num(result(), 'data-power')).toBe(power);
  expect(num(result(), 'data-reference-voltage')).toBe(ref.V); expect(num(result(), 'data-reference-amperage')).toBe(ref.A); expect(num(result(), 'data-voltage')).toBeCloseTo(v, 12); expect(num(result(), 'data-amperage')).toBeCloseTo(a, 12);
  expect(num(result(), 'data-voltage') * num(result(), 'data-amperage')).toBeCloseTo(power, 9); expect(gross).toBeCloseTo(expectedGross, 11); expect(num(result(), 'data-net')).toBeCloseTo(net, 11); expect(num(result(), 'data-reference-net')).toBeCloseTo(net, 11);
  expect(num(result(), 'data-lower')).toBe(Math.max(10, power / 350)); expect(num(result(), 'data-upper')).toBe(Math.min(40, power / 50)); expect(a).toBeGreaterThanOrEqual(50 - 1e-9); expect(a).toBeLessThanOrEqual(350 + 1e-9);
  const marker = plot().querySelector('[data-hi-exchange-marker="candidate"]'); expect(num(marker, 'cx')).toBeCloseTo(72 + (v - 10) / 30 * 576, 11); expect(num(marker, 'cy')).toBeCloseTo(264 - (a - 50) / 300 * 228, 11);
  expect(Number(bench().querySelector('[data-hi-exchange-voltage]').value)).toBeCloseTo(v, 12);
  if (!geometry) return;
  for (const [slot, volts, amps] of [['reference', ref.V, ref.A], ['candidate', v, a]]) {
    const g = core().beadGeometry(volts, amps, ref.TS, ref.P, 'steel', ref.TH), pane = bench().querySelector(`[data-hi-exchange-specimen="${slot}"]`), svg = pane.querySelector('svg');
    expect(num(pane, 'data-scale')).toBe(160); expect(svg.getAttribute('viewBox')).toBe('0 0 320 150'); expect(num(pane, 'data-voltage')).toBeCloseTo(volts, 12); expect(num(pane, 'data-amperage')).toBeCloseTo(amps, 12);
    const values = { width: g.width, reinforcement: g.reinf, penetration: g.penetration, gross: expectedGross, net: g.net };
    for (const [key, value] of Object.entries(values)) {
      expect(num(pane, 'data-' + key)).toBeCloseTo(value, 11); const reading = pane.querySelector(`[data-hi-exchange-reading="${key}"]`); expect(num(reading, 'data-value')).toBeCloseTo(value, 11); expect(reading.querySelector('dd').textContent).toBe('≈ ' + value.toFixed(3) + ' ' + (key === 'net' || key === 'gross' ? 'kJ/in' : 'in'));
    }
    const w = g.width * 160, r = g.reinf * 160, p = Math.min(g.penetration, ref.TH) * 160, th = ref.TH * 160, x0 = 160 - w / 2, x1 = 160 + w / 2;
    const fusion = g.penetration >= ref.TH ? `M ${x0} 50 L ${160 - w * 0.22} ${50 + th} L ${160 + w * 0.22} ${50 + th} L ${x1} 50 Z` : `M ${x0} 50 Q 160 ${50 + 2 * p} ${x1} 50 Z`;
    expect(svg.querySelector('[data-hi-exchange-fusion]').getAttribute('d')).toBe(fusion); expect(svg.querySelector('[data-hi-exchange-fusion]').dataset.through).toBe(g.penetration >= ref.TH ? 'true' : 'false'); expect(svg.querySelector('[data-hi-exchange-cap]').getAttribute('d')).toBe(`M ${x0} 50 Q 160 ${50 - 2 * r} ${x1} 50 Z`);
    const plate = svg.querySelector('[data-hi-exchange-plate]'), width = svg.querySelector('[data-hi-exchange-width-line]'); expect(['x', 'y', 'width', 'height'].map(attr => num(plate, attr))).toEqual([10, 50, 300, th]); expect(num(width, 'x1')).toBeCloseTo(x0, 12); expect(num(width, 'x2')).toBeCloseTo(x1, 12); expect(num(width, 'x2') - num(width, 'x1')).toBeCloseTo(g.width * 160, 11);
    expect(50 - r).toBeGreaterThanOrEqual(0); expect(50 + p).toBeLessThanOrEqual(150);
  }
}

describe('Explicitly captured equal-heat voltage/current exchange', () => {
  it('requires an explicit local capture before any graph, inverse control, specimen or numeric result appears', async () => {
    const app = await mount({ hi4_snapshot: { V: 40, A: 350 } }); expect(bench().dataset.hiExchange).toBe('empty'); expect(result()).toBeNull(); expect(bench().querySelector('svg,input,dl')).toBeNull(); expect(bench().querySelectorAll('button')).toHaveLength(1);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length; await click('[data-hi-exchange-capture]'); check(22); expect(bench().dataset.hiExchange).toBe('captured'); expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    expect([...bench().querySelectorAll('[data-hi-exchange-preset]')].map(node => node.dataset.hiExchangePreset)).toEqual(['lower', 'reference', 'upper']);
  });

  it.each(['mig', 'tig', 'stick'])('preserves product, gross/net heat and captured settings through101 unrounded%s voltage/current pairs', async P => {
    await mount({ hi_process: P }); await click('[data-hi-exchange-capture]'); const lower = num(result(), 'data-lower'), upper = num(result(), 'data-upper'), ref = { V: 22, A: 180, TS: 12, P, TH: 0.25 }; let count = 0;
    for (let index = 0; index <= 100; index++) { const v = lower + (upper - lower) * index / 100; await change('[data-hi-exchange-voltage]', String(v)); check(v, ref, index % 10 === 0); count++; }
    expect(count).toBe(101); await change('[data-hi-exchange-voltage]', '23.123456789'); check(23.123456789, ref);
  }, 60000);

  it('uses exact shared-scale original section paths and shows different model shapes at equal heat input', async () => {
    await mount(); await click('[data-hi-exchange-capture]'); const fixed = bench().querySelector('[data-hi-exchange-specimen="reference"]').outerHTML;
    for (const v of [18, 26]) { await change('[data-hi-exchange-voltage]', String(v)); check(v); expect(bench().querySelector('[data-hi-exchange-specimen="reference"]').outerHTML).toBe(fixed); }
    const before = core().beadGeometry(18, 3960 / 18, 12, 'mig', 'steel', 0.25), after = core().beadGeometry(26, 3960 / 26, 12, 'mig', 'steel', 0.25); expect(after.width).toBeGreaterThan(before.width); expect(after.reinf).toBeLessThan(before.reinf); expect(after.penetration).toBeCloseTo(before.penetration, 12);
    for (const text of ['same plate and drawing scale', 'section stops at the bottom of the plate', 'equal penetration in this simplified model', 'does not establish equivalent welds or procedures', 'or predict real weld performance', 'calculations and geometry retain unrounded values']) expect(bench().querySelector('[data-hi-exchange-note]').textContent).toContain(text);
  });

  it('keeps fixed axes, the reference ring and all101 actual curve samples unchanged while only the candidate moves', async () => {
    await mount(); await click('[data-hi-exchange-capture]'); const fixed = () => [...plot().querySelectorAll('[data-hi-exchange-curve],[data-hi-exchange-axis],[data-hi-exchange-current-tick],[data-hi-exchange-voltage-tick],[data-hi-exchange-marker="reference"]')].map(node => node.outerHTML); const original = fixed();
    expect(plot().getAttribute('viewBox')).toBe('0 0 720 320'); expect(plot().querySelector('[data-hi-exchange-axis]').getAttribute('d')).toBe('M72 36 V264 H648'); const lower = 3960 / 350, upper = 40;
    const points = plot().querySelector('[data-hi-exchange-curve]').getAttribute('points').split(' ').map(pair => pair.split(',').map(Number)); expect(points).toHaveLength(101);
    points.forEach(([x, y], index) => { const v = lower + (upper - lower) * index / 100, a = 3960 / v; expect(x).toBeCloseTo(72 + (v - 10) / 30 * 576, 11); expect(y).toBeCloseTo(264 - (a - 50) / 300 * 228, 11); });
    for (const v of [lower, 12.123456789, 22, upper]) { await change('[data-hi-exchange-voltage]', String(v)); expect(fixed()).toEqual(original); }
    const reference = plot().querySelector('[data-hi-exchange-marker="reference"]'); expect(reference.getAttribute('fill')).toBe('#0f172a'); expect(reference.getAttribute('stroke')).toBe('#ffffff'); expect(num(reference, 'r')).toBe(9); expect(num(plot().querySelector('[data-hi-exchange-marker="candidate"]'), 'r')).toBe(5);
  });

  it('derives exact feasible bounds across plate/speed combinations and disables only the truly degenerate power extremes', async () => {
    const app = await mount();
    for (const [V, A, TS, TH] of [[10, 50, 3, 0.125], [40, 350, 30, 0.375], [10, 350, 6, 0.1875], [40, 50, 12, 0.25], [17.5, 145, 8.5, 0.125]]) {
      await change('input[aria-label="Voltage"]', String(V)); await change('input[aria-label="Amperage"]', String(A)); await change('input[aria-label="Travel Speed"]', String(TS));
      const plate = [...host.querySelector('[aria-label="Plate thickness for the bead preview"]').querySelectorAll('button')][[0.125, 0.1875, 0.25, 0.375].indexOf(TH)]; await React.act(() => plate.click()); await click('[data-hi-exchange-capture]'); check(V, { V, A, TS, P: 'mig', TH });
      const lower = Math.max(10, V * A / 350), upper = Math.min(40, V * A / 50), slider = bench().querySelector('[data-hi-exchange-voltage]'); expect(Number(slider.min)).toBe(lower); expect(Number(slider.max)).toBe(upper); expect(slider.disabled).toBe(lower === upper);
      const presets = [...bench().querySelectorAll('[data-hi-exchange-preset]')], values = presets.map(node => Number(node.dataset.value)); expect(new Set(values).size).toBe(values.length);
      if (lower === upper) { expect(presets).toHaveLength(1); expect(bench().querySelector('[data-hi-exchange-single]')).toBeTruthy(); const points = plot().querySelector('[data-hi-exchange-curve]').getAttribute('points').split(' '); expect(new Set(points).size).toBe(1); }
      else { expect(bench().querySelector('[data-hi-exchange-single]')).toBeNull(); for (const button of presets) { await React.act(() => button.click()); check(Number(button.dataset.value), { V, A, TS, P: 'mig', TH }); } }
    }
    expect(app.latest().tech2_hi_th).toBe(0.125);
  });

  it('guards malformed probe events and clamps finite out-of-range voltage without quantizing the inverse current', async () => {
    await mount(); await click('[data-hi-exchange-capture]'); await change('[data-hi-exchange-voltage]', '23.123456789');
    for (const bad of ['', ' ', null, undefined, {}, [], 'bad', 'NaN', 'Infinity']) { await change('[data-hi-exchange-voltage]', bad); check(23.123456789); }
    await change('[data-hi-exchange-voltage]', '-5'); check(3960 / 350); await change('[data-hi-exchange-voltage]', '999'); check(40); expect(bench().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('gates capture for oxy-fuel while retaining its original calculator and any prior captured arc reference', async () => {
    const oxy = render({ hi_process: 'oxy' }); expect(oxy.querySelector('[data-hi-exchange-capture]').disabled).toBe(true); expect(oxy.querySelector('[data-hi-exchange-result]')).toBeNull(); expect(oxy.querySelector('[data-hi-exchange-arc-context]').textContent).toBe('Choose an arc process to compare voltage and current.'); expect(oxy.textContent).toContain('Arc efficiency: 55%'); expect(oxy.querySelector('svg[aria-label^="Bead cross-section"]')).toBeTruthy();
    await mount(); await click('[data-hi-exchange-capture]'); await change('[data-hi-exchange-voltage]', '26'); const saved = result().outerHTML; await pickProcess('oxy'); expect(bench().querySelector('[data-hi-exchange-capture]').disabled).toBe(true); expect(result().outerHTML).toBe(saved); await click('[data-hi-exchange-capture]'); expect(result().outerHTML).toBe(saved); check(26);
    await pickProcess('tig'); expect(bench().querySelector('[data-hi-exchange-capture]').disabled).toBe(false); check(26); await click('[data-hi-exchange-capture]'); check(22, { V: 22, A: 180, TS: 12, P: 'tig', TH: 0.25 });
  });

  it('isolates the captured snapshot and probe from calculator/process/plate changes until explicit recapture', async () => {
    const app = await mount(); const before = JSON.stringify(app.latest()), writes = app.writes.length, energy = host.querySelector('[data-hi-energy-run]').outerHTML, oldPreview = host.querySelector('svg[aria-label^="Bead cross-section"]').outerHTML;
    await click('[data-hi-exchange-capture]'); await change('[data-hi-exchange-voltage]', '26'); check(26); expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes); expect(host.querySelector('[data-hi-energy-run]').outerHTML).toBe(energy); expect(host.querySelector('svg[aria-label^="Bead cross-section"]').outerHTML).toBe(oldPreview);
    const captured = result().outerHTML; await change('input[aria-label="Voltage"]', '30'); await change('input[aria-label="Amperage"]', '240'); await change('input[aria-label="Travel Speed"]', '18'); await pickProcess('stick'); const plate = host.querySelector('[aria-label="Plate thickness for the bead preview"]').querySelectorAll('button')[3]; await React.act(() => plate.click());
    expect(result().outerHTML).toBe(captured); check(26); expect(app.latest()).toMatchObject({ hi_V: 30, hi_A: 240, hi_TS: 18, hi_process: 'stick', tech2_hi_th: 0.375 }); await click('[data-hi-exchange-capture]'); check(30, { V: 30, A: 240, TS: 18, P: 'stick', TH: 0.375 }); expect(app.writes.every(([key]) => !key.startsWith('hi4_'))).toBe(true);
  });

  it('preserves the actual notebook log, prompt/explanation reveals and main-settings Bead Lab transfer after local exchanges', async () => {
    const app = await mount(); await click('[data-hi-exchange-capture]'); await change('[data-hi-exchange-voltage]', '26'); expect(app.latest().hi_inquiry).toEqual(NOTEBOOK); expect(host.textContent).not.toContain('Find TWO different settings that both land in MEDIUM.'); expect(host.querySelector('textarea[aria-label="Explain how amperage, voltage, and speed compose heat input."]')).toBeNull();
    await textButton('📋 Log this setting'); expect(app.latest().hi_inquiry.log).toEqual([{ V: 22, A: 180, TS: 12, P: 'mig', net: 15.8, tier: 'LOW' }]); check(26);
    await textButton('🤔 Stuck? Show me some prompts'); expect(app.latest().hi_inquiry.stuckRevealed).toBe(true); expect(host.textContent).toContain('Find TWO different settings that both land in MEDIUM.'); const checkbox = host.querySelector('input[type="checkbox"]'); await React.act(() => checkbox.click()); expect(app.latest().hi_inquiry.understood).toBe(true);
    await change('textarea[aria-label="Explain how amperage, voltage, and speed compose heat input."]', 'The product stays fixed.'); expect(app.latest().hi_inquiry.explanation).toBe('The product stays fixed.'); check(26);
    const notebook = structuredClone(app.latest().hi_inquiry); await textButton('Weld these settings in the Bead Lab →'); expect(app.latest()).toMatchObject({ view: 'beadLab', bl_V: 22, bl_A: 180, bl_TS: 12, bl_process: 'mig', bl_material: 'steel', bl_thickness: 0.25 }); expect(app.latest().hi_inquiry).toEqual(notebook);
  });

  it.each([false, true])('uses44px native controls, full HTML, readable numeric axes and explicit contrast/focus without motion (contrast=%s)', async contrast => {
    await mount({}, contrast); await click('[data-hi-exchange-capture]'); expect(bench().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(bench().style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const control of bench().querySelectorAll('input,button')) expect(control.style.minHeight).toBe('44px'); const slider = bench().querySelector('[data-hi-exchange-voltage]'); expect(slider.type).toBe('range'); expect(slider.step).toBe('any'); expect(bench().querySelector(`label[for="${slider.id}"]`)).toBeTruthy(); for (const button of bench().querySelectorAll('button')) expect(button.type).toBe('button');
    expect(plot().style.width).toBe('100%'); expect(plot().style.height).toBe('auto'); expect(plot().style.maxWidth).toBe('720px'); for (const text of plot().querySelectorAll('text')) { expect(text.getAttribute('font-size')).toBe('32'); expect(text.getAttribute('font-family')).toBe('monospace'); expect(text.textContent).toMatch(/^\d{2,3}$/); } expect(num(plot().querySelector('[data-hi-exchange-current-tick="350"] text'), 'x')).toBe(58);
    const specimens = [...bench().querySelectorAll('[data-hi-exchange-specimen]')]; expect(specimens).toHaveLength(2); for (const pane of specimens) { expect(parseFloat(pane.style.minWidth)).toBe(0); expect(pane.querySelector('svg').style.maxWidth).toBe('320px'); expect(pane.querySelector('svg').style.height).toBe('auto'); expect(pane.querySelectorAll('dt')).toHaveLength(5); expect(pane.querySelectorAll('dd')).toHaveLength(5); expect(pane.querySelector('svg text')).toBeNull(); }
    expect(bench().querySelector('#hi4-reading').getAttribute('aria-live')).toBe('polite'); expect(plot().querySelector('[data-hi-exchange-marker="candidate"]').getAttribute('fill')).toBe(contrast ? '#ffff00' : '#67e8f9'); const selected = bench().querySelector('[data-hi-exchange-preset="reference"]'); expect(selected.style.background).toBe(contrast ? 'rgb(255, 255, 0)' : 'rgb(154, 52, 18)'); expect(selected.style.color).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    const css = bench().querySelector('style').textContent; for (const value of [':is(input,button):focus-visible', 'outline:3px solid ' + (contrast ? '#ffff00' : '#9a3412') + '!important', 'transition:none!important', 'animation:none!important']) expect(css).toContain(value); expect(bench().querySelector('animate,animateTransform,canvas,filter,linearGradient,radialGradient')).toBeNull();
  });

  it('restores the complete original Heat Input function after removing only the one local snapshot hook/helper/call', () => {
    const source = stripWeldlabWcagFixes(readFileSync(SRC, 'utf8')).replace(/\r\n/g, '\n'); const start = source.indexOf('      function HeatInputCalculator() {'), end = source.indexOf('      function WeldBeadLab() {', start); let region = source.slice(start, end);
    const helperAt = region.indexOf('        function renderEqualHeatExchange() {'), helperEnd = region.indexOf('        function renderEnergyRun() {', helperAt); expect(helperAt).toBeGreaterThan(0); expect(helperEnd).toBeGreaterThan(helperAt); const helper = region.slice(helperAt, helperEnd); expect(helper).not.toMatch(/usePersisted|\bupd\(|setNotebook\(|setV\(|setA\(|setTS\(|setP\(|setHiTH\(|setInterval|setTimeout|requestAnimationFrame/); region = region.slice(0, helperAt) + region.slice(helperEnd);
    for (const line of ['        var hiExchangeState = useState(null);', '            renderEqualHeatExchange(),']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line + '\n', ''); }
    expect(createHash('sha256').update(region).digest('hex')).toBe('305938d88148bf9e9720edb8719171ee445604fa768d9c8e68866fd0f71d6a14');
  });
});
