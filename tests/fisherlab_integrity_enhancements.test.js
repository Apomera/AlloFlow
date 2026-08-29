import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
});

describe('Fisher Lab direction-aware buoyage', () => {
  it('uses coastal outbound marks but follows the authored Great Lakes conventional direction', () => {
    const { getCoreVoyageBuoyageCheck } = window.__FisherLabCore;

    ['maine', 'chesapeake', 'pnw'].forEach((region) => {
      expect(getCoreVoyageBuoyageCheck(region)).toMatchObject({
        region,
        direction: 'outbound',
        markType: 'green-can',
        color: 'green',
        expectedSide: 'starboard'
      });
    });
    expect(getCoreVoyageBuoyageCheck('greatlakes')).toMatchObject({
      region: 'greatlakes',
      direction: 'conventional',
      markType: 'red-nun',
      color: 'red',
      expectedSide: 'starboard'
    });
  });

  it('places the checked lateral mark in the starboard lane for every regional voyage', () => {
    const { getCoreVoyageBuoyageLayout } = window.__FisherLabCore;

    ['maine', 'chesapeake', 'pnw'].forEach((region) => {
      expect(getCoreVoyageBuoyageLayout(region)).toEqual({
        region,
        direction: 'outbound',
        starboardMarkType: 'green-can',
        portMarkType: 'red-nun'
      });
    });
    expect(getCoreVoyageBuoyageLayout('greatlakes')).toEqual({
      region: 'greatlakes',
      direction: 'conventional',
      starboardMarkType: 'red-nun',
      portMarkType: 'green-can'
    });
  });

  it('keeps green to starboard and red to port while outbound', () => {
    const { evaluateCoreBuoyPass } = window.__FisherLabCore;

    expect(evaluateCoreBuoyPass('outbound', 'green', 'starboard')).toMatchObject({
      correct: true,
      expectedSide: 'starboard'
    });
    expect(evaluateCoreBuoyPass('outbound', 'red', 'port')).toMatchObject({
      correct: true,
      expectedSide: 'port'
    });
    expect(evaluateCoreBuoyPass('outbound', 'red', 'starboard')).toMatchObject({
      correct: false,
      expectedSide: 'port'
    });
    expect(evaluateCoreBuoyPass('outbound', 'green', 'port').correct).toBe(false);
    expect(evaluateCoreBuoyPass('outbound', 'green', 'starboard').ruleLabel).toMatch(/outbound|seaward/i);
  });

  it('reverses the lateral marks when returning from sea', () => {
    const { evaluateCoreBuoyPass } = window.__FisherLabCore;

    expect(evaluateCoreBuoyPass('returning', 'red', 'starboard')).toMatchObject({
      correct: true,
      expectedSide: 'starboard'
    });
    expect(evaluateCoreBuoyPass('returning', 'green', 'port')).toMatchObject({
      correct: true,
      expectedSide: 'port'
    });
    expect(evaluateCoreBuoyPass('returning', 'red', 'port').correct).toBe(false);
  });

  it('uses red to starboard and green to port in the charted conventional direction', () => {
    const { evaluateCoreBuoyPass } = window.__FisherLabCore;

    expect(evaluateCoreBuoyPass('conventional', 'red', 'starboard')).toMatchObject({
      correct: true,
      expectedSide: 'starboard'
    });
    expect(evaluateCoreBuoyPass('conventional', 'green', 'port')).toMatchObject({
      correct: true,
      expectedSide: 'port'
    });
    expect(evaluateCoreBuoyPass('conventional', 'red', 'port').correct).toBe(false);
    expect(evaluateCoreBuoyPass('conventional', 'green', 'starboard').correct).toBe(false);
    expect(evaluateCoreBuoyPass('conventional', 'red', 'starboard').ruleLabel).toMatch(/conventional/i);
  });

  it('lets the regional buoyage check name the first voyage objective', () => {
    const {
      getCoreEncounter,
      getCoreObjective,
      getCoreSimProfile,
      getCoreVoyageBuoyageCheck
    } = window.__FisherLabCore;
    const greatLakesCheck = getCoreVoyageBuoyageCheck('greatlakes');

    expect(getCoreObjective(
      {},
      getCoreSimProfile('greatlakes'),
      getCoreEncounter('greatlakes'),
      greatLakesCheck
    )).toMatchObject({
      id: 'buoy',
      label: greatLakesCheck.objectiveLabel
    });
    expect(greatLakesCheck.objectiveLabel).toMatch(/red nun/i);
  });

  it('wires the simulator check and objective target to the regional buoyage contract', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('function initHarborSim');
    const end = source.indexOf('function _renderFisherLab', start);
    const scene = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(scene).toContain('var buoyageCheck = getCoreVoyageBuoyageCheck(activeRegion)');
    expect(scene).toContain('bb.userData.type !== buoyageCheck.markType');
    expect(scene).toContain('evaluateCoreBuoyPass(buoyageCheck.direction, buoyageCheck.color');
    expect(scene).toContain('buoys[ob].userData.type === buoyageCheck.markType');
    expect(scene).not.toContain("bb.userData.type !== 'green-can'");
    expect(scene).not.toContain("buoys[ob].userData.type === 'green-can'");
  });

  it('builds every lateral pair from the regional port and starboard lane layout', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('function initHarborSim');
    const end = source.indexOf('function _renderFisherLab', start);
    const scene = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(scene).toContain('var buoyageLayout = getCoreVoyageBuoyageLayout(activeRegion)');
    [
      "addBuoy(6, -10, buoyageLayout.portMarkType)",
      "addBuoy(-6, -10, buoyageLayout.starboardMarkType)",
      "addBuoy(7, -30, buoyageLayout.portMarkType)",
      "addBuoy(-7, -30, buoyageLayout.starboardMarkType)",
      "addBuoy(9, -55, buoyageLayout.portMarkType)",
      "addBuoy(-9, -55, buoyageLayout.starboardMarkType)"
    ].forEach((placement) => expect(scene).toContain(placement));
    expect(scene).not.toContain("addBuoy(6, -10, 'red-nun')");
    expect(scene).not.toContain("addBuoy(-6, -10, 'green-can')");
  });

  it('removes the backwards outbound instruction from the playable mission', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('Pass at least one red nun on your starboard side outbound');
    expect(source).not.toContain("label: 'Pass red nun on starboard'");
  });
});

