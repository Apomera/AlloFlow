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

  it('builds each regional planning brief from established port, mission, and traffic data', () => {
    const { getCoreTrainingChartBrief } = window.__FisherLabCore;
    const expected = {
      maine: { portName: 'Portland Harbor', destination: 'Halfway Rock', targetFish: 'Atlantic cod', trapCatch: 'lobster', trafficVessel: 'Casco Bay ferry', waterContext: 'tidal coastal water', detailMode: 'portland-detail' },
      chesapeake: { portName: 'Annapolis', destination: 'Thomas Point grounds', targetFish: 'striped bass', trapCatch: 'blue crab', trafficVessel: 'sailing vessel', waterContext: 'tidal coastal water', detailMode: 'regional-schematic' },
      pnw: { portName: 'Anacortes', destination: 'Burrows Island grounds', targetFish: 'Chinook salmon', trapCatch: 'Dungeness crab', trafficVessel: 'channel ferry', waterContext: 'tidal coastal water', detailMode: 'regional-schematic' },
      greatlakes: { portName: 'Sault Ste. Marie', destination: 'Point Iroquois grounds', targetFish: 'lake trout', trapCatch: 'crayfish', trafficVessel: 'lake freighter', waterContext: 'non-tidal freshwater channel', detailMode: 'regional-schematic' }
    };

    Object.entries(expected).forEach(([region, facts]) => {
      const brief = getCoreTrainingChartBrief(region);
      expect(brief).toMatchObject({ region, ...facts, buoyage: 'IALA-B' });
      expect(brief.landmarks.length).toBeGreaterThan(2);
      expect(brief.authority).toBeTruthy();
    });
  });

  it('returns an isolated brief and safely falls back to the shipped Maine detail', () => {
    const { getCoreTrainingChartBrief } = window.__FisherLabCore;
    const first = getCoreTrainingChartBrief('chesapeake');
    first.landmarks.push('Invented waypoint');

    expect(getCoreTrainingChartBrief('chesapeake').landmarks).not.toContain('Invented waypoint');
    expect(getCoreTrainingChartBrief('unknown')).toMatchObject({ region: 'maine', portName: 'Portland Harbor', detailMode: 'portland-detail' });
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

describe('Fisher Lab section scope contract', () => {
  const scope = (tab, region) => window.__FisherLabCore.getCoreSectionScope(tab, region);

  it('classifies adapted, shared, and Maine-curriculum sections conservatively', () => {
    ['home', 'journal', 'sim', 'chart', 'species', 'regs'].forEach((tab) => {
      expect(scope(tab, 'chesapeake').scope).toBe('regional');
    });
    ['buoyage', 'colregs', 'vhf', 'knots'].forEach((tab) => {
      expect(scope(tab, 'greatlakes').scope).toBe('shared');
    });
    ['aqcond', 'weather', 'tides', 'quiz', 'regional', 'not-a-tab', '__proto__'].forEach((tab) => {
      expect(scope(tab, 'pnw').scope).toBe('maine-curriculum');
    });
  });

  it('returns truthful context for a persistent non-Maine banner', () => {
    expect(scope('sim', 'chesapeake')).toMatchObject({
      tabId: 'sim',
      region: 'chesapeake',
      regionLabel: 'Chesapeake Bay',
      authority: 'Maryland Department of Natural Resources',
      scope: 'regional',
      visible: true,
      title: 'Chesapeake Bay profile active'
    });
    expect(scope('sim', 'chesapeake').message).toContain('adapts');
    expect(scope('colregs', 'greatlakes').message).toContain('verify local requirements');
    expect(scope('weather', 'chesapeake').message).toContain('uses Maine curriculum examples');
    expect(scope('sim', 'toString')).toMatchObject({ region: 'maine', scope: 'regional', visible: false });
  });

  it('names the selected region gear action instead of always claiming lobster', () => {
    const { getCoreTrapActionLabel } = window.__FisherLabCore;

    expect(getCoreTrapActionLabel('maine')).toBe('Haul lobster trap');
    expect(getCoreTrapActionLabel('chesapeake')).toBe('Haul blue crab pot');
    expect(getCoreTrapActionLabel('pnw')).toBe('Haul Dungeness crab pot');
    expect(getCoreTrapActionLabel('greatlakes')).toBe('Inspect crayfish gear');
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

  it('canonicalizes hostile navigation numbers without hangs or non-finite output', () => {
    const {
      appendCoreRadarPlot,
      summarizeCoreRadarTrail,
      evaluateCoreCollisionRisk,
      evaluateCoreManeuver,
      getCoreManeuverWindow,
      getCoreRadarPlotPoint
    } = window.__FisherLabCore;
    const trail = appendCoreRadarPlot(
      [{ bearing: Number.POSITIVE_INFINITY, range: Number.POSITIVE_INFINITY }],
      725,
      1e308,
      Number.POSITIVE_INFINITY
    );

    expect(trail).toEqual([{ bearing: 0, range: 0 }, { bearing: 5, range: 1000 }]);
    const summary = summarizeCoreRadarTrail([
      { bearing: Number.POSITIVE_INFINITY, range: Number.POSITIVE_INFINITY },
      { bearing: Number.NEGATIVE_INFINITY, range: Number.NEGATIVE_INFINITY }
    ]);
    const risk = evaluateCoreCollisionRisk(
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY
    );
    const maneuver = evaluateCoreManeuver('give-way',
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY
    );
    const windowState = getCoreManeuverWindow(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    const plotPoint = getCoreRadarPlotPoint(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);

    expect(summary).toMatchObject({ bearingChange: 0, rangeChange: 0, trend: 'steady-range' });
    expect(risk).toMatchObject({ id: 'monitoring', bearingChange: 0, rangeChange: 0 });
    expect(maneuver).toMatchObject({ criterionOne: true, criterionTwo: false, complete: false });
    expect(windowState).toMatchObject({ duration: 20, elapsed: 0, remaining: 20, remainingPct: 100 });
    [summary, risk, maneuver, windowState, plotPoint].forEach((record) => {
      Object.values(record).filter((value) => typeof value === 'number').forEach((value) => {
        expect(Number.isFinite(value)).toBe(true);
      });
    });
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
      history = appendCoreCatchDecision(history, {
        kind: index % 2 ? 'shellfish' : 'finfish',
        speciesId: 'cod',
        label: 'Catch ' + index,
        length: index === 4 ? 'bad' : 10 + index,
        action: index % 2 ? 'release' : 'keep',
        correct: index !== 3,
        evidence: 'Evidence ' + index,
        ts: 1000 + index,
        practiceTargetSpeciesId: 'cod',
        practiceFocusSkill: 'transfer',
        correctionReviewedAt: 900
      });
    }

    expect(history).toHaveLength(4);
    expect(history[0]).toMatchObject({ label: 'Catch 1', kind: 'shellfish', action: 'release' });
    expect(history[2]).toMatchObject({ label: 'Catch 3', correct: false });
    expect(history[3]).toMatchObject({
      label: 'Catch 4',
      speciesId: 'cod',
      length: null,
      ts: 1004,
      practiceTargetSpeciesId: 'cod',
      practiceFocusSkill: 'transfer',
      correctionReviewedAt: 900
    });
  });
});

describe('Fisher Lab focused-practice transfer evidence', () => {
  const transferNote = (overrides = {}) => ({
    kind: 'finfish',
    speciesId: 'cod',
    correct: true,
    ts: 101,
    practiceTargetSpeciesId: 'cod',
    practiceFocusSkill: 'transfer',
    correctionReviewedAt: 100,
    ...overrides
  });

  it('requires a strictly newer correct target decision', () => {
    const { getCorePracticeTransferResult } = window.__FisherLabCore;

    expect(getCorePracticeTransferResult([])).toMatchObject({
      active: false,
      statusId: 'not-applicable',
      verified: false
    });
    expect(getCorePracticeTransferResult([
      transferNote({ speciesId: 'haddock', correct: true })
    ])).toMatchObject({
      active: true,
      statusId: 'bycatch',
      verified: false,
      targetAttempts: 0,
      bycatchAttempts: 1
    });
    expect(getCorePracticeTransferResult([
      transferNote({ ts: 100 })
    ])).toMatchObject({
      statusId: 'pending',
      verified: false,
      targetAttempts: 0
    });
    expect(getCorePracticeTransferResult([
      transferNote({ correct: false })
    ])).toMatchObject({
      statusId: 'review',
      verified: false,
      targetAttempts: 1
    });
    expect(getCorePracticeTransferResult([
      transferNote({ correct: true })
    ])).toMatchObject({
      statusId: 'verified',
      verified: true,
      targetAttempts: 1
    });
  });

  it('scopes evidence to the latest saved-correction plan tuple', () => {
    const { getCorePracticeTransferResult } = window.__FisherLabCore;
    const result = getCorePracticeTransferResult([
      transferNote({ correctionReviewedAt: 100, ts: 110, speciesId: 'cod', correct: true }),
      transferNote({ correctionReviewedAt: 200, ts: 210, speciesId: 'haddock', correct: true })
    ]);

    expect(result).toMatchObject({
      statusId: 'bycatch',
      verified: false,
      correctionReviewedAt: 200,
      targetAttempts: 0,
      bycatchAttempts: 1
    });
  });
  it('leaves prior evidence unchanged when the incoming plan tuple is incomplete', () => {
    const { reduceCorePracticeTransferEvidence } = window.__FisherLabCore;
    const prior = reduceCorePracticeTransferEvidence(undefined, transferNote({ ts: 110 }));

    [
      {},
      transferNote({ practiceTargetSpeciesId: '', ts: 111 }),
      transferNote({ practiceFocusSkill: 'identification', ts: 111 }),
      transferNote({ correctionReviewedAt: 0, ts: 111 })
    ].forEach((note) => {
      expect(reduceCorePracticeTransferEvidence(prior, note)).toBe(prior);
    });
  });

  it('ignores equal or older attempts and lets the latest newer target attempt decide the outcome', () => {
    const { reduceCorePracticeTransferEvidence } = window.__FisherLabCore;
    const verified = reduceCorePracticeTransferEvidence(undefined, transferNote({ ts: 110, correct: true }));

    expect(reduceCorePracticeTransferEvidence(verified, transferNote({ ts: 110, correct: false }))).toBe(verified);
    expect(reduceCorePracticeTransferEvidence(verified, transferNote({ ts: 109, correct: false }))).toBe(verified);

    const review = reduceCorePracticeTransferEvidence(verified, transferNote({ ts: 111, correct: false }));
    expect(review).toMatchObject({
      statusId: 'review',
      verified: false,
      targetAttempts: 2,
      latestAttemptTs: 111,
      latestTargetAttemptTs: 111
    });

    expect(reduceCorePracticeTransferEvidence(review, transferNote({ ts: 112, correct: true }))).toMatchObject({
      statusId: 'verified',
      verified: true,
      targetAttempts: 3,
      latestAttemptTs: 112,
      latestTargetAttemptTs: 112
    });
  });

  it('resets stale verification for a newer plan while preserving a same-plan target outcome through bycatch', () => {
    const { reduceCorePracticeTransferEvidence } = window.__FisherLabCore;
    const verified = reduceCorePracticeTransferEvidence(undefined, transferNote({ ts: 110, correct: true }));
    const afterBycatch = reduceCorePracticeTransferEvidence(verified, transferNote({
      speciesId: 'haddock',
      ts: 111
    }));

    expect(afterBycatch).toMatchObject({
      statusId: 'verified',
      verified: true,
      targetAttempts: 1,
      bycatchAttempts: 1,
      latestAttemptTs: 111,
      latestTargetAttemptTs: 110
    });

    expect(reduceCorePracticeTransferEvidence(afterBycatch, transferNote({
      practiceTargetSpeciesId: 'haddock',
      correctionReviewedAt: 200,
      speciesId: 'cod',
      ts: 201
    }))).toMatchObject({
      statusId: 'bycatch',
      verified: false,
      targetSpeciesId: 'haddock',
      correctionReviewedAt: 200,
      targetAttempts: 0,
      bycatchAttempts: 1,
      latestAttemptTs: 201,
      latestTargetAttemptTs: 0
    });
  });

  it('retains verified transfer evidence after the four-note debrief history drops the target attempt', () => {
    const {
      appendCoreCatchDecision,
      getCorePracticeTransferResult,
      reduceCorePracticeTransferEvidence
    } = window.__FisherLabCore;
    let history = [];
    let transferEvidence = getCorePracticeTransferResult([]);
    const append = (entry) => {
      history = appendCoreCatchDecision(history, entry);
      transferEvidence = reduceCorePracticeTransferEvidence(transferEvidence, history[history.length - 1]);
    };

    append(transferNote({ label: 'Verified target', ts: 110, correct: true }));
    for (let index = 0; index < 5; index += 1) {
      append({
        kind: 'finfish',
        speciesId: 'haddock',
        label: 'Unrelated catch ' + index,
        correct: index % 2 === 0,
        ts: 200 + index
      });
    }

    expect(history).toHaveLength(4);
    expect(history.some((note) => note.label === 'Verified target')).toBe(false);
    expect(getCorePracticeTransferResult(history).verified).toBe(false);
    expect(transferEvidence).toMatchObject({
      statusId: 'verified',
      verified: true,
      targetSpeciesId: 'cod',
      targetAttempts: 1,
      bycatchAttempts: 0,
      latestTargetAttemptTs: 110
    });
  });

  it('wires the persistent transfer accumulator through catch updates, HUD, debrief, and replay reset', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

    expect(source).toContain('practiceTransferEvidence: getCorePracticeTransferResult([])');
    expect(source).toContain('boatState.practiceTransferEvidence = reduceCorePracticeTransferEvidence(boatState.practiceTransferEvidence, boatState.catchDecisionHistory[boatState.catchDecisionHistory.length - 1]);');
    expect(source).toContain('practiceTransferEvidence: Object.assign({}, boatState.practiceTransferEvidence)');
    expect(source).toContain("var practiceTransferResult = hud.practiceTransferEvidence && typeof hud.practiceTransferEvidence === 'object' ? hud.practiceTransferEvidence : getCorePracticeTransferResult(catchDecisionHistory);");
    expect(source).toContain('boatState.practiceTransferEvidence = getCorePracticeTransferResult([]);');
  });

});

describe('Fisher Lab simulator modal focus containment', () => {
  it('filters unavailable controls and wraps Tab in both directions', () => {
    const { getCoreDialogFocusables, containCoreDialogFocus } = window.__FisherLabCore;
    const dialog = document.createElement('section');
    dialog.tabIndex = -1;
    dialog.innerHTML = `
      <button id="first">First</button>
      <button disabled>Disabled</button>
      <span hidden><button>Hidden</button></span>
      <button id="last">Last</button>
    `;
    document.body.appendChild(dialog);
    const first = dialog.querySelector('#first');
    const last = dialog.querySelector('#last');

    expect(getCoreDialogFocusables(dialog)).toEqual([first, last]);

    last.focus();
    const forward = {
      key: 'Tab',
      shiftKey: false,
      currentTarget: dialog,
      preventDefault() { this.defaultPrevented = true; }
    };
    expect(containCoreDialogFocus(forward)).toBe(true);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);

    first.focus();
    const backward = {
      key: 'Tab',
      shiftKey: true,
      currentTarget: dialog,
      preventDefault() { this.defaultPrevented = true; }
    };
    expect(containCoreDialogFocus(backward)).toBe(true);
    expect(document.activeElement).toBe(last);
    dialog.remove();
  });

  it('recovers focus entering from outside and ignores non-Tab keys', () => {
    const { containCoreDialogFocus } = window.__FisherLabCore;
    const outside = document.createElement('button');
    const dialog = document.createElement('section');
    dialog.tabIndex = -1;
    dialog.innerHTML = '<button id="first">First</button><button>Last</button>';
    document.body.append(outside, dialog);
    outside.focus();

    const event = {
      key: 'Tab',
      shiftKey: false,
      currentTarget: dialog,
      preventDefault() { this.defaultPrevented = true; }
    };
    expect(containCoreDialogFocus(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector('#first'));
    expect(containCoreDialogFocus({ key: 'Enter', currentTarget: dialog })).toBe(false);
    outside.remove();
    dialog.remove();
  });
});

describe('Fisher Lab simulator toolbar sizing', () => {
  it('publishes a safe rounded HUD offset', () => {
    const { publishCoreToolbarHeight } = window.__FisherLabCore;
    const stage = document.createElement('div');
    const bar = { getBoundingClientRect: () => ({ height: 73.6 }) };

    expect(publishCoreToolbarHeight(bar, stage)).toBe(74);
    expect(stage.style.getPropertyValue('--fl-bar-h')).toBe('74px');
    expect(publishCoreToolbarHeight({ getBoundingClientRect: () => ({ height: -12 }) }, stage)).toBe(0);
    expect(stage.style.getPropertyValue('--fl-bar-h')).toBe('0px');
    expect(publishCoreToolbarHeight(null, stage)).toBe(0);
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

describe('Fisher Lab renderer resource teardown', () => {
  it('disposes shared scene resources exactly once across meshes, uniforms, and detached extras', () => {
    const { disposeCoreThreeResources } = window.__FisherLabCore;
    const calls = { geometry: 0, materialA: 0, materialB: 0, texture: 0, extra: 0 };
    const texture = {
      isTexture: true,
      dispose() { calls.texture += 1; }
    };
    const geometry = {
      isBufferGeometry: true,
      dispose() { calls.geometry += 1; }
    };
    const materialA = {
      isMaterial: true,
      map: texture,
      normalMap: texture,
      dispose() { calls.materialA += 1; }
    };
    const materialB = {
      isMaterial: true,
      uniforms: {
        surface: { value: texture },
        layers: { value: [texture, texture] }
      },
      dispose() { calls.materialB += 1; }
    };
    const childA = { geometry, material: [materialA, materialB] };
    const childB = { geometry, material: materialA };
    const scene = {
      background: texture,
      environment: texture,
      traverse(visitor) {
        visitor(this);
        visitor(childA);
        visitor(childB);
      }
    };
    const detached = {
      dispose() { calls.extra += 1; }
    };

    const stats = disposeCoreThreeResources(
      scene,
      [geometry, materialA, texture, detached, detached]
    );

    expect(calls).toEqual({ geometry: 1, materialA: 1, materialB: 1, texture: 1, extra: 1 });
    expect(stats).toEqual({ geometries: 1, materials: 2, textures: 1, extras: 1, errors: 0 });
  });

  it('releases composer passes and fallback render targets without double disposal', () => {
    const { disposeCoreComposerResources } = window.__FisherLabCore;
    const calls = { passA: 0, passB: 0, copy: 0, target: 0, modern: 0, privateCopy: 0 };

    const passA = { dispose() { calls.passA += 1; } };
    const passB = { dispose() { calls.passB += 1; } };
    const copyPass = { dispose() { calls.copy += 1; } };
    const target = { dispose() { calls.target += 1; } };
    const legacyStats = disposeCoreComposerResources({
      passes: [passA, passA, passB],
      copyPass,
      renderTarget1: target,
      renderTarget2: target
    });

    expect(calls).toMatchObject({ passA: 1, passB: 1, copy: 1, target: 1 });
    expect(legacyStats).toEqual({ passes: 3, targets: 1, composer: 0, errors: 0 });

    const privateCopyPass = { dispose() { calls.privateCopy += 1; } };
    const modernStats = disposeCoreComposerResources({
      passes: [],
      copyPass: privateCopyPass,
      dispose() { calls.modern += 1; }
    });

    expect(calls.modern).toBe(1);
    expect(calls.privateCopy).toBe(0);
    expect(modernStats).toEqual({ passes: 0, targets: 0, composer: 1, errors: 0 });

    let recoveredTargets = 0;
    const failedStats = disposeCoreComposerResources({
      passes: [],
      copyPass: { dispose() { calls.copy += 1; } },
      renderTarget1: { dispose() { recoveredTargets += 1; } },
      renderTarget2: { dispose() { recoveredTargets += 1; } },
      dispose() { throw new Error('partial composer teardown'); }
    });

    expect(recoveredTargets).toBe(2);
    expect(failedStats).toEqual({ passes: 1, targets: 2, composer: 0, errors: 1 });
  });

  it('runs the shipped engine teardown only once and returns stable disposal diagnostics', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const resizeStart = source.indexOf('    function onResize()');
    const apiStart = source.indexOf('    return {', resizeStart);
    const boatStateStart = source.indexOf('      getBoatState:', apiStart);
    const listenerStubs = 'var onWebGLContextLost = function() {}; var onWebGLContextRestored = function() {}; var onKeyDown = function() {}; var onKeyUp = function() {}; var onWindowBlur = function() {}; var onActivityReturn = function() {}; var onResize = function() {}; var onVisibilityChange = function() {}; var onPageHide = function() {}; ';
    const apiSource = listenerStubs + source.slice(apiStart, boatStateStart) + '    };';
    const calls = {
      release: 0,
      cancelled: 0,
      canvasListeners: 0,
      windowListeners: 0,
      documentListeners: 0,
      ambient: 0,
      composer: 0,
      geometry: 0,
      material: 0,
      texture: 0,
      clear: 0,
      animationLoop: 0,
      renderLists: 0,
      renderer: 0,
      context: 0,
      audio: 0
    };

    expect(resizeStart).toBeGreaterThan(-1);
    expect(apiStart).toBeGreaterThan(resizeStart);
    expect(boatStateStart).toBeGreaterThan(apiStart);

    const texture = { isTexture: true, dispose() { calls.texture += 1; } };
    const geometry = { isBufferGeometry: true, dispose() { calls.geometry += 1; } };
    const material = { isMaterial: true, map: texture, dispose() { calls.material += 1; } };
    const mesh = { geometry, material };
    const scene = {
      background: texture,
      traverse(visitor) {
        visitor(this);
        visitor(mesh);
      },
      clear() { calls.clear += 1; }
    };
    const renderer = {
      _alloComposer: { passes: [], dispose() { calls.composer += 1; } },
      setAnimationLoop(value) {
        expect(value).toBeNull();
        calls.animationLoop += 1;
      },
      renderLists: { dispose() { calls.renderLists += 1; } },
      dispose() { calls.renderer += 1; },
      forceContextLoss() { calls.context += 1; }
    };
    const engine = new Function(
      'alive',
      'disposalStats',
      'contextLost',
      'graphicsFailureReason',
      'releaseHeldControls',
      'raf',
      'cancelAnimationFrame',
      'canvas',
      'window',
      'document',
      'AF',
      'renderer',
      'disposeCoreComposerResources',
      'disposeCoreThreeResources',
      'scene',
      'buoyDisposables',
      'disposeAudioSynth',
      apiSource
    )(
      true,
      null,
      true,
      'render-error',
      () => { calls.release += 1; },
      71,
      (id) => { expect(id).toBe(71); calls.cancelled += 1; },
      { removeEventListener() { calls.canvasListeners += 1; } },
      { removeEventListener() { calls.windowListeners += 1; } },
      { removeEventListener() { calls.documentListeners += 1; } },
      { dispose() { calls.ambient += 1; return { resources: 'released' }; } },
      renderer,
      window.__FisherLabCore.disposeCoreComposerResources,
      window.__FisherLabCore.disposeCoreThreeResources,
      scene,
      [geometry, material, texture],
      () => { calls.audio += 1; return true; }
    );

    const first = engine.dispose();
    const second = engine.dispose();

    expect(second).toBe(first);
    expect(engine.getDisposalStats()).toBe(first);
    expect(first).toMatchObject({
      geometries: 1,
      materials: 1,
      textures: 1,
      extras: 0,
      errors: 0,
      audio: true,
      renderer: { renderLists: true, renderer: true, context: true },
      composer: { passes: 0, targets: 0, composer: 1, errors: 0 }
    });
    expect(calls).toEqual({
      release: 1,
      cancelled: 1,
      canvasListeners: 2,
      windowListeners: 7,
      documentListeners: 1,
      ambient: 1,
      composer: 1,
      geometry: 1,
      material: 1,
      texture: 1,
      clear: 1,
      animationLoop: 1,
      renderLists: 1,
      renderer: 1,
      context: 1,
      audio: 1
    });
  });

  it('makes asynchronous effects, audio, and engine teardown idempotent', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const ambientDisposeAt = source.indexOf('        AF.dispose = function () {');
    const ambientLoaderAt = source.indexOf('          var ensure = function (cb) {', ambientDisposeAt);

    expect(ambientDisposeAt).toBeGreaterThan(-1);
    expect(ambientLoaderAt).toBeGreaterThan(ambientDisposeAt);
    expect(source).toContain('try { AF.dispose(); } catch (_) {}');
    expect(source).toContain('var effectsDisposed = false;');
    expect(source).toContain('var ambientScripts = [];');
    expect(source).toContain('if (effectsDisposed) return;');
    expect(source).toContain('if (effectsDisposed) return ambientDisposeStats;');
    expect(source).toContain('disposeCoreComposerResources(activeComposer);');
    expect(source).toContain('disposeCoreComposerResources(failedComposer);');
    expect(source).toContain('disposeAudioSynth();');
    expect(source).toContain('if (!alive) return disposalStats;');
    expect(source).toContain('disposalStats = disposeCoreThreeResources(scene, buoyDisposables);');
    expect(source).toContain('if (renderer.renderLists && renderer.renderLists.dispose)');
    expect(source).toContain('renderer.forceContextLoss();');
    expect(source).toContain('disposalStats.audio = disposeAudioSynth();');
    expect(source).toContain('getDisposalStats: function() { return disposalStats; }');
    expect(source).not.toContain('buoyDisposables.forEach(function(d)');
  });
});

describe('Fisher Lab simulator safeguards', () => {
  it('releases held keyboard commands when the window loses focus', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const keyboardStart = source.indexOf('    var keys = Object.create(null);');
    const keyboardEnd = source.indexOf('    var cameraTarget', keyboardStart);

    expect(keyboardStart).toBeGreaterThan(-1);
    expect(keyboardEnd).toBeGreaterThan(keyboardStart);

    const listeners = {};
    const inactivityReasons = [];
    const canvas = {};
    const harness = new Function(
      'window',
      'document',
      'canvas',
      'boatState',
      'shouldIgnoreCoreRepeatedKey',
      'pauseForInactivity',
      source.slice(keyboardStart, keyboardEnd) + '\nreturn { getKeys: function() { return keys; } };'
    )(
      { addEventListener(type, listener) { listeners[type] = listener; } },
      { activeElement: canvas },
      canvas,
      { paused: false },
      () => false,
      (reason) => inactivityReasons.push(reason)
    );

    listeners.keydown({ key: 'w', repeat: false, preventDefault() {} });
    expect(harness.getKeys().w).toBe(true);

    listeners.blur();
    expect(inactivityReasons).toEqual(['window-blur']);
    expect(Object.keys(harness.getKeys())).toEqual([]);
    expect(Object.getPrototypeOf(harness.getKeys())).toBeNull();
  });

  it('rejects stale or unmounted asynchronous simulator launch completions', () => {
    const { isCoreSimulatorLaunchCurrent } = window.__FisherLabCore;

    expect(isCoreSimulatorLaunchCurrent).toBeTypeOf('function');
    expect(isCoreSimulatorLaunchCurrent(4, 4, true)).toBe(true);
    expect(isCoreSimulatorLaunchCurrent(4, 3, true)).toBe(false);
    expect(isCoreSimulatorLaunchCurrent(4, 4, false)).toBe(false);
    expect(isCoreSimulatorLaunchCurrent('4', 4, true)).toBe(false);

    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const launchStart = source.indexOf('    function clearSimulatorRetryTimer()');
    const launchBlock = source.slice(launchStart, source.indexOf('    function startSim()', launchStart));
    const stopStart = source.indexOf('    function stopSim()');
    const stopBlock = source.slice(stopStart, source.indexOf('    var activeSimRegionRef', stopStart));
    const cleanupStart = source.indexOf('    useEffect(function() {\n      simLifecycleMountedRef.current = true;');
    const cleanupBlock = source.slice(cleanupStart, source.indexOf('    var cardStyle', cleanupStart));
    const retryStart = source.indexOf('                var retryCheckpoint = pendingCheckpointRef.current');
    const retryBlock = source.slice(retryStart, source.indexOf('              },', retryStart));

    expect(launchStart).toBeGreaterThan(-1);
    expect((launchBlock.match(/isCurrentSimulatorLaunch\(launchGeneration\)/g) || [])).toHaveLength(2);
    expect(launchBlock).toContain('if (!simLifecycleMountedRef.current) return;');
    expect(launchBlock).toContain('clearSimulatorRetryTimer();');
    expect(stopBlock).toContain('var stopGeneration = invalidateSimulatorLaunch();');
    expect(stopBlock).toContain('if (!isCurrentSimulatorLaunch(stopGeneration)) return;');
    expect(cleanupBlock).toContain('simLifecycleMountedRef.current = false;');
    expect(cleanupBlock).toContain('invalidateSimulatorLaunch();');
    expect(retryBlock).toContain('simRetryTimerRef.current = setTimeout(function()');
    expect(retryBlock).toContain('if (!isCurrentSimulatorLaunch(retryGeneration)) return;');
  });

  it('pauses, checkpoints, and restarts the frame loop across WebGL context recovery', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const lifecycleStart = source.indexOf('    var t0 = performance.now();');
    const lifecycleEnd = source.indexOf('    function tick()', lifecycleStart);

    expect(lifecycleStart).toBeGreaterThan(-1);
    expect(lifecycleEnd).toBeGreaterThan(lifecycleStart);

    function createHarness(checkpoint, rendererOverride) {
      const listeners = {};
      const calls = { checkpoints: [], pauses: [], cancelled: [], requested: [], statuses: [], announcements: [], graphics: [], errors: [], resize: 0 };
      const canvas = {
        addEventListener(type, listener) { listeners[type] = listener; }
      };
      const harness = new Function(
        'canvas',
        'performance',
        'emitVoyageCheckpoint',
        'setPaused',
        'cancelAnimationFrame',
        'requestAnimationFrame',
        'statusCb',
        'flAnnounce',
        'opts',
        'renderer',
        'scene',
        'camera',
        'console',
        'disposeCoreComposerResources',
        'onResize',
        source.slice(lifecycleStart, lifecycleEnd) + '\nfunction tick() {}\nreturn { getContextLost: function() { return contextLost; }, getRaf: function() { return raf; }, setRaf: function(value) { raf = value; }, renderFrame: renderFrame };'
      )(
        canvas,
        { now: () => 4200 },
        (reason, force) => { calls.checkpoints.push([reason, force]); return checkpoint; },
        (paused, announce) => { calls.pauses.push([paused, announce]); return true; },
        (id) => calls.cancelled.push(id),
        (callback) => { calls.requested.push(callback); return 91; },
        (payload) => calls.statuses.push(payload.text),
        (message) => calls.announcements.push(message),
        { onGraphicsContextChange: (lost, reason) => calls.graphics.push([lost, reason]) },
        rendererOverride || {},
        {},
        {},
        { error: (...args) => calls.errors.push(args) },
        window.__FisherLabCore.disposeCoreComposerResources,
        () => { calls.resize += 1; }
      );
      return { listeners, calls, harness };
    }

    const recovered = createHarness({ savedAt: 4200 });
    recovered.harness.setRaf(17);
    let prevented = 0;
    recovered.listeners.webglcontextlost({ preventDefault() { prevented += 1; } });

    expect(prevented).toBe(1);
    expect(recovered.harness.getContextLost()).toBe(true);
    expect(recovered.harness.getRaf()).toBeNull();
    expect(recovered.calls.checkpoints).toEqual([['webgl-context-lost', true]]);
    expect(recovered.calls.pauses).toEqual([[true, false]]);
    expect(recovered.calls.cancelled).toEqual([17]);
    expect(recovered.calls.graphics).toEqual([[true, 'context-lost']]);
    expect(recovered.calls.statuses.at(-1)).toContain('safe recovery point');

    recovered.listeners.webglcontextlost({ preventDefault() { prevented += 1; } });
    expect(prevented).toBe(2);
    expect(recovered.calls.checkpoints).toHaveLength(1);

    recovered.listeners.webglcontextrestored();
    expect(recovered.harness.getContextLost()).toBe(false);
    expect(recovered.harness.getRaf()).toBe(91);
    expect(recovered.calls.pauses).toEqual([[true, false], [true, false]]);
    expect(recovered.calls.graphics).toEqual([[true, 'context-lost'], [false, null]]);
    expect(recovered.calls.resize).toBe(1);
    expect(recovered.calls.requested).toHaveLength(1);
    expect(recovered.calls.statuses.at(-1)).toContain('remains paused');

    recovered.listeners.webglcontextrestored();
    expect(recovered.calls.requested).toHaveLength(1);

    const unresolvedInteraction = createHarness(null);
    unresolvedInteraction.listeners.webglcontextlost({ preventDefault() {} });
    expect(unresolvedInteraction.calls.statuses.at(-1)).toContain('prior safe checkpoint remains unchanged');

    let plainFrames = 0;
    let composerDisposals = 0;
    const composerFallbackRenderer = {
      _alloBloomDark: true,
      _alloComposer: {
        render() { throw new Error('optional composer failed'); },
        dispose() { composerDisposals += 1; }
      },
      render() { plainFrames += 1; }
    };
    const composerFallback = createHarness({ savedAt: 4200 }, composerFallbackRenderer);
    expect(composerFallback.harness.renderFrame()).toBe(true);
    expect(composerFallbackRenderer._alloComposer).toBeNull();
    expect(composerDisposals).toBe(1);
    expect(plainFrames).toBe(1);
    expect(composerFallback.calls.checkpoints).toEqual([]);

    const fatalRenderError = new Error('plain WebGL render failed');
    const renderFailure = createHarness({ savedAt: 4200 }, {
      _alloBloomDark: false,
      _alloComposer: null,
      render() { throw fatalRenderError; }
    });
    renderFailure.harness.setRaf(23);
    expect(renderFailure.harness.renderFrame()).toBe(false);
    expect(renderFailure.harness.getContextLost()).toBe(true);
    expect(renderFailure.calls.checkpoints).toEqual([['graphics-render-error', true]]);
    expect(renderFailure.calls.pauses).toEqual([[true, false]]);
    expect(renderFailure.calls.cancelled).toEqual([23]);
    expect(renderFailure.calls.graphics).toEqual([[true, 'render-error']]);
    expect(renderFailure.calls.statuses.at(-1)).toContain('rendering stopped unexpectedly');
    expect(renderFailure.calls.errors[0][1]).toBe(fatalRenderError);
    expect(renderFailure.harness.renderFrame()).toBe(false);
    expect(renderFailure.calls.checkpoints).toHaveLength(1);

    expect(source).toContain("canvas.removeEventListener('webglcontextlost', onWebGLContextLost, false)");
    expect(source).toContain("canvas.removeEventListener('webglcontextrestored', onWebGLContextRestored, false)");
    expect(source).toContain('if (alive && !contextLost && raf === null && (force || !boatState.paused)) raf = requestAnimationFrame(tick);');
    expect(source.match(/if \(!renderFrame\(\)\) return;/g)).toHaveLength(2);
  });

  it('idles paused rendering and wakes only for resume or a forced paint', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const pauseStart = source.indexOf('    function setPaused(paused, announce)');
    const pauseEnd = source.indexOf('    var pausedForInactivity', pauseStart);
    const schedulerStart = source.indexOf('    function scheduleNextFrame(force)');
    const schedulerEnd = source.indexOf("    canvas.addEventListener('webglcontextlost'", schedulerStart);
    const tickStart = source.indexOf('    function tick()');
    const activeTickStart = source.indexOf('      elapsed += dt;', tickStart);
    const boatState = { paused: false, throttle: 0.7 };
    const calls = { cancelled: [], scheduled: [], releases: 0, hud: 0 };
    let now = 1000;

    expect(pauseStart).toBeGreaterThan(-1);
    expect(pauseEnd).toBeGreaterThan(pauseStart);
    expect(schedulerStart).toBeGreaterThan(pauseEnd);
    expect(schedulerEnd).toBeGreaterThan(schedulerStart);
    expect(activeTickStart).toBeGreaterThan(tickStart);

    const pauseHarness = new Function(
      'boatState',
      'releaseHeldControls',
      'statusCb',
      'flAnnounce',
      'publishHudPatch',
      'emitVoyageCheckpoint',
      'cancelAnimationFrame',
      'performance',
      'scheduleNextFrame',
      'var contextLost = false; var raf = 41; var lastT = 100;\n' +
        source.slice(pauseStart, pauseEnd) +
        '\nreturn { setPaused, getRaf: function() { return raf; }, getLastT: function() { return lastT; } };'
    )(
      boatState,
      () => { calls.releases += 1; },
      () => {},
      () => {},
      () => { calls.hud += 1; },
      () => {},
      (id) => calls.cancelled.push(id),
      { now: () => now },
      (force) => calls.scheduled.push(force)
    );

    expect(pauseHarness.setPaused(true, false)).toBe(true);
    expect(boatState).toEqual({ paused: true, throttle: 0 });
    expect(calls.cancelled).toEqual([41]);
    expect(calls.scheduled).toEqual([]);
    expect(pauseHarness.getRaf()).toBeNull();
    expect(pauseHarness.getLastT()).toBe(100);

    now = 7250;
    expect(pauseHarness.setPaused(false, false)).toBe(true);
    expect(boatState.paused).toBe(false);
    expect(pauseHarness.getLastT()).toBe(7250);
    expect(calls.scheduled).toEqual([false]);
    expect(calls.releases).toBe(2);
    expect(calls.hud).toBe(2);

    const requests = [];
    const schedulerBoatState = { paused: true };
    const schedulerHarness = new Function(
      'boatState',
      'requestAnimationFrame',
      'tick',
      'var alive = true; var contextLost = false; var raf = null;\n' +
        source.slice(schedulerStart, schedulerEnd) +
        '\nreturn {' +
        ' schedule: scheduleNextFrame,' +
        ' getRaf: function() { return raf; },' +
        ' clear: function() { raf = null; },' +
        ' setAlive: function(value) { alive = value; },' +
        ' setContextLost: function(value) { contextLost = value; }' +
        '};'
    )(
      schedulerBoatState,
      (callback) => {
        requests.push(callback);
        return 80 + requests.length;
      },
      function heldTick() {}
    );

    schedulerHarness.schedule(false);
    expect(requests).toHaveLength(0);
    schedulerHarness.schedule(true);
    expect(requests).toHaveLength(1);
    expect(schedulerHarness.getRaf()).toBe(81);
    schedulerHarness.schedule(true);
    expect(requests).toHaveLength(1);

    schedulerHarness.clear();
    schedulerBoatState.paused = false;
    schedulerHarness.schedule(false);
    expect(requests).toHaveLength(2);
    schedulerHarness.clear();
    schedulerHarness.setContextLost(true);
    schedulerHarness.schedule(true);
    expect(requests).toHaveLength(2);
    schedulerHarness.setContextLost(false);
    schedulerHarness.setAlive(false);
    schedulerHarness.schedule(true);
    expect(requests).toHaveLength(2);

    let heldRenders = 0;
    let heldSchedules = 0;
    const heldTickHarness = new Function(
      'performance',
      'boatState',
      'renderFrame',
      'scheduleNextFrame',
      'var raf = 73; var alive = true; var contextLost = false; var lastT = 1000;\n' +
        source.slice(tickStart, activeTickStart) +
        '    }\nreturn { tick, getRaf: function() { return raf; } };'
    )(
      { now: () => 1050 },
      { paused: true },
      () => { heldRenders += 1; return true; },
      () => { heldSchedules += 1; }
    );

    heldTickHarness.tick();
    expect(heldTickHarness.getRaf()).toBeNull();
    expect(heldRenders).toBe(1);
    expect(heldSchedules).toBe(0);
    expect(source).toContain('scheduleNextFrame(true);');
  });

  it('repaints paused scene controls once while preserving active camera easing', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const controlsStart = source.indexOf('    function repaintHeldScene(patch, refreshCamera)');
    const controlsEnd = source.indexOf('    function createCurrentVoyageCheckpoint()', controlsStart);
    const boatState = { paused: true, timeOfDay: 'day', weather: 'clear', cameraView: 'chase' };
    const calls = { hud: [], cameras: [], frames: [], environments: [] };

    expect(controlsStart).toBeGreaterThan(-1);
    expect(controlsEnd).toBeGreaterThan(controlsStart);

    const controls = new Function(
      'boatState',
      'publishHudPatch',
      'applyCameraRig',
      'scheduleNextFrame',
      'updateEnvironment',
      'CAMERA_VIEW_IDS',
      source.slice(controlsStart, controlsEnd) +
        '\nreturn { setCoreTimeOfDay, setCoreCameraView, setCoreWeather, repaintHeldScene };'
    )(
      boatState,
      (patch) => calls.hud.push(patch),
      (immediate) => calls.cameras.push(immediate),
      (force) => calls.frames.push(force),
      (timeOfDay, weather) => calls.environments.push([timeOfDay, weather]),
      ['chase', 'helm', 'overhead', 'map']
    );

    expect(controls.setCoreTimeOfDay('night')).toBe('night');
    expect(boatState.timeOfDay).toBe('night');
    expect(calls.environments.at(-1)).toEqual(['night', 'clear']);
    expect(calls.hud.at(-1)).toEqual({ timeOfDay: 'night' });
    expect(calls.frames.at(-1)).toBe(true);

    expect(controls.setCoreWeather('rainy')).toBe('rainy');
    expect(boatState.weather).toBe('rainy');
    expect(calls.environments.at(-1)).toEqual(['night', 'rainy']);
    expect(calls.hud.at(-1)).toEqual({ weather: 'rainy' });

    expect(controls.setCoreCameraView('helm')).toBe('helm');
    expect(boatState.cameraView).toBe('helm');
    expect(calls.cameras).toEqual([true]);
    expect(calls.hud.at(-1)).toEqual({ cameraView: 'helm' });

    expect(controls.setCoreCameraView('unknown-view')).toBe('chase');
    expect(boatState.cameraView).toBe('chase');
    expect(calls.cameras).toEqual([true, true]);
    expect(calls.frames).toEqual([true, true, true, true]);

    boatState.paused = false;
    const heldCounts = {
      hud: calls.hud.length,
      cameras: calls.cameras.length,
      frames: calls.frames.length
    };
    expect(controls.setCoreCameraView('overhead')).toBe('overhead');
    expect(boatState.cameraView).toBe('overhead');
    expect(calls.hud).toHaveLength(heldCounts.hud);
    expect(calls.cameras).toHaveLength(heldCounts.cameras);
    expect(calls.frames).toHaveLength(heldCounts.frames);
    expect(controls.repaintHeldScene({ weather: 'foggy' }, false)).toBe(false);

    expect(source).toContain('var cameraView = applyCameraRig(false);');
    expect(source).toContain('if (refreshCamera) applyCameraRig(true);');
    expect(source).toContain('return setCoreTimeOfDay(tod);');
    expect(source).toContain('return setCoreCameraView(view);');
    expect(source).toContain('return setCoreWeather(w);');
  });

  it('pauses, checkpoints, and requires explicit resume across every inactivity boundary', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const lifecycleStart = source.indexOf('    var pausedForInactivity = false;');
    const lifecycleEnd = source.indexOf('    function soundFogSignal()', lifecycleStart);
    const boatState = { paused: false, throttle: 0.9 };
    const calls = { releases: 0, pauses: [], checkpoints: [], statuses: [], announcements: [] };
    const listeners = { document: {}, window: {} };
    let hidden = false;
    let focused = true;
    let checkpointValue = { schemaVersion: 1 };

    expect(lifecycleStart).toBeGreaterThan(-1);
    expect(lifecycleEnd).toBeGreaterThan(lifecycleStart);

    const documentStub = {
      get hidden() { return hidden; },
      hasFocus() { return focused; },
      addEventListener(name, handler) { listeners.document[name] = handler; }
    };
    const windowStub = {
      addEventListener(name, handler) { listeners.window[name] = handler; }
    };
    const lifecycle = new Function(
      'boatState',
      'releaseHeldControls',
      'setPaused',
      'emitVoyageCheckpoint',
      'statusCb',
      'flAnnounce',
      'document',
      'window',
      source.slice(lifecycleStart, lifecycleEnd) +
        '\nreturn { pauseForInactivity, onActivityReturn, onVisibilityChange, onPageHide };'
    )(
      boatState,
      () => { calls.releases += 1; },
      (paused, announce) => {
        calls.pauses.push({ paused, announce });
        boatState.paused = !!paused;
        boatState.throttle = 0;
        return true;
      },
      (reason, force) => {
        calls.checkpoints.push({ reason, force });
        return checkpointValue;
      },
      (payload) => calls.statuses.push(payload.text),
      (message) => calls.announcements.push(message),
      documentStub,
      windowStub
    );

    expect(listeners.document.visibilitychange).toBe(lifecycle.onVisibilityChange);
    expect(listeners.window.focus).toBe(lifecycle.onActivityReturn);
    expect(listeners.window.pageshow).toBe(lifecycle.onActivityReturn);
    expect(listeners.window.pagehide).toBe(lifecycle.onPageHide);

    expect(lifecycle.pauseForInactivity('window-blur')).toBe(true);
    expect(boatState).toEqual({ paused: true, throttle: 0 });
    expect(calls.checkpoints.at(-1)).toEqual({ reason: 'window-blur', force: true });
    expect(calls.statuses.at(-1)).toContain('Safe progress was saved');
    expect(lifecycle.pauseForInactivity('window-blur')).toBe(false);
    expect(calls.checkpoints).toHaveLength(1);

    expect(lifecycle.onActivityReturn()).toBe(true);
    expect(boatState.paused).toBe(true);
    expect(calls.statuses.at(-1)).toContain('remains paused until you resume');
    expect(calls.announcements.at(-1)).toContain('Press P or use Resume');

    boatState.paused = true;
    const manualStatusCount = calls.statuses.length;
    expect(lifecycle.pauseForInactivity('window-blur')).toBe(false);
    expect(lifecycle.onActivityReturn()).toBe(false);
    expect(calls.statuses).toHaveLength(manualStatusCount);

    boatState.paused = false;
    boatState.throttle = 0.6;
    hidden = true;
    listeners.document.visibilitychange();
    expect(boatState.paused).toBe(true);
    expect(calls.checkpoints.at(-1)).toEqual({ reason: 'visibility', force: true });

    hidden = false;
    focused = false;
    listeners.document.visibilitychange();
    expect(calls.announcements).toHaveLength(1);
    focused = true;
    expect(listeners.window.focus()).toBe(true);
    expect(calls.statuses.at(-1)).toContain('Tab active');

    boatState.paused = false;
    boatState.throttle = 0.4;
    checkpointValue = null;
    listeners.window.pagehide();
    expect(calls.checkpoints.at(-1)).toEqual({ reason: 'pagehide', force: true });
    expect(calls.statuses.at(-1)).toContain('most recent stable checkpoint is unchanged');
    expect(listeners.window.pageshow()).toBe(true);
    expect(boatState.paused).toBe(true);
    expect(calls.pauses).toEqual([
      { paused: true, announce: false },
      { paused: true, announce: false },
      { paused: true, announce: false }
    ]);
    expect(source).toContain("pauseForInactivity('window-blur');");
  });

  it('locks resume and exposes persistent recovery guidance while graphics are unavailable', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const pauseStart = source.indexOf('    function setPaused(paused, announce)');
    const pauseEnd = source.indexOf('    var pausedForInactivity', pauseStart);
    const boatState = { paused: true, throttle: 0.8 };
    const statuses = [];
    const announcements = [];
    let releases = 0;
    let hudUpdates = 0;
    let checkpoints = 0;

    expect(pauseStart).toBeGreaterThan(-1);
    expect(pauseEnd).toBeGreaterThan(pauseStart);

    const setPaused = new Function(
      'boatState',
      'releaseHeldControls',
      'statusCb',
      'flAnnounce',
      'publishHudPatch',
      'emitVoyageCheckpoint',
      'var contextLost = true;\n' + source.slice(pauseStart, pauseEnd) + '\nreturn setPaused;'
    )(
      boatState,
      () => { releases += 1; },
      (payload) => statuses.push(payload.text),
      (message) => announcements.push(message),
      () => { hudUpdates += 1; },
      () => { checkpoints += 1; }
    );

    expect(setPaused(false, true)).toBe(false);
    expect(boatState).toEqual({ paused: true, throttle: 0.8 });
    expect(releases).toBe(0);
    expect(hudUpdates).toBe(0);
    expect(checkpoints).toBe(0);
    expect(statuses.at(-1)).toContain('still recovering');
    expect(announcements.at(-1)).toContain('remains paused');
    expect(source).toContain("disabled: graphicsContextLost, title: graphicsContextLost ? 'Resume is unavailable while graphics recover'");
    expect(source).toContain("'data-fisherlab-graphics-recovery': 'lost'");
    expect(source).toContain("'data-fisherlab-graphics-reason': graphicsFailureReason || 'context-lost'");
    expect(source).toContain("'aria-labelledby': 'fl-graphics-recovery-title'");
    expect(source).toContain("voyageSaveStatus.id === 'error' ? 'Browser storage also needs attention.");
    expect(source).toContain('onClick: restartSimulatorGraphics');
  });

  it('relaunches failed graphics from a safe checkpoint through the guarded launch generation', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const restartStart = source.indexOf('    function restartSimulatorGraphics()');
    const restartEnd = source.indexOf('    function stopSim()', restartStart);
    const liveCheckpoint = { schemaVersion: 1, savedAt: 7000 };
    const harborRef = {
      current: {
        checkpoint(reason) {
          expect(reason).toBe('graphics-restart');
          return liveCheckpoint;
        },
        dispose() { calls.disposed += 1; }
      }
    };
    const pendingCheckpointRef = { current: null };
    const confirmedVoyageCheckpointRef = { current: { schemaVersion: 1, savedAt: 6000 } };
    const simRetryTimerRef = { current: null };
    const calls = { disposed: 0, cleared: [], recovery: [], sim: [], announcements: [], launched: [] };
    let queued = null;

    expect(restartStart).toBeGreaterThan(-1);
    expect(restartEnd).toBeGreaterThan(restartStart);

    const restartSimulatorGraphics = new Function(
      'graphicsContextLost',
      'harborRef',
      'normalizeCoreVoyageCheckpoint',
      'confirmedVoyageCheckpointRef',
      'savedVoyageCheckpoint',
      'invalidateSimulatorLaunch',
      'pendingCheckpointRef',
      'updateGraphicsRecovery',
      'setActiveFishing',
      'setActiveFish',
      'setActiveLobster',
      'setActiveTraffic',
      'setSim',
      'flAnnounce',
      'simRetryTimerRef',
      'setTimeout',
      'isCurrentSimulatorLaunch',
      'launchSim',
      source.slice(restartStart, restartEnd) + '\nreturn restartSimulatorGraphics;'
    )(
      true,
      harborRef,
      (value) => value || null,
      confirmedVoyageCheckpointRef,
      null,
      () => 12,
      pendingCheckpointRef,
      (lost, reason) => calls.recovery.push([lost, reason]),
      () => calls.cleared.push('fishing'),
      () => calls.cleared.push('fish'),
      () => calls.cleared.push('lobster'),
      () => calls.cleared.push('traffic'),
      (value) => calls.sim.push(value),
      (message) => calls.announcements.push(message),
      simRetryTimerRef,
      (callback) => { queued = callback; return 73; },
      (generation) => generation === 12,
      (checkpoint) => calls.launched.push(checkpoint)
    );

    restartSimulatorGraphics();
    expect(calls.disposed).toBe(1);
    expect(harborRef.current).toBeNull();
    expect(pendingCheckpointRef.current).toBe(liveCheckpoint);
    expect(calls.recovery).toEqual([[false, undefined]]);
    expect(calls.cleared).toEqual(['fishing', 'fish', 'lobster', 'traffic']);
    expect(calls.sim[0]).toMatchObject({ active: false, loading: true, restarting: true });
    expect(calls.announcements.at(-1)).toContain('latest safe voyage checkpoint');
    expect(simRetryTimerRef.current).toBe(73);

    queued();
    expect(simRetryTimerRef.current).toBeNull();
    expect(calls.launched).toEqual([liveCheckpoint]);
    expect(source).toContain('normalizeCoreVoyageCheckpoint(confirmedVoyageCheckpointRef.current)');
    expect(source).toContain('if (!isCurrentSimulatorLaunch(retryGeneration)) return;');
  });

  it('keeps keyboard control focused, fuel bounded, and catch decisions explicit', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

    expect(source).toContain('if (document.activeElement !== canvas) return;');
    expect(source).toContain("window.addEventListener('blur', onWindowBlur)");
    expect(source).toContain("window.removeEventListener('blur', onWindowBlur)");
    expect(source).toContain("window.addEventListener('focus', onActivityReturn)");
    expect(source).toContain("window.removeEventListener('focus', onActivityReturn)");
    expect(source).toContain("window.addEventListener('pageshow', onActivityReturn)");
    expect(source).toContain("window.removeEventListener('pageshow', onActivityReturn)");
    expect(source).toContain('function cancelHeldControlPulse(key)');
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
    // The plot readout must show how many fixes are in and how far apart they
    // are — six plots at 0.8 s is what makes the trend readable. Pinned as an
    // invariant rather than as an exact caption, which last broke on a hyphen
    // becoming a middle dot.
    expect(source).toMatch(/'PLOT ' \+ trafficTrackDots\.length \+ '\/6[^']*0\.8 s interval'/);
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
    expect(source).toContain("handleSimulatorDialogKeyDown");
    expect(source).toContain("containCoreDialogFocus(e)");
    expect(source).not.toContain("handleFishingDialogKeyDown");
    expect(source).toContain("practiceCorrectionRef.current = masteryRow.focusSkill === 'transfer'");
    expect(source).toContain("practiceCorrectionReviewedAt: correctionReviewedAt");
    expect(source).toContain("'data-fisherlab-transfer-result': practiceTransferResult.statusId");
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
    expect(source).toContain('resumeSavedVoyage');
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
    const literalMarks = [...src.matchAll(/addBuoy\([^,]+,\s*[^,]+,\s*'([^']+)'\)/g)].map((m) => m[1]);
    expect(literalMarks).toEqual(expect.arrayContaining(['safe-water', 'cardinal-N']));
    [...new Set(literalMarks)].forEach((t) => {
      expect(spec(t), 'sim places an unresolvable mark: ' + t).toBeTruthy();
    });

    const { getCoreVoyageBuoyageLayout } = window.__FisherLabCore;
    ['maine', 'chesapeake', 'pnw', 'greatlakes'].forEach((region) => {
      const layout = getCoreVoyageBuoyageLayout(region);
      expect(spec(layout.portMarkType), region + ' port mark is unresolvable').toBeTruthy();
      expect(spec(layout.starboardMarkType), region + ' starboard mark is unresolvable').toBeTruthy();
    });
    [
      'addBuoy(6, -10, buoyageLayout.portMarkType)',
      'addBuoy(-6, -10, buoyageLayout.starboardMarkType)',
      'addBuoy(7, -30, buoyageLayout.portMarkType)',
      'addBuoy(-7, -30, buoyageLayout.starboardMarkType)',
      'addBuoy(9, -55, buoyageLayout.portMarkType)',
      'addBuoy(-9, -55, buoyageLayout.starboardMarkType)'
    ].forEach((placement) => expect(src).toContain(placement));
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

// The 3-D scene has to survive a school Chromebook, not just a workstation.
// Measured with hardwareConcurrency spoofed to 2: 47,424 triangles at full
// detail against 26,313 on the low tier.
describe('Fisher Lab low-power scaling', () => {
  const src = () => fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

  it('★ defines the low-power test exactly once', () => {
    // It used to be written out twice, 600 lines apart — once for the water
    // tessellation and once inside the effects layer. Tuning the threshold in
    // one place would silently have left the other on the old rule.
    const matches = src().match(/navigator\.hardwareConcurrency <= \d+/g) || [];
    expect(matches.length).toBe(1);
    expect(src()).toContain('var LOW_POWER =');
    expect(src()).not.toContain('lowPowerWater');
  });

  it('scales the scenery that was added without regard for the machine', () => {
    // Terrain, islands and the shoal overlay were all built at a fixed
    // resolution. Each is now driven off the single flag.
    const s = src();
    expect(s).toContain('var RINGS = LOW_POWER ? 5 : 7, SEG = LOW_POWER ? 11 : 16;');
    expect(s).toContain('var NX = LOW_POWER ? 24 : 40, NZ = LOW_POWER ? 5 : 8');
    expect(s).toContain('var NX = LOW_POWER ? 32 : 56, NZ = LOW_POWER ? 26 : 44;');
    expect(s).toContain('var WATER_SEG = LOW_POWER ? 88 : 128;');
  });

  it('keeps the effects layer on the same flag rather than its own copy', () => {
    expect(src()).toContain('var lowPower = LOW_POWER;');
  });

  it('folds reduced-motion into the same decision', () => {
    // A reduced-motion request is also a request for less work, and the two
    // used to be tangled together in both copies of the expression.
    expect(src()).toMatch(/var LOW_POWER = reducedMotion \|\|/);
  });
});

// The Chart Room is the tool's stated fallback for when WebGL is unavailable,
// so it is the one surface a student is left with when the 3-D sim cannot run.
describe('Fisher Lab chart room accessibility', () => {
  const src = () => fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

  it('★ announces the fallback chart', () => {
    // An aria-label on a bare <svg> is exposed inconsistently across screen
    // readers; role="img" is what makes it reliable.
    const s = src();
    const from = s.indexOf("viewBox: '0 0 600 400'");
    expect(from).toBeGreaterThan(-1);
    const el = s.slice(from, from + 2200);
    expect(el).toContain("role: 'img'");
    expect(el).toMatch(/'aria-label': '[^']{120,}'/);   // a real description, not a stub
  });

  it('describes what the chart actually shows', () => {
    const s = src();
    const from = s.indexOf("viewBox: '0 0 600 400'");
    const label = s.slice(from, from + 2200);
    // The buoyage is the teachable content; a label that omits it is decoration.
    expect(label).toMatch(/red nun/i);
    expect(label).toMatch(/green can/i);
    expect(label).toMatch(/Halfway Rock/i);
  });

  it('passes no stray function as a React child', () => {
    // `[120, 180, 240].forEach,` sat in the argument list, handing the forEach
    // FUNCTION to React as a child of the svg. Production React drops it
    // silently, which is why it survived; the development build warns.
    expect(src()).not.toMatch(/\]\.forEach,\s*$/m);
  });

  it('keeps Portland detail Maine-only and labels every other plan as a schematic', () => {
    const s = src();
    const regional = s.slice(s.indexOf('function flRegionalTrainingChartSvg'), s.indexOf('// --- CHART tab'));
    const chart = s.slice(s.indexOf('function chartTab()'), s.indexOf('function flBuoyRow'));

    expect(regional).toContain("viewBox: '0 0 640 360'");
    expect(regional).toContain("'data-fisherlab-regional-chart': brief.region");
    expect(regional).toContain("var portDetail = String(brief.portCoords || '').split('·')[0].trim() || brief.portName");
    expect(regional).toContain("stage(18, '1 - DEPART', brief.portName, portDetail");
    expect(regional).toContain('NOT A NAUTICAL CHART');
    expect(regional).toContain('Reference names only');
    expect(chart).toContain("var detailedMaine = chartBrief.detailMode === 'portland-detail'");
    expect(chart).toContain("'🗺 Chart Room — ' + chartBrief.label + ' (' + chartBrief.portName + ')'");
    expect(chart).toContain("detailedMaine ? h('svg', { viewBox: '0 0 600 400'");
    expect(chart).toContain('flRegionalTrainingChartSvg(h, chartBrief)');
  });
});

describe('Fisher Lab regional home briefing', () => {
  it('does not present the Maine roadmap as regional progress', () => {
    const s = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const home = s.slice(s.indexOf('function homeTab()'), s.indexOf('// --- FIELD JOURNAL tab'));

    expect(home).toContain("var isMaineCurriculum = region === 'maine'");
    expect(home).toContain("'data-fisherlab-regional-mission': region");
    expect(home).toContain('The full expedition roadmap is Maine-specific');
    expect(home).not.toContain('Pilot a Maine skiff from Custom House Wharf');
  });
});

// ★ ANSWER-POSITION BIAS. The authored bank put 66% of correct answers in slot
// B (measured 2/46/22/0) and never used slot D at all — a quiz you can pass by
// always picking B. A deterministic per-question rotation fixes it, but nothing
// was checking that it STAYS fixed, and this bug class recurs across this
// codebase every time a bank grows.
//
// Measured off the shipped, post-rotation bank rather than by re-deriving the
// rotation here: a test that reimplements the thing it is testing proves only
// that two copies of the same arithmetic agree.
describe('Fisher Lab quiz answer positions', () => {
  const dist = () => window.__FisherLabCore.getCoreQuizAnswerDistribution();

  it('does not let any one slot carry the bank', () => {
    const d = dist();
    expect(d.total).toBeGreaterThanOrEqual(60);
    // Even spread over four options is 25%. Before the rotation this was 66%.
    // 40% leaves room for the bank to grow without a hair-trigger failure,
    // while still catching a return to guess-the-letter.
    expect(d.peakShare, 'counts ' + JSON.stringify(d.counts)).toBeLessThan(0.4);
  });

  it('uses every answer slot', () => {
    // The authored bank never once put the answer in slot D. A slot that is
    // never correct is a distractor students learn to ignore.
    const d = dist();
    d.counts.forEach((n, i) => {
      expect(n, 'slot ' + i + ' unused; counts ' + JSON.stringify(d.counts)).toBeGreaterThan(0);
    });
  });

  it('keeps every correct index pointing at a real option', () => {
    // The rotation remaps `correct` alongside the options. If those two ever
    // came apart, the quiz would mark the wrong answer right — and the review
    // screen reads q.a[q.correct], so it would explain the wrong one too.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = src.indexOf('var QUIZ_QUESTIONS = [');
    const bank = src.slice(from, src.indexOf('\n  ];', from));
    const rows = [...bank.matchAll(/correct: (\d+)/g)].map((m) => Number(m[1]));
    expect(rows.length).toBeGreaterThanOrEqual(60);
    rows.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
    const d = dist();
    // Every counted question resolved to a slot inside its own option list.
    expect(d.counts.reduce((a, b) => a + b, 0)).toBe(d.total);
  });

  it('rotates deterministically, not randomly', () => {
    // A random shuffle would deal new options mid-question, because the quiz
    // re-reads QUIZ_QUESTIONS[idx] on every render.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = src.indexOf('// The authored bank put 66%');
    const block = src.slice(from, from + 1200);
    expect(from).toBeGreaterThan(-1);
    expect(block).toContain('var shift = ((qi * 7) + 3) % n;');
    expect(block).not.toMatch(/Math\.random/);
  });
});

// ★ The boat's own navigation lights were on the WRONG SIDES.
// The bow is at local +Z, and in a right-handed Y-up scene the starboard side
// of a body facing +Z is local −X, not +X — point the bow at the camera and the
// vessel's right hand is on the viewer's left. Authored as green at +0.8 and
// red at −0.8, the model showed a GREEN light on its port bow and a RED light
// on its starboard bow: exactly reversed from COLREGS Rule 23, and from the
// light-sector diagram this same tool teaches on the Night Nav tab.
//
// Caught by taking forward × up from the model's own transform in a live scene
// and projecting each light onto it, not by eye.
describe('Fisher Lab navigation light sides', () => {
  const at = (side) => window.__FisherLabCore.getCoreNavLightLocalX(side);

  it('puts starboard on local −X for a bow-at-+Z hull', () => {
    expect(at('starboard')).toBeLessThan(0);
    expect(at('port')).toBeGreaterThan(0);
  });

  it('keeps the two lights exactly opposite', () => {
    // A vessel with both lights on one side is not a vessel.
    expect(at('port')).toBeCloseTo(-at('starboard'), 10);
    expect(Math.abs(at('port'))).toBeGreaterThan(0);
  });

  it('places both lights through the one function', () => {
    // They used to carry independent literals, so one could be corrected and
    // the other left reversed — which still leaves the pair wrong.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain("var PORT_X = getCoreNavLightLocalX('port'), STBD_X = getCoreNavLightLocalX('starboard');");
    expect(src).toContain('portLight.position.set(PORT_X, 0.8, 2.0);');
    expect(src).toContain('stbdLight.position.set(STBD_X, 0.8, 2.0);');
    // The glows must follow their lights, or the lit halo sits on the far side.
    expect(src).toContain('portGlow.position.set(PORT_X, 0.8, 2.0);');
    expect(src).toContain('stbdGlow.position.set(STBD_X, 0.8, 2.0);');
    // And no stray hard-coded ±0.8 left on a light.
    expect(src).not.toMatch(/(port|stbd)(Light|Glow)\.position\.set\(-?0\.8/);
  });

  it('agrees with what the Night Nav tab teaches about the same lights', () => {
    // Rule 23 as the tool states it: red to port, green to starboard. If the
    // model and the lesson ever disagree again, one of them is lying.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toMatch(/red \(port\), green \(starboard\)/i);
    const from = src.indexOf('function flNavLightSectorsSvg');
    const fig = src.slice(from, src.indexOf('// What each sector looks like', from));
    expect(fig).toContain('GREEN');
    expect(fig).toContain('RED');
  });
});

// ★ The fallback chart contradicted its own caption, the Buoyage tab and the
// 3-D sim about which side of the channel the red marks are on.
//
// The rose puts N at the top, so this is a north-up chart and outbound runs
// DOWN the page. Facing south, port is east — page-right — and starboard is
// west, page-left. Green to starboard when seaward therefore puts green on the
// LEFT and red on the RIGHT. They were drawn the other way round.
describe('Fisher Lab fallback chart buoyage', () => {
  const chart = () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const from = src.indexOf("viewBox: '0 0 600 400'");
    return src.slice(from, src.indexOf('// compass rose', from));
  };
  const xs = (letter) => {
    const m = chart().match(new RegExp("\\[\\{ x: (\\d+), y: \\d+, t: '" + letter + "'[\\s\\S]*?\\]"));
    return m ? [...m[0].matchAll(/x: (\d+)/g)].map((n) => Number(n[1])) : [];
  };

  it('puts the red nuns east of the channel and the green cans west', () => {
    const red = xs('R'), green = xs('G');
    expect(red.length).toBe(3);
    expect(green.length).toBe(3);
    // The chart is 600 wide, channel on the centreline.
    red.forEach((x) => expect(x, 'red at ' + x).toBeGreaterThan(300));
    green.forEach((x) => expect(x, 'green at ' + x).toBeLessThan(300));
  });

  it('agrees with the caption printed underneath it', () => {
    // The caption always said "east side"; only the drawing disagreed.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toMatch(/Red marks \(nuns, even-numbered\) line the east side/);
    const red = xs('R');
    red.forEach((x) => expect(x).toBeGreaterThan(300));   // east == page-right
  });

  it('agrees with the rule the sim scores against', () => {
    // evaluateCoreBuoyPass is the single source of the rule. Outbound, green is
    // the starboard-hand mark; inbound, red is.
    const { evaluateCoreBuoyPass } = window.__FisherLabCore;
    expect(evaluateCoreBuoyPass('outbound', 'green', 'starboard').correct).toBe(true);
    expect(evaluateCoreBuoyPass('returning', 'red', 'starboard').correct).toBe(true);
    expect(evaluateCoreBuoyPass('outbound', 'red', 'starboard').correct).toBe(false);
  });

  it('shows the direction of travel, so the rule can be checked not just believed', () => {
    expect(chart()).toContain('RETURNING');
    expect(chart()).toContain('red to starboard');
  });

  it('★ draws safe water as vertical stripes here too', () => {
    // Third place in this tool that drew this mark wrong. The Buoyage glyph and
    // the 3-D buoy were corrected earlier; the fallback chart still had a red
    // disc with a white ring, which is not the safe-water mark at all.
    const c = chart();
    expect(c).toContain('fl-chart-safewater');
    expect(c).toMatch(/#f4f6f8/);            // the white stripe
    expect(c).not.toMatch(/circle', \{ cx: 300, cy: 330, r: 8, fill: '#d03830', stroke: '#fff'/);
  });
});

// ★ SAME FACT, TWO AUTHORINGS — the pattern behind the reversed nav lights, the
// side-by-side cardinal topmark and the safe-water mark being drawn wrongly in
// three separate places.
//
// The finfish rule already avoids it: getCoreFishRuleEvidence DERIVES its
// bounds from the species record (species.slot, species.minSize,
// species.dailyBag), so changing the data changes the rule. The shellfish rule
// does not — getCoreShellfishReleaseReason carries its own literals per region.
// They agree today. This is the guard that they keep agreeing.
//
// Deliberately a guard rather than a refactor: the shellfish rule also encodes
// region-specific conditions with no counterpart in the species data (egg
// sponge, male-only harvest, V-notch), and this function scores real student
// decisions. Pinning the numbers costs nothing and risks nothing; rewriting the
// scoring path to save a duplication does not clear that bar.
describe('Fisher Lab shellfish bounds match the species records', () => {
  const src = () => fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

  // Pull a species record's slot bounds using the SAME regex the finfish rule
  // uses, so the test reads the data the way the tool does.
  const slotBounds = (id) => {
    const s = src();
    const at = s.indexOf("{ id: '" + id + "'");
    expect(at, 'species ' + id).toBeGreaterThan(-1);
    const rec = s.slice(at, at + 900);
    const slot = rec.match(/slot: '([^']*)'/);
    return slot ? (String(slot[1]).match(/\d+(?:\.\d+)?/g) || []).map(Number) : [];
  };

  const reason = (spec) => window.__FisherLabCore.getCoreShellfishReleaseReason(spec);

  it('uses the lobster record bounds for Maine', () => {
    const [min, max] = slotBounds('lobster');
    expect(min).toBe(3.25);
    expect(max).toBe(5);
    expect(reason({ length: min - 0.01 })).toContain(String(min));
    expect(reason({ length: max + 0.01 })).toContain(String(max));
    // Inside the slot, a clean specimen is not released for size.
    expect(reason({ length: (min + max) / 2 })).not.toMatch(/below|above/);
  });

  it('uses the blue crab record minimum for the Chesapeake', () => {
    const [min] = slotBounds('bluecrab');
    expect(min).toBe(5);
    expect(reason({ region: 'chesapeake', length: min - 0.01 })).toContain(String(min));
    expect(reason({ region: 'chesapeake', length: min + 1 })).not.toMatch(/below/);
  });

  it('uses the Dungeness record minimum for the Pacific coast', () => {
    const [min] = slotBounds('dungeness');
    expect(min).toBe(6.25);
    expect(reason({ region: 'pnw', length: min - 0.01 })).toContain(String(min));
    expect(reason({ region: 'pnw', length: min + 1 })).not.toMatch(/below/);
  });

  it('judges each region against its OWN trap species, not Maine lobster', () => {
    // A blue crab measured against the Maine lobster slot would be told it is
    // "above the 5-inch maximum" at a legal size — the regional profiles exist
    // precisely so that cannot happen.
    const big = { region: 'chesapeake', length: 6 };
    expect(reason(big)).not.toMatch(/Maine/);
    expect(reason(big)).not.toMatch(/above the 5-inch/);
    expect(reason({ region: 'pnw', length: 7 })).not.toMatch(/Maine/);
  });

  it('keeps the finfish rule deriving rather than duplicating', () => {
    // If this ever stops reading the species record, the finfish limits gain
    // the same divergence risk the shellfish ones have.
    const s = src();
    const from = s.indexOf('function getCoreFishRuleEvidence');
    const body = s.slice(from, from + 1400);
    expect(body).toContain('species.slot');
    expect(body).toContain('species.minSize');
    expect(body).not.toMatch(/\b23\b|\b17\b|\b28\b/);   // no hard-coded fish sizes
  });
});

// Finishing a voyage is the moment the whole thing builds to, and it used to be
// announced by one line of coloured text. The medallion gives it somewhere to
// land; the next-rank strip is what turns a terminal screen into a reason to
// cast off again.
describe('Fisher Lab voyage rank progression', () => {
  const next = (s, a, f) => window.__FisherLabCore.getCoreNextRank(s, a, f);
  const rank = (s, a, f) => window.__FisherLabCore.getCoreVoyageRank(s, a, f);

  it('still awards the same ranks as before the table refactor', () => {
    expect(rank(225, 94, 41).id).toBe('gold');
    expect(rank(168, 84, 26).id).toBe('silver');
    expect(rank(96, 72, 34).id).toBe('bronze');
    // Every criterion must be met, not just the score — a big score with a
    // thin reserve is still a mismanaged trip.
    expect(rank(250, 95, 25).id).toBe('silver');   // fuel 25 clears silver's 20, misses gold's 30
    expect(rank(250, 95, 10).id).toBe('bronze');   // 10 misses silver's 20 as well
    expect(rank(250, 70, 50).id).toBe('bronze');   // accuracy short of silver
  });

  it('names the specific gap to the next rank', () => {
    const n = next(96, 72, 34);
    expect(n.atTop).toBe(false);
    expect(n.next.id).toBe('silver');
    const byKey = Object.fromEntries(n.criteria.map((c) => [c.key, c]));
    expect(byKey.score.shortfall).toBe(145 - 96);
    expect(byKey.accuracy.shortfall).toBe(80 - 72);
    expect(byKey.fuel.met).toBe(true);          // already clear on fuel
  });

  it('reports the top rank as finished rather than inventing a next one', () => {
    const n = next(400, 100, 100);
    expect(n.atTop).toBe(true);
    expect(n.next).toBeNull();
    expect(n.criteria).toEqual([]);
  });

  it('keeps progress bounded so a bar cannot overflow its track', () => {
    next(1000, 100, 100);   // would be atTop; check a mid case instead
    const n = next(300, 85, 25);
    n.criteria.forEach((c) => {
      expect(c.progress).toBeGreaterThanOrEqual(0);
      expect(c.progress).toBeLessThanOrEqual(1);
    });
  });

  it('reads the thresholds from one table rather than an inline chain', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('var VOYAGE_RANKS = [');
    // The old inline comparison chain is what made "how far to the next rank"
    // unanswerable without writing the numbers out a second time.
    expect(src).not.toMatch(/score >= 200 && accuracy >= 90 && fuel >= 30/);
  });

  it('describes the medallion and the strip for a screen reader', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const med = src.slice(src.indexOf('function flRankMedallionSvg'), src.indexOf('function flNextRankSvg'));
    expect(med).toMatch(/'aria-label':/);
    expect(med).toMatch(/not yet earned/);      // the unearned state is announced too
    const strip = src.slice(src.indexOf('function flNextRankSvg'), src.indexOf('// ─── Camera rig geometry'));
    // The strip's label has to carry the numbers, since the bars are the whole
    // content and a bar conveys nothing on its own.
    expect(strip).toMatch(/Progress toward/);
    expect(strip).toMatch(/c\.have/);
  });
});

