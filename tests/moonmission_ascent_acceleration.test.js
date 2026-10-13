import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;

beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function sample(overrides = {}) {
  return { altitude: 0, mass: 4890, pitch: 0, radialSpeed: 0,
    tangentialSpeed: 0, engineOn: true, thrust: 15568.77565341175, ...overrides };
}
function point(vector, x, y, digits = 11) {
  expect(vector.x).toBeCloseTo(x, digits);
  expect(vector.y).toBeCloseTo(y, digits);
}
function finiteNumbers(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteNumbers);
}
function inertialVelocity(row) {
  // Independently transform the measured velocity into the launch Cartesian
  // frame. The local radial and tangent bases turn as the craft travels.
  const sin = Math.sin(row.angle), cos = Math.cos(row.angle);
  return { x: row.radialSpeed * sin + row.tangentialSpeed * cos,
    y: row.radialSpeed * cos - row.tangentialSpeed * sin };
}

describe('Moon Mission local ascent acceleration and rotating speed components', () => {
  it('shows engine, lunar gravity and net acceleration separately at ignition', () => {
    const row = P.ascentProfile().events.liftoff;
    const model = P.ascentAcceleration(row);
    expect(model.radius).toBe(1737400);
    expect(model.engineVisible).toBe(true);
    expect(model.engineAcceleration).toBeCloseTo(15568.77565341175 / 4890, 11);
    expect(model.gravityMagnitude).toBeCloseTo(1.62490443, 7);
    expect(model.properLoadG).toBeCloseTo(model.engineAcceleration / 9.80665, 12);
    point(model.engine, 0, model.engineAcceleration);
    point(model.gravity, 0, -1.62490443, 7);
    point(model.net, 0, model.engineAcceleration - model.gravityMagnitude);
    expect(model.engine.forceMagnitude).toBeCloseTo(row.thrust, 9);
    expect(model.gravity.forceMagnitude).toBeCloseTo(row.mass * model.gravityMagnitude, 9);
    expect(model.net.forceMagnitude).toBeCloseTo(row.mass * model.net.magnitude, 9);
    expect(model.radialSpeedRate).toBeCloseTo(model.net.y, 12);
    expect(model.tangentialSpeedRate).toBe(0);
    expect(model.curvatureRadial).toBe(0);
    expect(model.curvatureTangential).toBe(0);
    finiteNumbers(model);
  });

  it('retains signed pitch and resolves engine acceleration through every quadrant', () => {
    for (const [pitch, x, y] of [
      [0, 0, 5], [Math.PI / 2, 5, 0], [Math.PI, 0, -5],
      [-Math.PI / 2, -5, 0], [Math.asin(0.6), 3, 4],
      [Math.PI + Math.asin(0.6), -3, -4],
    ]) {
      const model = P.ascentAcceleration(sample({ mass: 2000, thrust: 10000, pitch }));
      point(model.engine, x, y);
      point(model.net, x, y - model.gravityMagnitude);
      expect(model.engine.magnitude).toBeCloseTo(5, 12);
      expect(model.engine.forceMagnitude).toBe(10000);
      expect(model.net.magnitude).toBeCloseTo(Math.hypot(x, y - model.gravityMagnitude), 12);
    }
  });

  it('obeys inverse-square gravity and separates mass-dependent acceleration from force', () => {
    const baseline = P.ascentAcceleration(sample());
    const lighter = P.ascentAcceleration(sample({ mass: 2445 }));
    const twiceRadius = P.ascentAcceleration(sample({ altitude: 1737400 }));
    expect(lighter.engineAcceleration).toBeCloseTo(2 * baseline.engineAcceleration, 12);
    expect(lighter.engine.forceMagnitude).toBe(baseline.engine.forceMagnitude);
    expect(lighter.gravityMagnitude).toBe(baseline.gravityMagnitude);
    expect(lighter.gravity.forceMagnitude).toBe(baseline.gravity.forceMagnitude / 2);
    expect(twiceRadius.radius).toBe(2 * baseline.radius);
    expect(twiceRadius.gravityMagnitude).toBe(baseline.gravityMagnitude / 4);
    expect(twiceRadius.gravity.forceMagnitude).toBe(baseline.gravity.forceMagnitude / 4);
    expect(twiceRadius.engineAcceleration).toBe(baseline.engineAcceleration);
    expect(lighter.properLoadG).toBe(2 * baseline.properLoadG);
  });

  it('removes engine acceleration at cutoff and requires an explicitly firing engine', () => {
    const profile = P.ascentProfile(), before = P.ascentSample(profile, profile.summary.duration - 0.001);
    expect(P.ascentAcceleration(before).engineVisible).toBe(true);
    const cutoff = P.ascentAcceleration(profile.events.cutoff);
    expect(cutoff.engineVisible).toBe(false);
    expect(cutoff.engineAcceleration).toBe(0);
    expect(cutoff.properLoadG).toBe(0);
    point(cutoff.engine, 0, 0);
    point(cutoff.net, 0, -cutoff.gravityMagnitude);
    expect(cutoff.gravityMagnitude).toBeGreaterThan(1.5);
    for (const engineOn of [false, undefined, null, 0, 1, 'true']) {
      const model = P.ascentAcceleration(sample({ engineOn }));
      expect(model.engineVisible).toBe(false);
      expect(model.engineAcceleration).toBe(0);
      expect(model.engine.forceMagnitude).toBe(0);
      expect(model.properLoadG).toBe(0);
      point(model.net, 0, -model.gravityMagnitude);
    }
    const empty = P.ascentAcceleration(sample({ engineOn: true, thrust: 0 }));
    expect(empty.engineVisible).toBe(false);
    expect(empty.engineAcceleration).toBe(0);
  });

  it('keeps inward gravity during circular coast while both measured speed rates are zero', () => {
    const radius = 1737400 + 110000;
    const circularSpeed = Math.sqrt(4.9048695e12 / radius);
    for (const direction of [-1, 1]) {
      const model = P.ascentAcceleration(sample({ altitude: 110000, radialSpeed: 0,
        tangentialSpeed: direction * circularSpeed, engineOn: false }));
      expect(model.gravityMagnitude).toBeGreaterThan(1.4);
      point(model.net, 0, -model.gravityMagnitude);
      expect(model.net.magnitude).toBeCloseTo(model.gravityMagnitude, 12);
      expect(model.radialSpeedRate).toBeCloseTo(0, 12);
      expect(model.tangentialSpeedRate).toBe(0);
      expect(model.curvatureRadial).toBeCloseTo(model.gravityMagnitude, 12);
      expect(model.curvatureTangential).toBeCloseTo(0, 12);
      expect(model.basisRotationRate).toBeCloseTo(direction * circularSpeed / radius, 12);
      expect(model.properLoadG).toBe(0);
    }
  });

  it('matches actual Cartesian velocity differences and rotating local speed differences', () => {
    const profile = P.ascentProfile();
    for (const time of [60, 180, 300]) {
      const row = P.ascentSample(profile, time);
      const before = P.ascentSample(profile, time - 0.25);
      const after = P.ascentSample(profile, time + 0.25);
      const vb = inertialVelocity(before), va = inertialVelocity(after);
      const dx = (va.x - vb.x) / 0.5, dy = (va.y - vb.y) / 0.5;
      const sin = Math.sin(row.angle), cos = Math.cos(row.angle);
      const measuredTangent = dx * cos - dy * sin;
      const measuredRadial = dx * sin + dy * cos;
      const model = P.ascentAcceleration(row);
      expect(Math.abs(measuredTangent - model.net.x)).toBeLessThan(0.0005);
      expect(Math.abs(measuredRadial - model.net.y)).toBeLessThan(0.0005);
      expect(Math.abs((after.radialSpeed - before.radialSpeed) / 0.5 -
        model.radialSpeedRate)).toBeLessThan(0.0005);
      expect(Math.abs((after.tangentialSpeed - before.tangentialSpeed) / 0.5 -
        model.tangentialSpeedRate)).toBeLessThan(0.0005);
      expect(model.curvatureRadial).toBeGreaterThan(0);
    }
  });

  it('gives signed rotating-basis corrections without drawing them as physical forces', () => {
    for (const radialSpeed of [-40, 40]) for (const tangentialSpeed of [-1000, 1000]) {
      const model = P.ascentAcceleration(sample({ altitude: 262600, radialSpeed,
        tangentialSpeed, engineOn: false }));
      expect(model.radius).toBe(2000000);
      expect(model.curvatureRadial).toBe(0.5);
      expect(model.curvatureTangential).toBe(radialSpeed * tangentialSpeed / 2000000);
      expect(model.basisRotationRate).toBe(tangentialSpeed / 2000000);
      expect(model.radialSpeedRate).toBeCloseTo(0.5 - model.gravityMagnitude, 12);
      expect(model.tangentialSpeedRate).toBe(-model.curvatureTangential);
      point(model.net, 0, -model.gravityMagnitude);
      const geometry = P.ascentAccelerationGeometry(sample({ altitude: 262600,
        radialSpeed, tangentialSpeed, engineOn: false }));
      expect(Object.keys(geometry.vectors).sort()).toEqual(['engine', 'gravity', 'net']);
      point(geometry.vectors.net, 0, -model.gravityMagnitude);
    }
  });

  it('rejects missing, non-finite or impossible physical inputs without partial geometry', () => {
    for (const invalid of [null, undefined, {}, [], 'sample', 0]) {
      expect(P.ascentAcceleration(invalid)).toBeNull();
      expect(P.ascentAccelerationGeometry(invalid)).toBeNull();
    }
    for (const key of ['altitude', 'mass', 'pitch', 'radialSpeed', 'tangentialSpeed', 'thrust']) {
      for (const value of [undefined, null, NaN, Infinity, -Infinity, '0']) {
        const invalid = sample({ [key]: value });
        expect(P.ascentAcceleration(invalid)).toBeNull();
        expect(P.ascentAccelerationGeometry(invalid)).toBeNull();
      }
    }
    for (const invalid of [sample({ mass: 0 }), sample({ mass: -1 }),
      sample({ altitude: -1737400 }), sample({ altitude: -2000000 }),
      sample({ thrust: -0.001 })]) {
      expect(P.ascentAcceleration(invalid)).toBeNull();
      expect(P.ascentAccelerationGeometry(invalid)).toBeNull();
    }
    // Below the nominal surface remains a valid radius for the mathematical
    // diagnostic; invalid physical radius is the actual singularity.
    expect(P.ascentAcceleration(sample({ altitude: -10 }))).not.toBeNull();
    const oversized = sample({ mass: 1, thrust: 1e308 });
    expect(P.ascentAcceleration(oversized)).not.toBeNull();
    expect(P.ascentAccelerationGeometry(oversized)).toBeNull();
  });

  it('reads only current physical measurements and preserves frozen caller data', () => {
    const original = sample({ pitch: 0.72, radialSpeed: 30, tangentialSpeed: 600 });
    const expected = P.ascentAcceleration(original);
    const poisoned = { ...original };
    for (const key of ['time', 'profile', 'summary', 'samples', 'future', 'speed',
      'gravity', 'loadG', 'angle', 'downrange', 'acceleration']) {
      Object.defineProperty(poisoned, key, { enumerable: true,
        get() { throw new Error('Unrelated or future metadata was read: ' + key); } });
    }
    Object.freeze(poisoned);
    expect(P.ascentAcceleration(poisoned)).toEqual(expected);
    expect(P.ascentAccelerationGeometry(poisoned).model).toEqual(expected);
    expect(P.ascentAcceleration(original)).toEqual(expected);
    for (const key of Object.keys(original)) expect(poisoned[key]).toBe(original[key]);
    expect(expected).not.toBe(original);
    expect(expected.engine).not.toBe(original);
    expect(expected.gravity).not.toBe(expected.engine);
    expect(expected.net).not.toBe(expected.gravity);
  });

  it('projects all accelerations at the same fixed physical scale across burn and coast', () => {
    const profile = P.ascentProfile();
    for (const row of [profile.events.liftoff, P.ascentSample(profile, 120),
      P.ascentSample(profile, 300), profile.events.cutoff,
      sample({ pitch: -Math.PI / 2, mass: 3000, thrust: 12000 })]) {
      const geometry = P.ascentAccelerationGeometry(row);
      expect(geometry.view).toBe('local-acceleration');
      expect([geometry.width, geometry.height, geometry.cx, geometry.cy, geometry.scale])
        .toEqual([600, 320, 300, 160, 20]);
      expect(geometry.model).toEqual(P.ascentAcceleration(row));
      for (const key of ['engine', 'gravity', 'net']) {
        const arrow = geometry.vectors[key], force = geometry.model[key];
        point(arrow, force.x, force.y);
        expect([arrow.startX, arrow.startY]).toEqual([300, 160]);
        expect(arrow.endX - 300).toBeCloseTo(force.x * 20, 10);
        expect(160 - arrow.endY).toBeCloseTo(force.y * 20, 10);
        expect(Math.hypot(arrow.endX - 300, arrow.endY - 160))
          .toBeCloseTo(force.magnitude * 20, 10);
        expect(arrow.forceMagnitude).toBe(force.forceMagnitude);
        expect(arrow.visible).toBe(force.magnitude > 1e-9);
        expect(arrow.head.length > 0).toBe(arrow.visible);
      }
      finiteNumbers(geometry);
    }
    const zeroEngine = P.ascentAccelerationGeometry(profile.events.cutoff).vectors.engine;
    expect([zeroEngine.endX, zeroEngine.endY, zeroEngine.head]).toEqual([300, 160, '']);
  });
});
