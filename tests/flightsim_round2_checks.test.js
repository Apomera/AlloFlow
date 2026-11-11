// Second SkySchool pass (2026-11-10), after every challenge and mission was flown with
// real key presses in Edge. What that found, pinned here:
//  - a landing roll was coached as a takeoff ("You're fast enough! HOLD W"), and a
//    helicopter in flight was coached as a fixed-wing climb;
//  - a crash inside a challenge left the aircraft rolling with no explanation;
//  - the lift calculator opened with lift at 1.9 to 9 times the weight;
//  - the in-flight geography quiz read "Score: 0/1" before the first answer;
//  - the cockpit never showed angle of attack, which the lessons are about;
//  - four challenges now ask for a prediction and answer it from the flight itself.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.SKYSCHOOL_ROUND2_SOURCE || 'stem_lab/stem_tool_flightsim.js';
let FS;
const KT = 0.5924838;
const PHYSICS_KEYS = ['WING_AREA', 'WEIGHT', 'MAX_THRUST', 'CL0', 'CL_PER_AOA', 'CD0', 'CD_INDUCED_K', 'IS_HELICOPTER', 'IS_DRONE',
  'MAX_SPEED_KTS', 'AGL_CEILING', 'ENGINE', 'POWER_HP', 'PROP_EFFICIENCY', 'WINDMILL_CD', 'THRUST_LAPSE', 'RAM_LINEAR', 'RAM_SQUARE',
  'MIL_FRACTION', 'IDLE_FRACTION', 'MCRIT', 'WAVE_DRAG', 'WAVE_DECAY', 'VNE_KIAS', 'MMO', 'SPRINT_MODE'];
const saved = {};

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool(SOURCE, 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  PHYSICS_KEYS.forEach((k) => { saved[k] = FS.Physics[k]; });
});
afterEach(() => { PHYSICS_KEYS.forEach((k) => { if (saved[k] === undefined) delete FS.Physics[k]; else FS.Physics[k] = saved[k]; }); });

const aircraft = (id) => FS.AIRCRAFT.find((a) => a.id === id);

describe('coaching matches what the aircraft is doing', () => {
  const stage = (state, controls, id, ias) => FS.getTakeoffGuidanceStage(state, controls, aircraft(id), 54, ias, null);
  it('fast on the runway with the power back is a landing roll, not a takeoff', () => {
    expect(stage({ onGround: true }, { throttle: 0.27 }, 'cessna172', 67)).toBe('rollout');
    expect(stage({ onGround: true }, { throttle: 0 }, 'cessna172', 30)).toBe('rollout');
  });
  it('the takeoff stages are unchanged', () => {
    expect(stage({ onGround: true }, { throttle: 0 }, 'cessna172', 0)).toBe('takeoff');
    expect(stage({ onGround: true }, { throttle: 1 }, 'cessna172', 30)).toBe('roll');
    expect(stage({ onGround: true }, { throttle: 1 }, 'cessna172', 56)).toBe('rotate');
    expect(stage({ onGround: true }, { throttle: 0.5 }, 'cessna172', 50)).toBe('rotate');
    expect(stage({ onGround: false }, { throttle: 1 }, 'cessna172', 70)).toBe('climb');
  });
  it('a helicopter or drone in flight is not coached as a fixed-wing climb', () => {
    expect(stage({ onGround: false }, { throttle: 0.8 }, 'rescue_heli', 60)).toBe('rotor-fly');
    expect(stage({ onGround: false }, { throttle: 0.5 }, 'drone', 10)).toBe('rotor-fly');
    expect(stage({ onGround: true }, { throttle: 0 }, 'rescue_heli', 0)).toBe('rotor-start');
    expect(stage({ onGround: true }, { throttle: 0.6 }, 'rescue_heli', 0)).toBe('hover');
  });
  it('both new stages have their own words, for keys and for touch', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    ['guidance_rollout_keys', 'guidance_rollout_touch', 'guidance_rotor_fly_keys', 'guidance_rotor_fly_touch'].forEach((key) => {
      expect(source, key).toContain("'stem.flightsim." + key + "'");
    });
    expect(source).toMatch(/takeoffStage === 'rollout' \?/);
    expect(source).toMatch(/takeoffStage === 'rotor-fly' \?/);
  });
  it('a finished rescue or survey no longer shows the takeoff card', () => {
    const ground = { onGround: true, altitude: 76, fieldElev: 76 };
    const heli = aircraft('rescue_heli');
    expect(FS.getFlightTutorialKind(ground, { rescue: { active: true, completed: false } }, heli, null)).toBe('takeoff');
    expect(FS.getFlightTutorialKind(ground, { rescue: { active: true, completed: true } }, heli, null)).toBe(null);
    expect(FS.getFlightTutorialKind(ground, { survey: { active: true, completed: true } }, aircraft('drone'), null)).toBe(null);
  });
});

