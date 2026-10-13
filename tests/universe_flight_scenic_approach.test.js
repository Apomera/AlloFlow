import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Reuse the established real-scene navigation lifecycle and WebGL stub. The
// fixture header contains hooks and advance(), before its first describe().
const navigationSource = readFileSync('tests/universe_flight_navigation.test.js', 'utf8');
const fixtureEnd = navigationSource.indexOf('\ndescribe(');
if (fixtureEnd < 0) throw new Error('Navigation lifecycle fixture unavailable');
const fixtureSource = navigationSource.slice(0, fixtureEnd).replace(/^import[^\n]*\n/gm, '');
const fixture = new Function('afterEach', 'beforeAll', 'beforeEach', 'vi', 'readFileSync', fixtureSource + `
  return { get flight(){return flight;}, get scene(){return scene;}, get telemetry(){return telemetry;},
    get canvas(){return sceneCanvas;}, get frames(){return frames;}, get pauses(){return pauses;},
    get pauseEvents(){return pauseEvents;}, get createdTextures(){return createdTextures;},
    get deletedTextures(){return deletedTextures;}, get textureUploads(){return textureUploads;}, advance };
`)(afterEach, beforeAll, beforeEach, vi, readFileSync);

const REGIONS = {
  neighborhood: { origin: [0, 0, 0], boundary: 100000, count: 19203, hash: 'f0933322797366fbee8bbdc9ce8d2263700b1c07a71caa1bcfa1224d68edc2a3' },
  galaxy: { origin: [0, 0, -95000], boundary: 3000000, count: 36400, hash: 'f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab' },
  cosmic: { origin: [0, 0, -2200000], boundary: 120000000, count: 41470, hash: '156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85' },
};
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const curvePoint = (plan, u) => plan.start.map((v, i) => (1 - u) ** 2 * v + 2 * (1 - u) * u * plan.control[i] + u ** 2 * plan.end[i]);
const normalizedYaw = yaw => Math.atan2(Math.sin(yaw), Math.cos(yaw));
const clone = value => structuredClone(value);
function finish(maximum = 600) {
  fixture.advance();
  for (let step = 0; fixture.telemetry.running && step < maximum; step++) fixture.advance(50);
  expect(fixture.telemetry.running).toBe(false);
}
function expectAtomic(action, expected = false) {
  const before = fixture.scene.snapshot(), published = clone(fixture.telemetry), frameCount = fixture.frames.size, pauses = clone(fixture.pauseEvents);
  expect(action()).toBe(expected);
  expect(fixture.scene.snapshot()).toEqual(before);
  expect(fixture.telemetry).toEqual(published);
  expect(fixture.frames.size).toBe(frameCount);
  expect(fixture.pauseEvents).toEqual(pauses);
}

