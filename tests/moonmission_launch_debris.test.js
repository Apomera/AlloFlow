/** Discarded launch hardware coasts independently of the continuing vehicle. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const invalid = [undefined, null, NaN, Infinity, -Infinity, '1'];
const kinds = ['stage1', 'stage2', 'les'];
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function event(overrides = {}) {
  return { time: 160, altitude: 65000, radialSpeed: 1200, tangentialSpeed: 1800,
    downrange: 85000, pitch: Math.PI / 3, ...overrides };
}
function invariants(state) {
  const r = Math.hypot(state.x, state.y);
  return {
    energy: (state.vx * state.vx + state.vy * state.vy) / 2 - P.launch.mu / r,
    momentum: state.x * state.vy - state.y * state.vx,
  };
}
function maxPositionError(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
function camera(overrides = {}) {
  return { x: 300, y: 240, topY: 90, fullHeight: 180, width: 640, ...overrides };
}
function canvas() {
  const state = { globalAlpha: 0.37, fillStyle: '#123456', strokeStyle: '#654321',
    lineWidth: 3, globalCompositeOperation: 'multiply' };
  const calls = [], fills = [], stack = [];
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      if (String(key).startsWith('create') && String(key).endsWith('Gradient')) return () => ({ addColorStop() {} });
      if (key === 'measureText') return text => ({ width: String(text).length * 6 });
      return (...args) => {
        calls.push([key, ...args]);
        if (key === 'save') stack.push({ ...state });
        if (key === 'restore') Object.assign(state, stack.pop());
        if (key === 'fill' || key === 'fillRect') fills.push({ ...state });
      };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, state, calls, fills, stack };
}
function rotated(point, origin, angle) {
  const x = point.x - origin.x, y = point.y - origin.y;
  return { x: origin.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: origin.y + x * Math.sin(angle) + y * Math.cos(angle) };
}

describe('Independent launch debris tracks', () => {
  it('captures the exact separation position and resolves the ejection impulse along the released body', () => {
    const impulses = { stage1: [-2, 0], stage2: [-1.5, 0], les: [45, 14] };
    for (const kind of kinds) {
      const source = event(), track = P.launchDebrisTrack(source, kind);
      const initial = P.launchDebrisState(track, source.time);
      const [axial, lateral] = impulses[kind];
      expect(initial.x).toBe(0);
      expect(initial.y).toBe(P.launch.radius + source.altitude);
      // Dot the velocity change back onto the orthogonal body axes. This also
      // catches swapped radial/prograde components and a reversed escape kick.
      const dx = initial.vx - source.tangentialSpeed, dy = initial.vy - source.radialSpeed;
      expect(dx * Math.sin(source.pitch) + dy * Math.cos(source.pitch)).toBeCloseTo(axial, 10);
      expect(dx * Math.cos(source.pitch) - dy * Math.sin(source.pitch)).toBeCloseTo(lateral, 10);
      expect(initial.age).toBe(0);
    }
  });

  it('inherits each real launch event without changing the powered trajectory or its mass ledger', () => {
    const profile = P.launchProfile(), before = JSON.stringify(profile);
    for (const kind of kinds) {
      const source = profile.events[kind], track = P.launchDebrisTrack(source, kind);
      expect(track).not.toBeNull();
      for (const key of ['time', 'altitude', 'radialSpeed', 'tangentialSpeed', 'downrange', 'pitch']) {
        expect(track.event[key]).toBe(source[key]);
      }
      for (const age of [0, 0.125, 5, 27.3, 75]) {
        const state = P.launchDebrisState(track, source.time + age);
        for (const key of ['x', 'y', 'vx', 'vy', 'age']) expect(Number.isFinite(state[key])).toBe(true);
      }
    }
    expect(JSON.stringify(profile)).toBe(before);
    expect(P.launchProfile()).toBe(profile);
  });

  it('conserves specific mechanical energy and angular momentum throughout the gravity-only coast', () => {
    const profile = P.launchProfile();
    for (const kind of kinds) {
      const source = profile.events[kind], track = P.launchDebrisTrack(source, kind);
      const start = invariants(P.launchDebrisState(track, source.time));
      for (let age = 0.375; age < 75; age += 2.375) {
        const now = invariants(P.launchDebrisState(track, source.time + age));
        expect(Math.abs((now.energy - start.energy) / start.energy)).toBeLessThan(1e-10);
        expect(Math.abs((now.momentum - start.momentum) / start.momentum)).toBeLessThan(1e-10);
      }
    }
  });

  it('matches an independently solved circular orbit, including fractional sample times', () => {
    const radius = P.launch.radius + 185000, speed = Math.sqrt(P.launch.mu / radius);
    // Cancel the stage-one axial kick with the initial outward velocity, giving
    // an exact circular initial state without a special integrator option.
    const source = event({ altitude: 185000, radialSpeed: 2, tangentialSpeed: speed, pitch: 0 });
    const track = P.launchDebrisTrack(source, 'stage1'), omega = speed / radius;
    for (const age of [0, 0.125, 0.5, 7.375, 35.9, 75]) {
      const actual = P.launchDebrisState(track, source.time + age), angle = omega * age;
      const expected = { x: radius * Math.sin(angle), y: radius * Math.cos(angle),
        vx: speed * Math.cos(angle), vy: -speed * Math.sin(angle) };
      expect(maxPositionError(actual, expected)).toBeLessThan(0.01);
      expect(Math.abs(actual.vx - expected.vx)).toBeLessThan(0.00001);
      expect(Math.abs(actual.vy - expected.vy)).toBeLessThan(0.00001);
    }
  });

  it('takes a partial gravity step instead of linearly interpolating a chord between saved positions', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage2');
    const a = P.launchDebrisState(track, source.time + 10);
    const mid = P.launchDebrisState(track, source.time + 10.25);
    const b = P.launchDebrisState(track, source.time + 10.5);
    const chordMidpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    // Gravity makes the ballistic arc lie above the straight endpoint chord.
    expect(mid.y - chordMidpoint.y).toBeGreaterThan(0.2);
    expect(mid.y - chordMidpoint.y).toBeLessThan(0.4);
    expect(Math.abs((invariants(mid).energy - invariants(a).energy) / invariants(a).energy)).toBeLessThan(1e-10);
  });

  it('uses a deterministic bounded track and gives the same result when seeking backward', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage1');
    expect(track.duration).toBe(75);
    expect(track.step).toBe(0.5);
    expect(track.samples.length).toBe(151);
    expect(track.samples[0].age).toBe(0);
    expect(track.samples[150].age).toBe(75);
    const targets = [0, 0.375, 14, 24.125, 70.9, 75];
    const forward = targets.map(age => P.launchDebrisState(track, source.time + age));
    for (let index = targets.length - 1; index >= 0; index--) {
      expect(P.launchDebrisState(track, source.time + targets[index])).toEqual(forward[index]);
    }
    expect(P.launchDebrisTrack(source, 'stage1')).toEqual(track);
  });

  it('deeply freezes cached data and isolates it from caller-owned event edits', () => {
    const source = event(), original = { ...source }, track = P.launchDebrisTrack(source, 'les');
    expect(source).toEqual(original);
    expect(Object.isFrozen(source)).toBe(false);
    expect(track.event).not.toBe(source);
    expect(Object.isFrozen(track)).toBe(true);
    expect(Object.isFrozen(track.event)).toBe(true);
    expect(Object.isFrozen(track.impulse)).toBe(true);
    expect(Object.isFrozen(track.only)).toBe(true);
    expect(Object.isFrozen(track.samples)).toBe(true);
    track.samples.forEach(state => expect(Object.isFrozen(state)).toBe(true));
    const before = P.launchDebrisState(track, original.time + 30.125);
    Object.assign(source, { time: 0, altitude: 0, radialSpeed: -999, tangentialSpeed: 0, pitch: -1 });
    expect(P.launchDebrisState(track, original.time + 30.125)).toEqual(before);
  });

  it('does not draw hardware before release or keep an unbounded coast after its supported lifetime', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage1');
    expect(P.launchDebrisState(track, source.time - 0.01)).toBeNull();
    expect(P.launchDebrisState(track, source.time + 75.01)).toBeNull();
    expect(P.launchDebrisState(track, source.time)).not.toBeNull();
    expect(P.launchDebrisState(track, source.time + 75)).not.toBeNull();
    for (const time of invalid) expect(P.launchDebrisState(track, time)).toBeNull();
    for (const bad of invalid) expect(P.launchDebrisState(bad, source.time)).toBeNull();
  });

  it('rejects incomplete, non-finite and out-of-range events before building a track', () => {
    for (const bad of invalid) expect(P.launchDebrisTrack(bad, 'stage1')).toBeNull();
    for (const kind of [...invalid, '', 'stage3', '__proto__', 'constructor']) {
      expect(P.launchDebrisTrack(event(), kind)).toBeNull();
    }
    for (const key of ['time', 'altitude', 'radialSpeed', 'tangentialSpeed', 'downrange', 'pitch']) {
      for (const value of invalid) expect(P.launchDebrisTrack(event({ [key]: value }), 'stage1')).toBeNull();
    }
    for (const override of [{ time: -1 }, { time: 10001 }, { altitude: -1 }, { altitude: 10000001 },
      { radialSpeed: 20001 }, { radialSpeed: -20001 }, { tangentialSpeed: 20001 },
      { radialSpeed: 15000, tangentialSpeed: 15000 }, { downrange: 100000001 },
      { downrange: -100000001 }, { pitch: 2 * Math.PI + 0.001 }, { pitch: -2 * Math.PI - 0.001 }]) {
      expect(P.launchDebrisTrack(event(override), 'stage1')).toBeNull();
    }
  });

  it('returns isolated state values and rejects damaged cached rows without propagating invalid numbers', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage1');
    const initial = P.launchDebrisState(track, source.time);
    initial.y = -999;
    expect(track.samples[0].y).toBe(P.launch.radius + source.altitude);
    expect(P.launchDebrisState(track, source.time).y).toBe(P.launch.radius + source.altitude);
    for (const corrupt of [{ samples: [] }, { step: 0 }, { duration: Infinity },
      { event: { time: NaN } }, { samples: [null, ...track.samples.slice(1)] },
      { samples: [{ ...track.samples[0], vx: Infinity }, ...track.samples.slice(1)] },
      { samples: [{ ...track.samples[0], x: 0, y: 0 }, ...track.samples.slice(1)] }]) {
      expect(P.launchDebrisState({ ...track, ...corrupt }, source.time)).toBeNull();
    }
  });
});

describe('Launch debris camera projection', () => {
  it('releases each section at its exact existing drawn centroid and attitude', () => {
    const view = camera(), recorder = canvas();
    const full = P.saturnV(recorder.ctx, view.x, view.topY, view.fullHeight, 1);
    for (const kind of kinds) {
      const source = event(), track = P.launchDebrisTrack(source, kind);
      const pose = P.launchDebrisPose(track, source, view);
      const sections = full.sections.filter(section => track.only.includes(section.id));
      const centroid = { x: view.x, y: (sections[0].y0 + sections[sections.length - 1].y1) / 2 };
      const expected = rotated(centroid, view, source.pitch);
      expect(pose.x).toBeCloseTo(expected.x, 10);
      expect(pose.y).toBeCloseTo(expected.y, 10);
      expect(pose.angle).toBe(source.pitch);
      expect(pose.relativeX).toBe(0);
      expect(pose.relativeY).toBeCloseTo(0, 12);
      expect(pose.rangeCompression).toBe(1);
      expect(pose.opacity).toBe(1);
      // The isolated model is recentered about the same section, so switching
      // draw calls cannot make the released hardware jump at the event boundary.
      const detached = P.saturnV(recorder.ctx, 0, pose.topY, pose.fullHeight, 1, { only: pose.only });
      expect((detached.sections[0].y0 + detached.sections[detached.sections.length - 1].y1) / 2).toBeCloseTo(0, 10);
    }
  });

  it('keeps release attitude and tumble independent of later vehicle pitch commands', () => {
    const source = event(), view = camera(), age = 23;
    for (const [kind, spin] of [['stage1', 0.012], ['stage2', -0.009], ['les', -0.035]]) {
      const track = P.launchDebrisTrack(source, kind);
      const sample = { ...source, time: source.time + age, altitude: 91000, downrange: 125000 };
      const poses = [-0.5, 0, 1.2, 2].map(pitch => P.launchDebrisPose(track, { ...sample, pitch }, view));
      const theta = (sample.downrange - source.downrange + P.launch.rotationSpeed * age) / P.launch.radius;
      poses.forEach(pose => {
        expect(pose.angle + theta - source.pitch).toBeCloseTo(spin * age, 12);
        expect(pose.relativeX).toBe(poses[0].relativeX);
        expect(pose.relativeY).toBe(poses[0].relativeY);
      });
      expect(poses.every(pose => pose.angle === poses[0].angle)).toBe(true);
    }
  });

  it('removes Earth rotation from ground downrange when comparing two inertial positions', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage1'), age = 37.125;
    const state = P.launchDebrisState(track, source.time + age);
    // Construct a live observer at exactly the same inertial position as the
    // debris using polar coordinates. Their projected relative range must vanish.
    const sample = { ...source, time: source.time + age,
      altitude: Math.hypot(state.x, state.y) - P.launch.radius,
      downrange: source.downrange + P.launch.radius * Math.atan2(state.x, state.y) - P.launch.rotationSpeed * age };
    const pose = P.launchDebrisPose(track, sample, camera());
    expect(Math.abs(pose.relativeX)).toBeLessThan(1e-8);
    expect(Math.abs(pose.relativeY)).toBeLessThan(1e-8);
    expect(pose.rangeCompression).toBeCloseTo(1, 9);
  });

  it('rotates released hardware about its own centre instead of swinging the centre around the live vehicle', () => {
    const source = event(), sample = { ...source, time: source.time + 30, altitude: 95000, downrange: 140000 };
    for (const kind of kinds) {
      const track = P.launchDebrisTrack(source, kind), view = camera();
      const coast = P.launchDebrisPose({ ...track, spin: 0 }, sample, view);
      const tumble = P.launchDebrisPose({ ...track, spin: 0.03 }, sample, view);
      expect(tumble.x).toBe(coast.x);
      expect(tumble.y).toBe(coast.y);
      expect(tumble.angle - coast.angle).toBeCloseTo(0.9, 12);
      expect(tumble.relativeX).toBe(coast.relativeX);
      expect(tumble.relativeY).toBe(coast.relativeY);
    }
  });

  it('compresses large ranges without changing their bearing and respects narrow viewport limits', () => {
    const profile = P.launchProfile(), source = profile.events.stage1;
    const track = P.launchDebrisTrack(source, 'stage1');
    const sample = P.launchSample(profile, source.time + 30);
    for (const width of [320, 390, 640, 1100]) {
      const view = camera({ width }), pose = P.launchDebrisPose(track, sample, view), recorder = canvas();
      const full = P.saturnV(recorder.ctx, view.x, view.topY, view.fullHeight, 1);
      const cm = full.sections.find(section => section.id === 'cm');
      const common = rotated({ x: view.x, y: (cm.y0 + cm.y1) / 2 }, view, sample.pitch);
      const released = full.sections.filter(section => track.only.includes(section.id));
      const sectionOffset = (released[0].y0 + released[released.length - 1].y1 - cm.y0 - cm.y1) / 2;
      const releaseAxis = pose.angle - track.spin * pose.age;
      const displacement = { x: pose.x - common.x + Math.sin(releaseAxis) * sectionOffset,
        y: pose.y - common.y - Math.cos(releaseAxis) * sectionOffset };
      const range = Math.hypot(pose.relativeX, pose.relativeY), pixels = Math.hypot(displacement.x, displacement.y);
      expect(range).toBeGreaterThan(100);
      expect(pose.rangeCompression).toBeGreaterThan(0);
      expect(pose.rangeCompression).toBeLessThan(1);
      expect(pixels).toBeLessThan(Math.min(view.fullHeight * 0.85, width * 0.22));
      expect(displacement.x / pixels).toBeCloseTo(pose.relativeX / range, 10);
      expect(displacement.y / pixels).toBeCloseTo(pose.relativeY / range, 10);
    }
  });

  it('scales the framing consistently while keeping motion, attitude and fade independent of viewport size', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'les');
    const sample = { ...source, time: source.time + 55, altitude: 100000, downrange: 190000 };
    const view = camera(), base = P.launchDebrisPose(track, sample, view);
    for (const factor of [0.5, 1.5, 2]) {
      const resized = Object.fromEntries(Object.entries(view).map(([key, value]) => [key, value * factor]));
      const pose = P.launchDebrisPose(track, sample, resized);
      for (const key of ['x', 'y', 'topY', 'fullHeight']) expect(pose[key]).toBeCloseTo(base[key] * factor, 9);
      for (const key of ['angle', 'age', 'opacity', 'relativeX', 'relativeY', 'rangeCompression']) expect(pose[key]).toBeCloseTo(base[key], 12);
    }
  });

  it('stays fully opaque initially and fades smoothly to zero only at the end of the supported coast', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage2');
    let previous = 1;
    for (const age of [0, 25, 50, 50.01, 55, 62.5, 70, 74.99, 75]) {
      const pose = P.launchDebrisPose(track, { ...source, time: source.time + age }, camera());
      expect(pose.opacity).toBeGreaterThanOrEqual(0);
      expect(pose.opacity).toBeLessThanOrEqual(previous);
      if (age <= 50) expect(pose.opacity).toBe(1);
      if (age === 62.5) expect(pose.opacity).toBe(0.5);
      if (age === 75) expect(pose.opacity).toBe(0);
      previous = pose.opacity;
    }
  });

  it('rejects invalid projection inputs and out-of-lifetime requests', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage1'), view = camera();
    for (const value of invalid) {
      expect(P.launchDebrisPose(track, value, view)).toBeNull();
      expect(P.launchDebrisPose(track, source, value)).toBeNull();
      for (const key of ['time', 'altitude', 'downrange', 'pitch']) {
        expect(P.launchDebrisPose(track, { ...source, [key]: value }, view)).toBeNull();
      }
      for (const key of ['x', 'y', 'topY', 'fullHeight', 'width']) {
        expect(P.launchDebrisPose(track, source, { ...view, [key]: value })).toBeNull();
      }
    }
    for (const override of [{ fullHeight: 0 }, { fullHeight: -1 }, { width: 0 }, { width: -1 }]) {
      expect(P.launchDebrisPose(track, source, { ...view, ...override })).toBeNull();
    }
    expect(P.launchDebrisPose(track, { ...source, altitude: -1 }, view)).toBeNull();
    expect(P.launchDebrisPose(track, { ...source, time: source.time - 1 }, view)).toBeNull();
    expect(P.launchDebrisPose(track, { ...source, time: source.time + 76 }, view)).toBeNull();
  });

  it('draws in the independent pose frame and restores caller drawing state and opacity', () => {
    const source = event(), track = P.launchDebrisTrack(source, 'stage2');
    const pose = P.launchDebrisPose(track, { ...source, time: source.time + 62.5 }, camera());
    const rec = canvas(), before = { ...rec.state };
    expect(P.drawLaunchDebris(rec.ctx, pose)).toBe(pose);
    expect(rec.calls.slice(0, 3)).toEqual([['save'], ['translate', pose.x, pose.y], ['rotate', pose.angle]]);
    expect(rec.fills.length).toBeGreaterThan(0);
    rec.fills.forEach(fill => expect(fill.globalAlpha).toBeLessThanOrEqual(before.globalAlpha * pose.opacity));
    expect(rec.state).toEqual(before);
    expect(rec.stack).toEqual([]);
    expect(P.drawLaunchDebris(rec.ctx, { ...pose, opacity: 0 })).toBeNull();
    expect(P.drawLaunchDebris(null, pose)).toBeNull();
    expect(P.drawLaunchDebris(rec.ctx, null)).toBeNull();
  });
});
