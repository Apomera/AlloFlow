import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Execute the shipped simulation and its integrated practice helpers.
// These checks measure reachable outcomes,
// rather than duplicating the aircraft physics or checking source strings.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const modelSource = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const airportSource = source.slice(source.indexOf('  var AIRPORTS ='), source.indexOf('  // ── AIRCRAFT TYPES ──'));
const typeStart = source.indexOf('  var AC_TYPES =');
const typeSource = source.slice(typeStart, source.indexOf('  ];', typeStart) + 5);
const practiceStart = source.indexOf('  // ── ATC PURPOSEFUL PRACTICE ──');
const practiceEnd = source.indexOf('  // ── END ATC PURPOSEFUL PRACTICE ──');
if (practiceStart < 0 || practiceEnd <= practiceStart) throw new Error('The canonical ATC tool must contain its purposeful-practice helpers.');
const practiceSource = source.slice(practiceStart, practiceEnd);
// Shift recording now updates the canonical durable practice rollup, which is
// defined between the objective helpers and the recovery helpers.
const learningSource = source.slice(practiceEnd, source.indexOf('  // ── ATC SHIFT RECOVERY ──'));
const recovery = source.slice(source.indexOf('  // ── ATC SHIFT RECOVERY ──'), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(modelSource + airportSource + typeSource + practiceSource + learningSource + recovery + '\nreturn { AIRPORTS, AC_TYPES, ATC_PRACTICE_SCENARIOS, createPracticeShift, scenarioProgress, atcPracticeSnapshot, atcExerciseResultSnapshot, recordPracticeOutcome, aircraftEtaMinutes, aircraftSeparation, advanceAircraft, runwayAvailable, reserveRunway, serializeAtcShift, restoreAtcShift, recordAtcShift, atcShiftHistory };')();

function clear(ac) {
  Object.assign(ac, { state: 'approach', approachStage: 'entry', holdCenter: null, targetSpeed: ac.type.speed, touchdownReady: false });
}

function simulate(game, plan, limit = 35) {
  const dt = 1 / 60;
  let activePairs = new Set();
  for (let frame = 0; frame < limit * 60; frame++) {
    plan(game);
    game.time += dt;
    for (const ac of game.aircraft.filter(ac => ac.state !== 'landed' && ac.state !== 'departed')) {
      model.advanceAircraft(ac, dt);
      if (ac.touchdownReady) {
        if (model.runwayAvailable(ac.assignedRunway, game.airport, game.runwayBusyUntil, game.time)) {
          ac.state = 'landed';
          game.landed++;
          model.reserveRunway(ac.assignedRunway, game.airport, game.runwayBusyUntil, game.time);
          model.recordPracticeOutcome(game, 'landing', ac);
        } else {
          ac.state = 'goAround';
          ac.touchdownReady = false;
          ac.targetAltitude = 3000;
          ac.targetHeading = ac.assignedRunway.hdg;
          game.goArounds++;
        }
      }
      if (ac.state !== 'landed' && (ac.x < -20 || ac.x > 420 || ac.y < -20 || ac.y > 420 || ac.fuel <= 0)) {
        ac.state = 'departed';
        model.recordPracticeOutcome(game, 'lost', ac);
      }
    }
    const active = game.aircraft.filter(ac => ac.state !== 'landed' && ac.state !== 'departed');
    const pairs = new Set();
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (!model.aircraftSeparation(active[i], active[j]).conflict) continue;
        const key = [active[i].id, active[j].id].sort().join(':');
        pairs.add(key);
        if (!activePairs.has(key)) game.conflictEpisodes++;
      }
    }
    if (pairs.size) game.conflicts += dt;
    activePairs = pairs;
    const progress = model.scenarioProgress(game);
    if (progress.complete || progress.failed) return progress;
  }
  return model.scenarioProgress(game);
}

