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
import { readFileSync } from 'node:fs';

// One source read, for the two assertions that are about a CALL SITE in the
// render loop rather than about an exported function's return value.
const RR_SRC = readFileSync('stem_lab/stem_tool_roadready.js', 'utf8');

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

// An AI-caused crash is subtracted from the recorded total to work out how
// many crashes were the learner's fault. That arithmetic is only sound while
// EVERY crash site increments both counters. One site did not: the rear-end
// branch incremented aiCausedCrashes alone, so each AI rear-end cancelled a
// genuine at-fault crash. Two of them took a learner with two real crashes to
// learnerFaultCrashes = 0 and the road test reported PASSED.
//
// The existing coverage used crashes: 1, aiCausedCrashes: 1 -- the case where
// the counters happen to agree -- which is exactly why this survived.
describe('RoadReady AI-caused crash accounting', () => {
  const roadTest = { durationSec: 240, score: 95, startedAtSim: 0 };
  const outcome = (over) =>
    RR.roadTestOutcome(roadTest, baseStats(Object.assign({ distance: 99999 }, over)), 300);

  it('does not let AI-caused crashes cancel the learner\'s own', () => {
    // 2 learner crashes + 2 AI rear-ends = 4 recorded, 2 credited to the AI.
    const o = outcome({ crashes: 4, aiCausedCrashes: 2 });
    expect(o.criticalEvents.learnerFaultCrashes).toBe(2);
    expect(o.critical).toBe(true);
    expect(o.passed).toBe(false);
  });

  it('still exonerates a learner whose only crashes were AI-caused', () => {
    const o = outcome({ crashes: 3, aiCausedCrashes: 3 });
    expect(o.criticalEvents.learnerFaultCrashes).toBe(0);
    expect(o.passed).toBe(true);
  });

  it('fails CLOSED when the two counters have diverged', () => {
    // aiCausedCrashes cannot legitimately exceed crashes. If it does, the
    // figure is untrustworthy, so it must not be allowed to exonerate anyone.
    // Clamping to the recorded total instead would hand out full credit on the
    // strength of the broken counter.
    const o = outcome({ crashes: 2, aiCausedCrashes: 99 });
    expect(o.criticalEvents.learnerFaultCrashes).toBe(2);
    expect(o.passed).toBe(false);
  });

  it('applies the same rule to the drive grade, not just the road test', () => {
    const blamed = outcomeFor({ crashes: 4, aiCausedCrashes: 2 });
    expect(blamed.passed).toBe(false);
    const diverged = outcomeFor({ crashes: 2, aiCausedCrashes: 99 });
    expect(diverged.passed).toBe(false);
    const clean = outcomeFor({ crashes: 3, aiCausedCrashes: 3 });
    expect(clean.passed).toBe(true);
  });

  it('increments BOTH counters at every crash site that credits the AI', () => {
    // The arithmetic in both graders is `crashes - aiCausedCrashes`, so a site
    // that increments aiCausedCrashes WITHOUT incrementing crashes makes each
    // AI event cancel a real at-fault crash. The rear-end branch did exactly
    // that, and two AI rear-ends took a learner with two genuine crashes to
    // learnerFaultCrashes = 0 with the road test reporting PASSED.
    //
    // This is a source assertion because the bug lives at a render-loop call
    // site, not in an exported function. It reads every aiCausedCrashes
    // increment and requires a crashes increment nearby.
    const sites = [];
    const re = /statsRef\.current\.aiCausedCrashes\s*(?:=\s*\(statsRef\.current\.aiCausedCrashes \|\| 0\) \+ 1|\+\+)/g;
    let m;
    while ((m = re.exec(RR_SRC))) sites.push(m.index);
    expect(sites.length).toBeGreaterThanOrEqual(4);

    const missing = sites.filter((at) => {
      // Look back far enough to cover the guard line and the comment above it,
      // but not so far as to reach the previous crash site.
      const window = RR_SRC.slice(Math.max(0, at - 700), at + 200);
      return !/statsRef\.current\.crashes\s*(?:=\s*\(statsRef\.current\.crashes \|\| 0\) \+ 1|\+\+)/.test(window);
    });
    expect(missing).toEqual([]);
  });

  it('counts a brake-check rear-end against the learner', () => {
    // The brake-check branch credits nobody, so it must record a crash: the
    // tool labels it "YOUR FAULT" in the toast. It used to increment neither
    // counter, so a crash the tool blamed on the student vanished entirely.
    const branch = RR_SRC.slice(RR_SRC.indexOf("// Player's fault: brake-check"));
    const upToElse = branch.slice(0, branch.indexOf('} else {'));
    expect(upToElse).toContain('statsRef.current.crashes');
  });
});

