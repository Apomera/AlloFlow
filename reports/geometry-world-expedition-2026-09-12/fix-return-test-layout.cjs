const fs=require('node:fs'),assert=require('node:assert/strict');
const p='tests/geometry_world_printlab_bridge.test.js',raw=fs.readFileSync(p,'utf8');
const from="Array.from({ length: 1600 }, (_, x) => ({ x, y: 0, z: 0, type: 'wood', shape: 'cube', rotation: 0 }))";
assert.equal(raw.split(from).length,2);
const next=raw.replace(from,"Array.from({ length: 1600 }, (_, i) => ({ x: i % 40, y: 0, z: Math.floor(i / 40), type: 'wood', shape: 'cube', rotation: 0 }))");
const b=Buffer.from(next),fd=fs.openSync(p,'r+');try{fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);}finally{fs.closeSync(fd);}
console.log('Oversized return fixture uses distinct, valid coordinates.');
