import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const {dinoShadowOrbitBounds,dinoFitShadow}=internals();
function corners(box){const result=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])result.push(new T.Vector3(x,y,z));return result;}
function light(direction=[-8,12,10],resolution=1024){const sun=new T.DirectionalLight();sun.position.set(...direction);sun.shadow.mapSize.set(resolution,resolution);return sun;}
function bounds(scale){return new T.Box3(new T.Vector3(-3,.02,-.5).multiplyScalar(scale),new T.Vector3(4,2,.8).multiplyScalar(scale));}
function inside(point,camera){const p=point.clone().project(camera);for(const value of [p.x,p.y,p.z]){expect(Number.isFinite(value)).toBe(true);expect(Math.abs(value)).toBeLessThan(1);}}
describe('Dino Lab stable shadow coverage',()=>{
  for(const scale of [.03,1,15]){
    it('covers the full orbit and small idle movement at scale '+scale,()=>{
      const box=bounds(scale),orbit=dinoShadowOrbitBounds(T,box);
      for(let angle=0;angle<Math.PI*2;angle+=Math.PI/12)for(const point of corners(box)){
        point.applyAxisAngle(new T.Vector3(0,1,0),angle);point.y+=scale*.025;
        expect(orbit.containsPoint(point)).toBe(true);
      }
    });
    for(const direction of [[-8,12,10],[8,2,-10]]){
      it('contains every caster and ground projection at scale '+scale+' under light '+direction,()=>{
        const sun=light(direction),box=dinoShadowOrbitBounds(T,bounds(scale)),dir=new T.Vector3(...direction).normalize();
        const info=dinoFitShadow(T,sun,box,0,scale*2);
        expect(info.texelSize).toBeGreaterThan(0);expect(sun.shadow.camera.near).toBeGreaterThan(0);
        for(const point of corners(box)){
          inside(point,sun.shadow.camera);
          inside(point.clone().addScaledVector(dir,-point.y/dir.y),sun.shadow.camera);
        }
        expect(sun.position.clone().sub(sun.target.position).normalize().distanceTo(dir)).toBeLessThan(1e-12);
      });
    }
  }
  it('scales texel size and normal bias with the specimen, without giant minimum spans',()=>{
    const small=light(),large=light();
    const a=dinoFitShadow(T,small,bounds(.1),0,.2),b=dinoFitShadow(T,large,bounds(10),0,20);
    expect(b.texelSize/a.texelSize).toBeCloseTo(100);
    expect(large.shadow.normalBias/small.shadow.normalBias).toBeCloseTo(100);
    expect(large.shadow.bias).toBeCloseTo(small.shadow.bias,10);
  });
  it('uses added resolution to reduce the world-space bias',()=>{
    const a=light(),b=light(undefined,2048),box=bounds(1);
    const low=dinoFitShadow(T,a,box,0,100),high=dinoFitShadow(T,b,box,0,100);
    expect(high.texelSize).toBeCloseTo(low.texelSize/2,10);
    expect(b.shadow.normalBias).toBeCloseTo(a.shadow.normalBias/2,10);
  });
  it('keeps the fitted camera stable when recalculated without a scene change',()=>{
    const sun=light(),box=bounds(1);
    dinoFitShadow(T,sun,box,0,2);const a=sun.shadow.matrix.toArray();
    dinoFitShadow(T,sun,box,0,2);const b=sun.shadow.matrix.toArray();
    b.forEach((value,i)=>expect(value).toBeCloseTo(a[i],10));
  });
  it('includes a distant habitat caster and a lower terrain receiver',()=>{
    const box=dinoShadowOrbitBounds(T,bounds(.1));box.expandByPoint(new T.Vector3(12,3,-8));
    const sun=light(),info=dinoFitShadow(T,sun,box,-.25,.2),dir=sun.position.clone().sub(sun.target.position).normalize();
    for(const p of corners(box)){inside(p,sun.shadow.camera);inside(p.clone().addScaledVector(dir,-(p.y-info.floorY)/dir.y),sun.shadow.camera);}
  });
  it('leaves the light untouched when no bounds are available',()=>{
    const sun=light(),before=sun.position.toArray();
    expect(dinoFitShadow(T,sun,new T.Box3(),0,1)).toBeNull();
    expect(dinoShadowOrbitBounds(T,new T.Box3()).isEmpty()).toBe(true);
    expect(sun.position.toArray()).toEqual(before);
  });
});
