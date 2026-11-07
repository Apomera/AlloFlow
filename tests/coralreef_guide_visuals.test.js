import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Lane guidevis: "See it bleach" in the species profile (healthy, bleached and
// dead drawn from the 3D model, only for species whose model bleaches, only once a
// profile is open, words only without WebGL) and body-plan silhouettes for the
// species log's places not found yet.
vi.setConfig({ testTimeout: 120000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SPECIES = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const REAL_THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const S = (() => { const w = {}; new Function('window', SPECIES)(w); return w.Reef3DSpecies; })();
const mounted = [];
let X, GV, TX, made, renderers;

function stubSpecies() { window.THREE = { stub: true }; window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) }; }
// The real species file and three.js, with a WebGL renderer that only counts.
function drawableSpecies({ webgl = true } = {}) {
  made = []; renderers = [];
  class FakeRenderer {
    constructor(o) { if (!webgl) throw new Error('Error creating WebGL context.'); this.canvas = o.canvas; this.renders = 0; this.disposed = 0; this.capabilities = { isWebGL2: true }; renderers.push(this); }
    setPixelRatio() {} setSize() {} render() { this.renders++; } dispose() { this.disposed++; } forceContextLoss() {}
  }
  window.THREE = Object.assign(Object.create(REAL_THREE), { WebGLRenderer: FakeRenderer });
  window.Reef3DSpecies = Object.assign({}, S, {
    // Records what was asked for; builds the light model so the test stays quick.
    create: vi.fn((T, id, o) => { made.push({ id, ...o }); return S.create(REAL_THREE, id, { ...o, quality: 'low' }); })
  });
  let n = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/webp;base64,UklGR' + (n++));
}

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  stubSpecies();
  window.Reef3DExplore = { version: '1.0.0', mount: vi.fn(() => ({ dispose() {}, setInput() {}, resize() {}, getState: () => ({}) })) };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  GV = window.__RR_TEST_EXPORTS__.coralReefGuideVisuals;
  TX = X.speciesText((k, f) => f);
});
afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE;
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'guide', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR() {}, ...extra });
  }
  const item = { host, root, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
async function until(test, label) {
  for (let i = 0; i < 400; i++) { if (test()) return; await act(async () => { await new Promise((r) => setTimeout(r, 10)); }); }
  throw new Error('timed out waiting for ' + label);
}
const section = (host) => host.querySelector('[data-bleach-states]');
const shortName = (id) => TX[id].name.replace(/\s*\(.*\)\s*$/, '');
const bleachers = () => S.ids.filter((id) => S.info(id).healthStates.includes('bleached'));

describe('which profiles show the bleaching states', () => {
  it('follows the species file, and its fallback rule agrees with it for every catalog species', () => {
    for (const m of X.SPECIES_META) {
      if (!S.info(m.id)) continue;
      expect(GV.healthStates(m.id), m.id + ' (species file not loaded yet)').toEqual(S.info(m.id).healthStates);
    }
    window.Reef3DSpecies = { info: (id) => (id === 'brain_coral' ? { healthStates: ['healthy', 'dead'] } : null) };
    expect(GV.healthStates('brain_coral'), 'the loaded species file wins').toEqual(['healthy', 'dead']);
    expect(GV.bleaches('brain_coral')).toBe(false);
  });

  it('appears in every profile whose model bleaches, with one picture per state, and nowhere else', () => {
    window.Reef3DSpecies = S;
    const yes = bleachers().filter((id) => X.SPECIES_META.some((m) => m.id === id));
    expect(yes.length, 'the 17 bleaching corals and the 3 animals with algae partners').toBeGreaterThanOrEqual(20);
    for (const id of ['giant_clam', 'magnificent_anemone', 'christmas_tree_worm', 'brain_coral', 'table_coral']) expect(yes, id).toContain(id);
    const no = ['orange_cup_coral', 'soft_coral', 'sea_fan', 'barrel_sponge', 'clownfish', 'green_turtle', 'reef_star', 'crown_of_thorns'];
    for (const id of yes.concat(no)) {
      const html = renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: id } }, { reduceMotion: true });
      expect(html, id + ' profile').toContain('data-marine-profile="' + id + '"');
      const states = [...html.matchAll(/data-health-state="([a-z]+)"/g)].map((r) => r[1]);
      if (no.includes(id)) { expect(html, id).not.toContain('data-bleach-states'); continue; }
      expect(html, id).toContain('data-bleach-states="' + id + '"');
      expect(states, id).toEqual(S.info(id).healthStates);
      expect(html, id).not.toMatch(/undefined|NaN/);
    }
  });
});

