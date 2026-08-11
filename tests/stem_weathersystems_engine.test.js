import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// First machine verification for the Weather Systems kernel (10.6k-line tool,
// zero prior tests): meteorology helpers checked against real-world values,
// scenario physics invariants, the ensemble/calibration/scoring chain, and the
// reasoning-pulse rotation that removes the correct-answer-always-first tell.

const src = fs.readFileSync('stem_lab/stem_tool_weathersystems.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_weathersystems.js', 'utf8');

const win = { StemLab: { registerTool() {} } };
// eslint-disable-next-line no-new-func
new Function('window', src)(win);
const K = win.WeatherSystemsKernel;
const state = (over) => K.resolvedState(Object.assign({ scenario: 'coldFront' }, over));

describe('meteorology helpers', () => {
  it('Magnus dew point matches real-world values and never exceeds temperature', () => {
    expect(K.dewPointC(25, 72)).toBeCloseTo(19.6, 1);
    expect(K.dewPointC(20, 100)).toBeCloseTo(20, 0);
    for (const [t, h] of [[30, 40], [0, 80], [-10, 90], [15, 55]]) {
      expect(K.dewPointC(t, h), t + '/' + h).toBeLessThanOrEqual(t + 0.1);
    }
  });

  it('wind barbs follow the knots convention (half 5, full 10, pennant 50)', () => {
    expect(K.windBarbSpec(0).calm).toBe(true);
    expect(K.windBarbSpec(9.26)).toMatchObject({ pennants: 0, fullBarbs: 0, halfBarbs: 1 });
    expect(K.windBarbSpec(50)).toMatchObject({ pennants: 0, fullBarbs: 2, halfBarbs: 1 });
    expect(K.windBarbSpec(92.6)).toMatchObject({ pennants: 1, fullBarbs: 0, halfBarbs: 0 });
  });

  it('sky cover reports oktas 0-8', () => {
    expect(K.skyCoverOktas(0)).toBe(0);
    expect(K.skyCoverOktas(50)).toBe(4);
    expect(K.skyCoverOktas(100)).toBe(8);
  });
});

describe('scenario physics (projectConditions)', () => {
  it('holds physical invariants across every scenario and hour', () => {
    for (const scenario of K.scenarios) {
      for (let hour = 0; hour <= 12; hour += 2) {
        const c = K.projectConditions(K.resolvedState({ scenario: scenario.id }), hour);
        expect(c.dewPoint, scenario.id + '@' + hour).toBeLessThanOrEqual(c.temperature + 0.1);
        expect(c.humidity).toBeGreaterThanOrEqual(5);
        expect(c.humidity).toBeLessThanOrEqual(100);
        expect(c.windDir).toBeGreaterThanOrEqual(0);
        expect(c.windDir).toBeLessThan(360);
        expect(['none', 'rain', 'snow', 'mixed', 'storms']).toContain(c.precipType);
        if (c.precipType === 'snow') expect(c.temperature).toBeLessThanOrEqual(-1 + 0.1);
      }
    }
  });

  it('cold front: temperature falls and pressure rises behind the front', () => {
    const s = state();
    expect(K.projectConditions(s, 9).temperature).toBeLessThan(K.projectConditions(s, 2).temperature);
    expect(K.projectConditions(s, 10).pressure).toBeGreaterThan(K.projectConditions(s, 5).pressure);
  });

  it('warm front: temperature climbs while pressure falls', () => {
    const s = K.resolvedState({ scenario: 'warmFront' });
    expect(K.projectConditions(s, 10).temperature).toBeGreaterThan(K.projectConditions(s, 0).temperature);
    expect(K.projectConditions(s, 10).pressure).toBeLessThan(K.projectConditions(s, 0).pressure);
  });
});

describe('station network', () => {
  it('elevation cools stations and lowers station pressure below sea-level pressure', () => {
    // Isolate elevation: same position, only altitude differs. (Between the real
    // stations, marine moderation can legitimately outweigh elevation cooling.)
    const s = K.resolvedState({ scenario: 'fair' });
    const high = K.stationObservation(s, { id: 'hill', name: 'Hill', x: 0.5, y: 0.5, elevation: 500 });
    const low = K.stationObservation(s, { id: 'flat', name: 'Flat', x: 0.5, y: 0.5, elevation: 0 });
    expect(high.temperature).toBeCloseTo(low.temperature - 500 / 1000 * 6.5, 0);
    expect(high.pressure).toBeLessThan(high.seaLevelPressure);
    expect(low.pressure).toBeCloseTo(low.seaLevelPressure, 1);
    expect(high.dewPoint).toBeLessThanOrEqual(high.temperature + 0.1);
  });

  it('front passage hour is consistent with the front position model', () => {
    const s = state({ frontSpeed: 36 });
    const station = { id: 'central', name: 'Central School', x: 0.48, y: 0.66, elevation: 90 };
    const passage = K.frontPassageHour(s, station);
    const frontXAtPassage = 0.28 + (passage * s.frontSpeed) / 500;
    expect(frontXAtPassage).toBeCloseTo(station.x, 1);
    expect(K.frontPassageHour(K.resolvedState({ scenario: 'fair' }), station)).toBeNull();
  });

  it('the strongest boundary pair straddles the front mid-simulation', () => {
    const s = state({ simHour: 5 });
    const analysis = K.stationNetworkAnalysis(s);
    expect(analysis.pairs.length).toBe(3);
    for (const pair of analysis.pairs) expect(pair.windShift).toBeLessThanOrEqual(180);
    expect(analysis.strongest.left.airMass).toBe('behind');
    expect(analysis.strongest.right.airMass).toBe('ahead');
  });
});

