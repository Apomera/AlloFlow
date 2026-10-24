import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
// Durable lesson records; EWCe-2 gray corrects the former orange entry using CK/Miller.
const RECORDS = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab_tungsten_reference.json'), 'utf8'));
const BASE = { view: 'consumables', cons_sect: 'tig_rods', cons_mode: 'browse', cons_sc_idx: 2, cons_sc_score: 1, cons_sc_picked: null, tech2_cons_code: 'E7018', tech2_cons_proc: 'fcaw', tech2_cons_leg: 0.375, tech2_cons_rate: 80 };
let host, root;
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab'); });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() { const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast, update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } })); }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host); await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-tungsten-bench]');
const view = (slot = 'selected') => panel().querySelector(`[data-tungsten-view="${slot}"]`);
async function pick(id) { await React.act(() => panel().querySelector(`[data-tungsten-pick="${id}"]`).click()); }
async function focus(id) { await React.act(() => panel().querySelector(`[data-tungsten-focus="${id}"]`).click()); }
async function compare() { await React.act(() => panel().querySelector('[data-tungsten-compare]').click()); }
async function peer(id) { await React.act(() => Simulate.change(panel().querySelector('[data-tungsten-peer]'), { target: { value: id } })); }
async function textButton(text) { const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el).toBeTruthy(); await React.act(() => el.click()); }
const geometry = slot => ['rod', 'paint', 'box'].map(kind => { const el = view(slot).querySelector(`[data-tungsten-${kind}]`); return [kind, ...['x', 'y', 'width', 'height'].map(k => el.getAttribute(k))]; });

