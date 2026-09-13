import fs from 'node:fs';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const files=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const bank=JSON.parse(fs.readFileSync('reports/anatomy-tour-refinements-2026-09-12/tours.json','utf8'));
function find(n,p){if(!n||typeof n!=='object')return null;if(Array.isArray(n)){for(const c of n){const r=find(c,p);if(r)return r;}return null;}return p(n)?n:find(n.props?.children,p);}
function text(n){return n==null||typeof n==='boolean'?'':typeof n!=='object'?String(n):Array.isArray(n)?n.map(text).join(' '):text(n.props?.children);}
function session(file,extra={},ctx={}){resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'skeletal',view:'anterior',complexity:3,_activeTab:'tour',_tourActive:true,_tourStepIdx:0,selectedStructure:'skull',...extra}};
 const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',...ctx,setToolData:u=>{data=typeof u==='function'?u(data):u;}}));
 const node=p=>{const n=find(render(),p);expect(n).not.toBeNull();return n;};
 return {data:()=>data.anatomy,node,patch:p=>{data={anatomy:{...data.anatomy,...p}};},jump:index=>node(n=>n.props?.id==='anatomy-tour-step-select').props.onChange({target:{value:String(index)}}),choose:system=>node(n=>n.props?.id==='anatomy-tour-system-select').props.onChange({target:{value:system}}),answer:(id,option)=>{const q=node(n=>n.props?.['data-anatomy-recap-question']===id);return find(q,n=>n.props?.['data-anatomy-tour-option']===option).props.onClick;},html:()=>{const div=document.createElement('div');div.innerHTML=renderTool('anatomy',data,{gradeLevel:'9',...ctx});return div;}};
}
const recap=systemId=>({_tourRecap:{active:true,version:2,systemId,answers:{}}});
beforeEach(()=>{resetStemLab();vi.useFakeTimers();});afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
for(const file of files)describe('Sourced and reliable anatomy tours: '+file,()=>{
 for(const [system,rows]of Object.entries(bank))it('teaches every step and uses authored clues in '+system,()=>{
  const spoken=[],s=session(file,{system},{callTTS:value=>spoken.push(value)});
  for(const [index,[id,narration,,slug]]of rows.entries()){s.jump(index);expect(s.data().selectedStructure).toBe(id);expect(s.data()._tourSystem).toBe(system);const step=s.html().querySelector('[data-anatomy-tour-step]');expect(step.textContent).toContain(narration);expect(step.querySelector('a').href).toBe('https://openstax.org/books/anatomy-and-physiology-2e/pages/'+slug);s.node(n=>n.type==='button'&&n.props?.['aria-label']==='Read this tour step aloud').props.onClick();expect(spoken.at(-1)).toBe(narration);}
  s.node(n=>n.props?.['data-anatomy-tour-recap-open']==='true').props.onClick();const questions=[...s.html().querySelectorAll('[data-anatomy-recap-question]')];expect(questions).toHaveLength(4);for(const q of questions){const row=rows.find(r=>r[0]===q.dataset.anatomyRecapQuestion);expect(q.textContent).toContain(row[2]);expect(q.textContent).not.toContain('____');expect(q.querySelectorAll('[data-anatomy-tour-option]')).toHaveLength(4);}
 });
 it('keeps rapid answers and counts each accepted response only once',()=>{
  const s=session(file,recap('skeletal'));const a=s.answer('skull','skull'),b=s.answer('vertebral','vertebral');a();a();b();b();expect(s.data()._tourRecap.answers).toEqual({0:'skull',1:'vertebral'});expect(s.data()._retrievalEvidence).toMatchObject({skull:{attempts:1,correct:1},vertebral:{attempts:1,correct:1}});
 });
 it('records a miss for the target structure and revisits its original teaching position',()=>{
  const s=session(file,recap('skeletal'));s.answer('pelvis','skull')();expect(s.data()._retrievalEvidence).toEqual({pelvis:{attempts:1,correct:0}});expect(s.data()._structureConfidence.pelvis).toBe('practice');expect(s.html().querySelector('[data-anatomy-tour-feedback]').textContent).toContain('pelvic cavity');s.node(n=>n.props?.['data-anatomy-tour-review']===4).props.onClick();expect(s.data()).toMatchObject({_tourRecap:null,_tourStepIdx:4,selectedStructure:'pelvis'});
 });
 it('ignores a late answer after the learner changes tour',()=>{
  const s=session(file,recap('skeletal')),answer=s.answer('skull','skull');s.choose('muscular');answer();expect(s.data()).toMatchObject({system:'muscular',selectedStructure:'diaphragm_m',_tourStepIdx:0,_tourRecap:null});expect(s.data()._retrievalEvidence).toBeUndefined();
 });
 it('does not restore answer indexes from a different system or legacy content',()=>{
  for(const old of [{active:true,answers:{0:'skull'}},{active:true,version:2,systemId:'muscular',answers:{0:'diaphragm_m'}}]){const s=session(file,{_tourRecap:old});expect(s.html().querySelector('[data-anatomy-recap]')).toBeNull();expect(s.html().querySelector('[data-anatomy-tour-step]')).not.toBeNull();expect(s.data()._retrievalEvidence).toBeUndefined();}
 });
 it('discards invalid saved answers without treating the recap as completed',()=>{
  const s=session(file,{_tourRecap:{active:true,version:2,systemId:'skeletal',answers:{0:'forged',1:['vertebral'],2:5,3:'pelvis',99:'skull'}}});expect(s.html().querySelectorAll('[data-anatomy-tour-feedback]')).toHaveLength(1);expect(s.html().querySelector('[data-anatomy-recap]').dataset.anatomyRecapState).toBe('open');s.answer('skull','skull')();expect(s.data()._tourRecap.answers).toEqual({0:'skull',3:'pelvis'});
 });
 it('consolidates shared organ evidence from the latest state',()=>{
  const now=Date.UTC(2026,8,12,12);vi.setSystemTime(now);const s=session(file,{system:'muscular',...recap('muscular'),_confidenceAt:{diaphragm:now-1000,femur:now-2000},_structureConfidence:{diaphragm:'practice',femur:'learning'},_retrievalEvidence:{diaphragm:{attempts:3,correct:1},diaphragm_m:{attempts:2,correct:1}}});const answer=s.answer('diaphragm_m','diaphragm_m');answer();vi.setSystemTime(now+1000);answer();expect(s.data()._confidenceAt).toMatchObject({diaphragm:now,diaphragm_m:now,femur:now-2000});expect(s.data()._retrievalEvidence).toEqual({diaphragm:{attempts:6,correct:3}});expect(s.data()._structureConfidence).toMatchObject({diaphragm:'learning',diaphragm_m:'learning'});
 });
 it('rejects invalid tour and step choices and repairs a wrong marker',()=>{
  const s=session(file,{selectedStructure:'femur'});for(const value of ['bad',-1,99,1.5])s.jump(value);s.choose('forged');expect(s.data()._tourStepIdx).toBe(0);s.node(n=>n.props?.['data-anatomy-tour-diagram']).props.onClick();expect(s.data().selectedStructure).toBe('skull');expect(s.html().textContent).toContain('Show marker on diagram');
 });
 it('keeps the full explanation available after all answers and preserves the existing completion action',()=>{
  const s=session(file,recap('skeletal'));for(const id of ['skull','vertebral','ribs','pelvis'])s.answer(id,id)();expect(s.html().querySelector('[data-anatomy-recap-state="done"]').textContent).toContain('4 / 4 recalled.');expect(s.html().querySelectorAll('[data-anatomy-tour-feedback="correct"]')).toHaveLength(4);s.node(n=>n.type==='button'&&n.props?.['aria-label']==='Complete Tour!').props.onClick();expect(s.data()).toMatchObject({_tourCompleted:true,_tourActive:false,_activeTab:'explore',_tourRecap:null});
 });
});
