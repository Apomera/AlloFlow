import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
function fixture(seed = 57) {
  const scope = {}, scene = new THREE.Scene(), poses = new Map();
  new Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(scope);
  const original = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const model = original(...args), update = model.update;
    model.update = pose => { poses.set(args[1], { ...pose }); update(pose); };
    return model;
  };
  new Function('window', readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8'))(scope);
  return { scene, poses, wildlife: scope.BirdLab3DWildlife.create(THREE, scene, { quality: 'low', seed }) };
}
function findPreen(f, id) {
  f.wildlife.setMode('free');
  for (let frame = 0; frame < 90 * 60; frame++) {
    f.wildlife.update(frame / 60, 1 / 60);
    if (f.poses.get(id).preen > .95) return;
  }
  throw new Error('No calm grooming opportunity for ' + id);
}
function rigState(root) {
  const state = [];
  root.traverse(object => {
    state.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray());
  });
  return state;
}

describe('Free woodland feather care', () => {
  it.each(['mourningDove', 'grouse', 'blueJay'])('lets %s unwind grooming smoothly before an observer-triggered escape', id => {
    const f = fixture();
    try {
      findPreen(f, id);
      const bird = f.scene.getObjectByName('woodland-' + id), head = bird.getObjectByName('woodland-head');
      const state = f.wildlife.snapshot().find(item => item.id === id);
      expect(state.behavior).toBe('Preening shoulder feathers');
      expect(state.altitude).toBe(0);
      const held = rigState(bird), heldPose = { ...f.poses.get(id) }, heldSnapshot = f.wildlife.snapshot();
      const observer = { position: new THREE.Vector3(state.position[0] + .04, 1.65, state.position[2]), speed: .8 };
      f.wildlife.update(900, 0, observer);
      expect(rigState(bird)).toEqual(held);
      expect(f.poses.get(id)).toEqual(heldPose);
      expect(f.wildlife.snapshot()).toEqual(heldSnapshot);
      let previous = head.quaternion.clone(), previousPosition = head.position.clone(), airborne = false, raised = false;
      let largestHeadStep = 0, largestHeadTravel = 0;
      for (let frame = 0; frame < 4 * 60; frame++) {
        f.wildlife.update(frame / 60, 1 / 60, observer);
        const pose = f.poses.get(id), current = f.wildlife.snapshot().find(item => item.id === id);
        largestHeadStep = Math.max(largestHeadStep, previous.angleTo(head.quaternion));
        largestHeadTravel = Math.max(largestHeadTravel, previousPosition.distanceTo(head.position));
        previous.copy(head.quaternion); previousPosition.copy(head.position);
        if (pose.preen === 0) raised = true;
        if (current.altitude > .05) { expect(raised).toBe(true); expect(pose.preen).toBe(0); airborne = true; }
        if (pose.preen > .01) {
          expect(current.altitude).toBe(0); expect(pose.walking).toBe(0); expect(pose.flight).toBe(0);
          expect(current.position).toEqual(state.position);
        }
      }
      expect(largestHeadStep).toBeLessThan(.34);
      expect(largestHeadTravel).toBeLessThan(.018);
      expect(airborne).toBe(true);
    } finally { f.wildlife.dispose(); }
  });

  it('keeps grooming occasional, species-independent, and reproducible across update rates', () => {
    const a = fixture(), b = fixture(), starts = new Map(), active = new Set();
    try {
      a.wildlife.setMode('free'); b.wildlife.setMode('free');
      for (let frame = 0; frame < 90 * 30; frame++) {
        a.wildlife.update(frame / 30, 1 / 30);
        b.wildlife.update(frame / 30, 1 / 60); b.wildlife.update(frame / 30, 1 / 60);
        for (const id of ['mourningDove', 'grouse', 'blueJay']) {
          const pose = a.poses.get(id), other = b.poses.get(id);
          expect(pose.preen).toBeCloseTo(other.preen, 7);
          if (pose.preen > .01 && !active.has(id)) {
            const times = starts.get(id) || []; times.push(frame / 30); starts.set(id, times); active.add(id);
          } else if (pose.preen === 0) active.delete(id);
        }
      }
      expect(starts.size).toBe(3);
      const first = [...starts.values()].map(times => times[0]);
      expect(new Set(first).size).toBe(3);
      for (const times of starts.values()) for (let index = 1; index < times.length; index++) expect(times[index] - times[index - 1]).toBeGreaterThan(18);
    } finally { a.wildlife.dispose(); b.wildlife.dispose(); }
  });

  it('restores the exact Guided rig after pausing in a grooming pose', () => {
    const f = fixture();
    try {
      f.wildlife.update(15.9); const expected = rigState(f.wildlife.root), snapshot = f.wildlife.snapshot();
      findPreen(f, 'mourningDove');
      f.wildlife.setMode('guided'); f.wildlife.update(15.9);
      expect(rigState(f.wildlife.root)).toEqual(expected);
      expect(f.wildlife.snapshot()).toEqual(snapshot);
      for (const pose of f.poses.values()) expect(pose.preen).toBe(0);
    } finally { f.wildlife.dispose(); }
  });
});
