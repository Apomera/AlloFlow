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

// The stage's "Regional air" reading is projectConditions' sea-level air. The prediction
// card says whatever the front did not do "is the region's air itself changing: the
// Regional air reading at the top shows it", and names the sea at the coast. These pin
// that both claims are what the model does, not what the copy hopes.
describe('prediction explanation: front, regional air, sea', () => {
  const cases = [];
  for (const sc of K.scenarios) for (const st of K.stations) for (const hour of [6, 12, 18, 24]) {
    const s = K.resolvedState({ scenario: sc.id });
    cases.push({ tag: sc.id + '/' + st.id + '@' + hour, s, st, hour, o: K.predictionOutcome(s, st, hour) });
  }
  const regional = (s, hour) => K.projectConditions(Object.assign({}, s, { simHour: hour }), hour).temperature;

  it('splits the change into front + regional air + sea, summing exactly', () => {
    for (const c of cases) {
      expect(c.o.frontStep + c.o.regionalChange + c.o.seaChange, c.tag).toBeCloseTo(c.o.delta, 9);
    }
  });

  it('the regional part is the change in the Regional air reading', () => {
    for (const c of cases) {
      const shown = regional(c.s, c.hour) - regional(c.s, 0);
      // Station readings and the reading at the top are each rounded to 0.1 C.
      expect(Math.abs(c.o.regionalChange - shown), c.tag + ' regional ' + c.o.regionalChange + ' vs shown ' + shown).toBeLessThanOrEqual(0.15);
    }
  });

  it('names the sea only at the coast, only when the regional air crossed the switch', () => {
    const sw = K.marineSwitchC;
    let seaCases = 0;
    for (const c of cases) {
      const crossed = (regional(c.s, 0) > sw) !== (regional(c.s, c.hour) > sw);
      const expected = c.st.id === 'coast' && crossed ? (regional(c.s, c.hour) > sw ? -2 : 2) * K.marineOffsetC : 0;
      expect(c.o.seaChange, c.tag).toBe(expected);
      if (c.o.seaChange) seaCases += 1;
    }
    // Without a case the sea sentence would never render, and nothing here would test it.
    expect(seaCases).toBeGreaterThan(0);
  });

  it('the constants the card quotes are the ones the observation applies', () => {
    const coast = K.stations.filter((st) => st.id === 'coast')[0];
    const inland = Object.assign({}, coast, { id: 'coast-inland-twin' });
    for (const temp of [-5, 11, 12, 13, 25]) {
      const s = K.resolvedState({ scenario: 'fair', temp, simHour: 0 });
      const air = regional(s, 0);
      const diff = K.stationObservation(s, coast).temperature - K.stationObservation(s, inland).temperature;
      expect(diff, 'regional ' + air).toBeCloseTo(air > K.marineSwitchC ? -K.marineOffsetC : K.marineOffsetC, 9);
    }
  });
});

// The card's live trace draws while the forecast plays. It must never show an hour the
// student has not played (it would give the answer away), must end on the same numbers
// the verdict prints, and may mark the front only once the station is behind it.
describe('predictionTrace (the live trace in the prediction card)', () => {
  const combos = [];
  for (const sc of K.scenarios) for (const st of K.stations) combos.push({ tag: sc.id + '/' + st.id, s: K.resolvedState({ scenario: sc.id }), st });
  // A rounding boundary: at front speed 24.75 Central School's passage is 4.04 h, shown
  // as T+4.0, but the station is not behind the front until hour 5. No default scenario
  // lands on one, so a marker keyed to the ROUNDED hour passed without this.
  combos.push({ tag: 'coldFront@24.75/central', s: K.resolvedState({ scenario: 'coldFront', frontSpeed: 24.75 }), st: K.stations.filter((st) => st.id === 'central')[0] });

  it('never includes an hour past the one played', () => {
    for (const c of combos) for (const played of [0, 1, 4.6, 11, 12, 18]) {
      const t = K.predictionTrace(c.s, c.st, 12, played);
      const last = Math.min(Math.floor(played), 12);
      expect(t.points.map((p) => p.hour), c.tag + ' played ' + played).toEqual(Array.from({ length: last + 1 }, (_, i) => i));
    }
  });

  it('starts and ends on the numbers the verdict prints', () => {
    for (const c of combos) {
      const o = K.predictionOutcome(c.s, c.st, 12);
      const t = K.predictionTrace(c.s, c.st, 12, 12);
      expect(t.points[0].station, c.tag).toBe(o.startTemp);
      expect(t.points[12].station, c.tag).toBe(o.endTemp);
      const regional = (h) => K.projectConditions(Object.assign({}, c.s, { simHour: h }), h).temperature;
      expect(t.points[12].regional - t.points[0].regional, c.tag).toBeCloseTo(regional(12) - regional(0), 9);
    }
  });

  it('marks the front only once the station is behind it, and never if it began behind', () => {
    let marked = 0, unmarkedBefore = 0;
    for (const c of combos) {
      const startBehind = K.stationObservation(Object.assign({}, c.s, { simHour: 0 }), c.st).airMass === 'behind';
      for (let played = 0; played <= 12; played += 1) {
        const t = K.predictionTrace(c.s, c.st, 12, played);
        const behind = K.stationObservation(Object.assign({}, c.s, { simHour: played }), c.st).airMass === 'behind';
        const shouldMark = behind && !startBehind;
        expect(t.frontArrivedAt != null, c.tag + ' played ' + played).toBe(shouldMark);
        if (shouldMark) { marked += 1; expect(t.frontArrivedAt).toBeLessThanOrEqual(played); }
        else if (!startBehind && K.predictionOutcome(c.s, c.st, 12).frontCrossed) unmarkedBefore += 1;
      }
    }
    // Both halves must occur, or the test proves nothing about the timing.
    expect(marked).toBeGreaterThan(0);
    expect(unmarkedBefore).toBeGreaterThan(0);
  });
});

