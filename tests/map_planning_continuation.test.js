import fs from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import path from 'node:path';
const desktopRequire = createRequire(path.resolve('desktop/web-app/package.json'));
const React = desktopRequire('react');
const {renderToStaticMarkup} = desktopRequire('react-dom/server');
import {execFileSync} from 'node:child_process';
// Keep esbuild in Node's own typed-array realm; the repository setup uses jsdom.
const transformSync = source => ({ code: execFileSync(process.execPath, ['-e',
  "process.stdout.write(require('esbuild').transformSync(require('fs').readFileSync(0,'utf8'),{loader:'jsx'}).code)"
], { input: source, encoding: 'utf8', windowsHide: true }) });

function runtime(){
 const window={AlloModules:{},innerWidth:1200,innerHeight:900};
 const sandbox={window,console:{log(){},warn(){},error(){}},Map,Set,WeakMap,WeakSet,URL,URLSearchParams,Blob,setTimeout,clearTimeout,TextEncoder,TextDecoder};
 vm.runInNewContext(fs.readFileSync('resource_content_fingerprint_module.js','utf8'),sandbox);
 vm.runInNewContext(fs.readFileSync('utils_pure_source.jsx','utf8'),sandbox);
 vm.runInNewContext(fs.readFileSync('concept_map_handlers_source.jsx','utf8'),sandbox);
 return {window,sandbox,utils:window.AlloModules.UtilsPure,cmap:window.AlloModules.CmapHandlers};
}
const clone=v=>JSON.parse(JSON.stringify(v));
function saved(data){
 const {utils}=runtime(),graph=utils.outlineNodeBlueprints(data);
 return {...data,nodes:graph.nodes.map((n,i)=>({...n,x:333+i*7,y:111+i*9,customStyle:'keep'})),edges:graph.links};
}

