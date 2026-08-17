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

    expect(getCoreEncounter('maine', 'master')).toMatchObject({
      vesselKind: 'radar',
      rule: 'COLREGS Rule 19',
      correctAction: 'restricted-safe',
      maneuverType: 'restricted',
      radarOnly: true
    });
    expect(evaluateCoreEncounter('maine', 'restricted-safe', 'master').correct).toBe(true);
    expect(evaluateCoreEncounter('maine', 'stand-on', 'master').correct).toBe(false);
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

  it('requires safe speed, no unsafe port alteration, a fog signal, and cautious observation under Rule 19', () => {
    const { evaluateCoreManeuver } = window.__FisherLabCore;

    expect(evaluateCoreManeuver('restricted', Math.PI, Math.PI, 4, 1.5, 5, true)).toMatchObject({ criterionOne: true, criterionTwo: true, criterionThree: true, observedEnough: true, complete: true });
    expect(evaluateCoreManeuver('restricted', Math.PI, Math.PI, 4, 1.5, 5, false)).toMatchObject({ criterionThree: false, complete: false });
    expect(evaluateCoreManeuver('restricted', Math.PI, Math.PI, 4, 3, 5, true)).toMatchObject({ criterionOne: false, complete: false });
    const unsafePortTurn = evaluateCoreManeuver('restricted', Math.PI, Math.PI + Math.PI / 12, 4, 1.5, 5, true);
    expect(unsafePortTurn).toMatchObject({ criterionTwo: false, complete: false });
    expect(unsafePortTurn.portTurnDegrees).toBeCloseTo(15);
    expect(evaluateCoreManeuver('restricted', Math.PI, Math.PI - Math.PI / 6, 4, 1.5, 5, true)).toMatchObject({ criterionTwo: true, portTurnDegrees: 0, complete: true });
    expect(evaluateCoreManeuver('restricted', Math.PI, Math.PI, 4, 1.5, 4.9, true)).toMatchObject({ observedEnough: false, complete: false });
  });

  it('interprets bearing and range trends for closest-point-of-approach watch', () => {
    const { evaluateCoreCollisionRisk } = window.__FisherLabCore;

    expect(evaluateCoreCollisionRisk(20, 15, 15, 30, 32)).toMatchObject({
      id: 'collision-risk',
      constantBearing: true,
      closing: true,
      opening: false,
      bearingChange: 2,
      rangeChange: -5
    });
    expect(evaluateCoreCollisionRisk(20, 15, 15, 30, 43)).toMatchObject({ id: 'bearing-changing', constantBearing: false, closing: true });
    expect(evaluateCoreCollisionRisk(20, 18, 14, 30, 46)).toMatchObject({ id: 'opening', opening: true });
    expect(evaluateCoreCollisionRisk(20, 15, 15, 179, -179)).toMatchObject({ id: 'collision-risk', bearingChange: 2 });
    expect(evaluateCoreCollisionRisk(20, 20, 20, 30, 30)).toMatchObject({ id: 'monitoring', closing: false, opening: false });
  });

  it('keeps a capped, immutable history of timed radar plots', () => {
    const { appendCoreRadarPlot } = window.__FisherLabCore;
    const original = [{ bearing: 30, range: 20 }];
    const next = appendCoreRadarPlot(original, 31, 17, 6);

    expect(original).toEqual([{ bearing: 30, range: 20 }]);
    expect(next).toEqual([{ bearing: 30, range: 20 }, { bearing: 31, range: 17 }]);

    let trail = [];
    for (let plot = 0; plot < 8; plot += 1) trail = appendCoreRadarPlot(trail, plot, 20 - plot, 6);
    expect(trail).toHaveLength(6);
    expect(trail.map((entry) => entry.bearing)).toEqual([2, 3, 4, 5, 6, 7]);
    expect(appendCoreRadarPlot([], 0, -4, 6)[0].range).toBe(0);
  });

  it('summarizes radar evidence for the post-encounter replay', () => {
    const { summarizeCoreRadarTrail } = window.__FisherLabCore;

    expect(summarizeCoreRadarTrail([])).toMatchObject({ plotCount: 0, trend: 'insufficient' });
    expect(summarizeCoreRadarTrail([{ bearing: 20, range: 12 }])).toMatchObject({ plotCount: 1, trend: 'insufficient' });
    expect(summarizeCoreRadarTrail([{ bearing: 179, range: 24 }, { bearing: -179, range: 15 }])).toMatchObject({
      plotCount: 2,
      bearingChange: 2,
      rangeChange: -9,
      constantBearing: true,
      trend: 'closing',
      label: 'Steady bearing and closing range show collision risk'
    });
    expect(summarizeCoreRadarTrail([{ bearing: 20, range: 12 }, { bearing: 35, range: 18 }])).toMatchObject({ constantBearing: false, trend: 'opening' });
    expect(summarizeCoreRadarTrail([{ bearing: 20, range: 12 }, { bearing: 21, range: 12.2 }])).toMatchObject({ constantBearing: true, trend: 'steady-range' });
  });

  it('scores learner radar calls from the plotted evidence', () => {
    const { evaluateCoreRadarCall } = window.__FisherLabCore;
    const collisionTrail = [{ bearing: 35, range: 24 }, { bearing: 37, range: 15 }];
    const openingTrail = [{ bearing: 20, range: 12 }, { bearing: 28, range: 18 }];
    const changingTrail = [{ bearing: 20, range: 22 }, { bearing: 38, range: 15 }];

    expect(evaluateCoreRadarCall(collisionTrail, 'collision-risk')).toMatchObject({ correct: true, expected: 'collision-risk', expectedLabel: 'Steady bearing + closing range' });
    expect(evaluateCoreRadarCall(collisionTrail, 'opening')).toMatchObject({ correct: false, expected: 'collision-risk' });
    expect(evaluateCoreRadarCall(openingTrail, 'opening')).toMatchObject({ correct: true, expected: 'opening' });
    expect(evaluateCoreRadarCall(changingTrail, 'changing')).toMatchObject({ correct: true, expected: 'changing' });
  });

  it('keeps the visible maneuver countdown aligned with the review deadline', () => {
    const { getCoreManeuverWindow } = window.__FisherLabCore;

    expect(getCoreManeuverWindow(0, 20)).toEqual({ duration: 20, elapsed: 0, remaining: 20, remainingPct: 100, urgency: 'normal', expired: false });
    expect(getCoreManeuverWindow(10, 20)).toMatchObject({ remaining: 10, remainingPct: 50, urgency: 'warning', expired: false });
    expect(getCoreManeuverWindow(15, 20)).toMatchObject({ remaining: 5, remainingPct: 25, urgency: 'critical', expired: false });
    expect(getCoreManeuverWindow(20, 20)).toMatchObject({ remaining: 0, remainingPct: 0, urgency: 'critical', expired: true });
    expect(getCoreManeuverWindow(30, 20)).toMatchObject({ remaining: 0, remainingPct: 0, expired: true });
    expect(getCoreManeuverWindow(-5, 0)).toMatchObject({ duration: 20, elapsed: 0, remaining: 20 });
  });

  it('grades prompt, well-separated encounters without rewarding incorrect or timed-out work', () => {
    const { gradeCoreEncounter } = window.__FisherLabCore;

    expect(gradeCoreEncounter(true, false, 'stand-on', 5.5, 20)).toEqual({ id: 'excellent', label: 'Excellent watch', bonus: 10 });
    expect(gradeCoreEncounter(true, false, 'give-way', 6.5, 20)).toEqual({ id: 'excellent', label: 'Excellent watch', bonus: 10 });
    expect(gradeCoreEncounter(true, false, 'stand-on', 9, 20)).toEqual({ id: 'safe', label: 'Safe separation', bonus: 5 });
    expect(gradeCoreEncounter(true, false, 'restricted', 8.5, 20)).toEqual({ id: 'excellent', label: 'Excellent watch', bonus: 10 });
    expect(gradeCoreEncounter(true, false, 'restricted', 10, 20)).toEqual({ id: 'safe', label: 'Safe separation', bonus: 5 });
    expect(gradeCoreEncounter(true, false, 'give-way', 10, 15)).toEqual({ id: 'safe', label: 'Safe separation', bonus: 5 });
    expect(gradeCoreEncounter(true, false, 'give-way', 15, 10)).toEqual({ id: 'complete', label: 'Maneuver complete', bonus: 0 });
    expect(gradeCoreEncounter(false, false, 'give-way', 4, 25)).toEqual({ id: 'review', label: 'Review required', bonus: 0 });
    expect(gradeCoreEncounter(true, true, 'stand-on', 20, 25)).toEqual({ id: 'review', label: 'Review required', bonus: 0 });
  });

  it('awards ranks from combined score, accuracy, and fuel stewardship', () => {
    const { getCoreVoyageRank } = window.__FisherLabCore;

    expect(getCoreVoyageRank(220, 95, 35).id).toBe('gold');
    expect(getCoreVoyageRank(160, 85, 24).id).toBe('silver');
    expect(getCoreVoyageRank(300, 50, 80).id).toBe('bronze');
  });
});

