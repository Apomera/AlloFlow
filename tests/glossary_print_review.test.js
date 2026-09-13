import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

beforeAll(() => { loadAlloModule('doc_pipeline_module.js'); loadAlloModule('export_module.js'); });
afterEach(() => vi.restoreAllMocks());
const glossary = { type:'glossary', id:'print-qa', title:'Vocabulary', data:[{term:'Water',def:'A liquid'}], gameData:{grid:[['W','A'],['T','R']],solutions:['0-0'],words:['Water']} };
function pack(options={}) {
  const pipeline=window.AlloModules.createDocPipeline({callGemini:async()=>'{}',callGeminiVision:async()=>'{}',callImagen:async()=>null,addToast:()=>{},t:key=>key,isRtlLang:()=>false,updateExportPreview:()=>{},getDefaultTitle:()=> 'Vocabulary',state:{}});
  return pipeline.generateFullPackHTML([glossary],'Print QA',true,{}, {includeGlossary:true,includeTeacherKey:false,annotations:[],...options});
}
function printWordSearch(gameData) {
  const source=readFileSync('AlloFlowANTI.txt','utf8');
  const start=source.indexOf('  const handlePrintGame =');
  const handler=source.slice(start,source.indexOf('  const chunkText =',start));
  let html=''; const print=vi.fn();
  vi.spyOn(window,'open').mockReturnValue({document:{write:value=>{html+=value},close:vi.fn()},print});
  vi.spyOn(globalThis,'setTimeout').mockImplementation(fn=>{fn();return 1;});
  new Function('gameData','t','addToast',handler+';handlePrintGame();')(gameData,key=>key,vi.fn());
  return {doc:new DOMParser().parseFromString(html,'text/html'),print};
}
describe('glossary print output', () => {
  it.each(['table','flash-cards','language-cards'])('keeps saved word-search answers out of the %s student export', mode=>{
    expect(pack({glossaryDisplayMode:mode})).not.toContain('glossary.word_search_key');
  });
  it('includes saved answers only in the requested teacher copy',()=>{
    const doc=new DOMParser().parseFromString(pack({includeTeacherKey:true}),'text/html');
    expect(doc.querySelector('[id="print-qa"]')?.textContent).not.toContain('glossary.word_search_key');
    expect(doc.querySelector('[id="print-qa-key"]')?.textContent).toContain('glossary.word_search_key');
  });
  it('assessment mode suppresses a saved answer key even if selected',()=>{
    expect(pack({includeTeacherKey:true,assessmentMode:true})).not.toContain('glossary.word_search_key');
  });
  it('prints a fresh student grid and a separate outlined solution without needing live DOM',()=>{
    const {doc,print}=printWordSearch(glossary.gameData);
    expect(doc.querySelectorAll('.student-version tr')).toHaveLength(2);
    expect(doc.querySelectorAll('.student-version td')).toHaveLength(4);
    expect(doc.querySelectorAll('.student-version .solution')).toHaveLength(0);
    expect(doc.querySelectorAll('.teacher-version .solution')).toHaveLength(1);
    expect(print).toHaveBeenCalledOnce();
  });
  it('preserves RTL direction on both puzzle grids and escapes term markup',()=>{
    const {doc}=printWordSearch({...glossary.gameData,isRtl:true,words:['<img src=x onerror=alert(1)>'],grid:[['<','&']]});
    expect([...doc.querySelectorAll('table')].map(t=>t.dir)).toEqual(['rtl','rtl']);
    expect(doc.querySelector('td').textContent).toBe('<');
    expect(doc.querySelector('.word-list').textContent).toContain('<img');
    expect(doc.querySelector('img')).toBeNull();
  });
  it('accepts a puzzle without saved solution metadata',()=>{
    const {doc}=printWordSearch({grid:[['A']],words:['A']});
    expect(doc.querySelectorAll('td')).toHaveLength(2);
    expect(doc.querySelector('.solution')).toBeNull();
  });
  it('empty flashcard data reports a helpful message without downloading',()=>{
    const addToast=vi.fn(),createUrl=vi.spyOn(URL,'createObjectURL');
    window.AlloModules.createExport({liveRef:{current:{generatedContent:{type:'glossary'},t:key=>key,addToast}},escapeXml:s=>s}).handleExportFlashcards();
    expect(createUrl).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('Add glossary terms before exporting flashcards.','info');
  });
});