describe('saved organizer synchronization',()=>{
 const base={main:'Water',main_en:'Water EN',structureType:'Key Concept Map',branches:[{title:'Liquid',items:['Rain'],items_en:['Rain EN']},{title:'Solid',items:['Ice']}]};
 it('updates main, branch, item and translation text without moving saved nodes',()=>{
  const {utils}=runtime(),before=saved(base);
  const next={...base,main:'Cycle',branches:[{...base.branches[0],title:'Clouds',items:['Snow'],items_en:['Snow EN']},base.branches[1]]};
  const result=utils.synchronizeSavedOutline(before,next,{type:'edit'});
  expect(result.nodes.map(n=>n.text)).toEqual(['Cycle','Clouds','Snow','Solid','Ice']);
  expect(result.nodes.find(n=>n.id==='i-0-0').translation).toBe('Snow EN');
  expect(result.nodes.map(n=>[n.x,n.y,n.customStyle])).toEqual(before.nodes.map(n=>[n.x,n.y,n.customStyle]));
  expect(before.nodes[0].text).toBe('Water');
 });
 it('removes the correct subtree, remaps surviving IDs and preserves custom nodes and links',()=>{
  const {utils}=runtime(),before=saved(base);
  before.nodes.push({id:'manual-1',text:'My connection',x:612,y:418});
  before.edges.push({id:'mine',fromId:'b-1',toId:'manual-1',label:'custom'});
  const result=utils.synchronizeSavedOutline(before,{...base,branches:[base.branches[1]]},{type:'remove-branch',index:0});
  expect(result.nodes.map(n=>n.id)).toEqual(['root','b-0','i-0-0','manual-1']);
  expect(result.nodes.find(n=>n.id==='b-0').x).toBe(before.nodes.find(n=>n.id==='b-1').x);
  expect(result.edges).toContainEqual({id:'mine',fromId:'b-0',toId:'manual-1',label:'custom'});
  expect(result.edges.every(e=>result.nodes.some(n=>n.id===e.fromId)&&result.nodes.some(n=>n.id===e.toId))).toBe(true);
 });
 it('adds a new concept to a saved map without resurrecting intentionally deleted nodes',()=>{
  const {utils}=runtime(),before=saved(base);before.nodes=before.nodes.filter(n=>n.id!=='i-0-0');before.edges=before.edges.filter(e=>e.toId!=='i-0-0');
  const result=utils.synchronizeSavedOutline(before,{...base,branches:[...base.branches,{title:'Gas',items:['Steam']}]},{type:'add-branch'});
  expect(result.nodes.some(n=>n.id==='i-0-0')).toBe(false);
  expect(result.nodes.find(n=>n.id==='b-2').text).toBe('Gas');
  expect(result.edges.some(e=>e.fromId==='root'&&e.toId==='b-2')).toBe(true);
 });
 it('keeps challenge answers attached to surviving nodes after save and reopen',()=>{
  const {utils,cmap}=runtime(),before=saved(base);before.challenge={mode:'strict',targetEdges:before.edges};before.edges=[];
  const result=clone(utils.synchronizeSavedOutline(before,{...base,branches:[base.branches[1]],challenge:before.challenge},{type:'remove-branch',index:0}));
  expect(result.edges).toEqual([]);expect(result.challenge.mode).toBe('strict');
  expect(result.challenge.targetEdges.every(e=>result.nodes.some(n=>n.id===e.toId))).toBe(true);
  const setNodes=vi.fn(),setEdges=vi.fn(),layout=vi.fn();
  return cmap.handleInitializeMap({generatedContent:{data:result},setConceptMapNodes:setNodes,setConceptMapEdges:setEdges,setIsConceptMapReady:vi.fn(),hasAutoLayoutRunRef:{current:false},handleAutoLayout:layout,warnLog:vi.fn()}).then(()=>{
   expect(setNodes).toHaveBeenCalledWith(result.nodes);expect(setEdges).toHaveBeenCalledWith([]);expect(layout).not.toHaveBeenCalled();
  });
 });
 it.each(['Flow Chart','Process Flow / Sequence','Structured Outline','Venn Diagram','Cause and Effect','Problem Solution'])('synchronizes authored %s labels while preserving coordinates',structureType=>{
  const {utils}=runtime(),data={...base,structureType},before=saved(data);
  const result=utils.synchronizeSavedOutline(before,{...data,main:'New topic',branches:[{...data.branches[0],items:['Changed item']},data.branches[1]]},{type:'edit'});
  const item=result.nodes.find(n=>n.outlineSource==='i:0:0');
  expect(item.text).toBe('Changed item');expect(item.x).toBe(before.nodes.find(n=>n.outlineSource==='i:0:0').x);
 });
 it('supports legacy saved nodes without source metadata',()=>{
  const {utils}=runtime(),before=saved(base);before.nodes.forEach(n=>delete n.outlineSource);
  const result=utils.synchronizeSavedOutline(before,{...base,main:'Updated'},{type:'edit'});
  expect(result.nodes[0].text).toBe('Updated');expect(result.nodes[0].x).toBe(333);
 });
 it('does not create a saved diagram for an uninitialized organizer',()=>{
  const {utils}=runtime(),next={...base,main:'Updated'};
  expect(utils.synchronizeSavedOutline(base,next,{type:'edit'})).toBe(next);
 });
 it.each(['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'])('persists synchronized edits through the actual %s handler',file=>{
  const {window}=runtime(),source=fs.readFileSync(file,'utf8');
  let active={id:'saved',type:'outline',data:saved(base)},history=[active];
  const a=source.indexOf('const handleOutlineChange ='),b=source.indexOf('const handleTimelineChange =',a);
  const handler=new Function('window','generatedContent','setGeneratedContent','setHistory','addToast',source.slice(a,b)+';return handleOutlineChange;');
  handler(window,active,v=>active=v,f=>history=f(history),vi.fn())(0,'title','Changed');
  expect(active.data.nodes.find(n=>n.id==='b-0').text).toBe('Changed');
  expect(clone(history)[0].data.nodes).toEqual(clone(active).data.nodes);
 });
});

