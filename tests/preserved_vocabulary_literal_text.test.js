import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let vocabulary, pipeline, helpers;
beforeAll(() => {
  for (const file of ['pure_helpers_module.js', 'text_pipeline_helpers_module.js', 'generation_helpers_module.js']) loadAlloModule(file);
  helpers = window.AlloModules.GenerationHelpers; vocabulary = helpers.preservedVocabulary; pipeline = window.AlloModules.TextPipelineHelpers;
});
const split = text => pipeline.splitReferencesFromBody(text);
const tick = String.fromCharCode(96);
const validate = (source, candidate, terms) => vocabulary.validate(source, candidate, terms, split);
function deps(candidate) {
  return { generatedContent: { id: 'literal-1', type: 'simplified', data: 'Herons are wading birds.', config: { language: 'English' }, instructionalText: { form: 'adapted' } }, complexityLevel: 3, gradeLevel: 'Grade 4', leveledTextLanguage: 'English', translationMode: 'off', currentUiLanguage: 'English', resolveTranslationPolicy: pipeline.resolveTranslationPolicy,
    adaptationPlan: { preview: true, options: { keepTerms: ['wading birds'] } }, setIsProcessing: vi.fn(), setComplexityLevel: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), setWordSoundsCustomTerms: vi.fn(), setWsPreloadedWords: vi.fn(), setError: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(), callGemini: vi.fn(), cleanJson: x => x, t: k => k, getDefaultTitle: () => 'Reading', extractSourceTextForProcessing: pipeline.extractSourceTextForProcessing, generateBilingualText: vi.fn(async () => candidate) };
}
const literal = 'Herons are ' + tick + 'wading<!--example--> birds' + tick + '.';
describe('visible literal text is vocabulary evidence', () => {
  it('does not remove a displayed comment-like sequence to invent a phrase', () => {
    expect(pipeline.readingText.plain(literal)).toContain('wading<!--example--> birds');
    expect(validate('wading birds', literal, ['wading birds'])).toMatchObject({ valid: false, missingTerms: [{ term: 'wading birds', pane: 'primary' }] });
  });
  it.each([1, 2])('preserves literal comment syntax in a %i-backtick code span', width => {
    const code = tick.repeat(width) + 'wading<!--example--> birds' + tick.repeat(width);
    expect(validate(code, code, ['wading<!--example--> birds']).valid).toBe(true);
  });
  it('allows a displayed unclosed comment marker inside a closed code span', () => {
    const text = 'Keep ' + tick + '<!--literal' + tick + ' here.';
    expect(validate(text, text, ['<!--literal']).valid).toBe(true);
  });
  it('ignores comment syntax inside fenced payloads without hiding surrounding reading', () => {
    const text = 'wading birds\n\n~~~html\n<!-- a literal opening marker\n~~~\n\nMore reading.';
    expect(validate(text, text, ['wading birds']).valid).toBe(true);
  });
  it('does not treat fence examples inside a hidden comment as a real code fence', () => {
    const text = 'wading birds\n<!--\n' + tick.repeat(3) + '\nexample\n-->\nMore reading.';
    expect(validate(text, text, ['wading birds']).valid).toBe(true);
  });
  it('does not let a shorter fence expose payload terms', () => {
    const candidate = 'Other reading.\n' + tick.repeat(4) + 'text\n' + tick.repeat(3) + '\nwading birds\n' + tick.repeat(3) + '\n' + tick.repeat(4);
    expect(validate('wading birds', candidate, ['wading birds']).valid).toBe(false);
  });
  it('rejects source-only literal mismatches before generation', async () => {
    const d = deps('wading birds'); d.generatedContent.data = literal;
    expect(await helpers.handleComplexityAdjustment(d)).toMatchObject({ status: 'rejected', reason: 'terms-absent-from-source', sourceRetained: true });
    expect(d.generateBilingualText).not.toHaveBeenCalled();
  });
  it('rejects the literal mismatch at both Preview and Apply without a write', async () => {
    const d = deps(literal);
    expect(await helpers.handleComplexityAdjustment(d)).toMatchObject({ status: 'rejected', sourceRetained: true, reason: 'essential-terms-missing' });
    d.generateBilingualText.mockResolvedValueOnce('Herons are wading birds.');
    const preview = await helpers.handleComplexityAdjustment(d); expect(preview.status).toBe('preview');
    preview.data = literal; const commit = vi.fn(async () => true); d.adaptationPlan = { apply: preview, commit };
    expect(await helpers.handleComplexityAdjustment(d)).toMatchObject({ status: 'rejected', sourceRetained: true, reason: 'essential-terms-missing' });
    expect(commit).not.toHaveBeenCalled(); expect(d.setGeneratedContent).not.toHaveBeenCalled(); expect(d.setHistory).not.toHaveBeenCalled();
    expect(d.addToast.mock.calls.some(([, tone]) => tone === 'success')).toBe(false);
  });
});
describe('feedback preserves the literal requested term', () => {
  const template = 'Current text kept. Missing: {terms}.';
  const translate = vi.fn((key, params = {}) => {
    if (key === 'simplified.adapt_terms_primary') return 'primary reading';
    if (key === 'simplified.adapt_terms_missing') return template.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(params, name) ? params[name] : match);
    return key;
  });
  it.each(['{terms}', '{constructor}', '{__proto__}', '$& and $$', '“quotes”, a;b', 'طيور الماء'])('does not reinterpret %s inside interpolated feedback', term => {
    const result = vocabulary.feedback({ missingTerms: [{ term, pane: 'primary' }] }, translate);
    expect(result).toBe('Current text kept. Missing: “' + term + '” (primary reading).');
  });
  it('keeps fallback feedback literal when the translator is absent or fails', () => {
    const audit = { absentFromSource: ['{terms} $&'] };
    const expected = 'Current text kept. These terms were not found exactly in the source: “{terms} $&”. Check spelling and case, or remove them from the list.';
    expect(vocabulary.feedback(audit)).toBe(expected);
    expect(vocabulary.feedback(audit, () => { throw new Error('Unavailable'); })).toBe(expected);
  });
});

