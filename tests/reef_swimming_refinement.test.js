import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

// Procedural model and texture builds run several seconds on a busy machine.
vi.setConfig({ testTimeout: 30000 });

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const local = {};
new Function('window', readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8'))(local);
const S = local.Reef3DSpecies;

function compileSwimmingUniform(handle, id) {
  const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <emissivemap_fragment>' };
  handle.root.getObjectByName(id + '-body').material.onBeforeCompile(shader);
  return shader.uniforms.reefSwim.value;
}

function relativeFin(school, body, fin, index) {
  const bodyMatrix = new THREE.Matrix4(), finMatrix = new THREE.Matrix4();
  body.getMatrixAt(index, bodyMatrix); fin.getMatrixAt(index, finMatrix);
  return bodyMatrix.invert().multiply(finMatrix);
}

describe('Reef swimming refinement', () => {
  it('changes stroke effort without resetting the stroke phase', () => {
    for (const id of ['blue_tang', 'yellow_boxfish', 'whitetip_reef_shark']) {
      const fish = S.create(THREE, id, { seed: 18, quality: 'low' });
      try {
        const swim = compileSwimmingUniform(fish, id);
        fish.update(1 / 60, 14.2, { speed: 0.02 });
        const phase = swim.x, restingAmplitude = swim.y;
        fish.update(1 / 60, 14.2, { speed: 2.5 });
        expect(swim.x, id + ' effort preserves absolute phase').toBe(phase);
        expect(swim.y, id + ' stronger propulsive stroke').toBeGreaterThan(restingAmplitude * 1.8);
        fish.update(1 / 60, 14.2 + 1 / 60, { speed: 0.4 });
        expect(swim.x - phase, id + ' forward continuous phase').toBeGreaterThan(0);
        expect(swim.x - phase, id + ' no elapsed-time frequency jump').toBeLessThan(0.5);
      } finally { fish.dispose(); }
    }
  });

  it('lets school members feather their fins independently while keeping each fin attached', () => {
    const school = S.createSchool(THREE, 'anthias', 16, { seed: 7, quality: 'low' });
    const body = school.root.getObjectByName('anthias-body');
    const fin = school.root.getObjectByName('anthias-pectoral-left');
    const position = new THREE.Vector3(), orientation = new THREE.Quaternion(), scale = new THREE.Vector3();
    try {
      school.update(1 / 60, 3, { speed: 0.12, turn: 0.4 });
      const first = relativeFin(school, body, fin, 0);
      const second = relativeFin(school, body, fin, 1);
      first.decompose(position, orientation, scale);
      const anchor = position.clone(), rotation = orientation.clone();
      second.decompose(position, orientation, scale);
      expect(rotation.angleTo(orientation), 'neighbours do not flap in lockstep').toBeGreaterThan(0.01);
      school.update(1 / 60, 3.17, { speed: 0.12, turn: 0.4 });
      relativeFin(school, body, fin, 0).decompose(position, orientation, scale);
      expect(rotation.angleTo(orientation), 'fin moves relative to its own body').toBeGreaterThan(0.015);
      expect(position.distanceTo(anchor), 'membrane root remains attached').toBeLessThan(1e-6);
    } finally { school.dispose(); }
  });

  it('keeps dense irregular shoals smooth, separated and inside their culling bounds', () => {
    const school = S.createSchool(THREE, 'blue_green_chromis', 60, { seed: 31, quality: 'low' });
    const body = school.root.getObjectByName('blue_green_chromis-body');
    const matrix = new THREE.Matrix4(), p = new THREE.Vector3(), L = S.info('blue_green_chromis').lengthM;
    const motion = { speed: L * 1.2, turn: 0.45 };
    try {
      for (let step = 0; step <= 80; step++) {
        const t = step * 0.4;
        school.update(0.4, t, motion);
        const centers = [];
        for (let i = 0; i < school.count; i++) {
          body.getMatrixAt(i, matrix); p.setFromMatrixPosition(matrix);
          expect(p.length(), 'bounded deformation').toBeLessThan(school.radius - L * 0.5);
          for (const other of centers) expect(p.distanceTo(other), 'personal space through collective turns').toBeGreaterThan(L * 0.48);
          centers.push(p.clone());
        }
        school.update(1 / 60, t + 1 / 60, motion);
        for (let i = 0; i < school.count; i++) {
          body.getMatrixAt(i, matrix); p.setFromMatrixPosition(matrix);
          expect(p.distanceTo(centers[i]), 'no frame-to-frame formation jump').toBeLessThan(L * 0.025);
        }
      }
    } finally { school.dispose(); }
  });
});