describe('Universe scenic approach geometry', () => {
  it('builds a deterministic independent bowed curve without changing its inputs', () => {
    const start = [0, 0, 0], center = [12, 4, 20], before = [start.slice(), center.slice()];
    const args = [start, center, 2, 1, 4, 100];
    const plan = fixture.flight.math.scenicApproachPlan(...args);
    expect(plan.path).toBe('scenic');
    expect(plan.bowLy).toBeGreaterThan(0);
    expect(plan.pathLengthLy).toBeGreaterThan(distance(plan.start, plan.end));
    expect(distance(curvePoint(plan, 0.5), plan.start.map((v, i) => (v + plan.end[i]) / 2))).toBeGreaterThan(0);
    expect(fixture.flight.math.scenicApproachPlan(...args)).toEqual(plan);
    expect([start, center]).toEqual(before);
    plan.start[0] = 99; plan.control[0] = 99; plan.end[0] = 99; plan.samples[0].distanceLy = 99;
    expect(fixture.flight.math.scenicApproachPlan(...args)).not.toEqual(plan);
    expect([start, center]).toEqual(before);
  });

  it('keeps every catalog approach in bounds and outside its exact final standoff', () => {
    let targets = 0;
    for (const [region, spec] of Object.entries(REGIONS)) {
      for (const target of fixture.flight.landmarks(region)) {
        targets++;
        for (const scale of [1, 2, 4]) {
          const plan = fixture.flight.math.scenicApproachPlan(spec.origin, target.position, target.arrivalRadiusLy, scale, 100, spec.boundary);
          expect(plan).not.toBeNull();
          expect(plan.start).toEqual(spec.origin);
          expect(plan.arrivalRadiusLy).toBe(target.arrivalRadiusLy * scale);
          const direct = fixture.flight.math.approachPlan(distance(spec.origin, target.position), target.arrivalRadiusLy, scale, 100);
          if (direct.remainingLy === 0) {
            expect(plan.end).toEqual(spec.origin); expect(plan.pathLengthLy).toBe(0);
            continue;
          }
          expect(distance(plan.end, target.position)).toBeCloseTo(plan.arrivalRadiusLy, 6);
          const direction = target.position.map((v, i) => (v - spec.origin[i]) / distance(spec.origin, target.position));
          const end = spec.origin.map((v, i) => v + direction[i] * direct.remainingLy);
          expect(distance(plan.end, end)).toBeLessThan(Math.max(1e-9, spec.boundary * 1e-12));
          for (let step = 0; step <= 128; step++) {
            const point = curvePoint(plan, step / 128);
            expect(point.every(Number.isFinite)).toBe(true);
            expect(Math.hypot(...point)).toBeLessThanOrEqual(spec.boundary * (1 + 1e-12));
            expect(distance(point, target.position)).toBeGreaterThanOrEqual(plan.arrivalRadiusLy * (1 - 1e-10));
          }
        }
      }
    }
    expect(targets).toBe(21);
  });

  it('publishes finite ordered cumulative arc samples and a consistent travel estimate', () => {
    const plan = fixture.flight.math.scenicApproachPlan([0, 0, 0], [10, 0, 15], 1, 2, 3, 100);
    expect(plan.samples.length).toBeGreaterThan(2);
    expect(plan.samples[0]).toEqual({ u: 0, distanceLy: 0 });
    expect(plan.samples.at(-1).u).toBe(1);
    expect(plan.samples.at(-1).distanceLy).toBe(plan.pathLengthLy);
    for (let index = 1; index < plan.samples.length; index++) {
      expect(Number.isFinite(plan.samples[index].u)).toBe(true);
      expect(Number.isFinite(plan.samples[index].distanceLy)).toBe(true);
      expect(plan.samples[index].u).toBeGreaterThan(plan.samples[index - 1].u);
      expect(plan.samples[index].distanceLy).toBeGreaterThan(plan.samples[index - 1].distanceLy);
    }
    expect(plan.remainingLy).toBe(plan.pathLengthLy);
    expect(plan.estimatedSeconds).toBe(fixture.flight.math.approachPlan(plan.pathLengthLy + plan.arrivalRadiusLy, plan.arrivalRadiusLy, 1, 3).estimatedSeconds);
  });

  it('shrinks the bow safely near a boundary and treats coincident or in-range starts as zero travel', () => {
    const plan = fixture.flight.math.scenicApproachPlan([100, 0, 0], [99, 0, 0], 0.1, 1, 1, 100);
    expect(plan).not.toBeNull();
    for (let step = 0; step <= 256; step++) expect(Math.hypot(...curvePoint(plan, step / 256))).toBeLessThanOrEqual(100 * (1 + 1e-12));
    for (const start of [[0, 0, 0], [0.5, 0, 0], [1, 0, 0]]) {
      const within = fixture.flight.math.scenicApproachPlan(start, [0, 0, 0], 1, 1, 1, 10);
      expect(within.pathLengthLy).toBe(0);
      expect(within.remainingLy).toBe(0);
      expect(within.start).toEqual(start);
      expect(within.end).toEqual(start);
    }
  });

  it('rejects invalid vectors, dimensions, pace and out-of-bound geometry before planning', () => {
    const args = [[0, 0, 0], [10, 0, 0], 1, 1, 1, 100];
    for (const [index, bad] of [[0, null], [0, [NaN, 0, 0]], [0, [0, 0]], [1, [Infinity, 0, 0]], [2, 0], [2, -1], [2, Infinity], [3, NaN], [3, Infinity], [4, -1], [4, NaN], [4, Infinity], [5, 0], [5, Infinity], [0, [101, 0, 0]], [1, [101, 0, 0]]]) {
      const changed = args.slice(); changed[index] = bad;
      expect(fixture.flight.math.scenicApproachPlan(...changed)).toBeNull();
    }
    const first = fixture.flight.math.scenicApproachPlan(...args);
    expect(fixture.flight.math.scenicApproachPlan(...args.map((v, i) => i === 3 ? 0 : v))).toEqual(first);
    const widest = fixture.flight.math.scenicApproachPlan(...args.map((v, i) => i === 3 ? 4 : v));
    expect(fixture.flight.math.scenicApproachPlan(...args.map((v, i) => i === 3 ? 100 : v))).toEqual(widest);
    expect(fixture.flight.math.scenicApproachPlan([0, 0, 0], [10, 0, 0], 1, undefined, 0, 100).estimatedSeconds).toBeNull();
  });

  it('preserves every accepted generated source point and RNG stream', () => {
    const source = readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), anchor = 'global.UniverseFlight = {';
    expect(source.split(anchor)).toHaveLength(2);
    const target = {};
    new Function('window', source.replace(anchor, 'global.__scenicTestRegion = makeRegion;' + anchor))(target);
    for (const [region, spec] of Object.entries(REGIONS)) {
      const points = target.__scenicTestRegion(region).points;
      expect(points).toHaveLength(spec.count * 9);
      const bytes = new Uint8Array(points.buffer, points.byteOffset, points.byteLength);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(spec.hash);
    }
  });
});

