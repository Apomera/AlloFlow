import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const {act}=require(resolve(process.cwd(),'desktop/web-app/node_modules/react-dom/test-utils'));
const {makeSelectionEngine}=require('./helpers/geometry_world_selection_poll_fixture.cjs');
const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const clean={components:1,openEdges:0,nonManifoldEdges:0};
let api,lab,mounted,resources;
beforeEach(()=>{
  vi.useFakeTimers();resources=[];window.THREE=THREE;lab=resetStemLab();
  lab.registerTool('geometryWorld',{aliases:[],render(){return React.createElement('main',{id:'geoworld-fs-workspace'},React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const s=document.createElement('style');s.id='allo-geometryworld-builder-css';document.head.appendChild(s);}
  new Function(source)();api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{
  if(mounted){act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}
  for(const object of resources){object.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});}
  delete window.__geoWorldEngine;delete window.THREE;vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
});
function frame(box,check=clean){const object=api.createSelectionFrame(box,check);if(object)resources.push(object);return object;}
function bounds(object){object.geometry.computeBoundingBox();return object.geometry.boundingBox;}
function fixture(){
  const f=makeSelectionEngine([{x:0,y:1,z:0}]),engine=f.engine;
  Object.assign(engine,{scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(65,1.5,.1,200),_currentLesson:api.FREE_BUILD_LESSON,loadLesson:vi.fn(),_popBlocks:[]});
  const data=engine.blocks['0,1,0'].userData,mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial());
  mesh.position.set(.5,1.5,.5);mesh.userData=data;engine.blocks['0,1,0']=mesh;engine.scene.add(mesh);resources.push(mesh);
  const canvas=document.createElement('canvas');engine.renderer={domElement:canvas};engine.camera.position.set(4,4,6);
  return {...f,mesh};
}
function mount(f){
  window.__geoWorldEngine=f.engine;
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);
  function Host(){
    const [toolData,setToolData]=React.useState({geometryWorld:{worldActive:true,activeLesson:'builderSandbox',builderPanel:'build'}});
    return lab._registry.geometryWorld.render(makeCtx({toolData,setToolData,
      update:(key,value)=>setToolData(old=>({...old,[key]:value})),
      updateMulti:(key,patch)=>setToolData(old=>({...old,[key]:{...old[key],...patch}}))}));
  }
  act(()=>root.render(React.createElement(Host)));mounted={host,root};
  return()=>f.engine.scene.getObjectByName('gwe-selection-frame');
}

describe('selection corner frame geometry and review classification',()=>{
  it.each([
    ['healthy',clean,false],['missing',null,true],['missing topology',{components:1},true],
    ['unknown component count',{openEdges:0,nonManifoldEdges:0},true],
    ['empty',{...clean,components:0},true],['disconnected',{...clean,components:2},true],
    ['open mesh',{...clean,openEdges:4},true],['non-manifold',{...clean,nonManifoldEdges:2},true],
    ['export error',{...clean,error:'Unsupported shape'},true],
  ])('classifies %s without calling an incomplete result healthy',(_name,check,review)=>{
    if(check)Object.freeze(check);
    expect(api.selectionNeedsReview(check)).toBe(review);
    const object=frame(new THREE.Box3(new THREE.Vector3(0,1,0),new THREE.Vector3(1,2,1)),check);
    expect(object.userData.needsReview).toBe(review);
    const color=new THREE.Color(review?0xf1c67d:0xd4e8ca).convertSRGBToLinear();
    expect(object.material.color.toArray()).toEqual(color.toArray());
  });

  it.each([
    ['cube',[0,1,0],[1,2,1]],['rotated fractional bounds',[-3.5,2.25,8.125],[-1,2.75,8.875]],
    ['tall',[100,12,-8],[101,140,-7]],['wide',[-64,1,-3],[64,1.5,4]],
  ])('draws exactly 24 short corner segments within the canonical %s bounds',(_name,low,high)=>{
    const box=new THREE.Box3(new THREE.Vector3(...low),new THREE.Vector3(...high)),before=box.clone(),object=frame(box),positions=object.geometry.attributes.position;
    expect(object.isLineSegments).toBe(true);expect(object.children).toHaveLength(0);expect(positions.count).toBe(48);
    expect(box.equals(before)).toBe(true);
    const size=box.getSize(new THREE.Vector3()),extent=Math.max(size.x,size.y,size.z);let drawnLength=0;
    for(let i=0;i<positions.count;i+=2){
      const a=new THREE.Vector3().fromBufferAttribute(positions,i),b=new THREE.Vector3().fromBufferAttribute(positions,i+1),delta=b.clone().sub(a);
      expect([delta.x,delta.y,delta.z].filter(n=>Math.abs(n)>1e-5)).toHaveLength(1);
      for(let axis=0;axis<3;axis++){
        expect(Math.min(Math.abs(a.getComponent(axis)-low[axis]),Math.abs(a.getComponent(axis)-high[axis]))).toBeLessThan(1e-5);
        expect(b.getComponent(axis)).toBeGreaterThanOrEqual(low[axis]-1e-5);expect(b.getComponent(axis)).toBeLessThanOrEqual(high[axis]+1e-5);
      }
      expect(a.distanceTo(b)).toBeLessThanOrEqual(extent*.06+1e-5);drawnLength+=a.distanceTo(b);
    }
    expect(drawnLength).toBeLessThan((size.x+size.y+size.z)*4*.41);
    expect(bounds(object).min.toArray()).toEqual(low);expect(bounds(object).max.toArray()).toEqual(high);
    expect(object.material.depthWrite).toBe(false);expect(object.material.toneMapped).toBe(false);expect(object.userData.gwDecorative).toBe(true);
    const hits=[];object.raycast(new THREE.Raycaster(),hits);expect(hits).toEqual([]);
  });

  it('declines empty or non-finite bounds without allocating a frame',()=>{
    expect(frame(new THREE.Box3())).toBeNull();
    expect(frame(new THREE.Box3(new THREE.Vector3(0,0,0),new THREE.Vector3(Infinity,1,1)))).toBeNull();
  });
});

