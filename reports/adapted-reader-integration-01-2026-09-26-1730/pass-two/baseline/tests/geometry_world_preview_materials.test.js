import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8').replace(/\r\n/g,'\n');
const transaction=readFileSync('tests/geometry_world_placement_transaction.test.js','utf8').replace(/\r\n/g,'\n');
let helpers,materials;
const fixtures=[];
beforeAll(()=>{
  window.THREE=THREE;
  const shapeStart=source.indexOf('  function createShapeGeometry('),shapeEnd=source.indexOf('  // Format fractional volume for display',shapeStart);
  const catalogStart=source.indexOf('  var BLOCK_TYPES = ['),catalogEnd=source.indexOf('\n  ];',catalogStart)+5;
  if(shapeStart<0||shapeEnd<shapeStart||catalogStart<0||catalogEnd<catalogStart)throw Error('Production geometry or material catalog not found');
  const makeShape=new Function(source.slice(shapeStart,shapeEnd)+';return createShapeGeometry;')();
  materials=new Function(source.slice(catalogStart,catalogEnd)+';return BLOCK_TYPES;')();
  const start=transaction.indexOf('function engineFunction('),end=transaction.indexOf("describe('placement rejects",start);
  if(start<0||end<start)throw Error('Production preview fixture not found');
  let fixtureCode=transaction.slice(start,end);
  const stub="BLOCK_TYPES: [{ id: 'stone' }, { id: 'wood' }],";
  if(fixtureCode.split(stub).length!==2)throw Error('Material fixture stub moved');
  fixtureCode=fixtureCode.replace(stub,'BLOCK_TYPES: materials,');
  helpers=new Function('THREE','source','makeShape','vi','materials',fixtureCode+';return {fixture,seed,hitFace};')(THREE,source,makeShape,vi,materials);
});
afterEach(()=>{
  for(const f of fixtures.splice(0)){
    const geometries=new Set(),ownedMaterials=new Set();
    f.engine.scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)ownedMaterials.add(object.material);});
    geometries.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());
  }
  vi.restoreAllMocks();
});
function setup(){
  window.THREE=THREE;
  const f=helpers.fixture();fixtures.push(f);
  f.target=helpers.seed(f,[2,0,3]);f.target.userData._lessonBlock=true;f.target.userData._measurementLayer='ground';
  f.setHits([helpers.hitFace(f.target,[0,1,0])]);
  return f;
}
function renderedColor(hex){return new THREE.Color(hex).convertSRGBToLinear().getHex();}
function blocks(engine){return JSON.stringify(Object.entries(engine.blocks).map(([key,m])=>[key,m.userData,m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),m.material.toJSON()]));}

describe('material-aware placement preview using actual Three.js and production handlers',()=>{
  it('previews every selected material immediately while keeping readiness in the outline',()=>{
    const f=setup(),e=f.engine,before=blocks(e);e.updateGhostPreview();
    const mesh=e._ghostMesh,geometry=mesh.geometry,edges=e._ghostEdges,sceneCount=e.scene.children.length;
    for(let index=0;index<materials.length;index++){
      e._placeState.selectedBlock=index;e.updateGhostPreview();
      expect(e._placementPreview.allowed).toBe(true);
      expect(mesh.material.color.getHex()).toBe(renderedColor(materials[index].color));
      expect(mesh.userData.placementMaterial).toBe(materials[index].id);
      expect(edges.material.color.getHex()).toBe(0xd6f4df);expect(edges.material.depthTest).toBe(true);
      expect(e._ghostMesh).toBe(mesh);expect(mesh.geometry).toBe(geometry);expect(e._ghostEdges).toBe(edges);expect(e.scene.children.length).toBe(sceneCount);
    }
    expect(blocks(e)).toBe(before);expect(e._undoStack).toEqual([]);expect(e._redoStack).toEqual([]);
  });

  it('uses the fallback material for stale saved selections',()=>{
    const e=setup().engine;
    for(const selectedBlock of [undefined,-1,99,'invalid']){
      e._placeState.selectedBlock=selectedBlock;e.updateGhostPreview();
      expect(e._ghostMesh.material.color.getHex()).toBe(renderedColor(materials[0].color));expect(e._ghostMesh.userData.placementMaterial).toBe('stone');
    }
  });

  it('reserves coral for a blocked destination and restores the selected material at the next open cell',()=>{
    const f=setup(),e=f.engine;e._placeState.selectedBlock=materials.findIndex(m=>m.id==='gold');
    helpers.seed(f,[2,1,3]);e.updateGhostPreview();
    expect(e._placementPreview.code).toBe('occupied');expect(e._ghostMesh.material.color.getHex()).toBe(0xf16c58);expect(e._ghostEdges.material.depthTest).toBe(false);
    expect(e._highlightMesh.material.color.getHex()).toBe(0xe6cf9e);
    const mesh=e._ghostMesh;
    f.setHits([helpers.hitFace(f.target,[1,0,0])]);e.updateGhostPreview();
    expect(e._placementPreview.allowed).toBe(true);expect(e._ghostMesh).toBe(mesh);expect(mesh.material.color.getHex()).toBe(renderedColor(materials.find(m=>m.id==='gold').color));expect(e._ghostEdges.material.depthTest).toBe(true);
  });

  it('keeps protected surface feedback steady and warm without changing placement permissions or the surface',()=>{
    const f=setup(),e=f.engine,before=blocks(e);let reference;
    for(const time of [0,.2,.7,4,11]){
      e.clock.getElapsedTime=()=>time;e.updateGhostPreview();
      const current=[e._highlightMesh.material.opacity,e._hoverGlowMesh.material.opacity];
      if(reference)expect(current).toEqual(reference);reference=current;
      expect(e._highlightMesh.material.color.getHex()).toBe(0xe6cf9e);expect(e._hoverGlowMesh.material.color.getHex()).toBe(0xe6cf9e);
      expect(e._placementPreview.allowed).toBe(true);
      expect(e.getPlacementEligibility(2,0,3).code).toBe('occupied');
    }
    expect(blocks(e)).toBe(before);expect(f.target.userData._lessonBlock).toBe(true);
  });

  it.each(['reduced motion','ambient disabled'])('keeps material previews steady with %s and quiet during measurement',mode=>{
    const f=setup(),e=f.engine;f.target.userData._lessonBlock=false;e._placeState.selectedBlock=materials.findIndex(m=>m.id==='wood');
    if(mode==='reduced motion')e._rmHover=true;else e._ambientMotionEnabled=false;
    let reference;
    for(const time of [0,.2,2,10]){
      e.clock.getElapsedTime=()=>time;e.updateGhostPreview();
      const current=[e._ghostMesh.material.opacity,e._ghostEdges.material.opacity,e._highlightMesh.material.opacity,e._hoverGlowMesh.material.opacity];
      if(reference)expect(current).toEqual(reference);reference=current;
      expect(e._ghostMesh.scale.toArray()).toEqual([1,1,1]);
    }
    e._dimLines=[{}];e.updateGhostPreview();
    expect(e._ghostMesh.material.opacity).toBe(.03);expect(e._ghostEdges.material.opacity).toBe(.22);expect(e._hoverGlowMesh.material.opacity).toBeCloseTo(reference[3]*.35);
    expect(e._ghostMesh.material.color.getHex()).toBe(renderedColor(materials.find(m=>m.id==='wood').color));
  });
});
