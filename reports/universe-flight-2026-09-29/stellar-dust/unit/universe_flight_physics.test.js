import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let math;
beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  math = window.UniverseFlight.math;
});

const initialState = () => ({
  position: [1, 2, 3], yaw: 0, pitch: 0,
  distanceLy: 0, universeYears: 0, travelerYears: 0,
});
const settings = (overrides = {}) => ({
  mode: 'relativity', region: 'local', speed: 1, beta: 0.6,
  timeScale: 0.25, running: true, ...overrides,
});
const expectVectorClose = (actual, expected, digits = 11) => {
  expect(actual).toHaveLength(3);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], digits));
};

// Direction is observer -> source; the velocity axis is +Z. These checks
// distinguish this convention from the oppositely signed photon wavevector.
describe('Universe flight special relativity', () => {
  it('leaves directions, frequencies, and the clock rate unchanged at rest', () => {
    const direction = [0.6, 0, 0.8];
    expectVectorClose(math.aberrate(direction, 0), direction);
    expect(math.gamma(0)).toBe(1);
    for (const mu of [-1, -0.5, 0, 0.5, 1]) {
      expect(math.doppler(mu, 0)).toBe(1);
    }
  });

  it('matches known Lorentz factors', () => {
    expect(math.gamma(0.6)).toBeCloseTo(1.25, 12);
    expect(math.gamma(0.8)).toBeCloseTo(5 / 3, 12);
    expect(math.gamma(0.9)).toBeCloseTo(2.294157338705618, 12);
  });

  it('blueshifts forward sources and redshifts rear sources by reciprocal factors', () => {
    const ahead = math.doppler(1, 0.9);
    const behind = math.doppler(-1, 0.9);
    expect(ahead).toBeCloseTo(Math.sqrt(19), 12);
    expect(behind).toBeCloseTo(1 / Math.sqrt(19), 12);
    expect(ahead * behind).toBeCloseTo(1, 12);
    expectVectorClose(math.aberrate([0, 0, 1], 0.9), [0, 0, 1]);
    expectVectorClose(math.aberrate([0, 0, -1], 0.9), [0, 0, -1]);
  });

  it('moves a transverse source to 25.84 degrees ahead at 90% of light speed', () => {
    const direction = math.aberrate([1, 0, 0], 0.9);
    expectVectorClose(direction, [Math.sqrt(0.19), 0, 0.9]);
    expect(Math.acos(direction[2]) * 180 / Math.PI).toBeCloseTo(25.841932763167126, 10);
  });

  it('keeps the universe-frame and observer-frame transverse Doppler cases distinct', () => {
    // A universe-frame sideways source is blue; one seen sideways aboard is red.
    expect(math.doppler(0, 0.6)).toBeCloseTo(1.25, 12);
    const apparentSideways = math.aberrate([0.8, 0, -0.6], 0.6);
    expectVectorClose(apparentSideways, [1, 0, 0]);
    expect(math.doppler(-0.6, 0.6)).toBeCloseTo(0.8, 12);
  });

  it('preserves unit directions and finite positive frequencies through the speed limit', () => {
    for (const beta of [0, 0.6, 0.9, 0.99, 0.9999]) {
      for (const mu of [-1, -0.999999, -0.75, 0, 0.5, 0.999999, 1]) {
        const direction = [Math.sqrt(1 - mu * mu), 0, mu];
        const original = [...direction];
        const apparent = math.aberrate(direction, beta);
        expect(apparent.every(Number.isFinite)).toBe(true);
        expect(Math.hypot(...apparent)).toBeCloseTo(1, 9);
        expect(direction).toEqual(original);
        const doppler = math.doppler(mu, beta);
        expect(Number.isFinite(doppler)).toBe(true);
        expect(doppler).toBeGreaterThan(0);
      }
    }
    expect(Number.isFinite(math.gamma(0.9999))).toBe(true);
    // Unsupported light-speed input remains below c rather than producing infinity.
    expect(math.gamma(1)).toBe(math.gamma(0.9999));
  });
});

