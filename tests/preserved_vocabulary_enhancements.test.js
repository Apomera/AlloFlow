import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { readFileSync } from 'node:fs';

let helpers, vocabulary, pipeline, hostBilingual;
beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  helpers = window.AlloModules.GenerationHelpers;
  vocabulary = helpers.preservedVocabulary;
  pipeline = window.AlloModules.TextPipelineHelpers;
  const source = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = source.indexOf('const generateBilingualText = async');
  const end = source.indexOf('const extractSourceTextForProcessing', start);
  if (start < 0 || end < 0) throw new Error('Host bilingual wrapper was not found');
  hostBilingual = new Function('window', source.slice(start, end) + '\nreturn generateBilingualText;')(window);
});
const validate = (source, candidate, terms) => vocabulary.validate(source, candidate, terms, pipeline.splitReferencesFromBody);

describe('preserved terms respect complete Unicode characters', () => {
  it.each([
    ['👩', '👩‍🏫'], ['👩', '👩🏽'], ['❤', '❤️'], ['🇺', '🇺🇸'], ['1', '1️⃣']
  ])('does not preserve %s using the partial grapheme in %s', (term, replacement) => {
    expect(validate('Keep ' + term + ' here.', 'Keep ' + replacement + ' here.', [term])).toMatchObject({
      valid: false, missingTerms: [{ term, pane: 'primary' }]
    });
    expect(vocabulary.prepare('Keep ' + replacement + ' here.', [term], pipeline.splitReferencesFromBody)).toMatchObject({
      valid: false, absentFromSource: [term]
    });
  });
  it.each(['👩‍🏫', '👩🏽', '❤️', '🇺🇸', '1️⃣', 'क्ष', '水鸟', 'طيور الماء', 'C++'])('preserves the complete term %s', term => {
    expect(validate('Keep ' + term + ' here.', 'Here is ' + term + '.', [term]).valid).toBe(true);
  });
  it('keeps canonical accent equivalence and exact word boundaries', () => {
    expect(validate('Café', 'Cafe\u0301', ['Café']).valid).toBe(true);
    expect(validate('fish', 'selfish', ['fish']).valid).toBe(false);
    expect(validate('bird’s nest', "bird's nest", ['bird’s nest']).valid).toBe(false);
  });
});

describe('bounded vocabulary segmentation', () => {
  it('does not re-segment every passage for each requested term', () => {
    const NativeSegmenter = Intl.Segmenter;
    const terms = Array.from({ length: 30 }, (_, i) => 'term' + i);
    const source = Array.from({ length: 12 }, () => terms.join(' ') + '.').join('\n\n');
    const measure = requested => {
      let calls = 0;
      try {
        Intl.Segmenter = class {
          constructor(...args) { this.segmenter = new NativeSegmenter(...args); }
          segment(text) { calls++; return this.segmenter.segment(text); }
        };
        expect(validate(source, source, requested).valid).toBe(true);
      } finally { Intl.Segmenter = NativeSegmenter; }
      return calls;
    };
    const oneTerm = measure(terms.slice(0, 1)), thirtyTerms = measure(terms);
    expect(thirtyTerms).toBe(oneTerm);
    expect(thirtyTerms).toBeLessThanOrEqual(12 * 2 * 2); // each region, each side, word + grapheme
  });
  it('retains source occurrence counts and independent bilingual requirements', () => {
    const source = 'fish fish selfish' + '\n\n--- ENGLISH TRANSLATION ---\n\n' + 'fish';
    const audit = validate(source, 'fish' + '\n\n--- ENGLISH TRANSLATION ---\n\n' + 'selfish', ['fish']);
    expect(audit.required).toEqual([{ term: 'fish', panes: [{ pane: 'primary', count: 2 }, { pane: 'translation', count: 1 }] }]);
    expect(audit.missingTerms).toEqual([{ term: 'fish', pane: 'translation' }]);
  });
});