// ★ Relative-motion radar. The plot used to be a 50-pixel div with 4-pixel dots
// carrying the one judgement that decides whether two vessels collide.
//
// The whole read is geometric: join the successive contact positions, extend
// that line, and see how close it passes to your own ship. That distance IS the
// closest point of approach. Drawn, a student can check it; asserted in prose,
// they can only believe it.
describe('Fisher Lab radar relative-motion track', () => {
  const track = (pts) => window.__FisherLabCore.getCoreRadarTrack(pts);
  // Plot points arrive in the same frame the drawing uses: x to starboard,
  // y forward-negative, own ship at the origin.
  const line = (from, to, n) => Array.from({ length: n }, (_, i) => ({
    x: from[0] + (to[0] - from[0]) * (i / (n - 1)),
    y: from[1] + (to[1] - from[1]) * (i / (n - 1)),
  }));

  it('reads a track through own ship as a zero CPA', () => {
    // Contact closing on a steady bearing: the classic collision course.
    const t = track(line([16, -16], [4, -4], 6));
    expect(t.valid).toBe(true);
    expect(t.cpa.dist).toBeLessThan(0.5);
    expect(t.cpa.ahead).toBe(true);
  });

  it('reads a swinging bearing as passing clear', () => {
    const t = track(line([4, -22], [20, -6], 6));
    expect(t.valid).toBe(true);
    expect(t.cpa.dist).toBeGreaterThan(5);
  });

  it('★ marks a closest approach that has already happened', () => {
    // A contact drawing away still has a nearest point on its track — but it is
    // BEHIND it. Reported the same as one still to come, the display would
    // imply an imminent close pass while the contact opens away.
    const t = track(line([3, -3], [18, -18], 6));
    expect(t.valid).toBe(true);
    expect(t.cpa.ahead).toBe(false);
  });

  it('refuses to invent a track it cannot fit', () => {
    expect(track([]).valid).toBe(false);
    expect(track([{ x: 5, y: -5 }]).valid).toBe(false);
    // A contact that has not moved between plots has no relative track at all.
    expect(track([{ x: 5, y: -5 }, { x: 5, y: -5 }]).valid).toBe(false);
    expect(track(null).valid).toBe(false);
  });

  it('ignores plots with unusable coordinates', () => {
    const t = track([{ x: 16, y: -16 }, { x: NaN, y: 2 }, { x: 4, y: -4 }]);
    expect(t.valid).toBe(true);
    expect(t.cpa.dist).toBeLessThan(0.5);
  });

  it('shows the CPA state in the drawing, not just in the numbers', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flRadarSvg'), src.indexOf('// ─── Camera rig geometry'));
    expect(fig).toContain("'CPA passed'");
    expect(fig).toContain('track.cpa.ahead');
  });
});

