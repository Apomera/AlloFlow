import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'stem_lab/stem_tool_typingpractice.js');
const mirrorPath = path.join(root, 'desktop/web-app/public/stem_lab/stem_tool_typingpractice.js');
const source = fs.readFileSync(sourcePath, 'utf8');

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
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('Unterminated function: ' + name);
}

const evaluate = (name, dependencies = {}) => {
  const names = Object.keys(dependencies);
  const values = Object.values(dependencies);
  return Function(...names, 'return (' + extractFunction(name) + ')')(...values);
};

describe('Typing Practice Battle Mode timing and interaction accessibility', () => {
  it('shifts every live deadline and excludes paused time from duration', () => {
    const shift = evaluate('typingPracticeShiftBattleClock');
    const before = {
      startedAt: 1_000,
      lastRiseAt: 2_000,
      pauseUntil: 0,
      botLastRiseAt: 3_000,
      botNextKeyAt: 3_500,
      incomingFlashTo: 4_000,
      outgoingFlashTo: 0,
      clearBurstAt: 2_500,
      pickerOpenedAt: 1_800,
      pausedMs: 500,
    };
    const after = shift(before, 2_000);
    expect(after).toMatchObject({
      startedAt: 3_000,
      lastRiseAt: 4_000,
      pauseUntil: 0,
      botLastRiseAt: 5_000,
      botNextKeyAt: 5_500,
      incomingFlashTo: 6_000,
      outgoingFlashTo: 0,
      clearBurstAt: 4_500,
      pickerOpenedAt: 3_800,
      pausedMs: 2_500,
    });
    expect(before.startedAt).toBe(1_000);
  });

  it('pauses idempotently and resumes without deadline catch-up', () => {
    const shift = evaluate('typingPracticeShiftBattleClock');
    const pause = evaluate('typingPracticePauseBattleClock');
    const resume = evaluate('typingPracticeResumeBattleClock', {
      typingPracticeShiftBattleClock: shift,
    });
    const running = { paused: false, startedAt: 1_000, lastRiseAt: 4_000, pausedMs: 0 };
    const paused = pause(running, 5_000, true);
    expect(paused).toMatchObject({ paused: true, pausedAt: 5_000, autoPaused: true });
    expect(pause(paused, 6_000, true)).toBe(paused);
    expect(resume(paused, 8_000)).toMatchObject({
      paused: false,
      pausedAt: 0,
      autoPaused: false,
      startedAt: 4_000,
      lastRiseAt: 7_000,
      pausedMs: 3_000,
    });
  });

  it('makes attack selection untimed and freezes both stacks during the choice', () => {
    const shift = evaluate('typingPracticeShiftBattleClock');
    const resolve = evaluate('typingPracticeResolveBattlePicker', {
      typingPracticeShiftBattleClock: shift,
    });
    const open = {
      pickerOpen: true,
      pickerOpenedAt: 5_000,
      pickerOptions: ['quartz', 'zephyr', 'puzzle'],
      botStack: ['tree'],
      startedAt: 1_000,
      botNextKeyAt: 5_500,
      combo: 4,
      pausedMs: 0,
    };
    expect(resolve(open, 9_000, 'zephyr')).toMatchObject({
      pickerOpen: false,
      pickerOpenedAt: 0,
      pickerOptions: [],
      botStack: ['tree', 'zephyr'],
      startedAt: 5_000,
      botNextKeyAt: 9_500,
      combo: 0,
      pausedMs: 4_000,
      outgoingFlashTo: 10_200,
    });
    expect(source).toContain("if (state.battle.view !== 'playing' || battleSt.ended || battleSt.paused || battleSt.pickerOpen) return;");
    expect(source).toContain('return typingPracticeAdvanceBattleTick(current, now');
    expect(source).not.toContain('pickerTimeoutAt');
    expect(source).not.toContain('auto-pick option 1');
    expect(source).toContain('No time limit · both stacks paused');
  });

  it('auto-pauses hidden or unfocused matches with deduplication', () => {
    expect(source).toContain("window.addEventListener('blur', onBlur)");
    expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain("if (document.hidden) pauseForInterruption('this page moved to the background')");
    expect(source).toContain('if (battlePauseInterruptionRef.current) return');
    expect(source).toContain('typingPracticeResumeBattleClock(current, now)');
    expect(source).toContain('both stacks and the match clock are frozen');
  });

  it('keeps controls keyboard-native and exposes the untimed choice to touch users', () => {
    expect(source).toContain('if (typingPracticeIsInteractiveTarget(e.target)) return;');
    expect(source).toContain("'aria-keyshortcuts': String(i + 1)");
    expect(source).toContain("'aria-labelledby': 'tp-battle-picker-title'");
    expect(source).toContain("'aria-describedby': 'tp-battle-picker-timing tp-battle-picker-help'");
    expect(source).toContain("}, 'Skip attack')");
    expect(source).toContain('ref: i === 0 ? battleAttackOptionRef : null');
    expect(source).toContain('minWidth: 44, minHeight: 44');
    expect(source).not.toContain("'aria-modal': 'true',\n                'aria-label': __alloT('stem.typingpractice.choose_an_attack_word");
  });

  it('restores focus to the native Battle input without disabling controls', () => {
    expect(source).toContain('ref: battleCaptureRef');
    expect(source).toContain("role: 'region'");
    expect(source).toContain("'aria-label': 'Battle Mode typing play area'");
    expect(source).toContain("'aria-describedby': 'tp-battle-play-help tp-battle-current-key'");
    expect(source).toContain('if (battleCaptureRef.current) battleCaptureRef.current.focus();');
  });

  it('keeps the desktop mirror identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
