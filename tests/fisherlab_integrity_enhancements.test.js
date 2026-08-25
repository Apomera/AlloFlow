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

  it('removes the backwards outbound instruction from the playable mission', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('Pass at least one red nun on your starboard side outbound');
    expect(source).not.toContain("label: 'Pass red nun on starboard'");
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

  it('gates mission completion in the safe-return path instead of using standards as display copy', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const start = source.indexOf('// A safe return completes the run');
    const end = source.indexOf('// Fishing key trigger', start);
    const completionBlock = source.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(completionBlock).toContain('evaluateCoreChallengeStandard');
    expect(completionBlock).toMatch(/if\s*\([^)]*(?:challengeStandard\.met|standardMet)/);
    expect(completionBlock.indexOf('evaluateCoreChallengeStandard')).toBeLessThan(
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