// ★ Where a blip lands on the scope. The live contact and its history trail
// were placed by two separately-written copies of the same formula, and the
// floor in that formula (7 of 22 units, a third of the way out) collapsed the
// whole trail onto one spot at close range — going blind exactly where a
// closing contact matters most.
describe('Fisher Lab radar plot placement', () => {
  const at = (b, r) => window.__FisherLabCore.getCoreRadarPlotPoint(b, r);

  it('keeps closing ranges distinguishable', () => {
    // A contact coming from 20 sim units to 6 must visibly move inward.
    const far = at(0, 20).units, near = at(0, 6).units;
    expect(far).toBeGreaterThan(near * 1.9);
  });

  it('holds a contact off own ship at point-blank range', () => {
    // Zero range must not put the blip under the own-ship marker, where it
    // would be unreadable — that is the only thing the floor is for.
    expect(at(45, 0).units).toBeGreaterThan(0);
    expect(at(45, 0).units).toBeLessThan(3);
  });

  it('clamps a distant contact to the outer ring rather than off the face', () => {
    expect(at(90, 500).units).toBeLessThanOrEqual(22);
  });

  it('puts relative bearing where a head-up scope puts it', () => {
    expect(at(0, 20).y).toBeLessThan(0);            // dead ahead is up
    expect(Math.abs(at(0, 20).x)).toBeLessThan(0.001);
    expect(at(90, 20).x).toBeGreaterThan(0);        // starboard is right
    expect(at(270, 20).x).toBeLessThan(0);          // port is left
  });

  it('★ scales the live contact and its trail through one function', () => {
    // Two hand-written copies of this formula is how the scope and the trail
    // would come to disagree about where the same vessel is.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).not.toMatch(/Math\.max\(7,[^)]*\/ 38 \* 22\)/);
    const uses = src.match(/getCoreRadarPlotPoint\(/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(3);  // definition + both call sites
  });

  it('★ labels the range rings in the units the readout uses', () => {
    // A ring marked 7 beside a readout of "11.2 sim" cannot be compared, and
    // comparing them is the entire purpose of a range ring.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flRadarSvg'), src.indexOf('// ─── Camera rig geometry'));
    expect(fig).toContain('Math.round(RADAR_FULL_SCALE * f)');
    expect(fig).not.toContain("'7'], [0.66");
  });
});

// ★ The cast setup. Where you fish, how deep, on what, worked how — the
// decision the whole rest of the trip hangs on — was six dropdowns over a
// single number. "Target affinity 62/100" tells a student they are wrong
// without telling them what wrong looks like.
describe('Fisher Lab cast setup preview', () => {
  const score = (over) => window.__FisherLabCore.scoreFishingSetup({
    region: 'maine', speciesId: 'cod', spotId: 'ledge', tackleId: 'bottom-jig',
    targetDepth: 'bottom', conditions: {}, presentation: {}, ...over,
  });

  it('publishes the target it scored, so the drawing cannot pick a different fish', () => {
    const s = score();
    expect(s.speciesId).toBe('cod');
    expect(s.speciesZone).toBe('bottom');
    expect(s.targetDepth).toBe('bottom');
    expect(Array.isArray(s.spotTags)).toBe(true);
    expect(s.tackleId).toBe('bottom-jig');
  });

  it('agrees with its own depth component about whether the rig is in the zone', () => {
    // The picture says "IN THE ZONE" off depthMatched; the bars draw
    // components.depth. If those two could disagree the panel would contradict
    // itself in the same glance.
    const hit = score({ targetDepth: 'bottom' });
    expect(hit.depthMatched).toBe(true);
    expect(hit.components.depth).toBeGreaterThan(0);

    const miss = score({ targetDepth: 'surface' });
    expect(miss.depthMatched).toBe(false);
    expect(miss.components.depth).toBe(0);
  });

  it('tracks the target across regions rather than assuming cod', () => {
    const striper = score({ region: 'chesapeake', speciesId: 'stripedbass', spotId: 'channel-edge' });
    expect(striper.speciesId).toBe('stripedbass');
    expect(striper.speciesZone).toBe('midwater');
  });

  it('★ draws from the published score instead of re-resolving the target', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flCastPreviewSvg'), src.indexOf('function flSetupScoreBarsSvg'));
    expect(fig).toContain('score.speciesZone');
    expect(fig).toContain('score.targetDepth');
    // A second lookup of the species table inside the drawing is exactly how
    // the picture and the number beneath it would come to disagree.
    expect(fig).not.toContain('CORE_FISHING_SPECIES');
    expect(fig).not.toContain('getFishingSpot');
    expect(fig).not.toContain('getFishingTackle');
  });

  it('★ tells the student which way to move, not just that they are wrong', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flCastPreviewSvg'), src.indexOf('function flSetupScoreBarsSvg'));
    expect(fig).toContain("'IN THE ZONE'");
    expect(fig).toContain('DEEPER');
    expect(fig).toContain('SHALLOWER');
    // The zone order is what makes "deeper" mean deeper.
    expect(src).toContain("var CAST_ZONES = ['surface', 'midwater', 'bottom']");
  });

  it('★ breaks the affinity total into the five parts it is made of', () => {
    // One number says you are wrong; five bars say WHICH choice is wrong,
    // which is the only version a student can act on.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const keys = (src.match(/var CAST_SCORE_PARTS = \[[\s\S]*?\];/) || [''])[0];
    ['habitat', 'depth', 'tackle', 'conditions', 'presentation'].forEach((k) => {
      expect(keys).toContain("'" + k + "'");
    });
    // Every part drawn must be a component the scorer actually emits.
    const comp = score().components;
    ['habitat', 'depth', 'tackle', 'conditions', 'presentation'].forEach((k) => {
      expect(typeof comp[k]).toBe('number');
    });
  });

  it('leaves the accessible readouts carrying the content', () => {
    // Both figures are decorative: the affinity progressbar and the evidence
    // list already state all of it, and announcing it twice reads twice.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const preview = src.slice(src.indexOf('function flCastPreviewSvg'), src.indexOf('function flSetupScoreBarsSvg'));
    const bars = src.slice(src.indexOf('function flSetupScoreBarsSvg'), src.indexOf('// Where a contact sits on the scope'));
    expect(preview).toContain("'aria-hidden': 'true'");
    expect(bars).toContain("'aria-hidden': 'true'");
    expect(src).toContain("'aria-label': 'Fishing setup affinity'");
  });
});

