'use strict';

// Run from the project root. This verifier reads the product source and writes
// one report; it does not alter product files or equate plotted area with RK4 work.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const sourcePath = path.resolve('stem_lab/stem_tool_bridgelab.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
const anchor = "window.StemLab.registerTool('bridgeLab', {";
assert.equal(source.split(anchor).length, 2, 'Expected one tool registration anchor');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {}, warn() {} } };
vm.runInNewContext(source.replace(anchor,
  'window.rateModel={bridgeSeismicResponse,bridgeSeismicPowerHistory,bridgeSeismicEnergyInterval,bridgeSeismicEnergyQuestions,bridgeSeismicSample,BRIDGE_RESPONSE_ARCHETYPES};' + anchor),
  sandbox, { filename: sourcePath });
const {
  bridgeSeismicResponse: response,
  bridgeSeismicPowerHistory: history,
  bridgeSeismicEnergyInterval: interval,
  bridgeSeismicEnergyQuestions: questions,
  bridgeSeismicSample: sample,
  BRIDGE_RESPONSE_ARCHETYPES: modes
} = sandbox.window.rateModel;
assert.equal(modes.length, 3);

const powerFields = ['inputPowerWPerKg', 'dampingPowerWPerKg'];
const energyFields = ['inputJPerKg', 'dissipatedJPerKg'];
const counts = {
  inputCombinations: 0, recordedSampleChecks: 0, recordedPowerChecks: 0,
  plottedPowerChecks: 0, windowChecks: 0, reversedWindowChecks: 0,
  returningWindowChecks: 0, coincidentWindowChecks: 0, zeroHistoryChecks: 0,
  areaChecks: 0, vertexChecks: 0, amplitudeScalingChecks: 0,
  normalizedPowerChecks: 0, scaledEnergyChecks: 0,
  unequalPairChecks: 0, zeroTinyPairChecks: 0, bothZeroPairChecks: 0,
  syntheticWindowChecks: 0, immutabilityChecks: 0,
  detailWindowChecks: 0, detailMatrixWindowChecks: 0, detailReturningWindowChecks: 0,
  detailReversedWindowChecks: 0, detailCoincidentFallbackChecks: 0,
  detailPlottedPowerChecks: 0, detailSharedBoundPowerChecks: 0,
  detailZeroTinyPairSelections: 0, detailUnequalPairSelections: 0,
  detailBothZeroPairSelections: 0, detailAmplitudeWindowChecks: 0,
  detailNormalizedPowerChecks: 0, detailSyntheticWindowChecks: 0
};
const snapshots = new WeakMap();
const maxima = new WeakMap();
const wholeHistories = new WeakMap();
const json = value => JSON.stringify(value);
const x = (r, time) => 12 + time / r.durationS * 276;

function close(actual, expected, eventScale, label, tolerance = 2e-10) {
  assert(Number.isFinite(actual) && Number.isFinite(expected), label + ': nonfinite value');
  assert(Number.isFinite(eventScale) && eventScale >= 0, label + ': invalid scale');
  const error = Math.abs(actual - expected);
  assert(error <= eventScale * tolerance,
    label + ': error ' + error + ' exceeds event-scaled tolerance ' + eventScale * tolerance);
}

function rawMaximum(r) {
  if (!maxima.has(r)) {
    let value = 0;
    for (const point of r.samples) for (const field of powerFields) value = Math.max(value, Math.abs(point[field]));
    maxima.set(r, value);
  }
  return maxima.get(r);
}

