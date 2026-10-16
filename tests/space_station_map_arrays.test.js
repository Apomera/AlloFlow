import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { arrayPose, arrayProjection, lighting, cameraPose } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { arrayPose: issMapArrayPose, arrayProjection: issMapArrayProjection, lighting: issMapLighting, cameraPose: issMapCameraPose };'
)();
const radians = Math.PI / 180;

function expectDirection(actual, expected) {
  expect(actual).toHaveLength(3);
  actual.forEach((component, index) => expect(component).toBeCloseTo(expected[index], 12));
}

function solarInput(settings) {
  const pose = arrayPose(settings);
  return lighting({ phase: settings.phase, beta: settings.beta, tracking: false, normal: pose.normal });
}

describe('space station map array pointing and physical solar input', () => {
  it('defaults to ideal tracking at the sanitized orbital phase and beta angle', () => {
    const expected = arrayPose({ phase: 35, beta: 20, tracking: true });
    expect(expected.alpha).toBe(35);
    expect(expected.feather).toBe(-20);
    for (const settings of [undefined, null, {}]) expect(arrayPose(settings)).toEqual(expected);
    expect(arrayPose({ phase: 35, beta: 20, alpha: -80, feather: 75 })).toEqual(expected);
    for (const invalid of [NaN, Infinity, -Infinity, 'corrupt', null, '']) {
      expect(arrayPose({ phase: invalid })).toEqual(expected);
      expect(arrayPose({ beta: invalid })).toEqual(expected);
    }
    expect(arrayPose({ beta: -20 }).feather).toBeCloseTo(0, 12);
    expect(arrayPose({ beta: 200 }).feather).toBe(-80);
  });

  it('puts manual array face normals on the expected physical axes', () => {
    const cases = [
      [0, 0, [0, 1, 0]],
      [90, 0, [0, 0, 1]],
      [-90, 0, [0, 0, -1]],
      [180, 0, [0, -1, 0]],
      [0, 90, [-1, 0, 0]],
      [0, -90, [1, 0, 0]],
      [135, -90, [1, 0, 0]]
    ];
    for (const [alpha, feather, expected] of cases) {
      expectDirection(arrayPose({ tracking: false, alpha, feather }).normal, expected);
    }
    const diagonal = arrayPose({ tracking: false, alpha: 45, feather: -30 });
    expectDirection(diagonal.normal, [.5, Math.sqrt(6) / 4, Math.sqrt(6) / 4]);
  });

  it('wraps alpha continuously and clamps feather without inventing additional rotations', () => {
    for (const [input, expected] of [[180, 180], [540, 180], [-180, -180], [-540, -180], [360, 0], [-360, 0], [721.25, 1.25], [-721.25, -1.25]]) {
      const pose = arrayPose({ tracking: false, alpha: input, feather: 25 });
      expect(pose.alpha).toBe(expected);
      expectDirection(pose.normal, arrayPose({ tracking: false, alpha: expected, feather: 25 }).normal);
    }
    for (const [input, expected] of [[-150, -90], [150, 90], [-37, -37], [0, 0], [42, 42]]) {
      const pose = arrayPose({ tracking: false, alpha: 31, feather: input });
      expect(pose.feather).toBe(expected);
      expectDirection(pose.normal, arrayPose({ tracking: false, alpha: 31, feather: expected }).normal);
    }
    expectDirection(
      arrayPose({ tracking: false, alpha: 180 - 1e-7 }).normal,
      arrayPose({ tracking: false, alpha: -180 - 1e-7 }).normal
    );
  });

  it('rejects nonfinite manual settings and leaves caller-owned inputs untouched', () => {
    const parked = arrayPose({ tracking: false, alpha: 0, feather: 0 });
    for (const invalid of [NaN, Infinity, -Infinity, 'corrupt', null, undefined, '']) {
      expect(arrayPose({ tracking: false, alpha: invalid })).toEqual(parked);
      expect(arrayPose({ tracking: false, feather: invalid })).toEqual(parked);
    }
    const settings = Object.freeze({ tracking: false, phase: 70, beta: 55, alpha: 398, feather: -23 });
    const pose = arrayPose(settings);
    expect(pose.alpha).toBe(38);
    expect(pose.feather).toBe(-23);
    expect(settings).toEqual({ tracking: false, phase: 70, beta: 55, alpha: 398, feather: -23 });
    pose.normal[0] = 999;
    expect(Math.hypot(...arrayPose(settings).normal)).toBeCloseTo(1, 12);
  });

  it('keeps the normal unit length throughout the manual pointing envelope', () => {
    for (const alpha of [-180, -135, -90, -17.5, 0, 38.25, 90, 179.99]) {
      for (const feather of [-90, -65, -20, 0, 15.5, 70, 90]) {
        const pose = arrayPose({ tracking: false, alpha, feather });
        expect(Math.hypot(...pose.normal)).toBeCloseTo(1, 12);
        expect(pose.normal.every(Number.isFinite)).toBe(true);
        expect(pose.normal[0]).toBeCloseTo(-Math.sin(feather * radians), 12);
      }
    }
  });

  it('points ideal tracking at the actual Sun direction across phase wraps and beta angles', () => {
    for (const phase of [-450, -180, 0, 35, 90, 180, 270, 359.99, 810]) {
      for (const beta of [0, 20, 60, 80]) {
        const pose = arrayPose({ phase, beta }), state = lighting({ phase, beta });
        expect(pose.alpha).toBeGreaterThanOrEqual(-180);
        expect(pose.alpha).toBeLessThanOrEqual(180);
        expect(pose.feather).toBeCloseTo(-beta, 12);
        expectDirection(pose.normal, state.sun);
        expect(solarInput({ phase, beta }).incidence).toBeCloseTo(1, 12);
      }
    }
  });

  it('produces cosine loss for a manual feather offset and zero input for edge-on or back-facing arrays', () => {
    for (const phase of [0, 35, 90, 270]) {
      for (const beta of [0, 20, 60, 80]) {
        for (const offset of [0, 15, 45, 75]) {
          const state = solarInput({ phase, beta, tracking: false, alpha: phase, feather: -beta + offset });
          expect(state.eclipse).toBe(false);
          expect(state.incidence).toBeCloseTo(Math.cos(offset * radians), 12);
          expect(state.generation).toBeCloseTo(Math.cos(offset * radians), 12);
        }
        const edge = solarInput({ phase, beta, tracking: false, alpha: phase, feather: 90 - beta });
        expect(edge.incidence).toBeCloseTo(0, 12);
        expect(edge.generation).toBeCloseTo(0, 12);
        const back = solarInput({ phase, beta, tracking: false, alpha: phase + 180, feather: beta });
        expect(back.incidence).toBe(0);
        expect(back.generation).toBe(0);
      }
    }
  });

  it('suppresses direct solar generation in Earth shadow while preserving the pointing geometry', () => {
    for (const beta of [0, 20, 60]) {
      for (const tracking of [true, false]) {
        const state = solarInput({ phase: 180, beta, tracking, alpha: 180, feather: -beta });
        expect(state.eclipse).toBe(true);
        expect(state.incidence).toBeCloseTo(1, 12);
        expect(state.generation).toBe(0);
      }
    }
    const unshadowed = solarInput({ phase: 180, beta: 80, tracking: false, alpha: 180, feather: -80 });
    expect(unshadowed.eclipse).toBe(false);
    expect(unshadowed.generation).toBeCloseTo(1, 12);
  });

  it('keeps physical pointing and solar input independent of orbit-camera inspection', () => {
    const settings = Object.freeze({ phase: 35, beta: 20, tracking: false, alpha: 60, feather: -10 });
    const initialPose = arrayPose(settings), initialInput = solarInput(settings);
    let view = cameraPose([8.2, 4.8, 10.4], [0, 0, 1]);
    for (const controls of [{ yaw: 1.2 }, { pitch: -.8 }, { zoom: .35 }, { yaw: -3.1, pitch: 1.1, zoom: 4 }]) {
      view = cameraPose(view.position, view.target, controls);
      expect(arrayPose(settings)).toEqual(initialPose);
      expect(solarInput(settings)).toEqual(initialInput);
    }
    expect(view.position).not.toEqual([8.2, 4.8, 10.4]);
  });
  it('projects the physical panel into a unit Sun-normal plane with area equal to the independent cosine projection', () => {
    function area(points) {
      return Math.abs(points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point[0] * next[1] - next[0] * point[1];
      }, 0)) / 2;
    }
    for (const phase of [0, 35, 90, 180, 270, 359.5]) {
      for (const beta of [0, 20, 80]) {
        for (const [alpha, feather] of [[0, 0], [45, -30], [113, 22], [-160, 75], [phase, -beta], [phase, 90 - beta]]) {
          const settings = Object.freeze({ phase, beta, tracking: false, alpha, feather });
          const projection = arrayProjection(settings);
          const dot = -Math.sin(feather * radians) * Math.sin(beta * radians) +
            Math.cos(feather * radians) * Math.cos(beta * radians) * Math.cos((alpha - phase) * radians);
          const cosine = Math.max(-1, Math.min(1, dot));
          expect(projection.pose).toEqual(arrayPose(settings));
          expectDirection(projection.sun, lighting({ phase, beta }).sun);
          expect(projection.points).toHaveLength(4);
          for (const point of projection.points) {
            expect(point).toHaveLength(2);
            expect(point.every(Number.isFinite)).toBe(true);
          }
          expect(area(projection.points)).toBeCloseTo(Math.abs(cosine), 11);
          expect(projection.silhouette).toBeCloseTo(Math.abs(cosine), 12);
          expect(projection.incidence).toBeCloseTo(Math.max(0, cosine), 12);
          expect(projection.angle).toBeCloseTo(Math.acos(cosine) / radians, 5);
          expect(projection.generation).toBeCloseTo(projection.eclipse ? 0 : Math.max(0, cosine), 12);
        }
      }
    }
  });

  it('distinguishes a full back-facing silhouette from front-face electricity production', () => {
    const settings = { phase: 35, beta: 20, tracking: false, alpha: 215, feather: 20 };
    const projection = arrayProjection(settings);
    expect(projection.eclipse).toBe(false);
    expect(projection.silhouette).toBeCloseTo(1, 12);
    expect(projection.angle).toBeCloseTo(180, 5);
    expect(projection.incidence).toBe(0);
    expect(projection.generation).toBe(0);
    const edge = arrayProjection({ phase: 35, beta: 20, tracking: false, alpha: 35, feather: 70 });
    expect(edge.silhouette).toBeCloseTo(0, 12);
    expect(edge.angle).toBeCloseTo(90, 10);
    expect(edge.incidence).toBeCloseTo(0, 12);
    expect(edge.generation).toBeCloseTo(0, 12);
  });

  it('retains the projected panel geometry in eclipse and returns fresh mutable output arrays', () => {
    const settings = Object.freeze({ phase: 180, beta: 20, tracking: false, alpha: 180, feather: -20 });
    const projection = arrayProjection(settings);
    expect(projection.eclipse).toBe(true);
    expect(projection.silhouette).toBeCloseTo(1, 12);
    expect(projection.incidence).toBeCloseTo(1, 12);
    expect(projection.angle).toBeCloseTo(0, 5);
    expect(projection.generation).toBe(0);
    const expected = arrayProjection(settings);
    projection.points[0][0] = 999;
    projection.pose.normal[0] = 999;
    projection.sun[0] = 999;
    expect(arrayProjection(settings)).toEqual(expected);
    expect(settings).toEqual({ phase: 180, beta: 20, tracking: false, alpha: 180, feather: -20 });
    expect(arrayProjection()).toEqual(arrayProjection({ phase: 35, beta: 20 }));
    for (const point of arrayProjection({ phase: Infinity, beta: NaN, tracking: false, alpha: NaN, feather: Infinity }).points) {
      expect(point.every(Number.isFinite)).toBe(true);
    }
  });

  it('keeps a held panel projection continuous through the old basis threshold and orbital phase seam', () => {
    const threshold = Math.acos(.95) / radians;
    const held = { beta: 0, tracking: false, alpha: 47, feather: -28 };
    for (const phase of [threshold, 360 - threshold, 0, 360]) {
      const before = arrayProjection({ ...held, phase: phase - 1e-5 });
      const after = arrayProjection({ ...held, phase: phase + 1e-5 });
      expect(before.points).toHaveLength(4);
      expect(after.points).toHaveLength(4);
      for (let corner = 0; corner < 4; corner++) {
        for (let axis = 0; axis < 2; axis++) {
          expect(Number.isFinite(before.points[corner][axis])).toBe(true);
          expect(Number.isFinite(after.points[corner][axis])).toBe(true);
          expect(Math.abs(after.points[corner][axis] - before.points[corner][axis])).toBeLessThan(1e-5);
        }
      }
    }
  });

});
