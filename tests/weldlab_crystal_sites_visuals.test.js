import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'metallurgy', met_sect: 'phase', met2_fecC: 0.4, met2_fecT: 850, met2_hazPred: -1, met2_hazMat: 'steel', met2_cePred: null, met2_ceFree: false, met2_ceTally: { n: 4, right: 3 }, met2_cdIdx: 0, met2_cdPicks: { 0: 1 } };
const CORNERS = [0, 1].flatMap(x => [0, 1].flatMap(y => [0, 1].map(z => [x, y, z])));
const FACES = [[0, 0.5, 0.5], [1, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 1, 0.5], [0.5, 0.5, 0], [0.5, 0.5, 1]];
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
const panel = () => host.querySelector('[data-crystal-inspector]');
const cell = (slot = 'selected') => panel().querySelector(`[data-crystal-cell="${slot}"]`);
const sites = (slot = 'selected') => [...cell(slot).querySelectorAll('[data-crystal-site]')];
const coords = el => ['x', 'y', 'z'].map(k => Number(el.dataset[k]));
const project = ([x, y, z]) => [64 + 120 * x + 50 * y, 210 - 40 * y - 120 * z];
async function pick(id) { await React.act(() => panel().querySelector(`[data-crystal-select="${id}"]`).click()); }
async function focus(id) { await React.act(() => panel().querySelector(`[data-crystal-focus="${id}"]`).click()); }
async function compare() { await React.act(() => panel().querySelector('[data-crystal-compare]').click()); }
async function textButton(text) { const el = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(el).toBeTruthy(); await React.act(() => el.click()); }

