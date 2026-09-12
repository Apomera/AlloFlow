import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const { dinoLoftRadius, dinoCranialGeometry, dinoSurfaceGeometry } = internals();

describe('Dino Lab smooth cranial radii', () => {
  for (const profile of [[.4,1,.72,.6,.04], [.24,.82,1,.72,.62,.04], [1,1,1,1], [.1,.3,.5,.7]]) {
    it('interpolates stations without creating extra bulges: ' + profile.join(','), () => {
      for (let i=0;i<profile.length-1;i++) for(let j=0;j<=100;j++) {
        const r=dinoLoftRadius(profile,i+j/100,0);
        expect(r).toBeGreaterThanOrEqual(Math.min(profile[i],profile[i+1])-1e-12);
        expect(r).toBeLessThanOrEqual(Math.max(profile[i],profile[i+1])+1e-12);
      }
      for(let i=1;i<profile.length-1;i++) {
        expect(dinoLoftRadius(profile,i,0)).toBeCloseTo(profile[i],10);
        const e=1e-5,left=(profile[i]-dinoLoftRadius(profile,i-e,0))/e,right=(dinoLoftRadius(profile,i+e,0)-profile[i])/e;
        expect(Math.abs(left-right)).toBeLessThan(.0001);
      }
    });
  }
  it('keeps height and breadth profiles independent', () => {
    const profile=[[.4,.2],[.8,.3],[.6,.4]];
    expect(dinoLoftRadius(profile,.5,0)).toBeGreaterThan(dinoLoftRadius(profile,.5,1));
    expect(dinoLoftRadius(profile,1,0)).toBe(.8);expect(dinoLoftRadius(profile,1,1)).toBe(.3);
  });
});

describe('Dino Lab integrated cranial relief', () => {
  for (const size of [.03,1,12]) {
    it('keeps cheek relief bounded and inside one closed symmetric surface at scale '+size, () => {
      const points=[[1,0,0],[0,0,0],[-1.6,0,0],[-2.6,0,0]].map(p=>new THREE.Vector3(...p).multiplyScalar(size));
      const radii=[[.3,.25],[.7,.5],[.5,.36],[.02,.02]].map(r=>r.map(v=>v*size));
      const shape={center:new THREE.Vector3(-.45,-.168,0).multiplyScalar(size),length:size,height:.7*size,depth:.5*size,cheek:1.2};
      const base=dinoSurfaceGeometry(THREE,points,radii,{rings:72,sides:40,smoothProfile:true});
      const g=dinoCranialGeometry(THREE,points,radii,shape),p=g.attributes.position,b=base.attributes.position,n=g.attributes.normal;
      expect(Array.from(g.index.array)).toEqual(Array.from(base.index.array));
      expect(p.count).toBe(73*41+2);let moved=0;
      for(let i=0;i<p.count;i++) {
        const v=new THREE.Vector3().fromBufferAttribute(p,i),normal=new THREE.Vector3().fromBufferAttribute(n,i);
        expect(Number.isFinite(v.length()+normal.length())).toBe(true);expect(normal.length()).toBeCloseTo(1,5);
        expect(p.getX(i)).toBe(b.getX(i));expect(p.getY(i)).toBe(b.getY(i));
        const displacement=Math.abs(p.getZ(i))-Math.abs(b.getZ(i));
        expect(displacement).toBeGreaterThanOrEqual(-size*1e-6);expect(displacement).toBeLessThanOrEqual(size*.09+size*1e-6);
        if(displacement>size*1e-6)moved++;
        const x=(b.getX(i)-shape.center.x)/(shape.length*.85),y=(b.getY(i)-shape.center.y)/(shape.height*.62);
        if(x*x+y*y>=1)expect(p.getZ(i)).toBe(b.getZ(i));
        expect(g.boundingBox.containsPoint(v)).toBe(true);
      }
      expect(moved).toBeGreaterThan(50);
      for(let ring=0;ring<=72;ring++)for(let side=0;side<=40;side++) {
        const a=ring*41+side,mirror=ring*41+40-side;
        expect(p.getZ(a)).toBeCloseTo(-p.getZ(mirror),5);
        if(side===0)expect(new THREE.Vector3().fromBufferAttribute(n,a).distanceTo(new THREE.Vector3().fromBufferAttribute(n,mirror))).toBeLessThan(1e-6);
      }
      base.dispose();g.dispose();
    });
  }
  it('adds no cheek volume to a zero-relief sauropod profile', () => {
    const points=[new THREE.Vector3(1,0,0),new THREE.Vector3(-2,0,0)],radii=[[.7,.5],[.02,.02]];
    const base=dinoSurfaceGeometry(THREE,points,radii,{rings:72,sides:40,smoothProfile:true});
    const g=dinoCranialGeometry(THREE,points,radii,{center:new THREE.Vector3(),length:1,height:.7,depth:.5,cheek:0});
    expect(Array.from(g.attributes.position.array)).toEqual(Array.from(base.attributes.position.array));
    base.dispose();g.dispose();
  });
});
