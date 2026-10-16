import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const lighting = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn issMapLighting;')();
const earthRadius = 6371, orbitRadius = earthRadius + 420;
const period = 2 * Math.PI * Math.sqrt(orbitRadius ** 3 / 398600.4418);
const degrees = 180 / Math.PI;
const criticalBeta = Math.asin(earthRadius / orbitRadius) * degrees;

function boundaries(beta) {
  const halfAngle = Math.acos(Math.sqrt(1 - (earthRadius / orbitRadius) ** 2) / Math.cos(beta / degrees)) * degrees;
  return { start: 180 - halfAngle, end: 180 + halfAngle };
}

describe('space station map sunlight and cylindrical Earth shadow', () => {
  it('uses the 420 km circular period and a unit Sun direction at every wrapped orbital phase', () => {
    for (const beta of [0, 20, 60, 80]) {
      for (const phase of [0, 45, 90, 180, 270, 359.999]) {
        const state = lighting({ phase, beta });
        expect(state.periodSeconds).toBeCloseTo(period, 10);
        expect(Math.hypot(...state.sun)).toBeCloseTo(1, 13);
        expect(state.sun[0]).toBeCloseTo(Math.sin(beta / degrees), 13);
        expect(state.sun[1]).toBeCloseTo(Math.cos(beta / degrees) * Math.cos(phase / degrees), 13);
        expect(state.sun[2]).toBeCloseTo(Math.cos(beta / degrees) * Math.sin(phase / degrees), 13);
      }
    }
    expect(lighting({ phase: 0, beta: 0 }).sun).toEqual([0, 1, 0]);
    for (const [input, wrapped] of [[360, 0], [720, 0], [-90, 270], [-450, 270], [1080.25, .25], [-1080.25, 359.75]]) {
      expect(lighting({ phase: input, beta: 20 })).toEqual(lighting({ phase: wrapped, beta: 20 }));
    }
  });

  it('enters shadow only behind Earth and strictly inside its cylindrical limb', () => {
    expect(lighting({ phase: 0, beta: 0 }).eclipse).toBe(false);
    expect(lighting({ phase: 180, beta: 0 }).eclipse).toBe(true);
    for (const phase of [90, 270]) expect(lighting({ phase, beta: 0 }).eclipse).toBe(false);
    for (const beta of [0, 20, 60]) {
      const { start, end } = boundaries(beta);
      for (const [phase, shadow] of [[start - 1e-4, false], [start + 1e-4, true], [end - 1e-4, true], [end + 1e-4, false]]) {
        const state = lighting({ phase, beta });
        const closestEarthDistanceSquared = orbitRadius ** 2 * (1 - state.sun[1] ** 2);
        expect(state.sun[1]).toBeLessThan(0);
        expect(closestEarthDistanceSquared < earthRadius ** 2).toBe(shadow);
        expect(state.eclipse).toBe(shadow);
      }
    }
  });

  it('shortens eclipse as beta increases and removes both events at the grazing-orbit cutoff', () => {
    let previous = Infinity;
    for (const beta of [0, 20, 40, 60, criticalBeta - 1e-4]) {
      const state = lighting({ phase: 180, beta }), expected = boundaries(beta);
      expect(state.eclipseStart).toBeCloseTo(expected.start, 9);
      expect(state.eclipseEnd).toBeCloseTo(expected.end, 9);
      expect(state.eclipseMinutes).toBeCloseTo((expected.end - expected.start) / 360 * period / 60, 9);
      expect(state.eclipseMinutes).toBeGreaterThan(0);
      expect(state.eclipseMinutes).toBeLessThan(previous);
      expect(state.eclipse).toBe(true);
      previous = state.eclipseMinutes;
    }
    for (const beta of [criticalBeta, criticalBeta + 1e-4, 80]) {
      for (const phase of [0, 90, 180, 270]) {
        expect(lighting({ phase, beta })).toMatchObject({ eclipse: false, eclipseStart: null, eclipseEnd: null, eclipseMinutes: 0, nextEvent: 'none', untilEventSeconds: null, generation: 1 });
      }
    }
  });

  it('normalizes parked array normals and uses front-face cosine incidence', () => {
    const phase = 50, beta = 35, sun = lighting({ phase, beta }).sun;
    const normal = sun.map(value => value * 7), original = normal.slice();
    const aligned = lighting({ phase, beta, tracking: false, normal });
    expect(aligned.incidence).toBeCloseTo(1, 13);
    expect(aligned.generation).toBeCloseTo(1, 13);
    expect(normal).toEqual(original);
    expect(lighting({ phase, beta, tracking: false, normal: normal.map(value => -value) })).toMatchObject({ incidence: 0, generation: 0 });
    expect(lighting({ phase, beta, tracking: false, normal: [0, 7, 0] }).incidence).toBeCloseTo(sun[1], 13);
    expect(lighting({ phase, beta, tracking: false, normal: [7, 0, 0] }).incidence).toBeCloseTo(sun[0], 13);
    expect(lighting({ phase, beta, tracking: false, normal: [0, 0, 7] }).incidence).toBeCloseTo(sun[2], 13);
    expect(lighting({ phase, beta, tracking: false }).incidence).toBeCloseTo(sun[1], 13);
    const diagonal = lighting({ phase, beta, tracking: false, normal: [1, 2, 3] });
    expect(diagonal.incidence).toBeCloseTo((sun[0] + 2 * sun[1] + 3 * sun[2]) / Math.sqrt(14), 13);
    expect(diagonal.generation).toBeCloseTo(diagonal.incidence, 13);
  });

  it('blocks generation in eclipse even for perfectly tracked or Sun-facing parked arrays', () => {
    const tracked = lighting({ phase: 180, beta: 0 });
    expect(tracked).toMatchObject({ eclipse: true, incidence: 1, generation: 0 });
    expect(lighting({ phase: 180, beta: 0, tracking: false, normal: [0, -1, 0] })).toMatchObject({ eclipse: true, incidence: 1, generation: 0 });
    expect(lighting({ phase: 90, beta: 0, normal: [0, -1, 0] })).toMatchObject({ eclipse: false, incidence: 1, generation: 1 });
    const nightSideButOutsideShadow = lighting({ phase: 180, beta: 80, tracking: false });
    expect(nightSideButOutsideShadow).toMatchObject({ eclipse: false, incidence: 0, generation: 0 });
    expect(lighting({ phase: 180, beta: 80 })).toMatchObject({ eclipse: false, incidence: 1, generation: 1 });
  });

  it('counts down to the next sunrise or sunset continuously through the phase wrap', () => {
    for (const beta of [0, 20, 60]) {
      const { start, end } = boundaries(beta);
      for (const phase of [0, start - .01, start + .01, 180, end - .01, end + .01, 359.99]) {
        const state = lighting({ phase, beta }), inShadow = phase > start && phase < end;
        const eventPhase = inShadow ? end : start;
        const remainingAngle = (eventPhase - phase + 360) % 360;
        expect(state.nextEvent).toBe(inShadow ? 'sunrise' : 'sunset');
        expect(state.untilEventSeconds).toBeCloseTo(remainingAngle / 360 * period, 9);
        expect(state.untilEventSeconds).toBeGreaterThan(0);
        expect(state.untilEventSeconds).toBeLessThan(period);
        const afterEvent = lighting({ phase: phase + remainingAngle + .001, beta });
        expect(afterEvent.eclipse).toBe(!inShadow);
        expect(afterEvent.nextEvent).toBe(inShadow ? 'sunset' : 'sunrise');
      }
      const beforeWrap = lighting({ phase: 359, beta }), afterWrap = lighting({ phase: 1, beta });
      expect(beforeWrap.untilEventSeconds - afterWrap.untilEventSeconds).toBeCloseTo(2 / 360 * period, 9);
    }
  });

  it('uses finite defaults for malformed settings while clamping beta and rejecting invalid normals', () => {
    const defaults = lighting({ phase: 35, beta: 20 });
    expect(lighting()).toEqual(defaults);
    expect(lighting(null)).toEqual(defaults);
    expect(lighting({})).toEqual(defaults);
    for (const invalid of [NaN, Infinity, -Infinity, 'corrupt']) {
      expect(lighting({ phase: invalid })).toEqual(defaults);
      expect(lighting({ beta: invalid })).toEqual(defaults);
    }
    for (const invalid of [null, undefined, '']) expect(lighting({ beta: invalid })).toEqual(defaults);
    expect(lighting({ beta: -20 })).toEqual(lighting({ beta: 0 }));
    expect(lighting({ beta: 120 })).toEqual(lighting({ beta: 80 }));
    for (const normal of [null, [], [1, 0], [0, 0, 0], [NaN, 1, 0], [0, Infinity, 0], ['bad', 1, 0], {}]) {
      expect(lighting({ tracking: false, normal })).toEqual(lighting({ tracking: false, normal: [0, 1, 0] }));
    }
    for (const tracking of [undefined, null, 0, 'false', true]) expect(lighting({ tracking })).toEqual(defaults);
  });
});
