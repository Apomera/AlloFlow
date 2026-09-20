import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const {dinoJawProfile,dinoSurfaceGeometry,dinoCranialGeometry}=internals();

describe('Rounded mandibular closures',()=>{
 for(const scale of [.03,1,12])for(const breadth of [.84,1.12])it('encloses both jaw caps at scale '+scale+' and breadth '+breadth,()=>{
  const head=new T.Vector3(),snout=new T.Vector3(-2*scale,-.04*scale,0),height=.65*scale,depth=.45*scale;
  const points=[new T.Vector3(.6*scale,0,0),head,head.clone().lerp(snout,.58),snout,snout.clone().add(new T.Vector3(-.28*scale,0,0))];
  const radii=[[.4,.4],[.86,1],[.70,.72],[.48,.60],[.025,.04]].map(([h,d])=>[h*height,d*depth]);
  const skull=new T.Mesh(dinoCranialGeometry(T,points,radii,{center:head.clone().lerp(snout,.28),length:scale,height,depth,cheek:1}),new T.MeshBasicMaterial());
  const start=head.clone().lerp(snout,.12).add(new T.Vector3(0,-height*.44,0)),end=head.clone().lerp(snout,.98).add(new T.Vector3(0,-height*.37,0));
  const profile=dinoJawProfile(T,start,end,height,depth*breadth,scale),g=dinoSurfaceGeometry(T,profile.points,profile.radii,{smoothProfile:true});
  for(const [ring,center] of [[0,profile.points[0]],[48,profile.points.at(-1)]])for(let j=0;j<24;j++){
   const p=new T.Vector3().fromBufferAttribute(g.attributes.position,ring*25+j),delta=p.clone().sub(center),direction=delta.clone().normalize();
   const hit=new T.Raycaster(center.clone().addScaledVector(direction,6*scale),direction.negate(),0,12*scale).intersectObject(skull,false)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(center)).toBeGreaterThan(delta.length()*1.2);
  }
  expect(g.attributes.position.count).toBe(49*25+2);expect(g.index.count).toBe(48*24*6+24*6);
  for(let i=0;i<g.attributes.position.count;i++){
   const p=new T.Vector3().fromBufferAttribute(g.attributes.position,i),n=new T.Vector3().fromBufferAttribute(g.attributes.normal,i);
   expect(Number.isFinite(p.length())).toBe(true);expect(n.length()).toBeCloseTo(1,5);expect(g.boundingBox.containsPoint(p)).toBe(true);
  }
  g.dispose();skull.geometry.dispose();skull.material.dispose();
 });
 it('retains all three original jaw stations without mutating caller points',()=>{
  const start=new T.Vector3(-.2,-.3,0),end=new T.Vector3(-1.8,-.24,0),before=[start.toArray(),end.toArray()],height=.6,depth=.4;
  const p=dinoJawProfile(T,start,end,height,depth,1);
  expect(p.points.slice(1,4).map(v=>v.toArray())).toEqual([start.toArray(),start.clone().lerp(end,.5).toArray(),end.toArray()]);
  expect(p.radii.slice(1,4)).toEqual([[height*.30,depth*.72],[height*.24,depth*.58],[height*.12,depth*.40]]);
  expect([start.toArray(),end.toArray()]).toEqual(before);expect(p.points[1]).not.toBe(start);expect(p.points[3]).not.toBe(end);
 });
});
