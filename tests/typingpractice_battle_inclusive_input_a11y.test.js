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

const graphemes = (value) => Array.from(String(value || ''));
const normalize = (value) => String(value || '').normalize('NFC');
const applyBattleInput = Function(
  'typingPracticeGraphemes',
  'typingPracticeNormalizeText',
  'return (' + extractFunction('typingPracticeApplyBattleTextInput') + ')'
)(graphemes, normalize);

const baseState = () => ({
  stack: ['tree', 'moon'],
  typed: '',
  cleared: 0,
  errors: 0,
  combo: 0,
  bestCombo: 0,
  paused: false,
  ended: false,
  pickerOpen: false,
  clearBurstCount: 0,
});

describe('Typing Practice Battle Mode inclusive input', () => {
  it('accepts a whole assistive text event but never spills into the next word', () => {
    const result = applyBattleInput(baseState(), 'treemoon', 10_000, 1_500);
    expect(result.wordCleared).toBe(true);
    expect(result.steps).toHaveLength(4);
    expect(result.state).toMatchObject({
      stack: ['moon'],
      typed: '',
      cleared: 1,
      combo: 1,
      bestCombo: 1,
      pauseUntil: 11_500,
      clearBurstAt: 10_000,
      clearBurstCount: 1,
      feedback: null,
    });
  });

  it('keeps incorrect input in place and exposes retry-oriented feedback', () => {
    const state = { ...baseState(), typed: 'tr' };
    const first = applyBattleInput(state, 'x', 10_000, 0);
    expect(first.state).toMatchObject({
      typed: 'tr',
      errors: 1,
      combo: 0,
      lastWasWrong: true,
      feedback: { expected: 'e', actual: 'x', index: 2, attempt: 1 },
    });
    const second = applyBattleInput(first.state, 'y', 10_100, 0);
    expect(second.state.feedback.attempt).toBe(2);
  });

  it('does not accept input while paused, ended, or choosing an attack', () => {
    for (const flag of ['paused', 'ended', 'pickerOpen']) {
      const state = { ...baseState(), [flag]: true };
      const result = applyBattleInput(state, 't', 10_000, 0);
      expect(result.steps).toEqual([]);
      expect(result.state.typed).toBe('');
    }
  });

  it('uses a real textarea for keyboard, touch, switch, paste, and IME input', () => {
    expect(source).toContain("id: 'tp-battle-capture'");
    expect(source).toContain('ref: battleCaptureRef');
    expect(source).toContain("inputMode: 'text'");
    expect(source).toContain('onKeyDown: onBattleKeyDown');
    expect(source).toContain('onBeforeInput: onBattleBeforeInput');
    expect(source).toContain('onInput: onBattleAssistiveInput');
    expect(source).toContain('onPaste: onBattlePaste');
    expect(source).toContain('onCompositionStart: onBattleCompositionStart');
    expect(source).toContain('onCompositionEnd: onBattleCompositionEnd');
    expect(source).toContain('touch keyboards, switch input, paste, dictation, and input methods are supported');
  });

  it('provides next-key and error semantics without relying on color', () => {
    expect(source).toContain("'aria-describedby': 'tp-battle-play-help tp-battle-current-key'");
    expect(source).toContain("'aria-errormessage': battleSt.feedback ? 'tp-battle-mistake-feedback'");
    expect(source).toContain("id: 'tp-battle-mistake-feedback'");
    expect(source).toContain("id: 'tp-battle-mistake-feedback'");
    expect(source).toContain("role: 'note'");
    expect(source).toContain('typingPracticeMistakeMessage(battleSt.feedback)');
    expect(source).toContain('Tap the highlighted word to open a touch keyboard.');
    expect(source).toContain('Press F2 to hear the next key.');
  });

  it('keeps assisted multi-character matches as practice without changing records', () => {
    expect(source).toContain("next.assistedInput = !!battleSt.assistedInput || inputKind === 'paste' || insertedCount > 1");
    expect(source).toContain('var comparableBattle = result.measurementComparable !== false');
    expect(source).toContain('var newPb = comparableBattle ?');
    expect(source).toContain('var newPbBot = isVsBot && comparableBattle ?');
    expect(source).toContain("h('strong', { style: { color: palette.text } }, 'Practice result · ')");
    expect(source).toContain('excluded from Battle records');
  });

  it('reflows Battle columns and preserves boundaries in forced colors', () => {
    expect(source).toContain('.tp-root .tp-battle-stage, .tp-root .tp-battle-menu { padding: 12px !important; }');
    expect(source).toContain('.tp-root .tp-stack-col { min-width: 0 !important; width: 100%; min-height: 300px !important; }');
    expect(source).toContain('.tp-root .tp-battle-target, .tp-root .tp-stack-col { border-color: CanvasText !important; }');
  });

  it('keeps the desktop mirror identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
