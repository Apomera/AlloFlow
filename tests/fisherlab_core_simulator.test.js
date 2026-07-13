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
  });
});

describe('Fisher Lab simulator safeguards', () => {
  it('keeps keyboard control focused, fuel bounded, and catch decisions explicit', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');

    expect(source).toContain('if (document.activeElement !== canvas) return;');
    expect(source).toContain("role: 'application', tabIndex: 0");
    expect(source).toContain('boatState.fuel = Math.max(0');
    expect(source).toContain('boatState.speed *= Math.exp(-0.9 * dt);');
    expect(source).toContain("type: 'fish-haul'");
    expect(source).toContain("role: 'dialog', 'aria-modal': 'true'");
    expect(source).not.toContain('resumeSim');
    expect(source).not.toContain('hud.fuel || 100');
  });
});
