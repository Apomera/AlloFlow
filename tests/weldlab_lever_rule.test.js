import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'metallurgy', met_sect: 'phase', met2_fecC: 0.4, met2_fecT: 850, met2_hazH: 16, met2_hazTh: 0.25, met2_hazProbe: 2, met2_hazPred: -1, met2_ceFree: false, met2_cePred: null, met2_ceTally: { n: 4, right: 3 }, met2_cdIdx: 0, met2_cdPicks: {}, weldBadges: {}, defectCatalog: {}, speedBest: {} };
const LOW = 0.022, HIGH = 0.77, SPAN = HIGH - LOW, ORIGIN = 64, WIDTH = 592;
let root, host;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const bench = () => host.querySelector('[data-lever-bench]');
const plot = () => bench().querySelector('[data-lever-plot]');
const num = (node, attr) => Number(node.getAttribute(attr));
async function change(selector, value) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
async function click(selector) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function textButton(text) { const node = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(node, text).toBeTruthy(); await React.act(() => node.click()); }
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
function check(carbon, full = true) {
  const pearl = (carbon - LOW) / SPAN, ferrite = 1 - pearl, x = ORIGIN + WIDTH * pearl;
  expect(num(bench(), 'data-carbon')).toBe(carbon); expect(num(bench(), 'data-pearlite')).toBeCloseTo(pearl, 13); expect(num(bench(), 'data-ferrite')).toBeCloseTo(ferrite, 13);
  expect(num(bench(), 'data-pearlite')).toBeCloseTo(window.__WeldLabCore.met2PearliteFraction(carbon), 13);
  expect(num(bench(), 'data-pearlite') + num(bench(), 'data-ferrite')).toBeCloseTo(1, 13);
  const weighted = num(bench(), 'data-ferrite') * LOW + num(bench(), 'data-pearlite') * HIGH;
  expect(weighted).toBeCloseTo(carbon, 13); expect(num(bench(), 'data-weighted-carbon')).toBeCloseTo(weighted, 13); expect(num(bench().querySelector('[data-lever-weighted]'), 'data-value')).toBeCloseTo(weighted, 13);
  const left = plot().querySelector('[data-lever-tie-arm="left"]'), right = plot().querySelector('[data-lever-tie-arm="right"]');
  expect(left.dataset.shareFor).toBe('pearlite'); expect(right.dataset.shareFor).toBe('ferrite');
  expect(num(left, 'x1')).toBe(ORIGIN); expect(num(left, 'x2')).toBeCloseTo(x, 12); expect(num(right, 'x1')).toBeCloseTo(x, 12); expect(num(right, 'x2')).toBe(ORIGIN + WIDTH);
  expect(num(left, 'data-composition-length')).toBeCloseTo(carbon - LOW, 13); expect(num(right, 'data-composition-length')).toBeCloseTo(HIGH - carbon, 13);
  expect((num(left, 'x2') - num(left, 'x1')) / WIDTH).toBeCloseTo(pearl, 13); expect((num(right, 'x2') - num(right, 'x1')) / WIDTH).toBeCloseTo(ferrite, 13);
  expect(num(plot().querySelector('[data-lever-pivot]'), 'data-x')).toBeCloseTo(x, 12); expect(num(plot().querySelector('[data-lever-pivot] line'), 'x1')).toBeCloseTo(x, 12);
  const f = plot().querySelector('[data-lever-share="ferrite"]'), p = plot().querySelector('[data-lever-share="pearlite"]');
  expect(num(f, 'x')).toBe(ORIGIN); expect(num(f, 'width')).toBeCloseTo(WIDTH * ferrite, 12); expect(num(p, 'x')).toBeCloseTo(ORIGIN + WIDTH * ferrite, 12); expect(num(p, 'width')).toBeCloseTo(WIDTH * pearl, 12);
  expect(num(f, 'width') + num(p, 'width')).toBeCloseTo(WIDTH, 12); expect(num(p, 'x') + num(p, 'width')).toBeCloseTo(ORIGIN + WIDTH, 12);
  const hatch = plot().querySelector('[data-lever-share-hatch]'), join = plot().querySelector('[data-lever-share-join]'); expect(hatch.getAttribute('x')).toBe(p.getAttribute('x')); expect(hatch.getAttribute('width')).toBe(p.getAttribute('width')); expect(join.getAttribute('x1')).toBe(p.getAttribute('x')); expect(join.getAttribute('x2')).toBe(p.getAttribute('x'));
  if (!full) return;
  for (const [id, value, arm, armId, expression] of [['ferrite', ferrite, HIGH - carbon, 'B', HIGH.toFixed(3) + ' − ' + carbon.toFixed(3)], ['pearlite', pearl, carbon - LOW, 'A', carbon.toFixed(3) + ' − ' + LOW.toFixed(3)]]) {
    const reading = bench().querySelector(`[data-lever-reading="${id}"]`); expect(reading.dataset.arm).toBe(armId); expect(num(reading, 'data-arm-length')).toBeCloseTo(arm, 13); expect(num(reading, 'data-fraction')).toBeCloseTo(value, 13);
    expect(reading.querySelector(`[data-lever-percent="${id}"]`).textContent).toBe((value * 100).toFixed(1) + '%');
    expect(reading.querySelector('[data-lever-formula]').textContent).toBe('(' + expression + ') ÷ (0.770 − 0.022) ≈ ' + value.toFixed(6));
    expect(reading.textContent).toContain('Opposite arm ' + armId + ': ' + arm.toFixed(3) + ' wt% C.');
  }
  expect(bench().querySelector('[data-lever-weighted]').textContent).toBe(`Composition balance: ${ferrite.toFixed(6)} × 0.022 + ${pearl.toFixed(6)} × 0.770 ≈ ${carbon.toFixed(3)} wt% C.`);
  expect(bench().querySelector('output').textContent).toBe(carbon.toFixed(3) + ' wt% C'); expect(bench().querySelector('[data-lever-carbon]').getAttribute('aria-valuetext')).toBe(carbon.toFixed(3) + ' wt% C');
}

