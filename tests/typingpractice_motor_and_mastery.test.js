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

function compileFunction(name, bindings = {}) {
  return Function(
    ...Object.keys(bindings),
    'return (' + extractFunction(name) + ')'
  )(...Object.values(bindings));
}

const motorSettings = compileFunction('typingPracticeMotorSettings');
const keyFilter = compileFunction('typingPracticeKeyFilter');
// Sticky Shift follows the real layout, so it needs the keyboard model
// (SECTION 2b) and the lesson section that holds the layout helpers (2d).
const stickyShift = (() => {
  const start = source.indexOf('  // SECTION 2b: KEYBOARD LAYOUT');
  const end = source.indexOf('  // SECTION 2c: AUDIO CUES');
  const helpers = ['fingerLabel', 'typingPracticeKeyName'].map((n) => extractFunction(n)).join('\n');
  const core = Function('__alloTPT', source.slice(start, end) + '\n' + helpers + '\nreturn { typingPracticeLayoutStickyShift: typingPracticeLayoutStickyShift };')((k, fb) => fb);
  return compileFunction('typingPracticeApplyStickyShift', core);
})();
const textSignature = compileFunction('typingPracticeTextSignature');
const cleanMasteryList = compileFunction('typingPracticeCleanMasteryList');
const recordMasteryCheck = compileFunction('typingPracticeRecordMasteryCheck', {
  typingPracticeCleanMasteryList: cleanMasteryList
});
const evaluateMastery = compileFunction('typingPracticeEvaluateMastery', {
  typingPracticeCleanMasteryList: cleanMasteryList
});
const xpGrants = compileFunction('typingPracticeSessionXpGrants');
const gradeBand = compileFunction('typingPracticeGradeBandFromHost');
const normalizeText = compileFunction('typingPracticeNormalizeText');
const graphemes = compileFunction('typingPracticeGraphemes', { typingPracticeNormalizeText: normalizeText });
const applyTextInput = compileFunction('typingPracticeApplyTextInput', {
  typingPracticeGraphemes: graphemes,
  typingPracticeNormalizeText: normalizeText
});

const drill = { id: 'home-row', name: 'Home Row', masteryWpm: 15, masteryAcc: 95 };

function runs(list) {
  return list.reduce((checks, [wpm, accuracy, text], i) => recordMasteryCheck(checks, drill, {
    date: '2026-07-0' + (i + 1) + 'T10:00:00.000Z', wpm, accuracy, text
  }), {});
}

describe('Typing Practice motor timing windows', () => {
  it('clamps stored settings and keeps repeat filtering on unless explicitly off', () => {
    expect(motorSettings({})).toEqual({ ignoreKeyRepeat: true, bounceMs: 0, acceptDelayMs: 0, stickyShift: false });
    expect(motorSettings({ ignoreKeyRepeat: false, bounceMs: 300, acceptDelayMs: '500', stickyShift: true }))
      .toEqual({ ignoreKeyRepeat: false, bounceMs: 300, acceptDelayMs: 500, stickyShift: true });
    expect(motorSettings({ bounceMs: 99999, acceptDelayMs: 'abc' })).toMatchObject({ bounceMs: 0, acceptDelayMs: 0 });
  });

  it('drops auto-repeat and same-key presses inside the bounce window only', () => {
    const settings = motorSettings({ bounceMs: 300 });
    expect(keyFilter(settings, {}, 'a', true, 1000).accept).toBe(false);
    const first = keyFilter(settings, {}, 'a', false, 1000);
    expect(first.accept).toBe(true);
    expect(keyFilter(settings, first.memory, 'a', false, 1200)).toMatchObject({ accept: false, reason: 'bounce' });
    expect(keyFilter(settings, first.memory, 's', false, 1200).accept).toBe(true);
    expect(keyFilter(settings, first.memory, 'a', false, 1301).accept).toBe(true);
    expect(keyFilter(motorSettings({ ignoreKeyRepeat: false }), {}, 'a', true, 0).accept).toBe(true);
  });

  it('shifts one character for sticky Shift, with symbols only on US-based layouts', () => {
    expect(stickyShift('a', 'qwerty-us')).toBe('A');
    expect(stickyShift('1', 'qwerty-us')).toBe('!');
    expect(stickyShift(';', 'dvorak')).toBe(':');
    expect(stickyShift('1', 'azerty-fr')).toBe('1');
    // Real AZERTY: Shift on the é key types 2 (it is the 2 key).
    expect(stickyShift('é', 'azerty-fr')).toBe('2');
    expect(stickyShift(' ', 'qwerty-us')).toBe(' ');
  });

  it('applies motor windows only in the physical-keyboard keydown path', () => {
    const start = source.indexOf('var onKeyDown = useCallback');
    const end = source.indexOf('var onAssistiveInput = function', start);
    const block = source.slice(start, end);
    expect(block).toContain("var physicalKey = typeof e.code === 'string' && e.code !== '' && e.code !== 'Unidentified';");
    expect(block).toContain('if (physicalKey) {');
    expect(block).toContain('typingPracticeKeyFilter(motor, keyFilterMemoryRef.current, key, !!e.repeat, Date.now())');
    expect(block).toContain('var onKeyUp = function(e)');
    expect(source).toContain('onKeyDown: onKeyDown, onKeyUp: onKeyUp,');
    const assistive = source.slice(end, source.indexOf('var onTypingPaste', end));
    expect(assistive).not.toContain('typingPracticeKeyFilter');
  });
});

