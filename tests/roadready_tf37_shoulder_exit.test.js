import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 37, traffic lane (tf37): Ride-Along leaving the shoulder after an emergency vehicle has passed.
// Base sweep night s5 t 97 to 100: the car signalled for 2 s before moving back into its lane, but only the lateral
// move waited: it drove on along the shoulder (0 to 7 m/s), beside an AI driver passing in the lane, then came in
// 7 m behind that driver as it braked for a red light (scored hard brake). The wait for a gap behind (round 33)
// only ran once the 2 s were up. Now the car also waits at rest while it signals.
// The block is cut from the drive loop and run as written (stubbed inputs).

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR, block;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const a = src.indexOf('            if (!raMerging) {\n              var raShift');
  const b = src.indexOf('            } else {\n              // On the ramp', a);
  if (a < 0 || b < 0) throw new Error('Ride-Along lane-offset block not found');
  block = new Function('scope', 'with (scope) {' + src.slice(a, b) + '}\n}');
});

const step = (S) => { block(S); return S; };
const scopeAt = (t, overrides) => Object.assign({
  raMerging: false, ras: { pathOffset: 4.2, autoSignal: 0, signalSince: null, signalDoneAt: null }, raLaneOffset: 2.1,
  raCurrent: { lateral: 4.2, longitudinal: -722.8 }, raTravelSign: -1, raSign: -1, blinkerRef: { current: 0 },
  applyTurnSignal(d) { this.blinkerRef.current = d; }, rNow: t, raEmergencyHold: false, raOnShoulder: true, raSpeedMph: 0, raSpeedMps: 0,
  tList: [], car: { heading: -Math.PI / 2 }, raWorld: null, raLayoutNow: { laneWidth: 3.4 }, mainRoadLocalPoint: () => ({ lateral: 0, longitudinal: 0 }),
  raTarget: 25, throttleInput: 0.4, brakeInput: 0, dt: 0.1, Math, Number,
}, overrides || {});

describe('Road Ready tf37: Ride-Along waits at rest on the shoulder while it signals to leave it', () => {
  it('first 2 s of the signal: no throttle, brake held, no sideways move (base: throttle on, the car drove along the shoulder)', () => {
    const S = scopeAt(97.0);
    step(S); // the signal starts
    expect(S.ras.autoSignal).not.toBe(0);
    for (let t = 97.1; t < 98.95; t += 0.1) {
      S.rNow = t; S.throttleInput = 0.4; S.brakeInput = 0; S.raTarget = 25;
      step(S);
      expect(S.throttleInput, 't ' + t.toFixed(1)).toBe(0);
      expect(S.raTarget).toBe(0);
      expect(S.brakeInput).toBeGreaterThanOrEqual(0.18);
      expect(S.ras.pathOffset).toBe(4.2);
    }
  });

  it('after the 2 s, with the lane clear behind: it moves over and may drive', () => {
    const S = scopeAt(97.0); step(S);
    S.rNow = 99.2; S.throttleInput = 0.4; S.raTarget = 25;
    step(S);
    expect(S.throttleInput).toBe(0.4);
    expect(S.ras.pathOffset).toBeLessThan(4.2);
  });

  it('not on the shoulder (an ordinary lane change at low speed): unchanged, it is not held', () => {
    const S = scopeAt(97.0, { raOnShoulder: false }); step(S);
    S.rNow = 97.5; S.throttleInput = 0.4; S.raTarget = 25;
    step(S);
    expect(S.throttleInput).toBe(0.4);
  });

  it('while the emergency vehicle is still being let by (hold): unchanged', () => {
    const S = scopeAt(97.0, { raEmergencyHold: true, raLaneOffset: 4.2 }); step(S);
    S.rNow = 97.5; S.throttleInput = 0.4; step(S);
    expect(S.throttleInput).toBe(0.4);
  });
});
