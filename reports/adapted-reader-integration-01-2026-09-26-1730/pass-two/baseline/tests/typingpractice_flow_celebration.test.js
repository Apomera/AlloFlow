import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const canonicalPath = path.join(root, 'stem_lab/stem_tool_typingpractice.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js');
const source = fs.readFileSync(canonicalPath, 'utf8');

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

const normalize = Function('return (' + extractFunction('typingPracticeNormalizeText') + ')')();
const graphemes = Function(
  'typingPracticeNormalizeText',
  'return (' + extractFunction('typingPracticeGraphemes') + ')'
)(normalize);
const applyTextInput = Function(
  'typingPracticeGraphemes',
  'typingPracticeNormalizeText',
  'return (' + extractFunction('typingPracticeApplyTextInput') + ')'
)(graphemes, normalize);
const accuracy = Function('return (' + extractFunction('typingPracticeAccuracy') + ')')();
const attemptCount = Function('return (' + extractFunction('typingPracticeAttemptCount') + ')')();
const groupMistakes = Function('return (' + extractFunction('typingPracticeGroupMistakes') + ')')();
const keyName = Function('return (' + extractFunction('typingPracticeKeyName') + ')')();
const mistakeReviewText = Function(
  'typingPracticeGroupMistakes',
  'typingPracticeKeyName',
  'return (' + extractFunction('typingPracticeMistakeReviewText') + ')'
)(groupMistakes, keyName);
const festivalAudioTheme = Function('return (' + extractFunction('typingPracticeFestivalAudioTheme') + ')')();

describe('Typing Practice flow mode and coherent celebration', () => {
  it('advances in Keep going mode while retaining the actual difference', () => {
    const result = applyTextInput('cat', '', 'x', { errorTolerant: true });
    expect(result.typed).toBe('c');
    expect(result.errorCount).toBe(1);
    expect(result.mistakes).toEqual([
      { index: 0, expected: 'c', actual: 'x', attempt: 1 }
    ]);
  });

  it('holds position in Correct as you go mode and records each attempt', () => {
    const result = applyTextInput('cat', '', 'xc', { errorTolerant: false });
    expect(result.typed).toBe('c');
    expect(result.errorCount).toBe(1);
    expect(result.mistakes[0]).toMatchObject({ index: 0, expected: 'c', actual: 'x' });
  });

  it('computes accuracy from actual attempts in both modes', () => {
    expect(attemptCount({ keyboard: 7, ime: 3, paste: 0 })).toBe(10);
    expect(accuracy(12, 2)).toBe(83);
    expect(accuracy(10, 2)).toBe(80);
    expect(accuracy(10, 10)).toBe(0);
  });

  it('groups repeated retries by target position without losing attempts', () => {
    expect(groupMistakes([
      { index: 2, expected: 't', actual: 'r', attempt: 1, inputKind: 'keyboard' },
      { index: 2, expected: 't', actual: 'y', attempt: 2, inputKind: 'keyboard' },
      { index: 4, expected: ' ', actual: 'n', attempt: 1, inputKind: 'ime' }
    ])).toEqual([
      {
        index: 2,
        expected: 't',
        entries: [
          { actual: 'r', attempt: 1, inputKind: 'keyboard' },
          { actual: 'y', attempt: 2, inputKind: 'keyboard' }
        ]
      },
      {
        index: 4,
        expected: ' ',
        entries: [{ actual: 'n', attempt: 1, inputKind: 'ime' }]
      }
    ]);
  });

  it('builds a complete plain-text mistake review for copying', () => {
    const text = mistakeReviewText({
      practiceMode: 'keep-going',
      errors: 3,
      mistakeEventsOmitted: 1,
      mistakeEvents: [
        { index: 0, expected: 'a', actual: 's', attempt: 1 },
        { index: 2, expected: ' ', actual: 'x', attempt: 1 }
      ]
    });
    expect(text).toContain('Practice mode: Keep going');
    expect(text).toContain('Total errors: 3');
    expect(text).toContain('Position 1: expected A; entered S');
    expect(text).toContain('Position 3: expected space; entered X');
    expect(text).toContain('Additional attempts retained only in the total error count: 1');
  });

  it('maps themed celebration audio to the active visual theme', () => {
    expect(festivalAudioTheme('default')).toBe('chime');
    expect(festivalAudioTheme('steampunk')).toBe('clack');
    expect(festivalAudioTheme('cyberpunk')).toBe('beep');
    expect(festivalAudioTheme('kawaii')).toBe('pop');
    expect(festivalAudioTheme('oceanic')).toBe('soft');
    expect(festivalAudioTheme('neutral')).toBe('mute');
  });

  it('surfaces the mode choice, review, sound gate, and intensity controls', () => {
    expect(source).toContain('When a key is wrong');
    expect(source).toContain('Correct as you go');
    expect(source).toContain('Keep going');
    expect(source).toContain('Mistakes to review');
    expect(source).toContain("festivalIntensity: 'themed'");
    expect(source).toContain("state.festivalIntensity === 'max'");
    expect(source).toContain('!!state.accommodations.audioCues');
    expect(source).toContain("festMax ? 5000 : 15000");
    expect(source).toContain("var themedCelebration = state.festivalMode");
    expect(source).toContain("!(themedCelebration && result.lastCompletedRange)");
    expect(source).toContain("'practice_mode', 'mistake_events_json', 'mistake_events_omitted'");
    expect(source).toContain('Mistake response: ');
    expect(source).toContain("festivalSoundDensity: 'events'");
    expect(source).toContain("state.festivalSoundDensity === 'keys'");
    expect(source).toContain("festivalVisualDensity: 'events'");
    expect(source).toContain("state.festivalVisualDensity || 'events'");
    expect(source).toContain('Themed celebration visuals');
    expect(source).toContain('Milestones only');
    expect(source).toContain('Themed celebration sounds');
    expect(source).toContain('Show remaining ');
    expect(source).toContain('detail-extra-mistake-');
    expect(source).toContain('typingPracticeMistakeReviewText(d)');
    expect(source).toContain('Copy mistake review');
  });

  it('keeps the deploy mirror byte-identical to the canonical tool', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
