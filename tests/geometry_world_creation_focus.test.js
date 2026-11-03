import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8'),builder=readFileSync(process.env.GW_SELECTION_FOCUS_CANDIDATE || 'stem_lab/stem_tool_geometryworld_builder.js','utf8');
function slice(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<a)throw new Error('Missing focus source '+start);return source.slice(a,b);}
const makeShape=new Function(slice(core,'  function createShapeGeometry(','  // Format fractional volume for display')+';return createShapeGeometry;')();
const releaseSource=slice(core,'engine.releaseInput = function()','engine.refreshTouchActivity = function');
const clearSource=slice(core,'engine.clearWorld = function()','engine.createNPC = function');
const oldLab=window.StemLab,oldThree=window.THREE;
let api,styleOwned,rafId,rafQueue,cancelled,fixtures,reduced;
beforeAll(()=>{
  window.THREE=THREE;window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  if(!document.getElementById('allo-geometryworld-builder-css')){styleOwned=document.createElement('style');styleOwned.id='allo-geometryworld-builder-css';document.head.appendChild(styleOwned);}
  new Function(builder)();api=window.StemLab.geometryWorldBuilderPure;
});
afterAll(()=>{window.StemLab=oldLab;window.THREE=oldThree;if(styleOwned)styleOwned.remove();});
beforeEach(()=>{
  vi.useFakeTimers();fixtures=[];rafId=0;rafQueue=new Map();cancelled=[];reduced=false;
  vi.stubGlobal('requestAnimationFrame',fn=>{const id=++rafId;rafQueue.set(id,fn);return id;});
  vi.stubGlobal('cancelAnimationFrame',id=>{cancelled.push(id);rafQueue.delete(id);});
  vi.stubGlobal('matchMedia',()=>({matches:reduced}));
});
afterEach(()=>{
  for(const f of fixtures){if(f.e.disposeCreationFocus)f.e.disposeCreationFocus();for(const m of Object.values(f.e.blocks)){m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.dispose)o.material.dispose();});}f.root.remove();}
  delete window.__geoWorldEngine;vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals();vi.restoreAllMocks();
});
function flushRaf(){const batch=[...rafQueue];rafQueue.clear();for(const[,fn]of batch)fn(0);}
function settle(f){flushRaf();flushRaf();vi.advanceTimersByTime(0);if(f.e.updateCreationFocus)f.e.updateCreationFocus(.5);}
function fixture({flyMode=true,aimed=false}={}){
  const root=document.createElement('div');root.id='geoworld-fs-workspace';const surface=document.createElement('div');surface.id='geoworld-fs-wrap';surface.tabIndex=0;const canvas=document.createElement('canvas');surface.appendChild(canvas);root.appendChild(surface);document.body.appendChild(root);
  canvas.getBoundingClientRect=()=>({left:0,top:0,right:900,bottom:700,width:900,height:700});
  const e={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(61,9/7,.1,213),euler:new THREE.Euler(0,0,0,'YXZ'),blocks:{},npcs:[],renderer:{domElement:canvas},flyMode,velocity:new THREE.Vector3(2,1,-1),moveState:{forward:true,flyDown:true},lookState:{left:true},isLocked:true,_touchActive:true,_touchLookId:4,_touchMoveId:5,_touchLookStart:{x:3,y:4},_touchMoveStart:{x:5,y:6},_touchMoveVec:{x:.4,z:.6},_undoStack:[{action:'place',x:2,y:1,z:0}],_redoStack:[{action:'remove',x:-2,y:1,z:0}],blocksPlaced:4};
  e.camera.up.set(0,0,-1);e.camera.position.set(9,7,-11);e.camera.lookAt(2,2,0);e.camera.updateMatrixWorld(true);e.scene.fog=new THREE.Fog(0x839ea7,51,147);
  const positions=[{x:0,y:1,z:0,shape:'cube',rotation:0},{x:1,y:1,z:0,shape:'halfA',rotation:1},{x:2,y:1,z:0,shape:'halfB',rotation:0},{x:0,y:2,z:0,shape:'quarter',rotation:2}];
  for(const p of positions){const m=new THREE.Mesh(makeShape(p.shape),new THREE.MeshStandardMaterial({color:0x657457}));m.position.set(p.x+.5,p.y+.5,p.z+.5);m.rotation.y=p.rotation*Math.PI/2;m.userData={gridPos:{x:p.x,y:p.y,z:p.z},shape:p.shape,rotation:p.rotation,blockType:'stone',volume:{cube:1,halfA:.5,halfB:.5,quarter:.25}[p.shape],_measurementLayer:'student'};e.blocks[p.x+','+p.y+','+p.z]=m;e.scene.add(m);}
  const selected=positions.map(({x,y,z})=>({x,y,z}));e._builderSelection=aimed?null:{blocks:selected.map(p=>({...p}))};
  e.measureStructure=vi.fn(()=>({blocks:selected.map(p=>({...p})),isComplete:true,L:3,W:1,H:2,occupiedVolume:2.25,count:4}));
  e.blockUnderCrosshair=vi.fn(()=>aimed?{object:e.blocks['0,1,0']}:null);
  e.isInputActive=()=>e.isLocked||document.activeElement===surface;
  const joystick=vi.fn(),lookFeedback=vi.fn();new Function('engine','resetTouchJoystick','resetTouchLookFeedback',releaseSource)(e,joystick,lookFeedback);vi.spyOn(e,'releaseInput');
  e.clearDimensionAnnotations=vi.fn();e.clearSelectionAnnotations=vi.fn();e._disposeBlockMesh=m=>m.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});new Function('engine',clearSource)(e);
  const ctx={toolData:{geometryWorld:{sandboxDockCollapsed:false}},addToast:vi.fn()};ctx.updateMulti=vi.fn((_tool,patch)=>Object.assign(ctx.toolData.geometryWorld,patch));
  window.__geoWorldEngine=e;const f={e,ctx,root,surface,canvas,selected,joystick,lookFeedback};fixtures.push(f);return f;
}
function pose(e){return{position:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),up:e.camera.up.toArray(),fov:e.camera.fov,far:e.camera.far,fog:e.scene.fog,near:e.scene.fog?.near,farFog:e.scene.fog?.far};}
function construction(f){const e=f.e,bundle=api.buildGeometryWorldStl(e,f.selected);return JSON.stringify({meshes:Object.entries(e.blocks).map(([key,m])=>({key,position:m.position.toArray(),quaternion:m.quaternion.toArray(),scale:m.scale.toArray(),visible:m.visible,userData:m.userData,vertices:Array.from(m.geometry.attributes.position.array)})),undo:e._undoStack,redo:e._redoStack,placed:e.blocksPlaced,selection:e._builderSelection,stl:createHash('sha256').update(Buffer.from(bundle.buffer)).digest('hex')});}