// ★ The catch inspection. This is where the trip is settled, and there was
// nothing to measure: the length arrived already decided in the heading, the
// legal limit arrived as a separate sentence, and whether one cleared the
// other was arithmetic the student did in their head between two paragraphs.
describe('Fisher Lab measuring board', () => {
  const ev = (len, species) => window.__FisherLabCore.getCoreFishRuleEvidence(len, species, {});
  const COD = { name: 'Atlantic Cod', minSize: 19 };
  const STRIPER = { name: 'Striped Bass', slot: '20-28 in' };

  it('publishes the numeric bounds, not only the sentence', () => {
    // The board must draw the same limits the decision is scored against.
    // Re-parsing them back out of "Slot: 20-28 in" is a second derivation of
    // the rule, and the two would eventually disagree.
    expect(ev(18, COD)).toMatchObject({ measuredInches: 18, minInches: 19, maxInches: null });
    expect(ev(24, STRIPER)).toMatchObject({ measuredInches: 24, minInches: 20, maxInches: 28 });
  });

  it('★ leaves an absent bound absent rather than turning it into zero', () => {
    // Number(null) is 0 and isFinite(0) is true, so a bound guarded only by
    // isFinite(Number(x)) reads "no maximum" as "maximum of zero" — and every
    // legal fish then measures OVERSIZE against a limit that does not exist.
    // That is the opposite of the correct call, and it renders confidently.
    const noSlot = ev(24, COD);
    expect(noSlot.maxInches).toBeNull();
    expect(noSlot.maxInches).not.toBe(0);

    const noRule = ev(15, { name: 'Pollock' });
    expect(noRule.minInches).toBeNull();
    expect(noRule.maxInches).toBeNull();

    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flMeasuringBoardSvg'), src.indexOf('// THE CAST SETUP'));
    expect(fig).not.toContain('isFinite(Number(ev.maxInches))');
    expect(fig).toContain('v == null');
  });

  it('agrees with the evaluator on every verdict it can draw', () => {
    // The board's headline and the scored decision are two readings of one
    // fact; if they can differ, the panel contradicts itself in one glance.
    const cases = [
      [18, COD, false], [19, COD, true], [24, COD, true],
      [19, STRIPER, false], [24, STRIPER, true], [33, STRIPER, false],
    ];
    cases.forEach(([len, sp, legal]) => {
      const e = ev(len, sp);
      expect(e.legalToRetain, `${sp.name} at ${len} in`).toBe(legal);
      // Whatever the board says, it reads legality off this same flag.
      const short = e.minInches !== null && len < e.minInches;
      const over = e.maxInches !== null && len > e.maxInches;
      expect(!short && !over).toBe(legal);
    });
  });

  it('★ does not call a bare minimum a slot', () => {
    // A minimum has no upper bound. Reporting "IN THE SLOT" against it teaches
    // a limit the regulation does not have.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flMeasuringBoardSvg'), src.indexOf('// THE CAST SETUP'));
    expect(fig).toContain("'MEETS MINIMUM'");
    expect(fig).toContain("hi !== null ? 'IN THE SLOT'");
    expect(fig).toContain("(hi !== null ? 'SLOT ' : 'MIN ')");
  });

  it('declines to draw a board it has no reading for', () => {
    const { flMeasuringBoardSvg } = window.__FisherLabCore;
    const h = () => ({});
    expect(flMeasuringBoardSvg(h, {}, 'Cod')).toBeNull();
    expect(flMeasuringBoardSvg(h, { measuredInches: 0 }, 'Cod')).toBeNull();
    expect(flMeasuringBoardSvg(h, { measuredInches: null }, 'Cod')).toBeNull();
    expect(flMeasuringBoardSvg(h, null, 'Cod')).toBeNull();
  });

  it('states the shortfall as a number, not just as a colour', () => {
    const fig = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8')
      .slice(0);
    const body = fig.slice(fig.indexOf('function flMeasuringBoardSvg'), fig.indexOf('// THE CAST SETUP'));
    expect(body).toContain("' in under the '");
    expect(body).toContain("' in over the '");
    // Red-versus-green alone is unusable for a colourblind student.
    expect(body).toContain("'SHORT'");
    expect(body).toContain("'OVERSIZE'");
  });
});

