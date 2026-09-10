import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const paths=['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const ids=['skull','ribs','femur'];const now=1800000000000;
function find(n,p){if(!n||typeof n!=='object')return null;if(Array.isArray(n)){for(const c of n){const r=find(c,p);if(r)return r;}return null;}return p(n)?n:find(n.props?.children,p);}
function session(file,extra={}){resetStemLab();const tool=loadTool(file,'anatomy');let data={anatomy:{system:'skeletal',view:'anterior',complexity:3,_activeTab:'explore',_showStudySheet:true,...extra}};
 const render=()=>tool.render(makeCtx({toolData:data,gradeLevel:'9',setToolData:updater=>{data=typeof updater==='function'?updater(data):updater;}}));
 return {data:()=>data.anatomy,patch:patch=>{data={anatomy:{...data.anatomy,...patch}};},node:p=>{const n=find(render(),p);expect(n).not.toBeNull();return n;},html:()=>{const div=document.createElement('div');div.innerHTML=renderTool('anatomy',data,{gradeLevel:'9'});return div;}};
}
beforeEach(resetStemLab);afterEach(()=>vi.restoreAllMocks());
describe('Anatomy portable study evidence',()=>{
 beforeEach(()=>loadTool(paths[0],'anatomy'));
 it('exports only known structure evidence and preserves original review dates',()=>{
  const state={_structuresViewed:{skull:true,forged:true},_structureConfidence:{skull:'mastered',ribs:'practice'},_confidenceAt:{skull:now-9*86400000,ribs:now+10000},_structureNotes:{femur:'My explanation',forged:'ignore'},quizScore:999,complexity:3};
  const packet=window.__alloAnatomyStudyPure.packet(state,ids,now);
  expect(packet.records).toHaveLength(3);expect(packet.records.find(r=>r.id==='skull').ratedAt).toBe(now-9*86400000);expect(packet.records.find(r=>r.id==='ribs').ratedAt).toBeNull();
  expect(JSON.stringify(packet)).not.toContain('quizScore');expect(JSON.stringify(packet)).not.toContain('complexity');expect(JSON.stringify(packet)).not.toContain('forged');
 });
 it('merges viewed flags, takes newer ratings, and keeps existing conflicting notes',()=>{
  const C=window.__alloAnatomyStudyPure;
  const old={_structuresViewed:{skull:true},_structureConfidence:{skull:'mastered',ribs:'practice'},_confidenceAt:{skull:now-100,ribs:now-500},_structureNotes:{skull:'Keep my note'}};
  const packet=C.packet({_structuresViewed:{femur:true},_structureConfidence:{skull:'practice',ribs:'learning'},_confidenceAt:{skull:now-200,ribs:now-50},_structureNotes:{skull:'Incoming note',femur:'New note'}},ids,now);
  const result=C.merge(old,packet,ids,now);
  expect(result.patch._structureConfidence).toEqual({skull:'mastered',ribs:'learning'});expect(result.patch._structuresViewed).toEqual({skull:true,femur:true});
  expect(result.patch._structureNotes).toEqual({skull:'Keep my note',femur:'New note'});expect(result.keptNotes).toBe(1);expect(old._structureNotes).toEqual({skull:'Keep my note'});
 });
 it('round trips empty records and skips unknown structures without importing unsafe keys',()=>{
  const C=window.__alloAnatomyStudyPure;expect(C.parse(C.packet({},ids,now),ids).records).toEqual([]);
  const p=C.packet({_structuresViewed:{skull:true}},ids,now);p.records.push({id:'__proto__',viewed:true,confidence:null,ratedAt:null,note:'x'});
  const parsed=C.parse(p,ids);expect(parsed.skipped).toBe(1);expect(parsed.records).toHaveLength(1);expect({}.viewed).toBeUndefined();
 });
 it('rejects invalid schema, duplicate IDs, malformed ratings, notes and dates',()=>{
  const C=window.__alloAnatomyStudyPure,p=C.packet({_structuresViewed:{skull:true}},ids,now),row=p.records[0];
  [{}, {...p,version:2},{...p,records:[row,row]},{...p,records:[{...row,note:{bad:true}}]},{...p,records:[{...row,confidence:'expert'}]},{...p,records:[{...row,ratedAt:-1}]},{...p,records:Array(1001).fill(row)}].forEach(value=>expect(()=>C.parse(value,ids)).toThrow());
 });
});
for(const file of paths)describe('Anatomy actionable study sheet in '+file,()=>{
 it('filters review and note rows without losing evidence from the state',()=>{
  const s=session(file,{_structureConfidence:{skull:'mastered',ribs:'practice'},_confidenceAt:{skull:Date.now()},_structureNotes:{femur:'My note'}});
  s.node(n=>n.type==='select'&&n.props['aria-label']==='Show').props.onChange({target:{value:'review'}});
  expect([...s.html().querySelectorAll('[data-anatomy-study-open]')].map(n=>n.dataset.anatomyStudyOpen)).toEqual(['ribs']);
  s.node(n=>n.type==='select'&&n.props['aria-label']==='Show').props.onChange({target:{value:'notes'}});
  expect(s.html().querySelector('[data-anatomy-study-open]').dataset.anatomyStudyOpen).toBe('femur');expect(s.data()._structureConfidence.skull).toBe('mastered');
 });
 it('opens a recorded structure on its correct view and shows its detail',()=>{
  const s=session(file,{view:'posterior',_structureNotes:{sternum:'Chest protection'}});
  s.node(n=>n.props?.['data-anatomy-study-open']==='sternum').props.onClick();
  expect(s.data()).toMatchObject({selectedStructure:'sternum',system:'skeletal',view:'anterior',_activeTab:'explore',_showStudySheet:false});
  expect(s.html().querySelector('[data-anatomy-structure-detail-heading]')?.textContent).toContain('Sternum');
 });
 it('starts a fresh due-card round for the chosen system and preserves notes',()=>{
  const s=session(file,{_structureConfidence:{ribs:'practice'},_structureNotes:{ribs:'My note'}});
  s.node(n=>n.props?.['data-anatomy-study-review-system']==='skeletal').props.onClick();
  expect(s.data()).toMatchObject({_activeTab:'flashcards',_showStudySheet:false,_flashcardScope:'review',_flashcardDeck:['ribs'],_flashcardFlipped:false});expect(s.data()._structureNotes.ribs).toBe('My note');
 });
 it('shows no-results recovery and preserves live quiz settings when merging',()=>{
  const s=session(file,{_studySheetFilter:'review',_structureNotes:{femur:'My note'},quizScore:7,complexity:2});
  expect(s.html().querySelector('.anatomy-study-sheet-empty').textContent).toContain('No recorded structures match');
  const packet=window.__alloAnatomyStudyPure.packet({_structureConfidence:{ribs:'practice'}},ids,now);s.patch({_studyImportPreview:packet});
  s.node(n=>n.type==='button'&&n.props.children==='Merge study record').props.onClick();
  expect(s.data()).toMatchObject({quizScore:7,complexity:2,_studyImportPreview:null,_structureConfidence:{ribs:'practice'},_structureNotes:{femur:'My note'}});
 });
 it('reports clipboard failure honestly and restores focus',()=>{
  const original=document.execCommand;document.execCommand=vi.fn(()=>false);const s=session(file);const input=document.createElement('input');document.body.appendChild(input);input.focus();
  try{s.node(n=>n.type==='button'&&n.props.children==='📋 Copy as text').props.onClick();expect(s.data()._studyRecordNotice).toContain('Clipboard unavailable');expect(document.activeElement).toBe(input);}finally{input.remove();document.execCommand=original;}
 });
 it('ignores modified quiz shortcuts and composition',()=>{
  const s=session(file,{_activeTab:'quiz',_showStudySheet:false});const panel=s.node(n=>n.props?.['data-anatomy-quiz-panel']==='true');
  for(const flag of ['ctrlKey','metaKey','altKey','shiftKey','repeat','isComposing'])panel.props.onKeyDown({key:'1',[flag]:true,preventDefault:vi.fn()});
  expect(s.data().quizFeedback).toBeUndefined();
 });
});