describe('Fisher Lab regional trap scene profile', () => {
  const expectedProfiles = {
    maine: {
      region: 'maine',
      specimenType: 'lobster',
      gearLabel: 'lobster trap',
      markerLabel: 'Lobster Trap',
      actionLabel: 'Haul lobster trap',
      showLobsterModel: true
    },
    chesapeake: {
      region: 'chesapeake',
      specimenType: 'crab',
      gearLabel: 'blue crab pot',
      markerLabel: 'Blue Crab Pot',
      actionLabel: 'Haul blue crab pot',
      showLobsterModel: false
    },
    pnw: {
      region: 'pnw',
      specimenType: 'crab',
      gearLabel: 'Dungeness crab pot',
      markerLabel: 'Dungeness Crab Pot',
      actionLabel: 'Haul Dungeness crab pot',
      showLobsterModel: false
    },
    greatlakes: {
      region: 'greatlakes',
      specimenType: 'crayfish',
      gearLabel: 'crayfish gear',
      markerLabel: 'Crayfish Gear',
      actionLabel: 'Inspect crayfish gear',
      showLobsterModel: false
    }
  };

  it('describes truthful gear, marker, specimen, and model copy for every region', () => {
    const { getCoreTrapActionLabel, getCoreTrapSceneProfile } = window.__FisherLabCore;

    Object.entries(expectedProfiles).forEach(([region, expected]) => {
      const profile = getCoreTrapSceneProfile(region);
      expect(profile).toEqual(expected);
      expect(profile.actionLabel).toBe(getCoreTrapActionLabel(region));
    });
  });

  it('falls back to a fresh Maine-shaped profile for an invalid region', () => {
    const { getCoreTrapActionLabel, getCoreTrapSceneProfile } = window.__FisherLabCore;
    const fallback = getCoreTrapSceneProfile('not-a-region');
    const maine = getCoreTrapSceneProfile('maine');

    expect(fallback).toEqual(expectedProfiles.maine);
    expect(fallback.actionLabel).toBe(getCoreTrapActionLabel('not-a-region'));
    expect(fallback).not.toBe(maine);
    fallback.markerLabel = 'Changed marker';
    expect(getCoreTrapSceneProfile('maine')).toEqual(expectedProfiles.maine);
  });

  it('wires marker labels, haul copy, specimen type, and lobster visibility through the profile', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('function initHarborSim');
    const end = source.indexOf('function _renderFisherLab', start);
    const scene = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(scene).toContain('var trapSceneProfile = getCoreTrapSceneProfile(activeRegion)');
    ['#1', '#2', '#3'].forEach((number) => {
      expect(scene).toContain("trapSceneProfile.markerLabel + ' " + number + "'");
    });
    expect(scene).toContain('lobsterGroup.visible = trapSceneProfile.showLobsterModel');
    expect(scene).toContain("flAnnounce(trapSceneProfile.actionLabel + '...')");
    expect(scene).toContain("statusCb({ type: 'haul-start', text: trapSceneProfile.actionLabel");
    expect(scene).toContain('specimenType: trapSceneProfile.specimenType');
    expect(scene).not.toContain("'Lobster Trap #1'");
    expect(scene).not.toContain("flAnnounce('Hauling lobster trap...')");
    expect(scene).not.toContain("specimenType: (activeRegion === 'chesapeake'");
  });
});

