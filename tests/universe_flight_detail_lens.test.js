import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), { window, Math });
const api = window.UniverseFlight;
const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function universeFlightRememberView(');
const end = source.indexOf('  function UniverseFlightInspector(', start);
if (start < 0 || end < start) throw new Error('Scenic return helper unavailable');
const remember = vm.runInNewContext(source.slice(start, end) + '\nuniverseFlightRememberView;', { JSON });
const snapshot = n => ({ settings: { fov: 10 + n, region: 'neighborhood' }, state: { position: [n, n * 2, n * 3], distanceLy: n * 10, yaw: n / 10, pitch: 0, universeYears: 0, travelerYears: 0 }, targetId: 'amber-star' });

describe('Detail lens projection', () => {
  it('magnifies the same direction by the expected lens ratio without changing its angle', () => {
    const angle = 3 * Math.PI / 180, direction = [Math.sin(angle), 0, Math.cos(angle)];
    const standard = api.math.targetView(direction, 0, 0, 0, 65, 1);
    const detail = api.math.targetView(direction, 0, 0, 0, 10, 1);
    expect(detail.inView).toBe(true);
    expect(detail.angleDeg).toBeCloseTo(standard.angleDeg, 12);
    expect((detail.screen[0] - .5) / (standard.screen[0] - .5)).toBeCloseTo(Math.tan(65 * Math.PI / 360) / Math.tan(10 * Math.PI / 360), 10);
    expect(api.math.targetView(direction, 0, 0, 0, 1, 1).screen).toEqual(detail.screen);
    expect(api.math.targetView(direction, 0, 0, 0, 10, .4).inView).toBe(false);
  });
  it('solves left, center and right framing at the detail lens in all displayed skies', () => {
    for (const beta of [0, .9, .9999]) for (const fov of [10, 15]) for (const aspect of [.4, 1, 2.4]) for (const anchor of [1 / 3, .5, 2 / 3]) {
      const direction = [.4, .2, .8], pose = api.math.targetFrame(direction, beta, fov, aspect, anchor);
      expect(pose).not.toBeNull();
      const view = api.math.targetView(direction, pose.yaw, pose.pitch, beta, fov, aspect);
      expect(view.inView).toBe(true);
      expect(view.screen[0]).toBeCloseTo(anchor, 10);
      expect(view.screen[1]).toBeCloseTo(.5, 10);
    }
  });
});

describe('Scenic return points', () => {
  it('preserves a detached copy of the complete origin without changing earlier history', () => {
    const origin = { title: 'Amber star', snapshot: snapshot(0) }, history = [];
    const result = remember(history, origin, snapshot(1));
    expect(history).toEqual([]);
    expect(result[0]).toEqual(origin);
    origin.snapshot.state.position[0] = 999;
    origin.snapshot.settings.fov = 90;
    expect(result[0].snapshot.state.position[0]).toBe(0);
    expect(result[0].snapshot.settings.fov).toBe(10);
  });
  it('ignores an unchanged scenic pose but retains changes to the lens or journey counters', () => {
    const history = [{ title: 'Earlier', snapshot: snapshot(0) }], origin = { title: 'Now', snapshot: snapshot(1) };
    expect(remember(history, origin, snapshot(1))).toBe(history);
    const lens = snapshot(1); lens.settings.fov = 65;
    expect(remember(history, origin, lens)).toHaveLength(2);
    const traveled = snapshot(1); traveled.state.distanceLy += 1;
    expect(remember(history, origin, traveled)).toHaveLength(2);
  });
  it('retains six recent origins in chronological order across repeated detours', () => {
    let history = [];
    for (let n = 0; n < 10; n++) history = remember(history, { title: 'View ' + n, snapshot: snapshot(n) }, snapshot(n + 1));
    expect(history.map(v => v.title)).toEqual(['View 4', 'View 5', 'View 6', 'View 7', 'View 8', 'View 9']);
    expect(history.at(-1).snapshot.state.distanceLy).toBe(90);
  });
});
