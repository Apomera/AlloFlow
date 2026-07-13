import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
});

describe('Fisher Lab core mission profiles', () => {
  it('uses region-specific target species, trap catches, and destinations', () => {
    const core = window.__FisherLabCore;

    expect(core.getCoreSimProfile('maine')).toMatchObject({ targetFishId: 'cod', trapCatch: 'lobster' });
    expect(core.getCoreSimProfile('chesapeake')).toMatchObject({ targetFishId: 'stripedbass', trapCatch: 'blue crab' });
    expect(core.getCoreSimProfile('pnw')).toMatchObject({ targetFishId: 'chinook', trapCatch: 'Dungeness crab' });
    expect(core.getCoreSimProfile('greatlakes')).toMatchObject({ targetFishId: 'laketrout', trapCatch: 'crayfish' });
  });

  it('requires every learning objective before a safe return can complete the mission', () => {
    const { isCoreMissionReady } = window.__FisherLabCore;
    const complete = {
      passedRedNun: true,
      trafficDecisionMade: true,
      trafficManeuverComplete: true,
      reachedHalfwayRock: true,
      targetFishDecision: true,
      trapDecisionMade: true
    };

    expect(isCoreMissionReady(complete)).toBe(true);
    Object.keys(complete).forEach((key) => {
      expect(isCoreMissionReady({ ...complete, [key]: false })).toBe(false);
    });
  });
});

describe('Fisher Lab stewardship scoring', () => {
  it('rewards decision streaks, resets misses, and never produces a negative score', () => {
    const { scoreCoreDecision } = window.__FisherLabCore;

    expect(scoreCoreDecision(0, 0, true)).toEqual({ score: 25, streak: 1, delta: 25 });
    expect(scoreCoreDecision(25, 1, true)).toEqual({ score: 55, streak: 2, delta: 30 });
    expect(scoreCoreDecision(10, 4, false)).toEqual({ score: 0, streak: 0, delta: -15 });
    expect(scoreCoreDecision(25, 1, true, 1.5)).toEqual({ score: 70, streak: 2, delta: 45 });
  });
});

describe('Fisher Lab voyage progression', () => {
  it('offers increasingly demanding fuel, accuracy, and condition profiles', () => {
    const { getCoreVoyageMode } = window.__FisherLabCore;
    const guided = getCoreVoyageMode('guided');
    const skipper = getCoreVoyageMode('skipper');
    const master = getCoreVoyageMode('master');

    expect(guided).toMatchObject({ startFuel: 100, weather: 'clear', requiredAccuracy: 60 });
    expect(skipper.startFuel).toBeLessThan(guided.startFuel);
    expect(master.startFuel).toBeLessThan(skipper.startFuel);
    expect(master.requiredAccuracy).toBeGreaterThan(skipper.requiredAccuracy);
    expect(master.scoreMultiplier).toBeGreaterThan(skipper.scoreMultiplier);
  });

  it('sequences the next learning objective and computes relative bearings', () => {
    const { getCoreObjective, getCoreSimProfile, relativeCoreBearing } = window.__FisherLabCore;
    const profile = getCoreSimProfile('maine');
    const state = { passedRedNun: true, reachedHalfwayRock: true, targetFishDecision: false, trapDecisionMade: false };

    const encounter = window.__FisherLabCore.getCoreEncounter('maine');
    expect(getCoreObjective({}, profile, encounter).id).toBe('buoy');
    expect(getCoreObjective({ passedRedNun: true }, profile, encounter).id).toBe('traffic');
    expect(getCoreObjective({ passedRedNun: true, trafficDecisionMade: true }, profile, encounter).id).toBe('maneuver');
    expect(getCoreObjective({ ...state, trafficDecisionMade: true, trafficManeuverComplete: true }, profile, encounter)).toMatchObject({ id: 'fish', label: 'Classify Atlantic cod' });
    expect(getCoreObjective({ ...state, trafficDecisionMade: true, trafficManeuverComplete: true, targetFishDecision: true }, profile, encounter).id).toBe('trap');
    expect(getCoreObjective({ ...state, trafficDecisionMade: true, trafficManeuverComplete: true, targetFishDecision: true, trapDecisionMade: true }, profile, encounter).id).toBe('dock');
    expect(relativeCoreBearing(0, 0, 0, 0, -10)).toBeCloseTo(0);
    expect(relativeCoreBearing(0, 0, 0, 10, 0)).toBeCloseTo(Math.PI / 2);
  });

  it('defines region-specific COLREGS traffic and evaluates helm decisions', () => {
    const { getCoreEncounter, evaluateCoreEncounter } = window.__FisherLabCore;

    expect(getCoreEncounter('maine')).toMatchObject({ vessel: 'Casco Bay ferry', rule: 'COLREGS Rule 15' });
    expect(getCoreEncounter('chesapeake')).toMatchObject({ vesselKind: 'sail', rule: 'COLREGS Rule 18' });
    expect(getCoreEncounter('pnw').rule).toBe('COLREGS Rule 9');
    expect(getCoreEncounter('greatlakes').vessel).toBe('lake freighter');
    expect(evaluateCoreEncounter('maine', 'give-way').correct).toBe(true);
    expect(evaluateCoreEncounter('maine', 'stand-on').correct).toBe(false);

    expect(getCoreEncounter('maine', 'skipper')).toMatchObject({
      vessel: 'outbound lobsterboat',
      approachSide: 'port',
      correctAction: 'stand-on',
      maneuverType: 'stand-on'
    });
    expect(evaluateCoreEncounter('maine', 'stand-on', 'skipper').correct).toBe(true);
    expect(evaluateCoreEncounter('maine', 'give-way', 'skipper').correct).toBe(false);
  });

  it('requires both safe speed and a clear starboard alteration when giving way', () => {
    const { evaluateCoreManeuver } = window.__FisherLabCore;

    expect(evaluateCoreManeuver('give-way', Math.PI, Math.PI, 3, 2, 1)).toMatchObject({ criterionOne: true, criterionTwo: false, complete: false });
    expect(evaluateCoreManeuver('give-way', Math.PI, Math.PI - Math.PI / 9, 3, 5, 1)).toMatchObject({ criterionOne: false, criterionTwo: true, complete: false });
    expect(evaluateCoreManeuver('give-way', Math.PI, Math.PI - Math.PI / 9, 3, 2, 1)).toMatchObject({ criterionOne: true, criterionTwo: true, complete: true });
    expect(evaluateCoreManeuver('give-way', Math.PI, Math.PI + Math.PI / 6, 3, 1, 1).turnDegrees).toBe(0);
  });

  it('requires a steady five-second watch when standing on', () => {
    const { evaluateCoreManeuver } = window.__FisherLabCore;

    expect(evaluateCoreManeuver('stand-on', Math.PI, Math.PI + Math.PI / 45, 3, 3.5, 5)).toMatchObject({ criterionOne: true, criterionTwo: true, observedEnough: true, complete: true });
    expect(evaluateCoreManeuver('stand-on', Math.PI, Math.PI + Math.PI / 12, 3, 3.5, 5)).toMatchObject({ criterionOne: false, complete: false });
    expect(evaluateCoreManeuver('stand-on', Math.PI, Math.PI, 3, 5, 5)).toMatchObject({ criterionTwo: false, complete: false });
    expect(evaluateCoreManeuver('stand-on', Math.PI, Math.PI, 3, 3, 4.9)).toMatchObject({ observedEnough: false, complete: false });
  });

  it('awards ranks from combined score, accuracy, and fuel stewardship', () => {
    const { getCoreVoyageRank } = window.__FisherLabCore;

    expect(getCoreVoyageRank(220, 95, 35).id).toBe('gold');
    expect(getCoreVoyageRank(160, 85, 24).id).toBe('silver');
    expect(getCoreVoyageRank(300, 50, 80).id).toBe('bronze');
  });
});