function checkBounds(r, chart, other = null) {
  const maximum = Math.max(rawMaximum(r), other ? rawMaximum(other) : 0);
  assert.equal(chart.maximumWPerKg, maximum, 'Raw recorded maximum');
  assert.equal(chart.rangeWPerKg, maximum > 0 ? maximum * 1.04 : 1, 'Shared range / zero fallback');
  assert(Number.isFinite(chart.rangeWPerKg) && chart.rangeWPerKg > 0);
  assert.equal(chart.curves.length, 2);
  for (let c = 0; c < chart.curves.length; c++) {
    const curve = chart.curves[c];
    assert.equal(curve.field, powerFields[c]);
    assert.equal(curve.points.length, r.samples.length);
    assert(!/NaN|Infinity/.test(curve.line));
    const plotted = curve.line.split(' ').map(pair => pair.split(',').map(Number));
    assert.equal(plotted.length, r.samples.length);
    for (let i = 0; i < r.samples.length; i++) {
      const point = r.samples[i], value = point[curve.field];
      assert.equal(curve.points[i].timeS, point.timeS);
      assert.equal(curve.points[i].value, value);
      assert(Math.abs(value) <= maximum && Math.abs(value) <= chart.rangeWPerKg);
      close(plotted[i][0], x(r, point.timeS), 1, 'Rounded x coordinate', 0.000500001);
      close(plotted[i][1], 68 - value / chart.rangeWPerKg * 56, 1, 'Rounded y coordinate', 0.000500001);
      counts.plottedPowerChecks++;
    }
  }
}

function checkWindow(r, pin, inspected, label) {
  const chart = history(r, pin, inspected);
  const reversed = history(r, inspected, pin);
  const q = interval(r, pin, inspected);
  const whole = wholeHistories.get(r);
  assert.equal(chart.interval.startTimeS, Math.min(q.pinTimeS, q.frameTimeS), label);
  assert.equal(chart.interval.endTimeS, Math.max(q.pinTimeS, q.frameTimeS), label);
  assert.equal(chart.maximumWPerKg, rawMaximum(r), label);
  assert.equal(chart.rangeWPerKg, reversed.rangeWPerKg, label);
  assert.equal(chart.startX, reversed.startX, label);
  assert.equal(chart.endX, reversed.endX, label);
  assert.equal(chart.startX, x(r, q.startTimeS), label);
  assert.equal(chart.endX, x(r, q.endTimeS), label);
  assert(chart.startX <= chart.endX && chart.startX >= 12 && chart.endX <= 288, label);
  assert.equal(chart.shakingEndX, x(r, r.shakingDurationS), label);
  for (let c = 0; c < chart.curves.length; c++) {
    const curve = chart.curves[c], reverseCurve = reversed.curves[c];
    assert.equal(curve.totalJPerKg, q[energyFields[c]], label + ': cumulative endpoint difference');
    assert.equal(curve.totalJPerKg, reverseCurve.totalJPerKg, label + ': chronological total');
    assert.equal(curve.line, reverseCurve.line, label);
    assert.equal(json(curve.areas), json(reverseCurve.areas), label + ': reversed geometry');
    if (whole) {
      assert.equal(chart.rangeWPerKg, whole.rangeWPerKg, label + ': fixed event bound');
      assert.equal(curve.line, whole.curves[c].line, label + ': fixed full-event curve');
    }
    const pinned = sample(r, pin), inspectedPoint = sample(r, inspected);
    assert.equal(curve.pinValueWPerKg, pinned[curve.field], label);
    assert.equal(curve.inspectedValueWPerKg, inspectedPoint[curve.field], label);
    for (const [a, b] of [['pinValueWPerKg', 'inspectedValueWPerKg'], ['pinX', 'inspectedX'], ['pinY', 'inspectedY']]) {
      assert.equal(curve[a], reverseCurve[b], label + ': swapped marker');
      assert.equal(curve[b], reverseCurve[a], label + ': swapped marker');
    }
    let previousEnd = q.startTimeS;
    for (const area of curve.areas) {
      assert(area.sign === 1 || area.sign === -1, label);
      assert(area.startTimeS >= q.startTimeS && area.endTimeS <= q.endTimeS, label);
      assert(area.endTimeS > area.startTimeS && area.startTimeS >= previousEnd, label);
      assert(area.vertices.length >= 2 && area.vertices.some(point => point.value !== 0), label);
      assert.equal(area.startTimeS, area.vertices[0].timeS, label);
      assert.equal(area.endTimeS, area.vertices.at(-1).timeS, label);
      assert(!/NaN|Infinity/.test(area.path) && area.path.endsWith(' Z'), label);
      let previousTime = area.startTimeS;
      for (const vertex of area.vertices) {
        assert(vertex.timeS >= previousTime && vertex.timeS >= q.startTimeS && vertex.timeS <= q.endTimeS, label);
        assert(Number.isFinite(vertex.value) && area.sign * vertex.value >= 0, label + ': signed fill');
        close(vertex.value, sample(r, vertex.timeS)[curve.field], chart.maximumWPerKg, label + ': clipped/interpolated vertex');
        previousTime = vertex.timeS;
        counts.vertexChecks++;
      }
      if (curve.id === 'damping') assert.equal(area.sign, 1, label + ': nonnegative damping fill');
      previousEnd = area.endTimeS;
      counts.areaChecks++;
    }
    if (q.durationS === 0) {
      assert.equal(curve.areas.length, 0, label + ': empty interval');
      assert.equal(curve.totalJPerKg, 0, label + ': zero interval total');
    } else {
      if (q.earlier[curve.field] !== 0) assert.equal(curve.areas[0].startTimeS, q.startTimeS, label + ': first clipped edge');
      if (q.later[curve.field] !== 0) assert.equal(curve.areas.at(-1).endTimeS, q.endTimeS, label + ': last clipped edge');
    }
  }
  if (q.durationS === 0) counts.coincidentWindowChecks++;
  counts.windowChecks++;
  counts.reversedWindowChecks++;
  return chart;
}

