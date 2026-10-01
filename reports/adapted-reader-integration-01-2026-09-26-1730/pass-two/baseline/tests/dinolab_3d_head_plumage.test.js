import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const {dinoCoatGeometry}=internals();
describe('Anatomical feather-length transitions',()=>{
 for(const pennaceous of [false,true])for(const axis of ['x','u'])it(axis+' taper preserves roots and changes length smoothly, pennaceous '+pennaceous,()=>{
  const skin=new T.PlaneGeometry(2,2,12,12),base={count:120,length:.15,seed:53,pennaceous};
  const taper=axis==='x'?{x:[-.6,.6,.18]}:{u:[.55,.3]};
  const before=dinoCoatGeometry(T,skin,base),after=dinoCoatGeometry(T,skin,{...base,taper});
  expect(Array.from(after.attributes.dinoCoatRoot.array)).toEqual(Array.from(before.attributes.dinoCoatRoot.array));
  expect(Array.from(after.attributes.uv.array)).toEqual(Array.from(before.attributes.uv.array));
  const a=before.attributes.position,b=after.attributes.position,v=before.attributes.dinoCoatVane,roots=before.attributes.dinoCoatRoot,uv=before.attributes.uv;
  const ratios=[];let min=1,max=0;
  for(let i=0;i<v.count;i++)if(v.getY(i)===1){
   const root=new T.Vector3().fromBufferAttribute(roots,i),oldLength=new T.Vector3().fromBufferAttribute(a,i).distanceTo(root),length=new T.Vector3().fromBufferAttribute(b,i).distanceTo(root),ratio=length/oldLength;
   ratios.push({coordinate:axis==='x'?roots.getX(i):uv.getX(i),ratio});min=Math.min(min,ratio);max=Math.max(max,ratio);
  }
  ratios.sort((a,b)=>a.coordinate-b.coordinate);let reversals=0;for(let i=1;i<ratios.length;i++)if((axis==='x'?1:-1)*(ratios[i].ratio-ratios[i-1].ratio)<-1e-5)reversals++;
  expect(reversals).toBe(0);expect(min).toBeCloseTo(axis==='x'?.18:.3,2);expect(max).toBeCloseTo(1,5);
  const n=after.attributes.normal;for(let i=0;i<n.count;i++)expect(new T.Vector3().fromBufferAttribute(n,i).length()).toBeCloseTo(1,5);
  before.dispose();after.dispose();skin.dispose();
 });
 it('ignores UV-based taper when a source has no UVs',()=>{
  const skin=new T.PlaneGeometry(2,2);skin.deleteAttribute('uv');const options={count:12,length:.1,seed:4,pennaceous:true};
  const a=dinoCoatGeometry(T,skin,options),b=dinoCoatGeometry(T,skin,{...options,taper:{u:[.55,.3]}});
  expect(Array.from(a.attributes.position.array)).toEqual(Array.from(b.attributes.position.array));a.dispose();b.dispose();skin.dispose();
 });
});