describe('Tungsten identification and preparation reference bench', () => {
  it('selects all nine exact records with matching printed classifications, reference paint and uses', async () => {
    await mount(); expect(panel().dataset).toMatchObject({ tungstenBench: 'EWLa-2', focus: 'classification', compare: 'false' });
    expect(RECORDS).toHaveLength(9); expect(panel().querySelectorAll('[data-tungsten-pick]')).toHaveLength(9);
    for (const record of RECORDS) {
      await pick(record.cls); expect(panel().dataset.tungstenBench).toBe(record.cls); expect(view().dataset.class).toBe(record.cls);
      expect(view().querySelector('h5').textContent).toBe(record.name);
      expect(view().querySelector('[data-tungsten-class-reading]').textContent).toBe(record.cls);
      expect(view().querySelector('[data-tungsten-printed-class]').textContent).toBe(record.cls);
      expect(view().querySelector('[data-tungsten-color-reading]').textContent).toBe(record.colour);
      expect(view().querySelector('[data-tungsten-paint]').getAttribute('fill')).toBe(record.hex);
      expect(view().querySelector('[data-tungsten-use-reading]').textContent).toBe(record.use);
      expect(panel().querySelectorAll('[data-tungsten-pick][aria-pressed="true"]')).toHaveLength(1);
    }
  });

  it('keeps the rod, identification end, box and marks fixed across selections and focus changes', async () => {
    await mount(); const fixed = geometry('selected'), marks = view().querySelector('[data-tungsten-grinding-marks]').outerHTML;
    expect(fixed).toEqual([['rod', '70', '84', '420', '20'], ['paint', '70', '84', '58', '20'], ['box', '68', '148', '504', '76']]);
    for (const cls of ['EWP', 'EWCe-2', 'EWG']) for (const detail of ['paint', 'classification', 'preparation']) {
      await pick(cls); await focus(detail); expect(geometry('selected')).toEqual(fixed); expect(view().querySelector('[data-tungsten-grinding-marks]').outerHTML).toBe(marks);
      expect(view().querySelector('[data-tungsten-focus-region]').dataset.tungstenFocusRegion).toBe(detail);
    }
    const outline = view().querySelector('[data-tungsten-focus-region]');
    expect(['x', 'y', 'width', 'height'].map(k => outline.getAttribute(k))).toEqual(['350', '78', '146', '32']);
    expect([...view().querySelectorAll('[data-tungsten-grinding-marks] path')].map(el => el.getAttribute('d'))).toEqual(['M360 87 H488', 'M360 92 H488', 'M360 97 H488', 'M360 102 H488']);
    expect(panel().querySelector('[data-tungsten-focus-reading]').textContent).toContain('parallel to the rod');
    expect(panel().querySelector('[data-tungsten-focus-reading]').textContent).toContain('do not specify a prepared tip shape');
  });

  it('compares the same geometry and scale while distinguishing two gray reference colors by classification', async () => {
    await mount(); await pick('EWCe-2'); await compare(); await peer('EWG');
    expect(view().dataset.class).toBe('EWCe-2'); expect(view('comparison').dataset.class).toBe('EWG');
    expect(geometry('selected')).toEqual(geometry('comparison'));
    expect(view().querySelector('[data-tungsten-paint]').getAttribute('fill')).toBe(view('comparison').querySelector('[data-tungsten-paint]').getAttribute('fill'));
    expect(view().querySelector('[data-tungsten-class-reading]').textContent).not.toBe(view('comparison').querySelector('[data-tungsten-class-reading]').textContent);
    for (const slot of ['selected', 'comparison']) { const svg = view(slot).querySelector('svg'); expect(svg.getAttribute('viewBox')).toBe('0 0 640 260'); expect(svg.style.width).toBe('100%'); expect(svg.style.height).toBe('auto'); expect(svg.style.maxWidth).toBe('640px'); expect(view(slot).style.flex).toBe('1 1 280px'); }
    await peer('EWCe-2'); await peer('invalid'); expect(panel().dataset.peer).toBe('EWG');
    await pick('EWG'); expect(view('comparison').dataset.class).toBe('EWCe-2');
    await compare(); expect(panel().querySelectorAll('[data-tungsten-view]')).toHaveLength(1);
  });

  it('retains the complete corrected nine-entry reference and every use note in native disclosure', async () => {
    await mount(); const disclosure = panel().querySelector('[data-tungsten-reference]'); expect(disclosure.tagName).toBe('DETAILS');
    expect(disclosure.querySelectorAll('[data-tungsten-reference-row]')).toHaveLength(9);
    for (const record of RECORDS) { const row = disclosure.querySelector(`[data-tungsten-reference-row="${record.cls}"]`); expect(row.querySelector('h5').textContent).toBe(record.name); expect(row.querySelector('[data-tungsten-reference-color]').textContent).toBe('Tip colour: ' + record.colour); expect(row.querySelector('[data-tungsten-reference-use]').textContent).toBe(record.use); }
    expect(host.textContent).toContain('TIG uses a non-consumable tungsten electrode'); expect(host.textContent).toContain('TIG filler rods use the same classification as MIG wires');
  });

  it('corrects ceriated paint context, AC preparation and the contradictory teacher prompt with new keys', async () => {
    await mount(); await pick('EWCe-2'); expect(view().querySelector('[data-tungsten-color-reading]').textContent).toBe('gray');
    expect(panel().querySelector('[data-tungsten-product-context]').textContent).toContain('EWCe-2/WC20 as gray (formerly orange)');
    expect(host.textContent).toContain('EWG blends can use maker-specific colors'); expect(host.textContent).toContain('applicable standard edition and product');
    expect(host.textContent).toContain('Modern inverter AC TIG can use a pointed or truncated electrode instead of a pre-balled tip.');
    expect(host.textContent).not.toContain('AC TIG: ball the tip by striking arc on scrap'); expect(host.textContent).not.toContain('Why do TIG welders ball the tungsten for AC aluminum');
    const source = readFileSync(SRC, 'utf8');
    for (const key of ['cons8_ceriated_gray_r2', 'cons8_product_identification_r2', 'cons8_tungsten_preparation_r2', 'cons8_teacher_preparation_r2']) expect(source).toContain("__alloT('stem.weldlab." + key + "'");
    expect(source).not.toContain("__alloT('stem.weldlab.tech2_cons_w_orange',");
    expect(source).not.toContain("__alloT('stem.weldlab.dc_tig_grind_tungsten_to_a_sharp_point',");
  });

  it('keeps exploration local, preserves calculator settings and does not reveal scenario feedback', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await pick('EWCe-2'); await focus('preparation'); await compare(); await peer('EWG');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    await textButton('💨 Shielding gases'); expect(panel()).toBeNull(); await textButton('✏ TIG filler rods + tungsten'); expect(panel().dataset).toMatchObject({ tungstenBench: 'EWCe-2', focus: 'preparation', compare: 'true' });
    expect(app.latest().cons_sc_picked).toBeNull(); expect(app.latest().cons_sc_score).toBe(1); expect(app.latest().tech2_cons_code).toBe('E7018'); expect(app.latest().tech2_cons_rate).toBe(80);
    await textButton('🎯 Pick the right consumable'); expect(panel()).toBeNull(); expect(host.textContent).not.toContain('✓ correct'); expect(host.textContent).not.toContain('Why:'); expect(host.textContent).not.toContain('Next scenario →');
    for (const cons_sect of ['overview', 'sticks', 'mig_wires', 'decoder', 'gases', 'storage', 'cost']) expect(renderTool('weldLab', { weldLab: { ...BASE, cons_sect } })).not.toContain('data-tungsten-bench');
  });

  it('uses verified manufacturer links and manual geometry without arc, glow or numerical settings controls', async () => {
    await mount(); const links = [...panel().querySelectorAll('[data-tungsten-sources] a')];
    expect(links.map(a => a.href)).toEqual(['https://www.ckworldwide.com/products/tungsten-specification', 'https://www.millerwelds.com/en-US/resources/knowledge-hub/tig-welding/filler-metal-equipment-setup/all-about-tungsten-in-tig-welding-types-selection-and-use', 'https://www.millerwelds.com/en-us/resources/knowledge-hub/tig-welding/filler-metal-equipment-setup/how-to-choose-the-best-tungsten-for-AC-tig-welding']);
    expect(panel().querySelector('animate,animateTransform,filter,radialGradient,linearGradient,input')).toBeNull();
    expect(panel().querySelector('[data-tungsten-model-note]').textContent).toContain('No electrode size, tip angle, machine setting or weld-quality prediction');
  });

  it('provides native44px controls, full HTML readings and explicit contrast/focus treatment', async () => {
    await mount({}, true); expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const button of panel().querySelectorAll('button')) { expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); expect(panel().querySelector('#' + button.getAttribute('aria-controls'))).toBeTruthy(); }
    expect(panel().querySelector('[data-tungsten-pick="EWLa-2"]').style.background).toBe('rgb(255, 255, 0)'); expect(panel().querySelector('[data-tungsten-pick="EWLa-2"]').style.color).toBe('rgb(0, 0, 0)');
    const css = panel().querySelector('style').textContent; expect(css).toContain('outline:3px solid #ffff00!important'); expect(css).toContain('select:focus-visible'); expect(css).toContain('summary:focus-visible'); expect(css).toContain('a:focus-visible'); expect(css).toContain('transition:none!important'); expect(css).toContain('animation:none!important');
    expect(panel().querySelector('[data-tungsten-focus-reading]').getAttribute('aria-live')).toBe('polite'); expect(panel().querySelector('summary').style.minHeight).toBe('44px');
    await compare(); const select = panel().querySelector('[data-tungsten-peer]'); expect(select.style.minHeight).toBe('44px'); expect(panel().querySelector(`label[for="${select.id}"]`)).toBeTruthy();
    for (const link of panel().querySelectorAll('a')) expect(link.style.minHeight).toBe('44px');
  });
});
