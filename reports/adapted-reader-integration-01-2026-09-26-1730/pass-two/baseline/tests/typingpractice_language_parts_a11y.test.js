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

function evaluateLanguageHelpers() {
  const normalize = Function('return (' + extractFunction('typingPracticeNormalizeLanguageTag') + ')')();
  const uiLanguage = Function(
    'typingPracticeNormalizeLanguageTag',
    'return (' + extractFunction('typingPracticeUiLanguage') + ')'
  )(normalize);
  return { normalize, uiLanguage };
}

describe('Typing Practice language-of-parts accessibility', () => {
  it('normalizes supported language names and safe BCP 47-like tags', () => {
    const { normalize } = evaluateLanguageHelpers();
    expect(normalize('Spanish')).toBe('es');
    expect(normalize('Spanish (Latin America)')).toBe('es-419');
    expect(normalize('Chinese (Traditional)')).toBe('zh-Hant');
    expect(normalize('pt_BR')).toBe('pt-BR');
    expect(normalize('zh-Hans')).toBe('zh-Hans');
    expect(normalize('not a language', 'fr')).toBe('fr');
    expect(normalize('', 'also invalid')).toBe('en');
  });

  it('uses the document language for interface chrome and context as a fallback', () => {
    const { uiLanguage } = evaluateLanguageHelpers();
    expect(uiLanguage({ language: 'Spanish' }, { documentElement: { lang: 'fr-CA' } })).toBe('fr-CA');
    expect(uiLanguage({ currentUiLanguage: 'Portuguese' }, { documentElement: { lang: '' } })).toBe('pt');
    expect(uiLanguage({}, { documentElement: { lang: '' } })).toBe('en');
  });

  it('does not let a saved passage language leak onto the application interface', () => {
    expect(source).toContain('var rootLang = uiLanguage;');
    expect(source).toContain('lang: rootLang');
    expect(source).not.toContain("var rootLang = (state.aiPassage && state.aiPassage.language) || 'en'");
    expect(source).toContain("activeDrill && activeDrill.id === 'passage'");
    expect(source).toContain("typingPracticeNormalizeLanguageTag(state.aiPassage && state.aiPassage.language, 'en')");
  });

  it('marks passage previews, library text, transcript text, and the typing target', () => {
    expect(source).toContain("lang: typingPracticeNormalizeLanguageTag(cached.language, 'en')");
    expect(source).toContain("lang: passageLanguage");
    expect(source).toContain("langLabel ? h('span', { lang: passageLanguage, dir: 'auto' }, langLabel) : null");
    expect(source).toContain("lang: typingPracticeNormalizeLanguageTag(midPassage.language, 'en')");
    expect(source).toContain("h('span', { lang: activeTargetLanguage, dir: 'auto' }, targetStr)");
    expect(source).toContain('lang: activeTargetLanguage');
    expect(source).toContain("dir: 'auto'");
  });

  it('keeps the English capture name in the UI language while supporting foreign input', () => {
    expect(source).toContain("id: 'tp-typing-capture-label'");
    expect(source).toContain('lang: uiLanguage');
    expect(source).toContain("'aria-labelledby': 'tp-typing-capture-label'");
    expect(source).toContain("language: activeTargetLanguage");
    expect(source).toContain("id: 'tp-passage-topic'");
    expect(source).toContain("id: 'tp-custom-text'");
    expect(source).toContain("h('div', { dir: 'auto', style: { fontSize: '12px', fontWeight: 700");
  });
});
