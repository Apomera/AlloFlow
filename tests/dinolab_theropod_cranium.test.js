import{describe,it,expect}from'vitest';
import{readFileSync}from'node:fs';
import{nativeReviewedTheropodCranium,nativeTheropodFacialDetails,THREE,vec,nativeMeshContains}from'./helpers/dino_native_theropod_cranium_harness.js';
const source=readFileSync(process.env.DINO_THEROPOD_CRANIUM_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
const native=nativeReviewedTheropodCranium(source),ids=['allosaurus','dilophosaurus','coelophysis'];
const serial=meshes=>JSON.stringify(meshes.map(m=>({p:Array.from(m.geometry.attributes.position.array),n:Array.from(m.geometry.attributes.normal.array),ix:m.geometry.index?Array.from(m.geometry.index.array):null,x:m.position.toArray(),q:m.quaternion.toArray(),s:m.scale.toArray()})));
function signedVolume(g){const p=g.attributes.position,ix=g.index,origin=vec().fromBufferAttribute(p,0);let v=0;for(let i=0;i<ix.count;i+=3){const a=vec().fromBufferAttribute(p,ix.getX(i)).sub(origin),b=vec().fromBufferAttribute(p,ix.getX(i+1)).sub(origin),c=vec().fromBufferAttribute(p,ix.getX(i+2)).sub(origin);v+=a.dot(b.cross(c))/6;}return v;}
describe('reviewed species-specific theropod crania',()=>{
  it('scopes frames and envelopes to the five reviewed taxa and retains the mature Tyrannosaurus profile',()=>{
    for(const d of native.art.DINOS.filter(d=>![...ids,'velociraptor','deinonychus'].includes(d.id))){expect(native.art.dinoTheropodCraniumProfileFor(d),d.id).toBeNull();expect(native.art.dinoTheropodCraniumFrame(THREE,d,{}),d.id).toBeNull();}
    const rex=native.art.DINOS.find(d=>d.id==='tyrannosaurus');expect(native.art.cranialSurfaceProfileFor(rex).matureTyrannosaur).toBe(true);
  });
  it('distinguishes fossil anatomy, taxonomy, maturity and authored proportions',()=>{
    const ps=ids.map(id=>native.art.dinoTheropodCraniumProfileFor(native.art.DINOS.find(d=>d.id===id)));
    expect(ps[0].evidence).toContain('overlaps the lacrimal');expect(ps[0].openingsEvidence).toContain('USNM 4734');expect(ps[0].openingsEvidence).toContain('A. jimmadseni');expect(ps[0].sources[0].url).toBe('https://doi.org/10.7717/peerj.8493');
    expect(ps[1].evidence).toContain('strong and immobile');expect(ps[1].jawEvidence).toContain('No coronoid bone is preserved');expect(ps[1].sources[0].url).toBe('https://doi.org/10.1017/jpa.2020.14');
    expect(ps[2].openingsEvidence).toContain('not copied as a universal adult');expect(ps[2].sources[0].url).toBe('https://doi.org/10.4202/app.01085.2023');
    for(const p of ps){expect(p.dimensionsAreInterpretive).toBe(true);expect(p.proportionBasis).toContain('not claimed specimen measurements');expect(p.limit).toContain('does not establish');}
  });
  for(const id of ids)for(const scale of [.05,1,8])it(id+' has fixed enclosed cranial/cervical bones and seated face at scale '+scale,()=>{
    let fixed=null;
    for(const tissue of[.90,1.13]){
      const b=native.build(id,scale,tissue),c=b.context;
      try{
        const f=c.theropodCranium,meta=c.model.userData.dinoTheropodCranium;
        expect(meta.species).toBe(id);expect(meta.tissueHypothesisIndependentAnchors).toBe(true);
        expect(f.head.toArray()).toEqual(c.head.toArray());expect(f.snout.toArray()).toEqual(c.snout.toArray());
        expect(c.snout.distanceTo(c.head.clone().add(vec(-c.len*.085,-c.ht*.020,0)))).toBeLessThan(c.ht*1e-9);
        expect(b.cranialVault).toBeNull();expect(b.cranialRostrum).toBeNull();
        const inside=b.skins.map(m=>nativeMeshContains(m,c.ht*2e-6));let count=0,bad=[];
        for(const m of b.bones)for(let i=0;i<m.geometry.attributes.position.count;i++){count++;const p=vec().fromBufferAttribute(m.geometry.attributes.position,i).applyMatrix4(m.matrixWorld);if(!inside.some(fn=>fn(p))&&bad.length<8)bad.push({mesh:m.name,point:p.toArray()});}
        expect(count).toBeGreaterThan(30000);expect(bad).toEqual([]);
        const bytes=serial(b.bones);if(fixed===null)fixed=bytes;else expect(bytes).toBe(fixed);
        const elements=b.bones.filter(m=>m.userData.dinoTheropodCranialElement);
        for(const side of[-1,1])for(const name of['orbital-rim','antorbital-fenestra-rim','external-naris-rim','lateral-temporal-rim','lacrimal-shaft','dentary'])expect(elements.some(m=>m.userData.dinoTheropodCranialElement.side===side&&m.userData.dinoTheropodCranialElement.element===name)).toBe(true);
        const upper=elements.filter(m=>/^upper-tooth-sample-\d+$/.test(m.userData.dinoTheropodCranialElement.element)),lower=elements.filter(m=>/^lower-tooth-sample-\d+$/.test(m.userData.dinoTheropodCranialElement.element));
        const samplesPerSide=id==='coelophysis'?9:8;expect(upper.length).toBe(samplesPerSide*2);expect(lower.length).toBe(samplesPerSide*2);
        for(const side of[-1,1])for(const row of[upper,lower])expect(row.filter(m=>m.userData.dinoTheropodCranialElement.side===side)).toHaveLength(samplesPerSide);
        for(const m of[...upper,...lower]){expect(m.geometry.userData.dinoCurvedBone.points).toHaveLength(4);const pts=m.geometry.userData.dinoCurvedBone.points;expect((pts[3][1]-pts[0][1])*(m.userData.dinoToothRow==='lower'?1:-1)).toBeGreaterThan(0);expect(m.userData.dinoPartIds).toContain(m.userData.dinoToothRow==='lower'?'jaw':'skull');}
        for(const m of elements.filter(m=>/dentary|premaxilla|expanded-anterior-jugal|maxillary-tooth-bearing/.test(m.userData.dinoTheropodCranialElement.element))){expect(signedVolume(m.geometry),m.name).toBeGreaterThan(0);expect(Array.from(m.geometry.attributes.normal.array).every(Number.isFinite)).toBe(true);}
        // Empty antorbital centres are real spaces between the closed bars.
        const opening=c.head.clone().lerp(c.snout,.51).add(vec(0,f.boneHeight*.10,f.depth*4));
        const hits=new THREE.Raycaster(opening,vec(0,0,-1)).intersectObjects(elements,false);expect(hits).toEqual([]);
        const face=nativeTheropodFacialDetails(source,b);
        for(const detail of face){expect(detail.eye.frame).toBeTruthy();expect(detail.nostril.frame).toBeTruthy();expect(detail.mouth).toBeTruthy();expect(detail.mouth.geometry.parameters.projected).toBe(detail.mouth.geometry.parameters.samples);}
      }finally{b.dispose();}
    }
  });
});
