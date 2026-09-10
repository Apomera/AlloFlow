import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const fixtureSource=readFileSync('tests/geometry_world_placement_transaction.test.js','utf8');
let makeShape,helpers,api,fixtures;
beforeAll(()=>{
  window.THREE=THREE;
  makeShape=new Function(source.slice(source.indexOf('  function createShapeGeometry('),source.indexOf('  // Format fractional volume for display'))+';return createShapeGeometry;')();
  const start=fixtureSource.indexOf('function engineFunction('),end=fixtureSource.indexOf("describe('placement rejects",start);
  if(start<0||end<0)throw new Error('Actual transaction fixture not found');
  helpers=new Function('THREE','source','makeShape','vi',fixtureSource.slice(start,end)+';return {fixture,seed,hitFace};')(THREE,source,makeShape,vi);
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
});
beforeEach(()=>{fixtures=[];window.THREE=THREE;});
afterEach(()=>{
  for(const f of fixtures){const geometries=new Set(),materials=new Set();f.engine.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  vi.restoreAllMocks();
});
function fixture(shape='cube',rotation=0){
  const f=helpers.fixture();fixtures.push(f);
  f.target=helpers.seed(f,[4,3,6],shape,rotation);Object.assign(f.target.userData,{_lessonBlock:false,_measurementLayer:'student'});
  f.aim=(target=f.target)=>f.setHits([helpers.hitFace(target,[0,1,0])]);
  f.aim();return f;
}
function vertices(geometry,matrix){const attribute=geometry.getAttribute('position'),out=[];for(let i=0;i<attribute.count;i++)out.push(new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(matrix).toArray());return out;}
function expectPoints(a,b){expect(a.length).toBe(b.length);for(let i=0;i<a.length;i++)for(let j=0;j<3;j++)expect(a[i][j]).toBeCloseTo(b[i][j],7);}
function expectAccurate(f){
  const e=f.engine,target=f.target;target.updateWorldMatrix(true,false);e._hoverGlowMesh.updateWorldMatrix(true,false);e._highlightMesh.updateWorldMatrix(true,false);
  expectPoints(vertices(e._hoverGlowMesh.geometry,e._hoverGlowMesh.matrixWorld),vertices(target.geometry,target.matrixWorld));
  const edges=new THREE.EdgesGeometry(target.geometry);expectPoints(vertices(e._highlightMesh.geometry,e._highlightMesh.matrixWorld),vertices(edges,target.matrixWorld));edges.dispose();
}
function invariant(f){const e=f.engine,m=f.target;return JSON.stringify({position:m.position.toArray(),quaternion:m.quaternion.toArray(),scale:m.scale.toArray(),data:m.userData,material:m.material.toJSON(),attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([key,a])=>[key,Array.from(a.array)])),index:m.geometry.index&&Array.from(m.geometry.index.array),undo:e._undoStack,redo:e._redoStack,placed:e.blocksPlaced,stl:createHash('sha256').update(Buffer.from(api.buildGeometryWorldStl(e,[m.userData.gridPos]).buffer)).digest('hex')});}
const cases=['cube','halfB','halfA','quarter'].flatMap(shape=>[0,1,2,3].map(rotation=>[shape,rotation]));

