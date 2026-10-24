import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'consumables', cons_sect: 'cost', cons_mode: 'browse', cons_sc_idx: 2, cons_sc_score: 1, cons_sc_picked: null, tech2_cons_code: 'E7018', tech2_cons_proc: 'fcaw', tech2_cons_leg: 0.375, tech2_cons_rate: 80, weldBadges: {}, defectCatalog: {}, speedBest: {} };
const REFERENCES = [
  ['smaw', 0.60, 0.75], ['gmaw_sc', 0.90, 0.95], ['gmaw_spray', 0.90, 0.95],
  ['fcaw', 0.80, 0.90], ['gtaw', 0.95, 1.00], ['saw', 0.95, 0.99]
];
const MILLER = 'https://www.millerwelds.com/en-us/case-studies/mechanical-contractor-diversifies-to-meet-mid-atlantic-demand';
let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const bench = () => host.querySelector('[data-mass-balance]');
const plot = () => bench().querySelector('[data-mass-plot]');
async function change(selector, value) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value } })); }
async function click(selector) { const node = host.querySelector(selector); expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function textButton(text) { const node = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(node, text).toBeTruthy(); await React.act(() => node.click()); }
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
function checkMass(id, target, efficiency) {
  const input = target / efficiency, remainder = input - target;
  expect(bench().dataset.process).toBe(id);
  for (const [key, value] of Object.entries({ target, efficiency, input, remainder })) expect(Number(bench().dataset[key])).toBeCloseTo(value, 13);
  expect(Number(bench().dataset.input) * efficiency).toBeCloseTo(target, 13);
  expect(Number(bench().dataset.target) + Number(bench().dataset.remainder)).toBeCloseTo(input, 13);
  const bars = [
    [plot().querySelector('[data-mass-target-bar]'), target, 64],
    [plot().querySelector('[data-mass-segment="deposited"]'), target, 64],
    [plot().querySelector('[data-mass-segment="remainder"]'), remainder, 64 + target * 70],
    [plot().querySelector('[data-mass-input-outline]'), input, 64]
  ];
  for (const [rect, value, x] of bars) {
    expect(Number(rect.dataset.value)).toBeCloseTo(value, 13); expect(Number(rect.getAttribute('x'))).toBeCloseTo(x, 12);
    expect(Number(rect.getAttribute('width'))).toBeCloseTo(value * 70, 12); expect(Number(rect.getAttribute('height'))).toBe(34);
    expect(Number(rect.getAttribute('x')) + Number(rect.getAttribute('width'))).toBeLessThan(624);
  }
  expect(Number(bars[1][0].getAttribute('width')) + Number(bars[2][0].getAttribute('width'))).toBeCloseTo(Number(bars[3][0].getAttribute('width')), 12);
  const hatch = plot().querySelector('[data-mass-remainder-hatch]'), join = plot().querySelector('[data-mass-join]');
  expect(Number(hatch.getAttribute('x'))).toBeCloseTo(64 + target * 70, 12); expect(Number(hatch.getAttribute('width'))).toBeCloseTo(remainder * 70, 12);
  expect(hatch.getAttribute('fill')).toBe('url(#cons11-remainder-hatch)'); expect(Number(hatch.getAttribute('height'))).toBe(34);
  expect(Number(join.getAttribute('x1'))).toBeCloseTo(64 + target * 70, 12); expect(join.getAttribute('x1')).toBe(join.getAttribute('x2')); expect(join.getAttribute('y1')).toBe('150'); expect(join.getAttribute('y2')).toBe('184');
  for (const [key, value] of Object.entries({ input, deposited: target, remainder })) {
    const reading = bench().querySelector(`[data-mass-reading="${key}"]`); expect(Number(reading.dataset.value)).toBeCloseTo(value, 13); expect(reading.querySelector('dd').textContent).toBe(value.toFixed(3) + ' lb');
  }
  expect(bench().querySelector('[data-mass-identity]').textContent).toBe(`Input ${input.toFixed(3)} lb = deposited ${target.toFixed(3)} lb + not deposited ${remainder.toFixed(3)} lb.`);
  expect(bench().querySelector('[data-mass-inverse]').textContent).toBe(`Target ${target.toFixed(3)} lb ÷ efficiency ${efficiency.toFixed(3)} = input ${input.toFixed(3)} lb.`);
  expect(bench().querySelector('[data-mass-target]').value).toBe(String(target)); expect(bench().querySelector('output').textContent).toBe(target.toFixed(1) + ' lb');
}

describe('Consumables representative filler-mass balance bench', () => {
  it('starts from a local SMAW one-pound target and exposes exactly the existing six process ranges', async () => {
    await mount(); checkMass('smaw', 1, 0.675);
    expect([...bench().querySelector('[data-mass-process]').options].map(option => option.value)).toEqual(REFERENCES.map(row => row[0]));
    const authored = window.__WeldLabCore.tech2.CONS_PROC; expect(authored.map(row => [row.id, ...row.eff])).toEqual(REFERENCES);
    expect(bench().querySelector('[data-mass-midpoint]').textContent).toBe('Representative deposition efficiency: 67.5% — midpoint of this lesson’s 60–75% range.');
    expect(bench().querySelector('[data-mass-source]').getAttribute('href')).toBe(MILLER);
    expect(bench().querySelector('[data-mass-note]').textContent).toContain('accounting total, not a measured breakdown of losses');
    expect(bench().querySelector('[data-mass-note]').textContent).toContain('Deposition efficiency concerns filler mass; the Heat Input module’s arc efficiency concerns energy.');
    expect(bench().textContent).toContain('hatched remainder after the solid deposited portion; a dark line marks their join');
  });

  it('conserves mass and plots actual inverse-efficiency input across all six processes and ten target amounts', async () => {
    await mount(); let checked = 0;
    for (const [id, low, high] of REFERENCES) {
      await change('[data-mass-process]', id); const efficiency = (low + high) / 2;
      expect(bench().querySelector('[data-mass-midpoint]').textContent).toBe(`Representative deposition efficiency: ${Number((efficiency * 100).toFixed(2))}% — midpoint of this lesson’s ${Number((low * 100).toFixed(2))}–${Number((high * 100).toFixed(2))}% range.`);
      for (let index = 1; index <= 10; index++) { await change('[data-mass-target]', String(index / 2)); checkMass(id, index / 2, efficiency); checked++; }
    }
    expect(checked).toBe(60);
    await change('[data-mass-process]', 'gtaw'); await change('[data-mass-target]', '0.5');
    const small = Number(plot().querySelector('[data-mass-segment="remainder"]').getAttribute('width')); expect(small).toBeGreaterThan(0); expect(small).toBeLessThan(1);
  }, 30000);

  it('holds one fixed zero-to-eight-pound axis while the actual bars change without minimum-width inflation', async () => {
    await mount(); const axis = () => [...plot().querySelectorAll('[data-mass-axis],[data-mass-axis-tick]')].map(node => node.outerHTML); const original = axis();
    expect(plot().getAttribute('viewBox')).toBe('0 0 720 280'); expect(plot().querySelector('[data-mass-axis]').getAttribute('d')).toBe('M64 228 H624');
    expect([...plot().querySelectorAll('[data-mass-axis-tick]')].map(node => node.dataset.massAxisTick)).toEqual(['0', '2', '4', '6', '8']);
    for (const tick of plot().querySelectorAll('[data-mass-axis-tick]')) expect(Number(tick.querySelector('text').getAttribute('x'))).toBe(64 + Number(tick.dataset.massAxisTick) * 70);
    for (const [id] of REFERENCES) for (const target of ['0.5', '5']) { await change('[data-mass-process]', id); await change('[data-mass-target]', target); expect(axis()).toEqual(original); }
    await change('[data-mass-process]', 'smaw'); checkMass('smaw', 5, 0.675); expect(Number(bench().dataset.input)).toBeLessThan(8);
  });

  it('bounds finite target input, preserves half-pound steps and ignores malformed process and target events', async () => {
    await mount(); await change('[data-mass-process]', 'saw'); await change('[data-mass-target]', '2');
    for (const bad of ['', null, 'bad', 'Infinity', 'NaN']) { await change('[data-mass-target]', bad); checkMass('saw', 2, 0.97); }
    for (const bad of ['', null, 'GMAW', '__proto__', 'gmaw', 'NaN']) { await change('[data-mass-process]', bad); checkMass('saw', 2, 0.97); }
    for (const [raw, expected] of [[-1, 0.5], [999, 5], [1.2, 1], [1.3, 1.5]]) { await change('[data-mass-target]', String(raw)); checkMass('saw', expected, 0.97); }
    for (const target of [0.5, 1, 5]) { await click(`[data-mass-preset="${target}"]`); checkMass('saw', target, 0.97); expect(bench().querySelector(`[data-mass-preset="${target}"]`).getAttribute('aria-pressed')).toBe('true'); }
  });

  it('keeps all bench controls local and preserves calculator values and independent lesson work across tabs', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    const originalCost = host.querySelector('[data-cons-cost-breakdown]').outerHTML, originalRate = host.querySelector('[data-cons-rate-lens]').outerHTML;
    await change('[data-mass-process]', 'gtaw'); await change('[data-mass-target]', '4.5');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes); expect(host.querySelector('[data-cons-cost-breakdown]').outerHTML).toBe(originalCost); expect(host.querySelector('[data-cons-rate-lens]').outerHTML).toBe(originalRate);
    const expected = window.__WeldLabCore.tech2.costPerFoot('fcaw', 0.375, 80), cost = host.querySelector('[data-cons-cost-breakdown]');
    for (const [key, value] of Object.entries({ filler: expected.filler, labour: expected.labor, total: expected.total })) expect(Number(cost.dataset[key])).toBeCloseTo(value, 12);
    await textButton('💨 Shielding gases'); expect(bench()).toBeNull(); expect(host.querySelector('[data-gas-composition]').dataset).toMatchObject({ mixA: '1', mixB: '2', component: 'CO2' }); expect(host.querySelector('[data-cons-shield]').dataset.consShield).toBe('recommended'); expect(host.querySelector('[data-oxy-flame-bench]').dataset.oxyFlameBench).toBe('neutral');
    await textButton('✏ TIG filler rods + tungsten'); expect(host.querySelector('[data-tungsten-bench]').dataset).toMatchObject({ tungstenBench: 'EWLa-2', focus: 'classification', compare: 'false' });
    await textButton('💰 Cost economics'); checkMass('gtaw', 4.5, 0.975); expect(app.latest()).toMatchObject(BASE);
  });

  it('does not bind the new local example to saved calculator changes or lookalike persisted keys', async () => {
    const app = await mount({ cons11_process: 'saw', cons11_target: 5 }); checkMass('smaw', 1, 0.675);
    await change('[data-mass-process]', 'gtaw'); await change('[data-mass-target]', '3');
    await change('input[aria-label="Labour + overhead"]', '100'); await change('input[aria-label="Fillet leg size"]', '0.5');
    const process = host.querySelector('[role="radiogroup"][aria-label="Process"]'); await React.act(() => process.querySelectorAll('button')[0].click());
    checkMass('gtaw', 3, 0.975); expect(app.latest()).toMatchObject({ tech2_cons_proc: 'smaw', tech2_cons_leg: 0.5, tech2_cons_rate: 100, cons11_process: 'saw', cons11_target: 5 });
    expect(app.writes.every(([key]) => !key.startsWith('cons11_'))).toBe(true);
  });

  it('stays outside all scored scenarios and preserves the original answer and repeat-credit gates', async () => {
    const app = await mount(); await change('[data-mass-process]', 'saw'); await change('[data-mass-target]', '5'); await textButton('🎯 Pick the right consumable');
    expect(bench()).toBeNull(); expect(host.textContent).not.toContain('Why:'); expect(host.textContent).not.toContain('Why not'); expect(host.textContent).not.toContain('Next scenario →'); expect(app.latest().cons_sc_picked).toBeNull();
    const options = [...host.querySelectorAll('[role="radio"]')]; expect(options).toHaveLength(4); await React.act(() => options[0].click()); const committed = { picked: app.latest().cons_sc_picked, score: app.latest().cons_sc_score };
    expect(host.textContent).toMatch(/Why:|Why not/); expect(host.textContent).toContain('Next scenario →'); await React.act(() => options[1].click()); expect(app.latest().cons_sc_picked).toBe(committed.picked); expect(app.latest().cons_sc_score).toBe(committed.score);
    for (let cons_sc_idx = 0; cons_sc_idx < 8; cons_sc_idx++) { const node = render({ cons_mode: 'scenarios', cons_sc_idx, cons_sc_picked: null }); expect(node.querySelector('[data-mass-balance]')).toBeNull(); expect(node.querySelectorAll('[role="radio"]')).toHaveLength(4); expect(node.textContent).not.toContain('Why:'); expect(node.textContent).not.toContain('Why not'); }
    for (const cons_sect of ['overview', 'sticks', 'mig_wires', 'decoder', 'tig_rods', 'storage', 'gases']) expect(render({ cons_sect }).querySelector('[data-mass-balance]')).toBeNull();
  });

  it('provides full HTML readings, native 44px controls, strong contrast and fixed unmoving geometry', async () => {
    await mount({}, true); expect(bench().style.background).toBe('rgb(0, 0, 0)'); expect(bench().style.color).toBe('rgb(255, 255, 255)');
    for (const control of bench().querySelectorAll('button,select,a')) expect(control.style.minHeight).toBe('44px');
    const range = bench().querySelector('[data-mass-target]'); expect(range.type).toBe('range'); expect(range.min).toBe('0.5'); expect(range.max).toBe('5'); expect(range.step).toBe('0.5'); expect(range.style.height).toBe('44px');
    for (const control of bench().querySelectorAll('select,input')) expect(bench().querySelector(`label[for="${control.id}"]`)).toBeTruthy();
    for (const control of bench().querySelectorAll('button')) { expect(control.type).toBe('button'); expect(bench().querySelector('#' + control.getAttribute('aria-controls'))).toBeTruthy(); }
    expect(bench().querySelector('[data-mass-preset="1"]').style.background).toBe('rgb(255, 255, 0)'); expect(bench().querySelector('[data-mass-preset="1"]').style.color).toBe('rgb(0, 0, 0)');
    expect(plot().querySelector('[data-mass-segment="deposited"]').getAttribute('fill')).toBe('#ffffff'); expect(plot().querySelector('[data-mass-segment="remainder"]').getAttribute('fill')).toBe('#ffff00');
    const hatch = plot().querySelector('#cons11-remainder-hatch'); expect(hatch.getAttribute('patternUnits')).toBe('userSpaceOnUse'); expect(hatch.getAttribute('width')).toBe('8'); expect(hatch.getAttribute('height')).toBe('8'); expect(hatch.querySelector('path').getAttribute('stroke')).toBe('#0f172a'); expect(plot().querySelector('[data-mass-join]').getAttribute('stroke')).toBe('#0f172a');
    expect(plot().style.width).toBe('100%'); expect(plot().style.height).toBe('auto'); expect(plot().style.maxWidth).toBe('720px'); expect(plot().getAttribute('aria-label')).toContain('Fixed zero-to-8 pound mass scale');
    expect(bench().querySelector('#cons11-reading').getAttribute('aria-live')).toBe('polite'); expect(bench().querySelector('[data-mass-identity]').className).toContain('text-base'); expect(bench().querySelectorAll('dl dt')).toHaveLength(3); expect(bench().querySelectorAll('dl dd')).toHaveLength(3);
    const css = bench().querySelector('style').textContent; for (const value of ['button,select,input,a', 'focus-visible', 'outline:3px solid #ffff00!important', 'transition:none!important', 'animation:none!important']) expect(css).toContain(value);
    expect(bench().querySelector('animate,animateTransform,filter,linearGradient,radialGradient')).toBeNull(); expect(bench().querySelectorAll('input')).toHaveLength(1);
  });

  it('restores the entire prior Consumables lesson by removing only two local hooks, one helper and one cost-section call', () => {
    const source = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n'); const start = source.indexOf('      function ConsumablesDeepDive() {'), end = source.indexOf('      function MaineEcosystem() {', start); let region = source.slice(start, end);
    // Reverse only the later optional classification comparison before this historical baseline.
    const comparisonAt = region.indexOf('        function renderCodeComparison(current, pinned) {');
    if (comparisonAt >= 0) {
      const comparisonEnd = region.indexOf('        function renderDecoder() {', comparisonAt); expect(comparisonEnd).toBeGreaterThan(comparisonAt); region = region.slice(0, comparisonAt) + region.slice(comparisonEnd);
      const controlsAt = region.indexOf("            h('div', { 'data-cons-code-controls':"), controlsEnd = region.indexOf("            h('div', { id: 'tech2-dec-result',", controlsAt); expect(controlsAt).toBeGreaterThan(0); expect(controlsEnd).toBeGreaterThan(controlsAt); region = region.slice(0, controlsAt) + region.slice(controlsEnd);
      for (const line of ['        var consPinnedState = useState(null);\n', '          var pinnedDecoded = consPinnedState[0] ? tech2Decode(consPinnedState[0]) : null;\n', '          if (!pinnedDecoded || !pinnedDecoded.ok) pinnedDecoded = null;\n', '              r.ok && pinnedDecoded && renderCodeComparison(r, pinnedDecoded),\n']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line, ''); }
      expect(region.split('r.ok && !pinnedDecoded &&')).toHaveLength(3); region = region.replaceAll('r.ok && !pinnedDecoded &&', 'r.ok &&');
    }

    const helperAt = region.indexOf('        function renderMassBalance() {'), helperEnd = region.indexOf('        function renderConsRateLens() {', helperAt); expect(helperAt).toBeGreaterThan(0); expect(helperEnd).toBeGreaterThan(helperAt);
    region = region.slice(0, helperAt) + region.slice(helperEnd);
    for (const line of ["        var massProcessState = useState('smaw');", '        var massTargetState = useState(1);', '            renderMassBalance(),']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line + '\n', ''); }
    expect(createHash('sha256').update(region).digest('hex')).toBe('6997e44c7cfa414d58f181601a0f07b116f103f55a528bf4f9c526568f85f705');
  });
});
