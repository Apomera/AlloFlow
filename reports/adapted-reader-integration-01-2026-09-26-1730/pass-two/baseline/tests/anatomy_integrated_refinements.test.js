import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const files=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const notes=JSON.parse(fs.readFileSync('reports/anatomy-clinical-notes-refinements-2026-09-12/content.json','utf8'));
const strings=JSON.parse(fs.readFileSync('reports/anatomy-integrated-refinements-2026-09-12/strings-english.json','utf8'));
function find(node,p){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const match=find(child,p);if(match)return match;}return null;}return p(node)?node:find(node.props?.children,p);}
function session(file,patch={},grade='9',lang=null){
 resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'skeletal',view:'anterior',complexity:3,_activeTab:'quiz',...patch}};const announcements=[];
 const dict=lang?JSON.parse(fs.readFileSync('lang/'+lang+'.js','utf8')).stem.anatomy:null;
 const overrides={gradeLevel:grade,t:(k,f)=>dict?.[k.slice(13)]||f,announceToSR:m=>announcements.push(m),setToolData:f=>{data=typeof f==='function'?f(data):f;}};
 const tree=()=>tool.render(makeCtx({toolData:data,...overrides}));const node=(attr,value)=>find(tree(),n=>n.props?.[attr]===value);
 return {data:()=>data.anatomy,patch:p=>{data={anatomy:{...data.anatomy,...p}};},node,announcements,
  capture:()=>node('data-anatomy-quiz-panel','true').ref({}),
  html:()=>{const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data,overrides);return root;},
  answer:id=>node('data-anatomy-quiz-option',id).props.onClick()};
}
beforeEach(resetStemLab);afterEach(()=>vi.restoreAllMocks());
for(const file of files)describe('Integrated anatomy refinements: '+file,()=>{
 it('rejects an answer retained after leaving Quiz without changing newer study evidence',()=>{
  const s=session(file);s.capture();const click=s.node('data-anatomy-quiz-option','skull').props.onClick;
  s.patch({_activeTab:'explore',_structureConfidence:{femur:'mastered'},_retrievalEvidence:{femur:{attempts:7,correct:6}}});const before=structuredClone(s.data());click();expect(s.data()).toEqual(before);expect(s.announcements).toEqual([]);
 });
 it('preserves newer confidence and recall records when a current question is answered',()=>{
  const s=session(file);s.capture();const click=s.node('data-anatomy-quiz-option','skull').props.onClick;
  s.patch({_structureConfidence:{femur:'mastered'},_retrievalEvidence:{femur:{attempts:7,correct:6}}});click();expect(s.data()._structureConfidence.femur).toBe('mastered');expect(s.data()._retrievalEvidence.femur).toEqual({attempts:7,correct:6});expect(s.data()._quizAttempts).toBe(1);expect(s.announcements.join(' ')).toContain('Correct');
 });
 it('rejects a retained answer after restarting at the same question index',()=>{
  const s=session(file);s.capture();const old=s.node('data-anatomy-quiz-option','skull').props.onClick;
  s.node('aria-label','Restart quiz').props.onClick();const current=structuredClone(s.data());old();expect(s.data()).toEqual(current);s.answer('skull');expect(s.data()._quizAttempts).toBe(1);
 });
 it('accepts only one of two answer callbacks from separately rendered controls',()=>{
  const s=session(file);s.capture();const a=s.node('data-anatomy-quiz-option','skull').props.onClick,b=s.node('data-anatomy-quiz-option','skull').props.onClick;a();b();expect(s.data()._quizAttempts).toBe(1);expect(s.data().quizScore).toBe(1);
 });
 it('recovers from forged feedback without locking the current question',()=>{
  const s=session(file,{quizFeedback:{chosen:'forged',correct:true}});s.capture();s.answer('skull');expect(s.data().quizFeedback.chosen).toBe('skull');expect(s.data()._quizAttempts).toBe(1);
 });
 it('balances eight binary questions while preserving each stored truth through reload',()=>{
  const truths=[];for(let index=1;index<32;index+=4){const s=session(file,{quizIdx:index,_quizSeed:'regression-seed'});s.capture();const truth=s.data()._quizQuestion.binaryTrue;truths.push(truth);const reload=session(file,structuredClone(s.data()));reload.answer(truth?'true':'false');expect(reload.data().quizFeedback.correct).toBe(true);}
  expect(truths.filter(Boolean)).toHaveLength(4);expect(truths.some((truth,i)=>i&&truth===truths[i-1])).toBe(true);
 });
 for(const [id,note]of Object.entries(notes))it('keeps the full reviewed clinical explanation and source after applying '+id,()=>{
  const s=session(file,{system:note.system,view:note.view,quizIdx:3});s.capture();const saved=s.data()._quizQuestion,ids=saved.poolIds.filter(x=>x!==id);ids.splice(3,0,id);s.patch({_quizQuestion:{...saved,poolIds:ids}});
  expect(s.html().querySelector('[data-anatomy-quiz-panel]').textContent).toContain(strings['ref2_case_'+id]);s.answer(id);const card=s.html().querySelector('[data-anatomy-clinical-note="'+id+'"]');expect(card.querySelector('[data-anatomy-clinical-note-text]').textContent).toBe(note.clinical);expect(card.querySelector('a').href).toBe(note.reference);expect(card.textContent).toContain(note.prompt);
 });
 for(const grade of ['1','4'])it('gates brain details and comparison clinical text for grade '+grade,()=>{
  const s=session(file,{system:'nervous',selectedStructure:'brain',_activeTab:'explore',complexity:1},grade);expect(s.html().querySelector('[data-anatomy-brain-study]')).not.toBeNull();expect(s.html().querySelector('[data-anatomy-wave]')).toBeNull();expect(s.html().querySelector('[data-anatomy-clinical-note]')).toBeNull();s.patch({system:'skeletal',selectedStructure:'skull',_compareStructure:'femur'});expect(s.html().querySelector('[data-anatomy-clinical-note="femur"]')).toBeNull();
 });
 for(const lang of ['french','spanish_latin_america','arabic'])it('keeps all terms reachable and migrates study credit without duplicates in '+lang,()=>{
  const s=session(file,{_activeTab:'explore',selectedStructure:'hyoid',vocabLookedUp:['Cranium','forged']},'9',lang);expect(s.html().querySelectorAll('[data-anatomy-vocab-term]')).toHaveLength(10);expect(s.html().querySelector('[data-anatomy-study-term="cranium"]')).toBeNull();const a=s.node('data-anatomy-study-term','hyoid').props.onClick,b=s.node('data-anatomy-study-term','hyoid').props.onClick;a();b();expect(s.data().vocabLookedUp).toEqual(['cranium','hyoid']);expect(s.data().totalRP).toBe(5);
 });
});