function layoutHarness(){
 const r=runtime();let resolve,reject;
 let nodes=[{id:'root',text:'Water',type:'main',x:100,y:100}],edges=[];
 const ref={current:{alive:true,resourceId:'a',dataKey:'a-v1',activeView:'outline',teacher:true,profile:'p',nodes,edges,graphKey:JSON.stringify([nodes,edges]),request:null}};
 const sync=()=>{Object.assign(ref.current,{nodes,edges,graphKey:JSON.stringify([nodes,edges])});};
 const deps={mapLayoutScopeRef:ref,generatedContent:{id:'a',data:{}},conceptMapNodes:nodes,conceptMapEdges:edges,mapContainerRef:{current:{offsetWidth:800,offsetHeight:600}},setConceptMapNodes:next=>{nodes=typeof next==='function'?next(nodes):next;sync();},setIsProcessing:vi.fn(),setGenerationStep:vi.fn(),addToast:vi.fn(),playSound:vi.fn(),warnLog:vi.fn(),t:k=>k,safeJsonParse:v=>{try{return JSON.parse(v);}catch{return null;}},callGemini:vi.fn(()=>new Promise((yes,no)=>{resolve=yes;reject=no;}))};
 return {...r,deps,ref,get nodes(){return nodes;},resolve:v=>resolve(v),reject:e=>reject(e),move:()=>{nodes=nodes.map(n=>({...n,x:555}));sync();},run:()=>r.cmap.handleAutoLayout(undefined,undefined,deps)};
}
describe('organizer layout ownership',()=>{
 it('accepts a current valid layout',async()=>{const h=layoutHarness(),p=h.run();h.resolve('{"root":{"x":400,"y":300}}');expect(await p).toBe(true);expect(h.nodes[0].x).toBe(400);});
 it('preserves manual dragging performed during generation',async()=>{const h=layoutHarness(),p=h.run();h.move();h.resolve('{"root":{"x":400,"y":300}}');expect(await p).toBe(false);expect(h.nodes[0].x).toBe(555);expect(h.deps.playSound).not.toHaveBeenCalled();});
 it.each(['resourceId','dataKey','activeView','teacher','profile','alive'])('ignores completion after %s changes',async key=>{const h=layoutHarness(),p=h.run();h.ref.current[key]=typeof h.ref.current[key]==='boolean'?false:'changed';h.resolve('{"root":{"x":400,"y":300}}');expect(await p).toBe(false);expect(h.nodes[0].x).toBe(100);});
 it('suppresses duplicate requests for the same map',async()=>{const h=layoutHarness(),p=h.run();expect(await h.run()).toBe(false);expect(h.deps.callGemini).toHaveBeenCalledTimes(1);h.resolve('{"root":{"x":400,"y":300}}');await p;});
 it('does not repair an obsolete response or show its error',async()=>{const h=layoutHarness(),p=h.run();h.ref.current.resourceId='other';h.resolve('bad JSON');await p;expect(h.deps.callGemini).toHaveBeenCalledTimes(1);expect(h.deps.addToast).not.toHaveBeenCalledWith(expect.anything(),'error');});
 it('does not clear a newer map request when the old request finishes',async()=>{
  const h=layoutHarness(),old=h.run(),firstResolve=h.resolve;
  const first=h.ref.current.request;first.cancelled=true;h.ref.current.request=null;h.ref.current.resourceId='b';
  let secondResolve;h.deps.callGemini.mockImplementationOnce(()=>new Promise(r=>secondResolve=r));
  const second=h.run();const count=h.deps.setIsProcessing.mock.calls.length;
  firstResolve('{"root":{"x":400,"y":300}}');await old;
  expect(h.deps.setIsProcessing.mock.calls.length).toBe(count);
  secondResolve('{"root":{"x":250,"y":250}}');await second;
 });
});