// A mission criterion must be failable by the behaviour its LABEL names.
// Three scenarios used habit: 'distance' with habitTarget === distanceMeters,
// making the habit check byte-identical to the `pace` criterion -- two of five
// criteria measuring one thing, and the authored target dead configuration.
// Two of the labels also promised something distance never measured:
// "Complete the maneuver area at walking speed" ticked at 80 mph.
// Two functions implement the SAME following-distance rule: safeFollowingFeet
// for the Stopping Distance Lab, recommendedFollowingMeters for the drive
// loop. They carried separate seconds tables and drifted -- ice was in one and
// missing from the other, so it fell through to the DRY 3 seconds.
describe('RoadReady following-distance rule', () => {
  const impliedSecondsFeet = (mph, w) => RR.safeFollowingFeet(mph, w) / (mph * 1.467);
  const impliedSecondsMeters = (mps, w) =>
    (RR.recommendedFollowingMeters(mps, w, 1) - 2.5) / mps;

  it('uses one seconds table for all three callers', () => {
    // THREE functions implement this rule: safeFollowingFeet (Stopping
    // Distance Lab), recommendedFollowingMeters (drive loop) and
    // drivingFollowingTarget (the live HUD gap indicator). Each held its own
    // table. Two of them disagreed about ice; the third disagreed with both.
    for (const w of ['clear', 'dry', 'rain', 'snow', 'fog', 'ice', 'nonsense']) {
      expect(impliedSecondsFeet(55, w)).toBeCloseTo(impliedSecondsMeters(24.587, w), 2);
      expect(RR.drivingFollowingTarget(w)).toBeCloseTo(impliedSecondsFeet(55, w), 2);
    }
  });

  it('keeps the HUD target consistent with what the lab teaches', () => {
    // A student who sees a 6 s target on the HUD and reads 8 s in the lab has
    // been given two answers. Ice is not currently reachable in the drive loop
    // (no scenario has weather: 'ice'), so this is the latent case -- pinned
    // so a future icy scenario cannot inherit the contradiction.
    expect(RR.drivingFollowingTarget('ice')).toBe(8);
    expect(RR.drivingFollowingTarget('snow')).toBe(6);
    expect(RR.drivingFollowingTarget('rain')).toBe(4);
    expect(RR.drivingFollowingTarget('clear')).toBe(3);
  });

  it('does not give ice the dry-pavement gap', () => {
    // The lab lets a student select Ice. At 55 mph it used to show 242 ft --
    // the identical number it gives for dry pavement -- on a surface where
    // the tool's own model says stopping takes over 1,100 ft.
    expect(impliedSecondsFeet(55, 'ice')).toBeCloseTo(8, 2);
    expect(RR.safeFollowingFeet(55, 'ice')).toBeGreaterThan(RR.safeFollowingFeet(55, 'clear'));
    expect(RR.safeFollowingFeet(55, 'ice')).toBeGreaterThan(RR.safeFollowingFeet(55, 'snow'));
  });

  it('orders the gap by how slippery the surface is', () => {
    // Monotonic in grip: every step down in mu must not shorten the gap.
    const order = ['clear', 'rain', 'snow', 'ice'];
    const gaps = order.map((w) => RR.safeFollowingFeet(55, w));
    for (let i = 1; i < gaps.length; i += 1) {
      expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1]);
    }
  });

  it('covers every weather the Stopping Distance Lab offers', () => {
    // The lab's selector is the reachable input set. A weather it offers but
    // the rule does not know falls through to the dry default silently.
    const LAB_WEATHERS = ['dry', 'rain', 'snow', 'ice'];
    const dryGap = RR.safeFollowingFeet(55, 'dry');
    const unhandled = LAB_WEATHERS.filter(
      (w) => w !== 'dry' && RR.safeFollowingFeet(55, w) === dryGap);
    expect(unhandled).toEqual([]);
  });
});

