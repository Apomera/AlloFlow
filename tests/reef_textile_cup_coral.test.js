import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),local={};
new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(local);
const S=local.Reef3DSpecies,IDS=['textile_cone','orange_cup_coral'];
const make=(id,quality='high',extra={})=>S.create(T,id,{quality,seed:7,...extra});
function meshes(h){const out=[];h.root.traverse(m=>{if(m.isMesh)out.push(m)});return out;}
function positions(h){return meshes(h).map(m=>Array.from(m.geometry.attributes.position.array));}
function world(h){h.root.updateMatrixWorld(true);const out=[];h.root.traverse(n=>out.push([...n.matrixWorld.elements]));return out;}
function bounds(m){return new T.Box3().setFromBufferAttribute(m.geometry.attributes.position);}
function sphereContains(s,p){return p.distanceToSquared(s.center)<=s.radius*s.radius*(1+8*Number.EPSILON);}

describe('Textile cone and orange cup coral specimens',()=>{
  it('registers a bottom snail and a nonphotosynthetic sessile coral with explicit size conventions',()=>{
    expect(S.info('textile_cone')).toMatchObject({group:'invertebrate',habit:'bottom',origin:'base',lengthM:.09,depthM:[0,50],healthStates:['healthy']});
    expect(S.info('orange_cup_coral')).toMatchObject({group:'coral',habit:'sessile',origin:'base',lengthM:.075,depthM:[1,60],healthStates:['healthy','dead']});
    for(const id of IDS){expect(S.ids.filter(x=>x===id)).toHaveLength(1);expect(()=>S.createSchool(T,id,5)).toThrow();expect(S.info(id).portrait.dir.every(Number.isFinite)).toBe(true);}
  });
  for(const id of IDS)for(const quality of ['low','high']){
    it(id+' builds finite anatomy within the unchanged triangle and three-draw budgets at '+quality,()=>{
      const h=make(id,quality);try{const ms=meshes(h),cap=id==='textile_cone'?(quality==='low'?1500:6000):(quality==='low'?4000:12000);expect(ms).toHaveLength(3);expect(ms.reduce((n,m)=>n+m.geometry.index.count/3,0)).toBeLessThanOrEqual(cap);expect(h.radius/S.info(id).lengthM).toBeGreaterThan(.25);expect(h.radius/S.info(id).lengthM).toBeLessThan(1.6);expect(h.root.userData).toEqual({speciesId:id,group:S.info(id).group});
        for(const m of ms){for(const a of Object.values(m.geometry.attributes))expect([...a.array].every(Number.isFinite),m.name).toBe(true);expect([...m.geometry.index.array].every(i=>i>=0&&i<m.geometry.attributes.position.count)).toBe(true);expect(m.material.transparent).toBe(false);expect(m.material.emissive.getHex()).toBe(0);}
      }finally{h.dispose();}
    });
    it(id+' holds skeletal surfaces and placement fixed while soft tissue remains bounded at '+quality,()=>{
      const h=make(id,quality);try{h.root.position.set(12,-3,5);h.root.rotation.set(.1,.8,-.1);const before=positions(h),placement=world(h),ms=meshes(h);let delta=0;
        for(const t of [0,1.3,7,1000]){h.update(.016,t,{current:{x:1,z:-.4,strength:1}});expect(world(h)).toEqual(placement);expect(positions(h).slice(0,2)).toEqual(before.slice(0,2));const m=ms[2],p=m.geometry.attributes.position;
          for(let j=0;j<p.count;j++){const point=new T.Vector3().fromBufferAttribute(p,j);expect(m.geometry.boundingBox.containsPoint(point),m.name).toBe(true);expect(sphereContains(m.geometry.boundingSphere,point),m.name).toBe(true);for(let axis=0;axis<3;axis++)delta=Math.max(delta,Math.abs(p.array[j*3+axis]-before[2][j*3+axis]));}
        }expect(delta).toBeGreaterThan(.00005);expect(delta).toBeLessThan(.003);
      }finally{h.dispose();}
    });
  }
  for(const id of IDS){
    it(id+' keeps deterministic geometry and smooth time-based motion without drift',()=>{
      const a=make(id),b=make(id),other=make(id,'high',{seed:8});try{expect(positions(a)).toEqual(positions(b));expect(positions(a)).not.toEqual(positions(other));a.update(.016,2);const before=positions(a);a.update(.001,2.001);const after=positions(a);let delta=0;for(let m=0;m<before.length;m++)for(let i=0;i<before[m].length;i++)delta=Math.max(delta,Math.abs(after[m][i]-before[m][i]));expect(delta).toBeLessThan(.00001);a.update(.01,7);b.update(7,7);expect(positions(a)).toEqual(positions(b));}finally{a.dispose();b.dispose();other.dispose();}
    });
    it(id+' freezes fully under reduced motion and retains colors without derivatives',()=>{
      const h=make(id,'low',{reducedMotion:true,derivatives:false});try{const before=positions(h),placement=world(h);for(const t of [1,30,10000])h.update(.016,t);expect(positions(h)).toEqual(before);expect(world(h)).toEqual(placement);for(const m of meshes(h)){expect(m.material.bumpMap).toBeNull();expect(m.geometry.attributes.color).toBeTruthy();}}finally{h.dispose();}
    });
    it(id+' disposes every owned resource once and shares textures until the last handle closes',()=>{
      const a=make(id),b=make(id),ms=meshes(a),maps=new Set(ms.flatMap(m=>[m.material.map,m.material.bumpMap]).filter(Boolean)),geos=new Set(ms.map(m=>m.geometry)),mats=new Set(ms.map(m=>m.material));let ng=0,nm=0,nt=0;for(const g of geos)g.addEventListener('dispose',()=>ng++);for(const m of mats)m.addEventListener('dispose',()=>nm++);for(const map of maps)map.addEventListener('dispose',()=>nt++);expect(ms[0].material.bumpMap).toBe(meshes(b)[0].material.bumpMap);a.dispose();a.dispose();expect([ng,nm,nt]).toEqual([3,3,0]);b.dispose();b.dispose();expect(nt).toBe(maps.size);expect(()=>a.update(.1,2)).not.toThrow();
    });
  }
  it('gives the cone a short spire, narrow open aperture and a much smaller shell than the triton',()=>{
    const h=make('textile_cone');try{const shell=meshes(h)[0],box=bounds(shell),size=box.getSize(new T.Vector3());expect(size.x).toBeGreaterThan(.087);expect(size.x).toBeLessThan(.097);expect(size.y).toBeGreaterThan(.04);expect(size.y).toBeLessThan(.055);expect(size.x/size.y).toBeGreaterThan(1.6);
      const data=shell.geometry.userData.textileCone;expect(data).toMatchObject({nominalShellLengthM:.09,openAperture:true});expect(data.apertureAngularWidth).toBeLessThan(.4);const p=shell.geometry.attributes.position,spire=data.ranges.spire;let lo=Infinity,hi=-Infinity;for(let i=spire.first;i<spire.first+spire.rows*spire.sides;i++){lo=Math.min(lo,p.getX(i));hi=Math.max(hi,p.getX(i));}expect((hi-lo)/size.x).toBeLessThan(.25);
      // A ray through the slit reaches the far lining, rather than a cap or
      // painted disk at the near shell wall. Scale is recovered from its apex.
      const scale=size.x/.0923,a=1.97,axis=new T.Vector3(0,(.026+.002*(.03/.072)**2*(3-2*.03/.072))*scale,0),direction=new T.Vector3(0,-Math.cos(a),-Math.sin(a)),origin=axis.clone().addScaledVector(direction,-.07);shell.updateMatrixWorld(true);const hits=new T.Raycaster(origin,direction).intersectObject(shell);expect(hits.length).toBeGreaterThan(0);expect(hits[0].distance).toBeGreaterThan(.068);
    }finally{h.dispose();}
  });
  it('paints a dark angular network and pale islands without an emissive shell',()=>{
    const h=make('textile_cone');try{const shell=meshes(h)[0],image=shell.material.map.image;let pale=0,dark=0,warm=0,count=0;for(let y=0;y<Math.floor(image.height*.8);y++)for(let x=0;x<image.width;x++){const i=(y*image.width+x)*4;count++;if(image.data[i]>190&&image.data[i+1]>170)pale++;if(image.data[i]<145&&image.data[i+1]<110)dark++;if(image.data[i]>image.data[i+2]+40)warm++;}expect(pale/count).toBeGreaterThan(.12);expect(dark/count).toBeGreaterThan(.15);expect(warm/count).toBeGreaterThan(.5);expect(shell.material.emissive.getHex()).toBe(0);
      const p=shell.geometry.attributes.position,n=shell.geometry.attributes.normal,range=shell.geometry.userData.textileCone.ranges.outer,index=range.sides*Math.floor(range.columns/2)+Math.floor(range.sides/2),radial=new T.Vector3(0,p.getY(index)-.027,p.getZ(index)).normalize();expect(new T.Vector3().fromBufferAttribute(n,index).dot(radial)).toBeGreaterThan(.8);
    }finally{h.dispose();}
  });
  it('anchors every sensory appendage at the cone head',()=>{
    const h=make('textile_cone');try{const g=meshes(h)[2].geometry,base=[...g.attributes.position.array];h.update(.016,3);for(const a of g.userData.textileCone.appendages)for(let i=0;i<a.sides;i++){const at=(a.first+i)*3;expect([...g.attributes.position.array.slice(at,at+3)]).toEqual(base.slice(at,at+3));}}finally{h.dispose();}
  });
  it('preserves coral calice stations between tiers and anchors each tentacle ring',()=>{
    const low=make('orange_cup_coral','low'),high=make('orange_cup_coral');try{const lo=meshes(low)[0].geometry.userData.orangeCupCoral,hi=meshes(high)[0].geometry.userData.orangeCupCoral;expect(lo.cups).toEqual(hi.cups);expect(hi.cups).toHaveLength(14);expect(hi).toMatchObject({photosynthetic:false,fixedSkeletalCups:true});for(const c of hi.cups){expect(c.radius*2).toBeLessThanOrEqual(.011);expect(c.height).toBeLessThan(.04);}
      const g=meshes(high)[2].geometry,base=[...g.attributes.position.array],strands=g.userData.orangeCupCoral.strands;expect(strands).toHaveLength(14*24);high.update(.016,4,{current:{x:.7,z:.8,strength:1}});for(const s of strands)for(let j=0;j<3;j++){const at=(s.first+j)*3;expect([...g.attributes.position.array.slice(at,at+3)]).toEqual(base.slice(at,at+3));}
    }finally{low.dispose();high.dispose();}
  });
  it('moves flexible coral tips with the local current while avoiding rigid-cup sway',()=>{
    const a=make('orange_cup_coral'),b=make('orange_cup_coral');try{a.update(.016,4,{current:{x:1,z:0,strength:1}});b.update(.016,4,{current:{x:-1,z:0,strength:1}});const p=positions(a),q=positions(b);expect(p.slice(0,2)).toEqual(q.slice(0,2));let dx=0;for(let j=0;j<p[2].length;j+=3)dx+=p[2][j]-q[2][j];expect(dx).toBeGreaterThan(1);}finally{a.dispose();b.dispose();}
  });
  it('grows the colony and exposes a static dead skeleton without inventing bleaching',()=>{
    const young=make('orange_cup_coral','low',{growth:0}),mature=make('orange_cup_coral','low',{growth:1}),dead=make('orange_cup_coral','low',{health:'dead'}),bleach=make('orange_cup_coral','low',{health:'bleached'});try{expect(mature.radius/young.radius).toBeGreaterThan(4);expect(positions(bleach)).toEqual(positions(mature));expect(dead.animated).toBe(false);expect(meshes(dead)).toHaveLength(2);expect(dead.root.getObjectByName('orange_cup_coral-feeding-tentacles')).toBeUndefined();const before=positions(dead);dead.update(.1,50);expect(positions(dead)).toEqual(before);expect([...meshes(dead)[0].geometry.attributes.color.array]).not.toEqual([...meshes(mature)[0].geometry.attributes.color.array]);}finally{young.dispose();mature.dispose();dead.dispose();bleach.dispose();}
  });
});
