import fs from 'node:fs';
import vm from 'node:vm';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_artstudio.js', 'utf8');
const api = new Function(source.slice(source.indexOf('  // BEGIN ART STUDIO SCULPTURE VIEW HELPERS'), source.indexOf('  // END ART STUDIO SCULPTURE VIEW HELPERS')) + '\nreturn {view:artStudioSculptView,fit:artStudioSculptFit};')();
const scope = {};
vm.runInNewContext(fs.readFileSync('vendor/three-r128/three.min.js', 'utf8'), scope);
const THREE = scope.THREE;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const model = { name: 'Spread sculpture', scale: 1.4, rotY: 32, parts: [
  { shape: 'box', size: [0.8, 3, 1], stretch: [1, 1.5, 1], position: [2, 2, -1], rotation: [20, 10, 30], color: '#ee7755' },
  { shape: 'sphere', size: [0.7, 0.7, 0.7], position: [-2, 0, 1], color: '#4488ee' },
  { shape: 'box', size: [4, 4, 4], position: [-4, 8, 4], hidden: true }
] };

describe('Sculpture view geometry', () => {
  it('normalizes saved camera values without accepting nonfinite numbers', () => {
    expect(api.view({ yaw: NaN, pitch: Infinity, distance: '2', target: [Infinity, null, '3'] })).toEqual(api.view());
    expect(api.view({ yaw: 0, pitch: 0, distance: 0, target: [0, 0, 0] })).toMatchObject({ yaw: 0, pitch: 0, distance: 0.1, target: [0, 0, 0] });
    expect(api.view({ pitch: 900, distance: 1e9 }).distance).toBe(500);
    expect(api.view({ pitch: 900 }).pitch).toBeLessThan(Math.PI / 2);
  });
  it('uses a stable fallback for empty and invalid geometry', () => {
    for (const bounds of [null, {}, { min: [Infinity, 0, 0], max: [1, 1, 1] }, { min: [2, 0, 0], max: [1, 1, 1] }]) expect(api.fit(bounds)).toEqual(api.view());
  });
  it('fits both landscape and narrow viewports from any orbit angle', () => {
    const bounds = { min: [-4, 1, -2], max: [3, 7, 2] };
    for (const aspect of [0.5, 1, 4 / 3, 2]) {
      const fit = api.fit(bounds, aspect, 45);
      expect(fit.target).toEqual([-0.5, 4, 0]);
      const half = Math.min(Math.PI / 8, Math.atan(Math.tan(Math.PI / 8) * aspect));
      expect(fit.distance * Math.sin(half)).toBeGreaterThan(Math.sqrt(7 * 7 + 6 * 6 + 4 * 4) / 2);
    }
  });
});

