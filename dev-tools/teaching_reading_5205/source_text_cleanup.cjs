'use strict';

// The released source pack already receives these global editorial repairs in
// apply_test_prep_source_review_corrections.cjs. Keeping the same normalization
// in the 5205 pack generator prevents a 200-item source rebuild from undoing
// those corrections. The learning-library builder intentionally does not use
// this helper so unrelated released checks/cards remain byte-for-content stable.

function cleanSourceText(value) {
  return String(value || '')
    .replace(/\b([A-Za-z]+)\?s\b/g, "$1's")
    .replace(/\bA elementary\b/g, 'An elementary')
    .replace(/\ba elementary\b/g, 'an elementary')
    .replace(/phoneme\?grapheme/g, 'phoneme\u2013grapheme')
    .replace(/\?use a strategy\?/gi, '\u201cuse a strategy\u201d')
    .replace(/intelligence\?achievement/gi, 'intelligence\u2013achievement')
    .replace(/cannot segment \?map\.\?/g, 'cannot segment the word map.')
    .replace(/spells \?jumped\? as \?jumpt\? and \?running\? as \?runing\.\?/g,
      'spells \u201cjumped\u201d as \u201cjumpt\u201d and \u201crunning\u201d as \u201cruning.\u201d');
}

module.exports = { cleanSourceText };
