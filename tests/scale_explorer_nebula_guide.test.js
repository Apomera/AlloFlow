import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_GUIDE_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.nebulaGuideChecks = { nebulaCourseGuide, nebulaChartCourse, nebulaPose, nebulaBearing, nebulaPassagePose };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { nebulaCourseGuide: guide, nebulaChartCourse: course, nebulaPose: pose,
  nebulaBearing: bearing, nebulaPassagePose: sample } = sandbox.window.nebulaGuideChecks;
const initial = Object.freeze({ x: -2, y: .5, z: 9, heading: 350, pitch: -.2, travel: 18.25 });
const origin = Object.freeze({ x: 0, y: 0, z: 0, heading: 0, pitch: 0, travel: 7 });

function targetRoute(target, extra = {}) {
  return { id: 'chart', level: true, from: { ...origin }, to: { ...origin, ...target }, progress: 0, ...extra };
}

describe('Orion Nebula custom course guidance', () => {
  it('rejects absent or foreign courses and invalid progress', () => {
    for (const invalid of [null, undefined, {}, { id: 'front' }, { id: 'trapezium' },
      { ...targetRoute({ x: 4 }), id: 'constructor' }, { ...targetRoute({ x: 4 }), id: 'toString' }]) {
      expect(guide(invalid, initial)).toBeNull();
    }
    for (const progress of [NaN, Infinity, -Infinity, '0.5', null, undefined, true, 1n]) {
      expect(guide(targetRoute({ x: 4 }, { progress }), initial)).toBeNull();
    }
  });

  it('requires finite numeric pose fields in both route endpoints', () => {
    for (const endpoint of ['from', 'to']) {
      for (const invalid of [null, undefined, {}, []]) {
        expect(guide({ ...targetRoute({ x: 4 }), [endpoint]: invalid }, initial)).toBeNull();
      }
      for (const field of ['x', 'y', 'z', 'heading', 'pitch']) {
        for (const invalid of [NaN, Infinity, -Infinity, '2', null, undefined, true, 2n]) {
          const route = targetRoute({ x: 4 });
          route[endpoint] = { ...route[endpoint], [field]: invalid };
          expect(guide(route, initial)).toBeNull();
        }
      }
    }
  });

  it('normalizes valid bounds and invalid current views without changing route data', () => {
    const route = targetRoute({ x: 99, y: -99, z: 99, heading: -370, pitch: 99, travel: 2e6 });
    const before = JSON.stringify(route);
    for (const current of [null, {}, { ...initial, x: Infinity }]) {
      const result = guide(route, current), normalized = pose(current), target = pose(route.to);
      expect(result.target).toEqual(target);
      expect(result.target).toMatchObject({ x: 16.8, y: -16.8, z: 16.8, heading: 350, pitch: 1.2, travel: 1e6 });
      expect(result).toMatchObject(bearing(normalized, [target.x, target.y, target.z]));
    }
    expect(JSON.stringify(route)).toBe(before);
  });

  it('keeps the active route target at its captured height as the camera and selection change', () => {
    const route = course(initial, { x: 4.25, z: -6.5 });
    route.selection = { x: -12, z: 12 };
    const fixed = { ...route.to };
    for (const y of [-16.8, -6, initial.y, 10, 16.8]) {
      const current = { ...initial, x: 3, y, z: 2 }, result = guide(route, current);
      expect(result.target).toEqual(fixed);
      expect(result.target.y).toBe(initial.y);
      expect(result.distance).toBeCloseTo(Math.hypot(fixed.x - current.x, fixed.y - y, fixed.z - current.z), 10);
    }
    route.selection.x = 12;
    route.selection.z = -12;
    expect(guide(route, initial).target).toEqual(fixed);
  });

  it('reports moving, paused, and arrived from course state rather than camera distance', () => {
    const route = course(initial, { x: 4.25, z: -6.5 });
    expect(guide(route, initial).state).toBe('moving');
    expect(guide({ ...route, paused: true, progress: .4 }, sample(route, .4)).state).toBe('paused');
    expect(guide({ ...route, paused: false, progress: .4 }, sample(route, .4)).state).toBe('moving');
    expect(guide({ ...route, progress: 1 }, route.to).state).toBe('arrived');
    expect(guide({ ...route, paused: true, progress: 1 }, initial).state).toBe('arrived');
    expect(guide({ ...route, progress: 2 }, initial).state).toBe('arrived');
    expect(guide({ ...route, progress: .999 }, route.to)).toMatchObject({ state: 'moving', nearby: true });
    expect(guide({ ...route, paused: true, progress: .999 }, route.to)).toMatchObject({ state: 'paused', nearby: true });
  });

  it('marks only distances below 0.025 light-years as nearby without premature arrival', () => {
    const route = targetRoute({ x: 0, y: 0, z: 0 });
    for (const [x, nearby] of [[0, true], [.01, true], [.0249, true], [.025, false], [.0251, false], [1, false]]) {
      const result = guide(route, { ...origin, x });
      expect(result.nearby).toBe(nearby);
      expect(result.state).toBe('moving');
      expect(result.distance).toBeCloseTo(x, 10);
      for (const field of ['distance', 'heading', 'pitch', 'turn', 'tilt']) expect(Number.isFinite(result[field])).toBe(true);
    }
    const coincident = guide(route, { ...origin, heading: 123, pitch: -.4 });
    expect(coincident).toMatchObject({ distance: 0, turn: 0, tilt: 0, aligned: true, nearby: true, behind: false });
  });

  it('identifies targets behind the camera for cardinal headings and pitched views', () => {
    for (const [heading, ahead, behind] of [
      [0, { z: -4 }, { z: 4 }], [90, { x: 4 }, { x: -4 }],
      [180, { z: 4 }, { z: -4 }], [270, { x: -4 }, { x: 4 }]
    ]) {
      const current = { ...origin, heading };
      expect(guide(targetRoute(ahead), current).behind).toBe(false);
      expect(guide(targetRoute(behind), current).behind).toBe(true);
    }
    expect(guide(targetRoute({ y: -10, z: -1 }), { ...origin, pitch: 1 }).behind).toBe(true);
    expect(guide(targetRoute({ y: 10, z: 1 }), { ...origin, pitch: 1 }).behind).toBe(false);
    expect(guide(targetRoute({ y: 10, z: -1 }), { ...origin, pitch: -1 }).behind).toBe(true);
    expect(guide(targetRoute({ y: -10, z: 1 }), { ...origin, pitch: -1 }).behind).toBe(false);
  });

  it('uses the short left or right turn across north and reports vertical tilt', () => {
    for (const [cameraHeading, targetHeading, expectedTurn] of [[350, 10, 20], [10, 350, -20]]) {
      const radians = targetHeading * Math.PI / 180;
      const route = targetRoute({ x: Math.sin(radians) * 4, z: -Math.cos(radians) * 4 });
      const result = guide(route, { ...origin, heading: cameraHeading });
      expect(result.heading).toBeCloseTo(targetHeading, 10);
      expect(result.turn).toBeCloseTo(expectedTurn, 10);
      expect(result.behind).toBe(false);
    }
    const raised = guide(targetRoute({ y: 3, z: -4 }), { ...origin, pitch: -.2 });
    expect(raised.distance).toBeCloseTo(5, 10);
    expect(raised.pitch).toBeCloseTo(Math.atan2(3, 4), 10);
    expect(raised.tilt).toBeCloseTo(Math.atan2(3, 4) + .2, 10);
    expect(raised.aligned).toBe(false);
    const lowered = guide(targetRoute({ y: -3, z: -4 }), { ...origin, pitch: .2 });
    expect(lowered.tilt).toBeCloseTo(-Math.atan2(3, 4) - .2, 10);
  });

  it('matches course geometry at both endpoints and during travel', () => {
    const route = course(initial, { x: 4.25, z: -6.5 });
    const start = guide(route, sample(route, 0));
    expect(start.distance).toBeCloseTo(Math.hypot(route.to.x - route.from.x, route.to.z - route.from.z), 10);
    let previous = start.distance;
    for (let index = 1; index <= 100; index++) {
      const progress = index / 100, current = sample(route, progress);
      const result = guide({ ...route, progress }, current);
      expect(result.distance).toBeLessThanOrEqual(previous + 1e-9);
      expect(result.distance).toBeCloseTo(Math.hypot(route.to.x - current.x, route.to.y - current.y, route.to.z - current.z), 10);
      expect(result.target.y).toBe(initial.y);
      previous = result.distance;
    }
    expect(guide({ ...route, progress: 1 }, sample(route, 1))).toMatchObject({ state: 'arrived', distance: 0, nearby: true, behind: false });
  });

  it('returns independent guides and target objects without mutating poses or courses', () => {
    const mutable = course(initial, { x: 4.25, z: -6.5 });
    const route = Object.freeze({ ...mutable, from: Object.freeze(mutable.from), to: Object.freeze(mutable.to) });
    const before = JSON.stringify(route), current = Object.freeze({ ...initial, y: -3 });
    const first = guide(route, current), saved = JSON.stringify(first), second = guide(route, current);
    expect(second).toEqual(first);
    expect(second).not.toBe(first);
    expect(second.target).not.toBe(first.target);
    expect(first.target).not.toBe(route.to);
    guide(route, { ...current, x: 10 });
    expect(JSON.stringify(first)).toBe(saved);
    first.target.x = 16;
    first.distance = 999;
    expect(guide(route, current)).toEqual(second);
    expect(JSON.stringify(route)).toBe(before);
    expect(current).toEqual({ ...initial, y: -3 });
    expect(initial).toEqual({ x: -2, y: .5, z: 9, heading: 350, pitch: -.2, travel: 18.25 });
  });

  it('resumes chart orientation without a snap while retaining original positions and the shortest turn', () => {
    const radians = 5 * Math.PI / 180;
    const base = course(initial, { x: initial.x + Math.sin(radians) * 8, z: initial.z - Math.cos(radians) * 8 });
    const startProgress = .4, resumed = Object.freeze({ ...base,
      from: Object.freeze(base.from), to: Object.freeze(base.to),
      orientation: Object.freeze({ heading: 355, pitch: .45, progress: startProgress }) });
    const before = JSON.stringify(resumed), originalStart = sample(base, startProgress), start = sample(resumed, startProgress);
    for (const key of ['x', 'y', 'z', 'travel']) expect(start[key]).toBe(originalStart[key]);
    expect(start.heading).toBe(355);
    expect(start.pitch).toBe(.45);
    const middle = sample(resumed, startProgress + (1 - startProgress) / 2);
    expect(Math.abs(((middle.heading + 540) % 360) - 180)).toBeLessThan(1e-9);
    expect(middle.pitch).toBeCloseTo(.225, 10);
    let previousHeading = start.heading;
    for (let index = 0; index <= 100; index++) {
      const progress = startProgress + (1 - startProgress) * index / 100;
      const current = sample(resumed, progress), original = sample(base, progress);
      for (const key of ['x', 'y', 'z', 'travel']) expect(current[key]).toBe(original[key]);
      const turn = ((current.heading - previousHeading + 540) % 360) - 180;
      expect(turn).toBeGreaterThanOrEqual(-1e-9);
      expect(Math.abs(((current.heading - 355 + 540) % 360) - 180)).toBeLessThanOrEqual(10 + 1e-9);
      previousHeading = current.heading;
    }
    const firstStep = sample(resumed, startProgress + (1 - startProgress) * .01);
    expect(Math.abs(((firstStep.heading - start.heading + 540) % 360) - 180)).toBeLessThan(.001);
    expect(Math.abs(firstStep.pitch - start.pitch)).toBeLessThan(.0001);
    expect(sample(resumed, 1)).toEqual(base.to);
    expect(JSON.stringify(resumed)).toBe(before);
  });

  it('applies a zero-progress orientation override at the initial pose and sanitizes its angles', () => {
    const base = course({ ...initial, heading: 55 }, { x: 1, z: 7 });
    const orientation = Object.freeze({ heading: -370, pitch: 99, progress: 0 });
    const resumed = { ...base, orientation }, first = sample(resumed, 0), original = sample(base, 0);
    for (const key of ['x', 'y', 'z', 'travel']) expect(first[key]).toBe(original[key]);
    expect(first.heading).toBe(350);
    expect(first.pitch).toBe(1.2);
    expect(first).not.toBe(base.from);
    const middle = sample(resumed, .5);
    const shortTurn = ((base.to.heading - 350 + 540) % 360) - 180;
    expect(middle.heading).toBeCloseTo((350 + shortTurn / 2 + 360) % 360, 10);
    expect(middle.pitch).toBeCloseTo(.6, 10);
    for (const key of ['x', 'y', 'z', 'travel']) expect(middle[key]).toBe(sample(base, .5)[key]);
    expect(sample(resumed, 1)).toEqual(base.to);
    expect(orientation).toEqual({ heading: -370, pitch: 99, progress: 0 });
    expect(base.from.heading).toBe(55);
    expect(base.from.pitch).toBe(initial.pitch);
  });

  it('ignores invalid or foreign orientation overrides and leaves earlier route samples unchanged', () => {
    const base = course(initial, { x: 4.25, z: -6.5 });
    const valid = { heading: 355, pitch: .45, progress: .4 };
    const invalid = [null, undefined, {}, { heading: 355, pitch: .45 }, { heading: 355, progress: .4 },
      { pitch: .45, progress: .4 }, { ...valid, progress: -1 }, { ...valid, progress: 1 }, { ...valid, progress: 2 }];
    for (const field of ['heading', 'pitch', 'progress']) {
      for (const value of [NaN, Infinity, -Infinity, '0.4', null, undefined, true, 1n]) invalid.push({ ...valid, [field]: value });
    }
    for (const orientation of invalid) {
      for (const progress of [0, .1, .4, .7, 1]) {
        expect(sample({ ...base, orientation }, progress)).toEqual(sample(base, progress));
      }
    }
    for (const route of [{ ...base, id: 'front' }, { ...base, id: 'cavity' },
      { ...base, level: false }, { ...base, level: undefined }, { ...base, level: 'true' }]) {
      for (const progress of [0, .1, .4, .7, 1]) {
        expect(sample({ ...route, orientation: valid }, progress)).toEqual(sample(route, progress));
      }
    }
    const resumed = { ...base, orientation: valid };
    for (const progress of [0, .001, .1, .25, .399999]) expect(sample(resumed, progress)).toEqual(sample(base, progress));
    expect(sample(resumed, 1)).toEqual(base.to);
    expect(resumed.to).toBe(base.to);
  });
});
