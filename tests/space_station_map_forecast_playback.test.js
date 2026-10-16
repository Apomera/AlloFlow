import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { playback, forecast, at, drive, lighting } = new Function(
  source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) +
  '\nreturn { playback: issMapForecastPlayback, forecast: issMapDriveForecast, at: issMapForecastAt, drive: issMapDriveStep, lighting: issMapLighting };'
)();
const radians = Math.PI / 180;
const radiusRatio = 6371 / (6371 + 420);
const period = 2 * Math.PI * Math.sqrt((6371 + 420) ** 3 / 398600.4418);
const orbitRate = 360 / period;

function clockForecast(events = [], horizonSeconds = 600) {
  return { horizonSeconds, sunlight: { events } };
}

function grazingForecast() {
  const halfAngle = 5 * orbitRate / 2 * radians;
  const beta = Math.acos(Math.sqrt(1 - radiusRatio ** 2) / Math.cos(halfAngle)) / radians;
  return forecast({
    phase: 180 - 7.5 * orbitRate, beta,
    tracking: true, motorEnabled: true, motorSmooth: true,
    motorRate: .1, motorAcceleration: .002,
    actualAlpha: 0, actualFeather: 10, actualAlphaRate: .03, actualFeatherRate: -.02
  }, 60);
}

