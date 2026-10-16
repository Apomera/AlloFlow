import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_mammals.js', 'utf8');
function create(seed = 42) {
  const scope = {}, scene = new THREE.Scene();
  new Function('window', source)(scope);
  const mammals = scope.BirdLab3DMammals.create(THREE, scene, { quality: 'low', seed });
  mammals.setMode('free');
  return { mammals, scene, head: mammals.root.getObjectByName('squirrel-head') };
}
function wrap(value) { return Math.atan2(Math.sin(value), Math.cos(value)); }
function state(mammals) { return mammals.snapshot()[0]; }
function advance(mammals, seconds, fps = 60, observer) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) mammals.update(frame / fps, 1 / fps, observer);
}
function rig(root) {
  const result = [];
  root.traverse(object => result.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()));
  return result;
}

describe('Squirrel route attention and recovery glances', () => {
  it('checks a selected route before its body finishes turning, then straightens into travel', () => {
    const { mammals, scene, head } = create();
    try {
      let preparation = [], previous = state(mammals), checkedTurns = 0, forwardSamples = 0;
      const tip = new THREE.Vector3(), base = new THREE.Vector3();
      for (let frame = 0; frame < 45 * 60; frame++) {
        mammals.update(frame / 60, 1 / 60); scene.updateMatrixWorld(true);
        const current = state(mammals);
        head.getWorldPosition(base); tip.set(0, 0, .05); head.localToWorld(tip).sub(base);
        const gaze = Math.atan2(tip.x, tip.z);
        if (current.behavior === 'Choosing a route') preparation.push({ heading: current.heading, gaze });
        if (current.behavior === 'Scurrying' && preparation.length) {
          const turn = wrap(current.heading - preparation[0].heading);
          if (Math.abs(turn) > .35) {
            const leading = preparation.filter(sample => {
              const bodyRemaining = wrap(current.heading - sample.heading);
              const gazeRemaining = wrap(current.heading - sample.gaze);
              return Math.abs(bodyRemaining) > .25 && Math.abs(gazeRemaining) < Math.abs(bodyRemaining) - .08;
            });
            expect(leading.length).toBeGreaterThan(6); checkedTurns++;
          }
          preparation = [];
        }
        if (current.behavior === 'Scurrying' && previous.behavior === current.behavior) {
          const moved = Math.hypot(current.position[0] - previous.position[0], current.position[2] - previous.position[2]);
          if (moved > .003) {
            expect(Math.abs(wrap(gaze - current.heading))).toBeLessThan(.06); forwardSamples++;
          }
        }
        previous = current;
      }
      expect(checkedTurns).toBeGreaterThanOrEqual(2); expect(forwardSamples).toBeGreaterThan(100);
    } finally { mammals.dispose(); }
  });

  it('watches its escape path while moving and makes separated observer checks after reaching cover', () => {
    const { mammals, head } = create();
    const observer = { position: new THREE.Vector3(-2.4, 1.65, -.18), speed: .4 };
    try {
      let forwardSamples = 0, recoverySamples = 0, previous = state(mammals), heldObserver = 0, heldSurroundings = 0;
      let previousYaw = 0;
      for (let frame = 0; frame < 14 * 60; frame++) {
        const before = state(mammals);
        if (before.recovering) {
          // Stay to one side so recovery can be distinguished from merely
          // centering the head as the original observer becomes distant.
          observer.position.set(before.position[0] + Math.sin(before.heading + 1.2) * .9, 1.65,
            before.position[2] + Math.cos(before.heading + 1.2) * .9);
          observer.speed = 0;
        }
        mammals.update(frame / 60, 1 / 60, observer); const current = state(mammals);
        const moved = Math.hypot(current.position[0] - previous.position[0], current.position[2] - previous.position[2]);
        if (current.behavior === 'Scurrying to cover' && moved > .004) {
          expect(Math.abs(head.rotation.y)).toBeLessThan(.06); forwardSamples++;
        }
        if (current.recovering) {
          recoverySamples++;
          if (recoverySamples > 45 && Math.abs(head.rotation.y - previousYaw) < .0015) {
            if (head.rotation.y > .60) heldObserver++;
            if (Math.abs(head.rotation.y) < .35) heldSurroundings++;
          }
          if (recoverySamples >= 4.8 * 60) break;
        }
        previousYaw = head.rotation.y; previous = current;
      }
      expect(forwardSamples).toBeGreaterThan(60); expect(recoverySamples).toBeGreaterThan(240);
      expect(heldObserver).toBeGreaterThan(20); expect(heldSurroundings).toBeGreaterThan(20);
    } finally { mammals.dispose(); }
  });

  it('starts and ends glances with bounded angular acceleration through action changes', () => {
    const { mammals, head } = create(22);
    try {
      let previousYaw = head.rotation.y, previousVelocity = 0, movingGlances = 0;
      for (let frame = 0; frame < 35 * 120; frame++) {
        mammals.update(frame / 120, 1 / 120);
        const velocity = (head.rotation.y - previousYaw) * 120;
        const acceleration = (velocity - previousVelocity) * 120;
        expect(Math.abs(velocity)).toBeLessThan(4.5);
        expect(Math.abs(acceleration)).toBeLessThan(150);
        if (Math.abs(velocity) > .3) movingGlances++;
        previousYaw = head.rotation.y; previousVelocity = velocity;
      }
      expect(movingGlances).toBeGreaterThan(100);
    } finally { mammals.dispose(); }
  });

  it('replays the complete attention pose and tail exactly across frame rates, pause and reset', () => {
    const a = create(22).mammals, b = create(22).mammals;
    const observer = { position: new THREE.Vector3(-2.4, 1.65, -.18), speed: .4 };
    try {
      advance(a, 12, 30, observer); advance(b, 12, 120, observer);
      const pose = rig(a.root), tail = Array.from(a.root.getObjectByName('squirrel-tail').geometry.attributes.position.array), snapshot = a.snapshot();
      expect(b.snapshot()).toEqual(snapshot); expect(rig(b.root)).toEqual(pose);
      expect(Array.from(b.root.getObjectByName('squirrel-tail').geometry.attributes.position.array)).toEqual(tail);
      a.update(999, 0, observer); expect(rig(a.root)).toEqual(pose); expect(a.snapshot()).toEqual(snapshot);
      a.setMode('guided'); a.setMode('free'); advance(a, 12, 60, observer);
      expect(a.snapshot()).toEqual(snapshot); expect(rig(a.root)).toEqual(pose);
      expect(Array.from(a.root.getObjectByName('squirrel-tail').geometry.attributes.position.array)).toEqual(tail);
    } finally { a.dispose(); b.dispose(); }
  });
});
