'use strict';
const fs=require('node:fs'),path=require('node:path');
if(!process.argv.includes('--apply'))throw Error('Pass --apply to update the canonical source and focused lifecycle test.');
function update(target,transform){const input=fs.readFileSync(target,'utf8'),newline=input.includes('\r\n')?'\r\n':'\n';const next=transform(input.replace(/\r\n/g,'\n')).replace(/\n/g,newline);const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,next,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(next));}finally{fs.closeSync(fd);}}
update(path.resolve(__dirname,'../../stem_lab/stem_tool_geometryworld.js'),source=>{
 const start=source.indexOf('      var aiGenerationRef = React.useRef('),end=source.indexOf('      function cancelWorldGeneration()',start);
 if(start<0||end<0||source.includes('// ── End generation lifecycle hooks'))throw Error('Expected late generation lifecycle hooks.');
 const hooks=source.slice(start,end)+'      // ── End generation lifecycle hooks ──\n';
 source=source.slice(0,start)+source.slice(end);
 const anchor='      var aiDepthProfile = geometryLessonDepth(aiLessonDepth);';
 if(!source.includes(anchor))throw Error('Missing unconditional generation state anchor.');
 return source.replace(anchor,anchor+'\n'+hooks);
});
update(path.resolve(__dirname,'../../tests/geometry_world_generation_depth.test.js'),source=>{
 const from="region('      var aiGenerationRef = ', '      // ── Validate & sanitize AI-generated lesson JSON')";
 const to="region('      var aiGenerationRef = ', '      // ── End generation lifecycle hooks') + region('      function cancelWorldGeneration()', '      // ── Validate & sanitize AI-generated lesson JSON')";
 if(!source.includes(from))throw Error('Missing isolated lifecycle test anchor.');
 return source.replace(from,to);
});
console.log('Generation lifecycle hooks now run before every loading/recovery early return.');
