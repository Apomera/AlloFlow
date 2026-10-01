import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error('Start marker not found: ' + startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error('End marker not found: ' + endMarker);
  return source.slice(start, end);
}

const classifyInputType = Function(
  'return (' + extractFunction('typingPracticeInputKindFromType') + ')'
)();
const inputContext = Function(
  'return (' + extractFunction('typingPracticeInputContext') + ')'
)();

describe('Typing Practice mobile measurement and runtime integrity', () => {
  it('classifies native insertion types without conflating speech, paste, and IME', () => {
    expect(classifyInputType('insertText')).toBe('text-input');
    expect(classifyInputType('insertReplacementText')).toBe('text-input');
    expect(classifyInputType('insertCompositionText')).toBe('ime');
    expect(classifyInputType('insertFromDictation')).toBe('dictation');
    expect(classifyInputType('insertFromSpeech')).toBe('dictation');
    expect(classifyInputType('insertFromPaste')).toBe('paste');
    expect(classifyInputType('insertFromDrop')).toBe('paste');
    expect(classifyInputType('deleteContentBackward')).toBe(null);
    expect(classifyInputType('')).toBe(null);
  });

  it('keeps event and grapheme counts distinct for a batched dictation event', () => {
    const context = inputContext(
      { keyboard: 2, dictation: 1 },
      { keyboard: 2, dictation: 14 }
    );

    expect(context.inputMethods).toContain('Dictation or speech input');
    expect(context.inputEventCounts).toMatchObject({ keyboard: 2, dictation: 1 });
    expect(context.inputGraphemeCounts).toMatchObject({ keyboard: 2, dictation: 14 });
    expect(context.measurementComparable).toBe(false);
    expect(context.measurementNote).toMatch(/dictation|speech/i);
    expect(context.measurementNote).toMatch(/retained as practice/i);
  });

  it('records multi-character IME composition without treating language input as assistance', () => {
    const context = inputContext({ ime: 1 }, { ime: 6 });

    expect(context.inputMethods).toEqual(['Language input method (IME)']);
    expect(context.primaryInputMethod).toBe('Language input method (IME)');
    expect(context.inputEventCounts.ime).toBe(1);
    expect(context.inputGraphemeCounts.ime).toBe(6);
    expect(context.measurementComparable).toBe(true);
  });

  it('classifies paste independently and preserves its non-comparable practice policy', () => {
    const context = inputContext({ paste: 1 }, { paste: 9 });

    expect(classifyInputType('insertFromPaste')).toBe('paste');
    expect(context.inputMethods).toEqual(['Pasted text']);
    expect(context.inputEventCounts.paste).toBe(1);
    expect(context.inputGraphemeCounts.paste).toBe(9);
    expect(context.measurementComparable).toBe(false);
    expect(context.measurementNote).toMatch(/pasted text/i);
  });

  it('uses the shared classifier and persists applied-grapheme counts in drills and Battle', () => {
    const classifierUses = source.match(/typingPracticeInputKindFromType\(inputType\)/g) || [];
    expect(classifierUses.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('inputMethodGraphemeCountsRef');
    expect(source).toContain('inputGraphemeCounts');
    expect(source).toContain('result.steps.length');
    expect(source).toMatch(/inputGraphemeCounts\s*:\s*Object\.assign\(\{\},\s*inputMethodGraphemeCountsRef\.current/);
    expect(source).toContain('typingPracticeBuildBattleResult(battleSt');
    expect(source).toContain('typingPracticeInputContext(finalState.inputMethods, finalState.inputGraphemes)');
  });

  it('focuses the drill capture synchronously from Resume and does not reopen it after blur', () => {
    const pauseToggle = between('var togglePause = function() {', '// ── Auto-pause on window or page interruption');
    const resumeBranch = pauseToggle.slice(pauseToggle.indexOf('if (paused) {'), pauseToggle.indexOf('} else {'));
    const focusAt = resumeBranch.indexOf('captureRef.current.focus()');
    const unpauseAt = resumeBranch.indexOf('setPaused(false)');

    expect(focusAt).toBeGreaterThanOrEqual(0);
    expect(unpauseAt).toBeGreaterThanOrEqual(0);
    expect(focusAt).toBeLessThan(unpauseAt);
    expect(resumeBranch).not.toContain('setTimeout');

    const capture = between("id: 'tp-typing-capture'", "h('p', { id: 'tp-input-method-help'");
    const blur = capture.slice(capture.indexOf('onBlur:'), capture.indexOf('style:', capture.indexOf('onBlur:')));
    expect(blur).not.toContain('setTimeout');
    expect(blur).not.toContain('captureRef.current.focus');
  });

  it('offers a coarse-pointer Show keyboard control after intentional dismissal', () => {
    expect(source).toContain("matchMedia('(pointer: coarse)')");
    expect(source).toContain('captureNeedsTap');
    expect(source).toMatch(/h\('button',[\s\S]{0,1000}'Show keyboard'/);

    const showKeyboardAt = source.indexOf("'Show keyboard'");
    expect(showKeyboardAt).toBeGreaterThanOrEqual(0);
    const cta = source.slice(Math.max(0, showKeyboardAt - 1000), showKeyboardAt + 100);
    expect(cta).toContain("type: 'button'");
    expect(cta).toContain('captureRef.current.focus()');
  });

  it('scopes visualViewport work to active play and removes every listener and CSS variable', () => {
    const viewportAt = source.indexOf('window.visualViewport');
    expect(viewportAt).toBeGreaterThanOrEqual(0);
    const viewportEffect = source.slice(Math.max(0, viewportAt - 900), viewportAt + 2600);

    expect(viewportEffect).toMatch(/state\.view\s*!==\s*'drill'[\s\S]{0,100}state\.view\s*!==\s*'battle'/);
    expect(viewportEffect).toMatch(/style\.setProperty\('--tp-[^']+'/);
    expect(viewportEffect).toMatch(/addEventListener\('resize',\s*([A-Za-z_$][\w$]*)\)/);
    expect(viewportEffect).toMatch(/removeEventListener\('resize',\s*([A-Za-z_$][\w$]*)\)/);
    expect(viewportEffect).toMatch(/addEventListener\('scroll',\s*([A-Za-z_$][\w$]*)\)/);
    expect(viewportEffect).toMatch(/removeEventListener\('scroll',\s*([A-Za-z_$][\w$]*)\)/);
    expect(viewportEffect).toMatch(/style\.removeProperty\('--tp-[^']+'/);
  });

  it('uses dynamic viewport units, safe-area insets, and a coarse-pointer scrolling background', () => {
    expect(source).toContain('100dvh');
    expect(source).toContain('env(safe-area-inset-top)');
    expect(source).toContain('env(safe-area-inset-bottom)');
    expect(source).toContain('@media (pointer: coarse)');
    expect(source).toMatch(/background-attachment:\s*scroll\s*!important/);
  });

  it('starts the live clock only after input and ticks no more than once per second', () => {
    const liveClock = between('// ── Live clock:', '// ── Menu-level keyboard shortcuts');

    expect(liveClock).toMatch(/!startTime|startTime\s*===\s*null/);
    expect(liveClock).toMatch(/setInterval\([\s\S]*?,\s*1000\)/);
    expect(liveClock).not.toMatch(/setInterval\([\s\S]*?,\s*100\)/);
    expect(liveClock).toMatch(/\[state\.view,\s*drillComplete,\s*paused,\s*startTime\]/);
  });

  it('keeps the deployed desktop mirror byte-identical', () => {
    expect(fs.readFileSync(mirrorPath)).toEqual(fs.readFileSync(sourcePath));
  }, 15_000);
});
