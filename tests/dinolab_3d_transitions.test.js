import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const {dinoSurfaceGeometry}=internals();
describe('Dino Lab smoothly changing skin sections',()=>{
 for(const scale of [.1,1,12]) for(const broad of [false,true]) it('preserves tapered stations and seam normals at scale '+scale+' broad '+broad,()=>{
  const points=[0,1,2,3].map(x=>new T.Vector3(x*scale,0,0)),radii=[1,.78,.42,.06].map(r=>[r*scale,r*scale*(broad?1.8:.65)]);
  const g=dinoSurfaceGeometry(T,points,radii,{smoothProfile:true}),p=g.attributes.position,n=g.attributes.normal;
  expect(g.userData.dinoSmoothProfile).toBe(true);expect(p.count).toBe(1227);expect(g.index.count).toBe(48*24*6+24*6);
  for(const attr of ['position','normal','uv'])expect([...g.attributes[attr].array].every(Number.isFinite)).toBe(true);
  for(let station=0;station<4;station++){
   const row=station*16*25;expect(p.getY(row)).toBeCloseTo(radii[station][0],5);expect(Math.abs(p.getZ(row+6))).toBeCloseTo(radii[station][1],5);
  }
  for(let ring=0;ring<=48;ring++){
   const row=ring*25,section=Math.min(2,Math.floor(ring/16)),radius=p.getY(row);
   expect(radius).toBeLessThanOrEqual(radii[section][0]+scale*1e-6);expect(radius).toBeGreaterThanOrEqual(radii[section+1][0]-scale*1e-6);
   expect(new T.Vector3().fromBufferAttribute(n,row).distanceTo(new T.Vector3().fromBufferAttribute(n,row+24))).toBeLessThan(1e-6);
  }
  // A descending station continues to taper instead of flattening to a ledge.
  for(const ring of [16,32]){
   const left=(p.getY((ring-1)*25)-p.getY(ring*25))/scale,right=(p.getY(ring*25)-p.getY((ring+1)*25))/scale;
   expect(left).toBeGreaterThan(.01);expect(right).toBeGreaterThan(.01);expect(left/right).toBeGreaterThan(.7);expect(left/right).toBeLessThan(1.4);
  }
  g.dispose();
 });
});
