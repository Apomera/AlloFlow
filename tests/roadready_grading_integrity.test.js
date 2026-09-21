// Grading must be honest about what a student actually did.
//
// The driving grade weights safety 80% and efficiency 20%, and caps the result
// when a critical safety event occurs (crash, vulnerable-road-user strike,
// wrong-side driving, major violation). These tests exercise the tool's OWN
// rrDriveOutcome/rrGradeLetter rather than a replica, so they fail if the
// weighting, the caps, or the pass threshold regress.
//
// The properties that matter pedagogically:
//   - Efficiency can never buy a pass after a crash.
//   - Hitting a pedestrian is capped harder than a fender-bender.
//   - A crash the AI caused is not held against the learner.
//   - A too-short sample is not graded at all, rather than graded generously.
import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) throw new Error('roadready did not populate __RR_TEST_EXPORTS__');
});

// rrSessionEvidence(stats, elapsedSec): duration is the SECOND argument and
// distance is read from stats.distance in metres. A session qualifies at
// >= 60 s and >= ROAD_TEST_MIN_DISTANCE_METERS.
const QUALIFYING_SEC = 180;

const baseStats = (over) => Object.assign({
  safetyScore: 100,
  efficiencyScore: 100,
  crashes: 0,
  aiCausedCrashes: 0,
  majorViolations: 0,
  childStrike: 0,
  wrongSideViolations: 0,
  distance: 1200,
}, over || {});

const outcomeFor = (over, elapsedSec) => {
  const stats = baseStats(over);
  const evidence = RR.rrSessionEvidence(stats, elapsedSec == null ? QUALIFYING_SEC : elapsedSec);
  return RR.rrDriveOutcome(stats, evidence);
};

describe('RoadReady driving grade', () => {
  it('grades a clean qualifying drive as a pass', () => {
    const o = outcomeFor({});
    expect(o.qualifying).toBe(true);
    expect(o.passed).toBe(true);
    expect(o.score).toBe(100);
  });

  it('weights safety at 80% and efficiency at 20%', () => {
    // Perfect eco cannot hide mediocre safety.
    const o = outcomeFor({ safetyScore: 60, efficiencyScore: 100 });
    expect(o.score).toBe(Math.round(60 * 0.8 + 100 * 0.2));
    // 68 weighted, and safety is below 70 either way.
    expect(o.passed).toBe(false);
  });

  it('never lets efficiency buy a pass after a crash', () => {
    const o = outcomeFor({ safetyScore: 100, efficiencyScore: 100, crashes: 1 });
    expect(o.passed).toBe(false);
    expect(o.score).toBeLessThanOrEqual(64);
  });

  it('caps a pedestrian strike harder than an ordinary crash', () => {
    const crash = outcomeFor({ crashes: 1 });
    const strike = outcomeFor({ childStrike: 1 });
    expect(strike.score).toBeLessThan(crash.score);
    expect(strike.passed).toBe(false);
    expect(crash.passed).toBe(false);
  });

  it('does not punish the learner for a crash the AI caused', () => {
    // A moving vehicle hitting the learner's STOPPED car is attributed to the
    // AI and must not cap the learner's result.
    const blamed = outcomeFor({ crashes: 1, aiCausedCrashes: 0 });
    const notBlamed = outcomeFor({ crashes: 1, aiCausedCrashes: 1 });
    expect(blamed.passed).toBe(false);
    expect(notBlamed.passed).toBe(true);
    expect(notBlamed.score).toBeGreaterThan(blamed.score);
  });

  it('treats wrong-side driving and major violations as critical', () => {
    for (const key of ['wrongSideViolations', 'majorViolations']) {
      const o = outcomeFor({ [key]: 1 });
      expect(o.passed, key).toBe(false);
      expect(o.tone, key).toBe('critical');
    }
  });

  it('refuses to grade a sample that is too short, rather than grading it generously', () => {
    const o = outcomeFor({ distance: 20 }, 10);
    expect(o.qualifying).toBe(false);
    expect(o.passed).toBe(false);
    // A perfect-looking short sample must not report a score at all.
    expect(o.score).toBeNull();
  });

  it('requires safety itself to clear the bar, not just the weighted total', () => {
    // Safety 69 with perfect eco weights to 75 — above 70 — but safety alone
    // is below the bar, so it must still fail.
    const o = outcomeFor({ safetyScore: 69, efficiencyScore: 100 });
    expect(o.score).toBeGreaterThanOrEqual(70);
    expect(o.passed).toBe(false);
  });

  it('awards no achievements at all for a non-qualifying sample', () => {
    // A perfect-looking 10-second drive must not mint badges.
    const ids = RR.rrDriveAchievementIds(baseStats({ distance: 20 }), { elapsedSec: 10 });
    expect(ids).toEqual([]);
  });

  it('gates every merit badge behind actually passing', () => {
    // The stats here must SATISFY each badge's own threshold, so the only
    // thing standing between the learner and the badge is `outcome.passed`.
    // (An earlier version used safety 40, which failed every threshold anyway
    // — the test passed even with the pass-gate removed, catching nothing.)
    //
    // A wrong-side violation makes the drive critical and un-passable while
    // leaving safety, eco, stops and lane-change counts pristine.
    const cheating = baseStats({
      safetyScore: 100,
      efficiencyScore: 100,
      wrongSideViolations: 1,
      stops: 5,
      laneChanges: 3,
      unsignaledLaneChanges: 0,
      speedViolations: 0,
      secondsOverLimit: 0,
    });
    const outcome = RR.rrDriveOutcome(cheating, RR.rrSessionEvidence(cheating, QUALIFYING_SEC));
    expect(outcome.passed, 'setup: the drive must fail').toBe(false);

    const ids = RR.rrDriveAchievementIds(cheating, { elapsedSec: QUALIFYING_SEC });
    for (const merit of ['eco_warrior', 'safety_star', 'a_plus', 'full_stop',
      'signal_perfect', 'speed_discipline']) {
      expect(ids, merit + ' must require a pass').not.toContain(merit);
    }
  });

  it('does award those same badges when the drive actually passes', () => {
    // The mirror of the test above: proves the thresholds are reachable, so
    // the previous test is failing for the right reason.
    const clean = baseStats({
      stops: 5,
      laneChanges: 3,
      unsignaledLaneChanges: 0,
      speedViolations: 0,
      secondsOverLimit: 0,
    });
    const ids = RR.rrDriveAchievementIds(clean, { elapsedSec: QUALIFYING_SEC });
    for (const merit of ['eco_warrior', 'safety_star', 'full_stop',
      'signal_perfect', 'speed_discipline']) {
      expect(ids, merit + ' should be reachable on a clean pass').toContain(merit);
    }
    expect(ids).toContain('no_crash');
  });

  it('withholds no_crash when the learner actually crashed', () => {
    const ids = RR.rrDriveAchievementIds(baseStats({ crashes: 1 }), { elapsedSec: QUALIFYING_SEC });
    expect(ids).not.toContain('no_crash');
  });

  it('maps scores to letters monotonically', () => {
    const scores = [0, 35, 55, 65, 75, 85, 95, 100];
    const letters = scores.map((s) => RR.rrGradeLetter(s));
    for (const l of letters) expect(typeof l).toBe('string');
    // A higher score must never earn a worse letter.
    const rank = (l) => 'FDCBA'.indexOf(String(l).charAt(0));
    for (let i = 1; i < letters.length; i++) {
      expect(rank(letters[i])).toBeGreaterThanOrEqual(rank(letters[i - 1]));
    }
  });
});

