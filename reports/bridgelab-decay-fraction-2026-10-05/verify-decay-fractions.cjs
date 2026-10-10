'use strict';

// Run from the project root:
// node reports/bridgelab-decay-fraction-2026-10-05/verify-decay-fractions.cjs
// Numerical data and bar arithmetic only; browser checks cover rendered UI.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = process.cwd();
const sourceRelativePath = 'stem_lab/stem_tool_bridgelab.js';
const sourcePath = path.join(root, sourceRelativePath);
const outputPath = path.join(root, 'reports/bridgelab-decay-fraction-2026-10-05/model-invariants.json');
const source = fs.readFileSync(sourcePath, 'utf8');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceSha256 = sha256(source);
const registration = "window.StemLab.registerTool('bridgeLab', {";
assert.equal(source.split(registration).length, 2, 'Expected one Bridge Lab registration');
const sandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(source.replace(registration, `
  window.decayFractionModel = {
    bridgeSeismicResponse, bridgeSeismicSample, bridgeSeismicEnergyInterval,
    bridgeSeismicDecayBudget, bridgeSeismicDecayFractions
  };
  ${registration}`), sandbox, { filename: sourcePath });
const {
  bridgeSeismicResponse: response, bridgeSeismicSample: sample,
  bridgeSeismicEnergyInterval: interval, bridgeSeismicDecayBudget: budget,
  bridgeSeismicDecayFractions: fractions
} = sandbox.window.decayFractionModel;

const modes = ['flexible', 'balanced', 'stiff'];
const dampingRatios = [0, 0.05, 0.2, 0.4];
const frequenciesHz = [0.2, 1.1, 3];
const intensitiesG = [0, 1e-6, 0.12, 0.5];
const endTimesS = [16, 16.003, 21.217, 24];
const readingFields = ['id', 'initialJPerKg', 'remainingJPerKg', 'remainingFraction'];

function freshCounts() {
  return { windows: 0, trialReadings: 0, definedFractions: 0, undefinedFractions: 0,
    fractionBarWidths: 0, referenceWidths: 0, orderReversals: 0, purityChecks: 0 };
}
const sweepCounts = { configurations: 0, before16Checks: 0, ...freshCounts() };
const extraCounts = { pairs: 0, ...freshCounts() };
const syntheticCounts = { cases: 0, ...freshCounts() };
const amplitudeCounts = { configurations: 0, windows: 0, fractionReadings: 0, scaleChecks: 0 };
const diagnostics = { largestFraction: 0, smallestPositiveInitialJPerKg: null,
  maximumAmplitudeDifferenceOverFractionScale: 0 };

