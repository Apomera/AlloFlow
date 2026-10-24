import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const GASES = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab_oxy_gas_mix_reference.json'), 'utf8'));
const BASE = { view: 'consumables', cons_sect: 'gases', cons_mode: 'browse', cons_sc_idx: 2, cons_sc_score: 1, cons_sc_picked: null, tech2_cons_code: 'E7018', tech2_cons_proc: 'fcaw', tech2_cons_leg: 0.375, tech2_cons_rate: 80, weldBadges: {}, defectCatalog: {}, speedBest: {} };
const COMPONENTS = ['Ar', 'CO2', 'O2', 'He'];
const percentage = (index, component) => GASES[index].comps.find(pair => pair[0] === component)?.[1] || 0;
const signed = value => value > 0 ? '+' + value : value < 0 ? '−' + Math.abs(value) : '0';
let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-gas-composition]');
const plot = () => panel().querySelector('[data-gas-component-plot]');
const bar = lane => plot().querySelector(`[data-gas-component-bar="${lane}"]`);
async function mixture(lane, value) { await React.act(() => Simulate.change(panel().querySelector(`[data-gas-mixture="${lane}"]`), { target: { value } })); }
async function component(id) { await React.act(() => panel().querySelector(`[data-gas-component="${id}"]`).click()); }
async function textButton(text) { const node = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(node, text).toBeTruthy(); await React.act(() => node.click()); }
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }

