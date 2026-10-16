import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
runInNewContext(readFileSync('dev-tools/skyschool-clouds.js', 'utf8'), vendor);
const Three = vendor.THREE;
const roll = vendor.getFlightCloudRoll;
const radians = degrees => degrees * Math.PI / 180;
function quaternion(pitch = 0, heading = 0, bank = 0) {
  return new Three.Quaternion().setFromEuler(new Three.Euler(radians(pitch), radians(heading), radians(bank), 'YXZ'));
}
function projectedUp(camera) {
  // Project two actual world points at the center of the camera view. This
  // independently checks the sprite's screen axes, not the helper's q formula.
  camera.updateMatrixWorld(true);
  const forward = camera.getWorldDirection(new Three.Vector3());
  const base = camera.position.clone().addScaledVector(forward, 100);
  const top = base.clone().add(new Three.Vector3(0, 0.01, 0));
  base.project(camera); top.project(camera);
  return new Three.Vector2((top.x - base.x) * camera.aspect, top.y - base.y).normalize();
}
function assertAligned(angle, up) {
  // r128's sprite rotation maps texture-up (0,1) to (-sin(a),cos(a)).
  const textureUp = new Three.Vector2(-Math.sin(angle), Math.cos(angle));
  expect(textureUp.dot(up)).toBeCloseTo(1, 8);
  expect(Math.abs(textureUp.x * up.y - textureUp.y * up.x)).toBeLessThan(1e-7);
}

