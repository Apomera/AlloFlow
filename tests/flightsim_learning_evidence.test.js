import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let FS;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
});

const airborneState = (overrides = {}) => ({
  speed: 130 / 0.5924838, altitude: 5000, fieldElev: 0,
  onGround: false, vsi: 0, aoa: 5, stalling: false, lowAirspeed: false,
  ...overrides,
});
const observation = (airspeed = 130, altitude = 5000, aoa = 8) =>
  FS.sampleStallInvestigation(airspeed, altitude, aoa);

describe('flight practice evidence', () => {
  it('parking and immediately exiting earns no performance credit, even with elapsed time and an origin airport', () => {
    const log = { flightTime: 600, distance: 0, airports: 1, bestLanding: 0 };
    for (let i = 0; i < 600; i++) {
      FS.updateFlightPractice(log, airborneState({ onGround: true, altitude: 5431, fieldElev: 5431 }), { bank: 0 }, 1);
    }
    expect(FS.flightPracticeEvidence(log)).toMatchObject({
      takeoff: false, steady: false, landing: false, count: 0, score: 0, airborne: false,
    });
  });

  it('requires actual sustained airborne time before awarding a takeoff', () => {
    const log = {};
    for (let i = 0; i < 9; i++) {
      FS.updateFlightPractice(log, airborneState({ altitude: 5551, fieldElev: 5431, vsi: 8 }), { bank: 0 }, 1);
    }
    expect(FS.flightPracticeEvidence(log).takeoff).toBe(false);
    FS.updateFlightPractice(log, airborneState({ altitude: 5551, fieldElev: 5431, vsi: 8 }), { bank: 0 }, 1);
    expect(FS.flightPracticeEvidence(log)).toMatchObject({ takeoff: true, steady: false, landing: false, count: 1 });
    expect(log.peakAGL).toBe(120);
  });

  it('steady control requires ten continuous seconds, with stalls, slow flight, and bank resetting the streak', () => {
    for (const disruptive of [{ stalling: true }, { lowAirspeed: true }, { vsi: 10 }, { bank: 25 }]) {
      const log = { startedAirborne: true };
      for (let i = 0; i < 8; i++) FS.updateFlightPractice(log, airborneState(), { bank: 0 }, 1);
      FS.updateFlightPractice(log, airborneState(disruptive), { bank: disruptive.bank || 0 }, 1);
      expect(log.stableSeconds).toBe(0);
      for (let i = 0; i < 9; i++) FS.updateFlightPractice(log, airborneState(), { bank: 0 }, 1);
      expect(FS.flightPracticeEvidence(log).steady).toBe(false);
      FS.updateFlightPractice(log, airborneState(), { bank: 0 }, 1);
      expect(FS.flightPracticeEvidence(log)).toMatchObject({ steady: true, takeoff: false, total: 2, score: 50 });
    }
  });

  it('a recorded controlled touchdown counts only after flight, and airborne starts can earn full applicable credit', () => {
    const landing = { airborneSeconds: 12, bestStableSeconds: 10, landings: 1, bestLanding: 180, peakAGL: 150 };
    expect(FS.flightPracticeEvidence(landing)).toMatchObject({ landing: true, count: 3, score: 100 });
    expect(FS.flightPracticeEvidence({ ...landing, startedAirborne: true })).toMatchObject({ takeoff: false, total: 2, count: 2, score: 100 });
    for (const bad of [{ airborneSeconds: 0 }, { landings: 0 }, { bestLanding: null }, { bestLanding: -1 }, { bestLanding: 900 }]) {
      expect(FS.flightPracticeEvidence({ ...landing, ...bad }).landing).toBe(false);
    }
  });

  it('malformed non-finite evidence does not produce achievements', () => {
    for (const value of [Infinity, -Infinity, NaN, 'not a number']) {
      expect(FS.flightPracticeEvidence({
        airborneSeconds: value, bestStableSeconds: value, peakAGL: value, landings: 1, bestLanding: 100,
      })).toMatchObject({ count: 0, score: 0 });
    }
  });

  it('a suspended frame cannot manufacture a long successful control streak', () => {
    const log = FS.updateFlightPractice({}, airborneState(), { bank: 0 }, 120);
    expect(log.airborneSeconds).toBeLessThanOrEqual(1);
    expect(FS.flightPracticeEvidence(log).count).toBe(0);
    FS.updateFlightPractice(log, airborneState(), { bank: 0 }, Infinity);
    expect(Number.isFinite(log.airborneSeconds)).toBe(true);
  });

  it('a suspended frame cannot manufacture a long successful control streak', () => {
    const log = FS.updateFlightPractice({}, airborneState(), { bank: 0 }, 120);
    expect(log.airborneSeconds).toBeLessThanOrEqual(1);
    expect(FS.flightPracticeEvidence(log).count).toBe(0);
    FS.updateFlightPractice(log, airborneState(), { bank: 0 }, Infinity);
    expect(Number.isFinite(log.airborneSeconds)).toBe(true);
  });
});

