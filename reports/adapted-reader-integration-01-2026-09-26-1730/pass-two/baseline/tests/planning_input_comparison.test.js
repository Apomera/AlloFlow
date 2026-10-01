
import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
let utils, exp, React,createRoot,act,root,host;
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));
 ({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));
 act=React.act;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.React=React;
 for(const f of ['resource_content_fingerprint_module.js','utils_pure_module.js','export_handlers_module.js','view_lesson_plan_module.js'])loadAlloModule(f);
 utils=window.AlloModules.UtilsPure;exp=window.AlloModules.ExportHandlers;
});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;vi.restoreAllMocks();});
const clone=x=>JSON.parse(JSON.stringify(x));
const glossary=()=>({id:'g',type:'glossary',title:'Vocabulary',data:[{term:'water',definition:'A liquid'}]});
const quiz=()=>({id:'q',type:'quiz',title:'Exit ticket',data:{questions:[{question:'Q',conceptLabel:'Water'}],reflections:[]}});
function capture(history,local=false){
 const segments=[],inventory=[];
 const context=exp.getLessonContext(history,{trace:x=>segments.push(x),inputText:'',targetStandards:[]});
 const inventoryText=utils.getAssetManifest(history,{trace:x=>inventory.push(x)});
 return utils.capturePlanningInputs({context,segments,local,route:'dispatcher',suppliedContext:local?context.trim().slice(0,6500).trim():context,inventory,inventoryText,inventorySupplied:!local});
}
const summary=(status,record,id)=>status.summaries[record.summaries.findIndex(x=>x.id===id)];
function mount(record,history,onOpen=vi.fn()){
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
 const props={generatedContent:{id:'plan',type:'lesson-plan',config:{generationInputs:record},data:{}},history,t:()=>'',isTeacherMode:true,onOpenPlanningResource:onOpen};
 act(()=>root.render(React.createElement(window.AlloModules.LessonPlanView,props)));
 return props;
}
function expand(){
 const details=[...host.querySelectorAll('details')].find(x=>x.querySelector('summary')?.textContent==='Inputs supplied at generation time');
 act(()=>{details.open=true;details.dispatchEvent(new Event('toggle'));});return details;
}
describe('recorded planning input comparison',()=>{
 it('matches contributions after a JSON save/load without mutating saved or current resources',()=>{
  const history=[glossary(),quiz()],record=clone(capture(history)),before=JSON.stringify({record,history});
  const status=utils.getPlanningInputStatus(record,history);
  expect(summary(status,record,'g').status).toBe('same');expect(summary(status,record,'q').status).toBe('same');
  expect(status.inventory.every(x=>x.status==='same')).toBe(true);expect(JSON.stringify({record,history})).toBe(before);
 });
 it('flags consumed terms and question counts but ignores wording, definitions, timestamps and learner answers',()=>{
  const history=[glossary(),quiz()],record=capture(history),current=clone(history);
  current[0].data[0].definition='Rewritten';current[1].data.questions[0].question='Different words';current[1].studentAnswers=['private'];current[0].updatedAt='now';
  let result=utils.getPlanningInputStatus(record,current);
  expect(summary(result,record,'g').status).toBe('same');expect(summary(result,record,'q').status).toBe('same');
  current[0].data.push({term:'ice'});current[1].data.questions.push({question:'New'});
  result=utils.getPlanningInputStatus(record,current);
  expect(summary(result,record,'g').status).toBe('changed');expect(summary(result,record,'q').status).toBe('changed');
 });
 it('compares inventory names and quiz concept labels that are actually sent',()=>{
  const current=[quiz()],record=capture(current);current[0].title='Renamed';
  expect(utils.getPlanningInputStatus(record,current).inventory[0].status).toBe('changed');
  current[0].title='Exit ticket';current[0].data.questions[0].conceptLabel='Energy';
  expect(utils.getPlanningInputStatus(record,current).inventory[0].status).toBe('changed');
 });
 it('ignores unrelated resources and newer resources of the same type',()=>{
  const history=[glossary()],record=capture(history);const newer={...glossary(),id:'new',data:[{term:'unrelated'}]};
  expect(summary(utils.getPlanningInputStatus(record,[newer,...history]),record,'g').status).toBe('same');
  expect(summary(utils.getPlanningInputStatus(record,[newer]),record,'g').status).toBe('missing');
 });
 it.each([['missing',[]],['ambiguous',[glossary(),glossary()]],['unavailable',[{...glossary(),type:'quiz'}]]])('reports %s rather than silently replacing the input', (expected,current)=>{
  const record=capture([glossary()]);expect(summary(utils.getPlanningInputStatus(record,current),record,'g').status).toBe(expected);
 });
 it('accepts numeric zero identities and rejects missing history',()=>{
  const g={...glossary(),id:0},record=capture([g]);
  expect(summary(utils.getPlanningInputStatus(record,[g]),record,'0').status).toBe('same');
  expect(summary(utils.getPlanningInputStatus(record,undefined),record,'0').status).toBe('unavailable');
 });
 it.each([null,{}, {version:99},{version:1,mode:'invalid',summaries:[],inventory:[]}])('handles legacy or unsupported records: %j',record=>{
  expect(utils.getPlanningInputStatus(record,[]).status).toBe('unavailable');
 });
 it('treats unknown projections, absent hashes and malformed input entries as unavailable',()=>{
  const record=capture([glossary()]);
  expect(utils.getPlanningInputStatus({...record,projection:'future'},[glossary()]).status).toBe('unavailable');
  const g=record.summaries.find(x=>x.id==='g');g.fingerprint=null;
  expect(summary(utils.getPlanningInputStatus(record,[glossary()]),record,'g').status).toBe('unavailable');
  record.summaries.push(null);
  expect(utils.getPlanningInputStatus(record,[glossary()]).summaries.at(-1).status).toBe('unavailable');
 });
 it('does not infer settings or reading selections absent from older capture records',()=>{
  const record=capture([glossary()]);
  expect(utils.getPlanningInputStatus(record,[glossary()]).summaries[0].status).toBe('unavailable');
  expect(utils.getPlanningInputStatus({...record,traceComplete:false},[glossary()]).status).toBe('unavailable');
 });
 it('compares only the supplied local excerpt and excludes material after the cutoff',()=>{
  const g={...glossary(),data:[{term:'a'.repeat(7000)}]},q=quiz(),record=capture([g,q],true);
  expect(record.summaries.find(x=>x.id==='g').partial).toBe(true);expect(record.summaries.some(x=>x.id==='q')).toBe(false);
  g.data[0].term='a'.repeat(6900)+'CHANGED';
  expect(summary(utils.getPlanningInputStatus(record,[g]),record,'g').status).toBe('same');
  g.data[0].term='X'+g.data[0].term;
  expect(summary(utils.getPlanningInputStatus(record,[g]),record,'g').status).toBe('changed');
  expect(utils.getPlanningInputStatus(record,[g]).inventory).toEqual([]);
 });
 it('uses the same unusual local normalization as generation capture',()=>{
  const g={...glossary(),data:[{term:'water\\s\\ncycle'}]},record=capture([g],true);
  expect(summary(utils.getPlanningInputStatus(record,[g]),record,'g').status).toBe('same');
 });
 it('contains malformed current data and unavailable dependencies without breaking the guide',()=>{
  const record=capture([glossary()]);
  expect(summary(utils.getPlanningInputStatus(record,[{...glossary(),data:{}}]),record,'g').status).toBe('unavailable');
  const saved=window.AlloModules.ExportHandlers;delete window.AlloModules.ExportHandlers;
  try{expect(summary(utils.getPlanningInputStatus(record,[glossary()]),record,'g').status).toBe('unavailable');}finally{window.AlloModules.ExportHandlers=saved;}
 });
 it.each(['study','family'])('preserves %s guide attribution during comparisons',mode=>{
  const record={...capture([glossary()],true),mode};
  expect(summary(utils.getPlanningInputStatus(record,[glossary()]),record,'g').status).toBe('same');expect(record.mode).toBe(mode);
 });
 it('computes only after disclosure expansion and leaves the plan editable',()=>{
  const original=capture([glossary()]),changed={...glossary(),data:[{term:'ice'}]},spy=vi.spyOn(utils,'getPlanningInputStatus'),onOpen=vi.fn();
  const props=mount(original,[changed],onOpen);expect(spy).not.toHaveBeenCalled();const details=expand();
  expect(details.textContent).toContain('Recorded contribution differs');expect(details.textContent).toContain('Some recorded inputs need review.');
  const open=[...details.querySelectorAll('button')].find(b=>b.textContent==='Open current resource');act(()=>open.click());expect(onOpen).toHaveBeenCalledWith('g');
  expect(props.generatedContent.data).toEqual({});expect(props.generatedContent.config.generationInputs).toBe(original);
 });
 it('does not offer open links to a different resource type sharing the saved ID',()=>{
  mount(capture([glossary()]),[{...glossary(),type:'image'}]);const details=expand();
  expect(details.querySelectorAll('button')).toHaveLength(0);expect(details.textContent).toContain('Comparison unavailable');
 });
 it('updates statuses when an input changes while the disclosure is open',()=>{
  const record=capture([glossary()]),p=mount(record,[glossary()]);expand();
  expect(host.textContent).toContain('Recorded contribution matches');
  act(()=>root.render(React.createElement(window.AlloModules.LessonPlanView,{...p,history:[{...glossary(),data:[{term:'ice'}]}]})));
  expect(host.textContent).toContain('Recorded contribution differs');
 });

 it('keeps unsaved input origins unavailable instead of reporting a deletion',()=>{
  const record=capture([{...glossary(),id:'__input__'}]);
  expect(summary(utils.getPlanningInputStatus(record,[]),record,'__input__').status).toBe('unavailable');
 });
 it.each([
  [{id:'a',type:'analysis',data:{concepts:['Water'],readingLevel:'Grade 4'}}, item=>{item.data.concepts.push('Ice');}],
  [{id:'a',type:'alignment-report',data:{reports:[{standard:'A',standardBreakdown:{skill:'Explain'}}]}}, item=>{item.data.reports[0].standard='B';}],
  [{id:'a',type:'sentence-frames',data:{mode:'list'}},item=>{item.data.mode='paragraph';}],
  [{id:'a',type:'timeline',data:{items:['One']}},item=>{item.data.items.push('Two');}],
  [{id:'a',type:'concept-sort',data:{categories:[{label:'Solid'}]}},item=>{item.data.categories[0].label='Liquid';}],
  [{id:'a',type:'image',data:{prompt:'Water'}},item=>{item.data.prompt='Ice';}]
 ])('compares the consumed summary fields for %j',(resource,edit)=>{
  const record=capture([resource]),before=utils.getPlanningInputStatus(record,[resource]);
  expect(summary(before,record,'a').status).toBe('same');edit(resource);
  expect(summary(utils.getPlanningInputStatus(record,[resource]),record,'a').status).toBe('changed');
 });

});
