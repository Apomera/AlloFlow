import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, 'stem_lab/stem_tool_typingpractice.js'),
  'utf8'
);

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

const comparableSessions = Function(
  'return (' + extractFunction('typingPracticeComparableSessions') + ')'
)();
const discardSession = Function(
  'typingPracticeComparableSessions',
  'return (' + extractFunction('typingPracticeDiscardSessionUpdates') + ')'
)(comparableSessions);

describe('Typing Practice progress integrity and chart accessibility', () => {
  it('fully clears baseline and personal-best records when the only session is discarded', () => {
    const discarded = {
      date: '2026-07-01T10:00:00.000Z',
      drillId: 'home-row',
      wpm: 22,
      accuracy: 91,
      charCount: 100,
      errors: 2,
      errorChars: { a: 2 },
      isBaseline: true
    };
    const updates = discardSession({
      sessions: [discarded],
      lifetime: { totalSessions: 1, totalCharsTyped: 100, totalErrorsLogged: 2 },
      aggregateErrors: { a: 2 },
      baseline: { wpm: 22, accuracy: 91, date: discarded.date, drillId: 'home-row' },
      personalBest: {
        'home-row': { wpm: 22, accuracy: 91, date: discarded.date }
      }
    }, discarded);

    expect(updates.sessions).toEqual([]);
    expect(updates.baseline).toBeNull();
    expect(updates.personalBest).toEqual({});
    expect(updates.lifetime).toEqual({
      totalSessions: 0,
      totalCharsTyped: 0,
      totalErrorsLogged: 0
    });
    expect(updates.aggregateErrors).toEqual({});
  });

  it('never promotes a pasted run when recalculating a discarded personal best', () => {
    const comparable = {
      date: '2026-07-01T10:00:00.000Z',
      drillId: 'words',
      wpm: 28,
      accuracy: 94,
      measurementComparable: true
    };
    const pasted = {
      date: '2026-07-02T10:00:00.000Z',
      drillId: 'words',
      wpm: 120,
      accuracy: 100,
      measurementComparable: false
    };
    const discarded = {
      date: '2026-07-03T10:00:00.000Z',
      drillId: 'words',
      wpm: 36,
      accuracy: 96,
      isNewBest: true
    };
    const updates = discardSession({
      sessions: [comparable, pasted, discarded],
      lifetime: { totalSessions: 3 },
      personalBest: {
        words: { wpm: 36, accuracy: 96, date: discarded.date }
      }
    }, discarded);

    expect(updates.personalBest.words).toEqual({
      wpm: 28,
      accuracy: 94,
      date: comparable.date
    });
  });

  it('moves a discarded baseline to the earliest remaining comparable session', () => {
    const discarded = {
      date: '2026-07-01T10:00:00.000Z',
      drillId: 'home-row',
      wpm: 20,
      accuracy: 90,
      isBaseline: true
    };
    const pasted = {
      date: '2026-07-02T10:00:00.000Z',
      drillId: 'home-row',
      wpm: 100,
      accuracy: 100,
      measurementComparable: false
    };
    const replacement = {
      date: '2026-07-03T10:00:00.000Z',
      drillId: 'top-row',
      wpm: 24,
      accuracy: 93,
      measurementComparable: true
    };
    const updates = discardSession({
      sessions: [discarded, pasted, replacement],
      lifetime: { totalSessions: 3 },
      baseline: { wpm: 20, accuracy: 90, date: discarded.date, drillId: 'home-row' }
    }, discarded);

    expect(updates.baseline).toEqual({
      wpm: 24,
      accuracy: 93,
      date: replacement.date,
      drillId: 'top-row'
    });
    expect(updates.sessions.find((session) => session.date === pasted.date).isBaseline).not.toBe(true);
    expect(updates.sessions.find((session) => session.date === replacement.date).isBaseline).toBe(true);
  });

  it('repairs mastery and first-goal metadata when their source session is discarded', () => {
    const priorGoal = {
      date: '2026-07-01T10:00:00.000Z',
      drillId: 'words',
      wpm: 30,
      accuracy: 95,
      goalMet: true
    };
    const discarded = {
      date: '2026-07-02T10:00:00.000Z',
      drillId: 'words',
      wpm: 35,
      accuracy: 97,
      goalMet: true,
      firstGoalMet: true,
      masteryAdvanced: true,
      newMasteryLevel: 3
    };
    const updates = discardSession({
      sessions: [priorGoal, discarded],
      lifetime: { totalSessions: 2 },
      masteryLevel: 3
    }, discarded);

    expect(updates.masteryLevel).toBe(2);
    expect(updates.sessions[0].firstGoalMet).toBe(true);
  });

  it('supplements goal status color with shape, text, and a real data table', () => {
    expect(source).toContain('Circle = met; square = not met.');
    expect(source).toContain("className: 'tp-goal-hit-dot '");
    expect(source).toContain("borderRadius: s.goalMet ? '50%' : '2px'");
    expect(source).toContain("'aria-hidden': 'true'");
    expect(source).toContain('View goal session details');
    expect(source).toContain("h('caption', { className: 'tp-sr-only' }");
    expect(source).toContain("scope: 'col'");
    expect(source).toContain("h('th', { scope: 'row'");
  });

  it('explains filtered assisted-only history and destructive recalculation', () => {
    expect(source).toContain('No WPM-comparable runs match these filters.');
    expect(source).toContain('Baseline, personal-best, goal, and mastery records will be recalculated.');
    expect(source).toContain('This cannot be undone.');
    expect(source).toContain('typingPracticeDiscardSessionUpdates(state, s)');
  });
});