describe('shape-accurate hover using actual core placement and preview handlers',()=>{
  it.each(cases)('matches %s rotation %i without changing construction or STL',(shape,rotation)=>{
    const f=fixture(shape,rotation),before=invariant(f);f.engine.updateGhostPreview();expectAccurate(f);
    expect(invariant(f)).toBe(before);
    expect(f.engine._hoverGlowMesh.geometry).not.toBe(f.target.geometry);
    expect(f.engine._hoverGlowMesh.geometry.attributes.position.array).not.toBe(f.target.geometry.attributes.position.array);
    if(f.target.geometry.index)expect(f.engine._hoverGlowMesh.geometry.index.array).not.toBe(f.target.geometry.index.array);
    for(const object of [f.engine._hoverGlowMesh,f.engine._highlightMesh]){
      expect(object.material).not.toBe(f.target.material);expect(object.userData.gwDecorative).toBe(true);expect(object.material.depthWrite).toBe(false);
      const hits=[];object.raycast(new THREE.Raycaster(),hits);expect(hits).toEqual([]);
    }
    expect(f.engine._hoverGlowMesh.material.polygonOffset).toBe(true);
  });

  it('matches nested transforms, a transformed scene and nonuniform placement-pop scale',()=>{
    const f=fixture('quarter',3),e=f.engine,parent=new THREE.Group();
    e.scene.position.set(12,-5,8);e.scene.rotation.set(.04,.3,0);e.scene.scale.set(.8,1.2,1.1);
    parent.position.set(2,3,-6);parent.rotation.set(.2,.7,-.1);parent.scale.set(1.4,.6,.85);e.scene.add(parent);parent.add(f.target);
    f.target.scale.set(.7,.55,.8);e._popBlocks=[f.target];e.scene.updateMatrixWorld(true);f.aim();
    const before=invariant(f);e.updateGhostPreview();expectAccurate(f);expect(invariant(f)).toBe(before);
    const fill=e._hoverGlowMesh.geometry,edges=e._highlightMesh.geometry;
    parent.rotation.y+=.1;f.target.scale.set(1,1,1);f.aim();e.updateGhostPreview();expectAccurate(f);
    expect(e._hoverGlowMesh.geometry).toBe(fill);expect(e._highlightMesh.geometry).toBe(edges);
  });

  it('reuses its two owned hover geometries across unchanged frames and transform-only changes',()=>{
    const f=fixture('halfA',1),e=f.engine;e.updateGhostPreview();
    const fill=e._hoverGlowMesh,edge=e._highlightMesh,fillGeo=fill.geometry,edgeGeo=edge.geometry,sceneCount=e.scene.children.length;
    for(let frame=0;frame<60;frame++){e.clock.getElapsedTime=()=>frame/60;f.target.rotation.y+=.002;f.aim();e.updateGhostPreview();}
    expect(e._hoverGlowMesh).toBe(fill);expect(e._highlightMesh).toBe(edge);expect(fill.geometry).toBe(fillGeo);expect(edge.geometry).toBe(edgeGeo);expect(e.scene.children.length).toBe(sceneCount);expectAccurate(f);
  });

  it('switches geometry once and disposes only the previous owned fill and edges',()=>{
    const f=fixture('cube'),e=f.engine;e.updateGhostPreview();
    const fill=e._hoverGlowMesh,edge=e._highlightMesh,oldFill=fill.geometry,oldEdge=edge.geometry,fillDisposed=vi.fn(),edgeDisposed=vi.fn(),targetDisposed=vi.fn();
    oldFill.addEventListener('dispose',fillDisposed);oldEdge.addEventListener('dispose',edgeDisposed);f.target.geometry.addEventListener('dispose',targetDisposed);
    f.target=helpers.seed(f,[7,3,6],'quarter',2);f.aim();e.updateGhostPreview();
    expect(e._hoverGlowMesh).toBe(fill);expect(e._highlightMesh).toBe(edge);expect(fill.geometry).not.toBe(oldFill);expect(edge.geometry).not.toBe(oldEdge);expectAccurate(f);
    expect(fillDisposed).toHaveBeenCalledOnce();expect(edgeDisposed).toHaveBeenCalledOnce();expect(targetDisposed).not.toHaveBeenCalled();
    e.updateGhostPreview();expect(fillDisposed).toHaveBeenCalledOnce();expect(edgeDisposed).toHaveBeenCalledOnce();
  });

  it('refreshes changed position buffers and replacement index data without watching unrelated AO colors',()=>{
    const f=fixture(),e=f.engine;e.updateGhostPreview();let owned=e._hoverGlowMesh.geometry;
    f.target.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(f.target.geometry.attributes.position.count*3),3));
    f.target.geometry.attributes.color.needsUpdate=true;e.updateGhostPreview();expect(e._hoverGlowMesh.geometry).toBe(owned);
    const position=f.target.geometry.attributes.position;position.setX(0,position.getX(0)+.1);position.needsUpdate=true;e.updateGhostPreview();expect(e._hoverGlowMesh.geometry).not.toBe(owned);expectAccurate(f);owned=e._hoverGlowMesh.geometry;
    f.target.geometry.setIndex(f.target.geometry.index.clone());e.updateGhostPreview();expect(e._hoverGlowMesh.geometry).not.toBe(owned);expectAccurate(f);
  });

  it.each(['no target','inactive','showcase'])('hides every preview for %s without modifying the target',mode=>{
    const f=fixture(),e=f.engine;e.updateGhostPreview();const before=invariant(f);
    if(mode==='no target')f.setHits([]);if(mode==='inactive')f.setActive(false);if(mode==='showcase')e._showcase={hidden:[]};
    e.updateGhostPreview();for(const object of [e._highlightMesh,e._hoverGlowMesh,e._ghostMesh])expect(object.visible).toBe(false);expect(invariant(f)).toBe(before);
    expect(e._placementPreview.code).toBe('no_target');
  });

  it.each(['reduced motion','ambient disabled'])('keeps every hover opacity steady with %s while retaining protected and measurement feedback',mode=>{
    const f=fixture(),e=f.engine;if(mode==='reduced motion')e._rmHover=true;else e._ambientMotionEnabled=false;
    let reference;
    for(const time of [0,.15,1,4]){e.clock.getElapsedTime=()=>time;e.updateGhostPreview();const opacity=[e._highlightMesh.material.opacity,e._hoverGlowMesh.material.opacity];if(reference)expect(opacity).toEqual(reference);reference=opacity;}
    e._dimLines=[{}];e.updateGhostPreview();expect(e._hoverGlowMesh.material.opacity).toBeCloseTo(reference[1]*.35);
    f.target.userData._lessonBlock=true;e.updateGhostPreview();expect(e._highlightMesh.material.color.getHex()).toBe(0xff4444);expect(e._hoverGlowMesh.material.color.getHex()).toBe(0xff4444);
    const protectedOpacity=[e._highlightMesh.material.opacity,e._hoverGlowMesh.material.opacity];e.clock.getElapsedTime=()=>19;e.updateGhostPreview();expect([e._highlightMesh.material.opacity,e._hoverGlowMesh.material.opacity]).toEqual(protectedOpacity);
  });

  it('retains ambient opacity motion without changing hover or construction geometry',()=>{
    const f=fixture(),e=f.engine;e.clock.getElapsedTime=()=>0;e.updateGhostPreview();const opacity=e._highlightMesh.material.opacity,geometry=e._hoverGlowMesh.geometry;
    e.clock.getElapsedTime=()=>.15;e.updateGhostPreview();expect(e._highlightMesh.material.opacity).not.toBe(opacity);expect(e._hoverGlowMesh.geometry).toBe(geometry);expectAccurate(f);
  });

  it('the real teardown disposes owned overlays once and releases its source cache',()=>{
    const f=fixture(),e=f.engine;e.updateGhostPreview();const fill=e._hoverGlowMesh,edge=e._highlightMesh,fillDisposed=vi.fn(),edgeDisposed=vi.fn(),targetDisposed=vi.fn();
    fill.geometry.addEventListener('dispose',fillDisposed);edge.geometry.addEventListener('dispose',edgeDisposed);f.target.geometry.addEventListener('dispose',targetDisposed);
    const start=source.indexOf('          if (engine._highlightMesh) { engine.scene.remove',source.indexOf('// Dispose ghost mesh + highlight mesh'));
    const end=source.indexOf('          // Dispose dimension lines',start);if(start<0||end<0)throw new Error('Preview cleanup source not found');new Function('engine',source.slice(start,end))(e);
    expect(fill.parent).toBeNull();expect(edge.parent).toBeNull();expect(fillDisposed).toHaveBeenCalledOnce();expect(edgeDisposed).toHaveBeenCalledOnce();expect(targetDisposed).not.toHaveBeenCalled();expect(e._hoverGeometryState).toBeNull();
  });
});