describe('BCC and FCC crystal-site inspector', () => {
  it('starts at BCC with eight cube corners and exactly one body-center site', async () => {
    await mount();
    expect(panel().dataset).toMatchObject({ crystalInspector: 'bcc', focus: 'centres', compare: 'false' });
    expect(panel().querySelectorAll('[data-crystal-cell]')).toHaveLength(1);
    expect(sites()).toHaveLength(9);
    expect(sites().filter(el => el.dataset.siteKind === 'corner').map(coords)).toEqual(CORNERS);
    expect(sites().filter(el => el.dataset.siteKind === 'body').map(coords)).toEqual([[0.5, 0.5, 0.5]]);
    expect(sites().some(el => el.dataset.siteKind === 'face')).toBe(false);
    expect(cell().querySelector('[data-crystal-count="corners"]').textContent).toBe('8');
    expect(cell().querySelector('[data-crystal-count="centres"]').textContent).toBe('1 · Body center');
    expect(cell().querySelector('[data-crystal-highlight-reading]').textContent).toBe('1 · Body center');
  });

  it('places FCC sites at all six face centers while retaining identical eight corners', async () => {
    await mount(); await pick('fcc');
    expect(panel().dataset.crystalInspector).toBe('fcc'); expect(sites()).toHaveLength(14);
    expect(sites().filter(el => el.dataset.siteKind === 'corner').map(coords)).toEqual(CORNERS);
    const faces = sites().filter(el => el.dataset.siteKind === 'face');
    expect(faces.map(coords)).toEqual(FACES);
    for (const face of faces) {
      const point = coords(face); expect(point.filter(n => n === 0.5)).toHaveLength(2); expect(point.filter(n => n === 0 || n === 1)).toHaveLength(1);
    }
    expect(sites().some(el => coords(el).every(n => n === 0.5))).toBe(false);
    expect(cell().querySelector('[data-crystal-count="centres"]').textContent).toBe('6 · Face centers');
    expect(cell().textContent).toContain('one site at the center of each of the six faces');
  });

  it('projects every site canonically and avoids marker collisions for the full union of15 positions', async () => {
    await mount();
    for (const id of ['bcc', 'fcc']) {
      await pick(id);
      for (const site of sites()) {
        const [x, y] = project(coords(site));
        expect(Number(site.getAttribute('cx'))).toBe(x); expect(Number(site.getAttribute('cy'))).toBe(y);
        expect(Number(site.getAttribute('r'))).toBe(7);
      }
    }
    const positions = [...CORNERS, [0.5, 0.5, 0.5], ...FACES].map(project);
    expect(new Set(positions.map(p => p.join(','))).size).toBe(15);
    for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) {
      expect(Math.hypot(positions[i][0] - positions[j][0], positions[i][1] - positions[j][1])).toBeGreaterThan(14);
    }
  });

  it('keeps every site visible and the cube fixed when selecting either focus group', async () => {
    await mount();
    const geometry = () => sites().map(el => [el.dataset.crystalSite, el.getAttribute('cx'), el.getAttribute('cy'), el.getAttribute('r'), el.getAttribute('fill')]);
    for (const id of ['bcc', 'fcc']) {
      await pick(id); const fixed = geometry(), edges = cell().querySelector('[data-crystal-edges]').outerHTML;
      for (const selection of ['corners', 'centres', 'corners']) {
        await focus(selection); expect(geometry()).toEqual(fixed); expect(cell().querySelector('[data-crystal-edges]').outerHTML).toBe(edges);
        const marked = sites().filter(el => el.dataset.highlighted === 'true');
        expect(marked).toHaveLength(selection === 'corners' ? 8 : id === 'bcc' ? 1 : 6);
        for (const site of sites()) { expect(site.getAttribute('opacity')).toBeNull(); expect(site.style.display).toBe(''); expect(site.style.visibility).toBe(''); }
      }
    }
    expect(cell().querySelectorAll('[data-crystal-edge]')).toHaveLength(12);
    for (const line of cell().querySelectorAll('[data-crystal-edge]')) {
      const a = [Number(line.getAttribute('x1')), Number(line.getAttribute('y1'))], b = [Number(line.getAttribute('x2')), Number(line.getAttribute('y2'))];
      expect(CORNERS.map(project)).toContainEqual(a); expect(CORNERS.map(project)).toContainEqual(b);
    }
  });

  it('compares distinct structures on the same projection and scale without changing selected focus', async () => {
    await mount(); await focus('corners'); await compare();
    expect(panel().querySelectorAll('[data-crystal-cell]')).toHaveLength(2);
    expect(cell().dataset.structure).toBe('bcc'); expect(cell('comparison').dataset.structure).toBe('fcc');
    for (const slot of ['selected', 'comparison']) {
      expect(cell(slot).dataset.focus).toBe('corners'); expect(cell(slot).style.flex).toBe('1 1 260px'); expect(cell(slot).style.minWidth).toBe('0px');
      expect(cell(slot).querySelector('svg').getAttribute('viewBox')).toBe('0 0 320 260');
      expect(cell(slot).querySelector('svg').style.width).toBe('100%'); expect(cell(slot).querySelector('svg').style.height).toBe('auto');
      expect(cell(slot).querySelector('svg').style.maxWidth).toBe('400px'); expect(cell(slot).querySelector('svg').style.margin).toBe('0px auto');
    }
    expect(cell().querySelector('[data-crystal-edges]').outerHTML).toBe(cell('comparison').querySelector('[data-crystal-edges]').outerHTML);
    expect(sites('comparison').filter(el => el.dataset.siteKind === 'corner').map(el => [el.getAttribute('cx'), el.getAttribute('cy')])).toEqual(sites().filter(el => el.dataset.siteKind === 'corner').map(el => [el.getAttribute('cx'), el.getAttribute('cy')]));
    await pick('fcc'); expect(cell().dataset.structure).toBe('fcc'); expect(cell('comparison').dataset.structure).toBe('bcc');
    await compare(); expect(panel().querySelectorAll('[data-crystal-cell]')).toHaveLength(1); expect(panel().dataset.focus).toBe('corners');
  });

  it('matches every full-size HTML coordinate row to its displayed site and explains boundary counts', async () => {
    await mount(); await compare();
    for (const slot of ['selected', 'comparison']) {
      const detail = cell(slot).querySelector('[data-crystal-coordinates]'); expect(detail.tagName).toBe('DETAILS');
      const rows = [...detail.querySelectorAll('[data-crystal-coordinate-row]')]; expect(rows).toHaveLength(sites(slot).length);
      for (const [i, row] of rows.entries()) {
        expect(row.dataset.crystalCoordinateRow).toBe(sites(slot)[i].dataset.crystalSite);
        expect([...row.querySelectorAll('td[data-coordinate]')].map(el => Number(el.textContent))).toEqual(coords(sites(slot)[i]));
      }
      expect(cell(slot).querySelector('[data-crystal-reading]').textContent).toContain('Corner sites shown8Center sites shown');
    }
    expect(panel().querySelector('[data-crystal-sharing-note]').textContent).toContain('shared with neighboring cells');
    expect(panel().querySelector('[data-crystal-sharing-note]').textContent).toContain('not counts of whole atoms per cell');
    expect(panel().querySelector('[data-crystal-model-note]').textContent).toContain('positions, not atom sizes or physical lattice lengths');
    expect(panel().querySelector('[data-crystal-model-note]').textContent).toContain('larger microstructures such as pearlite and bainite');
  });

  it('isolates local reference state from the FeC inputs, assessments and other metallurgy sections', async () => {
    const app = await mount(), saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await pick('fcc'); await focus('corners'); await compare(); await focus('centres');
    expect(JSON.stringify(app.latest())).toBe(saved); expect(app.writes).toHaveLength(writes);
    await React.act(() => Simulate.change(host.querySelector('#met2-fec-c'), { target: { value: '0.95' } }));
    expect(app.latest().met2_fecC).toBe(0.95); expect(panel().dataset.crystalInspector).toBe('fcc'); expect(panel().dataset.compare).toBe('true');
    expect(sites()).toHaveLength(14); expect(app.latest().met2_fecT).toBe(850); expect(app.latest().met2_ceTally).toEqual(BASE.met2_ceTally);
    await textButton('🔥 HAZ microstructure'); expect(panel()).toBeNull(); expect(host.querySelector('#met2-haz-h').disabled).toBe(true); expect(app.latest().met2_hazPred).toBe(-1);
    expect(host.querySelector('[aria-label="Your heat-input prediction"] [aria-checked="true"]')).toBeNull();
    await textButton('🌡 Phase diagrams'); expect(panel().dataset).toMatchObject({ crystalInspector: 'fcc', focus: 'centres', compare: 'true' });
    for (const met_sect of ['overview', 'haz', 'ce', 'stainless', 'aluminum', 'cracking', 'pwht']) expect(renderTool('weldLab', { weldLab: { ...BASE, met_sect } })).not.toContain('data-crystal-inspector');
    expect(renderTool('weldLab', { weldLab: { ...BASE, met_sect: 'ce' } })).not.toContain('data-met-ce-workbench');
  });

  it('preserves all phase teaching notes, the existing warning and the HAZ link', async () => {
    await mount();
    for (const text of [
      'Between A1 and A3 it shares the steel with ferrite. Face-centered cubic crystal. Dissolves carbon readily. Non-magnetic. Very ductile.',
      'Body-centered cubic. Holds very little carbon (at most about 0.022 %). Magnetic below about 1418 °F (770 °C). Soft + ductile.',
      'Mixture of ferrite + cementite (Fe3C) in alternating lamellar layers. Forms by slow cooling from austenite.',
      'Super-saturated body-centered tetragonal phase. Forms when austenite cools too fast for carbon to diffuse out.',
      'Hydrogen (cold) cracking in steel usually runs through hard, martensitic HAZ.',
      'Intermediate cooling rate. Acicular structure. Stronger than pearlite, tougher than martensite.',
      'This is why preheat matters', ': slowing the cooling rate prevents martensite formation.'
    ]) expect(host.textContent).toContain(text);
    expect(panel().querySelector('[data-crystal-site][data-site-kind="bct"]')).toBeNull();
    await textButton('See it happen in the HAZ Explorer →'); expect(panel()).toBeNull(); expect(host.querySelector('#met2-haz-h').disabled).toBe(true);
  });

  it('includes verified primary sources and native44px controls with explicit contrast and strong focus', async () => {
    await mount({}, true);
    expect(panel().style.background).toBe('rgb(0, 0, 0)'); expect(panel().style.color).toBe('rgb(255, 255, 255)');
    for (const button of panel().querySelectorAll('button')) { expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); expect(panel().querySelector('#' + button.getAttribute('aria-controls'))).toBeTruthy(); }
    const selected = panel().querySelector('[data-crystal-select="bcc"]'); expect(selected.style.background).toBe('rgb(255, 255, 0)'); expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(panel().querySelector('[data-crystal-select="fcc"]').style.background).toBe('rgb(0, 0, 0)');
    const css = panel().querySelector('style').textContent; expect(css).toContain('outline: 3px solid #ffff00 !important'); expect(css).toContain('summary:focus-visible'); expect(css).toContain('a:focus-visible'); expect(css).toContain('transition: none !important'); expect(css).toContain('animation: none !important');
    expect(cell().querySelector('[data-crystal-site="body"]').getAttribute('stroke')).toBe('#ffff00');
    expect(cell().querySelector('summary').style.minHeight).toBe('44px'); expect(cell().querySelector('[data-crystal-reading]').getAttribute('aria-live')).toBe('polite');
    const links = [...panel().querySelectorAll('[data-crystal-sources] a')];
    expect(links.map(a => a.href)).toEqual(['https://www.southampton.ac.uk/~pasr1/g11.htm', 'https://www.southampton.ac.uk/~pasr1/g33.htm', 'https://brearley.msm.cam.ac.uk/2003/Lattices/iron.html']);
    for (const link of links) { expect(link.style.minHeight).toBe('44px'); expect(link.rel).toContain('noopener'); }
    expect(panel().querySelector('animate,animateTransform,input,select')).toBeNull();
  });
});
