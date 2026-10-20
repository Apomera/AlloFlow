import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;
const KTS_PER_FTS = 0.5924838;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
});

function state(overrides) {
  return Object.assign({ altitude: 3000, fieldElev: 76, speed: 110 / KTS_PER_FTS, vsi: 0,
    heading: 210, lat: 43.646, lon: -70.309, onGround: false, stalling: false, lowAirspeed: false }, overrides);
}

function controls(overrides) { return Object.assign({ bank: 0, throttle: 0.6 }, overrides); }

function advance(record, sample = state(), input = controls(), seconds = 1, context = {}) {
  return FS.advanceFlightChallenge(record, sample, input, seconds, context);
}

function frames(record, count, sample = state(), input = controls(), context = {}) {
  for (let i = 0; i < count; i += 1) record = advance(record, sample, input, 1, context);
  return record;
}

function touchdown(record, airport = 'kpwm', distance = 0.2, fpm = 150) {
  return advance(record, state({ altitude: 76, onGround: true }), controls(), 1,
    { landingScored: true, touchdownFPM: fpm, nearestAirportId: airport, nearestAirportDistance: distance });
}

describe('flight challenge records', () => {
  it('distinguishes a repeated airport approach from a touchdown completed on this leg', () => {
    let first = frames(FS.createFlightChallenge('world_tour', state()), 10);
    first = touchdown(first);
    expect(first.arrivals).toEqual(['kpwm']);
    expect(first.legArrivalId).toBe('kpwm');
    expect(FS.getFlightChallengeDestination(first, 'kpwm')).toBeNull();
    let repeated = FS.createFlightChallenge('world_tour', state(), { previousRecord: first });
    expect(repeated.legArrivalId).toBeNull();
    expect(repeated.airborneSeconds).toBe(0);
    expect(FS.getFlightChallengeDestination(repeated, 'kpwm').id).toBe('kpwm');
    repeated = touchdown(frames(repeated, 10));
    expect(repeated.arrivals).toEqual(['kpwm']);
    expect(repeated.legArrivalId).toBe('kpwm');
    expect(FS.getFlightChallengeDestination(repeated, 'kpwm')).toBeNull();
    expect(repeated.tourElapsedSeconds).toBeGreaterThan(first.tourElapsedSeconds);
  });

  it('creates only known challenges with empty observable goals', () => {
    for (const id of ['first_climb', 'first_flight', 'cross_country', 'mountain_flying', 'energy_management', 'world_tour']) {
      const record = FS.createFlightChallenge(id, state());
      expect(record.version).toBe(1);
      expect(record.status).toBe('active');
      expect(FS.flightChallengeSummary(record).done).toBe(0);
      expect(JSON.parse(JSON.stringify(record))).toEqual(record);
    }
    expect(FS.createFlightChallenge('rescue', state())).toBeNull();
    expect(FS.createFlightChallenge('__proto__', state())).toBeNull();
    expect(FS.flightChallengeSummary(null)).toMatchObject({ total: 0, complete: false, status: 'inactive' });
  });

  it('does not advance paused, invalid, or backwards time', () => {
    const record = FS.createFlightChallenge('first_flight', state());
    for (const dt of [0, -1, NaN, Infinity]) expect(advance(record, state(), controls(), dt)).toBe(record);
    expect(FS.flightChallengeSummary(record).done).toBe(0);
  });

  it('caps a suspended frame at one second and preserves its input record', () => {
    const record = FS.createFlightChallenge('first_flight', state());
    const next = advance(record, state(), controls(), 60);
    expect(next.elapsedSeconds).toBe(1);
    expect(next.streakSeconds).toBe(1);
    expect(next.airborneSeconds).toBe(1);
    expect(record.objectives.climb).toBe(false);
    expect(record.streakSeconds).toBe(0);
  });

  it('ignores malformed samples and sanitizes persisted numbers', () => {
    const saved = Object.assign(FS.createFlightChallenge('first_flight', state()),
      { streakSeconds: Infinity, elapsedSeconds: -5, airborneSeconds: NaN, peakAGL: Infinity });
    const record = advance(saved, state({ altitude: NaN }), controls());
    expect(FS.flightChallengeSummary(record).done).toBe(0);
    expect(record.streakSeconds).toBe(0);
    expect(Object.values(record).some((value) => typeof value === 'number' && !Number.isFinite(value))).toBe(false);
  });
});

