import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let THREE, fit, makeShape;
const oldLab=window.StemLab, oldThree=window.THREE;
beforeAll(() => {
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  window.THREE=THREE;window.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  fit=window.StemLab.geometryWorldBuilderPure.fitCreationCamera;
  expect(typeof fit).toBe('function');
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
afterAll(() => {window.StemLab=oldLab;window.THREE=oldThree;});

function camera(config={}) {
  const value=new THREE.PerspectiveCamera(config.fov || 75,config.aspect || 1.6,config.near || .1,config.far || 200);
  value.zoom=config.zoom || 1;value.position.set(9,7,-11);value.lookAt(3,4,2);value.updateProjectionMatrix();value.updateMatrixWorld(true);
  return value;
}
function box(min,max){return new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max));}
function corners(bounds){const result=[];for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])result.push(new THREE.Vector3(x,y,z));return result;}
function snapshot(bounds,view,rect){return JSON.stringify({box:[bounds.min.toArray(),bounds.max.toArray()],camera:{position:view.position.toArray(),quaternion:view.quaternion.toArray(),up:view.up.toArray(),fov:view.fov,zoom:view.zoom,aspect:view.aspect,near:view.near,far:view.far,view:view.view,projection:view.projectionMatrix.toArray(),matrix:view.matrix.toArray(),world:view.matrixWorld.toArray()},rect});}
function verify(bounds,view,rect,minY=2.8){
  const before=snapshot(bounds,view,rect),result=fit(bounds,view,rect,minY);
  expect(result).toBeTruthy();expect(snapshot(bounds,view,rect)).toBe(before);
  const projected=view.clone();projected.up.set(0,1,0);projected.position.copy(result.position);projected.lookAt(result.target);projected.far=result.far;projected.updateProjectionMatrix();projected.updateMatrixWorld(true);
  const depths=[];
  for(const point of corners(bounds)){
    const ndc=point.clone().project(projected);depths.push(-point.clone().applyMatrix4(projected.matrixWorldInverse).z);
    expect(ndc.x).toBeGreaterThanOrEqual(result.rect.left-1e-7);expect(ndc.x).toBeLessThanOrEqual(result.rect.right+1e-7);
    expect(ndc.y).toBeGreaterThanOrEqual(result.rect.bottom-1e-7);expect(ndc.y).toBeLessThanOrEqual(result.rect.top+1e-7);
    expect(ndc.z).toBeGreaterThanOrEqual(-1-1e-7);expect(ndc.z).toBeLessThanOrEqual(1+1e-7);
  }
  const center=bounds.getCenter(new THREE.Vector3()).project(projected);
  expect(center.x).toBeCloseTo((result.rect.left+result.rect.right)/2,7);expect(center.y).toBeCloseTo((result.rect.bottom+result.rect.top)/2,7);
  expect(result.position.y).toBeGreaterThanOrEqual(minY-1e-7);
  expect(Math.min(...depths)).toBeGreaterThan(view.near);
  expect(Math.max(...depths)).toBeLessThan(result.far);
  expect(result.depthNear).toBeCloseTo(Math.min(...depths),6);expect(result.depthFar).toBeCloseTo(Math.max(...depths),6);
  expect(result.far).toBeGreaterThanOrEqual(view.far);
  return {result,projected};
}

