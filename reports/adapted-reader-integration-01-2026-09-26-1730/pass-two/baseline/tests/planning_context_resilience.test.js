
import {beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url);
let api,utils,React,renderToStaticMarkup;
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));
 ({renderToStaticMarkup}=require(resolve('desktop/web-app/node_modules/react-dom/server')));
 window.React=React;
 for(const f of ['resource_content_fingerprint_module.js','utils_pure_module.js','export_handlers_module.js','view_lesson_plan_module.js'])loadAlloModule(f);
 api=window.AlloModules.ExportHandlers;utils=window.AlloModules.UtilsPure;
});
const quiz={id:'quiz',type:'quiz',title:'Exit ticket',data:{questions:[{question:'One?'},{question:'Two?'}],reflections:['Explain.']}};
const context=(history,options={})=>api.getLessonContext(history,{inputText:'',targetStandards:[],...options});
describe('planning context resilience',()=>{
 it.each([
  {id:'bad',type:'glossary',data:{}},
  {id:'bad',type:'glossary',data:[null,{term:'Valid term'},{term:{en:'Unusable'}},'bad']},
  {id:'bad',type:'concept-sort',data:{categories:[null,{label:'Solid'},{label:{en:'Unusable'}}]}},
  {id:'bad',type:'concept-sort',data:{categories:{}}},
  {id:'bad',type:'analysis',data:{readingLevel:null}},
  {id:'bad',type:'analysis',data:{readingLevel:{range:{bad:true}},concepts:[null,{bad:true},'Water']}}
 ])('preserves valid assessment context despite malformed %j',resource=>{
  const source=[resource,quiz],before=JSON.stringify(source),text=context(source);
  expect(text).toContain('Has 2 Multiple Choice Questions and 1 Reflection prompts');
  expect(text).not.toContain('[object Object]');expect(text).not.toContain('undefined');
  expect(JSON.stringify(source)).toBe(before);
 });
 it('retains valid entries within imported vocabulary and categories',()=>{
  const text=context([{id:'g',type:'glossary',data:[null,{term:'water'},{term:' '},{term:123},{term:'ice'}]},{id:'c',type:'concept-sort',data:{categories:[null,{label:'Solid'},{label:''},{label:'Liquid'}]}}]);
  expect(text).toContain('Key Terms: water, ice');expect(text).toContain('Categories: Solid, Liquid.');
 });
 it.each([
  {type:'glossary',data:[null,{term:{}}]},
  {type:'concept-sort',data:{categories:[null,{label:{}}]}},
  {type:'sentence-frames',data:'broken'},
  {type:'sentence-frames',data:{mode:'unknown'}},
  {type:'image',data:{prompt:{text:'broken'}}}
 ])('omits an unusable summary instead of inventing support: %j',resource=>{
  const entries=[];context([{id:'bad',...resource},quiz],{trace:item=>entries.push(item)});
  expect(entries.some(item=>item.id==='bad'&&['Vocabulary terms','Concept sort summary','Writing scaffold summary','Visual support summary'].includes(item.kind))).toBe(false);
  expect(entries.some(item=>item.id==='quiz'&&item.kind==='Assessment summary')).toBe(true);
 });
 it('does not count characters of a malformed quiz or reflection string as questions',()=>{
  const traces=[],text=context([{id:'q',type:'quiz',data:{questions:'broken'}}],{trace:x=>traces.push(x)});
  expect(text).not.toContain('Has 6 Multiple Choice Questions');expect(traces.some(x=>x.kind==='Assessment summary')).toBe(false);
  expect(context([{...quiz,data:{...quiz.data,reflections:'broken'}}])).toContain('2 Multiple Choice Questions and 0 Reflection prompts');
 });
 it('accepts legacy and object-shaped event arrays while rejecting string lengths',()=>{
  for(const data of [[{event:'One'},{event:'Two'}],{items:[{event:'One'},{event:'Two'}]}]){
   expect(context([{id:'t',type:'timeline',data}])).toContain('2 Events available for sequencing.');
  }
  expect(context([{id:'t',type:'timeline',data:{items:'broken'}}])).not.toContain('Events available for sequencing');
 });
 it('handles malformed input settings without throwing or substituting a different lesson',()=>{
  expect(()=>context([],{inputText:{text:'broken'},targetStandards:'broken'})).not.toThrow();
  const text=context({}, {history:[{id:'other',type:'glossary',data:[{term:'UNRELATED'}]}]});
  expect(text).not.toContain('UNRELATED');expect(text).not.toContain('[object Object]');
 });
 it('ignores null and primitive history entries without mutating the supplied scope',()=>{
  const input=[null,4,'bad',[],quiz],before=JSON.stringify(input);
  expect(context(input)).toContain('Has 2 Multiple Choice Questions');expect(JSON.stringify(input)).toBe(before);
 });
 it('uses valid fallback standards without misattributing them to a malformed alignment record',()=>{
  const entries=[],text=context([{id:'broken',type:'alignment-report',data:{reports:[{standard:{bad:true}}]}}],{targetStandards:['4.NF.A.1',null,{bad:true}],trace:x=>entries.push(x)});
  expect(text).toContain('Target Standard(s): 4.NF.A.1');
  expect(entries.find(x=>x.kind==='Target standards').id).toBeNull();
 });
 it('does not silently reuse an older glossary when the selected latest glossary is malformed',()=>{
  const entries=[],text=context([{id:'old',type:'glossary',data:[{term:'OUTDATED'}]},{id:'new',type:'glossary',data:{}},quiz],{trace:x=>entries.push(x)});
  expect(text).not.toContain('OUTDATED');expect(entries.some(x=>x.id==='old'||x.id==='new')).toBe(false);
 });
 it('preserves exact trace offsets and supplied-context fingerprints after omitting malformed inputs',()=>{
  const entries=[],text=context([{id:'bad',type:'glossary',data:{}},quiz],{trace:x=>entries.push(x)});
  expect(entries.map(x=>x.text).join('')).toBe(text);
  for(const entry of entries)expect(text.slice(entry.start,entry.end)).toBe(entry.text);
  const record=utils.capturePlanningInputs({context:text,segments:entries});
  expect(record.contextFingerprint).toBe(window.AlloModules.ResourceContentFingerprint.fingerprint(text));
  expect(record.summaries.some(x=>x.id==='bad')).toBe(false);expect(record.summaries.some(x=>x.id==='quiz')).toBe(true);
 });
 it('keeps valid inventory entries while ignoring malformed types and using a safe fallback title',()=>{
  const input=[null,{id:'no-type'},{id:'bad-type',type:123},quiz,{id:'g',type:'glossary',title:{bad:true}}],before=JSON.stringify(input),entries=[];
  const text=utils.getAssetManifest(input,{trace:x=>entries.push(x)});
  expect(entries.map(x=>x.id)).toEqual(['quiz','g']);expect(text).toContain('"Untitled Resource"');expect(text).not.toContain('[object Object]');
  expect(JSON.stringify(input)).toBe(before);
  expect(utils.getAssetManifest(undefined)).toContain('No specific assets generated yet.');
  expect(utils.getAssetManifest({})).toContain('No specific assets generated yet.');
 });
 it.each(['__input__',null])('explains directly supplied source text without reporting it as deleted (%s)',id=>{
  const record={version:1,mode:'teacher',summaries:[{id,title:'Original source input',type:id===null?'source-input':'simplified',kind:'Source text excerpt'}],inventory:[],inventoryStatus:'not-supplied'};
  const markup=renderToStaticMarkup(React.createElement(window.AlloModules.LessonPlanView,{generatedContent:{id:'p',type:'lesson-plan',data:{},config:{generationInputs:record}},history:[],t:()=>'',isTeacherMode:true,onOpenPlanningResource:()=>{}}));
  expect(markup).toContain('Source text was supplied directly');expect(markup).not.toContain('This resource is not in the current library.');
  expect(markup).not.toContain('aria-label="Open current resource: Original source input"');
 });
});
