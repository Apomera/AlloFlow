import { historicalReviewedCranialProjection } from './fixtures/dinolab_historical_cranial_profiles.js';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { baselineCranialGeometry, baselineSurfaceGeometry, baselineCranialProfile, baselineCranialRadii } from './fixtures/dinolab_before_slender_rostrum.js';

const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_SLENDER_ROSTRUM_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const registration="window.StemLab.registerTool('dinoLab'";
if(!source.includes(registration))throw Error('Missing Dino Lab registration');
window.StemLab={registerTool(){}};
const nativeHelpers=[...new Set([...source.matchAll(/^  function (\w+)\(/gm)].map(match=>match[1]))];
new Function(source.replace(registration,'globalThis.__slenderRostrum={DINOS,skeletalAnatomyProfileFor,'+nativeHelpers.join(',')+'};'+registration))();
const art=globalThis.__slenderRostrum;delete globalThis.__slenderRostrum;
const vector=(a,i)=>new T.Vector3().fromBufferAttribute(a,i);
const bytes=a=>new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength);
function exactAttribute(a,b){expect(a.itemSize).toBe(b.itemSize);expect(a.normalized).toBe(b.normalized);expect(a.array.constructor).toBe(b.array.constructor);expect(bytes(a)).toEqual(bytes(b));}
function exactGeometry(a,b){expect(Object.keys(a.attributes)).toEqual(Object.keys(b.attributes));for(const k of Object.keys(b.attributes))exactAttribute(a.attributes[k],b.attributes[k]);exactAttribute(a.index,b.index);expect(a.boundingBox).toEqual(b.boundingBox);expect(a.boundingSphere).toEqual(b.boundingSphere);expect(a.userData).toEqual(b.userData);}
function specimen(scale=1,offset=new T.Vector3(),profileId='sinosauropteryx'){
  const dn=art.DINOS.find(d=>d.id===profileId),profile=art.cranialSurfaceProfileFor(dn);
  const points=[[1.2,0,0],[.65,0,0],[0,0,0],[-.6844,-.0232,0],[-1.18,-.04,0],[-1.46,-.04,0]].map(p=>new T.Vector3(...p).multiplyScalar(scale).add(offset));
  const radii=art.dinoTheropodCranialRadii(.4*scale,.26*scale,.12*scale,profile);
  const shape={center:new T.Vector3(-.3304,-.096,0).multiplyScalar(scale).add(offset),length:scale,height:.4*scale,depth:.26*scale,cheek:profile.cheekScale};
  return {points,radii,shape,profile};
}
function pair(s,...flags){const flag=flags.length?flags[0]:true;return {before:baselineCranialGeometry(T,s.points,s.radii,s.shape),after:art.dinoCranialGeometry(T,s.points,s.radii,{...s.shape,compactRostrum:flag})};}
function expectedX(x,start,span){return x<start?start-(start-x)/(1+1.5*(start-x)/span):x;}
function triangle(g,i){const ids=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)],p=ids.map(id=>vector(g.attributes.position,id));return {ids,p,normal:p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]))};}