describe('Fisher Lab catch evidence', () => {
  it('scores species identification from the observed catch', () => {
    const { evaluateCoreFishIdentification } = window.__FisherLabCore;
    const species = { id: 'cod', name: 'Atlantic Cod' };

    expect(evaluateCoreFishIdentification(species, 'cod')).toMatchObject({ correct: true, expectedId: 'cod', expectedLabel: 'Atlantic Cod' });
    expect(evaluateCoreFishIdentification(species, 'haddock')).toMatchObject({ correct: false, expectedId: 'cod', expectedLabel: 'Atlantic Cod' });
    expect(evaluateCoreFishIdentification(null, 'cod').correct).toBe(false);
  });

  it('classifies minimum-size and slot boundaries from the measured fish', () => {
    const { getCoreFishRuleEvidence } = window.__FisherLabCore;
    const minimumSpecies = { minSize: 18, slot: null };
    const slotSpecies = { minSize: 19, slot: '19-24 inches' };

    expect(getCoreFishRuleEvidence(17, minimumSpecies)).toMatchObject({ legalToRetain: false, expectedReason: 'below-minimum' });
    expect(getCoreFishRuleEvidence(18, minimumSpecies)).toMatchObject({ legalToRetain: true, expectedReason: 'within-rule' });
    expect(getCoreFishRuleEvidence(19, slotSpecies)).toMatchObject({ legalToRetain: true, expectedReason: 'within-rule' });
    expect(getCoreFishRuleEvidence(24, slotSpecies)).toMatchObject({ legalToRetain: true, expectedReason: 'within-rule' });
    expect(getCoreFishRuleEvidence(25, slotSpecies)).toMatchObject({ legalToRetain: false, expectedReason: 'above-slot' });
  });

  it('enforces numeric scenario trip limits after size eligibility is established', () => {
    const { getCoreFishRuleEvidence, evaluateCoreFishDecision } = window.__FisherLabCore;
    const species = { name: 'Atlantic Cod', minSize: 22, slot: null, dailyBag: 1 };

    expect(getCoreFishRuleEvidence(24, species, { retainedCount: 0 })).toMatchObject({ legalToRetain: true, bagLimit: 1, bagRemaining: 1 });
    expect(getCoreFishRuleEvidence(24, species, { retainedCount: 1 })).toMatchObject({ legalToRetain: false, expectedReason: 'bag-limit', bagRemaining: 0 });
    expect(getCoreFishRuleEvidence(20, species, { retainedCount: 1 })).toMatchObject({ legalToRetain: false, expectedReason: 'below-minimum', bagRemaining: 0 });
    expect(evaluateCoreFishDecision(24, species, 'release-required', 'bag-limit', { retainedCount: 1 })).toMatchObject({ correct: true, expectedAction: 'release-required', expectedReason: 'bag-limit' });
  });

  it('requires both a correct evidence log and a correct classification', () => {
    const { evaluateCoreFishDecision } = window.__FisherLabCore;
    const species = { minSize: 19, slot: '19-24 inches' };

    expect(evaluateCoreFishDecision(25, species, 'release-required', 'above-slot')).toMatchObject({ correct: true, classificationCorrect: true, evidenceCorrect: true });
    expect(evaluateCoreFishDecision(25, species, 'release-required', 'below-minimum')).toMatchObject({ correct: false, classificationCorrect: true, evidenceCorrect: false });
    expect(evaluateCoreFishDecision(20, species, 'release-required', 'within-rule')).toMatchObject({ correct: false, classificationCorrect: false, evidenceCorrect: true });
  });

  it('pairs each outcome with appropriate catch-handling guidance', () => {
    const { getCoreFishHandlingGuidance } = window.__FisherLabCore;

    expect(getCoreFishHandlingGuidance('retain', true)).toMatchObject({ id: 'retain', label: 'Retained catch care' });
    expect(getCoreFishHandlingGuidance('release-required', false)).toMatchObject({ id: 'release', label: 'Release handling' });
    expect(getCoreFishHandlingGuidance('retain', false).id).toBe('release');
  });

  it('separates species-identification and regulation-evidence performance', () => {
    const { getCoreCatchSkillSummary } = window.__FisherLabCore;

    expect(getCoreCatchSkillSummary(0, 0, 0, 0)).toMatchObject({ hasData: false, focusId: 'no-data' });
    expect(getCoreCatchSkillSummary(1, 2, 2, 2)).toMatchObject({ identificationPct: 50, rulePct: 100, focusId: 'identification' });
    expect(getCoreCatchSkillSummary(2, 2, 1, 2)).toMatchObject({ identificationPct: 100, rulePct: 50, focusId: 'regulation' });
    expect(getCoreCatchSkillSummary(5, 2, 8, 2)).toMatchObject({ identificationCorrect: 2, ruleCorrect: 2, focusId: 'balanced' });
    expect(getCoreCatchSkillSummary(1, 2, 1, 2).focusId).toBe('workflow');
  });

  it('builds a compact scenario trip ledger around the mission target', () => {
    const { getCoreTripLedger } = window.__FisherLabCore;
    const species = [
      { id: 'cod', name: 'Atlantic Cod', dailyBag: 1 },
      { id: 'haddock', name: 'Haddock', dailyBag: 15 },
      { id: 'pollock', name: 'Pollock', dailyBag: null }
    ];

    expect(getCoreTripLedger({}, species, 'cod')).toEqual([
      expect.objectContaining({ id: 'cod', retainedCount: 0, bagLimit: 1, remaining: 1, limitReached: false })
    ]);
    expect(getCoreTripLedger({ cod: 2, haddock: 3, pollock: 1 }, species, 'cod')).toEqual([
      expect.objectContaining({ id: 'cod', retainedCount: 2, remaining: 0, limitReached: true }),
      expect.objectContaining({ id: 'haddock', retainedCount: 3, remaining: 12, limitReached: false }),
      expect.objectContaining({ id: 'pollock', retainedCount: 1, bagLimit: null, remaining: null })
    ]);
    expect(getCoreTripLedger({ cod: -4 }, species, 'cod')[0].retainedCount).toBe(0);
  });

  it('normalizes and caps catch field notes for the voyage debrief', () => {
    const { appendCoreCatchDecision } = window.__FisherLabCore;
    let history = [];
    for (let index = 0; index < 5; index += 1) {
      history = appendCoreCatchDecision(history, { kind: index % 2 ? 'shellfish' : 'finfish', label: 'Catch ' + index, length: index === 4 ? 'bad' : 10 + index, action: index % 2 ? 'release' : 'keep', correct: index !== 3, evidence: 'Evidence ' + index });
    }

    expect(history).toHaveLength(4);
    expect(history[0]).toMatchObject({ label: 'Catch 1', kind: 'shellfish', action: 'release' });
    expect(history[2]).toMatchObject({ label: 'Catch 3', correct: false });
    expect(history[3]).toMatchObject({ label: 'Catch 4', length: null });
  });
});

describe('Fisher Lab shellfish caliper', () => {
  it('requires an instrument reading within tolerance', () => {
    const { evaluateCoreCaliperReading } = window.__FisherLabCore;

    expect(evaluateCoreCaliperReading(3.27, 3.25)).toMatchObject({ accurate: true, direction: 'aligned', reading: 3.25 });
    expect(evaluateCoreCaliperReading(3.50, 3.35)).toMatchObject({ accurate: false, direction: 'too-narrow' });
    expect(evaluateCoreCaliperReading(3.50, 3.65)).toMatchObject({ accurate: false, direction: 'too-wide' });
    expect(evaluateCoreCaliperReading(3.50, Number.NaN).accurate).toBe(false);
  });

  it('honors an explicit instrument tolerance', () => {
    const { evaluateCoreCaliperReading } = window.__FisherLabCore;

    expect(evaluateCoreCaliperReading(5, 5.09, 0.1).accurate).toBe(true);
    expect(evaluateCoreCaliperReading(5, 5.11, 0.1).accurate).toBe(false);
  });

  it('explains profile-specific release evidence without inventing penalties', () => {
    const { getCoreShellfishReleaseReason } = window.__FisherLabCore;

    expect(getCoreShellfishReleaseReason({ region: 'maine', length: 5.2, isVNotched: false })).toContain('above the 5-inch');
    expect(getCoreShellfishReleaseReason({ region: 'chesapeake', length: 5.5, hasSponge: true })).toContain('egg-bearing');
    expect(getCoreShellfishReleaseReason({ region: 'pnw', length: 6.5, isFemale: true })).toContain('male-only');
    expect(getCoreShellfishReleaseReason({ region: 'greatlakes', length: 2 })).toContain('local species or jurisdiction');
  });

  it('pairs shellfish decisions with species-appropriate handling guidance', () => {
    const { getCoreShellfishHandlingGuidance } = window.__FisherLabCore;

    expect(getCoreShellfishHandlingGuidance('keep', true)).toMatchObject({ id: 'retain', label: 'Retained catch care' });
    expect(getCoreShellfishHandlingGuidance('release', false)).toMatchObject({ id: 'release', label: 'Low-impact release' });
    expect(getCoreShellfishHandlingGuidance('keep', false).id).toBe('release');
  });
});

