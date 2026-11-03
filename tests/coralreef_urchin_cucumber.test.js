import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);
const S=w.Reef3DSpecies,point=(g,i)=>new T.Vector3().fromBufferAttribute(g.attributes.position,i);
describe('urchin opening and cucumber feeding pads',()=>{
 it.each(['low','high'])('exposes a recessed anal opening inside the orange ring at %s detail',quality=>{
  const m=S.create(T,'long_spined_urchin',{quality,seed:7,reducedMotion:true});
  try{const mesh=m.root.getObjectByName('long_spined_urchin-test'),g=mesh.geometry,c=g.attributes.color,d=g.userData.urchin.analOpening;let lo=Infinity,hi=-Infinity;
   for(let i=0;i<c.count;i++)if(c.getX(i)>.6&&c.getX(i)>c.getY(i)*2&&c.getY(i)>c.getZ(i)*2){lo=Math.min(lo,g.attributes.position.getY(i));hi=Math.max(hi,g.attributes.position.getY(i));}
   const ringY=(lo+hi)/2;expect(Number.isFinite(ringY)).toBe(true);
   for(const time of [0,1.3,4]){m.update(.016,time);m.root.updateMatrixWorld(true);const origin=mesh.localToWorld(new T.Vector3(0,ringY+.02,0)),dir=new T.Vector3(0,-1,0).transformDirection(mesh.matrixWorld),hits=new T.Raycaster(origin,dir).intersectObject(mesh);
    expect(hits.length,'opening reaches a closed dark recess').toBeGreaterThan(0);const p=mesh.worldToLocal(hits[0].point.clone());expect(ringY-p.y,'no solid cap at the ring').toBeGreaterThan(.003);expect(p.y).toBeCloseTo(d.floor,6);
    for(const i of [hits[0].face.a,hits[0].face.b,hits[0].face.c])expect(Math.max(c.getX(i),c.getY(i),c.getZ(i))).toBeLessThan(.004);
   }
  }finally{m.dispose();}
 });
 it.each(['low','high'])('gives all twenty tentacles flattened lobed feeding pads at %s detail',quality=>{
  const m=S.create(T,'sea_cucumber',{quality,seed:7,reducedMotion:true});
  try{const mesh=m.root.getObjectByName('sea_cucumber-body'),g=mesh.geometry,d=g.userData.cucumber,k=d.scale;expect(d.feedingPads).toHaveLength(20);
   for(const pad of d.feedingPads){const center=new T.Vector3(...pad.center),radii=[];let height=0;const used=new Set();
    for(let at=0;at<g.index.count;at++){const i=g.index.getX(at);if(i>=pad.first&&i<pad.first+pad.count)used.add(i);}
    expect(used.size).toBe(pad.count);expect(pad.sides).toBeGreaterThanOrEqual(6);
    for(const i of [pad.first,pad.first+pad.sides+1])expect((g.attributes.position.getY(i)-center.y)*g.attributes.normal.getY(i),'both feeding-pad faces point outward').toBeGreaterThan(0);
    for(let i=pad.first;i<pad.first+pad.count;i++){const p=point(g,i).sub(center).multiplyScalar(1/k),r=Math.hypot(p.x,p.z);height=Math.max(height,Math.abs(p.y));if(r>.001)radii.push(r);}
    expect(Math.max(...radii)).toBeGreaterThan(.006);expect(Math.max(...radii)-Math.min(...radii),'lobed outline survives low tier').toBeGreaterThan(.0015);expect(height,'pad has both faces').toBeCloseTo(.0017,5);expect(height/Math.max(...radii),'pad is flattened').toBeLessThan(.3);
    for(let i=pad.first;i<pad.first+pad.count;i++){expect(g.attributes.uv.getX(i),'tiny pad does not stretch the skin atlas').toBe(.5);expect(g.attributes.uv.getY(i)).toBe(.5);}
   }
  }finally{m.dispose();}
 });
 it.each(['low','high'])('keeps %s-tier budgets, draws and finite moving geometry',quality=>{
  for(const [id,draws]of [['long_spined_urchin',2],['sea_cucumber',1]]){const m=S.create(T,id,{quality,seed:7});try{const parts=[];m.root.traverse(o=>{if(o.isMesh)parts.push(o);});expect(parts).toHaveLength(draws);expect(parts.reduce((n,o)=>n+o.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='low'?1500:6000);for(const t of [0,1.3,4]){m.update(.016,t);for(const p of parts)for(const a of Object.values(p.geometry.attributes))expect(Array.from(a.array).every(Number.isFinite)).toBe(true);}}finally{m.dispose();}}
 });
 it('explains feeding, movement and the displayed anatomy with linked sources',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,p=x.marineProfiles((k,f)=>f);
  expect(p.long_spined_urchin.behavior).toMatch(/anus, separate from the feeding mouth.*body stays in place/);expect(p.long_spined_urchin.observe).toMatch(/Above and Studio light.*dark opening.*not an eye/);
  expect(p.sea_cucumber.behavior).toMatch(/lobed feeding pad.*peltate.*separate tube feet.*not animated/);expect(p.sea_cucumber.observe).toMatch(/Below.*twenty.*lobed pads.*movement rather than feeding/);
  expect(x.marineEntrySources(p.long_spined_urchin).map(s=>s.id)).toContain('dx-nmns-urchin');expect(x.marineEntrySources(p.sea_cucumber).map(s=>s.id)).toContain('dx-fao-sea-cucumber');
 });
});
