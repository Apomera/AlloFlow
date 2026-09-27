import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let helpers, vocabulary, split;
const SOURCE = 'Herons are wading birds. They eat fish.';
const DELIMITER = '\n\n--- ENGLISH TRANSLATION ---\n\n';
beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('generation_helpers_module.js');
  helpers = window.AlloModules.GenerationHelpers;
  vocabulary = helpers.preservedVocabulary;
  split = window.AlloModules.TextPipelineHelpers.splitReferencesFromBody;
});
function deps(candidate = 'Herons are wading birds. They catch fish.', extra = {}) {
  return {
    generatedContent: { id: 'terms-1', type: 'simplified', data: SOURCE, config: { language: 'English' }, instructionalText: { form: 'adapted' } },
    complexityLevel: 5, gradeLevel: 'Grade 4', leveledTextLanguage: 'English', saveOriginalOnAdjust: false,
    adaptationPlan: { preview: true, options: { shorterSentences: false, explainVocabulary: false, keepTerms: ['wading birds'] } },
    setIsProcessing: vi.fn(), setComplexityLevel: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(),
    setWordSoundsCustomTerms: vi.fn(), setWsPreloadedWords: vi.fn(), setError: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(),
    callGemini: vi.fn(), cleanJson: value => value, t: key => key, getDefaultTitle: () => 'Reading',
    extractSourceTextForProcessing: window.AlloModules.TextPipelineHelpers.extractSourceTextForProcessing,
    generateBilingualText: vi.fn(async () => candidate), ...extra
  };
}
const valid = (source, candidate, terms) => vocabulary.validate(source, candidate, terms, split);
const unchanged = d => {
  expect(d.setGeneratedContent).not.toHaveBeenCalled();
  expect(d.setHistory).not.toHaveBeenCalled();
  expect(d.setWordSoundsCustomTerms).not.toHaveBeenCalled();
  expect(d.setWsPreloadedWords).not.toHaveBeenCalled();
  expect(d.addToast.mock.calls.some(([, tone]) => tone === 'success')).toBe(false);
};

