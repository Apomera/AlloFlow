import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for Space Explorer: destination science data against
// independent reference values, and the deterministic mission engine
// (drains, tech mitigations, power allocation, crew selection).

const sourcePath = 'stem_lab/stem_tool_spaceexplorer.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_spaceexplorer.js';
const src = fs.readFileSync(sourcePath, 'utf8');

function extractScope(startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')();
}

const engine = extractScope('var BADGES = [', 'function buildMissionDossier', [
  'BADGES', 'DESTINATIONS', 'TECH_TREE', 'CREW_POOL', 'selectCrew', 'RESOURCES',
  'DESTINATION_DRAINS', 'MISSION_MODIFIERS', 'getInitialResources',
  'getPipPool', 'normalizeAllocation', 'applyTurnDrain', 'INTERIOR_ZONES', 'INTERIOR_CONDITIONS', 'INTERIOR_PAYLOADS', 'INTERIOR_ROUTE_POINTS', 'getInteriorCondition', 'getInteriorPayload', 'getInteriorWorkDiagram',
  'createInteriorOrientation', 'normalizeInteriorCounter', 'countInteriorCompletedActivities', 'getInteriorNavigationDirection', 'getInteriorOrientationChallenge', 'evaluateInteriorOrientationChoice', 'normalizeInteriorOrientationResult', 'countInteriorOrientationChecks', 'applyInteriorOrientationChoice', 'normalizeInteriorRecovery', 'appendInteriorPracticeLog', 'isInteriorReadinessComplete', 'evaluateInteriorActivity', 'applyInteriorActivityDecision', 'deriveInteriorActivityVisualState',
  'evaluateInteriorRecovery', 'applyInteriorRecoveryDecision', 'buildInteriorMotionTrace', 'evaluateInteriorTranslation', 'buildInteriorRoutePlan', 'buildInteriorPracticeInsight', 'applyInteriorReadinessBonus'
]);

const byId = {};
for (const d of engine.DESTINATIONS) byId[d.id] = d;

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'spaceExplorer');
});

describe('destination science data', () => {
  it('surface gravities match published values within 10%', () => {
    // Independent reference (m/s²). Proxima b is speculative and excluded.
    const reference = {
      mars: 3.71, europa: 1.314, titan: 1.352, enceladus: 0.113,
      venus_cloud: 8.87, moon_base: 1.62, io: 1.796, asteroid: 0.14
    };
    for (const id of Object.keys(reference)) {
      const g = byId[id].gravity;
      expect(Math.abs(g - reference[id]) / reference[id], id + ' gravity ' + g).toBeLessThan(0.1);
    }
    expect(byId.proxima.gravity).toBeGreaterThan(0);
  });

  it('Psyche is presented honestly (regression pins)', () => {
    // Was gravity 0.06 (half the published estimate) and 'worth
    // $10,000 quadrillion' stated as fact.
    expect(byId.asteroid.gravity).toBe(0.14);
    expect(byId.asteroid.desc).toContain('thought experiment');
    expect(src).not.toContain('worth $10,000 quadrillion');
  });

  it('every destination is complete: hazards, science focus, difficulty, unlock tier', () => {
    expect(engine.DESTINATIONS.length).toBe(9);
    for (const d of engine.DESTINATIONS) {
      expect(d.hazards.length, d.id).toBeGreaterThanOrEqual(3);
      expect(d.scienceFocus.length, d.id).toBeGreaterThanOrEqual(2);
      expect(d.difficulty, d.id).toBeGreaterThanOrEqual(1);
      expect(d.difficulty, d.id).toBeLessThanOrEqual(5);
      expect(Number.isInteger(d.unlockAt), d.id).toBe(true);
      expect(d.travelDays, d.id).toBeGreaterThan(0);
    }
    const starters = engine.DESTINATIONS.filter((d) => d.unlockAt === 0);
    expect(starters.length).toBeGreaterThanOrEqual(2);
  });

  it('badge descriptions agree with the data they count (regression pin)', () => {
    const badgeById = {};
    for (const b of engine.BADGES) {
      expect(badgeById[b.id], 'duplicate badge ' + b.id).toBeUndefined();
      badgeById[b.id] = b;
    }
    // 'Complete all 6 destinations' shipped while there were 9.
    expect(badgeById.explorer.desc).not.toMatch(/\d/);
    expect(badgeById.techmaster.desc).toContain(String(engine.TECH_TREE.length));
  });
});

