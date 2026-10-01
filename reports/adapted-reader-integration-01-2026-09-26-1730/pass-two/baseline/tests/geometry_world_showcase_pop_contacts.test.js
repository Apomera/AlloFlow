import {describe,it,expect,beforeAll,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';

let THREE,api,makeShape;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;window.THREE=THREE;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{delete window.__geoWorldEngine;});
function meshFor(shape,y=1){
  const mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshBasicMaterial());mesh.position.set(.5,y+(shape==='cube'?.5:shape==='halfB'?.25:0),.5);mesh.rotation.y=3*Math.PI/2;
  mesh.userData={shape,rotation:3,blockType:'stone',_measurementLayer:'student',gridPos:{x:0,y,z:0}};mesh.updateMatrixWorld(true);return mesh;
}
function expectSamePolygons(actual,expected){
  expect(actual).toHaveLength(expected.length);actual.forEach((polygon,i)=>{expect(polygon).toHaveLength(expected[i].length);polygon.forEach((p,j)=>{expect(p.x).toBeCloseTo(expected[i][j].x,8);expect(p.z).toBeCloseTo(expected[i][j].z,8);});});
}

describe('canonical Showcase contact footprints while blocks pop into place',()=>{
  it.each(['cube','halfA','halfB','quarter'])('retains the exact %s support polygon under a transformed parent without changing animated mesh scale',shape=>{
    const mesh=meshFor(shape,18),parent=new THREE.Group();parent.position.set(2,3,-4);parent.rotation.y=.43;parent.scale.set(1.2,1,.8);parent.add(mesh);parent.updateMatrixWorld(true);
    const engine={blocks:{'0,18,0':mesh},_popBlocks:[]},positions=[{x:0,y:18,z:0}],bounds=api.creationGeometryBounds(engine,positions);
    const expected=api.studioGroundFootprints([mesh],bounds.min.y,engine._popBlocks);expect(expected).toHaveLength(1);
    mesh.scale.setScalar(.22);engine._popBlocks=[mesh];mesh.updateMatrixWorld(true);
    const geometry=Array.from(mesh.geometry.getAttribute('position').array),position=mesh.position.toArray(),quaternion=mesh.quaternion.toArray(),worldMatrix=mesh.matrixWorld.toArray();
    const actual=api.studioGroundFootprints([mesh],bounds.min.y,engine._popBlocks);
    expectSamePolygons(actual,expected);expect(mesh.scale.toArray()).toEqual([.22,.22,.22]);expect(mesh.position.toArray()).toEqual(position);expect(mesh.quaternion.toArray()).toEqual(quaternion);expect(mesh.matrixWorld.toArray()).toEqual(worldMatrix);expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(geometry);
  });
  it('does not flatten a raised span into a false floor contact when it is popping',()=>{
    const base=meshFor('quarter',1),span=meshFor('halfB',3),engine={_popBlocks:[span]};span.scale.setScalar(.15);span.updateMatrixWorld(true);
    const expected=api.studioGroundFootprints([base],1,[]),actual=api.studioGroundFootprints([base,span],1,engine._popBlocks);
    expectSamePolygons(actual,expected);expect(actual).toHaveLength(1);expect(span.scale.toArray()).toEqual([.15,.15,.15]);
  });
  it('supports Saver without a pop list and preserves deliberate nonanimated scaling',()=>{
    const mesh=meshFor('cube');mesh.scale.setScalar(.5);mesh.updateMatrixWorld(true);const baseY=new THREE.Box3().setFromObject(mesh).min.y;
    const omitted=api.studioGroundFootprints([mesh],baseY),explicit=api.studioGroundFootprints([mesh],baseY,[]);expectSamePolygons(omitted,explicit);expect(omitted).toHaveLength(1);
    const xs=omitted[0].map(p=>p.x),zs=omitted[0].map(p=>p.z);expect(Math.max(...xs)-Math.min(...xs)).toBeCloseTo(.5,8);expect(Math.max(...zs)-Math.min(...zs)).toBeCloseTo(.5,8);expect(mesh.scale.toArray()).toEqual([.5,.5,.5]);
  });
});
