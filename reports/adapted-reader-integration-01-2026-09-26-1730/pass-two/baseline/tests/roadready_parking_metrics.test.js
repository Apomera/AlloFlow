import { beforeAll, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let RR;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__={}; loadTool('stem_lab/stem_tool_roadready.js','roadReady'); RR=window.__RR_TEST_EXPORTS__.roadReady; });
it('shows real units and the tighter bumper clearance at a legal parking pose', () => {
  const scn=RR.PARKING_SCENARIOS.tightParallel;
  const car={x:scn.slot.x,y:scn.slot.y,heading:-Math.PI/2,speed:0,steering:0};
  const metrics=RR.parkingPracticeMetrics(car,scn);
  expect(metrics.curbInches).toBeCloseTo(10.8,5);
  expect(metrics.bumperInches).toBeCloseTo(30.6,5);
  expect(metrics.angle).toBe(0); expect(metrics.ready).toBe(true);
  expect(metrics.secured).toBe(false);
});
it('does not report alongside positioning as bumper clearance', () => {
  const scn=RR.PARKING_SCENARIOS.tightParallel;
  expect(RR.parkingPracticeMetrics({...scn.startCar,speed:0,steering:0},scn).bumperInches).toBeNull();
  expect(RR.parkingPracticeMetrics({x:scn.slot.x,y:scn.slot.y,heading:-Math.PI/4,speed:0},scn).bumperInches).toBeNull();
});
it('distinguishes movement, wrong direction, and secured parking', () => {
  const scn=RR.PARKING_SCENARIOS.tightParallel;
  const car={x:scn.slot.x,y:scn.slot.y,heading:-Math.PI/2,speed:22,steering:0};
  expect(RR.parkingPracticeMetrics(car,scn).speedMph).toBeCloseTo(4.5,6);
  expect(RR.parkingPracticeMetrics(car,scn).ready).toBe(false);
  expect(RR.parkingPracticeMetrics({...car,speed:0,heading:Math.PI/2},scn).angle).toBe(180);
  expect(RR.parkingPracticeMetrics({...car,speed:0,heading:Math.PI/2},scn).message).toContain('same direction as traffic');
  expect(RR.parkingPracticeMetrics({...car,speed:0,parkingBrake:true},scn).secured).toBe(true);
});
