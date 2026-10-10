'use strict';

// Run from the project root:
// node reports/bridgelab-guide-energy-2026-10-05/verify-energy-budgets.cjs
// This checks the numerical data and proposed SVG widths, not rendered layout.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = process.cwd();
const sourceRelativePath = 'stem_lab/stem_tool_bridgelab.js';
const sourcePath = path.join(root, sourceRelativePath);
const outputPath = path.join(root, 'reports/bridgelab-guide-energy-2026-10-05/model-invariants.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceSha256 = sha256(source);
const registration = "window.StemLab.registerTool('bridgeLab', {";
assert.equal(source.split(registration).length, 2, 'Expected one Bridge Lab registration');

const sandbox = { window: { StemLab: { registerTool() {} } }, console };
const exportedSource = source.replace(registration, `
  window.guideEnergyModel = {
    bridgeSeismicResponse, bridgeSeismicSample,
    bridgeSeismicEnergyInterval, bridgeSeismicDecayBudget
  };
  ${registration}`);
vm.runInNewContext(exportedSource, sandbox, { filename: sourcePath });
const {
  bridgeSeismicResponse: response,
  bridgeSeismicSample: sample,
  bridgeSeismicEnergyInterval: interval,
  bridgeSeismicDecayBudget: budget
} = sandbox.window.guideEnergyModel;

const modes = ['flexible', 'balanced', 'stiff'];
const dampingRatios = [0, 0.05, 0.2, 0.4];
const frequenciesHz = [0.2, 1.1, 3];
const intensitiesG = [0, 1e-6, 0.12, 0.5];
const endTimesS = [16, 16.003, 21.217, 24];
const energyFields = [
  'initialJPerKg', 'remainingJPerKg', 'dissipatedJPerKg',
  'inputJPerKg', 'balanceErrorJPerKg'
];

function windowCounts() {
  return {
    pairedWindows: 0, trialReadings: 0, energyReadings: 0,
    barRows: 0, barSegments: 0, swappedPairs: 0,
    zeroEnergyWindows: 0, boundaryWindows: 0, undampedTrialReadings: 0
  };
}

const sweepCounts = { cases: 0, beforeShakingEndChecks: 0, ...windowCounts() };
const extraCounts = { pairs: 0, ...windowCounts() };
const amplitudeCounts = { cases: 0, pairedWindows: 0, energyReadings: 0, scaleChecks: 0 };
const diagnostics = {
  maximumAbsoluteBalanceResidualJPerKg: 0,
  maximumBalanceResidualOverToleranceScale: 0,
  maximumAmplitudeErrorOverEventScale: 0,
  positiveEnergyAt16Windows: 0
};

function eventEnergyScale(result) {
  return Math.max(result.peaks.storedJPerKg, result.peaks.inputJPerKg,
    result.peaks.dissipatedJPerKg);
}

function assertNear(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `${label}: finite amounts`);
  assert(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} differs from ${expected} by more than ${tolerance}`);
}

function assertSvgWidth(value, scale, label) {
  const width = value / scale * 400;
  assert(Number.isFinite(width), `${label}: finite SVG width`);
  assert(width >= 0 && width <= 400, `${label}: SVG width ${width} outside 0..400`);
  return width;
}

function checkWindow(reference, current, time, counts, label) {
  const result = budget(reference, current, time);
  assert(result, `${label}: budget exists`);
  assert.equal(result.startTimeS, 16, `${label}: starts at shaking end`);
  assert.equal(result.endTimeS, time, `${label}: preserves inspected time`);
  assert.equal(result.trials.length, 2, `${label}: two trials`);
  counts.pairedWindows++;
  if (time === 16) counts.boundaryWindows++;

  let expectedMaximum = 0;
  [reference, current].forEach((model, index) => {
    const row = result.trials[index];
    const first = sample(model, 16);
    const last = sample(model, time);
    const history = interval(model, 16, time);
    const id = index === 0 ? 'a' : 'b';
    const rowLabel = `${label}, trial ${id}`;
    assert.equal(row.id, id, `${rowLabel}: identity`);
    assert.equal(row.initialJPerKg, first.storedJPerKg, `${rowLabel}: recorded initial energy`);
    assert.equal(row.remainingJPerKg, last.storedJPerKg, `${rowLabel}: recorded remaining energy`);
    assert.equal(row.dissipatedJPerKg, last.dissipatedJPerKg - first.dissipatedJPerKg,
      `${rowLabel}: accumulated interval damping loss`);
    assert.equal(row.inputJPerKg, history.inputJPerKg, `${rowLabel}: recorded input work`);
    assert.equal(row.inputJPerKg, 0, `${rowLabel}: no input after shaking`);
    assert.equal(row.balanceErrorJPerKg, history.balanceErrorJPerKg,
      `${rowLabel}: preserves the helper's residual sign and precision`);
    for (const field of energyFields) {
      assert(Number.isFinite(row[field]), `${rowLabel}: finite ${field}`);
    }
    for (const field of ['initialJPerKg', 'remainingJPerKg', 'dissipatedJPerKg']) {
      assert(row[field] >= 0, `${rowLabel}: nonnegative ${field}`);
    }
    counts.trialReadings++;
    counts.energyReadings += energyFields.length;

    // The floor belongs only to the established numerical-error tolerance.
    // It must not become a floor in the diagram's physical energy range.
    const toleranceScale = Math.max(1, eventEnergyScale(model));
    const balanceTolerance = 1e-5 * toleranceScale;
    assertNear(row.remainingJPerKg + row.dissipatedJPerKg, row.initialJPerKg,
      balanceTolerance, `${rowLabel}: free-vibration energy balance`);
    assert(Math.abs(row.balanceErrorJPerKg) <= balanceTolerance,
      `${rowLabel}: integrated residual within existing interval tolerance`);
    diagnostics.maximumAbsoluteBalanceResidualJPerKg = Math.max(
      diagnostics.maximumAbsoluteBalanceResidualJPerKg, Math.abs(row.balanceErrorJPerKg));
    diagnostics.maximumBalanceResidualOverToleranceScale = Math.max(
      diagnostics.maximumBalanceResidualOverToleranceScale,
      Math.abs(row.balanceErrorJPerKg) / toleranceScale);

    if (time === 16) {
      assert.equal(row.initialJPerKg, row.remainingJPerKg, `${rowLabel}: coincident stored amounts`);
      assert.equal(row.dissipatedJPerKg, 0, `${rowLabel}: zero-length loss`);
      assert.equal(row.balanceErrorJPerKg, 0, `${rowLabel}: zero-length residual`);
    }
    if (model.settings.dampingRatio === 0) {
      counts.undampedTrialReadings++;
      assert.equal(row.dissipatedJPerKg, 0, `${rowLabel}: undamped loss is exactly zero`);
      assertNear(row.remainingJPerKg - row.initialJPerKg, -row.balanceErrorJPerKg,
        8 * Number.EPSILON * toleranceScale, `${rowLabel}: undamped deviation retains residual`);
    }
    expectedMaximum = Math.max(expectedMaximum, row.initialJPerKg,
      row.remainingJPerKg + row.dissipatedJPerKg);
  });

  assert.equal(result.scaleJPerKg, expectedMaximum > 0 ? expectedMaximum : 1,
    `${label}: exact shared range and true-zero fallback`);
  assert.equal(result.hasEnergy, expectedMaximum > 0, `${label}: physical energy availability`);
  if (!result.hasEnergy) counts.zeroEnergyWindows++;
  if (time === 16 && result.hasEnergy) diagnostics.positiveEnergyAt16Windows++;
  for (const row of result.trials) {
    assertSvgWidth(row.initialJPerKg, result.scaleJPerKg, `${label}: initial bar`);
    assertSvgWidth(row.remainingJPerKg + row.dissipatedJPerKg,
      result.scaleJPerKg, `${label}: accounted bar`);
    const remainingWidth = assertSvgWidth(row.remainingJPerKg,
      result.scaleJPerKg, `${label}: remaining segment and loss origin`);
    const lossWidth = assertSvgWidth(row.dissipatedJPerKg,
      result.scaleJPerKg, `${label}: loss segment`);
    // Separate SVG segment arithmetic can differ from the combined width by
    // floating-point roundoff; every individual width above has exact bounds.
    assertNear(remainingWidth + lossWidth,
      (row.remainingJPerKg + row.dissipatedJPerKg) / result.scaleJPerKg * 400,
      8 * Number.EPSILON * 400, `${label}: stacked segments meet`);
    counts.barRows += 2;
    counts.barSegments += 3;
  }

  const reversed = budget(current, reference, time);
  assert.equal(reversed.scaleJPerKg, result.scaleJPerKg, `${label}: swap keeps range`);
  assert.equal(reversed.hasEnergy, result.hasEnergy, `${label}: swap keeps energy status`);
  assert.equal(reversed.endTimeS, result.endTimeS, `${label}: swap keeps time`);
  result.trials.forEach((row, index) => {
    const swapped = reversed.trials[1 - index];
    assert.equal(swapped.id, index === 0 ? 'b' : 'a', `${label}: swapped identity`);
    for (const field of energyFields) {
      assert.equal(swapped[field], row[field], `${label}: swap preserves ${field}`);
    }
  });
  counts.swappedPairs++;
  return result;
}

