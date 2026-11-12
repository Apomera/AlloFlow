import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 37, traffic lane (tf37): Ride-Along's one decision per yellow (ra33) kept a "go" it could no longer make.
// Lane sweep (lane3, downtown s2 t 83 to 86): on a yellow the car chose to go (8 m/s, 14 m from the line), braked for
// a driver turning across it, stopped 3 m short of the line, then set off again on the old "go" and crossed the line
// as the light turned red (scored red-light). Now a "go" becomes a stop once the car can stop and can no longer reach
// the line before the red; a "stop" never becomes a "go" (the ra33 rule that ended the opposite red-light run).
// The block is cut from the drive loop and run as written (stubbed inputs).

const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const src = readFileSync(TOOL, 'utf8');
let RR, block;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const a = src.indexOf('                var raIsRed = raControl.state === \'red\';');
  const b = src.indexOf('                if (raIsRed || (raIsYellow && raYellowWillStop)) {', a);
  if (a < 0 || b < 0) throw new Error('Ride-Along light block not found');
  block = new Function('scope', 'with (scope) {' + src.slice(a, b) + '\n return raYellowWillStop; }');
});

const light = { type: 'light', state: 'yellow', yellowDur: 3.5, timer: 0, x: 0, y: 0, _chunk: 7 };
const frame = (ras, ahead, speedMps, timer) => block({ ras, raControl: Object.assign({}, light, { timer }), raControlKey: 'light_7', raControlAhead: ahead,
  raSpeedMps: speedMps, raSpeedMph: speedMps * RR.MS_TO_MPH, scn: { weather: 'clear' }, car: { heading: 0 }, raWorld: null,
  stoppingDistance: RR.stoppingDistance, FT_PER_M: RR.FT_PER_M, rideAlongComfortStopMeters: RR.rideAlongComfortStopMeters,
  flaggerStopsDirection: RR.flaggerStopsDirection, mainRoadTravelSign: RR.mainRoadTravelSign, Number, Math });

describe('Road Ready tf37: a Ride-Along "go" on yellow that it can no longer make becomes a stop', () => {
  it('the downtown s2 case: go at 8 m/s 14 m out; slowed to 0.9 m/s 3 m out with 1.4 s of yellow left: stop (base: go, crossed on red)', () => {
    const ras = { stopControls: {} };
    expect(frame(ras, 14, 8, 0.6)).toBe(false);          // the go choice
    expect(frame(ras, 9, 6, 1.2)).toBe(false);           // still going
    expect(frame(ras, 3, 0.9, 2.1)).toBe(true);          // it braked for a turner: it can stop and cannot clear
    expect(frame(ras, 3, 0.2, 2.3)).toBe(true);          // and it stays a stop
  });

  it('a go that the car keeps making (steady speed to the line) stays a go', () => {
    const ras = { stopControls: {} };
    let ahead = 14, t = 0.6;
    expect(frame(ras, ahead, 8, t)).toBe(false);
    for (let i = 0; i < 15 && ahead > 0.5; i++) { ahead -= 0.8; t += 0.1; expect(frame(ras, ahead, 8, t), 'ahead ' + ahead.toFixed(1)).toBe(false); }
  });

  it('a stop never becomes a go (ra33): chose stop far out, slowed, near the line', () => {
    const ras = { stopControls: {} };
    expect(frame(ras, 45, 13, 0.2)).toBe(true);
    expect(frame(ras, 6, 3, 2.0)).toBe(true);
    expect(frame(ras, 2, 2, 2.4)).toBe(true);
  });
});
