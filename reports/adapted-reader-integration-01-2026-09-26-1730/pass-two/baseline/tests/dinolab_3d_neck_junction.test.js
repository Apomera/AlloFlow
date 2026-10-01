import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const {dinoNeckJunction,dinoSurfaceGeometry,dinoCranialGeometry,dinoLoftRadius}=internals();

describe('Internal cranial closure',()=>{
 for(const scale of [.03,1,12])for(const steep of [false,true])it('seats the closure inside a '+(steep?'steep':'shallow')+' neck at scale '+scale,()=>{
  const points=(steep?[[1,0,0],[.8,.8,0],[.4,1.6,0],[0,2.4,0]]:[[2,0,0],[1.4,.3,0],[.7,.4,0],[0,.5,0]]).map(p=>new T.Vector3(...p).multiplyScalar(scale));
  const radii=[.4,.32,.22,.2].map(r=>r*scale),before=points.map(p=>p.toArray()),root=dinoNeckJunction(T,points,radii,.6*scale),curve=new T.CatmullRomCurve3(points,false,'centripetal');
  expect(root.point.distanceTo(curve.getPoint(root.t))).toBeLessThan(scale*1e-10);expect(root.t).toBeGreaterThan(.5);expect(root.t).toBeLessThan(1);expect(root.distance).toBeLessThanOrEqual(curve.getLength()*.35);expect(points.map(p=>p.toArray())).toEqual(before);
  const neck=new T.Mesh(dinoSurfaceGeometry(T,points,radii,{smoothProfile:true}),new T.MeshBasicMaterial());
  const head=points.at(-1),headPoints=[root.point,head.clone().add(new T.Vector3(.3*scale,0,0)),head,head.clone().add(new T.Vector3(-.7*scale,0,0)),head.clone().add(new T.Vector3(-scale,0,0))];
  const g=dinoCranialGeometry(T,headPoints,[[root.radius,root.radius],[.15*scale,.15*scale],[.5*scale,.35*scale],[.3*scale,.2*scale],[.01*scale,.01*scale]],{center:head,length:scale,height:.5*scale,depth:.35*scale,cheek:0});
  for(let i=0;i<40;i++){
   const point=new T.Vector3().fromBufferAttribute(g.attributes.position,i),delta=point.clone().sub(root.point),hit=new T.Raycaster(root.point.clone().addScaledVector(delta,8),delta.clone().normalize().negate()).intersectObject(neck,false)[0];
   expect(hit).toBeDefined();expect(hit.point.distanceTo(root.point)).toBeGreaterThan(delta.length()*1.2);
  }
  for(const v of g.attributes.position.array)expect(Number.isFinite(v)).toBe(true);
  for(let i=0;i<g.attributes.normal.count;i++)expect(new T.Vector3().fromBufferAttribute(g.attributes.normal,i).length()).toBeCloseTo(1,5);
  g.dispose();neck.geometry.dispose();neck.material.dispose();
 });
 it('leaves all face curve and radius samples ahead of the cranial center unchanged',()=>{
  const oldPoints=[[.6,0,0],[0,0,0],[-.8,0,0],[-1.4,0,0],[-1.6,0,0]].map(p=>new T.Vector3(...p)),oldRadii=[[.2,.2],[.6,.4],[.4,.3],[.25,.2],[.01,.01]];
  const newPoints=[new T.Vector3(1,-.2,0),...oldPoints],newRadii=[[.12,.12],...oldRadii],a=new T.CatmullRomCurve3(oldPoints,false,'centripetal'),b=new T.CatmullRomCurve3(newPoints,false,'centripetal');
  for(let station=1;station<=4;station+=.025){expect(a.getPoint(station/4).distanceTo(b.getPoint((station+1)/5))).toBeLessThan(1e-10);for(const axis of [0,1])expect(dinoLoftRadius(oldRadii,station,axis)).toBeCloseTo(dinoLoftRadius(newRadii,station+1,axis),10);}
 });
 it('preserves the non-theropod face when the rear station follows the neck',()=>{
  const oldPoints=[[.82,0,0],[.32,0,0],[0,0,0],[-.8,0,0],[-1.4,0,0],[-1.6,0,0]].map(p=>new T.Vector3(...p));
  const root=new T.Vector3(.65,-.5,0),newPoints=[root,root.clone().lerp(oldPoints[1],.5),...oldPoints.slice(1)];
  const a=new T.CatmullRomCurve3(oldPoints,false,'centripetal'),b=new T.CatmullRomCurve3(newPoints,false,'centripetal');
  for(let station=2;station<=5;station+=.025)expect(a.getPoint(station/5).distanceTo(b.getPoint((station+1)/6))).toBeLessThan(1e-10);
 });
 it('limits a long requested overlap on short necks',()=>{
  const points=[new T.Vector3(),new T.Vector3(1,0,0)],root=dinoNeckJunction(T,points,[.2,.1],100);
  expect(root.distance).toBeCloseTo(.35);expect(root.point.x).toBeCloseTo(.65);expect(root.radius).toBeLessThan(.1);
 });
});
