const fs=require('node:fs'),p='stem_lab/stem_tool_geometryworld.js';let s=fs.readFileSync(p,'utf8');
const a='          material.extensions.derivatives = true;';if(!s.includes(a))throw Error('Missing extensions flag');
s=s.replace(a,'          material.extensions = material.extensions || {};\n'+a);
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}console.log('r128 material extension initialization fixed.');
