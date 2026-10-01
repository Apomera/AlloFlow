
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let root;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>{resetStemLab();document.body.innerHTML='<div id="root"></div>';});
afterEach(async()=>{if(root)await React.act(()=>root.unmount());root=null;vi.restoreAllMocks();});
const bim=()=>{loadTool('stem_lab/stem_tool_openbim.js','openBim');return window.OpenBIMBridge;};
const tax=()=>loadTool('stem_lab/stem_tool_organismid.js','organismId').testHooks;
async function mount(id,file,initial){
 let latest;
 loadTool('stem_lab/stem_tool_'+file+'.js',id);
 function App(){
  const [state,setState]=React.useState({[id]:initial});latest=state;
  const updateMulti=(tool,patch)=>setState(prev=>({...prev,[tool]:{...prev[tool],...patch}}));
  return window.StemLab._registry[id].render(makeCtx({toolData:state,setToolData:setState,updateMulti,callGemini:null}));
 }
 root=ReactDOMClient.createRoot(document.getElementById('root'));
 await React.act(()=>root.render(React.createElement(App)));
 return ()=>latest[id];
}
async function click(name){const b=[...document.querySelectorAll('button')].find(n=>n.textContent.trim()===name);expect(b,name).toBeTruthy();await React.act(()=>b.click());}
async function input(selector,value){
 const el=document.querySelector(selector);expect(el,selector).toBeTruthy();
 const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;
 await React.act(()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));});
}

