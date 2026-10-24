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

describe('fish iris shading', () => {
  it('retains the species iris pigment in both batched fish and low-poly instanced schools', () => {
    for (const [id, hex] of [['clownfish', 0xe48a2a], ['blue_tang', 0x1a2440], ['blue_green_chromis', 0x40a0a0], ['porcupinefish', 0xc8c070]]) {
      for (const school of [false, true]) {
        const h = school ? Species.createSchool(THREE, id, 3, { seed: 7, quality: 'low' }) : Species.create(THREE, id, { seed: 7, quality: 'high' });
        try {
          const fins = h.root.getObjectByName(id + '-fins');
          const shader = compile(fins.material), iris = shader.uniforms.reefIrisColor.value;
          const expected = new THREE.Color(hex).convertSRGBToLinear();
          expect(iris.toArray(), id + (school ? ' school' : ' specimen')).toEqual(expected.toArray());
          const detail = fins.geometry.userData.batch.find((part) => part.part === 'detail');
          expect(shader.uniforms.reefRig.value[(detail.slot - 1) * 20 + 19], 'eye-enabled batch part').toBe(1);
          const uv = fins.geometry.attributes.uv;
          let eyes = 0, other = 0;
          for (let i = detail.first; i < detail.first + detail.count; i++) { if (uv.getX(i) > 1.8) eyes++; else other++; }
          expect(eyes, 'encoded eyes remain inside existing detail geometry').toBeGreaterThan(0);
          expect(shader.fragmentShader, 'unrelated detail vertices retain their pigment').toContain('mix(diffuseColor.rgb,reefEyePigment*diffuse,reefEyeMask)');
          expect(fins.material.transparent).toBe(false);
          expect(fins.material.normalMap).toBeNull();
        } finally { h.dispose(); }
      }
    }
  });

  it('keeps filtering only on the derivative path and preserves the corneal light response', () => {
    for (const derivatives of [true, false]) {
      const h = Species.createSchool(THREE, 'blue_green_chromis', 3, { quality: 'low', derivatives });
      try {
        const shader = compile(h.root.getObjectByName('blue_green_chromis-fins').material);
        expect(shader.fragmentShader).toContain('0.14+0.22*smoothstep(0.77,1.05,reefEyeR)');
        expect(shader.fragmentShader).not.toMatch(/totalEmissiveRadiance\s*\+=.*(?:reefIris|reefPupil|reefEye)/);
        if (derivatives) expect(shader.fragmentShader).toContain('reefPupilAA=max(reefPupilAA,reefEyeFootprint*0.55)');
        else expect(shader.fragmentShader).not.toMatch(/\b(?:fwidth|dFdx|dFdy)\s*\(/);
      } finally { h.dispose(); }
    }
  });
});