describe('a crash in a challenge is explained too', () => {
  it('free flight reviews any hard touchdown; a challenge only one too hard to count', () => {
    expect(FS.isLandingReviewActivity('free_flight', 450)).toBe(true);
    ['first_climb', 'first_flight', 'cross_country', 'mountain_flying', 'energy_management', 'world_tour'].forEach((id) => {
      expect(FS.isLandingReviewActivity(id, 499), id).toBe(false);
      expect(FS.isLandingReviewActivity(id, 500), id).toBe(true);
      expect(FS.isLandingReviewActivity(id, 2942), id).toBe(true);
    });
  });
  it('missions, sprints and investigations keep their own endings', () => {
    ['coastal_rescue', 'drone_survey', 'drone_powerline', 'geography_sprint', 'stall_investigation', '', null, undefined, 'toString'].forEach((id) => {
      expect(FS.isLandingReviewActivity(id, 3000), String(id)).toBe(false);
    });
    expect(FS.isLandingReviewActivity('first_flight', NaN)).toBe(false);
  });
  it('the 500 fpm line is the one the challenge itself uses', () => {
    const record = FS.createFlightChallenge('first_climb', { onGround: true, altitude: 76, fieldElev: 76 });
    expect(record).toBeTruthy();
    expect(fs.readFileSync(SOURCE, 'utf8')).toContain('context.touchdownFPM < 500');
  });
});

describe('the lift calculator opens in level flight', () => {
  it('every preset opens with lift within half a percent of weight', () => {
    FS.FORCE_CALCULATOR_PRESETS.forEach((preset, index) => {
      const condition = FS.flightCalculatorCondition({ calcPreset: index });
      expect(Math.abs(condition.liftWeightRatio - 1), preset.name + ' opens at ' + condition.liftWeightRatio.toFixed(3)).toBeLessThan(0.005);
      expect(condition.inputs.calcAltitude).toBe(0);
      expect(condition.inputs.calcWingArea).toBe(preset.wingArea);
    });
  });
  it('the opening speed is one the aircraft can fly and the coefficient is on the slider', () => {
    FS.FORCE_CALCULATOR_PRESETS.forEach((preset) => {
      expect(preset.startSpeed, preset.name).toBeGreaterThan(0);
      expect(preset.startSpeed, preset.name).toBeLessThan(preset.maxSpeed);
      expect(Math.round(preset.cl * 20) / 20, preset.name).toBe(preset.cl);
      expect(preset.cl).toBeGreaterThanOrEqual(0.1);
      expect(preset.cl).toBeLessThanOrEqual(2);
    });
  });
  it('a value the student set is kept', () => {
    expect(FS.normalizeFlightCalculatorInputs({ calcPreset: 0, calcSpeed: 100, calcCl: 1.5 })).toMatchObject({ calcSpeed: 100, calcCl: 1.5 });
  });
});

describe('the geography quiz header counts answered questions', () => {
  it('names the question until it is answered', () => {
    expect(FS.getGeoQuizHeader({ total: 1, score: 0, showResult: false })).toEqual({ pending: true, question: 1, score: 0, answered: 0 });
    expect(FS.getGeoQuizHeader({ total: 3, score: 2, showResult: false })).toEqual({ pending: true, question: 3, score: 2, answered: 2 });
  });
  it('shows the score out of answered questions afterwards', () => {
    expect(FS.getGeoQuizHeader({ total: 1, score: 1, showResult: true })).toEqual({ pending: false, question: 1, score: 1, answered: 1 });
    expect(FS.getGeoQuizHeader({ total: 3, score: 2, showResult: true })).toEqual({ pending: false, question: 3, score: 2, answered: 3 });
  });
  it('never shows a score above the answered count, or a broken number', () => {
    expect(FS.getGeoQuizHeader({ total: 2, score: 9, showResult: false }).score).toBe(1);
    expect(FS.getGeoQuizHeader({ total: NaN, score: NaN })).toEqual({ pending: true, question: 1, score: 0, answered: 0 });
    expect(FS.getGeoQuizHeader(null)).toEqual({ pending: true, question: 1, score: 0, answered: 0 });
  });
  it('both the dialog and the canvas card use it', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source.split('geoQuizHeaderText(quiz)').length - 1).toBe(2);
    expect(source).not.toContain(".replace('{total}', quiz.total)");
  });
});