describe('Fisher Lab campaign completion integrity', () => {
  it('maps only the passed Maine core voyage into the Mission 1 namespace', () => {
    const { getCoreMissionCompletionKeys } = window.__FisherLabCore;
    const canonical = (keys) => keys.filter((key) => /^mission-\d+$/.test(key));

    const maineKeys = getCoreMissionCompletionKeys('maine', 'guided');
    expect(canonical(maineKeys)).toEqual(['mission-1']);
    expect(maineKeys.some((key) => key.startsWith('core-maine'))).toBe(true);

    ['chesapeake', 'pnw', 'greatlakes'].forEach((region) => {
      expect(canonical(getCoreMissionCompletionKeys(region, 'guided'))).toEqual([]);
    });
  });

  it('counts only canonical, in-range missions and clamps progress to 100 percent', () => {
    const { getCoreMissionProgress } = window.__FisherLabCore;

    expect(getCoreMissionProgress({
      'mission-1': true,
      'core-maine': true,
      'core-maine-guided': true
    }, 13)).toEqual({ count: 1, percent: 8 });

    const completed = Object.fromEntries(
      Array.from({ length: 20 }, (_, index) => [`mission-${index + 1}`, true])
    );
    completed['core-maine-master'] = true;
    completed['mission-not-a-number'] = true;

    expect(getCoreMissionProgress(completed, 13)).toEqual({ count: 13, percent: 100 });
    expect(getCoreMissionProgress({ 'mission-1': false, 'mission-2': true }, 13)).toEqual({ count: 1, percent: 8 });
  });

  it('uses the canonical completion and progress helpers in persistence and the briefing', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).toContain('getCoreMissionCompletionKeys(region');
    expect(source).toContain('getCoreMissionProgress(completedState, MISSIONS.length)');
  });
});

