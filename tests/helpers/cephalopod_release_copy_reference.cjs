'use strict';

// The 08d5e4b322 release corrected citations/copy and registered UI strings after
// the anatomy passes were accepted. Restore only those exact historical spans
// in the TEST reference; the application retains all of the release corrections.
// The delta comes from f7b4d993f0..08d5e4b322. Pass74 already restores the remaining
// launch-UI hunk and the coral-normal fix. Existing whole-source SHA assertions
// still pin the original references, including every model and gameplay byte.
const edits = require('../fixtures/cephalopod/release-copy-delta.json');

function restoreReleaseCopy(source) {
  const crlf = source.includes('\r\n');
  const locations = [];
  for (const [index, edit] of edits.entries()) {
    const after = crlf ? edit.after.replace(/\n/g, '\r\n') : edit.after;
    const before = crlf ? edit.before.replace(/\n/g, '\r\n') : edit.before;
    const at = source.indexOf(after);
    if (at < 0 || source.indexOf(after, at + 1) >= 0) {
      throw new Error('Cephalopod release-copy inverse guard: ' + index);
    }
    locations.push({ at, end: at + after.length, before });
  }
  locations.sort((left, right) => left.at - right.at);
  let cursor = 0;
  const parts = [];
  for (const edit of locations) {
    if (edit.at < cursor) throw new Error('Overlapping release-copy reference spans');
    parts.push(source.slice(cursor, edit.at), edit.before);
    cursor = edit.end;
  }
  parts.push(source.slice(cursor));
  return parts.join('');
}

module.exports = { restoreReleaseCopy };