function checkPair(a, b, counter) {
  const first = history(a, 6.123, 10.456, b);
  const second = history(b, 6.123, 10.456, a);
  checkBounds(a, first, b);
  checkBounds(b, second, a);
  assert.equal(first.maximumWPerKg, second.maximumWPerKg);
  assert.equal(first.rangeWPerKg, second.rangeWPerKg);
  // The scale depends on whole histories, including when the selected frame is zero.
  for (const [selected, other, expected] of [[a, b, first], [b, a, second]]) {
    for (const time of [0, 24]) assert.equal(history(selected, time, time, other).rangeWPerKg, expected.rangeWPerKg);
    counts[counter]++;
  }
}

function checkScaling(base, scaled, ratio) {
  const square = ratio * ratio;
  const normal = wholeHistories.get(base), small = wholeHistories.get(scaled);
  const expectedMaximum = normal.maximumWPerKg * square;
  close(small.maximumWPerKg, expectedMaximum, expectedMaximum, 'Quadratic power maximum');
  close(small.rangeWPerKg, normal.rangeWPerKg * square, normal.rangeWPerKg * square, 'Quadratic power range');
  const energyScales = energyFields.map(field => Math.max(...base.samples.map(point => Math.abs(point[field]))) * square);
  for (let i = 0; i < base.samples.length; i++) {
    assert.equal(base.samples[i].timeS, scaled.samples[i].timeS);
    for (const field of powerFields) {
      close(scaled.samples[i][field], base.samples[i][field] * square, expectedMaximum, 'Quadratic recorded power');
      close(scaled.samples[i][field] / small.rangeWPerKg, base.samples[i][field] / normal.rangeWPerKg, 1, 'Normalized power shape');
      counts.normalizedPowerChecks++;
    }
    for (let e = 0; e < energyFields.length; e++) {
      const field = energyFields[e];
      close(scaled.samples[i][field], base.samples[i][field] * square, energyScales[e], 'Quadratic cumulative energy');
      counts.scaledEnergyChecks++;
    }
  }
  for (const [pin, time] of [[6.123, 10.456], [16, 24], [7.217, 7.217], [0, 24]]) {
    const a = interval(base, pin, time), b = interval(scaled, pin, time);
    for (let e = 0; e < energyFields.length; e++) {
      const field = energyFields[e];
      close(b[field], a[field] * square, energyScales[e], 'Quadratic interval total');
    }
  }
  counts.amplitudeScalingChecks++;
}