describe('forecast chain', () => {
  it('a perfect forecast with three evidence sources scores 100', () => {
    const s = state();
    const truth = K.expectedForecast(s);
    const result = K.scoreForecast(s, {
      precip: truth.precip, timing: truth.timing, hazard: truth.hazard,
      evidence: ['pressure', 'tempDew', 'windShift']
    });
    expect(result.score).toBe(100);
    expect(K.readinessActionForHazard(truth.hazard)).toBe(result.expectedAction);
  });

  it('a fully wrong forecast earns only evidence credit', () => {
    const s = state();
    const result = K.scoreForecast(s, { precip: 'zzz', timing: 'zzz', hazard: 'zzz', evidence: ['pressure'] });
    expect(result.score).toBe(4);
  });

  it('the teaching ensemble is deterministic with nine members whose counts sum to nine', () => {
    const s = state();
    const a = K.ensembleForecast(s);
    const b = K.ensembleForecast(s);
    expect(a).toEqual(b);
    expect(a.members.length).toBe(9);
    const total = Object.keys(a.counts).reduce((sum, key) => sum + a.counts[key], 0);
    expect(total).toBe(9);
    expect(a.agreement).toBeCloseTo(a.counts[a.dominantPrecip] / 9, 6);
  });

  it('confidence calibration compares against ensemble agreement', () => {
    const s = state();
    const agreement = Math.round(K.ensembleForecast(s).agreement * 100);
    expect(K.calibrateConfidence(s, agreement).status).toBe('well');
    expect(K.calibrateConfidence(s, Math.min(100, agreement + 30)).status).toBe(agreement + 30 > 100 ? 'well' : 'over');
    expect(K.calibrateConfidence(s, Math.max(0, agreement - 30)).status).toBe('under');
  });

  it('the experiment runner isolates one variable: more humidity, more precipitation potential', () => {
    const s = state();
    const result = K.runExperiment(s, 'humidity', 95, 6);
    expect(result.testValue).toBe(95);
    expect(result.deltas.precipPotential).toBeGreaterThan(4);
    expect(result.direction).toBe('increase');
    expect(result.deltas.pressure).toBe(0);
  });

  it('comparing a scenario with itself yields zero deltas', () => {
    const s = K.resolvedState({ scenario: 'fair', simHour: 6 });
    const comparison = K.compareScenarioPatterns(s, 'fair', 6);
    for (const metric of comparison.metrics) expect(metric.delta, metric.id).toBe(0);
  });
});

describe('reasoning pulse rotation', () => {
  const questionsFor = (band) => {
    const start = src.indexOf('function rotateReasoningOptions(');
    const end = src.indexOf('function forecastMission()', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // eslint-disable-next-line no-new-func
    return new Function('band', src.slice(start, end) + '\nreturn reasoningPulseQuestions();')(band);
  };

  it('every band still offers the correct option with three unique choices', () => {
    for (const band of ['K-2', '3-5', '6-8', '9-12']) {
      for (const q of questionsFor(band)) {
        const ids = q.options.map((o) => o.id);
        expect(ids, band + ':' + q.id).toContain(q.correct);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it('the correct option is no longer uniformly first (regression pin)', () => {
    // Before the fix every authored question listed its correct option first.
    const positions = [];
    for (const band of ['K-2', '3-5', '6-8', '9-12']) {
      for (const q of questionsFor(band)) {
        positions.push(q.options.findIndex((o) => o.id === q.correct));
      }
    }
    expect(new Set(positions).size).toBeGreaterThan(1);
    expect(positions.some((p) => p !== 0)).toBe(true);
    expect(src.split('.map(rotateReasoningOptions)').length - 1).toBe(3);
  });
});

describe('formatting helpers', () => {
  it('cardinal handles negatives and wrap-around (regression pin)', () => {
    expect(K.signedNumber(3.6999999999, ' hPa')).toBe('+3.7 hPa');
    // cardinal is not exported; pin the double-normalization in source instead.
    expect(src).toContain('(((Number(degrees) || 0) % 360) + 360) % 360');
  });

  it('spread and trajectory descriptions carry shape, not just range', () => {
    expect(K.describeSpread([1, 1.2, 5, 5.1], '°C')).toContain('two groups');
    expect(K.describeTrajectory([1, 2, 3, 4], '°C')).toContain('rises steadily');
    expect(K.describeTrajectory([1, 8, 2], '°C')).toContain('peak');
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
