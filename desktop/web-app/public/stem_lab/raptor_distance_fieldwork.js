/* Bracket a selected spatial-frequency reference in the existing illustration.
 * This module owns no scene, saved state or animal-detection model.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceFieldwork) return;

  var PLANS = {
    human: { title: 'Bracket the human reference', limitField: 'referenceLimit' },
    eagle: { title: 'Bracket the eagle reference', limitField: 'eagleLimit' }
  };
  var PREDICTIONS = { both: true, eagle: true, neither: true };
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function plain(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function dependencies() {
    var model = global.RaptorDistanceModel, evidence = global.RaptorDistanceEvidence;
    return model && model.version === 1 && typeof model.normalize === 'function' && typeof model.metrics === 'function' &&
      evidence && evidence.version === 1 && typeof evidence.snapshot === 'function'
      ? { model: model, evidence: evidence } : null;
  }
  function plan(id) {
    var deps = dependencies();
    if (!deps || typeof id !== 'string' || !own(PLANS, id)) return null;
    var reference = deps.evidence.snapshot(deps.model.normalize({ version: 1, distance: 40, cycles: 12, contrast: 95 }));
    if (!reference) return null;
    var metrics = deps.model.metrics(reference), limit = metrics && metrics[PLANS[id].limitField];
    if (typeof limit !== 'number' || !Number.isFinite(limit) || limit <= 0) return null;
    return { id: id, title: PLANS[id].title, limit: limit, reference: reference };
  }
  function trial(raw, prediction) {
    var deps = dependencies();
    if (!deps || typeof prediction !== 'string' || !own(PREDICTIONS, prediction)) return null;
    var settings = deps.evidence.snapshot(raw);
    if (!settings || settings.cycles !== 12 || settings.contrast !== 95) return null;
    var metrics = deps.model.metrics(settings), frequency = metrics && metrics.cyclesPerDegree;
    if (typeof frequency !== 'number' || !Number.isFinite(frequency) || frequency <= 0) return null;
    return { settings: settings, prediction: prediction, frequency: frequency };
  }
  function summarize(id, rawTrials) {
    var selected = plan(id);
    if (!selected || !Array.isArray(rawTrials)) return null;
    var trials = [];
    rawTrials.forEach(function (raw) {
      if (!plain(raw) || !own(raw, 'settings') || !own(raw, 'prediction')) return;
      // Serialized frequency, correctness and bracket labels are not evidence.
      // Recompute frequency from the strictly validated original conditions.
      var clean = trial(raw.settings, raw.prediction);
      if (!clean) return;
      for (var i = trials.length - 1; i >= 0; i--) {
        if (trials[i].settings.distance === clean.settings.distance) trials.splice(i, 1);
      }
      trials.push(clean);
      if (trials.length > 8) trials.shift();
    });
    var below = null, above = null;
    trials.forEach(function (sample) {
      var distance = sample.settings.distance;
      if (sample.frequency <= selected.limit) {
        if (!below || distance > below.distance) below = { distance: distance, frequency: sample.frequency };
      } else if (!above || distance < above.distance) above = { distance: distance, frequency: sample.frequency };
    });
    var width = below && above ? above.distance - below.distance : null;
    return {
      trials: trials, below: below, above: above, width: width,
      complete: width !== null && width > 0 && width <= 10, limit: selected.limit
    };
  }
  global.RaptorDistanceFieldwork = Object.freeze({ version: 1, plan: plan, trial: trial, summarize: summarize });
})(typeof window !== 'undefined' ? window : globalThis);