describe('mission engine', () => {
  it('every drain table entry names a real destination and only drains', () => {
    for (const id of Object.keys(engine.DESTINATION_DRAINS)) {
      expect(byId[id], id).toBeTruthy();
      const drain = engine.DESTINATION_DRAINS[id];
      for (const k of Object.keys(drain)) {
        expect(engine.RESOURCES[k], id + '.' + k).toBeTruthy();
        expect(drain[k], id + '.' + k).toBeLessThan(0);
      }
    }
  });

  it('turn drain applies raw values with zeroed life support, and clamps at 0', () => {
    const start = { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    const alloc = { life: 0, science: 4, shields: 3, comms: 3 };
    const after = engine.applyTurnDrain(start, byId.mars, [], alloc);
    expect(after.o2).toBe(82);
    expect(after.power).toBe(78);
    expect(after.fuel).toBe(88);
    expect(after.morale).toBe(74);
    const nearEmpty = engine.applyTurnDrain({ o2: 1, power: 1, hull: 1, morale: 1, fuel: 1, science: 0 }, byId.mars, [], alloc);
    expect(nearEmpty.o2).toBe(0);
    expect(nearEmpty.fuel).toBe(0);
  });

  it('life-support pips offset O2 drain one-for-one but never generate O2', () => {
    const start = { o2: 50, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    const after = engine.applyTurnDrain(start, byId.mars, [], { life: 8, science: 1, shields: 1, comms: 0 });
    expect(after.o2).toBe(50);
  });

  it('tech mitigations scale the drains as advertised', () => {
    const start = { o2: 80, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    const alloc = { life: 0, science: 4, shields: 3, comms: 3 };
    // Europa drains o2 -4; recycler cuts 30% -> round(-2.8) = -3.
    const recycled = engine.applyTurnDrain(start, byId.europa, ['recycler'], alloc);
    expect(recycled.o2).toBe(77);
    // Titan drains fuel -3; ion drive cuts 40% -> round(-1.8) = -2.
    const ion = engine.applyTurnDrain(start, byId.titan, ['ion_drive'], alloc);
    expect(ion.fuel).toBe(88);
  });

  it('power allocation always normalizes to the pip pool', () => {
    expect(engine.getPipPool([])).toBe(10);
    expect(engine.getPipPool(['solar_v2'])).toBe(12);
    const sum = (a) => a.life + a.science + a.shields + a.comms;
    expect(sum(engine.normalizeAllocation({ life: 1, science: 1, shields: 1, comms: 1 }, []))).toBe(10);
    expect(sum(engine.normalizeAllocation({ life: 20, science: 0, shields: 0, comms: 0 }, []))).toBe(10);
    expect(sum(engine.normalizeAllocation({ life: 0, science: 0, shields: 0, comms: 0 }, []))).toBe(10);
    expect(sum(engine.normalizeAllocation(null, ['solar_v2']))).toBe(12);
  });

  it('initial resources honor caps, difficulty penalties, and crew bonuses', () => {
    const easy = engine.getInitialResources(byId.mars, [], []);
    expect(easy.o2).toBe(85);
    const hard = engine.getInitialResources(byId.proxima, [], []);
    expect(hard.o2).toBe(85 - 10 - 15);
    expect(hard.morale).toBe(75 - 10);
    const teched = engine.getInitialResources(byId.mars, ['solar_v2'], []);
    expect(teched.power).toBe(100);
  });

  it('selectCrew returns 4 unique members and always includes the Commander', () => {
    for (const d of engine.DESTINATIONS) {
      const crew = engine.selectCrew(d);
      expect(crew.length, d.id).toBe(4);
      expect(new Set(crew.map((c) => c.name)).size, d.id).toBe(4);
      expect(crew.some((c) => c.role === 'Commander'), d.id).toBe(true);
    }
  });
});


describe('microgravity interior orientation', () => {
  it('defines a complete connected cabin with distinct astronaut activities', () => {
    expect(engine.INTERIOR_ZONES.map((zone) => zone.id)).toEqual([
      'flightdeck', 'lab', 'medbay', 'engineering'
    ]);
    expect(new Set(engine.INTERIOR_ZONES.map((zone) => zone.activity)).size).toBe(4);
    for (const zone of engine.INTERIOR_ZONES) {
      expect(zone.activity.length, zone.id).toBeGreaterThan(20);
      expect(zone.challenge.length, zone.id).toBeGreaterThan(20);
      expect(zone.orientationChallenge.prompt.length, zone.id).toBeGreaterThan(20);
      expect(zone.orientationChallenge.options, zone.id).toHaveLength(3);
      expect(zone.orientationChallenge.options.filter((option) => option.id === zone.orientationChallenge.correctId), zone.id).toHaveLength(1);
    }
  });

  it('uses fixed cabin references for optional local-frame checks without changing readiness', () => {
    expect(engine.getInteriorNavigationDirection('flightdeck', 'engineering')).toBe('engineering');
    expect(engine.getInteriorNavigationDirection('engineering', 'lab')).toBe('flightdeck');
    expect(engine.getInteriorNavigationDirection('lab', 'lab')).toBeNull();
    expect(engine.getInteriorNavigationDirection('bogus', 'lab')).toBeNull();

    for (const zone of engine.INTERIOR_ZONES) {
      const challenge = engine.getInteriorOrientationChallenge(zone.id);
      const correct = engine.evaluateInteriorOrientationChoice(zone.id, challenge.correctId);
      const wrongOption = challenge.options.find((option) => option.id !== challenge.correctId);
      const wrong = engine.evaluateInteriorOrientationChoice(zone.id, wrongOption.id);
      expect(correct).toMatchObject({ valid: true, correct: true, zoneId: zone.id });
      expect(wrong).toMatchObject({ valid: true, correct: false, zoneId: zone.id });
      expect(correct.principle.length).toBeGreaterThan(20);
    }
    expect(engine.evaluateInteriorOrientationChoice('bogus', 'fixed').valid).toBe(false);
    expect(engine.evaluateInteriorOrientationChoice('lab', 'bogus').valid).toBe(false);

    const initial = {
      ...engine.createInteriorOrientation(),
      position: 'lab',
      target: 'engineering',
      tasks: { lab: true, medbay: true },
      controlledMoves: 2,
      readinessComplete: true,
    };
    const initialLog = initial.practiceLog;
    const missed = engine.applyInteriorOrientationChoice(initial, 'lab', 'floating');
    expect(missed.result).toMatchObject({ valid: true, correct: false, status: 'Reorient and retry' });
    expect(missed.state.orientationAttempts.lab).toBe(1);
    expect(missed.state.orientationResults.lab).toEqual({ choiceId: 'floating', correct: false });
    expect(missed.state.tasks).toEqual(initial.tasks);
    expect(missed.state.controlledMoves).toBe(initial.controlledMoves);
    expect(engine.isInteriorReadinessComplete(missed.state)).toBe(true);
    expect(initial.orientationAttempts).toEqual({});
    expect(initial.orientationResults).toEqual({});
    expect(initial.practiceLog).toBe(initialLog);

    const corrected = engine.applyInteriorOrientationChoice(missed.state, 'lab', 'fixed');
    expect(corrected.result).toMatchObject({ valid: true, correct: true, status: 'Local frame confirmed' });
    expect(corrected.state.orientationAttempts.lab).toBe(2);
    expect(engine.countInteriorOrientationChecks(corrected.state.orientationResults)).toBe(1);
    expect(engine.normalizeInteriorOrientationResult('lab', { choiceId: 'fixed', correct: false })).toMatchObject({ correct: true });
    expect(engine.countInteriorOrientationChecks({ lab: { choiceId: 'floating', correct: true }, bogus: { choiceId: 'fixed', correct: true } })).toBe(0);
    expect(engine.buildInteriorPracticeInsight(corrected.state)).toContain('Local-frame adaptation observed');

    const repeated = engine.applyInteriorOrientationChoice(corrected.state, 'lab', 'fixed');
    expect(repeated.state).toBe(corrected.state);
    expect(repeated.state.orientationAttempts.lab).toBe(2);

    const mismatched = engine.applyInteriorOrientationChoice(corrected.state, 'medbay', 'fixed');
    expect(mismatched.result.valid).toBe(false);
    expect(mismatched.state).toBe(corrected.state);

    const recovering = {
      ...initial,
      activeRecovery: {
        fromId: 'flightdeck', toId: 'lab', strategy: 'gentle', method: 'Gentle push + brake',
        conditionId: 'stable', payloadId: 'none', speed: 0.2, stoppingDistance: 0.3, attempts: 0,
      },
    };
    const blocked = engine.applyInteriorOrientationChoice(recovering, 'lab', 'fixed');
    expect(blocked.result.valid).toBe(false);
    expect(blocked.state).toBe(recovering);
  });

  it('models handrails, gentle translation, and unsafe momentum distinctly', () => {
    const rail = engine.evaluateInteriorTranslation('flightdeck', 'engineering', 'rail');
    expect(rail.valid).toBe(true);
    expect(rail.controlled).toBe(true);
    expect(rail.stoppingDistance).toBe(0);

    const shortPush = engine.evaluateInteriorTranslation('flightdeck', 'lab', 'gentle');
    expect(shortPush.controlled).toBe(true);
    expect(shortPush.speed).toBeLessThan(0.25);

    const longPush = engine.evaluateInteriorTranslation('flightdeck', 'engineering', 'gentle');
    expect(longPush.controlled).toBe(false);
    expect(longPush.feedback).toContain('shorter legs');

    const hardPush = engine.evaluateInteriorTranslation('lab', 'engineering', 'hard');
    expect(hardPush.controlled).toBe(false);
    expect(hardPush.stoppingDistance).toBeGreaterThan(2);
    expect(hardPush.feedback).toContain('no air drag');

    expect(engine.evaluateInteriorTranslation('lab', 'lab', 'rail').valid).toBe(false);
  });

  it('makes station maneuvers harder to cross while keeping handrails reliable', () => {
    expect(engine.INTERIOR_CONDITIONS.map((condition) => condition.id)).toEqual(['stable', 'maneuver']);

    const stableCrossing = engine.evaluateInteriorTranslation('flightdeck', 'medbay', 'gentle', 'stable');
    const maneuverCrossing = engine.evaluateInteriorTranslation('flightdeck', 'medbay', 'gentle', 'maneuver');
    expect(stableCrossing.controlled).toBe(true);
    expect(maneuverCrossing.controlled).toBe(false);
    expect(maneuverCrossing.speed).toBeGreaterThan(stableCrossing.speed);
    expect(maneuverCrossing.condition.id).toBe('maneuver');
    expect(maneuverCrossing.feedback).toContain('attitude maneuver');

    const shortManeuver = engine.evaluateInteriorTranslation('flightdeck', 'lab', 'gentle', 'maneuver');
    expect(shortManeuver.controlled).toBe(true);
    expect(shortManeuver.feedback).toContain('short crossing');

    const railManeuver = engine.evaluateInteriorTranslation('flightdeck', 'engineering', 'rail', 'maneuver');
    expect(railManeuver.controlled).toBe(true);
    expect(railManeuver.stoppingDistance).toBe(0);
    expect(railManeuver.feedback).toContain('braking point');

    const fallback = engine.getInteriorCondition('unknown-condition');
    expect(fallback.id).toBe('stable');
  });

  it('makes payload inertia observable without changing hands-free movement', () => {
    expect(engine.INTERIOR_PAYLOADS.map((payload) => payload.id)).toEqual(['none', 'specimen', 'toolcase']);
    expect(engine.getInteriorPayload('unknown-payload').id).toBe('none');

    const handsFree = engine.evaluateInteriorTranslation('flightdeck', 'medbay', 'gentle', 'stable', 'none');
    const specimen = engine.evaluateInteriorTranslation('flightdeck', 'medbay', 'gentle', 'stable', 'specimen');
    const toolcase = engine.evaluateInteriorTranslation('flightdeck', 'medbay', 'gentle', 'stable', 'toolcase');
    expect(handsFree.controlled).toBe(true);
    expect(specimen.controlled).toBe(true);
    expect(toolcase.controlled).toBe(false);
    expect(specimen.speed).toBe(handsFree.speed);
    expect(toolcase.speed).toBe(handsFree.speed);
    expect(specimen.stoppingDistance).toBeCloseTo(handsFree.stoppingDistance * 1.15);
    expect(toolcase.stoppingDistance).toBeCloseTo(handsFree.stoppingDistance * 1.35);
    expect(toolcase.feedback).toContain('tool case increases the stopping distance');

    const loadedRail = engine.evaluateInteriorTranslation('flightdeck', 'engineering', 'rail', 'maneuver', 'toolcase');
    expect(loadedRail).toMatchObject({ controlled: true, stoppingDistance: 0, payload: expect.objectContaining({ id: 'toolcase' }) });

    const loadedPlan = engine.buildInteriorRoutePlan('flightdeck', 'engineering', 'staged', 'gentle', 'stable', 'toolcase');
    expect(loadedPlan.payload.id).toBe('toolcase');
    expect(loadedPlan.legs.every((leg) => leg.payload.id === 'toolcase')).toBe(true);
    expect(loadedPlan.controlled).toBe(false);

    const baselineTrace = engine.buildInteriorMotionTrace('flightdeck', 'medbay', false, 'stable', 1);
    const loadedTrace = engine.buildInteriorMotionTrace('flightdeck', 'medbay', false, 'stable', 1.35);
    expect(loadedTrace.overshootPixels).toBeGreaterThan(baselineTrace.overshootPixels);
  });

  it('requires an active recovery response without awarding a controlled move', () => {
    const active = {
      ...engine.createInteriorOrientation(),
      position: 'medbay',
      target: 'engineering',
      routeMode: 'staged',
      condition: 'maneuver',
      payloadId: 'toolcase',
      tasks: { lab: true, medbay: true },
      controlledMoves: 2,
      recoveryCount: 1,
      activeRecovery: {
        fromId: 'flightdeck',
        toId: 'medbay',
        strategy: 'gentle',
        method: 'Gentle push + brake',
        conditionId: 'maneuver',
        payloadId: 'toolcase',
        speed: 0.24,
        stoppingDistance: 0.32,
        attempts: 0,
      },
    };

    expect(engine.normalizeInteriorRecovery(active.activeRecovery, active.position)).toMatchObject({ toId: 'medbay', payloadId: 'toolcase' });
    expect(engine.normalizeInteriorRecovery({ fromId: 'bogus' }, 'medbay')).toBeNull();
    expect(engine.isInteriorReadinessComplete(active)).toBe(false);
    expect(engine.applyInteriorReadinessBonus({ morale: 70 }, active, false).applied).toBe(false);

    const missed = engine.applyInteriorRecoveryDecision(active, 'counterpush');
    expect(missed.result).toMatchObject({ valid: true, controlled: false, status: 'Recovery still active' });
    expect(missed.state.activeRecovery.attempts).toBe(1);
    expect(missed.state.controlledMoves).toBe(2);
    expect(missed.state.recoveryCount).toBe(1);
    expect(missed.state.routeMode).toBe('staged');

    const arrested = engine.applyInteriorRecoveryDecision(missed.state, 'rail');
    expect(arrested.result).toMatchObject({ valid: true, controlled: true, status: 'Drift arrested' });
    expect(arrested.state.activeRecovery).toBeNull();
    expect(arrested.state.position).toBe('medbay');
    expect(arrested.state.target).toBe('engineering');
    expect(arrested.state.routeMode).toBe('staged');
    expect(arrested.state.controlledMoves).toBe(2);
    expect(arrested.state.recoveryCount).toBe(1);
    expect(arrested.state.readinessComplete).toBe(true);

    const stableCounterpush = engine.evaluateInteriorRecovery({
      ...active.activeRecovery,
      conditionId: 'stable',
      payloadId: 'none',
      stoppingDistance: 0.24,
    }, 'counterpush');
    expect(stableCounterpush).toMatchObject({ valid: true, controlled: true, resolved: true });
  });

  it('keeps a bounded practice record and explains an observed strategy change', () => {
    let log = [];
    for (let index = 0; index < 12; index += 1) {
      log = engine.appendInteriorPracticeLog(log, { kind: 'translation', controlled: index === 11, sequence: index });
    }
    expect(log).toHaveLength(8);
    expect(log[0].sequence).toBe(4);
    expect(log[7].sequence).toBe(11);
    expect(engine.buildInteriorPracticeInsight({ practiceLog: log })).toContain('Adaptation observed');
  });

  it('plans direct and staged maneuver routes without hiding unsafe momentum', () => {
    const direct = engine.buildInteriorRoutePlan('flightdeck', 'engineering', 'direct', 'gentle', 'maneuver');
    expect(direct).toMatchObject({
      valid: true,
      mode: 'direct',
      waypointIds: ['engineering'],
      nextTargetId: 'engineering',
      controlled: false,
      remainingStops: 0
    });
    expect(direct.legs).toHaveLength(1);
    expect(direct.legs[0]).toMatchObject({ span: 3, controlled: false });
    expect(direct.totalDistance).toBeCloseTo(9.6);

    const staged = engine.buildInteriorRoutePlan('flightdeck', 'engineering', 'staged', 'gentle', 'maneuver');
    expect(staged).toMatchObject({
      valid: true,
      mode: 'staged',
      waypointIds: ['lab', 'medbay', 'engineering'],
      nextTargetId: 'lab',
      controlled: true,
      remainingStops: 2
    });
    expect(staged.legs.map((leg) => leg.span)).toEqual([1, 1, 1]);
    expect(staged.legs.every((leg) => leg.controlled)).toBe(true);
    expect(staged.totalDistance).toBeCloseTo(direct.totalDistance);
  });

  it('uses the fewest safe gentle legs in stable flight and preserves reverse order', () => {
    const stable = engine.buildInteriorRoutePlan('flightdeck', 'engineering', 'staged', 'gentle', 'stable');
    expect(stable).toMatchObject({
      valid: true,
      waypointIds: ['medbay', 'engineering'],
      nextTargetId: 'medbay',
      controlled: true,
      remainingStops: 1
    });
    expect(stable.legs.map((leg) => leg.span)).toEqual([2, 1]);

    const reverse = engine.buildInteriorRoutePlan('engineering', 'flightdeck', 'staged', 'gentle', 'maneuver');
    expect(reverse.waypointIds).toEqual(['medbay', 'lab', 'flightdeck']);
    expect(reverse.nextTargetId).toBe('medbay');
    expect(reverse.legs.map((leg) => [leg.from.id, leg.to.id])).toEqual([
      ['engineering', 'medbay'],
      ['medbay', 'lab'],
      ['lab', 'flightdeck']
    ]);
    expect(reverse.controlled).toBe(true);
  });

  it('rejects invalid routes and matches manually evaluated staged legs', () => {
    const same = engine.buildInteriorRoutePlan('lab', 'lab', 'staged', 'gentle', 'stable');
    expect(same).toMatchObject({ valid: false, waypointIds: [], legs: [], nextTargetId: null, controlled: false });

    const unknownStart = engine.buildInteriorRoutePlan('airlock', 'lab', 'direct', 'rail', 'stable');
    expect(unknownStart).toMatchObject({ valid: false, finalTarget: expect.objectContaining({ id: 'lab' }), legs: [] });
    const unknownTarget = engine.buildInteriorRoutePlan('lab', 'airlock', 'direct', 'rail', 'stable');
    expect(unknownTarget).toMatchObject({ valid: false, finalTarget: null, legs: [] });
    const invalidStrategy = engine.buildInteriorRoutePlan('flightdeck', 'engineering', 'staged', 'drift', 'maneuver');
    expect(invalidStrategy).toMatchObject({ valid: false, waypointIds: [], legs: [], nextTargetId: null });

    const plan = engine.buildInteriorRoutePlan('flightdeck', 'engineering', 'staged', 'gentle', 'maneuver');
    const manualIds = ['flightdeck', ...plan.waypointIds];
    const manualLegs = plan.waypointIds.map((waypointId, index) =>
      engine.evaluateInteriorTranslation(manualIds[index], waypointId, 'gentle', 'maneuver')
    );
    expect(plan.legs.map((leg) => leg.controlled)).toEqual(manualLegs.map((leg) => leg.controlled));
    expect(plan.controlled).toBe(manualLegs.every((leg) => leg.controlled));
    expect(plan.totalDistance).toBeCloseTo(manualLegs.reduce((total, leg) => total + leg.distance, 0));
  });

    const stableStop = engine.buildInteriorMotionTrace('flightdeck', 'medbay', true, 'stable');
    expect(stableStop.controlled).toBe(true);
    expect(stableStop.overshootPixels).toBe(0);
    expect(stableStop.end).toEqual(stableStop.destination);
    expect(stableStop.path).toContain('Q');

    const maneuverStop = engine.buildInteriorMotionTrace('flightdeck', 'medbay', true, 'maneuver');
    expect(maneuverStop.path).not.toBe(stableStop.path);
    expect(maneuverStop.condition.id).toBe('maneuver');

    const overshoot = engine.buildInteriorMotionTrace('flightdeck', 'medbay', false, 'maneuver');
  it('builds bounded movement traces for controlled stops and inertia overshoots', () => {
    expect(overshoot.controlled).toBe(false);
    expect(overshoot.overshootPixels).toBeGreaterThan(0);
    expect(overshoot.end.x).toBeGreaterThan(overshoot.destination.x);
    expect(overshoot.end.x).toBeLessThanOrEqual(620);
    expect(overshoot.end.y).toBeGreaterThanOrEqual(46);

    const reverse = engine.buildInteriorMotionTrace('engineering', 'lab', false, 'stable');
    expect(reverse.end.x).toBeLessThan(reverse.destination.x);
    expect(engine.buildInteriorMotionTrace('lab', 'lab', true, 'stable')).toBeNull();
    expect(engine.buildInteriorMotionTrace('unknown', 'lab', true, 'stable')).toBeNull();
  });

  it('keeps maneuver work incomplete until a secured retry', () => {
    const initial = {
      ...engine.createInteriorOrientation(),
      position: 'lab', target: 'lab', condition: 'maneuver',
      tasks: { medbay: true }, controlledMoves: 2
    };

    const stableQuick = engine.evaluateInteriorActivity('lab', 'quick', 'stable');
    const maneuverQuick = engine.evaluateInteriorActivity('lab', 'quick', 'maneuver');
    const maneuverSecured = engine.evaluateInteriorActivity('lab', 'secured', 'maneuver');
    expect(stableQuick).toMatchObject({ valid: true, controlled: true, status: 'Procedure secured' });
    expect(maneuverQuick).toMatchObject({ valid: true, controlled: false, status: 'Work recovery needed' });
    expect(maneuverQuick.feedback).toContain('Re-brace at two points');
    expect(maneuverSecured).toMatchObject({ valid: true, controlled: true, status: 'Procedure secured' });

    const failed = engine.applyInteriorActivityDecision(initial, 'quick');
    expect(failed.result).toMatchObject({ valid: true, controlled: false, zoneId: 'lab', optionId: 'quick' });
    expect(failed.state.tasks).toEqual({ medbay: true });
    expect(failed.state.activityAttempts).toEqual({ lab: 1 });
    expect(failed.state.activityRecoveryCount).toBe(1);
    expect(failed.state.lastActivityResult).toMatchObject({ zoneId: 'lab', conditionId: 'maneuver', controlled: false });
    expect(failed.state.readinessComplete).toBe(false);
    expect(engine.isInteriorReadinessComplete(failed.state)).toBe(false);
    expect(engine.applyInteriorReadinessBonus({ morale: 70 }, failed.state, false).applied).toBe(false);
    expect(failed.state.activityResults).toEqual({});

    const retried = engine.applyInteriorActivityDecision(failed.state, 'secured');
    expect(retried.result).toMatchObject({ valid: true, controlled: true, zoneId: 'lab', optionId: 'secured' });
    expect(retried.state.tasks).toEqual({ medbay: true, lab: true });
    expect(retried.state.activityAttempts).toEqual({ lab: 2 });
    expect(retried.state.activityRecoveryCount).toBe(1);
    expect(retried.state.lastActivityResult).toMatchObject({ zoneId: 'lab', conditionId: 'maneuver', controlled: true });
    expect(retried.state.readinessComplete).toBe(true);
    expect(engine.applyInteriorReadinessBonus({ morale: 70 }, retried.state, false)).toMatchObject({ applied: true, moraleBonus: 3 });

    const repeated = engine.applyInteriorActivityDecision(retried.state, 'secured');
    expect(repeated.result).toMatchObject({ valid: false, status: 'Activity already complete' });
    expect(retried.state.activityResults.lab).toMatchObject({ zoneId: 'lab', optionId: 'secured', conditionId: 'maneuver', controlled: true });
    expect(repeated.state).toBe(retried.state);
    expect(repeated.state.activityAttempts).toEqual({ lab: 2 });
    expect(repeated.state.activityRecoveryCount).toBe(1);
    expect(initial.tasks).toEqual({ medbay: true });
    expect(initial.activityAttempts).toEqual({});

    const invalid = engine.applyInteriorActivityDecision(initial, 'unknown-setup');
    expect(invalid.result).toMatchObject({ valid: false, controlled: false });
    expect(invalid.state).toBe(initial);
  });

  it('derives cabin work visuals from existing activity state without mutating it', () => {
    const initial = {
      ...engine.createInteriorOrientation(),
      position: 'lab', target: 'lab', condition: 'maneuver'
    };
    expect(engine.deriveInteriorActivityVisualState(initial, 'lab', 'maneuver')).toMatchObject({
      state: 'idle', blocked: false, attemptCount: 0, result: null
    });

    const open = { ...initial, workStepExpanded: true };
    expect(engine.deriveInteriorActivityVisualState(open, 'lab', 'maneuver').state).toBe('setup');
    expect(engine.deriveInteriorActivityVisualState({ ...open, viewMode: 'compartment' }, 'lab', 'maneuver').state).toBe('setup');

    const failed = engine.applyInteriorActivityDecision(initial, 'quick').state;
    expect(engine.deriveInteriorActivityVisualState(failed, 'lab', 'maneuver')).toMatchObject({
      state: 'rotation', blocked: false, attemptCount: 1,
      result: { zoneId: 'lab', conditionId: 'maneuver', controlled: false }
    });
    const legacyAttempt = { ...initial, activityAttempts: { lab: 2 } };
    expect(engine.deriveInteriorActivityVisualState(legacyAttempt, 'lab', 'maneuver').state).toBe('setup');
    expect(engine.deriveInteriorActivityVisualState({ ...initial, lastActivityResult: { zoneId: 'medbay', conditionId: 'maneuver', controlled: false } }, 'lab', 'maneuver').state).toBe('idle');
    expect(engine.deriveInteriorActivityVisualState({ ...initial, lastActivityResult: { zoneId: 'lab', conditionId: 'stable', controlled: false } }, 'lab', 'maneuver').state).toBe('idle');

    const secured = engine.applyInteriorActivityDecision(failed, 'secured').state;
    expect(engine.deriveInteriorActivityVisualState(secured, 'lab', 'maneuver')).toMatchObject({
      state: 'stabilized', blocked: false, attemptCount: 2,
      result: { zoneId: 'lab', optionId: 'secured', controlled: true }
    });
    expect(engine.deriveInteriorActivityVisualState({ ...secured, activityResults: {}, lastActivityResult: { zoneId: 'lab', conditionId: 'maneuver', controlled: false } }, 'lab', 'maneuver').state).toBe('stabilized');

    const recovery = {
      ...initial,
      activeRecovery: {
        fromId: 'flightdeck', toId: 'lab', strategy: 'gentle', method: 'Gentle push + brake',
        conditionId: 'maneuver', payloadId: 'none', speed: 0.24, stoppingDistance: 0.24, attempts: 0
      },
      workStepExpanded: true
    };
    expect(engine.deriveInteriorActivityVisualState(recovery, 'lab', 'maneuver')).toMatchObject({ state: 'idle', blocked: true });
    expect(engine.deriveInteriorActivityVisualState({ position: 'lab', activityAttempts: null, tasks: null }, 'unknown', 'bogus')).toMatchObject({ state: 'idle', attemptCount: 0 });
    expect(initial).toEqual({ ...engine.createInteriorOrientation(), position: 'lab', target: 'lab', condition: 'maneuver' });
  });

  it('maps every compartment to distinct, bounded restraint points and an equipment tether', () => {
    const workObjects = new Set();
    for (const zone of engine.INTERIOR_ZONES) {
      const diagram = engine.getInteriorWorkDiagram(zone.id);
      workObjects.add(zone.workObject);
      expect(zone.workObject).toEqual(expect.any(String));
      expect(zone.workObject.length).toBeGreaterThan(3);
      expect(diagram.quick.label).toEqual(expect.any(String));
      expect(diagram.primary.label).toEqual(expect.any(String));
      expect(diagram.secondary.label).toEqual(expect.any(String));
      expect(diagram.primary.label).not.toBe(diagram.secondary.label);
      expect(diagram.tether.label).toEqual(expect.any(String));
      for (const anchor of [diagram.quick, diagram.primary, diagram.secondary]) {
        expect(anchor.x).toBeGreaterThanOrEqual(0);
        expect(anchor.x).toBeLessThanOrEqual(640);
        expect(anchor.y).toBeGreaterThanOrEqual(0);
        expect(anchor.y).toBeLessThanOrEqual(270);
        expect(anchor.contactX).toBeGreaterThanOrEqual(0);
        expect(anchor.contactX).toBeLessThanOrEqual(640);
        expect(anchor.contactY).toBeGreaterThanOrEqual(0);
        expect(anchor.contactY).toBeLessThanOrEqual(270);
      }
      const separation = Math.hypot(diagram.secondary.x - diagram.primary.x, diagram.secondary.y - diagram.primary.y);
      expect(separation).toBeGreaterThanOrEqual(30);
      for (const key of ['anchorX', 'objectX']) {
        expect(diagram.tether[key]).toBeGreaterThanOrEqual(0);
        expect(diagram.tether[key]).toBeLessThanOrEqual(640);
      }
      for (const key of ['anchorY', 'objectY']) {
        expect(diagram.tether[key]).toBeGreaterThanOrEqual(0);
        expect(diagram.tether[key]).toBeLessThanOrEqual(270);
      }
    }
    expect(workObjects.size).toBe(engine.INTERIOR_ZONES.length);
    expect(engine.getInteriorWorkDiagram('unknown')).toMatchObject({
      quick: { label: 'Single handrail' },
      primary: { label: 'Primary restraint' },
      secondary: { label: 'Secondary restraint' },
      tether: { label: 'Equipment tether' }
    });
  });

  it('applies the cabin readiness morale effect once and respects the resource cap', () => {
    const ready = {
      readinessComplete: true,
      controlledMoves: 2,
      tasks: { lab: true, medbay: true }
    };
    const first = engine.applyInteriorReadinessBonus({ morale: 70, o2: 80 }, ready, false);
    expect(first.applied).toBe(true);
    expect(first.moraleBonus).toBe(3);

    expect(first.resources.morale).toBe(73);
    expect(first.resources.o2).toBe(80);

    const repeated = engine.applyInteriorReadinessBonus(first.resources, ready, true);
    expect(repeated.applied).toBe(false);
    expect(repeated.resources.morale).toBe(73);

    const capped = engine.applyInteriorReadinessBonus({ morale: 99 }, ready, false);
    expect(capped.applied).toBe(true);
    expect(capped.moraleBonus).toBe(1);
    expect(capped.resources.morale).toBe(100);

    const incomplete = engine.applyInteriorReadinessBonus({ morale: 70 }, { readinessComplete: true, controlledMoves: 1, tasks: { lab: true, medbay: true } }, false);
    expect(incomplete.applied).toBe(false);
    expect(incomplete.resources.morale).toBe(70);
  });
});

  it('normalizes legacy counters and derives readiness only from real completed zones', () => {
    expect(engine.normalizeInteriorCounter('2.9')).toBe(2);
    expect(engine.normalizeInteriorCounter('not-a-number')).toBe(0);
    expect(engine.normalizeInteriorCounter(-4)).toBe(0);
    expect(engine.normalizeInteriorCounter(Infinity)).toBe(0);
    expect(engine.countInteriorCompletedActivities({ lab: true, medbay: 'true', bogus: true })).toBe(1);

    const stale = {
      readinessComplete: true,
      controlledMoves: '2',
      tasks: { lab: true, bogus: true }
    };
    expect(engine.isInteriorReadinessComplete(stale)).toBe(false);
    expect(engine.applyInteriorReadinessBonus({ morale: 70 }, stale, false).applied).toBe(false);

    const legacy = {
      readinessComplete: false,
      controlledMoves: '2',
      tasks: { lab: true, medbay: true }
    };
    expect(engine.isInteriorReadinessComplete(legacy)).toBe(true);
    expect(engine.applyInteriorReadinessBonus({ morale: 70 }, legacy, false)).toMatchObject({ applied: true, moraleBonus: 3, completedTasks: 2 });
  });
describe('render and deployment', () => {
  it('renders the mission select shell', () => {
    const html = renderTool('spaceExplorer', { spaceExplorer: {} });
    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain('Mars');
  });

  it('renders a readable first-run path with responsive destination actions', () => {
    const html = renderTool('spaceExplorer', { spaceExplorer: {} });
    expect(html).toContain('data-spaceexplorer-ux="mission-select"');
    expect(html).toContain('data-spaceexplorer-quickstart="true"');
    expect(html).toContain('Pick a destination');
    expect(html).toContain('se-destination-grid');
    expect(html).toContain('Recommended');
    expect(html).toContain('Start mission');
    expect(html).toContain('Mission guide: rules, resources, crew, and upgrades');
  });

  it('pins the scoped contrast, focus, target-size, and responsive contracts', () => {
    expect(src).toContain("_seUx.id = 'se-usability-css'");
    expect(src).toContain('min-height:44px');
    expect(src).toContain('outline:3px solid var(--se-focus)');
    expect(src).toContain('@media (prefers-contrast:more)');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('@media (pointer:coarse)');
    expect(src).toContain('@keyframes se-motion-trace-draw');
    expect(src).toContain('.se-shell .se-motion-trace');
    expect(src).toContain('@media (prefers-reduced-motion:reduce){.se-shell .se-motion-trace');
    expect(src).toContain('.se-resource-grid{grid-template-columns:repeat(2');
    expect(src).toContain('[class~="text-xs"]{font-size:.8125rem');
    expect(src).toContain("statusLevel === 'Critical'");
    expect(src).toContain("statusLevel === 'Low'");
    expect(src).toContain("statusLevel === 'Stable'");
  });

  it('renders mission wayfinding, safe exit, presets, and non-modal event semantics', () => {
    const base = {
      destination: 'mars',
      resources: { o2: 82, power: 78, hull: 100, morale: 74, fuel: 88, science: 5 },
      crew: [],
      turn: 1,
      powerAllocation: { life: 4, science: 2, shields: 2, comms: 2 }
    };
    const allocation = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, missionPhase: 'allocate' }
    });
    expect(allocation).toContain('data-spaceexplorer-progress="true"');
    expect(allocation).toContain('aria-current="step"');
    expect(allocation).toContain('Use balanced preset');
    expect(allocation).toContain('Prioritize');
    expect(allocation).toContain('End current mission');
    expect(allocation).toContain('Back to briefing');
    expect(allocation).toContain('Cabin orientation optional');

    const event = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        missionPhase: 'event',
        activeEvent: {
          emoji: '!',
          title: 'Dust front',
          category: 'environment',
          description: 'A fast dust front is crossing the landing corridor.',
          stemConcepts: ['atmospheric science'],
          choices: [
            { label: 'Measure first', quality: 'optimal', effects: { science: 5 }, outcome: 'Measured.', scienceReward: 'Evidence improves the route.' },
            { label: 'Wait', quality: 'adequate', effects: {}, outcome: 'Waited.', scienceReward: 'Time reduces uncertainty.' },
            { label: 'Rush', quality: 'poor', effects: { hull: -5 }, outcome: 'Damaged.', scienceReward: 'Dust carries momentum.' }
          ]
        }
      }
    });
    expect(event).toContain('role="region"');
    expect(event).not.toContain('aria-modal="true"');
    expect(event).toContain('aria-keyshortcuts="1"');
    expect(event).toContain('data-resource-status="stable"');
    expect(event).toContain('Stable');
  });

  it('guards number shortcuts while a learner is typing', () => {
    expect(src).toContain('/^(INPUT|TEXTAREA|SELECT|BUTTON)$/');
    expect(src).toContain('(e.target && e.target.isContentEditable)');
    expect(src).toContain("if (!/^[1-9]$/.test(e.key)) return;");
  });


  it('renders an accessible perspective cabin trainer with equivalent controls', () => {
    const base = {
      missionPhase: 'briefing',
      destination: 'mars',
      resources: { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 },
      crew: []
    };
    const html = renderTool('spaceExplorer', { spaceExplorer: base });
    expect(html).toContain('data-spaceexplorer-interior="true"');
    expect(html).toContain('data-spaceexplorer-interior-view-toggle="true"');
    expect(html).toContain('data-spaceexplorer-interior-view="route"');
    expect(html).toContain('data-spaceexplorer-interior-view="compartment"');
    expect(html).toContain('data-spaceexplorer-interior-visual="perspective"');
    expect(html).toContain('Perspective view of the mission cabin');
    expect(html).toContain('data-spaceexplorer-interior-target="lab"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-spaceexplorer-interior-strategy="rail"');
    expect(html).toContain('Handrail travel');
    expect(html).toContain('Gentle push + brake');
    expect(html).toContain('Hard push');
    expect(html).toContain('0 of 2 activities');
    expect(html).toContain('0 of 2 controlled moves');
    expect(html).toContain('data-spaceexplorer-skip-practice="true"');
    expect(html).toContain('data-spaceexplorer-payload="toolcase"');
    expect(html).toContain('data-spaceexplorer-prediction-mode="challenge"');
    expect(html).toContain('data-spaceexplorer-work-step="closed"');
    expect(html).toContain('data-spaceexplorer-interior-condition="stable"');
    expect(html).toContain('data-spaceexplorer-interior-condition="maneuver"');
    expect(html).toContain('data-spaceexplorer-interior-route-preview="stable"');
    expect(html).toContain('data-spaceexplorer-interior-prediction="gentle"');
    expect(html).toContain('Controlled arrival predicted');

    const inside = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          ...engine.createInteriorOrientation(),
          position: 'lab',
          target: 'engineering',
          viewMode: 'compartment',
          orientationAttempts: { lab: 1 },
          orientationResults: { lab: { choiceId: 'floating', correct: true } },
        }
      }
    });
    expect(inside).toContain('data-spaceexplorer-interior-visual="compartment"');
    expect(inside).toContain('data-spaceexplorer-compartment-visual="lab"');
    expect(inside).toContain('data-spaceexplorer-compartment-next-direction="engineering"');
    expect(inside).toContain('data-spaceexplorer-compartment-restraint="rail-04"');
    expect(inside).toContain('data-spaceexplorer-compartment-hazard="specimen"');
    expect(inside).toContain('data-spaceexplorer-compartment-astronaut="secured"');
    expect(inside).toContain('data-spaceexplorer-work-visual="idle"');
    expect(inside).toContain('RACK LAB-2');
    expect(inside).toContain('data-spaceexplorer-orientation-choice="fixed"');
    expect(inside).toContain('data-spaceexplorer-orientation-result="retry"');
    expect(inside).toContain('data-spaceexplorer-orientation-attempts="1"');
    expect(inside).not.toContain('data-spaceexplorer-interior-visual="perspective"');
    expect(inside).not.toContain('data-spaceexplorer-route-legend=');

    const setupInside = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          ...engine.createInteriorOrientation(),
          position: 'lab', target: 'lab', condition: 'maneuver',
          viewMode: 'compartment', workStepExpanded: true
        }
      }
    });
    expect(setupInside).toContain('data-spaceexplorer-work-visual="setup"');
    expect(setupInside).toContain('data-spaceexplorer-work-diagram="lab"');
    expect(setupInside).toContain('data-spaceexplorer-work-setup="plan"');
    expect(setupInside).toContain('data-spaceexplorer-work-anchor="primary"');
    expect(setupInside).toContain('data-spaceexplorer-work-anchor="secondary"');
    expect(setupInside).toContain('data-work-anchor-label="Rail 04 brace"');
    expect(setupInside).toContain('data-work-anchor-label="Waist restraint"');
    expect(setupInside).toContain('data-work-tether-label="Specimen tether"');
    expect(setupInside).toContain('PLAN 2 POINTS');
    expect(setupInside).toContain('Work setup preview: the Rail 04 brace');
    expect(setupInside).toContain('Focused work view: route direction labels are hidden');
    expect(setupInside).toContain('data-spaceexplorer-worksite="lab"');
    expect(setupInside).toContain('data-spaceexplorer-work-visual-summary="setup"');
    expect(setupInside).not.toContain('data-spaceexplorer-final-target=');
    expect(setupInside).not.toContain('data-spaceexplorer-orientation-challenge=');
    expect(setupInside).not.toContain('data-spaceexplorer-svg-label="flight-side"');
    expect(setupInside).not.toContain('data-spaceexplorer-svg-label="engineering-side"');
    expect(setupInside).not.toContain('data-spaceexplorer-svg-label="flight-hatch"');
    expect(setupInside).not.toContain('data-spaceexplorer-svg-label="engineering-hatch"');
    expect(setupInside).toContain('data-spaceexplorer-hatch-context="muted"');

    const expandedRoute = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          ...engine.createInteriorOrientation(),
          position: 'lab', target: 'engineering', condition: 'maneuver',
          viewMode: 'route', workStepExpanded: true
        }
      }
    });
    expect(expandedRoute).toContain('data-spaceexplorer-interior-visual="perspective"');
    expect(expandedRoute).toContain('data-spaceexplorer-final-target="engineering"');
    expect(expandedRoute).not.toContain('data-spaceexplorer-worksite=');
    expect(expandedRoute).not.toContain('data-spaceexplorer-work-visual-summary=');

    const expectedWorkDiagrams = {
      flightdeck: { quick: 'Single handrail', primary: 'Left foot loop', secondary: 'Right foot loop', tether: 'Tablet tether', object: 'command tablet' },
      lab: { quick: 'Rail 04 handhold', primary: 'Rail 04 brace', secondary: 'Waist restraint', tether: 'Specimen tether', object: 'specimen bag' },
      medbay: { quick: 'Left caregiver grip', primary: 'Left caregiver grip', secondary: 'Right caregiver grip', tether: 'Medical-kit tether', object: 'medical kit' },
      engineering: { quick: 'Single handrail', primary: 'Left foot loop', secondary: 'Right foot loop', tether: 'Tool tether', object: 'tool pouch' }
    };
    for (const zone of engine.INTERIOR_ZONES) {
      const zoneState = {
        ...engine.createInteriorOrientation(),
        position: zone.id, target: zone.id, condition: 'maneuver',
        viewMode: 'compartment', workStepExpanded: true
      };
      const zoneInside = renderTool('spaceExplorer', {
        spaceExplorer: {
          ...base,
          interiorOrientation: zoneState
        }
      });
      const labels = expectedWorkDiagrams[zone.id];
      expect(zoneInside).toContain(`data-spaceexplorer-work-diagram="${zone.id}"`);
      expect(zoneInside).toContain(`data-spaceexplorer-compartment-visual="${zone.id}"`);
      expect(zoneInside).toContain(`data-work-anchor-label="${labels.primary}"`);
      expect(zoneInside).toContain(`data-work-anchor-label="${labels.secondary}"`);
      expect(zoneInside).toContain(`data-work-tether-label="${labels.tether}"`);
      expect(zoneInside).not.toContain('data-spaceexplorer-orientation-challenge=');
      expect(zoneInside).not.toContain('data-spaceexplorer-svg-label="flight-side"');
      expect(zoneInside).not.toContain('data-spaceexplorer-svg-label="engineering-side"');
      expect(zoneInside).not.toContain('data-spaceexplorer-svg-label="flight-hatch"');
      expect(zoneInside).not.toContain('data-spaceexplorer-svg-label="engineering-hatch"');

      const failedZoneState = engine.applyInteriorActivityDecision(zoneState, 'quick').state;
      const failedZoneInside = renderTool('spaceExplorer', {
        spaceExplorer: { ...base, interiorOrientation: { ...failedZoneState, viewMode: 'compartment' } }
      });
      expect(failedZoneInside).toContain(`data-spaceexplorer-work-diagram="${zone.id}"`);
      expect(failedZoneInside).toContain('data-spaceexplorer-work-visual="rotation"');
      expect(failedZoneInside).toContain(`data-work-anchor-label="${labels.quick}"`);
      expect(failedZoneInside).toContain(`data-spaceexplorer-work-loose-object="${labels.object}"`);
      expect(failedZoneInside).toContain('data-spaceexplorer-work-visual-summary="rotation"');
      expect(failedZoneInside).not.toContain('data-spaceexplorer-orientation-challenge=');
      expect(failedZoneInside).not.toContain('data-spaceexplorer-svg-label="flight-side"');
      expect(failedZoneInside).not.toContain('data-spaceexplorer-svg-label="engineering-side"');
      expect(failedZoneInside).not.toContain('data-spaceexplorer-svg-label="flight-hatch"');
      expect(failedZoneInside).not.toContain('data-spaceexplorer-svg-label="engineering-hatch"');

      const stabilizedZoneState = engine.applyInteriorActivityDecision(failedZoneState, 'secured').state;
      const stabilizedZoneInside = renderTool('spaceExplorer', {
        spaceExplorer: { ...base, interiorOrientation: { ...stabilizedZoneState, viewMode: 'compartment' } }
      });
      expect(stabilizedZoneInside).toContain(`data-spaceexplorer-work-diagram="${zone.id}"`);
      expect(stabilizedZoneInside).toContain('data-spaceexplorer-work-visual="stabilized"');
      expect(stabilizedZoneInside).toContain(`data-work-anchor-label="${labels.primary}"`);
      expect(stabilizedZoneInside).toContain(`data-work-anchor-label="${labels.secondary}"`);
      expect(stabilizedZoneInside).toContain(`data-work-tether-label="${labels.tether}"`);
      expect(stabilizedZoneInside).toContain('data-spaceexplorer-work-object-state="secured"');
      expect(stabilizedZoneInside).toContain('data-spaceexplorer-work-visual-summary="stabilized"');
      expect(stabilizedZoneInside).not.toContain('data-spaceexplorer-orientation-challenge=');
      expect(stabilizedZoneInside).not.toContain('data-spaceexplorer-svg-label="flight-side"');
      expect(stabilizedZoneInside).not.toContain('data-spaceexplorer-svg-label="engineering-side"');
      expect(stabilizedZoneInside).not.toContain('data-spaceexplorer-svg-label="flight-hatch"');
      expect(stabilizedZoneInside).not.toContain('data-spaceexplorer-svg-label="engineering-hatch"');
    }

    const confirmedInside = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: engine.applyInteriorOrientationChoice({
          ...engine.createInteriorOrientation(),
          position: 'lab',
          target: 'engineering',
          viewMode: 'compartment',
        }, 'lab', 'fixed').state
      }
    });
    expect(confirmedInside).toContain('data-spaceexplorer-orientation-result="confirmed"');
    expect(confirmedInside).toContain('data-spaceexplorer-orientation-progress="1"');
    expect(confirmedInside).toContain('Local frame confirmed');

    const recoveringInside = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          ...engine.createInteriorOrientation(),
          position: 'lab',
          target: 'engineering',
          viewMode: 'compartment',
          condition: 'maneuver',
          activeRecovery: {
            fromId: 'flightdeck', toId: 'lab', strategy: 'gentle', method: 'Gentle push + brake',
            conditionId: 'maneuver', payloadId: 'none', speed: 0.24, stoppingDistance: 0.24, attempts: 0,
          },
        }
      }
    });
    expect(recoveringInside).toContain('data-spaceexplorer-compartment-astronaut="drifting"');
    expect(recoveringInside).toContain('data-spaceexplorer-compartment-restraint="recovery-rail"');
    expect(recoveringInside).toContain('data-spaceexplorer-compartment-hazard="drift"');
    expect(recoveringInside).toContain('Recovery has priority');
    expect(recoveringInside).not.toContain('data-spaceexplorer-orientation-choice=');


    const maneuver = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          position: 'flightdeck', target: 'medbay', condition: 'maneuver',
          tasks: {}, controlledMoves: 0, maneuverControlledMoves: 0,
          recoveryCount: 0, attempts: 0, lastResult: null,
          feedback: '', readinessComplete: false
        }
      }
    });
    expect(maneuver).toContain('data-spaceexplorer-interior-condition-status="maneuver"');
    expect(maneuver).toContain('data-spaceexplorer-interior-route-preview="maneuver"');
    expect(maneuver).toContain('MANEUVER');
    expect(maneuver).toContain('data-spaceexplorer-interior-prediction="rail"');
    expect(maneuver).toContain('data-predicted-control="controlled"');
    expect(maneuver).toContain('data-spaceexplorer-interior-prediction="gentle"');
    expect(maneuver).toContain('data-predicted-control="recovery"');
    expect(maneuver).toContain('Recovery likely');

    const overshootTrace = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          position: 'medbay', target: 'medbay', condition: 'maneuver',
          tasks: {}, controlledMoves: 0, maneuverControlledMoves: 0,
          recoveryCount: 1, attempts: 1,
          lastResult: {
            fromId: 'flightdeck', fromName: 'Flight deck',
            toId: 'medbay', toName: 'Medical bay',
            method: 'Gentle push + brake', conditionId: 'maneuver', conditionLabel: 'Station maneuver',
            controlled: false, speed: 0.24, distance: 6.4,
            stoppingDistance: 0.24, status: 'Recovery needed'
          },
          activeRecovery: {
            fromId: 'flightdeck', toId: 'medbay', strategy: 'gentle', method: 'Gentle push + brake',
            conditionId: 'maneuver', payloadId: 'none', speed: 0.24, stoppingDistance: 0.24, attempts: 0
          },
          feedback: 'Recovery needed.', readinessComplete: false
        }
      }
    });
    expect(overshootTrace).toContain('data-spaceexplorer-interior-trace="overshoot"');
    expect(overshootTrace).toContain('data-spaceexplorer-interior-overshoot-marker="true"');
    expect(overshootTrace).toContain('data-spaceexplorer-interior-trace-summary="overshoot"');
    expect(overshootTrace).toContain('se-motion-trace');
    expect(overshootTrace).toContain('overshoot and recovery');
    expect(overshootTrace).toContain('data-spaceexplorer-recovery="active"');
    expect(overshootTrace).toContain('data-spaceexplorer-recovery-action="rail"');
    expect(overshootTrace).toContain('data-spaceexplorer-recovery-action="counterpush"');
    expect(overshootTrace).toContain('The astronaut is still drifting beyond the destination');

    const ready = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          position: 'medbay',
          target: 'medbay',
          tasks: { lab: true, medbay: true },
          controlledMoves: 2,
          recoveryCount: 0,
          attempts: 2,
          lastResult: null,
          feedback: 'Cabin orientation complete.',
          readinessComplete: true
        }
      }
    });
    expect(ready).toContain('Cabin ready');
    expect(ready).toContain('Cabin ready \u2022 orientation complete');
    expect(ready).toContain('data-spaceexplorer-interior-position="medbay"');
  });

  it('renders a recoverable maneuver work error and its secured retry', () => {
    const base = {
      missionPhase: 'briefing',
      destination: 'mars',
      resources: { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 },
      crew: []
    };
    const initial = {
      ...engine.createInteriorOrientation(),
      position: 'lab', target: 'lab', condition: 'maneuver',
      tasks: { medbay: true }, controlledMoves: 2, maneuverControlledMoves: 1
    };
    const failed = engine.applyInteriorActivityDecision(initial, 'quick').state;
    const failedHtml = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, interiorOrientation: failed }
    });

    expect(failedHtml).toContain('data-spaceexplorer-work-choice="quick"');
    expect(failedHtml).toContain('data-spaceexplorer-work-choice="secured"');
    expect(failedHtml).toContain('data-spaceexplorer-work-result="recovery"');
    expect(failedHtml).toContain('data-spaceexplorer-work-corrections="1"');
    expect(failedHtml).toContain('data-spaceexplorer-work-attempts="1"');
    expect(failedHtml).toContain('Work recovery needed');
    expect(failedHtml).toContain('data-spaceexplorer-work-marker="recovery"');
    expect(failedHtml).toContain('data-spaceexplorer-view-work-result="rotation"');
    expect(failedHtml).toContain('See one-point pivot');
    expect(failedHtml).toContain('activity remains incomplete');
    expect(failedHtml).not.toContain('data-spaceexplorer-interior-activity-complete="lab"');

    const failedInsideHtml = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, interiorOrientation: { ...failed, viewMode: 'compartment' } }
    });
    expect(failedInsideHtml).toContain('data-spaceexplorer-work-visual="rotation"');
    expect(failedInsideHtml).toContain('data-spaceexplorer-work-setup="one-point"');
    expect(failedInsideHtml).toContain('data-spaceexplorer-work-rotation="one-point"');
    expect(failedInsideHtml).toContain('data-spaceexplorer-work-loose-object="specimen bag"');
    expect(failedInsideHtml).toContain('data-spaceexplorer-work-object-state="drifting"');
    expect(failedInsideHtml).toContain('data-work-anchor-label="Rail 04 handhold"');
    expect(failedInsideHtml).toContain('data-spaceexplorer-work-visual-summary="rotation"');
    expect(failedInsideHtml).toContain('1-POINT PIVOT');
    expect(failedInsideHtml).toContain('only the Rail 04 handhold controls the body');
    expect(failedInsideHtml).not.toContain('data-spaceexplorer-work-anchor="secondary"');
    expect(failedInsideHtml).not.toContain('data-spaceexplorer-orientation-challenge=');
    expect(failedInsideHtml).not.toContain('data-spaceexplorer-svg-label="flight-side"');
    expect(failedInsideHtml).not.toContain('data-spaceexplorer-svg-label="engineering-side"');

    const retried = engine.applyInteriorActivityDecision(failed, 'secured').state;
    const securedHtml = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, interiorOrientation: retried }
    });
    expect(securedHtml).toContain('data-spaceexplorer-work-result="secured"');
    expect(securedHtml).toContain('data-spaceexplorer-work-corrections="1"');
    expect(securedHtml).toContain('data-spaceexplorer-interior-activity-complete="lab"');
    expect(securedHtml).toContain('Cabin ready');
    expect(securedHtml).toContain('data-spaceexplorer-work-marker="secured"');
    expect(securedHtml).toContain('data-spaceexplorer-view-work-result="stabilized"');
    expect(securedHtml).not.toContain('data-spaceexplorer-work-choice=');

    const securedInsideHtml = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, interiorOrientation: { ...retried, viewMode: 'compartment' } }
    });
    expect(securedInsideHtml).toContain('data-spaceexplorer-work-visual="stabilized"');
    expect(securedInsideHtml).toContain('data-spaceexplorer-work-setup="two-point"');
    expect(securedInsideHtml).toContain('data-spaceexplorer-work-stabilization="two-point"');
    expect(securedInsideHtml).toContain('data-spaceexplorer-work-anchor="primary"');
    expect(securedInsideHtml).toContain('data-spaceexplorer-work-anchor="secondary"');
    expect(securedInsideHtml).toContain('data-work-anchor-label="Rail 04 brace"');
    expect(securedInsideHtml).toContain('data-work-anchor-label="Waist restraint"');
    expect(securedInsideHtml).toContain('data-work-tether-label="Specimen tether"');
    expect(securedInsideHtml).toContain('data-spaceexplorer-work-object-state="secured"');
    expect(securedInsideHtml).toContain('data-spaceexplorer-work-visual-summary="stabilized"');
    expect(securedInsideHtml).toContain('2-POINT STABLE');
    expect(securedInsideHtml).toContain('the Rail 04 brace and Waist restraint prevent pivot');
    expect(securedInsideHtml).not.toContain('data-spaceexplorer-work-rotation="one-point"');
    expect(securedInsideHtml).not.toContain('data-spaceexplorer-orientation-challenge=');
    expect(securedInsideHtml).not.toContain('data-spaceexplorer-svg-label="flight-side"');
    expect(securedInsideHtml).not.toContain('data-spaceexplorer-svg-label="engineering-side"');

    const collapsedInsideHtml = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, interiorOrientation: { ...retried, viewMode: 'compartment', workStepExpanded: false } }
    });
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-work-visual="idle"');
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-orientation-challenge="lab"');
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-final-target="lab"');
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-svg-label="flight-side"');
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-svg-label="engineering-side"');
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-svg-label="flight-hatch"');
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-svg-label="engineering-hatch"');
    expect(collapsedInsideHtml).toContain('data-spaceexplorer-hatch-context="navigation"');
    expect(collapsedInsideHtml).not.toContain('data-spaceexplorer-worksite=');
    expect(collapsedInsideHtml).not.toContain('data-spaceexplorer-work-visual-summary=');

    expect(securedHtml).toContain('Body restraint + specimen tether');
    expect(securedHtml).toContain('Station maneuver');
    const debriefHtml = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        missionPhase: 'debrief',
        missionResult: 'success',
        interiorOrientation: retried,
        interiorReadinessApplied: true,
        interiorReadinessBonus: 3
      }
    });
    expect(debriefHtml).toContain('data-spaceexplorer-review-metric="work-attempts"');
    expect(debriefHtml).toContain('data-spaceexplorer-review-metric="work-corrections"');
    expect(debriefHtml).toContain('Work attempts');
    expect(debriefHtml).toContain('Work corrections');
    expect(debriefHtml).toContain('data-spaceexplorer-procedure-summary="true"');
    expect(debriefHtml).toContain('data-spaceexplorer-practice-insight="true"');
    expect(debriefHtml).toContain('Adaptation observed');
    expect(debriefHtml).toContain('Lab: Body restraint + specimen tether');
  });

  it('derives preflight readiness instead of trusting stale persisted flags', () => {
    const base = {
      missionPhase: 'allocate', destination: 'mars',
      resources: { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 },
      crew: []
    };
    const stale = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: { readinessComplete: true, controlledMoves: '2', tasks: { lab: true, bogus: true } }
      }
    });
    expect(stale).toContain('Cabin orientation optional');
    expect(stale).not.toContain('First launch: up to +3 morale');

    const legacy = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: { readinessComplete: false, controlledMoves: '2', tasks: { lab: true, medbay: true } }
      }
    });
    expect(legacy).toContain('Cabin orientation complete');
    expect(legacy).toContain('First launch: up to +3 morale');
  });

  it('surfaces cabin readiness in preflight, the active HUD, and debrief', () => {
    const readyOrientation = {
      position: 'medbay', target: 'medbay', condition: 'maneuver',
      tasks: { lab: true, medbay: true },
      controlledMoves: 2, maneuverControlledMoves: 1, recoveryCount: 0, attempts: 2,
      lastResult: null, feedback: 'Cabin orientation complete.', readinessComplete: true
    };
    const base = {
      destination: 'mars',
      resources: { o2: 82, power: 78, hull: 100, morale: 77, fuel: 88, science: 5 },
      crew: [], turn: 1,
      powerAllocation: { life: 4, science: 2, shields: 2, comms: 2 },
      interiorOrientation: readyOrientation,
      interiorReadinessApplied: true,
      interiorReadinessBonus: 3
    };

    const allocation = renderTool('spaceExplorer', { spaceExplorer: { ...base, missionPhase: 'allocate', interiorReadinessApplied: false } });
    expect(allocation).toContain('First launch: up to +3 morale');

    const active = renderTool('spaceExplorer', { spaceExplorer: { ...base, missionPhase: 'explore' } });
    expect(active).toContain('data-spaceexplorer-readiness-applied="true"');
    expect(active).toContain('Cabin practice applied');
    expect(allocation).toContain('Maneuver route practiced.');

    const debrief = renderTool('spaceExplorer', { spaceExplorer: { ...base, missionPhase: 'debrief', missionResult: 'success' } });
    expect(debrief).toContain('data-spaceexplorer-interior-review="true"');
    expect(debrief).toContain('Cabin readiness review');
    expect(debrief).toContain('First-launch effect: +3 morale applied');
    expect(debrief).toContain('Maneuver-safe');
    expect(src).toContain('var current = prev.spaceExplorer || {};');
  });
  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