describe('Typing Practice accuracy-first mastery', () => {
  it('requires 3 of the last 5 runs meeting both goals, on at least 2 texts', () => {
    expect(evaluateMastery(runs([[20, 97, 'a']])['home-row']).mastered).toBe(false);
    const sameText = evaluateMastery(runs([[20, 97, 'a'], [20, 97, 'a'], [20, 97, 'a']])['home-row']);
    expect(sameText).toMatchObject({ bothCount: 3, distinctTexts: 1, mastered: false, gap: 'variety' });
    const mastered = evaluateMastery(runs([[20, 97, 'a'], [10, 80, 'b'], [20, 97, 'a'], [20, 96, 'b']])['home-row']);
    expect(mastered.mastered).toBe(true);
  });

  it('only counts the last 5 runs per tier and stores no passage text', () => {
    const checks = runs([[20, 97, 'a'], [20, 97, 'b'], [20, 97, 'a'], [10, 80, 'c'], [10, 80, 'c'], [10, 80, 'c'], [10, 80, 'c']]);
    expect(checks['home-row']).toHaveLength(5);
    expect(evaluateMastery(checks['home-row'])).toMatchObject({ bothCount: 1, mastered: false });
    expect(textSignature('asdf jkl;')).toBe(textSignature('asdf jkl;'));
    expect(textSignature('asdf jkl;')).not.toBe(textSignature('asdf jkl'));
    expect(textSignature('a'.repeat(400)).length).toBeLessThan(20);
  });

  it('names accuracy as the gap when speed is met but accuracy is not', () => {
    const result = evaluateMastery(runs([[40, 88, 'a']])['home-row']);
    expect(result).toMatchObject({ gap: 'accuracy', latestWpmMet: true, latestAccMet: false });
    expect(evaluateMastery(runs([[10, 99, 'a']])['home-row']).gap).toBe('speed');
    expect(evaluateMastery(runs([[20, 99, 'a']])['home-row']).gap).toBe('repeat');
  });

  it('uses the new rule at save time and tells fast, inaccurate students to slow down', () => {
    expect(source).toContain('typingPracticeRecordMasteryCheck(state.masteryChecks, activeDrill, {');
    expect(source).toContain("summary.masteryRule = 'repeated';");
    expect(source).not.toContain('wpm >= activeDrill.masteryWpm && accuracy >= activeDrill.masteryAcc &&\n              state.masteryLevel === activeDrill.tier');
    expect(source).toContain('You have the speed. Slow down slightly to protect accuracy.');
    expect(source).toContain('if (wpmGap <= 0 && accGap > 0) {');
  });
});

