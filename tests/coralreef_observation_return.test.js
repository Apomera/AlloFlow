import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js', 'coralReef');
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.THREE; delete window.Reef3DSpecies; delete window.Reef3DExplore;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
const q = (t, selector) => t.host.querySelector(selector);
const work = t => JSON.stringify([t.data.speciesBookmarks, t.data.speciesLog, t.data.speciesPractice]);
const nav = (t, text) => [...t.host.querySelectorAll('.cr-nav button')].find(button => button.textContent.trim() === text);
async function click(element) {
  expect(element, 'control exists').toBeTruthy();
  await React.act(async () => { element.focus(); element.click(); });
  // Let the opening effect schedule its frame before waiting for the section
  // masthead-to-profile focus handoff, as the browser does after the commit.
  await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
}
async function change(element, value) {
  expect(element, 'control exists').toBeTruthy();
  const prototype = element.tagName === 'INPUT' ? HTMLInputElement.prototype : element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLSelectElement.prototype;
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function mount(extra = {}) {
  let data = { coralReef: {
    section: 'guide', guideSearchMode: 'description', speciesBookmarks: { clownfish: true },
    speciesFieldNotes: { clownfish: 'Three pale bands.' }, speciesLog: { green_turtle: { firstSeen: 1 } }, ...extra
  } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [state, setState] = React.useState(data); data = state; update = setState;
    return cfg.render({ React, toolData: state, setToolData: setState, reduceMotion: true, t: (key, fallback) => fallback || key });
  }
  const t = { host, root, get data() { return data.coralReef; }, async patch(values) {
    await React.act(async () => update(previous => ({ ...previous, coralReef: { ...previous.coralReef, ...values } })));
  } };
  mounted.push(t); await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function observeAndReturn(t) {
  await click(q(t, '[data-observe-species]'));
  expect(q(t, '[data-marine-observation]')).toBeTruthy();
  await click(q(t, '[data-observation-return]'));
}
function temporaryStateIsNotSaved(t) {
  expect(JSON.stringify(t.data)).not.toMatch(/guideObservation|returnedVisit|connectionReturn|enteredMatch|profileSelection|readingSection/);
}

describe('explicit observation return restores the local guide visit', () => {
  it('retains search, feeding role, reading focus, and new field notes over repeated trips', async () => {
    const t = await mount({ guideGroupFilter: 'invertebrate' }), before = work(t);
    await change(q(t, '[data-guide-role]'), 'plankton');
    await click(q(t, '[data-search-ideas] summary'));
    await change(q(t, 'input[type="search"]'), 'filtering pharynx');
    const selector = '[data-guide-role-note="goldmouth_sea_squirt"] [data-read-match="diet"]';
    await click(q(t, selector));
    const position = q(t, '[data-profile-selection-position]').textContent;
    for (let trip = 0; trip < 2; trip++) {
      await click(q(t, '[data-observe-species]'));
      expect(q(t, '[data-marine-profile]')).toBeNull(); expect(q(t, 'canvas')).toBeNull();
      await click(q(t, '.crob-note-toggle summary'));
      await change(q(t, '[data-species-field-notes]'), 'Observation from trip ' + trip);
      await click(q(t, '[data-observation-return]'));
      expect(document.activeElement).toBe(q(t, '[data-profile-reading="diet"]'));
      expect(q(t, '[data-profile-selection-position]').textContent).toBe(position);
      await click(q(t, '[data-close-profile]'));
      expect(document.activeElement).toBe(q(t, selector));
      expect(q(t, 'input[type="search"]').value).toBe(trip === 0 ? 'filtering pharynx' : 'pharynx');
      expect(q(t, '[data-guide-role]').value).toBe('plankton');
      expect(q(t, '[data-guide-group-filter]').value).toBe('invertebrate');
      expect(q(t, '[data-search-ideas]').open).toBe(true);
      expect(t.data.speciesFieldNotes.goldmouth_sea_squirt).toBe('Observation from trip ' + trip);
      expect(t.data.speciesFieldNotes.clownfish).toBe('Three pale bands.');
      expect(work(t)).toBe(before); temporaryStateIsNotSaved(t);
      if (trip === 0) { await change(q(t, 'input[type="search"]'), 'pharynx'); await click(q(t, selector)); }
    }
  });

  it('returns to the exact second connection excerpt and keeps the captured reading selection', async () => {
    const t = await mount(), before = work(t);
    await change(q(t, 'input[type="search"]'), 'triton wrasse');
    const selector = '[data-species="crown_of_thorns"] [data-read-match="connection"]';
    expect(t.host.querySelectorAll(selector)).toHaveLength(2);
    await click(t.host.querySelectorAll(selector)[1]);
    const position = q(t, '[data-profile-selection-position]').textContent;
    const next = q(t, '[data-profile-next]')?.getAttribute('aria-label');
    await observeAndReturn(t);
    expect(document.activeElement).toBe(q(t, '[data-profile-reading="connection"]'));
    expect(q(t, '[data-profile-selection-position]').textContent).toBe(position);
    expect(q(t, '[data-profile-next]')?.getAttribute('aria-label')).toBe(next);
    await click(q(t, '[data-close-profile]'));
    expect(document.activeElement).toBe(t.host.querySelectorAll(selector)[1]);
    expect(q(t, 'input[type="search"]').value).toBe('triton wrasse');
    expect(work(t)).toBe(before); temporaryStateIsNotSaved(t);
  });

  it.each(['profile', 'comparison'])('restores the gallery %s origin and active filters after observing a partner', async origin => {
    const t = await mount({ guideFilter: 'saved', guideGroupFilter: 'fish' }), before = work(t);
    await click(q(t, '[data-guide-open-connections]'));
    const selector = origin === 'profile' ? '[data-connection-pair="clownfish-anemone"] [data-connection-study="magnificent_anemone"]' : '[data-connection-compare="clownfish-anemone"]';
    await click(q(t, selector));
    if (origin === 'comparison') await click(q(t, '[data-comparison-study="magnificent_anemone"]'));
    const position = q(t, '[data-profile-selection-position]')?.textContent;
    const next = q(t, '[data-profile-next]')?.getAttribute('aria-label');
    await observeAndReturn(t);
    expect(q(t, '[data-profile-selection-position]')?.textContent).toBe(position);
    expect(q(t, '[data-profile-next]')?.getAttribute('aria-label')).toBe(next);
    await click(q(t, '[data-close-profile]'));
    expect(q(t, '[data-connection-explorer]').open).toBe(true);
    expect(document.activeElement).toBe(q(t, selector));
    expect(t.data.guideFilter).toBe('saved'); expect(q(t, '[data-guide-group-filter]').value).toBe('fish');
    expect(work(t)).toBe(before); temporaryStateIsNotSaved(t);
  });

  it.each(['different species', 'section navigation', 'closed observation'])('discards a pending guide visit after %s', async reason => {
    const t = await mount(), before = work(t);
    await change(q(t, 'input[type="search"]'), 'notochord');
    await click(q(t, '[data-species="goldmouth_sea_squirt"] [data-read-match="fact"]'));
    await click(q(t, '[data-observe-species]'));
    if (reason === 'different species') {
      await t.patch({ diveStudySpeciesId: 'green_turtle' });
      await click(q(t, '[data-observation-return]'));
      expect(q(t, '[data-marine-profile]').dataset.marineProfile).toBe('green_turtle');
    } else {
      if (reason === 'closed observation') await click(q(t, '[data-observation-close]'));
      await click(nav(t, 'Species guide'));
    }
    expect(q(t, '[data-profile-selection-position]')).toBeNull();
    await click(q(t, '[data-close-profile]'));
    expect(q(t, 'input[type="search"]').value).toBe('');
    expect(q(t, '[data-guide-role]').value).toBe('all');
    expect(work(t)).toBe(before); temporaryStateIsNotSaved(t);
  });

  it('keeps note deletion authoritative and focuses search when the original notes-filter result disappears', async () => {
    const t = await mount({ guideFilter: 'notes', speciesFieldNotes: { goldmouth_sea_squirt: 'An observation.' } }), before = work(t);
    await change(q(t, 'input[type="search"]'), 'notochord');
    await click(q(t, '[data-species="goldmouth_sea_squirt"] [data-read-match="fact"]'));
    await click(q(t, '[data-observe-species]'));
    await click(q(t, '.crob-note-toggle summary'));
    await change(q(t, '[data-species-field-notes]'), '');
    await click(q(t, '[data-observation-return]'));
    expect(q(t, '[data-species-field-notes]').value).toBe('');
    await click(q(t, '[data-close-profile]'));
    expect(t.data.guideFilter).toBe('notes'); expect(q(t, '[data-species="goldmouth_sea_squirt"]')).toBeNull();
    expect(document.activeElement).toBe(q(t, 'input[type="search"]'));
    expect(q(t, 'input[type="search"]').value).toBe('notochord');
    expect(t.data.speciesFieldNotes).toEqual({}); expect(work(t)).toBe(before); temporaryStateIsNotSaved(t);
  });

  it('disposes the optional specimen before entering the dive and returns without retaining a hidden renderer', async () => {
    const renderers = [], models = [];
    class Renderer {
      constructor(options) {
        this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] };
        this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn();
        this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this);
      }
      setPixelRatio(value) { this.ratio = value; } getPixelRatio() { return this.ratio; }
      setSize(width, height) { this.canvas.width = width; this.canvas.height = height; }
    }
    window.THREE = { ...THREE, WebGLRenderer: Renderer };
    window.Reef3DSpecies = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [0, .3, 3.2], lookY: 0 } }), create: () => {
      const root = new THREE.Group(); root.add(new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), new THREE.MeshBasicMaterial()));
      const model = { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model;
    } };
    window.Reef3DExplore = { version: '1.0.0', mount: vi.fn() };
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
    const t = await mount({ guideSpeciesId: 'clownfish' });
    await click(q(t, '[data-open-study]'));
    await click(q(t, '[data-study-specimen-toggle]'));
    expect(q(t, '[data-specimen-status="ready"]')).toBeTruthy(); expect(renderers).toHaveLength(1);
    await click(q(t, '[data-study-observe]'));
    expect(q(t, '[data-marine-profile]')).toBeNull(); expect(q(t, 'canvas')).toBeNull();
    expect(renderers[0].dispose).toHaveBeenCalledTimes(1); expect(models[0].dispose).toHaveBeenCalledTimes(1);
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
    await click(q(t, '[data-observation-return]'));
    expect(q(t, '[data-marine-profile="clownfish"]')).toBeTruthy(); expect(q(t, '[data-species-study]')).toBeNull();
    expect(renderers).toHaveLength(1); expect(renderers[0].dispose).toHaveBeenCalledTimes(1);
    temporaryStateIsNotSaved(t);
  });
});