describe('first flight and mountain goals', () => {
  it('requires an uninterrupted thirty-second altitude hold', () => {
    let record = FS.createFlightChallenge('first_flight', state());
    record = frames(record, 29);
    expect(record.objectives).toEqual({ climb: true, steady: false, landing: false });
    record = advance(record, state({ altitude: 3201 }));
    expect(record.streakSeconds).toBe(0);
    record = frames(record, 30);
    expect(record.objectives.steady).toBe(true);
    record = advance(record, state({ altitude: 2500, stalling: true }));
    expect(record.objectives.steady).toBe(true);
    expect(FS.flightChallengeSummary(record)).toMatchObject({ done: 2, total: 3, progress: 67, complete: false });
  });

  it('resets the hold for excessive bank, vertical speed, stall, or low airspeed', () => {
    const disruptions = [
      [state(), controls({ bank: 11 })],
      [state({ vsi: 201 / 60 }), controls()],
      [state({ stalling: true }), controls()],
      [state({ lowAirspeed: true }), controls()],
      [state(), controls({ bank: NaN })],
    ];
    for (const [sample, input] of disruptions) {
      let record = frames(FS.createFlightChallenge('first_flight', state()), 20);
      record = advance(record, sample, input);
      expect(record.streakSeconds).toBe(0);
      expect(record.objectives.steady).toBe(false);
    }
  });

  it('rejects runway parking and touchdown rates at or above five hundred fpm', () => {
    const ground = state({ altitude: 76, onGround: true });
    let parked = FS.createFlightChallenge('first_flight', ground);
    parked = frames(parked, 60, ground);
    parked = touchdown(parked);
    expect(FS.flightChallengeSummary(parked).done).toBe(0);
    for (const fpm of [-1, 500, Infinity, NaN]) {
      const flown = frames(FS.createFlightChallenge('first_flight', state()), 30);
      expect(touchdown(flown, 'kpwm', 0.2, fpm).objectives.landing).toBe(false);
    }
  });

  it('completes after a genuinely airborne controlled touchdown', () => {
    let record = frames(FS.createFlightChallenge('first_flight', state()), 30);
    record = touchdown(record);
    expect(FS.flightChallengeSummary(record)).toMatchObject({ done: 3, progress: 100, complete: true, allComplete: true });
    expect(record.status).toBe('complete');
  });

  it.each([
    ['first_flight', 76, 3000, 30, 'kpwm'],
    ['mountain_flying', 5431, 8500, 10, 'kden'],
  ])('%s requires its final landing after the climb and hold, including old premature landing flags', (id, elevation, target, holdSeconds, airport) => {
    const low = state({ altitude: elevation + 200, fieldElev: elevation });
    const ground = state({ altitude: elevation, fieldElev: elevation, onGround: true });
    const contact = { landingScored: true, touchdownFPM: 180, nearestAirportId: airport, nearestAirportDistance: 0.2 };
    let record = frames(FS.createFlightChallenge(id, low), 10, low);
    record = advance(record, ground, controls(), 1, contact);
    expect(record.objectives.landing).toBe(false);

    // A previous version persisted this exact early touchdown as an objective.
    const saved = JSON.parse(JSON.stringify(record));
    saved.objectives.landing = true;
    expect(FS.flightChallengeSummary(saved).done).toBe(0);
    const high = state({ altitude: target, fieldElev: elevation });
    record = frames(saved, holdSeconds, high);
    expect(record).toMatchObject({ status: 'active', objectives: { climb: true, steady: true, landing: false } });
    record = advance(record, ground, controls(), 1, contact);
    expect(record.status).toBe('complete');
    expect(FS.flightChallengeBestSeconds(record)).toBe(holdSeconds + 12);
  });

  it('does not count a short bounce even with a claimed landing event', () => {
    let record = frames(FS.createFlightChallenge('first_flight', state()), 9);
    record = touchdown(record);
    expect(record.objectives.landing).toBe(false);
  });

  it('uses the mountain altitude and requires arrival at Denver', () => {
    const high = state({ altitude: 8500, fieldElev: 5431 });
    let record = FS.createFlightChallenge('mountain_flying', high);
    record = frames(record, 10, high);
    expect(record.objectives).toEqual({ climb: true, steady: true, landing: false });
    record = touchdown(record, 'kpwm');
    expect(record.objectives.landing).toBe(false);
    record = frames(record, 10, high);
    record = advance(record, high, controls(), 1);
    record = advance(record, state({ altitude: 5431, fieldElev: 5431, onGround: true }), controls(), 1,
      { landingScored: true, touchdownFPM: 200, nearestAirportId: 'kden', nearestAirportDistance: 2 });
    expect(record.status).toBe('complete');
  });
});

