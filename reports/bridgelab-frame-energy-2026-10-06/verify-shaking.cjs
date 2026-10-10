'use strict';

// Standalone model verification. Resolve the project from this report folder,
// expose the fresh canonical source in a VM, and leave product/tests untouched.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const projectRoot = path.resolve(__dirname, '../..');
const sourcePath = path.join(projectRoot, 'stem_lab/stem_tool_bridgelab.js');
const reportPath = path.join(__dirname, 'model-invariants.json');
const sourceBytes = fs.readFileSync(sourcePath);
const source = sourceBytes.toString('utf8');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceSha256 = sha(sourceBytes);
const snapshot = value => sha(JSON.stringify(value));
const anchor = "window.StemLab.registerTool('bridgeLab', {";
assert.equal(source.split(anchor).length, 2, 'Expected one tool registration anchor');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {}, warn() {} } };
vm.runInNewContext(source.replace(anchor,
  'window.shakingModel={bridgeSeismicResponse,bridgeSeismicShakingBudget,BRIDGE_RESPONSE_ARCHETYPES};' + anchor),
  sandbox, { filename: sourcePath });
const { bridgeSeismicResponse: response, bridgeSeismicShakingBudget: budget,
  BRIDGE_RESPONSE_ARCHETYPES: modes } = sandbox.window.shakingModel;
const frequencies = [0.2, 0.65, 1.1, 3];
const intensities = [0, 1e-6, 0.12];
const dampingRatios = [0, 0.05, 0.2, 0.4];
const fields = ['initialJPerKg', 'inputJPerKg', 'dissipatedJPerKg', 'storedJPerKg', 'balanceErrorJPerKg'];
const counts = { configurations: 0, endpointTrialChecks: 0, exactFieldChecks: 0,
  zeroConfigurationChecks: 0, undampedConfigurationChecks: 0, controlledPairChecks: 0,
  groundValueChecks: 0, nonzeroControlledPairChecks: 0, meaningfullyDifferentWorkPairs: 0,
  reversedPairChecks: 0, amplitudeScalingChecks: 0, scaledFieldChecks: 0, tinyEventScalingChecks: 0, immutabilityChecks: 0 };
const pairEvidence = [];
const nonpositiveNetWorkCases = [];
let currentCase = '', maximumAbsoluteResidualJPerKg = 0, maximumRelativeResidual = 0;
const scalingTolerance = 1e-9;

function endpoints(r) {
  const initial = r.samples.find(point => point.timeS === 0);
  const end = r.samples.find(point => point.timeS === 16);
  assert(initial && end, currentCase + ': exact recorded endpoints');
  const work = end.inputJPerKg - initial.inputJPerKg;
  const loss = end.dissipatedJPerKg - initial.dissipatedJPerKg;
  return { initialJPerKg: initial.storedJPerKg, inputJPerKg: work,
    dissipatedJPerKg: loss, storedJPerKg: end.storedJPerKg,
    balanceErrorJPerKg: work - (end.storedJPerKg - initial.storedJPerKg) - loss };
}

function checkPairFields(a, b) {
  const result = budget(a, b);
  assert(result, currentCase + ': valid budget');
  assert.equal(result.startTimeS, 0);
  assert.equal(result.endTimeS, 16);
  assert.equal(result.trials.length, 2);
  for (const [index, model] of [a, b].entries()) {
    const expected = endpoints(model), trial = result.trials[index];
    assert.equal(trial.id, index === 0 ? 'a' : 'b');
    for (const field of fields) {
      assert(Number.isFinite(trial[field]), currentCase + ': finite ' + field);
      assert.equal(trial[field], expected[field], currentCase + ': recorded endpoint ' + field);
      counts.exactFieldChecks++;
    }
    counts.endpointTrialChecks++;
  }
  return result;
}

