import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {makeSelectionEngine}=require('./helpers/geometry_world_selection_poll_fixture.cjs');
let THREE,makeShape,api;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  // Expose the unchanged private entry point only in this evaluated fixture,
  // so the test executes the real presentation/exit closure on actual r128.
  const builder=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
  new Function(builder.replace('window.StemLab.geometryWorldBuilderPure = {','window.StemLab.geometryWorldBuilderPure = {showcaseBuildForTest:showcaseBuild,'))();
  api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{
  vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();
  for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[key];
});
const volumes={cube:1,halfA:.5,halfB:.5,quarter:.25};
const position=({x,y,z})=>({x,y,z});
const key=p=>[p.x,p.y,p.z].join(',');
function fixture(blocks,selected=blocks){
  const base=makeSelectionEngine([]),engine=base.engine;
  engine.scene=new THREE.Scene();engine.scene.fog=new THREE.Fog(0x9cbca9,55,145);
  engine.camera=new THREE.PerspectiveCamera(48,1440/900,.1,200);engine.camera.position.set(3,5,9);engine.camera.rotation.set(-.2,.4,0,'YXZ');
  engine.euler=new THREE.Euler(0,0,0,'YXZ');engine.velocity=new THREE.Vector3();engine.yaw=.4;engine.pitch=-.2;engine.flyMode=true;
  engine.renderer={domElement:{width:1440,height:900,clientWidth:1440,clientHeight:900}};
  engine._currentLesson=api.FREE_BUILD_LESSON;
  engine._undoStack=[{action:'place',x:0,y:1,z:0}];engine._redoStack=[{action:'remove',x:5,y:2,z:4}];
  function add(block){
    const shape=block.shape || 'cube',rotation=block.rotation || 0;
    base.addBlock(block,{blockType:block.type || 'stone',shape,rotation,volume:volumes[shape],_measurementLayer:block.layer || 'student',_lessonBlock:!!block.lesson});
    const mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshBasicMaterial({color:0x579783}));
    mesh.userData=engine.blocks[key(block)].userData;mesh.position.set(block.x+.5,block.y+(shape==='cube'?.5:shape==='halfB'?.25:0),block.z+.5);mesh.rotation.y=rotation*Math.PI/2;mesh.updateMatrixWorld(true);
    engine.blocks[key(block)]=mesh;engine.scene.add(mesh);return mesh;
  }
  engine.placeBlock=(x,y,z,type,shape,rotation)=>add({x,y,z,type,shape,rotation});
  engine.loadLesson=lesson=>{Object.values(engine.blocks).forEach(mesh=>engine.scene.remove(mesh));engine.blocks={};engine._undoStack=[];engine._redoStack=[];engine._currentLesson=lesson;};
  blocks.forEach(add);engine._builderSelection={blocks:selected.map(position)};window.__geoWorldEngine=engine;
  return {engine,add};
}
function context(unitMm=5){
  const state={worldActive:true,showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:false,actionFeedback:'Quarter wedge · 90°',builderPrintContext:{unitMm},selectedBlock:4,selectedShape:3,blockRotation:1};
  return {toolData:{geometryWorld:state},updates:[],addToast:vi.fn(),updateMulti(_tool,patch){this.updates.push(patch);}};
}
function worldSnapshot(engine){
  return {blocks:Object.values(engine.blocks).map(mesh=>({data:JSON.parse(JSON.stringify(mesh.userData)),position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray()})),undo:JSON.stringify(engine._undoStack),redo:JSON.stringify(engine._redoStack),flyMode:engine.flyMode};
}
function cameraSnapshot(camera){return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),fov:camera.fov,far:camera.far};}
function captureDownloads(){
  const saved={blobs:[],filenames:[]};
  vi.stubGlobal('URL',{createObjectURL(blob){saved.blobs.push(blob);return 'blob:creation';},revokeObjectURL:vi.fn()});
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){saved.filenames.push(this.download);});
  return saved;
}
async function blobBytes(blob){
  const pending=new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(blob);});
  await vi.runAllTimersAsync();return pending;
}
function stlRecords(buffer){
  const view=new DataView(buffer),count=view.getUint32(80,true),normals=[],vertices=[],attributes=[];
  for(let i=0;i<count;i++){
    normals.push([0,1,2].map(axis=>view.getFloat32(84+i*50+axis*4,true)));
    for(let vertex=0;vertex<3;vertex++)vertices.push([0,1,2].map(axis=>view.getFloat32(84+i*50+12+vertex*12+axis*4,true)));
    attributes.push(view.getUint16(84+i*50+48,true));
  }
  return {count,normals,vertices,attributes};
}

