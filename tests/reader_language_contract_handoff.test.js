// Integrated bilingual contract regressions: passing assertions are required.
import { beforeAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { setupReader, mountReader, disposeReader, fixtures, contentFor, helpers } from './helpers/reader_locale_harness.js';
beforeAll(setupReader);
beforeEach(() => localStorage.clear());
afterEach(() => { disposeReader(); vi.restoreAllMocks(); });
const regression = it;
const marker = '\n\n--- ENGLISH TRANSLATION ---\n\n';
const spanish = fixtures.find(f => f.locale === 'spanish_latin_america');
describe('integrated bilingual language contract', () => {
  regression.each(['paragraph', 'table'])('a saved Arabic target keeps Arabic DOM metadata for a %s', type => {
    const source = type === 'table' ? '| Agua |\n| --- |\n| Importante |' : 'El agua es importante.';
    const target = type === 'table' ? '| الماء |\n| --- |\n| مهم |' : 'الماء مهم.';
    const content = contentFor(spanish, { data: source + marker + target, translationTarget: 'Arabic', config: { language: 'Spanish', translationTarget: 'Arabic' } });
    const { host } = mountReader(spanish, { generatedContent: content, history: [content], isSideBySide: true, leveledTextLanguage: 'French' });
    const paragraphs = [...host.querySelectorAll(type === 'table' ? '[data-reading-table]' : '[data-reading-paragraph]')];
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1].textContent).toContain('الماء');
    expect({ lang: paragraphs[1].lang, dir: paragraphs[1].dir }).toEqual({ lang: 'ar', dir: 'rtl' });
  });
  regression('reader_bilingual_target_v1: adapting a saved Arabic translation must retain Arabic', async () => {
    const text = 'El agua es importante.' + marker + 'الماء مهم.';
    const item = contentFor(spanish, { data: text, translationTarget: 'Arabic', config: { language: 'Spanish', translationTarget: 'Arabic', grade: '5' } });
    const noop = vi.fn();
    const generateBilingualText = vi.fn(async () => text);
    const pipeline = window.AlloModules.TextPipelineHelpers;
    const result = await helpers.handleComplexityAdjustment({
      generatedContent: item, complexityLevel: 5, gradeLevel: '5', leveledTextLanguage: 'French', currentUiLanguage: 'English', translationMode: 'off',
      adaptationPlan: { preview: true, options: { shorterSentences: true } }, saveOriginalOnAdjust: false,
      resolveTranslationPolicy: pipeline.resolveTranslationPolicy, extractSourceTextForProcessing: pipeline.extractSourceTextForProcessing,
      generateBilingualText, setIsProcessing: noop, setComplexityLevel: noop, setGeneratedContent: noop, setHistory: noop,
      setWordSoundsCustomTerms: noop, setWsPreloadedWords: noop, setError: noop, addToast: noop, t: key => key, warnLog: noop,
      cleanJson: value => value, callGemini: noop, getDefaultTitle: () => 'Reading'
    });
    expect(result?.status).toBe('preview');
    expect(generateBilingualText).toHaveBeenCalledOnce();
    expect(generateBilingualText.mock.calls[0][3].target).toBe('Arabic');
  });
  regression('English output with an explicit Arabic translation must generate both blocks', async () => {
    const call = vi.fn(async prompt => prompt.includes('|||BEGIN') ? 'الماء مهم.' : 'Water matters.');
    const result = await window.AlloModules.TextPipelineHelpers.generateBilingualText('Explain water.', 'English', call, { enabled: true, target: 'Arabic', mode: 'Arabic' });
    expect(result).toContain('Water matters.');
    expect(call).toHaveBeenCalledTimes(2);
    expect(result).toContain('الماء مهم.');
  });
});
