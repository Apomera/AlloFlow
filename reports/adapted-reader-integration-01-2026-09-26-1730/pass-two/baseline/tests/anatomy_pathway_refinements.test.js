import fs from 'node:fs';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const files=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const bank=JSON.parse(fs.readFileSync('reports/anatomy-pathway-refinements-2026-09-12/checks.json','utf8'));
function find(n,p){if(!n||typeof n!=='object')return null;if(Array.isArray(n)){for(const c of n){const r=find(c,p);if(r)return r;}return null;}return p(n)?n:find(n.props?.children,p);}
function text(n){return n==null||typeof n==='boolean'?'':typeof n!=='object'?String(n):Array.isArray(n)?n.map(text).join(' '):text(n.props?.children);}
function session(file,extra={}){resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'circulatory',view:'anterior',complexity:3,_activeTab:'pathways',_activePathway:'path_blood',_pathwayStep:0,selectedStructure:'heart',...extra}};
 const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',setToolData:u=>{data=typeof u==='function'?u(data):u;}}));
 const node=p=>{const n=find(render(),p);expect(n).not.toBeNull();return n;};
 return {data:()=>data.anatomy,node,patch:p=>{data={anatomy:{...data.anatomy,...p}};},click:label=>node(n=>n.type==='button'&&text(n).trim()===label).props.onClick(),jump:index=>node(n=>n.props?.id==='anatomy-pathway-jump').props.onChange({target:{value:String(index)}}),answer:(id,option)=>{const q=node(n=>n.props?.['data-anatomy-pathway-question']===id);return find(q,n=>n.props?.['data-anatomy-pathway-option']===option).props.onClick;},html:()=>{const div=document.createElement('div');div.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return div;}};
}
beforeEach(()=>{resetStemLab();vi.useFakeTimers();});afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();});
for(const file of files)describe('Accurate and accessible pathway learning: '+file,()=>{
 it('uses a digestive landmark for rectal passage and explains its scope',()=>{
  const s=session(file,{_activePathway:'path_food'});s.jump(6);expect(s.data()).toMatchObject({system:'organs',selectedStructure:'lg_intestine',_pathwayStep:6});const step=s.html().querySelector('[data-anatomy-pathway-step]');expect(step.textContent).toContain('Rectum and defecation');expect(step.textContent).toContain('bladder stores urine');expect(step.querySelector('[data-anatomy-pathway-scope]').textContent).toContain('not a separate rectal outline');expect(step.querySelector('a').href).toContain('23-5-the-small-and-large-intestines');
 });
 it('keeps the upper-limb withdrawal example out of leg nerves',()=>{
  const s=session(file,{_activePathway:'path_nerve'});for(const [step,system,id]of [[1,'nervous','median'],[4,'nervous','brachial_plexus'],[5,'muscular','biceps']]){s.jump(step);expect(s.data()).toMatchObject({system,selectedStructure:id,_pathwayStep:step});}s.jump(4);expect(s.html().querySelector('[data-anatomy-pathway-step]').textContent).toContain('musculocutaneous');
 });
 it('repairs a wrong marker within the correct system and preserves the step',()=>{
  const s=session(file,{selectedStructure:'sup_vena'});expect(s.html().textContent).toContain('Focus diagram');s.node(n=>n.props?.['data-anatomy-pathway-diagram']).props.onClick();expect(s.data()).toMatchObject({system:'circulatory',selectedStructure:'heart',_pathwayStep:0});expect(s.html().textContent).toContain('Show marker on diagram');
 });
 it('rejects out-of-range step jumps and restores a valid step directly',()=>{
  const s=session(file);for(const n of ['bad',-1,99,0.5])s.jump(n);expect(s.data()._pathwayStep).toBe(0);s.jump(4);expect(s.data().selectedStructure).toBe('lungs');expect(s.html().querySelector('#anatomy-pathway-jump').value).toBe('4');
 });
 for(const [pathId,questions]of Object.entries(bank))it('scores authored concepts independently from confidence: '+pathId,()=>{
  const priorConfidence={heart:'practice'},priorEvidence={heart:{attempts:3,correct:1}};
  const s=session(file,{_activePathway:pathId,_pathwayRecap:{active:true,version:2,pathwayId:pathId,answers:{}},_structureConfidence:priorConfidence,_retrievalEvidence:priorEvidence});
  expect(s.html().querySelectorAll('[data-anatomy-pathway-question]')).toHaveLength(2);expect(s.node(n=>n.type==='button'&&text(n)==='Finish pathway').props.disabled).toBe(true);
  const q=questions[0],wrong=q.options.find(o=>o[0]!==q.correct);const stale=s.answer(q.id,wrong[0]);stale();s.answer(q.id,q.correct)();stale();expect(s.data()._pathwayRecap.answers[q.id]).toBe(wrong[0]);expect(s.data()._pathwayChecks).toBeUndefined();
  expect(s.html().querySelector('[data-anatomy-pathway-feedback]').textContent).toContain(wrong[2]);expect(s.html().querySelectorAll('[data-anatomy-pathway-question]')[0].querySelectorAll('button:disabled')).toHaveLength(3);
  const next=questions[1];s.answer(next.id,next.correct)();expect(s.data()._pathwayChecks[pathId]).toEqual({version:2,answers:{[q.id]:wrong[0],[next.id]:next.correct}});expect(s.data()._structureConfidence).toEqual(priorConfidence);expect(s.data()._retrievalEvidence).toEqual(priorEvidence);
  expect(s.html().querySelector('[data-anatomy-recap-state="done"]').textContent).toContain('1/2 concept checks correct');s.click('Finish pathway');expect(s.data()._activePathway).toBeNull();expect(s.html().querySelector('[data-anatomy-pathway-score="'+pathId+'"]').textContent).toContain('1/2');
 });
 it('revisits the exact missed concept with the correct marker',()=>{
  const s=session(file,{_activePathway:'path_food',_pathwayRecap:{active:true,version:2,pathwayId:'path_food',answers:{exit:'bladder'}}});s.node(n=>n.props?.['data-anatomy-pathway-review']==='6').props.onClick();expect(s.data()).toMatchObject({_pathwayStep:6,_pathwayRecap:null,system:'organs',selectedStructure:'lg_intestine'});expect(s.html().querySelector('[data-anatomy-recap]')).toBeNull();
 });
 it('invalidates legacy marker-based answers and ignores malformed new answers',()=>{
  const s=session(file,{_pathwayRecap:{active:true,pathwayId:'path_blood',answers:{direction:'away',return:'left'}}});expect(s.html().querySelector('[data-anatomy-recap]').dataset.anatomyRecapState).toBe('open');s.answer('direction','away')();expect(s.data()._pathwayRecap).toEqual({version:2,active:true,pathwayId:'path_blood',answers:{direction:'away'}});
  s.patch({_pathwayRecap:{active:true,version:2,pathwayId:'path_blood',answers:{direction:'forged',return:['left'],extra:'away'}},_pathwayChecks:{path_blood:{version:2,answers:{direction:'away',return:'invalid'}}}});expect(s.html().querySelectorAll('[data-anatomy-pathway-feedback]')).toHaveLength(0);s.click('Finish without completing checks');expect(s.html().querySelector('[data-anatomy-pathway-score]')).toBeNull();
 });
 it('keeps the last completed score when checks are skipped and clears a prior session on restart',()=>{
  const record={version:2,answers:{direction:'away',return:'left'}};const s=session(file,{_pathwayChecks:{path_blood:record},_pathwayRecap:{active:true,version:2,pathwayId:'path_blood',answers:{direction:'rich'}}});s.click('Finish without completing checks');expect(s.data()._pathwayChecks.path_blood).toEqual(record);
  const card=s.node(n=>n.type==='button'&&text(n).includes('latest completed concept check'));card.props.onClick();expect(s.data()).toMatchObject({_activePathway:'path_blood',_pathwayStep:0,_pathwayRecap:null});
 });
 it('ignores an answer from a previous pathway after navigation',()=>{
  const s=session(file,{_pathwayRecap:{active:true,version:2,pathwayId:'path_blood',answers:{}}});const answer=s.answer('direction','away');s.patch({_activePathway:'path_air',_pathwayRecap:{active:true,version:2,pathwayId:'path_air',answers:{}}});answer();expect(s.data()._pathwayRecap.answers).toEqual({});expect(s.data()._pathwayChecks).toBeUndefined();
 });
});
