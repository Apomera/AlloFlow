const { createHash } = require('node:crypto');
const delta = require('./firstresponse_palm_symmetry_delta.json');
const hash = source => createHash('sha256').update(source).digest('hex');
function revertPalmSymmetry(source) {
  if (hash(source) !== delta.beforeSHA256 && hash(source) !== delta.afterSHA256) {
    source = require('./firstresponse_finger_joins_delta.cjs').revertFingerJoins(source);
  }
  if (hash(source) === delta.beforeSHA256) return source;
  if (hash(source) !== delta.afterSHA256) throw new Error('Palm symmetry source does not match its exact refinement delta');
  for (const edit of [...delta.edits].reverse()) {
    if (source.split(edit.new).length !== 2) throw new Error('Palm symmetry reversal is not unique: ' + (edit.name || 'source edit'));
    source = source.replace(edit.new, edit.old);
  }
  if (hash(source) !== delta.beforeSHA256) throw new Error('Palm symmetry reversal did not recover fixed baseline');
  return source;
}
module.exports = { revertPalmSymmetry, delta };