describe('Fisher Lab challenge standards', () => {
  it('requires both the advertised accuracy and fuel reserve at their inclusive boundaries', () => {
    const { evaluateCoreChallengeStandard } = window.__FisherLabCore;

    expect(evaluateCoreChallengeStandard('master', 90, 30)).toEqual({
      met: true,
      accuracyMet: true,
      fuelMet: true,
      requiredAccuracy: 90,
      requiredFuel: 30
    });
    expect(evaluateCoreChallengeStandard('master', 89, 100)).toMatchObject({
      met: false,
      accuracyMet: false,
      fuelMet: true
    });
    expect(evaluateCoreChallengeStandard('master', 100, 29)).toMatchObject({
      met: false,
      accuracyMet: true,
      fuelMet: false
    });
    expect(evaluateCoreChallengeStandard('guided', 60, 15).met).toBe(true);
  });

  it('requires a correct COLREGS decision and an on-time maneuver even when Guided accuracy passes', () => {
    const { evaluateCoreVoyageStandard } = window.__FisherLabCore;

    expect(evaluateCoreVoyageStandard('guided', 67, 100, true, false)).toMatchObject({
      met: true,
      accuracyMet: true,
      fuelMet: true,
      trafficDecisionMet: true,
      maneuverMet: true
    });
    expect(evaluateCoreVoyageStandard('guided', 67, 100, false, false)).toMatchObject({
      met: false,
      accuracyMet: true,
      trafficDecisionMet: false,
      maneuverMet: true
    });
    expect(evaluateCoreVoyageStandard('guided', 67, 100, true, true)).toMatchObject({
      met: false,
      trafficDecisionMet: true,
      maneuverMet: false
    });
  });

  it('gates mission completion in the safe-return path instead of using standards as display copy', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('// A safe return completes the run');
    const end = source.indexOf('// Fishing key trigger', start);
    const completionBlock = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(completionBlock).toContain('evaluateCoreVoyageStandard');
    expect(completionBlock).toContain('boatState.trafficDecisionCorrect');
    expect(completionBlock).toContain('boatState.trafficManeuverReviewed');
    expect(completionBlock).toMatch(/if\s*\([^)]*(?:challengeStandard\.met|standardMet)/);
    expect(completionBlock.indexOf('evaluateCoreVoyageStandard')).toBeLessThan(
      completionBlock.indexOf('missionComplete = true')
    );
  });
});

describe('Fisher Lab achievement and journal integrity', () => {
  it('derives core achievements from saved evidence while preserving prior unlocks', () => {
    const { deriveCoreAchievements } = window.__FisherLabCore;
    const journal = Array.from({ length: 5 }, (_, index) => ({
      observationId: `observation-${index + 1}`,
      speciesId: `species-${index + 1}`,
      identificationCorrect: true,
      action: index === 0 ? 'retain' : 'release',
      ruleCorrect: true,
      correct: true
    }));

    expect(deriveCoreAchievements({
      achievements: { 'quiz-master': true },
      completedMissions: { 'mission-1': true },
      journal,
      coreTrips: 1,
      regsViolations: 0
    })).toMatchObject({
      'quiz-master': true,
      'first-cast': true,
      'red-right': true,
      'first-keeper': true,
      'species-id-bronze': true,
      'sustainable-fisher': true
    });

    expect(deriveCoreAchievements({
      journal: [{ speciesId: 'cod', identificationCorrect: true, action: 'retain', ruleCorrect: false, correct: false }],
      coreTrips: 1,
      regsViolations: 1
    })).not.toMatchObject({
      'first-keeper': true,
      'sustainable-fisher': true
    });

    expect(deriveCoreAchievements({
      journal: [{ speciesId: 'cod', identificationCorrect: false, action: 'retain', ruleCorrect: true }],
      coreTrips: 1,
      regsViolations: 0
    })).not.toMatchObject({ 'first-keeper': true });

    expect(deriveCoreAchievements({
      cleanCoreTrips: 1,
      regsViolations: 2
    })).toMatchObject({ 'sustainable-fisher': true });

    const unassessedIdentifications = Array.from({ length: 5 }, (_, index) => ({
      speciesId: `unassessed-${index + 1}`,
      identificationCorrect: null,
      ruleCorrect: true,
      correct: true
    }));
    expect(deriveCoreAchievements({ journal: unassessedIdentifications })).not.toMatchObject({ 'species-id-bronze': true });
  });

  it('logs retained, released, and review-needed observations exactly once', () => {
    const { appendCoreJournalObservation } = window.__FisherLabCore;
    const released = {
      observationId: 'cod-001',
      speciesId: 'cod',
      label: 'Atlantic cod',
      length: 21,
      action: 'release',
      identificationCorrect: true,
      ruleCorrect: false,
      region: 'maine'
    };
    const retained = {
      observationId: 'mackerel-001',
      speciesId: 'mackerel',
      label: 'Atlantic mackerel',
      length: 14,
      action: 'retain',
      identificationCorrect: true,
      ruleCorrect: true,
      region: 'maine'
    };

    const afterRelease = appendCoreJournalObservation([], released);
    expect(afterRelease).toHaveLength(1);
    expect(afterRelease[0]).toMatchObject({
      observationId: 'cod-001',
      speciesId: 'cod',
      action: 'release',
      identificationCorrect: true,
      ruleCorrect: false
    });

    const afterRetain = appendCoreJournalObservation(afterRelease, retained);
    expect(afterRetain).toHaveLength(2);
    expect(afterRetain[1]).toMatchObject({ observationId: 'mackerel-001', action: 'retain' });

    expect(appendCoreJournalObservation(afterRetain, { ...released, action: 'retain' })).toEqual(afterRetain);
    const afterReview = appendCoreJournalObservation(afterRetain, {
      observationId: 'unknown-001',
      speciesId: 'cod',
      action: 'release',
      identificationCorrect: false,
      evidence: 'Selected the wrong diagnostic field marks'
    });
    expect(afterReview).toHaveLength(3);
    expect(afterReview[2]).toMatchObject({
      observationId: 'unknown-001',
      speciesId: 'cod',
      action: 'release',
      identificationCorrect: false,
      evidence: 'Selected the wrong diagnostic field marks'
    });
  });
});

