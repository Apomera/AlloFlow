import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
const DEG = Math.PI / 180;

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterAll(() => vi.restoreAllMocks());

// Independently intersect a normalized camera ray with a sphere. The observer
// sits on +Y, forward is +X, and canvas-right is +Z. At the apparent limb the
// quadratic has one repeated, positive root.
function sphereRay(geometry, x, y, sphereAltitude = 0) {
  const observerRadius = (P.entry.radius + geometry.altitude) / (P.entry.radius + sphereAltitude);
  const side = (x - geometry.width / 2) / geometry.focal;
  const down = (y - geometry.eyeY) / geometry.focal;
  const magnitude = Math.hypot(1, down, side);
  const b = -observerRadius * down / magnitude;
  return { discriminant: b * b - (observerRadius * observerRadius - 1), distance: -b };
}

function centerDip(geometry, layer) {
  return Math.atan((P.entryHorizonAt(geometry, geometry.width / 2, layer) - geometry.eyeY) / geometry.focal) / DEG;
}

describe('entry camera spherical horizon', () => {
  it('places the Earth limb on tangent rays, with sky above and surface below', () => {
    for (const altitude of [1000, 122000, 400000]) for (const width of [300, 1100]) {
      const geometry = P.entryHorizonGeometry(altitude, width, 400);
      for (const x of [-10, width / 4, width / 2, width + 10]) {
        const y = P.entryHorizonAt(geometry, x);
        const tangent = sphereRay(geometry, x, y);
        expect(tangent.discriminant).toBeCloseTo(0, 12);
        expect(tangent.distance).toBeGreaterThan(0);
        const offset = (y - geometry.eyeY) * 0.001;
        expect(sphereRay(geometry, x, y - offset).discriminant).toBeLessThan(0);
        expect(sphereRay(geometry, x, y + offset).discriminant).toBeGreaterThan(0);
      }
    }
  });

  it('keeps the exact vertical 60 degree field and physical center depression across viewport sizes', () => {
    const altitude = 122000;
    const physicalDip = Math.acos(P.entry.radius / (P.entry.radius + altitude)) / DEG;
    for (const [width, height] of [[300, 400], [1100, 400], [600, 240]]) {
      const geometry = P.entryHorizonGeometry(altitude, width, height);
      const upperAngle = Math.atan(geometry.eyeY / geometry.focal);
      const lowerAngle = Math.atan((height - geometry.eyeY) / geometry.focal);
      expect(geometry.fieldDegrees).toBe(60);
      expect((upperAngle + lowerAngle) / DEG).toBeCloseTo(60, 12);
      expect(geometry.eyeY).toBeCloseTo(height * 0.72, 12);
      expect(centerDip(geometry)).toBeCloseTo(physicalDip, 10);
      expect(geometry.dipDegrees).toBeCloseTo(physicalDip, 10);
      expect(upperAngle).toBeGreaterThan(lowerAngle);
    }
  });

  it('samples a symmetric limb through the center and evaluates the same curve between samples', () => {
    const geometry = P.entryHorizonGeometry(122000, 600, 400);
    expect(geometry.earth).toHaveLength(49);
    expect(geometry.earth[0].x).toBe(-10);
    expect(geometry.earth[48].x).toBe(610);
    expect(geometry.earth[24].x).toBe(300);
    for (let index = 0; index < geometry.earth.length; index++) {
      const point = geometry.earth[index], mirror = geometry.earth[48 - index];
      expect(point.y).toBeCloseTo(mirror.y, 12);
      expect(P.entryHorizonAt(geometry, point.x)).toBeCloseTo(point.y, 12);
      expect(point.y).toBeGreaterThanOrEqual(geometry.earth[24].y);
      expect(sphereRay(geometry, point.x, point.y).discriminant).toBeCloseTo(0, 12);
    }
    for (const x of [0.1, 127.25, 437.5, 599.9]) {
      const y = P.entryHorizonAt(geometry, x);
      expect(sphereRay(geometry, x, y).discriminant).toBeCloseTo(0, 12);
      expect(P.entryHorizonAt(geometry, 600 - x)).toBeCloseTo(y, 12);
    }
  });

  it('raises and flattens the horizon during descent without inventing curvature at sea level', () => {
    const geometries = [122000, 1000, 10, 0].map(altitude => P.entryHorizonGeometry(altitude, 600, 400));
    const centers = geometries.map(geometry => P.entryHorizonAt(geometry, 300));
    const curvatures = geometries.map(geometry => P.entryHorizonAt(geometry, 0) - P.entryHorizonAt(geometry, 300));
    for (let index = 1; index < geometries.length; index++) {
      expect(centers[index]).toBeLessThan(centers[index - 1]);
      expect(curvatures[index]).toBeLessThan(curvatures[index - 1]);
      expect(geometries[index].dipDegrees).toBeLessThan(geometries[index - 1].dipDegrees);
    }
    const ground = geometries[3];
    expect(ground.tangent).toBe(0); expect(ground.dipDegrees).toBe(0);
    for (const point of ground.earth) expect(point.y).toBe(ground.eyeY);
  });

  it('places the illustrative 100 km airglow layer on its own sphere tangent only while above it', () => {
    for (const altitude of [100000.1, 122000, 400000]) {
      const geometry = P.entryHorizonGeometry(altitude, 600, 400), layer = geometry.airglow;
      expect(layer).not.toBeNull(); expect(layer.altitude).toBe(100000);
      expect(layer.points).toHaveLength(49);
      const physicalDip = Math.acos((P.entry.radius + 100000) / (P.entry.radius + altitude)) / DEG;
      expect(layer.dipDegrees).toBeCloseTo(physicalDip, 9);
      expect(centerDip(geometry, 'airglow')).toBeCloseTo(physicalDip, 9);
      for (const point of layer.points) {
        const y = P.entryHorizonAt(geometry, point.x, 'airglow');
        expect(y).toBeCloseTo(point.y, 12);
        expect(y).toBeLessThan(P.entryHorizonAt(geometry, point.x));
        const tangent = sphereRay(geometry, point.x, y, layer.altitude);
        expect(tangent.discriminant).toBeCloseTo(0, 12);
        expect(tangent.distance).toBeGreaterThan(0);
        const offset = (y - geometry.eyeY) * 0.001;
        expect(sphereRay(geometry, point.x, y - offset, layer.altitude).discriminant).toBeLessThan(0);
        expect(sphereRay(geometry, point.x, y + offset, layer.altitude).discriminant).toBeGreaterThan(0);
      }
    }
  });

  it('removes the airglow limb at and below its shell and approaches the local horizontal continuously', () => {
    for (const altitude of [0, 3000, 99999.999, 100000]) {
      const geometry = P.entryHorizonGeometry(altitude, 300, 400);
      expect(geometry.airglow).toBeNull();
      expect(P.entryHorizonAt(geometry, 0, 'airglow')).toBeNull();
      expect(P.entryHorizonAt(geometry, 150, 'airglow')).toBeNull();
      for (const point of geometry.earth) expect(Number.isFinite(point.y)).toBe(true);
    }
    const justAbove = P.entryHorizonGeometry(100000.001, 300, 400);
    expect(P.entryHorizonAt(justAbove, 150, 'airglow') - justAbove.eyeY).toBeGreaterThan(0);
    expect(P.entryHorizonAt(justAbove, 150, 'airglow') - justAbove.eyeY).toBeLessThan(0.01);
  });

  it('uses measured entry and skip-out altitudes while leaving profiles and samples unchanged', () => {
    const profiles = [P.entryProfile(-6.5), P.entryProfile(-2)];
    expect(profiles[0].events.splash).not.toBeNull();
    expect(profiles[1].events.skip).not.toBeNull();
    for (const profile of profiles) {
      const receipt = JSON.stringify({ summary: profile.summary, events: profile.events, first: profile.samples[0], last: profile.samples[profile.samples.length - 1] });
      for (const time of [0, profile.summary.peakHeatTime, profile.summary.duration]) {
        const sample = P.entrySample(profile, time), before = JSON.stringify(sample);
        const geometry = P.entryHorizonGeometry(sample.altitude, 600, 400);
        expect(geometry.altitude).toBe(sample.altitude);
        expect(centerDip(geometry)).toBeCloseTo(Math.acos(P.entry.radius / (P.entry.radius + sample.altitude)) / DEG, 9);
        expect(JSON.stringify(sample)).toBe(before);
        for (const point of geometry.earth) expect(sphereRay(geometry, point.x, point.y).discriminant).toBeCloseTo(0, 12);
      }
      expect(JSON.stringify({ summary: profile.summary, events: profile.events, first: profile.samples[0], last: profile.samples[profile.samples.length - 1] })).toBe(receipt);
    }
  });

  it('normalizes malformed inputs while preserving valid finite altitude and viewport sizes', () => {
    for (const [altitude, width, height] of [[NaN, NaN, NaN], [Infinity, Infinity, -Infinity], [-10, -1, 0], [1e30, 1e30, 1e30]]) {
      const geometry = P.entryHorizonGeometry(altitude, width, height);
      for (const key of ['width', 'height', 'eyeY', 'focal', 'altitude', 'dipDegrees', 'tangent']) expect(Number.isFinite(geometry[key])).toBe(true);
      expect(geometry.width).toBeGreaterThan(0); expect(geometry.height).toBeGreaterThan(0);
      expect(geometry.altitude).toBeGreaterThanOrEqual(0);
      expect(geometry.width).toBe(Number.isFinite(width) ? Math.max(1, width) : 500);
      expect(geometry.height).toBe(Number.isFinite(height) ? Math.max(1, height) : 320);
      expect(geometry.altitude).toBe(Number.isFinite(altitude) ? Math.max(0, altitude) : 0);
      expect(geometry.focal).toBeGreaterThan(0); expect(geometry.earth).toHaveLength(49);
      for (const point of [...geometry.earth, ...(geometry.airglow ? geometry.airglow.points : [])]) {
        expect(Number.isFinite(point.x)).toBe(true); expect(Number.isFinite(point.y)).toBe(true);
      }
    }
  });
});