describe('Fisher Lab simulator safeguards', () => {
  it('keeps keyboard control focused, fuel bounded, and catch decisions explicit', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

    expect(source).toContain('if (document.activeElement !== canvas) return;');
    expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain("document.removeEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain('Simulation paused because the tab became inactive');
    expect(source).toContain('simulation remains paused until you resume');
    expect(source).toContain("role: 'application', tabIndex: 0");
    expect(source).toContain('boatState.fuel = Math.max(0');
    expect(source).toContain('boatState.speed *= Math.exp(-0.9 * dt);');
    expect(source).toContain('boatState.pos.z += dz;');
    expect(source).toContain('if (d < 7) {');
    // The chase-camera offset used to be pinned here as a source string. It is
    // now exercised as real geometry in the "camera rigs" block below, which
    // survives the rig being rewritten and still catches a flipped sign.
    expect(source).not.toContain('boatState.pos.z -= dz;');
    expect(source).toContain('unsafeSpeedSeconds >= 3');
    expect(source).toContain('weatherFuelFactor');
    expect(source).toContain('objectiveBearing');
    expect(source).toContain("type: 'traffic-encounter'");
    expect(source).toContain('resolveTrafficEncounter');
    expect(source).toContain('trafficVessel.visible = !encounterProfile.radarOnly');
    expect(source).toContain("activeRegion === 'chesapeake'");
    expect(source).toContain('Traffic: vessel clearing');
    expect(source).toContain('maneuverWindowState.expired');
    expect(source).toContain("encounterProfile.maneuverLabel + ' complete");
    expect(source).toContain("mode === 'skipper' ? CORE_COLREGS_STAND_ON");
    expect(source).toContain('Safe speed ≤ 2.5 kt');
    expect(source).toContain("label: 'Reduce speed or reverse'");
    expect(source).toContain('trafficManeuverComplete ? 1 : 0');
    expect(source).toContain("if (objective.id === 'maneuver') objectiveBearing = encounterProfile.maneuverType === 'give-way' ? 25 : 0;");
    expect(source).toContain('Alter starboard · open closest approach');
    expect(source).toContain('Maintain course · monitor closest approach');
    expect(source).toContain('Observe crossing 5 s');
    expect(source).toContain('evaluateCoreCollisionRisk');
    expect(source).toContain('CPA WATCH');
    expect(source).toContain('Closest point of approach watch with ');
    expect(source).toContain('appendCoreRadarPlot');
    expect(source).toContain('timed radar plots');
    expect(source).toContain('Steady bearing + shrinking range = collision risk');
    expect(source).toContain("'PLOT ' + trafficTrackDots.length + '/6 - 0.8 s interval'");
    expect(source).toContain('gradeCoreEncounter');
    expect(source).toContain('Traffic encounter debrief.');
    expect(source).toContain('summarizeCoreRadarTrail');
    expect(source).toContain('Radar evidence replay');
    expect(source).toContain('evaluateCoreRadarCall');
    expect(source).toContain('Make the radar evidence call');
    expect(source).toContain("pointerEvents: 'auto', display: 'grid'");
    expect(source).toContain('Make the radar call - optional bonus');
    expect(source).toContain('Radar evidence call already logged.');
    expect(source).toContain('getCoreManeuverWindow');
    expect(source).toContain('Maneuver window: 10 seconds remain before review.');
    expect(source).toContain('Maneuver window: 5 seconds remain before review.');
    expect(source).toContain("'Maneuver window. ' + maneuverWindow.remaining.toFixed(1)");
    expect(source).toContain('maneuverWindowState.expired');
    expect(source).not.toContain('trafficManeuverSeconds >= 20');
    expect(source).toContain("'Radar call: ' + (hud.radarCallCorrect ? 'correct' : 'review')");
    expect(source).toContain('Rule 35 signal: ');
    expect(source).toContain('Steady bearing and closing range show collision risk');
    expect(source).toContain('COLREGS Rule 19');
    expect(source).toContain('Radar: contact tracking');
    expect(source).toContain('Navigate cautiously 5 s');
    expect(source).toContain('soundFogSignal');
    expect(source).toContain('One prolonged blast (B)');
    expect(source).toContain('Sound one prolonged fog-horn blast');
    expect(source).toContain("'aria-keyshortcuts': 'W A S D ArrowUp ArrowDown ArrowLeft ArrowRight Space B F H P V M 1 2 3 Escape'");
    expect(source).toContain("var radarShortcutCalls = { '1': 'collision-risk', '2': 'opening', '3': 'changing' }");
    expect(source).toContain("{ k: '1 / 2 / 3', d: 'Make prompted radar evidence call'");
    expect(source).toContain("activeTraffic.choiceOneAction || 'give-way'");
    expect(source).toContain("' decisions correct · '");
    expect(source).toContain("type: 'fish-haul'");
    expect(source).toContain('inspect the measurement and training rule');
    expect(source).not.toContain("(isKeeper ? ' — KEEPER'");
    expect(source).toContain('1. Identify the species from its field marks');
    expect(source).toContain('2. Log the selected profile evidence');
    expect(source).toContain('3. Classify the catch.');
    expect(source).toContain("name: 'fl-fish-identification'");
    expect(source).toContain('Unidentified catch');
    expect(source).toContain('evaluateCoreFishIdentification');
    expect(source).toContain('Species identification review');
    expect(source).toContain("'Identification: ' + identifiedSpecies.name");
    expect(source).toContain('getCoreCatchSkillSummary');
    expect(source).toContain('Catch skill breakdown');
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuenow': skill.value");
    expect(source).toContain('boatState.fishIdentificationTotal += 1');
    expect(source).toContain('boatState.fishRuleTotal += 1');
    expect(source).toContain("'Species ID ' + (note.identificationCorrect ? 'confirmed' : 'review')");
    expect(source).toContain("disabled: !fishIdentification || !fishEvidence");
    expect(source).toContain("expectedReason = 'bag-limit'");
    expect(source).toContain('Scenario trip limit has been reached');
    expect(source).toContain('retainedBySpecies: {}');
    expect(source).toContain('boatState.retainedBySpecies = {}');
    expect(source).toContain('retainedBySpecies: Object.assign({}, boatState.retainedBySpecies)');
    expect(source).toContain('getCoreTripLedger');
    expect(source).toContain('Scenario trip ledger');
    expect(source).toContain("'aria-label': tripLedgerLabel");
    expect(source).toContain("row.limitReached ? '#fca5a5' : '#dbeafe'");
    expect(source).toContain("name: 'fl-fish-evidence'");
    expect(source).not.toContain("disabled: !fishEvidence");
    expect(source).toContain('Deckhand review');
    expect(source).toContain('Continue voyage');
    expect(source).toContain("getCoreFishHandlingGuidance(action, result.legalToRetain)");
    expect(source).toContain("activeFishing ? activeFishing.phase : null");
    expect(source).not.toContain("[activeFish, activeFishing, activeLobster");
    expect(source).toContain("handleFishingDialogKeyDown");
    expect(source).toContain("}, 80);");
    expect(source).toContain("return function() { clearTimeout(focusTimer); };");
    expect(source).toContain("role: 'dialog', 'aria-modal': 'true'");
    expect(source).toContain("'aria-labelledby': 'fl-shellfish-inspection-title'");
    expect(source).toContain('TRAINING GAUGE · ALIGN JAWS TO REFERENCE POINTS');
    expect(source).not.toContain("'aria-label': 'Measurement diagram for a '");
    expect(source).toContain("'aria-describedby': 'fl-caliper-feedback'");
    expect(source).toContain("disabled: !caliperCheck || !caliperCheck.accurate");
    expect(source).toContain("if (!caliperCheck || !caliperCheck.accurate || shellfishDecisionResult) return;");
    expect(source).toContain('Practice profile only — check current MD-DNR');
    expect(source).toContain('WASHINGTON COMMERCIAL COASTAL TRAINING PROFILE');
    expect(source).toContain('no Great Lakes-wide size threshold is scored');
    expect(source).not.toContain('No fine is simulated; penalties depend on current jurisdiction and fishery.');
    expect(source).toContain('submitShellfishDecision');
    expect(source).toContain("getCoreShellfishHandlingGuidance(action, activeLobster.isKeeper)");
    expect(source).not.toContain("activeLobster.specimenType, true");
    expect(source).toContain("id: 'fl-shellfish-review', role: 'status'");
    expect(source).toContain('Continue voyage');
    expect(source).toContain("!!fishDecisionResult, !!shellfishDecisionResult");
    expect(source).toContain("disabled: !!shellfishDecisionResult");
    expect(source).toContain('appendCoreCatchDecision');
    expect(source).toContain('catchDecisionHistory: boatState.catchDecisionHistory.slice()');
    expect(source).toContain('boatState.catchDecisionHistory = []');
    expect(source).toContain("'aria-label': 'Catch field notes'");
    expect(source).toContain("maxHeight: 'calc(100% - 24px)'");
    expect(source).toContain("!activeTraffic && !hud.missionAttemptComplete && !hud.missionComplete");
    expect(source).toContain("!!shellfishDecisionResult, !!hud.missionAttemptComplete, !!hud.missionComplete");
    expect(source).toContain("ref: decisionFocusRef, type: 'button', className: 'fl-btn', onClick: restartCoreMission");
    expect(source).not.toContain('GLFC CRAYFISH LAWS');
    expect(source).not.toContain('minSize: 3, slot:');
    expect(source).not.toContain('CITATION: Possession of');
    expect(source).not.toContain('Violation penalty: $');
    expect(source).not.toContain('resumeSim');
    expect(source).not.toContain('hud.fuel || 100');
  });
});