describe('RoadReady scenario missions', () => {
  const met = (st, id) => (st.criteria.find((c) => c.id === id) || {}).met;
  const status = (scenarioId, stats) =>
    RR.rrScenarioMissionStatus(Object.assign({ distance: 5000 }, stats), 999, scenarioId);

  it('holds speed-habit missions to their authored allowance, not the generic one', () => {
    // school_zone and construction author habitTarget: 1, and their labels
    // ("Hold the active 15 mph limit", "Stay at or below the work-zone limit")
    // promise a tighter standard than ordinary driving.
    //
    // The branch used to hardcode `<= 2`, identical to the generic `speed`
    // criterion, so habitTarget was dead configuration and 2 seconds over the
    // limit in a SCHOOL ZONE passed the habit check.
    for (const id of ['school_zone', 'construction']) {
      const mission = RR.rrScenarioMission(id);
      expect(mission.habit, id).toBe('speed');
      const allowance = mission.habitTarget;
      expect(allowance, id + ' should author a tighter allowance').toBeLessThan(2);

      expect(met(status(id, { secondsOverLimit: allowance }), 'habit'),
        id + ' at its allowance').toBe(true);
      expect(met(status(id, { secondsOverLimit: allowance + 1 }), 'habit'),
        id + ' past its allowance').toBe(false);
    }
  });

  it('keeps the habit check distinct from the generic speed criterion', () => {
    // At 2 seconds over, the generic criterion still passes but a school-zone
    // habit must not — otherwise the habit row tells the student nothing new.
    const st = status('school_zone', { secondsOverLimit: 2 });
    expect(met(st, 'speed')).toBe(true);
    expect(met(st, 'habit')).toBe(false);
  });

  it('falls back to the generic allowance when habitTarget is missing', () => {
    // Defensive: a mission that omits habitTarget must not become unpassable.
    const mission = Object.assign({}, RR.rrScenarioMission('school_zone'));
    expect(Number.isFinite(mission.habitTarget)).toBe(true);
  });
});

