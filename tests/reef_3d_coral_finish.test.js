import { afterEach, describe, expect, it, vi } from 'vitest';
import { THREE, runtime, cleanup, census } from './helpers/reef_dive_harness.js';

// Decorative surface detail stays in the existing instance draws. Its shared
// uniforms must remain valid when the renderer changes LOD, pauses, or reduces motion.
vi.setConfig({ testTimeout: 60000 });
afterEach(() => cleanup());
const HARD = ['finger', 'antler', 'corym', 'table', 'massive', 'brain', 'plate', 'encrust'];
function decor(t, kind, lod = 'near') {
  let found;
  t.scene.traverse((object) => {
    if (object.userData.decorative && object.userData.kind === kind && object.userData.lod === lod) found = object;
  });
  expect(found, kind + ' ' + lod + ' exists').toBeTruthy();
  return found;
}
function compile(t, material) {
  const standard = THREE.ShaderLib.standard;
  const shader = { uniforms: THREE.UniformsUtils.clone(standard.uniforms), vertexShader: standard.vertexShader, fragmentShader: standard.fragmentShader };
  material.onBeforeCompile(shader, t.renderer);
  expect(shader.vertexShader).not.toContain('undefined');
  expect(shader.fragmentShader).not.toContain('undefined');
  return shader;
}

describe('decorative coral surface finish', () => {
  it('uses finer massive cups and plate growth relief within one coral shader family on both tiers', () => {
    for (const quality of ['low', 'high']) {
      const t = runtime({ quality });
      const shader = Object.fromEntries(HARD.map((kind) => [kind, compile(t, decor(t, kind).material)]));
      expect(new Set(HARD.map((kind) => decor(t, kind).material.customProgramCacheKey())).size).toBe(1);
      expect(shader.massive.uniforms.reefCoralA.value.w).toBeGreaterThan(shader.finger.uniforms.reefCoralA.value.w);
      expect(shader.encrust.uniforms.reefCoralA.value.w).toBe(shader.massive.uniforms.reefCoralA.value.w);
      for (const kind of ['table', 'plate']) {
        expect(shader[kind].uniforms.reefCoralB.value.z).toBeGreaterThan(1.5);
        expect(shader[kind].uniforms.reefCoralB.value.w).toBeGreaterThan(0);
      }
      for (const kind of ['finger', 'antler', 'corym', 'massive', 'brain', 'encrust']) expect(shader[kind].uniforms.reefCoralB.value.z).toBeLessThan(1.5);
      expect(shader.brain.uniforms.reefCoralB.value.x).toBe(1);
      expect(shader.massive.uniforms.reefCoralB.value.x).toBe(0);
      for (const kind of HARD) {
        expect(shader[kind].uniforms.reefCausticTime).toBe(shader.finger.uniforms.reefCausticTime);
        expect(shader[kind].uniforms.reefWaterEye).toBe(shader.finger.uniforms.reefWaterEye);
      }
    }
  });

  it('keeps each form on one material at every LOD with no additional surface meshes or textures', () => {
    for (const quality of ['low', 'high']) {
      const t = runtime({ quality });
      for (const kind of HARD) {
        const near = decor(t, kind), far = decor(t, kind, 'far');
        expect(far.material).toBe(near.material);
        if (quality === 'high') expect(decor(t, kind, 'mid').material).toBe(near.material);
        expect(near.material.map).toBeNull();
        const siblings = [];
        t.scene.traverse((object) => { if (object.isMesh && object.userData.decorative && object.userData.kind === kind) siblings.push(object); });
        expect(siblings).toHaveLength(quality === 'high' ? 3 : 2);
        for (const mesh of siblings) expect(mesh.isInstancedMesh).toBe(true);
        expect(near.userData.items.matrices.length).toBe(near.userData.instances * 16);
        expect(Array.from(near.userData.items.colors).every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('shares current time, freezes it on pause and reduces plant flex under reduced motion', () => {
    for (const reducedMotion of [false, true]) {
      const t = runtime({ reducedMotion });
      const shaders = Object.fromEntries(['soft', 'fan', 'algae'].map((kind) => [kind, compile(t, decor(t, kind).material)]));
      expect(shaders.soft.uniforms.reefPlantTissue.value).toBe(1);
      expect(shaders.fan.uniforms.reefPlantTissue.value).toBe(0);
      expect(shaders.algae.uniforms.reefPlantTissue.value).toBe(0);
      const start = shaders.soft.uniforms.reefPlantMotion.value.x;
      t.run(1);
      if (!reducedMotion) expect(shaders.soft.uniforms.reefPlantMotion.value.x).toBeGreaterThan(start);
      for (const kind of ['soft', 'fan', 'algae']) {
        expect(shaders[kind].uniforms.reefPlantMotion.value.x).toBe(shaders.soft.uniforms.reefPlantMotion.value.x);
        const motion = shaders[kind].uniforms.reefPlantMotion;
        expect(motion.value.w).toBeGreaterThan(0);
        if (reducedMotion) expect(motion.value.w).toBeLessThan(motion.amount);
        else expect(motion.value.w).toBe(motion.amount);
      }
      t.controller.setPaused(true);
      t.step();
      const paused = shaders.soft.uniforms.reefPlantMotion.value.x;
      t.run(2);
      expect(shaders.soft.uniforms.reefPlantMotion.value.x).toBe(paused);
      expect(t.errors).toEqual([]);
    }
  });

  it('preserves the organism census and decorative placement when motion is reduced', () => {
    const moving = runtime(), still = runtime({ reducedMotion: true });
    const a = census(still), b = census(moving);
    expect(a.map(({ uid, speciesId }) => ({ uid, speciesId }))).toEqual(b.map(({ uid, speciesId }) => ({ uid, speciesId })));
    a.forEach((organism, i) => {
      expect(organism.pos[0]).toBe(b[i].pos[0]);
      expect(organism.pos[2]).toBe(b[i].pos[2]);
      // The existing reduced-motion setting also damps a fish's vertical bob.
      expect(Math.abs(organism.pos[1] - b[i].pos[1])).toBeLessThan(0.05);
    });
    for (const kind of [...HARD, 'soft', 'fan']) {
      expect(Array.from(decor(still, kind).userData.items.matrices)).toEqual(Array.from(decor(moving, kind).userData.items.matrices));
      expect(Array.from(decor(still, kind).userData.items.colors)).toEqual(Array.from(decor(moving, kind).userData.items.colors));
    }
  });
});