// Keep the original full-event checks above unchanged. Detail is a different
// view of the same history: its scale is based on clipped recorded powers.
function detailSamples(r, start, end, active) {
  return active ? [sample(r, start), ...r.samples.filter(point => point.timeS > start && point.timeS < end), sample(r, end)] : r.samples;
}

function checkDetailWindow(r, pin, inspected, other = null, label = 'Interval detail') {
  const chart = history(r, pin, inspected, other, true);
  const reversed = history(r, inspected, pin, other, true);
  const full = history(r, pin, inspected, other);
  const q = interval(r, pin, inspected), active = q.durationS > 0;
  const start = active ? q.startTimeS : 0, end = active ? q.endTimeS : r.durationS;
  const selectedPoints = detailSamples(r, start, end, active);
  const pairedPoints = other ? detailSamples(other, start, end, active) : [];
  let maximum = 0;
  for (const point of selectedPoints.concat(pairedPoints)) for (const field of powerFields) maximum = Math.max(maximum, Math.abs(point[field]));
  const range = maximum > 0 ? maximum * 1.04 : 1;
  const plotX = time => 12 + (time - start) / (end - start) * 276;
  assert.equal(chart.detail, active, label + ': effective mode');
  assert.equal(chart.plotStartTimeS, start, label);
  assert.equal(chart.plotEndTimeS, end, label);
  assert.equal(chart.maximumWPerKg, maximum, label + ': clipped shared maximum');
  assert.equal(chart.rangeWPerKg, range, label + ': shared zero fallback');
  assert.equal(chart.rangeWPerKg, reversed.rangeWPerKg, label);
  assert.equal(chart.startX, plotX(q.startTimeS), label);
  assert.equal(chart.endX, plotX(q.endTimeS), label);
  assert.equal(chart.shakingEndX, r.shakingDurationS >= start && r.shakingDurationS <= end ? plotX(r.shakingDurationS) : null, label);
  if (active) {
    assert.equal(chart.startX, 12, label);
    assert.equal(chart.endX, 288, label);
  } else {
    assert.equal(chart.rangeWPerKg, full.rangeWPerKg, label + ': coincident full-event range');
    assert.equal(chart.startX, full.startX, label);
    assert.equal(chart.endX, full.endX, label);
    counts.detailCoincidentFallbackChecks++;
  }
  for (const point of selectedPoints.concat(pairedPoints)) for (const field of powerFields) {
    assert(Number.isFinite(point[field]) && Math.abs(point[field]) <= maximum && Math.abs(point[field]) <= range, label);
    if (field === 'dampingPowerWPerKg') assert(point[field] >= 0, label);
    counts.detailSharedBoundPowerChecks++;
  }
  for (let c = 0; c < chart.curves.length; c++) {
    const curve = chart.curves[c], reverseCurve = reversed.curves[c], fullCurve = full.curves[c];
    const expectedPoints = selectedPoints.map(point => ({ timeS: point.timeS, value: point[curve.field] }));
    assert.equal(json(curve.plottedPoints), json(expectedPoints), label + ': exact clipped endpoints and interior');
    assert.equal(json(curve.points), json(fullCurve.points), label + ': full recorded values retained');
    assert.equal(curve.totalJPerKg, q[energyFields[c]], label + ': unchanged accumulated total');
    assert.equal(curve.totalJPerKg, reverseCurve.totalJPerKg, label);
    assert.equal(curve.line, reverseCurve.line, label);
    assert.equal(json(curve.areas), json(reverseCurve.areas), label + ': reversed detail geometry');
    const areaValues = areas => areas.map(area => ({ sign: area.sign, startTimeS: area.startTimeS, endTimeS: area.endTimeS, vertices: area.vertices }));
    assert.equal(json(areaValues(curve.areas)), json(areaValues(fullCurve.areas)), label + ': area data independent of view');
    for (const [a, b] of [['pinValueWPerKg', 'inspectedValueWPerKg'], ['pinX', 'inspectedX'], ['pinY', 'inspectedY']]) {
      assert.equal(curve[a], reverseCurve[b], label + ': swapped marker');
      assert.equal(curve[b], reverseCurve[a], label + ': swapped marker');
    }
    for (const [time, value, markerX, markerY] of [[q.pinTimeS, curve.pinValueWPerKg, curve.pinX, curve.pinY],
      [q.frameTimeS, curve.inspectedValueWPerKg, curve.inspectedX, curve.inspectedY]]) {
      assert.equal(value, sample(r, time)[curve.field], label);
      assert.equal(markerX, plotX(time), label);
      assert.equal(markerY, 68 - value / range * 56, label);
      assert(markerX >= 12 && markerX <= 288 && markerY >= 12 && markerY <= 124, label + ': marker bounds');
    }
    const plotted = curve.line.split(' ').map(pair => pair.split(',').map(Number));
    assert.equal(plotted.length, expectedPoints.length, label);
    for (let i = 0; i < expectedPoints.length; i++) {
      const point = expectedPoints[i], [px, py] = plotted[i];
      assert(Number.isFinite(px) && Number.isFinite(py) && px >= 12 && px <= 288 && py >= 12 && py <= 124, label + ': plotted bounds');
      close(px, plotX(point.timeS), 1, label + ': rounded detail x', 0.000500001);
      close(py, 68 - point.value / range * 56, 1, label + ': rounded detail y', 0.000500001);
      counts.detailPlottedPowerChecks++;
    }
    for (const area of curve.areas) {
      assert(!/NaN|Infinity/.test(area.path), label);
      for (const vertex of area.vertices) {
        const px = plotX(vertex.timeS), py = 68 - vertex.value / range * 56;
        assert(px >= 12 && px <= 288 && py >= 12 && py <= 124, label + ': area bounds');
        assert(area.sign * vertex.value >= 0, label + ': area sign');
      }
    }
    if (!active) {
      assert.equal(curve.line, fullCurve.line, label + ': coincident full-event curve');
      assert.equal(curve.areas.length, 0, label);
      assert.equal(curve.totalJPerKg, 0, label);
    }
    if (maximum === 0) assert(curve.plottedPoints.every(point => point.value === 0) && curve.areas.length === 0, label + ': zero view');
  }
  counts.detailWindowChecks++;
  counts.detailReversedWindowChecks++;
  return chart;
}

