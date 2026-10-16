import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');

// Canvas painting is stubbed; production geometry, resource ownership and
// head articulation run against the exact Three version used in the browser.
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

describe('BirdLab crown and nape plumage', () => {
  it('forms an outward, nondegenerate feather layer with shared detail resources', () => {
    const bird = fixture();
    try {
      const crown = bird.root.getObjectByName('layered-crown-and-nape-plumes');
      const mantle = bird.root.getObjectByName('layered-scapular-mantle-and-flank-plumes');
      expect(crown.material).toBe(mantle.material);
      expect(crown.parent.name).toBe('hawk-head-gaze');
      const { position, normal, uv } = crown.geometry.attributes;
      const index = crown.geometry.index;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let vertex = 0; vertex < position.count; vertex++) {
        expect([position.getX(vertex), position.getY(vertex), position.getZ(vertex)].every(Number.isFinite)).toBe(true);
        expect(a.fromBufferAttribute(normal, vertex).length()).toBeCloseTo(1, 5);
        expect(uv.getX(vertex)).toBeGreaterThanOrEqual(0); expect(uv.getX(vertex)).toBeLessThanOrEqual(1);
        expect(uv.getY(vertex)).toBeGreaterThanOrEqual(0); expect(uv.getY(vertex)).toBeLessThanOrEqual(1);
      }
      for (let face = 0; face < index.count; face += 3) {
        a.fromBufferAttribute(position, index.getX(face)); b.fromBufferAttribute(position, index.getX(face + 1));
        c.fromBufferAttribute(position, index.getX(face + 2));
        b.sub(a).cross(c.sub(a));
        if (b.lengthSq() < 1e-22 || b.dot(a) <= 0) throw new Error(`Degenerate or inward crown feather at face ${face / 3}: ${b.lengthSq()}, ${b.dot(a)}`);
      }
    } finally { bird.dispose(); }
  });

  it('keeps feathers clear of both eyes and moves them with the head without rebuilding buffers', () => {
    const bird = fixture();
    try {
      const crown = bird.root.getObjectByName('layered-crown-and-nape-plumes');
      const { position } = crown.geometry.attributes;
      const retained = position.array.slice(), point = new THREE.Vector3();
      const eyePositions = [-1, 1].map(side => bird.root.getObjectByName(`hawk-eye-${side}`).position);
      for (let vertex = 0; vertex < position.count; vertex++) {
        point.fromBufferAttribute(position, vertex);
        for (const eye of eyePositions) if (point.distanceTo(eye) < .011) throw new Error(`Crown feather enters eye clearance at vertex ${vertex}: ${point.toArray()}, ${point.distanceTo(eye)}`);
      }
      for (const pose of [{ fold: 1, headYaw: -.7, gazePitch: .2 }, { fold: 0, headYaw: .6, bank: -.7 }, { fold: 1, headYaw: 0 }]) {
        bird.update(pose, 1 / 60); bird.root.updateMatrixWorld(true);
        expect(crown.matrixWorld.elements).toEqual(crown.parent.matrixWorld.elements);
        expect(Array.from(position.array)).toEqual(Array.from(retained));
      }
    } finally { bird.dispose(); }
  });

  it('releases the additional feather geometry once and keeps the shared material singly owned', () => {
    const bird = fixture();
    const crown = bird.root.getObjectByName('layered-crown-and-nape-plumes');
    let geometryDisposals = 0, materialDisposals = 0;
    crown.geometry.addEventListener('dispose', () => geometryDisposals++);
    crown.material.addEventListener('dispose', () => materialDisposals++);
    bird.dispose(); bird.dispose();
    expect(geometryDisposals).toBe(1); expect(materialDisposals).toBe(1);
  });
});
