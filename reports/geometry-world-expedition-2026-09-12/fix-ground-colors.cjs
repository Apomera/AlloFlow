const fs=require('node:fs'),assert=require('node:assert/strict');
for(const file of ['stem_lab/stem_tool_geometryworld.js','reports/geometry-world-expedition-2026-09-12/ground-batching.js']){
  const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let s=raw.replace(/\r\n/g,'\n');
  const anchor="var geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.getAttribute('uv');";assert.equal(s.split(anchor).length,2);
  s=s.replace(anchor,anchor+"\n    // Cached block materials use vertex colors; neutral base preserves instance tint.\n    geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 3).fill(1), 3));");
  const b=Buffer.from(s.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);}finally{fs.closeSync(fd);}
}
console.log('Ground meshes now carry a neutral vertex-color base.');
