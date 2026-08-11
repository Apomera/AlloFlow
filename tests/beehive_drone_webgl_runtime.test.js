import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const source = fs.readFileSync('stem_lab/stem_tool_beehive.js', 'utf8');
const threeSource = fs.readFileSync('vendor/three-r128/three.min.js', 'utf8');

describe('Drone Flight visible WebGL runtime', () => {
  let config;
  let host;
  let root;
  let latest;
  let context;
  let rafQueue;
  let originalRaf;
  let originalCancelRaf;
  let originalMatchMedia;

  function installThreeRenderer({ throwOnRender = false, pixelMode = 'unsupported' } = {}) {
    window.eval(threeSource);
    const THREE = window.THREE;
    const render = vi.fn(() => {
      if (throwOnRender) throw new Error('simulated WebGL render failure');
    });
    const dispose = vi.fn();
    const setPixelRatio = vi.fn();
    const shadowMap = { enabled: false, type: null };
    THREE.WebGLRenderer = function FakeWebGLRenderer(options) {
      this.domElement = options.canvas;
      this.shadowMap = shadowMap;
      this.outputEncoding = 0;
      this.setPixelRatio = setPixelRatio;
      this.setSize = vi.fn((width, height) => {
        options.canvas.width = width;
        options.canvas.height = height;
      });
      this.setClearColor = vi.fn();
      let readIndex = 0;
      this.getContext = pixelMode === 'unsupported' ? undefined : vi.fn(() => ({
        RGBA: 6408,
        UNSIGNED_BYTE: 5121,
        readPixels: vi.fn((_x, _y, _w, _h, _format, _type, out) => {
          readIndex += 1;
          if (pixelMode === 'flat') { out[0] = 0; out[1] = 0; out[2] = 0; out[3] = 0; return; }
          out[0] = 18 + readIndex * 13;
          out[1] = 42 + readIndex * 7;
          out[2] = 76 + readIndex * 5;
          out[3] = 255;
        }),
      }));
      this.render = render;
      this.dispose = dispose;
    };
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve(THREE));
    return { render, dispose, setPixelRatio, shadowMap };
  }

  async function mountAndStart(rendererOptions) {
    const renderer = installThreeRenderer(rendererOptions);
    const Component = () => {
      const [toolData, setToolData] = React.useState({
        beehive: { viewMode: 'drone', drone: { active: false, difficulty: 'easy' } },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
    const launch = host.querySelector('[data-mobile-rail="drone-difficulty"] button');
    expect(launch).toBeTruthy();
    await act(async () => {
      launch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    return renderer;
  }

  async function stepFrame(offset = 16) {
    const callback = rafQueue.shift();
    expect(callback).toBeTypeOf('function');
    await act(async () => {
      callback(performance.now() + offset);
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    window.__testHooks = {};
    originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: false, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const gradient = { addColorStop: vi.fn() };
    context = new Proxy({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn((text) => ({ width: String(text).length * 6 })),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
    }, {
      get(target, prop) {
        if (prop in target) return target[prop];
        target[prop] = vi.fn();
        return target[prop];
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(type) {
      return type === '2d' ? context : null;
    });
    rafQueue = [];
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn((callback) => {
      rafQueue.push(callback);
      return rafQueue.length;
    });
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    window.matchMedia = originalMatchMedia;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    delete window.THREE;
    delete window.__testHooks;
    vi.restoreAllMocks();
  });

  it('mounts a real visible Three scene layer and keeps the 2D canvas for the HUD', async () => {
    const renderer = await mountAndStart();
    const hudCanvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    const worldCanvas = host.querySelector('[data-beehive-drone-webgl="true"]');

    expect(hudCanvas.getAttribute('data-flight-renderer')).toBe('three-webgl');
    expect(hudCanvas.getAttribute('data-flight-layer')).toBe('hud-overlay');
    expect(worldCanvas).toBeTruthy();
    expect(worldCanvas.style.display).toBe('block');
    expect(worldCanvas.getAttribute('data-flight-layer')).toBe('three-world');
    expect(host.querySelector('[data-flight-renderer-badge="true"]').textContent).toBe('3D scene active');

    await stepFrame();
    expect(renderer.render).toHaveBeenCalled();
    expect(context.drawImage).not.toHaveBeenCalled();

    const state = window.__testHooks.beehive.droneStateRef.current;
    const yawBefore = state.yaw;
    hudCanvas.focus();
    hudCanvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await stepFrame(32);
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
    expect(state.yaw).toBeLessThan(yawBefore);
  });

  it('pixel-verifies a varied WebGL frame after warmup', async () => {
    await mountAndStart({ pixelMode: 'varied' });
    const hudCanvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    for (let frame = 0; frame < 8; frame += 1) await stepFrame(16 + frame * 16);
    expect(hudCanvas.getAttribute('data-flight-frame-health')).toBe('verified');
    expect(host.querySelector('[data-beehive-drone-webgl="true"]').getAttribute('data-flight-frame-health')).toBe('verified');
    expect(host.querySelector('[data-flight-renderer-badge="true"]').textContent).toBe('3D scene verified');
  });

  it('falls back when WebGL repeatedly produces a flat transparent frame', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const renderer = await mountAndStart({ pixelMode: 'flat' });
    const hudCanvas = host.querySelector('[data-beehive-drone-canvas="true"]');
    for (let frame = 0; frame < 24; frame += 1) await stepFrame(16 + frame * 16);
    expect(renderer.dispose).toHaveBeenCalled();
    expect(hudCanvas.getAttribute('data-flight-renderer')).toBe('canvas-2d-fallback');
    expect(hudCanvas.getAttribute('data-flight-frame-health')).toBe('fallback');
    expect(host.querySelector('[data-beehive-drone-webgl="true"]')).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('applies graphics, steering, and camera comfort settings without restarting flight', async () => {
    const renderer = await mountAndStart();
    const state = window.__testHooks.beehive.droneStateRef.current;
    const graphics = host.querySelector('[data-flight-graphics-mode="true"]');
    const steering = host.querySelector('[data-flight-steering-sensitivity="true"]');
    const stabilization = host.querySelector('[data-flight-camera-stabilized="true"]');
    expect(graphics).toBeTruthy();
    expect(steering).toBeTruthy();
    expect(stabilization.getAttribute('aria-pressed')).toBe('true');
    await act(async () => {
      graphics.value = 'eco';
      graphics.dispatchEvent(new Event('change', { bubbles: true }));
      steering.value = 'gentle';
      steering.dispatchEvent(new Event('change', { bubbles: true }));
      stabilization.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    await stepFrame();
    expect(state.graphicsMode).toBe('eco');
    expect(state.graphicsTier).toBe('eco');
    expect(state.steeringSensitivity).toBe('gentle');
    expect(state.cameraStabilized).toBe(false);
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(1);
    expect(renderer.shadowMap.enabled).toBe(false);
    expect(host.querySelector('[data-flight-quality-badge="true"]').getAttribute('data-quality-tier')).toBe('eco');
  });

  it('falls back in the same frame when WebGL rendering fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const renderer = await mountAndStart({ throwOnRender: true });
    const hudCanvas = host.querySelector('[data-beehive-drone-canvas="true"]');

    await expect(stepFrame()).resolves.toBeUndefined();
    expect(renderer.render).toHaveBeenCalled();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(hudCanvas.getAttribute('data-flight-renderer')).toBe('canvas-2d-fallback');
    expect(host.querySelector('[data-beehive-drone-webgl="true"]')).toBeNull();
    expect(host.querySelector('[data-flight-renderer-badge="true"]').textContent).toBe('2D safety view');
    expect(context.fillRect).toHaveBeenCalled();
    expect(rafQueue.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalled();
  });

  it('ships aligned camera/control conventions and one accessible renderer surface', async () => {
    await mountAndStart();
    const html = host.innerHTML;

    expect(html).toContain('data-flight-renderer-badge="true"');
    expect(host.querySelector('[data-flight-renderer-badge="true"]').textContent).toContain('3D scene');
    expect((html.match(/data-beehive-drone-canvas="true"/g) || [])).toHaveLength(1);
    expect(source).toContain("t.camera.rotation.set((ds.pitch || 0) - cameraBob, -(ds.yaw || 0), (ds.roll || 0) * (cameraStabilized ? 0.35 : 1))");
    expect(source).toContain("if (keys.ArrowLeft || keys.a) turnInput = -1");
    expect(source).toContain('try { updateThreeWorld(now); }');
    expect(source).toContain("addEventListener('webglcontextlost'");
    expect(source).toContain('verifyThreeFrameHealth(t)');
    expect(source).toContain('var usingThreeScene = !!(threeWorld && threeWorld.ready)');
    expect(source).toContain("c.fillText('FLIGHT PATH'");
    expect(source).toContain("trainingActive: difficulty === 'easy'");
    expect(source).toContain('syncAdaptiveDroneQuality(dt)');
    expect(source).toContain("_droneCameraStabilized.current === false ? actualRoll : actualRoll * 0.35");
    expect(source).toContain('turnRate = ds.controlTurn * speedTurnAuthority * steeringScale');
    expect(html).toContain('data-flight-comfort-settings="true"');
    expect(html).toContain('data-flight-quality-badge="true"');
    expect(source).not.toContain("document.querySelector('[data-beehive-focus-panel]')");
    expect(source).not.toContain('c.drawImage(threeWorld.canvas');
    expect(source).not.toContain('_droneOverlayCvRef');
  });
});
