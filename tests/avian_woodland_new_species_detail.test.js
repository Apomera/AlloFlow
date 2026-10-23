import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(local);
const cases = [
  ['americanGoldfinch', .020, .0105, .0006, 1.08, .0047, .0045],
  ['easternBluebird', .024, .0145, .0006, .88, .0034, .0032],
  ['whiteThroatedSparrow', .022, .0115, .0007, 1.02, .0047, .0044]
];

describe('new woodland species bill surfaces', () => {
  for (const quality of ['high', 'low']) {
    it.each(cases)('anchors the shared detail program to the actual %s bill and excludes both eyes (' + quality + ')',
      (id, headLength, length, droop, taper, width, height) => {
        const bird = local.AvianWoodlandBirds.create(THREE, id, { quality });
        try {
          const face = bird.head.getObjectByName('woodland-eyes-and-bill');
          const attributes = face.geometry.attributes, material = face.material;
          const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
            fragmentShader: THREE.ShaderLib.standard.fragmentShader };
          material.onBeforeCompile(shader);
          const profile = shader.uniforms.awResidentBillProfile.value;
          const section = shader.uniforms.awResidentBillSection.value;
          expect(profile.toArray()).toEqual([headLength * .76, length, droop, taper]);
          expect(section.toArray()).toEqual([width, height]);
          expect(material.extensions.derivatives).toBe(true);
          expect(material.customProgramCacheKey()).toBe('avian-woodland-resident-bill-v1');
          // These uniforms must refer to the bill in the retained native mesh,
          // including its embedded base, not the eye rings or world coordinates.
          let billCount = 0, eyeCount = 0, minZ = Infinity, maxZ = -Infinity, maxWidth = 0;
          for (let index = 0; index < attributes.position.count; index++) {
            const kind = attributes.featherInfo.getX(index);
            if (kind === 1) {
              billCount++;
              minZ = Math.min(minZ, attributes.position.getZ(index));
              maxZ = Math.max(maxZ, attributes.position.getZ(index));
              maxWidth = Math.max(maxWidth, Math.abs(attributes.position.getX(index)));
              const along = (attributes.position.getZ(index) - profile.x) / profile.y;
              expect(along).toBeGreaterThan(-1e-6); expect(along).toBeLessThan(1 + 1e-6);
            } else {
              expect(kind).toBe(0); eyeCount++;
              expect(Math.abs(attributes.position.getX(index))).toBeGreaterThan(.01);
            }
          }
          expect(billCount).toBe(quality === 'high' ? 120 : 56);
          expect(eyeCount).toBeGreaterThan(billCount);
          expect(minZ).toBeCloseTo(profile.x, 8);
          expect(maxZ).toBeCloseTo(profile.x + profile.y, 8);
          expect(maxWidth).toBeCloseTo(section.x, 8);
          // Preserve the standard lighting hooks, and ensure physical-space
          // attributes are supplied to both stages of the single face material.
          expect(shader.vertexShader).toContain('awResidentFaceLocal = position;');
          expect(shader.vertexShader).toContain('awResidentBillSurface = featherInfo.x;');
          expect(shader.fragmentShader).toContain('uniform vec4 awResidentBillProfile;');
          expect(shader.fragmentShader).toContain('#include <normal_fragment_maps>');
          expect(shader.fragmentShader).toContain('#include <lights_physical_fragment>');
        } finally { bird.dispose(); }
      });
  }

  it.each(['mourningDove', 'grouse', 'blueJay', 'northernCardinal', 'darkEyedJunco',
    'tuftedTitmouse', 'easternTowhee', 'americanRobin', 'blackCappedChickadee'])
  ('leaves %s on its existing face material program', id => {
    const bird = local.AvianWoodlandBirds.create(THREE, id, { quality: 'low' });
    try {
      const material = bird.head.getObjectByName('woodland-eyes-and-bill').material;
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader,
        fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      material.onBeforeCompile(shader);
      expect(shader.uniforms.awResidentBillProfile).toBeUndefined();
      expect(shader.fragmentShader).not.toContain('awResident');
      if (id === 'northernCardinal') expect(material.customProgramCacheKey()).toBe('avian-woodland-cardinal-details-v1');
    } finally { bird.dispose(); }
  });
});