function planningRuntime(){
 const r=runtime();vm.runInNewContext(fs.readFileSync('export_handlers_module.js','utf8'),r.sandbox);
 return {...r,context:r.window.AlloModules.ExportHandlers.getLessonContext};
}
describe('planning input provenance',()=>{
 const library=[{id:'terms',type:'glossary',title:'Vocabulary',data:[{term:'evaporation',def:'a change'}]},{id:'quiz',type:'quiz',title:'Exit ticket',data:{questions:[{},{}],reflections:[]}}];
 function collect(r,history=library,options={}){
  const segments=[],inventory=[];
  const context=r.context(history,{history,targetStandards:[],inputText:'Source text',trace:s=>segments.push(s)});
  const inventoryText=r.utils.getAssetManifest(history,{trace:i=>inventory.push(i)});
  return {context,segments,inventory,inventoryText,...options};
 }
 it('does not alter the original context or inventory when tracing',()=>{
  const r=planningRuntime(),c=collect(r);
  expect(c.context).toBe(r.context(library,{history:library,targetStandards:[],inputText:'Source text'}));
  expect(c.inventoryText).toBe(r.utils.getAssetManifest(library));
  expect(c.segments.map(s=>s.text).join('')).toBe(c.context);
 });
 it('records supplied summaries separately from inventory and freezes identities',()=>{
  const r=planningRuntime(),c=collect(r),snapshot=r.utils.capturePlanningInputs({...c,inventorySupplied:true});
  expect(snapshot.summaries.filter(s=>s.id).map(s=>s.id)).toEqual(['terms','quiz']);
  expect(snapshot.inventory.map(s=>s.id)).toEqual(['terms','quiz']);
  library[0].title='Renamed later';expect(snapshot.inventory[0].title).toBe('Vocabulary');library[0].title='Vocabulary';
  expect(JSON.stringify(snapshot)).not.toContain('a change');
 });
 it('fingerprints only the summary actually supplied',()=>{
  const r=planningRuntime(),first=r.utils.capturePlanningInputs(collect(r));
  const altered=clone(library);altered[0].data[0].def='New definition';altered[1].data.questions[0].question='new wording';
  expect(r.utils.capturePlanningInputs(collect(r,altered)).contextFingerprint).toBe(first.contextFingerprint);
  altered[0].data.push({term:'condensation'});expect(r.utils.capturePlanningInputs(collect(r,altered)).contextFingerprint).not.toBe(first.contextFingerprint);
 });
 it('does not add unrelated current resources to a saved scope',()=>{
  const r=planningRuntime(),snapshot=r.utils.capturePlanningInputs(collect(r));
  const reopened=clone(snapshot);expect(reopened.summaries.some(s=>s.id==='unrelated')).toBe(false);
 });
 it('omits summaries beyond the local cutoff and excludes inventory',()=>{
  const r=planningRuntime(),segments=[{id:'long',title:'Long',type:'glossary',kind:'terms',text:'x'.repeat(7000)},{id:'later',title:'Later',type:'quiz',kind:'quiz',text:' END'}];
  const context=segments.map(s=>s.text).join('');
  const snapshot=r.utils.capturePlanningInputs({context,segments,local:true,suppliedContext:context.slice(0,6500)+'\\n\\n[Source excerpt trimmed for local model context.]',inventorySupplied:false});
  expect(snapshot.summaries.map(s=>s.id)).toEqual(['long']);expect(snapshot.summaries[0].characters).toBe(6500);expect(snapshot.summaries[0].partial).toBe(true);expect(snapshot.inventory).toEqual([]);
 });
 it.each(['study','family'])('records %s mode without teacher inventory assumptions',mode=>{const r=planningRuntime(),snapshot=r.utils.capturePlanningInputs({...collect(r),mode});expect(snapshot.mode).toBe(mode);expect(snapshot.inventoryStatus).toBe('not-supplied');});
 it('labels custom manifests as untraced instead of guessing resource identities',()=>{const r=planningRuntime(),snapshot=r.utils.capturePlanningInputs({...collect(r),inventorySupplied:true,inventoryTraced:false});expect(snapshot.inventoryStatus).toBe('untraced');expect(snapshot.inventory).toEqual([]);});
 it('correctly summarizes object-shaped Sequence Builder data',()=>{const r=planningRuntime(),items=[{id:'sequence',type:'timeline',data:{items:[{},{},{}]}}];expect(collect(r,items).context).toContain('3 Events');});
 it('captures a sidebar plan before an asynchronous provider changes inputs',async()=>{
  const r=planningRuntime(),history=clone(library),traces=[],plans=[],active=[];
  let release;const promise=r.cmap.handleGenerateLessonPlan(true,{inputText:'Source',gradeLevel:'3',history,isIndependentMode:false,isParentMode:false,leveledTextLanguage:'Spanish',alloBotRef:{current:null},setIsProcessing:vi.fn(),setGenerationStep:vi.fn(),setGeneratedContent:p=>active.push(p),setActiveView:vi.fn(),setHistory:f=>plans.push(...f([])),setError:vi.fn(),addToast:vi.fn(),t:k=>k,warnLog:vi.fn(),getLessonContext:(scope,options)=>r.context(scope,{history,targetStandards:[],inputText:'Source',trace:options.trace}),getAssetManifest:r.utils.getAssetManifest,buildLessonPlanPrompt:(context,manifest)=>context+manifest,callGemini:()=>new Promise(resolve=>release=resolve),safeJsonParse:JSON.parse,cleanJson:v=>v,flyToElement:vi.fn()});
  history[0].title='Changed in flight';history[0].data.push({term:'New term'});
  release('{"objectives":["Learn"],"extensions":[]}');await promise;
  expect(plans[0].config.generationInputs.inventory[0].title).toBe('Vocabulary');
  expect(active[0]).toEqual(plans[0]);expect(active[0].config.language).toBe('Spanish');
 });
});