function checkDetailPairs(a, b, counter) {
  for (const [pin, time] of [[6.123, 10.456], [13.133, 13.167], [7.217, 7.217]]) {
    const forward = checkDetailWindow(a, pin, time, b, 'Paired interval detail');
    const backward = checkDetailWindow(b, pin, time, a, 'Reversed A/B interval detail');
    assert.equal(forward.maximumWPerKg, backward.maximumWPerKg);
    assert.equal(forward.rangeWPerKg, backward.rangeWPerKg);
    assert.equal(forward.plotStartTimeS, backward.plotStartTimeS);
    assert.equal(forward.plotEndTimeS, backward.plotEndTimeS);
    counts[counter] += 2;
  }
}

function checkDetailScaling(base, scaled, ratio) {
  const square = ratio * ratio;
  const eventPowerScale = wholeHistories.get(base).maximumWPerKg * square;
  const energyScales = energyFields.map(field => Math.max(...base.samples.map(point => Math.abs(point[field]))) * square);
  for (const [pin, time] of [[6.123, 10.456], [13.133, 13.167], [16, 24], [0, 24]]) {
    const a = history(base, pin, time, null, true), b = history(scaled, pin, time, null, true);
    const label = 'Detail scaling ' + JSON.stringify({ base: base.settings, scaled: scaled.settings, pin, time });
    assert(a.detail && b.detail, label + ': effective mode');
    // Cross-run floating-point errors use the full-event scale. Clipped values
    // are convex interpolations of recorded powers, so a tiny local residual
    // must not become an artificially stricter absolute error tolerance.
    close(b.maximumWPerKg, a.maximumWPerKg * square, eventPowerScale, label + ': quadratic clipped maximum');
    if (a.maximumWPerKg > 0) {
      assert(b.maximumWPerKg > 0, label + ': nonzero clipped maximum');
      close(b.rangeWPerKg, a.rangeWPerKg * square, 1.04 * eventPowerScale, label + ': quadratic detail range');
    } else {
      assert.equal(b.maximumWPerKg, 0, label + ': exact zero clipped maximum');
      assert.equal(a.rangeWPerKg, 1, label + ': zero reference fallback');
      assert.equal(b.rangeWPerKg, 1, label + ': zero scaled fallback');
    }
    for (let c = 0; c < a.curves.length; c++) {
      const ap = a.curves[c].plottedPoints, bp = b.curves[c].plottedPoints;
      assert.equal(ap.length, bp.length, label + ': clipped point count');
      for (let i = 0; i < ap.length; i++) {
        const pointLabel = label + ': ' + a.curves[c].id + ' at ' + ap[i].timeS + ' s';
        assert.equal(ap[i].timeS, bp[i].timeS, pointLabel + ': same sample time');
        close(bp[i].value, ap[i].value * square, eventPowerScale, pointLabel + ': quadratic clipped power');
        if (a.maximumWPerKg > 0) {
          // Let E be the event-scaled raw-value tolerance. The padded range
          // error is at most 1.04E. Multiplying the normalized difference by
          // the smaller range bounds it by E + 1.04E, even near a zero local
          // maximum. Exact per-history range/geometry checks remain separate.
          const smallerRange = Math.min(b.rangeWPerKg, a.rangeWPerKg * square);
          const normalizedDifference = bp[i].value / b.rangeWPerKg - ap[i].value / a.rangeWPerKg;
          close(normalizedDifference * smallerRange, 0, 2.04 * eventPowerScale, pointLabel + ': conditioned normalized detail shape');
        } else {
          assert.equal(ap[i].value, 0, pointLabel + ': exact zero reference power');
          assert.equal(bp[i].value, 0, pointLabel + ': exact zero scaled power');
        }
        counts.detailNormalizedPowerChecks++;
      }
      close(b.curves[c].totalJPerKg, a.curves[c].totalJPerKg * square, energyScales[c], label + ': quadratic ' + a.curves[c].id + ' total');
    }
    counts.detailAmplitudeWindowChecks++;
  }
}

