const { createHash } = require('node:crypto');
const delta = require('./firstresponse_neck_refinement_delta.json');
const hash = source => createHash('sha256').update(source).digest('hex');
function revertNeckRefinement(source) {
  if (hash(source) !== delta.beforeSHA256 && hash(source) !== delta.afterSHA256) {
    source = require('./firstresponse_collar_refinement_delta.cjs').revertCollarRefinement(source);
  }
  if (hash(source) === delta.beforeSHA256) return source;
  if (hash(source) !== delta.afterSHA256) throw new Error('Neck source does not match its exact refinement delta');
  for (const edit of [...delta.edits].reverse()) {
    if (source.split(edit.after).length !== 2) throw new Error('Neck refinement reversal is not unique: ' + edit.name);
    source = source.replace(edit.after, edit.before);
  }
  if (hash(source) !== delta.beforeSHA256) throw new Error('Neck refinement did not recover fixed baseline');
  return source;
}
module.exports = { revertNeckRefinement, delta };