describe('Slender-theropod rostral closure',()=>{
  for(const scale of [.2,1,9])it('shortens only the forward closure and preserves cheek relief/topology at scale '+scale,()=>{
    const s=specimen(scale),{before,after}=pair(s),a=after.attributes.position,b=before.attributes.position,start=s.points[4].x,span=start-s.points[5].x,tolerance=scale*3e-7;
    exactAttribute(after.index,before.index);exactAttribute(after.attributes.uv,before.attributes.uv);
    expect(a.count).toBe(73*41+2);expect(after.index.count).toBe(72*40*6+80*3);expect(after.userData).toEqual(before.userData);
    let changed=0,untouched=0;
    for(let i=0;i<a.count;i++){
      expect(a.getY(i)).toBe(b.getY(i));expect(a.getZ(i)).toBe(b.getZ(i));
      if(b.getX(i)>=start){expect(a.getX(i)).toBe(b.getX(i));untouched++;}
      else{expect(Math.abs(a.getX(i)-expectedX(b.getX(i),start,span))).toBeLessThan(tolerance);expect(a.getX(i)).toBeGreaterThan(b.getX(i));expect(a.getX(i)).toBeLessThan(start);changed++;}
    }
    expect(changed).toBeGreaterThan(100);expect(untouched).toBeGreaterThan(a.count*.7);
    const cap=a.count-1;expect(a.getX(cap)).toBeCloseTo(start-span/2.5,5);expect(a.getY(cap)).toBe(b.getY(cap));expect(a.getZ(cap)).toBe(b.getZ(cap));
    before.dispose();after.dispose();
  });
  for(const scale of [.2,1,9])it('keeps ordered stations, closed caps, and outward winding at scale '+scale,()=>{
    const s=specimen(scale),{before,after}=pair(s),a=after.attributes.position,b=before.attributes.position;
    const order=Array.from({length:a.count},(_,i)=>i).sort((i,j)=>b.getX(i)-b.getX(j));
    for(let i=1;i<order.length;i++)expect(a.getX(order[i])).toBeGreaterThanOrEqual(a.getX(order[i-1]));
    // The connectivity is independently frozen. In particular, the end fan must
    // join the moved cap center to the same complete terminal ring.
    const capIndex=a.count-1,fanStart=after.index.count-40*3;
    for(let j=0;j<40;j++)expect([after.index.getX(fanStart+j*3),after.index.getX(fanStart+j*3+1),after.index.getX(fanStart+j*3+2)]).toEqual([capIndex,72*41+j,72*41+j+1]);
    for(let i=0;i<after.index.count;i+=3){const face=triangle(after,i),old=triangle(before,i);expect(face.normal.length()).toBeGreaterThan(scale*scale*1e-9);expect(face.normal.dot(old.normal)).toBeGreaterThan(0);}
    // End-cap winding points toward the nose, root-cap winding toward the neck.
    for(let j=0;j<40;j++){expect(triangle(after,fanStart+j*3).normal.x).toBeLessThan(0);expect(triangle(after,fanStart-120+j*3).normal.x).toBeGreaterThan(0);}
    before.dispose();after.dispose();
  });
  for(const scale of [.2,1,9])it('rebuilds finite unit normals, an invisible UV seam and containing bounds at scale '+scale,()=>{
    const {before,after}=pair(specimen(scale)),p=after.attributes.position,n=after.attributes.normal;
    for(const attr of Object.values(after.attributes))expect([...attr.array].every(Number.isFinite)).toBe(true);
    for(let i=0;i<p.count;i++){const v=vector(p,i);expect(Math.abs(vector(n,i).length()-1)).toBeLessThan(1e-6);expect(after.boundingBox.containsPoint(v)).toBe(true);expect(v.distanceTo(after.boundingSphere.center)).toBeLessThanOrEqual(after.boundingSphere.radius+scale*1e-6);}
    for(let ring=0;ring<=72;ring++){expect(vector(p,ring*41).distanceTo(vector(p,ring*41+40))).toBeLessThan(scale*1e-8);expect(vector(n,ring*41).toArray()).toEqual(vector(n,ring*41+40).toArray());}
    before.dispose();after.dispose();
  });
  for(const flag of [undefined,false,0,1,'true'])it('is byte-exact to the independent baseline without strict opt-in: '+String(flag),()=>{
    const s=specimen(),{before,after}=pair(s,flag);exactGeometry(after,before);before.dispose();after.dispose();
  });
  for(const species of ['tyrannosaurus','microraptor','spinosaurus','triceratops'])it('keeps the '+species+' control geometry exact',()=>{
    const s=specimen(1,new T.Vector3(),species),{before,after}=pair(s,s.profile.id==='slender-theropod');expect(s.profile.id).not.toBe('slender-theropod');exactGeometry(after,before);before.dispose();after.dispose();
  });
  for(const kind of ['five points','five radii','zero span','reversed span'])it('preserves the independent baseline for unsupported topology: '+kind,()=>{
    const s=specimen();if(kind==='five points')s.points.splice(1,1);if(kind==='five radii')s.radii.splice(1,1);if(kind==='zero span')s.points[5].x=s.points[4].x;if(kind==='reversed span')s.points[5].x=s.points[4].x+.1;
    const {before,after}=pair(s);exactGeometry(after,before);before.dispose();after.dispose();
  });
  it('does not mutate points, radius pairs or the caller shape',()=>{
    const s=specimen(),original=JSON.stringify(s),{before,after}=pair(s);expect(JSON.stringify(s)).toBe(original);before.dispose();after.dispose();
  });
  it('is translation invariant without moving the neck or orbit',()=>{
    const offset=new T.Vector3(7,-4,2),base=pair(specimen()),shifted=pair(specimen(1,offset));
    for(let i=0;i<base.after.attributes.position.count;i++)expect(vector(shifted.after.attributes.position,i).sub(offset).distanceTo(vector(base.after.attributes.position,i))).toBeLessThan(8e-7);
    for(let ring=0;ring<=48;ring++)for(let side=0;side<=40;side++){const i=ring*41+side;expect(vector(base.after.attributes.position,i).toArray()).toEqual(vector(base.before.attributes.position,i).toArray());}
    base.before.dispose();base.after.dispose();shifted.before.dispose();shifted.after.dispose();
  });
  it('scales the closure homogeneously above the unchanged minimum-radius floor',()=>{
    const base=pair(specimen()),large=pair(specimen(9));for(let i=0;i<base.after.attributes.position.count;i++)expect(vector(large.after.attributes.position,i).multiplyScalar(1/9).distanceTo(vector(base.after.attributes.position,i))).toBeLessThan(2e-7);
    base.before.dispose();base.after.dispose();large.before.dispose();large.after.dispose();
  });
});

