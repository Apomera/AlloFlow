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

const inputContext = Function(
  'return (' + extractFunction('typingPracticeInputContext') + ')'
)();
const comparableSessions = Function(
  'return (' + extractFunction('typingPracticeComparableSessions') + ')'
)();

describe('Typing Practice measurement integrity', () => {
  it('records physical keyboard sessions as comparable', () => {
    const context = inputContext({ keyboard: 12 });
    expect(context.inputMethods).toEqual(['Physical keyboard']);
    expect(context.primaryInputMethod).toBe('Physical keyboard');
    expect(context.inputEventCounts.keyboard).toBe(12);
    expect(context.measurementComparable).toBe(true);
  });

  it('labels touch or assistive text input and IME without penalizing them', () => {
    const context = inputContext({ 'text-input': 5, ime: 8 });
    expect(context.inputMethods).toEqual([
      'Touch or assistive text input',
      'Language input method (IME)'
    ]);
    expect(context.primaryInputMethod).toBe('Language input method (IME)');
    expect(context.measurementComparable).toBe(true);
  });

  it('retains paste context while marking the run non-comparable', () => {
    const context = inputContext({ keyboard: 4, paste: 1 });
    expect(context.inputMethods).toContain('Pasted text');
    expect(context.inputEventCounts.paste).toBe(1);
    expect(context.measurementComparable).toBe(false);
    expect(context.measurementNote).toContain('retained as practice');
    expect(context.measurementNote).toContain('excluded from comparative performance metrics');
  });

  it('keeps legacy sessions comparable and excludes only explicitly assisted runs', () => {
    const sessions = [
      { id: 'legacy' },
      { id: 'keyboard', measurementComparable: true },
      { id: 'paste', measurementComparable: false },
      null
    ];
    expect(comparableSessions(sessions).map((session) => session.id)).toEqual([
      'legacy',
      'keyboard'
    ]);
  });

  it('classifies keyboard, paste, touch or assistive input, and IME events', () => {
    expect(source).toContain("commitTypingText(key, 'keyboard')");
    expect(source).toContain("commitTypingText(value, 'ime')");
    expect(source).toContain("pendingInputKindRef.current = 'paste'");
    expect(source).toContain("pendingInputKindRef.current = 'text-input'");
    expect(source).toContain('onPaste: onTypingPaste');
    expect(source).toContain("inputType === 'insertFromPaste'");
    expect(source).toContain("inputType.indexOf('Composition')");
  });

  it('prevents pasted practice from changing clinical or comparative achievements', () => {
    expect(source).toContain('if (summary.metricComparable && !state.baseline)');
    expect(source).toContain('if (summary.metricComparable && (!prev || wpm > prev.wpm');
    expect(source).toContain('summary.isBaseline = summary.metricComparable && !state.baseline');
    expect(source).toContain('if (summary.metricComparable && state.iepGoal');
    expect(source).toContain('if (summary.metricComparable && activeDrill.masteryWpm');
  });

  it('discloses measurement context in summaries, progress, reports, and CSV exports', () => {
    expect(source).toContain('Assisted practice saved.');
    expect(source).toContain('Measurement context: ');
    expect(source).toContain('retained in history and excluded from comparative performance metrics');
    expect(source).toContain('CURRENT PERFORMANCE (last 5 comparable sessions)');
    expect(source).toContain('Comparable sessions used for performance calculations: ');
    expect(source).toContain("'input_methods', 'primary_input_method', 'measurement_comparable', 'metric_comparable', 'measurement_note'");
  });
});
