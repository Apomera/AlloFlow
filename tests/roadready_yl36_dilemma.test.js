import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 36, yellow lane (yl36): stop or go at a yellow, with the timing of the light.
// The yellow is long enough (ITE: t + v / 2a, a = 10 ft/s2) that a driver at or below the posted limit, at the
// moment the light turns yellow, can either stop without a scored hard brake or reach the line before the red.
// Every number below is taken from the tool's own functions: the light's yellowDur (rrSignalTiming in a built
// world), the hard-brake line of the drive loop (0.80 x frictionCoef x 0.92 x g), the Ride-Along stop planner
// (rideAlongStopPlan, light margin 1.0 m) and its 0.3 s go margin, the AI rule (rrAiYellowStops).

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR;
const hardBrakeLine = (weather) => Math.max(0.5, RR.frictionCoef(weather) * 0.92 * 9.81) * 0.8;
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('cannot find ' + from); return src.slice(a, b); };

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

// the lights of a built world: the real streamed builder block, so this reads the yellow the app gives each light
const builtLights = (id) => {
  const sc = RR.SCENARIOS.find((s) => s.id === id);
  const iw = RR.createScenarioWorld(sc);
  const signalsRef = { current: [] };
  const block = cut('for (var sci = currentChunk + loFromTravel', '// Unload distant chunks. Hysteresis');
  new Function('scope', 'with (scope) {' + block + '}')({ ...RR, iw, currentChunk: 0, loFromTravel: -8, hiFromTravel: 8, signalsRef,
    trafficRef: { current: [] }, pedsRef: { current: [] }, currentScenario: sc, scn: sc, spawnStreamedPedestrians: () => [] });
  return { sc, iw, lights: signalsRef.current.filter((s) => s.type === 'light') };
};

describe('Road Ready yl36: no dilemma zone at the posted limit', () => {
  // One test over every light scenario. On base only rain fails (3 s at 45 mph, wet hard-brake line 3.03 m/s2);
  // on the dry roads 3 s was already enough under the tool's own hard-brake line (5.2 m/s2).
  const LIGHT_SCENARIOS = ['suburban', 'night', 'rain', 'downtown', 'school_zone'];
  it('every light scenario: Ride-Along can stop under the hard-brake line or reach the line before the red', () => {
    const bad = [];
    for (const id of LIGHT_SCENARIOS) {
      const { sc, lights } = builtLights(id);
      expect(lights.length).toBeGreaterThan(2);
      const weather = sc.weather, line = hardBrakeLine(weather);
      for (const s of lights) {
        const Y = s.yellowDur;
        for (let mph = 10; mph <= sc.speedLimit; mph += 1) {
          const v = mph * RR.MPH_TO_MS;
          for (let d = 2; d <= 120; d += 0.5) {
            const plan = RR.rideAlongStopPlan(d, v, 0.1, weather, 1.0);
            const stopOk = plan.brake * 1.05 * 9.81 < line; // the planner's pedal, as deceleration (a whole pedal is 1.05 g)
            const goOk = d / v < Y - 0.3; // Ride-Along's go test at the onset of the yellow
            if (!stopOk && !goOk) { bad.push({ id, chunk: s._chunk, Y, mph, d }); break; }
          }
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it('every light scenario: a learner reacting in 1.0 s (the formula\'s t) can stop under the hard-brake line or reach the line before the red', () => {
    for (const id of LIGHT_SCENARIOS) {
      const { sc, lights } = builtLights(id);
      const b = hardBrakeLine(sc.weather);
      for (const s of lights) for (let mph = 5; mph <= sc.speedLimit; mph++) {
        const v = mph * RR.MPH_TO_MS;
        // the longest distance that still needs more than the hard-brake line, against the go distance
        expect(v * 1.0 + v * v / (2 * b), id + ' ' + mph + ' mph, yellow ' + s.yellowDur).toBeLessThanOrEqual(v * s.yellowDur + 1e-9);
      }
    }
  });
});

describe('Road Ready yl36: the AI choice at a yellow (rrAiYellowStops)', () => {
  const signal = (yellowDur, timer) => ({ type: 'light', _chunk: 4, x: 0, y: 140, state: 'yellow', yellowDur, timer });

  it('stops when the stop fits at the AI rate (3.5 m/s2); otherwise goes, and then reaches the line before the red', () => {
    for (const mph of [25, 30, 35, 40, 45]) {
      const Y = RR.rrYellowSeconds(mph, 0), v = mph * RR.MPH_TO_MS, front = 2.5;
      const need = front + 0.4 + v * v / 7;
      for (let ahead = front + 0.5; ahead < 90; ahead += 0.5) {
        const car = {};
        const stop = RR.rrAiYellowStops(car, signal(Y, 0), 'main', ahead, need, front, v, 50);
        if (ahead > need) expect(stop).toBe(true);
        else { expect(stop).toBe(false); expect((ahead - front) / v).toBeLessThan(Y); }
        if (stop) expect(v * v / (2 * Math.max(0.01, ahead - front - 0.4))).toBeLessThanOrEqual(3.5 + 1e-9);
      }
    }
  });

  it('one choice per yellow: a driver that chose to stop does not flip to go as it slows; the next yellow is a new choice', () => {
    const car = {}, v = 17.9, front = 2.5, need = (s) => front + 0.4 + s * s / 7;
    const s = signal(4, 0);
    expect(RR.rrAiYellowStops(car, s, 'main', 60, need(v), front, v, 50)).toBe(true);
    // 1 s later, on its stopping profile: by distance alone it would read "too close"
    s.timer = 1;
    expect(RR.rrAiYellowStops(car, s, 'main', 44, need(v), front, v, 51)).toBe(true);
    // a later yellow of the same light (it began 30 s later): decided again
    s.timer = 0;
    expect(RR.rrAiYellowStops(car, s, 'main', 10, need(v), front, v, 80)).toBe(false);
  });

  it('a driver who first sees the yellow late, too close to stop and unable to reach the line before the red, stops', () => {
    const v = 17.9, front = 2.5;
    expect(RR.rrAiYellowStops({}, signal(4, 3.5), 'main', 30, front + 0.4 + v * v / 7, front, v, 50)).toBe(true);
  });

  it('the cross-street drivers use the same choice (the yellow used to stop them at any distance)', () => {
    const block = cut('var crossExitClear = intersectionExitClear(', 'var railStopDistance = Infinity;');
    expect(block).toContain("rrAiYellowStops(t, s, 'cross', distToCross,");
    expect(block).toContain("crossIndication !== 'flashing_yellow' && !crossYellowGo) || !crossExitClear) {");
  });
});