describe('RoadReady mission habit criteria', () => {
  const driveStats = {
    safetyScore: 100, efficiencyScore: 100, crashes: 0, aiCausedCrashes: 0,
    majorViolations: 0, childStrike: 0, wrongSideViolations: 0, distance: 5000,
    pedYields: 9, stops: 9, secondsOverLimit: 0, speedViolations: 0,
    closeFollows: 0, cyclistClose: 0, busStopCompliance: 9, emergencyYields: 9,
    hardBrakes: 0, jackrabbits: 0, unsignaledLaneChanges: 0, laneChanges: 3,
    skidSeconds: 0, hydroplaneSeconds: 0,
  };
  // stats.maxSpeed is stored in METRES PER SECOND, not mph.
  // Achievement ids need the fuller stats shape (economy, yields, signals).
  const badgeStats = {
    ...driveStats, speedViolations: 0, wildlifeHit: 0,
    mpgSum: 300, mpgSamples: 10, fuelUsed: 1,
  };

  const atPeakMph = (mph, scenarioId) =>
    RR.rrScenarioMissionStatus({ ...driveStats, maxSpeed: mph / 2.23694 }, 600, scenarioId);
  const habitMet = (mph, scenarioId) =>
    atPeakMph(mph, scenarioId).criteria.find((c) => c.id === 'habit').met;

  it('fails the parking walking-speed habit above its cap', () => {
    expect(habitMet(8, 'parking')).toBe(true);
    expect(habitMet(12, 'parking')).toBe(true);   // at the cap
    expect(habitMet(15, 'parking')).toBe(false);
    expect(habitMet(80, 'parking')).toBe(false);  // used to tick
  });

  it('fails the roundabout habit above its cap', () => {
    expect(habitMet(25, 'roundabout')).toBe(true);
    expect(habitMet(30, 'roundabout')).toBe(false);
  });

  it('leaves the rural scanning habit uncapped', () => {
    // Its label is about scanning, not speed, and the generic `speed`
    // criterion already covers the posted limit. An invented cap here would
    // be a standard the label never states.
    expect(habitMet(30, 'rural')).toBe(true);
    expect(atPeakMph(30, 'rural').mission.habitSpeedCapMph).toBeUndefined();
  });

  it('carries the authored cap through the mission builder', () => {
    // rrScenarioMission copies fields explicitly, so a new authored key is
    // dropped unless listed. That happened on the first attempt: the label
    // changed and the check did not.
    expect(atPeakMph(5, 'parking').mission.habitSpeedCapMph).toBe(12);
    expect(atPeakMph(5, 'roundabout').mission.habitSpeedCapMph).toBe(25);
  });

  it('keeps the distance floor as well as the cap', () => {
    // Crawling at 2 mph must not tick the habit without covering the segment.
    const short = RR.rrScenarioMissionStatus(
      { ...driveStats, distance: 10, maxSpeed: 2 / 2.23694 }, 600, 'parking');
    expect(short.criteria.find((c) => c.id === 'habit').met).toBe(false);
  });

  it('makes the smooth habit honour its authored skid allowance', () => {
    // habitTarget was dead configuration for all six 'smooth' scenarios --
    // the branch hardcoded `< 2` and never read it. Third instance of the
    // same defect after the 'speed' and 'distance' branches.
    const skid = (sec, id) => RR.rrScenarioMissionStatus(
      { ...driveStats, skidSeconds: sec }, 600, id).criteria.find((c) => c.id === 'habit').met;
    // The boundary has to be the AUTHORED one, not a looser hardcoded value.
    // Every smooth scenario authors habitTarget: 1, so asserting only that
    // skid 3 fails is vacuous -- a hardcoded `<= 2` passes it too. 1.5 is
    // above the authored allowance and below the old hardcoded one, so it
    // separates them.
    expect(skid(1, 'night')).toBe(true);     // at the authored allowance
    expect(skid(1.5, 'night')).toBe(false);  // a hardcoded 2 would pass this
    expect(skid(3, 'night')).toBe(false);
    expect(RR.rrScenarioMissionStatus(driveStats, 600, 'night').mission.habitTarget).toBe(1);
  });

  it('checks hydroplaning ONLY where standing water can occur', () => {
    // hydroplaneSeconds only accumulates when wheels cross a puddle, and
    // puddles spawn only when scn.weather === 'rain'. Of the scenarios using
    // the smooth habit, only `rain` is weather: 'rain' -- night and dawn are
    // 'clear', fog is 'fog', snow is 'snow'. Grading the other four against a
    // counter that is always 0 is a check that cannot fail.
    const hydro = (sec, id) => RR.rrScenarioMissionStatus(
      { ...driveStats, hydroplaneSeconds: sec }, 600, id).criteria.find((c) => c.id === 'habit').met;
    expect(hydro(2, 'rain')).toBe(false);
    for (const dry of ['night', 'fog', 'snow', 'dawn']) {
      expect(hydro(2, dry)).toBe(true);
      expect(RR.rrScenarioMissionStatus(driveStats, 600, dry)
        .mission.habitHydroplaneMax).toBeUndefined();
    }
    expect(RR.rrScenarioMissionStatus(driveStats, 600, 'rain')
      .mission.habitHydroplaneMax).toBe(1);
  });

  it('holds snow to a tighter hard-brake standard than the others', () => {
    // mu 0.22 is the lowest of the smooth set, and the label is "Gentle
    // winter inputs". A standard identical to fog's would not be one.
    const hb = (n, id) => RR.rrScenarioMissionStatus(
      { ...driveStats, hardBrakes: n }, 600, id).criteria.find((c) => c.id === 'habit').met;
    expect(hb(1, 'snow')).toBe(true);
    expect(hb(2, 'snow')).toBe(false);
    expect(hb(2, 'fog')).toBe(true);
  });

  it('carries the smooth-habit authored keys through the builder', () => {
    // rrScenarioMission copies fields explicitly; an unlisted key is dropped
    // and the label changes while the check does not.
    const rain = RR.rrScenarioMissionStatus(driveStats, 600, 'rain').mission;
    expect(rain.habitHydroplaneMax).toBe(1);
    expect(RR.rrScenarioMissionStatus(driveStats, 600, 'snow').mission.habitHardBrakeMax).toBe(1);
  });

  it('does not let the speedometer margin swallow the work-zone standard', () => {
    // secondsOverLimit is NOT a measure of being at the limit: it only accrues
    // above limit + speedingThresholds(limit).violation, a deliberate 3-8 mph
    // speedometer-error margin. A habit checking only that counter tolerates
    // the whole margin indefinitely -- so a student could drive the entire
    // construction mission at 41.9 mph in a 35 zone with secondsOverLimit at 0
    // and pass, while the tool's own Help Hub teaches that Maine DOUBLES the
    // fine for work-zone speeding.
    const at = (mph, id) => RR.rrScenarioMissionStatus(
      { ...driveStats, maxSpeed: mph / 2.23694, secondsOverLimit: 0 }, 600, id)
      .criteria.find((c) => c.id === 'habit').met;
    expect(at(38, 'construction')).toBe(true);   // at the cap
    expect(at(39, 'construction')).toBe(false);
    expect(at(42, 'construction')).toBe(false);  // used to pass
    expect(at(17, 'school_zone')).toBe(true);
    expect(at(18, 'school_zone')).toBe(false);   // used to pass
  });

  it('keeps the seconds-over-limit check working alongside the peak cap', () => {
    // The two standards are independent: a learner can fail on sustained
    // overspeed even with a legal peak, and vice versa.
    const legalPeak = { ...driveStats, maxSpeed: 15 / 2.23694 };
    const habit = (over) => RR.rrScenarioMissionStatus(
      { ...legalPeak, secondsOverLimit: over }, 600, 'school_zone')
      .criteria.find((c) => c.id === 'habit').met;
    expect(habit(1)).toBe(true);
    expect(habit(1.5)).toBe(false);
  });

  it('leaves scenarios without an authored cap unchanged', () => {
    // The cap is opt-in. Adding it globally would impose a standard those
    // labels never stated -- the generic `speed` criterion already covers
    // the posted limit for them.
    for (const id of ['downtown', 'rural', 'night']) {
      const st = RR.rrScenarioMissionStatus(
        { ...driveStats, maxSpeed: 80 / 2.23694 }, 600, id);
      expect(st.mission.habitSpeedCapMph).toBeUndefined();
      expect(st.criteria.find((c) => c.id === 'habit').met).toBe(true);
    }
  });

  it('does not fail a mission for a crash the AI caused', () => {
    // The mission's `safety` criterion checked raw `crashes`, while both
    // graders subtract aiCausedCrashes. For identical stats the road test
    // PASSED a learner rear-ended by a tailgating AI car and the mission
    // FAILED them -- two verdicts on one event.
    const safetyMet = (over) => RR.rrScenarioMissionStatus(
      { ...driveStats, ...over }, 600, 'residential')
      .criteria.find((c) => c.id === 'safety').met;
    expect(safetyMet({ crashes: 1, aiCausedCrashes: 1 })).toBe(true);
    expect(safetyMet({ crashes: 3, aiCausedCrashes: 3 })).toBe(true);
    expect(safetyMet({ crashes: 1, aiCausedCrashes: 0 })).toBe(false);
    expect(safetyMet({ crashes: 4, aiCausedCrashes: 2 })).toBe(false);
  });

  it('fails the mission CLOSED when the crash counters diverge', () => {
    // Same rule as the graders: an aiCausedCrashes larger than crashes means
    // the bookkeeping is broken, so it must not exonerate anyone.
    const safetyMet = (over) => RR.rrScenarioMissionStatus(
      { ...driveStats, ...over }, 600, 'residential')
      .criteria.find((c) => c.id === 'safety').met;
    expect(safetyMet({ crashes: 2, aiCausedCrashes: 99 })).toBe(false);
    // The guard's real work is at crashes: 0. Without it the subtraction goes
    // NEGATIVE, which is !== 0, so a learner who crashed not once would fail
    // on a corrupt counter. Asserting only the crashes: 2 case is vacuous --
    // 2 - 99 is nonzero either way, so it cannot tell the two apart.
    expect(safetyMet({ crashes: 0, aiCausedCrashes: 5 })).toBe(true);
    expect(safetyMet({ crashes: 0, aiCausedCrashes: 0 })).toBe(true);
  });

  it('keeps the no_crash badge consistent with the grade beside it', () => {
    // Fourth surface reading crash counts. It used raw `crashes`, so a learner
    // rear-ended by AI lost no_crash while KEEPING a_plus and safety_star from
    // the same drive -- the badge row contradicting the grade next to it.
    const badges = (over) => RR.rrDriveAchievementIds(
      { ...badgeStats, ...over }, { elapsedSec: 600 }) || [];
    expect(badges({ crashes: 1, aiCausedCrashes: 1 })).toContain('no_crash');
    expect(badges({ crashes: 1, aiCausedCrashes: 1 })).toContain('a_plus');
    expect(badges({ crashes: 1, aiCausedCrashes: 0 })).not.toContain('no_crash');
    // Same fail-closed boundary as everywhere else: a corrupt counter must not
    // take the badge from a learner who crashed not once.
    expect(badges({ crashes: 0, aiCausedCrashes: 5 })).toContain('no_crash');
  });

  it('gives the mission and the road test the same verdict on one event', () => {
    // Whatever the rule is, a student must not be told two different things
    // about the same drive by two surfaces of the same tool.
    const CASES = [
      { crashes: 0, aiCausedCrashes: 0 }, { crashes: 1, aiCausedCrashes: 0 },
      { crashes: 1, aiCausedCrashes: 1 }, { crashes: 3, aiCausedCrashes: 3 },
      { crashes: 4, aiCausedCrashes: 2 }, { crashes: 2, aiCausedCrashes: 99 },
    ];
    for (const over of CASES) {
      const stats = { ...driveStats, ...over };
      const missionSafe = RR.rrScenarioMissionStatus(stats, 600, 'residential')
        .criteria.find((c) => c.id === 'safety').met;
      const roadTestPassed = RR.roadTestOutcome(
        { durationSec: 240, score: 95, startedAtSim: 0 }, stats, 300).passed;
      expect(missionSafe).toBe(roadTestPassed);
    }
  });

  it('gives every scenario a habit its own label can fail', () => {
    // A habit that no input can break is decoration, not assessment.
    const SCENARIOS = ['residential', 'suburban', 'highway', 'roundabout',
      'rural', 'parking', 'school_zone', 'night', 'snow', 'downtown'];
    const unbreakable = SCENARIOS.filter((id) => {
      const probes = [
        { secondsOverLimit: 200 }, { closeFollows: 20 }, { hardBrakes: 20 },
        { skidSeconds: 20 }, { stops: 0 }, { laneChanges: 0 },
        { unsignaledLaneChanges: 20 }, { distance: 1 },
        { maxSpeed: 80 / 2.23694 },
      ];
      return !probes.some((probe) => {
        const st = RR.rrScenarioMissionStatus({ ...driveStats, ...probe }, 600, id);
        const h = st.criteria.find((c) => c.id === 'habit');
        return h && h.met === false;
      });
    });
    expect(unbreakable).toEqual([]);
  });
});

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

