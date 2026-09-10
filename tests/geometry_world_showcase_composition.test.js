import { describe,it,expect,vi,beforeAll,beforeEach,afterEach } from 'vitest';
import {readFileSync} from 'node:fs';

let THREE,makeShape,api,frameCallbacks,nextFrame;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;frameCallbacks=new Map();nextFrame=0;
  vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{const id=++nextFrame;frameCallbacks.set(id,callback);return id;}));
  vi.stubGlobal('cancelAnimationFrame',vi.fn(id=>frameCallbacks.delete(id)));
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
  new Function(source.replace('window.StemLab.geometryWorldBuilderPure = {','window.StemLab.geometryWorldBuilderPure = {showcaseBuildForTest:showcaseBuild,scheduleLayoutFitForTest:scheduleShowcaseLayoutFit,'))();
  api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();delete window.__geoWorldEngine;});
function rect(left,top,width,height){return {left,top,width,height,right:left+width,bottom:top+height,x:left,y:top};}
function boundsPoints(box){const result=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])result.push(new THREE.Vector3(x,y,z));return result;}
function applyFit(camera,fit,up){camera.position.copy(fit.position);camera.up.copy(up);camera.far=fit.far;camera.lookAt(fit.target);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
function assertFramed(camera,box,safe){
  const points=boundsPoints(box).map(p=>p.project(camera));
  points.forEach(p=>{expect(p.x).toBeGreaterThanOrEqual(safe.left-1e-6);expect(p.x).toBeLessThanOrEqual(safe.right+1e-6);expect(p.y).toBeGreaterThanOrEqual(safe.bottom-1e-6);expect(p.y).toBeLessThanOrEqual(safe.top+1e-6);expect(p.z).toBeGreaterThan(-1);expect(p.z).toBeLessThan(1);});return points;
}
const viewNames=['perspective','front','side','top'];
function view(name){return {direction:name==='front'?new THREE.Vector3(0,0,1):name==='side'?new THREE.Vector3(1,0,0):name==='top'?new THREE.Vector3(0,1,0):new THREE.Vector3(1.25,.72,1.55).normalize(),up:name==='top'?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,1,0)};}
function layout({width=822,height=314,left=11,top=64,caption=rect(28,12,500,44),tools=rect(30,320,784,58),orbits=true}={}){
  const workspace=document.createElement('div');workspace.id='geoworld-fs-workspace';document.body.appendChild(workspace);
  const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;workspace.appendChild(canvas);canvas.getBoundingClientRect=()=>rect(left,top,width,height);
  Object.defineProperty(canvas,'clientWidth',{get:()=>width});Object.defineProperty(canvas,'clientHeight',{get:()=>height});
  const overlay=document.createElement('section');overlay.className='gwe-showcase';workspace.appendChild(overlay);
  function control(className,area){const node=document.createElement(className.includes('orbit')?'button':'div');node.className=className;node.getBoundingClientRect=()=>area;overlay.appendChild(node);return node;}
  const captionNode=caption && control('gwe-showcase-caption',caption),toolsNode=tools && control('gwe-showcase-tools',tools);
  if(orbits){control('gwe-showcase-orbit gwe-showcase-orbit-left',rect(left+8,top+height/2-22,44,44));control('gwe-showcase-orbit gwe-showcase-orbit-right',rect(left+width-52,top+height/2-22,44,44));}
  return {canvas,overlay,captionNode,toolsNode,control,engine:{renderer:{domElement:canvas}}};
}
function fixture(){
  const layoutFixture=layout(),engine=layoutFixture.engine;
  engine.camera=new THREE.PerspectiveCamera(48,822/314,.1,200);engine.camera.position.set(4,6,12);engine.camera.rotation.set(-.25,.4,0,'YXZ');engine.camera.updateMatrixWorld(true);
  engine.scene=new THREE.Scene();engine.scene.fog=new THREE.Fog(0xa1bbae,55,145);engine.velocity=new THREE.Vector3();engine.euler=new THREE.Euler(0,0,0,'YXZ');
  engine._currentLesson={sandbox:true,ground:{y:0}};engine._undoStack=[{action:'place'}];engine._redoStack=[{action:'remove'}];engine.blocks={};
  const blocks=[{x:0,y:1,z:0,shape:'cube'},{x:1,y:1,z:0,shape:'quarter',rotation:3},{x:0,y:2,z:0,shape:'halfB'}];
  blocks.forEach(p=>{const mesh=new THREE.Mesh(makeShape(p.shape),new THREE.MeshBasicMaterial());mesh.position.set(p.x+.5,p.y+(p.shape==='cube'?.5:p.shape==='halfB'?.25:0),p.z+.5);mesh.rotation.y=(p.rotation||0)*Math.PI/2;mesh.userData={gridPos:{x:p.x,y:p.y,z:p.z},shape:p.shape,rotation:p.rotation||0,blockType:'stone',_measurementLayer:'student'};mesh.updateMatrixWorld(true);engine.blocks[[p.x,p.y,p.z].join(',')]=mesh;engine.scene.add(mesh);});
  engine._builderSelection={blocks:blocks.map(({x,y,z})=>({x,y,z}))};engine.measureStructure=(_x,_y,_z,retained)=>({blocks:retained || engine._builderSelection.blocks,count:blocks.length,isComplete:true});window.__geoWorldEngine=engine;
  const ctx={toolData:{geometryWorld:{showcaseActive:false,sandboxDockCollapsed:false}},updateMulti:vi.fn(),addToast:vi.fn()};
  return {...layoutFixture,engine,ctx,blocks};
}
function cameraState(camera){return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),fov:camera.fov,far:camera.far,zoom:camera.zoom};}
function flushFrame(){const entries=[...frameCallbacks.entries()];frameCallbacks.clear();entries.forEach(([,callback])=>callback(16));}