describe('cancellation between bilingual generation stages', () => {
  const policy = { enabled: true, target: 'English', mode: 'auto' };
  it.each(['English', 'Spanish', ''])('does not start a provider call for an obsolete %s request', async language => {
    const provider = vi.fn();
    await expect(pipeline.generateBilingualText('Rewrite.', language, provider, policy, { isCurrent: () => false })).rejects.toMatchObject({ code: 'adaptation-request-stale' });
    expect(provider).not.toHaveBeenCalled();
  });
  it('does not start translation after the primary generation becomes obsolete', async () => {
    let current = true, finish;
    const provider = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce('The birds eat.');
    const result = pipeline.generateBilingualText('Rewrite.', 'Spanish', provider, policy, { isCurrent: () => current, translationKeepTerms: ['wading birds'] });
    current = false; finish('Las aves comen.');
    await expect(result).rejects.toMatchObject({ code: 'adaptation-request-stale' });
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it('discards an obsolete translation already in flight', async () => {
    let current = true, finish;
    const provider = vi.fn().mockResolvedValueOnce('Las aves comen.').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const result = pipeline.generateBilingualText('Rewrite.', 'Spanish', provider, policy, { isCurrent: () => current });
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(2));
    current = false; finish('The birds eat.');
    await expect(result).rejects.toMatchObject({ code: 'adaptation-request-stale' });
  });
  it('classifies a late provider failure as cancellation but retains current failures', async () => {
    let current = true, fail;
    const error = new Error('Provider failure');
    const result = pipeline.generateBilingualText('Rewrite.', 'Spanish', () => new Promise((_, reject) => { fail = reject; }), policy, { isCurrent: () => current });
    current = false; fail(error);
    await expect(result).rejects.toMatchObject({ code: 'adaptation-request-stale' });
    await expect(pipeline.generateBilingualText('Rewrite.', 'Spanish', async () => { throw error; }, policy, { isCurrent: () => true })).rejects.toBe(error);
  });
  it('keeps translation instructions and legacy callers working', async () => {
    const provider = vi.fn().mockResolvedValueOnce('Las aves comen.').mockResolvedValueOnce('The wading birds eat.');
    expect(await pipeline.generateBilingualText('Rewrite.', 'Spanish', provider, policy, { translationKeepTerms: ['wading birds'] })).toContain('--- ENGLISH TRANSLATION ---');
    expect(provider.mock.calls[1][0]).toContain('["wading birds"]');
    expect(await pipeline.generateBilingualText('Rewrite.', 'English', async () => 'Birds eat.', policy, null)).toBe('Birds eat.');
  });
  it('keeps terms and request ownership through the real four-argument host wrapper', async () => {
    const provider = vi.fn().mockResolvedValueOnce('Las aves comen.').mockResolvedValueOnce('The wading birds eat.');
    const controls = { isCurrent: () => true, translationKeepTerms: ['wading birds'] };
    expect(await hostBilingual('Rewrite.', 'Spanish', provider, { ...policy, adaptation: controls })).toContain('The wading birds eat.');
    expect(provider.mock.calls[1][0]).toContain('["wading birds"]');
    provider.mockClear(); controls.isCurrent = () => false;
    await expect(hostBilingual('Rewrite.', 'Spanish', provider, { ...policy, adaptation: controls })).rejects.toMatchObject({ code: 'adaptation-request-stale' });
    expect(provider).not.toHaveBeenCalled();
  });
  it('threads request ownership from the helper and retains source/history when cancelled', async () => {
    let current = true, finish;
    const text = 'Las aves zancudas comen.' + '\n\n--- ENGLISH TRANSLATION ---\n\n' + 'Herons are wading birds.';
    const generatedContent = { id: 'cancel-1', type: 'simplified', data: text, config: { language: 'Spanish' }, instructionalText: { form: 'adapted' } };
    const provider = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce('The birds eat.');
    const d = {
      generatedContent, complexityLevel: 5, gradeLevel: 'Grade 4', leveledTextLanguage: 'Spanish', saveOriginalOnAdjust: false,
      adaptationPlan: { preview: true, isCurrent: () => current, options: { keepTerms: ['wading birds'] } },
      setIsProcessing: vi.fn(), setComplexityLevel: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(),
      setWordSoundsCustomTerms: vi.fn(), setWsPreloadedWords: vi.fn(), setError: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(),
      callGemini: provider, cleanJson: value => value, t: key => key, getDefaultTitle: () => 'Reading',
      extractSourceTextForProcessing: pipeline.extractSourceTextForProcessing, generateBilingualText: hostBilingual
    };
    const result = helpers.handleComplexityAdjustment(d);
    current = false; finish('Las aves comen.');
    expect(await result).toEqual({ status: 'stale' });
    expect(provider).toHaveBeenCalledTimes(1);
    expect(d.setGeneratedContent).not.toHaveBeenCalled(); expect(d.setHistory).not.toHaveBeenCalled();
    expect(d.addToast).not.toHaveBeenCalled(); expect(d.setError).not.toHaveBeenCalled();
    expect(d.setIsProcessing).toHaveBeenLastCalledWith(false);
  });
});