describe('mounted retained selection frame lifecycle',()=>{
  it('uses full construction bounds during placement pop and ignores decorative children',()=>{
    const f=fixture();f.mesh.scale.setScalar(.7);f.engine._popBlocks=[f.mesh];
    const decoration=new THREE.Mesh(new THREE.BoxGeometry(20,20,20),new THREE.MeshBasicMaterial());f.mesh.add(decoration);
    const getFrame=mount(f),object=getFrame();
    expect(bounds(object).min.toArray()).toEqual([0,1,0]);expect(bounds(object).max.toArray()).toEqual([1,2,1]);
    const created=f.stats.measurements;
    f.mesh.scale.setScalar(1);f.engine._popBlocks=[];act(()=>vi.advanceTimersByTime(1000));
    expect(getFrame()).toBe(object);expect(f.stats.measurements).toBe(created);
    expect(bounds(object).max.toArray()).toEqual([1,2,1]);
  });

  it('retains exact mesh/STL/history data while remaining in Focus and hiding for Showcase',()=>{
    const f=fixture();f.engine._undoStack=[{action:'place',x:0,y:1,z:0}];f.engine._redoStack=[{action:'remove',x:1,y:1,z:0}];
    function snapshot(){return JSON.stringify({position:f.mesh.position.toArray(),quaternion:f.mesh.quaternion.toArray(),scale:f.mesh.scale.toArray(),visible:f.mesh.visible,data:f.mesh.userData,vertices:Array.from(f.mesh.geometry.attributes.position.array),undo:f.engine._undoStack,redo:f.engine._redoStack,stl:createHash('sha256').update(Buffer.from(api.buildGeometryWorldStl(f.engine,f.engine._builderSelection.blocks).buffer)).digest('hex')});}
    const before=snapshot(),getFrame=mount(f),object=getFrame();
    f.engine._creationFocus={};act(()=>vi.advanceTimersByTime(250));expect(object.visible).toBe(true);
    f.engine._showcase={hidden:[]};act(()=>vi.advanceTimersByTime(250));expect(object.visible).toBe(false);
    f.engine._showcase=null;act(()=>vi.advanceTimersByTime(250));expect(object.visible).toBe(true);
    expect(getFrame()).toBe(object);expect(snapshot()).toBe(before);
  });

  it('replaces and disposes the old frame once on metadata change, then clears it on deselection',()=>{
    const f=fixture(),getFrame=mount(f),old=getFrame(),disposedGeo=vi.fn(),disposedMaterial=vi.fn();
    old.geometry.addEventListener('dispose',disposedGeo);old.material.addEventListener('dispose',disposedMaterial);
    f.mesh.userData.blockType='wood';act(()=>vi.advanceTimersByTime(250));const fresh=getFrame();
    expect(fresh).not.toBe(old);expect(old.parent).toBeNull();expect(disposedGeo).toHaveBeenCalledOnce();expect(disposedMaterial).toHaveBeenCalledOnce();
    const freshDisposed=vi.fn();fresh.geometry.addEventListener('dispose',freshDisposed);
    f.engine._builderSelection=null;act(()=>vi.advanceTimersByTime(250));expect(getFrame()).toBeUndefined();expect(freshDisposed).toHaveBeenCalledOnce();
    act(()=>vi.advanceTimersByTime(1000));expect(freshDisposed).toHaveBeenCalledOnce();
  });

  it.each(['meadow','studio'])('hides and restores the current frame synchronously for Showcase %s',look=>{
    vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(()=>({beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},fillRect(){},drawImage(){},createRadialGradient(){return{addColorStop(){}};}}));
    const f=fixture(),getFrame=mount(f),old=getFrame();
    expect(f.engine._builderSelectionFrame).toBe(old);
    const button=[...mounted.host.querySelectorAll('button')].find(b=>b.textContent==='Showcase creation');expect(button).toBeTruthy();
    act(()=>button.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    // No timer advance: the first Showcase render must already omit the frame.
    expect(f.engine._showcase).toBeTruthy();expect(old.visible).toBe(false);
    if(look==='studio')act(()=>f.engine.setShowcaseLook('studio'));
    expect((f.engine._showcase.hidden||[]).some(row=>row[0]===old)).toBe(false);
    if(look==='studio')expect(f.engine._showcase.studio.hidden.some(row=>row[0]===old)).toBe(false);
    // Rebuilding this owned decoration during the session must not place it in
    // an old restoration list or make it appear in the next render.
    f.mesh.userData.blockType='wood';act(()=>vi.advanceTimersByTime(250));
    const current=getFrame();expect(current).not.toBe(old);expect(old.parent).toBeNull();expect(current.visible).toBe(false);
    expect(f.engine._builderSelectionFrame).toBe(current);
    act(()=>f.engine.endShowcase());
    // Again, no timer advance after exit: restore the current frame immediately.
    expect(current.visible).toBe(true);expect(old.visible).toBe(false);expect(old.parent).toBeNull();
  });

  it('never restores a frame removed during Showcase',()=>{
    const f=fixture(),getFrame=mount(f),old=getFrame(),disposed=vi.fn();old.geometry.addEventListener('dispose',disposed);
    const button=[...mounted.host.querySelectorAll('button')].find(b=>b.textContent==='Showcase creation');
    act(()=>button.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    // Exercise cleanup defensively even if a legacy restoration list contained it.
    f.engine._showcase.hidden.push([old,true]);
    f.engine._builderSelection=null;act(()=>vi.advanceTimersByTime(250));
    expect(f.engine._builderSelectionFrame).toBeUndefined();expect(getFrame()).toBeUndefined();expect(disposed).toHaveBeenCalledOnce();
    expect(f.engine._showcase.hidden.some(row=>row[0]===old)).toBe(false);
    act(()=>f.engine.endShowcase());expect(old.visible).toBe(false);expect(old.parent).toBeNull();
  });

  it('unregisters the previous engine frame when the live engine changes',()=>{
    const first=fixture(),old=mount(first)(),second=fixture(),disposed=vi.fn();old.geometry.addEventListener('dispose',disposed);
    window.__geoWorldEngine=second.engine;act(()=>vi.advanceTimersByTime(250));
    expect(first.engine._builderSelectionFrame).toBeUndefined();expect(old.parent).toBeNull();expect(disposed).toHaveBeenCalledOnce();
    expect(second.engine._builderSelectionFrame).toBe(second.engine.scene.getObjectByName('gwe-selection-frame'));
  });

  it('disposes the owned frame on unmount without disposing construction geometry',()=>{
    const f=fixture(),object=mount(f)(),frameDisposed=vi.fn(),meshDisposed=vi.fn();
    object.geometry.addEventListener('dispose',frameDisposed);f.mesh.geometry.addEventListener('dispose',meshDisposed);
    act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;
    expect(object.parent).toBeNull();expect(f.engine._builderSelectionFrame).toBeUndefined();expect(frameDisposed).toHaveBeenCalledOnce();expect(meshDisposed).not.toHaveBeenCalled();
  });
});
