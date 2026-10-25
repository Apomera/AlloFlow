import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T = createRequire(import.meta.url)('../vendor/three-r128/three.min.js'), local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies, IDS = ['longfin_bannerfish', 'bigfin_reef_squid'];
const make = (id, quality = 'high', extra = {}) => S.create(T, id, { quality, seed: 7, ...extra });
function meshes(h) { const out = []; h.root.traverse(m => { if (m.isMesh) out.push(m); }); return out; }
function positions(h) { return meshes(h).map(m => [...m.geometry.attributes.position.array]); }
function matrices(h) { h.root.updateMatrixWorld(true); const out = []; h.root.traverse(m => out.push([...m.matrixWorld.elements])); return out; }
function rangeBox(g, first, count) { const box = new T.Box3(); for (let i = first; i < first + count; i++) box.expandByPoint(new T.Vector3().fromBufferAttribute(g.attributes.position, i)); return box; }

describe('Longfin bannerfish and bigfin reef squid specimens', () => {
  it('registers new guide specimens without replacing the Moorish idol', () => {
    expect(S.info(IDS[0])).toMatchObject({ group: 'fish', habit: 'pair', lengthM: .15, depthM: [2, 75], origin: 'centre', healthStates: ['healthy'] });
    expect(S.info(IDS[1])).toMatchObject({ group: 'invertebrate', habit: 'hover', lengthM: .4, depthM: [0, 100], origin: 'centre', healthStates: ['healthy'] });
    expect(S.info('moorish_idol')).toMatchObject({ group: 'fish', habit: 'pair', lengthM: .18, depthM: [3, 40] });
    for (const id of IDS) { expect(S.ids.filter(x => x === id)).toHaveLength(1); expect(S.info(id).portrait.dir.every(Number.isFinite)).toBe(true); expect(() => S.createSchool(T, id, 3)).toThrow(); }
  });
  for (const id of IDS) for (const quality of ['low', 'high']) {
    it(id + ' retains finite detailed anatomy within the existing triangle and draw budgets at ' + quality, () => {
      const h = make(id, quality); try { const ms = meshes(h); expect(ms).toHaveLength(3); expect(ms.reduce((n,m) => n + m.geometry.index.count / 3, 0)).toBeLessThanOrEqual(quality === 'low' ? 1500 : 6000); expect(h.radius / S.info(id).lengthM).toBeGreaterThan(.25); expect(h.radius / S.info(id).lengthM).toBeLessThan(1.6);
        expect(h.root.userData).toEqual({ speciesId: id, group: S.info(id).group });
        for (const m of ms) { for (const a of Object.values(m.geometry.attributes)) expect([...a.array].every(Number.isFinite), m.name).toBe(true); expect([...m.geometry.index.array].every(i => i >= 0 && i < m.geometry.attributes.position.count)).toBe(true); expect(m.material.transparent).toBe(false); expect(m.material.emissive.getHex()).toBe(0); }
      } finally { h.dispose(); }
    });
    it(id + ' animates locally inside conservative bounds and never changes scene placement at ' + quality, () => {
      const h = make(id, quality); try { h.root.position.set(8,-4,11); h.root.rotation.set(.1,.7,-.1); const original = positions(h), transforms = matrices(h); let maximum = 0;
        for (const t of [0,1.6,10,10000]) { h.update(.016,t,{ speed: 1.6 }); expect(matrices(h)).toEqual(transforms);
          for (const [mi,m] of meshes(h).entries()) { const p=m.geometry.attributes.position; for (let j=0;j<p.count;j++) { const v=new T.Vector3().fromBufferAttribute(p,j); expect(m.geometry.boundingBox.containsPoint(v),m.name).toBe(true); expect(v.distanceToSquared(m.geometry.boundingSphere.center)).toBeLessThanOrEqual(m.geometry.boundingSphere.radius ** 2 * (1+1e-7)); for (let a=0;a<3;a++) maximum=Math.max(maximum,Math.abs(p.array[j*3+a]-original[mi][j*3+a])); } }
        } expect(maximum).toBeGreaterThan(.0001); expect(maximum).toBeLessThan(.0095);
      } finally { h.dispose(); }
    });
  }
  for (const id of IDS) {
    it(id + ' is seeded and has continuous analytic motion with no accumulated drift', () => {
      const a=make(id),b=make(id),other=make(id,'high',{seed:8}); try { expect(positions(a)).toEqual(positions(b)); expect(positions(a)).not.toEqual(positions(other)); a.update(.016,3); const before=positions(a); a.update(.001,3.001); const after=positions(a); let delta=0; for(let m=0;m<before.length;m++)for(let j=0;j<before[m].length;j++)delta=Math.max(delta,Math.abs(after[m][j]-before[m][j])); expect(delta).toBeLessThan(.000035); a.update(.01,7); b.update(7,7); expect(positions(a)).toEqual(positions(b));
      } finally { a.dispose();b.dispose();other.dispose(); }
    });
    it(id + ' freezes under reduced motion and retains pigment without derivatives', () => {
      const h=make(id,'low',{reducedMotion:true,derivatives:false}); try { const before=positions(h),transforms=matrices(h); for(const t of [1,20,10000])h.update(.016,t); expect(positions(h)).toEqual(before);expect(matrices(h)).toEqual(transforms);for(const m of meshes(h)){expect(m.material.bumpMap).toBeNull();expect(m.geometry.attributes.color).toBeTruthy();} } finally {h.dispose();}
    });
    it(id + ' releases geometry and materials once and shared textures only after the final handle', () => {
      const a=make(id),b=make(id),ms=meshes(a),maps=new Set(ms.flatMap(m=>[m.material.map,m.material.bumpMap]).filter(Boolean));let ng=0,nm=0,nt=0;
      for(const m of ms){m.geometry.addEventListener('dispose',()=>ng++);m.material.addEventListener('dispose',()=>nm++);}for(const map of maps)map.addEventListener('dispose',()=>nt++);expect(ms[0].material.bumpMap).toBe(meshes(b)[0].material.bumpMap);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([3,3,0]);b.dispose();b.dispose();expect(nt).toBe(maps.size);expect(()=>a.update(.1,4)).not.toThrow();
    });
  }
  it('gives the bannerfish a compressed body, projecting snout and a tapering dorsal banner', () => {
    const h=make(IDS[0]);try{const [body,fins,detail]=meshes(h),data=body.geometry.userData.longfinBannerfish,box=new T.Box3().setFromBufferAttribute(body.geometry.attributes.position),size=box.getSize(new T.Vector3());expect(size.y/size.z).toBeGreaterThan(3);expect(data.nominalTotalLengthM).toBe(.15);
      const banner=fins.geometry.userData.longfinBannerfish.parts.find(p=>p.name==='white-dorsal-banner'),bb=rangeBox(fins.geometry,banner.first,banner.count);expect(bb.max.y).toBeGreaterThan(box.max.y*2.5);expect(bb.getSize(new T.Vector3()).z).toBeLessThan(.003);const rays=detail.geometry.userData.longfinBannerfish.dorsalRays;expect(rays).toHaveLength(11);expect(rays.filter(r=>r.extended).map(r=>r.index)).toEqual([3]);
      const all=new T.Box3();for(const m of meshes(h))all.union(new T.Box3().setFromBufferAttribute(m.geometry.attributes.position));expect(all.getSize(new T.Vector3()).x/data.scale).toBeGreaterThan(.149);expect(all.getSize(new T.Vector3()).x/data.scale).toBeLessThan(.157);
    }finally{h.dispose();}
  });
  it('paints exactly two broad oblique body bands and a yellow tail', () => {
    const h=make(IDS[0]);try{const [body,fins]=meshes(h),image=body.material.map.image;for(const vf of [.20,.30,.70,.80]){const y=Math.floor(image.height*vf);let transitions=0,previous=false,dark=0;for(let x=0;x<image.width;x++){const at=(y*image.width+x)*4,now=image.data[at]<60&&image.data[at+1]<65;if(now)dark++;if(x&&now!==previous)transitions++;previous=now;}expect(transitions).toBe(4);expect(dark/image.width).toBeGreaterThan(.30);expect(dark/image.width).toBeLessThan(.58);}
      const tail=fins.geometry.userData.longfinBannerfish.parts.find(p=>p.name==='yellow-caudal-fin'),col=fins.geometry.attributes.color;for(let i=tail.first;i<tail.first+tail.count;i++){expect(col.getX(i)).toBeGreaterThan(col.getZ(i)*2);expect(col.getY(i)).toBeGreaterThan(col.getZ(i)*2);}
    }finally{h.dispose();}
  });
  it('retains a quarter-metre mantle and broad fins spanning almost its full length', () => {
    const h=make(IDS[1]);try{const [body,fins]=meshes(h),data=body.geometry.userData.bigfinReefSquid,mantle=rangeBox(body.geometry,data.ranges.mantle.first,data.ranges.mantle.count),size=mantle.getSize(new T.Vector3());expect(size.x/data.scale).toBeCloseTo(.254,3);expect(size.z/data.scale).toBeGreaterThan(.095);expect(size.z/size.x).toBeLessThan(.42);expect(data).toMatchObject({nominalPosedLengthM:.4,nominalMantleLengthM:.25});
      const fs=fins.geometry.userData.bigfinReefSquid;expect(fs.mantleCoverage).toBeGreaterThan(.9);expect(fs.fins).toHaveLength(2);for(const f of fs.fins){const p=fins.geometry.attributes.position,box=rangeBox(fins.geometry,f.first,f.count);expect(box.getSize(new T.Vector3()).x/size.x).toBeGreaterThan(.94);let widest=-Infinity,wideX=0;for(let i=f.first;i<f.first+f.count;i++){const z=Math.abs(p.getZ(i));if(z>widest){widest=z;wideX=p.getX(i);}}expect(wideX).toBeLessThan((mantle.min.x+mantle.max.x)*.5);expect(widest).toBeGreaterThan(size.z*.72);}
    }finally{h.dispose();}
  });
  it('shows eight paired-sucker arms and two distinct longer club-ended tentacles', () => {
    const h=make(IDS[1]);try{const g=meshes(h)[2].geometry,d=g.userData.bigfinReefSquid,short=d.arms.filter(a=>!a.tentacle),long=d.arms.filter(a=>a.tentacle);expect(short).toHaveLength(8);expect(long).toHaveLength(2);expect(d).toMatchObject({armSuckerRows:2,clubSuckerRows:4});
      for(const a of short){expect(a.club).toBeUndefined();expect(new Set(d.cups.filter(c=>c.arm===a.index).map(c=>c.row)).size).toBe(2);}for(const a of long){expect(a.tip[0]).toBeGreaterThan(Math.max(...short.map(b=>b.tip[0]))+.020);expect(a.club.count).toBeGreaterThan(0);expect(new Set(d.cups.filter(c=>c.arm===a.index).map(c=>c.row)).size).toBe(4);expect(a.club.flattened).toBe(true);
        const n=new T.Vector3(0,-a.tip[1],-a.tip[2]).normalize(),across=new T.Vector3().crossVectors(new T.Vector3(1,0,0),n).normalize(),p=g.attributes.position,ns=[],ws=[];for(let j=a.club.first;j<a.club.first+a.club.count;j++){const v=new T.Vector3().fromBufferAttribute(p,j);ns.push(v.dot(n));ws.push(v.dot(across));}expect((Math.max(...ns)-Math.min(...ns))/(Math.max(...ws)-Math.min(...ws))).toBeLessThan(.85);
      }
      const body=meshes(h)[0],bd=body.geometry.userData.bigfinReefSquid;expect(bd.eyes.map(e=>e.pupilShape)).toEqual(['round','round']);for(const e of bd.eyes){const box=rangeBox(body.geometry,e.first,e.count);expect(Math.max(Math.abs(box.min.z),Math.abs(box.max.z))/bd.scale).toBeLessThan(.035);}
    }finally{h.dispose();}
  });
  it('keeps the squid head and arm roots steady while mantle, fin edges and arm tips move', () => {
    const h=make(IDS[1]);try{const [body,fins,limbs]=meshes(h),rest=positions(h),data=body.geometry.userData.bigfinReefSquid;h.update(.016,2.6);const after=positions(h),head=data.ranges.head;expect(after[0].slice(head.first*3,(head.first+head.count)*3)).toEqual(rest[0].slice(head.first*3,(head.first+head.count)*3));
      for(const a of limbs.geometry.userData.bigfinReefSquid.arms)for(let j=0;j<a.sides;j++){const at=(a.first+j)*3;expect(after[2].slice(at,at+3)).toEqual(rest[2].slice(at,at+3));}
      for(const index of [0,1,2])expect(after[index]).not.toEqual(rest[index]);
    }finally{h.dispose();}
  });
  it('retains fine nonemissive chromatophore variation with a pearl unpatterned neutral texel', () => {
    const h=make(IDS[1]);try{const map=meshes(h)[0].material.map.image,unique=new Set();for(let y=0;y<map.height;y+=3)for(let x=0;x<map.width;x+=3){const at=(y*map.width+x)*4;unique.add([map.data[at],map.data[at+1],map.data[at+2]].join());}expect(unique.size).toBeGreaterThan(150);const at=((map.height-1)*map.width+map.width-1)*4;expect([...map.data.slice(at,at+4)]).toEqual([255,255,255,255]);
    }finally{h.dispose();}
  });
});
