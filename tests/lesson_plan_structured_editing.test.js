
import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
let React,createRoot,act,root,host,View,api;
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));
 ({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));
 act=React.act;globalThis.IS_REACT_ACT_ENVIRONMENT=true;window.React=React;
 for(const f of ['host_handlers_module.js','view_lesson_plan_module.js','export_handlers_module.js'])loadAlloModule(f);
 View=window.AlloModules.LessonPlanView;api=window.AlloModules.ExportHandlers;
});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;host?.remove();host=null;vi.restoreAllMocks();});
function harness(data){
 let saved={id:'plan',type:'lesson-plan',config:{generationInputs:{version:0}},data:{objectives:[],materialsNeeded:[],...data}},visible=saved;
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
 const deps={get generatedContent(){return visible;},onUpdateResource:(id,update)=>{if(id!==saved.id)return false;saved=update(saved);visible=saved;render();return true;}};
 const handler=window.AlloModules.HostHandlers(deps).handleLessonPlanChange;
 let editing=true;
 function render(){root.render(React.createElement(View,{generatedContent:visible,history:[],isTeacherMode:true,isEditingLessonPlan:editing,t:()=>'',getRows:()=>2,handleLessonPlanChange:handler,BilingualFieldRenderer:({text})=>React.createElement('span',null,text)}));}
 act(render);
 return {get:()=>saved,replaceSaved:fn=>{saved=fn(saved);},reopen:()=>{visible=JSON.parse(JSON.stringify(saved));act(render);},read:()=>{visible=saved;editing=false;act(render);}};
}
function field(label){const node=host.querySelector('textarea[aria-label="'+label+'"]');if(!node)throw Error('Missing field '+label);return node;}
function change(label,value){act(()=>{const node=field(label);Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}
describe('structured saved lesson text',()=>{
 it.each(['name','item'])('shows and edits legacy material %s without losing its other fields',key=>{
  const material={[key]:'Paper strips',id:'paper',quantity:4,translation:'Bandes de papier'},h=harness({materialsNeeded:[material]});
  expect(field('Material 1').value).toBe('Paper strips');change('Material 1','Colored paper strips');
  expect(h.get().data.materialsNeeded[0]).toEqual({...material,[key]:'Colored paper strips'});h.reopen();
  expect(field('Material 1').value).toBe('Colored paper strips');
  expect(api.prepareLessonPlanExport(h.get()).resource.data.materialsNeeded).toEqual(['Colored paper strips']);
 });
 it('preserves nested localized text and metadata when editing',()=>{
  const original={text:{en:'Original hook',fr:'Accroche',id:'translation'},id:'hook'},h=harness({hook:original});
  expect(field('Edit hook or opener').value).toBe('Original hook');change('Edit hook or opener','Revised hook');
  expect(h.get().data.hook).toEqual({...original,text:{...original.text,en:'Revised hook'}});
  expect(api.prepareLessonPlanExport(h.get()).resource.data.hook).toBe('Revised hook');
 });
 it.each(['hook','directInstruction'])('keeps metadata added after the %s editor rendered',key=>{
  const h=harness({[key]:{text:'Shown content',id:'field'}});
  h.replaceSaved(p=>({...p,data:{...p.data,[key]:{...p.data[key],translation:'New translation',teacherNote:'Arrived later'},teachingScripts:[{id:'new-script'}]}}));
  change(key==='hook'?'Edit hook or opener':'Edit direct instruction','Teacher revision');
  expect(h.get().data[key]).toEqual({text:'Teacher revision',id:'field',translation:'New translation',teacherNote:'Arrived later'});
  expect(h.get().data.teachingScripts).toEqual([{id:'new-script'}]);
 });
 it('keeps metadata added to a list item after the editor rendered',()=>{
  const h=harness({materialsNeeded:[{name:'Paper',id:'paper'}]});
  h.replaceSaved(p=>({...p,data:{...p.data,materialsNeeded:[{...p.data.materialsNeeded[0],quantity:12}]}}));
  change('Material 1','Cardstock');expect(h.get().data.materialsNeeded[0]).toEqual({name:'Cardstock',id:'paper',quantity:12});
 });
 it('clears the chosen text field without reviving a secondary title after reopen or export',()=>{
  const h=harness({hook:{text:'Remove this',title:'Metadata title',id:'keep'}});
  change('Edit hook or opener','');expect(field('Edit hook or opener').value).toBe('');
  expect(h.get().data.hook).toEqual({text:'',title:'Metadata title',id:'keep'});h.reopen();expect(field('Edit hook or opener').value).toBe('');
  expect(api.prepareLessonPlanExport(h.get()).resource.data.hook).toBe('');
 });
 it('uses the same empty-text precedence for lists and overview',()=>{
  const h=harness({materialsNeeded:[{en:'Erase this',name:'Secondary metadata name',id:'material'}]});
  change('Material 1','');h.read();expect(host.textContent).not.toContain('Secondary metadata name');
  expect(api.prepareLessonPlanExport(h.get()).resource.data.materialsNeeded).toEqual([]);
 });
 it('retains numeric zero in structured text before an intentional edit',()=>{
  const h=harness({materialsNeeded:[{text:0,unit:'counters',id:'zero'}]});
  expect(field('Material 1').value).toBe('0');expect(api.prepareLessonPlanExport(h.get()).resource.data.materialsNeeded).toEqual(['0']);
  change('Material 1','10');expect(h.get().data.materialsNeeded[0]).toEqual({text:'10',unit:'counters',id:'zero'});
 });
 it('adds editable text to an unnamed material without deleting its metadata',()=>{
  const h=harness({materialsNeeded:[{id:'material',quantity:3}]});change('Material 1','Markers');
  expect(h.get().data.materialsNeeded[0]).toEqual({id:'material',quantity:3,text:'Markers'});
  expect(api.prepareLessonPlanExport(h.get()).resource.data.materialsNeeded).toEqual(['Markers']);
 });
 it('preserves scalar strings and localized criteria during unrelated edits',()=>{
  const h=harness({hook:'Original',successCriteria:[{statement:{en:'Explain',fr:'Expliquer'},id:'criterion'}]});
  change('Edit hook or opener','Revised');expect(h.get().data.hook).toBe('Revised');
  expect(h.get().data.successCriteria[0]).toEqual({statement:{en:'Explain',fr:'Expliquer'},id:'criterion'});
 });
 it('does not replace a deliberately empty extension alias during export',()=>{
  const h=harness({extensions:[{title:'Keep title',description:'',text:'Old alternate description',guide:'Keep guide'}]});
  const original=JSON.stringify(h.get()),prepared=api.prepareLessonPlanExport(h.get());
  expect(prepared.resource.data.extensions[0].description).toBe('');expect(prepared.resource.data.extensions[0].guide).toBe('Keep guide');
  expect(JSON.stringify(h.get())).toBe(original);
 });
});
