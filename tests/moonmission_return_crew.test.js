import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
const DEG = Math.PI / 180;
const TAN_HALF_FIELD = Math.tan(40 * DEG);

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterAll(() => vi.restoreAllMocks());

function observer(ratio, direction = 0, time = 0) {
  const radius = P.entry.radius * ratio;
  const x = radius * Math.cos(direction * DEG), y = radius * Math.sin(direction * DEG);
  return { x, y, radius, time, view: {
    angRadiusDeg: Math.asin(1 / ratio) / DEG,
    lit: (1 + Math.sin(direction * DEG)) / 2,
  } };
}

function context() {
  const calls = [], text = [];
  function record(name, args) {
    for (const value of args) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    calls.push([name, ...args]);
  }
  const gradient = { addColorStop(...args) { record('addColorStop', args); } };
  const ctx = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'measureText') return value => ({ width: String(value).length * 6 });
      if (key === 'fillText') return (...args) => { text.push(String(args[0])); record('fillText', args); };
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return (...args) => { record(key, args); return gradient; };
      if (key === 'createImageData') return (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
      return (...args) => record(String(key), args);
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, calls, text };
}

describe('Earth return crew camera perspective', () => {
  it('grows from the measured distance and clips only when Earth exceeds the fixed angular field', () => {
    const profile = P.returnProfile();
    const samples = [0, profile.summary.duration / 2, profile.summary.duration - 900, profile.summary.duration]
      .map(time => P.returnSample(profile, time));
    let previous = 0;
    for (const sample of samples) {
      const before = JSON.stringify(sample), picture = P.returnCrewGeometry(sample, 120);
      const angle = Math.asin(P.entry.radius / Math.hypot(sample.x, sample.y)) / DEG;
      expect(picture.fieldDegrees).toBe(80); expect(picture.halfFieldDegrees).toBe(40);
      expect(picture.angularRadius).toBeCloseTo(angle, 10);
      expect(picture.angularDiameter).toBeCloseTo(2 * angle, 10);
      expect(picture.discRadius).toBeCloseTo(120 * Math.tan(angle * DEG) / TAN_HALF_FIELD, 9);
      expect(picture.discRadius).toBeGreaterThan(previous); previous = picture.discRadius;
      expect(picture.clipped).toBe(angle > 40); expect(picture.phase).toBe(sample.view.lit);
      expect(picture.rightX * sample.x + picture.rightY * sample.y).toBeCloseTo(0, 6);
      expect(Math.hypot(picture.rightX, picture.rightY)).toBeCloseTo(1, 12);
      expect(picture.rightX).toBeCloseTo(sample.y / sample.radius, 12);
      expect(picture.rightY).toBeCloseTo(-sample.x / sample.radius, 12);
      expect(picture.marks.map(mark => mark.degrees)).toEqual([-20, 0, 20]);
      expect(picture.marks[0].position).toBeCloseTo(-Math.tan(20 * DEG) / TAN_HALF_FIELD, 12);
      expect(picture.marks[1].position).toBe(0);
      expect(picture.marks[2].position).toBeCloseTo(Math.tan(20 * DEG) / TAN_HALF_FIELD, 12);
      expect(JSON.stringify(sample)).toBe(before);
    }
    for (const angle of [39.999, 40.001]) {
      const sample = observer(1 / Math.sin(angle * DEG));
      expect(P.returnCrewGeometry(sample, 120).clipped).toBe(angle > 40);
    }
  });

  it('hits the near surface at the center of the camera with the exact observer direction and range', () => {
    for (const ratio of [1.02, 2, 60]) for (const direction of [-135, 0, 72]) {
      const sample = observer(ratio, direction), before = JSON.stringify(sample);
      const ray = P.returnCrewRay(sample, 0, 0);
      expect(ray).not.toBeNull();
      expect(ray.nx).toBeCloseTo(Math.cos(direction * DEG), 9);
      expect(ray.ny).toBeCloseTo(Math.sin(direction * DEG), 9);
      expect(ray.nz).toBeCloseTo(0, 12);
      expect(ray.range / P.entry.radius).toBeCloseTo(ratio - 1, 9);
      expect(ray.solar).toBeCloseTo(ray.ny, 12);
      expect(JSON.stringify(sample)).toBe(before);
    }
  });

  it('uses a circular angular limb: rays immediately inside hit and rays immediately outside miss', () => {
    for (const ratio of [2, 4, 60]) {
      const sample = observer(ratio, 35);
      const boundary = Math.tan(Math.asin(1 / ratio)) / TAN_HALF_FIELD;
      for (const direction of [0, Math.PI / 4, Math.PI / 2, Math.PI]) {
        const u = boundary * Math.cos(direction), v = boundary * Math.sin(direction);
        expect(P.returnCrewRay(sample, u * 0.999, v * 0.999)).not.toBeNull();
        expect(P.returnCrewRay(sample, u * 1.001, v * 1.001)).toBeNull();
      }
    }
  });

  it('keeps every hit on the visible near surface, whose geographic cap narrows close to Earth', () => {
    const edgeDot = [];
    for (const ratio of [4, 1.02]) {
      const sample = observer(ratio, 20), centerNormal = [sample.x / sample.radius, sample.y / sample.radius, 0];
      const edge = Math.tan(Math.asin(1 / ratio) * 0.999) / TAN_HALF_FIELD;
      for (const fraction of [0, 0.25, 0.75, 1]) {
        const ray = P.returnCrewRay(sample, edge * fraction, 0);
        const normalDot = ray.nx * centerNormal[0] + ray.ny * centerNormal[1];
        expect(Math.hypot(ray.nx, ray.ny, ray.nz)).toBeCloseTo(1, 9);
        expect(ray.range).toBeGreaterThan(0);
        // A surface point is visible only when its outward normal faces the observer.
        expect(ratio * normalDot).toBeGreaterThanOrEqual(1 - 1e-8);
        if (fraction === 1) edgeDot.push(normalDot);
      }
    }
    expect(edgeDot[1]).toBeGreaterThan(0.98);
    expect(edgeDot[0]).toBeLessThan(0.35);
  });

  it('puts the illuminated limb on the side that faces the fixed +Y Sun for opposite observer positions', () => {
    const positiveX = observer(4, 0), negativeX = observer(4, 180);
    for (const u of [-0.15, 0.15]) {
      const first = P.returnCrewRay(positiveX, u, 0), opposite = P.returnCrewRay(negativeX, u, 0);
      expect(first).not.toBeNull(); expect(opposite).not.toBeNull();
      expect(first.solar * u).toBeLessThan(0);
      expect(opposite.solar * u).toBeGreaterThan(0);
      expect(opposite.nx).toBeCloseTo(-first.nx, 10);
      expect(opposite.ny).toBeCloseTo(-first.ny, 10);
    }
    expect(P.returnCrewGeometry(positiveX, 100).phase).toBeCloseTo(0.5, 12);
    expect(P.returnCrewGeometry(negativeX, 100).phase).toBeCloseTo(0.5, 12);
  });

  it('rotates geographic longitude at the sidereal rate while keeping north up and solar normals fixed', () => {
    const first = observer(4, 0, 0), later = observer(4, 0, 86164 / 4);
    const initialCenter = P.returnCrewRay(first, 0, 0), laterCenter = P.returnCrewRay(later, 0, 0);
    expect(initialCenter.longitude).toBeCloseTo(0, 10);
    expect(laterCenter.longitude).toBeCloseTo(-90, 10);
    expect(laterCenter.latitude).toBeCloseTo(0, 10);
    for (const v of [-0.15, 0.15]) {
      const ray = P.returnCrewRay(first, 0, v), rotated = P.returnCrewRay(later, 0, v);
      expect(ray.latitude * v).toBeGreaterThan(0);
      expect(ray.latitude).toBeCloseTo(Math.asin(ray.nz) / DEG, 10);
      expect(rotated.nx).toBe(ray.nx); expect(rotated.ny).toBe(ray.ny); expect(rotated.nz).toBe(ray.nz);
      expect(rotated.solar).toBe(ray.solar);
      expect(rotated.longitude - ray.longitude).toBeCloseTo(-90, 10);
    }
  });

  it('retains the crew camera choice in validated playback without changing a measured receipt', () => {
    const profile = P.returnProfile();
    const state = { entryAngle: profile.angle, returnView: 'crew', returnPaused: true,
      returnRun: { version: 1, angle: profile.angle, time: 1234.5, recorded: true },
      returnResult: { version: 1, ...profile.summary } };
    const before = JSON.stringify(state), crew = P.cleanReturnPlayback(state);
    expect(crew.returnView).toBe('crew'); expect(crew.returnRun.time).toBe(1234.5);
    expect(crew.returnRun.recorded).toBe(true); expect(crew.returnResult).toEqual(state.returnResult);
    expect(crew.returnPaused).toBe(true); expect(JSON.stringify(state)).toBe(before);
    expect(P.cleanReturnPlayback({ ...state, returnView: 'approach' }).returnView).toBe('approach');
    expect(P.cleanReturnPlayback({ ...state, returnView: 'unknown' }).returnView).toBe('system');
  });

  it('draws deterministic finite crew frames at phone and desktop sizes through separation and entry', () => {
    const profile = P.returnProfile();
    for (const width of [300, 1000]) for (const time of [0, profile.summary.separationTime - 0.001, profile.summary.separationTime, profile.summary.duration]) {
      const sample = P.returnSample(profile, time), before = JSON.stringify(sample);
      const firstContext = context(), secondContext = context();
      const first = P.drawReturnScene(firstContext.ctx, width, 400, sample, profile, { view: 'crew' });
      const second = P.drawReturnScene(secondContext.ctx, width, 400, sample, profile, { view: 'crew' });
      expect(first).toEqual(second); expect(first.view).toBe('crew');
      expect(first.angularRadius).toBe(sample.view.angRadiusDeg);
      expect(first.crew.fieldDegrees).toBe(80); expect(first.crew.angularRadius).toBe(sample.view.angRadiusDeg);
      expect(first.cmOnly).toBe(time >= profile.summary.separationTime);
      expect(first.plumeVisible).toBe(false);
      expect(firstContext.calls.length).toBeGreaterThan(10);
      expect(JSON.stringify(sample)).toBe(before);
    }
  });
});
