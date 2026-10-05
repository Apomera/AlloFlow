const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const repo = path.resolve(__dirname, '../..');
const localRequire = createRequire(path.join(repo, 'package.json'));
const { JSDOM } = localRequire('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
const source = fs.readFileSync(path.join(repo, 'stem_lab/stem_tool_moonmission.js'));
dom.window.StemLab = { registerTool() {} };
vm.runInNewContext(source.toString('utf8'), { window: dom.window, document: dom.window.document, console });
const P = dom.window.MoonMissionPure;
assert(P && P.descentEnergy);
const state = extra => ({ alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0, ...extra });
const energy = s => P.descentEnergy(s).current.total;
const coasts = [];
for (const alt of [3, 300, 5000]) for (const vVel of [-40, -9, 20]) {
  const initial = state({ alt, vVel, hVel: vVel / 3, fuel: vVel === -40 ? 0 : 110 });
  const s = { ...initial }, start = energy(s); let maxError = 0, steps = 0;
  while (!s.contact && steps < 60000) {
    P.descentStep(s, {}, 1 / 60); maxError = Math.max(maxError, Math.abs(energy(s) - start)); steps++;
  }
  assert(s.contact); assert(maxError < 0.001); assert.equal(s.hVel, initial.hVel);
  coasts.push({ initial, contactTime: s.elapsed, steps, maxAbsoluteEnergyErrorJPerKg: maxError });
}
const derivatives = [];
for (const fuel of [.05, 110, 4000]) for (const thrust of [0, .4, 1]) for (const tilt of [-.35, 0, .35]) for (const vVel of [-30, 0, 20]) {
  const s = state({ alt: 1200, fuel, thrust, tilt, vVel, hVel: -12 });
  const measured = P.descentEnergy(s), next = { ...s }, dt = 1e-6;
  P.descentStep(next, { throttle: thrust, left: tilt < 0, right: tilt > 0 }, dt);
  const numericalPower = (energy(next) - measured.current.total) / dt;
  const error = Math.abs(numericalPower - measured.power.total);
  assert(error < .002);
  derivatives.push({ fuel, thrust, tilt, vVel, specificEnginePowerWPerKg: measured.power.total,
    finiteDifferencePowerWPerKg: numericalPower, absoluteErrorWPerKg: error });
}
const s = state({ alt: 1200 }), recording = P.newDescentRecording(); P.recordDescent(recording, s, true);
let integratedPower = 0, maxWorkError = 0, steps = 0; const initialEnergy = energy(s), dt = 1 / 120;
while (s.elapsed < 12 && !s.contact) {
  const before = P.descentEnergy(s);
  const commands = s.elapsed < 2 ? {} : s.elapsed < 5 ? { throttle: .8, left: true } : s.elapsed < 9 ? { throttle: .5, right: true } : {};
  P.descentStep(s, commands, dt); const after = P.descentEnergy(s);
  assert(after.power);
  integratedPower += (before.power.total + after.power.total) / 2 * dt;
  maxWorkError = Math.max(maxWorkError, Math.abs(after.current.total - initialEnergy - integratedPower));
  P.recordDescent(recording, s, false); steps++;
}
assert(maxWorkError < .02);
const beforeInputs = JSON.stringify([s, recording]);
const model = P.descentEnergy(s, recording), geometry = P.descentEnergyGeometry(model);
assert.equal(JSON.stringify([s, recording]), beforeInputs);
let maxGeometryRoundTripError = 0;
for (const curve of Object.values(geometry.curves)) for (const point of curve.points) {
  assert(point.time <= s.elapsed); assert(point.x >= 20 && point.x <= 420); assert(point.y >= 20 && point.y <= 200);
  maxGeometryRoundTripError = Math.max(maxGeometryRoundTripError, Math.abs((200 - point.y) / 180 * geometry.range - point.value));
}
const at = recording.samples[6], replay = { alt: at.alt, vVel: at.v, hVel: at.h, fuel: at.fuel, thrust: at.throttle, tilt: at.tilt, elapsed: at.t, x: at.x };
const original = JSON.stringify(P.descentEnergyGeometry(P.descentEnergy(replay, recording)));
const modified = JSON.parse(JSON.stringify(recording));
modified.samples.filter(p => p.t > at.t).forEach(p => { p.alt = 99999; p.v = 4000; p.h = -4000; });
assert.equal(JSON.stringify(P.descentEnergyGeometry(P.descentEnergy(replay, modified))), original);
const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  coasts, derivativeCases: derivatives, workBalance: { duration: s.elapsed, steps, integratedPowerJPerKg: integratedPower,
    measuredEnergyChangeJPerKg: energy(s) - initialEnergy, maxAbsoluteErrorJPerKg: maxWorkError },
  geometry: { samples: model.history.samples.length, maxRoundTripErrorJPerKg: maxGeometryRoundTripError,
    futureSamplesCannotChangeScaleOrCurves: true, stateAndRecordingUnchanged: true },
  maxCoastErrorJPerKg: Math.max(...coasts.map(p => p.maxAbsoluteEnergyErrorJPerKg)),
  maxDerivativeErrorWPerKg: Math.max(...derivatives.map(p => p.absoluteErrorWPerKg)) };
fs.writeFileSync(path.join(repo, 'reports/moon-mission-enhancement-pass22-2026-10-04/physics-probe.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ coastCases: coasts.length, derivativeCases: derivatives.length, maxCoastErrorJPerKg: report.maxCoastErrorJPerKg,
  maxDerivativeErrorWPerKg: report.maxDerivativeErrorWPerKg, maxWorkBalanceErrorJPerKg: maxWorkError, maxGeometryRoundTripError }));
dom.window.close();
