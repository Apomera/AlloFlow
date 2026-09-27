import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
const D = '\n\n--- ENGLISH TRANSLATION ---\n\n';
let helpers, pipeline;
beforeAll(() => { for (const file of ['pure_helpers_module.js','text_pipeline_helpers_module.js','generation_helpers_module.js']) loadAlloModule(file); helpers=window.AlloModules.GenerationHelpers; pipeline=window.AlloModules.TextPipelineHelpers; });
function deps(candidate, terms = ['Herons']) {
  return { generatedContent: {id:'panes-1',type:'simplified',data:'Herons eat fish.'+D+'Las garzas comen peces.',config:{language:'English',translationTarget:'Spanish'},instructionalText:{form:'adapted'}},
    complexityLevel:3,gradeLevel:'Grade 4',leveledTextLanguage:'English',translationMode:'off',resolveTranslationPolicy:pipeline.resolveTranslationPolicy,currentUiLanguage:'English',saveOriginalOnAdjust:false,
    adaptationPlan:{preview:true,options:{shorterSentences:true,keepTerms:terms}},setIsProcessing:vi.fn(),setComplexityLevel:vi.fn(),setGeneratedContent:vi.fn(),setHistory:vi.fn(),setWordSoundsCustomTerms:vi.fn(),setWsPreloadedWords:vi.fn(),setError:vi.fn(),addToast:vi.fn(),warnLog:vi.fn(),callGemini:vi.fn(),cleanJson:x=>x,t:k=>k,getDefaultTitle:()=> 'Reading',extractSourceTextForProcessing:pipeline.extractSourceTextForProcessing,generateBilingualText:vi.fn(async()=>candidate) };
}
function retained(d){expect(d.setGeneratedContent).not.toHaveBeenCalled();expect(d.setHistory).not.toHaveBeenCalled();expect(d.setComplexityLevel).not.toHaveBeenCalled();expect(d.addToast.mock.calls.some(([,tone])=>tone==='success')).toBe(false);}
describe('required reading pane completeness',()=>{
  it.each([
    ['missing translation','Herons catch fish.'], ['empty translation','Herons catch fish.'+D], ['empty primary',D+'Las garzas pescan.'],
    ['hidden translation','Herons catch fish.'+D+'<span hidden>Las garzas pescan.</span>'], ['citation-only translation','Herons catch fish.'+D+'[⁽¹⁾](https://example.org)'],
    ['reference-only translation','Herons catch fish.'+D+'## References\n\nhttps://example.org'],
    ['extra translation','Herons catch fish.'+D+'Las garzas pescan.'+D+'More text.'],['ambiguous delimiter','Herons catch fish.\n--- TRANSLATION ---\nLas garzas pescan.'],
    ['invisible-only translation','Herons catch fish.'+D+'\u200b\u2060\ufeff'],
    ['noncanonical separator','Herons catch fish.\n--- english translation ---\nLas garzas pescan.'],
    ['inline separator','Herons catch fish. --- ENGLISH TRANSLATION --- Las garzas pescan.'],
    ['non-text result',{text:'Herons catch fish.'}],['empty result','']
  ])('retains source for %s even without requested terms',async(_name,candidate)=>{
    const d=deps(candidate,[]),result=await helpers.handleComplexityAdjustment(d);
    expect(result).toMatchObject({status:'rejected',sourceRetained:true});expect(result.message).toContain('Current text kept');retained(d);
  });
  it('does not let primary-only terms conceal a dropped translation',async()=>{
    const d=deps('Herons catch fish.'),result=await helpers.handleComplexityAdjustment(d);
    expect(result).toMatchObject({status:'rejected',sourceRetained:true});expect(result.message).toContain('translation');retained(d);
  });
  it('checks pane completeness again on Apply',async()=>{
    const d=deps('Herons catch fish.'+D+'Las garzas pescan.'),preview=await helpers.handleComplexityAdjustment(d);expect(preview.status).toBe('preview');
    preview.data='Herons catch fish.';d.adaptationPlan={apply:preview};const result=await helpers.handleComplexityAdjustment(d);
    expect(result).toMatchObject({status:'rejected',sourceRetained:true});expect(d.generateBilingualText).toHaveBeenCalledTimes(1);retained(d);
  });
  it('retains the ordinary missing-term explanation for complete panes',async()=>{
    const d=deps('Birds catch fish.'+D+'Las garzas pescan.');const result=await helpers.handleComplexityAdjustment(d);
    expect(result.message).toContain('missing: “Herons”');retained(d);
  });
  it('accepts visible content in both panes and keeps no-terms status honest',async()=>{
    const d=deps('Herons catch fish.'+D+'Las garzas pescan.',[]),result=await helpers.handleComplexityAdjustment(d);
    expect(result.status).toBe('preview');expect(result.vocabulary.status).toBe('not-requested');retained(d);
  });
  it('accepts visible Unicode content rather than requiring Latin letters',async()=>{
    const d=deps('👩‍🏫'+D+'طيور الماء',[]);expect((await helpers.handleComplexityAdjustment(d)).status).toBe('preview');retained(d);
  });
  it('requires a newly requested translation even for a monolingual source',async()=>{
    const d=deps('Herons catch fish.',[]);d.generatedContent.data='Herons eat fish.';d.translationMode='Spanish';
    expect(await helpers.handleComplexityAdjustment(d)).toMatchObject({status:'rejected',sourceRetained:true});retained(d);
  });
  it('rejects an unsolicited translation when the policy is off',async()=>{
    const d=deps('Herons catch fish.'+D+'Las garzas pescan.',[]);d.generatedContent.data='Herons eat fish.';
    expect(await helpers.handleComplexityAdjustment(d)).toMatchObject({status:'rejected',sourceRetained:true});retained(d);
  });
  it.each(['', '  ', '```\n\n```', null, undefined, {text:'Herons eat.'}])('stops an invalid primary response before translation: %j',async raw=>{
    const provider=vi.fn().mockResolvedValueOnce(raw).mockResolvedValueOnce('Las garzas pescan.');
    await expect(pipeline.generateBilingualText('Rewrite.','English',provider,{enabled:true,target:'Spanish'})).rejects.toMatchObject({code:'invalid-generated-text',pane:'primary'});
    expect(provider).toHaveBeenCalledTimes(1);
  });
  it('rejects an empty translation response',async()=>{
    const provider=vi.fn().mockResolvedValueOnce('Herons eat.').mockResolvedValueOnce('');
    await expect(pipeline.generateBilingualText('Rewrite.','English',provider,{enabled:true,target:'Spanish'})).rejects.toMatchObject({code:'invalid-generated-text',pane:'translation'});
  });
  it('reports provider output rejection with retained source',async()=>{
    const d=deps('',[]);d.generateBilingualText=pipeline.generateBilingualText;d.callGemini=vi.fn().mockResolvedValueOnce('');
    expect(await helpers.handleComplexityAdjustment(d)).toMatchObject({status:'rejected',sourceRetained:true});retained(d);
  });
});


