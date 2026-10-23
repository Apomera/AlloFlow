/* Copied conditions and reproducible observations for the distance activity.
 * Comparisons describe changes in this illustration, not animal detection.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceEvidence) return;

  var FIELDS = ['distance', 'cycles', 'contrast'];
  var PREDICTIONS = { both: true, eagle: true, neither: true };
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function plain(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function model() {
    var value = global.RaptorDistanceModel;
    return value && value.version === 1 && typeof value.normalize === 'function' && typeof value.metrics === 'function' ? value : null;
  }
  function integer(value, low, high) {
    return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= low && value <= high;
  }
  function snapshot(raw) {
    var source = model();
    if (!source || !plain(raw) || !own(raw, 'version') || raw.version !== 1) return null;
    if (!own(raw, 'distance') || !integer(raw.distance, 40, 300) ||
        !own(raw, 'cycles') || !integer(raw.cycles, 4, 20) ||
        !own(raw, 'contrast') || !integer(raw.contrast, 10, 100)) return null;
    if ((own(raw, 'widthM') && raw.widthM !== .30) || (own(raw, 'wideFov') && raw.wideFov !== 20) ||
        (own(raw, 'detailFov') && raw.detailFov !== .75)) return null;
    return source.normalize({ version: 1, distance: raw.distance, cycles: raw.cycles, contrast: raw.contrast });
  }
  function compare(reference, current) {
    var before = snapshot(reference), after = snapshot(current);
    if (!before || !after) return null;
    var changed = [], held = [];
    FIELDS.forEach(function (key) { (before[key] === after[key] ? held : changed).push(key); });
    var source = model(), a = source.metrics(before), b = source.metrics(after);
    return {
      reference: before, current: after, changedFields: changed, heldFields: held,
      kind: changed.length === 0 ? 'same' : changed.length === 1 ? 'single' : 'multiple',
      factor: changed.length === 1 ? changed[0] : null,
      angleRatio: b.angleDeg / a.angleDeg,
      frequencyRatio: b.cyclesPerDegree / a.cyclesPerDegree,
      contrastRatio: after.contrast / before.contrast
    };
  }
  function experiment(reference, kind) {
    var next = snapshot(reference);
    if (!next) return null;
    if (kind === 'distance') {
      if (next.distance > 150) return null;
      next.distance *= 2;
    } else if (kind === 'cycles') {
      if (next.cycles > 10) return null;
      next.cycles *= 2;
    } else if (kind === 'contrast') {
      if (next.contrast === 25) return null;
      next.contrast = 25;
    } else if (kind !== 'restore') return null;
    return next;
  }
  function makeRecord(settings, prediction, note, referenceOrNull) {
    var clean = snapshot(settings);
    if (!clean || typeof prediction !== 'string' || !own(PREDICTIONS, prediction) || typeof note !== 'string') return null;
    var text = note.trim();
    if (!text || text.length > 600) return null;
    var reference = null;
    if (referenceOrNull !== null && referenceOrNull !== undefined) {
      reference = snapshot(referenceOrNull);
      if (!reference) return null;
    }
    var record = {
      version: 1, modelVersion: 1, distance: clean.distance, cycles: clean.cycles, contrast: clean.contrast,
      widthM: .30, referenceLimit: 60, eagleLimit: 140, prediction: prediction, note: text
    };
    if (reference) record.comparison = { version: 1, reference: reference };
    return record;
  }
  function readRecord(raw) {
    if (!plain(raw) || !own(raw, 'version') || raw.version !== 1 || !own(raw, 'modelVersion') || raw.modelVersion !== 1 ||
        !own(raw, 'widthM') || raw.widthM !== .30 || !own(raw, 'referenceLimit') || raw.referenceLimit !== 60 ||
        !own(raw, 'eagleLimit') || raw.eagleLimit !== 140 || !own(raw, 'prediction') || !own(raw, 'note')) return null;
    var reference = null;
    if (own(raw, 'comparison')) {
      var comparison = raw.comparison;
      if (!plain(comparison) || !own(comparison, 'version') || comparison.version !== 1 || !own(comparison, 'reference')) return null;
      reference = snapshot(comparison.reference);
      // Do not silently turn a broken paired observation into an unpaired one.
      if (!reference) return null;
    }
    return makeRecord(raw, raw.prediction, raw.note, reference);
  }
  function readRecords(rawSettings) {
    if (!plain(rawSettings) || !own(rawSettings, 'version') || rawSettings.version !== 1 ||
        !own(rawSettings, 'records') || !Array.isArray(rawSettings.records)) return [];
    var records = [];
    // Retain the latest six valid observations in their original time order.
    for (var i = rawSettings.records.length - 1; i >= 0 && records.length < 6; i--) {
      if (!own(rawSettings.records, i)) continue;
      var record = readRecord(rawSettings.records[i]);
      if (record) records.push(record);
    }
    return records.reverse();
  }
  global.RaptorDistanceEvidence = Object.freeze({
    version: 1, snapshot: snapshot, compare: compare, experiment: experiment,
    readRecords: readRecords, makeRecord: makeRecord
  });
})(typeof window !== 'undefined' ? window : globalThis);
