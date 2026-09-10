const fs=require('node:fs');
const core='stem_lab/stem_tool_geometryworld.js',mirror='desktop/web-app/public/stem_lab/stem_tool_geometryworld.js';
let source=fs.readFileSync(core,'utf8');const eol=source.includes('\r\n')?'\r\n':'\n';source=source.replace(/\r\n/g,'\n');
function patch(text,before,after){if(!text.includes(before))throw new Error('Missing motion marker: '+before.slice(0,110));return text.replace(before,after);}
source=patch(source,'    return Object.assign({ preference: requested, tier: tier, reason: reason }, profiles[tier]);',"    if (reducedMotion) reason += ' Reduced motion keeps optional scene animation still.';\n    return Object.assign({ preference: requested, tier: tier, reason: reason }, profiles[tier], { ambientMotion: profiles[tier].ambientMotion && !reducedMotion });");
const start=source.indexOf('          // Animate NPCs — bob, rotate, face player when close'),end=source.indexOf('          // ── NPC proximity chime',start);if(start<0||end<start)throw new Error('NPC animation section missing');
let npc=source.slice(start,end);
const replacements=[
  ['            var baseY = npc.data.position[1] + 0.75;',"            var THREE = window.THREE, ambientMotion = engine._ambientMotionEnabled !== false;\n            if (!THREE) return;\n            var baseY = npc.data.position[1] + 0.75;"],
  ['var bobY = Math.sin(t * 2 + i) * 0.1;','var bobY = ambientMotion ? Math.sin(t * 2 + i) * 0.1 : 0;'],
  ['if (npc._celebrateUntil && t < npc._celebrateUntil) {','if (ambientMotion && npc._celebrateUntil && t < npc._celebrateUntil) {'],
  ['if (npc._shakeUntil && t < npc._shakeUntil) {','if (ambientMotion && npc._shakeUntil && t < npc._shakeUntil) {'],
  ['} else if (engine.camera && engine.camera.position.distanceTo(npc.body.position) > 8) {','} else if (ambientMotion && engine.camera && engine.camera.position.distanceTo(npc.body.position) > 8) {'],
  ['              npc.body.position.x = npc.data.position[0] + 0.5;\n            }','              npc.body.position.x = npc.data.position[0] + 0.5;\n              npc.body.position.z = npc.data.position[2] + 0.5;\n            }'],
  ['if (engine._ambientMotionEnabled !== false) {','if (ambientMotion) {'],
  ['            if (npc.label)  {',"            if (!ambientMotion) {\n              (npc._eyeParts || []).forEach(function(eye) { eye.scale.y = 1; });\n              (npc._arms || []).forEach(function(arm) { arm.rotation.x = 0; arm.rotation.z = (arm.userData.armSide || 1) * 0.22; });\n            }\n            if (npc.label)  {"],
  ['if (engine.camera) {\n              var dx =','if (engine.camera) {\n              var dx ='],
  ['npc.body.rotation.y += (targetRot - npc.body.rotation.y) * Math.min(1, dt * 3);','npc.body.rotation.y += (targetRot - npc.body.rotation.y) * (ambientMotion ? Math.min(1, dt * 3) : 1);'],
  ['npc.head.rotation.x += (headTilt - npc.head.rotation.x) * Math.min(1, dt * 4);','npc.head.rotation.x += (headTilt - npc.head.rotation.x) * (ambientMotion ? Math.min(1, dt * 4) : 1);'],
  ['npc.head.rotation.y += (targetRot - npc.head.rotation.y) * Math.min(1, dt * 3);','npc.head.rotation.y += (targetRot - npc.head.rotation.y) * (ambientMotion ? Math.min(1, dt * 3) : 1);'],
  ['                npc.body.rotation.y += dt * 0.5;\n                npc.head.rotation.x *= 0.95;','                if (ambientMotion) npc.body.rotation.y += dt * 0.5;\n                npc.head.rotation.x = ambientMotion ? npc.head.rotation.x * 0.95 : 0;'],
  ['            } else {\n              npc.body.rotation.y += dt * 0.5;','            } else if (ambientMotion) {\n              npc.body.rotation.y += dt * 0.5;'],
  ['if (npc.qMark.material.opacity > 0.01) {',"if (!ambientMotion) { npc.qMark.material.opacity = 0; npc.qMark.visible = false; }\n                else if (npc.qMark.material.opacity > 0.01) {"],
  ['npc.qMark.position.y = npc.data.position[1] + 2.7 + Math.sin(t * 3 + i * 1.5) * 0.15;','npc.qMark.position.y = npc.data.position[1] + 2.7 + (ambientMotion ? Math.sin(t * 3 + i * 1.5) * 0.15 : 0);'],
  ['var qScale = 0.55 + Math.sin(t * 4 + i) * 0.08;','var qScale = 0.55 + (ambientMotion ? Math.sin(t * 4 + i) * 0.08 : 0);'],
  ['var eyeScale = blinkCycle < 0.1 ? 0.2 : 1.0;','var eyeScale = ambientMotion && blinkCycle < 0.1 ? 0.2 : 1.0;'],
  ['npc.body.material.emissiveIntensity = 0.1 + Math.sin(t * 2 + i) * 0.05;','npc.body.material.emissiveIntensity = ambientMotion ? 0.1 + Math.sin(t * 2 + i) * 0.05 : 0.15;'],
  ['if (Math.random() < 0.003) {','if (ambientMotion && Math.random() < 0.003) {'],
  ['              var THREE = window.THREE;\n              if (THREE) {','              if (THREE) {'],
  ['npc._ring.material.opacity += (targetOp - npc._ring.material.opacity) * Math.min(1, dt * 5);','npc._ring.material.opacity += (targetOp - npc._ring.material.opacity) * (ambientMotion ? Math.min(1, dt * 5) : 1);'],
  ['npc._ring.scale.setScalar(1.0 + Math.sin(t * 3 + i) * 0.08);','npc._ring.scale.setScalar(1.0 + (ambientMotion ? Math.sin(t * 3 + i) * 0.08 : 0));'],
  ['npc._speechBubble.material.opacity += (sbTarget - npc._speechBubble.material.opacity) * Math.min(1, dt * 5);','npc._speechBubble.material.opacity += (sbTarget - npc._speechBubble.material.opacity) * (ambientMotion ? Math.min(1, dt * 5) : 1);'],
  ['npc._speechBubble.position.y = npc.data.position[1] + 3.0 + Math.sin(t * 1.5 + i * 0.8) * 0.04;','npc._speechBubble.position.y = npc.data.position[1] + 3.0 + (ambientMotion ? Math.sin(t * 1.5 + i * 0.8) * 0.04 : 0);'],
  ['npc.prompt.material.opacity += (promptTarget - npc.prompt.material.opacity) * Math.min(1, dt * 6);','npc.prompt.material.opacity += (promptTarget - npc.prompt.material.opacity) * (ambientMotion ? Math.min(1, dt * 6) : 1);'],
  ['npc.prompt.position.y = npc.data.position[1] + 2.5 + Math.sin(t * 2.5 + i * 0.7) * 0.06;','npc.prompt.position.y = npc.data.position[1] + 2.5 + (ambientMotion ? Math.sin(t * 2.5 + i * 0.7) * 0.06 : 0);']
];
for(const [before,after]of replacements)npc=patch(npc,before,after);
source=source.slice(0,start)+npc+source.slice(end);
source=patch(source,'            if (dm._age >= dm._life) {','            if (engine._ambientMotionEnabled === false || dm._age >= dm._life) {');
new Function(source);
if(process.argv.includes('--apply')){
  source=source.replace(/\n/g,eol);
  for(const file of [core,mirror]){const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
  console.log(JSON.stringify({applied:true,parsed:true,mirrorByteIdentical:fs.readFileSync(core).equals(fs.readFileSync(mirror))}));
}else console.log(JSON.stringify({prepared:true,parsed:true,appFilesChanged:false}));
