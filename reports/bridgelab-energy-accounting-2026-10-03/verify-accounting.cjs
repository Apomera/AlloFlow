const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const source = fs.readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {}, warn() {} } };
const anchor = "window.StemLab.registerTool('bridgeLab', {";
assert(source.includes(anchor));
vm.runInNewContext(source.replace(anchor,
  'window.accountingModel = { bridgeSeismicResponse, bridgeSeismicEnergyAccounting, BRIDGE_RESPONSE_ARCHETYPES };' + anchor), sandbox);
const { bridgeSeismicResponse: response, bridgeSeismicEnergyAccounting: accounting, BRIDGE_RESPONSE_ARCHETYPES: modes } = sandbox.window.accountingModel;
assert.equal(accounting(null, 0), null);
let snapshots = 0, experiments = 0, decayChecks = 0, amplitudeChecks = 0;
for (const mode of modes) {
  for (const dampingRatio of [0, 0.05, 0.2, 0.4]) {
    const byIntensity = new Map();
    for (const intensityG of [0, 0.000001, 0.12, 0.5]) {
      const r = response({ archetype: mode.id, groundFrequencyHz: 1.1, dampingRatio, intensityG });
      experiments++;
      const records = [0, 7.217, 16, 24].map(time => accounting(r, time));
      const scale = records[0].scaleJPerKg;
      for (const record of records) {
        snapshots++;
        const p = record.point;
        assert(Number.isFinite(scale) && scale > 0);
        assert.equal(record.scaleJPerKg, scale);
        assert(record.eventMaximumJPerKg >= p.inputJPerKg - 1e-12);
        assert(record.eventMaximumJPerKg >= record.accountedJPerKg - 1e-12);
        assert(Math.abs(p.inputJPerKg - record.accountedJPerKg) < 1e-5 * Math.max(1, record.eventMaximumJPerKg));
        assert.equal(record.recordedDifferenceJPerKg, p.energyBalanceErrorJPerKg);
        assert(Math.abs(record.recordedDifferenceJPerKg - (p.inputJPerKg - record.accountedJPerKg)) < 1e-12 * Math.max(1, record.eventMaximumJPerKg));
        if (intensityG === 0) {
          assert.equal(record.eventMaximumJPerKg, 0);
          assert.equal(p.inputJPerKg, 0);
          assert.equal(record.accountedJPerKg, 0);
        }
      }
      const start = records[2].point, end = records[3].point;
      assert.equal(end.inputJPerKg, start.inputJPerKg);
      assert(end.dissipatedJPerKg >= start.dissipatedJPerKg);
      if (dampingRatio === 0) {
        assert.equal(end.dissipatedJPerKg, 0);
        assert(Math.abs(end.storedJPerKg - start.storedJPerKg) < 1e-5 * Math.max(1, scale));
      } else if (intensityG > 0) {
        assert(end.storedJPerKg < start.storedJPerKg);
        assert(end.dissipatedJPerKg > start.dissipatedJPerKg);
      }
      decayChecks++;
      byIntensity.set(intensityG, records);
    }
    const small = byIntensity.get(0.000001), ordinary = byIntensity.get(0.12);
    const ratio = (0.000001 / 0.12) ** 2;
    assert(Math.abs(small[0].scaleJPerKg / ordinary[0].scaleJPerKg / ratio - 1) < 1e-10);
    assert(small[0].eventMaximumJPerKg > 0 && small[0].eventMaximumJPerKg < 0.001);
    for (let i = 1; i < ordinary.length; i++) {
      assert(Math.abs(small[i].point.inputJPerKg / small[i].scaleJPerKg - ordinary[i].point.inputJPerKg / ordinary[i].scaleJPerKg) < 1e-10);
    }
    amplitudeChecks++;
  }
}
const result = { status: 'passed', sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), inputCombinations: experiments, accountingSnapshots: snapshots,
  freeVibrationChecks: decayChecks, amplitudeScalingChecks: amplitudeChecks,
  scope: 'Current recorded energy; fixed scale; conservation within numerical tolerance; zero and tiny input; damping and zero damping after shaking.' };
fs.writeFileSync('reports/bridgelab-energy-accounting-2026-10-03/accounting-invariants.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
