import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

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

describe('Typing Practice active drill accessibility', () => {
  it('announces only useful milestones for longer drills', () => {
    const milestone = Function('return (' + extractFunction('typingPracticeProgressMilestone') + ')')();
    expect(milestone(0, 9, 100)).toBeNull();
    expect(milestone(0, 25, 100)).toBe(25);
    expect(milestone(25, 62, 100)).toBe(50);
    expect(milestone(50, 90, 100)).toBe(75);
    expect(milestone(75, 100, 100)).toBeNull();
    expect(milestone(0, 20, 30)).toBeNull();
  });

  it('creates concise spoken labels for letters, spaces, and punctuation', () => {
    const keyName = Function('return (' + extractFunction('typingPracticeKeyName') + ')')();
    const mistakeMessage = Function('typingPracticeKeyName', 'return (' + extractFunction('typingPracticeMistakeMessage') + ')')(keyName);
    expect(keyName(' ')).toBe('space');
    expect(keyName('?')).toBe('question mark');
    expect(keyName('a')).toBe('A');
    expect(mistakeMessage({ expected: 'a', actual: 's', advanced: false, attempt: 1 }))
      .toBe('Expected A; you pressed S. Try A again.');
    expect(mistakeMessage({ expected: ' ', actual: 'x', advanced: true, attempt: 1 }))
      .toBe('Expected space; you pressed X. Error-tolerant mode moved ahead with space.');
    expect(mistakeMessage({ expected: 'a', actual: 's', advanced: false, attempt: 3 }))
      .toContain('Attempt 3 at this character.');
  });

  it('exposes the full target and provides a quiet repeat-next-key shortcut', () => {
    const keyName = Function('return (' + extractFunction('typingPracticeKeyName') + ')')();
    const normalize = Function('return (' + extractFunction('typingPracticeNormalizeText') + ')')();
    const graphemes = Function(
      'typingPracticeNormalizeText',
      'return (' + extractFunction('typingPracticeGraphemes') + ')'
    )(normalize);
    const targetCue = Function(
      'typingPracticeKeyName',
      'typingPracticeGraphemes',
      'findKeyMeta',
      'fingerLabel',
      'return (' + extractFunction('typingPracticeTargetCue') + ')'
    )(keyName, graphemes, () => null, () => '');
    expect(targetCue('a b', 0)).toBe('Next key: A. Character 1 of 3.');
    expect(targetCue('a b', 1)).toBe('Next key: space. Character 2 of 3.');
    expect(targetCue('a b', 3)).toBe('Typing target complete.');
    expect(source).toContain("id: 'tp-target-transcript'");
    expect(source).toContain("id: 'tp-current-key-cue'");
    expect(source).toContain("'aria-details': 'tp-target-transcript'");
    expect(source).toContain("'aria-keyshortcuts': 'Escape F2'");
    expect(source).toContain("if (key === 'F2')");
    expect(source).toContain("setAnnounceText(typingPracticeTargetCue(targetStr, typedLength))");
    expect(source).toContain("{ keys: ['F2']");
  });

  it('keeps the visual character stream out of duplicate screen-reader output', () => {
    expect(source).toContain("className: chClass,\n              'aria-hidden': 'true'");
    expect(source).toContain("'aria-describedby': 'tp-capture-help tp-input-method-help tp-capture-progress-text tp-current-key-cue'");
  });

  it('maps error-tolerant mistakes to the character that was actually missed', () => {
    expect(source).toContain("? 'done-error'");
    expect(source).toContain("charState === 'done-error'");
    expect(source).toContain("lastWasWrong && !state.accommodations.errorTolerant ? 'wrong-current' : 'current'");
    expect(source).toContain("id: 'tp-mistake-feedback'");
    expect(source).toContain("'aria-errormessage': mistakeFeedback ? 'tp-mistake-feedback' : undefined");
    expect(source).toContain("'aria-invalid': mistakeFeedback ? 'true' : 'false'");
    expect(source).toContain('typingPracticeMistakeAnnouncement(\n              mistakeAnnouncementRef.current');
    expect(source).toContain('if (mistakeAnnouncement.shouldAnnounce) setAnnounceText(mistakeAnnouncement.message)');
  });

  it('keeps pace samples aligned when tolerant input advances or Backspace undoes', () => {
    expect(source).toContain("if (keystrokeTimesRef.current.length > 0) keystrokeTimesRef.current.pop()");
    expect(source).toContain('if (errorTolerant) typedChars.push(expected)');
    expect(source).toContain('for (var i = 0; i < result.advancedCount; i++) keystrokeTimesRef.current.push(offset)');
  });

  it('gives every completion path a summary announcement and semantic results hierarchy', () => {
    expect(source).toContain("'Session complete on ' + activeDrill.name");
    expect(source).toContain("'Warmup complete. This session was not saved. '");
    expect(source).toContain("'Goal met on ' + activeDrill.name");
    expect(source).toContain("id: 'tp-summary-title'");
    expect(source).toContain("'aria-label': 'Session results'");
    expect(source).toContain("'aria-label': 'Session actions'");
    expect(source).toContain("'aria-label': 'Retry ' + s.drillName + ' with the same text'");
    expect(source).toContain("'aria-label': 'Practice the ' + uniqueErrKeys.length + ' keys missed in this session'");
    expect(source).toContain("'Drill exited without saving. Returning to Typing Practice home.'");
    expect(source).toContain("'Session discarded. Returning to Typing Practice home.'");
  });

  it('connects the capture surface to visible instructions and progress', () => {
    expect(source).toContain("id: 'tp-typing-capture'");
    expect(source).toContain("'aria-describedby': 'tp-capture-help tp-input-method-help tp-capture-progress-text tp-current-key-cue'");
    expect(source).toContain("'aria-keyshortcuts': 'Escape F2'");
    expect(source).toContain("'aria-disabled': paused || sightReadLeft > 0 ? 'true' : 'false'");
    expect(source).toContain("'aria-busy': sightReadLeft > 0 ? 'true' : 'false'");
    expect(source).toContain("? 'Typing paused. Use Resume to continue. '");
    expect(source).toContain("id: 'tp-capture-help'");
    expect(source).toContain("id: 'tp-capture-progress-text'");
  });

  it('exposes queryable progress without turning each keystroke into a live announcement', () => {
    expect(source).toContain("id: 'tp-drill-progress'");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuemax': targetLength");
    expect(source).toContain("'aria-valuenow': typedLength");
    expect(source).toContain("'aria-valuetext': typedLength + ' of ' + targetLength + ' characters complete'");
  });

  it('keeps the visual reading countdown out of a per-second live region', () => {
    const countdownStart = source.indexOf("sightReadLeft > 0 ? h('div', {");
    const pauseStart = source.indexOf('// Paused overlay notice', countdownStart);
    const countdown = source.slice(countdownStart, pauseStart);
    expect(countdown).toContain("role: 'region'");
    expect(countdown).toContain("'aria-labelledby': 'tp-reading-time-title'");
    expect(countdown).not.toContain("'aria-live'");
    expect(source).toContain("'Reading time started. Typing begins in '");
    expect(source).toContain("'Reading time complete. The typing area is ready.'");
  });

  it('programmatically connects pause state and announces auto-pause and breaks', () => {
    expect(source).toContain("'aria-controls': 'tp-typing-capture'");
    expect(source).toContain("'aria-describedby': paused ? 'tp-drill-paused-status' : undefined");
    expect(source).toContain("id: 'tp-drill-paused-status'");
    expect(source).toContain("role: 'note'");
    expect(source).toContain("setAnnounceText('')");
    expect(source).toContain("pauseForInterruption('this window lost focus')");
    expect(source).toContain("pauseForInterruption('this page moved to the background')");
    expect(source).toContain("setAnnounceText('Typing paused because ' + reason");
    expect(source).toContain('Consider a short break. Your WPM will not be affected.');
  });
});
