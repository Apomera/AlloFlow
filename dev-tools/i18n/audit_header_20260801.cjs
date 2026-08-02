'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..','..');
const source=JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8'));
const keys=Object.keys(source.header||{});
const langDir=path.join(ROOT,'lang');
const deployDir=path.join(ROOT,'desktop','web-app','public','lang');
const packs=fs.readdirSync(langDir).filter(f=>f.endsWith('.js')&&!f.includes('.bak.')).map(f=>f.slice(0,-3)).sort();
let missing=0,drift=0;
const byKey={};
for(const slug of packs){
  const canonical=JSON.parse(fs.readFileSync(path.join(langDir,slug+'.js'),'utf8'));
  const deployed=JSON.parse(fs.readFileSync(path.join(deployDir,slug+'.js'),'utf8'));
  for(const key of keys){if(typeof canonical.header?.[key]!=='string'||canonical.header[key].length===0){missing++;byKey[key]=(byKey[key]||0)+1;}}
  if(JSON.stringify(canonical.header||{})!==JSON.stringify(deployed.header||{})) drift++;
}
console.log(JSON.stringify({sourceKeys:keys.length,packs:packs.length,missingSlots:missing,mirrorDrift:drift,missingByKey:byKey},null,2));
if(missing||drift) process.exit(1);