describe('portable selected Geometry World editable files',()=>{
  it('exports only the fresh selected creation, including disconnected retained parts, centered above the floor',()=>{
    const chosen=[{x:101,y:8,z:-94,shape:'quarter',type:'wood',rotation:3},{x:107,y:9,z:-92,shape:'halfB',type:'brick',rotation:2}];
    const {engine,add}=fixture([...chosen,{x:90,y:1,z:90,shape:'cube',type:'gold'},{x:101,y:7,z:-94,type:'grass',layer:'ground',lesson:true},{x:108,y:9,z:-92,type:'stone',layer:'lesson',lesson:true}],chosen);
    // This addition occurs after selection, before the polling/render cycle.
    add({x:102,y:8,z:-94,shape:'halfA',rotation:1,type:'glass'});
    const before=worldSnapshot(engine),checked=api.selectedEditableWorld(engine);
    expect(checked.ok).toBe(true);expect(checked.summary).toMatchObject({blockCount:3,bounds:{width:7,depth:3,height:2},min:{x:-3,y:1,z:-1},max:{x:3,y:2,z:1}});
    expect(checked.value).toMatchObject({schema:'alloflow-geometry-world/2',coordinateSystem:'x-right,y-up,z-depth'});
    expect(checked.value.blocks).toEqual([{x:-3,y:1,z:-1,type:'wood',shape:'quarter',rotation:3},{x:-2,y:1,z:-1,type:'glass',shape:'halfA',rotation:1},{x:3,y:2,z:1,type:'brick',shape:'halfB',rotation:2}]);
    expect(worldSnapshot(engine)).toEqual(before);expect(engine._builderSelection.blocks).toHaveLength(3);
  });
  it('imports the portable file into a fresh sandbox with the exact same printable geometry',()=>{
    const blocks=[{x:-44,y:12,z:39,shape:'cube',type:'stone',rotation:0},{x:-43,y:12,z:39,shape:'halfA',type:'glass',rotation:2},{x:-42,y:12,z:39,shape:'quarter',type:'wood',rotation:1}];
    const {engine}=fixture(blocks),original=stlRecords(api.buildGeometryWorldStl(engine,blocks).buffer),checked=api.selectedEditableWorld(engine);
    const restored=fixture([]).engine;expect(api.restoreEditableWorld(restored,checked.value).ok).toBe(true);
    const imported=stlRecords(api.buildGeometryWorldStl(restored,checked.value.blocks).buffer);
    // Recentering changes floating-point cancellation at world-space rotations;
    // compare every resulting triangle, normal and vertex in physical units.
    expect(imported.count).toBe(original.count);expect(imported.attributes).toEqual(original.attributes);
    for(const field of ['normals','vertices'])imported[field].forEach((p,i)=>p.forEach((value,axis)=>expect(value).toBeCloseTo(original[field][i][axis],6)));
    expect(restored._undoStack).toEqual([]);expect(restored._redoStack).toEqual([]);expect(restored.blocksPlaced).toBe(3);
  });
  it.each(['missing','stale','incomplete'])('rejects %s selection without exporting whichever build is aimed at',mode=>{
    const {engine}=fixture([{x:8,y:1,z:8}]),aim=engine.blockUnderCrosshair=vi.fn(()=>({object:engine.blocks['8,1,8']}));
    if(mode==='missing')engine._builderSelection=null;
    if(mode==='stale')engine._builderSelection={blocks:[{x:99,y:1,z:99}]};
    if(mode==='incomplete')engine.measureStructure=()=>({blocks:[{x:8,y:1,z:8}],isComplete:false});
    const before=worldSnapshot(engine),checked=api.selectedEditableWorld(engine);
    expect(checked.ok).toBe(false);expect(checked.error).toBeTruthy();expect(aim).not.toHaveBeenCalled();expect(worldSnapshot(engine)).toEqual(before);
  });
  it('rejects a selected span that cannot fit the portable schema without clipping or moving the world',()=>{
    const {engine}=fixture([{x:-70,y:1,z:0},{x:70,y:1,z:0}]),before=worldSnapshot(engine);
    expect(api.selectedEditableWorld(engine)).toMatchObject({ok:false});expect(worldSnapshot(engine)).toEqual(before);
  });
  it('downloads validated JSON and stays in the exact current Showcase without replacing pending work',async()=>{
    const {engine}=fixture([{x:3,y:7,z:6,shape:'quarter',rotation:3,type:'wood'}]),ctx=context(),downloads=captureDownloads();
    api.showcaseBuildForTest(ctx);engine.setShowcaseView('top');const presentation=engine._showcase,pose=cameraSnapshot(engine.camera),before=worldSnapshot(engine);
    const pending=window.__alloPrintLabPendingHandoff={sentinel:'pending'},returnProject=window.__alloGeometryWorldReturnProject={sentinel:'return'};
    expect(api.saveSelectedEditableWorld(ctx)).toBe(true);
    const parsed=JSON.parse(new TextDecoder().decode(await blobBytes(downloads.blobs[0])));
    expect(api.normalizeEditableWorld(parsed).ok).toBe(true);expect(parsed.blocks).toEqual([{x:0,y:1,z:0,type:'wood',shape:'quarter',rotation:3}]);
    expect(downloads.filenames).toEqual(['geometry-world-selected-creation-editable.json']);expect(engine._showcase).toBe(presentation);expect(cameraSnapshot(engine.camera)).toEqual(pose);expect(worldSnapshot(engine)).toEqual(before);
    expect(window.__alloPrintLabPendingHandoff).toBe(pending);expect(window.__alloGeometryWorldReturnProject).toBe(returnProject);
  });
});

