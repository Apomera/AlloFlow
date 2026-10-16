import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const flight = (patch = {}) => ({ x: 0, y: 50, z: 0, yaw: 0, reachedLaunch: true, reachedDca: false, decisionLog: [], ...patch });
const map = patch => BH.bhDronePlanMap(flight(patch));
const inside = (point, margin = 0) => {
  expect(Number.isFinite(point.x)).toBe(true); expect(Number.isFinite(point.y)).toBe(true);
  expect(point.x).toBeGreaterThanOrEqual(24 + margin - 1e-8); expect(point.x).toBeLessThanOrEqual(336 - margin + 1e-8);
  expect(point.y).toBeGreaterThanOrEqual(24 + margin - 1e-8); expect(point.y).toBeLessThanOrEqual(296 - margin + 1e-8);
};
const samePosition = (point, world, result) => {
  expect(point.x - result.hive.x).toBeCloseTo(world.x * result.scale, 8);
  expect(point.y - result.hive.y).toBeCloseTo(world.z * result.scale, 8);
};
const segmentPoints = result => result.segments.map(segment => segment.split(' ').map(pair => { const [x, y] = pair.split(',').map(Number); return { x, y }; }));
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

describe('Drone pause-and-plan map geometry', () => {
  it('fits hive, current position, and the full DCA circle with symbol margins', () => {
    const result = map();
    expect(result.known).toBe(true); expect(result.player).toEqual(result.hive);
    for (const point of [result.hive, result.player, result.dca]) inside(point, 18);
    for (const point of [
      { x: result.dca.x - result.dcaRadius, y: result.dca.y }, { x: result.dca.x + result.dcaRadius, y: result.dca.y },
      { x: result.dca.x, y: result.dca.y - result.dcaRadius }, { x: result.dca.x, y: result.dca.y + result.dcaRadius }
    ]) inside(point, 18);
    expect(result.dcaRadius).toBeCloseTo(BH.DRONE_FLIGHT_PARAMS.dcaRadiusM * result.scale, 10);
    expect(result).toMatchObject({ dcaRadiusM: 72, dcaMinFt: 100, dcaMaxFt: 130 });
  });

  it('uses equal horizontal scales and points forward toward negative z', () => {
    const result = map({ x: 600, z: 0 });
    expect(result.player.x - result.hive.x).toBeCloseTo(result.hive.y - result.dca.y, 10);
    expect(result.dca.y).toBeLessThan(result.hive.y); expect(result.player.x).toBeGreaterThan(result.hive.x);
    samePosition(result.player, { x: 600, z: 0 }, result);
  });

  it('fits distant current positions, actual history, and the unlocked queen without clamping their locations', () => {
    const history = [{ x: -28000, z: 12000 }, { x: 39000, z: -27000 }];
    const queen = { x: 67000, y: 150, z: -13000, caught: false };
    const result = map({ x: -9000, z: 14000, reachedDca: true, nearQueens: [queen], decisionLog: history });
    for (const point of [result.player, result.hive, result.dca, result.queen, ...result.samples]) inside(point, 18);
    result.samples.forEach((point, i) => samePosition(point, history[i], result));
    samePosition(result.queen, queen, result); samePosition(result.player, { x: -9000, z: 14000 }, result);
  });

  it('keeps altitude out of the horizontal map and never infers checkpoint completion', () => {
    const low = map({ x: 0, z: -600, y: 0 });
    const high = map({ x: 0, z: -600, y: 120, nearQueens: [{ x: 6000, z: -1000, y: 100 }] });
    expect(high).toEqual(low); expect(high.queen).toBeNull(); expect(high.targetLabel).toBe('DCA');
  });

  it('retains zero coordinates as a real current position', () => {
    expect(map({ x: 0, z: 0 })).toMatchObject({ known: true });
    const result = map({ x: 0, z: -600 }); expect(result.player).toEqual(result.dca);
  });

  it('omits a current marker when either coordinate is unknown instead of inventing a hive position', () => {
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, '0', false, {}]) {
      for (const patch of [{ x: invalid, z: 0 }, { x: 0, z: invalid }]) {
        const result = map(patch); expect(result.known).toBe(false); expect(result.player).toBeNull();
        expect(result.samples).toEqual([]); inside(result.hive); inside(result.dca);
      }
    }
  });

  it('uses only recorded maneuver positions without artificial origin or current endpoints', () => {
    const history = [{ x: 40, z: -100 }, { x: 70, z: -180 }];
    const result = map({ x: 110, z: -220, decisionLog: history, telemetry: [{ x: 90000, z: 90000 }] });
    expect(result.sampleCount).toBe(2); expect(result.gapCount).toBe(0);
    expect(segmentPoints(result).map(points => points.length)).toEqual([2]);
    result.samples.forEach((point, i) => samePosition(point, history[i], result));
    expect(result.samples).not.toContainEqual(result.hive); expect(result.samples).not.toContainEqual(result.player);
  });

  it('retains a recorded singleton as a dot without claiming a connecting path', () => {
    const result = map({ decisionLog: [{ x: 0, z: -90 }] });
    expect(result.sampleCount).toBe(1); expect(result.segments).toEqual([]);
    samePosition(result.samples[0], { x: 0, z: -90 }, result);
  });

  it('breaks trails at every missing position and preserves valid singleton runs', () => {
    const result = map({ decisionLog: [
      { x: 0, z: 0 }, { x: 0, z: -20 }, { altitude: 50 }, { x: 10, z: -40 },
      { x: NaN, z: -50 }, { x: 20, z: -60 }, { x: 20, z: -80 }, null, { x: 30, z: -100 }
    ] });
    expect(result).toMatchObject({ sampleCount: 6, gapCount: 3 });
    expect(segmentPoints(result).map(points => points.length)).toEqual([2, 2]);
    expect(result.samples).toHaveLength(6);
    expect(result.segments.join(' ')).not.toMatch(/NaN|Infinity/);
  });

  it('counts unavailable rows without converting numeric-looking fields into observations', () => {
    const result = map({ decisionLog: [undefined, {}, false, { x: '0', z: 0 }, { x: 0, z: null }, { x: Infinity, z: 0 }] });
    expect(result).toMatchObject({ sampleCount: 0, gapCount: 6, samples: [], segments: [] });
  });

  it('treats a sparse missing history row as a gap instead of connecting across it', () => {
    const history = [{ x: 0, z: -10 }, , { x: 0, z: -30 }];
    expect(map({ decisionLog: history })).toMatchObject({ sampleCount: 2, gapCount: 1, segments: [] });
  });

  it('keeps duplicate recorded positions as observations and does not manufacture movement', () => {
    const result = map({ decisionLog: [{ x: 0, z: 0 }, { x: 0, z: 0 }] });
    expect(result.sampleCount).toBe(2); expect(result.samples[0]).toEqual(result.samples[1]);
    const points = segmentPoints(result)[0]; expect(points).toHaveLength(2); expect(points[0]).toEqual(points[1]);
  });

  it('limits the evidence window to the last 100 rows before filtering missing positions', () => {
    const recent = Array.from({ length: 100 }, (_, i) => i === 10 ? { altitude: 90 } : { x: i, z: -i * 2 });
    const result = map({ decisionLog: [{ x: -1e9, z: 1e9 }, {}, ...recent] });
    expect(result).toEqual(map({ decisionLog: recent }));
    expect(result).toMatchObject({ sampleCount: 99, gapCount: 1 });
    expect(segmentPoints(result).map(points => points.length)).toEqual([10, 89]);
  });

  it('ignores malformed history containers instead of interpreting their contents as a trail', () => {
    for (const decisionLog of [null, {}, 'route', 12]) expect(map({ decisionLog })).toEqual(map());
  });

  it('does not expose or fit a queen before DCA entry is recorded', () => {
    const result = map({ nearQueens: [{ x: 5e6, y: 130, z: -5e6, caught: false }] });
    expect(result).toEqual(map()); expect(result.target).toEqual(result.dca); expect(result.queen).toBeNull();
  });

  it('uses the canonical uncaught navigation target after DCA entry', () => {
    const caught = { x: -3500, y: 150, z: -3000, caught: true };
    const available = { x: 160, y: 130, z: -700, caught: false };
    const state = flight({ reachedDca: true, nearQueens: [caught, available] });
    const result = BH.bhDronePlanMap(state);
    expect(BH.bhDroneNavigationTarget(state)).toMatchObject({ x: available.x, y: available.y, z: available.z });
    expect(result.targetLabel).toBe('Queen cue'); expect(result.queen).toEqual(result.target);
    samePosition(result.queen, available, result);
  });

  it('keeps the canonical caught queen after interception and falls back to DCA without a cue', () => {
    const caught = { x: -80, y: 125, z: -720, caught: true };
    const nearQueens = [caught, { x: 6000, y: 150, z: -9000, caught: false }];
    const result = map({ reachedDca: true, reachedQueen: true, nearQueens });
    expect(result.targetLabel).toBe('Queen intercepted'); samePosition(result.queen, caught, result);
    const absent = map({ reachedDca: true, nearQueens: [caught] });
    expect(absent.queen).toBeNull(); expect(absent.target).toEqual(absent.dca); expect(absent.targetLabel).toBe('DCA');
  });

  it('does not replace a selected cue with missing coordinates by a later valid queen', () => {
    const result = map({ reachedDca: true, nearQueens: [{ x: null, y: 125, z: -600 }, { x: 30, y: 125, z: -610 }] });
    expect(result.queen).toBeNull(); expect(result.target).toBeNull(); expect(result.targetLabel).toBe('Queen cue');
  });

  it('accepts zero queen coordinates and tolerates malformed queen containers', () => {
    const result = map({ reachedDca: true, nearQueens: [{ x: 0, y: 120, z: 0 }] });
    expect(result.queen).toEqual(result.hive);
    for (const nearQueens of [null, {}, 'cue', [null, undefined]]) {
      const absent = map({ reachedDca: true, nearQueens }); expect(absent.queen).toBeNull(); expect(absent.target).toEqual(absent.dca);
    }
  });

  it('shows only finite obstacles within the plot without enlarging the fitted route', () => {
    const baseline = map();
    const result = map({ obstacles: [{ x: 0, z: -300 }, { x: 0, z: 0 }, { x: 1e9, z: 1e9 }, { x: NaN, z: 0 }, { x: 0, z: Infinity }, null] });
    expect(result.scale).toBe(baseline.scale); expect(result.hive).toEqual(baseline.hive);
    expect(result.obstacles).toHaveLength(2); result.obstacles.forEach(point => inside(point));
    samePosition(result.obstacles[0], { x: 0, z: -300 }, result);
    for (const obstacles of [undefined, null, {}, 'trees']) expect(map({ obstacles }).obstacles).toEqual([]);
  });

  it('uses SVG heading degrees and keeps extreme or missing headings finite', () => {
    expect(map({ yaw: Math.PI / 2 }).heading).toBeCloseTo(90, 10);
    expect(map({ yaw: -Math.PI / 2 }).heading).toBeCloseTo(-90, 10);
    expect(map({ yaw: Math.PI * 5 }).heading).toBeCloseTo(180, 10);
    for (const yaw of [undefined, null, '1', NaN, Infinity]) expect(map({ yaw }).heading).toBe(0);
    expect(Number.isFinite(map({ yaw: Number.MAX_VALUE }).heading)).toBe(true);
  });

  it('uses a readable honest scale bar at near, far, and extreme fit scales', () => {
    for (const distance of [0, 600, 6000, 1e8, 1e150, Number.MAX_VALUE]) {
      const result = map({ x: distance, z: -distance }); const bar = result.scaleBar;
      expect(Number.isFinite(bar.distance)).toBe(true); expect(bar.distance).toBeGreaterThan(0);
      expect(bar.width).toBeGreaterThanOrEqual(40); expect(bar.width).toBeLessThanOrEqual(100);
      expect(bar.width).toBeCloseTo(bar.distance * result.scale, 10); expect(bar.label).toMatch(/ model m$/);
      const base = Math.pow(10, Math.floor(Math.log10(bar.distance)));
      expect([1, 2, 5].some(factor => Math.abs(bar.distance / base - factor) < 1e-8)).toBe(true);
    }
  });

  it('keeps all output coordinates finite even for opposing maximum finite observations', () => {
    const far = Number.MAX_VALUE;
    const result = map({ x: far, z: far, yaw: far, decisionLog: [{ x: -far, z: -far }, { x: far, z: -far }], reachedDca: true, nearQueens: [{ x: -far, y: 130, z: far }] });
    for (const point of [result.player, result.hive, result.dca, result.queen, result.target, ...result.samples]) inside(point, 18);
    expect(result.sampleCount).toBe(2); expect(result.scale).toBeGreaterThan(0); expect(Number.isFinite(result.scale)).toBe(true);
    expect(result.segments.join(' ')).not.toMatch(/NaN|Infinity/); expect(Number.isFinite(result.dcaRadius)).toBe(true);
  });

  it('provides a finite empty map without claiming that a current or recorded position exists', () => {
    for (const state of [undefined, null, {}, false, 'route']) {
      const result = BH.bhDronePlanMap(state);
      expect(result).toMatchObject({ known: false, player: null, sampleCount: 0, gapCount: 0, samples: [], segments: [], queen: null });
      inside(result.hive); inside(result.dca); expect(result.scale).toBeGreaterThan(0); expect(Number.isFinite(result.scaleBar.width)).toBe(true);
    }
  });

  it('does not mutate frozen simulation state, evidence, checkpoints, or unknown metadata', () => {
    const input = freeze(flight({ x: 45, z: -420, reachedDca: true, energy: 83, timer: 72, nearQueens: [{ x: 140, y: 120, z: -730, caught: false }],
      decisionLog: [{ x: 15, z: -110, custom: { lesson: 'keep' } }, { altitude: 70 }, { x: 35, z: -360 }], obstacles: [{ x: 20, z: -260 }], future: { value: 9 } }));
    const before = JSON.stringify(input); const first = BH.bhDronePlanMap(input);
    expect(BH.bhDronePlanMap(input)).toEqual(first); expect(JSON.stringify(input)).toBe(before);
    expect(input.reachedDca).toBe(true); expect(input).not.toHaveProperty('reachedQueen');
  });
});
