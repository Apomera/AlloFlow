const fs=require('node:fs'),vm=require('node:vm');
const file='stem_lab/stem_tool_geometryworld.js',original=fs.readFileSync(file,'utf8'),newline=original.includes('\r\n')?'\r\n':'\n';
let source=original.replace(/\r\n/g,'\n');
const startMarker='        // Crosshair — interactive (changes color based on target)\n';
const endMarker='        // ── Lesson Intro Screen ──\n';
const destination='              // Keyboard contract, announced on focus. Previously the only hint was\n';
for(const marker of [startMarker,endMarker,destination])if(source.split(marker).length!==2)throw Error('Expected exactly one anchor: '+marker);
const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);
if(end<start)throw Error('Crosshair section is not followed by intro');
const crosshair=source.slice(start,end);
if(crosshair.split("className: 'gw-crosshair'").length!==2 || !crosshair.trimEnd().endsWith('})(),'))throw Error('Unexpected crosshair section');
source=source.slice(0,start)+source.slice(end);
const moved=crosshair.split('\n').map(line=>line?'      '+line:line).join('\n');
source=source.replace(destination,'              // Center the visible aim mark in the renderer viewport so it agrees\n              // with camera rays at NDC (0, 0), regardless of toolbar height.\n'+moved+destination);
new vm.Script(source,{filename:file});
if(process.argv.includes('--apply')){const output=Buffer.from(source.replace(/\n/g,newline)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,output,0,output.length,0);fs.ftruncateSync(fd,output.length);}finally{fs.closeSync(fd);}}
console.log((process.argv.includes('--apply')?'Moved':'Validated')+' existing crosshair into renderer viewport, without new observers or event handlers.');