describe('Universe flight elapsed clocks and distance', () => {
  it('integrates universe time, ship proper time, and distance in compatible units', () => {
    const state = initialState();
    const before = structuredClone(state);
    const next = math.stepFlight(state, settings(), 0.08);
    // 0.25 universe years per real second * 0.08 seconds = 0.02 years.
    expect(next.universeYears).toBeCloseTo(0.02, 12);
    expect(next.travelerYears).toBeCloseTo(0.016, 12);
    expect(next.distanceLy).toBeCloseTo(0.012, 12);
    expectVectorClose(next.position, [1, 2, 3.012]);
    expect(state).toEqual(before);
  });

  it('accumulates proper time using each segment speed instead of the latest speed', () => {
    let state = initialState();
    state = math.stepFlight(state, settings({ beta: 0.6, timeScale: 1 }), 0.1);
    state = math.stepFlight(state, settings({ beta: 0.8, timeScale: 1 }), 0.1);
    expect(state.universeYears).toBeCloseTo(0.2, 12);
    expect(state.travelerYears).toBeCloseTo(0.14, 12);
    expect(state.distanceLy).toBeCloseTo(0.14, 12);
  });

  it('advances both clocks equally at rest without travelling', () => {
    const next = math.stepFlight(initialState(), settings({ beta: 0 }), 0.08);
    expect(next.universeYears).toBeCloseTo(0.02, 12);
    expect(next.travelerYears).toBeCloseTo(0.02, 12);
    expect(next.distanceLy).toBe(0);
    expectVectorClose(next.position, [1, 2, 3]);
  });

  it('holds position and both accumulated clocks while paused', () => {
    const state = { ...initialState(), universeYears: 4, travelerYears: 2, distanceLy: 3 };
    const next = math.stepFlight(state, settings({ running: false }), 0.1);
    expect(next).toEqual(state);
  });

  it('prevents a delayed animation frame from producing a large simulated jump', () => {
    const state = initialState();
    expect(math.stepFlight(state, settings(), 60)).toEqual(math.stepFlight(state, settings(), 0.1));
    expect(math.stepFlight(state, settings(), -1)).toEqual(state);
  });

  it('keeps free exploration from adding physical journey-clock readings', () => {
    const next = math.stepFlight(initialState(), settings({ mode: 'explore', speed: 2 }), 0.05);
    expectVectorClose(next.position, [1, 2, 3.1]);
    expect(next.distanceLy).toBeCloseTo(0.1, 12);
    expect(next.universeYears).toBe(0);
    expect(next.travelerYears).toBe(0);
  });
});