describe('angle of attack is shown in the cockpit', () => {
  it('bands: clear, within 4 degrees of the critical angle, and stalled', () => {
    const critical = FS.Physics.CRITICAL_AOA;
    expect(critical).toBe(15);
    expect(FS.getFlightAoaBand(5, critical)).toBe('ok');
    expect(FS.getFlightAoaBand(10.9, critical)).toBe('ok');
    expect(FS.getFlightAoaBand(11, critical)).toBe('near');
    expect(FS.getFlightAoaBand(14.9, critical)).toBe('near');
    expect(FS.getFlightAoaBand(15, critical)).toBe('stall');
    expect(FS.getFlightAoaBand(-16, critical)).toBe('stall');
    expect(FS.getFlightAoaBand(NaN, critical)).toBe(null);
    expect(FS.getFlightAoaBand(5, 0)).toBe(null);
  });
  it('the readout is drawn beside the load meter for fixed-wing aircraft only', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toMatch(/if \(!currentAC\.isHelicopter && !currentAC\.isDrone && instruments\.gForce\.x - 46 >= 60\) drawAoaReadout\(/);
  });
});

describe('predict, then check', () => {
  const ids = ['first_climb', 'first_flight', 'energy_management', 'mountain_flying'];
  const record = (id, objectives, extra) => Object.assign({ id, objectives: objectives || {} }, extra);
  const air = (altitude, fpm, kt, field) => ({ onGround: false, altitude, fieldElev: field == null ? 76 : field, vsi: fpm / 60, speed: kt / KT });
  function run(measure, rec, state, seconds) { for (let i = 0; i < seconds * 10; i++) measure = FS.stepFlightPrediction(measure, rec, state, 0.1); return measure; }

  it('four challenges have a question, three options and an explanation', () => {
    expect(Object.keys(FS.FLIGHT_PREDICTIONS).sort()).toEqual(ids.slice().sort());
    ids.forEach((id) => {
      const card = FS.FLIGHT_PREDICTIONS[id];
      expect(card.question.length).toBeGreaterThan(30);
      expect(card.options).toHaveLength(3);
      expect(new Set(card.options.map((o) => o[0])).size).toBe(3);
      expect(card.why.length).toBeGreaterThan(60);
    });
  });
  it('nothing is reported until the flight has shown it', () => {
    ids.forEach((id) => { expect(FS.getFlightPredictionResult(record(id), {}, null), id).toBe(null); });
    const early = run({}, record('first_climb'), air(400, 600, 70), 3);
    expect(FS.getFlightPredictionResult(record('first_climb', { climb: true }), early, null)).toBe(null);
    expect(FS.getFlightPredictionResult(record('world_tour'), {}, null)).toBe(null);
  });
  it('First Climb reports the climb rate and time actually flown', () => {
    let m = run({}, record('first_climb'), air(150, 600, 62), 10);       // below 200 ft: counts time, not the average
    m = run(m, record('first_climb'), air(600, 620, 70), 60);
    const result = FS.getFlightPredictionResult(record('first_climb', { climb: true }), m, null);
    expect(result.observed).toBe('mid');
    expect(Math.round(result.climbFpm)).toBe(620);
    expect(Math.round(result.seconds)).toBe(70);
    expect(FS.getFlightPredictionResult(record('first_climb', { climb: true }), run({}, record('first_climb'), air(600, 150, 70), 30), null).observed).toBe('slow');
  });
  it('measuring stops when the objective is met, on the ground, and on a paused frame', () => {
    const m = run({}, record('first_climb'), air(600, 620, 70), 20);
    expect(run(m, record('first_climb', { climb: true }), air(1200, 0, 100), 20)).toEqual(m);
    expect(run(m, record('first_climb'), { onGround: true, altitude: 76, fieldElev: 76, vsi: 0, speed: 0 }, 5)).toEqual(m);
    expect(FS.stepFlightPrediction(m, record('first_climb'), air(600, 620, 70), 0)).toBe(m);
    expect(FS.stepFlightPrediction(m, record('first_climb'), air(NaN, 620, 70), 0.1)).toBe(m);
    expect(FS.stepFlightPrediction(m, record('world_tour'), air(600, 620, 70), 0.1)).toBe(m);
  });
  it('First Flight compares the speed in the climb with the speed held level', () => {
    let m = run({}, record('first_flight'), air(1500, 600, 68), 60);
    m = run(m, record('first_flight', { climb: true }), air(3050, 50, 104), 30);
    m = run(m, record('first_flight', { climb: true }), air(3400, 50, 150), 30);   // outside the band: ignored
    const result = FS.getFlightPredictionResult(record('first_flight', { climb: true, steady: true }), m, null);
    expect(result.observed).toBe('rise');
    expect(Math.round(result.climbKts)).toBe(68);
    expect(Math.round(result.levelKts)).toBe(104);
    expect(FS.getFlightPredictionResult(record('first_flight', { climb: true }), m, null)).toBe(null);
    const flat = run(run({}, record('first_flight'), air(1500, 600, 80), 30), record('first_flight', { climb: true }), air(3000, 0, 82), 30);
    expect(FS.getFlightPredictionResult(record('first_flight', { climb: true, steady: true }), flat, null).observed).toBe('same');
  });
  it('Energy Management reports the height gained and the speed it cost', () => {
    const snapshot = { altitude: 4900, airspeed: 100 };
    let m = run({}, record('energy_management', { glide: true }, { glideSnapshot: snapshot }), air(5210, 400, 91, 0), 5);
    const result = FS.getFlightPredictionResult(record('energy_management', { glide: true, climb: true }), m, null);
    expect(result.observed).toBe('fall');
    expect(Math.round(result.gainFt)).toBe(310);
    expect(Math.round(result.startKts)).toBe(100);
    expect(Math.round(result.endKts)).toBe(91);
    expect(run({}, record('energy_management', {}, { glideSnapshot: snapshot }), air(4900, -500, 100, 0), 5)).toEqual({});
  });
  it('High-Altitude Takeoff compares Denver with a Portland climb from the same session, or says there is none', () => {
    const m = run({}, record('mountain_flying'), air(7000, 390, 74, 5431), 60);
    const done = record('mountain_flying', { climb: true });
    expect(FS.getFlightPredictionResult(done, m, 640)).toMatchObject({ observed: 'weaker', referenceFpm: 640 });
    expect(FS.getFlightPredictionResult(done, m, 400).observed).toBe('same');
    expect(FS.getFlightPredictionResult(done, m, 300).observed).toBe('stronger');
    expect(FS.getFlightPredictionResult(done, m, null)).toMatchObject({ observed: null, referenceFpm: null });
    expect(FS.getFlightPredictionResult(done, m, NaN).observed).toBe(null);
  });

  // The explanations state what the model does. Fly the model and check each one.
  function hold(o) {
    const ac = aircraft('cessna172'); FS.Physics.configureAircraft(ac);
    let state = { speed: o.kt / KT, altitude: o.alt, vsi: 0, heading: 90, lat: 43.6, lon: -70.3, onGround: false, fieldElev: 0 };
    const controls = { throttle: 1, pitch: 4, bank: 0 }, rows = [];
    for (let i = 0; i < 90 * 30; i++) {
      const kt = state.speed * KT;
      if (o.level) controls.pitch = Math.max(-15, Math.min(18, controls.pitch - state.vsi * 60 * 0.00002 + (o.alt - state.altitude) * 0.00002));
      else controls.pitch = Math.max(-15, Math.min(18, controls.pitch + (kt - o.kt) * 0.004));
      state = Object.assign({}, state, FS.Physics.step(state, 1 / 30, controls));
      if (i > 60 * 30) rows.push({ kt: state.speed * KT, fpm: state.vsi * 60 });
    }
    const mean = (k) => rows.reduce((n, r) => n + r[k], 0) / rows.length;
    return { kt: mean('kt'), fpm: mean('fpm') };
  }
  it('the model agrees with each explanation', () => {
    const seaLevel = hold({ kt: 74, alt: 500 }), slow = hold({ kt: 60, alt: 500 }), denver = hold({ kt: 74, alt: 6500 });
    // "several hundred feet per minute", and best at one speed
    expect(seaLevel.fpm).toBeGreaterThan(500); expect(seaLevel.fpm).toBeLessThan(900);
    expect(slow.fpm).toBeLessThan(seaLevel.fpm);
    // Denver: weaker, by the measure the card uses
    expect(denver.fpm).toBeLessThan(seaLevel.fpm * 0.9);
    expect(Math.round(FS.Physics.airDensity(5431) / FS.Physics.RHO_SL * 100)).toBe(85);
    // level with the power left on: faster than the climb
    const level = hold({ kt: 100, alt: 3000, level: true });
    expect(Math.abs(level.fpm)).toBeLessThan(60);
    expect(level.kt).toBeGreaterThan(seaLevel.kt + 5);
  });
  it('the card is drawn in the challenge panel and its choice is not saved', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('renderFlightPrediction(record, isDebrief),');
    expect(source).toContain("'data-flight-predict-option': option[0]");
    // session only: the choice lives in a ref, never in a saved patch
    expect(source).toContain('challengePredictRef.current.choice = option[0];');
    expect(source).not.toMatch(/upd(Multi)?\([^)]*predict/i);
  });
});

