import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

let THREE, makeShape;
beforeAll(() => {
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();delete window.__geoWorldEngine;delete window.__alloPrintLabPendingHandoff;delete window.__alloGeometryWorldReturnProject;});

function readBlob(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(blob);});}
function record(buffer){
  const view=new DataView(buffer),count=view.getUint32(80,true),vertices=[],normals=[];
  for(let i=0;i<count;i++){
    normals.push([0,1,2].map(axis=>view.getFloat32(84+i*50+axis*4,true)));
    for(let vertex=0;vertex<3;vertex++)vertices.push([0,1,2].map(axis=>view.getFloat32(84+i*50+12+vertex*12+axis*4,true)));
  }
  return {count,vertices,normals};
}

describe('standalone Geometry World STL millimeter sizing',()=>{
  it.each([{label:'default',context:{},scale:5},{label:'retained fractional',context:{unitMm:12.5},scale:12.5}])('applies $label scale to downloaded vertices without scaling the editable handoff',async({context,scale})=>{
    vi.useFakeTimers();window.THREE=THREE;
    if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
    window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
    new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
    const api=window.StemLab.geometryWorldBuilderPure,blocks=[{x:0,y:1,z:0,shape:'cube',rotation:0},{x:1,y:1,z:0,shape:'quarter',rotation:1}],engine={blocks:{},_builderSelection:{blocks},_undoStack:[{type:'place'}],_redoStack:[],_currentLesson:api.FREE_BUILD_LESSON,measureStructure(){return {blocks,count:blocks.length,isComplete:true,L:2,W:1,H:1};}};
    blocks.forEach(p=>{const mesh=new THREE.Mesh(makeShape(p.shape),new THREE.MeshBasicMaterial());mesh.position.set(p.x+.5,p.y+(p.shape==='cube'?.5:0),p.z+.5);mesh.rotation.y=p.rotation*Math.PI/2;mesh.userData={gridPos:p,shape:p.shape,rotation:p.rotation,blockType:'stone',_measurementLayer:'student'};mesh.updateMatrixWorld(true);engine.blocks[[p.x,p.y,p.z].join(',')]=mesh;});
    window.__geoWorldEngine=engine;
    const before=api.buildGeometryWorldStl(engine,blocks,{title:'Geometry World selected build'}),original=record(before.buffer),toasts=[];let downloaded,filename;
    vi.stubGlobal('URL',{createObjectURL(blob){downloaded=blob;return 'blob:scaled';},revokeObjectURL(){}});
    vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){filename=this.download;});
    api.openSelectedBuildInPrintLab({toolData:{geometryWorld:{builderPrintContext:context}},addToast(message){toasts.push(message);}});
    const reading=readBlob(downloaded);await vi.runAllTimersAsync();const output=await reading,scaled=record(output);
    expect(filename).toBe('geometry-world-selected-build-mm.stl');expect(scaled.count).toBe(original.count);expect(scaled.normals).toEqual(original.normals);
    scaled.vertices.forEach((p,i)=>p.forEach((coordinate,axis)=>expect(coordinate).toBeCloseTo(original.vertices[i][axis]*scale,5)));
    expect(Array.from(window.__alloPrintLabPendingHandoff.bytes)).toEqual(Array.from(new Uint8Array(before.buffer)));
    expect(window.__alloPrintLabPendingHandoff.unitMm).toBe(scale);
    expect(window.__alloPrintLabPendingHandoff.sourceModel.blocks).toEqual(before.sourceModel.blocks);
    expect(engine._undoStack).toEqual([{type:'place'}]);expect(engine._redoStack).toEqual([]);
    expect(toasts.at(-1)).toContain(scale+' mm per block');expect(toasts.at(-1)).toContain('100% scale');
    expect(String.fromCharCode(...new Uint8Array(output,0,80))).toContain('coordinates in mm');
  });
});