describe('Typing Practice XP within the no-guilt rules', () => {
  const defaults = { showKeyboard: true, ignoreKeyRepeat: true, dyslexiaFont: false, bounceMs: 0 };

  it('grants practice XP every session and one-time tier and support XP', () => {
    const summary = { drillId: 'home-row', drillName: 'Home Row', measurementComparable: true, accommodationsUsed: ['showKeyboard', 'ignoreKeyRepeat', 'dyslexiaFont', 'bounceMs'] };
    const acc = { showKeyboard: true, ignoreKeyRepeat: true, dyslexiaFont: true, bounceMs: 300 };
    const first = xpGrants(summary, {}, defaults, acc, true);
    expect(first.grants).toEqual([
      { id: 'typingPractice_practice', points: 2, reason: 'Completed a typing practice session' },
      { id: 'typingPractice_tier_home-row', points: 10, reason: 'Mastered Home Row' },
      { id: 'typingPractice_acc_dyslexiaFont', points: 3, reason: 'Practiced with a support turned on' },
      { id: 'typingPractice_acc_bounceMs', points: 3, reason: 'Practiced with a support turned on' }
    ]);
    const second = xpGrants(summary, first.xpAwarded, defaults, acc, true);
    expect(second.grants.map((g) => g.id)).toEqual(['typingPractice_practice']);
  });

  it('never grants XP for warmups or pasted and dictated sessions', () => {
    expect(xpGrants({ isWarmup: true }, {}, defaults, {}, false).grants).toEqual([]);
    expect(xpGrants({ measurementComparable: false, accommodationsUsed: ['dyslexiaFont'] }, {}, defaults, { dyslexiaFont: true }, true).grants).toEqual([]);
  });

  it('guards for a host without awardXP and never awards on discard', () => {
    expect(source).toContain("if (typeof ctx.awardXP === 'function') {");
    const discard = extractFunction('typingPracticeDiscardSessionUpdates');
    expect(discard).not.toContain('awardXP');
    expect(discard).not.toContain('xpAwarded');
  });
});

describe('Typing Practice quick fixes', () => {
  it('records missed spaces as space errors', () => {
    const result = applyTextInput('a b', 'a', 'x', {});
    expect(result.errorsByCharacter).toEqual({ ' ': 1 });
  });

  it('lists each AZERTY bottom-row key once', () => {
    // Layout legends are space-separated rows in code order (SECTION 2b);
    // the ISO bottom row starts with the < key left of W.
    const row = "< w x c v b n , ; : !";
    expect(source).toContain("'" + row + "'");
    expect(new Set(row.split(' ')).size).toBe(row.split(' ').length);
    expect(source).not.toContain("';',';'");
  });

  it('maps the host grade to a passage grade band', () => {
    expect(gradeBand('Kindergarten')).toBe('K');
    expect(gradeBand('1st Grade')).toBe('1');
    expect(gradeBand('5th Grade')).toBe('4-5');
    expect(gradeBand(7)).toBe('6-8');
    expect(gradeBand('Grade 11')).toBe('9-12');
    expect(gradeBand('College')).toBeNull();
    expect(gradeBand(undefined)).toBeNull();
  });

  it('routes the summary coach suggestion through the lock-checked startDrill', () => {
    expect(source).toContain('onClick: function() { startDrill(recId); },');
  });

  it('uses the dyslexia font on the typing target when that support is on', () => {
    expect(source).toContain("fontFamily: state.accommodations.dyslexiaFont ? fontFamily : 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',");
  });

  it('keeps inline HTML text at 12px or larger', () => {
    expect(source).not.toMatch(/fontSize: '(?:[0-9]|10)px'/);
    // Numeric sizes inside HTML style objects (SVG mascot glyphs are not styles).
    expect(source).not.toMatch(/style: \{[^}\n]*fontSize: (?:[0-9]|10)\b/);
    expect(source).not.toMatch(/^\s*fontSize: (?:[0-9]|10),/m);
  });

  it('accepts the new progress fields in backups', () => {
    const validator = extractFunction('typingPracticeValidateBackupState');
    expect(validator).toContain("'masteryChecks', 'xpAwarded'");
  });
});
