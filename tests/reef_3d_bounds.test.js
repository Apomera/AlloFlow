import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

// The dive measures each organism with localBounds() (obstacle grid, surface clearance).
// r128's Box3.setFromObject counts an InstancedMesh's raw template geometry where it was
// modelled, so the magnificent anemone (tentacles = instances of a 1 m unit tentacle) used
// to measure about 1 m tall and stood in the reef as a phantom pillar.

vi.setConfig({ testTimeout: 60000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const EXPLORE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');
const SPECIES = readFileSync(process.env.REEF3D_SPECIES_SOURCE || 'stem_lab/reef_3d_species.js', 'utf8');
const fnText = sliceBetween(EXPLORE, '    function localBounds(root) {', '    function restQuaternion(', { label: 'reef_3d_explore.js' });
const localBounds = new Function('T', fnText + '\nreturn localBounds;')(THREE);
const win = {}; new Function('window', SPECIES)(win);
const S = win.Reef3DSpecies;

describe('organism bounds', () => {
  it('measures the magnificent anemone by its real tentacles, not the 1 m template', () => {
    const m = S.create(THREE, 'magnificent_anemone', { seed: 7, quality: 'high', reducedMotion: true, growth: 1, health: 'healthy' });
    const box = localBounds(m.root), height = box.max.y - box.min.y;
    let instanced = 0; m.root.traverse((o) => { if (o.isInstancedMesh) instanced++; });
    expect(instanced, 'the anemone still uses instanced tentacles (the case this guards)').toBeGreaterThan(0);
    expect(height, 'anemone height').toBeLessThan(0.45);
    expect(height, 'anemone height').toBeGreaterThan(0.05);
    m.dispose();
  });

  it('still wraps every member of an instanced school', () => {
    const s = S.createSchool ? S.createSchool(THREE, 'blue_green_chromis', 24, { seed: 3, quality: 'low', reducedMotion: true }) : null;
    if (!s) return;
    const box = localBounds(s.root), probe = new THREE.Box3(), mat = new THREE.Matrix4(), part = new THREE.Box3();
    s.root.traverse((o) => {
      if (!o.isInstancedMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, mat); probe.union(part.copy(o.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(o.matrixWorld, mat))); }
    });
    expect(probe.isEmpty()).toBe(false);
    expect(box.containsBox(probe), 'school box covers all members').toBe(true);
    s.dispose();
  });
});