describe('placement ghost has exact eventual dimensions',()=>{
  it.each(cases)('matches the actual placed %s rotation %i in allowed and blocked states',(shape,rotation)=>{
    const f=fixture(),e=f.engine;e._placeState={selectedBlock:0,selectedShape:['cube','halfB','halfA','quarter'].indexOf(shape),blockRotation:rotation};
    for(const state of [{},{_rmHover:true},{_rmHover:false,_ambientMotionEnabled:false},{_ambientMotionEnabled:true}]){
      Object.assign(e,state);for(const time of [0,.7,2]){e.clock.getElapsedTime=()=>time;e.updateGhostPreview();expect(e._ghostMesh.scale.toArray()).toEqual([1,1,1]);}
    }
    const cell=e._placementPreview.cell,ghost=e._ghostMesh;expect(e._placementPreview.allowed).toBe(true);ghost.updateWorldMatrix(true,false);
    const actual=e.placeBlock(cell.x,cell.y,cell.z,'stone',shape,rotation);actual.updateWorldMatrix(true,false);
    expectPoints(vertices(ghost.geometry,ghost.matrixWorld),vertices(actual.geometry,actual.matrixWorld));
    e.updateGhostPreview();expect(e._placementPreview.allowed).toBe(false);expect(ghost.scale.toArray()).toEqual([1,1,1]);expect(ghost.userData.placementAllowed).toBe(false);expect(e._ghostEdges.material.depthTest).toBe(false);
    for(const object of [ghost,e._ghostEdges]){expect(object.userData.gwDecorative).toBe(true);const hits=[];object.raycast(new THREE.Raycaster(),hits);expect(hits).toEqual([]);}
  });
});
