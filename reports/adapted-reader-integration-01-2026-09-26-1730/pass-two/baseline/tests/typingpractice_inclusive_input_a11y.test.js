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

describe('Typing Practice inclusive and multilingual input', () => {
  it('normalizes combining marks and segments user-perceived characters', () => {
    expect(normalize('cafe\u0301')).toBe('café');
    expect(graphemes('cafe\u0301')).toEqual(['c', 'a', 'f', 'é']);
    expect(graphemes('👩‍💻')).toEqual(['👩‍💻']);
  });

  it('accepts canonically equivalent accented input without false errors', () => {
    const result = applyTextInput('café', '', 'cafe\u0301', {});
    expect(result.typed).toBe('café');
    expect(result.typedLength).toBe(4);
    expect(result.targetLength).toBe(4);
    expect(result.errorCount).toBe(0);
    expect(result.advancedCount).toBe(4);
  });

  it('preserves error-tolerant semantics for batched assistive input', () => {
    const blocked = applyTextInput('éa', '', 'xa', { errorTolerant: false });
    expect(blocked.typed).toBe('');
    expect(blocked.errorCount).toBe(2);

    const advanced = applyTextInput('éa', '', 'xa', { errorTolerant: true });
    expect(advanced.typed).toBe('éa');
    expect(advanced.errorCount).toBe(1);
    expect(advanced.advancedCount).toBe(2);
  });

  it('returns completed-word metadata for shared visual and speech feedback', () => {
    const result = applyTextInput('hola mundo', '', 'hola ', {});
    expect(result.lastCompletedWord).toBe('hola');
    expect(result.lastCompletedRange).toEqual({ start: 0, end: 3 });
  });

  it('uses a real textarea for touch, switch, paste, and IME input', () => {
    expect(source).toContain("h('textarea', {");
    expect(source).toContain("id: 'tp-typing-capture'");
    expect(source).toContain("inputMode: 'text'");
    expect(source).toContain('onInput: onAssistiveInput');
    expect(source).toContain('onCompositionStart: onCompositionStart');
    expect(source).toContain('onCompositionEnd: onCompositionEnd');
    expect(source).toContain('onBeforeInput: onTypingBeforeInput');
    expect(source).toContain("id: 'tp-input-method-help'");
  });

  it('keeps the visual character stream hidden behind equivalent text and cues', () => {
    expect(source).toContain("className: 'tp-capture-shell'");
    expect(source).toContain("h('div', { 'aria-hidden': 'true', style: { pointerEvents: 'none' } }, chars)");
    expect(source).toContain("'aria-details': 'tp-target-transcript'");
    expect(source).toContain("'aria-describedby': 'tp-capture-help tp-input-method-help tp-capture-progress-text tp-current-key-cue'");
  });

  it('adds finger ownership to nonvisual next-key guidance when available', () => {
    const cue = extractFunction('typingPracticeTargetCue');
    expect(cue).toContain('typingPracticeGraphemes(target)');
    expect(cue).toContain("cue += ' Use your ' + fingerLabel(meta.f) + '.'");
  });

  it('generates non-English passages using their correct writing systems', () => {
    expect(source).toContain("label: 'Espa\\u00f1ol'");
    expect(source).toContain("label: 'Fran\\u00e7ais'");
    expect(source).toContain("label: 'Portugu\\u00eas'");
    expect(source).toContain("label: '\\u7b80\\u4f53\\u4e2d\\u6587'");
    expect(source).toContain('including its accents or writing system');
    expect(source).not.toContain('Non-English passages use ASCII only');
    expect(source).not.toContain('NO accented letters');
  });
});