describe('the flight deck fits a phone held sideways', () => {
  // Measured in Edge at 844x390: the deck was 500px tall in a 390px window, so the
  // instruments sat below the fold and the Pause and Help buttons were clipped away.
  it('the 500px floor yields to a short screen at any width', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('@media(max-height:580px){#skyschool-flight-container{min-height:0!important;height:max(280px,calc(100dvh - 80px))!important;max-height:max(280px,calc(100dvh - 80px))!important}}');
  });
  // Measured at 667x375: the coach strip began at x=203 and covered the Help button (186 to 230).
  it('the coach strip starts to the right of the deck buttons', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('.skyschool-tutorial-card{top:72px!important;left:244px!important;right:152px!important;bottom:auto!important;width:auto!important;');
  });
  it('the prediction question is not squeezed into the 144px column of a short deck', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('@media(max-height:520px){#skyschool-flight-container [data-flight-predict="open"]{display:none!important}}');
  });
  it('the sideways-phone layout covers phones wider than 820px', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('@media(min-width:568px) and (max-width:960px) and (max-height:520px){#skyschool-flight-container .skyschool-hud-dock{');
    expect(source).not.toContain('@media(min-width:568px) and (max-width:820px) and (max-height:520px)');
  });
});

describe('numbers the content quotes are the model\'s numbers', () => {
  it('the vertical-speed entry gives the climb rate this Cessna has', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('The Cessna here climbs about 650 fpm at full power near sea level.');
    expect(source).not.toContain('emergency or pattern descent');
    const best = Math.max(hold74(), hold80());
    expect(best).toBeGreaterThan(600); expect(best).toBeLessThan(700);
    function hold74() { return climb(74); } function hold80() { return climb(80); }
    function climb(target) {
      const ac = aircraft('cessna172'); FS.Physics.configureAircraft(ac);
      let state = { speed: target / KT, altitude: 500, vsi: 0, heading: 90, lat: 43.6, lon: -70.3, onGround: false, fieldElev: 0 };
      const controls = { throttle: 1, pitch: 4, bank: 0 }; let sum = 0, count = 0;
      for (let i = 0; i < 90 * 30; i++) {
        controls.pitch = Math.max(-15, Math.min(18, controls.pitch + (state.speed * KT - target) * 0.004));
        state = Object.assign({}, state, FS.Physics.step(state, 1 / 30, controls));
        if (i > 60 * 30) { sum += state.vsi * 60; count++; }
      }
      return sum / count;
    }
  });
  it('a Cessna takeoff speed in miles per hour', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain('A little Cessna takes off at about 65 mph.');
    // The trainer here lifts off near 57 kt: 57 kt is 66 mph.
    expect(Math.round(57 * 1.15078)).toBe(66);
  });
});

