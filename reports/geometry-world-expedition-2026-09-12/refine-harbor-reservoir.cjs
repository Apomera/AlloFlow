'use strict';
const fs = require('node:fs');
const path = require('node:path');
function rewrite(name, pairs) {
  const target = path.join(__dirname,name);
  let source = fs.readFileSync(target,'utf8');
  for (const [from,to] of pairs) source=source.replace(from,to);
  const fd=fs.openSync(target,'r+');
  fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
}
rewrite('build-harbor-fixture.cjs',[
  ["fill('reservoir-left-wall', 'stone', 7, 1, -7, 7, 2, -4);","fill('reservoir-left-wall', 'stone', 7, 1, -7, 7, 2, -5);"],
  ["fill('reservoir-right-wall', 'stone', 12, 1, -7, 12, 2, -4);","fill('reservoir-right-wall', 'stone', 12, 1, -7, 12, 2, -5);"],
  ['Look down at the sand practice pad behind you.','Look down at the sand practice pad beside the arrival path.']
]);
rewrite('HARBOR-LESSON.md',[[/312/g,'308'],[/1,188/g,'1,192']]);
