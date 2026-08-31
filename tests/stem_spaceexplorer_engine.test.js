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
  'getPipPool', 'normalizeAllocation', 'applyTurnDrain', 'INTERIOR_ZONES', 'INTERIOR_CONDITIONS', 'INTERIOR_ROUTE_POINTS', 'getInteriorCondition',
  'createInteriorOrientation', 'normalizeInteriorCounter', 'countInteriorCompletedActivities', 'isInteriorReadinessComplete', 'evaluateInteriorActivity', 'applyInteriorActivityDecision',
  'buildInteriorMotionTrace', 'evaluateInteriorTranslation', 'buildInteriorRoutePlan', 'applyInteriorReadinessBonus'
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
    }
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
    expect(html).toContain('data-spaceexplorer-interior-visual="perspective"');
    expect(html).toContain('Perspective view of the mission cabin');
    expect(html).toContain('data-spaceexplorer-interior-target="lab"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-spaceexplorer-interior-strategy="rail"');
    expect(html).toContain('Handrail travel');
    expect(html).toContain('Gentle push + brake');
    expect(html).toContain('Hard push');
    expect(html).toContain('0 of 2 activities');
    expect(html).toContain('data-spaceexplorer-interior-condition="stable"');
    expect(html).toContain('data-spaceexplorer-interior-condition="maneuver"');
    expect(html).toContain('data-spaceexplorer-interior-route-preview="stable"');
    expect(html).toContain('data-spaceexplorer-interior-prediction="gentle"');
    expect(html).toContain('Controlled arrival predicted');


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
          feedback: 'Recovery needed.', readinessComplete: false
        }
      }
    });
    expect(overshootTrace).toContain('data-spaceexplorer-interior-trace="overshoot"');
    expect(overshootTrace).toContain('data-spaceexplorer-interior-overshoot-marker="true"');
    expect(overshootTrace).toContain('data-spaceexplorer-interior-trace-summary="overshoot"');
    expect(overshootTrace).toContain('se-motion-trace');
    expect(overshootTrace).toContain('overshoot and recovery');
    expect(overshootTrace).toContain('inertia overshoot followed by recovery.');

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
    expect(failedHtml).toContain('activity remains incomplete');
    expect(failedHtml).not.toContain('data-spaceexplorer-interior-activity-complete="lab"');

    const retried = engine.applyInteriorActivityDecision(failed, 'secured').state;
    const securedHtml = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, interiorOrientation: retried }
    });
    expect(securedHtml).toContain('data-spaceexplorer-work-result="secured"');
    expect(securedHtml).toContain('data-spaceexplorer-work-corrections="1"');
    expect(securedHtml).toContain('data-spaceexplorer-interior-activity-complete="lab"');
    expect(securedHtml).toContain('Cabin ready');
    expect(securedHtml).toContain('data-spaceexplorer-work-marker="secured"');
    expect(securedHtml).not.toContain('data-spaceexplorer-work-choice=');

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