describe('Showcase measured composition region',()=>{
  it('uses the live canvas coordinate system and compact short-screen controls instead of a fixed 320-pixel reserve',()=>{
    const app=layout(),result=api.showcaseCompositionRect(app.engine);
    expect(result.fallback).toBe(false);expect(result.canvasRect).toEqual({left:11,top:64,width:822,height:314});
    expect(result.pixelRect).toEqual({left:62,right:760,top:12,bottom:246});
    expect(result.pixelRect.bottom-result.pixelRect.top).toBeGreaterThan(314*.7);
  });
  it('measures caption and tool rails that intersect the phone canvas, plus both orbit targets',()=>{
    const app=layout({width:306,height:628,left:7,top:60,caption:rect(20,20,225,128),tools:rect(10,556,300,132)}),result=api.showcaseCompositionRect(app.engine);
    expect(result.pixelRect).toEqual({left:62,right:244,top:98,bottom:486});
    expect(result.rect).toMatchObject({left:62/306*2-1,right:244/306*2-1,bottom:1-486/628*2,top:1-98/628*2});
  });
  it('ignores file-panel geometry and inert/aria-hidden underlying controls so opening files cannot change the framing rectangle',()=>{
    const app=layout(),before=api.showcaseCompositionRect(app.engine);
    app.control('gwe-showcase-files-backdrop',rect(0,0,844,390));app.control('gwe-showcase-files',rect(430,10,408,370));
    app.captionNode.setAttribute('aria-hidden','true');app.captionNode.setAttribute('inert','');app.toolsNode.setAttribute('aria-hidden','true');
    expect(api.showcaseCompositionRect(app.engine)).toEqual(before);
  });
  it('ignores hidden controls and uses stable CSS dimensions when the PNG drawing buffer changes',()=>{
    const app=layout({caption:rect(20,80,500,88)});app.captionNode.style.display='none';
    const before=api.showcaseCompositionRect(app.engine);app.canvas.width=2048;app.canvas.height=783;
    expect(api.showcaseCompositionRect(app.engine)).toEqual(before);expect(before.pixelRect.top).toBe(12);
  });
  it('returns a finite bounded fallback with no DOM, no dimensions, or an impossible overlapping UI',()=>{
    for(const engine of [{},{renderer:{domElement:{width:844,height:390}}},layout({caption:rect(0,0,844,390),tools:rect(0,1,844,390)}).engine]){
      const result=api.showcaseCompositionRect(engine);expect(result.fallback).toBe(true);expect(result.rect.left).toBeLessThan(result.rect.right);expect(result.rect.bottom).toBeLessThan(result.rect.top);expect(Object.values(result.rect).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('Showcase asymmetric perspective fit using actual THREE r128',()=>{
  it.each(viewNames)('fits every corner of an asymmetric creation for %s in phone, desktop and short landscape safe regions',name=>{
    const box=new THREE.Box3(new THREE.Vector3(-2,1,-1),new THREE.Vector3(5,6,3)),{direction,up}=view(name);
    for(const sample of [{aspect:306/628,safe:{left:-.59,right:.62,bottom:-.45,top:.72}},{aspect:1440/840,safe:{left:-.88,right:.9,bottom:-.69,top:.61}},{aspect:822/314,safe:{left:-.85,right:.85,bottom:-.57,top:.92}}]){
      const camera=new THREE.PerspectiveCamera(42,sample.aspect,.1,200),before=cameraState(camera),fit=api.fitShowcaseCamera(box,camera,sample.safe,direction,up,1.03);
      expect(fit).toBeTruthy();expect(cameraState(camera)).toEqual(before);applyFit(camera,fit,up);assertFramed(camera,box,fit.rect);
      expect(camera.position.y).toBeGreaterThanOrEqual(1.03-1e-8);expect(camera.position.clone().sub(fit.target).normalize().distanceTo(direction)).toBeLessThan(1e-8);
      expect(fit.depthNear).toBeGreaterThan(camera.near);expect(fit.depthFar).toBeLessThan(camera.far);
    }
  });
  it.each(viewNames)('honors camera zoom/effective FOV for %s without changing the selected bearing',name=>{
    const box=new THREE.Box3(new THREE.Vector3(0,1,0),new THREE.Vector3(8,2,4)),{direction,up}=view(name),camera=new THREE.PerspectiveCamera(42,2.5,.1,200);
    for(const zoom of [.5,1,2.4]){camera.zoom=zoom;camera.updateProjectionMatrix();const fit=api.fitShowcaseCamera(box,camera,{left:-.85,right:.82,bottom:-.48,top:.9},direction,up,1.03);expect(fit).toBeTruthy();applyFit(camera,fit,up);assertFramed(camera,box,fit.rect);expect(camera.zoom).toBe(zoom);expect(camera.position.y).toBeGreaterThanOrEqual(1.03-1e-8);}
  });
  it.each(['front','side'])('keeps a very wide shallow %s view above the Studio floor while preserving its exact cardinal direction',name=>{
    const box=new THREE.Box3(new THREE.Vector3(-24,18,-24),new THREE.Vector3(24,18.5,24)),{direction,up}=view(name),camera=new THREE.PerspectiveCamera(42,1.3,.1,200);
    const fit=api.fitShowcaseCamera(box,camera,{left:-.9,right:.9,bottom:-.15,top:.88},direction,up,18.03);
    expect(fit).toBeTruthy();applyFit(camera,fit,up);assertFramed(camera,box,fit.rect);expect(camera.position.y).toBeCloseTo(18.03,6);expect(camera.position.clone().sub(fit.target).normalize().distanceTo(direction)).toBeLessThan(1e-8);
  });
  it('uses the measured short-screen area to present a substantially larger model than the old fixed reserve',()=>{
    const box=new THREE.Box3(new THREE.Vector3(0,1,0),new THREE.Vector3(7,6,4)),{direction,up}=view('perspective'),camera=new THREE.PerspectiveCamera(42,822/314,.1,200),region=api.showcaseCompositionRect(layout().engine);
    const fit=api.fitShowcaseCamera(box,camera,region.rect,direction,up,1.03);applyFit(camera,fit,up);const points=assertFramed(camera,box,fit.rect),newHeight=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
    const center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2,right=new THREE.Vector3().crossVectors(up,direction).normalize(),viewUp=new THREE.Vector3().crossVectors(direction,right),tangent=Math.tan(42*Math.PI/360);
    let distance=radius*.4+.5;boundsPoints(box).forEach(p=>{p.sub(center);const depth=p.dot(direction);distance=Math.max(distance,depth+Math.abs(p.dot(right))/(tangent*camera.aspect*((822-128)/822)),depth+Math.abs(p.dot(viewUp))/(tangent*.25));});distance*=1.08;
    camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);camera.updateMatrixWorld(true);const old=boundsPoints(box).map(p=>p.project(camera)),oldHeight=Math.max(...old.map(p=>p.y))-Math.min(...old.map(p=>p.y));expect(newHeight/oldHeight).toBeGreaterThan(2);
  });
  it('rejects invalid bounds, singular orientation and impossible rectangles without touching the camera',()=>{
    const camera=new THREE.PerspectiveCamera(42,1,.1,200),before=cameraState(camera),box=new THREE.Box3(new THREE.Vector3(0,1,0),new THREE.Vector3(1,2,1));
    expect(api.fitShowcaseCamera(new THREE.Box3(),camera,null,new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),0)).toBeNull();
    expect(api.fitShowcaseCamera(box,camera,{left:1,right:-1,bottom:-1,top:1},new THREE.Vector3(0,0,1),new THREE.Vector3(0,1,0),0)).toBeNull();
    expect(api.fitShowcaseCamera(box,camera,null,new THREE.Vector3(0,1,0),new THREE.Vector3(0,1,0),0)).toBeNull();expect(cameraState(camera)).toEqual(before);
  });
});

describe('Showcase composition lifecycle',()=>{
  it('frames canonical unit geometry while placement pop is active without altering the mesh, history or STL',()=>{
    const app=fixture(),{engine}=app,mesh=engine.blocks['0,2,0'],original=api.creationGeometryBounds(engine,engine._builderSelection.blocks),stl=new Uint8Array(api.buildGeometryWorldStl(engine,engine._builderSelection.blocks).buffer);
    mesh.scale.setScalar(.25);mesh.userData._popT=0.1;engine._popBlocks=[mesh];const history=JSON.stringify([engine._undoStack,engine._redoStack]);api.showcaseBuildForTest(app.ctx);
    expect(engine._showcase.composition.bounds.equals(original)).toBe(true);expect(mesh.scale.toArray()).toEqual([.25,.25,.25]);expect(JSON.stringify([engine._undoStack,engine._redoStack])).toBe(history);expect(new Uint8Array(api.buildGeometryWorldStl(engine,engine._builderSelection.blocks).buffer)).toEqual(stl);
    assertFramed(engine.camera,original,engine._showcase.composition.rect);
  });
  it('refits after committed controls are available, cancels the owned frame on exit, and restores every building camera field',()=>{
    const app=fixture(),{engine}=app,original=cameraState(engine.camera),fog=[engine.scene.fog.near,engine.scene.fog.far];
    app.overlay.remove();api.showcaseBuildForTest(app.ctx);expect(engine._showcase.composition.fallback).toBe(true);
    app.canvas.parentNode.appendChild(app.overlay);api.scheduleLayoutFitForTest(engine);expect(frameCallbacks.size).toBe(1);flushFrame();expect(engine._showcase.composition.fallback).toBe(false);expect(engine._showcase.fitFrame).toBeNull();
    engine.setShowcaseView('top');api.scheduleLayoutFitForTest(engine);expect(frameCallbacks.size).toBe(1);engine.endShowcase();expect(frameCallbacks.size).toBe(0);flushFrame();expect(cameraState(engine.camera)).toEqual(original);expect([engine.scene.fog.near,engine.scene.fog.far]).toEqual(fog);expect(engine._showcase).toBeNull();
  });
  it('never changes camera when the file panel opens or the PNG export drawing buffer resizes',()=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);engine.setShowcaseView('side');const before=cameraState(engine.camera),composition=engine._showcase.composition;
    app.control('gwe-showcase-files-backdrop',rect(0,0,844,390));app.control('gwe-showcase-files',rect(430,10,408,370));engine.fitShowcase();expect(cameraState(engine.camera)).toEqual(before);
    engine._showcaseExporting=true;app.canvas.width=2048;app.canvas.height=783;expect(engine.fitShowcase()).toBe(false);expect(cameraState(engine.camera)).toEqual(before);expect(engine._showcase.composition.rect).toEqual(composition.rect);
  });
  it('guards queued layout callbacks by the owning session and unmount cleanup',()=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);const cleanup=api.scheduleLayoutFitForTest(engine);expect(frameCallbacks.size).toBe(1);cleanup();expect(frameCallbacks.size).toBe(0);
    api.scheduleLayoutFitForTest(engine);const stale=[...frameCallbacks.values()][0],pose=cameraState(engine.camera);engine._showcase={};stale();expect(cameraState(engine.camera)).toEqual(pose);
  });
});