describe('cross-country navigation', () => {
  function departure() {
    const sample = state();
    const destination = FS.WAYPOINTS.find((wp) => wp.id === 'kjfk');
    sample.heading = FS.bearing(sample.lat, sample.lon, destination.lat, destination.lon);
    return sample;
  }

  it('requires ten continuous airborne seconds on the destination heading', () => {
    const sample = departure();
    let record = frames(FS.createFlightChallenge('cross_country', sample), 9, sample);
    expect(record.objectives.heading).toBe(false);
    record = advance(record, Object.assign({}, sample, { heading: sample.heading + 11 }));
    expect(record.streakSeconds).toBe(0);
    record = frames(record, 10, Object.assign({}, sample, { heading: sample.heading + 360 }));
    expect(record.objectives.heading).toBe(true);
  });

  it('rejects an aligned heading while parked or below one hundred feet AGL', () => {
    const sample = departure();
    for (const low of [Object.assign({}, sample, { altitude: 76, onGround: true }),
      Object.assign({}, sample, { altitude: 175 })]) {
      const record = frames(FS.createFlightChallenge('cross_country', low), 20, low);
      expect(record.objectives.heading).toBe(false);
    }
  });

  it('distinguishes safe arrival, wrong-airport landing, and controlled destination touchdown', () => {
    const sample = departure();
    let record = frames(FS.createFlightChallenge('cross_country', sample), 10, sample);
    const destination = FS.WAYPOINTS.find((wp) => wp.id === 'kjfk');
    record = advance(record, state({ lat: destination.lat, lon: destination.lon, altitude: 500, fieldElev: 13 }));
    expect(record.objectives.arrival).toBe(true);
    record = touchdown(record, 'kpwm');
    expect(record.objectives.landing).toBe(false);
    record = frames(record, 10, state({ lat: destination.lat, lon: destination.lon, altitude: 500, fieldElev: 13 }));
    record = touchdown(record, 'kjfk', 2.1);
    expect(record.objectives.landing).toBe(false);
    record = frames(record, 10, state({ lat: destination.lat, lon: destination.lon, altitude: 500, fieldElev: 13 }));
    record = touchdown(record, 'kjfk', 0.5);
    expect(record.status).toBe('complete');
  });

  it('does not treat invalid coordinates as an arrival', () => {
    const record = advance(FS.createFlightChallenge('cross_country', state()), state({ lat: Infinity, lon: NaN }));
    expect(record.objectives.arrival).toBe(false);
    expect(record.streakSeconds).toBe(0);
  });

  it('cannot reuse an early JFK landing after the missing heading objective is later observed', () => {
    const jfk = FS.WAYPOINTS.find(wp => wp.id === 'kjfk');
    const near = state({ lat: jfk.lat, lon: jfk.lon, altitude: 500, fieldElev: jfk.alt });
    const ground = { ...near, altitude: jfk.alt, onGround: true };
    const contact = { landingScored: true, touchdownFPM: 180, nearestAirportId: 'kjfk', nearestAirportDistance: 0.2 };
    let record = frames(FS.createFlightChallenge('cross_country', near), 10, near);
    expect(record.objectives).toEqual({ heading: false, arrival: true, landing: false });
    record = advance(record, ground, controls(), 1, contact);
    expect(record.objectives.landing).toBe(false);
    const saved = JSON.parse(JSON.stringify(record));
    saved.objectives.landing = true;
    record = frames(saved, 10, departure());
    expect(record).toMatchObject({ status: 'active', objectives: { heading: true, arrival: true, landing: false } });
    record = advance(record, ground, controls(), 1, contact);
    expect(record.status).toBe('complete');
  });

  it('requires the airborne arrival objective before accepting the destination touchdown', () => {
    const sample = departure();
    const record = frames(FS.createFlightChallenge('cross_country', sample), 10, sample);
    expect(record.objectives).toEqual({ heading: true, arrival: false, landing: false });
    expect(touchdown(record, 'kjfk').objectives.landing).toBe(false);
  });
});

