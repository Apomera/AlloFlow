import {describe,it,expect} from 'vitest';
import {native,THREE,vec,nativeMeshContains,cranialBuffers} from './helpers/dino_native_sauropod_cranium_harness.js';
const ids=['diplodocus','camarasaurus'],tag=m=>m.userData.dinoSauropodCranialElement;
const world=(m,i)=>m.localToWorld(vec().fromBufferAttribute(m.geometry.attributes.position,i));
function closed(m,scale){const p=m.geometry.attributes.position,ix=m.geometry.index,tol=scale*1e-8,keys=[],edges=new Map();let volume=0;
 for(let i=0;i<p.count;i++)keys.push(vec().fromBufferAttribute(p,i).toArray().map(v=>Math.round(v/tol)).join(','));
 for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)),b=vec().fromBufferAttribute(p,ix.getX(i+1)),c=vec().fromBufferAttribute(p,ix.getX(i+2));volume+=a.dot(b.cross(c))/6;
  for(let j=0;j<3;j++){const a=keys[ix.getX(i+j)],b=keys[ix.getX(i+(j+1)%3)];if(a===b)continue;const key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
 expect([...edges.values()].filter(n=>n!==2),m.name+' closed actual solid').toEqual([]);expect(volume,m.name+' outward winding').toBeGreaterThan(0);
}
describe('genus-informed sauropod skulls and sampled dental arcades',()=>{
 it('does not mask the temporal region with a legacy generic braincase and keeps an open occipital joint',()=>{
  for(const id of ids){const b=native.build(id);try{
   const temporal=new THREE.Box3();for(const m of b.tagged.filter(m=>tag(m).id==='temporal-rim'))temporal.union(new THREE.Box3().setFromObject(m));
   const masking=b.bones.filter(m=>!tag(m)&&m.geometry.type==='SphereGeometry'&&new THREE.Box3().setFromObject(m).intersectsBox(temporal));
   expect(masking.map(m=>({name:m.name,bounds:new THREE.Box3().setFromObject(m)})),id+' untagged solid sphere in the actual temporal region').toEqual([]);
   for(const name of ['neurocranium','occipital-foramen-rim','paroccipital-support','occipital-condyle','atlas-neural-arch','atlas-intercentrum','axis-centrum','axis-odontoid-proxy'])expect(b.tagged.some(m=>tag(m).id===name),id+' '+name).toBe(true);
   const rim=b.tagged.find(m=>tag(m).id==='occipital-foramen-rim'),condyle=b.tagged.find(m=>tag(m).id==='occipital-condyle'),center=new THREE.Box3().setFromObject(rim).getCenter(vec());
   expect(rim.geometry.type).toBe('TubeGeometry');expect(center.y).toBeGreaterThan(condyle.position.y);
   // The fast skin classifier spans the first/last Z intersection and is
   // appropriate for a filled skin section. A real torus hole needs parity.
   const fillsCenter=m=>{const hits=new THREE.Raycaster(center,vec(1,.371,.217).normalize()).intersectObject(m,false),distances=[];for(const h of hits)if(h.distance>1e-8&&!distances.some(d=>Math.abs(d-h.distance)<1e-8))distances.push(h.distance);return distances.length%2===1;};
   expect(b.tagged.filter(fillsCenter).map(m=>m.name),id+' unobstructed center of the foramen magnum').toEqual([]);
  }finally{b.dispose();}}
 });
 it('limits the new frame to two catalog taxa and distinguishes comparative evidence from exact species measurements',()=>{
  for(const d of native.art.DINOS)expect(Boolean(native.art.dinoSauropodCraniumProfileFor(d)),d.id).toBe(ids.includes(d.id));
  for(const id of ids){const p=native.art.dinoSauropodCraniumProfileFor(native.art.DINOS.find(d=>d.id===id));expect(p.genusInformed).toBe(true);expect(p.dentalSamplesAreLiteralFormula).toBe(false);expect(p.proportionBasis).toMatch(/not|neither/i);expect(p.limit).toContain('bony naris');expect(p.limit).toContain('fleshy nostril');for(const s of p.sources){expect(s.title.length).toBeGreaterThan(10);expect(s.url).toMatch(/^https:\/\//);}}
 });
 for(const id of ids)for(const scale of [.05,1,8])it(id+' builds closed finite actual skull/jaw/crowns enclosed by minimum and fuller life at scale '+scale,()=>{
  let fixed=null;
  for(const tissue of [.90,1.13]){const b=native.build(id,scale,tissue),c=b.context,f=c.sauropodCranium;
   try{
    expect(c.model.userData.dinoSauropodCranium).toMatchObject({species:id,genusInformed:true,dimensionsAreInterpretive:true,tissueHypothesisIndependentAnchors:true,dentalSamplesAreLiteralFormula:false});
    expect(b.tagged.length).toBeGreaterThan(35);expect(b.upper.userData.dinoSauropodCranium.cranialMinU).toBe(1/11);expect(b.lower.userData.dinoSauropodCranium.element).toBe('mandibular-envelope');
    const buffer=cranialBuffers(b.bones);if(fixed)expect(buffer).toBe(fixed);else fixed=buffer;
    const contains=b.skins.map(m=>nativeMeshContains(m,scale*1e-7)),bad=[];let n=0;
    for(const m of b.bones)for(let i=0;i<m.geometry.attributes.position.count;i++){n++;if(!contains.some(fn=>fn(world(m,i))))bad.push({name:m.name,vertex:i,point:world(m,i).toArray()});}
    expect(n).toBeGreaterThan(10000);expect(bad.slice(0,8),'exposed skull/cervical vertices '+bad.length).toEqual([]);
    for(const m of b.tagged){closed(m,scale);for(const name of ['position','normal'])expect([...m.geometry.attributes[name].array].every(Number.isFinite),m.name).toBe(true);}
    const allTeeth=b.tagged.filter(m=>tag(m).sample),allUpper=allTeeth.filter(m=>m.userData.dinoToothRow==='upper'),allLower=allTeeth.filter(m=>m.userData.dinoToothRow==='lower');
    for(const tooth of allTeeth){const data=tag(tooth),bearing=b.tagged.find(m=>tag(m).id===(data.toothBearingElement==='maxilla'?'tooth-bearing-maxilla':data.toothBearingElement)&&tag(m).side===data.side);expect(bearing,tooth.name+' real tooth-bearing bone').toBeTruthy();expect(nativeMeshContains(bearing,scale*1e-8)(vec(...data.socket)),tooth.name+' actual root center').toBe(true);}
    expect(allTeeth.filter(m=>tag(m).arcade==='anterior')).toHaveLength(id==='diplodocus'?14:10);for(const a of allUpper)for(const z of allLower)expect(new THREE.Box3().setFromObject(a).intersectsBox(new THREE.Box3().setFromObject(z)),a.name+' vs '+z.name+' actual crown bounding boxes').toBe(false);
    for(const row of [allUpper,allLower])for(let i=0;i<row.length;i++)for(let j=i+1;j<row.length;j++)expect(new THREE.Box3().setFromObject(row[i]).intersectsBox(new THREE.Box3().setFromObject(row[j])),row[i].name+' vs '+row[j].name+' same arcade crown spacing').toBe(false);
    for(const side of[-1,1]){
     const teeth=b.tagged.filter(m=>tag(m).side===side&&tag(m).sample),maxilla=b.tagged.find(m=>tag(m).side===side&&tag(m).id==='tooth-bearing-maxilla'),dentary=b.tagged.find(m=>tag(m).side===side&&tag(m).id==='dentary');
     expect(teeth.length).toBeGreaterThan(8);for(const tooth of teeth){const t=tag(tooth),bearing=t.toothBearingElement==='dentary'?dentary:maxilla;expect(nativeMeshContains(bearing,scale*1e-8)(vec(...t.socket)),tooth.name+' root inside actual bone').toBe(true);expect(t.dentalFormulaClaimed).toBe(false);expect(t.crownShape).toBe(id==='diplodocus'?'narrow-crown':'spatulate');}
     const upper=teeth.filter(m=>m.userData.dinoToothRow==='upper'),lower=teeth.filter(m=>m.userData.dinoToothRow==='lower');for(const a of upper)for(const z of lower){const A=new THREE.Box3().setFromObject(a),B=new THREE.Box3().setFromObject(z);expect(A.intersectsBox(B),a.name+' vs '+z.name+' actual crowns').toBe(false);}
     const ts=teeth.map(m=>{const p=vec(...tag(m).socket);return(p.x-f.head.x)/(f.snout.x-f.head.x);});expect(Math.min(...ts)).toBeGreaterThan(id==='diplodocus'?.70:.35);expect(Math.min(...ts)).toBeLessThan(id==='diplodocus'?.82:.50);
     for(const name of ['bony-naris-rim','orbital-rim','temporal-rim']){const rim=b.tagged.find(m=>tag(m).side===side&&tag(m).id===name);expect(rim.geometry.type).toBe('TubeGeometry');expect(rim.geometry.parameters.closed).toBe(true);}
    }
   }finally{b.dispose();}
  }
 },30000);
});
