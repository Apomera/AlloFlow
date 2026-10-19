import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_mammals.js', 'utf8');
function create(seed = 42, groundHeight) {
  const scope = {}, scene = new THREE.Scene();
  new Function('window', source)(scope);
  const mammals = scope.BirdLab3DMammals.create(THREE, scene, { quality: 'low', seed, groundHeight });
  mammals.setMode('free'); scene.updateMatrixWorld(true);
  return { mammals, scene, head: mammals.root.getObjectByName('squirrel-head'), torso: mammals.root.getObjectByName('squirrel-torso'),
    paws: ['front-left', 'front-right', 'hind-left', 'hind-right'].map(id => mammals.root.getObjectByName('squirrel-paw-' + id)) };
}
function advance(rig, frame, observer) {
  rig.mammals.update(frame / 120, 1 / 120, observer); rig.scene.updateMatrixWorld(true);
  return rig.mammals.snapshot()[0];
}
function pitch(object) {
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(object.getWorldQuaternion(new THREE.Quaternion()));
  return Math.atan2(-forward.y, Math.hypot(forward.x, forward.z));
}
function fingerprint(rig) {
  const values = [];
  rig.mammals.root.traverse(object => values.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()));
  return values;
}

describe('Squirrel inspection and posture momentum', () => {
  it('starts rearing and lowering without a one-frame angular kick at feeding, vigilance and recovery handoffs', () => {
    for (const disturbed of [false, true]) {
      const rig = create(), observer = disturbed ? { position: new THREE.Vector3(-2.4, 1.65, -.18), speed: .4 } : undefined;
      let previous = { state: rig.mammals.snapshot()[0], torso: pitch(rig.torso), head: pitch(rig.head), torsoSpeed: 0, headSpeed: 0 };
      let transitionWindow = 0, checked = 0, transitions = new Set();
      try {
        for (let frame = 0; frame < 48 * 120; frame++) {
          const state = advance(rig, frame, observer), torso = pitch(rig.torso), head = pitch(rig.head);
          const torsoSpeed = (torso - previous.torso) * 120, headSpeed = (head - previous.head) * 120;
          if (state.behavior !== previous.state.behavior) {
            transitionWindow = 18; transitions.add(previous.state.behavior + ' → ' + state.behavior);
          }
          const travel = Math.hypot(state.position[0] - previous.state.position[0], state.position[2] - previous.state.position[2]);
          if (transitionWindow > 0 && travel < .00001 && !state.behavior.startsWith('Scurrying')) {
            expect(Math.abs(torsoSpeed - previous.torsoSpeed) * 120).toBeLessThan(160);
            expect(Math.abs(headSpeed - previous.headSpeed) * 120).toBeLessThan(130);
            checked++;
          }
          transitionWindow--;
          previous = { state, torso, head, torsoSpeed, headSpeed };
        }
        expect(checked).toBeGreaterThan(150);
        expect([...transitions].some(value => value.includes(disturbed ? 'Watching after escape' : 'Handling a seed'))).toBe(true);
      } finally { rig.mammals.dispose(); }
    }
  });

  it('lets the nose approach a ground patch before the shoulders follow, then lift and settle without shifting support paws', () => {
    for (const seed of [22, 42]) {
      const rig = create(seed), contacts = rig.paws.map(paw => paw.getWorldPosition(new THREE.Vector3()));
      let noseLeads = 0, shouldersFollow = 0, quiet = 0, previousPitch = pitch(rig.head), previousSpeed = 0;
      try {
        for (let frame = 0; frame < 2.4 * 120; frame++) {
          advance(rig, frame);
          const nose = rig.head.rotation.x / .30, shoulders = rig.torso.rotation.x / .16;
          if (nose - shoulders > .08) noseLeads++;
          if (shoulders - nose > .08) shouldersFollow++;
          const headPitch = pitch(rig.head), speed = (headPitch - previousPitch) * 120;
          expect(Math.abs(speed - previousSpeed) * 120).toBeLessThan(80);
          if (Math.abs(speed) < .06 && headPitch < .025) quiet++;
          rig.paws.forEach((paw, index) => expect(paw.getWorldPosition(new THREE.Vector3()).distanceTo(contacts[index])).toBeLessThan(1e-9));
          previousPitch = headPitch; previousSpeed = speed;
        }
        expect(noseLeads).toBeGreaterThan(12); expect(shouldersFollow).toBeGreaterThan(12); expect(quiet).toBeGreaterThan(30);
      } finally { rig.mammals.dispose(); }
    }
  });

  it('replays the full articulated pose across frame rates, pauses and a restarted visit', () => {
    const a = create(), b = create();
    try {
      for (let frame = 0; frame < 18 * 30; frame++) a.mammals.update(frame / 30, 1 / 30);
      for (let frame = 0; frame < 18 * 120; frame++) b.mammals.update(frame / 120, 1 / 120);
      const expected = fingerprint(a);
      expect(fingerprint(b)).toEqual(expected);
      for (let frame = 0; frame < 50; frame++) a.mammals.update(100 + frame, 0, { position: new THREE.Vector3(0, 1.65, 0) });
      expect(fingerprint(a)).toEqual(expected);
      a.mammals.setMode('guided'); a.mammals.setMode('free');
      for (let frame = 0; frame < 18 * 60; frame++) a.mammals.update(frame / 60, 1 / 60);
      expect(fingerprint(a)).toEqual(expected);
    } finally { a.mammals.dispose(); b.mammals.dispose(); }
  });

  it('exchanges both diagonal supports during large pivots without stretching the actual leg segments or sliding a planted paw', () => {
    for (const seed of [22, 42]) for (const disturbed of [false, true]) for (const sloped of [false, true]) {
      const ground = sloped ? (x, z) => .04 * x + .03 * z : () => 0;
      const rig = create(seed, ground), observer = disturbed ? { position: new THREE.Vector3(-2.4, 1.65, -.18), speed: .4 } : undefined;
      const legs = ['front-left', 'front-right', 'hind-left', 'hind-right'].map(id => ({
        upper: rig.mammals.root.getObjectByName('squirrel-upper-' + id), lower: rig.mammals.root.getObjectByName('squirrel-lower-' + id),
        upperLength: id.startsWith('front') ? .047 : .055, lowerLength: id.startsWith('front') ? .047 : .061
      }));
      let previous = null, checked = 0, supported = 0;
      try {
        for (let frame = 0; frame < 48 * 120; frame++) {
          const state = advance(rig, frame, observer), feet = rig.paws.map(paw => paw.getWorldPosition(new THREE.Vector3()));
          const preparing = state.behavior === 'Choosing a route' || state.behavior === 'Alert — preparing to move away';
          if (preparing) {
            legs.forEach((leg, index) => {
              // Exclude the overlapping joint caps, measuring the actual
              // shoulder/elbow and elbow/wrist distances at every turn tick.
              expect((leg.upper.scale.y - .004) * 2).toBeLessThan(leg.upperLength * 1.02);
              expect((leg.lower.scale.y - .004) * 2).toBeLessThan(leg.lowerLength * 1.02);
              const foot = feet[index], prior = previous?.feet[index];
              if (prior && Math.abs(foot.y - ground(foot.x, foot.z) - .0045) < .000002 && Math.abs(prior.y - ground(prior.x, prior.z) - .0045) < .000002) {
                expect(foot.distanceTo(prior)).toBeLessThan(.0005); supported++;
              }
              checked++;
            });
          }
          previous = { feet };
        }
        expect(checked).toBeGreaterThan(400); expect(supported).toBeGreaterThan(200);
      } finally { rig.mammals.dispose(); }
    }
  }, 20000);
});
