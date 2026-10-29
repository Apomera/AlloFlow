import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, liveFuelSample;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('          var accelG = ');
  const end = source.indexOf('          if (Math.abs(car.speed) > 1)', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate the live fuel sample');
  liveFuelSample = new Function('car', 'accel', 'timeRef', 'scn', 'veh', 'MS_TO_MPH',
    'instantMPG', source.slice(start, end) + '\nreturn { accelG: accelG, mpg: mpg };');
});

function sample(speed, acceleration, vehicleId = 'sedan') {
  return liveFuelSample({ speed }, acceleration, { current: 600 }, { weather: 'clear' },
    RR.VEHICLES.find(vehicle => vehicle.id === vehicleId), RR.MS_TO_MPH, RR.instantMPG);
}

describe('driving fuel demand follows the direction of motion', () => {
  it.each(['sedan', 'ev', 'hybrid'])('charges %s acceleration energy equally while driving or reversing', vehicle => {
    const forward = sample(5, 2, vehicle);
    const reverse = sample(-5, -2, vehicle);
    expect(forward.accelG).toBeGreaterThan(0);
    expect(reverse.accelG).toBeCloseTo(forward.accelG, 10);
    expect(reverse.mpg).toBeCloseTo(forward.mpg, 10);
    expect(reverse.mpg).toBeLessThan(sample(-5, 0, vehicle).mpg);
  });

  it('does not treat braking in reverse as powered acceleration', () => {
    const forward = sample(5, -2);
    const reverse = sample(-5, 2);
    expect(forward.accelG).toBe(0);
    expect(reverse.accelG).toBe(0);
    expect(reverse.mpg).toBeCloseTo(forward.mpg, 10);
    expect(reverse.mpg).toBeCloseTo(sample(-5, 0).mpg, 10);
  });

  it('keeps steady-speed fuel demand independent of forward or reverse travel', () => {
    expect(sample(-5, 0)).toEqual(sample(5, 0));
  });

  it('has no acceleration-energy charge after the speed integrator clamps a full stop', () => {
    const forwardStop = RR.integrateDrivingSpeed(0.1, -2, 0.1, 'D');
    const reverseStop = RR.integrateDrivingSpeed(-0.1, 2, 0.1, 'R');
    expect(forwardStop).toBe(0);
    expect(Math.abs(reverseStop)).toBe(0);
    expect(sample(forwardStop, -2)).toEqual({ accelG: 0, mpg: 0 });
    expect(sample(reverseStop, 2)).toEqual({ accelG: 0, mpg: 0 });
  });
});
