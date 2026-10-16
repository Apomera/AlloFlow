import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_flightsim.js', 'utf8');
const lighting = {};
const solarStart = source.indexOf('  function getFlightSolarFrame(');
const lightEnd = source.indexOf('  function getTerrainSunLight(', solarStart);
if (solarStart < 0 || lightEnd <= solarStart) throw new Error('Production solar helpers were not found');
runInNewContext(source.slice(solarStart, lightEnd), lighting);
const frame = hour => lighting.getFlightLightingFrame(hour);
const legacyBoundaries = [0.2, 0.4].flatMap(value => {
  const offset = Math.acos(value) * 12 / Math.PI;
  return [12 - offset, 12 + offset];
});

describe('continuous city illumination', () => {
  it('is finite and bounded through the solar day, with dark daytime windows and full night illumination', () => {
    for (let hour = 0; hour <= 24; hour += 0.05) {
      const factor = frame(hour).cityLightFactor;
      expect(Number.isFinite(factor)).toBe(true);
      expect(factor).toBeGreaterThanOrEqual(0);
      expect(factor).toBeLessThanOrEqual(1);
    }
    expect(frame(12).cityLightFactor).toBe(0);
    expect(frame(0).cityLightFactor).toBe(1);
    expect(frame(22).cityLightFactor).toBe(1);
    expect(frame(17).cityLightFactor).toBeGreaterThan(0);
    expect(frame(17).cityLightFactor).toBeLessThan(frame(18).cityLightFactor);
  });

  it('brightens smoothly toward evening and dims symmetrically after dawn', () => {
    let previous = frame(12).cityLightFactor;
    for (let hour = 12.05; hour <= 24; hour += 0.05) {
      const factor = frame(hour).cityLightFactor;
      expect(factor + 1e-12).toBeGreaterThanOrEqual(previous);
      expect(frame(24 - hour).cityLightFactor).toBeCloseTo(factor, 10);
      previous = factor;
    }
  });

  it('has no step at former night/dusk classification thresholds, either horizon, or midnight', () => {
    for (const hour of [...legacyBoundaries, 6, 18, 0, 24]) {
      expect(Math.abs(frame(hour + 0.0001).cityLightFactor - frame(hour - 0.0001).cityLightFactor)).toBeLessThan(0.001);
    }
  });

  it('uses the existing finite-noon fallback and wrapped solar clock', () => {
    for (const value of [undefined, null, NaN, Infinity, -Infinity]) expect(frame(value).cityLightFactor).toBe(0);
    for (const [input, normalized] of [[-1, 23], [25, 1], [48, 0], [-48, 0]]) {
      expect(frame(input).cityLightFactor).toBe(frame(normalized).cityLightFactor);
    }
  });
});

// Isolate the authored Canvas pass, retaining its lighting and paint logic.
// Fixed dry terrain makes opacity checks independent of geographic node luck.
const overlayStart = source.indexOf('      var drawNightGroundLights = function(');
const overlayEnd = source.indexOf('      // -- Atmospheric cloud-shadow compositor', overlayStart);
if (overlayStart < 0 || overlayEnd <= overlayStart) throw new Error('Production night-ground-light pass was not found');
const overlay = {
  getFlightLightingFrame: lighting.getFlightLightingFrame,
  getSceneryQualityBudget: () => ({ microDetails: false }),
  isWater: () => false,
  terrainHash: () => 0.85,
};
runInNewContext(source.slice(overlayStart, overlayEnd), overlay);
const rgbaAlpha = value => Number(value.slice(value.lastIndexOf(',') + 1, -1));
function groundLightPaint(hour) {
  const paints = [];
  const context = {
    save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {},
    stroke() { paints.push(this.strokeStyle); },
    fillRect() { paints.push(this.fillStyle); },
    createRadialGradient() { return { stops: [], addColorStop(offset, color) { this.stops.push(color); } }; },
  };
  overlay.drawNightGroundLights(context, 1280, 720, 300,
    { lat: 0, lon: 0, heading: 0, altitude: 1000, fieldElev: 0 }, 0,
    { solarHour: hour, brightness: frame(hour).brightness, isNight: false, isDusk: false }, 0);
  return paints.flatMap(paint => typeof paint === 'string' ? [rgbaAlpha(paint)] : paint.stops.map(rgbaAlpha));
}