describe('preserved vocabulary contract', () => {
  it.each([
    'These are wading **birds**.', 'These are **wading** birds.',
    'These are wading [birds](https://example.org/a_(b)).',
    'These are wading <em>birds</em>.', 'These are wading&nbsp;birds.',
    'These are wading\nbirds.', 'These are wading\t birds.', 'These are “wading birds,” yes.'
  ])('accepts visible exact phrases across inline formatting: %s', candidate => {
    expect(valid(SOURCE, candidate, ['wading birds']).valid).toBe(true);
  });
  it.each([
    'Herons are birds that wade.', 'Herons are Wading birds.', 'Herons are wading-birds.',
    'wading\n\nbirds', '- wading\n- birds', '| wading | birds |',
    '<p>wading</p><p>birds</p>', '[other](https://example.org/wading birds)',
    'Other text.\n\n## References\n\nwading birds', '<span hidden>wading birds</span>',
    '<span aria-hidden="true">wading birds</span>', '<span style="display:none">wading birds</span>',
    '<!-- wading birds -->', '<script>wading birds</script>', '![wading birds](picture.png)',
    '```chart\nwading birds\n```', '~~wading birds~~', 'wading `<b>` birds', '`wading **birds**`', '``wading **birds**``'
  ])('rejects missing, changed, or non-body-only matches: %s', candidate => {
    expect(valid(SOURCE, candidate, ['wading birds'])).toMatchObject({ valid: false, missingTerms: [{ term: 'wading birds', pane: 'primary' }] });
  });
  it('uses NFC, exact case/accents/punctuation, and Unicode word boundaries', () => {
    expect(valid('Café', 'Cafe\u0301', ['Café']).valid).toBe(true);
    expect(valid('Café', 'Cafe', ['Café']).valid).toBe(false);
    expect(valid('Café', 'Сafé', ['Café']).valid).toBe(false); // Cyrillic C
    expect(valid('fish', 'selfish', ['fish']).valid).toBe(false);
    expect(valid('fish', 'https://fish.example', ['fish']).valid).toBe(false);
    expect(valid('C++', 'C++ is a language.', ['C++']).valid).toBe(true);
    expect(valid('bird’s nest', "bird's nest", ['bird’s nest']).valid).toBe(false);
    expect(valid('水鸟在水里。', '水鸟吃鱼。', ['水鸟']).valid).toBe(true);
    expect(valid('طيور الماء', 'هذه طيور الماء.', ['طيور الماء']).valid).toBe(true);
  });
  it('deduplicates normalized entries without folding case or dropping requests', () => {
    const result = vocabulary.normalize([' wading birds ', 'wading\u00a0birds', 'Wading birds', '']);
    expect(result.terms).toEqual(['wading birds', 'Wading birds']);
    expect(result.requestedTerms).toHaveLength(4);
    expect(result.duplicates).toEqual([{ term: 'wading birds', index: 1 }]);
  });
  it('rejects absent terms rather than inserting or silently excluding them', () => {
    expect(vocabulary.prepare(SOURCE, ['Wading birds', 'pelican'], split)).toMatchObject({ valid: false, absentFromSource: ['Wading birds', 'pelican'] });
  });
  it('enforces explicit limits without silently truncating the list or term text', () => {
    const thirty = Array.from({ length: 30 }, (_, i) => 'term' + i);
    expect(vocabulary.normalize(thirty).valid).toBe(true);
    expect(vocabulary.normalize([...thirty, thirty[0]]).valid).toBe(true);
    const over = vocabulary.normalize([...thirty, 'term30']);
    expect(over.valid).toBe(false); expect(over.terms).toHaveLength(31);
    expect(over.errors).toContainEqual({ code: 'too-many-terms', count: 31, limit: 30 });
    expect(vocabulary.normalize(['a'.repeat(256)]).valid).toBe(true);
    expect(vocabulary.normalize(['a'.repeat(257)]).valid).toBe(false);
    expect(vocabulary.normalize(Array.from({ length: 17 }, (_, i) => String(i).padStart(2, '0') + 'a'.repeat(254))).valid).toBe(false);
    expect(vocabulary.normalize('fish').valid).toBe(false);
    expect(vocabulary.normalize([null, 123, {}]).valid).toBe(false);
  });
  it('parses quoted punctuation and rejects incomplete entries', () => {
    expect(vocabulary.parseInput('"Washington, D.C."; "a;b"\nfish')).toEqual({ valid: true, terms: ['Washington, D.C.', 'a;b', 'fish'] });
    expect(vocabulary.parseInput('"say ""hello""", fish').terms).toEqual(['say "hello"', 'fish']);
    expect(vocabulary.parseInput('"fish').valid).toBe(false);
    expect(vocabulary.parseInput('"fish" birds').valid).toBe(false);
  });
  it('requires each term in every source pane where it occurs', () => {
    const source = 'Las aves zancudas comen peces.' + DELIMITER + SOURCE;
    expect(valid(source, 'Las aves zancudas comen.' + DELIMITER + SOURCE, ['aves zancudas', 'wading birds']).valid).toBe(true);
    const swapped = SOURCE + DELIMITER + 'Las aves zancudas comen peces.';
    expect(valid(source, swapped, ['aves zancudas', 'wading birds']).missingTerms).toEqual([
      { term: 'aves zancudas', pane: 'primary' }, { term: 'wading birds', pane: 'translation' }
    ]);
    expect(valid('DNA' + DELIMITER + 'DNA', 'DNA' + DELIMITER + 'Other', ['DNA']).valid).toBe(false);
    expect(valid(SOURCE, SOURCE + DELIMITER + 'Las aves comen.', ['wading birds']).valid).toBe(true);
    expect(valid(source, 'Las aves zancudas comen.', ['wading birds']).valid).toBe(false);
  });
  it('reports that an empty request has no vocabulary guarantee', () => {
    expect(valid(SOURCE, 'Other text.', [])).toMatchObject({ valid: true, status: 'not-requested', terms: [] });
  });
  it('fails closed when projection or segmentation is unavailable', () => {
    expect(valid(SOURCE, '<unknown>wading birds</unknown>', ['wading birds']).status).toBe('unverified');
    for (const candidate of ['<span hidden>\n\nwading birds\n\n</span>', '<script>\n## wading birds\n</script>', '<pre>wading **birds**</pre>', '<code>wading **birds**</code>']) {
      expect(valid(SOURCE, candidate, ['wading birds']).status).toBe('unverified');
    }
    expect(valid(SOURCE, 'Herons are wading <em>birds. They eat fish.</em>', ['wading birds']).status).toBe('unverified');
    expect(vocabulary.validate(SOURCE, SOURCE, ['wading birds'], undefined).status).toBe('unverified');
    const original = Intl.Segmenter;
    try { Intl.Segmenter = undefined; expect(valid(SOURCE, SOURCE, ['wading birds']).status).toBe('unverified'); }
    finally { Intl.Segmenter = original; }
  });
});