describe('drawing the states', () => {
  it('draws nothing until a profile opens, then only the bleached and dead models, once, and disposes the renderer', async () => {
    drawableSpecies();
    const t = await mountTool();
    await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    expect(made.filter((m) => m.health !== 'healthy'), 'the guide list draws no health pictures').toEqual([]);
    expect(renderers).toHaveLength(0);
    expect(section(t.host)).toBeNull();
    await act(async () => { t.host.querySelector('[data-open-profile="brain_coral"]').click(); });
    expect(section(t.host)).toBeTruthy();
    // Opening the profile alone starts no renderer: the student asks first (predict-first).
    await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    expect(renderers, 'no renderer before Show me').toHaveLength(0);
    expect(section(t.host).querySelectorAll('[data-gv-predict]')).toHaveLength(2);
    await act(async () => { section(t.host).querySelector('[data-gv-show]').click(); });
    expect(document.activeElement, 'focus moves to the section heading').toBe(section(t.host).querySelector('h4'));
    await until(() => section(t.host).querySelectorAll('img[data-gv-drawn]').length === 2, 'two drawn pictures');
    expect(section(t.host).querySelector('[data-gv-show]'), 'no button once drawn').toBeNull();
    expect(made.map((m) => m.health)).toEqual(['bleached', 'dead']);
    for (const m of made) { expect(m.id).toBe('brain_coral'); expect(m.seed).toBe(7); expect(m.quality).toBe('high'); expect(m.reducedMotion).toBe(true); }
    expect(renderers, 'one renderer for the job').toHaveLength(1);
    await until(() => renderers[0].disposed === 1, 'renderer disposed');
    expect(renderers[0].renders).toBe(2);
    // Reopening the same species uses the pictures already drawn.
    const ids = X.SPECIES_META.map((m) => m.id), nextId = ids[(ids.indexOf('brain_coral') + 1) % ids.length];
    const nextDrawn = S.info(nextId) && S.info(nextId).healthStates.includes('bleached') ? S.info(nextId).healthStates.length - 1 : 0;
    await act(async () => { t.host.querySelector('[data-profile-next]').click(); });
    expect(t.host.querySelector('[data-marine-profile="' + nextId + '"]')).toBeTruthy();
    if (nextDrawn) { await act(async () => { t.host.querySelector('[data-bleach-states]').querySelector('[data-gv-show]').click(); }); }
    if (nextDrawn) await until(() => made.length === 2 + nextDrawn && renderers[1] && renderers[1].disposed === 1, 'the next species drawn');
    else { await act(async () => { await new Promise((r) => setTimeout(r, 60)); }); expect(made).toHaveLength(2); }
    await act(async () => { t.host.querySelector('[data-profile-previous]').click(); });
    await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    expect(made.filter((m) => m.id === 'brain_coral'), 'cached for the session').toHaveLength(2);
    expect(section(t.host).querySelectorAll('img[data-gv-drawn]')).toHaveLength(2);
  });

  it('names each state, with honest captions and short alt text built from the species name and state', async () => {
    drawableSpecies();
    const t = await mountTool({ guideSpeciesId: 'brain_coral' });
    await act(async () => { section(t.host).querySelector('[data-gv-show]').click(); });
    await until(() => section(t.host).querySelectorAll('img[data-gv-drawn]').length === 2, 'two drawn pictures');
    const box = section(t.host), items = [...box.querySelectorAll('li[data-health-state]')];
    expect(box.tagName).toBe('SECTION');
    expect(box.getAttribute('aria-labelledby')).toBe(box.querySelector('h4').id);
    expect(box.querySelector('h4').textContent).toBe('See it bleach');
    expect(box.querySelector('ol')).toBeTruthy();
    expect(items.map((li) => li.querySelector('.crgv-name').textContent)).toEqual(['Healthy', 'Bleached', 'Dead']);
    const caption = (s) => box.querySelector('li[data-health-state="' + s + '"] figcaption').textContent;
    expect(caption('bleached')).toMatch(/alive/i);
    expect(caption('bleached')).toMatch(/starving/i);
    expect(caption('bleached')).toMatch(/come back/i);
    expect(caption('dead')).toMatch(/turf algae/i);
    expect(caption('dead')).toMatch(/skeleton/i);
    const name = shortName('brain_coral');
    const img = (s) => box.querySelector('li[data-health-state="' + s + '"] img');
    expect(img('healthy').getAttribute('src')).toMatch(/assets\/coralreef\/species\/brain_coral\.webp$/);
    expect(img('healthy').alt).toBe(name + ', healthy and colorful');
    expect(img('bleached').alt).toBe(name + ', bleached white');
    expect(img('dead').alt).toBe(name + ', dead and covered in turf algae');
    expect(img('bleached').getAttribute('src')).toMatch(/^data:image\/webp/);
    for (const el of items) expect(el.querySelector('.crgv-dot').getAttribute('aria-hidden')).toBe('true');
    // No dashes the tests elsewhere reject, and every source is a link.
    expect(box.textContent).not.toMatch(/[–—‑]/);
    const links = [...box.querySelectorAll('.crgv-src a')];
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const a of links) { expect(a.href).toMatch(/^https:\/\//); expect(a.rel).toContain('noopener'); }
    // Nothing moves: no animation or transition in its styles.
    expect(box.querySelector('style').textContent).not.toMatch(/animation|transition|@keyframes/);
  });

  it('gives the animals with algae partners their own words: two states, never dead', async () => {
    window.Reef3DSpecies = S;
    const clam = renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: 'giant_clam' } });
    expect([...clam.matchAll(/data-health-state="([a-z]+)"/g)].map((r) => r[1])).toEqual(['healthy', 'bleached']);
    expect(clam).toContain('Algae living in its mantle');
    expect(clam).toContain('10.1007/s00338-024-02502-y');
    const worm = renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: 'christmas_tree_worm' } });
    expect(worm).toContain('The worms keep their colors.');
    expect(worm).toContain('The worms have no algae of their own.');
    const anemone = renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: 'magnificent_anemone' } });
    expect(anemone).toContain('Its clownfish stay');
    for (const html of [clam, worm, anemone]) expect(html).not.toContain('data-health-state="dead"');
  });

  it('falls back to words when the device has no WebGL', async () => {
    drawableSpecies({ webgl: false });
    const t = await mountTool({ guideSpeciesId: 'table_coral' });
    await act(async () => { section(t.host).querySelector('[data-gv-show]').click(); });
    await until(() => section(t.host).getAttribute('data-gv-mode') === 'text', 'text mode');
    const box = section(t.host);
    expect(box.querySelectorAll('img'), 'no lone healthy picture beside missing ones').toHaveLength(0);
    expect(box.querySelector('[data-gv-no-3d]').textContent).toContain('described in words');
    expect([...box.querySelectorAll('.crgv-name')].map((n) => n.textContent)).toEqual(['Healthy', 'Bleached', 'Dead']);
    expect(box.textContent).toContain('Still alive, but starving');
    expect(made, 'no model is built without a renderer').toHaveLength(0);
    expect(GV.pictures['table_coral|bleached']).toBe('none');
  });

  it('settles as words when three.js is only a stub, and the rest of the profile still renders', async () => {
    const t = await mountTool({ guideSpeciesId: 'staghorn_coral' });
    await act(async () => { section(t.host).querySelector('[data-gv-show]').click(); });
    await until(() => section(t.host).getAttribute('data-gv-mode') === 'text', 'text mode');
    expect(t.host.querySelector('[data-marine-profile="staghorn_coral"]')).toBeTruthy();
    expect(section(t.host).querySelectorAll('li[data-health-state]')).toHaveLength(3);
  });
});

