import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(
  path.join(process.cwd(), 'stem_lab/stem_tool_typingpractice.js'),
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
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

const comparableSessions = Function(
  'return (' + extractFunction('typingPracticeComparableSessions') + ')'
)();

describe('Typing Practice metric comparison scope', () => {
  it('keeps input provenance while excluding CPM sessions from WPM comparisons', () => {
    expect(source).toContain('inputMeasurementComparable: inputContext.measurementComparable');
    expect(source).toContain("metricComparable: inputContext.measurementComparable && sessionMetric.unit === 'WPM'");
    expect(source).toContain("measurementComparable: inputContext.measurementComparable");
    expect(source).toContain('Character-rate metrics use CPM and are excluded from WPM comparisons.');
  });

  it('filters CPM sessions from legacy comparable-session consumers but preserves old records', () => {
    const sessions = [
      { id: 'legacy' },
      { id: 'english', measurementComparable: true, metricUnit: 'WPM' },
      { id: 'cpm', measurementComparable: true, metricComparable: false, metricUnit: 'CPM' },
      { id: 'assisted', measurementComparable: false, metricComparable: false, metricUnit: 'WPM' }
    ];
    expect(comparableSessions(sessions).map((session) => session.id)).toEqual(['legacy', 'english']);
  });

  it('uses the session metric unit in resume and history labels', () => {
    expect(source).toContain("typingPracticeMetricDisplay(last).value + ' ' + typingPracticeMetricDisplay(last).unit");
    expect(source).toContain("typingPracticeMetricDisplay(s).value + ' ' + typingPracticeMetricDisplay(s).unit");
    expect(source).toContain("liveMetric.unit !== 'WPM' || liveWpm < 5");
  });
});
