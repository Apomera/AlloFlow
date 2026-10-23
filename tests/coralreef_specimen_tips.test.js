import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let X, namespace, api, renderers, models, observers;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; renderers = []; models = []; observers = [];
  class Renderer {
    constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
    setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
    setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
  }
  namespace = { ...THREE, WebGLRenderer: Renderer };
  api = { version: '1.0.0', info: () => ({ group: 'fish', portrait: { dir: [.3, .5, 3.2], lookY: 0 } }), create: vi.fn(() => { const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.BoxGeometry(.4, .2, .1), new THREE.MeshBasicMaterial()); mesh.position.y = .1; root.add(mesh); const model = { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; models.push(model); return model; }) };
  window.THREE = namespace; window.Reef3DSpecies = api;
  vi.stubGlobal('ResizeObserver', class { constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); } observe() {} });
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
});
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } delete window.THREE; delete window.Reef3DSpecies; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const q = (t, s) => t.host.querySelector(s), dataView = t => ({ ...q(t, '[data-specimen-view]').dataset });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await new Promise(resolve => setTimeout(resolve, 0)); }); }
async function mount(kind = 'study') {
  let data = { coralReef: { section: 'guide', guideSpeciesId: kind === 'study' ? 'clownfish' : null, speciesBookmarks: { clownfish: true, blue_tang: true }, speciesFieldNotes: { clownfish: 'Keep this note' }, speciesLog: { green_turtle: { firstSeen: 1 } } } };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; t.setData = setState; return cfg.render({ React, toolData: state, setToolData: setState, t: (k, v) => v || k, reduceMotion: true }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t); await React.act(async () => root.render(React.createElement(Shell)));
  if (kind === 'study') { await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); }
  else { await click(q(t, '[data-start-practice]')); await React.act(async () => { const select = q(t, '[data-practice-collection-select]'); select.value = 'saved'; select.dispatchEvent(new Event('change', { bubbles: true })); }); await click(q(t, '[data-practice-start]')); await click(q(t, '[data-practice-specimen-toggle]')); }
  return t;
}

