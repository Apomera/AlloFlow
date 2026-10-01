import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'word_sounds_module.js'),
  'utf8',
);

function loadDifficultyPool(categorizeWordDifficulty) {
  const start = SOURCE.indexOf(
    'const buildTargetedDifficultyPool = React.useCallback',
  );
  const end = SOURCE.indexOf(
    'const generateSessionQueue = React.useCallback',
    start,
  );
  expect(start, 'targeted difficulty helper not found').toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return new Function(
    'categorizeWordDifficulty',
    `
      const SESSION_LENGTH = 10;
      const React = { useCallback: fn => fn };
      ${SOURCE.slice(start, end)}
      return buildTargetedDifficultyPool;
    `,
  )(categorizeWordDifficulty);
}

const bandOf = value => String(value || '').split('-')[0];
const entries = (...words) => words.map(word => ({ word }));
const words = pool => pool.map(entry => entry.word);

describe('Word Sounds targeted difficulty practice mix', () => {
  const mix = loadDifficultyPool(bandOf);
  const balanced = entries(
    'easy-1', 'easy-2', 'easy-3',
    'medium-1', 'medium-2', 'medium-3',
    'hard-1', 'hard-2', 'hard-3',
  );

  it('makes easy and hard requests a 60% target-band majority', () => {
    expect(words(mix(balanced, 'easy'))).toEqual([
      'easy-1', 'easy-2', 'easy-3',
      'easy-1', 'easy-2', 'easy-3',
      'medium-1', 'medium-2', 'medium-3',
      'hard-1',
    ]);
    expect(words(mix(balanced, 'hard'))).toEqual([
      'hard-1', 'hard-2', 'hard-3',
      'hard-1', 'hard-2', 'hard-3',
      'medium-1', 'medium-2', 'medium-3',
      'easy-1',
    ]);
  });

  it('caps forced sparse-band presentations at two per word', () => {
    const sparse = entries(
      'hard-1', 'hard-2',
      'medium-1', 'medium-2', 'medium-3',
      'medium-4', 'medium-5', 'medium-6',
      'easy-1',
    );
    const result = words(mix(sparse, 'hard'));

    expect(result).toEqual([
      'hard-1', 'hard-2', 'hard-1', 'hard-2',
      'medium-1', 'medium-2', 'medium-3',
      'medium-4', 'medium-5', 'medium-6',
    ]);
    expect(result.filter(word => word === 'hard-1')).toHaveLength(2);
    expect(result.filter(word => word === 'hard-2')).toHaveLength(2);
    expect(new Set(result)).toHaveLength(8);
  });

  it('does not manufacture a 60% majority from one primary-band word', () => {
    const sparse = entries(
      'hard-1',
      'medium-1', 'medium-2', 'medium-3', 'medium-4',
      'medium-5', 'medium-6', 'medium-7', 'medium-8',
      'easy-1',
    );
    const result = words(mix(sparse, 'hard'));

    expect(result).toHaveLength(10);
    expect(result.filter(word => word === 'hard-1')).toHaveLength(2);
    expect(new Set(result.slice(2))).toHaveLength(8);
  });

  it('keeps fixed forms outside targeted mixing and every adaptive reorder path', () => {
    const start = SOURCE.indexOf('const generateSessionQueue = React.useCallback');
    const end = SOURCE.indexOf(
      'const generateSoundChips = React.useCallback',
      start,
    );
    const queue = SOURCE.slice(start, end);

    expect(queue).toMatch(
      /if \(!isFixedForm\) \{\s*candidates = buildTargetedDifficultyPool\(effectivePool, difficulty\);\s*\}/,
    );
    expect(queue).toContain('const effectivePool = isFixedForm');
    expect(queue).toContain('? [...(rawPool || [])]');
    expect(queue).toContain('let freshCandidates = isFixedForm');
    expect(queue).toContain('if (isFixedForm) {');
    expect(queue).toContain('selection = [...freshCandidates]');
    expect(queue).toContain('.slice(0, isFixedForm ? probeItemGoal : SESSION_LENGTH)');
  });
});
