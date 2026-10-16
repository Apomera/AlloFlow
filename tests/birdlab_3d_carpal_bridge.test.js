import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');

// Only painting is a boundary stub: the complete production bird geometry,
// joints, morphs and pose writer run with the bundled Three.js implementation.
function fixture() {
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const makeCanvas = () => ({ width: 16, height: 16, getContext: () => context });
  const localWindow = { AvianFeatherArt: { ...loadAvianFeatherArt(),
    createFlightFeatherCanvas: makeCanvas,
    createVaneDetailCanvases: () => ({ normal: makeCanvas(), roughness: makeCanvas() }),
  } };
  new Function('window', 'document', source)(localWindow, { createElement: makeCanvas });
  return localWindow.BirdLab3DBird.create(THREE);
}

const pose = (phase, fold = 0) => ({ flapPhase: phase, flapAmplitude: .5 + .5 * Math.sin(phase), fold, brake: .15,
  airLift: .3, airRoll: -.2, bank: .22, feet: 1, elapsedTime: 4.26,
  wingSweep: .8, wingSupport: .7, rollControl: Math.cos(phase) });
const point = new THREE.Vector3(), expected = new THREE.Vector3();

describe('BirdLab continuous carpal feather surface', () => {
  it('keeps both ends attached to their rigid joint through a stroke and partial fold', () => {
    const bird = fixture();
    try {
      for (const fold of [0, .25, .6, 1]) for (const phase of [0, 1.2, 2.6, 4.4, 6]) {
        bird.update(pose(phase, fold), 0); bird.root.updateMatrixWorld(true);
        for (const wing of bird.joints.wings) {
          const bridge = wing.bridge, positions = bridge.mesh.geometry.attributes.position;
          let inner = 0, outer = 0;
          for (let vertex = 0; vertex < positions.count; vertex++) {
            const weight = bridge.weights[vertex];
            if (weight !== 0 && weight !== 1) continue;
            expected.fromArray(bridge.source, vertex * 3).lerp(point.fromArray(bridge.closed, vertex * 3), fold);
            if (weight === 1) { expected.sub(wing.wrist.position).applyMatrix4(wing.wrist.matrixWorld); outer++; }
            else { expected.applyMatrix4(wing.shoulder.matrixWorld); inner++; }
            point.fromBufferAttribute(positions, vertex).applyMatrix4(bridge.mesh.matrixWorld);
            if (point.distanceTo(expected) > 4e-8) throw new Error(`Detached wrist feather at fold ${fold}, phase ${phase}`);
          }
          expect(inner).toBeGreaterThan(0); expect(outer).toBeGreaterThan(0);
          expect(bridge.mesh.morphTargetInfluences[0]).toBe(0);
          if (fold === 1) expect(Array.from(positions.array)).toEqual(Array.from(bridge.closed));
        }
      }
    } finally { bird.dispose(); }
  });

  it('bends the intervening feathers with finite, nondegenerate geometry and unit normals', () => {
    const bird = fixture();
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    try {
      const retained = bird.joints.wings.map(wing => [wing.bridge.mesh.geometry, wing.bridge.mesh.geometry.attributes.position.array,
        wing.bridge.mesh.geometry.attributes.normal.array]);
      const stats = bird.getStats();
      for (let sample = 0; sample < 120; sample++) {
        bird.update(pose(sample * Math.PI * 2 / 40, sample / 119), 1 / 60);
        for (const [side, wing] of bird.joints.wings.entries()) {
          const g = wing.bridge.mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
          expect(g).toBe(retained[side][0]); expect(p.array).toBe(retained[side][1]); expect(n.array).toBe(retained[side][2]);
          for (let vertex = 0; vertex < p.count; vertex++) {
            if (![p.getX(vertex), p.getY(vertex), p.getZ(vertex)].every(Number.isFinite)) throw new Error('Nonfinite wrist feather');
            if (Math.abs(a.fromBufferAttribute(n, vertex).length() - 1) > .00001) throw new Error('Invalid bent feather normal');
          }
          for (let triangle = 0; triangle < g.index.count; triangle += 3) {
            a.fromBufferAttribute(p, g.index.getX(triangle)); b.fromBufferAttribute(p, g.index.getX(triangle + 1));
            c.fromBufferAttribute(p, g.index.getX(triangle + 2));
            if (b.sub(a).cross(c.sub(a)).lengthSq() < 1e-22) throw new Error('Collapsed wrist feather triangle');
          }
        }
      }
      expect(bird.getStats()).toMatchObject({ feathers: stats.feathers, geometries: stats.geometries, materials: stats.materials, textures: stats.textures });
    } finally { bird.dispose(); }
  });

  it('keeps paused buffers still and reproduces a sought pose without deformation history', () => {
    const bird = fixture();
    try {
      bird.update(pose(2.3, .35), 0);
      const reference = bird.joints.wings.map(wing => ({ values: Array.from(wing.bridge.mesh.geometry.attributes.position.array),
        version: wing.bridge.mesh.geometry.attributes.position.version }));
      bird.update(pose(2.3, .35), 0);
      bird.joints.wings.forEach((wing, index) => expect(wing.bridge.mesh.geometry.attributes.position.version).toBe(reference[index].version));
      for (let sample = 0; sample < 40; sample++) bird.update(pose(sample * .4, sample / 40), 1 / 30);
      bird.update(pose(2.3, .35), 0);
      bird.joints.wings.forEach((wing, index) => expect(Array.from(wing.bridge.mesh.geometry.attributes.position.array)).toEqual(reference[index].values));
    } finally { bird.dispose(); }
  });
});
