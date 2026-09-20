import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let config,P,view;
const clone=v=>JSON.parse(JSON.stringify(v));
const prism={id:1,type:'prism',position:[0,0,0],u:[1,0,0],v:[0,1,0],w:[0,0,1]};
const scene=()=>({objects:[clone(prism)],selection:1});
beforeAll(()=>{resetStemLab();config=loadTool('stem_lab/stem_tool_geosandbox.js','geoSandbox');P=window.StemLab.geoPure;},60000);
afterEach(()=>{if(view){React.act(()=>view.root.unmount());view.container.remove();view=null;}vi.restoreAllMocks();});
function mount(bucket={},top={}){
 const container=document.createElement('div');document.body.appendChild(container);view={container,root:ReactDOMClient.createRoot(container),xp:vi.fn()};
 function Host(){const [data,setData]=React.useState({_threeLoaded:true,geoSandbox:{mode:'stretch',construction:scene(),...clone(bucket)},...top});view.data=data;view.setData=setData;return config.render(makeCtx({toolData:data,setToolData:setData,awardXP:view.xp}));}
 React.act(()=>view.root.render(React.createElement(Host)));return view;
}
const button=text=>[...view.container.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent).trim()===text);
function click(b){expect(b).toBeTruthy();expect(b.disabled).toBe(false);React.act(()=>b.click());}
function input(node,value){React.act(()=>{Object.getOwnPropertyDescriptor(node.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}
function field(text){return [...view.container.querySelectorAll('label')].find(l=>l.firstChild?.textContent===text)?.querySelector('input,textarea');}
function message(data,source,origin){React.act(()=>window.dispatchEvent(new MessageEvent('message',{data,source,origin})));}

describe('Geometry review regressions',()=>{
 it('rejects equal-edge nonsimilar prisms whose volume grows only fourfold',()=>{
  const slanted={...clone(prism),id:2,u:[2,0,0],v:[0,2,0],w:[Math.sqrt(3),0,1]};
  expect(P.geoStretchMeasure(slanted).value).toBe(4);
  expect(P.geoEvalMission(P.GEO_MISSIONS.find(m=>m.id==='squarecube'),[prism,slanted]).solved).toBe(false);
 });
 it('accepts rotated, reordered, and slanted similar copies',()=>{
  expect(P.geoPrismsSimilar(prism,{...prism,u:[0,0,-2],v:[2,0,0],w:[0,2,0]},2)).toBe(true);
  const a={...prism,w:[.5,0,1]},b=P.geoScaleObject(a,2);expect(P.geoPrismsSimilar(a,b,2)).toBe(true);
  expect(P.geoPrismsSimilar({...prism,w:[1,0,0]},{...prism,w:[2,0,0]},2)).toBe(false);
 });
 it.each([['1/2',.5],['1 1/2',1.5],['-1 1/2',-1.5],['−1/2',-.5],['1,024.5',1024.5],['.5',.5],['2e2',200]])('parses %s safely',(text,value)=>expect(P.geoParseAnswer(text)).toBe(value));
 it.each(['1/0','1/2junk','0x10','1,2','1+1','Infinity','', '1/2/3'])('rejects malformed or unsupported input %s',text=>expect(Number.isFinite(P.geoParseAnswer(text))).toBe(false));
 it('reports live current, target, and next step for an unfinished lesson',()=>{
  mount({workspacePath:'lesson',lessonIndex:1,construction:{objects:[{id:2,type:'rect',position:[0,0,0],u:[5,0,0],v:[0,2,0]}],selection:2}});
  const status=view.container.querySelector('.geo-lesson-guide [role=status]');expect(status.hidden).toBe(false);expect(status.textContent).toContain('Current area: 10; target: 12');expect(status.textContent).toContain('Increase');
 });
 it('retains an answer input after a wrong try and accepts a fraction on retry without exposing the answer first',async()=>{
  mount({mode:'single',challengeMode:true,challenge:{type:'volume',shapeId:'box',shapeName:'Rectangular Prism',dims:{w:1,h:1,d:.5},answer:.5,unit:'u³',question:'Calculate volume',dimDesc:'1 × 1 × .5'}});
  input(view.container.querySelector('#geo-challenge-answer'),'3');await React.act(async()=>button('Check').click());
  expect(view.data.geoSandbox.challengeResult).toBeNull();expect(view.container.textContent).not.toContain('The correct answer is:');expect(view.container.querySelector('#geo-challenge-feedback').textContent).toContain('Use V');
  input(view.container.querySelector('#geo-challenge-answer'),'1/2');await React.act(async()=>button('Check').click());
  expect(view.data.geoSandbox.challengeResult).toBe('correct');expect(view.data.geoSandbox.challengeScore).toEqual({correct:1,total:2});expect(view.xp).toHaveBeenCalledWith('geoSandbox',5,expect.any(String));
 });
 it('reveals a worked solution only on request and awards no XP',()=>{
  mount({mode:'single',challengeMode:true,challenge:{type:'volume',shapeId:'box',dims:{w:2,h:3,d:4},answer:24,unit:'u³'}});
  click(button('Show worked solution'));expect(view.data.geoSandbox.challengeResult).toBe('revealed');expect(view.container.textContent).toContain('(2)·(3)·(4) = 24.00');expect(view.xp).not.toHaveBeenCalled();expect(view.container.querySelector('#geo-challenge-answer')).toBeNull();
 });
 it('shows a persistent loading error and retries successfully without losing work',async()=>{
  mount({}, {_threeLoaded:false});const ensure=vi.spyOn(window.StemLab,'ensureThree').mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce();vi.spyOn(console,'error').mockImplementation(()=>{});
  await React.act(async()=>{config.init({setToolData:view.setData});});expect(view.container.querySelector('[role=alert]').textContent).toContain('could not load');expect(view.data.geoSandbox.construction).toEqual(scene());
  await React.act(async()=>button('Retry').click());expect(ensure).toHaveBeenCalledTimes(2);expect(view.data._threeLoaded).toBe(true);expect(view.container.querySelector('.geo-studio')).toBeTruthy();
 });
 it('captures notebook geometry immutably, saves reasoning, and restores before with Undo',()=>{
  mount({workspacePanel:'learn'});click(button('Start investigation'));
  input(field('Prediction (optional)'),'Doubling a length doubles volume.');input(field('What did you change?'),'Changed height from 1 to 2.');
  React.act(()=>view.setData(p=>({...p,geoSandbox:{...p.geoSandbox,construction:{objects:[{...clone(prism),w:[0,0,2]}],selection:1}}})));
  input(field('What do the measurements show?'),'Volume changed from 1 to 2.');click(button('Save notebook entry'));
  const e=view.data.geoSandbox.stretchRecords[0];expect(e.before.objects[0].w).toEqual([0,0,1]);expect(e.afterMeasurements[0].measurement.value).toBe(2);expect(e.prediction).toContain('Doubling');
  click(button('View before'));expect(view.data.geoSandbox.construction).toEqual(scene());expect(P.geoStepStretchHistory(view.data.geoSandbox,false).construction.objects[0].w).toEqual([0,0,2]);
 });
 it('round trips editable projects, exact geometry, visual metadata, and recalculated notebook measures',()=>{
  const c=scene();Object.assign(c.objects[0],{name:'My cube',color:'#ff0000',opacity:.4});const e=P.geoStretchRecord({before:c,prediction:'x',explanation:'y',transformation:'resize',unit:'cm'},c,'cm');e.afterMeasurements[0].measurement.value=999;
  const imported=P.geoStretchProjectImport(JSON.stringify({schema:'geometry-stretch-project-v1',unit:'cm',construction:c,entries:[e]}));expect(imported.construction).toEqual(c);expect(imported.entries[0].afterMeasurements[0].measurement.value).toBe(1);expect(P.geoStretchNotebookText(imported.entries)).toContain('Volume = 1 cm^3');
  imported.construction.objects[0].w[2]=9;expect(c.objects[0].w[2]).toBe(1);
 });
 it('rejects corrupt project geometry before replacing any work',()=>{
  const c=scene();c.objects[0].w=[null,0,1];expect(()=>P.geoStretchProjectImport({schema:'geometry-stretch-project-v1',construction:c,entries:[]})).toThrow();
  expect(()=>P.geoStretchProjectImport({schema:'wrong',construction:scene(),entries:[]})).toThrow();expect(()=>P.geoCompanionObject({d:3,L:Infinity,W:1,H:1})).toThrow();
 });
 it('accepts only the launched companion and adds its model once with undo history',()=>{
  mount();const child={focus:vi.fn(),postMessage:vi.fn()};const open=vi.spyOn(window,'open').mockReturnValue(child);click(button('Open the Immersive Geometry Lab in a new window — stretch a point into a line, a line into a plane, a plane into a solid, on a desktop or in VR'));
  const url=new URL(open.mock.calls[0][0]),data={type:'alloflow:geometry:apply',token:url.searchParams.get('bridge'),state:{d:3,L:2,W:3,H:4}};
  message(data,child,'https://untrusted.test');message({...data,token:'wrong'},child,url.origin);message(data,{},url.origin);expect(view.data.geoSandbox.construction.objects).toHaveLength(1);
  message(data,child,url.origin);expect(view.data.geoSandbox.construction.objects).toHaveLength(2);expect(P.geoStretchMeasure(view.data.geoSandbox.construction.objects[1]).value).toBe(24);expect(view.data.geoSandbox.history.at(-1)).toEqual(scene());expect(child.postMessage.mock.calls.at(-1)[0].ok).toBe(true);
  message(data,child,url.origin);expect(view.data.geoSandbox.construction.objects).toHaveLength(2);
 });
});
describe('Stretch project import transaction',()=>{
 it('ignores stale reads and clears a previous preview when a new file is invalid',()=>{
  mount({workspacePanel:'learn'});const reads=[];vi.spyOn(window,'FileReader').mockImplementation(function(){const reader={readAsText:vi.fn(),result:null};reads.push(reader);return reader;});
  const chooser=view.container.querySelector('input[type=file]');
  function choose(){Object.defineProperty(chooser,'files',{configurable:true,value:[new File(['{}'],'project.json',{type:'application/json'})]});React.act(()=>chooser.dispatchEvent(new Event('change',{bubbles:true})));}
  const content=JSON.stringify({schema:'geometry-stretch-project-v1',unit:'unit',construction:{objects:[{...clone(prism),w:[0,0,3]}],selection:1},entries:[]});
  choose();choose();reads[1].result=content;React.act(()=>reads[1].onload());expect(view.container.querySelector('[aria-label="Import preview"]')).toBeTruthy();
  reads[0].result='bad';React.act(()=>reads[0].onload());expect(view.container.querySelector('[aria-label="Import preview"]')).toBeTruthy();expect(view.data.geoSandbox.construction).toEqual(scene());
  click(button('Apply import'));expect(view.data.geoSandbox.construction.objects[0].w).toEqual([0,0,3]);expect(view.data.geoSandbox.history.at(-1)).toEqual(scene());
  choose();reads[2].result=content;React.act(()=>reads[2].onload());choose();reads[3].result='bad';React.act(()=>reads[3].onload());expect(view.container.querySelector('[aria-label="Import preview"]')).toBeNull();expect(view.data.geoSandbox.construction.objects[0].w).toEqual([0,0,3]);
 });
});


describe('Investigation portability and recovery',()=>{
 const draft=()=>({before:scene(),unit:'unit',title:'Height investigation',prediction:'Volume will double.',transformation:'Double the height.',explanation:'Still comparing.',demonstrated:false});
 const project=()=>({schema:'geometry-stretch-project-v1',unit:'unit',construction:{objects:[{...clone(prism),w:[0,0,2]}],selection:1},entries:[],draft:draft(),lesson:{path:'lesson',index:3,solved:['seg','rect']}});
 function preview(payload){
  let reader;vi.spyOn(window,'FileReader').mockImplementation(function(){reader={readAsText:vi.fn(),result:null};return reader;});
  const chooser=view.container.querySelector('input[type=file]');Object.defineProperty(chooser,'files',{configurable:true,value:[new File(['{}'],'project.json',{type:'application/json'})]});
  React.act(()=>chooser.dispatchEvent(new Event('change',{bubbles:true})));reader.result=JSON.stringify(payload);React.act(()=>reader.onload());
 }
 it('exports an independent snapshot of unfinished work, its original model, and lesson progress',()=>{
  const state={construction:project().construction,unitId:'unit',stretchDraft:draft(),stretchRecords:[],workspacePath:'lesson',lessonIndex:3,missionsSolved:['seg','rect']};
  const exported=P.geoStretchProjectExport(state),imported=P.geoStretchProjectImport(exported);
  expect(imported.draft).toEqual(state.stretchDraft);expect(imported.construction).toEqual(state.construction);expect(imported.lesson).toEqual(project().lesson);
  exported.draft.before.objects[0].w[2]=9;exported.draft.prediction='Changed';exported.construction.objects[0].w[2]=7;exported.lesson.solved.push('vol');
  expect(state.stretchDraft).toEqual(draft());expect(state.construction.objects[0].w[2]).toBe(2);expect(state.missionsSolved).toEqual(['seg','rect']);
 });
 it('opens older project files that contain no draft or lesson metadata',()=>{
  const old=project();delete old.draft;delete old.lesson;const result=P.geoStretchProjectImport(old);
  expect(result.draft).toBeNull();expect(result.lesson).toEqual({path:'free',index:0,solved:[]});expect(result.construction).toEqual(old.construction);
 });
 it('rejects invalid unfinished models, note types, and unsupported units',()=>{
  const badModel=project();badModel.draft.before.objects[0].w=[0,null,1];expect(()=>P.geoStretchProjectImport(badModel)).toThrow();
  const badNotes=project();badNotes.draft.prediction={text:'not a string'};expect(()=>P.geoStretchProjectImport(badNotes)).toThrow('Invalid investigation notes');
  const badUnit=project();badUnit.unit='unsupported';expect(()=>P.geoStretchProjectImport(badUnit)).toThrow('Unsupported project units');
  const badDraftUnit=project();badDraftUnit.draft.unit='unsupported';expect(()=>P.geoStretchProjectImport(badDraftUnit)).toThrow('Unsupported project units');
 });
 it('sanitizes imported lesson progress to known lessons and an available step',()=>{
  const p=project();p.lesson={path:'unknown',index:1000,solved:['seg','bad','seg','vol']};
  expect(P.geoStretchProjectImport(p).lesson).toEqual({path:'free',index:P.GEO_MISSIONS.length-1,solved:['seg','vol']});
 });
 it('resumes imported notes and the starting model while retaining previously earned progress',()=>{
  mount({workspacePanel:'learn',missionsSolved:['cube']});const p=project();preview(p);expect(view.container.textContent).toContain('An unfinished investigation will resume');
  click(button('Apply import'));expect(view.data.geoSandbox.stretchDraft).toEqual(p.draft);expect(field('Prediction (optional)').value).toBe('Volume will double.');
  expect(view.data.geoSandbox.construction).toEqual(p.construction);expect(view.data.geoSandbox.history.at(-1)).toEqual(scene());expect(view.data.geoSandbox.missionsSolved).toEqual(['cube','seg','rect']);
  expect(view.data.geoSandbox.workspacePath).toBe('lesson');expect(view.data.geoSandbox.lessonIndex).toBe(3);
 });
 it('protects active notes from project imports and makes canceled notes recoverable',()=>{
  const original=draft();original.prediction='My current prediction';mount({workspacePanel:'learn',stretchDraft:original});const p=project();p.draft=null;preview(p);
  expect(button('Apply import').disabled).toBe(true);expect(view.container.textContent).toContain('Save or cancel your current investigation');expect(view.data.geoSandbox.stretchDraft).toEqual(original);
  click(button('Cancel investigation'));expect(view.data.geoSandbox.stretchDraft).toBeNull();expect(button('Apply import').disabled).toBe(false);
  click(button('Apply import'));click(button('Restore canceled investigation'));expect(view.data.geoSandbox.stretchDraft).toEqual(original);expect(field('Prediction (optional)').value).toBe('My current prediction');expect(view.data.geoSandbox.construction).toEqual(p.construction);expect(view.data.geoSandbox.stretchDiscardedDraft).toBeNull();
 });
 it('preserves recovered work when the notebook has reached its saved-entry limit',()=>{
  const records=Array.from({length:100},(_,id)=>({...P.geoStretchRecord(draft(),scene(),'unit'),id}));mount({workspacePanel:'learn',stretchRecords:records,stretchDiscardedDraft:draft()});
  click(button('Restore canceled investigation'));expect(button('Save notebook entry').disabled).toBe(true);expect(view.container.textContent).toContain('Export an editable project to keep this unfinished investigation');expect(view.data.geoSandbox.stretchRecords).toHaveLength(100);expect(view.data.geoSandbox.stretchDraft).toEqual(draft());
 });
 it('does not block companion model imports during an investigation',()=>{
  mount({workspacePanel:'learn',stretchDraft:draft()});preview({schema:'geometry-stretch-companion-v1',unit:'unit',state:{d:3,L:2,W:3,H:4}});
  click(button('Apply import'));expect(view.data.geoSandbox.construction.objects).toHaveLength(2);expect(view.data.geoSandbox.stretchDraft).toEqual(draft());
 });
});

describe('Live geometric lesson evidence',()=>{
 it('rejects equal-volume Cavalieri pairs with different base areas and heights',()=>{
  const slant={...clone(prism),id:2,u:[2,0,0],w:[.5,0,.5]};
  const result=P.geoEvalMission(P.GEO_MISSIONS.find(m=>m.id==='cavalieri'),[prism,slant]);
  expect(P.geoStretchMeasure(slant).value).toBe(1);expect(result.solved).toBe(false);expect(result.message).toContain('base areas 1 and 2');expect(result.message).toContain('perpendicular heights 1 and 0.5');expect(result.message).toContain('equal volume alone is not enough');
 });
 it('finds the correct Cavalieri pair among distractors in either object order',()=>{
  const slant={...clone(prism),id:2,w:[.5,0,1]},tall={...clone(prism),id:3,w:[0,0,3]};
  for(const objects of [[tall,slant,prism],[prism,slant,tall]]){
   const r=P.geoCavalieriComparison(objects);expect(r.solved).toBe(true);expect(r.comparison.a.id).toBe(1);expect(r.comparison.b.id).toBe(2);expect(r.message).toContain('perpendicular heights 1 and 1');
  }
 });
 it('gives an actionable next step when a Cavalieri pair is incomplete',()=>{
  expect(P.geoCavalieriComparison([prism]).message).toContain('Add a slanted prism');
  expect(P.geoCavalieriComparison([{...clone(prism),w:[.5,0,1]}]).message).toContain('Add a straight prism');expect(P.geoCavalieriComparison([]).solved).toBe(false);
 });
 it('requires right angles as well as equal edges for the cube lesson',()=>{
  const m=P.GEO_MISSIONS.find(m=>m.id==='cube');expect(P.geoEvalMission(m,[{...clone(prism),v:[.5,Math.sqrt(3)/2,0]}]).solved).toBe(false);
  expect(P.geoEvalMission(m,[{...clone(prism),u:[0,0,1],v:[1,0,0],w:[0,1,0]}]).solved).toBe(true);
 });
 it('distinguishes previously earned progress from a current model that no longer meets the target',()=>{
  mount({workspacePath:'lesson',lessonIndex:3,missionsSolved:['vol']});const status=view.container.querySelector('.geo-lesson-guide [role=status]');
  expect(status.textContent).toContain('Current volume: 1; target: 24');expect(status.textContent).toContain('Completed earlier');expect(status.classList.contains('geo-lesson-complete')).toBe(false);expect(view.data.geoSandbox.missionsSolved).toContain('vol');
 });
});


describe('Notebook comparison and reflection workflows',()=>{
 const after=()=>({objects:[{...clone(prism),w:[0,0,2]}],selection:1});
 const record=()=>({...P.geoStretchRecord({before:scene(),unit:'unit',title:'Height study',prediction:'I predict twice the volume.',transformation:'Double height.',explanation:'Volume doubled.'},after(),'unit'),id:'height-study',createdAt:123});
 const openRecord=(entry=record(),extra={})=>mount({workspacePanel:'learn',stretchRecords:[entry],stretchReviewEntry:entry.id,...extra});
 it('compares recomputed volume and surface area, ignoring stale cached measurements',()=>{
  const e=record();e.afterMeasurements[0].measurement.value=999;const rows=P.geoStretchComparison(e)[0].rows;
  expect(rows.find(r=>r.key==='volume')).toMatchObject({before:1,after:2,delta:1,ratio:2,change:'+1 u³ · ×2'});
  expect(rows.find(r=>r.key==='surfaceArea')).toMatchObject({before:6,after:10,delta:4});expect(P.geoStretchNotebookText([e])).toContain('Object #1 Volume: 1 u³ → 2 u³; +1 u³ · ×2');
 });
 it('distinguishes conserved volume from surface-area changes during a shear',()=>{
  const e=record();e.after.objects[0].w=[1,0,1];const rows=P.geoStretchComparison(e)[0].rows;
  expect(rows.find(r=>r.key==='volume').change).toBe('Unchanged');expect(rows.find(r=>r.key==='surfaceArea').delta).toBeGreaterThan(0);
 });
 it('does not compare unlike units or different dimensional measures',()=>{
  const e=record();e.beforeUnit='cm';e.unit='m';expect(P.geoStretchComparison(e)[0].rows.every(r=>r.ratio===null&&r.change==='Units differ; no ratio')).toBe(true);
  e.beforeUnit=e.unit='unit';e.before.objects=[{id:1,type:'rect',position:[0,0,0],u:[1,0,0],v:[0,1,0]}];
  expect(P.geoStretchComparison(e)[0].rows.every(r=>r.ratio===null&&r.change==='Measurement changed; no ratio')).toBe(true);
 });
 it('identifies added and removed objects without inventing zero-to-value ratios',()=>{
  const e=record();e.after.objects[0].id=2;const groups=P.geoStretchComparison(e);
  expect(groups[0].rows.every(r=>r.change==='Removed object'&&r.after===null&&r.ratio===null)).toBe(true);
  expect(groups[1].rows.every(r=>r.change==='Added object'&&r.before===null&&r.ratio===null)).toBe(true);
 });
 it('handles points, empty scenes, and small nonzero measurements',()=>{
  const point={id:1,type:'point',position:[0,0,0]},e={unit:'unit',before:{objects:[point]},after:{objects:[point]}};
  expect(P.geoStretchComparison(e)[0].rows[0]).toMatchObject({beforeText:'Point',afterText:'Point',ratio:null,change:'No dimensional measure'});
  expect(P.geoStretchComparison({before:{objects:[]},after:{objects:[]}})).toEqual([]);
  e.before.objects=[{...point,type:'segment',vector:[.0001,0,0]}];e.after.objects=[{...point,type:'segment',vector:[.0002,0,0]}];
  expect(P.geoStretchComparison(e)[0].rows[0].beforeText).toBe('1.00e-4 u');expect(P.geoStretchComparison(e)[0].rows[0].ratio).toBe(2);
  e.before.objects[0].vector=[1e-10,0,0];e.after.objects[0].vector=[2e-10,0,0];expect(P.geoStretchComparison(e)[0].rows[0].change).toBe('+1.00e-10 u · ×2');
 });
 it('shows live draft comparisons without changing the captured starting model',()=>{
  const e=record();mount({workspacePanel:'learn',stretchDraft:{...e,unit:'unit'},construction:after(),stretchCompareOpen:true});
  const table=view.container.querySelector('.geo-notebook-comparison table');expect(table.textContent).toContain('Volume1 u³2 u³');expect(view.container.querySelector('.geo-notebook-comparison').textContent).toContain('+1 u³ · ×2');expect(view.data.geoSandbox.stretchDraft.before).toEqual(scene());
 });
 it('revises a reflection while preserving the prediction, snapshots, timestamp, and current construction',async()=>{
  const e=record();openRecord(e);click(button('Edit reflection'));await React.act(async()=>new Promise(resolve=>setTimeout(resolve,5)));
  const initialAwards=view.xp.mock.calls.length;expect(document.activeElement).toBe(field('Saved entry title'));expect(button('Export editable project').disabled).toBe(true);expect(button('Remove entry').disabled).toBe(true);
  input(field('Saved entry title'),'Revised height study');input(field('Revised explanation'),'Volume doubled, but surface area grew by less than twice.');input(field('Revised change description'),'Stretched only height.');click(button('Save reflection'));await React.act(async()=>new Promise(resolve=>setTimeout(resolve,5)));
  const saved=view.data.geoSandbox.stretchRecords[0];expect(saved).toMatchObject({id:e.id,createdAt:e.createdAt,prediction:e.prediction,before:e.before,after:e.after,explanation:'Volume doubled, but surface area grew by less than twice.'});
  expect(saved.title).toBe('Revised height study');expect(view.data.geoSandbox.construction).toEqual(scene());expect(view.data.geoSandbox.history).toBeUndefined();expect(view.xp.mock.calls).toHaveLength(initialAwards);expect(document.activeElement).toBe(button('Edit reflection'));
  expect(P.geoStretchProjectImport(P.geoStretchProjectExport(view.data.geoSandbox)).entries[0].explanation).toBe(saved.explanation);
 });
 it('cancels reflection changes and requires written or model-based reasoning before saving',()=>{
  const e=record();openRecord(e);click(button('Edit reflection'));input(field('Revised explanation'),'');expect(button('Save reflection').disabled).toBe(true);
  const check=view.container.querySelector('[aria-label="Edit saved reflection"] input[type=checkbox]');React.act(()=>check.click());expect(button('Save reflection').disabled).toBe(false);
  click(button('Cancel reflection edits'));expect(view.data.geoSandbox.stretchRecords[0]).toEqual(e);expect(button('Export editable project').disabled).toBe(false);
 });
 it('removes an entry and restores its exact position and evidence with keyboard focus recovery',async()=>{
  const first=record(),second={...record(),id:'second',title:'Second study'};openRecord(first,{stretchRecords:[first,second]});click(button('Remove entry'));await React.act(async()=>new Promise(resolve=>setTimeout(resolve,5)));
  expect(view.data.geoSandbox.stretchRecords).toEqual([second]);expect(document.activeElement).toBe(button('Undo last removal'));expect(view.data.geoSandbox.construction).toEqual(scene());
  click(button('Undo last removal'));await React.act(async()=>new Promise(resolve=>setTimeout(resolve,5)));
  expect(view.data.geoSandbox.stretchRecords).toEqual([first,second]);expect(view.data.geoSandbox.stretchRemovedRecord).toBeNull();expect(document.activeElement.id).toBe('geo-stretch-notebook-heading');
 });
 it('frees a full notebook slot and prevents restoration from overflowing the notebook',()=>{
  const entries=Array.from({length:100},(_,id)=>({...record(),id:'entry-'+id}));openRecord(entries[0],{stretchRecords:entries});expect(button('Start investigation').disabled).toBe(true);
  click(button('Remove entry'));expect(button('Start investigation').disabled).toBe(false);expect(button('Undo last removal').disabled).toBe(false);
  React.act(()=>view.setData(p=>({...p,geoSandbox:{...p.geoSandbox,stretchRecords:p.geoSandbox.stretchRecords.concat([{...record(),id:'new-entry'}])}})));
  expect(button('Undo last removal').disabled).toBe(true);expect(view.data.geoSandbox.stretchRemovedRecord.entry).toEqual(entries[0]);
 });
 it('preserves both entries when a restored entry id is already in use',()=>{
  const e=record(),current={...record(),title:'A different investigation'};openRecord(current,{stretchRemovedRecord:{entry:e,index:0}});click(button('Undo last removal'));
  const entries=view.data.geoSandbox.stretchRecords;expect(entries).toHaveLength(2);expect(entries[0].id).not.toBe(entries[1].id);expect(entries.map(x=>x.title)).toEqual([e.title,current.title]);expect(entries[0].before).toEqual(e.before);
 });
 it('protects unsaved reflection edits while a project import is previewed',()=>{
  openRecord();click(button('Edit reflection'));input(field('Revised explanation'),'A more precise explanation.');
  let reader;vi.spyOn(window,'FileReader').mockImplementation(function(){reader={readAsText:vi.fn(),result:null};return reader;});
  const chooser=view.container.querySelector('input[type=file]');Object.defineProperty(chooser,'files',{configurable:true,value:[new File(['{}'],'project.json',{type:'application/json'})]});React.act(()=>chooser.dispatchEvent(new Event('change',{bubbles:true})));
  reader.result=JSON.stringify({schema:'geometry-stretch-project-v1',unit:'unit',construction:after(),entries:[]});React.act(()=>reader.onload());
  expect(button('Apply import').disabled).toBe(true);expect(view.data.geoSandbox.construction).toEqual(scene());click(button('Save reflection'));expect(button('Apply import').disabled).toBe(false);
  click(button('Apply import'));expect(view.data.geoSandbox.construction).toEqual(after());expect(view.data.geoSandbox.stretchRecords[0].explanation).toBe('A more precise explanation.');
 });
 it('renders detailed measurements only for the opened saved entry',()=>{
  const entries=Array.from({length:10},(_,id)=>({...record(),id:'entry-'+id}));openRecord(entries[3],{stretchRecords:entries});
  expect(view.container.querySelectorAll('.geo-record')).toHaveLength(10);expect(view.container.querySelectorAll('.geo-record .geo-notebook-comparison')).toHaveLength(1);
 });
});


describe('Guided investigations and linked measurements',()=>{
 it('calculates perpendicular height separately from a slanted side edge',()=>{
  const o={...clone(prism),u:[2,0,0],v:[0,0,2],w:[1.5,2,0]},f=P.geoPrismExplanation(o);
  expect(f).toMatchObject({baseArea:4,height:2,edge:2.5,volume:8});expect(f.topCenter.map((n,i)=>n-f.foot[i])).toEqual([0,2,0]);expect(f.foot[1]).toBe(0);
 });
 it('handles rotated and reversed bases and refuses degenerate geometry',()=>{
  const f=P.geoPrismExplanation({...clone(prism),u:[0,0,-2],v:[0,3,0],w:[-4,1,0]});expect(f.baseArea).toBe(6);expect(f.height).toBe(4);expect(f.volume).toBe(24);
  expect(P.geoPrismExplanation({...prism,w:[1,0,0]})).toBeNull();expect(P.geoPrismExplanation({...prism,type:'rect'})).toBeNull();
 });
 it.each([['lean',1],['height',2],['scale',8]])('applies %s with the expected volume factor',(id,ratio)=>{
  const o={...clone(prism),w:[.5,.2,1]},original=clone(o),changed=P.geoGuidedChange(id,o);expect(P.geoStretchMeasure(changed).value/P.geoStretchMeasure(o).value).toBeCloseTo(ratio);expect(o).toEqual(original);
  if(id==='lean')expect(P.geoPrismExplanation(changed).height).toBe(P.geoPrismExplanation(o).height);
  if(id==='height')expect(changed.w).toEqual([.5,.2,2]);
  if(id==='scale')expect(P.geoStretchMeasure(changed).surfaceArea/P.geoStretchMeasure(o).surfaceArea).toBeCloseTo(4);
 });
 it('uses an existing prism and preserves other models when adding a starter is needed',()=>{
  const source={construction:scene(),unitId:'cm'},started=P.geoStartGuidedExperiment(source,'lean',[5,0,0]);expect(started.construction).toEqual(source.construction);expect(started.stretchDraft.unit).toBe('cm');expect(source.stretchDraft).toBeUndefined();
  const point={id:1,type:'point',position:[-4,0,0]},withPoint={construction:{objects:[point],selection:1}};const added=P.geoStartGuidedExperiment(withPoint,'scale',[2,0,0]);expect(added.construction.objects[0]).toEqual(point);expect(added.construction.objects[1].position).toEqual([2,0,0]);expect(added.history.at(-1)).toEqual(withPoint.construction);expect(added.stretchDraft.before).toEqual(added.construction);
 });
 it('requires a prediction and applies changes from the original prism without compounding',()=>{
  const start=P.geoStartGuidedExperiment({construction:scene()},'scale');expect(P.geoApplyGuidedExperiment(start,false)).toBe(start);
  start.stretchDraft.prediction='Eight times the volume.';const changed=P.geoApplyGuidedExperiment(start,false),again=P.geoApplyGuidedExperiment(changed,false);
  expect(changed.stretchDraft.experiment.predictionLocked).toBe(true);expect(changed.stretchDraft.before).toEqual(scene());expect(changed.construction.objects[0].w).toEqual([0,0,2]);expect(again.construction).toEqual(changed.construction);expect(again.history).toHaveLength(1);
  const undone=P.geoStepStretchHistory(changed,false);expect(P.geoGuidedStage(undone.stretchDraft,undone.construction)).toBe('ready');
 });
 it('refuses to overwrite active investigations, missing targets, or unlike units',()=>{
  const start=P.geoStartGuidedExperiment({construction:scene()},'height');expect(P.geoStartGuidedExperiment(start,'lean')).toBe(start);start.stretchDraft.prediction='Twice.';
  const wrongUnit={...start,unitId:'cm'};expect(P.geoApplyGuidedExperiment(wrongUnit,false)).toBe(wrongUnit);
  const missing={...start,construction:{objects:[],selection:null}};expect(P.geoGuidedStage(missing.stretchDraft,missing.construction)).toBe('missing');expect(P.geoApplyGuidedExperiment(missing,false)).toBe(missing);
 });
 it('blocks changes that would make a valid project too large to reopen',()=>{
  const big={...clone(prism),u:[6000,0,0]},g=P.geoStartGuidedExperiment({construction:{objects:[big],selection:1}},'scale');g.stretchDraft.prediction='Eight times.';
  expect(P.geoGuidedStage(g.stretchDraft,g.construction)).toBe('limit');expect(P.geoApplyGuidedExperiment(g,false)).toBe(g);expect(P.geoStretchProjectImport(P.geoStretchProjectExport(g)).construction.objects[0]).toEqual(big);
  mount({...g,workspacePanel:'learn'});expect(button('Double every dimension').disabled).toBe(true);expect(view.container.textContent).toContain('start with a smaller prism');
 });
 it('round trips guided prediction evidence in unfinished and completed projects',()=>{
  let g=P.geoStartGuidedExperiment({construction:scene()},'lean');g.stretchDraft.experiment.predictionSpoken=true;g=P.geoApplyGuidedExperiment(g,false);
  const draft=P.geoStretchProjectImport(P.geoStretchProjectExport(g)).draft;expect(draft.experiment).toEqual(g.stretchDraft.experiment);
  const entry=P.geoStretchRecord({...draft,explanation:'The volume stayed the same.'},g.construction,'unit');const restored=P.geoStretchProjectImport(P.geoStretchProjectExport({...g,stretchDraft:null,stretchRecords:[entry]}));expect(restored.entries[0].experiment).toEqual(g.stretchDraft.experiment);
  const invalid=P.geoStretchProjectExport(g);invalid.draft.experiment.objectId=999;expect(()=>P.geoStretchProjectImport(invalid)).toThrow('Invalid guided investigation');
 });
 it('guides prediction, controlled change, and saving through the real component',()=>{
  mount({workspacePanel:'learn'});click(button('Start: Double only the height'));expect(button('Double height').disabled).toBe(true);
  input(field('Prediction (write or describe)'),'The volume will double.');click(button('Double height'));expect(field('Prediction (write or describe)').readOnly).toBe(true);expect(view.data.geoSandbox.construction.objects[0].w).toEqual([0,0,2]);
  input(field('What do the measurements show?'),'Volume doubled; the base area stayed the same.');click(button('Save notebook entry'));
  const record=view.data.geoSandbox.stretchRecords[0];expect(record.before.objects[0].w).toEqual([0,0,1]);expect(record.after.objects[0].w).toEqual([0,0,2]);expect(record.experiment.id).toBe('height');
 });
 it('supports spoken predictions and prevents saving the restored starting model as a changed result',()=>{
  mount({workspacePanel:'learn'});click(button('Start: Does leaning change volume?'));const label=[...view.container.querySelectorAll('label')].find(l=>l.textContent==='I shared my prediction aloud or with the model.');React.act(()=>label.querySelector('input').click());
  click(button('Apply lean'));input(field('What do the measurements show?'),'The height and volume stayed the same.');expect(button('Save notebook entry').disabled).toBe(false);click(button('Restore starting prism'));expect(button('Save notebook entry').disabled).toBe(true);expect(view.data.geoSandbox.stretchDraft.experiment.predictionLocked).toBe(true);
 });
 it('links accessible measurement buttons to explanatory state without changing the prism',()=>{
  mount({workspacePanel:'learn',construction:{objects:[{...clone(prism),w:[.75,0,1]}],selection:1}});const original=clone(view.data.geoSandbox.construction);
  click(button('Highlight perpendicular height'));expect(view.data.geoSandbox.stretchExplain).toBe('height');expect(view.container.querySelector('[aria-label="Prism measurement explanations"]').textContent).toContain('meets the base plane at a right angle');expect(button('Highlight perpendicular height').getAttribute('aria-pressed')).toBe('true');
  click(button('Highlight side edge'));expect(view.data.geoSandbox.stretchExplain).toBe('edge');click(button('Highlight side edge'));expect(view.data.geoSandbox.stretchExplain).toBeNull();expect(view.data.geoSandbox.construction).toEqual(original);
 });
});


describe('Measured explanations and portable learning evidence',()=>{
 function changed(id='lean',object=clone(prism)){
  let g=P.geoStartGuidedExperiment({construction:{objects:[object],selection:object.id}},id);
  g.stretchDraft.prediction='My prediction.';return P.geoApplyGuidedExperiment(g,false);
 }
 function entry(g){return P.geoStretchRecord({...g.stretchDraft,explanation:'My own conclusion.'},g.construction,g.unitId||'unit');}
 it('compares base area, perpendicular height, and side edge with correct dimensions',()=>{
  const rows=P.geoStretchComparison(entry(changed()))[0].rows;
  expect(rows.find(r=>r.key==='baseArea')).toMatchObject({before:1,after:1,beforeText:'1 u²',change:'Unchanged'});
  expect(rows.find(r=>r.key==='height')).toMatchObject({before:1,after:1,afterText:'1 u',change:'Unchanged'});
  expect(rows.find(r=>r.key==='sideEdge')).toMatchObject({before:1,after:1.25,delta:.25,ratio:1.25,change:'+0.25 u · ×1.25'});
 });
 it.each([['lean','1 (base area) × 1 (perpendicular height) = 1'],['height','1 (base area) × 2 (perpendicular height) = 2'],['scale','4 (base area) × 2 (perpendicular height) = 8']])('explains the measured %s factors',(id,factors)=>{
  const e=entry(changed(id)),original=clone(e);e.afterMeasurements[0].measurement.value=999;
  const guide=P.geoGuidedEvidence(e);expect(guide.status).toBe('guided');expect(guide.lines.join(' ')).toContain(factors);expect(guide.lines.join(' ')).not.toContain('999');expect(e.before).toEqual(original.before);expect(e.explanation).toBe('My own conclusion.');
 });
 it('measures surface area decreasing when a previously leaning prism becomes upright',()=>{
  const guide=P.geoGuidedEvidence(entry(changed('lean',{...clone(prism),w:[-.75,0,1]})));
  expect(guide.lines).toContain('Surface area: -0.5 u² · ×0.92.');expect(guide.lines.join(' ')).toContain('volume stayed the same');
 });
 it('uses the normal of a rotated base in its equation, not the side-edge length',()=>{
  const guide=P.geoGuidedEvidence(entry(changed('height',{...clone(prism),u:[0,2,0],v:[0,0,-3],w:[-4,3,0]})));
  expect(guide.lines).toContain('Before: 6 u² × 4 u = 24 u³.');expect(guide.lines).toContain('After: 6 u² × 8 u = 48 u³.');
 });
 it('explains custom geometry without claiming the expected guided result',()=>{
  const e=entry(changed('height'));e.after.objects[0].u=[3,0,0];e.after.objects[0].w=[0,0,4];
  const guide=P.geoGuidedEvidence(e);expect(guide.status).toBe('custom');expect(guide.message).toContain('beyond the guided step');expect(guide.lines.join(' ')).toContain('3 (base area) × 4 (perpendicular height) = 12');expect(guide.lines.join(' ')).not.toContain('so volume doubled');
 });
 it('withholds explanations before prediction and marks restored starting geometry accurately',()=>{
  const g=P.geoStartGuidedExperiment({construction:scene()},'height');expect(P.geoGuidedEvidence(entry(g))).toBeNull();expect(P.geoGuidedEvidence({before:scene(),after:scene()})).toBeNull();
  const restored=P.geoApplyGuidedExperiment(changed('height'),true),guide=P.geoGuidedEvidence(entry(restored));expect(guide.status).toBe('starting');expect(guide.message).toContain('starting prism');expect(guide.lines.join(' ')).not.toContain('so volume doubled');
 });
 it('distinguishes tiny changed prisms from their restored starting geometry',()=>{
  const tiny={...clone(prism),u:[1e-18,0,0],v:[0,1e-18,0],w:[0,0,1e-18]};const g=changed('scale',tiny);
  expect(P.geoGuidedStage(g.stretchDraft,g.construction)).toBe('changed');const restored=P.geoApplyGuidedExperiment(g,true);
  expect(P.geoGuidedStage(restored.stretchDraft,restored.construction)).toBe('ready');expect(P.geoGuidedEvidence(entry(restored)).status).toBe('starting');
 });
 it('does not invent evidence across mismatched units or missing prisms',()=>{
  const e=entry(changed());e.beforeUnit='cm';const units=P.geoGuidedEvidence(e);expect(units.status).toBe('unavailable');expect(units.lines).toEqual([]);expect(units.message).toContain('units differ');
  e.beforeUnit=e.unit;e.after.objects=[];const missing=P.geoGuidedEvidence(e);expect(missing.lines).toEqual([]);expect(missing.message).toContain('missing');
 });
 it('retains very small positive base areas and heights in exported evidence',()=>{
  const e=entry(changed('height',{...clone(prism),u:[.001,0,0],v:[0,.001,0],w:[0,0,.001]}));
  const guide=P.geoGuidedEvidence(e);expect(guide.lines).toContain('Before: 1.00e-6 u² × 1.00e-3 u = 1.00e-9 u³.');expect(guide.lines).toContain('After: 1.00e-6 u² × 2.00e-3 u = 2.00e-9 u³.');
 });
 it('exports spoken predictions, measured values, and guidance separately from student conclusions',()=>{
  const e=entry(changed());e.prediction='';e.experiment.predictionSpoken=true;const text=P.geoStretchNotebookText([e]);
  expect(text).toContain('Prediction: Shared aloud or with the model.');expect(text).toContain('Explanation: My own conclusion.');expect(text).toContain('Measurement guide (Object #1)');expect(text).toContain('Base area: 1 u² → 1 u²; Unchanged');
  e.prediction='My words.';expect(P.geoStretchPredictionText(e)).toBe('My words. Also shared aloud or with the model.');
 });
 it('reveals optional guidance after a change without filling in the student reflection',()=>{
  mount({workspacePanel:'learn'});click(button('Start: Double only the height'));expect(view.container.querySelector('.geo-measurement-guide')).toBeNull();input(field('Prediction (write or describe)'),'Twice.');click(button('Double height'));
  const guide=view.container.querySelector('.geo-measurement-guide');expect(guide.open).toBe(false);expect(guide.querySelector('summary').textContent).toBe('Explain the measured result');expect(guide.textContent).toContain('so volume doubled');expect(field('What do the measurements show?').value).toBe('');expect(button('Save notebook entry').disabled).toBe(true);
 });
 it('blocks saving a guided investigation after units change until the original units return',()=>{
  mount({...changed('height'),workspacePanel:'learn'});input(field('What do the measurements show?'),'Volume doubled.');expect(button('Save notebook entry').disabled).toBe(false);
  React.act(()=>view.setData(p=>({...p,geoSandbox:{...p.geoSandbox,unitId:'cm'}})));expect(button('Save notebook entry').disabled).toBe(true);expect(view.container.textContent).toContain('before applying a guided change or saving');
  React.act(()=>view.setData(p=>({...p,geoSandbox:{...p.geoSandbox,unitId:'unit'}})));click(button('Save notebook entry'));expect(view.data.geoSandbox.stretchRecords).toHaveLength(1);
 });
 it('uses saved models for reopened explanations and displays a saved spoken prediction',()=>{
  const e=entry(changed('height'));e.prediction='';e.experiment.predictionSpoken=true;
  mount({workspacePanel:'learn',stretchRecords:[e],stretchReviewEntry:e.id,construction:{objects:[{...clone(prism),w:[0,0,9]}],selection:1}});
  const saved=view.container.querySelector('.geo-record');expect(saved.textContent).toContain('Prediction: Shared aloud or with the model.');expect(saved.querySelector('.geo-measurement-guide').textContent).toContain('After: 1 u² × 2 u = 2 u³.');
 });
});