function makePair(archetype, dampingRatio, groundFrequencyHz, intensityG) {
  const common = { archetype, groundFrequencyHz, intensityG };
  const reference = response({ ...common, dampingRatio: 0.05 });
  const current = dampingRatio === 0.05 ? reference : response({ ...common, dampingRatio });
  return { reference, current };
}

function checkAmplitude(basePair, scaledPair, baseBudget, scaledBudget, ratio, label) {
  const square = ratio * ratio;
  const baseModels = [basePair.reference, basePair.current];
  const scaledModels = [scaledPair.reference, scaledPair.current];
  let pairEventScale = 0;
  scaledBudget.trials.forEach((row, index) => {
    const scale = Math.max(eventEnergyScale(scaledModels[index]), eventEnergyScale(baseModels[index]) * square);
    assert(scale > 0, `${label}: nonzero event scale for amplitude comparison`);
    pairEventScale = Math.max(pairEventScale, scale);
    for (const field of energyFields) {
      const expected = baseBudget.trials[index][field] * square;
      // Condition residuals and very small remaining amounts on event energy,
      // never on their own value, and never on a one-J/kg floor.
      assertNear(row[field], expected, 1e-9 * scale, `${label}: quadratic ${field}`);
      diagnostics.maximumAmplitudeErrorOverEventScale = Math.max(
        diagnostics.maximumAmplitudeErrorOverEventScale, Math.abs(row[field] - expected) / scale);
      amplitudeCounts.energyReadings++;
    }
  });
  assertNear(scaledBudget.scaleJPerKg, baseBudget.scaleJPerKg * square,
    1e-9 * pairEventScale, `${label}: quadratic shared scale`);
  amplitudeCounts.scaleChecks++;
  amplitudeCounts.pairedWindows++;
}

