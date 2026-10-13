import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ROOT_HALF = Math.sqrt(0.5);
const SUN = { x: -ROOT_HALF, y: 0, z: ROOT_HALF };
const BAD_NUMBERS = [undefined, null, false, true, '', '1', {}, [], new Number(1), NaN, Infinity, -Infinity];
let P;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(SOURCE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function recorder() {
  const calls = [];
  const gradient = (...args) => {
    calls.push(['gradient', ...args]);
    return { isGradient: true, addColorStop: (...stop) => calls.push(['stop', ...stop]) };
  };
  const known = { createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 5 }) };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => {
      for (const value of args) if (typeof value === 'number') expect(Number.isFinite(value), String(key)).toBe(true);
      calls.push([key, ...args]);
    }),
    set: (target, key, value) => {
      target[key] = value;
      calls.push(['set', key, value?.isGradient ? 'gradient' : value]);
      return true;
    },
  });
  return { ctx, calls };
}

const shape = calls => calls.filter(row => !['set', 'gradient', 'stop'].includes(row[0]));

// Isolate one balanced Canvas save/restore group by its public pose, so the
// actual overview can be compared with the existing standalone hull renderers.
function hullAt(calls, x, y) {
  const translated = calls.findIndex(row => row[0] === 'translate' && row[1] === x && row[2] === y);
  expect(translated).toBeGreaterThan(0);
  const start = translated - 1;
  expect(calls[start]).toEqual(['save']);
  let depth = 0;
  for (let end = start; end < calls.length; end++) {
    if (calls[end][0] === 'save') depth++;
    if (calls[end][0] === 'restore' && --depth === 0) {
      const group = calls.slice(start, end + 1).map(row => [...row]);
      group[1] = ['translate', 0, 0];
      return group;
    }
  }
  throw new Error('Unbalanced spacecraft Canvas group');
}

// Build normals by rotating a unit direction away from the Sun. Their angle
// with sunlight is the construction angle, independently of the runtime dot.
function normalAtAngle(angle, azimuth = 0) {
  const along = Math.cos(angle), across = Math.sin(angle) * Math.cos(azimuth);
  return { x: ROOT_HALF * (-along + across), y: Math.sin(angle) * Math.sin(azimuth),
    z: ROOT_HALF * (along + across) };
}

