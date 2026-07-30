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

describe('Typing Practice interruption and exit integrity', () => {
  it('records pace samples in active time rather than wall-clock time', () => {
    const activeOffset = Function(
      'return (' + extractFunction('typingPracticeActiveOffset') + ')'
    )();

    expect(activeOffset(10_000, 1_000, 4_000, null)).toBe(5_000);
    expect(activeOffset(10_000, 0, 2_000, 8_000)).toBe(6_000);
    expect(activeOffset(2_000, 5_000, 0, null)).toBe(0);
    expect(activeOffset(10_000, null, 0, null)).toBe(0);
    expect(activeOffset('invalid', 0, 0, null)).toBe(0);
    expect(source).toContain(
      'typingPracticeActiveOffset(eventTime, startTime, pausedMs, pauseStartedAt)'
    );
  });

  it('routes keyboard and visible active-drill exits through one confirmation', () => {
    expect(source).toContain('var requestDrillExit = function()');
    expect(source).toContain("renderBackButton(requestDrillExit, palette)");
    expect(source).toContain("if (key === 'Escape')");
    expect(source).toContain('requestDrillExit();');
    expect(source).toContain("'Exit this drill? Your current typing will not be saved.'");
    expect(source).toContain("confirmText: 'Exit without saving'");
    expect(source).toContain("cancelText: 'Keep practicing'");
    expect(source).toContain('exitConfirmationPendingRef.current');
  });

  it('does not charge confirmation time when the student keeps practicing', () => {
    expect(source).toContain('var pausedForConfirmationAt = null');
    expect(source).toContain('var confirmationPauseMs = Math.max');
    expect(source).toContain(
      'setPausedMs(function(total) { return total + confirmationPauseMs; })'
    );
    expect(source).toContain(
      "'Exit canceled. Typing resumed; confirmation time was excluded from WPM.'"
    );
    expect(source).toContain("'Exit canceled. The drill remains paused.'");
  });

  it('deduplicates background auto-pause and preserves reading accommodation time', () => {
    expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain("document.removeEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain('if (paused || interruptionPauseRef.current) return');
    expect(source).toContain("if (document.hidden) pauseForInterruption('this page moved to the background')");
    expect(source).toContain("if (typeof document !== 'undefined' && document.hidden) return");
    expect(source).toContain("if (state.view !== 'drill' || drillComplete || paused) return");
  });

  it('explains the safe Escape behavior consistently', () => {
    expect(source).toContain('Press Escape to open an exit confirmation.');
    expect(source).toContain("Esc opens exit confirmation.");
    expect(source).toContain('Review exit without saving current drill progress');
  });

  it('keeps the desktop mirror identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });
});