describe('Focus creation lifecycle through the public builder API',()=>{
  it('releases held input and passive viewport focus does not take over the camera',()=>{
    const f=fixture(),e=f.e;expect(api.focusSelectedBuild(f.ctx)).toBe(true);expect(e.releaseInput).toHaveBeenCalledOnce();expect(Object.values(e.moveState).every(v=>!v)).toBe(true);expect(Object.values(e.lookState).every(v=>!v)).toBe(true);expect(e._touchMoveVec).toEqual({x:0,z:0});expect(e._touchLookId).toBe(null);expect(e._touchMoveId).toBe(null);expect(e.isLocked).toBe(false);expect(e.velocity.toArray()).toEqual([0,0,0]);expect(f.joystick).toHaveBeenCalled();expect(f.lookFeedback).toHaveBeenCalled();
    flushRaf();flushRaf();vi.advanceTimersByTime(0);expect(document.activeElement).toBe(f.surface);expect(e.isInputActive()).toBe(true);const before=e.camera.position.clone();e.updateCreationFocus(.25);expect(e._creationFocus.manual).toBe(false);expect(e._creationFocus.transition).not.toBe(null);expect(e.camera.position.equals(before)).toBe(false);e.updateCreationFocus(.25);expect(e._creationFocus.transition).toBe(null);
  });
  it.each([true,false])('restores exact pose, up, projection and fog while preserving flyMode=%s',flyMode=>{
    const f=fixture({flyMode}),e=f.e,before=pose(e),world=construction(f);expect(api.focusSelectedBuild(f.ctx)).toBe(true);settle(f);expect(e.camera.up.toArray()).toEqual([0,1,0]);expect(e._creationFocus).toBeTruthy();expect(e.flyMode).toBe(flyMode);expect(construction(f)).toBe(world);
    expect(e.restoreCreationView()).toBe(true);expect(e.restoreCreationView()).toBe(false);e.updateCreationFocus(.5);expect(e._creationFocus).toBe(null);expect(pose(e)).toEqual(before);expect(e.flyMode).toBe(flyMode);expect(construction(f)).toBe(world);expect(f.ctx.toolData.geometryWorld.sandboxDockCollapsed).toBe(false);expect(f.ctx.toolData.geometryWorld.creationFocusAvailable).toBe(false);
  });
  it('repeated focus retains the original return view and cancels superseded frames',()=>{
    const f=fixture(),e=f.e,before=pose(e);api.focusSelectedBuild(f.ctx);const state=e._creationFocus,firstFrame=[...rafQueue.keys()][0];api.focusSelectedBuild(f.ctx);expect(e._creationFocus).toBe(state);expect(cancelled).toContain(firstFrame);expect(rafQueue.size).toBe(1);settle(f);
    e.camera.position.x+=3;e.updateCreationFocus(.016);expect(state.manual).toBe(true);api.focusSelectedBuild(f.ctx);expect(e._creationFocus).toBe(state);settle(f);e.restoreCreationView();e.updateCreationFocus(.5);expect(pose(e)).toEqual(before);
  });
  for(const intent of ['move','look','touch','position','quaternion'])it('yields to '+intent+' intent without changing construction or flight mode',()=>{
    const f=fixture({flyMode:false}),e=f.e,world=construction(f);api.focusSelectedBuild(f.ctx);flushRaf();flushRaf();e.updateCreationFocus(.1);
    if(intent==='move')e.moveState.forward=true;if(intent==='look')e.lookState.right=true;if(intent==='touch')e._touchMoveVec.z=.5;if(intent==='position')e.camera.position.x+=1;if(intent==='quaternion')e.camera.rotateY(.2);
    const manualPose=pose(e);e.updateCreationFocus(.1);expect(e._creationFocus.manual).toBe(true);expect(e._creationFocus.transition).toBe(null);expect(pose(e)).toEqual(manualPose);expect(e.fitCreationFocus(false)).toBe(false);expect(e.flyMode).toBe(false);expect(construction(f)).toBe(world);
  });
  it('refits a changed viewport while retaining the original return and model',()=>{
    const f=fixture(),e=f.e,before=pose(e),world=construction(f);api.focusSelectedBuild(f.ctx);settle(f);f.canvas.getBoundingClientRect=()=>({left:0,top:0,right:320,bottom:700,width:320,height:700});e.camera.aspect=320/700;e.camera.updateProjectionMatrix();expect(e.fitCreationFocus(false)).toBe(true);expect(e._creationFocus.manual).toBe(false);expect(e._creationFocus.transition).toBe(null);expect(construction(f)).toBe(world);e.restoreCreationView();e.updateCreationFocus(.5);expect(pose(e)).toEqual(before);
  });
  it.each([0,1])('cancels queued frames on dispose after %s layout frames',frames=>{
    const f=fixture(),e=f.e;api.focusSelectedBuild(f.ctx);if(frames)flushRaf();const pending=[...rafQueue.keys()],position=e.camera.position.clone();e.disposeCreationFocus();expect(e._creationFocus).toBe(null);expect(rafQueue.size).toBe(0);expect(pending.every(id=>cancelled.includes(id))).toBe(true);flushRaf();expect(e.camera.position.equals(position)).toBe(true);expect(e.updateCreationFocus).toBe(null);expect(e.restoreCreationView).toBe(null);
  });
  it('clearWorld cancels pending focus before removing geometry',()=>{
    const f=fixture(),e=f.e;api.focusSelectedBuild(f.ctx);flushRaf();const pending=[...rafQueue.keys()];e.clearWorld();expect(e._creationFocus).toBe(null);expect(rafQueue.size).toBe(0);expect(pending.every(id=>cancelled.includes(id))).toBe(true);expect(Object.keys(e.blocks)).toHaveLength(0);flushRaf();expect(e._creationFocus).toBe(null);
  });
  it.each(['_destroyed','_guidedTour','_entryAnim','_viewPresetAnim'])('disposes focus when %s takes ownership',flag=>{
    const f=fixture(),e=f.e,before=pose(e);api.focusSelectedBuild(f.ctx);settle(f);e[flag]=true;e.updateCreationFocus(.016);expect(e._creationFocus).toBe(null);expect(e.camera.fov).toBe(before.fov);expect(e.camera.far).toBe(before.far);expect(e.camera.up.toArray()).toEqual(before.up);expect(e.scene.fog.near).toBe(before.near);
  });
  it('does not overwrite a replacement fog object on dispose',()=>{
    const f=fixture(),e=f.e;api.focusSelectedBuild(f.ctx);settle(f);const replacement=new THREE.Fog(0x123456,7,31);e.scene.fog=replacement;e.disposeCreationFocus();expect(e.scene.fog).toBe(replacement);expect([replacement.near,replacement.far]).toEqual([7,31]);
  });
  it('makes reduced-motion focus and return immediate',()=>{
    reduced=true;const f=fixture(),e=f.e,before=pose(e);api.focusSelectedBuild(f.ctx);flushRaf();flushRaf();expect(e._creationFocus.transition).toBe(null);expect(e.restoreCreationView()).toBe(true);expect(e._creationFocus).toBe(null);expect(pose(e)).toEqual(before);
  });
  it.each(['empty','stale','incomplete','no geometry','orthographic','destroyed','showcase'])('safely rejects %s selection or camera state',kind=>{
    const f=fixture(),e=f.e,before=pose(e);if(kind==='empty')e._builderSelection={blocks:[]};if(kind==='stale')e._builderSelection={blocks:[{x:99,y:99,z:99}]};if(kind==='incomplete')e.measureStructure.mockReturnValue({blocks:f.selected,isComplete:false});if(kind==='no geometry')for(const m of Object.values(e.blocks)){m.geometry.dispose();m.geometry=null;}if(kind==='orthographic')e.camera=new THREE.OrthographicCamera();if(kind==='destroyed')e._destroyed=true;if(kind==='showcase')e._showcase={};
    expect(()=>api.focusSelectedBuild(f.ctx)).not.toThrow();expect(api.focusSelectedBuild(f.ctx)).toBe(false);expect(e._creationFocus).toBeFalsy();expect(rafQueue.size).toBe(0);expect(e.releaseInput).not.toHaveBeenCalled();if(kind!=='orthographic')expect(pose(e)).toEqual(before);
  });
  it('can focus an aimed student build when there is no retained selection',()=>{
    const f=fixture({aimed:true}),e=f.e;expect(api.focusSelectedBuild(f.ctx)).toBe(true);settle(f);expect(e._creationFocus).toBeTruthy();expect(e._creationFocus.frame).toBeTruthy();expect(e._builderSelection?.blocks).toEqual(f.selected);
  });
  it('uses canonical bounds for a popped fractional block without changing its live transform',()=>{
    const f=fixture(),e=f.e,p=f.selected[1],mesh=e.blocks['1,1,0'];const ordinary=api.creationGeometryBounds(e,[p]);
    mesh.scale.setScalar(.63);mesh.userData._popT=.2;e._popBlocks=[mesh];mesh.updateMatrixWorld(true);
    const before={position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),vertices:Array.from(mesh.geometry.attributes.position.array)};
    const framed=api.creationGeometryBounds(e,[p]);expect(framed.min.toArray()).toEqual(ordinary.min.toArray());expect(framed.max.toArray()).toEqual(ordinary.max.toArray());
    expect({position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),vertices:Array.from(mesh.geometry.attributes.position.array)}).toEqual(before);
    e._popBlocks=[];const actual=api.creationGeometryBounds(e,[p]);expect(actual.getSize(new THREE.Vector3()).length()).toBeLessThan(ordinary.getSize(new THREE.Vector3()).length());
  });
  it('keeps a small elevated-ground creation focus above ground plus 2.8',()=>{
    const f=fixture(),e=f.e,mesh=e.blocks['0,2,0'];for(const m of Object.values(e.blocks))if(m!==mesh){e.scene.remove(m);m.geometry.dispose();m.material.dispose();}
    mesh.position.y=21.5;mesh.userData.gridPos.y=21;e.blocks={'0,21,0':mesh};f.selected.splice(0,f.selected.length,{x:0,y:21,z:0});e._builderSelection={blocks:f.selected.map(p=>({...p}))};e._currentLesson={ground:{y:20}};
    const before=construction(f);expect(api.focusSelectedBuild(f.ctx)).toBe(true);settle(f);expect(e.camera.position.y).toBeGreaterThanOrEqual(22.8-1e-7);expect(construction(f)).toBe(before);
  });

  it.each([false,true])('returns DOM focus to the correct control when originally collapsed=%s',collapsed=>{
    const f=fixture(),e=f.e;f.ctx.toolData.geometryWorld.sandboxDockCollapsed=collapsed;
    const control=document.createElement('button');control.className=collapsed?'gwe-collapse':'gwe-focus-action';control.textContent=collapsed?'Expand':'Focus creation';f.root.appendChild(control);
    api.focusSelectedBuild(f.ctx);settle(f);expect(document.activeElement).toBe(f.surface);e.velocity.set(3,2,1);e.moveState.forward=true;
    e.restoreCreationView();expect(e.velocity.toArray()).toEqual([0,0,0]);expect(e.moveState.forward).toBe(false);e.updateCreationFocus(.5);flushRaf();expect(document.activeElement).toBe(control);expect(e.isInputActive()).toBe(false);expect(e.flyMode).toBe(true);
  });

});

