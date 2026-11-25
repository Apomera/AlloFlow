/* Compare two frequencies relative to the existing illustration's references.
 * A match concerns the chosen Gaussian transfer, not equal vision or detection.
 */
(function (global) {
  'use strict';
  if (!global || typeof global !== 'object' || global.RaptorDistanceMatch) return;

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
    if (!a || typeof a !== 'object' || !b || typeof b !== 'object' ||
        typeof a.cyclesPerDegree !== 'number' || !Number.isFinite(a.cyclesPerDegree) || a.cyclesPerDegree <= 0 ||
        typeof a.referenceLimit !== 'number' || !Number.isFinite(a.referenceLimit) || a.referenceLimit <= 0 ||
        typeof b.cyclesPerDegree !== 'number' || !Number.isFinite(b.cyclesPerDegree) || b.cyclesPerDegree <= 0 ||
        typeof b.eagleLimit !== 'number' || !Number.isFinite(b.eagleLimit) || b.eagleLimit <= 0 ||
        typeof a.angleDeg !== 'number' || !Number.isFinite(a.angleDeg) || a.angleDeg <= 0 ||
        typeof b.angleDeg !== 'number' || !Number.isFinite(b.angleDeg) || b.angleDeg <= 0 ||
        typeof before.distance !== 'number' || !Number.isFinite(before.distance) || before.distance <= 0 ||
        typeof after.distance !== 'number' || !Number.isFinite(after.distance) || after.distance <= 0 ||
        typeof a.referenceTransfer !== 'number' || !Number.isFinite(a.referenceTransfer) ||
        typeof b.eagleTransfer !== 'number' || !Number.isFinite(b.eagleTransfer)) return null;
    var referenceFraction = a.cyclesPerDegree / a.referenceLimit;
    var currentFraction = b.cyclesPerDegree / b.eagleLimit;
    var ratio = currentFraction / referenceFraction, error = Math.abs(ratio - 1);
    var distanceRatio = after.distance / before.distance, angleRatio = b.angleDeg / a.angleDeg;
    if (!Number.isFinite(ratio) || !Number.isFinite(error) || !Number.isFinite(distanceRatio) || !Number.isFinite(angleRatio)) return null;
    var matched = error <= TOLERANCE;
    return {
      reference: before, current: after,
      referenceFrequency: a.cyclesPerDegree, currentFrequency: b.cyclesPerDegree,
      referenceFraction: referenceFraction, currentFraction: currentFraction,
      referenceTransfer: a.referenceTransfer, eagleTransfer: b.eagleTransfer,
      ratio: ratio, error: error, matched: matched,
      direction: matched ? 'matched' : ratio < 1 ? 'farther' : 'nearer',
      distanceRatio: distanceRatio, angleRatio: angleRatio
    };
  }
  global.RaptorDistanceMatch = Object.freeze({ version: 1, plan: plan, isReference: isReference, compare: compare });
})(typeof window !== 'undefined' && window && typeof window === 'object' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