describe('energy management', () => {
  function gliding(overrides) { return state(Object.assign({ altitude: 5000, vsi: -120 / 60 }, overrides)); }

  it('records the start of a successful glide so the speed trade remains reachable', () => {
    let record = FS.createFlightChallenge('energy_management', gliding());
    record = advance(record, gliding(), controls({ throttle: 0 }));
    for (let i = 1; i < 5; i += 1) record = advance(record,
      gliding({ altitude: 5000 - i * 2, speed: (110 - i * 5) / KTS_PER_FTS }), controls({ throttle: 0 }));
    expect(record.objectives.glide).toBe(true);
    expect(record.glideSnapshot.altitude).toBe(5000);
    expect(record.glideSnapshot.airspeed).toBeCloseTo(110);
    expect(record.streakSeconds).toBe(0);
    record = frames(record, 5, gliding({ altitude: 5300, vsi: 120 / 60, speed: 100 / KTS_PER_FTS }), controls({ throttle: 0.6 }));
    expect(record.status).toBe('complete');
  });

  it('does not complete the glide at insufficient speed, and resets a broken attempt', () => {
    let record = FS.createFlightChallenge('energy_management', gliding());
    record = frames(record, 4, gliding(), controls({ throttle: 0 }));
    record = advance(record, gliding({ speed: 84 / KTS_PER_FTS }), controls({ throttle: 0 }));
    expect(record.objectives.glide).toBe(false);
    expect(record.streakSeconds).toBe(0);
    expect(record.glideSnapshot).toBeNull();
    record = frames(record, 5, gliding({ speed: 85 / KTS_PER_FTS }), controls({ throttle: 0.05 }));
    expect(record.objectives.glide).toBe(true);
    expect(record.glideSnapshot.airspeed).toBeCloseTo(85);
  });

  it('requires both a powered altitude gain and an observed speed loss', () => {
    let record = frames(FS.createFlightChallenge('energy_management', gliding()), 5, gliding(), controls({ throttle: 0 }));
    for (const [sample, input] of [
      [gliding({ altitude: 5300, vsi: 120 / 60, speed: 110 / KTS_PER_FTS }), controls()],
      [gliding({ altitude: 5299, vsi: 120 / 60, speed: 100 / KTS_PER_FTS }), controls()],
      [gliding({ altitude: 5300, vsi: 120 / 60, speed: 100 / KTS_PER_FTS }), controls({ throttle: 0.4 })],
      [gliding({ altitude: 5300, vsi: 120 / 60, speed: 100 / KTS_PER_FTS, lowAirspeed: true }), controls()],
    ]) {
      record = frames(record, 5, sample, input);
      expect(record.objectives.climb).toBe(false);
    }
    record = frames(record, 5, gliding({ altitude: 5300, vsi: 120 / 60, speed: 100 / KTS_PER_FTS }), controls());
    expect(record.objectives.climb).toBe(true);
  });
});