describe('Fisher Lab persisted-state normalization', () => {
  it('rebuilds safe defaults from valid but malformed saved shapes', () => {
    const normalize = window.__FisherLabCore.normalizeFisherLabState;
    const state = normalize({
      region: 'toString',
      currentMission: 'mission-999',
      completedMissions: ['mission-1'],
      speciesCaught: 'cod',
      lifeLog: { speciesId: 'cod' },
      regsViolations: -4,
      coreVoyageMode: 'expert',
      coreAttempts: 'bad',
      coreTrips: Infinity,
      achievements: null,
      bestCoreScores: [],
      bestCoreRanks: 'gold',
      a11y: { staticCamera: 'yes', captionMode: true, largeText: 1 }
    });

    expect(state).toMatchObject({
      region: 'maine',
      currentMission: null,
      regsViolations: 0,
      coreVoyageMode: 'guided',
      coreAttempts: 0,
      coreTrips: 0,
      a11y: { staticCamera: false, captionMode: true, largeText: false }
    });
    expect(state.completedMissions).toEqual({});
    expect(state.speciesCaught).toEqual({});
    expect(state.lifeLog).toEqual([]);
  });

  it('preserves valid progress as canonical detached data', () => {
    const normalize = window.__FisherLabCore.normalizeFisherLabState;
    const input = {
      region: 'pnw',
      currentMission: 'mission-1',
      completedMissions: { 'mission-1': true, 'mission-2': 'true', constructor: true },
      speciesCaught: { cod: '2', haddock: -1 },
      lifeLog: [{ observationId: 'obs-1', speciesId: 'chinook' }],
      regsViolations: '3',
      coreVoyageMode: 'master',
      coreAttempts: '7',
      bestCoreScores: { pnw: '84' },
      bestCoreRanks: { 'pnw:master': 'gold', 'pnw:guided': 'platinum' }
    };

    const state = normalize(input);
    expect(state).toMatchObject({
      region: 'pnw',
      currentMission: 'mission-1',
      regsViolations: 3,
      coreVoyageMode: 'master',
      coreAttempts: 7,
      bestCoreScores: { pnw: 84 },
      bestCoreRanks: { 'pnw:master': 'gold' }
    });
    expect(state.completedMissions).toEqual({ 'mission-1': true });
    expect(state.speciesCaught).toEqual({ cod: 2 });

    state.lifeLog[0].speciesId = 'mutated';
    state.completedMissions['mission-1'] = false;
    expect(input.lifeLog[0].speciesId).toBe('chinook');
    expect(input.completedMissions['mission-1']).toBe(true);
  });

  it('normalizes storage reads and reports durable write outcomes', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const block = source.slice(source.indexOf("var FL_KEY = 'fisherLab.state.v1'"), source.indexOf('// THREE.JS LOADER'));

    expect(block).toContain('return normalizeFisherLabState(raw ? JSON.parse(raw) : {});');
    expect(block).toContain('return normalizeFisherLabState({});');
    expect(block).toContain('function writeFisherLabState(storage, value)');
    expect(block).toContain('var serialized = JSON.stringify(normalized);');
    expect(block).toContain('storage.setItem(FL_KEY, serialized);');
    expect(block).toContain("return { ok: true, state: normalized, bytes: serialized.length, error: null };");
    expect(block).toContain("return { ok: false, state: normalized, bytes: 0, error: 'storage-unavailable' };");
    expect(block).toContain('return writeFisherLabState(window.localStorage, s);');
  });
});

