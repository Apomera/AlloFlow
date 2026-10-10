const { createHash } = require('node:crypto');
const delta = require('./firstresponse_hand_comparison_delta.json');
const hash = source => createHash('sha256').update(source).digest('hex');
function revertHandComparison(source) {
  if (hash(source) !== delta.beforeSHA256 && hash(source) !== delta.afterSHA256) {
    source = require('./firstresponse_manikin_refinement_delta.cjs').revertManikinRefinement(source);
  }
  if (hash(source) === delta.beforeSHA256) return source;
  if (hash(source) !== delta.afterSHA256) throw new Error('Hand comparison source does not match its exact delta');
  let restored = source;
  for (const edit of [...delta.edits].reverse()) {
    if (restored.split(edit.after).length !== 2) throw new Error('Hand comparison reversal is not unique: ' + edit.name);
    restored = restored.replace(edit.after, edit.before);
  }
  if (hash(restored) !== delta.beforeSHA256) throw new Error('Hand comparison did not recover fixed baseline');
  return restored;
}
module.exports = { revertHandComparison, delta };