describe('verified airport tour', () => {
  function arrival(previous, airport, distance = 0.2) {
    let record = FS.createFlightChallenge('world_tour', state(), { previousRecord: previous });
    record = frames(record, 10);
    return touchdown(record, airport, distance);
  }

  it('ignores legacy airport lists and an initial runway landing claim', () => {
    const ground = state({ altitude: 76, onGround: true });
    let record = FS.createFlightChallenge('world_tour', ground, {
      visitedAirports: FS.WAYPOINTS.map((wp) => wp.id), newAirports: ['kpwm', 'kjfk'] });
    record = touchdown(record);
    expect(record.arrivals).toEqual([]);
    expect(FS.flightChallengeSummary(record).done).toBe(0);
  });

  it('carries verified arrivals across flights without counting duplicates or distant landings', () => {
    let record = arrival(null, 'kpwm');
    expect(record.arrivals).toEqual(['kpwm']);
    record = arrival(record, 'kpwm');
    record = arrival(record, 'kjfk', 2.01);
    record = arrival(record, 'unknown');
    expect(record.arrivals).toEqual(['kpwm']);
    record = arrival(record, 'kjfk');
    expect(FS.flightChallengeSummary(record)).toMatchObject({ done: 2, total: 5, progress: 40 });
  });

  it('cannot reuse one touchdown claim to collect several airports', () => {
    let record = arrival(null, 'kpwm');
    record = touchdown(record, 'kjfk');
    record = touchdown(record, 'kord');
    expect(record.arrivals).toEqual(['kpwm']);
  });

  it('completes after five unique verified arrivals and keeps the persisted list bounded', () => {
    let record = null;
    for (const id of ['kpwm', 'kjfk', 'kord', 'kden', 'ksfo']) record = arrival(record, id);
    expect(record.status).toBe('complete');
    expect(FS.flightChallengeSummary(record)).toMatchObject({ done: 5, progress: 100, complete: true });
    record.completedAt = '2026-10-10T12:00:00.000Z';
    const resumed = FS.createFlightChallenge('world_tour', state(), { previousRecord: JSON.parse(JSON.stringify(record)) });
    expect(resumed.arrivals).toEqual(record.arrivals);
    expect(resumed.completedAt).toBe(record.completedAt);
    expect(resumed.airborneSeconds).toBe(0);
    const malicious = Object.assign({}, record, { arrivals: [...FS.WAYPOINTS.map((wp) => wp.id), ...Array(1000).fill('kpwm')] });
    const bounded = FS.createFlightChallenge('world_tour', state(), { previousRecord: malicious });
    expect(bounded.arrivals).toHaveLength(5);
  });

  it('times the entire tour across serialized legs while each leg needs fresh flight evidence', () => {
    let record = null;
    for (const [index, airport] of ['kpwm', 'kjfk', 'kord', 'kden', 'ksfo'].entries()) {
      const saved = record && JSON.parse(JSON.stringify(record));
      const leg = FS.createFlightChallenge('world_tour', state(), { previousRecord: saved });
      expect(leg).toMatchObject({ elapsedSeconds: 0, airborneSeconds: 0, tourTimingValid: true, tourElapsedSeconds: index * 11 });
      expect(FS.flightChallengeBestSeconds(leg)).toBeNull();
      record = touchdown(frames(leg, 10), airport);
      expect(record.elapsedSeconds).toBe(11);
      expect(record.tourElapsedSeconds).toBe((index + 1) * 11);
    }
    expect(FS.flightChallengeBestSeconds(record)).toBe(55);
    expect(advance(record, state(), controls(), 1).tourElapsedSeconds).toBe(55);
    const fresh = FS.createFlightChallenge('world_tour', state());
    expect(fresh).toMatchObject({ tourTimingValid: true, tourElapsedSeconds: 0, arrivals: [] });
  });

  it('includes unsuccessful and repeated approach time without granting another arrival', () => {
    let record = arrival(null, 'kpwm');
    record = arrival(record, 'kpwm');
    expect(record).toMatchObject({ arrivals: ['kpwm'], elapsedSeconds: 11, tourElapsedSeconds: 22 });
    record = FS.createFlightChallenge('world_tour', state(), { previousRecord: record });
    const paused = advance(record, state(), controls(), 0);
    expect(paused).toBe(record);
    record = advance(record, state(), controls(), 100);
    expect(record).toMatchObject({ elapsedSeconds: 1, airborneSeconds: 1, tourElapsedSeconds: 23 });
  });

  it.each([
    {},
    { tourTimingValid: false, tourElapsedSeconds: 50 },
    { tourTimingValid: true, tourElapsedSeconds: null },
    { tourTimingValid: true, tourElapsedSeconds: Infinity },
    { tourTimingValid: true, tourElapsedSeconds: -1 },
    { tourTimingValid: true, tourElapsedSeconds: 604801 },
    { tourTimingValid: true, tourElapsedSeconds: 5 },
  ])('keeps arrivals from an untrusted or legacy partial tour without inventing total timing: %j', timing => {
    let legacy = arrival(null, 'kpwm');
    delete legacy.tourTimingValid;
    delete legacy.tourElapsedSeconds;
    Object.assign(legacy, timing);
    let record = FS.createFlightChallenge('world_tour', state(), { previousRecord: JSON.parse(JSON.stringify(legacy)) });
    expect(record).toMatchObject({ arrivals: ['kpwm'], elapsedSeconds: 0, airborneSeconds: 0, tourTimingValid: false, tourElapsedSeconds: null });
    for (const airport of ['kjfk', 'kord', 'kden', 'ksfo']) record = arrival(record, airport);
    expect(record.status).toBe('complete');
    expect(record.arrivals).toHaveLength(5);
    expect(record.tourElapsedSeconds).toBeNull();
    expect(FS.flightChallengeBestSeconds(record)).toBeNull();
  });

  it('replaces unproven legacy leg bests once, then compares only whole-tour records', () => {
    const legacy = { challenges: { world_tour: 11, first_flight: 200 }, rescueSeconds: 80 };
    expect(FS.recordFlightPersonalBests(legacy, { challengeId: 'world_tour', challengeSeconds: 8 }).bests).toEqual(legacy);
    const first = FS.recordFlightPersonalBests(legacy, { challengeId: 'world_tour', challengeSeconds: 55, challengeTiming: 'tour-total-v1' });
    expect(first.bests).toMatchObject({ challenges: { world_tour: 55, first_flight: 200 }, challengeTimings: { world_tour: 'tour-total-v1' }, rescueSeconds: 80 });
    expect(first.improved.challenge).toBeUndefined();
    expect(legacy.challenges.world_tour).toBe(11);
    const slower = FS.recordFlightPersonalBests(first.bests, { challengeId: 'world_tour', challengeSeconds: 75, challengeTiming: 'tour-total-v1' });
    expect(slower.bests.challenges.world_tour).toBe(55);
    expect(slower.improved.challenge).toBeUndefined();
    const faster = FS.recordFlightPersonalBests(slower.bests, { challengeId: 'world_tour', challengeSeconds: 50, challengeTiming: 'tour-total-v1' });
    expect(faster.bests.challenges.world_tour).toBe(50);
    expect(faster.improved.challenge).toBe(true);
  });
});

