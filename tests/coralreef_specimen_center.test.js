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

const frames = () => renderers[0].render.mock.calls.length;
const centered = state => ({ ...state, specimenPanX: '0', specimenPanY: '0' });
const logical = state => { const next = { ...state }; delete next.specimenMode; return next; };
const description = el => (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
async function magnify(t, count = 8) { for (let i = 0; i < count; i++) await click(q(t, '[data-specimen-zoom="in"]')); }
async function pointer(t, type, values = {}) { let event; await React.act(async () => { event = new Event(type, { bubbles: true, cancelable: true }); Object.assign(event, { pointerId: 7, button: 0, clientX: 100, clientY: 100, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...values }); q(t, '[data-specimen-canvas]').dispatchEvent(event); }); return event; }
function pointerCanvas(t) { const canvas = q(t, '[data-specimen-canvas]'); canvas.getBoundingClientRect = () => ({ width: 400, height: 240, left: 0, top: 0 }); canvas.setPointerCapture = vi.fn(); canvas.hasPointerCapture = vi.fn(() => true); canvas.releasePointerCapture = vi.fn(); return canvas; }
async function key(target, values) { const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...values }); await React.act(async () => target.dispatchEvent(event)); return event; }
async function moveDetail(t) { await click(q(t, '[data-specimen-mode-button="move"]')); await click(q(t, '[data-specimen-pan-button="right"]')); await click(q(t, '[data-specimen-pan-button="up"]')); }