describe('Listed shielding-gas composition comparator', () => {
  it('starts with C25 versus C10 carbon dioxide shares and exposes all eight original recipes', async () => {
    await mount(); expect(panel().dataset).toMatchObject({ mixA: '1', mixB: '2', component: 'CO2' });
    for (const lane of ['a', 'b']) {
      const select = panel().querySelector(`[data-gas-mixture="${lane}"]`); expect([...select.options].map(option => option.value)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7']); expect([...select.options].map(option => option.textContent)).toEqual(GASES.map(gas => gas.mix));
    }
    expect([...panel().querySelectorAll('[data-gas-component]')].map(el => el.dataset.gasComponent)).toEqual(COMPONENTS);
    expect(panel().querySelector('[data-gas-percent="a"]').textContent).toBe('25%'); expect(panel().querySelector('[data-gas-percent="b"]').textContent).toBe('10%'); expect(panel().querySelector('[data-gas-difference]').textContent).toBe('−15 percentage points (B − A)');
    expect(panel().querySelector('[data-gas-mixture-reading="a"] h5').textContent).toContain(GASES[1].mix); expect(panel().querySelector('[data-gas-mixture-reading="b"] h5').textContent).toContain(GASES[2].mix);
  });

  it('matches actual bar widths, complete recipes, HTML percentages and signed B-minus-A across all64 ordered pairs and four components', async () => {
    await mount(); let checked = 0;
    expect(GASES).toHaveLength(8); for (const gas of GASES) expect(gas.comps.reduce((sum, pair) => sum + pair[1], 0)).toBe(100);
    for (let a = 0; a < 8; a++) {
      await mixture('a', String(a));
      for (let b = 0; b < 8; b++) {
        await mixture('b', String(b));
        for (const id of COMPONENTS) {
          await component(id); const expected = { a: percentage(a, id), b: percentage(b, id) };
          expect(panel().dataset).toMatchObject({ mixA: String(a), mixB: String(b), component: id });
          for (const lane of ['a', 'b']) {
            const rect = bar(lane), value = expected[lane], index = lane === 'a' ? a : b;
            expect(Number(rect.getAttribute('x'))).toBe(64); expect(Number(rect.getAttribute('width'))).toBeCloseTo(560 * value / 100, 12); expect(Number(rect.dataset.value)).toBe(value); expect(Number(rect.getAttribute('height'))).toBe(34);
            expect(panel().querySelector(`[data-gas-percent="${lane}"]`).textContent).toBe(value + '%'); expect(panel().querySelector(`[data-gas-mixture-reading="${lane}"]`).dataset.index).toBe(String(index));
            expect(panel().querySelector(`[data-gas-recipe="${lane}"]`).textContent).toBe('Listed recipe: ' + GASES[index].comps.map(pair => pair[0] + ' ' + pair[1] + '%').join(' · '));
            expect(plot().querySelector(`[data-gas-zero="${lane}"]`) !== null).toBe(value === 0);
          }
          const difference = expected.b - expected.a; expect(Number(panel().querySelector('[data-gas-difference]').dataset.value)).toBe(difference); expect(panel().querySelector('[data-gas-difference]').textContent).toBe(signed(difference) + ' percentage points (B − A)'); checked++;
        }
      }
    }
    expect(checked).toBe(256);
  }, 30000);

  it('keeps the zero-to100 axis fixed and makes absent components zero-width rather than a minimum visible share', async () => {
    await mount(); const axis = () => [...plot().querySelectorAll('[data-gas-axis-tick],[data-gas-axis]')].map(el => el.outerHTML); const original = axis();
    expect([...plot().querySelectorAll('[data-gas-axis-tick]')].map(el => el.dataset.gasAxisTick)).toEqual(['0', '25', '50', '75', '100']);
    for (const tick of plot().querySelectorAll('[data-gas-axis-tick]')) expect(Number(tick.querySelector('text').getAttribute('x'))).toBe(64 + 560 * Number(tick.dataset.gasAxisTick) / 100);
    await mixture('a', '0'); await mixture('b', '5');
    for (const id of COMPONENTS) { await component(id); expect(axis()).toEqual(original); }
    await component('CO2'); expect(Number(bar('a').getAttribute('width'))).toBe(560); expect(Number(bar('b').getAttribute('width'))).toBe(0); expect(plot().querySelector('[data-gas-zero="b"]').getAttribute('d')).toBe('M64 146 V188');
    await component('He'); expect(Number(bar('a').getAttribute('width'))).toBe(0); expect(Number(bar('b').getAttribute('width'))).toBe(0); expect(panel().querySelector('[data-gas-difference]').textContent).toBe('0 percentage points (B − A)'); expect(axis()).toEqual(original);
  });

  it('allows identical mixtures and ignores malformed selector input without changing either reference', async () => {
    await mount(); await mixture('a', '4'); await mixture('b', '4');
    for (const id of COMPONENTS) { await component(id); expect(Number(bar('a').getAttribute('width'))).toBe(Number(bar('b').getAttribute('width'))); expect(Number(panel().querySelector('[data-gas-difference]').dataset.value)).toBe(0); }
    for (const bad of ['', null, '-1', '8', 'Infinity', 'NaN', '1.5', '__proto__']) for (const lane of ['a', 'b']) { await mixture(lane, bad); expect(panel().dataset).toMatchObject({ mixA: '4', mixB: '4' }); }
    const savedLooking = render({ cons10_mixA: 7, cons10_mixB: 0, cons10_component: 'He' }).querySelector('[data-gas-composition]'); expect(savedLooking.dataset).toMatchObject({ mixA: '1', mixB: '2', component: 'CO2' });
  });

  it('retains all eight original mixture cards, notes, proportions and the independent flow and flame references', async () => {
    await mount(); const cards = [...host.querySelectorAll('svg[aria-label^="Mix:"]')]; expect(cards).toHaveLength(8);
    GASES.forEach((gas, i) => {
      expect(cards[i].getAttribute('aria-label')).toBe('Mix: ' + gas.comps.map(pair => pair[0] + ' ' + pair[1] + '%').join(', ')); expect([...cards[i].querySelectorAll('rect')].map(el => Number(el.getAttribute('width')))).toEqual(gas.comps.map(pair => pair[1] * 3));
      for (const key of ['mix', 'proc', 'cost', 'pen', 'spatter', 'use']) expect(cards[i].parentElement.textContent).toContain(gas[key]);
    });
    expect(host.querySelector('[data-cons-shield]').dataset.consShield).toBe('recommended'); expect(host.querySelector('[data-oxy-flame-bench]').dataset.oxyFlameBench).toBe('neutral');
    await mixture('a', '7'); await component('O2'); await React.act(() => host.querySelector('[data-cons-shield-mode="low"]').click()); await React.act(() => host.querySelector('[data-oxy-flame-pick="fuel"]').click());
    expect(panel().dataset).toMatchObject({ mixA: '7', mixB: '2', component: 'O2' }); await mixture('b', '6'); expect(host.querySelector('[data-cons-shield]').dataset.consShield).toBe('low'); expect(host.querySelector('[data-oxy-flame-bench]').dataset.oxyFlameBench).toBe('fuel');
  });

  it('keeps comparison local without saved writes and preserves tungsten, decoder and calculator inputs across tabs', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await mixture('a', '4'); await mixture('b', '6'); await component('He'); expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    await textButton('✏ TIG filler rods + tungsten'); expect(panel()).toBeNull(); expect(host.querySelector('[data-tungsten-bench]').dataset).toMatchObject({ tungstenBench: 'EWLa-2', focus: 'classification', compare: 'false' });
    await textButton('💨 Shielding gases'); expect(panel().dataset).toMatchObject({ mixA: '4', mixB: '6', component: 'He' });
    expect(app.latest()).toMatchObject({ cons_sc_idx: 2, cons_sc_score: 1, cons_sc_picked: null, tech2_cons_code: 'E7018', tech2_cons_proc: 'fcaw', tech2_cons_leg: 0.375, tech2_cons_rate: 80 });
    for (const cons_sect of ['overview', 'sticks', 'mig_wires', 'decoder', 'tig_rods', 'storage', 'cost']) expect(render({ cons_sect }).querySelector('[data-gas-composition]')).toBeNull();
  });

  it('stays out of every scored scenario and preserves answer-gated feedback after comparison work', async () => {
    const app = await mount(); await mixture('a', '3'); await mixture('b', '3'); await component('O2'); await textButton('🎯 Pick the right consumable');
    expect(panel()).toBeNull(); expect(host.textContent).not.toContain('Why:'); expect(host.textContent).not.toContain('Why not'); expect(host.textContent).not.toContain('Next scenario →'); expect(app.latest().cons_sc_picked).toBeNull();
    const choices = [...host.querySelectorAll('[role="radio"]')]; expect(choices).toHaveLength(4); await React.act(() => choices[0].click()); expect(host.textContent).toMatch(/Why:|Why not/); expect(host.textContent).toContain('Next scenario →'); expect(panel()).toBeNull();
    for (let cons_sc_idx = 0; cons_sc_idx < 8; cons_sc_idx++) { const node = render({ cons_mode: 'scenarios', cons_sc_idx, cons_sc_picked: null }); expect(node.querySelector('[data-gas-composition]')).toBeNull(); expect(node.querySelectorAll('[role="radio"]')).toHaveLength(4); expect(node.textContent).not.toContain('Why:'); expect(node.textContent).not.toContain('Why not'); }
  });

  it('provides responsive 44px native controls, full HTML values, explicit contrast and motion suppression', async () => {
    await mount({}, true); expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const node of panel().querySelectorAll('select,button')) expect(node.style.minHeight).toBe('44px');
    for (const node of panel().querySelectorAll('select')) expect(panel().querySelector(`label[for="${node.id}"]`)).toBeTruthy();
    for (const node of panel().querySelectorAll('button')) { expect(node.type).toBe('button'); expect(panel().querySelector('#' + node.getAttribute('aria-controls'))).toBeTruthy(); }
    expect(panel().querySelector('[data-gas-component="CO2"]').style.background).toBe('rgb(255, 255, 0)'); expect(panel().querySelector('[data-gas-component="CO2"]').style.color).toBe('rgb(0, 0, 0)');
    expect(bar('a').getAttribute('fill')).toBe('#ffffff'); expect(bar('b').getAttribute('fill')).toBe('#ffff00'); expect(plot().style.width).toBe('100%'); expect(plot().style.height).toBe('auto'); expect(plot().style.maxWidth).toBe('720px'); expect(plot().getAttribute('viewBox')).toBe('0 0 720 260');
    expect(panel().querySelector('#cons10-reading').getAttribute('aria-live')).toBe('polite'); expect(panel().querySelector('[data-gas-mixture-reading="a"] p').className).toContain('text-base'); expect(panel().querySelector('[data-gas-difference]').className).toContain('text-lg');
    const css = panel().querySelector('style').textContent; for (const value of ['button:focus-visible', 'select:focus-visible', 'outline:3px solid #ffff00!important', 'transition:none!important', 'animation:none!important']) expect(css).toContain(value);
    expect(panel().querySelector('input,animate,animateTransform,filter,linearGradient,radialGradient')).toBeNull(); expect(panel().querySelector('[data-gas-composition-note]').textContent).toContain('does not measure shielding performance');
  });

  it('restores the complete original Consumables source after removing only the three local hooks, helper and gases call', () => {
    const source = readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n'); const start = source.indexOf('      function ConsumablesDeepDive() {'), end = source.indexOf('      function MaineEcosystem() {', start); let region = source.slice(start, end);
    // Reverse only the later optional classification comparison before this historical baseline.
    const comparisonAt = region.indexOf('        function renderCodeComparison(current, pinned) {');
    if (comparisonAt >= 0) {
      const comparisonEnd = region.indexOf('        function renderDecoder() {', comparisonAt); expect(comparisonEnd).toBeGreaterThan(comparisonAt); region = region.slice(0, comparisonAt) + region.slice(comparisonEnd);
      const controlsAt = region.indexOf("            h('div', { 'data-cons-code-controls':"), controlsEnd = region.indexOf("            h('div', { id: 'tech2-dec-result',", controlsAt); expect(controlsAt).toBeGreaterThan(0); expect(controlsEnd).toBeGreaterThan(controlsAt); region = region.slice(0, controlsAt) + region.slice(controlsEnd);
      for (const line of ['        var consPinnedState = useState(null);\n', '          var pinnedDecoded = consPinnedState[0] ? tech2Decode(consPinnedState[0]) : null;\n', '          if (!pinnedDecoded || !pinnedDecoded.ok) pinnedDecoded = null;\n', '              r.ok && pinnedDecoded && renderCodeComparison(r, pinnedDecoded),\n']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line, ''); }
      expect(region.split('r.ok && !pinnedDecoded &&')).toHaveLength(3); region = region.replaceAll('r.ok && !pinnedDecoded &&', 'r.ok &&');
    }

    // The later mass-balance bench is additive; remove it before this older gas-only restoration proof.
    // Its own suite independently hashes the complete pre-mass lesson, preserving both checks.
    const massAt = region.indexOf('        function renderMassBalance() {');
    if (massAt >= 0) {
      const massEnd = region.indexOf('        function renderConsRateLens() {', massAt); expect(massEnd).toBeGreaterThan(massAt);
      region = region.slice(0, massAt) + region.slice(massEnd);
      for (const line of ["        var massProcessState = useState('smaw');", '        var massTargetState = useState(1);', '            renderMassBalance(),']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line + '\n', ''); }
    }
    const helperAt = region.indexOf('        function renderGasComposition() {'), helperEnd = region.indexOf('        function renderGasShieldExplorer() {', helperAt); expect(helperAt).toBeGreaterThan(0); expect(helperEnd).toBeGreaterThan(helperAt);
    region = region.slice(0, helperAt) + region.slice(helperEnd);
    for (const line of ["        var gasMixtureAState = useState(1);", "        var gasMixtureBState = useState(2);", "        var gasComponentState = useState('CO2');", '            renderGasComposition(),']) { expect(region.split(line)).toHaveLength(2); region = region.replace(line + '\n', ''); }
    expect(createHash('sha256').update(region).digest('hex')).toBe('fb79d446a0950f4539d15be4b6a6202da663987ee5187f2f6d51245575a72733');
  });
});
