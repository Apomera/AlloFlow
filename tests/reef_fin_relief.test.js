import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
new Function('window', readFileSync('stem_lab/reef_3d_species.js', 'utf8'))(scope);
const Species = scope.Reef3DSpecies;
function compile(material) {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader); return shader;
}

describe('fish fin support relief', () => {
  it('limits the shallow normal finish to bony-fish membranes, leaving body and eye shading independent', () => {
    for (const id of ['clownfish', 'blue_tang', 'emperor_angelfish']) {
      const h = Species.create(THREE, id, { quality: 'high', seed: 7 });
      try {
        const body = h.root.getObjectByName(id + '-body'), fins = h.root.getObjectByName(id + '-fins');
        const bodyShader = compile(body.material), finShader = compile(fins.material);
        expect(bodyShader.uniforms.reefFeature.value.z, 'body does not inherit fin relief').toBe(0);
        expect(finShader.uniforms.reefFeature.value.z).toBeGreaterThan(0);
        expect(finShader.uniforms.reefFeature.value.z, 'restrained membrane slope').toBeLessThan(.4);
        const eyes = fins.geometry.userData.batch.find((part) => part.part === 'detail');
        expect(eyes.slot).toBeGreaterThan(0);
        expect(finShader.uniforms.reefRig.value[(eyes.slot - 1) * 20 + 18], 'eyes opt out of fin features').toBe(0);
        expect(finShader.uniforms.reefRig.value[(eyes.slot - 1) * 20 + 19], 'corneal detail retained').toBe(1);
        expect(fins.material.normalMap, 'no additional texture').toBeNull();
        expect(fins.material.transparent, 'no extra transparency pass').toBe(false);
      } finally { h.dispose(); }
    }
  });

  it('keeps smooth-skinned shark fins outside the bony-ray relief treatment', () => {
    const shark = Species.create(THREE, 'whitetip_reef_shark', { quality: 'low' });
    try { shark.root.traverse((mesh) => { if (mesh.isMesh) expect(compile(mesh.material).uniforms.reefFeature.value.z).toBe(0); }); }
    finally { shark.dispose(); }
  });

  it('fully removes derivative shading on the fallback path and shares one patch per capability', () => {
    const models = [true, false].map((derivatives) => Species.create(THREE, 'clownfish', { quality: 'low', derivatives }));
    try {
      for (const [i, h] of models.entries()) {
        const shaders = [], keys = new Set();
        h.root.traverse((mesh) => { if (mesh.isMesh) { shaders.push(compile(mesh.material)); keys.add(mesh.material.customProgramCacheKey()); } });
        expect(keys.size).toBe(1);
        if (i === 0) {
          expect(shaders.some((s) => /reefBasis>1e-20/.test(s.fragmentShader)), 'collapsed UV basis guarded').toBe(true);
          expect(shaders.some((s) => s.fragmentShader.includes('faceDirection*inversesqrt')), 'back-face normal orientation retained').toBe(true);
        } else for (const shader of shaders) {
          expect(shader.uniforms.reefFeature.value.z).toBe(0);
          expect(shader.fragmentShader).not.toMatch(/\b(?:fwidth|dFdx|dFdy)\s*\(/);
          expect(shader.fragmentShader).not.toContain('reefFinRidgeSlope');
        }
      }
    } finally { models.forEach((h) => h.dispose()); }
  });
});
