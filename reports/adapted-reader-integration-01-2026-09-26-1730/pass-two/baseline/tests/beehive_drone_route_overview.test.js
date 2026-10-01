import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const flight = (patch = {}) => ({ x: 0, y: 50, z: 0, yaw: 0, reachedLaunch: true, reachedDca: false, telemetry: [], ...patch });

describe('Drone route overview', () => {
  it('separates horizontal range from altitude and never awards checkpoints', () => {
    const s = flight({ z: -600, y: 99.99 }); const before = JSON.stringify(s);
    const r = BH.bhDroneRouteOverview(s);
    expect(r).toMatchObject({ inRange: true, inAltitude: false, stage: 'dca' });
    expect(r.advice).toContain('Climb'); expect(r.checkpoints[1].done).toBe(false);
    expect(JSON.stringify(s)).toBe(before);
  });
  it.each([[72, 100, true, true], [72.01, 115, false, true], [0, 130, true, true], [0, 130.01, true, false]])('uses exact gate bounds at x=%s y=%s', (x, y, inRange, inAltitude) => {
    expect(BH.bhDroneRouteOverview(flight({ x, y, z: -600 }))).toMatchObject({ inRange, inAltitude });
  });
  it('records progress only from canonical flags, even when both entry conditions are met', () => {
    const r = BH.bhDroneRouteOverview(flight({ z: -600, y: 115 }));
    expect(r).toMatchObject({ inRange: true, inAltitude: true, stage: 'dca' });
    expect(r.checkpoints.map(c => c.done)).toEqual([true, false, false]);
    expect(r.advice).toContain('when the simulation advances');
  });
  it('reveals the queen only after DCA entry and keeps a completed checkpoint recorded', () => {
    const s = flight({ nearQueens: [{ x: 160, y: 160, z: -1300, caught: false }] });
    expect(BH.bhDroneRouteOverview(s).queen).toBeNull();
    const r = BH.bhDroneRouteOverview({ ...s, reachedDca: true, x: 500, z: 100 });
    expect(r.stage).toBe('queen'); expect(r.queen).toEqual(r.target); expect(r.checkpoints[1].done).toBe(true);
    expect(BH.bhDroneRouteOverview({ ...s, reachedDca: true, reachedQueen: true }).stage).toBe('complete');
  });
  it('uses the same horizontal scale for both axes, including when the bee leaves the original map', () => {
    const r = BH.bhDroneRouteOverview(flight({ x: 600, z: 0 }));
    expect(Math.abs(r.player.x - r.hive.x)).toBeCloseTo(Math.abs(r.dca.y - r.hive.y), 8);
    const far = BH.bhDroneRouteOverview(flight({ x: -9000, z: 14000 }));
    for (const p of [far.player, far.hive, far.dca]) { expect(p.x).toBeGreaterThan(14); expect(p.x).toBeLessThan(606); expect(p.y).toBeGreaterThan(24); expect(p.y).toBeLessThan(276); }
  });
  it('uses actual recent samples and ignores older evidence without position data', () => {
    const samples = Array.from({ length: 140 }, (_, i) => ({ x: i, z: -i, altitude: 80 }));
    const s = flight({ telemetry: samples }); const before = JSON.stringify(s);
    const r = BH.bhDroneRouteOverview(s);
    expect(r.trail.split(' ')).toHaveLength(91); expect(JSON.stringify(s)).toBe(before);
    const old = BH.bhDroneRouteOverview(flight({ telemetry: [{ altitude: 60 }, { x: NaN, z: 3 }, { x: 0, z: -30 }] }));
    expect(old.trail.split(' ')).toHaveLength(2); expect(old.trail).not.toContain('NaN');
  });
  it('provides a useful empty-state map without claiming biological measurements', () => {
    const r = BH.bhDroneRouteOverview({}); expect(r.stage).toBe('launch'); expect(r.text).toContain('model m');
    expect(r.checkpoints.every(c => !c.done)).toBe(true); expect(r.trail).not.toContain('NaN');
  });
});