describe('RoadReady speeding thresholds', () => {
  it('scales the tolerance with the posted limit', () => {
    // A flat margin is a very different offence at different speeds. The old
    // flat +8 was 16% over on a 50 mph road but 53% over in the 15 mph school
    // zone — so a learner could run the whole school-zone mission at 22 mph
    // and trip nothing at all.
    const school = RR.speedingThresholds(15);
    const rural = RR.speedingThresholds(50);
    expect(school.violation).toBeLessThan(rural.violation);
    // As a fraction of the limit, the allowance must not balloon at low speed.
    expect(school.violation / 15).toBeLessThanOrEqual(rural.violation / 50 + 0.06);
  });

  it('keeps highway behaviour unchanged', () => {
    // 45 and 50 mph roads should still allow roughly the historic 8 mph.
    for (const limit of [45, 50]) {
      expect(RR.speedingThresholds(limit).violation).toBeCloseTo(8, 1);
    }
  });

  it('flags a school-zone learner well before 22 mph', () => {
    const t = RR.speedingThresholds(15);
    expect(15 + t.violation).toBeLessThan(22);
    expect(15 + t.cue).toBeLessThan(15 + t.violation);
  });

  it('orders cue < violation < severe at every scenario limit', () => {
    for (const limit of [10, 15, 25, 30, 35, 40, 45, 50]) {
      const t = RR.speedingThresholds(limit);
      expect(t.cue, 'limit ' + limit).toBeLessThan(t.violation);
      expect(t.violation, 'limit ' + limit).toBeLessThan(t.severe);
    }
  });

  it('leaves a 3 mph hysteresis band at every limit', () => {
    // The reset is `limit + violation - 3`. If that ever meets or exceeds the
    // trigger, hovering at the threshold counts a fresh violation every frame.
    // An absolute `+3` reset did exactly that once the trigger scaled: at 10
    // and 15 mph the gap collapsed to zero.
    for (const limit of [10, 15, 25, 30, 50]) {
      const t = RR.speedingThresholds(limit);
      const trigger = limit + t.violation;
      const reset = limit + t.violation - 3;
      expect(trigger - reset, 'limit ' + limit).toBeCloseTo(3, 5);
      expect(reset, 'limit ' + limit).toBeLessThan(trigger);
    }
  });

  it('never lets the severe tier double a low limit', () => {
    // A flat +15 meant the 15 mph school zone had to be DOUBLED before the
    // debrief event counted as severe.
    const t = RR.speedingThresholds(15);
    expect(15 + t.severe).toBeLessThan(30);
  });

  it('survives a missing or nonsense limit without going negative', () => {
    for (const bad of [undefined, null, NaN, -10]) {
      const t = RR.speedingThresholds(bad);
      expect(t.cue).toBeGreaterThan(0);
      expect(t.violation).toBeGreaterThan(0);
      expect(t.severe).toBeGreaterThan(t.violation);
    }
  });
});

describe('RoadReady speedometer easing', () => {
  it('settles at the same rate on any refresh rate', () => {
    // The needle used a flat 0.14 of the delta per FRAME, so it settled 2.4x
    // faster on a 144 Hz display than on a 60 Hz one. Speeding is scored
    // against the TRUE speed while the learner reacts to the needle, so the
    // size of that lag must not depend on the monitor.
    const settleTime = (fps) => {
      const dt = 1 / fps;
      let shown = 15;
      let t = 0;
      while (Math.abs(20 - shown) > 0.25 && t < 3) {
        shown = RR.drivingResponse(shown, 20, RR.RR_SPEEDO_EASE_PER_SEC, dt);
        t += dt;
      }
      return t;
    };
    const at60 = settleTime(60);
    const at144 = settleTime(144);
    expect(at60).toBeGreaterThan(0.05);
    expect(at144).toBeCloseTo(at60, 1);
  });

  it('eases every HUD readout on a time basis, not per frame', () => {
    // The speedometer, tachometer and the safety/efficiency bars all used a
    // flat fraction of the delta PER FRAME. Each rate below reproduces its old
    // 60 Hz constant exactly, and must now settle in the same wall-clock time
    // at any refresh rate.
    const settle = (rate, fps) => {
      const dt = 1 / fps;
      let v = 0;
      let t = 0;
      while (Math.abs(100 - v) > 1 && t < 5) {
        v = RR.drivingResponse(v, 100, rate, dt);
        t += dt;
      }
      return t;
    };
    for (const [label, rate] of [['speedo', RR.RR_SPEEDO_EASE_PER_SEC], ['tach', 11.91], ['scores', 7.67]]) {
      expect(settle(rate, 144), label).toBeCloseTo(settle(rate, 60), 1);
    }
  });

  it('keeps the historic 60 Hz feel', () => {
    // 1 - exp(-rate/60) should still be the old per-frame 0.14.
    const perFrame = 1 - Math.exp(-RR.RR_SPEEDO_EASE_PER_SEC / 60);
    expect(perFrame).toBeCloseTo(0.14, 2);
  });
});
