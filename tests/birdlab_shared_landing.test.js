import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const modelSource = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const wildlifeSource = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
const flights = [['mourningDove', 12, 13.4], ['mourningDove', 29.5, 31.1], ['grouse', 18, 19.1], ['grouse', 34, 35.2]];
function fixture(quality, groundHeight = () => 0) {
  const window = {}, scene = new THREE.Scene();
  new Function('window', modelSource)(window); new Function('window', wildlifeSource)(window);
  return { scene, wildlife: window.BirdLab3DWildlife.create(THREE, scene, { quality, groundHeight }) };
}
function state(root) {
  const values = [];
  root.traverse(object => {
    values.push(...object.position.toArray(), ...object.quaternion.toArray());
    if (object.isMesh) for (const value of object.geometry.attributes.position.array) values.push(value);
  });
  return values;
}
function feetState(bird) {
  const values = [], point = new THREE.Vector3();
  for (const name of ['woodland-left-foot', 'woodland-right-foot']) {
    const foot = bird.getObjectByName(name);
    foot.getWorldPosition(point); values.push(...point.toArray(), ...foot.quaternion.toArray());
  }
  return values;
}

describe('BirdLab shared-bird approach contact', () => {
  it.each(['high', 'low'])('plants feet by touchdown while the wings still flare (%s)', quality => {
    for (const groundHeight of [() => 0, (x, z) => .04 * x - .025 * z]) {
      const { scene, wildlife } = fixture(quality, groundHeight), point = new THREE.Vector3();
      try {
        for (const [id, , end] of flights) {
          const bird = scene.getObjectByName('woodland-' + id);
          wildlife.update(end); scene.updateMatrixWorld(true);
          const wing = bird.getObjectByName('woodland-right-wing').getObjectByName('woodland-layered-wing');
          const flaring = wing.geometry.attributes.position.array.slice();
          for (const name of ['woodland-left-foot', 'woodland-right-foot']) {
            const foot = bird.getObjectByName(name); let clearance = Infinity;
            foot.traverse(object => {
              if (!object.isMesh) return;
              const position = object.geometry.attributes.position;
              for (let vertex = 0; vertex < position.count; vertex++) {
                point.fromBufferAttribute(position, vertex).applyMatrix4(object.matrixWorld);
                clearance = Math.min(clearance, point.y - groundHeight(point.x, point.z));
              }
            });
            expect(Math.abs(clearance)).toBeLessThan(.0015);
            expect(foot.rotation.x).toBeCloseTo(0, 12);
          }
          wildlife.update(end + .25);
          expect(wing.geometry.attributes.position.array).not.toEqual(flaring);
        }
      } finally { wildlife.dispose(); }
    }
  });

  it('keeps approach foot placement continuous and identical after backward or repeated seeks', () => {
    const { scene, wildlife } = fixture('low'), epsilon = 1e-5;
    try {
      for (const [id, start, end] of flights) {
        const bird = scene.getObjectByName('woodland-' + id);
        for (const time of [end - .06, end, end + .06, end + .16]) {
          wildlife.update(time); const expected = state(bird);
          wildlife.update(time); expect(state(bird)).toEqual(expected);
          wildlife.update(2); wildlife.update(time); expect(state(bird)).toEqual(expected);
          wildlife.update(42); wildlife.update(time); expect(state(bird)).toEqual(expected);
        }
        for (const time of [start + (end - start) * .65, start + (end - start) * .88, end, end + .12, end + .32]) {
          const poses = [-epsilon, 0, epsilon].map(offset => {
            wildlife.update(time + offset); scene.updateMatrixWorld(true); return feetState(bird);
          });
          let jump = 0;
          for (let index = 0; index < poses[0].length; index++) jump = Math.max(jump,
            Math.abs((poses[2][index] - 2 * poses[1][index] + poses[0][index]) / epsilon));
          expect(jump).toBeLessThan(.003);
        }
      }
    } finally { wildlife.dispose(); }
  });

  it('keeps feathers, head and toes above the clearing through all four flight approaches', () => {
    const { scene, wildlife } = fixture('low'), point = new THREE.Vector3();
    try {
      let bodyClearance = Infinity, toeClearance = Infinity;
      for (const [id, start, end] of flights) {
        const bird = scene.getObjectByName('woodland-' + id);
        for (let sample = 0; sample <= 160; sample++) {
          wildlife.update(start - .10 + (end - start + .30) * sample / 160); scene.updateMatrixWorld(true);
          bird.traverse(object => {
            if (!object.isMesh) return;
            const position = object.geometry.attributes.position, foot = object.name === 'woodland-scaled-toes';
            for (let vertex = 0; vertex < position.count; vertex++) {
              point.fromBufferAttribute(position, vertex).applyMatrix4(object.matrixWorld);
              if (foot) toeClearance = Math.min(toeClearance, point.y);
              else bodyClearance = Math.min(bodyClearance, point.y);
            }
          });
        }
      }
      expect(bodyClearance).toBeGreaterThan(.001);
      expect(toeClearance).toBeGreaterThan(-1e-7);
    } finally { wildlife.dispose(); }
  }, 15000);

  it('holds a forward sightline through wing closure and smoothly resumes scanning inside the settling window', () => {
    const { scene, wildlife } = fixture('low'), epsilon = 1e-5;
    try {
      for (const [id, , end] of flights) {
        const head = scene.getObjectByName('woodland-' + id).getObjectByName('woodland-head');
        for (const offset of [0, .04, .08, .12]) {
          wildlife.update(end + offset); expect(Math.abs(head.rotation.y)).toBeLessThan(1e-10);
        }
        wildlife.update(end + .42); const scanning = head.rotation.y;
        expect(Math.abs(scanning)).toBeGreaterThan(.05);
        wildlife.update(end + .27); const halfway = head.rotation.y;
        expect(Math.abs(halfway)).toBeGreaterThan(.01); expect(Math.abs(halfway)).toBeLessThan(Math.abs(scanning));
        wildlife.update(0); wildlife.update(end + .27); expect(head.rotation.y).toBe(halfway);
        for (const offset of [.12, .42]) {
          const angles = [-epsilon, 0, epsilon].map(delta => { wildlife.update(end + offset + delta); return head.rotation.y; });
          expect(Math.abs((angles[2] - 2 * angles[1] + angles[0]) / epsilon)).toBeLessThan(.001);
        }
      }
    } finally { wildlife.dispose(); }
  });
});