describe('citations follow the actual translation policy', () => {
  const citation = '[⁽¹⁾](https://example.org/research_(verified))';
  const references = '### Source Text References\n1. [Verified research](https://example.org/research_(verified))';
  function cited(candidate, translationMode = 'off') {
    const d = deps(candidate, ['garzas']);
    d.generatedContent.data = 'Las garzas comen peces. ' + citation + '\n\n' + references;
    d.generatedContent.config = { language: 'Spanish' };
    d.leveledTextLanguage = 'Spanish';
    d.translationMode = translationMode;
    return d;
  }
  it('previews and applies a cited Spanish adaptation with translation disabled', async () => {
    const d = cited('Las garzas pescan. ' + citation);
    const preview = await helpers.handleComplexityAdjustment(d);
    expect(preview.status).toBe('preview');
    expect(preview.data).toBe('Las garzas pescan. ' + citation + '\n\n' + references);
    retained(d);
    d.adaptationPlan = { apply: preview, commit: vi.fn(async () => true) };
    const applied = await helpers.handleComplexityAdjustment(d);
    expect(applied.status).toBe('applied');
    expect(d.generateBilingualText).toHaveBeenCalledTimes(1);
    expect(d.adaptationPlan.commit).toHaveBeenCalledTimes(1);
    expect(d.setGeneratedContent).not.toHaveBeenCalled();
  });
  it.each([
    ['missing', 'Las garzas pescan.'],
    ['changed', 'Las garzas pescan. [⁽¹⁾](https://example.org/changed)'],
    ['duplicated', 'Las garzas pescan. ' + citation + ' ' + citation],
  ])('retains citation protection without translation: %s', async (_label, candidate) => {
    const d = cited(candidate);
    const result = await helpers.handleComplexityAdjustment(d);
    expect(result).toBeUndefined();
    expect(d.addToast).toHaveBeenCalledWith(expect.stringContaining('source citation'), 'warning');
    retained(d);
  });
  it('accepts a requested translation that preserves the primary citations', async () => {
    const d = cited('Las garzas pescan. ' + citation + D + 'Herons fish. ' + citation, 'English');
    const preview = await helpers.handleComplexityAdjustment(d);
    expect(preview.status).toBe('preview');
    d.adaptationPlan = { apply: preview, commit: vi.fn(async () => true) };
    expect((await helpers.handleComplexityAdjustment(d)).status).toBe('applied');
    expect(d.generateBilingualText).toHaveBeenCalledTimes(1);
  });
  it('rejects a requested translation that loses the primary citations', async () => {
    const d = cited('Las garzas pescan. ' + citation + D + 'Herons fish.', 'English');
    expect(await helpers.handleComplexityAdjustment(d)).toBeUndefined();
    expect(d.addToast).toHaveBeenCalledWith(expect.stringContaining('source citation'), 'warning');
    retained(d);
  });
});