describe('comment and fence boundaries remain conservative', () => {
  it.each([tick.repeat(3), tick.repeat(4), '~~~', '~~~~'])('skips opaque payloads inside %s and keeps surrounding reading', fence => {
    const text = 'wading birds\r\n' + fence + 'html\r\n<!-- literal\r\n' + fence + fence[0] + '\r\nAnother sentence.';
    expect(validate(text, text, ['wading birds']).valid).toBe(true);
    expect(vocabulary.checkPanes(fence + '\n<!-- literal\n' + fence, false, split)).toMatchObject({ valid: false, reason: 'empty-required-pane' });
  });
  it.each(['wading\n~~~\nexample\n~~~\nbirds', 'wading\n~~~~\n~~~\nbirds\n~~~\n~~~~', 'Other.\n~~~~\n~~~\nwading birds\n~~~\n~~~~'])('does not bridge or expose excluded payload text: %s', text => {
    expect(validate('wading birds', text, ['wading birds']).valid).toBe(false);
  });
  it.each(['<!-- unclosed', '~~~\nunclosed', '~~~\nunclosed\n~~~ trailing', tick + 'unclosed'])('retains source for unclosed syntax: %s', syntax => {
    expect(validate('wading birds', 'wading birds\n' + syntax, ['wading birds'])).toMatchObject({ valid: false, status: 'unverified' });
  });
  it('removes actual comments without reinterpreting their backticks or fences', () => {
    const text = 'wading<!--' + tick + '\n~~~~\n--> birds';
    expect(validate('wading birds', text, ['wading birds']).valid).toBe(true);
  });
  it('handles an escaped backtick before an actual hidden comment', () => {
    const text = 'A \\' + tick + ' sign. <!--' + tick + '--> wading birds.';
    expect(validate('wading birds', text, ['wading birds']).valid).toBe(true);
  });
  it('checks literal mismatches independently in the translation pane', () => {
    const d = '\n\n--- ENGLISH TRANSLATION ---\n\n';
    expect(validate('Herons.' + d + 'wading birds', 'Herons.' + d + literal, ['wading birds'])).toMatchObject({ valid: false, missingTerms: [{ term: 'wading birds', pane: 'translation' }] });
  });
});