describe('pilot logbook', () => {
  it('is empty for a new student', () => {
    const book = FS.getFlightLogbook({}, 0);
    expect(book.started).toBe(false);
    expect(book).toMatchObject({ minutes: 0, lessons: 0, lessonTotal: 7, challenges: [], challengeTotal: 6, rescues: 0, surveys: 0, airports: 0, runwayLanding: false, bestLandingFpm: null, badges: 0 });
  });
  it('counts only checked progress', () => {
    const book = FS.getFlightLogbook({ totalFlightTime: 754, completedLessons: { lift: true, drag: true, bogus: true, weight: false },
      rescuesCompleted: 1, surveysCompleted: 2, visitedAirports: ['kpwm', 'kjfk', 'kpwm', 'nowhere'], personalBests: { landingFpm: 113.6 } }, 3);
    expect(book.started).toBe(true);
    expect(book.minutes).toBe(12);
    expect(book.lessons).toBe(2);
    expect(book.rescues).toBe(1);
    expect(book.surveys).toBe(2);
    expect(book.airports).toBe(2);
    expect(book.bestLandingFpm).toBe(114);
    expect(book.badges).toBe(3);
  });
  it('a finished challenge appears by id, an unfinished one does not', () => {
    const done = FS.createFlightChallenge('first_climb', { onGround: true, altitude: 76, fieldElev: 76 });
    let record = done;
    for (let i = 0; i < 40; i++) record = FS.advanceFlightChallenge(record, { onGround: false, altitude: 1100, fieldElev: 76, vsi: 8, speed: 120, lat: 43.6, lon: -70.3, heading: 30 }, { bank: 0, throttle: 1 }, 0.1, {});
    expect(record.status).toBe('complete');
    record.completedAt = new Date().toISOString();
    expect(FS.getFlightLogbook({ challengeResults: { first_climb: record } }, 0).challenges).toEqual(['first_climb']);
    expect(FS.getFlightLogbook({ challengeResults: { first_climb: done } }, 0).challenges).toEqual([]);
  });
  it('hostile saved values do not break it', () => {
    [null, 'x', 7, { totalFlightTime: 'NaN', completedLessons: 'all', personalBests: 'best', rescuesCompleted: -4, visitedAirports: 9 }].forEach((data) => {
      const book = FS.getFlightLogbook(data, -1);
      expect(book.minutes).toBe(0); expect(book.lessons).toBe(0); expect(book.rescues).toBe(0); expect(book.badges).toBe(0); expect(book.bestLandingFpm).toBe(null);
    });
  });
  it('the card is on the menu with a copy button, and holds no typed text', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).toContain("'data-flight-logbook': 'true'");
    expect(source).toContain("'data-flight-logbook-copy': 'true'");
    expect(source).toContain('if (!book.started) return null;');
  });
});