describe('Fisher Lab species identification plates', () => {
  it('offers the candidates as pictures, not only as names', () => {
    // Identifying a fish from prose against three names is a vocabulary quiz.
    // Against three plates it is the real task: find the described field mark
    // in the picture.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const step = src.slice(src.indexOf("'1. Identify the species from its field marks'"),
      src.indexOf("'2. Log the selected profile evidence'"));
    expect(step).toContain('getCoreSpeciesArt(candidate.id)');
    expect(step).toContain('plate.url');
    // Decorative: the radio's own label already names the species.
    expect(step).toContain("alt: ''");
    expect(step).toContain("'aria-hidden': 'true'");
  });

  it('only ever points at artwork that is actually vendored', () => {
    const { getCoreSpeciesArt } = window.__FisherLabCore;
    const manifest = JSON.parse(fs.readFileSync('stem_lab/assets/fisherlab/asset-manifest.json', 'utf8'));
    const files = new Set(JSON.stringify(manifest).match(/[a-z0-9-]+\.jpg/g) || []);
    expect(files.size).toBeGreaterThan(0);
    ['cod', 'haddock', 'pollock', 'striper'].forEach((id) => {
      const art = getCoreSpeciesArt(id);
      expect(art, id).toBeTruthy();
      expect(files.has(art.file), `${id} → ${art.file}`).toBe(true);
    });
    // A species with no plate must yield null, not a broken image URL.
    expect(getCoreSpeciesArt('not-a-species')).toBeNull();
  });
});