describe('Cranial detail attachment and opt-in integration',()=>{
  it('retains seeded nape-coat roots, normals, pigment coordinates and strand geometry exactly',()=>{
    const s=specimen(),{before,after}=pair(s),options={count:100,length:.06,pennaceous:false,seed:917,maxU:.52,taper:{u:[.28,.52]}};
    const oldCoat=art.dinoCoatGeometry(T,before,options),newCoat=art.dinoCoatGeometry(T,after,options);expect(oldCoat).not.toBeNull();expect(newCoat).not.toBeNull();exactGeometry(newCoat,oldCoat);
    oldCoat.dispose();newCoat.dispose();before.dispose();after.dispose();
  });
  for(const side of [-1,1])it('preserves eye and nasal surface projections ahead of the compression boundary, side '+side,()=>{
    const s=specimen(),{before,after}=pair(s),mat=new T.MeshBasicMaterial(),oldMesh=new T.Mesh(before,mat),newMesh=new T.Mesh(after,mat);
    for(const [x,y] of [[-.216,.1248],[-.944,.012]]){
      const origin=new T.Vector3(x,y,side),direction=new T.Vector3(0,0,-side),old=art.dinoSurfaceAnchor(T,oldMesh,origin,direction,2),now=art.dinoSurfaceAnchor(T,newMesh,origin,direction,2);
      expect(old).not.toBeNull();expect(now).not.toBeNull();expect(now.point.toArray()).toEqual(old.point.toArray());expect(now.normal.toArray()).toEqual(old.normal.toArray());expect(now.normal.z*side).toBeGreaterThan(0);
    }
    before.dispose();after.dispose();mat.dispose();
  });
  it('sculpts cap centers only on explicit generic opt-in',()=>{
    const s=specimen(),sculpt=v=>{v.x*=.7;v.y+=.03;},options={rings:8,sides:12,sculpt};
    const old=baselineSurfaceGeometry(T,s.points,s.radii,options),off=art.dinoSurfaceGeometry(T,s.points,s.radii,options),on=art.dinoSurfaceGeometry(T,s.points,s.radii,{...options,sculptCaps:true});exactGeometry(off,old);
    for(let i=0;i<off.attributes.position.count-2;i++)expect(vector(on.attributes.position,i).toArray()).toEqual(vector(off.attributes.position,i).toArray());
    for(let i=off.attributes.position.count-2;i<off.attributes.position.count;i++){const expected=vector(off.attributes.position,i);sculpt(expected);expect(vector(on.attributes.position,i).distanceTo(expected)).toBeLessThan(1e-7);}
    exactAttribute(on.index,off.index);exactAttribute(on.attributes.uv,off.attributes.uv);old.dispose();off.dispose();on.dispose();
  });
  it('routes only the existing slender-theropod profile through the production shape gate',()=>{
    const begin=source.indexOf('var cranialShape = {'),end=source.indexOf('var headShell =',begin),block=source.slice(begin,end);
    expect(begin).toBeGreaterThan(0);expect(end).toBeGreaterThan(begin);expect(block).toMatch(/compactRostrum\s*:\s*cranialSurface\.id\s*===\s*'slender-theropod'/);
    expect(source.slice(end,source.indexOf('if (headShell)',end))).toContain('dinoTheropodCranialRadii(surfaceHeadHeight, surfaceHeadDepth, neckJunction.radius, cranialSurface)');
    expect(art.cranialSurfaceProfileFor(art.DINOS.find(d=>d.id==='sinosauropteryx')).id).toBe('slender-theropod');
  });
  it('covers every affected catalog species while retaining the complete profile and radius inputs',()=>{
    const affected=art.DINOS.filter(d=>art.cranialSurfaceProfileFor(d).id==='slender-theropod');
    expect(affected.map(d=>d.id).sort()).toEqual(['compsognathus','eodromaeus','liliensternus','sarcosaurus','scipionyx','sinosauropteryx','tawa'].sort());
    const coelophysis=art.DINOS.find(d=>d.id==='coelophysis');
    expect(art.cranialSurfaceProfileFor(coelophysis).id).toBe(art.dinoTheropodCraniumProfileFor(coelophysis).id);
    // Native Coelophysis frame/proxy absence is covered in dinolab_3d_slender_skull.
    // Later mature-tyrannosaur metadata and the two reviewed Alioramini envelopes
    // have their own form tests. Retain the frozen source and pin every other
    // species/property here, including all original slender-theropod inputs.
    const reviewedMatureIds=new Set(['tyrannosaurus','tarbosaurus','gorgosaurus','daspletosaurus','nanuqsaurus','lythronax','teratophoneus','albertosaurus','thanatotheristes']);
    for(const dn of art.DINOS){
      const expected=baselineCranialProfile(dn),actual=historicalReviewedCranialProjection(art,dn,art.cranialSurfaceProfileFor(dn),expected);
      if(reviewedMatureIds.has(dn.id)){
        expect(dn.clade).toBe('Tyrannosauridae');expect(actual.matureTyrannosaur).toBe(true);
        for(const key of ['note','matureTyrannosaur']){
          if(Object.prototype.hasOwnProperty.call(expected,key))actual[key]=expected[key];else delete actual[key];
        }
      }
      if(['alioramus','qianzhousaurus'].includes(dn.id)){
        expect(actual.id).toBe('alioramin-long-low');
        // Only the reviewed labels and eighteen shape inputs are restored for
        // this historical comparison; dino_3d_alioramin_form pins the new vector.
        for(const key of ('id shortLabel label note headLengthScale headHeightScale headDepthScale muzzleLengthScale muzzleBaseScale muzzleTipScale muzzleHeightScale muzzleDepthScale jawHeightScale jawDepthScale cheekScale browScale eyeScale eyeForwardScale eyeHeightScale nostrilPosition nostrilHeightScale nostrilScale').split(' '))actual[key]=expected[key];
      }
      expect(actual,dn.id).toEqual(expected);
    }
    for(const dn of affected){const s=specimen(1,new T.Vector3(),dn.id),{before,after}=pair(s);expect(s.radii,dn.id).toEqual(baselineCranialRadii(.4,.26,.12,baselineCranialProfile(dn)));expect(after.attributes.position.count,dn.id).toBe(before.attributes.position.count);exactAttribute(after.index,before.index);exactAttribute(after.attributes.uv,before.attributes.uv);let changes=0;
      for(let i=0;i<after.attributes.position.count;i++){const a=vector(after.attributes.position,i),b=vector(before.attributes.position,i);expect(a.y,dn.id).toBe(b.y);expect(a.z,dn.id).toBe(b.z);expect(a.x,dn.id).toBeGreaterThanOrEqual(b.x);if(a.x>b.x)changes++;}
      expect(changes,dn.id).toBeGreaterThan(100);before.dispose();after.dispose();}
  });
});