describe('ATC purposeful practice', () => {
  it('creates four paused, deterministic exercises with canonical model references', () => {
    expect(model.ATC_PRACTICE_SCENARIOS).toHaveLength(4);
    for (const scenario of model.ATC_PRACTICE_SCENARIOS) {
      const game = model.createPracticeShift(scenario.id, 'atc-practice-fixture');
      expect(game).toEqual(model.createPracticeShift(scenario.id, 'atc-practice-fixture'));
      expect(game.paused).toBe(true);
      expect(game.trainingMode).toBe('guided');
      expect(game.airport).toBe(model.AIRPORTS.find(airport => airport.id === scenario.airportId));
      expect(game.aircraft.length).toBeLessThanOrEqual(game.airport.maxTraffic);
      for (const ac of game.aircraft) {
        expect(ac.type).toBe(model.AC_TYPES.find(type => type.id === ac.type.id));
        if (ac.assignedRunway) expect(game.airport.runways).toContain(ac.assignedRunway);
        expect(ac.fuel).toBeGreaterThan(model.aircraftEtaMinutes(ac, ac.assignedRunway || game.airport.runways[0]) + 15);
      }
      expect(model.scenarioProgress(game).complete).toBe(false);
      expect(model.scenarioProgress(game).failed).toBe(false);
      for (let i = 0; i < game.aircraft.length; i++) {
        for (let j = i + 1; j < game.aircraft.length; j++) expect(model.aircraftSeparation(game.aircraft[i], game.aircraft[j]).conflict).toBe(false);
      }
    }
    expect(model.createPracticeShift('unknown', 'atc-fixture')).toBeNull();
  });

  it('can complete the first landing with runway assignment and approach clearance', () => {
    const game = model.createPracticeShift('first_landing', 'atc-first');
    expect(game.aircraft[0].assignedRunway).toBeNull();
    game.aircraft[0].assignedRunway = game.airport.runways[0];
    clear(game.aircraft[0]);
    const result = simulate(game, () => {});
    expect(result.complete).toBe(true);
    expect(result.failed).toBe(false);
    expect(game.practice.landedIds).toEqual([101]);
    expect(game.conflictEpisodes).toBe(0);
    expect(game.time).toBeLessThan(15);
  });

  it('makes the farther, faster aircraft arrive first and supports a safe hold/release sequence', () => {
    const game = model.createPracticeShift('arrival_sequence', 'atc-sequence');
    const [near, fast] = game.aircraft;
    expect(model.aircraftEtaMinutes(fast, fast.assignedRunway)).toBeLessThan(model.aircraftEtaMinutes(near, near.assignedRunway));
    expect(model.aircraftEtaMinutes(fast, fast.assignedRunway)).toBeCloseTo(18.5714, 3);
    near.state = 'holding';
    clear(fast);
    const result = simulate(game, state => {
      if (fast.state === 'landed' && near.state === 'holding' && model.runwayAvailable(near.assignedRunway, state.airport, state.runwayBusyUntil, state.time)) clear(near);
    });
    expect(result.complete).toBe(true);
    expect(result.failed).toBe(false);
    expect(game.practice.landedIds).toEqual([102, 101]);
    expect(game.goArounds).toBe(0);
    expect(game.conflictEpisodes).toBe(0);
  });

  it('protects converging tracks using a progressive 1,000-foot climb', () => {
    const game = model.createPracticeShift('separation_recovery', 'atc-separation');
    game.aircraft[0].targetAltitude = 6000;
    const result = simulate(game, () => {});
    expect(result.complete).toBe(true);
    expect(result.failed).toBe(false);
    expect(game.time).toBeGreaterThanOrEqual(6);
    expect(Math.abs(game.aircraft[0].altitude - game.aircraft[1].altitude)).toBe(1000);
    expect(game.conflictEpisodes).toBe(0);
    expect(game.practice.lostIds).toEqual([]);
  });

  it('detects the untreated converging conflict and does not reward waiting until it clears', () => {
    const game = model.createPracticeShift('separation_recovery', 'atc-untreated');
    const result = simulate(game, () => {});
    expect(result.failed).toBe(true);
    expect(result.complete).toBe(false);
    expect(game.conflictEpisodes).toBe(1);
    game.time = 10;
    game.aircraft[0].altitude = 6000;
    expect(model.scenarioProgress(game).complete).toBe(false);
  });

  it('can land medical priority traffic before releasing the crossing-runway arrival', () => {
    const game = model.createPracticeShift('crossing_priority', 'atc-priority');
    const [medical, routine] = game.aircraft;
    expect(medical.emergency.priority).toBe(true);
    expect(medical.assignedRunway).not.toBe(routine.assignedRunway);
    routine.state = 'holding';
    clear(medical);
    const result = simulate(game, state => {
      if (medical.state === 'landed' && routine.state === 'holding' && model.runwayAvailable(routine.assignedRunway, state.airport, state.runwayBusyUntil, state.time)) clear(routine);
    });
    expect(result.complete).toBe(true);
    expect(result.failed).toBe(false);
    expect(game.practice.landedIds).toEqual([101, 102]);
    expect(game.goArounds).toBe(0);
    expect(game.conflictEpisodes).toBe(0);
  });

  it('retains bounded independent outcomes despite decision-log truncation and duplicate events', () => {
    const game = model.createPracticeShift('arrival_sequence', 'atc-outcomes');
    model.recordPracticeOutcome(game, 'landing', game.aircraft[1]);
    model.recordPracticeOutcome(game, 'landing', game.aircraft[1]);
    game.decisionLog = Array.from({ length: 40 }, (_, index) => ({ type: 'command', text: String(index), time: index }));
    model.recordPracticeOutcome(game, 'landing', game.aircraft[0]);
    expect(game.practice.landedIds).toEqual([102, 101]);
    expect(model.scenarioProgress(game).complete).toBe(true);
    model.recordPracticeOutcome(game, 'lost', { id: 999 });
    expect(game.practice.lostIds).toEqual([]);
    expect(model.atcPracticeSnapshot({ version: 1, id: 'arrival_sequence', landedIds: [102, 102, 999, 101], lostIds: [101, 101], completedAt: Infinity })).toEqual({ version: 1, id: 'arrival_sequence', landedIds: [102, 101], lostIds: [101], completed: false, completedAt: null });
    expect(model.atcPracticeSnapshot({ version: 2, id: 'arrival_sequence' })).toBeNull();
    expect(model.atcPracticeSnapshot({ version: 1, id: 'unknown' })).toBeNull();
  });

  it('gives neutral retry feedback for changed arrival order, loss, and go-around spacing outcomes', () => {
    const wrong = model.createPracticeShift('arrival_sequence', 'atc-wrong');
    model.recordPracticeOutcome(wrong, 'landing', wrong.aircraft[0]);
    expect(model.scenarioProgress(wrong).failed).toBe(true);
    expect(model.scenarioProgress(wrong).feedback).toContain('arrival order differed');
    const lost = model.createPracticeShift('first_landing', 'atc-lost');
    model.recordPracticeOutcome(lost, 'lost', lost.aircraft[0]);
    expect(model.scenarioProgress(lost).failed).toBe(true);
    const recovered = model.createPracticeShift('crossing_priority', 'atc-around');
    recovered.goArounds = 1;
    expect(model.scenarioProgress(recovered).failed).toBe(true);
    expect(model.scenarioProgress(recovered).feedback).toContain('safe recovery');
  });

  it('starts retries with fresh outcomes and independent aircraft state', () => {
    const first = model.createPracticeShift('crossing_priority', 'atc-attempt-one');
    first.aircraft[0].altitude = 1000;
    first.practice.landedIds.push(101);
    first.practice.completed = true;
    const retry = model.createPracticeShift('crossing_priority', 'atc-attempt-two');
    expect(retry.shiftId).not.toBe(first.shiftId);
    expect(retry.aircraft[0].altitude).toBe(6000);
    expect(retry.practice.landedIds).toEqual([]);
    expect(retry.practice.completed).toBe(false);
    expect(retry.paused).toBe(true);
  });

  it('restores independent exercise outcomes after a landed aircraft leaves the active draft', () => {
    const game = model.createPracticeShift('arrival_sequence', 'atc-practice-recovery');
    game.time = 10;
    game.aircraft[1].state = 'landed';
    game.landed = 1;
    model.recordPracticeOutcome(game, 'landing', game.aircraft[1]);
    const saved = model.serializeAtcShift(game, 1000);
    expect(saved.aircraft).toHaveLength(1);
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(restored.paused).toBe(true);
    expect(restored.practice).toEqual(game.practice);
    expect(restored.practice.landedIds).toEqual([102]);
    model.recordPracticeOutcome(restored, 'landing', restored.aircraft[0]);
    expect(model.scenarioProgress(restored).complete).toBe(true);
  });

  it('preserves the completion timestamp in a paused JSON checkpoint', () => {
    const game = model.createPracticeShift('separation_recovery', 'atc-practice-completed');
    game.time = 6.1;
    game.aircraft[0].altitude = 6000;
    game.practice.completed = true;
    game.practice.completedAt = game.time;
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(model.serializeAtcShift(game, 2000))));
    expect(restored.practice.completed).toBe(true);
    expect(restored.practice.completedAt).toBe(6.1);
    expect(model.scenarioProgress(restored).complete).toBe(true);
    expect(restored.paused).toBe(true);
  });

  it('requires measured objectives despite a high score or claimed completion', () => {
    for (const scenario of model.ATC_PRACTICE_SCENARIOS) {
      const game = model.createPracticeShift(scenario.id, 'atc-false-completion');
      Object.assign(game, { score: 1000000, landed: 100000, sessionBestStreak: 100000 });
      Object.assign(game.practice, { completed: true, completedAt: 0 });
      expect(model.scenarioProgress(game).complete).toBe(false);
      const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(model.serializeAtcShift(game, 2000))));
      expect(model.scenarioProgress(restored).complete).toBe(false);
    }
  });

  it('requires both elapsed time and vertical separation for the crossing-tracks objective', () => {
    const game = model.createPracticeShift('separation_recovery', 'atc-separation-criteria');
    game.time = 6;
    game.aircraft[0].altitude = 5999;
    expect(model.scenarioProgress(game).checks.find(check => check.id === 'vertical').done).toBe(false);
    expect(model.scenarioProgress(game).complete).toBe(false);
    game.aircraft[0].altitude = 6000;
    game.time = 5.99;
    expect(model.scenarioProgress(game).checks.find(check => check.id === 'time').done).toBe(false);
    expect(model.scenarioProgress(game).complete).toBe(false);
    game.time = 6;
    expect(model.scenarioProgress(game).complete).toBe(true);
  });

  it('clears a saved completion timestamp when the restored objective is unmet', () => {
    const game = model.createPracticeShift('arrival_sequence', 'atc-unmet-completion');
    game.time = 6;
    const saved = model.serializeAtcShift(game, 3000);
    saved.practice.completed = true;
    saved.practice.completedAt = 6;
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(restored).not.toBeNull();
    expect(model.scenarioProgress(restored).complete).toBe(false);
    expect(restored.practice.completed).toBe(false);
    expect(restored.practice.completedAt).toBeNull();
  });

  it('restores fixed exercises as guided practice despite an altered saved traffic mode', () => {
    const game = model.createPracticeShift('arrival_sequence', 'atc-fixed-traffic-recovery');
    const saved = model.serializeAtcShift(game, 3000);
    saved.trainingMode = 'standard';
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(restored).not.toBeNull();
    expect(restored.trainingMode).toBe('guided');
    expect(restored.practice.id).toBe('arrival_sequence');
    expect(restored.aircraft.map(ac => ac.id)).toEqual([101, 102]);
    expect(restored.paused).toBe(true);
  });

  it('never lets a completion claim override a recorded conflict, loss, order, or spacing failure', () => {
    const failedGames = [];
    const conflictTime = model.createPracticeShift('first_landing', 'atc-conflict-time');
    model.recordPracticeOutcome(conflictTime, 'landing', conflictTime.aircraft[0]);
    conflictTime.conflicts = 0.01;
    failedGames.push(conflictTime);
    const conflictEpisode = model.createPracticeShift('first_landing', 'atc-conflict-episode');
    model.recordPracticeOutcome(conflictEpisode, 'landing', conflictEpisode.aircraft[0]);
    conflictEpisode.conflictEpisodes = 1;
    failedGames.push(conflictEpisode);
    const loss = model.createPracticeShift('first_landing', 'atc-recorded-loss');
    model.recordPracticeOutcome(loss, 'landing', loss.aircraft[0]);
    model.recordPracticeOutcome(loss, 'lost', loss.aircraft[0]);
    failedGames.push(loss);
    const order = model.createPracticeShift('arrival_sequence', 'atc-recorded-order');
    order.aircraft.forEach(ac => model.recordPracticeOutcome(order, 'landing', ac));
    failedGames.push(order);
    const spacing = model.createPracticeShift('crossing_priority', 'atc-recorded-spacing');
    spacing.aircraft.forEach(ac => model.recordPracticeOutcome(spacing, 'landing', ac));
    spacing.goArounds = 1;
    failedGames.push(spacing);
    for (const game of failedGames) {
      Object.assign(game.practice, { completed: true, completedAt: game.time });
      const result = model.scenarioProgress(game);
      expect(result.failed).toBe(true);
      expect(result.complete).toBe(false);
      const summary = model.recordAtcShift({}, game, 2000).lastShift;
      expect(summary.exerciseResult.failed).toBe(true);
      expect(summary.exerciseResult.complete).toBe(false);
    }
  });

  it('restores the completed arrival sequence after both landed aircraft have been filtered', () => {
    const game = model.createPracticeShift('arrival_sequence', 'atc-both-landed');
    for (const ac of [game.aircraft[1], game.aircraft[0]]) {
      ac.state = 'landed';
      model.recordPracticeOutcome(game, 'landing', ac);
      game.landed++;
    }
    game.time = 22;
    const saved = model.serializeAtcShift(game, 3000);
    expect(saved.aircraft).toEqual([]);
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(restored.aircraft).toEqual([]);
    expect(restored.practice.landedIds).toEqual([102, 101]);
    expect(restored.paused).toBe(true);
    expect(model.scenarioProgress(restored).complete).toBe(true);
    expect(model.scenarioProgress(restored).failed).toBe(false);
  });

  it('keeps complete, failed, and unfinished exercise evidence in the debrief and history', () => {
    const complete = model.createPracticeShift('first_landing', 'atc-summary-complete');
    model.recordPracticeOutcome(complete, 'landing', complete.aircraft[0]);
    const failed = model.createPracticeShift('arrival_sequence', 'atc-summary-failed');
    model.recordPracticeOutcome(failed, 'landing', failed.aircraft[0]);
    const incomplete = model.createPracticeShift('separation_recovery', 'atc-summary-incomplete');
    for (const [game, expectedComplete, expectedFailed] of [[complete, true, false], [failed, false, true], [incomplete, false, false]]) {
      const progress = model.scenarioProgress(game);
      const patch = model.recordAtcShift({}, game, 4000);
      expect(patch.lastShift.practice).toEqual(game.practice);
      expect(patch.lastShift.exerciseResult).toMatchObject({ id: game.practice.id, complete: expectedComplete, failed: expectedFailed, checks: progress.checks, feedback: progress.feedback });
      const history = model.atcShiftHistory(JSON.parse(JSON.stringify(patch.shiftHistory)));
      expect(history[0].practice).toEqual(patch.lastShift.practice);
      expect(history[0].exerciseResult).toEqual(patch.lastShift.exerciseResult);
      expect(model.recordAtcShift({ ...patch }, game, 5000).lastShift).toEqual(patch.lastShift);
    }
  });

  it('rejects a saved completion claim with missing or failed objective checks', () => {
    const game = model.createPracticeShift('first_landing', 'atc-result-validation');
    model.recordPracticeOutcome(game, 'landing', game.aircraft[0]);
    const result = model.recordAtcShift({}, game, 4000).lastShift.exerciseResult;
    const missing = model.atcExerciseResultSnapshot({ ...result, checks: result.checks.slice(1) });
    expect(missing.complete).toBe(false);
    const failedCheck = model.atcExerciseResultSnapshot({ ...result, checks: result.checks.map((check, index) => ({ ...check, done: index !== 0 })) });
    expect(failedCheck.complete).toBe(false);
    const contradictory = model.atcExerciseResultSnapshot({ ...result, failed: true });
    expect(contradictory.failed).toBe(true);
    expect(contradictory.complete).toBe(false);
  });

  it('rejects recovery with altered exercise identity, airport, roster, or aircraft type', () => {
    const game = model.createPracticeShift('arrival_sequence', 'atc-invalid-roster');
    const saved = model.serializeAtcShift(game, 4000);
    expect(model.restoreAtcShift({ ...saved, airportId: 'parallel' })).toBeNull();
    expect(model.restoreAtcShift({ ...saved, aircraft: saved.aircraft.slice(1) })).toBeNull();
    expect(model.restoreAtcShift({ ...saved, aircraft: saved.aircraft.map((ac, index) => index === 0 ? { ...ac, id: 999 } : ac) })).toBeNull();
    expect(model.restoreAtcShift({ ...saved, aircraft: saved.aircraft.map((ac, index) => index === 0 ? { ...ac, typeId: 'B738' } : ac) })).toBeNull();
    expect(model.restoreAtcShift({ ...saved, practice: { ...saved.practice, version: 2 } })).toBeNull();
    expect(model.restoreAtcShift({ ...saved, practice: { ...saved.practice, id: 'unknown' } })).toBeNull();
  });

  it('preserves valid learner instructions and runway choices in a recovered exercise', () => {
    const game = model.createPracticeShift('crossing_priority', 'atc-command-recovery');
    const ac = game.aircraft[0];
    Object.assign(ac, { assignedRunway: game.airport.runways[0], heading: 230, speed: 110, altitude: 7000, targetHeading: 270, targetSpeed: 100, targetAltitude: 8000 });
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(model.serializeAtcShift(game, 4000))));
    expect(restored.aircraft[0]).toMatchObject({ heading: 230, speed: 110, altitude: 7000, targetHeading: 270, targetSpeed: 100, targetAltitude: 8000 });
    expect(restored.aircraft[0].type).toBe(model.AC_TYPES.find(type => type.id === 'B738'));
    expect(restored.aircraft[0].assignedRunway).toBe(restored.airport.runways[0]);
    expect(restored.practice.id).toBe('crossing_priority');
  });

  it('retains failed loss evidence after the lost aircraft leaves the active draft', () => {
    const game = model.createPracticeShift('first_landing', 'atc-lost-recovery');
    const ac = game.aircraft[0];
    ac.state = 'departed';
    model.recordPracticeOutcome(game, 'lost', ac);
    const saved = model.serializeAtcShift(game, 4000);
    expect(saved.aircraft).toEqual([]);
    const restored = model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(restored.practice.lostIds).toEqual([101]);
    expect(model.scenarioProgress(restored).failed).toBe(true);
    expect(model.scenarioProgress(restored).complete).toBe(false);
  });
});