describe('selected STL download scale and lifecycle',()=>{
  it.each([.01,5,12.5,1000])('scales a binary copy by %s mm per block, preserving normals, attributes and source bytes',unit=>{
    const blocks=[{x:0,y:1,z:0},{x:1,y:1,z:0,shape:'quarter',rotation:1}],{engine}=fixture(blocks),buffer=api.buildGeometryWorldStl(engine,blocks).buffer;
    new DataView(buffer).setUint16(84+48,17,true);
    const bytes=Array.from(new Uint8Array(buffer)),before=stlRecords(buffer),scaled=api.scaleStlForDownload(buffer,unit),after=stlRecords(scaled);
    expect(scaled).not.toBe(buffer);expect(Array.from(new Uint8Array(buffer))).toEqual(bytes);expect(after.count).toBe(before.count);expect(after.normals).toEqual(before.normals);expect(after.attributes).toEqual(before.attributes);
    after.vertices.forEach((p,i)=>p.forEach((value,axis)=>expect(value).toBeCloseTo(before.vertices[i][axis]*unit,4)));
    expect(String.fromCharCode(...new Uint8Array(scaled,0,80))).toContain(unit+' mm per block');
  });
  it('rejects truncated binary triangles before creating a download',()=>{
    expect(()=>api.scaleStlForDownload(new ArrayBuffer(20),5)).toThrow('incomplete');
    const buffer=new ArrayBuffer(84);new DataView(buffer).setUint32(80,2,true);expect(()=>api.scaleStlForDownload(buffer,5)).toThrow('incomplete');
  });
  it('downloads only the live selected bundle at the current print scale and leaves Showcase open',async()=>{
    const blocks=[{x:3,y:5,z:8,shape:'cube'},{x:4,y:5,z:8,shape:'halfB',type:'glass',rotation:2}],{engine}=fixture([...blocks,{x:-9,y:1,z:-9,type:'gold'}],blocks),ctx=context(12.5),downloads=captureDownloads();
    api.showcaseBuildForTest(ctx);engine.setShowcaseView('side');const presentation=engine._showcase,pose=cameraSnapshot(engine.camera),before=worldSnapshot(engine);
    const pending=window.__alloPrintLabPendingHandoff={sentinel:1},returnProject=window.__alloGeometryWorldReturnProject={sentinel:2};
    const expected=api.scaleStlForDownload(api.buildGeometryWorldStl(engine,blocks,{title:'Geometry World selected build'}).buffer,12.5);
    expect(api.selectedBuildStlDownload(ctx)).toBe(true);expect(downloads.filenames).toEqual(['geometry-world-selected-build-mm.stl']);
    expect(new Uint8Array(await blobBytes(downloads.blobs[0]))).toEqual(new Uint8Array(expected));
    expect(engine._showcase).toBe(presentation);expect(cameraSnapshot(engine.camera)).toEqual(pose);expect(worldSnapshot(engine)).toEqual(before);
    expect(window.__alloPrintLabPendingHandoff).toBe(pending);expect(window.__alloGeometryWorldReturnProject).toBe(returnProject);expect(ctx.addToast.mock.calls.at(-1)[0]).toContain('12.5 mm per block');
  });
  it.each(['saveSelectedEditableWorld','selectedBuildStlDownload'])('%s returns false and cleans its temporary link when downloading fails',method=>{
    const {engine}=fixture([{x:0,y:1,z:0}]),ctx=context();captureDownloads();api.showcaseBuildForTest(ctx);const presentation=engine._showcase;
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{throw new Error('Download refused');});
    expect(api[method](ctx)).toBe(false);expect(document.querySelector('a[download]')).toBeNull();expect(engine._showcase).toBe(presentation);expect(ctx.addToast.mock.calls.at(-1)).toEqual(['Download refused','error']);
  });
  it('does not use an aimed fallback when a direct STL selection disappears',()=>{
    const {engine}=fixture([{x:9,y:1,z:9}]),downloads=captureDownloads();engine._builderSelection=null;engine.blockUnderCrosshair=vi.fn(()=>({object:engine.blocks['9,1,9']}));
    expect(api.selectedBuildStlDownload(context())).toBe(false);expect(downloads.blobs).toEqual([]);expect(engine.blockUnderCrosshair).not.toHaveBeenCalled();expect(window.__alloPrintLabPendingHandoff).toBeUndefined();expect(window.__alloGeometryWorldReturnProject).toBeUndefined();
  });
});