describe('Fisher Lab replay and regional identity integrity', () => {
  it('resets voyage elapsed time when replaying a mission', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('restartMission: function()');
    const end = source.indexOf('\n      }\n    };', start);
    const restartBlock = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(restartBlock).toContain('elapsed = 0;');
  });

  it('fully resets replay state and cancels stale interactions before checkpointing', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const initialStart = source.indexOf('    var boatState = {');
    const initialBlock = source.slice(initialStart, source.indexOf('\n    };', initialStart));
    const restartStart = source.indexOf('      restartMission: function()');
    const restartBlock = source.slice(restartStart, source.indexOf('\n      }\n    };', restartStart));
    const initialKeys = [...initialBlock.matchAll(/^\s+([A-Za-z][A-Za-z0-9]*):/gm)].map((match) => match[1]);
    const resetKeys = new Set(
      [...restartBlock.matchAll(/boatState\.([A-Za-z][A-Za-z0-9]*)\s*(?:=|\+=)/g)].map((match) => match[1])
    );

    if (restartBlock.includes('boatState.pos.set(')) resetKeys.add('pos');
    if (restartBlock.includes('setPaused(false, false)')) resetKeys.add('paused');

    expect(initialStart).toBeGreaterThan(-1);
    expect(restartStart).toBeGreaterThan(-1);
    expect(initialKeys.filter((key) => !resetKeys.has(key))).toEqual(['timeOfDay', 'weather', 'cameraView']);
    expect(restartBlock).toContain('boat.rotation.set(0, boatState.heading, 0);');
    expect(restartBlock).toContain('boat.position.y = 0;');

    const checkpointAt = restartBlock.indexOf("emitVoyageCheckpoint('restart', true)");
    expect(checkpointAt).toBeGreaterThan(-1);
    [
      'haulActive = false;',
      'haulTimer = 0;',
      'haulTrapId = null;',
      'pendingInteraction = null;',
      'haulTrapMesh.visible = false;'
    ].forEach((marker) => {
      const markerAt = restartBlock.indexOf(marker);
      expect(markerAt).toBeGreaterThan(-1);
      expect(markerAt).toBeLessThan(checkpointAt);
    });

    const hostStart = source.indexOf('      function restartCoreMission()');
    const hostRestart = source.slice(hostStart, source.indexOf('      function resolveSimulatorTrafficChoice', hostStart));
    [
      'setActiveFishing(null);',
      'setFishIdentification(null);',
      'setFishEvidence(null);',
      'setFishDecisionResult(null);',
      'setCaliperCheck(null);',
      'setShellfishDecisionResult(null);'
    ].forEach((marker) => expect(hostRestart).toContain(marker));
  });

  it('uses a stable species ID for every regional trap catch', () => {
    const { getCoreSimProfile } = window.__FisherLabCore;

    expect(getCoreSimProfile('maine').trapSpeciesId).toBe('lobster');
    expect(getCoreSimProfile('chesapeake').trapSpeciesId).toBe('bluecrab');
    expect(getCoreSimProfile('pnw').trapSpeciesId).toBe('dungeness');
    expect(getCoreSimProfile('greatlakes').trapSpeciesId).toBe('crayfish');
  });

  it('passes the regional species ID through the shellfish decision path', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('function submitShellfishDecision');
    const end = source.indexOf("id: 'fl-shellfish-review'", start);
    const decisionBlock = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(decisionBlock).toMatch(/activeLobster\.speciesId|getCoreSimProfile\([^)]*\)\.trapSpeciesId/);
    expect(decisionBlock).not.toContain('activeLobster.specimenType, true');
  });
});