describe('planning disclosure',()=>{
 const {window,sandbox}=runtime();sandbox.React=React;
 vm.runInNewContext(transformSync(fs.readFileSync('view_lesson_plan_source.jsx','utf8'),{loader:'jsx'}).code+';window.InputView=PlanningInputsSummary;',sandbox);
 const render=props=>renderToStaticMarkup(React.createElement(window.InputView,{t:k=>k,...props}));
 it('does not infer legacy attribution from today’s library',()=>{const html=render({resource:{id:'old',config:{}},history:[{id:'x',title:'Unrelated',type:'quiz'}]});expect(html).toContain('not recorded');expect(html).not.toContain('Unrelated');});
 it('shows frozen mode, partial input, missing dependencies and an accessible disclosure',()=>{
  const record={version:1,mode:'family',traceComplete:true,projection:'local-excerpt-v1',summaries:[{id:'gone',title:'Original name',kind:'Source',partial:true}],inventory:[],inventoryStatus:'not-supplied'};
  const html=render({resource:{id:'plan',config:{generationInputs:record}},history:[]});
  expect(html).toContain('<details');expect(html).toContain('<summary');expect(html).toContain('Family guide');expect(html).toContain('Original name');expect(html).toContain('not in the current library');expect(html).toContain('partial excerpt');
 });
 it('only offers open actions for unique available identities',()=>{
  const record={version:1,mode:'teacher',traceComplete:true,summaries:[{id:'a',title:'A'},{id:'b',title:'B'}],inventory:[]};
  const html=render({resource:{id:'plan',config:{generationInputs:record}},history:[{id:'a'},{id:'b'},{id:'b'}],onOpen:vi.fn()});
  expect(html).toContain('aria-label="Open current resource: A"');expect(html).not.toContain('aria-label="Open current resource: B"');expect(html).toContain('More than one resource');
 });
});