describe('Sculpture preview workflow with real geometry', () => {
  let host, root, config, latest, edit, frames, frameId, observers, visibilityObservers;
  const oldThree = window.THREE, oldModules = window.AlloModules;
  beforeEach(() => {
    frames = new Map(); frameId = 0; observers = []; visibilityObservers = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { frames.set(++frameId, fn); return frameId; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    vi.stubGlobal('ResizeObserver', class {
      constructor(fn) { this.callback = fn; this.disconnect = vi.fn(); observers.push(this); }
      observe() {}
    });
    vi.stubGlobal('IntersectionObserver', class {
      constructor(fn) { this.callback = fn; this.disconnect = vi.fn(); visibilityObservers.push(this); }
      observe() {}
    });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
    class Renderer {
      constructor({ canvas }) {
        this.setSize = vi.fn((w, h) => { canvas.width = w; canvas.height = h; });
        this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn();
      }
    }
    window.THREE = { ...THREE, WebGLRenderer: Renderer };
    window.AlloModules = {};
    new Function(fs.readFileSync('prim3d_module.js', 'utf8'))();
    resetStemLab(); config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  async function tick(time = 16) { await act(async () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); }); }
  async function mount(initial = {}) {
    function Harness() {
      const [data, setData] = React.useState({ artStudio: { tab: 'sculpt3d', studioStarted: true, studioHome: false, sculptAuto: false, sculptRecipe: model, ...initial } });
      latest = data.artStudio; edit = patch => setData(old => ({ ...old, artStudio: { ...old.artStudio, ...patch } }));
      return config.render(makeCtx({ toolData: data, setToolData: setData }));
    }
    await act(async () => root.render(React.createElement(Harness)));
    return host.querySelector('#sculptCanvas');
  }
  const click = async label => { const button = [...host.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent) === label); expect(button, label).toBeTruthy(); await act(async () => button.click()); };
  afterEach(async () => {
    await act(async () => root.unmount()); host.remove(); await tick();
    vi.restoreAllMocks(); vi.unstubAllGlobals(); window.THREE = oldThree; window.AlloModules = oldModules;
  });
  function expectFitted(st) {
    st.cam.updateMatrixWorld();
    const box = new THREE.Box3().setFromObject(st.obj);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const point = new THREE.Vector3(x, y, z).project(st.cam);
      expect(Math.abs(point.x)).toBeLessThan(1); expect(Math.abs(point.y)).toBeLessThan(1); expect(Math.abs(point.z)).toBeLessThan(1);
    }
  }
  it('fits transformed visible meshes initially and in all six camera views', async () => {
    const canvas = await mount(); const st = canvas._p3d;
    expect(st.obj.children).toHaveLength(2); expectFitted(st);
    const box = new THREE.Box3().setFromObject(st.obj), center = box.getCenter(new THREE.Vector3());
    expect(st.target).toEqual([center.x, center.y, center.z]);
    for (const view of ['Perspective', 'Front', 'Back', 'Left side', 'Right side', 'Top']) { await click(view); expectFitted(st); }
    expect(latest.sculptUndo || []).toHaveLength(0);
  });
  it('zooms from buttons and keyboard and fits again without editing the model', async () => {
    const canvas = await mount(), start = canvas._p3d.distance;
    await click('Zoom in sculpture view'); expect(canvas._p3d.distance).toBeCloseTo(start / 1.25);
    await act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true })));
    expect(canvas._p3d.distance).toBeCloseTo(start);
    await click('Front'); await click('Zoom in sculpture view'); await click('Fit sculpture');
    expect(canvas._p3d.yaw).toBe(0); expect(canvas._p3d.pitch).toBe(0); expectFitted(canvas._p3d);
    expect(latest.sculptRecipe).toEqual(model); expect(latest.sculptAuto).toBe(false);
  });
  it('restores a saved camera and accepts later external camera replacements', async () => {
    const saved = { yaw: 1.2, pitch: -0.3, distance: 8, target: [1, 2, 3] };
    const canvas = await mount({ sculptView: saved }); expect(api.view(canvas._p3d)).toEqual(saved);
    await act(async () => edit({ sculptView: { yaw: -2, pitch: 0.2, distance: 9, target: [-1, 0, 2] } }));
    expect(api.view(canvas._p3d)).toEqual(latest.sculptView);
    await act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(latest.sculptView.yaw).toBeCloseTo(-1.88);
    expect(canvas._captureArtStudioState().sculptView).toEqual(latest.sculptView);
  });
  it('frames a replacement preset but keeps the camera still during ordinary part edits', async () => {
    const canvas = await mount({ sculptView: { yaw: 0.2, pitch: 0.3, distance: 0.2, target: [12, 12, 12] } });
    const preset = host.querySelector('button[aria-label^="Preset: "]');
    await act(async () => preset.click()); expectFitted(canvas._p3d);
    const view = api.view(canvas._p3d);
    await act(async () => edit({ sculptRecipe: { ...latest.sculptRecipe, parts: latest.sculptRecipe.parts.map((part, i) => i ? part : { ...part, color: '#ff0000' }) } }));
    expect(api.view(canvas._p3d)).toEqual(view);
  });
  it('bounds repeated zoom and leaves browser shortcuts available', async () => {
    const canvas = await mount(), st = canvas._p3d;
    const originalDistance = st.distance;
    await act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true })));
    expect(st.distance).toBe(originalDistance);
    await act(async () => { for (let i = 0; i < 60; i++) st.viewCommand('in'); }); expect(st.distance).toBe(0.1);
    await act(async () => { for (let i = 0; i < 90; i++) st.viewCommand('out'); }); expect(st.distance).toBe(500);
  });
  it('saves the live auto-rotation angle for study capture and pauses an orbit gesture', async () => {
    const canvas = await mount({ sculptAuto: true }); await tick(16); await tick(32);
    expect(canvas._captureArtStudioState().sculptView.yaw).toBe(canvas._p3d.yaw);
    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 50, clientY: 50, button: 0, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 70, clientY: 60, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    });
    expect(latest.sculptAuto).toBe(false); expect(latest.sculptView).toEqual(api.view(canvas._p3d));
  });
  it('does not repaint idle paused scenes, but does repaint grid and size changes', async () => {
    const canvas = await mount(), renderer = canvas._p3d.ren;
    renderer.render.mockClear(); await tick(16); await tick(32); expect(renderer.render).not.toHaveBeenCalled();
    await click('Floor grid'); expect(canvas._p3d.grid.visible).toBe(false); expect(renderer.render).toHaveBeenCalled();
    canvas.getBoundingClientRect = () => ({ width: 600, height: 450 });
    observers[0].callback(); await tick(48); expect(canvas.width).toBe(600); expect(canvas.height).toBe(450);
    expect(canvas._p3d.cam.aspect).toBeCloseTo(4 / 3);
  });
  it('suspends automatic rotation and WebGL draws while the preview is offscreen', async () => {
    const canvas = await mount({ sculptAuto: true }), st = canvas._p3d;
    visibilityObservers[0].callback([{ target: canvas, isIntersecting: false }]);
    st.ren.render.mockClear(); const yaw = st.yaw; await tick(16); await tick(32);
    expect(st.yaw).toBe(yaw); expect(st.ren.render).not.toHaveBeenCalled();
    visibilityObservers[0].callback([{ target: canvas, isIntersecting: true }]); await tick(48);
    expect(st.yaw).toBeGreaterThan(yaw); expect(st.ren.render).toHaveBeenCalled();
  });
  it('captures a complete 1600px image and restores the preview even when copying fails', async () => {
    const canvas = await mount(), st = canvas._p3d, size = [canvas.width, canvas.height];
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() });
    const image = canvas._sculptExportCanvas(1600); expect([image.width, image.height]).toEqual([1600, 1200]);
    expect([canvas.width, canvas.height]).toEqual(size); expect(st.ren.render).toHaveBeenCalled();
    context.mockImplementation(() => { throw new Error('capture failed'); });
    expect(() => canvas._sculptExportCanvas(1600)).toThrow('capture failed');
    expect([canvas.width, canvas.height]).toEqual(size); expect(st.cam.aspect).toBeCloseTo(4 / 3);
  });
  it('releases geometry, rendering resources, and the resize observer after leaving', async () => {
    const canvas = await mount(), st = canvas._p3d, disposal = vi.spyOn(st.obj.children[0].geometry, 'dispose');
    await act(async () => edit({ tab: 'colorWheel' })); await tick();
    expect(canvas._p3d).toBeNull(); expect(disposal).toHaveBeenCalled(); expect(st.ren.dispose).toHaveBeenCalled(); expect(observers[0].disconnect).toHaveBeenCalled(); expect(visibilityObservers[0].disconnect).toHaveBeenCalled();
  });
});