const entry=(id,extra={})=>({id,subject:'Entry '+id,note:'Observed '+id,exampleId:'field',claim:'Unclassified field observation',path:[],...extra});
describe('specific design target feedback',()=>{
 it('separates a floor excess from a work shortfall',()=>{
  const checks=bim().designConstraintFeedback({width:10,depth:8,workWidth:5,workDepth:4});
  expect(checks.map(row=>row.met)).toEqual([false,false,true]);
  expect(checks[0].detail).toContain('20 m²');expect(checks[1].detail).toContain('4 m²');
 });
 it('reports both dimensions that overflow even when both area targets pass',()=>{
  const checks=bim().designConstraintFeedback({width:4,depth:4,workWidth:6,workDepth:5});
  expect(checks.map(row=>row.met)).toEqual([true,true,false]);
  expect(checks[2].detail).toContain('width by 2 m');expect(checks[2].detail).toContain('depth by 1 m');
 });
 it('accepts exact boundaries and avoids floating-point noise',()=>{
  const api=bim(),checks=api.designConstraintFeedback({width:10,depth:6,workWidth:4,workDepth:6});
  expect(checks.every(row=>row.met)).toBe(true);expect(checks[0].detail).toBe('Exactly at the target.');
  expect(api.designConstraintFeedback({width:8.01,depth:8,workWidth:6.01,workDepth:4})[0].detail).toBe('Over the target by 4.08 m².');
 });
 it('keeps feedback on applied dimensions and refreshes after edits are applied',async()=>{
  const plan=bim().buildFallbackPlan('Classroom',{});plan.designStudy={width:8,depth:6,workWidth:6,workDepth:4};
  await mount('openBim','openbim',{stage:'review',proposal:plan});
  await input('input[aria-label="Floor width in metres"]','12');
  expect(document.querySelector('[data-design-constraints]').textContent).toContain('use the applied dimensions');
  expect(document.querySelector('[data-design-constraint="floor"]').textContent).toContain('12 m² below');
  await click('Apply study dimensions');
  expect(document.querySelector('[data-design-constraint="floor"]').textContent).toContain('Over the target by 12 m²');
  expect(document.querySelector('[data-design-constraints]').textContent).not.toContain('use the applied dimensions');
 });
});
describe('observation revision comparisons',()=>{
 it('compares evidence, context, next steps and tentative claims',()=>{
  const api=tax(),before=entry('a',{note:'Wings',context:'Card',nextEvidence:'Count legs',claim:'Unresolved'});
  const after=entry('b',{note:'Six legs',context:'Close view',nextEvidence:'Body regions',claim:'Insect example'});
  const rows=api.compareObservations(before,after);
  expect(rows).toContainEqual({label:'Observation',before:'Wings',after:'Six legs'});
  expect(rows).toContainEqual({label:'Next evidence',before:'Count legs',after:'Body regions'});
  expect(rows.map(row=>row.label)).toEqual(expect.arrayContaining(['Context','Tentative group']));
 });
 it('matches key questions rather than treating different branches as the same decision',()=>{
  const api=tax(),before=entry('a',{path:api.observationRoute(['no','yes','unsure']).path});
  const after=entry('b',{subject:before.subject,path:api.observationRoute(['no','no','yes']).path});
  const rows=api.compareObservations(before,after);
  expect(rows.find(row=>row.label.includes('six legs'))).toMatchObject({before:'Not sure',after:'Not asked'});
  expect(rows.find(row=>row.label.includes('fronds'))).toMatchObject({before:'Not asked',after:'Yes'});
 });
 it('does not claim evidence changed when only the revision explanation changed',()=>{
  const api=tax(),before=entry('a');
  expect(api.compareObservations(before,{...before,id:'b',reason:'I clarified my reasoning.'})).toEqual([]);
 });
 it('records when evidence review was requested',()=>{
  const api=tax(),before=entry('a',{exampleId:'bird',path:api.observationRoute(['yes']).path});
  const rows=api.compareObservations(before,{...before,reviewed:true});
  expect(rows.find(row=>row.label==='Evidence review').before).toBe('Not requested.');
 });
 it('exports entry identities and before/after changes for a revision',()=>{
  const api=tax(),a=entry('a'),b=entry('b',{previousId:'a',note:'Clearer evidence',reason:'Closer observation'});
  const markdown=api.observationMarkdown([a,b]);
  expect(markdown).toContain('Entry ID: a');expect(markdown).toContain('Revision of a');
  expect(markdown).toContain('Observation: Observed a → Clearer evidence');
 });
 it('explains a missing earlier entry without inventing a comparison',()=>{
  const markdown=tax().observationMarkdown([entry('b',{previousId:'a'})]);
  expect(markdown).toContain('The earlier entry is not available');
 });
});
describe('observation journal capacity and recovery',()=>{
 it('retains every saved entry and the draft when the journal is full',async()=>{
  const rows=Array.from({length:60},(_,i)=>entry(String(i)));
  const state=await mount('organismId','organismid',{activeView:'observe',observationExample:'field',observationJournal:rows,observationNote:'New evidence',observationNextEvidence:'Inspect later'});
  await click('Save observation');
  expect(state().observationJournal).toEqual(rows);
  expect(state().observationNote).toBe('New evidence');expect(state().observationNextEvidence).toBe('Inspect later');
  expect(state().observationNotice).toContain('60 entries');
 });
 it('protects a revision draft at capacity too',async()=>{
  const rows=Array.from({length:60},(_,i)=>entry(String(i)));
  const state=await mount('organismId','organismid',{activeView:'observe',observationExample:'field',observationJournal:rows,observationPreviousId:'0',observationReason:'New feature',observationNote:'Better evidence'});
  await click('Save observation revision');
  expect(state().observationPreviousId).toBe('0');expect(state().observationReason).toBe('New feature');
  expect(state().observationJournal[0].id).toBe('0');
 });
 it('restores the original order and revision link after removing an ancestor',async()=>{
  const rows=[entry('a'),entry('b'),entry('c',{previousId:'b',note:'Updated b'})];
  const state=await mount('organismId','organismid',{activeView:'observe',observationExample:'field',observationJournal:rows});
  await click('Remove Entry b');
  expect(state().observationJournal.map(row=>row.id)).toEqual(['a','c']);
  expect(document.querySelector('[data-observation-comparison]').textContent).toContain('not available');
  expect(document.activeElement.id).toBe('oid-journal-heading');
  await click('Undo observation removal');
  expect(state().observationJournal.map(row=>row.id)).toEqual(['a','b','c']);
  expect(document.querySelector('[data-observation-comparison]').textContent).toContain('Before: Observed b');
 });
 it('keeps removal undo available when a new save fills the freed slot',async()=>{
  const rows=Array.from({length:60},(_,i)=>entry(String(i)));
  const state=await mount('organismId','organismid',{activeView:'observe',observationExample:'field',observationJournal:rows,observationNote:'New evidence'});
  await click('Remove Entry 20');await click('Save observation');
  expect(state().observationJournal).toHaveLength(60);expect(state().observationJournal[0].id).toBe('0');
  await click('Undo observation removal');
  expect(state().observationJournal).toHaveLength(60);expect(state().observationRemoved.row.id).toBe('20');
  expect(state().observationNotice).toContain('Export the removed observation');
 });
 it('can undo removal of the only observation',async()=>{
  const state=await mount('organismId','organismid',{activeView:'observe',observationExample:'field',observationJournal:[entry('a')]});
  await click('Remove Entry a');expect(state().observationJournal).toEqual([]);
  await click('Undo observation removal');expect(state().observationJournal[0].id).toBe('a');
 });
});