// The four camera rigs are pure geometry (getCoreCameraRig), so they can be
// checked here for real instead of by pinning source strings. Two of these
// invariants were live defects: the helm rig sat AHEAD of the boat origin,
// inside the console, and the overhead rig looked exactly along -Y, which
// makes lookAt degenerate because the view direction is parallel to `up`.
describe('Fisher Lab camera rigs', () => {
  const forward = (heading) => ({ x: Math.sin(heading), z: Math.cos(heading) });
  // heading π is north (see headingToCompass); check a heading off the axes too,
  // so a rig that only works when sin or cos is zero cannot pass.
  const HEADINGS = [0, Math.PI, Math.PI / 2, 2.3];
  const BOAT = { x: 12, y: 0.04, z: -7, speed: 3 };
  const at = (view, heading) => window.__FisherLabCore.getCoreCameraRig(view, Object.assign({}, BOAT, { heading }));

  it('exposes every view the V key cycles', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    // Both the key handler and the React toolbar read this one list.
    expect(source).toContain('var views = CAMERA_VIEW_IDS;');
    for (const id of ['chase', 'firstperson', 'topdown', 'chartup']) {
      expect(source).toContain("id: '" + id + "'");
      expect(at(id, Math.PI).id).toBe(id);
    }
  });

  it('places the chase camera astern of the boat and aims it ahead of the bow', () => {
    for (const heading of HEADINGS) {
      const f = forward(heading);
      const rig = at('chase', heading);
      // Behind: the eye offset from the boat opposes the forward vector.
      const dot = (rig.eye[0] - BOAT.x) * f.x + (rig.eye[2] - BOAT.z) * f.z;
      expect(dot).toBeLessThan(-8);
      // Aim point leads the boat rather than sitting on the hull.
      const aim = (rig.target[0] - BOAT.x) * f.x + (rig.target[2] - BOAT.z) * f.z;
      expect(aim).toBeGreaterThan(3);
      expect(rig.eye[1]).toBeGreaterThan(BOAT.y + 2);
    }
  });

  it('dollies the chase camera back as speed rises', () => {
    const slow = window.__FisherLabCore.getCoreCameraRig('chase', { heading: Math.PI, speed: 0 });
    const fast = window.__FisherLabCore.getCoreCameraRig('chase', { heading: Math.PI, speed: 8 });
    expect(Math.hypot(fast.eye[0], fast.eye[2])).toBeGreaterThan(Math.hypot(slow.eye[0], slow.eye[2]));
    expect(fast.eye[1]).toBeGreaterThan(slow.eye[1]);
  });

  it('keeps the helm eye behind the console and looking over the bow', () => {
    for (const heading of HEADINGS) {
      const f = forward(heading);
      const rig = at('firstperson', heading);
      // ★ Behind, not ahead. The old rig was +0.4 forward of the origin, which
      // is inside the console: the bow cone filled the lower half of the frame
      // and the 8 cm nav-light spheres rendered as beach balls.
      const dot = (rig.eye[0] - BOAT.x) * f.x + (rig.eye[2] - BOAT.z) * f.z;
      expect(dot).toBeLessThan(0);
      expect(Math.abs(dot)).toBeLessThan(2); // still on the boat, not a chase cam
      // Above the windshield rail (y 1.25 + half its 0.35 height), riding the bob.
      expect(rig.eye[1]).toBeGreaterThan(1.45);
      // Looking forward and slightly down.
      const aim = (rig.target[0] - rig.eye[0]) * f.x + (rig.target[2] - rig.eye[2]) * f.z;
      expect(aim).toBeGreaterThan(20);
      expect(rig.target[1]).toBeLessThan(rig.eye[1]);
      expect(rig.follow).toBe(false); // the helm must not lag the hull
    }
  });

  it('never aims an overhead rig exactly along its own up vector', () => {
    // lookAt is degenerate when the view direction is parallel to `up`, and the
    // flat, depth-cue-free plan it produced is what made "top-down" read as a
    // broken render rather than a camera angle.
    for (const view of ['topdown', 'chartup']) {
      for (const heading of HEADINGS) {
        const rig = at(view, heading);
        const dir = [rig.target[0] - rig.eye[0], rig.target[1] - rig.eye[1], rig.target[2] - rig.eye[2]];
        const len = Math.hypot(dir[0], dir[1], dir[2]);
        const cos = (dir[0] * rig.up[0] + dir[1] * rig.up[1] + dir[2] * rig.up[2]) / len;
        expect(Math.abs(Math.abs(cos) - 1)).toBeGreaterThan(0.02);
        expect(rig.eye[1]).toBeGreaterThan(20); // genuinely overhead
      }
    }
  });

  it('orients the chart view north-up and the drone view heading-up', () => {
    // Chart view: up is +Z (north) so it matches the paper chart, and the eye
    // does not swing with heading.
    const chartN = at('chartup', Math.PI);
    const chartE = at('chartup', Math.PI / 2);
    expect(chartN.up).toEqual([0, 0, 1]);
    expect(chartN.eye[0]).toBeCloseTo(chartE.eye[0], 6);
    expect(chartN.eye[2]).toBeCloseTo(chartE.eye[2], 6);
    // Drone view: heading-up, so the eye DOES swing round behind the boat.
    const droneN = at('topdown', Math.PI);
    const droneE = at('topdown', Math.PI / 2);
    expect(droneN.up).toEqual([0, 1, 0]);
    expect(Math.hypot(droneN.eye[0] - droneE.eye[0], droneN.eye[2] - droneE.eye[2])).toBeGreaterThan(10);
  });

  it('narrows the lens for the overhead rigs and widens it at the helm', () => {
    expect(at('firstperson', Math.PI).fov).toBeGreaterThan(at('chase', Math.PI).fov);
    expect(at('topdown', Math.PI).fov).toBeLessThan(at('chase', Math.PI).fov);
    expect(at('chartup', Math.PI).fov).toBeLessThan(at('topdown', Math.PI).fov);
  });

  it('falls back to chase for an unknown view id', () => {
    expect(at('nonsense', Math.PI).id).toBe('chase');
  });
});

// The buoy glyphs are parsed out of the BUOYAGE data so the drawing cannot
// drift from the caption beside it. That parse is the risky part: a wrong band
// order or a missed topmark silently draws a DIFFERENT navigational mark, which
// is worse than drawing nothing. Every case below is a real IALA-B mark.
describe('Fisher Lab buoy glyphs', () => {
  const glyph = (m) => window.__FisherLabCore.getCoreBuoyGlyph(m);

  it('draws lateral marks with the shape that pairs with their colour', () => {
    // The tab's own closing note: red is ALWAYS conical, green ALWAYS
    // cylindrical, so a colourblind boater can navigate by shape alone. If the
    // glyph does not honour that, the note is describing a picture that lies.
    const nun = glyph({ type: 'nun', color: 'red', shape: 'conical' });
    expect(nun).toMatchObject({ body: 'nun', bands: ['red'], striped: false });
    const can = glyph({ type: 'can', color: 'green', shape: 'cylindrical' });
    expect(can).toMatchObject({ body: 'can', bands: ['green'], striped: false });
  });

  it('orders junction bands top-down as the caption reads them', () => {
    // "red over green" must put red on TOP. Reversed, this is the mark for the
    // opposite preferred channel.
    expect(glyph({ color: 'red over green', shape: 'nun' })).toMatchObject({ body: 'nun', bands: ['red', 'green'] });
    expect(glyph({ color: 'green over red', shape: 'can' })).toMatchObject({ body: 'can', bands: ['green', 'red'] });
  });

  it('reads cardinal bands and topmark cone directions', () => {
    // Cone direction is the entire difference between an east and a west
    // cardinal, and they tell you to pass on opposite sides.
    expect(glyph({ color: 'black-over-yellow', topmark: '▲▲' })).toMatchObject({ bands: ['black', 'yellow'], topmark: ['up', 'up'] });
    expect(glyph({ color: 'black-yellow-black', topmark: '▲▼' })).toMatchObject({ bands: ['black', 'yellow', 'black'], topmark: ['up', 'down'] });
    expect(glyph({ color: 'yellow-over-black', topmark: '▼▼' })).toMatchObject({ bands: ['yellow', 'black'], topmark: ['down', 'down'] });
    expect(glyph({ color: 'yellow-black-yellow', topmark: '▼▲' })).toMatchObject({ bands: ['yellow', 'black', 'yellow'], topmark: ['down', 'up'] });
  });

  it('never confuses an east cardinal with a west cardinal', () => {
    const east = glyph({ color: 'black-yellow-black', topmark: '▲▼' });
    const west = glyph({ color: 'yellow-black-yellow', topmark: '▼▲' });
    expect(east.topmark).not.toEqual(west.topmark);
    expect(east.bands).not.toEqual(west.bands);
  });

  it('draws safe water as vertical stripes, not horizontal bands', () => {
    const sw = glyph({ color: 'red and white vertical stripes', shape: 'spherical or pillar' });
    expect(sw.striped).toBe(true);
    expect(sw.bands).toEqual(['red', 'white']);
    expect(sw.body).toBe('sphere');
    // "and" is not a colour and must not become a band.
    expect(sw.bands).not.toContain('and');
  });

  it('sets a horizontal band INTO the body colour rather than halving the mark', () => {
    // "black with red horizontal band" is black-red-black. Drawn as two bands
    // it reads as some other mark; this one means isolated danger.
    const iso = glyph({ color: 'black with red horizontal band', topmark: '●●' });
    expect(iso.bands).toEqual(['black', 'red', 'black']);
    expect(iso.topmark).toEqual(['sphere', 'sphere']);
    expect(iso.striped).toBe(false);
  });

  it('degrades safely on data it does not recognise', () => {
    // A new mark added to BUOYAGE with unfamiliar wording must draw a plain
    // hull, never a mark that means something specific and wrong.
    expect(glyph({ color: 'chartreuse', shape: 'blob' })).toMatchObject({ body: 'pillar', bands: ['white'], topmark: [] });
    expect(glyph({})).toMatchObject({ body: 'pillar', bands: ['white'], topmark: [] });
    expect(glyph(null).bands).toEqual(['white']);
  });

  it('stays in step with the marks the buoyage tab actually renders', () => {
    // A glyph is only trustworthy if it is derived from the shipped data, so
    // walk the real table rather than fixtures.
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(source).toContain('flBuoySvg(h, b, keyPrefix + i)');
    expect(source).toContain('flChannelSvg(h)');
    const known = ['red', 'green', 'black', 'yellow', 'white'];
    for (const m of [{ color: 'red', shape: 'conical' }, { color: 'green', shape: 'cylindrical' },
      { color: 'red over green', shape: 'nun' }, { color: 'green over red', shape: 'can' },
      { color: 'black-over-yellow', topmark: '▲▲' }, { color: 'black-yellow-black', topmark: '▲▼' },
      { color: 'yellow-over-black', topmark: '▼▼' }, { color: 'yellow-black-yellow', topmark: '▼▲' },
      { color: 'red and white vertical stripes', shape: 'spherical or pillar' },
      { color: 'black with red horizontal band', topmark: '●●' }]) {
      const g = glyph(m);
      expect(g.bands.length).toBeGreaterThan(0);
      g.bands.forEach((b) => expect(known).toContain(b));
      expect(['nun', 'can', 'pillar', 'sphere']).toContain(g.body);
    }
  });
});

