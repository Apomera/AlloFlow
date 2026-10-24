/* Compare two frequencies relative to the existing illustration's references.
 * A match concerns the chosen Gaussian transfer, not equal vision or detection.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceMatch) return;

  var TOLERANCE = .01;
  function dependencies() {
    var model = global.RaptorDistanceModel, evidence = global.RaptorDistanceEvidence;
    return model && model.version === 1 && typeof model.normalize === 'function' && typeof model.metrics === 'function' &&
      evidence && evidence.version === 1 && typeof evidence.snapshot === 'function'
      ? { model: model, evidence: evidence } : null;
  }
  function held(settings) { return !!settings && settings.cycles === 8 && settings.contrast === 95; }
  function starter(settings) { return held(settings) && settings.distance === 60; }
  function plan() {
    var deps = dependencies();
    if (!deps) return null;
    var reference = deps.evidence.snapshot({ version: 1, distance: 60, cycles: 8, contrast: 95 });
    return reference ? { reference: reference, tolerance: TOLERANCE } : null;
  }
  function isReference(raw) {
    var deps = dependencies();
    return !!deps && starter(deps.evidence.snapshot(raw));
  }
  function compare(reference, current) {
    var deps = dependencies();
    if (!deps) return null;
    var before = deps.evidence.snapshot(reference), after = deps.evidence.snapshot(current);
    if (!starter(before) || !held(after)) return null;
    var a = deps.model.metrics(before), b = deps.model.metrics(after);
    var referenceFraction = a.cyclesPerDegree / a.referenceLimit;
    var currentFraction = b.cyclesPerDegree / b.eagleLimit;
    var ratio = currentFraction / referenceFraction, error = Math.abs(ratio - 1);
    var matched = error <= TOLERANCE;
    return {
      reference: before, current: after,
      referenceFrequency: a.cyclesPerDegree, currentFrequency: b.cyclesPerDegree,
      referenceFraction: referenceFraction, currentFraction: currentFraction,
      referenceTransfer: a.referenceTransfer, eagleTransfer: b.eagleTransfer,
      ratio: ratio, error: error, matched: matched,
      direction: matched ? 'matched' : ratio < 1 ? 'farther' : 'nearer',
      distanceRatio: after.distance / before.distance, angleRatio: b.angleDeg / a.angleDeg
    };
  }
  global.RaptorDistanceMatch = Object.freeze({ version: 1, plan: plan, isReference: isReference, compare: compare });
})(typeof window !== 'undefined' ? window : globalThis);