// ★ Placing the cast and working it. These two beats sit between choosing the
// rig and the fish taking it, and they were the flattest thing in the chain:
// a range slider over a ten-pixel bar, then a button beside a progress bar.
describe('Fisher Lab cast placement', () => {
  const at = (m) => window.__FisherLabCore.getCoreCastPlacement(m);

  it('★ authors the target band once', () => {
    // It used to be spelled out five times — the success test (0.75/0.95), the
    // accuracy centre (85), the control's label, the bar's 75fr/20fr/5fr grid
    // ratios, and the failure sentence. Moving the target meant finding all
    // five or shipping a display that disagreed with the rule behind it.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('var CAST_TARGET = { lo: 75, hi: 95 }');
    expect(src).not.toContain('ratio >= 0.75 && ratio <= 0.95');
    expect(src).not.toContain("gridTemplateColumns: '75fr 20fr 5fr'");
    expect(src).not.toContain('target zone 75–95');
    expect(src).not.toContain('Math.abs(meter - 85) / 85');
    expect(src).not.toContain('outside the 75 to 95 percent');
  });

  it('agrees with the scored cast on both edges of the band', () => {
    const { evaluateCast } = window.__FisherLabCore;
    // The drawing colours itself off `inside`; the sim passes or fails the cast
    // off evaluateCast. A one-percent disagreement between them would show as
    // a green arc on a rejected throw.
    [[74, false], [75, true], [85, true], [95, true], [96, false]].forEach(([m, want]) => {
      expect(at(m).inside, `${m}%`).toBe(want);
      const scored = evaluateCast({ accuracy: at(m).accuracy, distanceRatio: m / 100, assistMode: true });
      // Inside the band and assisted, a centred-enough cast must be accepted;
      // outside it, no accuracy can rescue the throw.
      if (!want) expect(scored.success, `${m}% must fail`).toBe(false);
    });
  });

  it('names which way the throw was wrong', () => {
    expect(at(30)).toMatchObject({ short: true, long: false, inside: false });
    expect(at(99)).toMatchObject({ short: false, long: true, inside: false });
    expect(at(85)).toMatchObject({ short: false, long: false, inside: true });
  });

  it('peaks accuracy at the middle of the band and clamps its input', () => {
    expect(at(85).accuracy).toBeCloseTo(1, 5);
    expect(at(75).accuracy).toBeLessThan(1);
    expect(at(95).accuracy).toBeLessThan(1);
    expect(at(-40).meter).toBe(0);
    expect(at(400).meter).toBe(100);
    expect(at(null).meter).toBe(0);
    expect(at(NaN).meter).toBe(0);
  });

  it('★ says the verdict in words, not only in colour', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flCastArcSvg'), src.indexOf('function flPresentationSvg'));
    ['ON THE FISH', 'FALLING SHORT', 'THROWN PAST'].forEach((w) => expect(fig).toContain(w));
    // And the slider's own label repeats it, for anyone not seeing the figure.
    expect(src).toContain("castPlace.inside ? 'on the fish' : castPlace.short ? 'falling short' : 'thrown past'");
  });
});

describe('Fisher Lab presentation cadence', () => {
  it('★ shows a fish deciding, which is the only reason to work a rig', () => {
    // The count told you how many times you had pressed the button. It never
    // showed the thing that makes a retrieve worth doing.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const start = src.indexOf('function flPresentationSvg');
    const fig = src.slice(start, src.indexOf('function flMeasuringBoardSvg', start));
    expect(fig.length).toBeGreaterThan(500);
    ['NOTHING YET', 'SOMETHING NOTICED', 'TRACKING THE RIG', 'CLOSING FAST', 'COMMITTED']
      .forEach((w) => expect(fig).toContain(w));
  });

  it('draws the presentation that was actually selected', () => {
    const body = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = body.slice(body.indexOf('function flPresentationSvg'), body.indexOf('function flPresentationSvg') + 3000);
    ['vertical-jig', 'slow-drift', 'fast-retrieve'].forEach((t) => expect(fig).toContain(t));
    // It is handed the session's technique rather than assuming one.
    expect(body).toContain('flPresentationSvg(h, activeFishing.presentationCount, activeFishing.presentationTarget, activeFishing.technique)');
  });

  it('★ faces the fish at the rig it is closing on', () => {
    // Drawn nose-at-origin the silhouette points RIGHT; a fish approaching a
    // lure on its left while pointing away says the opposite of the frame.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('function castFish(h, key, x, y, size, fill, opacity, faceLeft)');
    expect(src).toContain("faceLeft ? -size : size");
    // Every current scene puts the rig left of the fish, so all pass the flag.
    // Matched by scanning windows rather than by a line-anchored regex: one
    // call spans two lines, which a `$` without the m flag silently misses.
    const calls = [];
    for (let i = src.indexOf('castFish(h,'); i !== -1; i = src.indexOf('castFish(h,', i + 1)) {
      if (src.slice(i - 9, i) === 'function ') continue;   // the definition, not a call
      calls.push(src.slice(i, i + 300));
    }
    expect(calls.length).toBeGreaterThanOrEqual(3);
    calls.forEach((c) => expect(c.slice(0, c.indexOf('));') + 3), c.slice(0, 70)).toContain('true'));
  });
});

