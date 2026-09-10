import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

let THREE, builder, printable, makeShape, print;
beforeAll(() => {
  const exports = {};
  new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});
  THREE=exports; window.THREE=THREE;
  window.StemLab={_registry:{geometryWorld:{render(){return null;}}},registerTool(id,cfg){this._registry[id]=cfg;}};
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  builder=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(source.slice(source.indexOf('  function createShapeGeometry('),source.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
  window.AlloModules={};new Function(readFileSync('printable_model_module.js','utf8'))();printable=window.AlloModules.PrintableModel;
  new Function(readFileSync('stem_lab/stem_tool_printlab.js','utf8'))();print=window.StemLab.printLabPure;
});
afterEach(()=>{delete window.__alloGeometryWorldReturnProject;delete window.__alloPrintLabPendingHandoff;delete window.__alloGeometryWorldPendingBuild;delete window.__geoWorldEngine;});
const volumes={cube:1,halfA:0.5,halfB:0.5,quarter:0.25};
function engineFor(blocks){
  const en={blocks:{},_undoStack:[],_redoStack:[],camera:new THREE.PerspectiveCamera(),velocity:new THREE.Vector3(),_currentLesson:builder.FREE_BUILD_LESSON};
  en.placeBlock=(x,y,z,type='stone',shape='cube',rotation=0)=>{
    const mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshBasicMaterial());
    mesh.position.set(x+0.5,y+(shape==='cube'?0.5:shape==='halfB'?0.25:0),z+0.5);
    mesh.rotation.y=rotation*Math.PI/2;
    mesh.userData={blockType:type,shape,rotation,volume:volumes[shape],gridPos:{x,y,z}};
    mesh.updateMatrixWorld(true);en.blocks[[x,y,z].join(',')]=mesh;
  };
  en.loadLesson=lesson=>{en.blocks={};en._currentLesson=lesson;en._undoStack=[];en._redoStack=[];};
  blocks.forEach(b=>en.placeBlock(b.x,b.y,b.z,b.type,b.shape,b.rotation));
  return en;
}
function inspect(blocks,unit=5,profile){const en=engineFor(blocks);const bundle=builder.buildGeometryWorldStl(en,blocks);return {en,bundle,report:printable.inspectStl(bundle.buffer,unit,profile)};}
describe('Geometry World production build-to-print geometry',()=>{
  it('agrees on asymmetric physical dimensions across the bridge and the STL reader',()=>{
    const blocks=Array.from({length:24},(_,i)=>({x:i%2,y:1+Math.floor(i/6),z:Math.floor(i/2)%3,shape:'cube'}));
    const {bundle,report}=inspect(blocks);
    const handoff=print.readPendingLocalHandoff({schema:'alloflow-print-source/1',sourceTool:'geometryWorld',format:'STL',bytes:new Uint8Array(bundle.buffer),sourceModel:bundle.sourceModel,unitMm:5,coordinateSystem:'z-up'});
    expect(report.dimensionsMm).toEqual({width:10,depth:15,height:20});
    expect(handoff.summary.meshDimensions).toEqual({L:2,W:3,H:4});
    expect(report.enclosedVolumeMm3).toBe(3000);
    const large=printable.inspectStl(bundle.buffer,20,{bedWidthMm:220,bedDepthMm:70,bedHeightMm:250});
    expect(large.status).toBe('PASS');expect(large.dimensionsMm).toEqual({width:40,depth:60,height:80});
  });
  it('joins a half slab beside a cube into one closed mesh without changing volume',()=>{
    const {bundle,report}=inspect([{x:0,y:1,z:0,shape:'cube'},{x:1,y:1,z:0,shape:'halfB'}]);
    expect(bundle.connectedComponents).toBe(1);expect(report.status).toBe('PASS');
    expect(report.nonManifoldEdges).toBe(0);expect(report.openEdges).toBe(0);expect(report.enclosedVolumeMm3).toBeCloseTo(187.5,4);
  });
  it('identifies the actual gap above a half slab',()=>{
    const {bundle,report}=inspect([{x:0,y:1,z:0,shape:'halfB'},{x:0,y:2,z:0,shape:'cube'}]);
    expect(bundle.connectedComponents).toBe(2);expect(report.connectedComponents).toBe(2);expect(report.issues.some(i=>i.code==='MULTIPLE_SHELLS')).toBe(true);
  });
  it('preserves volumes and closes all area-connected shape pairs across rotations and axes',()=>{
    for(const shapeA of Object.keys(volumes))for(const shapeB of Object.keys(volumes))for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(const axis of ['x','y','z']){
      const first={x:0,y:1,z:0,shape:shapeA,rotation:a},second={x:0,y:1,z:0,shape:shapeB,rotation:b};second[axis]++;
      const {bundle,report}=inspect([first,second],1);
      const label=[shapeA,a,shapeB,b,axis].join('/');
      expect(report.signedVolumeMm3,label).toBeCloseTo(volumes[shapeA]+volumes[shapeB],3);
      if(bundle.connectedComponents===1){expect(report.openEdges,label).toBe(0);expect(report.nonManifoldEdges,label).toBe(0);expect(report.windingInconsistencies,label).toBe(0);}
    }
  });
  it('joins a mixed row to a continuous base without open edges',()=>{
    const blocks=[];for(let x=0;x<4;x++){blocks.push({x,y:1,z:0,shape:'cube'});blocks.push({x,y:2,z:0,shape:Object.keys(volumes)[x],rotation:0});}
    const {report}=inspect(blocks,1);expect(report.status).toBe('PASS');expect(report.enclosedVolumeMm3).toBeCloseTo(6.25,3);
  });
  it('creates a source file that the editable-world importer accepts',()=>{
    const {bundle}=inspect([{x:12,y:6,z:-7,shape:'quarter',rotation:3},{x:13,y:6,z:-7,shape:'cube',rotation:0}]);
    const editable=print.editableGeometrySource(bundle.sourceModel);expect(builder.normalizeEditableWorld(editable).ok).toBe(true);
    expect(editable.blocks.map(b=>b.shape)).toEqual(['quarter','cube']);expect(Math.min(...editable.blocks.map(b=>b.y))).toBe(1);
  });
  it('preserves a genuine pinched edge warning in a dense mixed sculpture',()=>{
    const blocks=[];for(let x=0;x<4;x++)for(let z=0;z<4;z++){blocks.push({x,y:1,z,shape:'cube'});blocks.push({x,y:2,z,shape:Object.keys(volumes)[(x+z)%4],rotation:x%4});}
    const {report,bundle}=inspect(blocks,1);expect(report.openEdges).toBe(0);expect(report.nonManifoldEdges).toBeGreaterThan(0);expect(bundle.topology.nonManifoldEdges).toBe(report.nonManifoldEdges);expect(report.enclosedVolumeMm3).toBeNull();expect(report.signedVolumeMm3).toBeCloseTo(blocks.reduce((v,b)=>v+volumes[b.shape],0),3);
  });
});
describe('Geometry World local project continuity',()=>{
  it('restores every creation, positions, history, camera, and chosen print scale',()=>{
    const blocks=[{x:0,y:1,z:0,shape:'cube',type:'stone',rotation:0},{x:8,y:1,z:8,shape:'quarter',type:'wood',rotation:1}];
    const en=engineFor(blocks);en._undoStack=[{action:'place',...blocks[1]}];en._redoStack=[{action:'remove',...blocks[0]}];en.blocksPlaced=2;en.camera.position.set(2,5,9);en.yaw=0.4;en.pitch=-0.2;en.flyMode=true;
    en._builderSelection={blocks:[blocks[0]]};
    let state={activeLesson:'builderSandbox',worldActive:true};
    const ctx={toolData:{geometryWorld:state},updateMulti(_,patch){state={...state,...patch};},addToast(){}};
    window.__alloGeometryWorldReturnProject=builder.captureProject(ctx,en,'project-a');
    en.loadLesson(builder.FREE_BUILD_LESSON);en.measureStructure=(x,y,z)=>({blocks:[{x,y,z}],count:1,isComplete:true});
    expect(builder.restoreProject(ctx,en,{projectId:'project-a',printContext:{unitMm:10,aiUse:'ASSISTED',aiDisclosure:'Shape planning'}})).toBe(true);
    expect(Object.keys(en.blocks).sort()).toEqual(['0,1,0','8,1,8']);expect(en.blocks['8,1,8'].userData.rotation).toBe(1);
    expect(en._undoStack).toHaveLength(1);expect(en._redoStack).toHaveLength(1);expect(en.camera.position.toArray()).toEqual([2,5,9]);expect(en.flyMode).toBe(true);
    expect(state.builderPrintContext).toEqual({unitMm:10,aiUse:'ASSISTED',aiDisclosure:'Shape planning'});
    expect(window.__alloGeometryWorldReturnProject).toBeUndefined();
  });
  it.each([false,true])('never restores a transient shape cue through Print Lab (legacy snapshot=%s)',legacy=>{
    const blocks=[{x:0,y:1,z:0,shape:'cube',type:'stone',rotation:0},{x:1,y:1,z:0,shape:'quarter',type:'wood',rotation:3},{x:9,y:3,z:-4,shape:'halfB',type:'brick',rotation:2}];
    const selected=blocks.slice(0,2).map(({x,y,z})=>({x,y,z})),en=engineFor(blocks);
    en._builderSelection={blocks:selected};en._undoStack=[{action:'place',...blocks[0]},{action:'place',...blocks[1]}];en._redoStack=[{action:'remove',...blocks[2]}];
    en.blocksPlaced=3;en._sessionXP=17;en._blockMilestones={ten:true};en.camera.position.set(2,5,9);en.camera.quaternion.setFromEuler(new THREE.Euler(-0.2,0.4,0));en.yaw=0.4;en.pitch=-0.2;en.flyMode=true;
    en.measureStructure=(_x,_y,_z,retained)=>({blocks:retained || selected,count:2,L:2,W:1,H:1,totalVolume:1.25,isComplete:true});window.__geoWorldEngine=en;
    let state={activeLesson:'builderSandbox',worldActive:true,actionFeedback:'Quarter wedge · 0°',selectedShape:3,blockRotation:0,selectedBlock:6,collabMode:true,teacherNote:'Keep the arch open'};
    const ctx={toolData:{geometryWorld:state},updateMulti(_,patch){state={...state,...patch};this.toolData.geometryWorld=state;},addToast(){},setStemLabTool(tool){this.destination=tool;}};
    const history=JSON.stringify([en._undoStack,en._redoStack]),pose={position:en.camera.position.toArray(),quaternion:en.camera.quaternion.toArray()};
    const wholeStl=new Uint8Array(builder.buildGeometryWorldStl(en,blocks).buffer),selectedStl=new Uint8Array(builder.buildGeometryWorldStl(en,selected).buffer);
    builder.openSelectedBuildInPrintLab(ctx);
    expect(ctx.destination).toBe('printLab');expect(state.actionFeedback).toBe('Quarter wedge · 0°');
    const saved=window.__alloGeometryWorldReturnProject,handoff=window.__alloPrintLabPendingHandoff;
    expect(saved.state.actionFeedback).toBe('');expect(new Uint8Array(handoff.bytes)).toEqual(selectedStl);
    if(legacy)saved.state.actionFeedback='Quarter wedge · 0°';
    en.loadLesson(builder.FREE_BUILD_LESSON);en.camera.position.set(0,0,0);en.camera.quaternion.identity();en.flyMode=false;
    expect(builder.restoreProject(ctx,en,{projectId:handoff.projectId,printContext:{unitMm:10,aiUse:'ASSISTED',aiDisclosure:'Shape planning'}})).toBe(true);
    expect(state.actionFeedback).toBe('');expect(state.selectedShape).toBe(3);expect(state.blockRotation).toBe(0);expect(state.selectedBlock).toBe(6);expect(state.collabMode).toBe(true);expect(state.teacherNote).toBe('Keep the arch open');
    expect(new Uint8Array(builder.buildGeometryWorldStl(en,blocks).buffer)).toEqual(wholeStl);
    expect(new Uint8Array(builder.buildGeometryWorldStl(en,en._builderSelection.blocks).buffer)).toEqual(selectedStl);
    expect(JSON.stringify([en._undoStack,en._redoStack])).toBe(history);expect(en.blocksPlaced).toBe(3);expect(en._sessionXP).toBe(17);expect(en._blockMilestones).toEqual({ten:true});
    expect(en.camera.position.toArray()).toEqual(pose.position);expect(en.camera.quaternion.toArray()).toEqual(pose.quaternion);expect(en.yaw).toBe(0.4);expect(en.pitch).toBe(-0.2);expect(en.flyMode).toBe(true);
    expect(state.builderPrintContext).toEqual({unitMm:10,aiUse:'ASSISTED',aiDisclosure:'Shape planning'});expect(window.__alloGeometryWorldReturnProject).toBeUndefined();
  });
  it('does not restore an unrelated project token',()=>{
    const en=engineFor([{x:0,y:1,z:0,shape:'cube'}]);window.__alloGeometryWorldReturnProject=builder.captureProject({toolData:{}},en,'project-a');
    expect(builder.restoreProject({},en,{projectId:'project-b'})).toBe(false);expect(Object.keys(en.blocks)).toEqual(['0,1,0']);
  });
  it('sends a retained selection instead of whichever creation is currently aimed at',()=>{
    const selected={x:0,y:1,z:0,shape:'cube'},other={x:8,y:1,z:8,shape:'quarter'};const en=engineFor([selected,other]);
    en._builderSelection={blocks:[selected]};en.measureStructure=(x,y,z)=>({blocks:[{x,y,z}],count:1,isComplete:true});
    en.blockUnderCrosshair=()=>({object:en.blocks['8,1,8']});window.__geoWorldEngine=en;let destination;
    builder.openSelectedBuildInPrintLab({toolData:{geometryWorld:{builderPrintContext:{unitMm:10}}},setStemLabTool(id){destination=id;},addToast(){}});
    expect(destination).toBe('printLab');expect(window.__alloPrintLabPendingHandoff.sourceModel.blocks[0].shape).toBe('cube');expect(window.__alloPrintLabPendingHandoff.unitMm).toBe(10);
  });
});