function luminance(rgb) {
  const linear = rgb.map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

describe('shared docking Sun', () => {
  it('matches the declared surface axes and independent angular incidence around the sphere', () => {
    const axes = [
      [{ x: 1, y: 0, z: 0 }, -ROOT_HALF], [{ x: -1, y: 0, z: 0 }, ROOT_HALF],
      [{ x: 0, y: 1, z: 0 }, 0], [{ x: 0, y: -1, z: 0 }, 0],
      [{ x: 0, y: 0, z: 1 }, ROOT_HALF], [{ x: 0, y: 0, z: -1 }, -ROOT_HALF],
    ];
    for (const [normal, expected] of axes) {
      const light = P.dockingSunlight(normal);
      expect(light.sun).toEqual(SUN);
      expect(light.incidence).toBeCloseTo(expected, 14);
      expect(light.daylight).toBe(expected > 0);
    }
    for (let degrees = 0; degrees <= 180; degrees += 5) {
      const angle = degrees * Math.PI / 180;
      for (const azimuth of [0, 0.37, Math.PI / 2, 2.43]) {
        const light = P.dockingSunlight(normalAtAngle(angle, azimuth));
        expect(light.incidence).toBeCloseTo(Math.cos(angle), 13);
        if (degrees !== 90) expect(light.daylight).toBe(degrees < 90);
      }
    }
    expect(P.dockingSunlight({ x: 1, y: 0, z: 1 }).daylight).toBe(false);
  });

  it('normalizes finite surface vectors without changing the caller or leaking mutable Sun state', () => {
    const normal = Object.freeze({ x: -3, y: 2, z: 5 }), before = JSON.stringify(normal);
    const reference = P.dockingSunlight(normal);
    for (const factor of [1e-100, 0.125, 1, 17, 1e100]) {
      const result = P.dockingSunlight(Object.freeze({ x: normal.x * factor, y: normal.y * factor, z: normal.z * factor }));
      expect(result.incidence).toBeCloseTo(reference.incidence, 13);
      expect(result.response).toBeCloseTo(reference.response, 13);
      expect(result.sun).toEqual(SUN);
    }
    expect(JSON.stringify(normal)).toBe(before);
    const fresh = P.dockingSunlight(normal);
    expect(fresh).not.toBe(reference); expect(fresh.sun).not.toBe(reference.sun);
    reference.sun.x = 99; reference.incidence = -99;
    expect(P.dockingSunlight(normal)).toEqual(fresh);
    const craft = P.dockingCraftLight(0), expectedCraft = P.dockingCraftLight(0);
    craft.x = 99; craft.gradient.x0 = 99;
    expect(P.dockingCraftLight(0)).toEqual(expectedCraft);
  });

  it('rejects invalid normals and attitudes instead of producing nonfinite drawing inputs', () => {
    for (const normal of [null, undefined, {}, [], { x: 0, y: 0, z: 0 },
      { x: Number.MAX_VALUE, y: Number.MAX_VALUE, z: Number.MAX_VALUE }]) {
      expect(P.dockingSunlight(normal)).toBeNull();
    }
    for (const bad of BAD_NUMBERS) {
      for (const key of ['x', 'y', 'z']) expect(P.dockingSunlight({ x: 1, y: 2, z: 3, [key]: bad })).toBeNull();
      expect(P.dockingCraftLight(bad)).toBeNull();
    }
  });

  it('has a continuous terminator and a monotonic neutral response from darkness to direct illumination', () => {
    let previous = 0;
    for (let degrees = 180; degrees >= 0; degrees--) {
      const light = P.dockingSunlight(normalAtAngle(degrees * Math.PI / 180, 0.63));
      expect(light.response).toBeGreaterThanOrEqual(0.24);
      expect(light.response).toBeLessThanOrEqual(1);
      expect(light.response + 1e-14).toBeGreaterThanOrEqual(previous);
      if (degrees >= 91) expect(light.response).toBe(0.24);
      previous = light.response;
    }
    expect(P.dockingSunlight(SUN).response).toBeCloseTo(1, 14);
    const before = P.dockingSunlight(normalAtAngle(Math.PI / 2 - 1e-7));
    const after = P.dockingSunlight(normalAtAngle(Math.PI / 2 + 1e-7));
    expect(before.daylight).toBe(true); expect(after.daylight).toBe(false);
    expect(before.response - after.response).toBeGreaterThan(0);
    expect(before.response - after.response).toBeLessThan(1e-7);
  });

  it('reprojects both body frames into the same upper-left screen direction at every attitude', () => {
    for (const angle of [-7.3, -Math.PI, -Math.PI / 2, -0.4, 0, Math.PI / 2, 2.9, 11.2]) {
      const light = P.dockingCraftLight(angle);
      // Transform body components forward onto screen basis vectors.
      const right = [Math.cos(angle), Math.sin(angle)], down = [-Math.sin(angle), Math.cos(angle)];
      expect(light.x * right[0] + light.y * down[0]).toBeCloseTo(-ROOT_HALF, 13);
      expect(light.x * right[1] + light.y * down[1]).toBeCloseTo(-ROOT_HALF, 13);
      expect(Math.hypot(light.x, light.y)).toBeCloseTo(1, 13);
      expect(light.fraction).toBe(1);
      const repeated = P.dockingCraftLight(angle + 2 * Math.PI);
      expect(repeated.x).toBeCloseTo(light.x, 13); expect(repeated.y).toBeCloseTo(light.y, 13);
    }
    const columbia = P.dockingCraftLight(0), eagle = P.dockingCraftLight(Math.PI / 2);
    expect(eagle.x).toBeCloseTo(columbia.y, 14); expect(eagle.y).toBeCloseTo(-columbia.x, 14);
    // The Sun is in this drawing plane: a hull-facing normal has the same
    // incidence as its corresponding physical spherical surface normal.
    for (const angle of [0, Math.PI / 2]) for (let a = 0; a < 360; a += 15) {
      const nx = Math.cos(a * Math.PI / 180), ny = Math.sin(a * Math.PI / 180);
      const screenX = nx * Math.cos(angle) - ny * Math.sin(angle);
      const screenY = nx * Math.sin(angle) + ny * Math.cos(angle);
      const light = P.dockingCraftLight(angle);
      const surface = P.dockingSunlight({ x: screenX, y: 0, z: -screenY });
      expect(nx * light.x + ny * light.y).toBeCloseTo(surface.incidence, 13);
    }
  });

  it('applies illumination to albedo with the same angular response while retaining neutral surface detail', () => {
    const responses = [];
    for (const degrees of [180, 135, 95, 90, 75, 60, 45, 30, 15, 0]) {
      const angle = degrees * Math.PI / 180, normal = normalAtAngle(angle, 0.51);
      const material = P.dockingSurfaceMaterial(normal);
      const normalizedExposure = (material.brightness - 0.02) / (0.45 * material.albedo);
      expect(normalizedExposure).toBeCloseTo(0.24 + 0.76 * Math.max(0, Math.cos(angle)), 13);
      expect(material.albedo).toBeGreaterThanOrEqual(0.30); expect(material.albedo).toBeLessThanOrEqual(0.70);
      expect(material.rgb).toEqual(Array(3).fill(Math.round(material.brightness * 255)));
      const scaled = P.dockingSurfaceMaterial({ x: normal.x * 37, y: normal.y * 37, z: normal.z * 37 });
      expect(scaled.albedo).toBeCloseTo(material.albedo, 12);
      expect(scaled.brightness).toBeCloseTo(material.brightness, 12);
      expect(scaled.rgb).toEqual(material.rgb);
      responses.push(normalizedExposure);
    }
    for (let index = 1; index < responses.length; index++) expect(responses[index] + 1e-13).toBeGreaterThanOrEqual(responses[index - 1]);
  });

  it('retains readable captions and nonblack opaque material across the entire sphere', () => {
    const caption = luminance([203, 213, 225]);
    expect((caption + 0.05) / (luminance([85, 85, 85]) + 0.05)).toBeGreaterThan(4.5);
    const shades = new Set();
    for (let degrees = 0; degrees <= 180; degrees += 10) for (let longitude = 0; longitude < 360; longitude += 15) {
      const normal = Object.freeze(normalAtAngle(degrees * Math.PI / 180, longitude * Math.PI / 180));
      const material = P.dockingSurfaceMaterial(normal), repeated = P.dockingSurfaceMaterial(normal);
      expect(material).toEqual(repeated); expect(material).not.toBe(repeated);
      expect(material.rgb.every(value => Number.isInteger(value) && value > 0 && value <= 85)).toBe(true);
      expect((caption + 0.05) / (luminance(material.rgb) + 0.05)).toBeGreaterThanOrEqual(4.5);
      shades.add(material.rgb[0]);
    }
    expect(shades.size).toBeGreaterThan(30);
  });

  it('relights the existing Columbia and Eagle hulls without changing any shape, pose or plume gate', () => {
    const sun = Object.freeze({ directionX: SUN.x, directionY: SUN.z, fraction: 1 });
    for (const scale of [0.72, 1, 1.3]) {
      const bareCSM = recorder(), litCSM = recorder();
      P.drawReturnCraft(bareCSM.ctx, 180, 110, scale, -Math.PI, false);
      const csm = P.drawReturnCraft(litCSM.ctx, 180, 110, scale, -Math.PI, false, sun);
      expect(shape(litCSM.calls)).toEqual(shape(bareCSM.calls));
      expect(litCSM.calls).not.toEqual(bareCSM.calls);
      expect(csm.sunlight).toEqual(P.dockingCraftLight(0)); expect(csm.plumeVisible).toBe(false);
      const bareLM = recorder(), litLM = recorder();
      P.drawLunarAscentStage(bareLM.ctx, 60, 100, scale, Math.PI / 2, { time: 17, engineOn: false, thrust: 0 });
      const lm = P.drawLunarAscentStage(litLM.ctx, 60, 100, scale, Math.PI / 2,
        { time: 17, engineOn: false, thrust: 0, orbitLight: P.dockingCraftLight(Math.PI / 2) });
      expect(shape(litLM.calls)).toEqual(shape(bareLM.calls));
      expect(litLM.calls).not.toEqual(bareLM.calls);
      expect(lm.engineVisible).toBe(false); expect(lm.plumeVisible).toBe(false);
    }
  });

  it('connects both overview spacecraft to those lit hulls while retaining their measured port positions', () => {
    const sun = { directionX: SUN.x, directionY: SUN.z, fraction: 1 };
    const state = Object.freeze({ ...P.dockingState(), x: 0.4, y: -20, time: 17, ax: 0, ay: 0 });
    const before = JSON.stringify(state);
    for (const width of [282, 670, 1100]) {
      const overview = recorder(), result = P.drawDockingPractice(overview.ctx, width, 280, state);
      const scale = Math.min(1.3, Math.max(0.72, width / 670));
      const eagleX = result.eaglePortX - 19 * scale;
      const standaloneCSM = recorder(), standaloneLM = recorder();
      P.drawReturnCraft(standaloneCSM.ctx, 0, 0, scale, -Math.PI, false, sun);
      P.drawLunarAscentStage(standaloneLM.ctx, eagleX, result.eaglePortY, scale, Math.PI / 2,
        { time: state.time, engineOn: false, thrust: 0, orbitLight: P.dockingCraftLight(Math.PI / 2) });
      expect(hullAt(overview.calls, result.portX, result.portY)).toEqual(hullAt(standaloneCSM.calls, -38 * scale, 0));
      expect(hullAt(overview.calls, eagleX, result.eaglePortY)).toEqual(hullAt(standaloneLM.calls, eagleX, result.eaglePortY));
      expect((result.eaglePortX - result.portX) / result.pictureScale).toBeCloseTo(state.y, 10);
      expect((result.portY - result.eaglePortY) / result.pictureScale).toBeCloseTo(state.x, 10);
      expect(result.corridorHalfWidth / result.pictureScale).toBeCloseTo(P.docking.portTolerance, 12);
      expect(result.horizon).toEqual(P.dockingHorizonGeometry(width, 280));
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it('keeps fixed-nozzle RCS opposite the commanded acceleration and suppresses it after contact or fuel exhaustion', () => {
    for (const command of [{ ax: 0.03, ay: 0 }, { ax: 0, ay: 0.05 }, { ax: -0.03, ay: 0.05 }]) {
      for (const gate of [{ status: 'flying', propellant: 20 }, { status: 'flying', propellant: 0 },
        { status: 'docked', propellant: 20 }, { status: 'collision', propellant: 20 }]) {
        const state = Object.freeze({ ...P.dockingState(), ...command, ...gate }), before = JSON.stringify(state);
        const draw = recorder(), result = P.drawDockingPractice(draw.ctx, 670, 280, state);
        const active = gate.status === 'flying' && gate.propellant > 0;
        const jets = draw.calls.flatMap((row, index) => row[0] === 'stop' && row[1] === 0 && row[2] === 'rgba(243,239,255,0.7)' ? [index] : []);
        expect(result.rcsVisible).toBe(active);
        expect(result.engineVisible).toBe(false); expect(result.plumeVisible).toBe(false);
        expect(jets).toHaveLength(active ? Number(command.ax !== 0) + Number(command.ay !== 0) : 0);
        for (const index of jets) {
          const ray = draw.calls.slice(0, index).findLast(row => row[0] === 'gradient');
          const dx = ray[3] - ray[1], dy = ray[4] - ray[2];
          expect(dx * command.ay + dy * -command.ax).toBeLessThan(0);
          expect(dx === 0 || dy === 0).toBe(true);
        }
        expect(JSON.stringify(state)).toBe(before);
      }
    }
  });

  it('keeps frozen overview and close-up drawings steady and leaves recorded contact receipts untouched', () => {
    const contact = P.dockingStep({ ...P.dockingState(), x: 0.1, y: -0.005, vx: 0, vy: 0.05 }, 0.2);
    expect(contact.status).toBe('docked');
    const receipt = P.cleanDockingPlayback({ dockingRun: contact }), before = JSON.stringify(contact);
    Object.freeze(contact);
    for (const state of [Object.freeze(P.dockingState()), contact]) for (const view of ['overview', 'closeup']) {
      const early = recorder(), late = recorder();
      const a = P.drawDockingPractice(early.ctx, 282, 280, state, { time: 0, view });
      const b = P.drawDockingPractice(late.ctx, 282, 280, state, { time: 200, view });
      expect(a).toEqual(b); expect(early.calls).toEqual(late.calls);
      if (view === 'closeup') {
        expect(a).toEqual(P.dockingCloseupGeometry(282, 280, state));
        expect(a).not.toHaveProperty('horizon');
        expect(early.calls.some(row => row[0] === 'gradient' || row[0] === 'drawImage')).toBe(false);
      }
    }
    expect(JSON.stringify(contact)).toBe(before);
    expect(P.cleanDockingPlayback({ dockingRun: contact })).toEqual(receipt);
    expect(P.dockingStep(contact, 10, 'guided')).toEqual(contact);
  });
});