const description = el => (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
const disclosures = t => q(t, '[data-specimen-tips]');
async function disclose(t, open) { const details = disclosures(t); await React.act(async () => { details.querySelector('summary').focus(); details.open = open; details.dispatchEvent(new Event('toggle')); }); }

describe('optional specimen inspection tips', () => {
  it('starts closed with one copy of each referenced description and keeps contextual Turn/Move guidance outside the disclosure', async () => {
    const t = await mount(), tips = disclosures(t), canvas = q(t, '[data-specimen-canvas]'); expect(tips.open).toBe(false); expect(tips.querySelector('summary').textContent).toBe('Inspection tips');
    expect(description(canvas)).toContain('Drag to turn'); expect(description(canvas)).toContain('Home resets the view'); expect(description(q(t, '[data-specimen-fine]'))).toContain('smaller turns and moves'); expect(description(q(t, '[data-specimen-fit]'))).toContain('current angle and lighting'); expect(description(q(t, '[aria-describedby$="-lighting-help"]'))).toContain('shaded sides');
    for (const suffix of ['help', 'details', 'fine-help', 'fit-help', 'lighting-help']) { const id = [...t.host.querySelectorAll('[id]')].find(el => el.id.endsWith('-' + suffix))?.id; expect(id).toBeTruthy(); expect(t.host.querySelectorAll('[id="' + id + '"]').length).toBe(1); }
    expect(tips.querySelectorAll('p')).toHaveLength(4); expect(tips.querySelectorAll('[id]')).toHaveLength(0); for (const id of canvas.getAttribute('aria-describedby').split(' ')) expect(tips.contains(q(t, '#' + id))).toBe(false); expect(q(t, '#' + canvas.getAttribute('aria-describedby').split(' ')[1]).className).toBe('crsv-ready');
    await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-mode-button="move"]')); expect(description(canvas)).toContain('Drag to move the zoomed specimen'); expect(tips.open).toBe(false);
  });

  it('opens and closes without changing pose, Fine, memory, focus ownership, renderer allocation or idle frame count, and forgets disclosure state on reopening', async () => {
    const t = await mount(), records = JSON.stringify(t.data); await click(q(t, '[data-specimen-turn-button="right"]')); await click(q(t, '[data-specimen-zoom="in"]')); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-fine]')); await React.act(async () => { q(t, '[data-specimen-memory]').open = true; }); await click(q(t, '[data-specimen-remember]')); const pose = dataView(t), frames = renderers[0].render.mock.calls.length;
    await disclose(t, true); expect(disclosures(t).open).toBe(true); expect(document.activeElement).toBe(disclosures(t).querySelector('summary')); expect(dataView(t)).toEqual(pose); expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBeNull(); expect(q(t, '[data-specimen-memory]').open).toBe(true);
    const notes = q(t, '[data-species-field-notes]'); notes.focus(); await React.act(async () => { disclosures(t).open = false; disclosures(t).dispatchEvent(new Event('toggle')); await new Promise(resolve => setTimeout(resolve, 35)); }); expect(document.activeElement).toBe(notes); expect(dataView(t)).toEqual(pose); expect(renderers[0].render).toHaveBeenCalledTimes(frames); expect(JSON.stringify(t.data)).toBe(records); expect(renderers).toHaveLength(1);
    await disclose(t, true); await click(q(t, '[data-study-specimen-toggle]')); expect(renderers[0].dispose).toHaveBeenCalledTimes(1); await click(q(t, '[data-study-specimen-toggle]')); expect(disclosures(t).open).toBe(false); expect(q(t, '[data-specimen-restore]').getAttribute('aria-disabled')).toBe('true'); expect(models.every(m => m.update.mock.calls.length === 0)).toBe(true);
  });

  it('keeps tips open through same-specimen changes but remounts them closed when the Study specimen ID changes', async () => {
    const t = await mount(), originalTips = disclosures(t); await disclose(t, true); await click(q(t, '[data-specimen-turn-button="right"]')); await click(q(t, '[data-specimen-zoom="in"]')); expect(disclosures(t)).toBe(originalTips); expect(disclosures(t).open).toBe(true);
    await React.act(async () => { t.setData(previous => ({ ...previous, coralReef: { ...previous.coralReef, guideSpeciesId: 'blue_tang' } })); await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(renderers[0].dispose).toHaveBeenCalledTimes(1); if (!q(t, '[data-specimen-view]')) { if (!q(t, '[data-study-specimen-toggle]')) await click(q(t, '[data-open-study]')); await click(q(t, '[data-study-specimen-toggle]')); }
    expect(q(t, '[data-specimen-view]').dataset.specimenView).toBe('blue_tang'); expect(disclosures(t)).not.toBe(originalTips); expect(disclosures(t).open).toBe(false);
  });

  it('keeps the mystery tips anonymous and ungraded, retains a locked answer and does not carry open tips to the next question', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data); await disclose(t, true); const TX = X.speciesText((k, v) => v); for (const id of ['clownfish', 'blue_tang']) expect(disclosures(t).textContent).not.toContain(TX[id].name); expect(q(t, '[data-specimen-canvas]').getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); expect(JSON.stringify(t.data)).toBe(records);
    for (let i = 0; i < 2; i++) { const id = q(t, '.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/, ''); if (i) { await click(q(t, '[data-practice-specimen-toggle]')); expect(disclosures(t).open).toBe(false); } await click(q(t, '[data-practice-choice="' + id + '"]')); const feedback = q(t, '[data-practice-feedback]').textContent; await disclose(t, false); await disclose(t, true); expect(q(t, '[data-practice-feedback]').textContent).toBe(feedback); await click(q(t, '[data-practice-next]')); expect(disclosures(t)).toBeNull(); }
    expect(t.data.speciesPractice).toMatchObject({ rounds: 1, answered: 2, correct: 2, last: { total: 2, hinted: 0 } }); expect(t.data.speciesLog).toEqual({ green_turtle: { firstSeen: 1 } }); expect(t.data.speciesFieldNotes).toEqual({ clownfish: 'Keep this note' }); expect(renderers.every(r => r.dispose.mock.calls.length === 1)).toBe(true);
  });
});