// Precipitation type follows the ground. The scenes used to take ONE type from the
// regional (sea-level) reading: the winter storm rained over the whole 3D scene while three
// stations read -1.5 to -3 C, below the model's own snow threshold. These pin that every
// type shown comes from the same thresholds, applied where the ground is that cold.
describe('precipitation type by place (stations and between them)', () => {
  const states = [];
  for (const sc of K.scenarios) for (const temp of [null, -6, -1, 0.5, 2, 9]) for (const hour of [0, 3, 6, 9, 12, 18]) {
    states.push({ tag: sc.id + ' temp ' + temp + ' @' + hour, s: K.resolvedState(temp == null ? { scenario: sc.id, simHour: hour } : { scenario: sc.id, temp, simHour: hour }), hour });
  }
  const obsOf = (s) => K.stations.map((st) => K.stationObservation(s, st));

  it('the region and the stations use the same thresholds', () => {
    for (const c of states) {
      const regional = K.projectConditions(c.s, c.hour);
      if (regional.precipType !== 'none' && regional.precipType !== 'storms') {
        expect(regional.precipType, c.tag).toBe(K.precipTypeForTemp(regional.temperature));
      }
      for (const o of obsOf(c.s)) {
        const expected = regional.precipType === 'none' || o.precipPotential < 28 ? 'none'
          : regional.precipType === 'storms' ? 'storms' : K.precipTypeForTemp(o.temperature);
        expect(o.precipType, c.tag + ' ' + o.id).toBe(expected);
      }
    }
    expect(K.precipTypeForTemp(K.snowMaxC)).toBe('snow');
    expect(K.precipTypeForTemp(K.snowMaxC + 0.1)).toBe('mixed');
    expect(K.precipTypeForTemp(K.rainMinC - 0.1)).toBe('mixed');
    expect(K.precipTypeForTemp(K.rainMinC)).toBe('rain');
  });

  it('between stations: exactly the reading at a station, never outside the readings between', () => {
    for (const c of states) {
      const obs = obsOf(c.s);
      for (const o of obs) expect(K.surfaceTempAt(obs, o.x, o.y), c.tag + ' ' + o.id).toBe(o.temperature);
      // Just beside a station the analysis stays close to it. A plain average of the
      // stations passes every other check here and paints ONE type over the whole scene.
      for (const o of obs) expect(Math.abs(K.surfaceTempAt(obs, o.x + 0.01, o.y) - o.temperature), c.tag + ' near ' + o.id).toBeLessThan(0.25);
      const lo = Math.min(...obs.map((o) => o.temperature)), hi = Math.max(...obs.map((o) => o.temperature));
      for (let fx = 0; fx <= 1; fx += 0.1) for (let fy = 0; fy <= 1; fy += 0.25) {
        const t = K.surfaceTempAt(obs, fx, fy);
        expect(t, c.tag).toBeGreaterThanOrEqual(lo - 1e-9);
        expect(t, c.tag).toBeLessThanOrEqual(hi + 1e-9);
      }
    }
  });

  it('the type at a station is that station\'s type', () => {
    for (const c of states) {
      const regional = K.projectConditions(c.s, c.hour).precipType;
      const obs = obsOf(c.s);
      for (const o of obs) {
        if (o.precipType === 'none') continue;
        expect(K.surfacePrecipTypeAt(obs, regional, o.x, o.y), c.tag + ' ' + o.id).toBe(o.precipType);
      }
    }
  });

  it('the winter storm snows inland while the regional reading alone says rain', () => {
    const s = K.resolvedState({ scenario: 'winterStorm', simHour: 12 });
    expect(K.projectConditions(s, 12).precipType).toBe('rain');
    const types = obsOf(s).map((o) => o.id + ':' + o.precipType).sort();
    expect(types).toEqual(['central:snow', 'coast:mixed', 'north:snow', 'west:snow']);
  });

  it('groups every station exactly once, for the scene\'s text alternative', () => {
    for (const c of states) {
      const obs = obsOf(c.s);
      const groups = K.stationPrecipGroups(obs);
      const named = groups.flatMap((g) => g.names).sort();
      expect(named, c.tag).toEqual(obs.map((o) => o.name).sort());
      for (const g of groups) for (const name of g.names) expect(obs.find((o) => o.name === name).precipType).toBe(g.type);
    }
  });
});