assert.equal(history(null, 0, 1), null);
assert.equal(history({ samples: [] }, 0, 1), null);
for (const mode of modes) for (const dampingRatio of [0, 0.05, 0.2, 0.4]) for (const groundFrequencyHz of [0.2, 1.1, 3]) {
  console.log('Checking rate histories: ' + mode.id + ', damping ' + dampingRatio + ', forcing ' + groundFrequencyHz + ' Hz');
  const group = new Map();
  for (const intensityG of [0, 1e-6, 0.12, 0.5]) {
    const r = response({ archetype: mode.id, dampingRatio, groundFrequencyHz, intensityG });
    group.set(intensityG, r);
    snapshots.set(r, json(r));
    const label = [mode.id, dampingRatio, groundFrequencyHz, intensityG].join('/');
    assert.equal(r.samples.length, 1441, label + ': 60 Hz samples');
    assert.equal(r.durationS, 24);
    assert.equal(r.samples[0].timeS, 0);
    assert.equal(r.samples.at(-1).timeS, 24);
    const whole = history(r, 0, 24);
    wholeHistories.set(r, whole);
    checkBounds(r, whole);
    for (const point of r.samples) {
      assert(point.dampingPowerWPerKg >= 0, label + ': damping rate');
      if (dampingRatio === 0) assert.equal(point.dampingPowerWPerKg, 0);
      if (point.timeS >= r.shakingDurationS) assert.equal(point.inputPowerWPerKg, 0);
      for (const field of powerFields) {
        assert(Number.isFinite(point[field]) && Math.abs(point[field]) <= whole.maximumWPerKg, label + ': recorded power bound');
        if (intensityG === 0) assert.equal(point[field], 0);
        counts.recordedPowerChecks++;
      }
      counts.recordedSampleChecks++;
    }
    for (const [pin, time] of [[6.123, 10.456], [16, 24], [7.217, 7.217], [0, 24]]) checkWindow(r, pin, time, label);
    for (const [pin, time] of [[6.123, 10.456], [16, 24], [7.217, 7.217], [0, 24], [13.133, 13.167]]) {
      checkDetailWindow(r, pin, time, null, label + ': detail');
      counts.detailMatrixWindowChecks++;
    }
    const returning = questions(r).returning;
    if (returning) {
      const chart = checkWindow(r, returning.startTimeS, returning.endTimeS, label + ': returning');
      assert(chart.interval.inputJPerKg < 0, label + ': recorded decrease');
      counts.returningWindowChecks++;
      checkDetailWindow(r, returning.startTimeS, returning.endTimeS, null, label + ': returning detail');
      counts.detailReturningWindowChecks++;
    }
    if (intensityG === 0) {
      assert.equal(whole.maximumWPerKg, 0);
      assert.equal(whole.rangeWPerKg, 1);
      assert(whole.curves.every(curve => curve.areas.length === 0 && curve.totalJPerKg === 0));
      counts.zeroHistoryChecks++;
    }
    counts.inputCombinations++;
  }
  const zero = group.get(0), tiny = group.get(1e-6), ordinary = group.get(0.12), strong = group.get(0.5);
  assert(rawMaximum(tiny) > 0 && rawMaximum(tiny) < 0.001, 'Tiny nonzero recorded power');
  checkPair(zero, tiny, 'zeroTinyPairChecks');
  assert.equal(history(zero, 0, 24, tiny).rangeWPerKg, wholeHistories.get(tiny).rangeWPerKg);
  checkPair(ordinary, strong, 'unequalPairChecks');
  const bothZero = history(zero, 6.123, 10.456, zero);
  checkBounds(zero, bothZero, zero);
  assert.equal(bothZero.rangeWPerKg, 1);
  assert(bothZero.curves.every(curve => curve.areas.length === 0 && curve.totalJPerKg === 0));
  counts.bothZeroPairChecks++;
  checkScaling(ordinary, tiny, 1e-6 / 0.12);
  checkScaling(ordinary, strong, 0.5 / 0.12);
  checkDetailPairs(zero, tiny, 'detailZeroTinyPairSelections');
  checkDetailPairs(ordinary, strong, 'detailUnequalPairSelections');
  checkDetailPairs(zero, zero, 'detailBothZeroPairSelections');
  checkDetailScaling(ordinary, tiny, 1e-6 / 0.12);
  checkDetailScaling(ordinary, strong, 0.5 / 0.12);
  for (const r of group.values()) {
    assert.equal(json(r), snapshots.get(r), 'Response was mutated');
    counts.immutabilityChecks++;
  }
}