describe('Geometry World transient interaction fidelity',()=>{
  it('ignores placement pop scale when preparing a printable mesh',()=>{
    const blocks=[{x:0,y:1,z:0,shape:'cube'},{x:1,y:1,z:0,shape:'halfB'}],en=engineFor(blocks);
    en.blocks['1,1,0'].scale.setScalar(0.7);en.blocks['1,1,0'].userData._popT=0.1;
    const bundle=builder.buildGeometryWorldStl(en,blocks),report=printable.inspectStl(bundle.buffer,5);
    expect(report.status).toBe('PASS');expect(report.dimensionsMm).toEqual({width:10,depth:5,height:5});expect(report.enclosedVolumeMm3).toBeCloseTo(187.5,3);
    expect(en.blocks['1,1,0'].scale.x).toBe(0.7);
  });
  it('blocks the synthesized click even if a touch moves a different action under the finger',()=>{
    const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8'),start=source.indexOf('      function runMobileButtonAction('),end=source.indexOf('      function beginMobileJump()',start);
    const en={},run=new Function('engine',source.slice(start,end)+'return runMobileButtonAction;')(en);let placed=0,broken=0;
    run('place',()=>placed++,{type:'touchstart',stopPropagation(){}});
    run('break',()=>broken++,{type:'click',detail:1});expect(placed).toBe(1);expect(broken).toBe(0);
    run('break',()=>broken++,{type:'click',detail:0});expect(broken).toBe(1);
    run('place',()=>placed++,{type:'touchstart',stopPropagation(){}});expect(placed).toBe(2);
    en._lastTouchAction.at-=701;run('break',()=>broken++,{type:'click',detail:1});expect(broken).toBe(2);
  });
});