describe('canonical saved flow graphs',()=>{
 const source=fs.readFileSync('AlloFlowANTI.txt','utf8'),a=source.indexOf('  const parseFlowChartData ='),b=source.indexOf('  // Shared deps for every CmapHandlers',a);
 const parse=new Function('t',source.slice(a,b)+';return parseFlowChartData;')(k=>k);
 it('reconnects the end marker after adding a step to an actual saved flow chart',()=>{
  const r=runtime(),data={main:'Process',structureType:'Flow Chart',branches:[{title:'First',items:[]}]},graph=parse(data);
  const before={...data,...graph};
  const result=r.utils.synchronizeSavedOutline(before,{...data,branches:[...data.branches,{title:'Second',items:[]}]},{type:'add-branch'});
  expect(result.edges.some(e=>e.fromId==='node-b-0'&&e.toId==='node-b-1')).toBe(true);
  expect(result.edges.some(e=>e.fromId==='node-b-1'&&e.toId==='node-end')).toBe(true);
  expect(result.edges.some(e=>e.fromId==='node-b-0'&&e.toId==='node-end')).toBe(false);
 });
 it('preserves authored flow styles and manual connections across removal',()=>{
  const r=runtime(),data={main:'Process',structureType:'Flow Chart',branches:[{title:'A',items:[]},{title:'B',items:[]},{title:'C',items:[]}]},graph=parse(data);
  graph.edges.find(e=>e.fromId==='node-main'&&e.toId==='node-b-0').color='#123456';
  graph.nodes.push({id:'manual',text:'Note',x:701,y:452});
  graph.edges.push({id:'custom',fromId:'node-b-2',toId:'manual',label:'authored'});
  const result=r.utils.synchronizeSavedOutline({...data,...graph},{...data,branches:[data.branches[0],data.branches[2]]},{type:'remove-branch',index:1});
  expect(result.edges.find(e=>e.fromId==='node-main'&&e.toId==='node-b-0').color).toBe('#123456');
  expect(result.edges).toContainEqual({id:'custom',fromId:'node-b-1',toId:'manual',label:'authored'});
  expect(result.edges.some(e=>e.fromId==='node-b-0'&&e.toId==='node-b-1')).toBe(true);
 });
});

