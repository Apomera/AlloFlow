const fs=require('node:fs'),assert=require('node:assert/strict');
const file='stem_lab/stem_tool_geometryworld.js',raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let s=raw.replace(/\r\n/g,'\n');
const before='        \n        installGeometryGround(engine, THREE, getBlockMaterial, geometryWorldGroundTint);';assert.equal(s.split(before).length,2);
s=s.replace(before,'\n        installGeometryGround(engine, THREE, getBlockMaterial, geometryWorldGroundTint);');
s=s.replace('\n    // Cached block materials use vertex colors; neutral base preserves instance tint.\n    geo.setAttribute', '\n            // Cached block materials use vertex colors; neutral base preserves instance tint.\n            geo.setAttribute');
const b=Buffer.from(s.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);}finally{fs.closeSync(fd);}
console.log('Ground integration whitespace normalized.');
