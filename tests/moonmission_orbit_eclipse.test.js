/** Finite-disc parking-orbit eclipses and physically timed contact predictions. */
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const EARTH = 6371000, ALTITUDE = 185000, MU = 3.986004418e14;
const RADIUS = EARTH + ALTITUDE;
const OMEGA = Math.sqrt(MU / RADIUS ** 3), PERIOD = 2 * Math.PI / OMEGA;
const SUN_ANGLE = Math.asin(695700000 / 149597870700);
const EARTH_ANGLE = Math.asin(EARTH / RADIUS);
const MIDNIGHT = 3 * PERIOD / 4;
const SUNSET = MIDNIGHT - EARTH_ANGLE / OMEGA;
const SUNRISE = MIDNIGHT + EARTH_ANGLE / OMEGA;
const CONTACTS = [
  { type: 'partial-entry', time: SUNSET - SUN_ANGLE / OMEGA, before: 'sunlit', after: 'partial', margin: 'partialMargin' },
  { type: 'total-entry', time: SUNSET + SUN_ANGLE / OMEGA, before: 'partial', after: 'total', margin: 'totalMargin' },
  { type: 'total-exit', time: SUNRISE - SUN_ANGLE / OMEGA, before: 'total', after: 'partial', margin: 'totalMargin' },
  { type: 'partial-exit', time: SUNRISE + SUN_ANGLE / OMEGA, before: 'partial', after: 'sunlit', margin: 'partialMargin' },
];
const LIGHT_FIELDS = ['fraction', 'partialMargin', 'totalMargin', 'separation', 'sunAngularRadius', 'earthAngularRadius', 'directionX', 'directionY'];
let P;
beforeAll(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

// Integrate vertical strips of the apparent solar disc. This is independent
// of the renderer's analytic circular-lens overlap calculation.
function visibleSolarFraction(separation) {
  const count = 20000, dx = 2 * SUN_ANGLE / count;
  let covered = 0;
  for (let i = 0; i < count; i++) {
    const x = -SUN_ANGLE + (i + 0.5) * dx;
    const sunHeight = Math.sqrt(Math.max(0, SUN_ANGLE ** 2 - x * x));
    const earthHeight = Math.sqrt(Math.max(0, EARTH_ANGLE ** 2 - (x - separation) ** 2));
    covered += 2 * Math.min(sunHeight, earthHeight) * dx;
  }
  return Math.max(0, Math.min(1, 1 - covered / (Math.PI * SUN_ANGLE ** 2)));
}

function expectedNextContact(time) {
  const cycle = Math.floor(time / PERIOD), candidates = [];
  for (let lap = cycle - 1; lap <= cycle + 2; lap++) {
    for (const contact of CONTACTS) candidates.push({ type: contact.type, time: contact.time + lap * PERIOD });
  }
  return candidates.filter(contact => contact.time > time + 1e-7).sort((a, b) => a.time - b.time)[0];
}

function expectLightEqual(a, b, precision = 11) {
  expect(a.phase).toBe(b.phase);
  for (const key of LIGHT_FIELDS) {
    // Subtracting large Earth-disc lens terms loses a few fraction digits:
    // independent adaptive quadrature found < 2.6e-9 absolute error, while
    // symmetric positions through 100 laps differed by < 4.6e-9. Angles and
    // directions retain the tighter tolerance below.
    if (key === 'fraction') expect(Math.abs(a[key] - b[key]), key).toBeLessThan(1e-8);
    else expect(a[key], key).toBeCloseTo(b[key], precision);
  }
}

describe('parking-orbit finite solar disc', () => {
  it('places noon and midnight opposite one another under the fixed +X Sun', () => {
    expect(P.orbitSnapshot(0).period).toBeCloseTo(PERIOD, 9);
    for (const [time, phase, fraction, separation] of [
      [0, 'sunlit', 1, Math.PI / 2],
      [PERIOD / 4, 'sunlit', 1, Math.PI],
      [PERIOD / 2, 'sunlit', 1, Math.PI / 2],
      [MIDNIGHT, 'total', 0, 0],
      [PERIOD, 'sunlit', 1, Math.PI / 2],
    ]) {
      const light = P.orbitIllumination(time);
      expect(light.phase).toBe(phase); expect(light.fraction).toBe(fraction);
      expect(light.separation).toBeCloseTo(separation, 12);
      expect(light.earthAngularRadius).toBeCloseTo(EARTH_ANGLE, 13);
      expect(light.sunAngularRadius).toBeCloseTo(SUN_ANGLE, 14);
      expect(light.directionX).toBe(1); expect(light.directionY).toBe(0);
    }
  });

  it('matches independent solar-disc integration during both sunset and sunrise', () => {
    for (const lap of [0, 3]) for (const side of [-1, 1]) {
      for (const offset of [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]) {
        const separation = EARTH_ANGLE + offset * SUN_ANGLE;
        const time = MIDNIGHT + side * separation / OMEGA + lap * PERIOD;
        const light = P.orbitIllumination(time);
        expect(light.phase).toBe('partial');
        expect(light.separation).toBeCloseTo(separation, 12);
        expect(Math.abs(light.fraction - visibleSolarFraction(separation))).toBeLessThan(0.00003);
        expect(light.fraction).toBeGreaterThan(0); expect(light.fraction).toBeLessThan(1);
      }
    }
  });

  it('dims and brightens monotonically across the finite penumbra without endpoint jumps', () => {
    for (const [start, finish, direction] of [[CONTACTS[0].time, CONTACTS[1].time, -1], [CONTACTS[2].time, CONTACTS[3].time, 1]]) {
      let previous = P.orbitIllumination(start - 0.01).fraction;
      for (let i = 0; i <= 80; i++) {
        const fraction = P.orbitIllumination(start + (finish - start) * i / 80).fraction;
        expect(direction * (fraction - previous)).toBeGreaterThanOrEqual(-1e-8);
        expect(fraction).toBeGreaterThanOrEqual(0); expect(fraction).toBeLessThanOrEqual(1);
        previous = fraction;
      }
      for (const contact of [start, finish]) {
        const before = P.orbitIllumination(contact - 0.001), after = P.orbitIllumination(contact + 0.001);
        expect(Math.abs(after.fraction - before.fraction)).toBeLessThan(0.00005);
      }
    }
  });

  it('repeats each orbit and is symmetric about the antisolar line', () => {
    for (const offset of [0, 0.3, EARTH_ANGLE - SUN_ANGLE / 2, EARTH_ANGLE, EARTH_ANGLE + SUN_ANGLE / 2, Math.PI / 2]) {
      const before = MIDNIGHT - offset / OMEGA, after = MIDNIGHT + offset / OMEGA;
      const light = P.orbitIllumination(before);
      expectLightEqual(light, P.orbitIllumination(after));
      expectLightEqual(light, P.orbitIllumination(before + PERIOD));
      const nextLap = P.orbitIllumination(before + PERIOD);
      expect(nextLap.nextContact.type).toBe(light.nextContact.type);
      expect(nextLap.nextContact.time - light.nextContact.time).toBeCloseTo(PERIOD, 8);
      expect(nextLap.nextContact.seconds).toBeCloseTo(light.nextContact.seconds, 8);
    }
  });

  it('joins injection sunlight continuously at the same physical initial position', () => {
    const initial = Object.freeze(P.tliInitialState(25000));
    const before = JSON.stringify(initial);
    for (const time of [0, PERIOD / 4, MIDNIGHT, SUNSET, SUNRISE, SUNSET + PERIOD, 1000000]) {
      expectLightEqual(P.orbitIllumination(time), P.tliSunlight(initial, time));
    }
    expect(JSON.stringify(initial)).toBe(before);
  });
});

describe('parking-orbit eclipse contact predictions', () => {
  it.each(CONTACTS)('predicts $type at a real phase boundary and advances to the following contact', contact => {
    for (const lap of [0, 2, 100]) {
      const time = contact.time + lap * PERIOD;
      const before = P.orbitIllumination(time - 0.02), exact = P.orbitIllumination(time), after = P.orbitIllumination(time + 0.02);
      expect(before.phase).toBe(contact.before); expect(after.phase).toBe(contact.after);
      expect(before.nextContact.type).toBe(contact.type);
      expect(before.nextContact.time).toBeCloseTo(time, 7);
      expect(before.nextContact.seconds).toBeCloseTo(0.02, 7);
      expect(Math.abs(exact[contact.margin])).toBeLessThan(1e-11);
      for (const [now, light] of [[time, exact], [time + 0.02, after]]) {
        const expected = expectedNextContact(now);
        expect(light.nextContact.type).toBe(expected.type);
        expect(light.nextContact.time).toBeCloseTo(expected.time, 7);
        expect(light.nextContact.time).toBeGreaterThan(now + 1e-7);
        expect(light.nextContact.seconds).toBeCloseTo(light.nextContact.time - now, 9);
      }
    }
  });

  it('keeps predictions forward through full orbits and beyond the final inspection time', () => {
    for (const time of [0, 100, PERIOD, 14.37 * PERIOD, 123.9 * PERIOD, 999999, 1000000]) {
      const light = P.orbitIllumination(time), expected = expectedNextContact(time);
      expect(light.nextContact.type).toBe(expected.type);
      expect(light.nextContact.time).toBeCloseTo(expected.time, 7);
      expect(light.nextContact.seconds).toBeGreaterThan(0);
      expect(light.nextContact.seconds).toBeLessThan(PERIOD);
      expect(light.nextContact.seconds).toBeCloseTo(expected.time - time, 7);
    }
    expect(P.orbitIllumination(1000000).nextContact.time).toBeGreaterThan(1000000);
  });

  it('reports the same physically derived penumbra duration at entry and exit', () => {
    const expected = 2 * SUN_ANGLE / OMEGA;
    expect(expected).toBeGreaterThan(7); expect(expected).toBeLessThan(9);
    for (const time of [0, SUNSET, MIDNIGHT, SUNRISE, 999999]) {
      expect(P.orbitIllumination(time).penumbraSeconds).toBeCloseTo(expected, 10);
    }
    expect(CONTACTS[1].time - CONTACTS[0].time).toBeCloseTo(expected, 10);
    expect(CONTACTS[3].time - CONTACTS[2].time).toBeCloseTo(expected, 10);
  });

  it('targets forward central-limb crossings for sunset and sunrise inspection', () => {
    for (const [field, first] of [['inspectSunsetTime', SUNSET], ['inspectSunriseTime', SUNRISE]]) {
      for (const lap of [0, 2, 100]) {
        const event = first + lap * PERIOD;
        const before = P.orbitIllumination(event - 0.02)[field];
        const exact = P.orbitIllumination(event)[field];
        const after = P.orbitIllumination(event + 0.02)[field];
        expect(before).toBeCloseTo(event, 7);
        expect(exact).toBeCloseTo(event + PERIOD, 7);
        expect(after).toBeCloseTo(event + PERIOD, 7);
        const light = P.orbitIllumination(before);
        expect(light.phase).toBe('partial');
        expect(light.separation).toBeCloseTo(EARTH_ANGLE, 11);
        expect(Math.abs(light.fraction - visibleSolarFraction(EARTH_ANGLE))).toBeLessThan(0.00003);
      }
      expect(P.orbitIllumination(1000000)[field]).toBe(1000000);
    }
  });

  it('disables inspection when its next real crossing exceeds the model limit', () => {
    const limit = 1000000;
    for (const [available, target, first] of [
      ['inspectSunsetAvailable', 'inspectSunsetTime', SUNSET],
      ['inspectSunriseAvailable', 'inspectSunriseTime', SUNRISE],
    ]) {
      const lastCrossing = first + Math.floor((limit - first) / PERIOD) * PERIOD;
      const early = P.orbitIllumination(0), before = P.orbitIllumination(lastCrossing - 0.02);
      expect(early[available]).toBe(true); expect(early.timeLimited).toBe(false);
      expect(before[available]).toBe(true);
      expect(before[target]).toBeCloseTo(lastCrossing, 7);
      expect(before.timeLimited).toBe(false);
      // A clamped target is not an accessible eclipse. Once the final real
      // crossing passes, its button must disable even before playback ends.
      for (const time of [lastCrossing, lastCrossing + 0.02, limit - 0.001]) {
        const light = P.orbitIllumination(time);
        expect(light[available]).toBe(false);
        expect(light[target]).toBe(limit);
        expect(light.timeLimited).toBe(false);
      }
      for (const time of [limit, limit + 1, Number.MAX_VALUE]) {
        const light = P.orbitIllumination(time);
        expect(light[available]).toBe(false);
        expect(light[target]).toBe(limit);
        expect(light.timeLimited).toBe(true);
      }
    }
  });

  it('normalizes invalid, negative and oversized times like the circular orbit reference', () => {
    for (const time of [undefined, null, NaN, Infinity, -Infinity, -1, '100', {}, [], false, true, Number.MAX_VALUE, 1000001]) {
      const normalized = P.orbitSnapshot(time).time;
      expect(P.orbitIllumination(time)).toEqual(P.orbitIllumination(normalized));
    }
    const snapshot = P.orbitSnapshot(SUNSET, 120), saved = JSON.stringify(snapshot);
    const light = P.orbitIllumination(SUNSET);
    light.nextContact.time = -1; light.fraction = -1;
    expect(JSON.stringify(P.orbitSnapshot(SUNSET, 120))).toBe(saved);
    expect(P.orbitIllumination(SUNSET).nextContact.time).toBeGreaterThan(SUNSET);
    expect(P.orbitIllumination(SUNSET).fraction).toBeGreaterThan(0);
  });
});
