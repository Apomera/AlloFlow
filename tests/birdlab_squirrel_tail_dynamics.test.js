import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_mammals.js', 'utf8');
function create() {
  const scope = {};
  new Function('window', source)(scope);
  const mammals = scope.BirdLab3DMammals.create(THREE, new THREE.Scene(), { quality: 'low', seed: 42 });
  mammals.setMode('free');
  const tail = mammals.root.getObjectByName('squirrel-tail'), positions = tail.geometry.attributes.position;
  // The closed tip of the actual low-quality surface, excluding its guard hairs.
  const tip = 20 * 13, original = [positions.getX(tip), positions.getY(tip), positions.getZ(tip)];
  return { mammals, tail, positions, tip, original };
}
function sample(rig) {
  const { tail, positions, tip, original } = rig;
  return { state: rig.mammals.snapshot()[0], pitch: tail.rotation.x, sway: tail.rotation.z,
    flex: positions.getX(tip) - original[0], sweep: positions.getZ(tip) - original[2],
    tipSway: tail.rotation.z - (positions.getX(tip) - original[0]) / original[1] };
}

describe('Squirrel tail counterbalance and follow-through', () => {
  it('leans outside route turns, with the actual tail tip trailing the base and then settling', () => {
    const rig = create();
    try {
      let previous = sample(rig), active = [], firstTurnEnded = false, settleFrames = 0;
      for (let frame = 0; frame < 8 * 120; frame++) {
        rig.mammals.update(frame / 120, 1 / 120); const current = sample(rig);
        const turn = Math.atan2(Math.sin(current.state.heading - previous.state.heading), Math.cos(current.state.heading - previous.state.heading)) * 120;
        if (current.state.behavior === 'Choosing a route' && Math.abs(turn) > .4) {
          if (Math.abs(current.sway) > .025) expect(Math.sign(current.sway)).toBe(Math.sign(turn));
          active.push({ frame, ...current });
        }
        if (active.length && current.state.behavior === 'Scurrying') firstTurnEnded = true;
        if (firstTurnEnded && current.state.behavior === 'Sniffing and searching') {
          settleFrames++;
          if (settleFrames > 180) {
            expect(Math.abs(current.sway)).toBeLessThan(.0001);
            expect(Math.abs(current.flex)).toBeLessThan(.00001);
          }
        }
        previous = current;
      }
      expect(active.length).toBeGreaterThan(35); expect(settleFrames).toBeGreaterThan(240);
      const basePeak = active.reduce((a, b) => Math.abs(a.sway) > Math.abs(b.sway) ? a : b);
      const tipPeak = active.reduce((a, b) => Math.abs(a.tipSway) > Math.abs(b.tipSway) ? a : b);
      expect(Math.abs(basePeak.sway)).toBeGreaterThan(.06);
      expect(tipPeak.frame - basePeak.frame).toBeGreaterThan(5);
      expect(active.some(pose => Math.abs(pose.flex) > .005 && Math.abs(pose.tipSway) < Math.abs(pose.sway) * .8)).toBe(true);
    } finally { rig.mammals.dispose(); }
  });

  it('lowers into scurrying and settles after stopping without rigid tip motion or abrupt pitch changes', () => {
    const rig = create(), geometry = rig.tail.geometry, positionArray = rig.positions.array;
    try {
      let previous = sample(rig), previousVelocity = 0, scurrySamples = 0, delayedSamples = 0, settledSamples = 0, stopped = 0;
      for (let frame = 0; frame < 8 * 120; frame++) {
        rig.mammals.update(frame / 120, 1 / 120); const current = sample(rig);
        const velocity = (current.pitch - previous.pitch) * 120;
        expect(Math.abs(velocity)).toBeLessThan(3);
        expect(Math.abs(velocity - previousVelocity) * 120).toBeLessThan(22);
        expect(Math.abs(current.sweep)).toBeLessThan(.04);
        if (current.state.behavior === 'Scurrying') {
          if (current.pitch < -.55) scurrySamples++;
          if (Math.abs(current.sweep) > .005) delayedSamples++;
        } else if (scurrySamples > 0 && current.state.behavior === 'Sniffing and searching') {
          stopped++;
          if (stopped > 180) {
            expect(Math.abs(current.pitch)).toBeLessThan(.002);
            expect(Math.abs(current.sweep)).toBeLessThan(.00001); settledSamples++;
          }
        }
        previousVelocity = velocity; previous = current;
      }
      expect(scurrySamples).toBeGreaterThan(35); expect(delayedSamples).toBeGreaterThan(35); expect(settledSamples).toBeGreaterThan(100);
      expect(rig.tail.geometry).toBe(geometry); expect(rig.positions.array).toBe(positionArray);
    } finally { rig.mammals.dispose(); }
  });

  it('lets the tip follow isolated alert flicks while preserving quiet intervals and an unchanged base attachment', () => {
    const rig = create(), observer = { position: new THREE.Vector3(-2.4, 1.65, .5), speed: 0 };
    const base = Array.from(rig.positions.array.slice(0, 3));
    try {
      let flexed = 0, quiet = 0, longestQuiet = 0, previous = sample(rig);
      for (let frame = 0; frame < 12 * 120; frame++) {
        rig.mammals.update(frame / 120, 1 / 120, observer); const current = sample(rig);
        expect(Math.abs(current.sway)).toBeLessThan(.29);
        // A warning flick is brisk; even its flexible tip advances less than
        // 3 mm per fixed tick rather than snapping to a new bend.
        expect(Math.abs(current.flex - previous.flex)).toBeLessThan(.003);
        expect(Array.from(rig.positions.array.slice(0, 3))).toEqual(base);
        if (Math.abs(current.sway) > .08 && Math.abs(current.flex) > .002) flexed++;
        if (Math.abs(current.sway) < .000001 && Math.abs(current.flex) < .000001) quiet++;
        else quiet = 0;
        longestQuiet = Math.max(longestQuiet, quiet); previous = current;
      }
      expect(flexed).toBeGreaterThan(25); expect(longestQuiet).toBeGreaterThan(180);
    } finally { rig.mammals.dispose(); }
  });
});
