'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),target=path.join(root,'stem_lab/stem_tool_geometryworld.js'),old=fs.readFileSync(target,'utf8'),eol=old.includes('\r\n')?'\r\n':'\n';
let source=old.replace(/\r\n/g,'\n');
for(const [id,next,file] of [['realWorld','geometryGarden','real-world-corrected.json'],['geometryGarden','compositeVolume','geometry-garden-corrected.json']]){
  const lesson=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8')),a=source.indexOf('    '+id+': {'),b=source.indexOf('    '+next+': {',a);assert(a>=0&&b>a);
  const formatted=JSON.stringify(lesson,null,2).split('\n').map((s,i)=>i?'    '+s:s).join('\n');
  source=source.slice(0,a)+'    '+id+': '+formatted+',\n'+source.slice(b);
}
source=source.replace(/\n/g,eol);new vm.Script(source,{filename:target});
if(process.argv.includes('--apply')){const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);}
console.log(JSON.stringify({applied:process.argv.includes('--apply'),syntaxValid:true,changed:source!==old,addedBytes:Buffer.byteLength(source)-Buffer.byteLength(old)}));
