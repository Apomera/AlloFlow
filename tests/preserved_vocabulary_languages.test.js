import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
let pipeline, helpers, vocabulary;
const D = '\n\n--- ENGLISH TRANSLATION ---\n\n';
beforeAll(() => {
  loadAlloModule('pure_helpers_module.js'); loadAlloModule('text_pipeline_helpers_module.js'); loadAlloModule('generation_helpers_module.js');
  pipeline = window.AlloModules.TextPipelineHelpers; helpers = window.AlloModules.GenerationHelpers; vocabulary = helpers.preservedVocabulary;
});
function deps(config = {}, extra = {}) {
  return {
    generatedContent: { id: 'language-1', type: 'simplified', data: 'Herons eat fish.' + D + 'Las garzas comen peces.', config: { language: 'English', ...config }, instructionalText: { form: 'adapted' } },
    complexityLevel: 5, gradeLevel: 'Grade 4', leveledTextLanguage: 'Arabic', translationMode: 'off', currentUiLanguage: 'French', resolveTranslationPolicy: pipeline.resolveTranslationPolicy,
    saveOriginalOnAdjust: false, adaptationPlan: { preview: true, options: { keepTerms: ['Herons', 'garzas'] } },
    setIsProcessing: vi.fn(), setComplexityLevel: vi.fn(), setGeneratedContent: vi.fn(), setHistory: vi.fn(), setWordSoundsCustomTerms: vi.fn(), setWsPreloadedWords: vi.fn(), setError: vi.fn(), addToast: vi.fn(), warnLog: vi.fn(),
    callGemini: vi.fn().mockResolvedValueOnce('Herons catch fish.').mockResolvedValueOnce('Las garzas pescan.'), cleanJson: value => value, t: key => key, getDefaultTitle: () => 'Reading',
    extractSourceTextForProcessing: pipeline.extractSourceTextForProcessing, generateBilingualText: pipeline.generateBilingualText, ...extra
  };
}
describe('translation language preservation', () => {
  it('generates an explicit Spanish translation of English primary text', async () => {
    const provider = vi.fn().mockResolvedValueOnce('Herons eat.').mockResolvedValueOnce('Las garzas comen.');
    expect(await pipeline.generateBilingualText('Rewrite.', 'English', provider, { enabled: true, target: 'Spanish' })).toBe('Herons eat.' + D + 'Las garzas comen.');
    expect(provider.mock.calls[1][0]).toContain('Translate the English text between the fences into Spanish.');
  });
  it.each([{ enabled: false, target: 'Spanish' }, { enabled: true, target: ' english ' }, { enabled: true, target: '' }])('makes one call without a distinct enabled target: %j', async policy => {
    const provider = vi.fn().mockResolvedValue('Herons eat.');
    expect(await pipeline.generateBilingualText('Rewrite.', 'English', provider, policy)).toBe('Herons eat.'); expect(provider).toHaveBeenCalledTimes(1);
  });
  it('retains legacy English-only behavior without a policy', async () => {
    const provider = vi.fn().mockResolvedValue('Herons eat.');
    expect(await pipeline.generateBilingualText('Rewrite.', 'English', provider)).toBe('Herons eat.'); expect(provider).toHaveBeenCalledTimes(1);
  });
  it.each([{translationPolicy:{target:'Spanish'}},{translationTarget:'Spanish'},{attachedTranslationTarget:'Spanish'}])('preserves a saved target despite different ambient settings: %j', async config => {
    const d = deps(config), result = await helpers.handleComplexityAdjustment(d);
    expect(result.status).toBe('preview'); expect(d.callGemini).toHaveBeenCalledTimes(2);
    expect(d.callGemini.mock.calls[1][0]).toContain('into Spanish.'); expect(d.callGemini.mock.calls[1][0]).toContain('["garzas"]');
    expect(result.config.translationPolicy).toEqual({enabled:true,target:'Spanish',mode:'artifact-preserve'});
    expect(result.vocabulary.required).toEqual([{term:'Herons',panes:[{pane:'primary',count:1}]},{term:'garzas',panes:[{pane:'translation',count:1}]}]);
    expect(d.setGeneratedContent).not.toHaveBeenCalled(); expect(d.setHistory).not.toHaveBeenCalled();
  });
  it('preserves top-level target metadata', async () => {
    const d = deps(); d.generatedContent.translationTarget = 'Spanish';
    expect((await helpers.handleComplexityAdjustment(d)).status).toBe('preview'); expect(d.callGemini.mock.calls[1][0]).toContain('into Spanish.');
  });
  it('uses English for legacy bilingual artifacts with no target metadata', async () => {
    const d = deps(); d.generatedContent.config.language = 'Spanish'; d.generatedContent.data = 'Las garzas comen.' + D + 'Herons eat.';
    d.callGemini = vi.fn().mockResolvedValueOnce('Las garzas pescan.').mockResolvedValueOnce('Herons catch fish.');
    const result = await helpers.handleComplexityAdjustment(d); expect(result.status).toBe('preview'); expect(d.callGemini.mock.calls[1][0]).toContain('into English.');
  });
  it('persists an explicit target for a new bilingual candidate', async () => {
    const d = deps({}, {translationMode:'Spanish'}); d.generatedContent.data = 'Herons eat fish.'; d.adaptationPlan.options.keepTerms = ['Herons'];
    const result = await helpers.handleComplexityAdjustment(d); expect(result.status).toBe('preview'); expect(result.config.translationTarget).toBe('Spanish'); expect(result.config.translationPolicy.target).toBe('Spanish');
  });
  it('revalidates translation terms on Apply and keeps the source after tampering', async () => {
    const d = deps({translationTarget:'Spanish'}), preview = await helpers.handleComplexityAdjustment(d);
    expect(preview.status).toBe('preview'); preview.data = 'Herons catch fish.' + D + 'Las aves pescan.';
    d.adaptationPlan = {apply:preview}; const result = await helpers.handleComplexityAdjustment(d);
    expect(result.status).toBe('rejected'); expect(result.message).toContain('garzas'); expect(d.setGeneratedContent).not.toHaveBeenCalled(); expect(d.setHistory).not.toHaveBeenCalled();
  });
  it('rejects Apply when saved translation metadata changes after Preview', async () => {
    const d = deps({translationTarget:'Spanish'}), preview = await helpers.handleComplexityAdjustment(d);
    expect(preview.status).toBe('preview'); d.generatedContent.config.translationTarget = 'French'; d.adaptationPlan = {apply:preview};
    expect((await helpers.handleComplexityAdjustment(d)).status).toBe('stale'); expect(d.setHistory).not.toHaveBeenCalled(); expect(d.callGemini).toHaveBeenCalledTimes(2);
  });
});
describe('actionable formatting diagnostics', () => {
  it.each([['<code>garzas</code>','code'],['<span class="colored">garzas</span>','styled'],['<details>garzas</details>','element'],['<em>garzas','html'],['`garzas','unclosed']])('identifies source translation formatting: %s', (text,format) => {
    const result = vocabulary.prepare('Herons eat.' + D + text, ['garzas'], pipeline.splitReferencesFromBody);
    expect(result).toMatchObject({valid:false,status:'unverified',diagnostic:{stage:'source',pane:'translation',format}});
    expect(vocabulary.feedback(result)).toContain('translation in the current reading'); expect(vocabulary.feedback(result)).toContain('preview again');
  });
  it('distinguishes candidate failure and asks for a new preview', () => {
    const result = vocabulary.validate('Herons eat.','<span style="color:red">Herons</span> eat.',['Herons'],pipeline.splitReferencesFromBody);
    expect(result.diagnostic).toEqual({stage:'candidate',pane:'primary',format:'styled'}); expect(vocabulary.feedback(result)).toContain('proposed version'); expect(vocabulary.feedback(result)).toContain('Retry the preview');
  });
  it('retains absent-term and duplicate readiness evidence', () => {
    const result = vocabulary.prepare('Herons eat.' + D + 'Las garzas comen.',['Herons','garzas','HERONS','garzas'],pipeline.splitReferencesFromBody);
    expect(result.absentFromSource).toEqual(['HERONS']); expect(result.duplicates).toEqual([{term:'garzas',index:3}]); expect(result.required).toHaveLength(2);
  });
});