function controlledImageSave(){
  let resolve,reject;const encoding=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'),start=source.indexOf('  function saveShowcaseImage(ctx)'),end=source.indexOf('  function measureSelectedBuild(ctx)',start);
  if(start<0 || end<start)throw new Error('Production save-image boundaries not found');
  // The renderer/encoder is covered separately. Here only its pending promise
  // is controlled; the production completion and session scheduler execute.
  const save=new Function('ENGINE_KEY','captureShowcaseImage','patchGeometryState','downloadBlob','announce','scheduleShowcaseLayoutFit',source.slice(start,end)+';return saveShowcaseImage;')('__geoWorldEngine',()=>encoding,(ctx,patch)=>ctx.updateMulti('geometryWorld',patch),vi.fn(),vi.fn(),api.scheduleLayoutFitForTest);
  return {save,resolve:()=>resolve({blob:new Blob(['png']),width:2048,height:1200}),reject:()=>reject(new Error('Encoder refused'))};
}
describe('Showcase deferred fitting during image encoding',()=>{
  it('coalesces pending view and resize requests into one fit after the image finishes',async()=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);const original=cameraState(engine.camera),encoding=controlledImageSave(),saving=encoding.save(app.ctx);
    engine.setShowcaseView('side');expect(engine._showcase.fitPending).toBe(true);expect(cameraState(engine.camera)).toEqual(original);
    app.canvas.getBoundingClientRect=()=>rect(7,60,306,628);app.captionNode.getBoundingClientRect=()=>rect(20,20,225,128);app.toolsNode.getBoundingClientRect=()=>rect(10,556,300,132);engine.camera.aspect=306/628;engine.camera.updateProjectionMatrix();
    expect(engine.fitShowcase()).toBe(false);expect(engine._showcase.composition.canvasRect.width).toBe(822);
    const fit=vi.spyOn(engine,'fitShowcase');encoding.resolve();expect(await saving).toBe(true);expect(engine._showcaseExporting).toBe(false);expect(frameCallbacks.size).toBe(1);expect(fit).not.toHaveBeenCalled();
    flushFrame();expect(fit).toHaveBeenCalledTimes(1);expect(engine._showcase.fitPending).toBe(false);expect(engine._showcase.composition.view).toBe('side');expect(engine._showcase.composition.canvasRect).toMatchObject({width:306,height:628});assertFramed(engine.camera,engine._showcase.composition.bounds,engine._showcase.composition.rect);
    expect(engine.camera.position.clone().sub(engine._showcase.composition.target).normalize().distanceTo(new THREE.Vector3(1,0,0))).toBeLessThan(1e-8);
  });
  it('applies a pending view after an encoder failure and clears busy state',async()=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);const encoding=controlledImageSave(),saving=encoding.save(app.ctx);engine.setShowcaseView('top');encoding.reject();expect(await saving).toBe(false);expect(engine._showcaseExporting).toBe(false);expect(frameCallbacks.size).toBe(1);flushFrame();expect(engine._showcase.fitPending).toBe(false);expect(engine._showcase.composition.view).toBe('top');expect(engine.camera.up.toArray()).toEqual([0,0,-1]);assertFramed(engine.camera,engine._showcase.composition.bounds,engine._showcase.composition.rect);
  });
  it.each(['before completion','after completion'])('does not move the restored building camera when Showcase exits %s',async when=>{
    const app=fixture(),{engine}=app,original=cameraState(engine.camera);api.showcaseBuildForTest(app.ctx);const encoding=controlledImageSave(),saving=encoding.save(app.ctx);engine.setShowcaseView('top');
    if(when==='before completion'){engine.endShowcase();encoding.resolve();await saving;}else{encoding.resolve();await saving;expect(frameCallbacks.size).toBe(1);engine.endShowcase();}
    expect(frameCallbacks.size).toBe(0);flushFrame();expect(engine._showcase).toBeNull();expect(cameraState(engine.camera)).toEqual(original);expect(engine._showcaseExporting).toBe(false);
  });
  it.each(['replaced','destroyed'])('never schedules camera work for an engine that was %s during encoding',async condition=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);const encoding=controlledImageSave(),saving=encoding.save(app.ctx);engine.setShowcaseView('side');const pose=cameraState(engine.camera);
    if(condition==='replaced')window.__geoWorldEngine={};else engine._destroyed=true;
    encoding.resolve();await saving;expect(frameCallbacks.size).toBe(0);flushFrame();expect(cameraState(engine.camera)).toEqual(pose);expect(engine._showcaseExporting).toBe(false);
  });
});
