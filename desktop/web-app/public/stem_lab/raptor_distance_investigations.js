/* Guided comparisons for the existing distance illustration. No scene, state,
 * scoring history or biological detection model is owned by this module.
 */
(function (global) {
  'use strict';
  if (global.RaptorDistanceInvestigations) return;

  var DEFINITIONS = {
    distance: {
      title: 'Move farther, keep the pattern',
      question: 'Compare the same plaque at 80 m and 160 m. What happens to its angular span and cycles per degree when stripe count and contrast stay fixed?',
      factor: 'distance', target: { distance: 160, cycles: 8, contrast: 95 }, answer: 'smaller-higher'
    },
    cycles: {
      title: 'Fit more stripes into the same view',
      question: 'Keep the plaque at 80 m and change eight stripe pairs to sixteen. What happens to angular span and cycles per degree when distance and contrast stay fixed?',
      factor: 'cycles', target: { distance: 80, cycles: 16, contrast: 95 }, answer: 'same-higher'
    },
    contrast: {
      title: 'Fade the stripes, keep their spacing',
      question: 'Keep the plaque at 80 m with eight stripe pairs and lower display contrast from 95% to 25%. What happens to angular span and cycles per degree?',
      factor: 'contrast', target: { distance: 80, cycles: 8, contrast: 25 }, answer: 'same-same'
    }
  };
  var CHOICES = [
    { id: 'smaller-higher', text: 'Angular span decreases; cycles per degree increase.' },
    { id: 'same-higher', text: 'Angular span stays the same; cycles per degree increase.' },
    { id: 'same-same', text: 'Angular span and cycles per degree both stay the same.' }
  ];
  function dependencies() {
    var model = global.RaptorDistanceModel, evidence = global.RaptorDistanceEvidence;
    return model && model.version === 1 && typeof model.normalize === 'function' && typeof model.metrics === 'function' &&
      evidence && evidence.version === 1 && typeof evidence.snapshot === 'function' && typeof evidence.compare === 'function'
      ? { model: model, evidence: evidence } : null;
  }
  function known(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(DEFINITIONS, id); }
  function get(id) {
    var deps = dependencies();
    if (!deps || !known(id)) return null;
    var definition = DEFINITIONS[id];
    var reference = deps.evidence.snapshot({ version: 1, distance: 80, cycles: 8, contrast: 95 });
    var target = deps.evidence.snapshot({ version: 1, distance: definition.target.distance, cycles: definition.target.cycles, contrast: definition.target.contrast });
    if (!reference || !target) return null;
    return {
      id: id, title: definition.title, question: definition.question, factor: definition.factor,
      reference: reference, target: target,
      choices: CHOICES.map(function (choice) { return { id: choice.id, text: choice.text }; }),
      answer: definition.answer
    };
  }
  function same(a, b) {
    return a.distance === b.distance && a.cycles === b.cycles && a.contrast === b.contrast;
  }
  function match(id, reference, current) {
    var definition = get(id), deps = dependencies();
    if (!definition || !deps) return false;
    var a = deps.evidence.snapshot(reference), b = deps.evidence.snapshot(current);
    return !!(a && b && same(a, definition.reference) && same(b, definition.target));
  }
  function percent(ratio) { return (ratio * 100).toFixed(1) + '%'; }
  function explain(reference, current) {
    var deps = dependencies();
    if (!deps) return null;
    var comparison = deps.evidence.compare(reference, current);
    if (!comparison) return null;
    var a = comparison.reference, b = comparison.current, text;
    if (comparison.kind === 'same') {
      text = 'The reference and current conditions match. Angular span and cycles per degree are unchanged; no factor has changed.';
    } else if (comparison.kind === 'multiple') {
      text = 'Several factors changed, so this comparison cannot isolate one cause. The angular span is approximately ' +
        percent(comparison.angleRatio) + ' of its reference value and spatial frequency is approximately ' +
        percent(comparison.frequencyRatio) + '. Change one factor while keeping the others fixed to investigate its effect.';
    } else if (comparison.factor === 'distance') {
      var farther = b.distance > a.distance;
      text = 'Distance ' + (farther ? 'increased' : 'decreased') + ' from ' + a.distance + ' m to ' + b.distance +
        ' m while stripe count and display contrast stayed fixed. Angular span ' + (comparison.angleRatio < 1 ? 'decreased' : 'increased') +
        ' and cycles per degree ' + (comparison.frequencyRatio > 1 ? 'increased' : 'decreased') + '.';
      if (b.distance === a.distance * 2) text += ' Doubling distance makes spatial frequency nearly twice as large; the exact angle depends on plaque width and distance.';
      else if (a.distance === b.distance * 2) text += ' Halving distance makes spatial frequency nearly half as large; the exact angle depends on plaque width and distance.';
      else text += ' Angular span is approximately ' + percent(comparison.angleRatio) + ' of its reference value and spatial frequency is approximately ' + percent(comparison.frequencyRatio) + '.';
    } else if (comparison.factor === 'cycles') {
      text = 'Stripe pairs ' + (b.cycles > a.cycles ? 'increased' : 'decreased') + ' from ' + a.cycles + ' to ' + b.cycles +
        ' while distance and display contrast stayed fixed. Angular span stayed the same, so cycles per degree ' +
        (comparison.frequencyRatio > 1 ? 'increased' : 'decreased') + ' in direct proportion to stripe count.';
      if (b.cycles === a.cycles * 2) text += ' Doubling stripe pairs doubles spatial frequency exactly.';
      else if (a.cycles === b.cycles * 2) text += ' Halving stripe pairs halves spatial frequency exactly.';
    } else {
      var referenceMetrics = deps.model.metrics(a), currentMetrics = deps.model.metrics(b);
      var faded = currentMetrics.referenceAttenuation < referenceMetrics.referenceAttenuation;
      text = 'Display contrast ' + (b.contrast < a.contrast ? 'decreased' : 'increased') + ' from ' + a.contrast + '% to ' + b.contrast +
        '% while distance and stripe count stayed fixed. Angular span, cycles per degree and the selected reference band stayed the same. ' +
        'Input and filtered modulation both ' + (faded ? 'decreased' : 'increased') + ' to approximately ' +
        percent(comparison.contrastRatio) + ' of their reference values in this illustration; this does not predict animal detection.';
    }
    return { kind: comparison.kind, factor: comparison.factor, text: text };
  }
  function check(id, reference, current, answer) {
    var definition = get(id);
    if (!definition || !match(id, reference, current) || typeof answer !== 'string' ||
        !definition.choices.some(function (choice) { return choice.id === answer; })) return null;
    var explanation = explain(reference, current);
    return explanation ? { correct: answer === definition.answer, explanation: explanation.text } : null;
  }
  global.RaptorDistanceInvestigations = Object.freeze({ version: 1, get: get, match: match, explain: explain, check: check });
})(typeof window !== 'undefined' ? window : globalThis);
