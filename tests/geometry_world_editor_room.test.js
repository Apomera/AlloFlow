import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let THREE,makeShape;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const candidatePath=resolve(process.env.GW_EDITOR_ROOM_CANDIDATE||'stem_lab/stem_tool_geometryworld_builder.js');
function helperSource(){const source=readFileSync(candidatePath,'utf8'),from=source.indexOf('  function keepEditorControlVisible('),to=source.indexOf('  function installStyles() {',from);if(from<0||to<from)throw Error('Installed editor focus helpers missing');return source.slice(from,to);}
beforeAll(()=>{
 const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
 const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
describe('closed editor summary scroll belongs to current focused disclosure only',()=>{
 it.each(['below','above','visible','other-focus','open','detached','desktop','too-short'])('handles %s without moving focus or model',mode=>{
  const p={helper:helperSource()};
  const handler=new Function(p.helper+'return keepClosedEditorSummaryVisible;')();
  const body=document.createElement('div');body.className='gwe-builder-body';body.style.overflowY='auto';
  const details=document.createElement('details'),summary=document.createElement('summary'),other=document.createElement('button');summary.textContent='Edit whole creation';details.append(summary);body.append(details,other);document.body.append(body);
  const previous=window.matchMedia;window.matchMedia=()=>({matches:mode!=='desktop'});
  Object.defineProperty(body,'clientHeight',{value:mode==='too-short'?30:100});Object.defineProperty(summary,'offsetHeight',{value:44});
  body.getBoundingClientRect=()=>({top:100,bottom:mode==='too-short'?130:200});summary.getBoundingClientRect=()=>mode==='above'?{top:50,bottom:94}:mode==='visible'?{top:110,bottom:154}:{top:220,bottom:264};
  body.scrollTop=100;summary.focus();if(mode==='other-focus')other.focus();if(mode==='open')details.open=true;if(mode==='detached')body.remove();const focused=document.activeElement;
  try{handler({currentTarget:details});expect(body.scrollTop).toBe(mode==='below'?166:mode==='above'?48:100);expect(document.activeElement).toBe(focused);}finally{body.remove();window.matchMedia=previous;}
 });
});

describe('deferred editor focus scroll retains actual focus ownership',()=>{
 it.each(['below','visible','other-focus','detached','hidden','desktop','too-short'])('handles %s after native focus layout without stealing focus',mode=>{
  const p={helper:helperSource()},handler=new Function(p.helper+'return keepEditorFocusVisible;')();
  const body=document.createElement('div');body.className='gwe-builder-body';body.style.overflowY='auto';const details=document.createElement('details'),input=document.createElement('input'),other=document.createElement('button');details.open=true;details.append(input);body.append(details,other);document.body.append(body);
  Object.defineProperty(body,'clientHeight',{value:mode==='too-short'?30:100});Object.defineProperty(input,'offsetHeight',{value:mode==='hidden'?0:44});body.getBoundingClientRect=()=>({top:100,bottom:mode==='too-short'?130:200});input.getBoundingClientRect=()=>mode==='visible'?{top:110,bottom:154}:{top:220,bottom:264};body.scrollTop=100;
  const oldMedia=window.matchMedia,oldRaf=window.requestAnimationFrame;window.matchMedia=()=>({matches:mode!=='desktop'});let frame;window.requestAnimationFrame=fn=>{frame=fn;return 1;};input.focus();
  try{handler({currentTarget:body,target:input});expect(body.scrollTop).toBe(100);if(mode==='other-focus')other.focus();if(mode==='detached')body.remove();const focused=document.activeElement;frame();expect(body.scrollTop).toBe(mode==='below'?166:100);expect(document.activeElement).toBe(focused);}finally{body.remove();window.matchMedia=oldMedia;window.requestAnimationFrame=oldRaf;}
 });
});

describe('single dock scrollport preserves pinned controls and current focus ownership',()=>{
 it.each(['below','above','visible','other-focus','header','footer','detached','desktop'])('handles %s using only the dock scroll offset',mode=>{
  const p={helper:helperSource()},handler=new Function(p.helper+'return keepEditorControlVisible;')();
  const dock=document.createElement('aside');dock.className='gwe-builder-dock';const head=document.createElement('div'),footer=document.createElement('div'),body=document.createElement('div'),target=document.createElement('button'),other=document.createElement('button');head.className='gwe-builder-head';footer.className='gwe-builder-footer';body.className='gwe-builder-body';body.style.overflowY='visible';dock.append(head,body,footer,other);(mode==='header'?head:mode==='footer'?footer:body).append(target);document.body.append(dock);
  Object.defineProperty(target,'offsetHeight',{value:44});dock.getBoundingClientRect=()=>({top:50,bottom:350});head.getBoundingClientRect=()=>({top:50,bottom:110});footer.getBoundingClientRect=()=>({top:290,bottom:350});target.getBoundingClientRect=()=>mode==='above'?{top:50,bottom:94}:mode==='visible'?{top:140,bottom:184}:{top:310,bottom:354};dock.scrollTop=100;body.scrollTop=17;target.focus();if(mode==='other-focus')other.focus();if(mode==='detached')dock.remove();const focused=document.activeElement,previous=window.matchMedia;window.matchMedia=()=>({matches:mode!=='desktop'});
  try{handler(dock,target);expect(dock.scrollTop).toBe(mode==='below'?166:mode==='above'?38:100);expect(body.scrollTop).toBe(17);expect(document.activeElement).toBe(focused);}finally{dock.remove();window.matchMedia=previous;}
 });
});

describe('actual rendered event bindings preserve geometry and focus',()=>{
 function mountedCandidate(){
  vi.useFakeTimers();window.THREE=THREE;const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync(candidatePath,'utf8'))();const api=window.StemLab.geometryWorldBuilderPure,inspector=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8'),helpers=inspector.slice(inspector.indexOf('const key='),inspector.indexOf('function precedes('));
  const fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,worldState,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
  const app=fixture.mount();app.click(app.host.querySelector('[data-gwe-edit-selection]'));React.act(()=>vi.advanceTimersByTime(100));const body=app.host.querySelector('.gwe-builder-body');body.style.overflowY='auto';body.getBoundingClientRect=()=>({top:100,bottom:200});body.scrollTop=100;return {fixture,app,body};
 }
 it('the real dock focus capture scrolls a focused input without editing the world',()=>{
  const previous=window.matchMedia;window.matchMedia=()=>({matches:true});const {fixture,app,body}=mountedCandidate(),before=fixture.worldState(app.engine),input=app.host.querySelector('#gwe-creation-offset-x');Object.defineProperty(input,'offsetHeight',{value:44});input.getBoundingClientRect=()=>({top:220,bottom:264});
  try{React.act(()=>{input.focus();vi.advanceTimersByTime(32);});expect(document.activeElement).toBe(input);expect(body.scrollTop).toBe(166);expect(fixture.worldState(app.engine)).toEqual(before);}finally{fixture.cleanup();window.matchMedia=previous;vi.clearAllTimers();vi.useRealTimers();delete window.__geoWorldEngine;}
 });
 it('the real details toggle restores visible summary scroll without editing the world',()=>{
  const previous=window.matchMedia;window.matchMedia=()=>({matches:true});const {fixture,app,body}=mountedCandidate(),before=fixture.worldState(app.engine),details=app.host.querySelector('.gwe-creation-editor'),summary=details.querySelector('summary');Object.defineProperty(summary,'offsetHeight',{value:44});summary.getBoundingClientRect=()=>({top:220,bottom:264});
  try{React.act(()=>{summary.focus();details.open=false;details.dispatchEvent(new Event('toggle'));});expect(document.activeElement).toBe(summary);expect(body.scrollTop).toBe(166);expect(fixture.worldState(app.engine)).toEqual(before);}finally{fixture.cleanup();window.matchMedia=previous;vi.clearAllTimers();vi.useRealTimers();delete window.__geoWorldEngine;}
 });
});

describe('preview return focus yields to newer builder intent',()=>{
 let fixture,app,frames,frameId;
 const query=selector=>app.host.querySelector(selector);
 const keyFor=p=>[p.x,p.y,p.z].join(',');
 function flushFrames(rounds=1){
  for(let i=0;i<rounds;i++)React.act(()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(0));});
 }
 function timers(){React.act(()=>vi.advanceTimersByTime(0));}
 function activate(node){expect(node).toBeTruthy();React.act(()=>{node.focus();node.click();});}
 function choose(selector,value){React.act(()=>{const node=query(selector);node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));});}
 function draft(node,value){React.act(()=>{node.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});}
 function world(){return {model:fixture.worldState(app.engine),selection:structuredClone(app.engine._builderSelection)};}
 function preview(){
  activate(query('[data-gwe-open-coordinate-build]'));flushFrames(3);timers();
  choose('#gwe-build-mode','line');draft(query('#gwe-build-length'),'2');
  activate(query('#gwe-coordinate-build-review'));timers();flushFrames(2);
  expect(query('.gwe-edit-preview').dataset.ready).toBe('true');
 }
 function applied(){
  preview();activate(app.button('Apply preview'));
  expect(app.engine.commitBuildBatch).toHaveBeenCalledOnce();
  expect(Object.values(app.engine.blocks).filter(mesh=>mesh.userData._measurementLayer==='student')).toHaveLength(2);
  React.act(()=>vi.advanceTimersByTime(300));
  return world();
 }
 beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();frames=new Map();frameId=0;
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{const id=++frameId;frames.set(id,callback);return id;});
  vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync(candidatePath,'utf8'))();const api=window.StemLab.geometryWorldBuilderPure;
  const inspector=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8'),helpers=inspector.slice(inspector.indexOf('const key='),inspector.indexOf('function precedes('));
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,worldState,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
  app=fixture.mount({retained:null});const engine=app.engine;
  for(const [key,mesh]of Object.entries(engine.blocks))if(mesh.userData._measurementLayer==='student'){engine.scene.remove(mesh);delete engine.blocks[key];}
  engine._undoStack=[];engine._redoStack=[];engine.blocksPlaced=0;
  engine.previewBuildBatch=vi.fn((additions,removals)=>{
   const occupied=additions.find(block=>engine.blocks[keyFor(block)]&&!removals.some(p=>keyFor(p)===keyFor(block)));
   return occupied?{ok:false,reason:'A block is in the way. X '+occupied.x+', Y '+occupied.y+', Z '+occupied.z+' contains one of your blocks.'}:{ok:true,additions,removals};
  });
  engine.commitBuildBatch=vi.fn((additions,removals,options)=>{
   const checked=engine.previewBuildBatch(additions,removals);if(!checked.ok)return checked;
   for(const p of removals){const mesh=engine.blocks[keyFor(p)];if(mesh)engine.scene.remove(mesh);delete engine.blocks[keyFor(p)];}
   for(const block of additions){const geometry=makeShape(block.shape),material=new THREE.MeshStandardMaterial({color:0x71957b}),mesh=new THREE.Mesh(geometry,material);mesh.position.set(block.x+.5,block.y+.5,block.z+.5);mesh.rotation.y=(block.rotation||0)*Math.PI/2;mesh.updateMatrixWorld(true);mesh.userData={gridPos:{x:block.x,y:block.y,z:block.z},shape:block.shape,rotation:block.rotation||0,blockType:block.type,volume:1,_measurementLayer:'student',_lessonBlock:false};engine.blocks[keyFor(block)]=mesh;engine.scene.add(mesh);}
   engine._builderSelection=structuredClone(options.afterSelection);engine._undoStack.push({action:'fixture-coordinate-batch',count:additions.length});engine.blocksPlaced+=additions.length-removals.length;return {ok:true};
  });
  engine.cancelDrawing=vi.fn();engine.setDrawMode=vi.fn();engine.setViewPreset=vi.fn();
  engine.showBuildBatchPreview=vi.fn((plan,owner)=>{engine._buildBatchPreview={owner,plan};});
  engine.clearBuildBatchPreview=vi.fn(owner=>{if(engine._buildBatchPreview?.owner===owner)engine._buildBatchPreview=null;});
  app.patch({focusFixtureRevision:1});React.act(()=>vi.advanceTimersByTime(300));flushFrames(3);timers();frames.clear();
 });
 afterEach(()=>{
  fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
  for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[key];
 });
 it('cancels the late Apply return when Tools closes coordinates without first draining frames',()=>{
  const before=applied(),details=query('.gwe-coordinate-builder');
  app.click(query('[aria-label="Return to build tools"]'));expect(details.open).toBe(false);
  flushFrames(3);timers();
  expect(details.open).toBe(false);expect(query('.gwe-builder-dock').dataset.coordinateBuilding).toBe('false');expect(world()).toEqual(before);
 });
 it('keeps newer Change selection focus between Tools and its native activation',()=>{
  const before=applied();activate(query('[aria-label="Return to build tools"]'));
  const choose=query('[data-gwe-choose-selection]');React.act(()=>choose.focus());
  flushFrames(3);timers();expect(document.activeElement).toBe(choose);expect(query('.gwe-coordinate-builder').open).toBe(false);
  app.click(choose);timers();expect(document.activeElement).toBe(query('#gwe-selection-choice-title'));expect(query('.gwe-builder-dock').dataset.selectionChoosing).toBe('true');expect(query('#gwe-coordinate-build-error')).toBeNull();expect(world()).toEqual(before);
 });
 it('preserves the ordinary Apply return when the originating button is removed',()=>{
  const before=applied();flushFrames(3);timers();
  expect(document.activeElement).toBe(query('#gwe-coordinate-build-review'));expect(query('.gwe-coordinate-builder').open).toBe(true);expect(world()).toEqual(before);
 });
 it('preserves the ordinary Cancel return and leaves model and history unchanged',()=>{
  preview();const before=world();activate(app.button('Cancel preview'));flushFrames(3);timers();
  expect(document.activeElement).toBe(query('#gwe-coordinate-build-review'));expect(app.engine.commitBuildBatch).not.toHaveBeenCalled();expect(world()).toEqual(before);
 });
 it('does not replace a newer typed coordinate draft focus with the old preview button',()=>{
  const before=applied(),input=query('#gwe-build-origin-x');draft(input,'4');flushFrames(3);timers();
  expect(document.activeElement).toBe(input);expect(input.value).toBe('4');expect(world()).toEqual(before);
 });
 it('yields to an unrelated focused control while its return frame is pending',()=>{
  const before=applied(),other=document.createElement('button');other.textContent='Newer action';app.host.querySelector('main').appendChild(other);React.act(()=>other.focus());flushFrames(3);timers();
  expect(document.activeElement).toBe(other);expect(world()).toEqual(before);
 });
 it('keeps an opened modal focused while the return frame is pending',()=>{
  const before=applied(),modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.tabIndex=-1;app.host.querySelector('main').appendChild(modal);React.act(()=>modal.focus());flushFrames(3);timers();
  expect(document.activeElement).toBe(modal);expect(world()).toEqual(before);
 });
 it('declines the return after the engine has entered a world transition',()=>{
  const before=applied(),other=document.createElement('button');app.host.querySelector('main').appendChild(other);React.act(()=>other.focus());app.engine._pendingWorldTransition=true;flushFrames(3);timers();
  expect(document.activeElement).toBe(other);expect(world()).toEqual(before);
 });
 it('leaves a newer focus untouched after the Builder unmounts',()=>{
  applied();const other=document.createElement('button');document.body.appendChild(other);React.act(()=>other.focus());fixture.cleanup();flushFrames(3);timers();expect(document.activeElement).toBe(other);other.remove();
 });
});
