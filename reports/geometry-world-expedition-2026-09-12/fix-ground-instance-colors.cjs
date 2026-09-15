const fs=require('node:fs'),assert=require('node:assert/strict');
const file='stem_lab/stem_tool_geometryworld.js',raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let s=raw.replace(/\r\n/g,'\n');
const anchor='var chunk = new THREE.InstancedMesh(geometry(type), mat, SIDE * SIDE);';assert.equal(s.split(anchor).length,2);
s=s.replace(anchor,anchor+"\n            // r128 sizes a lazy color buffer from count; allocate before count becomes zero.\n            chunk.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(SIDE * SIDE * 3).fill(1), 3);");
const b=Buffer.from(s.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);}finally{fs.closeSync(fd);}
console.log('Ground chunks now allocate color storage for every possible instance.');
