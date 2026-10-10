const { createHash } = require('node:crypto');
const delta = require('./firstresponse_face_refinement_delta.json');
const hash = source => createHash('sha256').update(source).digest('hex');
function revertFaceRefinement(source) {
  if (hash(source) !== delta.beforeSHA256 && hash(source) !== delta.afterSHA256) {
    source = require('./firstresponse_rescuer_wrist_refinement_delta.cjs').revertRescuerWristRefinement(source);
  }
  if (hash(source) === delta.beforeSHA256) return source;
  if (hash(source) !== delta.afterSHA256) throw new Error('Face source does not match its exact refinement delta');
  for (const edit of [...delta.edits].reverse()) {
    if (source.split(edit.after).length !== 2) throw new Error('Face reversal is not unique: ' + (edit.name || 'source edit'));
    source = source.replace(edit.after, edit.before);
  }
  if (hash(source) !== delta.beforeSHA256) throw new Error('Face reversal did not recover fixed baseline');
  return source;
}
module.exports = { revertFaceRefinement, delta };