describe('framing focus yields to a newer Free Build Studio action',()=>{
 let componentFixture,app;
 const query=selector=>app.host.querySelector(selector);
 function frames(rounds=1){for(let i=0;i<rounds;i++)React.act(()=>flushRaf());}
 function timers(){React.act(()=>vi.advanceTimersByTime(0));}
 function activate(node){expect(node).toBeTruthy();React.act(()=>{node.focus();node.click();});}
 function exactState(){const state=componentFixture.worldState(app.engine);delete state.camera;return {...state,selection:JSON.stringify(app.engine._builderSelection),form:JSON.stringify(app.state())};}
 function frameCreation(){activate(app.button('Focus creation'));expect(app.engine._creationFocus).toBeTruthy();}
 function expand(){activate(query('[aria-label="Expand Free Build Studio"]'));}
 function finder(){activate(query('.gwe-tool-finder-toggle'));expect(query('.gwe-builder-dock').dataset.finder).toBe('true');}
 beforeEach(()=>{
  reduced=true;
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  new Function(builder)();api=window.StemLab.geometryWorldBuilderPure;
  const inspector=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8'),helpers=inspector.slice(inspector.indexOf('const key='),inspector.indexOf('function precedes('));
  componentFixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,worldState,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
  app=componentFixture.mount();React.act(()=>vi.advanceTimersByTime(300));frames(3);timers();rafQueue.clear();
 });
 afterEach(()=>{if(app.engine.disposeCreationFocus)app.engine.disposeCreationFocus();componentFixture.cleanup();});
 it('preserves the ordinary frame-to-world focus and intended camera movement',()=>{
  const before=exactState(),camera=app.engine.camera.position.toArray();frameCreation();frames(2);timers();
  expect(document.activeElement).toBe(query('#geoworld-fs-wrap'));expect(app.engine.camera.position.toArray()).not.toEqual(camera);
  before.form=JSON.stringify(app.state());expect(exactState()).toEqual(before);expect(app.engine._creationFocus.transition).toBeNull();
 });
 it('recognizes that a null camera transition does not mean queued framing has started',()=>{
  frameCreation();expect(app.engine._creationFocus.transition).toBeNull();expect(rafQueue.size).toBeGreaterThan(0);frames(1);expect(app.engine._creationFocus.transition).toBeNull();
  frames(1);expect(app.engine._creationFocus.frame).toBeTruthy();
 });
 it('preserves the finder search focus when framing frames arrive after Expand and Find a tool',()=>{
  frameCreation();expand();finder();const input=query('#gwe-tool-query');expect(document.activeElement).toBe(input);frames(2);const before=exactState(),camera=app.engine.camera.position.toArray();timers();
  expect(document.activeElement).toBe(input);expect(query('.gwe-builder-dock').dataset.finder).toBe('true');expect(exactState()).toEqual(before);expect(app.engine.camera.position.toArray()).toEqual(camera);
 });
 it('preserves a select result between native focus and Enter activation in the final timer gap',()=>{
  frameCreation();frames(2);expand();finder();const result=query('[data-tool="select"]');React.act(()=>result.focus());const before=exactState();timers();
  expect(document.activeElement).toBe(result);React.act(()=>document.activeElement.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:0})));frames(2);timers();
  expect(query('.gwe-builder-dock').dataset.finder).toBe('false');expect(document.activeElement).toBe(query('.gwe-direct-controls > summary'));expect(query('.gwe-direct-controls').open).toBe(true);
  before.form=JSON.stringify(app.state());expect(exactState()).toEqual(before);
 });
 it.each(['pointerdown','touchstart','keydown','click','input','change'])('remembers newer %s while automatic world focus is pending',type=>{
  frameCreation();frames(2);const control=query('.gwe-collapse');React.act(()=>control.dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Tab',bubbles:true}):new Event(type,{bubbles:true})));timers();expect(document.activeElement).not.toBe(query('#geoworld-fs-wrap'));
 });
 it('remembers genuine newer focus even if it later returns to the originating node',()=>{
  const origin=query('.gwe-collapse');React.act(()=>{origin.focus();api.focusSelectedBuild(app.ctx());});frames(2);const other=document.createElement('button');app.host.querySelector('main').appendChild(other);React.act(()=>{other.focus();origin.focus();});timers();expect(document.activeElement).toBe(origin);
 });
 it('does not focus the world after the framing state is disposed in the final task gap',()=>{
  frameCreation();frames(2);React.act(()=>app.engine.disposeCreationFocus());timers();expect(document.activeElement).not.toBe(query('#geoworld-fs-wrap'));
 });
 it('declines an opened modal without moving focus from the allowed origin',()=>{
  frameCreation();frames(2);const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');app.host.querySelector('main').appendChild(modal);timers();expect(document.activeElement).not.toBe(query('#geoworld-fs-wrap'));
 });
 it.each(['engine','lesson','transition','hidden','detached'])('declines an obsolete %s ownership at the final task',kind=>{
  frameCreation();frames(2);const engine=app.engine,root=query('#geoworld-fs-workspace');
  if(kind==='engine')window.__geoWorldEngine={};if(kind==='lesson')engine._currentLesson={sandbox:true};if(kind==='transition')engine._pendingWorldTransition=true;if(kind==='hidden')root.hidden=true;if(kind==='detached')app.host.remove();
  timers();expect(document.activeElement).not.toBe(root.querySelector('#geoworld-fs-wrap'));window.__geoWorldEngine=engine;
 });
 it('retains only the newest camera request and removes focus listeners on disposal',()=>{
  const add=vi.spyOn(document,'addEventListener'),remove=vi.spyOn(document,'removeEventListener');frameCreation();frames(2);React.act(()=>api.focusSelectedBuild(app.ctx()));frames(2);React.act(()=>app.engine.disposeCreationFocus());timers();
  const listeners=add.mock.calls.filter(call=>call[0]==='focusin').map(call=>call[1]);expect(listeners.length).toBe(2);for(const listener of listeners)expect(remove.mock.calls.some(call=>call[0]==='focusin'&&call[1]===listener)).toBe(true);expect(document.activeElement).not.toBe(query('#geoworld-fs-wrap'));
 });

 it.each([['destroyed',0],['destroyed',1],['replaced',0],['replaced',1]])('cleans owned camera focus after %s abort following %s layout frames', (kind,count)=>{
  const add=vi.spyOn(document,'addEventListener'),remove=vi.spyOn(document,'removeEventListener');frameCreation();const state=app.engine._creationFocus;if(count)frames(1);if(kind==='destroyed')app.engine._destroyed=true;else app.engine._creationFocus={replacement:true};frames(2);timers();
  const listeners=add.mock.calls.filter(call=>call[0]==='focusin').map(call=>call[1]);expect(listeners.length).toBe(1);for(const listener of listeners)expect(remove.mock.calls.some(call=>call[0]==='focusin'&&call[1]===listener)).toBe(true);expect(state.focusRequest).toBeNull();expect(rafQueue.size).toBe(0);expect(document.activeElement).not.toBe(query('#geoworld-fs-wrap'));app.engine._creationFocus=state;app.engine._destroyed=false;
 });
});