let progress = 0;
for (const archetype of modes) {
  for (const dampingRatio of dampingRatios) {
    for (const groundFrequencyHz of frequenciesHz) {
      const basePair = makePair(archetype, dampingRatio, groundFrequencyHz, 0.12);
      const baseBudgets = endTimesS.map(time => budget(basePair.reference, basePair.current, time));
      for (const intensityG of intensitiesG) {
        const pair = intensityG === 0.12 ? basePair : makePair(archetype, dampingRatio, groundFrequencyHz, intensityG);
        const label = `${archetype}, damping ${dampingRatio}, ${groundFrequencyHz} Hz, ${intensityG} g`;
        sweepCounts.cases++;
        assert.equal(budget(pair.reference, pair.current, 15.999), null, `${label}: excludes shaking interval`);
        sweepCounts.beforeShakingEndChecks++;
        const compareAmplitude = intensityG > 0 && intensityG !== 0.12;
        if (compareAmplitude) amplitudeCounts.cases++;
        endTimesS.forEach((time, index) => {
          const result = checkWindow(pair.reference, pair.current, time, sweepCounts, `${label}, ${time} s`);
          if (compareAmplitude) {
            checkAmplitude(basePair, pair, baseBudgets[index], result, intensityG / 0.12, `${label}, ${time} s`);
          }
        });
      }
    }
    console.log(`[${++progress}/12] ${archetype}, damping ${dampingRatio}: ${sweepCounts.cases} cases checked`);
  }
}