// A geometry fixture, deliberately not a physical response or RK4 energy budget.
// Its input line crosses zero at 12 s; its cumulative input is independently zero.
const syntheticPoint = (timeS, inputPowerWPerKg) => ({ timeS, inputPowerWPerKg,
  dampingPowerWPerKg: 1, inputJPerKg: 0, dissipatedJPerKg: timeS,
  kineticJPerKg: 0, strainJPerKg: 0, storedJPerKg: 0 });
const synthetic = { durationS: 24, shakingDurationS: 16,
  samples: [syntheticPoint(0, 2), syntheticPoint(24, -2)] };
const syntheticBefore = json(synthetic);
for (const [pin, time, edges] of [[0, 24, [[0, 12], [12, 24]]], [6, 18, [[6, 12], [12, 18]]]]) {
  const chart = checkWindow(synthetic, pin, time, 'Synthetic zero crossing');
  const input = chart.curves[0], damping = chart.curves[1];
  assert.equal(json(input.areas.map(area => area.sign)), '[1,-1]');
  assert.equal(json(input.areas.map(area => [area.startTimeS, area.endTimeS])), json(edges));
  assert.equal(input.areas[0].vertices.at(-1).timeS, 12);
  assert.equal(input.areas[0].vertices.at(-1).value, 0);
  assert.equal(input.areas[1].vertices[0].timeS, 12);
  assert.equal(input.areas[1].vertices[0].value, 0);
  assert.equal(input.totalJPerKg, 0);
  assert.equal(damping.totalJPerKg, time - pin);
  assert.equal(damping.areas.length, 1);
  assert.equal(damping.areas[0].sign, 1);
  counts.syntheticWindowChecks++;
  checkDetailWindow(synthetic, pin, time, null, 'Synthetic detail crossing');
  counts.detailSyntheticWindowChecks++;
}
checkWindow(synthetic, 12, 12, 'Synthetic coincident crossing');
counts.syntheticWindowChecks++;
checkDetailWindow(synthetic, 12, 12, null, 'Synthetic coincident detail');
counts.detailSyntheticWindowChecks++;
assert.equal(json(synthetic), syntheticBefore, 'Synthetic response was mutated');
counts.immutabilityChecks++;

