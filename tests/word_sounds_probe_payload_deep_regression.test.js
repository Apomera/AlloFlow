import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');

const sliceBetween = (startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, `missing runtime marker: ${startMarker}`).toBeGreaterThanOrEqual(0);
  expect(end, `missing runtime marker: ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('Word Sounds unified probe completion', () => {
  it('builds one complete normalized payload for every exit path', () => {
    const payload = sliceBetween(
      'const buildProbePayload =',
      'const renderProbeResults =',
    );

    for (const field of [
      'correct',
      'total',
      'accuracy',
      'itemsPerMin',
      'duration',
      'elapsed',
      'activity',
      'grade',
      'form',
      'learnerId',
      'sessionId',
      'resourceId',
      'sessionConfigVersion',
      'fixedForm',
      'itemGoal',
      'hiddenMs',
      'interrupted',
      'byDifficulty',
    ]) {
      expect(payload).toMatch(new RegExp(`\\b${field}\\b`));
    }

    expect(payload).toContain('total > 0 ? Math.round((correct / total) * 100) : 0');
    expect(payload).toContain('Math.round((correct / elapsedMinutes) * 10) / 10');
    expect(payload).toContain('if (!onProbeComplete || probeCompletionSentRef.current) return false');
    expect(payload).toContain('probeCompletionSentRef.current = true');
    expect(payload).toContain('onProbeComplete(buildProbePayload(score, extraEntry))');
  });

  it('routes all three completion exits through the guarded emitter', () => {
    expect((source.match(/onProbeComplete\(/g) || [])).toHaveLength(1);
    expect((source.match(/emitProbeComplete\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain('onProbeComplete({');
  });

  it('stops fixed forms on attempted item count at the exact configured goal', () => {
    expect(source).toMatch(
      /const _goalMet = isProbeMode\s*\? postScore\.total >= probeItemGoal/,
    );
    expect(source).not.toMatch(
      /isProbeMode\s*\? postScore\.total >= wordSoundsSessionGoal/,
    );
  });

  it('uses a correctness-neutral probe interval so timing does not double-penalize errors', () => {
    expect(source).not.toMatch(/isProbeMode \? \(isCorrect \? \d+ : \d+\)/);
  });
});
