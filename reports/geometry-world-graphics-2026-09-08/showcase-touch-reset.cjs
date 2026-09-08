const fs=require('node:fs'),p='stem_lab/stem_tool_geometryworld_builder.js';let s=fs.readFileSync(p,'utf8');
const a='    if(engine.velocity)engine.velocity.set(0,0,0);';
if(!s.includes(a))throw Error('Missing Showcase velocity reset');
s=s.replace(a,'    engine._touchLookId=null;engine._touchLookStart=null;engine._touchMoveId=null;engine._touchMoveStart=null;engine._touchMoveVec={x:0,z:0};\n'+a);
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}console.log('Showcase cancels tracked touch gestures.');
