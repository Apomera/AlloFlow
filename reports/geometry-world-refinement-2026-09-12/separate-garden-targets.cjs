'use strict';
const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'prepare-preset-corrections.cjs');let source=fs.readFileSync(target,'utf8');
source=source.replace("garden.structures[0].x2=45;garden.structures[0].id='garden-main-path';", "garden.structures[0].x2=45;garden.structures[0].id='garden-main-path';\n// Keep measured targets face-disconnected from neighbours and decorative beds.\nfor(const s of garden.structures){\n  if(s.x1===32 && ((s.x2===36 && s.z1===-6)||(s.x2===34 && s.z1===-3))){s.z1--;s.z2--;}\n  if(s.block==='sand'&&s.x1===30&&s.z1===7){s.x1=28;s.x2=29;s.z1=10;s.z2=11;}\n}");
source=source.replace("'Station 1 Guide',[4,2.6,3]","'Station 1 Guide',[5,2.6,4]");
source=source.replace("'Station 3 Guide',[18,2.6,4]","'Station 3 Guide',[18,2.6,5]");
source=source.replace("'Station 4 Guide',[26,2.6,4]","'Station 4 Guide',[26,2.6,5]");
source=source.replace("'Convergence Guide',[36,2.6,5]","'Convergence Guide',[37,2.6,5]");
const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);