// The rain/snow line drawn on the 3D ground: where the station analysis crosses the snow
// and rain thresholds. It must sit ON the level, SEPARATE the types (any path from a
// snow-cold station to a warmer one crosses it), and be absent when nothing crosses.
describe('isothermSegments (the rain/snow line)', () => {
  const states = [];
  for (const sc of K.scenarios) for (const temp of [null, -6, -1, 0.5, 2, 9]) for (const hour of [0, 3, 6, 9, 12, 18]) {
    states.push({ tag: sc.id + ' temp ' + temp + ' @' + hour, s: K.resolvedState(temp == null ? { scenario: sc.id, simHour: hour } : { scenario: sc.id, temp, simHour: hour }) });
  }
  const obsOf = (s) => K.stations.map((st) => K.stationObservation(s, st));
  const side = (ax, ay, bx, by, cx, cy) => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax));
  const crosses = (p, q, g) => side(p.x, p.y, q.x, q.y, g[0], g[1]) !== side(p.x, p.y, q.x, q.y, g[2], g[3])
    && side(g[0], g[1], g[2], g[3], p.x, p.y) !== side(g[0], g[1], g[2], g[3], q.x, q.y);

  it('every point of the line is on the level (within 0.1 C)', () => {
    let checked = 0;
    for (const c of states) {
      const obs = obsOf(c.s);
      for (const level of [K.snowMaxC, K.rainMinC]) for (const g of K.isothermSegments(obs, level)) {
        for (const [x, y] of [[g[0], g[1]], [g[2], g[3]]]) { expect(Math.abs(K.surfaceTempAt(obs, x, y) - level), c.tag).toBeLessThan(0.1); checked += 1; }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('separates the types: a path from a colder station to a warmer one crosses it', () => {
    let pairs = 0;
    for (const c of states) {
      const obs = obsOf(c.s);
      for (const level of [K.snowMaxC, K.rainMinC]) {
        const segments = K.isothermSegments(obs, level);
        for (const p of obs) for (const q of obs) {
          // Clear of the level by 0.3 C, so the grid can resolve the crossing between them.
          if (!(p.temperature <= level - 0.3 && q.temperature >= level + 0.3)) continue;
          pairs += 1;
          expect(segments.some((g) => crosses(p, q, g)), c.tag + ' ' + p.id + ' -> ' + q.id + ' at ' + level).toBe(true);
        }
      }
    }
    expect(pairs).toBeGreaterThan(10);
  });

  it('is absent when every station is on one side, present in the winter storm', () => {
    const warm = obsOf(K.resolvedState({ scenario: 'coldFront', simHour: 3 }));
    expect(K.isothermSegments(warm, K.snowMaxC)).toEqual([]);
    const storm = obsOf(K.resolvedState({ scenario: 'winterStorm', simHour: 12 }));
    expect(K.isothermSegments(storm, K.snowMaxC).length).toBeGreaterThan(0);
    expect(K.isothermSegments(storm, K.rainMinC)).toEqual([]);
  });
});

// The weather-map front symbol (3D ground line and 2D map, one plan). Each rule is
// derived from the model, not restated: the side a moving front's symbols sit on is the
// way the model moves it, and a stationary front's warm side is where its stations read
// warmer.
describe('frontMapSymbol (fronts as a weather map draws them)', () => {
  const span = [-10.5, 10.5];
  const shapes = (type, speed) => K.frontMapSymbol(type, speed, 0, span[0], span[1]);

  it('a moving front carries its symbols on the side the model moves it toward, pointing that way', () => {
    for (const sc of K.scenarios.filter((s) => s.frontType === 'cold' || s.frontType === 'warm' || s.frontType === 'occluded')) {
      const s = K.resolvedState({ scenario: sc.id });
      const motion = Math.sign(K.frontPositionFraction(Object.assign({}, s, { simHour: 6 })) - K.frontPositionFraction(Object.assign({}, s, { simHour: 0 })));
      expect(motion, sc.id).not.toBe(0);
      const m = shapes(sc.frontType, s.frontSpeed);
      expect(m.kind).toBe(sc.frontType);
      for (const t of m.triangles) expect(Math.sign(t[1][0]), sc.id).toBe(motion);
      for (const c of m.halfCircles) expect(c.dir, sc.id).toBe(motion);
    }
  });

  it('cold = triangles, warm = half-circles, occluded = both alternating, outflow = dashed with none', () => {
    const cold = shapes('cold', 30), warm = shapes('warm', 30), occ = shapes('occluded', 30), out = shapes('outflow', 12);
    expect(cold.triangles.length).toBeGreaterThan(0); expect(cold.halfCircles).toEqual([]);
    expect(warm.halfCircles.length).toBeGreaterThan(0); expect(warm.triangles).toEqual([]);
    expect(occ.triangles.length).toBeGreaterThan(0); expect(occ.halfCircles.length).toBeGreaterThan(0);
    const occZ = [...occ.triangles.map((t) => [t[1][1], 't']), ...occ.halfCircles.map((c) => [c.z, 'h'])].sort((a, b) => a[0] - b[0]).map((p) => p[1]).join('');
    expect(occZ).toMatch(/^(ht)+h?$/);
    expect(out.triangles).toEqual([]); expect(out.halfCircles).toEqual([]);
    const drawn = out.line.reduce((sum, p) => sum + (p[3] - p[1]), 0);
    expect(drawn).toBeLessThan((span[1] - span[0]) * 0.8);
    expect(drawn).toBeGreaterThan((span[1] - span[0]) * 0.4);
    expect(shapes('none', 10)).toEqual({ kind: 'none', line: [], triangles: [], halfCircles: [] });
  });

  it('with speed 0 a cold or warm front is stationary: triangles toward the warm side, half-circles toward the cold', () => {
    for (const type of ['cold', 'warm']) {
      const sc = K.scenarios.filter((s) => s.frontType === type)[0];
      const s = K.resolvedState({ scenario: sc.id, frontSpeed: 0, simHour: 6 });
      // Two otherwise identical inland stations either side of the stalled front.
      const at = K.frontPositionFraction(s);
      const probe = (x) => K.stationObservation(s, { id: 'probe-' + x, name: 'Probe', x, y: 0.5, elevation: 0 }).temperature;
      const warmSide = Math.sign(probe(at + 0.08) - probe(at - 0.08));
      expect(warmSide, type).not.toBe(0);
      const m = shapes(type, 0);
      expect(m.kind, type).toBe('stationary');
      expect(m.triangles.length).toBeGreaterThan(0);
      expect(m.halfCircles.length).toBeGreaterThan(0);
      for (const t of m.triangles) expect(Math.sign(t[1][0]), type + ' triangle').toBe(warmSide);
      for (const c of m.halfCircles) expect(c.dir, type + ' half-circle').toBe(-warmSide);
    }
  });
});

// The verdict's other signs of a front passage (dew point, pressure, wind), shown only when
// the front crossed the station, from the station time series' window around the passage.
describe('prediction evidence: the other signs of the passage', () => {
  it('appears exactly when the front crossed, from the station time series window', () => {
    let crossedCases = 0;
    for (const sc of K.scenarios) for (const st of K.stations) for (const hour of [6, 12, 18]) {
      const s = K.resolvedState({ scenario: sc.id });
      const o = K.predictionOutcome(s, st, hour);
      const tag = sc.id + '/' + st.id + '@' + hour;
      if (!o.frontCrossed) { expect(o.evidence, tag).toBeNull(); continue; }
      crossedCases += 1;
      const ts = K.stationTimeSeries(s, st, hour, 1);
      expect(o.evidence, tag).toEqual({ fromHour: ts.beforeHour, toHour: ts.afterHour, dewPoint: ts.deltas.dewPoint, pressure: ts.deltas.pressure, windFrom: ts.before.windDir, windTo: ts.after.windDir });
      expect(o.evidence.fromHour, tag).toBeLessThanOrEqual(o.passageHour);
      expect(o.evidence.toHour, tag).toBeGreaterThanOrEqual(Math.min(o.passageHour, hour));
    }
    expect(crossedCases).toBeGreaterThan(5);
  });

  it('shows the textbook cold-front signs: dew point falls, pressure rises, the wind veers to the northwest', () => {
    const s = K.resolvedState({ scenario: 'coldFront' });
    const o = K.predictionOutcome(s, K.stations.filter((st) => st.id === 'central')[0], 12);
    expect(o.frontCrossed).toBe(true);
    expect(o.evidence.dewPoint).toBeLessThan(0);
    expect(o.evidence.pressure).toBeGreaterThan(0);
    expect(K.cardinal(o.evidence.windTo)).toMatch(/^(W|WNW|NW|NNW)$/);
  });
});

// Playback narration. Every station the front reaches within the day is reported once, in
// the hour whose interval contains its passage time (from the front-position formula, not
// from the narration's own test); between arrivals it names the next station.
describe('forecastNarration (what the front did this hour)', () => {
  const moving = K.scenarios.filter((sc) => sc.frontType !== 'none');

  it('reports each arrival once, in the hour that contains the passage time', () => {
    let arrivalsSeen = 0;
    for (const sc of moving) {
      const s = K.resolvedState({ scenario: sc.id });
      const reported = {};
      for (let h = 0; h <= 24; h += 1) {
        const n = K.forecastNarration(s, h);
        if (n.kind === 'arrival') for (const a of n.arrivals) { expect(reported[a.id], sc.id + ' ' + a.id + ' twice').toBeUndefined(); reported[a.id] = h; }
      }
      for (const st of K.stations) {
        const passage = (st.x - 0.28) * 500 / s.frontSpeed;
        if (!(passage > 0 && passage <= 24)) { expect(reported[st.id], sc.id + ' ' + st.id).toBeUndefined(); continue; }
        const h = reported[st.id];
        expect(h, sc.id + ' ' + st.id + ' never reported').toBeDefined();
        expect(passage, sc.id + ' ' + st.id).toBeGreaterThan(h - 1 - 1e-9);
        expect(passage, sc.id + ' ' + st.id).toBeLessThanOrEqual(h + 1e-9);
        arrivalsSeen += 1;
      }
    }
    expect(arrivalsSeen).toBeGreaterThan(8);
  });

  it('an arrival carries the station\'s own change over that hour', () => {
    const s = K.resolvedState({ scenario: 'coldFront' });
    for (let h = 1; h <= 12; h += 1) {
      const n = K.forecastNarration(s, h);
      if (n.kind !== 'arrival') continue;
      for (const a of n.arrivals) {
        const st = K.stations.filter((item) => item.id === a.id)[0];
        const now = K.stationObservation(Object.assign({}, s, { simHour: h }), st);
        const before = K.stationObservation(Object.assign({}, s, { simHour: h - 1 }), st);
        expect(a.tempChange).toBeCloseTo(now.temperature - before.temperature, 9);
        expect(a.windFrom).toBe(before.windDir);
        expect(a.windTo).toBe(now.windDir);
      }
    }
  });

  it('between arrivals it names the soonest station still ahead', () => {
    for (const sc of moving) {
      const s = K.resolvedState({ scenario: sc.id });
      for (let h = 0; h <= 24; h += 1) {
        const n = K.forecastNarration(s, h);
        if (n.kind !== 'ahead') continue;
        const aheadNow = K.stations.filter((st) => K.stationObservation(Object.assign({}, s, { simHour: h }), st).airMass !== 'behind');
        const soonest = Math.min(...aheadNow.map((st) => (st.x - 0.28) * 500 / s.frontSpeed));
        expect(n.next.arrivesAbout, sc.id + '@' + h).toBeCloseTo(soonest, 1);
        expect(n.next.arrivesAbout, sc.id + '@' + h).toBeGreaterThanOrEqual(h - 0.05);
      }
    }
  });

  it('no front, a stalled front and a front too slow for the day each say so', () => {
    expect(K.forecastNarration(K.resolvedState({ scenario: 'fair' }), 6).kind).toBe('noFront');
    expect(K.forecastNarration(K.resolvedState({ scenario: 'coldFront', frontSpeed: 0 }), 6).kind).toBe('stalled');
    const slow = K.forecastNarration(K.resolvedState({ scenario: 'coldFront', frontSpeed: 4 }), 5);
    expect(slow.kind).toBe('beyond');
    expect(slow.next.arrivesAbout).toBeGreaterThan(24);
  });
});