function assertNear(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual) && Number.isFinite(expected), `${label}: finite values`);
  assert(Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} differs from ${expected} by more than ${tolerance}`);
}

function recordedRows(reference, current, time) {
  return [reference, current].map((model, index) => {
    const initial = sample(model, 16).storedJPerKg;
    const remaining = sample(model, time).storedJPerKg;
    const recordedInterval = interval(model, 16, time);
    assert.equal(initial, recordedInterval.earlier.storedJPerKg, 'Sample and interval initial energy agree');
    assert.equal(remaining, recordedInterval.later.storedJPerKg, 'Sample and interval remaining energy agree');
    return { id: index === 0 ? 'a' : 'b', initialJPerKg: initial,
      remainingJPerKg: remaining, remainingFraction: initial > 0 ? remaining / initial : null };
  });
}

function checkBudget(input, expectedRows, counts, label) {
  const before = JSON.stringify(input);
  const result = fractions(input);
  assert(result, `${label}: defined fraction result`);
  assert.equal(result.startTimeS, input.startTimeS, `${label}: start time`);
  assert.equal(result.endTimeS, input.endTimeS, `${label}: inspected time`);
  assert.equal(result.trials.length, expectedRows.length, `${label}: trial count`);
  const expectedScale = Math.max(1, ...expectedRows
    .filter(row => row.remainingFraction !== null).map(row => row.remainingFraction));
  assert.equal(result.scaleFraction, expectedScale, `${label}: raw fractions set the shared scale`);
  assert(Number.isFinite(result.scaleFraction) && result.scaleFraction >= 1,
    `${label}: finite scale includes the 100% reference`);

  // The 100% marker is 1 / scale, not necessarily the far end of the plot.
  // Fractions above one remain visible beyond it without being clamped.
  const referenceWidth = 1 / result.scaleFraction * 400;
  assert(Number.isFinite(referenceWidth) && referenceWidth > 0 && referenceWidth <= 400,
    `${label}: finite 100% reference position`);
  counts.referenceWidths++;
  counts.windows++;
  result.trials.forEach((row, index) => {
    const expected = expectedRows[index];
    for (const field of readingFields) {
      assert.equal(row[field], expected[field], `${label}, trial ${index}: exact ${field}`);
    }
    counts.trialReadings++;
    if (row.initialJPerKg === 0) {
      assert.equal(row.remainingFraction, null, `${label}: zero baseline is undefined`);
      counts.undefinedFractions++;
      return; // No fraction bar exists for an undefined baseline.
    }
    assert(Number.isFinite(row.remainingFraction) && row.remainingFraction >= 0,
      `${label}: finite nonnegative defined fraction`);
    assert.equal(row.remainingFraction, row.remainingJPerKg / row.initialJPerKg,
      `${label}: raw ratio is neither rounded nor clamped`);
    const width = row.remainingFraction / result.scaleFraction * 400;
    assert(Number.isFinite(width) && width >= 0 && width <= 400,
      `${label}: fraction bar stays within 0..400`);
    if (row.remainingFraction === 0) assert.equal(width, 0, `${label}: zero remaining has a zero-length bar`);
    if (row.remainingFraction === 1) assert.equal(width, referenceWidth, `${label}: 100% aligns with reference`);
    if (row.remainingFraction > 1) assert(width > referenceWidth, `${label}: above 100% extends beyond reference`);
    counts.definedFractions++;
    counts.fractionBarWidths++;
    diagnostics.largestFraction = Math.max(diagnostics.largestFraction, row.remainingFraction);
    diagnostics.smallestPositiveInitialJPerKg = diagnostics.smallestPositiveInitialJPerKg === null
      ? row.initialJPerKg : Math.min(diagnostics.smallestPositiveInitialJPerKg, row.initialJPerKg);
  });

  const reversed = fractions({ ...input, trials: [...input.trials].reverse() });
  assert.equal(reversed.scaleFraction, result.scaleFraction, `${label}: order-independent shared scale`);
  assert.equal(reversed.startTimeS, result.startTimeS, `${label}: reversing preserves start time`);
  assert.equal(reversed.endTimeS, result.endTimeS, `${label}: reversing preserves end time`);
  result.trials.forEach((row, index) => {
    for (const field of readingFields) {
      assert.equal(reversed.trials[result.trials.length - 1 - index][field], row[field],
        `${label}: reversal preserves ${field} and trial identity`);
    }
  });
  counts.orderReversals++;
  assert.equal(JSON.stringify(input), before, `${label}: budget remains unchanged`);
  counts.purityChecks++;
  return result;
}

function makePair(archetype, dampingRatio, groundFrequencyHz, intensityG) {
  const common = { archetype, groundFrequencyHz, intensityG };
  const reference = response({ ...common, dampingRatio: 0.05 });
  const current = dampingRatio === 0.05 ? reference : response({ ...common, dampingRatio });
  return { reference, current };
}

function checkAmplitude(base, scaled, label) {
  const comparisonScale = Math.max(base.scaleFraction, scaled.scaleFraction);
  const tolerance = 1e-9 * comparisonScale;
  scaled.trials.forEach((row, index) => {
    assert.notEqual(row.remainingFraction, null, `${label}: positive tiny input retains a defined fraction`);
    assertNear(row.remainingFraction, base.trials[index].remainingFraction,
      tolerance, `${label}: intensity-invariant fraction`);
    diagnostics.maximumAmplitudeDifferenceOverFractionScale = Math.max(
      diagnostics.maximumAmplitudeDifferenceOverFractionScale,
      Math.abs(row.remainingFraction - base.trials[index].remainingFraction) / comparisonScale);
    amplitudeCounts.fractionReadings++;
  });
  assertNear(scaled.scaleFraction, base.scaleFraction, tolerance, `${label}: intensity-invariant scale`);
  amplitudeCounts.scaleChecks++;
  amplitudeCounts.windows++;
}

let progress = 0;
for (const archetype of modes) {
  for (const dampingRatio of dampingRatios) {
    for (const groundFrequencyHz of frequenciesHz) {
      const baseline = makePair(archetype, dampingRatio, groundFrequencyHz, 0.12);
      const baselineFractions = endTimesS.map(time => fractions(budget(baseline.reference, baseline.current, time)));
      for (const intensityG of intensitiesG) {
        const pair = intensityG === 0.12 ? baseline : makePair(archetype, dampingRatio, groundFrequencyHz, intensityG);
        const label = `${archetype}, damping ${dampingRatio}, ${groundFrequencyHz} Hz, ${intensityG} g`;
        sweepCounts.configurations++;
        assert.equal(fractions(budget(pair.reference, pair.current, 15.999)), null,
          `${label}: no decay fraction before shaking ends`);
        sweepCounts.before16Checks++;
        const compareAmplitude = intensityG > 0 && intensityG !== 0.12;
        if (compareAmplitude) amplitudeCounts.configurations++;
        endTimesS.forEach((time, index) => {
          const expected = recordedRows(pair.reference, pair.current, time);
          const result = checkBudget(budget(pair.reference, pair.current, time), expected,
            sweepCounts, `${label}, ${time} s`);
          if (time === 16) {
            for (const row of result.trials) {
              assert.equal(row.remainingFraction, intensityG === 0 ? null : 1,
                `${label}: 16 s is 100% only when starting energy is positive`);
            }
          }
          if (compareAmplitude) checkAmplitude(baselineFractions[index], result, `${label}, ${time} s`);
        });
      }
    }
    console.log(`[${++progress}/12] ${archetype}, damping ${dampingRatio}: ${sweepCounts.configurations} configurations checked`);
  }
}

const zero = response({ intensityG: 0 });
const tiny = response({ intensityG: 1e-6, dampingRatio: 0.2 });
const ordinary = response({ intensityG: 0.12, dampingRatio: 0.05 });
const extraPairs = [
  { label: 'zero versus tiny', reference: zero, current: tiny },
  { label: 'tiny versus ordinary', reference: tiny, current: ordinary },
  { label: 'two zero baselines', reference: zero, current: zero },
  { label: 'unequal modes and intensities',
    reference: response({ archetype: 'flexible', groundFrequencyHz: 0.2, intensityG: 0.5, dampingRatio: 0 }),
    current: response({ archetype: 'stiff', groundFrequencyHz: 3, intensityG: 1e-6, dampingRatio: 0.4 }) }
];
for (const pair of extraPairs) {
  extraCounts.pairs++;
  for (const time of endTimesS) {
    checkBudget(budget(pair.reference, pair.current, time), recordedRows(pair.reference, pair.current, time),
      extraCounts, `${pair.label}, ${time} s`);
  }
}

const syntheticCases = [
  { label: 'undefined baseline versus fully spent positive baseline', trials: [
    { id: 'zero', initialJPerKg: 0, remainingJPerKg: 0 },
    { id: 'spent', initialJPerKg: 5, remainingJPerKg: 0 }] },
  { label: 'unclamped value above 100%', trials: [{ id: 'above', initialJPerKg: 2, remainingJPerKg: 3 }] },
  { label: 'very small defined baseline', trials: [{ id: 'tiny', initialJPerKg: 1e-250, remainingJPerKg: 5e-251 }] },
  { label: 'smallest positive defined baseline', trials: [{ id: 'subnormal', initialJPerKg: Number.MIN_VALUE, remainingJPerKg: Number.MIN_VALUE }] },
  { label: 'one undefined baseline', trials: [{ id: 'single-zero', initialJPerKg: 0, remainingJPerKg: 0 }] }
];
for (const fixture of syntheticCases) {
  syntheticCounts.cases++;
  const input = { startTimeS: 16, endTimeS: 24, trials: fixture.trials };
  const expected = fixture.trials.map(row => ({ ...row,
    remainingFraction: row.initialJPerKg > 0 ? row.remainingJPerKg / row.initialJPerKg : null }));
  checkBudget(input, expected, syntheticCounts, fixture.label);
}

let invalidInputs = 0;
for (const input of [null, undefined, {}, { trials: [] }, { trials: {} }, { trials: [null] }, { trials: [{}] }]) {
  assert.equal(fractions(input), null, 'Malformed budget has no fraction');
  invalidInputs++;
}
for (const field of ['initialJPerKg', 'remainingJPerKg']) {
  for (const value of [-1, NaN, Infinity, -Infinity, undefined, null, '1', true]) {
    const input = { startTimeS: 16, endTimeS: 24, trials: [{ id: 'invalid', initialJPerKg: 2, remainingJPerKg: 1, [field]: value }] };
    assert.equal(fractions(input), null, 'Invalid energy amount has no fraction');
    invalidInputs++;
  }
}
assert.equal(fractions({ startTimeS: 16, endTimeS: 24, trials: [
  { id: 'overflow', initialJPerKg: Number.MIN_VALUE, remainingJPerKg: 1 }
] }), null, 'Nonfinite computed ratio is rejected');
invalidInputs++;

assert.equal(sweepCounts.configurations, 144);
assert.equal(sweepCounts.windows, 576);
assert.equal(sweepCounts.trialReadings, 1152);
assert.equal(sweepCounts.definedFractions, 864);
assert.equal(sweepCounts.undefinedFractions, 288);
assert.equal(sweepCounts.before16Checks, 144);
assert.equal(extraCounts.pairs, 4);
assert.equal(extraCounts.windows, 16);
assert.equal(extraCounts.definedFractions, 20);
assert.equal(extraCounts.undefinedFractions, 12);
assert.equal(syntheticCounts.cases, 5);
assert.equal(syntheticCounts.trialReadings, 6);
assert.equal(syntheticCounts.definedFractions, 4);
assert.equal(syntheticCounts.undefinedFractions, 2);
for (const counts of [sweepCounts, extraCounts, syntheticCounts]) {
  assert.equal(counts.trialReadings, counts.definedFractions + counts.undefinedFractions);
  assert.equal(counts.fractionBarWidths, counts.definedFractions);
  assert.equal(counts.referenceWidths, counts.windows);
  assert.equal(counts.orderReversals, counts.windows);
  assert.equal(counts.purityChecks, counts.windows);
}
assert.equal(amplitudeCounts.configurations, 72);
assert.equal(amplitudeCounts.windows, 288);
assert.equal(amplitudeCounts.fractionReadings, 576);
assert.equal(amplitudeCounts.scaleChecks, 288);
assert.equal(invalidInputs, 24);
assert.equal(diagnostics.largestFraction, 1.5, 'Synthetic above-one ratio remains unclamped');

// Reject a moving source before attaching a successful result to its hash.
assert.equal(sha256(fs.readFileSync(sourcePath, 'utf8')), sourceSha256,
  'Bridge source changed during verification; rerun before saving evidence');
const result = {
  status: 'passed', generatedAt: new Date().toISOString(), sourcePath: sourceRelativePath, sourceSha256,
  grid: { modes, dampingRatios, frequenciesHz, intensitiesG, endTimesS },
  counts: { sweep: sweepCounts, extraPairs: extraCounts, synthetic: syntheticCounts,
    amplitude: amplitudeCounts, invalidInputs },
  countScope: 'Forward windows/readings are counted once; reversal and amplitude comparisons are reported separately. Undefined fractions have no fraction-bar width, while every window has one shared 100% reference position.',
  tolerances: { recordedRatios: 'exact; no clamping, threshold or rounding',
    amplitudeInvariance: '1e-9 times the larger shared fraction scale; dimensionless, with no energy floor',
    geometry: 'finite widths within 0..400; ratios above one extend beyond the 100% reference' },
  diagnostics,
  scope: 'Existing relative modal energy history. Each fraction uses its own trial\'s stored energy at 16 s. Fractions do not equate the trials\' initial energy or predict damage or safety. Unit and browser checks cover labels and rendering separately.'
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(`Passed: ${sweepCounts.configurations} configurations, ${sweepCounts.windows} primary windows, ${extraCounts.windows} extra windows, ${amplitudeCounts.windows} amplitude windows. Wrote ${path.relative(root, outputPath)}.`);
