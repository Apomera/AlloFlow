const fs = require('node:fs');
function update(file, edits) {
  let source = fs.readFileSync(file, 'utf8');
  for (const [before, after] of edits) {
    if (source.split(before).length !== 2) throw Error('Expected one help anchor: ' + before);
    source = source.replace(before, after);
  }
  const fd = fs.openSync(file, 'r+');
  try { fs.writeSync(fd, source, 0, 'utf8'); fs.ftruncateSync(fd, Buffer.byteLength(source)); }
  finally { fs.closeSync(fd); }
}
update('stem_lab/stem_tool_geometryworld.js', [
  ["'L'), 'Say where characters are',", "'L'), 'Directions to tracked or nearby guides',"],
  ['L says where the characters are and who still has a question,', 'L gives directions to your tracked guide, or nearby characters when nothing is tracked,']
]);
update('tests/geometry_world_wayfinding.test.js', [
  ["'L'), 'Say where characters are',", "'L'), 'Directions to tracked or nearby guides',"],
  ['L says where the characters are and who still has a question', 'L gives directions to your tracked guide, or nearby characters when nothing is tracked']
]);
console.log('Updated visible and screen-reader shortcut guidance.');