function dispatcherHarness(options={}){
 const r=planningRuntime(),source=fs.readFileSync('generate_dispatcher_source.jsx','utf8');
 const a=source.indexOf("      } else if (type === 'lesson-plan') {"),b=source.indexOf("      } else if (type === 'adventure')",a);
 const body=source.slice(source.indexOf('\n',a)+1,b);
 const localStart=source.indexOf('    const localExcerpt ='),localEnd=source.indexOf('    const parseJsonLenient =',localStart);
 const localExcerpt=new Function(source.slice(localStart,localEnd)+';return localExcerpt;')();
 const history=options.history || [{id:'terms',type:'glossary',title:'Vocabulary',data:[{term:'Water'}]},{id:'quiz',type:'quiz',title:'Exit ticket',data:{questions:[{}]}}];
 const deps={history,configOverride:{},isIndependentMode:false,isParentMode:false,effectiveLanguage:'English',effectiveGrade:'3',effCustomInstructions:'',usesLocalTextBackend:false,standardsDirective:'',dokDirective:'',interestsDirective:'',setGenerationStep:vi.fn(),setGenerationTaskProgress:vi.fn(),t:k=>k,getLessonContext:(scope,options)=>r.context(scope,{history,targetStandards:[],inputText:'Source input',trace:options.trace}),getAssetManifest:r.utils.getAssetManifest,buildStudyGuidePrompt:c=>c,buildParentGuidePrompt:c=>c,buildLessonPlanPrompt:(c,m)=>c+m,localExcerpt,assertLocalTaskSupported:vi.fn(),localSchemaArg:()=>undefined,callGemini:vi.fn().mockResolvedValue('{"objectives":["Learn"],"extensions":[]}'),safeJsonParse:JSON.parse,parseJsonLenient:JSON.parse,cleanJson:v=>v,warnLog:vi.fn(),...options};
 const names=Object.keys(deps);
 const run=new Function('window','deps','return (async()=>{const {'+names.join(',')+'}=deps;let planningGenerationInputs,content,metaInfo;'+body+';return {planningGenerationInputs,content,metaInfo};})()');
 return {...r,deps,run:()=>run(r.window,deps)};
}
describe('dispatcher guide provenance',()=>{
 it('uses the supplied Full Pack scope instead of ambient History',async()=>{
  const selected={id:'selected',type:'glossary',title:'Selected',data:[{term:'Scope'}]};
  const h=dispatcherHarness({configOverride:{historyOverride:[selected]}}),result=await h.run();
  expect(result.planningGenerationInputs.summaries.filter(s=>s.id).map(s=>s.id)).toEqual(['selected']);
  expect(result.planningGenerationInputs.inventory.map(s=>s.id)).toEqual(['selected']);
 });
 it('records the exact current localExcerpt projection and excludes later summaries',async()=>{
  const h=dispatcherHarness({usesLocalTextBackend:true,history:[{id:'long',type:'glossary',title:'Long vocabulary',data:[{term:'x'.repeat(8000)}]},{id:'later',type:'quiz',title:'Later quiz',data:{questions:[{}]}}]});
  const result=await h.run(),context=h.deps.getLessonContext(h.deps.history,{});
  expect(result.planningGenerationInputs.contextFingerprint).toBe(h.window.AlloModules.ResourceContentFingerprint.fingerprint(h.deps.localExcerpt(context,6500)));
  expect(result.planningGenerationInputs.summaries.some(s=>s.id==='later')).toBe(false);
  expect(result.planningGenerationInputs.inventory).toEqual([]);
 });
 it.each(['study','family'])('keeps %s generation distinct from teacher plans',async mode=>{
  const h=dispatcherHarness({isIndependentMode:mode==='study',isParentMode:mode==='family'}),result=await h.run();
  expect(result.planningGenerationInputs.mode).toBe(mode);expect(result.planningGenerationInputs.inventoryStatus).toBe('not-supplied');
 });
 it('does not guess IDs from a custom inventory override',async()=>{
  const h=dispatcherHarness({configOverride:{assetManifest:'Custom supplied inventory'}}),result=await h.run();
  expect(result.planningGenerationInputs.inventoryStatus).toBe('untraced');expect(result.planningGenerationInputs.inventory).toEqual([]);
 });
 it('freezes provenance before a delayed response changes the source',async()=>{
  const h=dispatcherHarness();let finish;h.deps.callGemini.mockImplementation(()=>new Promise(resolve=>finish=resolve));
  const pending=h.run();h.deps.history[0].title='Later name';finish('{"objectives":[],"extensions":[]}');
  expect((await pending).planningGenerationInputs.inventory[0].title).toBe('Vocabulary');
 });
 it.each(['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'])('wires traced context, scoped map cancellation and safe resource opening in %s',file=>{
  const host=fs.readFileSync(file,'utf8');
  expect(host).toContain('trace: options.trace');
  expect(host).toContain('}, [organizerHydrationKey]);');
  expect(host).toContain('scope.request.cancelled = true; scope.request = null; setIsMapLayoutProcessing(false);');
  expect(host).toContain('setIsProcessing: setIsMapLayoutProcessing');
  expect(host).toContain('onOpenPlanningResource: isTeacherMode ?');
  expect(host).toContain('if (matches.length === 1) handleRestoreView(matches[0]);');
 });
});

describe('precomputed Full Pack inventory provenance',()=>{
 it('records identities when the supplied inventory exactly matches the selected scope',async()=>{
  const h=dispatcherHarness();h.deps.configOverride.assetManifest=h.utils.getAssetManifest(h.deps.history);
  const record=(await h.run()).planningGenerationInputs;
  expect(record.inventoryStatus).toBe('recorded');expect(record.inventory.map(i=>i.id)).toEqual(['terms','quiz']);
 });
 it('does not attribute an older inventory to newer resource versions',async()=>{
  const h=dispatcherHarness();h.deps.configOverride.assetManifest=h.utils.getAssetManifest(h.deps.history);
  h.deps.history[0].title='Changed before invocation';
  const record=(await h.run()).planningGenerationInputs;
  expect(record.inventoryStatus).toBe('untraced');expect(record.inventory).toEqual([]);
 });
});
