import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
// Existing shielding-gas data stays distinct from the new oxy-acetylene reference.
const GASES = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab_oxy_gas_mix_reference.json'), 'utf8'));
const BASE = { view: 'consumables', cons_sect: 'gases', cons_mode: 'browse', cons_sc_idx: 2, cons_sc_score: 1, cons_sc_picked: null, tech2_cons_code: 'E7018', tech2_cons_proc: 'fcaw', tech2_cons_leg: 0.375, tech2_cons_rate: 80 };
const IDS = ['neutral', 'fuel', 'oxygen'];
let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast, update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-oxy-flame-bench]');
const view = (slot = 'selected') => panel().querySelector(`[data-oxy-flame-view="${slot}"]`);
async function pick(id) { await React.act(() => panel().querySelector(`[data-oxy-flame-pick="${id}"]`).click()); }
async function compare() { await React.act(() => panel().querySelector('[data-oxy-flame-compare]').click()); }
async function peer(id) { await React.act(() => Simulate.change(panel().querySelector('[data-oxy-flame-peer]'), { target: { value: id } })); }
async function button(text) { const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el).toBeTruthy(); await React.act(() => el.click()); }
// Complete saved collections keep snapshots independent of badges earned by a live mount.
function page(state = {}, context = {}) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { weldBadges: {}, defectCatalog: {}, speedBest: {}, ...BASE, ...state } }, context); return node; }