describe('candidate and Apply share the vocabulary contract', () => {
  it.each([false, true])('retains source on a violating candidate (saveOriginal=%s)', async saveOriginalOnAdjust => {
    const d = deps('Herons are birds that wade.', { saveOriginalOnAdjust });
    const result = await helpers.handleComplexityAdjustment(d);
    expect(result).toMatchObject({ status: 'rejected', sourceRetained: true, reason: 'essential-terms-missing', vocabulary: { missingTerms: [{ term: 'wading birds', pane: 'primary' }] } });
    expect(result.message).toContain('wading birds'); unchanged(d);
    expect(d.setComplexityLevel).not.toHaveBeenCalled();
  });
  it('does not call the model for absent or over-limit terms', async () => {
    for (const keepTerms of [['absent'], Array.from({ length: 31 }, (_, i) => 'term' + i)]) {
      const d = deps(SOURCE, { adaptationPlan: { preview: true, options: { keepTerms } } });
      expect((await helpers.handleComplexityAdjustment(d)).status).toBe('rejected');
      expect(d.generateBilingualText).not.toHaveBeenCalled(); unchanged(d);
    }
  });
  it.each([false, true])('schedules compliant previews for legacy callers without regenerating (saveOriginal=%s)', async saveOriginalOnAdjust => {
    const d = deps(); const preview = await helpers.handleComplexityAdjustment(d);
    const apply = deps('', { saveOriginalOnAdjust, adaptationPlan: { apply: preview } });
    expect((await helpers.handleComplexityAdjustment(apply)).status).toBe('scheduled');
    expect(apply.generateBilingualText).not.toHaveBeenCalled();
    expect(apply.addToast.mock.calls.some(([, tone]) => tone === 'success')).toBe(false);
    const saved = apply.setGeneratedContent.mock.calls[0][0](apply.generatedContent);
    expect(saved.data).toBe(preview.data);
  });
  it('revalidates changed candidate data and ignores a weakened public audit', async () => {
    const preview = await helpers.handleComplexityAdjustment(deps());
    preview.data = 'Herons are birds that wade.';
    preview.vocabulary = { valid: true, requestedTerms: [], terms: [] };
    const d = deps('', { adaptationPlan: { apply: preview } });
    expect((await helpers.handleComplexityAdjustment(d)).reason).toBe('essential-terms-missing'); unchanged(d);
  });
  it('rejects reconstructed previews, changed options, changed policy and stale base text', async () => {
    const preview = await helpers.handleComplexityAdjustment(deps());
    const cases = [
      { adaptationPlan: { apply: { ...preview } } },
      { adaptationPlan: { apply: preview, options: { keepTerms: [] } } },
      { adaptationPlan: { apply: preview }, complexityLevel: 3 },
      { adaptationPlan: { apply: preview }, resolveTranslationPolicy: () => ({ enabled: true, target: 'Spanish', mode: 'custom' }) },
      { adaptationPlan: { apply: preview }, generatedContent: { ...deps().generatedContent, data: 'Changed source.' } }
    ];
    for (const extra of cases) {
      const d = deps('', extra); expect(['rejected', 'stale']).toContain((await helpers.handleComplexityAdjustment(d)).status); unchanged(d);
    }
  });
  it('checks direct apply requests and keeps original-form protection', async () => {
    const direct = deps('Herons are birds that wade.', { adaptationPlan: { options: { keepTerms: ['wading birds'] } } });
    expect((await helpers.handleComplexityAdjustment(direct)).status).toBe('rejected'); unchanged(direct);
    const original = deps('', { generatedContent: { ...deps().generatedContent, instructionalText: { form: 'original' } } });
    expect(await helpers.handleComplexityAdjustment(original)).toBeUndefined(); unchanged(original);
  });
  it('enforces translation-only terms without requesting them in the primary-language rewrite', async () => {
    const data = 'Las aves zancudas comen peces.' + DELIMITER + SOURCE;
    const generatedContent = { ...deps().generatedContent, data, config: { language: 'Spanish' } };
    const d = deps(data, { generatedContent });
    const preview = await helpers.handleComplexityAdjustment(d);
    expect(preview.status).toBe('preview');
    expect(preview.vocabulary.required).toEqual([{ term: 'wading birds', panes: [{ pane: 'translation', count: 1 }] }]);
    expect(d.generateBilingualText.mock.calls[0][0]).not.toContain('exactly as written; do not replace or simplify them: wading birds');
    preview.data = 'Las aves zancudas comen peces.' + DELIMITER + 'Herons are birds that wade.';
    const apply = deps('', { generatedContent, adaptationPlan: { apply: preview } });
    expect((await helpers.handleComplexityAdjustment(apply)).vocabulary.missingTerms).toEqual([{ term: 'wading birds', pane: 'translation' }]);
    unchanged(apply);
  });
  it('reports missing vocabulary even when the candidate also changes a citation', async () => {
    const data = SOURCE + ' [⁽¹⁾](https://example.org/source)';
    const d = deps('Other text. [⁽¹⁾](https://changed.example)', { generatedContent: { ...deps().generatedContent, data } });
    expect((await helpers.handleComplexityAdjustment(d)).reason).toBe('essential-terms-missing');
    unchanged(d);
  });
  it('accepts the same options with different property ordering during Apply', async () => {
    const preview = await helpers.handleComplexityAdjustment(deps());
    const apply = deps('', { adaptationPlan: { apply: preview, options: { keepTerms: ['wading birds'], explainVocabulary: false, shorterSentences: false } } });
    expect((await helpers.handleComplexityAdjustment(apply)).status).toBe('scheduled');
  });
  it('rechecks citations during Apply before any write', async () => {
    const data = SOURCE + ' [⁽¹⁾](https://example.org/source)';
    const d = deps(data, { generatedContent: { ...deps().generatedContent, data } });
    const preview = await helpers.handleComplexityAdjustment(d);
    preview.data = SOURCE + ' [⁽¹⁾](https://changed.example)';
    const apply = deps('', { generatedContent: d.generatedContent, adaptationPlan: { apply: preview } });
    expect(await helpers.handleComplexityAdjustment(apply)).toBeUndefined(); unchanged(apply);
    expect(apply.addToast).toHaveBeenCalledWith(expect.stringContaining('source citation'), 'warning');
  });
});


