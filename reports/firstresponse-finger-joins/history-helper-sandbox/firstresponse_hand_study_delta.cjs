const { createHash } = require('node:crypto');
const delta = require('./firstresponse_hand_study_delta.json');
const hash = source => createHash('sha256').update(source).digest('hex');
function revertHandStudy(source) {
  if (hash(source) !== delta.beforeSHA256 && hash(source) !== delta.afterSHA256) {
    source = require('./firstresponse_hand_comparison_delta.cjs').revertHandComparison(source);
  }
  if (hash(source) === delta.beforeSHA256) return source;
  if (hash(source) !== delta.afterSHA256) throw new Error('Hand study source does not match its exact integration delta');
  let restored = source;
  for (const edit of [...delta.edits].reverse()) {
    if (restored.split(edit.after).length !== 2) throw new Error('Hand study reversal is not unique: ' + edit.name);
    restored = restored.replace(edit.after, edit.before);
  }
  if (hash(restored) !== delta.beforeSHA256) throw new Error('Hand study reversal did not recover the fixed baseline');
  return restored;
}
module.exports = { revertHandStudy, delta };
