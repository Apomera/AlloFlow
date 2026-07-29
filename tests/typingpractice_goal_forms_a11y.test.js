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

function snippetAfter(marker, length = 950) {
  const start = source.indexOf(marker);
  expect(start, 'Missing marker: ' + marker).toBeGreaterThanOrEqual(0);
  return source.slice(start, start + length);
}

describe('Typing Practice goal form accessibility and data safety', () => {
  it('validates optional whole-number fields without mutating saved data', () => {
    const validate = Function('return (' + extractFunction('typingPracticeBoundedNumber') + ')')();
    expect(validate('', 1, 20, 'Sessions')).toEqual({ valid: true, value: null, message: '' });
    expect(validate('12', 1, 20, 'Sessions')).toEqual({ valid: true, value: 12, message: '' });
    expect(validate('0', 1, 20, 'Sessions')).toMatchObject({ valid: false, value: null });
    expect(validate('21', 1, 20, 'Sessions').message).toBe('Sessions must be between 1 and 20.');
    expect(validate('3.5', 1, 20, 'Sessions').message).toBe('Sessions must be a whole number.');
  });

  it('sanitizes imported IEP goals using the same boundaries', () => {
    const validate = Function('return (' + extractFunction('typingPracticeBoundedNumber') + ')')();
    const importGoal = Function('typingPracticeBoundedNumber', 'return (' + extractFunction('typingPracticeImportedIepGoal') + ')')(validate);
    expect(importGoal({ targetWpm: 25, targetAccuracy: 90, notes: 'Home row.' })).toEqual({ targetWpm: 25, targetAccuracy: 90, notes: 'Home row.' });
    expect(importGoal({ notes: 'Observation only.' })).toEqual({ notes: 'Observation only.' });
    expect(importGoal({})).toBeNull();
    expect(() => importGoal({ targetWpm: 121 })).toThrow('Imported target WPM must be between 1 and 120.');
    expect(() => importGoal({ targetAccuracy: 49 })).toThrow('Imported target accuracy must be between 50 and 100.');
  });

  it('keeps number edits local until blur or Enter and supports Escape cancellation', () => {
    expect(source).toContain('var goalNumberDraftsTuple = useState({});');
    expect(source).toContain("if (e.key === 'Enter')");
    expect(source).toContain('e.currentTarget.blur();');
    expect(source).toContain("else if (e.key === 'Escape')");
    expect(source).toContain("' The previous saved value is unchanged.'");
    expect(source).toContain('Number fields save after you leave the field or press Enter.');
  });

  it('connects each invalid number field to a visible error message', () => {
    const fields = [
      ['tp-daily-sessions', 'dailySessions'], ['tp-daily-wpm', 'dailyWpm'],
      ['tp-iep-wpm', 'iepWpm'], ['tp-iep-acc', 'iepAccuracy']
    ];
    for (const [id, key] of fields) {
      const block = snippetAfter("id: '" + id + "'");
      expect(block).toContain("'aria-invalid': goalNumberTouched." + key);
      expect(block).toContain("'aria-errormessage': goalNumberTouched." + key);
      expect(block).toContain('onBlur: function(e)');
    }
    expect(source).toContain("className: 'tp-field-error'");
  });

  it('does not invent numeric IEP targets when only notes are entered', () => {
    expect(source).toContain("var newGoal = Object.assign({}, state.iepGoal || {});");
    expect(source).not.toContain("state.iepGoal || { targetWpm: 15, targetAccuracy: 85 }");
    expect(source).not.toContain("state.iepGoal || { targetAccuracy: 85, notes: '' }");
    expect(source).not.toContain("state.iepGoal || { targetWpm: 15, notes: '' }");
  });

  it('validates imports before confirmation and announces file operations', () => {
    const profileStart = source.indexOf("var parsed = JSON.parse(ev.target.result);");
    const validation = source.indexOf('typingPracticeImportedIepGoal(parsed.iepGoal)', profileStart);
    const confirmation = source.indexOf("askTypingPracticeConfirmation('Current accommodations", profileStart);
    const apply = source.indexOf('updMulti(updates);', confirmation);
    expect(profileStart).toBeGreaterThanOrEqual(0);
    expect(validation).toBeGreaterThan(profileStart);
    expect(confirmation).toBeGreaterThan(validation);
    expect(apply).toBeGreaterThan(confirmation);
    expect(source).toContain("setAnnounceText('Typing Practice profile exported.')");
    expect(source).toContain("setAnnounceText('Typing Practice profile imported. Settings have been updated.')");
    expect(source).toContain("setAnnounceText('Full Typing Practice backup exported.')");
    expect(source).toContain("setAnnounceText('All Typing Practice data permanently cleared.')");
  });

  it('confirms IEP clearing and resets stale drafts after replacement actions', () => {
    expect(source).toContain("askTypingPracticeConfirmation('Clear the IEP goal and notes? This cannot be undone.'");
    expect(source).toContain("title: 'Clear IEP goal?', confirmText: 'Clear goal'");
    expect(source).toContain("clearGoalDraft('iepWpm')");
    expect(source).toContain("clearGoalDraft('iepAccuracy')");
    expect(source).toContain('setGoalNumberDrafts({});');
    expect(source).toContain('setGoalNumberTouched({});');
  });
});
