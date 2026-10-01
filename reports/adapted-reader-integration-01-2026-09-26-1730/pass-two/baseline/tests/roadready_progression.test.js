import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

const safeStats = {
  distance: 700,
  safetyScore: 96,
  efficiencyScore: 88,
  crashes: 0,
  majorViolations: 0,
  childStrike: 0,
  speedViolations: 0,
  secondsOverLimit: 0,
  closeFollows: 0,
  hardBrakes: 0,
  skidSeconds: 0,
  hydroplaneSeconds: 0,
  unsignaledLaneChanges: 0,
  laneChanges: 2,
  stops: 3,
};

describe('RoadReady mission evidence and safety-aware progression', () => {
  it('does not count a short attempt as mastery evidence or award drive badges', () => {
    const evidence = RR.rrSessionEvidence({ ...safeStats, distance: 299 }, 59);
    expect(evidence.qualifying).toBe(false);
    expect(evidence.reason).toMatch(/at least 60 seconds/i);
    expect(RR.rrDriveOutcome(safeStats, evidence)).toMatchObject({
      grade: '—', passed: false, qualifying: false, tone: 'sample',
    });
    expect(RR.rrDriveAchievementIds(safeStats, { evidence })).toEqual([]);
  });

  it('requires both minimum duration and distance for a general qualifying drive', () => {
    expect(RR.rrSessionEvidence({ distance: 300 }, 59).qualifying).toBe(false);
    expect(RR.rrSessionEvidence({ distance: 299 }, 60).qualifying).toBe(false);
    expect(RR.rrSessionEvidence({ distance: 300 }, 60).qualifying).toBe(true);
    expect(RR.rrSessionEvidence({ distance: 10 }, 2, { formalResult: true }).qualifying).toBe(false);
  });

  it('requires duration, distance, score, and a critical-event-free formal road test', () => {
    const testState = { startedAtSim: 10, durationSec: 240, score: 90 };
    const exactPass = RR.roadTestOutcome(testState, { ...safeStats, distance: 300 }, 250);
    expect(RR.ROAD_TEST_MIN_DISTANCE_METERS).toBe(300);
    expect(exactPass).toMatchObject({
      passed: true, completed: true, evidenceMet: true, critical: false,
      reason: 'passed', distanceMeters: 300,
    });

    expect(RR.roadTestOutcome(testState, { ...safeStats, distance: 0 }, 250))
      .toMatchObject({ passed: false, completed: true, evidenceMet: false, reason: 'distance' });
    expect(RR.roadTestOutcome(testState, { ...safeStats, distance: 299 }, 250).passed).toBe(false);
    expect(RR.roadTestOutcome({ ...testState, score: 89 }, { ...safeStats, distance: 300 }, 250))
      .toMatchObject({ passed: false, reason: 'score' });
    expect(RR.roadTestOutcome(testState, { ...safeStats, distance: 300 }, 249.99))
      .toMatchObject({ passed: false, completed: false, reason: 'duration' });
  });

  it('keeps formal critical status visible and does not blame AI-caused rear ends', () => {
    const testState = { startedAtSim: 0, durationSec: 240, score: 100 };
    for (const criticalStats of [
      { crashes: 1 },
      { majorViolations: 1 },
      { childStrike: 1 },
      { wrongSideViolations: 1 },
    ]) {
      expect(RR.roadTestOutcome(testState,
        { ...safeStats, distance: 300, ...criticalStats }, 240))
        .toMatchObject({ passed: false, completed: true, evidenceMet: true, critical: true });
    }
    expect(RR.roadTestOutcome(testState,
      { ...safeStats, distance: 20, crashes: 1 }, 240))
      .toMatchObject({ passed: false, evidenceMet: false, critical: true, reason: 'distance' });
    expect(RR.roadTestOutcome(testState,
      { ...safeStats, distance: 300, crashes: 1, aiCausedCrashes: 1 }, 240))
      .toMatchObject({ passed: true, critical: false, reason: 'passed' });
  });

  it('caps a critical result so efficiency cannot erase a collision', () => {
    const evidence = RR.rrSessionEvidence(safeStats, 90);
    const result = RR.rrDriveOutcome({ ...safeStats, safetyScore: 100, efficiencyScore: 100, crashes: 1 }, evidence);
    expect(result.passed).toBe(false);
    expect(result.tone).toBe('critical');
    expect(result.score).toBeLessThanOrEqual(64);
    expect(result.detail).toMatch(/cannot cancel/i);
    const badges = RR.rrDriveAchievementIds({ ...safeStats, efficiencyScore: 100, crashes: 1 }, { evidence });
    expect(badges).not.toContain('eco_warrior');
    expect(badges).not.toContain('signal_perfect');
  });

  it('still calls out a critical event when the attempt is too short to qualify', () => {
    const evidence = RR.rrSessionEvidence({ ...safeStats, distance: 20 }, 3);
    const result = RR.rrDriveOutcome({ ...safeStats, crashes: 1 }, evidence);
    expect(result).toMatchObject({ grade: '—', passed: false, qualifying: false, tone: 'critical' });
    expect(result.label).toMatch(/safety review/i);
    expect(result.detail).toMatch(/critical safety event/i);
  });

  it('requires an adequate weighted result without a critical event', () => {
    const evidence = RR.rrSessionEvidence(safeStats, 90);
    expect(RR.rrDriveOutcome({ ...safeStats, safetyScore: 80, efficiencyScore: 0 }, evidence))
      .toMatchObject({ passed: false, tone: 'review' });
  });

  it('awards signaling and speed discipline only from observable qualifying evidence', () => {
    const evidence = RR.rrSessionEvidence(safeStats, 90);
    expect(RR.rrDriveAchievementIds({ ...safeStats, laneChanges: 1 }, { evidence }))
      .not.toContain('signal_perfect');

    const clean = RR.rrDriveAchievementIds(safeStats, { evidence });
    expect(clean).toContain('signal_perfect');
    expect(clean).toContain('speed_discipline');
    expect(clean).not.toContain('speed_demon');

    expect(RR.rrDriveAchievementIds({ ...safeStats, speedViolations: 1 }, { evidence }))
      .not.toContain('speed_discipline');
  });

  it('separates route completion from meeting every safety check', () => {
    const complete = RR.rrScenarioMissionStatus({ ...safeStats, distance: 300, stops: 1 }, 60, 'residential');
    expect(complete.ready).toBe(true);
    expect(complete.passed).toBe(true);

    const review = RR.rrScenarioMissionStatus({ ...safeStats, distance: 300, stops: 0 }, 60, 'residential');
    expect(review.ready).toBe(true);
    expect(review.passed).toBe(false);
    expect(review.criteria.find((item) => item.id === 'habit')?.met).toBe(false);

    const evidence = RR.rrSessionEvidence({ ...safeStats, distance: 300 }, 60, {
      missionReady: true,
      missionPassed: false,
    });
    expect(RR.rrDriveOutcome(safeStats, evidence)).toMatchObject({ passed: false, tone: 'review' });
  });
});
