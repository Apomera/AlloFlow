const fs=require('fs'),vm=require('vm'),crypto=require('crypto');
const canonical='stem_lab/stem_tool_geometryworld_builder.js';
const mirror='desktop/web-app/public/stem_lab/stem_tool_geometryworld_builder.js';
const report='reports/geometry-world-studio-softlight-2026-09-09/adaptive-radius-source-hashes.json';
let source=fs.readFileSync(canonical,'utf8');
const mirrorSource=fs.readFileSync(mirror,'utf8');
if(mirrorSource!==source)throw new Error('Builder mirror differs before patch');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const result={before:{canonical:hash(source),mirror:hash(mirrorSource)}};
fs.writeFileSync(report,JSON.stringify(result,null,2));
const eol=source.includes('\r\n')?'\r\n':'\n';
function replaceOnce(before,after){if(source.split(before).length!==2)throw new Error('Expected one insertion point: '+before);source=source.replace(before,after);}
replaceOnce('  function configureStudioFloorShadow(material, shadowCamera) {',
  '  function configureStudioFloorShadow(material, shadowCamera, worldRadius) {'+eol+
  '    var shadowRadius=worldRadius===undefined?0.14:worldRadius;'+eol+
  "    if(typeof shadowRadius!=='number' || !isFinite(shadowRadius) || shadowRadius<=0)return false;");
replaceOnce('new THREE.Vector2(0.14/width,0.14/height)','new THREE.Vector2(shadowRadius/width,shadowRadius/height)');
replaceOnce("'gwe-studio-floor-vogel16-r014-v1'","'gwe-studio-floor-vogel16-v1'");
replaceOnce('      configureStudioFloorShadow(floorMaterial,key.shadow.camera);',
  '      configureStudioFloorShadow(floorMaterial,key.shadow.camera,Math.min(0.14,radius*0.03));');
new vm.Script(source,{filename:canonical});
for(const file of [canonical,mirror]){const handle=fs.openSync(file,'r+');try{const bytes=Buffer.from(source);fs.writeSync(handle,bytes,0,bytes.length,0);fs.ftruncateSync(handle,bytes.length);}finally{fs.closeSync(handle);}}
const actual=fs.readFileSync(canonical,'utf8'),actualMirror=fs.readFileSync(mirror,'utf8');
if(actual!==actualMirror)throw new Error('Builder mirror differs after patch');
result.after={canonical:hash(actual),mirror:hash(actualMirror)};
result.syntax=true;result.parity=true;result.lineEnding=eol==='\r\n'?'CRLF':'LF';
fs.writeFileSync(report,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
