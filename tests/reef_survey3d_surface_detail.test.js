import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = { console: { warn() {} } };
new Function('window', readFileSync('stem_lab/reef_3d_habitat.js', 'utf8'))(scope);
const habitats = [];
vi.setConfig({ testTimeout: 60000 });
afterEach(() => { habitats.splice(0).forEach((h) => h.dispose()); });

const forms = ['branching', 'massive', 'plate', 'encrusting'];
const categories = ['hard_coral', 'bleached_coral', 'recently_dead_coral'];
function build(options = {}) {
  const points = categories.flatMap((category, c) => forms.map((coralForm, f) => ({
    distanceM: (c * 4 + f) * 0.5, category, coralForm, colony: c * 4 + f
  })));
  points.push({ distanceM: 6, category: 'macroalgae', colony: 12 });
  const h = scope.Reef3DHabitat.create(THREE, {
    layout: { lengthM: 8, depthM: 8, points, background: { coralCover: 0.9, algae: 0.4 } },
    seed: 11, ...options
  });
  habitats.push(h); return h;
}
function compile(mesh) {
  const lib = THREE.ShaderLib.standard;
  const shader = { uniforms: THREE.UniformsUtils.clone(lib.uniforms), vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  mesh.material.onBeforeCompile(shader);
  return shader;
}

describe('survey reef biological surface detail', () => {
  it('preserves coral condition while plates retain growth relief and encrusting colonies have finer cups', () => {
    const h = build();
    for (let c = 0; c < categories.length; c++) {
      const shaders = forms.map((_, f) => compile(h.surveyObjects[c * 4 + f].getObjectByName('reef-coral')));
      expect(shaders[2].uniforms.reefCoralSurface.value.x).toBeGreaterThan(0);
      for (const f of [0, 1, 3]) expect(shaders[f].uniforms.reefCoralSurface.value.x).toBe(0);
      expect(shaders[3].uniforms.reefCoralA.value.w).toBeGreaterThan(shaders[0].uniforms.reefCoralA.value.w);
      for (const shader of shaders) {
        expect(shader.uniforms.reefCoralB.value.z).toBe(c === 2 ? 1 : 0);
        expect(shader.uniforms.reefCoralB.value.w).toBe(c === 0 ? 1 : 0);
        expect(shader.uniforms.reefCoralSurface.value.y).toBe(0);
        expect(shader.uniforms.reefCoralA.value.y > 0).toBe(c === 2);
      }
    }
  });

  it('uses distinct sponge, plate and encrusting detail on one program family at both tiers', () => {
    for (const quality of ['high', 'low']) {
      const h = build({ quality });
      const meshes = ['finger', 'plate', 'encrusting', 'sponge'].map((kind) => h.root.getObjectByName('reef-decor-' + kind));
      meshes.forEach((mesh) => expect(mesh?.isInstancedMesh).toBe(true));
      const [branch, plate, crust, sponge] = meshes.map(compile);
      expect(plate.uniforms.reefCoralSurface.value.x).toBeGreaterThan(0);
      expect(sponge.uniforms.reefCoralSurface.value.y).toBe(1);
      expect(sponge.uniforms.reefCoralA.value.z).toBe(0);
      expect(crust.uniforms.reefCoralA.value.w).toBeGreaterThan(branch.uniforms.reefCoralA.value.w);
      expect(new Set(meshes.map((mesh) => mesh.material.customProgramCacheKey())).size).toBe(1);
      expect(plate.uniforms.reefCausticMap).toBe(branch.uniforms.reefCausticMap);
      expect(plate.uniforms.reefWaterEye).toBe(sponge.uniforms.reefWaterEye);
      meshes.forEach((mesh) => expect(mesh.material.map).toBeNull());
    }
  });

  it('keeps animal polyps off macroalgae and freezes all plant deformation under reduced motion', () => {
    const h = build({ reducedMotion: true });
    const algae = compile(h.surveyObjects[12].getObjectByName('reef-macroalgae'));
    const soft = compile(h.root.getObjectByName('reef-decor-soft'));
    const fan = compile(h.root.getObjectByName('reef-decor-fan'));
    expect(algae.uniforms.reefPlantBlade.value).toBe(1);
    expect(algae.uniforms.reefPlantTissue.value).toBe(0);
    expect(soft.uniforms.reefPlantBlade.value).toBe(0);
    expect(soft.uniforms.reefPlantTissue.value).toBe(1);
    expect(fan.uniforms.reefPlantBlade.value).toBe(0);
    const initial = [algae, soft, fan].map((s) => s.uniforms.reefPlantMotion.value.toArray());
    h.update(1, 100);
    expect([algae, soft, fan].map((s) => s.uniforms.reefPlantMotion.value.toArray())).toEqual(initial);
    initial.forEach((motion) => expect(motion[3]).toBe(0));
  });
});