describe('world-aligned cloud billboard orientation', () => {
  it('keeps level cloud bases level and banks them in both directions with the horizon', () => {
    expect(roll(quaternion(), 0)).toBeCloseTo(0, 12);
    for (const bank of [-70, -35, 35, 70]) expect(roll(quaternion(0, 0, bank))).toBeCloseTo(-radians(bank), 12);
  });

  it('keeps the cloud top pointing toward world-up through heading, pitch, and inverted flight', () => {
    const camera = new Three.PerspectiveCamera(55, 16 / 9, 0.1, 1000);
    camera.position.set(23, 50, -70);
    for (const pitch of [-80, -30, 0, 30, 80]) for (const heading of [-180, -90, 0, 90, 179]) {
      for (const bank of [-150, -35, 0, 35, 180]) {
        camera.quaternion.copy(quaternion(pitch, heading, bank));
        assertAligned(roll(camera.quaternion), projectedUp(camera));
      }
    }
  });

  it('reads the latest quaternion without depending on stale camera matrices', () => {
    const camera = new Three.PerspectiveCamera();
    camera.updateMatrixWorld(true);
    const previousMatrix = camera.matrixWorld.toArray();
    camera.quaternion.copy(quaternion(15, 70, 40));
    const angle = roll(camera.quaternion);
    expect(camera.matrixWorld.toArray()).toEqual(previousMatrix);
    expect(Math.abs(angle)).toBeGreaterThan(0.5);
    assertAligned(angle, projectedUp(camera));
  });

  it('holds the previous finite angle near either vertical-view singularity', () => {
    for (const pitch of [-90, -89.999, 89.999, 90]) {
      expect(roll(quaternion(pitch, 37, -22), 0.73)).toBe(0.73);
      expect(roll(quaternion(pitch), NaN)).toBe(0);
    }
    const almostVertical = quaternion(89.98, 37, -22);
    expect(roll(almostVertical, 0.73)).not.toBe(0.73);
  });

  it('normalizes safely without mutating the camera quaternion or changing equivalent rotations', () => {
    const q = quaternion(24, 31, -46), before = q.toArray();
    const expected = roll(q);
    for (const scale of [-3, 0.001, 1e-300, 1e300]) {
      const value = Object.freeze({ x: q.x * scale, y: q.y * scale, z: q.z * scale, w: q.w * scale });
      expect(roll(value)).toBeCloseTo(expected, 10);
    }
    expect(q.toArray()).toEqual(before);
  });

  it('uses a safe previous angle for missing, zero, and nonfinite rotations', () => {
    for (const q of [undefined, null, {}, { x: 0, y: 0, z: 0, w: 0 },
      { x: NaN, y: 0, z: 0, w: 1 }, { x: 0, y: Infinity, z: 0, w: 1 },
      { x: 0, y: 0, z: '0', w: 1 }]) {
      expect(roll(q, -0.4)).toBe(-0.4);
      expect(roll(q, Infinity)).toBe(0);
    }
  });
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, reactRoot;
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

describe('production cloud bank alignment', () => {
  it('rotates visible cloud textures with the actual camera while preserving cloud resources and placement', async () => {
    resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
    const tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
    const api = window.__RR_TEST_EXPORTS__.flightSim;
    let callback = null, wallTime = 1000;
    const context = new Proxy({
      measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    }, { get: (target, property) => property in target ? target[property] : () => {},
      set: (target, property, value) => { target[property] = value; return true; } });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    vi.spyOn(performance, 'now').mockImplementation(() => wallTime);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('AlloPostFXEnabled', false);
    vi.stubGlobal('requestAnimationFrame', next => { if (next.name === 'loop') callback = next; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const renderer = { domElement: {}, shadowMap: {}, capabilities: { getMaxAnisotropy: () => 1 },
      setSize() {}, setPixelRatio() {}, dispose() {}, getContext: () => ({ isContextLost: () => false }),
      render: vi.fn((scene, camera) => { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }) };
    window.THREE = { ...Three, WebGLRenderer: function() { return renderer; } };
    host = document.createElement('div'); document.body.appendChild(host); reactRoot = ReactDOMClient.createRoot(host);
    function App() {
      const [data, setData] = React.useState({ flightSim: { view: 'menu', cityOnline: false,
        thirdPerson: false, flightDetails: false, railCollapsed: true, takeoffTutorialDismissed: true,
        landingTutorialDismissed: true, earnedBadges: Object.fromEntries(api.ACHIEVEMENTS.map(item => [item.id, true])) } });
      return tool.render(makeCtx({ toolData: data, setToolData: setData,
        update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
        updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
    }
    await React.act(async () => reactRoot.render(React.createElement(App)));
    await React.act(async () => window.__testHooks.flightSim.startFlightChallenge('first_flight'));
    for (const canvas of host.querySelectorAll('canvas')) {
      Object.defineProperty(canvas, 'clientWidth', { value: 1280, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: 720, configurable: true });
    }
    const hooks = window.__testHooks.flightSim;
    Object.assign(hooks.flightRef.current, { altitude: 1800, fieldElev: 76, onGround: false, speed: 0, heading: 0 });
    Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
    Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
    vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
      forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
    let initialClouds;
    for (const bank of [0, -35, 35, 180]) {
      hooks.flightRef.current.bank = bank;
      hooks.timeRef.current = ((-hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
      wallTime += 16;
      expect(callback).toBeTypeOf('function');
      await React.act(async () => callback());
      expect(errors).not.toHaveBeenCalled();
      const [scene, camera] = renderer.render.mock.calls.at(-1);
      const clouds = scene.children.find(item => item.isGroup && item.children.length === 24
        && item.children.every(child => child.isSprite && child.material.map?.image?.width === 128
          && child.material.map?.image?.height === 64));
      expect(clouds).toBeTruthy();
      const visible = clouds.children.filter(child => child.visible);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.length).toBeLessThanOrEqual(8);
      expect(visible.some(cloud => cloud.material.opacity > 0.4)).toBe(true);
      const up = projectedUp(camera);
      for (const cloud of visible) {
        assertAligned(cloud.material.rotation, up);
        expect(cloud.material.opacity).toBeGreaterThan(0);
        expect(cloud.material.opacity).toBeLessThanOrEqual(0.75);
        expect(cloud.material.depthWrite).toBe(false);
        expect(cloud.material.map).toBe(visible[0].material.map);
      }
      if (bank) expect(Math.abs(visible[0].material.rotation)).toBeGreaterThan(0.4);
      if (!initialClouds) initialClouds = clouds.children.map(cloud => ({ mesh: cloud, material: cloud.material,
        map: cloud.material.map, position: cloud.position.toArray(), scale: cloud.scale.toArray() }));
      else clouds.children.forEach((cloud, index) => {
        const before = initialClouds[index];
        expect(cloud).toBe(before.mesh); expect(cloud.material).toBe(before.material);
        expect(cloud.material.map).toBe(before.map);
        expect(cloud.position.toArray()).toEqual(before.position);
        expect(cloud.scale.toArray()).toEqual(before.scale);
      });
    }
  });
});
