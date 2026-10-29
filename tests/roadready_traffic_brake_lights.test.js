import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR, renderLamps;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  const source = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');
  const start = source.indexOf('              var tBlinkOn = t.blinker');
  const end = source.indexOf('              var nightLights =', start);
  if (start < 0 || end < 0) throw new Error('Cannot find live traffic lamp state');
  renderLamps = new Function('t', 'timeRef', 'ti', 'trafficBrakeLightState',
    source.slice(start, end) + '\nreturn { braking: isBraking, panic: aiHardPanic };');
});

function sample(actor, time) {
  const result = renderLamps(actor, { current: time }, 0, RR.trafficBrakeLightState);
  // The old renderer stores its previous speed after applying the lamps.
  actor._prevSpeed = actor.speed;
  return result;
}

describe('traffic brake lights reflect deceleration in simulation time', () => {
  it.each([30, 60, 144])('shows normal braking in either travel direction at %i Hz', hz => {
    for (const sign of [1, -1]) {
      const actor = { speed: sign * 12 };
      expect(sample(actor, 1).braking).toBe(false);
      actor.speed = sign * (12 - 3 / hz);
      expect(sample(actor, 1 + 1 / hz)).toEqual({ braking: true, panic: false });
    }
  });

  it.each([30, 60, 144])('recognizes hard braking consistently at %i Hz', hz => {
    const actor = { speed: 15 };
    sample(actor, 1);
    actor.speed -= 7 / hz;
    expect(sample(actor, 1 + 1 / hz)).toEqual({ braking: true, panic: true });
  });

  it('releases brake lights at a steady reduced cruising speed', () => {
    const actor = { speed: 5, _slowFor: 1 };
    sample(actor, 1);
    expect(sample(actor, 1.1)).toEqual({ braking: false, panic: false });
  });

  it('holds the lamps while stopped and releases them on acceleration', () => {
    const actor = { speed: 0 };
    expect(sample(actor, 1)).toEqual({ braking: true, panic: false });
    expect(sample(actor, 3).braking).toBe(true);
    actor.speed = 0.3;
    expect(sample(actor, 3.1)).toEqual({ braking: false, panic: false });
  });

  it('preserves the lamps through a render with no simulation advance', () => {
    const actor = { speed: 10 };
    sample(actor, 1);
    actor.speed = 9.7;
    expect(sample(actor, 1.1).braking).toBe(true);
    expect(sample(actor, 1.1).braking).toBe(true);
    expect(sample(actor, 1.2).braking).toBe(false);
  });

  it('uses elapsed time across skipped renders and resets for a fresh drive clock', () => {
    const actor = { speed: 12 };
    sample(actor, 5);
    actor.speed = 11.1;
    expect(sample(actor, 5.3)).toEqual({ braking: true, panic: false });
    expect(sample(actor, 0)).toEqual({ braking: false, panic: false });
  });
});