describe('acknowledged adaptation transactions', () => {
  it.each([true, false])('reports Apply success only after commit acknowledgment: %s', async accepted => {
    const preview = await helpers.handleComplexityAdjustment(deps());
    let finish;
    const commit = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    const d = deps('', { adaptationPlan: { apply: preview, commit } });
    const result = helpers.handleComplexityAdjustment(d);
    expect(commit).toHaveBeenCalledTimes(1); unchanged(d);
    expect(commit.mock.calls[0][0]).toMatchObject({ baseId: d.generatedContent.id, baseData: SOURCE, item: { data: preview.data } });
    finish(accepted);
    expect((await result).status).toBe(accepted ? 'applied' : 'stale');
    expect(d.addToast.mock.calls.some(([, tone]) => tone === 'success')).toBe(accepted);
    expect(d.setHistory).not.toHaveBeenCalled(); // the acknowledging reader owns this write
    if (!accepted) unchanged(d);
  });
  it('suppresses obsolete provider failures and leaves the current operation busy', async () => {
    const setter = vi.fn(); let rejectOld, resolveNew, oldCurrent = true;
    const old = deps('', { setIsProcessing: setter, adaptationPlan: { preview: true, options: { keepTerms: ['wading birds'] }, isCurrent: () => oldCurrent }, generateBilingualText: () => new Promise((_, reject) => { rejectOld = reject; }) });
    const first = helpers.handleComplexityAdjustment(old); oldCurrent = false;
    const next = deps('', { setIsProcessing: setter, generateBilingualText: () => new Promise(resolve => { resolveNew = resolve; }) });
    const second = helpers.handleComplexityAdjustment(next);
    rejectOld(new Error('old failure'));
    expect(await first).toEqual({ status: 'stale' });
    expect(setter.mock.calls).toEqual([[true], [true]]);
    unchanged(old); expect(old.setError).not.toHaveBeenCalled();
    resolveNew(SOURCE); expect((await second).status).toBe('preview');
    expect(setter).toHaveBeenLastCalledWith(false);
  });
  it('does not accept a late preview after its request is invalidated', async () => {
    let finish, current = true;
    const d = deps('', { adaptationPlan: { preview: true, options: { keepTerms: ['wading birds'] }, isCurrent: () => current }, generateBilingualText: () => new Promise(resolve => { finish = resolve; }) });
    const promise = helpers.handleComplexityAdjustment(d); current = false; finish(SOURCE);
    expect(await promise).toEqual({ status: 'stale' }); unchanged(d);
    expect(d.setIsProcessing).toHaveBeenLastCalledWith(false);
  });
  it('gives translation-only terms to the translation call without adding them to the primary prompt', async () => {
    const source = 'Las aves zancudas comen peces.' + DELIMITER + SOURCE;
    const callGemini = vi.fn().mockResolvedValueOnce('Las aves zancudas comen.') .mockResolvedValueOnce(SOURCE);
    const pipeline = window.AlloModules.TextPipelineHelpers;
    const d = deps('', { generatedContent: { ...deps().generatedContent, data: source, config: { language: 'Spanish' } }, callGemini, generateBilingualText: pipeline.generateBilingualText });
    expect((await helpers.handleComplexityAdjustment(d)).status).toBe('preview');
    expect(callGemini.mock.calls[0][0]).not.toContain('wading birds');
    expect(callGemini.mock.calls[1][0]).toContain('["wading birds"]');
    expect(callGemini.mock.calls[1][0]).toContain('including case and punctuation');
  });
  it('localizes missing-term pane labels and malformed-list feedback', async () => {
    const { readFileSync } = await import('node:fs');
    for (const locale of ['spanish_castilian', 'spanish_latin_america']) {
      const strings = JSON.parse(readFileSync('lang/' + locale + '.js', 'utf8'));
      const translate = key => key.split('.').reduce((value, part) => value?.[part], strings);
      const message = vocabulary.feedback({ missingTerms: [{ term: 'wading birds', pane: 'translation' }] }, translate);
      expect(message).toContain('traducción'); expect(message).toContain('wading birds'); expect(message).not.toContain('{terms}');
      expect(vocabulary.feedback(vocabulary.parseInput('"fish'), translate)).toContain('Cierra las comillas');
    }
  });
});