describe('center a magnified specimen detail', () => {
  it('centers only the pan in one frame, keeps focus and preferences, and leaves an already centered action stable and idle', async () => {
    const t = await mount(), records = JSON.stringify(t.data); expect(q(t, '[data-specimen-center]')).toBeNull();
    await click(q(t, '[data-specimen-turn-button="right"]')); await click(q(t, '[data-specimen-light-button="studio"]')); await click(q(t, '[data-specimen-fine]')); await magnify(t); await click(q(t, '[data-specimen-mode-button="move"]'));
    const button = q(t, '[data-specimen-center]'); expect(button.textContent).toBe('Center detail'); expect(button.getAttribute('aria-disabled')).toBe('true'); expect(description(button)).toContain('keeps the current zoom, angle and lighting'); expect(description(q(t, '[data-specimen-canvas]'))).toContain('Shift+Home centers the detail at the current zoom'); expect(q(t, '[data-specimen-tips]').open).toBe(false);
    await click(q(t, '[data-specimen-pan-button="right"]')); await click(q(t, '[data-specimen-pan-button="up"]')); const before = dataView(t), count = frames(); expect(before.specimenScale).toBe('3'); expect(before.specimenPanX).not.toBe('0'); expect(before.specimenPanY).not.toBe('0'); expect(button.getAttribute('aria-disabled')).toBeNull();
    await click(button); expect(dataView(t)).toEqual(centered(before)); expect(frames()).toBe(count + 1); expect(document.activeElement).toBe(button); expect(q(t, '[data-specimen-center]')).toBe(button); expect(button.getAttribute('aria-disabled')).toBe('true');
    const idle = frames(); await click(button); await React.act(async () => new Promise(resolve => setTimeout(resolve, 35))); expect(frames()).toBe(idle); expect(dataView(t)).toEqual(centered(before)); expect(JSON.stringify(t.data)).toBe(records); expect(renderers).toHaveLength(1); expect(models[0].update).not.toHaveBeenCalled();
  });

  it('supports focused Shift+Home in Turn mode, retains ordinary Home, and leaves browser chords and external keys untouched', async () => {
    const t = await mount(), canvas = pointerCanvas(t); await click(q(t, '[data-specimen-turn-button="left"]')); await click(q(t, '[data-specimen-light-button="studio"]')); await magnify(t,4); await pointer(t,'pointerdown',{shiftKey:true}); await pointer(t,'pointermove',{clientX:140,clientY:124}); await pointer(t,'pointerup'); const before = dataView(t); expect(q(t, '[data-specimen-center]')).toBeNull();
    const count = frames(); for (const modifier of ['altKey','ctrlKey','metaKey']) { const ignored = await key(canvas,{key:'Home',shiftKey:true,[modifier]:true}); expect(ignored.defaultPrevented).toBe(false); expect(dataView(t)).toEqual(before); } const notes = q(t,'[data-species-field-notes]'); notes.focus(); expect((await key(notes,{key:'Home',shiftKey:true})).defaultPrevented).toBe(false); expect(frames()).toBe(count);
    canvas.focus(); expect((await key(canvas,{key:'Home',shiftKey:true})).defaultPrevented).toBe(true); expect(dataView(t)).toEqual(centered(before)); expect(frames()).toBe(count + 1); expect(document.activeElement).toBe(canvas); expect(q(t,'[data-specimen-mode-button="turn"]').getAttribute('aria-pressed')).toBe('true');
    const idle = frames(); await key(canvas,{key:'Home',shiftKey:true}); expect(frames()).toBe(idle); await key(canvas,{key:'Home'}); expect(dataView(t)).toMatchObject({specimenScale:'1',specimenTurn:'0',specimenTilt:'0',specimenPanX:'0',specimenPanY:'0',specimenAngle:'portrait',specimenLighting:'studio',specimenMode:'turn'}); expect(frames()).toBe(idle + 1);
  });

  it('ends the active gesture and safely releases its capture so later pointer movement cannot jump back', async () => {
    const t = await mount(), canvas = pointerCanvas(t); await magnify(t,4); await click(q(t,'[data-specimen-mode-button="move"]')); await pointer(t,'pointerdown'); await pointer(t,'pointermove',{clientX:130,clientY:120}); const before = dataView(t), count = frames(); await click(q(t,'[data-specimen-center]')); expect(canvas.hasPointerCapture).toHaveBeenCalledWith(7); expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7); expect(dataView(t)).toEqual(centered(before)); expect(frames()).toBe(count + 1); await pointer(t,'pointermove',{clientX:180,clientY:150}); expect(dataView(t)).toEqual(centered(before)); expect(frames()).toBe(count + 1);
    canvas.hasPointerCapture.mockReturnValue(false); await pointer(t,'pointerdown',{pointerId:8}); const idle = frames(); await click(q(t,'[data-specimen-center]')); expect(canvas.releasePointerCapture).toHaveBeenCalledTimes(1); await pointer(t,'pointermove',{pointerId:8,clientX:180,clientY:150}); expect(frames()).toBe(idle);
    canvas.hasPointerCapture.mockReturnValue(true); canvas.releasePointerCapture.mockImplementation(() => { throw Error('Capture already released'); }); await pointer(t,'pointerdown',{pointerId:9}); await pointer(t,'pointermove',{pointerId:9,clientX:130,clientY:120}); const last = dataView(t), changed = frames(); await key(canvas,{key:'Home',shiftKey:true}); expect(dataView(t)).toEqual(centered(last)); expect(frames()).toBe(changed + 1); await pointer(t,'pointermove',{pointerId:9,clientX:180,clientY:150}); expect(dataView(t)).toEqual(centered(last)); expect(frames()).toBe(changed + 1); expect(canvas.releasePointerCapture).toHaveBeenLastCalledWith(9);
  });

  it('preserves each named angle, the remembered off-center view, and the centered view through swaps and resize', async () => {
    const t = await mount(), records = JSON.stringify(t.data); await React.act(async () => { q(t,'[data-specimen-memory]').open = true; }); await click(q(t,'[data-specimen-fine]')); await click(q(t,'[data-specimen-light-button="studio"]'));
    for (const angle of ['side','opposite','front','above','below']) { await click(q(t,'[data-specimen-angle-button="'+angle+'"]')); await magnify(t,5); await moveDetail(t); const detail = dataView(t); await click(q(t,'[data-specimen-remember]')); const message = q(t,'[data-specimen-memory-status]').textContent; await click(q(t,'[data-specimen-center]')); const middle = dataView(t); expect(middle).toEqual(centered(detail)); expect(middle.specimenAngle).toBe(angle); expect(q(t,'[data-specimen-memory-status]').textContent).toBe(message); await React.act(async () => observers[0].callback()); expect(dataView(t)).toEqual(middle); await click(q(t,'[data-specimen-swap]')); expect(logical(dataView(t))).toEqual(logical(detail)); await click(q(t,'[data-specimen-swap]')); expect(logical(dataView(t))).toEqual(logical(middle)); expect(dataView(t).specimenPrecision).toBe('fine'); }
    expect(JSON.stringify(t.data)).toBe(records); expect(renderers).toHaveLength(1); expect(api.create).toHaveBeenCalledTimes(1); expect(models[0].update).not.toHaveBeenCalled();
  });

  it('keeps centering anonymous and ungraded, retains locked observations, and disposes between mystery organisms', async () => {
    const t = await mount('mystery'), records = JSON.stringify(t.data), text = X.speciesText((k,v)=>v); const input = q(t,'[data-practice-observation-input]'); await React.act(async () => { q(t,'[data-practice-observation]').open = true; Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,'I inspect one feature at the same magnification.'); input.dispatchEvent(new Event('input',{bubbles:true})); }); await click(q(t,'[data-confidence-choice="hunch"]'));
    for (let i = 0; i < 2; i++) { if (i) await click(q(t,'[data-practice-specimen-toggle]')); await magnify(t,4); await moveDetail(t); const canvas = q(t,'[data-specimen-canvas]'), tips = q(t,'[data-specimen-tips]'), canonical = description(canvas); expect(canonical).toContain('Shift+Home centers the detail at the current zoom'); const visible = [...tips.querySelectorAll('p')].find(p=>p.textContent.includes('Shift+Home')); expect(visible).toBeTruthy(); expect(tips.open).toBe(false); expect(description(q(t,'[data-specimen-center]'))).toContain('keeps the current zoom'); expect(canvas.getAttribute('aria-label')).toBe('Interactive 3D model of the mystery organism'); for(const id of ['clownfish','blue_tang'])expect(q(t,'[data-practice-specimen]').textContent).not.toContain(text[id].name); if(!i)expect(JSON.stringify(t.data)).toBe(records);
      const id = q(t,'.cr-dxp-portrait img').getAttribute('src').split('/').pop().replace(/\.webp.*$/,''); await click(q(t,'[data-practice-choice="'+id+'"]')); const feedback = q(t,'[data-practice-feedback]').textContent, pose = dataView(t); await click(q(t,'[data-specimen-center]')); expect(dataView(t)).toEqual(centered(pose)); expect(q(t,'[data-practice-feedback]').textContent).toBe(feedback); if(!i) { expect(q(t,'[data-practice-observation-feedback]').textContent).toBe('I inspect one feature at the same magnification.'); expect(q(t,'[data-practice-confidence-feedback="hunch"]')).toBeTruthy(); } await click(q(t,'[data-practice-next]')); expect(q(t,'[data-specimen-canvas]')).toBeNull(); expect(renderers[i].dispose).toHaveBeenCalledTimes(1); }
    expect(t.data.speciesPractice).toMatchObject({rounds:1,answered:2,correct:2,last:{hinted:0,skipped:0}}); expect(t.data.speciesLog).toEqual({green_turtle:{firstSeen:1}}); expect(t.data.speciesFieldNotes).toEqual({clownfish:'Keep this note'}); expect(renderers).toHaveLength(2); expect(models.every(m=>m.update.mock.calls.length === 0)).toBe(true);
  });
});
