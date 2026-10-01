import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const { dinoStudioLightProfile, dinoShadowOrbitBounds, dinoFitShadow } = internals();
describe('Dino Lab studio-light shadow coverage', () => {
  for(const mode of ['balanced','detail','rim']) for(const scale of [.03,1,15]) {
    it(mode+' covers the specimen and its floor projection at scale '+scale, () => {
      const profile=dinoStudioLightProfile(mode),sun=new T.DirectionalLight();sun.shadow.mapSize.set(1024,1024);
      sun.position.fromArray(profile.keyPosition);
      const direction=sun.position.clone().normalize(),box=dinoShadowOrbitBounds(T,new T.Box3(new T.Vector3(-3,.02,-.5).multiplyScalar(scale),new T.Vector3(4,2,.8).multiplyScalar(scale)));
      const fitted=dinoFitShadow(T,sun,box,0,scale*2);expect(fitted.texelSize).toBeGreaterThan(0);
      for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) {
        const point=new T.Vector3(x,y,z),ground=point.clone().addScaledVector(direction,-y/direction.y);
        for(const p of [point,ground]) {p.project(sun.shadow.camera);expect(Number.isFinite(p.length())).toBe(true);expect(Math.max(Math.abs(p.x),Math.abs(p.y),Math.abs(p.z))).toBeLessThan(1);}
      }
      // Re-selecting after another preset must restore the same fitted matrix.
      const original=sun.shadow.matrix.toArray();sun.position.set(9,3,-12);sun.target.position.set(0,0,0);dinoFitShadow(T,sun,box,0,scale*2);
      sun.position.fromArray(profile.keyPosition);sun.target.position.set(0,0,0);dinoFitShadow(T,sun,box,0,scale*2);
      sun.shadow.matrix.toArray().forEach((value,i)=>expect(value).toBeCloseTo(original[i],10));
    });
  }
  it('falls back safely for unavailable or inherited preset names', () => {
    for(const mode of [undefined,'','unknown','toString','__proto__']) expect(dinoStudioLightProfile(mode)).toEqual(dinoStudioLightProfile('balanced'));
  });
});
