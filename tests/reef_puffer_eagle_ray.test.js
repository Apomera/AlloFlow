import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),local={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(local);
const S=local.Reef3DSpecies, IDS=['blackspotted_puffer','ocellated_eagle_ray'];
function make(id,quality='high',options={}){return S.create(T,id,{quality,seed:7,...options});}
function meshes(h){const out=[];h.root.traverse(m=>{if(m.isMesh)out.push(m);});return out;}
function buffers(h){return meshes(h).map(m=>Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])));}
function world(h){h.root.updateMatrixWorld(true);const out=[];h.root.traverse(n=>out.push([...n.matrixWorld.elements]));return out;}
function box(m){return new T.Box3().setFromBufferAttribute(m.geometry.attributes.position);}
// Three computes radius = sqrt(maxDistanceSquared); squaring it again in
// Sphere.containsPoint can round down by one ULP. Diagnostics found identical
// static-edge discrepancies before/after animation (8.67e-19 and2.78e-17 m²).
// Eight machine epsilons of r² cover only that numerical roundoff (<1e-14
// relative), without relaxing the modeled animation margins or box bounds.
function sphereContains(s,p){const r2=s.radius*s.radius;return p.distanceToSquared(s.center)<=r2*(1+8*Number.EPSILON);}
function color(image,u,v){const x=Math.max(0,Math.min(image.width-1,Math.floor(u*image.width))),y=Math.max(0,Math.min(image.height-1,Math.floor(v*image.height))),k=(y*image.width+x)*4;return [...image.data.slice(k,k+3)];}