// Light characters are parsed out of prose ("White flash every 4 seconds"),
// because that is how the LIGHTHOUSES and BUOYAGE tables actually store them.
// A navigator tells one light from another BY its rhythm, so a guessed rhythm
// is worse than no picture — hence the null cases below.
describe('Fisher Lab light characters', () => {
  const ch = (s) => window.__FisherLabCore.getCoreLightCharacter(s);
  const lit = (c) => c.phases.filter((p) => p.on).length;
  const total = (c) => c.phases.reduce((a, p) => a + p.sec, 0);

  it('reads colour, period and rhythm off a plain flashing character', () => {
    const c = ch('White flash every 4 seconds');
    expect(c).toMatchObject({ color: 'white', kind: 'flash', periodSec: 4, periodKnown: true });
    expect(lit(c)).toBe(1);
    expect(total(c)).toBeCloseTo(4, 5);
  });

  it('reads the LIGHT, not the paint job, when the text describes both', () => {
    // "Red + white candy-stripe; flashing red every 15s" — West Quoddy Head.
    // Taking the first colour word yields a red-and-white daymark instead of
    // the red light, and a strip that shows the wrong colour is a wrong answer.
    const c = ch('Red + white candy-stripe; flashing red every 15s');
    expect(c.color).toBe('red');
    expect(c.periodSec).toBe(15);
    expect(c.kind).toBe('flash');
  });

  it('returns nothing when the text describes the tower rather than the light', () => {
    // "Two Lights — historic twin tower system" carries no rhythm at all.
    expect(ch('Two Lights — historic twin tower system')).toBeNull();
    expect(ch('')).toBeNull();
    expect(ch(null)).toBeNull();
    expect(ch(undefined)).toBeNull();
  });

  it('treats fixed and continuous lights as steady, with no dark phase', () => {
    for (const s of ['Fixed white', 'Continuous green']) {
      const c = ch(s);
      expect(c.kind).toBe('fixed');
      expect(c.phases.every((p) => p.on)).toBe(true);
    }
    expect(ch('Continuous green').color).toBe('green');
  });

  it('lets a mention of flashing win over a mention of quick', () => {
    // "Red flashing or quick" leads with flashing; "continuous quick or very
    // quick" has no flash at all. Getting these backwards swaps two rhythms a
    // navigator uses to tell a cardinal mark from a lateral one.
    expect(ch('Red flashing or quick')).toMatchObject({ kind: 'flash', color: 'red' });
    expect(ch('White, continuous quick or very quick').kind).toBe('quick');
  });

  it('counts the flashes in a group and keeps the trailing long flash', () => {
    const g3 = ch('White, group flash (3)');
    expect(g3).toMatchObject({ kind: 'group-flash', flashes: 3, longFlash: false });
    expect(lit(g3)).toBe(3);
    const g6 = ch('White, group flash (6) + long flash');
    expect(g6).toMatchObject({ kind: 'group-flash', flashes: 6, longFlash: true });
    expect(lit(g6)).toBe(7);                     // six short plus the long one
    const longest = Math.max(...g6.phases.filter((p) => p.on).map((p) => p.sec));
    expect(longest).toBeGreaterThan(1.5);        // the long flash really is long
  });

  it('gives isophase equal light and dark', () => {
    const c = ch('Isophase white 6 seconds');
    expect(c.kind).toBe('iso');
    const on = c.phases.filter((p) => p.on).reduce((a, p) => a + p.sec, 0);
    expect(on).toBeCloseTo(total(c) / 2, 5);
  });

  it('gives Morse A a short flash then a long one', () => {
    const c = ch('Morse "A" (.-) white');
    expect(c.kind).toBe('morse-a');
    const on = c.phases.filter((p) => p.on).map((p) => p.sec);
    expect(on.length).toBe(2);
    expect(on[1]).toBeGreaterThan(on[0]);        // dot then dash, never dash then dot
  });

  it('always produces phases that fill exactly one period', () => {
    // The strip maps phase seconds onto the full width, so any drift here
    // silently mis-scales every rhythm drawn from it.
    for (const s of ['White flash every 4 seconds', 'Continuous green', 'Fixed white',
      'White flash every 15 seconds', 'White, group flash (3)', 'White, group flash (6) + long flash',
      'Isophase white 6 seconds', 'Morse "A" (.-) white', 'White, continuous quick',
      'Red flashing or quick', 'Green flashing or quick']) {
      const c = ch(s);
      expect(c, s).not.toBeNull();
      expect(total(c), s).toBeCloseTo(c.periodSec, 5);
      expect(c.phases.every((p) => p.sec > 0), s).toBe(true);
      expect(['white', 'red', 'green', 'yellow']).toContain(c.color);
    }
  });

  it('parses every character actually shipped in the lighthouse table', () => {
    // Walk the real data: a strip is only trustworthy if it survives the
    // wording the tool ships, not fixtures written to match the parser.
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    // Scoped to the LIGHTHOUSES table: FAMOUS_SPOTS uses a `character:` key too,
    // for prose about undersea terrain, and it is never fed to this parser.
    const from = source.indexOf('var LIGHTHOUSES = [');
    const to = source.indexOf('\n  ];', from);
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const chars = [...source.slice(from, to).matchAll(/^ +character: '([^']*)',$/gm)].map((m) => m[1]);
    expect(chars.length).toBeGreaterThanOrEqual(12);
    let drawn = 0;
    for (const c of chars) {
      const parsed = ch(c);
      if (!parsed) continue;                     // no rhythm in the text is a valid outcome
      drawn++;
      expect(total(parsed), c).toBeCloseTo(parsed.periodSec, 5);
    }
    // Only the twin-tower entry legitimately has no rhythm.
    expect(drawn).toBe(chars.length - 1);
  });
});
// The teaching figures draw numbers. These check the numbers, and — where a
// figure hard-codes a value into a caption — that the caption still agrees
// with the formula it claims to be showing.
describe('Fisher Lab teaching-figure math', () => {
  const core = () => window.__FisherLabCore;

  describe('rule of twelfths', () => {
    it('runs 1-2-3-3-2-1 and accounts for the whole range', () => {
      const rows = core().getCoreTwelfths();
      expect(rows.map((r) => r.twelfths)).toEqual([1, 2, 3, 3, 2, 1]);
      expect(rows[rows.length - 1].cumulative).toBeCloseTo(1, 10);
      // Monotonic: the tide never runs backwards inside a half-cycle.
      rows.forEach((r, i) => { if (i) expect(r.cumulative).toBeGreaterThan(rows[i - 1].cumulative); });
    });

    it('puts exactly half the range at mid-tide', () => {
      // This is the one number the tab quotes in prose and the figure calls out.
      expect(core().getCoreTwelfths()[2].cumulative).toBeCloseTo(0.5, 10);
    });

    it('is symmetric about mid-tide', () => {
      const t = core().getCoreTwelfths().map((r) => r.twelfths);
      expect(t.slice().reverse()).toEqual(t);
    });

    it('stays within a sixtieth of the exact semidiurnal curve', () => {
      // The figure claims this in words. If the rule and the curve it is drawn
      // against ever disagreed by more, the caption would be a false claim.
      const worst = Math.max(...core().getCoreTwelfths().map((r) => Math.abs(r.error)));
      expect(worst).toBeLessThan(1 / 60);
      expect(worst).toBeGreaterThan(0);      // it IS an approximation, not exact
    });

    it('agrees with the worked example the tab prints', () => {
      // "High 04:00, low 10:00, range 9 ft. At 07:00 ... 4.5 ft."
      const fallenAt3h = core().getCoreTwelfths()[2].cumulative * 9;
      expect(fallenAt3h).toBeCloseTo(4.5, 10);
    });
  });

  describe('distance to the horizon', () => {
    it('matches the two worked examples in NAV_MATH', () => {
      // "10 ft eye height -> 3.7 nm horizon. Lighthouse 100 ft -> 11.7 nm."
      expect(core().getCoreHorizonNm(10)).toBeCloseTo(3.7, 1);
      expect(core().getCoreHorizonNm(100)).toBeCloseTo(11.7, 1);
    });

    it('grows with the square root of height, not linearly', () => {
      // Quadrupling your eye height doubles your horizon; a linear model would
      // quadruple it, and that error compounds over a passage plan.
      expect(core().getCoreHorizonNm(40) / core().getCoreHorizonNm(10)).toBeCloseTo(2, 6);
      expect(core().getCoreHorizonNm(0)).toBe(0);
      expect(core().getCoreHorizonNm(-5)).toBe(0);
    });

    it('adds the two horizons to give the geographic range', () => {
      const r = core().getCoreGeographicRangeNm(10, 100);
      expect(r).toBeCloseTo(core().getCoreHorizonNm(10) + core().getCoreHorizonNm(100), 10);
      expect(r).toBeCloseTo(15.4, 1);
    });

    it('keeps the figure captions in step with the formula', () => {
      // The horizon figure hard-codes 3.7, 11.7 and 15.4 into its labels. If the
      // constant were ever retuned, those captions would quietly become wrong.
      const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
      const from = source.indexOf('function flHorizonSvg');
      const fig = source.slice(from, source.indexOf('function flCompassChainSvg', from));
      expect(from).toBeGreaterThan(-1);
      expect(fig).toContain(core().getCoreHorizonNm(10).toFixed(1));
      expect(fig).toContain(core().getCoreHorizonNm(100).toFixed(1));
      expect(fig).toContain(core().getCoreGeographicRangeNm(10, 100).toFixed(1));
    });
  });

  describe('water column depth bands', () => {
    it('reads the depth range out of each zone label', () => {
      expect(core().getCoreZoneDepths({ zone: 'Surface (0-5 m)' })).toEqual({ topM: 0, bottomM: 5, openEnded: false });
      expect(core().getCoreZoneDepths({ zone: 'Deep (100-300 m)' })).toEqual({ topM: 100, bottomM: 300, openEnded: false });
      expect(core().getCoreZoneDepths({ zone: 'Continental Slope (300+ m)' })).toEqual({ topM: 300, bottomM: null, openEnded: true });
    });

    it('returns nothing for a habitat that is not a depth band', () => {
      // "Benthic (on the seabed)" is drawn as the floor, not as a slab of water.
      // Parsing it as a band would stack a second seabed inside the column.
      expect(core().getCoreZoneDepths({ zone: 'Benthic (on the seabed)' })).toBeNull();
      expect(core().getCoreZoneDepths({})).toBeNull();
      expect(core().getCoreZoneDepths(null)).toBeNull();
    });

    it('covers the shipped table with contiguous, non-overlapping bands', () => {
      // Walk the real WATER_COLUMN: a gap or an overlap would draw a column
      // that misrepresents where a species actually sits.
      const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
      const from = source.indexOf('var WATER_COLUMN = [');
      const table = source.slice(from, source.indexOf('\n  ];', from));
      const zones = [...table.matchAll(/^ +\{ zone: '([^']*)'/gm)].map((m) => ({ zone: m[1] }));
      expect(zones.length).toBeGreaterThanOrEqual(6);
      const bands = zones.map((z) => core().getCoreZoneDepths(z)).filter(Boolean);
      expect(bands.length).toBe(zones.length - 1);        // benthic is the floor
      expect(bands[0].topM).toBe(0);
      bands.forEach((b, i) => {
        if (i) expect(b.topM, zones[i].zone).toBe(bands[i - 1].bottomM);
      });
      expect(bands[bands.length - 1].openEnded).toBe(true);
    });
  });

  describe('day shapes', () => {
    const shapes = () => {
      const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
      const from = source.indexOf('var DAY_SHAPES = [');
      const to = source.indexOf('\n  ];', from);
      return source.slice(from, to);
    };

    it('gives every shape a rule citation', () => {
      const rows = [...shapes().matchAll(/rule: '([^']*)'/g)].map((m) => m[1]);
      expect(rows.length).toBeGreaterThanOrEqual(8);
      rows.forEach((r) => expect(r).toMatch(/^Rule \d+(\([a-e]\))?$/));
    });

    it('distinguishes the ball counts that mean different things', () => {
      const src = shapes();
      // One ball is anchored, two is not under command, three is aground. Get a
      // count wrong and the drawing states the wrong casualty.
      expect(src).toContain("id: 'anchor', rule: 'Rule 30(a)', stack: ['ball']");
      expect(src).toContain("id: 'nuc', rule: 'Rule 27(a)', stack: ['ball', 'ball']");
      expect(src).toContain("id: 'aground', rule: 'Rule 30(d)', stack: ['ball', 'ball', 'ball']");
      expect(src).toContain("stack: ['ball', 'diamond', 'ball']");
    });

    it('keeps the fishing bicone distinct from a single cone', () => {
      const src = shapes();
      // Two cones apex-to-apex is a vessel fishing; ONE cone apex-down is a
      // sailing vessel under power. They are different vessels under different
      // rules, and the only difference in the drawing is the shape.
      expect(src).toContain("id: 'fishing'");
      expect(src).toMatch(/id: 'fishing'[^}]*stack: \['bicone'\]/);
      expect(src).toMatch(/id: 'sailpower'[^}]*stack: \['cone-down'\]/);
    });
  });
});
// The chart-symbols tab is a list of DESCRIPTIONS OF PICTURES, so each glyph is
// matched from the shipped description. Matching the wrong one would draw a
// chart mark the caption never asked for, which on a chart means a different
// hazard.
describe('Fisher Lab chart symbols', () => {
  const sym = (t) => window.__FisherLabCore.getCoreChartSymbol(t);
  const source = () => fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

  it('splits an entry into the symbol name and what it looks like', () => {
    const r = sym('Rock (below water): plus sign (+) with depth');
    expect(r.name).toBe('Rock (below water)');
    expect(r.desc).toBe('plus sign (+) with depth');
    expect(r.glyph).toBe('rock-sub');
  });

  it('keeps the two rock symbols apart', () => {
    // Above water is an asterisk, below water is a plus with a depth. Swap them
    // and the chart tells you to steer over a rock that dries.
    expect(sym('Rock (above water): asterisk or cross').glyph).toBe('rock-dry');
    expect(sym('Rock (below water): plus sign (+) with depth').glyph).toBe('rock-sub');
  });

  it('gives the lighthouse plan symbol and the tower elevation different glyphs', () => {
    // "Lighthouse: solid star with rays" is the plan-view symbol; "Lighthouse +
    // tower: side profile drawings" is an elevation. One rule matching both
    // drew a star next to a caption promising a side profile.
    expect(sym('Lighthouse: solid star with rays, name + light characteristics labeled').glyph).toBe('lighthouse');
    expect(sym('Lighthouse + tower: side profile drawings').glyph).toBe('lighthouse-profile');
  });

  it('draws nothing for an entry that is a notation rather than a symbol', () => {
    // "Datum" and "NDZ notation" describe wording on the chart, not a mark.
    expect(sym('Datum: "Mean Lower Low Water" (MLLW) is most common US chart datum').glyph).toBeNull();
    expect(sym('No-discharge zone: NDZ notation').glyph).toBeNull();
    expect(sym('Something nobody has drawn yet: who knows').glyph).toBeNull();
    expect(sym('').glyph).toBeNull();
    expect(sym(null).glyph).toBeNull();
  });

  it('handles an entry with no colon without losing the text', () => {
    const r = sym('Just a bare label');
    expect(r.name).toBe('Just a bare label');
    expect(r.desc).toBe('');
  });

  it('parses every entry in the shipped table and draws most of them', () => {
    const src = source();
    const from = src.indexOf('var CHART_SYMBOLS = [');
    const table = src.slice(from, src.indexOf('\n  ];', from));
    const items = [...table.matchAll(/^ {6}'((?:[^'\\]|\\.)*)'/gm)].map((m) => m[1].replace(/\\'/g, "'"));
    expect(items.length).toBeGreaterThanOrEqual(30);
    let drawn = 0;
    for (const it of items) {
      const r = sym(it);
      expect(r.name.length, it).toBeGreaterThan(0);
      expect(r.name, it).not.toContain(': ');       // the split really happened
      if (r.glyph) drawn++;
    }
    // Most entries are real marks; the rest are notations. If this ever drops
    // sharply, a rule has stopped matching the wording it was written for.
    expect(drawn).toBeGreaterThanOrEqual(24);
    expect(drawn).toBeLessThan(items.length);       // notations stay undrawn
  });

  it('renders one glyph per matched entry and no orphans', () => {
    // Every glyph id a rule can produce must have a branch that draws it,
    // or a matched entry silently renders an empty tile.
    const src = source();
    const rulesFrom = src.indexOf('var CHART_GLYPH_RULES = [');
    const rules = [...src.slice(rulesFrom, src.indexOf('\n  ];', rulesFrom)).matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
    const drawFrom = src.indexOf('function flChartGlyphSvg');
    const drawBody = src.slice(drawFrom, src.indexOf('\n  // ─── Lobster zones', drawFrom));
    expect(rules.length).toBeGreaterThanOrEqual(28);
    rules.forEach((id) => expect(drawBody, id).toContain("id === '" + id + "'"));
  });
});