// ★ Losing the fish. Four things can go wrong — the cast lands outside the
// water you picked, the strike comes after the window shuts, the line parts
// under load, or it goes slack and the hook works free. All four produced the
// same screen. Failure is where the learning is, and these are four different
// lessons wearing one face.
describe('Fisher Lab loss diagnostics', () => {
  it('★ publishes the window the strike was judged against', () => {
    const { evaluateHookset } = window.__FisherLabCore;
    // Assist mode stretches the window 1.5x. A diagram re-applying that
    // multiplier would be a second derivation of the very thing the student is
    // being shown they missed.
    const plain = evaluateHookset({ reactionMs: 1100, biteWindowMs: 900, assistMode: false });
    expect(plain.windowMs).toBe(900);
    expect(plain.reactionMs).toBe(1100);
    expect(plain.lateBy).toBe(200);
    expect(plain.success).toBe(false);

    const assisted = evaluateHookset({ reactionMs: 1100, biteWindowMs: 900, assistMode: true });
    expect(assisted.windowMs).toBeCloseTo(1350, 5);
    expect(assisted.success).toBe(true);
    expect(assisted.lateBy).toBe(0);
  });

  it('never reports a negative lateness', () => {
    const { evaluateHookset } = window.__FisherLabCore;
    expect(evaluateHookset({ reactionMs: 100, biteWindowMs: 900 }).lateBy).toBe(0);
    expect(evaluateHookset({ reactionMs: -50, biteWindowMs: 900 }).reactionMs).toBe(0);
  });

  it('★ gives each failure its own diagram', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const block = src.slice(src.indexOf("var why = activeFishing.lossReason"), src.indexOf('Evidence from this cast'));
    expect(block).toContain("why === 'off-target'");
    expect(block).toContain("why === 'missed-bite'");
    expect(block).toContain("why === 'line-break' || why === 'slack-line'");
    // The off-target case reuses the very figure the cast was placed with, so
    // the loss shows the same throw the sim rejected.
    expect(block).toContain('flCastArcSvg(h, activeFishing.castMeter)');
    expect(block).toContain('flHooksetTimingSvg(h, activeFishing.hookset)');
    expect(block).toContain('flTensionTraceSvg(h, activeFishing.tensionSamples');
  });

  it('draws the tension band the fight was actually judged in', () => {
    const { getFishingTensionProfile } = window.__FisherLabCore;
    // Assist mode widens the band at both ends; the trace labels those edges,
    // so a hardcoded 30/72 would lie to every assisted student.
    const plain = getFishingTensionProfile(false, 0.5);
    const assisted = getFishingTensionProfile(true, 0.5);
    expect(plain).toMatchObject({ lower: 0.3, upper: 0.72 });
    expect(assisted.lower).toBeLessThan(plain.lower);
    expect(assisted.upper).toBeGreaterThan(plain.upper);

    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flTensionTraceSvg'), src.indexOf('// PLACING THE CAST'));
    expect(fig).toContain("Math.round(e[0] * 100) + '%'");
    expect(fig).not.toContain("'30%'");
    expect(fig).not.toContain("'72%'");
    // And it is handed the live profile rather than assuming one.
    expect(src).toContain('getFishingTensionProfile(activeFishing.assistMode, activeFishing.tension), why)');
  });

  it('survives a fight with no usable samples', () => {
    const { flTensionTraceSvg } = window.__FisherLabCore;
    const h = () => ({});
    expect(flTensionTraceSvg(h, [], {}, 'line-break')).toBeNull();
    expect(flTensionTraceSvg(h, null, {}, 'line-break')).toBeNull();
    expect(flTensionTraceSvg(h, [NaN, undefined], {}, 'slack-line')).toBeNull();
    // One sample is a legal fight: it must draw rather than divide by zero.
    expect(flTensionTraceSvg(h, [0.1], {}, 'slack-line')).not.toBeNull();
  });

  it('★ names both fight losses distinctly and says the correction', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flTensionTraceSvg'), src.indexOf('// PLACING THE CAST'));
    expect(fig).toContain("'LINE PARTED'");
    expect(fig).toContain("'HOOK THREW'");
    expect(fig).toContain('give line sooner when it rises');
    expect(fig).toContain('reel sooner when it falls');
  });
});

// ★ The regulations lookup. Measured across all 107 sections it was the largest
// one with nothing to look at: a five-column table where every size rule is a
// string you parse in your head, and comparing two species means reading down a
// column of numbers.
describe('Fisher Lab size-limit chart', () => {
  const core = () => window.__FisherLabCore;

  it('★ takes its bounds from the parser the simulator scores with', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const wiring = src.slice(src.indexOf('var charted = currentSpeciesList.map'), src.indexOf('SHELLFISH GAUGE') + 40);
    expect(wiring).toContain('getCoreFishRuleEvidence(0, sp, {})');
    expect(wiring).toContain('ev.minInches');
    expect(wiring).toContain('ev.maxInches');
    // Re-parsing the rule strings in the drawing would let the chart show a
    // limit the sim does not enforce, or hide one it does.
    const fig = src.slice(src.indexOf('function flSizeLimitChartSvg'), src.indexOf('// LOSING THE FISH'));
    expect(fig).not.toContain('.slot');
    expect(fig).not.toContain('minSize');
    expect(fig).not.toContain('carapace');
  });

  it('★ keeps carapace width off the total-length axis', () => {
    // A 5 inch crab and a 5 inch fish are not the same measurement, and one
    // shared axis would say they are.
    expect(core().isCoreCarapaceRule({ slot: '3.25" – 5" carapace' })).toBe(true);
    expect(core().isCoreCarapaceRule({ minSize: '3-1/4" carapace (min) / 5" (max)' })).toBe(true);
    expect(core().isCoreCarapaceRule({ slot: '5"+ carapace' })).toBe(true);
    expect(core().isCoreCarapaceRule({ minSize: 23, slot: null })).toBe(false);
    expect(core().isCoreCarapaceRule({})).toBe(false);
    expect(core().isCoreCarapaceRule(null)).toBe(false);

    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain("flSizeLimitChartSvg(h, byCarapace, 'SHELLFISH GAUGE', 'inches, carapace')");
    expect(src).toContain("flSizeLimitChartSvg(h, byLength, 'LEGAL SIZE WINDOW', 'inches, total length')");
  });

  it('★ clips the axis to the bulk of the data and says what ran off', () => {
    // Bluefin tuna's 73–81 inch slot scaled the axis to 95 and squeezed every
    // groundfish into the left third — a 9 inch redfish and a 24 inch dogfish
    // looked the same length. Clipping and SAYING so beats an unreadable
    // technically-complete axis.
    const fig = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const body = fig.slice(fig.indexOf('function flSizeLimitChartSvg'), fig.indexOf('// LOSING THE FISH'));
    expect(body).toContain('0.8 * (bounds.length - 1)');
    expect(body).toContain("'≫ ' + clipped + ' beyond '");
    // An off-scale species keeps its real numbers rather than being dropped.
    expect(body).toContain("'≫ ' + r.min + (slot ? '–' + r.max : '+') + '\"'");
  });

  it('★ moves a narrow slot label outside its own bar', () => {
    // The striped bass window is three inches wide; two numbers printed inside
    // it overprinted into nonsense.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const body = src.slice(src.indexOf('function flSizeLimitChartSvg'), src.indexOf('// LOSING THE FISH'));
    expect(body).toContain('var roomy = (right - left) >= 46');
    expect(body).toContain("textAnchor: roomy ? 'start' : 'end'");
  });

  it('collapses unscored species to one line rather than one row each', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const body = src.slice(src.indexOf('function flSizeLimitChartSvg'), src.indexOf('// LOSING THE FISH'));
    expect(body).toContain("'+' + unscored + ' more'");
    expect(body).toContain('no size limit the simulator scores');
  });

  it('declines to draw a chart with nothing in it', () => {
    const h = () => ({});
    expect(core().flSizeLimitChartSvg(h, [], 'T', 'in')).toBeNull();
    expect(core().flSizeLimitChartSvg(h, null, 'T', 'in')).toBeNull();
    expect(core().flSizeLimitChartSvg(h, [null, undefined], 'T', 'in')).toBeNull();
    // All-unscored is still worth one summary line.
    expect(core().flSizeLimitChartSvg(h, [{ name: 'x', min: null, max: null }], 'T', 'in')).not.toBeNull();
  });

  it('agrees with the rule the sim enforces for a known species', () => {
    // Cod: a 23 inch floor with no ceiling. The chart draws an open-ended bar
    // off exactly these two values.
    const cod = core().getCoreFishRuleEvidence(0, { name: 'Atlantic Cod', minSize: 23 }, {});
    expect(cod.minInches).toBe(23);
    expect(cod.maxInches).toBeNull();
    // Striped bass: a closed slot.
    const bass = core().getCoreFishRuleEvidence(0, { name: 'Striped Bass', slot: '28-31 inches (slot)' }, {});
    expect(bass.minInches).toBe(28);
    expect(bass.maxInches).toBe(31);
  });
});

// ★ Cold-water survival. 1-10-1 is a lesson about PROPORTION — one minute to
// get your breathing back, ten minutes of hands that work, one hour before the
// cold has you. Written as three numbers in a sentence they look like three
// comparable amounts of time.
describe('Fisher Lab cold-water timeline', () => {
  const span = (t) => window.__FisherLabCore.getCoreColdWaterSpan(t);

  it('reads each phase span out of the title that already states it', () => {
    // The titles are the single authored source; a second table of numbers
    // would be free to drift from the prose beside it.
    expect(span('1. Cold Shock (first 1 minute)')).toEqual({ from: 0, to: 1 });
    expect(span('2. Swim Failure (minutes 1-10)')).toEqual({ from: 1, to: 10 });
    expect(span('3. Hypothermia (10 min - 1 hr)')).toEqual({ from: 10, to: 60 });
  });

  it('★ does not mistake the list number for a duration', () => {
    // Every title starts "N." — read as minutes that would put cold shock at
    // one minute long starting from phase one.
    expect(span('4. Post-rescue Collapse')).toBeNull();
    expect(span('7. Something Untimed')).toBeNull();
  });

  it('converts hours so both ends of a span share a unit', () => {
    expect(span('(30 min - 2 hr)')).toEqual({ from: 30, to: 120 });
    expect(span('(1 hr - 3 hrs)')).toEqual({ from: 60, to: 180 });
  });

  it('refuses spans it cannot place on an axis', () => {
    expect(span('')).toBeNull();
    expect(span(null)).toBeNull();
    expect(span('Phase with no numbers')).toBeNull();
    // A lone duration with no anchor word is a length, not a position.
    expect(span('lasts 20 minutes')).toBeNull();
    // Backwards ranges are not spans.
    expect(span('(10 min - 2 min)')).toBeNull();
  });

  it('★ magnifies the head of the timeline instead of hiding it', () => {
    // On one linear hour the first minute is seven pixels and unlabellable;
    // on a magnifier alone you never see how short it really is.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flColdWaterTimelineSvg'), src.indexOf('function flHelpHuddleSvg'));
    expect(fig).toContain('minutes, magnified');
    expect(fig).toContain('the minute that drowns people is the narrow one');
    // Phases with no place on the clock are counted, not silently dropped.
    expect(fig).toContain("'+' + untimed + ' phase'");
  });

  it('draws the two positions the text asks a person to reproduce', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flHelpHuddleSvg'), src.indexOf('// THE SIZE-LIMIT CHART'));
    expect(fig).toContain('HELP — alone');
    expect(fig).toContain('HUDDLE — together');
    expect(fig).toContain("'aria-hidden': 'true'");
    // Both are wired under the prose that describes them.
    expect(src).toContain('flColdWaterTimelineSvg(h, COLD_WATER)');
    expect(src).toContain('flHelpHuddleSvg(h)');
  });
});

// ★ The wind warning ladder. Three warnings that mean three different days on
// the water, with their wind ranges buried mid-sentence in three paragraphs.
describe('Fisher Lab wind warning ladder', () => {
  const band = (t) => window.__FisherLabCore.getCoreWindBand(t);

  it('reads the wind range out of the trigger that states it', () => {
    expect(band('Sustained winds 21-33 kt OR seas 4+ ft hazardous to small craft')).toEqual({ from: 21, to: 33 });
    expect(band('Sustained winds 34-47 kt')).toEqual({ from: 34, to: 47 });
    expect(band('Sustained winds 48-63 kt')).toEqual({ from: 48, to: 63 });
    // An en dash is as common as a hyphen in authored copy.
    expect(band('Sustained winds 48–63 kt')).toEqual({ from: 48, to: 63 });
  });

  it('treats a bare floor as open-ended rather than as a range', () => {
    expect(band('Sustained winds 64+ kt')).toEqual({ from: 64, to: null });
  });

  it('★ invents no wind band for a scenario that has none', () => {
    // Fog is a visibility rule, a thunderstorm is a cloud, a nor easter is a
    // pressure pattern. Giving them wind numbers would be fabrication.
    expect(band('Visibility < 1 nm')).toBeNull();
    expect(band('Cumulonimbus + lightning')).toBeNull();
    expect(band('High pressure dome')).toBeNull();
    expect(band('Tropical or post-tropical system')).toBeNull();
    expect(band('')).toBeNull();
    expect(band(null)).toBeNull();
    // "seas 4+ ft" is a sea state, not a wind speed — it must not be read as one.
    expect(band('seas 4+ ft hazardous to small craft')).toBeNull();
  });

  it('★ colours the ladder from the same risk palette as the cards below it', () => {
    // Two palettes would let the chart and the list disagree about how serious
    // a warning is, in the same glance.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('flWindLadderSvg(h, WEATHER_SCENARIOS, function(risk) {');
    const fig = src.slice(src.indexOf('function flWindLadderSvg'), src.indexOf('// COLD WATER'));
    expect(fig).toContain('riskInk(r.risk)');
    // The builder holds no colours of its own for the bars.
    expect(fig).not.toContain("'#dc2626'");
    expect(fig).not.toContain("'#fbbf24'");
  });

  it('counts the scenarios it cannot place instead of dropping them', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flWindLadderSvg'), src.indexOf('// COLD WATER'));
    expect(fig).toContain("'+' + other + ' more'");
    expect(fig).toContain('not defined by wind speed');
  });
});

