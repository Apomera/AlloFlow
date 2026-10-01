// Unit tests for window.AlloModules.SafetyChecker (safety_checker_module.js).
//
// The regex layer is the deterministic first line of the student-safety
// scanner — a regression that silently dropped a self-harm / harm-to-others
// match would be a real-world safety failure, so the classification is worth
// pinning. (aiCheck is async + network and is out of scope here.)
// `timestamp` is non-deterministic, so we assert on category/match/severity.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let SC;
beforeAll(() => {
  loadAlloModule('safety_checker_module.js');
  SC = window.AlloModules.SafetyChecker;
  if (!SC) throw new Error('SafetyChecker failed to register');
});

const cats = (flags) => flags.map((f) => f.category);

describe('check() — regex safety classification', () => {
  it('flags self-harm as critical', () => {
    const f = SC.check('I want to kill myself');
    expect(cats(f)).toContain('self_harm');
    const flag = f.find((x) => x.category === 'self_harm');
    expect(flag.severity).toBe('critical');
    expect(flag.match).toBe('kill myself');
  });

  it('flags harm-to-others as critical', () => {
    const f = SC.check("I'm going to bring a gun to school");
    expect(cats(f)).toContain('harm_to_others');
    expect(f.find((x) => x.category === 'harm_to_others').severity).toBe('critical');
  });

  it('flags off-task gaming as low severity', () => {
    const f = SC.check("Let's play fortnite after this");
    expect(cats(f)).toContain('off_task_gaming');
    expect(f.find((x) => x.category === 'off_task_gaming').severity).toBe('low');
  });

  it('does not flag normal academic text (no false positive)', () => {
    expect(SC.check('The mitochondria is the powerhouse of the cell')).toEqual([]);
  });

  it('returns [] for empty / non-string input', () => {
    expect(SC.check('')).toEqual([]);
    expect(SC.check(null)).toEqual([]);
    expect(SC.check(undefined)).toEqual([]);
    expect(SC.check(42)).toEqual([]);
  });

  it('each flag carries category, match, severity, and a timestamp string', () => {
    const f = SC.check('suicide');
    expect(f.length).toBeGreaterThan(0);
    const flag = f[0];
    expect(flag).toHaveProperty('category');
    expect(flag).toHaveProperty('match');
    expect(flag).toHaveProperty('severity');
    expect(typeof flag.timestamp).toBe('string');
  });
});

describe('getSeverity', () => {
  it('maps known categories to their severity', () => {
    expect(SC.getSeverity('self_harm')).toBe('critical');
    expect(SC.getSeverity('harm_to_others')).toBe('critical');
    expect(SC.getSeverity('bullying')).toBe('high');
    expect(SC.getSeverity('concerning_content')).toBe('high');
    expect(SC.getSeverity('inappropriate_language')).toBe('medium');
    expect(SC.getSeverity('off_task_gaming')).toBe('low');
  });
  it('defaults unknown categories to medium', () => {
    expect(SC.getSeverity('nonexistent')).toBe('medium');
  });
});

describe('getCategoryLabel', () => {
  it('returns the built-in emoji label when no translator is given', () => {
    expect(SC.getCategoryLabel('off_task_gaming')).toBe('🎮 Off-Task (Gaming/Media)');
    expect(SC.getCategoryLabel('gibberish')).toBe('🔤 Gibberish Input');
  });
  it('uses the translator function for localized categories', () => {
    expect(SC.getCategoryLabel('self_harm', () => 'LOCALIZED')).toBe('LOCALIZED');
  });
  it('falls back to the raw category for unknown keys', () => {
    expect(SC.getCategoryLabel('totally_unknown')).toBe('totally_unknown');
  });
});