function verify() {
  assert.equal(modes.length, 3);
  for (const mode of modes) for (const groundFrequencyHz of frequencies) {
    // Retain only this mode/frequency group. Full snapshots are hashes, so
    // immutability checks do not retain large serialized response strings.
    const group = new Map(), before = new Map();
    for (const intensityG of intensities) for (const dampingRatio of dampingRatios) {
      currentCase = JSON.stringify({ archetype: mode.id, groundFrequencyHz, intensityG, dampingRatio });
      const r = response({ archetype: mode.id, groundFrequencyHz, intensityG, dampingRatio });
      const key = intensityG + '|' + dampingRatio;
      group.set(key, r);
      before.set(key, snapshot(r));
      assert.equal(r.samples.length, 1441, currentCase + ': recorded sample count');
      const result = checkPairFields(r, r), trial = result.trials[0];
      if (intensityG > 0 && trial.inputJPerKg <= 0) nonpositiveNetWorkCases.push({
        archetype: mode.id, groundFrequencyHz, intensityG, dampingRatio,
        inputJPerKg: trial.inputJPerKg, storedJPerKg: trial.storedJPerKg,
        balanceErrorJPerKg: trial.balanceErrorJPerKg });
      maximumAbsoluteResidualJPerKg = Math.max(maximumAbsoluteResidualJPerKg, Math.abs(trial.balanceErrorJPerKg));
      const amountScale = Math.max(Math.abs(trial.initialJPerKg), Math.abs(trial.inputJPerKg),
        Math.abs(trial.dissipatedJPerKg), Math.abs(trial.storedJPerKg));
      if (amountScale > 0) maximumRelativeResidual = Math.max(maximumRelativeResidual, Math.abs(trial.balanceErrorJPerKg) / amountScale);
      if (intensityG === 0) {
        for (const field of fields) assert.equal(trial[field], 0, currentCase + ': zero ' + field);
        counts.zeroConfigurationChecks++;
      }
      if (dampingRatio === 0) {
        assert.equal(trial.dissipatedJPerKg, 0, currentCase + ': no viscous loss');
        counts.undampedConfigurationChecks++;
      }
      counts.configurations++;
    }
    for (const intensityG of intensities) {
      currentCase = JSON.stringify({ archetype: mode.id, groundFrequencyHz, intensityG, pair: '5% / 20%' });
      const a = group.get(intensityG + '|0.05'), b = group.get(intensityG + '|0.2');
      const forward = checkPairFields(a, b), reversed = checkPairFields(b, a);
      for (let i = 0; i < a.samples.length; i++) {
        for (const field of ['groundM', 'groundVelocityMps', 'groundAccelerationMps2']) {
          assert.equal(a.samples[i][field], b.samples[i][field], currentCase + ': identical forcing ' + field);
          counts.groundValueChecks++;
        }
      }
      for (const field of fields) {
        assert.equal(forward.trials[0][field], reversed.trials[1][field], currentCase + ': reversed A');
        assert.equal(forward.trials[1][field], reversed.trials[0][field], currentCase + ': reversed B');
      }
      const workA = forward.trials[0].inputJPerKg, workB = forward.trials[1].inputJPerKg;
      const difference = workB - workA, workScale = Math.max(Math.abs(workA), Math.abs(workB));
      const meaningfullyDifferent = workScale > 0 && Math.abs(difference) > workScale * scalingTolerance;
      // Record every pair; do not assert a universal ranking at every forcing
      // frequency or turn numerical roundoff into a meaningful difference.
      pairEvidence.push({ archetype: mode.id, groundFrequencyHz, intensityG,
        inputA_JPerKg: workA, inputB_JPerKg: workB, differenceBminusA_JPerKg: difference,
        relativeDifference: workScale > 0 ? difference / workScale : null, meaningfullyDifferent });
      if (intensityG > 0) counts.nonzeroControlledPairChecks++;
      if (meaningfullyDifferent) counts.meaningfullyDifferentWorkPairs++;
      counts.controlledPairChecks++;
      counts.reversedPairChecks++;
    }
    for (const dampingRatio of dampingRatios) {
      currentCase = JSON.stringify({ archetype: mode.id, groundFrequencyHz, dampingRatio, scaling: '0.12 g to 1e-6 g' });
      const ordinary = group.get('0.12|' + dampingRatio), tiny = group.get('0.000001|' + dampingRatio);
      const [a, b] = checkPairFields(ordinary, tiny).trials;
      const ratioSquared = (1e-6 / 0.12) ** 2;
      let eventScale = 0, tinyEventScale = 0;
      for (const point of ordinary.samples) for (const field of ['inputJPerKg', 'dissipatedJPerKg', 'storedJPerKg']) {
        eventScale = Math.max(eventScale, Math.abs(point[field]));
      }
      for (const point of tiny.samples) for (const field of ['inputJPerKg', 'dissipatedJPerKg', 'storedJPerKg']) {
        tinyEventScale = Math.max(tinyEventScale, Math.abs(point[field]));
      }
      const expectedScale = eventScale * ratioSquared;
      assert(expectedScale > 0, currentCase + ': nonzero event scale');
      assert(tinyEventScale > 0 && tinyEventScale < 0.001, currentCase + ': tiny event retained without a floor');
      assert(Math.abs(tinyEventScale - expectedScale) <= scalingTolerance * expectedScale,
        currentCase + ': quadratic full-event energy maximum');
      counts.tinyEventScalingChecks++;
      for (const field of fields) {
        const error = Math.abs(b[field] - a[field] * ratioSquared);
        assert(error <= scalingTolerance * expectedScale, currentCase + ': quadratic ' + field + ', error=' + error);
        counts.scaledFieldChecks++;
      }
      // Net work retains its signed recorded endpoint value. An undamped
      // event can nearly cancel, so do not impose positivity on its residual
      // accumulated work; the independent event-scale check guards no floor.
      assert(Math.abs(b.inputJPerKg) < 0.001, currentCase + ': tiny signed work retained');
      assert(b.storedJPerKg > 0 && b.storedJPerKg < 0.001, currentCase + ': tiny stored energy retained');
      if (dampingRatio === 0) assert.equal(b.dissipatedJPerKg, 0);
      else assert(b.dissipatedJPerKg > 0 && b.dissipatedJPerKg < 0.001, currentCase + ': tiny loss retained');
      counts.amplitudeScalingChecks++;
    }
    for (const [key, r] of group) {
      assert.equal(snapshot(r), before.get(key), currentCase + ': response mutated ' + key);
      counts.immutabilityChecks++;
    }
  }
  assert.equal(counts.configurations, 144);
  assert.equal(counts.zeroConfigurationChecks, 48);
  assert.equal(counts.undampedConfigurationChecks, 36);
  assert.equal(counts.controlledPairChecks, 36);
  assert.equal(counts.nonzeroControlledPairChecks, 24);
  assert.equal(counts.groundValueChecks, 36 * 1441 * 3);
  assert.equal(counts.amplitudeScalingChecks, 48);
  assert.equal(counts.scaledFieldChecks, 240);
  assert.equal(counts.tinyEventScalingChecks, 48);
  assert.equal(counts.immutabilityChecks, 144);
  assert(counts.meaningfullyDifferentWorkPairs > 0, 'Controlled pairs must demonstrate different work');
  assert(pairEvidence.some(pair => pair.archetype === 'balanced' && pair.groundFrequencyHz === 1.1
    && pair.intensityG === 0.12 && pair.meaningfullyDifferent), 'Representative resonant comparison');
  assert.equal(sha(fs.readFileSync(sourcePath)), sourceSha256, 'Canonical source changed during verification');
}

try {
  verify();
  const result = { status: 'passed', sourceSha256, nodeVersion: process.version,
    matrix: { modes: Array.from(modes, mode => mode.id), frequencies, intensities, dampingRatios },
    ...counts, maximumAbsoluteResidualJPerKg, maximumRelativeResidual,
    scalingToleranceRelativeToFullEvent: scalingTolerance,
    scalingScope: 'Five endpoint budget fields and full-event maximum energy magnitude; net input work remains signed, including cancellation residuals.',
    residualConvention: 'input work - (stored at 16 s - stored at 0 s) - damping loss',
    nonpositiveNetWorkCases, controlledPairs: pairEvidence };
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ status: result.status, sourceSha256, ...counts }, null, 2));
} catch (error) {
  fs.writeFileSync(reportPath, JSON.stringify({ status: 'failed', sourceSha256, currentCase,
    ...counts, error: error.stack || String(error) }, null, 2) + '\n');
  console.error(error.stack || error);
  process.exitCode = 1;
}
