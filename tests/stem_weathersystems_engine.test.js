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

describe('immersive checkpoint runner stage sync', () => {
  // The runner previously advanced only the prompt text, so a 'front'
  // checkpoint could ask about a front boundary that the stations-only focus
  // profile was hiding, with the camera still parked on the previous step.
  // Both the open and advance paths must sync focus layers + camera the same
  // way openImmersiveTourStep does.
  const fnOf = (name) => {
    const start = src.indexOf('function ' + name + '(');
    const end = src.indexOf('\n      function ', start + 10);
    expect(start, name).toBeGreaterThan(-1);
    return src.slice(start, end);
  };

  it('advancing the runner applies the next step focus and camera', () => {
    const advance = fnOf('advanceImmersiveCheckpointRunner');
    expect(advance).toContain('applyImmersiveFocus(next.focus)');
    expect(advance).toContain('setImmersiveCameraPreset(next.camera)');
    expect(advance).toContain('immersiveCameraPreset: next.camera'); // pre-runtime fallback
  });

  it('opening the runner syncs the stage to the current checkpoint', () => {
    const toggle = fnOf('toggleImmersiveCheckpointRunner');
    expect(toggle).toContain('applyImmersiveFocus(current.focus)');
    expect(toggle).toContain('setImmersiveCameraPreset(current.camera)');
  });

  it('every tour step focus and camera id resolves', () => {
    const stepsStart = src.indexOf('var IMMERSIVE_TOUR_STEPS = [');
    const stepsEnd = src.indexOf('\n  ];', stepsStart);
    // eslint-disable-next-line no-new-func
    const steps = new Function(src.slice(stepsStart, stepsEnd) + '\n];\nreturn IMMERSIVE_TOUR_STEPS;')();
    expect(steps.length).toBe(4);
    const profileBlock = src.slice(src.indexOf('var IMMERSIVE_FOCUS_PROFILES = {'), src.indexOf('function immersiveFocusProfile'));
    for (const step of steps) {
      expect(profileBlock, step.id).toContain(step.focus + ':');
      expect(['overview', 'front', 'surface'], step.id).toContain(step.camera);
    }
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});

// Station halos in the immersive 3D view colour each station by temperature so a front's
// passage reads as colour sweeping across the map during forecast playback. The scene
// and its on-screen key both read these stops, so they are pinned here.
describe('station temperature halo scale', () => {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

  it('lands exactly on every stop and runs cold to hot in ascending order', () => {
    const stops = K.stationTempStops;
    expect(stops.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < stops.length; i += 1) expect(stops[i][0], 'stops must ascend').toBeGreaterThan(stops[i - 1][0]);
    for (const [t, colour] of stops) expect(K.stationTempColor(t)).toBe(colour);
    const [cr, , cb] = rgb(K.stationTempColor(stops[0][0]));
    const [hr, , hb] = rgb(K.stationTempColor(stops[stops.length - 1][0]));
    expect(cb, 'the coldest end must read cool (blue over red)').toBeGreaterThan(cr);
    expect(hr, 'the hottest end must read warm (red over blue)').toBeGreaterThan(hb);
  });

  // The scale is chosen so the ORDER survives without colour vision: relative luminance
  // must never fall as temperature rises, anywhere, including between stops (an equal
  // magenta/rose pair once flattened it).
  it('gets lighter as it gets hotter, so the order reads without colour vision', () => {
    const lum = (hex) => {
      const lin = rgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    let prev = -1;
    for (let t = -12; t <= 36; t += 0.5) {
      const L = lum(K.stationTempColor(t));
      expect(L, 'luminance fell at ' + t + ' C').toBeGreaterThanOrEqual(prev - 1e-9);
      prev = L;
    }
    const stops = K.stationTempStops;
    expect(lum(stops[stops.length - 1][1]) / lum(stops[0][1]), 'hot end must be far lighter than cold').toBeGreaterThan(5);
  });

  // Station halos sit on this tool's teal/green terrain; a cyan-green band vanished into
  // it. No stop may be green-dominant.
  it("never uses the terrain's green/teal hues", () => {
    for (let t = -12; t <= 36; t += 1) {
      const [r, g, b] = rgb(K.stationTempColor(t));
      expect(g > r && g > b, 'green-dominant at ' + t + ' C: ' + K.stationTempColor(t)).toBe(false);
    }
  });

  it('is continuous — one degree never jumps the colour', () => {
    for (let t = -12; t < 36; t += 1) {
      const a = rgb(K.stationTempColor(t)), b = rgb(K.stationTempColor(t + 1));
      const jump = Math.max(...a.map((v, i) => Math.abs(v - b[i])));
      expect(jump, t + '->' + (t + 1)).toBeLessThanOrEqual(40);
    }
  });

  it('clamps beyond the scale instead of inventing colours', () => {
    const stops = K.stationTempStops;
    expect(K.stationTempColor(-60)).toBe(stops[0][1]);
    expect(K.stationTempColor(60)).toBe(stops[stops.length - 1][1]);
  });

  it('a missing reading is neutral, not "cold"', () => {
    for (const bad of [NaN, undefined, null, 'n/a']) {
      const colour = K.stationTempColor(bad);
      expect(colour, String(bad)).not.toBe(K.stationTempStops[0][1]);
      const [r, g, b] = rgb(colour);
      expect(Math.max(r, g, b) - Math.min(r, g, b), 'neutral grey, not a temperature hue').toBeLessThan(40);
    }
  });
});

// Predict-then-play in the immersive view: the answer and its explanation come from
// predictionOutcome, never from text written per scenario. These pin that the
// explanation can never contradict the numbers, and that the question is fair.
describe('predictionOutcome (predict, then play)', () => {
  const stationsSrc = src.slice(src.indexOf('  var STATIONS = [') + '  var STATIONS = '.length);
  // eslint-disable-next-line no-new-func
  const STATIONS = new Function('return ' + stationsSrc.slice(0, stationsSrc.indexOf('];') + 1))();
  const cases = [];
  for (const sc of K.scenarios) for (const st of STATIONS) for (const hour of [6, 12, 18, 24]) {
    cases.push({ sc: sc.id, st, hour, o: K.predictionOutcome(K.resolvedState({ scenario: sc.id }), st, hour) });
  }

  it('splits the change into parts that sum to it exactly', () => {
    for (const c of cases) {
      expect(c.o.frontStep + c.o.otherChange, c.sc + '/' + c.st.id + '@' + c.hour).toBeCloseTo(c.o.delta, 9);
    }
  });

  it('names the direction the numbers actually moved', () => {
    const band = K.predictionSameBandC;
    for (const c of cases) {
      const expected = c.o.delta >= band ? 'warmer' : c.o.delta <= -band ? 'colder' : 'same';
      expect(c.o.direction, c.sc + '/' + c.st.id + '@' + c.hour).toBe(expected);
      expect(c.o.endTemp - c.o.startTemp).toBeCloseTo(c.o.delta, 1);
    }
  });

  it('says the front crossed only when the model has it passing inside the window', () => {
    for (const c of cases) {
      const passage = K.frontPassageHour(K.resolvedState({ scenario: c.sc }), c.st);
      const tag = c.sc + '/' + c.st.id + '@' + c.hour;
      if (passage == null) { expect(c.o.frontCrossed, tag).toBe(false); expect(c.o.frontStep, tag).toBe(0); continue; }
      if (c.o.alreadyBehindFront) { expect(c.o.frontCrossed, tag).toBe(false); continue; }
      expect(c.o.frontCrossed, tag).toBe(passage <= c.hour);
      if (!c.o.frontCrossed) expect(c.o.frontStep, tag).toBe(0);
    }
  });

  it('is a fair question: every answer is right somewhere at T+12', () => {
    const seen = new Set(cases.filter((c) => c.hour === 12).map((c) => c.o.direction));
    expect([...seen].sort()).toEqual(['colder', 'same', 'warmer']);
  });

  it('includes a case where the front and the rest of the change pull opposite ways', () => {
    expect(cases.some((c) => c.o.frontCrossed && c.o.frontStep * c.o.otherChange < 0)).toBe(true);
  });
});

// The 2D map pills and the 3D station labels print a reading beside the prediction card,
// which quotes the same numbers. They rounded to whole degrees (Math.round: -2.5 -> -2,
// 2.5 -> 3) while the card printed -2.5, so a label contradicted the card next to it.
describe('station label text (map pills and 3D labels)', () => {
  it('prints the reading at one decimal, like every panel and the prediction card', () => {
    expect(K.stationLabelText('Central School', -2.5)).toBe('Central School  -2.5°');
    expect(K.stationLabelText('Harbor Point', 2.5)).toBe('Harbor Point  2.5°');
    expect(K.stationLabelText('West Ridge', 7)).toBe('West Ridge  7°');
  });

  it('matches the prediction card for every station in every scenario', () => {
    let fractional = 0;
    for (const sc of K.scenarios) for (const st of K.stations) {
      const s = K.resolvedState({ scenario: sc.id });
      const reading = K.stationObservation(Object.assign({}, s, { simHour: 0 }), st);
      const o = K.predictionOutcome(s, st, 12);
      expect(K.stationLabelText(st.name, reading.temperature), sc.id + '/' + st.id).toBe(st.name + '  ' + o.startTemp + '°');
      if (!Number.isInteger(reading.temperature)) fractional += 1;
    }
    // Without fractional readings the rounding bug could not show, and this would pass anyway.
    expect(fractional).toBeGreaterThan(0);
  });

  it('never prints a missing reading as a number, nor a negative zero', () => {
    expect(K.stationLabelText('X', null)).toBe('X  --°');
    expect(K.stationLabelText('X', '')).toBe('X  --°');
    expect(K.stationLabelText('X', NaN)).toBe('X  --°');
    expect(K.stationLabelText('X', -0.04)).toBe('X  0°');
  });

  it('is the only way the scene labels a station', () => {
    expect(src).not.toMatch(/Math\.round\(reading\.temperature\)/);
    expect(src.split('stationLabelText(').length - 1).toBeGreaterThanOrEqual(3);
  });
});
