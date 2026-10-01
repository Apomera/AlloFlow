import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let RR;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_roadready.js', 'roadReady'); RR = window.__RR_TEST_EXPORTS__.roadReady; });
it('follows every instructor cue to park without contact at 30, 60 and 120 FPS', () => {
  for (const fps of [30, 60, 120]) for (const reactionSeconds of [0, 0.25]) {
    const car = { x: 254.3, y: 95, heading: -Math.PI / 2, speed: 0, steering: 0 };
    const obstacles = [{ x: 273, y: 70, w: 24, h: 50 }, { x: 273, y: 205, w: 24, h: 50 }];
    const scn = { curb: { x: 300, side: 'right' }, obstacles, slot: { x: 285, y: 167.5 }, stepCheck: c => Math.abs(c.x - 285) < 15 && Math.abs(c.y - 167.5) < 37.5 };
    let phase = 0, drivingPhase = 0, reactAt = 0; const visited = new Set([0]);
    for (let i = 0; i < fps * 30; i++) {
      if (i >= reactAt) drivingPhase = phase;
      const keys = drivingPhase <= 1 ? { s: true, d: true } : drivingPhase === 2 ? { s: true } : drivingPhase === 3 ? { s: true, a: true } : { ' ': true };
      expect(RR.parkingDrillStep(car, keys, 1 / fps, scn).kind).toBeNull();
      for (const obstacle of obstacles) expect(RR.parkingCarHitsObstacle(car, obstacle), JSON.stringify({fps, phase, car})).toBe(false);
      expect(RR.parkingCurbGapInches(car, 300, 'right')).toBeGreaterThanOrEqual(0);
      const nextPhase = RR.parallelParkingPhase(car, phase);
      if (nextPhase !== phase) reactAt = i + Math.round(fps * reactionSeconds);
      phase = nextPhase; visited.add(phase);
      if (phase === 4 && car.speed === 0) break;
    }
    expect([...visited]).toEqual([0, 1, 2, 3, 4]);
    expect(RR.parkingFinishCheck(car, scn).ready, JSON.stringify({fps,car})).toBe(true);
  }
});
it('does not advance the turn-in cue when the learner reverses in the wrong steering direction', () => {
  expect(RR.parallelParkingPhase({ x: 254, y: 95, heading: -Math.PI / 3, speed: -10 }, 1)).toBe(1);
});