describe('species log silhouettes', () => {
  it('shows a body plan per group on places not found yet, and the portrait on found ones', async () => {
    const log = { clownfish: {}, green_turtle: {}, giant_clam: {}, brain_coral: {}, reef_star: {} };
    const t = await mountTool({ section: 'explore', speciesLog: log });
    const card = t.host.querySelector('[data-species-log]');
    const shapes = {};
    for (const g of ['fish', 'reptile', 'invertebrate', 'coral', 'structure']) {
      const all = X.SPECIES_META.filter((m) => m.group === g), box = card.querySelector('[data-group="' + g + '"]');
      const missing = [...box.querySelectorAll('li.crf-tile-missing')];
      expect(missing.length, g).toBe(all.filter((m) => !log[m.id]).length);
      expect(missing.length, g + ' has places left').toBeGreaterThan(0);
      for (const li of missing) {
        expect(li.getAttribute('aria-hidden')).toBe('true');
        const svg = li.querySelector('svg[data-gv-silhouette]');
        expect(svg, g).toBeTruthy();
        expect(svg.getAttribute('data-gv-silhouette')).toBe(g);
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.querySelector('title'), 'a silhouette adds no text').toBeNull();
        expect(li.textContent.replace('?', '').trim()).toBe('');
      }
      shapes[g] = [...missing[0].querySelectorAll('svg path')].map((p) => p.getAttribute('d')).join('|');
      for (const li of box.querySelectorAll('li[data-found]')) {
        const button = li.querySelector('button[data-open-profile]');
        expect(button.getAttribute('aria-label')).toMatch(/^Study /);
        expect(li.querySelector('img').getAttribute('src')).toContain('assets/coralreef/species/' + li.getAttribute('data-found') + '.webp');
        expect(li.querySelector('svg[data-gv-silhouette]')).toBeNull();
      }
    }
    expect(new Set(Object.values(shapes)).size, 'every group has its own body plan').toBe(5);
    // A found tile's button stacks the picture above the name (it was squeezed into a row).
    const css = [...t.host.querySelectorAll('style')].map((s) => s.textContent).join('');
    expect(css).toContain('.crf-tile .crdx-log-open{flex-direction:column');
  });
});