describe('Oxy-acetylene categorical flame reference inspector', () => {
  it('exposes three conditions with complete corresponding HTML observations', async () => {
    await mount(); expect(panel().dataset).toMatchObject({ oxyFlameBench: 'neutral', compare: 'false', peer: 'fuel' });
    expect([...panel().querySelectorAll('[data-oxy-flame-pick]')].map(el => el.dataset.oxyFlamePick)).toEqual(IDS);
    const expected = {
      neutral: ['Neutral', 'Balanced oxygen and acetylene', 'distinct inner cone', 'No separate acetylene feather', 'two visible zones'],
      fuel: ['Excess fuel (Carburizing)', 'Excess acetylene', 'inside the intermediate zone', 'between the inner cone and outer envelope', 'three visible zones'],
      oxygen: ['Excess oxygen (Oxidizing)', 'Excess oxygen', 'shorter and more pointed', 'No separate acetylene feather', 'shorter and sharper']
    };
    for (const id of IDS) {
      await pick(id); expect(panel().dataset.oxyFlameBench).toBe(id); expect(view().dataset.flame).toBe(id); expect(view().querySelector('h5').textContent).toBe(expected[id][0]);
      for (const [index, key] of ['balance', 'cone', 'feather', 'envelope'].entries()) expect(view().querySelector(`[data-oxy-${key}-reading]`).textContent).toContain(expected[id][index + 1]);
      expect(view().querySelectorAll('dl > div')).toHaveLength(4); expect(panel().querySelectorAll('[data-oxy-flame-pick][aria-pressed="true"]')).toHaveLength(1);
      expect(view().querySelector('svg').getAttribute('aria-label')).toContain('Oxy-acetylene reference');
    }
  });

  it('shows the intermediate feather only for excess fuel and differentiates the oxidizing reference', async () => {
    await mount(); const cone = view().querySelector('[data-oxy-cone]').getAttribute('d'), envelope = view().querySelector('[data-oxy-envelope]').getAttribute('d');
    expect(view().querySelector('[data-oxy-feather]')).toBeNull(); expect([...view().querySelectorAll('[data-oxy-callout]')].map(el => el.dataset.oxyCallout)).toEqual(['1', '3']);
    await pick('fuel'); expect(view().querySelectorAll('[data-oxy-feather]')).toHaveLength(1); expect(view().querySelector('[data-oxy-cone]').getAttribute('d')).toBe(cone);
    expect([...view().querySelectorAll('[data-oxy-callout]')].map(el => el.dataset.oxyCallout)).toEqual(['1', '2', '3']);
    const feather = view().querySelector('[data-oxy-feather]'); expect(feather.previousElementSibling.matches('[data-oxy-envelope]')).toBe(true); expect(feather.nextElementSibling.matches('[data-oxy-cone]')).toBe(true);
    await pick('oxygen'); expect(view().querySelector('[data-oxy-feather]')).toBeNull(); expect(view().querySelector('[data-oxy-cone]').getAttribute('d')).not.toBe(cone); expect(view().querySelector('[data-oxy-envelope]').getAttribute('d')).not.toBe(envelope);
    expect(view().querySelector('[data-oxy-cone]').getAttribute('d')).toContain('236 100'); expect(view().querySelector('[data-oxy-envelope]').getAttribute('d')).toContain('438 100');
    expect(view().querySelectorAll('[data-oxy-cone]')).toHaveLength(1); expect(view().querySelectorAll('[data-oxy-envelope]')).toHaveLength(1);
  });

  it('keeps the torch, reference baseline and inner-cone callout fixed across every category and comparison', async () => {
    await mount(); const fixed = ['torch', 'reference-axis'].map(key => view().querySelector(`[data-oxy-${key}]`).outerHTML), callout = view().querySelector('[data-oxy-callout="1"]').outerHTML;
    for (const id of IDS) { await pick(id); expect(['torch', 'reference-axis'].map(key => view().querySelector(`[data-oxy-${key}]`).outerHTML)).toEqual(fixed); expect(view().querySelector('[data-oxy-callout="1"]').outerHTML).toBe(callout); }
    await compare(); await peer('fuel');
    for (const slot of ['selected', 'comparison']) {
      const svg = view(slot).querySelector('svg'); expect(svg.getAttribute('viewBox')).toBe('0 0 640 260'); expect(svg.style.width).toBe('100%'); expect(svg.style.height).toBe('auto'); expect(svg.style.maxWidth).toBe('640px'); expect(svg.style.margin).toBe('0px auto');
      expect(view(slot).style.flex).toBe('1 1 280px'); expect(Number.parseFloat(view(slot).style.minWidth)).toBe(0); expect(['torch', 'reference-axis'].map(key => view(slot).querySelector(`[data-oxy-${key}]`).outerHTML)).toEqual(fixed);
    }
    expect(view().querySelector('[data-oxy-torch] path').getAttribute('d')).toBe('M38 81 H104 L160 90 V110 L104 119 H38 Z');
  });

  it('compares two distinct references and guards same-category or invalid comparison input', async () => {
    await mount(); await compare(); await peer('oxygen'); expect(view().dataset.flame).toBe('neutral'); expect(view('comparison').dataset.flame).toBe('oxygen');
    await peer('neutral'); await peer('invalid'); expect(panel().dataset.peer).toBe('oxygen'); expect(view('comparison').dataset.flame).toBe('oxygen');
    await pick('oxygen'); expect(view().dataset.flame).toBe('oxygen'); expect(view('comparison').dataset.flame).toBe('neutral');
    expect([...panel().querySelector('[data-oxy-flame-peer]').options].map(option => option.value)).toEqual(['neutral', 'fuel']);
    await peer('fuel'); expect(view('comparison').querySelector('[data-oxy-feather]')).toBeTruthy(); await compare(); expect(panel().querySelectorAll('[data-oxy-flame-view]')).toHaveLength(1);
  });

  it('retains every shielding-gas mix, its bar proportions and the existing flow explorer', async () => {
    await mount(); const bars = [...host.querySelectorAll('svg[aria-label^="Mix:"]')]; expect(GASES).toHaveLength(8); expect(bars).toHaveLength(8);
    GASES.forEach((g, i) => {
      expect(bars[i].getAttribute('aria-label')).toBe('Mix: ' + g.comps.map(c => c[0] + ' ' + c[1] + '%').join(', '));
      expect([...bars[i].querySelectorAll('rect')].map(rect => Number(rect.getAttribute('width')))).toEqual(g.comps.map(c => 3 * c[1]));
      for (const field of ['mix', 'proc', 'cost', 'pen', 'spatter', 'use']) expect(bars[i].parentElement.textContent).toContain(g[field]);
    });
    expect(host.querySelector('[data-cons-shield]').dataset.consShield).toBe('recommended'); await pick('fuel');
    await React.act(() => host.querySelector('[data-cons-shield-mode="low"]').click()); expect(host.querySelector('[data-cons-shield]').dataset.consShield).toBe('low'); expect(panel().dataset.oxyFlameBench).toBe('fuel');
    await pick('oxygen'); expect(host.querySelector('[data-cons-shield]').dataset.consShield).toBe('low');
  });

  it('keeps exploration local and preserves tungsten, decoder and calculator state across lesson tabs', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await pick('fuel'); await compare(); await peer('oxygen'); expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    await button('✏ TIG filler rods + tungsten'); expect(panel()).toBeNull(); expect(host.querySelector('[data-tungsten-bench]').dataset).toMatchObject({ tungstenBench: 'EWLa-2', focus: 'classification', compare: 'false' });
    await button('💨 Shielding gases'); expect(panel().dataset).toMatchObject({ oxyFlameBench: 'fuel', compare: 'true', peer: 'oxygen' });
    expect(app.latest()).toMatchObject({ cons_sc_idx: 2, cons_sc_score: 1, cons_sc_picked: null, tech2_cons_code: 'E7018', tech2_cons_proc: 'fcaw', tech2_cons_leg: 0.375, tech2_cons_rate: 80 });
    for (const cons_sect of ['overview', 'sticks', 'mig_wires', 'decoder', 'tig_rods', 'storage', 'cost']) expect(page({ cons_sect }).querySelector('[data-oxy-flame-bench]')).toBeNull();
  });

  it('stays outside every scored scenario and preserves answer-gated feedback', async () => {
    await mount(); await pick('oxygen'); await compare(); await button('🎯 Pick the right consumable');
    expect(panel()).toBeNull(); expect(host.textContent).not.toContain('Why:'); expect(host.textContent).not.toContain('Why not'); expect(host.textContent).not.toContain('Next scenario →');
    const radios = [...host.querySelectorAll('[role="radio"]')]; expect(radios).toHaveLength(4); await React.act(() => radios[0].click()); expect(host.textContent).toMatch(/Why:|Why not/); expect(host.textContent).toContain('Next scenario →'); expect(panel()).toBeNull();
    for (let cons_sc_idx = 0; cons_sc_idx < 8; cons_sc_idx++) {
      const node = page({ cons_mode: 'scenarios', cons_sc_idx, cons_sc_picked: null }); expect(node.querySelector('[data-oxy-flame-bench]')).toBeNull(); expect(node.querySelectorAll('[role="radio"]')).toHaveLength(4); expect(node.textContent).not.toContain('Why:'); expect(node.textContent).not.toContain('Why not');
    }
  });

  it('uses the verified printed-page anchor and versioned contextual copy without adding operating controls', async () => {
    await mount(); const source = readFileSync(SRC, 'utf8'); expect(source).toContain("__alloT('stem.weldlab.cons9_oxy_reference_r2',"); expect(source).not.toContain("__alloT('stem.weldlab.tech2_cons_oxy',");
    expect(host.textContent).toContain('Flame choice depends on the operation, material'); expect(panel().querySelector('[data-oxy-model-note]').textContent).toContain('Schematic oxy-acetylene references'); expect(panel().querySelector('[data-oxy-model-note]').textContent).toContain('qualitative'); expect(panel().querySelector('[data-oxy-model-note]').textContent).toContain('Other fuel gases have different flame characteristics');
    const link = panel().querySelector('[data-oxy-reference]'); expect(link.href).toBe('https://www.wilhelmsen.com/globalassets/ships-service/welding/documents/wilhelmsen-ships-service---unitor-welding-handbook.pdf#page=244'); expect(link.textContent).toContain('printed page 243'); expect(link.rel).toContain('noopener');
    expect(panel().querySelector('input,animate,animateTransform,filter,linearGradient,radialGradient')).toBeNull(); expect(panel().textContent).not.toMatch(/\b\d+\s*(?:psi|CFH|°|:)/); expect(panel().textContent).not.toContain('light the torch'); expect(panel().textContent).not.toContain('open the valve');
  });

  it('provides 44px native controls, full HTML zone labels, explicit contrast and motion suppression', async () => {
    await mount({}, true); expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const el of panel().querySelectorAll('button')) { expect(el.type).toBe('button'); expect(el.style.minHeight).toBe('44px'); expect(panel().querySelector('#' + el.getAttribute('aria-controls'))).toBeTruthy(); }
    const selected = panel().querySelector('[data-oxy-flame-pick="neutral"]'); expect(selected.style.background).toBe('rgb(255, 255, 0)'); expect(selected.style.color).toBe('rgb(0, 0, 0)'); expect(view().querySelector('[data-oxy-cone]').getAttribute('fill')).toBe('#ffffff');
    await pick('fuel'); expect(view().querySelector('[data-oxy-feather]').getAttribute('fill')).toBe('#ffff00'); expect([...view().querySelectorAll('dt')].map(dt => dt.textContent)).toEqual(['Oxy-acetylene condition', '1 · Inner cone', '2 · Acetylene feather', '3 · Outer envelope']);
    await compare(); const select = panel().querySelector('[data-oxy-flame-peer]'); expect(select.style.minHeight).toBe('44px'); expect(panel().querySelector(`label[for="${select.id}"]`)).toBeTruthy(); expect(panel().querySelector('#cons9-views').getAttribute('aria-live')).toBe('polite');
    for (const link of panel().querySelectorAll('a')) expect(link.style.minHeight).toBe('44px');
    const css = panel().querySelector('style').textContent; for (const text of ['outline:3px solid #ffff00!important', 'button:focus-visible', 'select:focus-visible', 'a:focus-visible', 'transition:none!important', 'animation:none!important']) expect(css).toContain(text);
    const normal = page().querySelector('[data-oxy-flame-bench]'); expect(normal.querySelector('[data-oxy-cone]').getAttribute('fill')).toBe('#67e8f9'); expect(normal.querySelector('style').textContent).toContain('outline:3px solid #0369a1!important');
  });
});
