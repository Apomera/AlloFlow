const fs=require('node:fs');
const path='stem_lab/stem_tool_geometryworld_builder.js';
let source=fs.readFileSync(path,'utf8');
const newline=source.includes('\r\n')?'\r\n':'\n';
const before="          var workspace = document.getElementById('geoworld-fs-workspace');"+newline+"          var selector = choice === 'material'";
const after="          var workspace = document.getElementById('geoworld-fs-workspace');"+newline+"          if (workspace && workspace.querySelector('[role=\"dialog\"][aria-modal=\"true\"]')) return;"+newline+"          var selector = choice === 'material'";
if(source.split(before).length!==2)throw new Error('Expected one dock focus guard anchor');
source=source.replace(before,after);
const rotationBefore="'aria-label':'Change shape. Current shape: '+shape.name,onClick:";
const rotationAfter="'aria-label':'Change shape. Current shape: '+shape.name+'. Rotation: '+((Number(data.blockRotation)||0)*90)+' degrees',onClick:";
if(source.split(rotationBefore).length!==2)throw new Error('Expected one shape rotation label anchor');
source=source.replace(rotationBefore,rotationAfter);new Function(source);
if(process.argv.includes('--check'))console.log('Dock modal guard anchors and syntax verified.');
else {const fd=fs.openSync(path,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}console.log('Applied dock modal focus guard.');}