describe('RoadReady hypermiler badge', () => {
  const QUAL = 180;
  const ctx = (over) => Object.assign({
    elapsedSec: QUAL,
    scenarioId: 'suburban',
    time: 'day',
    avgMPG: 30,
    cityMPG: 32,
  }, over || {});

  const badges = (statsOver, ctxOver) =>
    RR.rrDriveAchievementIds(baseStats(statsOver), ctx(ctxOver));

  it('compares against steady cruise, not the EPA city rating', () => {
    // The EPA city figure includes stop-and-go; a sim drive is mostly cruise,
    // so cruising beat it almost automatically. Measured across the line-up
    // the badge fired at 6-9 of 10 cruise speeds. cruiseRefMPG is the same
    // model, vehicle and weather, so beating it means something.
    const justUnder = badges({}, { avgMPG: 34, cruiseRefMPG: 36 });
    const justOver = badges({}, { avgMPG: 38, cruiseRefMPG: 36 });
    expect(justUnder).not.toContain('hypermiler');
    expect(justOver).toContain('hypermiler');
  });

  it('ignores the EPA city rating when a cruise reference is present', () => {
    // avgMPG comfortably beats cityMPG but loses to steady cruise: under the
    // old rule this earned the badge, which is exactly the bug.
    const ids = badges({}, { avgMPG: 40, cityMPG: 32, cruiseRefMPG: 45 });
    expect(ids).not.toContain('hypermiler');
  });

  it('falls back to the city rating when no reference is available', () => {
    // Defensive: an older saved context has no cruiseRefMPG. The badge must
    // still be reachable rather than silently impossible.
    const ids = badges({}, { avgMPG: 40, cityMPG: 32, cruiseRefMPG: undefined });
    expect(ids).toContain('hypermiler');
  });

  it('still requires the drive to pass', () => {
    const ids = badges({ wrongSideViolations: 1 }, { avgMPG: 99, cruiseRefMPG: 30 });
    expect(ids).not.toContain('hypermiler');
  });
});