describe('first climb warm-up', () => {
  const onRunway = () => state({ altitude: 76, onGround: true, speed: 0 });
  it('is a single objective that needs a real takeoff and 1,000 ft MSL, with no timer or landing', () => {
    expect(FS.CHALLENGES[0].id).toBe('first_climb');
    expect(FS.CHALLENGES[0].goals).toEqual(['Take off and reach 1,000 ft MSL']);
    const record = FS.createFlightChallenge('first_climb', onRunway());
    expect(FS.flightChallengeSummary(record)).toMatchObject({ total: 1, done: 0, status: 'active' });
    // On the runway, or climbing but still below 1,000 ft: not done.
    expect(frames(record, 20, onRunway()).status).toBe('active');
    expect(frames(record, 20, state({ altitude: 990 })).status).toBe('active');
    // Above 1,000 ft MSL but still rolling on the ground (a hilltop strip): not airborne, not done.
    expect(frames(record, 5, state({ altitude: 1200, onGround: true })).status).toBe('active');
    // Airborne at 1,000 ft: complete at once, without holding anything or landing.
    const done = advance(record, state({ altitude: 1000, vsi: 8 }));
    expect(done.status).toBe('complete');
    expect(FS.flightChallengeSummary(done)).toMatchObject({ total: 1, done: 1, complete: true });
    expect(done.objectives).toEqual({ climb: true });
  });

  it('is not routed to a landing airport, and First Flight is unchanged', () => {
    const record = FS.createFlightChallenge('first_climb', state());
    expect(FS.getFlightChallengeDestination(record)).toBeNull();
    // First Flight still needs 3,000 ft, a 30 s hold and a landing.
    const flight = FS.createFlightChallenge('first_flight', state());
    expect(advance(flight, state({ altitude: 1500 })).objectives.climb).toBe(false);
    expect(frames(flight, 29).objectives.steady).toBe(false);
    expect(frames(flight, 30).objectives.steady).toBe(true);
  });
});