describe('Fisher Lab lobster zone ribbon', () => {
  const summary = (z) => window.__FisherLabCore.getCoreZoneTrapSummary(z);

  it('states the shared limit when every zone carries the same one', () => {
    const out = summary([{ traps: '800' }, { traps: '800' }, { traps: '800' }]);
    expect(out).toContain('All 3');
    expect(out).toContain('800-trap');
  });

  it('stops claiming a shared limit as soon as one zone differs', () => {
    // The whole reason this is derived: a hard-coded "all seven are 800" line
    // would go quietly false the day a zone council changed its limit, and the
    // figure would be teaching a regulation that no longer holds.
    const out = summary([{ traps: '800' }, { traps: '600' }, { traps: '800' }]);
    expect(out).not.toContain('All 3');
    expect(out).toContain('differ by zone');
    expect(out).toContain('800 / 600');
  });

  it('survives an empty or missing list', () => {
    expect(typeof summary([])).toBe('string');
    expect(typeof summary(null)).toBe('string');
  });

  it('runs the shipped zones from north-east to south-west', () => {
    // The ribbon draws them left to right in array order and labels the ends
    // Canadian border and New Hampshire. If the array were ever reordered the
    // drawing would put Kittery on the Canadian line.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = src.indexOf('var LOBSTER_ZONES = [');
    const table = src.slice(from, src.indexOf('\n  ];', from));
    const ids = [...table.matchAll(/^ +\{ id: '([A-G])'/gm)].map((m) => m[1]);
    expect(ids).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(table).toMatch(/id: 'A'[\s\S]*?Eastport/);
    expect(table).toMatch(/id: 'G'[\s\S]*?Kittery/);
  });
});
describe('Fisher Lab fog signals', () => {
  const src = () => fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
  const table = () => {
    const s = src();
    const from = s.indexOf('var FOG_SIGNALS = [');
    return s.slice(from, s.indexOf('\n  ];', from));
  };

  it('cites a Rule 35 paragraph for every signal', () => {
    const rules = [...table().matchAll(/rule: '([^']*)'/g)].map((m) => m[1]);
    expect(rules.length).toBeGreaterThanOrEqual(4);
    rules.forEach((r) => expect(r).toMatch(/^Rule 35\([a-h]\)$/));
  });

  it('uses blast durations inside the range the tool states elsewhere', () => {
    // NAV_PROBLEMS quotes Rule 35(a) verbatim: "one prolonged blast (4-6 sec)".
    // The strips are drawn to scale in seconds, so a duration outside that
    // range would draw a blast the rest of the tool calls wrong.
    const s = src();
    const from = s.indexOf('var BLAST_SEC = {');
    const durations = s.slice(from, s.indexOf('};', from));
    const prolonged = Number(durations.match(/prolonged: ([\d.]+)/)[1]);
    const short = Number(durations.match(/short: ([\d.]+)/)[1]);
    expect(prolonged).toBeGreaterThanOrEqual(4);
    expect(prolonged).toBeLessThanOrEqual(6);
    expect(short).toBeGreaterThan(0);
    expect(short).toBeLessThan(2);
    expect(prolonged).toBeGreaterThan(short * 3);   // it must LOOK prolonged
  });

  it('gives the power-driven vessel exactly one prolonged blast', () => {
    // This is the signal the simulator scores on the B key during its Rule 19
    // encounter. If the figure showed a different pattern, the tab would be
    // teaching one thing and the sim marking another.
    const t = table();
    const entry = t.slice(t.indexOf("id: 'power'"), t.indexOf("id: 'sailfish'"));
    expect(entry).toContain("pattern: [{ kind: 'prolonged' }]");
    expect(entry).toContain("every: 'every 2 min'");
  });

  it('keeps the bell signals distinct from the horn signals', () => {
    // At anchor and aground are BELL, not horn — the tab says to listen for the
    // difference, so the two must not share a blast kind.
    const t = table();
    expect(t.slice(t.indexOf("id: 'anchored'"), t.indexOf("id: 'aground'"))).toContain("kind: 'bell'");
    const aground = t.slice(t.indexOf("id: 'aground'"));
    expect(aground).toContain('bellgroup');
    // Three strokes, the rapid bell, three strokes again.
    expect((aground.match(/bellgroup/g) || []).length).toBe(2);
  });
});

describe('Fisher Lab lobster gauge figure', () => {
  it('draws the same slot the simulator actually enforces', () => {
    // ★ The figure hard-codes its keeper band. The sim scores catch decisions
    // against getCoreShellfishReleaseReason. If those two ever disagreed, the
    // conservation tab would teach one slot and the game would mark another —
    // and the student would be right and the tool wrong.
    const { getCoreShellfishReleaseReason } = window.__FisherLabCore;
    const tooSmall = (len) => /below the ([\d.]+)-inch/.exec(getCoreShellfishReleaseReason({ length: len }));
    const tooBig = (len) => /above the ([\d.]+)-inch/.exec(getCoreShellfishReleaseReason({ length: len }));
    const minIn = Number(tooSmall(1)[1]);
    const maxIn = Number(tooBig(99)[1]);
    expect(minIn).toBeGreaterThan(0);
    expect(maxIn).toBeGreaterThan(minIn);

    // Boundaries behave as a band, not a floor.
    expect(tooSmall(minIn - 0.01)).toBeTruthy();
    expect(tooSmall(minIn)).toBeNull();
    expect(tooBig(maxIn + 0.01)).toBeTruthy();
    expect(tooBig(maxIn)).toBeNull();

    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(source).toContain('flLobsterGaugeSvg(h, ' + minIn + ', ' + maxIn + ')');
  });

  it('measures the carapace and says so, since that is the mistake students make', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = source.indexOf('function flLobsterGaugeSvg');
    const fig = source.slice(from, source.indexOf('\n  // ─── Camera rig geometry', from));
    expect(fig).toContain('CARAPACE');
    expect(fig).toContain('not the tail');
    expect(fig).toContain('not the whole animal');
    // And the alt text has to carry the same content for a screen reader.
    expect(fig).toMatch(/aria-label[^]*carapace only/);
    expect(fig).toMatch(/aria-label[^]*protected for life/);
  });
});
// Gear selectivity is read from each gear's OWN tradeoff line, so the tool
// never grades a fishery beyond what it already says in prose.
describe('Fisher Lab gear selectivity', () => {
  const sel = (t) => window.__FisherLabCore.getCoreGearSelectivity({ tradeoff: t });

  it('★ does not call the lobster trap a bycatch problem for saying "bycatch is minimal"', () => {
    // The trap's line is "Highly target-specific bycatch is minimal". A naive
    // substring test for "bycatch" tags the most target-specific gear in the
    // Maine fishery as a bycatch offender — the exact opposite of its text.
    expect(sel('Highly target-specific bycatch is minimal; requires license (apprentice → student → Class I/II/III).')).toBe('selective');
    expect(sel('Minimal bycatch when rigged correctly.')).toBe('selective');
  });

  it('flags gear whose own line reports bycatch', () => {
    expect(sel('High catch volume; bycatch of seabirds + non-target fish a known issue. Mitigation gear required.')).toBe('bycatch');
    expect(sel('Efficient but bycatch of seals, porpoises, sea turtles depending on configuration.')).toBe('bycatch');
    expect(sel('Wasteful of bait + creates nontarget attraction.')).toBe('bycatch');
  });

  it('recognises the ways the data says selective', () => {
    expect(sel('Most selective gear: you decide every fish kept or released.')).toBe('selective');
    expect(sel('Highly selective + low impact. Skill-intensive.')).toBe('selective');
    expect(sel('Highly selective by definition. Requires DMR endorsement for some species.')).toBe('selective');
  });

  it('says nothing when the gear says nothing', () => {
    // Silence is the correct output. Inventing a rating for jigging or trolling
    // would be the tool editorialising past its own source text.
    expect(sel('Covers a lot of water. Burns fuel.')).toBeNull();
    expect(sel('Effective when fish are tight to bottom or holding mid-water on bait. Cardio workout.')).toBeNull();
    expect(sel('')).toBeNull();
    expect(window.__FisherLabCore.getCoreGearSelectivity(null)).toBeNull();
    expect(window.__FisherLabCore.getCoreGearSelectivity({})).toBeNull();
  });

  it('tags the shipped gear table the way that table reads', () => {
    // Walk the real GEAR list rather than fixtures, and pin the handful whose
    // classification a reader could check by eye against the card beside it.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = src.indexOf('var GEAR = [');
    const table = src.slice(from, src.indexOf('\n  ];', from));
    const rows = [...table.matchAll(/\{ id: '([^']+)'[\s\S]*?tradeoff: '((?:[^'\\]|\\.)*)'/g)]
      .map((m) => ({ id: m[1], tradeoff: m[2].replace(/\\'/g, "'") }));
    expect(rows.length).toBeGreaterThanOrEqual(13);
    const tagged = Object.fromEntries(rows.map((r) => [r.id, window.__FisherLabCore.getCoreGearSelectivity(r)]));
    expect(tagged.trap).toBe('selective');
    expect(tagged.rodReel).toBe('selective');
    expect(tagged.fly).toBe('selective');
    expect(tagged.spear).toBe('selective');
    expect(tagged.longline).toBe('bycatch');
    expect(tagged.gillnet).toBe('bycatch');
    expect(tagged.troll).toBeNull();
    expect(tagged.jigging).toBeNull();
    // Every tag must be one of the two known values or nothing at all.
    Object.values(tagged).forEach((v) => expect([null, 'selective', 'bycatch']).toContain(v));
  });
});
// Species ID: the drawings are a key to the VOCABULARY the idMarks text uses,
// and the feature chips are read straight out of that text. Drawn rather than
// photographed on purpose — a photo is one individual at one angle, and a
// drawing can show the diagnostic feature and suppress everything else.
describe('Fisher Lab species identification', () => {
  const feats = (marks) => window.__FisherLabCore.getCoreIdFeatures({ idMarks: marks }).map((f) => f.id);
  const source = () => fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
  const speciesTable = () => {
    const s = source();
    const from = s.indexOf('var MAINE_SPECIES = [');
    return s.slice(from, s.indexOf('\n  ];', from));
  };

  it('picks the named parts out of an ID note', () => {
    // Sorted: which features a note mentions is the contract, the order the
    // rule table happens to sit in is not.
    const set = (marks) => feats(marks).slice().sort();
    expect(set('Three dorsal fins; barbel on chin; lateral line pale + curved upward over pectoral.'))
      .toEqual(['barbel', 'dorsal', 'lateral', 'pectoral']);
    expect(set('Seven or eight dark horizontal stripes; silvery sides; large mouth.'))
      .toEqual(['colour', 'mouth', 'stripes']);
    expect(set('Silver body, single black spot behind gill; large eye; deeply forked tail.'))
      .toEqual(['eye', 'gill', 'spot', 'tail']);
    // Terms the first pass missed entirely — a blunt head and crushing teeth
    // are how you tell a tautog, and mottling is how you tell a sculpin.
    expect(set('Dark mottled body, blunt head, thick lips, strong crushing teeth.'))
      .toEqual(['colour', 'mouth', 'shape', 'teeth']);
    expect(set('Snake-like body. Adults yellow/brown; elvers transparent + tiny.'))
      .toEqual(['shape']);
  });

  it('says nothing when there is nothing to say', () => {
    expect(feats('')).toEqual([]);
    expect(window.__FisherLabCore.getCoreIdFeatures(null)).toEqual([]);
    expect(window.__FisherLabCore.getCoreIdFeatures({})).toEqual([]);
  });

  it('★ labels every anatomical chip on the anatomy key', () => {
    // A chip naming a PART the key does not show sends a student looking for
    // something the tool never taught them to find. Chips flagged onKey must
    // therefore appear as a label in the drawing; the rest are general
    // appearance — colour, body shape — which need no diagram to act on.
    const src = source();
    const from = src.indexOf('var FISH_FEATURE_RULES = [');
    const rulesSrc = src.slice(from, src.indexOf('\n  ];', from));
    const anatFrom = src.indexOf('function flFishAnatomySvg');
    const anat = src.slice(anatFrom, src.indexOf('function flCodHaddockSvg', anatFrom));
    const onKey = [...rulesSrc.matchAll(/label: '([^']+)', onKey: true/g)].map((m) => m[1]);
    expect(onKey.length).toBeGreaterThanOrEqual(6);
    onKey.forEach((label) => {
      // "dorsal fins" is labelled as first/second/third dorsal; match the noun.
      const noun = label.replace(/^chin |^\w+ (?=fin)/, '').replace(/ fins?$/, '');
      expect(anat.toLowerCase(), label).toContain(noun.toLowerCase());
    });
  });

  it('covers the shipped ID notes, and admits the one it cannot', () => {
    const rows = [...speciesTable().matchAll(/\{ id: '([^']+)'[\s\S]*?idMarks: '((?:[^'\\]|\\.)*)'/g)]
      .map((m) => ({ id: m[1], marks: m[2].replace(/\\'/g, "'") }));
    expect(rows.length).toBeGreaterThanOrEqual(20);
    const bare = rows.filter((r) => feats(r.marks).length === 0).map((r) => r.id);
    // Only juvenile pollock legitimately has no anatomical ID marks — it is
    // told apart by its SIZE and by where it holds, not by a body part. Any
    // other bare entry means the vocabulary has stopped covering the corpus.
    expect(bare).toEqual(['pollock-young']);
  });

  it('keeps the cod-versus-haddock figure in step with the shipped ID notes', () => {
    // ★ The figure asserts three diagnostics per fish. Every one has to be
    // something the species data actually says, or the drawing is teaching an
    // identification the rest of the tool does not support.
    const table = speciesTable();
    const cod = table.slice(table.indexOf("id: 'cod'"), table.indexOf("id: 'haddock'"));
    const had = table.slice(table.indexOf("id: 'haddock'"), table.indexOf("id: 'pollock'"));
    expect(cod).toMatch(/lateral line pale/i);
    expect(cod).toMatch(/curved upward over pectoral/i);
    expect(had).toMatch(/thumbprint/i);
    expect(had).toMatch(/dark lateral line/i);
    expect(had).toMatch(/pointed first dorsal/i);
    // Haddock's own note is written as a contrast with cod, which is why this
    // pair is the one worth drawing at all.
    // The apostrophe is backslash-escaped in the source literal.
    expect(had).toMatch(/cod\\?'s is pale/i);
  });

  it('labels the figure as schematic rather than passing it off as a portrait', () => {
    const src = source();
    const from = src.indexOf('function flFishAnatomySvg');
    const anat = src.slice(from, src.indexOf('function flCodHaddockSvg', from));
    expect(anat).toContain('Schematic');
    // And the caption has to admit what varies, or a reader counts three dorsal
    // fins on a striped bass and concludes the key is wrong.
    expect(anat).toMatch(/varies by family/);
  });
});

// ★ ONE DERIVATION OF CORRECTNESS FOR THE MARKS.
// The 3-D sim and the Buoyage tab must be showing the same mark. They were not:
// the sim drew a north cardinal with its two topmark cones SIDE BY SIDE (an
// IALA topmark is two cones one above the other) and a safe-water mark as a red
// sphere with one horizontal white band (safe water is read by its VERTICAL
// stripes). Both were drawn correctly two tabs away and wrong in the sim, which
// is the worst shape a teaching bug can take.
//
// The sim now resolves its marks through getCoreBuoyGlyph — the same function
// the tab draws from — so shape, band order and topmark come from one place.
describe('Fisher Lab sim buoys match the buoyage lesson', () => {
  const spec = (t) => window.__FisherLabCore.getCoreSimBuoySpec(t);

  it('resolves every mark the sim places', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const placed = [...src.matchAll(/addBuoy\([^,]+,\s*[^,]+,\s*'([^']+)'\)/g)].map((m) => m[1]);
    expect(placed.length).toBeGreaterThanOrEqual(6);
    [...new Set(placed)].forEach((t) => {
      expect(spec(t), 'sim places an unresolvable mark: ' + t).toBeTruthy();
    });
  });

  it('gives the north cardinal two STACKED up-cones, not a side-by-side pair', () => {
    const n = spec('cardinal-N');
    expect(n.topmark).toEqual(['up', 'up']);
    expect(n.bands).toEqual(['black', 'yellow']);   // black over yellow
    // The sim builds the topmark by walking spec.topmark and offsetting each
    // cone in Y. A regression to side-by-side would have to change x, and the
    // builder has no x term at all.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = src.indexOf('function addBuoy');
    const body = src.slice(from, src.indexOf('\n    }', src.indexOf('buoys.push(g)', from)));
    expect(body).toContain('spec.topmark');
    expect(body).not.toMatch(/position\.set\(\s*-?0\.1[0-9]\s*,/);   // the old side-by-side offsets
  });

  it('gives safe water vertical stripes, never horizontal bands', () => {
    const w = spec('safe-water');
    expect(w.striped).toBe(true);
    expect(w.bands).toEqual(['red', 'white']);
    expect(w.body).toBe('sphere');
  });

  it('keeps the lateral pair shape-coded, which is the accessibility argument', () => {
    // Red is always conical, green always cylindrical. The Buoyage tab closes
    // by saying a colourblind boater can navigate by shape alone; if the sim
    // did not honour that, the claim would be false inside the same tool.
    expect(spec('red-nun')).toMatchObject({ body: 'nun', bands: ['red'], striped: false });
    expect(spec('green-can')).toMatchObject({ body: 'can', bands: ['green'], striped: false });
  });

  it('returns nothing for a mark the buoyage table does not define', () => {
    expect(spec('purple-triangle')).toBeNull();
    expect(spec('')).toBeNull();
  });

  it('is literally the same resolver the tab draws from', () => {
    // Not "looks the same" — the same call. This is what makes the two
    // drawings incapable of drifting apart.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = src.indexOf('function getCoreSimBuoySpec');
    expect(src.slice(from, from + 500)).toContain('getCoreBuoyGlyph(');
  });
});

// ★ The opening frame of every voyage. The boat starts at the dock bow-out, so
// a chase camera 9.5 units astern of it sits inside the shoreline block — the
// first thing a student saw after pressing "Cast off" was a wall of green with
// the boat hidden behind it.
describe('Fisher Lab chase camera and the shoreline', () => {
  const rig = (o) => window.__FisherLabCore.getCoreCameraRig('chase', o);
  // Heading π is north-facing; the sim's start is z = 5.5 with the shore front
  // face at z = 11, so the un-clamped chase eye lands at z = 15, inside it.
  const AT_DOCK = { x: 0, y: 0, z: 5.5, heading: Math.PI, speed: 0 };
  const SHORE = 10;

  it('never puts the eye past the shoreline', () => {
    const r = rig({ ...AT_DOCK, shoreZ: SHORE });
    expect(r.eye[2]).toBeLessThanOrEqual(SHORE);
  });

  it('lifts the eye by as much as it was pushed in', () => {
    // Sliding the camera forward without raising it just puts the boat's own
    // transom in the lens. A real chase camera rises when it runs out of room.
    const free = rig(AT_DOCK);
    const clamped = rig({ ...AT_DOCK, shoreZ: SHORE });
    expect(free.eye[2]).toBeGreaterThan(SHORE);          // proves the case is real
    expect(clamped.eye[1]).toBeGreaterThan(free.eye[1]);
  });

  it('leaves the aim point alone, so the boat stays centred', () => {
    const free = rig(AT_DOCK);
    const clamped = rig({ ...AT_DOCK, shoreZ: SHORE });
    expect(clamped.target).toEqual(free.target);
  });

  it('does nothing once the boat is clear of the shore', () => {
    const offshore = { x: 0, y: 0, z: -60, heading: Math.PI, speed: 4 };
    const free = rig(offshore);
    const clamped = rig({ ...offshore, shoreZ: SHORE });
    expect(clamped.eye).toEqual(free.eye);
  });

  it('is a no-op when no shoreline is supplied', () => {
    // The rig stays pure and usable without scene knowledge.
    expect(rig(AT_DOCK).eye).toEqual(rig({ ...AT_DOCK, shoreZ: null }).eye);
  });

  it('leaves the overhead rigs alone, which already clear the land', () => {
    const core = window.__FisherLabCore;
    for (const view of ['topdown', 'chartup']) {
      const free = core.getCoreCameraRig(view, AT_DOCK);
      const withShore = core.getCoreCameraRig(view, { ...AT_DOCK, shoreZ: SHORE });
      expect(withShore.eye, view).toEqual(free.eye);
      expect(withShore.eye[1], view).toBeGreaterThan(20);
    }
  });

  it('derives the clamp from the same constant that builds the terrain', () => {
    // Not a magic number: LAND_FRONT_Z positions the seaward edge of the
    // coastal mesh AND sets the camera clamp, so moving the shore moves both.
    // (It used to read land.geometry.parameters.depth off a BoxGeometry; the
    // coastline is now a displaced mesh with no such parameters, and this test
    // is what caught that when the terrain was rebuilt.)
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toMatch(/var LAND_FRONT_Z = \d+/);
    expect(src).toContain('var shoreLineZ = LAND_FRONT_Z - 1;');
    expect(src).toContain('shoreZ: shoreLineZ');
    // The terrain must be built from it too, or the two could drift apart.
    expect(src).toContain('LAND_FRONT_Z + (iz / NZ)');
  });

  it('stands the trees on the terrain instead of at sea level', () => {
    // createTree used to hard-code y = 0, which left the coastal pines buried
    // to the waist in a hillside once the shore stopped being flat.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('function createTree(x, z, groundY)');
    expect(src).toContain('tree.position.set(x, groundY || 0, z)');
    expect(src).toContain('landHeightAt(mtx, mtz)');
    expect(src).toContain('islandHeightAt(dx, dz)');
  });
});
