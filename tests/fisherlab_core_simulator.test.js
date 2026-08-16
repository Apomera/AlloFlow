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