describe('Focus creation fits through the actual Three.js projection', () => {
  const cases=[
    {name:'desktop pavilion with asymmetric toolbar insets',min:[-4,1,-3],max:[4,9,4],aspect:1.65,rect:{left:-.88,right:.95,bottom:-.62,top:.91}},
    {name:'portrait phone tall 128-unit tower',min:[0,1,0],max:[1,129,1],aspect:390/844,rect:{left:-.85,right:.9,bottom:-.2,top:.88}},
    {name:'portrait phone wide half slab strip',min:[-64,1,-1],max:[65,1.5,1],aspect:390/844,rect:{left:-.93,right:.84,bottom:-.44,top:.76}},
    {name:'very wide and shallow viewport',min:[-10,1,-8],max:[12,20,8],aspect:4,rect:{left:-.8,right:.9,bottom:-.4,top:.8}},
    {name:'authored build at offset ground coordinates',min:[1000,13,-700],max:[1012,20,-696],aspect:1.7,minY:14.8,rect:{left:-.4,right:.92,bottom:-.82,top:.75}},
    {name:'left-only clear area',min:[-3,1,-3],max:[4,8,4],aspect:1.4,rect:{left:-.98,right:-.45,bottom:-.8,top:.9}},
    {name:'upper-only area keeps a wide low camera above the floor',min:[-15,1,-15],max:[15,1.5,15],aspect:.46,rect:{left:-.9,right:.9,bottom:.62,top:.95}},
    {name:'small upper-right clear area',min:[-7,1,-4],max:[8,14,6],aspect:.4,fov:95,rect:{left:.65,right:.95,bottom:.65,top:.95}},
    {name:'extremely narrow aspect',min:[-5,1,-5],max:[6,12,6],aspect:.08,fov:101},
    {name:'extremely wide aspect',min:[-5,1,-5],max:[6,12,6],aspect:10,fov:101},
    {name:'narrow FOV with optical zoom',min:[-8,1,-8],max:[9,45,9],aspect:.6,fov:28,zoom:2.2},
    {name:'wide effective FOV and high clear rect',min:[-30,1,-20],max:[30,4,20],aspect:.45,fov:130,zoom:.5,rect:{left:-.9,right:.9,bottom:.7,top:.98}},
    {name:'large near plane with a small build',min:[0,1,0],max:[1,1.5,1],aspect:1.3,near:10,far:20},
    {name:'degenerate point bounds remain finite',min:[3,1.5,4],max:[3,1.5,4],aspect:.45}
  ];
  for(const config of cases)it(config.name,()=>verify(box(config.min,config.max),camera(config),config.rect,config.minY ?? 2.8));

  it('fits actual rotated fractional mesh vertices under a transformed parent',()=>{
    const group=new THREE.Group();group.position.set(730,12,-915);group.rotation.y=.47;group.scale.set(1.4,.8,.65);
    const parts=[['halfA',0,0,0,1],['halfB',2,.25,0,3],['quarter',-1,2,2,2]];
    for(const [shape,x,y,z,rotation] of parts){const mesh=new THREE.Mesh(makeShape(shape),new THREE.MeshBasicMaterial());mesh.position.set(x,y,z);mesh.rotation.y=rotation*Math.PI/2;group.add(mesh);}
    group.updateMatrixWorld(true);const bounds=new THREE.Box3(),vertices=[];
    for(const mesh of group.children){const attr=mesh.geometry.attributes.position;for(let i=0;i<attr.count;i++){const p=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld);bounds.expandByPoint(p);vertices.push(p);}}
    const before=group.children.map(m=>[m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),Array.from(m.geometry.attributes.position.array)]);
    const {result,projected}=verify(bounds,camera({aspect:390/844,zoom:1.3}),{left:-.7,right:.92,bottom:-.45,top:.87},14.8);
    for(const vertex of vertices){const p=vertex.clone().project(projected);expect(p.x).toBeGreaterThanOrEqual(result.rect.left-1e-7);expect(p.x).toBeLessThanOrEqual(result.rect.right+1e-7);expect(p.y).toBeGreaterThanOrEqual(result.rect.bottom-1e-7);expect(p.y).toBeLessThanOrEqual(result.rect.top+1e-7);}
    expect(group.children.map(m=>[m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),Array.from(m.geometry.attributes.position.array)])).toEqual(before);
    group.children.forEach(m=>{m.geometry.dispose();m.material.dispose();});
  });
  it('does not inherit or mutate a previous top-view up vector',()=>{
    const view=camera({aspect:.47});view.up.set(0,0,-1);view.position.set(0,30,0);view.lookAt(0,0,0);view.updateMatrixWorld(true);
    verify(box([-2,1,-2],[3,9,3]),view,{left:-.75,right:.95,bottom:-.5,top:.85});expect(view.up.toArray()).toEqual([0,0,-1]);
  });
  it('keeps all corners safe across deterministic combinations of offsets, sizes, FOVs and zoom',()=>{
    let seed=128459;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<60;i++){
      const min=[random()*2000-1000,random()*40,random()*2000-1000],max=min.map(v=>v+.25+random()*160);
      const cx=random()*1.2-.6,cy=random()*1.2-.6,hx=Math.min(.15+random()*.4,.98-Math.abs(cx)),hy=Math.min(.15+random()*.4,.98-Math.abs(cy));
      verify(box(min,max),camera({fov:20+random()*100,zoom:.5+random()*1.9,aspect:.1+random()*5.9}),{left:cx-hx,right:cx+hx,bottom:cy-hy,top:cy+hy},min[1]+2.8);
    }
  });
  it('shrinks the requested clear rectangle by4% without changing its center',()=>{
    const rect=Object.freeze({left:-.8,right:.9,bottom:-.3,top:.8}),result=fit(box([0,1,0],[2,3,2]),camera(),rect);
    expect(result.rect.right-result.rect.left).toBeCloseTo((rect.right-rect.left)*.96,12);
    expect(result.rect.top-result.rect.bottom).toBeCloseTo((rect.top-rect.bottom)*.96,12);
  });
  for(const kind of ['empty box','non-finite box','zero aspect','non-finite FOV','empty clear rectangle','clear rectangle outside viewport'])it('rejects '+kind,()=>{
    const bounds=box([0,1,0],[1,2,1]),view=camera();let rect;
    if(kind==='empty box')bounds.makeEmpty();if(kind==='non-finite box')bounds.max.x=Infinity;if(kind==='zero aspect')view.aspect=0;if(kind==='non-finite FOV')view.fov=Infinity;
    if(kind==='empty clear rectangle')rect={left:.2,right:.2,bottom:-.8,top:.8};if(kind==='clear rectangle outside viewport')rect={left:2,right:3,bottom:2,top:3};
    expect(fit(bounds,view,rect)).toBeNull();
  });
});