describe('Universe scenic approach navigation', () => {
  it('opts in explicitly and preserves direct planning and atomic rejection', () => {
    const direct = fixture.scene.planApproach('amber-star', 2);
    expect(fixture.scene.planApproach('amber-star', 2, 'direct')).toEqual(direct);
    expect(fixture.scene.planApproach('amber-star', 2, 'scenic').pathLengthLy).toBeGreaterThan(direct.remainingLy);
    expectAtomic(() => fixture.scene.planApproach('missing', 1, 'scenic'), null);
    expectAtomic(() => fixture.scene.planApproach('amber-star', 1, 'unknown'), null);
    expectAtomic(() => fixture.scene.navigateTo('amber-star', 1, 'unknown'));
    expectAtomic(() => fixture.scene.navigateTo('missing', 1, 'scenic'));
    fixture.scene.set({ mode: 'relativity' });
    expectAtomic(() => fixture.scene.planApproach('amber-star', 1, 'scenic'), null);
    expectAtomic(() => fixture.scene.navigateTo('amber-star', 1, 'scenic'));
  });

  it('travels the curved path with monotone arc progress and exact arrival without adding clock time', () => {
    const target = fixture.flight.landmarks('neighborhood').find(item => item.id === 'amber-star');
    const initialPlan = fixture.scene.planApproach(target.id, 2, 'scenic');
    fixture.scene.set({ speed: initialPlan.pathLengthLy / 2 });
    const plan = fixture.scene.planApproach(target.id, 2, 'scenic');
    expect(fixture.scene.navigateTo(target.id, 2, 'scenic')).toBe(true);
    fixture.advance();
    let previous = 0, previousRemaining = plan.pathLengthLy, maximumSide = 0;
    const chord = plan.end.map((v, i) => v - plan.start[i]), chordLength = Math.hypot(...chord);
    for (let step = 0; fixture.telemetry.running && step < 600; step++) {
      fixture.advance(50);
      const nav = fixture.telemetry.navigation, position = fixture.telemetry.position;
      expect(nav.path).toBe('scenic');
      expect(nav.pathLengthLy).toBe(plan.pathLengthLy);
      expect(nav.progress).toBeGreaterThanOrEqual(previous);
      expect(nav.remainingLy).toBeLessThanOrEqual(previousRemaining);
      expect(fixture.telemetry.distanceLy + nav.remainingLy).toBeCloseTo(plan.pathLengthLy, 8);
      expect(nav.progress).toBeCloseTo(fixture.telemetry.distanceLy / plan.pathLengthLy, 10);
      expect(fixture.telemetry.target.distanceLy).toBeGreaterThanOrEqual(plan.arrivalRadiusLy * (1 - 1e-10));
      const delta = position.map((v, i) => v - plan.start[i]), projected = delta.reduce((sum, v, i) => sum + v * chord[i], 0) / chordLength ** 2;
      maximumSide = Math.max(maximumSide, Math.hypot(...delta.map((v, i) => v - projected * chord[i])));
      previous = nav.progress; previousRemaining = nav.remainingLy;
    }
    expect(maximumSide).toBeGreaterThan(plan.bowLy * 0.1);
    expect(fixture.telemetry.navigation.completed).toBe(true);
    expect(fixture.telemetry.navigation.progress).toBe(1);
    expect(fixture.telemetry.navigation.remainingLy).toBe(0);
    expect(fixture.telemetry.position).toEqual(plan.end);
    expect(fixture.telemetry.target.distanceLy).toBeCloseTo(plan.arrivalRadiusLy, 8);
    expect(fixture.telemetry.distanceLy).toBeCloseTo(plan.pathLengthLy, 8);
    expect(fixture.telemetry.universeYears).toBe(0); expect(fixture.telemetry.travelerYears).toBe(0);
    expect(fixture.pauseEvents).toEqual([[expect.stringContaining('Arrived'), expect.objectContaining({ kind: 'arrival', targetId: target.id })]]);
    const stopped = fixture.scene.snapshot(); fixture.advance(5000); expect(fixture.scene.snapshot()).toEqual(stopped);
  });

  it('arrives at the identical radial endpoint for neighborhood, galaxy and cosmic approaches', () => {
    for (const [region, targetId] of [['neighborhood', 'blue-star'], ['galaxy', 'galactic-center'], ['cosmic', 'near-galaxy']]) {
      fixture.scene.set({ mode: 'explore', region }); fixture.scene.reset();
      const target = fixture.flight.landmarks(region).find(item => item.id === targetId);
      const plan = fixture.scene.planApproach(targetId, 4, 'scenic');
      fixture.scene.set({ speed: plan.pathLengthLy });
      expect(fixture.scene.navigateTo(targetId, 4, 'scenic')).toBe(true); finish();
      expect(fixture.telemetry.position).toEqual(plan.end);
      expect(distance(fixture.telemetry.position, target.position)).toBeCloseTo(target.arrivalRadiusLy * 4, 6);
      expect(fixture.telemetry.navigation.completed).toBe(true);
      expect(fixture.telemetry.distanceLy).toBeCloseTo(plan.pathLengthLy, 6);
      expect(fixture.telemetry.universeYears).toBe(0); expect(fixture.telemetry.travelerYears).toBe(0);
    }
  });

  it('keeps an active plan detached, reports remaining arc, and updates ETA with pace', () => {
    fixture.scene.set({ speed: 1 });
    expect(fixture.scene.navigateTo('amber-star', 2, 'scenic')).toBe(true);
    fixture.advance(); fixture.advance(100); fixture.scene.set({ running: false });
    const before = fixture.scene.snapshot(), nav = clone(fixture.telemetry.navigation);
    const plan = fixture.scene.planApproach('amber-star', 2, 'scenic');
    expect(plan.remainingLy).toBe(nav.remainingLy);
    expect(plan.pathLengthLy).toBe(nav.pathLengthLy);
    expect(fixture.scene.snapshot()).toEqual(before);
    plan.control[0] += 100; plan.samples[0].distanceLy = 100;
    expect(fixture.scene.planApproach('amber-star', 2, 'scenic').control).not.toEqual(plan.control);
    fixture.scene.set({ running: false, speed: 5 });
    expect(fixture.telemetry.navigation.estimatedSeconds).toBe(fixture.flight.math.approachPlan(nav.remainingLy + nav.arrivalRadiusLy, nav.arrivalRadiusLy, 1, 5).estimatedSeconds);
    expect(fixture.telemetry.position).toEqual(before.state.position);
    fixture.scene.look(0.2, 0); fixture.advance(250);
    expect(fixture.telemetry.navigation.autoLook).toBe(false);
    expect(fixture.scene.focusTarget('amber-star')).toBe(true);
    expect(fixture.telemetry.navigation.autoLook).toBe(true);
    fixture.scene.view('right'); expect(fixture.telemetry.navigation.autoLook).toBe(false);
    expect(fixture.scene.frameTarget('amber-star', 1 / 3)).toBe(true);
    expect(fixture.telemetry.navigation.active).toBe(true); expect(fixture.telemetry.running).toBe(false);
    expect(fixture.telemetry.navigation.autoLook).toBe(false);
  });

  it('pauses for a manual look and resumes the same path while retaining the chosen gaze', () => {
    const plan = fixture.scene.planApproach('amber-star', 1, 'scenic');
    fixture.scene.set({ speed: plan.pathLengthLy / 3 });
    expect(fixture.scene.navigateTo('amber-star', 1, 'scenic')).toBe(true);
    fixture.advance(); fixture.advance(100); fixture.scene.set({ running: false });
    const stopped = fixture.scene.snapshot(), arc = clone(fixture.telemetry.navigation);
    fixture.advance(1000); expect(fixture.scene.snapshot()).toEqual(stopped); expect(fixture.telemetry.navigation).toEqual(arc);
    fixture.scene.look(0.2, -0.1); const gaze = fixture.scene.snapshot().state; fixture.advance(250);
    expect(fixture.telemetry.navigation.autoLook).toBe(false);
    expect(fixture.telemetry.navigation.remainingLy).toBe(arc.remainingLy);
    fixture.scene.set({ running: true }); fixture.advance(); fixture.advance(100);
    const resumed = fixture.scene.snapshot().state;
    expect(resumed.position).not.toEqual(stopped.state.position);
    expect(resumed.yaw).toBe(gaze.yaw); expect(resumed.pitch).toBe(gaze.pitch);
    finish(); expect(fixture.telemetry.navigation.completed).toBe(true);
    expect(fixture.telemetry.yaw).toBe(gaze.yaw); expect(fixture.telemetry.pitch).toBe(gaze.pitch);
  });

  it('cancels cleanly and rejects unknown styles atomically during a running curve', () => {
    fixture.scene.set({ speed: 1 }); expect(fixture.scene.navigateTo('amber-star', 1, 'scenic')).toBe(true);
    fixture.advance(); fixture.advance(100);
    expectAtomic(() => fixture.scene.navigateTo('blue-star', 1, 'unknown'));
    expect(fixture.scene.cancelNavigation()).toBe(true);
    const canceled = fixture.scene.snapshot(); fixture.advance(1000);
    expect(fixture.scene.snapshot()).toEqual(canceled);
    expect(fixture.telemetry.running).toBe(false); expect(fixture.telemetry.navigation.active).toBe(false);
    expect(fixture.scene.cancelNavigation()).toBe(false);
  });

  it('plans a fresh positive curve after completion and outward free travel', () => {
    const first = fixture.scene.planApproach('amber-star', 1, 'scenic');
    fixture.scene.set({ speed: first.pathLengthLy });
    fixture.scene.navigateTo('amber-star', 1, 'scenic'); finish();
    expect(fixture.telemetry.navigation.completed).toBe(true);
    fixture.scene.look(Math.PI, 0);
    fixture.scene.set({ speed: 100, running: true });
    fixture.advance(); for (let step = 0; step < 10; step++) fixture.advance(100);
    fixture.scene.set({ running: false });
    const current = fixture.scene.snapshot(), target = fixture.flight.landmarks('neighborhood').find(item => item.id === 'amber-star');
    expect(distance(current.state.position, target.position)).toBeGreaterThan(target.arrivalRadiusLy);
    expect(fixture.telemetry.navigation.completed).toBe(false);
    expect(fixture.telemetry.navigation.path).not.toBe('scenic');
    expect(fixture.telemetry.navigation.remainingLy).toBeGreaterThan(0);
    const fresh = fixture.scene.planApproach('amber-star', 1, 'scenic');
    expect(fresh.start).toEqual(current.state.position);
    expect(fresh.remainingLy).toBeGreaterThan(0); expect(fresh.pathLengthLy).toBeGreaterThan(0);
    expect(fresh.end).not.toEqual(first.end);
    expect(fixture.scene.snapshot()).toEqual(current);
  });

  it('restores the exact previous view and retains existing distance and physical clock counters', () => {
    const origin = fixture.scene.snapshot();
    origin.state = { ...origin.state, yaw: 0.23, pitch: -0.12, distanceLy: 42, universeYears: 12.3, travelerYears: 4.5 };
    origin.settings = { ...origin.settings, dust: false, fov: 71, exposure: 1.4 };
    expect(fixture.scene.restore(origin)).toBe(true);
    const restored = fixture.scene.snapshot(), plan = fixture.scene.planApproach('amber-star', 2, 'scenic');
    fixture.scene.set({ speed: plan.pathLengthLy }); fixture.scene.navigateTo('amber-star', 2, 'scenic'); finish();
    expect(fixture.telemetry.distanceLy).toBeCloseTo(42 + plan.pathLengthLy, 8);
    expect(fixture.telemetry.universeYears).toBe(12.3); expect(fixture.telemetry.travelerYears).toBe(4.5);
    expect(fixture.scene.restore(restored)).toBe(true);
    const expected = clone(restored); expected.state.yaw = normalizedYaw(expected.state.yaw);
    expect(fixture.scene.snapshot()).toEqual(expected);
    expect(fixture.telemetry.running).toBe(false); expect(fixture.telemetry.navigation.active).toBe(false);
  });

  it('reuses graphics across a scenic path and releases each resource exactly once', () => {
    const resources = fixture.createdTextures.slice(), uploads = fixture.textureUploads.length;
    fixture.scene.navigateTo('amber-star', 1, 'scenic'); fixture.advance(); fixture.advance(100);
    fixture.scene.cancelNavigation();
    expect(fixture.createdTextures).toEqual(resources); expect(fixture.textureUploads).toHaveLength(uploads);
    fixture.scene.dispose(); fixture.scene.dispose();
    expect(fixture.deletedTextures).toHaveLength(resources.length);
    for (const resource of resources) expect(fixture.deletedTextures.filter(item => item === resource)).toHaveLength(1);
    expectAtomic(() => fixture.scene.navigateTo('blue-star', 1, 'scenic'));
  });

  it('freezes a scenic path on context loss and rejects unavailable graphics atomically', () => {
    const resources = fixture.createdTextures.slice(), uploads = fixture.textureUploads.length;
    fixture.scene.navigateTo('amber-star', 1, 'scenic'); fixture.advance(); fixture.advance(100);
    expect(fixture.createdTextures).toEqual(resources); expect(fixture.textureUploads).toHaveLength(uploads);
    const event = new Event('webglcontextlost', { cancelable: true }); fixture.canvas.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    const stopped = fixture.scene.snapshot(); fixture.advance(1000);
    expect(fixture.scene.snapshot()).toEqual(stopped); expect(fixture.frames.size).toBe(0);
    expectAtomic(() => fixture.scene.navigateTo('blue-star', 1, 'scenic'));
    fixture.scene.dispose(); fixture.scene.dispose();
    // The browser releases the lost context; disposed code must not call its GL API.
    expect(fixture.deletedTextures).toHaveLength(0);
    expectAtomic(() => fixture.scene.navigateTo('blue-star', 1, 'scenic'));
  });
});
