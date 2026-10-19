const { createHash } = require('node:crypto');
const delta = require('./firstresponse_line_ending_delta.json');
const hash = source => createHash('sha256').update(source).digest('hex');
// The thumb join and older pins were hashed from a working tree that held one
// stray CRLF (added with the hand study CSS). Git stores the file with LF
// (eol=lf), so CI reads these committed bytes; restore the hashed byte first.
function revertLineEnding(source) {
  if (hash(source) === delta.beforeSHA256) return source;
  if (hash(source) !== delta.afterSHA256) throw new Error('First Response source does not match its committed line-ending bytes');
  for (const edit of [...delta.edits].reverse()) {
    if (source.split(edit.new).length !== 2) throw new Error('Line-ending reversal is not unique: ' + (edit.name || 'source edit'));
    source = source.replace(edit.new, () => edit.old);
  }
  if (hash(source) !== delta.beforeSHA256) throw new Error('Line-ending reversal did not recover the hashed baseline');
  return source;
}
module.exports = { revertLineEnding, delta };
