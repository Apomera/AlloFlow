import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const TIMEOUT = 120000;
describe('galaxy shared pointer preview and selection', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, latest, now;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) {
      const attribute = new Attribute(array, itemSize);
      attribute.setXYZ = (index, x, y, z) => { attribute.array[index * itemSize] = x; attribute.array[index * itemSize + 1] = y; attribute.array[index * itemSize + 2] = z; return attribute; };
      return attribute;
    };
    now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    loops = installLoopStubs(); errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null;
    host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas();
    window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.useRealTimers(); vi.restoreAllMocks();
  });
  async function mount() {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    latest = { galaxy: { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false } };
    function Host() { const state = React.useState(latest); latest = state[0]; return config.render(makeCtx({ toolData: state[0], setToolData: state[1] })); }
    root = ReactDOMClient.createRoot(host); await React.act(async () => root.render(React.createElement(Host)));
    // Initial layout and hydration timers must finish before sending a pointer.
    await tick(200);
    const canvas = host.querySelector('[data-galaxy-canvas]');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 540 });
    expect(typeof canvas._galaxyGetHoverState).toBe('function');
    expect(host.querySelector('[data-galaxy-hover-preview]')).not.toBeNull();
    return canvas;
  }
  function event(canvas, type, point, extra = {}) {
    const value = new MouseEvent(type, { bubbles: true, clientX: point.x, clientY: point.y, buttons: 0, ...extra });
    Object.defineProperty(value, 'pointerType', { value: extra.pointerType || 'mouse' });
    Object.defineProperty(value, 'pointerId', { value: 1 });
    canvas.dispatchEvent(value);
  }
  async function tick(ms = 100) { now += ms; await React.act(async () => vi.advanceTimersByTimeAsync(ms)); }
  function point(canvas, index = 100) { const star = canvas._galaxyGetStarVisualState(index).animated; return { x: (star.x + 1) * 400, y: (1 - star.y) * 270 }; }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it('previews the same fresh animated candidate as click without changing learner state, and coalesces to ten scans per second', async () => {
    const canvas = await mount();
    // Nebula centers intentionally take priority over overlapping random stars.
    // Isolate star picking here; the named-nebula test below keeps both layers.
    await React.act(async () => canvas._setLayerVisibility('nebulae', false));
    const target = point(canvas), before = latest.galaxy;
    event(canvas, 'pointermove', target); await tick(1);
    const hovered = canvas._galaxyGetHoverState();
    expect(hovered).toMatchObject({ kind: 'star', visible: true });
    expect(hovered.index).toBeGreaterThanOrEqual(0);
    expect(latest.galaxy).toBe(before);
    expect(canvas.style.cursor).toBe('pointer');
    expect(host.querySelector('[data-galaxy-hover-label]').textContent).toBe(hovered.label);
    let projections = 0;
    const Vector = window.THREE.Vector3;
    window.THREE.Vector3 = function (...args) { const vector = new Vector(...args), project = vector.project; vector.project = (...values) => { projections++; return project.apply(vector, values); }; return vector; };
    for (let i = 0; i < 30; i++) event(canvas, 'pointermove', target);
    await tick(98); expect(projections).toBe(0);
    await tick(1); expect(projections).toBeGreaterThan(100);
    const afterOne = projections;
    for (let i = 0; i < 20; i++) event(canvas, 'pointermove', target);
    await tick(99); expect(projections).toBe(afterOne);
    await tick(1); expect(projections).toBeGreaterThan(afterOne);
    await React.act(async () => event(canvas, 'click', target, { detail: 1 }));
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(hovered.index);
    expect(canvas._galaxyGetHoverState().visible).toBe(false);
    clean();
  }, TIMEOUT);

  it('clears pending previews on gestures, hidden layers, observing changes, camera controls and teardown', async () => {
    const canvas = await mount(), target = point(canvas);
    const preview = async () => { event(canvas, 'pointermove', target); await tick(100); expect(canvas._galaxyGetHoverState().visible).toBe(true); };
    await preview();
    event(canvas, 'pointerleave', target); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    await preview(); event(canvas, 'pointerdown', target, { button: 2, buttons: 2 });
    expect(canvas._galaxyGetHoverState().visible).toBe(false);
    // A barrel/right-button move may arrive without a primary pointer-down.
    // It must dismiss the label without starting an orbit or selecting a star.
    await preview();
    const beforePressedMove = { ...canvas._galaxyOrbit };
    event(canvas, 'pointermove', target, { pointerType: 'pen', buttons: 2 }); await tick();
    expect(canvas._galaxyGetHoverState().visible).toBe(false);
    expect(canvas._galaxyOrbit).toEqual(beforePressedMove);
    expect(canvas._galaxyGetSelectionVisualState().selectedIndex).toBe(-1);
    await preview(); event(canvas, 'pointerdown', target, { buttons: 1 }); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    event(canvas, 'pointermove', target, { buttons: 1 }); await tick(); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    event(canvas, 'pointerup', target);
    event(canvas, 'pointermove', target, { pointerType: 'touch' }); await tick(); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    await preview(); await React.act(async () => canvas._setObserveMode('radio')); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    await preview(); await React.act(async () => canvas._galaxySetZoomPosition(45)); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    await preview(); await React.act(async () => canvas._setLayerVisibility('arms', false)); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    event(canvas, 'pointermove', target); await tick(); expect(canvas._galaxyGetHoverState().kind).not.toBe('star');
    await React.act(async () => canvas._setLayerVisibility('arms', true));
    await preview(); await React.act(async () => canvas._galaxySetHudHidden(true)); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    event(canvas, 'pointermove', target); await tick(); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    await React.act(async () => canvas._galaxySetHudHidden(false));
    event(canvas, 'pointermove', target);
    const getter = canvas._galaxyGetHoverState;
    await React.act(async () => root.unmount()); root = null; await tick(500);
    expect(canvas._galaxyGetHoverState).toBeNull(); expect(getter().visible).toBe(false);
    clean();
  }, TIMEOUT);

  it('uses named nebula centers consistently in each signal and avoids off-screen points', async () => {
    const canvas = await mount();
    await React.act(async () => { canvas._galaxyCycleNebula(1); canvas._galaxyInspectSelection(); });
    const nebula = canvas._galaxyGetInspectionState(), target = { x: (nebula.orbitCenter.x + 1) * 400, y: (1 - nebula.orbitCenter.y) * 270 };
    await React.act(async () => { canvas._galaxyExitInspection(); canvas._galaxyClearSelection(); });
    for (const band of ['visible', 'infrared', 'radio', 'xray', 'gravity']) {
      await React.act(async () => canvas._setObserveMode(band));
      event(canvas, 'pointermove', target); await tick();
      expect(canvas._galaxyGetHoverState()).toMatchObject({ visible: true, kind: 'nebula', label: nebula.label });
      await React.act(async () => event(canvas, 'click', target, { detail: 1 }));
      expect(latest.galaxy.selectedNebula).toBe(nebula.label);
      await React.act(async () => canvas._galaxyClearSelection());
    }
    event(canvas, 'pointermove', { x: -2, y: 100 }); await tick();
    expect(canvas._galaxyGetHoverState().visible).toBe(false);
    await React.act(async () => { canvas._galaxyCycleStar(1); canvas._galaxyInspectSelection(); });
    event(canvas, 'pointermove', point(canvas)); await tick(); expect(canvas._galaxyGetHoverState().visible).toBe(false);
    clean();
  }, TIMEOUT);
});
