import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Lane F3: the dive's interface. The identification card, the nearby list, the
// species log collection, the HUD, the site pictures and the portrait backdrop.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const mounted = [];
let engines, nearby, X, TX, GN;

const NEAR = [
  { uid: 'o1', speciesId: 'clownfish', distanceM: 2, inView: true },
  { uid: 'o2', speciesId: 'green_turtle', distanceM: 3, inView: true },
  { uid: 'o3', speciesId: 'brain_coral', distanceM: 3, inView: false },
  { uid: 'o4', speciesId: 'giant_clam', distanceM: 5, inView: false },
  { uid: 'o5', speciesId: 'reef_star', distanceM: 6, inView: true }
];

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = [];
  nearby = NEAR.map((n) => ({ ...n }));
  window.Reef3DExplore = {
    version: '1.0.0',
    mount: vi.fn((canvas, options) => {
      let state = { ready: true, paused: false, view: 'third', diver: { depthM: 8, headingDeg: 90 }, focused: null, nearby };
      const controller = {
        canvas, options, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(),
        getState: () => state,
        emit(patch) { state = { ...state, ...patch }; options.onState(state); },
        focus: vi.fn((uid) => { const found = state.nearby.find((n) => n.uid === uid); if (found) controller.emit({ focused: found }); }),
        swimTo: vi.fn(), focusNext: vi.fn(), focusPrevious: vi.fn(), clearFocus: vi.fn(),
        setView: vi.fn((view) => controller.emit({ view })), setPaused: vi.fn((paused) => controller.emit({ paused }))
      };
      engines.push(controller);
      options.onState(state);
      return controller;
    })
  };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((k, f) => f);
  GN = ['Fish', 'Sea turtles', 'Invertebrates and sponges', 'Corals', 'Restoration structures'];
});

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    await act(async () => item.root.unmount());
    item.host.remove();
  }
  delete window.Reef3DExplore;
  delete window.Reef3DSpecies;
  delete window.THREE;
  delete window.matchMedia;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'explore', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (m) => announcements.push(m), ...extra });
  }
  const item = { host, root, announcements, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const buttons = (el, label) => [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === label);
async function click(node) { await act(async () => { node.click(); await Promise.resolve(); }); }
async function startDive(t) { await click(buttons(t.host, 'Start the dive')[0]); expect(engines).toHaveLength(1); return engines[0]; }
// Everything a row shows or carries: text, every attribute value, image sources.
function rowSurface(li) {
  const parts = [li.textContent];
  for (const el of [li, ...li.querySelectorAll('*')]) for (const a of el.attributes) parts.push(a.value);
  return parts.join(' | ');
}

describe('nearby list', () => {
  it('never names an unidentified organism, its scientific name or its group', async () => {
    const t = await mountTool();
    await startDive(t);
    const rows = [...t.host.querySelectorAll('li.crf-row')];
    expect(rows).toHaveLength(NEAR.length);
    for (const [i, li] of rows.entries()) {
      const id = NEAR[i].speciesId, meta = X.SPECIES_META.find((m) => m.id === id), surface = rowSurface(li);
      expect(li.getAttribute('data-known')).toBe('false');
      for (const word of [TX[id].name, id, meta.scientific, ...GN].filter(Boolean)) expect(surface.includes(word), id + ' row leaks ' + word).toBe(false);
      expect(li.querySelector('img'), id + ' row shows no picture').toBeNull();
      expect(li.textContent).toContain('Not identified yet');
      // Each row and its buttons still say how far and whether it is in view.
      const view = NEAR[i].inView ? 'in view' : 'out of view';
      expect(li.textContent).toContain(NEAR[i].distanceM + ' m, ' + view);
      for (const b of li.querySelectorAll('button')) expect(b.getAttribute('aria-label')).toContain(NEAR[i].distanceM + ' m, ' + view);
    }
  });

  it('shows the picture and name of an organism already in the log', async () => {
    const t = await mountTool({ speciesLog: { brain_coral: { site: 'healthy' } } });
    await startDive(t);
    const row = [...t.host.querySelectorAll('li.crf-row')][2];
    expect(row.getAttribute('data-known')).toBe('true');
    expect(row.textContent).toContain(TX.brain_coral.name);
    expect(row.querySelector('img').getAttribute('src')).toContain('brain_coral');
    expect(t.host.textContent).toContain('5 nearby, 4 still to identify.');
  });
});

describe('identification card', () => {
  it('sets the guess beside the marks after a miss, keeps the missed card focusable, then reveals and announces the species', async () => {
    const t = await mountTool();
    const engine = await startDive(t);
    await act(async () => engine.focus('o1'));
    const group = t.host.querySelector('[role="group"][aria-label="Identify it"]');
    const wrong = [...group.querySelectorAll('button')].find((b) => b.textContent !== TX.clownfish.name);
    const guessId = X.SPECIES_META.find((m) => TX[m.id] && TX[m.id].name === wrong.textContent).id;
    await click(wrong);
    expect(wrong.disabled).toBe(false);
    expect(wrong.getAttribute('aria-disabled')).toBe('true');
    expect(document.getElementById(wrong.getAttribute('aria-describedby')).textContent).toContain('Not this one');
    const compare = t.host.querySelector('[data-compare]');
    expect(compare.textContent).toContain(TX[guessId].name);
    for (const mark of TX[guessId].marks) expect(compare.textContent).toContain(mark);
    for (const mark of TX.clownfish.marks) expect(t.host.querySelector('.crf-look').textContent).toContain(mark);
    const said = t.announcements.length;
    await click(wrong);
    expect(t.announcements.length, 'a missed card does nothing when pressed again').toBe(said);
    await click(buttons(group, TX.clownfish.name)[0]);
    const reveal = t.host.querySelector('[data-reveal="clownfish"]');
    expect(reveal).toBeTruthy();
    const img = reveal.querySelector('img');
    expect(img.getAttribute('alt')).toBe('3D model of a ' + TX.clownfish.name);
    expect(img.getAttribute('src')).toContain('clownfish');
    expect(reveal.textContent).toContain('Correct!');
    expect(reveal.textContent).toContain(TX.clownfish.role);
    expect(reveal.textContent).toContain(TX.clownfish.fact);
    expect(t.announcements.some((m) => m.includes(TX.clownfish.name) && m.includes('Added to your species log'))).toBe(true);
    expect(document.activeElement.tagName).toBe('H4');
    expect(document.activeElement.textContent).toBe(TX.clownfish.name);
    expect(reveal.contains(document.activeElement)).toBe(true);
    expect(t.data.coralReef.speciesLog.clownfish.site).toBe('healthy');
  });

  it('celebrates with motion only when reduced motion is off', async () => {
    const still = await mountTool({}, { reduceMotion: true });
    let engine = await startDive(still);
    await act(async () => engine.focus('o1'));
    await click(buttons(still.host.querySelector('[aria-label="Identify it"]'), TX.clownfish.name)[0]);
    let reveal = still.host.querySelector('[data-reveal]');
    expect(reveal.className).not.toContain('crf-anim');
    expect(reveal.querySelector('.crf-bubbles')).toBeNull();
    const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove();
    engines = [];
    const moving = await mountTool();
    engine = await startDive(moving);
    await act(async () => engine.focus('o1'));
    await click(buttons(moving.host.querySelector('[aria-label="Identify it"]'), TX.clownfish.name)[0]);
    reveal = moving.host.querySelector('[data-reveal]');
    expect(reveal.className).toContain('crf-anim');
    expect(reveal.querySelector('.crf-bubbles').getAttribute('aria-hidden')).toBe('true');
  });
});

describe('species log collection', () => {
  it('has a place for every species, and its counts match the log', async () => {
    const log = { clownfish: {}, blue_tang: {}, green_turtle: {}, brain_coral: {}, giant_clam: {}, reef_star: {} };
    const t = await mountTool({ speciesLog: log });
    const card = t.host.querySelector('[data-species-log]');
    for (const g of ['fish', 'reptile', 'invertebrate', 'coral', 'structure']) {
      const all = X.SPECIES_META.filter((m) => m.group === g), found = all.filter((m) => log[m.id]);
      const box = card.querySelector('[data-group="' + g + '"]');
      expect(box.querySelectorAll('li.crf-tile'), g).toHaveLength(all.length);
      expect([...box.querySelectorAll('li[data-found]')].map((li) => li.getAttribute('data-found')).sort(), g).toEqual(found.map((m) => m.id).sort());
      expect(card.querySelector('[data-count="' + g + '"]').textContent, g).toContain(found.length + ' of ' + all.length + ' found');
      for (const li of box.querySelectorAll('li.crf-tile-missing')) {
        expect(li.getAttribute('aria-hidden')).toBe('true');
        expect(li.textContent.replace('?', '').trim(), 'a missing tile has no name').toBe('');
      }
      for (const li of box.querySelectorAll('li[data-found]')) expect(li.querySelector('img')).toBeTruthy();
    }
    const living = X.SPECIES_META.filter((m) => m.group !== 'structure');
    expect(t.host.textContent).toContain('Species log: 5 of ' + living.length + ' found.');
  });

  it('starts folded on a phone and opens with its button', async () => {
    window.matchMedia = vi.fn((q) => ({ matches: /max-width: 640px/.test(q), media: q, addListener() {}, removeListener() {} }));
    const t = await mountTool();
    const toggle = buttons(t.host, 'Show the log')[0];
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    const grid = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(grid.hidden).toBe(true);
    expect(t.host.querySelector('[data-count="fish"]')).toBeTruthy();
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(grid.hidden).toBe(false);
  });
});

describe('dive HUD', () => {
  it('is hidden from assistive tech and repeats only what the page already says', async () => {
    const t = await mountTool({ speciesLog: { clownfish: {} } });
    await startDive(t);
    const hud = t.host.querySelector('[data-dive-hud]');
    expect(hud.getAttribute('aria-hidden')).toBe('true');
    expect(hud.textContent).toContain('Depth: 8 m');
    expect(hud.textContent).toContain('Facing east');
    expect(hud.textContent).toContain('4 nearby to identify');
    const controls = t.host.querySelector('.cr-dive-controls');
    expect(controls.textContent).toContain('Depth: 8 m');
    expect(controls.textContent).toContain('Facing east');
    expect(t.host.textContent).toContain('5 nearby, 4 still to identify.');
    expect(hud.querySelector('button, a, [tabindex]')).toBeNull();
    const css = [...t.host.querySelectorAll('style')].map((s) => s.textContent).join('');
    expect(css).toMatch(/\.crf-hud\{[^}]*pointer-events:none/);
  });
});

describe('site picker pictures', () => {
  it('draws each reef with its own coral, bleaching, seaweed and frames', () => {
    const html = renderTool('coralReef', { coralReef: { section: 'explore' } });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const art = (id) => doc.querySelector('button[data-site="' + id + '"] svg.crf-site-art');
    const count = (id, cat) => art(id).querySelectorAll('[data-spot-cat="' + cat + '"]').length;
    for (const id of ['healthy', 'restoration', 'heatwave', 'damaged']) {
      expect(art(id), id).toBeTruthy();
      expect(art(id).getAttribute('aria-hidden')).toBe('true');
    }
    expect(count('healthy', 'bleached_coral')).toBe(0);
    expect(count('heatwave', 'bleached_coral')).toBeGreaterThan(count('heatwave', 'hard_coral'));
    expect(art('heatwave').querySelector('[data-heat]')).toBeTruthy();
    expect(art('healthy').querySelector('[data-heat]')).toBeNull();
    expect(count('damaged', 'macroalgae')).toBeGreaterThan(3 * count('healthy', 'macroalgae'));
    expect(count('damaged', 'hard_coral')).toBeLessThan(count('healthy', 'hard_coral') / 3);
    expect(art('restoration').querySelectorAll('[data-frame]').length).toBeGreaterThan(0);
    expect(art('healthy').querySelectorAll('[data-frame]').length).toBe(0);
    for (const [id, tag] of [['healthy', 'Crowded with live coral'], ['heatwave', 'Many corals bleached white'], ['damaged', 'Little coral, more seaweed']]) {
      expect(doc.querySelector('button[data-site="' + id + '"]').textContent).toContain(tag);
    }
    // A reef from the Reef Future model gets a picture too, captioned with its modeled coral.
    const settings = X.scenarioSettings('recent'), row = X.runScenario(settings, 7)[10], site = X.exploreSiteFromModel(row, settings);
    const modelDoc = new DOMParser().parseFromString(renderTool('coralReef', { coralReef: { section: 'explore', diveSiteId: 'model', diveModelSite: site } }), 'text/html');
    const model = modelDoc.querySelector('button[data-site="model"]');
    expect(model.querySelector('svg.crf-site-art')).toBeTruthy();
    expect(model.textContent).toContain('Live coral: ' + Math.round(site.health.coralCover * 100) + '% of the bottom.');
  });
});

describe('guide portraits', () => {
  it('draw on an underwater backdrop with a contact shadow only under bottom dwellers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const ctx2d = { fillStyle: '', createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData: vi.fn(),
      createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), fillRect() {} };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
    const seen = {};
    let current = null;
    window.THREE = { ...THREE, WebGLRenderer: class {
      setPixelRatio() {} setSize() {}
      render(scene) {
        seen[current] = { background: scene.background, shadows: scene.children.filter((c) => c.isMesh && c.material && c.material.transparent && c.material.map).length };
      }
      dispose() {} forceContextLoss() {}
    } };
    const INFO = { brain_coral: { group: 'coral', habit: 'sessile' }, blue_sea_star: { group: 'invertebrate', habit: 'bottom' }, clownfish: { group: 'fish', habit: 'pair' } };
    window.Reef3DSpecies = {
      version: '1.0.0', info: (id) => INFO[id] || { group: 'fish', habit: 'solitary' },
      create(T, id) {
        current = id;
        const root = new T.Group(); root.add(new T.Mesh(new T.BoxGeometry(0.4, 0.3, 0.4), new T.MeshBasicMaterial()));
        root.children[0].position.y = 0.15;
        return { root, radius: 0.3, dispose() {} };
      }
    };
    await mountTool({ section: 'guide', guidePictures: true });
    await act(async () => vi.runAllTimersAsync());
    expect(Object.keys(seen)).toHaveLength(X.SPECIES_META.length);
    for (const id of Object.keys(seen)) expect(seen[id].background && seen[id].background.isTexture, id + ' backdrop').toBe(true);
    expect(ctx2d.putImageData).toHaveBeenCalled();
    expect(seen.brain_coral.shadows).toBe(1);
    expect(seen.blue_sea_star.shadows).toBe(1);
    expect(seen.clownfish.shadows).toBe(0);
  });
});
