import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const {dinoCoatGeometry,byId,skeletalAnatomyProfileFor,reconstructionHypothesesFor,coveringEvidenceFor,dinoSkinCoordinates}=internals();
describe('Surface-rooted contour coats',()=>{
 for(const scale of [.03,1,15]) for(const pennaceous of [true,false]) it('has finite rooted geometry at '+scale+' pennaceous '+pennaceous,()=>{
  const skin=new T.SphereGeometry(scale,24,16),before=Array.from(skin.attributes.position.array);
  const options={count:240,length:scale*.2,seed:42,pennaceous};
  const g=dinoCoatGeometry(T,skin,options),repeat=dinoCoatGeometry(T,skin,options);
  expect(Array.from(g.attributes.position.array)).toEqual(Array.from(repeat.attributes.position.array));
  expect(Array.from(skin.attributes.position.array)).toEqual(before);
  expect(g.parameters.roots).toBe(240);
  const roots=g.attributes.dinoCoatRoot,normals=g.attributes.normal,positions=g.attributes.position;
  let bad=0,maxDistance=0,minRadius=Infinity;
  for(let i=0;i<roots.count;i++){
   const root=new T.Vector3().fromBufferAttribute(roots,i),point=new T.Vector3().fromBufferAttribute(positions,i),normal=new T.Vector3().fromBufferAttribute(normals,i);
   if(!Number.isFinite(point.x+point.y+point.z)||Math.abs(normal.length()-1)>1e-5)bad++;
   maxDistance=Math.max(maxDistance,point.distanceTo(root));minRadius=Math.min(minRadius,root.length());
  }
  // Face winding must agree with the shading normal on both coat styles.
  const ix=g.index;let reversed=0;
  for(let j=0;j<ix.count;j+=3){const a=new T.Vector3().fromBufferAttribute(positions,ix.getX(j)),b=new T.Vector3().fromBufferAttribute(positions,ix.getX(j+1)),c=new T.Vector3().fromBufferAttribute(positions,ix.getX(j+2));const face=b.sub(a).cross(c.sub(a));if(face.lengthSq()>1e-20&&face.dot(new T.Vector3().fromBufferAttribute(normals,ix.getX(j)))<0)reversed++;}
  expect(reversed).toBe(0);
  expect(bad).toBe(0);expect(maxDistance).toBeLessThan(scale*.31);expect(minRadius).toBeGreaterThan(scale*.97);
  dinoSkinCoordinates(T,g,new T.Matrix4(),true);
  expect(g.attributes.dinoSkinPosition.array).toEqual(roots.array);
  expect(g.attributes.dinoSkinNormal.count).toBe(positions.count);
  expect(g.boundingBox.isEmpty()).toBe(false);g.dispose();repeat.dispose();skin.dispose();
 });
 it('restricts scale-mosaic plumage to the dorsal region',()=>{
  const skin=new T.SphereGeometry(1,24,16),g=dinoCoatGeometry(T,skin,{count:150,length:.15,seed:7,dorsalOnly:true});
  const n=g.attributes.dinoCoatNormal;let min=1;for(let i=0;i<n.count;i++)min=Math.min(min,n.getY(i));
  expect(min).toBeGreaterThan(.38);g.dispose();skin.dispose();
 });
 it('keeps nape roots behind the specified face boundary',()=>{
  const skin=new T.SphereGeometry(1,24,16),g=dinoCoatGeometry(T,skin,{count:70,length:.08,seed:7,minX:.2});
  const root=g.attributes.dinoCoatRoot;let min=1;for(let i=0;i<root.count;i++)min=Math.min(min,root.getX(i));
  expect(min).toBeGreaterThanOrEqual(.2);g.dispose();skin.dispose();
 });
});
describe('Reconstruction evidence boundaries',()=>{
 it('retains Velociraptor forearm feathers under conservative reconstruction',()=>{
  const dn=byId('velociraptor'),s=skeletalAnatomyProfileFor(dn),h=reconstructionHypothesesFor(dn,s,'conservative');
  expect(h.directFeatherEvidence).toBe(true);expect(h.active.wingFeathers).toBe(true);expect(h.active.filamentCoverage).toBe(0);expect(h.active.tailFrond).toBe(false);
  expect(coveringEvidenceFor(dn,s).supported).toMatch(/Quill knobs/);
 });
 for(const mode of ['evidence','conservative','avian'])it('does not turn Psittacosaurus tail bristles into a body coat in '+mode,()=>{
  const dn=byId('psittacosaurus'),h=reconstructionHypothesesFor(dn,skeletalAnatomyProfileFor(dn),mode).active;
  expect(h.filamentCoverage).toBe(0);expect(h.dorsalBristles).toBe(true);expect(h.featureScales).toBe(true);
 });
 it('keeps adult Tyrannosaurus scale-dominated and marks extra covering speculative',()=>{
  const dn=byId('tyrannosaurus'),s=skeletalAnatomyProfileFor(dn);
  expect(reconstructionHypothesesFor(dn,s,'evidence').active.filamentCoverage).toBe(0);
  const alternative=reconstructionHypothesesFor(dn,s,'avian').active;
  expect(alternative.featureScales).toBe(true);expect(alternative.filamentCoverage).toBeLessThan(.2);
  expect(alternative.status).toMatch(/Speculative/);
 });
 for(const id of ['microraptor','anchiornis','yutyrannus','sinosauropteryx'])it(id+' keeps known feathers distinct from historical models',()=>{
  const dn=byId(id),s=skeletalAnatomyProfileFor(dn),set=reconstructionHypothesesFor(dn,s,'classic');
  expect(set.active.status).toBe('Contradicted historical model');
  expect(set.options.find(o=>o.id==='conservative').filamentCoverage).toBeGreaterThan(0);
  expect(coveringEvidenceFor(dn,s).source.url).toMatch(/^https:\/\/doi.org\//);
 });
});