describe('Plain-carbon eutectoid-reference lever-rule bench', () => {
  it('starts at a separate0.400wt%C reference and explains constituent, phase, temperature and rounding limits', async () => {
    await mount(); check(0.4); expect(window.__WeldLabCore.met2.ALPHA_MAX_C).toBe(LOW); expect(window.__WeldLabCore.met2.EUTECTOID_C).toBe(HIGH);
    expect(bench().querySelector('[data-lever-reference]').textContent).toBe('Reference just below 727 °C. Composition endpoints: proeutectoid ferrite 0.022 wt% C and average pearlite 0.770 wt% C.');
    expect(bench().textContent).toContain('after slow equilibrium cooling from austenite'); expect(bench().querySelector('[data-lever-reading="ferrite"] h5').textContent).toBe('Proeutectoid ferrite (α)'); expect(bench().querySelector('[data-lever-reading="pearlite"] h5').textContent).toBe('Pearlite constituent (P)');
    for (const text of ['not a single phase', 'not the ferrite within pearlite', 'not to ferrite solubility at room temperature', 'rounded to six decimals and percentages to one decimal', 'geometry uses the unrounded values', 'independent of the temperature and carbon controls above']) expect(bench().querySelector('[data-lever-note]').textContent).toContain(text);
    expect(bench().querySelector('[data-lever-share-key]').textContent).toContain('groups amounts, not grain shapes or positions');
    expect([...bench().querySelectorAll('[data-lever-source]')].map(link => link.href)).toEqual(['https://www.princeton.edu/~maelabs/mae324/09/09mae_39.htm', 'https://www.princeton.edu/~maelabs/mae324/09/09mae_36.htm']);
  });

  it('matches the existing helper, weighted composition and true opposite-arm/share geometry at every749 permitted composition steps', async () => {
    await mount(); let count = 0;
    for (let milli = 22; milli <= 770; milli++) { const carbon = milli / 1000; await change('[data-lever-carbon]', carbon.toFixed(3)); check(carbon, milli % 10 === 0 || milli === 22 || milli === 770); count++; }
    expect(count).toBe(749);
  }, 60000);

  it('makes endpoint shares and tie arms genuinely zero or full width without inflation and keeps all four presets exact', async () => {
    await mount();
    for (const carbon of [LOW, 0.2, 0.4, HIGH]) { await click(`[data-lever-preset="${carbon}"]`); check(carbon); expect(bench().querySelector(`[data-lever-preset="${carbon}"]`).getAttribute('aria-pressed')).toBe('true'); }
    await click('[data-lever-preset="0.022"]'); expect(num(plot().querySelector('[data-lever-share="pearlite"]'), 'width')).toBe(0); expect(num(plot().querySelector('[data-lever-share-hatch]'), 'width')).toBe(0); expect(plot().querySelector('[data-lever-tie-arm="left"]').getAttribute('x1')).toBe(plot().querySelector('[data-lever-tie-arm="left"]').getAttribute('x2'));
    await click('[data-lever-preset="0.77"]'); expect(num(bench(), 'data-pearlite')).toBe(1); expect(num(plot().querySelector('[data-lever-share="ferrite"]'), 'width')).toBe(0); expect(plot().querySelector('[data-lever-tie-arm="right"]').getAttribute('x1')).toBe(plot().querySelector('[data-lever-tie-arm="right"]').getAttribute('x2'));
    await change('[data-lever-carbon]', '0.023'); expect(num(plot().querySelector('[data-lever-share="pearlite"]'), 'width')).toBeGreaterThan(0); expect(num(plot().querySelector('[data-lever-share="pearlite"]'), 'width')).toBeLessThan(1);
  });

  it('keeps both reference scales, hatch pitch and common span fixed as the probe moves', async () => {
    await mount(); const fixed = () => [...plot().querySelectorAll('[data-lever-composition-axis],[data-lever-composition-tick],[data-lever-share-tick],[data-lever-share-outline],pattern')].map(node => node.outerHTML); const original = fixed();
    expect(plot().getAttribute('viewBox')).toBe('0 0 720 360'); expect(plot().querySelector('[data-lever-composition-axis]').getAttribute('d')).toBe('M64 78 H656');
    expect([...plot().querySelectorAll('[data-lever-composition-tick]')].map(node => Number(node.dataset.leverCompositionTick))).toEqual([LOW, 0.2, 0.4, 0.6, HIGH]);
    for (const tick of plot().querySelectorAll('[data-lever-composition-tick]')) expect(num(tick.querySelector('line'), 'x1')).toBeCloseTo(ORIGIN + WIDTH * (Number(tick.dataset.leverCompositionTick) - LOW) / SPAN, 12);
    for (const tick of plot().querySelectorAll('[data-lever-share-tick]')) expect(num(tick.querySelector('line'), 'x1')).toBe(ORIGIN + WIDTH * Number(tick.dataset.leverShareTick) / 100);
    for (const carbon of ['0.022', '0.023', '0.200', '0.400', '0.769', '0.770']) { await change('[data-lever-carbon]', carbon); expect(fixed()).toEqual(original); }
    const pattern = plot().querySelector('#metal11-pearlite-hatch'); expect(pattern.getAttribute('patternUnits')).toBe('userSpaceOnUse'); expect(pattern.getAttribute('width')).toBe('8'); expect(pattern.getAttribute('height')).toBe('8'); expect(plot().querySelector('[data-lever-tie-arm="left"]').getAttribute('stroke-dasharray')).toBe('9 4'); expect(plot().querySelector('[data-lever-tie-arm="right"]').hasAttribute('stroke-dasharray')).toBe(false);
  });

  it('ignores malformed events and lookalike saved keys, clamps bounds and preserves the native0.001 step', async () => {
    await mount({ metal11_carbon: 0.77 }); check(0.4); const slider = bench().querySelector('[data-lever-carbon]'); expect(slider.min).toBe('0.022'); expect(slider.max).toBe('0.77'); expect(slider.step).toBe('0.001');
    for (const bad of ['', ' ', null, undefined, {}, [], 'bad', 'Infinity', 'NaN']) { await change('[data-lever-carbon]', bad); check(0.4); }
    for (const [raw, expected] of [['-99', LOW], ['99', HIGH], ['0.4004', 0.4], ['0.4006', 0.401]]) { await change('[data-lever-carbon]', raw); check(expected); }
    expect(bench().outerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('keeps the local reference independent from the original FeC controls and crystal inspector, with no saved writes', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    const originalDiagram = host.querySelector('svg[aria-label^="Iron-carbon diagram"]').outerHTML, crystal = host.querySelector('[data-crystal-inspector]').outerHTML;
    for (const carbon of ['0.022', '0.2', '0.77', '0.333']) await change('[data-lever-carbon]', carbon);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes); expect(host.querySelector('svg[aria-label^="Iron-carbon diagram"]').outerHTML).toBe(originalDiagram); expect(host.querySelector('[data-crystal-inspector]').outerHTML).toBe(crystal);
    await change('#met2-fec-c', '0.95'); await change('#met2-fec-t', '1200'); check(0.333); expect(app.latest()).toMatchObject({ met2_fecC: 0.95, met2_fecT: 1200 });
    await click('[data-crystal-select="fcc"]'); check(0.333); expect(app.latest().met2_ceTally).toEqual(BASE.met2_ceTally); expect(app.latest().met2_cdPicks).toEqual({}); expect(app.writes.every(([key]) => key === 'met2_fecC' || key === 'met2_fecT')).toBe(true);
  });

  it('preserves the HAZ and CE prediction gates and first-answer Crack Detective behavior through navigation', async () => {
    const app = await mount(); await change('[data-lever-carbon]', '0.6');
    await textButton('🔥 HAZ microstructure'); expect(bench()).toBeNull(); expect(host.querySelector('#met2-haz-h').disabled).toBe(true); expect(host.querySelector('[aria-label="Your heat-input prediction"] [aria-checked="true"]')).toBeNull(); expect(app.latest().met2_hazPred).toBe(-1);
    await textButton('🧮 Carbon Equivalent'); expect(bench()).toBeNull(); expect(host.querySelector('[data-met-ce-workbench]')).toBeNull(); expect(host.querySelector('[aria-label="Your CE band prediction"] [aria-checked="true"]')).toBeNull(); expect(app.latest().met2_cePred).toBeNull(); expect(app.latest().met2_ceFree).toBe(false); expect(app.latest().met2_ceTally).toEqual(BASE.met2_ceTally);
    await textButton('🌡 Phase diagrams'); check(0.6); await textButton('💥 Hot + cold cracking'); expect(bench()).toBeNull(); expect(host.textContent).not.toContain('Why not A:'); expect(host.textContent).not.toContain('✅ Right:');
    const options = [...host.querySelectorAll('[aria-label="Which cracking mechanism is it?"] [role="radio"]')]; expect(options).toHaveLength(4); await React.act(() => options[0].click()); expect(app.latest().met2_cdPicks).toEqual({ 0: 0 }); expect(host.textContent).toContain('Why not'); await React.act(() => options[1].click()); expect(app.latest().met2_cdPicks).toEqual({ 0: 0 });
    await textButton('🌡 Phase diagrams'); check(0.6); await textButton('See it happen in the HAZ Explorer →'); expect(bench()).toBeNull(); expect(host.querySelector('#met2-haz-h').disabled).toBe(true);
  });

  it('retains the five original phase notes and warning and stays exclusive to the Phase section', () => {
    const phase = render();
    for (const text of ['Between A1 and A3 it shares the steel with ferrite. Face-centered cubic crystal.', 'Body-centered cubic. Holds very little carbon (at most about 0.022 %).', 'Mixture of ferrite + cementite (Fe3C) in alternating lamellar layers.', 'Super-saturated body-centered tetragonal phase.', 'Intermediate cooling rate. Acicular structure.', 'This is why preheat matters', ': slowing the cooling rate prevents martensite formation.']) expect(phase.textContent).toContain(text);
    for (const met_sect of ['overview', 'haz', 'ce', 'stainless', 'aluminum', 'cracking', 'pwht', 'bad']) expect(render({ met_sect }).querySelector('[data-lever-bench]')).toBeNull();
  });

  it.each([false, true])('provides complete HTML, native44px controls, non-color distinctions and strong focus without motion (contrast=%s)', async contrast => {
    await mount({}, contrast); expect(bench().style.background).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'); expect(bench().style.color).toBe(contrast ? 'rgb(255, 255, 255)' : 'rgb(15, 23, 42)');
    for (const control of bench().querySelectorAll('input,button,a')) expect(control.style.minHeight).toBe('44px');
    const slider = bench().querySelector('[data-lever-carbon]'); expect(slider.type).toBe('range'); expect(bench().querySelector(`label[for="${slider.id}"]`)).toBeTruthy(); expect(slider.style.height).toBe('44px');
    for (const button of bench().querySelectorAll('button')) { expect(button.type).toBe('button'); expect(bench().querySelector('#' + button.getAttribute('aria-controls'))).toBeTruthy(); }
    const selected = bench().querySelector('[data-lever-preset="0.4"]'); expect(selected.style.background).toBe(contrast ? 'rgb(255, 255, 0)' : 'rgb(7, 89, 133)'); expect(selected.style.color).toBe(contrast ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    expect(plot().querySelector('[data-lever-share="ferrite"]').getAttribute('fill')).toBe(contrast ? '#ffffff' : '#67e8f9'); expect(plot().querySelector('[data-lever-share="pearlite"]').getAttribute('fill')).toBe(contrast ? '#ffff00' : '#fbbf24'); expect(plot().querySelector('[data-lever-share-hatch]').getAttribute('fill')).toBe('url(#metal11-pearlite-hatch)'); expect(plot().querySelector('[data-lever-share-join]').getAttribute('stroke')).toBe('#0f172a');
    expect(plot().style.width).toBe('100%'); expect(plot().style.height).toBe('auto'); expect(plot().style.maxWidth).toBe('720px'); expect(plot().getAttribute('aria-label')).toContain('Left arm A gives the pearlite share; right arm B gives the proeutectoid ferrite share');
    expect(bench().querySelector('#metal11-reading').getAttribute('aria-live')).toBe('polite'); expect(bench().querySelectorAll('[data-lever-reading]')).toHaveLength(2); for (const text of bench().querySelectorAll('[data-lever-formula],[data-lever-weighted],[data-lever-note]')) expect(text.className).toContain('text-base');
    const css = bench().querySelector('style').textContent; for (const text of [':is(button,input,a):focus-visible', 'outline:3px solid ' + (contrast ? '#ffff00' : '#075985') + '!important', 'transition:none!important', 'animation:none!important']) expect(css).toContain(text);
    expect(bench().querySelector('animate,animateTransform,canvas,filter,linearGradient,radialGradient,select')).toBeNull(); expect(bench().querySelectorAll('input')).toHaveLength(1);
  });

  it('restores the complete pre-bench Metallurgy region after removing only the one local hook, helper and Phase call', () => {
    const source = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n'); const start = source.indexOf('      function MetallurgyDeepDive() {'), end = source.indexOf('      function CodesAndStandards() {', start); let region = source.slice(start, end);
    const helperAt = region.indexOf('        function renderLeverRuleBench() {'), helperEnd = region.indexOf('        function renderFeCExplorer() {', helperAt); expect(helperAt).toBeGreaterThan(0); expect(helperEnd).toBeGreaterThan(helperAt); region = region.slice(0, helperAt) + region.slice(helperEnd);
    for (const line of ['        var leverCarbonState = useState(0.4);', '            renderLeverRuleBench(),']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line + '\n', ''); }
    expect(createHash('sha256').update(region).digest('hex')).toBe('c1d07995a2ab7e1ec7a77aeca06c66cee41c97fd2c6585a3c4312bea53dc7e17');
  });
});
