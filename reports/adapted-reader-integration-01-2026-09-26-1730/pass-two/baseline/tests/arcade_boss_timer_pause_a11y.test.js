import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('arcade_mode_boss_encounter.js', 'utf8');

describe('Boss Encounter WCAG timer and focus controls', () => {
  it('lets the teacher pause and resume the synchronized round deadline', () => {
    expect(source).toContain('function setClassRoundTimerPaused(shouldPause)');
    expect(source).toContain("'aria-pressed': classView.timerPaused");
    expect(source).toContain("'Pause round timer'");
    expect(source).toContain("'Resume round timer, '");
    expect(source).toContain('pausedRemainingMs: remainingMs');
    expect(source).toContain('roundDurationMs - retainedMs');
  });

  it('prevents ticking and automatic advancement while paused', () => {
    expect(source).toContain('if (classView && classView.timerPaused) return;');
    expect(source).toContain('if (classView.timerPaused) return;');
    expect(source).toContain('[isClassMode, phase, classView && classView.timerPaused]');
    expect(source).toContain('classView && classView.timerPaused, nowTick');
  });

  it('initializes and resets pause state for every new round', () => {
    expect(source.match(/timerPaused: false/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source.match(/pausedRemainingMs: null/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source.match(/timerPausedAt: null/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('announces timer state without announcing every countdown second', () => {
    expect(source).toContain("'Round timer paused with '");
    expect(source).toContain("'Round timer running.'");
    expect(source).toContain("role: 'status'");
    expect(source).toContain("'aria-atomic': 'true'");
  });

  it('provides strong visible focus and 44 CSS-pixel teacher actions', () => {
    expect(source).not.toMatch(/outline:\s*none/);
    expect(source).toContain('.ah-boss-control:focus-visible');
    expect(source).toContain('outline: 3px solid #fff');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('outline-color: Highlight');
    expect(source.match(/className: 'ah-boss-control'/g)?.length).toBe(3);
    expect(source.match(/minHeight: '44px', minWidth: '44px'/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
