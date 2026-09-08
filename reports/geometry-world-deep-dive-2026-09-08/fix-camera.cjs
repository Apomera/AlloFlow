const fs=require('node:fs');
const p='stem_lab/stem_tool_geometryworld_builder.js';let s=fs.readFileSync(p,'utf8');
s=s.replace('camera:engine.camera && engine.camera.position.toArray(), yaw:', 'camera:engine.camera && engine.camera.position.toArray(), cameraQuaternion:engine.camera && engine.camera.quaternion.toArray(), yaw:');
s=s.replace('    if (isFinite(saved.yaw)) engine.yaw = saved.yaw;', '    if (saved.cameraQuaternion && engine.camera) { engine.camera.quaternion.fromArray(saved.cameraQuaternion); if(engine.euler) engine.euler.setFromQuaternion(engine.camera.quaternion); }\n    if (isFinite(saved.yaw)) engine.yaw = saved.yaw;');
for(const file of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
