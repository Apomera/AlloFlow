import fs from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect,vi} from 'vitest';

const hosts=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
function removeBranch(file,data,index){
 const source=fs.readFileSync(file,'utf8');
 const start=source.indexOf('const handleRemoveFromMapList =');
 const end=source.indexOf('const handleOutlineChange =',start);
 let active={id:'map',type:'outline',data},history=[active];
 const setter=next=>{active=typeof next==='function'?next(active):next;};
 const run=new Function('generatedContent','setGeneratedContent','setHistory','addToast','t',source.slice(start,end)+';return handleRemoveFromMapList;');
 run(active,setter,update=>{history=update(history);},vi.fn(),k=>k)(index);
 return {active,history};
}
function layoutHarness(result,nodes=[{id:'root',text:'Water',type:'main',x:100,y:100}]){
 const window={AlloModules:{},innerWidth:1200,innerHeight:900};
 vm.runInNewContext(fs.readFileSync('concept_map_handlers_source.jsx','utf8'),{window,console});
 let current=nodes;
 const toasts=vi.fn(),busy=vi.fn();
 const deps={generatedContent:{id:'map',type:'outline',data:{structureType:'Key Concept Map'}},conceptMapNodes:nodes,conceptMapEdges:[],isFullscreen:false,isTeacherMode:true,mapContainerRef:{current:{offsetWidth:800,offsetHeight:600}},setConceptMapNodes:next=>{current=typeof next==='function'?next(current):next;},setIsProcessing:busy,setGenerationStep:vi.fn(),callGemini:vi.fn().mockResolvedValue(JSON.stringify(result)),safeJsonParse:value=>{try{return JSON.parse(value);}catch{return null;}},t:k=>k,addToast:toasts,playSound:vi.fn(),warnLog:vi.fn()};
 return {run:()=>window.AlloModules.CmapHandlers.handleAutoLayout(undefined,undefined,deps),nodes:()=>current,toasts,busy};
}

describe.each(hosts)('organizer connection deletion in %s',file=>{
 it('retargets surviving connections after an earlier concept is removed',()=>{
  const data={branches:[{title:'Remove',items:[]},{title:'Cause',items:[],connectsTo:[2],connections:[{target:2,label:'leads to',custom:true}]},{title:'Effect',items:[]}]};
  const result=removeBranch(file,data,0);
  expect(result.active.data.branches[0].connectsTo).toEqual([1]);
  expect(result.active.data.branches[0].connections).toEqual([{target:1,label:'leads to',custom:true}]);
  expect(result.history[0]).toEqual(result.active);
  expect(data.branches[1].connectsTo).toEqual([2]);
 });
 it('removes links to the deleted concept without redirecting them to its successor',()=>{
  const data={branches:[{title:'Start',items:[],connectsTo:[1,2],connections:[{target:1,label:'remove me'},{target:2,label:'keep me'}]},{title:'Remove',items:[]},{title:'Finish',items:[]}]};
  const result=removeBranch(file,data,1);
  expect(result.active.data.branches[0].connectsTo).toEqual([1]);
  expect(result.active.data.branches[0].connections).toEqual([{target:1,label:'keep me'}]);
 });
 it.each([-1,5,0.5,'0'])('ignores invalid removal index %s',index=>{
  const data={branches:[{title:'Keep',items:[]}]};
  expect(removeBranch(file,data,index).active.data).toEqual(data);
 });
 it('does not crash while preserving an unrelated malformed branch',()=>{
  const data={branches:[{title:'Remove',items:[]},null,{title:'Keep',items:[]}]};
  expect(removeBranch(file,data,0).active.data.branches).toEqual([null,data.branches[2]]);
 });
 it('preserves absent connection fields and resource metadata',()=>{
  const data={main:'Topic',structureType:'Key Concept Map',branches:[{title:'Remove',items:[]},{title:'Keep',items:['detail'],role:'effect'}],custom:{keep:true}};
  const result=removeBranch(file,data,0);
  expect(result.active.data).toEqual({...data,branches:[data.branches[1]]});
 });
});

describe('AI organizer layout coordinate integrity',()=>{
 it('rejects a JSON array instead of a layout object',async()=>{
  const h=layoutHarness([{x:200,y:300}]);
  await h.run();
  expect(h.nodes()[0]).toMatchObject({x:100,y:100});
  expect(h.toasts).toHaveBeenCalledWith('concept_map.auto_layout.toast_failed','error');
 });
 it.each([{root:{x:'bad',y:200}},{root:{x:200}},{root:null},{root:{x:null,y:200}},['not a layout'],{unknown:{x:200,y:300}}])('preserves the diagram and reports unusable output %j',async result=>{
  const h=layoutHarness(result);
  await h.run();
  expect(h.nodes()).toEqual([{id:'root',text:'Water',type:'main',x:100,y:100}]);
  expect(h.toasts).toHaveBeenCalledWith('concept_map.auto_layout.toast_failed','error');
  expect(h.toasts).not.toHaveBeenCalledWith('concept_map.auto_layout.toast_optimized','success');
  expect(h.busy).toHaveBeenLastCalledWith(false);
 });
 it('applies valid coordinates, clamps them to the canvas, and preserves invalid entries',async()=>{
  const initial=[{id:'root',text:'Water',type:'main',x:100,y:100},{id:'b-0',text:'Ice',type:'branch',x:200,y:200}];
  const h=layoutHarness({root:{x:10000,y:-300},'b-0':{x:'bad',y:200}},initial);
  await h.run();
  expect(h.nodes()).toEqual([{...initial[0],x:750,y:50},initial[1]]);
  expect(h.toasts).toHaveBeenCalledWith('concept_map.auto_layout.toast_optimized','success');
 });
});
