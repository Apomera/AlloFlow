const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '../..');
const { JSDOM } = createRequire(path.join(repo, 'package.json'))('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
dom.window.StemLab = { registerTool() {} };
const source = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_moonmission.js'));
vm.runInNewContext(source.toString('utf8'), { window: dom.window, document: dom.window.document, console });
const P = dom.window.MoonMissionPure, cases = [];
let maxEnergyError = 0, maxAccelerationError = 0, inspected = 0;
for (const count of [12, 90, 220, 256]) {
  const pool = P.newDescentDust(count); let peak = 0, maxLife = 0;
  for (let i = 0; i <= 60 * 30; i++) {
    const time = i / 60, thrust = time < 5 ? .7 : time < 7 ? 0 : time < 15 ? .8 : 0;
    const state = { alt: 12, vVel: -1, hVel: 4, fuel: 100, thrust, tilt: time < 10 ? .2 : -.3, x: 4 * time, elapsed: time };
    const before = JSON.stringify(state); P.stepDescentDust(pool, state); assert.equal(JSON.stringify(state), before);
    const particles = P.sampleDescentDust(pool, time); peak = Math.max(peak, particles.length); assert(particles.length <= count);
    for (const p of particles) {
      const origin = pool.grains.find(q => q && q.id === p.id); assert(origin); maxLife = Math.max(maxLife, origin.life);
      const energy = (origin.vx ** 2 + origin.vz ** 2 + p.verticalSpeed ** 2) / 2 + P.descentDust.gravity * p.height;
      const initial = (origin.vx ** 2 + origin.vz ** 2 + origin.vy ** 2) / 2 + P.descentDust.gravity * P.descentDust.initialHeight;
      maxEnergyError = Math.max(maxEnergyError, Math.abs(energy - initial)); assert(p.height >= 0);
      if (p.age > .01 && p.age < p.life - .01 && i % 60 === 0) {
        const dt = .0001;
        const before = P.sampleDescentDust(pool, time - dt).find(q => q.id === p.id), after = P.sampleDescentDust(pool, time + dt).find(q => q.id === p.id);
        const acceleration = (after.height - 2 * p.height + before.height) / (dt * dt);
        maxAccelerationError = Math.max(maxAccelerationError, Math.abs(acceleration + 1.624));
      }
      inspected++;
    }
  }
  assert.equal(P.sampleDescentDust(pool, 30).length, 0); assert(maxLife < P.descentDust.cycle);
  cases.push({ capacity: count, steps: 1801, peakLiveGrains: peak, births: pool.serial, maxPhysicalLifetimeSeconds: maxLife, settledAtEnd: true });
}
assert(maxEnergyError < 1e-9); assert(maxAccelerationError < 1e-6);
const base = { alt: 24, vVel: -4, hVel: 4, fuel: 110, thrust: .3, tilt: .2, x: 0, elapsed: 0 };
const actual = { ...base }, original = { ...base }, pool = P.newDescentDust(); let steps = 0;
while (!actual.contact && steps++ < 3000) {
  P.descentStep(actual, {}, 1 / 60); P.stepDescentDust(pool, actual); P.sampleDescentDust(pool, actual.elapsed);
  P.descentStep(original, {}, 1 / 60); assert.deepEqual(actual, original);
}
assert(actual.contact);
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), cases, inspectedParticleStates: inspected,
  maxSpecificEnergyErrorJPerKg: maxEnergyError, maxFiniteDifferenceGravityErrorMPerSecSquared: maxAccelerationError,
  originalFlightPreservedAtEveryStep: true, originalFlightComparisonSteps: steps, contact: actual,
  illustrativeEmissionSpeedsMPerSec: [15, 40], illustrativeElevationDegrees: [1, 2.5], quantitativePlumeModel: false,
  sources: ['https://ntrs.nasa.gov/citations/20130012063', 'https://ntrs.nasa.gov/citations/20090022233'] };
fs.writeFileSync(path.join(repo, 'reports/moon-mission-enhancement-pass23-2026-10-04/physics-probe.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ cases: cases.length, inspectedParticleStates: inspected, maxSpecificEnergyErrorJPerKg: maxEnergyError,
  maxFiniteDifferenceGravityErrorMPerSecSquared: maxAccelerationError, originalFlightPreservedAtEveryStep: true }));
dom.window.close();