describe('Universe flight directional spectrum', () => {
  it('keeps an emitted visible line unchanged at rest for any sightline', () => {
    for (const [yaw, pitch] of [[0, 0], [Math.PI, 0], [Math.PI / 3, Math.PI / 6]]) {
      const spectrum = math.viewSpectrum(0, yaw, pitch, 550);
      expect(spectrum.doppler).toBe(1);
      expect(spectrum.observedNm).toBe(550);
      expect(spectrum.band).toBe('visible');
    }
  });

  it('distinguishes the forward sky from the redshifted light being chased behind', () => {
    const forward = math.viewSpectrum(0.9, 0, 0, 550);
    const behind = math.viewSpectrum(0.9, Math.PI, 0, 550);
    expect(forward.angleDeg).toBe(0);
    expect(behind.angleDeg).toBe(180);
    expect(forward.doppler).toBeCloseTo(Math.sqrt(19), 12);
    expect(behind.doppler).toBeCloseTo(1 / Math.sqrt(19), 12);
    expect(forward.observedNm).toBeCloseTo(550 / Math.sqrt(19), 10);
    expect(behind.observedNm).toBeCloseTo(550 * Math.sqrt(19), 10);
    expect(forward.band).toBe('ultraviolet');
    expect(behind.band).toBe('infrared');
  });

  it('uses the observer-frame transverse Doppler factor for side and overhead views', () => {
    for (const [yaw, pitch] of [[Math.PI / 2, 0], [0, Math.PI / 2]]) {
      const spectrum = math.viewSpectrum(0.9, yaw, pitch, 550);
      expect(spectrum.angleDeg).toBeCloseTo(90, 12);
      expect(spectrum.doppler).toBeCloseTo(Math.sqrt(0.19), 12);
      expect(spectrum.observedNm).toBeCloseTo(550 / Math.sqrt(0.19), 10);
      expect(spectrum.band).toBe('infrared');
    }
  });

  it('agrees with source-frame Doppler after aberrating an arbitrary source direction', () => {
    for (const beta of [0, 0.6, 0.9, 0.9999]) {
      for (const mu of [-1, -0.75, 0, 0.5, 1]) {
        const transverse = Math.sqrt(1 - mu * mu);
        const apparent = math.aberrate([transverse * 0.8, transverse * 0.6, mu], beta);
        const yaw = Math.atan2(apparent[0], apparent[2]);
        const pitch = Math.asin(apparent[1]);
        const spectrum = math.viewSpectrum(beta, yaw, pitch, 550);
        expect(spectrum.doppler).toBeCloseTo(math.doppler(mu, beta), 8);
      }
    }
  });

  it('identifies light shifted beyond ultraviolet at the supported speed limit', () => {
    const forward = math.viewSpectrum(0.9999, 0, 0, 550);
    const behind = math.viewSpectrum(0.9999, Math.PI, 0, 550);
    expect(forward.observedNm).toBeCloseTo(3.88918452758, 8);
    expect(forward.band).toBe('X-ray');
    expect(behind.band).toBe('infrared');
    for (const spectrum of [forward, behind]) {
      expect(Number.isFinite(spectrum.doppler)).toBe(true);
      expect(Number.isFinite(spectrum.observedNm)).toBe(true);
      expect(spectrum.observedNm).toBeGreaterThan(0);
    }
    expect(math.viewSpectrum(1, 0, 0, 550)).toEqual(forward);
  });

  it('labels representative wavelengths across the approximate spectrum bands', () => {
    for (const [wavelength, band] of [[0.001, 'gamma ray'], [1, 'X-ray'], [100, 'ultraviolet'], [550, 'visible'], [10000, 'infrared'], [1e9, 'radio']]) {
      expect(math.viewSpectrum(0, 0, 0, wavelength).band).toBe(band);
    }
  });
});

describe('Universe flight round-trip light clock', () => {
  it('measures the same two-second round trip in both frames at rest', () => {
    expect(math.lightClock(0, 1)).toEqual({
      shipSeconds: 2, starSeconds: 2,
      horizontalLightSeconds: 0, photonPathLightSeconds: 2,
    });
  });

  it('matches the 3-4-5 light-path triangle for a clock moving at 0.6c', () => {
    expect(math.lightClock(0.6, 1)).toEqual({
      shipSeconds: 2, starSeconds: 2.5,
      horizontalLightSeconds: 1.5, photonPathLightSeconds: 2.5,
    });
  });

  it('preserves elapsed proper time and light speed through the highest supported beta', () => {
    for (const beta of [0, 0.9, 0.9999]) {
      const clock = math.lightClock(beta, 1);
      expect(Object.values(clock).every(Number.isFinite)).toBe(true);
      expect(clock.starSeconds / math.gamma(beta)).toBeCloseTo(clock.shipSeconds, 12);
      expect(clock.photonPathLightSeconds / clock.starSeconds).toBe(1);
      expect(clock.starSeconds ** 2 - clock.horizontalLightSeconds ** 2).toBeCloseTo(clock.shipSeconds ** 2, 7);
      // Each leg has the unchanged transverse mirror gap and half the drift.
      expect(Math.hypot(1, clock.horizontalLightSeconds / 2)).toBeCloseTo(clock.photonPathLightSeconds / 2, 10);
    }
  });

  it('scales the complete round trip with mirror separation', () => {
    const unitClock = math.lightClock(0.9, 1);
    const largerClock = math.lightClock(0.9, 2.5);
    for (const key of Object.keys(unitClock)) {
      expect(largerClock[key]).toBeCloseTo(unitClock[key] * 2.5, 11);
    }
    expect(math.lightClock(0.9)).toEqual(unitClock);
  });
});
