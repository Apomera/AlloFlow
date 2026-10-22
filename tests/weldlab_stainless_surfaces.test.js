import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'metallurgy', met_sect: 'stainless', met2_hazMat: 'steel', met2_hazH: 16, met2_hazTh: 0.25, met2_hazProbe: 2, met2_hazPred: -1, met_ce_comp: { C: 0.2, Mn: 1.2, Cr: 0, Mo: 0, V: 0, Ni: 0, Cu: 0 }, met2_cePred: null, met2_ceFree: false, met2_ceTally: { n: 4, right: 3 }, met2_cdIdx: 0, met2_cdPicks: { 0: 1 }, weldBadges: {}, defectCatalog: {}, speedBest: {} };
const IDS = ['face', 'root', 'both'];
const MAP = { face: ['external-shield', 'face'], root: ['backing-region', 'root'], both: ['external-shield', 'face', 'backing-region', 'root'] };
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
const panel = () => host.querySelector('[data-stainless-surfaces]');
const scene = () => panel().querySelector('[data-stainless-scene]');
const object = id => scene().querySelector(`[data-stainless-object="${id}"]`);
async function pick(id) { await React.act(() => panel().querySelector(`[data-stainless-surface-pick="${id}"]`).click()); }
async function textButton(text) { const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el, text).toBeTruthy(); await React.act(() => el.click()); }
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
function pathBounds(path) {
  const points = []; let x = 0, y = 0;
  for (const [, command, data] of path.matchAll(/([MLQHV])([^MLQHVZ]*)/g)) {
    const values = data.trim().split(/[ ,]+/).map(Number);
    if (command === 'H') { x = values[0]; points.push([x, y]); }
    else if (command === 'V') { y = values[0]; points.push([x, y]); }
    else for (let i = 0; i < values.length; i += 2) { x = values[i]; y = values[i + 1]; points.push([x, y]); }
  }
  return { top: Math.min(...points.map(point => point[1])), bottom: Math.max(...points.map(point => point[1])) };
}

