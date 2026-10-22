import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'metallurgy', met_sect: 'aluminum', met2_hazMat: 'steel', met2_hazH: 16, met2_hazTh: 0.25, met2_hazProbe: 2, met2_hazPred: -1, met2_cePred: null, met2_ceFree: false, met2_ceTally: { n: 4, right: 3 }, met2_cdIdx: 3, met2_cdPicks: { 0: 1, 3: 2 } };
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return { latest: () => latest, writes };
}
const panel = () => host.querySelector('[data-met-aluminum]');
const scene = () => panel().querySelector('[data-met-al-scene]');
const layer = id => panel().querySelector(`[data-met-al-layer="${id}"]`);
const reading = id => panel().querySelector(`[data-met-al-polarity-reading="${id}"] dd`);
async function phase(id) { await React.act(() => panel().querySelector(`[data-met-al-phase="${id}"]`).click()); }
async function textButton(text) { const button = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(button).toBeTruthy(); await React.act(() => button.click()); }

describe('Aluminum oxide and AC polarity reference explorer', () => {
  it('starts with the surface and identifies a continuous oxide strip above the metal', async () => {
    await mount();
    expect(panel().dataset.metAluminum).toBe('surface');
    expect(panel().querySelectorAll('[data-met-al-phase]')).toHaveLength(3);
    expect(layer('metal').tagName).toBe('rect'); expect(layer('oxide').tagName).toBe('rect');
    expect(['x', 'y', 'width', 'height'].map(k => layer('metal').getAttribute(k))).toEqual(['48', '156', '544', '72']);
    expect(['x', 'y', 'width', 'height'].map(k => layer('oxide').getAttribute(k))).toEqual(['48', '148', '544', '8']);
    expect(Number(layer('oxide').getAttribute('y')) + Number(layer('oxide').getAttribute('height'))).toBe(Number(layer('metal').getAttribute('y')));
    expect(panel().querySelector('[data-met-al-focus="surface"]')).toBeTruthy();
    expect(scene().querySelector('[data-met-al-polarities]')).toBeNull();
    expect(reading('electrode').textContent).toBe('Not selected'); expect(reading('workpiece').textContent).toBe('Not selected');
    expect(panel().querySelector('[data-met-al-legend]').textContent).toContain('surface oxide (Al2O3)');
    expect(panel().querySelector('[data-met-al-caption]').textContent).toContain('thickness is enlarged');
  });

  it('pairs EP and EN signs with exact full-size polarity readings and their distinct roles', async () => {
    await mount();
    for (const [id, electrode, workpiece, phrase] of [
      ['ep', '+ positive', '− negative', 'cathodic cleaning acts at the workpiece surface'],
      ['en', '− negative', '+ positive', 'more heat goes into the workpiece']
    ]) {
      await phase(id);
      expect(panel().dataset.metAluminum).toBe(id); expect(scene().dataset.metAlScene).toBe(id);
      expect(panel().querySelector('[data-met-al-reading]').dataset.metAlReading).toBe(id);
      expect(reading('electrode').textContent).toBe(electrode); expect(reading('workpiece').textContent).toBe(workpiece);
      expect(scene().querySelector('[data-met-al-polarity="electrode"]').textContent).toBe(electrode[0]);
      expect(scene().querySelector('[data-met-al-polarity="workpiece"]').textContent).toBe(workpiece[0]);
      expect(panel().querySelector('[data-met-al-caption]').textContent).toContain(phrase);
      expect(panel().querySelectorAll('[data-met-al-phase][aria-pressed="true"]')).toHaveLength(1);
    }
    await phase('surface'); expect(reading('electrode').dataset.polarity).toBe('none');
  });

  it('keeps one plate, one continuous oxide layer and the torch fixed through every snapshot', async () => {
    await mount();
    const initial = [layer('metal').outerHTML, layer('oxide').outerHTML, scene().querySelector('[data-met-al-torch]').outerHTML];
    for (const id of ['ep', 'en', 'surface', 'en']) {
      await phase(id);
      expect([layer('metal').outerHTML, layer('oxide').outerHTML, scene().querySelector('[data-met-al-torch]').outerHTML]).toEqual(initial);
      expect(panel().querySelectorAll('[data-met-al-layer]')).toHaveLength(2);
      expect(scene().querySelector('linearGradient,radialGradient,animate,animateTransform')).toBeNull();
    }
    expect(panel().querySelector('[data-met-al-note]').textContent).toContain('oxide stays visible in every snapshot');
    expect(panel().querySelector('[data-met-al-note]').textContent).toContain('not layer thickness, cleaning rate, heat distribution or a welding setting');
  });

  it('locates EP at the surface and the EN pointer inside metal without adding a heat field', async () => {
    await mount(); await phase('ep');
    const ep = scene().querySelector('[data-met-al-focus="ep"]');
    expect(ep.tagName).toBe('ellipse'); expect(Number(ep.getAttribute('cy'))).toBe(152);
    expect(Number(ep.getAttribute('cy'))).toBeGreaterThanOrEqual(Number(layer('oxide').getAttribute('y')));
    expect(Number(ep.getAttribute('cy'))).toBeLessThan(Number(layer('metal').getAttribute('y')));
    expect(ep.getAttribute('fill')).toBe('none');
    await phase('en');
    const en = scene().querySelector('[data-met-al-focus="en"]');
    expect(en.querySelector('path').getAttribute('d')).toBe('M420 202 H320 V184');
    const point = en.querySelector('circle');
    expect(Number(point.getAttribute('cy'))).toBeGreaterThan(Number(layer('metal').getAttribute('y')));
    expect(Number(point.getAttribute('cy'))).toBeLessThan(228);
    expect(en.querySelector('path').getAttribute('fill')).toBe('none');
    expect(panel().querySelector('[data-met-al-caption]').textContent).toContain('not a temperature map');
  });

  it('uses the identical zero-to-4000 reference axis in all modes with fixed approximate melting markers', async () => {
    await mount();
    const axis = () => panel().querySelector('[data-met-al-axis]');
    const original = axis().outerHTML;
    expect(axis().getAttribute('viewBox')).toBe('0 0 640 80');
    for (const [id, temp] of [['metal', 1220], ['oxide', 3700]]) {
      const marker = axis().querySelector(`[data-met-al-reference="${id}"]`);
      expect(Number(marker.dataset.temperatureF)).toBe(temp);
      for (const attr of ['x1', 'x2']) expect(Number(marker.querySelector('line').getAttribute(attr))).toBeCloseTo(32 + temp / 4000 * 576, 12);
      expect(Number(marker.querySelector('circle').getAttribute('cx'))).toBeCloseTo(32 + temp / 4000 * 576, 12);
      expect(panel().querySelector(`[data-met-al-reference-reading="${id}"]`).textContent).toContain('≈' + temp + '°F');
    }
    expect([...panel().querySelectorAll('[data-met-al-axis-label]')].map(el => el.textContent)).toEqual(['0', '1000', '2000', '3000', '4000']);
    for (const id of ['ep', 'en', 'surface']) { await phase(id); expect(axis().outerHTML).toBe(original); }
    expect(panel().querySelector('[data-met-al-reference-note]').textContent).toContain('Approximate melting references');
  });

  it('corrects only the AC mechanism paragraph with a new key and preserves prep, conductivity and sources', async () => {
    await mount();
    expect(host.textContent).toContain('EP provides cathodic cleaning that removes surface oxide; EN puts more heat into the workpiece.');
    expect(host.textContent).toContain('Standard DCEN TIG does not provide this EP cleaning action.');
    expect(host.textContent).not.toContain('blasting oxide off'); expect(host.textContent).not.toContain('Pure DC TIG can\'t do this');
    expect(host.textContent).toContain('using a brush DEDICATED to aluminum');
    expect(host.textContent).toContain('A thin oxide starts re-forming at once and thickens with time');
    expect(host.textContent).toContain('Aluminum-specific etching solution removes oxide. More thorough but adds prep time. Used for critical aerospace welds.');
    expect(host.textContent).toContain('Aluminum 6061 conducts heat roughly 3-4× faster than mild steel (about 167 vs 50 W/m·K)');
    expect(host.textContent).toContain('a tuned bead-shape number, not this conductivity ratio.');
    const links = [...panel().querySelectorAll('[data-met-al-sources] a')];
    expect(links.map(a => a.href)).toEqual([
      'https://www.millerwelds.com/en-us/resources/knowledge-hub/tig-welding/how-to/how-to-implement-ac-balance-control-for-tig-aluminum-welding',
      'https://www.jstage.jst.go.jp/article/qjjws/29/3/29_3_5s/_article/-char/en'
    ]);
    const source = readFileSync(SRC, 'utf8');
    expect(source).toContain("__alloT('stem.weldlab.alternating_current_tig_includes_a_cle_r2', 'AC TIG alternates");
    expect(source).not.toContain("__alloT('stem.weldlab.alternating_current_tig_includes_a_cle',");
  });

  it('keeps snapshot state local, preserves assessment gates and retains the aluminum HAZ route', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const id of ['ep', 'en', 'surface', 'en']) await phase(id);
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
    await textButton('🌡 PWHT'); expect(panel()).toBeNull();
    await textButton('🌫 Aluminum oxidation'); expect(panel().dataset.metAluminum).toBe('en');
    await textButton("Why aluminum's HAZ softens → HAZ Explorer");
    expect(panel()).toBeNull(); expect(app.latest().met2_hazMat).toBe('aluminum');
    expect(app.latest().met2_hazPred).toBe(-1); expect(host.querySelector('[data-met-haz-cross-section]')).toBeNull();
    expect(app.latest().met2_ceTally).toEqual(BASE.met2_ceTally); expect(app.latest().met2_cdPicks).toEqual(BASE.met2_cdPicks);
    const ce = renderTool('weldLab', { weldLab: { ...BASE, met_sect: 'ce' } });
    expect(ce).not.toContain('data-met-ce-workbench'); expect(ce).not.toContain('data-met-aluminum');
    for (const met_sect of ['phase', 'stainless', 'cracking', 'pwht']) expect(renderTool('weldLab', { weldLab: { ...BASE, met_sect } })).not.toContain('data-met-aluminum');
  });

  it('provides responsive geometry, native 44px manual controls and visible contrast focus', async () => {
    await mount({}, true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const button of panel().querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px');
      expect(panel().querySelector('#' + button.getAttribute('aria-controls'))).toBeTruthy();
    }
    const selected = panel().querySelector('[data-met-al-phase="surface"]');
    expect(selected.style.background).toBe('rgb(255, 255, 0)'); expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-met-al-phase="ep"]').style.background).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('style').textContent).toContain('outline: 3px solid #ffff00');
    expect(panel().querySelector('style').textContent).toContain('a:focus-visible');
    expect(panel().querySelector('style').textContent).toContain('transition: none !important');
    expect(scene().getAttribute('viewBox')).toBe('0 0 640 260'); expect(scene().style.width).toBe('100%'); expect(scene().style.height).toBe('auto');
    expect(panel().querySelector('[data-met-al-reading]').getAttribute('aria-live')).toBe('polite');
    expect(panel().querySelector('animate,animateTransform,input[type="range"]')).toBeNull();
    await phase('ep'); expect(reading('electrode').textContent).toBe('+ positive');
  });
});