const zero = response({ intensityG: 0 });
const tiny = response({ intensityG: 1e-6, dampingRatio: 0.2 });
const ordinary = response({ intensityG: 0.12, dampingRatio: 0.05 });
const extraPairs = [
  { label: 'zero versus tiny', reference: zero, current: tiny },
  { label: 'ordinary versus tiny', reference: ordinary, current: tiny },
  { label: 'true zero pair', reference: zero, current: zero },
  { label: 'unequal modes, amplitudes and shaking',
    reference: response({ archetype: 'flexible', groundFrequencyHz: 0.2, intensityG: 0.5, dampingRatio: 0 }),
    current: response({ archetype: 'stiff', groundFrequencyHz: 3, intensityG: 1e-6, dampingRatio: 0.4 }) }
];
for (const pair of extraPairs) {
  extraCounts.pairs++;
  for (const time of endTimesS) {
    const result = checkWindow(pair.reference, pair.current, time, extraCounts, `${pair.label}, ${time} s`);
    if (pair.label === 'zero versus tiny') {
      const tinyOnly = budget(tiny, tiny, time);
      assert.equal(result.scaleJPerKg, tinyOnly.scaleJPerKg, 'Zero reference must not impose a scale floor');
      assert(result.scaleJPerKg > 0 && result.scaleJPerKg < 0.001, 'Tiny positive range stays physically small');
    }
  }
}

let invalidInputChecks = 0;
for (const time of [NaN, Infinity, undefined, null, '', 'invalid', {}, []]) {
  assert.equal(budget(ordinary, tiny, time), null, 'Invalid time has no decay budget');
  invalidInputChecks++;
}
for (const missing of [null, undefined, { samples: [] }]) {
  assert.equal(budget(missing, ordinary, 24), null, 'Missing reference has no budget');
  assert.equal(budget(ordinary, missing, 24), null, 'Missing current trial has no budget');
  invalidInputChecks += 2;
}
assert.deepEqual(budget(ordinary, tiny, 99), budget(ordinary, tiny, 24), 'Late time clamps to observation end');
assert.deepEqual(budget(ordinary, tiny, '21.217'), budget(ordinary, tiny, 21.217), 'Numeric time matches shared sampler');

const expectedCases = modes.length * dampingRatios.length * frequenciesHz.length * intensitiesG.length;
const expectedWindows = expectedCases * endTimesS.length;
assert.equal(sweepCounts.cases, 144);
assert.equal(sweepCounts.cases, expectedCases);
assert.equal(sweepCounts.pairedWindows, 576);
assert.equal(sweepCounts.pairedWindows, expectedWindows);
assert.equal(sweepCounts.beforeShakingEndChecks, expectedCases);
for (const counts of [sweepCounts, extraCounts]) {
  assert.equal(counts.trialReadings, counts.pairedWindows * 2);
  assert.equal(counts.energyReadings, counts.pairedWindows * 2 * energyFields.length);
  assert.equal(counts.barRows, counts.pairedWindows * 4);
  assert.equal(counts.barSegments, counts.pairedWindows * 6);
  assert.equal(counts.swappedPairs, counts.pairedWindows);
}
assert.equal(extraCounts.pairs, 4);
assert.equal(extraCounts.pairedWindows, 16);
assert.equal(amplitudeCounts.cases, 72);
assert.equal(amplitudeCounts.pairedWindows, 288);
assert.equal(amplitudeCounts.energyReadings, 2880);
assert.equal(amplitudeCounts.scaleChecks, 288);
assert(diagnostics.positiveEnergyAt16Windows > 0, 'Shaking can end with stored energy still present');

// Do not attach successful results to a source that changed during the sweep.
assert.equal(sha256(fs.readFileSync(sourcePath, 'utf8')), sourceSha256,
  'Bridge source changed during verification; rerun before saving evidence');
const result = {
  status: 'passed',
  generatedAt: new Date().toISOString(),
  sourcePath: sourceRelativePath,
  sourceSha256,
  grid: { modes, dampingRatios, frequenciesHz, intensitiesG, endTimesS },
  counts: { sweep: sweepCounts, extraPairs: extraCounts, amplitude: amplitudeCounts,
    invalidInputChecks, samplerCompatibilityChecks: 2 },
  countScope: 'Window/readout/bar counts describe forward budgets; swapped-pair and amplitude checks are counted separately. Each bar pair has an initial row and an accounted row with two segments.',
  tolerances: { energyBalance: '1e-5 * max(1, event energy in J/kg)',
    amplitude: '1e-9 * scaled event energy; no one-J/kg floor and no residual-relative division',
    stackedWidthRoundoff: '8 * Number.EPSILON * 400; individual SVG widths retain exact 0..400 bounds' },
  diagnostics,
  scope: 'Numerical helper and SVG width arithmetic only. Unit interactions and browser checks verify labels, rendering, printing and layout separately.'
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(`Passed: ${sweepCounts.cases} cases, ${sweepCounts.pairedWindows} main windows, ${extraCounts.pairedWindows} extra windows. Wrote ${path.relative(root, outputPath)}.`);
