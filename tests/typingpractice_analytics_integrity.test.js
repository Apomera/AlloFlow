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
const efficacy = Function(
  'typingPracticeComparableSessions',
  'return (' + extractFunction('computeAccommodationEfficacy') + ')'
)(comparableSessions);
const perDrillEfficacy = Function(
  'typingPracticeComparableSessions',
  'DRILLS',
  'return (' + extractFunction('computePerDrillEfficacy') + ')'
)(comparableSessions, { words: { name: 'Words' } });
const estimateDuration = Function(
  'typingPracticeComparableSessions',
  'return (' + extractFunction('estimateTypingPracticeDuration') + ')'
)(comparableSessions);
const recentAverage = Function(
  'typingPracticeComparableSessions',
  'return (' + extractFunction('getRecentAvg') + ')'
)(comparableSessions);

function session(overrides = {}) {
  return {
    date: '2026-07-01T10:00:00.000Z',
    drillId: 'words',
    drillName: 'Words',
    wpm: 30,
    accuracy: 90,
    accommodationsUsed: [],
    measurementComparable: true,
    ...overrides
  };
}

describe('Typing Practice analytics integrity', () => {
  it('computes actual accommodation averages from comparable sessions only', () => {
    const rows = efficacy([
      session({ wpm: 40, accuracy: 96, accommodationsUsed: ['dyslexiaFont'] }),
      session({ wpm: 30, accuracy: 90 }),
      session({
        wpm: 200,
        accuracy: 100,
        accommodationsUsed: ['dyslexiaFont'],
        measurementComparable: false
      })
    ]);
    const row = rows.find((item) => item.key === 'dyslexiaFont');

    expect(row).toMatchObject({
      sessionsWith: 1,
      sessionsWithout: 1,
      avgWpmWith: 40,
      avgWpmWithout: 30,
      avgAccWith: 96,
      avgAccWithout: 90,
      wpmDelta: 10,
      accDelta: 6
    });
  });

  it('keeps per-drill efficacy comparable and exposes its real averages', () => {
    const rows = perDrillEfficacy([
      session({ wpm: 40, accuracy: 96, accommodationsUsed: ['largeKeys'] }),
      session({ wpm: 38, accuracy: 94, accommodationsUsed: ['largeKeys'] }),
      session({ wpm: 30, accuracy: 90 }),
      session({ wpm: 28, accuracy: 88 }),
      session({
        wpm: 180,
        accuracy: 100,
        accommodationsUsed: ['largeKeys'],
        measurementComparable: false
      })
    ]);
    const row = rows[0].rows.find((item) => item.key === 'largeKeys');

    expect(row).toMatchObject({
      sessionsWith: 2,
      sessionsWithout: 2,
      avgWpmWith: 39,
      avgWpmWithout: 29,
      avgAccWith: 95,
      avgAccWithout: 89,
      wpmDelta: 10,
      accDelta: 6
    });
  });

  it('does not let pasted speed distort drill duration estimates', () => {
    const result = estimateDuration({
      sessions: [
        session({ wpm: 30 }),
        session({ wpm: 180, measurementComparable: false })
      ],
      personalBest: {}
    }, { id: 'words' }, 'x'.repeat(150));

    expect(result.wpm).toBe(30);
    expect(result.seconds).toBe(60);
    expect(result.personalized).toBe(true);
  });

  it('defensively excludes assisted runs from recent performance averages', () => {
    expect(recentAverage([
      session({ wpm: 20 }),
      session({ wpm: 30 }),
      session({ wpm: 200, measurementComparable: false })
    ], 'wpm')).toBe(25);
  });

  it('renders real values instead of an arbitrary visualization midpoint', () => {
    expect(source).toContain('row.avgWpmWith / maxBarWpm');
    expect(source).toContain('row.avgWpmWithout / maxBarWpm');
    expect(source).toContain("row.avgWpmWith + ' WPM'");
    expect(source).toContain("row.avgWpmWithout + ' WPM'");
    expect(source).not.toContain('midpointWpm');
    expect(source).not.toContain('not directly stored; reconstructed for display');
  });

  it('separates participation credit from comparative performance evidence', () => {
    expect(source).toContain('var practiceThisWeek = allSessions.filter');
    expect(source).toContain('var bestWpmThisWeek = thisWeek.reduce');
    expect(source).toContain('var performanceSessions = typingPracticeComparableSessions(sessions)');
    expect(source).toContain('var recent3 = performanceSessions.filter');
    expect(source).toContain('Comparable sessions only; pasted practice excluded.');
    expect(source).toContain('all completed practice, including assisted sessions');
  });
});
