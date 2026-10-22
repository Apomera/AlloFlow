import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'metallurgy', met_sect: 'stainless', met2_cdIdx: 0, met2_cdPicks: { 0: 1 }, met2_ceTally: { n: 4, right: 3 }, met2_hazPred: 2 };
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
const panel = () => host.querySelector('[data-met-sensitization]');
const selected = () => panel().querySelector('[data-met-sens-scene="selected"]');
const boundaries = scene => [...scene.querySelectorAll('[data-met-sens-boundary]')].map(el => el.getAttribute('d'));
async function click(selector) { await React.act(() => host.querySelector(selector).click()); }
async function buttonText(text) { const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el).toBeTruthy(); await React.act(() => el.click()); }

describe('Stainless sensitization mechanism explorer', () => {
  it('starts at the initial condition with surface film distinct from internal boundaries', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ metSensitization: 'available', stage: '0', compare: 'false' });
    expect(panel().querySelectorAll('[data-met-sens-scene]')).toHaveLength(1);
    expect(selected().querySelectorAll('[data-met-sens-boundary]')).toHaveLength(3);
    const film = selected().querySelector('[data-met-sens-film]');
    expect(film.dataset.location).toBe('exposed-top-surface');
    expect(film.getAttribute('d')).toBe('M24 71 H456');
    expect(selected().querySelector('[data-met-sens-carbides],[data-met-sens-depleted],[data-met-sens-attack]')).toBeNull();
    expect(panel().querySelector('[data-met-sens-caption]').textContent).toContain('grain boundaries, not oxide films');
    expect(panel().querySelector('svg').getAttribute('aria-label')).toContain('oxide film only at the exposed top surface');
  });

  it('adds boundary carbides and adjacent depleted material before any service attack', async () => {
    await mount(); const initialGeometry = boundaries(selected());
    await click('[data-met-sens-stage="carbides"]');
    expect(panel().dataset.metSensitization).toBe('carbides');
    expect(boundaries(selected())).toEqual(initialGeometry);
    expect(selected().querySelector('[data-met-sens-carbides]').dataset.location).toBe('internal-boundaries');
    expect(selected().querySelector('[data-met-sens-depleted]').dataset.location).toBe('beside-internal-boundaries');
    expect(selected().querySelector('[data-met-sens-depleted]').getAttribute('clip-path')).toBe('url(#met4-sens-clip-selected)');
    expect(selected().querySelector('[data-met-sens-attack]')).toBeNull();
    const caption = panel().querySelector('[data-met-sens-caption]').textContent;
    expect(caption).toContain('800–1500°F'); expect(caption).toContain('Cr23C6');
    expect(caption).toContain('locally depletes chromium');
    expect(selected().querySelector('[data-met-sens-film]').getAttribute('d')).toBe('M24 71 H456');
  });

  it('points depletion callout four into the pale band clear of the carbide glyph', async () => {
    await mount(); await click('[data-met-sens-stage="carbides"]');
    const line = selected().querySelector('[data-met-sens-callout="depleted"]');
    expect(line.getAttribute('d')).toBe('M352 197 L316 181');
    expect(Math.hypot(316 - 307, 181 - 192)).toBeGreaterThan(12);
    // At y181 the boundary segment is x309.3; the 18px band spans ±9px.
    const boundaryX = 312 + (300 - 312) * (181 - 168) / (226 - 168);
    expect(Math.abs(316 - boundaryX)).toBeLessThan(9);
  });

  it('shows later corrosion at the depleted boundary while preserving grain coordinates', async () => {
    await mount(); const initialGeometry = boundaries(selected());
    await click('[data-met-sens-stage="attack"]');
    expect(boundaries(selected())).toEqual(initialGeometry);
    expect(selected().querySelector('[data-met-sens-attack]').dataset.location).toBe('depleted-grain-boundary');
    expect(selected().querySelector('[data-met-sens-carbides]')).toBeTruthy();
    expect(selected().querySelector('[data-met-sens-depleted]')).toBeTruthy();
    expect(selected().querySelector('[data-met-sens-film]').getAttribute('d')).toBe('M24 71 H151 M175 71 H456');
    const caption = panel().querySelector('[data-met-sens-caption]').textContent;
    expect(caption).toContain('months or years later in service');
    expect(caption).toContain('not a crack forming during welding');
    expect(panel().querySelector('[data-met-sens-legend]').textContent).toContain('Dark marks: intergranular corrosion');
  });

  it('compares the same initial geometry without creating duplicate clip IDs or resetting the stage', async () => {
    await mount(); await click('[data-met-sens-stage="attack"]'); await click('[data-met-sens-compare]');
    const reference = panel().querySelector('[data-met-sens-scene="reference"]');
    expect(reference.dataset.stage).toBe('available'); expect(selected().dataset.stage).toBe('attack');
    expect(boundaries(reference)).toEqual(boundaries(selected()));
    expect(reference.querySelector('[data-met-sens-attack],[data-met-sens-carbides],[data-met-sens-depleted]')).toBeNull();
    expect([...panel().querySelectorAll('clipPath')].map(el => el.id)).toEqual(['met4-sens-clip-reference', 'met4-sens-clip-selected']);
    for (const scene of panel().querySelectorAll('[data-met-sens-scene]')) {
      expect(scene.querySelector('svg').getAttribute('viewBox')).toBe('0 0 480 250');
      expect(parseFloat(scene.style.minWidth)).toBe(0); expect(scene.style.flex).toBe('1 1 270px');
    }
    await click('[data-met-sens-stage="available"]');
    expect(panel().querySelectorAll('[data-met-sens-scene]')).toHaveLength(1);
    expect(panel().dataset.compare).toBe('true');
    expect(panel().querySelector('[data-met-sens-compare-help]').textContent).toContain('Choose a later stage');
    await click('[data-met-sens-stage="carbides"]');
    expect(panel().querySelectorAll('[data-met-sens-scene]')).toHaveLength(2);
    await click('[data-met-sens-compare]'); expect(panel().querySelectorAll('[data-met-sens-scene]')).toHaveLength(1);
    expect(panel().dataset.metSensitization).toBe('carbides');
  });

  it('keeps all stage exploration local without changing assessment answers or tallies', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const stage of ['attack', 'carbides', 'available', 'attack']) await click(`[data-met-sens-stage="${stage}"]`);
    await click('[data-met-sens-compare]'); await click('[data-met-sens-compare]');
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
  });

  it('retains the authored prevention, backside oxidation and Crack Detective route', async () => {
    await mount();
    expect(host.textContent).toContain('The longer it stays there, the more sensitization');
    expect(host.textContent).toContain('304L, 316L'); expect(host.textContent).toContain('321, 347');
    expect(host.textContent).toContain('Stainless TIG welding requires inert gas (argon) on BOTH sides');
    expect(host.textContent).toContain('sugary black scale');
    await buttonText('Spot weld decay in the Crack Detective →');
    expect(panel()).toBeNull();
    const crack = host.querySelector('[data-met-crack-evidence]'); expect(crack).toBeTruthy();
    expect(crack.dataset.caseIndex).toBe('3');
  });

  it('keeps the reference section separate from assessment gates and preserves hook order across tabs', async () => {
    await mount(); await click('[data-met-sens-stage="attack"]');
    await buttonText('🌡 PWHT'); expect(panel()).toBeNull(); expect(host.textContent).toContain('Post-Weld Heat Treatment');
    await buttonText('🥄 Stainless sensitization'); expect(panel().dataset.metSensitization).toBe('attack');
    for (const met_sect of ['ce', 'haz', 'phase', 'cracking']) {
      const html = renderTool('weldLab', { weldLab: { ...BASE, met_sect } });
      expect(html).not.toContain('data-met-sensitization');
    }
  });

  it('uses native 44px controls, readable HTML legend and explicit contrast selections', async () => {
    await mount({}, true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const el of panel().querySelectorAll('button')) { expect(el.tagName).toBe('BUTTON'); expect(el.type).toBe('button'); expect(el.style.minHeight).toBe('44px'); }
    const selectedButton = panel().querySelector('[data-met-sens-stage="available"]');
    expect(selectedButton.getAttribute('aria-pressed')).toBe('true'); expect(selectedButton.style.background).toBe('rgb(255, 255, 0)'); expect(selectedButton.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-met-sens-stage="carbides"]').style.background).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-met-sens-caption]').getAttribute('aria-live')).toBe('polite');
    expect(panel().querySelector('[data-met-sens-legend]').textContent).toContain('oxide film at the exposed surface');
    expect(panel().querySelector('[data-met-sens-note]').textContent).toContain('not atom counts or proportions');
    expect(panel().querySelector('[data-met-sens-note]').textContent).toContain('thermal cycle, exposure time, corrosion rate or risk');
    expect(panel().querySelector('animate,animateTransform')).toBeNull();
  });
});