describe('Fisher Lab simulator safeguards', () => {
  it('keeps keyboard control focused, fuel bounded, and catch decisions explicit', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

    expect(source).toContain('if (document.activeElement !== canvas) return;');
    expect(source).toContain("role: 'application', tabIndex: 0");
    expect(source).toContain('boatState.fuel = Math.max(0');
    expect(source).toContain('boatState.speed *= Math.exp(-0.9 * dt);');
    expect(source).toContain('boatState.pos.z += dz;');
    expect(source).toContain('if (d < 7) {');
    expect(source).toContain('boat.position.z - Math.cos(boatState.heading) * 9');
    expect(source).not.toContain('boatState.pos.z -= dz;');
    expect(source).toContain('unsafeSpeedSeconds >= 3');
    expect(source).toContain('weatherFuelFactor');
    expect(source).toContain('objectiveBearing');
    expect(source).toContain("type: 'traffic-encounter'");
    expect(source).toContain('resolveTrafficEncounter');
    expect(source).toContain('trafficVessel.visible = true');
    expect(source).toContain("activeRegion === 'chesapeake'");
    expect(source).toContain('Traffic: vessel clearing');
    expect(source).toContain('trafficManeuverSeconds >= 20');
    expect(source).toContain("encounterProfile.maneuverLabel + ' complete");
    expect(source).toContain("mode === 'skipper' ? CORE_COLREGS_STAND_ON");
    expect(source).toContain('Safe speed ≤ 2.5 kt');
    expect(source).toContain("label: 'Reduce speed or reverse'");
    expect(source).toContain('trafficManeuverComplete ? 1 : 0');
    expect(source).toContain("if (objective.id === 'maneuver') objectiveBearing = encounterProfile.maneuverType === 'stand-on' ? 0 : 25;");
    expect(source).toContain('Alter starboard · open closest approach');
    expect(source).toContain('Maintain course · monitor closest approach');
    expect(source).toContain('Observe crossing 5 s');
    expect(source).toContain("type: 'fish-haul'");
    expect(source).toContain("role: 'dialog', 'aria-modal': 'true'");
    expect(source).not.toContain('resumeSim');
    expect(source).not.toContain('hud.fuel || 100');
  });
});
