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

describe('Typing Practice announcement quality', () => {
  it('suppresses rapid repeats of the same mistake without hiding a new mistake', () => {
    const keyName = Function('return (' + extractFunction('typingPracticeKeyName') + ')')();
    const mistakeMessage = Function(
      'typingPracticeKeyName',
      'return (' + extractFunction('typingPracticeMistakeMessage') + ')'
    )(keyName);
    const fingerCue = () => '';
    const policy = Function(
      'typingPracticeMistakeMessage',
      'typingPracticeMistakeFingerCue',
      'return (' + extractFunction('typingPracticeMistakeAnnouncement') + ')'
    )(mistakeMessage, fingerCue);

    const first = policy(null, { expected: 'a', actual: 's', advanced: false, attempt: 1 }, 1000, 1400);
    expect(first.shouldAnnounce).toBe(true);
    expect(first.message).toBe('Expected A; you pressed S. Try A again.');

    const repeated = policy(first.next, { expected: 'a', actual: 's', advanced: false, attempt: 2 }, 1200, 1400);
    expect(repeated.shouldAnnounce).toBe(false);
    expect(repeated.next).toEqual(first.next);

    const differentKey = policy(first.next, { expected: 'a', actual: 'd', advanced: false, attempt: 2 }, 1250, 1400);
    expect(differentKey.shouldAnnounce).toBe(true);

    const afterInterval = policy(first.next, { expected: 'a', actual: 's', advanced: false, attempt: 3 }, 2400, 1400);
    expect(afterInterval.shouldAnnounce).toBe(true);
    expect(afterInterval.message).toContain('Attempt 3');
  });

  it('resets the mistake throttle after correct input in drills and Battle', () => {
    expect(source).toContain("mistakeAnnouncementRef.current = { signature: '', at: 0 }");
    expect(source).toContain("battleMistakeAnnouncementRef.current = { signature: '', at: 0 }");
    expect(source).toContain('if (lastStep && lastStep.correct)');
    expect(source).toContain('if (battleMistakeAnnouncement.shouldAnnounce) setAnnounceText(battleMistakeAnnouncement.message)');
  });

  it('remounts the live status node for repeated messages', () => {
    expect(source).toContain('var announceNonceTuple = useState(0)');
    expect(source).toContain('setAnnounceTextState(nextText)');
    expect(source).toContain("key: 'tp-announcement-' + announceNonce");
  });

  it('uses one persistent alert for fallback print and export failures', () => {
    const issueReporter = extractFunction('reportTypingPracticeIssue');
    expect(source).not.toContain('allo-live-typingpractice');
    expect(issueReporter).toContain("notice.setAttribute('role', 'alert')");
    expect(issueReporter).toContain("close.setAttribute('aria-label', 'Dismiss Typing Practice message')");
    expect(issueReporter).not.toContain('setTimeout');
  });

  it('avoids duplicate generation-start and generation-failure announcements', () => {
    const setupStart = source.indexOf("id: 'tp-passage-generation-status'");
    const setupEnd = source.indexOf('// Actions', setupStart);
    const descriptiveStatus = source.slice(setupStart, setupEnd);
    const generatePassage = source.slice(
      source.indexOf('var generatePassage = function()'),
      source.indexOf('// VIEW: PASSAGE-SETUP')
    );

    expect(descriptiveStatus).not.toContain("role: 'status'");
    expect(descriptiveStatus).not.toContain("'aria-live'");
    expect(generatePassage).toContain("setAnnounceText('Generating a personalized passage.");
    expect(generatePassage).toContain("setGenError('Could not generate a passage.");
    expect(generatePassage).not.toContain("setAnnounceText('Passage generation failed.");
    expect(generatePassage).not.toContain("setAnnounceText('Passage generation is unavailable.");
  });
});