assert.equal(counts.inputCombinations, 144);
assert.equal(counts.recordedSampleChecks, 144 * 1441);
assert.equal(counts.recordedPowerChecks, 144 * 1441 * 2);
assert.equal(counts.amplitudeScalingChecks, 72);
assert.equal(counts.zeroTinyPairChecks, 72);
assert.equal(counts.unequalPairChecks, 72);
assert.equal(counts.bothZeroPairChecks, 36);
assert(counts.returningWindowChecks > 0 && counts.areaChecks > 0 && counts.vertexChecks > 0);
assert.equal(counts.detailMatrixWindowChecks, 720);
assert.equal(counts.detailReturningWindowChecks, counts.returningWindowChecks);
assert.equal(counts.detailZeroTinyPairSelections, 216);
assert.equal(counts.detailUnequalPairSelections, 216);
assert.equal(counts.detailBothZeroPairSelections, 216);
assert.equal(counts.detailSyntheticWindowChecks, 3);
assert.equal(counts.detailCoincidentFallbackChecks, 361);
assert.equal(counts.detailAmplitudeWindowChecks, 288);
assert.equal(counts.detailNormalizedPowerChecks, 315216);
assert.equal(counts.detailWindowChecks, 1371 + counts.returningWindowChecks);
assert.equal(counts.detailReversedWindowChecks, counts.detailWindowChecks);
// Refuse to label a report with a hash for a different source revision.
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'), sourceSha256,
  'Product source changed while verification was running');
const result = { status: 'passed', sourceSha256, ...counts,
  powerShapeToleranceRelativeToEvent: 2e-10,
  detailScalingTolerance: {
    reference: 'Full-event recorded power maximum multiplied by the squared amplitude ratio',
    relativeTolerance: 2e-10,
    normalizedComparison: 'Absolute normalized difference multiplied by the smaller actual/expected power range',
    normalizedBoundMultiplier: 2.04,
    exactZeroRule: 'Zero clipped maxima, zero plotted powers, and fallback range 1 remain exact assertions'
  },
  numericTotals: 'Differences of accumulated recorded energy; no plotted-area/RK4 equality assertion' };
const reportPath = path.resolve('reports/bridgelab-rate-history-2026-10-04/model-invariants.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