describe('every challenge says how long it takes', () => {
  it('all nine have a whole-minute estimate', () => {
    expect(Object.keys(FS.FLIGHT_CHALLENGE_MINUTES).sort()).toEqual(['coastal_rescue', 'cross_country', 'drone_powerline', 'drone_survey', 'energy_management', 'first_climb', 'first_flight', 'mountain_flying', 'world_tour']);
    Object.values(FS.FLIGHT_CHALLENGE_MINUTES).forEach((minutes) => { expect(Number.isInteger(minutes) && minutes >= 2 && minutes <= 40).toBe(true); });
  });
  // Flown with real keys in Edge on 2026-11-10 (seconds of sim time to completion).
  it('the estimates cover the times actually flown', () => {
    const flown = { first_climb: 115, first_flight: 725, cross_country: 430, mountain_flying: 939, energy_management: 66, coastal_rescue: 473, drone_survey: 858 };
    Object.keys(flown).forEach((id) => {
      expect(FS.FLIGHT_CHALLENGE_MINUTES[id] * 60, id).toBeGreaterThanOrEqual(flown[id] * 0.75);
      expect(FS.FLIGHT_CHALLENGE_MINUTES[id] * 60, id).toBeLessThanOrEqual(Math.max(180, flown[id] * 1.6));
    });
  });
});

describe('the survey drone battery lasts a careful first flight', () => {
  it('about 22 minutes at hover power, and still finite at full power', () => {
    const hover = 100 / FS.getDroneBatteryDrain(0.5) / 60, full = 100 / FS.getDroneBatteryDrain(1) / 60;
    expect(hover).toBeGreaterThan(20); expect(hover).toBeLessThan(25);
    expect(full).toBeGreaterThan(12); expect(full).toBeLessThan(16);
    expect(FS.getDroneBatteryDrain(NaN)).toBe(0.035);
    // the first survey flown with real keys took 858 s: it now ends with a real reserve
    expect(100 - 858 * FS.getDroneBatteryDrain(0.5)).toBeGreaterThan(30);
  });
  it('the mission loop uses it', () => {
    expect(fs.readFileSync(SOURCE, 'utf8')).toContain('var batDrain = getDroneBatteryDrain(ctrl.throttle) * dt;');
  });
});
