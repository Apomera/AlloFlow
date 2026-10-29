import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { internals } from './helpers/dino_lab_harness.js';
const T = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const { dinoStudioLightProfile, dinoShadowOrbitBounds, dinoFitShadow } = internals();
const legacyProfiles = {
  balanced: { id: 'balanced', label: 'Balanced', sceneLabel: 'Neutral studio', description: 'Even studio lighting gives an overall view of the reconstruction.', ambient: 0.30, hemisphere: 0.65, key: 1.25, keyPosition: [-8, 12, 10], fill: 0.50, fillPosition: [10, 6, 8], rim: 0.95, rimPosition: [2, 8, -12] },
  detail: { id: 'detail', label: 'Surface detail', sceneLabel: 'Surface detail', description: 'Lower side lighting reveals surface relief and overlapping forms.', ambient: 0.16, hemisphere: 0.42, key: 1.45, keyPosition: [-10, 4, 12], fill: 0.22, fillPosition: [10, 7, 8], rim: 0.55, rimPosition: [2, 8, -12] },
  rim: { id: 'rim', label: 'Rim light', sceneLabel: 'Rim light', description: 'Stronger rear lighting separates the silhouette, crests and feathers.', ambient: 0.18, hemisphere: 0.48, key: 0.78, keyPosition: [-8, 12, 10], fill: 0.28, fillPosition: [10, 6, 8], rim: 1.85, rimPosition: [2, 8, -12] }
};

describe('Dino Lab studio-light profiles', () => {
  for (const mode of Object.keys(legacyProfiles)) {
    it(mode + ' preserves its original profile outside the bone-only view', () => {
      expect(dinoStudioLightProfile(mode)).toEqual(legacyProfiles[mode]);
      for (const boneOnly of [false, undefined, null, 0, 1, 'true']) {
        expect(dinoStudioLightProfile(mode, boneOnly)).toEqual(legacyProfiles[mode]);
      }
    });

    it(mode + ' increases directional contrast for bone without changing the lighting direction', () => {
      const normal = legacyProfiles[mode], bone = dinoStudioLightProfile(mode, true);
      for (const field of ['id', 'label', 'sceneLabel', 'description', 'keyPosition', 'fillPosition', 'rimPosition']) {
        expect(bone[field]).toEqual(normal[field]);
      }
      for (const light of ['ambient', 'hemisphere', 'fill', 'key', 'rim']) {
        expect(Number.isFinite(bone[light])).toBe(true);
        expect(bone[light]).toBeGreaterThan(0);
        expect(bone[light]).toBeLessThanOrEqual(normal[light]);
      }
      for (const broadLight of ['ambient', 'hemisphere', 'fill']) {
        expect(bone[broadLight]).toBeLessThan(normal[broadLight]);
        // Lower every broad source relative to the key, rather than merely
        // dimming the whole rig by the same amount.
        expect(bone[broadLight] / bone.key).toBeLessThan(normal[broadLight] / normal.key);
      }
    });

    it(mode + ' restores the same profile after switching views and presets repeatedly', () => {
      const bone = dinoStudioLightProfile(mode, true);
      for (let round = 0; round < 3; round++) {
        for (const otherMode of Object.keys(legacyProfiles)) {
          dinoStudioLightProfile(otherMode, true);
          dinoStudioLightProfile(otherMode, false);
        }
        expect(dinoStudioLightProfile(mode, true)).toEqual(bone);
        expect(dinoStudioLightProfile(mode)).toEqual(legacyProfiles[mode]);
        expect(dinoStudioLightProfile(mode, false)).toEqual(legacyProfiles[mode]);
      }
    });
  }

  it('falls back safely for unavailable or inherited preset names in either view', () => {
    for (const boneOnly of [false, true]) {
      const fallback = dinoStudioLightProfile('balanced', boneOnly);
      for (const mode of [undefined, '', 'unknown', 'toString', '__proto__']) {
        expect(dinoStudioLightProfile(mode, boneOnly)).toEqual(fallback);
      }
    }
  });
});

describe('Dino Lab studio-light shadow coverage', () => {
  for(const boneOnly of [false,true]) for(const mode of ['balanced','detail','rim']) for(const scale of [.03,1,15]) {
    it(mode+' '+(boneOnly?'bone-only':'normal')+' covers the specimen and its floor projection at scale '+scale, () => {
      const profile=dinoStudioLightProfile(mode,boneOnly),sun=new T.DirectionalLight();sun.shadow.mapSize.set(1024,1024);
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
});
