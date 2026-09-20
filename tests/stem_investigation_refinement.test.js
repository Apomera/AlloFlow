
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
describe('design trial provenance',()=>{
 it('shows that equal area does not guarantee a fit, and rotation can restore it',()=>{
  const api=bim(),before={width:4,depth:12,workWidth:6,workDepth:4},after={...before,workWidth:4,workDepth:6};
  expect(api.compareDesignTrials(before,after)).toMatchObject({floorChange:0,workChange:0,previousFits:false,currentFits:true,previousMeetsBrief:false,currentMeetsBrief:true});
 });
 it('keeps a comparison directional and independent of stored area fields',()=>{
  const api=bim();
  expect(api.compareDesignTrials({width:8,depth:6,workWidth:6,workDepth:4},{width:9,depth:6,workWidth:6,workDepth:5})).toMatchObject({floorChange:6,workChange:6});
 });
 it('normalizes imported trials and excludes invalid dimensions',()=>{
  const api=bim(),good={id:'a',dimensions:{width:8,depth:6,workWidth:6,workDepth:4},reasoning:'Measure the available space.'};
  const result=api.normalizeDesignTrials([null,{},good,{...good,dimensions:{...good.dimensions,width:Infinity}},{...good,dimensions:{...good.dimensions,depth:''}}]);
  expect(result).toHaveLength(1);expect(result[0].reasoning).toBe(good.reasoning);
  expect(api.normalizeDesignTrials(Array.from({length:23},(_,i)=>({...good,id:String(i)})))).toHaveLength(20);
 });
 it('keeps imported trials independently selectable when their IDs collide',()=>{
  const api=bim(),trial={id:'same',dimensions:{width:8,depth:6,workWidth:6,workDepth:4}};
  const rows=api.normalizeDesignTrials([trial,{...trial,label:'Second'},{...trial,id:'same-1'}]);
  expect(new Set(rows.map(row=>row.id)).size).toBe(3);
  expect(api.normalizeDesignTrials(rows)).toEqual(rows);
 });
 it('preserves trials through export and import without trusting stored result claims',()=>{
  const api=bim(),plan=api.buildFallbackPlan('Classroom',{});
  plan.designTrials=[{id:'a',label:'Narrow floor',dimensions:{width:4,depth:12,workWidth:6,workDepth:4},reasoning:'The areas work but the width does not.',meetsBrief:true}];
  const imported=api.normalizeImportedRecipe(JSON.stringify(api.buildRecipe(plan))).plan;
  expect(imported.status).toBe('proposal');expect(imported.designTrials[0].reasoning).toContain('width');
  const text=api.designTrialMarkdown(imported.designTrials);
  expect(text).toContain('Fits: no');expect(text).toContain('not yet met');
  expect(imported.designTrials[0]).not.toHaveProperty('meetsBrief');
 });
 it('saves, compares, restores, and undoes trial removal without changing the saved trial',async()=>{
  const plan=bim().buildFallbackPlan('Classroom',{});
  plan.designStudy={width:4,depth:12,workWidth:6,workDepth:4};plan.designReasoning='Need to check width.';
  const state=await mount('openBim','openbim',{stage:'review',proposal:plan,approvedRecipe:{status:'approved-concept'}});
  await click('Save design trial');
  const saved=JSON.stringify(state().proposal.designTrials[0]);
  expect(state().approvedRecipe).toBeNull();
  await click('Rotate work area 90°');
  expect(document.querySelector('[data-design-result]').dataset.designResult).toBe('meets');
  expect(document.querySelector('[data-design-trial-comparison]').textContent).toContain('does not fit → fits');
  expect(JSON.stringify(state().proposal.designTrials[0])).toBe(saved);
  await click('Restore selected trial');
  expect(state().proposal.designStudy.workWidth).toBe(6);
  await click('Remove selected trial');expect(state().proposal.designTrials).toHaveLength(0);
  await click('Undo trial removal');expect(JSON.stringify(state().proposal.designTrials[0])).toBe(saved);
 });
 it('does not save or rotate dimensions that are still being edited',async()=>{
  const plan=bim().buildFallbackPlan('Classroom',{}),state=await mount('openBim','openbim',{stage:'review',proposal:plan});
  await input('input[aria-label="Floor width in metres"]','9');
  await click('Save design trial');expect(state().proposal.designTrials).toBeUndefined();expect(state().designNotice).toContain('Apply');
  await click('Rotate work area 90°');expect(state().designNotice).toContain('Apply');
  await click('Apply study dimensions');await click('Save design trial');
  expect(state().proposal.designTrials[0].dimensions.width).toBe(9);
 });
});
describe('taxonomy evidence feedback',()=>{
 it.each([
 ['bird',['yes']],['insect',['no','yes','yes']],['arachnid',['no','yes','no','yes']],
 ['fern',['no','no','yes']],['fungus',['no','no','no','yes']],['moss',['no','no','no','no','yes']]
 ])('supports the evidence path for %s',(id,answers)=>expect(tax().observationEvidenceReview(id,answers).status).toBe('supported'));
 it('points to the first inconsistent decision without disclosing the correct group',()=>{
  const result=tax().observationEvidenceReview('insect',['no','yes','no','yes']);
  expect(result).toMatchObject({status:'revisit',decision:2});expect(result.detail).toContain('six legs');
  expect(result.detail).not.toContain('Insect example');
 });
 it('distinguishes uncertainty, unfinished work, and ungraded field evidence',()=>{
  const api=tax();
  expect(api.observationEvidenceReview('bird',['unsure']).status).toBe('uncertain');
  expect(api.observationEvidenceReview('moss',['no']).status).toBe('incomplete');
  expect(api.observationEvidenceReview('field',['yes']).status).toBe('field');
  expect(api.observationEvidenceReview('__proto__',[]).status).toBe('field');
 });
 it('does not reinterpret a field-note title as a teaching example',()=>{
  const api=tax();
  const row=api.observationJournal([{subject:'Feathered visitor',claim:'Unclassified field observation',note:'Unknown animal'}])[0];
  expect(row.exampleId).toBe('field');
  expect(api.observationJournal([{subject:'Feathered visitor',claim:'Bird example',note:'Feathers'}])[0].exampleId).toBe('bird');
 });
 it('exports context, next evidence, and the reviewed decision status',()=>{
  const api=tax(),path=api.observationRoute(['yes']).path;
  const text=api.observationMarkdown([{exampleId:'insect',id:'a',note:'I saw wings.',path,reviewed:true,context:'Lesson card',nextEvidence:'Count jointed legs.'}]);
  expect(text).toContain('Lesson card');expect(text).toContain('Count jointed legs.');
  expect(text).toContain('Revisit decision 1');expect(text).not.toContain('Your key decisions match');
 });
 it('waits for review, returns to the conflicting decision, and clears stale feedback',async()=>{
  const state=await mount('organismId','organismid',{activeView:'observe',observationExample:'insect'});
  expect(document.querySelector('[data-observation-evidence-review]')).toBeNull();
  await click('Yes');await click('Review my evidence');
  expect(document.querySelector('[data-observation-evidence-review]').dataset.observationEvidenceReview).toBe('revisit');
  await click('Return to this decision');
  expect(state().observationAnswers).toEqual([]);expect(document.querySelector('[data-observation-evidence-review]')).toBeNull();
  await click('No');await click('Yes');await click('Yes');await click('Review my evidence');
  expect(document.querySelector('[data-observation-evidence-review]').dataset.observationEvidenceReview).toBe('supported');
  await click('Back one decision');await click('Yes');
  expect(document.querySelector('[data-observation-evidence-review]')).toBeNull();
  await click('Review my evidence');
  await input('#oid-observation-context','Classroom card');
  await input('#oid-next-evidence','Inspect body segments.');
  await input('#oid-observation-note','Six legs and antennae support the insect group.');
  await click('Save observation');
  expect(state().observationJournal[0]).toMatchObject({exampleId:'insect',reviewed:true,context:'Classroom card',nextEvidence:'Inspect body segments.'});
  await click('Revisit Six-legged visitor');
  expect(state().observationNextEvidence).toBe('Inspect body segments.');
  expect(state().observationReviewKey).toBeNull();
 });
 it('keeps custom field notes outside the key when revisiting a colliding title',async()=>{
  const state=await mount('organismId','organismid',{activeView:'observe',observationExample:'field'});
  await input('input[maxlength="100"]','Feathered visitor');
  await input('#oid-observation-note','A bird-like outline, no visible feathers.');
  await click('Save observation');await click('Revisit Feathered visitor');
  expect(state().observationExample).toBe('field');
  expect([...document.querySelectorAll('button')].some(n=>n.textContent==='Review my evidence')).toBe(false);
 });
});

