import fs from 'node:fs';
import {beforeEach,describe,expect,it,vi,afterEach} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(n,p){if(!n||typeof n!=='object')return null;if(Array.isArray(n)){for(const c of n){const r=find(c,p);if(r)return r;}return null;}return p(n)?n:find(n.props?.children,p);}
function text(n){return n==null||typeof n==='boolean'?'':typeof n!=='object'?String(n):Array.isArray(n)?n.map(text).join(' '):text(n.props?.children);}
function session(file,extra={}){resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'organs',view:'anterior',complexity:3,_activeTab:'explore',selectedStructure:'diaphragm',...extra}};
 const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',setToolData:u=>{data=typeof u==='function'?u(data):u;}}));
 const node=p=>{const n=find(render(),p);expect(n).not.toBeNull();return n;};
 return {data:()=>data.anatomy,node,patch:p=>{data={anatomy:{...data.anatomy,...p}};},click:label=>node(n=>n.type==='button'&&text(n).trim()===label).props.onClick(),html:()=>{const div=document.createElement('div');div.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return div;}};
}
beforeEach(resetStemLab);afterEach(()=>vi.restoreAllMocks());
const ids=['diaphragm','diaphragm_m','adrenals','adrenal_endo','pancreas','islets','hypothalamus','hypothal_endo'];const now=1800000000000;
describe('Portable learning continuity',()=>{
 beforeEach(()=>loadTool(paths[0],'anatomy'));
 it('exports shared counts once and projects the latest valid rating without changing notes',()=>{
  const state={_retrievalEvidence:{diaphragm:{attempts:3,correct:2},diaphragm_m:{attempts:2,correct:1}},_structureConfidence:{diaphragm:'mastered',diaphragm_m:'practice'},_confidenceAt:{diaphragm:now-200,diaphragm_m:now-100},_structureNotes:{diaphragm:'Breathing',diaphragm_m:'Muscle'}};
  const p=window.__alloAnatomyStudyPure.packet(state,ids,now);
  expect(p.records.filter(r=>r.recall)).toEqual([expect.objectContaining({id:'diaphragm',recall:{attempts:5,correct:3}})]);
  expect(p.records.map(r=>r.confidence)).toEqual(['practice','practice']);expect(p.records.map(r=>r.note)).toEqual(['Breathing','Muscle']);expect(state._structureConfidence.diaphragm).toBe('mastered');
 });
 it('uses cautious ratings on undated ties and ignores future dates',()=>{
  const p=window.__alloAnatomyStudyPure.packet({_structureConfidence:{adrenals:'practice',adrenal_endo:'mastered'},_confidenceAt:{adrenal_endo:now+1}},ids,now);
  expect(p.records.every(r=>r.confidence==='practice'&&r.ratedAt===null)).toBe(true);
 });
 it('does not merge a parent organ with a substructure or a signaling axis',()=>{
  const p=window.__alloAnatomyStudyPure.packet({_structureConfidence:{pancreas:'mastered',islets:'practice',hypothalamus:'learning',hypothal_endo:'practice'},_retrievalEvidence:{hypothalamus:{attempts:2,correct:2},hypothal_endo:{attempts:3,correct:1}}},ids,now);
  expect(p.records.map(r=>r.confidence)).toEqual(['mastered','practice','learning','practice']);expect(p.records.filter(r=>r.recall)).toHaveLength(2);
 });
 it('merges cumulative snapshots without inflating repeated or aliased imports',()=>{
  const C=window.__alloAnatomyStudyPure,state={_retrievalEvidence:{diaphragm:{attempts:2,correct:1},diaphragm_m:{attempts:3,correct:2}}};
  const p=C.packet({_retrievalEvidence:{diaphragm_m:{attempts:7,correct:4}}},ids,now);p.records.push({...p.records[0],id:'diaphragm_m'});
  const a=C.merge(state,p,ids,now).patch,b=C.merge(a,p,ids,now).patch;
  expect(a._retrievalEvidence).toEqual({diaphragm:{attempts:7,correct:4}});expect(b._retrievalEvidence).toEqual(a._retrievalEvidence);
  const equal=C.packet({_retrievalEvidence:{diaphragm:{attempts:7,correct:7}}},ids,now);expect(C.merge(a,equal,ids,now).patch._retrievalEvidence.diaphragm.correct).toBe(4);
 });
 it('round trips writing while keeping answer choices local and preserving existing work',()=>{
  const C=window.__alloAnatomyStudyPure,p=C.packet({_systemsMotionLearning:{exercise:{explanation:'My chain',transferExplanation:'My comparison',prediction:'less',transfer:1,selfReview:true},forged:{explanation:'Ignore'}},_feedbackExperiment:{explanation:'Feedback slows',direction:'cooling',prediction:'active',revealed:true}},ids,now);
  expect(p.learningNotes).toHaveLength(2);expect(JSON.stringify(p)).not.toMatch(/prediction|selfReview|revealed|forged/);
  const state={_systemsMotionLearning:{exercise:{explanation:'Keep this',prediction:'same',transfer:2},meal:{explanation:'Other scenario'}},_feedbackExperiment:{direction:'cooling',prediction:'active',revealed:true}};
  const a=C.merge(state,p,ids,now);expect(a.keptReflections).toBe(1);expect(a.patch._systemsMotionLearning.exercise).toMatchObject({explanation:'Keep this',transferExplanation:'My comparison',prediction:'same',transfer:2});expect(a.patch._systemsMotionLearning.meal.explanation).toBe('Other scenario');expect(a.patch._feedbackExperiment).toMatchObject({direction:'cooling',revealed:true,explanation:'Feedback slows'});
  const fresh=C.merge({},p,ids,now).patch;expect(fresh._systemsMotionLearning.exercise.prediction).toBeUndefined();expect(fresh._systemsMotionLearning.exercise.transfer).toBeUndefined();
 });
 it('rejects malformed count and reflection extensions before merging',()=>{
  const C=window.__alloAnatomyStudyPure,p=C.packet({_structuresViewed:{diaphragm:true}},ids,now),row=p.records[0];
  for(const recall of [null,{attempts:'2',correct:1},{attempts:1.2,correct:1},{attempts:2,correct:3},{attempts:1000001,correct:0}])expect(()=>C.parse({...p,records:[{...row,recall}]},ids)).toThrow();
  const note={id:'exercise',explanation:'x',transferExplanation:''};
  for(const learningNotes of [{},[note,note],[{...note,id:'__proto__'}],[{...note,explanation:'x'.repeat(1201)}],[{...note,transferExplanation:3}]])expect(()=>C.parse({...p,learningNotes},ids)).toThrow();
 });
});
for(const file of paths)describe('Connected anatomy learning: '+file,()=>{
 it('shares ratings and review timestamps across views, while retaining entry notes',()=>{
  const s=session(file,{_structureNotes:{diaphragm:'My respiratory note',diaphragm_m:'My muscle note'},_retrievalEvidence:{diaphragm:{attempts:2,correct:1},diaphragm_m:{attempts:3,correct:2}}});
  s.click('OK Got it');expect(s.data()._structureConfidence).toMatchObject({diaphragm:'mastered',diaphragm_m:'mastered'});expect(s.data()._confidenceAt.diaphragm).toBe(s.data()._confidenceAt.diaphragm_m);
  s.node(n=>n.props?.['data-anatomy-open-context']==='diaphragm_m').props.onClick();expect(s.data().system).toBe('muscular');
  expect(s.html().querySelector('[data-anatomy-recall-evidence="diaphragm_m"]').textContent).toContain('3 correct out of 5');expect(s.data()._structureNotes.diaphragm).toBe('My respiratory note');expect(s.data()._structureNotes.diaphragm_m).toBe('My muscle note');
 });
 it('consolidates old alias counts only once on the next scored answer',()=>{
  const s=session(file,{system:'organs',view:'posterior',_activeTab:'quiz',quizMode:true,quizIdx:6,_retrievalEvidence:{adrenals:{attempts:2,correct:1},adrenal_endo:{attempts:3,correct:2}}});
  const submit=s.node(n=>n.props?.['data-anatomy-quiz-option']==='endocrine').props.onClick;submit();submit();
  expect(s.data()._retrievalEvidence).toEqual({adrenals:{attempts:6,correct:4}});expect(s.data()._structureConfidence.adrenal_endo).toBe('learning');
 });
 it('opens the quadriceps cellular mechanism from the guided activity chooser',()=>{
  const s=session(file);s.node(n=>n.props?.id==='anatomy-mobile-activity').props.onChange({target:{value:'systemsMotion'}});
  expect(s.data()).toMatchObject({_showSystemsMotion:true,selectedStructure:'quads',_regionalAtlasOpen:'quads'});
  const atlas=s.html().querySelector('[data-anatomy-atlas="quads"]');expect(atlas).not.toBeNull();expect(atlas.textContent).toContain('not a drawing of the thigh');
  s.node(n=>n.props?.id==='anatomy-mobile-activity').props.onChange({target:{value:'flashcards'}});expect(s.data()._showSystemsMotion).toBe(false);expect(s.data()._activeTab).toBe('flashcards');
 });
 for(const [id,prediction,correct]of [['exercise','less',1],['meal','less',2],['wound','more',0],['fluid','more',1]])it('runs prediction, explanation and transfer for '+id,()=>{
  const s=session(file,{_showSystemsMotion:true,_systemsMotionScenario:id});
  s.click('Apply disruption');expect(s.html().querySelector('[data-systems-motion-impact]')).toBeNull();expect(s.node(n=>n.props?.['data-anatomy-motion-reveal']==='true').props.disabled).toBe(true);
  s.node(n=>n.type==='input'&&n.props.name==='anatomy-motion-prediction'&&n.props.value===prediction).props.onChange();
  s.node(n=>n.props?.['data-anatomy-motion-reveal']==='true').props.onClick();expect(s.data()._systemsMotionPerturbation).toBe(true);expect(s.html().querySelector('[data-anatomy-motion-prediction-feedback]').textContent).toContain('matches the model');
  s.node(n=>n.props?.id==='anatomy-motion-explanation').props.onChange({target:{value:'My causal explanation'}});s.click('Check my explanation');expect(s.data()._systemsMotionLearning[id].selfReview).toBe(true);
  s.node(n=>n.props?.['data-anatomy-motion-transfer-option']===String((correct+1)%3)).props.onClick();expect(s.html().querySelector('[data-anatomy-motion-transfer-correct]').dataset.anatomyMotionTransferCorrect).toBe('false');
  s.node(n=>n.props?.['data-anatomy-motion-transfer-option']===String(correct)).props.onClick();expect(s.html().querySelector('[data-anatomy-motion-transfer-correct]').dataset.anatomyMotionTransferCorrect).toBe('true');expect(s.data()._structureConfidence).toBeUndefined();expect(s.data()._retrievalEvidence).toBeUndefined();
  s.patch({_showStudySheet:true});expect(s.html().querySelector('[data-anatomy-study-reflection="'+id+'"]').textContent).toContain('My causal explanation');
 });
 it('restores legacy disruptions and resets a new scenario without losing writing',()=>{
  const s=session(file,{_showSystemsMotion:true,_systemsMotionPerturbation:true,_systemsMotionLearning:{exercise:{explanation:'Save me'}}});
  expect(s.html().querySelector('[data-systems-motion-impact]')).not.toBeNull();
  s.node(n=>n.props?.['data-systems-motion-choice']==='meal').props.onClick();expect(s.data()._systemsMotionPerturbation).toBe(false);expect(s.data()._regionalAtlasClinical).toBe(false);expect(s.data()._systemsMotionLearning.exercise.explanation).toBe('Save me');
 });
 it('includes ungraded reflections and recall-only entries in study sheet and copied text',()=>{
  const s=session(file,{_showStudySheet:true,_retrievalEvidence:{diaphragm:{attempts:4,correct:2}},_systemsMotionLearning:{meal:{explanation:'Absorption chain',transferExplanation:'Transport comparison'}},_feedbackExperiment:{explanation:'Temperature feedback'}});
  expect(s.html().querySelector('[data-anatomy-study-recall="diaphragm"]').textContent).toContain('2/4');expect(s.html().querySelectorAll('[data-anatomy-study-reflection]')).toHaveLength(2);
  let copied='';const original=document.execCommand;document.execCommand=()=>{copied=document.querySelector('textarea').value;return true;};
  try{s.click('📋 Copy as text');expect(copied).toContain('Absorption chain');expect(copied).toContain('Transport comparison');expect(copied).toContain('Temperature feedback');expect(copied).toContain('2/4');}finally{document.execCommand=original;}
  s.node(n=>n.props?.['data-anatomy-resume-reflection']==='homeostasis').props.onClick();expect(s.data()).toMatchObject({_showStudySheet:false,_activeTab:'homeoHunt'});
 });
 it('returns to an imported scenario explanation even before a new prediction',()=>{
  const s=session(file,{_showStudySheet:true,_systemsMotionLearning:{fluid:{explanation:'Keep volume and selectivity separate'}}});
  s.node(n=>n.props?.['data-anatomy-resume-reflection']==='fluid').props.onClick();expect(s.data()).toMatchObject({_showStudySheet:false,_showSystemsMotion:true,_systemsMotionScenario:'fluid'});expect(s.html().querySelector('#anatomy-motion-explanation').textContent).toContain('Keep volume');
 });
});

for(const file of paths)for(const id of ['biceps','quads'])it('preserves actin filament length as the Z discs move closer: '+id+' in '+file,()=>{
 const s=session(file,{system:'muscular',selectedStructure:id,_regionalAtlasOpen:id,_regionalAtlasStep:0});
 const geometry=()=>[...s.html().querySelectorAll('[data-anatomy-filament]')].map(el=>({id:el.dataset.anatomyFilament,x1:Number(el.getAttribute('x1')),length:Math.abs(Number(el.getAttribute('x2'))-Number(el.getAttribute('x1')))}));
 const relaxed=geometry();s.patch({_regionalAtlasStep:3});const shortened=geometry();expect(relaxed).toHaveLength(2);expect(shortened.map(row=>row.length)).toEqual(relaxed.map(row=>row.length));expect(shortened[0].x1).toBeGreaterThan(relaxed[0].x1);expect(shortened[1].x1).toBeLessThan(relaxed[1].x1);expect(s.html().querySelector('#anatomy-arrow-contraction').getAttribute('markerUnits')).toBe('userSpaceOnUse');
});
