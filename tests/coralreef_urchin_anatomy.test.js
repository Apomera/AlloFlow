import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),local={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(local);
const S=local.Reef3DSpecies,find=(root,name)=>{let result;root.traverse(o=>{if(o.isMesh&&o.userData.part===name)result=o;});return result;};
function shafts(g,sides){const p=g.attributes.position,rows=[];for(let start=0;start<p.count;start+=sides*2+1){const a=new THREE.Vector3(),b=new THREE.Vector3();for(let j=0;j<sides;j++){a.add(new THREE.Vector3().fromBufferAttribute(p,start+j));b.add(new THREE.Vector3().fromBufferAttribute(p,start+sides+j));}a.divideScalar(sides);b.divideScalar(sides);rows.push({a,b,length:a.distanceTo(b)});}return rows;}
describe('long-spined urchin anatomical refinement',()=>{
 it.each(['low','high'])('keeps %s-detail spine shafts rigid while preserving small identifying markings',quality=>{
  const m=S.create(THREE,'long_spined_urchin',{quality,seed:7}),test=find(m.root,'test'),spines=find(m.root,'spines');
  try{
   let draws=0,tris=0;m.root.traverse(o=>{if(o.isMesh){draws++;tris+=o.geometry.index.count/3;}});
   expect(draws).toBe(2);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);
   const p=test.geometry.attributes.position,c=test.geometry.attributes.color;
   const blue=new Set(),white=new Set();let ringHeight=-Infinity;
   for(let i=0;i<p.count;i++){
    const r=c.getX(i),g=c.getY(i),b=c.getZ(i),angle=Math.atan2(p.getZ(i),p.getX(i));
    if(b>r*2&&g>r*2&&g>.1)blue.add(Math.round((angle-.3-Math.PI/5)/(Math.PI*2/5)+5)%5);
    if(Math.min(r,g,b)>.75)white.add(Math.round((angle-.3)/(Math.PI*2/5)+5)%5);
    if(r>.6&&r>g*2&&g>b*2)ringHeight=Math.max(ringHeight,p.getY(i));
   }
   expect(blue.size,'five paired dotted blue sectors').toBe(5);expect(white.size,'five pale spots').toBe(5);
   expect(ringHeight,'orange ring rises above the body').toBeGreaterThan(.06);
   const sides=quality==='high'?6:3,before=shafts(spines.geometry,sides);expect(before.length).toBeGreaterThan(60);
   m.update(0,3.7);const after=shafts(spines.geometry,sides);let moved=0;
   for(let i=0;i<before.length;i++){expect(Math.abs(before[i].length-after[i].length),'shaft '+i+' remains rigid').toBeLessThan(.000001);expect(before[i].a.distanceTo(after[i].a),'attachment '+i+' stays seated').toBeLessThan(.000001);if(before[i].b.distanceTo(after[i].b)>.00001)moved++;}
   expect(moved).toBeGreaterThan(before.length*.9);
  }finally{m.dispose();}
 });
 it('keeps the educational text and museum references aligned with the visible features',()=>{
  const w={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};
  new Function('window',readFileSync('stem_lab/stem_tool_coralreef.js','utf8'))(w);const x=w.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f).long_spined_urchin;
  expect(t.long_spined_urchin.fact).toMatch(/not an eye/);expect(p.observe).toMatch(/Above and Studio light/);
  expect(x.marineEntrySources(p).map(s=>s.id)).toContain('dx-wa-diadema');
 });
});