describe('Blackspotted puffer and ocellated eagle ray specimens',()=>{
  it('registers distinct suspended, nonschooling specimens with an honest size convention',()=>{
    expect(S.info(IDS[0])).toMatchObject({lengthM:.25,depthM:[3,25],group:'fish',origin:'centre',schoolSize:null,healthStates:['healthy']});
    expect(S.info(IDS[1])).toMatchObject({lengthM:4.2,depthM:[0,60],group:'fish',origin:'centre',schoolSize:null,healthStates:['healthy']});
    for(const id of IDS){expect(S.ids.filter(s=>s===id)).toHaveLength(1);expect(()=>S.createSchool(T,id,5)).toThrow();expect(S.info(id).portrait.dir.every(Number.isFinite)).toBe(true);}
  });
  for(const id of IDS)for(const quality of ['low','high']){
    it(id+' preserves finite anatomy, three draws and existing triangle budgets at '+quality,()=>{
      const h=make(id,quality);try{const ms=meshes(h);expect(ms).toHaveLength(3);expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='high'?6000:1500);expect(h.root.userData).toEqual({speciesId:id,group:'fish'});expect(h.radius/S.info(id).lengthM).toBeGreaterThan(.25);expect(h.radius/S.info(id).lengthM).toBeLessThan(1.6);
        for(const m of ms){for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite),m.name).toBe(true);expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true);expect(m.material.transparent).toBe(false);expect(m.material.emissive.getHex()).toBe(0);expect(m.geometry.boundingBox.isEmpty()).toBe(false);}
      }finally{h.dispose();}
    });
    it(id+' keeps world placement fixed while all animated positions remain inside their bounds at '+quality,()=>{
      const h=make(id,quality);try{h.root.position.set(5,-2,8);h.root.rotation.set(.1,.7,-.1);const before=world(h),ms=meshes(h),initial=buffers(h);let movement=0;for(const time of [0,1.3,4,1000]){h.update(.016,time,{speed:2,turn:1});expect(world(h)).toEqual(before);for(let n=0;n<ms.length;n++){const m=ms[n],p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const pt=new T.Vector3().fromBufferAttribute(p,i);expect(m.geometry.boundingBox.containsPoint(pt),m.name).toBe(true);expect(sphereContains(m.geometry.boundingSphere,pt),m.name).toBe(true);movement=Math.max(movement,Math.abs(p.getY(i)-initial[n].position[i*3+1]),Math.abs(p.getZ(i)-initial[n].position[i*3+2]));}}}expect(movement).toBeGreaterThan(.001*S.info(id).lengthM);
      }finally{h.dispose();}
    });
  }
  for(const id of IDS){
    it(id+' is deterministic and continuous without accumulating frame-step drift',()=>{
      const a=make(id),b=make(id),other=make(id,'high',{seed:8});try{expect(buffers(a)).toEqual(buffers(b));expect(buffers(a)).not.toEqual(buffers(other));a.update(.016,2);const before=buffers(a);a.update(.001,2.001);const after=buffers(a);let delta=0;for(let i=0;i<before.length;i++)for(let j=0;j<before[i].position.length;j++)delta=Math.max(delta,Math.abs(before[i].position[j]-after[i].position[j]));expect(delta).toBeLessThan(.001*S.info(id).lengthM);a.update(.01,7);b.update(7,7);expect(buffers(a)).toEqual(buffers(b));}finally{a.dispose();b.dispose();other.dispose();}
    });
    it(id+' freezes fully for reduced motion and preserves pigment without shader derivatives',()=>{
      const h=make(id,'low',{reducedMotion:true,derivatives:false});try{const before=buffers(h),p=world(h);for(const t of [1,30,10000])h.update(.016,t);expect(buffers(h)).toEqual(before);expect(world(h)).toEqual(p);for(const m of meshes(h))expect(m.material.bumpMap).toBeNull();expect(meshes(h)[0].material.map).toBeTruthy();}finally{h.dispose();}
    });
    it(id+' reference counts textures and disposes each owned resource only once',()=>{
      const a=make(id),b=make(id),ms=meshes(a),maps=new Set(ms.flatMap(m=>[m.material.map,m.material.bumpMap]).filter(Boolean)),geos=new Set(ms.map(m=>m.geometry)),mats=new Set(ms.map(m=>m.material));let ng=0,nm=0,nt=0;for(const g of geos)g.addEventListener('dispose',()=>ng++);for(const m of mats)m.addEventListener('dispose',()=>nm++);for(const t of maps)t.addEventListener('dispose',()=>nt++);expect(ms[0].material.map).toBe(meshes(b)[0].material.map);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([3,3,0]);b.dispose();b.dispose();expect(nt).toBe(maps.size);expect(()=>a.update(.1,2)).not.toThrow();
    });
  }
  it('keeps the puffer uninflated, round-bodied and dog-faced with no long projecting spines',()=>{
    const h=make(IDS[0]);try{const ms=meshes(h),body=box(ms[0]),all=new T.Box3().setFromObject(h.root),d=ms[0].geometry.userData.blackspottedPuffer;expect(d).toMatchObject({inflated:false,longSpines:0,nominalTotalLengthM:.25});expect(body.getSize(new T.Vector3()).z/body.getSize(new T.Vector3()).y).toBeGreaterThan(.85);expect(all.max.x-all.min.x).toBeGreaterThan(.245);expect(all.max.x-all.min.x).toBeLessThan(.275);expect(body.max.x).toBeGreaterThan(.1);const image=ms[0].material.map.image;const dorsal=color(image,.5,.5),belly=color(image,.5,.99);expect(belly[0]+belly[1]+belly[2]).toBeGreaterThan(dorsal[0]+dorsal[1]+dorsal[2]);let dark=0,pale=0;for(let i=0;i<image.data.length;i+=4){if(image.data[i]<70)dark++;if(image.data[i]>170)pale++;}expect(dark/image.width/image.height).toBeGreaterThan(.025);expect(pale/image.width/image.height).toBeGreaterThan(.15);
    }finally{h.dispose();}
  });
  it('anchors every puffer fin root and alternates pectorals while median fins work together',()=>{
    const h=make(IDS[0]);try{const g=meshes(h)[2].geometry,d=g.userData.blackspottedPuffer,base=[...g.attributes.position.array];h.update(.016,1);const p=g.attributes.position.array;for(const f of d.fins)for(let i=0;i<f.count;i+=f.across+1){const at=(f.first+i)*3;expect([...p.slice(at,at+3)]).toEqual(base.slice(at,at+3));}const at=f=> (f.first+Math.floor((f.columns-1)/2)*(f.across+1)+f.across)*3;const left=at(d.fins[0]),right=at(d.fins[1]);expect(p[left+1]-base[left+1]).toBeCloseTo(-(p[right+1]-base[right+1]),7);const dorsal=at(d.fins[2]),anal=at(d.fins[3]);expect(p[dorsal+2]-base[dorsal+2]).toBeCloseTo(p[anal+2]-base[anal+2],7);expect(meshes(h)[0].geometry.attributes.position.version).toBe(0);expect(meshes(h)[1].geometry.attributes.position.version).toBe(0);
    }finally{h.dispose();}
  });
  it('gives the eagle ray a wide pointed diamond, projecting head and a long finless whip',()=>{
    const h=make(IDS[1]);try{const ms=meshes(h),b=box(ms[0]),head=box(ms[1]),tail=box(ms[2]),d=ms[0].geometry.userData.ocellatedEagleRay;expect(d).toMatchObject({nominalDiscWidthM:1.5,nominalTotalLengthM:4.2,cephalicLobes:0,gillSlitsPerSide:5});expect(b.getSize(new T.Vector3()).z).toBeGreaterThan(1.46);expect(b.getSize(new T.Vector3()).z).toBeLessThan(1.54);expect(head.max.x).toBeGreaterThan(b.max.x+.12);expect(tail.getSize(new T.Vector3()).x).toBeGreaterThan(3.2);expect(head.max.x-tail.min.x).toBeGreaterThan(4.1);expect(head.max.x-tail.min.x).toBeLessThan(4.3);const p=ms[0].geometry.attributes.position;for(const end of [0,d.spanRows]){const first=end*(d.chordColumns+1),xs=[];for(let i=0;i<=d.chordColumns;i++)xs.push(p.getX(first+i));expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(.000001);}expect(ms[1].geometry.userData.ocellatedEagleRay).toMatchObject({duckbillSnout:true,lateralEyePair:true,spiraclePair:true,ventralMouth:true});
    }finally{h.dispose();}
  });
  it('paints pale dorsal spots and five paired ventral gill openings, with outward-facing disc normals',()=>{
    const h=make(IDS[1]);try{const ms=meshes(h),g=ms[0].geometry,image=ms[0].material.map.image,d=g.userData.ocellatedEagleRay;let bright=0,dark=0;for(let y=5;y<image.height*.46;y++)for(let x=0;x<image.width;x++){const k=(y*image.width+x)*4;if(image.data[k]>170)bright++;if(image.data[k]<120)dark++;}expect(bright).toBeGreaterThan(500);expect(dark).toBeGreaterThan(bright);for(const side of [-1,1])for(let i=0;i<5;i++){const x=.116-.035*i+.075*Math.pow(.08-.065,2),u=(x+.30)/.50,v=(side*.08+.5)*.46+.52;const slit=color(image,u,v),gap=color(image,(x+.014+.30)/.50,v);expect(slit[0]).toBeLessThan(gap[0]-35);}const middle=Math.floor(d.spanRows/2)*(d.chordColumns+1)+Math.floor(d.chordColumns/2),bottom=middle+(d.spanRows+1)*(d.chordColumns+1);expect(g.attributes.normal.getY(middle)).toBeGreaterThan(.5);expect(g.attributes.normal.getY(bottom)).toBeLessThan(-.5);
    }finally{h.dispose();}
  });
});