describe('controlled stall investigations', () => {
  it('uses the same coefficients, stall states, and forces as the trainer flight model', () => {
    for (const aoa of [5, 12, 15, 21.5]) {
      for (const airspeed of [50, 130, 200]) {
        const trainer = FS.AIRCRAFT.find((a) => a.id === 'cessna172');
        const model = Object.assign(Object.create(FS.Physics), {
          WING_AREA: trainer.wingArea, WEIGHT: trainer.weight, CL0: trainer.cl0, CL_PER_AOA: trainer.clPerAoa,
          CD0: trainer.cd0, CD_INDUCED_K: trainer.cdK, WAVE_DRAG: 0,
        });
        const physics = model.sampleAerodynamics(airspeed / 0.5924838, 5000, aoa);
        const row = observation(airspeed, 5000, aoa);
        expect(row.state).toBe(physics.state);
        expect(row.lift).toBe(Math.round(physics.lift));
        expect(row.drag).toBe(Math.round(physics.drag));
        expect(row.cl).toBe(physics.cl);
        expect(row.criticalAoa).toBe(physics.criticalAoa);
      }
    }
  });

  it('remains a trainer experiment after selecting another aircraft', () => {
    const reference = observation();
    const old = { CL0: FS.Physics.CL0, CL_PER_AOA: FS.Physics.CL_PER_AOA, WEIGHT: FS.Physics.WEIGHT, WING_AREA: FS.Physics.WING_AREA };
    try {
      Object.assign(FS.Physics, { CL0: 0, CL_PER_AOA: 0, WEIGHT: 2, WING_AREA: 0.5 });
      expect(observation()).toEqual(reference);
    } finally { Object.assign(FS.Physics, old); }
  });

  it('finds two controlled comparisons and identifies the supporting rows', () => {
    const rows = [observation(130, 5000, 8), observation(130, 5000, 20), observation(200, 5000, 20)];
    expect(FS.stallEvidencePairs(rows)).toEqual({ angle: [1, 2], speed: [2, 3], complete: true });
  });

  it('changing two variables at once does not count as a controlled comparison', () => {
    expect(FS.stallEvidencePairs([observation(130, 5000, 8), observation(150, 5000, 20)]).angle).toBeNull();
    expect(FS.stallEvidencePairs([observation(130, 5000, 8), observation(130, 10000, 20)]).angle).toBeNull();
    expect(FS.stallEvidencePairs([observation(130, 5000, 20), observation(200, 10000, 20)]).speed).toBeNull();
    expect(FS.stallEvidencePairs([observation(130, 5000, 20), observation(159, 5000, 20)]).speed).toBeNull();
    expect(FS.stallEvidencePairs([observation(130, 5000, 13), observation(130, 5000, 20)]).angle).toBeNull();
  });

  it('saved observations are bounded and validated against the current model before they can count as evidence', () => {
    const good = observation(130, 5000, 8);
    const saved = FS.stallInvestigationRecord({ observations: [
      good, null, { ...good, state: 'stall', aoa: 9 }, { ...good, airspeed: -900 }, { ...good, lift: Infinity },
    ] });
    expect(saved.observations.length).toBeGreaterThan(0);
    for (const row of saved.observations) {
      expect(row.airspeed).toBeGreaterThanOrEqual(40);
      expect(row.airspeed).toBeLessThanOrEqual(250);
      expect(row.state).toBe(observation(row.airspeed, row.altitude, row.aoa).state);
    }
    expect(FS.stallEvidencePairs(saved.observations).complete).toBe(false);
  });

  it('malformed saved structures are safe to reopen and cannot create an unearned completed attempt', () => {
    const record = FS.stallInvestigationRecord({
      phase: 'invented', hypothesis: [], explanation: {}, airspeed: Infinity, altitude: -1, aoa: 999,
      observations: 'invalid', flight: { status: 'active', samples: {}, recoverySeconds: Infinity },
      attempts: [null, 12, 'invalid'],
    });
    expect(record.phase).toBe('predict');
    expect(record.hypothesis).toBe('');
    expect(record.explanation).toBe('');
    expect(record.airspeed).toBe(130);
    expect(record.altitude).toBe(0);
    expect(record.aoa).toBe(25);
    expect(record.observations).toEqual([]);
    expect(record.attempts.every((attempt) => attempt && typeof attempt === 'object')).toBe(true);
    expect(() => FS.advanceStallFlight(record.flight, airborneState(), 1, 1)).not.toThrow();
    expect(FS.advanceStallFlight(record.flight, airborneState(), 1, 1).status).not.toBe('complete');
  });

  it('retains a valid completed investigation and bounded archived attempts on reopen', () => {
    const attempt = {
      phase: 'review', prediction: 'angle', explanation: 'Trials one and two isolate angle of attack.',
      observations: [observation(130, 5000, 8), observation(130, 5000, 20), observation(200, 5000, 20)],
      transferAnswer: 'stall', transferAttempts: 1, completedAt: '2026-10-10T12:00:00Z',
      flight: { status: 'complete', sawStall: true, recovered: true, recoverySeconds: 5, samples: [
        { time: 1, aoa: 20, airspeed: 130, altitude: 5000, state: 'stall' },
        { time: 6, aoa: 5, airspeed: 120, altitude: 4900, state: 'normal' },
      ] },
    };
    const record = FS.stallInvestigationRecord({ ...attempt, attempts: Array.from({ length: 8 }, () => attempt) });
    expect(record.completedAt).toBe(new Date(attempt.completedAt).toISOString());
    expect(record.explanation).toBe(attempt.explanation);
    expect(FS.stallEvidencePairs(record.observations).complete).toBe(true);
    expect(record.flight).toMatchObject({ status: 'complete', recovered: true, recoverySeconds: 5 });
    expect(record.flight.samples).toHaveLength(2);
    expect(record.attempts).toHaveLength(5);
    expect(record.attempts[0].observations).toHaveLength(3);
  });

  it('retains a valid completed investigation and bounded archived attempts on reopen', () => {
    const attempt = {
      phase: 'review', prediction: 'angle', explanation: 'Trials one and two isolate angle of attack.',
      observations: [observation(130, 5000, 8), observation(130, 5000, 20), observation(200, 5000, 20)],
      transferAnswer: 'stall', transferAttempts: 1, completedAt: '2026-10-10T12:00:00Z',
      flight: { status: 'complete', sawStall: true, recovered: true, recoverySeconds: 5, samples: [
        { time: 1, aoa: 20, airspeed: 130, altitude: 5000, state: 'stall' },
        { time: 6, aoa: 5, airspeed: 120, altitude: 4900, state: 'normal' },
      ] },
    };
    const record = FS.stallInvestigationRecord({ ...attempt, attempts: Array.from({ length: 8 }, () => attempt) });
    expect(record.completedAt).toBe(new Date(attempt.completedAt).toISOString());
    expect(record.explanation).toBe(attempt.explanation);
    expect(FS.stallEvidencePairs(record.observations).complete).toBe(true);
    expect(record.flight).toMatchObject({ status: 'complete', recovered: true, recoverySeconds: 5 });
    expect(record.flight.samples).toHaveLength(2);
    expect(record.attempts).toHaveLength(5);
    expect(record.attempts[0].observations).toHaveLength(3);
  });
});