describe('Showcase file operation guards and Print Lab return camera',()=>{
  it.each(['saveSelectedEditableWorld','selectedBuildStlDownload','openSelectedBuildInPrintLab'])('%s rejects same-tick activation while a Showcase image is encoding',method=>{
    const {engine}=fixture([{x:0,y:1,z:0}]),ctx=context(),downloads=captureDownloads();ctx.setStemLabTool=vi.fn();
    api.showcaseBuildForTest(ctx);engine._showcaseExporting=true;const presentation=engine._showcase,pose=cameraSnapshot(engine.camera);engine.measureStructure=vi.fn(engine.measureStructure);
    const pending=window.__alloPrintLabPendingHandoff={sentinel:1},returnProject=window.__alloGeometryWorldReturnProject={sentinel:2};
    expect(api[method](ctx)).toBe(false);expect(engine.measureStructure).not.toHaveBeenCalled();expect(ctx.setStemLabTool).not.toHaveBeenCalled();expect(downloads.blobs).toEqual([]);expect(engine._showcase).toBe(presentation);expect(cameraSnapshot(engine.camera)).toEqual(pose);
    expect(window.__alloPrintLabPendingHandoff).toBe(pending);expect(window.__alloGeometryWorldReturnProject).toBe(returnProject);
  });
  it.each([false,true])('captures the restored building camera and pre-Showcase dock state despite stale React state (collapsed=%s)',collapsed=>{
    const selected=[{x:0,y:1,z:0,shape:'cube'},{x:1,y:1,z:0,shape:'quarter',rotation:3}],all=[...selected,{x:9,y:3,z:-7,shape:'halfB',rotation:2,type:'wood'}],{engine}=fixture(all,selected),ctx=context(10);
    ctx.toolData.geometryWorld.sandboxDockCollapsed=collapsed;const buildingPose=cameraSnapshot(engine.camera),before=worldSnapshot(engine),wholeStl=new Uint8Array(api.buildGeometryWorldStl(engine,all).buffer),selectedStl=new Uint8Array(api.buildGeometryWorldStl(engine,selected,{title:'Geometry World selected build'}).buffer);
    api.showcaseBuildForTest(ctx);engine.setShowcaseView('top');expect(cameraSnapshot(engine.camera)).not.toEqual(buildingPose);
    // updateMulti deliberately does not mutate ctx synchronously, as with React.
    Object.assign(ctx.toolData.geometryWorld,{showcaseActive:true,showcaseSaving:true,sandboxDockCollapsed:true});
    ctx.setStemLabTool=vi.fn(()=>{expect(engine._showcase).toBeNull();expect(cameraSnapshot(engine.camera)).toEqual(buildingPose);});
    api.openSelectedBuildInPrintLab(ctx);expect(ctx.setStemLabTool).toHaveBeenCalledWith('printLab');
    const saved=window.__alloGeometryWorldReturnProject,handoff=window.__alloPrintLabPendingHandoff;
    expect(saved.state).toMatchObject({showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:collapsed,actionFeedback:'',selectedBlock:4,selectedShape:3,blockRotation:1});
    expect(saved.camera).toEqual(buildingPose.position);expect(saved.cameraQuaternion).toEqual(buildingPose.quaternion);expect(new Uint8Array(handoff.bytes)).toEqual(selectedStl);expect(handoff.unitMm).toBe(10);expect(worldSnapshot(engine)).toEqual(before);
    engine.loadLesson(api.FREE_BUILD_LESSON);engine.camera.position.set(0,0,0);engine.camera.quaternion.identity();
    expect(api.restoreProject(ctx,engine,{projectId:handoff.projectId,printContext:{unitMm:10}})).toBe(true);
    expect(cameraSnapshot(engine.camera)).toEqual(buildingPose);expect(worldSnapshot(engine)).toEqual(before);expect(new Uint8Array(api.buildGeometryWorldStl(engine,all).buffer)).toEqual(wholeStl);
    expect(ctx.updates.at(-1)).toMatchObject({showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:collapsed});
  });
  it('keeps presentation and pending work intact when the selected bundle cannot be prepared',()=>{
    const {engine}=fixture([{x:0,y:1,z:0}]),ctx=context();ctx.setStemLabTool=vi.fn();api.showcaseBuildForTest(ctx);
    const presentation=engine._showcase,pose=cameraSnapshot(engine.camera),pending=window.__alloPrintLabPendingHandoff={sentinel:1};
    engine.blocks['0,1,0'].geometry=new THREE.BufferGeometry();
    api.openSelectedBuildInPrintLab(ctx);expect(ctx.setStemLabTool).not.toHaveBeenCalled();expect(engine._showcase).toBe(presentation);expect(cameraSnapshot(engine.camera)).toEqual(pose);expect(window.__alloPrintLabPendingHandoff).toBe(pending);expect(window.__alloGeometryWorldReturnProject).toBeUndefined();
  });
  it('does not silently send an unrelated aimed creation if a Showcase selection has disappeared',()=>{
    const {engine}=fixture([{x:0,y:1,z:0},{x:9,y:1,z:9}],[{x:0,y:1,z:0}]),ctx=context();ctx.setStemLabTool=vi.fn();api.showcaseBuildForTest(ctx);
    delete engine.blocks['0,1,0'];engine.blockUnderCrosshair=vi.fn(()=>({object:engine.blocks['9,1,9']}));const presentation=engine._showcase;
    expect(api.openSelectedBuildInPrintLab(ctx)).toBe(false);expect(engine.blockUnderCrosshair).not.toHaveBeenCalled();expect(ctx.setStemLabTool).not.toHaveBeenCalled();expect(engine._showcase).toBe(presentation);expect(window.__alloPrintLabPendingHandoff).toBeUndefined();
  });
});