describe('Stainless GTAW pipe face and root reference lens', () => {
  it('starts on both surfaces and identifies their different shielding roles in full HTML', async () => {
    await mount(); expect(panel().dataset.stainlessSurfaces).toBe('both');
    expect([...panel().querySelectorAll('[data-stainless-surface-pick]')].map(el => el.dataset.stainlessSurfacePick)).toEqual(IDS);
    expect(panel().textContent).toContain('conventional GTAW pipe example');
    const face = panel().querySelector('[data-stainless-reading="face"]'), back = panel().querySelector('[data-stainless-reading="root"]');
    expect(face.querySelector('h5').textContent).toBe('1 · Weld face · outside pipe'); expect(face.textContent).toContain('External torch shielding'); expect(face.textContent).toContain('Argon supplied at the torch');
    expect(back.querySelector('h5').textContent).toBe('2 · Weld root · inside pipe'); expect(back.textContent).toContain('Internal backing gas'); expect(back.textContent).toContain('on the other side of the wall from the torch');
    expect(face.dataset.active).toBe('true'); expect(back.dataset.active).toBe('true'); expect(panel().querySelector('[data-stainless-focus-reading]').textContent).toContain('same weld');
  });

  it('maps each surface selection to its surface and gas region without hiding the other role', async () => {
    await mount();
    for (const id of IDS) {
      await pick(id); expect(panel().dataset.stainlessSurfaces).toBe(id); expect(scene().querySelector('[data-stainless-focus-layer]').dataset.stainlessFocusLayer).toBe(id);
      expect([...scene().querySelectorAll('[data-stainless-highlight]')].map(el => el.dataset.stainlessHighlight)).toEqual(MAP[id]);
      expect(panel().querySelectorAll('[data-stainless-surface-pick][aria-pressed="true"]')).toHaveLength(1); expect(panel().querySelectorAll('[data-stainless-reading]')).toHaveLength(2);
      for (const side of ['face', 'root']) expect(panel().querySelector(`[data-stainless-reading="${side}"]`).dataset.active).toBe(id === 'both' || id === side ? 'true' : 'false');
      for (const highlight of scene().querySelectorAll('[data-stainless-highlight]')) expect(highlight.getAttribute('d')).toBe(object(highlight.dataset.stainlessHighlight).getAttribute('d'));
      expect(scene().getAttribute('aria-label')).toContain(panel().querySelector(`[data-stainless-surface-pick="${id}"]`).textContent);
    }
    await pick('face'); expect(panel().querySelector('[data-stainless-focus-reading]').textContent).toContain('outside wall');
    await pick('root'); expect(panel().querySelector('[data-stainless-focus-reading]').textContent).toContain('inside wall');
  });

  it('keeps pipe, weld, torch, gas regions, labels and marker geometry exactly fixed during inspection', async () => {
    await mount(); const original = scene().querySelector('[data-stainless-base]').outerHTML;
    expect([...scene().querySelectorAll('[data-stainless-object]')].map(el => el.dataset.stainlessObject)).toEqual(['external-shield', 'backing-region', 'pipe-left', 'pipe-right', 'weld', 'face', 'root', 'torch']);
    for (const id of ['root', 'face', 'both', 'root']) { await pick(id); expect(scene().querySelector('[data-stainless-base]').outerHTML).toBe(original); }
    expect(object('pipe-left').getAttribute('d')).toBe('M56 190 H334 L346 244 H56 Z'); expect(object('pipe-right').getAttribute('d')).toBe('M386 190 H664 V244 H374 Z');
    expect(object('face').getAttribute('d')).toBe('M334 190 Q360 178 386 190'); expect(object('root').getAttribute('d')).toBe('M346 244 Q360 254 374 244');
    expect(object('external-shield').getAttribute('d')).toBe('M332 138 H388 L418 188 H302 Z'); expect(object('backing-region').getAttribute('d')).toBe('M96 246 H624 V330 H96 Z');
    expect([...scene().querySelectorAll('[data-stainless-marker]')].map(el => el.dataset.stainlessMarker)).toEqual(['1', '2']);
  });

  it('locates the external region above the face and the backing region below the root in the same upper-wall section', async () => {
    await mount();
    expect(scene().getAttribute('viewBox')).toBe('0 0 720 380'); expect(scene().getAttribute('aria-label')).toContain('upper wall');
    expect(scene().textContent).toContain('Outside pipe'); expect(scene().textContent).toContain('Inside pipe (bore)'); expect(scene().textContent).toContain('Pipe wall');
    // Path/control-point bounds assert the drawn side relationships, not operating distances.
    const bounds = id => pathBounds(object(id).getAttribute('d'));
    const face = bounds('face'), back = bounds('root'), external = bounds('external-shield'), backing = bounds('backing-region');
    expect(external.top).toBeLessThan(face.top); expect(external.bottom).toBeLessThan(face.bottom); expect(external.bottom).toBeLessThan(back.top);
    expect(backing.top).toBeGreaterThan(face.bottom); expect(backing.top).toBeGreaterThan(back.top); expect(backing.bottom).toBeGreaterThan(back.bottom);
    expect(object('torch').querySelector('path:last-child').getAttribute('d')).toBe('M360 122 V170');
    expect(panel().querySelector('[data-stainless-model-note]').textContent).toContain('not to scale'); expect(panel().querySelector('[data-stainless-model-note]').textContent).toContain('their sizes are illustrative');
  });

  it('keeps focus local and independent from the existing sensitization stage and all saved assessment data', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const id of ['face', 'root', 'both', 'face']) await pick(id);
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    await React.act(() => host.querySelector('[data-met-sens-stage="carbides"]').click()); expect(panel().dataset.stainlessSurfaces).toBe('face'); expect(host.querySelector('[data-met-sensitization]').dataset.metSensitization).toBe('carbides'); expect(JSON.stringify(app.latest())).toBe(saved);
    await pick('root'); expect(host.querySelector('[data-met-sensitization]').dataset.metSensitization).toBe('carbides');
    await textButton('🌡 PWHT'); expect(panel()).toBeNull(); await textButton('🥄 Stainless sensitization'); expect(panel().dataset.stainlessSurfaces).toBe('root'); expect(host.querySelector('[data-met-sensitization]').dataset.metSensitization).toBe('carbides');
    expect(app.latest().met2_ceTally).toEqual(BASE.met2_ceTally); expect(app.latest().met2_cdPicks).toEqual(BASE.met2_cdPicks); expect(app.latest().met2_hazPred).toBe(-1); expect(app.latest().met2_cePred).toBeNull();
  });

  it('retains the original stainless prose and its existing Crack Detective cross-link', async () => {
    const app = await mount();
    for (const text of [
      'Welding inherently puts the HAZ through this temperature range. The longer it stays there, the more sensitization.',
      'Three solutions: (1) Low-heat-input welding (TIG, fast travel, no preheat). (2) "L-grade" stainless (304L, 316L) — low carbon (<0.03%) = less carbide formation. (3) "Stabilized" grades (321, 347) — contain Ti or Nb that form carbides preferentially, sparing Cr.',
      'Stainless TIG welding requires inert gas (argon) on BOTH sides of the joint. If the back side sees air at red heat, the surface oxidizes to a sugary black scale that\'s rust-prone. Sanitary welders use "purging" — flow argon through pipe interior during welding. Critical for food + pharma + nuclear pipe welding.'
    ]) expect(host.textContent).toContain(text);
    await pick('root'); await textButton('Spot weld decay in the Crack Detective →'); expect(panel()).toBeNull(); expect(app.latest().met2_cdIdx).toBe(3); expect(host.querySelector('[data-met-crack-evidence]').dataset.caseIndex).toBe('3'); expect(app.latest().met2_cdPicks).toEqual(BASE.met2_cdPicks);
  });

  it('preserves HAZ and CE prediction gates and stays out of every other metallurgy section', async () => {
    const app = await mount(); await pick('face');
    const hazTab = [...host.querySelectorAll('button')].find(el => el.textContent.includes('HAZ') && el.hasAttribute('aria-pressed')); expect(hazTab).toBeTruthy(); await React.act(() => hazTab.click());
    expect(panel()).toBeNull(); expect(host.querySelector('#met2-haz-h').disabled).toBe(true); expect(host.querySelector('[data-met-haz-cross-section]')).toBeTruthy(); expect(app.latest().met2_hazPred).toBe(-1);
    const ceTab = [...host.querySelectorAll('button')].find(el => el.textContent.includes('Carbon Equivalent') && el.hasAttribute('aria-pressed')); expect(ceTab).toBeTruthy(); await React.act(() => ceTab.click());
    expect(panel()).toBeNull(); expect(host.querySelector('[data-met-ce-workbench]')).toBeNull(); expect(app.latest().met2_cePred).toBeNull(); expect(app.latest().met2_ceFree).toBe(false);
    for (const met_sect of ['overview', 'phase', 'haz', 'ce', 'aluminum', 'cracking', 'pwht']) expect(render({ met_sect }).querySelector('[data-stainless-surfaces]')).toBeNull();
  });

  it('links primary qualitative sources without numerical settings, operational controls or simulated outcomes', async () => {
    await mount();
    expect([...panel().querySelectorAll('[data-stainless-sources] a')].map(el => el.href)).toEqual([
      'https://www.millerwelds.com/en-us/resources/knowledge-hub/industrial-welding/tube-pipe/how-to-weld-stainless-steel-tube-and-pipe-best-practices-for-corrosion-resistance-and-productivity',
      'https://www.twi-global.com/technical-knowledge/faqs/faq-what-is-heat-tint-and-how-do-i-avoid-it-during-welding-of-stainless-steels'
    ]);
    expect(panel().querySelector('input,select,animate,animateTransform,filter,linearGradient,radialGradient')).toBeNull(); expect(panel().textContent).not.toMatch(/\b\d+\s*(?:CFH|L\/min|ppm|psi|°[CF]|seconds|minutes)/i);
    const source = readFileSync(SRC, 'utf8'), helper = source.slice(source.indexOf('        function renderStainlessSurfaceLens() {'), source.indexOf('        function renderAluminumSurface() {'));
    expect(helper).not.toContain('upd('); expect(helper).not.toContain('usePersisted'); expect(helper).not.toContain('setInterval'); expect(helper).not.toContain('setTimeout'); expect(helper).not.toContain('computeWeldDefects');
    expect(helper).toContain("__alloT('stem.weldlab.metal10_"); expect(panel().querySelector('[data-stainless-model-note]').textContent).toContain('qualified procedure');
  });

  it('uses responsive geometry, 44px native controls, readable HTML and explicit contrast/focus treatment', async () => {
    await mount({}, true); expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const el of panel().querySelectorAll('button')) { expect(el.tagName).toBe('BUTTON'); expect(el.type).toBe('button'); expect(el.style.minHeight).toBe('44px'); expect(panel().querySelector('#' + el.getAttribute('aria-controls'))).toBeTruthy(); }
    expect(panel().querySelector('[data-stainless-surface-pick="both"]').style.background).toBe('rgb(255, 255, 0)'); expect(panel().querySelector('[data-stainless-surface-pick="both"]').style.color).toBe('rgb(0, 0, 0)'); expect(panel().querySelector('[data-stainless-surface-pick="face"]').style.background).toBe('rgb(0, 0, 0)');
    expect(scene().style.width).toBe('100%'); expect(scene().style.height).toBe('auto'); expect(scene().style.maxWidth).toBe('720px'); expect(scene().style.margin).toBe('0px auto');
    expect(panel().querySelector('[data-stainless-focus-reading]').getAttribute('aria-live')).toBe('polite'); expect(panel().querySelector('[data-stainless-focus-reading]').className).toContain('text-base');
    for (const el of panel().querySelectorAll('[data-stainless-reading] p, [data-stainless-reading] h5')) expect(el.className).toContain('text-base');
    for (const link of panel().querySelectorAll('a')) { expect(link.style.minHeight).toBe('44px'); expect(link.rel).toContain('noopener'); }
    const css = panel().querySelector('style').textContent; for (const value of ['outline:3px solid #ffff00!important', 'button:focus-visible', 'a:focus-visible', 'transition:none!important', 'animation:none!important']) expect(css).toContain(value);
    await pick('root'); expect(scene().querySelector('[data-stainless-focus-layer]').getAttribute('stroke')).toBe('#ffff00'); expect(panel().querySelector('[data-stainless-reading="root"]').style.borderColor).toBe('rgb(255, 255, 0)');
  });
});