function freezeDeep(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

describe('space station map forecast playback clock', () => {
  it.each([.1, 1, 10, 60, '.1', '1', '10', '60'])(
    'advances continuously at the supported rate %s', rate => {
      expect(playback(clockForecast(), { seconds: 5.25, rate }, .125)).toEqual({
        seconds: 5.25 + .125 * Number(rate), playing: true,
        rate: Number(rate), stopAtCrossings: false, stopReason: null
      });
    }
  );

  it('defaults invalid rates to 60 without accepting arbitrary speeds', () => {
    for (const rate of [undefined, null, '', NaN, Infinity, -Infinity, 0, -1, 2, 'bad', true, false]) {
      const result = playback(clockForecast(), { seconds: 2, rate }, .1);
      expect(result.rate, String(rate)).toBe(60);
      expect(result.seconds, String(rate)).toBe(8);
    }
  });

  it('sanitizes elapsed wall time and caps a delayed frame at one quarter second', () => {
    for (const wall of [undefined, null, '', NaN, Infinity, -Infinity, 'bad', -1]) {
      expect(playback(clockForecast(), { seconds: 12.5, rate: 10 }, wall).seconds).toBe(12.5);
    }
    expect(playback(clockForecast(), { seconds: 12.5, rate: 10 }, 20).seconds).toBe(15);
    expect(playback(clockForecast(), { seconds: 12.5, rate: 10 }, '.125').seconds).toBe(13.75);
  });

  it('sanitizes and clamps the starting time to the forecast horizon', () => {
    for (const seconds of [undefined, null, '', NaN, Infinity, -Infinity, 'bad', -5]) {
      expect(playback(clockForecast(), { seconds, rate: 1 }, 0).seconds).toBe(0);
    }
    expect(playback(clockForecast(), { seconds: '12.125', rate: 1 }, 0).seconds).toBe(12.125);
    expect(playback(clockForecast(), { seconds: 900, rate: 1 }, 0)).toMatchObject({
      seconds: 600, playing: false, stopReason: { type: 'end', seconds: 600, index: -1 }
    });
  });

  it('requires the literal true option to stop at crossings', () => {
    const result = clockForecast([{ type: 'sunset', seconds: 5 }]);
    for (const stopAtCrossings of [undefined, null, false, 0, 1, 'true']) {
      expect(playback(result, { seconds: 0, rate: 60, stopAtCrossings }, .25)).toMatchObject({
        seconds: 15, playing: true, stopAtCrossings: false, stopReason: null
      });
    }
  });

  it('returns a stopped empty state when no forecast exists', () => {
    expect(playback(null, { seconds: 12, rate: 10, stopAtCrossings: true }, .25)).toEqual({
      seconds: 0, playing: false, rate: 10, stopAtCrossings: true, stopReason: null
    });
    expect(playback(null)).toEqual({
      seconds: 0, playing: false, rate: 60, stopAtCrossings: false, stopReason: null
    });
  });

  it('lands exactly on a fractional horizon when a frame overshoots it', () => {
    const result = forecast({}, 32.125);
    expect(playback(result, { seconds: 31.9, rate: 60 }, .25)).toEqual({
      seconds: 32.125, playing: false, rate: 60, stopAtCrossings: false,
      stopReason: { type: 'end', seconds: 32.125, index: -1 }
    });
    expect(playback(result, { seconds: 31.875, rate: 1 }, .25).stopReason).toEqual({
      type: 'end', seconds: 32.125, index: -1
    });
  });

  it('ends a zero-duration forecast even without a wall-time increment', () => {
    expect(playback(forecast({}, 0), { rate: .1, stopAtCrossings: true }, 0)).toEqual({
      seconds: 0, playing: false, rate: .1, stopAtCrossings: true,
      stopReason: { type: 'end', seconds: 0, index: -1 }
    });
  });

  it('stops at the first crossing even when one frame would pass both edges', () => {
    const result = grazingForecast();
    expect(result.sunlight.events.map(event => event.type)).toEqual(['sunset', 'sunrise']);
    expect(result.sunlight.events[0].seconds).toBeCloseTo(5, 7);
    expect(result.sunlight.events[1].seconds).toBeCloseTo(10, 7);
    const stopped = playback(result, { seconds: 0, rate: 60, stopAtCrossings: true }, .25);
    expect(stopped).toMatchObject({
      seconds: result.sunlight.events[0].seconds, playing: false,
      stopReason: { ...result.sunlight.events[0], index: 0 }
    });
  });

  it('resumes from the exact sunset to the sunrise instead of stopping again at sunset', () => {
    const result = grazingForecast();
    const sunset = result.sunlight.events[0];
    const sunrise = result.sunlight.events[1];
    const resumed = playback(result, { seconds: sunset.seconds, rate: 60, stopAtCrossings: true }, .25);
    expect(resumed).toMatchObject({
      seconds: sunrise.seconds, playing: false, stopReason: { ...sunrise, index: 1 }
    });
    expect(playback(result, { seconds: resumed.seconds, rate: 60, stopAtCrossings: true }, .25)).toMatchObject({
      seconds: sunrise.seconds + 15, playing: true, stopReason: null
    });
  });

  it('does not skip an imminent edge or merge extremely close consecutive crossings', () => {
    const first = 2;
    const second = first + 1e-10;
    const result = clockForecast([
      { type: 'sunset', seconds: first }, { type: 'sunrise', seconds: second }
    ]);
    const before = playback(result, { seconds: first - 1e-10, rate: 60, stopAtCrossings: true }, .25);
    expect(before.seconds).toBe(first);
    expect(before.stopReason).toEqual({ type: 'sunset', seconds: first, index: 0 });
    const resumed = playback(result, { seconds: before.seconds, rate: 60, stopAtCrossings: true }, .25);
    expect(resumed.seconds).toBe(second);
    expect(resumed.stopReason).toEqual({ type: 'sunrise', seconds: second, index: 1 });
  });

  it('captures a crossing exactly at the frame target but not a later one', () => {
    const result = clockForecast([{ type: 'sunset', seconds: 4.25 }]);
    expect(playback(result, { seconds: 4, rate: 1, stopAtCrossings: true }, .25)).toMatchObject({
      seconds: 4.25, playing: false, stopReason: { type: 'sunset', seconds: 4.25, index: 0 }
    });
    expect(playback(result, { seconds: 4, rate: 1, stopAtCrossings: true }, .125)).toMatchObject({
      seconds: 4.125, playing: true, stopReason: null
    });
  });

  it('continues across multiple crossings with the stop option disabled', () => {
    const result = grazingForecast();
    expect(playback(result, { seconds: 0, rate: 60, stopAtCrossings: false }, .25)).toMatchObject({
      seconds: 15, playing: true, stopReason: null
    });
  });

  it('continues through an event-free interval in sunlight or already inside shadow', () => {
    for (const options of [{ phase: 180, beta: 80 }, { phase: 180, beta: 0 }]) {
      const result = forecast(options, 60);
      expect(result.sunlight.events).toEqual([]);
      expect(playback(result, { seconds: 0, rate: 60, stopAtCrossings: true }, .25)).toMatchObject({
        seconds: 15, playing: true, stopReason: null
      });
    }
  });

  it('does not re-stop at an analytical crossing that is the initial orbital phase', () => {
    const light = lighting({ beta: 20 });
    for (const phase of [light.eclipseStart, light.eclipseEnd]) {
      const result = forecast({ phase, beta: 20 }, 60);
      expect(result.sunlight.events).toEqual([]);
      expect(playback(result, { seconds: 0, rate: 60, stopAtCrossings: true }, .25)).toMatchObject({
        seconds: 15, playing: true, stopReason: null
      });
    }
  });

  it('has the same clock result for equivalent frame partitions before or at a crossing', () => {
    function run(result, pieces, stopAtCrossings) {
      let state = { seconds: 12.375, rate: 10, stopAtCrossings, playing: true };
      for (const wall of pieces) {
        if (!state.playing) break;
        state = playback(result, state, wall);
      }
      return state;
    }
    for (const events of [[], [{ type: 'sunset', seconds: 14 }]]) {
      const result = clockForecast(events);
      const expected = run(result, [.25], true);
      expect(run(result, [.125, .0625, .0625], true)).toEqual(expected);
      expect(run(result, [.0625, .125, .0625], true)).toEqual(expected);
    }
  });

  it('does not mutate the forecast, options, or analytical event objects', () => {
    const result = freezeDeep(grazingForecast());
    const options = freezeDeep({ seconds: 0, rate: 60, stopAtCrossings: true });
    const original = JSON.stringify({ result, options });
    const stopped = playback(result, options, .25);
    expect(stopped.stopReason).not.toBe(result.sunlight.events[0]);
    stopped.stopReason.seconds = -1;
    expect(JSON.stringify({ result, options })).toBe(original);
    expect(playback(result, options, .25).seconds).toBe(result.sunlight.events[0].seconds);
  });

  it('samples a stopped crossing with the actual acceleration-limited motor state and rates', () => {
    const result = grazingForecast();
    const stopped = playback(result, { seconds: 0, rate: 60, stopAtCrossings: true }, .25);
    const pose = at(result, stopped.seconds);
    const expected = drive(result.base, stopped.seconds);
    expect(pose.seconds).toBe(stopped.seconds);
    for (const key of ['phase', 'alpha', 'feather', 'alphaRate', 'featherRate', 'jointError', 'errorAngle']) {
      expect(pose[key], key).toBeCloseTo(expected[key], 10);
    }
    expect(Math.abs(pose.alphaRate)).toBeGreaterThan(0);
    expect(Math.abs(pose.featherRate)).toBeGreaterThan(0);
    const resumed = drive({
      ...result.base, phase: pose.phase,
      actualAlpha: pose.alpha, actualFeather: pose.feather,
      actualAlphaRate: pose.alphaRate, actualFeatherRate: pose.featherRate
    }, 0);
    expect(resumed.alphaRate).toBe(pose.alphaRate);
    expect(resumed.featherRate).toBe(pose.featherRate);
  });
});
