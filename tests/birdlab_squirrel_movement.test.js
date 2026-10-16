import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_mammals.js', 'utf8');
function create() {
  const scope = {}, scene = new THREE.Scene();
  new Function('window', source)(scope);
  const mammals = scope.BirdLab3DMammals.create(THREE, scene, { quality: 'low', seed: 42 });
  mammals.setMode('free');
  const paws = ['front-left', 'front-right', 'hind-left', 'hind-right'].map(id => mammals.root.getObjectByName('squirrel-paw-' + id));
  return { mammals, scene, paws, head: mammals.root.getObjectByName('squirrel-head'), torso: mammals.root.getObjectByName('squirrel-torso') };
}
function advance(rig, frame, observer) { rig.mammals.update(frame / 120, 1 / 120, observer); rig.scene.updateMatrixWorld(true); return rig.mammals.snapshot()[0]; }

describe('Squirrel loaded scurry and smooth paw release', () => {
  it('leaves and meets planted contacts without a vertical velocity jump, with neutral stance and airborne wrist release', () => {
    const rig = create();
    try {
      let previous = null, transitions = 0, planted = 0, lifted = 0, released = 0, extended = 0;
      for (let frame = 0; frame < 27 * 120; frame++) {
        const state = advance(rig, frame), current = rig.paws.map(paw => paw.getWorldPosition(new THREE.Vector3()));
        if (state.behavior === 'Scurrying' && previous?.behavior === state.behavior) {
          current.forEach((position, index) => {
            const prior = previous.feet[index], atFloor = Math.abs(position.y - .0045) < 1e-10, wasAtFloor = Math.abs(prior.y - .0045) < 1e-10;
            if (atFloor && wasAtFloor) {
              expect(position.distanceTo(prior)).toBeLessThan(1e-7);
              expect(Math.abs(rig.paws[index].rotation.x)).toBeLessThan(.0001); planted++;
            }
            if (atFloor !== wasAtFloor) {
              expect(Math.abs(position.y - prior.y) * 120).toBeLessThan(.20); transitions++;
              // A fixed 120Hz sample can straddle the end of the continuous
              // landing curve; keep that final travel below one millimeter.
              if (atFloor) expect(position.distanceTo(prior)).toBeLessThan(.001);
            }
            if (position.y > .010) {
              lifted++;
              if (rig.paws[index].rotation.x > .025) released++;
              if (rig.paws[index].rotation.x < -.025) extended++;
            }
          });
        }
        previous = { feet: current, behavior: state.behavior };
      }
      expect(transitions).toBeGreaterThan(70); expect(planted).toBeGreaterThan(300); expect(lifted).toBeGreaterThan(100);
      expect(released).toBeGreaterThan(30); expect(extended).toBeGreaterThan(30);
    } finally { rig.mammals.dispose(); }
  });

  it('keeps the actual two-bone fore and hind limbs within their authored reach through initial strides and escape', () => {
    for (const disturbed of [false, true]) {
      const rig = create(), observer = disturbed ? { position: new THREE.Vector3(-2.4, 1.65, -.18), speed: .4 } : undefined;
      const legs = ['front-left', 'front-right', 'hind-left', 'hind-right'].map(id => ({
        upper: rig.mammals.root.getObjectByName('squirrel-upper-' + id), lower: rig.mammals.root.getObjectByName('squirrel-lower-' + id),
        upperLength: id.startsWith('front') ? .047 : .055, lowerLength: id.startsWith('front') ? .047 : .061
      }));
      try {
        let checked = 0;
        for (let frame = 0; frame < 10 * 120; frame++) {
          const state = advance(rig, frame, observer);
          if (!state.behavior.startsWith('Scurrying')) continue;
          for (const leg of legs) {
            // Rod caps overlap by4mm at each end; exclude those caps to
            // measure the shoulder/elbow and elbow/paw segment lengths.
            expect((leg.upper.scale.y - .004) * 2).toBeLessThan(leg.upperLength * 1.02);
            expect((leg.lower.scale.y - .004) * 2).toBeLessThan(leg.lowerLength * 1.10);
            checked++;
          }
        }
        expect(checked).toBeGreaterThan(200);
      } finally { rig.mammals.dispose(); }
    }
  });

  it('retains the whole planted paw orientation when turning steps hand over to a first stride', () => {
    for (const disturbed of [false, true]) {
      const rig = create(), observer = disturbed ? { position: new THREE.Vector3(-2.4, 1.65, -.18), speed: .4 } : undefined;
      try {
        let previous = null, checked = 0, firstStrideContacts = 0;
        for (let frame = 0; frame < 48 * 120; frame++) {
          const state = advance(rig, frame, observer), feet = rig.paws.map(paw => ({
            position: paw.getWorldPosition(new THREE.Vector3()), rotation: paw.getWorldQuaternion(new THREE.Quaternion())
          }));
          if (state.behavior.startsWith('Scurrying') && previous) feet.forEach((foot, index) => {
            const prior = previous.feet[index];
            if (Math.abs(foot.position.y - .0045) < 1e-10 && Math.abs(prior.position.y - .0045) < 1e-10 && foot.position.distanceTo(prior.position) < 1e-9) {
              expect(foot.rotation.angleTo(prior.rotation)).toBeLessThan(.001); checked++;
              if (previous.behavior !== state.behavior) firstStrideContacts++;
            }
          });
          previous = { feet, behavior: state.behavior };
        }
        expect(checked).toBeGreaterThan(200); expect(firstStrideContacts).toBeGreaterThan(0);
      } finally { rig.mammals.dispose(); }
    }
  });

  it('keeps real paw and claw surfaces clear of terrain through scurry, turn, stop, and escape', () => {
    for (const disturbed of [false, true]) {
      const rig = create(), vertex = new THREE.Vector3();
      const observer = disturbed ? { position: new THREE.Vector3(-2.4, 1.65, -.18), speed: .4 } : undefined;
      try {
        let samples = 0, contacts = 0;
        for (let frame = 0; frame < 8 * 120; frame++) {
          advance(rig, frame, observer);
          for (const paw of rig.paws) {
            const position = paw.geometry.attributes.position;
            let minimum = Infinity;
            for (let index = 0; index < position.count; index++) {
              vertex.fromBufferAttribute(position, index).applyMatrix4(paw.matrixWorld); minimum = Math.min(minimum, vertex.y);
            }
            expect(minimum).toBeGreaterThan(-.0002);
            if (minimum < .002) contacts++; samples++;
          }
        }
        expect(samples).toBe(3840); expect(contacts).toBeGreaterThan(1000);
      } finally { rig.mammals.dispose(); }
    }
  });

  it('transfers shoulder and pelvis loading while the head stays quieter than the torso through a scurry', () => {
    const rig = create(), headPitch = [], torsoPitch = [], shoulderZ = [], bodyY = [];
    const forward = new THREE.Vector3(), quaternion = new THREE.Quaternion();
    try {
      let previous = rig.mammals.snapshot()[0];
      for (let frame = 0; frame < 6 * 120; frame++) {
        const state = advance(rig, frame), speed = Math.hypot(state.position[0] - previous.position[0], state.position[2] - previous.position[2]) * 120;
        if (state.behavior === 'Scurrying' && speed > .55) {
          rig.head.getWorldQuaternion(quaternion); forward.set(0, 0, 1).applyQuaternion(quaternion);
          headPitch.push(Math.atan2(-forward.y, Math.hypot(forward.x, forward.z)));
          torsoPitch.push(rig.torso.rotation.x); shoulderZ.push(rig.torso.position.z); bodyY.push(rig.torso.position.y);
        }
        previous = state;
      }
      const range = values => Math.max(...values) - Math.min(...values);
      expect(headPitch.length).toBeGreaterThan(50);
      expect(range(torsoPitch)).toBeGreaterThan(.035);
      expect(range(headPitch)).toBeLessThan(range(torsoPitch) * .35);
      expect(range(shoulderZ)).toBeGreaterThan(.020);
      expect(Math.max(...bodyY)).toBeLessThan(.077);
    } finally { rig.mammals.dispose(); }
  });
});
