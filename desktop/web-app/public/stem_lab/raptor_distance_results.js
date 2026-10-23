/* Validated completed fieldwork records. Persist original conditions and learner
 * predictions only; recalculate every bracket and ratio with the existing model.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceResults) return;

  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function plain(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function fieldwork() {
    var value = global.RaptorDistanceFieldwork;
    return value && value.version === 1 && typeof value.trial === 'function' && typeof value.summarize === 'function' ? value : null;
  }
  function capture(id, rawTrials) {
    var source = fieldwork();
    if (!source || (id !== 'human' && id !== 'eagle') || !Array.isArray(rawTrials) || rawTrials.length < 2 || rawTrials.length > 8) return null;
    var trials = [], distances = Object.create(null);
    for (var i = 0; i < rawTrials.length; i++) {
      if (!own(rawTrials, i)) return null;
      var raw = rawTrials[i];
      if (!plain(raw) || !own(raw, 'settings') || !own(raw, 'prediction')) return null;
      var clean = source.trial(raw.settings, raw.prediction);
      if (!clean || own(distances, clean.settings.distance)) return null;
      distances[clean.settings.distance] = true;
      trials.push({ settings: clean.settings, prediction: clean.prediction });
    }
    // Strict validation above precedes summarize's repair/deduplication rules:
    // one corrupt trial must invalidate the record, not silently change its evidence.
    var summary = source.summarize(id, trials);
    if (!summary || summary.complete !== true || typeof summary.width !== 'number' ||
        !Number.isFinite(summary.width) || summary.width <= 0 || summary.width > 10) return null;
    return { version: 1, modelVersion: 1, reference: id, trials: trials };
  }
  function read(rawNamespace) {
    if (!fieldwork() || !plain(rawNamespace) || !own(rawNamespace, 'version') || rawNamespace.version !== 1) return null;
    var result = { version: 1 }, count = 0;
    ['human', 'eagle'].forEach(function (id) {
      if (!own(rawNamespace, id)) return;
      var raw = rawNamespace[id];
      if (!plain(raw) || !own(raw, 'version') || raw.version !== 1 ||
          !own(raw, 'modelVersion') || raw.modelVersion !== 1 ||
          !own(raw, 'reference') || raw.reference !== id || !own(raw, 'trials')) return;
      var record = capture(id, raw.trials);
      if (record) { result[id] = record; count++; }
    });
    return count ? result : null;
  }
  function compare(rawNamespace) {
    var records = read(rawNamespace), source = fieldwork();
    if (!records || !records.human || !records.eagle || !source) return null;
    var human = source.summarize('human', records.human.trials), eagle = source.summarize('eagle', records.eagle.trials);
    if (!human || !eagle || !human.complete || !eagle.complete) return null;
    return {
      human: human, eagle: eagle,
      ratioLow: eagle.below.distance / human.above.distance,
      ratioHigh: eagle.above.distance / human.below.distance
    };
  }
  global.RaptorDistanceResults = Object.freeze({ version: 1, capture: capture, read: read, compare: compare });
})(typeof window !== 'undefined' ? window : globalThis);
