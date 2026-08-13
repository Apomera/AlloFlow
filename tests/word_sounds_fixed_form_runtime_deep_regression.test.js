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

describe('Word Sounds fixed-form runtime contract', () => {
  it('derives an explicit fixed item goal and probe identity from session configuration', () => {
    const config = sliceBetween(
      'const isFixedForm =',
      '// Explicit props win; config fields are the portable-resource fallback.',
    );

    expect(config).toContain('isProbeMode || runtimeSessionConfig.fixedForm === true');
    expect(config).toContain('const configuredProbeItemCount = Number(runtimeSessionConfig.probeItemCount)');
    expect(config).toContain('const probeItemGoal =');
    expect(config).toContain('Math.floor(configuredProbeItemCount)');
    expect(config).toContain('const effectiveProbeGrade =');
    expect(config).toContain('runtimeSessionConfig.probeGrade ?? runtimeSessionConfig.grade ?? probeGradeLevel');
    expect(config).toContain('runtimeSessionConfig.probeForm ??');
    expect(config).toContain('runtimeSessionConfig.form ??');
  });

  it('preserves item order and skips adaptive filtering, history suppression, shuffle, and recycling', () => {
    const queue = sliceBetween(
      'const generateSessionQueue = React.useCallback',
      'const generateSoundChips = React.useCallback',
    );

    expect(queue).toContain('if (!isFixedForm && categorizeWordDifficulty');
    expect(queue).toContain('if (!isFixedForm && candidates.length < SESSION_LENGTH)');
    expect(queue).toMatch(/let freshCandidates = isFixedForm\s*\? candidates\s*:/);
    expect(queue).toContain('if (!isFixedForm && freshCandidates.length < SESSION_LENGTH');
    expect(queue).toMatch(/if \(isFixedForm\) \{\s*selection = \[\.\.\.freshCandidates\];/);
    expect(queue).toContain('.slice(0, isFixedForm ? probeItemGoal : SESSION_LENGTH)');
  });
});
