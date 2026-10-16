import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope = {};
new Function('window', readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8'))(scope);
const perches = [new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(6, 3, -4), new THREE.Vector3(-5, 3.4, -3)];
function departure() {
  const hawk = scope.BirdLab3D.createFreeHawk(perches, -.18);
  for (let i = 0; i < 4000 && hawk.state.phase !== 'takeoff'; i++) hawk.update(.01, null);
  expect(hawk.state.phase).toBe('takeoff');
  return hawk;
}
describe('Free hawk coordinated turns', () => {
  it('banks with measured path curvature and releases roll trim near a steady bank', () => {
    const hawk = departure(), frames = [], dt = 1 / 240;
    for (let i = 0; i < 240 * 8 && hawk.state.phase !== 'settling'; i++) {
      const s = hawk.update(dt, null);
      frames.push({ velocity: s.velocity.slice(), bank: s.bank, roll: s.pose.rollControl, support: s.pose.wingSupport });
    }
    let evaluated = 0, maximumBank = 0, strongestEntry = 0, quietAtPeak = Infinity;
    for (let i = 1; i < frames.length - 1; i++) {
      const a = frames[i - 1], b = frames[i], c = frames[i + 1];
      const [vx, , vz] = b.velocity, speed = Math.hypot(vx, vz);
      if (speed < .3) continue;
      const ax = (c.velocity[0] - a.velocity[0]) / (2 * dt), az = (c.velocity[2] - a.velocity[2]) / (2 * dt);
      const expected = Math.max(-.38, Math.min(.38, Math.atan2((vz * ax - vx * az) / speed, 9.81)));
      expect(b.bank).toBeCloseTo(expected, 4);
      const rate = (c.bank - a.bank) / (2 * dt);
      if (b.support > .1 && Math.abs(rate) > .01) expect(Math.sign(b.roll)).toBe(Math.sign(rate));
      if (b.support > .1 && Math.abs(rate) < .003) quietAtPeak = Math.min(quietAtPeak, Math.abs(b.roll));
      strongestEntry = Math.max(strongestEntry, Math.abs(b.roll));
      maximumBank = Math.max(maximumBank, Math.abs(b.bank)); evaluated++;
    }
    expect(evaluated).toBeGreaterThan(300);
    // This seeded first departure is a gentle curve, not a steep turn.
    expect(maximumBank).toBeGreaterThan(.01);
    expect(strongestEntry).toBeGreaterThan(0);
    expect(quietAtPeak).toBeLessThan(strongestEntry * .25);
  });
  it('uses the same banking and trim at different frame rates, freezes while paused, and joins landing smoothly', () => {
    const a = departure(), b = departure();
    let previousBank = 0, largestStep = 0, hadFlight = false;
    for (let i = 0; i < 240; i++) {
      const sa = a.update(1 / 30, null);
      b.update(1 / 60, null); const sb = b.update(1 / 60, null);
      if (sa.airspeed > .1 && sb.airspeed > .1) {
        expect(sa.bank).toBeCloseTo(sb.bank, 10);
        expect(sa.pose.rollControl).toBeCloseTo(sb.pose.rollControl, 10);
        hadFlight = true;
      }
      largestStep = Math.max(largestStep, Math.abs(sa.bank - previousBank)); previousBank = sa.bank;
      const held = JSON.stringify(sa); a.update(0, { position: new THREE.Vector3(0, 1.7, 0), speed: 2 });
      expect(JSON.stringify(a.state)).toBe(held);
      if (sa.phase === 'settling') { expect(Math.abs(sa.bank)).toBeLessThan(1e-8); break; }
    }
    expect(hadFlight).toBe(true); expect(largestStep).toBeLessThan(.025);
  });
});
