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

const inputContext = evaluate('typingPracticeInputContext');
const advanceBattleTick = evaluate('typingPracticeAdvanceBattleTick');
const buildBattleResult = evaluate('typingPracticeBuildBattleResult', {
  typingPracticeInputContext: inputContext,
});

const tickConfig = (overrides = {}) => ({
  riseMs: 5_000,
  isVsBot: true,
  msPerChar: 200,
  botErrorRate: 0,
  botSendEvery: 5,
  stackLimit: 10,
  ...overrides,
});

const tickCandidates = (overrides = {}) => ({
  playerRiseWord: 'quartz',
  botRiseWord: 'zephyr',
  botAttackWord: 'puzzle',
  botMakesError: false,
  ...overrides,
});

const battleState = (overrides = {}) => ({
  stack: ['tree'],
  typed: 'tr',
  startedAt: 1_000,
  lastRiseAt: 9_000,
  pauseUntil: 0,
  cleared: 8,
  errors: 3,
  combo: 2,
  bestCombo: 4,
  paused: false,
  ended: false,
  pickerOpen: false,
  assistedInput: false,
  inputMethods: { keyboard: 7, 'text-input': 2, ime: 0, paste: 0, dictation: 0 },
  inputGraphemes: { keyboard: 7, 'text-input': 3, ime: 0, paste: 0, dictation: 0 },
  botStack: ['moon'],
  botTyped: 'm',
  botCleared: 5,
  botLastRiseAt: 9_000,
  botNextKeyAt: 11_000,
  botClearedSinceSend: 0,
  incomingFlashTo: 0,
  outgoingFlashTo: 0,
  ...overrides,
});

describe('Typing Practice Battle tick integrity', () => {
  it('returns the same state object when a tick has no work to perform', () => {
    const current = battleState();
    const next = advanceBattleTick(current, 10_000, tickConfig(), tickCandidates());

    expect(next).toBe(current);
  });

  it('preserves the latest player progress and input ledgers during a bot-only tick', () => {
    const current = battleState({ botNextKeyAt: 9_900 });
    const next = advanceBattleTick(current, 10_000, tickConfig(), tickCandidates());

    expect(next).not.toBe(current);
    expect(next.botTyped).toBe('mo');
    expect(next).toMatchObject({
      typed: 'tr',
      errors: 3,
      cleared: 8,
      bestCombo: 4,
      inputMethods: current.inputMethods,
      inputGraphemes: current.inputGraphemes,
    });
  });

  it('commits the capped stack and terminal metadata in one atomic state', () => {
    const current = battleState({
      stack: ['tree', 'moon'],
      lastRiseAt: 1_000,
      botNextKeyAt: 20_000,
    });
    const next = advanceBattleTick(
      current,
      10_000,
      tickConfig({ stackLimit: 3 }),
      tickCandidates({ playerRiseWord: 'quartz' }),
    );

    expect(next).toMatchObject({
      stack: ['tree', 'moon', 'quartz'],
      ended: true,
      endedAt: 10_000,
      outcome: 'loss',
      cleared: 8,
      errors: 3,
      bestCombo: 4,
    });
  });

  it('builds the result only from final state and excludes assisted matches from records', () => {
    const finalState = battleState({
      ended: true,
      endedAt: 13_400,
      outcome: 'loss',
      startedAt: 3_000,
      cleared: 11,
      errors: 4,
      bestCombo: 6,
      botCleared: 9,
      assistedInput: true,
      inputMethods: { keyboard: 4, 'text-input': 0, ime: 0, paste: 0, dictation: 2 },
      inputGraphemes: { keyboard: 4, 'text-input': 0, ime: 0, paste: 0, dictation: 9 },
    });
    const result = buildBattleResult(finalState, {
      mode: 'vs-bot',
      difficulty: 'steady',
      botSpeed: 'fast',
    });

    expect(result).toMatchObject({
      mode: 'vs-bot',
      difficulty: 'steady',
      botSpeed: 'fast',
      outcome: 'loss',
      cleared: 11,
      errors: 4,
      bestCombo: 6,
      botCleared: 9,
      durationSec: 10,
      measurementComparable: false,
      inputEventCounts: finalState.inputMethods,
      inputGraphemeCounts: finalState.inputGraphemes,
    });
    expect(result.measurementNote).toContain('excluded from Battle records');
  });

  it('advances through a functional setter and finalizes once in a guarded effect', () => {
    expect(source).toMatch(
      /setBattleSt\(function\(current\)\s*\{\s*return typingPracticeAdvanceBattleTick\(current,/,
    );
    expect(source).toContain('var battleCompletionSavedRef = useRef(false);');
    expect(source).toContain('battleCompletionSavedRef.current = false;');
    expect(source).toContain('if (!battleSt.ended || !battleSt.endedAt || battleCompletionSavedRef.current) return;');
    expect(source).toContain('battleCompletionSavedRef.current = true;');
    expect(source).not.toContain('setBattleSt(Object.assign({}, battleSt, patch');
  });

  it('keeps the desktop mirror identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
