import fs from 'node:fs';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {loadTool,makeCtx,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(n,p){if(!n||typeof n!=='object')return null;if(Array.isArray(n)){for(const c of n){const r=find(c,p);if(r)return r;}return null;}return p(n)?n:find(n.props?.children,p);}
function session(file,extra={},translate=(k,f)=>f){resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'organs',view:'anterior',complexity:3,_activeTab:'explore',selectedStructure:'diaphragm',_showStudySheet:true,...extra}};
 const options=()=>({toolData:data,gradeLevel:'9',t:translate,setToolData:u=>{data=typeof u==='function'?u(data):u;}});
 const render=()=>tool.render(makeCtx(options()));
 return {data:()=>data.anatomy,patch:p=>{data={...data,anatomy:{...data.anatomy,...p}};},node:p=>{const n=find(render(),p);expect(n).not.toBeNull();return n;},html:()=>{const div=document.createElement('div');div.innerHTML=renderTool('anatomy',data,{gradeLevel:'9',t:translate});return div;}};
}
beforeEach(resetStemLab);afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
for(const file of paths)describe('Honest, reliable anatomy study records: '+file,()=>{
 it('counts an aliased organ once while retaining entry-specific notes and rows',()=>{
  const s=session(file,{_structuresViewed:{diaphragm:true,diaphragm_m:true},_structureConfidence:{diaphragm:'mastered'},_confidenceAt:{diaphragm:Date.now()-10*86400000},_structureNotes:{diaphragm:'Breathing note',diaphragm_m:'Muscle note'}}),html=s.html();
  for(const key of ['viewed','mastered'])expect(html.querySelector('[data-anatomy-study-metric="'+key+'"] strong').textContent).toBe('1');
  expect(html.querySelector('[data-anatomy-study-metric="notes"] strong').textContent).toBe('2');
  expect(html.querySelector('[data-anatomy-study-sheet-due]').dataset.anatomyStudySheetDue).toBe('1');
  expect(html.querySelectorAll('[data-anatomy-study-open="diaphragm"], [data-anatomy-study-open="diaphragm_m"]').length).toBeGreaterThanOrEqual(2);
  expect(html.textContent).toContain('Breathing note');expect(html.textContent).toContain('Muscle note');
 });
 it('does not label note-only or recall-only records as viewed',()=>{
  const s=session(file,{_structureNotes:{femur:'Strong shaft'},_retrievalEvidence:{ribs:{attempts:2,correct:1}},_structuresViewed:{skull:true}}),html=s.html();
  for(const id of ['femur','ribs'])expect(html.querySelector('[data-anatomy-study-open="'+id+'"]').closest('li').querySelector('[data-anatomy-study-unrated]').dataset.anatomyStudyUnrated).toBe('saved');
  expect(html.querySelector('[data-anatomy-study-open="skull"]').closest('li').textContent).toContain('viewed');
  expect(html.querySelector('[data-anatomy-study-metric="viewed"] strong').textContent).toBe('1');
 });
 it('explains ratings, review dates, shared evidence, and collection scope',()=>{
  const html=session(file).html(),guide=html.querySelector('[data-anatomy-study-evidence-guide]');
  expect(guide.textContent).toContain('after 2 days for Learning');expect(guide.textContent).toContain('after 7 days for Got it');expect(guide.textContent).toContain('scored answers can update');expect(guide.textContent).toContain('not proof of mastery');
  expect(html.querySelector('select[aria-label="Browsing collection"]')).not.toBeNull();
 });
 it('resets empty filters without changing saved ratings or notes',()=>{
  const s=session(file,{_studySheetFilter:'mastered',_studySheetSystem:'skeletal',_structureNotes:{diaphragm:'My note'},_structureConfidence:{ribs:'practice'}});
  expect(s.html().querySelector('.anatomy-study-sheet-empty').textContent).toContain('No recorded structures match');
  s.node(n=>n.props?.['data-anatomy-study-reset-filters']).props.onClick();
  expect(s.data()).toMatchObject({_studySheetFilter:'all',_studySheetSystem:'all',_structureNotes:{diaphragm:'My note'},_structureConfidence:{ribs:'practice'}});
 });
 it('a retained note handler preserves notes added since its render',()=>{
  const s=session(file,{_structureNotes:{diaphragm:'Old note'}}),change=s.node(n=>n.props?.id==='anatomy-own-words-diaphragm').props.onChange;
  s.patch({_structureNotes:{diaphragm:'Old note',ribs:'Newer work'},quizScore:7});change({target:{value:'Revised note'}});
  expect(s.data()).toMatchObject({_structureNotes:{diaphragm:'Revised note',ribs:'Newer work'},quizScore:7});
  change({target:{value:' '}});expect(s.data()._structureNotes).toEqual({ribs:'Newer work'});
 });
 it('still limits and sanitizes notes when merging a current update',()=>{
  const s=session(file),change=s.node(n=>n.props?.id==='anatomy-own-words-diaphragm').props.onChange;
  s.patch({_structureNotes:{ribs:'Keep me',forged:'Ignore me',femur:25}});change({target:{value:'x'.repeat(300)}});
  expect(s.data()._structureNotes).toEqual({ribs:'Keep me',diaphragm:'x'.repeat(280)});
 });
 it('ignores stale merge actions after cancellation or a replacement preview',()=>{
  const s=session(file),C=window.__alloAnatomyStudyPure,first=C.packet({_structureNotes:{ribs:'First'}},['ribs'],Date.now()),second=C.packet({_structureNotes:{femur:'Second'}},['femur'],Date.now());
  s.patch({_studyImportPreview:first});const merge=s.node(n=>n.type==='button'&&n.props.children==='Merge study record').props.onClick;
  s.patch({_studyImportPreview:null});merge();expect(s.data()._structureNotes).toBeUndefined();
  s.patch({_studyImportPreview:second});merge();expect(s.data()._studyImportPreview).toBe(second);expect(s.data()._structureNotes).toBeUndefined();
  const current=s.node(n=>n.type==='button'&&n.props.children==='Merge study record').props.onClick;current();expect(s.data()._structureNotes).toEqual({femur:'Second'});
  s.patch({_structureNotes:{femur:'Revised after merge'}});current();expect(s.data()._structureNotes.femur).toBe('Revised after merge');
 });
 it('does not merge after leaving the study sheet',()=>{
  const s=session(file),packet=window.__alloAnatomyStudyPure.packet({_structureNotes:{ribs:'Incoming'}},['ribs'],Date.now());s.patch({_studyImportPreview:packet});
  const merge=s.node(n=>n.type==='button'&&n.props.children==='Merge study record').props.onClick;s.patch({_showStudySheet:false});merge();expect(s.data()._structureNotes).toBeUndefined();
 });
 it('focuses the sheet heading and restores its opening button',()=>{
  vi.useFakeTimers();const s=session(file,{_showStudySheet:false}),heading=document.createElement('h3'),trigger=document.createElement('button');heading.id='anatomy-study-sheet-title';heading.tabIndex=-1;trigger.dataset.anatomyStudyToggle='true';document.body.append(heading,trigger);
  try{s.node(n=>n.props?.['data-anatomy-study-toggle']).props.onClick();vi.runOnlyPendingTimers();expect(document.activeElement).toBe(heading);s.node(n=>n.props?.['aria-label']==='Close study sheet').props.onClick();vi.runOnlyPendingTimers();expect(document.activeElement).toBe(trigger);}finally{heading.remove();trigger.remove();}
 });
 it('localizes copied summaries and keeps work outside the visible filters',()=>{
  const original=document.execCommand,translate=(key,fallback)=>key.startsWith('stem.anatomy.study_ref_')?'LOCAL '+fallback:fallback;
  let copied='';document.execCommand=()=>{copied=document.querySelector('textarea[readonly]').value;return true;};
  try{const s=session(file,{_studySheetFilter:'notes',_studySheetSystem:'skeletal',_structureNotes:{diaphragm:'Breathing note',diaphragm_m:'Muscle note'},_structureConfidence:{diaphragm:'mastered'},_confidenceAt:{diaphragm:Date.now()-10*86400000}},translate);s.node(n=>n.type==='button'&&n.props.children==='📋 Copy as text').props.onClick();expect(copied).toContain('LOCAL Human Anatomy Explorer');expect(copied).toContain('Got it: 1');expect(copied).toContain('LOCAL Entries with notes: 2');expect(copied).toContain('Breathing note');expect(copied).toContain('Muscle note');expect(copied).toContain('LOCAL rated 10 day(s) ago; re-check');}finally{document.execCommand=original;}
 });
});
describe('Study clarity locale parity',()=>{for(const lang of ['french','spanish_latin_america','arabic'])it(lang+' translates all study clarity strings and preserves placeholders',()=>{
 const source=fs.readFileSync(paths[0],'utf8'),strings=[...source.matchAll(/t\('stem\.anatomy\.(study_ref_[^']+)','([^']*)'\)/g)],local=JSON.parse(fs.readFileSync('lang/'+lang+'.js','utf8')).stem.anatomy;
 expect(strings.length).toBeGreaterThan(15);for(const [,key,fallback]of strings){expect(local[key],key).toBeTruthy();expect((local[key].match(/\{\w+\}/g)||[]).sort()).toEqual((fallback.match(/\{\w+\}/g)||[]).sort());}
 expect(fs.readFileSync('lang/'+lang+'.js','utf8')).toBe(fs.readFileSync('desktop/web-app/public/lang/'+lang+'.js','utf8'));
});});