// ★ The VHF call triage. Mayday, Pan-Pan, Sécurité and a routine hail were four
// cards in a list — but they are not four topics. They are one decision taken
// in order of severity, and choosing between them under pressure is the skill.
describe('Fisher Lab VHF triage', () => {
  const name = (t) => window.__FisherLabCore.getCoreCallName(t);
  const test = (w) => window.__FisherLabCore.getCoreCallTest(w);

  it('strips the card gloss off the call name', () => {
    expect(name('MAYDAY (distress — life-threatening)')).toBe('MAYDAY');
    expect(name('PAN-PAN (urgency — situation requires assistance)')).toBe('PAN-PAN');
    expect(name('General hail (calling another vessel)')).toBe('General hail');
    expect(name('Radio Check')).toBe('Radio Check');
    expect(name('')).toBe('');
    expect(name(null)).toBe('');
  });

  it('splits the condition from its examples', () => {
    expect(test('Imminent threat to life: fire, sinking, person overboard.')).toEqual({
      test: 'Imminent threat to life',
      examples: 'fire, sinking, person overboard.',
    });
    // No colon means the whole thing is the condition, with nothing dropped.
    expect(test('Calling someone for non-emergency contact.')).toEqual({
      test: 'Calling someone for non-emergency contact.',
      examples: '',
    });
    expect(test(null)).toEqual({ test: '', examples: '' });
  });

  it('★ orders the rungs by severity, not by authoring order', () => {
    // Working down the ladder IS the decision; any other order teaches nothing.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flVhfTriageSvg'), src.indexOf('// THE WIND WARNING LADDER'));
    expect(fig).toContain("var order = ['mayday', 'panpan', 'securite', 'general-hail']");
    expect(fig).toContain('WORK DOWN UNTIL ONE FITS');
    expect(fig).toContain('EVERY CALL OPENS ON CHANNEL 16');
  });

  it('★ admits the call types the ladder does not cover', () => {
    // A flow headed "WHICH CALL?" that quietly drops one reads as a complete
    // list of them — a radio check is a fifth script and not a severity rung.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flVhfTriageSvg'), src.indexOf('// THE WIND WARNING LADDER'));
    expect(fig).toContain('not part of this severity ladder');
    expect(fig).toContain('order.indexOf(v.id) < 0');
  });

  it('takes its channels from the scripts rather than restating them', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flVhfTriageSvg'), src.indexOf('// THE WIND WARNING LADDER'));
    expect(fig).toContain("'Ch ' + (st.channel");
    // The builder holds no call colours of its own; the tab passes the palette
    // the cards below already use.
    expect(fig).toContain('inkFor(st.id)');
    expect(fig).not.toContain("'#f87171'");
    expect(src).toContain('flVhfTriageSvg(h, VHF_SCRIPTS, function(id) {');
  });

  it('degrades rather than throwing when a script is missing', () => {
    const { flVhfTriageSvg } = window.__FisherLabCore;
    const h = () => ({});
    const ink = () => '#fff';
    expect(flVhfTriageSvg(h, [], ink)).toBeNull();
    expect(flVhfTriageSvg(h, null, ink)).toBeNull();
    expect(flVhfTriageSvg(h, [{ id: 'unknown', type: 'X', when: 'y' }], ink)).toBeNull();
    expect(flVhfTriageSvg(h, [{ id: 'mayday', type: 'MAYDAY (x)', channel: '16', when: 'a: b' }], ink)).not.toBeNull();
  });
});

// ★ The licence ladder. The section opens by promising "below is the ladder"
// and then renders six flat cards. The ladder is the thing worth seeing: what
// you can hold at what age, and that the trap limit goes from ten to eight
// hundred the moment you cross eighteen.
describe('Fisher Lab licence ladder', () => {
  const gate = (a) => window.__FisherLabCore.getCoreAgeGate(a);

  it('prefers an explicit range over the bound in the same sentence', () => {
    // "Under 18 (typically 8-17)" carries both; the range is the real gate.
    expect(gate('Under 18 (typically 8-17)')).toEqual({ from: 8, to: 17 });
  });

  it('reads an open-ended floor as open-ended', () => {
    expect(gate('18+')).toEqual({ from: 18, to: null });
    expect(gate('~16+ (varies)')).toEqual({ from: 16, to: null });
  });

  it('★ treats "any age" as no gate at all, not as age zero', () => {
    // A tier open to everyone is a separate track, not the bottom rung of a
    // progression — drawn as rung zero it would read as the place to start.
    expect(gate('Any (Maine resident)')).toBeNull();
    expect(gate('')).toBeNull();
    expect(gate(null)).toBeNull();

    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flLicenseLadderSvg'), src.indexOf('function getCoreHullLength'));
    expect(fig).toContain('any age — separate track');
    expect(fig).toContain('return r.gate;');
  });

  it('handles "under N" with no companion range', () => {
    expect(gate('Under 21')).toEqual({ from: null, to: 21 });
  });

  it('★ prints trap limits as numbers, not as a bar', () => {
    // 0, 5, 10 and 800 share no usable scale; a bar would render the first
    // three invisible and imply the fishery starts at Class I.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flLicenseLadderSvg'), src.indexOf('function getCoreHullLength'));
    expect(fig).toContain('share no usable scale');
    expect(fig).toContain("r.traps == null ? '—' : String(r.traps)");
    // Eighteen is marked, because that is where the fishery opens up.
    expect(fig).toContain('at(18)');
  });

  it('takes tier colours from the tab rather than holding its own', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('flLicenseLadderSvg(h, LOBSTER_LICENSE, function(tier) {');
    const fig = src.slice(src.indexOf('function flLicenseLadderSvg'), src.indexOf('function getCoreHullLength'));
    expect(fig).toContain('inkFor(r.tier)');
    expect(fig).not.toContain("'#38bdf8'");
  });
});

// ★ The fleet. "From open skiffs to 90-ft draggers" is a sixfold spread that
// six equally-sized cards flatten completely.
describe('Fisher Lab fleet scale', () => {
  const len = (n) => window.__FisherLabCore.getCoreHullLength(n);

  it('reads the length range out of the name that states it', () => {
    expect(len('Open Skiff (14-18 ft)')).toEqual({ from: 14, to: 18 });
    expect(len('Dragger / Trawler (40-90 ft)')).toEqual({ from: 40, to: 90 });
    expect(len('Maine Lobsterboat (28–42 ft)')).toEqual({ from: 28, to: 42 });
  });

  it('accepts a single length as a range of one', () => {
    expect(len('Peapod (12 ft)')).toEqual({ from: 12, to: 12 });
  });

  it('★ invents no length for a type that gives none', () => {
    expect(len('Sailing Vessel')).toBeNull();
    expect(len('Pontoon Boat (lakes only)')).toBeNull();
    expect(len('')).toBeNull();
    expect(len(null)).toBeNull();

    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flFleetScaleSvg'), src.indexOf('// THE VHF CALL TRIAGE'));
    expect(fig).toContain("'+' + unsized + ' more'");
    expect(fig).toContain('no length given');
  });

  it('draws every hull from a common zero so the lengths compare', () => {
    // Bars that each started at their own minimum would compare nothing.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flFleetScaleSvg'), src.indexOf('// THE VHF CALL TRIAGE'));
    expect(fig).toContain('var left = at(0)');
    expect(src).toContain('flFleetScaleSvg(h, BOAT_TYPES)');
  });

  it('declines to draw a fleet with no lengths in it', () => {
    const h = () => ({});
    expect(window.__FisherLabCore.flFleetScaleSvg(h, [])).toBeNull();
    expect(window.__FisherLabCore.flFleetScaleSvg(h, null)).toBeNull();
    expect(window.__FisherLabCore.flFleetScaleSvg(h, [{ name: 'Sailing Vessel' }])).toBeNull();
  });
});

// ★ Where these places actually are. Two sections list places and leave you to
// picture them — eight ports "each with its own character", and the grounds,
// "some inshore, some offshore". Both already carried real coordinates, so the
// map was sitting in the data unplotted.
describe('Fisher Lab coast map', () => {
  const at = (c) => window.__FisherLabCore.getCoreLatLon(c);

  it('reads both ways the same coordinate is written', () => {
    // The ports use a prime and no comma; the grounds use an apostrophe, a
    // comma, a leading tilde and sometimes a trailing note.
    expect(at('43°39′N 70°15′W')).toEqual({ lat: 43.65, lon: -70.25 });
    expect(at("~42°55' N, 68°40' W (offshore)")).toEqual({ lat: 42 + 55 / 60, lon: -(68 + 40 / 60) });
    expect(at('44°09′N 68°40′W').lat).toBeCloseTo(44.15, 6);
  });

  it('★ signs the hemisphere rather than dropping it', () => {
    // West longitudes are negative; treated as positive, Maine plots into Asia
    // and the whole east-to-west ordering reverses.
    expect(at('43°39′N 70°15′W').lon).toBeLessThan(0);
    expect(at('43°39′S 70°15′E')).toEqual({ lat: -43.65, lon: 70.25 });
  });

  it('refuses a coordinate missing either half', () => {
    expect(at('43°39′N')).toBeNull();
    expect(at('70°15′W')).toBeNull();
    expect(at('Penobscot Bay')).toBeNull();
    expect(at('')).toBeNull();
    expect(at(null)).toBeNull();
  });

  it('★ draws no coastline it does not have', () => {
    // Inventing a shore would put land where the tool has no idea whether
    // there is any, on a figure people will read as a chart.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flCoastMapSvg'), src.indexOf('// THE LICENSE LADDER'));
    expect(fig).toContain('positions only — no coastline, not for navigation');
    expect(fig).toContain('it is not a route');
    // And it says how many places it could not place.
    expect(fig).toContain("' without coordinates omitted'");
  });

  it('★ corrects longitude for latitude so the shape is not stretched', () => {
    // A degree of longitude is shorter than a degree of latitude by cos(lat).
    // Plotted one-for-one the coast comes out wrong-shaped, which is a false
    // claim rather than a stylistic one.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flCoastMapSvg'), src.indexOf('// THE LICENSE LADDER'));
    expect(fig).toContain('Math.cos(midLat * Math.PI / 180)');
    expect(fig).toContain('squeeze');
  });

  it('★ places a label by where its pin is, not by its index', () => {
    // A pin in the right-hand third with a label anchored 'start' runs off the
    // plot and is clipped away by the viewBox.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flCoastMapSvg'), src.indexOf('// THE LICENSE LADDER'));
    expect(fig).toContain('var right = px < PAD + plotW * 0.62');
    expect(fig).not.toContain('var right = i % 2 === 0');
  });

  it('needs two placeable points before it claims to be a map', () => {
    const h = () => ({});
    const map = window.__FisherLabCore.flCoastMapSvg;
    expect(map(h, [], 'T', '#fff')).toBeNull();
    expect(map(h, null, 'T', '#fff')).toBeNull();
    expect(map(h, [{ name: 'A', coords: '43°39′N 70°15′W' }], 'T', '#fff')).toBeNull();
    expect(map(h, [{ name: 'A', coords: 'nowhere' }, { name: 'B', coords: 'nowhere' }], 'T', '#fff')).toBeNull();
    expect(map(h, [
      { name: 'A', coords: '43°39′N 70°15′W' },
      { name: 'B', coords: '44°09′N 68°40′W' },
    ], 'T', '#fff')).not.toBeNull();
  });

  it('is wired into both sections that carry coordinates', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain("flCoastMapSvg(h, MAINE_PORTS, 'THE EIGHT PORTS'");
    expect(src).toContain("flCoastMapSvg(h, FISHING_SPOTS, 'THE GROUNDS'");
  });
});

// ★ Harbour profiles. Each harbour states a channel depth and a tidal range in
// prose. The interesting question is comparative — which is shallowest, where
// does the tide dominate — and ten cards answer neither.
describe('Fisher Lab harbour profiles', () => {
  const ft = (t) => window.__FisherLabCore.getCoreFeetRange(t);

  it('reads a range or a single figure out of the prose', () => {
    expect(ft('20-40 ft main channel')).toEqual({ from: 20, to: 40 });
    expect(ft('~9 ft mean')).toEqual({ from: 9, to: 9 });
    expect(ft('18-25 ft (extreme!)')).toEqual({ from: 18, to: 25 });
    expect(ft('30-100 ft (Frenchman Bay is deep)')).toEqual({ from: 30, to: 100 });
  });

  it('★ reports no figure where the data gives none', () => {
    // "Varies dramatically with tide" is a real entry. Read as zero it would
    // draw the shallowest harbour on the chart.
    expect(ft('Varies dramatically with tide')).toBeNull();
    expect(ft('Variable; many shallow areas + ledges')).toBeNull();
    expect(ft('')).toBeNull();
    expect(ft(null)).toBeNull();
  });

  it('★ clips to the working depths and marks what runs past', () => {
    // One harbour is a 300 ft deep bay. Scaled to it, the fifteen-to-forty foot
    // channels most boats use are squeezed into a tenth of the width.
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flHarborProfileSvg'), src.indexOf('function getCoreServiceHours'));
    expect(fig).toContain('0.8 * (bounds.length - 1)');
    expect(fig).toContain("'≫ ' + clipped + ' beyond '");
    // A clipped bar keeps its real numbers rather than appearing to end at the rim.
    expect(fig).toContain('var dOff = r.depth.to > axisMax');
  });

  it('names both quantities rather than leaving two bars to be guessed', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flHarborProfileSvg'), src.indexOf('function getCoreServiceHours'));
    expect(fig).toContain('charted channel depth');
    expect(fig).toContain('tidal range');
    expect(src).toContain('flHarborProfileSvg(h, HARBOR_DETAILS)');
  });

  it('draws a harbour that has only one of the two figures', () => {
    const h = () => ({});
    const svg = window.__FisherLabCore.flHarborProfileSvg;
    // Cobscook Bay is exactly this: an extreme tide and no stable charted depth.
    expect(svg(h, [{ name: 'A', tidal_range: '18-25 ft (extreme!)', depths: 'Varies with tide' }])).not.toBeNull();
    expect(svg(h, [{ name: 'A', depths: '20-40 ft' }])).not.toBeNull();
    expect(svg(h, [{ name: 'A', depths: 'Variable', tidal_range: 'unknown' }])).toBeNull();
    expect(svg(h, [])).toBeNull();
    expect(svg(h, null)).toBeNull();
  });
});

// ★ Service intervals. Every system states how often it needs attention, and
// the comparison — a legacy two-stroke against a diesel — is the whole point.
describe('Fisher Lab service intervals', () => {
  const hrs = (t) => window.__FisherLabCore.getCoreServiceHours(t);

  it('★ takes the shortest interval a schedule quotes', () => {
    // A schedule may name several. The one that matters is the soonest, because
    // that is when you are next under the cowl.
    expect(hrs('Every 100 hr or annually (whichever first): oil + filter, lower-unit gear oil, water-pump impeller every 2 yr or 200 hr, plugs every 200 hr.')).toBe(100);
    expect(hrs('Every 50 hr: plugs, gear oil. Every season: fuel system, impeller every 2 yr.')).toBe(50);
    expect(hrs('Every 200 hr: oil + filters. Coolant every 2 yr. Heat exchanger flush every 5 yr.')).toBe(200);
  });

  it('★ leaves a calendar-only system off an hours axis', () => {
    // Engine hours and calendar time are different clocks. Placed at zero, an
    // annually-serviced item would read as the most demanding on the list.
    expect(hrs('Annual: fuel filter + water separator. Pre-season + post-season: fuel inspection.')).toBeNull();
    expect(hrs('Annual: battery load test, terminal corrosion clean.')).toBeNull();
    expect(hrs('Annual sanding + repaint of antifouling. Wax topsides 2x/yr.')).toBeNull();
    expect(hrs('')).toBeNull();
    expect(hrs(null)).toBeNull();

    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const fig = src.slice(src.indexOf('function flServiceIntervalSvg'), src.indexOf('// WHERE THESE PLACES ACTUALLY ARE'));
    expect(fig).toContain('on the calendar, not the hour meter');
    expect(fig).toContain("'+' + calendarOnly + ' more'");
  });

  it('does not read a year figure as an hour figure', () => {
    // "every 2 yr" and "every 5 yr" appear in the same sentences as hours.
    expect(hrs('Coolant every 2 yr. Belts annual.')).toBeNull();
    expect(hrs('Impeller every 2 yr or 200 hr')).toBe(200);
  });

  it('is wired and orders the systems by how soon they come round', () => {
    const src = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    expect(src).toContain('flServiceIntervalSvg(h, ENGINE_MAINT)');
    const fig = src.slice(src.indexOf('function flServiceIntervalSvg'), src.indexOf('// WHERE THESE PLACES ACTUALLY ARE'));
    expect(fig).toContain('return a.hours - b.hours');
  });
});