describe('Canvas city-light opacity', () => {
  it('fades all ground-light paint with solar illumination independently of status classifications', () => {
    const night = groundLightPaint(22);
    expect(night.length).toBeGreaterThan(20);
    expect(groundLightPaint(12)).toEqual([]);
    for (const hour of [16.5, 17, 18]) {
      const twilight = groundLightPaint(hour);
      expect(twilight).toHaveLength(night.length);
      twilight.forEach((alpha, index) => expect(alpha).toBeCloseTo(night[index] * frame(hour).cityLightFactor, 10));
    }
  });

  it('does not switch on an entire road/light network at the former night threshold', () => {
    const boundary = 12 + Math.acos(0.2) * 12 / Math.PI;
    const before = groundLightPaint(boundary - 0.001), after = groundLightPaint(boundary + 0.001);
    expect(before.length).toBeGreaterThan(20);
    expect(after).toHaveLength(before.length);
    after.forEach((alpha, index) => expect(Math.abs(alpha - before[index])).toBeLessThan(0.002));
  });
});

const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const Three = vendor.THREE;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, reactRoot;
afterEach(async () => {
  if (reactRoot) await React.act(async () => reactRoot.unmount());
  reactRoot = null; host?.remove(); host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.THREE; delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
});

describe('production city material illumination', () => {
  it('applies one continuous factor to mapped and illustrative city windows without changing opaque surfaces', async () => {
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
    Object.assign(hooks.flightRef.current, { lat: 43.656, lon: -70.265, altitude: 1800,
      fieldElev: 0, onGround: false, speed: 0, heading: 0 });
    Object.assign(hooks.controlsRef.current, { throttle: 0, pitch: 0, bank: 0 });
    Object.assign(hooks.getWeatherRef().current, { wind: 0, turbulence: 0, visibility: 1, type: 'clear' });
    vi.spyOn(api.Physics, 'step').mockImplementation(state => ({ ...state,
      forces: { lift: api.Physics.WEIGHT, weight: api.Physics.WEIGHT, drag: 0, thrust: 0 } }));
    const boundary = 12 + Math.acos(0.2) * 12 / Math.PI;
    const observed = [];
    for (const hour of [12, boundary - 0.001, boundary + 0.001, 22]) {
      hooks.timeRef.current = ((hour - 12 - hooks.flightRef.current.lon / 15 + 48) % 24) * 100;
      wallTime += 16;
      expect(callback).toBeTypeOf('function');
      await React.act(async () => callback());
      expect(errors).not.toHaveBeenCalled();
      const [scene] = renderer.render.mock.calls.at(-1);
      const district = scene.children.find(item => item.userData?.flightCityDistrict);
      const clusters = scene.children.filter(item => item.userData?.geo?.type === 'BoxGeometry' && Array.isArray(item.userData.mats));
      expect(district).toBeTruthy(); expect(clusters.length).toBeGreaterThan(0);
      const solarHour = ((hooks.flightRef.current.lon / 15 + 12 + hooks.timeRef.current * 0.01) % 24 + 24) % 24;
      const factor = api.getFlightLightingFrame(solarHour).cityLightFactor;
      const mapped = district.userData.mats[0];
      expect(mapped.emissive.r).toBeCloseTo(0.65 * factor, 10);
      expect(mapped.emissive.g).toBeCloseTo(0.65 * factor * 0.72, 10);
      expect(mapped.emissive.b).toBeCloseTo(0.65 * factor * 0.35, 10);
      expect(mapped.transparent).toBe(false); expect(mapped.depthWrite).toBe(true);
      for (const cluster of clusters) for (const material of cluster.userData.mats) {
        expect(material.emissive.r).toBeCloseTo(0.55 * factor * 0.9, 10);
        expect(material.emissive.g).toBeCloseTo(0.55 * factor * 0.62, 10);
        expect(material.emissive.b).toBeCloseTo(0.55 * factor * 0.25, 10);
        expect(material.transparent).toBe(false); expect(material.depthWrite).toBe(true);
      }
      for (const material of district.userData.mats.slice(1)) expect(material.emissive.getHex()).toBe(0);
      observed.push(mapped.emissive.r);
    }
    expect(observed[0]).toBe(0);
    expect(Math.abs(observed[2] - observed[1])).toBeLessThan(0.002);
    expect(observed[3]).toBeCloseTo(0.65, 10);
  });
});