describe('stall flight transfer evidence', () => {
  it('requires an observed airborne stall followed by five continuous seconds of attached flow', () => {
    let record = FS.advanceStallFlight({ status: 'active' }, airborneState({ stalling: true, aoa: 20 }), 1, 1);
    expect(record.sawStall).toBe(true);
    for (let t = 2; t <= 5; t++) record = FS.advanceStallFlight(record, airborneState(), 1, t);
    expect(record.status).toBe('active');
    expect(record.recoverySeconds).toBe(4);
    record = FS.advanceStallFlight(record, airborneState(), 1, 6);
    expect(record).toMatchObject({ status: 'complete', recovered: true, recoverySeconds: 5 });
  });

  it('never awards recovery for ordinary flight without a prior stall', () => {
    let record = { status: 'active' };
    for (let t = 1; t <= 10; t++) record = FS.advanceStallFlight(record, airborneState(), 1, t);
    expect(record).toMatchObject({ status: 'active', recoverySeconds: 0 });
    expect(record.recovered).not.toBe(true);
  });

  it('boundary flow interrupts recovery and touching down ends the trial without recovery credit', () => {
    const record = { status: 'active', sawStall: true, recoverySeconds: 4 };
    expect(FS.advanceStallFlight(record, airborneState({ aoa: 13 }), 1, 20)).toMatchObject({ status: 'active', recoverySeconds: 0 });
    expect(FS.advanceStallFlight(record, airborneState({ onGround: true, altitude: 0 }), 1, 20)).toMatchObject({ status: 'landed', recoverySeconds: 0 });
  });

  it('ends at the three-minute limit and cannot complete a recovery after that deadline', () => {
    expect(FS.advanceStallFlight({ status: 'active' }, airborneState(), 1, 180).status).toBe('time-limit');
    expect(FS.advanceStallFlight({ status: 'active', sawStall: true, recoverySeconds: 4 }, airborneState(), 1, 181).status).toBe('time-limit');
  });

  it('keeps a bounded sample history and leaves inactive or paused records unchanged', () => {
    const inactive = { status: 'complete', recovered: true, samples: [] };
    expect(FS.advanceStallFlight(inactive, airborneState(), 1, 10)).toBe(inactive);
    const paused = { status: 'active', samples: [] };
    expect(FS.advanceStallFlight(paused, airborneState(), 0, 10)).toBe(paused);
    let active = { status: 'active', samples: [] };
    for (let t = 1; t <= 120; t++) active = FS.advanceStallFlight(active, airborneState(), 1, t);
    expect(active.samples).toHaveLength(90);
    expect(active.samples[89].time).toBe(120);
  });
});
