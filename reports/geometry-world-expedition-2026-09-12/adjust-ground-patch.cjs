const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname,'apply-ground-batching.cjs');
let source = fs.readFileSync(file,'utf8');
const before = "s.measurementLayer === 'ground' && s.y1 === s.y2 ? 'ground' : 'lesson'";
const after = "lesson.ground && s.y1 === lesson.ground.y && s.y1 === s.y2 ? 'ground' : 'lesson'";
if (!source.includes(before)) throw Error('Expected initial flat-overlay guard');
source=source.replace(before,after);
const fd=fs.openSync(file,'r+');
try { fs.writeSync(fd,source,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(source)); } finally {fs.closeSync(fd);}
console.log('Ground overlay requires a flat fill exactly at lesson ground Y; legacy preset paths are included.');
