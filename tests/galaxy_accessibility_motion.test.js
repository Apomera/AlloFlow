import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
const LIGHT = { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyControlPanel: 'motion', galaxyAutoRotate: true };

describe('Galaxy local reduced-motion preference', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now, camera, latest, setLatest, mediaChange, mediaListeners;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    originalMedia = window.matchMedia; now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    // This motion fixture needs a repeatable catalogue with a massive progenitor.
    // An unseeded 2,500-star draw can legitimately contain no O/B stars.
    let catalogueSeed = 0x5EEDC0DE;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      catalogueSeed += 0x6D2B79F5; let value = catalogueSeed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    });
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub(); loops = installLoopStubs();
    const Attribute = window.THREE.BufferAttribute, Camera = window.THREE.PerspectiveCamera;
    window.THREE.BufferAttribute = function (array, itemSize) { const value = new Attribute(array, itemSize); value.setXYZ = (i, x, y, z) => { value.array[i * itemSize] = x; value.array[i * itemSize + 1] = y; value.array[i * itemSize + 2] = z; return value; }; return value; };
    window.THREE.PerspectiveCamera = function (...args) {
      camera = new Camera(...args); camera.fov = args[0];
      const lookAt = camera.lookAt; camera.lookAt = function (x, y, z) { camera.lastLookAt = { x, y, z }; return lookAt.call(camera, x, y, z); };
      camera.setViewOffset = (fullWidth, fullHeight, offsetX, offsetY, width, height) => { camera.view = { enabled: true, fullWidth, fullHeight, offsetX, offsetY, width, height }; };
      camera.clearViewOffset = () => { if (camera.view) camera.view.enabled = false; };
      return camera;
    };
    errors = vi.spyOn(console, 'error').mockImplementation(() => {}); host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (window._galaxyTimeLapse) clearInterval(window._galaxyTimeLapse); window._galaxyTimeLapse = null;
    if (root) await React.act(async () => root.unmount()); root = null; host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function act(fn) { await React.act(async () => fn()); }
  async function step(ms = 1000) { now += ms; await act(() => loops.step()); }
  async function mount({ os = false, saved = false } = {}) {
    mediaListeners = new Set(); let system = os;
    mediaChange = value => { system = value; for (const listener of [...mediaListeners]) listener({ matches: system }); };
    window.matchMedia = vi.fn(query => ({ get matches() { return system && query.includes('prefers-reduced-motion'); }, media: query, addEventListener(type, listener) { if (query.includes('prefers-reduced-motion')) mediaListeners.add(listener); }, removeEventListener(type, listener) { mediaListeners.delete(listener); }, addListener(listener) { if (query.includes('prefers-reduced-motion')) mediaListeners.add(listener); }, removeListener(listener) { mediaListeners.delete(listener); } }));
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve()); const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); latest = { galaxy: { ...LIGHT, galaxyReduceMotion: saved } };
    function Host() { const state = React.useState(latest); latest = state[0]; setLatest = state[1]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await act(() => root.render(React.createElement(Host)));
    const canvas = host.querySelector('[data-galaxy-canvas]');
    Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: 1000 }); Object.defineProperty(canvas, 'offsetHeight', { configurable: true, value: 640 });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 640 }); await act(() => loops.resize(canvas)); await step(); return canvas;
  }
  const button = () => host.querySelector('[data-galaxy-reduce-motion]');
  async function toggle() { await act(() => button().click()); }
  const view = canvas => ({ orbit: { ...canvas._galaxyOrbit }, camera: canvas._galaxyGetInspectionState().camera, lookAt: { ...camera.lastLookAt }, offset: camera.view ? { ...camera.view } : null, fov: camera.fov });
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it('honors a saved local choice before the first frame and exposes its own accessible state', async () => {
    const canvas = await mount({ saved: true });
    expect(canvas._galaxyGetMotionPreference()).toMatchObject({ available: true, local: true, system: false, reduced: true, elapsed: 0 });
    expect(button().textContent).toContain('Reduce motion in this tool'); expect(button().getAttribute('aria-pressed')).toBe('true'); expect(button().style.minHeight).toBe('44px');
    expect(host.querySelector('#' + button().getAttribute('aria-describedby')).textContent).toContain('Manual controls still work');
    expect(host.querySelector('[data-galaxy-reduce-motion-status]').textContent).toContain('on for this tool');
    const frozen = view(canvas); await step(8000); expect(view(canvas)).toEqual(frozen); expect(canvas._galaxyGetStarVisualState(0).elapsed).toBe(0);
    clean();
  });

  it('freezes the current star time, physical view and lens while leaving manual orbit and zoom live', async () => {
    const canvas = await mount(); await step(2400); await act(() => canvas._galaxyCycleStar(1)); await step(300);
    const before = view(canvas), star = canvas._galaxyGetStarVisualState(0), control = button(); expect(star.elapsed).toBeGreaterThan(0); control.focus();
    await toggle(); expect(button()).toBe(control); expect(document.activeElement).toBe(control); expect(view(canvas)).toEqual(before);
    expect(latest.galaxy).toMatchObject({ galaxyReduceMotion: true, galaxyAutoRotate: false, galaxyTourActive: false });
    for (const duration of [200, 1000, 7000]) { await step(duration); expect(view(canvas)).toEqual(before); expect(canvas._galaxyGetStarVisualState(0).animated).toEqual(star.animated); expect(canvas._galaxyGetMotionPreference().elapsed).toBe(star.elapsed); }
    await act(() => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))); expect(canvas._galaxyOrbit.theta).toBeCloseTo(before.orbit.theta + 0.1, 9);
    const radius = canvas._galaxyOrbit.r; await act(() => canvas._galaxyZoom('out')); await step(); expect(canvas._galaxyOrbit.r).toBeGreaterThan(radius); expect(canvas._galaxyGetMotionPreference().elapsed).toBe(star.elapsed);
    clean();
  });

  it('resumes decorative time from the frozen point without restarting rotation or the tour', async () => {
    const canvas = await mount(); await step(1200); await toggle(); const elapsed = canvas._galaxyGetMotionPreference().elapsed, orbit = { ...canvas._galaxyOrbit };
    await step(15000); await toggle(); expect(canvas._galaxyGetMotionPreference()).toMatchObject({ local: false, system: false, reduced: false });
    expect(latest.galaxy).toMatchObject({ galaxyReduceMotion: false, galaxyAutoRotate: false, galaxyTourActive: false });
    await step(1000); expect(canvas._galaxyGetMotionPreference().elapsed).toBeCloseTo(elapsed + 1, 6); expect(canvas._galaxyOrbit).toEqual(orbit); expect(canvas.getAttribute('data-auto-rotate')).toBe('false'); clean();
  });

  it('keeps OS reduction effective when the local preference is off and tracks live OS changes', async () => {
    const canvas = await mount({ os: true }); expect(canvas._galaxyGetMotionPreference()).toMatchObject({ local: false, system: true, reduced: true });
    await toggle(); await toggle(); expect(button().getAttribute('aria-pressed')).toBe('false'); expect(canvas._galaxyGetMotionPreference().reduced).toBe(true);
    expect(host.querySelector('[data-galaxy-reduce-motion-status]').textContent).toContain('device');
    const state = view(canvas); await step(3000); expect(view(canvas)).toEqual(state); expect(canvas._galaxyGetMotionPreference().elapsed).toBe(0);
    await act(() => mediaChange(false)); await step(1000); expect(canvas._galaxyGetMotionPreference()).toMatchObject({ local: false, system: false, reduced: false, elapsed: 1 });
    await toggle(); await act(() => mediaChange(true)); await act(() => mediaChange(false)); expect(canvas._galaxyGetMotionPreference()).toMatchObject({ local: true, system: false, reduced: true }); clean();
  });

  it.each(['inspection', 'framing'])('freezes an in-progress %s transition at the actual current camera', async transition => {
    const canvas = await mount(); await act(() => { canvas._galaxyFocusNebula('Helix Nebula'); canvas._galaxyInspectSelection(); }); await step(220);
    if (transition === 'framing') { await step(1000); await act(() => canvas._galaxyFrameObject()); await step(220); }
    const before = view(canvas); await toggle(); expect(view(canvas)).toEqual(before); await step(5000); expect(view(canvas)).toEqual(before);
    await act(() => canvas._galaxyFrameObject()); const framed = view(canvas); await step(); expect(view(canvas)).toEqual(framed); clean();
  });

  it('stops running time-lapse and offers the manual age slider while automatic playback is reduced', async () => {
    const canvas = await mount(); await act(() => host.querySelector('[data-galaxy-control-tab="time"]').click());
    await act(() => host.querySelector('[data-galaxy-time-lapse]').click()); expect(window._galaxyTimeLapse).not.toBeNull();
    await act(() => host.querySelector('[data-galaxy-control-tab="motion"]').click()); await toggle(); expect(window._galaxyTimeLapse).toBeNull(); expect(latest.galaxy.isPlaying).toBe(false);
    await act(() => host.querySelector('[data-galaxy-control-tab="time"]').click()); const play = host.querySelector('[data-galaxy-time-lapse]'); expect(play.disabled).toBe(true); expect(host.querySelector('#' + play.getAttribute('aria-describedby')).textContent).toContain('cosmic-age slider');
    const age = [...host.querySelectorAll('input[type="range"]')].find(input => input.min === '0.1' && input.max === '13.8'); expect(age).toBeTruthy(); expect(age.disabled).toBe(false); expect(canvas._galaxyGetMotionPreference().reduced).toBe(true); clean();
  });

  it('keeps an existing illustrative supernova static instead of flashing or drifting during reduction', async () => {
    const canvas = await mount(), SpriteMaterial = window.THREE.SpriteMaterial, eventMaterials = [];
    let hasProgenitor = false;
    for (let index = 0; index < LIGHT.starCount && !hasProgenitor; index++) hasProgenitor = canvas._galaxyGetStarVisualState(index).metadataTypeIndex < 2;
    expect(hasProgenitor, 'The motion fixture must include an O/B supernova progenitor').toBe(true);
    window.THREE.SpriteMaterial = function (...args) { const material = new SpriteMaterial(...args); vi.spyOn(material, 'dispose'); if (material.map) vi.spyOn(material.map, 'dispose'); eventMaterials.push(material); return material; };
    expect(canvas._triggerSupernova()).toBeTruthy(); await step(200); await toggle(); const event = canvas._galaxyGetSupernovaVisualState(); expect(event).toHaveLength(1);
    await step(8000); expect(canvas._galaxyGetSupernovaVisualState()).toEqual(event);
    for (let index = 0; index < 3; index++) {
      const previousMaterials = [...eventMaterials]; expect(canvas._triggerSupernova()).toBeTruthy(); await step(); expect(canvas._galaxyGetSupernovaVisualState()).toHaveLength(1);
      for (const material of previousMaterials) { expect(material.dispose).toHaveBeenCalledOnce(); if (material.map) expect(material.map.dispose).toHaveBeenCalledOnce(); }
    }
    await toggle(); await step(100); expect(canvas._galaxyGetSupernovaVisualState()).toHaveLength(1); await step(4000); expect(canvas._galaxyGetSupernovaVisualState()).toHaveLength(0); clean();
  });

  it('retains the local preference across quality rebuilds and releases native methods/listeners on teardown', async () => {
    const canvas = await mount(); await toggle(); await act(() => setLatest(previous => ({ galaxy: { ...previous.galaxy, galaxyQuality: 'high' } }))); await step();
    expect(host.querySelector('[data-galaxy-canvas]')).toBe(canvas); expect(canvas._galaxyGetMotionPreference()).toMatchObject({ local: true, reduced: true }); expect(button().getAttribute('aria-pressed')).toBe('true');
    for (const invalid of [null, 1, 'true', {}]) expect(canvas._galaxySetReduceMotion(invalid)).toBe(false);
    const getter = canvas._galaxyGetMotionPreference, setter = canvas._galaxySetReduceMotion; await act(() => root.unmount()); root = null;
    expect(canvas._galaxyGetMotionPreference).toBeNull(); expect(canvas._galaxySetReduceMotion).toBeNull(); expect(getter().available).toBe(false); expect(setter(true)).toBe(false); expect(mediaListeners.size).toBe(0); clean();
  });
});
